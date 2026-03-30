export interface AppPreferences {
  notifications_enabled: boolean;
  device_push_enabled: boolean;
  notify_due_today: boolean;
  notify_due_tomorrow: boolean;
  notify_weekly_summary: boolean;
  notify_xp_and_badges: boolean;
  dark_mode: boolean;
  large_text: boolean;
  font_scale: 0.9 | 1 | 1.15 | 1.3;
  reduce_motion: boolean;
  larger_touch_targets: boolean;
  onboarding_seen: boolean;
  onboarding_mode: 'beginner' | 'advanced' | null;
  tutorial_reopen_enabled: boolean;
}

