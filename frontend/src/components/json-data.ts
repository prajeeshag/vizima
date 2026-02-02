import * as d3 from "d3";
import { Product, Agent, Provider } from "./types";

export type JsonDataProp = {
  readonly url: string;
};

const DEFAULT_CACHE_SIZE = 100;

export class JsonData extends Product<JsonDataProp, any> {}

export class JsonDataProvider extends Provider<JsonDataProp, JsonData> {}

export class JsonDataAgent extends Agent<JsonDataProp, JsonData> {}

async function jsonDataFetch(
  props: JsonDataProp,
  signal: AbortSignal,
): Promise<JsonData> {
  const data = await d3.json(props.url, { signal });
  return new JsonData(props, data);
}

export const createJsonDataAgent = () =>
  new JsonDataAgent(new JsonDataProvider(jsonDataFetch, DEFAULT_CACHE_SIZE));
