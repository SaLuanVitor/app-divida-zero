import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppPreferences } from '../types/settings';
import { getAppPreferences, subscribePreferencesChanges } from '../services/preferences';

type TextSizePreset = 'small' | 'normal' | 'large' | 'xlarge';

interface AccessibilityContextData {
  fontScale: AppPreferences['font_scale'];
  textSizePreset: TextSizePreset;
  reduceMotion: boolean;
  largerTouchTargets: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextData | undefined>(undefined);

const toPreset = (fontScale: AppPreferences['font_scale']): TextSizePreset => {
  if (fontScale <= 0.9) return 'small';
  if (fontScale <= 1) return 'normal';
  if (fontScale <= 1.15) return 'large';
  return 'xlarge';
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<AppPreferences | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const next = await getAppPreferences();
      if (!mounted) return;
      setPrefs(next);
    };

    load();
    const unsubscribe = subscribePreferencesChanges((next) => {
      setPrefs(next);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AccessibilityContextData>(
    () => ({
      fontScale: prefs?.font_scale ?? 1,
      textSizePreset: toPreset(prefs?.font_scale ?? 1),
      reduceMotion: !!prefs?.reduce_motion,
      largerTouchTargets: !!prefs?.larger_touch_targets,
    }),
    [prefs?.font_scale, prefs?.larger_touch_targets, prefs?.reduce_motion]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

