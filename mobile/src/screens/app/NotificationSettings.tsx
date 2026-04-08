import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Bell } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { AppPreferences } from '../../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences } from '../../services/preferences';
import {
  getDeviceNotificationRuntimeStatus,
  getDeviceNotificationPermissionStatus,
  NotificationRuntimeReason,
  requestDeviceNotificationPermission,
  sendLocalTestNotification,
  syncScheduledLocalNotifications,
} from '../../services/notifications';
import { useThemeMode } from '../../context/ThemeContext';
import { listFinancialRecords } from '../../services/financialRecords';
import { useAccessibility } from '../../context/AccessibilityContext';
import useBackToProfile from '../../hooks/useBackToProfile';

type SaveMessageKind = 'success' | 'error' | '';
type NotificationPreferenceKey =
  | 'notifications_enabled'
  | 'device_push_enabled'
  | 'notify_due_today'
  | 'notify_due_tomorrow'
  | 'notify_weekly_summary'
  | 'notify_xp_and_badges';

const NotificationSettings = () => {
  const { darkMode } = useThemeMode();
  const { fontScale, largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();

  const [prefs, setPrefs] = useState<AppPreferences>(defaultAppPreferences);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<SaveMessageKind>('');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'unavailable'>(
    'undetermined'
  );
  const [loading, setLoading] = useState(false);
  const [runtimeAvailable, setRuntimeAvailable] = useState(true);
  const [runtimeReason, setRuntimeReason] = useState<NotificationRuntimeReason>('available');
  const rowHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);

  const iconColor = darkMode ? '#e2e8f0' : '#0f172a';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storedPrefs, status, runtimeOk] = await Promise.all([
          getAppPreferences(),
          getDeviceNotificationPermissionStatus(),
          getDeviceNotificationRuntimeStatus(),
        ]);

        const nextPrefs = { ...storedPrefs };
        if ((status === 'denied' || status === 'unavailable') && nextPrefs.device_push_enabled) {
          nextPrefs.device_push_enabled = false;
          await saveAppPreferences(nextPrefs);
        }

        setPrefs(nextPrefs);
        setPermissionStatus(status);
        setRuntimeAvailable(runtimeOk.available);
        setRuntimeReason(runtimeOk.reason);
        const allRecords = await listFinancialRecords(undefined, undefined, { force: true });
        await syncScheduledLocalNotifications({
          prefs: nextPrefs,
          records: allRecords.records,
        });
      } catch {
        setMessageKind('error');
        setMessage('Não foi possível carregar as configurações de notificação agora.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const permissionLabel = useMemo(() => {
    if (!runtimeAvailable) {
      if (runtimeReason === 'native_module_mismatch') return 'Permissão no dispositivo: Dev Client desatualizado (rebuild necessário)';
      if (runtimeReason === 'expo_go_limited') return 'Permissão no dispositivo: use Dev Build para testar notificação local';
      if (runtimeReason === 'permission_denied') return 'Permissão no dispositivo: negada';
      return 'Permissão no dispositivo: indisponível neste ambiente';
    }
    if (permissionStatus === 'granted') return 'Permissão no dispositivo: permitida';
    if (permissionStatus === 'denied') return 'Permissão no dispositivo: negada';
    if (permissionStatus === 'undetermined') return 'Permissão no dispositivo: não definida';
    return 'Permissão no dispositivo: indisponível neste ambiente';
  }, [permissionStatus, runtimeAvailable, runtimeReason]);

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
        await persist(next, 'success', 'Notificações desativadas.');
        return;
      }

      if (key === 'device_push_enabled') {
        if (!value) {
          next.device_push_enabled = false;
          await persist(next, 'success', 'Notificação no celular desativada.');
          return;
        }

        const granted = await requestDeviceNotificationPermission({
          markPrompted: true,
          enablePushWhenGranted: true,
        });
        const refreshedStatus = await getDeviceNotificationPermissionStatus();
        const runtimeStatus = await getDeviceNotificationRuntimeStatus();
        const effectiveStatus = granted ? 'granted' : refreshedStatus;
        setPermissionStatus(effectiveStatus);
        setRuntimeAvailable(runtimeStatus.available);
        setRuntimeReason(runtimeStatus.reason);

        if (!granted && effectiveStatus !== 'granted') {
          next.device_push_enabled = false;
          await persist(
            next,
            'error',
            runtimeStatus.reason === 'native_module_mismatch'
              ? 'Runtime nativo de notificações desatualizado. Rode: expo run:android e depois expo start --dev-client.'
              : effectiveStatus === 'unavailable'
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
    if (!runtimeAvailable && runtimeReason !== 'permission_denied') {
      setMessageKind('error');
      setMessage(
        runtimeReason === 'native_module_mismatch'
          ? 'Dev Client desatualizado para notificações. Recompile: expo run:android e abra com expo start --dev-client.'
          : runtimeReason === 'expo_go_limited'
          ? 'No Expo Go, use Dev Build para testar notificação local no dispositivo.'
          : 'Notificação local indisponível neste ambiente de execução.'
      );
      return;
    }
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

    if (result.reason === 'native_module_mismatch') {
      setMessageKind('error');
      setMessage('Runtime nativo de notificações desatualizado. Rode: expo run:android e depois expo start --dev-client.');
      return;
    }

    if (result.reason === 'expo_go_limited') {
      setMessageKind('error');
      setMessage('No Expo Go, use Dev Build para testar notificação local no dispositivo.');
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
    <View
      className={`py-3 border-b border-slate-100 dark:border-slate-800 ${disabled ? 'opacity-50' : ''}`}
      style={{ minHeight: rowHeight + 10, justifyContent: 'center' }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <AppText className="text-slate-900 dark:text-slate-100 font-semibold">{title}</AppText>
          <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5">{subtitle}</AppText>
        </View>
        <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: '#f48c25' }} />
      </View>
    </View>
  );

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0 pb-28">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Notificações</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Somente no aplicativo. No celular apenas com sua permissão.
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <Bell size={16} color="#64748b" />
            <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">Canal de notificação</AppText>
          </View>

          <View className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] p-3">
            <AppText className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Canal único: aplicativo</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-1">
              Este app não envia e-mail nem SMS. O alerta aparece no app e, opcionalmente, no celular.
            </AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">{permissionLabel}</AppText>
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
            subtitle="XP e medalhas aparecem só dentro do app (sem push no celular)."
            value={false}
            onChange={() => {}}
            disabled
          />

          <TouchableOpacity
            className="mt-3 rounded-xl border border-primary/30 bg-primary/10 items-center justify-center"
            style={{ minHeight: rowHeight, height: rowHeight }}
            onPress={sendTest}
            disabled={(!runtimeAvailable && runtimeReason !== 'permission_denied') || !prefs.notifications_enabled}
          >
            <AppText className="text-primary font-bold">Enviar notificação de teste</AppText>
          </TouchableOpacity>
        </Card>

        {loading ? <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">Carregando preferências...</AppText> : null}

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


