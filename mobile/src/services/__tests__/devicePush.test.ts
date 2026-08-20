jest.mock('../api', () => ({
  post: jest.fn(),
  delete: jest.fn(),
}));

describe('devicePush service', () => {
  const loadModule = async () => {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            eas: {
              projectId: '00000000-0000-4000-8000-000000000001',
            },
          },
        },
      },
    }));
    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
      getExpoPushTokenAsync: jest.fn(async () => ({
        data: 'ExponentPushToken[test-token]',
      })),
    }));
    jest.doMock('../preferences', () => ({
      getAppPreferences: jest.fn(async () => ({
        notifications_enabled: true,
        device_push_enabled: true,
        notify_due_today: true,
        notify_due_tomorrow: true,
        notify_weekly_summary: true,
      })),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const api = require('../api');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const devicePush = require('../devicePush');
    return { api, devicePush };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers remote push token with preferences', async () => {
    const { api, devicePush } = await loadModule();
    (api.post as jest.Mock).mockResolvedValueOnce({ data: { device: { id: 1 } } });

    const result = await devicePush.registerRemotePushToken();

    expect(result).toEqual({ registered: true });
    expect(api.post).toHaveBeenCalledWith('/devices', {
      expo_push_token: 'ExponentPushToken[test-token]',
      platform: expect.any(String),
      push_preferences: {
        notifications_enabled: true,
        device_push_enabled: true,
        notify_due_today: true,
        notify_due_tomorrow: true,
        notify_weekly_summary: true,
      },
    });
  });

  it('unregisters remote push token on logout', async () => {
    const { api, devicePush } = await loadModule();
    (api.delete as jest.Mock).mockResolvedValueOnce({ data: { removed_count: 1 } });

    await devicePush.unregisterRemotePushToken();

    expect(api.delete).toHaveBeenCalledWith('/devices', {
      data: { expo_push_token: 'ExponentPushToken[test-token]' },
    });
  });
});
