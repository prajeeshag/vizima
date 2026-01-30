import { expect, test, describe, beforeEach } from "bun:test";
import { PixelNativeUtil, isPreriodicLon } from "./pixel-utils";

describe("PixelNativeUtil", () => {
  const defaultProps = {
    gridStartPoint: [10, 10] as [number, number],
    gridEndPoint: [110, 110] as [number, number],
    gridSize: [11, 11] as [number, number], // 10 intervals, so 0-10 indices
    viewSize: [200, 200] as [number, number],
  };

  let util: PixelNativeUtil;

  beforeEach(() => {
    util = new PixelNativeUtil(defaultProps);
  });

  describe("canvasToGrid", () => {
    test("maps start point to (0, 0)", () => {
      const [gx, gy] = util.canvasToGrid(10, 10);
      expect(gx).toBe(0);
      expect(gy).toBe(0);
    });

    test("maps end point to (gridSize - 1)", () => {
      const [gx, gy] = util.canvasToGrid(110, 110);
      expect(gx).toBe(10);
      expect(gy).toBe(10);
    });

    test("maps midpoint correctly", () => {
      const [gx, gy] = util.canvasToGrid(60, 60);
      expect(gx).toBe(5);
      expect(gy).toBe(5);
    });

    test("handles points outside the grid range (extrapolation)", () => {
      const [gx, gy] = util.canvasToGrid(0, 0);
      // (0 - 10) / (110 - 10) = -0.1. -0.1 * (11-1) = -1
      expect(gx).toBe(-1);
      expect(gy).toBe(-1);
    });
  });

  describe("canvasGridBounds", () => {
    test("returns correct bounds when within viewSize", () => {
      const bounds = util.canvasGridBounds();
      expect(bounds).toEqual({
        x0: 10,
        x1: 110,
        y0: 10,
        y1: 110,
      });
    });

    test("clips bounds to viewSize when grid exceeds canvas", () => {
      const oversizedUtil = new PixelNativeUtil({
        gridStartPoint: [-50, -50],
        gridEndPoint: [300, 300],
        gridSize: [10, 10],
        viewSize: [200, 200],
      });

      const bounds = oversizedUtil.canvasGridBounds();
      expect(bounds.x0).toBe(0); // Clipped from -50
      expect(bounds.y0).toBe(0); // Clipped from -50
      expect(bounds.x1).toBe(199); // Clipped from 300 (viewSize[0] - 1)
      expect(bounds.y1).toBe(199); // Clipped from 300 (viewSize[1] - 1)
    });

    test("handles reversed start/end points (min/max logic)", () => {
      const reversedUtil = new PixelNativeUtil({
        gridStartPoint: [100, 100],
        gridEndPoint: [10, 10],
        gridSize: [10, 10],
        viewSize: [200, 200],
      });

      const bounds = reversedUtil.canvasGridBounds();
      expect(bounds.x0).toBe(10);
      expect(bounds.x1).toBe(100);
    });

    test("clips to viewSize and maintains integer types", () => {
      const util = new PixelNativeUtil({
        gridStartPoint: [0.5, 0.5],
        gridEndPoint: [500.5, 500.5],
        gridSize: [10, 10],
        viewSize: [200, 200],
      });

      const bounds = util.canvasGridBounds();
      expect(bounds.x0).toBe(0);
      expect(bounds.x1).toBe(199); // viewSize[0] - 1
      expect(Number.isInteger(bounds.x1)).toBe(true);
    });
  });
});

describe("is_preriodic_lon", () => {
  test("returns true for a standard 1-degree global grid", () => {
    // 0 to 360 span: 0 === (0 + 360*1) - 360
    expect(isPreriodicLon({ lon0: 0, nlon: 360, dlon: 1 })).toBe(true);
  });

  test("returns true for a global grid starting at negative longitude", () => {
    // -180 to 180 span: -180 === (-180 + 360*1) - 360
    expect(isPreriodicLon({ lon0: -180, nlon: 360, dlon: 1 })).toBe(true);
  });

  test("returns false for a partial/regional grid", () => {
    // Only spans 100 degrees
    expect(isPreriodicLon({ lon0: 0, nlon: 100, dlon: 1 })).toBe(false);
  });

  test("returns true for high-resolution global grids", () => {
    // 0.25 degree grid: 1440 * 0.25 = 360
    expect(isPreriodicLon({ lon0: 0, nlon: 1440, dlon: 0.25 })).toBe(true);
  });

  test("handles floating point precision roughly", () => {
    // 1/3 degree grid (0.333...)
    // Note: If this fails, you may need a small epsilon check in your source code
    const nlon = 1080;
    const dlon = 360 / nlon;
    expect(isPreriodicLon({ lon0: 0, nlon: nlon, dlon: dlon })).toBe(true);
  });

  test("returns false when the span is slightly less than 360", () => {
    // 359 degrees
    expect(isPreriodicLon({ lon0: 0, nlon: 359, dlon: 1 })).toBe(false);
  });
});
