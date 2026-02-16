import { DataClient, CachingCompute } from "../types";
import { PixelField, type PixelProps, pixelPropKeys } from "./pixel-field";
import { interpPixel } from "./interp-pixel";

export class PixelAgent extends DataClient<PixelProps, PixelField> {}

export class PixelProvider extends CachingCompute<
  PixelProps,
  PixelField,
  typeof pixelPropKeys
> {}

const pixelProvider = new PixelProvider(interpPixel, pixelPropKeys);

export const createPixelAgent = () => {
  return new PixelAgent(pixelProvider);
};
