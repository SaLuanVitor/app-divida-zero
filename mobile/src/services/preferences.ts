import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppPreferences } from '../types/settings';

const APP_PREFERENCES_KEY = '@DividaZero:appPreferences';
const FONT_SCALE_OPTIONS: Array<AppPreferences['font_scale']> = [0.9, 1, 1.15, 1.3];
type PreferencesListener = (prefs: AppPreferences) => void;

const listeners = new Set<PreferencesListener>();

export const defaultAppPreferences: AppPreferences = {
  notifications_enabled: true,
  device_push_enabled: false,
  notification_permission_prompted: false,
  notify_due_today: true,
  notify_due_tomorrow: true,
  notify_weekly_summary: true,
  notify_daily_ai_message: true,
  notify_xp_and_badges: true,
  ai_assistant_enabled: true,
  dark_mode: false,
  large_text: false,
  font_scale: 1,
  reduce_motion: false,
  larger_touch_targets: false,
  onboarding_seen: false,
  onboarding_mode: null,
  tutorial_reopen_enabled: true,
  tutorial_active_mode: null,
  tutorial_beginner_completed: false,
  tutorial_advanced_completed: false,
  tutorial_last_step: null,
  tutorial_advanced_tasks_done: [],
};

const normalizePreferences = (raw: Partial<AppPreferences> | null | undefined): AppPreferences => {
  const candidateScale = Number(raw?.font_scale);
  const normalizedScale =
    FONT_SCALE_OPTIONS.find((value) => value === candidateScale) ??
    (raw?.large_text ? 1.15 : 1);
  const largeText = typeof raw?.large_text === 'boolean' ? raw.large_text : normalizedScale > 1;

  return {
    ...defaultAppPreferences,
    ...raw,
    notify_daily_ai_message:
      typeof raw?.notify_daily_ai_message === 'boolean' ? raw.notify_daily_ai_message : true,
    ai_assistant_enabled:
      typeof raw?.ai_assistant_enabled === 'boolean' ? raw.ai_assistant_enabled : true,
    font_scale: normalizedScale,
    large_text: largeText,
    reduce_motion: typeof raw?.reduce_motion === 'boolean' ? raw.reduce_motion : false,
    larger_touch_targets: typeof raw?.larger_touch_targets === 'boolean' ? raw.larger_touch_targets : false,
    onboarding_mode:
      raw?.onboarding_mode === 'beginner' || raw?.onboarding_mode === 'advanced'
        ? raw.onboarding_mode
        : null,
    tutorial_active_mode:
      raw?.tutorial_active_mode === 'beginner' || raw?.tutorial_active_mode === 'advanced'
        ? raw.tutorial_active_mode
        : null,
    tutorial_beginner_completed:
      typeof raw?.tutorial_beginner_completed === 'boolean' ? raw.tutorial_beginner_completed : false,
    tutorial_advanced_completed:
      typeof raw?.tutorial_advanced_completed === 'boolean' ? raw.tutorial_advanced_completed : false,
    tutorial_last_step:
      typeof raw?.tutorial_last_step === 'string' || raw?.tutorial_last_step === null
        ? raw.tutorial_last_step
        : null,
    tutorial_advanced_tasks_done: Array.isArray(raw?.tutorial_advanced_tasks_done)
      ? raw.tutorial_advanced_tasks_done.filter((item): item is string => typeof item === 'string')
      : [],
  };
};

const emitPreferences = (prefs: AppPreferences) => {
  listeners.forEach((listener) => {
    try {
      listener(prefs);
    } catch {
      // Ignore listener failures to keep persistence stable.
    }
  });
};

export const getAppPreferences = async (): Promise<AppPreferences> => {
  const raw = await AsyncStorage.getItem(APP_PREFERENCES_KEY);
  if (!raw) return defaultAppPreferences;

  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return normalizePreferences(parsed);
  } catch {
    return defaultAppPreferences;
  }
};

export const saveAppPreferences = async (next: AppPreferences) => {
  const normalized = normalizePreferences(next);
  await AsyncStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(normalized));
  emitPreferences(normalized);
};

export const updateAppPreferences = async (partial: Partial<AppPreferences>) => {
  const current = await getAppPreferences();
  const next = normalizePreferences({
    ...current,
    ...partial,
  });
  await saveAppPreferences(next);
  return next;
};

export const subscribePreferencesChanges = (listener: PreferencesListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

