import { describe, expect, it } from "bun:test";
import { PixelField } from "./pixel-field";
import { Grid } from "../grid";

// Minimal stubs for props that PixelField doesn't use in min/max/get
const gridStub = new Grid(
  { url: "stub", x0: 0, y0: 0, nx: 1, ny: 1 },
  { grid: new Float32Array([0]), range: [0, 0], rangeTime: [0, 0] },
);

function makeField(
  array: Float32Array,
  range: readonly [number, number],
): PixelField {
  return new PixelField(
    {
      grid: gridStub,
      gridProj: {} as any,
      projectorState: { viewSize: [4, 4] } as any,
      lonAxis: {} as any,
      latAxis: {} as any,
    },
    { array, range },
  );
}

describe("PixelField", () => {
  describe("min() and max()", () => {
    it("min() returns range[0]", () => {
      const field = makeField(new Float32Array(16), [-10, 100]);
      expect(field.min()).toBe(-10);
    });

    it("max() returns range[1], not range[0]", () => {
      const field = makeField(new Float32Array(16), [-10, 100]);
      expect(field.max()).toBe(100);
    });

    it("min() and max() are different when range spans values", () => {
      const field = makeField(new Float32Array(16), [0, 50]);
      expect(field.min()).not.toBe(field.max());
      expect(field.min()).toBe(0);
      expect(field.max()).toBe(50);
    });

    it("min() equals max() when range is a single point", () => {
      const field = makeField(new Float32Array(16), [42, 42]);
      expect(field.min()).toBe(42);
      expect(field.max()).toBe(42);
    });

    it("handles negative ranges", () => {
      const field = makeField(new Float32Array(16), [-200, -50]);
      expect(field.min()).toBe(-200);
      expect(field.max()).toBe(-50);
    });
  });

  describe("get()", () => {
    const arr = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

    it("returns correct pixel value at (0,0)", () => {
      const field = makeField(arr, [1, 16]);
      expect(field.get(0, 0)).toBe(1);
    });

    it("returns correct pixel value at (3,3) for 4x4 grid", () => {
      const field = makeField(arr, [1, 16]);
      expect(field.get(3, 3)).toBe(16);
    });

    it("returns NaN for out-of-bounds coordinates", () => {
      const field = makeField(arr, [1, 16]);
      expect(field.get(-1, 0)).toBeNaN();
      expect(field.get(0, -1)).toBeNaN();
      expect(field.get(4, 0)).toBeNaN();
      expect(field.get(0, 4)).toBeNaN();
    });

    it("rounds fractional coordinates", () => {
      const field = makeField(arr, [1, 16]);
      // (0.4, 0) rounds to (0, 0) → value 1; (0.6, 0) rounds to (1, 0) → value 2
      expect(field.get(0.4, 0)).toBe(1);
      expect(field.get(0.6, 0)).toBe(2);
    });
  });

  describe("isDefined()", () => {
    it("returns true for non-NaN values", () => {
      const field = makeField(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]), [1, 16]);
      expect(field.isDefined(0, 0)).toBe(true);
    });

    it("returns false for out-of-bounds (NaN)", () => {
      const field = makeField(new Float32Array(16), [0, 0]);
      expect(field.isDefined(-1, 0)).toBe(false);
      expect(field.isDefined(5, 5)).toBe(false);
    });

    it("returns false for NaN values in array", () => {
      const arr = new Float32Array([NaN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const field = makeField(arr, [0, 0]);
      expect(field.isDefined(0, 0)).toBe(false);
    });
  });
});
