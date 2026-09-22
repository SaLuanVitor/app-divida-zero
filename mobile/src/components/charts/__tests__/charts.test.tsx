import React from 'react';
import { render } from '@testing-library/react-native';
import CategoryDonut from '../CategoryDonut';
import BalanceLineChart from '../BalanceLineChart';
import { AccessibilityProvider } from '../../../context/AccessibilityContext';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<AccessibilityProvider>{ui}</AccessibilityProvider>);

describe('CategoryDonut', () => {
  it('shows empty message when there is no data', () => {
    const screen = renderWithProviders(<CategoryDonut items={[]} darkMode={false} />);
    expect(screen.getByText(/Sem dados de categoria/i)).toBeTruthy();
  });

  it('renders donut and legend with data', () => {
    const items = [
      { category: 'Moradia', total: '1000', percentage: 60 },
      { category: 'Alimentação', total: '400', percentage: 40 },
    ];
    const screen = renderWithProviders(<CategoryDonut items={items} darkMode={false} />);

    expect(screen.queryByText(/Sem dados de categoria/i)).toBeNull();
    expect(screen.getByText('Moradia')).toBeTruthy();
    expect(screen.getByText('Alimentação')).toBeTruthy();
    expect(screen.getByText('60.0%')).toBeTruthy();
    expect(screen.getByText('40.0%')).toBeTruthy();
  });

  it('treats fully empty percentages as no data', () => {
    const items = [{ category: 'Vazio', total: '0', percentage: 0 }];
    const screen = renderWithProviders(<CategoryDonut items={items} darkMode={false} />);
    expect(screen.getByText(/Sem dados de categoria/i)).toBeTruthy();
  });
});

describe('BalanceLineChart', () => {
  it('renders nothing with fewer than two points', () => {
    const screen = render(
      <BalanceLineChart points={[{ label: 'Jan', value: 10 }]} darkMode={false} width={320} />,
    );
    expect(screen.toJSON()).toBeNull();
  });

  it('renders line chart with two or more points', () => {
    const points = [
      { label: 'Jan', value: 10 },
      { label: 'Fev', value: -5 },
      { label: 'Mar', value: 20 },
    ];
    const screen = render(
      <BalanceLineChart points={points} darkMode={false} width={320} />,
    );
    expect(screen.toJSON()).not.toBeNull();
    expect(screen.getByLabelText('Evolução do saldo ao longo dos meses')).toBeTruthy();
  });
});
