import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useIsFocused } from '@react-navigation/native';
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import ForgotPassword from '../screens/auth/ForgotPassword';
import ResetPassword from '../screens/auth/ResetPassword';

const Stack = createStackNavigator();

const withUnmountOnBlur = <P extends object>(ScreenComponent: React.ComponentType<P>) => {
    const WrappedScreen = (props: P) => {
        const isFocused = useIsFocused();
        if (!isFocused) {
            return null;
        }
        return <ScreenComponent {...props} />;
    };

    WrappedScreen.displayName = `UnmountOnBlur(${ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`;
    return WrappedScreen;
};

const LoginScreen = withUnmountOnBlur(Login);
const RegisterScreen = withUnmountOnBlur(Register);
const ForgotPasswordScreen = withUnmountOnBlur(ForgotPassword);
const ResetPasswordScreen = withUnmountOnBlur(ResetPassword);

export const AuthNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#f8f7f5' }
            }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
    );
};

