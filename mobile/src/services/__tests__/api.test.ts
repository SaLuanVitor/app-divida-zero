import AsyncStorage from '@react-native-async-storage/async-storage';
import api, {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  resolveApiBaseUrl,
  setUnauthorizedHandler,
} from '../api';

describe('api interceptor hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    setUnauthorizedHandler(null);
  });

  it('injects Authorization header from storage on request', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('token-123');
    const fulfilled = (api.interceptors.request as any).handlers[0].fulfilled as Function;
    const config = { headers: {} };

    const result = await fulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer token-123');
  });

  it('uses single-flight refresh for concurrent 401 responses', async () => {
    const rejected = (api.interceptors.response as any).handlers[0].rejected as Function;

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-123');
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({
      data: { access_token: 'new-access', refresh_token: 'new-refresh' },
    } as any);

    const adapterMock = jest.fn(async (config: any) => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    api.defaults.adapter = adapterMock as any;

    const errorA = { config: { url: '/financial_records', headers: {} }, response: { status: 401 } } as any;
    const errorB = { config: { url: '/financial_goals', headers: {} }, response: { status: 401 } } as any;

    await Promise.all([rejected(errorA), rejected(errorB)]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'refresh-123' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'new-access');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'new-refresh');
  });

  it('clears session and triggers unauthorized callback when refresh fails', async () => {
    const rejected = (api.interceptors.response as any).handlers[0].rejected as Function;

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-invalid');
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(api, 'post').mockRejectedValueOnce(new Error('refresh failed'));

    const unauthorizedSpy = jest.fn().mockResolvedValue(undefined);
    setUnauthorizedHandler(unauthorizedSpy);

    const error = { config: { url: '/financial_records', headers: {} }, response: { status: 401 } } as any;

    await expect(rejected(error)).rejects.toBeDefined();
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers unauthorized callback once for concurrent refresh failures', async () => {
    const rejected = (api.interceptors.response as any).handlers[0].rejected as Function;

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-invalid');
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(api, 'post').mockRejectedValueOnce(new Error('refresh failed'));

    const unauthorizedSpy = jest.fn().mockResolvedValue(undefined);
    setUnauthorizedHandler(unauthorizedSpy);

    const errorA = { config: { url: '/financial_records', headers: {} }, response: { status: 401 } } as any;
    const errorB = { config: { url: '/financial_goals', headers: {} }, response: { status: 401 } } as any;

    await Promise.allSettled([rejected(errorA), rejected(errorB)]);

    expect(AsyncStorage.multiRemove).toHaveBeenCalledTimes(1);
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
  });
});

describe('resolveApiBaseUrl', () => {
  it('uses env url in dev mode and normalizes localhost on android', () => {
    const result = resolveApiBaseUrl({
      isDev: true,
      platform: 'android',
      envApiBaseUrl: 'http://localhost:3000/api/v1',
    });

    expect(result).toBe('http://10.0.2.2:3000/api/v1');
  });

  it('falls back to local dev url when env is missing in dev mode', () => {
    const result = resolveApiBaseUrl({
      isDev: true,
      platform: 'android',
      envApiBaseUrl: '',
    });

    expect(result).toBe('http://10.0.2.2:3000/api/v1');
  });

  it('always uses Railway in release mode even with local env url', () => {
    const result = resolveApiBaseUrl({
      isDev: false,
      platform: 'android',
      envApiBaseUrl: 'http://10.0.2.2:3000/api/v1',
    });

    expect(result).toBe('https://app-divida-zero-production-5333.up.railway.app/api/v1');
  });

  it('uses Railway in release mode without env', () => {
    const result = resolveApiBaseUrl({
      isDev: false,
      platform: 'android',
    });

    expect(result).toBe('https://app-divida-zero-production-5333.up.railway.app/api/v1');
  });
});
