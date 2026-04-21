import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Onboarding from '../Onboarding';

jest.mock('../../../components/Layout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
});

jest.mock('../../../context/AccessibilityContext', () => ({
  useAccessibility: () => ({
    fontScale: 1,
    reduceMotion: false,
    largerTouchTargets: false,
  }),
}));

jest.mock('../../../services/preferences', () => ({
  updateAppPreferences: jest.fn(async () => ({})),
}));

jest.mock('../../../services/analytics', () => ({
  trackAnalyticsEventDeferred: jest.fn(),
}));

describe('Onboarding adaptive flow', () => {
  it('starts essential track when user chooses to begin', async () => {
    const { updateAppPreferences } = require('../../../services/preferences');
    const onDone = jest.fn();
    const screen = render(<Onboarding onDone={onDone} />);

    fireEvent.press(screen.getByText('Modo iniciante (com tutorial)'));

    await waitFor(() => expect(updateAppPreferences).toHaveBeenCalled());
    expect(updateAppPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        tutorial_track_state: 'essential',
        tutorial_version: 2,
      })
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('pauses track when user skips onboarding tutorial', async () => {
    const { updateAppPreferences } = require('../../../services/preferences');
    const onDone = jest.fn();
    const screen = render(<Onboarding onDone={onDone} />);

    fireEvent.press(screen.getByText('Pular por enquanto'));

    await waitFor(() => expect(updateAppPreferences).toHaveBeenCalled());
    expect(updateAppPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        tutorial_track_state: 'paused',
        tutorial_reopen_enabled: false,
      })
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('marks tutorial as completed when user chooses advanced mode', async () => {
    const { updateAppPreferences } = require('../../../services/preferences');
    const onDone = jest.fn();
    const screen = render(<Onboarding onDone={onDone} />);

    fireEvent.press(screen.getByText('Modo avancado (sem tutorial)'));

    await waitFor(() => expect(updateAppPreferences).toHaveBeenCalled());
    expect(updateAppPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_mode: 'advanced',
        tutorial_track_state: 'completed',
        tutorial_reopen_enabled: false,
        tutorial_active_mode: null,
        tutorial_beginner_completed: true,
        tutorial_advanced_completed: true,
      })
    );
    expect(onDone).toHaveBeenCalled();
  });
});
