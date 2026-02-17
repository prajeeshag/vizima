import type { Painter } from "../components/painters";

export interface StaticRenderer {
  (): Promise<Painter<any>>;
}
