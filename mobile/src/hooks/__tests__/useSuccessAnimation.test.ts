import { act, renderHook } from '@testing-library/react-native';
import { useSuccessAnimation } from '../useSuccessAnimation';

const mockSuccess = jest.fn();
const mockPay = jest.fn();
const mockReceive = jest.fn();

jest.mock('../useHaptics', () => ({
  useHaptics: () => ({
    success: mockSuccess,
    pay: mockPay,
    receive: mockReceive,
  }),
}));

describe('useSuccessAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSuccess.mockClear();
    mockPay.mockClear();
    mockReceive.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows checkmark and auto-hides after duration', () => {
    const { result } = renderHook(() =>
      useSuccessAnimation({ autoHideDuration: 1500, withHaptics: false }),
    );

    act(() => {
      result.current.showCheckmark();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.animationType).toBe('checkmark');

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('keeps gear visible until hide', () => {
    const { result } = renderHook(() => useSuccessAnimation({ withHaptics: false }));

    act(() => {
      result.current.showGear();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.animationType).toBe('gear');

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.hide();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('triggers haptic when enabled', () => {
    const { result } = renderHook(() =>
      useSuccessAnimation({ withHaptics: true, hapticType: 'success' }),
    );

    act(() => {
      result.current.showConfetti();
    });

    expect(mockSuccess).toHaveBeenCalled();
    expect(result.current.animationType).toBe('confetti');
  });
});
