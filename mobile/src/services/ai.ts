import api from './api';
import {
  AiAlert,
  AiCategorizeSuggestion,
  AiNextAction,
  AiReportsBriefing,
  AiResponseMeta,
  DailyMessageDto,
} from '../types/ai';

const toConfidence = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.max(0, Math.min(1, parsed));
};

const toMeta = (data: any): AiResponseMeta => ({
  interaction_id: Number(data?.interaction_id || 0),
  source: data?.source === 'llm' ? 'llm' : 'fallback',
});

export const getAiNextAction = async () => {
  const { data } = await api.post('/ai/next_action');
  const action: AiNextAction = {
    title: String(data?.next_action?.title || 'Proximo passo'),
    description: String(data?.next_action?.description || 'Revise seus pendentes de hoje.'),
    cta: String(data?.next_action?.cta || 'Ver pendentes'),
    confidence: toConfidence(data?.next_action?.confidence),
  };
  return { action, meta: toMeta(data) };
};

export const getAiAlerts = async () => {
  const { data } = await api.post('/ai/alerts');
  const alerts = Array.isArray(data?.alerts)
    ? data.alerts.map((item: any): AiAlert => ({
        type: item?.type === 'delay' || item?.type === 'habit' ? item.type : 'cashflow',
        severity: item?.severity === 'low' || item?.severity === 'high' ? item.severity : 'medium',
        message: String(item?.message || 'Revise pendencias e prioridades.'),
        recommended_action: String(item?.recommended_action || 'Defina uma acao para hoje.'),
      }))
    : [];
  return { alerts, meta: toMeta(data) };
};

export const getAiCategorizeRecord = async (payload: { title: string; amount: number | string; note?: string }) => {
  const { data } = await api.post('/ai/categorize_record', payload);
  const suggestion: AiCategorizeSuggestion = {
    suggested_category: String(data?.suggestion?.suggested_category || 'Sem categoria'),
    suggested_flow_type: data?.suggestion?.suggested_flow_type === 'income' ? 'income' : 'expense',
    confidence: toConfidence(data?.suggestion?.confidence),
    reasoning_short: String(data?.suggestion?.reasoning_short || 'Sugestao baseada no historico recente.'),
  };
  return { suggestion, meta: toMeta(data) };
};

export const getAiReportsBriefing = async () => {
  const { data } = await api.post('/ai/reports_briefing');
  const actions =
    Array.isArray(data?.briefing?.actions) && data.briefing.actions.length
      ? data.briefing.actions.map((item: unknown) => String(item)).slice(0, 2)
      : ['Revise os pendentes do periodo.', 'Atualize sua principal meta da semana.'];
  const briefing: AiReportsBriefing = {
    title: String(data?.briefing?.title || 'Resumo inteligente'),
    summary: String(data?.briefing?.summary || 'Continue registrando e concluindo pendencias.'),
    actions,
    confidence: toConfidence(data?.briefing?.confidence),
  };
  return { briefing, meta: toMeta(data) };
};

export const sendAiFeedback = async (payload: {
  interaction_id: number;
  vote: 'like' | 'dislike';
  useful?: boolean;
  comment?: string;
}) => {
  const { data } = await api.post('/ai/feedback', payload);
  return {
    id: Number(data?.id || 0),
    message: String(data?.message || 'Feedback enviado.'),
  };
};

export const getDailyMessageToday = async () => {
  const { data } = await api.get('/daily_message/today');
  const parsed: DailyMessageDto = {
    id: Number(data?.id || 0),
    date: String(data?.date || new Date().toISOString().slice(0, 10)),
    title: String(data?.title || 'Mensagem do dia'),
    body: String(data?.body || 'Um passo por vez fortalece seu controle financeiro.'),
    theme: String(data?.theme || 'constancia'),
  };
  return parsed;
};
