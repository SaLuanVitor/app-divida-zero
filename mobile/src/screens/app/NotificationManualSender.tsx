import React, { useMemo, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, BellRing, CalendarCheck2, CalendarClock, Sparkles, Trophy } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Layout from '../../components/Layout';
import useBackToProfile from '../../hooks/useBackToProfile';
import {
  buildManualNotificationScenarioFromAccount,
  getDeviceNotificationPermissionStatus,
  getDeviceNotificationRuntimeStatus,
  ManualNotificationKind,
  ManualNotificationScenarioResultStep,
  ManualNotificationScenarioStep,
  NotificationRuntimeReason,
  requestDeviceNotificationPermission,
  runManualNotificationScenario,
  sendManualNotification,
} from '../../services/notifications';
import { useThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAppPreferences } from '../../services/preferences';

type MessageKind = 'success' | 'error' | '';

const FALLBACK_MANUAL_PAYLOADS: Partial<Record<ManualNotificationKind, { title: string; body: string }>> = {
  test: { title: 'Dívida Zero', body: 'Atualização da conta enviada com sucesso.' },
  due_today: { title: 'Vencimentos de hoje', body: 'Você tem pendências para hoje.' },
  due_tomorrow: { title: 'Lembrete para amanhã', body: 'Você tem pendências para amanhã.' },
  weekly_summary: { title: 'Resumo semanal', body: 'Seu resumo semanal está disponível.' },
  xp_badge: { title: 'Nova conquista desbloqueada', body: 'Você ganhou +20 XP. Continue evoluindo.' },
  generic: { title: '', body: '' },
};

const NotificationManualSender = () => {
  const { darkMode } = useThemeMode();
  const { user } = useAuth();
  const goBackToProfile = useBackToProfile();

  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'unavailable'>('undetermined');
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [runtimeAvailable, setRuntimeAvailable] = useState(true);
  const [runtimeReason, setRuntimeReason] = useState<NotificationRuntimeReason>('available');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [sendingKind, setSendingKind] = useState<ManualNotificationKind | null>(null);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<MessageKind>('');
  const [scenarioLoading, setScenarioLoading] = useState(true);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [scenarioSteps, setScenarioSteps] = useState<ManualNotificationScenarioStep[]>([]);
  const [scenarioResults, setScenarioResults] = useState<ManualNotificationScenarioResultStep[]>([]);
  const [appNotificationsEnabled, setAppNotificationsEnabled] = useState(true);
  const [devicePushEnabled, setDevicePushEnabled] = useState(false);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setCheckingPermission(true);
      setScenarioLoading(true);
      try {
        const [status, runtimeOk, builtScenario, prefs] = await Promise.all([
          getDeviceNotificationPermissionStatus(),
          getDeviceNotificationRuntimeStatus(),
          buildManualNotificationScenarioFromAccount({ userName: user?.name }),
          getAppPreferences(),
        ]);
        if (!active) return;
        setPermissionStatus(status);
        setRuntimeAvailable(runtimeOk.available);
        setRuntimeReason(runtimeOk.reason);
        setScenarioSteps(builtScenario);
        setAppNotificationsEnabled(Boolean(prefs.notifications_enabled));
        setDevicePushEnabled(Boolean(prefs.device_push_enabled));
      } finally {
        if (!active) return;
        setCheckingPermission(false);
        setScenarioLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [user?.name]);

  const permissionLabel = useMemo(() => {
    if (!runtimeAvailable) {
      if (runtimeReason === 'native_module_mismatch') return 'Permissão no dispositivo: Dev Client desatualizado (rebuild necessário)';
      if (runtimeReason === 'expo_go_limited') return 'Permissão no dispositivo: use Dev Build para validar notificações';
      if (runtimeReason === 'permission_denied') return 'Permissão no dispositivo: negada';
      return 'Permissão no dispositivo: indisponível neste ambiente';
    }
    if (permissionStatus === 'granted') return 'Permissão no dispositivo: permitida';
    if (permissionStatus === 'denied') return 'Permissão no dispositivo: negada';
    if (permissionStatus === 'undetermined') return 'Permissão no dispositivo: não definida';
    return 'Permissão no dispositivo: indisponível neste ambiente';
  }, [permissionStatus, runtimeAvailable, runtimeReason]);

  const scenarioByKind = useMemo(() => {
    const map = new Map<ManualNotificationKind, ManualNotificationScenarioStep>();
    scenarioSteps.forEach((step) => map.set(step.kind, step));
    return map;
  }, [scenarioSteps]);

  const notifyActions: Array<{
    kind: ManualNotificationKind;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    payload: { title: string; body: string };
  }> = [
    {
      kind: 'test',
      title: 'Abertura da conta',
      subtitle: 'Abre os alertas com dados atuais da sua conta.',
      icon: Sparkles,
      payload: scenarioByKind.get('test') ?? FALLBACK_MANUAL_PAYLOADS.test!,
    },
    {
      kind: 'due_today',
      title: 'Vencimento de hoje',
      subtitle: 'Alerta diário com pendências atuais.',
      icon: CalendarCheck2,
      payload: scenarioByKind.get('due_today') ?? FALLBACK_MANUAL_PAYLOADS.due_today!,
    },
    {
      kind: 'due_tomorrow',
      title: 'Lembrete amanhã',
      subtitle: 'Aviso antecipado com dados atuais.',
      icon: CalendarClock,
      payload: scenarioByKind.get('due_tomorrow') ?? FALLBACK_MANUAL_PAYLOADS.due_tomorrow!,
    },
    {
      kind: 'weekly_summary',
      title: 'Resumo semanal',
      subtitle: 'Usa totais atuais pendentes da sua conta.',
      icon: BellRing,
      payload: scenarioByKind.get('weekly_summary') ?? FALLBACK_MANUAL_PAYLOADS.weekly_summary!,
    },
    {
      kind: 'xp_badge',
      title: 'XP e badge',
      subtitle: 'Avanço de jornada com contexto da conta.',
      icon: Trophy,
      payload: scenarioByKind.get('xp_badge') ?? FALLBACK_MANUAL_PAYLOADS.xp_badge!,
    },
    {
      kind: 'generic',
      title: 'Alerta genérico',
      subtitle: 'Valida fallback robusto.',
      icon: Sparkles,
      payload: FALLBACK_MANUAL_PAYLOADS.generic!,
    },
  ];

  const runtimeBlockedMessage = () => {
    if (runtimeReason === 'native_module_mismatch') {
      return 'Dev Client desatualizado para notificações. Recompile: expo run:android e abra com expo start --dev-client.';
    }
    if (runtimeReason === 'expo_go_limited') {
      return 'No Expo Go, use Dev Build para validar notificações no dispositivo.';
    }
    return 'Notificação local indisponível neste ambiente de execução.';
  };

  const refreshScenario = async () => {
    setScenarioLoading(true);
    try {
      const [steps, prefs] = await Promise.all([
        buildManualNotificationScenarioFromAccount({ userName: user?.name }),
        getAppPreferences(),
      ]);
      setScenarioSteps(steps);
      setScenarioResults([]);
      setAppNotificationsEnabled(Boolean(prefs.notifications_enabled));
      setDevicePushEnabled(Boolean(prefs.device_push_enabled));
      setMessageKind('success');
      setMessage('Alertas atualizados com os dados da conta.');
    } catch {
      setMessageKind('error');
      setMessage('Não foi possível atualizar os alertas da conta agora.');
    } finally {
      setScenarioLoading(false);
    }
  };

  const requestPermission = async () => {
    if (!runtimeAvailable) {
      setMessageKind('error');
      setMessage(runtimeBlockedMessage());
      return;
    }
    setRequestingPermission(true);
    try {
      const granted = await requestDeviceNotificationPermission({
        markPrompted: true,
        enablePushWhenGranted: true,
      });
        const refreshed = await getDeviceNotificationPermissionStatus();
        const runtimeStatus = await getDeviceNotificationRuntimeStatus();
        const prefs = await getAppPreferences();
        setPermissionStatus(refreshed);
        setRuntimeAvailable(runtimeStatus.available);
        setRuntimeReason(runtimeStatus.reason);
        setAppNotificationsEnabled(Boolean(prefs.notifications_enabled));
        setDevicePushEnabled(Boolean(prefs.device_push_enabled));

      if (granted || refreshed === 'granted') {
        setMessageKind('success');
        setMessage('Permissão de notificações concedida no dispositivo.');
        return;
      }

      setMessageKind('error');
      setMessage(
        runtimeStatus.reason === 'native_module_mismatch'
          ? 'Runtime nativo de notificações desatualizado. Rode: expo run:android e depois expo start --dev-client.'
          : refreshed === 'unavailable'
          ? 'Notificações no dispositivo não estão disponíveis neste ambiente.'
          : 'Permissão negada. Ative nas configurações do Android para receber alertas.'
      );
    } finally {
      setRequestingPermission(false);
    }
  };

  const runScenario = async () => {
    const prefs = await getAppPreferences();
    setAppNotificationsEnabled(Boolean(prefs.notifications_enabled));
    setDevicePushEnabled(Boolean(prefs.device_push_enabled));
    if (!prefs.notifications_enabled || !prefs.device_push_enabled) {
      setMessageKind('error');
      setMessage('Notificações desativadas nas configurações. Reative e confirme permissão para enviar.');
      return;
    }

    if (!runtimeAvailable && runtimeReason !== 'permission_denied') {
      setMessageKind('error');
      setMessage(runtimeBlockedMessage());
      return;
    }
    if (scenarioRunning || scenarioLoading) return;

    const steps = scenarioSteps.length ? scenarioSteps : await buildManualNotificationScenarioFromAccount({ userName: user?.name });

    setScenarioRunning(true);
    setScenarioResults([]);
    setMessage('');
    setMessageKind('');

    try {
      const results = await runManualNotificationScenario({ steps });
      setScenarioResults(results);

      const failures = results.filter((entry) => !entry.result.sent);
      if (failures.length === 0) {
        setMessageKind('success');
        setMessage(`Notificações concluídas com sucesso (${results.length} etapa(s) enviadas).`);
      } else {
        setMessageKind('error');
        setMessage(`Notificações concluídas com ${failures.length} falha(s). Verifique os detalhes abaixo.`);
      }
    } catch {
      setMessageKind('error');
      setMessage('Não foi possível executar as notificações agora.');
    } finally {
      setScenarioRunning(false);
    }
  };

  const sendNow = async (kind: ManualNotificationKind, title: string, body: string) => {
    const prefs = await getAppPreferences();
    setAppNotificationsEnabled(Boolean(prefs.notifications_enabled));
    setDevicePushEnabled(Boolean(prefs.device_push_enabled));
    if (!prefs.notifications_enabled || !prefs.device_push_enabled) {
      setMessageKind('error');
      setMessage('Notificações desativadas nas configurações. Reative e confirme permissão para enviar.');
      return;
    }

    if (!runtimeAvailable && runtimeReason !== 'permission_denied') {
      setMessageKind('error');
      setMessage(runtimeBlockedMessage());
      return;
    }
    if (sendingKind || scenarioRunning) return;
    setSendingKind(kind);
    setMessage('');
    setMessageKind('');

    const result = await sendManualNotification({
      kind,
      title,
      body,
      data: { source: 'mobile_alerts', context: 'account_notifications_single' },
    });

    if (result.sent) {
      setMessageKind('success');
      setMessage('Notificação enviada para o dispositivo.');
      setSendingKind(null);
      return;
    }

    setMessageKind('error');
    setMessage(
      result.reason === 'permission_denied'
        ? 'Não foi possível enviar: permita notificações no dispositivo.'
        : result.reason === 'disabled'
        ? 'Envio bloqueado: notificações desativadas nas configurações.'
        : result.reason === 'native_module_mismatch'
        ? 'Runtime nativo de notificações desatualizado. Rode: expo run:android e depois expo start --dev-client.'
        : result.reason === 'expo_go_limited'
        ? 'No Expo Go, use Dev Build para validar envio local de notificações.'
        : 'Notificação local indisponível neste ambiente de execução.'
    );
    setSendingKind(null);
  };

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Envio de notificações</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Alertas locais com dados da sua conta.
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        <Card className="p-4 mb-3">
          <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-1">Status de permissão</AppText>
          {checkingPermission ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#f48c25" />
              <AppText className="text-slate-500 dark:text-slate-200 text-xs ml-2">Verificando permissão...</AppText>
            </View>
          ) : (
            <AppText className="text-slate-600 dark:text-slate-200 text-sm">{permissionLabel}</AppText>
          )}

          <TouchableOpacity
            onPress={requestPermission}
            disabled={requestingPermission}
            className="mt-3 h-11 rounded-xl border border-primary/30 bg-primary/10 items-center justify-center"
          >
            {requestingPermission ? (
              <ActivityIndicator color="#f48c25" />
            ) : (
              <AppText className="text-primary font-bold text-sm">Solicitar permissão no dispositivo</AppText>
            )}
          </TouchableOpacity>

          <View className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] p-3">
            <AppText className="text-slate-600 dark:text-slate-200 text-xs">
              App: {appNotificationsEnabled ? 'ativado' : 'desativado'} • Dispositivo: {devicePushEnabled ? 'ativado' : 'desativado'}
            </AppText>
          </View>
        </Card>

        <Card className="p-4 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <AppText className="text-slate-900 dark:text-slate-100 font-bold">Alertas da conta</AppText>
            <TouchableOpacity
              onPress={() => void refreshScenario()}
              disabled={scenarioLoading || scenarioRunning}
              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center"
            >
              <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold">Atualizar dados</AppText>
            </TouchableOpacity>
          </View>

          {scenarioLoading ? (
            <View className="flex-row items-center mb-3">
              <ActivityIndicator color="#f48c25" />
              <AppText className="text-slate-500 dark:text-slate-200 text-xs ml-2">Carregando alertas da conta...</AppText>
            </View>
          ) : (
            <View className="mb-3">
              {scenarioSteps.map((step, index) => (
                <View key={step.id} className="py-2 border-b border-slate-100 dark:border-slate-800">
                  <AppText className="text-slate-900 dark:text-slate-100 text-xs font-semibold">
                    {index + 1}. {step.title}
                  </AppText>
                  <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5">{step.body}</AppText>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={() => void runScenario()}
            disabled={scenarioRunning || scenarioLoading || (!runtimeAvailable && runtimeReason !== 'permission_denied')}
            className="h-11 rounded-xl border border-primary/30 bg-primary/10 items-center justify-center"
          >
            {scenarioRunning ? (
              <ActivityIndicator color="#f48c25" />
            ) : (
              <AppText className="text-primary font-bold text-sm">Executar notificações</AppText>
            )}
          </TouchableOpacity>
        </Card>

        {scenarioResults.length > 0 ? (
          <Card className="p-4 mb-3">
            <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-2">Resultado dos alertas</AppText>
            {scenarioResults.map((entry, index) => (
              <View key={`${entry.step.id}-${index}`} className="py-2 border-b border-slate-100 dark:border-slate-800">
                <AppText className="text-slate-800 dark:text-slate-100 text-xs font-semibold">
                  {index + 1}. {entry.step.title}
                </AppText>
                <AppText
                  className={`text-xs mt-0.5 ${
                    entry.result.sent ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {entry.result.sent ? 'Enviada com sucesso' : `Falha: ${entry.result.reason}`}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}

        <Card className="p-4">
          <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">Ações individuais</AppText>

          {notifyActions.map((action) => {
            const Icon = action.icon;
            const isSending = sendingKind === action.kind;

            return (
              <View key={action.kind} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] p-3 mb-2">
                <View className="flex-row items-start">
                  <View className="w-9 h-9 rounded-lg items-center justify-center bg-primary/10 mr-3">
                    <Icon size={18} color="#f48c25" />
                  </View>
                  <View className="flex-1">
                    <AppText className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{action.title}</AppText>
                    <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5">{action.subtitle}</AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => void sendNow(action.kind, action.payload.title, action.payload.body)}
                    disabled={Boolean(sendingKind) || scenarioRunning}
                    className="ml-2 h-9 px-3 rounded-lg border border-primary/30 bg-primary/10 items-center justify-center"
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color="#f48c25" />
                    ) : (
                      <AppText className="text-primary text-xs font-bold">Enviar</AppText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </Card>

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

export default NotificationManualSender;


