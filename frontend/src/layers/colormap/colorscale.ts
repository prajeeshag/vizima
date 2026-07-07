import * as d3 from "d3-scale";
import * as chromatic from "d3-scale-chromatic";
import type { PixelField } from "../../data/pixel-field";
import type { DataVarMeta } from "../../data/dataset";
import type { Expand } from "../../core/type-helpers";
import { Grid } from "../../data/dataset/grid";

export const PALETTES = {
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

export type DomainFnProps = {
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

function rangeGrid(props: DomainFnProps) {
  return props.grid.range;
}

function rangeGridT(props: DomainFnProps) {
  return props.grid.rangeTime;
}

function rangePixel(props: DomainFnProps): [number, number] {
  const range = props.pixelField.range;
  return [range[0], range[1]];
}

function crossesZero(range: [number, number]): boolean {
  return range[0] * range[1] < 0;
}

function rangeDiv(range: [number, number]): [number, number, number] {
  if (crossesZero(range)) {
    return [range[0], 0, range[1]];
  }
  const avg = (range[0] + range[1]) / 2;
  return [range[0], avg, range[1]];
}

function rangeGridDiv(props: DomainFnProps): [number, number, number] {
  const range = props.grid.range;
  return rangeDiv(range);
}

function rangeGridTDiv(props: DomainFnProps): [number, number, number] {
  const range = props.grid.rangeTime;
  return rangeDiv(range);
}

function rangePixelDiv(props: DomainFnProps): [number, number, number] {
  const range = props.pixelField.range;
  return rangeDiv([...range]);
}

export const SEQUENTIAL_DOMAIN_FNS = {
  grid_range: rangeGrid,
  grid_time_range: rangeGridT,
  pixel_range: rangePixel,
} satisfies Record<string, DomainFnByKind["sequential"]>;

export const DIVERGING_DOMAIN_FNS = {
  grid_range: rangeGridDiv,
  grid_time_range: rangeGridTDiv,
  pixel_range: rangePixelDiv,
} satisfies Record<string, DomainFnByKind["diverging"]>;

export const DOMAINS_FNS_PARAMS: Record<
  string,
  { label: string; tooltip: string }
> = {
  grid_range: {
    label: "grid range",
    tooltip: "Min and Max of grid field",
  },
  grid_time_range: {
    label: "grid time range",
    tooltip: "Min and Max of grid field over all time",
  },
  pixel_range: {
    label: "pixel range",
    tooltip: "Min and Max of pixel field",
  },
};

export const CATEGORICAL_DOMAIN_FNS = {
  categories: (props: DomainFnProps): number[] => {
    return [];
  },
} satisfies Record<string, DomainFnByKind["categorical"]>;

export const DOMAIN_FNS: {
  [K in keyof DomainFnByKind]: Record<string, DomainFnByKind[K]>;
} = {
  sequential: SEQUENTIAL_DOMAIN_FNS,
  diverging: DIVERGING_DOMAIN_FNS,
  cyclic: SEQUENTIAL_DOMAIN_FNS,
  categorical: CATEGORICAL_DOMAIN_FNS,
} as const;

type DomainFnKeyByKind = {
  [K in keyof typeof DOMAIN_FNS]: keyof (typeof DOMAIN_FNS)[K];
};

type DomainKeyForPalette<N extends PaletteName> =
  DomainFnKeyByKind[PaletteKind<N>];

type ColorScaleBase = {
  name: PaletteName;
  reverse: boolean;
  clamp: boolean;
};

export type ColorScaleDynamic<N extends PaletteName = PaletteName> =
  ColorScaleBase & {
    domain: DomainKeyForPalette<N>;
  };

export type ColorScaleStatic = Expand<
  ColorScaleBase & {
    domain: number[];
  }
>;

function resolveDomainFn<N extends PaletteName>(scale: ColorScaleDynamic<N>) {
  const kind = PALETTES[scale.name].kind;
  return DOMAIN_FNS[kind][scale.domain];
}

export function defineColorScale<N extends PaletteName>(
  spec: ColorScaleDynamic<N>,
): ColorScaleDynamic<N> {
  return spec;
}

export function buildColorScale<N extends PaletteName>(
  spec: ColorScaleDynamic<N>,
  props: DomainFnProps,
): ColorScaleStatic {
  const domainFn = resolveDomainFn(spec)!;
  return {
    ...spec,
    domain: domainFn(props),
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
