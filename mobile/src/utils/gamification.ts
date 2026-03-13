import { FinancialRecordDto } from '../types/financialRecord';

export type GamificationAchievementId =
  | 'first_record'
  | 'first_settlement'
  | 'ten_records'
  | 'five_settled'
  | 'thirty_settled';

export interface GamificationAchievement {
  id: GamificationAchievementId;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  rewardXp: number;
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
}

export interface GamificationBadge {
  id: string;
  title: string;
  description: string;
  icon: 'sprout' | 'target' | 'shield' | 'crown';
  unlocked: boolean;
}

const LEVEL_XP = 500;
const XP_PER_RECORD = 50;
const XP_PER_SETTLED = 20;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const buildGamificationSummary = (records: FinancialRecordDto[]): GamificationSummary => {
  const recordCount = records.length;
  const settledCount = records.filter((record) => record.status !== 'pending').length;

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
      description: 'Marque o primeiro item como pago/recebido.',
      unlocked: settledCount >= 1,
      progress: clamp(settledCount, 0, 1),
      target: 1,
      rewardXp: 60,
    },
    {
      id: 'ten_records',
      title: 'Organizacao ativa',
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
      id: 'thirty_settled',
      title: 'Mestre das finanças',
      description: 'Conclua 30 registros.',
      unlocked: settledCount >= 30,
      progress: clamp(settledCount, 0, 30),
      target: 30,
      rewardXp: 250,
    },
  ];

  const achievementXp = achievements
    .filter((achievement) => achievement.unlocked)
    .reduce((acc, achievement) => acc + achievement.rewardXp, 0);

  const totalXp = recordCount * XP_PER_RECORD + settledCount * XP_PER_SETTLED + achievementXp;
  const level = Math.floor(totalXp / LEVEL_XP) + 1;
  const xpInLevel = totalXp % LEVEL_XP;
  const xpToNextLevel = LEVEL_XP - xpInLevel;
  const levelProgressPct = Math.round((xpInLevel / LEVEL_XP) * 100);

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
      id: 'badge_guardian',
      title: 'Guardião financeiro',
      description: '10 registros concluídos.',
      icon: 'shield',
      unlocked: settledCount >= 10,
    },
    {
      id: 'badge_master',
      title: 'Mestre da dívida zero',
      description: 'Nível 10 alcançado.',
      icon: 'crown',
      unlocked: level >= 10,
    },
  ];

  return {
    totalXp,
    level,
    xpInLevel,
    xpToNextLevel,
    levelProgressPct,
    achievements,
    badges,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
    settledCount,
    recordCount,
  };
};

export const formatAchievementProgress = (progress: number, target: number) => `${Math.min(progress, target)}/${target}`;

