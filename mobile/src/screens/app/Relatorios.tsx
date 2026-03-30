import React, { useCallback, useMemo, useState } from 'react';
import AppText from '../../components/AppText';
import { View, ActivityIndicator } from 'react-native';
import { ChartColumnIncreasing, ArrowUpCircle, ArrowDownCircle, WalletCards } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { getReportsSummary } from '../../services/reports';
import { trackAnalyticsEvent } from '../../services/analytics';

const formatCurrency = (value: string | number) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};

const monthLabel = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  const raw = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const Relatorios = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    income_total: '0',
    expense_total: '0',
    balance: '0',
    top_categories: [] as Array<{ category: string; total: string }>,
  });

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await getReportsSummary();
      setSummary({
        year: result.period.year,
        month: result.period.month,
        income_total: result.summary.income_total,
        expense_total: result.summary.expense_total,
        balance: result.summary.balance,
        top_categories: result.top_categories,
      });

      await trackAnalyticsEvent({
        event_name: 'reports_viewed',
        screen: 'Relatorios',
        metadata: {
          year: result.period.year,
          month: result.period.month,
          has_records: result.top_categories.length > 0,
        },
      });
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error ?? 'Não foi possível carregar os relatórios agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  const period = useMemo(() => monthLabel(summary.year, summary.month), [summary.year, summary.month]);

  return (
    <Layout scrollable contentContainerClassName="p-4 bg-[#f8f7f5] dark:bg-black pb-28">
      <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-bold mb-1">Relatórios</AppText>
      <AppText className="text-slate-500 dark:text-slate-300 mb-5">Resumo real das entradas e saídas de {period}.</AppText>

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#f48c25" />
          <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Carregando relatório...</AppText>
        </View>
      ) : null}

      {errorMessage ? (
        <Card className="mb-3" noPadding>
          <View className="p-4">
            <AppText className="text-red-700 dark:text-red-300 text-sm">{errorMessage}</AppText>
          </View>
        </Card>
      ) : null}

      <View className="flex-row gap-3 mb-3">
        <Card className="flex-1" noPadding>
          <View className="p-4">
            <ArrowUpCircle size={18} color="#10b981" />
            <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Entradas</AppText>
            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg">{formatCurrency(summary.income_total)}</AppText>
          </View>
        </Card>
        <Card className="flex-1" noPadding>
          <View className="p-4">
            <ArrowDownCircle size={18} color="#ef4444" />
            <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Saídas</AppText>
            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg">{formatCurrency(summary.expense_total)}</AppText>
          </View>
        </Card>
      </View>

      <Card className="mb-3" noPadding>
        <View className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <ChartColumnIncreasing size={18} color="#f48c25" />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold">Saldo do mês</AppText>
          </View>
          <AppText className="text-2xl text-slate-900 dark:text-slate-100 font-extrabold">{formatCurrency(summary.balance)}</AppText>
          <AppText className="text-xs text-slate-500 dark:text-slate-300 mt-1">Atualizado automaticamente pelo backend</AppText>
        </View>
      </Card>

      <Card noPadding>
        <View className="p-4">
          <View className="flex-row items-center gap-2 mb-2">
            <WalletCards size={18} color="#334155" />
            <AppText className="text-slate-900 dark:text-slate-100 font-bold">Principais categorias</AppText>
          </View>
          {summary.top_categories.length === 0 ? (
            <AppText className="text-slate-500 dark:text-slate-300 text-sm">Sem categorias de saída no período atual.</AppText>
          ) : (
            summary.top_categories.map((item) => (
              <View key={item.category} className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <AppText className="text-slate-600 dark:text-slate-300 text-sm">{item.category}</AppText>
                <AppText className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{formatCurrency(item.total)}</AppText>
              </View>
            ))
          )}
        </View>
      </Card>
    </Layout>
  );
};

export default Relatorios;
