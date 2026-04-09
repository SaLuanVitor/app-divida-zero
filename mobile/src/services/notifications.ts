import { Platform } from 'react-native';
import { AppPreferences } from '../types/settings';
import { FinancialRecordDto } from '../types/financialRecord';
import { listFinancialRecords } from './financialRecords';
import { getAppPreferences, updateAppPreferences } from './preferences';

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export type ManualNotificationKind = 'test' | 'due_today' | 'due_tomorrow' | 'weekly_summary' | 'daily_ai_message' | 'xp_badge' | 'generic';
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
type SyncPermissionOptions = {
  markPrompted?: boolean;
  enablePushWhenGranted?: boolean;
};

export type NotificationSendResult =
  | { sent: true }
  | { sent: false; reason: 'permission_denied' | 'native_module_mismatch' | 'expo_go_limited' | 'unavailable' | 'disabled' };

export type ManualNotificationScenarioStep = {
  id: string;
  kind: ManualNotificationKind;
  title: string;
  body: string;
  data?: NotificationData;
};

export type ManualNotificationScenarioResultStep = {
  step: ManualNotificationScenarioStep;
  result: NotificationSendResult;
};

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
  test: 'Atualização da conta disponível no dispositivo.',
  due_today: 'Você tem pendências para hoje. Abra o app para revisar.',
  due_tomorrow: 'Você tem pendências para amanhã. Organize-se no app.',
  weekly_summary: 'Seu resumo semanal está disponível no app.',
  daily_ai_message: 'A mensagem diária de incentivo já está disponível no app.',
  xp_badge: 'Você recebeu uma atualização de progresso no app.',
  generic: 'Abra o app para ver os detalhes.',
};

const sanitizeText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);

const toMoney = (value: string | number | null | undefined) => {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateLabel = (dateIso: string) => {
  const date = new Date(`${dateIso}T00:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
};

const isPending = (record: FinancialRecordDto) => record.status === 'pending';
const isIncome = (record: FinancialRecordDto) => record.flow_type === 'income';
const isExpense = (record: FinancialRecordDto) => record.flow_type === 'expense';

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

const syncPermissionStatusWithPreferences = async (
  status: NotificationPermissionStatus,
  options: SyncPermissionOptions = {}
) => {
  const { markPrompted = false, enablePushWhenGranted = false } = options;
  const currentPrefs = await getAppPreferences();
  const updates: Partial<AppPreferences> = {};

  if (markPrompted && !currentPrefs.notification_permission_prompted) {
    updates.notification_permission_prompted = true;
  }

  if (status === 'granted') {
    if (enablePushWhenGranted && !currentPrefs.device_push_enabled) {
      updates.device_push_enabled = true;
    }
    if (enablePushWhenGranted && !currentPrefs.notifications_enabled) {
      updates.notifications_enabled = true;
    }
  } else if ((status === 'denied' || status === 'unavailable') && currentPrefs.device_push_enabled) {
    updates.device_push_enabled = false;
  }

  if (Object.keys(updates).length > 0) {
    await updateAppPreferences(updates);
  }
};

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

export const requestDeviceNotificationPermission = async (
  options: SyncPermissionOptions = {}
): Promise<boolean> => {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    await syncPermissionStatusWithPreferences('unavailable', options);
    return false;
  }
  if (
    typeof Notifications.getPermissionsAsync !== 'function' ||
    typeof Notifications.requestPermissionsAsync !== 'function'
  ) {
    await syncPermissionStatusWithPreferences('unavailable', options);
    return false;
  }

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current?.status === 'granted' || current?.granted === true) {
      cachedRuntimeStatus = { available: true, reason: 'available' };
      await syncPermissionStatusWithPreferences('granted', options);
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    const granted = requested?.status === 'granted' || requested?.granted === true;
    cachedRuntimeStatus = granted ? { available: true, reason: 'available' } : runtimeUnavailable('permission_denied');
    await syncPermissionStatusWithPreferences(granted ? 'granted' : 'denied', options);
    return granted;
  } catch {
    cachedRuntimeStatus = runtimeUnavailable('unavailable');
    await syncPermissionStatusWithPreferences('unavailable', options);
    return false;
  }
};

export const ensurePostLoginNotificationPermission = async () => {
  const runtime = await getDeviceNotificationRuntimeStatus();
  const statusBeforePrompt = await getDeviceNotificationPermissionStatus();
  const prefs = await getAppPreferences();

  if (!runtime.available && runtime.reason !== 'permission_denied') {
    await syncPermissionStatusWithPreferences(statusBeforePrompt, {
      markPrompted: true,
      enablePushWhenGranted: false,
    });
    return {
      prompted: false as const,
      status: statusBeforePrompt,
      runtime: runtime.reason,
    };
  }

  if (prefs.notification_permission_prompted) {
    await syncPermissionStatusWithPreferences(statusBeforePrompt, {
      markPrompted: false,
      enablePushWhenGranted: false,
    });
    return {
      prompted: false as const,
      status: statusBeforePrompt,
      runtime: runtime.reason,
    };
  }

  if (statusBeforePrompt === 'undetermined') {
    await requestDeviceNotificationPermission({
      markPrompted: true,
      enablePushWhenGranted: true,
    });
    const statusAfterPrompt = await getDeviceNotificationPermissionStatus();
    await syncPermissionStatusWithPreferences(statusAfterPrompt, {
      markPrompted: true,
      enablePushWhenGranted: true,
    });
    return {
      prompted: true as const,
      status: statusAfterPrompt,
      runtime: runtime.reason,
    };
  }

  await syncPermissionStatusWithPreferences(statusBeforePrompt, {
    markPrompted: true,
    enablePushWhenGranted: statusBeforePrompt === 'granted',
  });
  return {
    prompted: false as const,
    status: statusBeforePrompt,
    runtime: runtime.reason,
  };
};

export const sendManualNotification = async ({
  kind,
  title,
  body,
  data,
  requestPermissionIfNeeded = true,
}: {
  kind: ManualNotificationKind;
  title?: string;
  body?: string;
  data?: NotificationData;
  requestPermissionIfNeeded?: boolean;
}): Promise<NotificationSendResult> => {
  const prefs = await getAppPreferences();
  if (!prefs.notifications_enabled || !prefs.device_push_enabled) {
    return { sent: false, reason: 'disabled' };
  }

  if (kind === 'due_today' && !prefs.notify_due_today) {
    return { sent: false, reason: 'disabled' };
  }

  if (kind === 'due_tomorrow' && !prefs.notify_due_tomorrow) {
    return { sent: false, reason: 'disabled' };
  }

  if (kind === 'weekly_summary' && !prefs.notify_weekly_summary) {
    return { sent: false, reason: 'disabled' };
  }

  if (kind === 'daily_ai_message' && !prefs.notify_daily_ai_message) {
    return { sent: false, reason: 'disabled' };
  }

  const runtime = await getDeviceNotificationRuntimeStatus();
  if (!runtime.available) {
    if (runtime.reason === 'permission_denied' && requestPermissionIfNeeded) {
      // Continue to permission prompt flow below.
    } else {
      if (runtime.reason === 'permission_denied') return { sent: false, reason: 'permission_denied' };
      if (runtime.reason === 'native_module_mismatch') return { sent: false, reason: 'native_module_mismatch' };
      if (runtime.reason === 'expo_go_limited') return { sent: false, reason: 'expo_go_limited' };
      return { sent: false, reason: 'unavailable' };
    }
  }

  const Notifications = getNotificationsModule();
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
    return { sent: false, reason: 'unavailable' };
  }

  let status = await getDeviceNotificationPermissionStatus();
  if (status !== 'granted' && requestPermissionIfNeeded) {
    await requestDeviceNotificationPermission({
      markPrompted: true,
      enablePushWhenGranted: true,
    });
    status = await getDeviceNotificationPermissionStatus();
  }
  await syncPermissionStatusWithPreferences(status, {
    markPrompted: true,
    enablePushWhenGranted: status === 'granted',
  });
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
    requestPermissionIfNeeded: true,
  });

const getPendingRecordsForDate = (records: FinancialRecordDto[], targetDate: Date) =>
  records.filter((record) => {
    if (!isPending(record)) return false;
    const due = new Date(`${record.due_date}T00:00:00`);
    return sameDay(due, targetDate);
  });

const sumAmount = (records: FinancialRecordDto[]) => records.reduce((sum, item) => sum + toMoney(item.amount), 0);

const getRecordsOverview = (records: FinancialRecordDto[]) => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const startOfCurrentWeek = startOfWeekMonday(now);
  const todayFloor = startOfDay(now);

  const pendingRecords = records.filter(isPending);
  const dueToday = getPendingRecordsForDate(records, now);
  const dueTomorrow = getPendingRecordsForDate(records, tomorrow);
  const pendingIncome = pendingRecords.filter(isIncome);
  const pendingExpense = pendingRecords.filter(isExpense);
  const weeklyPendingRecords = pendingRecords.filter((record) => {
    const dueDate = new Date(`${record.due_date}T00:00:00`);
    return dueDate.getTime() >= startOfCurrentWeek.getTime() && dueDate.getTime() <= todayFloor.getTime();
  });
  const weeklyPendingIncome = weeklyPendingRecords.filter(isIncome);
  const weeklyPendingExpense = weeklyPendingRecords.filter(isExpense);
  const overdue = pendingRecords.filter((record) => {
    const dueDate = new Date(`${record.due_date}T00:00:00`);
    return dueDate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  });

  return {
    pendingRecords,
    weeklyPendingRecords,
    dueToday,
    dueTomorrow,
    pendingIncome,
    pendingExpense,
    weeklyPendingIncome,
    weeklyPendingExpense,
    overdue,
    pendingIncomeTotal: sumAmount(pendingIncome),
    pendingExpenseTotal: sumAmount(pendingExpense),
    weeklyPendingIncomeTotal: sumAmount(weeklyPendingIncome),
    weeklyPendingExpenseTotal: sumAmount(weeklyPendingExpense),
  };
};

const formatTopRecordSnippet = (records: FinancialRecordDto[]) => {
  const first = records[0];
  if (!first) return '';
  const amount = formatCurrency(toMoney(first.amount));
  return `${first.title} (${amount}, ${toDateLabel(first.due_date)})`;
};

export const buildManualNotificationScenario = ({
  records,
  prefs,
  userName,
}: {
  records: FinancialRecordDto[];
  prefs: AppPreferences;
  userName?: string;
}): ManualNotificationScenarioStep[] => {
  const displayName = sanitizeText(userName) || 'Usuário';
  const overview = getRecordsOverview(records);
  const todayTotal = sumAmount(overview.dueToday);
  const tomorrowTotal = sumAmount(overview.dueTomorrow);
  const weeklyBalance = overview.weeklyPendingIncomeTotal - overview.weeklyPendingExpenseTotal;
  const mockedXp = Math.max(15, Math.min(80, overview.pendingRecords.length * 5));

  const dueTodayStep: ManualNotificationScenarioStep = overview.dueToday.length
    ? {
        id: 'alerts-due-today',
        kind: 'due_today',
        title: 'Vencimentos de hoje',
        body: `${displayName}, você tem ${overview.dueToday.length} pendência(s) para hoje somando ${formatCurrency(
          todayTotal
        )}. Ex.: ${formatTopRecordSnippet(overview.dueToday)}.`,
        data: {
          source: 'mobile_alerts',
          context: 'account_notifications',
          due_count: overview.dueToday.length,
          due_total: todayTotal,
        },
      }
    : {
        id: 'alerts-due-today',
        kind: 'due_today',
        title: 'Vencimentos de hoje',
        body: `${displayName}, hoje não há pendências com vencimento. Sua conta está em dia.`,
        data: {
          source: 'mobile_alerts',
          context: 'account_notifications',
          due_count: 0,
          due_total: 0,
        },
      };

  const dueTomorrowStep: ManualNotificationScenarioStep = overview.dueTomorrow.length
    ? {
        id: 'alerts-due-tomorrow',
        kind: 'due_tomorrow',
        title: 'Lembrete para amanhã',
        body: `Amanhã você terá ${overview.dueTomorrow.length} pendência(s) (${formatCurrency(
          tomorrowTotal
        )}). Ex.: ${formatTopRecordSnippet(overview.dueTomorrow)}.`,
        data: {
          source: 'mobile_alerts',
          context: 'account_notifications',
          due_count: overview.dueTomorrow.length,
          due_total: tomorrowTotal,
        },
      }
    : {
        id: 'alerts-due-tomorrow',
        kind: 'due_tomorrow',
        title: 'Lembrete para amanhã',
        body: 'Nenhuma pendência para amanhã na sua conta.',
        data: {
          source: 'mobile_alerts',
          context: 'account_notifications',
          due_count: 0,
          due_total: 0,
        },
      };

  const weeklySummaryStep: ManualNotificationScenarioStep = {
    id: 'alerts-weekly-summary',
    kind: 'weekly_summary',
    title: 'Resumo semanal da conta',
    body: `Até hoje nesta semana: ${overview.weeklyPendingRecords.length} pendência(s). Entradas pendentes ${formatCurrency(
      overview.weeklyPendingIncomeTotal
    )} e saídas pendentes ${formatCurrency(overview.weeklyPendingExpenseTotal)}. Saldo previsto ${formatCurrency(
      weeklyBalance
    )}.`,
    data: {
      source: 'mobile_alerts',
      context: 'account_notifications',
      pending_count: overview.weeklyPendingRecords.length,
      overdue_count: overview.overdue.length,
      pending_income_total: overview.weeklyPendingIncomeTotal,
      pending_expense_total: overview.weeklyPendingExpenseTotal,
      projected_balance: weeklyBalance,
    },
  };

  const xpBadgeStep: ManualNotificationScenarioStep = {
    id: 'alerts-xp-badge',
    kind: 'xp_badge',
    title: 'Progresso da jornada',
    body:
      overview.pendingRecords.length === 0
        ? `Conta organizada! Você pode receber +${mockedXp} XP por manter zero pendências.`
        : `Ao regularizar pendências, você pode ganhar cerca de +${mockedXp} XP nesta etapa.`,
    data: {
      source: 'mobile_alerts',
      context: 'account_notifications',
      simulated_xp: mockedXp,
      pending_count: overview.pendingRecords.length,
    },
  };

  const testHeaderStep: ManualNotificationScenarioStep = {
    id: 'alerts-account-header',
    kind: 'test',
    title: 'Alertas da conta atualizados',
    body: `Dados da conta de ${displayName} atualizados. Preferências ativas: ${
      prefs.notifications_enabled ? 'sim' : 'não'
    }, push no dispositivo: ${prefs.device_push_enabled ? 'sim' : 'não'}.`,
    data: {
      source: 'mobile_alerts',
      context: 'account_notifications',
      notifications_enabled: prefs.notifications_enabled,
      device_push_enabled: prefs.device_push_enabled,
    },
  };

  return [testHeaderStep, dueTodayStep, dueTomorrowStep, weeklySummaryStep, xpBadgeStep];
};

export const buildManualNotificationScenarioFromAccount = async ({
  userName,
}: {
  userName?: string;
} = {}): Promise<ManualNotificationScenarioStep[]> => {
  const [recordsResult, prefs] = await Promise.all([
    listFinancialRecords(undefined, undefined, { force: false }),
    getAppPreferences(),
  ]);

  return buildManualNotificationScenario({
    records: recordsResult.records,
    prefs,
    userName,
  });
};

export const runManualNotificationScenario = async ({
  steps,
}: {
  steps: ManualNotificationScenarioStep[];
}): Promise<ManualNotificationScenarioResultStep[]> => {
  const results: ManualNotificationScenarioResultStep[] = [];

  for (const step of steps) {
    const result = await sendManualNotification({
      kind: step.kind,
      title: step.title,
      body: step.body,
      data: {
        source: 'mobile_alerts',
        context: 'account_notifications',
        ...(step.data || {}),
      },
    });

    results.push({ step, result });
  }

  return results;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const atNineAM = (base: Date) => {
  const date = new Date(base);
  date.setHours(9, 0, 0, 0);
  return date;
};

const startOfDay = (base: Date) => {
  const date = new Date(base);
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfWeekMonday = (base: Date) => {
  const date = startOfDay(base);
  const day = date.getDay();
  const offset = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - offset);
  return date;
};

const nextFridayAtNine = () => {
  const now = new Date();
  const date = new Date(now);
  const day = now.getDay();
  const friday = 5;
  let diff = (friday - day + 7) % 7;
  if (diff === 0 && now.getHours() >= 9) diff = 7;
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

const getPendingWeekToDate = (records: FinancialRecordDto[], now: Date) => {
  const weekStart = startOfWeekMonday(now);
  const todayFloor = startOfDay(now);
  return records.filter((record) => {
    if (record.status !== 'pending') return false;
    const due = new Date(`${record.due_date}T00:00:00`);
    return due.getTime() >= weekStart.getTime() && due.getTime() <= todayFloor.getTime();
  });
};

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
  await syncPermissionStatusWithPreferences(status, {
    markPrompted: true,
    enablePushWhenGranted: false,
  });
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
      const weeklyPending = getPendingWeekToDate(records, now);
      const pendingCount = weeklyPending.length;
      await Notifications.scheduleNotificationAsync({
        content: buildSchedulePayload({
          kind: 'weekly_summary',
          title: 'Resumo semanal (até hoje)',
          body:
            pendingCount > 0
              ? `Até hoje nesta semana, você tem ${pendingCount} lançamento(s) pendente(s).`
              : 'Até hoje nesta semana, você não tem pendências. Continue assim.',
        }),
        trigger: nextFridayAtNine(),
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



