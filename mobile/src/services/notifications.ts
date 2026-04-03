import { AppPreferences } from '../types/settings';
import { FinancialRecordDto } from '../types/financialRecord';
import { Platform } from 'react-native';

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

let cachedNotificationsModule: any | null | undefined;
let cachedExpoGoDetection: boolean | undefined;
let handlerConfigured = false;
const APP_NOTIFICATION_SOURCE = 'divida_zero_mobile';
const DEVICE_XP_NOTIFICATIONS_ENABLED = false;

const isExpoGoClient = () => {
  if (cachedExpoGoDetection !== undefined) return cachedExpoGoDetection;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoConstantsModule = require('expo-constants');
    const Constants = ExpoConstantsModule?.default ?? ExpoConstantsModule;
    const executionEnvironment = Constants?.executionEnvironment;
    const appOwnership = Constants?.appOwnership;
    cachedExpoGoDetection = executionEnvironment === 'storeClient' || appOwnership === 'expo';
  } catch {
    cachedExpoGoDetection = false;
  }

  return cachedExpoGoDetection;
};

const getNotificationsModule = () => {
  if (cachedNotificationsModule !== undefined) return cachedNotificationsModule;

  // Expo Go (SDK 53+) no longer supports Android remote push APIs.
  // Disable this module there to keep startup behavior stable.
  if (isExpoGoClient()) {
    cachedNotificationsModule = null;
    return cachedNotificationsModule;
  }

  try {
    // Optional dependency: keep app stable if module/native bridge is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedNotificationsModule = require('expo-notifications');
  } catch {
    cachedNotificationsModule = null;
  }

  return cachedNotificationsModule;
};

export const initializeNotificationLayer = () => {
  const Notifications = getNotificationsModule();
  if (!Notifications || handlerConfigured) return;

  if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Notificacoes',
      importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f48c25',
    }).catch(() => {});
  }

  if (typeof Notifications.setNotificationHandler !== 'function') return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Ignore handler setup failures: notification APIs may still be usable.
  }
};

export const getDeviceNotificationPermissionStatus = async (): Promise<NotificationPermissionStatus> => {
  const Notifications = getNotificationsModule();
  if (!Notifications) return 'unavailable';
  if (typeof Notifications.getPermissionsAsync !== 'function') return 'unavailable';

  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions?.granted === true) return 'granted';
    const status = permissions?.status;
    if (status === 'granted' || status === 'denied' || status === 'undetermined') return status;
    if (permissions?.canAskAgain === false) return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
};

export const requestDeviceNotificationPermission = async (): Promise<boolean> => {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  if (
    typeof Notifications.getPermissionsAsync !== 'function' ||
    typeof Notifications.requestPermissionsAsync !== 'function'
  ) {
    return false;
  }

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current?.status === 'granted' || current?.granted === true) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested?.status === 'granted' || requested?.granted === true;
  } catch {
    return false;
  }
};

export const sendLocalTestNotification = async () => {
  const Notifications = getNotificationsModule();
  if (!Notifications) return { sent: false, reason: 'unavailable' as const };
  if (typeof Notifications.scheduleNotificationAsync !== 'function') {
    return { sent: false, reason: 'unavailable' as const };
  }

  const status = await getDeviceNotificationPermissionStatus();
  if (status !== 'granted') return { sent: false, reason: 'permission_denied' as const };

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Dívida Zero',
        body: 'Notificações no celular ativadas com sucesso.',
        data: { source: APP_NOTIFICATION_SOURCE, kind: 'test' },
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
      trigger: null,
    });
    return { sent: true as const };
  } catch {
    return { sent: false, reason: 'unavailable' as const };
  }
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const atNineAM = (base: Date) => {
  const date = new Date(base);
  date.setHours(9, 0, 0, 0);
  return date;
};

const nextMondayAtNine = () => {
  const now = new Date();
  const date = new Date(now);
  const day = now.getDay();
  const diff = day === 1 ? 7 : (8 - day) % 7;
  date.setDate(now.getDate() + diff);
  date.setHours(9, 0, 0, 0);
  return date;
};

const getPendingCountForDate = (records: FinancialRecordDto[], targetDate: Date) =>
  records.filter((record) => {
    if (record.status !== 'pending') return false;
    const due = new Date(`${record.due_date}T00:00:00`);
    return sameDay(due, targetDate);
  }).length;

const getPendingTotalCount = (records: FinancialRecordDto[]) =>
  records.filter((record) => record.status === 'pending').length;

const safeFutureDate = (date: Date) => {
  const now = new Date();
  return date.getTime() > now.getTime() ? date : new Date(now.getTime() + 30 * 1000);
};

const clearScheduledAppNotifications = async (Notifications: any) => {
  if (
    typeof Notifications.getAllScheduledNotificationsAsync !== 'function' ||
    typeof Notifications.cancelScheduledNotificationAsync !== 'function'
  ) {
    return;
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((item: any) => item?.content?.data?.source === APP_NOTIFICATION_SOURCE);
    await Promise.all(ours.map((item: any) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  } catch {}
};

export const syncScheduledLocalNotifications = async ({
  prefs,
  records,
}: {
  prefs: AppPreferences;
  records: FinancialRecordDto[];
}) => {
  const Notifications = getNotificationsModule();
  if (!Notifications) return { synced: false as const, reason: 'unavailable' as const };
  if (typeof Notifications.scheduleNotificationAsync !== 'function') {
    return { synced: false as const, reason: 'unavailable' as const };
  }

  const status = await getDeviceNotificationPermissionStatus();
  if (status !== 'granted') {
    await clearScheduledAppNotifications(Notifications);
    return { synced: false as const, reason: 'permission_denied' as const };
  }

  await clearScheduledAppNotifications(Notifications);

  if (!prefs.notifications_enabled || !prefs.device_push_enabled) {
    return { synced: true as const };
  }

  const now = new Date();

  try {
    if (prefs.notify_due_today) {
      const dueTodayCount = getPendingCountForDate(records, now);
      if (dueTodayCount > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Vencimentos de hoje',
            body: `Você tem ${dueTodayCount} lançamento(s) pendente(s) para hoje.`,
            data: { source: APP_NOTIFICATION_SOURCE, kind: 'due_today' },
            ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          },
          trigger: safeFutureDate(atNineAM(now)),
        });
      }
    }

    if (prefs.notify_due_tomorrow) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const dueTomorrowCount = getPendingCountForDate(records, tomorrow);
      if (dueTomorrowCount > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Lembrete para amanhã',
            body: `Você tem ${dueTomorrowCount} lançamento(s) pendente(s) para amanhã.`,
            data: { source: APP_NOTIFICATION_SOURCE, kind: 'due_tomorrow' },
            ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          },
          trigger: atNineAM(tomorrow),
        });
      }
    }

    if (prefs.notify_weekly_summary) {
      const pendingCount = getPendingTotalCount(records);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Resumo semanal',
          body:
            pendingCount > 0
              ? `Semana iniciando: você tem ${pendingCount} lançamento(s) pendente(s).`
              : 'Semana iniciando: sem pendências no momento. Continue assim.',
          data: { source: APP_NOTIFICATION_SOURCE, kind: 'weekly_summary' },
          ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
        },
        trigger: nextMondayAtNine(),
      });
    }
  } catch {
    return { synced: false as const, reason: 'unavailable' as const };
  }

  return { synced: true as const };
};

export const sendXpAndBadgeNotification = async ({
  enabled,
  title,
  body,
}: {
  enabled: boolean;
  title: string;
  body: string;
}) => {
  if (!DEVICE_XP_NOTIFICATIONS_ENABLED) {
    return { sent: false as const, reason: 'disabled' as const };
  }

  if (!enabled) return { sent: false as const, reason: 'disabled' as const };

  const Notifications = getNotificationsModule();
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
    return { sent: false as const, reason: 'unavailable' as const };
  }

  const status = await getDeviceNotificationPermissionStatus();
  if (status !== 'granted') return { sent: false as const, reason: 'permission_denied' as const };

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { source: APP_NOTIFICATION_SOURCE, kind: 'xp_badge' },
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
      trigger: null,
    });
    return { sent: true as const };
  } catch {
    return { sent: false as const, reason: 'unavailable' as const };
  }
};

