import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import BrandLogo from '../BrandLogo';

describe('BrandLogo', () => {
  it('renders mark variant as image only', () => {
    const screen = render(<BrandLogo variant="mark" size={72} />);

    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(screen.queryByText('Dívida Zero')).toBeNull();
  });

  it('renders lockup variant with title and subtitle', () => {
    const screen = render(<BrandLogo variant="lockup" subtitle="Assuma o controle" />);

    expect(screen.getByText('Dívida Zero')).toBeTruthy();
    expect(screen.getByText('Assuma o controle')).toBeTruthy();
  });
});
