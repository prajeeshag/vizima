import type { JSX } from "solid-js/jsx-runtime";
import {
  type ColorScaleDynamic,
  type PaletteName,
  PALETTES,
} from "../colorscale";
import { createSignal, For, Show } from "solid-js";
import { render } from "solid-js/web";
import { styleRegistry } from "../styles";

function renderPalettePreview(name: PaletteName): JSX.Element {
  const p = PALETTES[name];

  if (p.kind === "categorical") {
    const colors = p.colors;
    return (
      <div class="vizima-csp-preview vizima-csp-preview--categorical">
        {colors.map((c) => (
          <div class="vizima-csp-swatch" style={{ "--c": c }} />
        ))}
      </div>
    );
  }

  const stops = Array.from({ length: 10 }, (_, i) => p.interpolate(i / 9));

  return (
    <div
      class="vizima-csp-preview vizima-csp-preview--continuous"
      style={{ "--gradient": `linear-gradient(to right, ${stops.join(",")})` }}
    />
  );
}

function PaletteOption(props: {
  name: PaletteName;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      class="vizima-csp-option"
      classList={{ "is-selected": props.selected }}
      onClick={props.onSelect}
    >
      <div class="vizima-csp-option-label">{props.name}</div>
      {renderPalettePreview(props.name)}
    </div>
  );
}

type RenderOptions = {
  value: ColorScaleDynamic;
  onChange: (value: ColorScaleDynamic) => void;
};

function ColorScaleController(props: RenderOptions) {
  const [open, setOpen] = createSignal(false);
  const [value, setValue] = createSignal(props.value);

  const update = (patch: Partial<ColorScaleDynamic>) => {
    setValue((v) => {
      const next = { ...v, ...patch };
      props.onChange(next);
      return next;
    });
  };

  return (
    <div class="vizima-csp">
      <div class="vizima-csp-dropdown">
        <div class="vizima-csp-trigger" onClick={() => setOpen((o) => !o)}>
          <div class="vizima-csp-trigger-label">{value().name}</div>
          {renderPalettePreview(value().name)}
        </div>

        <Show when={open()}>
          <div class="vizima-csp-menu">
            <For each={Object.keys(PALETTES) as PaletteName[]}>
              {(name) => (
                <PaletteOption
                  name={name}
                  selected={name === value().name}
                  onSelect={() => {
                    update({ name });
                    setOpen(false);
                  }}
                />
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="vizima-csp-controls">
        <label class="vizima-csp-checkbox">
          <input
            type="checkbox"
            checked={value().reverse}
            onInput={(e) => update({ reverse: e.currentTarget.checked })}
          />
          reverse
        </label>

        <label class="vizima-csp-checkbox">
          <input
            type="checkbox"
            checked={value().clamp}
            onInput={(e) => update({ clamp: e.currentTarget.checked })}
          />
          clamp
        </label>
      </div>
    </div>
  );
}

export function createColorScaleController(
  container: HTMLElement,
  options: RenderOptions,
) {
  styleRegistry.register("colorscale-selector", styles);
  const unmount = render(
    () => (
      <ColorScaleController
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
  .vizima-csp {
    width: 200px;
    font-family: system-ui, sans-serif;
    color: #333;
  }

  .vizima-csp-dropdown {
    position: relative;
  }

  .vizima-csp-menu {
    border: 1px solid #ccc;
    max-height: 200px;
    width: 100%;
    overflow: auto;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.3); /* translucent */
     backdrop-filter: blur(6px);
     -webkit-backdrop-filter: blur(6px);
  }

  .vizima-csp-trigger {
    border: 1px solid #ccc;
    padding: 6px;
    cursor: pointer;
  }

  .vizima-csp-trigger-label {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .vizima-csp-option {
    padding: 6px;
    cursor: pointer;
  }

  .vizima-csp-option.is-selected {
    background: rgba(255, 255, 255, 0.7);
  }

  .vizima-csp-option-label {
    font-size: 12px;
    margin-bottom: 2px;
    color: #333;
  }

  /* previews */
  .vizima-csp-preview {
    height: 12px;
  }

  .vizima-csp-preview--continuous {
    background-image: var(--gradient);
  }

  .vizima-csp-preview--categorical {
    display: flex;
    gap: 1px;
  }

  .vizima-csp-swatch {
    flex: 1;
    background-color: var(--c);
  }

  /* controls */
  .vizima-csp-controls {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }

  .vizima-csp-checkbox {
    font-size: 12px;
  }`;
