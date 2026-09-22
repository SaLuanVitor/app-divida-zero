import { useCallback, useRef, useState } from 'react';
import { AnimationType } from '../components/SuccessAnimation';
import { useHaptics } from './useHaptics';

interface UseSuccessAnimationOptions {
  /** Duration in ms before auto-hiding (default: 2000) */
  autoHideDuration?: number;
  /** Whether to trigger haptic feedback with the animation */
  withHaptics?: boolean;
  /** Haptic type to trigger: 'success' | 'pay' | 'receive' */
  hapticType?: 'success' | 'pay' | 'receive';
}

interface UseSuccessAnimationReturn {
  /** Whether the animation is currently visible */
  isVisible: boolean;
  /** The current animation type being shown */
  animationType: AnimationType;
  /** Show a success animation */
  show: (type: AnimationType) => void;
  /** Hide the animation */
  hide: () => void;
  /** Show checkmark animation (convenience) */
  showCheckmark: () => void;
  /** Show confetti animation (convenience) */
  showConfetti: () => void;
  /** Show gear animation (convenience) */
  showGear: () => void;
}

/**
 * Hook for managing success animations with optional haptic feedback.
 *
 * Usage:
 * ```tsx
 * const { isVisible, animationType, showCheckmark, hide } = useSuccessAnimation();
 *
 * // After successful payment:
 * showCheckmark();
 * ```
 */
export const useSuccessAnimation = (
  options: UseSuccessAnimationOptions = {},
): UseSuccessAnimationReturn => {
  const {
    autoHideDuration = 2000,
    withHaptics = true,
    hapticType = 'success',
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [animationType, setAnimationType] = useState<AnimationType>('checkmark');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { success, pay, receive } = useHaptics();

  const triggerHaptic = useCallback(() => {
    if (!withHaptics) return;

    switch (hapticType) {
      case 'pay':
        pay();
        break;
      case 'receive':
        receive();
        break;
      case 'success':
      default:
        success();
        break;
    }
  }, [withHaptics, hapticType, success, pay, receive]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  }, []);

  const show = useCallback(
    (type: AnimationType) => {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setAnimationType(type);
      setIsVisible(true);
      triggerHaptic();

      // Auto-hide after duration (unless it's a gear/looping animation)
      if (type !== 'gear') {
        timerRef.current = setTimeout(() => {
          setIsVisible(false);
          timerRef.current = null;
        }, autoHideDuration);
      }
    },
    [autoHideDuration, triggerHaptic],
  );

  const showCheckmark = useCallback(() => show('checkmark'), [show]);
  const showConfetti = useCallback(() => show('confetti'), [show]);
  const showGear = useCallback(() => show('gear'), [show]);

  return {
    isVisible,
    animationType,
    show,
    hide,
    showCheckmark,
    showConfetti,
    showGear,
  };
};
