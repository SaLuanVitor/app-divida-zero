import { XpFeedbackDto } from './gamification';

export type FinancialGoalType = 'save' | 'debt' | 'specific';
export type FinancialGoalStatus = 'active' | 'completed';

export interface FinancialGoalDto {
  id: number;
  title: string;
  description?: string;
  target_amount: string;
  current_amount: string;
  remaining_amount: string;
  progress_pct: number;
  goal_type: FinancialGoalType;
  status: FinancialGoalStatus;
  start_date: string;
  target_date?: string | null;
  completed_at?: string | null;
}

export interface CreateFinancialGoalPayload {
  title: string;
  description?: string;
  target_amount: number;
  start_date: string;
  target_date?: string;
  goal_type: FinancialGoalType;
}

export interface UpdateFinancialGoalPayload extends CreateFinancialGoalPayload {}

export interface CreateFinancialGoalResponse {
  message: string;
  goal: FinancialGoalDto;
  xp_feedback?: XpFeedbackDto | null;
}
