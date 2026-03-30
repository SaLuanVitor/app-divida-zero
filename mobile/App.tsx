// Disable Reanimated strict mode logger (safe guard for versions that don't expose setLogLevel)
if (__DEV__) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Reanimated = require('react-native-reanimated');
    if (Reanimated && typeof Reanimated.setLogLevel === 'function') {
      const { ReanimatedLogLevel } = Reanimated;
      Reanimated.setLogLevel(ReanimatedLogLevel.off);
    }
  } catch (error) {
    // Ignore errors if Reanimated is not available or setLogLevel doesn't exist
  }
}

import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OverlayProvider } from './src/context/OverlayContext';
import { ThemeProvider, useThemeMode } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation';
import { StatusBar } from 'expo-status-bar';
import { AppState, Text, TextInput, View } from 'react-native';
import { initializeNotificationLayer, syncScheduledLocalNotifications } from './src/services/notifications';
import { useAuth } from './src/context/AuthContext';
import { getAppPreferences, subscribePreferencesChanges } from './src/services/preferences';
import { listFinancialRecords } from './src/services/financialRecords';
import { trackAnalyticsEvent } from './src/services/analytics';

const applyGlobalFontScale = (fontScale: number) => {
  const NativeText = Text as unknown as { defaultProps?: Record<string, unknown> };
  const NativeTextInput = TextInput as unknown as { defaultProps?: Record<string, unknown> };

  NativeText.defaultProps = {
    ...(NativeText.defaultProps || {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: fontScale,
  };

  NativeTextInput.defaultProps = {
    ...(NativeTextInput.defaultProps || {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: fontScale,
  };
};

function AppContent() {
  const { darkMode, loadingTheme } = useThemeMode();
  const { signed } = useAuth();

  React.useEffect(() => {
    initializeNotificationLayer();
  }, []);

  React.useEffect(() => {
    if (!signed) return;

    const syncNotifications = async () => {
      try {
        await trackAnalyticsEvent({
          event_name: 'app_opened',
          screen: 'AppRoot',
          metadata: { source: 'active' },
        });
        const [prefs, recordsResult] = await Promise.all([
          getAppPreferences(),
          listFinancialRecords(undefined, undefined, { force: true }),
        ]);

        await syncScheduledLocalNotifications({
          prefs,
          records: recordsResult.records,
        });
      } catch {
        // Keep app flow stable if API/network or native notification layer fails.
      }
    };

    const initial = setTimeout(() => {
      syncNotifications();
    }, 300);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncNotifications();
      }
    });

    return () => {
      clearTimeout(initial);
      subscription.remove();
    };
  }, [signed]);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      const prefs = await getAppPreferences();
      if (!mounted) return;
      applyGlobalFontScale(prefs.font_scale);
    };

    load();
    const unsubscribe = subscribePreferencesChanges((prefs) => {
      applyGlobalFontScale(prefs.font_scale);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (loadingTheme) {
    return <View style={{ flex: 1, backgroundColor: '#f8f7f5' }} />;
  }

  return (
    <NavigationContainer>
      <OverlayProvider>
        <RootNavigator />
        <StatusBar style={darkMode ? 'light' : 'dark'} />
      </OverlayProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
