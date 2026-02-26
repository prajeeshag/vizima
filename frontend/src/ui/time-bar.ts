import { styleRegistry } from "../styles";
import { createTimeWheel, type TimeWheelOptions } from "./time-wheel";
import { createPlayButton, type PlayButtonOptions } from "./play-button";

export type TimeBarOptions = {
  playButton: PlayButtonOptions;
  timeWheel: TimeWheelOptions;
  totalLength?: number;
};

const GAP = 2;

export function createTimeBar({
  playButton,
  timeWheel,
  totalLength = 200,
}: TimeBarOptions) {
  styleRegistry.register("time-bar", styles);
  const div = document.createElement("div");
  div.classList.add("vizima-time-bar");

  const divButton = createPlayButton(playButton);

  const timeWheelLength = totalLength - 26 - GAP;
  const divTimeWheel = createTimeWheel({
    ...timeWheel,
    totalLength: timeWheelLength,
  });
  divTimeWheel.classList.add("vizima-time-wheel-container");
  div.appendChild(divButton);
  div.appendChild(divTimeWheel);
  return div;
}

const styles = `
.vizima-time-bar {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: ${GAP}px;

}

.vizima-time-bar > .vizima-controller-container {
  flex: 0 0 auto;
}

.vizima-play-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.7));
  border: 1px solid var(--vizima-ui-border, rgba(255, 255, 255, 0.12));
  font-size: 16px;
}

.vizima-time-wheel-container {
  display: inline-flex;
  align-items: center;
  z-index: 10;
  font: 12px system-ui, sans-serif;
  color: #e7e7e7;
  cursor: grab;
  background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.7));
  border: 1px solid var(--vizima-ui-border, rgba(255, 255, 255, 0.12));
  border-radius: 4px;
  backdrop-filter: blur(6px);
}
`;
