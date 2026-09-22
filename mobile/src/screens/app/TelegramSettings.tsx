import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, Switch, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, CheckCircle2, RefreshCw, Users } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import {
  getTelegramLinkUrl,
  getTelegramStatus,
  updateTelegramPreferences,
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
        <AppText className="text-slate-900 dark:text-slate-100 font-semibold">{title}</AppText>
        <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5">{subtitle}</AppText>
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
  const rowHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);

  const [prefs, setPrefs] = useState<TelegramPreferences | null>(null);
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error' | ''>('');

  const showMessage = (kind: 'success' | 'error', text: string) => {
    setMessageKind(kind);
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const load = useCallback(async () => {
    try {
      const status = await getTelegramStatus();
      setPrefs(status.preferences);
      setLinked(status.linked);
    } catch {
      // mantem estado anterior em falha de rede
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega ao focar: o vinculo acontece fora do app (no Telegram),
  // entao o status precisa ser reconferido quando o usuario volta.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleLink = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const url = await getTelegramLinkUrl();
      await Linking.openURL(url);
      showMessage('success', 'Abra o Telegram, toque em Iniciar e volte para cá.');
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
      await load();
      if (linked) showMessage('success', 'Vinculo confirmado.');
    } finally {
      setChecking(false);
    }
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
                <CheckCircle2 size={20} color="#22c55e" />
                <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">
                  Telegram vinculado
                </AppText>
              </View>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">
                Você recebe os avisos do Dívida Zero neste Telegram.
              </AppText>
            </Card>

            <Card className="px-4 py-1">
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
                3. Volte para o app e confirme o vínculo
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
