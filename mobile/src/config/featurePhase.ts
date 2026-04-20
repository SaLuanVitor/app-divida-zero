export interface FeaturePhaseConfig {
  phase1Mode: boolean;
  aiEnabledInUI: boolean;
  aiEnabledInMobileCalls: boolean;
}

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const phase1Mode = parseBooleanEnv(process.env.EXPO_PUBLIC_PHASE_1_MODE, true);

export const featurePhaseConfig: FeaturePhaseConfig = {
  phase1Mode,
  aiEnabledInUI: !phase1Mode,
  aiEnabledInMobileCalls: !phase1Mode,
};

export const isPhase1Mode = () => featurePhaseConfig.phase1Mode;
