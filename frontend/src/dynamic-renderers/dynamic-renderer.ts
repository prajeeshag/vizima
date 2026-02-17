import type { Painter } from "../components/painters";

export interface StaticRenderer<Props> {
  (props: Props): Promise<Painter<any>>;
}
