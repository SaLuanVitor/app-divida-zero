import api from './api';
import { CreateFinancialGoalPayload, CreateFinancialGoalResponse, FinancialGoalDto, UpdateFinancialGoalPayload } from '../types/financialGoal';
import { invalidateGamificationCache } from './gamification';

const DEFAULT_TTL_MS = 12000;

type CacheOptions = {
  force?: boolean;
  ttlMs?: number;
};

let goalsCache: { expiresAt: number; value: { goals: FinancialGoalDto[] } } | null = null;
let goalsInFlight: Promise<{ goals: FinancialGoalDto[] }> | null = null;

const isValid = (expiresAt: number) => Date.now() < expiresAt;

export const invalidateFinancialGoalsCache = () => {
  goalsCache = null;
  goalsInFlight = null;
};

export const listFinancialGoals = async (options: CacheOptions = {}) => {
  const { force = false, ttlMs = DEFAULT_TTL_MS } = options;

  if (!force && goalsCache && isValid(goalsCache.expiresAt)) {
    return goalsCache.value;
  }

  if (!force && goalsInFlight) {
    return goalsInFlight;
  }

  goalsInFlight = (async () => {
    const { data } = await api.get('/financial_goals');
    const payload = data as { goals?: FinancialGoalDto[] | null };

    const result = {
      goals: Array.isArray(payload?.goals) ? payload.goals : [],
    };

    goalsCache = {
      expiresAt: Date.now() + ttlMs,
      value: result,
    };

    return result;
  })().finally(() => {
    goalsInFlight = null;
  });

  return goalsInFlight;
};

export const createFinancialGoal = async (payload: CreateFinancialGoalPayload) => {
  const { data } = await api.post('/financial_goals', payload);
  const parsed = data as Partial<CreateFinancialGoalResponse>;
  invalidateFinancialGoalsCache();
  invalidateGamificationCache();

  return {
    message: parsed.message ?? 'Meta criada com sucesso.',
    goal: parsed.goal as FinancialGoalDto,
    xp_feedback: parsed.xp_feedback ?? null,
  };
};

export const deleteFinancialGoal = async (id: number) => {
  const { data } = await api.delete(`/financial_goals/${id}`);
  const payload = data as { message?: string };
  invalidateFinancialGoalsCache();
  invalidateGamificationCache();

  return {
    message: payload.message ?? 'Meta removida com sucesso.',
  };
};

export const updateFinancialGoal = async (id: number, payload: UpdateFinancialGoalPayload) => {
  const { data } = await api.patch(`/financial_goals/${id}`, payload);
  const parsed = data as { message?: string; goal?: FinancialGoalDto };
  invalidateFinancialGoalsCache();
  invalidateGamificationCache();

  return {
    message: parsed.message ?? 'Meta atualizada com sucesso.',
    goal: parsed.goal as FinancialGoalDto,
  };
};
