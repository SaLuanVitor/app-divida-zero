export type NotificationHistoryKind =
  | 'achievement'
  | 'goal'
  | 'record'
  | 'reminder'
  | 'system';

export interface NotificationHistoryItem {
  id: string;
  kind: NotificationHistoryKind;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  points?: number;
  event_type?: string;
  metadata?: Record<string, unknown>;
}

