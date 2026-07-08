import { PixelField } from "./pixel-field";

export function tInterpolatePixelField(
  p0: PixelField,
  p1: PixelField,
  alpha: number,
): PixelField {
  if (p0.viewSize[0] !== p1.viewSize[0] || p0.viewSize[1] !== p1.viewSize[1]) {
    throw new Error("Pixel fields must have the same dimensions");
  }
  const w0 = 1 - alpha;
  const w1 = alpha;
  const array = new Float32Array(p0.data.length);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < array.length; i++) {
    const v = p0.data[i]! * w0 + p1.data[i]! * w1;
    array[i] = v;
    if (!Number.isNaN(v)) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  return new PixelField(array, [min, max], p0.projectorState);
}
