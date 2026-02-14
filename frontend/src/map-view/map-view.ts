import * as d3 from "d3";
import { styleRegistry } from "../styles";
import { CanvasElement, createCanvas } from "../components/canvas-element";
import { createPaintCanvasAgent } from "../components/canvas-renderer";
import {
  ProjectionController,
  Projection,
  type ProjectorState,
} from "../components/projection";
import { type UniqueCanvasStack, type ExtractProps } from "./types";
import type {
  ColorMapRenderer,
  LandRenderer,
  GraticuleRenderer,
} from "../layer-renderers";
import equal from "fast-deep-equal";

const className = "vizima-mapview-canvas-stack";

type Renderer = ColorMapRenderer | LandRenderer | GraticuleRenderer;

type CanvasProps = {
  id: string;
  renderers: readonly Renderer[];
  visibleOn: "interact" | "always" | "main";
  disable: boolean;
};

export type CanvasStack = readonly CanvasProps[];

export class MapView<CS extends UniqueCanvasStack<CanvasStack>> {
  readonly div;
  private paintCanvasAgent;
  private globe: ProjectionController;
  private canvases = new Map<string, CanvasElement>();
  private painterProps?: ExtractProps<CS>;
  private interactCanvas: CanvasElement;

  constructor(
    private viewSize: [number, number],
    private projection: Projection,
    private canvasStack: CS & UniqueCanvasStack<CS>,
    div?: HTMLDivElement,
  ) {
    this.div = div || document.createElement("div");
    this.div.classList.add(className);
    styleRegistry.register("mapview", styles);
    this.paintCanvasAgent = createPaintCanvasAgent();

    this.globe = new ProjectionController(projection, viewSize);

    this.interactCanvas = createCanvas();
    this.div.appendChild(this.interactCanvas.value);

    this.setupInteractions();

    for (const props of canvasStack) {
      const canvas = createCanvas();
      this.canvases.set(props.id, canvas);
      this.div.appendChild(canvas.value);
    }
  }

  setProjection(projection: Projection) {
    if (!equal(this.projection, projection)) {
      this.projection = projection;
      this.globe = new ProjectionController(projection, this.viewSize);
      this.setupInteractions();
    }
  }

  private setupInteractions() {
    this.paintCanvasAgent.get({
      canvas: this.interactCanvas,
      painters: [],
      viewSize: this.viewSize,
    });

    const dragHandler = this.globe.dragHandler(
      (proj) => this.renderInteract(proj),
      (proj) => this.renderMain(proj),
    );
    const zoomHandler = this.globe.zoomHandler(
      (proj) => this.renderInteract(proj),
      (proj) => this.renderMain(proj),
    );
    d3.select(this.interactCanvas.value).call(dragHandler).call(zoomHandler);
  }

  async render(props: ExtractProps<CS>) {
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
      await this._render(proj, canvas, props.renderers, painterProps);
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
      await this._render(proj, canvas, props.renderers, painterProps);
      canvas.show();
    }
  }

  private async _render(
    proj: ProjectorState,
    canvas: CanvasElement,
    painterFns: readonly Renderer[],
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

const styles = `
  .${className} {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
      /* Ensure the container matches the canvas size */
      width: fit-content;
  }
  .${className} > canvas {
      grid-area: 1 / 1 / 2 / 2; /* All canvases start at row 1, col 1 */
      pointer-events: none;     /* Do not allow interaction */
  }
  /* Except for the first canvas */
  .${className} > canvas:first-child {
    pointer-events: auto;
  }
  `;
