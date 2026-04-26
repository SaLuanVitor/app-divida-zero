import api from './api';
import { AdminAnalyticsOverviewDto, AdminUsersListResponse, AdminUsersQueryParams } from '../types/admin';

export const listAdminUsers = async (params: AdminUsersQueryParams = {}) => {
  const { data } = await api.get('/admin/users', { params });
  return data as AdminUsersListResponse;
};

export const updateAdminUserStatus = async (id: number, active: boolean) => {
  const { data } = await api.patch(`/admin/users/${id}/status`, { active });
  return data as { message: string };
};

export const resetAdminUserPassword = async (id: number, temporary_password: string) => {
  const { data } = await api.patch(`/admin/users/${id}/reset_password`, { temporary_password });
  return data as { message: string };
};

export const getAdminAnalyticsOverview = async (params: { days?: number } = {}) => {
  const { data } = await api.get('/admin/analytics/overview', { params });
  return data as AdminAnalyticsOverviewDto;
};
