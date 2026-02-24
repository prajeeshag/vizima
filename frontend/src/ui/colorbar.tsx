/** @jsxImportSource solid-js */
import {
  type ColorScaleStatic,
  createColorScale,
} from "../components/painters/colormap-painter";
import * as d3 from "d3";
import { styleRegistry } from "../styles";
import {
  mountController,
  type ExternalSubscribe,
} from "./_internal/mount-controller";
import { createEffect, Show, createMemo } from "solid-js";
import type { DataVarMeta } from "../components/dataset";

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
  const width = orientation === "horizontal" ? colorBarLength : totalThickness;
  const height = orientation === "horizontal" ? totalThickness : colorBarLength;

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

    const ax =
      orientation === "horizontal"
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
    if (orientation === "horizontal") {
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

  const labelX = orientation === "horizontal" ? width / 2 : width - 5;
  const labelY = orientation === "horizontal" ? height - 5 : height / 2;

  const axisOffset = colorBarThickness / 2 - tickLabelSize / 2 - 5;
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
          width={orientation === "horizontal" ? width : colorBarThickness}
          height={orientation === "horizontal" ? colorBarThickness : height}
          fill={`url(#${gradientId})`}
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

export function createColorBar(
  container: HTMLElement,
  options: RenderOptions & {
    subscribe: ExternalSubscribe;
  },
) {
  const options1 = { ...options, labelSize: options.labelSize ?? 14 };
  styleRegistry.register("colorbar", createStyle(options1));
  return mountController(container, options1, ({ value }) => (
    <ColorBar {...options} value={value} />
  ));
}

function createStyle(kwds: { labelSize: number }) {
  const styles = `
    /* svg background */
    .colorbar {
      background: transparent;
      position: relative;
      z-index: 10;
    }

    /* axis lines & ticks */
    .colorbar__axis path,
    .colorbar__axis line {
      display: none;
      // stroke: #555;
      // stroke: none;
    }

    .colorbar__axis text {
      fill: #999;
      font-size: 11px;
    }

    /* label text */
    .colorbar__label {
      fill: #555;
      font-size: ${kwds.labelSize}px;
      font-weight: 500;
    }

    /* optional bar tweaks */
    .colorbar__bar {
      shape-rendering: crispEdges;
    }`;
  return styles;
}
