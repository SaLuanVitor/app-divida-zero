import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultAppPreferences, getAppPreferences } from '../preferences';

describe('preferences compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('exposes notification permission prompt flag in defaults', () => {
    expect(defaultAppPreferences.notification_permission_prompted).toBe(false);
    expect(defaultAppPreferences.onboarding_primary_goal).toBeNull();
    expect(defaultAppPreferences.advanced_quick_guide_seen).toBe(false);
    expect(defaultAppPreferences.first_success_milestone_done).toBe(false);
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
    expect(prefs.onboarding_primary_goal).toBeNull();
    expect(prefs.advanced_quick_guide_seen).toBe(false);
    expect(prefs.first_success_milestone_done).toBe(false);
  });
});
