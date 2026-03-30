import AsyncStorage from '@react-native-async-storage/async-storage';
import { listFinancialRecords } from './financialRecords';
import { listGamificationEvents } from './gamification';
import { getAppPreferences } from './preferences';
import { AppPreferences } from '../types/settings';
import { FinancialRecordDto } from '../types/financialRecord';
import { GamificationEventDto } from '../types/gamification';
import { NotificationHistoryItem } from '../types/notificationCenter';

const LAST_SEEN_AT_KEY = '@DividaZero:notificationCenter:lastSeenAt';
const MAX_HISTORY_ITEMS = 120;

const NOTIFIABLE_EVENT_TYPES = new Set([
  'achievement_unlocked',
  'goal_completed',
  'goal_progress_milestone',
  'daily_achievement_completed',
  'income_received',
  'expense_paid',
  'record_deleted',
  'goal_deleted',
]);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const withReadState = (items: NotificationHistoryItem[], lastSeenAtIso: string | null) => {
  const lastSeenMs = lastSeenAtIso ? new Date(lastSeenAtIso).getTime() : 0;
  if (!lastSeenMs) {
    return items.map((item) => ({ ...item, read: false }));
  }

  return items.map((item) => ({
    ...item,
    read: new Date(item.created_at).getTime() <= lastSeenMs,
  }));
};

const mapGamificationEventToNotification = (event: GamificationEventDto): NotificationHistoryItem | null => {
  if (!NOTIFIABLE_EVENT_TYPES.has(event.event_type)) return null;

  const metadata = (event.metadata || {}) as Record<string, unknown>;
  const pointsValue = Number(event.points || 0);
  const pointsText = pointsValue > 0 ? `+${pointsValue} XP` : `${pointsValue} XP`;

  let title = 'Atualizacao da jornada';
  let message = 'Sua jornada teve uma atualizacao recente.';
  let kind: NotificationHistoryItem['kind'] = 'system';

  switch (event.event_type) {
    case 'achievement_unlocked': {
      kind = 'achievement';
      const achievementLabel = String(metadata.achievement_label || '').trim();
      title = achievementLabel ? `Conquista: ${achievementLabel}` : 'Nova conquista desbloqueada';
      message = `Voce recebeu ${pointsText} por esta conquista.`;
      break;
    }
    case 'goal_completed': {
      kind = 'goal';
      const goalTitle = String(metadata.goal_title || '').trim();
      title = goalTitle ? `Meta concluida: ${goalTitle}` : 'Meta concluida';
      message = `Parabens, voce recebeu ${pointsText}.`;
      break;
    }
    case 'goal_progress_milestone': {
      kind = 'goal';
      const goalTitle = String(metadata.goal_title || '').trim();
      const milestone = Number(metadata.milestone || 0);
      title = milestone > 0 ? `Meta avancou para ${milestone}%` : 'Meta avancou';
      message = goalTitle
        ? `${goalTitle} avancou de nivel de progresso (${pointsText}).`
        : `Seu progresso de meta rendeu ${pointsText}.`;
      break;
    }
    case 'daily_achievement_completed': {
      kind = 'achievement';
      const dailyTitle = String(metadata.daily_title || '').trim();
      title = dailyTitle ? `Conquista diaria: ${dailyTitle}` : 'Conquista diaria concluida';
      message = `Recompensa aplicada automaticamente: ${pointsText}.`;
      break;
    }
    case 'income_received': {
      kind = 'record';
      const recordTitle = String(metadata.record_title || '').trim();
      title = recordTitle ? `Ganho confirmado: ${recordTitle}` : 'Ganho confirmado';
      message = `Voce recebeu ${pointsText} ao marcar o ganho como recebido.`;
      break;
    }
    case 'expense_paid': {
      kind = 'record';
      const recordTitle = String(metadata.record_title || '').trim();
      title = recordTitle ? `Pagamento confirmado: ${recordTitle}` : 'Pagamento confirmado';
      message = `Voce recebeu ${pointsText} ao marcar a quitacao.`;
      break;
    }
    case 'record_deleted': {
      kind = 'record';
      title = 'Registro removido';
      message = `Ajuste automatico aplicado no XP (${pointsText}).`;
      break;
    }
    case 'goal_deleted': {
      kind = 'goal';
      const goalTitle = String(metadata.goal_title || '').trim();
      title = goalTitle ? `Meta removida: ${goalTitle}` : 'Meta removida';
      message = `Ajuste automatico aplicado no XP (${pointsText}).`;
      break;
    }
    default:
      return null;
  }

  return {
    id: `event-${event.id}`,
    kind,
    title,
    message,
    created_at: event.created_at,
    points: pointsValue,
    event_type: event.event_type,
    metadata,
    read: false,
  };
};

const buildReminderNotifications = (
  records: FinancialRecordDto[],
  prefs: AppPreferences
): NotificationHistoryItem[] => {
  if (!prefs.notifications_enabled) return [];

  const now = new Date();
  const todayKey = toDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueTomorrowCount = 0;

  records.forEach((record) => {
    if (record.status !== 'pending') return;

    const dueDate = new Date(`${record.due_date}T00:00:00`);
    const dueKey = toDateKey(dueDate);

    if (dueKey < todayKey) {
      overdueCount += 1;
      return;
    }
    if (dueKey === todayKey) {
      dueTodayCount += 1;
      return;
    }
    if (dueKey === tomorrowKey) {
      dueTomorrowCount += 1;
    }
  });

  const reminders: NotificationHistoryItem[] = [];
  const baseDate = new Date();
  baseDate.setHours(9, 0, 0, 0);

  if (overdueCount > 0) {
    reminders.push({
      id: `reminder-overdue-${todayKey}-${overdueCount}`,
      kind: 'reminder',
      title: 'Pendencias em atraso',
      message: `Voce tem ${overdueCount} lancamento(s) pendente(s) em atraso.`,
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  if (prefs.notify_due_today && dueTodayCount > 0) {
    reminders.push({
      id: `reminder-due-today-${todayKey}-${dueTodayCount}`,
      kind: 'reminder',
      title: 'Vencimentos de hoje',
      message: `Voce tem ${dueTodayCount} lancamento(s) pendente(s) para hoje.`,
      created_at: baseDate.toISOString(),
      read: false,
    });
  }

  if (prefs.notify_due_tomorrow && dueTomorrowCount > 0) {
    reminders.push({
      id: `reminder-due-tomorrow-${todayKey}-${dueTomorrowCount}`,
      kind: 'reminder',
      title: 'Lembrete para amanha',
      message: `Voce tem ${dueTomorrowCount} lancamento(s) pendente(s) para amanha.`,
      created_at: baseDate.toISOString(),
      read: false,
    });
  }

  return reminders;
};

export const listNotificationHistory = async ({ force = false }: { force?: boolean } = {}) => {
  const [eventsResult, recordsResult, prefs, lastSeenAtIso] = await Promise.all([
    listGamificationEvents({ force }),
    listFinancialRecords(undefined, undefined, { force }),
    getAppPreferences(),
    AsyncStorage.getItem(LAST_SEEN_AT_KEY),
  ]);

  const eventItems = (eventsResult.events || [])
    .map(mapGamificationEventToNotification)
    .filter((item): item is NotificationHistoryItem => !!item);

  const reminderItems = buildReminderNotifications(recordsResult.records || [], prefs);

  const sorted = [...reminderItems, ...eventItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, MAX_HISTORY_ITEMS);

  return withReadState(sorted, lastSeenAtIso);
};

export const markNotificationHistorySeen = async (seenAt: Date = new Date()) => {
  await AsyncStorage.setItem(LAST_SEEN_AT_KEY, seenAt.toISOString());
};

export const getUnreadNotificationCount = async (options: { force?: boolean } = {}) => {
  const history = await listNotificationHistory(options);
  return history.filter((item) => !item.read).length;
};
