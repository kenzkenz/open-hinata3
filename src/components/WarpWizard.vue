<template>
  <!-- フローティングウインドウ内にそのまま置く版（v-dialog不使用） -->
  <div class="oh-warp-root">
    <div class="oh-toolbar">
      <div class="oh-title">
        <span class="oh-icon">🪄</span>
        Warp Wizard
      </div>
      <div class="oh-tools">
        <v-btn icon variant="text" :disabled="!canUndo" @click="undo" :title="'元に戻す (Ctrl/Cmd+Z)'"><v-icon>mdi-undo</v-icon></v-btn>
        <v-btn icon variant="text" :disabled="!canRedo" @click="redo" :title="'やり直す (Shift+Ctrl/Cmd+Z)'"><v-icon>mdi-redo</v-icon></v-btn>
        <v-divider vertical class="mx-1"/>
        <v-btn icon variant="text" :class="{ 'is-active': grid }" @click="toggleGrid" :title="'グリッド'"><v-icon>mdi-grid</v-icon></v-btn>
        <v-btn icon variant="text" @click="resetAll" :title="'全消去'"><v-icon>mdi-backspace</v-icon></v-btn>
        <v-divider vertical class="mx-1"/>
        <v-chip size="small" class="mr-1" label>GCP {{ pairsCount }}</v-chip>
        <v-chip v-if="transformKind" :color="transformKindColor" size="small" class="mr-1" label>{{ transformKind }}</v-chip>
        <v-chip v-if="imgMeta" size="small" class="mr-1" label>{{ imgMeta }}</v-chip>
        <v-btn icon variant="text" @click="onClose" :title="'閉じる'"><v-icon>mdi-close</v-icon></v-btn>
      </div>
    </div>

    <div class="oh-body">
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
        <div class="pane-title">対応点（GCP）</div>
        <div class="gcp-help">画像をクリック→地図をクリック（フローティングなので地図側もそのまま操作できます）</div>
        <v-table density="compact" class="gcp-table">
          <thead>
          <tr><th>#</th><th>Image (px)</th><th>Map (lng,lat)</th><th></th></tr>
          </thead>
          <tbody>
          <tr v-for="(g,i) in gcpList" :key="i">
            <td>{{ i+1 }}</td>
            <td class="mono">{{ fmtPx(g.imageCoord || g.imageCoordCss) }}</td>
            <td class="mono">{{ fmtLL(g.mapCoord) }}</td>
            <td>
              <v-btn icon size="x-small" variant="text" @click="removeGcp(i)"><v-icon>mdi-delete</v-icon></v-btn>
            </td>
          </tr>
          </tbody>
        </v-table>

        <div class="actions">
          <v-btn variant="text" :disabled="pairsCount<2" @click="previewAffineWarp"><v-icon class="mr-1">mdi-eye</v-icon>プレビュー</v-btn>
          <v-btn variant="text" :disabled="!affineM" @click="downloadWorldFile"><v-icon class="mr-1">mdi-content-save-outline</v-icon>WorldFile</v-btn>
          <v-btn color="primary" :disabled="!affineM" @click="confirm"><v-icon class="mr-1">mdi-cloud-upload</v-icon>アップロード</v-btn>
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
function previewOnCanvas(img, canvas, M){
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth, h = img.naturalHeight;
  const corners = [[0,0],[w,0],[w,h],[0,h]].map(p=>applyAffine(M,p));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const cw = Math.max(1, img.clientWidth  || img.naturalWidth);
  const ch = Math.max(1, img.clientHeight || img.naturalHeight);
  canvas.width  = cw; canvas.height = ch;
  const W = Math.max(1, maxX - minX); const H = Math.max(1, maxY - minY);
  const s = Math.min(cw / W, ch / H);
  const T = [ s, 0, -minX * s, 0, -s,  maxY * s ];
  const Mv = composeAffine(T, M); const [A,B,C,D,E,F] = Mv;
  const ctx2 = ctx; ctx2.setTransform(A,D,B,E,C,F);
  ctx2.clearRect(0,0,canvas.width,canvas.height);
  ctx2.imageSmoothingEnabled = true; ctx2.imageSmoothingQuality = 'high';
  ctx2.drawImage(img, 0, 0);
}
function worldFileFromAffine([A,B,C,D,E,F]){ return `${A}\n${D}\n${B}\n${E}\n${C}\n${F}`; }

export default {
  name: 'WarpWizard',
  props: {
    mapName: { type:String, default:'map01' },
    item:    { type:Object, default: () => ({ id:'warp', label:'Warp Wizard' }) },
    gcpList: { type:Array,  default: () => [] }, // v-model 用（親と共有）
    file:    { type:[File,Blob], default:null }, // 親から渡されると表示
    url:     { type:String, default:'' },        // URLでも表示
  },
  emits: ['update:gcpList','confirm','close'],
  data(){
    return {
      imgUrl: null,
      affineM: null,
      grid: true,
      objUrl: null,
      // undo/redo
      history: [],
      histIndex: -1,
      isRestoring: false,
    }
  },
  watch: {
    file: {
      immediate: true,
      handler(f){
        if(!f) return;
        if(this.objUrl) { URL.revokeObjectURL(this.objUrl); this.objUrl=null }
        this.objUrl = URL.createObjectURL(f);
        this.imgUrl = this.objUrl;
        this.$nextTick(() => { this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); this.resetHistory(); this.pushHistory('init:file') })
      }
    },
    url(u){ if(!u) return; this.imgUrl=u; this.$nextTick(()=>{ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); this.resetHistory(); this.pushHistory('init:url') }) },
    // GCP 追加で即プレビュー＋履歴
    gcpList: { deep:true, handler(){ if(!this.isRestoring) this.pushHistory('gcp'); if(this.pairsCount>=2) this.previewAffineWarp(); this.$nextTick(this.redrawMarkers) } }
  },
  beforeUnmount(){ if(this.objUrl) URL.revokeObjectURL(this.objUrl); window.removeEventListener('keydown', this.onKeydown); window.removeEventListener('resize', this.onResize) },
  mounted(){
    const h = document.querySelector('#handle-'+this.item?.id)
    if(h) h.innerHTML = `<span style="font-size: large;">${this.item?.label || 'Warp Wizard'}</span>`
    window.addEventListener('keydown', this.onKeydown)
    window.addEventListener('resize', this.onResize)
    this.$nextTick(()=>{ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers() })
  },
  computed: {
    pairs(){ return (this.gcpList||[]).filter(g=>Array.isArray(g.imageCoord||g.imageCoordCss) && Array.isArray(g.mapCoord)) },
    pairsCount(){ return this.pairs.length },
    transformKind(){ if(!this.affineM) return ''; return this.pairsCount>=3 ? 'Affine' : 'Similarity' },
    transformKindColor(){ return this.pairsCount>=3 ? 'deep-purple' : 'teal' },
    imgMeta(){ const img=this.$refs.warpImage; if(!img) return ''; return `${img.naturalWidth}×${img.naturalHeight}` },
    hideBaseImage(){ return !!this.affineM }, // ★ プレビュー成立で原画像は不可視
    canUndo(){ return this.histIndex > 0 },
    canRedo(){ return this.histIndex >= 0 && this.history && this.histIndex < this.history.length - 1 },
  },
  methods: {
    // 表表示用フォーマッタ
    fmtPx(p){ if(!Array.isArray(p) || p.length<2) return '-'; const x=Number(p[0]), y=Number(p[1]); if(!Number.isFinite(x)||!Number.isFinite(y)) return '-'; return `${Math.round(x)}, ${Math.round(y)}` },
    fmtLL(ll){ if(!Array.isArray(ll) || ll.length<2) return '-'; const lng=Number(ll[0]), lat=Number(ll[1]); if(!Number.isFinite(lng)||!Number.isFinite(lat)) return '-'; return `${lng.toFixed(6)}, ${lat.toFixed(6)}` },

    onClose(){ this.$emit('close') },
    toggleGrid(){ this.grid=!this.grid; this.$nextTick(this.drawGrid) },
    resetAll(){ this.affineM=null; this.$emit('update:gcpList', []); this.pushHistory('reset'); this.clearCanvas(this.$refs.warpCanvas); this.redrawMarkers() },
    onResize(){ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); if(this.affineM) this.previewAffineWarp() },
    onImageLoad(){ this.syncCanvasSize(); this.drawGrid(); this.redrawMarkers(); if(this.pairsCount>=2) this.previewAffineWarp() },

    // ===== Undo/Redo =====
    snapshot(){ return { gcpList: JSON.parse(JSON.stringify(this.gcpList||[])), affineM: this.affineM ? [...this.affineM] : null } },
    resetHistory(){ this.history=[]; this.histIndex=-1 },
    pushHistory(){ if(this.isRestoring) return; const snap=this.snapshot(); const cur=this.history[this.histIndex]; if(cur && JSON.stringify(cur)===JSON.stringify(snap)) return; if(this.histIndex < this.history.length-1){ this.history.splice(this.histIndex+1) } this.history.push(snap); this.histIndex=this.history.length-1; if(this.history.length>50){ this.history.shift(); this.histIndex-- } },
    applySnapshot(snap){ this.isRestoring=true; this.affineM=snap.affineM; this.$emit('update:gcpList', JSON.parse(JSON.stringify(snap.gcpList))); this.$nextTick(()=>{ this.isRestoring=false; if(this.affineM) this.previewAffineWarp(); else this.clearCanvas(this.$refs.warpCanvas); this.redrawMarkers() }) },
    undo(){ if(!this.canUndo) return; this.histIndex--; this.applySnapshot(this.history[this.histIndex]) },
    redo(){ if(!this.canRedo) return; this.histIndex++; this.applySnapshot(this.history[this.histIndex]) },
    onKeydown(e){ const isMac=/Mac|iPod|iPhone|iPad/.test(navigator.platform); const mod=isMac?e.metaKey:e.ctrlKey; if(!mod) return; if(e.key.toLowerCase()==='z'){ e.preventDefault(); if(e.shiftKey) this.redo(); else this.undo(); } },

    // ===== Canvas helpers =====
    syncCanvasSize(){ const img=this.$refs.warpImage; if(!img) return; const cw=img.clientWidth||img.naturalWidth; const ch=img.clientHeight||img.naturalHeight; const cvs=[this.$refs.warpCanvas,this.$refs.gridCanvas,this.$refs.markerCanvas]; cvs.forEach(c=>{ if(!c) return; c.width=cw; c.height=ch; }) },
    clearCanvas(c){ if(!c) return; const ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,c.width,c.height) },
    drawGrid(){ if(!this.grid) return; const img=this.$refs.warpImage; const canvas=this.$refs.gridCanvas; if(!img||!canvas) return; const cw=img.clientWidth||img.naturalWidth; const ch=img.clientHeight||img.naturalHeight; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,cw,ch); ctx.globalAlpha=.35; ctx.lineWidth=1; ctx.strokeStyle='rgba(0,0,0,0.6)'; const step=Math.max(32, Math.round(cw/20)); for(let x=0;x<cw;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke() } for(let y=0;y<ch;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke() } ctx.globalAlpha=1 },
    redrawMarkers(){ const canvas=this.$refs.markerCanvas; const img=this.$refs.warpImage; if(!canvas||!img) return; const ctx=canvas.getContext('2d'); const cw=canvas.width, ch=canvas.height; ctx.clearRect(0,0,cw,ch); const pts=(this.gcpList||[]).map((g,i)=>{ if(Array.isArray(g.imageCoordCss)) return {i,xy:g.imageCoordCss}; if(Array.isArray(g.imageCoord)) return {i,xy:naturalToCss(g.imageCoord, img)}; return null }).filter(Boolean); const r=12; pts.forEach(p=>{ const [x,y]=p.xy; // 赤丸（白縁）
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle='#e53935'; ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle='#ffffff'; ctx.stroke(); // 番号（白）
      ctx.font='700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#ffffff'; ctx.fillText(String(p.i+1), x, y); }) },

    // ===== GCP 操作 =====
    onImageAreaClick(e){ const img=this.$refs.warpImage; if(!img) return; const rect=img.getBoundingClientRect(); const xCss=e.clientX-rect.left; const yCss=e.clientY-rect.top; const [xNat,yNat]=imageCssToNatural([xCss,yCss], img); const next=(this.gcpList||[]).slice(); next.push({ imageCoordCss:[xCss,yCss], imageCoord:[xNat,yNat], mapCoord:null }); this.$emit('update:gcpList', next); this.pushHistory('img-click'); this.$nextTick(this.redrawMarkers) },
    removeGcp(i){ const next=(this.gcpList||[]).slice(); next.splice(i,1); this.$emit('update:gcpList', next); this.pushHistory('remove'); this.$nextTick(this.redrawMarkers) },

    // ===== プレビュー / 出力 =====
    previewAffineWarp(){ const img=this.$refs.warpImage; const canvas=this.$refs.warpCanvas; if(!img||!canvas) return; const pairs=(this.gcpList||[]).filter(g=>(Array.isArray(g.imageCoord)||Array.isArray(g.imageCoordCss)) && Array.isArray(g.mapCoord)); if(pairs.length<2){ this.affineM=null; this.clearCanvas(canvas); return } const srcNat=pairs.map(g=> imageCssToNatural(g.imageCoordCss||g.imageCoord, img)); const srcUp=srcNat.map(([x,y])=>[x,-y]); const dstUp=pairs.map(g=> lngLatToMerc(g.mapCoord)); let Mup; if(pairs.length===2){ Mup=fitSimilarity2P(srcUp,dstUp) } else { Mup=fitAffineRobust(srcUp,dstUp,3) } const FLIP_Y=[1,0,0,0,-1,0]; const M=composeAffine(Mup,FLIP_Y); this.affineM=M; previewOnCanvas(img, canvas, M) },
    downloadWorldFile(){ if(!this.affineM) return; const txt=worldFileFromAffine(this.affineM); const blob=new Blob([txt],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='image.pgw'; a.click(); URL.revokeObjectURL(a.href) },
    // confirm(){ if(!this.affineM) return; const f=this.$props.file||null; this.$emit('confirm',{ file:f, affineM:this.affineM }) },
    confirm(){
      if(!this.affineM) return;
      const f = this.$props.file || null;
      const canvas = this.$refs.warpCanvas;
      if (!canvas || !canvas.toBlob) {
        this.$emit('confirm', { file:f, affineM:this.affineM, blob:null });
        return;
      }
      canvas.toBlob((blob)=>{
        this.$emit('confirm', { file:f, affineM:this.affineM, blob });
      }, 'image/png');
    }
  }
}
</script>

<style scoped>
.oh-warp-root{ width: 860px; max-width: calc(100vw - 40px); box-sizing: border-box; background: #fff; border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,.12); overflow: hidden; }
.oh-toolbar{ display:flex; align-items:center; justify-content:space-between; padding: 8px 10px; background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0)); border-bottom: 1px solid rgba(0,0,0,0.08); }
.oh-toolbar .v-btn.is-active{ background: rgba(0,0,0,0.06) }
.oh-title{ font-weight:600; display:flex; align-items:center; gap:8px; }
.oh-icon{ font-size: 16px; }
.oh-tools{ display:flex; align-items:center; gap:4px; }
.oh-body{ display:grid; grid-template-columns: 1fr 380px; gap:10px; padding:10px; }
.left-pane{ display:flex; align-items:center; justify-content:center; min-height: 300px; background: rgba(0,0,0,0.03); border: 1px dashed rgba(0,0,0,0.2); border-radius: 10px; }
.img-wrap{ position: relative; display:inline-block; max-width:100%; cursor: crosshair; }
#warp-image{ position:relative; z-index:0; display:block; max-width:100%; height:auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
#warp-image.hidden{ visibility:hidden; }
.warp-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:1; }
.grid-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; opacity:.45; z-index:2; }
.marker-canvas{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; border-radius: 8px; z-index:3; }
.right-pane{ padding:4px 0; }
.pane-title{ font-weight:600; margin-bottom:4px; }
.gcp-help{ font-size:12px; color:#666; margin-bottom:8px; }
.gcp-table{ font-variant-numeric: tabular-nums; background:#fff; border-radius:8px; overflow:hidden; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.actions{ display:flex; justify-content:flex-end; gap:6px; margin-top:10px; }
</style>