import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { getAppPreferences, saveAppPreferences } from '../services/preferences';

interface ThemeContextData {
  darkMode: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  loadingTheme: boolean;
  switchingTheme: boolean;
}

const ThemeContext = createContext<ThemeContextData | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setColorScheme } = useColorScheme();
  const [darkMode, setDarkModeState] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState(true);
  const [switchingTheme, setSwitchingTheme] = useState(false);
  const [prefsCache, setPrefsCache] = useState<Awaited<ReturnType<typeof getAppPreferences>> | null>(null);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoadingTheme(false);
    }, 1500);

    const loadTheme = async () => {
      try {
        const prefs = await getAppPreferences();
        setPrefsCache(prefs);
        const useDark = !!prefs.dark_mode;
        setDarkModeState(useDark);
        setColorScheme(useDark ? 'dark' : 'light');
      } finally {
        setLoadingTheme(false);
      }
    };

    loadTheme();

    return () => clearTimeout(safetyTimer);
  }, []);

  const setDarkMode = async (value: boolean) => {
    if (value === darkMode) return;
    setSwitchingTheme(true);
    setDarkModeState(value);
    setColorScheme(value ? 'dark' : 'light');
    try {
      const current = prefsCache ?? (await getAppPreferences());
      const next = {
        ...current,
        dark_mode: value,
      };
      setPrefsCache(next);
      await saveAppPreferences(next);
    } finally {
      setTimeout(() => setSwitchingTheme(false), 220);
    }
  };

  const value = useMemo(
    () => ({
      darkMode,
      setDarkMode,
      loadingTheme,
      switchingTheme,
    }),
    [darkMode, loadingTheme, switchingTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
};

