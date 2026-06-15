import { getLocalDailyMessage } from '../localDailyMessage';

describe('local daily message rotation', () => {
  it('returns 14 unique messages across 14 consecutive days', () => {
    const start = new Date(2026, 3, 1); // April 1, 2026
    const ids = new Set<number>();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
      ids.add(getLocalDailyMessage(date).id);
    }

    expect(ids.size).toBe(14);
  });

  it('restarts the cycle on the 15th day', () => {
    const firstDay = new Date(2026, 3, 1);
    const fifteenthDay = new Date(2026, 3, 15);

    expect(getLocalDailyMessage(fifteenthDay).id).toBe(getLocalDailyMessage(firstDay).id);
  });

  it('returns the same message for the same day', () => {
    const reference = new Date(2026, 3, 9);

    const first = getLocalDailyMessage(reference);
    const second = getLocalDailyMessage(reference);

    expect(second.id).toBe(first.id);
    expect(second.title).toBe(first.title);
    expect(second.body).toBe(first.body);
  });
});
