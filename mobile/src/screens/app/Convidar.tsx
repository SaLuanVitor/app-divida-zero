import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send } from 'lucide-react-native';
import AppText from '../../components/AppText';
import AppTextInput from '../../components/AppTextInput';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import { createHouseholdInvitation } from '../../services/household';

const Convidar = () => {
  const { darkMode } = useThemeMode();
  const { largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string }>({});

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setResult({ error: 'Informe o email do convidado.' });
      return;
    }

    setSending(true);
    setResult({});

    try {
      await createHouseholdInvitation(trimmed);
      setResult({ success: `Convite enviado para ${trimmed}.` });
      setEmail('');
    } catch (error: any) {
      setResult({ error: error?.response?.data?.error || 'Não foi possível enviar o convite.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Convidar</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">Convide alguém para sua família.</AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6" style={{ gap: 16 }}>
        <Card className="p-5">
          <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-1">
            Convidar por email
          </AppText>
          <AppText className="text-slate-500 dark:text-slate-200 text-xs mb-4">
            O convidado precisa ter uma conta no Dívida Zero com o mesmo email.
          </AppText>

          <AppTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            className="bg-[#f8fafc] dark:bg-[#1f2937] text-slate-900 dark:text-slate-100 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{ fontSize: 16, minHeight: largerTouchTargets ? 56 : 48 }}
          />

          {result.success && (
            <View className="bg-green-100 p-3 rounded-lg mt-4">
              <AppText className="text-green-800">{result.success}</AppText>
            </View>
          )}
          {result.error && (
            <View className="bg-red-100 p-3 rounded-lg mt-4">
              <AppText className="text-red-800">{result.error}</AppText>
            </View>
          )}

          <TouchableOpacity
            onPress={handleInvite}
            disabled={sending}
            className="bg-[#f48c25] p-3.5 rounded-xl flex-row items-center justify-center mt-4"
            style={{ gap: 8, opacity: sending ? 0.6 : 1 }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
            <AppText className="text-white font-bold text-[15px]">Enviar convite</AppText>
          </TouchableOpacity>
        </Card>
      </View>
    </Layout>
  );
};

export default Convidar;
