<template>
  <!-- フローティングウィンドウ内に常駐。親が閉じたら自分も閉じる（v-model / :open 監視） -->
  <div class="oh-warp-root" v-show="isOpen">
    <div class="oh-toolbar">
      <div class="oh-title">Warp Wizard</div>
      <div class="oh-tools">
        <v-btn icon variant="text" :disabled="!canUndo" @click="undo" :title="'元に戻す (Ctrl/Cmd+Z)'"><v-icon>mdi-undo</v-icon></v-btn>
        <v-btn icon variant="text" :disabled="!canRedo" @click="redo" :title="'やり直す (Shift+Ctrl/Cmd+Z)'"><v-icon>mdi-redo</v-icon></v-btn>
        <v-divider vertical class="mx-1" />
        <v-btn icon variant="text" :class="{ 'is-active': grid }" @click="toggleGrid" :title="'グリッド'"><v-icon>mdi-grid</v-icon></v-btn>
        <v-btn icon variant="text" @click="resetAll" :title="'全消去'"><v-icon>mdi-backspace</v-icon></v-btn>
        <!-- DLボタン：デバッグ用。2点以上で常に押せる。Affine時は正確、H/TPS時は近似アフィンで生成 -->
        <v-btn icon variant="text"
               class="dl-btn"
               :disabled="!canDownloadWorldFile"
               @click="downloadWorldFile"
               :title="(worldFileMode==='exact' ? 'ワールドファイルを保存' : '近似ワールドファイル（デバッグ）') + ' (' + inferredWorldExt.toUpperCase() + ')'">
          <v-icon>mdi-download</v-icon>
        </v-btn>
        <v-divider vertical class="mx-1" />
        <v-chip size="small" class="mr-1" label>GCP {{ pairsCount }}</v-chip>
        <v-chip v-if="transformKind" :color="transformKindColor" size="small" class="mr-1" label>{{ transformKind }}</v-chip>
        <v-chip v-if="imgMeta" size="small" class="mr-1" label>{{ imgMeta }}</v-chip>
      </div>
    </div>

    <div class="oh-body" :class="{ stacked }">
      <div class="left-pane">
        <div v-if="!imgUrl" class="empty">画像がありません</div>
        <div v-else class="img-wrap" @click="onImageAreaClick">
          <!-- 変換前はプレビュー成立したら非表示（visibility: hidden でサイズ保持） -->
          <img id="warp-image" ref="warpImage" :src="imgUrl" :class="{ hidden: hideBaseImage }" @load="onImageLoad">
          <!-- 変換後（プレビュー）を描くキャンバス -->
          <canvas id="warp-canvas" ref="warpCanvas" class="warp-canvas"></canvas>
          <!-- グリッドとポイント番号（別キャンバス） -->
          <canvas v-show="grid" ref="gridCanvas" class="grid-canvas"></canvas>
          <canvas ref="markerCanvas" class="marker-canvas"></canvas>
        </div>
      </div>

      <div class="right-pane">
        <div class="actions">
          <p class="hint">2〜4点（平面推定）または <strong>5点以上（TPS）</strong> で上の画像と地図をクリック。</p>
          <v-btn color="primary" :disabled="!(affineM || H || tps)" @click="confirm">
            <v-icon class="mr-1">mdi-cloud-upload</v-icon>アップロード
          </v-btn>
        </div>
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
// 2x3アフィン（Similarity/Affine）用のプレビュー
function previewOnCanvas(vm, img, canvas, M){
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth, h = img.naturalHeight;
  const corners = [[0,0],[w,0],[w,h],[0,h]].map(p=>applyAffine(M,p));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width = cw; canvas.height = ch;
  const W = Math.max(1, maxX - minX); const Hh = Math.max(1, maxY - minY);
  const s = Math.min(cw / W, ch / Hh);
  const T = [ s, 0, -minX * s, 0, -s,  maxY * s ];
  const Mv = composeAffine(T, M); const [A,B,C,D,E,F] = Mv;
  ctx.setTransform(A,D,B,E,C,F);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);
}
function worldFileFromAffine([A,B,C,D,E,F]){ return `${A}\n${D}\n${B}\n${E}\n${C}\n${F}`; }

/* ======== 射影（ホモグラフィ） ======== */
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

// H を (x0,y0) 近傍で線形化して 2x3 アフィン [A,B,C,D,E,F] を返す
function affineFromHomographyAt(H, x0=0, y0=0){
  const p00 = applyHomography(H, [x0,   y0  ]);
  const p10 = applyHomography(H, [x0+1, y0  ]);
  const p01 = applyHomography(H, [x0,   y0+1]);
  const A = p10[0] - p00[0], B = p01[0] - p00[0], C = p00[0];
  const D = p10[1] - p00[1], E = p01[1] - p00[1], F = p00[1];
  return [A,B,C,D,E,F];
}

// TPS を (x0,y0) 近傍で線形化（※ tpsMap は “UP座標”入力なので y を反転）
function affineFromTPSAt(tps, x0=0, y0=0){
  const T = (x,y)=> tpsMap(tps, [x, -y]);  // natural (x,y) → world XY
  const p00 = T(x0,   y0  );
  const p10 = T(x0+1, y0  );
  const p01 = T(x0,   y0+1);
  const A = p10[0] - p00[0], B = p01[0] - p00[0], C = p00[0];
  const D = p10[1] - p00[1], E = p01[1] - p00[1], F = p00[1];
  return [A,B,C,D,E,F];
}

function solveLeastSquares(ATA, ATb){
  const N = ATA.length; const A = ATA.map(r=>r.slice()); const b = ATb.slice();
  for(let i=0;i<N;i++){
    let p=i; for(let r=i+1;r<N;r++) if(Math.abs(A[r][i])>Math.abs(A[p][i])) p=r;
    if(p!==i){ [A[i],A[p]]=[A[p],A[i]]; [b[i],b[p]]=[b[p],b[i]]; }
    const diag = A[i][i] || 1e-12;
    for(let r=i+1;r<N;r++){
      const f = A[r][i]/diag; for(let c=i;c<N;c++) A[r][c]-=f*A[i][c]; b[r]-=f*b[i];
    }
  }
  const x = new Array(N).fill(0);
  for(let i=N-1;i>=0;i--){ let s=0; for(let c=i+1;c<N;c++) s+=A[i][c]*x[c]; x[i] = (b[i]-s)/(A[i][i]||1e-12); }
  return x;
}
function estimateHomographyLinear(srcPts, dstPts, w){
  const n = srcPts.length; const A = []; const B=[];
  for(let i=0;i<n;i++){
    const wi = w ? w[i] : 1;
    const [x,y] = srcPts[i];
    const [X,Y] = dstPts[i];
    A.push([wi*x, wi*y, wi*1, 0,0,0, wi*(-x*X), wi*(-y*X)]); B.push(wi*X);
    A.push([0,0,0, wi*x, wi*y, wi*1, wi*(-x*Y), wi*(-y*Y)]); B.push(wi*Y);
  }
  const m = 8; const ATA = Array.from({length:m},()=>Array(m).fill(0)); const ATb = Array(m).fill(0);
  for(let r=0;r<A.length;r++){
    const row = A[r];
    for(let i=0;i<m;i++){
      ATb[i]+= row[i]*B[r];
      for(let j=0;j<m;j++) ATA[i][j]+= row[i]*row[j];
    }
  }
  const h = solveLeastSquares(ATA, ATb); // [h1..h8]
  return [ [h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1] ];
}
function estimateHomographyExact4Pts(srcPts, dstPts){
  const A=[]; const b=[];
  for(let i=0;i<4;i++){
    const [x,y]=srcPts[i], [X,Y]=dstPts[i];
    A.push([ x, y, 1, 0, 0, 0, -x*X, -y*X ]); b.push(X);
    A.push([ 0, 0, 0, x, y, 1, -x*Y, -y*Y ]); b.push(Y);
  }
  const h = solveLeastSquares(A,b);
  return [ [h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1] ];
}
function estimateHomographyRobust(srcPts, dstPts, iters=3){
  let w = new Array(srcPts.length).fill(1);
  let H = estimateHomographyLinear(srcPts, dstPts, w);
  for(let t=0;t<iters;t++){
    const res = srcPts.map((p,i)=>{ const q = applyHomography(H, p); return Math.hypot(q[0]-dstPts[i][0], q[1]-dstPts[i][1]); });
    const med = median(res); const delta = Math.max(1, 1.4826*med);
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
  const Tfit = [ [ s, 0, -minX*s ], [ 0,-s,  maxY*s ], [ 0, 0, 1 ] ];
  const Hc = mat33Mul(Tfit, H);

  ctx.clearRect(0,0,cw,ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const nx = mesh, ny = mesh; const sx = W/nx, sy = Himg/ny;
  for(let j=0;j<ny;j++){
    for(let i=0;i<nx;i++){
      const x0 = i*sx,  y0 = j*sy; const x1 = (i+1)*sx, y1 = (j+1)*sy;
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
    ctx.save(); ctx.beginPath(); ctx.moveTo(dstTri[0][0], dstTri[0][1]); ctx.lineTo(dstTri[1][0], dstTri[1][1]); ctx.lineTo(dstTri[2][0], dstTri[2][1]); ctx.closePath(); ctx.clip();
    const [a,b,c,d,e,f] = affineFromTriangles(srcTri, dstTri); ctx.setTransform(a,b,c,d,e,f); ctx.drawImage(img, 0, 0); ctx.restore();
  }
}

// ======== TPS（薄板スプライン：多数点用） ========
function _U(r2){ const eps2 = 1e-12; const t = Math.max(r2, eps2); return t * Math.log(t); }
function _solveLinear(A, b){
  const n = A.length; const M = A.map(r=>r.slice()); const x = b.slice();
  for(let i=0;i<n;i++){
    let p=i; for(let r=i+1;r<n;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r;
    if(p!==i){ [M[i],M[p]]=[M[p],M[i]]; [x[i],x[p]]=[x[p],x[i]] }
    const diag=M[i][i]||1e-12;
    for(let r=i+1;r<n;r++){
      const f=M[r][i]/diag; for(let c=i;c<n;c++) M[r][c]-=f*M[i][c]; x[r]-=f*x[i];
    }
  }
  const sol=new Array(n).fill(0);
  for(let i=n-1;i>=0;i--){ let s=0; for(let c=i+1;c<n;c++) s+=M[i][c]*sol[c]; sol[i]=(x[i]-s)/(M[i][i]||1e-12); }
  return sol;
}
function buildTPS(srcPts, dstPts, lambda=1e-3){
  const n = srcPts.length; const K = Array.from({length:n},()=>Array(n).fill(0));
  for(let i=0;i<n;i++){
    for(let j=0;j<n;j++){
      const dx=srcPts[i][0]-srcPts[j][0]; const dy=srcPts[i][1]-srcPts[j][1];
      K[i][j]=_U(dx*dx+dy*dy);
    }
  }
  // 正則化で外縁発散を抑える
  for(let i=0;i<n;i++) K[i][i] += lambda;

  const P = srcPts.map(([x,y])=>[x,y,1]);
  const L = Array.from({length:n+3},()=>Array(n+3).fill(0));
  for(let r=0;r<n;r++){ for(let c=0;c<n;c++) L[r][c]=K[r][c]; for(let c=0;c<3;c++) L[r][n+c]=P[r][c]; }
  for(let r=0;r<3;r++){ for(let c=0;c<n;c++) L[n+r][c]=P[c][r]; }
  const bx = new Array(n+3).fill(0); for(let i=0;i<n;i++) bx[i]=dstPts[i][0];
  const by = new Array(n+3).fill(0); for(let i=0;i<n;i++) by[i]=dstPts[i][1];
  const coefX=_solveLinear(L,bx); const coefY=_solveLinear(L,by);
  return { srcPts, wx:coefX.slice(0,n), wy:coefY.slice(0,n), ax:coefX.slice(n), ay:coefY.slice(n) };
}
function tpsMap(tps, p){
  const [x,y]=p; const n=tps.srcPts.length; let sx=tps.ax[0]*x+tps.ax[1]*y+tps.ax[2]; let sy=tps.ay[0]*x+tps.ay[1]*y+tps.ay[2];
  for(let i=0;i<n;i++){ const dx=x-tps.srcPts[i][0]; const dy=y-tps.srcPts[i][1]; const u=_U(dx*dx+dy*dy); sx+=tps.wx[i]*u; sy+=tps.wy[i]*u; }
  return [sx,sy];
}
function previewTPSOnCanvas(vm, img, canvas, tps, mesh=20){
  const ctx = canvas.getContext('2d');
  const W = img.naturalWidth, Himg = img.naturalHeight;
  const cornersImg = [[0,0],[W,0],[W,Himg],[0,Himg]];
  const cornersUp = cornersImg.map(([x,y])=>[x,-y]);
  const world = cornersUp.map(p=>tpsMap(tps,p));
  const xs = world.map(p=>p[0]), ys = world.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width=cw; canvas.height=ch;
  const spanX=Math.max(1,maxX-minX), spanY=Math.max(1,maxY-minY);
  const s = Math.min(cw/spanX, ch/spanY);
  const Tfit = [ [ s,0,-minX*s ], [ 0,-s, maxY*s ], [0,0,1] ];

  ctx.clearRect(0,0,cw,ch);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

  const nx=mesh, ny=mesh; const sx=W/nx, sy=Himg/ny;
  for(let j=0;j<ny;j++){
    for(let i=0;i<nx;i++){
      const x0=i*sx, y0=j*sy, x1=(i+1)*sx, y1=(j+1)*sy;
      const s00=[x0,y0], s10=[x1,y0], s11=[x1,y1], s01=[x0,y1];
      const d00=_applyTfit(Tfit, tpsMap(tps,[x0,-y0]));
      const d10=_applyTfit(Tfit, tpsMap(tps,[x1,-y0]));
      const d11=_applyTfit(Tfit, tpsMap(tps,[x1,-y1]));
      const d01=_applyTfit(Tfit, tpsMap(tps,[x0,-y1]));
      drawTri(ctx,img,[s00,s10,s11],[d00,d10,d11]);
      drawTri(ctx,img,[s00,s11,s01],[d00,d11,d01]);
    }
  }
  function _applyTfit(T,[X,Y]){ const x=T[0][0]*X+T[0][1]*Y+T[0][2]; const y=T[1][0]*X+T[1][1]*Y+T[1][2]; return [x,y] }
  function drawTri(ctx, img, srcTri, dstTri){
    ctx.save(); ctx.beginPath(); ctx.moveTo(dstTri[0][0],dstTri[0][1]); ctx.lineTo(dstTri[1][0],dstTri[1][1]); ctx.lineTo(dstTri[2][0],dstTri[2][1]); ctx.closePath(); ctx.clip();
    const [a,b,c,d,e,f]=affineFromTriangles(srcTri,dstTri); ctx.setTransform(a,b,c,d,e,f); ctx.drawImage(img,0,0); ctx.restore();
  }
}

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
      affineM: null,   // 2x3（相似/アフィン用）
      H: null,         // 3x3（ホモグラフィ用）
      tps: null,       // 多数点用（TPS）
      grid: true,
      objUrl: null,
      history: [], histIndex: -1, isRestoring: false,
    }
  },
  watch: {
    modelValue(v){ if(v===false) this.onExternalClose(false) },
    open(v){ if(v===false) this.onExternalClose(false) },
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
    gcpList: { deep:true, handler(){ if(!this.isRestoring) this.pushHistory('gcp'); if(this.pairsCount>=2) this.previewAffineWarp(); this.$nextTick(this.redrawMarkers) } }
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
    isOpen(){ return (this.open===undefined ? this.modelValue : this.open) !== false },
    pairs(){ return (this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord||g.imageCoordCss) && Array.isArray(g.mapCoord)) },
    pairsCount(){ return this.pairs.length },
    transformKind(){
      if(this.tps) return 'TPS';
      if(!(this.affineM || this.H)) return '';
      if (this.pairsCount >= 4) return 'Homography';
      return this.pairsCount >= 3 ? 'Affine' : 'Similarity';
    },
    transformKindColor(){
      if (this.tps) return 'indigo';
      if (this.pairsCount >= 4) return 'pink';
      return this.pairsCount >= 3 ? 'deep-purple' : 'teal';
    },
    imgMeta(){ const img=this.$refs.warpImage; if(!img) return ''; return `${img.naturalWidth}×${img.naturalHeight}` },
    hideBaseImage(){ return !!(this.affineM || this.H || this.tps) },
    canUndo(){ return this.histIndex > 0 },
    canRedo(){ return this.histIndex >= 0 && this.history && this.histIndex < this.history.length - 1 },
    // デバッグ目的：2ペア以上あれば押せる
    canDownloadWorldFile(){ return this.pairsCount >= 2 },
    worldFileMode(){ return (!!this.affineM && !this.H && !this.tps) ? 'exact' : 'approx' },
    inferredWorldExt(){
      const src = (this.$props.file && this.$props.file.name) || (this.url || '');
      const lower = String(src).toLowerCase().split('?')[0];
      const parts = lower.split('.');
      const ext = parts.length>1 ? parts.pop() : 'png';
      const map = { png:'pgw', jpg:'jgw', jpeg:'jgw', tif:'tfw', tiff:'tfw', bmp:'bpw', gif:'gfw', webp:'wpw' };
      return map[ext] || 'pgw';
    },
  },
  methods: {
    fmtPx(p){ if(!Array.isArray(p) || p.length<2) return '-'; const x=Number(p[0]), y=Number(p[1]); if(!Number.isFinite(x)||!Number.isFinite(y)) return '-'; return `${Math.round(x)}, ${Math.round(y)}` },
    fmtLL(ll){ if(!Array.isArray(ll) || ll.length<2) return '-'; const lng=Number(ll[0]), lat=Number(ll[1]); if(!Number.isFinite(lng)||!Number.isFinite(lat)) return '-'; return `${lng.toFixed(6)}, ${lat.toFixed(6)}` },

    // 親がクローズしたら呼ばれる。自分をまっさらにし、地図側青丸も必ずクリア。
    onExternalClose(fromUnmount=false){
      try{
        if(fromUnmount){
          window.removeEventListener('keydown', this.onKeydown)
          window.removeEventListener('resize', this.onResize)
        }
      }catch(e){}
      if(this.objUrl){ try{ URL.revokeObjectURL(this.objUrl) }catch(e){} this.objUrl=null }

      // 自分をまっさらに
      this.affineM=null; this.H=null; this.tps=null; this.imgUrl=null;
      this.resetHistory();

      // キャンバスをクリア
      this.clearCanvas(this.$refs.warpCanvas);
      this.clearCanvas(this.$refs.gridCanvas);
      this.clearCanvas(this.$refs.markerCanvas);

      // GCPと地図側のマーカーをクリア
      this.$emit('update:gcpList', []);
      this.$emit('clear-map-markers'); // ← アンマウントでも必ず送る
    },

    toggleGrid(){ this.grid=!this.grid; this.$nextTick(this.drawGrid) },
    resetAll(){ this.affineM=null; this.H=null; this.tps=null; this.$emit('update:gcpList', []); this.clearCanvas(this.$refs.warpCanvas); this.redrawMarkers() },
    onResize(){ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); if(this.affineM || this.H || this.tps) this.previewAffineWarp() },
    onImageLoad(){ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); if(this.pairsCount>=2) this.previewAffineWarp() },

    snapshot(){ return { gcpList: JSON.parse(JSON.stringify(this.gcpList||[])), affineM: this.affineM ? [...this.affineM] : null, H: this.H ? this.H.map(r=>[...r]) : null } },
    resetHistory(){ this.history=[]; this.histIndex=-1 },
    pushHistory(){ if(this.isRestoring) return; const snap=this.snapshot(); const cur=this.history[this.histIndex]; if(cur && JSON.stringify(cur)===JSON.stringify(snap)) return; if(this.histIndex < this.history.length-1){ this.history.splice(this.histIndex+1) } this.history.push(snap); this.histIndex=this.history.length-1; if(this.history.length>50){ this.history.shift(); this.histIndex-- } },
    applySnapshot(snap){ this.isRestoring=true; this.affineM=snap.affineM; this.H=snap.H; this.tps=null; this.$emit('update:gcpList', JSON.parse(JSON.stringify(snap.gcpList))); this.$nextTick(()=>{ this.isRestoring=false; if(this.pairsCount>=2) this.previewAffineWarp(); else this.clearCanvas(this.$refs.warpCanvas); this.redrawMarkers() }) },
    undo(){ if(!this.canUndo) return; this.histIndex--; this.applySnapshot(this.history[this.histIndex]) },
    redo(){ if(!this.canRedo) return; this.histIndex++; this.applySnapshot(this.history[this.histIndex]) },
    onKeydown(e){ const isMac=/Mac|iPod|iPhone|iPad/.test(navigator.platform); const mod=isMac?e.metaKey:e.ctrlKey; if(!mod) return; if(e.key.toLowerCase()==='z'){ e.preventDefault(); if(e.shiftKey) this.redo(); else this.undo(); } },

    syncCanvasSize(){ const img=this.$refs.warpImage; if(!img) return; const cw=img.clientWidth||img.naturalWidth; const ch=img.clientHeight||img.naturalHeight; const cvs=[this.$refs.warpCanvas,this.$refs.gridCanvas,this.$refs.markerCanvas]; cvs.forEach(c=>{ if(!c) return; c.width=cw; c.height=ch; }) },
    clearCanvas(c){ if(!c) return; const ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,c.width,c.height) },
    drawGrid(){ if(!this.grid) return; const img=this.$refs.warpImage; const canvas=this.$refs.gridCanvas; if(!img||!canvas) return; const cw=img.clientWidth||img.naturalWidth; const ch=img.clientHeight||img.naturalHeight; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,cw,ch); ctx.globalAlpha=.35; ctx.lineWidth=1; ctx.strokeStyle='rgba(0,0,0,0.6)'; const step=Math.max(32, Math.round(cw/20)); for(let x=0;x<cw;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke() } for(let y=0;y<ch;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke() } ctx.globalAlpha=1 },
    redrawMarkers(){ const canvas=this.$refs.markerCanvas; const img=this.$refs.warpImage; if(!canvas||!img) return; const ctx=canvas.getContext('2d'); const cw=canvas.width, ch=canvas.height; ctx.clearRect(0,0,cw,ch); const pts=(this.gcpList||[]).map((g,i)=>{ if(Array.isArray(g.imageCoordCss)) return {i,xy:g.imageCoordCss}; if(Array.isArray(g.imageCoord)) return {i,xy:naturalToCss(g.imageCoord, img)}; return null }).filter(Boolean); const r=12; pts.forEach(p=>{ const [x,y]=p.xy; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle='#e53935'; ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle='#ffffff'; ctx.stroke(); ctx.font='700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#ffffff'; ctx.fillText(String(p.i+1), x, y); }) },

    onImageAreaClick(e){ const img=this.$refs.warpImage; if(!img) return; const rect=img.getBoundingClientRect(); const xCss=e.clientX-rect.left; const yCss=e.clientY-rect.top; const [xNat,yNat]=imageCssToNatural([xCss,yCss], img); const next=(this.gcpList||[]).slice(); next.push({ imageCoordCss:[xCss,yCss], imageCoord:[xNat,yNat], mapCoord:null }); this.$emit('update:gcpList', next); this.pushHistory('img-click'); this.$nextTick(this.redrawMarkers) },
    removeGcp(i){ const next=(this.gcpList||[]).slice(); next.splice(i,1); this.$emit('update:gcpList', next); this.pushHistory('remove'); this.$nextTick(this.redrawMarkers) },

    // ==== 自動判定プレビュー（Similarity / Affine / Homography / TPS） ====
    previewAffineWarp(){
      const img=this.$refs.warpImage, canvas=this.$refs.warpCanvas;
      if(!img||!canvas) return;
      const pairs=(this.gcpList||[]).filter(g => (Array.isArray(g.imageCoord||g.imageCoordCss)) && Array.isArray(g.mapCoord));
      if (pairs.length < 2){ this.affineM=null; this.H=null; this.tps=null; this.clearCanvas(canvas); return; }

      const toNatural = (g)=> Array.isArray(g.imageCoordCss) ? imageCssToNatural(g.imageCoordCss, img) : g.imageCoord;
      const srcNat = pairs.map(toNatural);
      const srcUp  = srcNat.map(([x,y]) => [x, -y]);
      const dstUp  = pairs.map(g => lngLatToMerc(g.mapCoord));

      if (pairs.length === 2){
        const Mup = fitSimilarity2P(srcUp, dstUp);
        const FLIP_Y_A = [1,0,0, 0,-1,0];
        const M = composeAffine(Mup, FLIP_Y_A); // [x,y] -> world
        this.H = null; this.tps=null; this.affineM = M; previewOnCanvas(this, img, canvas, M); return;
      }
      if (pairs.length === 3){
        const Mup = fitAffineN(srcUp, dstUp);
        const FLIP_Y_A = [1,0,0, 0,-1,0];
        const M = composeAffine(Mup, FLIP_Y_A);
        this.H = null; this.tps=null; this.affineM = M; previewOnCanvas(this, img, canvas, M); return;
      }
      if (pairs.length === 4){
        const Hup = estimateHomographyExact4Pts(srcUp, dstUp);
        const FLIP_Y_H = [[1,0,0],[0,-1,0],[0,0,1]];
        const H = mat33Mul(Hup, FLIP_Y_H); // [x,y] -> world
        this.affineM = null; this.tps=null; this.H = H; previewProjectiveOnCanvas(this, img, canvas, H, 28); return;
      }
      // 5点以上 → TPS（多数点向け）
      try{
        const MAX_N = 120; // 安全策: 極端に多いときは間引き
        let srcTPS = srcUp, dstTPS = dstUp;
        if (srcUp.length > MAX_N){
          const k = Math.ceil(srcUp.length / MAX_N);
          srcTPS = srcUp.filter((_,i)=> i%k===0);
          dstTPS = dstUp.filter((_,i)=> i%k===0);
        }
        const tps = buildTPS(srcTPS, dstTPS, 1e-3);
        this.affineM=null; this.H=null; this.tps=tps; previewTPSOnCanvas(this, img, canvas, tps, 20);
      }catch(err){
        console.warn('TPS失敗。Homography(robust)にフォールバック:', err);
        const Hup = estimateHomographyRobust(srcUp, dstUp, 3);
        const FLIP_Y_H = [[1,0,0],[0,-1,0],[0,0,1]];
        const H = mat33Mul(Hup, FLIP_Y_H);
        this.affineM = null; this.tps=null; this.H = H; previewProjectiveOnCanvas(this, img, canvas, H, 28);
      }
    },
    downloadWorldFile(){
      // 1) まずは既存のアフィンがあればそれを使う（4点以下＝従来通り）
      let M = this.affineM;

      // 2) 無ければ、H から局所アフィン化（トップレフト近傍）
      if(!M && this.H){
        // World File は「左上ピクセル中心」準拠が一般的だが、
        // 既存の生成に合わせて (0,0) 基準で OK。必要なら (0.5,0.5) に変えても可。
        M = affineFromHomographyAt(this.H, 0, 0);
      }

      // 3) さらに無ければ、TPS から局所アフィン化
      if(!M && this.tps){
        M = affineFromTPSAt(this.tps, 0, 0);
      }

      if(!M) return; // まだ無ければ何もしない

      // --- 安全ガード：E は負を期待。誤符号なら全体反転（Y軸） ---
      // ※通常この分岐には来ないはずだが、保険で入れておく。
      const [A,B,C,D,E,F] = M;
      if (E > 0) M = [ A, -B, C, -D, -E, F ];

      const txt = worldFileFromAffine(M);
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const base = (this.$props.file && this.$props.file.name)
          ? this.$props.file.name.replace(/\.[^.]+$/, '')
          : 'image';
      const fname = `${base}.${this.inferredWorldExt}`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      URL.revokeObjectURL(a.href);

      // （任意）.prj も一緒に保存して“宇宙行き”の誤解釈を根絶
      const prj3857 = 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AXIS["X",EAST],AXIS["Y",NORTH],AUTHORITY["EPSG","3857"]]';
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(new Blob([prj3857], {type:'text/plain;charset=utf-8'}));
      a2.download = `${base}.prj`;
      a2.click();
      URL.revokeObjectURL(a2.href);
    },

    // downloadWorldFile(){
    //   // Affineがあれば"正確"、H/TPSでもGCPから近似アフィンを推定して生成
    //   let M = this.affineM;
    //   if(!M){
    //     const img = this.$refs.warpImage;
    //     if(!img || this.pairsCount < 2) return;
    //     const pairs = this.pairs;
    //     const toNatural = (g)=> Array.isArray(g.imageCoordCss) ? imageCssToNatural(g.imageCoordCss, img) : g.imageCoord;
    //     const srcNat = pairs.map(toNatural);
    //     const srcUp  = srcNat.map(([x,y]) => [x, -y]);
    //     const dstUp  = pairs.map(g => lngLatToMerc(g.mapCoord));
    //     const Mup = (srcUp.length >= 3) ? fitAffineRobust(srcUp, dstUp, 3) : fitSimilarity2P(srcUp, dstUp);
    //     const FLIP_Y_A = [1,0,0, 0,-1,0];
    //     M = composeAffine(Mup, FLIP_Y_A);
    //     if(!M || M.some(v => !Number.isFinite(v))) return;
    //   }
    //   const txt = worldFileFromAffine(M);
    //   const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    //   const base = (this.$props.file && this.$props.file.name)
    //       ? this.$props.file.name.replace(/\.[^.]+$/, '')
    //       : 'image';
    //   const fname = `${base}.${this.inferredWorldExt}`;
    //   const a = document.createElement('a');
    //   a.href = URL.createObjectURL(blob); a.download = fname; a.click();
    //   URL.revokeObjectURL(a.href);
    // },

    confirm(){
      if(!(this.affineM || this.H || this.tps)) return;
      const f=this.$props.file||null; const canvas=this.$refs.warpCanvas;
      let cornersLngLat = null; let kind=''; let extra=null;

      if (this.H && this.$refs.warpImage){
        const img=this.$refs.warpImage; const W=img.naturalWidth, Hh=img.naturalHeight;
        const cornersImg=[[0,0],[W,0],[W,Hh],[0,Hh]]; // TL, TR, BR, BL
        const cornersWorld=cornersImg.map(p=> applyHomography(this.H, p)); // 3857(m)
        cornersLngLat = cornersWorld.map(mercToLngLat);
        kind='homography';
      } else if (this.affineM){
        kind = (this.pairsCount>=3 ? 'affine' : 'similarity');
      } else if (this.tps && this.$refs.warpImage){
        const img=this.$refs.warpImage; const W=img.naturalWidth, Hh=img.naturalHeight;
        const cornersUp = [[0,0],[W,0],[W,Hh],[0,Hh]].map(([x,y])=>[x,-y]);
        const cornersWorld = cornersUp.map(p=> tpsMap(this.tps, p));
        cornersLngLat = cornersWorld.map(mercToLngLat);
        kind='tps';
        extra = { tps:{ srcPts:this.tps.srcPts, wx:this.tps.wx, wy:this.tps.wy, ax:this.tps.ax, ay:this.tps.ay } };
      }

      const payload = {
        file: f,
        affineM: this.affineM || null,
        H: this.H || null,
        kind,
        cornersLngLat, // [TL, TR, BR, BL]
        ...(extra||{}),
      };
      if(!canvas || !canvas.toBlob){ this.$emit('confirm',{ ...payload, blob:null }); return }
      canvas.toBlob((blob)=>{ this.$emit('confirm',{ ...payload, blob }) }, 'image/png')
    }
  }
}
</script>

<style scoped>
.oh-warp-root{ width: 520px; max-width: calc(100vw - 40px); box-sizing: border-box; background: #fff; overflow: hidden; border-radius: 12px; }
.oh-toolbar{ display:flex; align-items:center; justify-content:space-between; padding: 8px 10px; background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0)); border-bottom: 1px solid rgba(0,0,0,0.08); }
.oh-toolbar .v-btn.is-active{ background: rgba(0,0,0,0.06) }
.oh-title{ font-weight:600; display:flex; align-items:center; gap:8px; letter-spacing: .2px; }
.oh-icon{ font-size: 16px; }
.oh-tools{ display:flex; align-items:center; gap:4px; }
.oh-tools .dl-btn{ margin-left: 2px; }
.oh-body{ display:grid; grid-template-columns: 1fr 380px; gap:10px; padding:10px; }
.oh-body.stacked{ grid-template-columns: 1fr; grid-template-rows: auto auto; }
.oh-body.stacked .left-pane{ order:1; }
.oh-body.stacked .right-pane{ order:2; }
.left-pane{ display:flex; align-items:center; justify-content:center; min-height: 420px; background: rgba(0,0,0,0.03); border: 1px dashed rgba(0,0,0,0.2); border-radius: 10px; }
.img-wrap{ position: relative; display:inline-block; max-width:100%; cursor: crosshair; }
#warp-image{ position:relative; z-index:0; display:block; max-width:100%; height:auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
#warp-image.hidden{ visibility:hidden; }
.warp-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:1; }
.grid-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; opacity:.45; z-index:2; }
.marker-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:3; }
.right-pane{ padding:4px 0; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.actions{ display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:10px; }
.actions .hint{ margin:0; opacity:.8; font-size: .9rem; }
</style>