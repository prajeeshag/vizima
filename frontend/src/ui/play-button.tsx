/** @jsxImportSource solid-js */
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";

interface RenderOptions {
  value: () => boolean;
  onChange?: (value: boolean) => void;
}

const PlayButton = (props: RenderOptions) => {
  const toggle = () => props.onChange?.(!props.value());

  return (
    <button
      class="vizima-play-button"
      classList={{ playing: props.value() }}
      onClick={toggle}
      aria-label={props.value() ? "Pause" : "Play"}
    />
  );
};

export function createPlayButton(
  container: HTMLElement,
  options: RenderOptions & {
    subscribe: ExternalSubscribe;
  },
) {
  styleRegistry.register("play-button", styles);

  return mountController(container, options, ({ value, onChange }) => (
    <PlayButton value={value} onChange={onChange} />
  ));
}

const styles = `

  .vizima-play-button {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    backdrop-filter: blur(4px);
    background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.7));
    border: 1px solid var(--vizima-ui-border, rgba(255, 255, 255, 0.12));
    color: white;
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .vizima-play-button::before {
    content: "▶";
  }

  .vizima-play-button.playing::before {
    content: "⏸";
  }
`;
