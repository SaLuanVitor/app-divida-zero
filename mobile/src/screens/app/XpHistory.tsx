import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppTextInput from '../../components/AppTextInput';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, ActivityIndicator, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ArrowLeft, Clock3, Filter, Search, Sparkles } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeMode } from '../../context/ThemeContext';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { listGamificationEvents } from '../../services/gamification';
import { GamificationEventDto } from '../../types/gamification';
import { runWhenIdle } from '../../utils/idle';
import { useAccessibility } from '../../context/AccessibilityContext';

type EventFilter = 'all' | 'gain' | 'loss';
const CARD_PAGE_SIZE = 10;

const eventTitleMap: Record<string, string> = {
    record_created: 'Registro criado',
    income_received: 'Ganho recebido',
    expense_paid: 'Dívida/despesa quitada',
    record_deleted: 'Registro excluído',
    achievement_unlocked: 'Conquista desbloqueada',
    goal_created: 'Meta criada',
    goal_progress_milestone: 'Marco de progresso',
    goal_completed: 'Meta concluída',
    goal_deleted: 'Meta excluída',
    daily_achievement_completed: 'Conquista diária concluída',
};

const eventDescriptionMap: Record<string, string> = {
    record_created: 'Você criou um novo registro financeiro.',
    income_received: 'Um ganho foi marcado como recebido.',
    expense_paid: 'Uma dívida/despesa foi marcada como paga.',
    record_deleted: 'Um registro foi removido e o XP foi ajustado.',
    achievement_unlocked: 'Uma conquista foi desbloqueada.',
    goal_created: 'Você criou uma nova meta financeira.',
    goal_progress_milestone: 'Sua meta alcançou um novo marco de progresso.',
    goal_completed: 'Uma meta foi concluída com sucesso.',
    goal_deleted: 'Uma meta foi excluída e o XP correspondente foi ajustado.',
    daily_achievement_completed: 'Uma conquista diária foi concluída automaticamente.',
};

const eventReasonMap: Record<string, string> = {
    record_created: 'Pontuação por criação de novos registros financeiros.',
    income_received: 'Pontuação por marcar ganho como recebido.',
    expense_paid: 'Pontuação por marcar dívida/despesa como paga.',
    record_deleted: 'Estorno automático de XP por exclusão de registros.',
    achievement_unlocked: 'Bônus de conquista desbloqueada.',
    goal_created: 'Pontuação por criar uma nova meta financeira.',
    goal_progress_milestone: 'Pontuação por alcançar marcos de progresso na meta.',
    goal_completed: 'Bônus por concluir uma meta financeira.',
    goal_deleted: 'Estorno de XP por exclusão de meta e dos marcos já alcançados.',
    daily_achievement_completed: 'Bônus por completar tarefas diárias.',
};

const metadataLabelMap: Record<string, string> = {
    created_count: 'Registros criados',
    mode: 'Tipo',
    flow_type: 'Fluxo',
    record_type: 'Registro',
    record_title: 'Título do lançamento',
    category: 'Categoria',
    deleted_count: 'Registros excluídos',
    settled_count: 'Registros concluídos',
    goal_id: 'Meta',
    goal_title: 'Título da meta',
    goal_type: 'Tipo da meta',
    milestone: 'Marco',
    removed_milestones: 'Marcos revertidos',
    achievement_key: 'Conquista',
    achievement_label: 'Conquista desbloqueada',
    daily_key: 'Conquista diária',
    daily_title: 'Tarefa diária',
    date_key: 'Data da diária',
    task_group: 'Grupo',
    local_date: 'Data local',
};

const metadataValueMap: Record<string, Record<string, string>> = {
    mode: {
        launch: 'Lançamento',
        debt: 'Dívida',
    },
    flow_type: {
        income: 'Ganho',
        expense: 'Despesa',
    },
    record_type: {
        launch: 'Lançamento',
        debt: 'Dívida',
    },
    goal_type: {
        save: 'Economizar',
        debt: 'Quitar dívida',
        specific: 'Objetivo específico',
    },
    achievement_key: {
        first_record: 'Primeiro passo',
        first_settlement: 'Conta resolvida',
        ten_records: 'Organização ativa',
        five_settled: 'Ritmo constante',
        first_goal_created: 'Primeira meta criada',
        first_goal_completed: 'Primeira meta concluída',
        goal_before_deadline: 'Meta concluída antes do prazo',
    },
};

const keywordMap: Record<string, string> = {
    record: 'Registro',
    created: 'Criado',
    deleted: 'Excluído',
    income: 'Ganho',
    expense: 'Despesa',
    paid: 'Paga',
    received: 'Recebido',
    achievement: 'Conquista',
    unlocked: 'Desbloqueada',
    event: 'Evento',
    goal: 'Meta',
    progress: 'Progresso',
    milestone: 'Marco',
};

const toPtBrTitleFallback = (rawType: string) =>
    rawType
        .split('_')
        .map((word) => keywordMap[word] || word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const resolveEventTitle = (event: GamificationEventDto) => {
    if (event.event_type === 'daily_achievement_completed') {
        const dailyTitle = String(event.metadata?.daily_title || '').trim();
        return dailyTitle || eventTitleMap[event.event_type];
    }

    if (event.event_type === 'goal_progress_milestone') {
        const milestone = Number(event.metadata?.milestone || 0);
        return milestone > 0 ? `Marco de progresso ${milestone}%` : 'Marco de progresso';
    }

    return eventTitleMap[event.event_type] || toPtBrTitleFallback(event.event_type);
};

const resolveSubject = (event: GamificationEventDto) => {
    const goalTitle = String(event.metadata?.goal_title || '').trim();
    if (goalTitle) return goalTitle;

    const recordTitle = String(event.metadata?.record_title || '').trim();
    if (recordTitle) return recordTitle;

    const achievementLabel = String(event.metadata?.achievement_label || '').trim();
    if (achievementLabel) return achievementLabel;

    return '';
};

const resolveSubtitle = (event: GamificationEventDto) => {
    switch (event.event_type) {
        case 'income_received':
            return 'Ganho recebido';
        case 'expense_paid':
            return 'Dívida/despesa quitada';
        case 'record_created':
            return 'Lançamento criado';
        case 'record_deleted':
            return 'Lançamento excluído';
        case 'goal_created':
            return 'Meta criada';
        case 'goal_progress_milestone': {
            const milestone = Number(event.metadata?.milestone || 0);
            return milestone > 0 ? `Meta atingiu ${milestone}%` : 'Progresso da meta';
        }
        case 'goal_completed':
            return 'Meta concluída';
        case 'goal_deleted':
            return 'Meta excluída';
        case 'achievement_unlocked':
            return 'Conquista desbloqueada';
        case 'daily_achievement_completed':
            return 'Tarefa diária concluída';
        default:
            return eventDescriptionMap[event.event_type] || 'Evento de XP';
    }
};

const normalizeMetadata = (metadata?: Record<string, unknown>) => {
    if (!metadata) return [] as Array<{ label: string; value: string }>;

    return Object.entries(metadata)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([key, value]) => ({
            label: metadataLabelMap[key] || key.replace(/_/g, ' '),
            value: Array.isArray(value)
                ? value.join(', ')
                : metadataValueMap[key]?.[String(value)] || String(value),
        }));
};

type XpHistoryProps = {
    navigation: any;
};

const XpHistory = ({ navigation }: XpHistoryProps) => {
    const { darkMode } = useThemeMode();
    const { fontScale, largerTouchTargets } = useAccessibility();
    const [events, setEvents] = useState<GamificationEventDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<EventFilter>('all');
    const [visibleEventsCount, setVisibleEventsCount] = useState(CARD_PAGE_SIZE);
    const lastLoadTimestampRef = useRef(0);
    const iconColor = darkMode ? '#e2e8f0' : '#334155';
    const fieldControlHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);

    const loadEvents = useCallback(async (options: { force?: boolean; silent?: boolean } = {}) => {
        const { force = false, silent = false } = options;
        if (!silent) setLoading(true);
        try {
            const result = await listGamificationEvents({ force });
            setEvents(Array.isArray(result.events) ? result.events : []);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const hasData = events.length > 0;
            const cancel = runWhenIdle(() => {
                loadEvents({ force: false, silent: hasData });
                void loadEvents({ force: true, silent: true });
            });
            return cancel;
        }, [events.length, loadEvents])
    );

    const filteredEvents = useMemo(() => {
        let base = events;

        if (filter === 'gain') {
            base = base.filter((event) => event.points > 0);
        }
        if (filter === 'loss') {
            base = base.filter((event) => event.points < 0);
        }

        const q = query.trim().toLowerCase();
        if (!q) return base;

        return base.filter((event) => {
            const title = resolveEventTitle(event);
            const description = eventDescriptionMap[event.event_type] || 'Evento de XP';
            const reason = eventReasonMap[event.event_type] || '';
            const details = normalizeMetadata(event.metadata)
                .map((item) => `${item.label} ${item.value}`)
                .join(' ');

            const haystack = `${title} ${description} ${reason} ${details} ${event.points}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [events, filter, query]);

    useEffect(() => {
        setVisibleEventsCount(CARD_PAGE_SIZE);
        lastLoadTimestampRef.current = 0;
    }, [events, filter, query]);

    const visibleEvents = useMemo(() => filteredEvents.slice(0, visibleEventsCount), [filteredEvents, visibleEventsCount]);
    const hasMoreEvents = visibleEventsCount < filteredEvents.length;

    const handleEventsScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (!hasMoreEvents) return;

            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const reachedBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 160;
            if (!reachedBottom) return;

            const now = Date.now();
            if (now - lastLoadTimestampRef.current < 250) return;
            lastLoadTimestampRef.current = now;

            setVisibleEventsCount((prev) => Math.min(prev + CARD_PAGE_SIZE, filteredEvents.length));
        },
        [filteredEvents.length, hasMoreEvents]
    );

    return (
        <Layout contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-24"
                onScroll={handleEventsScroll}
                scrollEventThrottle={16}
            >
                <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <View className="flex-row items-center mb-3">
                        <TouchableOpacity
                            onPress={() => {
                                if (navigation?.canGoBack?.()) {
                                    navigation.goBack();
                                    return;
                                }
                                navigation?.navigate?.('Perfil');
                            }}
                            className="p-2 -ml-2 mr-1"
                        >
                            <ArrowLeft size={22} color={iconColor} />
                        </TouchableOpacity>
                        <View>
                            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">Histórico de XP</AppText>
                            <AppText className="text-slate-500 dark:text-slate-300 text-xs">Detalhes de cada ganho e perda de pontuação.</AppText>
                        </View>
                    </View>

                    <View
                        className="rounded-xl border border-slate-200 bg-[#f8f7f5] dark:bg-black px-3 flex-row items-center"
                        style={{ minHeight: fieldControlHeight, height: fieldControlHeight }}
                    >
                        <Search size={16} color="#64748b" />
                        <AppTextInput
                            className="flex-1 ml-2 text-slate-900 dark:text-slate-100"
                            placeholder="Buscar eventos, ações ou detalhes"
                            placeholderTextColor="#94a3b8"
                            value={query}
                            onChangeText={setQuery}
                        />
                    </View>

                    <View className="flex-row flex-wrap gap-2 mt-3">
                        <TouchableOpacity
                            className={`px-3 py-2 rounded-full border ${filter === 'all' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                            onPress={() => setFilter('all')}
                        >
                            <AppText className={`text-xs font-bold ${filter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Todos</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`px-3 py-2 rounded-full border ${filter === 'gain' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                            onPress={() => setFilter('gain')}
                        >
                            <AppText className={`text-xs font-bold ${filter === 'gain' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Ganhos</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`px-3 py-2 rounded-full border ${filter === 'loss' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                            onPress={() => setFilter('loss')}
                        >
                            <AppText className={`text-xs font-bold ${filter === 'loss' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Perdas</AppText>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="p-4">
                    {loading ? (
                        <View className="py-4">
                            <Card noPadding>
                                <View className="p-4">
                                    <LoadingSkeleton rows={4} height={14} />
                                </View>
                            </Card>
                            <View className="items-center py-5">
                                <ActivityIndicator color="#f48c25" />
                                <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-2">Atualizando histórico...</AppText>
                            </View>
                        </View>
                    ) : null}

                    {!loading && filteredEvents.length === 0 ? (
                        <Card noPadding>
                            <View className="p-4">
                                <AppText className="text-slate-600 dark:text-slate-300 text-sm">Sem eventos para os filtros informados.</AppText>
                            </View>
                        </Card>
                    ) : null}

                    {visibleEvents.map((event) => {
                        const title = resolveEventTitle(event);
                        const description = eventDescriptionMap[event.event_type] || 'Evento de XP';
                        const reason = eventReasonMap[event.event_type] || 'Detalhe não informado.';
                        const metadata = normalizeMetadata(event.metadata);
                        const isGain = event.points >= 0;
                        const subject = resolveSubject(event);
                        const subtitle = resolveSubtitle(event);
                        const displayTitle = subject || title;
                        const displaySubtitle = subject ? subtitle : description;

                        return (
                            <Card key={event.id} className="mb-3" noPadding>
                                <View className="p-4">
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-row items-center">
                                            <View className={`w-10 h-10 rounded-lg items-center justify-center ${isGain ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                                <Sparkles size={18} color={isGain ? '#059669' : '#dc2626'} />
                                            </View>
                                            <View className="ml-3">
                                                <AppText className="text-slate-900 dark:text-slate-100 font-bold capitalize">{displayTitle}</AppText>
                                                <AppText className="text-slate-500 dark:text-slate-300 text-xs">{displaySubtitle}</AppText>
                                            </View>
                                        </View>
                                        <AppText className={`text-sm font-bold ${isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {isGain ? `+${event.points}` : event.points} XP
                                        </AppText>
                                    </View>

                                    <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <View className="flex-row items-center mb-2">
                                            <Clock3 size={13} color="#94a3b8" />
                                            <AppText className="text-slate-400 dark:text-slate-300 text-xs ml-1">
                                                {new Date(event.created_at).toLocaleString('pt-BR')}
                                            </AppText>
                                        </View>

                                        <View className="bg-slate-50 dark:bg-[#1a1a1a] rounded-lg p-3 border border-slate-100 dark:border-slate-800 mb-2">
                                            <AppText className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase mb-1">Motivo do XP</AppText>
                                            <AppText className="text-slate-600 dark:text-slate-300 text-xs">{reason}</AppText>
                                        </View>

                                        {metadata.length > 0 ? (
                                            <View className="bg-slate-50 dark:bg-[#1a1a1a] rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                                                <View className="flex-row items-center mb-2">
                                                    <Filter size={12} color="#64748b" />
                                                    <AppText className="text-slate-600 dark:text-slate-300 text-xs font-bold ml-1 uppercase">Detalhes</AppText>
                                                </View>
                                                {metadata.map((item) => (
                                                    <View key={`${event.id}-${item.label}`} className="flex-row justify-between mb-1">
                                                        <AppText className="text-slate-500 dark:text-slate-300 text-xs capitalize">{item.label}</AppText>
                                                        <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{item.value}</AppText>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            </Card>
                        );
                    })}

                    {!loading && hasMoreEvents ? (
                        <View className="items-center py-3">
                            <ActivityIndicator color="#f48c25" />
                            <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1">Carregando mais eventos...</AppText>
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </Layout>
    );
};

export default XpHistory;






