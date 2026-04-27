import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import AppText from '../../components/AppText';
import AppTextInput from '../../components/AppTextInput';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { listAdminUsers, resetAdminUserPassword, updateAdminUserStatus } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import { textClampLines } from '../../utils/responsive';

type FeedbackState = { kind: 'success' | 'error'; message: string } | null;

const AdminUsers = () => {
  const { darkMode } = useThemeMode();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [users, setUsers] = useState<any[]>([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await listAdminUsers({ q: query || undefined, per_page: 50 });
      setUsers(Array.isArray(response.users) ? response.users : []);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível carregar usuários.';
      setFeedback({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleToggleStatus = async (target: any) => {
    if (savingId) return;
    setSavingId(target.id);
    setFeedback(null);

    try {
      const nextActive = !target.active;
      const result = await updateAdminUserStatus(target.id, nextActive);
      setFeedback({ kind: 'success', message: result.message });
      await loadUsers();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível atualizar status deste usuário.';
      setFeedback({ kind: 'error', message });
    } finally {
      setSavingId(null);
    }
  };

  const handleTemporaryReset = async (target: any) => {
    if (savingId) return;
    setSavingId(target.id);
    setFeedback(null);

    try {
      const tempPassword = `Temp@${target.id}${Date.now().toString().slice(-4)}`;
      const result = await resetAdminUserPassword(target.id, tempPassword);
      setFeedback({
        kind: 'success',
        message: `${result.message} Senha temporária: ${tempPassword}`,
      });
      await loadUsers();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Não foi possível redefinir a senha agora.';
      setFeedback({ kind: 'error', message });
    } finally {
      setSavingId(null);
    }
  };

  const canInteract = useMemo(() => !loading && savingId === null, [loading, savingId]);

  return (
    <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Admin - Usuários</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Controle de contas ativas/inativas e senha temporária.
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 112 }}>
        <Card className="p-4 mb-3">
          <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-2">Busca</AppText>
          <View className="flex-row items-center rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-[#121212]">
            <Search size={16} color="#64748b" />
            <AppTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por nome ou email"
              className="flex-1 ml-2 text-slate-900 dark:text-slate-100"
            />
          </View>
          <Button
            title={loading ? 'Buscando...' : 'Buscar usuários'}
            onPress={() => void loadUsers()}
            disabled={!canInteract}
            loading={loading}
            className="mt-3"
          />
        </Card>

        {feedback ? (
          <View
            className={`mb-3 rounded-xl border px-3 py-2 ${
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

        {loading ? (
          <Card className="p-4 items-center">
            <ActivityIndicator color="#f48c25" />
          </Card>
        ) : (
          users.map((item) => {
            const isSelf = Number(currentUser?.id) === item.id;
            const disabled = savingId === item.id;
            return (
              <Card key={item.id} className="p-4 mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <AppText className="text-slate-900 dark:text-slate-100 font-bold" numberOfLines={textClampLines('list')} ellipsizeMode="tail">{item.name}</AppText>
                    <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5" numberOfLines={textClampLines('list')} ellipsizeMode="tail">{item.email}</AppText>
                    <View className="flex-row items-center mt-2">
                      {item.active ? <UserCheck size={14} color="#16a34a" /> : <UserX size={14} color="#dc2626" />}
                      <AppText className="text-slate-600 dark:text-slate-200 text-xs ml-1">
                        {item.active ? 'Conta ativa' : 'Conta inativa'}
                      </AppText>
                      {item.role === 'admin' ? (
                        <View className="flex-row items-center ml-3">
                          <ShieldCheck size={14} color="#f48c25" />
                          <AppText className="text-slate-600 dark:text-slate-200 text-xs ml-1">Admin</AppText>
                        </View>
                      ) : null}
                    </View>
                    {item.force_password_change ? (
                      <AppText className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                        Troca de senha obrigatória pendente.
                      </AppText>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row mt-3 gap-2">
                  <Button
                    title={item.active ? 'Inativar' : 'Ativar'}
                    variant={item.active ? 'outline' : 'primary'}
                    onPress={() => void handleToggleStatus(item)}
                    disabled={disabled || isSelf}
                    loading={disabled}
                    className="flex-1"
                  />
                  <Button
                    title="Senha temporária"
                    variant="outline"
                    onPress={() => void handleTemporaryReset(item)}
                    disabled={disabled}
                    className="flex-1"
                  />
                </View>

                {isSelf ? (
                  <AppText className="text-slate-400 dark:text-slate-300 text-[11px] mt-2">
                    Sua própria conta admin não pode ser inativada.
                  </AppText>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </Layout>
  );
};

export default AdminUsers;


