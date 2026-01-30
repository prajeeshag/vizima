import { Product } from "../types";

type PainterProps = {};

export abstract class Painter<Props extends PainterProps> extends Product<
  Props,
  null
> {
  abstract draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void>;
}
