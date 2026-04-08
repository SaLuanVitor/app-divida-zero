import React, { useMemo, useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity } from 'react-native';
import { ArrowLeft, Mail, User } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { updateProfile } from '../../services/account';
import useBackToProfile from '../../hooks/useBackToProfile';

type FeedbackState = { kind: 'success' | 'error'; message: string } | null;

const PersonalData = () => {
  const { darkMode } = useThemeMode();
  const { user, updateUser } = useAuth();
  const goBackToProfile = useBackToProfile();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const hasChanges = useMemo(
    () => name.trim() !== (user?.name || '') || email.trim().toLowerCase() !== (user?.email || '').toLowerCase(),
    [email, name, user?.email, user?.name]
  );

  const onSave = async () => {
    setFeedback(null);

    if (name.trim().length < 2) {
      setFeedback({ kind: 'error', message: 'Informe um identificador com pelo menos 2 caracteres.' });
      return;
    }

    if (!email.includes('@')) {
      setFeedback({ kind: 'error', message: 'Informe um identificador de acesso válido.' });
      return;
    }

    setLoading(true);
    try {
      const result = await updateProfile({ name: name.trim(), email: email.trim().toLowerCase() });
      await updateUser(result.user);
      setFeedback({ kind: 'success', message: result.message });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível atualizar os dados do usuário.';
      setFeedback({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout scrollable formMode contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Dados do usuário</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">Atualize os identificadores visuais da conta.</AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        <Card className="p-4">
          <Input label="Nome do usuário" value={name} onChangeText={setName} autoCapitalize="words" icon={User} />
          <Input
            label="Usuário"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            icon={Mail}
          />

          {feedback ? (
            <View
              className={`rounded-xl px-3 py-2 mb-3 ${
                feedback.kind === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <AppText className={`text-sm ${feedback.kind === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {feedback.message}
              </AppText>
            </View>
          ) : null}

          <Button title="Salvar alterações" onPress={onSave} loading={loading} disabled={loading || !hasChanges} />
        </Card>
      </View>
    </Layout>
  );
};

export default PersonalData;


