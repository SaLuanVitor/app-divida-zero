import React, { useState } from 'react';
import { View } from 'react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import AppText from '../../components/AppText';
import AppTextInput from '../../components/AppTextInput';
import Button from '../../components/Button';
import { changePassword } from '../../services/account';
import { useAuth } from '../../context/AuthContext';

type FeedbackState = { kind: 'success' | 'error'; message: string } | null;

const ForcePasswordChange = () => {
  const { reloadMe, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const handleSubmit = async () => {
    if (loading) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({ kind: 'error', message: 'Preencha todos os campos para continuar.' });
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
    setFeedback(null);

    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      await reloadMe();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ kind: 'success', message: 'Senha alterada com sucesso. Acesso liberado.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível alterar a senha agora.';
      setFeedback({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-4">
      <Card className="p-4 mb-3">
        <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold">Troca de senha obrigatória</AppText>
        <AppText className="text-slate-500 dark:text-slate-200 text-sm mt-1">
          Sua conta recebeu uma senha temporária. Defina uma nova senha para continuar usando o aplicativo.
        </AppText>
      </Card>

      <Card className="p-4 mb-3">
        <AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">Senha temporária atual</AppText>
        <AppTextInput
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Digite a senha temporária"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 text-slate-900 dark:text-slate-100"
        />

        <AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold mt-3 mb-1">Nova senha</AppText>
        <AppTextInput
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Digite a nova senha"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 text-slate-900 dark:text-slate-100"
        />

        <AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold mt-3 mb-1">Confirmar nova senha</AppText>
        <AppTextInput
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repita a nova senha"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 text-slate-900 dark:text-slate-100"
        />

        <Button
          title={loading ? 'Salvando...' : 'Salvar nova senha'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          className="mt-4"
        />

        <Button
          title="Sair"
          variant="outline"
          onPress={signOut}
          disabled={loading}
          className="mt-2"
        />
      </Card>

      {feedback ? (
        <View
          className={`rounded-xl border px-3 py-2 ${
            feedback.kind === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <AppText
            className={`text-sm ${
              feedback.kind === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
            }`}
          >
            {feedback.message}
          </AppText>
        </View>
      ) : null}
    </Layout>
  );
};

export default ForcePasswordChange;
