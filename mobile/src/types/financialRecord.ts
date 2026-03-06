export type FinancialRecordMode = 'launch' | 'debt';
export type FinancialFlowType = 'income' | 'expense';
export type FinancialRecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CreateFinancialRecordPayload {
  mode: FinancialRecordMode;
  title: string;
  description?: string;
  amount: number;
  start_date: string;
  flow_type: FinancialFlowType;
  category?: string;
  priority?: 'low' | 'normal' | 'high';
  notes?: string;
  recurring?: boolean;
  recurrence_type?: FinancialRecurrenceType;
  recurrence_count?: number;
  installments_total?: number;
  day_of_month?: number;
}

export interface FinancialRecordDto {
  id: number;
  title: string;
  description?: string;
  record_type: FinancialRecordMode;
  flow_type: FinancialFlowType;
  amount: string;
  status: 'pending' | 'paid' | 'received';
  due_date: string;
  recurring: boolean;
  recurrence_type: FinancialRecurrenceType;
  recurrence_count: number;
  installments_total: number;
  installment_number: number;
  category?: string;
  priority: 'low' | 'normal' | 'high';
  notes?: string;
  group_code?: string;
}


