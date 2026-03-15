import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
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
        if (status !== 'granted' && nextPrefs.device_push_enabled) {
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
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const permissionLabel = useMemo(() => {
    if (permissionStatus === 'granted') return 'Permissão no dispositivo: permitida';
    if (permissionStatus === 'denied') return 'Permissão no dispositivo: negada';
    if (permissionStatus === 'undetermined') return 'Permissão no dispositivo: não definida';
    return 'Permissão no dispositivo: indisponível neste ambiente';
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

  const update = async (key: keyof AppPreferences, value: boolean) => {
    try {
      const next = { ...prefs, [key]: value };

      if (key === 'notifications_enabled' && !value) {
        next.device_push_enabled = false;
        next.notify_due_today = false;
        next.notify_due_tomorrow = false;
        next.notify_weekly_summary = false;
        next.notify_xp_and_badges = false;
        await persist(next, 'success', 'Notificações desativadas.');
        return;
      }

      if (key === 'device_push_enabled') {
        if (!value) {
          next.device_push_enabled = false;
          await persist(next, 'success', 'Notificação no celular desativada.');
          return;
        }

        const granted = await requestDeviceNotificationPermission();
        const refreshedStatus = await getDeviceNotificationPermissionStatus();
        setPermissionStatus(refreshedStatus);

        if (!granted) {
          next.device_push_enabled = false;
          await persist(
            next,
            'error',
            refreshedStatus === 'unavailable'
              ? 'Notificação no celular indisponível neste ambiente.'
              : 'Permissão negada no dispositivo. As notificações continuarão somente dentro do aplicativo.'
          );
          return;
        }

        next.notifications_enabled = true;
        next.device_push_enabled = true;
        await persist(next, 'success', 'Notificação no celular ativada.');
        return;
      }

      if (key !== 'notifications_enabled' && value) {
        next.notifications_enabled = true;
      }

      await persist(next, 'success', 'Preferências de notificação salvas.');
    } catch {
      setMessageKind('error');
      setMessage('Não foi possível salvar a preferência agora. Tente novamente.');
    }
  };

  const sendTest = async () => {
    const result = await sendLocalTestNotification();
    if (result.sent) {
      setMessageKind('success');
      setMessage('Notificação de teste enviada para o celular.');
      return;
    }

    if (result.reason === 'permission_denied') {
      setMessageKind('error');
      setMessage('Não foi possível enviar teste: permita notificações no dispositivo.');
      return;
    }

    setMessageKind('error');
    setMessage('Notificação local indisponível neste ambiente de execução.');
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
          <Text className="text-slate-900 dark:text-slate-100 font-semibold">{title}</Text>
          <Text className="text-slate-500 dark:text-slate-300 text-xs mt-0.5">{subtitle}</Text>
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
            <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold">Notificações</Text>
            <Text className="text-slate-500 dark:text-slate-300 text-xs">
              Somente no aplicativo. No celular apenas com sua permissão.
            </Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Bell size={16} color="#64748b" />
            <Text className="text-slate-700 dark:text-slate-200 font-bold ml-2">Canal de notificação</Text>
          </View>

          <View className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] p-3">
            <Text className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Canal único: aplicativo</Text>
            <Text className="text-slate-500 dark:text-slate-300 text-xs mt-1">
              Este app não envia e-mail nem SMS. O alerta aparece no app e, opcionalmente, no celular.
            </Text>
            <Text className="text-slate-500 dark:text-slate-300 text-xs mt-2">{permissionLabel}</Text>
          </View>

          <Item
            title="Ativar notificações"
            subtitle="Liga ou desliga todas as notificações do aplicativo."
            value={prefs.notifications_enabled}
            onChange={(value) => update('notifications_enabled', value)}
          />
          <Item
            title="Notificar no celular"
            subtitle="Mostra alerta local no dispositivo, somente se você permitir."
            value={prefs.device_push_enabled}
            onChange={(value) => update('device_push_enabled', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="Vencimentos de hoje"
            subtitle="Aviso no dia de vencimento de dívidas e lançamentos."
            value={prefs.notify_due_today}
            onChange={(value) => update('notify_due_today', value)}
            disabled={!prefs.notifications_enabled}
          />
          <Item
            title="Lembrete do dia seguinte"
            subtitle="Aviso antecipado para você se preparar."
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
            subtitle="Alertas de conquistas, nível e pontuação."
            value={prefs.notify_xp_and_badges}
            onChange={(value) => update('notify_xp_and_badges', value)}
            disabled={!prefs.notifications_enabled}
          />

          <TouchableOpacity
            className="mt-3 h-11 rounded-xl border border-primary/30 bg-primary/10 items-center justify-center"
            onPress={sendTest}
            disabled={!prefs.notifications_enabled || !prefs.device_push_enabled}
          >
            <Text className="text-primary font-bold">
              Enviar notificação de teste
            </Text>
          </TouchableOpacity>
        </Card>

        {loading ? (
          <Text className="text-slate-500 dark:text-slate-300 text-xs mt-2">Carregando preferências...</Text>
        ) : null}

        {message ? (
          <View
            className={`mt-3 rounded-xl px-3 py-2 border ${
              messageKind === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <Text
              className={`text-sm ${
                messageKind === 'error' ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {message}
            </Text>
          </View>
        ) : null}
      </View>
    </Layout>
  );
};

export default NotificationSettings;
