import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook that returns whether the user has enabled "Reduce Motion" in their
 * accessibility settings. When true, animations should be simplified or
 * skipped entirely to respect user preferences.
 */
export const useReducedMotion = (): boolean => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReducedMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotion,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return isReducedMotion;
};
