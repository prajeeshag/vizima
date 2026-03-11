import type { Painter } from "./painter";

export interface StaticRenderer {
  (): Promise<Painter<any>>;
}
