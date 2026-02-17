import * as d3 from "d3";
import { styleRegistry } from "../styles";
import { CanvasElement, createCanvas } from "../components/canvas-element";
import {
  createRenderedCanvasAgent,
  RenderedCanvasAgent,
} from "../components/rendered-canvas";
import {
  ProjectionController,
  Projection,
  type ProjectorState,
} from "../components/projection";
import { type UniqueCanvasStack } from "./types";
import type { StaticRenderer } from "../static-renderers";
import equal from "fast-deep-equal";
import type { FlowAnimator } from "../components/flow-animator";

const className = "vizima-mapview-canvas-stack";

type DynamicRenderer = () => Promise<FlowAnimator>;

type CanvasProps = {
  id: string;
  renderers: readonly StaticRenderer[];
  visibleOn: "interact" | "always" | "main";
  disable: boolean;
};

type StaticCanvasProps = CanvasProps & {
  staticRenderers: readonly StaticRenderer[];
};

type DynamicCanvasProps = CanvasProps & {
  renderer: DynamicRenderer;
};

export type CanvasStack = readonly (StaticCanvasProps | DynamicCanvasProps)[];

export class MapView {
  readonly div;
  private globe: ProjectionController;
  private canvases = new Map<string, CanvasElement>();
  private renderedCanvasAgents = new Map<string, RenderedCanvasAgent>();
  private interactCanvas: CanvasElement;

  constructor(
    private viewSize: [number, number],
    private projection: Projection,
    div?: HTMLDivElement,
  ) {
    this.div = div || document.createElement("div");
    this.div.classList.add(className);
    styleRegistry.register("mapview", styles);

    this.globe = new ProjectionController(projection, viewSize);

    this.interactCanvas = createCanvas();
    this.div.appendChild(this.interactCanvas.value);

    this.setupInteractions();

    for (const props of canvasStack) {
      const canvas = createCanvas();
      const renderedCanvasAgent = createRenderedCanvasAgent();
      this.canvases.set(props.id, canvas);
      this.renderedCanvasAgents.set(props.id, renderedCanvasAgent);
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
    const renderedCanvasAgent = createRenderedCanvasAgent();
    renderedCanvasAgent.get({
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

  async render() {
    await this.renderMain(this.globe.getProjState());
  }

  private async renderMain(proj: ProjectorState) {
    for (let i = 0; i < this.canvasStack.length; i++) {
      const props = this.canvasStack[i]!;
      const canvas = this.canvases.get(props.id)!;
      const renderedCanvasAgent = this.renderedCanvasAgents.get(props.id)!;
      if (props.visibleOn === "interact" || props.disable) {
        canvas.hide();
        continue;
      }
      if ("staticRenderers" in props) {
        await this._render(
          proj,
          canvas,
          renderedCanvasAgent,
          props.staticRenderers,
        );
      }

      canvas.show();
    }
  }

  private async renderInteract(proj: ProjectorState) {
    for (let i = 0; i < this.canvasStack.length; i++) {
      const props = this.canvasStack[i]!;
      const canvas = this.canvases.get(props.id)!;
      const renderedCanvasAgent = this.renderedCanvasAgents.get(props.id)!;
      if (props.visibleOn === "main") {
        canvas.hide();
        continue;
      }
      if ("staticRenderers" in props) {
        await this._render(
          proj,
          canvas,
          renderedCanvasAgent,
          props.staticRenderers,
        );
      }
      canvas.show();
    }
  }

  private async _render(
    proj: ProjectorState,
    canvas: CanvasElement,
    renderedCanvasAgent: RenderedCanvasAgent,
    painterFns: readonly StaticRenderer[],
  ) {
    const painters = await Promise.all(painterFns.map((fn, i) => fn()));

    await renderedCanvasAgent.get({
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
