import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Home from '../screens/app/Home';
import Metas from '../screens/app/Metas';
import Relatorios from '../screens/app/Relatorios';
import Profile from '../screens/app/Profile';
import Lancamentos from '../screens/app/Lancamentos';
import XpHistory from '../screens/app/XpHistory';
import PersonalData from '../screens/app/PersonalData';
import AppSettings from '../screens/app/AppSettings';
import NotificationSettings from '../screens/app/NotificationSettings';
import SecuritySettings from '../screens/app/SecuritySettings';
import HelpSupport from '../screens/app/HelpSupport';
import { House, Trophy, Plus, ChartColumnIncreasing, User, Wallet, CirclePlus, Landmark } from 'lucide-react-native';
import { useOverlay } from '../context/OverlayContext';

const Tab = createBottomTabNavigator();

const NavItem = ({
    label,
    active,
    onPress,
    icon,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon: React.ReactNode;
}) => (
    <TouchableOpacity onPress={onPress} className="flex-1 items-center justify-center">
        {icon}
        <Text className={`text-[10px] mt-1 font-bold ${active ? 'text-primary' : 'text-[#8a7560]'}`}>{label}</Text>
    </TouchableOpacity>
);

const CustomTabBar = ({ state, navigation }: BottomTabBarProps) => {
    const insets = useSafeAreaInsets();
    const { openOverlay, closeOverlay, isOverlayOpen } = useOverlay();

    const showActions = isOverlayOpen('actions');

    const activeRouteName = useMemo(() => state.routes[state.index]?.name, [state.index, state.routes]);

    const goTo = (name: string, params?: Record<string, unknown>) => {
        closeOverlay();
        (navigation as any).navigate(name, params);
    };

    const toggleActions = () => {
        if (showActions) {
            closeOverlay();
            return;
        }

        openOverlay('actions');
    };

    return (
        <>
            {showActions ? (
                <Pressable className="absolute inset-0 bg-black/20 z-40" onPress={closeOverlay}>
                    <View className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl border border-slate-200 p-3">
                        <TouchableOpacity
                            className="flex-row items-center gap-3 p-3 rounded-xl bg-slate-50 mb-2"
                            onPress={() => goTo('Lançamentos', { mode: 'income' })}
                        >
                            <Wallet size={18} color="#f48c25" />
                            <Text className="text-slate-900 font-bold">Novo ganho</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center gap-3 p-3 rounded-xl bg-slate-50"
                            onPress={() => goTo('Lançamentos', { mode: 'debt' })}
                        >
                            <Landmark size={18} color="#f48c25" />
                            <Text className="text-slate-900 font-bold">Nova dívida</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            ) : null}

            <View
                style={{ paddingBottom: Math.max(10, insets.bottom) }}
                className="absolute left-0 right-0 bottom-0 bg-white border-t border-[#f1ede9] pt-2 z-50"
            >
                <View className="flex-row items-end px-2">
                    <NavItem
                        label="Início"
                        active={activeRouteName === 'Início'}
                        onPress={() => goTo('Início')}
                        icon={<House size={20} color={activeRouteName === 'Início' ? '#f48c25' : '#8a7560'} />}
                    />

                    <NavItem
                        label="Metas"
                        active={activeRouteName === 'Metas'}
                        onPress={() => goTo('Metas')}
                        icon={<Trophy size={20} color={activeRouteName === 'Metas' ? '#f48c25' : '#8a7560'} />}
                    />

                    <View className="flex-1 items-center -mt-7">
                        <TouchableOpacity
                            onPress={toggleActions}
                            className="w-14 h-14 rounded-full bg-primary items-center justify-center border-4 border-white"
                        >
                            {showActions ? <CirclePlus size={22} color="#fff" /> : <Plus size={24} color="#fff" />}
                        </TouchableOpacity>
                        <Text className="text-[10px] mt-1 font-bold text-[#8a7560]">Ações</Text>
                    </View>

                    <NavItem
                        label="Relatórios"
                        active={activeRouteName === 'Relatórios'}
                        onPress={() => goTo('Relatórios')}
                        icon={<ChartColumnIncreasing size={20} color={activeRouteName === 'Relatórios' ? '#f48c25' : '#8a7560'} />}
                    />

                    <NavItem
                        label="Perfil"
                        active={activeRouteName === 'Perfil'}
                        onPress={() => goTo('Perfil')}
                        icon={<User size={20} color={activeRouteName === 'Perfil' ? '#f48c25' : '#8a7560'} />}
                    />
                </View>
            </View>
        </>
    );
};

export const AppNavigator = () => {
    return (
        <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Início" component={Home} />
            <Tab.Screen name="Metas" component={Metas} />
            <Tab.Screen name="Relatórios" component={Relatorios} />
            <Tab.Screen name="Perfil" component={Profile} />
            <Tab.Screen
                name="Lançamentos"
                component={Lancamentos}
                options={{
                    tabBarButton: () => null,
                }}
            />
            <Tab.Screen
                name="Histórico XP"
                component={XpHistory}
                options={{
                    tabBarButton: () => null,
                }}
            />
            <Tab.Screen
                name="Dados Pessoais"
                component={PersonalData}
                options={{
                    tabBarButton: () => null,
                }}
            />
            <Tab.Screen
                name="Configurações App"
                component={AppSettings}
                options={{
                    tabBarButton: () => null,
                }}
            />
            <Tab.Screen
                name="Notificações"
                component={NotificationSettings}
                options={{
                    tabBarButton: () => null,
                }}
            />
            <Tab.Screen
                name="Segurança"
                component={SecuritySettings}
                options={{
                    tabBarButton: () => null,
                }}
            />
            <Tab.Screen
                name="Ajuda e Suporte"
                component={HelpSupport}
                options={{
                    tabBarButton: () => null,
                }}
            />
        </Tab.Navigator>
    );
};
