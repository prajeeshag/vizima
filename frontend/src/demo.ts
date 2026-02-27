import { createZarrDatasetAgent, DataVarMeta } from "./components/dataset";
import {
  createLandRenderer,
  createColorMapRenderer,
  createGraticuleRenderer,
  type LandRendererProps,
  type GraticuleRendererProps,
  type ColorMapRendererProps,
} from "./renderers/static-renderers";
import { MapView, type MapLayer } from "./map-view/map-view";
import {
  defineColorScale,
  type ColorScaleDynamic,
  type ColorScaleStatic,
} from "./components/painters/colormap-painter";
import { styleRegistry } from "./styles";
import {
  getProjector,
  ViewProjection,
  type ProjectorState,
} from "./components/projection";

import { createStore, watchSelector } from "./state/store";
import {
  createFlowRenderer,
  type FlowRendererProps,
} from "./renderers/animation-renderers";
import { createStatusBar } from "./ui/status-bar";
import { createControlPanel } from "./ui/control-panel";
import { createJsonDataAgent } from "./components/json-data";
import { geoDistance } from "d3";

const datasetAgent = createZarrDatasetAgent();
const dset = await datasetAgent.get({ url: "/dataset.zarr" });

const mapdiv1 = document.createElement("div");
document.body.appendChild(mapdiv1);

const initialColorScale: ColorScaleDynamic = defineColorScale({
  name: "Plasma",
  reverse: false,
  clamp: true,
  domain: "pixel_range",
});

const initialProjection: ViewProjection = { name: "Orthographic" };

type GridSelection = { name: string; level: string };

type ColorMapProps = {
  selection: GridSelection;
  colorScale: ColorScaleDynamic;
};

type FlowAnimationProps = {
  selection: GridSelection;
};

type ColorBarProps = {
  gridMeta: DataVarMeta;
  scale: ColorScaleStatic;
};
const PROJECTIONS = ViewProjection.options.map((o) => ({
  name: o.shape.name.value,
}));

type AppState = {
  projectorState: ProjectorState | null;
  timeStep: number;
  projection: ViewProjection;
  colorMap: ColorMapProps;
  flowAnimation: FlowAnimationProps;
  colorBar: ColorBarProps | null;
  playing: boolean;
  mapInteracting: boolean;
};

type Action =
  | { type: "play/changed"; playing: boolean }
  | { type: "time/changed"; timeStep: number }
  | { type: "projection/changed"; projection: ViewProjection }
  | { type: "projectorState/changed"; projectorState: ProjectorState }
  | { type: "colormap/grid/changed"; selection: GridSelection }
  | { type: "flowanimation/grid/changed"; selection: GridSelection }
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
    case "flowanimation/grid/changed":
      return {
        ...state,
        flowAnimation: { ...state.flowAnimation, selection: action.selection },
      };
    default:
      return assertNever(action);
  }
}

const cmVar = "air";
const cmVertAxis = dset.getVertAxis(cmVar);
const cmSelection: GridSelection = {
  name: cmVar,
  level: cmVertAxis?.[0] ?? "",
};

const flowVar = "wind";
const flowVertAxis = dset.getVertAxis(flowVar);
const flowSelection: GridSelection = {
  name: flowVar,
  level: flowVertAxis?.[0] ?? "",
};

const store = createStore<AppState, Action>({
  initialState: {
    timeStep: 0,
    projection: initialProjection,
    playing: false,
    colorMap: {
      colorScale: initialColorScale,
      selection: cmSelection,
    },
    flowAnimation: {
      selection: flowSelection,
    },
    colorBar: null,
    projectorState: null,
    mapInteracting: false,
  },
  reducer,
});

const numTimes = () => dset.getTimeAxis("prate")!.length;

const view = new MapView(initialProjection, mapdiv1);

const onMapInteract = (e: ProjectorState) => {
  store.dispatch({
    type: "play/changed",
    playing: false,
  });
  store.dispatch({
    type: "mapInteracting/changed",
    mapInteracting: true,
  });
};

const onMapInteractEnd = (e: ProjectorState) => {
  store.dispatch({
    type: "mapInteracting/changed",
    mapInteracting: false,
  });
};

const onMapChange = (e: ProjectorState) => {
  store.dispatch({
    type: "projectorState/changed",
    projectorState: e,
  });
};

view.on("drag", onMapInteract);
view.on("dragEnd", onMapInteractEnd);
view.on("zoom", onMapInteract);
view.on("zoomEnd", onMapInteractEnd);
view.on("resize", onMapInteract);
view.on("resizeEnd", onMapInteractEnd);
view.on("change", onMapChange);

watchSelector(
  store,
  (s) => ({ projection: s.projection }),
  ({ projection }) => {
    view.setProjection(projection);
  },
);

const selectLandGraticuleState = (s: AppState) => ({
  projectorState: s.projectorState,
  mapInteracting: s.mapInteracting,
});

const JsonDataAgent = createJsonDataAgent();
const landLow = await JsonDataAgent.get({
  url: "./assets/landjson/land-110m.topojson",
});
const landMid = await JsonDataAgent.get({
  url: "./assets/landjson/land-50m.topojson",
});
const landHigh = await JsonDataAgent.get({
  url: "./assets/landjson/land-10m.topojson",
});

function selectLand(scaleMeters: number) {
  if (scaleMeters > 30000) {
    return landLow;
  } else if (scaleMeters > 10000) {
    return landMid;
  } else {
    return landHigh;
  }
}

function getLandRendererProps(): LandRendererProps {
  const { projectorState, mapInteracting } = selectLandGraticuleState(
    store.getState(),
  );
  if (!projectorState) {
    throw new Error("Projector state is not defined");
  }

  const scale_meters = metersPerPixel(projectorState);
  const landJson = selectLand(scale_meters);
  const landType = mapInteracting ? landLow : landJson;

  return {
    projectorState,
    topoJson: landType,
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

function metersPerPixel(projState: ProjectorState): number {
  const proj = getProjector(projState);
  const [width, height] = projState.viewSize;
  const npoints = 2;
  const R = 6371000;
  const p0 = proj.invert([width / 2, height / 2]);
  const p1 = proj.invert([width / 2 + npoints, height / 2]);
  if (!p0 || !p1) return Infinity;
  return (geoDistance(p0, p1) * R) / npoints;
}

const selectColorMapState = (s: AppState) => ({
  timeStep: s.timeStep,
  colorMap: s.colorMap,
  projectorState: s.projectorState,
  playing: s.playing,
  mapInteracting: s.mapInteracting,
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

const selectFlowAnimationState = (s: AppState) => ({
  timeStep: s.timeStep,
  flowAnimation: s.flowAnimation,
  projectorState: s.projectorState,
  playing: s.playing,
  mapInteracting: s.mapInteracting,
});

function getFlowRendererProps(): FlowRendererProps {
  const { projectorState, timeStep, flowAnimation } = selectFlowAnimationState(
    store.getState(),
  );
  const { name: vKey, level } = flowAnimation.selection;
  const gridMeta = dset.getVectorMeta(vKey)!;
  const { uArrName, vArrName } = gridMeta;
  const vertAxis = dset.getVertAxis(vKey);
  const vertIndex = vertAxis ? vertAxis.indexOf(level) : undefined;
  const uUrl = dset.getUrl(uArrName);
  const vUrl = dset.getUrl(vArrName);
  const uLatAxis = dset.getLatAxis(uArrName);
  const uLonAxis = dset.getLonAxis(uArrName);
  const vLatAxis = dset.getLatAxis(vArrName);
  const vLonAxis = dset.getLonAxis(vArrName);
  if (
    !gridMeta ||
    !uUrl ||
    !vUrl ||
    !uLatAxis ||
    !uLonAxis ||
    !vLatAxis ||
    !vLonAxis ||
    !projectorState
  ) {
    throw new Error("Missing required data for Flow rendering");
  }
  return {
    u: {
      url: uUrl,
      latAxis: uLatAxis,
      lonAxis: uLonAxis,
    },
    v: {
      url: vUrl,
      latAxis: vLatAxis,
      lonAxis: vLonAxis,
    },
    projectorState,
    gridProj: dset.getGridProj(),
    timeIndex: timeStep,
    vertIndex,
    numTimeSteps: numTimes(),
    gridMeta,
    maxWind: () => 17,
  };
}
const flowRenderer = createFlowRenderer({
  getProps: getFlowRendererProps,
});

const landRenderer = createLandRenderer({ getProps: getLandRendererProps });
const graticuleRenderer = createGraticuleRenderer({
  getProps: getGraticuleRendererProps,
});

const flowLayer = view.addAnimationLayer(flowRenderer);
const colorMapLayer = view.addLayer([colorMapRenderer]);
const landGraticuleLayer = view.addLayer([landRenderer, graticuleRenderer]);

let cmRenderTimer: ReturnType<typeof setTimeout> | undefined;
watchSelector(
  store,
  selectColorMapState,
  ({ playing, mapInteracting }, prev) => {
    const notTimePlayAction = playing === prev?.playing;
    if (notTimePlayAction && !playing && !mapInteracting) {
      clearTimeout(cmRenderTimer);
      cmRenderTimer = setTimeout(() => {
        colorMapLayer.render();
      }, 150);
    } else if (mapInteracting) {
      clearTimeout(cmRenderTimer);
      colorMapLayer.hide();
    }
  },
);

watchSelector(
  store,
  (s) => ({
    projectorState: s.projectorState,
    flowAnimation: s.flowAnimation,
  }),
  (current) => {
    store.dispatch({ type: "play/changed", playing: false });
  },
);

let flowRenderTimer: ReturnType<typeof setTimeout> | undefined;
watchSelector(
  store,
  selectFlowAnimationState,
  ({ playing, mapInteracting }, prev) => {
    const notTimePlayAction = playing === prev?.playing;
    if (notTimePlayAction && !playing && !mapInteracting) {
      clearTimeout(flowRenderTimer);
      flowRenderTimer = setTimeout(() => {
        flowLayer.render();
      }, 150);
    } else if (mapInteracting) {
      clearTimeout(flowRenderTimer);
      flowLayer.hide();
    }
  },
);

watchSelector(store, selectLandGraticuleState, ({ projectorState }) => {
  if (!projectorState) return;
  landGraticuleLayer.render();
});

function timeAnimationUpdate(
  layers: MapLayer[],
): (nextTime: number, prevTime: number) => Promise<void> {
  return async (nextTime, prevTime) => {
    if (nextTime < prevTime) {
      await Promise.all(layers.map((layer) => layer.render()));
      return;
    }
    await Promise.all(layers.map((layer) => layer.update()));
  };
}

function createTimeAnimationManager(
  update: (nextTime: number, prevTime: number) => Promise<void>,
  numTimes: () => number,
  currentTime: () => number,
  updateTime: (time: number) => void,
) {
  let rafId: number | null = null;
  let lastFrameTime: number | null = null;

  const playbackRate = 0.2;

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
    let prevTime = nextTime;

    while (accumulator >= FIXED_STEP) {
      nextTime += playbackRate * FIXED_STEP;
      accumulator -= FIXED_STEP;
    }

    nextTime = nextTime % (numTimes() - 1);

    updateTime(nextTime);
    store.dispatch({ type: "time/changed", timeStep: nextTime });
    await update(nextTime, prevTime);
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
  timeAnimationUpdate([colorMapLayer, flowLayer]),
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

function subscribeBridge(listener: () => void) {
  return store.subscribe(() => listener());
}

const [ctrlDiv, menuBtn] = createControlPanel({
  colorMap: {
    grid: {
      varset: { vars: dset.dataVars(), verticals: dset.verticals() },
      value: () => store.getState().colorMap.selection,
      subscribe: subscribeBridge,
      onChange: (selection) =>
        store.dispatch({ type: "colormap/grid/changed", selection }),
    },
    colorScale: {
      value: () => store.getState().colorMap.colorScale,
      subscribe: subscribeBridge,
      onChange: (colorScale) =>
        store.dispatch({ type: "colormap/colorscale/changed", colorScale }),
    },
  },
  flowMap: {
    varset: { vars: dset.vectorVars(), verticals: dset.verticals() },
    value: () => store.getState().flowAnimation.selection,
    subscribe: subscribeBridge,
    onChange: (selection) =>
      store.dispatch({ type: "flowanimation/grid/changed", selection }),
  },
  projection: {
    value: () => store.getState().projection,
    subscribe: subscribeBridge,
    onChange: (projection) =>
      store.dispatch({ type: "projection/changed", projection }),
    options: PROJECTIONS,
  },
});
document.body.appendChild(ctrlDiv);
document.body.appendChild(menuBtn);

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "long",
  });

const statusBardiv = createStatusBar({
  colorBar: {
    value: () => store.getState().colorBar,
    orientation: "horizontal",
    subscribe: subscribeBridge,
  },
  timeBar: {
    timeWheel: {
      value: () => store.getState().timeStep,
      items: () => dset.getTimeAxis("prate")!.map((t, i) => formatMonth(t)),
      onChange: (timeStep) =>
        store.dispatch({ type: "time/changed", timeStep }),
      subscribe: subscribeBridge,
    },
    playButton: {
      value: () => store.getState().playing,
      subscribe: subscribeBridge,
      onChange: (playing) => store.dispatch({ type: "play/changed", playing }),
    },
  },
});
document.body.appendChild(statusBardiv);

styleRegistry.inject();
