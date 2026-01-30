import * as d3 from "d3";
import type { ProjectionName } from "./schemas";

export const D3PROJ_MAP: Record<ProjectionName, () => d3.GeoProjection> = {
  EqualEarth: d3.geoEqualEarth,
  Equirectangular: d3.geoEquirectangular,
  Orthographic: d3.geoOrthographic,
  LonLat: d3.geoEquirectangular,
  Mercator: d3.geoMercator,
  Lambert: d3.geoConicConformal,
  Polar: d3.geoStereographic,
};
