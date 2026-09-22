import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import Card from '../Card';
import { AccessibilityProvider } from '../../context/AccessibilityContext';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<AccessibilityProvider>{ui}</AccessibilityProvider>);

describe('Card variants and gradient', () => {
  it('renders default variant with title and children', () => {
    const screen = renderWithProviders(
      <Card title="Saldo">
        <Text>conteúdo</Text>
      </Card>,
    );
    expect(screen.getByText('Saldo')).toBeTruthy();
    expect(screen.getByText('conteúdo')).toBeTruthy();
  });

  it('renders title and subtitle', () => {
    const screen = renderWithProviders(
      <Card title="Registro" subtitle="detalhe">
        <Text>body</Text>
      </Card>,
    );
    expect(screen.getByText('Registro')).toBeTruthy();
    expect(screen.getByText('detalhe')).toBeTruthy();
  });

  it('renders each variant without crashing', () => {
    (['income', 'expense', 'debt'] as const).forEach((variant) => {
      const screen = renderWithProviders(
        <Card variant={variant}>
          <Text>{variant}</Text>
        </Card>,
      );
      expect(screen.getByText(variant)).toBeTruthy();
    });
  });

  it('renders gradient card without crashing', () => {
    const screen = renderWithProviders(
      <Card gradient>
        <Text>conteúdo</Text>
      </Card>,
    );
    expect(screen.getByText('conteúdo')).toBeTruthy();
  });
});
