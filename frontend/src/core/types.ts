import { logger, type Level } from "../logger";
import stringify from "json-stable-stringify";

type Primitive = string | number | boolean | undefined | null;

export type PropType = {
  readonly [key: string]:
  | PropType
  | Primitive
  | readonly Primitive[]
  | PropValue<any, any>
  | readonly PropValue<any, any>[];
};

export class PropValue<Config extends PropType, Value> {
  constructor(
    readonly props: Config,
    readonly value: Value,
  ) { }

  toJSON() {
    return this.props;
  }
}

export class ComputeAgent<Prop extends PropType, Value> {
  constructor(readonly provider: AsyncCache<Prop, Value, any>) { }

  get(props: Prop, args?: any): Promise<Value> {
    return this.provider.get(props, this, args);
  }
}

type ComputeFn<Prop extends PropType, Value> = (
  props: Prop,
  signal: AbortSignal,
  args?: any,
) => Promise<Value>;

type AsyncCacheOptions = {
  maxCacheSize?: number;
  logLevel?: Level;
};

export class AsyncCache<
  Prop extends PropType,
  Value,
  K extends readonly (keyof Prop)[],
> {
  private cache = new Map<string, Value>();
  private pending = new Map<
    string,
    { promise: Promise<Value>; agent: ComputeAgent<Prop, Value> }
  >();
  private controllers = new WeakMap<
    ComputeAgent<Prop, Value>,
    AbortController
  >();
  private logger = logger.child({ component: this.constructor.name });
  private maxCacheSize: number;

  constructor(
    private compute: ComputeFn<Prop, Value>,
    readonly keys: [keyof Prop] extends [K[number]] ? K : never,
    { maxCacheSize = 1, logLevel }: AsyncCacheOptions = {},
  ) {
    this.maxCacheSize = maxCacheSize;
    if (logLevel) {
      this.logger.level = logLevel;
    }
  }

  async get(
    props: Prop,
    agent: ComputeAgent<Prop, Value>,
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
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError")
        ) {
          this.logger.debug(`Computation aborted for ${stableKey}`);
          throw Object.assign(new DOMException("Aborted", "AbortError"), {
            aborted: true,
          });
        }
        throw err;
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


export class SimpleAgent<Prop extends PropType, Value> {
  private controller?: AbortController;

  constructor(private fn: ComputeFn<Prop, Value>) { }

  async get(
    props: Prop,
  ): Promise<Value> {
    // Abort previous request
    this.controller?.abort();

    // Create controller for this request
    const controller = new AbortController();
    this.controller = controller;

    try {
      return await this.fn(props, controller.signal);
    } finally {
      // Don't clear if a newer request has already started
      if (this.controller === controller) {
        this.controller = undefined;
      }
    }
  }
}