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


<!--      <MiniTooltip text="範囲：±5m（干潟・湖沼）" :offset-x="0" :offset-y="0">-->
<!--        <v-chip class="oh-chip-lg" :color="presetKey==='local_tidal5' ? 'primary' : undefined" size="large" @click="usePreset('local_tidal5')">-->
<!--          干潟・湖沼（±5m）-->
<!--        </v-chip>-->
<!--      </MiniTooltip>-->

      <MiniTooltip text="範囲：10〜80m（扇状地・段丘面）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='local_fan_terrace' ? 'primary' : undefined" size="large" @click="usePreset('local_fan_terrace')">
          扇状地・段丘
        </v-chip>
      </MiniTooltip>

<!--      <MiniTooltip text="範囲：500〜1200m（帯域強調・周辺は抑制色）" :offset-x="0" :offset-y="0">-->
<!--        <v-chip class="oh-chip-lg" :color="presetKey==='local_inland_basin' ? 'primary' : undefined" size="large" @click="usePreset('local_inland_basin')">-->
<!--          内陸盆地（500–1200m）-->
<!--        </v-chip>-->
<!--      </MiniTooltip>-->

    </div>

    <hr style="margin:12px 0;">
    <div style="font-size:14px" v-html="item.attribution"></div>
  </div>
</template>

<script>
import MiniTooltip from '@/components/MiniTooltip'
import maplibregl from 'maplibre-gl'
import { registerDemTintProtocol, registerDemTintPalette } from '@/js/utils/dem-tint-protocol'; // 追加

/* ======== フラグ ======== */
const ENABLE_LABEL_HELPERS = false;   // ラベル最上＆ハロー強化は停止
const FORCE_OPACITY = 0.9;            // すべて0.9で固定

/* ======== 地理院風の配色（ベース） ======== */
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

/* ======== プリセット定義 ======== */
const PRESETS = {
  /* 地理院風 */
  gsi_coast: {
    aboveDomain:[0,2,4,6,8,10,12,15,18,22,28,40],
    aboveRange: GSI_RAMP_12,
    belowDomain:[0,0.5,1,2,3,5,8,12,20,30,45,65],
    belowRange: GSI_SEA_12
  },
  gsi_lowland: {
    aboveDomain:[0,10,20,30,40,50,60,70,80,90,100,120],
    aboveRange: GSI_RAMP_12,
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160],
    belowRange: GSI_SEA_12
  },
  gsi_mountain: {
    aboveDomain:[0,2,5,10,20,35,60,90,130,200,300,450,700,1100,1600,2200,3000,3600],
    aboveRange: GSI_RAMP_18,
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160,260,420,650,1000,1600,2500],
    belowRange: GSI_SEA_18
  },

  /* OH3標準（自然系） */
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
  },

  /* 局所（用途特化） */

  // ★ 差し替え：禍々しい火山ダーク版
  local_volcano: {
    // ドメインは従来どおり（細かい帯で火口縁の雰囲気が出る）
    aboveDomain:[0,200,400,600,800,1000,1200,1500,1800,2100,2400,2700,3000,3300,3600],
    aboveRange:[
      '#171a1c', // <200  暗い炭色（麓は抑制）
      '#1f2326', // 200–400
      '#2a2f31', // 400–600  灰緑まじりの火山灰
      '#3a2b2b', // 600–800  焦土
      '#541b1b', // 800–1000 深い血赤
      '#6b1313', // 1000–1200
      '#8a1010', // 1200–1500 溶岩の核
      '#a01914', // 1500–1800
      '#b02a1e', // 1800–2100 灼熱
      '#bf3d23', // 2100–2400 冷えはじめの赤橙
      '#5a4d49', // 2400–2700  スコリア/スラグの煤色
      '#444141', // 2700–3000  濃灰
      '#3a3a3d', // 3000–3300  チャコール
      '#5b5e62', // 3300–3600  煙のような灰
      '#8b8f94'  // >3600      明灰（雪白は避けて不穏さ維持）
    ],
    // 海側はダーク群青へ（陸の赤を引き立てる）
    belowDomain:[0,1,2,3,5,8,12,20],
    belowRange:['#0e1b2b','#10263b','#12314b','#153d5d','#1a4b72','#1f5988','#24669c','#2a74b1']
  },

  local_flood10: {
    // 陸：0–10mは「低いほど濃い青」。10m超も淡い青で“無印象化”（白や灰は使わない）
    aboveDomain:[0,0.5,1,2,3,4,5,6,7,8,9,10,12,15,20,30,40],
    aboveRange:[
      '#072b46', // 0–0.5   最濃（極低地）
      '#0b3f6d', // 0.5–1
      '#0f5394', // 1–2
      '#1668ba', // 2–3
      '#1e7ad0', // 3–4
      '#2b8ce3', // 4–5
      '#3c9ced', // 5–6
      '#4eabf4', // 6–7
      '#60b8f8', // 7–8
      '#74c4fb', // 8–9
      '#89cfff', // 9–10
      '#9fd9ff', // 10–12 以降は淡青で抑制
      '#b6e2ff', // 12–15
      '#cceaff', // 15–20
      '#ddf2ff', // 20–30
      '#eaf7ff', // 30–40
      '#f0f9ff'  // >40     ※ごく薄い青（白は使わない）
    ],

    // 海：浅いほど淡く、深いほどやや濃い（全域ブルー）
    belowDomain:[0,0.2,0.5,1,1.5,2,3,4,5],
    belowRange:[
      '#eaf7ff', // 0–0.2
      '#dff2ff', // 0.2–0.5
      '#d2ebff', // 0.5–1
      '#c3e3ff', // 1–1.5
      '#b2d9ff', // 1.5–2
      '#9fceff', // 2–3
      '#89c1ff', // 3–4
      '#73b3f0', // 4–5
      '#5aa0d9'  // >5
    ]
  },

  // （温存・必要時に復活）
  local_tidal5: {
    aboveDomain:[0,0.5,1,1.5,2,3,4,5],
    aboveRange:['#fffaf0','#fff3d6','#ffeab8','#ffe09a','#ffd37c','#ffc15e','#ffae45','#ff9c33'],
    belowDomain:[0,0.5,1,1.5,2,3,4,5],
    belowRange:['#eaf6ff','#def1ff','#d0eaff','#c0e2ff','#aed8ff','#9bceff','#87c2ff','#73b7ff']
  },
  /* 扇状地・段丘（10–80mを暖色で精細に。<10mと>80mは控えめ） */
  local_fan_terrace: {
    // 陸：10–80m を細かい階段で。<10m は淡い灰緑、>80m は淡いグレージュで抑制
    aboveDomain: [0,5,8,10,12,14,16,18,20,22,24,26,28,30,34,38,42,46,50,56,62,68,74,80,100,150],
    aboveRange: [
      '#eef5ef', // <5    低湿地は淡く
      '#f4ecdd', // 5–8
      '#efe0c7', // 8–10 —— ここから扇状地帯
      '#ead5b3', // 10–12
      '#e4c99f', // 12–14
      '#debe8c', // 14–16
      '#d8b47b', // 16–18
      '#d2aa6c', // 18–20
      '#cca05e', // 20–22
      '#c59653', // 22–24
      '#be8d49', // 24–26
      '#b68341', // 26–28
      '#ae7a3a', // 28–30
      '#a77134', // 30–34
      '#9d682f', // 34–38
      '#945f2b', // 38–42
      '#8a5628', // 42–46
      '#804d25', // 46–50
      '#764523', // 50–56
      '#6c3e21', // 56–62
      '#63371f', // 62–68
      '#5a311e', // 68–74
      '#522c1d', // 74–80 —— 扇状地帯ここまで
      '#cfc9c0', // 80–100   山麓の外は抑制
      '#e9e4de'  // >150
    ],

    // 海：全体を邪魔しない柔らかい淡青
    belowDomain: [0,0.5,1,2,3,5,8,12,20],
    belowRange: ['#eaf6ff','#e3f2ff','#d8ecff','#cae4ff','#b9daff','#a5cfff','#90c3ff','#7ab6f0','#679fda']
  },
  // local_fan_terrace: {
  //   aboveDomain:[0,5,10,15,20,30,40,50,60,80],
  //   aboveRange:['#eaf7e3','#e4f2d9','#d9ebca','#cce3b8','#c4d7a5','#d9c792','#e2bb82','#e8ae73','#e09e61','#d28c4f'],
  //   belowDomain:[0,0.5,1,2,3,5,8,12,20,30,45,65],
  //   belowRange:['#eaf6ff','#dff2ff','#cfeaff','#bfe2ff','#acdaff','#98d0ff','#83c5ff','#6db9ff','#55aaff','#3f99ef','#2e85d4','#216fb6']
  // },
  local_inland_basin: {
    aboveDomain:[0,200,400,500,620,740,860,980,1100,1200,1500],
    aboveRange:['#eef4ef','#e8efe9','#e0e9e2','#f3e6cf','#eacb9a','#e0b775','#d6a45c','#c48f4a','#b07d3f','#a06f3a','#cfcfcf'],
    belowDomain:[0,1,2,3,5,8,12,20],
    belowRange:['#eaf6ff','#e1f1ff','#d6ecff','#c8e4ff','#b7dbff','#a5d1ff','#92c6ff','#7ebaef']
  }
};

export default {
  name: 'ext-demtint-quick',
  props: ['mapName','item'],
  components: { MiniTooltip },
  data:()=>({
    menuContentSize:{width:'auto',height:'auto',margin:'10px',overflow:'hidden','user-select':'text','font-size':'large'},
    presetKey:'mountain'  // 既定（必要なら 'gsi_mountain' などに）
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

      // ① 現在のパレットを styleKey でレジストリに登録
      const palette = this.$store.state.demTint?.palette;
      const styleKey = this.hash(JSON.stringify(palette));
      registerDemTintPalette(styleKey, palette);

      // ② その styleKey を URL に付与（キャッシュ破り不要なら v は省略可）
      const url = `${base}?style=${styleKey}`;

      // （以下は既存の安全な再作成ロジックのまま）
      const beforeId = (()=>{ /* ...略（今のままでOK）... */ })();

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
        }catch(e){ console.warn(e); }
      });
    },

    // apply(){
    //   const map = this.$store.state[this.mapName];
    //   if(!map) return;
    //
    //   const SRC_ID='oh-dem-tint-src', LYR_ID='oh-dem-tint';
    //   const base='demtint://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png';
    //
    //   this.ensure();
    //   const curOpacity = FORCE_OPACITY;
    //   this.$store.state.demTint.opacity = curOpacity;
    //
    //   const styleKey = this.hash(JSON.stringify(this.$store.state.demTint.palette));
    //   const url = `${base}?style=${styleKey}`;
    //
    //   // 既存位置を維持
    //   const beforeId = (()=>{
    //     const layers = map.getStyle()?.layers||[];
    //     const idx = layers.findIndex(l=>l.id===LYR_ID);
    //     if(idx===-1) return undefined;
    //     for(let k=idx+1;k<layers.length;k++){
    //       const id = layers[k]?.id; if(id && map.getLayer(id)) return id;
    //     }
    //     return undefined;
    //   })();
    //
    //   requestAnimationFrame(()=>{
    //     try{
    //       if(map.getLayer(LYR_ID))  map.removeLayer(LYR_ID);
    //       if(map.getSource(SRC_ID)) map.removeSource(SRC_ID);
    //
    //       map.addSource(SRC_ID,{ type:'raster', tiles:[url], tileSize:256, scheme:'xyz', maxzoom:15 });
    //
    //       map.addLayer({
    //         id: LYR_ID, type:'raster', source:SRC_ID,
    //         paint: {
    //           'raster-resampling':'nearest',
    //           'raster-fade-duration':0,
    //           'raster-opacity': curOpacity,
    //           'raster-contrast': this.$store.state.demTint.contrast || 0
    //         }
    //       }, beforeId);
    //
    //       if (ENABLE_LABEL_HELPERS) {
    //         this.placeTintBelowSymbols(map, LYR_ID);
    //         this.boostLabelHalo(map, { color:'rgba(255,255,255,0.65)', width:1.6, blur:0.4 });
    //       }
    //     }catch(e){ console.warn(e); }
    //   });
    // },

    /* 温存中の補助機能 */
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
</style>
