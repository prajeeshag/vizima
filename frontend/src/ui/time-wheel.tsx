/** @jsxImportSource solid-js */
import { createMemo, For, onCleanup, onMount } from "solid-js";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";

interface RenderOptions {
  items: () => string[];
  value: () => number;
  onChange?: (index: number) => void;

  visibleCount?: number; // odd number recommended (default 3)
  itemHeight?: number; // px (default 32)
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function TimeWheel(props: RenderOptions) {
  let dragging = false;
  let startY = 0;
  let startIndex = 0;
  let container!: HTMLDivElement;

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    startY = e.clientY;
    startIndex = safeValue();
    container.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    const deltaIndex = -dy / itemHeight();
    const next = clamp(Math.round(startIndex + deltaIndex), 0, maxIndex());
    console.log("Pointer move: ", next);
    props.onChange?.(next);
  };

  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    container.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const sensitivity = 0.01;
    const delta = e.deltaY * sensitivity;
    const next = clamp(Math.round(safeValue() + delta), 0, maxIndex());
    props.onChange?.(next);
  };

  const itemHeight = () => props.itemHeight ?? 20;
  const visibleCount = () => props.visibleCount ?? 3;

  const containerHeight = () => itemHeight() * visibleCount();
  const centerOffset = () => containerHeight() / 2 - itemHeight() / 2;

  const maxIndex = createMemo(() => Math.max(0, props.items().length - 1));

  const safeValue = createMemo(() => clamp(props.value(), 0, maxIndex()));

  const translateY = createMemo(
    () => centerOffset() - safeValue() * itemHeight(),
  );

  return (
    <div
      ref={container}
      class="vizima-time-wheel"
      style={{ height: `${containerHeight()}px` }}
      role="listbox"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div
        class="vizima-time-wheel__viewport"
        style={{
          transform: `translateY(${translateY()}px)`,
        }}
      >
        <For each={props.items()}>
          {(item, i) => {
            const selectedIndex = createMemo(() => Math.round(safeValue()));
            const diff = () => i() - selectedIndex();
            return (
              <div
                class="vizima-time-wheel__item"
                classList={{
                  active: diff() === 0,
                  prev: diff() === -1,
                  next: diff() === 1,
                }}
                style={{ height: `${itemHeight()}px` }}
                role="option"
                aria-selected={diff() === 0}
              >
                {item}
              </div>
            );
          }}
        </For>
      </div>

      {/* center highlight line */}
      <div
        class="vizima-time-wheel__focus"
        style={{
          top: `${centerOffset()}px`,
          height: `${itemHeight()}px`,
        }}
      />
    </div>
  );
}

export function createTimeWheel(
  container: HTMLElement,
  options: RenderOptions & {
    subscribe: ExternalSubscribe;
  },
) {
  styleRegistry.register("time-wheel", styles);
  return mountController(container, options, ({ value }) => (
    <TimeWheel
      items={options.items}
      value={value}
      onChange={options.onChange}
    />
  ));
}

const styles = `
.vizima-time-wheel {
  position: relative;
  z-index: 10;
  width: 120px;
  overflow: hidden;
  user-select: none;
  font: 13px system-ui, sans-serif;
  color: #e7e7e7;
}

.vizima-time-wheel__viewport {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: transform 0.18s ease-out;
}

.vizima-time-wheel__item {
  display: grid;
  place-items: center;
  opacity: 0.35;
  transform: scale(0.82);
  transition: all 0.18s ease;
  cursor: pointer;
}

/* selected */
.vizima-time-wheel__item.active {
  opacity: 1;
  transform: scale(1.15);
  font-weight: 600;
}

/* neighbours */
.vizima-time-wheel__item.prev,
.vizima-time-wheel__item.next {
  opacity: 0.55;
  transform: scale(0.85);
}

/* center focus frame */
.vizima-time-wheel__focus {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  // border-top: 1px solid rgba(255,255,255,0.35);
  // border-bottom: 1px solid rgba(255,255,255,0.35);
}
`;
