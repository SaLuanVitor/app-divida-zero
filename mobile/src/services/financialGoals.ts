import api from './api';
import { CreateFinancialGoalPayload, CreateFinancialGoalResponse, FinancialGoalDto, UpdateFinancialGoalPayload } from '../types/financialGoal';

export const listFinancialGoals = async () => {
  const { data } = await api.get('/financial_goals');
  const payload = data as { goals?: FinancialGoalDto[] | null };

  return {
    goals: Array.isArray(payload?.goals) ? payload.goals : [],
  };
};

export const createFinancialGoal = async (payload: CreateFinancialGoalPayload) => {
  const { data } = await api.post('/financial_goals', payload);
  const parsed = data as Partial<CreateFinancialGoalResponse>;

  return {
    message: parsed.message ?? 'Meta criada com sucesso.',
    goal: parsed.goal as FinancialGoalDto,
    xp_feedback: parsed.xp_feedback ?? null,
  };
};

export const deleteFinancialGoal = async (id: number) => {
  const { data } = await api.delete(`/financial_goals/${id}`);
  const payload = data as { message?: string };

  return {
    message: payload.message ?? 'Meta removida com sucesso.',
  };
};

export const updateFinancialGoal = async (id: number, payload: UpdateFinancialGoalPayload) => {
  const { data } = await api.patch(`/financial_goals/${id}`, payload);
  const parsed = data as { message?: string; goal?: FinancialGoalDto };

  return {
    message: parsed.message ?? 'Meta atualizada com sucesso.',
    goal: parsed.goal as FinancialGoalDto,
  };
};
