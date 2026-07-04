import { getGridProps } from "../../data/grid";
import { createPixelProvider, PixelField } from "../../data/pixel-field";
import { createColorMapPainter } from "./painter";
import { type StaticRenderer } from "../../core/static-renderer";
import type { DataVarMeta, LatAxis, LonAxis, Array } from "../../data/dataset";
import type { GridProjection, ProjectorState } from "../../projection";
import {
  type ColorScaleDynamic,
  type ColorScaleStatic,
  buildColorScale,
} from "./colorscale";
import { createPixelFetcher } from "../../data/pixel-field/fetcher";

export type ColorMapRendererProps = {
  projectorState: ProjectorState;
  arr: Array;
  latAxis: LatAxis;
  lonAxis: LonAxis;
  gridProj: GridProjection;
  timeIndex?: number;
  vertIndex?: number;
  numTimeSteps: number;
  gridMeta: DataVarMeta;
  colorScale: ColorScaleDynamic;
};

type Props = {
  getProps: () => Promise<ColorMapRendererProps>;
  callback?: (props: {
    colorScale: ColorScaleStatic;
    props: ColorMapRendererProps;
    pixelField: PixelField;
  }) => void;
};

export const createColorMapRenderer = (kwrgs: Props) => {
  const callback = kwrgs.callback || (() => { });
  const getProps = kwrgs.getProps;

  const pixelProvider = createPixelProvider(4);

  const getPixel = createPixelFetcher(1, pixelProvider);

  const colorMapRenderer: StaticRenderer = async () => {
    const props = await getProps();
    const gridProps = getGridProps({
      arr: props.arr,
      latAxis: props.latAxis,
      lonAxis: props.lonAxis,
      timeIndex: props.timeIndex,
      vertIndex: props.vertIndex,
    });
    const field = await getPixel(
      [
        {
          gridProps: gridProps,
          lonAxis: props.lonAxis,
          latAxis: props.latAxis,
          gridProj: props.gridProj,
          projectorState: props.projectorState,
        },
      ],
      props.timeIndex,
      props.numTimeSteps,
    );
    const [pixelField, grid] = field[0]!;

    const staticColorScale = buildColorScale(props.colorScale, {
      grid,
      pixelField,
      gridMeta: props.gridMeta,
    });

    callback({
      colorScale: staticColorScale,
      props: props,
      pixelField,
    });

    return createColorMapPainter({
      pixelField,
      colorScale: staticColorScale,
    });
  };
  return colorMapRenderer;
};
