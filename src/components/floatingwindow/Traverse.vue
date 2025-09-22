<template>
  <!-- 最小UI（Vuetify想定）。親から v-model:open で開閉制御可 -->
  <div v-show="isOpen" class="oh-surveyor-root">
    <div class="oh-toolbar">
      <div class="left">
        <v-btn size="small" icon variant="text" @click="centerToA" :title="'既知点Aへ移動'">
          <v-icon>mdi-crosshairs-gps</v-icon>
        </v-btn>
        <v-btn size="small" icon variant="text" @click="centerToB" :title="'既知点Bへ移動'">
          <v-icon>mdi-crosshairs</v-icon>
        </v-btn>
        <v-divider vertical class="mx-2"></v-divider>
        <v-btn size="small" icon variant="text" @click="addLeg" :title="'区間を追加'">
          <v-icon>mdi-vector-line</v-icon>
        </v-btn>
        <v-btn size="small" icon variant="text" @click="undoLeg" :disabled="legs.length===0" :title="'一手戻す'">
          <v-icon>mdi-undo</v-icon>
        </v-btn>
        <v-btn size="small" icon variant="text" @click="clearAll" :title="'全消去'">
          <v-icon>mdi-trash-can-outline</v-icon>
        </v-btn>
      </div>
      <div class="right">
        <v-btn size="small" variant="tonal" @click="exportCsv" :disabled="computedChain.length===0">CSV出力</v-btn>
        <v-btn size="small" variant="text" @click="importCsvClick">CSV取込</v-btn>
        <input ref="fileInput" type="file" accept=".csv,text/csv" class="hidden" @change="onCsvPicked" />
      </div>
    </div>

    <!-- 既知点入力 -->
    <v-card class="pa-3 mb-2" elevation="1">
      <div class="d-flex flex-wrap gap-3">
        <div class="mr-6">
          <div class="text-caption mb-1">既知点A（基点）</div>
          <div class="d-flex align-center gap-1">
            <v-text-field v-model.number="A.lng" label="経度" type="number" density="compact" hide-details style="max-width:160px" />
            <v-text-field v-model.number="A.lat" label="緯度" type="number" density="compact" hide-details style="max-width:160px" />
            <v-btn size="x-small" variant="text" @click="useMapCenterAs('A')">Map中心</v-btn>
          </div>
        </div>
        <div>
          <div class="text-caption mb-1">既知点B（終点）</div>
          <div class="d-flex align-center gap-1">
            <v-text-field v-model.number="B.lng" label="経度" type="number" density="compact" hide-details style="max-width:160px" />
            <v-text-field v-model.number="B.lat" label="緯度" type="number" density="compact" hide-details style="max-width:160px" />
            <v-btn size="x-small" variant="text" @click="useMapCenterAs('B')">Map中心</v-btn>
          </div>
        </div>
      </div>
    </v-card>

    <!-- 区間入力テーブル（方位角=真北0°→時計回り、距離[m]） -->
    <v-card class="pa-3 mb-2" elevation="1">
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-subtitle-2">観測区間（方位角・距離）</div>
        <v-switch class="oh-switch-compact" v-model="useBowditch" inset density="compact" hide-details label="ボーディッチ補正"></v-switch>
      </div>

      <v-table density="compact" class="oh-tight-table">
        <thead>
        <tr>
          <th style="width:30px">#</th>
          <th style="width:150px">方位角[°]</th>
          <th style="width:150px">距離[m]</th>
          <th>備考</th>
          <th style="width:60px"></th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(leg, i) in legs" :key="i">
          <td class="text-center">{{ i+1 }}</td>
          <td>
            <v-text-field v-model.number="leg.bearing" type="number" density="compact" hide-details :min="0" :max="360" class="oh-compact-field" />
          </td>
          <td>
            <v-text-field v-model.number="leg.distance" type="number" density="compact" hide-details :min="0" class="oh-compact-field" />
          </td>
          <td>
            <v-text-field v-model="leg.note" density="compact" hide-details class="oh-compact-field" />
          </td>
          <td>
            <v-btn size="x-small" icon variant="text" @click="removeLeg(i)"><v-icon>mdi-close</v-icon></v-btn>
          </td>
        </tr>
        </tbody>
      </v-table>

      <div class="d-flex mt-2">
        <v-text-field v-model.number="newLeg.bearing" label="方位角[°]" type="number" density="compact" hide-details style="max-width:140px" />
        <v-text-field v-model.number="newLeg.distance" label="距離[m]" type="number" density="compact" hide-details style="max-width:140px" class="ml-2" />
        <v-text-field v-model="newLeg.note" label="備考" density="compact" hide-details class="ml-2" />
        <v-btn class="ml-2" size="small" @click="pushNewLeg">追加</v-btn>
      </div>
    </v-card>

    <!-- 結果サマリ -->
    <v-card class="pa-3" elevation="1">
      <div class="text-subtitle-2 mb-2">計算結果</div>
      <div v-if="computedChain.length===0" class="text-caption">区間を入力してください。</div>
      <div v-else>
        <div class="d-flex flex-wrap gap-6 mb-2">
          <div>
            <div class="text-caption">計算終点（未補正）</div>
            <div class="mono">{{ fmtLngLat(calcEndRaw) }}</div>
          </div>
          <div>
            <div class="text-caption">閉合差（未補正→既知B）</div>
            <div class="mono">ΔE={{ closure.dx.toFixed(3) }} m, ΔN={{ closure.dy.toFixed(3) }} m, |f|={{ closure.len.toFixed(3) }} m</div>
          </div>
          <div>
            <div class="text-caption">補正方式</div>
            <div class="mono">{{ useBowditch ? 'Bowditch (距離配分)' : '補正なし' }}</div>
          </div>
        </div>
        <v-btn size="small" variant="tonal" @click="flyToChain" :disabled="computedChain.length===0">軌跡へ移動</v-btn>
      </div>
    </v-card>
  </div>
</template>

<script>
// OH3前提: this.$store.state.map01（MapLibreインスタンス）を利用
// 計算は簡易Webメルカトル[m]座標へ変換して実施→WGS84へ戻す

const R = 6378137; // WebMercator半径
function deg2rad(d){ return d * Math.PI/180 }
function rad2deg(r){ return r * 180/Math.PI }
function lngLatToMeters(lng, lat){
  const x = R * deg2rad(lng);
  const y = R * Math.log(Math.tan(Math.PI/4 + deg2rad(lat)/2));
  return {x,y};
}
function metersToLngLat(x, y){
  const lng = rad2deg(x / R);
  const lat = rad2deg(2 * Math.atan(Math.exp(y / R)) - Math.PI/2);
  return {lng, lat};
}
function normalizeBearing(b){
  let a = Number(b)||0; a = ((a%360)+360)%360; return a;
}

export default {
  name: 'SurveyorTraverse',
  props: { isOpen: { type: Boolean, default: true } },
  data(){
    return {
      A: {lng: 139.7671, lat: 35.6812}, // デフォルト: 東京駅
      B: {lng: 139.7671, lat: 35.6822},
      legs: [],
      newLeg: { bearing: 0, distance: 0, note: '' },
      useBowditch: true,
      layerIds: {
        src: 'oh-surveyor-traverse-src',
        line: 'oh-surveyor-traverse-line',
        pts: 'oh-surveyor-traverse-pts',
        lbl: 'oh-surveyor-traverse-lbl'
      }
    }
  },
  computed:{
    computedChain(){
      // 区間列から座標列を生成（未補正）
      if(!this.A || this.legs.length===0) return [];
      const pts = [];
      let cur = lngLatToMeters(this.A.lng, this.A.lat);
      pts.push({ idx: 0, ...metersToLngLat(cur.x, cur.y) });
      for(let i=0;i<this.legs.length;i++){
        const b = normalizeBearing(this.legs[i].bearing);
        const d = Number(this.legs[i].distance)||0;
        const theta = deg2rad(b);
        // 北0→時計回り: ENUで dx= d*sin, dy= d*cos
        cur = { x: cur.x + d*Math.sin(theta), y: cur.y + d*Math.cos(theta) };
        const ll = metersToLngLat(cur.x, cur.y);
        pts.push({ idx: i+1, ...ll });
      }
      return pts;
    },
    calcEndRaw(){
      if(this.computedChain.length===0) return null;
      return this.computedChain[this.computedChain.length-1];
    },
    closure(){
      if(!this.calcEndRaw) return {dx:0,dy:0,len:0};
      const endXY = lngLatToMeters(this.calcEndRaw.lng, this.calcEndRaw.lat);
      const Bxy = lngLatToMeters(this.B.lng, this.B.lat);
      const dx = Bxy.x - endXY.x;
      const dy = Bxy.y - endXY.y;
      const len = Math.hypot(dx,dy);
      return {dx,dy,len};
    },
    adjustedChain(){
      // Bowditch: 各辺の距離比で Δx,Δy を按分
      if(!this.useBowditch || this.legs.length===0) return this.computedChain;
      const total = this.legs.reduce((s,l)=>s+(Number(l.distance)||0),0);
      if(total<=0) return this.computedChain;
      const adjPts = [];
      let cur = lngLatToMeters(this.A.lng, this.A.lat);
      adjPts.push({ idx:0, ...metersToLngLat(cur.x, cur.y) });
      let accDist = 0;
      for(let i=0;i<this.legs.length;i++){
        const leg = this.legs[i];
        const b = normalizeBearing(leg.bearing);
        const d = Number(leg.distance)||0;
        accDist += d;
        const theta = deg2rad(b);
        // 先に進める
        let nx = cur.x + d*Math.sin(theta);
        let ny = cur.y + d*Math.cos(theta);
        // 補正量（累積距離比）
        const rx = this.closure.dx * (accDist/total);
        const ry = this.closure.dy * (accDist/total);
        nx += rx; ny += ry;
        cur = {x:nx, y:ny};
        const ll = metersToLngLat(nx, ny);
        adjPts.push({ idx:i+1, ...ll});
      }
      return adjPts;
    }
  },
  watch:{
    // 再描画
    computedChain(){ this.redrawOnMap(); },
    useBowditch(){ this.redrawOnMap(); },
    A: { deep:true, handler(){ this.redrawOnMap(); }},
    B: { deep:true, handler(){ this.redrawOnMap(); }}
  },
  mounted(){ this.ensureMapLayers(); this.redrawOnMap(); },
  beforeUnmount(){ this.teardownMapLayers(); },
  methods:{
    fmtLngLat(ll){ if(!ll) return '-'; return `${ll.lng.toFixed(7)}, ${ll.lat.toFixed(7)}` },
    addLeg(){ this.legs.push({ bearing: 0, distance: 0, note:'' }); },
    pushNewLeg(){ if(this.newLeg.distance>0){ this.legs.push({...this.newLeg}); this.newLeg={bearing:0,distance:0,note:''}; } },
    removeLeg(i){ this.legs.splice(i,1); },
    undoLeg(){ if(this.legs.length>0) this.legs.pop(); },
    clearAll(){ this.legs=[]; this.redrawOnMap(); },

    useMapCenterAs(which){
      const map = this.$store?.state?.map01; if(!map) return;
      const c = map.getCenter();
      if(which==='A') { this.A = {lng:c.lng, lat:c.lat}; }
      else if(which==='B'){ this.B = {lng:c.lng, lat:c.lat}; }
    },
    centerToA(){ const map=this.$store?.state?.map01; if(!map) return; map.flyTo({center:this.A, zoom:18}); },
    centerToB(){ const map=this.$store?.state?.map01; if(!map) return; map.flyTo({center:this.B, zoom:18}); },
    flyToChain(){
      const map=this.$store?.state?.map01; if(!map||this.adjustedChain.length===0) return;
      const coords = this.adjustedChain.map(p=>[p.lng,p.lat]);
      const bbox = coords.reduce((b,[lng,lat])=>{
        if(!b) return [[lng,lat],[lng,lat]];
        b[0][0]=Math.min(b[0][0],lng); b[0][1]=Math.min(b[0][1],lat);
        b[1][0]=Math.max(b[1][0],lng); b[1][1]=Math.max(b[1][1],lat);
        return b; }, null);
      if(bbox){ map.fitBounds(bbox, {padding:40, duration:800}); }
    },

    ensureMapLayers(){
      const map=this.$store?.state?.map01; if(!map) return;
      const {src,line,pts,lbl} = this.layerIds;
      if(!map.getSource(src)){
        map.addSource(src, { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
      }
      if(!map.getLayer(line)){
        map.addLayer({ id:line, type:'line', source:src, filter:['==',['geometry-type'],'LineString'],
          paint:{ 'line-color':'#1976d2','line-width':3,'line-opacity':0.9 } });
      }
      if(!map.getLayer(pts)){
        map.addLayer({ id:pts, type:'circle', source:src, filter:['==',['geometry-type'],'Point'],
          paint:{ 'circle-radius':5, 'circle-color':'#ff9800','circle-stroke-color':'#fff','circle-stroke-width':1.5 } });
      }
      if(!map.getLayer(lbl)){
        map.addLayer({ id:lbl, type:'symbol', source:src, filter:['==',['geometry-type'],'Point'],
          layout:{ 'text-field':['get','name'], 'text-size':12, 'text-offset':[0,1.2], 'text-anchor':'top' },
          paint:{ 'text-halo-width':1.2, 'text-halo-color':'#ffffff' } });
      }
    },
    teardownMapLayers(){
      const map=this.$store?.state?.map01; if(!map) return;
      const {src,line,pts,lbl} = this.layerIds;
      [lbl,pts,line].forEach(id=>{ if(map.getLayer(id)) map.removeLayer(id); });
      if(map.getSource(src)) map.removeSource(src);
    },
    buildGeoJSON(){
      const fc = { type:'FeatureCollection', features:[] };
      if(this.adjustedChain.length>0){
        // 折れ線
        fc.features.push({ type:'Feature', geometry:{ type:'LineString', coordinates: this.adjustedChain.map(p=>[p.lng,p.lat]) }, properties:{ kind:'chain' } });
        // 点
        this.adjustedChain.forEach((p,i)=>{
          fc.features.push({ type:'Feature', geometry:{ type:'Point', coordinates:[p.lng,p.lat] }, properties:{ name: i===0?'A':(i===this.adjustedChain.length-1?'B':`${i}`) } })
        });
      }
      // A/B参照点
      if(this.A) fc.features.push({ type:'Feature', geometry:{ type:'Point', coordinates:[this.A.lng,this.A.lat]}, properties:{name:'A(既知)'} });
      if(this.B) fc.features.push({ type:'Feature', geometry:{ type:'Point', coordinates:[this.B.lng,this.B.lat]}, properties:{name:'B(既知)'} });
      return fc;
    },
    redrawOnMap(){
      const map=this.$store?.state?.map01; if(!map) return;
      this.ensureMapLayers();
      const src = map.getSource(this.layerIds.src);
      if(src) src.setData(this.buildGeoJSON());
    },

    // --- CSV I/O ---
    exportCsv(){
      const rows = [];
      rows.push(['type','idx','lng','lat','bearing_deg','distance_m','note']);
      // 既知点
      rows.push(['known','A',this.A.lng,this.A.lat,'','', '']);
      rows.push(['known','B',this.B.lng,this.B.lat,'','', '']);
      // 区間
      this.legs.forEach((l,i)=>{
        rows.push(['leg', i+1, '', '', l.bearing, l.distance, l.note||'' ]);
      });
      const csv = rows.map(r=>r.join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'traverse.csv'; a.click(); URL.revokeObjectURL(a.href);
    },
    importCsvClick(){ this.$refs.fileInput?.click(); },
    async onCsvPicked(e){
      const f = e.target.files?.[0]; if(!f) return;
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines.shift();
      const legs = []; let A=null, B=null;
      for(const line of lines){
        const [type, idx, lng, lat, bearing, dist, note] = line.split(',');
        if(type==='known' && idx==='A'){ A={lng:Number(lng), lat:Number(lat)} }
        else if(type==='known' && idx==='B'){ B={lng:Number(lng), lat:Number(lat)} }
        else if(type==='leg'){
          legs.push({ bearing: Number(bearing)||0, distance: Number(dist)||0, note: note||'' });
        }
      }
      if(A) this.A=A; if(B) this.B=B; this.legs = legs; this.redrawOnMap();
      e.target.value='';
    }
  }
}
</script>

<style scoped>
.oh-surveyor-root{ width: 520px; max-width: 95vw; background:#fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.2); }
.oh-toolbar{ display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-bottom:1px solid #eee; }
.hidden{ display:none; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.gap-1{ gap:4px; } .gap-3{ gap:12px; } .gap-6{ gap:24px; }
.oh-tight-table :deep(th), .oh-tight-table :deep(td){ padding:2px 6px; }
.oh-compact-field{ margin:0 !important; }
.oh-compact-field :deep(.v-field){ --v-field-padding-start:6px; --v-field-padding-end:6px; }
.oh-compact-field :deep(.v-field__input){ padding-top:0; padding-bottom:0; min-height:40px; }
.oh-switch-compact :deep(.v-selection-control){ padding:0 4px; min-height:24px; }
.oh-switch-compact :deep(.v-switch__track){ height:20px; width:32px; transition: background-color .15s ease; }
.oh-switch-compact :deep(.v-switch__thumb){ height:20px; width:20px; transition: background-color .15s ease, border-color .15s ease; }
.oh-switch-compact :deep(.v-label){ font-size:12px; line-height:1.1; }
.oh-tight-table td {
  padding: 4px 4px!important;
}
</style>
