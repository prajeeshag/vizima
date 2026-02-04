import { createGraticulePainter } from "./components/painters";
import { createZarrDatasetAgent } from "./components/dataset";
import {
  createLandRenderer,
  createColorMapRenderer,
} from "./components/layer-renderers";
import { MapView } from "./components/map-view";

const landUrl = "/land-110m.json";
const datasetAgent = createZarrDatasetAgent();
const dataset = await datasetAgent.get({ url: "/dataset.zarr" });
const varConfig = dataset.getVarConfig("prate");

const mapdiv1 = document.createElement("div");
document.body.appendChild(mapdiv1);

const colorMapRenderer = createColorMapRenderer();
const landRenderer = createLandRenderer();

const CS = [
  {
    id: "colormap",
    visibleOn: "main",
    painters: [colorMapRenderer],
    disable: false,
  },
  {
    id: "landgraticule",
    disable: false,
    visibleOn: "always",
    painters: [createGraticulePainter, landRenderer],
  },
] as const;

const view = new MapView([800, 600], { name: "Equirectangular" }, CS, mapdiv1);

view.render({
  landgraticule: [{}, { landJsonUrl: landUrl }],
  colormap: [{ ...varConfig, timeIndex: 1 }],
});
