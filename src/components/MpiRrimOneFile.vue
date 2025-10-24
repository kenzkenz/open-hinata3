<template>
  <div class="rrim-control">
    <v-btn size="small" @click="toggle" class="mr-2">赤色立体(GPU)</v-btn>
    <v-slider
        v-model="opacity"
        min="0" max="1" step="0.05"
        density="compact" style="width:160px"
        :disabled="!enabled" label="不透明度"
    />
  </div>
</template>

<script>
// 最小GPU版：
// 1) Solidパス（薄赤）で描画パイプ生存確認
// 2) タイル到着後にDEMパス（勾配→赤着色）へ自動切替
export default {
  name: 'MpiRrimOneFile',
  props: {
    map: { type: Object, required: true },
    startEnabled: { type: Boolean, default: true },
    tileUrlTemplate: {
      type: String,
      default: 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
    },
    insertBeforeLayerId: { type: String, default: undefined }
  },
  data(){
    return {
      enabled: this.startEnabled,
      opacity: 0.95,
      LAYER_ID: 'oh3-rrim-gpu-stable',
      tileSize: 256,
      maxTiles: 128,
      params: { slopeMaxDeg: 22, gammaS: 0.82, contrast: 1.2, saturationBoost: 1.15 },
      // 内部
      customLayer: null,
      glRes: null,
      lru: new Map(),        // key: z/x/y => {tex,w,h,at}
      loading: new Set(),
      tNow: 0,
      rafId: 0,
      anyTextureReady: false,
      lastGoodMatrix: null
    };
  },
  mounted(){
    if (this.enabled) this.attach();
    const loop = () => {
      this.tNow = performance.now();
      if (this.enabled && this.map && this.map.triggerRepaint) this.map.triggerRepaint();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  },
  beforeUnmount(){
    cancelAnimationFrame(this.rafId);
    this.detach();
  },
  watch: {
    enabled(v){ v ? this.attach() : this.detach(); },
    opacity(){ if (this.map && this.map.triggerRepaint) this.map.triggerRepaint(); }
  },
  methods: {
    toggle(){ this.enabled = !this.enabled; },

    attach(){
      if (this.customLayer) return;
      const self = this;
      const layer = {
        id: this.LAYER_ID,
        type: 'custom',
        renderingMode: '2d',
        onAdd(map, gl){
          self.glRes = self.initGL(gl);
          try{
            gl.disable(gl.DEPTH_TEST);
            gl.depthMask(false);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.CULL_FACE);
          }catch(e){}
        },
        render(gl, matrix){ if (self.glRes) self.renderTiles(gl, matrix); },
        onRemove(map, gl){ self.disposeGL(); }
      };
      this.customLayer = layer;
      this.map.addLayer(layer, this.insertBeforeLayerId);
    },

    detach(){
      if (!this.customLayer) return;
      try { this.map.removeLayer(this.LAYER_ID); } catch(e){}
      this.disposeGL();
      this.customLayer = null;
    },

    // ---- GL 初期化 ----
    initGL(gl){
      const vsrc = `
attribute vec2 aPos;
attribute vec2 aUv;
varying vec2 vUv;
uniform mat4 uMatrix;
void main(){
  vUv = aUv;
  gl_Position = uMatrix * vec4(aPos.xy, 0.0, 1.0);
}
`;
      const fSolid = `
precision mediump float;
varying vec2 vUv;
uniform float uOpacity;
void main(){
  gl_FragColor = vec4(1.0, 0.2, 0.2, uOpacity * 0.25);
}
`;
      const fDem = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDem;
uniform vec2 uTexel;
uniform float uPxM;
uniform float uOpacity;
uniform float uSlopeMaxDeg;
uniform float uGammaS;
uniform float uContrast;
uniform float uSatBoost;

float rgb2h(vec3 rgb){
  // 128,0,0 を NoData とみなす（厳密比較は避けて許容誤差）
  if (abs(rgb.r - 0.5019608) < 0.0005 && rgb.g < 0.0005 && rgb.b < 0.0005) return -1.0e20;
  float R = rgb.r*255.0;
  float G = rgb.g*255.0;
  float B = rgb.b*255.0;
  return (R*65536.0 + G*256.0 + B)*0.01 - 10000.0;
}

void main(){
  vec3 c = texture2D(uDem, vUv).rgb;
  float h = rgb2h(c);
  if (h < -1.0e19) { gl_FragColor = vec4(0.0); return; }

  // 片側差分（隣接がNoDataなら自己値）
  vec3 cx = texture2D(uDem, vUv + vec2(uTexel.x, 0.0)).rgb;
  vec3 cy = texture2D(uDem, vUv + vec2(0.0, uTexel.y)).rgb;
  float hx = rgb2h(cx); if (hx < -1.0e19) hx = h;
  float hy = rgb2h(cy); if (hy < -1.0e19) hy = h;

  float dzdx = (hx - h) / uPxM;
  float dzdy = (hy - h) / uPxM;
  float slopeDeg = atan(length(vec2(dzdx, dzdy))) * 57.2957795;

  float Sat = clamp(slopeDeg / max(0.001, uSlopeMaxDeg), 0.0, 1.0);
  Sat = pow(Sat, uGammaS) * uSatBoost;
  Sat = clamp(Sat, 0.0, 1.0);

  float L = 0.5 + 0.5 * clamp(slopeDeg / 45.0, 0.0, 1.0);
  L = (L - 0.5) * uContrast + 0.5;
  L = clamp(L, 0.0, 1.0);

  // HSV(h=0) → 赤
  float cval = L * Sat;
  float x = cval * (1.0 - abs(mod(0.0/60.0, 2.0) - 1.0));
  float m = L - cval;
  vec3 rgb = vec3(cval, x, 0.0) + vec3(m);

  gl_FragColor = vec4(rgb, uOpacity);
}
`;
      const progSolid = this.createProgram(gl, vsrc, fSolid);
      const progDem   = this.createProgram(gl, vsrc, fDem);

      const makeRes = (prog) => ({
        prog,
        aPos: gl.getAttribLocation(prog, 'aPos'),
        aUv:  gl.getAttribLocation(prog, 'aUv'),
        uMatrix: gl.getUniformLocation(prog, 'uMatrix'),
        uOpacity: gl.getUniformLocation(prog, 'uOpacity'),
        uDem: gl.getUniformLocation(prog, 'uDem'),
        uTexel: gl.getUniformLocation(prog, 'uTexel'),
        uPxM: gl.getUniformLocation(prog, 'uPxM'),
        uSlopeMaxDeg: gl.getUniformLocation(prog, 'uSlopeMaxDeg'),
        uGammaS: gl.getUniformLocation(prog, 'uGammaS'),
        uContrast: gl.getUniformLocation(prog, 'uContrast'),
        uSatBoost: gl.getUniformLocation(prog, 'uSatBoost')
      });

      const resSolid = makeRes(progSolid);
      const resDem   = makeRes(progDem);

      const posBuf = gl.createBuffer();
      const uvBuf  = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);

      return { gl, resSolid, resDem, posBuf, uvBuf };
    },

    disposeGL(){
      if (!this.glRes) return;
      const gl = this.glRes.gl;
      for (const e of this.lru.values()) { try{ gl.deleteTexture(e.tex);}catch(e){} }
      this.lru.clear();
      try{
        gl.deleteBuffer(this.glRes.posBuf);
        gl.deleteBuffer(this.glRes.uvBuf);
      }catch(e){}
      this.glRes = null;
    },

    createProgram(gl, vs, fs){
      const make = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          throw new Error(gl.getShaderInfoLog(s) || 'shader');
        }
        return s;
      };
      const p = gl.createProgram();
      const v = make(gl.VERTEX_SHADER, vs);
      const f = make(gl.FRAGMENT_SHADER, fs);
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(p) || 'link');
      }
      return p;
    },

    // 行列を必ず Float32Array(16) に正規化
    asF32Matrix(m){
      if (m instanceof Float32Array && m.length === 16) return m;
      if (ArrayBuffer.isView(m) && m.length === 16) return new Float32Array(m);
      if (Array.isArray(m) && m.length === 16) return new Float32Array(m);
      if (m && m.elements && ArrayBuffer.isView(m.elements) && m.elements.length === 16) return new Float32Array(m.elements);
      if (m && m.data && ArrayBuffer.isView(m.data) && m.data.length === 16) return new Float32Array(m.data);
      return this.lastGoodMatrix || new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    },

    // ---- 描画 ----
    renderTiles(gl, matrix){
      const g = this.glRes; if (!g) return;
      const map = this.map; const z = Math.floor(map.getZoom());

      const b = map.getBounds();
      const Wm = 20037508.342789244*2;
      const tiles = 1 << z;
      const mpt = Wm / tiles;

      const lng2x = (lng)=> (lng*20037508.34/180 + Wm/2) / mpt;
      const lat2y = (lat)=> { let y = Math.log(Math.tan((90+lat)*Math.PI/360)) / (Math.PI/180); y = y*20037508.34/180; return (Wm/2 - y) / mpt; };

      const xsW = Math.floor(lng2x(b.getWest()));
      const xsE = Math.floor(lng2x(b.getEast()));
      const ysN = Math.floor(lat2y(b.getNorth()));
      const ysS = Math.floor(lat2y(b.getSouth()));

      const yStart = Math.max(0, Math.min(ysN, ysS));
      const yEnd   = Math.min(tiles-1, Math.max(ysN, ysS));
      const xStart = Math.max(0, Math.min(xsW, xsE));
      const xEnd   = Math.min(tiles-1, Math.max(xsW, xsE));

      const useRes = this.anyTextureReady ? g.resDem : g.resSolid;
      gl.useProgram(useRes.prog);

      // 共通 uniform
      if (useRes.uOpacity) gl.uniform1f(useRes.uOpacity, this.opacity);
      if (useRes.uMatrix) {
        const m4 = this.asF32Matrix(matrix);
        gl.uniformMatrix4fv(useRes.uMatrix, false, m4);
        this.lastGoodMatrix = m4;
      }
      if (useRes.uSlopeMaxDeg) gl.uniform1f(useRes.uSlopeMaxDeg, this.params.slopeMaxDeg);
      if (useRes.uGammaS) gl.uniform1f(useRes.uGammaS, this.params.gammaS);
      if (useRes.uContrast) gl.uniform1f(useRes.uContrast, this.params.contrast);
      if (useRes.uSatBoost) gl.uniform1f(useRes.uSatBoost, this.params.saturationBoost);

      const pxM = mpt / this.tileSize; if (useRes.uPxM) gl.uniform1f(useRes.uPxM, pxM);
      const texel = 1 / this.tileSize; if (useRes.uTexel) gl.uniform2f(useRes.uTexel, texel, texel);

      gl.bindBuffer(gl.ARRAY_BUFFER, g.uvBuf);
      gl.enableVertexAttribArray(useRes.aUv);
      gl.vertexAttribPointer(useRes.aUv, 2, gl.FLOAT, false, 0, 0);

      const now = this.tNow;
      const drawRange = (xa, xb) => {
        for (let ty = yStart; ty <= yEnd; ty++){
          for (let tx = xa; tx <= xb; tx++){
            const key = z+'/'+tx+'/'+ty;
            const ent = this.lru.get(key);

            const minX = -Wm/2 + tx*mpt, maxX = minX + mpt;
            const maxY =  Wm/2 - ty*mpt, minY = maxY - mpt;
            const verts = new Float32Array([ minX,minY,  maxX,minY,  minX,maxY,  maxX,maxY ]);

            gl.bindBuffer(gl.ARRAY_BUFFER, g.posBuf);
            gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STREAM_DRAW);
            gl.enableVertexAttribArray(useRes.aPos);
            gl.vertexAttribPointer(useRes.aPos, 2, gl.FLOAT, false, 0, 0);

            if (useRes === g.resDem && ent && ent.tex){
              ent.at = now;
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, ent.tex);
              gl.uniform1i(useRes.uDem, 0);
            }
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            if (useRes === g.resDem && !ent) this.enqueueTile(z, tx, ty);
          }
        }
      };

      // 子午線跨ぎ対応
      if (xsE >= xsW) { drawRange(xStart, xEnd); }
      else { drawRange(0, xEnd); drawRange(xStart, tiles-1); }

      // LRU
      if (this.lru.size > this.maxTiles){
        const arr = Array.from(this.lru.entries()).sort((a,b)=>(a[1].at|0)-(b[1].at|0));
        const over = arr.length - this.maxTiles;
        for (let i=0; i<over; i++){
          const [k, v] = arr[i];
          try{ this.glRes.gl.deleteTexture(v.tex);}catch(e){}
          this.lru.delete(k);
        }
      }
    },

    // ---- タイル ----
    enqueueTile(z,x,y){
      const key = z+'/'+x+'/'+y;
      if (this.loading.has(key) || this.lru.has(key)) return;
      this.loading.add(key);
      const url = this.tileUrlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      fetch(url, {mode:'cors'})
          .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); })
          .then(b=>createImageBitmap(b))
          .then(bmp=>{
            this.uploadTile(z,x,y,bmp);
            this.loading.delete(key);
            this.anyTextureReady = true;
            if (this.map && this.map.triggerRepaint) this.map.triggerRepaint();
          })
          .catch(err=>{
            console.warn('[RRIM GPU] tile load fail', err);
            this.loading.delete(key);
          });
    },

    uploadTile(z,x,y,bmp){
      const gl = this.glRes && this.glRes.gl; if(!gl) return;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
      const key = z+'/'+x+'/'+y;
      this.lru.set(key, { tex, w: bmp.width, h: bmp.height, at: this.tNow });
    }
  }
}
</script>

<style scoped>
.rrim-control {
  position: absolute;
  top: 200px;
  z-index: 100;
  display: flex; align-items: center; gap: 8px;
}
</style>
