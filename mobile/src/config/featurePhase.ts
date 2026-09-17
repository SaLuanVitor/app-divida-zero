export type AiSurfaceKey =
  | 'dailyMessage'
  | 'nextAction'
  | 'alerts'
  | 'reportsBriefing'
  | 'categorizeRecord';

export interface FeaturePhaseConfig {
  phase1Mode: boolean;
  aiEnabledInUI: boolean;
  aiEnabledInMobileCalls: boolean;
  surfaces: Record<AiSurfaceKey, boolean>;
}

const AI_SURFACE_ENV_KEYS: Record<AiSurfaceKey, string> = {
  dailyMessage: 'EXPO_PUBLIC_AI_SURFACE_DAILY_MESSAGE',
  nextAction: 'EXPO_PUBLIC_AI_SURFACE_NEXT_ACTION',
  alerts: 'EXPO_PUBLIC_AI_SURFACE_ALERTS',
  reportsBriefing: 'EXPO_PUBLIC_AI_SURFACE_REPORTS_BRIEFING',
  categorizeRecord: 'EXPO_PUBLIC_AI_SURFACE_CATEGORIZE_RECORD',
};

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const phase1Mode = parseBooleanEnv(process.env.EXPO_PUBLIC_PHASE_1_MODE, true);

const isSurfaceEnabled = (surface: AiSurfaceKey) => {
  if (!phase1Mode) return true;
  return parseBooleanEnv(process.env[AI_SURFACE_ENV_KEYS[surface]], false);
};

const surfaces: Record<AiSurfaceKey, boolean> = {
  dailyMessage: isSurfaceEnabled('dailyMessage'),
  nextAction: isSurfaceEnabled('nextAction'),
  alerts: isSurfaceEnabled('alerts'),
  reportsBriefing: isSurfaceEnabled('reportsBriefing'),
  categorizeRecord: isSurfaceEnabled('categorizeRecord'),
};

const anySurfaceEnabled = Object.values(surfaces).some(Boolean);

export const featurePhaseConfig: FeaturePhaseConfig = {
  phase1Mode,
  aiEnabledInUI: !phase1Mode || anySurfaceEnabled,
  aiEnabledInMobileCalls: !phase1Mode || anySurfaceEnabled,
  surfaces,
};

export const isPhase1Mode = () => featurePhaseConfig.phase1Mode;

export const isAiSurfaceEnabled = (surface: AiSurfaceKey) => featurePhaseConfig.surfaces[surface];
