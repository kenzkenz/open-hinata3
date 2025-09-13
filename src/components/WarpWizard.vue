<template>
  <!-- フローティングウインドウ内にそのまま置く版（v-dialog不使用） -->
  <div class="oh-warp-root" v-show="isOpen">
    <div class="oh-toolbar">
      <div class="oh-title"></div>
      <div class="oh-tools">
        <v-btn :disabled="pairsCount < 2" @click="previewWarp">プレビュー</v-btn>
        <v-btn :disabled="!(affineM || H || tps)" @click="confirm">アップロード</v-btn>
        <v-divider vertical class="mx-1"/>
        <v-btn style="width: 25px;" icon variant="text" :disabled="!canUndo" @click="undo" :title="'元に戻す (Ctrl/Cmd+Z)'"><v-icon>mdi-undo</v-icon></v-btn>
        <v-btn style="width: 25px;" icon variant="text" :disabled="!canRedo" @click="redo" :title="'やり直す (Shift+Ctrl/Cmd+Z)'"><v-icon>mdi-redo</v-icon></v-btn>
        <v-divider vertical class="mx-1"/>
        <v-btn icon variant="text" :class="{ 'is-active': grid }" @click="toggleGrid" :title="'グリッド'"><v-icon>mdi-grid</v-icon></v-btn>
        <v-btn icon variant="text" @click="resetAll" :title="'全消去'"><v-icon>mdi-backspace</v-icon></v-btn>
        <v-divider vertical class="mx-1"/>
        <v-chip size="small" class="mr-1" label> {{ pairsCount }}</v-chip>
        <v-chip v-if="transformKind" :color="transformKindColor" size="small" class="mr-1" label>{{ transformKind }}</v-chip>
        <v-chip v-if="imgMeta" size="small" class="mr-1" label>{{ imgMeta }}</v-chip>
        <!--        <v-divider vertical class="mx-1"/>-->
        <!-- DL: 4点の挙動で固定化したワールドファイル（3857） -->
        <!--        <v-tooltip text="World File をダウンロード (EPSG:3857 / 4点相当のアフィン)" location="bottom">-->
        <!--          <template #activator="{ props }">-->
        <!--            <v-btn v-bind="props" icon variant="text" :disabled="!canDownloadWorldFile" @click="downloadWorldFile" :title="worldFileHint">-->
        <!--              <v-icon>mdi-download</v-icon>-->
        <!--            </v-btn>-->
        <!--          </template>-->
        <!--        </v-tooltip>-->
      </div>
    </div>

    <div class="oh-body" :class="{ stacked }">
      <div class="left-pane">
        <div v-if="!imgUrl" class="empty">画像がありません</div>
        <div v-else
             class="img-wrap"
             :style="zoomStyle"
             @wheel.prevent="onWheel"
             @mousedown.left="onPanStart"
             @click="onImageAreaClick">
          <img id="warp-image" ref="warpImage" :src="imgUrl" :class="{ hidden: hideBaseImage }" @load="onImageLoad">
          <canvas id="warp-canvas" ref="warpCanvas" class="warp-canvas"></canvas>
          <canvas v-show="grid" ref="gridCanvas" class="grid-canvas"></canvas>
          <canvas ref="markerCanvas" class="marker-canvas"></canvas>
        </div>
      </div>

      <div class="right-pane">
        <!-- ▼▼▼ 追加：GCP編集テーブル（アップロードの上） ▼▼▼ -->
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
                    type="number" density="compact" variant="plain" hide-details="auto"
                    :model-value="getImgX(g)" @update:modelValue="setImgX(i, $event)" />
                <v-text-field
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
          <p style="margin-left: 20px; margin-bottom: 10px;">最低2点、上記画像と地図をクリックしてください。 </p>
        </div>

        <!--        <div class="actions">-->
        <!--          <p>2〜4点、上記画像と地図をクリックしてください。 </p>-->
        <!--          <v-btn color="primary" :disabled="!(affineM || H)" @click="confirm">-->
        <!--            <v-icon class="mr-1">mdi-cloud-upload</v-icon>アップロード-->
        <!--          </v-btn>-->
        <!--        </div>-->
      </div>
    </div>
  </div>
</template>

<script>
// ======== 幾何ユーティリティ ========
function lngLatToMerc([lng, lat]){
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  const yMeters = y * 20037508.34 / 180;
  return [x, yMeters];
}
function mercToLngLat([X, Y]){
  const lng = X * 180 / 20037508.34;
  const ydeg = Y * 180 / 20037508.34;
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
  const dxs = x2 - x1, dys = y2 - y1; const dxt = X2 - X1, dyt = Y2 - Y1;
  const ds = Math.hypot(dxs, dys) || 1; const dt = Math.hypot(dxt, dyt) || 1;
  const s  = dt / ds; const th = Math.atan2(dyt, dxt) - Math.atan2(dys, dxs);
  const cos = Math.cos(th), sin = Math.sin(th);
  const A = s *  cos, B = s * (-sin); const D = s *  sin, E = s *   cos;
  const C = X1 - (A * x1 + B * y1);   const F = Y1 - (D * x1 + E * y1);
  return [A,B,C,D,E,F];
}
function fitAffineN(srcPts, dstPts, w){
  const n = srcPts.length; const M = 6;
  const A = Array.from({length:M},()=>Array(M).fill(0));
  const b = Array(M).fill(0);
  for(let i=0;i<n;i++){
    const wi = w? w[i] : 1; const [x,y] = srcPts[i]; const [X,Y] = dstPts[i];
    const rowX = [x, y, 1, 0, 0, 0].map(v=>wi*v);
    const rowY = [0, 0, 0, x, y, 1].map(v=>wi*v);
    for(let j=0;j<M;j++){
      for(let k=0;k<M;k++) A[j][k] += rowX[j]*rowX[k] + rowY[j]*rowY[k];
      b[j] += rowX[j]*X + rowY[j]*Y;
    }
  }
  const x = b.slice(); const N=A.length; const B=A.map(r=>r.slice());
  for(let i=0;i<N;i++){
    let p=i; for(let r=i+1;r<N;r++){ if(Math.abs(B[r][i])>Math.abs(B[p][i])) p=r }
    if(p!==i){ [B[i],B[p]]=[B[p],B[i]]; [x[i],x[p]]=[x[p],x[i]] }
    const diag = B[i][i] || 1e-12;
    for(let j=i+1;j<N;j++){
      const f = B[j][i]/diag; for(let k=i;k<N;k++) B[j][k]-=f*B[i][k]; x[j]-=f*x[i];
    }
  }
  for(let i=N-1;i>=0;i--){ let s=0; for(let j=i+1;j<N;j++) s+=B[i][j]*x[j]; x[i]=(x[i]-s)/(B[i][i]||1e-12); }
  return x; // [A,B,C,D,E,F]
}
function huberWeights(res, delta){ return res.map(r => { const a=Math.abs(r); return a<=delta ? 1 : (delta/a); }); }
function median(arr){ const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2 }
function fitAffineRobust(srcPts, dstPts, iters=3){
  let w = Array(srcPts.length).fill(1);
  let coeff = fitAffineN(srcPts, dstPts, w);
  for(let t=0;t<iters;t++){
    const res = srcPts.map(([x,y],i)=>{
      const [A,B,C,D,E,F] = coeff; const Xp=A*x+B*y+C, Yp=D*x+E*y+F; const [X,Y]=dstPts[i];
      return Math.hypot(Xp-X, Yp-Y);
    });
    w = huberWeights(res, Math.max(1, 1.4826*median(res)));
    coeff = fitAffineN(srcPts, dstPts, w);
  }
  return coeff;
}
function applyAffine([A,B,C,D,E,F],[x,y]){ return [A*x+B*y+C, D*x+E*y+F] }
function composeAffine([A1,B1,C1,D1,E1,F1],[A2,B2,C2,D2,E2,F2]){
  const A = A1*A2 + B1*D2; const B = A1*B2 + B1*E2; const C = A1*C2 + B1*F2 + C1;
  const D = D1*A2 + E1*D2; const E = D1*B2 + E1*E2; const F = D1*C2 + E1*F2 + F1; return [A,B,C,D,E,F];
}
function previewOnCanvas(vm, img, canvas, M){
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth, h = img.naturalHeight;
  const corners = [[0,0],[w,0],[w,h],[0,h]].map(p=>applyAffine(M,p));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width  = cw; canvas.height = ch;
  const W = Math.max(1, maxX - minX); const Hh = Math.max(1, maxY - minY);
  const s = Math.min(cw / W, ch / Hh);
  const T = [ s, 0, -minX * s, 0, -s,  maxY * s ];
  const Mv = composeAffine(T, M); const [A,B,C,D,E,F] = Mv;
  const ctx2 = ctx; ctx2.setTransform(A,D,B,E,C,F);
  ctx2.clearRect(0,0,canvas.width,canvas.height);
  ctx2.imageSmoothingEnabled = true; ctx2.imageSmoothingQuality = 'high';
  ctx2.drawImage(img, 0, 0);
}
function worldFileFromAffine([A,B,C,D,E,F]){ return `${A}\n${D}\n${B}\n${E}\n${C}\n${F}`; }

/* ======== 射影（ホモグラフィ）ユーティリティ ======== */
function mat33Mul(A,B){
  return [
    [A[0][0]*B[0][0]+A[0][1]*B[1][0]+A[0][2]*B[2][0],
      A[0][0]*B[0][1]+A[0][1]*B[1][1]+A[0][2]*B[2][1],
      A[0][0]*B[0][2]+A[0][1]*B[1][2]+A[0][2]*B[2][2]],
    [A[1][0]*B[0][0]+A[1][1]*B[1][0]+A[1][2]*B[2][0],
      A[1][0]*B[0][1]+A[1][1]*B[1][1]+A[1][2]*B[2][1],
      A[1][0]*B[0][2]+A[1][1]*B[1][2]+A[1][2]*B[2][2]],
    [A[2][0]*B[0][0]+A[2][1]*B[1][0]+A[2][2]*B[2][0],
      A[2][0]*B[0][1]+A[2][1]*B[1][1]+A[2][2]*B[2][1],
      A[2][0]*B[0][2]+A[2][1]*B[1][2]+A[2][2]*B[2][2]],
  ];
}
function mat33InvAffine(M){
  const a=M[0][0], b=M[0][1], c=M[0][2];
  const d=M[1][0], e=M[1][1], f=M[1][2];
  const det = a*e - b*d || 1e-12;
  return [
    [ e/det, -b/det, (b*f - e*c)/det ],
    [ -d/det, a/det, (d*c - a*f)/det ],
    [ 0, 0, 1 ],
  ];
}
function triMatrix(p0,p1,p2){
  return [
    [p1[0]-p0[0], p2[0]-p0[0], p0[0]],
    [p1[1]-p0[1], p2[1]-p0[1], p0[1]],
    [0,0,1],
  ];
}
function affineFromTriangles(srcTri, dstTri){
  const Ms = triMatrix(srcTri[0], srcTri[1], srcTri[2]);
  const Md = triMatrix(dstTri[0], dstTri[1], dstTri[2]);
  const T = mat33Mul(Md, mat33InvAffine(Ms));
  return [T[0][0], T[1][0], T[0][1], T[1][1], T[0][2], T[1][2]];
}
function applyHomography(H, [x,y]){
  const X = H[0][0]*x + H[0][1]*y + H[0][2];
  const Y = H[1][0]*x + H[1][1]*y + H[1][2];
  const W = H[2][0]*x + H[2][1]*y + H[2][2];
  const iw = W ? (1/W) : 1e-12;
  return [X*iw, Y*iw];
}
function estimateHomographyLinear(srcPts, dstPts, w){
  const n = srcPts.length;
  const A = []; const B=[];
  for(let i=0;i<n;i++){
    const wi = w ? w[i] : 1;
    const [x,y] = srcPts[i];
    const [X,Y] = dstPts[i];
    A.push([wi*x, wi*y, wi*1, 0,0,0, wi*(-x*X), wi*(-y*X)]); B.push(wi*X);
    A.push([0,0,0, wi*x, wi*y, wi*1, wi*(-x*Y), wi*(-y*Y)]); B.push(wi*Y);
  }
  const m = 8;
  const ATA = Array.from({length:m},()=>Array(m).fill(0));
  const ATb = Array(m).fill(0);
  for(let r=0;r<A.length;r++){
    const row = A[r];
    for(let i=0;i<m;i++){
      ATb[i]+= row[i]*B[r];
      for(let j=0;j<m;j++) ATA[i][j]+= row[i]*row[j];
    }
  }
  // ガウス消去
  const N = m; const M=ATA.map(r=>r.slice()); const b=ATb.slice();
  for(let i=0;i<N;i++){
    let p=i; for(let r=i+1;r<N;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r;
    if(p!==i){ [M[i],M[p]]=[M[p],M[i]]; [b[i],b[p]]=[b[p],b[i]]; }
    const diag = M[i][i] || 1e-12;
    for(let r=i+1;r<N;r++){
      const f = M[r][i]/diag;
      for(let c=i;c<N;c++) M[r][c]-=f*M[i][c];
      b[r]-=f*b[i];
    }
  }
  const x = new Array(N).fill(0);
  for(let i=N-1;i>=0;i--){
    let s=0; for(let c=i+1;c<N;c++) s+=M[i][c]*x[c];
    x[i] = (b[i]-s)/(M[i][i]||1e-12);
  }
  return [
    [x[0], x[1], x[2]],
    [x[3], x[4], x[5]],
    [x[6], x[7], 1   ],
  ];
}
function estimateHomographyRobust(srcPts, dstPts, iters=3){
  let w = new Array(srcPts.length).fill(1);
  let H = estimateHomographyLinear(srcPts, dstPts, w);
  for(let t=0;t<iters;t++){
    const res = srcPts.map((p,i)=>{
      const q = applyHomography(H, p);
      const d = dstPts[i];
      return Math.hypot(q[0]-d[0], q[1]-d[1]);
    });
    const med = median(res);
    const delta = Math.max(1, 1.4826*med);
    w = res.map(r => { const a=Math.abs(r); return a<=delta ? 1 : (delta/a); });
    H = estimateHomographyLinear(srcPts, dstPts, w);
  }
  return H;
}
function previewProjectiveOnCanvas(vm, img, canvas, H, mesh=24){
  const ctx = canvas.getContext('2d');
  const W = img.naturalWidth, Himg = img.naturalHeight;
  const corners = [[0,0],[W,0],[W,Himg],[0,Himg]].map(p => applyHomography(H, p));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width=cw; canvas.height=ch;
  const spanX = Math.max(1, maxX-minX), spanY = Math.max(1, maxY-minY);
  const s = Math.min(cw/spanX, ch/spanY);
  const Tfit = [ [ s, 0, -minX*s ], [ 0,-s,  maxY*s ], [ 0, 0, 1 ], ];
  const Hc = mat33Mul(Tfit, H);
  ctx.clearRect(0,0,cw,ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const nx = mesh, ny = mesh;
  const sx = W/nx, sy = Himg/ny;
  for(let j=0;j<ny;j++){
    for(let i=0;i<nx;i++){
      const x0 = i*sx,  y0 = j*sy;
      const x1 = (i+1)*sx, y1 = (j+1)*sy;
      const s00=[x0,y0], s10=[x1,y0], s11=[x1,y1], s01=[x0,y1];
      const d00=applyHomography(Hc, s00);
      const d10=applyHomography(Hc, s10);
      const d11=applyHomography(Hc, s11);
      const d01=applyHomography(Hc, s01);
      drawTri(ctx, img, [s00,s10,s11], [d00,d10,d11]);
      drawTri(ctx, img, [s00,s11,s01], [d00,d11,d01]);
    }
  }
  function drawTri(ctx, img, srcTri, dstTri){
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dstTri[0][0], dstTri[0][1]);
    ctx.lineTo(dstTri[1][0], dstTri[1][1]);
    ctx.lineTo(dstTri[2][0], dstTri[2][1]);
    ctx.closePath();
    ctx.clip();
    const [a,b,c,d,e,f] = affineFromTriangles(srcTri, dstTri);
    ctx.setTransform(a,b,c,d,e,f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}

// ======== TPS utilities ========
function fitTPS(srcPts, dstPts) {
  const n = srcPts.length;
  const m = n + 3;
  function U(r) {
    return r > 0 ? r * r * Math.log(r * r) : 0;
  }
  const L = Array.from({length: m}, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = srcPts[i][0] - srcPts[j][0];
      const dy = srcPts[i][1] - srcPts[j][1];
      const r = Math.hypot(dx, dy);
      L[i][j] = U(r);
    }
    L[i][n] = 1;
    L[i][n + 1] = srcPts[i][0];
    L[i][n + 2] = srcPts[i][1];
  }
  for (let j = 0; j < n; j++) {
    L[n][j] = 1;
    L[n + 1][j] = srcPts[j][0];
    L[n + 2][j] = srcPts[j][1];
  }
  const bx = dstPts.map((p) => p[0]).concat([0, 0, 0]);
  const by = dstPts.map((p) => p[1]).concat([0, 0, 0]);
  const wx = solveLinear(L, bx);
  const wy = solveLinear(L, by);
  return { wx, wy, srcPts };
}
function solveLinear(A, b) {
  const N = A.length;
  const M = A.map((r) => r.slice());
  const x = b.slice();
  for (let i = 0; i < N; i++) {
    let p = i;
    for (let r = i + 1; r < N; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[p][i])) {
        p = r;
      }
    }
    if (p !== i) {
      [M[i], M[p]] = [M[p], M[i]];
      [x[i], x[p]] = [x[p], x[i]];
    }
    const diag = M[i][i] || 1e-12;
    for (let j = i + 1; j < N; j++) {
      const f = M[j][i] / diag;
      for (let k = i; k < N; k++) {
        M[j][k] -= f * M[i][k];
      }
      x[j] -= f * x[i];
    }
  }
  for (let i = N - 1; i >= 0; i--) {
    let s = 0;
    for (let j = i + 1; j < N; j++) {
      s += M[i][j] * x[j];
    }
    x[i] = (x[i] - s) / (M[i][i] || 1e-12);
  }
  return x;
}
function applyTPS(tps, [x, y]) {
  const { wx, wy, srcPts } = tps;
  const n = srcPts.length;
  let X = wx[n] + wx[n + 1] * x + wx[n + 2] * y;
  let Y = wy[n] + wy[n + 1] * x + wy[n + 2] * y;
  for (let i = 0; i < n; i++) {
    const dx = x - srcPts[i][0];
    const dy = y - srcPts[i][1];
    const r = Math.hypot(dx, dy);
    const u = r > 0 ? r * r * Math.log(r * r) : 0;
    X += wx[i] * u;
    Y += wy[i] * u;
  }
  return [X, Y];
}
function previewTPSOnCanvas(vm, img, canvas, tps, mesh = 24) {
  const ctx = canvas.getContext('2d');
  const W = img.naturalWidth,
      Himg = img.naturalHeight;
  const corners = [
    [0, 0],
    [W, 0],
    [W, Himg],
    [0, Himg],
  ].map((p) => applyTPS(tps, [p[0], -p[1]]));
  const xs = corners.map((p) => p[0]),
      ys = corners.map((p) => p[1]);
  const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
  const cw = Math.max(1, img.clientWidth || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width = cw;
  canvas.height = ch;
  const spanX = Math.max(1, maxX - minX),
      spanY = Math.max(1, maxY - minY);
  const s = Math.min(cw / spanX, ch / spanY);
  function applyViewTransform([X, Y]) {
    return [s * (X - minX), s * (maxY - Y)];
  }
  ctx.clearRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const nx = mesh,
      ny = mesh;
  const sx = W / nx,
      sy = Himg / ny;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x0 = i * sx,
          y0 = j * sy;
      const x1 = (i + 1) * sx,
          y1 = (j + 1) * sy;
      const s00 = [x0, y0],
          s10 = [x1, y0],
          s11 = [x1, y1],
          s01 = [x0, y1];
      const d00 = applyViewTransform(applyTPS(tps, [x0, -y0]));
      const d10 = applyViewTransform(applyTPS(tps, [x1, -y0]));
      const d11 = applyViewTransform(applyTPS(tps, [x1, -y1]));
      const d01 = applyViewTransform(applyTPS(tps, [x0, -y1]));
      drawTri(ctx, img, [s00, s10, s11], [d00, d10, d11]);
      drawTri(ctx, img, [s00, s11, s01], [d00, d11, d01]);
    }
  }
  function drawTri(ctx, img, srcTri, dstTri){
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dstTri[0][0], dstTri[0][1]);
    ctx.lineTo(dstTri[1][0], dstTri[1][1]);
    ctx.lineTo(dstTri[2][0], dstTri[2][1]);
    ctx.closePath();
    ctx.clip();
    const [a,b,c,d,e,f] = affineFromTriangles(srcTri, dstTri);
    ctx.setTransform(a,b,c,d,e,f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}

// ======== ここから SFC ========
export default {
  name: 'WarpWizard',
  props: {
    modelValue: { type:Boolean, default: true },
    open:       { type:Boolean, default: undefined },
    mapName: { type:String, default:'map01' },
    item:    { type:Object, default: () => ({ id:'warp', label:'Warp Wizard' }) },
    gcpList: { type:Array,  default: () => [] },
    file:    { type:[File,Blob], default:null },
    url:     { type:String, default:'' },
    stacked: { type:Boolean, default:true },
  },
  emits: ['update:gcpList','confirm','close','update:modelValue','update:open','clear-map-markers'],
  data(){
    return {
      imgUrl: null,
      affineM: null,   // 2x3（相似/アフィン用；natural→3857）
      H: null,         // 3x3（ホモグラフィ；natural→3857）
      tps: null,
      grid: true,
      objUrl: null,
      history: [],
      histIndex: -1,
      isRestoring: false,
      closedOnce: false,
      zoom: 1,
      pan: { x: 0, y: 0 },
      panning: false,
      panStart: { x: 0, y: 0 },
      panAtStart: { x: 0, y: 0 },
    }
  },
  watch: {
    modelValue(v){ if(v===false) this.onExternalClose() },
    open(v){ if(v===false) this.onExternalClose() },
    file: {
      immediate: true,
      handler(f){
        if(!f) return;
        if(this.objUrl) { try{ URL.revokeObjectURL(this.objUrl) }catch(e){} this.objUrl=null }
        this.objUrl = URL.createObjectURL(f);
        this.imgUrl = this.objUrl;
        this.$nextTick(() => { this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); this.resetHistory(); this.pushHistory('init:file') })
      }
    },
    url(u){ if(!u) return; this.imgUrl=u; this.$nextTick(()=>{ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); this.resetHistory(); this.pushHistory('init:url') }) },
    gcpList: { deep:true, handler(){ if(!this.isRestoring) this.pushHistory('gcp'); this.$nextTick(this.redrawMarkers) } }
  },
  beforeUnmount(){ this.onExternalClose(true) },
  mounted(){
    const h = document.querySelector('#handle-'+this.item?.id)
    if(h) h.innerHTML = `<span style="font-size: large;">${this.item?.label || 'Warp Wizard'}</span>`
    window.addEventListener('keydown', this.onKeydown)
    window.addEventListener('resize', this.onResize)
    this.$nextTick(()=>{ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers() })
  },
  computed: {
    zoomStyle(){
      return {
        transform: `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`,
        transformOrigin: 'top left'
      }
    },
    isOpen(){ return (this.open===undefined ? this.modelValue : this.open) !== false },
    pairs(){ return (this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord||g.imageCoordCss) && Array.isArray(g.mapCoord)) },
    pairsCount(){ return this.pairs.length },
    transformKind(){
      if(!(this.affineM || this.H || this.tps)) return '';
      if (this.tps) return 'TPS';
      if (this.H) return 'Homography';
      return this.affineM ? (this.pairsCount >= 3 ? 'Affine' : 'Similarity') : '';
    },
    transformKindColor(){
      if (this.tps) return 'blue';
      if (this.H) return 'pink';
      return this.affineM ? (this.pairsCount >= 3 ? 'deep-purple' : 'teal') : '';
    },
    imgMeta(){ const img=this.$refs.warpImage; if(!img) return ''; return `${img.naturalWidth}×${img.naturalHeight}` },
    hideBaseImage(){ return !!(this.affineM || this.H || this.tps) },
    canUndo(){ return this.histIndex > 0 },
    canRedo(){ return this.histIndex >= 0 && this.history && this.histIndex < this.history.length - 1 },

    canDownloadWorldFile(){ return !!(this.affineM || this.H) },
    worldFileHint(){ return 'EPSG:3857（PRJ不要／OH3-PHP前提）' },
    srs3857(){ return 3857 },
  },
  methods: {
    fmtPx(p){ if(!Array.isArray(p) || p.length<2) return '-'; const x=Number(p[0]), y=Number(p[1]); if(!Number.isFinite(x)||!Number.isFinite(y)) return '-'; return `${Math.round(x)}, ${Math.round(y)}` },
    fmtLL(ll){ if(!Array.isArray(ll) || ll.length<2) return '-'; const lng=Number(ll[0]), lat=Number(ll[1]); if(!Number.isFinite(lng)||!Number.isFinite(lat)) return '-'; return `${lng.toFixed(6)}, ${lat.toFixed(6)}` },

    onExternalClose(fromUnmount=false){
      try{
        if(fromUnmount){
          window.removeEventListener('keydown', this.onKeydown)
          window.removeEventListener('resize', this.onResize)
        }
      }catch(e){}
      if(this.objUrl){ try{ URL.revokeObjectURL(this.objUrl) }catch(e){} this.objUrl=null }
      this.clearCanvas(this.$refs.warpCanvas); this.clearCanvas(this.$refs.gridCanvas); this.clearCanvas(this.$refs.markerCanvas)
      this.$emit('clear-map-markers')
      this.closedOnce = true
    },

    toggleGrid(){ this.grid=!this.grid; this.$nextTick(this.drawGrid) },
    resetAll(){ this.affineM=null; this.H=null; this.tps=null; this.$emit('update:gcpList', []); this.pushHistory('reset'); this.clearCanvas(this.$refs.warpCanvas); this.redrawMarkers() },
    onResize(){ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); if(this.affineM || this.H || this.tps) this.previewWarp() },
    onImageLoad(){ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); },

    snapshot(){ return { gcpList: JSON.parse(JSON.stringify(this.gcpList||[])), affineM: this.affineM ? [...this.affineM] : null, H: this.H ? this.H.map(r=>[...r]) : null, tps: this.tps ? {wx: [...this.tps.wx], wy: [...this.tps.wy], srcPts: this.tps.srcPts.map(p=>[...p])} : null } },
    resetHistory(){ this.history=[]; this.histIndex=-1 },
    pushHistory(){ if(this.isRestoring) return; const snap=this.snapshot(); const cur=this.history[this.histIndex]; if(cur && JSON.stringify(cur)===JSON.stringify(snap)) return; if(this.histIndex < this.history.length-1){ this.history.splice(this.histIndex+1) } this.history.push(snap); this.histIndex=this.history.length-1; if(this.history.length>50){ this.history.shift(); this.histIndex-- } },
    applySnapshot(snap){ this.isRestoring=true; this.affineM=snap.affineM; this.H=snap.H; this.tps = snap.tps ? {wx: [...snap.tps.wx], wy: [...snap.tps.wy], srcPts: snap.tps.srcPts.map(p=>[...p])} : null; this.$emit('update:gcpList', JSON.parse(JSON.stringify(snap.gcpList))); this.$nextTick(()=>{ this.isRestoring=false; if(this.affineM || this.H || this.tps) this.previewWarp(); else this.clearCanvas(this.$refs.warpCanvas); this.redrawMarkers() }) },
    undo(){ if(!this.canUndo) return; this.histIndex--; this.applySnapshot(this.history[this.histIndex]) },
    redo(){ if(!this.canRedo) return; this.histIndex++; this.applySnapshot(this.history[this.histIndex]) },
    onKeydown(e){ const isMac=/Mac|iPod|iPhone|iPad/.test(navigator.platform); const mod=isMac?e.metaKey:e.ctrlKey; if(!mod) return; if(e.key.toLowerCase()==='z'){ e.preventDefault(); if(e.shiftKey) this.redo(); else this.undo(); } },

    syncCanvasSize(){ const img=this.$refs.warpImage; if(!img) return; const cw=img.clientWidth||img.naturalWidth; const ch=img.clientHeight||img.naturalHeight; const cvs=[this.$refs.warpCanvas,this.$refs.gridCanvas,this.$refs.markerCanvas]; cvs.forEach(c=>{ if(!c) return; c.width=cw; c.height=ch; }) },
    clearCanvas(c){ if(!c) return; const ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,c.width,c.height) },
    drawGrid(){ if(!this.grid) return; const img=this.$refs.warpImage; const canvas=this.$refs.gridCanvas; if(!img||!canvas) return; const cw=img.clientWidth||img.naturalWidth; const ch=img.clientHeight||img.naturalHeight; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,cw,ch); ctx.globalAlpha=.35; ctx.lineWidth=1; ctx.strokeStyle='rgba(0,0,0,0.6)'; const step=Math.max(32, Math.round(cw/20)); for(let x=0;x<cw;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke() } for(let y=0;y<ch;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke() } ctx.globalAlpha=1 },
    redrawMarkers(){ const canvas=this.$refs.markerCanvas; const img=this.$refs.warpImage; if(!canvas||!img) return; const ctx=canvas.getContext('2d'); const cw=canvas.width, ch=canvas.height; ctx.clearRect(0,0,cw,ch); const pts=(this.gcpList||[]).map((g,i)=>{ if(Array.isArray(g.imageCoordCss)) return {i,xy:g.imageCoordCss}; if(Array.isArray(g.imageCoord)) return {i,xy:naturalToCss(g.imageCoord, img)}; return null }).filter(Boolean); const r=12; pts.forEach(p=>{ const [x,y]=p.xy; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle='#e53935'; ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle='#ffffff'; ctx.stroke(); ctx.font='700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#ffffff'; ctx.fillText(String(p.i+1), x, y); }) },

    onImageAreaClick(e){ const img=this.$refs.warpImage; if(!img) return; const rect=img.getBoundingClientRect(); const xCss=e.clientX-rect.left; const yCss=e.clientY-rect.top; const [xNat,yNat]=imageCssToNatural([xCss,yCss], img); const next=(this.gcpList||[]).slice(); next.push({ imageCoordCss:[xCss,yCss], imageCoord:[xNat,yNat], mapCoord:null }); this.$emit('update:gcpList', next); this.pushHistory('img-click'); this.$nextTick(this.redrawMarkers) },
    removeGcp(i){ const next=(this.gcpList||[]).slice(); next.splice(i,1); this.$emit('update:gcpList', next); this.pushHistory('remove'); this.$nextTick(this.redrawMarkers) },

    // ===== プレビュー生成 =====
    previewWarp(){
      function toNaturalCoord(g, img){
        if (Array.isArray(g.imageCoordCss)) return imageCssToNatural(g.imageCoordCss, img);
        if (Array.isArray(g.imageCoord))    return g.imageCoord;
        return null;
      }
      const img=this.$refs.warpImage, canvas=this.$refs.warpCanvas;
      if(!img||!canvas) return;
      const pairs=(this.gcpList||[]).filter(g => (Array.isArray(g.imageCoord)||Array.isArray(g.imageCoordCss)) && Array.isArray(g.mapCoord));
      if (pairs.length < 2){ this.affineM=null; this.H=null; this.tps=null; this.clearCanvas(canvas); return; }
      const srcNat = pairs.map(g => toNaturalCoord(g, img));
      const srcUp  = srcNat.map(([x,y]) => [x, -y]);
      const dstUp  = pairs.map(g => lngLatToMerc(g.mapCoord));
      if (pairs.length === 2){
        const Mup = fitSimilarity2P(srcUp, dstUp);
        const FLIP_Y_A = [1,0,0, 0,-1,0];
        const M = composeAffine(Mup, FLIP_Y_A);
        this.H = null; this.tps=null; this.affineM = M; previewOnCanvas(this, img, canvas, M); return;
      }
      if (pairs.length === 3){
        const Mup = fitAffineRobust(srcUp, dstUp, 4);
        const FLIP_Y_A = [1,0,0, 0,-1,0];
        const M = composeAffine(Mup, FLIP_Y_A);
        this.H = null; this.tps=null; this.affineM = M; previewOnCanvas(this, img, canvas, M); return;
      }
      // 4点以上はTPSでプレビュー
      const tps = fitTPS(srcUp, dstUp);
      this.affineM = null; this.H = null; this.tps = tps; previewTPSOnCanvas(this, img, canvas, tps, 28);
    },

    buildWorldAffine(){
      const img = this.$refs.warpImage; if(!img) return null;
      const pairs = (this.gcpList||[]).filter(g =>
          (Array.isArray(g.imageCoord)||Array.isArray(g.imageCoordCss)) && Array.isArray(g.mapCoord)
      );
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
      if (pairs.length === 2) Mup = fitSimilarity2P(srcUp, dstUp);
      else Mup = fitAffineRobust(srcUp, dstUp, 4);

      const FLIP_Y_A = [1,0,0, 0,-1,0];
      let M = composeAffine(Mup, FLIP_Y_A);

      // 健全性チェック（既存ロジックのまま）
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
        for(let i=0;i<srcUp.length;i++){
          for(let j=i+1;j<srcUp.length;j++){
            const d=Math.hypot(srcUp[j][0]-srcUp[i][0], srcUp[j][1]-srcUp[i][1]);
            if(d>maxd){maxd=d;i1=i;i2=j;}
          }
        }
        M = composeAffine(fitSimilarity2P([srcUp[i1],srcUp[i2]],[dstUp[i1],dstUp[i2]]), FLIP_Y_A);
      }
      return M;
    },

    // ===== GCPテーブルの編集ロジック（最小限） =====
    getImgX(g){
      const img=this.$refs.warpImage;
      if(Array.isArray(g?.imageCoord)) return Math.round(g.imageCoord[0]);
      if(Array.isArray(g?.imageCoordCss) && img) return Math.round(imageCssToNatural(g.imageCoordCss, img)[0]);
      return g?._editImgX ?? '';
    },
    getImgY(g){
      const img=this.$refs.warpImage;
      if(Array.isArray(g?.imageCoord)) return Math.round(g.imageCoord[1]);
      if(Array.isArray(g?.imageCoordCss) && img) return Math.round(imageCssToNatural(g.imageCoordCss, img)[1]);
      return g?._editImgY ?? '';
    },
    setImgX(i, v){
      const img=this.$refs.warpImage; const x=Number(v);
      const next=(this.gcpList||[]).slice(); const g={ ...(next[i]||{}) };
      const y = Array.isArray(g.imageCoord) ? Number(g.imageCoord[1])
          : (Array.isArray(g.imageCoordCss)&&img ? imageCssToNatural(g.imageCoordCss, img)[1] : NaN);
      if(Number.isFinite(x) && Number.isFinite(y)){
        g.imageCoord=[x,y]; if(img) g.imageCoordCss = naturalToCss(g.imageCoord, img);
        delete g._editImgX; delete g._editImgY;
      }else{
        g._editImgX=v;
      }
      next[i]=g; this.$emit('update:gcpList', next); this.$nextTick(this.redrawMarkers);
    },
    setImgY(i, v){
      const img=this.$refs.warpImage; const y=Number(v);
      const next=(this.gcpList||[]).slice(); const g={ ...(next[i]||{}) };
      const x = Array.isArray(g.imageCoord) ? Number(g.imageCoord[0])
          : (Array.isArray(g.imageCoordCss)&&img ? imageCssToNatural(g.imageCoordCss, img)[0] : NaN);
      if(Number.isFinite(x) && Number.isFinite(y)){
        g.imageCoord=[x,y]; if(img) g.imageCoordCss = naturalToCss(g.imageCoord, img);
        delete g._editImgX; delete g._editImgY;
      }else{
        g._editImgY=v;
      }
      next[i]=g; this.$emit('update:gcpList', next); this.$nextTick(this.redrawMarkers);
    },
    getLng(g){
      if(Array.isArray(g?.mapCoord)) return Number(g.mapCoord[0]);
      return g?._editLng ?? '';
    },
    getLat(g){
      if(Array.isArray(g?.mapCoord)) return Number(g.mapCoord[1]);
      return g?._editLat ?? '';
    },
    setLng(i, v){
      const next=(this.gcpList||[]).slice(); const g={ ...(next[i]||{}) };
      const lng = Number(v);
      const lat = (g._editLat!==undefined) ? Number(g._editLat)
          : (Array.isArray(g.mapCoord) ? Number(g.mapCoord[1]) : NaN);
      g._editLng = v;
      if(Number.isFinite(lng) && Number.isFinite(lat)){
        g.mapCoord=[lng, lat]; delete g._editLng; delete g._editLat;
      }
      next[i]=g; this.$emit('update:gcpList', next);
    },
    setLat(i, v){
      const next=(this.gcpList||[]).slice(); const g={ ...(next[i]||{}) };
      const lat = Number(v);
      const lng = (g._editLng!==undefined) ? Number(g._editLng)
          : (Array.isArray(g.mapCoord) ? Number(g.mapCoord[0]) : NaN);
      g._editLat = v;
      if(Number.isFinite(lng) && Number.isFinite(lat)){
        g.mapCoord=[lng, lat]; delete g._editLng; delete g._editLat;
      }
      next[i]=g; this.$emit('update:gcpList', next);
    },

    // ===== ダウンロード (.jgw/.pgw/.tfw) =====
    inferredWorldExt(){
      const name = (this.$props.file && this.$props.file.name) ? this.$props.file.name : (this.url||'image.jpg');
      const ext = (name.split('.').pop()||'').toLowerCase();
      if (ext==='png') return 'pgw';
      if (ext==='tif' || ext==='tiff') return 'tfw';
      return 'jgw';
    },
    downloadWorldFile(){
      const M = this.buildWorldAffine();   // ★ ここが肝：H/TPSを使わない
      if(!M) return;
      const txt = worldFileFromAffine(M);
      const blob = new Blob([txt], { type:'text/plain;charset=utf-8' });
      const base = (this.$props.file && this.$props.file.name)
          ? this.$props.file.name.replace(/\.[^.]+$/, '')
          : 'image';
      const ext = this.inferredWorldExt(); // jgw/pgw/tfw
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${base}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    confirm(){
      if(!(this.affineM || this.H || this.tps)) return;
      const f=this.$props.file||null;
      const canvas=this.$refs.warpCanvas;
      let cornersLngLat = null;
      let payload;
      const img=this.$refs.warpImage;
      if (this.tps && img){
        const W=img.naturalWidth, Hh=img.naturalHeight;
        const cornersImg=[[0,0],[W,0],[W,Hh],[0,Hh]];  // TL, TR, BR, BL
        const cornersWorld=cornersImg.map(p=> applyTPS(this.tps, [p[0], -p[1]])); // 3857(m)
        cornersLngLat = cornersWorld.map(mercToLngLat);
        payload = {
          file: f,
          tps: this.tps,
          kind: 'tps',
          cornersLngLat,
          srs: this.srs3857,
        };
      } else if (this.H && img){
        const W=img.naturalWidth, Hh=img.naturalHeight;
        const cornersImg=[[0,0],[W,0],[W,Hh],[0,Hh]];  // TL, TR, BR, BL
        const cornersWorld=cornersImg.map(p=> applyHomography(this.H, p)); // 3857(m)
        cornersLngLat = cornersWorld.map(mercToLngLat);
        payload = {
          file: f,
          affineM: null,
          H: this.H,
          kind: 'homography',
          cornersLngLat,
          srs: this.srs3857,
        };
      } else if (this.affineM){
        payload = {
          file: f,
          affineM: this.affineM,
          H: null,
          kind: this.pairsCount>=3 ? 'affine' : 'similarity',
          cornersLngLat,
          srs: this.srs3857,
        };
      }
      // OH3 の PHP 側は PRJ を見ない → 3857 前提で投げる
      if(!canvas || !canvas.toBlob){ this.$emit('confirm',{ ...payload, blob:null }); return }
      canvas.toBlob((blob)=>{ this.$emit('confirm',{ ...payload, blob }) }, 'image/png')
    },
  }
}
</script>

<!-- グローバル（scoped外） -->
<style>
html, body, #app { height: 100%; }
</style>

<style scoped>
/* ====== コンテナ ====== */
.oh-warp-root{
  width: 500px;
  max-width: calc(100vw - 40px);
  box-sizing: border-box;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;   /* 親が100%を持つ前提（↑の非scopedで付与） */
  min-height: 0;  /* 子のoverflowを効かせるため必須 */
}

/* ====== ツールバー ====== */
.oh-toolbar{
  display:flex; align-items:center; justify-content:space-between;
  padding: 8px 10px;
  background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0));
  border-bottom: 1px solid rgba(0,0,0,0.08);
  flex: 0 0 auto;           /* 潰れ防止 */
  min-height: 44px;         /* 好みで 40–48 に調整 */
}
.oh-toolbar .v-btn.is-active{ background: rgba(0,0,0,0.06) }
.oh-title{ font-weight:600; display:flex; align-items:center; gap:8px; }
.oh-tools{ display:flex; align-items:center; gap:4px; }
.oh-icon{ font-size: 16px; }

/* ====== 本体（左右レイアウト） ====== */
.oh-body{
  flex: 1 1 auto;
  min-height: 0;            /* 内部スクロール許可 */
  display:grid;
  grid-template-columns: 1fr 380px;
  gap:10px;
  padding:10px;
}

/* stacked時は右ペインを残り高さで伸ばす（左=auto / 右=1fr） */
.oh-body.stacked{
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
}
.oh-body.stacked .left-pane{ order:1; }
.oh-body.stacked .right-pane{ order:2; }

/* ====== 左ペイン（画像） ====== */
.left-pane{
  display:flex; align-items:center; justify-content:center;
  min-height: 420px;
  background: rgba(0,0,0,0.03);
  border: 1px dashed rgba(0,0,0,0.2);
  border-radius: 10px;
}
.img-wrap{ position: relative; display:inline-block; max-width:100%; cursor: crosshair; }
#warp-image{ position:relative; z-index:0; display:block; max-width:100%; height:auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
#warp-image.hidden{ visibility:hidden; }
.warp-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:1; }
.grid-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; opacity:.45; z-index:2; }
.marker-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:3; }

/* ====== 右ペイン（編集） ====== */
.right-pane{
  padding:4px 0;
  display:flex;
  flex-direction:column;
  min-height:0;     /* 重要：子のoverflowを効かせる */
  overflow:hidden;  /* 二重スクロールを避ける */
}

/* ====== GCPエディタ ====== */
.gcp-editor{
  padding:0;
  margin-bottom:8px;
  background: rgba(0,0,0,0.03);
  border: 1px dashed rgba(0,0,0,0.2);
  border-radius: 10px;
}
.gcp-row{
  display:grid;
  grid-template-columns: 20px 1fr 1fr 32px; /* # / 画像 / 地図 / 削除 */
  align-items:center;
  gap:4px;
  padding:0;
  height:38px;
}
.gcp-row.header{
  font-size:11px; color:#6b7280; font-weight:600; letter-spacing:.02em; text-transform:uppercase;
  padding:0 0 4px;
}
.gcp-row:not(.header):not(:last-child){
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.gcp-row .img, .gcp-row .map{
  display:grid; grid-template-columns: 1fr 1fr; gap:6px;
}
.gcp-row .idx{ text-align:center; font-weight:700; }

.gcp-scroll{
  flex: 1 1 auto;   /* ここが伸縮する */
  min-height: 0;
  overflow: auto;
  margin-top:4px;
}

/* Vuetify のテキストフィールド微調整 */
:deep(.gcp-editor .v-input--density-compact){ --v-input-control-height: 24px; }
:deep(.gcp-editor .v-field__input){ min-height:22px; padding:0 3px; }
:deep(.gcp-editor .v-field--variant-plain .v-field__overlay){ background:transparent; }
:deep(.gcp-editor .v-field__outline){ display:none; }

/* 任意：その他 */
.gcp-table{ font-variant-numeric: tabular-nums; background:#fff; border-radius:8px; overflow:hidden; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.actions{ display:flex; justify-content:flex-end; gap:6px; margin-top:10px; }
</style>