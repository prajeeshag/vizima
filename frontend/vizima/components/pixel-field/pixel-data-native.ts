import { Agent, Provider } from "../types";
import { PixelData, type PixelConfig } from "./pixel-data";

export type PixelNativeConfig = {
  readonly gridStartPoint: [number, number];
  readonly gridEndPoint: [number, number];
  readonly gridSize: [number, number];
} & PixelConfig;

/*
 * PixelNative class represents a pixel data where
 * the pixel projection and grid projection are same.
 */
export class PixelNative extends PixelData<PixelNativeConfig> {}

export class PixelNativeAgent extends Agent<PixelNativeConfig, PixelNative> {}

export class PixelNativeProvider extends Provider<
  PixelNativeConfig,
  PixelNative
> {}
