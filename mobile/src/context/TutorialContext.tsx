import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { getAppPreferences, updateAppPreferences } from '../services/preferences';
import { AnalyticsEventName, subscribeAnalyticsEvents, trackAnalyticsEventDeferred } from '../services/analytics';
import { navigateSafely } from '../navigation/navigationRef';
import { useAuth } from './AuthContext';

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
};

const TutorialContext = createContext<TutorialContextData>({} as TutorialContextData);

type TutorialProviderProps = {
  children: React.ReactNode;
  currentRouteName?: string;
};

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children, currentRouteName }) => {
  const { signed } = useAuth();
  const [beginnerActive, setBeginnerActive] = useState(false);
  const [advancedActive, setAdvancedActive] = useState(false);
  const [beginnerIndex, setBeginnerIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [beginnerCompleted, setBeginnerCompleted] = useState(false);
  const [advancedCompleted, setAdvancedCompleted] = useState(false);
  const [advancedDoneTasks, setAdvancedDoneTasks] = useState<string[]>([]);
  const targetRefs = useRef<Record<string, View | null>>({});

  const currentStep = BEGINNER_STEPS[beginnerIndex] ?? null;

  const persistState = useCallback(
    async (partial: {
      tutorial_beginner_completed?: boolean;
      tutorial_advanced_completed?: boolean;
      tutorial_last_step?: string | null;
      tutorial_advanced_tasks_done?: string[];
    }) => {
      await updateAppPreferences(partial as any);
    },
    []
  );

  const measureCurrentStep = useCallback(() => {
    if (!beginnerActive || !currentStep) {
      setSpotlightRect(null);
      return;
    }

    const target = targetRefs.current[currentStep.targetId];
    if (!target || typeof target.measureInWindow !== 'function') {
      setSpotlightRect(null);
      return;
    }

    target.measureInWindow((x, y, width, height) => {
      if (!width || !height) {
        setSpotlightRect(null);
        return;
      }
      setSpotlightRect({
        x: Math.max(0, x - 8),
        y: Math.max(0, y - 8),
        width: width + 16,
        height: height + 16,
      });
    });
  }, [beginnerActive, currentStep]);

  const registerTarget = useCallback((id: string, ref: View | null) => {
    targetRefs.current[id] = ref;
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    delete targetRefs.current[id];
  }, []);

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
    async (options?: { replay?: boolean }) => {
      const replay = Boolean(options?.replay);
      setAdvancedActive(false);
      setBeginnerIndex(0);
      setBeginnerActive(true);
      if (replay) {
        setBeginnerCompleted(false);
        await persistState({
          tutorial_beginner_completed: false,
          tutorial_last_step: BEGINNER_STEPS[0]?.id ?? null,
        });
      }
      trackAnalyticsEventDeferred({
        event_name: 'tutorial_reopened',
        screen: 'TutorialBeginner',
        metadata: { mode: 'beginner' },
      });
      navigateSafely(BEGINNER_STEPS[0].screen);
    },
    [persistState]
  );

  const startAdvancedTutorial = useCallback(
    async (options?: { replay?: boolean }) => {
      const replay = Boolean(options?.replay);
      setBeginnerActive(false);
      setAdvancedActive(true);
      if (replay) {
        setAdvancedCompleted(false);
        setAdvancedDoneTasks([]);
        await persistState({
          tutorial_advanced_completed: false,
          tutorial_advanced_tasks_done: [],
        });
      }
      trackAnalyticsEventDeferred({
        event_name: 'tutorial_reopened',
        screen: 'TutorialAdvanced',
        metadata: { mode: 'advanced' },
      });
    },
    [persistState]
  );

  const stopTutorial = useCallback(async () => {
    setBeginnerActive(false);
    setAdvancedActive(false);
    await persistState({ tutorial_last_step: null });
  }, [persistState]);

  const completeBeginner = useCallback(async () => {
    setBeginnerActive(false);
    setBeginnerCompleted(true);
    await persistState({
      tutorial_beginner_completed: true,
      tutorial_last_step: null,
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
      setBeginnerIndex(nextIndex);
      await persistState({ tutorial_last_step: step.id });
      navigateSafely(step.screen);
    },
    [persistState]
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
    if (!signed) return;
    let mounted = true;

    const bootstrapTutorial = async () => {
      const prefs = await getAppPreferences();
      if (!mounted) return;

      const beginnerDone = Boolean((prefs as any).tutorial_beginner_completed);
      const advancedDone = Boolean((prefs as any).tutorial_advanced_completed);
      const advancedDoneList = Array.isArray((prefs as any).tutorial_advanced_tasks_done)
        ? (prefs as any).tutorial_advanced_tasks_done.filter((item: unknown) => typeof item === 'string')
        : [];

      setBeginnerCompleted(beginnerDone);
      setAdvancedCompleted(advancedDone);
      setAdvancedDoneTasks(advancedDoneList);

      if (!prefs.onboarding_seen || !prefs.onboarding_mode) return;

      if (prefs.onboarding_mode === 'beginner' && !beginnerDone) {
        await startBeginnerTutorial();
      }

      if (prefs.onboarding_mode === 'advanced' && !advancedDone) {
        await startAdvancedTutorial();
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
    const timeout = setTimeout(measureCurrentStep, 120);
    return () => clearTimeout(timeout);
  }, [beginnerActive, currentStep, currentRouteName, measureCurrentStep]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (beginnerActive) measureCurrentStep();
    }, 450);
    return () => clearInterval(interval);
  }, [beginnerActive, measureCurrentStep]);

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
    const windowHeight = Dimensions.get('window').height;
    if (!spotlightRect) return windowHeight * 0.62;
    const afterTarget = spotlightRect.y + spotlightRect.height + 16;
    return Math.min(Math.max(24, afterTarget), windowHeight - 240);
  }, [spotlightRect]);

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
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}

      <Modal visible={beginnerActive} transparent animationType="fade" statusBarTranslucent onRequestClose={() => void skipBeginner()}>
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

          <View style={[styles.tooltipCard, { top: tooltipTop }]}>
            <AppText className="text-slate-900 text-base font-bold">{currentStep?.title}</AppText>
            <AppText className="text-slate-600 text-sm mt-1">{currentStep?.description}</AppText>
            <AppText className="text-slate-400 text-xs mt-2">
              Passo {Math.min(beginnerIndex + 1, BEGINNER_STEPS.length)} de {BEGINNER_STEPS.length}
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

      <Modal visible={advancedActive} transparent animationType="fade" statusBarTranslucent onRequestClose={() => void stopTutorial()}>
        <View style={styles.overlayRoot}>
          <Pressable style={[StyleSheet.absoluteFillObject, styles.dim]} onPress={() => void stopTutorial()} />
          <View style={styles.advancedCard}>
            <AppText className="text-slate-900 text-lg font-bold">Checklist rápido (Avançado)</AppText>
            <AppText className="text-slate-600 text-sm mt-1 mb-3">
              Complete os objetivos para finalizar seu tutorial avançado.
            </AppText>

            {ADVANCED_TASKS.map((task) => {
              const done = advancedDoneTasks.includes(task.id);
              return (
                <View key={task.id} className={`rounded-xl border px-3 py-3 mb-2 ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <AppText className={`font-bold text-sm ${done ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {done ? 'Concluído' : 'Pendente'} · {task.label}
                  </AppText>
                  <AppText className="text-slate-600 text-xs mt-1">{task.description}</AppText>
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
  tooltipCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  advancedCard: {
    marginHorizontal: 16,
    marginTop: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
});

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial deve ser usado dentro de TutorialProvider');
  }
  return context;
};
