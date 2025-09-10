<!-- components/ext-demtint-quick.vue -->
<template>
  <div :style="menuContentSize">
    <div style="font-size:14px;color:#666;margin-bottom:6px;">おすすめスタイル</div>

    <div class="d-flex flex-wrap" style="gap:8px; margin-bottom:10px;">
      <!-- 地理院（標準） -->
      <MiniTooltip text="陸：0→5→10→50→100→500→1500m／海：0→1→2→3→5→10→20→50m" :offset-x="0" :offset-y="0">
        <v-chip
            class="oh-chip-lg"
            :color="presetKey==='gsi' ? 'primary' : undefined"
            size="large"
            @click="usePreset('gsi')"
        >地理院風</v-chip>
      </MiniTooltip>

      <!-- 既存3種 -->
      <MiniTooltip text="範囲：-20〜+20m" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='coast'?'primary':undefined" size="large" @click="usePreset('coast')">沿岸</v-chip>
      </MiniTooltip>

      <MiniTooltip text="範囲：0〜120m" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='lowland'?'primary':undefined" size="large" @click="usePreset('lowland')">低地</v-chip>
      </MiniTooltip>

      <MiniTooltip text="範囲：0〜3000m" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='mountain'?'primary':undefined" size="large" @click="usePreset('mountain')">山地（標準）</v-chip>
      </MiniTooltip>
    </div>

    <hr style="margin:12px 0;">
    <div style="font-size:14px" v-html="item.attribution"></div>
  </div>
</template>

<script>
import MiniTooltip from '@/components/MiniTooltip'

/**
 * 各プリセットのしきい値（Domain）と色（Range）
 * - belowDomain/Range: 海（深さ[m]） 0=海面。値が大きいほど深い
 * - aboveDomain/Range: 陸（標高[m]） 0=海面。値が大きいほど高い
 * 色数＝しきい値数。最後の色が最上位クラス（しきい値最大以上）に適用されます。
 */
const PRESETS = {
  // ★ 地理院「自分で作る色別標高図」風
  gsi: {
    // 海：0,1,2,3,5,10,20,50 m
    belowDomain: [0, 1, 2, 3, 5, 10, 20, 50],
    belowRange:  ['#eaf6ff','#cfe7ff','#a6d3ff','#79bbff','#4ea2ff','#1e8cff','#0b6fe6','#084fae'],
    // 陸：0,5,10,50,100,500,1500 m
    aboveDomain: [0, 5, 10, 50, 100, 500, 1500],
    aboveRange:  ['#0052ff','#198cff','#46e0ff','#9cf24b','#fff300','#ff8c00','#ff3a1a']
  },

  // 既存
  coast: {
    aboveDomain:[0,2,4,6,8,10,12,15,18,22,28,40],
    aboveRange: ['#eaf7e3','#dbf0d1','#c7e6b3','#aede95','#95d27a','#7ec663','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749'],
    belowDomain:[0,0.5,1,2,3,5,8,12,20,30,45,65],
    belowRange: ['#eaf6ff','#dff2ff','#cfeaff','#bfe2ff','#acdaff','#98d0ff','#83c5ff','#6db9ff','#55aaff','#3f99ef','#2e85d4','#216fb6']
  },
  lowland: {
    aboveDomain:[0,10,20,30,40,50,60,70,80,90,100,120],
    aboveRange: ['#eaf7e3','#dff2d6','#cfe9bf','#bfe1a8','#a9da92','#94d07d','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749'],
    belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160],
    belowRange: ['#eaf6ff','#dff2ff','#cfeaff','#bfe2ff','#acdaff','#98d0ff','#83c5ff','#6db9ff','#55aaff','#3f99ef','#2e85d4','#216fb6']
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
    presetKey:'mountain' // 追加直後は地理院を既定にしておくならここを 'gsi'
  }),
  methods:{
    ensure(){
      if(!this.$store.state.demTint){
        this.$store.state.demTint = { mode:'step', palette: PRESETS[this.presetKey] };
      }
    },
    usePreset(key){
      this.ensure();
      this.presetKey = key;
      this.$store.state.demTint.palette = JSON.parse(JSON.stringify(PRESETS[key]));
      this.apply(); // 押した瞬間に反映
    },
    apply(){
      const map = this.$store.state[this.mapName];
      if(!map) return;

      const SRC_ID='oh-dem-tint-src', LYR_ID='oh-dem-tint';
      const base='demtint://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png';
      // level を付けない＝絶対標高モード。styleキーはキャッシュ破り用
      const styleKey = this.hash(JSON.stringify(this.$store.state.demTint.palette));
      const url = `${base}?style=${styleKey}`;

      // 既存位置の直後に再挿入（順序維持）
      const beforeId = (()=>{
        const layers = map.getStyle()?.layers||[];
        const idx = layers.findIndex(l=>l.id===LYR_ID);
        if(idx===-1) return undefined;
        for(let k=idx+1;k<layers.length;k++){ const id=layers[k]?.id; if(id&&map.getLayer(id)) return id; }
        return undefined;
      })();

      requestAnimationFrame(()=>{
        try{
          if(map.getLayer(LYR_ID)) map.removeLayer(LYR_ID);
          if(map.getSource(SRC_ID)) map.removeSource(SRC_ID);

          map.addSource(SRC_ID,{type:'raster',tiles:[url],tileSize:256,scheme:'xyz',maxzoom:15});
          map.addLayer({
            id:LYR_ID,type:'raster',source:SRC_ID,
            paint:{ 'raster-resampling':'nearest','raster-fade-duration':0,'raster-opacity':1 }
          }, beforeId);
        }catch(e){ console.warn(e); }
      });
    },
    hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h.toString(16); }
  },
  mounted(){
    const h = document.querySelector('#handle-'+this.item.id);
    if(h) h.innerHTML = `<span style="font-size: large;">${this.item.label}</span>`;
    this.ensure();
    this.apply(); // 初回反映
  }
}
</script>

<style scoped>
/* チップの文字を大きく＆押しやすく */
.oh-chip-lg {
  font-size: 15px;
  padding: 8px 12px;
}
</style>
