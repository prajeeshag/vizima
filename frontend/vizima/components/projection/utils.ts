import * as d3 from "d3";
/**
 * Type guard to check if a projection supports parallels
 */
export function hasParallels(
  proj: d3.GeoProjection,
): proj is d3.GeoConicProjection {
  return "parallels" in proj && typeof (proj as any).parallels === "function";
}
