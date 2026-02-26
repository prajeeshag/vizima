import type { JSX } from "solid-js/jsx-runtime";
import {
  type ColorScaleDynamic,
  type PaletteName,
  PALETTES,
  DOMAIN_FNS,
  DOMAINS_FNS_PARAMS,
} from "../components/painters/colormap-painter";
import { createSignal, For, Show } from "solid-js";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";
import { Select } from "./primitives/select";

function getDomainFnKeys(name: PaletteName) {
  const kind = PALETTES[name].kind;
  return Object.keys(DOMAIN_FNS[kind]);
}

function renderPalettePreview(name: PaletteName): JSX.Element {
  const p = PALETTES[name];

  if (p.kind === "categorical") {
    return (
      <div class="vizima-csp-preview vizima-csp-preview--categorical">
        {p.colors.map((c: string) => (
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
  value: () => ColorScaleDynamic;
  onChange?: (value: ColorScaleDynamic) => void;
};

function ColorScaleController(props: RenderOptions) {
  const [open, setOpen] = createSignal(false);

  const value = () => props.value();

  const update = (patch: Partial<ColorScaleDynamic>) => {
    const next = { ...value(), ...patch };
    props.onChange?.(next);
  };

  return (
    <div class="vizima-csp">
      <div class="vizima-csp-dropdown">
        <div
          class="vizima-csp-trigger"
          title="Select Color Palette"
          onClick={() => setOpen((o) => !o)}
        >
          <div class="vizima-csp-trigger-label">{value().name}</div>
          {renderPalettePreview(value().name)}
        </div>

        <div class="vizima-csp-menu" classList={{ "is-open": open() }}>
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
      </div>

      <div class="vizima-csp-controls">
        <label class="vizima-csp-checkbox" title="Reverse color palette">
          <input
            type="checkbox"
            checked={value().reverse}
            onChange={(e) => update({ reverse: e.currentTarget.checked })}
          />
          reverse
        </label>

        <label class="vizima-csp-checkbox" title="Clamp colormap range">
          <input
            type="checkbox"
            checked={value().clamp}
            onChange={(e) => update({ clamp: e.currentTarget.checked })}
          />
          clamp
        </label>
      </div>

      <Select
        value={() => value().domain}
        onChange={(domain) => update({ domain })}
        options={getDomainFnKeys(value().name)}
        toKey={(key) => key}
        label={(v) => DOMAINS_FNS_PARAMS[v]?.label || ""}
        tooltip={(v) => DOMAINS_FNS_PARAMS[v]?.tooltip || ""}
        title="Select colorscale range options"
      />
    </div>
  );
}

export type ColorScaleSelectorOptions = RenderOptions & {
  subscribe: ExternalSubscribe;
};

export function createColorScaleSelector(options: ColorScaleSelectorOptions) {
  const container = document.createElement("div");
  container.classList.add("vizima-controller-container");
  styleRegistry.register("colorscale-selector", styles);
  mountController(container, options, ({ value }) => (
    <ColorScaleController {...options} value={value} />
  ));
  return container;
}

const styles = `
  .vizima-csp {
    display: flex;
    flex-direction: column;
    font-family: system-ui, sans-serif;
    color: #ddd;
    position: relative;
    z-index: 10;
    gap: 4px
  }

  .vizima-csp-dropdown {
    position: relative;
  }

  .vizima-csp-menu {
    max-height: 200px;
    width: 100%;
    overflow: auto;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    background: rgba(20, 20, 20, 0.7); /* translucent */
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);

    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 120ms ease, transform 120ms ease;
  }

  .vizima-csp-menu.is-open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .vizima-csp-trigger {
    border: 1px solid #999;
    padding: 6px;
    cursor: pointer;
    border-radius: 5px;
  }

  .vizima-csp-trigger-label {
    font-size: 10px;
    margin-bottom: 4px;
  }

  .vizima-csp-option {
    padding: 6px;
    cursor: pointer;
  }

  .vizima-csp-option.is-selected {
    border: 1px solid #999;
  }

  .vizima-csp-option-label {
    font-size: 10px;
    margin-bottom: 2px;
    color: #ddd;
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
    margin-top: 2px;
  }

  .vizima-csp-checkbox {
    font-size: 11px;
    cursor: pointer;
  }`;
