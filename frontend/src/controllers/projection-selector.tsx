import { For, createMemo } from "solid-js";
import { ViewProjection } from "../components/projection";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";

type ProjectionName = ViewProjection["name"];

type RenderProps = {
  value: () => ViewProjection;
  onChange: (p: ViewProjection) => void;
};

const PROJECTIONS = ViewProjection.options.map((o) => o.shape.name.value);

export function ProjectionSelect(props: RenderProps) {
  const current = createMemo(() => props.value());

  const safeValue = createMemo<ProjectionName>(() => {
    const v = current().name;
    return (PROJECTIONS as ProjectionName[]).includes(v)
      ? v
      : (PROJECTIONS[0] as ProjectionName);
  });

  return (
    <select
      class="projection-select"
      value={safeValue()}
      onChange={(e) =>
        props.onChange({
          name: e.currentTarget.value as ViewProjection["name"],
        })
      }
    >
      <For each={PROJECTIONS}>{(p) => <option value={p}>{p}</option>}</For>
    </select>
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
    <ProjectionSelect value={props.value} onChange={props.onChange} />
  ));
}

const styles = `
  .projection-select {
    padding: 6px 8px;
    font-size: 13px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: #fff;
    cursor: pointer;
  }

  .projection-select:focus {
    outline: none;
    border-color: #2684ff;
  }`;
