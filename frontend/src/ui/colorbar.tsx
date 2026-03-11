/** @jsxImportSource solid-js */
import {
  type ColorScaleStatic,
  createColorScale,
} from "../layers/colormap/colorscale";
import * as d3 from "d3";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";
import { createEffect, Show, createMemo } from "solid-js";
import type { DataVarMeta } from "../data/dataset";
import { is } from "zod/v4/locales";

function computeExponent(domain: number[]): number {
  const maxAbs = d3.max(domain);
  if (maxAbs === undefined || maxAbs === 0) return 0;

  const exp = Math.floor(Math.log10(maxAbs));

  return exp >= 3 || exp <= -3 ? exp : 0;
}

const tickFormat = (value: d3.NumberValue) => d3.format(".3~g")(Number(value));

function toLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function getContrastColor(color: string): string {
  const c = d3.color(color)?.rgb();
  if (!c) return "#000";
  const L =
    0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
  return L > 0.5 ? "#000" : "#fff";
}

const superscript = (num: number) =>
  num
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

type RenderOptions = {
  value: () => {
    scale: ColorScaleStatic;
    gridMeta: DataVarMeta;
  } | null;
  orientation?: "horizontal" | "vertical";
  ticks?: number;
  tickSize?: number;
  labelSize?: number;
  tickLabelSize?: number;
  colorBarThickness?: number;
  colorBarLength?: number;
};

const LABEL_SIZE = 14;
const TICK_LABEL_SIZE = 11;
const COLORBAR_LENGTH = 200;
const COLORBAR_THICKNESS = 20;
const COLORBAR_TICKSIZE = 0;
const COLORBAR_TICKS = 4;

export const ColorBar = ({
  value,
  orientation = "horizontal",
  ticks = 4,
  tickSize = 0,
  colorBarThickness = COLORBAR_THICKNESS,
  colorBarLength = COLORBAR_LENGTH,
  labelSize = LABEL_SIZE,
  tickLabelSize = TICK_LABEL_SIZE,
}: RenderOptions) => {
  const totalThickness = colorBarThickness + tickSize + labelSize + 5;
  const isHorizontal = orientation === "horizontal";
  const width = isHorizontal ? colorBarLength : totalThickness;
  const height = isHorizontal ? totalThickness : colorBarLength;

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
    let range: number[];
    const size = isHorizontal ? width : height;
    if (domainScaled().length === 3) {
      range = [0, size / 2, size];
    } else {
      range = [0, size];
    }
    if (!isHorizontal) range.reverse();
    return d3.scaleLinear().domain(domainScaled()).range(range);
  });

  const axis = createMemo(() => {
    if (!axisScale()) return null;

    const ax = isHorizontal
      ? d3.axisBottom(axisScale()!).ticks(ticks).tickFormat(tickFormat)
      : d3.axisRight(axisScale()!).ticks(ticks).tickFormat(tickFormat);
    return ax.tickSizeOuter(0).tickSizeInner(tickSize);
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
    const sel = d3.select(gAxis).call(axis()!);

    sel.selectAll<SVGTextElement, number>(".tick text").attr("fill", (d) => {
      if (!scale() || !colorScale()) return "#000";

      const exp = exponent();
      const actualValue = d * Math.pow(10, exp);

      const bg = colorScale()!(actualValue);
      return getContrastColor(bg);
    });

    if (isHorizontal) {
      sel
        .selectAll(".tick text")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle");
    } else {
      sel
        .selectAll(".tick text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("transform", "rotate(-90)");
    }
  });

  const labelX = isHorizontal ? width / 2 : width - 5;
  const labelY = isHorizontal ? labelSize : height / 2;

  const axisOffset =
    colorBarThickness / 2 -
    tickLabelSize / 2 -
    5 +
    (isHorizontal ? labelSize + 5 : 0);

  function colorStop(d: number) {
    const domain = scale()!.domain;
    const [min, max] = d3.extent(domain) as [number, number];
    return colorScale()!(min + d * (max - min));
  }

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
              <stop offset={`${d * 100}%`} stop-color={colorStop(d)} />
            ))}
          </linearGradient>
        </defs>
        <rect
          x={0}
          y={orientation === "horizontal" ? labelSize + 5 : 0}
          class="colorbar__bar"
          width={orientation === "horizontal" ? width : colorBarThickness}
          height={orientation === "horizontal" ? colorBarThickness : height}
          fill={`url(#${gradientId})`}
          rx={colorBarThickness / 4}
        />
        <g
          ref={gAxis}
          class="colorbar__axis"
          transform={
            orientation === "horizontal"
              ? `translate(0,${axisOffset})`
              : `translate(${axisOffset + 5},0)`
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

export type ColorBarOptions = RenderOptions & {
  subscribe: ExternalSubscribe;
};

export function createColorBar(options: ColorBarOptions) {
  const container = document.createElement("div");
  container.classList.add("vizima-controller-container");
  const options1 = { ...options, labelSize: options.labelSize ?? 14 };
  styleRegistry.register("colorbar", createStyle(options1));
  mountController(container, options1, ({ value }) => (
    <ColorBar {...options} value={value} />
  ));
  return container;
}

function createStyle(kwds: { labelSize: number }) {
  const styles = `
    /* svg background */
    .colorbar {
      background: var(--vizima-ui-bg, rgba(20, 20, 22, 0.3));
      border-radius: 4px;
      position: relative;
      z-index: 10;
    }

    /* axis lines & ticks */
    .colorbar__axis path,
    .colorbar__axis line {
      display: none;
    }

    .colorbar__axis text {
      // fill: #bbb;
      font-size: 10px;
    }

    .colorbar__label {
      fill: #ddd;
      font-size: ${kwds.labelSize}px;
      font-weight: 500;
    }

    /* optional bar tweaks */
    .colorbar__bar {
      shape-rendering: crispEdges;
    }`;
  return styles;
}
