import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { Calendar, LogOut, RefreshCw, ShieldCheck, TrendingUp, Users } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import DonutChart from '../../components/admin/DonutChart';
import { getAdminAnalyticsOverview } from '../../services/admin';
import { useThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AdminAnalyticsOverviewDto } from '../../types/admin';

const PERIOD_OPTIONS = [7, 30, 90, 180] as const;

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toFixedSafe = (value: unknown, digits = 2): string => toNumber(value).toFixed(digits);

const toPercentSafe = (value: unknown): string => `${toFixedSafe(value, 2)}%`;

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
      const message = err?.response?.data?.error ?? 'Nao foi possivel carregar metricas administrativas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(30);
  }, []);

  const users = overview?.users;
  const engagement = overview?.engagement;
  const appUsage = overview?.app_usage;
  const funnel = overview?.onboarding_tutorial_funnel;
  const ratings = overview?.app_ratings;

  const createdTrendLast7 = useMemo(() => (users?.created_trend ?? []).slice(-7), [users?.created_trend]);

  const suggestions = useMemo(
    () => (ratings?.recent_suggestions?.items ?? []).slice(0, 3),
    [ratings?.recent_suggestions?.items]
  );

  const onboardingPending = useMemo(() => {
    const viewed = toNumber(funnel?.onboarding_viewed);
    const completed = toNumber(funnel?.onboarding_completed);
    const skipped = toNumber(funnel?.onboarding_skipped);
    return Math.max(0, viewed - completed - skipped);
  }, [funnel?.onboarding_completed, funnel?.onboarding_skipped, funnel?.onboarding_viewed]);

  const averageRating = useMemo(() => {
    const avg = ratings?.averages;
    if (!avg) return 0;
    const values = [
      toNumber(avg.usability),
      toNumber(avg.helpfulness),
      toNumber(avg.calendar),
      toNumber(avg.alerts),
      toNumber(avg.goals),
      toNumber(avg.reports),
      toNumber(avg.records),
    ];
    const valid = values.filter((value) => value > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((acc, value) => acc + value, 0) / valid.length;
  }, [ratings?.averages]);

  const activeUsers = toNumber(users?.active);
  const inactiveUsers = toNumber(users?.inactive);
  const totalUsers = toNumber(users?.total);
  const totalEvents = toNumber(appUsage?.total_events);
  const totalSessions = toNumber(appUsage?.sessions);
  const loginsInPeriod = toNumber(engagement?.logins_in_period);
  const activityRate = toNumber(engagement?.activity_rate_pct);

  const topEvent = (appUsage?.top_events ?? [])[0];
  const topScreen = (appUsage?.top_screens ?? [])[0];

  const userHealthInsight =
    inactiveUsers > activeUsers * 0.25
      ? 'Atencao: base com taxa de inatividade elevada. Planeje reativacao.'
      : 'Bom sinal: maioria da base permanece ativa no periodo.';

  const onboardingInsight =
    toNumber(funnel?.onboarding_completed) < toNumber(funnel?.onboarding_viewed) * 0.5
      ? 'Atencao: conclusao do onboarding baixa. Revise passos iniciais.'
      : 'Bom sinal: onboarding com conversao saudavel.';

  const ratingInsight =
    averageRating < 3.5
      ? 'Atencao: satisfacao geral abaixo do esperado. Priorize pontos de atrito.'
      : 'Bom sinal: satisfacao dos usuarios consistente no periodo.';

  return (
    <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-black">Painel Administrativo</AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs">
              Visao executiva para acompanhamento da saude do aplicativo.
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
              <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Periodo analisado</AppText>
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
              <AppText className="text-slate-900 dark:text-slate-100 font-bold text-base">Visao geral</AppText>
              <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">
                Saude da base e adocao no periodo selecionado.
              </AppText>
              <View className="mt-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Contas totais</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-lg font-black">{totalUsers}</AppText>
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Logins no periodo</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-lg font-black">{loginsInPeriod}</AppText>
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Taxa de atividade</AppText>
                  <AppText className="text-emerald-700 dark:text-emerald-300 text-lg font-black">{toPercentSafe(activityRate)}</AppText>
                </View>
              </View>
              <View className="mt-3 rounded-xl bg-slate-50 dark:bg-[#111827] px-3 py-2">
                <AppText className="text-slate-600 dark:text-slate-200 text-xs">{userHealthInsight}</AppText>
              </View>
            </Card>

            <View className="mb-3 gap-3">
              <DonutChart
                title="Usuarios e atividade"
                subtitle="Ativos x inativos na base atual."
                centerLabel="Ativos"
                centerValue={String(activeUsers)}
                segments={[
                  { label: 'Ativos', value: activeUsers, color: '#16a34a' },
                  { label: 'Inativos', value: inactiveUsers, color: '#ef4444' },
                ]}
              />

              <DonutChart
                title="Funil de onboarding"
                subtitle="Conversao da adocao inicial no periodo."
                centerLabel="Concluidos"
                centerValue={String(toNumber(funnel?.onboarding_completed))}
                segments={[
                  { label: 'Concluidos', value: toNumber(funnel?.onboarding_completed), color: '#0ea5e9' },
                  { label: 'Pulados', value: toNumber(funnel?.onboarding_skipped), color: '#f59e0b' },
                  { label: 'Pendentes', value: onboardingPending, color: '#94a3b8' },
                ]}
              />

              <DonutChart
                title="Satisfacao dos usuarios"
                subtitle="Media consolidada das avaliacoes (0 a 5)."
                centerLabel="Media geral"
                centerValue={toFixedSafe(averageRating, 2)}
                segments={[
                  { label: 'Media', value: averageRating, color: '#8b5cf6' },
                  { label: 'Gap ate 5', value: Math.max(0, 5 - averageRating), color: '#cbd5e1' },
                ]}
              />
            </View>

            <Card className="p-4 mb-3">
              <View className="flex-row items-center">
                <TrendingUp size={16} color="#334155" />
                <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Usuarios e atividade</AppText>
              </View>
              <View className="mt-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Eventos de uso</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{totalEvents}</AppText>
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Sessoes no periodo</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{totalSessions}</AppText>
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Evento mais frequente</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold">
                    {topEvent?.event_name || 'Sem dados'}
                  </AppText>
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Tela mais acessada</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold">
                    {topScreen?.screen || 'Sem dados'}
                  </AppText>
                </View>
              </View>
              <View className="mt-3 rounded-xl bg-slate-50 dark:bg-[#111827] px-3 py-2">
                <AppText className="text-slate-600 dark:text-slate-200 text-xs">
                  {onboardingInsight}
                </AppText>
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold">Avaliacoes</AppText>
              <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">
                Percepcao geral dos usuarios e feedback recente.
              </AppText>
              <View className="mt-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Respostas coletadas</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-base font-black">
                    {toNumber(ratings?.total_responses)}
                  </AppText>
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm">Media consolidada</AppText>
                  <AppText className="text-slate-900 dark:text-slate-100 text-base font-black">{toFixedSafe(averageRating, 2)}/5</AppText>
                </View>
              </View>

              <View className="mt-3 rounded-xl bg-slate-50 dark:bg-[#111827] px-3 py-2">
                <AppText className="text-slate-600 dark:text-slate-200 text-xs">{ratingInsight}</AppText>
              </View>

              <View className="mt-3">
                <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold mb-2">Sugestoes recentes</AppText>
                {suggestions.length === 0 ? (
                  <AppText className="text-slate-500 dark:text-slate-300 text-xs">Sem comentarios no periodo.</AppText>
                ) : (
                  suggestions.map((item) => (
                    <View key={item.id} className="py-2 border-b border-slate-100 dark:border-slate-800">
                      <AppText className="text-slate-700 dark:text-slate-200 text-xs">{item.suggestion}</AppText>
                    </View>
                  ))
                )}
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <View className="flex-row items-center">
                <Users size={16} color="#334155" />
                <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2">Acoes rapidas</AppText>
              </View>
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 flex-row items-center justify-center"
                  onPress={() => navigation.navigate('Admin Usuarios')}
                >
                  <ShieldCheck size={16} color="#0ea5e9" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-2">Gerenciar usuarios</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 flex-row items-center justify-center"
                  onPress={() => void load(periodDays)}
                >
                  <RefreshCw size={16} color="#f48c25" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-2">Recarregar painel</AppText>
                </TouchableOpacity>
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-2">Tendencia de novos usuarios</AppText>
              {createdTrendLast7.length ? (
                createdTrendLast7.map((item) => (
                  <View key={item.date} className="flex-row items-center justify-between py-1">
                    <AppText className="text-slate-600 dark:text-slate-200 text-xs">{item.date}</AppText>
                    <AppText className="text-slate-900 dark:text-slate-100 text-xs font-semibold">{toNumber(item.count)}</AppText>
                  </View>
                ))
              ) : (
                <AppText className="text-slate-500 dark:text-slate-300 text-sm">Sem novos cadastros no periodo.</AppText>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Layout>
  );
};

export default AdminDashboard;

