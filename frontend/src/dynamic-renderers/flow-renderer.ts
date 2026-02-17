import {
  createGridAgent,
  getGridProps,
  Grid,
  GridAgent,
} from "../components/grid-data";
import {
  createPixelAgent,
  PixelAgent,
  PixelField,
  type PixelProps,
} from "../components/pixel-field";
import { createFlowAnimator } from "../components/flow-animator";
import type { VectorVarMeta, LatAxis, LonAxis } from "../components/dataset";
import type { GridProjection, ProjectorState } from "../components/projection";

type FlowRendererProps = {
  proj: ProjectorState;
  viewSize: [number, number];
  uUrl: string;
  vUrl: string;
  latAxis: LatAxis;
  lonAxis: LonAxis;
  gridProj: GridProjection;
  timeIndex?: number;
  vertIndex?: number;
  numTimeSteps: number;
  gridMeta: VectorVarMeta;
};

type Props = {
  callback?: (props: {
    props: FlowRendererProps;
    uGrid: Grid;
    vGrid: Grid;
    mGrid: Grid;
    uPixelField: PixelField;
    vPixelField: PixelField;
    mPixelField: PixelField;
  }) => void;
};

export const createFlowRenderer = (props: Props) => {
  const gridAgents: [GridAgent, GridAgent] = [
    createGridAgent(),
    createGridAgent(),
  ];
  const pixelAgents: [PixelAgent, PixelAgent, PixelAgent] = [
    createPixelAgent(),
    createPixelAgent(),
    createPixelAgent(),
  ];
  const callback = props.callback || (() => {});

  const flowRenderer = async (props: FlowRendererProps) => {
    const uGridProps = getGridProps({
      url: props.uUrl,
      latAxis: props.latAxis,
      lonAxis: props.lonAxis,
    });
    const vGridProps = getGridProps({
      url: props.vUrl,
      latAxis: props.latAxis,
      lonAxis: props.lonAxis,
    });

    const [uGrid, vGrid, mGrid] = await getGrid();

    const uPixelProps: PixelProps = {
      grid: uGrid,
      ...props,
    };

    const vPixelProps: PixelProps = {
      grid: vGrid,
      ...props,
    };

    const mPixelProps: PixelProps = {
      grid: mGrid,
      ...props,
    };

    const [uPixelField, vPixelField, mPixelField] = await Promise.all([
      pixelAgents[0].get(uPixelProps),
      pixelAgents[1].get(vPixelProps),
      pixelAgents[2].get(mPixelProps),
    ]);

    callback({
      props: props,
      uGrid: uGrid,
      vGrid: vGrid,
      mGrid: mGrid,
      uPixelField: uPixelField,
      vPixelField: vPixelField,
      mPixelField: mPixelField,
    });

    return createFlowAnimator({
      ufld: uPixelField,
      vfld: vPixelField,
      sfld: mPixelField,
      viewSize: props.viewSize,
      maxWind: 17,
    });

    async function getGrid(): Promise<[Grid, Grid, Grid]> {
      const [uGrid, vGrid] = await Promise.all([
        gridAgents[0].get({
          ...uGridProps,
          t: props.timeIndex,
          z: props.vertIndex,
        }),
        gridAgents[1].get({
          ...vGridProps,
          t: props.timeIndex,
          z: props.vertIndex,
        }),
      ]);
      const mGrid = computeMagnitude(uGrid, vGrid);
      return [uGrid, vGrid, mGrid];
    }
  };
  return flowRenderer;
};

function computeMagnitude(uGrid: Grid, vGrid: Grid): Grid {
  const value = new Float32Array(uGrid.value.length);
  for (let i = 0; i < value.length; i++) {
    value[i] = Math.sqrt(uGrid.value[i]! ** 2 + vGrid.value[i]! ** 2);
  }
  return new Grid(uGrid.props, value);
}

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
