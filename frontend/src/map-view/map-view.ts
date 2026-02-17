import * as d3 from "d3";
import { styleRegistry } from "../styles";
import {
  ProjectionController,
  Projection,
  type ProjectorState,
} from "../components/projection";
import type { StaticRenderer } from "../static-renderers";
import { createCanvas } from "../components/canvas-element";
import { createRenderedCanvasAgent } from "../components/rendered-canvas";

interface Layer {
  render: () => Promise<void>;
  show: () => void;
  hide: () => void;
}

const className = "vizima-mapview-canvas-stack";

type MapViewEvents = {
  projectionUpdate: ProjectorState;
  drag: ProjectorState;
  dragEnd: ProjectorState;
  zoom: ProjectorState;
  zoomEnd: ProjectorState;
  resize: [number, number];
  resizeEnd: [number, number];
};

type Listener<T> = (value: T) => void;
type Unsubscribe = () => void;

class TypedEmitter<E extends Record<string, any>> {
  private listeners = new Map<keyof E, Set<Listener<any>>>();

  on<K extends keyof E>(type: K, fn: Listener<E[K]>): Unsubscribe {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof E>(type: K, value: E[K]): void {
    this.listeners.get(type)?.forEach((fn) => fn(value));
  }
}

export class MapView {
  private readonly div;
  private interactCanvas: HTMLCanvasElement;
  private resizeObserver?: ResizeObserver;
  private resizeRAF: number | null = null;
  private resizeEndTimer: number | null = null;
  private readonly events = new TypedEmitter<MapViewEvents>();

  constructor(
    private viewSize: [number, number],
    div?: HTMLDivElement,
  ) {
    this.div = div || document.createElement("div");
    this.div.classList.add(className);
    styleRegistry.register("mapview", styles);
    this.interactCanvas = document.createElement("canvas");
    this.div.appendChild(this.interactCanvas);
  }

  on = this.events.on.bind(this.events);

  addLayer(renderers: StaticRenderer[]): Layer {
    const canvasElement = createCanvas();
    this.div.appendChild(canvasElement.value);
    const canvasRendererAgent = createRenderedCanvasAgent();
    return {
      render: async ({ show }: { show: boolean } = { show: true }) => {
        const painters = await Promise.all(
          renderers.map((renderer) => renderer()),
        );
        await canvasRendererAgent.get({
          painters,
          canvas: canvasElement,
          viewSize: this.viewSize,
        });
        if (show) {
          canvasElement.show();
        }
      },
      show: () => {
        canvasElement.show();
      },
      hide: () => {
        canvasElement.hide();
      },
    };
  }

  setProjection(projection: Projection) {
    const globe = new ProjectionController(projection, this.viewSize);
    const canvas = this.interactCanvas;
    canvas.width = this.viewSize[0];
    canvas.height = this.viewSize[1];
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dragHandler = globe.dragHandler(
      (proj) => this.events.emit("drag", proj),
      (proj) => this.events.emit("dragEnd", proj),
    );
    const zoomHandler = globe.zoomHandler(
      (proj) => this.events.emit("zoom", proj),
      (proj) => this.events.emit("zoomEnd", proj),
    );
    d3.select(this.interactCanvas).call(dragHandler).call(zoomHandler);

    this.events.emit("projectionUpdate", globe.getProjState());
  }

  private observeResize() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0]!.contentRect;

      if (this.resizeRAF === null) {
        this.resizeRAF = requestAnimationFrame(() => {
          this.resizeRAF = null;
          this.events.emit("resize", [Math.round(width), Math.round(height)]);
        });
      }

      if (this.resizeEndTimer) clearTimeout(this.resizeEndTimer);
      this.resizeEndTimer = window.setTimeout(() => {
        this.events.emit("resizeEnd", [Math.round(width), Math.round(height)]);
      }, 150);
    });

    this.resizeObserver.observe(this.div);
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
