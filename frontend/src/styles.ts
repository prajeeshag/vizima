let injected = false;

export const className = "vizima-view-canvas-stack";

export function injectStyles() {
  if (injected) return;

  const styleId = "visima-canvas-styles";
  if (document.getElementById(styleId)) {
    injected = true;
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .${className} {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        /* Ensure the container matches the canvas size */
        width: fit-content;
    }
    .${className} > canvas {
        grid-area: 1 / 1 / 2 / 2; /* All canvases start at row 1, col 1 */
        pointer-events: none;     /* Do not allow interaction */
    }
    /* Except for the first canvas */
    .${className} > canvas:first-child {
      pointer-events: auto;
    }
    `;
  document.head.appendChild(style);
}
