import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    CalendarDays,
    PlusCircle,
    Target,
    PiggyBank,
    Landmark,
    Sparkles,
    Trash2,
    Pencil,
    X,
    Trophy,
    Shield,
    Crown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react-native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { createFinancialGoal, deleteFinancialGoal, listFinancialGoals, updateFinancialGoal } from '../../services/financialGoals';
import { CreateFinancialGoalPayload, FinancialGoalDto, FinancialGoalType } from '../../types/financialGoal';
import { normalizeGamificationSummary, XpFeedbackDto } from '../../types/gamification';

const goalTypeOptions: Array<{ value: FinancialGoalType; label: string; icon: any }> = [
    { value: 'save', label: 'Economizar', icon: PiggyBank },
    { value: 'debt', label: 'Quitar dívida', icon: Landmark },
    { value: 'specific', label: 'Objetivo específico', icon: Target },
];

const levelIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    sprout: Trophy,
    target: Target,
    shield: Shield,
    crown: Crown,
};

const formatCurrency = (value: string | number) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');
const formatAmountInput = (digits: string) => formatCurrency(Number(digits || '0') / 100);

const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatDateBR = (iso?: string | null) => {
    if (!iso) return 'Sem prazo definido';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
};

const toMonthLabel = (date: Date) => {
    const raw = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const chipClass = (active: boolean) =>
    `px-3 py-2 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`;

const chipTextClass = (active: boolean) =>
    `text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`;

type FeedbackState = {
    kind: 'success' | 'error';
    title: string;
    message: string;
};

type GoalDateField = 'start' | 'target';

const Metas = () => {
    const [goals, setGoals] = useState<FinancialGoalDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeDateField, setActiveDateField] = useState<GoalDateField>('target');
    const [submitting, setSubmitting] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [xpPopup, setXpPopup] = useState<XpFeedbackDto | null>(null);
    const [editingGoal, setEditingGoal] = useState<FinancialGoalDto | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [goalPendingDelete, setGoalPendingDelete] = useState<FinancialGoalDto | null>(null);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetAmountDigits, setTargetAmountDigits] = useState('');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [goalType, setGoalType] = useState<FinancialGoalType>('save');
    const [pickerMonth, setPickerMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

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

    const loadGoals = useCallback(async () => {
        setLoading(true);
        try {
            const result = await listFinancialGoals();
            setGoals(result.goals);
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

    const monthGrid = useMemo(() => {
        const year = pickerMonth.getFullYear();
        const month = pickerMonth.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells: Array<{ day: number | null; date: Date | null }> = [];

        for (let i = 0; i < firstWeekday; i += 1) {
            cells.push({ day: null, date: null });
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            cells.push({ day, date: new Date(year, month, day) });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ day: null, date: null });
        }

        return cells;
    }, [pickerMonth]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setTargetAmountDigits('');
        setStartDate(new Date());
        setTargetDate(null);
        setGoalType('save');
        setPickerMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        setEditingGoal(null);
    };

    const canSubmit = title.trim().length >= 2 && Number(targetAmountDigits || '0') > 0;

    const openDatePicker = (field: GoalDateField) => {
        const baseDate = field === 'start' ? startDate : (targetDate || new Date());
        setActiveDateField(field);
        setPickerMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
        setShowDatePicker(true);
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        resetForm();
        setShowCreateModal(false);
    };

    const openEditModal = (goal: FinancialGoalDto) => {
        setEditingGoal(goal);
        setTitle(goal.title);
        setDescription(goal.description || '');
        setTargetAmountDigits(String(Math.round(Number(goal.target_amount || '0') * 100)));
        setStartDate(goal.start_date ? new Date(`${goal.start_date}T00:00:00`) : new Date());
        setTargetDate(goal.target_date ? new Date(`${goal.target_date}T00:00:00`) : null);
        setGoalType(goal.goal_type);
        const baseDate = goal.start_date ? new Date(`${goal.start_date}T00:00:00`) : new Date();
        setPickerMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
        setShowCreateModal(true);
    };

    const handleSubmitGoal = async () => {
        if (!canSubmit) {
            pushFeedback('error', 'Dados inválidos', 'Preencha o título e o valor da meta para continuar.');
            return;
        }

        const payload: CreateFinancialGoalPayload = {
            title: title.trim(),
            description: description.trim() || undefined,
            target_amount: Number(targetAmountDigits) / 100,
            start_date: formatDateISO(startDate),
            target_date: targetDate ? formatDateISO(targetDate) : undefined,
            goal_type: goalType,
        };

        setSubmitting(true);
        try {
            if (editingGoal) {
                const result = await updateFinancialGoal(editingGoal.id, payload);
                resetForm();
                setShowCreateModal(false);
                await loadGoals();
                pushFeedback('success', 'Meta atualizada', result.message);
                return;
            }

            const result = await createFinancialGoal(payload);
            resetForm();
            setShowCreateModal(false);
            await loadGoals();

            if (result.xp_feedback) {
                setXpPopup({
                    ...result.xp_feedback,
                    summary: normalizeGamificationSummary(result.xp_feedback.summary),
                });
            } else {
                pushFeedback('success', 'Meta criada', result.message);
            }
        } catch (error: any) {
            const message = error?.response?.data?.error ?? `Não foi possível ${editingGoal ? 'atualizar' : 'criar'} a meta.`;
            pushFeedback('error', editingGoal ? 'Erro ao atualizar' : 'Erro ao criar', message);
        } finally {
            setSubmitting(false);
        }
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

    return (
        <>
            <Layout scrollable contentContainerClassName="p-4 bg-[#f8f7f5] dark:bg-black pb-28">
                <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-slate-900 dark:text-slate-100 text-2xl font-bold">Metas</Text>
                    <TouchableOpacity className="bg-primary rounded-full px-4 py-2 flex-row items-center gap-2" onPress={openCreateModal}>
                        <PlusCircle size={16} color="#fff" />
                        <Text className="text-white font-bold text-sm">Nova meta</Text>
                    </TouchableOpacity>
                </View>
                <Text className="text-slate-500 dark:text-slate-300 mb-5">Acompanhe sua evolução e ajuste suas metas.</Text>

                <View className="flex-row gap-3 mb-4">
                    <Card className="flex-1" noPadding>
                        <View className="p-4">
                            <Text className="text-slate-500 dark:text-slate-300 text-xs font-bold uppercase">Ativas</Text>
                            <Text className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-2">{stats.active}</Text>
                        </View>
                    </Card>
                    <Card className="flex-1" noPadding>
                        <View className="p-4">
                            <Text className="text-slate-500 dark:text-slate-300 text-xs font-bold uppercase">Concluídas</Text>
                            <Text className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-2">{stats.completed}</Text>
                        </View>
                    </Card>
                    <Card className="flex-1" noPadding>
                        <View className="p-4">
                            <Text className="text-slate-500 dark:text-slate-300 text-xs font-bold uppercase">Média</Text>
                            <Text className="text-slate-900 dark:text-slate-100 text-2xl font-black mt-2">{stats.avgProgress}%</Text>
                        </View>
                    </Card>
                </View>

                <Card className="mb-4" noPadding>
                    <View className="p-4 bg-primary/10 border border-primary/10 rounded-2xl">
                        <View className="flex-row items-center gap-2 mb-2">
                            <Sparkles size={18} color="#f48c25" />
                            <Text className="text-slate-900 dark:text-slate-100 font-bold">Progresso gamificado</Text>
                        </View>
                        <Text className="text-slate-600 dark:text-slate-300 text-sm">
                            Ao avançar suas metas, o sistema libera XP automaticamente nos marcos de 25%, 50%, 75% e 100%.
                        </Text>
                    </View>
                </Card>

                {loading ? (
                    <View className="items-center py-10">
                        <ActivityIndicator color="#f48c25" />
                        <Text className="text-slate-500 dark:text-slate-300 text-xs mt-2">Carregando metas...</Text>
                    </View>
                ) : null}

                {!loading && goals.length === 0 ? (
                    <Card noPadding>
                        <View className="p-5">
                            <Text className="text-slate-900 dark:text-slate-100 font-bold text-base mb-1">Nenhuma meta cadastrada</Text>
                            <Text className="text-slate-500 dark:text-slate-300 text-sm mb-4">
                                Crie sua primeira meta para acompanhar o progresso com base nos seus lançamentos.
                            </Text>
                            <Button title="Criar primeira meta" onPress={openCreateModal} className="h-11" />
                        </View>
                    </Card>
                ) : null}

                {goals.map((goal) => {
                    const typeOption = goalTypeOptions.find((item) => item.value === goal.goal_type);
                    const Icon = typeOption?.icon || Target;

                    return (
                        <Card key={goal.id} className="mb-4" noPadding>
                            <View className="p-4">
                                <View className="flex-row items-start justify-between mb-3">
                                    <View className="flex-row items-center gap-3 flex-1">
                                        <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
                                            <Icon size={20} color="#f48c25" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-slate-900 dark:text-slate-100 font-bold text-base">{goal.title}</Text>
                                            <Text className="text-slate-500 dark:text-slate-300 text-xs">
                                                {typeOption?.label || 'Meta'} - {goal.status === 'completed' ? 'Concluída' : 'Em andamento'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center gap-2">
                                        <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => openEditModal(goal)}>
                                            <Pencil size={14} color="#475569" />
                                        </TouchableOpacity>
                                        <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => requestDeleteGoal(goal)}>
                                            <Trash2 size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {goal.description ? (
                                    <Text className="text-slate-600 dark:text-slate-300 text-sm mb-3">{goal.description}</Text>
                                ) : null}

                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-slate-500 dark:text-slate-300 text-xs font-bold uppercase">Progresso</Text>
                                    <Text className="text-primary text-xs font-bold">{goal.progress_pct}%</Text>
                                </View>

                                <View className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                    <View className="h-full bg-primary rounded-full" style={{ width: `${goal.progress_pct}%` }} />
                                </View>

                                <View className="flex-row justify-between items-end mb-3">
                                    <View>
                                        <Text className="text-slate-400 dark:text-slate-300 text-xs">Já alcançado</Text>
                                        <Text className="text-slate-900 dark:text-slate-100 font-bold">{formatCurrency(goal.current_amount)}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-slate-400 dark:text-slate-300 text-xs">Meta</Text>
                                        <Text className="text-slate-900 dark:text-slate-100 font-bold">{formatCurrency(goal.target_amount)}</Text>
                                    </View>
                                </View>

                                <View className="bg-slate-50 dark:bg-[#1a1a1a] rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                    <Text className="text-slate-600 dark:text-slate-300 text-sm">
                                        {goal.status === 'completed'
                                            ? 'Meta concluída com sucesso.'
                                            : `Faltam ${formatCurrency(goal.remaining_amount)} para concluir.`}
                                    </Text>
                                    <View className="flex-row items-center gap-2 mt-2">
                                        <CalendarDays size={14} color="#94a3b8" />
                                        <Text className="text-slate-500 dark:text-slate-300 text-xs">
                                            Início: {formatDateBR(goal.start_date)}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center gap-2 mt-2">
                                        <CalendarDays size={14} color="#94a3b8" />
                                        <Text className="text-slate-500 dark:text-slate-300 text-xs">{formatDateBR(goal.target_date)}</Text>
                                    </View>
                                </View>
                            </View>
                        </Card>
                    );
                })}
            </Layout>

            {showCreateModal ? (
                <View className="absolute inset-0 z-50">
                    <Pressable className="absolute inset-0 bg-black/35" onPress={() => !submitting && closeCreateModal()} />
                    <View className="absolute left-4 right-4 top-[10%] bg-white dark:bg-[#121212] rounded-3xl border border-slate-200 dark:border-slate-700 p-4">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold">
                                {editingGoal ? 'Editar meta' : 'Nova meta'}
                            </Text>
                            <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => !submitting && closeCreateModal()}>
                                <X size={16} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Título da meta</Text>
                        <TextInput
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 mb-3 text-slate-900 dark:text-slate-100"
                            placeholder="Ex: Reserva de emergência"
                            placeholderTextColor="#94a3b8"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Valor total da meta</Text>
                        <TextInput
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 mb-3 text-slate-900 dark:text-slate-100"
                            placeholder="R$ 0,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            value={formatAmountInput(targetAmountDigits)}
                            onChangeText={(value) => setTargetAmountDigits(onlyDigits(value).slice(0, 10))}
                        />

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Data de início</Text>
                        <TouchableOpacity
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 flex-row items-center justify-between bg-white dark:bg-[#121212]"
                            onPress={() => openDatePicker('start')}
                        >
                            <Text className="text-slate-900 dark:text-slate-100">{formatDateBR(formatDateISO(startDate))}</Text>
                            <CalendarDays size={18} color="#64748b" />
                        </TouchableOpacity>

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Data alvo (opcional)</Text>
                        <TouchableOpacity
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 flex-row items-center justify-between bg-white dark:bg-[#121212]"
                            onPress={() => openDatePicker('target')}
                        >
                            <Text className="text-slate-900 dark:text-slate-100">{targetDate ? formatDateBR(formatDateISO(targetDate)) : 'Selecionar data alvo'}</Text>
                            <CalendarDays size={18} color="#64748b" />
                        </TouchableOpacity>

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-2">Tipo da meta</Text>
                        <View className="flex-row flex-wrap gap-2 mb-3">
                            {goalTypeOptions.map((option) => {
                                const active = goalType === option.value;
                                return (
                                    <TouchableOpacity key={option.value} className={chipClass(active)} onPress={() => setGoalType(option.value)}>
                                        <Text className={chipTextClass(active)}>{option.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Descrição (opcional)</Text>
                        <TextInput
                            className="min-h-[70px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-2 mb-4 text-slate-900 dark:text-slate-100"
                            placeholder="Descreva o objetivo da meta"
                            placeholderTextColor="#94a3b8"
                            multiline
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Button
                            title={submitting ? 'Salvando...' : editingGoal ? 'Salvar alterações' : 'Salvar meta'}
                            onPress={handleSubmitGoal}
                            disabled={submitting || !canSubmit}
                            className="h-12 mb-2"
                        />
                        <Button
                            title="Cancelar"
                            variant="outline"
                            disabled={submitting}
                            onPress={closeCreateModal}
                            className="h-11"
                        />
                    </View>
                </View>
            ) : null}

            {showDatePicker ? (
                <Pressable className="absolute inset-0 bg-black/20 z-[55]" onPress={() => setShowDatePicker(false)}>
                    <View className="absolute bottom-24 left-4 right-4 bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                        <View className="flex-row items-center justify-between mb-3">
                            <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}>
                                <ChevronLeft size={16} color="#1f2937" />
                            </TouchableOpacity>
                            <Text className="text-slate-900 dark:text-slate-100 font-bold">{toMonthLabel(pickerMonth)}</Text>
                            <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}>
                                <ChevronRight size={16} color="#1f2937" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-between mb-2 px-1">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                                <Text key={`${day}-${idx}`} className="w-8 text-center text-xs font-bold text-[#8a7560] dark:text-slate-300">{day}</Text>
                            ))}
                        </View>

                        <View className="flex-row flex-wrap justify-between mb-3">
                            {monthGrid.map((cell, idx) => {
                                const isSelected = cell.date && targetDate && formatDateISO(cell.date) === formatDateISO(targetDate);

                                return (
                                    <View key={`${cell.day ?? 'x'}-${idx}`} className="w-8 h-9 mb-1 items-center justify-center">
                                        {cell.day && cell.date ? (
                                            <TouchableOpacity
                                                className={`w-7 h-7 rounded-lg items-center justify-center ${isSelected ? 'bg-primary' : ''}`}
                                                onPress={() => {
                                                    if (activeDateField === 'start') {
                                                        setStartDate(cell.date);
                                                        if (targetDate && cell.date > targetDate) {
                                                            setTargetDate(null);
                                                        }
                                                    } else {
                                                        setTargetDate(cell.date);
                                                    }
                                                    setShowDatePicker(false);
                                                }}
                                            >
                                                <Text className={`${isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-200'} text-sm`}>
                                                    {cell.day}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>

                        <View className="flex-row gap-2">
                            <Button
                                title={activeDateField === 'start' ? 'Hoje' : 'Limpar data'}
                                variant="outline"
                                onPress={() => {
                                    if (activeDateField === 'start') {
                                        const today = new Date();
                                        setStartDate(today);
                                        if (targetDate && today > targetDate) {
                                            setTargetDate(null);
                                        }
                                    } else {
                                        setTargetDate(null);
                                    }
                                    setShowDatePicker(false);
                                }}
                                className="h-11 flex-1"
                            />
                            <Button title="Fechar" onPress={() => setShowDatePicker(false)} className="h-11 flex-1" />
                        </View>
                    </View>
                </Pressable>
            ) : null}

            {feedback ? (
                <View pointerEvents="box-none" className="absolute left-4 right-4 bottom-6 z-[70]">
                    <View
                        className={`rounded-xl border px-4 py-3 ${
                            feedback.kind === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                    >
                        <Text
                            className={`font-bold text-sm ${
                                feedback.kind === 'success'
                                    ? 'text-emerald-800 dark:text-emerald-300'
                                    : 'text-red-800 dark:text-red-300'
                            }`}
                        >
                            {feedback.title}
                        </Text>
                        <Text
                            className={`text-xs mt-1 ${
                                feedback.kind === 'success'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-red-700 dark:text-red-300'
                            }`}
                        >
                            {feedback.message}
                        </Text>
                    </View>
                </View>
            ) : null}

            {xpPopup ? (
                <View className="absolute inset-0 z-[60]">
                    <Pressable className="absolute inset-0 bg-black/35" onPress={() => setXpPopup(null)} />
                    <View className="absolute left-5 right-5 top-[22%] bg-white dark:bg-[#121212] rounded-3xl border border-orange-100 dark:border-slate-700 p-5">
                        <View className="items-center">
                            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border border-primary/20 mb-3">
                                {(() => {
                                    const Icon = levelIconMap[xpPopup.summary.level_icon] || Trophy;
                                    return <Icon size={40} color="#f48c25" />;
                                })()}
                            </View>
                            <Text className="text-slate-900 dark:text-slate-100 text-2xl font-extrabold text-center">
                                {xpPopup.leveled_up ? 'Subiu de nível!' : 'Meta criada!'}
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-300 text-sm text-center mt-1">
                                {xpPopup.leveled_up
                                    ? `Agora você está no nível ${xpPopup.summary.level} (${xpPopup.summary.level_title}).`
                                    : 'Sua nova meta já começou a valer no seu progresso gamificado.'}
                            </Text>

                            <View className="w-full mt-4 bg-[#fff7ed] dark:bg-[#1a1a1a] rounded-2xl border border-orange-100 dark:border-slate-700 p-4">
                                <Text className="text-primary text-xs font-bold uppercase text-center">Recompensa</Text>
                                <Text className="text-slate-900 dark:text-slate-100 text-3xl font-black text-center mt-1">
                                    {xpPopup.points > 0 ? `+${xpPopup.points}` : xpPopup.points} XP
                                </Text>
                                <Text className="text-slate-600 dark:text-slate-300 text-sm text-center mt-1">
                                    Nível {xpPopup.summary.level} - {xpPopup.summary.level_title}
                                </Text>
                                <View className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                    <View className="h-full bg-primary rounded-full" style={{ width: `${xpPopup.summary.level_progress_pct}%` }} />
                                </View>
                            </View>

                            <Button title="Continuar" onPress={() => setXpPopup(null)} className="h-12 mt-4 w-full" />
                        </View>
                    </View>
                </View>
            ) : null}

            {goalPendingDelete ? (
                <View className="absolute inset-0 z-[65]">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={() => !deleteLoading && setGoalPendingDelete(null)} />
                    <View className="absolute left-4 right-4 top-[35%] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm dark:shadow-none">
                        <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">Excluir meta</Text>
                        <Text className="text-slate-600 dark:text-slate-300 text-sm mt-2 mb-4">
                            Deseja remover a meta "{goalPendingDelete.title}"? Essa ação atualiza o progresso e o histórico de XP vinculado.
                        </Text>

                        <Button
                            title="Excluir meta"
                            variant="danger"
                            loading={deleteLoading}
                            disabled={deleteLoading}
                            onPress={confirmDeleteGoal}
                            className="h-12 mb-2"
                        />
                        <Button
                            title="Cancelar"
                            variant="outline"
                            disabled={deleteLoading}
                            onPress={() => setGoalPendingDelete(null)}
                            className="h-11"
                        />
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Metas;

