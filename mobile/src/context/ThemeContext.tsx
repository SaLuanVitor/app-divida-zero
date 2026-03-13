import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { getAppPreferences, saveAppPreferences } from '../services/preferences';

interface ThemeContextData {
  darkMode: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  loadingTheme: boolean;
}

const ThemeContext = createContext<ThemeContextData | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setColorScheme } = useColorScheme();
  const [darkMode, setDarkModeState] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const prefs = await getAppPreferences();
        const useDark = !!prefs.dark_mode;
        setDarkModeState(useDark);
        setColorScheme(useDark ? 'dark' : 'light');
      } finally {
        setLoadingTheme(false);
      }
    };

    loadTheme();
  }, [setColorScheme]);

  const setDarkMode = async (value: boolean) => {
    setDarkModeState(value);
    setColorScheme(value ? 'dark' : 'light');
    const current = await getAppPreferences();
    await saveAppPreferences({
      ...current,
      dark_mode: value,
    });
  };

  const value = useMemo(
    () => ({
      darkMode,
      setDarkMode,
      loadingTheme,
    }),
    [darkMode, loadingTheme]
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

