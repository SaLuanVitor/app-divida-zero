import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppText from '../../components/AppText';
import AppTextInput from '../../components/AppTextInput';
import { View, TouchableOpacity, Pressable, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { CalendarDays, PlusCircle, Target, PiggyBank, Landmark, Sparkles, Trash2, ChevronRight } from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TutorialTarget from '../../components/tutorial/TutorialTarget';
import ScreenHelpButton from '../../components/ScreenHelpButton';
import { useBottomInset } from '../../context/BottomInsetContext';
import {
    createFinancialGoalContribution,
    deleteFinancialGoal,
    listFinancialGoalContributions,
    listFinancialGoals,
} from '../../services/financialGoals';
import {
    FinancialGoalContributionDto,
    FinancialGoalContributionKind,
    FinancialGoalDto,
    FinancialGoalType,
} from '../../types/financialGoal';

type FeedbackState = {
    kind: 'success' | 'error';
    title: string;
    message: string;
};

const goalTypeOptions: Array<{ value: FinancialGoalType; label: string; icon: any }> = [
    { value: 'save', label: 'Economizar', icon: PiggyBank },
    { value: 'debt', label: 'Quitar dívida', icon: Landmark },
    { value: 'specific', label: 'Objetivo específico', icon: Target },
];

const formatCurrency = (value: string | number) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatDateBR = (iso?: string | null) => {
    if (!iso) return 'Sem prazo definido';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
};

const CARD_PAGE_SIZE = 10;

const Metas = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { overlayBottomInset } = useBottomInset();

    const [goals, setGoals] = useState<FinancialGoalDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [goalPendingDelete, setGoalPendingDelete] = useState<FinancialGoalDto | null>(null);
    const [goalPendingContribution, setGoalPendingContribution] = useState<FinancialGoalDto | null>(null);
    const [contributionKind, setContributionKind] = useState<FinancialGoalContributionKind>('deposit');
    const [contributionAmountDigits, setContributionAmountDigits] = useState('');
    const [contributionNotes, setContributionNotes] = useState('');
    const [contributionLoading, setContributionLoading] = useState(false);
    const [contributionsByGoal, setContributionsByGoal] = useState<Record<number, FinancialGoalContributionDto[]>>({});
    const [fundingSnapshot, setFundingSnapshot] = useState({
        settled_global_balance: '0',
        allocated_to_goals: '0',
        available_for_goal_funding: '0',
    });
    const [visibleGoalsCount, setVisibleGoalsCount] = useState(CARD_PAGE_SIZE);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastGoalsLoadAtRef = useRef(0);

    const pushFeedback = useCallback((kind: FeedbackState['kind'], title: string, message: string) => {
        setFeedback({ kind, title, message });

        if (feedbackTimer.current) {
            clearTimeout(feedbackTimer.current);
        }

        feedbackTimer.current = setTimeout(() => {
            setFeedback(null);
            feedbackTimer.current = null;
        }, 2600);
    }, []);

    useEffect(() => {
        return () => {
            if (feedbackTimer.current) {
                clearTimeout(feedbackTimer.current);
            }
        };
    }, []);

    useEffect(() => {
        const incomingFeedback = route.params?.feedback as FeedbackState | undefined;
        if (!incomingFeedback) return;

        pushFeedback(incomingFeedback.kind, incomingFeedback.title, incomingFeedback.message);
        navigation.setParams({ feedback: undefined });
    }, [navigation, pushFeedback, route.params?.feedback]);

    const loadGoals = useCallback(async () => {
        setLoading(true);
        try {
            const result = await listFinancialGoals();
            setGoals(result.goals);
            setFundingSnapshot({
                settled_global_balance: result.settled_global_balance,
                allocated_to_goals: result.allocated_to_goals,
                available_for_goal_funding: result.available_for_goal_funding,
            });
            if (result.goals.length > 0) {
                const contributionPairs = await Promise.all(
                    result.goals.map(async (goalItem) => {
                        try {
                            const data = await listFinancialGoalContributions(goalItem.id);
                            return [goalItem.id, data.contributions] as const;
                        } catch {
                            return [goalItem.id, []] as const;
                        }
                    })
                );
                setContributionsByGoal(Object.fromEntries(contributionPairs));
            } else {
                setContributionsByGoal({});
            }
            setVisibleGoalsCount(CARD_PAGE_SIZE);
            lastGoalsLoadAtRef.current = 0;
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível carregar as metas.';
            pushFeedback('error', 'Erro ao carregar', message);
        } finally {
            setLoading(false);
        }
    }, [pushFeedback]);

    useFocusEffect(
        useCallback(() => {
            loadGoals();
        }, [loadGoals])
    );

    const stats = useMemo(() => {
        const active = goals.filter((goal) => goal.status === 'active').length;
        const completed = goals.filter((goal) => goal.status === 'completed').length;
        const totalProgress = goals.reduce((acc, goal) => acc + goal.progress_pct, 0);
        const avgProgress = goals.length ? Math.round(totalProgress / goals.length) : 0;

        return { active, completed, avgProgress };
    }, [goals]);

    const goalsToRender = useMemo(() => goals.slice(0, visibleGoalsCount), [goals, visibleGoalsCount]);
    const hasMoreGoals = visibleGoalsCount < goals.length;

    const handleGoalsScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (!hasMoreGoals) return;

            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const reachedBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 160;
            if (!reachedBottom) return;

            const now = Date.now();
            if (now - lastGoalsLoadAtRef.current < 250) return;
            lastGoalsLoadAtRef.current = now;

            setVisibleGoalsCount((prev) => Math.min(prev + CARD_PAGE_SIZE, goals.length));
        },
        [goals.length, hasMoreGoals]
    );

    const openCreateScreen = () => {
        navigation.navigate('MetaForm', {
            mode: 'create',
            goal: undefined,
            nonce: Date.now(),
        });
    };

    const openEditScreen = (goal: FinancialGoalDto) => {
        navigation.navigate('MetaForm', {
            mode: 'edit',
            goal,
            nonce: Date.now(),
        });
    };

    const requestDeleteGoal = (goal: FinancialGoalDto) => {
        setGoalPendingDelete(goal);
    };

    const confirmDeleteGoal = async () => {
        if (!goalPendingDelete) return;

        setDeleteLoading(true);
        try {
            await deleteFinancialGoal(goalPendingDelete.id);
            await loadGoals();
            pushFeedback('success', 'Meta removida', 'A meta foi removida com sucesso.');
            setGoalPendingDelete(null);
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível remover a meta.';
            pushFeedback('error', 'Erro ao remover', message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const openContributionModal = (goal: FinancialGoalDto, kind: FinancialGoalContributionKind) => {
        setGoalPendingContribution(goal);
        setContributionKind(kind);
        setContributionAmountDigits('');
        setContributionNotes('');
    };

    const closeContributionModal = (options?: { force?: boolean }) => {
        if (contributionLoading && !options?.force) return;
        setGoalPendingContribution(null);
        setContributionAmountDigits('');
        setContributionNotes('');
    };

    const submitContribution = async () => {
        if (!goalPendingContribution) return;

        const amount = Number(contributionAmountDigits || '0') / 100;
        const availableToFund = Number(fundingSnapshot.available_for_goal_funding || '0');
        if (amount <= 0) {
            pushFeedback('error', 'Valor inválido', 'Informe um valor maior que zero para continuar.');
            return;
        }
        if (contributionKind === 'deposit' && amount > availableToFund) {
            pushFeedback(
                'error',
                'Saldo insuficiente',
                `Você só pode aportar até ${formatCurrency(availableToFund)} no momento.`
            );
            return;
        }

        setContributionLoading(true);
        try {
            const result = await createFinancialGoalContribution(goalPendingContribution.id, {
                kind: contributionKind,
                amount,
                notes: contributionNotes.trim() || undefined,
            });

            await loadGoals();
            const monthlyHistoryHint = result.linked_record_id
                ? ' O registro já foi lançado no histórico mensal.'
                : '';
            pushFeedback(
                'success',
                contributionKind === 'deposit' ? 'Valor adicionado' : 'Valor retirado',
                `${result.message}${monthlyHistoryHint}`
            );
            setFundingSnapshot({
                settled_global_balance: result.settled_global_balance,
                allocated_to_goals: result.allocated_to_goals,
                available_for_goal_funding: result.available_for_goal_funding,
            });
            closeContributionModal({ force: true });
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível registrar o valor agora.';
            pushFeedback('error', 'Falha no aporte', message);
        } finally {
            setContributionLoading(false);
        }
    };

    return (
        <>
            <Layout
                scrollable
                contentContainerClassName="p-4 bg-[#f8f7f5] dark:bg-black"
                scrollViewProps={{
                    onScroll: handleGoalsScroll,
                    scrollEventThrottle: 16,
                }}
            >
                <View className="flex-row items-center justify-between mb-1">
                    <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-bold">Metas</AppText>
                    <View className="flex-row items-center -mr-1">
                        <ScreenHelpButton
                            title="Ajuda - Metas"
                            bullets={[
                                'Crie uma meta com valor-alvo e prazo.',
                                'Adicione ou retire valor para acompanhar o progresso.',
                                'Revise metas ativas e concluídas para manter prioridade.',
                            ]}
                            accessibilityLabel="Abrir ajuda da tela Metas"
                        />
                        <TutorialTarget targetId="metas-create-button">
                            <TouchableOpacity className="bg-primary rounded-full px-4 py-2 flex-row items-center gap-2" onPress={openCreateScreen}>
                                <PlusCircle size={16} color="#fff" />
                                <AppText className="text-white font-bold text-sm">Nova meta</AppText>
                            </TouchableOpacity>
                        </TutorialTarget>
                    </View>
                </View>
                <AppText className="text-slate-500 dark:text-slate-200 mb-5">Acompanhe sua evolução e ajuste suas metas.</AppText>

                <View className="flex-row gap-3 mb-4">
                    <Card className="flex-1" noPadding>
                        <View className="p-4">
                            <AppText className="text-slate-500 dark:text-slate-200 text-xs font-bold uppercase">Ativas</AppText>
                            <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-2">{stats.active}</AppText>
                        </View>
                    </Card>
                    <Card className="flex-1" noPadding>
                        <View className="p-4">
                            <AppText className="text-slate-500 dark:text-slate-200 text-xs font-bold uppercase">Concluídas</AppText>
                            <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-2">{stats.completed}</AppText>
                        </View>
                    </Card>
                    <Card className="flex-1" noPadding>
                        <View className="p-4">
                            <AppText className="text-slate-500 dark:text-slate-200 text-xs font-bold uppercase">Média</AppText>
                            <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-2">{stats.avgProgress}%</AppText>
                        </View>
                    </Card>
                </View>

                <Card className="mb-4" noPadding>
                    <View className="p-4 bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700">
                        <AppText className="text-slate-500 dark:text-slate-200 text-xs font-bold uppercase">
                            Saldo disponível para metas
                        </AppText>
                        <AppText className="text-slate-900 dark:text-slate-100 text-xl font-black mt-1">
                            {formatCurrency(fundingSnapshot.available_for_goal_funding)}
                        </AppText>
                        <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">
                            Quitado global: {formatCurrency(fundingSnapshot.settled_global_balance)} • Alocado em metas: {formatCurrency(fundingSnapshot.allocated_to_goals)}
                        </AppText>
                    </View>
                </Card>

                <Card className="mb-4" noPadding>
                    <View className="p-4 bg-primary/10 border border-primary/10 rounded-2xl">
                        <View className="flex-row items-center gap-2 mb-2">
                            <Sparkles size={18} color="#f48c25" />
                            <AppText className="text-slate-900 dark:text-slate-100 font-bold">Progresso gamificado</AppText>
                        </View>
                        <AppText className="text-slate-600 dark:text-slate-200 text-sm">
                            Ao avançar suas metas, o sistema libera XP automaticamente nos marcos de 25%, 50%, 75% e 100%.
                        </AppText>
                    </View>
                </Card>

                {loading ? (
                    <View className="items-center py-10">
                        <ActivityIndicator color="#f48c25" />
                        <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">Carregando metas...</AppText>
                    </View>
                ) : null}

                {!loading && goals.length === 0 ? (
                    <Card noPadding>
                        <View className="p-5">
                            <AppText className="text-slate-900 dark:text-slate-100 font-bold text-base mb-1">Nenhuma meta cadastrada</AppText>
                            <AppText className="text-slate-500 dark:text-slate-200 text-sm mb-4">
                                Crie sua primeira meta e gerencie o saldo dela com aportes manuais.
                            </AppText>
                            <Button title="Criar primeira meta" onPress={openCreateScreen} />
                        </View>
                    </Card>
                ) : null}

                {goalsToRender.map((goal) => {
                    const typeOption = goalTypeOptions.find((item) => item.value === goal.goal_type);
                    const Icon = typeOption?.icon || Target;

                    return (
                        <Card key={goal.id} className="mb-4" noPadding>
                            <TouchableOpacity activeOpacity={0.88} onPress={() => openEditScreen(goal)}>
                                <View className="p-4">
                                    <View className="flex-row items-start justify-between mb-3">
                                        <View className="flex-1 flex-row items-start">
                                            <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center mr-3">
                                                <Icon size={20} color="#f48c25" />
                                            </View>
                                            <View className="flex-1 pt-0.5 pr-1">
                                                <AppText className="text-slate-900 dark:text-slate-100 font-bold text-base">{goal.title}</AppText>
                                                <AppText className="text-slate-500 dark:text-slate-200 text-xs">
                                                    {typeOption?.label || 'Meta'} - {goal.status === 'completed' ? 'Concluída' : 'Em andamento'}
                                                </AppText>
                                            </View>
                                        </View>
                                        <ChevronRight size={16} color="#94a3b8" />
                                    </View>

                                    <View className="absolute right-4 top-4 z-10">
                                        <TouchableOpacity
                                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                requestDeleteGoal(goal);
                                            }}
                                        >
                                            <Trash2 size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>

                                    {goal.description ? (
                                        <AppText className="text-slate-600 dark:text-slate-200 text-sm mb-3">{goal.description}</AppText>
                                    ) : null}

                                    <View className="flex-row justify-between mb-2">
                                        <AppText className="text-slate-500 dark:text-slate-200 text-xs font-bold uppercase">Progresso</AppText>
                                        <AppText className="text-primary text-xs font-bold">{goal.progress_pct}%</AppText>
                                    </View>

                                    <View className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                        <View className="h-full bg-primary rounded-full" style={{ width: `${goal.progress_pct}%` }} />
                                    </View>

                                    <View className="flex-row justify-between items-end mb-3">
                                        <View>
                                            <AppText className="text-slate-400 dark:text-slate-200 text-xs">Já alcançado</AppText>
                                            <AppText className="text-slate-900 dark:text-slate-100 font-bold">{formatCurrency(goal.current_amount)}</AppText>
                                        </View>
                                        <View className="items-end">
                                            <AppText className="text-slate-400 dark:text-slate-200 text-xs">Meta</AppText>
                                            <AppText className="text-slate-900 dark:text-slate-100 font-bold">{formatCurrency(goal.target_amount)}</AppText>
                                        </View>
                                    </View>

                                    <View className="flex-row gap-2 mb-3">
                                        <TouchableOpacity
                                            className="flex-1 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 items-center"
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                openContributionModal(goal, 'deposit');
                                            }}
                                        >
                                            <AppText className="text-primary text-xs font-bold">Adicionar valor</AppText>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-2 items-center"
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                openContributionModal(goal, 'withdraw');
                                            }}
                                        >
                                            <AppText className="text-slate-700 dark:text-slate-200 text-xs font-bold">Retirar valor</AppText>
                                        </TouchableOpacity>
                                    </View>

                                    <View className="bg-slate-50 dark:bg-[#1a1a1a] rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                        <AppText className="text-slate-600 dark:text-slate-200 text-sm">
                                            {goal.status === 'completed'
                                                ? 'Meta concluída com sucesso.'
                                                : `Faltam ${formatCurrency(goal.remaining_amount)} para concluir.`}
                                        </AppText>
                                        <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-2">
                                            {`${contributionsByGoal[goal.id]?.length ?? 0} aporte(s) registrado(s) nesta meta`}
                                        </AppText>
                                        <View className="flex-row items-center gap-2 mt-2">
                                            <CalendarDays size={14} color="#94a3b8" />
                                            <AppText className="text-slate-500 dark:text-slate-200 text-xs">Início: {formatDateBR(goal.start_date)}</AppText>
                                        </View>
                                        <View className="flex-row items-center gap-2 mt-2">
                                            <CalendarDays size={14} color="#94a3b8" />
                                            <AppText className="text-slate-500 dark:text-slate-200 text-xs">{formatDateBR(goal.target_date)}</AppText>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Card>
                    );
                })}

                {!loading && hasMoreGoals ? (
                    <View className="items-center pb-2">
                        <ActivityIndicator color="#f48c25" />
                        <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-1">
                            Carregando mais metas...
                        </AppText>
                    </View>
                ) : null}
            </Layout>

            {feedback ? (
                <View pointerEvents="box-none" className="absolute left-4 right-4 z-[70]" style={{ bottom: overlayBottomInset }}>
                    <View
                        className={`rounded-xl border px-4 py-3 ${
                            feedback.kind === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                    >
                        <AppText
                            className={`font-bold text-sm ${
                                feedback.kind === 'success'
                                    ? 'text-emerald-800 dark:text-emerald-300'
                                    : 'text-red-800 dark:text-red-300'
                            }`}
                        >
                            {feedback.title}
                        </AppText>
                        <AppText
                            className={`text-xs mt-1 ${
                                feedback.kind === 'success'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-red-700 dark:text-red-300'
                            }`}
                        >
                            {feedback.message}
                        </AppText>
                    </View>
                </View>
            ) : null}

            {goalPendingContribution ? (
                <View className="absolute inset-0 z-[66]">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={() => closeContributionModal()} />
                    <View className="absolute left-4 right-4 top-[26%] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm dark:shadow-none">
                        <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">
                            {contributionKind === 'deposit' ? 'Adicionar valor' : 'Retirar valor'}
                        </AppText>
                        <AppText className="text-slate-600 dark:text-slate-200 text-sm mt-1 mb-3">
                            {goalPendingContribution.title}
                        </AppText>
                        {contributionKind === 'deposit' ? (
                            <View className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] px-3 py-2 mb-3">
                                <AppText className="text-slate-600 dark:text-slate-200 text-xs">
                                    Disponível para aporte agora:{' '}
                                    <AppText className="font-bold text-slate-900 dark:text-slate-100">
                                        {formatCurrency(fundingSnapshot.available_for_goal_funding)}
                                    </AppText>
                                </AppText>
                            </View>
                        ) : null}

                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Valor</AppText>
                        <AppTextInput
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121212]"
                            keyboardType="number-pad"
                            placeholder="R$ 0,00"
                            placeholderTextColor="#94a3b8"
                            value={formatCurrency(Number(contributionAmountDigits || '0') / 100)}
                            onChangeText={(value) => setContributionAmountDigits(onlyDigits(value).slice(0, 10))}
                        />

                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Observação (opcional)</AppText>
                        <AppTextInput
                            className="min-h-[64px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 mb-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121212]"
                            placeholder="Ex: transferência para reserva"
                            placeholderTextColor="#94a3b8"
                            multiline
                            value={contributionNotes}
                            onChangeText={setContributionNotes}
                        />

                        <Button
                            title={contributionLoading ? 'Salvando...' : contributionKind === 'deposit' ? 'Confirmar aporte' : 'Confirmar retirada'}
                            loading={contributionLoading}
                            disabled={
                                contributionLoading ||
                                (contributionKind === 'deposit' &&
                                    Number(contributionAmountDigits || '0') / 100 >
                                        Number(fundingSnapshot.available_for_goal_funding || '0'))
                            }
                            onPress={submitContribution}
                            className="mb-2"
                        />
                        <Button
                            title="Cancelar"
                            variant="outline"
                            disabled={contributionLoading}
                            onPress={() => closeContributionModal()}
                        />
                    </View>
                </View>
            ) : null}

            {goalPendingDelete ? (
                <View className="absolute inset-0 z-[65]">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={() => !deleteLoading && setGoalPendingDelete(null)} />
                    <View className="absolute left-4 right-4 top-[35%] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm dark:shadow-none">
                        <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Excluir meta</AppText>
                        <AppText className="text-slate-600 dark:text-slate-200 text-sm mt-2 mb-4">
                            Deseja remover a meta "{goalPendingDelete.title}"? Essa ação atualiza o progresso e o histórico de XP vinculado.
                        </AppText>

                        <Button
                            title="Excluir meta"
                            variant="danger"
                            loading={deleteLoading}
                            disabled={deleteLoading}
                            onPress={confirmDeleteGoal}
                            className="mb-2"
                        />
                        <Button
                            title="Cancelar"
                            variant="outline"
                            disabled={deleteLoading}
                            onPress={() => setGoalPendingDelete(null)}
                        />
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Metas;







