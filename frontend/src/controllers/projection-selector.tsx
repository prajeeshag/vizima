import { For } from "solid-js";
import { ViewProjection } from "../components/projection";
import { render } from "solid-js/web";
import { styleRegistry } from "../styles";

type ProjectionName = ViewProjection["name"];

type RenderProps = {
  value: ProjectionName;
  onChange: (p: ViewProjection) => void;
};

const PROJECTIONS = ViewProjection.options.map((o) => o.shape.name.value);

export function ProjectionSelect(props: RenderProps) {
  return (
    <select
      class="projection-select"
      value={props.value}
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
  options: RenderProps,
) {
  styleRegistry.register("projection-selector", styles);
  const unmount = render(
    () => (
      <ProjectionSelect
        value={options.value}
        onChange={(selection) => {
          if (options.onChange) {
            options.onChange(selection);
          }
        }}
      />
    ),
    container,
  );
  return unmount;
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
