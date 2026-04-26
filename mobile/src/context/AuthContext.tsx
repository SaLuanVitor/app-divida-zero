import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse } from '../types/auth';
import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, setUnauthorizedHandler } from '../services/api';
import { trackAnalyticsEventDeferred } from '../services/analytics';
import { getCurrentUser } from '../services/account';

const USER_KEY = '@DividaZero:user';
const LEGACY_USER_KEY = '@DívidaZero:user';
const LEGACY_ACCESS_KEY = '@DívidaZero:accessToken';
const LEGACY_REFRESH_KEY = '@DívidaZero:refreshToken';
const LEGACY_MOJIBAKE_USER_KEY = '@D?vidaZero:user';
const LEGACY_MOJIBAKE_ACCESS_KEY = '@D?vidaZero:accessToken';
const LEGACY_MOJIBAKE_REFRESH_KEY = '@D?vidaZero:refreshToken';

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
    invalidateSession(): Promise<void>;
    refreshToken(): Promise<void>;
    updateUser(user: User): Promise<void>;
    reloadMe(): Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const CLEAR_SESSION_KEYS = [
    USER_KEY,
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    LEGACY_USER_KEY,
    LEGACY_ACCESS_KEY,
    LEGACY_REFRESH_KEY,
    LEGACY_MOJIBAKE_USER_KEY,
    LEGACY_MOJIBAKE_ACCESS_KEY,
    LEGACY_MOJIBAKE_REFRESH_KEY,
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);

    const normalizeUser = useCallback((value: User): User => {
        return {
            ...value,
            role: value.role === 'admin' ? 'admin' : 'user',
            active: typeof value.active === 'boolean' ? value.active : true,
            force_password_change:
                typeof value.force_password_change === 'boolean' ? value.force_password_change : false,
        };
    }, []);

    const invalidateSession = useCallback(async () => {
        await AsyncStorage.multiRemove(CLEAR_SESSION_KEYS);
        setUser(null);
        delete api.defaults.headers.common.Authorization;
    }, []);

    useEffect(() => {
        async function bootstrap() {
            try {
                const [rawUser, accessToken, refreshToken] = await AsyncStorage.multiGet([
                    USER_KEY,
                    ACCESS_TOKEN_KEY,
                    REFRESH_TOKEN_KEY,
                ]);

                const savedUser = rawUser[1];
                const savedAccessToken = accessToken[1];
                const savedRefreshToken = refreshToken[1];

                if (savedUser && savedAccessToken && savedRefreshToken) {
                    setUser(normalizeUser(JSON.parse(savedUser)));
                    api.defaults.headers.common.Authorization = `Bearer ${savedAccessToken}`;
                    return;
                }

                await invalidateSession();
            } finally {
                setLoading(false);
            }
        }

        bootstrap();
    }, [invalidateSession, normalizeUser]);

    useEffect(() => {
        setUnauthorizedHandler(invalidateSession);
        return () => {
            setUnauthorizedHandler(null);
        };
    }, [invalidateSession]);

    async function signIn(email: string, pass: string) {
        setAuthLoading(true);

        try {
            const { data } = await api.post<AuthResponse>('/auth/login', {
                email,
                password: pass,
            });

            const normalized = normalizeUser(data.user);
            setUser(normalized);
            api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;

            await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized));
            await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);

            trackAnalyticsEventDeferred({
                event_name: 'login_success',
                screen: 'Login',
                metadata: {
                    method: 'password',
                },
            });
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
        await invalidateSession();
    }

    async function refreshToken() {
        const refresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refresh) return;

        const { data } = await api.post('/auth/refresh', { refresh_token: refresh });
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
    }

    async function updateUser(nextUser: User) {
        const normalized = normalizeUser(nextUser);
        setUser(normalized);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized));
    }

    async function reloadMe() {
        const { user: freshUser } = await getCurrentUser();
        await updateUser(freshUser);
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
                invalidateSession,
                refreshToken,
                updateUser,
                reloadMe,
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
