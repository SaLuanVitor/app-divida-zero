import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuth } from '../context/AuthContext';
import Splash from '../screens/Splash';
import Onboarding from '../screens/app/Onboarding';
import ForcePasswordChange from '../screens/auth/ForcePasswordChange';
import { getAppPreferences } from '../services/preferences';
import { useAccessibility } from '../context/AccessibilityContext';

const Stack = createStackNavigator();

export const RootNavigator = () => {
    const { signed, loading, user } = useAuth();
    const { reduceMotion } = useAccessibility();
    const [showSplash, setShowSplash] = useState(true);
    const [onboardingChecked, setOnboardingChecked] = useState(false);
    const [onboardingSeen, setOnboardingSeen] = useState(false);

    useEffect(() => {
        // Simular tempo de Splash
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, reduceMotion ? 350 : 2000);

        return () => clearTimeout(timer);
    }, [reduceMotion]);

    useEffect(() => {
        let mounted = true;

        const loadOnboarding = async () => {
            if (!signed) {
                if (!mounted) return;
                setOnboardingSeen(false);
                setOnboardingChecked(true);
                return;
            }

            const prefs = await getAppPreferences();
            if (!mounted) return;
            setOnboardingSeen(!!prefs.onboarding_seen);
            setOnboardingChecked(true);
        };

        setOnboardingChecked(false);
        loadOnboarding();

        return () => {
            mounted = false;
        };
    }, [signed]);

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {loading || showSplash || !onboardingChecked ? (
                <Stack.Screen name="Splash" component={Splash} />
            ) : signed && !onboardingSeen ? (
                <Stack.Screen name="Onboarding">
                    {() => <Onboarding onDone={() => setOnboardingSeen(true)} />}
                </Stack.Screen>
            ) : signed && user?.force_password_change ? (
                <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChange} />
            ) : signed ? (
                <Stack.Screen name="App" component={AppNavigator} />
            ) : (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
};

