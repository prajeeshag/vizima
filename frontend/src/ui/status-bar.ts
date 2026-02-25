import { styleRegistry } from "../styles";
import { createColorBar, type ColorBarOptions } from "./colorbar";
import { createTimeBar, type TimeBarOptions } from "./time-bar";

interface StatusBarOptions {
  colorBar: ColorBarOptions;
  timeBar: TimeBarOptions;
  length?: number;
}

export function createStatusBar({
  colorBar,
  timeBar,
  length = 300,
}: StatusBarOptions) {
  styleRegistry.register("status-bar", styles);
  const div = document.createElement("div");
  div.classList.add("vizima-status-bar");
  const divCb = document.createElement("div");
  divCb.classList.add("vizima-color-bar-container");
  const divTimeBar = createTimeBar({ ...timeBar, totalLength: length });
  div.appendChild(divCb);
  div.appendChild(divTimeBar);
  createColorBar(divCb, { ...colorBar, colorBarLength: length });
  return div;
}

const styles = `
.vizima-status-bar {
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  // background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.7));
  padding: 4px;
  border-radius: 4px;
}
.vizima-color-bar-container {
line-height: 0;
}
`;
