import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, LockKeyhole } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { changePassword } from '../../services/account';

type FeedbackState = { kind: 'success' | 'error'; message: string } | null;

const SecuritySettings = () => {
  const navigation = useNavigation<any>();
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
      setFeedback({ kind: 'error', message: 'A nova senha deve ter no minimo 8 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ kind: 'error', message: 'A confirmacao da nova senha nao confere.' });
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
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-900 text-xl font-bold">Segurança</Text>
            <Text className="text-slate-500 dark:text-slate-300 text-xs">Gerencie senha e protecao da conta.</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-2">
            <LockKeyhole size={16} color="#64748b" />
            <Text className="text-slate-700 font-bold ml-2">Alterar senha</Text>
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
              className={`rounded-xl px-3 py-2 mb-3 ${feedback.kind === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}
            >
              <Text className={`text-sm ${feedback.kind === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.message}</Text>
            </View>
          ) : null}

          <Button title="Salvar nova senha" onPress={onSubmit} loading={loading} />
        </Card>
      </View>
    </Layout>
  );
};

export default SecuritySettings;




