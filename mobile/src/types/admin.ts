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
  engagement?: {
    logins_in_period: number;
    active_users_7d: number;
    active_users_30d: number;
    activity_rate_pct: number;
  };
  app_usage?: {
    total_events: number;
    sessions: number;
    users_with_events: number;
    top_events: Array<{ event_name: string; count: number }>;
    top_screens: Array<{ screen: string; count: number }>;
    events_trend: Array<{ date: string; count: number }>;
  };
  onboarding_tutorial_funnel?: {
    onboarding_viewed: number;
    onboarding_completed: number;
    onboarding_skipped: number;
    tutorial_reopened: number;
    onboarding_mode: {
      beginner: number;
      advanced: number;
      unknown: number;
    };
  };
  financial_overview?: {
    records_in_period: number;
    by_flow: Record<string, number>;
    by_status: Record<string, number>;
    settled_income_total: number;
    settled_expense_total: number;
    settled_net_balance: number;
    goals_active: number;
    goals_completed: number;
    goal_deposit_volume: number;
    goal_withdraw_volume: number;
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
