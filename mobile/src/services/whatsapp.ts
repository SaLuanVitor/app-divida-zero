import api from './api';

export interface WaPreferences {
  wa_notifications_enabled: boolean;
  wa_due_reminders: boolean;
  wa_weekly_summary: boolean;
  wa_dnd_start: string;
  wa_dnd_end: string;
}

export interface WaPreferencesResponse {
  message: string;
  wa_preferences: WaPreferences;
}

export const getWaPreferences = async (): Promise<WaPreferences | null> => {
  try {
    const { data } = await api.get('/auth/me');
    return data.wa_preferences ?? null;
  } catch {
    return null;
  }
};

export const updateWaPreferences = async (
  prefs: Partial<WaPreferences>
): Promise<WaPreferencesResponse> => {
  const { data } = await api.patch('/auth/whatsapp_notifications', {
    wa_notification_preferences: prefs,
  });
  return data as WaPreferencesResponse;
};

export const sendPhoneCode = async (phone: string): Promise<{ message: string }> => {
  const { data } = await api.patch('/auth/phone', { phone });
  return data as { message: string };
};

export const verifyPhoneCode = async (
  phone: string,
  code: string
): Promise<{ message: string; wa_preferences: WaPreferences }> => {
  const { data } = await api.post('/auth/phone/verify', { phone, code });
  return data as { message: string; wa_preferences: WaPreferences };
};
