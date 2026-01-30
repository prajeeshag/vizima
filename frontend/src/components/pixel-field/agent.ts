import { Agent, Provider } from "../types";
import { PixelProduct, type PixelConfig } from "./product";
import { interpPixel } from "./interp-pixel";

export class PixelAgent extends Agent<PixelConfig, PixelProduct> {}
export class PixelProvider extends Provider<PixelConfig, PixelProduct> {}

const pixelProvider = new PixelProvider(interpPixel);

export const createPixelAgent = () => {
  return new PixelAgent(pixelProvider);
};
