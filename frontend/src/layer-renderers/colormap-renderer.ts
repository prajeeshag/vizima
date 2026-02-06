import { createGridAgent, getGridProps } from "../components/grid-data";
import { createPixelAgent, type PixelProps } from "../components/pixel-field";
import { createColorMapPainter } from "../components/painters";
import { type CreateLayerRenderer, type LayerRenderer } from "./layer-renderer";
import type { DataVarMeta, LatAxis, LonAxis } from "../components/dataset";
import type { DataProjection, ProjectorState } from "../components/projection";
import { type ColorScaleDynamic, buildColorScale } from "../colorscale";

type ColorMapRendererProps = {
  proj: ProjectorState;
  viewSize: [number, number];
  url: string;
  latAxis: LatAxis;
  lonAxis: LonAxis;
  gridProj: DataProjection;
  timeIndex?: number;
  vertIndex?: number;
  gridMeta: DataVarMeta;
  colorScale: ColorScaleDynamic;
};

type CreateColorMapRenderer = CreateLayerRenderer<ColorMapRendererProps>;
export type ColorMapRenderer = LayerRenderer<ColorMapRendererProps>;

export const createColorMapRenderer: CreateColorMapRenderer = () => {
  const gridAgent = createGridAgent();
  const pixelAgent = createPixelAgent();
  const colorMapRenderer = async (props: ColorMapRendererProps) => {
    const gridProps = getGridProps({
      url: props.url,
      latAxis: props.latAxis,
      lonAxis: props.lonAxis,
    });

    const grid = await gridAgent.get({
      ...gridProps,
      t: props.timeIndex,
      z: props.vertIndex,
    });

    const pixelProps: PixelProps = {
      grid: grid,
      viewSize: props.viewSize,
      gridProj: props.gridProj,
      proj: props.proj,
      lonAxis: props.lonAxis,
      latAxis: props.latAxis,
    };
    const field = await pixelAgent.get(pixelProps);
    const colorScale = buildColorScale(props.colorScale, {
      grid: grid,
      pixelField: field,
      gridMeta: props.gridMeta,
    });
    return createColorMapPainter({ field: field, colorScale: colorScale });
  };
  return colorMapRenderer;
};
