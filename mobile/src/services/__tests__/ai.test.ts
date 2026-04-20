jest.mock('../api', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

describe('ai service phase gating', () => {
  const loadAiModule = async (phase1Mode: 'true' | 'false') => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_PHASE_1_MODE = phase1Mode;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const api = require('../api');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ai = require('../ai');
    return { api, ai };
  };

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_PHASE_1_MODE;
    jest.clearAllMocks();
  });

  it('blocks AI calls by default in phase 1 mode', async () => {
    const { ai } = await loadAiModule('true');
    await expect(ai.getAiNextAction()).rejects.toThrow('AI mobile calls are disabled in phase 1.');
  });

  it('maps next action response when phase 1 mode is disabled', async () => {
    const { api, ai } = await loadAiModule('false');
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

    const result = await ai.getAiNextAction();

    expect(result.meta.interaction_id).toBe(9);
    expect(result.action.title).toBe('Fechar pendencias');
  });
});
