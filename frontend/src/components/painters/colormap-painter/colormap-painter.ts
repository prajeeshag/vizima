import { Painter } from "../painter";
import { PixelField } from "../../pixel-field";
import { logger } from "../../../logger";
import * as d3 from "d3";
import { createColorScale, type ColorScaleStatic } from "./colorscale";

type ColorMapProps = {
  readonly pixelField: PixelField;
  readonly colorScale: ColorScaleStatic;
};

const ALPHA = 0.9;

export class ColorMapPainter extends Painter<ColorMapProps> {
  private readonly logger = logger.child({ component: "ColorMapPainter" });

  private webglInit = false;
  private canvas: HTMLCanvasElement | null = null;
  private program?: WebGLProgram;
  private quad?: WebGLBuffer;
  private valueTex?: WebGLTexture;
  private lutTex?: WebGLTexture;

  async draw(canvas: HTMLCanvasElement, signal: AbortSignal) {
    if (!this.canvas || this.canvas !== canvas) {
      this.canvas = canvas;
      this.webglInit = false;
    }

    if (canvas.getContext("webgl2")) {
      console.log("WebGL2 context available");
      return this.drawWebGl2(signal);
    }
    return this.drawCPU(signal);
  }

  private async drawCPU(signal: AbortSignal) {
    const ctx = this.canvas!.getContext("2d")!;
    const pixelField = this.props.pixelField;
    const imgData = ctx.createImageData(
      pixelField.viewSize[0],
      pixelField.viewSize[1],
    );
    const rgba = imgData.data;

    const colorScale = createColorScale(this.props.colorScale);

    for (let i = 0; i < pixelField.value.array.length; i++) {
      const val = pixelField.value.array[i];
      const pos = i * 4;

      if (val === undefined || isNaN(val)) {
        rgba[pos + 3] = 0;
        continue;
      }
      const { r, g, b } = d3.rgb(colorScale(val));
      rgba[pos] = r;
      rgba[pos + 1] = g;
      rgba[pos + 2] = b;
      rgba[pos + 3] = Math.round(255 * ALPHA);
    }

    ctx.putImageData(imgData, 0, 0);
  }

  private initWebGl2() {
    if (this.webglInit) return;
    const gl = this.canvas!.getContext("webgl2")!;
    this.program = createProgram(gl, VERT_SRC, FRAG_SRC);
    this.quad = gl.createBuffer()!;
    this.valueTex = gl.createTexture()!;
    this.lutTex = gl.createTexture()!;
  }

  private async drawWebGl2(signal: AbortSignal) {
    this.initWebGl2();
    const gl = this.canvas?.getContext("webgl2")!;
    const { pixelField, colorScale } = this.props;
    const [w, h] = pixelField.viewSize;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program!);

    // fullscreen quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad!);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(this.program!, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const arr = pixelField.value.array;
    const min = pixelField.value.range[0];
    const max = pixelField.value.range[1];

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.valueTex!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, arr);

    const LUT_SIZE = 256;
    const lut = new Uint8Array(LUT_SIZE * 4);
    const scale = createColorScale(colorScale);
    for (let i = 0; i < LUT_SIZE; i++) {
      const t = i / (LUT_SIZE - 1);
      const { r, g, b } = d3.rgb(scale(min + t * (max - min)));
      const p = i * 4;
      lut[p] = r;
      lut[p + 1] = g;
      lut[p + 2] = b;
      lut[p + 3] = 255 * ALPHA;
    }

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      LUT_SIZE,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      lut,
    );

    gl.uniform1i(gl.getUniformLocation(this.program!, "uValueTex"), 0);
    gl.uniform1i(gl.getUniformLocation(this.program!, "uLutTex"), 1);
    gl.uniform1f(gl.getUniformLocation(this.program!, "uMin"), min);
    gl.uniform1f(gl.getUniformLocation(this.program!, "uMax"), max);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export function createColorMapPainter(props: ColorMapProps) {
  return new ColorMapPainter(props, null);
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  return p;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

const VERT_SRC = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(
    0.5 * (aPos.x + 1.0),
    1.0 - 0.5 * (aPos.y + 1.0)
  );
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uValueTex;
uniform sampler2D uLutTex;
uniform float uMin;
uniform float uMax;

void main() {
  float val = texture(uValueTex, vUv).r;

  if (isnan(val)) {
    discard;
  }

  float t = clamp((val - uMin) / (uMax - uMin), 0.0, 1.0);
  vec4 c = texture(uLutTex, vec2(t, 0.5)).rgba;

  outColor = c;
}
`;
