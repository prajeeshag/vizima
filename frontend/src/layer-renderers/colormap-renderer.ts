import { createGridAgent, getGridProps, Grid } from "../components/grid-data";
import {
  createPixelAgent,
  PixelField,
  type PixelProps,
} from "../components/pixel-field";
import { createColorMapPainter } from "../components/painters";
import { type CreateLayerRenderer, type LayerRenderer } from "./layer-renderer";
import type { DataVarMeta, LatAxis, LonAxis } from "../components/dataset";
import type { DataProjection, ProjectorState } from "../components/projection";
import {
  type ColorScaleDynamic,
  type ColorScaleStatic,
  buildColorScale,
} from "../colorscale";

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

export type ColorMapRenderer = LayerRenderer<ColorMapRendererProps>;

type Props = {
  callback?: (props: {
    colorScale: ColorScaleStatic;
    props: ColorMapRendererProps;
    grid: Grid;
    pixelField: PixelField;
  }) => void;
};

export const createColorMapRenderer = (props: Props) => {
  const gridAgent = createGridAgent();
  const pixelAgent = createPixelAgent();
  const callback = props.callback || (() => {});
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
    callback({
      colorScale: colorScale,
      props: props,
      grid: grid,
      pixelField: field,
    });
    return createColorMapPainter({ field: field, colorScale: colorScale });
  };
  return colorMapRenderer;
};
