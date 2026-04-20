describe('brand assets generator smoke', () => {
  it('validates generated brand assets dimensions and visibility', async () => {
    const { checkBrandAssets } = require('../../../scripts/generate-brand-assets');
    await expect(checkBrandAssets()).resolves.toBeUndefined();
  });
});
