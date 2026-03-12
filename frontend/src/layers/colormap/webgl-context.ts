import { PixelField } from "../../data/pixel-field";
import * as d3 from "d3";
import { createColorScale, type ColorScaleStatic } from "./colorscale";

export class WebGLColormapContext {
  private program: WebGLProgram;
  private quad: WebGLBuffer;
  private valueTex: WebGLTexture;
  private lutTex: WebGLTexture;
  private gl: WebGL2RenderingContext;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl2")!;
    this.program = createProgram(this.gl, VERT_SRC, FRAG_SRC);
    this.quad = this.gl.createBuffer()!;
    this.valueTex = this.gl.createTexture()!;
    this.lutTex = this.gl.createTexture()!;
  }

  draw(pixelField: PixelField, colorScale: ColorScaleStatic, alpha: number) {
    const gl = this.gl;
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
      lut[p + 3] = 255 * alpha;
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
    // upload textures and draw — no init work, it's already done
  }

  destroy() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.quad);
    this.gl.deleteTexture(this.valueTex);
    this.gl.deleteTexture(this.lutTex);
  }
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
