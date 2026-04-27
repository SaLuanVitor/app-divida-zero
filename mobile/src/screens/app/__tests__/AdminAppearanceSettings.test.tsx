import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AdminAppearanceSettings from '../AdminAppearanceSettings';

jest.mock('../../../components/Layout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
});

jest.mock('../../../components/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
});

jest.mock('../../../components/AppText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>;
});

jest.mock('../../../components/settings/AppearanceSettingsSection', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View>
      <Text>Aparência e acessibilidade</Text>
      <Text>Modo escuro</Text>
      <Text>Tamanho do texto</Text>
    </View>
  );
});

jest.mock('../../../context/ThemeContext', () => ({
  useThemeMode: () => ({
    darkMode: false,
    setDarkMode: jest.fn(),
  }),
}));

jest.mock('../../../context/AccessibilityContext', () => ({
  useAccessibility: () => ({
    fontScale: 1,
    largerTouchTargets: false,
  }),
}));

jest.mock('../../../services/preferences', () => ({
  defaultAppPreferences: {
    font_scale: 1,
    larger_touch_targets: false,
  },
  getAppPreferences: jest.fn().mockResolvedValue({
    font_scale: 1,
    larger_touch_targets: false,
  }),
  saveAppPreferences: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

describe('AdminAppearanceSettings', () => {
  it('renders only visual accessibility controls and no tutorial section', async () => {
    const screen = render(<AdminAppearanceSettings />);

    await waitFor(() => {
      expect(screen.getAllByText('Aparência e acessibilidade').length).toBeGreaterThan(0);
      expect(screen.getByText('Modo escuro')).toBeTruthy();
      expect(screen.getByText('Tamanho do texto')).toBeTruthy();
      expect(screen.queryByText('Tutorial inicial')).toBeNull();
    });
  });
});

