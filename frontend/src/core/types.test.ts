import { describe, expect, it, mock } from "bun:test";
import { AsyncCache, ComputeAgent, PropValue } from "./types";

type SimpleProps = { key: string; value: number };
const keys = ["key", "value"] as const;

function makeCompute(delay = 0) {
  const fn = mock(
    async (props: SimpleProps, signal: AbortSignal): Promise<number> => {
      if (delay > 0) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, delay);
          signal.addEventListener("abort", () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return props.value * 2;
    },
  );
  return fn;
}

describe("CachingCompute", () => {
  describe("basic computation", () => {
    it("computes and returns a value", async () => {
      const compute = makeCompute();
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
      );
      const agent = new ComputeAgent(provider);
      const result = await provider.get({ key: "a", value: 5 }, agent);
      expect(result).toBe(10);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("returns cached value on second request", async () => {
      const compute = makeCompute();
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
        { maxCacheSize: 2 },
      );
      const agent = new ComputeAgent(provider);
      const props: SimpleProps = { key: "b", value: 3 };

      const r1 = await provider.get(props, agent);
      const r2 = await provider.get(props, agent);

      expect(r1).toBe(6);
      expect(r2).toBe(6);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("recomputes after cache eviction", async () => {
      const compute = makeCompute();
      // maxCacheSize=1: after inserting second item, first is evicted
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
        { maxCacheSize: 1 },
      );
      const agent = new ComputeAgent(provider);

      await provider.get({ key: "a", value: 1 }, agent);
      await provider.get({ key: "b", value: 2 }, agent); // evicts "a"
      await provider.get({ key: "a", value: 1 }, agent); // must recompute

      expect(compute).toHaveBeenCalledTimes(3);
    });

    it("two different agents share a pending computation", async () => {
      const compute = makeCompute(20);
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
        { maxCacheSize: 2 },
      );
      const agent1 = new ComputeAgent(provider);
      const agent2 = new ComputeAgent(provider);
      const props: SimpleProps = { key: "shared", value: 7 };

      const [r1, r2] = await Promise.all([
        provider.get(props, agent1),
        provider.get(props, agent2),
      ]);

      expect(r1).toBe(14);
      expect(r2).toBe(14);
      // Only computed once because agent2 shared agent1's pending promise
      expect(compute).toHaveBeenCalledTimes(1);
    });
  });

  describe("abort handling", () => {
    it("rejects with AbortError when computation is aborted", async () => {
      const compute = makeCompute(50);
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
      );
      const agent = new ComputeAgent(provider);
      const props: SimpleProps = { key: "x", value: 9 };

      const promise = provider.get(props, agent);
      // Trigger abort by issuing a new request for same agent+key
      provider.get(props, agent);

      await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    });

    it("does not hang forever when aborted", async () => {
      const compute = makeCompute(50);
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
      );
      const agent = new ComputeAgent(provider);
      const props: SimpleProps = { key: "y", value: 4 };

      const promise = provider.get(props, agent);
      // Abort by issuing new request
      provider.get(props, agent);

      // Should settle (reject) within a reasonable time, not hang
      const settled = await Promise.race([
        promise.then(
          () => "resolved",
          () => "rejected",
        ),
        new Promise<string>((r) => setTimeout(() => r("timeout"), 500)),
      ]);
      expect(settled).toBe("rejected");
    });

    it("aborts previous request when same agent makes a new request", async () => {
      const compute = makeCompute(30);
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
      );
      const agent = new ComputeAgent(provider);

      const first = provider.get({ key: "z", value: 1 }, agent);
      const second = provider.get({ key: "z", value: 2 }, agent);

      // First should be aborted, second should succeed
      expect(first).rejects.toMatchObject({ name: "AbortError" });
      expect(second).resolves.toBe(4);
    });
  });

  describe("cache eviction", () => {
    it("never grows beyond maxCacheSize", async () => {
      const compute = makeCompute();
      const maxCacheSize = 3;
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
        { maxCacheSize },
      );

      // Access internal cache via cast for testing
      const internal = provider as any;
      const agents = Array.from(
        { length: 6 },
        () => new ComputeAgent(provider),
      );

      for (let i = 0; i < 6; i++) {
        await provider.get({ key: `k${i}`, value: i }, agents[i]!);
      }

      expect(internal.cache.size).toBeLessThanOrEqual(maxCacheSize);
    });

    it("does not cache when maxCacheSize is 0", async () => {
      const compute = makeCompute();
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
        { maxCacheSize: 0 },
      );
      const agent = new ComputeAgent(provider);
      const props: SimpleProps = { key: "nocache", value: 5 };

      await provider.get(props, agent);
      await provider.get(props, agent);

      expect(compute).toHaveBeenCalledTimes(2);
    });
  });

  describe("error propagation", () => {
    it("propagates non-abort errors to caller", async () => {
      const compute = mock(
        async (_props: SimpleProps, _signal: AbortSignal) => {
          throw new Error("compute failed");
        },
      );
      const provider = new AsyncCache<SimpleProps, number, typeof keys>(
        compute,
        keys,
      );
      const agent = new ComputeAgent(provider);

      await expect(
        provider.get({ key: "err", value: 1 }, agent),
      ).rejects.toThrow("compute failed");
    });
  });
});

describe("CachedResult", () => {
  it("stores props and value", () => {
    const result = new PropValue({ a: 1 }, "hello");
    expect(result.props).toEqual({ a: 1 });
    expect(result.value).toBe("hello");
  });

  it("toJSON returns props", () => {
    const result = new PropValue({ x: 42 }, [1, 2, 3]);
    expect(result.toJSON()).toEqual({ x: 42 });
  });
});
