import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView, { AnimationObject } from 'lottie-react-native';
import { Check, Cog, Sparkles } from 'lucide-react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

import checkmarkAnimation from '../assets/animations/checkmark.json';
import confettiAnimation from '../assets/animations/confetti.json';
import gearAnimation from '../assets/animations/gear.json';

export type AnimationType = 'checkmark' | 'confetti' | 'gear';

interface SuccessAnimationProps {
  type: AnimationType;
  size?: number;
  duration?: number;
  visible: boolean;
  onAnimationFinish?: () => void;
  loop?: boolean;
  style?: object;
}

const ANIMATION_SOURCES: Record<AnimationType, AnimationObject> = {
  checkmark: checkmarkAnimation as AnimationObject,
  confetti: confettiAnimation as AnimationObject,
  gear: gearAnimation as AnimationObject,
};

const DEFAULT_DURATIONS: Record<AnimationType, number> = {
  checkmark: 1500,
  confetti: 2000,
  gear: 1500,
};

const FALLBACK_ICONS = {
  checkmark: Check,
  confetti: Sparkles,
  gear: Cog,
} as const;

const FALLBACK_COLORS: Record<AnimationType, string> = {
  checkmark: '#22c55e',
  confetti: '#f48c25',
  gear: '#64748b',
};

/**
 * Lottie success animation. When Reduce Motion is on, shows a static icon.
 * The overlay never captures touches.
 */
const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  type,
  size = 120,
  duration,
  visible,
  onAnimationFinish,
  loop = false,
  style,
}) => {
  const animationRef = useRef<LottieView>(null);
  const reducedMotion = useReducedMotion();
  const animDuration = duration ?? DEFAULT_DURATIONS[type];

  const handleAnimationFinish = useCallback(() => {
    onAnimationFinish?.();
  }, [onAnimationFinish]);

  useEffect(() => {
    if (!visible) return;

    if (reducedMotion) {
      if (loop) return undefined;
      const timer = setTimeout(handleAnimationFinish, animDuration);
      return () => clearTimeout(timer);
    }

    if (loop) {
      animationRef.current?.play();
      return undefined;
    }

    animationRef.current?.reset();
    animationRef.current?.play();
    return undefined;
  }, [visible, loop, reducedMotion, animDuration, handleAnimationFinish]);

  if (!visible) return null;

  if (reducedMotion) {
    const Icon = FALLBACK_ICONS[type];
    return (
      <View
        pointerEvents="none"
        testID="success-animation-reduced"
        style={[styles.container, { width: size, height: size }, style]}
        accessibilityRole="image"
        accessibilityLabel={`${type} animation`}
      >
        <Icon size={Math.round(size * 0.6)} color={FALLBACK_COLORS[type]} />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      testID="success-animation"
      style={[styles.container, { width: size, height: size }, style]}
      accessibilityRole="image"
      accessibilityLabel={`${type} animation`}
    >
      <LottieView
        ref={animationRef}
        source={ANIMATION_SOURCES[type]}
        style={{ width: size, height: size }}
        loop={loop}
        onAnimationFinish={loop ? undefined : handleAnimationFinish}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SuccessAnimation;
