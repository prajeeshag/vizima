import { createZarrDatasetAgent, DataVarMeta } from "./components/dataset";
import {
  createLandRenderer,
  createColorMapRenderer,
  createGraticuleRenderer,
} from "./layer-renderers";
import { MapView } from "./map-view/map-view";
import {
  defineColorScale,
  type ColorScaleDynamic,
  type ColorScaleStatic,
} from "./colorscale";
import { styleRegistry } from "./styles";
import type { ViewProjection } from "./components/projection";
import {
  createGridSelector,
  createColorScaleController,
  createProjectionSelector,
  createTimeSlider,
  createPlayButton,
} from "./ui";
import {
  createStore,
  shallowEqual,
  watchSelector,
  type Store,
} from "./state/store";
import { createColorBar } from "./ui/colorbar";

const landUrl = "/land-110m.json";

const datasetAgent = createZarrDatasetAgent();
const dset = await datasetAgent.get({ url: "/dataset.zarr" });

const mapdiv1 = document.createElement("div");
document.body.appendChild(mapdiv1);

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

function minmaxManual(array: Float32Array): [number, number] {
  return [210, 310];
}

const initialColorScale: ColorScaleDynamic = defineColorScale({
  name: "Plasma",
  reverse: false,
  clamp: true,
  // domain: (props) => minmax(props.grid.value),
  domain: (props) => [210, 310],
});

const initialProjection: ViewProjection = { name: "Orthographic" };

type GridSelection = { varKey: string; level: string };

type ColorMapProps = {
  selection: GridSelection;
  colorScale: ColorScaleDynamic;
};

type ColorBarProps = {
  gridMeta: DataVarMeta;
  scale: ColorScaleStatic;
};

type AppState = {
  landUrl: string;
  timeStep: number;
  projection: ViewProjection;
  colorMap: ColorMapProps;
  colorBar: ColorBarProps | null;
  playing: boolean;
};

const selectVisualState = (s: AppState) => ({
  projection: s.projection,
  timeStep: s.timeStep,
  colorMap: s.colorMap,
  landUrl: s.landUrl,
});

type Action =
  | { type: "play/changed"; playing: boolean }
  | { type: "time/changed"; timeStep: number }
  | { type: "projection/changed"; projection: ViewProjection }
  | { type: "colormap/grid/changed"; selection: GridSelection }
  | { type: "colormap/colorscale/changed"; colorScale: ColorScaleDynamic }
  | { type: "colorbar/changed"; colorBar: ColorBarProps };

function assertNever(x: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(x)}`);
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "play/changed":
      return { ...state, playing: action.playing };
    case "time/changed":
      return { ...state, timeStep: action.timeStep };
    case "projection/changed":
      return { ...state, projection: action.projection };
    case "colormap/grid/changed":
      return {
        ...state,
        colorMap: { ...state.colorMap, selection: action.selection },
      };
    case "colormap/colorscale/changed":
      return {
        ...state,
        colorMap: { ...state.colorMap, colorScale: action.colorScale },
      };
    case "colorbar/changed":
      return {
        ...state,
        colorBar: action.colorBar,
      };
    default:
      return assertNever(action);
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
    playing: false,
    colorMap: {
      colorScale: initialColorScale,
      selection: seedSelection,
    },
    colorBar: null,
  },
  reducer,
});

const numTimes = () => dset.getTimeAxis("prate")!.length;

const colorMapRenderer = createColorMapRenderer({
  callback: (props) => {
    store.dispatch({
      type: "colorbar/changed",
      colorBar: {
        scale: props.colorScale,
        gridMeta: props.props.gridMeta,
      },
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

const view = new MapView([800, 600], initialProjection, CS, mapdiv1);

const render = async (state: AppState) => {
  view.setProjection(state.projection);
  const { varKey, level } = state.colorMap.selection;
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
        colorScale: state.colorMap.colorScale,
        numTimeSteps: numTimes(),
      },
    ],
  });
};

function createAnimationManager(
  store: Store<AppState, Action>,
  render: (s: AppState) => Promise<void>,
  numTimes: () => number,
) {
  let rafId: number | null = null;
  let lastFrameTime: number | null = null;

  const playbackRate = 0.5;

  // fixed simulation step (seconds of animation time per real second)
  const FIXED_STEP = 1 / 60; // controls smoothness
  const MAX_ACCUM = 0.5; // prevents spiral of death if rendering stalls

  let accumulator = 0;

  const animate = async (now: number) => {
    const state = store.getState();

    if (!state.playing) {
      rafId = null;
      lastFrameTime = null;
      accumulator = 0;
      return;
    }

    if (lastFrameTime === null) lastFrameTime = now;

    const frameDt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    accumulator += frameDt;
    if (accumulator > MAX_ACCUM) accumulator = MAX_ACCUM;

    let nextTime = state.timeStep;

    while (accumulator >= FIXED_STEP) {
      nextTime += playbackRate * FIXED_STEP;
      accumulator -= FIXED_STEP;
    }

    nextTime = nextTime % (numTimes() - 1);

    store.dispatch({ type: "time/changed", timeStep: nextTime });
    await render({ ...state, timeStep: nextTime });

    rafId = requestAnimationFrame(animate);
  };

  return {
    start() {
      if (rafId === null) rafId = requestAnimationFrame(animate);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastFrameTime = null;
      accumulator = 0;
    },
    isRunning() {
      return rafId !== null;
    },
  };
}

const animation = createAnimationManager(store, render, numTimes);

const selectPlayback = (s: AppState) => s.playing;

watchSelector(
  store,
  selectVisualState,
  () => {
    if (!store.getState().playing) {
      render(store.getState());
    }
  },
  shallowEqual,
);

watchSelector(store, selectPlayback, (playing) => {
  if (playing) animation.start();
  else animation.stop();
});

const subscribeBridge = (listener: () => void) =>
  store.subscribe(() => listener());

const colorbardiv = document.createElement("div");
document.body.appendChild(colorbardiv);

createColorBar(colorbardiv, {
  ticks: 5,
  orientation: "horizontal",
  value: () => store.getState().colorBar,
  subscribe: subscribeBridge,
});

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
  value: () => store.getState().colorMap.selection,
  subscribe: subscribeBridge,
  onChange: (selection) =>
    store.dispatch({ type: "colormap/grid/changed", selection }),
});

const csdiv = document.createElement("div");
document.body.appendChild(csdiv);
createColorScaleController(csdiv, {
  value: () => store.getState().colorMap.colorScale,
  subscribe: subscribeBridge,
  onChange: (colorScale) =>
    store.dispatch({ type: "colormap/colorscale/changed", colorScale }),
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

store.dispatch({ type: "colormap/grid/changed", selection: seedSelection });

styleRegistry.inject();
