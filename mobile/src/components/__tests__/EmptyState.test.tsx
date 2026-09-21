import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalendarDays } from 'lucide-react-native';
import EmptyState from '../EmptyState';
import { AccessibilityProvider } from '../../context/AccessibilityContext';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<AccessibilityProvider>{ui}</AccessibilityProvider>);

describe('EmptyState', () => {
  it('renders icon, title and message', () => {
    const screen = renderWithProviders(
      <EmptyState icon={CalendarDays} title="Sem lançamentos" message="Comece agora." />,
    );

    expect(screen.getByText('Sem lançamentos')).toBeTruthy();
    expect(screen.getByText('Comece agora.')).toBeTruthy();
  });

  it('omits CTA when no action is provided', () => {
    const screen = renderWithProviders(
      <EmptyState icon={CalendarDays} title="Sem lançamentos" />,
    );

    expect(screen.queryByText('Registrar lançamento')).toBeNull();
  });

  it('renders CTA and triggers onAction', () => {
    const onAction = jest.fn();
    const screen = renderWithProviders(
      <EmptyState
        icon={CalendarDays}
        title="Sem lançamentos"
        actionLabel="Registrar lançamento"
        onAction={onAction}
      />,
    );

    const cta = screen.getByText('Registrar lançamento');
    expect(cta).toBeTruthy();
    fireEvent.press(cta);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
