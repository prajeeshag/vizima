import { Globe } from "./components/projection/globe";
import {
  createGraticulePainter,
  createLandPainter,
  createPColorPainter,
} from "./components/painters";
import { jsonDataAgent } from "./components/json-data";
import { createGridAgent, GridAgent } from "./components/grid-data";
import { createPixelAgent, PixelAgent } from "./components/pixel-field";
import { Canvas } from "./components/canvas";
import * as d3 from "d3-selection";
import type { ProjectorState } from "./components/projection";
import { Dataset, createZarrDatasetAgent } from "./components/dataset";
import { Projection } from "./components/projection";

const landUrl = "/land-110m.json";
const datasetAgent = createZarrDatasetAgent();
const dataset = await datasetAgent.get({ url: "/dataset.zarr" });
const landJson = await jsonDataAgent.get({ url: landUrl });

export class MapViz {
  canvas: Canvas;
  gridAgent: GridAgent;
  pixelAgent: PixelAgent;
  constructor(
    readonly container: HTMLDivElement,
    readonly viewSize: [number, number],
    projection: Projection,
    private varName: string,
  ) {
    this.container.classList.add("canvas-stack");
    const globe = new Globe(projection, viewSize);
    this.canvas = new Canvas(this.viewSize[0], this.viewSize[1], []);
    this.container.appendChild(this.canvas.canvas);
    this.gridAgent = createGridAgent();
    this.pixelAgent = createPixelAgent();
    this.setupInteractions(globe);
    this.render(globe.getProjState(), varName);
  }

  async renderStatic(proj: ProjectorState) {
    const landPainter = createLandPainter({
      proj: proj,
      landJson: landJson,
    });

    const graticulePainter = createGraticulePainter({
      proj: proj,
    });

    this.canvas.clearPainters();
    this.canvas.addPainter(landPainter);
    this.canvas.addPainter(graticulePainter);
    await this.canvas.paint();
  }

  async render(proj: ProjectorState, varName: string) {
    const varConfig = dataset.getVarConfig(varName);

    const grid = await this.gridAgent.get({
      proj: proj,
      viewSize: this.viewSize,
      ...varConfig,
      timeIndex: 0,
    });

    const landPainter = createLandPainter({
      proj: proj,
      landJson: landJson,
    });

    const graticulePainter = createGraticulePainter({
      proj: proj,
    });

    const field = await this.pixelAgent.get({
      grid: grid,
    });

    const pcolorPainter = createPColorPainter({
      field: field,
    });

    this.canvas.clearPainters();
    this.canvas.addPainter(pcolorPainter);
    this.canvas.addPainter(landPainter);
    this.canvas.addPainter(graticulePainter);
    await this.canvas.paint();
  }

  setupInteractions(globe: Globe) {
    const dragHandler = globe.dragHandler(
      (globe) => this.renderStatic(globe),
      (globe) => this.render(globe, this.varName),
    );
    const zoomHandler = globe.zoomHandler(
      (globe) => this.renderStatic(globe),
      (globe) => this.render(globe, this.varName),
    );
    d3.select(this.canvas.canvas).call(dragHandler).call(zoomHandler);
  }
}

const mapdiv1 = document.createElement("div");
document.body.appendChild(mapdiv1);
const map1 = new MapViz(
  mapdiv1,
  [800, 600],
  { name: "Equirectangular" },
  "air",
);

const mapdiv2 = document.createElement("div");
document.body.appendChild(mapdiv2);
const map2 = new MapViz(mapdiv2, [800, 600], { name: "Orthographic" }, "prate");
