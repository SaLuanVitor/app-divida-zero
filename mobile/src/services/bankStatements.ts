import api from './api';

export interface ImportedTransaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  flow_type: 'income' | 'expense';
  suggested_category: string | null;
  ai_confidence: number | null;
  original_category: string | null;
  status: 'pending' | 'duplicate' | 'accepted' | 'rejected';
  duplicate_reason: 'exact_match' | 'fuzzy_match' | null;
  duplicate_of_id: number | null;
}

export interface UploadResponse {
  batch_id: string;
  status: 'processing';
  message: string;
}

export interface StatusResponse {
  batch_id: string;
  status: 'processing' | 'done' | 'error';
  step?: 'parsing' | 'categorizing' | 'deduplicating' | 'done';
  progress?: number;
  total?: number;
  pending?: number;
  duplicates?: number;
}

export interface PendingGroup {
  date: string;
  transactions: ImportedTransaction[];
}

export interface PendingResponse {
  groups: PendingGroup[];
  total: number;
}

export const bankStatementsApi = {
  upload: (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append('file', file as any);
    return api.post<UploadResponse>('/bank/statements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getStatus: (batchId: string) =>
    api.get<StatusResponse>(`/bank/statements/${batchId}/status`),

  deleteBatch: (batchId: string) =>
    api.delete(`/bank/statements/${batchId}`),

  getPending: () =>
    api.get<PendingResponse>('/bank/transactions/pending'),

  accept: (transactionIds: number[]) =>
    api.post('/bank/transactions/accept', { transaction_ids: transactionIds }),

  reject: (transactionIds: number[]) =>
    api.post('/bank/transactions/reject', { transaction_ids: transactionIds }),

  merge: (id: number, financialRecordId: number) =>
    api.post(`/bank/transactions/${id}/merge`, { financial_record_id: financialRecordId }),
};
