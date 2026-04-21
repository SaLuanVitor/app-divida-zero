import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppTextInput from '../../components/AppTextInput';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Pressable, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, ScrollView, useWindowDimensions, Modal, FlatList, LayoutChangeEvent, Alert } from 'react-native';
import {
    Bell,
    CheckCircle2,
    CircleDollarSign,
    Landmark,
    Quote,
    ChevronLeft,
    ChevronRight,
    Wallet,
    X,
    Trash2,
    Trophy,
    Target,
    Shield,
    Crown,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ProfileAvatar from '../../components/ProfileAvatar';
import TutorialTarget from '../../components/tutorial/TutorialTarget';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../context/OverlayContext';
import { useBottomInset } from '../../context/BottomInsetContext';
import { deleteFinancialRecord, listFinancialRecords, payFinancialRecord, updateFinancialRecordStatus } from '../../services/financialRecords';
import { FinancialRecordDto } from '../../types/financialRecord';
import {
    DEFAULT_GAMIFICATION_SUMMARY,
    GamificationSummaryDto,
    normalizeGamificationSummary,
    XpFeedbackDto
} from '../../types/gamification';
import { getGamificationSummary } from '../../services/gamification';
import { useThemeMode } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTutorial } from '../../context/TutorialContext';
import { listFinancialGoals } from '../../services/financialGoals';
import { FinancialGoalDto } from '../../types/financialGoal';
import { runWhenIdle } from '../../utils/idle';
import { getAppPreferences } from '../../services/preferences';
import { sendXpAndBadgeNotification } from '../../services/notifications';
import { trackAnalyticsEventDeferred } from '../../services/analytics';
import { markPerf, measurePerf } from '../../services/perf';
import {
    getUnreadNotificationCount,
    listNotificationHistory,
    markNotificationHistorySeen,
} from '../../services/notificationCenter';
import { NotificationHistoryItem } from '../../types/notificationCenter';
import { getLocalDailyMessage } from '../../services/localDailyMessage';

type CalendarStatus = 'pending' | 'paid' | 'received';

type CalendarEntry = {
    id: number;
    groupCode?: string;
    date: string;
    title: string;
    subtitle: string;
    value: string;
    status: CalendarStatus;
    reminder: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    color: string;
};

type FeedbackState = {
    kind: 'success' | 'error';
    title: string;
    message: string;
};

type ConfirmState = {
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'primary' | 'danger';
    onConfirm: () => Promise<void>;
};

type XpPopupState = {
    title: string;
    message: string;
    points: number;
    level: number;
    levelTitle: string;
    levelProgressPct: number;
    leveledUp: boolean;
    levelIcon: string;
};

type UndoState = {
    entry: CalendarEntry;
    expiresAt: number;
};

type MonthListFilter = 'all' | 'pending' | 'completed';
type NextActionCard = {
    title: string;
    description: string;
    cta: string;
    onPress: () => void;
};

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CARD_PAGE_SIZE = 10;
const YEAR_BLOCK_SIZE = 24;

const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatMoney = (value: string | number) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(amount);
};

const toMonthLabel = (date: Date) => {
    const raw = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
    }).format(date);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const formatDateBRFromISO = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
};

const recurrenceLabel = (record: FinancialRecordDto) => {
    if (!record.recurring || record.recurrence_type === 'none') return 'Registro único';
    if (record.recurrence_type === 'daily') return 'Recorrência diária';
    if (record.recurrence_type === 'weekly') return 'Recorrência semanal';
    if (record.recurrence_type === 'yearly') return 'Recorrência anual';
    return 'Recorrência mensal';
};

const statusLabel = (status: CalendarStatus) => {
    if (status === 'pending') return 'Pendente';
    if (status === 'received') return 'Recebido';
    return 'Pago';
};

const statusColorClass = (status: CalendarStatus) => (status === 'pending' ? 'text-primary' : 'text-teal-500');

const levelIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    sprout: Trophy,
    target: Target,
    shield: Shield,
    crown: Crown,
};

const notificationKindIconMap: Record<NotificationHistoryItem['kind'], React.ComponentType<{ size?: number; color?: string }>> = {
    achievement: Trophy,
    goal: Target,
    record: Wallet,
    reminder: Bell,
    system: Bell,
};

const notificationKindColorMap: Record<NotificationHistoryItem['kind'], string> = {
    achievement: '#f48c25',
    goal: '#0ea5e9',
    record: '#16a34a',
    reminder: '#ef4444',
    system: '#64748b',
};

const toCalendarEntry = (record: FinancialRecordDto): CalendarEntry => {
    const isDebt = record.record_type === 'debt';
    const isIncome = record.flow_type === 'income';

    let title = record.title;
    if (!title?.trim()) {
        title = isDebt ? 'Dívida' : isIncome ? 'Ganho' : 'Lançamento';
    }

    const categoryText = record.category ? `Categoria: ${record.category}` : isDebt ? 'Dívida' : isIncome ? 'Ganho' : 'Despesa';

    const icon = isDebt ? Landmark : isIncome ? CircleDollarSign : Wallet;
    const color = isDebt ? '#ef4444' : isIncome ? '#16a34a' : '#f59e0b';

    return {
        id: record.id,
        groupCode: record.group_code,
        date: record.due_date,
        title,
        subtitle: categoryText,
        value: formatMoney(record.amount),
        status: record.status,
        reminder: recurrenceLabel(record),
        icon,
        color,
    };
};

const calculateSettledBalance = (items: FinancialRecordDto[]) =>
    items.reduce((sum, record) => {
        if (record.status === 'pending') return sum;
        const amount = Number(record.amount || 0);
        return record.flow_type === 'income' ? sum + amount : sum - amount;
    }, 0);

const Home = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const { openOverlay, closeOverlay, isOverlayOpen } = useOverlay();
    const { contentBottomInset, overlayBottomInset } = useBottomInset();
    const { darkMode } = useThemeMode();
    const { fontScale, largerTouchTargets } = useAccessibility();
    const { isBeginnerTutorialActive, currentEssentialStepId } = useTutorial();
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedDateKey, setSelectedDateKey] = useState<string>('');
    const [records, setRecords] = useState<FinancialRecordDto[]>([]);
    const [allRecords, setAllRecords] = useState<FinancialRecordDto[]>([]);
    const [goals, setGoals] = useState<FinancialGoalDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [undoState, setUndoState] = useState<UndoState | null>(null);
    const [undoLoading, setUndoLoading] = useState(false);
    const [xpPopup, setXpPopup] = useState<XpPopupState | null>(null);
    const [gamificationSummary, setGamificationSummary] = useState<GamificationSummaryDto>(DEFAULT_GAMIFICATION_SUMMARY);
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'month' | 'year'>('month');
    const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());
    const [yearRange, setYearRange] = useState(() => ({
        start: currentMonth.getFullYear() - YEAR_BLOCK_SIZE,
        end: currentMonth.getFullYear() + YEAR_BLOCK_SIZE,
    }));
    const [monthListFilter, setMonthListFilter] = useState<MonthListFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleMonthItemsCount, setVisibleMonthItemsCount] = useState(CARD_PAGE_SIZE);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
    const [notificationsPopupLoading, setNotificationsPopupLoading] = useState(false);
    const [notificationItems, setNotificationItems] = useState<NotificationHistoryItem[]>([]);
    const [onboardingPrimaryGoal, setOnboardingPrimaryGoal] = useState<'organize_month' | 'pay_off_debt' | 'create_goal' | null>(null);
    const dailyMessage = useMemo(() => getLocalDailyMessage(), []);
    const compactPillHeight = Math.max(Math.round(36 * Math.max(fontScale, 1)), largerTouchTargets ? 44 : 36);
    const pickerTabHeight = Math.max(Math.round(40 * Math.max(fontScale, 1)), largerTouchTargets ? 44 : 40);

    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastMonthLoadAtRef = useRef(0);
    const scrollRef = useRef<ScrollView>(null);
    const [calendarSectionY, setCalendarSectionY] = useState(0);
    const [monthHistorySectionY, setMonthHistorySectionY] = useState(0);

    const showDayDetails = isOverlayOpen('dayDetails');
    const showConfirm = !!confirmState;
    const showPeriodSelector = showPeriodPicker;
    const showXpPopup = !!xpPopup;
    const showNotifications = showNotificationsPopup;

    const pushFeedback = (kind: FeedbackState['kind'], title: string, message: string) => {
        setFeedback({ kind, title, message });

        if (feedbackTimer.current) {
            clearTimeout(feedbackTimer.current);
        }

        feedbackTimer.current = setTimeout(() => {
            setFeedback(null);
        }, 2600);
    };

    useEffect(() => {
        return () => {
            if (feedbackTimer.current) {
                clearTimeout(feedbackTimer.current);
            }
            if (undoTimer.current) {
                clearTimeout(undoTimer.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isBeginnerTutorialActive || !currentEssentialStepId) return;
        if (currentEssentialStepId !== 'home_calendar' && currentEssentialStepId !== 'home_month_history') return;

        const timer = setTimeout(() => {
            if (currentEssentialStepId === 'home_calendar') {
                scrollRef.current?.scrollTo({ y: Math.max(calendarSectionY - 24, 0), animated: true });
                return;
            }
            scrollRef.current?.scrollTo({ y: Math.max(monthHistorySectionY - 36, 0), animated: true });
        }, 140);

        return () => clearTimeout(timer);
    }, [calendarSectionY, currentEssentialStepId, isBeginnerTutorialActive, monthHistorySectionY]);

    const handleCalendarLayout = useCallback((event: LayoutChangeEvent) => {
        setCalendarSectionY(event.nativeEvent.layout.y);
    }, []);

    const handleMonthHistoryLayout = useCallback((event: LayoutChangeEvent) => {
        setMonthHistorySectionY(event.nativeEvent.layout.y);
    }, []);

    const loadMonthlyRecords = useCallback(async (options: { force?: boolean; silent?: boolean } = {}) => {
        const { force = false, silent = false } = options;
        markPerf('home_focus_to_content');
        if (!silent) setLoading(true);
        try {
            const [monthResult] = await Promise.all([
                listFinancialRecords(currentMonth.getFullYear(), currentMonth.getMonth() + 1, { force }),
            ]);
            setRecords(Array.isArray(monthResult.records) ? monthResult.records : []);
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível carregar os registros do mês.';
            if (!silent) {
                pushFeedback('error', 'Falha ao carregar', message);
            }
        } finally {
            if (!silent) setLoading(false);
            measurePerf('home_focus_to_content', 'Home focus -> monthly content');
        }
    }, [currentMonth]);

    const loadGlobalGamification = useCallback(async (options: { force?: boolean } = {}) => {
        const { force = false } = options;
        try {
            const [goalsResult, summaryResult] = await Promise.all([
                listFinancialGoals({ force }),
                getGamificationSummary({ force }),
            ]);
            setGoals(Array.isArray(goalsResult.goals) ? goalsResult.goals : []);
            setGamificationSummary(normalizeGamificationSummary(summaryResult.summary));
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível carregar a gamificação global.';
            pushFeedback('error', 'Falha ao carregar', message);
        }
    }, []);

    const loadTotalBalanceRecords = useCallback(async (options: { force?: boolean } = {}) => {
        const { force = false } = options;
        try {
            const result = await listFinancialRecords(undefined, undefined, { force });
            setAllRecords(Array.isArray(result.records) ? result.records : []);
        } catch {
            // Do not block the screen if total balance fails temporarily.
        }
    }, []);

    const loadNotificationBadge = useCallback(async (options: { force?: boolean } = {}) => {
        const { force = false } = options;
        try {
            const unreadCount = await getUnreadNotificationCount({ force });
            setNotificationUnreadCount(unreadCount);
        } catch {
            // Keep Home stable if notification center fails temporarily.
        }
    }, []);

    const closeNotificationsPopup = useCallback(() => {
        setShowNotificationsPopup(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            return () => {
                closeOverlay();
                setShowNotificationsPopup(false);
                setShowPeriodPicker(false);
                setConfirmState(null);
                setXpPopup(null);
                setUndoState(null);
            };
        }, [closeOverlay])
    );

    const openNotificationsPopup = useCallback(async () => {
        setShowNotificationsPopup(true);
        setNotificationsPopupLoading(true);

        try {
            const history = await listNotificationHistory({ force: true });
            const safeItems = Array.isArray(history) ? history : [];
            setNotificationItems(safeItems);
            await markNotificationHistorySeen();
            setNotificationItems((current) => current.map((item) => ({ ...item, read: true })));
            setNotificationUnreadCount(0);
            await loadNotificationBadge({ force: true });
        } catch {
            setNotificationItems([]);
            pushFeedback('error', 'Falha ao carregar', 'Nao foi possivel abrir as notificacoes agora.');
        } finally {
            setNotificationsPopupLoading(false);
        }
    }, [loadNotificationBadge, pushFeedback]);

    useFocusEffect(
        useCallback(() => {
            const hasData = records.length > 0;
            const cancel = runWhenIdle(() => {
                loadMonthlyRecords({ force: false, silent: hasData });
                void loadMonthlyRecords({ force: true, silent: true });
            });

            return cancel;
        }, [loadMonthlyRecords, records.length])
    );

    useFocusEffect(
        useCallback(() => {
            const cancel = runWhenIdle(() => {
                loadGlobalGamification();
            });

            return cancel;
        }, [loadGlobalGamification])
    );

    useFocusEffect(
        useCallback(() => {
            const cancel = runWhenIdle(() => {
                loadTotalBalanceRecords();
            });

            return cancel;
        }, [loadTotalBalanceRecords])
    );

    useFocusEffect(
        useCallback(() => {
            const cancel = runWhenIdle(() => {
                loadNotificationBadge();
            });

            return cancel;
        }, [loadNotificationBadge])
    );

    useFocusEffect(
        useCallback(() => {
            const cancel = runWhenIdle(async () => {
                const prefs = await getAppPreferences();
                setOnboardingPrimaryGoal(prefs.onboarding_primary_goal);
            });
            return cancel;
        }, [])
    );

    const openHomeQuickGuide = useCallback(() => {
        const focusText =
            onboardingPrimaryGoal === 'pay_off_debt'
                ? 'Foco atual: quitar dívida.'
                : onboardingPrimaryGoal === 'create_goal'
                ? 'Foco atual: criar meta.'
                : onboardingPrimaryGoal === 'organize_month'
                ? 'Foco atual: organizar mês.'
                : 'Foco atual: manter visão geral.';

        Alert.alert(
            'Guia rápido da Home',
            `${focusText}\n\n1. Confira o resumo e a próxima ação.\n2. Use o calendário para abrir detalhes por dia.\n3. Revise o histórico do mês com filtros e busca.\n\nSe quiser, abra o tutorial completo em Configurações > Ver tutorial novamente.`
        );
    }, [onboardingPrimaryGoal]);

    const entries = useMemo(() => records.map(toCalendarEntry), [records]);
    const notificationModalWidth = useMemo(() => Math.min(windowWidth - 24, 420), [windowWidth]);
    const notificationModalMaxHeight = useMemo(
        () => Math.min(windowHeight - insets.top - insets.bottom - 32, 620),
        [insets.bottom, insets.top, windowHeight]
    );
    const pendingEntriesCount = useMemo(() => entries.filter((item) => item.status === 'pending').length, [entries]);
    const monthlyBalanceValue = useMemo(() => calculateSettledBalance(records), [records]);
    const totalBalanceValue = useMemo(() => calculateSettledBalance(allRecords), [allRecords]);
    const localNextBestAction = useMemo<NextActionCard>(() => {
        if (pendingEntriesCount > 0) {
            return {
                title: 'Priorize os vencimentos pendentes',
                description: `Você tem ${pendingEntriesCount} registro(s) pendente(s) neste mês.`,
                cta: 'Ver pendentes',
                onPress: () => setMonthListFilter('pending'),
            };
        }

        if (goals.some((goal) => goal.status === 'active')) {
            return {
                title: 'Atualize o progresso da sua meta',
                description: 'Marque pagamentos/recebimentos para avançar seus marcos de XP.',
                cta: 'Registrar lançamento',
                onPress: () => navigation.navigate('Lancamentos'),
            };
        }

        if (onboardingPrimaryGoal === 'pay_off_debt') {
            return {
                title: 'Comece registrando sua dívida principal',
                description: 'Assim você já acompanha vencimentos e evolução no mês.',
                cta: 'Registrar dívida',
                onPress: () => navigation.navigate('Lancamentos', { mode: 'debt' }),
            };
        }

        if (onboardingPrimaryGoal === 'organize_month') {
            return {
                title: 'Registre o primeiro lançamento do mês',
                description: 'Isso melhora o calendário e as próximas recomendações.',
                cta: 'Registrar lançamento',
                onPress: () => navigation.navigate('Lancamentos', { mode: 'income' }),
            };
        }

        return {
            title: onboardingPrimaryGoal === 'create_goal' ? 'Crie sua primeira meta' : 'Crie sua próxima meta',
            description:
                onboardingPrimaryGoal === 'create_goal'
                    ? 'Defina um objetivo para começar seu plano financeiro.'
                    : 'Defina um objetivo para manter seu ritmo de evolução.',
            cta: onboardingPrimaryGoal === 'create_goal' ? 'Criar meta' : 'Nova meta',
            onPress: () => navigation.navigate('MetaForm'),
        };
    }, [goals, navigation, onboardingPrimaryGoal, pendingEntriesCount]);

    const visibleEntries = useMemo(() => {
        let base = entries;
        if (monthListFilter === 'pending') {
            base = base.filter((item) => item.status === 'pending');
        }
        if (monthListFilter === 'completed') {
            base = base.filter((item) => item.status !== 'pending');
        }

        const query = searchQuery.trim().toLowerCase();
        if (!query) return base;

        return base.filter((item) => {
            const haystack = [
                item.title,
                item.subtitle,
                item.value,
                formatDateBRFromISO(item.date),
                statusLabel(item.status),
                item.reminder,
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [entries, monthListFilter, searchQuery]);

    const entriesByDate = useMemo(() => {
        const map: Record<string, CalendarEntry[]> = {};

        for (const item of visibleEntries) {
            if (!map[item.date]) {
                map[item.date] = [];
            }
            map[item.date].push(item);
        }

        return map;
    }, [visibleEntries]);

    const selectedEntries = selectedDateKey ? (entriesByDate[selectedDateKey] ?? []) : [];

    const monthGrid = useMemo(() => {
        const year = currentMonth.getFullYear();
        const monthIndex = currentMonth.getMonth();
        const firstDayWeekday = new Date(year, monthIndex, 1).getDay();
        const monthDays = new Date(year, monthIndex + 1, 0).getDate();

        const cells: Array<{ day: number | null; dateKey: string | null }> = [];

        for (let i = 0; i < firstDayWeekday; i += 1) {
            cells.push({ day: null, dateKey: null });
        }

        for (let day = 1; day <= monthDays; day += 1) {
            const key = formatDateKey(new Date(year, monthIndex, day));
            cells.push({ day, dateKey: key });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ day: null, dateKey: null });
        }

        return cells;
    }, [currentMonth]);

    const filteredMonthItems = useMemo(() => {
        return [...visibleEntries].sort((a, b) => a.date.localeCompare(b.date));
    }, [visibleEntries]);
    const monthItemsToRender = useMemo(
        () => filteredMonthItems.slice(0, visibleMonthItemsCount),
        [filteredMonthItems, visibleMonthItemsCount]
    );
    const hasMoreMonthItems = visibleMonthItemsCount < filteredMonthItems.length;
    const todayKey = useMemo(() => formatDateKey(new Date()), []);

    useEffect(() => {
        setVisibleMonthItemsCount(CARD_PAGE_SIZE);
        lastMonthLoadAtRef.current = 0;
    }, [currentMonth, monthListFilter, searchQuery]);

    const handleMonthListScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (!hasMoreMonthItems) return;

            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const reachedBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 160;
            if (!reachedBottom) return;

            const now = Date.now();
            if (now - lastMonthLoadAtRef.current < 250) return;
            lastMonthLoadAtRef.current = now;

            setVisibleMonthItemsCount((prev) => Math.min(prev + CARD_PAGE_SIZE, filteredMonthItems.length));
        },
        [filteredMonthItems.length, hasMoreMonthItems]
    );

    const openDayDetails = (dateKey: string) => {
        setSelectedDateKey(dateKey);
        openOverlay('dayDetails');
    };

    const changeMonth = (offset: number) => {
        const base = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
        setCurrentMonth(base);
        setSelectedDateKey('');
        closeOverlay();
    };

    const focusToday = () => {
        const now = new Date();
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDateKey(todayKey);
        closeOverlay();
    };

    const openXpFeedback = (xpFeedback: XpFeedbackDto | null | undefined, fallbackTitle = 'XP ganho') => {
        if (!xpFeedback) return;
        const summary = normalizeGamificationSummary(xpFeedback.summary);
        setGamificationSummary(summary);
        setXpPopup({
            title: xpFeedback.leveled_up ? 'Subiu de nível!' : fallbackTitle,
            message: xpFeedback.leveled_up
                ? `Agora você está no nível ${summary.level} (${summary.level_title}).`
                : xpFeedback.points >= 0
                  ? `${xpFeedback.points} XP adicionados ao seu progresso.`
                  : `${Math.abs(xpFeedback.points)} XP removidos após ajuste de registros.`,
            points: xpFeedback.points,
            level: summary.level,
            levelTitle: summary.level_title,
            levelProgressPct: summary.level_progress_pct,
            leveledUp: xpFeedback.leveled_up,
            levelIcon: summary.level_icon,
        });
    };

    const maybeNotifyXp = async (xpFeedback: XpFeedbackDto | null | undefined, fallbackTitle: string) => {
        if (!xpFeedback) return;
        const prefs = await getAppPreferences();
        await sendXpAndBadgeNotification({
            enabled: prefs.notifications_enabled && prefs.device_push_enabled && prefs.notify_xp_and_badges && !xpFeedback.leveled_up,
            title: xpFeedback.leveled_up ? 'Subiu de nível!' : fallbackTitle,
            body: xpFeedback.leveled_up
                ? `Você chegou ao nível ${xpFeedback.summary.level}.`
                : `XP atualizado: ${xpFeedback.points >= 0 ? '+' : ''}${xpFeedback.points} pontos.`,
        });
    };

    const openPeriodPicker = () => {
        const baseYear = currentMonth.getFullYear();
        setPickerYear(baseYear);
        setYearRange({
            start: baseYear - YEAR_BLOCK_SIZE,
            end: baseYear + YEAR_BLOCK_SIZE,
        });
        setPickerMode('month');
        setShowPeriodPicker(true);
    };

    const closePeriodPicker = () => setShowPeriodPicker(false);

    const selectMonth = (monthIndex: number) => {
        setCurrentMonth(new Date(pickerYear, monthIndex, 1));
        setSelectedDateKey('');
        closePeriodPicker();
    };

    const selectYear = (year: number) => {
        setPickerYear(year);
        setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
        setSelectedDateKey('');
        setPickerMode('month');
    };

    const yearOptions = useMemo(() => {
        const options: number[] = [];
        for (let year = yearRange.start; year <= yearRange.end; year += 1) {
            options.push(year);
        }
        return options;
    }, [yearRange.end, yearRange.start]);

    const loadMoreYearsUp = useCallback(() => {
        setYearRange((current) => ({ ...current, start: current.start - YEAR_BLOCK_SIZE }));
    }, []);

    const loadMoreYearsDown = useCallback(() => {
        setYearRange((current) => ({ ...current, end: current.end + YEAR_BLOCK_SIZE }));
    }, []);

    const executePay = async (entry: CalendarEntry) => {
        const result = await payFinancialRecord(entry.id);
        await Promise.all([
            loadMonthlyRecords({ force: true }),
            loadGlobalGamification({ force: true }),
            loadTotalBalanceRecords({ force: true }),
        ]);
        pushFeedback('success', 'Status atualizado', result.message);
        await maybeNotifyXp(result.xp_feedback, 'XP atualizado');
        trackAnalyticsEventDeferred({
            event_name: 'record_paid_or_received',
            screen: 'Home',
            metadata: {
                status: entry.status,
                flow: entry.icon === CircleDollarSign ? 'income' : 'expense',
            },
        });
        openXpFeedback(result.xp_feedback, 'Ação concluída');
    };

    const queueUndoForPay = useCallback((entry: CalendarEntry) => {
        if (undoTimer.current) {
            clearTimeout(undoTimer.current);
        }
        const nextUndoState: UndoState = {
            entry,
            expiresAt: Date.now() + 5000,
        };
        setUndoState(nextUndoState);
        undoTimer.current = setTimeout(() => {
            setUndoState((current) => (current?.entry.id === entry.id ? null : current));
            undoTimer.current = null;
        }, 5000);
    }, []);

    const undoPay = useCallback(async () => {
        if (!undoState || undoLoading) return;

        setUndoLoading(true);
        try {
            const result = await updateFinancialRecordStatus(undoState.entry.id, 'pending');
            await Promise.all([
                loadMonthlyRecords({ force: true }),
                loadGlobalGamification({ force: true }),
                loadTotalBalanceRecords({ force: true }),
            ]);
            pushFeedback('success', 'Ação desfeita', result.message);
            await maybeNotifyXp(result.xp_feedback, 'XP ajustado');
            openXpFeedback(result.xp_feedback, 'Ação desfeita');
            setUndoState(null);
            if (undoTimer.current) {
                clearTimeout(undoTimer.current);
                undoTimer.current = null;
            }
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível desfazer a ação.';
            pushFeedback('error', 'Falha ao desfazer', message);
        } finally {
            setUndoLoading(false);
        }
    }, [
        loadGlobalGamification,
        loadMonthlyRecords,
        loadTotalBalanceRecords,
        maybeNotifyXp,
        openXpFeedback,
        pushFeedback,
        undoLoading,
        undoState,
    ]);

    const executeDelete = async (entry: CalendarEntry, scope: 'single' | 'group') => {
        const result = await deleteFinancialRecord(entry.id, scope);
        await Promise.all([
            loadMonthlyRecords({ force: true }),
            loadGlobalGamification({ force: true }),
            loadTotalBalanceRecords({ force: true }),
        ]);
        pushFeedback('success', 'Registro excluído', `${result.message} (${result.deleted_count} registro(s)).`);
        await maybeNotifyXp(result.xp_feedback, 'XP ajustado');
        openXpFeedback(result.xp_feedback, 'XP ajustado');
    };

    const openConfirm = (state: ConfirmState) => setConfirmState(state);

    const handleConfirm = async () => {
        if (!confirmState) return;

        setActionLoading(true);
        try {
            await confirmState.onConfirm();
            setConfirmState(null);
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível concluir a ação.';
            pushFeedback('error', 'Falha na ação', message);
        } finally {
            setActionLoading(false);
        }
    };

    const requestPay = async (entry: CalendarEntry) => {
        try {
            await executePay(entry);
            queueUndoForPay(entry);
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível atualizar o status.';
            pushFeedback('error', 'Falha na ação', message);
        }
    };

    const requestDeleteSingle = (entry: CalendarEntry) => {
        openConfirm({
            title: 'Excluir registro',
            message: `Deseja excluir "${entry.title}"?`,
            confirmLabel: 'Excluir',
            variant: 'danger',
            onConfirm: () => executeDelete(entry, 'single'),
        });
    };

    return (
        <>
            <Layout
                contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black"
                scrollable
                formMode
                scrollRef={scrollRef}
                scrollViewProps={{
                    onScroll: handleMonthListScroll,
                    scrollEventThrottle: 16,
                }}
            >
                <View className="bg-white dark:bg-[#121212] px-4 pt-5 pb-4 border-b border-[#f0ebe7]">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-3">
                            <View className="items-center">
                                <ProfileAvatar
                                    iconKey={user?.profile_icon_key}
                                    frameKey={user?.profile_frame_key}
                                    size={48}
                                    iconSize={22}
                                />
                                <View className="mt-1 bg-primary px-1.5 py-0.5 rounded-full border border-white">
                                    <AppText disableUserFontScale className="text-white text-[9px] font-bold">
                                        Nível {gamificationSummary.level}
                                    </AppText>
                                </View>
                            </View>
                            <View>
                                <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Olá, {user?.name || 'Usuário'}</AppText>
                                <AppText className="text-slate-500 dark:text-slate-200 text-xs font-medium">
                                    {gamificationSummary.level_title} • XP {gamificationSummary.xp_in_level}/{gamificationSummary.xp_in_level + gamificationSummary.xp_to_next_level}
                                </AppText>
                                <TouchableOpacity onPress={openHomeQuickGuide} className="self-start mt-1">
                                    <AppText className="text-primary text-xs font-bold">Ver guia rápido</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity
                            className="bg-[#f8f7f5] dark:bg-black p-2 rounded-full relative"
                            onPress={openNotificationsPopup}
                            accessibilityRole="button"
                            accessibilityLabel="Abrir notificações"
                        >
                            <Bell size={20} color={darkMode ? '#cbd5e1' : '#8a7560'} />
                            {notificationUnreadCount > 0 ? (
                                <View className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 items-center justify-center px-1 border border-white dark:border-black">
                                    <AppText disableUserFontScale className="text-white text-[9px] font-bold">
                                        {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                                    </AppText>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    </View>

                    <TutorialTarget targetId="home-summary-card">
                        <View className="flex-row gap-3">
                        <View className="flex-1 bg-white/90 dark:bg-[#121212] rounded-xl p-3 border border-stone-200/60 dark:border-slate-800 items-center">
                            <View className="flex-row items-center mb-1">
                                <CircleDollarSign size={14} color="#16a34a" />
                                <AppText className="ml-1 text-[11px] text-slate-500 dark:text-slate-200 font-bold uppercase">Saldo Total</AppText>
                            </View>
                            <AppText className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">{formatMoney(totalBalanceValue)}</AppText>
                        </View>
                        <View className="flex-1 bg-white/90 dark:bg-[#121212] rounded-xl p-3 border border-stone-200/60 dark:border-slate-800 items-center">
                            <View className="flex-row items-center mb-1">
                                <Landmark size={14} color="#f59e0b" />
                                <AppText className="ml-1 text-[11px] text-slate-500 dark:text-slate-200 font-bold uppercase">Saldo Mensal</AppText>
                            </View>
                            <AppText className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">{formatMoney(monthlyBalanceValue)}</AppText>
                        </View>
                        </View>

                        <View className="mt-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/25 p-4">
                            <AppText className="text-[11px] text-primary font-extrabold uppercase mb-1">Próxima ação recomendada</AppText>
                            <AppText className="text-slate-900 dark:text-slate-100 text-[15px] font-extrabold">{localNextBestAction.title}</AppText>
                            <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-1 leading-5">{localNextBestAction.description}</AppText>
                            <TouchableOpacity
                                className="mt-3 px-3 rounded-full bg-primary/10 border border-primary/20 items-center justify-center self-start"
                                style={{ minHeight: compactPillHeight, height: compactPillHeight }}
                                onPress={localNextBestAction.onPress}
                                accessibilityRole="button"
                                accessibilityLabel={localNextBestAction.cta}
                            >
                                <AppText className="text-primary text-xs font-bold">{localNextBestAction.cta}</AppText>
                            </TouchableOpacity>
                        </View>

                        <View className="mt-3 bg-white/90 dark:bg-[#121212] rounded-2xl border border-stone-200/60 dark:border-slate-800 p-4">
                            <View className="flex-row items-center mb-1">
                                <Quote size={14} color="#f48c25" />
                                <AppText className="ml-1 text-[11px] text-slate-500 dark:text-slate-200 font-bold uppercase">Mensagem de hoje</AppText>
                            </View>
                            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">
                                {dailyMessage.title}
                            </AppText>
                            <AppText className="text-slate-600 dark:text-slate-200 text-xs mt-1 leading-5">
                                {dailyMessage.body}
                            </AppText>
                        </View>
                    </TutorialTarget>

                </View>

                <View className="pt-4" style={{ paddingBottom: contentBottomInset }}>
                    <TutorialTarget targetId="home-calendar-card">
                    <Card className="mb-5" noPadding onLayout={handleCalendarLayout}>
                        <View className="p-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <TouchableOpacity
                                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
                                    onPress={() => changeMonth(-1)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Mês anterior no calendário"
                                >
                                    <ChevronLeft size={16} color={darkMode ? '#e2e8f0' : '#1f2937'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    onPress={openPeriodPicker}
                                    accessibilityRole="button"
                                    accessibilityLabel="Selecionar período do calendário"
                                >
                                    <AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">{toMonthLabel(currentMonth)}</AppText>
                                </TouchableOpacity>
                                <View className="flex-row items-center gap-2">
                                    <TouchableOpacity
                                        className="px-3 rounded-full bg-primary/10 border border-primary/20 items-center justify-center"
                                        style={{ minHeight: compactPillHeight, height: compactPillHeight }}
                                        onPress={focusToday}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ir para hoje no calendário"
                                    >
                                        <AppText className="text-primary text-xs font-bold">Hoje</AppText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
                                        onPress={() => changeMonth(1)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Próximo mês no calendário"
                                    >
                                        <ChevronRight size={16} color={darkMode ? '#e2e8f0' : '#1f2937'} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {loading ? (
                                <View className="py-8 items-center">
                                    <ActivityIndicator color="#f48c25" />
                                    <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">Carregando registros...</AppText>
                                </View>
                            ) : (
                                <>
                                    <View className="flex-row justify-between mb-2 px-1">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                                            <AppText key={`${day}-${idx}`} className="w-8 text-center text-xs font-bold text-slate-500 dark:text-slate-200">{day}</AppText>
                                        ))}
                                    </View>

                                    <View className="flex-row flex-wrap justify-between">
                                        {monthGrid.map((cell, idx) => {
                                            const isSelected = cell.dateKey === selectedDateKey;
                                            const isToday = cell.dateKey === todayKey;
                                            const marks = cell.dateKey ? (entriesByDate[cell.dateKey] ?? []) : [];
                                            const hasPending = marks.some((m) => m.status === 'pending');
                                            const hasPaid = marks.some((m) => m.status === 'paid' || m.status === 'received');

                                            return (
                                                <View key={`${cell.dateKey ?? 'empty'}-${idx}`} className="w-8 h-9 mb-1 items-center justify-center relative">
                                                    {cell.day ? (
                                                        <TouchableOpacity
                                                            className={`w-7 h-7 rounded-lg items-center justify-center ${isSelected ? 'bg-primary' : isToday ? 'bg-primary/10 border border-primary/40' : ''}`}
                                                            onPress={() => openDayDetails(cell.dateKey!)}
                                                        >
                                                            <AppText className={`text-sm font-medium ${isSelected ? 'text-white font-bold' : isToday ? 'text-primary font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                {cell.day}
                                                            </AppText>
                                                        </TouchableOpacity>
                                                    ) : null}

                                                    {cell.day && (hasPending || hasPaid) ? (
                                                        <View className="absolute bottom-0 flex-row gap-0.5">
                                                            {hasPaid ? <View className="w-1.5 h-1.5 rounded-full bg-teal-400" /> : null}
                                                            {hasPending ? <View className="w-1.5 h-1.5 rounded-full bg-primary" /> : null}
                                                        </View>
                                                    ) : null}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}

                            <View className="flex-row items-center justify-center gap-6 mt-2 pt-3 border-t border-stone-100">
                                <View className="flex-row items-center gap-2">
                                    <View className="h-2 w-2 rounded-full bg-primary" />
                                    <AppText className="text-xs text-slate-500 dark:text-slate-200 font-medium">Pendente</AppText>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <View className="h-2 w-2 rounded-full bg-teal-400" />
                                    <AppText className="text-xs text-slate-500 dark:text-slate-200 font-medium">Concluído</AppText>
                                </View>
                            </View>
                        </View>
                    </Card>
                    </TutorialTarget>

                    <TutorialTarget targetId="home-month-history">
                        <View onLayout={handleMonthHistoryLayout}>
                            <View className="flex-row items-center justify-between mb-3">
                                <AppText className="text-slate-900 dark:text-slate-100 font-bold text-xl">Lançamentos do mês</AppText>
                                <AppText className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">{filteredMonthItems.length} registros</AppText>
                            </View>

                            <View className="flex-row flex-wrap gap-2 mb-4">
                                <TouchableOpacity
                                    className={`px-3 py-2 rounded-full border ${monthListFilter === 'all' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                    onPress={() => setMonthListFilter('all')}
                                >
                                    <AppText className={`text-xs font-bold ${monthListFilter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-200'}`}>Todos</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`px-3 py-2 rounded-full border ${monthListFilter === 'pending' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                    onPress={() => setMonthListFilter('pending')}
                                >
                                    <AppText className={`text-xs font-bold ${monthListFilter === 'pending' ? 'text-white' : 'text-slate-600 dark:text-slate-200'}`}>Pendentes</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`px-3 py-2 rounded-full border ${monthListFilter === 'completed' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                    onPress={() => setMonthListFilter('completed')}
                                >
                                    <AppText className={`text-xs font-bold ${monthListFilter === 'completed' ? 'text-white' : 'text-slate-600 dark:text-slate-200'}`}>Concluídos</AppText>
                                </TouchableOpacity>
                            </View>

                            <AppTextInput
                                className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 mb-4 text-slate-900 dark:text-slate-100"
                                placeholder="Buscar por título, categoria, valor, data ou status"
                                placeholderTextColor="#94a3b8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </TutorialTarget>

                    {!loading && filteredMonthItems.length === 0 ? (
                        <Card className="mb-3" noPadding>
                            <View className="p-4">
                                <AppText className="text-slate-600 dark:text-slate-200 text-sm">Sem lançamentos para os filtros e busca informados neste mês.</AppText>
                            </View>
                        </Card>
                    ) : null}

                    {monthItemsToRender.map((item, index) => (
                        <Card key={String(item.id) + index} className="mb-3" noPadding>
                            <View className="p-4">
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-row items-center">
                                        <View className="h-10 w-10 rounded-lg items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                                            <item.icon size={18} color={item.color} />
                                        </View>
                                        <View className="ml-3">
                                            <AppText className="text-slate-900 dark:text-slate-100 font-bold">{item.title}</AppText>
                                            <AppText className="text-slate-500 dark:text-slate-200 text-xs">{item.subtitle} • {formatDateBRFromISO(item.date)}</AppText>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <AppText className="text-slate-900 dark:text-slate-100 font-bold text-base">{item.value}</AppText>
                                        <AppText className={`text-[10px] font-bold uppercase ${statusColorClass(item.status)}`}>
                                            {statusLabel(item.status)}
                                        </AppText>
                                    </View>
                                </View>

                                <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
                                    <AppText className="text-xs text-slate-500 dark:text-slate-200">{item.reminder}</AppText>
                                    <View className="flex-row items-center gap-2">
                                        <TouchableOpacity onPress={() => requestDeleteSingle(item)} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-row items-center">
                                            <Trash2 size={14} color="#475569" />
                                            <AppText className="text-slate-700 dark:text-slate-200 font-bold text-xs ml-1">Excluir</AppText>
                                        </TouchableOpacity>
                                        {item.status === 'pending' ? (
                                            <TouchableOpacity onPress={() => requestPay(item)} className="bg-primary px-4 py-2 rounded-lg flex-row items-center">
                                                <CheckCircle2 size={16} color="#fff" />
                                                <AppText className="text-white font-bold text-sm ml-2">
                                                    {item.icon === CircleDollarSign ? 'Receber' : 'Pagar'}
                                                </AppText>
                                            </TouchableOpacity>
                                        ) : (
                                            <AppText className="text-teal-600 text-xs font-bold">Concluído</AppText>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </Card>
                    ))}

                    {!loading && hasMoreMonthItems ? (
                        <View className="items-center pb-2">
                            <ActivityIndicator color="#f48c25" />
                            <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-1">
                                Carregando mais lançamentos...
                            </AppText>
                        </View>
                    ) : null}
                </View>
            </Layout>

            <Modal
                visible={showNotifications}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeNotificationsPopup}
            >
                <View className="flex-1 items-center justify-center px-3">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={closeNotificationsPopup} />
                    <View
                        className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden"
                        style={{
                            width: notificationModalWidth,
                            height: notificationModalMaxHeight,
                        }}
                    >
                        <TouchableOpacity
                            onPress={closeNotificationsPopup}
                            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center"
                        >
                            <X size={16} color="#64748b" />
                        </TouchableOpacity>

                        <View className="px-4 pt-4 pb-3 pr-10 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#121212]">
                            <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Notificacoes</AppText>
                        </View>

                        <View className="flex-1 bg-white dark:bg-[#121212] px-4 pt-3">
                            {notificationsPopupLoading ? (
                                <View className="items-center py-6">
                                    <ActivityIndicator color="#f48c25" />
                                    <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">
                                        Carregando notificacoes...
                                    </AppText>
                                </View>
                            ) : notificationItems.length === 0 ? (
                                <View className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] p-3">
                                    <AppText className="text-slate-600 dark:text-slate-200 text-sm">
                                        Nao existem notificacoes.
                                    </AppText>
                                </View>
                            ) : (
                                <ScrollView
                                    className="flex-1"
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 8 }}
                                >
                                    {notificationItems.map((item) => {
                                        const Icon = notificationKindIconMap[item.kind] || Bell;
                                        const iconColor = notificationKindColorMap[item.kind] || '#64748b';

                                        return (
                                            <View
                                                key={item.id}
                                                className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] p-3 mb-2 border border-slate-100 dark:border-slate-800"
                                            >
                                                <View className="flex-row items-start">
                                                    <View className="w-8 h-8 rounded-lg items-center justify-center bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-700">
                                                        <Icon size={14} color={iconColor} />
                                                    </View>
                                                    <View className="ml-2 flex-1">
                                                        <View className="flex-row items-start justify-between">
                                                            <AppText className="text-slate-900 dark:text-slate-100 text-xs font-bold flex-1 pr-2">
                                                                {item.title}
                                                            </AppText>
                                                            {!item.read ? <View className="w-2 h-2 rounded-full bg-primary mt-1" /> : null}
                                                        </View>
                                                        <AppText className="text-slate-600 dark:text-slate-200 text-[11px] mt-1">
                                                            {item.message}
                                                        </AppText>
                                                        <AppText className="text-slate-400 dark:text-slate-200 text-[10px] mt-1">
                                                            {new Date(item.created_at).toLocaleString('pt-BR')}
                                                        </AppText>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        <View className="flex-row gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#121212]">
                            <Button
                                title="Fechar"
                                variant="outline"
                                onPress={closeNotificationsPopup}
                                className="flex-1"
                            />
                            <Button
                                title="Ver historico"
                                onPress={() => {
                                    closeNotificationsPopup();
                                    navigation.navigate('Historico Notificacoes');
                                }}
                                className="flex-1"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {showDayDetails ? (
                <View className="absolute inset-0 z-[120]">
                    <Pressable className="absolute inset-0 bg-black/20" onPress={closeOverlay} />
                    <View
                        className="absolute left-4 right-4 bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-3 max-h-[70%]"
                        style={{ bottom: overlayBottomInset }}
                    >
                        <View className="flex-row items-center justify-between mb-2 px-1">
                            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-base">Detalhes do dia</AppText>
                            <TouchableOpacity onPress={closeOverlay} className="p-1">
                                <X size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <AppText className="text-slate-500 dark:text-slate-200 text-xs mb-3 px-1">{selectedDateKey.split('-').reverse().join('/')}</AppText>

                        {selectedEntries.length === 0 ? (
                            <View className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] p-3">
                                <AppText className="text-slate-600 dark:text-slate-200 text-sm">Sem lançamentos para esta data.</AppText>
                            </View>
                        ) : (
                            selectedEntries.map((item) => (
                                <View key={item.id} className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] p-3 mb-2">
                                    <View className="flex-row items-center justify-between">
                                        <AppText className="text-slate-900 dark:text-slate-100 font-bold">{item.title}</AppText>
                                        <AppText className={`text-[10px] font-bold uppercase ${statusColorClass(item.status)}`}>
                                            {statusLabel(item.status)}
                                        </AppText>
                                    </View>
                                    <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-1">{item.subtitle}</AppText>
                                    <View className="flex-row items-center justify-between mt-2">
                                        <AppText className="text-slate-500 dark:text-slate-200 text-xs">{item.reminder}</AppText>
                                        <AppText className="text-slate-900 dark:text-slate-100 font-bold">{item.value}</AppText>
                                    </View>

                                    <View className="flex-row items-center justify-end gap-2 mt-3">
                                        <TouchableOpacity onPress={() => requestDeleteSingle(item)} className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">
                                            <AppText className="text-slate-700 dark:text-white text-xs font-bold">Excluir</AppText>
                                        </TouchableOpacity>
                                        {item.status === 'pending' ? (
                                            <TouchableOpacity onPress={() => requestPay(item)} className="px-3 py-2 rounded-lg bg-primary">
                                                <AppText className="text-white text-xs font-bold">
                                                    {item.icon === CircleDollarSign ? 'Marcar como recebido' : 'Marcar como pago'}
                                                </AppText>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            ) : null}

            {showConfirm ? (
                <View className="absolute inset-0 z-[60]">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={() => !actionLoading && setConfirmState(null)} />
                    <View className="absolute left-4 right-4 top-[35%] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm dark:shadow-none">
                        <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">{confirmState?.title}</AppText>
                        <AppText className="text-slate-600 dark:text-slate-200 text-sm mt-2 mb-4">{confirmState?.message}</AppText>

                        <Button
                            title={confirmState?.confirmLabel || 'Confirmar'}
                            variant={confirmState?.variant || 'primary'}
                            loading={actionLoading}
                            disabled={actionLoading}
                            onPress={handleConfirm}
                            className="h-12 mb-2"
                        />
                        <Button
                            title="Cancelar"
                            variant="outline"
                            disabled={actionLoading}
                            onPress={() => setConfirmState(null)}
                            className="h-11"
                        />
                    </View>
                </View>
            ) : null}

            {showXpPopup ? (
                <View className="absolute inset-0 z-[62]">
                    <Pressable className="absolute inset-0 bg-black/35" onPress={() => setXpPopup(null)} />
                    <View className="absolute left-5 right-5 top-[24%] bg-white dark:bg-[#121212] rounded-3xl border border-orange-100 dark:border-slate-700 p-5">
                        <View className="items-center">
                            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border border-primary/20 mb-3">
                                {(() => {
                                    const Icon = levelIconMap[xpPopup?.levelIcon || 'sprout'] || Trophy;
                                    return <Icon size={40} color="#f48c25" />;
                                })()}
                            </View>
                            <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-extrabold text-center">{xpPopup?.title}</AppText>
                            <AppText className="text-slate-500 dark:text-slate-200 text-sm text-center mt-1">{xpPopup?.message}</AppText>

                            <View className="w-full mt-4 bg-[#fff7ed] dark:bg-[#1a1a1a] rounded-2xl border border-orange-100 dark:border-slate-700 p-4">
                                <AppText className="text-primary text-xs font-bold uppercase text-center">Recompensa</AppText>
                                <AppText className="text-slate-900 dark:text-slate-100 text-3xl font-black text-center mt-1">
                                    {(xpPopup?.points ?? 0) > 0 ? `+${xpPopup?.points}` : xpPopup?.points} XP
                                </AppText>
                                <AppText className="text-slate-600 dark:text-slate-200 text-sm text-center mt-1">
                                    Nível {xpPopup?.level} • {xpPopup?.levelTitle}
                                </AppText>
                                <View className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                    <View className="h-full bg-primary rounded-full" style={{ width: `${xpPopup?.levelProgressPct ?? 0}%` }} />
                                </View>
                            </View>

                            <Button title="Continuar" onPress={() => setXpPopup(null)} className="h-12 mt-4 w-full" />
                        </View>
                    </View>
                </View>
            ) : null}

            {showPeriodSelector ? (
                <View className="absolute inset-0 z-[65]">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={closePeriodPicker} />
                    <View className="absolute left-4 right-4 top-[24%] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Navegar por período</AppText>
                            <TouchableOpacity className="p-1" onPress={closePeriodPicker}>
                                <X size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2 mb-3">
                            <TouchableOpacity
                                className={`flex-1 rounded-xl items-center justify-center border ${pickerMode === 'month' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                style={{ minHeight: pickerTabHeight, height: pickerTabHeight }}
                                onPress={() => setPickerMode('month')}
                            >
                                <AppText className={`font-bold text-sm ${pickerMode === 'month' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Meses</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 rounded-xl items-center justify-center border ${pickerMode === 'year' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                style={{ minHeight: pickerTabHeight, height: pickerTabHeight }}
                                onPress={() => setPickerMode('year')}
                            >
                                <AppText className={`font-bold text-sm ${pickerMode === 'year' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Anos</AppText>
                            </TouchableOpacity>
                        </View>

                        {pickerMode === 'month' ? (
                            <>
                                <View className="flex-row items-center justify-between mb-3">
                                    <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerYear((prev) => prev - 1)}>
                                        <ChevronLeft size={14} color={darkMode ? '#e2e8f0' : '#334155'} />
                                    </TouchableOpacity>
                                    <AppText className="text-slate-900 dark:text-slate-100 font-bold">{pickerYear}</AppText>
                                    <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerYear((prev) => prev + 1)}>
                                        <ChevronRight size={14} color={darkMode ? '#e2e8f0' : '#334155'} />
                                    </TouchableOpacity>
                                </View>
                                <View className="flex-row flex-wrap justify-between">
                                    {monthNames.map((label, index) => {
                                        const active = currentMonth.getFullYear() === pickerYear && currentMonth.getMonth() === index;
                                        return (
                                            <TouchableOpacity
                                                key={label}
                                                className={`w-[31%] mb-2 rounded-xl items-center justify-center border ${active ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                                style={{ minHeight: pickerTabHeight, height: pickerTabHeight }}
                                                onPress={() => selectMonth(index)}
                                            >
                                                <AppText className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{label}</AppText>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        ) : (
                            <FlatList
                                data={yearOptions}
                                keyExtractor={(item) => `year-${item}`}
                                numColumns={3}
                                style={{ maxHeight: 260 }}
                                contentContainerStyle={{ paddingBottom: 4 }}
                                columnWrapperStyle={{ justifyContent: 'space-between' }}
                                onEndReachedThreshold={0.35}
                                onEndReached={loadMoreYearsDown}
                                onScroll={({ nativeEvent }) => {
                                    if (nativeEvent.contentOffset.y <= 24) {
                                        loadMoreYearsUp();
                                    }
                                }}
                                renderItem={({ item: year }) => {
                                    const active = currentMonth.getFullYear() === year;
                                    return (
                                        <TouchableOpacity
                                            className={`w-[31%] mb-2 rounded-xl items-center justify-center border ${active ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                            style={{ minHeight: pickerTabHeight, height: pickerTabHeight }}
                                            onPress={() => selectYear(year)}
                                        >
                                            <AppText className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{year}</AppText>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            ) : null}

            {feedback ? (
                <View className="absolute top-16 left-4 right-4 z-[70]">
                    <View className={`rounded-xl border px-4 py-3 ${feedback.kind === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                        <AppText className={`font-bold text-sm ${feedback.kind === 'success' ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                            {feedback.title}
                        </AppText>
                        <AppText className={`text-xs mt-1 ${feedback.kind === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                            {feedback.message}
                        </AppText>
                    </View>
                </View>
            ) : null}

            {undoState ? (
                <View pointerEvents="box-none" className="absolute left-4 right-4 z-[72]" style={{ bottom: overlayBottomInset }}>
                    <View className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-4 py-3 flex-row items-center justify-between">
                        <View className="flex-1 pr-3">
                            <AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">
                                {undoState.entry.icon === CircleDollarSign ? 'Marcado como recebido' : 'Marcado como pago'}
                            </AppText>
                            <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-1">
                                Toque em desfazer para voltar este registro para pendente.
                            </AppText>
                        </View>
                        <TouchableOpacity
                            className="px-3 py-2 rounded-lg bg-primary"
                            disabled={undoLoading}
                            onPress={undoPay}
                        >
                            <AppText className="text-white text-xs font-bold">{undoLoading ? '...' : 'Desfazer'}</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Home;







