import type { Painter } from "../painters";

interface LayerRendererFn<Props> {
  (props: Props): Promise<Painter<any>>;
}

export interface LayerRenderer<Props> {
  (): LayerRendererFn<Props>;
}
