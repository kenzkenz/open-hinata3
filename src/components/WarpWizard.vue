<template>
  <div class="oh-warp-root" v-show="isOpen">
    <div class="oh-toolbar">
      <div class="oh-title"></div>
      <div class="oh-tools compact">
        <!-- プレビュー：トグル（入/出） -->
        <MiniTooltip :text="previewMode ? 'プレビュー終了' : 'プレビュー'" :offset-x="0" :offset-y="0">
          <v-btn
              icon variant="text"
              :disabled="(pairsCount < 2) && !previewMode"
              @click="togglePreview"
              :title="previewMode ? 'プレビュー終了' : 'プレビュー'">
            <v-icon>{{ previewMode ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
          </v-btn>
        </MiniTooltip>

        <!-- アップロード -->
        <MiniTooltip text="アップロード" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" :disabled="!(affineM || tps)" @click="confirm" title="アップロード">
            <v-icon>mdi-cloud-upload</v-icon>
          </v-btn>
        </MiniTooltip>

        <v-divider vertical class="mx-1"/>

        <!-- Undo/Redo（プレビュー中のUndoはプレビュー解除だけ） -->
        <v-btn icon variant="text" :disabled="!canUndo && !previewMode" @click="undo" title="元に戻す (Ctrl/Cmd+Z)">
          <v-icon>mdi-undo</v-icon>
        </v-btn>
        <v-btn icon variant="text" :disabled="!canRedo" @click="redo" title="やり直す (Shift+Ctrl/Cmd+Z)">
          <v-icon>mdi-redo</v-icon>
        </v-btn>

        <v-divider vertical class="mx-1"/>

        <!-- 全消去 -->
        <v-btn icon variant="text" @click="resetAll" title="全消去（画像・GCP・マスク）">
          <v-icon>mdi-backspace</v-icon>
        </v-btn>

        <v-divider vertical class="mx-1"/>

        <!-- マスキング -->
        <MiniTooltip text="マスキング" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" :class="{ 'is-active': maskMode }" @click="maskMode = !maskMode" title="マスク（地図部の四隅を指定）">
            <v-icon>mdi-crop</v-icon>
          </v-btn>
        </MiniTooltip>
        <MiniTooltip text="マスクを解除" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" :disabled="!maskVertsLngLat.length" @click="clearMask" title="マスクをクリア">
            <v-icon>mdi-selection-off</v-icon>
          </v-btn>
        </MiniTooltip>

        <!-- ヘルプ -->
        <MiniTooltip text="ヘルプ" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" @click="onHelpClick" title="ヘルプ">
            <v-icon>mdi-help-circle-outline</v-icon>
          </v-btn>
        </MiniTooltip>

        <v-divider vertical class="mx-1"/>

        <!-- GCPテーブル表示/非表示 -->
        <MiniTooltip :text="showGcpPanel ? 'GCPテーブルを隠す' : 'GCPテーブルを表示'" :offset-x="0" :offset-y="0">
          <v-btn
              icon
              variant="text"
              :class="{ 'is-active': showGcpPanel }"
              @click="toggleGcpPanel"
              :title="showGcpPanel ? 'GCPテーブルを隠す' : 'GCPテーブルを表示'">
            <v-icon>{{ showGcpPanel ? 'mdi-table-eye' : 'mdi-table' }}</v-icon>
          </v-btn>
        </MiniTooltip>
      </div>
    </div>

    <div class="oh-body" :class="{ stacked }">
      <div class="left-pane">
        <div class="ml-wrap">
          <!-- プレビュー時だけ表示するベースレイヤ選択 UI（小さめ） -->
          <div v-if="previewMode" class="base-ui">
            <button
                v-for="opt in baseOptions"
                :key="opt.key"
                class="chip"
                :class="{ active: selectedBase === opt.key }"
                @click="selectBase(opt.key)"
            >{{ opt.label }}</button>
          </div>

          <div ref="mlMap" class="ml-map"></div>

          <div class="ml-overlay">
            <!-- 画像タグは読み込み & サイズ基準用。キャンバスは内部計算用。 -->
            <img id="warp-image" ref="warpImage" :src="imgUrl" class="hidden" @load="onImageLoad">
            <canvas id="warp-canvas" ref="warpCanvas" class="warp-canvas"></canvas>
            <canvas ref="markerCanvas" class="marker-canvas"></canvas>
          </div>

          <div v-if="!imgUrl" class="empty-on-map">画像がありません</div>
        </div>
      </div>

      <div class="right-pane" v-show="showGcpPanel">
        <div class="gcp-editor">
          <div class="gcp-row header">
            <span></span><span>Image (px)</span><span>Map (lng, lat)</span><span></span>
          </div>
          <div class="gcp-scroll">
            <div class="gcp-row" v-for="(g,i) in gcpList" :key="i">
              <div class="idx">{{ i+1 }}</div>
              <div class="img">
                <v-text-field class="img-x" type="number" density="compact" variant="plain" hide-details="auto"
                              :model-value="getImgX(g)" @update:modelValue="setImgX(i, $event)" />
                <v-text-field class="img-y" type="number" density="compact" variant="plain" hide-details="auto"
                              :model-value="getImgY(g)" @update:modelValue="setImgY(i, $event)" />
              </div>
              <div class="map">
                <v-text-field type="number" step="0.000001" density="compact" variant="plain" hide-details="auto"
                              :model-value="getLng(g)" @update:modelValue="setLng(i, $event)" />
                <v-text-field type="number" step="0.000001" density="compact" variant="plain" hide-details="auto"
                              :model-value="getLat(g)" @update:modelValue="setLat(i, $event)" />
              </div>
              <div class="tools">
                <v-btn icon size="small" variant="text" class="del-btn" @click="removeGcp(i)" title="この行を削除">
                  <v-icon size="26">mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
          <p style="margin-left: 20px; margin-bottom: 10px;">
            画像クリックで Image(px) を追加。緯度経度は親の青丸設置で自動入力（手入力も可）。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// ------- math utils -------
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
  const [x1,y1]=srcPts[0], [x2,y2]=srcPts[1];
  const [X1,Y1]=dstPts[0], [X2,Y2]=dstPts[1];
  const ds=Math.hypot(x2-x1, y2-y1)||1, dt=Math.hypot(X2-X1, Y2-Y1)||1;
  const s=dt/ds, th=Math.atan2(Y2-Y1, X2-X1)-Math.atan2(y2-y1, x2-x1);
  const c=Math.cos(th), s_=Math.sin(th);
  const A=s*c, B=-s*s_, D=s*s_, E=s*c;
  const C=X1-(A*x1+B*y1), F=Y1-(D*x1+E*y1);
  return [A,B,C,D,E,F];
}
function fitAffineN(srcPts, dstPts, w){
  const n = srcPts.length, M6 = 6;
  const A = Array.from({length:M6}, ()=>Array(M6).fill(0));
  const b = Array(M6).fill(0);
  for (let i=0;i<n;i++){
    const wi = w ? w[i] : 1;
    const [x,y] = srcPts[i];
    const [X,Y] = dstPts[i];
    const rowX = [x,y,1, 0,0,0].map(v => wi*v);
    const rowY = [0,0,0, x,y,1].map(v => wi*v);
    for (let j=0;j<M6;j++){
      for (let k=0;k<M6;k++){
        A[j][k] += rowX[j]*rowX[k] + rowY[j]*rowY[k];
      }
      b[j] += rowX[j]*X + rowY[j]*Y;
    }
  }
  const B = A.map(r => r.slice());
  const x = b.slice();
  const N = B.length;
  for (let i=0;i<N;i++){
    let p = i;
    for (let r=i+1;r<N;r++){
      if (Math.abs(B[r][i]) > Math.abs(B[p][i])) p = r;
    }
    if (p !== i){ [B[i],B[p]] = [B[p],B[i]]; [x[i],x[p]] = [x[p],x[i]]; }
    const diag = B[i][i] || 1e-12;
    for (let j=i+1;j<N;j++){
      const f = B[j][i] / diag;
      for (let k=i;k<N;k++) B[j][k] -= f * B[i][k];
      x[j] -= f * x[i];
    }
  }
  for (let i=N-1;i>=0;i--){
    let s = 0;
    for (let j=i+1;j<N;j++) s += B[i][j]*x[j];
    x[i] = (x[i] - s) / (B[i][i] || 1e-12);
  }
  return x; // [A,B,C,D,E,F]
}
function huberWeights(res, delta){ return res.map(r=>{ const a=Math.abs(r); return a<=delta?1:(delta/a); }); }
function median(arr){ const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function fitAffineRobust(srcPts, dstPts, iters=3){
  let w=Array(srcPts.length).fill(1); let coeff=fitAffineN(srcPts,dstPts,w);
  for(let t=0;t<iters;t++){
    const res=srcPts.map(([x,y],i)=>{ const [A,B,C,D,E,F]=coeff; const Xp=A*x+B*y+C, Yp=D*x+E*y+F; const [X,Y]=dstPts[i]; return Math.hypot(Xp-X,Yp-Y); });
    w=huberWeights(res, Math.max(1, 1.4826*median(res))); coeff=fitAffineN(srcPts,dstPts,w);
  }
  return coeff;
}
function applyAffine([A,B,C,D,E,F],[x,y]){ return [A*x+B*y+C, D*x+E*y+F]; }
function composeAffine([A1,B1,C1,D1,E1,F1],[A2,B2,C2,D2,E2,F2]){
  const A=A1*A2+B1*D2, B=A1*B2+B1*E2, C=A1*C2+B1*F2+C1;
  const D=D1*A2+E1*D2, E=D1*B2+E1*E2, F=D1*C2+E1*F2+F1; return [A,B,C,D,E,F];
}
function worldFileFromAffine([A,B,C,D,E,F]){
  return `${A}\n${D}\n${B}\n${E}\n${C}\n${F}`;
}
function previewOnCanvas(vm,img,canvas,M,clipNat=null){
  const ctx=canvas.getContext('2d');
  const w=img.naturalWidth,h=img.naturalHeight;
  const corners=[[0,0],[w,0],[w,h],[0,h]].map(p=>applyAffine(M,p));
  const xs=corners.map(p=>p[0]), ys=corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw=Math.max(1,img.clientWidth||img.naturalWidth), ch=Math.max(1,img.clientHeight||img.naturalHeight);
  canvas.width=cw; canvas.height=ch;
  const s=Math.min(cw/(maxX-minX), ch/(maxY-minY));
  const T=[ s,0,-minX*s, 0,-s,maxY*s ];
  const Mv=composeAffine(T,M); const [A,B,C,D,E,F]=Mv;
  vm.viewImgToCanvas=p=>applyAffine(Mv,p); vm.viewMapToCanvas=XY=>applyAffine(T,XY);
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cw,ch);
  let clipped=false;
  if(clipNat && clipNat.length>=3){
    ctx.save(); ctx.beginPath();
    clipNat.forEach(([x,y],i)=>{ const [cx,cy]=applyAffine(Mv,[x,y]); if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy); });
    ctx.closePath(); ctx.clip(); clipped=true;
  }
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.setTransform(A,D,B,E,C,F); ctx.drawImage(img,0,0);
  if(clipped) ctx.restore();
  vm.$nextTick(vm.redrawMarkers);
}
// --- TPS ---
function solveLinear(A, b) {
  const N=A.length, M=A.map(r=>r.slice()), x=b.slice();
  for(let i=0;i<N;i++){
    let p=i; for(let r=i+1;r<N;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r;
    if(p!==i){ [M[i],M[p]]=[M[p],M[i]]; [x[i],x[p]]=[x[p],x[i]]; }
    const diag=M[i][i]||1e-12;
    for(let j=i+1;j<N;j++){
      const f=M[j][i]/diag;
      for(let k=i;k<N;k++) M[j][k]-=f*M[i][k];
      x[j]-=f*x[i];
    }
  }
  for(let i=N-1;i>=0;i--){
    let s=0; for(let j=i+1;j<N;j++) s+=M[i][j]*x[j];
    x[i]=(x[i]-s)/(M[i][i]||1e-12);
  }
  return x;
}
function fitTPS(srcPts, dstPts){
  const n=srcPts.length, m=n+3;
  const U=r=> (r>0? r*r*Math.log(r*r):0);
  const L=Array.from({length:m},()=>Array(m).fill(0));
  for(let i=0;i<n;i++){
    for(let j=0;j<n;j++){ const dx=srcPts[i][0]-srcPts[j][0], dy=srcPts[i][1]-srcPts[j][1]; L[i][j]=U(Math.hypot(dx,dy)); }
    L[i][n]=1; L[i][n+1]=srcPts[i][0]; L[i][n+2]=srcPts[i][1];
  }
  for(let j=0;j<n;j++){ L[n][j]=1; L[n+1][j]=srcPts[j][0]; L[n+2][j]=srcPts[j][1]; }
  const bx=dstPts.map(p=>p[0]).concat([0,0,0]), by=dstPts.map(p=>p[1]).concat([0,0,0]);
  const wx=solveLinear(L,bx), wy=solveLinear(L,by);
  return { wx, wy, srcPts };
}
function applyTPS(tps,[x,y]){
  const {wx,wy,srcPts}=tps; const n=srcPts.length;
  let X=wx[n]+wx[n+1]*x+wx[n+2]*y, Y=wy[n]+wy[n+1]*x+wy[n+2]*y;
  for(let i=0;i<n;i++){
    const dx=x-srcPts[i][0], dy=y-srcPts[i][1], r2=dx*dx+dy*dy, u=r2>0? r2*Math.log(r2):0;
    X+=wx[i]*u; Y+=wy[i]*u;
  }
  return [X,Y];
}
function previewTPSOnCanvas(vm,img,canvas,tps,mesh=24,clipNat=null){
  const ctx=canvas.getContext('2d'); const W=img.naturalWidth, H=img.naturalHeight;
  const corners=[[0,0],[W,0],[W,H],[0,H]].map(p=>applyTPS(tps,[p[0],-p[1]]));
  const xs=corners.map(p=>p[0]), ys=corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw=Math.max(1,img.clientWidth||img.naturalWidth), ch=Math.max(1,img.clientHeight||img.naturalHeight);
  canvas.width=cw; canvas.height=ch;
  const s=Math.min(cw/(maxX-minX), ch/(maxY-minY)), view=([X,Y])=>[ s*(X-minX), s*(maxY-Y) ];
  vm.viewImgToCanvas=p=>view(applyTPS(tps,[p[0],-p[1]])); vm.viewMapToCanvas=XY=>view(XY);
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cw,ch); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  let clipped=false;
  if(clipNat && clipNat.length>=3){
    const q=clipNat.slice(), edges=[[q[0],q[1]],[q[1],q[2]],[q[2],q[3]||q[0]],[q[3]||q[0],q[0]]], pts=[], N=24;
    edges.forEach(([p0,p1])=>{ if(!p0||!p1) return; for(let i=0;i<=N;i++){ const t=i/N, x=p0[0]*(1-t)+p1[0]*t, y=p0[1]*(1-t)+p1[1]*t; pts.push(view(applyTPS(tps,[x,-y]))); } });
    ctx.save(); ctx.beginPath(); pts.forEach(([cx,cy],i)=>{ if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy); }); ctx.closePath(); ctx.clip(); clipped=true;
  }
  const nx=mesh, ny=mesh, sx=W/nx, sy=H/ny;
  function aff(srcTri,dstTri){
    const p0=srcTri[0],p1=srcTri[1],p2=srcTri[2],q0=dstTri[0],q1=dstTri[1],q2=dstTri[2];
    const a=p1[0]-p0[0], b=p2[0]-p0[0], c=p1[1]-p0[1], d=p2[1]-p0[1], det=a*d-b*c||1e-12;
    const A=((q1[0]-q0[0])*d-(q2[0]-q0[0])*c)/det, B=(-(q1[0]-q0[0])*b+(q2[0]-q0[0])*a)/det;
    const D=((q1[1]-q0[1])*d-(q2[1]-q0[1])*c)/det, E=(-(q1[1]-q0[1])*b+(q2[1]-q0[1])*a)/det;
    const C=q0[0]-A*p0[0]-B*p0[1], F=q0[1]-D*p0[0]-E*p0[1]; return [A,B,C,D,E,F];
  }
  function drawTri(ctx,img,srcTri,dstTri){
    ctx.save(); ctx.beginPath();
    ctx.moveTo(dstTri[0][0],dstTri[0][1]); ctx.lineTo(dstTri[1][0],dstTri[1][1]); ctx.lineTo(dstTri[2][0],dstTri[2][1]);
    ctx.closePath(); ctx.clip(); const [a,b,c,d,e,f]=aff(srcTri,dstTri); ctx.setTransform(a,d,b,e,c,f); ctx.drawImage(img,0,0); ctx.restore();
  }
  for(let j=0;j<ny;j++){
    for(let i=0;i<nx;i++){
      const x0=i*sx,y0=j*sy,x1=(i+1)*sx,y1=(j+1)*sy;
      const s00=[x0,y0],s10=[x1,y0],s11=[x1,y1],s01=[x0,y1];
      const d00=view(applyTPS(tps,[x0,-y0])), d10=view(applyTPS(tps,[x1,-y0]));
      const d11=view(applyTPS(tps,[x1,-y1])), d01=view(applyTPS(tps,[x0,-y1]));
      drawTri(ctx,img,[s00,s10,s11],[d00,d10,d11]); drawTri(ctx,img,[s00,s11,s01],[d00,d11,d01]);
    }
  }
  if(clipped) ctx.restore();
  return canvas;
}
// TPS を 3857 平面に焼き込み
function exportTPSWithWorld(img, tps, clipNat=null, mesh=32, pxPerMeter=null){
  const W = img.naturalWidth, H = img.naturalHeight;
  const corners = [[0,0],[W,0],[W,H],[0,H]].map(p => applyTPS(tps, [p[0], -p[1]]));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const worldW = Math.max(1, maxX - minX);
  const scale = pxPerMeter || (W / worldW);
  const outW = Math.max(1, Math.round(worldW * scale));
  const outH = Math.max(1, Math.round((maxY - minY) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,outW,outH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const view = ([X,Y]) => [ scale*(X - minX), scale*(maxY - Y) ];
  let clipped=false;
  if (clipNat && clipNat.length>=3){
    const q=clipNat.slice(), edges=[[q[0],q[1]],[q[1],q[2]],[q[2],q[3]||q[0]],[q[3]||q[0],q[0]]], pts=[], N=24;
    edges.forEach(([p0,p1])=>{
      if(!p0||!p1) return;
      for(let i=0;i<=N;i++){
        const t=i/N, x=p0[0]*(1-t)+p1[0]*t, y=p0[1]*(1-t)+p1[1]*t;
        pts.push(view(applyTPS(tps,[x,-y])));
      }
    });
    ctx.save(); ctx.beginPath();
    pts.forEach(([cx,cy],i)=>{ if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy); });
    ctx.closePath(); ctx.clip(); clipped=true;
  }
  const nx = mesh, ny = mesh, sx = W/nx, sy = H/ny;
  function aff(srcTri,dstTri){
    const p0=srcTri[0],p1=srcTri[1],p2=srcTri[2],q0=dstTri[0],q1=dstTri[1],q2=dstTri[2];
    const a=p1[0]-p0[0], b=p2[0]-p0[0], c=p1[1]-p0[1], d=p2[1]-p0[1], det=a*d-b*c||1e-12;
    const A=((q1[0]-q0[0])*d-(q2[0]-q0[0])*c)/det, B=(-(q1[0]-q0[0])*b+(q2[0]-q0[0])*a)/det;
    const D=((q1[1]-q0[1])*d-(q2[1]-q0[1])*c)/det, E=(-(q1[1]-q0[1])*b+(q2[1]-q0[1])*a)/det;
    const C=q0[0]-A*p0[0]-B*p0[1], F=q0[1]-D*p0[0]-E*p0[1];
    return [A,B,C,D,E,F];
  }
  function drawTri(ctx,img,srcTri,dstTri){
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dstTri[0][0],dstTri[0][1]); ctx.lineTo(dstTri[1][0],dstTri[1][1]); ctx.lineTo(dstTri[2][0],dstTri[2][1]);
    ctx.closePath(); ctx.clip();
    const [a,b,c,d,e,f]=aff(srcTri,dstTri);
    ctx.setTransform(a,d,b,e,c,f);
    ctx.drawImage(img,0,0);
    ctx.restore();
  }
  for(let j=0;j<ny;j++){
    for(let i=0;i<nx;i++){
      const x0=i*sx,y0=j*sy,x1=(i+1)*sx,y1=(j+1)*sy;
      const s00=[x0,y0],s10=[x1,y0],s11=[x1,y1],s01=[x0,y1];
      const d00=view(applyTPS(tps,[x0,-y0])), d10=view(applyTPS(tps,[x1,-y0]));
      const d11=view(applyTPS(tps,[x1,-y1])), d01=view(applyTPS(tps,[x0,-y1]));
      drawTri(ctx,img,[s00,s10,s11],[d00,d10,d11]);
      drawTri(ctx,img,[s00,s11,s01],[d00,d11,d01]);
    }
  }
  if (clipped) ctx.restore();
  const A = 1/scale, D = 0, B = 0, E = -1/scale, C = minX, F = maxY;
  return { canvas, world: {A,B,C,D,E,F} };
}

// ===== 設定：プレビュー時の初期ベースレイヤ（'photo' | 'pale' | 'standard'） =====
const DEFAULT_PREVIEW_BASE = 'photo';

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
      affineM: null, tps: null,
      viewImgToCanvas: null, viewMapToCanvas: null,
      objUrl: null,
      history: [], histIndex: -1, isRestoring:false, closedOnce:false,

      // マスク
      maskMode:false,
      maskQuadNat:[],
      maskVertsLngLat:[],

      // MapLibre
      map:null,
      gcpSrcId:'gcp-src', gcpCircleId:'gcp-circle', gcpLabelId:'gcp-label',
      gcpFC:{ type:'FeatureCollection', features:[] },

      // マスクGeoJSON
      maskSrcId:'mask-src', maskPointLayerId:'mask-point', maskPolyLayerId:'mask-poly', maskOutlineLayerId:'mask-outline',
      maskFC:{ type:'FeatureCollection', features:[] },

      imageCoordsLLA:null,

      mlReady: false,
      imgReady: false,

      imageSourceId: 'warp-image-src',
      imageLayerId:  'warp-image-lyr',

      // 固定配置関連
      fixedImageCoordsLLA: null,
      fixedQuadMerc: null,
      fixedHinv: null,
      fixedImgSizeNat: null,

      // プレビュー
      previewMode:false,
      previewSourceId:'warp-preview-src',
      previewLayerId:'warp-preview-lyr',
      previewObjUrl:null,
      previewPrevCam:null, // プレビュー前のカメラ

      // ベースレイヤ（GSI）
      baseAdded:false,
      selectedBase: DEFAULT_PREVIEW_BASE,
      baseSources:{
        pale:     { id:'gsi-pale',     tiles:['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],    minzoom:0, maxzoom:18, tileSize:256 },
        photo:    { id:'gsi-photo',    tiles:['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'], minzoom:2, maxzoom:18, tileSize:256 },
        standard: { id:'gsi-standard', tiles:['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],     minzoom:0, maxzoom:18, tileSize:256 },
      },
      baseLayers:{
        pale:     'base-pale',
        photo:    'base-photo',
        standard: 'base-standard',
      },

      // UI
      showGcpPanel:false, // 起動時は非表示
      gcpClickBound:false,
    };
  },
  computed:{
    isOpen(){ return (this.open===undefined ? this.modelValue : this.open) !== false; },
    pairs(){ return (this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord) && Array.isArray(g.mapCoord)); },
    pairsCount(){ return this.pairs.length; },
    transformKind(){ if(!(this.affineM||this.tps)) return ''; return this.tps?'TPS':(this.pairsCount>=3?'Affine':'Similarity'); },
    imgMeta(){ const img=this.$refs.warpImage; if(!img) return ''; return `${img.naturalWidth}×${img.naturalHeight}`; },
    canUndo(){ return this.histIndex>0; },
    canRedo(){ return this.histIndex>=0 && this.histIndex<this.history.length-1; },
    srs3857(){ return 3857; },
    baseOptions(){
      return [
        { key:'photo',    label:'航空写真' },
        { key:'pale',     label:'淡色地図' },
        { key:'standard', label:'標準地図' },
      ];
    },
  },
  watch:{
    modelValue(v){ if(v===false) this.onExternalClose(); },
    open(v){ if(v===false) this.onExternalClose(); },
    file: {
      immediate:true,
      handler(f){
        if(!f) return;
        if(this.objUrl){ try{ URL.revokeObjectURL(this.objUrl) }catch(e){} this.objUrl=null; }
        this.objUrl=URL.createObjectURL(f); this.imgUrl=this.objUrl;
        this.$nextTick(()=>{
          if(!this.map) this.initMapLibre();
          this.syncCanvasSize(); this.redrawMarkers();
          this.resetHistory(); this.pushHistory('init:file');
          this.upsertImageOnMap();
        });
      }
    },
    url(u){
      if(!u) return;
      this.imgUrl=u;
      this.$nextTick(()=>{
        if(!this.map) this.initMapLibre();
        this.syncCanvasSize(); this.redrawMarkers();
        this.resetHistory(); this.pushHistory('init:url');
        this.upsertImageOnMap();
      });
    },
    gcpList:{
      deep:true,
      handler(){
        if(this.isRestoring) return;
        this.syncGeoJsonMarkersFromGcpList();
        this.pushHistory('gcp');
        this.$nextTick(()=>{ this.redrawMarkers(); this.upsertImageOnMap(); });
      }
    }
  },
  beforeUnmount(){ this.onExternalClose(true); },
  mounted() {
    const h = document.querySelector('#handle-' + this.item?.id);
    if (h) h.innerHTML = `<span style="font-size: large;">${this.item?.label || 'Warp Wizard'}</span>`;
    this.$nextTick(() => { this.initMapLibre(); });
    window.addEventListener('keydown', this.onKeydown);
    window.addEventListener('resize', this.onResize);
    this.$nextTick(() => { this.syncCanvasSize(); this.redrawMarkers(); });
  },
  methods:{
    // ---------- MapLibre ----------
    initMapLibre(){
      if (this.map) return;
      const el = this.$refs.mlMap;
      if (!el) { this.$nextTick(this.initMapLibre); return; }

      // 無背景スタイル（フォントPBFを必ず指定：シンボル描画に必要）
      const blankStyle = {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {},
        layers: []
      };

      this.map = new maplibregl.Map({
        container: el,
        style: blankStyle,
        center: [139.767, 35.681],
        zoom: 12,
        attributionControl: false,     // 表示しない
        dragRotate: false
      });
      // ナビゲーションコントローラは追加しない（右上のズームUIを出さない）

      this.map.on('load', () => {
        this.mlReady = true;

        // GCP（赤丸）
        if (!this.map.getSource(this.gcpSrcId)) {
          this.map.addSource(this.gcpSrcId, { type: 'geojson', data: this.gcpFC });
        }
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
              'text-halo-width': 1.25
            }
          });
        }

        // マスク
        if (!this.map.getSource(this.maskSrcId)) {
          this.map.addSource(this.maskSrcId, { type: 'geojson', data: this.maskFC });
        }
        if (!this.map.getLayer(this.maskPolyLayerId)) {
          this.map.addLayer({
            id: this.maskPolyLayerId,
            type: 'fill',
            source: this.maskSrcId,
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: { 'fill-color': '#2e7d32', 'fill-opacity': 0.18 }
          });
        }
        if (!this.map.getLayer(this.maskOutlineLayerId)) {
          this.map.addLayer({
            id: this.maskOutlineLayerId,
            type: 'line',
            source: this.maskSrcId,
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: { 'line-color': '#2e7d32', 'line-width': 2 }
          });
        }
        if (!this.map.getLayer(this.maskPointLayerId)) {
          this.map.addLayer({
            id: this.maskPointLayerId,
            type: 'circle',
            source: this.maskSrcId,
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
              'circle-radius': 8,
              'circle-color': '#2e7d32',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }
          });
        }
        // 状態反映
        this.syncMaskGeoJsonFromVerts();
        this.syncGeoJsonMarkersFromGcpList();
        this.ensureOverlayOrder();
        this.bindMapClickForMarkers();
        this.upsertImageOnMap();

        // 初期は無背景
        this.hideAllBaseLayers();
      });
    },
    ensureOverlayOrder(){
      if(!this.map) return;
      try{
        if(this.map.getLayer(this.maskPolyLayerId))    this.map.moveLayer(this.maskPolyLayerId);
        if(this.map.getLayer(this.maskOutlineLayerId)) this.map.moveLayer(this.maskOutlineLayerId);
        if(this.map.getLayer(this.maskPointLayerId))   this.map.moveLayer(this.maskPointLayerId);
        if(this.map.getLayer(this.gcpCircleId))        this.map.moveLayer(this.gcpCircleId);
        if(this.map.getLayer(this.gcpLabelId))         this.map.moveLayer(this.gcpLabelId);
        if(this.map.getLayer(this.previewLayerId))     this.map.moveLayer(this.previewLayerId); // 最前面へ
      }catch(e){}
    },

    // GSI ベースレイヤ追加（未追加なら）
    addBaseIfNeeded(){
      if(this.baseAdded || !this.map) return;
      Object.entries(this.baseSources).forEach(([key, cfg])=>{
        if(!this.map.getSource(cfg.id)){
          this.map.addSource(cfg.id, {
            type:'raster',
            tiles: cfg.tiles,
            tileSize: cfg.tileSize,
            minzoom: cfg.minzoom,
            maxzoom: cfg.maxzoom
          });
        }
        const layerId = this.baseLayers[key];
        if(!this.map.getLayer(layerId)){
          this.map.addLayer({
            id: layerId,
            type:'raster',
            source: cfg.id,
            paint: { 'raster-opacity': 1.0, 'raster-resampling':'linear', 'raster-fade-duration': 0 }
          }, this.gcpCircleId);
        }
      });
      this.baseAdded = true;
      this.hideAllBaseLayers();
    },
    hideAllBaseLayers(){
      if(!this.map) return;
      Object.values(this.baseLayers).forEach(id=>{
        if(this.map.getLayer(id)){
          try{ this.map.setLayoutProperty(id,'visibility','none'); }catch(e){}
        }
      });
    },
    showBase(key){
      if(!this.map) return;
      this.addBaseIfNeeded();
      Object.entries(this.baseLayers).forEach(([k, id])=>{
        const vis = (k===key)? 'visible' : 'none';
        if(this.map.getLayer(id)){
          try{ this.map.setLayoutProperty(id,'visibility',vis); }catch(e){}
        }
      });
    },
    selectBase(key){
      this.selectedBase = key;
      if(this.previewMode) this.showBase(key);
    },

    _computeImageQuadLLA(imgW,imgH){
      if(!this.map) return null;
      const center=this.map.getCenter(); const cM=lngLatToMerc([center.lng, center.lat]);
      const b=this.map.getBounds();
      const swM=lngLatToMerc([b.getWest(), b.getSouth()]); const neM=lngLatToMerc([b.getEast(), b.getNorth()]);
      const viewWm=Math.max(1, neM[0]-swM[0]);
      const halfWm=viewWm*0.25; const aspect=imgH/imgW; const halfHm=halfWm*aspect;
      const TLm=[cM[0]-halfWm, cM[1]+halfHm], TRm=[cM[0]+halfWm, cM[1]+halfHm];
      const BRm=[cM[0]+halfWm, cM[1]-halfHm], BLm=[cM[0]-halfWm, cM[1]-halfHm];
      return [TLm,TRm,BRm,BLm].map(mercToLngLat);
    },
    preserveCamera(fn){
      if(!this.map) return fn();
      const c=this.map.getCenter(), z=this.map.getZoom(), b=this.map.getBearing(), p=this.map.getPitch();
      const res=fn();
      this.map.jumpTo({center:[c.lng,c.lat], zoom:z, bearing:b, pitch:p});
      return res;
    },
    getCurrentImageQuadMerc(){
      return (this.fixedQuadMerc && this.fixedQuadMerc.length===4) ? this.fixedQuadMerc : null;
    },
    _pointInQuadMerc(quadXY, P){
      if (!quadXY || quadXY.length !== 4) return false;
      const sign = (a,b,p) => {
        const abx = b[0]-a[0], aby = b[1]-a[1];
        const apx = p[0]-a[0], apy = p[1]-a[1];
        const cross = abx*apy - aby*apx;
        return Math.sign(cross) || 0;
      };
      const s0 = sign(quadXY[0], quadXY[1], P);
      const s1 = sign(quadXY[1], quadXY[2], P);
      const s2 = sign(quadXY[2], quadXY[3], P);
      const s3 = sign(quadXY[3], quadXY[0], P);
      const signs = [s0,s1,s2,s3].filter(s => s !== 0);
      if (signs.length === 0) return true;
      const allPos = signs.every(s => s > 0);
      const allNeg = signs.every(s => s < 0);
      return allPos || allNeg;
    },
    computeImageQuadLngLat(){
      return (this.fixedImageCoordsLLA && this.fixedImageCoordsLLA.length===4)
          ? this.fixedImageCoordsLLA
          : null;
    },

    upsertImageOnMap(){
      if (!this.mlReady || !this.map || !this.imgReady || !this.imgUrl) return;

      if (!this.fixedImageCoordsLLA) {
        const img=this.$refs.warpImage;
        if (!img || !img.naturalWidth) return;
        if (!this.fixedImgSizeNat) this.fixedImgSizeNat = [img.naturalWidth, img.naturalHeight];
        const first = this._computeImageQuadLLA(img.naturalWidth, img.naturalHeight);
        if (!first) return;
        this.fixedImageCoordsLLA = first.slice(0,4);
        this.fixedQuadMerc = this.fixedImageCoordsLLA.map(lngLatToMerc);

        const W=img.naturalWidth, H=img.naturalHeight;
        const cornersImg=[[0,0],[W,0],[W,H],[0,H]];
        const cornersXY=this.fixedQuadMerc;
        const Hmat = this._homographyFrom4(cornersImg, cornersXY);
        this.fixedHinv = this._invertH(Hmat);
      }

      const sid = this.imageSourceId;
      const lid = this.imageLayerId;
      const beforeId = this.map.getLayer(this.gcpCircleId)
          ? this.gcpCircleId
          : (this.map.getLayer(this.gcpLabelId) ? this.gcpLabelId : undefined);

      if (!this.map.getSource(sid)) {
        this.map.addSource(sid, { type: 'image', url: this.imgUrl, coordinates: this.fixedImageCoordsLLA });
        this.map.addLayer({ id: lid, type: 'raster', source: sid, paint: { 'raster-opacity': 1.0, 'raster-resampling':'linear', 'raster-fade-duration': 0 } }, beforeId);
      }else{
        try{ this.map.setLayoutProperty(lid,'visibility','visible'); }catch(e){}
      }
    },

    onImageLoad(){
      this.imgReady = true;
      const img=this.$refs.warpImage;
      if (img && !this.fixedImgSizeNat){
        this.fixedImgSizeNat = [img.naturalWidth, img.naturalHeight];
      }
      this.syncCanvasSize();
      this.redrawMarkers();
      this.upsertImageOnMap();
    },

    // 地図クリック
    bindMapClickForMarkers(){
      if(!this.map || this.gcpClickBound) return;
      this.gcpClickBound = true;
      this.map.on('click', (e)=>{
        if(this.previewMode) return; // プレビュー中は操作不可
        const {lng,lat}=e.lngLat||{}; if(!Number.isFinite(lng)||!Number.isFinite(lat)) return;

        // 画像四隅内チェック
        const quadM = this.getCurrentImageQuadMerc && this.getCurrentImageQuadMerc();
        if (!quadM) return;
        const pM = lngLatToMerc([lng, lat]);
        if (!this._pointInQuadMerc(quadM, pM)) return;

        // マスクモード
        if (this.maskMode) {
          let nextVerts = this.maskVertsLngLat.slice();
          if (nextVerts.length >= 4) nextVerts = [];
          nextVerts.push([lng,lat]);
          this.maskVertsLngLat = nextVerts;

          if (this.fixedHinv) {
            this.maskQuadNat = nextVerts.map(ll => {
              const XY = lngLatToMerc(ll);
              return this._applyH(this.fixedHinv, XY);
            });
          } else {
            this.maskQuadNat = [];
          }
          this.syncMaskGeoJsonFromVerts();
          this.pushHistory('mask:add');
          this.redrawMarkers();
          return;
        }

        // GCP追加
        const next=(this.gcpList||[]).slice();
        const img=this.$refs.warpImage;
        if(!img || !img.naturalWidth || !this.fixedHinv) return;
        const worldXY = lngLatToMerc([lng,lat]);
        const [xNat,yNat] = this._applyH(this.fixedHinv, worldXY);
        const W=img.naturalWidth, H=img.naturalHeight;
        if(!Number.isFinite(xNat)||!Number.isFinite(yNat)) return;
        if(xNat<-10 || yNat<-10 || xNat>W+10 || yNat>H+10) return;

        next.push({ imageCoord:[xNat,yNat], mapCoord: null, redCircleCoord:[lng,lat] });
        this.$emit('update:gcpList', next);
      });
    },

    // 赤丸GeoJSON同期
    syncGeoJsonMarkersFromGcpList(){
      const features=[];
      (this.gcpList||[]).forEach((g,i)=>{
        if(Array.isArray(g.redCircleCoord) && Number.isFinite(g.redCircleCoord[0]) && Number.isFinite(g.redCircleCoord[1])){
          features.push({
            type:'Feature',
            geometry:{ type:'Point', coordinates:[g.redCircleCoord[0], g.redCircleCoord[1]] },
            properties:{ label:String(i+1) }
          });
        }
      });
      this.gcpFC = { type:'FeatureCollection', features };
      const src=this.map?.getSource(this.gcpSrcId);
      if(src && src.setData){ src.setData(this.gcpFC); }
      this.ensureOverlayOrder();
    },
    // マスクGeoJSON同期
    syncMaskGeoJsonFromVerts(){
      const feats=[];
      (this.maskVertsLngLat||[]).forEach((ll)=>feats.push({ type:'Feature', geometry:{ type:'Point', coordinates: ll } }));
      if ((this.maskVertsLngLat||[]).length === 4){
        const ring = [...this.maskVertsLngLat, this.maskVertsLngLat[0]];
        feats.push({ type:'Feature', geometry:{ type:'Polygon', coordinates: [ring] } });
      }
      this.maskFC = { type:'FeatureCollection', features:feats };
      const src=this.map?.getSource(this.maskSrcId);
      if(src && src.setData){ src.setData(this.maskFC); }
      this.ensureOverlayOrder();
    },

    // ---- ホモグラフィ（4点） ----
    _homographyFrom4(src, dst){
      const A=[];
      for(let i=0;i<4;i++){
        const [x,y]=src[i], [X,Y]=dst[i];
        A.push([ x, y, 1, 0, 0, 0, -x*X, -y*X, X ]);
        A.push([ 0, 0, 0, x, y, 1, -x*Y, -y*Y, Y ]);
      }
      const M = A;
      for(let r=0;r<8;r++){
        let p=r, maxv=Math.abs(M[r][r]);
        for(let rr=r+1; rr<8; rr++){ const v=Math.abs(M[rr][r]); if(v>maxv){ maxv=v; p=rr; } }
        if(p!==r){ const tmp=M[r]; M[r]=M[p]; M[p]=tmp; }
        const diag=M[r][r]||1e-12;
        for(let rr=r+1; rr<8; rr++){
          const f=M[rr][r]/diag;
          for(let c=r;c<9;c++){ M[rr][c]-=f*M[r][c]; }
        }
      }
      const h=Array(9).fill(0);
      for(let i=7;i>=0;i--){
        let s=0; for(let c=i+1;c<9;c++) s+=M[i][c]*h[c];
        h[i]=(M[i][8]-s)/(M[i][i]||1e-12);
      }
      h[8]=1;
      return [
        [h[0], h[1], h[2]],
        [h[3], h[4], h[5]],
        [h[6], h[7], 1   ]
      ];
    },
    _invertH(H){
      const a=H[0][0], b=H[0][1], c=H[0][2];
      const d=H[1][0], e=H[1][1], f=H[1][2];
      const g=H[2][0], h=H[2][1];
      const A = e - f*h, B = c*h - b, C = b*f - c*e;
      const D = f*g - d, E = a - c*g, F = c*d - a*f;
      const G = d*h - e*g, Hh= b*g - a*h, I = a*e - b*d;
      const det = a*A + b*D + c*G || 1e-12;
      return [
        [A/det, B/det, C/det],
        [D/det, E/det, F/det],
        [G/det, Hh/det, I/det],
      ];
    },
    _applyH(H, [X,Y]){
      const x = (H[0][0]*X + H[0][1]*Y + H[0][2]) / (H[2][0]*X + H[2][1]*Y + 1);
      const y = (H[1][0]*X + H[1][1]*Y + H[1][2]) / (H[2][0]*X + H[2][1]*Y + 1);
      return [x,y];
    },

    // ---------- 共通 ----------
    onExternalClose(fromUnmount=false){
      try{ if(fromUnmount){ window.removeEventListener('keydown', this.onKeydown); window.removeEventListener('resize', this.onResize); } }catch(e){}
      if(this.objUrl){ try{ URL.revokeObjectURL(this.objUrl) }catch(e){} this.objUrl=null; }
      this.exitPreview(); // プレビュー撤収
      this.clearCanvas(this.$refs.warpCanvas);
      this.clearCanvas(this.$refs.markerCanvas);
      this.$emit('clear-map-markers'); this.viewImgToCanvas=null; this.viewMapToCanvas=null; this.closedOnce=true;
    },
    resetAll(){
      this.exitPreview();
      this.affineM=null; this.tps=null; this.viewImgToCanvas=null; this.viewMapToCanvas=null;
      this.$emit('update:gcpList', []);
      this.maskQuadNat=[]; this.maskVertsLngLat=[]; this.syncMaskGeoJsonFromVerts();
      this.clearCanvas(this.$refs.warpCanvas); this.redrawMarkers();

      if(this.map && this.map.getSource(this.imageSourceId)){
        this.preserveCamera(()=>{
          if(this.map.getLayer(this.imageLayerId)) this.map.removeLayer(this.imageLayerId);
          this.map.removeSource(this.imageSourceId);
        });
      }
      this.imageCoordsLLA=null;
      this.fixedImageCoordsLLA=null;
      this.fixedQuadMerc=null;
      this.fixedHinv=null;
      this.fixedImgSizeNat=null;

      this.upsertImageOnMap();
      this.hideAllBaseLayers();
      this.resetHistory(); this.pushHistory('reset');
    },
    onResize(){
      this.syncCanvasSize();
      if(this.map) this.map.resize();
    },

    // ---- 履歴（Undo/Redo） ----
    snapshot(){
      return {
        gcpList: JSON.parse(JSON.stringify(this.gcpList||[])),
        affineM: this.affineM? [...this.affineM]:null,
        tps: this.tps? { wx:[...this.tps.wx], wy:[...this.tps.wy], srcPts:this.tps.srcPts.map(p=>[...p]) }:null,
        maskQuadNat: this.maskQuadNat.map(p=>[...p]),
        maskVertsLngLat: (this.maskVertsLngLat||[]).map(p=>[...p]),
      };
    },
    resetHistory(){ this.history=[]; this.histIndex=-1; },
    pushHistory(){
      if(this.isRestoring) return;
      const snap=this.snapshot(), cur=this.history[this.histIndex];
      if(cur && JSON.stringify(cur)===JSON.stringify(snap)) return;
      if(this.histIndex<this.history.length-1){ this.history.splice(this.histIndex+1); }
      this.history.push(snap); this.histIndex=this.history.length-1;
      if(this.history.length>100){ this.history.shift(); this.histIndex--; }
    },
    applySnapshot(snap){
      this.isRestoring=true;
      this.affineM=snap.affineM;
      this.tps = snap.tps? { wx:[...snap.tps.wx], wy:[...snap.tps.wy], srcPts:snap.tps.srcPts.map(p=>[...p]) }:null;
      this.maskQuadNat=(snap.maskQuadNat||[]).map(p=>[...p]);
      this.maskVertsLngLat=(snap.maskVertsLngLat||[]).map(p=>[...p]);

      this.$emit('update:gcpList', JSON.parse(JSON.stringify(snap.gcpList)));

      this.$nextTick(()=>{
        this.syncGeoJsonMarkersFromGcpList();
        this.syncMaskGeoJsonFromVerts();
        this.isRestoring=false;
        this.redrawMarkers();
        this.upsertImageOnMap();
      });
    },
    undo(){
      // プレビュー中のUndoは「プレビュー終了のみ」。GCPや履歴は触らない。
      if(this.previewMode){ this.exitPreview(); return; }
      if(!this.canUndo) return;
      this.histIndex--; this.applySnapshot(this.history[this.histIndex]);
    },
    redo(){ if(!this.canRedo) return; this.histIndex++; this.applySnapshot(this.history[this.histIndex]); },
    onKeydown(e){
      const isMac=/Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const mod=isMac?e.metaKey:e.ctrlKey; if(!mod) return;
      if(e.key.toLowerCase()==='z'){ e.preventDefault(); if(e.shiftKey) this.redo(); else this.undo(); }
    },

    // ---- canvas ----
    syncCanvasSize(){
      const img=this.$refs.warpImage; if(!img) return;
      const cw=img.clientWidth||img.naturalWidth, ch=img.clientHeight||img.naturalHeight;
      [this.$refs.warpCanvas, this.$refs.markerCanvas].forEach(c=>{ if(!c) return; c.width=cw; c.height=ch; });
    },
    clearCanvas(c){ if(!c) return; const ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,c.width,c.height); },
    redrawMarkers(){
      // プレビュー中はガイド描画しない
      if(this.previewMode) return;
      const canvas=this.$refs.markerCanvas, img=this.$refs.warpImage;
      if(!canvas||!img) return;
      const ctx=canvas.getContext('2d'), cw=canvas.width, ch=canvas.height;
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cw,ch);

      if((this.affineM||this.tps) && this.viewImgToCanvas && this.viewMapToCanvas){
        const pairs=(this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord) && Array.isArray(g.mapCoord));
        pairs.forEach((g)=>{
          const pImgV=this.viewImgToCanvas(g.imageCoord);
          const pMapV=this.viewMapToCanvas(lngLatToMerc(g.mapCoord));
          ctx.beginPath(); ctx.moveTo(pImgV[0],pImgV[1]); ctx.lineTo(pMapV[0],pMapV[1]); ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
        });
        if(this.maskQuadNat && this.maskQuadNat.length){
          const qV=this.maskQuadNat.map(p=> this.viewImgToCanvas(p));
          ctx.lineWidth=2; ctx.strokeStyle='rgba(56,142,60,0.95)'; ctx.fillStyle='rgba(56,142,60,0.12)';
          ctx.beginPath(); qV.forEach(([x,y],i)=>{ if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); if(qV.length>=3){ ctx.closePath(); ctx.fill(); } ctx.stroke();
        }
      }
    },

    // ---- preview / export / confirm ----
    previewWarp(){
      const img=this.$refs.warpImage, canvas=this.$refs.warpCanvas; if(!img||!canvas) return;
      const pairs=(this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord) && Array.isArray(g.mapCoord));
      if(pairs.length<2){ this.affineM=null; this.tps=null; this.viewImgToCanvas=null; this.viewMapToCanvas=null; this.clearCanvas(canvas); this.redrawMarkers(); return; }
      const srcNat=pairs.map(g=>g.imageCoord), srcUp=srcNat.map(([x,y])=>[x,-y]); const dstUp=pairs.map(g=>lngLatToMerc(g.mapCoord));
      const clipNat=(this.maskQuadNat && this.maskQuadNat.length>=3)? this.maskQuadNat : null;
      if(pairs.length===2){
        const Mup=fitSimilarity2P(srcUp, dstUp);
        const FLIP=[1,0,0, 0,-1,0]; const M=composeAffine(Mup, FLIP); this.tps=null; this.affineM=M; previewOnCanvas(this,img,canvas,M,clipNat); return;
      }
      if(pairs.length===3){
        const Mup=fitAffineRobust(srcUp,dstUp,4); const FLIP=[1,0,0, 0,-1,0]; const M=composeAffine(Mup, FLIP);
        this.tps=null; this.affineM=M; previewOnCanvas(this,img,canvas,M,clipNat); return;
      }
      const tps=fitTPS(srcUp,dstUp); this.affineM=null; this.tps=tps; previewTPSOnCanvas(this,img,canvas,tps,28,clipNat);
    },

    // プレビュー：MapLibre上に貼り、ベースを表示・カメラを瞬間移動
    previewOnMap(){
      if(!(this.affineM || this.tps)) this.previewWarp();
      if(!(this.affineM || this.tps) || !this.map) return;

      // 先にベースを準備＆表示（この順序が重要）
      this.addBaseIfNeeded();
      this.showBase(this.selectedBase);

      // 元画像レイヤは隠す
      if(this.map.getLayer(this.imageLayerId)){
        try{ this.map.setLayoutProperty(this.imageLayerId,'visibility','none'); }catch(e){}
      }
      // 既存プレビュー撤収
      this._removePreviewLayerAndSource();

      const beforeId = (this.gcpCircleId && this.map.getLayer(this.gcpCircleId)) ? this.gcpCircleId : undefined;

      let coordsLngLat = null; // [TL,TR,BR,BL]
      if(this.affineM && !this.tps){
        const img = this.$refs.warpImage;
        const W = img.naturalWidth, H = img.naturalHeight;
        const cornersXY = [[0,0],[W,0],[W,H],[0,H]].map(p=>applyAffine(this.affineM, p)); // 3857
        coordsLngLat = cornersXY.map(mercToLngLat);
        this.map.addSource(this.previewSourceId, { type:'image', url:this.imgUrl, coordinates:coordsLngLat });
        this.map.addLayer({ id:this.previewLayerId, type:'raster', source:this.previewSourceId, paint:{'raster-opacity':1, 'raster-resampling':'linear', 'raster-fade-duration':0} }, beforeId);

        // 追加直後に最前面へ（ベースの上に確実に出す）
        this.ensureOverlayOrder();
        this._enterPreviewFinalize(coordsLngLat);

      }else{
        const img = this.$refs.warpImage;
        const clipNat=(this.maskQuadNat && this.maskQuadNat.length>=3)? this.maskQuadNat : null;
        const {canvas, world} = exportTPSWithWorld(img, this.tps, clipNat, 32);
        const outW = canvas.width, outH = canvas.height;

        canvas.toBlob((blob)=>{
          if(!blob) return;
          if(this.previewObjUrl){ try{ URL.revokeObjectURL(this.previewObjUrl) }catch(e){} }
          this.previewObjUrl = URL.createObjectURL(blob);

          const C = world.C, F = world.F, A = world.A, E = world.E; // E<0
          const TL = [C, F];
          const TR = [C + A*outW, F];
          const BR = [C + A*outW, F + E*outH];
          const BL = [C, F + E*outH];
          coordsLngLat = [TL,TR,BR,BL].map(mercToLngLat);

          try{
            this.map.addSource(this.previewSourceId, { type:'image', url:this.previewObjUrl, coordinates:coordsLngLat });
            this.map.addLayer({ id:this.previewLayerId, type:'raster', source:this.previewSourceId, paint:{'raster-opacity':1, 'raster-resampling':'linear', 'raster-fade-duration':0} }, beforeId);

            // 追加直後に最前面へ
            this.ensureOverlayOrder();
            this._enterPreviewFinalize(coordsLngLat);
          }catch(e){
            try{ URL.revokeObjectURL(this.previewObjUrl) }catch(_){} this.previewObjUrl=null;
          }
        }, 'image/png');

        // TPSは非同期blob完了後に_finalizeするので、ここでreturn
        return;
      }
    },
    _enterPreviewFinalize(coordsLngLat){
      // GCPを隠す
      this._setGcpVisible(false);

      // プレビューON
      this.previewMode = true;

      // カメラ保存 & 変換後範囲へ瞬時に移動
      if(this.map){
        this.previewPrevCam = {
          center: this.map.getCenter(),
          zoom:   this.map.getZoom(),
          bearing:this.map.getBearing(),
          pitch:  this.map.getPitch()
        };
        try{
          const bounds = new maplibregl.LngLatBounds();
          coordsLngLat.forEach(ll=> bounds.extend(ll));
          this.map.fitBounds(bounds, { padding: 16, linear: true, duration: 0 }); // 最速で飛ぶ
        }catch(e){}
      }
    },
    _removePreviewLayerAndSource(){
      if(!this.map) return;
      this.preserveCamera(()=>{
        if(this.map.getLayer(this.previewLayerId))  try{ this.map.removeLayer(this.previewLayerId) }catch(e){}
        if(this.map.getSource(this.previewSourceId)) try{ this.map.removeSource(this.previewSourceId) }catch(e){}
      });
      if(this.previewObjUrl){ try{ URL.revokeObjectURL(this.previewObjUrl) }catch(e){} this.previewObjUrl=null; }
    },
    _setGcpVisible(show){
      if(!this.map) return;
      const vis = show ? 'visible' : 'none';
      [this.gcpCircleId, this.gcpLabelId].forEach(id=>{
        if(this.map.getLayer(id)){
          try{ this.map.setLayoutProperty(id,'visibility',vis); }catch(e){}
        }
      });
    },
    // プレビュー解除：ベースOFF・元画像再表示・カメラを元に戻す
    exitPreview(){
      if(!this.map) { this.previewMode=false; return; }
      this._removePreviewLayerAndSource();

      // 画像レイヤ再表示
      if(this.map.getLayer(this.imageLayerId)){
        try{ this.map.setLayoutProperty(this.imageLayerId,'visibility','visible'); }catch(e){}
      }
      // ベース非表示
      this.hideAllBaseLayers();
      // GCP再表示
      this._setGcpVisible(true);

      // カメラをプレビュー前に戻す（瞬時）
      if(this.previewPrevCam){
        try{
          this.map.jumpTo({
            center: [this.previewPrevCam.center.lng, this.previewPrevCam.center.lat],
            zoom: this.previewPrevCam.zoom,
            bearing: this.previewPrevCam.bearing,
            pitch: this.previewPrevCam.pitch
          });
        }catch(e){}
        this.previewPrevCam = null;
      }

      this.previewMode=false;
    },
    // プレビューボタンのトグル
    togglePreview(){
      if(this.previewMode){ this.exitPreview(); return; }
      this.previewOnMap();
    },

    buildWorldAffine(){
      const img=this.$refs.warpImage; if(!img) return null;
      const pairs=(this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord) && Array.isArray(g.mapCoord));
      if(pairs.length<2) return null;
      const srcNat=pairs.map(g=>g.imageCoord), srcUp=srcNat.map(([x,y])=>[x,-y]), dstUp=pairs.map(g=>lngLatToMerc(g.mapCoord));
      let Mup = (pairs.length===2)? fitSimilarity2P(srcUp,dstUp) : fitAffineRobust(srcUp,dstUp,4);
      const FLIP=[1,0,0, 0,-1,0]; let M=composeAffine(Mup, FLIP);
      let [A,B,C,D,E,F]=M; const scaleX=Math.hypot(A,D), scaleY=Math.hypot(B,E); const W=img.naturalWidth, H=img.naturalHeight;
      const worldW=scaleX*W, worldH=scaleY*H; const TOO_BIG=6e7, TOO_FINE=1e-3, TOO_COARSE=1e4;
      const bad=!isFinite(worldW)||!isFinite(worldH)||worldW>TOO_BIG||worldH>TOO_BIG||scaleX<TOO_FINE||scaleY<TOO_FINE||scaleX>TOO_COARSE||scaleY>TOO_COARSE;
      if(bad && pairs.length>=2){
        let i1=0,i2=1,maxd=-1; for(let a=0;a<srcUp.length;a++){ for(let b=a+1;b<srcUp.length;b++){ const d=Math.hypot(srcUp[b][0]-srcUp[a][0], srcUp[b][1]-srcUp[a][1]); if(d>maxd){maxd=d;i1=a;i2=b;} } }
        M=composeAffine(fitSimilarity2P([srcUp[i1],srcUp[i2]],[dstUp[i1],dstUp[i2]]), FLIP);
      }
      return M;
    },

    confirm(){
      if(!(this.affineM||this.tps)) return;
      const img=this.$refs.warpImage;
      const clipNat=(this.maskQuadNat&&this.maskQuadNat.length>=3)? this.maskQuadNat: null;

      let payload={ file:this.$props.file||null, srs:this.srs3857 }, cornersLngLat=null;

      if(this.tps){
        const W=img.naturalWidth,H=img.naturalHeight, cornersImg=[[0,0],[W,0],[W,H],[0,H]];
        const cornersWorld=cornersImg.map(p=>applyTPS(this.tps,[p[0],-p[1]]));
        cornersLngLat=cornersWorld.map(mercToLngLat);

        const {canvas, world} = exportTPSWithWorld(img, this.tps, clipNat, 32);
        if(!canvas) return;

        const worldFileText = `${world.A}\n${world.D}\n${world.B}\n${world.E}\n${world.C}\n${world.F}`;

        canvas.toBlob((blob)=>{
          const baseName=(this.$props.file && this.$props.file.name)? this.$props.file.name.replace(/\.[^.]+$/,''):'image';
          const warpedPng = blob ? new File([blob], `${baseName}-tps.png`, {type:'image/png'}) : null;

          this.$emit('confirm',{
            ...payload,
            kind:'tps',
            fileOriginal: warpedPng,
            worldFile: worldFileText,
            cornersLngLat,
            tps: this.tps,
          });
        }, 'image/png');
        return;
      }

      if(this.affineM){
        const kind=(this.pairsCount>=3?'affine':'similarity');
        const wld=worldFileFromAffine(this.affineM);
        if(clipNat){
          const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight; const cx=c.getContext('2d');
          cx.save(); cx.beginPath(); clipNat.forEach(([x,y],i)=>{ if(i===0) cx.moveTo(x,y); else cx.lineTo(x,y); }); cx.closePath(); cx.clip(); cx.drawImage(img,0,0); cx.restore();
          const baseName=(this.$props.file && this.$props.file.name)? this.$props.file.name.replace(/\.[^.]+$/,''):'image';
          c.toBlob((blob)=>{ const maskedPngFile=blob? new File([blob], `${baseName}.png`, {type:'image/png'}):null;
            this.$emit('confirm',{ ...payload, kind, affineM:this.affineM, worldFile:wld, fileOriginal:maskedPngFile });
          }, 'image/png');
          return;
        }
        this.$emit('confirm',{ ...payload, kind, affineM:this.affineM, worldFile:wld, fileOriginal:this.$props.file||null });
      }
    },

    // ---- GCP エディタ ----
    removeGcp(idx){
      const next=(this.gcpList||[]).slice();
      next.splice(idx,1);
      this.$emit('update:gcpList', next);
      this.$nextTick(this.redrawMarkers);
    },
    getImgX(g){ const img=this.$refs.warpImage; if(Array.isArray(g?.imageCoord)) return Math.round(g.imageCoord[0]); if(Array.isArray(g?.imageCoordCss)&&img) return Math.round(imageCssToNatural(g.imageCoordCss,img)[0]); return g?._editImgX ?? ''; },
    getImgY(g){ const img=this.$refs.warpImage; if(Array.isArray(g?.imageCoord)) return Math.round(g.imageCoord[1]); if(Array.isArray(g?.imageCoordCss)&&img) return Math.round(imageCssToNatural(g.imageCoordCss,img)[1]); return g?._editImgY ?? ''; },
    setImgX(index,v){
      const img=this.$refs.warpImage; const x=Number(v); const next=(this.gcpList||[]).slice(); const g={ ...(next[index]||{}) };
      const y=Array.isArray(g.imageCoord)? Number(g.imageCoord[1]) : (Array.isArray(g.imageCoordCss)&&img? imageCssToNatural(g.imageCoordCss,img)[1] : NaN);
      if(Number.isFinite(x)&&Number.isFinite(y)){ g.imageCoord=[x,y]; if(img) g.imageCoordCss=naturalToCss(g.imageCoord,img); delete g._editImgX; delete g._editImgY; } else { g._editImgX=v; }
      next[index]=g; this.$emit('update:gcpList', next); this.$nextTick(this.redrawMarkers);
    },
    setImgY(index,v){
      const img=this.$refs.warpImage; const y=Number(v); const next=(this.gcpList||[]).slice(); const g={ ...(next[index]||{}) };
      const x=Array.isArray(g.imageCoord)? Number(g.imageCoord[0]) : (Array.isArray(g.imageCoordCss)&&img? imageCssToNatural(g.imageCoordCss,img)[0] : NaN);
      if(Number.isFinite(x)&&Number.isFinite(y)){ g.imageCoord=[x,y]; if(img) g.imageCoordCss=naturalToCss(g.imageCoord,img); delete g._editImgX; delete g._editImgY; } else { g._editImgY=v; }
      next[index]=g; this.$emit('update:gcpList', next); this.$nextTick(this.redrawMarkers);
    },
    getLng(g){ if(Array.isArray(g?.mapCoord)) return Number(g.mapCoord[0]); return g?._editLng ?? ''; },
    getLat(g){ if(Array.isArray(g?.mapCoord)) return Number(g.mapCoord[1]); return g?._editLat ?? ''; },
    setLng(index,v){
      const next=(this.gcpList||[]).slice(); const g={ ...(next[index]||{}) }; const lng=Number(v);
      const lat=(g._editLat!==undefined)? Number(g._editLat): (Array.isArray(g.mapCoord)? Number(g.mapCoord[1]) : NaN);
      g._editLng=v; if(Number.isFinite(lng)&&Number.isFinite(lat)){ g.mapCoord=[lng,lat]; delete g._editLng; delete g._editLat; }
      next[index]=g; this.$emit('update:gcpList', next);
    },
    setLat(index,v){
      const next=(this.gcpList||[]).slice(); const g={ ...(next[index]||{}) }; const lat=Number(v);
      const lng=(g._editLng!==undefined)? Number(g._editLng): (Array.isArray(g.mapCoord)? Number(g.mapCoord[0]) : NaN);
      g._editLat=v; if(Number.isFinite(lng)&&Number.isFinite(lat)){ g.mapCoord=[lng,lat]; delete g._editLng; delete g._editLat; }
      next[index]=g; this.$emit('update:gcpList', next);
    },

    clearMask(){
      this.maskQuadNat=[]; this.maskVertsLngLat=[];
      this.syncMaskGeoJsonFromVerts();
      this.redrawMarkers();
      this.pushHistory('mask:clear');
    },
    onHelpClick(){
      alert('作成中。しばらくお待ちください。')
    },
    toggleGcpPanel(){ this.showGcpPanel = !this.showGcpPanel; },
  }
};
</script>

<style scoped>
.oh-warp-root{ width:100%; max-width:none; box-sizing:border-box; background:#fff; overflow:hidden; display:flex; flex-direction:column; height:100%; min-height:0; }
.oh-toolbar{ display:flex; align-items:center; justify-content:space-between; padding:6px 8px; background:linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0)); border-bottom:1px solid rgba(0,0,0,0.08); min-height:40px; }
.oh-toolbar .v-btn.v-btn--icon{ width:32px; height:32px; }
.oh-toolbar .v-btn.is-active{ background:rgba(0,0,0,0.06); }
.oh-toolbar .mx-1{ margin:0 6px !important; }
.oh-title{ font-weight:600; display:flex; align-items:center; gap:8px; }
.oh-tools.compact{ display:flex; align-items:center; gap:2px; flex-wrap:nowrap; overflow:hidden; }

.oh-body{ flex:1 1 auto; min-height:0; display:grid; grid-template-columns:1fr auto; gap:10px; padding:10px; }
.oh-body.stacked{ grid-template-columns:1fr; grid-template-rows:auto 1fr; }
.oh-body.stacked .left-pane{ order:1; }
.oh-body.stacked .right-pane{ order:2; }

.left-pane{ display:flex; align-items:center; justify-content:center; min-height:420px; background:rgba(0,0,0,0.03); border:1px dashed rgba(0,0,0,0.2); border-radius:10px; }
.ml-wrap{ position:relative; width:100%; height:100%; min-height:420px; }
.ml-map{ position:relative; z-index:10 !important; width:100%; height:100%; border-radius:8px; overflow:hidden; }

/* プレビュー時のベース選択UI（小さめ） */
.base-ui{
  position:absolute; top:8px; left:8px; z-index:50;
  display:flex; gap:6px; background:rgba(255,255,255,0.9);
  padding:4px 6px; border-radius:8px; box-shadow:0 1px 6px rgba(0,0,0,0.12);
}
.base-ui .chip{
  font-size:12px; line-height:1; padding:6px 8px; border-radius:999px; border:1px solid rgba(0,0,0,0.15);
  background:#fff; cursor:pointer;
}
.base-ui .chip.active{ background:#111; color:#fff; border-color:#111; }

/* キャンバスは背面・ヒット無効（GeoJSON赤丸は地図側） */
.ml-overlay{ position:absolute; inset:0; z-index:0 !important; pointer-events:none !important; opacity:0; }

#warp-image.hidden{ visibility:hidden; }
.warp-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius:8px; z-index:1; }
.marker-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius:8px; z-index:3; }

.right-pane{ padding:4px 0; display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.empty-on-map{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#6b7280; font-weight:600; pointer-events:none; z-index:20; }

.gcp-editor{ padding:0; margin-bottom:8px; background:rgba(0,0,0,0.03); border:1px dashed rgba(0,0,0,0.2); border-radius:10px; }
.gcp-row{ display:grid; grid-template-columns:auto auto auto auto; align-items:center; gap:4px; padding:0; height:38px; }
.gcp-row.header{ font-size:11px; color:#6b7280; font-weight:600; letter-spacing:.02em; text-transform:uppercase; padding:0 0 4px; }
.gcp-row:not(.header):not(:last-child){ border-bottom:1px solid rgba(0,0,0,0.05); }
.gcp-row .img, .gcp-row .map{ display:grid; grid-template-columns:auto auto; gap:6px; }
.gcp-row .idx{ margin-left:10px; text-align:center; }
.gcp-scroll{ flex:1 1 auto; min-height:0; overflow:auto; margin-top:4px; }
.img-x, .img-y{ margin-left:10px; width:70px; }

:deep(.gcp-editor .v-input--density-compact){ --v-input-control-height:24px; }
:deep(.gcp-editor .v-field__input){ min-height:22px; padding:0 3px; }
:deep(.gcp-editor .v-field--variant-plain .v-field__overlay){ background:transparent; }
:deep(.gcp-editor .v-field__outline){ display:none; }
</style>
