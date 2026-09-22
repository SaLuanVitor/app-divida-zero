import api from '../api';
import {
  getTelegramStatus,
  getTelegramLinkUrl,
  updateTelegramPreferences,
} from '../telegram';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('telegram service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getTelegramStatus maps linked and preferences from /auth/me', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        telegram_linked: true,
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
    expect(status.preferences?.telegram_weekly_summary).toBe(false);
  });

  it('getTelegramStatus treats missing fields as not linked', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: {} });

    const status = await getTelegramStatus();

    expect(status.linked).toBe(false);
    expect(status.preferences).toBeNull();
  });

  it('getTelegramLinkUrl returns the deep link', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { link: 'https://t.me/appDividaZeroBot?start=abc' },
    });

    const link = await getTelegramLinkUrl();

    expect(api.get).toHaveBeenCalledWith('/auth/telegram/link_url');
    expect(link).toBe('https://t.me/appDividaZeroBot?start=abc');
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
});
