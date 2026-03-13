import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@DividaZero:accessToken';
const REFRESH_TOKEN_KEY = '@DividaZero:refreshToken';

const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    timeout: 10000,
});

api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
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
            const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

            if (!refreshToken) {
                return Promise.reject(error);
            }

            const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
            await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);

            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
            }

            return api(originalRequest);
        } catch (refreshError) {
            await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, '@DividaZero:user']);
            return Promise.reject(refreshError);
        }
    }
);

export default api;
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY };

