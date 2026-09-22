import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, CheckCircle2, RefreshCw, Users, Unlink } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import { controlHeight, textClampLines } from '../../utils/responsive';
import {
  getTelegramLinkUrl,
  getTelegramStatus,
  updateTelegramPreferences,
  unlinkTelegram,
  TelegramPreferences,
} from '../../services/telegram';

const ToggleItem = ({
  title,
  subtitle,
  value,
  onChange,
  disabled,
  rowHeight,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  rowHeight: number;
}) => (
  <View
    className={`py-3 border-b border-slate-100 dark:border-slate-800 ${disabled ? 'opacity-50' : ''}`}
    style={{ minHeight: rowHeight + 10, justifyContent: 'center' }}
  >
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <AppText className="text-slate-900 dark:text-slate-100 font-semibold" numberOfLines={textClampLines('list')} ellipsizeMode="tail">{title}</AppText>
        <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5" numberOfLines={textClampLines('list')} ellipsizeMode="tail">{subtitle}</AppText>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: '#0ea5e9' }} />
    </View>
  </View>
);

const TelegramSettings = () => {
  const { darkMode } = useThemeMode();
  const { fontScale, largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();
  const iconColor = darkMode ? '#e2e8f0' : '#0f172a';
  const rowHeight = controlHeight(fontScale, largerTouchTargets, 44, { minTouchHeight: 44 });

  const [prefs, setPrefs] = useState<TelegramPreferences | null>(null);
  const [linked, setLinked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error' | ''>('');

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (kind: 'success' | 'error', text: string) => {
    setMessageKind(kind);
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const status = await getTelegramStatus();
      setPrefs(status.preferences);
      setLinked(status.linked);
      setUsername(status.username);
      setChatId(status.chatId);
      return status;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega ao focar: o vinculo acontece fora do app (no Telegram).
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        if (pollingRef.current) clearTimeout(pollingRef.current);
      };
    }, [load])
  );

  // Polling curto de reconferencia: apos abrir o link, o webhook pode levar
  // alguns segundos para vincular. Verifica a cada 3s por ~18s.
  const startPolling = useCallback(() => {
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      void load(true).then((status) => {
        if (status?.linked || attempts >= 6) {
          return;
        }
        pollingRef.current = setTimeout(tick, 3000);
      });
    };
    pollingRef.current = setTimeout(tick, 3000);
  }, [load]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  const handleLink = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const url = await getTelegramLinkUrl();
      await Linking.openURL(url);
      showMessage('success', 'Abra o Telegram, toque em Iniciar. O vínculo será confirmado automaticamente.');
      startPolling();
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      showMessage('error', apiError || 'Não foi possível abrir o Telegram.');
    } finally {
      setOpening(false);
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    try {
      const status = await load(true);
      if (status?.linked) showMessage('success', 'Vínculo confirmado.');
      else showMessage('error', 'Ainda não vinculado. Toque em Iniciar no Telegram.');
    } finally {
      setChecking(false);
    }
  };

  const handleUnlink = () => {
    Alert.alert(
      'Desvincular Telegram',
      'Você deixará de receber os avisos do Dívida Zero no Telegram.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            setUnlinking(true);
            try {
              await unlinkTelegram();
              setLinked(false);
              setUsername(null);
              setChatId(null);
              setPrefs((p) => (p ? { ...p, telegram_notifications_enabled: false } : p));
              showMessage('success', 'Telegram desvinculado.');
            } catch {
              showMessage('error', 'Erro ao desvincular.');
            } finally {
              setUnlinking(false);
            }
          },
        },
      ]
    );
  };

  const togglePref = useCallback(
    async (key: keyof TelegramPreferences, value: boolean) => {
      if (!prefs) return;
      const previous = prefs;
      setPrefs({ ...prefs, [key]: value });
      try {
        await updateTelegramPreferences({ [key]: value });
      } catch {
        setPrefs(previous);
        showMessage('error', 'Erro ao salvar preferência.');
      }
    },
    [prefs]
  );

  const identityLabel = username
    ? `@${username}`
    : chatId
      ? `ID ${chatId}`
      : 'Telegram';

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Telegram</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Receba os avisos pelo Telegram
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        {message ? (
          <Card className="p-3 mb-3">
            <AppText
              className={`text-sm font-semibold ${messageKind === 'error' ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}
            >
              {message}
            </AppText>
          </Card>
        ) : null}

        {loading ? (
          <Card className="p-4">
            <AppText className="text-slate-500 dark:text-slate-200 text-sm">Carregando...</AppText>
          </Card>
        ) : linked && prefs ? (
          <>
            <Card className="p-4 mb-3">
              <View className="flex-row items-center">
                <CheckCircle2 size={22} color="#22c55e" />
                <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2 flex-1" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
                  Vinculado a {identityLabel}
                </AppText>
              </View>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">
                Você recebe os avisos do Dívida Zero neste Telegram.
              </AppText>
            </Card>

            <Card className="px-4 py-1 mb-3">
              <ToggleItem
                title="Receber pelo Telegram"
                subtitle="Liga ou desliga todos os avisos no Telegram."
                value={prefs.telegram_notifications_enabled}
                onChange={(v) => togglePref('telegram_notifications_enabled', v)}
                rowHeight={rowHeight}
              />
              <ToggleItem
                title="Lembretes de vencimento"
                subtitle="Avisos de contas a vencer e em atraso."
                value={prefs.telegram_due_reminders}
                onChange={(v) => togglePref('telegram_due_reminders', v)}
                disabled={!prefs.telegram_notifications_enabled}
                rowHeight={rowHeight}
              />
              <ToggleItem
                title="Resumo semanal"
                subtitle="Panorama da semana com pendências e saldo previsto."
                value={prefs.telegram_weekly_summary}
                onChange={(v) => togglePref('telegram_weekly_summary', v)}
                disabled={!prefs.telegram_notifications_enabled}
                rowHeight={rowHeight}
              />
            </Card>

            <TouchableOpacity
              onPress={handleUnlink}
              disabled={unlinking}
              className="flex-row items-center justify-center py-3 rounded-xl border border-red-200 dark:border-red-900"
              accessibilityRole="button"
              accessibilityLabel="Desvincular Telegram"
            >
              <Unlink size={16} color="#ef4444" />
              <AppText className="text-red-600 dark:text-red-300 font-bold ml-2">
                {unlinking ? 'Desvinculando...' : 'Desvincular'}
              </AppText>
            </TouchableOpacity>
          </>
        ) : (
          <Card className="p-4">
            <View className="items-center py-2">
              <Send size={44} color="#0ea5e9" />
              <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold mt-3 text-center">
                Vincular seu Telegram
              </AppText>
              <AppText className="text-slate-500 dark:text-slate-200 text-sm mt-1 text-center">
                Receba lembretes de vencimento e o resumo semanal direto no Telegram, sem custo.
              </AppText>
            </View>

            <View className="mt-4 mb-2">
              <AppText className="text-slate-700 dark:text-slate-200 text-xs">
                1. Toque em Vincular Telegram
              </AppText>
              <AppText className="text-slate-700 dark:text-slate-200 text-xs mt-1">
                2. No Telegram, toque em Iniciar
              </AppText>
              <AppText className="text-slate-700 dark:text-slate-200 text-xs mt-1">
                3. O vínculo é confirmado automaticamente ao voltar
              </AppText>
            </View>

            <Button
              title={opening ? 'Abrindo...' : 'Vincular Telegram'}
              loading={opening}
              disabled={opening}
              onPress={handleLink}
              className="h-12 mt-2"
            />

            <TouchableOpacity
              onPress={handleRecheck}
              disabled={checking}
              className="flex-row items-center justify-center mt-3 py-2"
              accessibilityRole="button"
              accessibilityLabel="Já vinculei, verificar"
            >
              <RefreshCw size={14} color={darkMode ? '#cbd5e1' : '#475569'} />
              <AppText className="text-slate-600 dark:text-slate-200 text-xs font-bold ml-2">
                {checking ? 'Verificando...' : 'Já vinculei, verificar'}
              </AppText>
            </TouchableOpacity>
          </Card>
        )}

        <View className="flex-row items-start mt-4 px-1">
          <Users size={16} color={darkMode ? '#94a3b8' : '#64748b'} />
          <AppText className="text-slate-500 dark:text-slate-200 text-xs ml-2 flex-1">
            O vínculo é individual: cada pessoa (na conta pessoal ou na família) conecta o próprio Telegram
            e recebe os avisos dela. Ninguém vê os avisos do outro por aqui.
          </AppText>
        </View>
      </View>
    </Layout>
  );
};

export default TelegramSettings;
