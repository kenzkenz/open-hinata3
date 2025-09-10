<!-- components/ext-demtint-quick.vue -->
<template>
  <div :style="menuContentSize">
<!--    <div style="font-size:14px;color:#666;margin-bottom:8px;">おすすめスタイル</div>-->

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

    <hr style="margin:12px 0;">
    <div style="font-size:14px" v-html="item.attribution"></div>
  </div>
</template>

<script>
import MiniTooltip from '@/components/MiniTooltip'

/* ======== フラグ（あとで復活可能） ======== */
const ENABLE_LABEL_HELPERS = false;   // ラベル最上＆ハロー強化は停止
const FORCE_OPACITY = 0.9;            // すべて0.9で固定

/* ======== パレット：地理院風（GSI配色） ========
   - GSI標準の「青→シアン→緑→黄→橙→赤」系を多段化
   - 陸（aboveRange）/海（belowRange）ともに段階数を各ドメインに合わせて用意
*/
const GSI_RAMP_12 = [
  '#0052ff','#146af9','#198cff','#2fb8ff','#46e0ff',
  '#7be87a','#b6f83d','#fff300','#ffc300','#ff9b00','#ff5d20','#ff3a1a'
];
const GSI_RAMP_18 = [
  '#0052ff','#0e60ff','#1972ff','#2a95ff','#3abaff','#47dadf',
  '#60e88d','#86f04f','#b2f734','#e8f324','#ffe100','#ffc200',
  '#ffa100','#ff7e00','#ff5a10','#ff3a1a','#d92c18','#b51f15'
];
const GSI_SEA_12 = [
  '#eaf6ff','#d9efff','#c9e8ff','#b5deff','#9fd3ff',
  '#8ac8ff','#75bcff','#5eafff','#479fff','#338fe0','#257fcb','#1a70b6'
];
const GSI_SEA_18 = [
  '#eaf6ff','#dff2ff','#d5edff','#c9e8ff','#bde1ff','#b0dbff',
  '#a1d3ff','#91cbff','#7fbfff','#6db3ff','#5aa6ff','#4797f0',
  '#3686d8','#2976c3','#1f69b1','#155a9c','#0e4f8b','#09457c'
];

/* ======== パレット定義 ======== */
const PRESETS = {
  // 地理院風：沿岸（±20m付近を細かく）
  gsi_coast: {
    aboveDomain:[0,2,4,6,8,10,12,15,18,22,28,40],
    aboveRange: GSI_RAMP_12,
    belowDomain:[0,0.5,1,2,3,5,8,12,20,30,45,65],
    belowRange: GSI_SEA_12
  },
  // 地理院風：低地（0〜120m）
  gsi_lowland: {
    aboveDomain:[0,10,20,30,40,50,60,70,80,90,100,120],
    aboveRange: GSI_RAMP_12,
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160],
    belowRange: GSI_SEA_12
  },
  // 地理院風：山地（0〜3000m）
  gsi_mountain: {
    aboveDomain:[0,2,5,10,20,35,60,90,130,200,300,450,700,1100,1600,2200,3000,3600],
    aboveRange: GSI_RAMP_18,
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160,260,420,650,1000,1600,2500],
    belowRange: GSI_SEA_18
  },

  // —— OH3標準（自然系） ——
  coast: {
    aboveDomain:[0,2,4,6,8,10,12,15,18,22,28,40],
    aboveRange:['#eaf7e3','#dbf0d1','#c7e6b3','#aede95','#95d27a','#7ec663','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749'],
    belowDomain:[0,0.5,1,2,3,5,8,12,20,30,45,65],
    belowRange:['#eaf6ff','#dff2ff','#cfeaff','#bfe2ff','#acdaff','#98d0ff','#83c5ff','#6db9ff','#55aaff','#3f99ef','#2e85d4','#216fb6']
  },
  lowland: {
    aboveDomain:[0,10,20,30,40,50,60,70,80,90,100,120],
    aboveRange:['#eaf7e3','#dff2d6','#cfe9bf','#bfe1a8','#a9da92','#94d07d','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749'],
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160],
    belowRange:['#eaf6ff','#dff2ff','#cfeaff','#bfe2ff','#acdaff','#98d0ff','#83c5ff','#6db9ff','#55aaff','#3f99ef','#2e85d4','#216fb6']
  },
  mountain: {
    aboveDomain:[0,2,5,10,20,35,60,90,130,200,300,450,700,1100,1600,2200,3000,3600],
    aboveRange:['#eaf7e3','#dbf0d1','#c7e6b3','#aede95','#95d27a','#7ec663','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749','#b2733e','#9a6034','#84542d','#bfbfbf','#eaeaea','#ffffff'],
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160,260,420,650,1000,1600,2500],
    belowRange:['#eaf6ff','#d7eeff','#c3e5ff','#b0dcff','#9bd1ff','#86c6ff','#71bbff','#5aafff','#439fff','#2f8fe0','#217fcb','#1a70b6','#145fa0','#0f4f8a','#0b416f','#072b46','#051f34']
  }
};

export default {
  name: 'ext-demtint-quick',
  props: ['mapName','item'],
  components: { MiniTooltip },
  data:()=>({
    menuContentSize:{width:'300px',height:'auto',margin:'10px',overflow:'hidden','user-select':'text','font-size':'large'},
    presetKey:'mountain'  // 既定を地理院風「山地」に。好みで変更OK
  }),
  methods:{
    ensure(){
      if(!this.$store.state.demTint){
        this.$store.state.demTint = {
          mode:'step',
          palette: PRESETS[this.presetKey],
          opacity: FORCE_OPACITY,  // 0.9固定
          contrast: 0
        };
      }
    },
    usePreset(key){
      this.ensure();
      this.presetKey = key;
      this.$store.state.demTint.palette = JSON.parse(JSON.stringify(PRESETS[key]));
      this.$store.state.demTint.opacity = FORCE_OPACITY; // 切替時も 0.9
      this.apply();
    },
    apply(){
      const map = this.$store.state[this.mapName];
      if(!map) return;

      const SRC_ID='oh-dem-tint-src', LYR_ID='oh-dem-tint';
      const base='demtint://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png';

      this.ensure();
      const curOpacity = FORCE_OPACITY;
      this.$store.state.demTint.opacity = curOpacity;

      const styleKey = this.hash(JSON.stringify(this.$store.state.demTint.palette));
      const url = `${base}?style=${styleKey}`;

      // 既存位置を維持
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
              'raster-opacity': curOpacity,
              'raster-contrast': this.$store.state.demTint.contrast || 0
            }
          }, beforeId);

          // ※ ラベル補助は停止中（ENABLE_LABEL_HELPERS を true にすれば復活）
          if (ENABLE_LABEL_HELPERS) {
            this.placeTintBelowSymbols(map, LYR_ID);
            this.boostLabelHalo(map, { color:'rgba(255,255,255,0.65)', width:1.6, blur:0.4 });
          }
        }catch(e){ console.warn(e); }
      });
    },

    /* 停止中の補助機能（コード温存） */
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
    const h = document.querySelector('#handle-'+this.item.id);
    if(h) h.innerHTML = `<span style="font-size: large;">${this.item.label}</span>`;
    this.ensure();
    this.apply();
  }
}
</script>

<style scoped>
.oh-chip-lg { font-size: 15px; padding: 8px 12px; }
</style>
