import { CachedResult } from "../types";

export type PainterProps = {};

export abstract class Painter<Props extends PainterProps> extends CachedResult<
  Props,
  null
> {
  abstract draw(
    context: CanvasRenderingContext2D,
    signal?: AbortSignal,
  ): Promise<void>;
}
