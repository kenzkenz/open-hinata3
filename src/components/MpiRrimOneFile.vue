<template>
  <div class="rrim-control">
    <v-btn size="small" @click="toggle" class="mr-2">赤色立体</v-btn>
    <v-slider v-model="opacity" min="0" max="1" step="0.05" density="compact" style="width:160px" :disabled="!enabled" label="不透明度" />
    <!-- 地図コンテナの上に重ねるキャンバス -->
    <canvas v-show="enabled" ref="canvas" class="rrim-canvas" />
  </div>
</template>

<script>
export default {
  name: 'MpiRrimOneFile', // Options API（Vue3 + Vuetify3）
  props: {
    map: { type: Object, required: true },
    startEnabled: { type: Boolean, default: true },
    tileUrlTemplate: {
      type: String,
      default: 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
    }
  },
  data(){
    return {
      enabled: this.startEnabled,
      opacity: 0.9,
      worker: null,
      pending: false,
      queued: false,
      lastHash: '',
      debTimer: null,
      dpr: Math.max(1, Math.min(2.5, window.devicePixelRatio || 1)),
      params: {
        slopeMaxDeg: 35,
        opennessRadii: [25, 100],
        opennessWeight: [0.6, 0.4],
        gammaS: 0.9,
        contrast: 1.15
      }
    };
  },
  mounted(){
    this.setupCanvas();
    this.worker = this.buildInlineWorker();
    this.worker.onmessage = (ev) => {
      const { ok, error, bitmap, width, height } = ev.data || {};
      this.pending = false;
      if (!ok) { console.error('[RRIM] worker error', error); return; }
      const cvs = this.$refs.canvas; if (!cvs) return;
      // 物理解像度(DPR考慮)で受け取っている
      cvs.width = width; cvs.height = height;
      const cssW = cvs.parentElement?.clientWidth || width/this.dpr;
      const cssH = cvs.parentElement?.clientHeight || height/this.dpr;
      Object.assign(cvs.style, { width: cssW + 'px', height: cssH + 'px' });
      const ctx = cvs.getContext('2d');
      ctx.clearRect(0,0,width,height);
      ctx.globalAlpha = this.opacity;
      ctx.drawImage(bitmap, 0, 0);
      if (this.queued) { this.queued = false; this.requestRender(); }
    };

    this.map.on('moveend', this.debouncedRender);
    this.map.on('zoomend', this.debouncedRender);
    this.map.on('resize', this.debouncedRender);
    window.addEventListener('resize', this.debouncedRender);
    if (this.enabled) this.requestRender();
  },
  beforeUnmount(){
    this.map.off('moveend', this.debouncedRender);
    this.map.off('zoomend', this.debouncedRender);
    this.map.off('resize', this.debouncedRender);
    window.removeEventListener('resize', this.debouncedRender);
    if (this.worker) this.worker.terminate();
  },
  watch: {
    enabled(v){ if (v) this.requestRender(); },
    opacity(){ this.redrawOpacityOnly(); },
    params: { deep: true, handler(){ this.requestRender(); } }
  },
  methods: {
    toggle(){ this.enabled = !this.enabled; },
    setupCanvas(){
      const mapContainer = this.map.getContainer();
      const cvs = this.$refs.canvas; if (!cvs) return;
      Object.assign(cvs.style, {
        position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none'
      });
      mapContainer.appendChild(cvs);
    },
    debouncedRender(){
      clearTimeout(this.debTimer);
      this.debTimer = setTimeout(() => this.requestRender(), 120);
    },
    redrawOpacityOnly(){
      // 直近のビットマップを保持していないので再レンダ要求
      if (this.enabled) this.requestRender();
    },
    requestRender(){
      if (!this.enabled || !this.worker) return;
      const map = this.map;
      const container = map.getContainer();
      const cssW = container.clientWidth;
      const cssH = container.clientHeight;
      if (!cssW || !cssH) return;
      const W = Math.round(cssW * this.dpr);
      const H = Math.round(cssH * this.dpr);

      // 画面の bbox（EPSG:3857）
      const b = map.getBounds();
      const proj = (lng, lat) => {
        const x = lng * 20037508.34 / 180.0;
        let y = Math.log(Math.tan((90+lat)*Math.PI/360.0)) / (Math.PI/180.0);
        y = y * 20037508.34 / 180.0; return [x, y];
      };
      const [minX, minY] = proj(b.getWest(), b.getSouth());
      const [maxX, maxY] = proj(b.getEast(), b.getNorth());
      const bbox3857 = [minX, minY, maxX, maxY];

      // ★ VueのProxyを含めないように、必ずプレーンな値に“脱プロキシ”してからpostMessage
      const plainParams = {
        slopeMaxDeg: Number(this.params.slopeMaxDeg),
        opennessRadii: Array.isArray(this.params.opennessRadii) ? [...this.params.opennessRadii] : [],
        opennessWeight: Array.isArray(this.params.opennessWeight) ? [...this.params.opennessWeight] : [],
        gammaS: Number(this.params.gammaS),
        contrast: Number(this.params.contrast)
      };

      const payload = {
        type: 'render',
        width: W, height: H,
        zoom: Number(map.getZoom()),
        bbox3857: [...bbox3857],
        tileUrlTemplate: String(this.tileUrlTemplate),
        ...plainParams
      };

      const hash = JSON.stringify([W,H, payload.zoom.toFixed(2), ...bbox3857.map(n=>n.toFixed(2)), this.opacity]);
      if (this.pending) { this.queued = true; return; }
      if (this.lastHash === hash) return;
      this.lastHash = hash;
      this.pending = true;

      // さらに保険としてstructuredClone/JSONでプレーン化
      const cleanPayload = (typeof structuredClone === 'function')
          ? structuredClone(payload)
          : JSON.parse(JSON.stringify(payload));

      this.worker.postMessage(cleanPayload);
    },

    // === ここがキモ：ワーカーをソース文字列から内製 ===
    buildInlineWorker(){
      const src = `
"use strict";
// ---- dem_png 復元 ----
function rgbToHeight(r,g,b){ if(r===128&&g===0&&b===0) return NaN; return (r*65536+g*256+b)*0.01 - 10000.0; }
async function decodeDemPngToHeightsFromBlob(blob){ const bmp = await createImageBitmap(blob); const w=bmp.width,h=bmp.height; const off=new OffscreenCanvas(w,h); const ctx=off.getContext('2d'); ctx.drawImage(bmp,0,0); const img=ctx.getImageData(0,0,w,h); const data=img.data; const heights=new Float32Array(w*h); for(let i=0,p=0;i<data.length;i+=4,p++){ heights[p]=rgbToHeight(data[i],data[i+1],data[i+2]); } return {w,h,heights}; }

// ---- 主要処理 ----
self.onmessage = async (ev)=>{ const d=ev.data||{}; if(d.type!=="render") return; try{ const r = await renderRRIM(d); self.postMessage({ok:true,...r}, [r.bitmap]); }catch(err){ self.postMessage({ok:false,error:String(err&&err.stack||err)}); } };

async function renderRRIM({width,height,zoom,bbox3857,tileUrlTemplate,slopeMaxDeg,opennessRadii,opennessWeight,gammaS,contrast}){ const z = Math.max(0, Math.floor(zoom)); const range = tilesForBBOX3857(bbox3857,z); const mosaic = await buildMosaic(range,z,tileUrlTemplate); const rgba = await rrimComposite(mosaic,width,height,bbox3857,z,opennessRadii,opennessWeight,slopeMaxDeg,gammaS,contrast); const off=new OffscreenCanvas(width,height); const ctx=off.getContext('2d'); const imgData = new ImageData(rgba,width,height); ctx.putImageData(imgData,0,0); const bitmap = await createImageBitmap(off); return {bitmap,width,height}; }

function tilesForBBOX3857([minX,minY,maxX,maxY],z){ const tileCount=1<<z; const world=20037508.342789244*2; const mpt=world/tileCount; const x0=Math.floor((minX+world/2)/mpt); const y0=Math.floor((world/2-maxY)/mpt); const x1=Math.floor((maxX+world/2)/mpt); const y1=Math.floor((world/2-minY)/mpt); function clamp(min,max,a,b){ const s=Math.min(a,b),e=Math.max(a,b); return {start:Math.max(min,s), end:Math.min(max,e)}; } return { xs:clamp(0,tileCount-1,x0,x1), ys:clamp(0,tileCount-1,y0,y1) }; }

async function buildMosaic(range,z,template){ const tileSize=256; const wTiles=range.xs.end-range.xs.start+1; const hTiles=range.ys.end-range.ys.start+1; const W=wTiles*tileSize, H=hTiles*tileSize; const heights=new Float32Array(W*H); const tasks=[]; for(let ty=range.ys.start; ty<=range.ys.end; ty++){ for(let tx=range.xs.start; tx<=range.xs.end; tx++){ const url=template.replace('{z}',z).replace('{x}',tx).replace('{y}',ty); tasks.push(fetch(url).then(r=>{ if(!r.ok) throw new Error('fetch '+r.status); return r.blob(); }).then(decodeDemPngToHeightsFromBlob).then(({w,h,heights:tileH})=>({w,h,tileH,tx,ty}))); } } const tiles=await Promise.all(tasks); for(const {w,h,tileH,tx,ty} of tiles){ const ox=(tx-range.xs.start)*tileSize; const oy=(ty-range.ys.start)*tileSize; for(let y=0;y<h;y++){ const dst=(oy+y)*W+ox; heights.set(tileH.subarray(y*w,y*w+w), dst); } } return {W,H,heights,originTileX:range.xs.start,originTileY:range.ys.start,z}; }

async function rrimComposite(mosaic,outW,outH,bbox3857,z,radiiM,weights,slopeMaxDeg,gammaS,contrast){ const {W,H,heights}=mosaic; const [minX,minY,maxX,maxY]=bbox3857; const world=20037508.342789244*2; const tileCount=1<<z; const mpt=world/tileCount; const pxM = mpt/256.0; function screenToMosaic(x,y){ const mx=minX+(maxX-minX)*(x/outW); const my=maxY-(maxY-minY)*(y/outH); const tx=(mx+world/2)/mpt; const ty=(world/2-my)/mpt; const px=(tx-Math.floor(tx))*256 + (Math.floor(tx)-mosaic.originTileX)*256; const py=(ty-Math.floor(ty))*256 + (Math.floor(ty)-mosaic.originTileY)*256; return [px,py]; } const rgba=new Uint8ClampedArray(outW*outH*4); function hSample(px,py){ const x=Math.max(0,Math.min(W-1,px)); const y=Math.max(0,Math.min(H-1,py)); const x0=Math.floor(x), y0=Math.floor(y); const x1=Math.min(W-1,x0+1), y1=Math.min(H-1,y0+1); const sx=x-x0, sy=y-y0; const h00=heights[y0*W+x0]; const h10=heights[y0*W+x1]; const h01=heights[y1*W+x0]; const h11=heights[y1*W+x1]; const h0=h00*(1-sx)+h10*sx; const h1=h01*(1-sx)+h11*sx; return h0*(1-sy)+h1*sy; } const dp=1.0; const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; for(let y=0;y<outH;y++){ for(let x=0;x<outW;x++){ const idx=(y*outW+x)*4; const [px,py]=screenToMosaic(x,y); const h0=hSample(px,py); if(!Number.isFinite(h0)){ rgba[idx+3]=0; continue; } const hx1=hSample(px+dp,py), hx0=hSample(px-dp,py); const hy1=hSample(px,py+dp), hy0=hSample(px,py-dp); const dzdx=(hx1-hx0)/(2*pxM); const dzdy=(hy1-hy0)/(2*pxM); const slopeDeg=Math.atan(Math.hypot(dzdx,dzdy))*180/Math.PI; let Sat=Math.min(1, Math.max(0, slopeDeg / slopeMaxDeg)); Sat=Math.pow(Sat, gammaS); let pos=0,neg=0; for(let k=0;k<radiiM.length;k++){ const rM=radiiM[k]; const steps=Math.max(4, Math.round((rM/pxM)/dp)); let pos1=0,neg1=0; for(const v of dirs){ const dx=v[0], dy=v[1]; let maxTan=-Infinity, minTan=Infinity; for(let s=1;s<=steps;s++){ const sx=px+dx*s*dp, sy=py+dy*s*dp; const h=hSample(sx,sy); if(!Number.isFinite(h)) continue; const distM=Math.hypot(dx*s*dp*pxM, dy*s*dp*pxM); const t=(h-h0)/distM; if(t>maxTan) maxTan=t; if(t<minTan) minTan=t; } const posDir=Math.max(0, (Math.PI/2 - Math.atan(Math.max(0,maxTan))) / (Math.PI/2)); const negDir=Math.max(0, (Math.atan(Math.max(0,-minTan))) / (Math.PI/2)); pos1+=posDir; neg1+=negDir; } pos1/=dirs.length; neg1/=dirs.length; pos+=weights[k]*pos1; neg+=weights[k]*neg1; } let RV=pos-neg; RV=Math.max(-1,Math.min(1,RV)); let L=0.5 + (RV*0.5); L=((L-0.5)*contrast)+0.5; L=Math.max(0,Math.min(1,L)); const H=0, S=Sat, V=L; const rgb=hsvToRgb(H,S,V); rgba[idx]=rgb[0]; rgba[idx+1]=rgb[1]; rgba[idx+2]=rgb[2]; rgba[idx+3]=255; } } return rgba; }

function hsvToRgb(h,s,v){ const C=v*s; const X=C*(1-Math.abs(((h/60)%2)-1)); const m=v-C; let r=0,g=0,b=0; const hp=(h/60)%6; if(0<=hp&&hp<1){ r=C; g=X; b=0; } else if(1<=hp&&hp<2){ r=X; g=C; b=0; } else if(2<=hp&&hp<3){ r=0; g=C; b=X; } else if(3<=hp&&hp<4){ r=0; g=X; b=C; } else if(4<=hp&&hp<5){ r=X; g=0; b=C; } else { r=C; g=0; b=X; } return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)]; }
`;
      const blob = new Blob([src], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      return new Worker(url);
    }
  }
};
</script>

<style scoped>
.rrim-control { display: flex; align-items: center; gap: 8px; }
.rrim-canvas { image-rendering: auto; }
</style>