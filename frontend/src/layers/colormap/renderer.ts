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
  PixelField,
  PixelAgent,
} from "../../data/pixel-field";

import { createColorMapPainter } from "./painter";

import { type StaticRenderer } from "../../core/static-renderer";
import type { DataVarMeta, LatAxis, LonAxis } from "../../data/dataset";
import type { GridProjection, ProjectorState } from "../../projection";
import {
  type ColorScaleDynamic,
  type ColorScaleStatic,
  buildColorScale,
} from "./colorscale";
import { tInterpolatePixelField } from "../../data/pixel-field/utils";

export type ColorMapRendererProps = {
  projectorState: ProjectorState;
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
    pixelField: PixelField;
  }) => void;
};

export const createColorMapRenderer = (kwrgs: Props) => {
  let lastPrefetchT2: number | null = null;
  let prefetch: Promise<[PixelField, Grid]> | null = null;
  const gridAgents: [GridAgent, GridAgent, GridAgent] = [
    createGridAgent(),
    createGridAgent(),
    createGridAgent(),
  ];
  const callback = kwrgs.callback || (() => {});
  const getProps = kwrgs.getProps;

  const pixelProvider = createPixelProvider(4);

  const pixelAgents: [PixelAgent, PixelAgent, PixelAgent] = [
    getPixelAgent(),
    getPixelAgent(),
    getPixelAgent(),
  ];

  function getPixelAgent() {
    return createPixelAgent(pixelProvider);
  }

  const colorMapRenderer: StaticRenderer = async () => {
    const props = getProps();
    const gridProps = getGridProps({
      url: props.url,
      latAxis: props.latAxis,
      lonAxis: props.lonAxis,
    });
    const [pixelField, grid] = await getPixel(props.timeIndex);

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

    async function getPixel(
      timeIndex: number | undefined,
    ): Promise<[PixelField, Grid]> {
      if (timeIndex === undefined) {
        return await pixelGet(
          {
            ...gridProps,
            z: props.vertIndex,
          },
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
          {
            ...gridProps,
            t: t2,
            z: props.vertIndex,
          },
          2,
        );
      }
      if (t1 === t0) {
        return await pixelGet(
          {
            ...gridProps,
            t: t0,
            z: props.vertIndex,
          },
          0,
        );
      }
      const alpha = timeIndex - t0;
      const [p0, p1] = await Promise.all([
        pixelGet(
          {
            ...gridProps,
            t: t0,
            z: props.vertIndex,
          },
          0,
        ),
        pixelGet(
          {
            ...gridProps,
            t: t1,
            z: props.vertIndex,
          },
          1,
        ),
      ]);
      const p = tInterpolatePixelField(p0[0], p1[0], alpha);
      return [p, p0[1]];
    }

    async function pixelGet(
      gridProps: GridProps,
      agentId: number,
    ): Promise<[PixelField, Grid]> {
      const grid = await gridAgents[agentId]!.get(gridProps);
      const pixelField = await pixelAgents[agentId]!.get({
        grid,
        ...props,
      });
      return [pixelField, grid];
    }
  };
  return colorMapRenderer;
};
