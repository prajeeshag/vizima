import { Data } from "../types";

type PainterProps = {};

export abstract class Painter<Props extends PainterProps> extends Data<
  Props,
  null
> {
  abstract draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void>;
}
