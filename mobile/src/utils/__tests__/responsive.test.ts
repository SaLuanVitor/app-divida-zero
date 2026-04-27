import {
  controlHeight,
  isCompactDevice,
  isLargeDevice,
  resolveTabLabel,
  textClampLines,
  threeColumnItemWidth,
} from '../responsive';

describe('responsive utils', () => {
  it('calculates control height respecting font scale and touch target', () => {
    expect(controlHeight(1, false, 44)).toBe(44);
    expect(controlHeight(1.3, false, 44)).toBe(57);
    expect(controlHeight(0.9, true, 44)).toBe(52);
  });

  it('detects compact and large devices', () => {
    expect(isCompactDevice(360)).toBe(true);
    expect(isCompactDevice(412)).toBe(false);
    expect(isLargeDevice(768)).toBe(true);
    expect(isLargeDevice(500)).toBe(false);
  });

  it('returns clamp lines by context', () => {
    expect(textClampLines('title')).toBe(1);
    expect(textClampLines('card')).toBe(2);
    expect(textClampLines('list')).toBe(2);
  });

  it('calculates three-column width with safe minimum', () => {
    expect(threeColumnItemWidth(320)).toBeGreaterThanOrEqual(72);
    expect(threeColumnItemWidth(390)).toBe(124);
  });

  it('resolves tab labels with fallback for large text/compact devices', () => {
    expect(resolveTabLabel('Relatorios', 1, false)).toBe('Relatorios');
    expect(resolveTabLabel('Relatorios', 1.15, false)).toBe('Relat.');
    expect(resolveTabLabel('Lancamentos', 1, true)).toBe('Lanç.');
  });
});

