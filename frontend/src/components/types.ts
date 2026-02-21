import { logger, type Level } from "../logger";
import stringify from "json-stable-stringify";

type Primitive = string | number | boolean | undefined | null;

export type ConfigType = {
  readonly [key: string]:
    | ConfigType
    | Primitive
    | readonly Primitive[]
    | CachedResult<any, any>
    | readonly CachedResult<any, any>[];
};

export class CachedResult<Config extends ConfigType, Value> {
  constructor(
    readonly props: Config,
    readonly value: Value,
  ) {}

  toJSON() {
    return this.props;
  }
}

export class DataClient<Prop extends ConfigType, Value> {
  constructor(readonly provider: CachingCompute<Prop, Value, any>) {}

  get(props: Prop, args?: any): Promise<Value> {
    return this.provider.get(props, this, args);
  }
}

type ComputeFn<Prop extends ConfigType, Value> = (
  props: Prop,
  signal: AbortSignal,
  args?: any,
) => Promise<Value>;

type CachingComputeOptions = {
  maxCacheSize?: number;
  logLevel?: Level;
};

export class CachingCompute<
  Prop extends ConfigType,
  Value,
  K extends readonly (keyof Prop)[],
> {
  private cache = new Map<string, Value>();
  private pending = new Map<
    string,
    { promise: Promise<Value>; agent: DataClient<Prop, Value> }
  >();
  private controllers = new WeakMap<DataClient<Prop, Value>, AbortController>();
  private logger = logger.child({ component: this.constructor.name });
  private maxCacheSize: number;

  constructor(
    private compute: ComputeFn<Prop, Value>,
    readonly keys: [keyof Prop] extends [K[number]] ? K : never,
    { maxCacheSize = 1, logLevel }: CachingComputeOptions = {},
  ) {
    this.maxCacheSize = maxCacheSize;
    if (logLevel) {
      this.logger.level = logLevel;
    }
  }

  async get(
    props: Prop,
    agent: DataClient<Prop, Value>,
    args?: any,
  ): Promise<Value> {
    const propsClean = this.keys.reduce((acc, key) => {
      if (key in props) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as Prop);

    const stableKey = stringify(propsClean);

    if (stableKey && this.cache.has(stableKey)) {
      const value = this.cache.get(stableKey)!;
      this.cache.delete(stableKey);
      this.cache.set(stableKey, value);
      this.logger.debug(`Returning cached value for ${stableKey}`);
      return value;
    }

    if (stableKey && this.pending.has(stableKey)) {
      const entry = this.pending.get(stableKey)!;
      if (entry.agent === agent) {
        // same agent → cancel previous and recompute
        this.logger.debug(
          `Restarting computation for ${stableKey} (same agent)`,
        );
        this.controllers.get(agent)?.abort(`Restarted task: ${stableKey}`);
        this.pending.delete(stableKey);
      } else {
        // different agent → share pending
        this.logger.debug(`Awaiting existing computation for ${stableKey}`);
        return entry.promise;
      }
    }

    // 3. Setup Abort Logic
    this.controllers.get(agent)?.abort(`New task: ${stableKey}`);
    const controller = new AbortController();
    controller.signal.addEventListener("abort", () =>
      this.logger.info(
        `Aborting task: ${stableKey} \n --> Because ${controller.signal.reason}`,
      ),
    );
    this.controllers.set(agent, controller);

    // 4. Start Compute and store the Promise
    this.logger.debug(`Computing value for ${stableKey}`);
    const computePromise = (async () => {
      try {
        const value = await this.compute(propsClean, controller.signal, args);

        if (this.maxCacheSize > 0 && stableKey) {
          this.cache.set(stableKey, value);
          if (this.cache.size > this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey!);
          }
        }
        return value;
      } finally {
        // Always clean up the pending map so future requests can re-compute if needed
        this.pending.delete(stableKey!);
        if (this.controllers.get(agent) === controller) {
          this.controllers.delete(agent);
        }
      }
    })();

    this.pending.set(stableKey!, { promise: computePromise, agent: agent });
    return computePromise;
  }
}
