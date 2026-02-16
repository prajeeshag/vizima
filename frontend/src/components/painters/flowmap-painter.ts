import { Painter } from "./painter";
import type { PixelField } from "../pixel-field";
import { logger } from "../../logger";
import { randomInt } from "d3-random";

type flowMapProps = {
  readonly ufld: PixelField;
  readonly vfld: PixelField;
  readonly maxWind: number;
  readonly colorScaleSteps?: number;
  readonly particleCountFactor?: number;
};

const COLOR_SCALE_STEPS = 10;
const PARTICLE_COUNT_FACTOR = 7;
const PARTICLE_MAX_AGE = 100;

type Particle = {
  x: number;
  y: number;
  age: number;
};

type IntensityColorScale = {
  colors: string[];
  indexFor(magnitude: number): number;
};

function asRGB(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

function windSpeedColorScale(
  step: number,
  maxWind: number,
): IntensityColorScale {
  const colors: string[] = [];

  for (var j = 85; j <= 255; j += step) {
    colors.push(asRGB(j, j, j, 1.0));
  }

  const indexFor = (m: number) => {
    return Math.floor((Math.min(m, maxWind) / maxWind) * (colors.length - 1));
  };

  return {
    colors,
    indexFor,
  };
}

export function extentNonNaN(
  fld: PixelField,
): [[number, number], [number, number]] | null {
  const [nx, ny] = fld.props.viewSize;
  const data = fld.value;

  let x0 = nx,
    x1 = -1;
  let y0 = ny,
    y1 = -1;

  for (let y = 0; y < ny; y++) {
    const rowOffset = y * nx;
    for (let x = 0; x < nx; x++) {
      const v = data[rowOffset + x];
      if (!Number.isNaN(v)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  return x1 === -1
    ? null
    : [
        [x0, x1],
        [y0, y1],
      ];
}

function createRandomPoints(
  extent: [[number, number], [number, number]],
): () => [number, number] {
  const [xMin, xMax] = extent[0];
  const [yMin, yMax] = extent[1];
  const xgen = randomInt(xMin, xMax + 1);
  const ygen = randomInt(yMin, yMax + 1);
  return () => [xgen(), ygen()];
}

export class flowMapPainter extends Painter<flowMapProps> {
  private readonly log = logger.child({ component: "flowMapPainter" });
  private particles: Particle[] = [];
  private buckets?: Particle[][];
  private field?: { u: Float32Array; v: Float32Array };
  private randomPoints?: () => [number, number];

  async draw(ctx: CanvasRenderingContext2D, signal: AbortSignal) {
    const extent = extentNonNaN(this.props.ufld);
    if (!extent) {
      this.log.warn("No valid extent found");
      return;
    }

    this.randomPoints = createRandomPoints(extent);
    this.setField(this.props.ufld, this.props.vfld);

    const colorScale = windSpeedColorScale(
      this.props.colorScaleSteps || COLOR_SCALE_STEPS,
      this.props.maxWind,
    );

    const particleCountFactor =
      this.props.particleCountFactor || PARTICLE_COUNT_FACTOR;

    const particleCount = Math.floor(
      particleCountFactor * this.props.ufld.viewSize[0],
    );

    this.buckets = colorScale.colors.map(() => []);
  }

  setField(u: PixelField, v: PixelField) {
    this.field = { u: u.value, v: v.value };
  }

  private initParticle(): Particle {
    const [x, y] = this.randomPoints!();

    const age = 0;
    return { x, y, age };
  }
}

export function createFlowMapPainter(props: flowMapProps) {
  return new flowMapPainter(props, null);
}
