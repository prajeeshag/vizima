import * as d3 from "d3-scale";
import * as chromatic from "d3-scale-chromatic";
import * as metbrewer from "../../../colorPalettes/metbrewer";
import type { PixelField } from "../../pixel-field";
import type { DataVarMeta } from "../../dataset";
import type { Expand } from "../../../type-helpers";

export const PALETTES = {
  // sequential
  Archambault: {
    kind: "sequential",
    interpolate: metbrewer.interpolateArchambault,
  },
  Austria: {
    kind: "sequential",
    interpolate: metbrewer.interpolateAustria,
  },
  Turbo: { kind: "sequential", interpolate: chromatic.interpolateTurbo },
  Viridis: { kind: "sequential", interpolate: chromatic.interpolateViridis },
  Plasma: { kind: "sequential", interpolate: chromatic.interpolatePlasma },
  Magma: { kind: "sequential", interpolate: chromatic.interpolateMagma },
  Inferno: { kind: "sequential", interpolate: chromatic.interpolateInferno },
  Cividis: { kind: "sequential", interpolate: chromatic.interpolateCividis },
  Warm: { kind: "sequential", interpolate: chromatic.interpolateWarm },
  Cool: { kind: "sequential", interpolate: chromatic.interpolateCool },
  Cubehelix: {
    kind: "sequential",
    interpolate: chromatic.interpolateCubehelixDefault,
  },
  BuGn: { kind: "sequential", interpolate: chromatic.interpolateBuGn },
  BuPu: { kind: "sequential", interpolate: chromatic.interpolateBuPu },
  GnBu: { kind: "sequential", interpolate: chromatic.interpolateGnBu },
  OrRd: { kind: "sequential", interpolate: chromatic.interpolateOrRd },
  PuBuGn: { kind: "sequential", interpolate: chromatic.interpolatePuBuGn },
  PuRd: { kind: "sequential", interpolate: chromatic.interpolatePuRd },
  RdPu: { kind: "sequential", interpolate: chromatic.interpolateRdPu },
  YlGnBu: { kind: "sequential", interpolate: chromatic.interpolateYlGnBu },
  YlOrBr: { kind: "sequential", interpolate: chromatic.interpolateYlOrBr },
  YlOrRd: { kind: "sequential", interpolate: chromatic.interpolateYlOrRd },
  YlGn: { kind: "sequential", interpolate: chromatic.interpolateYlGn },
  Blues: { kind: "sequential", interpolate: chromatic.interpolateBlues },
  Greens: { kind: "sequential", interpolate: chromatic.interpolateGreens },
  Greys: { kind: "sequential", interpolate: chromatic.interpolateGreys },
  Oranges: { kind: "sequential", interpolate: chromatic.interpolateOranges },
  Reds: { kind: "sequential", interpolate: chromatic.interpolateReds },
  Purples: { kind: "sequential", interpolate: chromatic.interpolatePurples },

  RdBu: { kind: "diverging", interpolate: chromatic.interpolateRdBu },
  BrBG: { kind: "diverging", interpolate: chromatic.interpolateBrBG },
  PiYG: { kind: "diverging", interpolate: chromatic.interpolatePiYG },
  PRGn: { kind: "diverging", interpolate: chromatic.interpolatePRGn },
  RdYlGn: { kind: "diverging", interpolate: chromatic.interpolateRdYlGn },
  RdYlBu: { kind: "diverging", interpolate: chromatic.interpolateRdYlBu },
  Spectral: { kind: "diverging", interpolate: chromatic.interpolateSpectral },

  sinebow: { kind: "cyclic", interpolate: chromatic.interpolateSinebow },
  rainbow: { kind: "cyclic", interpolate: chromatic.interpolateRainbow },

  tableau10: { kind: "categorical", colors: chromatic.schemeTableau10 },
  set2: { kind: "categorical", colors: chromatic.schemeSet2 },
} as const;

export type PaletteName = keyof typeof PALETTES;
type PaletteKind<N extends PaletteName> = (typeof PALETTES)[N]["kind"];

type DomainFnProps = {
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

export type ColorScaleStatic = Expand<
  ColorScaleBase & {
    domain: number[];
  }
>;

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
