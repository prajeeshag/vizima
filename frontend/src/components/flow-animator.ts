import { CachedResult } from "./types";
import type { PixelField } from "./pixel-field";
import { logger } from "../logger";
import { randomInt } from "d3-random";

type FlowAnimatorProps = {
  readonly ufld: PixelField;
  readonly vfld: PixelField;
  readonly sfld: PixelField;
  readonly viewSize: [number, number];
  readonly maxWind: number;
  readonly colorScaleSteps?: number;
  readonly particleCountFactor?: number;
  readonly maxAge?: number;
  readonly frameRate?: number;
  readonly particleLineWidth?: number;
};

const COLOR_SCALE_STEPS = 10;
const PARTICLE_COUNT_FACTOR = 7;
const PARTICLE_MAX_AGE = 100;
const PARTICLE_LINE_WIDTH = 1;
const FADE_FILL_STYLE = "rgba(0, 0, 0, 0.97)";
const FRAME_RATE = 40;

type Particle = {
  x: number;
  y: number;
  xt: number;
  yt: number;
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

export class FlowAnimator extends CachedResult<FlowAnimatorProps, null> {
  private readonly logger = logger.child({ component: "FlowAnimator" });
  private particles: Particle[] = [];
  private buckets: Particle[][];
  private readonly randomPos: (() => [number, number]) | null;
  private readonly randomAge: () => number;
  private readonly particleMaxAge: number;
  private readonly colorScale: IntensityColorScale;
  private readonly particleCount: number;

  constructor(props: FlowAnimatorProps) {
    super(props, null);
    this.particleMaxAge = this.props.maxAge || PARTICLE_MAX_AGE;
    const extent = extentNonNaN(this.props.ufld);
    this.randomPos = extent ? createRandomPoints(extent) : null;
    this.randomAge = randomInt(0, this.particleMaxAge);
    this.colorScale = windSpeedColorScale(
      this.props.colorScaleSteps || COLOR_SCALE_STEPS,
      this.props.maxWind,
    );
    const particleCountFactor =
      this.props.particleCountFactor || PARTICLE_COUNT_FACTOR;

    this.particleCount = Math.floor(
      particleCountFactor * this.props.ufld.viewSize[0],
    );

    this.buckets = this.colorScale.colors.map(() => []);

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.initParticle());
    }
  }

  async animate(ctx: CanvasRenderingContext2D, signal: AbortSignal) {
    if (!this.randomPos) {
      this.logger.warn("No valid extent found");
      return;
    }

    let lastFrameTime = performance.now();
    const frameInterval = this.props.frameRate || FRAME_RATE;

    return new Promise<void>((resolve) => {
      const frame = (currentTime: number) => {
        if (signal.aborted) {
          this.logger.debug("Animation aborted");
          resolve();
          return;
        }

        const deltaTime = currentTime - lastFrameTime;

        if (deltaTime >= frameInterval) {
          this.evolve();
          this.draw(ctx);
          lastFrameTime = currentTime;
        }

        requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    });
  }

  private evolve() {
    this.buckets.forEach(function (bucket) {
      bucket.length = 0;
    });
    this.particles.forEach((particle) => {
      if (particle.age > this.particleMaxAge) this.resetParticle(particle);
      const x: number = particle.x;
      const y: number = particle.y;
      const v: [number, number, number] = [
        this.props.ufld.get(x, y),
        this.props.vfld.get(x, y),
        this.props.sfld.get(x, y),
      ];

      if (isNaN(v[2])) {
        particle.age = this.particleMaxAge;
      } else {
        const m = v[2];
        const xt = x + v[0];
        const yt = y + v[1];
        if (this.props.ufld.isDefined(xt, yt)) {
          // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
          particle.xt = xt;
          particle.yt = yt;
          this.buckets[this.colorScale.indexFor(m)]!.push(particle);
        } else {
          // Particle isn't visible, will get reinitialized in the next frame.
          particle.x = xt;
          particle.y = yt;
        }
      }
      particle.age++;
    });
  }

  private draw(g: CanvasRenderingContext2D) {
    // Fade existing particle trails.
    g.lineWidth = PARTICLE_LINE_WIDTH;
    g.fillStyle = FADE_FILL_STYLE;
    const prev = g.globalCompositeOperation;
    g.globalCompositeOperation = "destination-in";
    g.fillRect(0, 0, this.props.viewSize[0], this.props.viewSize[1]);
    g.globalCompositeOperation = prev;

    this.buckets.forEach((bucket, i) => {
      if (bucket.length > 0) {
        g.beginPath();
        g.strokeStyle = this.colorScale.colors[i]!;
        bucket.forEach(function (particle) {
          g.moveTo(particle.x, particle.y);
          g.lineTo(particle.xt, particle.yt);
          particle.x = particle.xt;
          particle.y = particle.yt;
        });
        g.stroke();
      }
    });
  }

  private resetParticle(particle: Particle) {
    const p = this.initParticle();
    particle.x = p.x;
    particle.y = p.y;
    particle.xt = p.xt;
    particle.yt = p.yt;
    particle.age = 0;
  }

  private initParticle(): Particle {
    const pos = this.randomPos!();
    const maxIter = 10;
    let iter = 0;
    while (!this.props.ufld.isDefined(pos[0], pos[1]) || iter++ > maxIter) {
      const [x, y] = this.randomPos!();
      pos[0] = x;
      pos[1] = y;
    }
    const age = this.randomAge();
    return { x: pos[0], y: pos[1], xt: pos[0], yt: pos[1], age: age };
  }
}

export function createFlowAnimator(props: FlowAnimatorProps) {
  return new FlowAnimator(props);
}
