import { createZarrDatasetAgent } from "./components/dataset";
import {
  createLandRenderer,
  createColorMapRenderer,
  createGraticuleRenderer,
} from "./layer-renderers";
import { MapView } from "./map-view/map-view";
import { defineColorScale, type ColorScaleDynamic } from "./colorscale";
import { styleRegistry } from "./styles";
import { createColorBarRender } from "./colorbar/colorbar";
import type { ViewProjection } from "./components/projection";
import {
  createGridSelector,
  createColorScaleController,
  createProjectionSelector,
} from "./controllers";
import { createStore } from "./state/store";

const landUrl = "/land-110m.json";

const datasetAgent = createZarrDatasetAgent();
const dset = await datasetAgent.get({ url: "/dataset.zarr" });

const mapdiv1 = document.createElement("div");
document.body.appendChild(mapdiv1);

const colorbardiv1 = document.createElement("div");
document.body.appendChild(colorbardiv1);

const renderColorBar = createColorBarRender();

const colorMapRenderer = createColorMapRenderer({
  callback: (props) => {
    renderColorBar(colorbardiv1, {
      scale: props.colorScale,
      orientation: "horizontal",
      units: `${props.props.gridMeta.units}`,
      label: `${props.props.gridMeta.standard_name}`,
      ticks: 5,
    });
  },
});

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

const initialColorScale: ColorScaleDynamic = defineColorScale({
  name: "Plasma",
  reverse: false,
  clamp: true,
  domain: (props) => minmax(props.grid.value),
});

const initialProjection: ViewProjection = { name: "Orthographic" };

const view = new MapView([800, 600], initialProjection, CS, mapdiv1);

type GridSelection = { varKey: string; time: string; level: string };

type AppState = {
  landUrl: string;
  projection: ViewProjection;
  selection: GridSelection;
  colorScale: ColorScaleDynamic;
};

type Action =
  | { type: "grid/changed"; selection: GridSelection }
  | { type: "projection/changed"; projection: ViewProjection }
  | { type: "colorscale/changed"; colorScale: ColorScaleDynamic };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "grid/changed":
      return { ...state, selection: action.selection };
    case "projection/changed":
      return { ...state, projection: action.projection };
    case "colorscale/changed":
      return { ...state, colorScale: action.colorScale };
    default:
      return state;
  }
}

const seedVarKey = "air";
const seedTimeAxis = dset.getTimeAxis(seedVarKey);
const seedVertAxis = dset.getVertAxis(seedVarKey);

const seedSelection: GridSelection = {
  varKey: seedVarKey,
  time: seedTimeAxis?.[0] ?? "",
  level: seedVertAxis?.[0] ?? "",
};

const store = createStore<AppState, Action>({
  initialState: {
    landUrl,
    projection: initialProjection,
    selection: seedSelection,
    colorScale: initialColorScale,
  },
  reducer,
});

let lastProjectionName: string | undefined;

store.subscribe((state) => {
  if (state.projection.name !== lastProjectionName) {
    view.setProjection(state.projection);
    lastProjectionName = state.projection.name;
  }

  const { varKey, time, level } = state.selection;

  const timeAxis = dset.getTimeAxis(varKey);
  const vertAxis = dset.getVertAxis(varKey);

  const timeIndex = timeAxis ? timeAxis.indexOf(time) : undefined;
  const vertIndex = vertAxis ? vertAxis.indexOf(level) : undefined;

  const url = dset.getUrl(varKey);
  const latAxis = dset.getLatAxis(varKey);
  const lonAxis = dset.getLonAxis(varKey);
  const gridMeta = dset.getGridMeta(varKey);

  if (!url || !latAxis || !lonAxis || !gridMeta) return;

  view.render({
    landgraticule: [{}, { landJsonUrl: state.landUrl }],
    colormap: [
      {
        url,
        latAxis,
        lonAxis,
        gridProj: dset.getGridProj(),
        gridMeta,
        timeIndex,
        vertIndex,
        colorScale: state.colorScale,
      },
    ],
  });
});

store.dispatch({ type: "grid/changed", selection: seedSelection });

const subscribeBridge = (listener: () => void) =>
  store.subscribe(() => listener());

const projdiv = document.createElement("div");
document.body.appendChild(projdiv);

createProjectionSelector(projdiv, {
  value: () => store.getState().projection.name,
  subscribe: subscribeBridge,
  onChange: (projection) =>
    store.dispatch({ type: "projection/changed", projection }),
});

const contdiv = document.createElement("div");
document.body.appendChild(contdiv);
createGridSelector(contdiv, {
  dataset: dset,
  value: () => store.getState().selection,
  subscribe: subscribeBridge,
  onChange: (selection) => store.dispatch({ type: "grid/changed", selection }),
});

const csdiv = document.createElement("div");
document.body.appendChild(csdiv);
createColorScaleController(csdiv, {
  value: () => store.getState().colorScale,
  subscribe: subscribeBridge,
  onChange: (colorScale) =>
    store.dispatch({ type: "colorscale/changed", colorScale }),
});

styleRegistry.inject();
