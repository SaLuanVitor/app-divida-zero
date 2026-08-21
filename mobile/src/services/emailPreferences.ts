import api from './api';

export interface EmailPreferences {
  email_notifications_enabled: boolean;
  email_due_reminders: boolean;
  email_weekly_summary: boolean;
}

export interface EmailPreferencesResponse {
  message: string;
  email_preferences: EmailPreferences;
}

export const getEmailPreferences = async (): Promise<EmailPreferences | null> => {
  try {
    const { data } = await api.get('/auth/me');
    return data.email_preferences ?? null;
  } catch {
    return null;
  }
};

export const updateEmailPreferences = async (
  prefs: Partial<EmailPreferences>
): Promise<EmailPreferencesResponse> => {
  const { data } = await api.patch('/auth/email_notifications', {
    email_notification_preferences: prefs,
  });
  return data as EmailPreferencesResponse;
};
