import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AdminDashboard from '../AdminDashboard';

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

jest.mock('../../../components/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress }: { title: string; onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../../../components/admin/DonutChart', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ title, centerLabel, centerValue }: { title: string; centerLabel: string; centerValue: string }) => (
    <View>
      <Text>{title}</Text>
      <Text>{centerLabel}</Text>
      <Text>{centerValue}</Text>
    </View>
  );
});

jest.mock('../../../context/ThemeContext', () => ({
  useThemeMode: () => ({
    darkMode: false,
  }),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    signOut: jest.fn(),
  }),
}));

jest.mock('../../../services/admin', () => ({
  getAdminAnalyticsOverview: jest.fn(),
}));

describe('AdminDashboard', () => {
  it('renders executive sections and donut charts with complete payload', async () => {
    const { getAdminAnalyticsOverview } = require('../../../services/admin');
    getAdminAnalyticsOverview.mockResolvedValue({
      period_days: 30,
      users: {
        total: '12',
        active: '9',
        inactive: '3',
        created_in_period: '2',
        created_trend: [{ date: '2026-04-26', count: '2' }],
      },
      engagement: {
        logins_in_period: '8',
        active_users_7d: '7',
        active_users_30d: '9',
        activity_rate_pct: '75.5',
      },
      app_usage: {
        total_events: '40',
        sessions: '10',
        users_with_events: '9',
        top_events: [{ event_name: 'onboarding_viewed', count: '8' }],
        top_screens: [{ screen: 'Onboarding', count: '8' }],
        events_trend: [{ date: '2026-04-26', count: '8' }],
      },
      onboarding_tutorial_funnel: {
        onboarding_viewed: '8',
        onboarding_completed: '5',
        onboarding_skipped: '2',
        tutorial_reopened: '1',
        onboarding_mode: {
          beginner: '4',
          advanced: '1',
          unknown: '0',
        },
      },
      app_ratings: {
        total_responses: '6',
        averages: {
          usability: '4.5',
          helpfulness: '4.2',
          calendar: '4.1',
          alerts: '3.8',
          goals: '4.0',
          reports: '4.6',
          records: '4.3',
        },
        distributions: {
          usability: [],
          helpfulness: [],
          calendar: [],
          alerts: [],
          goals: [],
          reports: [],
          records: [],
        },
        recent_suggestions: {
          items: [{ id: 1, suggestion: 'Muito bom', created_at: new Date().toISOString() }],
          pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
        },
      },
    });

    const screen = render(<AdminDashboard navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText('Painel Administrativo')).toBeTruthy();
      expect(screen.getByText('Visao geral')).toBeTruthy();
      expect(screen.getAllByText('Usuarios e atividade').length).toBeGreaterThan(0);
      expect(screen.getByText('Funil de onboarding')).toBeTruthy();
      expect(screen.getByText('Satisfacao dos usuarios')).toBeTruthy();
      expect(screen.getByText('Acoes rapidas')).toBeTruthy();
    });
  });

  it('renders safely with partial payload and empty trends', async () => {
    const { getAdminAnalyticsOverview } = require('../../../services/admin');
    getAdminAnalyticsOverview.mockResolvedValue({
      period_days: 30,
      users: {
        total: 0,
        active: 0,
        inactive: 0,
        created_in_period: 0,
        created_trend: [],
      },
      app_ratings: {
        total_responses: 0,
        averages: {
          usability: 0,
          helpfulness: 0,
          calendar: 0,
          alerts: 0,
          goals: 0,
          reports: 0,
          records: 0,
        },
        distributions: {
          usability: [],
          helpfulness: [],
          calendar: [],
          alerts: [],
          goals: [],
          reports: [],
          records: [],
        },
        recent_suggestions: {
          items: [],
          pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
        },
      },
    });

    const screen = render(<AdminDashboard navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText('Painel Administrativo')).toBeTruthy();
      expect(screen.getByText(/Sem novos cadastros no periodo/)).toBeTruthy();
    });
  });
});
