/** @jsxImportSource solid-js */
import { createMemo, For, onCleanup, onMount } from "solid-js";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";

type RenderOptions = {
  items: () => string[];
  value: () => number;
  onChange?: (index: number) => void;

  visibleCount?: number;
  totalLength?: number;
  orientation?: "vertical" | "horizontal";
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function TimeWheel({
  items,
  value,
  onChange,
  visibleCount = 3,
  totalLength = 240,
  orientation = "horizontal",
}: RenderOptions) {
  console.log("totalLength", totalLength);
  let dragging = false;
  let startY = 0;
  let startIndex = 0;
  let container!: HTMLDivElement;

  const isVertical = orientation === "vertical";

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    container.classList.add("dragging");
    startY = isVertical ? e.clientY : e.clientX;
    startIndex = safeValue();
    container.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const pos = isVertical ? e.clientY : e.clientX;
    const d = pos - startY;
    const deltaIndex = -d / itemHeight;
    const next = clamp(Math.round(startIndex + deltaIndex), 0, maxIndex());
    onChange?.(next);
  };

  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    container.classList.remove("dragging");
    container.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const sensitivity = 0.01;
    const delta = e.deltaY * sensitivity;
    const next = clamp(Math.round(safeValue() + delta), 0, maxIndex());
    onChange?.(next);
  };

  const itemHeight = totalLength / visibleCount;
  const containerHeight = () => itemHeight * visibleCount;
  const centerOffset = () => containerHeight() / 2 - itemHeight / 2;

  const maxIndex = createMemo(() => Math.max(0, items().length - 1));

  const safeValue = createMemo(() => clamp(value(), 0, maxIndex()));

  const translate = createMemo(() => centerOffset() - safeValue() * itemHeight);

  return (
    <div
      ref={container}
      class="vizima-time-wheel"
      style={
        isVertical
          ? { height: `${containerHeight()}px` }
          : { width: `${containerHeight()}px` }
      }
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
          transform: isVertical
            ? `translateY(${translate()}px)`
            : `translateX(${translate()}px)`,
        }}
        classList={{ horizontal: !isVertical }}
      >
        <For each={items()}>
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
                style={
                  isVertical
                    ? { height: `${itemHeight}px` }
                    : {
                        width: `${itemHeight}px`,
                        flex: `0 0 ${itemHeight}px`,
                      }
                }
                role="option"
                aria-selected={diff() === 0}
              >
                <div class="vizima-time-wheel__item-inner">{item}</div>
              </div>
            );
          }}
        </For>
      </div>

      {/* center highlight line */}
      {/*<div
        class="vizima-time-wheel__focus"
        style={
          isVertical
            ? {
                top: `${centerOffset()}px`,
                height: `${itemHeight}px`,
              }
            : {
                left: `${centerOffset()}px`,
                width: `${itemHeight}px`,
                top: 0,
                bottom: 0,
              }
        }
      />*/}
    </div>
  );
}

export type TimeWheelOptions = RenderOptions & {
  subscribe: ExternalSubscribe;
};
export function createTimeWheel(options: TimeWheelOptions) {
  const container = document.createElement("div");
  container.classList.add("vizima-time-wheel-container");

  styleRegistry.register("time-wheel", styles);

  mountController(container, options, ({ value }) => (
    <TimeWheel
      {...options}
      items={options.items}
      value={value}
      onChange={options.onChange}
    />
  ));

  return container;
}

const styles = `
.vizima-time-wheel {
  position: relative;
  overflow: hidden;
  user-select: none;
}

.vizima-time-wheel.dragging {
  cursor: grabbing;
}

.vizima-time-wheel__viewport {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: transform 0.18s ease-out;
}

.vizima-time-wheel__viewport.horizontal {
  flex-direction: row;
}

.vizima-time-wheel__item {
  display: grid;
  place-items: center;
  transition: all 0.18s ease;
  align-items: center;
  justify-content: center;
  // overflow: hidden;
}

.vizima-time-wheel__item .vizima-time-wheel__item-inner {
  transition: all 0.18s ease;
  opacity: 0.35;
  transform: scale(0.7);
}

/* selected */
.vizima-time-wheel__item.active .vizima-time-wheel__item-inner {
  opacity: 1;
  transform: scale(1);
  font-weight: 600;
}

/* neighbours */
.vizima-time-wheel__item.prev .vizima-time-wheel__item-inner,
.vizima-time-wheel__item.next .vizima-time-wheel__item-inner {
  opacity: 0.55;
  transform: scale(0.8);
}

/* center focus frame */
.vizima-time-wheel__focus {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}
`;
