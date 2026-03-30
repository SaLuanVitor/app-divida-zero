import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { listFinancialRecords } from './financialRecords';
import { listGamificationEvents } from './gamification';
import { defaultAppPreferences, getAppPreferences } from './preferences';
import { AppPreferences } from '../types/settings';
import { FinancialRecordDto } from '../types/financialRecord';
import { GamificationEventDto } from '../types/gamification';
import { NotificationHistoryItem } from '../types/notificationCenter';

const LAST_SEEN_AT_KEY = '@DividaZero:notificationCenter:lastSeenAt';
const MAX_HISTORY_ITEMS = 120;

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimestamp = (value: string | Date | undefined | null) => {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

type BackendNotificationAlert = {
  id: number;
  alert_type: string;
  title: string;
  message: string;
  due_count?: number;
  window_key?: string;
  metadata?: Record<string, unknown>;
  read?: boolean;
  created_at: string;
};

const withReadState = (items: NotificationHistoryItem[], lastSeenAtIso: string | null) => {
  const lastSeenMs = lastSeenAtIso ? new Date(lastSeenAtIso).getTime() : 0;
  if (!lastSeenMs) {
    return items.map((item) => ({ ...item, read: Boolean(item.read) }));
  }

  return items.map((item) => ({
    ...item,
    read: Boolean(item.read) || new Date(item.created_at).getTime() <= lastSeenMs,
  }));
};

const mapGamificationEventToNotification = (event: GamificationEventDto): NotificationHistoryItem | null => {
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
    case 'record_created': {
      kind = 'record';
      const recordTitle = String(metadata.record_title || '').trim();
      title = recordTitle ? `Lancamento criado: ${recordTitle}` : 'Lancamento criado';
      message = `Novo registro salvo com recompensa de ${pointsText}.`;
      break;
    }
    case 'expense_paid': {
      kind = 'record';
      const recordTitle = String(metadata.record_title || '').trim();
      title = recordTitle ? `Pagamento confirmado: ${recordTitle}` : 'Pagamento confirmado';
      message = `Voce recebeu ${pointsText} ao marcar a quitacao.`;
      break;
    }
    case 'goal_created': {
      kind = 'goal';
      const goalTitle = String(metadata.goal_title || '').trim();
      title = goalTitle ? `Meta criada: ${goalTitle}` : 'Meta criada';
      message = `Voce recebeu ${pointsText} por iniciar esta meta.`;
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
    default: {
      const fallbackTitle = event.event_type
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      title = fallbackTitle || 'Atualizacao';
      message = `Evento registrado na sua jornada (${pointsText}).`;
      kind = 'system';
      break;
    }
  }

  return {
    id: `event-${event.id}`,
    kind,
    title,
    message,
    created_at: event.created_at || new Date().toISOString(),
    points: pointsValue,
    event_type: event.event_type,
    metadata,
    read: false,
  };
};

const mapBackendAlertToNotification = (alert: BackendNotificationAlert): NotificationHistoryItem => ({
  id: `backend-alert-${alert.id}`,
  kind: 'reminder',
  title: String(alert.title || 'Alerta'),
  message: String(alert.message || 'Voce possui um alerta pendente.'),
  created_at: alert.created_at || new Date().toISOString(),
  read: Boolean(alert.read),
  metadata: alert.metadata || {},
});

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
  const [eventsResult, recordsResult, prefsResult, lastSeenAtResult, backendAlertsResult] = await Promise.allSettled([
    listGamificationEvents({ force }),
    listFinancialRecords(undefined, undefined, { force }),
    getAppPreferences(),
    AsyncStorage.getItem(LAST_SEEN_AT_KEY),
    api.get('/notifications/history'),
  ]);

  const events =
    eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value?.events)
      ? eventsResult.value.events
      : [];
  const records =
    recordsResult.status === 'fulfilled' && Array.isArray(recordsResult.value?.records)
      ? recordsResult.value.records
      : [];
  const prefs =
    prefsResult.status === 'fulfilled'
      ? prefsResult.value
      : defaultAppPreferences;
  const lastSeenAtIso =
    lastSeenAtResult.status === 'fulfilled'
      ? lastSeenAtResult.value
      : null;
  const backendAlerts =
    backendAlertsResult.status === 'fulfilled' &&
    Array.isArray((backendAlertsResult.value?.data as { notifications?: BackendNotificationAlert[] } | undefined)?.notifications)
      ? ((backendAlertsResult.value?.data as { notifications?: BackendNotificationAlert[] }).notifications || [])
      : [];

  const eventItems = events
    .map(mapGamificationEventToNotification)
    .filter((item): item is NotificationHistoryItem => !!item);

  const reminderItems = buildReminderNotifications(records, prefs);
  const backendAlertItems = backendAlerts.map(mapBackendAlertToNotification);

  const sorted = [...backendAlertItems, ...reminderItems, ...eventItems]
    .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at))
    .slice(0, MAX_HISTORY_ITEMS);

  return withReadState(sorted, lastSeenAtIso);
};

export const markNotificationHistorySeen = async (seenAt: Date = new Date()) => {
  await AsyncStorage.setItem(LAST_SEEN_AT_KEY, seenAt.toISOString());

  try {
    await api.patch('/notifications/read_all');
  } catch {
    // Keep local flow stable even if backend read sync fails.
  }
};

export const getUnreadNotificationCount = async (options: { force?: boolean } = {}) => {
  const history = await listNotificationHistory(options);
  return history.filter((item) => !item.read).length;
};
