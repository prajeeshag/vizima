import {
  createGridAgent,
  getGridProps,
  Grid,
  GridAgent,
  type GridProps,
} from "../../data/grid";
import {
  createPixelProvider,
  createPixelAgent,
  PixelAgent,
  PixelField,
  PixelProvider,
} from "../../data/pixel-field";
import { createFlowAnimator, type FlowAnimator } from "./animator";
import type { VectorVarMeta, LatAxis, LonAxis } from "../../data/dataset";
import { type GridProjection, type ProjectorState } from "../../projection";
import { type AnimationRenderer } from "../../core/animation-renderer";
import type { Expand } from "../../core/type-helpers";
import { tInterpolatePixelField } from "../../data/pixel-field/utils";

export type FlowRendererProps = {
  projectorState: ProjectorState;
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

type PixelGetArgs = {
  gridProj: GridProjection;
  gridProps: GridProps;
  lonAxis: LonAxis;
  latAxis: LatAxis;
  projectorState: ProjectorState;
};

type VGridAgent = [GridAgent, GridAgent];

type VPixelAgent = [PixelAgent, PixelAgent];

function createVGridAgent(): VGridAgent {
  return [createGridAgent(), createGridAgent()];
}

function createVPixelAgent(provider: PixelProvider): VPixelAgent {
  return [createPixelAgent(provider), createPixelAgent(provider)];
}

export function createFlowRenderer(kwds: Expand<Props>): AnimationRenderer {
  let lastPrefetchT2: number | null = null;
  let prefetch: Promise<[PixelField, PixelField]> | null = null;
  let renderRequestId = 0;

  const gridAgents: [VGridAgent, VGridAgent, VGridAgent] = [
    createVGridAgent(),
    createVGridAgent(),
    createVGridAgent(),
  ];

  const pixelProvider = createPixelProvider(8);

  const pixelAgents: [VPixelAgent, VPixelAgent, VPixelAgent] = [
    createVPixelAgent(pixelProvider),
    createVPixelAgent(pixelProvider),
    createVPixelAgent(pixelProvider),
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
    const requestId = ++renderRequestId;
    if (flowAnimator) {
      flowAnimator.destroy();
      flowAnimator = undefined;
    }
    const [uField, vField] = await getFields();
    if (requestId !== renderRequestId) return;
    flowAnimator = createFlowAnimator({
      ufield: uField,
      vfield: vField,
    });
    flowAnimator.animate(canvas);
  }

  async function update() {
    if (!flowAnimator) return;
    const [uField, vField] = await getFields();
    flowAnimator.updateFields({
      ufield: uField,
      vfield: vField,
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

    const [uPixelField, vPixelField] = await getPixel(props.timeIndex);

    callback({
      props: props,
      uPixelField: uPixelField,
      vPixelField: vPixelField,
    });

    return [uPixelField, vPixelField];

    async function getPixel(
      timeIndex: number | undefined,
    ): Promise<[PixelField, PixelField]> {
      if (timeIndex === undefined) {
        return await pixelGet(
          [
            {
              gridProps: { ...uGridProps, z: props.vertIndex },
              lonAxis: props.u.lonAxis,
              latAxis: props.u.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
            {
              gridProps: { ...vGridProps, z: props.vertIndex },
              lonAxis: props.v.lonAxis,
              latAxis: props.v.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
          ],
          0,
        );
      }
      const t0 = Math.floor(timeIndex);
      const t1 = Math.ceil(timeIndex);
      const t2 = (t1 + 1) % props.numTimeSteps;

      if (t2 !== lastPrefetchT2) {
        await prefetch;
        lastPrefetchT2 = t2;
        prefetch = pixelGet(
          [
            {
              gridProps: { ...uGridProps, z: props.vertIndex, t: t2 },
              lonAxis: props.u.lonAxis,
              latAxis: props.u.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
            {
              gridProps: { ...vGridProps, z: props.vertIndex, t: t2 },
              lonAxis: props.v.lonAxis,
              latAxis: props.v.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
          ],
          2,
        );
      }

      if (t1 === t0) {
        return await pixelGet(
          [
            {
              gridProps: { ...uGridProps, z: props.vertIndex, t: t0 },
              lonAxis: props.u.lonAxis,
              latAxis: props.u.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
            {
              gridProps: { ...vGridProps, z: props.vertIndex, t: t0 },
              lonAxis: props.v.lonAxis,
              latAxis: props.v.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
          ],
          0,
        );
      }
      const alpha = timeIndex - t0;
      const [p0, p1] = await Promise.all([
        pixelGet(
          [
            {
              gridProps: { ...uGridProps, z: props.vertIndex, t: t0 },
              lonAxis: props.u.lonAxis,
              latAxis: props.u.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
            {
              gridProps: { ...vGridProps, z: props.vertIndex, t: t0 },
              lonAxis: props.v.lonAxis,
              latAxis: props.v.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
          ],
          0,
        ),
        pixelGet(
          [
            {
              gridProps: { ...uGridProps, z: props.vertIndex, t: t1 },
              lonAxis: props.u.lonAxis,
              latAxis: props.u.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
            {
              gridProps: { ...vGridProps, z: props.vertIndex, t: t1 },
              lonAxis: props.v.lonAxis,
              latAxis: props.v.latAxis,
              gridProj: props.gridProj,
              projectorState: props.projectorState,
            },
          ],
          1,
        ),
      ]);
      const u = tInterpolatePixelField(p0[0], p1[0], alpha);
      const v = tInterpolatePixelField(p0[1], p1[1], alpha);
      return [u, v];
    }

    async function pixelGet(
      args: [PixelGetArgs, PixelGetArgs],
      agentId: number,
    ): Promise<[PixelField, PixelField]> {
      const pixelField = await Promise.all([
        pixelGetSingle(args[0], agentId, 0),
        pixelGetSingle(args[1], agentId, 1),
      ]);
      return pixelField;
    }

    async function pixelGetSingle(
      args: PixelGetArgs,
      agentId: number,
      n: 0 | 1,
    ): Promise<PixelField> {
      const grid = await gridAgents[agentId]![n].get(args.gridProps);
      const pixelField = await pixelAgents[agentId]![n].get({
        grid: grid,
        lonAxis: args.lonAxis,
        latAxis: args.latAxis,
        gridProj: args.gridProj,
        projectorState: args.projectorState,
      });
      return pixelField;
    }
  }
}
