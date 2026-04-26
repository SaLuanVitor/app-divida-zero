import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet, LayoutChangeEvent, Modal, useWindowDimensions, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Home from '../screens/app/Home';
import Metas from '../screens/app/Metas';
import MetaForm from '../screens/app/MetaForm';
import Relatorios from '../screens/app/Relatorios';
import Profile from '../screens/app/Profile';
import Lancamentos from '../screens/app/Lancamentos';
import XpHistory from '../screens/app/XpHistory';
import NotificationHistory from '../screens/app/NotificationHistory';
import PersonalData from '../screens/app/PersonalData';
import AppSettings from '../screens/app/AppSettings';
import NotificationSettings from '../screens/app/NotificationSettings';
import NotificationManualSender from '../screens/app/NotificationManualSender';
import SecuritySettings from '../screens/app/SecuritySettings';
import HelpSupport from '../screens/app/HelpSupport';
import AppRating from '../screens/app/AppRating';
import Tutorial from '../screens/app/Tutorial';
import AdminDashboard from '../screens/app/AdminDashboard';
import AdminUsers from '../screens/app/AdminUsers';
import { House, Trophy, Plus, ChartColumnIncreasing, User, Wallet, CirclePlus, Landmark } from 'lucide-react-native';
import { useOverlay } from '../context/OverlayContext';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AppText from '../components/AppText';
import { useAccessibility } from '../context/AccessibilityContext';
import { BottomInsetProvider } from '../context/BottomInsetContext';
import TutorialTarget from '../components/tutorial/TutorialTarget';

const Tab = createBottomTabNavigator();

const NavItem = ({
    label,
    active,
    onPress,
    icon,
    darkMode,
    largerTouchTargets,
    slotStyle,
    labelStyle,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon: React.ReactNode;
    darkMode: boolean;
    largerTouchTargets: boolean;
    slotStyle?: StyleProp<ViewStyle>;
    labelStyle?: StyleProp<TextStyle>;
}) => (
    <TouchableOpacity onPress={onPress} style={[styles.navItem, largerTouchTargets && styles.navItemLarge, slotStyle]}>
        {icon}
        <AppText
            numberOfLines={1}
            maxUserFontScale={1.15}
            style={[styles.navText, darkMode && styles.navTextDark, active && styles.navTextActive, labelStyle]}
        >
            {label}
        </AppText>
    </TouchableOpacity>
);

const CustomTabBar = ({
    state,
    navigation,
    onHeightChange,
}: BottomTabBarProps & { onHeightChange: (height: number) => void }) => {
    const insets = useSafeAreaInsets();
    const { openOverlay, closeOverlay, isOverlayOpen } = useOverlay();
    const { darkMode } = useThemeMode();
    const { largerTouchTargets } = useAccessibility();
    const { width: screenWidth } = useWindowDimensions();

    const showActions = isOverlayOpen('actions');
    const inactiveIcon = darkMode ? '#94a3b8' : '#8a7560';
    const activeRouteName = useMemo(() => state?.routes?.[state?.index]?.name, [state?.index, state?.routes]);
    const previousRouteRef = React.useRef(activeRouteName);

    useEffect(() => {
        if (previousRouteRef.current !== activeRouteName) {
            closeOverlay();
            previousRouteRef.current = activeRouteName;
        }
    }, [activeRouteName, closeOverlay]);

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

    const handleTabBarLayout = useCallback(
        (event: LayoutChangeEvent) => {
            onHeightChange(Math.round(event.nativeEvent.layout.height));
        },
        [onHeightChange]
    );

    const actionsBottom = Math.max(96, insets.bottom + 88);
    const compact = screenWidth < 380;
    const roomy = screenWidth >= 430;
    const slotMinWidth = Math.max(60, Math.floor((screenWidth - 16) / 5));
    const iconSize = compact ? 18 : 20;
    const centerButtonSize = compact ? 52 : roomy ? 58 : 56;
    const centerLift = compact ? -22 : roomy ? -30 : -26;
    const labelFontSize = compact ? 9 : 10;
    const centerLabelWidth = compact ? 78 : 90;
    const baseSlotHeight = Math.max(largerTouchTargets ? 62 : 56, compact ? 56 : 58);

    return (
        <>
            <Modal
                visible={showActions}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeOverlay}
            >
                <View style={styles.overlayModalRoot}>
                    <Pressable style={styles.overlayBackdrop} onPress={closeOverlay} />
                    <View style={[styles.actionsContainer, darkMode && styles.actionsContainerDark, { bottom: actionsBottom }]}>
                        <TouchableOpacity
                            style={[styles.actionButton, darkMode && styles.actionButtonDark, largerTouchTargets && styles.actionButtonLarge]}
                            onPress={() => goTo('Lancamentos', { mode: 'income' })}
                        >
                            <Wallet size={18} color="#f48c25" />
                            <AppText style={[styles.actionText, darkMode && styles.actionTextDark]}>Novo ganho</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, darkMode && styles.actionButtonDark, largerTouchTargets && styles.actionButtonLarge]}
                            onPress={() => goTo('Lancamentos', { mode: 'debt' })}
                        >
                            <Landmark size={18} color="#f48c25" />
                            <AppText style={[styles.actionText, darkMode && styles.actionTextDark]}>Nova dívida</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View
                onLayout={handleTabBarLayout}
                style={[styles.tabBar, darkMode && styles.tabBarDark, { paddingBottom: Math.max(10, insets.bottom) }]}
            >
                <View style={[styles.tabBarContent, { minHeight: baseSlotHeight, paddingHorizontal: compact ? 4 : 8 }]}>
                    <NavItem
                        label="Início"
                        darkMode={darkMode}
                        active={activeRouteName === 'Inicio'}
                        onPress={() => goTo('Inicio')}
                        icon={<House size={iconSize} color={activeRouteName === 'Inicio' ? '#f48c25' : inactiveIcon} />}
                        largerTouchTargets={largerTouchTargets}
                        slotStyle={{ minWidth: slotMinWidth, minHeight: baseSlotHeight }}
                        labelStyle={{ fontSize: labelFontSize }}
                    />

                    <TutorialTarget targetId="tab-metas">
                        <NavItem
                            label="Metas"
                            darkMode={darkMode}
                            active={activeRouteName === 'Metas'}
                            onPress={() => goTo('Metas')}
                            icon={<Trophy size={iconSize} color={activeRouteName === 'Metas' ? '#f48c25' : inactiveIcon} />}
                            largerTouchTargets={largerTouchTargets}
                            slotStyle={{ minWidth: slotMinWidth, minHeight: baseSlotHeight }}
                            labelStyle={{ fontSize: labelFontSize }}
                        />
                    </TutorialTarget>

                    <TutorialTarget
                        targetId="tab-lancamentos"
                        style={[styles.centerButtonContainer, { marginTop: centerLift, minWidth: slotMinWidth, minHeight: baseSlotHeight }]}
                    >
                        <TouchableOpacity
                            onPress={toggleActions}
                            style={[
                                styles.centerButton,
                                darkMode && styles.centerButtonDark,
                                largerTouchTargets && styles.centerButtonLarge,
                                { width: centerButtonSize, height: centerButtonSize, borderRadius: centerButtonSize / 2 },
                            ]}
                        >
                            {showActions ? <CirclePlus size={compact ? 20 : 22} color="#fff" /> : <Plus size={compact ? 22 : 24} color="#fff" />}
                        </TouchableOpacity>
                        <AppText
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.9}
                            maxUserFontScale={1.1}
                            style={[
                                styles.centerButtonText,
                                darkMode && styles.centerButtonTextDark,
                                { width: centerLabelWidth, fontSize: labelFontSize, lineHeight: compact ? 11 : 12 },
                            ]}
                        >
                            Lançamentos
                        </AppText>
                    </TutorialTarget>

                    <TutorialTarget targetId="tab-relatorios">
                        <NavItem
                            label="Relatórios"
                            darkMode={darkMode}
                            active={activeRouteName === 'Relatorios'}
                            onPress={() => goTo('Relatorios')}
                            icon={<ChartColumnIncreasing size={iconSize} color={activeRouteName === 'Relatorios' ? '#f48c25' : inactiveIcon} />}
                            largerTouchTargets={largerTouchTargets}
                            slotStyle={{ minWidth: slotMinWidth, minHeight: baseSlotHeight }}
                            labelStyle={{ fontSize: labelFontSize }}
                        />
                    </TutorialTarget>

                    <TutorialTarget targetId="tab-perfil">
                        <NavItem
                            label="Perfil"
                            darkMode={darkMode}
                            active={activeRouteName === 'Perfil'}
                            onPress={() => goTo('Perfil')}
                            icon={<User size={iconSize} color={activeRouteName === 'Perfil' ? '#f48c25' : inactiveIcon} />}
                            largerTouchTargets={largerTouchTargets}
                            slotStyle={{ minWidth: slotMinWidth, minHeight: baseSlotHeight }}
                            labelStyle={{ fontSize: labelFontSize }}
                        />
                    </TutorialTarget>
                </View>
            </View>
        </>
    );
};

export const AppNavigator = () => {
    const { signed } = useAuth();
    const [tabBarHeight, setTabBarHeight] = useState(84);

    const handleTabBarHeightChange = useCallback((nextHeight: number) => {
        if (!nextHeight) return;
        setTabBarHeight((current) => (Math.abs(current - nextHeight) > 1 ? nextHeight : current));
    }, []);

    if (!signed) {
        return null;
    }

    return (
        <BottomInsetProvider tabBarHeight={tabBarHeight}>
            <Tab.Navigator
                tabBar={(props) => <CustomTabBar {...props} onHeightChange={handleTabBarHeightChange} />}
                screenOptions={{
                    headerShown: false,
                    lazy: true,
                    freezeOnBlur: true,
                }}
            >
                <Tab.Screen name="Inicio" component={Home} />
                <Tab.Screen name="Metas" component={Metas} />
                <Tab.Screen name="MetaForm" component={MetaForm} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Relatorios" component={Relatorios} />
                <Tab.Screen name="Perfil" component={Profile} />
                <Tab.Screen name="Lancamentos" component={Lancamentos} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Historico XP" component={XpHistory} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Historico Notificacoes" component={NotificationHistory} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Dados Pessoais" component={PersonalData} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Configuracoes App" component={AppSettings} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Notificacoes" component={NotificationSettings} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Envio Notificacoes" component={NotificationManualSender} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Seguranca" component={SecuritySettings} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Ajuda e Suporte" component={HelpSupport} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Avaliacao App" component={AppRating} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Tutorial" component={Tutorial} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Admin Dashboard" component={AdminDashboard} options={{ tabBarButton: () => null }} />
                <Tab.Screen name="Admin Usuarios" component={AdminUsers} options={{ tabBarButton: () => null }} />
            </Tab.Navigator>
        </BottomInsetProvider>
    );
};

const styles = StyleSheet.create({
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 2,
    },
    navItemLarge: {
        minHeight: 52,
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
    overlayModalRoot: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 120,
        elevation: 120,
    },
    overlayBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    actionsContainer: {
        position: 'absolute',
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
    actionButtonLarge: {
        minHeight: 56,
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
        alignItems: 'stretch',
        paddingHorizontal: 8,
    },
    centerButtonContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: -28,
        minWidth: 88,
        justifyContent: 'flex-end',
        paddingBottom: 2,
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
    centerButtonLarge: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    centerButtonDark: {
        borderColor: '#000000',
    },
    centerButtonText: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '700',
        color: '#8a7560',
        textAlign: 'center',
        width: 88,
        lineHeight: 12,
    },
    centerButtonTextDark: {
        color: '#94a3b8',
    },
});



