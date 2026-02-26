import { createMemo, For, Show } from "solid-js";

type SelectProps<T> = {
  value: () => T | undefined;
  options: readonly T[];
  toKey: (v: T) => string; // domain → string (required)
  label?: (v: T) => string; // optional display label
  tooltip?: (v: T) => string; // optional tooltip
  placeholder?: string;
  title?: string;
  onChange?: (v: T) => void;
  class?: string;
};

export function Select<T>(props: SelectProps<T>) {
  const keyOf = (v: T | undefined) => (v ? props.toKey(v) : "");

  const lookup = createMemo(() => {
    const map = new Map<string, T>();
    for (const o of props.options) map.set(props.toKey(o), o);
    return map;
  });

  return (
    <select
      class={`vizima-select ${props.class ?? ""}`}
      title={props.title}
      value={keyOf(props.value())}
      onChange={(e) => {
        const v = lookup().get(e.currentTarget.value);
        if (v !== undefined) props.onChange?.(v);
      }}
    >
      <Show when={props.placeholder}>
        <option value="">{props.placeholder}</option>
      </Show>

      <For each={props.options}>
        {(o) => {
          const key = props.toKey(o);
          const text = props.label?.(o) ?? key;
          const tooltip = props.tooltip?.(o);
          return (
            <option value={key} title={tooltip}>
              {text}
            </option>
          );
        }}
      </For>
    </select>
  );
}
