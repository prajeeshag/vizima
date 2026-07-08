import { json as d3json } from "d3";
import { SimpleAgent } from "../core";
import QuickLRU from "quick-lru";


const jsonCache = new QuickLRU<string, any>({ maxSize: 10 });

export async function getJson(
  url: string,
  signal: AbortSignal,
): Promise<any> {
  const hit = jsonCache.get(url);
  if (hit) return hit
  const data = await d3json(url, { signal });
  jsonCache.set(url, data);
  return data;
}



export function createJsonAgent() {
  return new SimpleAgent<string, any>(getJson);
}