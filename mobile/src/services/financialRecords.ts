import api from './api';
import { CreateFinancialRecordPayload, FinancialRecordDto } from '../types/financialRecord';
import { XpFeedbackDto } from '../types/gamification';
import { invalidateFinancialGoalsCache } from './financialGoals';
import { invalidateGamificationCache } from './gamification';

const DEFAULT_TTL_MS = 12000;

type CacheOptions = {
  force?: boolean;
  ttlMs?: number;
};

type RecordsResult = { records: FinancialRecordDto[] };

const recordsCache = new Map<string, { expiresAt: number; value: RecordsResult }>();
const recordsInFlight = new Map<string, Promise<RecordsResult>>();

const isValid = (expiresAt: number) => Date.now() < expiresAt;
const keyFor = (year?: number, month?: number) => `${year ?? 'all'}:${month ?? 'all'}`;

export const invalidateFinancialRecordsCache = () => {
  recordsCache.clear();
  recordsInFlight.clear();
};

export const createFinancialRecord = async (payload: CreateFinancialRecordPayload) => {
  const { data } = await api.post('/financial_records', payload);
  const payloadData = data as {
    message: string;
    created_count?: number;
    records?: FinancialRecordDto[] | null;
    xp_feedback?: XpFeedbackDto | null;
  };
  invalidateFinancialRecordsCache();
  invalidateFinancialGoalsCache();
  invalidateGamificationCache();

  return {
    message: payloadData?.message ?? 'Registro criado com sucesso.',
    created_count: typeof payloadData?.created_count === 'number' ? payloadData.created_count : 0,
    records: Array.isArray(payloadData?.records) ? payloadData.records : [],
    xp_feedback: payloadData?.xp_feedback ?? null,
  };
};

export const listFinancialRecords = async (year?: number, month?: number, options: CacheOptions = {}) => {
  const { force = false, ttlMs = DEFAULT_TTL_MS } = options;
  const key = keyFor(year, month);

  if (!force) {
    const cached = recordsCache.get(key);
    if (cached && isValid(cached.expiresAt)) {
      return cached.value;
    }
    const inFlight = recordsInFlight.get(key);
    if (inFlight) {
      return inFlight;
    }
  }

  const request = (async () => {
    const { data } = await api.get('/financial_records', {
      params: {
        year,
        month,
      },
    });

    const payload = data as {
      records?: FinancialRecordDto[] | null;
    };

    const result = {
      records: Array.isArray(payload?.records) ? payload.records : [],
    };

    recordsCache.set(key, {
      expiresAt: Date.now() + ttlMs,
      value: result,
    });

    return result;
  })().finally(() => {
    recordsInFlight.delete(key);
  });

  recordsInFlight.set(key, request);
  return request;
};

export const payFinancialRecord = async (id: number) => {
  const { data } = await api.patch(`/financial_records/${id}/pay`);
  const payload = data as {
    message: string;
    record?: FinancialRecordDto;
    xp_feedback?: XpFeedbackDto | null;
  };
  invalidateFinancialRecordsCache();
  invalidateFinancialGoalsCache();
  invalidateGamificationCache();

  return {
    message: payload?.message ?? 'Registro atualizado com sucesso.',
    record: payload.record as FinancialRecordDto,
    xp_feedback: payload?.xp_feedback ?? null,
  };
};

export const deleteFinancialRecord = async (id: number, scope: 'single' | 'group' = 'single') => {
  const { data } = await api.delete(`/financial_records/${id}`, {
    params: {
      scope: scope === 'group' ? 'group' : 'single',
    },
  });
  const payload = data as {
    message: string;
    deleted_count?: number;
    xp_feedback?: XpFeedbackDto | null;
  };
  invalidateFinancialRecordsCache();
  invalidateFinancialGoalsCache();
  invalidateGamificationCache();

  return {
    message: payload?.message ?? 'Registro removido com sucesso.',
    deleted_count: typeof payload?.deleted_count === 'number' ? payload.deleted_count : 0,
    xp_feedback: payload?.xp_feedback ?? null,
  };
};

