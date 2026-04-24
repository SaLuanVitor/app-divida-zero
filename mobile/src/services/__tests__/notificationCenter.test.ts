import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { listNotificationHistory } from '../notificationCenter';
import { listGamificationEvents } from '../gamification';
import { listFinancialRecords } from '../financialRecords';
import { getAppPreferences } from '../preferences';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../gamification', () => ({
  listGamificationEvents: jest.fn(async () => ({ events: [] })),
}));

jest.mock('../financialRecords', () => ({
  listFinancialRecords: jest.fn(async () => ({ records: [] })),
}));

jest.mock('../preferences', () => ({
  defaultAppPreferences: {
    notifications_enabled: true,
    notify_due_today: true,
    notify_due_tomorrow: true,
  },
  getAppPreferences: jest.fn(async () => ({
    notifications_enabled: true,
    notify_due_today: true,
    notify_due_tomorrow: true,
  })),
}));

describe('notificationCenter backend alert mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (listGamificationEvents as jest.Mock).mockResolvedValue({ events: [] });
    (listFinancialRecords as jest.Mock).mockResolvedValue({ records: [] });
    (getAppPreferences as jest.Mock).mockResolvedValue({
      notifications_enabled: true,
      notify_due_today: true,
      notify_due_tomorrow: true,
    });
  });

  it('maps goal_funding backend alerts as goal notifications', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        notifications: [
          {
            id: 1,
            alert_type: 'goal_funding',
            title: 'Aporte registrado na meta',
            message: 'Um aporte foi registrado.',
            created_at: '2026-04-24T10:00:00.000Z',
            read: false,
            metadata: { goal_id: 10 },
          },
        ],
      },
    });

    const history = await listNotificationHistory({ force: true });

    expect(history).toHaveLength(1);
    expect(history[0].kind).toBe('goal');
    expect(history[0].title).toBe('Aporte registrado na meta');
  });
});

