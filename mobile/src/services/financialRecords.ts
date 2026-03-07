import api from './api';
import { CreateFinancialRecordPayload, FinancialRecordDto } from '../types/financialRecord';
import { XpFeedbackDto } from '../types/gamification';

export const createFinancialRecord = async (payload: CreateFinancialRecordPayload) => {
  const { data } = await api.post('/financial_records', payload);
  return data as {
    message: string;
    created_count: number;
    records: FinancialRecordDto[];
    xp_feedback?: XpFeedbackDto | null;
  };
};

export const listFinancialRecords = async (year?: number, month?: number) => {
  const { data } = await api.get('/financial_records', {
    params: {
      year,
      month,
    },
  });

  return data as {
    records: FinancialRecordDto[];
  };
};

export const payFinancialRecord = async (id: number) => {
  const { data } = await api.patch(`/financial_records/${id}/pay`);
  return data as {
    message: string;
    record: FinancialRecordDto;
    xp_feedback?: XpFeedbackDto | null;
  };
};

export const deleteFinancialRecord = async (id: number, scope: 'single' | 'group' = 'single') => {
  const { data } = await api.delete(`/financial_records/${id}`, {
    params: {
      scope: scope === 'group' ? 'group' : 'single',
    },
  });
  return data as {
    message: string;
    deleted_count: number;
    xp_feedback?: XpFeedbackDto | null;
  };
};
