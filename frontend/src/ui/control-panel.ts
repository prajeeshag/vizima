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

export function createControlPanel(
  options: ControlPanelOptions,
): [HTMLDivElement, HTMLButtonElement] {
  const panel = document.createElement("div");
  const menuBtn = createMenuButton();

  function openPanel() {
    panel.classList.add("open");
    menuBtn.classList.add("hidden");
  }

  function closePanel() {
    panel.classList.remove("open");
    menuBtn.classList.remove("hidden");
  }

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openPanel();
  });

  document.addEventListener("click", (event) => {
    const target = event.target as Node;
    const clickedInsidePanel = panel.contains(target);
    const clickedMenuButton = menuBtn.contains(target);
    console.log(target, clickedInsidePanel);
    if (!clickedInsidePanel && !clickedMenuButton) {
      if (panel.classList.contains("open")) {
        closePanel();
      }
    }
  });

  styleRegistry.register("control-panel", styles);
  panel.classList.add("vizima-control-panel");
  for (const [key, value] of Object.entries(options)) {
    const params = ControlPanelParams[key]!;
    const subpanel = params.create({ ...value, title: params.title });
    subpanel.classList.add(`control-panel-panel`);
    panel.appendChild(subpanel);
  }
  openPanel();
  setTimeout(() => {
    closePanel();
  }, 3000);
  return [panel, menuBtn];
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

    /* Transform */
    transform-origin: bottom left;   /* ← add this */
    opacity: 0;
    pointer-events: none;
    transition: transform 700ms ease, opacity 700ms ease;
  }

  .vizima-control-panel.open {
    transform: scale(1);
    opacity: 1;
    pointer-events: auto;
  }

  .vizima-control-panel.hidden {
    transform: scale(0.5);
    opacity: 0;
    pointer-events: none;
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

    .vizima-select {
    color: #ddd;
    padding: 4px;
    font-size: 12px;
    border-radius: 4px;
    border: 1px solid #999;
    background: transparent;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    cursor: pointer;
    }

    .vizima-select:focus {
      outline: none;
      border-color: #2684ff;
    }
`;

export function createMenuButton(): HTMLButtonElement {
  styleRegistry.register("menu-button", menuButtonStyles);
  const btn = document.createElement("button");
  btn.classList.add("vizima-menu-btn");
  btn.innerHTML = "☰"; // or svg
  return btn;
}

const menuButtonStyles = /*css*/ `
  .vizima-menu-btn {
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 11;
    font-size: 18px;
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid #999;
    background: rgba(20,20,22,0.2);
    color: #ddd;
    cursor: pointer;
    transition: opacity 500ms ease;
    opacity: 1;
  }

  .vizima-menu-btn.hidden {
    opacity: 0;
    pointer-events: none;
  }

  `;
