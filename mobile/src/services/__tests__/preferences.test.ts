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
    expect(defaultAppPreferences.tutorial_general_version).toBe(1);
    expect(defaultAppPreferences.tutorial_general_track_state).toBe('idle');
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
    expect(prefs.tutorial_general_version).toBe(1);
    expect(prefs.tutorial_general_track_state).toBe('idle');
  });

  it('maps general tutorial track from legacy tutorial track when needed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        tutorial_track_state: 'essential',
      })
    );

    const prefs = await getAppPreferences();

    expect(prefs.tutorial_track_state).toBe('essential');
    expect(prefs.tutorial_general_track_state).toBe('essential');
  });
});
