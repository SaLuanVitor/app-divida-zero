import { Platform } from 'react-native';
import { AppPreferences } from '../types/settings';
import { FinancialRecordDto } from '../types/financialRecord';

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export type ManualNotificationKind = 'test' | 'due_today' | 'due_tomorrow' | 'weekly_summary' | 'xp_badge' | 'generic';
type NotificationData = Record<string, unknown> & { source?: string; kind?: string };
export type NotificationRuntimeReason =
  | 'available'
  | 'native_module_mismatch'
  | 'permission_denied'
  | 'expo_go_limited'
  | 'unavailable';
export type NotificationRuntimeStatus = {
  available: boolean;
  reason: NotificationRuntimeReason;
};

type NotificationSendResult =
  | { sent: true }
  | { sent: false; reason: 'permission_denied' | 'native_module_mismatch' | 'expo_go_limited' | 'unavailable' | 'disabled' };

let cachedNotificationsModule: any | null | undefined;
let cachedExpoGoDetection: boolean | undefined;
let cachedRuntimeStatus: NotificationRuntimeStatus | undefined;
let cachedModuleLoadError: unknown | undefined;
let handlerConfigured = false;

const APP_NOTIFICATION_SOURCE = 'divida_zero_mobile';
const DEVICE_XP_NOTIFICATIONS_ENABLED = false;
const NOTIFICATION_CHANNEL_ID = 'default';
const FALLBACK_NOTIFICATION_TITLE = 'Dívida Zero';

const NOTIFICATION_BODY_FALLBACKS: Record<ManualNotificationKind, string> = {
  test: 'Notificações no celular ativadas com sucesso.',
  due_today: 'Você tem pendências para hoje. Abra o app para revisar.',
  due_tomorrow: 'Você tem pendências para amanhã. Organize-se no app.',
  weekly_summary: 'Seu resumo semanal está disponível no app.',
  xp_badge: 'Você recebeu uma atualização de progresso no app.',
  generic: 'Abra o app para ver os detalhes.',
};

const sanitizeText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
};

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

const inferRuntimeReasonFromError = (error: unknown): NotificationRuntimeReason => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  if (
    normalized.includes('cannot find native module') ||
    normalized.includes('expotopicsubscriptionmodule') ||
    normalized.includes('exponotificationshandlermodule') ||
    normalized.includes('exponotificationscheduler') ||
    normalized.includes('expobackgroundnotificationtasksmodule')
  ) {
    return 'native_module_mismatch';
  }
  return 'unavailable';
};

const getNotificationsModule = () => {
  if (cachedNotificationsModule !== undefined) return cachedNotificationsModule;

  if (isExpoGoClient()) {
    cachedNotificationsModule = null;
    cachedModuleLoadError = null;
    return cachedNotificationsModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedNotificationsModule = require('expo-notifications');
    cachedModuleLoadError = null;
  } catch (error) {
    cachedNotificationsModule = null;
    cachedModuleLoadError = error;
  }

  return cachedNotificationsModule;
};

export const buildNotificationContent = ({
  title,
  body,
  kind = 'generic',
  data = {},
}: {
  title?: string | null;
  body?: string | null;
  kind?: ManualNotificationKind;
  data?: NotificationData;
}) => {
  const sanitizedTitle = sanitizeText(title);
  const sanitizedBody = sanitizeText(body);
  const normalizedKind = sanitizeText(kind) || 'generic';
  const safeKind = (Object.keys(NOTIFICATION_BODY_FALLBACKS).includes(normalizedKind)
    ? normalizedKind
    : 'generic') as ManualNotificationKind;

  const fallbackTitleApplied = !sanitizedTitle;
  const fallbackBodyApplied = !sanitizedBody;
  const finalTitle = sanitizedTitle || FALLBACK_NOTIFICATION_TITLE;
  const finalBody = sanitizedBody || NOTIFICATION_BODY_FALLBACKS[safeKind];

  if (__DEV__ && (fallbackTitleApplied || fallbackBodyApplied)) {
    // eslint-disable-next-line no-console
    console.info('[notifications] fallback content applied', {
      kind: safeKind,
      fallbackTitleApplied,
      fallbackBodyApplied,
    });
  }

  return {
    title: finalTitle,
    body: finalBody,
    data: {
      ...data,
      source: sanitizeText(data.source) || APP_NOTIFICATION_SOURCE,
      kind: sanitizeText(data.kind) || safeKind,
    },
  };
};

const runtimeUnavailable = (reason: NotificationRuntimeReason): NotificationRuntimeStatus => ({
  available: false,
  reason,
});

export const getDeviceNotificationRuntimeStatus = async (): Promise<NotificationRuntimeStatus> => {
  if (cachedRuntimeStatus && cachedRuntimeStatus.reason !== 'permission_denied') {
    return cachedRuntimeStatus;
  }

  if (isExpoGoClient()) {
    cachedRuntimeStatus = runtimeUnavailable('expo_go_limited');
    return cachedRuntimeStatus;
  }

  const Notifications = getNotificationsModule();
  if (!Notifications) {
    const reason = cachedModuleLoadError ? inferRuntimeReasonFromError(cachedModuleLoadError) : 'unavailable';
    cachedRuntimeStatus = runtimeUnavailable(reason);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info('[notifications] runtime unavailable', {
        reason,
        hasModuleLoadError: Boolean(cachedModuleLoadError),
      });
    }
    return cachedRuntimeStatus;
  }

  if (
    typeof Notifications.scheduleNotificationAsync !== 'function' ||
    typeof Notifications.getPermissionsAsync !== 'function'
  ) {
    cachedRuntimeStatus = runtimeUnavailable('unavailable');
    return cachedRuntimeStatus;
  }

  const permissionStatus = await getDeviceNotificationPermissionStatus();
  if (permissionStatus === 'denied') {
    cachedRuntimeStatus = runtimeUnavailable('permission_denied');
    return cachedRuntimeStatus;
  }

  cachedRuntimeStatus = { available: true, reason: 'available' };
  return cachedRuntimeStatus;
};

export const isDeviceNotificationRuntimeAvailable = async (): Promise<boolean> => {
  const runtime = await getDeviceNotificationRuntimeStatus();
  return runtime.available;
};

const buildSchedulePayload = ({
  kind,
  title,
  body,
  data,
}: {
  kind: ManualNotificationKind;
  title?: string | null;
  body?: string | null;
  data?: NotificationData;
}) => {
  const normalized = buildNotificationContent({
    kind,
    title,
    body,
    data: {
      source: APP_NOTIFICATION_SOURCE,
      kind,
      ...data,
    },
  });

  return {
    ...normalized,
    ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
  };
};

export const initializeNotificationLayer = () => {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    const reason = isExpoGoClient()
      ? 'expo_go_limited'
      : cachedModuleLoadError
      ? inferRuntimeReasonFromError(cachedModuleLoadError)
      : 'unavailable';
    cachedRuntimeStatus = runtimeUnavailable(reason);
    return;
  }

  if (handlerConfigured) return;

  try {
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Notificações',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f48c25',
      }).catch(() => {});
    }
  } catch (error) {
    cachedNotificationsModule = null;
    cachedModuleLoadError = error;
    cachedRuntimeStatus = runtimeUnavailable(inferRuntimeReasonFromError(error));
    return;
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
    if (current?.status === 'granted' || current?.granted === true) {
      cachedRuntimeStatus = { available: true, reason: 'available' };
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    const granted = requested?.status === 'granted' || requested?.granted === true;
    cachedRuntimeStatus = granted ? { available: true, reason: 'available' } : runtimeUnavailable('permission_denied');
    return granted;
  } catch {
    cachedRuntimeStatus = runtimeUnavailable('unavailable');
    return false;
  }
};

export const sendManualNotification = async ({
  kind,
  title,
  body,
  data,
}: {
  kind: ManualNotificationKind;
  title?: string;
  body?: string;
  data?: NotificationData;
}): Promise<NotificationSendResult> => {
  const runtime = await getDeviceNotificationRuntimeStatus();
  if (!runtime.available) {
    if (runtime.reason === 'permission_denied') return { sent: false, reason: 'permission_denied' };
    if (runtime.reason === 'native_module_mismatch') return { sent: false, reason: 'native_module_mismatch' };
    if (runtime.reason === 'expo_go_limited') return { sent: false, reason: 'expo_go_limited' };
    return { sent: false, reason: 'unavailable' };
  }

  const Notifications = getNotificationsModule();
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
    return { sent: false, reason: 'unavailable' };
  }

  const status = await getDeviceNotificationPermissionStatus();
  if (status !== 'granted') return { sent: false, reason: 'permission_denied' };

  try {
    await Notifications.scheduleNotificationAsync({
      content: buildSchedulePayload({ kind, title, body, data }),
      trigger: null,
    });
    return { sent: true };
  } catch {
    return { sent: false, reason: 'unavailable' };
  }
};

export const sendLocalTestNotification = async (): Promise<NotificationSendResult> =>
  sendManualNotification({
    kind: 'test',
    title: 'Dívida Zero',
    body: 'Notificações no celular ativadas com sucesso.',
  });

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
  } catch {
    // Ignore scheduling cleanup failures.
  }
};

export const syncScheduledLocalNotifications = async ({
  prefs,
  records,
}: {
  prefs: AppPreferences;
  records: FinancialRecordDto[];
}) => {
  const runtime = await getDeviceNotificationRuntimeStatus();
  if (!runtime.available && runtime.reason !== 'permission_denied') {
    return { synced: false as const, reason: 'unavailable' as const };
  }

  const Notifications = getNotificationsModule();
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
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
          content: buildSchedulePayload({
            kind: 'due_today',
            title: 'Vencimentos de hoje',
            body: `Você tem ${dueTodayCount} lançamento(s) pendente(s) para hoje.`,
          }),
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
          content: buildSchedulePayload({
            kind: 'due_tomorrow',
            title: 'Lembrete para amanhã',
            body: `Você tem ${dueTomorrowCount} lançamento(s) pendente(s) para amanhã.`,
          }),
          trigger: atNineAM(tomorrow),
        });
      }
    }

    if (prefs.notify_weekly_summary) {
      const pendingCount = getPendingTotalCount(records);
      await Notifications.scheduleNotificationAsync({
        content: buildSchedulePayload({
          kind: 'weekly_summary',
          title: 'Resumo semanal',
          body:
            pendingCount > 0
              ? `Semana iniciando: você tem ${pendingCount} lançamento(s) pendente(s).`
              : 'Semana iniciando: sem pendências no momento. Continue assim.',
        }),
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
}): Promise<NotificationSendResult> => {
  if (!DEVICE_XP_NOTIFICATIONS_ENABLED) {
    return { sent: false, reason: 'disabled' };
  }

  if (!enabled) return { sent: false, reason: 'disabled' };

  return sendManualNotification({
    kind: 'xp_badge',
    title,
    body,
  });
};
