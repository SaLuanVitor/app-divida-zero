import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, BarChart3, Users, UserCheck, UserX } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { getAdminAnalyticsOverview } from '../../services/admin';
import useBackToProfile from '../../hooks/useBackToProfile';
import { useThemeMode } from '../../context/ThemeContext';

const dimensionLabels: Record<string, string> = {
  usability: 'Usabilidade',
  helpfulness: 'Utilidade',
  calendar: 'Calendário',
  alerts: 'Avisos',
  goals: 'Metas',
  reports: 'Relatórios',
  records: 'Lançamentos',
};

const AdminDashboard = ({ navigation }: any) => {
  const { darkMode } = useThemeMode();
  const goBackToProfile = useBackToProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminAnalyticsOverview({ days: 30 });
      setOverview(response);
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Não foi possível carregar métricas administrativas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const topSuggestions = useMemo(() => {
    const items = overview?.app_ratings?.recent_suggestions?.items;
    return Array.isArray(items) ? items.slice(0, 5) : [];
  }, [overview]);

  return (
    <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={goBackToProfile} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color={darkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 pr-1">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Painel Admin</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Visão geral de usuários e avaliações do aplicativo.
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 112 }}>
        <Card className="p-4 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <AppText className="text-slate-900 dark:text-slate-100 font-bold">Resumo (30 dias)</AppText>
            <Button title="Atualizar" variant="outline" className="h-9 px-3" onPress={() => void load()} />
          </View>

          {loading ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#f48c25" />
            </View>
          ) : error ? (
            <AppText className="text-red-700 dark:text-red-300 text-sm">{error}</AppText>
          ) : (
            <View className="gap-2">
              <View className="flex-row items-center">
                <Users size={16} color="#334155" />
                <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">
                  Total de contas: {overview?.users?.total ?? 0}
                </AppText>
              </View>
              <View className="flex-row items-center">
                <UserCheck size={16} color="#16a34a" />
                <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">
                  Ativas: {overview?.users?.active ?? 0}
                </AppText>
              </View>
              <View className="flex-row items-center">
                <UserX size={16} color="#dc2626" />
                <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">
                  Inativas: {overview?.users?.inactive ?? 0}
                </AppText>
              </View>
              <View className="flex-row items-center">
                <BarChart3 size={16} color="#f48c25" />
                <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">
                  Respostas de avaliação: {overview?.app_ratings?.total_responses ?? 0}
                </AppText>
              </View>
            </View>
          )}
        </Card>

        {overview?.app_ratings?.averages ? (
          <Card className="p-4 mb-3">
            <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">Médias por dimensão</AppText>
            {Object.entries(overview.app_ratings.averages).map(([key, value]) => {
              const score = Number(value || 0);
              const widthPct = Math.max(0, Math.min(100, (score / 5) * 100));
              return (
                <View key={key} className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <AppText className="text-slate-700 dark:text-slate-200 text-xs">{dimensionLabels[key] || key}</AppText>
                    <AppText className="text-slate-900 dark:text-slate-100 text-xs font-semibold">{score.toFixed(2)}</AppText>
                  </View>
                  <View className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <View className="h-2 bg-primary" style={{ width: `${widthPct}%` }} />
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}

        <Card className="p-4 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <AppText className="text-slate-900 dark:text-slate-100 font-bold">Sugestões recentes</AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Admin Usuarios')}>
              <AppText className="text-primary text-xs font-semibold">Gerenciar usuários</AppText>
            </TouchableOpacity>
          </View>

          {topSuggestions.length === 0 ? (
            <AppText className="text-slate-500 dark:text-slate-200 text-sm">Nenhuma sugestão registrada.</AppText>
          ) : (
            topSuggestions.map((item: any) => (
              <View key={item.id} className="py-2 border-b border-slate-100 dark:border-slate-800">
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">{item.suggestion}</AppText>
                <AppText className="text-slate-400 dark:text-slate-300 text-[11px] mt-1">
                  {new Date(item.created_at).toLocaleString('pt-BR')}
                </AppText>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Layout>
  );
};

export default AdminDashboard;
