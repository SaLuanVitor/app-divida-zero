export type AppRatingDimensionKey =
  | 'usability_rating'
  | 'helpfulness_rating'
  | 'calendar_rating'
  | 'alerts_rating'
  | 'goals_rating'
  | 'reports_rating'
  | 'records_rating';

export interface AppRatingDto {
  id: number;
  usability_rating: number;
  helpfulness_rating: number;
  calendar_rating: number;
  alerts_rating: number;
  goals_rating: number;
  reports_rating: number;
  records_rating: number;
  suggestions?: string | null;
  created_at: string;
}

export interface AppRatingsSummaryDto {
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
}

export type CreateAppRatingPayload = {
  [key in AppRatingDimensionKey]: number;
} & {
  suggestions?: string;
};

export interface CreateAppRatingResponse {
  id: number;
  message: string;
  created_at: string;
}
