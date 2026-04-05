import React, { useMemo, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, BellRing, CalendarCheck2, CalendarClock, Sparkles, TestTube2, Trophy } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Layout from '../../components/Layout';
import useBackToProfile from '../../hooks/useBackToProfile';
import {
  getDeviceNotificationRuntimeStatus,
  getDeviceNotificationPermissionStatus,
  ManualNotificationKind,
  NotificationRuntimeReason,
  requestDeviceNotificationPermission,
  sendManualNotification,
} from '../../services/notifications';
import { useThemeMode } from '../../context/ThemeContext';

type MessageKind = 'success' | 'error' | '';

const NotificationManualSender = () => {
  const { darkMode } = useThemeMode();
  const goBackToProfile = useBackToProfile();

  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'unavailable'>('undetermined');
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [runtimeAvailable, setRuntimeAvailable] = useState(true);
  const [runtimeReason, setRuntimeReason] = useState<NotificationRuntimeReason>('available');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [sendingKind, setSendingKind] = useState<ManualNotificationKind | null>(null);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<MessageKind>('');

  React.useEffect(() => {
    let active = true;

    const loadPermission = async () => {
      setCheckingPermission(true);
      try {
        const [status, runtimeOk] = await Promise.all([
          getDeviceNotificationPermissionStatus(),
          getDeviceNotificationRuntimeStatus(),
        ]);
        if (!active) return;
        setPermissionStatus(status);
        setRuntimeAvailable(runtimeOk.available);
        setRuntimeReason(runtimeOk.reason);
      } finally {
        if (active) setCheckingPermission(false);
      }
    };

    void loadPermission();
    return () => {
      active = false;
    };
  }, []);

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

  const notifyActions: Array<{
    kind: ManualNotificationKind;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    payload: { title: string; body: string };
  }> = [
    {
      kind: 'test',
      title: 'Teste genérico',
      subtitle: 'Valida o template base.',
      icon: TestTube2,
      payload: {
        title: 'Dívida Zero',
        body: 'Teste manual enviado com sucesso.',
      },
    },
    {
      kind: 'due_today',
      title: 'Vencimento de hoje',
      subtitle: 'Simula alerta de pendência no dia.',
      icon: CalendarCheck2,
      payload: {
        title: 'Vencimentos de hoje',
        body: 'Você tem 2 lançamentos pendentes para hoje.',
      },
    },
    {
      kind: 'due_tomorrow',
      title: 'Lembrete amanhã',
      subtitle: 'Simula aviso antecipado de vencimento.',
      icon: CalendarClock,
      payload: {
        title: 'Lembrete para amanhã',
        body: 'Você tem 1 lançamento pendente para amanhã.',
      },
    },
    {
      kind: 'weekly_summary',
      title: 'Resumo semanal',
      subtitle: 'Simula resumo semanal de pendências.',
      icon: BellRing,
      payload: {
        title: 'Resumo semanal',
        body: 'Semana iniciando: você tem 3 lançamentos pendentes.',
      },
    },
    {
      kind: 'xp_badge',
      title: 'XP e badge',
      subtitle: 'Simula avanço de progresso.',
      icon: Trophy,
      payload: {
        title: 'Nova conquista desbloqueada',
        body: 'Você ganhou +20 XP. Continue evoluindo.',
      },
    },
    {
      kind: 'generic',
      title: 'Alerta genérico',
      subtitle: 'Valida fallback robusto.',
      icon: Sparkles,
      payload: {
        title: '',
        body: '',
      },
    },
  ];

  const requestPermission = async () => {
    if (!runtimeAvailable) {
      setMessageKind('error');
      setMessage(
        runtimeReason === 'native_module_mismatch'
          ? 'Dev Client desatualizado para notificações. Recompile: expo run:android e abra com expo start --dev-client.'
          : runtimeReason === 'expo_go_limited'
          ? 'No Expo Go, use Dev Build para testar notificações no dispositivo.'
          : 'Notificações no dispositivo não estão disponíveis neste ambiente.'
      );
      return;
    }
    setRequestingPermission(true);
    try {
      const granted = await requestDeviceNotificationPermission();
      const refreshed = await getDeviceNotificationPermissionStatus();
      const runtimeStatus = await getDeviceNotificationRuntimeStatus();
      setPermissionStatus(refreshed);
      setRuntimeAvailable(runtimeStatus.available);
      setRuntimeReason(runtimeStatus.reason);
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
          : 'Permissão negada. Ative nas configurações do Android para testar.'
      );
    } finally {
      setRequestingPermission(false);
    }
  };

  const sendNow = async (kind: ManualNotificationKind, title: string, body: string) => {
    if (!runtimeAvailable) {
      setMessageKind('error');
      setMessage(
        runtimeReason === 'native_module_mismatch'
          ? 'Dev Client desatualizado para notificações. Recompile: expo run:android e abra com expo start --dev-client.'
          : runtimeReason === 'expo_go_limited'
          ? 'No Expo Go, use Dev Build para validar envio local de notificações.'
          : 'Notificação local indisponível neste ambiente de execução.'
      );
      return;
    }
    if (sendingKind) return;
    setSendingKind(kind);
    setMessage('');
    setMessageKind('');

    const result = await sendManualNotification({
      kind,
      title,
      body,
      data: { source: 'manual_test', context: 'profile_sender' },
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
        : result.reason === 'native_module_mismatch'
        ? 'Runtime nativo de notificações desatualizado. Rode: expo run:android e depois expo start --dev-client.'
        : result.reason === 'expo_go_limited'
        ? 'No Expo Go, use Dev Build para validar envio local de notificações.'
        : 'Notificação local indisponível neste ambiente de execução.'
    );
    setSendingKind(null);
  };

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0 pb-28">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Envio de notificações</AppText>
            <AppText className="text-slate-500 dark:text-slate-300 text-xs">
              Teste manual de alertas locais no Android.
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
              <AppText className="text-slate-500 dark:text-slate-300 text-xs ml-2">Verificando permissão...</AppText>
            </View>
          ) : (
            <AppText className="text-slate-600 dark:text-slate-300 text-sm">{permissionLabel}</AppText>
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
        </Card>

        <Card className="p-4">
          <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">Enviar agora</AppText>

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
                    <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-0.5">{action.subtitle}</AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => void sendNow(action.kind, action.payload.title, action.payload.body)}
                    disabled={Boolean(sendingKind)}
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
