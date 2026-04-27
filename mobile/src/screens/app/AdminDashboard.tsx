import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Calendar, LogOut, RefreshCw, Settings, ShieldCheck, TrendingUp, Users } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import DonutChart from '../../components/admin/DonutChart';
import { getAdminAnalyticsOverview } from '../../services/admin';
import { useThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AdminAnalyticsOverviewDto } from '../../types/admin';
import { isCompactDevice, textClampLines } from '../../utils/responsive';
import {
  fallbackNoData,
  formatCountSafe,
  formatPercentSafe,
  toFixedSafe,
  toFriendlyEventLabel,
  toFriendlyScreenLabel,
  toNumberSafe,
} from '../../utils/adminPresentation';

const PERIOD_OPTIONS = [7, 30, 90, 180] as const;

const StatRow = ({ label, value, valueClassName = 'text-slate-900 dark:text-slate-100 text-base font-black' }: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <View className="flex-row items-start justify-between">
    <AppText className="text-slate-600 dark:text-slate-200 text-sm flex-1 pr-3" numberOfLines={textClampLines('kpi_label')} ellipsizeMode="tail">
      {label}
    </AppText>
    <AppText className={`${valueClassName} text-right`} numberOfLines={textClampLines('kpi_value')} ellipsizeMode="tail">
      {value}
    </AppText>
  </View>
);

const AdminDashboard = ({ navigation }: any) => {
  const { darkMode } = useThemeMode();
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const compact = isCompactDevice(width);

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
      const message = err?.response?.data?.error ?? 'Não foi possível carregar os dados do painel.';
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
    const viewed = toNumberSafe(funnel?.onboarding_viewed);
    const completed = toNumberSafe(funnel?.onboarding_completed);
    const skipped = toNumberSafe(funnel?.onboarding_skipped);
    return Math.max(0, viewed - completed - skipped);
  }, [funnel?.onboarding_completed, funnel?.onboarding_skipped, funnel?.onboarding_viewed]);

  const averageRating = useMemo(() => {
    const avg = ratings?.averages;
    if (!avg) return 0;
    const values = [
      toNumberSafe(avg.usability),
      toNumberSafe(avg.helpfulness),
      toNumberSafe(avg.calendar),
      toNumberSafe(avg.alerts),
      toNumberSafe(avg.goals),
      toNumberSafe(avg.reports),
      toNumberSafe(avg.records),
    ];
    const valid = values.filter((value) => value > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((acc, value) => acc + value, 0) / valid.length;
  }, [ratings?.averages]);

  const activeUsers = toNumberSafe(users?.active);
  const inactiveUsers = toNumberSafe(users?.inactive);
  const totalUsers = toNumberSafe(users?.total);
  const totalEvents = toNumberSafe(appUsage?.total_events);
  const totalSessions = toNumberSafe(appUsage?.sessions);
  const loginsInPeriod = toNumberSafe(engagement?.logins_in_period);
  const activityRate = toNumberSafe(engagement?.activity_rate_pct);

  const topEvent = (appUsage?.top_events ?? [])[0];
  const topScreen = (appUsage?.top_screens ?? [])[0];

  const userHealthInsight =
    inactiveUsers > activeUsers * 0.25
      ? 'Atenção: existem muitas contas inativas. Vale avaliar uma ação de reativação.'
      : 'Bom sinal: a maior parte das contas está ativa no período.';

  const onboardingInsight =
    toNumberSafe(funnel?.onboarding_completed) < toNumberSafe(funnel?.onboarding_viewed) * 0.5
      ? 'Atenção: conclusão inicial baixa. Revise os primeiros passos do aplicativo.'
      : 'Bom sinal: a conclusão do início está consistente.';

  const ratingInsight =
    averageRating < 3.5
      ? 'Atenção: satisfação abaixo do esperado. Priorize melhorias de experiência.'
      : 'Bom sinal: satisfação dos usuários está estável no período.';

  return (
    <Layout contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-black" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
              Painel Administrativo
            </AppText>
            <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-0.5" numberOfLines={textClampLines('card')} ellipsizeMode="tail">
              Visão clara da operação para apoiar decisões administrativas.
            </AppText>
          </View>
          <TouchableOpacity
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] flex-row items-center self-start"
            onPress={() => void signOut()}
          >
            <LogOut size={14} color={darkMode ? '#e2e8f0' : '#334155'} />
            <AppText className="text-slate-700 dark:text-slate-200 text-xs ml-1">Sair</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 112 }}>
        <Card className="p-4 mb-3">
          <View className="flex-row flex-wrap items-start justify-between mb-3">
            <View className="flex-row items-center flex-1 min-w-[55%] pr-2">
              <Calendar size={16} color="#334155" />
              <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
                Período analisado
              </AppText>
            </View>
            <Button title="Atualizar" variant="outline" className="px-3 mt-2 min-w-[44%]" onPress={() => void load(periodDays)} />
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
              <AppText className="text-slate-900 dark:text-slate-100 font-bold text-base" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
                Panorama da operação
              </AppText>
              <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1" numberOfLines={textClampLines('card')} ellipsizeMode="tail">
                Saúde da base e engajamento no período selecionado.
              </AppText>
              <View className="mt-3 gap-3">
                <StatRow label="Contas totais" value={formatCountSafe(totalUsers)} />
                <StatRow label="Entradas no período" value={formatCountSafe(loginsInPeriod)} />
                <StatRow label="Taxa de engajamento" value={formatPercentSafe(activityRate)} valueClassName="text-emerald-700 dark:text-emerald-300 text-base font-black" />
              </View>
              <View className="mt-3 rounded-xl bg-slate-50 dark:bg-[#111827] px-3 py-2">
                <AppText className="text-slate-600 dark:text-slate-200 text-xs" numberOfLines={textClampLines('card')} ellipsizeMode="tail">
                  {userHealthInsight}
                </AppText>
              </View>
            </Card>

            <View className="mb-3 gap-3">
              <DonutChart
                title="Contas ativas e inativas"
                subtitle="Distribuição de contas ativas e inativas na base."
                centerLabel="Ativas"
                centerValue={formatCountSafe(activeUsers)}
                segments={[
                  { label: 'Ativas', value: activeUsers, color: '#16a34a' },
                  { label: 'Inativas', value: inactiveUsers, color: '#ef4444' },
                ]}
              />

              <DonutChart
                title="Adoção inicial"
                subtitle="Conversão do início de uso no período selecionado."
                centerLabel="Concluídas"
                centerValue={formatCountSafe(toNumberSafe(funnel?.onboarding_completed))}
                segments={[
                  { label: 'Concluídas', value: toNumberSafe(funnel?.onboarding_completed), color: '#0ea5e9' },
                  { label: 'Puladas', value: toNumberSafe(funnel?.onboarding_skipped), color: '#f59e0b' },
                  { label: 'Pendentes', value: onboardingPending, color: '#94a3b8' },
                ]}
              />

              <DonutChart
                title="Satisfação dos usuários"
                subtitle="Média consolidada das avaliações em uma escala de 0 a 5."
                centerLabel="Média geral"
                centerValue={toFixedSafe(averageRating, 2)}
                segments={[
                  { label: 'Média atual', value: averageRating, color: '#8b5cf6' },
                  { label: 'Distância até 5', value: Math.max(0, 5 - averageRating), color: '#cbd5e1' },
                ]}
              />
            </View>

            <Card className="p-4 mb-3">
              <View className="flex-row items-center">
                <TrendingUp size={16} color="#334155" />
                <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2 flex-1" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
                  Uso do aplicativo
                </AppText>
              </View>
              <View className="mt-3 gap-3">
                <StatRow label="Interações registradas" value={formatCountSafe(totalEvents)} valueClassName="text-slate-900 dark:text-slate-100 text-sm font-semibold" />
                <StatRow label="Sessões no período" value={formatCountSafe(totalSessions)} valueClassName="text-slate-900 dark:text-slate-100 text-sm font-semibold" />
                <StatRow label="Ação mais frequente" value={toFriendlyEventLabel(topEvent?.event_name)} valueClassName="text-slate-900 dark:text-slate-100 text-sm font-semibold max-w-[46%]" />
                <StatRow label="Tela mais visitada" value={toFriendlyScreenLabel(topScreen?.screen)} valueClassName="text-slate-900 dark:text-slate-100 text-sm font-semibold max-w-[46%]" />
              </View>
              <View className="mt-3 rounded-xl bg-slate-50 dark:bg-[#111827] px-3 py-2">
                <AppText className="text-slate-600 dark:text-slate-200 text-xs" numberOfLines={textClampLines('card')} ellipsizeMode="tail">
                  {onboardingInsight}
                </AppText>
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
                Avaliações
              </AppText>
              <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1" numberOfLines={textClampLines('card')} ellipsizeMode="tail">
                Percepção geral dos usuários e comentários recentes.
              </AppText>
              <View className="mt-3 gap-3">
                <StatRow label="Respostas coletadas" value={formatCountSafe(ratings?.total_responses)} />
                <StatRow label="Média consolidada" value={`${toFixedSafe(averageRating, 2)}/5`} />
              </View>

              <View className="mt-3 rounded-xl bg-slate-50 dark:bg-[#111827] px-3 py-2">
                <AppText className="text-slate-600 dark:text-slate-200 text-xs" numberOfLines={textClampLines('card')} ellipsizeMode="tail">
                  {ratingInsight}
                </AppText>
              </View>

              <View className="mt-3">
                <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold mb-2">Sugestões recentes</AppText>
                {suggestions.length === 0 ? (
                  <AppText className="text-slate-500 dark:text-slate-300 text-xs">{fallbackNoData}</AppText>
                ) : (
                  suggestions.map((item) => (
                    <View key={item.id} className="py-2 border-b border-slate-100 dark:border-slate-800">
                      <AppText className="text-slate-700 dark:text-slate-200 text-xs" numberOfLines={textClampLines('list')} ellipsizeMode="tail">
                        {item.suggestion || fallbackNoData}
                      </AppText>
                    </View>
                  ))
                )}
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <View className="flex-row items-center">
                <Users size={16} color="#334155" />
                <AppText className="text-slate-900 dark:text-slate-100 font-bold ml-2 flex-1" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
                  Ações rápidas
                </AppText>
              </View>
              <View className="flex-row flex-wrap gap-2 mt-3">
                <TouchableOpacity
                  className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 flex-row items-center justify-center ${compact ? 'w-full' : 'flex-1 min-w-[46%]'}`}
                  onPress={() => navigation.navigate('Admin Usuarios')}
                >
                  <ShieldCheck size={16} color="#0ea5e9" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-2 flex-1 text-center" numberOfLines={textClampLines('list')} ellipsizeMode="tail">
                    Gerenciar usuários
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 flex-row items-center justify-center ${compact ? 'w-full' : 'flex-1 min-w-[46%]'}`}
                  onPress={() => void load(periodDays)}
                >
                  <RefreshCw size={16} color="#f48c25" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-2 flex-1 text-center" numberOfLines={textClampLines('list')} ellipsizeMode="tail">
                    Recarregar painel
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-3 flex-row items-center justify-center"
                  onPress={() => navigation.navigate('Admin Aparencia')}
                >
                  <Settings size={16} color="#334155" />
                  <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold ml-2 flex-1 text-center" numberOfLines={textClampLines('list')} ellipsizeMode="tail">
                    Aparência e acessibilidade
                  </AppText>
                </TouchableOpacity>
              </View>
            </Card>

            <Card className="p-4 mb-3">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-2" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
                Tendência de novas contas
              </AppText>
              {createdTrendLast7.length ? (
                createdTrendLast7.map((item) => (
                  <StatRow key={item.date} label={item.date || fallbackNoData} value={formatCountSafe(item.count)} valueClassName="text-slate-900 dark:text-slate-100 text-xs font-semibold" />
                ))
              ) : (
                <AppText className="text-slate-500 dark:text-slate-300 text-sm">{fallbackNoData}</AppText>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Layout>
  );
};

export default AdminDashboard;
