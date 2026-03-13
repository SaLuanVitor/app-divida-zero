import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse } from '../types/auth';
import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/api';

const USER_KEY = '@DividaZero:user';
const START_ALWAYS_AT_LOGIN = true;

interface AuthContextData {
    signed: boolean;
    user: User | null;
    loading: boolean;
    authLoading: boolean;
    signIn(email: string, pass: string): Promise<void>;
    signUp(name: string, email: string, pass: string): Promise<void>;
    requestPasswordReset(email: string): Promise<string | null>;
    resetPassword(email: string, token: string, newPassword: string): Promise<void>;
    signOut(): Promise<void>;
    refreshToken(): Promise<void>;
    updateUser(user: User): Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);

    useEffect(() => {
        async function bootstrap() {
            if (START_ALWAYS_AT_LOGIN) {
                await AsyncStorage.multiRemove([USER_KEY, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
                setLoading(false);
                return;
            }

            const [rawUser, accessToken] = await AsyncStorage.multiGet([USER_KEY, ACCESS_TOKEN_KEY]);
            const savedUser = rawUser[1];
            const savedToken = accessToken[1];

            if (savedUser && savedToken) {
                setUser(JSON.parse(savedUser));
                api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
            }

            setLoading(false);
        }

        bootstrap();
    }, []);

    async function signIn(email: string, pass: string) {
        setAuthLoading(true);

        try {
            const { data } = await api.post<AuthResponse>('/auth/login', {
                email,
                password: pass,
            });

            setUser(data.user);
            api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;

            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
            await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        } finally {
            setAuthLoading(false);
        }
    }

    async function signUp(name: string, email: string, pass: string) {
        await api.post('/auth/register', {
            name,
            email,
            password: pass,
        });
    }

    async function requestPasswordReset(email: string) {
        const { data } = await api.post('/auth/forgot_password', { email });
        return data.dev_reset_token ?? null;
    }

    async function resetPassword(email: string, token: string, newPassword: string) {
        await api.post('/auth/reset_password', {
            email,
            token,
            password: newPassword,
        });
    }

    async function signOut() {
        await AsyncStorage.multiRemove([
            USER_KEY,
            ACCESS_TOKEN_KEY,
            REFRESH_TOKEN_KEY,
            '@DívidaZero:user',
            '@DívidaZero:accessToken',
            '@DívidaZero:refreshToken',
        ]);

        setUser(null);
        delete api.defaults.headers.common.Authorization;
    }

    async function refreshToken() {
        const refresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refresh) return;

        const { data } = await api.post('/auth/refresh', { refresh_token: refresh });
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }

    async function updateUser(nextUser: User) {
        setUser(nextUser);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }

    return (
        <AuthContext.Provider
            value={{
                signed: !!user,
                user,
                loading,
                authLoading,
                signIn,
                signUp,
                requestPasswordReset,
                resetPassword,
                signOut,
                refreshToken,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
    }

    return context;
}

