import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Home from '../screens/app/Home';
import Metas from '../screens/app/Metas';
import MetaForm from '../screens/app/MetaForm';
import Relatorios from '../screens/app/Relatorios';
import Profile from '../screens/app/Profile';
import Lancamentos from '../screens/app/Lancamentos';
import XpHistory from '../screens/app/XpHistory';
import PersonalData from '../screens/app/PersonalData';
import AppSettings from '../screens/app/AppSettings';
import NotificationSettings from '../screens/app/NotificationSettings';
import SecuritySettings from '../screens/app/SecuritySettings';
import HelpSupport from '../screens/app/HelpSupport';
import Tutorial from '../screens/app/Tutorial';
import { House, Trophy, Plus, ChartColumnIncreasing, User, Wallet, CirclePlus, Landmark } from 'lucide-react-native';
import { useOverlay } from '../context/OverlayContext';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

const NavItem = ({
    label,
    active,
    onPress,
    icon,
    darkMode,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon: React.ReactNode;
    darkMode: boolean;
}) => (
    <TouchableOpacity onPress={onPress} style={styles.navItem}>
        {icon}
        <Text style={[styles.navText, darkMode && styles.navTextDark, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
);

const CustomTabBar = ({ state, navigation }: BottomTabBarProps) => {
    const insets = useSafeAreaInsets();
    const { openOverlay, closeOverlay, isOverlayOpen } = useOverlay();
    const { darkMode } = useThemeMode();

    const showActions = isOverlayOpen('actions');
    const inactiveIcon = darkMode ? '#94a3b8' : '#8a7560';
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
                    <View style={[styles.actionsContainer, darkMode && styles.actionsContainerDark]}>
                        <TouchableOpacity
                            style={[styles.actionButton, darkMode && styles.actionButtonDark]}
                            onPress={() => goTo('Lancamentos', { mode: 'income' })}
                        >
                            <Wallet size={18} color="#f48c25" />
                            <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>Novo ganho</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, darkMode && styles.actionButtonDark]}
                            onPress={() => goTo('Lancamentos', { mode: 'debt' })}
                        >
                            <Landmark size={18} color="#f48c25" />
                            <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>Nova dívida</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            ) : null}

            <View style={[styles.tabBar, darkMode && styles.tabBarDark, { paddingBottom: Math.max(10, insets.bottom) }]}>
                <View style={styles.tabBarContent}>
                    <NavItem
                        label="Início"
                        darkMode={darkMode}
                        active={activeRouteName === 'Inicio'}
                        onPress={() => goTo('Inicio')}
                        icon={<House size={20} color={activeRouteName === 'Inicio' ? '#f48c25' : inactiveIcon} />}
                    />

                    <NavItem
                        label="Metas"
                        darkMode={darkMode}
                        active={activeRouteName === 'Metas'}
                        onPress={() => goTo('Metas')}
                        icon={<Trophy size={20} color={activeRouteName === 'Metas' ? '#f48c25' : inactiveIcon} />}
                    />

                    <View style={styles.centerButtonContainer}>
                        <TouchableOpacity onPress={toggleActions} style={[styles.centerButton, darkMode && styles.centerButtonDark]}>
                            {showActions ? <CirclePlus size={22} color="#fff" /> : <Plus size={24} color="#fff" />}
                        </TouchableOpacity>
                        <Text style={[styles.centerButtonText, darkMode && styles.centerButtonTextDark]}>Lançamentos</Text>
                    </View>

                    <NavItem
                        label="Relatórios"
                        darkMode={darkMode}
                        active={activeRouteName === 'Relatorios'}
                        onPress={() => goTo('Relatorios')}
                        icon={<ChartColumnIncreasing size={20} color={activeRouteName === 'Relatorios' ? '#f48c25' : inactiveIcon} />}
                    />

                    <NavItem
                        label="Perfil"
                        darkMode={darkMode}
                        active={activeRouteName === 'Perfil'}
                        onPress={() => goTo('Perfil')}
                        icon={<User size={20} color={activeRouteName === 'Perfil' ? '#f48c25' : inactiveIcon} />}
                    />
                </View>
            </View>
        </>
    );
};

export const AppNavigator = () => {
    const { signed } = useAuth();

    if (!signed) {
        return null;
    }

    return (
        <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Inicio" component={Home} />
            <Tab.Screen name="Metas" component={Metas} />
            <Tab.Screen name="MetaForm" component={MetaForm} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Relatorios" component={Relatorios} />
            <Tab.Screen name="Perfil" component={Profile} />
            <Tab.Screen name="Lancamentos" component={Lancamentos} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Historico XP" component={XpHistory} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Dados Pessoais" component={PersonalData} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Configuracoes App" component={AppSettings} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Notificacoes" component={NotificationSettings} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Seguranca" component={SecuritySettings} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Ajuda e Suporte" component={HelpSupport} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Tutorial" component={Tutorial} options={{ tabBarButton: () => null }} />
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
    navTextDark: {
        color: '#94a3b8',
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
    actionsContainerDark: {
        backgroundColor: '#121212',
        borderColor: '#334155',
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
    actionButtonDark: {
        backgroundColor: '#1f2937',
    },
    actionText: {
        color: '#0f172a',
        fontWeight: '700',
    },
    actionTextDark: {
        color: '#e2e8f0',
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
    tabBarDark: {
        backgroundColor: '#000000',
        borderTopColor: '#1f2937',
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
    centerButtonDark: {
        borderColor: '#000000',
    },
    centerButtonText: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '700',
        color: '#8a7560',
    },
    centerButtonTextDark: {
        color: '#94a3b8',
    },
});
