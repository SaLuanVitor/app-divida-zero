import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { getAppPreferences } from '../../services/preferences';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../context/AccessibilityContext', () => ({
  useAccessibility: jest.fn(),
}));

jest.mock('../../services/preferences', () => ({
  getAppPreferences: jest.fn(),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => {
    const Navigator = ({ children }: any) => <>{children}</>;
    const Screen = ({ component: Component, children }: any) => {
      if (typeof children === 'function') return children();
      if (Component) return <Component />;
      return null;
    };
    return { Navigator, Screen };
  },
}));

jest.mock('../AuthNavigator', () => ({
  AuthNavigator: () => {
    const { Text } = require('react-native');
    return <Text>AUTH_SCREEN</Text>;
  },
}));

jest.mock('../AppNavigator', () => ({
  AppNavigator: () => {
    const { Text } = require('react-native');
    return <Text>APP_SCREEN</Text>;
  },
}));

jest.mock('../../screens/Splash', () => () => {
  const { Text } = require('react-native');
  return <Text>SPLASH_SCREEN</Text>;
});

jest.mock('../../screens/app/Onboarding', () => () => {
  const { Text } = require('react-native');
  return <Text>ONBOARDING_SCREEN</Text>;
});

jest.mock('../../screens/auth/ForcePasswordChange', () => () => {
  const { Text } = require('react-native');
  return <Text>FORCE_PASSWORD_SCREEN</Text>;
});

describe('RootNavigator auth guard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useAccessibility as jest.Mock).mockReturnValue({ reduceMotion: false });
    (getAppPreferences as jest.Mock).mockResolvedValue({ onboarding_seen: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows splash while auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({ signed: false, loading: true, user: null });
    const { RootNavigator } = require('../index');
    const { getByText, unmount } = render(<RootNavigator />);

    expect(getByText('SPLASH_SCREEN')).toBeTruthy();
    unmount();
  });

  it('routes to App after splash when signed', async () => {
    (useAuth as jest.Mock).mockReturnValue({ signed: true, loading: false, user: { force_password_change: false } });
    const { RootNavigator } = require('../index');
    const { getByText } = render(<RootNavigator />);

    expect(getByText('SPLASH_SCREEN')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(getByText('APP_SCREEN')).toBeTruthy();
    });
  });

  it('routes to Onboarding when signed and onboarding not seen', async () => {
    (useAuth as jest.Mock).mockReturnValue({ signed: true, loading: false, user: { force_password_change: false } });
    (getAppPreferences as jest.Mock).mockResolvedValue({ onboarding_seen: false });
    const { RootNavigator } = require('../index');
    const { getByText } = render(<RootNavigator />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(getByText('ONBOARDING_SCREEN')).toBeTruthy();
    });
  });

  it('routes to Auth after splash when not signed', async () => {
    (useAuth as jest.Mock).mockReturnValue({ signed: false, loading: false, user: null });
    const { RootNavigator } = require('../index');
    const { getByText } = render(<RootNavigator />);

    expect(getByText('SPLASH_SCREEN')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(getByText('AUTH_SCREEN')).toBeTruthy();
    });
  });

  it('routes to force password change screen when required', async () => {
    (useAuth as jest.Mock).mockReturnValue({ signed: true, loading: false, user: { force_password_change: true } });
    (getAppPreferences as jest.Mock).mockResolvedValue({ onboarding_seen: true });
    const { RootNavigator } = require('../index');
    const { getByText } = render(<RootNavigator />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(getByText('FORCE_PASSWORD_SCREEN')).toBeTruthy();
    });
  });
});
