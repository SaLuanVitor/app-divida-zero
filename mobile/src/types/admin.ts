export interface AdminUserDto {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  active: boolean;
  force_password_change: boolean;
  created_at: string;
  last_login_at?: string | null;
  has_rating: boolean;
}

export interface AdminUsersListResponse {
  users: AdminUserDto[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface AdminUsersQueryParams {
  q?: string;
  role?: 'user' | 'admin';
  active?: boolean;
  page?: number;
  per_page?: number;
}

export interface AdminRatingDistributionItem {
  rating: number;
  count: number;
}

export interface AdminAnalyticsOverviewDto {
  period_days: number;
  users: {
    total: number;
    active: number;
    inactive: number;
    created_in_period: number;
    created_trend: Array<{ date: string; count: number }>;
  };
  app_ratings: {
    total_responses: number;
    averages: {
      usability: number;
      helpfulness: number;
      calendar: number;
      alerts: number;
      goals: number;
      reports: number;
      records: number;
    };
    distributions: {
      usability: AdminRatingDistributionItem[];
      helpfulness: AdminRatingDistributionItem[];
      calendar: AdminRatingDistributionItem[];
      alerts: AdminRatingDistributionItem[];
      goals: AdminRatingDistributionItem[];
      reports: AdminRatingDistributionItem[];
      records: AdminRatingDistributionItem[];
    };
    recent_suggestions: {
      items: Array<{
        id: number;
        suggestion: string;
        created_at: string;
      }>;
      pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
      };
    };
  };
}
