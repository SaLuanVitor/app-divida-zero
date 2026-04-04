export const MOTION = {
  duration: {
    fast: 150,
    normal: 180,
    slow: 220,
  },
  press: {
    activeOpacity: 0.82,
    pressInDelayMs: 0,
  },
} as const;

export type MotionDurationKey = keyof typeof MOTION.duration;
