import "./src/global.css";
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OverlayProvider } from './src/context/OverlayContext';
import { RootNavigator } from './src/navigation';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <OverlayProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </OverlayProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
