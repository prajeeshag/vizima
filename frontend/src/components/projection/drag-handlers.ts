import { type DragBehavior } from "d3-drag";
import versor from "versor";
import { drag as d3drag } from "d3-drag";
import { type ProjectorState, type ProjectionName } from ".";

export interface IGlobe {
  getRotation(): [number, number, number];
  setRotation(r: [number, number, number]): void;
  getTranslate(): [number, number];
  setTranslate(t: [number, number]): void;
  getScale(): number;
  setScale(s: number): void;
  getProjState(): ProjectorState;
  invert(point: [number, number]): [number, number] | null | undefined;
}

interface DragHandler {
  (
    globe: IGlobe,
    renderDrag: (config: ProjectorState) => void,
    renderEnd: (config: ProjectorState) => void,
  ): DragBehavior<HTMLCanvasElement, unknown, unknown>;
}

function dragRotation(
  globe: IGlobe,
  renderDrag: (config: ProjectorState) => void,
  renderEnd: (config: ProjectorState) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  let v0: [number, number];
  let r0: [number, number, number];
  let q0: number;

  return (
    d3drag<HTMLCanvasElement, unknown>()
      // FILTER: Only allow drag if it's NOT a two-finger touch (pinch)
      .filter((event) => {
        return !event.touches || event.touches.length < 2;
      })
      .on("start", (event) => {
        const r = globe.getRotation();
        // Convert current rotation to a versor (quaternion)
        const coord = globe.invert?.([event.x, event.y]);
        if (!coord) return;
        v0 = versor.cartesian(coord);
        r0 = r;
        q0 = versor(r);
      })
      .on("drag", (event) => {
        // CRITICAL: If a second finger touches mid-drag, stop rotating immediately
        if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
          return;
        }
        // 2. Calculate the current mouse position in 3D cartesian space
        globe.setRotation(r0);
        const coord = globe.invert([event.x, event.y]);
        if (!coord) return;
        const v1 = versor.cartesian(coord);

        // 3. Calculate the rotation difference (the "delta" in 3D)
        const q1 = versor.multiply(q0, versor.delta(v0, v1));

        // Update the projection with the new rotation
        const angles = versor.rotation(q1);

        // fix to 2 decimal places
        const rot: [number, number, number] = [
          Math.round(angles[0] * 10) / 10,
          Math.round(angles[1] * 10) / 10,
          Math.round(angles[2] * 10) / 10,
        ];

        globe.setRotation(rot);
        const canvas = event.sourceEvent.target;
        canvas.style.cursor = "grabbing";
        renderDrag(globe.getProjState());
      })
      .on("end", (event) => {
        const canvas = event.sourceEvent.target;
        canvas.style.cursor = "default";
        renderEnd(globe.getProjState());
      })
  );
}

function dragRotationSimple(
  globe: IGlobe,
  renderDrag: (projConfig: ProjectorState) => void,
  renderEnd: (projConfig: ProjectorState) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  return d3drag<HTMLCanvasElement, unknown>()
    .filter((event) => !event.touches || event.touches.length < 2)
    .on("start", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "grabbing";
    })
    .on("drag", (event) => {
      const rotation = globe.getRotation();

      const scale = globe.getScale();
      const sensitivity = 75 / scale;

      const newRotation: [number, number, number] = [
        rotation[0] + event.dx * sensitivity,
        rotation[1] - event.dy * sensitivity,
        rotation[2],
      ];

      newRotation[1] = Math.max(-90, Math.min(90, newRotation[1]));

      globe.setRotation(newRotation);
      renderDrag(globe.getProjState());
    })
    .on("end", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "default";
      renderEnd(globe.getProjState());
    });
}

function dragTranslate(
  globe: IGlobe,
  renderDrag: (projState: ProjectorState) => void,
  renderEnd: (projState: ProjectorState) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  let t0: [number, number];
  let p0: [number, number];

  return d3drag<HTMLCanvasElement, unknown>()
    .filter((event) => {
      return !event.touches || event.touches.length < 2;
    })
    .on("start", (event) => {
      t0 = globe.getTranslate();
      p0 = [event.x, event.y];
    })
    .on("drag", (event) => {
      if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
        return;
      }

      const dx = event.x - p0[0];
      const dy = event.y - p0[1];

      const point: [number, number] = [
        Math.round(t0[0] + dx),
        Math.round(t0[1] + dy),
      ];
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "move";
      globe.setTranslate(point);
      renderDrag(globe.getProjState());
    })
    .on("end", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "default";
      renderEnd(globe.getProjState());
    });
}

function dragTranslateWrapX(
  globe: IGlobe,
  renderDrag: (projConfig: ProjectorState) => void,
  renderEnd: (projConfig: ProjectorState) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  let t0: [number, number];
  let r0: [number, number, number];
  let p0: [number, number];

  return d3drag<HTMLCanvasElement, unknown>()
    .filter((event) => {
      return !event.touches || event.touches.length < 2;
    })
    .on("start", (event) => {
      t0 = globe.getTranslate();
      r0 = globe.getRotation();
      p0 = [event.x, event.y];
    })
    .on("drag", (event) => {
      if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
        return;
      }

      const dx = event.x - p0[0];
      const dy = event.y - p0[1];

      const scale = globe.getScale();
      const sensitivity = 75 / scale;
      const newRotation: [number, number, number] = [
        r0[0] + dx * sensitivity,
        r0[1],
        r0[2],
      ];

      const newTranslate: [number, number] = [t0[0], Math.round(t0[1] + dy)];

      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "move";

      globe.setRotation(newRotation);
      globe.setTranslate(newTranslate);

      renderDrag(globe.getProjState());
    })
    .on("end", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "default";
      renderEnd(globe.getProjState());
    });
}

export function getDragHandler(name: ProjectionName): DragHandler {
  switch (name) {
    case "Orthographic":
      return dragRotation;
    case "Equirectangular":
    case "EqualEarth":
    case "Mercator":
      return dragTranslateWrapX;
    case "Lambert":
    case "LonLat":
    case "Polar":
      return dragTranslate;
    default:
      const _exhaustiveCheck: never = name;
      throw new Error(`Unhandled projection type: ${name}`);
  }
}
