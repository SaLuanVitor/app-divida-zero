import * as Haptics from 'expo-haptics';

export const hapticPay = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export const hapticReceive = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export const hapticDelete = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

export const hapticLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

export const hapticPullToRefresh = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Re-export Haptics for direct use
export { Haptics };

// Type for haptics enabled check
import { AppPreferences } from '../types/settings';

export type HapticsConfig = Pick<
  AppPreferences,
  'notifications_enabled' | 'reduce_motion'
>;

export const shouldHapticsRun = (config: HapticsConfig): boolean => {
  if (config.reduce_motion) return false;
  return config.notifications_enabled !== false;
};