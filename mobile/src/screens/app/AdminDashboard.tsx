import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { BarChart3, Calendar, LogOut, RefreshCw, ShieldCheck, Users, UserCheck, UserX } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { getAdminAnalyticsOverview } from '../../services/admin';
import { useThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AdminAnalyticsOverviewDto } from '../../types/admin';

const dimensionLabels: Record<string, string> = {
  usability: 'Usabilidade',
  helpfulness: 'Utilidade',
  calendar: 'Calendário',
  alerts: 'Avisos',
  goals: 'Metas',
  reports: 'Relatórios',
  records: 'Lançamentos',
};

const PERIOD_OPTIONS = [7, 30, 90, 180] as const;

const AdminDashboard = ({ navigation }: any) => {
  const { darkMode } = useThemeMode();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [overview, setOverview] = useState<AdminAnalyticsOverviewDto | null>(null);

  const load = async (nextDays = periodDays) => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminAnalyticsOverview({ days: nextDays });
      setOverview(response);
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Não foi possível carregar métricas administrativas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(30);
  }, []);

  const topSuggestions = useMemo(() => {
    const items = overview?.app_ratings?.recent_suggestions?.items;
    return Array.isArray(items) ? items.slice(0, 5) : [];
  }, [overview]);

  const topEvents = useMemo(() => {
    const items = overview?.app_usage?.top_events ?? [];
    return items.slice(0, 5);
  }, [overview]);

  const topScreens = useMemo(() => {
    const items = overview?.app_usage?.top_screens ?? [];
    return items.slice(0, 5);
  }, [overview]);

  const users = overview?.users;
  const engagement = overview?.engagement;
  const appUsage = overview?.app_usage;
  const funnel = overview?.onboarding_tutorial_funnel;
  const financial = overview?.financial_overview;

  return (
    <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Portal Admin</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Painel operacional geral do aplicativo.
            </AppText>
          </View>
          <TouchableOpacity
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] flex-row items-center"
            onPress={() => void signOut()}
          >
            <LogOut size={14} color={darkMode ? '#e2e8f0' : '#334155'} />
            <AppText className="text-slate-700 dark:text-slate-200 text-xs ml-1">Sair</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 112 }}>
        <Card className="p-4 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Calendar size={16} color="#334155" />
              <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Período</AppText>
            </View>
            <Button title="Atualizar" variant="outline" className="h-9 px-3" onPress={() => void load(periodDays)} />
          </View>
          <View className="flex-row flex-wrap gap-2">
            {PERIOD_OPTIONS.map((days) => {
              const selected = periodDays === days;
              return (
                <TouchableOpacity
                  key={days}
                  className={`px-3 py-2 rounded-full border ${selected ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                  onPress={() => {
                    setPeriodDays(days);
                    void load(days);
                  }}
                >
                  <AppText className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                    {days} dias
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {loading ? (
          <Card className="p-4 items-center mb-3">
            <ActivityIndicator color="#f48c25" />
          </Card>
        ) : error ? (
          <Card className="p-4 mb-3">
            <AppText className="text-red-700 dark:text-red-300 text-sm">{error}</AppText>
          </Card>
        ) : (
          <>
            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">KPIs principais</AppText>
              <View className="gap-2">
                <View className="flex-row items-center">
                  <Users size={16} color="#334155" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">Total de contas: {users?.total ?? 0}</AppText>
                </View>
                <View className="flex-row items-center">
                  <UserCheck size={16} color="#16a34a" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">Ativas: {users?.active ?? 0}</AppText>
                </View>
                <View className="flex-row items-center">
                  <UserX size={16} color="#dc2626" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">Inativas: {users?.inactive ?? 0}</AppText>
                </View>
                <View className="flex-row items-center">
                  <BarChart3 size={16} color="#f48c25" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm ml-2">
                    Respostas de avaliação: {overview?.app_ratings?.total_responses ?? 0}
                  </AppText>
                </View>
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">Engajamento</AppText>
              <View className="gap-2">
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Logins no período: {engagement?.logins_in_period ?? 0}
                </AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Usuários ativos (7d/30d): {engagement?.active_users_7d ?? 0} / {engagement?.active_users_30d ?? 0}
                </AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Taxa de atividade: {(engagement?.activity_rate_pct ?? 0).toFixed(2)}%
                </AppText>
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">Uso do app</AppText>
              <AppText className="text-slate-700 dark:text-slate-200 text-sm mb-2">
                Eventos no período: {appUsage?.total_events ?? 0} • Sessões: {appUsage?.sessions ?? 0}
              </AppText>
              <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold mb-1">Top eventos</AppText>
              {topEvents.length === 0 ? (
                <AppText className="text-slate-500 dark:text-slate-200 text-xs">Sem dados no período.</AppText>
              ) : (
                topEvents.map((item) => (
                  <AppText key={item.event_name} className="text-slate-600 dark:text-slate-200 text-xs mb-1">
                    • {item.event_name}: {item.count}
                  </AppText>
                ))
              )}
              <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold mt-2 mb-1">Top telas</AppText>
              {topScreens.length === 0 ? (
                <AppText className="text-slate-500 dark:text-slate-200 text-xs">Sem dados no período.</AppText>
              ) : (
                topScreens.map((item) => (
                  <AppText key={item.screen} className="text-slate-600 dark:text-slate-200 text-xs mb-1">
                    • {item.screen}: {item.count}
                  </AppText>
                ))
              )}
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">Funil onboarding/tutorial</AppText>
              <View className="gap-1">
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">Onboarding visto: {funnel?.onboarding_viewed ?? 0}</AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">Concluído: {funnel?.onboarding_completed ?? 0}</AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">Pulado: {funnel?.onboarding_skipped ?? 0}</AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">Tutorial reaberto: {funnel?.tutorial_reopened ?? 0}</AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Modo iniciante/avançado: {funnel?.onboarding_mode?.beginner ?? 0} / {funnel?.onboarding_mode?.advanced ?? 0}
                </AppText>
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-3">Financeiro agregado</AppText>
              <View className="gap-1">
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Receitas/Despesas (liquidadas): {Number(financial?.settled_income_total ?? 0).toFixed(2)} / {Number(financial?.settled_expense_total ?? 0).toFixed(2)}
                </AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Saldo líquido quitado: {Number(financial?.settled_net_balance ?? 0).toFixed(2)}
                </AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Registros no período: {financial?.records_in_period ?? 0}
                </AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Metas ativas/concluídas: {financial?.goals_active ?? 0} / {financial?.goals_completed ?? 0}
                </AppText>
                <AppText className="text-slate-700 dark:text-slate-200 text-sm">
                  Aportes/Retiradas em metas: {Number(financial?.goal_deposit_volume ?? 0).toFixed(2)} / {Number(financial?.goal_withdraw_volume ?? 0).toFixed(2)}
                </AppText>
              </View>
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

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-2">Tendência de novos usuários</AppText>
              {users?.created_trend?.length ? (
                users.created_trend.slice(-7).map((item) => (
                  <View key={item.date} className="flex-row items-center justify-between py-1">
                    <AppText className="text-slate-600 dark:text-slate-200 text-xs">{item.date}</AppText>
                    <AppText className="text-slate-900 dark:text-slate-100 text-xs font-semibold">{item.count}</AppText>
                  </View>
                ))
              ) : (
                <AppText className="text-slate-500 dark:text-slate-200 text-sm">Sem novos cadastros no período.</AppText>
              )}
            </Card>
          </>
        )}

        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 flex-row items-center justify-center"
            onPress={() => navigation.navigate('Admin Usuarios')}
          >
            <ShieldCheck size={16} color="#0ea5e9" />
            <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-2">Usuários</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 flex-row items-center justify-center"
            onPress={() => void load(periodDays)}
          >
            <RefreshCw size={16} color="#f48c25" />
            <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-2">Atualizar</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Layout>
  );
};

export default AdminDashboard;
