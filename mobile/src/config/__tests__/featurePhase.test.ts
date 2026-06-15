describe('feature phase config', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_PHASE_1_MODE;
    jest.resetModules();
  });

  it('enables phase 1 defaults when env is not provided', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { featurePhaseConfig } = require('../featurePhase');
    expect(featurePhaseConfig.phase1Mode).toBe(true);
    expect(featurePhaseConfig.aiEnabledInUI).toBe(false);
    expect(featurePhaseConfig.aiEnabledInMobileCalls).toBe(false);
  });

  it('disables phase 1 mode when env is false', async () => {
    process.env.EXPO_PUBLIC_PHASE_1_MODE = 'false';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { featurePhaseConfig } = require('../featurePhase');
    expect(featurePhaseConfig.phase1Mode).toBe(false);
    expect(featurePhaseConfig.aiEnabledInUI).toBe(true);
    expect(featurePhaseConfig.aiEnabledInMobileCalls).toBe(true);
  });
});
