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
  createTimeSlider,
  createPlayButton,
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

type GridSelection = { varKey: string; level: string };

type AppState = {
  landUrl: string;
  timeStep: number;
  projection: ViewProjection;
  selection: GridSelection;
  colorScale: ColorScaleDynamic;
  playing: boolean;
};

type Action =
  | { type: "play/changed"; playing: boolean }
  | { type: "time/changed"; timeStep: number }
  | { type: "grid/changed"; selection: GridSelection }
  | { type: "projection/changed"; projection: ViewProjection }
  | { type: "colorscale/changed"; colorScale: ColorScaleDynamic };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "play/changed":
      return { ...state, playing: action.playing };
    case "time/changed":
      return { ...state, timeStep: action.timeStep };
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
const seedVertAxis = dset.getVertAxis(seedVarKey);

const seedSelection: GridSelection = {
  varKey: seedVarKey,
  level: seedVertAxis?.[0] ?? "",
};

const store = createStore<AppState, Action>({
  initialState: {
    landUrl,
    timeStep: 0,
    projection: initialProjection,
    selection: seedSelection,
    colorScale: initialColorScale,
    playing: false,
  },
  reducer,
});

const numTimes = () => dset.getTimeAxis("prate")!.length;

const render = async (state: AppState) => {
  view.setProjection(state.projection);
  const { varKey, level } = state.selection;
  const vertAxis = dset.getVertAxis(varKey);
  const vertIndex = vertAxis ? vertAxis.indexOf(level) : undefined;
  const url = dset.getUrl(varKey);
  const latAxis = dset.getLatAxis(varKey);
  const lonAxis = dset.getLonAxis(varKey);
  const gridMeta = dset.getGridMeta(varKey);

  if (!url || !latAxis || !lonAxis || !gridMeta) return;
  await view.render({
    landgraticule: [{}, { landJsonUrl: state.landUrl }],
    colormap: [
      {
        url,
        latAxis,
        lonAxis,
        gridProj: dset.getGridProj(),
        gridMeta,
        timeIndex: state.timeStep,
        vertIndex,
        colorScale: state.colorScale,
      },
    ],
  });
};

let rafId: number | null = null;
let lastFrameTime: number | null = null;
let playbackRate = 1;

const animate = async (now: number) => {
  const state = store.getState(); // or however you access current state
  if (!state.playing) {
    rafId = null;
    lastFrameTime = null;
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = now;
  }

  const dt = (now - lastFrameTime) / 1000; // seconds
  lastFrameTime = now;

  const nextTime = (state.timeStep + playbackRate * dt) % numTimes();

  store.dispatch({ type: "time/changed", timeStep: nextTime });

  await render({ ...state, timeStep: nextTime });

  rafId = requestAnimationFrame(animate);
};

store.subscribe((state, action) => {
  const isAnimationTick = action.type === "time/changed";
  const isPlayToggle = action.type === "play/changed";
  // any non-animation action while playing → stop playback
  if (state.playing && !isAnimationTick && !isPlayToggle) {
    store.dispatch({ type: "play/changed", playing: false });
    return;
  }
  if (state.playing) {
    if (rafId === null) {
      rafId = requestAnimationFrame(animate);
    }
  } else {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    render(state);
  }
});

store.dispatch({ type: "grid/changed", selection: seedSelection });

const subscribeBridge = (listener: () => void) =>
  store.subscribe(() => listener());

const projdiv = document.createElement("div");
document.body.appendChild(projdiv);

createProjectionSelector(projdiv, {
  value: () => store.getState().projection,
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

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
  });

const timediv = document.createElement("div");
document.body.appendChild(timediv);
createTimeSlider(timediv, {
  numTimes: numTimes,
  ticks: () => dset.getTimeAxis("prate")!.map((t, i) => i),
  tickLabels: () => dset.getTimeAxis("prate")!.map((t) => formatTime(t)),
  value: () => store.getState().timeStep,
  subscribe: subscribeBridge,
  onChange: (timeStep) => store.dispatch({ type: "time/changed", timeStep }),
});

const playButtondiv = document.createElement("div");
document.body.appendChild(playButtondiv);
createPlayButton(playButtondiv, {
  value: () => store.getState().playing,
  subscribe: subscribeBridge,
  onChange: (playing) => store.dispatch({ type: "play/changed", playing }),
});
styleRegistry.inject();
