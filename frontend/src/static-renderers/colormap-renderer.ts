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
import { type StaticRenderer } from "./static-renderer";
import type { DataVarMeta, LatAxis, LonAxis } from "../components/dataset";
import type { GridProjection, ProjectorState } from "../components/projection";
import {
  type ColorScaleDynamic,
  type ColorScaleStatic,
  buildColorScale,
} from "../colorscale";

export type ColorMapRendererProps = {
  projectorState: ProjectorState;
  viewSize: [number, number];
  url: string;
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
  getProps: () => ColorMapRendererProps;
  callback?: (props: {
    colorScale: ColorScaleStatic;
    props: ColorMapRendererProps;
    grid: Grid;
    pixelField: PixelField;
  }) => void;
};

export const createColorMapRenderer = (kwrgs: Props) => {
  const gridAgents: [GridAgent, GridAgent, GridAgent] = [
    createGridAgent(),
    createGridAgent(),
    createGridAgent(),
  ];
  const pixelAgent = createPixelAgent();
  const callback = kwrgs.callback || (() => {});
  const getProps = kwrgs.getProps;

  const colorMapRenderer: StaticRenderer = async () => {
    const props = getProps();
    const gridProps = getGridProps({
      url: props.url,
      latAxis: props.latAxis,
      lonAxis: props.lonAxis,
    });

    const grid = await getGrid();

    const pixelProps: PixelProps = {
      grid,
      ...props,
    };
    const pixelField = await pixelAgent.get(pixelProps);
    const staticColorScale = buildColorScale(props.colorScale, {
      grid,
      pixelField,
      gridMeta: props.gridMeta,
    });

    callback({
      colorScale: staticColorScale,
      props: props,
      grid,
      pixelField,
    });

    return createColorMapPainter({
      pixelField,
      colorScale: staticColorScale,
    });

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

      const t2 = (t1 + 1) % props.numTimeSteps;

      // prefetch next time step
      gridAgents[2].get({
        ...gridProps,
        t: t2,
        z: props.vertIndex,
      });

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
  const value = new Float32Array(g0.value.length);
  for (let i = 0; i < value.length; i++) {
    value[i] = g0.value[i]! * w0 + g1.value[i]! * w1;
  }
  return new Grid(props, value);
}
