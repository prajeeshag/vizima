import * as zarr from "zarrita";
import { type ArrayProps, Array } from "./array";
import QuickLRU from "quick-lru";

interface ChunkCache {
  get(key: string): zarr.Chunk<zarr.DataType> | undefined;
  set(key: string, value: zarr.Chunk<zarr.DataType>): void;
}

const withChunkCache = zarr.defineArrayExtension(
  (array, extOptions: { cache: ChunkCache }) => ({
    async getChunk(coords, options) {
      let key = coords.join(",");
      let hit = extOptions.cache.get(key);
      if (hit) return hit;
      let chunk = await array.getChunk(coords, options);
      extOptions.cache.set(key, chunk);
      return chunk;
    },
  }),
);


export async function openZarrArray(config: ArrayProps, cacheSize: number = 54): Promise<Array> {
  // Allocate a bounded cache instance
  const chunkCache = new QuickLRU<string, zarr.Chunk<zarr.DataType>>({ maxSize: cacheSize });
  const chunkCacheRange = new QuickLRU<string, zarr.Chunk<zarr.DataType>>({ maxSize: cacheSize });
  const chunkCacheRangeTime = new QuickLRU<string, zarr.Chunk<zarr.DataType>>({ maxSize: cacheSize });

  let rootUrl = config.url;
  if (!config.url.startsWith("http")) {
    rootUrl = new URL(config.url, window.location.origin).href;
  }

  const store = new zarr.FetchStore(rootUrl);
  const arr = await zarr.extendArray(
    await zarr.open(store, { kind: "array" }),
    // Pass the QuickLRU instance instead of a plain Map
    (a) => withChunkCache(a, { cache: chunkCache }),
  );

  const storeRange = new zarr.FetchStore(rootUrl + "_Range");
  const rangeArr = await zarr.extendArray(
    await zarr.open(storeRange, { kind: "array" }),
    // Pass the QuickLRU instance instead of a plain Map
    (a) => withChunkCache(a, { cache: chunkCacheRange }),
  );

  const storeRangeTime = new zarr.FetchStore(rootUrl + "_RangeTime");
  const rangeTimeArr = await zarr.extendArray(
    await zarr.open(storeRangeTime, { kind: "array" }),
    // Pass the QuickLRU instance instead of a plain Map
    (a) => withChunkCache(a, { cache: chunkCacheRangeTime }),
  );

  return new Array(config, { arr, rangeArr, rangeTimeArr });
}
