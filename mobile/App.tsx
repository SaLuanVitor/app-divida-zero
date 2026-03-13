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

function AppContent() {
  const { darkMode } = useThemeMode();

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
