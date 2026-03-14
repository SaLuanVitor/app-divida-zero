import { FinancialGoalDto } from '../types/financialGoal';
import { FinancialRecordDto } from '../types/financialRecord';
import { GamificationEventDto, GamificationSummaryDto } from '../types/gamification';

export type GamificationAchievementId =
  | 'first_record'
  | 'first_settlement'
  | 'ten_records'
  | 'five_settled'
  | 'first_goal_created'
  | 'first_goal_completed'
  | 'goal_before_deadline';

export interface GamificationAchievement {
  id: GamificationAchievementId;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  rewardXp: number;
}

export interface GamificationBadge {
  id: string;
  title: string;
  description: string;
  icon: 'sprout' | 'target' | 'shield' | 'crown';
  unlocked: boolean;
}

export interface GamificationSummary {
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpToNextLevel: number;
  levelProgressPct: number;
  achievements: GamificationAchievement[];
  badges: GamificationBadge[];
  unlockedCount: number;
  settledCount: number;
  recordCount: number;
  goalCount: number;
  completedGoalCount: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const hasAchievementEvent = (events: GamificationEventDto[], key: string) =>
  events.some(
    (event) => event.event_type === 'achievement_unlocked' && String(event.metadata?.achievement_key || '') === key
  );

export const buildGamificationSummary = ({
  records,
  goals,
  events,
  summary,
}: {
  records: FinancialRecordDto[];
  goals: FinancialGoalDto[];
  events: GamificationEventDto[];
  summary: GamificationSummaryDto;
}): GamificationSummary => {
  const recordCount = records.length;
  const settledCount = records.filter((record) => record.status !== 'pending').length;
  const goalCount = goals.length;
  const completedGoalCount = goals.filter((goal) => goal.status === 'completed').length;

  const completedBeforeDeadlineCount = goals.filter((goal) => {
    if (goal.status !== 'completed' || !goal.target_date || !goal.completed_at) return false;
    return new Date(goal.completed_at).getTime() <= new Date(goal.target_date).getTime();
  }).length;

  const achievements: GamificationAchievement[] = [
    {
      id: 'first_record',
      title: 'Primeiro passo',
      description: 'Crie seu primeiro registro financeiro.',
      unlocked: recordCount >= 1,
      progress: clamp(recordCount, 0, 1),
      target: 1,
      rewardXp: 50,
    },
    {
      id: 'first_settlement',
      title: 'Conta resolvida',
      description: 'Marque o primeiro item como pago ou recebido.',
      unlocked: settledCount >= 1,
      progress: clamp(settledCount, 0, 1),
      target: 1,
      rewardXp: 60,
    },
    {
      id: 'ten_records',
      title: 'Organização ativa',
      description: 'Cadastre 10 registros no total.',
      unlocked: recordCount >= 10,
      progress: clamp(recordCount, 0, 10),
      target: 10,
      rewardXp: 120,
    },
    {
      id: 'five_settled',
      title: 'Ritmo constante',
      description: 'Conclua 5 registros.',
      unlocked: settledCount >= 5,
      progress: clamp(settledCount, 0, 5),
      target: 5,
      rewardXp: 140,
    },
    {
      id: 'first_goal_created',
      title: 'Primeira meta criada',
      description: 'Cadastre sua primeira meta financeira.',
      unlocked: goalCount >= 1 || hasAchievementEvent(events, 'first_goal_created'),
      progress: clamp(goalCount, 0, 1),
      target: 1,
      rewardXp: 60,
    },
    {
      id: 'first_goal_completed',
      title: 'Primeira meta concluída',
      description: 'Conclua sua primeira meta financeira.',
      unlocked: completedGoalCount >= 1 || hasAchievementEvent(events, 'first_goal_completed'),
      progress: clamp(completedGoalCount, 0, 1),
      target: 1,
      rewardXp: 80,
    },
    {
      id: 'goal_before_deadline',
      title: 'Antes do prazo',
      description: 'Conclua uma meta antes da data alvo.',
      unlocked: completedBeforeDeadlineCount >= 1 || hasAchievementEvent(events, 'goal_before_deadline'),
      progress: clamp(completedBeforeDeadlineCount, 0, 1),
      target: 1,
      rewardXp: 100,
    },
  ];

  const badges: GamificationBadge[] = [
    {
      id: 'badge_welcome',
      title: 'Boas-vindas',
      description: 'Primeiro registro criado.',
      icon: 'sprout',
      unlocked: recordCount >= 1,
    },
    {
      id: 'badge_consistency',
      title: 'Consistência',
      description: '5 registros concluídos.',
      icon: 'target',
      unlocked: settledCount >= 5,
    },
    {
      id: 'badge_goal_builder',
      title: 'Construtor de metas',
      description: 'Primeira meta criada.',
      icon: 'shield',
      unlocked: goalCount >= 1 || hasAchievementEvent(events, 'first_goal_created'),
    },
    {
      id: 'badge_master',
      title: 'Mestre da dívida zero',
      description: 'Alcance o nível 10.',
      icon: 'crown',
      unlocked: summary.level >= 10,
    },
  ];

  return {
    totalXp: summary.total_xp,
    level: summary.level,
    xpInLevel: summary.xp_in_level,
    xpToNextLevel: summary.xp_to_next_level,
    levelProgressPct: summary.level_progress_pct,
    achievements,
    badges,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
    settledCount,
    recordCount,
    goalCount,
    completedGoalCount,
  };
};

export const formatAchievementProgress = (progress: number, target: number) => `${Math.min(progress, target)}/${target}`;


