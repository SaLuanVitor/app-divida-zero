describe('notifications permission orchestration', () => {
  const loadWithMocks = async ({
    initialStatus = 'undetermined',
    requestOutcome = 'granted',
    moduleLoadError,
  }: {
    initialStatus?: 'granted' | 'denied' | 'undetermined';
    requestOutcome?: 'granted' | 'denied';
    moduleLoadError?: Error;
  } = {}) => {
    jest.resetModules();

    let permissionStatus = initialStatus;
    let prefs = {
      notifications_enabled: true,
      device_push_enabled: false,
      notification_permission_prompted: false,
      notify_due_today: true,
      notify_due_tomorrow: true,
      notify_weekly_summary: true,
      notify_xp_and_badges: true,
      dark_mode: false,
      large_text: false,
      font_scale: 1 as const,
      reduce_motion: false,
      larger_touch_targets: false,
      onboarding_seen: false,
      onboarding_mode: null as 'beginner' | 'advanced' | null,
      tutorial_reopen_enabled: true,
    };

    const updateAppPreferences = jest.fn(async (partial: Record<string, unknown>) => {
      prefs = { ...prefs, ...partial };
      return prefs;
    });
    const getAppPreferences = jest.fn(async () => prefs);

    const requestPermissionsAsync = jest.fn(async () => {
      permissionStatus = requestOutcome;
      return {
        status: permissionStatus,
        granted: permissionStatus === 'granted',
        canAskAgain: permissionStatus !== 'denied',
      };
    });
    const scheduleNotificationAsync = jest.fn(async () => 'ok');

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: 'standalone',
        appOwnership: null,
      },
    }));

    if (moduleLoadError) {
      jest.doMock('expo-notifications', () => {
        throw moduleLoadError;
      });
    } else {
      jest.doMock('expo-notifications', () => ({
        scheduleNotificationAsync,
        getPermissionsAsync: jest.fn(async () => ({
          status: permissionStatus,
          granted: permissionStatus === 'granted',
          canAskAgain: permissionStatus !== 'denied',
        })),
        requestPermissionsAsync,
        setNotificationChannelAsync: jest.fn(async () => undefined),
        setNotificationHandler: jest.fn(() => undefined),
        AndroidImportance: {
          DEFAULT: 3,
        },
      }));
    }

    jest.doMock('../preferences', () => ({
      getAppPreferences,
      updateAppPreferences,
    }));

    jest.doMock('../financialRecords', () => ({
      listFinancialRecords: jest.fn(async () => ({ records: [] })),
    }));

    const notifications = require('../notifications');
    return {
      notifications,
      getAppPreferences,
      updateAppPreferences,
      requestPermissionsAsync,
      scheduleNotificationAsync,
      readPrefs: () => prefs,
    };
  };

  it('prompts permission after sign-in when status is undetermined', async () => {
    const { notifications, requestPermissionsAsync, readPrefs } = await loadWithMocks({
      initialStatus: 'undetermined',
      requestOutcome: 'granted',
    });

    const result = await notifications.ensurePostLoginNotificationPermission();

    expect(result.prompted).toBe(true);
    expect(result.status).toBe('granted');
    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(readPrefs().notification_permission_prompted).toBe(true);
    expect(readPrefs().device_push_enabled).toBe(true);
  });

  it('re-requests permission and sends test notification from denied state', async () => {
    const { notifications, requestPermissionsAsync, scheduleNotificationAsync, readPrefs } = await loadWithMocks({
      initialStatus: 'denied',
      requestOutcome: 'granted',
    });

    const result = await notifications.sendLocalTestNotification();

    expect(result).toEqual({ sent: true });
    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(readPrefs().notification_permission_prompted).toBe(true);
    expect(readPrefs().device_push_enabled).toBe(true);
  });

  it('returns native_module_mismatch when native notification runtime is outdated', async () => {
    const { notifications } = await loadWithMocks({
      moduleLoadError: new Error('Cannot find native module ExpoNotificationsHandlerModule'),
    });

    const result = await notifications.sendLocalTestNotification();

    expect(result).toEqual({ sent: false, reason: 'native_module_mismatch' });
  });
});
