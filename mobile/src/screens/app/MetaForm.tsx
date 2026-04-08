import React, { useMemo, useState } from 'react';
import AppTextInput from '../../components/AppTextInput';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Pressable } from 'react-native';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Landmark, PiggyBank, Target, Trophy, Shield, Crown, X } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { createFinancialGoal, updateFinancialGoal } from '../../services/financialGoals';
import { CreateFinancialGoalPayload, FinancialGoalDto, FinancialGoalType } from '../../types/financialGoal';
import { normalizeGamificationSummary, XpFeedbackDto } from '../../types/gamification';
import { getAppPreferences } from '../../services/preferences';
import { sendXpAndBadgeNotification } from '../../services/notifications';
import { trackAnalyticsEventDeferred } from '../../services/analytics';
import { useAccessibility } from '../../context/AccessibilityContext';

type GoalDateField = 'start' | 'target';
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

const levelIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    sprout: Trophy,
    target: Target,
    shield: Shield,
    crown: Crown,
};
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCurrency = (value: string | number) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};

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
    `text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-200'}`;

const MetaForm = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { darkMode } = useThemeMode();
    const { fontScale, largerTouchTargets } = useAccessibility();
    const goal = route.params?.goal as FinancialGoalDto | undefined;

    const [title, setTitle] = useState(goal?.title || '');
    const [description, setDescription] = useState(goal?.description || '');
    const [targetAmountDigits, setTargetAmountDigits] = useState(goal ? String(Math.round(Number(goal.target_amount || '0') * 100)) : '');
    const [startDate, setStartDate] = useState<Date>(goal?.start_date ? new Date(`${goal.start_date}T00:00:00`) : new Date());
    const [targetDate, setTargetDate] = useState<Date | null>(goal?.target_date ? new Date(`${goal.target_date}T00:00:00`) : null);
    const [goalType, setGoalType] = useState<FinancialGoalType>(goal?.goal_type || 'save');
    const [activeDateField, setActiveDateField] = useState<GoalDateField>('start');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(() => {
        const baseDate = goal?.start_date ? new Date(`${goal.start_date}T00:00:00`) : new Date();
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    });
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'month' | 'year'>('month');
    const [pickerYear, setPickerYear] = useState(() => {
        const baseDate = goal?.start_date ? new Date(`${goal.start_date}T00:00:00`) : new Date();
        return baseDate.getFullYear();
    });
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [xpPopup, setXpPopup] = useState<XpFeedbackDto | null>(null);
    const iconColor = darkMode ? '#e2e8f0' : '#334155';
    const fieldControlHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);
    const pickerTabHeight = Math.max(Math.round(40 * Math.max(fontScale, 1)), largerTouchTargets ? 44 : 40);

    const goBackToGoals = () => {
        if (navigation?.canGoBack?.()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Metas');
    };

    const canSubmit = title.trim().length >= 2 && Number(targetAmountDigits || '0') > 0;

    const monthGrid = useMemo(() => {
        const year = pickerMonth.getFullYear();
        const month = pickerMonth.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells: Array<{ day: number | null; date: Date | null }> = [];

        for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: null, date: null });
        for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, date: new Date(year, month, day) });
        while (cells.length % 7 !== 0) cells.push({ day: null, date: null });

        return cells;
    }, [pickerMonth]);

    const openDatePicker = (field: GoalDateField) => {
        const baseDate = field === 'start' ? startDate : (targetDate || new Date());
        setActiveDateField(field);
        setPickerMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
        setShowPeriodPicker(false);
        setShowDatePicker(true);
    };

    const closeDatePicker = () => {
        setShowDatePicker(false);
        setShowPeriodPicker(false);
    };

    const openPeriodPicker = () => {
        setPickerYear(pickerMonth.getFullYear());
        setPickerMode('month');
        setShowPeriodPicker(true);
    };

    const closePeriodPicker = () => setShowPeriodPicker(false);

    const selectMonth = (monthIndex: number) => {
        setPickerMonth(new Date(pickerYear, monthIndex, 1));
        closePeriodPicker();
    };

    const selectYear = (year: number) => {
        setPickerYear(year);
        setPickerMonth(new Date(year, pickerMonth.getMonth(), 1));
        setPickerMode('month');
    };

    const yearOptions = useMemo(() => {
        return Array.from({ length: 16 }, (_, index) => pickerYear - 8 + index);
    }, [pickerYear]);

    const handleSubmit = async () => {
        if (!canSubmit) {
            setFeedback({
                kind: 'error',
                title: 'Dados inválidos',
                message: 'Preencha o título e o valor da meta para continuar.',
            });
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
            if (goal) {
                const result = await updateFinancialGoal(goal.id, payload);
                navigation.navigate('Metas', {
                    feedback: { kind: 'success', title: 'Meta atualizada', message: result.message },
                });
                return;
            }

            const result = await createFinancialGoal(payload);
            trackAnalyticsEventDeferred({
                event_name: 'goal_created',
                screen: 'MetaForm',
                metadata: {
                    goal_type: payload.goal_type,
                },
            });
            if (result.xp_feedback) {
                const prefs = await getAppPreferences();
                await sendXpAndBadgeNotification({
                    enabled:
                        prefs.notifications_enabled &&
                        prefs.device_push_enabled &&
                        prefs.notify_xp_and_badges &&
                        !result.xp_feedback.leveled_up,
                    title: result.xp_feedback.leveled_up ? 'Subiu de nível!' : 'Meta com XP',
                    body: result.xp_feedback.leveled_up
                        ? `Você chegou ao nível ${result.xp_feedback.summary.level}.`
                        : `Você ganhou ${result.xp_feedback.points} XP ao criar a meta.`,
                });
                setXpPopup({
                    ...result.xp_feedback,
                    summary: normalizeGamificationSummary(result.xp_feedback.summary),
                });
            } else {
                navigation.navigate('Metas', {
                    feedback: { kind: 'success', title: 'Meta criada', message: result.message },
                });
            }
        } catch (error: any) {
            setFeedback({
                kind: 'error',
                title: goal ? 'Erro ao atualizar' : 'Erro ao criar',
                message: error?.response?.data?.error ?? `Não foi possível ${goal ? 'atualizar' : 'criar'} a meta.`,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Layout
                scrollable
                contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black pb-32"
                scrollViewProps={{
                    keyboardShouldPersistTaps: 'always',
                }}
            >
                <View className="bg-[#f8f7f5] dark:bg-black px-4 pt-4 pb-2">
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors" onPress={goBackToGoals}>
                            <ArrowLeft size={22} color={iconColor} />
                        </TouchableOpacity>
                        <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold tracking-tight">
                            {goal ? 'Editar meta' : 'Nova meta'}
                        </AppText>
                    </View>
                    <AppText className="mt-4 px-2 text-slate-600 dark:text-slate-200 text-sm font-medium">
                        Defina a meta e o período considerado para o cálculo do progresso.
                    </AppText>
                </View>

                <View className="px-4 py-4">
                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Título da meta</AppText>
                    <AppTextInput
                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 mb-3 text-slate-900 dark:text-slate-100"
                        placeholder="Ex: Reserva de emergência"
                        placeholderTextColor="#94a3b8"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Valor total da meta</AppText>
                    <AppTextInput
                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 mb-3 text-slate-900 dark:text-slate-100"
                        placeholder="R$ 0,00"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        value={formatAmountInput(targetAmountDigits)}
                        onChangeText={(value) => setTargetAmountDigits(onlyDigits(value).slice(0, 10))}
                    />

                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Data de início</AppText>
                    <TouchableOpacity
                        className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 flex-row items-center justify-between bg-white dark:bg-[#121212]"
                        style={{ minHeight: fieldControlHeight, height: fieldControlHeight }}
                        onPress={() => openDatePicker('start')}
                    >
                        <AppText className="text-slate-900 dark:text-slate-100">{formatDateBR(formatDateISO(startDate))}</AppText>
                        <CalendarDays size={18} color="#64748b" />
                    </TouchableOpacity>

                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Data alvo (opcional)</AppText>
                    <TouchableOpacity
                        className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 flex-row items-center justify-between bg-white dark:bg-[#121212]"
                        style={{ minHeight: fieldControlHeight, height: fieldControlHeight }}
                        onPress={() => openDatePicker('target')}
                    >
                        <AppText className="text-slate-900 dark:text-slate-100">{targetDate ? formatDateBR(formatDateISO(targetDate)) : 'Selecionar data alvo'}</AppText>
                        <CalendarDays size={18} color="#64748b" />
                    </TouchableOpacity>

                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-2">Tipo da meta</AppText>
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {goalTypeOptions.map((option) => {
                            const active = goalType === option.value;
                            return (
                                <TouchableOpacity key={option.value} className={chipClass(active)} onPress={() => setGoalType(option.value)}>
                                    <AppText className={chipTextClass(active)}>{option.label}</AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Descrição (opcional)</AppText>
                    <AppTextInput
                        className="min-h-[70px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] px-3 py-2 mb-4 text-slate-900 dark:text-slate-100"
                        placeholder="Descreva o objetivo da meta"
                        placeholderTextColor="#94a3b8"
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />

                    <Button
                        title={submitting ? 'Salvando...' : goal ? 'Salvar alterações' : 'Salvar meta'}
                        onPress={handleSubmit}
                        disabled={submitting || !canSubmit}
                        className="h-12 mb-2"
                    />
                    <Button title="Cancelar" variant="outline" disabled={submitting} onPress={goBackToGoals} className="h-11" />
                </View>
            </Layout>

            {showDatePicker ? (
                <View className="absolute inset-0 z-[55]">
                    <Pressable className="absolute inset-0 bg-black/20" onPress={closeDatePicker} />
                    <View className="absolute bottom-24 left-4 right-4 bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                        <View className="flex-row items-center justify-between mb-3">
                            <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}>
                                <ChevronLeft size={16} color={iconColor} />
                            </TouchableOpacity>
                            <TouchableOpacity className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" onPress={openPeriodPicker}>
                                <AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold">{toMonthLabel(pickerMonth)}</AppText>
                            </TouchableOpacity>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity
                                    className="px-3 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center"
                                    onPress={() => {
                                        const today = new Date();
                                        setPickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                                        if (activeDateField === 'start') {
                                            setStartDate(today);
                                            if (targetDate && today > targetDate) setTargetDate(null);
                                        } else {
                                            setTargetDate(today);
                                        }
                                    }}
                                >
                                    <AppText className="text-primary text-xs font-bold">Hoje</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}>
                                    <ChevronRight size={16} color={iconColor} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="flex-row justify-between mb-2 px-1">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                                <AppText key={`${day}-${idx}`} className="w-8 text-center text-xs font-bold text-[#8a7560] dark:text-slate-200">{day}</AppText>
                            ))}
                        </View>

                        <View className="flex-row flex-wrap justify-between mb-3">
                            {monthGrid.map((cell, idx) => {
                                const selectedDate = activeDateField === 'start' ? startDate : targetDate;
                                const isSelected = cell.date && selectedDate && formatDateISO(cell.date) === formatDateISO(selectedDate);

                                return (
                                    <View key={`${cell.day ?? 'x'}-${idx}`} className="w-8 h-9 mb-1 items-center justify-center">
                                        {cell.day && cell.date ? (
                                            <TouchableOpacity
                                                className={`w-7 h-7 rounded-lg items-center justify-center ${isSelected ? 'bg-primary' : ''}`}
                                                onPress={() => {
                                                    if (activeDateField === 'start') {
                                                        if (cell.date) setStartDate(cell.date);
                                                        if (targetDate && cell.date && cell.date > targetDate) {
                                                            setTargetDate(null);
                                                        }
                                                    } else {
                                                        if (cell.date) setTargetDate(cell.date);
                                                    }
                                                    closeDatePicker();
                                                }}
                                            >
                                                <AppText className={`${isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-200'} text-sm`}>
                                                    {cell.day}
                                                </AppText>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>

                        <View className="flex-row gap-2">
                            {activeDateField === 'target' ? (
                                <Button
                                    title="Limpar data"
                                    variant="outline"
                                    onPress={() => {
                                        setTargetDate(null);
                                        closeDatePicker();
                                    }}
                                    className="h-11 flex-1"
                                />
                            ) : null}
                            <Button title="Fechar" onPress={closeDatePicker} className="h-11 flex-1" />
                        </View>
                    </View>
                </View>
            ) : null}

            {showDatePicker && showPeriodPicker ? (
                <View className="absolute inset-0 z-[60]">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={closePeriodPicker} />
                    <View className="absolute left-4 right-4 top-[24%] bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">Selecionar período</AppText>
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
                                        <ChevronLeft size={14} color={iconColor} />
                                    </TouchableOpacity>
                                    <AppText className="text-slate-900 dark:text-slate-100 font-bold">{pickerYear}</AppText>
                                    <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerYear((prev) => prev + 1)}>
                                        <ChevronRight size={14} color={iconColor} />
                                    </TouchableOpacity>
                                </View>
                                <View className="flex-row flex-wrap justify-between">
                                    {monthNames.map((label, index) => {
                                        const active = pickerMonth.getFullYear() === pickerYear && pickerMonth.getMonth() === index;
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
                            <View className="flex-row flex-wrap justify-between">
                                {yearOptions.map((year) => {
                                    const active = pickerMonth.getFullYear() === year;
                                    return (
                                        <TouchableOpacity
                                            key={year}
                                            className={`w-[31%] mb-2 rounded-xl items-center justify-center border ${active ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`}
                                            style={{ minHeight: pickerTabHeight, height: pickerTabHeight }}
                                            onPress={() => selectYear(year)}
                                        >
                                            <AppText className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{year}</AppText>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
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
                            <AppText className="text-slate-900 dark:text-slate-100 text-2xl font-extrabold text-center">
                                {xpPopup.leveled_up ? 'Subiu de nível!' : 'Meta criada!'}
                            </AppText>
                            <AppText className="text-slate-500 dark:text-slate-200 text-sm text-center mt-1">
                                {xpPopup.leveled_up
                                    ? `Agora você está no nível ${xpPopup.summary.level} (${xpPopup.summary.level_title}).`
                                    : 'Sua nova meta já começou a valer no seu progresso gamificado.'}
                            </AppText>

                            <View className="w-full mt-4 bg-[#fff7ed] dark:bg-[#1a1a1a] rounded-2xl border border-orange-100 dark:border-slate-700 p-4">
                                <AppText className="text-primary text-xs font-bold uppercase text-center">Recompensa</AppText>
                                <AppText className="text-slate-900 dark:text-slate-100 text-3xl font-black text-center mt-1">
                                    {xpPopup.points > 0 ? `+${xpPopup.points}` : xpPopup.points} XP
                                </AppText>
                                <AppText className="text-slate-600 dark:text-slate-200 text-sm text-center mt-1">
                                    Nível {xpPopup.summary.level} - {xpPopup.summary.level_title}
                                </AppText>
                                <View className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                    <View className="h-full bg-primary rounded-full" style={{ width: `${xpPopup.summary.level_progress_pct}%` }} />
                                </View>
                            </View>

                            <Button
                                title="Continuar"
                                onPress={() => {
                                    setXpPopup(null);
                                    navigation.navigate('Metas', {
                                        feedback: { kind: 'success', title: 'Meta criada', message: 'Sua meta foi salva com sucesso.' },
                                    });
                                }}
                                className="h-12 mt-4 w-full"
                            />
                        </View>
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default MetaForm;


