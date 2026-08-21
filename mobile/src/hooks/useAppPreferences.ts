import { useState, useEffect, useCallback } from 'react';
import { AppPreferences } from '../types/settings';
import { defaultAppPreferences, getAppPreferences, saveAppPreferences, updateAppPreferences, subscribePreferencesChanges } from '../services/preferences';

export const useAppPreferences = () => {
  const [preferences, setPreferences] = useState<AppPreferences>(defaultAppPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const prefs = await getAppPreferences();
        if (mounted) {
          setPreferences(prefs);
        }
      } catch {
        if (mounted) {
          setPreferences(defaultAppPreferences);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    const unsubscribe = subscribePreferencesChanges((newPrefs) => {
      if (mounted) {
        setPreferences(newPrefs);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const updatePreferences = useCallback(async (partial: Partial<AppPreferences>) => {
    const next = await updateAppPreferences(partial);
    setPreferences(next);
  }, []);

  const savePreferences = useCallback(async (next: AppPreferences) => {
    await saveAppPreferences(next);
    setPreferences(next);
  }, []);

  return { preferences, loading, updatePreferences, savePreferences };
};