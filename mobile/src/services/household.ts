import api from './api';
import { Household, HouseholdInvitation, PendingInvitation } from '../types/household';

export const getMyHousehold = async (): Promise<{ household: Household | null }> => {
  const { data } = await api.get('/household');
  return data;
};

export const createHousehold = async (name: string): Promise<Household> => {
  const { data } = await api.post('/household', { household: { name } });
  return data;
};

export const updateHousehold = async (name: string): Promise<Household> => {
  const { data } = await api.patch('/household', { household: { name } });
  return data;
};

export const leaveHousehold = async (): Promise<void> => {
  await api.delete('/household');
};

export const listHouseholdInvitations = async (): Promise<{ invitations: HouseholdInvitation[] }> => {
  const { data } = await api.get('/household/invitations');
  return data;
};

export const createHouseholdInvitation = async (email: string): Promise<{ invitation: HouseholdInvitation }> => {
  const { data } = await api.post('/household/invitations', { email });
  return data;
};

export const cancelHouseholdInvitation = async (id: number): Promise<void> => {
  await api.delete(`/household/invitations/${id}`);
};

export const listPendingInvitations = async (): Promise<{ invitations: PendingInvitation[] }> => {
  const { data } = await api.get('/invitations/pending');
  return data;
};

export const acceptInvitation = async (token: string): Promise<void> => {
  await api.post(`/invitations/${token}/accept`);
};

export const declineInvitation = async (token: string): Promise<void> => {
  await api.post(`/invitations/${token}/decline`);
};
