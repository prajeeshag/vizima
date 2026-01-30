import { PixelProduct, type PixelConfig } from "./product";
import { getProjector } from "../projection";
import { getPixelNativeUtils, isPreriodicLon } from "./pixel-utils";
import equal from "fast-deep-equal";
import type { LonAxis } from "../dataset";
import { logger as _logger } from "../../logger";

const logger = _logger.child({ module: "interpPixel" });

export async function interpPixel(
  props: PixelConfig,
  signal: AbortSignal,
): Promise<PixelProduct> {
  if (equal(props.grid.props.proj.type, props.grid.props.gridProj)) {
    logger.info("Using native projection");
    return await interpPixelNative(props, signal);
  }
  return await interpPixelProjected(props, signal);
}

export async function interpPixelProjected(
  props: PixelConfig,
  signal: AbortSignal,
): Promise<PixelProduct> {
  const width = props.grid.props.viewSize[0];
  const height = props.grid.props.viewSize[1];
  const proj = getProjector(props.grid.props.proj);
  const mask = createMask();

  const gridValue = props.grid.value;
  const pixelFieldArray = new Float32Array(width * height);

  let lastYieldTime = performance.now();
  for (let y = 0; y < height; y += 1) {
    if (signal.aborted) throw new Error("Aborted");
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      const point = proj.invert!([x, y]);
      const value = gridValue.interpolateBilinear(
        point![0],
        point![1],
        isPreriodicLonAxis(props.grid.props.lonAxis),
      );
      pixelFieldArray[y * width + x] = value;
    }

    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }
  return new PixelProduct(props, pixelFieldArray);

  function createMask() {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is null!");
    }
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    proj.geoPath(ctx)({ type: "Sphere" });
    ctx.fill();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const mask = new Uint8Array(canvas.width * canvas.height);

    for (let i = 0; i < mask.length; i++) {
      mask[i] = pixels[i * 4 + 3]! > 0 ? 1 : 0;
    }

    return mask;
  }
}

function isPreriodicLonAxis(lonAxis: LonAxis): boolean {
  const lon0: number = lonAxis.corners.lb;
  const nlon: number = lonAxis.count;
  const dlon: number = (lonAxis.corners.rt - lon0 + 1) / nlon;
  return isPreriodicLon({ lon0: lon0, nlon: nlon, dlon: dlon });
}

export async function interpPixelNative(
  props: PixelConfig,
  signal: AbortSignal,
): Promise<PixelProduct> {
  const viewWidth = props.grid.props.viewSize[0]; // Canvas width
  const viewHeight = props.grid.props.viewSize[1]; // Canvas height
  const utils = getPixelNativeUtils(props.grid.props);
  const gridValue = props.grid.value;
  const pixelFieldArray = new Float32Array(viewHeight * viewWidth);
  let lastYieldTime = performance.now();
  const { x0, x1, y0, y1 } = utils.canvasGridBounds();

  for (let py = y0; py <= y1; py++) {
    if (signal.aborted) throw new Error("Aborted");
    for (let px = x0; px <= x1; px += 1) {
      const point = utils.canvasToGrid(px, py);
      const value = gridValue.interpolateBilinear(point[0], point[1], false);
      pixelFieldArray[py * viewWidth + px] = value;
    }

    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }

  return new PixelProduct(props, pixelFieldArray);
}
