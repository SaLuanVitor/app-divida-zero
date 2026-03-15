import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import api from '../../services/api';
import { AuthProvider, useAuth } from '../AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext hardening flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (api.defaults.headers.common as any).Authorization;
  });

  it('restores session on bootstrap when user and tokens exist', async () => {
    const savedUser = { id: 1, name: 'Usuario', email: 'usuario' };
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['@DividaZero:user', JSON.stringify(savedUser)],
      ['@DividaZero:accessToken', 'token-a'],
      ['@DividaZero:refreshToken', 'token-r'],
    ]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signed).toBe(true);
    expect(result.current.user?.name).toBe('Usuario');
    expect((api.defaults.headers.common as any).Authorization).toBe('Bearer token-a');
  });

  it('invalidates session on bootstrap when storage is incomplete', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['@DividaZero:user', JSON.stringify({ id: 1, name: 'Usuario', email: 'usuario' })],
      ['@DividaZero:accessToken', 'token-a'],
      ['@DividaZero:refreshToken', null],
    ]);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signed).toBe(false);
    expect(result.current.user).toBeNull();
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });

  it('signOut clears session and auth state', async () => {
    const savedUser = { id: 1, name: 'Usuario', email: 'usuario' };
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['@DividaZero:user', JSON.stringify(savedUser)],
      ['@DividaZero:accessToken', 'token-a'],
      ['@DividaZero:refreshToken', 'token-r'],
    ]);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signed).toBe(true);

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.signed).toBe(false);
    expect(result.current.user).toBeNull();
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    expect((api.defaults.headers.common as any).Authorization).toBeUndefined();
  });
});

