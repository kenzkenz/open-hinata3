<template>
  <div :style="menuContentSize" class="oh-demtint-root">
    <!-- ===================== OH3標準 ===================== -->
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

    <!-- ===================== 地理院風 ===================== -->
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

    <!-- ===================== 局所 ===================== -->
    <div style="font-size: 14px; margin:6px 0 6px;">局所</div>
    <div class="d-flex flex-wrap" style="gap:8px; margin-bottom:12px;">
      <MiniTooltip text="高地火山域（800m+：溶岩〜焼土の暖色で強調／山頂は灰雪）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='local_volcano' ? 'primary' : undefined" size="large" @click="usePreset('local_volcano')">
          火山
        </v-chip>
      </MiniTooltip>
      <MiniTooltip text="範囲：0〜10m（低いほど濃い青、10m超は淡青で抑制）" :offset-x="0" :offset-y="0">
        <v-chip class="oh-chip-lg" :color="presetKey==='local_flood10' ? 'primary' : undefined" size="large" @click="usePreset('local_flood10')">
          洪水低地
        </v-chip>
      </MiniTooltip>
    </div>

    <!-- ===================== Advanced トグル ===================== -->
    <v-btn block class="oh-adv-toggle" @click="adv.show=!adv.show">Advanced</v-btn>

    <!-- ===================== Advanced パネル ===================== -->
    <div v-show="adv.show" class="oh-adv-panel">
      <div class="oh-adv-breadcrumb">
        {{ advBaseLabel }} / 低: {{ adv.low }}m — 高: {{ adv.high }}m / {{ adv.parts }}分割
      </div>

      <!-- ベースパレット選択（OH3 / GSI / 洪水低地） -->
      <div class="oh-sublabel">ベースマップ</div>
      <div class="d-flex flex-wrap" style="gap:8px; margin-bottom:20px;">
        <v-chip :color="adv.base==='oh3'   ? 'primary' : undefined" size="large" @click="adv.base='oh3'">OH3標準</v-chip>
        <v-chip :color="adv.base==='gsi'   ? 'primary' : undefined" size="large" @click="adv.base='gsi'">地理院風</v-chip>
        <v-chip :color="adv.base==='flood' ? 'primary' : undefined" size="large" @click="adv.base='flood'">洪水低地</v-chip>
      </div>

      <!-- 低い地/高い地：横幅を完全に均等に -->
      <div class="d-flex" style="gap:8px; margin-bottom:20px;">
        <v-text-field
            v-model.number="adv.low" type="number" density="compact"
            label="低い地 (m)" hide-details class="oh-num" style="flex:1 1 0; min-width:0;"
        />
        <v-text-field
            v-model.number="adv.high" type="number" density="compact"
            label="高い地 (m)" hide-details class="oh-num" style="flex:1 1 0; min-width:0;"
        />
      </div>

      <!-- 分割（改行して下段） -->
      <div class="d-flex align-center" style="gap:8px; margin-bottom:10px;">
        <div class="oh-sublabel">分割</div>
        <v-slider v-model="adv.parts" :min="3" :max="24" step="1" hide-details density="compact" class="flex-grow-1"/>
        <div style="width:32px; text-align:right; font-size:12px;">{{ adv.parts }}</div>
      </div>

      <!-- 操作ボタン（右：リセット / 左：生成 → 要望に合わせ左右逆なら入れ替えてOK） -->
      <div class="d-flex justify-space-between" style="gap:8px;">
        <v-btn color="primary" @click="generateAndApply" class="oh-btn-w">生成</v-btn>
        <v-btn variant="outlined" color="secondary" @click="resetAdvanced" class="oh-btn-w">リセット</v-btn>
      </div>
    </div>

    <hr style="margin:12px 0;">
    <div style="font-size:14px" v-html="item.attribution"></div>
  </div>
</template>

<script>
import MiniTooltip from '@/components/MiniTooltip'
import maplibregl from 'maplibre-gl'
import { registerDemTintProtocol, registerDemTintPalette } from '@/js/utils/dem-tint-protocol'

/* ======== 固定設定 ======== */
const FORCE_OPACITY = 0.9;  // すべて 0.9 固定

/* ======== 地理院風の配色（ベース） ======== */
const GSI_RAMP_12 = [
  '#0052ff','#146af9','#198cff','#2fb8ff','#46e0ff',
  '#7be87a','#b6f83d','#fff300','#ffc300','#ff9b00','#ff5d20','#ff3a1a'
]
const GSI_RAMP_18 = [
  '#0052ff','#0e60ff','#1972ff','#2a95ff','#3abaff','#47dadf',
  '#60e88d','#86f04f','#b2f734','#e8f324','#ffe100','#ffc200',
  '#ffa100','#ff7e00','#ff5a10','#ff3a1a','#d92c18','#b51f15'
]
const GSI_SEA_12 = [
  '#eaf6ff','#d9efff','#c9e8ff','#b5deff','#9fd3ff',
  '#8ac8ff','#75bcff','#5eafff','#479fff','#338fe0','#257fcb','#1a70b6'
]
const GSI_SEA_18 = [
  '#eaf6ff','#dff2ff','#d5edff','#c9e8ff','#bde1ff','#b0dbff',
  '#a1d3ff','#91cbff','#7fbfff','#6db3ff','#5aa6ff','#4797f0',
  '#3686d8','#2976c3','#1f69b1','#155a9c','#0e4f8b','#09457c'
]

/* ======== プリセット定義（要点のみ） ======== */
const PRESETS = {
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
  local_volcano: {
    aboveDomain:[0,200,400,600,800,1000,1200,1500,1800,2100,2400,2700,3000,3300,3600],
    aboveRange:['#171a1c','#1f2326','#2a2f31','#3a2b2b','#541b1b','#6b1313','#8a1010','#a01914','#b02a1e','#bf3d23','#5a4d49','#444141','#3a3a3d','#5b5e62','#8b8f94'],
    belowDomain:[0,1,2,3,5,8,12,20],
    belowRange:['#0e1b2b','#10263b','#12314b','#153d5d','#1a4b72','#1f5988','#24669c','#2a74b1']
  },
  local_flood10: {
    aboveDomain:[0,0.5,1,2,3,4,5,6,7,8,9,10,12,15,20,30,40],
    aboveRange:['#072b46','#0b3f6d','#0f5394','#1668ba','#1e7ad0','#2b8ce3','#3c9ced','#4eabf4','#60b8f8','#74c4fb','#89cfff','#9fd9ff','#b6e2ff','#cceaff','#ddf2ff','#eaf7ff','#f0f9ff'],
    belowDomain:[0,0.2,0.5,1,1.5,2,3,4,5],
    belowRange:['#eaf7ff','#dff2ff','#d2ebff','#c3e3ff','#b2d9ff','#9fceff','#89c1ff','#73b3f0','#5aa0d9']
  }
}

/* 0–1 線形補間で色生成（HEX配列） */
function lerpHexRamp(ramp, t) {
  if (ramp.length === 0) return '#000000'
  if (ramp.length === 1) return ramp[0]
  const n = ramp.length - 1
  const i = Math.max(0, Math.min(n - 1, Math.floor(t * n)))
  const frac = (t * n) - i
  const c1 = ramp[i], c2 = ramp[i + 1]
  const [r1,g1,b1] = hexToRgb(c1), [r2,g2,b2] = hexToRgb(c2)
  const r = Math.round(r1 + (r2 - r1) * frac)
  const g = Math.round(g1 + (g2 - g1) * frac)
  const b = Math.round(b1 + (b2 - b1) * frac)
  return rgbToHex(r,g,b)
}
function hexToRgb(h){ const m=h.replace('#',''); return [parseInt(m.slice(0,2),16),parseInt(m.slice(2,4),16),parseInt(m.slice(4,6),16)] }
function rgbToHex(r,g,b){ return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}` }

export default {
  name: 'ext-dem-tint',
  props: ['mapName','item'],
  components: { MiniTooltip },

  data:()=>({
    menuContentSize:{ width:'340px', height:'auto', margin:'10px', overflow:'hidden', 'user-select':'text', 'font-size':'large' },
    presetKey:'mountain',
    adv:{ show:false, base:'oh3', low:0, high:10, parts:12 }
  }),

  computed:{
    advBaseLabel(){
      return this.adv.base==='gsi' ? '地理院風'
          : this.adv.base==='flood' ? '洪水低地'
              : 'OH3標準'
    },
    advSeaBase(){
      if (this.adv.base === 'gsi')
        return { domain:[...PRESETS.gsi_mountain.belowDomain],  range:[...PRESETS.gsi_mountain.belowRange] }
      if (this.adv.base === 'flood')
        return { domain:[...PRESETS.local_flood10.belowDomain], range:[...PRESETS.local_flood10.belowRange] }
      return { domain:[...PRESETS.mountain.belowDomain],        range:[...PRESETS.mountain.belowRange] }
    }
  },

  methods:{
    ensure(){
      if(!this.$store.state.demTint){
        this.$store.state.demTint = { mode:'step', palette: PRESETS[this.presetKey], opacity: 0.9, contrast: 0 }
      }
    },
    usePreset(key){
      this.ensure()
      this.presetKey = key
      this.$store.state.demTint.palette = JSON.parse(JSON.stringify(PRESETS[key]))
      this.$store.state.demTint.opacity = FORCE_OPACITY
      this.apply()
    },
    resetAdvanced(){
      this.adv.base = 'oh3'
      this.adv.low  = 0
      this.adv.high = 10
      this.adv.parts= 12
      const map = this.$store.state[this.mapName]
      if (!map) return
      try{
        if(map.getLayer('oh-dem-tint'))  map.removeLayer('oh-dem-tint')
        if(map.getSource('oh-dem-tint-src')) map.removeSource('oh-dem-tint-src')
      }catch(e){}
    },
    generateAndApply(){
      const low  = Number(this.adv.low)||0
      const high = Math.max(low+1, Number(this.adv.high)||10)
      const parts= Math.max(3, Math.min(48, Number(this.adv.parts)||8))

      const baseAboveRamp =
          this.adv.base==='gsi'   ? GSI_RAMP_18
              : this.adv.base==='flood' ? PRESETS.local_flood10.aboveRange
                  : PRESETS.mountain.aboveRange

      const outsideLowColor  = '#e9f3ff'
      const outsideHighColor = '#cfcfcf'

      const aboveDomain = [0, low]
      const step = (high - low) / parts
      for (let i=1;i<=parts;i++) aboveDomain.push( Math.round(low + step*i) )

      const aboveRange = []
      for (let i=0;i<aboveDomain.length;i++){
        if (i===0) { aboveRange.push(outsideLowColor); continue }
        if (i===aboveDomain.length-1) { aboveRange.push(outsideHighColor); continue }
        const t = (i-1)/(parts-1 || 1)
        aboveRange.push( lerpHexRamp(baseAboveRamp, t) )
      }

      const belowDomain = this.advSeaBase.domain
      const belowRange  = this.advSeaBase.range

      const palette = { aboveDomain, aboveRange, belowDomain, belowRange }
      this.ensure()
      this.$store.state.demTint.palette = palette
      this.$store.state.demTint.opacity = FORCE_OPACITY
      this.apply()
    },
    apply(){
      const map = this.$store.state[this.mapName]
      if(!map) return
      const SRC_ID='oh-dem-tint-src', LYR_ID='oh-dem-tint'
      const base='demtint://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png'

      const palette = this.$store.state.demTint?.palette
      if(!palette) return
      const styleKey = this.hash(JSON.stringify(palette))
      registerDemTintPalette(styleKey, palette)
      const url = `${base}?style=${styleKey}`

      const beforeId = (()=>{
        const layers = map.getStyle()?.layers||[]
        const idx = layers.findIndex(l=>l.id===LYR_ID)
        if(idx===-1) return undefined
        for(let k=idx+1;k<layers.length;k++){
          const id = layers[k]?.id; if(id && map.getLayer(id)) return id
        }
        return undefined
      })()

      requestAnimationFrame(()=>{
        try{
          if(map.getLayer(LYR_ID))  map.removeLayer(LYR_ID)
          if(map.getSource(SRC_ID)) map.removeSource(SRC_ID)

          map.addSource(SRC_ID,{ type:'raster', tiles:[url], tileSize:256, scheme:'xyz', maxzoom:15 })
          map.addLayer({
            id: LYR_ID, type:'raster', source:SRC_ID,
            paint: {
              'raster-resampling':'nearest',
              'raster-fade-duration':0,
              'raster-opacity': this.$store.state.demTint?.opacity ?? 0.9,
              'raster-contrast': this.$store.state.demTint?.contrast ?? 0
            }
          }, beforeId)
        }catch(e){ console.warn(e) }
      })
    },
    hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)} return h.toString(16) }
  },

  mounted(){
    registerDemTintProtocol(maplibregl)
    const h = document.querySelector('#handle-'+this.item.id)
    if(h) h.innerHTML = `<span style="font-size: large;">${this.item.label}</span>`
    this.ensure()
    this.apply()
  }
}
</script>

<style scoped>
.oh-chip-lg { font-size: 15px; padding: 8px 12px; }

/* ルートは固定幅で横伸びしない */
.oh-demtint-root { box-sizing: border-box; }

/* Advanced トグル */
.oh-adv-toggle { margin-bottom: 8px; }

/* Advanced パネルは薄い背景色＋角丸、横幅固定 */
.oh-adv-panel {
  background: rgba(0,0,0,0.04);
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
  margin-bottom: 10px;
}
.oh-adv-breadcrumb {
  font-size: 12px;
  color: #555;
  margin-bottom: 20px;
}

/* 数値入力：均等幅にするので max-width は外し、最小幅のみ */
.oh-num { min-width: 0; }

/* ボタン横幅（左右均等） */
.oh-btn-w { flex: 1 1 0; min-width: 0; }

.oh-sublabel {
  font-size: 14px;
  margin-bottom: 10px;
}
</style>
