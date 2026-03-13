import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppPreferences } from '../types/settings';

const APP_PREFERENCES_KEY = '@DividaZero:appPreferences';

export const defaultAppPreferences: AppPreferences = {
  notifications_enabled: true,
  notify_due_today: true,
  notify_due_tomorrow: true,
  notify_weekly_summary: true,
  notify_xp_and_badges: true,
  dark_mode: false,
  large_text: false,
};

export const getAppPreferences = async (): Promise<AppPreferences> => {
  const raw = await AsyncStorage.getItem(APP_PREFERENCES_KEY);
  if (!raw) return defaultAppPreferences;

  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      ...defaultAppPreferences,
      ...parsed,
    };
  } catch {
    return defaultAppPreferences;
  }
};

export const saveAppPreferences = async (next: AppPreferences) => {
  await AsyncStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(next));
};

