jest.mock('../api', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

import api from '../api';
import { getAiCategorizeRecord, getAiNextAction, getAiReportsBriefing, getDailyMessageToday, sendAiFeedback } from '../ai';

describe('ai service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps next action response', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        interaction_id: 9,
        source: 'llm',
        next_action: {
          title: 'Fechar pendencias',
          description: 'Conclua um item hoje.',
          cta: 'Ver pendentes',
          confidence: 0.8,
        },
      },
    });

    const result = await getAiNextAction();

    expect(result.meta.interaction_id).toBe(9);
    expect(result.action.title).toBe('Fechar pendencias');
  });

  it('maps categorize suggestion response', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        interaction_id: 3,
        source: 'fallback',
        suggestion: {
          suggested_category: 'Cartao',
          suggested_flow_type: 'expense',
          confidence: 0.6,
          reasoning_short: 'Historico parecido.',
        },
      },
    });

    const result = await getAiCategorizeRecord({ title: 'Nubank', amount: 100 });

    expect(result.suggestion.suggested_category).toBe('Cartao');
    expect(result.meta.source).toBe('fallback');
  });

  it('maps reports briefing response', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        interaction_id: 10,
        source: 'llm',
        briefing: {
          title: 'Resumo inteligente',
          summary: 'Seu saldo melhorou.',
          actions: ['Feche uma pendencia'],
          confidence: 0.7,
        },
      },
    });

    const result = await getAiReportsBriefing();
    expect(result.briefing.actions[0]).toContain('Feche');
  });

  it('maps daily message response', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 1,
        date: '2026-04-09',
        title: 'Mensagem',
        body: 'Continue firme.',
        theme: 'constancia',
      },
    });

    const result = await getDailyMessageToday();
    expect(result.date).toBe('2026-04-09');
  });

  it('posts ai feedback', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { id: 44, message: 'ok' },
    });

    const result = await sendAiFeedback({ interaction_id: 44, vote: 'like' });
    expect(result.id).toBe(44);
  });
});
