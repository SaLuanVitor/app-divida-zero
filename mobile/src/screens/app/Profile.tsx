import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import {
    User as UserIcon,
    Settings,
    Shield,
    Target,
    Bell,
    HelpCircle,
    LogOut,
    ChevronRight,
    Camera,
    Trophy,
    Crown,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { listFinancialRecords } from '../../services/financialRecords';
import { FinancialRecordDto } from '../../types/financialRecord';
import { buildGamificationSummary, formatAchievementProgress } from '../../utils/gamification';
import { getGamificationSummary } from '../../services/gamification';
import { GamificationSummaryDto } from '../../types/gamification';

const Profile = () => {
    const { user, signOut } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [records, setRecords] = useState<FinancialRecordDto[]>([]);
    const [loadingGamification, setLoadingGamification] = useState(false);
    const [summary, setSummary] = useState<GamificationSummaryDto>({
        total_xp: 0,
        level: 1,
        level_title: 'Iniciante',
        level_icon: 'sprout',
        xp_in_level: 0,
        xp_to_next_level: 500,
        level_progress_pct: 0,
    });
    const [historySectionY, setHistorySectionY] = useState(0);
    const [highlightHistoryCta, setHighlightHistoryCta] = useState(false);

    const scrollRef = useRef<ScrollView>(null);

    const menuItems = [
        { label: 'Dados pessoais', icon: UserIcon, color: '#3b82f6', route: 'Dados Pessoais' },
        { label: 'Configurações do app', icon: Settings, color: '#64748b', route: 'Configurações App' },
        { label: 'Notificações', icon: Bell, color: '#f59e0b', route: 'Notificações' },
        { label: 'Segurança', icon: Shield, color: '#10b981', route: 'Segurança' },
        { label: 'Ajuda e suporte', icon: HelpCircle, color: '#8b5cf6', route: 'Ajuda e Suporte' },
    ];

    const gamification = useMemo(() => buildGamificationSummary(records), [records]);
    const badgeIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
        sprout: Trophy,
        target: Target,
        shield: Shield,
        crown: Crown,
    };

    useEffect(() => {
        const loadGamification = async () => {
            setLoadingGamification(true);
            try {
                const [recordsResult, summaryResult] = await Promise.all([
                    listFinancialRecords(),
                    getGamificationSummary(),
                ]);
                setRecords(recordsResult.records);
                setSummary(summaryResult.summary);
            } finally {
                setLoadingGamification(false);
            }
        };

        loadGamification();
    }, []);

    useEffect(() => {
        const shouldFocusHistory = Boolean(route.params?.focusHistory);
        if (!shouldFocusHistory || !scrollRef.current) return;

        const timer = setTimeout(() => {
            scrollRef.current?.scrollTo({ y: Math.max(historySectionY - 20, 0), animated: true });
            setHighlightHistoryCta(true);
            navigation.setParams({ focusHistory: false });
        }, 120);

        return () => clearTimeout(timer);
    }, [route.params?.focusHistory, historySectionY, navigation]);

    useEffect(() => {
        if (!highlightHistoryCta) return;
        const timer = setTimeout(() => setHighlightHistoryCta(false), 1800);
        return () => clearTimeout(timer);
    }, [highlightHistoryCta]);

    return (
        <>
            <Layout contentContainerClassName="p-0 bg-[#f8f7f5]">
                <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
                    <View className="bg-white px-6 pt-8 pb-8 items-center border-b border-slate-100">
                        <View className="relative">
                            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20">
                                <UserIcon size={48} color="#f48c25" />
                            </View>
                            <TouchableOpacity
                                className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white"
                                activeOpacity={0.8}
                            >
                                <Camera size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-900 text-2xl font-bold mt-4">{user?.name}</Text>
                        <Text className="text-slate-500 text-sm">{user?.email}</Text>

                        <View className="mt-4 bg-[#f8f7f5] px-4 py-2 rounded-full">
                            <Text className="text-slate-700 text-xs font-bold">Editar perfil</Text>
                        </View>
                    </View>

                    <View className="px-6 -mt-6">
                        <Card className="p-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="bg-primary/10 p-2 rounded-lg">
                                        <Trophy size={18} color="#f48c25" />
                                    </View>
                                    <View className="ml-3">
                                        <Text className="text-slate-900 font-bold">Nível {summary.level} • {summary.level_title}</Text>
                                        <Text className="text-slate-500 text-xs">
                                            {summary.xp_in_level}/{summary.xp_in_level + summary.xp_to_next_level} XP para o nível {summary.level + 1}
                                        </Text>
                                    </View>
                                </View>
                                {loadingGamification ? <ActivityIndicator size="small" color="#f48c25" /> : <ChevronRight size={20} color="#94a3b8" />}
                            </View>
                            <View className="h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
                                <View className="h-full bg-primary rounded-full" style={{ width: `${summary.level_progress_pct}%` }} />
                            </View>
                        </Card>
                    </View>

                    <View className="px-6 pt-6">
                        <Text className="text-slate-900 font-bold text-lg mb-3">Conquistas</Text>
                        <Card className="mb-6" noPadding>
                            <View className="p-4 border-b border-slate-100">
                                <Text className="text-slate-700 text-sm font-semibold">
                                    {gamification.unlockedCount}/{gamification.achievements.length} desbloqueadas • Total XP {summary.total_xp}
                                </Text>
                            </View>
                            {gamification.achievements.map((achievement, index) => (
                                <View key={achievement.id} className={`p-4 ${index !== gamification.achievements.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className={`font-bold ${achievement.unlocked ? 'text-slate-900' : 'text-slate-500'}`}>{achievement.title}</Text>
                                        <Text className={`text-xs font-bold ${achievement.unlocked ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {achievement.unlocked ? `+${achievement.rewardXp} XP` : formatAchievementProgress(achievement.progress, achievement.target)}
                                        </Text>
                                    </View>
                                    <Text className="text-slate-500 text-xs mb-2">{achievement.description}</Text>
                                    <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <View
                                            className={`h-full rounded-full ${achievement.unlocked ? 'bg-emerald-500' : 'bg-primary'}`}
                                            style={{ width: `${Math.round((Math.min(achievement.progress, achievement.target) / achievement.target) * 100)}%` }}
                                        />
                                    </View>
                                </View>
                            ))}
                        </Card>
                    </View>

                    <View className="px-6">
                        <Text className="text-slate-900 font-bold text-lg mb-3">Badges</Text>
                        <Card className="mb-6 p-4">
                            <View className="flex-row flex-wrap justify-between">
                                {gamification.badges.map((badge) => {
                                    const Icon = badgeIconMap[badge.icon] || Trophy;
                                    return (
                                        <View key={badge.id} className="w-[48%] mb-3 rounded-xl border border-slate-100 p-3 bg-white">
                                            <View className={`w-9 h-9 rounded-full items-center justify-center mb-2 ${badge.unlocked ? 'bg-primary/15' : 'bg-slate-100'}`}>
                                                <Icon size={18} color={badge.unlocked ? '#f48c25' : '#94a3b8'} />
                                            </View>
                                            <Text className={`font-bold text-sm ${badge.unlocked ? 'text-slate-900' : 'text-slate-400'}`}>{badge.title}</Text>
                                            <Text className="text-slate-500 text-xs mt-1">{badge.description}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </Card>
                    </View>

                    <View className="px-6" onLayout={(event) => setHistorySectionY(event.nativeEvent.layout.y)}>
                        <Text className="text-slate-900 font-bold text-lg mb-3">Histórico de XP</Text>
                        <Card className="mb-6 p-4">
                            <Text className="text-slate-600 text-sm mb-3">
                                Acesse uma visão detalhada de todos os eventos de ganho e perda de XP.
                            </Text>
                            <Button
                                title="Ver histórico completo"
                                variant={highlightHistoryCta ? 'primary' : 'outline'}
                                onPress={() => navigation.navigate('Histórico XP')}
                                className="h-11"
                            />
                        </Card>
                    </View>

                    <View className="px-6">
                        <Text className="text-slate-900 font-bold text-lg mb-4">Conta</Text>
                        <Card className="mb-6 overflow-hidden" noPadding>
                            {menuItems.map((item, i) => (
                                <TouchableOpacity
                                    key={item.label}
                                    className={`flex-row items-center justify-between p-4 bg-white ${i !== menuItems.length - 1 ? 'border-b border-slate-50' : ''}`}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate(item.route)}
                                >
                                    <View className="flex-row items-center">
                                        <item.icon size={20} color={item.color} />
                                        <Text className="text-slate-700 font-medium ml-3">{item.label}</Text>
                                    </View>
                                    <ChevronRight size={18} color="#cbd5e1" />
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
                        <Text className="text-slate-400 text-xs text-center">Divida Zero App - v1.0.0</Text>
                    </View>
                </ScrollView>
            </Layout>

            {showLogoutConfirm ? (
                <View className="absolute inset-0 z-50">
                    <Pressable className="absolute inset-0 bg-black/30" onPress={() => !logoutLoading && setShowLogoutConfirm(false)} />
                    <View className="absolute left-4 right-4 top-[38%] bg-white rounded-2xl border border-slate-200 p-4">
                        <Text className="text-slate-900 text-base font-bold">Sair da conta</Text>
                        <Text className="text-slate-600 text-sm mt-2 mb-4">
                            Deseja realmente sair do aplicativo?
                        </Text>

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
                            className="h-11"
                        />
                    </View>
                </View>
            ) : null}
        </>
    );
};

export default Profile;
