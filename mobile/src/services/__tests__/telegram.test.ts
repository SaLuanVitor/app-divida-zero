import api from '../api';
import {
  getTelegramStatus,
  getTelegramLinkUrl,
  updateTelegramPreferences,
  unlinkTelegram,
} from '../telegram';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('telegram service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getTelegramStatus maps linked, preferences and identity from /auth/me', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        telegram_linked: true,
        telegram_username: 'salvanvitor',
        telegram_chat_id: '5914458140',
        telegram_preferences: {
          telegram_notifications_enabled: true,
          telegram_due_reminders: true,
          telegram_weekly_summary: false,
        },
      },
    });

    const status = await getTelegramStatus();

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(status.linked).toBe(true);
    expect(status.username).toBe('salvanvitor');
    expect(status.chatId).toBe('5914458140');
    expect(status.preferences?.telegram_weekly_summary).toBe(false);
  });

  it('getTelegramStatus treats missing fields as not linked', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: {} });

    const status = await getTelegramStatus();

    expect(status.linked).toBe(false);
    expect(status.preferences).toBeNull();
    expect(status.username).toBeNull();
  });

  it('getTelegramLinkUrl returns both deep links', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        link: 'https://t.me/appDividaZeroBot?start=abc',
        tg_link: 'tg://resolve?domain=appDividaZeroBot&start=abc',
      },
    });

    const result = await getTelegramLinkUrl();

    expect(api.get).toHaveBeenCalledWith('/auth/telegram/link_url');
    expect(result.link).toBe('https://t.me/appDividaZeroBot?start=abc');
    expect(result.tgLink).toBe('tg://resolve?domain=appDividaZeroBot&start=abc');
  });

  it('getTelegramLinkUrl falls back to null tgLink when missing', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { link: 'https://t.me/appDividaZeroBot?start=abc' },
    });

    const result = await getTelegramLinkUrl();

    expect(result.link).toBe('https://t.me/appDividaZeroBot?start=abc');
    expect(result.tgLink).toBeNull();
  });

  it('updateTelegramPreferences sends partial prefs', async () => {
    (api.patch as jest.Mock).mockResolvedValueOnce({
      data: { message: 'ok', telegram_preferences: {} },
    });

    await updateTelegramPreferences({ telegram_due_reminders: false });

    expect(api.patch).toHaveBeenCalledWith('/auth/telegram_notifications', {
      telegram_notification_preferences: { telegram_due_reminders: false },
    });
  });

  it('unlinkTelegram calls DELETE on the link endpoint', async () => {
    (api.delete as jest.Mock).mockResolvedValueOnce({
      data: { message: 'Telegram desvinculado.' },
    });

    await unlinkTelegram();

    expect(api.delete).toHaveBeenCalledWith('/auth/telegram/link');
  });
});
