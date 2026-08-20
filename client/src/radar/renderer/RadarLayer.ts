import maplibregl, { CustomLayerInterface, CustomRenderMethodInput, Map } from 'maplibre-gl';
import type { DecodedL3, RadarMetadata } from '../types';
import { destination } from '../geometry';
import { paletteTexture, Palette } from '../palette';
import { fragmentShader, vertexShader } from './shaders';

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed');
  return shader;
}

export class RadarLayer implements CustomLayerInterface {
  id = 'zasnet-radar'; type = 'custom' as const; renderingMode = '2d' as const;
  private gl?: WebGL2RenderingContext; private program?: WebGLProgram; private position?: WebGLBuffer; private value?: WebGLBuffer; private state?: WebGLBuffer; private texture?: WebGLTexture; private count = 0; private opacity = 0.85; private mode = 2; private visible = true; private palette: Palette; private decoded?: DecodedL3; private metadata?: RadarMetadata;
  constructor(palette: Palette) { this.palette = palette; }
  onAdd(_map: Map, gl: WebGLRenderingContext) {
    const webgl = gl as WebGL2RenderingContext;
    if (typeof WebGL2RenderingContext === 'undefined' || !(webgl instanceof WebGL2RenderingContext)) throw new Error('WebGL2 is required');
    this.gl = webgl; this.program = webgl.createProgram()!;
    webgl.attachShader(this.program, compile(webgl, webgl.VERTEX_SHADER, vertexShader)); webgl.attachShader(this.program, compile(webgl, webgl.FRAGMENT_SHADER, fragmentShader)); webgl.linkProgram(this.program);
    if (!webgl.getProgramParameter(this.program, webgl.LINK_STATUS)) throw new Error('program link failed');
    this.texture = webgl.createTexture()!; this.uploadPalette(); if (this.decoded && this.metadata) this.uploadGeometry();
  }
  setData(decoded: DecodedL3, metadata: RadarMetadata) { this.decoded = decoded; this.metadata = metadata; if (this.gl) this.uploadGeometry(); }
  setPalette(palette: Palette) { this.palette = palette; if (this.gl) this.uploadPalette(); }
  setOpacity(value: number) { this.opacity = value; }
  setVisible(value: boolean) { this.visible = value; }
  setMode(mode: 'Raw' | 'Smooth' | 'Broadcast') { this.mode = { Raw: 0, Smooth: 1, Broadcast: 2 }[mode]; }
  private uploadPalette() { const gl = this.gl; if (!gl || !this.texture) return; gl.bindTexture(gl.TEXTURE_2D, this.texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteTexture(this.palette)); }
  private uploadGeometry() {
    const gl = this.gl, decoded = this.decoded, metadata = this.metadata; if (!gl || !decoded || !metadata) return;
    const positions: number[] = [], values: number[] = [], states: number[] = [];
    for (let r = 0; r < decoded.header.radial_count; r++) for (let g = 0; g < decoded.header.gate_count; g++) {
      const radial = decoded.header.radials[r], r0 = radial.first_gate_m + g * radial.gate_spacing_m, r1 = r0 + radial.gate_spacing_m;
      const corners = [[radial.start_azimuth, r0], [radial.end_azimuth, r0], [radial.end_azimuth, r1], [radial.start_azimuth, r1]].map(([bearing, range]) => { const [lon, lat] = destination(metadata.latitude, metadata.longitude, bearing, range); const point = maplibregl.MercatorCoordinate.fromLngLat([lon, lat]); return [point.x, point.y] as [number, number]; });
      const value = decoded.values[r * decoded.header.gate_count + g], state = decoded.states[r * decoded.header.gate_count + g];
      for (const i of [0, 1, 2, 0, 2, 3]) { positions.push(...corners[i]); values.push(value); states.push(state); }
    }
    this.count = values.length; this.position = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, this.position); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); this.value = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, this.value); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW); this.state = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, this.state); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(states), gl.STATIC_DRAW);
  }
  render(gl: WebGLRenderingContext, options: CustomRenderMethodInput) {
    const g = gl as WebGL2RenderingContext; if (!this.visible || !this.program || !this.position || !this.value || !this.state || !this.texture) return; g.useProgram(this.program);
    const bind = (buffer: WebGLBuffer, name: string, size: number) => { g.bindBuffer(g.ARRAY_BUFFER, buffer); const location = g.getAttribLocation(this.program!, name); g.enableVertexAttribArray(location); g.vertexAttribPointer(location, size, g.FLOAT, false, 0, 0); };
    bind(this.position, 'a_position', 2); bind(this.value, 'a_value', 1); bind(this.state, 'a_state', 1); g.uniformMatrix4fv(g.getUniformLocation(this.program, 'u_matrix'), false, options.modelViewProjectionMatrix as Float32List); g.uniform1f(g.getUniformLocation(this.program, 'u_opacity'), this.opacity); g.uniform1f(g.getUniformLocation(this.program, 'u_mode'), this.mode); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, this.texture); g.uniform1i(g.getUniformLocation(this.program, 'u_palette'), 0); g.enable(g.BLEND); g.blendFuncSeparate(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA, g.ONE, g.ONE_MINUS_SRC_ALPHA); g.drawArrays(g.TRIANGLES, 0, this.count);
  }
  onRemove(map: Map) { const gl = this.gl; if (gl) { for (const buffer of [this.position, this.value, this.state]) if (buffer) gl.deleteBuffer(buffer); if (this.texture) gl.deleteTexture(this.texture); if (this.program) gl.deleteProgram(this.program); } map.triggerRepaint(); }
}
