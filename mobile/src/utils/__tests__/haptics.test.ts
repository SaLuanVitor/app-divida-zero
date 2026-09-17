import { shouldHapticsRun } from '../haptics';

describe('haptics utility', () => {
  describe('shouldHapticsRun', () => {
    it('returns true when notifications enabled and reduce_motion false', () => {
      const config = { notifications_enabled: true, reduce_motion: false };
      expect(shouldHapticsRun(config)).toBe(true);
    });

    it('returns false when notifications disabled', () => {
      const config = { notifications_enabled: false, reduce_motion: false };
      expect(shouldHapticsRun(config)).toBe(false);
    });

    it('returns false when reduce_motion is true', () => {
      const config = { notifications_enabled: true, reduce_motion: true };
      expect(shouldHapticsRun(config)).toBe(false);
    });

    it('returns false when both notifications disabled and reduce_motion true', () => {
      const config = { notifications_enabled: false, reduce_motion: true };
      expect(shouldHapticsRun(config)).toBe(false);
    });
  });
});