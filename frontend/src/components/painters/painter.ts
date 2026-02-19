import { CachedResult } from "../types";

export type PainterProps = {};

export abstract class Painter<Props extends PainterProps> extends CachedResult<
  Props,
  null
> {
  abstract draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void>;
}
