import { json as d3json } from "d3";
import { PropValue, ComputeAgent, AsyncCache } from "../core/types";

type JsonDataProp = {
  readonly url: string;
};

const keys = ["url"] as const;

type Keys = typeof keys;

const DEFAULT_CACHE_SIZE = 100;

export class JsonData extends PropValue<JsonDataProp, any> {}

export class JsonDataProvider extends AsyncCache<
  JsonDataProp,
  JsonData,
  Keys
> {}

export class JsonDataAgent extends ComputeAgent<JsonDataProp, JsonData> {}

async function jsonDataFetch(
  props: JsonDataProp,
  signal: AbortSignal,
): Promise<JsonData> {
  const data = await d3json(props.url, { signal });
  return new JsonData(props, data);
}

export const createJsonDataAgent = () =>
  new JsonDataAgent(
    new JsonDataProvider(jsonDataFetch, keys, {
      maxCacheSize: DEFAULT_CACHE_SIZE,
    }),
  );
