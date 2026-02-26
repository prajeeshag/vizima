import { styleRegistry } from "../styles";
import { createGridSelector, type GridSelectorOptions } from "./grid-selector";
import {
  createColorScaleSelector,
  type ColorScaleSelectorOptions,
} from "./colorscale-selector";
import {
  createProjectionSelector,
  type ProjectionSelectorOptions,
} from "./projection-selector";

type ControlPanelOptions = {
  colorMap: ColorMapPanelOptions;
  flowMap: GridSelectorOptions;
  projection: ProjectionSelectorOptions;
};

type ParamType = {
  title?: string;
  create: (options: any) => HTMLDivElement;
};

const ControlPanelParams: Record<string, ParamType> = {
  colorMap: {
    create: createColorMapPanel,
    title: "Colormap",
  },
  flowMap: {
    create: createGridSelector,
    title: "Flow",
  },
  projection: {
    create: createProjectionSelector,
    title: "Projection",
  },
};

export function createControlPanel(options: ControlPanelOptions) {
  const div = document.createElement("div");
  styleRegistry.register("control-panel", styles);
  div.classList.add("vizima-control-panel");
  for (const [key, value] of Object.entries(options)) {
    const params = ControlPanelParams[key]!;
    const panel = params.create({ ...value, title: params.title });
    panel.classList.add(`control-panel-panel`);
    div.appendChild(panel);
  }
  return div;
}

type ColorMapPanelOptions = {
  grid: GridSelectorOptions;
  colorScale: ColorScaleSelectorOptions;
  title?: string;
};

const ColorMapPanelParams: Record<string, any> = {
  grid: createGridSelector,
  colorScale: createColorScaleSelector,
};

function createColorMapPanel(options: ColorMapPanelOptions) {
  const div = document.createElement("div");
  if (options.title) {
    const title = document.createElement("div");
    title.classList.add("vizima-controller-title");
    title.textContent = options.title;
    div.appendChild(title);
  }

  for (const [key, value] of Object.entries(options)) {
    if (key === "title") continue;
    const createPanel = ColorMapPanelParams[key];
    const panel = createPanel(value);
    div.appendChild(panel);
  }
  return div;
}

const styles = /*css*/ `
  .vizima-control-panel {
    position: fixed;
    bottom: 16px;
    left: 16px;
    display: flex;
    width: fit-content;
    flex-direction: column;
    align-items: left;
    justify-content: center;
    padding: 10px;
    border-radius: 5px;
    background-color: rgba(20, 20, 22, 0.7);
    z-index: 10;
    gap: 4px;
  }

  .vizima-controller-container{
    display: flex;
    flex-direction: column;
  }

  .control-panel-panel {
    display: flex;
    flex-direction: column;
    align-items: left;
    justify-content: center;
    gap: 4px;
    padding: 4px;
    border: 1px solid #999;
    border-radius: 4px;
  }

  .vizima-colormap-panel {
    display: flex;
    flex-direction: column;
    align-items: left;
    justify-content: center;
    gap: 4px;
    padding: 2px;
    border: 1px solid #999;
    border-radius: 4px;
  }

  .vizima-controller-title {
    font-weight: bold;
    font-size: 12px;
    margin-bottom: 2px;
    padding-bottom: 2px;
    padding-left: 2px;
    color: #ccc;
    border-bottom: 1px solid #999;
  }

`;
