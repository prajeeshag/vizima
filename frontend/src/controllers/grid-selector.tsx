/** @jsxImportSource solid-js */
import {
  createSignal,
  createMemo,
  For,
  Show,
  createEffect,
  batch,
} from "solid-js";
import { Dataset } from "../components/dataset";
import { render } from "solid-js/web";

interface Selection {
  varKey: string;
  level: string;
  time: string;
}

interface RenderOptions {
  dataset: Dataset;
  onChange: (selection: Selection) => void;
}

export const GridSelector = (props: RenderOptions) => {
  const [selectedVarKey, setSelectedVarKey] = createSignal<string>("");
  const [selectedLevel, setSelectedLevel] = createSignal<string>("");
  const [selectedTime, setSelectedTime] = createSignal<string>("");

  const ds = () => props.dataset;

  const currentVar = createMemo(() => {
    const key = selectedVarKey();
    const data = ds();
    return key && data ? data.value.datavars[key] : null;
  });

  const availableLevels = createMemo(() => {
    const vKey = currentVar()?.vertical;
    const data = ds();
    if (!vKey || !data) return [];
    return data.value.verticals[vKey] ?? [];
  });

  const availableTimes = createMemo(() => {
    const tKey = currentVar()?.time;
    const data = ds();
    if (!tKey || !data) return [];
    return data.value.times[tKey] ?? [];
  });

  createEffect(() => {
    const data = ds()?.value;
    if (!data) return;

    // auto-select first variable
    if (!selectedVarKey()) {
      const firstVar = Object.keys(data.datavars)[0];
      if (firstVar) setSelectedVarKey(firstVar);
    }
  });

  createEffect(() => {
    const levels = availableLevels();
    if (!selectedLevel() && levels.length > 0) {
      setSelectedLevel(levels[0]!);
    }
  });

  createEffect(() => {
    const times = availableTimes();
    if (!selectedTime() && times.length > 0) {
      setSelectedTime(times[0]!);
    }
  });

  createEffect(() => {
    const selection = {
      varKey: selectedVarKey(),
      level: selectedLevel(),
      time: selectedTime(),
    };
    batch(() => {
      props.onChange?.(selection);
    });
  });

  return (
    <div class="dataset-container">
      <Show when={ds()} fallback={<p>Loading Dataset...</p>}>
        <select
          value={selectedVarKey()}
          onChange={(e) => {
            setSelectedVarKey(e.currentTarget.value);
            setSelectedLevel("");
            setSelectedTime("");
          }}
        >
          <option value="">Select Variable</option>
          <For each={Object.entries(ds()!.value.datavars)}>
            {([key, meta]) => <option value={key}>{key}</option>}
          </For>
        </select>

        <Show when={availableLevels().length > 0}>
          <select
            value={selectedLevel()}
            onInput={(e) => setSelectedLevel(e.currentTarget.value)}
          >
            <option value="">Select Level</option>
            <For each={availableLevels()}>
              {(lvl) => <option value={lvl}>{lvl}</option>}
            </For>
          </select>
        </Show>

        <Show when={availableTimes().length > 0}>
          <select
            value={selectedTime()}
            onInput={(e) => setSelectedTime(e.currentTarget.value)}
          >
            <option value="">Select Time</option>
            <For each={availableTimes()}>
              {(t) => (
                <option value={t}>{t.endsWith("Z") ? t : `${t}Z`}</option>
              )}
            </For>
          </select>
        </Show>
      </Show>
    </div>
  );
};

/**
 * Programmatically renders the Dataset Selector into a target element.
 * Returns a cleanup function to unmount the component.
 */
export function createGridSelector(
  container: HTMLElement,
  options: RenderOptions,
) {
  // We use render() to start the Solid reactivity tree inside the user's div
  const unmount = render(
    () => (
      <GridSelector
        dataset={options.dataset}
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
