import {
  createGridAgent,
  getGridProps,
  Grid,
  GridAgent,
} from "../../components/grid-data";
import {
  createPixelAgent,
  PixelAgent,
  PixelField,
  type PixelProps,
} from "../../components/pixel-field";
import {
  createFlowAnimator,
  type FlowAnimator,
} from "../../animators/flow-animator";
import type { VectorVarMeta, LatAxis, LonAxis } from "../../components/dataset";
import {
  type GridProjection,
  type ProjectorState,
} from "../../components/projection";
import { type AnimationRenderer } from "./animation-renderer";
import type { Expand } from "../../type-helpers";

export type FlowRendererProps = {
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
  maxWind: (props: { gridMeta: VectorVarMeta }) => number;
  timeIndex?: number;
  vertIndex?: number;
  numTimeSteps: number;
  gridMeta: VectorVarMeta;
};

type Props = {
  getProps: () => FlowRendererProps;
  callback?: (props: {
    props: FlowRendererProps;
    uPixelField: PixelField;
    vPixelField: PixelField;
  }) => void;
};

type VGridAgent = {
  u: GridAgent;
  v: GridAgent;
};

function createVGridAgent(): VGridAgent {
  return { u: createGridAgent(), v: createGridAgent() };
}

export function createFlowRenderer(kwds: Expand<Props>): AnimationRenderer {
  const gridAgents: [VGridAgent, VGridAgent, VGridAgent] = [
    createVGridAgent(),
    createVGridAgent(),
    createVGridAgent(),
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
    const [uPixelField, vPixelField] = fields;
    if (flowAnimator) {
      flowAnimator.destroy();
      flowAnimator = undefined;
    }
    flowAnimator = createFlowAnimator({
      ufield: uPixelField,
      vfield: vPixelField,
      maxWind: props.maxWind({
        gridMeta: props.gridMeta,
      }),
    });
    flowAnimator.animate(canvas);
  }

  async function update() {
    if (!flowAnimator) return;
    const fields = await getFields();
    const [uPixelField, vPixelField] = fields;
    flowAnimator.updateFields({
      ufld: uPixelField,
      vfld: vPixelField,
    });
  }

  async function getFields(): Promise<[PixelField, PixelField]> {
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
      uPixelField: uPixelField,
      vPixelField: vPixelField,
    });

    return [uPixelField, vPixelField];

    async function getGrid(): Promise<[Grid, Grid]> {
      const [uGrid, vGrid] = await Promise.all([
        gridAgents[0].u.get({
          ...uGridProps,
          t: props.timeIndex,
          z: props.vertIndex,
        }),
        gridAgents[1].v.get({
          ...vGridProps,
          t: props.timeIndex,
          z: props.vertIndex,
        }),
      ]);
      return [uGrid, vGrid];
    }
  }
}
