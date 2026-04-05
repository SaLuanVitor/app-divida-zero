import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Modal } from 'react-native';
import {
    User as UserIcon,
    Settings,
    Shield,
    Target,
    Bell,
    HelpCircle,
    LogOut,
    ChevronRight,
    Lock,
    Trophy,
    CheckCircle2,
    Crown,
    X,
    Pencil,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ProfileAvatar from '../../components/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { listFinancialRecords } from '../../services/financialRecords';
import { FinancialRecordDto } from '../../types/financialRecord';
import { buildGamificationSummary, formatAchievementProgress } from '../../utils/gamification';
import { getGamificationSummary, listGamificationEvents } from '../../services/gamification';
import {
    DailyAchievementDto,
    DEFAULT_GAMIFICATION_SUMMARY,
    GamificationEventDto,
    GamificationSummaryDto,
    normalizeGamificationSummary
} from '../../types/gamification';
import { runWhenIdle } from '../../utils/idle';
import { listFinancialGoals } from '../../services/financialGoals';
import { FinancialGoalDto } from '../../types/financialGoal';
import { updateProfile } from '../../services/account';
import {
    getUnreadNotificationCount,
    listNotificationHistory,
    markNotificationHistorySeen,
} from '../../services/notificationCenter';
import { NotificationHistoryItem } from '../../types/notificationCenter';
import { useThemeMode } from '../../context/ThemeContext';
import {
    getFrameRequiredLevel,
    getUnlockedFramesCount,
    getUnlockedIconsCount,
    getIconRequiredLevel,
    getProfileFrameOption,
    getProfileIconOption,
    isFrameUnlocked,
    isIconUnlocked,
    normalizeProfileFrameKey,
    normalizeProfileIconKey,
    PROFILE_FRAME_OPTIONS,
    PROFILE_ICON_OPTIONS,
} from '../../utils/profileAppearance';

const notificationKindIconMap: Record<NotificationHistoryItem['kind'], React.ComponentType<{ size?: number; color?: string }>> = {
    achievement: Trophy,
    goal: Target,
    record: UserIcon,
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

const Profile = () => {
    const { user, signOut, updateUser } = useAuth();
    const { darkMode } = useThemeMode();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { reduceMotion, fontScale, largerTouchTargets } = useAccessibility();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [records, setRecords] = useState<FinancialRecordDto[]>([]);
    const [goals, setGoals] = useState<FinancialGoalDto[]>([]);
    const [events, setEvents] = useState<GamificationEventDto[]>([]);
    const [loadingGamification, setLoadingGamification] = useState(false);
    const [summary, setSummary] = useState<GamificationSummaryDto>(DEFAULT_GAMIFICATION_SUMMARY);
    const [dailyAchievements, setDailyAchievements] = useState<DailyAchievementDto[]>([]);
    const [historySectionY, setHistorySectionY] = useState(0);
    const [highlightHistoryCta, setHighlightHistoryCta] = useState(false);
    const [achievementsExpanded, setAchievementsExpanded] = useState(false);
    const [badgesExpanded, setBadgesExpanded] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [avatarPickerTab, setAvatarPickerTab] = useState<'icons' | 'frames'>('icons');
    const [pendingIconKey, setPendingIconKey] = useState(normalizeProfileIconKey(user?.profile_icon_key));
    const [pendingFrameKey, setPendingFrameKey] = useState(normalizeProfileFrameKey(user?.profile_frame_key));
    const [savingAppearance, setSavingAppearance] = useState(false);
    const [appearanceFeedback, setAppearanceFeedback] = useState<string | null>(null);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
    const [notificationsPopupLoading, setNotificationsPopupLoading] = useState(false);
    const [notificationItems, setNotificationItems] = useState<NotificationHistoryItem[]>([]);
    const [loadError, setLoadError] = useState('');

    const scrollRef = useRef<ScrollView>(null);
    const avatarPickerScrollRef = useRef<ScrollView>(null);

    const menuItems = [
        { label: 'Dados do usuário', icon: UserIcon, color: '#3b82f6', route: 'Dados Pessoais' },
        { label: 'Configurações do app', icon: Settings, color: '#64748b', route: 'Configuracoes App' },
        { label: 'Notificações', icon: Bell, color: '#f59e0b', route: 'Notificacoes' },
        { label: 'Envio de notificações', icon: Bell, color: '#f97316', route: 'Envio Notificacoes' },
        { label: 'Segurança', icon: Shield, color: '#10b981', route: 'Seguranca' },
        { label: 'Ajuda e suporte', icon: HelpCircle, color: '#8b5cf6', route: 'Ajuda e Suporte' },
    ];

    const gamification = useMemo(
        () =>
            buildGamificationSummary({
                records,
                goals,
                events,
                summary,
            }),
        [events, goals, records, summary]
    );

    const badgeIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
        sprout: Trophy,
        target: Target,
        shield: Shield,
        crown: Crown,
    };
    const isCompactDevice = windowWidth < 380 || windowHeight < 740;
    const isLargeText = fontScale >= 1.15;
    const iconColumns = windowWidth < 360 || isLargeText ? 3 : 4;
    const frameColumns = windowWidth < 390 || isLargeText ? 2 : 3;
    const modalSideInset = windowWidth < 380 ? 12 : 16;
    const pickerTopInset = Math.max(insets.top + 8, isCompactDevice ? 10 : 16);
    const pickerBottomInset = Math.max(insets.bottom + (isLargeText ? 108 : 84), isCompactDevice ? (isLargeText ? 108 : 92) : (isLargeText ? 120 : 104));
    const modalInnerWidth = Math.max(windowWidth - modalSideInset * 2 - 32, 240);
    const itemGap = 10;
    const iconItemWidth = Math.floor((modalInnerWidth - (iconColumns - 1) * itemGap) / iconColumns);
    const frameItemWidth = Math.floor((modalInnerWidth - (frameColumns - 1) * itemGap) / frameColumns);
    const pickerTabHeight = largerTouchTargets || isLargeText ? 44 : 40;
    const pickerItemIconSize = isLargeText ? 20 : 18;
    const selectedIconOption = useMemo(() => getProfileIconOption(pendingIconKey), [pendingIconKey]);
    const selectedFrameOption = useMemo(() => getProfileFrameOption(pendingFrameKey), [pendingFrameKey]);
    const notificationModalWidth = useMemo(() => Math.min(windowWidth - 24, 420), [windowWidth]);
    const notificationModalMaxHeight = useMemo(
        () => Math.min(windowHeight - insets.top - insets.bottom - 32, 620),
        [insets.bottom, insets.top, windowHeight]
    );
    const showNotifications = showNotificationsPopup;

    const loadGamification = useCallback(async (options: { force?: boolean; silent?: boolean } = {}) => {
        const { force = false, silent = false } = options;
        if (!silent) setLoadingGamification(true);
        try {
            const [recordsResult, goalsResult, eventsResult, summaryResult] = await Promise.all([
                listFinancialRecords(undefined, undefined, { force }),
                listFinancialGoals({ force }),
                listGamificationEvents({ force }),
                getGamificationSummary({ force }),
            ]);

            setRecords(recordsResult.records);
            setGoals(goalsResult.goals);
            setEvents(eventsResult.events);
            setSummary(normalizeGamificationSummary(summaryResult.summary));
            setDailyAchievements(Array.isArray(summaryResult.daily_achievements) ? summaryResult.daily_achievements : []);
            if (!silent) setLoadError('');
        } catch (error: any) {
            if (!silent) {
                const message = error?.response?.data?.error ?? 'Não foi possível carregar os dados do perfil agora.';
                setLoadError(message);
            }
        } finally {
            if (!silent) setLoadingGamification(false);
        }
    }, []);

    const loadNotificationBadge = useCallback(async (options: { force?: boolean } = {}) => {
        const { force = false } = options;
        try {
            const unreadCount = await getUnreadNotificationCount({ force });
            setNotificationUnreadCount(unreadCount);
        } catch {
            // Keep Profile stable if notification center fails temporarily.
        }
    }, []);

    const dailyDateLabel = useMemo(() => {
        const firstDate = dailyAchievements[0]?.date_key;
        if (!firstDate) return '';
        const parsed = new Date(`${firstDate}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toLocaleDateString('pt-BR');
    }, [dailyAchievements]);
    const publicHandle = useMemo(() => {
        const base = user?.email?.split('@')[0]?.trim();
        if (!base) return '@usuario_divida_zero';
        return `@${base.replace(/\s+/g, '_').toLowerCase()}`;
    }, [user?.email]);
    const memberSinceLabel = useMemo(() => {
        const candidates: Array<string | undefined> = [];
        const userCreatedAt = (user as any)?.created_at as string | undefined;
        if (userCreatedAt) candidates.push(userCreatedAt);

        if (events.length > 0) {
            const oldestEvent = [...events]
                .map((item) => item?.created_at)
                .filter((value): value is string => Boolean(value))
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
            if (oldestEvent) candidates.push(oldestEvent);
        }

        const validDate = candidates
            .map((value) => new Date(value as string))
            .find((date) => !Number.isNaN(date.getTime())) ?? new Date();

        const formatted = new Intl.DateTimeFormat('pt-BR', {
            month: 'long',
            year: 'numeric',
        }).format(validDate);

        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }, [events, user]);

    useFocusEffect(
        useCallback(() => {
            const cancel = runWhenIdle(() => {
                const hasData = records.length > 0 || goals.length > 0 || events.length > 0;
                loadGamification({ force: false, silent: hasData });
                void loadGamification({ force: true, silent: true });
            });

            return cancel;
        }, [events.length, goals.length, loadGamification, records.length])
    );

    useFocusEffect(
        useCallback(() => {
            const cancel = runWhenIdle(() => {
                loadNotificationBadge({ force: false });
                void loadNotificationBadge({ force: true });
            });

            return cancel;
        }, [loadNotificationBadge])
    );

    useEffect(() => {
        const shouldFocusHistory = Boolean(route.params?.focusHistory);
        if (!shouldFocusHistory || !scrollRef.current) return;

        const timer = setTimeout(() => {
            scrollRef.current?.scrollTo({ y: Math.max(historySectionY - 20, 0), animated: !reduceMotion });
            setHighlightHistoryCta(true);
            navigation.setParams({ focusHistory: false });
        }, 120);

        return () => clearTimeout(timer);
    }, [route.params?.focusHistory, historySectionY, navigation, reduceMotion]);

    useEffect(() => {
        if (!highlightHistoryCta) return;
        const timer = setTimeout(() => setHighlightHistoryCta(false), 1800);
        return () => clearTimeout(timer);
    }, [highlightHistoryCta]);

    useEffect(() => {
        setPendingIconKey(normalizeProfileIconKey(user?.profile_icon_key));
        setPendingFrameKey(normalizeProfileFrameKey(user?.profile_frame_key));
    }, [user?.profile_frame_key, user?.profile_icon_key]);

    useEffect(() => {
        if (!showAvatarPicker) return;

        const timer = setTimeout(() => {
            avatarPickerScrollRef.current?.scrollTo({ y: 0, animated: false });
        }, 0);

        return () => clearTimeout(timer);
    }, [showAvatarPicker, avatarPickerTab]);

    const openAvatarPicker = () => {
        setAppearanceFeedback(null);
        setAvatarPickerTab('icons');
        setPendingIconKey(normalizeProfileIconKey(user?.profile_icon_key));
        setPendingFrameKey(normalizeProfileFrameKey(user?.profile_frame_key));
        setShowAvatarPicker(true);
    };

    const closeNotificationsPopup = useCallback(() => {
        setShowNotificationsPopup(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            return () => {
                setShowNotificationsPopup(false);
                setShowAvatarPicker(false);
                setShowLogoutConfirm(false);
                setAppearanceFeedback(null);
            };
        }, [])
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
        } finally {
            setNotificationsPopupLoading(false);
        }
    }, [loadNotificationBadge]);

    const saveProfileAppearance = async () => {
        if (savingAppearance) return;

        const currentIconKey = normalizeProfileIconKey(user?.profile_icon_key);
        const currentFrameKey = normalizeProfileFrameKey(user?.profile_frame_key);
        const payload: Parameters<typeof updateProfile>[0] = {};

        if (pendingIconKey !== currentIconKey) {
            payload.profile_icon_key = pendingIconKey;
        }
        if (pendingFrameKey !== currentFrameKey) {
            payload.profile_frame_key = pendingFrameKey;
        }

        if (!Object.keys(payload).length) {
            setShowAvatarPicker(false);
            return;
        }

        if (payload.profile_icon_key && !isIconUnlocked(payload.profile_icon_key, summary.level)) {
            setAppearanceFeedback(`Esse ícone exige nível ${getIconRequiredLevel(payload.profile_icon_key)}.`);
            return;
        }

        if (payload.profile_frame_key && !isFrameUnlocked(payload.profile_frame_key, summary.level)) {
            setAppearanceFeedback(`Essa borda exige nível ${getFrameRequiredLevel(payload.profile_frame_key)}.`);
            return;
        }

        setSavingAppearance(true);
        setAppearanceFeedback(null);
        try {
            const result = await updateProfile(payload);
            await updateUser(result.user);
            setShowAvatarPicker(false);
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível atualizar o ícone de perfil.';
            setAppearanceFeedback(message);
        } finally {
            setSavingAppearance(false);
        }
    };

    return (
        <>
            <Layout contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
                <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
                    <View className="px-6 pt-8 pb-2 items-center">
                        <View className="w-full flex-row items-center justify-between mb-4">
                            <TouchableOpacity
                                className="w-10 h-10 rounded-full bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-700 items-center justify-center"
                                onPress={() => navigation.navigate('Configuracoes App')}
                                accessibilityRole="button"
                                accessibilityLabel="Abrir configurações do app"
                            >
                                <Settings size={18} color="#334155" />
                            </TouchableOpacity>

                            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg">Meu Perfil</AppText>

                            <TouchableOpacity
                                className="w-10 h-10 rounded-full bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-700 items-center justify-center"
                                onPress={openNotificationsPopup}
                                accessibilityRole="button"
                                accessibilityLabel="Abrir notificações"
                            >
                                <Bell size={18} color={darkMode ? '#cbd5e1' : '#334155'} />
                                {notificationUnreadCount > 0 ? (
                                    <View className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 items-center justify-center px-1 border border-white dark:border-black">
                                        <AppText disableUserFontScale className="text-white text-[9px] font-bold">
                                            {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                                        </AppText>
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity activeOpacity={0.9} onPress={openAvatarPicker}>
                            <View className="relative">
                                <ProfileAvatar
                                    iconKey={user?.profile_icon_key}
                                    frameKey={user?.profile_frame_key}
                                    size={102}
                                    iconSize={46}
                                />
                                <View className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-primary border-2 border-white dark:border-black items-center justify-center">
                                    <Pencil size={14} color="#ffffff" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        <AppText className="text-slate-900 dark:text-slate-100 text-3xl font-extrabold mt-4">{user?.name || 'Usuário'}</AppText>
                        <AppText className="text-slate-500 dark:text-slate-300 text-sm mt-0.5">{publicHandle}</AppText>

                        <View className="mt-3 bg-primary/10 px-4 py-1.5 rounded-full">
                            <AppText className="text-primary text-xs font-extrabold">MEMBRO ATIVO DESDE {memberSinceLabel}</AppText>
                        </View>
                    </View>

                    <View className="px-4 pt-4">
                        {loadError ? (
                            <Card className="p-3 mb-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                                <AppText className="text-red-700 dark:text-red-300 text-xs">{loadError}</AppText>
                            </Card>
                        ) : null}
                        <Card className="p-4 rounded-3xl">
                            <View className="flex-row items-center justify-between">
                                <AppText className="text-primary text-sm font-extrabold tracking-wide">PROGRESSO</AppText>
                                {loadingGamification ? <ActivityIndicator size="small" color="#f48c25" /> : null}
                            </View>
                            <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-1">
                                Nível {summary.level} - {summary.level_title}
                            </AppText>
                            <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">
                                {summary.xp_in_level}/{summary.xp_in_level + summary.xp_to_next_level} XP
                            </AppText>
                            <View className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                <View className="h-full bg-primary rounded-full" style={{ width: `${summary.level_progress_pct}%` }} />
                            </View>
                            <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">
                                Faltam {summary.xp_to_next_level} XP para o nível {summary.level + 1}
                            </AppText>
                        </Card>
                    </View>

                    <View className="px-4 pt-8">
                        <View className="flex-row items-center justify-between mb-3">
                            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-2xl">Conquistas</AppText>
                            <TouchableOpacity onPress={() => setBadgesExpanded((current) => !current)} activeOpacity={0.8}>
                                <AppText className="text-primary font-bold text-sm">{badgesExpanded ? 'Recolher' : 'Ver todas'}</AppText>
                            </TouchableOpacity>
                        </View>

                        {!badgesExpanded ? (
                            <Card className="mb-4 p-4">
                                <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold">
                                    {gamification.badges.filter((badge) => badge.unlocked).length}/{gamification.badges.length} brasões coletados
                                </AppText>
                                <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">
                                    Toque em "Ver todas" para abrir a coleção completa.
                                </AppText>
                            </Card>
                        ) : (
                            <Card className="mb-6">
                                <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold mb-3">
                                    {gamification.badges.filter((badge) => badge.unlocked).length}/{gamification.badges.length} brasões coletados
                                </AppText>
                                <View className="flex-row flex-wrap justify-between">
                                    {gamification.badges.map((badge) => {
                                        const Icon = badgeIconMap[badge.icon] || Trophy;
                                        return (
                                            <View key={badge.id} className="w-[48.5%] mb-3 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-[#121212]">
                                                <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${badge.unlocked ? 'bg-primary/15' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                    <Icon size={19} color={badge.unlocked ? '#f48c25' : '#94a3b8'} />
                                                </View>
                                                <AppText className={`font-bold text-sm ${badge.unlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-300'}`}>{badge.title}</AppText>
                                                <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">{badge.description}</AppText>
                                            </View>
                                        );
                                    })}
                                </View>
                            </Card>
                        )}
                    </View>

                    <View className="px-4">
                        <Card className="mb-6" noPadding>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setAchievementsExpanded((current) => !current)}
                                className="p-4"
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-1 pr-3">
                                        <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold">
                                            {gamification.unlockedCount}/{gamification.achievements.length} desbloqueadas - Total XP {summary.total_xp}
                                        </AppText>
                                        <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">
                                            {achievementsExpanded ? 'Toque para recolher a lista.' : 'Toque para expandir a lista de conquistas.'}
                                        </AppText>
                                    </View>
                                    <ChevronRight
                                        size={18}
                                        color="#94a3b8"
                                        style={{ transform: [{ rotate: achievementsExpanded ? '90deg' : '0deg' }] }}
                                    />
                                </View>
                            </TouchableOpacity>
                            {achievementsExpanded ? (
                                <>
                                    <View className="border-t border-slate-100 dark:border-slate-800" />
                                    {gamification.achievements.map((achievement, index) => (
                                        <View key={achievement.id} className={`p-4 ${index !== gamification.achievements.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}>
                                            <View className="flex-row items-center justify-between mb-1">
                                                <AppText className={`font-bold ${achievement.unlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-300'}`}>
                                                    {achievement.title}
                                                </AppText>
                                                <AppText className={`text-xs font-bold ${achievement.unlocked ? 'text-emerald-600' : 'text-slate-400 dark:text-slate-300'}`}>
                                                    {achievement.unlocked ? `+${achievement.rewardXp} XP` : formatAchievementProgress(achievement.progress, achievement.target)}
                                                </AppText>
                                            </View>
                                            <AppText className="text-slate-500 dark:text-slate-300 text-xs mb-2">{achievement.description}</AppText>
                                            <View className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <View
                                                    className={`h-full rounded-full ${achievement.unlocked ? 'bg-emerald-500' : 'bg-primary'}`}
                                                    style={{ width: `${Math.round((Math.min(achievement.progress, achievement.target) / achievement.target) * 100)}%` }}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </>
                            ) : null}
                        </Card>
                    </View>

                    <View className="px-4">
                        <AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-3">Conquistas diárias</AppText>
                        <Card className="mb-6" noPadding>
                            {dailyAchievements.length === 0 ? (
                                <View className="p-4">
                                    <AppText className="text-slate-500 dark:text-slate-300 text-sm">
                                        As conquistas diárias aparecerão aqui assim que forem carregadas.
                                    </AppText>
                                </View>
                            ) : (
                                <>
                                    <View className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <AppText className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                            {dailyDateLabel ? `Progresso de hoje (${dailyDateLabel})` : 'Progresso de hoje'}
                                        </AppText>
                                    </View>
                                    {dailyAchievements.map((daily, index) => {
                                        const completed = daily.completed;
                                        const progressText = `${Math.min(daily.progress, daily.target)}/${daily.target}`;

                                        return (
                                            <View
                                                key={daily.key}
                                                className={`p-4 ${index !== dailyAchievements.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                                            >
                                                <View className="flex-row items-start justify-between mb-2">
                                                    <View className="flex-1 pr-3">
                                                        <AppText className={`font-bold ${completed ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>
                                                            {daily.title}
                                                        </AppText>
                                                        <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">
                                                            {daily.description}
                                                        </AppText>
                                                    </View>
                                                    <View className="items-end">
                                                        <AppText className="text-primary text-xs font-bold">+{daily.reward_xp} XP</AppText>
                                                        <AppText className={`text-[11px] font-semibold mt-1 ${completed ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-300'}`}>
                                                            {completed ? 'Concluída' : progressText}
                                                        </AppText>
                                                    </View>
                                                </View>
                                                <View className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <View
                                                        className={`h-full rounded-full ${completed ? 'bg-emerald-500' : 'bg-primary'}`}
                                                        style={{ width: `${Math.round((Math.min(daily.progress, daily.target) / daily.target) * 100)}%` }}
                                                    />
                                                </View>
                                                {completed ? (
                                                    <View className="flex-row items-center mt-2">
                                                        <CheckCircle2 size={13} color="#10b981" />
                                                        <AppText className="text-emerald-600 dark:text-emerald-300 text-[11px] font-semibold ml-1">
                                                            XP diário aplicado automaticamente
                                                        </AppText>
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </>
                            )}
                        </Card>
                    </View>

                    <View className="px-4" onLayout={(event) => setHistorySectionY(event.nativeEvent.layout.y)}>
                        <AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-3">Histórico de XP</AppText>
                        <Card className="mb-6 p-4">
                            <AppText className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                                Acesse uma visão detalhada de todos os eventos de ganho e perda de XP.
                            </AppText>
                            <Button
                                title="Ver histórico completo"
                                variant={highlightHistoryCta ? 'primary' : 'outline'}
                                onPress={() => navigation.navigate('Historico XP')}
                            />
                        </Card>
                    </View>

                    <View className="px-4">
                        <AppText className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-4">Conta</AppText>
                        <Card className="mb-6 overflow-hidden" noPadding>
                            {menuItems.map((item, i) => (
                                <TouchableOpacity
                                    key={item.label}
                                    className={`flex-row items-center justify-between p-4 bg-white dark:bg-[#121212] ${
                                        i !== menuItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                                    }`}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate(item.route)}
                                >
                                    <View className="flex-row items-center">
                                        <item.icon size={20} color={item.color} />
                                        <AppText className="text-slate-700 dark:text-slate-200 font-medium ml-3">{item.label}</AppText>
                                    </View>
                                    <ChevronRight size={18} color="#94a3b8" />
                                </TouchableOpacity>
                            ))}
                        </Card>

                        <Button
                            title="Sair da conta"
                            variant="ghost"
                            onPress={() => setShowLogoutConfirm(true)}
                            icon={<LogOut size={20} color="#ef4444" />}
                            className="mt-1"
                            textClassName="text-red-500"
                        />
                    </View>

                    <View className="items-center pb-10 pt-6">
                        <AppText className="text-slate-400 dark:text-slate-300 text-xs text-center">Dívida Zero App - v1.0.0</AppText>
                    </View>
                </ScrollView>
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
                            <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Notificações</AppText>
                        </View>

                        <View className="flex-1 bg-white dark:bg-[#121212] px-4 pt-3">
                            {notificationsPopupLoading ? (
                                <View className="items-center py-6">
                                    <ActivityIndicator color="#f48c25" />
                                    <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">
                                        Carregando notificações...
                                    </AppText>
                                </View>
                            ) : notificationItems.length === 0 ? (
                                <View className="rounded-xl bg-slate-50 dark:bg-[#1a1a1a] p-3">
                                    <AppText className="text-slate-600 dark:text-slate-300 text-sm">
                                        Não existem notificações.
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
                                                        <AppText className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                                                            {item.message}
                                                        </AppText>
                                                        <AppText className="text-slate-400 dark:text-slate-300 text-[10px] mt-1">
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
                                title="Ver histórico"
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

            {showAvatarPicker ? (
                <View className="absolute inset-0 z-[58]">
                    <Pressable className="absolute inset-0 bg-black/40" onPress={() => !savingAppearance && setShowAvatarPicker(false)} />
                    <View
                        className="absolute bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4"
                        style={{ left: modalSideInset, right: modalSideInset, top: pickerTopInset, bottom: pickerBottomInset }}
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Personalizar ícone</AppText>
                            <TouchableOpacity disabled={savingAppearance} onPress={() => setShowAvatarPicker(false)} className="p-1">
                                <X size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View className="bg-[#f8f7f5] dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3">
                            <View className="flex-row items-center">
                                <ProfileAvatar iconKey={pendingIconKey} frameKey={pendingFrameKey} size={68} iconSize={30} />
                                <View className="ml-3 flex-1">
                                    <AppText className="text-slate-900 dark:text-slate-100 font-bold">{selectedIconOption.label} + {selectedFrameOption.label}</AppText>
                                    <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">Nível atual: {summary.level}</AppText>
                                    <AppText className="text-slate-500 dark:text-slate-300 text-xs">Ícones liberados: {getUnlockedIconsCount(summary.level)} de 30 • Bordas liberadas: {getUnlockedFramesCount(summary.level)} de 10</AppText>
                                </View>
                            </View>
                        </View>

                        <View className="flex-row gap-2 mb-3">
                            <TouchableOpacity
                                className={`flex-1 rounded-xl items-center justify-center border ${avatarPickerTab === 'icons' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                style={{ minHeight: pickerTabHeight, height: pickerTabHeight }}
                                onPress={() => setAvatarPickerTab('icons')}
                            >
                                <AppText className={`font-bold text-sm ${avatarPickerTab === 'icons' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Ícones</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 rounded-xl items-center justify-center border ${avatarPickerTab === 'frames' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                style={{ minHeight: pickerTabHeight, height: pickerTabHeight }}
                                onPress={() => setAvatarPickerTab('frames')}
                            >
                                <AppText className={`font-bold text-sm ${avatarPickerTab === 'frames' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>Bordas</AppText>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            ref={avatarPickerScrollRef}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            className="flex-1"
                            contentContainerStyle={{ paddingTop: 2, paddingBottom: 8 }}
                        >
                            {avatarPickerTab === 'icons' ? (
                                <View className="flex-row flex-wrap justify-between">
                                    {PROFILE_ICON_OPTIONS.map((option) => {
                                        const unlocked = isIconUnlocked(option.key, summary.level);
                                        const selected = pendingIconKey === option.key;
                                        const requiredLevel = getIconRequiredLevel(option.key);
                                        const Icon = option.icon;

                                        return (
                                            <TouchableOpacity
                                                key={option.key}
                                                activeOpacity={0.8}
                                                disabled={!unlocked}
                                                onPress={() => setPendingIconKey(option.key)}
                                                style={{ width: iconItemWidth, marginBottom: 10 }}
                                                className={`rounded-xl border p-2 items-center ${selected ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f0f0f]'} ${unlocked ? '' : 'opacity-50'}`}
                                            >
                                                <View className="w-10 h-10 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                                                    <Icon size={pickerItemIconSize} color="#f48c25" />
                                                </View>
                                                <AppText className="text-[11px] text-slate-700 dark:text-slate-200 font-semibold mt-1 text-center" numberOfLines={2}>
                                                    {option.label}
                                                </AppText>
                                                {!unlocked ? (
                                                    <View className="flex-row items-center mt-0.5">
                                                        <Lock size={10} color="#64748b" />
                                                        <AppText className="text-[10px] text-slate-500 ml-1">Nível {requiredLevel}</AppText>
                                                    </View>
                                                ) : null}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View className="flex-row flex-wrap justify-between">
                                    {PROFILE_FRAME_OPTIONS.map((option) => {
                                        const unlocked = isFrameUnlocked(option.key, summary.level);
                                        const selected = pendingFrameKey === option.key;
                                        const requiredLevel = getFrameRequiredLevel(option.key);
                                        const Icon = selectedIconOption.icon;

                                        return (
                                            <TouchableOpacity
                                                key={option.key}
                                                activeOpacity={0.8}
                                                disabled={!unlocked}
                                                onPress={() => setPendingFrameKey(option.key)}
                                                style={{ width: frameItemWidth, marginBottom: 10 }}
                                                className={`rounded-xl border p-2 items-center ${selected ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f0f0f]'} ${unlocked ? '' : 'opacity-50'}`}
                                            >
                                                <View
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 22,
                                                        borderWidth: option.borderWidth,
                                                        borderColor: option.borderColor,
                                                        backgroundColor: option.backgroundColor,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Icon size={pickerItemIconSize - 1} color="#f48c25" />
                                                </View>
                                                <AppText className="text-[11px] text-slate-700 dark:text-slate-200 font-semibold mt-1 text-center" numberOfLines={2}>
                                                    {option.label}
                                                </AppText>
                                                {!unlocked ? (
                                                    <View className="flex-row items-center mt-0.5">
                                                        <Lock size={10} color="#64748b" />
                                                        <AppText className="text-[10px] text-slate-500 ml-1">Nível {requiredLevel}</AppText>
                                                    </View>
                                                ) : null}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>

                        {appearanceFeedback ? (
                            <View className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 mt-2 mb-1">
                                <AppText className="text-xs text-red-700 dark:text-red-300">{appearanceFeedback}</AppText>
                            </View>
                        ) : null}

                        <View className="flex-row gap-2 mt-3">
                            <Button
                                title="Cancelar"
                                variant="outline"
                                disabled={savingAppearance}
                                onPress={() => setShowAvatarPicker(false)}
                                className="flex-1"
                            />
                            <Button
                                title={savingAppearance ? 'Salvando...' : 'Salvar ícone'}
                                disabled={savingAppearance}
                                loading={savingAppearance}
                                onPress={saveProfileAppearance}
                                className="flex-1"
                            />
                        </View>
                    </View>
                </View>
            ) : null}

            {showLogoutConfirm ? (
                <View className="absolute inset-0 z-50">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={() => !logoutLoading && setShowLogoutConfirm(false)} />
                    <View className="absolute left-4 right-4 top-[38%] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Sair da conta</AppText>
                        <AppText className="text-slate-600 dark:text-slate-300 text-sm mt-2 mb-4">
                            Deseja realmente sair do aplicativo?
                        </AppText>

                        <Button
                            title="Sair da conta"
                            variant="danger"
                            loading={logoutLoading}
                            disabled={logoutLoading}
                            onPress={async () => {
                                setLogoutLoading(true);
                                try {
                                    await signOut();
                                } finally {
                                    setLogoutLoading(false);
                                    setShowLogoutConfirm(false);
                                }
                            }}
                            className="h-12 mb-2"
                        />
                        <Button
                            title="Cancelar"
                            variant="outline"
                            disabled={logoutLoading}
                            onPress={() => setShowLogoutConfirm(false)}
                        />
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Profile;

