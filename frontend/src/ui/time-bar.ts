import { styleRegistry } from "../styles";
import { createTimeWheel, type TimeWheelOptions } from "./time-wheel";
import { createPlayButton, type PlayButtonOptions } from "./play-button";

interface TimeBarOptions {
  playButton: PlayButtonOptions;
  timeWheel: TimeWheelOptions;
}

export function createTimeBar(options: TimeBarOptions) {
  styleRegistry.register("time-bar", styles);
  const div = document.createElement("div");
  div.classList.add("vizima-time-bar");
  const divButton = document.createElement("div");
  divButton.classList.add("vizima-play-button-container");
  const divTimeWheel = document.createElement("div");
  divTimeWheel.classList.add("vizima-time-wheel-container");
  div.appendChild(divButton);
  div.appendChild(divTimeWheel);
  createPlayButton(divButton, options.playButton);
  createTimeWheel(divTimeWheel, options.timeWheel);
  return div;
}

const styles = `
.vizima-time-bar {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 4px;

}

.vizima-play-button-container {
  flex: 0 0 auto;          /* don't stretch */
}

.vizima-play-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.7));
  border: 1px solid var(--vizima-ui-border, rgba(255, 255, 255, 0.12));
  font-size: 12px;
}

.vizima-time-wheel-container {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  z-index: 10;
  font: 12px system-ui, sans-serif;
  color: #e7e7e7;
  padding: 5px;
  cursor: grab;
  background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.7));
  border: 1px solid var(--vizima-ui-border, rgba(255, 255, 255, 0.12));
  border-radius: 4px;
  backdrop-filter: blur(6px);
}
`;
