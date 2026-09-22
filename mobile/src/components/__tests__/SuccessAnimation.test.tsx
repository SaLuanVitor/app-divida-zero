import React from 'react';
import { render } from '@testing-library/react-native';
import SuccessAnimation from '../SuccessAnimation';
import { useReducedMotion } from '../../hooks/useReducedMotion';

jest.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('lottie-react-native', () => 'LottieView');

const mockedUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

describe('SuccessAnimation', () => {
  beforeEach(() => {
    mockedUseReducedMotion.mockReturnValue(false);
  });

  it('renders nothing when not visible', () => {
    const screen = render(<SuccessAnimation type="checkmark" visible={false} />);
    expect(screen.queryByTestId('success-animation')).toBeNull();
    expect(screen.queryByTestId('success-animation-reduced')).toBeNull();
  });

  it('renders lottie overlay with pointerEvents none when visible', () => {
    const screen = render(<SuccessAnimation type="checkmark" visible />);
    const overlay = screen.getByTestId('success-animation');
    expect(overlay.props.pointerEvents).toBe('none');
  });

  it('renders static icon when reduce motion is enabled', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const screen = render(<SuccessAnimation type="confetti" visible />);
    expect(screen.getByTestId('success-animation-reduced').props.pointerEvents).toBe('none');
    expect(screen.queryByTestId('success-animation')).toBeNull();
  });
});
