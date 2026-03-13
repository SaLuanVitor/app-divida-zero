import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { ArrowLeft, Clock3, Filter, Search, Sparkles } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { listGamificationEvents } from '../../services/gamification';
import { GamificationEventDto } from '../../types/gamification';
import { runWhenIdle } from '../../utils/idle';

type EventFilter = 'all' | 'gain' | 'loss';

const eventTitleMap: Record<string, string> = {
    record_created: 'Registro criado',
    income_received: 'Ganho recebido',
    expense_paid: 'Dívida/despesa quitada',
    record_deleted: 'Registro excluído',
    achievement_unlocked: 'Conquista desbloqueada',
};

const eventDescriptionMap: Record<string, string> = {
    record_created: 'Você criou um novo registro financeiro.',
    income_received: 'Um ganho foi marcado como recebido.',
    expense_paid: 'Uma dívida/despesa foi marcada como paga.',
    record_deleted: 'Um registro foi removido e o XP foi ajustado.',
    achievement_unlocked: 'Uma conquista foi desbloqueada.',
};

const eventReasonMap: Record<string, string> = {
    record_created: 'Pontuação por criação de novos registros financeiros.',
    income_received: 'Pontuação por marcar ganho como recebido.',
    expense_paid: 'Pontuação por marcar dívida/despesa como paga.',
    record_deleted: 'Estorno automático de XP por exclusão de registros.',
    achievement_unlocked: 'Bônus de conquista desbloqueada.',
};

const metadataLabelMap: Record<string, string> = {
    created_count: 'Registros criados',
    mode: 'Tipo',
    flow_type: 'Fluxo',
    record_type: 'Registro',
    deleted_count: 'Registros excluídos',
    settled_count: 'Registros concluídos',
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
};

const toPtBrTitleFallback = (rawType: string) =>
    rawType
        .split('_')
        .map((word) => keywordMap[word] || word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const normalizeMetadata = (metadata?: Record<string, unknown>) => {
    if (!metadata) return [] as Array<{ label: string; value: string }>;

    return Object.entries(metadata)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([key, value]) => ({
            label: metadataLabelMap[key] || key.replace(/_/g, ' '),
            value: metadataValueMap[key]?.[String(value)] || String(value),
        }));
};

type XpHistoryProps = {
    navigation: any;
};

const XpHistory = ({ navigation }: XpHistoryProps) => {
    const [events, setEvents] = useState<GamificationEventDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<EventFilter>('all');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const result = await listGamificationEvents();
                setEvents(Array.isArray(result.events) ? result.events : []);
            } finally {
                setLoading(false);
            }
        };

        const cancel = runWhenIdle(() => {
            load();
        });
        return cancel;
    }, []);

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
            const title = eventTitleMap[event.event_type] || toPtBrTitleFallback(event.event_type);
            const description = eventDescriptionMap[event.event_type] || 'Evento de XP';
            const reason = eventReasonMap[event.event_type] || '';
            const details = normalizeMetadata(event.metadata)
                .map((item) => `${item.label} ${item.value}`)
                .join(' ');

            const haystack = `${title} ${description} ${reason} ${details} ${event.points}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [events, filter, query]);

    return (
        <Layout contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
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
                            <ArrowLeft size={22} color="#0f172a" />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold">Histórico de XP</Text>
                            <Text className="text-slate-500 dark:text-slate-300 text-xs">Detalhes de cada ganho e perda de pontuação.</Text>
                        </View>
                    </View>

                    <View className="h-11 rounded-xl border border-slate-200 bg-[#f8f7f5] dark:bg-black px-3 flex-row items-center">
                        <Search size={16} color="#64748b" />
                        <TextInput
                            className="flex-1 ml-2 text-slate-900 dark:text-slate-100"
                            placeholder="Buscar eventos, ações ou detalhes"
                            placeholderTextColor="#94a3b8"
                            value={query}
                            onChangeText={setQuery}
                        />
                    </View>

                    <View className="flex-row gap-2 mt-3">
                        <TouchableOpacity
                            className={`px-3 py-2 rounded-full border ${filter === 'all' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200'}`}
                            onPress={() => setFilter('all')}
                        >
                            <Text className={`text-xs font-bold ${filter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Todos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`px-3 py-2 rounded-full border ${filter === 'gain' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200'}`}
                            onPress={() => setFilter('gain')}
                        >
                            <Text className={`text-xs font-bold ${filter === 'gain' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Ganhos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`px-3 py-2 rounded-full border ${filter === 'loss' ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200'}`}
                            onPress={() => setFilter('loss')}
                        >
                            <Text className={`text-xs font-bold ${filter === 'loss' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Perdas</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="p-4">
                    {loading ? (
                        <View className="items-center py-10">
                            <ActivityIndicator color="#f48c25" />
                            <Text className="text-slate-500 dark:text-slate-300 text-xs mt-2">Carregando histórico...</Text>
                        </View>
                    ) : null}

                    {!loading && filteredEvents.length === 0 ? (
                        <Card noPadding>
                            <View className="p-4">
                                <Text className="text-slate-600 dark:text-slate-300 text-sm">Sem eventos para os filtros informados.</Text>
                            </View>
                        </Card>
                    ) : null}

                    {filteredEvents.map((event) => {
                        const title = eventTitleMap[event.event_type] || toPtBrTitleFallback(event.event_type);
                        const description = eventDescriptionMap[event.event_type] || 'Evento de XP';
                        const reason = eventReasonMap[event.event_type] || 'Detalhe não informado.';
                        const metadata = normalizeMetadata(event.metadata);
                        const isGain = event.points >= 0;

                        return (
                            <Card key={event.id} className="mb-3" noPadding>
                                <View className="p-4">
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-row items-center">
                                            <View className={`w-10 h-10 rounded-lg items-center justify-center ${isGain ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                                <Sparkles size={18} color={isGain ? '#059669' : '#dc2626'} />
                                            </View>
                                            <View className="ml-3">
                                                <Text className="text-slate-900 dark:text-slate-100 font-bold capitalize">{title}</Text>
                                                <Text className="text-slate-500 dark:text-slate-300 text-xs">{description}</Text>
                                            </View>
                                        </View>
                                        <Text className={`text-sm font-bold ${isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {isGain ? `+${event.points}` : event.points} XP
                                        </Text>
                                    </View>

                                    <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <View className="flex-row items-center mb-2">
                                            <Clock3 size={13} color="#94a3b8" />
                                            <Text className="text-slate-400 dark:text-slate-300 text-xs ml-1">
                                                {new Date(event.created_at).toLocaleString('pt-BR')}
                                            </Text>
                                        </View>

                                        <View className="bg-slate-50 dark:bg-[#1a1a1a] rounded-lg p-3 border border-slate-100 dark:border-slate-800 mb-2">
                                            <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase mb-1">Motivo do XP</Text>
                                            <Text className="text-slate-600 dark:text-slate-300 text-xs">{reason}</Text>
                                        </View>

                                        {metadata.length > 0 ? (
                                            <View className="bg-slate-50 dark:bg-[#1a1a1a] rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                                                <View className="flex-row items-center mb-2">
                                                    <Filter size={12} color="#64748b" />
                                                    <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold ml-1 uppercase">Detalhes</Text>
                                                </View>
                                                {metadata.map((item) => (
                                                    <View key={`${event.id}-${item.label}`} className="flex-row justify-between mb-1">
                                                        <Text className="text-slate-500 dark:text-slate-300 text-xs capitalize">{item.label}</Text>
                                                        <Text className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{item.value}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            </Card>
                        );
                    })}
                </View>
            </ScrollView>
        </Layout>
    );
};

export default XpHistory;





