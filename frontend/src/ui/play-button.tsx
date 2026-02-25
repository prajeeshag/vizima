/** @jsxImportSource solid-js */
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";

type RenderOptions = {
  value: () => boolean;
  onChange?: (value: boolean) => void;
};

export const PlayButton = (props: RenderOptions) => {
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

export type PlayButtonOptions = RenderOptions & {
  subscribe: ExternalSubscribe;
};

export function createPlayButton(
  container: HTMLElement,
  options: PlayButtonOptions,
) {
  styleRegistry.register("play-button", styles);

  return mountController(container, options, ({ value, onChange }) => (
    <PlayButton value={value} onChange={onChange} />
  ));
}

const styles = `

  .vizima-play-button::before {
    content: "▶";
  }

  .vizima-play-button.playing::before {
    content: "⏸";
  }
`;
