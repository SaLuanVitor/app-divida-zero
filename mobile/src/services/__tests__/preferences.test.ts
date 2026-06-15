import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultAppPreferences, getAppPreferences } from '../preferences';

const APP_PREFERENCES_KEY = '@DividaZero:appPreferences';
const USER_STORAGE_KEY = '@DividaZero:user';
const TUTORIAL_MIGRATION_OWNER_KEY = '@DividaZero:appPreferences:tutorial:migrationOwner';
const scopedTutorialKey = (userId: string | number) => `@DividaZero:appPreferences:tutorial:user:${String(userId)}`;

describe('preferences compatibility', () => {
  const setupStorage = (entries: Record<string, unknown>) => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      const value = entries[key];
      if (value === undefined || value === null) return null;
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupStorage({});
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
    setupStorage({
      [APP_PREFERENCES_KEY]: {
        notifications_enabled: true,
        device_push_enabled: true,
      },
    });

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
    setupStorage({
      [APP_PREFERENCES_KEY]: {
        tutorial_track_state: 'essential',
      },
    });

    const prefs = await getAppPreferences();

    expect(prefs.tutorial_track_state).toBe('essential');
    expect(prefs.tutorial_general_track_state).toBe('essential');
  });

  it('uses scoped tutorial state for the current account', async () => {
    setupStorage({
      [APP_PREFERENCES_KEY]: {
        onboarding_seen: true,
        tutorial_track_state: 'completed',
      },
      [USER_STORAGE_KEY]: { id: 42, name: 'Usuario 42' },
      [scopedTutorialKey(42)]: {
        onboarding_seen: false,
        onboarding_mode: null,
        tutorial_track_state: 'idle',
      },
    });

    const prefs = await getAppPreferences();

    expect(prefs.onboarding_seen).toBe(false);
    expect(prefs.tutorial_track_state).toBe('idle');
  });

  it('forces tutorial defaults for a new account without scoped tutorial data', async () => {
    setupStorage({
      [APP_PREFERENCES_KEY]: {
        onboarding_seen: true,
        onboarding_mode: 'advanced',
        tutorial_track_state: 'completed',
      },
      [USER_STORAGE_KEY]: { id: 99, name: 'Conta Nova' },
      [TUTORIAL_MIGRATION_OWNER_KEY]: { userId: 42 },
    });

    const prefs = await getAppPreferences();

    expect(prefs.onboarding_seen).toBe(false);
    expect(prefs.onboarding_mode).toBeNull();
    expect(prefs.tutorial_track_state).toBe('idle');
  });

  it('migrates legacy tutorial state to first signed account when migration is missing', async () => {
    setupStorage({
      [APP_PREFERENCES_KEY]: {
        onboarding_seen: true,
        onboarding_mode: 'advanced',
        tutorial_track_state: 'completed',
      },
      [USER_STORAGE_KEY]: { id: 7, name: 'Conta Legada' },
    });

    const prefs = await getAppPreferences();

    expect(prefs.onboarding_seen).toBe(true);
    expect(prefs.onboarding_mode).toBe('advanced');
    expect(prefs.tutorial_track_state).toBe('completed');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      scopedTutorialKey(7),
      expect.any(String)
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      TUTORIAL_MIGRATION_OWNER_KEY,
      JSON.stringify({ userId: '7' })
    );
  });
});
