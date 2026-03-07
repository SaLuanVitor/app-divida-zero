import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Mail, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/account';

type FeedbackState = { kind: 'success' | 'error'; message: string } | null;

const PersonalData = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();

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
      setFeedback({ kind: 'error', message: 'Informe um nome com pelo menos 2 caracteres.' });
      return;
    }

    if (!email.includes('@')) {
      setFeedback({ kind: 'error', message: 'Informe um e-mail válido.' });
      return;
    }

    setLoading(true);
    try {
      const result = await updateProfile({ name: name.trim(), email: email.trim().toLowerCase() });
      await updateUser(result.user);
      setFeedback({ kind: 'success', message: result.message });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível atualizar os dados pessoais.';
      setFeedback({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] p-0">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-900 text-xl font-bold">Dados pessoais</Text>
            <Text className="text-slate-500 text-xs">Atualize seu nome e e-mail da conta.</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4">
          <Input label="Nome" value={name} onChangeText={setName} autoCapitalize="words" icon={User} />
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            icon={Mail}
          />

          {feedback ? (
            <View
              className={`rounded-xl px-3 py-2 mb-3 ${feedback.kind === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}
            >
              <Text className={`text-sm ${feedback.kind === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.message}</Text>
            </View>
          ) : null}

          <Button title="Salvar alterações" onPress={onSave} loading={loading} disabled={loading || !hasChanges} />
        </Card>
      </View>
    </Layout>
  );
};

export default PersonalData;
