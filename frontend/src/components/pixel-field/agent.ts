import { DataClient, CachingCompute } from "../types";
import { PixelField, type PixelProps, pixelPropKeys } from "./pixel-field";
import { interpPixel } from "./interp-pixel";

export class PixelAgent extends DataClient<PixelProps, PixelField> {}

export class PixelProvider extends CachingCompute<
  PixelProps,
  PixelField,
  typeof pixelPropKeys
> {}

export const createPixelProvider = (cacheSize: number = 1) => {
  return new PixelProvider(interpPixel, pixelPropKeys, {
    maxCacheSize: cacheSize,
  });
};

export const createPixelAgent = (pixelProvider?: PixelProvider | undefined) => {
  pixelProvider =
    pixelProvider || new PixelProvider(interpPixel, pixelPropKeys);
  return new PixelAgent(pixelProvider);
};
