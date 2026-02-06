import { createZarrDatasetAgent } from "./components/dataset";
import {
  createLandRenderer,
  createColorMapRenderer,
  createGraticuleRenderer,
} from "./layer-renderers";
import { MapView } from "./map-view/map-view";
import type { ExtractProps } from "./map-view/types";
import { createGridSelector, createColorScaleController } from "./controllers";
import { defineColorScale, type ColorScaleDynamic } from "./colorscale";
import { styleRegistry } from "./styles";

const landUrl = "/land-110m.json";
const datasetAgent = createZarrDatasetAgent();
const dset = await datasetAgent.get({ url: "/dataset.zarr" });

const mapdiv1 = document.createElement("div");
document.body.appendChild(mapdiv1);

const colorMapRenderer = createColorMapRenderer();
const landRenderer = createLandRenderer();
const graticuleRenderer = createGraticuleRenderer();

const CS = [
  {
    id: "colormap",
    visibleOn: "main",
    renderers: [colorMapRenderer],
    disable: false,
  },
  {
    id: "landgraticule",
    disable: false,
    visibleOn: "always",
    renderers: [graticuleRenderer, landRenderer],
  },
] as const;

const view = new MapView([800, 600], { name: "Orthographic" }, CS, mapdiv1);

type Props = ExtractProps<typeof CS>;

function minmax(array: Float32Array): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (!Number.isFinite(value) || value === undefined) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

const colorScale: ColorScaleDynamic = defineColorScale({
  name: "plasma",
  reverse: false,
  clamp: true,
  domain: (props) => minmax(props.grid.value),
});

let colorMapProps: Props["colormap"][0] = {
  url: dset.getUrl("air")!,
  latAxis: dset.getLatAxis("air")!,
  lonAxis: dset.getLonAxis("air")!,
  gridProj: dset.getGridProj(),
  gridMeta: dset.getGridMeta("air")!,
  timeIndex: 0,
  vertIndex: undefined,
  colorScale: colorScale,
};

function onGridChange(selection: {
  varKey: string;
  time: string;
  level: string;
}) {
  const timeAxis = dset.getTimeAxis(selection.varKey);
  const vertAxis = dset.getVertAxis(selection.varKey);
  const timeIndex = timeAxis ? timeAxis.indexOf(selection.time) : undefined;
  const vertIndex = vertAxis ? vertAxis.indexOf(selection.level) : undefined;

  colorMapProps.url = dset.getUrl(selection.varKey)!;
  colorMapProps.latAxis = dset.getLatAxis(selection.varKey)!;
  colorMapProps.lonAxis = dset.getLonAxis(selection.varKey)!;
  colorMapProps.gridMeta = dset.getGridMeta(selection.varKey)!;
  colorMapProps.timeIndex = timeIndex;

  view.render({
    landgraticule: [{}, { landJsonUrl: landUrl }],
    colormap: [colorMapProps],
  });
}

function onColorScaleChange(value: ColorScaleDynamic) {
  colorMapProps.colorScale = value;
  view.render({
    landgraticule: [{}, { landJsonUrl: landUrl }],
    colormap: [colorMapProps],
  });
}

const contdiv = document.createElement("div");
document.body.appendChild(contdiv);
const gridSelector = createGridSelector(contdiv, {
  dataset: dset,
  onChange: onGridChange,
});

const csdiv = document.createElement("div");
document.body.appendChild(csdiv);

const colorScaleController = createColorScaleController(csdiv, {
  value: colorScale,
  onChange: onColorScaleChange,
});

styleRegistry.inject();
