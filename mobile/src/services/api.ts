import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = '@DividaZero:accessToken';
const REFRESH_TOKEN_KEY = '@DividaZero:refreshToken';
const USER_KEY = '@DividaZero:user';

let onUnauthorized: (() => void | Promise<void>) | null = null;
let refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null;
let invalidateSessionPromise: Promise<void> | null = null;

const getLocalDateHeader = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDefaultDevApiBaseUrl = (platform: string) =>
    platform === 'android' ? 'http://10.0.2.2:3000/api/v1' : 'http://localhost:3000/api/v1';
const defaultReleaseApiBaseUrl = 'https://app-divida-zero-production-5333.up.railway.app/api/v1';

const normalizeAndroidLocalhost = (url: string, platform: string) =>
    platform === 'android' && url.includes('localhost') ? url.replace('localhost', '10.0.2.2') : url;

export const resolveApiBaseUrl = ({
    isDev,
    platform,
    envApiBaseUrl,
}: {
    isDev: boolean;
    platform: string;
    envApiBaseUrl?: string;
}) => {
    const envUrl = envApiBaseUrl?.trim();

    if (!isDev) {
        // Release builds must always target Railway.
        return defaultReleaseApiBaseUrl;
    }

    if (envUrl) {
        return normalizeAndroidLocalhost(envUrl, platform);
    }

    return getDefaultDevApiBaseUrl(platform);
};

const resolvedApiBaseUrl = resolveApiBaseUrl({
    isDev: __DEV__,
    platform: Platform.OS,
    envApiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
});

const api = axios.create({
    baseURL: resolvedApiBaseUrl,
    timeout: 10000,
    headers: {
        Accept: 'application/json; charset=utf-8',
        'Content-Type': 'application/json; charset=utf-8',
    },
});

api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
            config.headers['X-User-Local-Date'] = getLocalDateHeader();
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const status = error.response?.status;

        if (!originalRequest || status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = (async () => {
                    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
                    if (!refreshToken) {
                        throw error;
                    }

                    const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
                    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
                    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
                    api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;

                    return {
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                    };
                })().finally(() => {
                    refreshPromise = null;
                });
            }

            const refreshedTokens = await refreshPromise;

            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${refreshedTokens.access_token}`;
            }

            return api(originalRequest);
        } catch (refreshError) {
            if (!invalidateSessionPromise) {
                invalidateSessionPromise = (async () => {
                    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
                    delete api.defaults.headers.common.Authorization;
                    if (onUnauthorized) {
                        await onUnauthorized();
                    }
                })().finally(() => {
                    invalidateSessionPromise = null;
                });
            }
            await invalidateSessionPromise;

            return Promise.reject(refreshError);
        }
    }
);

export default api;
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY };

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
    onUnauthorized = handler;
}

