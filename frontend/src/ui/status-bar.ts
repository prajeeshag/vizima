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
  const divCb = createColorBar({ ...colorBar, colorBarLength: length });
  div.appendChild(divCb);
  const divTimeBar = createTimeBar({ ...timeBar, totalLength: length });
  div.appendChild(divTimeBar);
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
  padding: 4px;
  border-radius: 4px;
}
.vizima-status-bar > .vizima-controller-container {
line-height: 0;
}
`;
