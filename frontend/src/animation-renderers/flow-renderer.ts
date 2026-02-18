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
import {
  createFlowAnimator,
  type FlowAnimator,
} from "../animators/flow-animator";
import type { VectorVarMeta, LatAxis, LonAxis } from "../components/dataset";
import type { GridProjection, ProjectorState } from "../components/projection";
import { type AnimationRenderer } from "./animation-renderer";

type FlowRendererProps = {
  projectorState: ProjectorState;
  viewSize: [number, number];
  u: {
    url: string;
    latAxis: LatAxis;
    lonAxis: LonAxis;
  };
  v: {
    url: string;
    latAxis: LatAxis;
    lonAxis: LonAxis;
  };
  gridProj: GridProjection;
  maxWind: number;
  timeIndex?: number;
  vertIndex?: number;
  numTimeSteps: number;
  gridMeta: VectorVarMeta;
};

type Props = {
  getProps: () => FlowRendererProps;
  callback?: (props: {
    props: FlowRendererProps;
    uGrid: Grid;
    vGrid: Grid;
    uPixelField: PixelField;
    vPixelField: PixelField;
  }) => void;
};

export function createFlowRenderer(kwds: Props): AnimationRenderer {
  const gridAgents: [GridAgent, GridAgent] = [
    createGridAgent(),
    createGridAgent(),
  ];
  const pixelAgents: [PixelAgent, PixelAgent] = [
    createPixelAgent(),
    createPixelAgent(),
  ];
  const callback = kwds.callback || (() => {});
  let flowAnimator: FlowAnimator | undefined;

  return { render: render, update: update, start: start, stop: stop };

  async function start() {
    if (!flowAnimator) return;
    flowAnimator.start();
  }

  async function stop() {
    if (!flowAnimator) return;
    flowAnimator.stop();
  }

  async function render(canvas: HTMLCanvasElement) {
    const props = kwds.getProps();
    const fields = await getFields();
    const [uPixelField, vPixelField, mPixelField] = fields;
    flowAnimator = createFlowAnimator({
      ufld: uPixelField,
      vfld: vPixelField,
      mfld: mPixelField,
      maxWind: props.maxWind,
    });
    flowAnimator.animate(canvas);
  }

  async function update() {
    if (!flowAnimator) return;
    const fields = await getFields();
    const [uPixelField, vPixelField, mPixelField] = fields;
    flowAnimator.updateFields({
      ufld: uPixelField,
      vfld: vPixelField,
      mfld: mPixelField,
    });
  }

  async function getFields(): Promise<[PixelField, PixelField, PixelField]> {
    const props = kwds.getProps();
    const uGridProps = getGridProps({
      ...props.u,
    });
    const vGridProps = getGridProps({
      ...props.v,
    });

    const [uGrid, vGrid] = await getGrid();

    const uPixelProps: PixelProps = {
      grid: uGrid,
      projectorState: props.projectorState,
      viewSize: props.viewSize,
      gridProj: props.gridProj,
      lonAxis: props.u.lonAxis,
      latAxis: props.u.latAxis,
    };

    const vPixelProps: PixelProps = {
      grid: vGrid,
      projectorState: props.projectorState,
      viewSize: props.viewSize,
      gridProj: props.gridProj,
      lonAxis: props.v.lonAxis,
      latAxis: props.v.latAxis,
    };

    const [uPixelField, vPixelField] = await Promise.all([
      pixelAgents[0].get(uPixelProps),
      pixelAgents[1].get(vPixelProps),
    ]);

    callback({
      props: props,
      uGrid: uGrid,
      vGrid: vGrid,
      uPixelField: uPixelField,
      vPixelField: vPixelField,
    });
    const mPixelField = computeMagnitude(uPixelField, vPixelField);

    return [uPixelField, vPixelField, mPixelField];

    async function getGrid(): Promise<[Grid, Grid]> {
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
      return [uGrid, vGrid];
    }
  }
}

function computeMagnitude(u: PixelField, v: PixelField): PixelField {
  const value = new Float32Array(u.value.length);
  for (let i = 0; i < value.length; i++) {
    const uval = u.value[i];
    const vval = v.value[i];
    if (uval === undefined || vval === undefined) {
      value[i] = NaN;
    } else {
      value[i] = Math.sqrt(uval ** 2 + vval ** 2);
    }
  }
  return new PixelField(u.props, value);
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
