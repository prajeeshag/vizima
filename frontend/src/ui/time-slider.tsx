/** @jsxImportSource solid-js */
import { createMemo, For, Show } from "solid-js";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";

interface RenderOptions {
  numTimes: () => number;
  ticks: () => number[];
  tickLabels: () => string[];
  value: () => number;
  onChange?: (value: number) => void;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n + 0.5)));
}

export const TimeSlider = (props: RenderOptions) => {
  const maxIndex = Math.max(0, props.numTimes() - 1);

  const safeValue = createMemo(() => clamp(props.value(), 0, maxIndex));

  const tickItems = createMemo(() => {
    const t = props.ticks() ?? [];
    const labels = props.tickLabels() ?? [];

    // Pair ticks with labels; if labels are missing/misaligned, fall back to the tick value.
    return (
      t
        .map((tick, i) => ({
          tick: clamp(tick, 0, maxIndex),
          label: labels[i] ?? String(tick),
        }))
        // Remove duplicates after clamping, keep first occurrence
        .filter(
          (item, i, arr) => arr.findIndex((x) => x.tick === item.tick) === i,
        )
        .sort((a, b) => a.tick - b.tick)
    );
  });

  const onRangeChange = (e: Event & { currentTarget: HTMLInputElement }) => {
    const next = clampInt(Number(e.currentTarget.value), 0, maxIndex);
    props.onChange?.(next);
  };

  return (
    <div class="vizima-time-slider" role="group" aria-label="Time slider">
      <Show
        when={props.numTimes() > 0}
        fallback={
          <div class="vizima-time-slider__empty" aria-live="polite">
            No time steps
          </div>
        }
      >
        <input
          class="vizima-time-slider__range"
          type="range"
          min="0"
          max={String(maxIndex)}
          step="0.01"
          value={String(safeValue())}
          onInput={onRangeChange}
          onChange={onRangeChange}
          aria-label="Time"
          aria-valuemin={0}
          aria-valuemax={maxIndex}
          aria-valuenow={safeValue()}
        />
      </Show>

      <Show when={tickItems().length > 0}>
        <div class="vizima-time-slider__ticks" aria-hidden="true">
          <For each={tickItems()}>
            {(t) => (
              <div
                class="vizima-time-slider__tick"
                style={{ left: `${(t.tick / Math.max(1, maxIndex)) * 100}%` }}
              >
                <div class="vizima-time-slider__tickMark" />
                <div class="vizima-time-slider__tickLabel">{t.label}</div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export function createTimeSlider(
  options: RenderOptions & {
    subscribe: ExternalSubscribe;
  },
) {
  const container = document.createElement("div");
  container.classList.add("vizima-controller-container");

  styleRegistry.register("time-slider", styles);

  mountController(container, options, ({ value, onChange }) => (
    <TimeSlider
      numTimes={options.numTimes}
      ticks={options.ticks}
      tickLabels={options.tickLabels}
      value={value}
      onChange={onChange}
    />
  ));
  return container;
}

const styles = `
  .vizima-time-slider {
    width: 300px;
    display: grid;
    padding: 8px 10px;
    user-select: none;
    -webkit-user-select: none;
    font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: var(--vizima-ui-fg, #e7e7e7);
    background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.7));
    border: 1px solid var(--vizima-ui-border, rgba(255, 255, 255, 0.12));
    border-radius: 10px;
    backdrop-filter: blur(6px);
  }

  .vizima-time-slider__empty {
    opacity: 0.75;
  }

  .vizima-time-slider__range {
    width: 100%;
    margin: 0;
    accent-color: auto; /* don't use accent fill */
  }

  /* OPTION A: Control the thumb size so tick alignment can be correct.
     Keep this variable in sync with the pseudo-element sizes below. */
  .vizima-time-slider {
    --vizima-time-slider-thumb-size: 16px;
    --vizima-time-slider-thumb-radius: calc(var(--vizima-time-slider-thumb-size) / 2);
  }

  /* WebKit/Blink thumb sizing */
  .vizima-time-slider__range::-webkit-slider-thumb {
    width: var(--vizima-time-slider-thumb-size);
    height: var(--vizima-time-slider-thumb-size);
  }

  /* Firefox thumb sizing */
  .vizima-time-slider__range::-moz-range-thumb {
    width: var(--vizima-time-slider-thumb-size);
    height: var(--vizima-time-slider-thumb-size);
  }



  .vizima-time-slider__ticks {
    position: relative;
    height: 22px;
    /* Inset tick layout to match the effective track endpoints (thumb radius) */
    margin-inline: var(--vizima-time-slider-thumb-radius);
  }

  .vizima-time-slider__tick {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: grid;
    justify-items: center;
    gap: 4px;
    pointer-events: none;
  }

  .vizima-time-slider__tickMark {
    width: 1px;
    height: 4px;
    background: var(--vizima-ui-border, rgba(255, 255, 255, 0.22));
  }

  .vizima-time-slider__tickLabel {
    font-size: 10px;
    opacity: 0.75;
    max-width: 92px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
