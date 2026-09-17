import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Share, Alert as RNAlert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Copy, LogOut, UserPlus } from 'lucide-react-native';
import AppText from '../../components/AppText';
import AppTextInput from '../../components/AppTextInput';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import useBackToProfile from '../../hooks/useBackToProfile';
import { getMyHousehold, createHousehold, leaveHousehold } from '../../services/household';
import { Household } from '../../types/household';

const Familia = () => {
  const { darkMode } = useThemeMode();
  const { largerTouchTargets } = useAccessibility();
  const goBackToProfile = useBackToProfile();
  const navigation = useNavigation<any>();

  const [household, setHousehold] = useState<Household | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadHousehold = async () => {
    try {
      const data = await getMyHousehold();
      setHousehold(data.household);
    } catch {
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHousehold();
  }, []);

  const handleShareCode = async () => {
    if (!household) return;
    try {
      await Share.share({
        message: `Entre na minha família no Dívida Zero! Use o código: ${household.invite_code}`,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleLeave = () => {
    if (!household) return;
    const isOwner = household.owner_id === household.members?.find(m => m.role === 'owner')?.user_id;

    RNAlert.alert(
      'Sair da família',
      isOwner
        ? 'Você é o proprietário. Remova todos os membros antes de sair ou exclua a família.'
        : 'Tem certeza que deseja sair da família?',
      isOwner
        ? [{ text: 'Entendi', style: 'default' }]
        : [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sair',
              style: 'destructive',
              onPress: async () => {
                setLeaving(true);
                try {
                  await leaveHousehold();
                  setHousehold(null);
                } catch (error: any) {
                  RNAlert.alert('Erro', error?.response?.data?.error || 'Não foi possível sair da família.');
                } finally {
                  setLeaving(false);
                }
              },
            },
          ]
    );
  };

  if (loading) {
    return (
      <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f48c25" />
        </View>
      </Layout>
    );
  }

  if (!household) {
    return (
      <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
        <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
              <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
            </TouchableOpacity>
            <View className="flex-1 pr-1">
              <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Família</AppText>
              <AppText className="text-slate-500 dark:text-slate-200 text-xs">Compartilhe com quem você confia.</AppText>
            </View>
          </View>
        </View>

        <View className="p-4">
          <Card className="p-6 items-center" style={{ gap: 16 }}>
            <Users size={48} color="#94a3b8" />
            <AppText className="text-slate-900 dark:text-slate-100 text-lg font-bold text-center">
              Você não está em nenhuma família
            </AppText>
            <AppText className="text-slate-500 text-center">
              Crie uma família para compartilhar lançamentos e metas com outras pessoas.
            </AppText>
            {creating ? (
              <View className="w-full" style={{ gap: 12 }}>
                <AppTextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nome da família"
                  placeholderTextColor="#94a3b8"
                  className="bg-[#f8fafc] dark:bg-[#1f2937] text-slate-900 dark:text-slate-100 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700"
                  style={{ fontSize: 16, minHeight: largerTouchTargets ? 56 : 48 }}
                />
                <TouchableOpacity
                  onPress={async () => {
                    if (!newName.trim()) return;
                    setCreating(true);
                    try {
                      const created = await createHousehold(newName.trim());
                      setHousehold(created);
                    } catch (error: any) {
                      RNAlert.alert('Erro', error?.response?.data?.error || 'Não foi possível criar a família.');
                    } finally {
                      setCreating(false);
                    }
                  }}
                  disabled={!newName.trim()}
                  className="bg-[#f48c25] p-3.5 rounded-xl items-center"
                  style={{ opacity: !newName.trim() ? 0.5 : 1 }}
                >
                  <AppText className="text-white font-bold">Criar</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setCreating(true)}
                className="bg-[#f48c25] px-6 py-3 rounded-xl flex-row items-center"
                style={{ gap: 8 }}
              >
                <UserPlus size={18} color="#fff" />
                <AppText className="text-white font-bold">Criar família</AppText>
              </TouchableOpacity>
            )}
          </Card>
        </View>
      </Layout>
    );
  }

  const isOwner = household.owner_id === household.members?.find(m => m.role === 'owner')?.user_id;

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Família</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">Gerencie sua família.</AppText>
          </View>
        </View>
      </View>

      <View className="p-4" style={{ gap: 16 }}>
        <Card className="p-5" style={{ gap: 12 }}>
          <View className="flex-row justify-between items-center">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">
              {household.name}
            </AppText>
          </View>

          <View
            className="flex-row items-center bg-[#f8fafc] dark:bg-[#1f2937] p-3 rounded-lg"
            style={{ gap: 8 }}
          >
            <AppText className="font-mono text-base flex-1 text-slate-900 dark:text-slate-100">
              {household.invite_code}
            </AppText>
            <TouchableOpacity onPress={handleShareCode} className="p-1">
              <Copy size={18} color="#f48c25" />
            </TouchableOpacity>
          </View>
        </Card>

        <Card className="p-5" style={{ gap: 8 }}>
          <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold mb-2">
            Membros ({household.members?.length || 0})
          </AppText>
          {household.members?.map((member) => (
            <View
              key={member.id}
              className="flex-row justify-between items-center py-2 border-b border-[#f1ede9] dark:border-[#1f2937]"
            >
              <View>
                <AppText className="font-bold text-slate-900 dark:text-slate-100">
                  {member.name}
                </AppText>
                <AppText className="text-xs text-slate-500">{member.email}</AppText>
              </View>
              <View
                className="px-2 py-1 rounded"
                style={{ backgroundColor: member.role === 'owner' ? '#f48c25' : '#94a3b8' }}
              >
                <AppText className="text-[11px] text-white font-bold">
                  {member.role === 'owner' ? 'Dono' : 'Membro'}
                </AppText>
              </View>
            </View>
          ))}
        </Card>

        {isOwner && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Convidar')}
            className="bg-[#f48c25] p-3.5 rounded-xl flex-row items-center justify-center"
            style={{ gap: 8 }}
          >
            <UserPlus size={18} color="#fff" />
            <AppText className="text-white font-bold text-[15px]">Convidar por email</AppText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleLeave}
          disabled={leaving}
          className="p-3.5 rounded-xl flex-row items-center justify-center border border-red-500"
          style={{ gap: 8 }}
        >
          {leaving ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <LogOut size={18} color="#ef4444" />
          )}
          <AppText className="text-red-500 font-bold text-[15px]">
            {isOwner ? 'Excluir família' : 'Sair da família'}
          </AppText>
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

export default Familia;
