import type { PixelField } from "../components/pixel-field";
import { logger } from "../logger";
import { randomInt } from "d3-random";
import type { Animator } from "./animator";
import { getProjector, type ProjectorState } from "../components/projection";

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

  for (var j = 45; j <= 255; j += step) {
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
  const [nx, ny] = fld.viewSize;
  const data = fld.value;

  let x0 = nx,
    x1 = -1;
  let y0 = ny,
    y1 = -1;

  for (let y = 0; y < ny; y++) {
    const rowOffset = y * nx;
    for (let x = 0; x < nx; x++) {
      const v = data.array[rowOffset + x];
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

export type FlowAnimator = Animator & {
  updateFields: (fields: { ufield: PixelField; vfield: PixelField }) => void;
};

const PARTICLE_LINE_WIDTH = 1;
const FADE_FILL_STYLE = "rgba(0, 0, 0, 0.97)";
const VELOCITY_SCALE = 1 / 16000;

type FlowAnimatorProps = {
  readonly ufield: PixelField;
  readonly vfield: PixelField;
  readonly colorScaleSteps?: number;
  readonly particleCountFactor?: number;
  readonly particleMaxAge?: number;
  readonly fps?: number;
};

export function createFlowAnimator({
  ufield,
  vfield,
  colorScaleSteps = 5,
  particleCountFactor = 6,
  particleMaxAge = 120,
  fps = 25,
}: FlowAnimatorProps): FlowAnimator {
  let rafId: number | null = null;
  let lastFrameTime: number | null = null;
  let ctxRef: CanvasRenderingContext2D | null = null;
  let numFrames = 0;

  const log = logger.child({ component: "FlowAnimator" });

  let ufld = ufield;
  let vfld = vfield;

  let maxWind = -Infinity;
  for (let i = 0; i < ufld.value.array.length; i++) {
    const u = ufld.value.array[i]!;
    const v = vfld.value.array[i]!;
    if (Number.isNaN(u) || Number.isNaN(v)) continue;
    const speed = Math.sqrt(u * u + v * v);
    if (speed > maxWind) maxWind = speed;
  }

  const randomAge = randomInt(0, particleMaxAge);
  const colorScale = windSpeedColorScale(colorScaleSteps, Math.floor(maxWind));

  const frameInterval = 1000 / fps;

  const particles: Particle[] = [];
  const buckets: Particle[][] = colorScale.colors.map(() => []);
  let projector = getProjector(ufld.props.projectorState);
  let extent = extentNonNaN(ufld);

  const animator = {
    animate,
    start,
    stop,
    destroy,
    updateFields,
  };

  if (!extent) {
    log.warn("No valid extent found");
    return animator;
  }
  let randomPos = createRandomPoints(extent);
  const extentWidth = extent[0][1] - extent[0][0];
  const extentHeight = extent[1][1] - extent[1][0];
  const extentScale = Math.sqrt(extentWidth * extentHeight);

  const particleCount = Math.floor(particleCountFactor * extentScale);
  const velocityScale = extentScale * VELOCITY_SCALE;

  for (let i = 0; i < particleCount; i++) {
    particles.push(initParticle());
  }
  return animator;

  function animate(htmlCanvas: HTMLCanvasElement) {
    stop();
    htmlCanvas.width = ufld.viewSize[0];
    htmlCanvas.height = ufld.viewSize[1];
    ctxRef = htmlCanvas.getContext("2d");
    if (!ctxRef) {
      log.warn("Failed to get canvas context");
      return;
    }
    ctxRef.clearRect(0, 0, htmlCanvas.width, htmlCanvas.height);
    start();
  }

  function start() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function destroy() {
    stop();
    particles.length = 0;
    buckets.forEach((b) => (b.length = 0));
  }

  function updateFields(fields: { ufield: PixelField; vfield: PixelField }) {
    ufld = fields.ufield;
    vfld = fields.vfield;

    extent = extentNonNaN(ufld);
    if (!extent) {
      return;
    }
    randomPos = createRandomPoints(extent);
    projector = getProjector(ufld.props.projectorState);
  }

  function frame(currentTime: number) {
    if (!ctxRef) return;
    if (
      lastFrameTime === null ||
      currentTime - lastFrameTime >= frameInterval
    ) {
      evolve();
      draw(ctxRef);
      lastFrameTime = currentTime;
      numFrames++;
    }
    rafId = requestAnimationFrame(frame);
  }

  function evolve() {
    buckets.forEach(function (bucket) {
      bucket.length = 0;
    });
    particles.forEach((particle) => {
      if (particle.age > particleMaxAge) resetParticle(particle);
      const x: number = particle.x;
      const y: number = particle.y;
      const v: [number, number, number] = getWind(x, y);

      if (isNaN(v[2])) {
        particle.age = particleMaxAge;
      } else {
        const m = v[2];
        const xt = x + v[0];
        const yt = y + v[1];
        if (ufld.isDefined(xt, yt)) {
          // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
          particle.xt = xt;
          particle.yt = yt;
          buckets[colorScale.indexFor(m)]!.push(particle);
        } else {
          // Particle isn't visible, will get reinitialized in the next frame.
          particle.x = xt;
          particle.y = yt;
        }
      }
      particle.age++;
    });
  }

  function draw(g: CanvasRenderingContext2D) {
    // Fade existing particle trails.
    g.lineWidth = PARTICLE_LINE_WIDTH;
    g.fillStyle = FADE_FILL_STYLE;
    const prev = g.globalCompositeOperation;
    g.globalCompositeOperation = "destination-in";
    g.fillRect(0, 0, ufld.viewSize[0], ufld.viewSize[1]);
    g.globalCompositeOperation = prev;

    buckets.forEach((bucket, i) => {
      if (bucket.length > 0) {
        g.beginPath();
        g.strokeStyle = colorScale.colors[i]!;
        bucket.forEach(function (particle) {
          g.moveTo(particle.x, particle.y);
          g.lineTo(particle.xt, particle.yt);
          particle.x = particle.xt;
          particle.y = particle.yt;
        });
        g.stroke();
        // debugger;
      }
    });
  }

  function resetParticle(particle: Particle) {
    const p = initParticle();
    particle.x = p.x;
    particle.y = p.y;
    particle.xt = p.xt;
    particle.yt = p.yt;
    particle.age = p.age;
  }

  function initParticle(): Particle {
    const pos = randomPos();
    const maxIter = 10;
    for (let iter = 0; iter < maxIter; iter++) {
      if (ufld.isDefined(pos[0], pos[1])) break;
      [pos[0], pos[1]] = randomPos();
    }
    const age = randomAge();
    return { x: pos[0], y: pos[1], xt: pos[0], yt: pos[1], age: age };
  }

  function getWind(x: number, y: number): [number, number, number] {
    const u = ufld.get(x, y);
    const v = vfld.get(x, y);
    const isNaN = Number.isNaN;
    if (isNaN(u) || isNaN(v)) return [NaN, NaN, NaN];
    if (anyNeighborIsNaN(x, y)) return [NaN, NaN, NaN];
    const d = distortion(x, y);
    const mag = Math.sqrt(u * u + v * v);
    const uval = (d[0] * u + d[2] * v) * velocityScale;
    const vval = (d[1] * u + d[3] * v) * velocityScale;
    return [uval, vval, mag];
  }

  function anyNeighborIsNaN(x: number, y: number): boolean {
    const isNaN = Number.isNaN;
    return (
      isNaN(ufld.get(x + 1, y)) ||
      isNaN(ufld.get(x - 1, y)) ||
      isNaN(ufld.get(x, y + 1)) ||
      isNaN(ufld.get(x, y - 1)) ||
      isNaN(ufld.get(x + 1, y + 1)) ||
      isNaN(ufld.get(x + 1, y - 1)) ||
      isNaN(ufld.get(x - 1, y + 1)) ||
      isNaN(ufld.get(x - 1, y - 1))
    );
  }

  function distortion(x: number, y: number): [number, number, number, number] {
    const H = 0.000036;
    const [lon, lat] = projector.invert([x, y])!;
    const plon = projector.project([lon + H, lat])!;
    const plat = projector.project([lon, lat + H])!;

    // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1° λ
    // changes depending on φ. Without this, there is a pinching effect at the poles.
    const k = Math.cos((lat / 180) * Math.PI);

    const d1 = plon[0] - x;
    const d2 = plon[1] - y;
    const d3 = plat[0] - x;
    const d4 = plat[1] - y;
    return [d1 / H / k, d2 / H / k, d3 / H, d4 / H];
  }
}
