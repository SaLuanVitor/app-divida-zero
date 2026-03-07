import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import {
    Bell,
    Bolt,
    CheckCircle2,
    CircleDollarSign,
    Landmark,
    ChevronLeft,
    ChevronRight,
    Wallet,
    X,
    Trash2,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../context/OverlayContext';
import { deleteFinancialRecord, listFinancialRecords, payFinancialRecord } from '../../services/financialRecords';
import { FinancialRecordDto } from '../../types/financialRecord';

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

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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

const Home = () => {
    const { user } = useAuth();
    const { openOverlay, closeOverlay, isOverlayOpen } = useOverlay();

    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedDateKey, setSelectedDateKey] = useState<string>('');
    const [records, setRecords] = useState<FinancialRecordDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'month' | 'year'>('month');
    const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());

    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showDayDetails = isOverlayOpen('dayDetails');
    const showConfirm = !!confirmState;
    const showPeriodSelector = showPeriodPicker;

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
        };
    }, []);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        try {
            const result = await listFinancialRecords(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
            setRecords(result.records);
        } catch (error: any) {
            const message = error?.response?.data?.error ?? 'Não foi possível carregar os registros do mês.';
            pushFeedback('error', 'Falha ao carregar', message);
        } finally {
            setLoading(false);
        }
    }, [currentMonth]);

    useFocusEffect(
        useCallback(() => {
            loadRecords();
        }, [loadRecords])
    );

    const entries = useMemo(() => records.map(toCalendarEntry), [records]);

    const entriesByDate = useMemo(() => {
        const map: Record<string, CalendarEntry[]> = {};

        for (const item of entries) {
            if (!map[item.date]) {
                map[item.date] = [];
            }
            map[item.date].push(item);
        }

        return map;
    }, [entries]);

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

    const todayItems = useMemo(() => {
        const todayKey = formatDateKey(new Date());
        return entriesByDate[todayKey] ?? [];
    }, [entriesByDate]);
    const todayKey = useMemo(() => formatDateKey(new Date()), []);

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

    const openPeriodPicker = () => {
        setPickerYear(currentMonth.getFullYear());
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
        return Array.from({ length: 16 }, (_, index) => pickerYear - 8 + index);
    }, [pickerYear]);

    const executePay = async (entry: CalendarEntry) => {
        const result = await payFinancialRecord(entry.id);
        setRecords((prev) => prev.map((item) => (item.id === entry.id ? result.record : item)));
        await loadRecords();
        pushFeedback('success', 'Status atualizado', result.message);
    };

    const executeDelete = async (entry: CalendarEntry, scope: 'single' | 'group') => {
        const result = await deleteFinancialRecord(entry.id, scope);

        if (scope === 'single') {
            setRecords((prev) => prev.filter((item) => item.id !== entry.id));
        } else if (entry.groupCode) {
            setRecords((prev) => prev.filter((item) => item.group_code !== entry.groupCode));
        }

        await loadRecords();
        pushFeedback('success', 'Registro excluído', `${result.message} (${result.deleted_count} registro(s)).`);
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

    const requestPay = (entry: CalendarEntry) => {
        const actionLabel = entry.icon === CircleDollarSign ? 'recebido' : 'pago';
        openConfirm({
            title: 'Confirmar alteração',
            message: `Deseja marcar "${entry.title}" como ${actionLabel}?`,
            confirmLabel: entry.icon === CircleDollarSign ? 'Marcar recebido' : 'Marcar pago',
            variant: 'primary',
            onConfirm: () => executePay(entry),
        });
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
            <Layout contentContainerClassName="p-0 bg-[#f8f7f5]" scrollable>
                <View className="bg-white px-4 pt-5 pb-4 border-b border-[#f0ebe7]">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-3">
                            <View className="relative">
                                <View className="w-12 h-12 rounded-full bg-primary/15 border-2 border-primary items-center justify-center">
                                    <Text className="text-primary font-extrabold">{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
                                </View>
                                <View className="absolute -bottom-1 -right-1 bg-primary px-1.5 py-0.5 rounded-full border border-white">
                                    <Text className="text-white text-[9px] font-bold">Lvl 5</Text>
                                </View>
                            </View>
                            <View>
                                <Text className="text-slate-900 text-xl font-bold">Olá, {user?.name || 'Usuário'}</Text>
                                <Text className="text-[#8a7560] text-xs font-medium">Vamos zerar as contas hoje?</Text>
                            </View>
                        </View>
                        <TouchableOpacity className="bg-[#f8f7f5] p-2 rounded-full">
                            <Bell size={20} color="#8a7560" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row gap-3">
                        <View className="flex-1 bg-[#f8f7f5] rounded-xl p-3 border border-stone-200 items-center">
                            <View className="flex-row items-center mb-1">
                                <Bolt size={14} color="#f48c25" />
                                <Text className="ml-1 text-[11px] text-[#8a7560] font-bold uppercase">Registros no mês</Text>
                            </View>
                            <Text className="text-2xl font-bold text-slate-900">{entries.length}</Text>
                        </View>
                        <View className="flex-1 bg-[#f8f7f5] rounded-xl p-3 border border-stone-200 items-center">
                            <View className="flex-row items-center mb-1">
                                <CheckCircle2 size={14} color="#14b8a6" />
                                <Text className="ml-1 text-[11px] text-[#8a7560] font-bold uppercase">Concluídos no mês</Text>
                            </View>
                            <Text className="text-2xl font-bold text-slate-900">{entries.filter((item) => item.status !== 'pending').length}</Text>
                        </View>
                    </View>
                </View>

                <View className="p-4 pb-28">
                    <Card className="mb-5" noPadding>
                        <View className="p-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <TouchableOpacity className="p-2 rounded-full bg-slate-100" onPress={() => changeMonth(-1)}>
                                    <ChevronLeft size={16} color="#1f2937" />
                                </TouchableOpacity>
                                <TouchableOpacity className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200" onPress={openPeriodPicker}>
                                    <Text className="text-slate-900 text-sm font-bold">{toMonthLabel(currentMonth)}</Text>
                                </TouchableOpacity>
                                <View className="flex-row items-center gap-2">
                                    <TouchableOpacity className="px-3 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center" onPress={focusToday}>
                                        <Text className="text-primary text-xs font-bold">Hoje</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity className="p-2 rounded-full bg-slate-100" onPress={() => changeMonth(1)}>
                                        <ChevronRight size={16} color="#1f2937" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {loading ? (
                                <View className="py-8 items-center">
                                    <ActivityIndicator color="#f48c25" />
                                    <Text className="text-slate-500 text-xs mt-2">Carregando registros...</Text>
                                </View>
                            ) : (
                                <>
                                    <View className="flex-row justify-between mb-2 px-1">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                                            <Text key={`${day}-${idx}`} className="w-8 text-center text-xs font-bold text-[#8a7560]">{day}</Text>
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
                                                            <Text className={`text-sm font-medium ${isSelected ? 'text-white font-bold' : isToday ? 'text-primary font-bold' : 'text-slate-700'}`}>
                                                                {cell.day}
                                                            </Text>
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
                                    <Text className="text-xs text-[#8a7560] font-medium">Pendente</Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <View className="h-2 w-2 rounded-full bg-teal-400" />
                                    <Text className="text-xs text-[#8a7560] font-medium">Concluído</Text>
                                </View>
                            </View>
                        </View>
                    </Card>

                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-slate-900 font-bold text-xl">Hoje</Text>
                        <Text className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">{todayItems.length} registros</Text>
                    </View>

                    {!loading && todayItems.length === 0 ? (
                        <Card className="mb-3" noPadding>
                            <View className="p-4">
                                <Text className="text-slate-600 text-sm">Sem lançamentos para hoje.</Text>
                            </View>
                        </Card>
                    ) : null}

                    {todayItems.map((item, index) => (
                        <Card key={String(item.id) + index} className="mb-3" noPadding>
                            <View className="p-4">
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-row items-center">
                                        <View className="h-10 w-10 rounded-lg items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                                            <item.icon size={18} color={item.color} />
                                        </View>
                                        <View className="ml-3">
                                            <Text className="text-slate-900 font-bold">{item.title}</Text>
                                            <Text className="text-slate-500 text-xs">{item.subtitle}</Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-slate-900 font-bold text-base">{item.value}</Text>
                                        <Text className={`text-[10px] font-bold uppercase ${statusColorClass(item.status)}`}>
                                            {statusLabel(item.status)}
                                        </Text>
                                    </View>
                                </View>

                                <View className="mt-3 pt-3 border-t border-slate-100 flex-row items-center justify-between">
                                    <Text className="text-xs text-slate-500">{item.reminder}</Text>
                                    <View className="flex-row items-center gap-2">
                                        <TouchableOpacity onPress={() => requestDeleteSingle(item)} className="px-3 py-2 rounded-lg bg-slate-100 flex-row items-center">
                                            <Trash2 size={14} color="#475569" />
                                            <Text className="text-slate-700 font-bold text-xs ml-1">Excluir</Text>
                                        </TouchableOpacity>
                                        {item.status === 'pending' ? (
                                            <TouchableOpacity onPress={() => requestPay(item)} className="bg-primary px-4 py-2 rounded-lg flex-row items-center">
                                                <CheckCircle2 size={16} color="#fff" />
                                                <Text className="text-white font-bold text-sm ml-2">
                                                    {item.icon === CircleDollarSign ? 'Receber' : 'Pagar'}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text className="text-teal-600 text-xs font-bold">Concluído</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </Card>
                    ))}
                </View>
            </Layout>

            {showDayDetails ? (
                <View className="absolute inset-0 z-40">
                    <Pressable className="absolute inset-0 bg-black/20" onPress={closeOverlay} />
                    <View className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl border border-slate-200 p-3 max-h-[70%]">
                        <View className="flex-row items-center justify-between mb-2 px-1">
                            <Text className="text-slate-900 font-bold text-base">Detalhes do dia</Text>
                            <TouchableOpacity onPress={closeOverlay} className="p-1">
                                <X size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-500 text-xs mb-3 px-1">{selectedDateKey.split('-').reverse().join('/')}</Text>

                        {selectedEntries.length === 0 ? (
                            <View className="rounded-xl bg-slate-50 p-3">
                                <Text className="text-slate-600 text-sm">Sem lançamentos para esta data.</Text>
                            </View>
                        ) : (
                            selectedEntries.map((item) => (
                                <View key={item.id} className="rounded-xl bg-slate-50 p-3 mb-2">
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-slate-900 font-bold">{item.title}</Text>
                                        <Text className={`text-[10px] font-bold uppercase ${statusColorClass(item.status)}`}>
                                            {statusLabel(item.status)}
                                        </Text>
                                    </View>
                                    <Text className="text-slate-500 text-xs mt-1">{item.subtitle}</Text>
                                    <View className="flex-row items-center justify-between mt-2">
                                        <Text className="text-slate-500 text-xs">{item.reminder}</Text>
                                        <Text className="text-slate-900 font-bold">{item.value}</Text>
                                    </View>

                                    <View className="flex-row items-center justify-end gap-2 mt-3">
                                        <TouchableOpacity onPress={() => requestDeleteSingle(item)} className="px-3 py-2 rounded-lg bg-slate-200">
                                            <Text className="text-slate-700 text-xs font-bold">Excluir</Text>
                                        </TouchableOpacity>
                                        {item.status === 'pending' ? (
                                            <TouchableOpacity onPress={() => requestPay(item)} className="px-3 py-2 rounded-lg bg-primary">
                                                <Text className="text-white text-xs font-bold">
                                                    {item.icon === CircleDollarSign ? 'Marcar como recebido' : 'Marcar como pago'}
                                                </Text>
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
                    <View className="absolute left-4 right-4 top-[35%] bg-white rounded-2xl border border-slate-200 p-4">
                        <Text className="text-slate-900 text-base font-bold">{confirmState?.title}</Text>
                        <Text className="text-slate-600 text-sm mt-2 mb-4">{confirmState?.message}</Text>

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

            {showPeriodSelector ? (
                <View className="absolute inset-0 z-[65]">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={closePeriodPicker} />
                    <View className="absolute left-4 right-4 top-[24%] bg-white rounded-2xl border border-slate-200 p-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-slate-900 text-base font-bold">Navegar por período</Text>
                            <TouchableOpacity className="p-1" onPress={closePeriodPicker}>
                                <X size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2 mb-3">
                            <TouchableOpacity
                                className={`flex-1 h-10 rounded-xl items-center justify-center border ${pickerMode === 'month' ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}
                                onPress={() => setPickerMode('month')}
                            >
                                <Text className={`font-bold text-sm ${pickerMode === 'month' ? 'text-white' : 'text-slate-700'}`}>Meses</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 h-10 rounded-xl items-center justify-center border ${pickerMode === 'year' ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}
                                onPress={() => setPickerMode('year')}
                            >
                                <Text className={`font-bold text-sm ${pickerMode === 'year' ? 'text-white' : 'text-slate-700'}`}>Anos</Text>
                            </TouchableOpacity>
                        </View>

                        {pickerMode === 'month' ? (
                            <>
                                <View className="flex-row items-center justify-between mb-3">
                                    <TouchableOpacity className="p-2 rounded-full bg-slate-100" onPress={() => setPickerYear((prev) => prev - 1)}>
                                        <ChevronLeft size={14} color="#334155" />
                                    </TouchableOpacity>
                                    <Text className="text-slate-900 font-bold">{pickerYear}</Text>
                                    <TouchableOpacity className="p-2 rounded-full bg-slate-100" onPress={() => setPickerYear((prev) => prev + 1)}>
                                        <ChevronRight size={14} color="#334155" />
                                    </TouchableOpacity>
                                </View>
                                <View className="flex-row flex-wrap justify-between">
                                    {monthNames.map((label, index) => {
                                        const active = currentMonth.getFullYear() === pickerYear && currentMonth.getMonth() === index;
                                        return (
                                            <TouchableOpacity
                                                key={label}
                                                className={`w-[31%] h-10 mb-2 rounded-xl items-center justify-center border ${active ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}
                                                onPress={() => selectMonth(index)}
                                            >
                                                <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700'}`}>{label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        ) : (
                            <View className="flex-row flex-wrap justify-between">
                                {yearOptions.map((year) => {
                                    const active = currentMonth.getFullYear() === year;
                                    return (
                                        <TouchableOpacity
                                            key={year}
                                            className={`w-[31%] h-10 mb-2 rounded-xl items-center justify-center border ${active ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}
                                            onPress={() => selectYear(year)}
                                        >
                                            <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700'}`}>{year}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            ) : null}

            {feedback ? (
                <View className="absolute top-16 left-4 right-4 z-[70]">
                    <View className={`rounded-xl border px-4 py-3 ${feedback.kind === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <Text className={`font-bold text-sm ${feedback.kind === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                            {feedback.title}
                        </Text>
                        <Text className={`text-xs mt-1 ${feedback.kind === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {feedback.message}
                        </Text>
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Home;
