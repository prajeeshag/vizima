import type { Painter } from "../components/painters";

export interface LayerRenderer<Props> {
  (props: Props): Promise<Painter<any>>;
}

export interface CreateLayerRenderer<Props> {
  (props?: any): LayerRenderer<Props>;
}
