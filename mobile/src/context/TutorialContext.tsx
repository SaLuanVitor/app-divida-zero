import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { AnalyticsEventName, subscribeAnalyticsEvents, trackAnalyticsEventDeferred } from '../services/analytics';
import { getAppPreferences, updateAppPreferences } from '../services/preferences';
import { AppPreferences } from '../types/settings';
import { navigateSafely } from '../navigation/navigationRef';
import { useAccessibility } from './AccessibilityContext';
import { useAuth } from './AuthContext';
import { useOverlay } from './OverlayContext';
import { useThemeMode } from './ThemeContext';

type SpotlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BeginnerStep = {
  id: string;
  title: string;
  description: string;
  screen: string;
  targetId: string;
};

type AdvancedTask = {
  id: string;
  label: string;
  description: string;
};

const BEGINNER_STEPS: BeginnerStep[] = [
  {
    id: 'home_summary',
    title: 'Resumo inicial',
    description: 'Aqui você acompanha saldos e a próxima melhor ação para evoluir no app.',
    screen: 'Inicio',
    targetId: 'home-summary-card',
  },
  {
    id: 'home_calendar',
    title: 'Calendário do mês',
    description: 'Use o calendário para ver lançamentos por dia e abrir detalhes rapidamente.',
    screen: 'Inicio',
    targetId: 'home-calendar-card',
  },
  {
    id: 'tab_lancamentos',
    title: 'Atalho de lançamentos',
    description: 'Esse botão abre o menu para cadastrar ganho ou dívida com poucos toques.',
    screen: 'Inicio',
    targetId: 'tab-lancamentos',
  },
  {
    id: 'tab_metas',
    title: 'Aba Metas',
    description: 'Agora vamos para Metas para criar e acompanhar objetivos financeiros.',
    screen: 'Inicio',
    targetId: 'tab-metas',
  },
  {
    id: 'metas_create',
    title: 'Criar meta',
    description: 'Toque aqui para criar sua primeira meta e acompanhar progresso com XP.',
    screen: 'Metas',
    targetId: 'metas-create-button',
  },
  {
    id: 'tab_relatorios',
    title: 'Aba Relatórios',
    description: 'Nesta aba você consulta visão consolidada de entradas, saídas e projeções.',
    screen: 'Metas',
    targetId: 'tab-relatorios',
  },
  {
    id: 'relatorios_period',
    title: 'Período do relatório',
    description: 'Troque mês e ano para analisar o desempenho por período.',
    screen: 'Relatorios',
    targetId: 'relatorios-period-picker',
  },
  {
    id: 'tab_perfil',
    title: 'Aba Perfil',
    description: 'No Perfil você ajusta preferências, notificações e segurança da conta.',
    screen: 'Relatorios',
    targetId: 'tab-perfil',
  },
  {
    id: 'perfil_conta',
    title: 'Menu da conta',
    description: 'Aqui ficam configurações principais, notificações e ajuda.',
    screen: 'Perfil',
    targetId: 'perfil-account-card',
  },
];

const ADVANCED_TASKS: AdvancedTask[] = [
  {
    id: 'visit_home',
    label: 'Abrir Início',
    description: 'Confirme os indicadores iniciais no dashboard principal.',
  },
  {
    id: 'record_created',
    label: 'Criar 1 lançamento',
    description: 'Cadastre um ganho ou uma dívida para validar seu fluxo rápido.',
  },
  {
    id: 'goal_created',
    label: 'Criar 1 meta',
    description: 'Cadastre uma meta para acompanhar evolução e marcos de XP.',
  },
  {
    id: 'reports_viewed',
    label: 'Abrir relatório',
    description: 'Acesse Relatórios e visualize o mês atual.',
  },
];

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
};

const TutorialContext = createContext<TutorialContextData>({} as TutorialContextData);

type TutorialProviderProps = {
  children: React.ReactNode;
  currentRouteName?: string;
};

const STEP_MARGIN = 12;
const STEP_PADDING = 8;

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children, currentRouteName }) => {
  const { signed } = useAuth();
  const { darkMode } = useThemeMode();
  const { fontScale } = useAccessibility();
  const { closeOverlay, setOverlayBlocked } = useOverlay();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [beginnerActive, setBeginnerActive] = useState(false);
  const [advancedActive, setAdvancedActive] = useState(false);
  const [beginnerIndex, setBeginnerIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [beginnerCompleted, setBeginnerCompleted] = useState(false);
  const [advancedCompleted, setAdvancedCompleted] = useState(false);
  const [advancedDoneTasks, setAdvancedDoneTasks] = useState<string[]>([]);
  const [measureFailCount, setMeasureFailCount] = useState(0);
  const [targetUnavailable, setTargetUnavailable] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(228);
  const targetRefs = useRef<Record<string, View | null>>({});

  const isTutorialActive = beginnerActive || advancedActive;
  const isBeginnerTutorialActive = beginnerActive;
  const currentStep = BEGINNER_STEPS[beginnerIndex] ?? null;

  const persistState = useCallback(
    async (partial: Partial<AppPreferences>) => {
      await updateAppPreferences(partial);
    },
    []
  );

  const registerTarget = useCallback((id: string, ref: View | null) => {
    targetRefs.current[id] = ref;
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    delete targetRefs.current[id];
  }, []);

  const markMeasureFailure = useCallback(() => {
    setSpotlightRect(null);
    setMeasureFailCount((previous) => {
      const next = previous + 1;
      if (next >= 3) {
        setTargetUnavailable(true);
      }
      return next;
    });
  }, []);

  const measureCurrentStep = useCallback(() => {
    if (!beginnerActive || !currentStep) {
      setSpotlightRect(null);
      return;
    }

    const target = targetRefs.current[currentStep.targetId];
    if (!target || typeof target.measureInWindow !== 'function') {
      markMeasureFailure();
      return;
    }

    target.measureInWindow((x, y, width, height) => {
      if (!width || !height) {
        markMeasureFailure();
        return;
      }

      const safeTop = insets.top + 4;
      const safeBottom = windowHeight - insets.bottom - 4;
      const maxAllowedWidth = Math.max(40, windowWidth - STEP_MARGIN * 2);

      const nextWidth = Math.min(width + STEP_PADDING * 2, maxAllowedWidth);
      const maxX = Math.max(STEP_MARGIN, windowWidth - STEP_MARGIN - nextWidth);
      const nextX = Math.min(Math.max(STEP_MARGIN, x - STEP_PADDING), maxX);

      const rawY = y - STEP_PADDING;
      const nextY = Math.max(safeTop, rawY);
      const rawHeight = height + STEP_PADDING * 2;
      const boundedHeight = Math.min(rawHeight, Math.max(40, safeBottom - nextY));

      if (boundedHeight <= 0) {
        markMeasureFailure();
        return;
      }

      setSpotlightRect({
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: boundedHeight,
      });
      setMeasureFailCount(0);
      setTargetUnavailable(false);
    });
  }, [beginnerActive, currentStep, insets.bottom, insets.top, markMeasureFailure, windowHeight, windowWidth]);

  const refreshTargetMeasure = useCallback(() => {
    measureCurrentStep();
  }, [measureCurrentStep]);

  const markAdvancedTaskDone = useCallback(
    (taskId: string) => {
      setAdvancedDoneTasks((prev) => {
        if (prev.includes(taskId)) return prev;
        const next = [...prev, taskId];
        void persistState({ tutorial_advanced_tasks_done: next });
        return next;
      });
    },
    [persistState]
  );

  const startBeginnerTutorial = useCallback(
    async (options?: { replay?: boolean; source?: 'auto' | 'manual' }) => {
      const replay = Boolean(options?.replay);
      const source = options?.source ?? 'manual';
      closeOverlay();
      setAdvancedActive(false);
      setBeginnerIndex(0);
      setSpotlightRect(null);
      setTargetUnavailable(false);
      setMeasureFailCount(0);
      setBeginnerActive(true);
      if (replay) {
        setBeginnerCompleted(false);
      }
      await persistState({
        tutorial_reopen_enabled: true,
        tutorial_active_mode: 'beginner',
        tutorial_beginner_completed: replay ? false : undefined,
        tutorial_last_step: BEGINNER_STEPS[0]?.id ?? null,
      });
      if (source !== 'auto') {
        trackAnalyticsEventDeferred({
          event_name: 'tutorial_reopened',
          screen: 'TutorialBeginner',
          metadata: { mode: 'beginner' },
        });
      }
      navigateSafely(BEGINNER_STEPS[0].screen);
    },
    [closeOverlay, persistState]
  );

  const startAdvancedTutorial = useCallback(
    async (options?: { replay?: boolean; source?: 'auto' | 'manual' }) => {
      const replay = Boolean(options?.replay);
      const source = options?.source ?? 'manual';
      closeOverlay();
      setBeginnerActive(false);
      setAdvancedActive(true);
      if (replay) {
        setAdvancedCompleted(false);
        setAdvancedDoneTasks([]);
      }
      await persistState({
        tutorial_reopen_enabled: true,
        tutorial_active_mode: 'advanced',
        tutorial_advanced_completed: replay ? false : undefined,
        tutorial_advanced_tasks_done: replay ? [] : undefined,
      });
      if (source !== 'auto') {
        trackAnalyticsEventDeferred({
          event_name: 'tutorial_reopened',
          screen: 'TutorialAdvanced',
          metadata: { mode: 'advanced' },
        });
      }
    },
    [closeOverlay, persistState]
  );

  const stopTutorial = useCallback(async () => {
    setBeginnerActive(false);
    setAdvancedActive(false);
    setSpotlightRect(null);
    await persistState({ tutorial_last_step: null });
  }, [persistState]);

  const completeBeginner = useCallback(async () => {
    setBeginnerActive(false);
    setBeginnerCompleted(true);
    setSpotlightRect(null);
    await persistState({
      tutorial_beginner_completed: true,
      tutorial_last_step: null,
      tutorial_reopen_enabled: false,
      tutorial_active_mode: null,
    });
    trackAnalyticsEventDeferred({
      event_name: 'onboarding_completed',
      screen: 'TutorialBeginner',
      metadata: { mode: 'beginner' },
    });
  }, [persistState]);

  const completeAdvanced = useCallback(async () => {
    setAdvancedActive(false);
    setAdvancedCompleted(true);
    await persistState({
      tutorial_advanced_completed: true,
      tutorial_advanced_tasks_done: ADVANCED_TASKS.map((task) => task.id),
      tutorial_reopen_enabled: false,
      tutorial_active_mode: null,
    });
    trackAnalyticsEventDeferred({
      event_name: 'onboarding_completed',
      screen: 'TutorialAdvanced',
      metadata: { mode: 'advanced' },
    });
  }, [persistState]);

  const skipBeginner = useCallback(async () => {
    await completeBeginner();
    trackAnalyticsEventDeferred({
      event_name: 'onboarding_skipped',
      screen: 'TutorialBeginner',
      metadata: { mode: 'beginner' },
    });
  }, [completeBeginner]);

  const goToStep = useCallback(
    async (nextIndex: number) => {
      const step = BEGINNER_STEPS[nextIndex];
      if (!step) return;
      closeOverlay();
      setSpotlightRect(null);
      setTargetUnavailable(false);
      setMeasureFailCount(0);
      setBeginnerIndex(nextIndex);
      await persistState({
        tutorial_last_step: step.id,
        tutorial_active_mode: 'beginner',
        tutorial_reopen_enabled: true,
      });
      navigateSafely(step.screen);
    },
    [closeOverlay, persistState]
  );

  const handleNextStep = useCallback(async () => {
    const nextIndex = beginnerIndex + 1;
    if (nextIndex >= BEGINNER_STEPS.length) {
      await completeBeginner();
      return;
    }
    await goToStep(nextIndex);
  }, [beginnerIndex, completeBeginner, goToStep]);

  const handlePrevStep = useCallback(async () => {
    const prevIndex = beginnerIndex - 1;
    if (prevIndex < 0) return;
    await goToStep(prevIndex);
  }, [beginnerIndex, goToStep]);

  useEffect(() => {
    setOverlayBlocked(beginnerActive);
    if (beginnerActive) {
      closeOverlay();
    }
  }, [beginnerActive, closeOverlay, setOverlayBlocked]);

  useEffect(() => {
    if (!signed) return;
    let mounted = true;

    const bootstrapTutorial = async () => {
      const prefs = await getAppPreferences();
      if (!mounted) return;

      const beginnerDone = Boolean(prefs.tutorial_beginner_completed);
      const advancedDone = Boolean(prefs.tutorial_advanced_completed);
      const advancedDoneList = Array.isArray(prefs.tutorial_advanced_tasks_done)
        ? prefs.tutorial_advanced_tasks_done.filter((item) => typeof item === 'string')
        : [];

      setBeginnerCompleted(beginnerDone);
      setAdvancedCompleted(advancedDone);
      setAdvancedDoneTasks(advancedDoneList);

      if (!prefs.onboarding_seen || !prefs.tutorial_reopen_enabled) return;

      const preferredMode = prefs.tutorial_active_mode ?? prefs.onboarding_mode;
      if (!preferredMode) return;

      if (preferredMode === 'beginner' && !beginnerDone) {
        await startBeginnerTutorial({ source: 'auto' });
      }

      if (preferredMode === 'advanced' && !advancedDone) {
        await startAdvancedTutorial({ source: 'auto' });
      }
    };

    void bootstrapTutorial();

    return () => {
      mounted = false;
    };
  }, [signed, startAdvancedTutorial, startBeginnerTutorial]);

  useEffect(() => {
    if (!beginnerActive || !currentStep) return;
    if (!currentRouteName) return;
    if (currentRouteName !== currentStep.screen) {
      navigateSafely(currentStep.screen);
      return;
    }
    measureCurrentStep();
    const shortTimeout = setTimeout(measureCurrentStep, 90);
    const longTimeout = setTimeout(measureCurrentStep, 260);
    return () => {
      clearTimeout(shortTimeout);
      clearTimeout(longTimeout);
    };
  }, [beginnerActive, currentStep, currentRouteName, measureCurrentStep, windowHeight, windowWidth, fontScale]);

  useEffect(() => {
    if (!beginnerActive) return;
    const interval = setInterval(() => {
      measureCurrentStep();
    }, 280);
    return () => clearInterval(interval);
  }, [beginnerActive, measureCurrentStep]);

  useEffect(() => {
    if (!beginnerActive || !currentStep) return;
    setSpotlightRect(null);
    setTargetUnavailable(false);
    setMeasureFailCount(0);
  }, [beginnerActive, currentStep?.id]);

  useEffect(() => {
    if (!advancedActive || !currentRouteName) return;
    if (currentRouteName === 'Inicio') markAdvancedTaskDone('visit_home');
  }, [advancedActive, currentRouteName, markAdvancedTaskDone]);

  useEffect(() => {
    const unsubscribe = subscribeAnalyticsEvents((eventName: AnalyticsEventName) => {
      if (!advancedActive) return;
      if (eventName === 'record_created') markAdvancedTaskDone('record_created');
      if (eventName === 'goal_created') markAdvancedTaskDone('goal_created');
      if (eventName === 'reports_viewed') markAdvancedTaskDone('reports_viewed');
    });
    return unsubscribe;
  }, [advancedActive, markAdvancedTaskDone]);

  useEffect(() => {
    if (!advancedActive) return;
    if (ADVANCED_TASKS.every((task) => advancedDoneTasks.includes(task.id))) {
      void completeAdvanced();
    }
  }, [advancedActive, advancedDoneTasks, completeAdvanced]);

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

  const value = useMemo(
    () => ({
      registerTarget,
      unregisterTarget,
      refreshTargetMeasure,
      startBeginnerTutorial,
      startAdvancedTutorial,
      stopTutorial,
      beginnerCompleted,
      advancedCompleted,
      advancedDoneTasks,
      isTutorialActive,
      isBeginnerTutorialActive,
    }),
    [
      registerTarget,
      unregisterTarget,
      refreshTargetMeasure,
      startBeginnerTutorial,
      startAdvancedTutorial,
      stopTutorial,
      beginnerCompleted,
      advancedCompleted,
      advancedDoneTasks,
      isTutorialActive,
      isBeginnerTutorialActive,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}

      <Modal
        visible={beginnerActive}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => void skipBeginner()}
      >
        <View style={styles.overlayRoot}>
          {spotlightRect ? (
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
                backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                borderColor: darkMode ? '#334155' : '#e2e8f0',
              },
            ]}
            onLayout={(event) => {
              const height = Math.max(180, Math.round(event.nativeEvent.layout.height));
              if (Math.abs(tooltipHeight - height) > 2) {
                setTooltipHeight(height);
              }
            }}
          >
            <AppText style={[styles.titleText, { color: darkMode ? '#f8fafc' : '#0f172a' }]}>{currentStep?.title}</AppText>
            <AppText style={[styles.bodyText, { color: darkMode ? '#cbd5e1' : '#475569' }]}>{currentStep?.description}</AppText>
            <AppText style={[styles.stepText, { color: darkMode ? '#94a3b8' : '#94a3b8' }]}>
              Passo {Math.min(beginnerIndex + 1, BEGINNER_STEPS.length)} de {BEGINNER_STEPS.length}
              {targetUnavailable ? ' • ajuste de layout detectado' : ''}
            </AppText>

            <View className="flex-row mt-4 gap-2">
              <Button title="Pular" variant="outline" onPress={() => void skipBeginner()} className="flex-1 h-10" />
              <Button
                title="Voltar"
                variant="outline"
                disabled={beginnerIndex === 0}
                onPress={() => void handlePrevStep()}
                className="flex-1 h-10"
              />
              <Button title={beginnerIndex + 1 >= BEGINNER_STEPS.length ? 'Concluir' : 'Próximo'} onPress={() => void handleNextStep()} className="flex-1 h-10" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={advancedActive}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => void stopTutorial()}
      >
        <View style={styles.overlayRoot}>
          <Pressable style={[StyleSheet.absoluteFillObject, styles.dim]} onPress={() => void stopTutorial()} />
          <View style={[styles.advancedCard, { backgroundColor: darkMode ? '#0f172a' : '#f8fafc', borderColor: darkMode ? '#334155' : '#e2e8f0' }]}>
            <AppText style={[styles.advancedTitle, { color: darkMode ? '#f8fafc' : '#0f172a' }]}>Checklist rápido (Avançado)</AppText>
            <AppText style={[styles.advancedDescription, { color: darkMode ? '#cbd5e1' : '#475569' }]}>
              Complete os objetivos para finalizar seu tutorial avançado.
            </AppText>

            {ADVANCED_TASKS.map((task) => {
              const done = advancedDoneTasks.includes(task.id);
              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    done
                      ? { backgroundColor: darkMode ? '#052e24' : '#ecfdf5', borderColor: darkMode ? '#065f46' : '#a7f3d0' }
                      : { backgroundColor: darkMode ? '#111827' : '#ffffff', borderColor: darkMode ? '#334155' : '#e2e8f0' },
                  ]}
                >
                  <AppText style={[styles.taskTitle, { color: done ? '#10b981' : darkMode ? '#f8fafc' : '#0f172a' }]}>
                    {done ? 'Concluído' : 'Pendente'} · {task.label}
                  </AppText>
                  <AppText style={[styles.taskDescription, { color: darkMode ? '#cbd5e1' : '#475569' }]}>{task.description}</AppText>
                </View>
              );
            })}

            <View className="flex-row gap-2 mt-3">
              <Button title="Fechar" variant="outline" onPress={() => void stopTutorial()} className="flex-1 h-11" />
              <Button title="Concluir agora" onPress={() => void completeAdvanced()} className="flex-1 h-11" />
            </View>
          </View>
        </View>
      </Modal>
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
    left: 16,
    right: 16,
    borderRadius: 16,
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
  advancedCard: {
    marginHorizontal: 16,
    marginTop: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  advancedTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  advancedDescription: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  taskDescription: {
    fontSize: 12,
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
