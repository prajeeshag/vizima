import { PixelField, type PixelProps } from "./pixel-field";
import { getLonLatArray } from "../../projection";
import equal from "fast-deep-equal";
import { logger as _logger } from "../../logger";
import { SimpleAgent } from "../../core";

const logger = _logger.child({ module: "interpPixel" });


export function createPixelAgent() {
  return new SimpleAgent(interpPixel);
}

async function interpPixel(
  props: PixelProps,
  signal: AbortSignal,
): Promise<PixelField> {
  if (equal(props.projectorState.type, props.gridProj)) {
    logger.debug("Using native projection");
    throw new Error("Native projection not implemented yet");
    // return await interpPixelNative(props, signal);
  }
  logger.debug("Data on different projection");
  return await interpPixelProjected(props, signal);
}

export async function interpPixelProjected(
  props: PixelProps,
  signal: AbortSignal,
): Promise<PixelField> {
  const width = props.projectorState.viewSize[0];
  const height = props.projectorState.viewSize[1];
  const grid = props.grid;
  const pixelFieldArray = new Float32Array(width * height);
  let min = Infinity;
  let max = -Infinity;
  const { lons, lats } = getLonLatArray(props.projectorState);
  let lastYieldTime = performance.now();

  for (let y = 0; y < height; y += 1) {
    signal.throwIfAborted();
    for (let x = 0; x < width; x += 1) {
      const lon = lons[y * width + x];
      const lat = lats[y * width + x];

      if (lon === undefined || lat === undefined) {
        throw new Error(`Invalid longitude or latitude`);
      }
      if (Number.isNaN(lon)) {
        pixelFieldArray[y * width + x] = NaN;
        continue;
      }
      const value = grid.interpolateBilinear(lon, lat);
      // const value = grid.interpolateNearest(lon, lat);
      pixelFieldArray[y * width + x] = value;
      if (!Number.isNaN(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }

  return new PixelField(pixelFieldArray, [min, max], props.projectorState);
}

// export async function interpPixelNative(
//   props: PixelProps,
//   signal: AbortSignal,
// ): Promise<PixelField> {
//   const viewWidth = props.projectorState.viewSize[0]; // Canvas width
//   const viewHeight = props.projectorState.viewSize[1]; // Canvas height
//   const utils = getPixelNativeUtils(props);
//   const grid = props.grid;
//   const pixelFieldArray = new Float32Array(viewHeight * viewWidth);
//   let lastYieldTime = performance.now();
//   const { x0, x1, y0, y1 } = utils.canvasGridBounds();
//   let min = Infinity;
//   let max = -Infinity;
//   for (let py = y0; py <= y1; py++) {
//     signal.throwIfAborted();
//     for (let px = x0; px <= x1; px += 1) {
//       const point = utils.canvasToGrid(px, py);
//       const value = grid.interpolateBilinear(point[0], point[1], false);
//       pixelFieldArray[py * viewWidth + px] = value;
//       if (!Number.isNaN(value)) {
//         if (value < min) min = value;
//         if (value > max) max = value;
//       }
//     }

//     if (performance.now() - lastYieldTime > 16) {
//       await new Promise((resolve) => setTimeout(resolve, 0));
//       lastYieldTime = performance.now();
//     }
//   }
//   return new PixelField(pixelFieldArray, [min, max], [viewWidth, viewHeight]);
// }


export function fillNearestInPlace(
  data: Float32Array,
  mask: Float32Array,
  nx: number,
  ny: number,
): void {
  const n = nx * ny;

  const queue = new Int32Array(n);
  const visited = new Uint8Array(n);

  let head = 0;
  let tail = 0;

  // Initialize queue with valid source cells.
  for (let idx = 0; idx < n; idx++) {
    if (Number.isNaN(mask[idx])) {
      visited[idx] = 1; // barrier
    } else if (!Number.isNaN(data[idx])) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  }

  while (head < tail) {
    const idx = queue[head++]!;
    const value = data[idx]!;

    const i = idx % nx;
    const j = (idx / nx) | 0;

    if (i > 0) {
      const m = idx - 1;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }

    if (i + 1 < nx) {
      const m = idx + 1;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }

    if (j > 0) {
      const m = idx - nx;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }

    if (j + 1 < ny) {
      const m = idx + nx;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }
  }
}