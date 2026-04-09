export interface GamificationSummaryDto {
  total_xp: number;
  level: number;
  level_title: string;
  level_icon: 'sprout' | 'target' | 'shield' | 'crown' | string;
  xp_in_level: number;
  xp_to_next_level: number;
  level_progress_pct: number;
}

export interface DailyAchievementDto {
  key: string;
  title: string;
  description: string;
  reward_xp: number;
  progress: number;
  target: number;
  completed: boolean;
  date_key: string;
}

export interface GamificationEventDto {
  id: number;
  event_type: string;
  points: number;
  source_type?: string;
  source_id?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface XpFeedbackDto {
  points: number;
  leveled_up: boolean;
  summary: GamificationSummaryDto;
  event?: GamificationEventDto;
}

export const DEFAULT_GAMIFICATION_SUMMARY: GamificationSummaryDto = {
  total_xp: 0,
  level: 1,
  level_title: 'Iniciante',
  level_icon: 'sprout',
  xp_in_level: 0,
  xp_to_next_level: 500,
  level_progress_pct: 0,
};

export const normalizeGamificationSummary = (
  summary?: Partial<GamificationSummaryDto> | null
): GamificationSummaryDto => ({
  total_xp: typeof summary?.total_xp === 'number' ? summary.total_xp : DEFAULT_GAMIFICATION_SUMMARY.total_xp,
  level: typeof summary?.level === 'number' ? summary.level : DEFAULT_GAMIFICATION_SUMMARY.level,
  level_title: typeof summary?.level_title === 'string' && summary.level_title.trim()
    ? summary.level_title
    : DEFAULT_GAMIFICATION_SUMMARY.level_title,
  level_icon: typeof summary?.level_icon === 'string' && summary.level_icon.trim()
    ? summary.level_icon
    : DEFAULT_GAMIFICATION_SUMMARY.level_icon,
  xp_in_level: typeof summary?.xp_in_level === 'number' ? summary.xp_in_level : DEFAULT_GAMIFICATION_SUMMARY.xp_in_level,
  xp_to_next_level: typeof summary?.xp_to_next_level === 'number'
    ? summary.xp_to_next_level
    : DEFAULT_GAMIFICATION_SUMMARY.xp_to_next_level,
  level_progress_pct: typeof summary?.level_progress_pct === 'number'
    ? summary.level_progress_pct
    : DEFAULT_GAMIFICATION_SUMMARY.level_progress_pct,
});

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const normalizeDailyAchievements = (
  daily?: Array<Partial<DailyAchievementDto>> | null
): DailyAchievementDto[] => {
  if (!Array.isArray(daily)) return [];

  return daily.map((item, index) => {
    const fallbackDate = new Date();
    const fallbackDateKey = `${fallbackDate.getFullYear()}-${String(fallbackDate.getMonth() + 1).padStart(2, '0')}-${String(fallbackDate.getDate()).padStart(2, '0')}`;
    const parsedTarget = typeof item?.target === 'number' && item.target > 0 ? Math.floor(item.target) : 1;
    const parsedProgress = typeof item?.progress === 'number' && item.progress >= 0 ? Math.floor(item.progress) : 0;

    return {
      key: typeof item?.key === 'string' && item.key.trim() ? item.key : `daily_${index + 1}`,
      title: typeof item?.title === 'string' && item.title.trim() ? item.title : 'Conquista diária',
      description: typeof item?.description === 'string' && item.description.trim()
        ? item.description
        : 'Complete a ação diária para receber XP.',
      reward_xp: typeof item?.reward_xp === 'number' ? item.reward_xp : 0,
      progress: parsedProgress,
      target: parsedTarget,
      completed: typeof item?.completed === 'boolean' ? item.completed : parsedProgress >= parsedTarget,
      date_key: typeof item?.date_key === 'string' && isIsoDate(item.date_key) ? item.date_key : fallbackDateKey,
    };
  });
};


