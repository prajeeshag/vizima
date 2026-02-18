import { createZarrDatasetAgent, DataVarMeta } from "./components/dataset";
import {
  createLandRenderer,
  createColorMapRenderer,
  createGraticuleRenderer,
  type LandRendererProps,
  type GraticuleRendererProps,
  type ColorMapRendererProps,
} from "./static-renderers";
import { MapView } from "./map-view/map-view";
import {
  defineColorScale,
  type ColorScaleDynamic,
  type ColorScaleStatic,
} from "./colorscale";
import { styleRegistry } from "./styles";
import type { ProjectorState, ViewProjection } from "./components/projection";
import {
  createGridSelector,
  createColorScaleController,
  createProjectionSelector,
  createTimeSlider,
  createPlayButton,
} from "./ui";

import { createStore, watchSelector, type Store } from "./state/store";
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
  domain: (props) => minmax(props.grid.value),
  // domain: (props) => [210, 310],
});

const initialProjection: ViewProjection = { name: "Orthographic" };

type GridSelection = { name: string; level: string };

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
  projectorState: ProjectorState | null;
  mapInteracting: boolean;
};

type Action =
  | { type: "play/changed"; playing: boolean }
  | { type: "time/changed"; timeStep: number }
  | { type: "projection/changed"; projection: ViewProjection }
  | { type: "projectorState/changed"; projectorState: ProjectorState }
  | { type: "colormap/grid/changed"; selection: GridSelection }
  | { type: "colormap/colorscale/changed"; colorScale: ColorScaleDynamic }
  | { type: "colorbar/changed"; colorBar: ColorBarProps }
  | { type: "mapInteracting/changed"; mapInteracting: boolean };

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
    case "projectorState/changed":
      return {
        ...state,
        projectorState: action.projectorState,
      };
    case "mapInteracting/changed":
      return {
        ...state,
        mapInteracting: action.mapInteracting,
      };
    default:
      return assertNever(action);
  }
}

const seedVarKey = "air";
const seedVertAxis = dset.getVertAxis(seedVarKey);

const seedSelection: GridSelection = {
  name: seedVarKey,
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
    projectorState: null,
    mapInteracting: false,
  },
  reducer,
});

const numTimes = () => dset.getTimeAxis("prate")!.length;

const viewSize: [number, number] = [800, 600];
const view = new MapView(viewSize, mapdiv1);

const onMapInteract = (e: ProjectorState) => {
  store.dispatch({
    type: "mapInteracting/changed",
    mapInteracting: true,
  });
  store.dispatch({
    type: "projectorState/changed",
    projectorState: e,
  });
};

const onMapInteractEnd = (e: ProjectorState) => {
  store.dispatch({
    type: "mapInteracting/changed",
    mapInteracting: false,
  });
  store.dispatch({
    type: "projectorState/changed",
    projectorState: e,
  });
};

view.on("drag", onMapInteract);
view.on("dragEnd", onMapInteractEnd);
view.on("zoom", onMapInteract);
view.on("zoomEnd", onMapInteractEnd);
view.on("projectionUpdate", onMapInteractEnd);

watchSelector(
  store,
  (s) => ({ projection: s.projection }),
  ({ projection }) => {
    view.setProjection(projection);
  },
);

const selectLandGraticuleState = (s: AppState) => ({
  landUrl: s.landUrl,
  projectorState: s.projectorState,
});

function getLandRendererProps(): LandRendererProps {
  const { landUrl, projectorState } = selectLandGraticuleState(
    store.getState(),
  );
  if (!projectorState) {
    throw new Error("Projector state is not defined");
  }
  return {
    projectorState,
    landJsonUrl: landUrl,
  };
}

function getGraticuleRendererProps(): GraticuleRendererProps {
  const { projectorState } = selectLandGraticuleState(store.getState());
  if (!projectorState) {
    throw new Error("Projector state is not defined");
  }
  return {
    projectorState,
  };
}

const selectColorMapState = (s: AppState) => ({
  timeStep: s.timeStep,
  colorMap: s.colorMap,
  projectorState: s.projectorState,
});

function getColorMapRendererProps(): ColorMapRendererProps {
  const { colorMap, projectorState, timeStep } = selectColorMapState(
    store.getState(),
  );
  const { name: varKey, level } = colorMap.selection;
  const vertAxis = dset.getVertAxis(varKey);
  const vertIndex = vertAxis ? vertAxis.indexOf(level) : undefined;
  const url = dset.getUrl(varKey);
  const latAxis = dset.getLatAxis(varKey);
  const lonAxis = dset.getLonAxis(varKey);
  const gridMeta = dset.getGridMeta(varKey);
  if (!gridMeta || !latAxis || !lonAxis || !url || !projectorState) {
    throw new Error("Missing required data for color map rendering");
  }
  return {
    url,
    projectorState,
    viewSize,
    latAxis,
    lonAxis,
    gridProj: dset.getGridProj(),
    gridMeta,
    timeIndex: timeStep,
    vertIndex,
    colorScale: colorMap.colorScale,
    numTimeSteps: numTimes(),
  };
}

const landRenderer = createLandRenderer({ getProps: getLandRendererProps });
const graticuleRenderer = createGraticuleRenderer({
  getProps: getGraticuleRendererProps,
});
const colorMapRenderer = createColorMapRenderer({
  getProps: getColorMapRendererProps,
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

const colorMapLayer = view.addLayer([colorMapRenderer]);
const landGraticuleLayer = view.addLayer([landRenderer, graticuleRenderer]);

watchSelector(store, selectColorMapState, () => {
  const { playing, mapInteracting } = store.getState();
  if (!playing && !mapInteracting) {
    colorMapLayer.render();
  }
});

watchSelector(
  store,
  (s: AppState) => ({
    mapInteracting: s.mapInteracting,
  }),
  ({ mapInteracting }) => {
    if (mapInteracting) {
      colorMapLayer.hide();
    }
  },
);

watchSelector(store, selectLandGraticuleState, () => {
  landGraticuleLayer.render();
});

function createTimeAnimationManager(
  layers: { render: () => Promise<void> }[],
  numTimes: () => number,
  currentTime: () => number,
  updateTime: (time: number) => void,
) {
  let rafId: number | null = null;
  let lastFrameTime: number | null = null;

  const playbackRate = 0.5;

  // fixed simulation step (seconds of animation time per real second)
  const FIXED_STEP = 1 / 60; // controls smoothness
  const MAX_ACCUM = 0.5; // prevents spiral of death if rendering stalls

  let accumulator = 0;
  let running = false;

  const animate = async (now: number) => {
    if (lastFrameTime === null) lastFrameTime = now;

    const frameDt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    accumulator += frameDt;
    if (accumulator > MAX_ACCUM) accumulator = MAX_ACCUM;

    let nextTime = currentTime();

    while (accumulator >= FIXED_STEP) {
      nextTime += playbackRate * FIXED_STEP;
      accumulator -= FIXED_STEP;
    }

    nextTime = nextTime % (numTimes() - 1);

    updateTime(nextTime);
    store.dispatch({ type: "time/changed", timeStep: nextTime });
    await Promise.all(layers.map((layer) => layer.render()));
    if (!running) return;
    rafId = requestAnimationFrame(animate);
  };

  return {
    start() {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(animate);
      }
    },
    stop() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastFrameTime = null;
      accumulator = 0;
    },
    isRunning() {
      return running;
    },
  };
}

const timeAnimation = createTimeAnimationManager(
  [colorMapLayer],
  numTimes,
  () => store.getState().timeStep,
  (time) => store.dispatch({ type: "time/changed", timeStep: time }),
);

watchSelector(
  store,
  (s) => {
    return { playing: s.playing };
  },
  ({ playing }) => {
    if (playing) {
      timeAnimation.start();
    } else {
      timeAnimation.stop();
    }
  },
);

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
  varset: { vars: dset.dataVars(), verticals: dset.verticals() },
  value: () => store.getState().colorMap.selection,
  subscribe: subscribeBridge,
  onChange: (selection) =>
    store.dispatch({ type: "colormap/grid/changed", selection }),
});

const vecdiv = document.createElement("div");
document.body.appendChild(vecdiv);
createGridSelector(vecdiv, {
  varset: { vars: dset.vectorVars(), verticals: dset.verticals() },
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

styleRegistry.inject();
view.setProjection(initialProjection);
