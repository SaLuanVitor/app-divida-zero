export type ClampContext = 'card' | 'list' | 'title' | 'kpi_label' | 'kpi_value' | 'legend';

export const isCompactDevice = (width: number): boolean => width < 380;

export const isLargeDevice = (width: number): boolean => width >= 768;

export const controlHeight = (
  fontScale: number,
  largerTouchTargets: boolean,
  baseHeight: number,
  options?: { minTouchHeight?: number; maxScale?: number }
): number => {
  const minTouchHeight = options?.minTouchHeight ?? 44;
  const maxScale = options?.maxScale ?? 1.4;
  const safeScale = Math.max(1, Math.min(fontScale || 1, maxScale));
  const scaled = Math.round(baseHeight * safeScale);
  const touchTarget = largerTouchTargets ? Math.max(minTouchHeight, 52) : minTouchHeight;
  return Math.max(scaled, touchTarget);
};

export const textClampLines = (context: ClampContext): number => {
  if (context === 'title') return 1;
  if (context === 'kpi_value') return 1;
  if (context === 'kpi_label') return 2;
  if (context === 'legend') return 2;
  return 2;
};

export const threeColumnItemWidth = (containerWidth: number, gap = 8): number => {
  const safeWidth = Math.max(containerWidth, 240);
  const width = Math.floor((safeWidth - gap * 2) / 3);
  return Math.max(72, width);
};

const TAB_LABEL_FALLBACKS: Record<string, string> = {
  Inicio: 'Início',
  Metas: 'Metas',
  Lancamentos: 'Lanç.',
  Relatorios: 'Relat.',
  Perfil: 'Perfil',
};

export const resolveTabLabel = (label: string, fontScale: number, compact: boolean): string => {
  const needsFallback = compact || fontScale >= 1.15;
  if (!needsFallback) return label;
  return TAB_LABEL_FALLBACKS[label] ?? label;
};
