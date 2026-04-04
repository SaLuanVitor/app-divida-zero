export type ReportStatusFilter = 'all' | 'pending' | 'completed';
export type ReportFlowFilter = 'all' | 'income' | 'expense';

export interface ReportsSummaryFilters {
  year?: number;
  month?: number;
  status?: ReportStatusFilter;
  flow_type?: ReportFlowFilter;
  category?: string | null;
}

export interface ReportGlobalIndicatorsDto {
  settled_balance_total: string;
  pending_income_total: string;
  pending_expense_total: string;
  projected_balance_total: string;
}

export interface ReportMonthlySummaryDto {
  income_total: string;
  expense_total: string;
  balance: string;
  records_count: number;
}

export interface ReportMonthlyTrendItemDto {
  year: number;
  month: number;
  income_total: string;
  expense_total: string;
  balance: string;
}

export interface ReportCategoryBreakdownItemDto {
  category: string;
  total: string;
  percentage: number;
}

export interface ReportDetailedRecordItemDto {
  id: number;
  title: string;
  record_type: 'launch' | 'debt';
  flow_type: 'income' | 'expense';
  amount: string;
  status: 'pending' | 'paid' | 'received';
  due_date: string;
  category?: string | null;
  priority: 'low' | 'normal' | 'high';
}

export interface ReportsSummaryDto {
  global_indicators: ReportGlobalIndicatorsDto;
  period_indicators: ReportGlobalIndicatorsDto;
  monthly_summary: ReportMonthlySummaryDto;
  monthly_trend: ReportMonthlyTrendItemDto[];
  categories_breakdown: ReportCategoryBreakdownItemDto[];
  detailed_records: ReportDetailedRecordItemDto[];
  available_categories: string[];
  filters: {
    status: ReportStatusFilter;
    flow_type: ReportFlowFilter;
    category?: string | null;
  };
  period: {
    year: number;
    month: number;
  };
  summary: {
    income_total: string;
    expense_total: string;
    balance: string;
  };
  top_categories: Array<{
    category: string;
    total: string;
  }>;
}
