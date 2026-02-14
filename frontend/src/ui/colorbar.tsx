/** @jsxImportSource solid-js */
import { type ColorScaleStatic, createColorScale } from "../colorscale";
import * as d3 from "d3";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";
import { createEffect, Show, createMemo } from "solid-js";
import type { DataVarMeta } from "../components/dataset";

type RenderOptions = {
  orientation: "horizontal" | "vertical";
  ticks: number;
  value: () => {
    scale: ColorScaleStatic;
    gridMeta: DataVarMeta;
  } | null;
};

function computeExponent(domain: number[]): number {
  const maxAbs = d3.max(domain);
  if (maxAbs === undefined || maxAbs === 0) return 0;

  const exp = Math.floor(Math.log10(maxAbs));

  return exp >= 3 || exp <= -3 ? exp : 0;
}

const tickFormat = (value: d3.NumberValue) => d3.format(".3~g")(Number(value));

const superscript = (n: number) =>
  n
    .toString()
    .replace(/-/g, "⁻")
    .replace(/0/g, "⁰")
    .replace(/1/g, "¹")
    .replace(/2/g, "²")
    .replace(/3/g, "³")
    .replace(/4/g, "⁴")
    .replace(/5/g, "⁵")
    .replace(/6/g, "⁶")
    .replace(/7/g, "⁷")
    .replace(/8/g, "⁸")
    .replace(/9/g, "⁹");

export const ColorBar = (props: RenderOptions) => {
  const { value, orientation, ticks } = props;

  const width = orientation === "horizontal" ? 300 : 70;
  const height = orientation === "horizontal" ? 60 : 300;

  let gAxis!: SVGGElement;

  const prop = createMemo(value);

  const scale = createMemo(() => prop()?.scale);
  const gridMeta = createMemo(() => prop()?.gridMeta);

  const exponent = createMemo(() =>
    scale() ? computeExponent(scale()!.domain) : 0,
  );

  const domainScaled = createMemo(() => {
    if (!scale()) return [];
    const exp = exponent();
    return scale()!.domain.map((d) => d / Math.pow(10, exp));
  });

  const axisScale = createMemo(() => {
    if (!scale()) return null;

    return orientation === "horizontal"
      ? d3.scaleLinear().domain(domainScaled()).range([0, width])
      : d3.scaleLinear().domain(domainScaled()).range([height, 0]);
  });

  const axis = createMemo(() => {
    if (!axisScale()) return null;

    return orientation === "horizontal"
      ? d3.axisBottom(axisScale()!).ticks(ticks).tickFormat(tickFormat)
      : d3.axisRight(axisScale()!).ticks(ticks).tickFormat(tickFormat);
  });

  const colorScale = createMemo(() =>
    scale() ? createColorScale(scale()!) : null,
  );

  const labelText = createMemo(() => {
    if (!gridMeta() || !scale()) return "";

    const units = gridMeta()!.units || "";
    const label = gridMeta()!.standard_name || "";

    const exp = exponent();
    const exponentLabel = exp === 0 ? "" : `×10${superscript(exp)} `;
    const unitsLabel = `${exponentLabel}${units}`;
    const fullUnitsLabel = unitsLabel ? ` (${unitsLabel})` : "";

    return `${label}${fullUnitsLabel}`;
  });

  const gradientId = `cb-${Math.random().toString(36).slice(2)}`;
  const stops = d3.range(0, 1.0001, 0.01);

  createEffect(() => {
    if (!axis() || !gAxis) return;
    d3.select(gAxis).call(axis()!);
  });

  const labelX = orientation === "horizontal" ? width / 2 : 65;
  const labelY = orientation === "horizontal" ? height - 5 : height / 2;

  return (
    <Show
      when={scale() && scale()!.domain.length > 1 && colorScale()}
      fallback={null}
    >
      <svg class="colorbar" width={width} height={height}>
        <defs>
          <linearGradient
            id={gradientId}
            x1={orientation === "horizontal" ? "0%" : "0%"}
            y1={orientation === "horizontal" ? "0%" : "100%"}
            x2={orientation === "horizontal" ? "100%" : "0%"}
            y2={orientation === "horizontal" ? "0%" : "0%"}
          >
            {stops.map((d) => (
              <stop
                offset={`${d * 100}%`}
                stop-color={colorScale()!(
                  scale()!.domain[0]! +
                    d * (scale()!.domain[1]! - scale()!.domain[0]!),
                )}
              />
            ))}
          </linearGradient>
        </defs>

        <rect
          class="colorbar__bar"
          width={orientation === "horizontal" ? width : 20}
          height={orientation === "horizontal" ? 20 : height}
          fill={`url(#${gradientId})`}
        />

        <g
          ref={gAxis}
          class="colorbar__axis"
          transform={
            orientation === "horizontal" ? `translate(0,20)` : `translate(20,0)`
          }
        />

        <text
          class="colorbar__label"
          x={labelX}
          y={labelY}
          text-anchor="middle"
          transform={
            orientation === "vertical"
              ? `rotate(-90, ${labelX}, ${labelY})`
              : undefined
          }
        >
          {labelText()}
        </text>
      </svg>
    </Show>
  );
};

export function createColorBar(
  container: HTMLElement,
  options: RenderOptions & {
    subscribe: ExternalSubscribe;
  },
) {
  styleRegistry.register("colorbar", styles);
  const mountOptions = {
    ...options,
    onChange: () => {},
  };
  return mountController(container, mountOptions, ({ value, onChange }) => (
    <ColorBar
      value={value}
      ticks={options.ticks}
      orientation={options.orientation}
    />
  ));
}

const styles = `
  /* svg background */
  .colorbar {
    background: transparent;
  }

  /* axis lines & ticks */
  .colorbar__axis path,
  .colorbar__axis line {
    stroke: #555;
  }

  .colorbar__axis text {
    fill: #555;
    font-size: 11px;
  }

  /* label text */
  .colorbar__label {
    fill: #555;
    font-size: 12px;
    font-weight: 500;
  }

  /* optional bar tweaks */
  .colorbar__bar {
    shape-rendering: crispEdges;
  }`;
