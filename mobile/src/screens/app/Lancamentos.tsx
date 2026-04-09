import React, { useEffect, useMemo, useState } from 'react';
import AppTextInput from '../../components/AppTextInput';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Alert, ActivityIndicator, Pressable, Keyboard, FlatList } from 'react-native';
import { ArrowLeft, Landmark, Repeat, Wallet, CalendarDays, ChevronLeft, ChevronRight, Trophy, Target, Shield, Crown, X } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { createFinancialRecord } from '../../services/financialRecords';
import { CreateFinancialRecordPayload, FinancialRecurrenceType } from '../../types/financialRecord';
import { normalizeGamificationSummary, XpFeedbackDto } from '../../types/gamification';
import { getAppPreferences } from '../../services/preferences';
import { sendXpAndBadgeNotification } from '../../services/notifications';
import { trackAnalyticsEventDeferred } from '../../services/analytics';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useBottomInset } from '../../context/BottomInsetContext';

type RegisterTab = 'income' | 'debt';

const tabOptions = [
    { value: 'income', label: 'Ganho', icon: Wallet },
    { value: 'debt', label: 'Dívida', icon: Landmark },
];

const recurrenceOptions: Array<{ value: FinancialRecurrenceType; label: string }> = [
    { value: 'daily', label: 'Diária' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' },
];

const priorityOptions: Array<{ value: 'low' | 'normal' | 'high'; label: string }> = [
    { value: 'low', label: 'Baixa' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
];

const launchIncomeCategories = ['Salário', 'Freelance', 'Comissão', 'Venda', 'Bônus', 'Outro'];
const debtCategories = ['Cartão de crédito', 'Empréstimo', 'Financiamento', 'Conta essencial', 'Parcelado loja', 'Outro'];

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatDateBR = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

const formatCurrencyFromDigits = (digits: string) => {
    const cents = Number(digits || '0');
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
};

const toMonthLabel = (date: Date) => {
    const raw = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
    }).format(date);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const chipClass = (active: boolean) =>
    `px-3 py-2 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'}`;

const chipTextClass = (active: boolean) =>
    `text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-200'}`;
const MAX_AMOUNT_CENTS = 999_999_999;

const getDefaultCategory = (tab: RegisterTab) => (tab === 'debt' ? debtCategories[0] : launchIncomeCategories[0]);

const buildSuggestedTitle = (tab: RegisterTab, category: string) => {
    if (!category || category === 'Outro') {
        return tab === 'debt' ? 'Nova dívida' : 'Novo ganho';
    }

    return tab === 'debt' ? `Dívida • ${category}` : `Ganho • ${category}`;
};

const levelIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    sprout: Trophy,
    target: Target,
    shield: Shield,
    crown: Crown,
};
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const YEAR_BLOCK_SIZE = 24;

const Lancamentos = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { darkMode } = useThemeMode();
    const { overlayBottomInset } = useBottomInset();
    const { fontScale, largerTouchTargets } = useAccessibility();

    const [activeTab, setActiveTab] = useState<RegisterTab>('income');

    const [title, setTitle] = useState('');
    const [titleTouched, setTitleTouched] = useState(false);
    const [amountDigits, setAmountDigits] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
    const [notes, setNotes] = useState('');

    const [recurring, setRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState<FinancialRecurrenceType>('monthly');
    const [recurrenceCount, setRecurrenceCount] = useState('6');

    const [installmentsTotal, setInstallmentsTotal] = useState('1');
    const [dayOfMonth, setDayOfMonth] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'month' | 'year'>('month');
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const [yearRange, setYearRange] = useState(() => ({
        start: new Date().getFullYear() - YEAR_BLOCK_SIZE,
        end: new Date().getFullYear() + YEAR_BLOCK_SIZE,
    }));

    const [loading, setLoading] = useState(false);
    const [xpPopup, setXpPopup] = useState<XpFeedbackDto | null>(null);
    const iconColor = darkMode ? '#e2e8f0' : '#334155';
    const fieldControlHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);
    const pickerTabHeight = Math.max(Math.round(40 * Math.max(fontScale, 1)), largerTouchTargets ? 44 : 40);

    useEffect(() => {
        const incomingMode = route.params?.mode as string | undefined;
        if (incomingMode === 'debt') {
            setActiveTab('debt');
            return;
        }

        if (incomingMode === 'launch' || incomingMode === 'income') {
            setActiveTab('income');
        }
    }, [route.params?.mode]);

    useEffect(() => {
        const today = new Date();
        const defaultCategory = getDefaultCategory(activeTab);

        setCategory(defaultCategory);
        setCustomCategory('');
        setPriority('normal');
        setRecurring(false);
        setRecurrenceType('monthly');
        setRecurrenceCount('6');
        setInstallmentsTotal('1');
        setDayOfMonth(String(clamp(today.getDate(), 1, 28)));
        setShowAdvanced(false);
        setTitleTouched(false);
    }, [activeTab]);

    const formTitle = useMemo(() => (activeTab === 'debt' ? 'Nova dívida' : 'Novo ganho'), [activeTab]);

    const selectedCategory = category === 'Outro' ? customCategory.trim() : category;

    const categoryOptions = useMemo(() => {
        if (activeTab === 'debt') return debtCategories;
        return launchIncomeCategories;
    }, [activeTab]);
    const suggestedTitle = useMemo(() => buildSuggestedTitle(activeTab, selectedCategory), [activeTab, selectedCategory]);

    const amountValue = useMemo(() => Number(amountDigits || '0') / 100, [amountDigits]);
    const quickAmountOptions = useMemo(() => [10, 100, 1000], []);
    const recurrenceMax = recurrenceType === 'daily' ? 365 : 36;

    useEffect(() => {
        if (!titleTouched) {
            setTitle(suggestedTitle);
        }
    }, [suggestedTitle, titleTouched]);

    const canSubmit = useMemo(() => {
        if (!selectedCategory) return false;
        if (amountValue <= 0) return false;

        if (activeTab === 'debt' && !recurring) {
            const inst = Number(installmentsTotal);
            if (!Number.isInteger(inst) || inst < 1) return false;
        }

        if (recurring) {
            const rc = Number(recurrenceCount);
            if (!Number.isInteger(rc) || rc < 1) return false;
        }

        return true;
    }, [selectedCategory, amountValue, activeTab, recurring, installmentsTotal, recurrenceCount]);

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

    const openDatePicker = () => {
        Keyboard.dismiss();
        setPickerMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
        setShowPeriodPicker(false);
        requestAnimationFrame(() => setShowDatePicker(true));
    };

    const closeDatePicker = () => {
        setShowDatePicker(false);
        setShowPeriodPicker(false);
    };

    const openPeriodPicker = () => {
        Keyboard.dismiss();
        const baseYear = pickerMonth.getFullYear();
        setPickerYear(baseYear);
        setYearRange({
            start: baseYear - YEAR_BLOCK_SIZE,
            end: baseYear + YEAR_BLOCK_SIZE,
        });
        setPickerMode('month');
        requestAnimationFrame(() => setShowPeriodPicker(true));
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

    const selectDate = (date: Date) => {
        setStartDate(date);
        closeDatePicker();
    };

    const yearOptions = useMemo(() => {
        const options: number[] = [];
        for (let year = yearRange.start; year <= yearRange.end; year += 1) {
            options.push(year);
        }
        return options;
    }, [yearRange.end, yearRange.start]);

    const loadMoreYearsUp = () => {
        setYearRange((current) => ({ ...current, start: current.start - YEAR_BLOCK_SIZE }));
    };

    const loadMoreYearsDown = () => {
        setYearRange((current) => ({ ...current, end: current.end + YEAR_BLOCK_SIZE }));
    };

    const handleAmountChange = (value: string) => {
        const digits = onlyDigits(value).slice(0, 9);
        setAmountDigits(digits);
    };

    const handleQuickAmount = (value: number) => {
        const currentCents = Number(amountDigits || '0');
        const addCents = Math.round(value * 100);
        const nextCents = Math.min(currentCents + addCents, MAX_AMOUNT_CENTS);
        setAmountDigits(String(nextCents));
    };

    const handleClearAmount = () => {
        setAmountDigits('');
    };

    const handleInstallmentsChange = (value: string) => {
        const num = Number(onlyDigits(value) || '1');
        setInstallmentsTotal(String(clamp(num, 1, 120)));
    };

    const handleDayOfMonthChange = (value: string) => {
        const digits = onlyDigits(value);
        if (!digits) {
            setDayOfMonth('');
            return;
        }

        const num = clamp(Number(digits), 1, 28);
        setDayOfMonth(String(num));
    };

    const handleRecurrenceCountChange = (value: string) => {
        const num = Number(onlyDigits(value) || '1');
        setRecurrenceCount(String(clamp(num, 1, recurrenceMax)));
    };

    const resetForm = () => {
        const today = new Date();
        const defaultCategory = getDefaultCategory(activeTab);

        setTitle(buildSuggestedTitle(activeTab, defaultCategory));
        setTitleTouched(false);
        setAmountDigits('');
        setStartDate(today);
        setDescription('');
        setCategory(defaultCategory);
        setCustomCategory('');
        setPriority('normal');
        setNotes('');
        setRecurring(false);
        setRecurrenceType('monthly');
        setRecurrenceCount('6');
        setInstallmentsTotal('1');
        setDayOfMonth(String(clamp(today.getDate(), 1, 28)));
        setShowAdvanced(false);
    };

    const onSubmit = async () => {
        if (!canSubmit) {
            Alert.alert('Dados inválidos', 'Revise os campos obrigatórios: valor, categoria e configurações de periodicidade/parcelas.');
            return;
        }

        const payload: CreateFinancialRecordPayload = {
            mode: activeTab === 'debt' ? 'debt' : 'launch',
            title: title.trim() || suggestedTitle,
            amount: amountValue,
            start_date: formatDateISO(startDate),
            flow_type: activeTab === 'debt' ? 'expense' : 'income',
            description: description.trim() || undefined,
            category: selectedCategory,
            priority,
            notes: notes.trim() || undefined,
            recurring,
            recurrence_type: recurring ? recurrenceType : 'none',
            recurrence_count: recurring ? Number(recurrenceCount) : 1,
            installments_total: activeTab === 'debt' && !recurring ? Number(installmentsTotal) : 1,
            day_of_month: activeTab === 'debt' && !recurring && dayOfMonth ? Number(dayOfMonth) : undefined,
        };

        setLoading(true);
        try {
            const result = await createFinancialRecord(payload);
            trackAnalyticsEventDeferred({
                event_name: 'record_created',
                screen: 'Lancamentos',
                metadata: {
                    mode: payload.mode,
                    recurring: Boolean(payload.recurring),
                },
            });
            resetForm();
            if (result.xp_feedback) {
                const prefs = await getAppPreferences();
                await sendXpAndBadgeNotification({
                    enabled:
                        prefs.notifications_enabled &&
                        prefs.device_push_enabled &&
                        prefs.notify_xp_and_badges &&
                        !result.xp_feedback.leveled_up,
                    title: result.xp_feedback.leveled_up ? 'Subiu de nível!' : 'XP atualizado',
                    body: result.xp_feedback.leveled_up
                        ? `Você chegou ao nível ${result.xp_feedback.summary.level}.`
                        : `Você ganhou ${result.xp_feedback.points} XP com o lançamento.`,
                });
                setXpPopup({
                    ...result.xp_feedback,
                    summary: normalizeGamificationSummary(result.xp_feedback.summary),
                });
            } else {
                Alert.alert('Registro criado', `${result.message}\nForam gerados ${result.created_count} registro(s).`);
            }
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível salvar o registro.';
            Alert.alert('Erro ao salvar', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Layout
                scrollable
                formMode
                className="bg-[#f8f7f5] dark:bg-black"
                contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black"
                scrollViewProps={{
                    keyboardShouldPersistTaps: 'always',
                }}
            >
                <View className="px-4">
                    <View className="flex-row items-center mt-4 mb-4">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-1">
                            <ArrowLeft size={22} color={iconColor} />
                        </TouchableOpacity>
                        <View>
                            <AppText className="text-slate-900 dark:text-slate-100 text-xl font-bold">{formTitle}</AppText>
                            <AppText className="text-slate-500 dark:text-slate-200 text-xs">Preencha os dados para registrar no sistema.</AppText>
                        </View>
                    </View>

                    <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <AppText className="text-slate-800 dark:text-slate-100 font-bold mb-3">Tipo de cadastro</AppText>
                        <View className="flex-row gap-2">
                            {tabOptions.map((option) => {
    const active = activeTab === option.value;
    const Icon = option.icon;

    return (
        <TouchableOpacity
            key={option.value}
            className={`flex-1 rounded-xl border px-3 py-2 ${
                active
                    ? 'bg-primary border-primary'
                    : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-slate-700'
            }`}
            onPress={() => setActiveTab(option.value as RegisterTab)}
        >
            <View className="flex-row items-center justify-center gap-2">
                <Icon
                    size={14}
                    color={active ? "#fff" : "#475569"}
                />

                <AppText className={`${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'} font-bold text-sm`}>
                    {option.label}
                </AppText>
            </View>
        </TouchableOpacity>
    );
})}
                        </View>
                    </View>

                    <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <AppText className="text-slate-800 dark:text-slate-100 font-bold mb-3">Dados principais</AppText>

                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Título</AppText>
                        <AppTextInput
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                            placeholder={activeTab === 'debt' ? 'Ex: Cartão Nubank' : 'Ex: Salário'}
                            placeholderTextColor="#94a3b8"
                            value={title}
                            onChangeText={(value) => {
                                setTitleTouched(true);
                                setTitle(value);
                            }}
                        />
                        {!titleTouched ? (
                            <AppText className="text-[11px] text-slate-500 dark:text-slate-200 mb-3">
                                Título automático ativo. Edite apenas se quiser personalizar.
                            </AppText>
                        ) : null}

                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Valor (R$)</AppText>
                        <AppTextInput
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                            placeholder="R$ 0,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            value={formatCurrencyFromDigits(amountDigits)}
                            onChangeText={handleAmountChange}
                        />
                        <View className="flex-row flex-wrap gap-2 mb-3">
                            {quickAmountOptions.map((option) => {
                                return (
                                    <TouchableOpacity key={option} className={chipClass(false)} onPress={() => handleQuickAmount(option)}>
                                        <AppText className={chipTextClass(false)}>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(option)}</AppText>
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity
                                className="px-3 py-2 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                                onPress={handleClearAmount}
                            >
                                <AppText className="text-xs font-bold text-red-600 dark:text-red-300">Limpar</AppText>
                            </TouchableOpacity>
                        </View>
                        <AppText className="text-[11px] text-slate-500 dark:text-slate-200 mb-3 -mt-1">
                            Atalhos cumulativos: +10, +100, +1000 e Limpar.
                        </AppText>

                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Data inicial</AppText>
                        <TouchableOpacity
                            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 flex-row items-center justify-between bg-white dark:bg-[#121212]"
                            style={{ minHeight: fieldControlHeight, height: fieldControlHeight }}
                            onPress={openDatePicker}
                        >
                            <AppText className="text-slate-900 dark:text-slate-100">{formatDateBR(startDate)}</AppText>
                            <CalendarDays size={18} color="#64748b" />
                        </TouchableOpacity>

                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-2">Categoria ({activeTab === 'debt' ? 'dívida' : 'ganho'})</AppText>
                        <View className="flex-row flex-wrap gap-2 mb-3">
                            {categoryOptions.map((option) => {
                                const active = category === option;
                                return (
                                    <TouchableOpacity key={option} className={chipClass(active)} onPress={() => setCategory(option)}>
                                        <AppText className={chipTextClass(active)}>{option}</AppText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {category === 'Outro' ? (
                            <>
                                <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Informe a categoria</AppText>
                                <AppTextInput
                                    className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                                    placeholder="Ex: Assinaturas"
                                    placeholderTextColor="#94a3b8"
                                    value={customCategory}
                                    onChangeText={setCustomCategory}
                                />
                            </>
                        ) : null}

                        <View className="flex-row flex-wrap items-center justify-between gap-2 mt-1">
                            <AppText className="text-[11px] text-slate-500 dark:text-slate-200 flex-1">Modo rápido: só valor, data e categoria.</AppText>
                            <TouchableOpacity onPress={() => setShowAdvanced((prev) => !prev)} className={chipClass(showAdvanced)}>
                                <AppText className={chipTextClass(showAdvanced)}>{showAdvanced ? 'Ocultar extras' : 'Mais opções'}</AppText>
                            </TouchableOpacity>
                        </View>

                        {showAdvanced ? (
                            <View className="mt-3">
                                <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-2">Prioridade</AppText>
                                <View className="flex-row gap-2 mb-3">
                                    {priorityOptions.map((option) => {
                                        const active = priority === option.value;
                                        return (
                                            <TouchableOpacity key={option.value} className={chipClass(active)} onPress={() => setPriority(option.value)}>
                                                <AppText className={chipTextClass(active)}>{option.label}</AppText>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Descrição (opcional)</AppText>
                                <AppTextInput
                                    className="min-h-[70px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 mb-3 text-slate-900 dark:text-slate-100"
                                    placeholder="Detalhes úteis para esse registro"
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    value={description}
                                    onChangeText={setDescription}
                                />

                                <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Observações extras (opcional)</AppText>
                                <AppTextInput
                                    className="min-h-[70px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
                                    placeholder="Ex: débito automático, lembrete, conta compartilhada..."
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    value={notes}
                                    onChangeText={setNotes}
                                />
                            </View>
                        ) : null}
                    </View>

                    {showAdvanced ? (
                        <>
                            <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center gap-2">
                                        <Repeat size={16} color="#334155" />
                                        <AppText className="text-slate-800 dark:text-slate-100 font-bold">Recorrência</AppText>
                                    </View>
                                    <TouchableOpacity onPress={() => setRecurring((prev) => !prev)} className={chipClass(recurring)}>
                                        <AppText className={chipTextClass(recurring)}>{recurring ? 'Recorrente' : 'Único'}</AppText>
                                    </TouchableOpacity>
                                </View>

                                {recurring ? (
                                    <>
                                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-2">Frequência</AppText>
                                        <View className="flex-row gap-2 mb-3 flex-wrap">
                                            {recurrenceOptions.map((option) => {
                                                const active = recurrenceType === option.value;
                                                return (
                                                    <TouchableOpacity key={option.value} className={chipClass(active)} onPress={() => setRecurrenceType(option.value)}>
                                                        <AppText className={chipTextClass(active)}>{option.label}</AppText>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">
                                            {recurrenceType === 'daily'
                                                ? 'Quantidade de dias (máx. 365)'
                                                : 'Quantidade de ocorrências (máx. 36)'}
                                        </AppText>
                                        <AppTextInput
                                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-slate-900 dark:text-slate-100"
                                            keyboardType="number-pad"
                                            placeholder={recurrenceType === 'daily' ? '30' : '6'}
                                            placeholderTextColor="#94a3b8"
                                            value={recurrenceCount}
                                            onChangeText={handleRecurrenceCountChange}
                                        />
                                    </>
                                ) : (
                                    <AppText className="text-slate-500 dark:text-slate-200 text-xs">Registro único: será criado apenas um lançamento.</AppText>
                                )}
                            </View>

                            {activeTab === 'debt' && !recurring ? (
                                <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                                    <AppText className="text-slate-800 dark:text-slate-100 font-bold mb-3">Parcelamento</AppText>

                                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Número de parcelas</AppText>
                                    <AppTextInput
                                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                                        keyboardType="number-pad"
                                        placeholder="1"
                                        placeholderTextColor="#94a3b8"
                                        value={installmentsTotal}
                                        onChangeText={handleInstallmentsChange}
                                    />

                                    <AppText className="text-slate-600 dark:text-slate-200 text-xs mb-1">Dia preferencial de pagamento (1 a 28)</AppText>
                                    <AppTextInput
                                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-slate-900 dark:text-slate-100"
                                        keyboardType="number-pad"
                                        placeholder="Opcional"
                                        placeholderTextColor="#94a3b8"
                                        value={dayOfMonth}
                                        onChangeText={handleDayOfMonthChange}
                                    />
                                </View>
                            ) : null}
                        </>
                    ) : (
                        <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                            <AppText className="text-slate-700 dark:text-slate-200 text-sm font-semibold">Resumo do modo rápido</AppText>
                            <AppText className="text-slate-500 dark:text-slate-200 text-xs mt-1">
                                Registro único, prioridade normal e campos extras ocultos para reduzir cliques.
                            </AppText>
                        </View>
                    )}

                    <Button
                        title={loading ? 'Salvando...' : showAdvanced ? 'Salvar registro' : 'Salvar rápido'}
                        onPress={onSubmit}
                        disabled={loading || !canSubmit}
                        className="h-14 mb-4"
                    />
                    {!canSubmit ? (
                        <AppText className="text-center text-xs text-slate-500 dark:text-slate-200 -mt-1 mb-4">
                            Informe o valor para habilitar o salvamento.
                        </AppText>
                    ) : null}

                    {loading ? (
                        <View className="items-center pb-4">
                            <ActivityIndicator color="#f48c25" />
                        </View>
                    ) : null}
                </View>
            </Layout>

            {showDatePicker ? (
                <View className="absolute inset-0 z-[120]">
                    <Pressable className="absolute inset-0 bg-black/20" onPress={closeDatePicker} />
                    <View
                        className="absolute left-4 right-4 bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-3"
                        style={{ bottom: overlayBottomInset }}
                    >
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
                                        setStartDate(today);
                                        setPickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));
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
                                const isSelected = cell.date && formatDateISO(cell.date) === formatDateISO(startDate);

                                return (
                                    <View key={`${cell.day ?? 'x'}-${idx}`} className="w-8 h-9 mb-1 items-center justify-center">
                                        {cell.day && cell.date ? (
                                            <TouchableOpacity
                                                className={`w-7 h-7 rounded-lg items-center justify-center ${isSelected ? 'bg-primary' : ''}`}
                                                onPress={() => selectDate(cell.date!)}
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
                            <Button title="Fechar" variant="outline" onPress={closeDatePicker} className="h-11 flex-1" />
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
                                    const active = pickerMonth.getFullYear() === year;
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

            {xpPopup ? (
                <View className="absolute inset-0 z-50">
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
                                {xpPopup.leveled_up ? 'Subiu de nível!' : 'Lançamento realizado!'}
                            </AppText>
                            <AppText className="text-slate-500 dark:text-slate-200 text-sm text-center mt-1">
                                {xpPopup.leveled_up
                                    ? `Você chegou ao nível ${xpPopup.summary.level} (${xpPopup.summary.level_title}).`
                                    : 'Você ganhou pontos por manter o controle financeiro.'}
                            </AppText>

                            <View className="w-full mt-4 bg-[#fff7ed] dark:bg-[#1a1a1a] rounded-2xl border border-orange-100 dark:border-slate-700 p-4">
                                <AppText className="text-primary text-xs font-bold uppercase text-center">Recompensa</AppText>
                                <AppText className="text-slate-900 dark:text-slate-100 text-3xl font-black text-center mt-1">
                                    {xpPopup.points > 0 ? `+${xpPopup.points}` : xpPopup.points} XP
                                </AppText>
                                <AppText className="text-slate-600 dark:text-slate-200 text-sm text-center mt-1">
                                    Nível {xpPopup.summary.level} • {xpPopup.summary.level_title}
                                </AppText>
                                <View className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                    <View className="h-full bg-primary rounded-full" style={{ width: `${xpPopup.summary.level_progress_pct}%` }} />
                                </View>
                            </View>

                            <Button title="Continuar" onPress={() => setXpPopup(null)} className="h-12 mt-4 w-full" />
                        </View>
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Lancamentos;




