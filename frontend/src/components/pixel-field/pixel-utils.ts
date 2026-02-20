import type { LatAxis, LonAxis } from "../dataset";
import { getProjector, type ProjectorState } from "../projection";
import { logger as _logger } from "../../logger";

export function getPixelNativeUtils(props: {
  readonly projectorState: ProjectorState;
  readonly latAxis: LatAxis;
  readonly lonAxis: LonAxis;
}): PixelNativeUtil {
  const logger = _logger.child({ component: "getPixelNativeUtil" });
  const proj = getProjector(props.projectorState);
  const gsp: [number, number] = [
    props.lonAxis.corners.lb,
    props.latAxis.corners.lb,
  ];
  const gep: [number, number] = [
    props.lonAxis.corners.rt,
    props.latAxis.corners.rt,
  ];
  const gridStartPoint = gridToPixel(gsp);
  const gridEndPoint = gridToPixel(gep);
  const gridSize: [number, number] = [props.lonAxis.count, props.latAxis.count];

  return new PixelNativeUtil({
    gridEndPoint: gridEndPoint,
    gridStartPoint: gridStartPoint,
    gridSize: gridSize,
    viewSize: props.projectorState.viewSize,
  });

  function gridToPixel(gPoint: [number, number]): [number, number] {
    const gpPoint = proj.project(gPoint);
    if (!gpPoint) {
      logger.error(`Invalid projection for point ${gPoint}`);
      throw Error(`Invalid projection for point ${gPoint}`);
    }
    return gpPoint;
  }
}

export class PixelNativeUtil {
  logger = _logger.child({ component: this.constructor.name });
  constructor(
    private readonly props: {
      readonly viewSize: readonly [number, number];
      readonly gridStartPoint: [number, number];
      readonly gridEndPoint: [number, number];
      readonly gridSize: [number, number];
    },
  ) {}

  private gridToPixel(gPoint: [number, number], proj: any): [number, number] {
    const gpPoint = proj.project(gPoint);
    if (!gpPoint) {
      this.logger.error(`Invalid projection for point ${gPoint}`);
      throw Error(`Invalid projection for point ${gPoint}`);
    }
    return gpPoint;
  }

  canvasToGrid(px: number, py: number): [number, number] {
    const tx =
      (px - this.props.gridStartPoint[0]) /
      (this.props.gridEndPoint[0] - this.props.gridStartPoint[0]);
    const ty =
      (py - this.props.gridStartPoint[1]) /
      (this.props.gridEndPoint[1] - this.props.gridStartPoint[1]);
    return [
      tx * (this.props.gridSize[0] - 1),
      ty * (this.props.gridSize[1] - 1),
    ];
  }

  canvasGridBounds() {
    const gx0 = Math.min(
      this.props.gridStartPoint[0],
      this.props.gridEndPoint[0],
    );
    const gx1 = Math.max(
      this.props.gridStartPoint[0],
      this.props.gridEndPoint[0],
    );
    const gy0 = Math.min(
      this.props.gridStartPoint[1],
      this.props.gridEndPoint[1],
    );
    const gy1 = Math.max(
      this.props.gridStartPoint[1],
      this.props.gridEndPoint[1],
    );
    return {
      x0: Math.floor(Math.max(0, gx0)),
      x1: Math.floor(Math.min(this.props.viewSize[0] - 1, gx1)),
      y0: Math.floor(Math.max(0, gy0)),
      y1: Math.floor(Math.min(this.props.viewSize[1] - 1, gy1)),
    };
  }
}

export function isPreriodicLon(lon: {
  lon0: number;
  nlon: number;
  dlon: number;
}) {
  const lonEnd = lon.lon0 + lon.nlon * lon.dlon;
  return lon.lon0 === lonEnd - 360;
}
