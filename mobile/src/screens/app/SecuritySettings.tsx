import React, { useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity } from 'react-native';
import { ArrowLeft, LockKeyhole } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { changePassword } from '../../services/account';
import useBackToProfile from '../../hooks/useBackToProfile';

type FeedbackState = { kind: 'success' | 'error'; message: string } | null;

const SecuritySettings = () => {
  const { darkMode } = useThemeMode();
  const goBackToProfile = useBackToProfile();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const onSubmit = async () => {
    setFeedback(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({ kind: 'error', message: 'Preencha todos os campos de senha.' });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({ kind: 'error', message: 'A nova senha deve ter no mínimo 8 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ kind: 'error', message: 'A confirmação da nova senha não confere.' });
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ kind: 'success', message: result.message });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível alterar a senha.';
      setFeedback({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout scrollable formMode contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0 pb-28">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Segurança</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">Gerencie senha e proteção da conta.</AppText>
          </View>
        </View>
      </View>

      <View className="p-4 pb-6">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <LockKeyhole size={16} color="#64748b" />
            <AppText className="text-slate-700 dark:text-slate-200 font-bold ml-2">Alterar senha</AppText>
          </View>

          <Input
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Input
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Input
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
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

          <Button title="Salvar nova senha" onPress={onSubmit} loading={loading} />
        </Card>
      </View>
    </Layout>
  );
};

export default SecuritySettings;


