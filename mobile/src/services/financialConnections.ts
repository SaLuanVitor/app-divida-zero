import api from './api';

export interface FinancialConnectionDto {
  id: number;
  provider: string;
  provider_item_id: string;
  provider_institution_id: string | null;
  status: 'pending' | 'active' | 'error' | 'disconnected' | 'action_required';
}

export interface CreateConnectionResponse {
  connection: FinancialConnectionDto;
  connect_token: string;
  connect_url: string;
  limits?: unknown;
}

export const financialConnectionsApi = {
  create: () => api.post<CreateConnectionResponse>('/financial/connections'),

  show: (id: number) => api.get<{ connection: FinancialConnectionDto }>(`/financial/connections/${id}`),

  sync: (id: number) => api.post(`/financial/connections/${id}/sync`),

  disconnect: (id: number) => api.delete(`/financial/connections/${id}`),
};
