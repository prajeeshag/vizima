import { createMemo } from "solid-js";
import { ViewProjection } from "../components/projection";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";
import { Select } from "./primitives/select";

type RenderProps = {
  value: () => ViewProjection;
  options: ViewProjection[];
  onChange: (p: ViewProjection) => void;
  label?: (p: ViewProjection) => string;
};

export function ProjectionSelect(props: RenderProps) {
  const current = createMemo(() => props.value());
  return (
    <Select
      {...props}
      value={() => current()}
      toKey={(p) => p.name}
      title="Select projection"
      class="vizima-projection-select"
    />
  );
}

export type ProjectionSelectorOptions = RenderProps & {
  subscribe: ExternalSubscribe;
  title?: string;
};
export function createProjectionSelector(options: ProjectionSelectorOptions) {
  const container = document.createElement("div");
  container.classList.add("vizima-controller-container");
  if (options.title) {
    const title = document.createElement("div");
    title.classList.add("vizima-controller-title");
    title.textContent = options.title;
    container.appendChild(title);
  }
  mountController(container, options, (props) => (
    <ProjectionSelect {...props} />
  ));
  return container;
}
