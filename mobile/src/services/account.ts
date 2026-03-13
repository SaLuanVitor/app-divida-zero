import api from './api';
import { User } from '../types/auth';

export const updateProfile = async (payload: { name: string; email: string }) => {
  const { data } = await api.patch('/auth/profile', payload);
  return data as { message: string; user: User };
};

export const changePassword = async (payload: { current_password: string; new_password: string }) => {
  const { data } = await api.patch('/auth/change_password', payload);
  return data as { message: string };
};

