import * as d3 from "d3";
import { logger as _logger } from "../logger";
import type {
  Lambert,
  LonLat,
  Mercator,
  Orthographic,
  Polar,
  ProjectionName,
} from "./schemas";
import { Projection } from "./schemas";
import { D3PROJ_MAP } from "./constants";
import { hasParallels } from "./utils";

export type Corners = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

type ProjectionInitConfig = {
  name: ProjectionName;
};

abstract class ProjectionInit<Config extends ProjectionInitConfig> {
  protected logger = _logger.child({ component: this.constructor.name });
  protected readonly proj: d3.GeoProjection;

  constructor(protected readonly config: Config) {
    this.proj = D3PROJ_MAP[this.config.name]();
    this.setConfig();
  }

  abstract init(
    viewSize: readonly [number, number],
    corners?: Corners,
    padding?: [number, number],
  ): d3.GeoProjection;

  abstract setConfig(): void;
}

class GlobalProjectionInit<
  Config extends ProjectionInitConfig,
> extends ProjectionInit<Config> {
  override setConfig(): void {}

  init = (
    viewSize: [number, number],
    corners?: Corners,
    padding: [number, number] = [0.005, 0.005],
  ) => {
    const paddedSize: [[number, number], [number, number]] = [
      [viewSize[0] * padding[0], viewSize[1] * padding[0]],
      [viewSize[0] * (1 - padding[0]), viewSize[1] * (1 - padding[0])],
    ];
    if (corners) {
      this.proj.fitExtent(paddedSize, {
        type: "Polygon",
        coordinates: [corners],
      });
    } else {
      this.proj.fitExtent(paddedSize, { type: "Sphere" });
    }
    return this.proj;
  };
}

abstract class DataProjectionInit<
  Config extends ProjectionInitConfig,
> extends ProjectionInit<Config> {
  init = (
    viewSize: [number, number],
    corners?: Corners,
    padding: [number, number] = [0, 0],
  ) => {
    if (!corners) {
      this.logger.warn("Corners not provided");
      return this.proj;
    }
    const points = corners;
    points.push(points[0]);
    this.proj.fitSize(viewSize, { type: "Polygon", coordinates: [points] });
    const p0 = this.proj(points[0]);
    const p2 = this.proj(points[2]);
    if (!p0 || !p2) {
      this.logger.warn(
        `Invalid projection for points ${points[0]} and ${points[2]}`,
      );
      return this.proj;
    }

    const gW = p2[0] - p0[0];
    const gH = p2[1] - p0[1];

    const scaleW = viewSize[0] / gW;
    const scaleH = viewSize[1] / gH;

    if (scaleW < scaleH) {
      this.proj.fitHeight(viewSize[1], {
        type: "Polygon",
        coordinates: [points],
      });
      const xy = this.proj(points[2]);
      if (!xy) {
        this.logger.warn(`Invalid projection for point ${points[2]}`);
        return this.proj;
      }
      const [x, y] = xy;
      const translate = this.proj.translate();
      this.proj.translate([translate[0] - (x - viewSize[0]) / 2, translate[1]]);
    } else {
      this.proj.fitWidth(viewSize[0], {
        type: "Polygon",
        coordinates: [points],
      });
      const xy = this.proj(points[2]!);
      if (!xy) {
        this.logger.warn(`Invalid projection for point ${points[2]}`);
        return this.proj;
      }
      const [x, y] = xy;
      const translate = this.proj.translate();
      this.proj.translate([translate[0], translate[1] - (y - viewSize[1]) / 2]);
    }
    return this.proj;
  };
}

class LambertInit extends DataProjectionInit<Lambert> {
  override setConfig() {
    if (!hasParallels(this.proj)) {
      this.logger.error(
        `Projection ${this.proj.name} does not support parallels`,
      );
      throw new Error(
        `Projection ${this.proj.name} does not support parallels`,
      );
    }
    this.proj
      .parallels([this.config.trueLat1, this.config.trueLat2])
      .rotate([-this.config.standLon, 0]);
  }
}

class PolarInit extends DataProjectionInit<Polar> {
  override setConfig(): void {
    this.proj.rotate([-this.config.standLon, -this.config.trueLat]);
  }
}

class LonLatInit extends DataProjectionInit<LonLat> {
  override setConfig(): void {
    this.proj.rotate([-this.config.poleLon, this.config.poleLat - 90]);
  }
}

class OrthographicInit extends GlobalProjectionInit<Orthographic> {
  override setConfig(): void {}
}

export function getProjectionInit(config: Projection): ProjectionInit<any> {
  switch (config.name) {
    case "Equirectangular":
    case "EqualEarth":
    case "Mercator":
      return new GlobalProjectionInit(config);
    case "Orthographic":
      return new OrthographicInit(config);
    case "LonLat":
      return new LonLatInit(config);
    case "Lambert":
      return new LambertInit(config);
    case "Polar":
      return new PolarInit(config);
    default:
      const _exhaustiveCheck: never = config;
      throw new Error(`Unhandled projection type: ${config}`);
  }
}
