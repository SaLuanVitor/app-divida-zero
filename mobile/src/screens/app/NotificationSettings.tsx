import React, { useEffect, useMemo, useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences } from '../../services/preferences';
import {
  getDeviceNotificationPermissionStatus,
  requestDeviceNotificationPermission,
  sendLocalTestNotification,
  syncScheduledLocalNotifications,
} from '../../services/notifications';
import { useThemeMode } from '../../context/ThemeContext';
import { listFinancialRecords } from '../../services/financialRecords';

type SaveMessageKind = 'success' | 'error' | '';
type NotificationPreferenceKey =
  | 'notifications_enabled'
  | 'device_push_enabled'
  | 'notify_due_today'
  | 'notify_due_tomorrow'
  | 'notify_weekly_summary'
  | 'notify_xp_and_badges';

const NotificationSettings = () => {
  const navigation = useNavigation<any>();
  const { darkMode } = useThemeMode();

  const [prefs, setPrefs] = useState<AppPreferences>(defaultAppPreferences);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<SaveMessageKind>('');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'unavailable'>(
    'undetermined'
  );
  const [loading, setLoading] = useState(false);

  const iconColor = darkMode ? '#e2e8f0' : '#0f172a';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storedPrefs, status] = await Promise.all([
          getAppPreferences(),
          getDeviceNotificationPermissionStatus(),
        ]);

        const nextPrefs = { ...storedPrefs };
        if ((status === 'denied' || status === 'unavailable') && nextPrefs.device_push_enabled) {
          nextPrefs.device_push_enabled = false;
          await saveAppPreferences(nextPrefs);
        }

        setPrefs(nextPrefs);
        setPermissionStatus(status);
        const allRecords = await listFinancialRecords(undefined, undefined, { force: true });
        await syncScheduledLocalNotifications({
          prefs: nextPrefs,
          records: allRecords.records,
        });
      } catch {
        setMessageKind('error');
        setMessage('NÃ£o foi possÃ­vel carregar as configuraÃ§Ãµes de notificaÃ§Ã£o agora.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const permissionLabel = useMemo(() => {
    if (permissionStatus === 'granted') return 'PermissÃ£o no dispositivo: permitida';
    if (permissionStatus === 'denied') return 'PermissÃ£o no dispositivo: negada';
    if (permissionStatus === 'undetermined') return 'PermissÃ£o no dispositivo: nÃ£o definida';
    return 'PermissÃ£o no dispositivo: indisponÃ­vel neste ambiente';
  }, [permissionStatus]);

  const persist = async (next: AppPreferences, kind: SaveMessageKind, text: string) => {
    setPrefs(next);
    await saveAppPreferences(next);

    try {
      const allRecords = await listFinancialRecords(undefined, undefined, { force: true });
      await syncScheduledLocalNotifications({
        prefs: next,
        records: allRecords.records,
      });
    } catch {
      // Preference should remain saved even if sync fails temporarily.
    }

    setMessageKind(kind);
    setMessage(text);
  };

  const update = async (key: NotificationPreferenceKey, value: boolean) => {
    try {
      const next = { ...prefs, [key]: value };

      if (key === 'notifications_enabled' && !value) {
        next.device_push_enabled = false;
        next.notify_due_today = false;
        next.notify_due_tomorrow = false;
        next.notify_weekly_summary = false;
        next.notify_xp_and_badges = false;
        await persist(next, 'success', 'NotificaÃ§Ãµes desativadas.');
        return;
      }

      if (key === 'device_push_enabled') {
        if (!value) {
          next.device_push_enabled = false;
          await persist(next, 'success', 'NotificaÃ§Ã£o no celular desativada.');
          return;
        }

        const granted = await requestDeviceNotificationPermission();
        const refreshedStatus = await getDeviceNotificationPermissionStatus();
        const effectiveStatus = granted ? 'granted' : refreshedStatus;
        setPermissionStatus(effectiveStatus);

        if (!granted && effectiveStatus !== 'granted') {
          next.device_push_enabled = false;
          await persist(
            next,
            'error',
            effectiveStatus === 'unavailable'
              ? 'NotificaÃ§Ã£o no celular indisponÃ­vel neste ambiente.'
              : 'PermissÃ£o negada no dispositivo. As notificaÃ§Ãµes continuarÃ£o somente dentro do aplicativo.'
          );
          return;
        }

        next.notifications_enabled = true;
        next.device_push_enabled = true;
        await persist(next, 'success', 'NotificaÃ§Ã£o no celular ativada.');
        return;
      }

      if (key !== 'notifications_enabled' && value) {
        next.notifications_enabled = true;
      }

      await persist(next, 'success', 'PreferÃªncias de notificaÃ§Ã£o salvas.');
    } catch {
      setMessageKind('error');
      setMessage('NÃ£o foi possÃ­vel salvar a preferÃªncia agora. Tente novamente.');
    }
  };

  const sendTest = async () => {
    const result = await sendLocalTestNotification();
    if (result.sent) {
      setMessageKind('success');
      setMessage('NotificaÃ§Ã£o de teste enviada para o celular.');
      return;
    }

    if (result.reason === 'permission_denied') {
      setMessageKind('error');
      setMessage('NÃ£o foi possÃ­vel enviar teste: permita notificaÃ§Ãµes no dispositivo.');
      return;
    }

    setMessageKind('error');
    setMessage('NotificaÃ§Ã£o local indisponÃ­vel neste ambiente de execuÃ§Ã£o.');
  };

  const Item = ({
    title,
    subtitle,
    value,
    onChange,
    disabled,
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View className={`py-3 border-b border-slate-100 dark:border-slate-800 ${disabled ? 'opacity-50' : ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <AppText className="text-slate-900 dark:text-slate-100 font-semibold">{title}</AppText>
          <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-0.5">{subtitle}</AppText>
        </View>
        <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: '#f48c25' }} />
      </View>
    </View>
  );

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <View>
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">NotificaÃ§Ãµes</AppText>
            <AppText className="text-slate-500 dark:text-slate-300 text-xs">
              Somente no aplicativo. No celular apenas com sua permissÃ£o.
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Bell size={16} color="#64748b" />
            <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">Canal de notificaÃ§Ã£o</AppText>
          </View>

          <View className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] p-3">
            <AppText className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Canal Ãºnico: aplicativo</AppText>
            <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">
              Este app nÃ£o envia e-mail nem SMS. O alerta aparece no app e, opcionalmente, no celular.
            </AppText>
            <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">{permissionLabel}</AppText>
          </View>

          <Item
            title="Ativar notificaÃ§Ãµes"
            subtitle="Liga ou desliga todas as notificaÃ§Ãµes do aplicativo."
            value={prefs.notifications_enabled}
            onChange={(value) => update('notifications_enabled', value)}
          />
          <Item
            title="Notificar no celular"
            subtitle="Mostra alerta local no dispositivo, somente se vocÃª permitir."
            value={prefs.device_push_enabled}
            onChange={(value) => update('device_push_enabled', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="Vencimentos de hoje"
            subtitle="Aviso no dia de vencimento de dÃ­vidas e lanÃ§amentos."
            value={prefs.notify_due_today}
            onChange={(value) => update('notify_due_today', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="Lembrete do dia seguinte"
            subtitle="Aviso antecipado para vocÃª se preparar."
            value={prefs.notify_due_tomorrow}
            onChange={(value) => update('notify_due_tomorrow', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="Resumo semanal"
            subtitle="Resumo dos principais movimentos financeiros da semana."
            value={prefs.notify_weekly_summary}
            onChange={(value) => update('notify_weekly_summary', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="XP e badges"
            subtitle="Alertas de conquistas, nÃ­vel e pontuaÃ§Ã£o."
            value={prefs.notify_xp_and_badges}
            onChange={(value) => update('notify_xp_and_badges', value)}
            disabled={!prefs.notifications_enabled}
          />

          <TouchableOpacity
            className="mt-3 h-11 rounded-xl border border-primary/30 bg-primary/10 items-center justify-center"
            onPress={sendTest}
            disabled={!prefs.notifications_enabled || !prefs.device_push_enabled}
          >
            <AppText className="text-primary font-bold">
              Enviar notificaÃ§Ã£o de teste
            </AppText>
          </TouchableOpacity>
        </Card>

        {loading ? (
          <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Carregando preferÃªncias...</AppText>
        ) : null}

        {message ? (
          <View
            className={`mt-3 rounded-xl px-3 py-2 border ${
              messageKind === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <AppText
              className={`text-sm ${
                messageKind === 'error' ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {message}
            </AppText>
          </View>
        ) : null}
      </View>
    </Layout>
  );
};

export default NotificationSettings;

