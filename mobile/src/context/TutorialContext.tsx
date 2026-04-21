import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { AnalyticsEventName, subscribeAnalyticsEvents, trackAnalyticsEventDeferred } from '../services/analytics';
import { getAppPreferences, subscribePreferencesChanges, updateAppPreferences } from '../services/preferences';
import { AppPreferences } from '../types/settings';
import { navigateSafely } from '../navigation/navigationRef';
import { useAccessibility } from './AccessibilityContext';
import { useAuth } from './AuthContext';
import { useOverlay } from './OverlayContext';
import { useThemeMode } from './ThemeContext';
import {
  CONTEXTUAL_MISSIONS,
  CURRENT_TUTORIAL_VERSION,
  ESSENTIAL_STEPS,
  TutorialDeviceClass,
  TutorialInset,
  TutorialMission,
  TutorialSpotlightRect,
  TutorialTrackState,
  computeSpotlightRect,
  getFirstPendingMission,
  getTooltipMetrics,
  migrateLegacyTutorialState,
  resolveTutorialDeviceClass,
  resolveTutorialStepIndex,
} from './tutorialEngine';

type TutorialContextData = {
  registerTarget: (id: string, ref: View | null) => void;
  unregisterTarget: (id: string) => void;
  refreshTargetMeasure: () => void;
  startBeginnerTutorial: (options?: { replay?: boolean }) => Promise<void>;
  startAdvancedTutorial: (options?: { replay?: boolean }) => Promise<void>;
  stopTutorial: () => Promise<void>;
  beginnerCompleted: boolean;
  advancedCompleted: boolean;
  advancedDoneTasks: string[];
  isTutorialActive: boolean;
  isBeginnerTutorialActive: boolean;
  tutorialTrackState: TutorialTrackState;
  tutorialMissionsDone: string[];
  tutorialDeviceClass: TutorialDeviceClass;
};

const TutorialContext = createContext<TutorialContextData>({} as TutorialContextData);

type TutorialProviderProps = {
  children: React.ReactNode;
  currentRouteName?: string;
};

const TARGET_SPOTLIGHT_PADDING: Record<string, number> = {
  'home-summary-card': 18,
  'home-calendar-card': 14,
  'tab-lancamentos': 24,
  'tab-metas': 18,
  'tab-relatorios': 18,
  'tab-perfil': 18,
  'metas-create-button': 16,
  'relatorios-period-picker': 14,
  'perfil-account-card': 16,
};

const TARGET_SPOTLIGHT_PADDING_BY_CLASS: Partial<Record<string, Record<TutorialDeviceClass, number>>> = {
  'home-summary-card': { compact: 14, standard: 18, large: 20 },
  'home-calendar-card': { compact: 10, standard: 14, large: 16 },
  'tab-lancamentos': { compact: 20, standard: 24, large: 22 },
  'tab-metas': { compact: 14, standard: 18, large: 20 },
  'tab-relatorios': { compact: 14, standard: 18, large: 20 },
  'tab-perfil': { compact: 14, standard: 18, large: 20 },
  'metas-create-button': { compact: 12, standard: 16, large: 18 },
  'relatorios-period-picker': { compact: 10, standard: 14, large: 16 },
  'perfil-account-card': { compact: 12, standard: 16, large: 18 },
};

const DEVICE_CLASS_PADDING_OFFSET: Record<TutorialDeviceClass, number> = {
  compact: -4,
  standard: 0,
  large: 2,
};

const resolveSpotlightPadding = ({
  targetId,
  deviceClass,
  fontScale,
}: {
  targetId: string;
  deviceClass: TutorialDeviceClass;
  fontScale: number;
}) => {
  const basePaddingByClass = TARGET_SPOTLIGHT_PADDING_BY_CLASS[targetId]?.[deviceClass];
  const basePadding = basePaddingByClass ?? TARGET_SPOTLIGHT_PADDING[targetId] ?? 14;
  const classOffset = basePaddingByClass == null ? DEVICE_CLASS_PADDING_OFFSET[deviceClass] : 0;
  const fontOffset = fontScale >= 1.15 ? 1 : 0;
  const nextPadding = basePadding + classOffset + fontOffset;
  return Math.max(8, Math.min(24, nextPadding));
};

const MEASURE_FAILURE_THRESHOLD = 2;
const MEASURE_SAMPLE_COUNT = 3;
const MEASURE_MAX_VARIANCE = 16;

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children, currentRouteName }) => {
  const { signed } = useAuth();
  const { darkMode } = useThemeMode();
  const { fontScale } = useAccessibility();
  const { closeOverlay, setOverlayBlocked } = useOverlay();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [trackState, setTrackState] = useState<TutorialTrackState>('idle');
  const [essentialStepIndex, setEssentialStepIndex] = useState(0);
  const [missionsDone, setMissionsDone] = useState<string[]>([]);
  const [spotlightRect, setSpotlightRect] = useState<TutorialSpotlightRect | null>(null);
  const [measureFailCount, setMeasureFailCount] = useState(0);
  const [targetUnavailable, setTargetUnavailable] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(196);
  const [qaCalibrationMode, setQaCalibrationMode] = useState(false);
  const targetRefs = useRef<Record<string, View | null>>({});
  const hasBootstrappedRef = useRef(false);
  const measureRequestRef = useRef(0);
  const lastCalibrationLogRef = useRef<string | null>(null);

  const deviceClass = useMemo(() => resolveTutorialDeviceClass(windowWidth), [windowWidth]);
  const tooltipMetrics = useMemo(() => getTooltipMetrics(deviceClass), [deviceClass]);
  const isEssentialActive = trackState === 'essential';
  const isContextualActive = trackState === 'contextual';
  const isTutorialActive = isEssentialActive || isContextualActive;
  const isBeginnerTutorialActive = isEssentialActive;
  const currentStep = ESSENTIAL_STEPS[essentialStepIndex] ?? null;
  const currentMission = useMemo(() => getFirstPendingMission(missionsDone), [missionsDone]);
  const advancedCompleted = missionsDone.length >= CONTEXTUAL_MISSIONS.length;
  const beginnerCompleted = trackState === 'contextual' || trackState === 'completed' || trackState === 'paused';

  const persistState = useCallback(async (partial: Partial<AppPreferences>) => {
    await updateAppPreferences(partial);
  }, []);

  const persistTutorialState = useCallback(
    async (partial: Partial<AppPreferences>) => {
      await persistState({
        tutorial_version: CURRENT_TUTORIAL_VERSION,
        ...partial,
      });
    },
    [persistState]
  );

  const registerTarget = useCallback((id: string, ref: View | null) => {
    targetRefs.current[id] = ref;
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    delete targetRefs.current[id];
  }, []);

  const logCalibration = useCallback(
    (payload: Record<string, unknown>) => {
      if (!qaCalibrationMode) return;
      const signature = JSON.stringify(payload);
      if (lastCalibrationLogRef.current === signature) return;
      lastCalibrationLogRef.current = signature;
      console.info('[tutorial-calibration]', payload);
    },
    [qaCalibrationMode]
  );

  const markMeasureFailure = useCallback((reason: string) => {
    setSpotlightRect(null);
    setMeasureFailCount((previous) => {
      const next = previous + 1;
      if (next >= MEASURE_FAILURE_THRESHOLD) {
        setTargetUnavailable(true);
      }

      logCalibration({
        type: 'measure_failed',
        reason,
        currentRouteName: currentRouteName ?? null,
        stepId: currentStep?.id ?? null,
        targetId: currentStep?.targetId ?? null,
        deviceClass,
        failCount: next,
      });
      return next;
    });
  }, [currentRouteName, currentStep?.id, currentStep?.targetId, deviceClass, logCalibration]);

  const measureTargetRect = useCallback((target: View): Promise<TutorialSpotlightRect | null> => {
    return new Promise((resolve) => {
      const fallbackMeasureInWindow = () => {
        if (typeof target.measureInWindow !== 'function') {
          resolve(null);
          return;
        }

        target.measureInWindow((x, y, width, height) => {
          if (!Number.isFinite(x) || !Number.isFinite(y) || !width || !height) {
            resolve(null);
            return;
          }
          resolve({ x, y, width, height });
        });
      };

      if (typeof target.measure === 'function') {
        target.measure((x, y, width, height, pageX, pageY) => {
          const nextX = Number.isFinite(pageX) ? pageX : x;
          const nextY = Number.isFinite(pageY) ? pageY : y;
          if (!Number.isFinite(nextX) || !Number.isFinite(nextY) || !width || !height) {
            fallbackMeasureInWindow();
            return;
          }
          resolve({ x: nextX, y: nextY, width, height });
        });
        return;
      }

      fallbackMeasureInWindow();
    });
  }, []);

  const getStableMeasuredRect = useCallback(
    async (target: View, samples = MEASURE_SAMPLE_COUNT): Promise<TutorialSpotlightRect | null> => {
      const measured: TutorialSpotlightRect[] = [];

      for (let index = 0; index < samples; index += 1) {
        const rect = await measureTargetRect(target);
        if (!rect) {
          return null;
        }
        measured.push(rect);
        if (index < samples - 1) {
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        }
      }

      const pickMedian = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };

      const stableRect: TutorialSpotlightRect = {
        x: pickMedian(measured.map((item) => item.x)),
        y: pickMedian(measured.map((item) => item.y)),
        width: pickMedian(measured.map((item) => item.width)),
        height: pickMedian(measured.map((item) => item.height)),
      };

      const hasHighVariance = measured.some((item) => {
        return (
          Math.abs(item.x - stableRect.x) > MEASURE_MAX_VARIANCE ||
          Math.abs(item.y - stableRect.y) > MEASURE_MAX_VARIANCE ||
          Math.abs(item.width - stableRect.width) > MEASURE_MAX_VARIANCE ||
          Math.abs(item.height - stableRect.height) > MEASURE_MAX_VARIANCE
        );
      });

      if (hasHighVariance) {
        return null;
      }

      return stableRect;
    },
    [measureTargetRect]
  );

  const markMissionDone = useCallback(
    async (missionId: string) => {
      setMissionsDone((previous) => {
        if (previous.includes(missionId)) return previous;
        const next = [...previous, missionId];
        void persistTutorialState({ tutorial_missions_done: next });
        trackAnalyticsEventDeferred({
          event_name: 'tutorial_mission_completed',
          screen: currentRouteName ?? 'Tutorial',
          metadata: { mission_id: missionId, done_count: next.length },
        });
        return next;
      });
    },
    [currentRouteName, persistTutorialState]
  );

  const startEssentialTutorial = useCallback(
    async (options?: { replay?: boolean; source?: 'auto' | 'manual'; initialStepId?: string | null }) => {
      const replay = Boolean(options?.replay);
      const source = options?.source ?? 'manual';
      const nextIndex = replay ? 0 : resolveTutorialStepIndex(options?.initialStepId);
      const firstStep = ESSENTIAL_STEPS[nextIndex] ?? ESSENTIAL_STEPS[0];

      closeOverlay();
      setTrackState('essential');
      setEssentialStepIndex(nextIndex);
      setSpotlightRect(null);
      setTargetUnavailable(false);
      setMeasureFailCount(0);

      await persistTutorialState({
        tutorial_track_state: 'essential',
        tutorial_reopen_enabled: true,
        tutorial_active_mode: 'beginner',
        tutorial_last_step: firstStep.id,
        tutorial_beginner_completed: false,
        ...(replay ? { tutorial_advanced_completed: false, tutorial_missions_done: [] } : {}),
      });

      if (replay) {
        setMissionsDone([]);
      }

      if (source !== 'auto') {
        trackAnalyticsEventDeferred({
          event_name: 'tutorial_reopened',
          screen: 'Tutorial',
          metadata: { track: 'essential' },
        });
      }

      trackAnalyticsEventDeferred({
        event_name: 'tutorial_step_seen',
        screen: firstStep.screen,
        metadata: { step_id: firstStep.id, step_index: nextIndex + 1, step_total: ESSENTIAL_STEPS.length },
      });

      navigateSafely(firstStep.screen);
    },
    [closeOverlay, persistTutorialState]
  );

  const startContextualTutorial = useCallback(
    async (options?: { replay?: boolean; source?: 'auto' | 'manual' }) => {
      const replay = Boolean(options?.replay);
      const source = options?.source ?? 'manual';

      closeOverlay();
      setTrackState('contextual');
      setSpotlightRect(null);
      setTargetUnavailable(false);
      setMeasureFailCount(0);

      if (replay) {
        setMissionsDone([]);
      }

      await persistTutorialState({
        tutorial_track_state: 'contextual',
        tutorial_reopen_enabled: true,
        tutorial_active_mode: 'advanced',
        tutorial_beginner_completed: true,
        tutorial_last_step: null,
        ...(replay ? { tutorial_missions_done: [], tutorial_advanced_completed: false } : {}),
      });

      if (source !== 'auto') {
        trackAnalyticsEventDeferred({
          event_name: 'tutorial_reopened',
          screen: 'Tutorial',
          metadata: { track: 'contextual' },
        });
      }
    },
    [closeOverlay, persistTutorialState]
  );

  const completeTutorial = useCallback(async () => {
    setTrackState('completed');
    setSpotlightRect(null);
    await persistTutorialState({
      tutorial_track_state: 'completed',
      tutorial_reopen_enabled: false,
      tutorial_active_mode: null,
      tutorial_beginner_completed: true,
      tutorial_advanced_completed: true,
      tutorial_last_step: null,
      tutorial_missions_done: CONTEXTUAL_MISSIONS.map((item) => item.id),
      tutorial_advanced_tasks_done: CONTEXTUAL_MISSIONS.map((item) => item.id),
    });
    trackAnalyticsEventDeferred({
      event_name: 'onboarding_completed',
      screen: 'Tutorial',
      metadata: { track: 'adaptive' },
    });
  }, [persistTutorialState]);

  const stopTutorial = useCallback(async () => {
    setTrackState('paused');
    setSpotlightRect(null);
    await persistTutorialState({
      tutorial_track_state: 'paused',
      tutorial_reopen_enabled: false,
      tutorial_active_mode: null,
    });
  }, [persistTutorialState]);

  const goToEssentialStep = useCallback(
    async (stepIndex: number) => {
      const step = ESSENTIAL_STEPS[stepIndex];
      if (!step) return;
      closeOverlay();
      setSpotlightRect(null);
      setTargetUnavailable(false);
      setMeasureFailCount(0);
      setEssentialStepIndex(stepIndex);
      await persistTutorialState({
        tutorial_track_state: 'essential',
        tutorial_last_step: step.id,
        tutorial_reopen_enabled: true,
      });
      trackAnalyticsEventDeferred({
        event_name: 'tutorial_step_seen',
        screen: step.screen,
        metadata: { step_id: step.id, step_index: stepIndex + 1, step_total: ESSENTIAL_STEPS.length },
      });
      navigateSafely(step.screen);
    },
    [closeOverlay, persistTutorialState]
  );

  const handleNextEssentialStep = useCallback(async () => {
    if (!currentStep) return;

    trackAnalyticsEventDeferred({
      event_name: 'tutorial_step_completed',
      screen: currentStep.screen,
      metadata: { step_id: currentStep.id, step_index: essentialStepIndex + 1, step_total: ESSENTIAL_STEPS.length },
    });

    const nextIndex = essentialStepIndex + 1;
    if (nextIndex >= ESSENTIAL_STEPS.length) {
      await startContextualTutorial({ source: 'manual' });
      return;
    }

    await goToEssentialStep(nextIndex);
  }, [currentStep, essentialStepIndex, goToEssentialStep, startContextualTutorial]);

  const handlePrevEssentialStep = useCallback(async () => {
    const prevIndex = essentialStepIndex - 1;
    if (prevIndex < 0) return;
    await goToEssentialStep(prevIndex);
  }, [essentialStepIndex, goToEssentialStep]);

  const refreshTargetMeasure = useCallback(() => {
    if (!isEssentialActive || !currentStep) return;
    if (!currentRouteName || currentRouteName !== currentStep.screen) return;

    const target = targetRefs.current[currentStep.targetId];
    if (!target || (typeof target.measure !== 'function' && typeof target.measureInWindow !== 'function')) {
      markMeasureFailure('target_unavailable');
      return;
    }

    const requestId = measureRequestRef.current + 1;
    measureRequestRef.current = requestId;

    const run = async () => {
      const measuredRect = await getStableMeasuredRect(target);
      if (measureRequestRef.current !== requestId) return;
      if (!measuredRect?.width || !measuredRect?.height) {
        markMeasureFailure('invalid_measurement');
        return;
      }

      const insetData: TutorialInset = {
        top: insets.top,
        bottom: insets.bottom,
      };
      const targetPadding = resolveSpotlightPadding({
        targetId: currentStep.targetId,
        deviceClass,
        fontScale,
      });
      const computed = computeSpotlightRect({
        rect: measuredRect,
        windowWidth,
        windowHeight,
        insets: insetData,
        padding: targetPadding,
      });

      if (!computed) {
        markMeasureFailure('computed_rect_outside_safe_area');
        return;
      }

      setSpotlightRect(computed);
      setTargetUnavailable(false);
      setMeasureFailCount(0);
      logCalibration({
        type: 'measure_success',
        currentRouteName,
        stepId: currentStep.id,
        targetId: currentStep.targetId,
        deviceClass,
        fontScale,
        window: { width: windowWidth, height: windowHeight },
        insets: { top: insets.top, bottom: insets.bottom },
        measuredRect: {
          x: Math.round(measuredRect.x),
          y: Math.round(measuredRect.y),
          width: Math.round(measuredRect.width),
          height: Math.round(measuredRect.height),
        },
        spotlightRect: {
          x: Math.round(computed.x),
          y: Math.round(computed.y),
          width: Math.round(computed.width),
          height: Math.round(computed.height),
        },
        padding: targetPadding,
      });
    };

    void run();
  }, [
    currentRouteName,
    currentStep,
    deviceClass,
    fontScale,
    getStableMeasuredRect,
    insets.bottom,
    insets.top,
    isEssentialActive,
    logCalibration,
    markMeasureFailure,
    windowHeight,
    windowWidth,
  ]);

  useEffect(() => {
    setOverlayBlocked(isEssentialActive);
    if (isEssentialActive) {
      closeOverlay();
    }
  }, [closeOverlay, isEssentialActive, setOverlayBlocked]);

  useEffect(() => {
    if (!signed) {
      hasBootstrappedRef.current = false;
      setTrackState('idle');
      setMissionsDone([]);
      return;
    }
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    let mounted = true;

    const bootstrapTutorial = async () => {
      const prefs = await getAppPreferences();
      if (!mounted) return;

      const migrated = migrateLegacyTutorialState(prefs);
      setQaCalibrationMode(Boolean(prefs.tutorial_qa_calibration_mode));

      setTrackState(migrated.tutorial_track_state);
      setMissionsDone(migrated.tutorial_missions_done);
      setEssentialStepIndex(resolveTutorialStepIndex(prefs.tutorial_last_step));

      const shouldPersistMigration =
        prefs.tutorial_version !== migrated.tutorial_version ||
        prefs.tutorial_track_state !== migrated.tutorial_track_state ||
        JSON.stringify(prefs.tutorial_missions_done || []) !== JSON.stringify(migrated.tutorial_missions_done);

      if (shouldPersistMigration) {
        await persistTutorialState({
          tutorial_track_state: migrated.tutorial_track_state,
          tutorial_missions_done: migrated.tutorial_missions_done,
        });
      }

      if (!prefs.onboarding_seen || prefs.tutorial_reopen_enabled === false) return;
      if (migrated.tutorial_track_state === 'essential') {
        await startEssentialTutorial({ source: 'auto', initialStepId: prefs.tutorial_last_step });
      } else if (migrated.tutorial_track_state === 'contextual') {
        await startContextualTutorial({ source: 'auto' });
      }
    };

    void bootstrapTutorial();

    return () => {
      mounted = false;
    };
  }, [persistTutorialState, signed, startContextualTutorial, startEssentialTutorial]);

  useEffect(() => {
    const unsubscribe = subscribePreferencesChanges((nextPrefs) => {
      setQaCalibrationMode(Boolean(nextPrefs.tutorial_qa_calibration_mode));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isEssentialActive || !currentStep) return;
    if (!currentRouteName) return;
    if (currentRouteName !== currentStep.screen) {
      setSpotlightRect(null);
      setTargetUnavailable(true);
      return;
    }

    refreshTargetMeasure();
    const shortTimeout = setTimeout(refreshTargetMeasure, 90);
    const longTimeout = setTimeout(refreshTargetMeasure, 260);

    return () => {
      clearTimeout(shortTimeout);
      clearTimeout(longTimeout);
    };
  }, [currentRouteName, currentStep, fontScale, isEssentialActive, refreshTargetMeasure, windowHeight, windowWidth]);

  useEffect(() => {
    if (!isEssentialActive) return;
    const interval = setInterval(() => {
      refreshTargetMeasure();
    }, 320);
    return () => clearInterval(interval);
  }, [isEssentialActive, refreshTargetMeasure]);

  useEffect(() => {
    if (!isEssentialActive) return;
    if (currentRouteName === 'Inicio') {
      void markMissionDone('visit_home');
    }
  }, [currentRouteName, isEssentialActive, markMissionDone]);

  useEffect(() => {
    if (!isContextualActive) return;
    if (currentRouteName === 'Inicio') {
      void markMissionDone('visit_home');
    }
    if (currentRouteName === 'Relatorios') {
      void markMissionDone('reports_viewed');
    }
  }, [currentRouteName, isContextualActive, markMissionDone]);

  useEffect(() => {
    const unsubscribe = subscribeAnalyticsEvents((eventName: AnalyticsEventName) => {
      if (!isContextualActive) return;
      if (eventName === 'record_created') {
        void markMissionDone('record_created');
      }
      if (eventName === 'goal_created') {
        void markMissionDone('goal_created');
      }
      if (eventName === 'reports_viewed') {
        void markMissionDone('reports_viewed');
      }
    });
    return unsubscribe;
  }, [isContextualActive, markMissionDone]);

  useEffect(() => {
    if (!isContextualActive) return;
    if (CONTEXTUAL_MISSIONS.every((mission) => missionsDone.includes(mission.id))) {
      void completeTutorial();
    }
  }, [completeTutorial, isContextualActive, missionsDone]);

  const tooltipTop = useMemo(() => {
    const safeTop = insets.top + 12;
    const safeBottom = windowHeight - insets.bottom - 12;
    const maxTop = Math.max(safeTop, safeBottom - tooltipHeight);

    if (!spotlightRect) return maxTop;

    const preferredBelow = spotlightRect.y + spotlightRect.height + 12;
    const preferredAbove = spotlightRect.y - tooltipHeight - 12;

    if (preferredBelow <= maxTop) return preferredBelow;
    if (preferredAbove >= safeTop) return preferredAbove;
    return maxTop;
  }, [insets.bottom, insets.top, spotlightRect, tooltipHeight, windowHeight]);

  const needsFallback = useMemo(() => {
    if (!isEssentialActive) return false;
    if (!currentStep) return true;
    if (!currentRouteName) return true;
    if (currentRouteName !== currentStep.screen) return true;
    return !spotlightRect || targetUnavailable;
  }, [currentRouteName, currentStep, isEssentialActive, spotlightRect, targetUnavailable]);

  const runMissionCta = useCallback((mission: TutorialMission | null) => {
    if (!mission) return;
    if (mission.action === 'go_screen') {
      navigateSafely(mission.screen);
      return;
    }
    if (mission.action === 'open_lancamentos_income') {
      navigateSafely('Lancamentos', { mode: 'income' });
      return;
    }
    navigateSafely('Lancamentos', { mode: 'debt' });
  }, []);

  const tutorialProgressLabel = useMemo(() => {
    if (trackState === 'essential') {
      return `Etapa essencial ${Math.min(essentialStepIndex + 1, ESSENTIAL_STEPS.length)}/${ESSENTIAL_STEPS.length}`;
    }
    if (trackState === 'contextual') {
      return `Missoes ${missionsDone.length}/${CONTEXTUAL_MISSIONS.length}`;
    }
    if (trackState === 'completed') return 'Tutorial concluido';
    if (trackState === 'paused') return 'Tutorial pausado';
    return 'Tutorial inativo';
  }, [essentialStepIndex, missionsDone.length, trackState]);

  const value = useMemo(
    () => ({
      registerTarget,
      unregisterTarget,
      refreshTargetMeasure,
      startBeginnerTutorial: async (options?: { replay?: boolean }) => {
        await startEssentialTutorial({ replay: options?.replay, source: 'manual' });
      },
      startAdvancedTutorial: async (options?: { replay?: boolean }) => {
        await startContextualTutorial({ replay: options?.replay, source: 'manual' });
      },
      stopTutorial,
      beginnerCompleted,
      advancedCompleted,
      advancedDoneTasks: missionsDone,
      isTutorialActive,
      isBeginnerTutorialActive,
      tutorialTrackState: trackState,
      tutorialMissionsDone: missionsDone,
      tutorialDeviceClass: deviceClass,
    }),
    [
      registerTarget,
      unregisterTarget,
      refreshTargetMeasure,
      stopTutorial,
      beginnerCompleted,
      advancedCompleted,
      missionsDone,
      isTutorialActive,
      isBeginnerTutorialActive,
      trackState,
      deviceClass,
      startEssentialTutorial,
      startContextualTutorial,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}

      <Modal
        visible={isEssentialActive}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => void stopTutorial()}
      >
        <View style={styles.overlayRoot}>
          {spotlightRect && !needsFallback ? (
            <>
              <Pressable style={[styles.dim, { left: 0, right: 0, top: 0, height: Math.max(0, spotlightRect.y) }]} />
              <Pressable
                style={[
                  styles.dim,
                  {
                    left: 0,
                    top: spotlightRect.y,
                    width: Math.max(0, spotlightRect.x),
                    height: spotlightRect.height,
                  },
                ]}
              />
              <Pressable
                style={[
                  styles.dim,
                  {
                    top: spotlightRect.y,
                    left: spotlightRect.x + spotlightRect.width,
                    right: 0,
                    height: spotlightRect.height,
                  },
                ]}
              />
              <Pressable
                style={[
                  styles.dim,
                  {
                    left: 0,
                    right: 0,
                    top: spotlightRect.y + spotlightRect.height,
                    bottom: 0,
                  },
                ]}
              />
              <Pressable
                style={[
                  styles.touchBlocker,
                  {
                    left: spotlightRect.x,
                    top: spotlightRect.y,
                    width: spotlightRect.width,
                    height: spotlightRect.height,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.spotlightBorder,
                  {
                    left: spotlightRect.x,
                    top: spotlightRect.y,
                    width: spotlightRect.width,
                    height: spotlightRect.height,
                  },
                ]}
              />
            </>
          ) : (
            <Pressable style={[StyleSheet.absoluteFillObject, styles.dim]} />
          )}

          <View
            style={[
              styles.tooltipCard,
              {
                top: tooltipTop,
                left: tooltipMetrics.sidePadding,
                right: tooltipMetrics.sidePadding,
                borderRadius: tooltipMetrics.borderRadius,
                minHeight: tooltipMetrics.minHeight,
                backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                borderColor: darkMode ? '#334155' : '#e2e8f0',
              },
            ]}
            onLayout={(event) => {
              const nextHeight = Math.max(tooltipMetrics.minHeight, Math.round(event.nativeEvent.layout.height));
              if (Math.abs(nextHeight - tooltipHeight) > 2) {
                setTooltipHeight(nextHeight);
              }
            }}
          >
            <AppText style={[styles.titleText, { color: darkMode ? '#f8fafc' : '#0f172a' }]}>{currentStep?.title}</AppText>
            <AppText style={[styles.bodyText, { color: darkMode ? '#cbd5e1' : '#475569' }]}>{currentStep?.description}</AppText>
            <AppText style={[styles.stepText, { color: darkMode ? '#94a3b8' : '#64748b' }]}>
              {tutorialProgressLabel}
              {needsFallback ? ' • fallback ativo' : ''}
            </AppText>

            {needsFallback && currentStep ? (
              <Button
                title={`Ir para ${currentStep.screen}`}
                variant="outline"
                onPress={() => navigateSafely(currentStep.screen)}
                className="h-10 mt-3"
              />
            ) : null}

            <View className="flex-row mt-4 gap-2">
              <Button title="Pausar" variant="outline" onPress={() => void stopTutorial()} className="flex-1 h-11" />
              <Button
                title="Voltar"
                variant="outline"
                disabled={essentialStepIndex === 0}
                onPress={() => void handlePrevEssentialStep()}
                className="flex-1 h-11"
              />
              <Button
                title={essentialStepIndex + 1 >= ESSENTIAL_STEPS.length ? 'Ir para missoes' : currentStep?.cta || 'Proximo'}
                onPress={() => void handleNextEssentialStep()}
                className="flex-1 h-11"
              />
            </View>
          </View>
        </View>
      </Modal>

      {isContextualActive && currentMission ? (
        <View pointerEvents="box-none" style={styles.contextualRoot}>
          <View
            style={[
              styles.contextualCard,
              {
                marginHorizontal: tooltipMetrics.sidePadding,
                marginBottom: Math.max(12, insets.bottom + 10),
                borderRadius: tooltipMetrics.borderRadius,
                backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                borderColor: darkMode ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <AppText style={[styles.contextualTitle, { color: darkMode ? '#f8fafc' : '#0f172a' }]}>Trilha contextual</AppText>
            <AppText style={[styles.contextualBody, { color: darkMode ? '#cbd5e1' : '#475569' }]}>
              Proxima missao: {currentMission.label}
            </AppText>
            <AppText style={[styles.contextualBody, { color: darkMode ? '#cbd5e1' : '#475569' }]}>
              {currentMission.description}
            </AppText>
            <AppText style={[styles.stepText, { color: darkMode ? '#94a3b8' : '#64748b' }]}>{tutorialProgressLabel}</AppText>

            <View className="flex-row gap-2 mt-3">
              <Button title="Pausar" variant="outline" onPress={() => void stopTutorial()} className="flex-1 h-11" />
              <Button title={currentMission.cta} onPress={() => runMissionCta(currentMission)} className="flex-1 h-11" />
            </View>
          </View>
        </View>
      ) : null}
    </TutorialContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(2, 6, 23, 0.68)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f48c25',
  },
  touchBlocker: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  tooltipCard: {
    position: 'absolute',
    borderWidth: 1,
    padding: 14,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 14,
    marginTop: 4,
  },
  stepText: {
    fontSize: 12,
    marginTop: 8,
  },
  contextualRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  contextualCard: {
    borderWidth: 1,
    padding: 14,
  },
  contextualTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  contextualBody: {
    fontSize: 13,
    marginTop: 4,
  },
});

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial deve ser usado dentro de TutorialProvider');
  }
  return context;
};
