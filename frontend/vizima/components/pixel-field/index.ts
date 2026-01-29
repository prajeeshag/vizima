export * from "./pixel-data-projected";
export * from "./pixel-data-native";
export * from "./interpolate-pixel-native";
export * from "./interpolate-pixel-projected";
export * from "./pixel-data";

import {
  PixelNativeAgent,
  PixelNativeProvider,
  PixelProjectedAgent,
  PixelProjectedProvider,
  interpPixelNative,
  interpPixelProjected,
} from ".";

const CACHE_SIZE = 1;
const pixelProjectedProvider = new PixelProjectedProvider(
  interpPixelProjected,
  CACHE_SIZE,
);

function getPixelProjectedAgent(): PixelProjectedAgent {
  return new PixelProjectedAgent(pixelProjectedProvider);
}

const pixelNativeProvider = new PixelNativeProvider(
  interpPixelNative,
  CACHE_SIZE,
);

function getPixelNativeAgent(): PixelNativeAgent {
  return new PixelNativeAgent(pixelNativeProvider);
}
