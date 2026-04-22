export type TutorialDeviceClass = 'compact' | 'standard' | 'large';

export type TutorialTrackState = 'idle' | 'essential' | 'contextual' | 'paused' | 'completed';

export type TutorialSpotlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TutorialInset = {
  top: number;
  bottom: number;
};

export type TutorialStep = {
  id: string;
  title: string;
  description: string;
  screen: string;
  targetId: string;
  cta: string;
};

export type TutorialMission = {
  id: string;
  label: string;
  description: string;
  screen: string;
  cta: string;
  action: 'go_screen' | 'open_lancamentos_income' | 'open_lancamentos_debt';
};

export const ESSENTIAL_STEPS: TutorialStep[] = [
  {
    id: 'home_summary',
    title: 'Resumo inicial',
    description: 'Acompanhe saldos e a proxima acao para manter o controle.',
    screen: 'Inicio',
    targetId: 'home-summary-card',
    cta: 'Entendi',
  },
  {
    id: 'home_calendar',
    title: 'Calendario do mes',
    description: 'Use o calendario para abrir detalhes dos lancamentos por dia.',
    screen: 'Inicio',
    targetId: 'home-calendar-card',
    cta: 'Continuar',
  },
  {
    id: 'home_month_history',
    title: 'Resumo do mes',
    description: 'Aqui voce filtra, busca e acompanha os lancamentos do mes com mais contexto.',
    screen: 'Inicio',
    targetId: 'home-month-history-header',
    cta: 'Continuar',
  },
  {
    id: 'lancamentos_quick_form',
    title: 'Lancamentos rapidos',
    description: 'Registre ganhos ou dividas para alimentar calendario, metas e relatorios.',
    screen: 'Lancamentos',
    targetId: 'lancamentos-form-card',
    cta: 'Continuar',
  },
  {
    id: 'metas_overview',
    title: 'Funcionalidades de Metas',
    description: 'Crie metas e acompanhe seu progresso com aportes e retiradas quando precisar.',
    screen: 'Metas',
    targetId: 'metas-create-button',
    cta: 'Continuar',
  },
  {
    id: 'relatorios_overview',
    title: 'Funcionalidades de Relatorios',
    description: 'Use os filtros e periodos para entender entradas, saidas e projecoes.',
    screen: 'Relatorios',
    targetId: 'relatorios-period-picker',
    cta: 'Continuar',
  },
  {
    id: 'perfil_overview',
    title: 'Funcionalidades do Perfil',
    description: 'No perfil voce ajusta conta, acessibilidade, seguranca e preferencias.',
    screen: 'Perfil',
    targetId: 'perfil-account-card',
    cta: 'Concluir etapa essencial',
  },
];

export const CONTEXTUAL_MISSIONS: TutorialMission[] = [
  {
    id: 'visit_home',
    label: 'Abrir Inicio',
    description: 'Confira o painel principal para validar seu panorama atual.',
    screen: 'Inicio',
    cta: 'Ir para Inicio',
    action: 'go_screen',
  },
  {
    id: 'record_created',
    label: 'Criar 1 lancamento',
    description: 'Registre um ganho ou divida para validar seu fluxo principal.',
    screen: 'Inicio',
    cta: 'Abrir lancamentos',
    action: 'open_lancamentos_debt',
  },
  {
    id: 'goal_created',
    label: 'Criar 1 meta',
    description: 'Cadastre uma meta para acompanhar evolucao.',
    screen: 'Metas',
    cta: 'Ir para Metas',
    action: 'go_screen',
  },
  {
    id: 'reports_viewed',
    label: 'Abrir relatorios',
    description: 'Acesse relatorios para revisar indicadores e filtros.',
    screen: 'Relatorios',
    cta: 'Ir para Relatorios',
    action: 'go_screen',
  },
];

export type LegacyTutorialFlags = {
  tutorial_beginner_completed?: boolean;
  tutorial_advanced_completed?: boolean;
  tutorial_last_step?: string | null;
  tutorial_advanced_tasks_done?: string[];
  tutorial_reopen_enabled?: boolean;
  onboarding_seen?: boolean;
  tutorial_version?: number;
  tutorial_track_state?: TutorialTrackState | null;
  tutorial_missions_done?: string[];
};

export type MigratedTutorialState = {
  tutorial_version: number;
  tutorial_track_state: TutorialTrackState;
  tutorial_missions_done: string[];
};

export const CURRENT_TUTORIAL_VERSION = 2;

export const resolveTutorialDeviceClass = (width: number): TutorialDeviceClass => {
  if (width <= 360) return 'compact';
  if (width >= 412) return 'large';
  return 'standard';
};

export const getTooltipMetrics = (deviceClass: TutorialDeviceClass) => {
  if (deviceClass === 'compact') {
    return { sidePadding: 10, minHeight: 178, borderRadius: 14 };
  }
  if (deviceClass === 'large') {
    return { sidePadding: 20, minHeight: 220, borderRadius: 18 };
  }
  return { sidePadding: 16, minHeight: 196, borderRadius: 16 };
};

export const computeSpotlightRect = ({
  rect,
  windowWidth,
  windowHeight,
  insets,
  padding,
}: {
  rect: TutorialSpotlightRect | null;
  windowWidth: number;
  windowHeight: number;
  insets: TutorialInset;
  padding: number;
}): TutorialSpotlightRect | null => {
  if (!rect) return null;
  if (rect.width <= 0 || rect.height <= 0) return null;

  const safeTop = insets.top + 6;
  const safeBottom = windowHeight - insets.bottom - 6;
  const margin = 12;
  const maxAllowedWidth = Math.max(44, windowWidth - margin * 2);

  const nextWidth = Math.min(rect.width + padding * 2, maxAllowedWidth);
  const maxX = Math.max(margin, windowWidth - margin - nextWidth);
  const nextX = Math.min(Math.max(margin, rect.x - padding), maxX);
  const nextY = Math.max(safeTop, rect.y - padding);
  const nextHeight = Math.min(rect.height + padding * 2, safeBottom - nextY);

  if (nextHeight < 30) return null;
  if (nextY + nextHeight > safeBottom + 2) return null;

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
};

export const getFirstPendingMission = (doneMissionIds: string[]): TutorialMission | null => {
  return CONTEXTUAL_MISSIONS.find((mission) => !doneMissionIds.includes(mission.id)) ?? null;
};

export const migrateLegacyTutorialState = (legacy: LegacyTutorialFlags): MigratedTutorialState => {
  const missionDoneSet = new Set(
    Array.isArray(legacy.tutorial_missions_done)
      ? legacy.tutorial_missions_done
      : Array.isArray(legacy.tutorial_advanced_tasks_done)
      ? legacy.tutorial_advanced_tasks_done
      : []
  );

  if (legacy.tutorial_advanced_completed) {
    CONTEXTUAL_MISSIONS.forEach((mission) => missionDoneSet.add(mission.id));
  }

  if (legacy.tutorial_version === CURRENT_TUTORIAL_VERSION && legacy.tutorial_track_state) {
    return {
      tutorial_version: CURRENT_TUTORIAL_VERSION,
      tutorial_track_state: legacy.tutorial_track_state,
      tutorial_missions_done: Array.from(missionDoneSet),
    };
  }

  if (!legacy.onboarding_seen) {
    return {
      tutorial_version: CURRENT_TUTORIAL_VERSION,
      tutorial_track_state: 'essential',
      tutorial_missions_done: Array.from(missionDoneSet),
    };
  }

  if (legacy.tutorial_beginner_completed && missionDoneSet.size >= CONTEXTUAL_MISSIONS.length) {
    return {
      tutorial_version: CURRENT_TUTORIAL_VERSION,
      tutorial_track_state: 'completed',
      tutorial_missions_done: Array.from(missionDoneSet),
    };
  }

  if (legacy.tutorial_beginner_completed) {
    return {
      tutorial_version: CURRENT_TUTORIAL_VERSION,
      tutorial_track_state: legacy.tutorial_reopen_enabled === false ? 'paused' : 'contextual',
      tutorial_missions_done: Array.from(missionDoneSet),
    };
  }

  return {
    tutorial_version: CURRENT_TUTORIAL_VERSION,
    tutorial_track_state: legacy.tutorial_reopen_enabled === false ? 'paused' : 'essential',
    tutorial_missions_done: Array.from(missionDoneSet),
  };
};

export const resolveTutorialStepIndex = (stepId: string | null | undefined) => {
  if (!stepId) return 0;
  const index = ESSENTIAL_STEPS.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
};
