import type { ProjConfig } from "../globe/proj";
import { Agent, Provider } from "../../datatype/types";
import { PixelData, type PixelConfig } from "./pixel-data";

export type PixelProjectedConfig = {
  readonly proj: ProjConfig;
  readonly lon0: number;
  readonly lat0: number;
  readonly nlon: number;
  readonly nlat: number;
  readonly dlon: number;
  readonly dlat: number;
} & PixelConfig;

export class PixelProjected extends PixelData<PixelProjectedConfig> {}

export class PixelProjectedAgent extends Agent<
  PixelProjectedConfig,
  PixelProjected
> {}

export class PixelProjectedProvider extends Provider<
  PixelProjectedConfig,
  PixelProjected
> {}
