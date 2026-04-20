import {
  CONTEXTUAL_MISSIONS,
  computeSpotlightRect,
  migrateLegacyTutorialState,
  resolveTutorialDeviceClass,
} from '../tutorialEngine';

describe('tutorial engine', () => {
  it('resolves device class from width', () => {
    expect(resolveTutorialDeviceClass(340)).toBe('compact');
    expect(resolveTutorialDeviceClass(390)).toBe('standard');
    expect(resolveTutorialDeviceClass(420)).toBe('large');
  });

  it('returns spotlight rect when target fits visible area', () => {
    const rect = computeSpotlightRect({
      rect: { x: 80, y: 220, width: 120, height: 60 },
      windowWidth: 390,
      windowHeight: 800,
      insets: { top: 24, bottom: 34 },
      padding: 14,
    });

    expect(rect).toBeTruthy();
    expect(rect?.width).toBeGreaterThan(120);
  });

  it('returns null when target is out of visible area', () => {
    const rect = computeSpotlightRect({
      rect: { x: 20, y: 760, width: 200, height: 100 },
      windowWidth: 390,
      windowHeight: 800,
      insets: { top: 24, bottom: 34 },
      padding: 14,
    });

    expect(rect).toBeNull();
  });

  it('migrates legacy completed users to completed track', () => {
    const migrated = migrateLegacyTutorialState({
      onboarding_seen: true,
      tutorial_beginner_completed: true,
      tutorial_advanced_completed: true,
    });

    expect(migrated.tutorial_track_state).toBe('completed');
    expect(migrated.tutorial_missions_done.length).toBe(CONTEXTUAL_MISSIONS.length);
  });

  it('migrates legacy partial users to contextual track', () => {
    const migrated = migrateLegacyTutorialState({
      onboarding_seen: true,
      tutorial_beginner_completed: true,
      tutorial_advanced_completed: false,
      tutorial_advanced_tasks_done: ['visit_home'],
    });

    expect(migrated.tutorial_track_state).toBe('contextual');
    expect(migrated.tutorial_missions_done).toContain('visit_home');
  });
});

