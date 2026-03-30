export interface ReportsSummaryDto {
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
