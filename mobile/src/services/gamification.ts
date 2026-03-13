import api from './api';
import {
  GamificationEventDto,
  GamificationSummaryDto,
  normalizeGamificationSummary
} from '../types/gamification';

export const getGamificationSummary = async () => {
  const { data } = await api.get('/gamification/summary');
  const payload = data as {
    summary?: GamificationSummaryDto | null;
  };

  return {
    summary: normalizeGamificationSummary(payload?.summary),
  };
};

export const listGamificationEvents = async () => {
  const { data } = await api.get('/gamification/events');
  const payload = data as {
    events?: GamificationEventDto[] | null;
  };

  return {
    events: Array.isArray(payload?.events) ? payload.events : [],
  };
};

