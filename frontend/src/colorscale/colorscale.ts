import * as d3 from "d3-scale";
import * as chromatic from "d3-scale-chromatic";
import type { Grid } from "../components/grid-data";
import type { PixelField } from "../components/pixel-field";
import type { DataVarMeta } from "../components/dataset";

export const PALETTES = {
  // sequential
  viridis: { kind: "sequential", interpolate: chromatic.interpolateViridis },
  plasma: { kind: "sequential", interpolate: chromatic.interpolatePlasma },
  inferno: { kind: "sequential", interpolate: chromatic.interpolateInferno },
  cividis: { kind: "sequential", interpolate: chromatic.interpolateCividis },

  // diverging
  rdBu: { kind: "diverging", interpolate: chromatic.interpolateRdBu },
  brBG: { kind: "diverging", interpolate: chromatic.interpolateBrBG },

  // cyclic
  sinebow: { kind: "cyclic", interpolate: chromatic.interpolateSinebow },
  rainbow: { kind: "cyclic", interpolate: chromatic.interpolateRainbow },

  // categorical
  tableau10: { kind: "categorical", colors: chromatic.schemeTableau10 },
  set2: { kind: "categorical", colors: chromatic.schemeSet2 },
} as const;

export type PaletteName = keyof typeof PALETTES;
type PaletteKind<N extends PaletteName> = (typeof PALETTES)[N]["kind"];

type DomainFnProps = {
  grid: Grid;
  pixelField: PixelField;
  gridMeta: DataVarMeta;
};

type DomainFnByKind = {
  sequential: (props: DomainFnProps) => [number, number];
  diverging: (props: DomainFnProps) => [number, number, number];
  cyclic: (props: DomainFnProps) => [number, number];
  categorical: (props: DomainFnProps) => number[];
};

type DomainFnForKind<K extends keyof DomainFnByKind> = DomainFnByKind[K];

type ColorScaleBase = {
  name: PaletteName;
  reverse: boolean;
  clamp: boolean;
};

export type ColorScaleDynamic<N extends PaletteName = PaletteName> =
  ColorScaleBase & {
    domain: DomainFnForKind<PaletteKind<N>>;
  };

export type ColorScaleStatic = ColorScaleBase & {
  domain: number[];
};

export function defineColorScale<N extends PaletteName>(
  spec: ColorScaleDynamic<N>,
): ColorScaleDynamic<N> {
  return spec;
}

export function buildColorScale<N extends PaletteName>(
  spec: ColorScaleDynamic<N>,
  props: DomainFnProps,
): ColorScaleStatic {
  const domain = spec.domain(props);
  return {
    ...spec,
    domain,
  };
}

export function createColorScale(spec: ColorScaleStatic) {
  const palette = PALETTES[spec.name];

  // ---- categorical ----
  if (palette.kind === "categorical") {
    const colors = spec.reverse
      ? [...palette.colors].reverse()
      : palette.colors;

    return d3.scaleOrdinal<number, string>(colors).domain(spec.domain);
  }

  // ---- continuous ----
  const interp = spec.reverse
    ? (t: number) => palette.interpolate(1 - t)
    : palette.interpolate;

  let scale: d3.ScaleSequential<string> | d3.ScaleDiverging<string>;

  if (palette.kind === "diverging") {
    scale = d3
      .scaleDiverging(interp)
      .domain(spec.domain as [number, number, number]);
  } else {
    scale = d3.scaleSequential(interp).domain(spec.domain as [number, number]);
  }

  if (spec.clamp) scale.clamp(true);
  return scale;
}
