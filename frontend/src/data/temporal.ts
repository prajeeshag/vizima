// data/temporal.ts

export type TemporalFetcher<T> = (timeIndex: number | undefined) => Promise<T>;

export function createTemporalFetcher<T>(options: {
  numTimeSteps: number;
  fetch: (t: number | undefined, agentId: 0 | 1 | 2) => Promise<T>;
  interpolate: (a: T, b: T, alpha: number) => T;
}): TemporalFetcher<T> {
  let lastPrefetchT2: number | null = null;
  let prefetch: Promise<T> | null = null;

  return async function get(timeIndex) {
    if (timeIndex === undefined) {
      return options.fetch(undefined, 0);
    }

    const t0 = Math.floor(timeIndex);
    const t1 = Math.ceil(timeIndex);
    const t2 = (t1 + 1) % options.numTimeSteps;

    if (t2 !== lastPrefetchT2) {
      await prefetch;
      lastPrefetchT2 = t2;
      prefetch = options.fetch(t2, 2);
    }

    if (t1 === t0) {
      return options.fetch(t0, 0);
    }

    const alpha = timeIndex - t0;
    const [a, b] = await Promise.all([
      options.fetch(t0, 0),
      options.fetch(t1, 1),
    ]);
    return options.interpolate(a, b, alpha);
  };
}
