import { type ColorScaleStatic, createColorScale } from "../colorscale";
import * as d3 from "d3";
import { styleRegistry } from "../styles";

type ColorBarProps = {
  scale: ColorScaleStatic;
  orientation: "horizontal" | "vertical";
  label: string;
  ticks: number;
};

export function createColorBarRender() {
  styleRegistry.register("colorbar", styles);
  return renderColorBar;
}

export function renderColorBar(
  mount: HTMLDivElement,
  props: ColorBarProps,
): void {
  const { scale, orientation, label, ticks } = props;

  mount.innerHTML = "";

  const width = orientation === "horizontal" ? 300 : 70;
  const height = orientation === "horizontal" ? 60 : 300;

  const svg = d3
    .select(mount)
    .append("svg")
    .attr("class", "colorbar")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g").attr("class", "colorbar__inner");

  const colorScale = createColorScale(scale);

  // ---- axis scale ----
  const axisScale =
    orientation === "horizontal"
      ? d3.scaleLinear().domain(scale.domain).range([0, width])
      : d3.scaleLinear().domain(scale.domain).range([height, 0]);

  // ---- gradient ----
  const defs = svg.append("defs");
  const gradientId = `cb-${Math.random().toString(36).slice(2)}`;

  const gradient = defs
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("class", "colorbar__gradient")
    .attr("x1", orientation === "horizontal" ? "0%" : "0%")
    .attr("y1", orientation === "horizontal" ? "0%" : "100%")
    .attr("x2", orientation === "horizontal" ? "100%" : "0%")
    .attr("y2", orientation === "horizontal" ? "0%" : "0%");

  const stops = d3.range(0, 1.0001, 0.01);
  gradient
    .selectAll("stop")
    .data(stops)
    .enter()
    .append("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) =>
      colorScale(scale.domain[0]! + d * (scale.domain[1]! - scale.domain[0]!)),
    );

  // ---- bar ----
  g.append("rect")
    .attr("class", "colorbar__bar")
    .attr("width", orientation === "horizontal" ? width : 20)
    .attr("height", orientation === "horizontal" ? 20 : height)
    .attr("fill", `url(#${gradientId})`);

  // ---- axis ----
  const axis =
    orientation === "horizontal"
      ? d3.axisBottom(axisScale).ticks(ticks)
      : d3.axisRight(axisScale).ticks(ticks);

  g.append("g")
    .attr("class", "colorbar__axis")
    .attr(
      "transform",
      orientation === "horizontal" ? `translate(0,20)` : `translate(20,0)`,
    )
    .call(axis);

  // ---- label ----
  const x = orientation === "horizontal" ? width / 2 : 65;
  const y = orientation === "horizontal" ? height - 5 : height / 2;
  svg
    .append("text")
    .attr("class", "colorbar__label")
    .attr("x", x)
    .attr("y", y)
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      orientation === "vertical"
        ? // ? null
          `rotate(-90, ${x}, ${y})`
        : null,
    )
    .text(label);

  // g.append("text")
  //   .attr("class", "colorbar__label")
  //   .attr("x", orientation === "horizontal" ? width / 2 : -height / 2)
  //   .attr("y", orientation === "horizontal" ? 20 + 30 : -30)
  //   .attr("text-anchor", "middle")
  //   .attr("transform", orientation === "vertical" ? "rotate(-90)" : null)
  //   .text(label);
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
    fill: #222;
    font-size: 12px;
    font-weight: 500;
  }

  /* optional bar tweaks */
  .colorbar__bar {
    shape-rendering: crispEdges;
  }`;
