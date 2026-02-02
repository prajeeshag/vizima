import type { Painter } from "../painters";

export interface Layer {
  getPainter(props: any): Promise<Painter<any>>;
}
