<template>
  <!-- フローティングウインドウ内にそのまま置く版（v-dialog不使用） -->
  <div class="oh-warp-root" v-show="isOpen">
    <div class="oh-toolbar">
      <div class="oh-title"></div>
      <div class="oh-tools compact">
        <!-- プレビュー -->
        <MiniTooltip text="プレビュー" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text"
                 :disabled="pairsCount < 2"
                 @click="previewWarp" :title="'プレビュー'">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
        </MiniTooltip>

        <!-- アップロード -->
        <MiniTooltip text="アップロード" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text"
                 :disabled="!(affineM || tps)"
                 @click="confirm" :title="'アップロード'">
            <v-icon>mdi-cloud-upload</v-icon>
          </v-btn>
        </MiniTooltip>

        <v-divider vertical class="mx-1"/>

        <!-- Undo / Redo -->
        <v-btn icon variant="text" :disabled="!canUndo" @click="undo" :title="'元に戻す (Ctrl/Cmd+Z)'">
          <v-icon>mdi-undo</v-icon>
        </v-btn>
        <v-btn icon variant="text" :disabled="!canRedo" @click="redo" :title="'やり直す (Shift+Ctrl/Cmd+Z)'">
          <v-icon>mdi-redo</v-icon>
        </v-btn>

        <v-divider vertical class="mx-1"/>

        <!-- グリッド -->
        <v-btn icon variant="text" :class="{ 'is-active': grid }" @click="toggleGrid" :title="'グリッド'">
          <v-icon>mdi-grid</v-icon>
        </v-btn>

        <!-- 全消去 -->
        <v-btn icon variant="text" @click="resetAll" :title="'全消去'">
          <v-icon>mdi-backspace</v-icon>
        </v-btn>

        <v-divider vertical class="mx-1"/>

        <!-- マスキング -->
        <MiniTooltip text="マスキング" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" :class="{ 'is-active': maskMode }"
                 @click="maskMode = !maskMode" :title="'マスク（地図部の四隅を指定）'">
            <v-icon>mdi-crop</v-icon>
          </v-btn>
        </MiniTooltip>

        <MiniTooltip text="マスクを解除" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" :disabled="!maskQuadNat.length"
                 @click="clearMask" :title="'マスクをクリア'">
            <v-icon>mdi-selection-off</v-icon>
          </v-btn>
        </MiniTooltip>
      </div>
    </div>

    <div class="oh-body" :class="{ stacked }">
      <div class="left-pane">
        <div class="ml-wrap">
          <div ref="mlMap" class="ml-map"></div>

          <!-- 旧キャンバス一式は overlay に置いたまま（透明＆ヒット無効） -->
          <div class="ml-overlay">
            <img id="warp-image" ref="warpImage" :src="imgUrl" class="hidden" @load="onImageLoad">
            <canvas id="warp-canvas" ref="warpCanvas" class="warp-canvas"></canvas>
            <canvas v-show="grid" ref="gridCanvas" class="grid-canvas"></canvas>
            <canvas ref="markerCanvas" class="marker-canvas"></canvas>
          </div>

          <!-- 画像未指定時の案内（地図の上に薄く表示） -->
          <div v-if="!imgUrl" class="empty-on-map">
            画像がありません
          </div>
        </div>
      </div>

      <div class="right-pane">
        <!-- ▼▼▼ GCP編集テーブル ▼▼▼ -->
        <div class="gcp-editor">
          <div class="gcp-row header">
            <span></span>
            <span>Image (px)</span>
            <span>Map (lng, lat)</span>
            <span></span>
          </div>
          <div class="gcp-scroll">
            <div class="gcp-row" v-for="(g,i) in gcpList" :key="i">
              <div class="idx">{{ i+1 }}</div>
              <div class="img">
                <v-text-field
                    class="img-x"
                    type="number" density="compact" variant="plain" hide-details="auto"
                    :model-value="getImgX(g)" @update:modelValue="setImgX(i, $event)" />
                <v-text-field
                    class="img-y"
                    type="number" density="compact" variant="plain" hide-details="auto"
                    :model-value="getImgY(g)" @update:modelValue="setImgY(i, $event)" />
              </div>
              <div class="map">
                <v-text-field
                    type="number" step="0.000001" density="compact" variant="plain" hide-details="auto"
                    :model-value="getLng(g)" @update:modelValue="setLng(i, $event)" />
                <v-text-field
                    type="number" step="0.000001" density="compact" variant="plain" hide-details="auto"
                    :model-value="getLat(g)" @update:modelValue="setLat(i, $event)" />
              </div>
              <div class="tools">
                <v-btn icon size="small" variant="text" class="del-btn" @click="removeGcp(i)">
                  <v-icon size="26">mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
          <p style="margin-left: 20px; margin-bottom: 10px;">
            最低2点、上記画像と地図をクリックしてください。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// ======== 幾何ユーティリティ（既存） ========
function lngLatToMerc([lng, lat]){
  const x = (lng * 20037508.34) / 180;
  const ydeg = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  const y = (ydeg * 20037508.34) / 180;
  return [x, y];
}
function mercToLngLat([X, Y]){
  const lng = (X * 180) / 20037508.34;
  const ydeg = (Y * 180) / 20037508.34;
  const lat = (Math.atan(Math.exp(ydeg * Math.PI/180)) * 360/Math.PI) - 90;
  return [lng, lat];
}
function imageCssToNatural([x, y], img){
  const sx = img.naturalWidth  / (img.clientWidth  || img.naturalWidth);
  const sy = img.naturalHeight / (img.clientHeight || img.naturalHeight);
  return [x * sx, y * sy];
}
function naturalToCss([x, y], img){
  const sx = (img.clientWidth  || img.naturalWidth)  / img.naturalWidth;
  const sy = (img.clientHeight || img.naturalHeight) / img.naturalHeight;
  return [x * sx, y * sy];
}
function fitSimilarity2P(srcPts, dstPts){
  const [x1,y1] = srcPts[0], [x2,y2] = srcPts[1];
  const [X1,Y1] = dstPts[0], [X2,Y2] = dstPts[1];
  const dxs = x2 - x1, dys = y2 - y1;
  const dxt = X2 - X1, dyt = Y2 - Y1;
  const ds = Math.hypot(dxs, dys) || 1;
  const dt = Math.hypot(dxt, dyt) || 1;
  const s  = dt / ds;
  const th = Math.atan2(dyt, dxt) - Math.atan2(dys, dxs);
  const c = Math.cos(th), s_ = Math.sin(th);
  const A = s *  c, B = s * (-s_);
  const D = s *  s_, E = s *   c;
  const C = X1 - (A * x1 + B * y1);
  const F = Y1 - (D * x1 + E * y1);
  return [A,B,C,D,E,F];
}
function fitSimilarity2PExact(srcPts, dstPts){
  const [x1,y1] = srcPts[0], [x2,y2] = srcPts[1];
  const [X1,Y1] = dstPts[0], [X2,Y2] = dstPts[1];
  const vsx = x2 - x1, vsy = y2 - y1;
  const vdx = X2 - X1, vdy = Y2 - Y1;
  const ds = Math.hypot(vsx, vsy) || 1e-12;
  const dt = Math.hypot(vdx, vdy) || 1e-12;
  const s  = dt / ds;
  const th = Math.atan2(vdy, vdx) - Math.atan2(vsy, vsx);
  const c = Math.cos(th), s_ = Math.sin(th);
  const A = s*c, B = -s*s_, D = s*s_, E = s*c;
  const C = X1 - (A*x1 + B*y1);
  const F = Y1 - (D*x1 + E*y1);
  return [A,B,C,D,E,F];
}
function fitAffineN(srcPts, dstPts, w){
  const n = srcPts.length; const M = 6;
  const A = Array.from({length:M},()=>Array(M).fill(0));
  const b = Array(M).fill(0);
  for(let i=0;i<n;i++){
    const wi = w ? w[i] : 1;
    const [x,y] = srcPts[i]; const [X,Y] = dstPts[i];
    const rowX = [x, y, 1, 0, 0, 0].map(v=>wi*v);
    const rowY = [0, 0, 0, x, y, 1].map(v=>wi*v);
    for(let j=0;j<M;j++){
      for(let k=0;k<M;k++){
        A[j][k] += rowX[j]*rowX[k] + rowY[j]*rowY[k];
      }
      b[j] += rowX[j]*X + rowY[j]*Y;
    }
  }
  const x = b.slice(); const N=A.length; const B=A.map(r=>r.slice());
  for(let i=0;i<N;i++){
    let p=i; for(let r=i+1;r<N;r++){ if(Math.abs(B[r][i])>Math.abs(B[p][i])) p=r; }
    if(p!==i){ [B[i],B[p]]=[B[p],B[i]]; [x[i],x[p]]=[x[p],x[i]]; }
    const diag = B[i][i] || 1e-12;
    for(let j=i+1;j<N;j++){
      const f = B[j][i]/diag;
      for(let k=i;k<N;k++) B[j][k] -= f*B[i][k];
      x[j] -= f*x[i];
    }
  }
  for(let i=N-1;i>=0;i--){
    let s=0; for(let j=i+1;j<N;j++) s += B[i][j]*x[j];
    x[i] = (x[i] - s)/(B[i][i] || 1e-12);
  }
  return x;
}
function huberWeights(res, delta){ return res.map(r => { const a=Math.abs(r); return a<=delta ? 1 : (delta/a); }); }
function median(arr){ const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function fitAffineRobust(srcPts, dstPts, iters=3){
  let w = Array(srcPts.length).fill(1);
  let coeff = fitAffineN(srcPts, dstPts, w);
  for(let t=0;t<iters;t++){
    const res = srcPts.map(([x,y],i)=>{
      const [A,B,C,D,E,F] = coeff;
      const Xp=A*x+B*y+C, Yp=D*x+E*y+F;
      const [X,Y]=dstPts[i];
      return Math.hypot(Xp-X, Yp-Y);
    });
    w = huberWeights(res, Math.max(1, 1.4826*median(res)));
    coeff = fitAffineN(srcPts, dstPts, w);
  }
  return coeff;
}
function applyAffine([A,B,C,D,E,F],[x,y]){ return [A*x + B*y + C, D*x + E*y + F]; }
function composeAffine([A1,B1,C1,D1,E1,F1],[A2,B2,C2,D2,E2,F2]){
  const A = A1*A2 + B1*D2;
  const B = A1*B2 + B1*E2;
  const C = A1*C2 + B1*F2 + C1;
  const D = D1*A2 + E1*D2;
  const E = D1*B2 + E1*E2;
  const F = D1*C2 + E1*F2 + F1;
  return [A,B,C,D,E,F];
}
function worldFileFromAffine([A,B,C,D,E,F]){
  return `${A}
${D}
${B}
${E}
${C}
${F}`;
}
function previewOnCanvas(vm, img, canvas, M, clipNat=null){
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth, h = img.naturalHeight;
  const corners = [[0,0],[w,0],[w,h],[0,h]].map(p=>applyAffine(M,p));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width  = cw; canvas.height = ch;
  const W = Math.max(1, maxX - minX);
  const Hh = Math.max(1, maxY - minY);
  const s = Math.min(cw / W, ch / Hh);
  const T = [ s, 0, -minX * s, 0, -s,  maxY * s ];
  const Mv = composeAffine(T, M);
  const [A,B,C,D,E,F] = Mv;
  vm.viewImgToCanvas = (p) => applyAffine(Mv, p);
  vm.viewMapToCanvas = (XY) => applyAffine(T, XY);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  let clipped = false;
  if (clipNat && clipNat.length >= 3){
    ctx.save();
    ctx.beginPath();
    clipNat.forEach(([x,y],i)=>{
      const [cx,cy] = applyAffine(Mv,[x,y]);
      if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy);
    });
    ctx.closePath();
    ctx.clip();
    clipped = true;
  }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(A,D,B,E,C,F);
  ctx.drawImage(img, 0, 0);
  if (clipped) ctx.restore();
  vm.$nextTick(vm.redrawMarkers);
}

// ======== TPS utilities（既存） ========
function solveLinear(A, b) {
  const N = A.length;
  const M = A.map((r) => r.slice());
  const x = b.slice();
  for (let i = 0; i < N; i++) {
    let p = i;
    for (let r = i + 1; r < N; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    if (p !== i) { [M[i], M[p]] = [M[p], M[i]]; [x[i], x[p]] = [x[p], x[i]]; }
    const diag = M[i][i] || 1e-12;
    for (let j = i + 1; j < N; j++) {
      const f = M[j][i] / diag;
      for (let k = i; k < N; k++) M[j][k] -= f * M[i][k];
      x[j] -= f * x[i];
    }
  }
  for (let i = N - 1; i >= 0; i--) {
    let s = 0; for (let j = i + 1; j < N; j++) s += M[i][j] * x[j];
    x[i] = (x[i] - s) / (M[i][i] || 1e-12);
  }
  return x;
}
function fitTPS(srcPts, dstPts) {
  const n = srcPts.length, m = n + 3;
  const U = (r) => (r > 0 ? r * r * Math.log(r * r) : 0);
  const L = Array.from({length: m}, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = srcPts[i][0] - srcPts[j][0];
      const dy = srcPts[i][1] - srcPts[j][1];
      L[i][j] = U(Math.hypot(dx, dy));
    }
    L[i][n] = 1;
    L[i][n + 1] = srcPts[i][0];
    L[i][n + 2] = srcPts[i][1];
  }
  for (let j = 0; j < n; j++) {
    L[n][j]     = 1;
    L[n + 1][j] = srcPts[j][0];
    L[n + 2][j] = srcPts[j][1];
  }
  const bx = dstPts.map((p) => p[0]).concat([0, 0, 0]);
  const by = dstPts.map((p) => p[1]).concat([0, 0, 0]);
  const wx = solveLinear(L, bx);
  const wy = solveLinear(L, by);
  return { wx, wy, srcPts };
}
function applyTPS(tps, [x, y]) {
  const { wx, wy, srcPts } = tps;
  const n = srcPts.length;
  let X = wx[n] + wx[n + 1] * x + wx[n + 2] * y;
  let Y = wy[n] + wy[n + 1] * x + wy[n + 2] * y;
  for (let i = 0; i < n; i++) {
    const dx = x - srcPts[i][0];
    const dy = y - srcPts[i][1];
    const r2 = dx*dx + dy*dy;
    const u = r2 > 0 ? r2 * Math.log(r2) : 0;
    X += wx[i] * u; Y += wy[i] * u;
  }
  return [X, Y];
}
function previewTPSOnCanvas(vm, img, canvas, tps, mesh = 24, clipNat=null) {
  const ctx = canvas.getContext('2d');
  const W = img.naturalWidth, Himg = img.naturalHeight;
  const corners = [[0,0],[W,0],[W,Himg],[0,Himg]].map((p)=>applyTPS(tps,[p[0],-p[1]]));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width = cw; canvas.height = ch;
  const spanX = Math.max(1, maxX-minX), spanY = Math.max(1, maxY-minY);
  const s = Math.min(cw/spanX, ch/spanY);
  const view = ([X,Y]) => [ s*(X-minX), s*(maxY-Y) ];
  vm.viewImgToCanvas = (p) => view(applyTPS(tps,[p[0],-p[1]]));
  vm.viewMapToCanvas = (XY) => view(XY);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cw,ch);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  let clipped=false;
  if (clipNat && clipNat.length >= 3){
    const q = clipNat.slice();
    const edges = [[q[0],q[1]],[q[1],q[2]],[q[2],q[3]||q[0]],[q[3]||q[0],q[0]]];
    const pts=[]; const N=24;
    edges.forEach(([p0,p1])=>{
      if(!p0 || !p1) return;
      for(let i=0;i<=N;i++){
        const t=i/N; const x=p0[0]*(1-t)+p1[0]*t; const y=p0[1]*(1-t)+p1[1]*t;
        pts.push(view(applyTPS(tps,[x,-y])));
      }
    });
    ctx.save(); ctx.beginPath();
    pts.forEach(([cx,cy],i)=>{ if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy); });
    ctx.closePath(); ctx.clip(); clipped=true;
  }
  const nx=mesh, ny=mesh; const sx=W/nx, sy=Himg/ny;
  function affineFromTriangles(srcTri, dstTri){
    const p0=srcTri[0], p1=srcTri[1], p2=srcTri[2]; const q0=dstTri[0], q1=dstTri[1], q2=dstTri[2];
    const a=p1[0]-p0[0], b=p2[0]-p0[0], c=p1[1]-p0[1], d=p2[1]-p0[1];
    const det=a*d-b*c || 1e-12;
    const A=((q1[0]-q0[0])*d - (q2[0]-q0[0])*c)/det;
    const B=(-(q1[0]-q0[0])*b + (q2[0]-q0[0])*a)/det;
    const D=((q1[1]-q0[1])*d - (q2[1]-q0[1])*c)/det;
    const E=(-(q1[1]-q0[1])*b + (q2[1]-q0[1])*a)/det;
    const C=q0[0]-A*p0[0]-B*p0[1];
    const F=q0[1]-D*p0[0]-E*p0[1];
    return [A,B,C,D,E,F];
  }
  function drawTri(ctx,img,srcTri,dstTri){
    ctx.save(); ctx.beginPath();
    ctx.moveTo(dstTri[0][0], dstTri[0][1]); ctx.lineTo(dstTri[1][0], dstTri[1][1]); ctx.lineTo(dstTri[2][0], dstTri[2][1]);
    ctx.closePath(); ctx.clip(); const [a,b,c,d,e,f] = affineFromTriangles(srcTri,dstTri);
    ctx.setTransform(a,d,b,e,c,f); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  for(let j=0;j<ny;j++){
    for(let i=0;i<nx;i++){
      const x0=i*sx, y0=j*sy, x1=(i+1)*sx, y1=(j+1)*sy;
      const s00=[x0,y0], s10=[x1,y0], s11=[x1,y1], s01=[x0,y1];
      const d00=view(applyTPS(tps,[x0,-y0])); const d10=view(applyTPS(tps,[x1,-y0]));
      const d11=view(applyTPS(tps,[x1,-y1])); const d01=view(applyTPS(tps,[x0,-y1]));
      drawTri(ctx,img,[s00,s10,s11],[d00,d10,d11]); drawTri(ctx,img,[s00,s11,s01],[d00,d11,d01]);
    }
  }
  if (clipped) ctx.restore();
  return canvas;
}

import MiniTooltip from '@/components/MiniTooltip';
import maplibregl from 'maplibre-gl';

export default {
  name: 'WarpWizard',
  components: { MiniTooltip },
  props: {
    modelValue: { type:Boolean, default: true },
    open:       { type:Boolean, default: undefined },
    mapName:    { type:String,  default:'map01' },
    item:       { type:Object,  default: () => ({ id:'warp', label:'Warp Wizard' }) },
    gcpList:    { type:Array,   default: () => [] },
    file:       { type:[File,Blob], default:null },
    url:        { type:String,  default:'' },
    stacked:    { type:Boolean, default:true },
  },
  emits: ['update:gcpList','confirm','close','update:modelValue','update:open','clear-map-markers'],
  data(){
    return {
      imgUrl: null,
      affineM: null,
      tps: null,
      viewImgToCanvas: null,
      viewMapToCanvas: null,
      grid: true,
      objUrl: null,
      history: [],
      histIndex: -1,
      isRestoring: false,
      closedOnce: false,
      // マスク
      maskMode: false,
      maskQuadNat: [],
      strict2pt: true,

      // MapLibre
      map: null,
      mlReady: false,
      imageSourceId: 'warp-image-src',
      imageLayerId:  'warp-image-lyr',
      gcpSrcId: 'gcp-src',
      gcpCircleId: 'gcp-circle',
      gcpLabelId: 'gcp-label',
      gcpFC: { type:'FeatureCollection', features:[] },

      // 画像(px) ↔ 地図(3857) のホモグラフィ
      HImgToMap: null,
      HMapToImg: null,
    };
  },
  computed: {
    isOpen(){ return (this.open===undefined ? this.modelValue : this.open) !== false; },
    pairs(){ return (this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord||g.imageCoordCss) && Array.isArray(g.mapCoord)); },
    pairsCount(){ return this.pairs.length; },
    transformKind(){ if(!(this.affineM || this.tps)) return ''; return this.tps ? 'TPS' : (this.pairsCount>=3 ? 'Affine' : 'Similarity'); },
    imgMeta(){ const img=this.$refs.warpImage; if(!img) return ''; return `${img.naturalWidth}×${img.naturalHeight}`; },
    hideBaseImage(){ return true; }, // 画像タグは常に hidden（MapLibre を前面に使う）
    canUndo(){ return this.histIndex > 0; },
    canRedo(){ return this.histIndex >= 0 && this.history && this.histIndex < this.history.length - 1; },
    canDownloadWorldFile(){ return !!this.affineM; },
    srs3857(){ return 3857; },
  },
  watch: {
    modelValue(v){ if(v===false) this.onExternalClose(); },
    open(v){ if(v===false) this.onExternalClose(); },
    file: {
      immediate: true,
      handler(f){
        if(!f) return;
        if(this.objUrl){ try{ URL.revokeObjectURL(this.objUrl) }catch(e){} this.objUrl=null; }
        this.objUrl = URL.createObjectURL(f);
        this.imgUrl = this.objUrl;
        this.$nextTick(() => {
          if (!this.map) this.initMapLibre();
          this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers();
          this.resetHistory(); this.pushHistory('init:file');
          this.tryShowImageOnMap();
        });
      }
    },
    url(u){
      if(!u) return;
      this.imgUrl=u;
      this.$nextTick(()=>{
        if (!this.map) this.initMapLibre();
        this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers();
        this.resetHistory(); this.pushHistory('init:url');
        this.tryShowImageOnMap();
      });
    },

    gcpList: { deep:true, handler(){
        if(!this.isRestoring) this.pushHistory('gcp');
        this.$nextTick(()=>{
          this.redrawMarkers();
          this.updateImageOnMap(); // GCP の更新に応じて地図上の画像座標も更新
        });
      } }
  },
  beforeUnmount(){ this.onExternalClose(true); },
  mounted(){
    const h = document.querySelector('#handle-'+this.item?.id);
    if(h) h.innerHTML = `<span style="font-size: large;">${this.item?.label || 'Warp Wizard'}</span>`;
    this.$nextTick(() => { this.initMapLibre(); });
    window.addEventListener('keydown', this.onKeydown);
    window.addEventListener('resize', this.onResize);
    this.$nextTick(()=>{ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); });
  },
  methods: {
    // ========== MapLibre ==========
    initMapLibre(){
      if (this.map) return;
      const el = this.$refs.mlMap;
      if (!el) { this.$nextTick(this.initMapLibre); return; }
      this.map = new maplibregl.Map({
        container: el,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [139.767, 35.681],
        zoom: 12,
        attributionControl: true
      });
      this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
      this.map.on('load', () => {
        this.mlReady = true;
        this.tryShowImageOnMap();

        // ---- GCP markers: source
        if (!this.map.getSource(this.gcpSrcId)) {
          this.map.addSource(this.gcpSrcId, { type: 'geojson', data: this.gcpFC });
        }

        // ---- circle layer (赤丸)
        if (!this.map.getLayer(this.gcpCircleId)) {
          this.map.addLayer({
            id: this.gcpCircleId,
            type: 'circle',
            source: this.gcpSrcId,
            paint: {
              'circle-radius': 10,
              'circle-color': '#e53935',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }
          });
        }

        // ---- label layer（白文字）
        if (!this.map.getLayer(this.gcpLabelId)) {
          this.map.addLayer({
            id: this.gcpLabelId,
            type: 'symbol',
            source: this.gcpSrcId,
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 12,
              'text-allow-overlap': true,
              'text-ignore-placement': true
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 0.5
            }
          });
        }

        // クリックでマーカー + GCP（画像pxへ逆写像）
        this.bindMapClickForMarkers();
      });
    },

    // 画像のアスペクトを保って、地図中心の周囲に四隅(経緯度)を返す
    _computeImageQuadLLA(imgW, imgH){
      if (!this.map) return null;
      const center = this.map.getCenter();
      const cM = lngLatToMerc([center.lng, center.lat]);
      const b = this.map.getBounds();
      const swM = lngLatToMerc([b.getWest(), b.getSouth()]);
      const neM = lngLatToMerc([b.getEast(), b.getNorth()]);
      const viewWm = Math.max(1, neM[0] - swM[0]);

      const halfWm = viewWm * 0.25;
      const aspect = imgH / imgW;
      const halfHm = halfWm * aspect;

      const TLm = [cM[0] - halfWm, cM[1] + halfHm];
      const TRm = [cM[0] + halfWm, cM[1] + halfHm];
      const BRm = [cM[0] + halfWm, cM[1] - halfHm];
      const BLm = [cM[0] - halfWm, cM[1] - halfHm];

      return [TLm, TRm, BRm, BLm].map(mercToLngLat);
    },

    // レイヤ順：常に GCP を最上位へ
    ensureGcpLayersOnTop(){
      if (!this.map) return;
      const hasLabel  = !!this.map.getLayer(this.gcpLabelId);
      const hasCircle = !!this.map.getLayer(this.gcpCircleId);
      try {
        if (hasLabel) this.map.moveLayer(this.gcpLabelId);
        if (hasCircle) this.map.moveLayer(this.gcpCircleId, hasLabel ? this.gcpLabelId : undefined);
      } catch(e) {
        console.warn('ensureGcpLayersOnTop:', e);
      }
    },

    tryShowImageOnMap(){
      if (!this.imgUrl || !this.map || !this.mlReady) return;

      const img = this.$refs.warpImage;
      if (!img || !img.naturalWidth){
        if (!this._imgRetryTimer) {
          this._imgRetryTimer = setTimeout(() => {
            this._imgRetryTimer = null;
            this.tryShowImageOnMap();
          }, 0);
        }
        return;
      }

      try{
        const coordsLLA = this._computeImageQuadLLA(img.naturalWidth, img.naturalHeight);
        if (!coordsLLA) return;

        const sid = 'warp-image';
        const lid = 'warp-image-layer';
        const existing = this.map.getSource(sid);

        if (!existing){
          const beforeId =
              this.map.getLayer(this.gcpCircleId) ? this.gcpCircleId :
                  (this.map.getLayer(this.gcpLabelId) ? this.gcpLabelId : undefined);

          this.map.addSource(sid, {
            type: 'image',
            url: this.imgUrl,
            coordinates: coordsLLA, // [TL, TR, BR, BL]
          });
          this.map.addLayer({
            id: lid,
            type: 'raster',
            source: sid,
            paint: { 'raster-opacity': 1.0 }
          }, beforeId);

          this.ensureGcpLayersOnTop();
        } else {
          if (typeof existing.setCoordinates === 'function'){
            existing.setCoordinates(coordsLLA);
          } else {
            if (this.map.getLayer(lid)) this.map.removeLayer(lid);
            this.map.removeSource(sid);

            const beforeId =
                this.map.getLayer(this.gcpCircleId) ? this.gcpCircleId :
                    (this.map.getLayer(this.gcpLabelId) ? this.gcpLabelId : undefined);

            this.map.addSource(sid, { type:'image', url:this.imgUrl, coordinates: coordsLLA });
            this.map.addLayer({ id: lid, type:'raster', source: sid, paint:{'raster-opacity':1.0} }, beforeId);
          }
          this.ensureGcpLayersOnTop();
        }

        // ★ 画像を載せた／更新した直後に H/H^-1 を更新
        this._updateImageHomography();

      }catch(e){
        console.error('tryShowImageOnMap failed:', e);
      }
    },

    // --- 3x3 ホモグラフィ関連 ---
    _applyH(H, [x, y]){
      const X = H[0]*x + H[1]*y + H[2];
      const Y = H[3]*x + H[4]*y + H[5];
      const W = H[6]*x + H[7]*y + H[8];
      if (!W) return [NaN, NaN];
      return [X/W, Y/W];
    },
    _inv3x3(M){
      const [a,b,c,d,e,f,g,h,i]=M;
      const A =  e*i - f*h;
      const B =-(d*i - f*g);
      const C =  d*h - e*g;
      const D =-(b*i - c*h);
      const E =  a*i - c*g;
      const F =-(a*h - b*g);
      const G =  b*f - c*e;
      const Hh=-(a*f - c*d);
      const I =  a*e - b*d;
      const det = a*A + b*B + c*C;
      if (Math.abs(det) < 1e-12) return null;
      const s = 1/det;
      return [A*s, D*s, G*s, B*s, E*s, Hh*s, C*s, F*s, I*s];
    },
    _homographyFrom4(src, dst){
      // src/dst: [[x1,y1],...[x4,y4]]
      const A = [];
      for (let k=0;k<4;k++){
        const [x,y] = src[k], [X,Y] = dst[k];
        A.push([-x,-y,-1, 0, 0, 0, x*X, y*X, X]);
        A.push([ 0, 0, 0,-x,-y,-1, x*Y, y*Y, Y]);
      }
      const At = (m)=> m[0].map((_,j)=> m.map(r=>r[j]));
      const mul = (m,n)=> m.map(r=> n[0].map((_,j)=> r.reduce((s,v,ii)=> s+v*n[ii][j],0)));
      const AtA = mul(At(A), A);
      let v = Array(9).fill(0).map((_,i)=> i===8?1:0);
      for(let t=0;t<32;t++){
        const w = AtA.map(row => row.reduce((s, val, j)=> s + val*v[j], 0));
        const n = Math.hypot(...w);
        if (!n) break;
        v = w.map(x=> x/n);
      }
      return v;
    },
    _updateImageHomography(){
      const img = this.$refs.warpImage;
      if (!img || !img.naturalWidth || !this.map) return;

      const W = img.naturalWidth, H = img.naturalHeight;
      const cornersImg = [[0,0],[W,0],[W,H],[0,H]];

      // 地図に載せた四隅を 3857 に
      const sid = 'warp-image';
      const src = this.map.getSource(sid);
      if (!src || !src.coordinates) {
        // coordinates API がないビルドでも、直近で使った値を計算で再現
        const coordsLLA = this._computeImageQuadLLA(W, H);
        if (!coordsLLA) return;
        const cornersXY = coordsLLA.map(lla => lngLatToMerc(lla));
        const H9 = this._homographyFrom4(cornersImg, cornersXY);
        this.HImgToMap = H9;
        this.HMapToImg = H9 ? this._inv3x3(H9) : null;
        return;
      }
      // MapLibre v3では getSource('image').coordinates は直接は持たないので上の分岐で十分
    },

    // --- 地図クリック：赤丸 + GCPテーブルに (画像px, 緯度経度) を追加 ---
    bindMapClickForMarkers(){
      if (!this.map) return;
      if (this._gcpClickBound) return;
      this._gcpClickBound = true;

      this.map.on('click', (e) => {
        const { lng, lat } = e.lngLat || {};
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

        // まず赤丸（MapLibre上）
        this.addGcpMarker([lng, lat]);

        // つぎに画像pxへ逆写像して GCP テーブルに追加
        const img = this.$refs.warpImage;
        if (!img || !img.naturalWidth) return;

        // H が未準備なら更新を試みる
        if (!this.HMapToImg) this._updateImageHomography();
        if (!this.HMapToImg) return;

        const XY = lngLatToMerc([lng, lat]);
        const [xImg, yImg] = this._applyH(this.HMapToImg, XY);
        if (!Number.isFinite(xImg) || !Number.isFinite(yImg)) return;

        // 画像範囲外は無視（画面外クリック対策）
        const W = img.naturalWidth, H = img.naturalHeight;
        if (xImg < 0 || yImg < 0 || xImg > W || yImg > H) return;

        const next = (this.gcpList || []).slice();
        next.push({
          imageCoord: [xImg, yImg],   // 画像自然px
          mapCoord:   [lng, lat],     // 緯度経度
        });
        this.$emit('update:gcpList', next);
        this.pushHistory('map-click');
        this.$nextTick(this.redrawMarkers);
      });
    },

    addGcpMarker(lnglat){
      const nextIdx = this.gcpFC.features.length + 1;
      const feat = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: lnglat },
        properties: { label: String(nextIdx) }
      };
      this.gcpFC = { type: 'FeatureCollection', features: [...this.gcpFC.features, feat] };
      const src = this.map.getSource(this.gcpSrcId);
      if (src && src.setData) src.setData(this.gcpFC);
    },

    updateImageOnMap(){
      if (!this.mlReady) return;
      if (this.map && this.map.getSource(this.imageSourceId)){
        const coords = this.computeImageQuadLngLat();
        if (coords){
          const ordered = [coords[0], coords[1], coords[2], coords[3]];
          this.map.getSource(this.imageSourceId).setCoordinates(ordered);
        }
      } else {
        this.addOrUpdateImageSource();
      }
    },
    addOrUpdateImageSource(){
      if (!this.mlReady || !this.imgUrl) return;
      const coords = this.computeImageQuadLngLat();
      if (!coords) return;
      const ordered = [coords[0], coords[1], coords[2], coords[3]]; // TL, TR, BR, BL

      if (this.map.getSource(this.imageSourceId)){
        this.map.getSource(this.imageSourceId).updateImage({ url: this.imgUrl, coordinates: ordered });
      } else {
        this.map.addSource(this.imageSourceId, {
          type: 'image',
          url: this.imgUrl,
          coordinates: ordered,
        });
        if (!this.map.getLayer(this.imageLayerId)){
          this.map.addLayer({
            id: this.imageLayerId,
            type: 'raster',
            source: this.imageSourceId,
            paint: { 'raster-opacity': 1.0 }
          });
        }
      }
    },

    // 画像四隅の地理座標（TL, TR, BR, BL の順で返す）
    computeImageQuadLngLat(){
      const img = this.$refs.warpImage;
      if (!img || !img.naturalWidth) return null;

      const W=img.naturalWidth, H=img.naturalHeight;
      const cornersImg = [[0,0],[W,0],[W,H],[0,H]];

      if (this.pairsCount < 2){
        const c = this.map ? this.map.getCenter().toArray() : [139.767,35.681];
        const dx = 0.005, dy = 0.005;
        return [
          [c[0]-dx, c[1]+dy],
          [c[0]+dx, c[1]+dy],
          [c[0]+dx, c[1]-dy],
          [c[0]-dx, c[1]-dy],
        ];
      }

      if (this.affineM){
        const world = cornersImg.map(p => applyAffine(this.affineM, [p[0], p[1]]));
        return world.map(mercToLngLat);
      }
      if (this.tps){
        const world = cornersImg.map(p => applyTPS(this.tps, [p[0], -p[1]]));
        return world.map(mercToLngLat);
      }
      return null;
    },

    // ========== 共通ユーティリティ既存 ==========
    fmtPx(p){ if(!Array.isArray(p) || p.length<2) return '-'; const x=Number(p[0]), y=Number(p[1]); if(!Number.isFinite(x)||!Number.isFinite(y)) return '-'; return `${Math.round(x)}, ${Math.round(y)}`; },
    fmtLL(ll){ if(!Array.isArray(ll) || ll.length<2) return '-'; const lng=Number(ll[0]), lat=Number(ll[1]); if(!Number.isFinite(lng)||!Number.isFinite(lat)) return '-'; return `${lng.toFixed(6)}, ${lat.toFixed(6)}`; },

    onExternalClose(fromUnmount=false){
      try{
        if(fromUnmount){
          window.removeEventListener('keydown', this.onKeydown);
          window.removeEventListener('resize', this.onResize);
        }
      }catch(e){}
      if(this.objUrl){ try{ URL.revokeObjectURL(this.objUrl) }catch(e){} this.objUrl=null; }
      this.clearCanvas(this.$refs.warpCanvas);
      this.clearCanvas(this.$refs.gridCanvas);
      this.clearCanvas(this.$refs.markerCanvas);
      this.$emit('clear-map-markers');
      this.viewImgToCanvas = null; this.viewMapToCanvas = null;
      this.closedOnce = true;
    },

    toggleGrid(){ this.grid=!this.grid; this.$nextTick(this.drawGrid); },
    resetAll(){
      this.affineM=null; this.tps=null;
      this.viewImgToCanvas=null; this.viewMapToCanvas=null;
      this.$emit('update:gcpList', []);
      this.maskQuadNat = [];
      this.pushHistory('reset');
      this.clearCanvas(this.$refs.warpCanvas);
      this.redrawMarkers();
      this.updateImageOnMap();
    },
    onResize(){
      this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers();
      if(this.affineM || this.tps) this.previewWarp();
      if (this.map) this.map.resize();
    },
    onImageLoad(){ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); this.tryShowImageOnMap(); },

    snapshot(){
      return {
        gcpList: JSON.parse(JSON.stringify(this.gcpList||[])),
        affineM: this.affineM ? [...this.affineM] : null,
        tps: this.tps ? { wx:[...this.tps.wx], wy:[...this.tps.wy], srcPts:this.tps.srcPts.map(p=>[...p]) } : null,
        maskQuadNat: this.maskQuadNat.map(p=>[...p]),
        strict2pt: !!this.strict2pt,
      };
    },
    resetHistory(){ this.history=[]; this.histIndex=-1; },
    pushHistory(){
      if(this.isRestoring) return;
      const snap=this.snapshot();
      const cur=this.history[this.histIndex];
      if(cur && JSON.stringify(cur)===JSON.stringify(snap)) return;
      if(this.histIndex < this.history.length-1){ this.history.splice(this.histIndex+1); }
      this.history.push(snap); this.histIndex=this.history.length-1;
      if(this.history.length>50){ this.history.shift(); this.histIndex--; }
    },
    applySnapshot(snap){
      this.isRestoring=true;
      this.affineM=snap.affineM;
      this.tps = snap.tps ? { wx:[...snap.tps.wx], wy:[...snap.tps.wy], srcPts:snap.tps.srcPts.map(p=>[...p]) } : null;
      this.maskQuadNat = (snap.maskQuadNat||[]).map(p=>[...p]);
      this.strict2pt = !!snap.strict2pt;
      this.$emit('update:gcpList', JSON.parse(JSON.stringify(snap.gcpList)));
      this.$nextTick(()=>{
        this.isRestoring=false;
        if(this.affineM || this.tps) this.previewWarp();
        else { this.viewImgToCanvas=null; this.viewMapToCanvas=null; this.clearCanvas(this.$refs.warpCanvas); }
        this.redrawMarkers();
        this.updateImageOnMap();
        // H は画像レイヤ更新タイミングで再計算
      });
    },
    undo(){ if(!this.canUndo) return; this.histIndex--; this.applySnapshot(this.history[this.histIndex]); },
    redo(){ if(!this.canRedo) return; this.histIndex++; this.applySnapshot(this.history[this.histIndex]); },
    onKeydown(e){
      const isMac=/Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const mod=isMac?e.metaKey:e.ctrlKey; if(!mod) return;
      if(e.key.toLowerCase()==='z'){ e.preventDefault(); if(e.shiftKey) this.redo(); else this.undo(); }
    },

    // ===== キャンバス系（ズーム操作は削除済） =====
    syncCanvasSize(){
      const img=this.$refs.warpImage; if(!img) return;
      const cw=img.clientWidth||img.naturalWidth;
      const ch=img.clientHeight||img.naturalHeight;
      [this.$refs.warpCanvas, this.$refs.gridCanvas, this.$refs.markerCanvas]
          .forEach(c=>{ if(!c) return; c.width=cw; c.height=ch; });
    },
    clearCanvas(c){ if(!c) return; const ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,c.width,c.height); },
    drawGrid(){
      if(!this.grid) return;
      const img=this.$refs.warpImage; const canvas=this.$refs.gridCanvas;
      if(!img||!canvas) return;
      const cw=img.clientWidth||img.naturalWidth;
      const ch=img.clientHeight||img.naturalHeight;
      const ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,cw,ch);
      ctx.globalAlpha=.35; ctx.lineWidth=1; ctx.strokeStyle='rgba(0,0,0,0.6)';
      const step=Math.max(32, Math.round(cw/20));
      for(let x=0;x<cw;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke(); }
      for(let y=0;y<ch;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke(); }
      ctx.globalAlpha=1;
    },

    redrawMarkers(){
      const canvas=this.$refs.markerCanvas; const img=this.$refs.warpImage;
      if(!canvas||!img) return;
      const ctx=canvas.getContext('2d');
      const cw=canvas.width, ch=canvas.height;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,cw,ch);

      if ((this.affineM || this.tps) && this.viewImgToCanvas && this.viewMapToCanvas){
        const pairs=(this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord||g.imageCoordCss) && Array.isArray(g.mapCoord));
        const toNat = (g)=> Array.isArray(g.imageCoord) ? g.imageCoord : imageCssToNatural(g.imageCoordCss, img);
        pairs.forEach((g,idx)=>{
          const pNat = toNat(g);
          const pImgV = this.viewImgToCanvas(pNat);
          const pMapV = this.viewMapToCanvas(lngLatToMerc(g.mapCoord));
          ctx.beginPath(); ctx.moveTo(pImgV[0], pImgV[1]); ctx.lineTo(pMapV[0], pMapV[1]);
          ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(pImgV[0], pImgV[1], 8, 0, Math.PI*2);
          ctx.fillStyle='#e53935'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#ffffff'; ctx.stroke();
          ctx.beginPath(); ctx.arc(pMapV[0], pMapV[1], 8, 0, Math.PI*2);
          ctx.fillStyle='#1976d2'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#ffffff'; ctx.stroke();
          ctx.font='700 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
          ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#fff';
          ctx.fillText(String(idx+1), pImgV[0], pImgV[1]);
        });

        if (this.maskQuadNat && this.maskQuadNat.length){
          const qV = this.maskQuadNat.map(p=> this.viewImgToCanvas(p));
          ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(56,142,60,0.95)';
          ctx.fillStyle = 'rgba(56,142,60,0.12)';
          ctx.beginPath();
          qV.forEach(([x,y],i)=>{ if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
          if(qV.length>=3){ ctx.closePath(); ctx.fill(); }
          ctx.stroke();
        }
        return;
      }

      const pts=(this.gcpList||[]).map((g,idx)=>{
        if(Array.isArray(g.imageCoordCss)) return {idx,xy:g.imageCoordCss};
        if(Array.isArray(g.imageCoord))    return {idx,xy:naturalToCss(g.imageCoord, img)};
        return null;
      }).filter(Boolean);

      const r=12;
      pts.forEach(p=>{
        const [x,y]=p.xy;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle='#e53935'; ctx.fill();
        ctx.lineWidth=2.5; ctx.strokeStyle='#ffffff'; ctx.stroke();
        ctx.font='700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='#ffffff'; ctx.fillText(String(p.idx+1), x, y);
      });

      if (this.maskQuadNat && this.maskQuadNat.length){
        const qCss = this.maskQuadNat.map(p=>naturalToCss(p, img));
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(56,142,60,0.95)';
        ctx.fillStyle = 'rgba(56,142,60,0.12)';
        ctx.beginPath();
        qCss.forEach(([x,y],i)=>{ if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
        if(qCss.length>=3) { ctx.closePath(); ctx.fill(); }
        ctx.stroke();
        qCss.forEach(([x,y])=>{
          ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2);
          ctx.fillStyle='#2e7d32'; ctx.fill();
          ctx.lineWidth=2; ctx.strokeStyle='#ffffff'; ctx.stroke();
        });
      }
    },

    // ===== プレビュー生成（既存） =====
    previewWarp(){
      const toNaturalCoord = (g, img) => {
        if (Array.isArray(g.imageCoordCss)) return imageCssToNatural(g.imageCoordCss, img);
        if (Array.isArray(g.imageCoord))    return g.imageCoord;
        return null;
      };
      const img=this.$refs.warpImage, canvas=this.$refs.warpCanvas;
      if(!img||!canvas) return;

      const pairs=(this.gcpList||[]).filter(g => (Array.isArray(g.imageCoord)||Array.isArray(g.imageCoordCss)) && Array.isArray(g.mapCoord));
      if (pairs.length < 2){
        this.affineM=null; this.tps=null; this.viewImgToCanvas=null; this.viewMapToCanvas=null;
        this.clearCanvas(canvas); this.redrawMarkers(); this.updateImageOnMap(); return;
      }

      const srcNat = pairs.map(g => toNaturalCoord(g, img));
      const srcUp  = srcNat.map(([x,y]) => [x, -y]);
      const dstUp  = pairs.map(g => lngLatToMerc(g.mapCoord));
      const clipNat = (this.maskQuadNat && this.maskQuadNat.length >= 3) ? this.maskQuadNat : null;

      if (pairs.length === 2){
        const Mup = this.strict2pt ? fitSimilarity2PExact(srcUp, dstUp) : fitSimilarity2P(srcUp, dstUp);
        const FLIP_Y_A = [1,0,0, 0,-1,0];
        const M = composeAffine(Mup, FLIP_Y_A);
        this.tps=null; this.affineM = M;
        previewOnCanvas(this, img, canvas, M, clipNat);
        this.updateImageOnMap();
        return;
      }
      if (pairs.length === 3){
        const Mup = fitAffineRobust(srcUp, dstUp, 4);
        const FLIP_Y_A = [1,0,0, 0,-1,0];
        const M = composeAffine(Mup, FLIP_Y_A);
        this.tps=null; this.affineM = M;
        previewOnCanvas(this, img, canvas, M, clipNat);
        this.updateImageOnMap();
        return;
      }
      const tps = fitTPS(srcUp, dstUp);
      this.affineM = null;
      this.tps = tps;
      previewTPSOnCanvas(this, img, canvas, tps, 28, clipNat);
      this.updateImageOnMap();
    },

    // ====== ワールドファイル（既存） ======
    buildWorldAffine(){
      const img = this.$refs.warpImage; if(!img) return null;
      const pairs = (this.gcpList||[]).filter(g => (Array.isArray(g.imageCoord)||Array.isArray(g.imageCoordCss)) && Array.isArray(g.mapCoord) );
      if (pairs.length < 2) return null;

      const toNatural = (g)=>{
        if (Array.isArray(g.imageCoord)) return g.imageCoord;
        if (Array.isArray(g.imageCoordCss)) return imageCssToNatural(g.imageCoordCss, img);
        return null;
      };

      const srcNat = pairs.map(toNatural);
      const srcUp  = srcNat.map(([x,y]) => [x, -y]);
      const dstUp  = pairs.map(g => lngLatToMerc(g.mapCoord));

      let Mup;
      if (pairs.length === 2) Mup = this.strict2pt ? fitSimilarity2PExact(srcUp, dstUp) : fitSimilarity2P(srcUp, dstUp);
      else Mup = fitAffineRobust(srcUp, dstUp, 4);

      const FLIP_Y_A = [1,0,0, 0,-1,0];
      let M = composeAffine(Mup, FLIP_Y_A);

      let [A,B,C,D,E,F] = M;
      const scaleX = Math.hypot(A, D), scaleY = Math.hypot(B, E);
      const W = img.naturalWidth, Hh = img.naturalHeight;
      const worldW = scaleX * W, worldH = scaleY * Hh;
      const TOO_BIG = 6e7, TOO_FINE = 1e-3, TOO_COARSE = 1e4;
      const bad = !isFinite(worldW) || !isFinite(worldH) ||
          worldW>TOO_BIG || worldH>TOO_BIG ||
          scaleX<TOO_FINE || scaleY<TOO_FINE ||
          scaleX>TOO_COARSE || scaleY>TOO_COARSE;

      if (bad && pairs.length>=2){
        let i1=0,i2=1,maxd=-1;
        for(let a=0;a<srcUp.length;a++){
          for(let b=a+1;b<srcUp.length;b++){
            const d=Math.hypot(srcUp[b][0]-srcUp[a][0], srcUp[b][1]-srcUp[a][1]);
            if(d>maxd){maxd=d;i1=a;i2=b;}
          }
        }
        M = composeAffine(fitSimilarity2PExact([srcUp[i1],srcUp[i2]],[dstUp[i1],dstUp[i2]]), FLIP_Y_A);
      }
      return M;
    },

    // ====== 高解像エクスポート（既存） ======
    _exportAffineHighRes(img, M, clipNat=null){
      const w = img.naturalWidth, h = img.naturalHeight;
      const corners = [[0,0],[w,0],[w,h],[0,h]].map(p=>applyAffine(M,p));
      const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
      const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
      const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
      const ch = Math.max(1, img.clientHeight || img.naturalHeight);
      const viewS = Math.min(cw/(maxX-minX), ch/(maxY-minY));
      const ratio = (img.naturalWidth / cw);
      const s = viewS * ratio;
      const outW = Math.max(1, Math.round((maxX-minX) * s));
      const outH = Math.max(1, Math.round((maxY-minY) * s));
      const canvas = document.createElement('canvas');
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext('2d');
      const T = [ s, 0, -minX * s, 0, -s,  maxY * s ];
      const Mv = composeAffine(T, M);
      const [A,B,C,D,E,F] = Mv;
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,outW,outH);
      let clipped=false;
      if (clipNat && clipNat.length >= 3){
        ctx.save(); ctx.beginPath();
        clipNat.forEach(([x,y],i)=>{ const [cx,cy] = applyAffine(Mv,[x,y]); if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy); });
        ctx.closePath(); ctx.clip(); clipped=true;
      }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(A,D,B,E,C,F); ctx.drawImage(img, 0, 0);
      if (clipped) ctx.restore();
      return canvas;
    },
    _exportTPSHighRes(img, tps, clipNat=null, mesh=32){
      return previewTPSOnCanvas(this, img, document.createElement('canvas'), tps, mesh, clipNat);
    },

    // ====== アップロード処理（既存） ======
    confirm(){
      if(!(this.affineM || this.tps)) return;

      const img=this.$refs.warpImage;
      const clipNat = (this.maskQuadNat && this.maskQuadNat.length >= 3) ? this.maskQuadNat : null;

      let payload = { file: this.$props.file || null, srs: this.srs3857 };
      let cornersLngLat = null;

      if (this.tps){
        const outCanvas = this._exportTPSHighRes(img, this.tps, clipNat, 32);
        const W=img.naturalWidth, Hh=img.naturalHeight;
        const cornersImg=[[0,0],[W,0],[W,Hh],[0,Hh]];
        const cornersWorld=cornersImg.map(p=> applyTPS(this.tps, [p[0], -p[1]]));
        cornersLngLat = cornersWorld.map(mercToLngLat);
        payload = { ...payload, tps: this.tps, kind: 'tps', cornersLngLat };
        if (!outCanvas) return;
        outCanvas.toBlob((blob)=>{
          this.$emit('confirm', { ...payload, blob, maskedPngFile: null });
        }, 'image/png');
        return;
      }

      if (this.affineM){
        const kind = (this.pairsCount>=3 ? 'affine' : 'similarity');
        const wld = worldFileFromAffine(this.affineM);

        if (clipNat){
          const maskCanvas = this._exportMaskedOriginal
              ? this._exportMaskedOriginal(img, clipNat)
              : (() => {
                const c=document.createElement('canvas');
                c.width=img.naturalWidth; c.height=img.naturalHeight;
                const ctx = c.getContext('2d');
                ctx.save(); ctx.beginPath();
                clipNat.forEach(([x,y],i)=>{ if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
                ctx.closePath(); ctx.clip(); ctx.drawImage(img,0,0); ctx.restore();
                return c;
              })();

          if (!maskCanvas) return;
          const baseName = (this.$props.file && this.$props.file.name)
              ? this.$props.file.name.replace(/\.[^.]+$/, '')
              : 'image';
          maskCanvas.toBlob((blob)=>{
            const maskedPngFile = blob ? new File([blob], `${baseName}.png`, { type:'image/png' }) : null;
            this.$emit('confirm', {
              ...payload,
              kind,
              affineM: this.affineM,
              worldFileText: wld,
              blob: null,
              maskedPngFile
            });
          }, 'image/png');
          return;
        }

        this.$emit('confirm', {
          ...payload, kind, affineM: this.affineM, worldFileText: wld, blob: null,
          maskedPngFile: this.$props.file || null
        });
      }
    },

    // ====== GCPエディタ用ヘルパ（既存） ======
    getImgX(g){
      const img = this.$refs.warpImage;
      if (Array.isArray(g?.imageCoord)) return Math.round(g.imageCoord[0]);
      if (Array.isArray(g?.imageCoordCss) && img) return Math.round(imageCssToNatural(g.imageCoordCss, img)[0]);
      return g?._editImgX ?? '';
    },
    getImgY(g){
      const img = this.$refs.warpImage;
      if (Array.isArray(g?.imageCoord)) return Math.round(g.imageCoord[1]);
      if (Array.isArray(g?.imageCoordCss) && img) return Math.round(imageCssToNatural(g.imageCoordCss, img)[1]);
      return g?._editImgY ?? '';
    },
    setImgX(index, v){
      const img=this.$refs.warpImage;
      const x=Number(v);
      const next=(this.gcpList||[]).slice();
      const g={ ...(next[index]||{}) };
      const y = Array.isArray(g.imageCoord)
          ? Number(g.imageCoord[1])
          : (Array.isArray(g.imageCoordCss)&&img ? imageCssToNatural(g.imageCoordCss, img)[1] : NaN);
      if (Number.isFinite(x) && Number.isFinite(y)){
        g.imageCoord=[x,y];
        if(img) g.imageCoordCss = naturalToCss(g.imageCoord, img);
        delete g._editImgX; delete g._editImgY;
      } else {
        g._editImgX=v;
      }
      next[index]=g; this.$emit('update:gcpList', next); this.$nextTick(this.redrawMarkers);
    },
    setImgY(index, v){
      const img=this.$refs.warpImage;
      const y=Number(v);
      const next=(this.gcpList||[]).slice();
      const g={ ...(next[index]||{}) };
      const x = Array.isArray(g.imageCoord)
          ? Number(g.imageCoord[0])
          : (Array.isArray(g.imageCoordCss)&&img ? imageCssToNatural(g.imageCoordCss, img)[0] : NaN);
      if (Number.isFinite(x) && Number.isFinite(y)){
        g.imageCoord=[x,y];
        if(img) g.imageCoordCss = naturalToCss(g.imageCoord, img);
        delete g._editImgX; delete g._editImgY;
      } else {
        g._editImgY=v;
      }
      next[index]=g; this.$emit('update:gcpList', next); this.$nextTick(this.redrawMarkers);
    },
    getLng(g){ if(Array.isArray(g?.mapCoord)) return Number(g.mapCoord[0]); return g?._editLng ?? ''; },
    getLat(g){ if(Array.isArray(g?.mapCoord)) return Number(g.mapCoord[1]); return g?._editLat ?? ''; },
    setLng(index, v){
      const next=(this.gcpList||[]).slice();
      const g={ ...(next[index]||{}) };
      const lng = Number(v);
      const lat = (g._editLat!==undefined) ? Number(g._editLat) : (Array.isArray(g.mapCoord) ? Number(g.mapCoord[1]) : NaN);
      g._editLng = v;
      if(Number.isFinite(lng) && Number.isFinite(lat)){
        g.mapCoord=[lng, lat];
        delete g._editLng; delete g._editLat;
      }
      next[index]=g; this.$emit('update:gcpList', next);
    },
    setLat(index, v){
      const next=(this.gcpList||[]).slice();
      const g={ ...(next[index]||{}) };
      const lat = Number(v);
      const lng = (g._editLng!==undefined) ? Number(g._editLng) : (Array.isArray(g.mapCoord) ? Number(g.mapCoord[0]) : NaN);
      g._editLat = v;
      if(Number.isFinite(lng) && Number.isFinite(lat)){
        g.mapCoord=[lng, lat];
        delete g._editLng; delete g._editLat;
      }
      next[index]=g; this.$emit('update:gcpList', next);
    },
  }
};
</script>

<style scoped>
/* ====== コンテナ ====== */
.oh-warp-root{
  width: 100%; max-width: none; box-sizing: border-box; background: #fff;
  overflow: hidden; display: flex; flex-direction: column; height: 100%; min-height: 0;
}

/* ====== ツールバー ====== */
.oh-toolbar{
  display:flex; align-items:center; justify-content:space-between;
  padding: 6px 8px;
  background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0));
  border-bottom: 1px solid rgba(0,0,0,0.08);
  min-height: 40px;
}
.oh-toolbar .v-btn.v-btn--icon{ width:32px; height:32px; }
.oh-toolbar .v-btn.is-active{ background: rgba(0,0,0,0.06); }
.oh-toolbar .mx-1{ margin: 0 6px !important; }
.oh-title{ font-weight:600; display:flex; align-items:center; gap:8px; }

.oh-tools.compact{
  display:flex; align-items:center; gap:2px;
  flex-wrap: nowrap; overflow: hidden;
}

/* ====== 本体（左右レイアウト） ====== */
.oh-body{ flex: 1 1 auto; min-height: 0; display:grid; grid-template-columns: 1fr auto; gap:10px; padding:10px; }
.oh-body.stacked{ grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
.oh-body.stacked .left-pane{ order:1; }
.oh-body.stacked .right-pane{ order:2; }

/* ====== 左ペイン（地図＋overlay） ====== */
.left-pane{
  display:flex; align-items:center; justify-content:center; min-height: 420px;
  background: rgba(0,0,0,0.03); border: 1px dashed rgba(0,0,0,0.2); border-radius: 10px;
}

/* MapLibre ラッパ：必ず relative */
.ml-wrap { position: relative; width: 100%; height: 100%; min-height: 420px; }

/* MapLibre 本体は前面 */
.ml-map {
  position: relative;
  z-index: 10 !important;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

/* overlay は背面＆クリック無効＆透明（描画は可能） */
.ml-overlay{
  position: absolute;
  inset: 0;
  z-index: 0 !important;
  pointer-events: none !important;
  opacity: 0;
}

/* 旧 UI 要素（表示はしない／ヒット不可） */
#warp-image.hidden{ visibility:hidden; }
.warp-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:1; }
.grid-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; opacity:.45; z-index:2; }
.marker-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:3; }

/* ====== 右ペイン（編集） ====== */
.right-pane{ padding:4px 0; display:flex; flex-direction:column; min-height:0; overflow:hidden; }

.empty-on-map{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  color:#6b7280; font-weight:600; pointer-events:none;
  z-index: 20; /* 地図の上に薄く表示 */
}

/* ====== GCPエディタ ====== */
.gcp-editor{ padding:0; margin-bottom:8px; background: rgba(0,0,0,0.03); border: 1px dashed rgba(0,0,0,0.2); border-radius: 10px; }
.gcp-row{ display:grid; grid-template-columns: auto auto auto auto; align-items:center; gap:4px; padding:0; height:38px; }
.gcp-row.header{ font-size:11px; color:#6b7280; font-weight:600; letter-spacing:.02em; text-transform:uppercase; padding:0 0 4px; }
.gcp-row:not(.header):not(:last-child){ border-bottom: 1px solid rgba(0,0,0,0.05); }
.gcp-row .img, .gcp-row .map{ display:grid; grid-template-columns: auto auto; gap:6px; }
.gcp-row .idx{ margin-left: 10px; text-align:center; }
.gcp-scroll{ flex: 1 1 auto; min-height: 0; overflow: auto; margin-top:4px; }
.img-x, .img-y{ margin-left: 10px; width: 50px; }

/* Vuetify field 調整 */
:deep(.gcp-editor .v-input--density-compact){ --v-input-control-height: 24px; }
:deep(.gcp-editor .v-field__input){ min-height:22px; padding:0 3px; }
:deep(.gcp-editor .v-field--variant-plain .v-field__overlay){ background:transparent; }
:deep(.gcp-editor .v-field__outline){ display:none; }
</style>
