import api from './api';

export interface TelegramPreferences {
  telegram_notifications_enabled: boolean;
  telegram_due_reminders: boolean;
  telegram_weekly_summary: boolean;
}

export interface TelegramStatus {
  preferences: TelegramPreferences | null;
  linked: boolean;
  username: string | null;
  chatId: string | null;
}

export interface TelegramPreferencesResponse {
  message: string;
  telegram_preferences: TelegramPreferences;
}

/**
 * Status do vinculo do Telegram para o usuario autenticado.
 * Cada usuario tem o proprio vinculo (pessoal ou membro de familia).
 */
export const getTelegramStatus = async (): Promise<TelegramStatus> => {
  const { data } = await api.get('/auth/me');
  return {
    preferences: data.telegram_preferences ?? null,
    linked: Boolean(data.telegram_linked),
    username: data.telegram_username ?? null,
    chatId: data.telegram_chat_id ?? null,
  };
};

/**
 * Gera o deep link (t.me/<bot>?start=<token>) para o usuario abrir no Telegram.
 */
export const getTelegramLinkUrl = async (): Promise<string> => {
  const { data } = await api.get('/auth/telegram/link_url');
  return data.link as string;
};

export const updateTelegramPreferences = async (
  prefs: Partial<TelegramPreferences>
): Promise<TelegramPreferencesResponse> => {
  const { data } = await api.patch('/auth/telegram_notifications', {
    telegram_notification_preferences: prefs,
  });
  return data as TelegramPreferencesResponse;
};

export const unlinkTelegram = async (): Promise<TelegramPreferencesResponse> => {
  const { data } = await api.delete('/auth/telegram/link');
  return data as TelegramPreferencesResponse;
};
