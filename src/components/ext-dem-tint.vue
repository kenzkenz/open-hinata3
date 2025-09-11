<template>
  <div :style="menuContentSize">
    <!-- OH3標準 -->
    <div style="font-size: 14px; margin:6px 0 6px;">OH3標準</div>
    <div class="d-flex flex-wrap" style="gap:8px; margin-bottom:10px;">
      <MiniTooltip text="範囲：-20〜+20m（自然系）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='coast' ? 'primary' : undefined" size="large" @click="usePreset('coast')">
          沿岸
        </v-chip>
      </MiniTooltip>
      <MiniTooltip text="範囲：0〜120m（自然系）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='lowland' ? 'primary' : undefined" size="large" @click="usePreset('lowland')">
          低地
        </v-chip>
      </MiniTooltip>
      <MiniTooltip text="範囲：0〜3000m（自然系）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='mountain' ? 'primary' : undefined" size="large" @click="usePreset('mountain')">
          山地（標準）
        </v-chip>
      </MiniTooltip>
    </div>

    <!-- 地理院風 -->
    <div style="font-size: 14px; margin:6px 0 6px;">地理院風</div>
    <div class="d-flex flex-wrap" style="gap:8px; margin-bottom:12px;">
      <MiniTooltip text="範囲：-20〜+20m（GSI配色）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='gsi_coast' ? 'primary' : undefined" size="large" @click="usePreset('gsi_coast')">
          沿岸
        </v-chip>
      </MiniTooltip>
      <MiniTooltip text="範囲：0〜120m（GSI配色）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='gsi_lowland' ? 'primary' : undefined" size="large" @click="usePreset('gsi_lowland')">
          低地
        </v-chip>
      </MiniTooltip>
      <MiniTooltip text="範囲：0〜3000m（GSI配色）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='gsi_mountain' ? 'primary' : undefined" size="large" @click="usePreset('gsi_mountain')">
          山地（標準）
        </v-chip>
      </MiniTooltip>
    </div>

    <!-- 局所（用途特化） -->
    <div style="font-size: 14px; margin:6px 0 6px;">局所</div>
    <div class="d-flex flex-wrap" style="gap:8px; margin-bottom:12px;">
      <MiniTooltip text="高地火山域（800m+：溶岩〜焼土の暖色で強調／山頂は灰雪）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='local_volcano' ? 'primary' : undefined" size="large" @click="usePreset('local_volcano')">
          火山
        </v-chip>
      </MiniTooltip>

      <MiniTooltip text="範囲：0〜10m（低地を青系で微妙に段彩）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='local_flood10' ? 'primary' : undefined" size="large" @click="usePreset('local_flood10')">
          洪水低地
        </v-chip>
      </MiniTooltip>

      <!-- 扇状地（有効化したいときはコメント解除）
      <MiniTooltip text="範囲：10〜80m（扇状地・段丘面）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='local_fan_terrace' ? 'primary' : undefined" size="large" @click="usePreset('local_fan_terrace')">
          扇状地・段丘（10–80m）
        </v-chip>
      </MiniTooltip>
      -->
    </div>

    <!-- 上級者向け：カスタム分割（普段は隠す） -->
    <div class="d-flex align-center" style="gap:10px; margin:6px 0;">
      <v-btn variant="tonal" size="small" @click="showAdvanced = !showAdvanced">
        {{ showAdvanced ? '上級者設定を隠す' : '上級者設定を表示' }}
      </v-btn>
      <div v-if="customSummary" style="font-size:12px;color:#666;">{{ customSummary }}</div>
    </div>

    <v-expand-transition>
      <v-sheet v-if="showAdvanced" class="pa-3 oh-adv-panel">
        <div class="d-flex flex-wrap" style="gap:10px;">
          <v-text-field
              v-model.number="adv.low"
              type="number" density="compact" hide-details
              label="低い側 (m)" style="max-width:140px"
          />
          <v-text-field
              v-model.number="adv.high"
              type="number" density="compact" hide-details
              label="高い側 (m)" style="max-width:140px"
          />
          <div style="flex:1; min-width:220px;">
            <div style="font-size:12px; color:#666; margin-bottom:2px;">分割数</div>
            <v-slider
                v-model.number="adv.splits" :min="3" :max="24" step="1"
                density="compact" hide-details thumb-label
            />
          </div>
        </div>

        <div style="font-size:12px; color:#666; margin:6px 0 2px;">ベース配色</div>
        <div class="d-flex" style="gap:8px; margin-bottom:10px;">
          <v-chip :color="adv.base==='gsi' ? 'primary' : undefined" size="small" @click="adv.base='gsi'">地理院風</v-chip>
          <v-chip :color="adv.base==='oh3' ? 'primary' : undefined" size="small" @click="adv.base='oh3'">OH3標準</v-chip>
        </div>

        <div class="d-flex" style="gap:8px;">
          <v-btn color="primary" @click="applyCustom">この条件で作る</v-btn>
          <v-btn variant="text" @click="resetCustom">リセット</v-btn>
        </div>
      </v-sheet>
    </v-expand-transition>

    <hr style="margin:12px 0;">
    <div style="font-size:14px" v-html="item.attribution"></div>
  </div>
</template>

<script>
import MiniTooltip from '@/components/MiniTooltip'
import maplibregl from 'maplibre-gl'
import { registerDemTintProtocol, registerDemTintPalette } from '@/js/utils/dem-tint-protocol'

/* ======== フラグ ======== */
const ENABLE_LABEL_HELPERS = false;   // ラベル最上＆ハロー強化は停止
const FORCE_OPACITY = 0.9;            // すべて0.9で固定

/* ======== 配色（ベース） ======== */
const GSI_RAMP_18 = [
  '#0052ff','#0e60ff','#1972ff','#2a95ff','#3abaff','#47dadf',
  '#60e88d','#86f04f','#b2f734','#e8f324','#ffe100','#ffc200',
  '#ffa100','#ff7e00','#ff5a10','#ff3a1a','#d92c18','#b51f15'
];
const GSI_SEA_18 = [
  '#eaf6ff','#dff2ff','#d5edff','#c9e8ff','#bde1ff','#b0dbff',
  '#a1d3ff','#91cbff','#7fbfff','#6db3ff','#5aa6ff','#4797f0',
  '#3686d8','#2976c3','#1f69b1','#155a9c','#0e4f8b','#09457c'
];

const OH3_RAMP_18 = [
  '#eaf7e3','#dbf0d1','#c7e6b3','#aede95','#95d27a','#7ec663',
  '#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749',
  '#b2733e','#9a6034','#84542d','#bfbfbf','#eaeaea','#ffffff'
];
const OH3_SEA_18 = [
  '#eaf6ff','#d7eeff','#c3e5ff','#b0dcff','#9bd1ff','#86c6ff',
  '#71bbff','#5aafff','#439fff','#2f8fe0','#217fcb','#1a70b6',
  '#145fa0','#0f4f8a','#0b416f','#08365b','#072b46','#051f34'
];

/* ======== 既存プリセット ======== */
const PRESETS = {
  gsi_coast:   { aboveDomain:[0,2,4,6,8,10,12,15,18,22,28,40], aboveRange: GSI_RAMP_18.slice(0,12),
    belowDomain:[0,0.5,1,2,3,5,8,12,20,30,45,65], belowRange: GSI_SEA_18.slice(0,12) },
  gsi_lowland: { aboveDomain:[0,10,20,30,40,50,60,70,80,90,100,120], aboveRange: GSI_RAMP_18.slice(0,12),
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160],     belowRange: GSI_SEA_18.slice(0,12) },
  gsi_mountain:{ aboveDomain:[0,2,5,10,20,35,60,90,130,200,300,450,700,1100,1600,2200,3000,3600], aboveRange: GSI_RAMP_18,
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160,260,420,650,1000,1600,2500],      belowRange: GSI_SEA_18 },

  coast:       { aboveDomain:[0,2,4,6,8,10,12,15,18,22,28,40],
    aboveRange:['#eaf7e3','#dbf0d1','#c7e6b3','#aede95','#95d27a','#7ec663','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749'],
    belowDomain:[0,0.5,1,2,3,5,8,12,20,30,45,65],
    belowRange:['#eaf6ff','#dff2ff','#cfeaff','#bfe2ff','#acdaff','#98d0ff','#83c5ff','#6db9ff','#55aaff','#3f99ef','#2e85d4','#216fb6'] },
  lowland:     { aboveDomain:[0,10,20,30,40,50,60,70,80,90,100,120],
    aboveRange:['#eaf7e3','#dff2d6','#cfe9bf','#bfe1a8','#a9da92','#94d07d','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749'],
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160],
    belowRange:['#eaf6ff','#dff2ff','#cfeaff','#bfe2ff','#acdaff','#98d0ff','#83c5ff','#6db9ff','#55aaff','#3f99ef','#2e85d4','#216fb6'] },
  mountain:    { aboveDomain:[0,2,5,10,20,35,60,90,130,200,300,450,700,1100,1600,2200,3000,3600], aboveRange: OH3_RAMP_18,
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160,260,420,650,1000,1600,2500],      belowRange: OH3_SEA_18 },

  local_volcano: { /* 省略：あなたの最終版をそのまま */ },
  local_flood10: { /* 省略：あなたの最終版をそのまま */ },
  // local_fan_terrace: { …必要なら復活… }
};

export default {
  name: 'ext-demtint-quick',
  props: ['mapName','item'],
  components: { MiniTooltip },
  data:()=>({
    menuContentSize:{width:'auto',height:'auto',margin:'10px',overflow:'hidden','user-select':'text','font-size':'large'},
    presetKey:'mountain',
    showAdvanced:false,
    adv:{ low:0, high:3000, splits:12, base:'gsi' },  // 上級者既定
  }),
  computed:{
    customSummary(){
      if(!this.$store.state.demTint?.__custom) return '';
      const {low,high,splits,base} = this.$store.state.demTint.__custom;
      return `カスタム：${low}〜${high}m / ${splits}分割 / ${base==='gsi'?'地理院風':'OH3標準'}`;
    }
  },
  methods:{
    ensure(){
      if(!this.$store.state.demTint){
        this.$store.state.demTint = {
          mode:'step',
          palette: PRESETS[this.presetKey],
          opacity: FORCE_OPACITY,
          contrast: 0
        };
      }
    },
    usePreset(key){
      this.ensure();
      this.presetKey = key;
      this.$store.state.demTint.palette = JSON.parse(JSON.stringify(PRESETS[key]));
      delete this.$store.state.demTint.__custom;             // カスタム表示は解除
      this.$store.state.demTint.opacity = FORCE_OPACITY;
      this.apply();
    },

    /* —— 上級者：任意レンジ×任意分割 —— */
    applyCustom(){
      let {low,high,splits,base} = this.adv;
      // バリデーション＆補正
      if(!Number.isFinite(low)) low = 0;
      if(!Number.isFinite(high)) high = 1000;
      if(low === high) high = low + 1;
      if(low > high) [low,high] = [high,low];
      splits = Math.max(3, Math.min(24, Math.round(splits||12)));

      // ベース配色（陸の連続ランプ）
      const baseRamp = (base==='gsi') ? GSI_RAMP_18 : OH3_RAMP_18;
      const seaRamp  = (base==='gsi') ? GSI_SEA_18 : OH3_SEA_18;

      // 均等分割のドメイン（端を含む等間隔：N個）
      const aboveDomain = this.linspace(low, high, splits);
      // 連続ランプから N色サンプリング（RGB線形補間）
      const aboveRange  = this.sampleRamp(baseRamp, splits);

      // 範囲外（<low, >high）の見え方：控えめ色（淡緑とグレージュ）
      // → dem-tint-protocol は「最後の色が最大以上」に当たるので
      //   low 未満を淡緑で“前置き”したい場合、先頭に 1段 追加する
      const preColor  = '#eef5ef';  // low未満
      const postColor = '#e6e1da';  // high超
      const aDomainExt = [Math.min(-10000, low-1e9), ...aboveDomain, high+1]; // 先頭ダミーしきい値
      const aRangeExt  = [preColor, ...aboveRange.slice(0, -1), aboveRange[aboveRange.length-1], postColor];

      // 海側は既定（ベースに合わせる）
      const belowDomain = seaRamp.map((_,i)=>i); // ダミー連番でもOK（プロトコル側は数だけ使う）
      const belowRange  = seaRamp.slice();

      const palette = { aboveDomain: aDomainExt, aboveRange: aRangeExt, belowDomain, belowRange };

      // ストアへ反映＆メタ保存
      this.ensure();
      this.$store.state.demTint.palette = palette;
      this.$store.state.demTint.opacity = FORCE_OPACITY;
      this.$store.state.demTint.__custom = { low, high, splits, base };

      // プリセット選択の色付けを外すためにキーは保持したまま実反映
      this.apply(true);
    },

    resetCustom(){
      this.adv = { low:0, high:3000, splits:12, base:'gsi' };
      delete this.$store.state.demTint?.__custom;
    },

    /* 実反映（カスタム時も既存時も共通） */
    apply(isCustom=false){
      const map = this.$store.state[this.mapName];
      if(!map) return;

      const SRC_ID='oh-dem-tint-src', LYR_ID='oh-dem-tint';
      const base='demtint://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png';

      // 現在のパレットを styleKey でレジストリに登録
      const palette = this.$store.state.demTint?.palette;
      const styleKey = this.hash(JSON.stringify(palette));
      registerDemTintPalette(styleKey, palette); // ← dem-tint-protocol 側のレジストリへ

      // その styleKey を URL に付与
      const url = `${base}?style=${styleKey}`;

      // レイヤ順維持：既存レイヤ直後の beforeId を見つける
      const beforeId = (()=>{
        const layers = map.getStyle()?.layers||[];
        const idx = layers.findIndex(l=>l.id===LYR_ID);
        if(idx===-1) return undefined;
        for(let k=idx+1;k<layers.length;k++){
          const id = layers[k]?.id; if(id && map.getLayer(id)) return id;
        }
        return undefined;
      })();

      requestAnimationFrame(()=>{
        try{
          if(map.getLayer(LYR_ID))  map.removeLayer(LYR_ID);
          if(map.getSource(SRC_ID)) map.removeSource(SRC_ID);

          map.addSource(SRC_ID,{ type:'raster', tiles:[url], tileSize:256, scheme:'xyz', maxzoom:15 });
          map.addLayer({
            id: LYR_ID, type:'raster', source:SRC_ID,
            paint: {
              'raster-resampling':'nearest',
              'raster-fade-duration':0,
              'raster-opacity': this.$store.state.demTint?.opacity ?? 0.9,
              'raster-contrast': this.$store.state.demTint?.contrast ?? 0
            }
          }, beforeId);

          if (ENABLE_LABEL_HELPERS) {
            this.placeTintBelowSymbols(map, LYR_ID);
            this.boostLabelHalo(map, { color:'rgba(255,255,255,0.65)', width:1.6, blur:0.4 });
          }
        }catch(e){ console.warn(e); }
      });
    },

    /* ユーティリティ */
    linspace(min, max, n){
      if(n<=1) return [min];
      const step = (max - min) / (n - 1);
      const arr = new Array(n);
      for(let i=0;i<n;i++) arr[i] = +(min + step*i).toFixed(6);
      return arr;
    },
    sampleRamp(ramp, n){
      if(n<=1) return [ramp[0]];
      const m = ramp.length;
      const out = [];
      for(let i=0;i<n;i++){
        const t = (n===1)?0 : i/(n-1);
        const x = t*(m-1);
        const i0 = Math.floor(x), i1 = Math.min(m-1, i0+1);
        const f  = x - i0;
        out.push(this.lerpHex(ramp[i0], ramp[i1], f));
      }
      return out;
    },
    lerpHex(h1,h2,t){
      const c1 = this.hexToRgb(h1), c2 = this.hexToRgb(h2);
      const r = Math.round(c1.r + (c2.r-c1.r)*t);
      const g = Math.round(c1.g + (c2.g-c1.g)*t);
      const b = Math.round(c1.b + (c2.b-c1.b)*t);
      return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
    },
    hexToRgb(hex){
      const s = hex.replace('#','');
      const n = parseInt(s,16);
      return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
    },

    placeTintBelowSymbols(map, tintLayerId='oh-dem-tint'){
      try{
        const layers = map.getStyle()?.layers||[];
        const firstSymbol = layers.find(l=>l.type==='symbol')?.id;
        if(firstSymbol && map.getLayer(tintLayerId)) map.moveLayer(tintLayerId, firstSymbol);
      }catch(e){ console.warn('placeTintBelowSymbols:', e); }
    },
    boostLabelHalo(map,{color='rgba(255,255,255,0.6)',width=1.5,blur=0.5}={}){
      try{
        const layers = map.getStyle()?.layers||[];
        for(const l of layers){
          if(l.type!=='symbol') continue;
          const id=l.id; if(!map.getLayer(id)) continue;
          const curColor = map.getPaintProperty(id,'text-halo-color');
          const curWidth = map.getPaintProperty(id,'text-halo-width');
          const curBlur  = map.getPaintProperty(id,'text-halo-blur');
          if(!curColor) map.setPaintProperty(id,'text-halo-color',color);
          if(!(typeof curWidth==='number' && curWidth>=width)) map.setPaintProperty(id,'text-halo-width',width);
          if(!curBlur) map.setPaintProperty(id,'text-halo-blur',blur);
        }
      }catch(e){ console.warn('boostLabelHalo:', e); }
    },
    hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h.toString(16); }
  },

  mounted(){
    registerDemTintProtocol(maplibregl);
    const h = document.querySelector('#handle-'+this.item.id);
    if(h) h.innerHTML = `<span style="font-size: large;">${this.item.label}</span>`;
    this.ensure();
    this.apply();
  }
}
</script>

<style scoped>
.oh-chip-lg { font-size: 15px; padding: 8px 12px; }
.oh-adv-panel {
  background: #fafbfe;
  border: 1px solid #e3e8ff;
  border-radius: 10px;
}
</style>
