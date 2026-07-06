import { PixelField, type PixelProps } from "./pixel-field";
import { getLonLatArray } from "../../projection";
import { getPixelNativeUtils, isPreriodicLon } from "./pixel-utils";
import equal from "fast-deep-equal";
import type { LonAxis } from "../dataset";
import { logger as _logger } from "../../logger";

const logger = _logger.child({ module: "interpPixel" });

export async function interpPixel(
  props: PixelProps,
  signal: AbortSignal,
): Promise<PixelField> {
  if (equal(props.projectorState.type, props.gridProj)) {
    logger.debug("Using native projection");
    return await interpPixelNative(props, signal);
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
  const lon0 = props.lonAxis.corners.lb;
  const lon1 = props.lonAxis.corners.rt;
  const nlon = props.lonAxis.count;
  const dlon = (lon1 - lon0) / nlon;

  const lat0 = props.latAxis.corners.lb;
  const lat1 = props.latAxis.corners.rt;
  const nlat = props.latAxis.count;
  const dlat = (lat1 - lat0) / nlat;

  const xwrap = isPreriodicLonAxis(props.lonAxis);
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
      if (Number.isNaN(lon)) {
        pixelFieldArray[y * width + x] = NaN;
        continue;
      }
      const [xg, yg] = getGridIndex([lon!, lat!]);
      const value = grid.interpolateBilinear(xg, yg, xwrap);
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
  return new PixelField(props, { array: pixelFieldArray, range: [min, max] });

  function getGridIndex(coord: [number, number]): [number, number] {
    if (coord[0] < lon0) {
      coord[0] += 360;
    }
    const xg = (coord[0] - lon0) / dlon;
    const yg = (coord[1] - lat0) / dlat;
    return [xg, yg];
  }
}

function isPreriodicLonAxis(lonAxis: LonAxis): boolean {
  const lon0: number = lonAxis.corners.lb;
  const nlon: number = lonAxis.count;
  const dlon: number = (lonAxis.corners.rt - lon0 + 1) / nlon;
  return isPreriodicLon({ lon0: lon0, nlon: nlon, dlon: dlon });
}

export async function interpPixelNative(
  props: PixelProps,
  signal: AbortSignal,
): Promise<PixelField> {
  const viewWidth = props.projectorState.viewSize[0]; // Canvas width
  const viewHeight = props.projectorState.viewSize[1]; // Canvas height
  const utils = getPixelNativeUtils(props);
  const grid = props.grid;
  const pixelFieldArray = new Float32Array(viewHeight * viewWidth);
  let lastYieldTime = performance.now();
  const { x0, x1, y0, y1 } = utils.canvasGridBounds();
  let min = Infinity;
  let max = -Infinity;
  for (let py = y0; py <= y1; py++) {
    signal.throwIfAborted();
    for (let px = x0; px <= x1; px += 1) {
      const point = utils.canvasToGrid(px, py);
      const value = grid.interpolateBilinear(point[0], point[1], false);
      pixelFieldArray[py * viewWidth + px] = value;
      if (!Number.isNaN(value)) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }
  return new PixelField(props, { array: pixelFieldArray, range: [min, max] });
}
