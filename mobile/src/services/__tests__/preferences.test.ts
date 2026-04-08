import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultAppPreferences, getAppPreferences } from '../preferences';

describe('preferences compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('exposes notification permission prompt flag in defaults', () => {
    expect(defaultAppPreferences.notification_permission_prompted).toBe(false);
  });

  it('backfills notification permission prompt flag for older persisted payloads', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        notifications_enabled: true,
        device_push_enabled: true,
      })
    );

    const prefs = await getAppPreferences();

    expect(prefs.notification_permission_prompted).toBe(false);
    expect(prefs.device_push_enabled).toBe(true);
  });
});
