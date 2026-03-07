import api from './api';
import { GamificationEventDto, GamificationSummaryDto } from '../types/gamification';

export const getGamificationSummary = async () => {
  const { data } = await api.get('/gamification/summary');
  return data as {
    summary: GamificationSummaryDto;
  };
};

export const listGamificationEvents = async () => {
  const { data } = await api.get('/gamification/events');
  return data as {
    events: GamificationEventDto[];
  };
};
