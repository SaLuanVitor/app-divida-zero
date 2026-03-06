import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuth } from '../context/AuthContext';
import Splash from '../screens/Splash';

const Stack = createStackNavigator();

export const RootNavigator = () => {
    const { signed, loading } = useAuth();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // Simular tempo de Splash
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (loading || showSplash) {
        return <Splash />;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {signed ? (
                <Stack.Screen name="App" component={AppNavigator} />
            ) : (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
};
