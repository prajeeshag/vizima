import { DataClient, CachingCompute } from "../types";
import { PixelField, type PixelProps } from "./pixel-field";
import { interpPixel } from "./interp-pixel";

export class PixelAgent extends DataClient<PixelProps, PixelField> {}
export class PixelProvider extends CachingCompute<PixelProps, PixelField> {}

const pixelProvider = new PixelProvider(interpPixel);

export const createPixelAgent = () => {
  return new PixelAgent(pixelProvider);
};
