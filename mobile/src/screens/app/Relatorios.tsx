import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { ArrowDownCircle, ArrowUpCircle, Calendar, ChevronLeft, ChevronRight, Filter, Scale, Wallet, X } from 'lucide-react-native';
import Layout from '../../components/Layout';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import {
  getCachedReportsSummary,
  getReportsSummary,
  isReportsCacheStaleSoon,
  prefetchAdjacentReportsSummary,
} from '../../services/reports';
import { trackAnalyticsEventDeferred } from '../../services/analytics';
import { markPerf, measurePerf } from '../../services/perf';
import { ReportFlowFilter, ReportsSummaryDto, ReportStatusFilter } from '../../types/report';
import { useThemeMode } from '../../context/ThemeContext';

type DetailsTab = 'records' | 'categories';
type PickerMode = 'month' | 'year';
type TrendPoint = ReportsSummaryDto['monthly_trend'][number];

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const emptyData: ReportsSummaryDto = {
  global_indicators: { settled_balance_total: '0', pending_income_total: '0', pending_expense_total: '0', projected_balance_total: '0' },
  period_indicators: { settled_balance_total: '0', pending_income_total: '0', pending_expense_total: '0', projected_balance_total: '0' },
  monthly_summary: { income_total: '0', expense_total: '0', balance: '0', records_count: 0 },
  monthly_trend: [],
  categories_breakdown: [],
  detailed_records: [],
  available_categories: [],
  filters: { status: 'all', flow_type: 'all', category: null },
  period: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  summary: { income_total: '0', expense_total: '0', balance: '0' },
  top_categories: [],
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const monthLabel = (date: Date) => {
  const raw = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};
const dateBr = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const shortMonth = (year: number, month: number) => `${monthNames[Math.min(11, Math.max(0, month - 1))]}/${String(year).slice(-2)}`;
const trendKey = (item: TrendPoint) => `${item.year}-${item.month}`;
const trendLabel = (item: TrendPoint) => {
  const raw = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(item.year, item.month - 1, 1));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const LegendPill = ({ color, label }: { color: string; label: string }) => (
  <View className="flex-row items-center rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 mr-2 mb-2">
    <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: color }} />
    <AppText className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">{label}</AppText>
  </View>
);

const TrendChart = React.memo(({
  items,
  darkMode,
  width,
  selectedKey,
  onSelect,
}: {
  items: ReportsSummaryDto['monthly_trend'];
  darkMode: boolean;
  width: number;
  selectedKey: string | null;
  onSelect: (item: TrendPoint) => void;
}) => {
  if (items.length === 0) return null;

  const height = 188;
  const baseline = 136;
  const chartTop = 14;
  const chartBottom = 26;
  const groupWidth = width / items.length;
  const barWidth = Math.max(8, Math.min(14, groupWidth * 0.22));
  const maxValue = Math.max(1, ...items.map((x) => Math.max(Number(x.income_total || 0), Number(x.expense_total || 0))));
  const labelColor = darkMode ? '#94a3b8' : '#64748b';
  const axisColor = darkMode ? '#334155' : '#cbd5e1';
  const selectedBg = darkMode ? '#1e293b' : '#fff7ed';
  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={baseline} x2={width} y2={baseline} stroke={axisColor} strokeWidth={1} />
      {items.map((item, index) => {
        const incomeHeight = (Number(item.income_total || 0) / maxValue) * (baseline - chartTop - 8);
        const expenseHeight = (Number(item.expense_total || 0) / maxValue) * (baseline - chartTop - 8);
        const gx = index * groupWidth;
        const incomeX = gx + groupWidth * 0.24;
        const expenseX = gx + groupWidth * 0.54;
        const isSelected = selectedKey === trendKey(item);

        return (
          <React.Fragment key={trendKey(item)}>
            {isSelected ? (
              <Rect
                x={gx + 2}
                y={chartTop}
                width={Math.max(groupWidth - 4, 10)}
                height={baseline - chartTop + chartBottom - 2}
                rx={8}
                fill={selectedBg}
              />
            ) : null}
            <Rect
              x={incomeX}
              y={baseline - incomeHeight}
              width={barWidth}
              height={incomeHeight}
              rx={2}
              fill="#16a34a"
              opacity={isSelected ? 1 : 0.78}
            />
            <Rect
              x={expenseX}
              y={baseline - expenseHeight}
              width={barWidth}
              height={expenseHeight}
              rx={2}
              fill="#f48c25"
              opacity={isSelected ? 1 : 0.78}
            />
            <SvgText x={gx + groupWidth / 2} y={165} textAnchor="middle" fontSize="10" fill={labelColor}>{shortMonth(item.year, item.month)}</SvgText>
            <Rect
              x={gx}
              y={chartTop}
              width={groupWidth}
              height={baseline - chartTop + chartBottom}
              fill="transparent"
              onPress={() => onSelect(item)}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
});

const IndicatorsGrid = React.memo(({ data }: { data: ReportsSummaryDto['period_indicators'] }) => (
  <>
    <View className="flex-row gap-3 mb-3">
      <Card className="flex-1" noPadding><View className="p-4"><Wallet size={18} color="#16a34a" /><AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Saldo quitado no período</AppText><AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg">{formatCurrency(data.settled_balance_total)}</AppText></View></Card>
      <Card className="flex-1" noPadding><View className="p-4"><Scale size={18} color="#0ea5e9" /><AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Projeção no período</AppText><AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg">{formatCurrency(data.projected_balance_total)}</AppText></View></Card>
    </View>

    <View className="flex-row gap-3 mb-3">
      <Card className="flex-1" noPadding><View className="p-4"><ArrowUpCircle size={18} color="#16a34a" /><AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Pendente a receber</AppText><AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg">{formatCurrency(data.pending_income_total)}</AppText></View></Card>
      <Card className="flex-1" noPadding><View className="p-4"><ArrowDownCircle size={18} color="#ef4444" /><AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Pendente a pagar</AppText><AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg">{formatCurrency(data.pending_expense_total)}</AppText></View></Card>
    </View>
  </>
));

const IndicatorsShimmer = React.memo(() => (
  <>
    <View className="flex-row gap-3 mb-3">
      <Card className="flex-1" noPadding><View className="p-4"><LoadingSkeleton rows={2} height={12} /></View></Card>
      <Card className="flex-1" noPadding><View className="p-4"><LoadingSkeleton rows={2} height={12} /></View></Card>
    </View>
    <View className="flex-row gap-3 mb-3">
      <Card className="flex-1" noPadding><View className="p-4"><LoadingSkeleton rows={2} height={12} /></View></Card>
      <Card className="flex-1" noPadding><View className="p-4"><LoadingSkeleton rows={2} height={12} /></View></Card>
    </View>
  </>
));

const Relatorios = () => {
  const { darkMode } = useThemeMode();
  const { width: screenWidth } = useWindowDimensions();
  const [monthRef, setMonthRef] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [status, setStatus] = useState<ReportStatusFilter>('all');
  const [flowType, setFlowType] = useState<ReportFlowFilter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [data, setData] = useState<ReportsSummaryDto>(emptyData);
  const [loading, setLoading] = useState(false);
  const [isRefreshingPeriod, setIsRefreshingPeriod] = useState(false);
  const [error, setError] = useState('');
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>('month');
  const [pickerYear, setPickerYear] = useState(monthRef.getFullYear());
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [tab, setTab] = useState<DetailsTab>('records');
  const [selectedTrendKey, setSelectedTrendKey] = useState<string | null>(null);
  const hasVisibleDataRef = useRef(false);

  const yearOptions = useMemo(() => Array.from({ length: 9 }, (_, idx) => monthRef.getFullYear() - 4 + idx), [monthRef]);
  const hasFilter = status !== 'all' || flowType !== 'all' || !!category;
  const chartWidth = useMemo(() => Math.max(260, Math.min(screenWidth - 88, 560)), [screenWidth]);
  const activeFilters = useMemo(() => ({
    year: monthRef.getFullYear(),
    month: monthRef.getMonth() + 1,
    status,
    flow_type: flowType,
    category,
  }), [category, flowType, monthRef, status]);
  const hasVisibleData = data.monthly_summary.records_count > 0 || data.monthly_trend.length > 0;
  const isInitialEmptyLoading = loading && !hasVisibleData;

  useEffect(() => {
    hasVisibleDataRef.current = hasVisibleData;
  }, [hasVisibleData]);

  const load = useCallback(async (mode: 'initial_load' | 'month_change' | 'background_revalidate') => {
    markPerf('reports_focus_to_content');
    const canShowFullLoading = mode === 'initial_load';
    const shouldShowInline = mode === 'month_change' || mode === 'background_revalidate';

    if (canShowFullLoading) {
      setLoading(true);
    }
    if (shouldShowInline) {
      setIsRefreshingPeriod(true);
    }
    if (mode !== 'background_revalidate') {
      setError('');
    }
    try {
      const result = await getReportsSummary(activeFilters, { force: mode === 'background_revalidate' });
      setData(result);
      trackAnalyticsEventDeferred({
        event_name: 'reports_viewed',
        screen: 'Relatorios',
        metadata: { year: result.period.year, month: result.period.month, status, flow_type: flowType, has_category: !!category },
      });
      void prefetchAdjacentReportsSummary(activeFilters);
    } catch (e: any) {
      if (mode !== 'background_revalidate') {
        setError(e?.response?.data?.error ?? 'Não foi possível carregar os Relatórios agora.');
      }
    } finally {
      if (canShowFullLoading) {
        setLoading(false);
      }
      if (shouldShowInline) {
        setIsRefreshingPeriod(false);
      }
      measurePerf('reports_focus_to_content', 'Reports focus -> content');
    }
  }, [activeFilters, category, flowType, status]);

  useFocusEffect(
    useCallback(() => {
      const cached = getCachedReportsSummary(activeFilters);
      if (cached) {
        setData(cached);
        void prefetchAdjacentReportsSummary(activeFilters);
        if (!isReportsCacheStaleSoon(activeFilters)) {
          return undefined;
        }
        const refreshTimer = setTimeout(() => {
          void load('background_revalidate');
        }, 0);
        return () => clearTimeout(refreshTimer);
      }

      void load(hasVisibleDataRef.current ? 'month_change' : 'initial_load');
      return undefined;
    }, [activeFilters, load])
  );

  useEffect(() => {
    if (!category) return;
    if (data.available_categories.includes(category)) return;
    setCategory(null);
  }, [category, data.available_categories]);

  useEffect(() => {
    if (!data.monthly_trend.length) {
      setSelectedTrendKey(null);
      return;
    }

    const hasSelected = selectedTrendKey && data.monthly_trend.some((item) => trendKey(item) === selectedTrendKey);
    if (hasSelected) return;
    setSelectedTrendKey(trendKey(data.monthly_trend[data.monthly_trend.length - 1]));
  }, [data.monthly_trend, selectedTrendKey]);

  const selectedTrend = useMemo(
    () => data.monthly_trend.find((item) => trendKey(item) === selectedTrendKey) ?? null,
    [data.monthly_trend, selectedTrendKey]
  );

  const changeMonth = (delta: number) => setMonthRef((p) => new Date(p.getFullYear(), p.getMonth() + delta, 1));
  const today = () => { const now = new Date(); setMonthRef(new Date(now.getFullYear(), now.getMonth(), 1)); };
  const clearFilters = () => { setStatus('all'); setFlowType('all'); setCategory(null); };

  return (
    <>
      <Layout scrollable contentContainerClassName="p-4 bg-[#f8f7f5] dark:bg-black pb-28">
        <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-bold mb-1">Relatórios</AppText>
        <AppText className="text-slate-500 dark:text-slate-300 mb-4">Indicadores gerais, filtros rápidos e detalhamento mensal.</AppText>

        <Card className="mb-3" noPadding><View className="p-4">
          <View className="flex-row items-center justify-between mb-1">
            <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => changeMonth(-1)}><ChevronLeft size={16} color={darkMode ? '#e2e8f0' : '#1f2937'} /></TouchableOpacity>
            <TouchableOpacity className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" onPress={() => { setPickerYear(monthRef.getFullYear()); setPickerMode('month'); setShowPeriodPicker(true); }}>
              <AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">{monthLabel(monthRef)}</AppText>
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity className="px-3 py-2 rounded-full bg-primary/10 border border-primary/20" onPress={today}><AppText className="text-primary text-xs font-bold">Hoje</AppText></TouchableOpacity>
              <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => changeMonth(1)}><ChevronRight size={16} color={darkMode ? '#e2e8f0' : '#1f2937'} /></TouchableOpacity>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <AppText className="text-xs text-slate-500 dark:text-slate-300">Competência por vencimento.</AppText>
            {isRefreshingPeriod ? (
              <View className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                <AppText className="text-primary text-[10px] font-bold uppercase">Atualizando...</AppText>
              </View>
            ) : null}
          </View>
        </View></Card>

        {isRefreshingPeriod ? <IndicatorsShimmer /> : <IndicatorsGrid data={data.period_indicators} />}

        <Card className="mb-3" noPadding><View className="p-4">
          <View className="flex-row items-center gap-2 mb-2"><Calendar size={18} color="#f48c25" /><AppText className="text-slate-900 dark:text-slate-100 font-bold">Saldo mensal com filtros</AppText></View>
          <AppText className="text-2xl text-slate-900 dark:text-slate-100 font-extrabold">{formatCurrency(data.monthly_summary.balance)}</AppText>
          <AppText className="text-xs text-slate-500 dark:text-slate-300 mt-1">Entradas: {formatCurrency(data.monthly_summary.income_total)} | Saídas: {formatCurrency(data.monthly_summary.expense_total)}</AppText>
          <AppText className="text-xs text-slate-500 dark:text-slate-300 mt-1">{data.monthly_summary.records_count} registros</AppText>
        </View></Card>

        <Card className="mb-3" noPadding><View className="p-4">
          <View className="flex-row items-center gap-2 mb-3"><Filter size={16} color="#f48c25" /><AppText className="text-slate-900 dark:text-slate-100 font-bold">Filtros</AppText></View>
          <View className="flex-row flex-wrap gap-2 mb-2">
            <TouchableOpacity className={`px-3 py-2 rounded-full border ${status === 'all' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setStatus('all')}><AppText className={`text-xs font-bold ${status === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Todos</AppText></TouchableOpacity>
            <TouchableOpacity className={`px-3 py-2 rounded-full border ${status === 'pending' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setStatus('pending')}><AppText className={`text-xs font-bold ${status === 'pending' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Pendentes</AppText></TouchableOpacity>
            <TouchableOpacity className={`px-3 py-2 rounded-full border ${status === 'completed' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setStatus('completed')}><AppText className={`text-xs font-bold ${status === 'completed' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Concluídos</AppText></TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2 mb-3">
            <TouchableOpacity className={`px-3 py-2 rounded-full border ${flowType === 'all' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setFlowType('all')}><AppText className={`text-xs font-bold ${flowType === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Todos os tipos</AppText></TouchableOpacity>
            <TouchableOpacity className={`px-3 py-2 rounded-full border ${flowType === 'income' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setFlowType('income')}><AppText className={`text-xs font-bold ${flowType === 'income' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Entradas</AppText></TouchableOpacity>
            <TouchableOpacity className={`px-3 py-2 rounded-full border ${flowType === 'expense' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setFlowType('expense')}><AppText className={`text-xs font-bold ${flowType === 'expense' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Saídas</AppText></TouchableOpacity>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 justify-center" onPress={() => setShowCategoryPicker(true)}>
              <AppText className="text-slate-700 dark:text-slate-200 text-sm">{category || 'Todas as categorias'}</AppText>
            </TouchableOpacity>
            <TouchableOpacity className={`ml-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center ${hasFilter ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'}`} onPress={clearFilters}>
              <AppText className="text-slate-700 dark:text-slate-200 text-xs font-bold">Limpar</AppText>
            </TouchableOpacity>
          </View>
        </View></Card>

        {isInitialEmptyLoading ? (
          <View className="py-2">
            <Card className="mb-3" noPadding>
              <View className="p-4">
                <LoadingSkeleton rows={3} height={16} />
              </View>
            </Card>
            <View className="items-center py-4">
              <ActivityIndicator color="#f48c25" />
              <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Atualizando dados...</AppText>
            </View>
          </View>
        ) : null}
        {error ? <Card className="mb-3" noPadding><View className="p-4"><AppText className="text-red-700 dark:text-red-300 text-sm">{error}</AppText><TouchableOpacity onPress={() => void load('initial_load')} className="mt-3 self-start px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"><AppText className="text-primary text-xs font-bold">Tentar novamente</AppText></TouchableOpacity></View></Card> : null}

        {!isInitialEmptyLoading && !error ? (
          <>
            <Card className="mb-3" noPadding><View className="p-4">
              <AppText className="text-slate-900 dark:text-slate-100 font-bold mb-2">Tendência dos últimos 6 meses</AppText>
              {data.monthly_trend.length === 0 ? (
                <AppText className="text-slate-500 dark:text-slate-300 text-sm">Sem dados para o gráfico de tendência.</AppText>
              ) : (
                <>
                  <View className="items-center">
                    <TrendChart
                      items={data.monthly_trend}
                      darkMode={darkMode}
                      width={chartWidth}
                      selectedKey={selectedTrendKey}
                      onSelect={(item) => setSelectedTrendKey(trendKey(item))}
                    />
                  </View>
                  <View className="flex-row flex-wrap mt-2">
                    <LegendPill color="#16a34a" label="Entradas" />
                    <LegendPill color="#f48c25" label="Saídas" />
                  </View>
                  {selectedTrend ? (
                    <View className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] p-3 mt-2">
                      <AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">{trendLabel(selectedTrend)}</AppText>
                      <AppText className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                        Entradas: <AppText className="font-bold text-emerald-600">{formatCurrency(selectedTrend.income_total)}</AppText>
                      </AppText>
                      <AppText className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                        Saídas: <AppText className="font-bold text-primary">{formatCurrency(selectedTrend.expense_total)}</AppText>
                      </AppText>
                      <AppText className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                        Saldo: <AppText className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(selectedTrend.balance)}</AppText>
                      </AppText>
                    </View>
                  ) : null}
                </>
              )}
            </View></Card>

            <Card className="mb-3" noPadding><View className="p-4">
              <View className="flex-row gap-2 mb-3">
                <TouchableOpacity className={`flex-1 h-10 rounded-xl border items-center justify-center ${tab === 'records' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setTab('records')}><AppText className={`font-bold text-sm ${tab === 'records' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Lançamentos</AppText></TouchableOpacity>
                <TouchableOpacity className={`flex-1 h-10 rounded-xl border items-center justify-center ${tab === 'categories' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setTab('categories')}><AppText className={`font-bold text-sm ${tab === 'categories' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Categorias</AppText></TouchableOpacity>
              </View>
              {data.monthly_summary.records_count === 0 ? <View className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-slate-800 p-3"><AppText className="text-slate-600 dark:text-slate-300 text-sm">Não existem dados para os filtros selecionados.</AppText></View> : null}

              {data.monthly_summary.records_count > 0 && tab === 'records' ? (
                data.detailed_records.map((item) => (
                  <View key={item.id} className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-slate-800 p-3 mb-2">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">{item.title}</AppText>
                        <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">{item.category || 'Sem categoria'} | {dateBr(item.due_date)}</AppText>
                      </View>
                      <View className="items-end"><AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">{formatCurrency(item.amount)}</AppText><AppText className={`text-[10px] font-bold uppercase ${item.status === 'pending' ? 'text-primary' : 'text-teal-500'}`}>{item.status === 'pending' ? 'Pendente' : item.status === 'received' ? 'Recebido' : 'Pago'}</AppText></View>
                    </View>
                  </View>
                ))
              ) : null}

              {data.monthly_summary.records_count > 0 && tab === 'categories' ? (
                data.categories_breakdown.map((item, idx) => (
                  <View key={`${item.category}-${idx}`} className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-slate-800 p-3 mb-2">
                    <View className="flex-row items-center justify-between"><AppText className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{item.category}</AppText><AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">{formatCurrency(item.total)}</AppText></View>
                    <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">{item.percentage.toFixed(1)}%</AppText>
                    <View className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1"><View className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }} /></View>
                  </View>
                ))
              ) : null}
            </View></Card>
          </>
        ) : null}
      </Layout>

      <Modal visible={showCategoryPicker} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowCategoryPicker(false)}>
        <View className="flex-1 items-center justify-center px-4"><Pressable className="absolute inset-0 bg-black/35" onPress={() => setShowCategoryPicker(false)} />
          <View className="w-full max-w-[420px] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700">
            <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between"><AppText className="text-slate-900 dark:text-slate-100 font-bold">Selecionar categoria</AppText><TouchableOpacity onPress={() => setShowCategoryPicker(false)} className="p-1"><X size={18} color="#64748b" /></TouchableOpacity></View>
            <ScrollView className="max-h-[360px]" contentContainerStyle={{ padding: 12 }}>
              <TouchableOpacity onPress={() => { setCategory(null); setShowCategoryPicker(false); }} className={`px-3 py-3 rounded-xl border mb-2 ${!category ? 'bg-primary/10 border-primary/30' : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800'}`}><AppText className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Todas as categorias</AppText></TouchableOpacity>
              {data.available_categories.map((item) => <TouchableOpacity key={item} onPress={() => { setCategory(item); setShowCategoryPicker(false); }} className={`px-3 py-3 rounded-xl border mb-2 ${category === item ? 'bg-primary/10 border-primary/30' : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800'}`}><AppText className="text-slate-800 dark:text-slate-200 font-semibold text-sm">{item}</AppText></TouchableOpacity>)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPeriodPicker} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowPeriodPicker(false)}>
        <View className="flex-1 items-center justify-center px-4"><Pressable className="absolute inset-0 bg-black/35" onPress={() => setShowPeriodPicker(false)} />
          <View className="w-full max-w-[420px] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <View className="flex-row items-center justify-between mb-3"><AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Navegar por período</AppText><TouchableOpacity className="p-1" onPress={() => setShowPeriodPicker(false)}><X size={18} color="#64748b" /></TouchableOpacity></View>
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity className={`flex-1 h-10 rounded-xl items-center justify-center border ${pickerMode === 'month' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setPickerMode('month')}><AppText className={`font-bold text-sm ${pickerMode === 'month' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Meses</AppText></TouchableOpacity>
              <TouchableOpacity className={`flex-1 h-10 rounded-xl items-center justify-center border ${pickerMode === 'year' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => setPickerMode('year')}><AppText className={`font-bold text-sm ${pickerMode === 'year' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Anos</AppText></TouchableOpacity>
            </View>
            {pickerMode === 'month' ? (
              <>
                <View className="flex-row items-center justify-between mb-3"><TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerYear((x) => x - 1)}><ChevronLeft size={14} color={darkMode ? '#e2e8f0' : '#334155'} /></TouchableOpacity><AppText className="text-slate-900 dark:text-slate-100 font-bold">{pickerYear}</AppText><TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerYear((x) => x + 1)}><ChevronRight size={14} color={darkMode ? '#e2e8f0' : '#334155'} /></TouchableOpacity></View>
                <View className="flex-row flex-wrap justify-between">{monthNames.map((label, idx) => { const active = monthRef.getFullYear() === pickerYear && monthRef.getMonth() === idx; return <TouchableOpacity key={label} className={`w-[31%] mb-2 h-10 rounded-xl items-center justify-center border ${active ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => { setMonthRef(new Date(pickerYear, idx, 1)); setShowPeriodPicker(false); }}><AppText className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{label}</AppText></TouchableOpacity>; })}</View>
              </>
            ) : (
              <View className="flex-row flex-wrap justify-between">{yearOptions.map((year) => { const active = monthRef.getFullYear() === year; return <TouchableOpacity key={year} className={`w-[31%] mb-2 h-10 rounded-xl items-center justify-center border ${active ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`} onPress={() => { setPickerYear(year); setMonthRef((p) => new Date(year, p.getMonth(), 1)); setPickerMode('month'); }}><AppText className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{year}</AppText></TouchableOpacity>; })}</View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Relatorios;

