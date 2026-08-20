import { Platform } from 'react-native';
import api from './api';
import { AppPreferences } from '../types/settings';
import { getAppPreferences } from './preferences';

const EXPO_PUSH_TOKEN_PREFIX = 'ExponentPushToken[';

let cachedExpoPushToken: string | null | undefined;

const resolveExpoProjectId = (): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoConstantsModule = require('expo-constants');
    const Constants = ExpoConstantsModule?.default ?? ExpoConstantsModule;
    return Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
  } catch {
    return undefined;
  }
};

const getNotificationsModule = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch {
    return null;
  }
};

const buildPushPreferencesPayload = (prefs: AppPreferences) => ({
  notifications_enabled: prefs.notifications_enabled,
  device_push_enabled: prefs.device_push_enabled,
  notify_due_today: prefs.notify_due_today,
  notify_due_tomorrow: prefs.notify_due_tomorrow,
  notify_weekly_summary: prefs.notify_weekly_summary,
});

export const resolveDevicePlatform = () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return Platform.OS;
  }
  return 'android';
};

export const obtainExpoPushToken = async (): Promise<string | null> => {
  if (cachedExpoPushToken !== undefined) {
    return cachedExpoPushToken ?? null;
  }

  const Notifications = getNotificationsModule();
  const projectId = resolveExpoProjectId();

  if (!Notifications || typeof Notifications.getExpoPushTokenAsync !== 'function' || !projectId) {
    cachedExpoPushToken = null;
    return cachedExpoPushToken;
  }

  try {
    const permissions = await Notifications.getPermissionsAsync?.();
    const granted = permissions?.granted === true || permissions?.status === 'granted';
    if (!granted) {
      cachedExpoPushToken = null;
      return cachedExpoPushToken;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = (tokenResponse?.data?.toString().trim() ?? '');
    if (!token || !token.startsWith(EXPO_PUSH_TOKEN_PREFIX)) {
      cachedExpoPushToken = null;
      return cachedExpoPushToken;
    }

    cachedExpoPushToken = token;
    return token;
  } catch {
    cachedExpoPushToken = null;
    return cachedExpoPushToken;
  }
};

export const clearCachedExpoPushToken = () => {
  cachedExpoPushToken = undefined;
};

export const registerRemotePushToken = async (
  prefsOverride?: Partial<AppPreferences>
): Promise<{ registered: boolean; reason?: string }> => {
  const prefs = {
    ...(await getAppPreferences()),
    ...(prefsOverride || {}),
  };

  if (!prefs.notifications_enabled || !prefs.device_push_enabled) {
    return { registered: false, reason: 'disabled' };
  }

  const expoPushToken = await obtainExpoPushToken();
  if (!expoPushToken) {
    return { registered: false, reason: 'token_unavailable' };
  }

  await api.post('/devices', {
    expo_push_token: expoPushToken,
    platform: resolveDevicePlatform(),
    push_preferences: buildPushPreferencesPayload(prefs),
  });

  return { registered: true };
};

export const syncRemotePushPreferences = async (prefs: AppPreferences) => {
  if (!prefs.notifications_enabled || !prefs.device_push_enabled) {
    await unregisterRemotePushToken();
    return { synced: false as const, reason: 'disabled' as const };
  }

  const result = await registerRemotePushToken(prefs);
  return result.registered
    ? { synced: true as const }
    : { synced: false as const, reason: result.reason || 'token_unavailable' };
};

export const unregisterRemotePushToken = async () => {
  const expoPushToken = cachedExpoPushToken ?? (await obtainExpoPushToken());

  try {
    await api.delete('/devices', {
      data: expoPushToken ? { expo_push_token: expoPushToken } : undefined,
    });
  } catch {
    // Logout/session teardown should continue even if unregister fails.
  } finally {
    clearCachedExpoPushToken();
  }
};
