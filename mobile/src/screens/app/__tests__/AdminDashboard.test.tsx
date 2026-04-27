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
  it('renders safely when numeric fields come as strings', async () => {
    const { getAdminAnalyticsOverview } = require('../../../services/admin');
    getAdminAnalyticsOverview.mockResolvedValue({
      period_days: 30,
      users: {
        total: '10',
        active: '8',
        inactive: '2',
        created_in_period: '3',
        created_trend: [{ date: '2026-04-26', count: '3' }],
      },
      engagement: {
        logins_in_period: '7',
        active_users_7d: '6',
        active_users_30d: '8',
        activity_rate_pct: '70.456',
      },
      app_usage: {
        total_events: '20',
        sessions: '4',
        users_with_events: '3',
        top_events: [{ event_name: 'onboarding_viewed', count: '5' }],
        top_screens: [{ screen: 'Onboarding', count: '5' }],
        events_trend: [{ date: '2026-04-26', count: '5' }],
      },
      onboarding_tutorial_funnel: {
        onboarding_viewed: '5',
        onboarding_completed: '3',
        onboarding_skipped: '2',
        tutorial_reopened: '1',
        onboarding_mode: {
          beginner: '2',
          advanced: '1',
          unknown: '0',
        },
      },
      financial_overview: {
        records_in_period: '12',
        by_flow: { income: '500.5' },
        by_status: { paid: '200.0' },
        settled_income_total: '500.5',
        settled_expense_total: '120.2',
        settled_net_balance: '380.3',
        goals_active: '4',
        goals_completed: '1',
        goal_deposit_volume: '90.12',
        goal_withdraw_volume: '20.15',
      },
      app_ratings: {
        total_responses: '4',
        averages: {
          usability: '4.5',
          helpfulness: '4.25',
          calendar: '4.0',
          alerts: '3.5',
          goals: '4.0',
          reports: '4.75',
          records: '4.2',
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
      expect(screen.getByText('Portal Admin')).toBeTruthy();
      expect(screen.getByText(/Taxa de atividade:/)).toBeTruthy();
      expect(screen.getByText(/Respostas de avalia/)).toBeTruthy();
    });
  });

  it('renders without crashing with partial optional sections', async () => {
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
      expect(screen.getByText('Portal Admin')).toBeTruthy();
      expect(screen.getByText(/Sem novos cadastros no período/)).toBeTruthy();
    });
  });
});
