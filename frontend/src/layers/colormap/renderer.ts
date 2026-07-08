import { PixelField } from "../../data/pixel-field";
import { createColorMapPainter } from "./painter";
import { type Renderer } from "../../core/renderer";
import type { DataVarMeta, DataArray } from "../../data/dataset";
import type { GridProjection, ProjectorState } from "../../projection";
import {
  type ColorScaleDynamic,
  type ColorScaleStatic,
  buildColorScale,
} from "./colorscale";
import { createPixelFetcher } from "../../data/pixel-field/fetcher";

export type ColorMapRendererProps = {
  projectorState: ProjectorState;
  arr: DataArray;
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

export function createColorMapRenderer(kwrgs: Props): Renderer {

  const callback = kwrgs.callback || (() => { });
  const getProps = kwrgs.getProps;

  const getPixel = createPixelFetcher(1);

  return { render, update, start, stop };

  async function update(canvas?: HTMLCanvasElement) {
    if (canvas) {
      await render(canvas);
    }
  }

  async function start() { }

  async function stop() { }

  async function render(canvas: HTMLCanvasElement) {
    const props = await getProps();

    const field = await getPixel(
      [
        {
          array: props.arr,
          z: props.vertIndex,
          gridProj: props.gridProj,
          projectorState: props.projectorState,
          fillNN: true
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

    createColorMapPainter({
      pixelField,
      colorScale: staticColorScale,
    }).draw(canvas);

  };

};
