import * as d3 from "d3";
import { styleRegistry } from "../styles";
import {
  ProjectionController,
  Projection,
  type ProjectorState,
} from "../projection";
import {
  createCanvas,
  createRenderedCanvasAgent,
  type AnimationRenderer,
  type StaticRenderer,
} from "../core";
import type { Expand } from "../core/type-helpers";

export interface MapLayer {
  render: (e?: any) => Promise<void>;
  show: () => void;
  hide: () => void;
  update: () => Promise<void>;
}

const className = "vizima-mapview-canvas-stack";

type MapViewEvents = {
  change: ProjectorState;
  drag: ProjectorState;
  dragEnd: ProjectorState;
  zoom: ProjectorState;
  zoomEnd: ProjectorState;
  resize: ProjectorState;
  resizeEnd: ProjectorState;
};

type EventKeys = Expand<keyof MapViewEvents>;

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
  private readonly interactCanvas: HTMLCanvasElement;
  private readonly events = new TypedEmitter<MapViewEvents>();
  private globe: ProjectionController;

  constructor(
    private projection: Projection,
    div?: HTMLDivElement,
  ) {
    this.div = div || document.createElement("div");
    this.div.classList.add(className);
    styleRegistry.register("mapview", styles);
    this.interactCanvas = document.createElement("canvas");
    this.div.appendChild(this.interactCanvas);
    this.getResizeObserver().observe(this.div);
    this.globe = this.setGlobe([0, 0]);
  }

  on = this.events.on.bind(this.events);

  addLayer(renderers: StaticRenderer[]): MapLayer {
    const canvasElement = createCanvas();
    this.div.appendChild(canvasElement.value);
    const canvasRendererAgent = createRenderedCanvasAgent();

    const render = async ({ show }: { show: boolean } = { show: true }) => {
      const painters = await Promise.all(
        renderers.map((renderer) => renderer()),
      );
      await canvasRendererAgent.get({
        painters,
        canvas: canvasElement,
        viewSize: this.globe.getProjState().viewSize,
      });
      if (show) {
        canvasElement.show();
      }
    };
    return {
      render: render,
      show: () => {
        canvasElement.show();
      },
      hide: () => {
        canvasElement.hide();
      },
      update: async () => {
        await render();
      },
    };
  }

  addAnimationLayer(renderer: AnimationRenderer): MapLayer {
    const canvasElement = createCanvas();
    this.div.appendChild(canvasElement.value);
    return {
      render: async ({ show }: { show: boolean } = { show: true }) => {
        await renderer.render(canvasElement.value);
        if (show) {
          canvasElement.show();
        }
      },
      show: () => {
        renderer.start();
        canvasElement.show();
      },
      hide: () => {
        renderer.stop();
        canvasElement.hide();
      },
      update: async () => {
        await renderer.update();
      },
    };
  }

  setProjection(projection: Projection) {
    if (this.projection === projection) {
      return;
    }
    this.projection = projection;
    const viewSize = this.globe.getProjState().viewSize;
    this.updateGlobe(viewSize);
  }

  private updateGlobe(viewSize: readonly [number, number]) {
    this.globe = this.setGlobe(viewSize);
    this.emit(["change"]);
  }

  private setGlobe(viewSize: readonly [number, number]) {
    const globe = new ProjectionController(this.projection, viewSize);
    const canvas = this.interactCanvas;
    canvas.width = viewSize[0];
    canvas.height = viewSize[1];
    const dragHandler = globe.dragHandler(
      (p) => this.emit(["drag", "change"]),
      (p) => this.emit(["dragEnd"]),
    );
    const zoomHandler = globe.zoomHandler(
      (p) => this.emit(["zoom", "change"]),
      (p) => this.emit(["zoomEnd"]),
    );
    const sel = d3.select(this.interactCanvas);
    delete (this.interactCanvas as any).__zoom;
    sel.on(".zoom", null);
    sel.on(".drag", null);
    sel.call(dragHandler).call(zoomHandler);
    return globe;
  }

  private emit<K extends EventKeys>(types: K[]) {
    types.map((type) => {
      this.events.emit(type, this.globe.getProjState());
    });
  }

  private getResizeObserver() {
    let resizeRAF: number | null = null;
    let resizeEndTimer: number | null = null;
    return new ResizeObserver((entries) => {
      const { width, height } = entries[0]!.contentRect;
      const [w, h] = [Math.round(width), Math.round(height)];

      if (resizeRAF === null) {
        resizeRAF = requestAnimationFrame(() => {
          resizeRAF = null;
          this.globe = this.setGlobe([w, h]);
          this.emit(["resize", "change"]);
        });
      }

      if (resizeEndTimer) clearTimeout(resizeEndTimer);
      resizeEndTimer = window.setTimeout(() => {
        this.emit(["resizeEnd"]);
      }, 150);
    });
  }
}

const styles = /* css */ `
  .${className} {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    position: absolute;
    width: 100vw;
    height: 100vh;
  }
  .${className} > canvas {
    grid-area: 1 / 1 / 2 / 2; /* All canvases start at row 1, col 1 */
    pointer-events: none; /* Do not allow interaction */
  }
  /* Except for the first canvas */
  .${className} > canvas:first-child {
    pointer-events: auto;
  }
`;
