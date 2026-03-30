import api from './api';
import { ReportsSummaryDto } from '../types/report';

export const getReportsSummary = async (year?: number, month?: number) => {
  const { data } = await api.get('/reports/summary', {
    params: {
      year,
      month,
    },
  });

  return data as ReportsSummaryDto;
};
