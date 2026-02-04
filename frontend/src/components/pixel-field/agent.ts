import { DataClient, CachingCompute } from "../types";
import { PixelField, type PixelConfig } from "./pixel-field";
import { interpPixel } from "./interp-pixel";

export class PixelAgent extends DataClient<PixelConfig, PixelField> {}
export class PixelProvider extends CachingCompute<PixelConfig, PixelField> {}

const pixelProvider = new PixelProvider(interpPixel);

export const createPixelAgent = () => {
  return new PixelAgent(pixelProvider);
};
