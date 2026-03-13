import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
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
    <TouchableOpacity onPress={onPress} style={styles.navItem}>
        {icon}
        <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
);

const CustomTabBar = ({ state, navigation }: BottomTabBarProps) => {
    const insets = useSafeAreaInsets();
    const { openOverlay, closeOverlay, isOverlayOpen } = useOverlay();

    const showActions = isOverlayOpen('actions');

    const activeRouteName = useMemo(() => state?.routes?.[state?.index]?.name, [state?.index, state?.routes]);

    const goTo = (name: string, params?: Record<string, unknown>) => {
        closeOverlay();
        if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate(name as any, params);
        }
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
                <Pressable style={styles.overlay} onPress={closeOverlay}>
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => goTo('Lançamentos', { mode: 'income' })}
                        >
                            <Wallet size={18} color="#f48c25" />
                            <Text style={styles.actionText}>Novo ganho</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => goTo('Lançamentos', { mode: 'debt' })}
                        >
                            <Landmark size={18} color="#f48c25" />
                            <Text style={styles.actionText}>Nova dívida</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            ) : null}

            <View
                style={[styles.tabBar, { paddingBottom: Math.max(10, insets.bottom) }]}
            >
                <View style={styles.tabBarContent}>
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

                    <View style={styles.centerButtonContainer}>
                        <TouchableOpacity
                            onPress={toggleActions}
                            style={styles.centerButton}
                        >
                            {showActions ? <CirclePlus size={22} color="#fff" /> : <Plus size={24} color="#fff" />}
                        </TouchableOpacity>
                        <Text style={styles.centerButtonText}>Ações</Text>
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

const styles = StyleSheet.create({
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '700',
        color: '#8a7560',
    },
    navTextActive: {
        color: '#f48c25',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        zIndex: 40,
    },
    actionsContainer: {
        position: 'absolute',
        bottom: 96,
        left: 16,
        right: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        marginBottom: 8,
    },
    actionText: {
        color: '#0f172a',
        fontWeight: '700',
    },
    tabBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1ede9',
        paddingTop: 8,
        zIndex: 50,
    },
    tabBarContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 8,
    },
    centerButtonContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: -28,
    },
    centerButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f48c25',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    centerButtonText: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '700',
        color: '#8a7560',
    },
});
