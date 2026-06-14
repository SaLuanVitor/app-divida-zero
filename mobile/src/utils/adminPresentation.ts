const FALLBACK_NO_DATA = 'Sem dados no período';

const EVENT_LABELS: Record<string, string> = {
  onboarding_viewed: 'Onboarding iniciado',
  onboarding_completed: 'Onboarding concluído',
  onboarding_skipped: 'Onboarding pulado',
  tutorial_reopened: 'Tutorial reaberto',
  app_rating_submitted: 'Avaliação enviada',
  goal_created: 'Meta criada',
  record_created: 'Lançamento criado',
  app_opened: 'Aplicativo aberto',
};

const SCREEN_LABELS: Record<string, string> = {
  Home: 'Início',
  Onboarding: 'Onboarding',
  Tutorial: 'Tutorial',
  Metas: 'Metas',
  Lancamentos: 'Lançamentos',
  Relatorios: 'Relatórios',
  Perfil: 'Perfil',
  AdminDashboard: 'Painel administrativo',
  AdminUsers: 'Gestão de usuários',
};

export const toNumberSafe = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toFixedSafe = (value: unknown, digits = 2): string => toNumberSafe(value).toFixed(digits);

export const formatPercentSafe = (value: unknown, digits = 2): string => `${toFixedSafe(value, digits)}%`;

export const formatCountSafe = (value: unknown): string => {
  const numeric = toNumberSafe(value);
  if (!Number.isFinite(numeric)) return '0';
  if (Math.floor(numeric) === numeric) return String(numeric);
  return numeric.toFixed(2);
};

export const formatDonutValue = (value: unknown): string => {
  const numeric = toNumberSafe(value);
  if (numeric === 0) return '0';
  if (Math.floor(numeric) === numeric) return String(numeric);
  return numeric.toFixed(2);
};

const prettifyUnknownLabel = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

export const toFriendlyEventLabel = (value?: string): string => {
  if (!value) return FALLBACK_NO_DATA;
  return EVENT_LABELS[value] ?? prettifyUnknownLabel(value);
};

export const toFriendlyScreenLabel = (value?: string): string => {
  if (!value) return FALLBACK_NO_DATA;
  return SCREEN_LABELS[value] ?? prettifyUnknownLabel(value);
};

export const fallbackNoData = FALLBACK_NO_DATA;
