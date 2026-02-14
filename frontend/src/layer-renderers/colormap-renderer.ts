import {
  createGridAgent,
  getGridProps,
  Grid,
  GridAgent,
} from "../components/grid-data";
import {
  createPixelAgent,
  PixelField,
  type PixelProps,
} from "../components/pixel-field";
import { createColorMapPainter } from "../components/painters";
import { type LayerRenderer } from "./layer-renderer";
import type { DataVarMeta, LatAxis, LonAxis } from "../components/dataset";
import type { GridProjection, ProjectorState } from "../components/projection";
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
  gridProj: GridProjection;
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
  const gridAgents: [GridAgent, GridAgent] = [
    createGridAgent(),
    createGridAgent(),
  ];
  const pixelAgent = createPixelAgent();
  const callback = props.callback || (() => {});

  const colorMapRenderer = async (props: ColorMapRendererProps) => {
    const gridProps = getGridProps({
      url: props.url,
      latAxis: props.latAxis,
      lonAxis: props.lonAxis,
    });

    const grid = await getGrid();

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

    async function getGrid() {
      if (props.timeIndex === undefined) {
        const grid = await gridAgents[0].get({
          ...gridProps,
          t: props.timeIndex,
          z: props.vertIndex,
        });
        return grid;
      }
      const t0 = Math.floor(props.timeIndex);
      const t1 = Math.ceil(props.timeIndex);
      if (t0 === t1) {
        const grid = await gridAgents[0].get({
          ...gridProps,
          t: props.timeIndex,
          z: props.vertIndex,
        });
        return grid;
      }
      console.log(props.timeIndex);
      const alpha = props.timeIndex - t0;
      const [g0, g1] = await Promise.all([
        gridAgents[0].get({
          ...gridProps,
          t: t0,
          z: props.vertIndex,
        }),
        gridAgents[1].get({
          ...gridProps,
          t: t1,
          z: props.vertIndex,
        }),
      ]);
      return tInterpolateGrids(g0, g1, alpha);
    }
  };
  return colorMapRenderer;
};

function tInterpolateGrids(g0: Grid, g1: Grid, alpha: number): Grid {
  if (g0.props.nx !== g1.props.nx || g0.props.ny !== g1.props.ny) {
    throw new Error("Grids must have the same dimensions");
  }
  const w0 = 1 - alpha;
  const w1 = alpha;
  const props = { ...g0.props, t: g0.props.t! + alpha };
  const value = g0.value;
  for (let i = 0; i < value.length; i++) {
    value[i] = g0.value[i]! * w0 + g1.value[i]! * w1;
  }
  return new Grid(props, value);
}
