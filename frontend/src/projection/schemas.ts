import { z } from "zod";

const lon = z.number().min(-180).max(360);
const lat = z.number().min(-90).max(90);

const Equirectangular = z
  .strictObject({
    name: z.literal("Equirectangular"),
  })
  .meta({ title: "Equirectangular" });

const Orthographic = z
  .strictObject({
    name: z.literal("Orthographic"),
  })
  .meta({ title: "Orthographic" });

const EqualEarth = z
  .strictObject({
    name: z.literal("EqualEarth"),
  })
  .meta({ title: "EqualEarth" });

const LonLat = z
  .strictObject({
    name: z.literal("LonLat"),
    poleLon: lon,
    poleLat: lat,
  })
  .meta({ title: "LonLat" });

const Mercator = z
  .strictObject({
    name: z.literal("Mercator"),
  })
  .meta({ title: "Mercator" });

const Lambert = z
  .strictObject({
    name: z.literal("Lambert"),
    standLon: lon,
    trueLat1: lat,
    trueLat2: lat,
  })
  .meta({ title: "Lambert" });

const Polar = z
  .strictObject({
    name: z.literal("Polar"),
    standLon: lon,
    trueLat: lat,
  })
  .meta({ title: "Polar" });

export type Lambert = z.infer<typeof Lambert>;
export type LonLat = z.infer<typeof LonLat>;
export type Mercator = z.infer<typeof Mercator>;
export type Polar = z.infer<typeof Polar>;
export type Orthographic = z.infer<typeof Orthographic>;

export const GridProjection = z
  .discriminatedUnion("name", [LonLat, Mercator, Lambert, Polar])
  .meta({ title: "DataProjection" });

export const ViewProjection = z
  .discriminatedUnion("name", [
    Equirectangular,
    Mercator,
    Orthographic,
    EqualEarth,
  ])
  .meta({ title: "ViewProjection" });

export type GridProjection = z.infer<typeof GridProjection>;
export type GridProjectionName = GridProjection["name"];

export type ViewProjection = z.infer<typeof ViewProjection>;

export const Projection = z
  .discriminatedUnion("name", [
    EqualEarth,
    Equirectangular,
    Orthographic,
    LonLat,
    Mercator,
    Lambert,
    Polar,
  ])
  .meta({ title: "Projection" });

export type Projection = z.infer<typeof Projection>;
export type ProjectionName = Projection["name"];
