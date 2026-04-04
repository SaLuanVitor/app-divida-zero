const perfMarks = new Map<string, number>();

const nowMs = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const shouldLog = __DEV__;

export const markPerf = (key: string) => {
  perfMarks.set(key, nowMs());
};

export const measurePerf = (key: string, label: string) => {
  const start = perfMarks.get(key);
  if (start === undefined) return;
  const elapsed = Math.max(0, nowMs() - start);
  perfMarks.delete(key);

  if (shouldLog) {
    // eslint-disable-next-line no-console
    console.log(`[perf] ${label}: ${elapsed.toFixed(1)}ms`);
  }
};
