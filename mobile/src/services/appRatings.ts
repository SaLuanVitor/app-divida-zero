import api from './api';
import { AppRatingDto, AppRatingsSummaryDto, CreateAppRatingPayload, CreateAppRatingResponse } from '../types/appRating';

const parseRating = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(0, parsed));
};

export const createAppRating = async (payload: CreateAppRatingPayload) => {
  const { data } = await api.post('/app_ratings', payload);
  const parsed = data as Partial<CreateAppRatingResponse>;
  return {
    id: Number(parsed.id || 0),
    message: parsed.message || 'Avaliação enviada com sucesso.',
    created_at: parsed.created_at || new Date().toISOString(),
  } as CreateAppRatingResponse;
};

export const getMyAppRating = async () => {
  const { data } = await api.get('/app_ratings/me');
  const parsed = data as { rating?: AppRatingDto | null };
  return parsed.rating ?? null;
};

export const getAppRatingsSummary = async () => {
  const { data } = await api.get('/app_ratings/summary');
  const parsed = data as Partial<AppRatingsSummaryDto>;
  return {
    total_responses: Number(parsed.total_responses || 0),
    averages: {
      usability: parseRating(parsed.averages?.usability),
      helpfulness: parseRating(parsed.averages?.helpfulness),
      calendar: parseRating(parsed.averages?.calendar),
      alerts: parseRating(parsed.averages?.alerts),
      goals: parseRating(parsed.averages?.goals),
      reports: parseRating(parsed.averages?.reports),
      records: parseRating(parsed.averages?.records),
    },
  } as AppRatingsSummaryDto;
};
