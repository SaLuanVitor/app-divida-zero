export interface GamificationSummaryDto {
  total_xp: number;
  level: number;
  level_title: string;
  level_icon: 'sprout' | 'target' | 'shield' | 'crown' | string;
  xp_in_level: number;
  xp_to_next_level: number;
  level_progress_pct: number;
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
