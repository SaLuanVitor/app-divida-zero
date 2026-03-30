import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const SESSION_KEY = '@DividaZero:analyticsSessionId';

const EVENT_ALLOWLIST = [
  'app_opened',
  'onboarding_viewed',
  'onboarding_skipped',
  'onboarding_completed',
  'tutorial_reopened',
  'login_success',
  'record_created',
  'record_paid_or_received',
  'goal_created',
  'reports_viewed',
] as const;

export type AnalyticsEventName = (typeof EVENT_ALLOWLIST)[number];

type AnalyticsPayload = {
  event_name: AnalyticsEventName;
  screen?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const createSessionId = () => `session_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

const getSessionId = async () => {
  const existing = await AsyncStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const created = createSessionId();
  await AsyncStorage.setItem(SESSION_KEY, created);
  return created;
};

export const trackAnalyticsEvent = async ({ event_name, screen, metadata = {} }: AnalyticsPayload) => {
  if (!EVENT_ALLOWLIST.includes(event_name)) {
    return;
  }

  try {
    const sessionId = await getSessionId();
    await api.post('/analytics/events', {
      event_name,
      session_id: sessionId,
      screen,
      metadata,
    });
  } catch {
    // Ignore analytics failures so user flow is never blocked.
  }
};
