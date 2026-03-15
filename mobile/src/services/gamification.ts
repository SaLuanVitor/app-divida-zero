import api from './api';
import {
  GamificationEventDto,
  GamificationSummaryDto,
  normalizeGamificationSummary
} from '../types/gamification';

const DEFAULT_TTL_MS = 12000;

type CacheOptions = {
  force?: boolean;
  ttlMs?: number;
};

let summaryCache: { expiresAt: number; value: { summary: GamificationSummaryDto } } | null = null;
let eventsCache: { expiresAt: number; value: { events: GamificationEventDto[] } } | null = null;
let summaryInFlight: Promise<{ summary: GamificationSummaryDto }> | null = null;
let eventsInFlight: Promise<{ events: GamificationEventDto[] }> | null = null;

const isValid = (expiresAt: number) => Date.now() < expiresAt;

export const invalidateGamificationCache = () => {
  summaryCache = null;
  eventsCache = null;
  summaryInFlight = null;
  eventsInFlight = null;
};

export const getGamificationSummary = async (options: CacheOptions = {}) => {
  const { force = false, ttlMs = DEFAULT_TTL_MS } = options;

  if (!force && summaryCache && isValid(summaryCache.expiresAt)) {
    return summaryCache.value;
  }

  if (!force && summaryInFlight) {
    return summaryInFlight;
  }

  summaryInFlight = (async () => {
    const { data } = await api.get('/gamification/summary');
    const payload = data as {
      summary?: GamificationSummaryDto | null;
    };

    const result = {
      summary: normalizeGamificationSummary(payload?.summary),
    };

    summaryCache = {
      expiresAt: Date.now() + ttlMs,
      value: result,
    };

    return result;
  })().finally(() => {
    summaryInFlight = null;
  });

  return summaryInFlight;
};

export const listGamificationEvents = async (options: CacheOptions = {}) => {
  const { force = false, ttlMs = DEFAULT_TTL_MS } = options;

  if (!force && eventsCache && isValid(eventsCache.expiresAt)) {
    return eventsCache.value;
  }

  if (!force && eventsInFlight) {
    return eventsInFlight;
  }

  eventsInFlight = (async () => {
    const { data } = await api.get('/gamification/events');
    const payload = data as {
      events?: GamificationEventDto[] | null;
    };

    const result = {
      events: Array.isArray(payload?.events) ? payload.events : [],
    };

    eventsCache = {
      expiresAt: Date.now() + ttlMs,
      value: result,
    };

    return result;
  })().finally(() => {
    eventsInFlight = null;
  });

  return eventsInFlight;
};

