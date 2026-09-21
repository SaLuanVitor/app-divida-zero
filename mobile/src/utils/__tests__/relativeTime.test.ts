import { formatRelativeTime } from '../relativeTime';

describe('formatRelativeTime', () => {
  const now = Date.now();
  const at = (msAgo: number) => new Date(now - msAgo).toISOString();

  it('returns "agora" for less than a minute', () => {
    expect(formatRelativeTime(at(10_000))).toBe('agora');
  });

  it('returns relative minutes', () => {
    expect(formatRelativeTime(at(5 * 60_000))).toBe('há 5 min');
  });

  it('returns relative hours', () => {
    expect(formatRelativeTime(at(2 * 3_600_000))).toBe('há 2 horas');
  });

  it('returns singular hour', () => {
    expect(formatRelativeTime(at(1 * 3_600_000 + 60_000))).toBe('há 1 hora');
  });

  it('returns "ontem" for ~1 day', () => {
    expect(formatRelativeTime(at(25 * 3_600_000))).toBe('ontem');
  });

  it('returns relative days', () => {
    expect(formatRelativeTime(at(3 * 86_400_000))).toBe('há 3 dias');
  });

  it('returns date for older than a week', () => {
    const result = formatRelativeTime(at(10 * 86_400_000));
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('returns input token for invalid date', () => {
    expect(formatRelativeTime('not-a-date')).toBe('not-a-date');
  });
});
