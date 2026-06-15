export const runWhenIdle = (task: () => void) => {
  const idle = (globalThis as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
  const cancelIdle = (globalThis as any).cancelIdleCallback as ((id: number) => void) | undefined;

  if (typeof idle === 'function') {
    const id = idle(() => task());
    return () => {
      if (typeof cancelIdle === 'function') cancelIdle(id);
    };
  }

  const timeoutId = setTimeout(task, 0);
  return () => clearTimeout(timeoutId);
};
