import * as d3 from "d3";
import { injectStyles, className } from "../styles";
import { CanvasElement, createCanvas } from "./canvas-element";
import { createPaintCanvasAgent } from "./canvas-renderer";
import {
  ProjectionController,
  Projection,
  type ProjectorState,
} from "./projection";
import { Painter } from "./painters";
import type { Expand } from "./type-helpers";

type IdOf<T> = T extends { id: infer I } ? I : never;

type HasDuplicate<T extends readonly any[], Seen = never> = T extends readonly [
  infer H,
  ...infer R,
]
  ? IdOf<H> extends Seen
    ? true
    : HasDuplicate<R, Seen | IdOf<H>>
  : false;

type UniqueCanvasStack<T extends readonly { id: string }[]> =
  HasDuplicate<T> extends true ? never : T;

interface PainterFns {
  (props: any): Promise<Painter<any>> | Painter<any>;
}

type CanvasProps = {
  id: string;
  painters: readonly PainterFns[];
  visibleOn: "interact" | "always" | "main";
  disable: boolean;
};

export type CanvasStack = readonly Expand<CanvasProps>[];

type ExtractProps<T> = T extends readonly [
  ...infer Layers extends readonly { painters: readonly unknown[] }[],
]
  ? {
      [I in keyof Layers]: Layers[I]["painters"] extends readonly [...infer P]
        ? {
            [J in keyof P]: P[J] extends (props: infer Props) => any
              ? Expand<Omit<Props, "proj" | "viewSize">>
              : never;
          }
        : never;
    }
  : never;

type ExtractPropsKeyed<T> = T extends readonly [
  ...infer Layers extends readonly {
    id: PropertyKey;
    painters: readonly unknown[];
  }[],
]
  ? {
      [L in Layers[number] as L["id"]]: L["painters"] extends readonly [
        ...infer P,
      ]
        ? {
            [J in keyof P]: P[J] extends (props: infer Props) => any
              ? Expand<Omit<Props, "proj" | "viewSize">>
              : never;
          }
        : never;
    }
  : never;

export class MapView<CS extends CanvasStack> {
  readonly div;
  private paintCanvasAgent;
  private globe: ProjectionController;
  private canvases = new Map<string, CanvasElement>();
  private painterProps?: ExtractPropsKeyed<CS>;

  constructor(
    readonly viewSize: [number, number],
    readonly projection: Projection,
    readonly canvasStack: CS,
    div?: HTMLDivElement,
  ) {
    this.div = div || document.createElement("div");
    this.div.classList.add(className);
    injectStyles();
    this.paintCanvasAgent = createPaintCanvasAgent();
    this.globe = new ProjectionController(projection, viewSize);

    this.setupInteractions();

    for (const props of canvasStack) {
      const canvas = createCanvas();
      this.canvases.set(props.id, canvas);
      this.div.appendChild(canvas.value);
    }
  }

  private setupInteractions() {
    const canvas = createCanvas();
    this.paintCanvasAgent.get({
      canvas: canvas,
      painters: [],
      viewSize: this.viewSize,
    });
    this.div.appendChild(canvas.value);

    const dragHandler = this.globe.dragHandler(
      (proj) => this.renderInteract(proj),
      (proj) => this.renderMain(proj),
    );
    const zoomHandler = this.globe.zoomHandler(
      (proj) => this.renderInteract(proj),
      (proj) => this.renderMain(proj),
    );
    d3.select(canvas.value).call(dragHandler).call(zoomHandler);
  }

  async render(props: ExtractPropsKeyed<CS>) {
    this.painterProps = props;
    await this.renderMain(this.globe.getProjState());
  }

  private async renderMain(proj: ProjectorState) {
    for (let i = 0; i < this.canvasStack.length; i++) {
      const props = this.canvasStack[i]!;
      const canvas = this.canvases.get(props.id)!;
      const painterProps = this.painterProps![props.id];
      if (props.visibleOn === "interact" || props.disable) {
        canvas.hide();
        continue;
      }
      await this._render(proj, canvas, props.painters, painterProps);
      canvas.show();
    }
  }

  private async renderInteract(proj: ProjectorState) {
    for (let i = 0; i < this.canvasStack.length; i++) {
      const props = this.canvasStack[i]!;
      const canvas = this.canvases.get(props.id)!;
      const painterProps = this.painterProps![props.id];
      if (props.visibleOn === "main") {
        canvas.hide();
        continue;
      }
      await this._render(proj, canvas, props.painters, painterProps);
      canvas.show();
    }
  }

  private async _render(
    proj: ProjectorState,
    canvas: CanvasElement,
    painterFns: readonly PainterFns[],
    painterProps: any,
  ) {
    const painters = await Promise.all(
      painterFns.map((fn, i) =>
        fn({ viewSize: this.viewSize, proj: proj, ...painterProps[i] }),
      ),
    );

    await this.paintCanvasAgent.get({
      canvas: canvas,
      painters: painters,
      viewSize: this.viewSize,
    });
  }
}
