import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { ArrowLeft, Landmark, Repeat, Wallet, CalendarDays, ChevronLeft, ChevronRight, Trophy, Target, Shield, Crown } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { useThemeMode } from '../../context/ThemeContext';
import { createFinancialRecord } from '../../services/financialRecords';
import { CreateFinancialRecordPayload, FinancialRecurrenceType } from '../../types/financialRecord';
import { normalizeGamificationSummary, XpFeedbackDto } from '../../types/gamification';

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
    `text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`;

const levelIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    sprout: Trophy,
    target: Target,
    shield: Shield,
    crown: Crown,
};

const Lancamentos = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { darkMode } = useThemeMode();

    const [activeTab, setActiveTab] = useState<RegisterTab>('income');

    const [title, setTitle] = useState('');
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

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    const [loading, setLoading] = useState(false);
    const [xpPopup, setXpPopup] = useState<XpFeedbackDto | null>(null);
    const iconColor = darkMode ? '#e2e8f0' : '#334155';

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
        setCategory('');
        setCustomCategory('');
    }, [activeTab]);

    const formTitle = useMemo(() => (activeTab === 'debt' ? 'Nova dívida' : 'Novo ganho'), [activeTab]);

    const selectedCategory = category === 'Outro' ? customCategory.trim() : category;

    const categoryOptions = useMemo(() => {
        if (activeTab === 'debt') return debtCategories;
        return launchIncomeCategories;
    }, [activeTab]);

    const amountValue = useMemo(() => Number(amountDigits || '0') / 100, [amountDigits]);
    const recurrenceMax = recurrenceType === 'daily' ? 365 : 36;

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
        setPickerMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
        setShowDatePicker(true);
    };

    const closeDatePicker = () => setShowDatePicker(false);

    const selectDate = (date: Date) => {
        setStartDate(date);
        closeDatePicker();
    };

    const handleAmountChange = (value: string) => {
        const digits = onlyDigits(value).slice(0, 9);
        setAmountDigits(digits);
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
        setTitle('');
        setAmountDigits('');
        setStartDate(new Date());
        setDescription('');
        setCategory('');
        setCustomCategory('');
        setPriority('normal');
        setNotes('');
        setRecurring(false);
        setRecurrenceType('monthly');
        setRecurrenceCount('6');
        setInstallmentsTotal('1');
        setDayOfMonth('');
    };

    const onSubmit = async () => {
        if (!canSubmit) {
            Alert.alert('Dados inválidos', 'Revise os campos obrigatórios: valor, categoria e configurações de periodicidade/parcelas.');
            return;
        }

        const payload: CreateFinancialRecordPayload = {
            mode: activeTab === 'debt' ? 'debt' : 'launch',
            title: title.trim() || (activeTab === 'debt' ? 'Nova dívida' : 'Novo ganho'),
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
            resetForm();
            if (result.xp_feedback) {
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
            <Layout className="bg-[#f8f7f5] dark:bg-black" contentContainerClassName="p-0 bg-[#f8f7f5] dark:bg-black">
                <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28" showsVerticalScrollIndicator={false}>
                    <View className="flex-row items-center mt-4 mb-4">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-1">
                            <ArrowLeft size={22} color={iconColor} />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold">{formTitle}</Text>
                            <Text className="text-slate-500 dark:text-slate-300 text-xs">Preencha os dados para registrar no sistema.</Text>
                        </View>
                    </View>

                    <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <Text className="text-slate-800 dark:text-slate-100 font-bold mb-3">Tipo de cadastro</Text>
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

                <Text className={`${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'} font-bold text-sm`}>
                    {option.label}
                </Text>
            </View>
        </TouchableOpacity>
    );
})}
                        </View>
                    </View>

                    <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <Text className="text-slate-800 dark:text-slate-100 font-bold mb-3">Dados principais</Text>

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Título</Text>
                        <TextInput
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                            placeholder={activeTab === 'debt' ? 'Ex: Cartão Nubank' : 'Ex: Salário'}
                            placeholderTextColor="#94a3b8"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Valor (R$)</Text>
                        <TextInput
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                            placeholder="R$ 0,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            value={formatCurrencyFromDigits(amountDigits)}
                            onChangeText={handleAmountChange}
                        />

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Data inicial</Text>
                        <TouchableOpacity
                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 flex-row items-center justify-between bg-white dark:bg-[#121212]"
                            onPress={openDatePicker}
                        >
                            <Text className="text-slate-900 dark:text-slate-100">{formatDateBR(startDate)}</Text>
                            <CalendarDays size={18} color="#64748b" />
                        </TouchableOpacity>

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-2">Categoria ({activeTab === 'debt' ? 'dívida' : 'ganho'})</Text>
                        <View className="flex-row flex-wrap gap-2 mb-3">
                            {categoryOptions.map((option) => {
                                const active = category === option;
                                return (
                                    <TouchableOpacity key={option} className={chipClass(active)} onPress={() => setCategory(option)}>
                                        <Text className={chipTextClass(active)}>{option}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {category === 'Outro' ? (
                            <>
                                <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Informe a categoria</Text>
                                <TextInput
                                    className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                                    placeholder="Ex: Assinaturas"
                                    placeholderTextColor="#94a3b8"
                                    value={customCategory}
                                    onChangeText={setCustomCategory}
                                />
                            </>
                        ) : null}

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-2">Prioridade</Text>
                        <View className="flex-row gap-2 mb-3">
                            {priorityOptions.map((option) => {
                                const active = priority === option.value;
                                return (
                                    <TouchableOpacity key={option.value} className={chipClass(active)} onPress={() => setPriority(option.value)}>
                                        <Text className={chipTextClass(active)}>{option.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Descrição (opcional)</Text>
                        <TextInput
                            className="min-h-[70px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 mb-3 text-slate-900 dark:text-slate-100"
                            placeholder="Detalhes úteis para esse registro"
                            placeholderTextColor="#94a3b8"
                            multiline
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Observações extras (opcional)</Text>
                        <TextInput
                            className="min-h-[70px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
                            placeholder="Ex: débito automático, lembrete, conta compartilhada..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>

                    <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center gap-2">
                                <Repeat size={16} color="#334155" />
                                <Text className="text-slate-800 dark:text-slate-100 font-bold">Recorrência</Text>
                            </View>
                            <TouchableOpacity onPress={() => setRecurring((prev) => !prev)} className={chipClass(recurring)}>
                                <Text className={chipTextClass(recurring)}>{recurring ? 'Recorrente' : 'Único'}</Text>
                            </TouchableOpacity>
                        </View>

                        {recurring ? (
                            <>
                                <Text className="text-slate-600 dark:text-slate-300 text-xs mb-2">Frequência</Text>
                                <View className="flex-row gap-2 mb-3 flex-wrap">
                                    {recurrenceOptions.map((option) => {
                                        const active = recurrenceType === option.value;
                                        return (
                                            <TouchableOpacity key={option.value} className={chipClass(active)} onPress={() => setRecurrenceType(option.value)}>
                                                <Text className={chipTextClass(active)}>{option.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">
                                    {recurrenceType === 'daily'
                                        ? 'Quantidade de dias (máx. 365)'
                                        : 'Quantidade de ocorrências (máx. 36)'}
                                </Text>
                                <TextInput
                                    className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-slate-900 dark:text-slate-100"
                                    keyboardType="number-pad"
                                    placeholder={recurrenceType === 'daily' ? '30' : '6'}
                                    placeholderTextColor="#94a3b8"
                                    value={recurrenceCount}
                                    onChangeText={handleRecurrenceCountChange}
                                />
                            </>
                        ) : (
                            <Text className="text-slate-500 dark:text-slate-300 text-xs">Registro único: será criado apenas um lançamento.</Text>
                        )}
                    </View>

                    {activeTab === 'debt' && !recurring ? (
                        <View className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                            <Text className="text-slate-800 dark:text-slate-100 font-bold mb-3">Parcelamento</Text>

                            <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Número de parcelas</Text>
                            <TextInput
                                className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 mb-3 text-slate-900 dark:text-slate-100"
                                keyboardType="number-pad"
                                placeholder="1"
                                placeholderTextColor="#94a3b8"
                                value={installmentsTotal}
                                onChangeText={handleInstallmentsChange}
                            />

                            <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1">Dia preferencial de pagamento (1 a 28)</Text>
                            <TextInput
                                className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-slate-900 dark:text-slate-100"
                                keyboardType="number-pad"
                                placeholder="Opcional"
                                placeholderTextColor="#94a3b8"
                                value={dayOfMonth}
                                onChangeText={handleDayOfMonthChange}
                            />
                        </View>
                    ) : null}

                    <Button
                        title={loading ? 'Salvando...' : 'Salvar registro'}
                        onPress={onSubmit}
                        disabled={loading}
                        className="h-14 mb-4"
                    />

                    {loading ? (
                        <View className="items-center pb-4">
                            <ActivityIndicator color="#f48c25" />
                        </View>
                    ) : null}
                </ScrollView>
            </Layout>

            {showDatePicker ? (
                <Pressable className="absolute inset-0 bg-black/20 z-40" onPress={closeDatePicker}>
                    <View className="absolute bottom-24 left-4 right-4 bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                        <View className="flex-row items-center justify-between mb-3">
                            <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}>
                                <ChevronLeft size={16} color={iconColor} />
                            </TouchableOpacity>
                            <Text className="text-slate-900 dark:text-slate-100 font-bold">{toMonthLabel(pickerMonth)}</Text>
                            <TouchableOpacity className="p-2 rounded-full bg-slate-100 dark:bg-slate-800" onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}>
                                <ChevronRight size={16} color={iconColor} />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-between mb-2 px-1">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                                <Text key={`${day}-${idx}`} className="w-8 text-center text-xs font-bold text-[#8a7560] dark:text-slate-300">{day}</Text>
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
                                                <Text className={`${isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-200'} text-sm`}>
                                                    {cell.day}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>

                        <Button title="Fechar" variant="outline" onPress={closeDatePicker} className="h-11" />
                    </View>
                </Pressable>
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
                            <Text className="text-slate-900 dark:text-slate-100 text-2xl font-extrabold text-center">
                                {xpPopup.leveled_up ? 'Subiu de nível!' : 'Lançamento realizado!'}
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-300 text-sm text-center mt-1">
                                {xpPopup.leveled_up
                                    ? `Você chegou ao nível ${xpPopup.summary.level} (${xpPopup.summary.level_title}).`
                                    : 'Você ganhou pontos por manter o controle financeiro.'}
                            </Text>

                            <View className="w-full mt-4 bg-[#fff7ed] dark:bg-[#1a1a1a] rounded-2xl border border-orange-100 dark:border-slate-700 p-4">
                                <Text className="text-primary text-xs font-bold uppercase text-center">Recompensa</Text>
                                <Text className="text-slate-900 dark:text-slate-100 text-3xl font-black text-center mt-1">
                                    {xpPopup.points > 0 ? `+${xpPopup.points}` : xpPopup.points} XP
                                </Text>
                                <Text className="text-slate-600 dark:text-slate-300 text-sm text-center mt-1">
                                    Nível {xpPopup.summary.level} • {xpPopup.summary.level_title}
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
        </>
    );
};

export default Lancamentos;





