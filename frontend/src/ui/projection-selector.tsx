import { createMemo } from "solid-js";
import { ViewProjection } from "../components/projection";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";
import { DerivedSelect } from "./primitives/select";

type RenderProps = {
  value: () => ViewProjection;
  options: ViewProjection[];
  onChange?: (p: ViewProjection) => void;
  toKey?: (p: ViewProjection) => string;
};

export function ProjectionSelect(props: RenderProps) {
  const current = createMemo(() => props.value());
  return (
    <DerivedSelect
      value={() => current()}
      options={props.options}
      toKey={(p) => p.name}
      onChange={(value) => props.onChange?.(value)}
      class="vizima-projection-select"
    />
  );
}

export function createProjectionSelector(
  container: HTMLElement,
  options: RenderProps & {
    subscribe: ExternalSubscribe;
  },
) {
  styleRegistry.register("projection-selector", styles);
  return mountController(container, options, (props) => (
    <ProjectionSelect {...props} />
  ));
}

const styles = /*css */ `
  .vizima-projection-select {
  padding: 6px 8px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: pointer;
  }

  .vizima-projection-select:focus {
    outline: none;
    border-color: #2684ff;
  }`;
