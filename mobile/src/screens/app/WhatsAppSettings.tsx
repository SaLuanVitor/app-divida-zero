import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, Switch, TextInput } from 'react-native';
import { ArrowLeft, MessageCircle, Smartphone, CheckCircle, AlertCircle } from 'lucide-react-native';
import AppText from '../../components/AppText';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import {
  getWaPreferences,
  updateWaPreferences,
  sendPhoneCode,
  verifyPhoneCode,
  WaPreferences,
} from '../../services/whatsapp';

type PageState = 'initial' | 'phone_input' | 'code_verify' | 'settings';

const WhatsAppSettings = () => {
  const { darkMode } = useThemeMode();
  const { fontScale, largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();
  const iconColor = darkMode ? '#e2e8f0' : '#0f172a';
  const rowHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);

  const [pageState, setPageState] = useState<PageState>('initial');
  const [prefs, setPrefs] = useState<WaPreferences | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const waPrefs = await getWaPreferences();
        if (waPrefs) {
          setPrefs(waPrefs);
          setPageState('settings');
        }
      } catch {
        setPageState('initial');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const showMessage = (kind: 'success' | 'error', text: string) => {
    setMessageKind(kind);
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSendCode = async () => {
    if (phone.length < 10) {
      showMessage('error', 'Digite um telefone válido com DDD.');
      return;
    }
    setLoading(true);
    try {
      const result = await sendPhoneCode(phone);
      setPageState('code_verify');
      showMessage('success', result.message);
    } catch (err: any) {
      showMessage('error', err?.response?.data?.error || 'Erro ao enviar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length < 4) {
      showMessage('error', 'Digite o código recebido.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyPhoneCode(phone, code);
      setPhoneVerified(true);
      setPrefs(result.wa_preferences);
      setPageState('settings');
      showMessage('success', result.message);
    } catch (err: any) {
      showMessage('error', err?.response?.data?.error || 'Código inválido.');
    } finally {
      setLoading(false);
    }
  };

  const togglePref = useCallback(
    async (key: keyof WaPreferences, value: boolean) => {
      if (!prefs) return;
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      try {
        await updateWaPreferences({ [key]: value });
      } catch {
        setPrefs(prefs);
        showMessage('error', 'Erro ao salvar preferência.');
      }
    },
    [prefs]
  );

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `+55 ${digits}`;
    if (digits.length <= 7) return `+55 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
        <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: '#22c55e' }} />
      </View>
    </View>
  );

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">WhatsApp</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Receba lembretes pelo WhatsApp
            </AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        {pageState === 'initial' && (
          <Card className="p-4">
            <View className="items-center py-4">
              <MessageCircle size={48} color="#22c55e" />
              <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold mt-3 text-center">
                Notificações por WhatsApp
              </AppText>
              <AppText className="text-slate-500 dark:text-slate-200 text-sm mt-1 text-center">
                Receba lembretes de vencimento e resumo semanal diretamente no seu WhatsApp.
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => setPageState('phone_input')}
              className="bg-emerald-500 py-3 rounded-xl items-center mt-2"
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <AppText className="text-white font-bold text-base">Começar</AppText>
            </TouchableOpacity>
          </Card>
        )}

        {pageState === 'phone_input' && (
          <Card className="p-4">
            <View className="flex-row items-center mb-3">
              <Smartphone size={18} color="#22c55e" />
              <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">
                Seu número de WhatsApp
              </AppText>
            </View>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs mb-2">
              Digite seu número com DDD. Enviaremos um código de verificação.
            </AppText>
            <TextInput
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              placeholder="+55 (XX) XXXXX-XXXX"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 text-base"
              style={{ minHeight: 48 }}
            />
            <TouchableOpacity
              onPress={handleSendCode}
              disabled={loading}
              className={`py-3 rounded-xl items-center mt-3 ${loading ? 'bg-emerald-300' : 'bg-emerald-500'}`}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <AppText className="text-white font-bold text-base">
                {loading ? 'Enviando...' : 'Enviar código'}
              </AppText>
            </TouchableOpacity>
          </Card>
        )}

        {pageState === 'code_verify' && (
          <Card className="p-4">
            <View className="flex-row items-center mb-3">
              <CheckCircle size={18} color="#22c55e" />
              <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">
                Código de verificação
              </AppText>
            </View>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs mb-2">
              Digite o código de 6 dígitos enviado para {phone}.
            </AppText>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 text-base text-center tracking-widest"
              style={{ minHeight: 48, fontSize: 24, letterSpacing: 8 }}
            />
            <TouchableOpacity
              onPress={handleVerifyCode}
              disabled={loading}
              className={`py-3 rounded-xl items-center mt-3 ${loading ? 'bg-emerald-300' : 'bg-emerald-500'}`}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <AppText className="text-white font-bold text-base">
                {loading ? 'Verificando...' : 'Verificar'}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPageState('phone_input')} className="mt-2 items-center">
              <AppText className="text-emerald-500 text-sm">Trocar número</AppText>
            </TouchableOpacity>
          </Card>
        )}

        {pageState === 'settings' && prefs && (
          <>
            {phoneVerified && (
              <View className="mb-3 rounded-xl px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex-row items-center">
                <CheckCircle size={14} color="#22c55e" />
                <AppText className="text-emerald-700 dark:text-emerald-300 text-sm ml-2">
                  Telefone verificado
                </AppText>
              </View>
            )}
            <Card className="p-4">
              <View className="flex-row items-center mb-2">
                <MessageCircle size={16} color="#22c55e" />
                <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">
                  Preferências WhatsApp
                </AppText>
              </View>

              <Item
                title="Receber notificações WhatsApp"
                subtitle="Liga ou desliga todas as notificações via WhatsApp."
                value={prefs.wa_notifications_enabled}
                onChange={(v) => togglePref('wa_notifications_enabled', v)}
              />
              <Item
                title="Lembretes de vencimento"
                subtitle="Aviso de contas a vencer ou em atraso."
                value={prefs.wa_due_reminders}
                onChange={(v) => togglePref('wa_due_reminders', v)}
                disabled={!prefs.wa_notifications_enabled}
              />
              <Item
                title="Resumo semanal"
                subtitle="Resumo financeiro da semana."
                value={prefs.wa_weekly_summary}
                onChange={(v) => togglePref('wa_weekly_summary', v)}
                disabled={!prefs.wa_notifications_enabled}
              />
            </Card>

            <Card className="p-4 mt-3">
              <View className="flex-row items-center mb-2">
                <AlertCircle size={16} color="#64748b" />
                <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">
                  Horário de silêncio
                </AppText>
              </View>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs">
                Não enviaremos mensagens entre {prefs.wa_dnd_start || '22:00'} e{' '}
                {prefs.wa_dnd_end || '08:00'}.
              </AppText>
            </Card>
          </>
        )}

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

export default WhatsAppSettings;
