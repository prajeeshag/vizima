import { getGridProps } from "../../data/grid";
import { createPixelProvider, PixelField } from "../../data/pixel-field";
import { createFlowAnimator, type FlowAnimator } from "./animator";
import type { VectorVarMeta, LatAxis, LonAxis } from "../../data/dataset";
import { type GridProjection, type ProjectorState } from "../../projection";
import { type AnimationRenderer } from "../../core/animation-renderer";
import type { Expand } from "../../core/type-helpers";
import { createPixelFetcher } from "../../data/pixel-field/fetcher";

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

export function createFlowRenderer(kwds: Expand<Props>): AnimationRenderer {
  let renderRequestId = 0;
  const pixelProvider = createPixelProvider(8);

  const getPixel = createPixelFetcher(2, pixelProvider);

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

    const field = await getPixel(
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
      props.timeIndex,
      props.numTimeSteps,
    );

    callback({
      props: props,
      uPixelField: field[0]![0],
      vPixelField: field[1]![0],
    });

    return [field[0]![0], field[1]![0]];
  }
}
