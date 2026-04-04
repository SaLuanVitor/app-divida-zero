import api from './api';
import { ReportsSummaryDto, ReportsSummaryFilters } from '../types/report';

const DEFAULT_TTL_MS = 30000;
const PREFETCH_TTL_MS = 60000;
const STALE_SOON_THRESHOLD_MS = 5000;

type CacheOptions = {
  force?: boolean;
  ttlMs?: number;
};

const reportsCache = new Map<string, { expiresAt: number; value: ReportsSummaryDto }>();
const reportsInFlight = new Map<string, Promise<ReportsSummaryDto>>();
const shouldLogPerf = __DEV__;

const isValid = (expiresAt: number) => Date.now() < expiresAt;

const toKey = (filters: ReportsSummaryFilters) => JSON.stringify({
  year: filters.year ?? null,
  month: filters.month ?? null,
  status: filters.status ?? 'all',
  flow_type: filters.flow_type ?? 'all',
  category: filters.category ?? null,
});

const buildAdjacentPeriods = (filters: ReportsSummaryFilters) => {
  const year = filters.year;
  const month = filters.month;
  if (typeof year !== 'number' || typeof month !== 'number') return [];

  const anchor = new Date(year, month - 1, 1);
  const prev = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const next = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const shared = {
    status: filters.status,
    flow_type: filters.flow_type,
    category: filters.category,
  };

  return [
    { ...shared, year: prev.getFullYear(), month: prev.getMonth() + 1 },
    { ...shared, year: next.getFullYear(), month: next.getMonth() + 1 },
  ];
};

export const invalidateReportsCache = () => {
  reportsCache.clear();
  reportsInFlight.clear();
};

export const getCachedReportsSummary = (filters: ReportsSummaryFilters = {}) => {
  const cached = reportsCache.get(toKey(filters));
  if (!cached || !isValid(cached.expiresAt)) return null;
  return cached.value;
};

export const isReportsCacheStaleSoon = (
  filters: ReportsSummaryFilters = {},
  thresholdMs = STALE_SOON_THRESHOLD_MS
) => {
  const cached = reportsCache.get(toKey(filters));
  if (!cached) return true;
  return cached.expiresAt - Date.now() <= thresholdMs;
};

const normalize = (payload: Partial<ReportsSummaryDto> | null | undefined): ReportsSummaryDto => {
  const periodYear = typeof payload?.period?.year === 'number' ? payload.period.year : new Date().getFullYear();
  const periodMonth = typeof payload?.period?.month === 'number' ? payload.period.month : new Date().getMonth() + 1;

  return {
    global_indicators: {
      settled_balance_total: String(payload?.global_indicators?.settled_balance_total ?? '0'),
      pending_income_total: String(payload?.global_indicators?.pending_income_total ?? '0'),
      pending_expense_total: String(payload?.global_indicators?.pending_expense_total ?? '0'),
      projected_balance_total: String(payload?.global_indicators?.projected_balance_total ?? '0'),
    },
    period_indicators: {
      settled_balance_total: String(
        payload?.period_indicators?.settled_balance_total ??
          payload?.global_indicators?.settled_balance_total ??
          '0'
      ),
      pending_income_total: String(
        payload?.period_indicators?.pending_income_total ??
          payload?.global_indicators?.pending_income_total ??
          '0'
      ),
      pending_expense_total: String(
        payload?.period_indicators?.pending_expense_total ??
          payload?.global_indicators?.pending_expense_total ??
          '0'
      ),
      projected_balance_total: String(
        payload?.period_indicators?.projected_balance_total ??
          payload?.global_indicators?.projected_balance_total ??
          '0'
      ),
    },
    monthly_summary: {
      income_total: String(payload?.monthly_summary?.income_total ?? payload?.summary?.income_total ?? '0'),
      expense_total: String(payload?.monthly_summary?.expense_total ?? payload?.summary?.expense_total ?? '0'),
      balance: String(payload?.monthly_summary?.balance ?? payload?.summary?.balance ?? '0'),
      records_count: typeof payload?.monthly_summary?.records_count === 'number' ? payload.monthly_summary.records_count : 0,
    },
    monthly_trend: Array.isArray(payload?.monthly_trend)
      ? payload.monthly_trend.map((item) => ({
          year: typeof item?.year === 'number' ? item.year : periodYear,
          month: typeof item?.month === 'number' ? item.month : periodMonth,
          income_total: String(item?.income_total ?? '0'),
          expense_total: String(item?.expense_total ?? '0'),
          balance: String(item?.balance ?? '0'),
        }))
      : [],
    categories_breakdown: Array.isArray(payload?.categories_breakdown)
      ? payload.categories_breakdown.map((item) => ({
          category: typeof item?.category === 'string' && item.category.trim() ? item.category : 'Sem categoria',
          total: String(item?.total ?? '0'),
          percentage: typeof item?.percentage === 'number' ? item.percentage : 0,
        }))
      : [],
    detailed_records: Array.isArray(payload?.detailed_records)
      ? payload.detailed_records.map((item) => ({
          id: typeof item?.id === 'number' ? item.id : 0,
          title: typeof item?.title === 'string' && item.title.trim() ? item.title : 'Lancamento',
          record_type: item?.record_type === 'debt' ? 'debt' : 'launch',
          flow_type: item?.flow_type === 'income' ? 'income' : 'expense',
          amount: String(item?.amount ?? '0'),
          status: item?.status === 'paid' || item?.status === 'received' ? item.status : 'pending',
          due_date: typeof item?.due_date === 'string' ? item.due_date : '',
          category: typeof item?.category === 'string' ? item.category : null,
          priority: item?.priority === 'low' || item?.priority === 'high' ? item.priority : 'normal',
        }))
      : [],
    available_categories: Array.isArray(payload?.available_categories)
      ? payload.available_categories.filter((item): item is string => typeof item === 'string')
      : [],
    filters: {
      status: payload?.filters?.status === 'pending' || payload?.filters?.status === 'completed' ? payload.filters.status : 'all',
      flow_type: payload?.filters?.flow_type === 'income' || payload?.filters?.flow_type === 'expense' ? payload.filters.flow_type : 'all',
      category: typeof payload?.filters?.category === 'string' ? payload.filters.category : null,
    },
    period: {
      year: periodYear,
      month: periodMonth,
    },
    summary: {
      income_total: String(payload?.summary?.income_total ?? '0'),
      expense_total: String(payload?.summary?.expense_total ?? '0'),
      balance: String(payload?.summary?.balance ?? '0'),
    },
    top_categories: Array.isArray(payload?.top_categories)
      ? payload.top_categories.map((item) => ({
          category: typeof item?.category === 'string' && item.category.trim() ? item.category : 'Sem categoria',
          total: String(item?.total ?? '0'),
        }))
      : [],
  };
};

export const getReportsSummary = async (
  filters: ReportsSummaryFilters = {},
  options: CacheOptions = {}
) => {
  const { force = false, ttlMs = DEFAULT_TTL_MS } = options;
  const key = toKey(filters);

  const inFlight = reportsInFlight.get(key);
  if (inFlight) {
    if (shouldLogPerf) {
      // eslint-disable-next-line no-console
      console.log('[reports-cache] dedup in-flight', key);
    }
    return inFlight;
  }

  if (!force) {
    const cached = reportsCache.get(key);
    if (cached && isValid(cached.expiresAt)) {
      if (shouldLogPerf) {
        // eslint-disable-next-line no-console
        console.log('[reports-cache] hit', key);
      }
      return cached.value;
    }
  }

  const request = (async () => {
    const { data } = await api.get('/reports/summary', {
      params: {
        year: filters.year,
        month: filters.month,
        status: filters.status,
        flow_type: filters.flow_type,
        category: filters.category || undefined,
      },
    });

    const normalized = normalize(data as Partial<ReportsSummaryDto>);
    reportsCache.set(key, {
      expiresAt: Date.now() + ttlMs,
      value: normalized,
    });
    if (shouldLogPerf) {
      // eslint-disable-next-line no-console
      console.log('[reports-cache] store', key);
    }

    return normalized;
  })().finally(() => {
    reportsInFlight.delete(key);
  });

  reportsInFlight.set(key, request);
  return request;
};

export const prefetchReportsSummary = async (
  filters: ReportsSummaryFilters = {},
  options: CacheOptions = {}
) => {
  const { ttlMs = PREFETCH_TTL_MS } = options;
  try {
    await getReportsSummary(filters, { force: false, ttlMs });
  } catch {
    // Prefetch is opportunistic and should not fail caller flows.
  }
};

export const prefetchAdjacentReportsSummary = async (
  filters: ReportsSummaryFilters = {},
  options: CacheOptions = {}
) => {
  const periods = buildAdjacentPeriods(filters);
  if (!periods.length) return;
  await Promise.all(periods.map((period) => prefetchReportsSummary(period, options)));
};
