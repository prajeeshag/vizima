/** @jsxImportSource solid-js */
import { createMemo, For, Show } from "solid-js";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";
import { DerivedSelect } from "./primitives/select";

interface Grid {
  name: string;
  level: string;
}

type Vars = Record<string, { vertical: string }>;
type VarSet = { vars: Vars; verticals: Record<string, string[]> };

interface RenderOptions {
  varset: VarSet;
  value: () => Grid;
  onChange?: (selection: Grid) => void;
}

function firstOrEmpty(list: readonly string[]): string {
  return list.length > 0 ? list[0]! : "";
}

export const GridSelector = (props: RenderOptions) => {
  const ds = () => props.varset;

  const selection = createMemo(() => props.value());

  const currentVar = createMemo(() => {
    const key = selection().name;
    const data = ds();
    return key && data ? data.vars[key] : undefined;
  });

  const availableLevels = createMemo<string[]>(() => {
    const vKey = currentVar()?.vertical;
    if (!vKey) return [];
    const data = ds();
    const verticals = data.verticals[vKey];
    return verticals ?? [];
  });

  const commit = (patch: Partial<Grid>) => {
    const base = selection();
    const next: Grid = { ...base, ...patch };

    if (patch.name !== undefined && patch.name !== base.name) {
      const data = ds();
      const dv = data.vars[next.name];
      const levels = dv?.vertical ? (data.verticals[dv.vertical] ?? []) : [];
      next.level = firstOrEmpty(levels);
    }
    props.onChange?.(next);
  };

  return (
    <Show when={ds()}>
      <DerivedSelect
        class="vizima-grid-selector vizima-grid-select"
        value={() => selection().name}
        onChange={(e) => commit({ name: e })}
        options={Object.keys(ds()!.vars)}
        toKey={(v) => v}
      />
      <Show when={availableLevels().length > 0}>
        <DerivedSelect
          class="vizima-level-selector vizima-grid-select"
          value={() => selection().level}
          onChange={(e) => commit({ level: e })}
          options={availableLevels()}
          toKey={(v) => v}
        />
      </Show>
    </Show>
  );
};

export function createGridSelector(
  container: HTMLElement,
  options: RenderOptions & {
    subscribe: ExternalSubscribe;
  },
) {
  styleRegistry.register("grid-selector", styles);

  return mountController(container, options, ({ value, onChange }) => (
    <GridSelector varset={options.varset} value={value} onChange={onChange} />
  ));
}

const styles = `
  .vizima-grid-select {
    padding: 6px 8px;
    font-size: 13px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    cursor: pointer;
  }

  .vizima-grid-select:focus {
    outline: none;
    border-color: #2684ff;
  }
`;
