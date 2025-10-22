<template>
  <v-card class="pa-3" elevation="6" rounded="xl" style="min-width: 320px;">
    <!-- ヘッダ：ON/OFF -->
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="text-subtitle-1 font-weight-bold">地形×ヒルシェード</div>
      <v-switch v-model="state.enabled" inset hide-details color="primary" />
    </div>

    <!-- プリセット -->
    <div class="d-flex flex-wrap mb-2" style="gap:8px">
      <v-chip
          v-for="p in presets" :key="p.name"
          size="small" variant="outlined" color="primary"
          @click="applyPreset(p)"
      >{{ p.name }}</v-chip>
    </div>

    <!-- 方式 -->
    <v-select
        v-model="state.method" :items="methodItems" label="方式"
        density="comfortable" variant="outlined" hide-details class="mb-3"
    />

    <!-- 強調 -->
    <v-slider
        v-model="state.exaggeration"
        :step="0.01" :min="0" :max="1"
        label="強調（Exaggeration）" show-ticks="always" thumb-label
        class="mb-4"
    />

    <!-- Multidirectional: 光源配列 -->
    <template v-if="state.method === 'multidirectional'">
      <div class="text-caption mb-2">光源（方向°／高度°／色）</div>
      <div v-for="i in mdCount" :key="'md-'+(i-1)" class="d-flex align-center mb-2" style="gap:8px">
        <v-text-field
            v-model.number="state.mdDirections[i-1]"
            type="number" :min="0" :max="359"
            label="方位" density="compact" variant="outlined" hide-details
            style="max-width:90px"
        />
        <v-text-field
            v-model.number="state.mdAltitudes[i-1]"
            type="number" :min="0" :max="90"
            label="高度" density="compact" variant="outlined" hide-details
            style="max-width:90px"
        />
        <v-text-field
            v-model="state.mdHighlights[i-1]"
            label="HL" density="compact" variant="outlined" hide-details
            style="max-width:110px"
        />
        <v-text-field
            v-model="state.mdShadows[i-1]"
            label="SH" density="compact" variant="outlined" hide-details
            style="max-width:110px"
        />
        <v-btn icon size="28" variant="text" @click="removeLight(i-1)">
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </div>
      <div class="d-flex">
        <v-btn block color="primary" variant="tonal" @click="addLight">光源を追加</v-btn>
      </div>
    </template>

    <!-- 単一光源モード -->
    <template v-else>
      <div class="d-flex mb-2" style="gap:12px">
        <v-text-field v-model.number="state.direction" type="number" :min="0" :max="359"
                      label="方位(°)" density="comfortable" variant="outlined" />
        <v-text-field v-model.number="state.altitude"  type="number" :min="0" :max="90"
                      label="高度(°)" density="comfortable" variant="outlined" />
      </div>
      <div class="text-caption">Alt+←/→ で方位、Alt+J/K で強弱、Alt+H 方式トグル</div>
    </template>
  </v-card>
</template>

<script>
export default {
  name: 'HillshadeControl', // Vue3 + Vuetify3（Options API）
  props: {
    map: { type: Object, required: true },
    demSourceId: { type: String, default: 'terrain' }, // Terrainと共有想定
    demTilesUrl: { type: String, default: '' },        // 無いなら既存ソースを再利用
    insertBeforeLayerId: { type: String, default: undefined }, // 明示アンカー
    startEnabled: { type: Boolean, default: false },
    autoAnchor: { type: Boolean, default: true }       // 最上位ラベル直下へ自動配置
  },
  data () {
    return {
      LAYER_ID: 'oh3-hillshade',
      state: {
        enabled: false,
        method: 'multidirectional', // or 'combined'
        exaggeration: 0.6,
        // 単一光源
        direction: 315,
        altitude: 35,
        // 複数光源（配列長を揃える）
        mdDirections: [270, 315, 0, 45],
        mdAltitudes:  [30, 30, 30, 30],
        mdHighlights: ['#fff4cc', '#ffeaa1', '#eaffd0', '#dff8ff'],
        mdShadows:    ['#3b3251', '#2e386f', '#2a2a6e', '#3a2d58']
      },
      presets: [
        { name: 'Soft', method: 'multidirectional', exaggeration: 0.5,
          mdDirections: [270,315,0,45], mdAltitudes:[25,25,25,25],
          mdHighlights: ['#f7f7f7','#f3f6ff','#f6fff0','#f0fbff'],
          mdShadows: ['#5a5a5a','#4a4a5f','#3f3f58','#4a4a55'] },
        { name: 'Crisp', method: 'combined', exaggeration: 0.7, direction: 320, altitude: 30 },
        { name: 'Sunset', method: 'multidirectional', exaggeration: 0.6,
          mdDirections:[260,300,340], mdAltitudes:[18,22,25],
          mdHighlights:['#ffd6a5','#ffe8b6','#ffd1dc'],
          mdShadows:['#3c2d4f','#2f2f63','#2a2a6e'] },
        { name: 'Night', method: 'combined', exaggeration: 0.55, direction: 315, altitude: 20 }
      ],
      methodItems: [
        { title: 'Multidirectional', value: 'multidirectional' },
        { title: 'Combined', value: 'combined' }
      ],
      anchorCandidateId: undefined,    // 自動検出したアンカー（最上位ラベルID）
      onStyleDataHandler: null
    }
  },
  computed: {
    mdCount () {
      const s = this.state
      return Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length)
    },
    // 実際に使う “挿入先” レイヤID（手動指定優先、無ければ自動検出）
    anchorId () { return this.insertBeforeLayerId ?? this.anchorCandidateId }
  },
  watch: {
    insertBeforeLayerId () { this.moveLayerIfExists() },
    'state.enabled' () { this.syncToMap() },
    'state.method' () { this.syncToMap() },
    'state.exaggeration' () { this.syncToMap() },
    'state.direction' () { this.syncToMap() },
    'state.altitude' () { this.syncToMap() },
    state: { handler () { this.syncToMap() }, deep: true },
    // mapが後から来るケースも安全に
    map: {
      immediate: true,
      handler (m) { if (m) this.attachToMap(m) }
    }
  },
  created () {
    this.state.enabled = !!this.startEnabled
  },
  mounted () {
    if (this.map) this.attachToMap(this.map)
    window.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.onKeydown)
    if (this.map && this.onStyleDataHandler) this.map.off('styledata', this.onStyleDataHandler)
  },
  methods: {
    buildPaintObject () {
      const p = { 'hillshade-exaggeration': this.state.exaggeration }
      if (this.state.method === 'multidirectional') {
        const { dirs, alts, hls, shs } = this.normalizeMultiDirectional()
        p['hillshade-method'] = 'multidirectional'
        p['hillshade-illumination-direction'] = dirs
        p['hillshade-illumination-altitude']  = alts
        p['hillshade-highlight-color']        = hls
        p['hillshade-shadow-color']           = shs
      } else {
        p['hillshade-method'] = this.state.method // 'combined' など
        p['hillshade-illumination-direction'] = this.state.direction
        p['hillshade-illumination-altitude']  = this.state.altitude
      }
      return p
    },

    // 既存の ensureDemSource/ensureLayer/moveLayerIfExists はそのまま使います
    syncToMap () {
      const map = this.map
      if (!this.state.enabled) { this.removeLayerIfExists(); return }

      this.ensureDemSource()

      const paint = this.buildPaintObject()
      const layerExists = !!map.getLayer(this.LAYER_ID)

      // --- ここがポイント：配列長変化 or 方式切替っぽいときは張り直し ---
      let needRecreate = false
      if (layerExists) {
        const s = map.getStyle()
        const l = s && s.layers && s.layers.find(x => x.id === this.LAYER_ID)
        const curMethod = map.getPaintProperty(this.LAYER_ID, 'hillshade-method')
        const curDir    = map.getPaintProperty(this.LAYER_ID, 'hillshade-illumination-direction')
        const curHL     = map.getPaintProperty(this.LAYER_ID, 'hillshade-highlight-color')
        const isArray   = v => Array.isArray(v)
        const len = v => (Array.isArray(v) ? v.length : 1)

        // 方式が変わる、または配列長が変わる場合は再作成（補間回避）
        if (curMethod !== paint['hillshade-method']) needRecreate = true
        if (isArray(curDir) !== isArray(paint['hillshade-illumination-direction'])) needRecreate = true
        if (isArray(curHL)  !== isArray(paint['hillshade-highlight-color'])) needRecreate = true
        if (isArray(curDir) && isArray(paint['hillshade-illumination-direction']) &&
            len(curDir) !== len(paint['hillshade-illumination-direction'])) needRecreate = true
        if (isArray(curHL) && isArray(paint['hillshade-highlight-color']) &&
            len(curHL) !== len(paint['hillshade-highlight-color'])) needRecreate = true
      }

      if (layerExists && needRecreate) {
        map.removeLayer(this.LAYER_ID)
      }
      if (!map.getLayer(this.LAYER_ID)) {
        map.addLayer({
          id: this.LAYER_ID,
          type: 'hillshade',
          source: this.demSourceId,
          paint
        }, this.anchorId)
        this.moveLayerIfExists()
        return
      }

      // ここまで来たら方式・配列長は同じ → 個別更新でもOK（補間OFFにする保険付き）
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color-transition', {duration:0}) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color-transition',   {duration:0}) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-direction', paint['hillshade-illumination-direction']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-altitude',  paint['hillshade-illumination-altitude']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color',        paint['hillshade-highlight-color']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color',           paint['hillshade-shadow-color']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-exaggeration',           paint['hillshade-exaggeration']) } catch (e) {}

      this.moveLayerIfExists()
    },


    // --- map 接続（後から map が入ってもOK） ---
    attachToMap (m) {
      const init = () => {
        if (this.autoAnchor) this.anchorCandidateId = this.detectTopLabelLayerId()
        this.syncToMap()
      }
      if (m.isStyleLoaded && m.isStyleLoaded()) init()
      else m.once('load', init)

      if (this.onStyleDataHandler) {
        try { m.off('styledata', this.onStyleDataHandler) } catch (e) {}
      }
      this.onStyleDataHandler = () => {
        if (this.autoAnchor) this.anchorCandidateId = this.detectTopLabelLayerId()
        if (this.state.enabled) this.syncToMap()
      }
      m.on('styledata', this.onStyleDataHandler)
    },

    // --- UI ---
    applyPreset (p) {
      this.state.method = p.method
      this.state.exaggeration = p.exaggeration
      if (p.method === 'multidirectional') {
        this.state.mdDirections = p.mdDirections.slice()
        this.state.mdAltitudes  = p.mdAltitudes.slice()
        this.state.mdHighlights = p.mdHighlights.slice()
        this.state.mdShadows    = p.mdShadows.slice()
      } else {
        if (p.direction != null) this.state.direction = p.direction
        if (p.altitude  != null) this.state.altitude  = p.altitude
      }
      this.syncToMap()
    },
    addLight () {
      this.state.mdDirections.push(45)
      this.state.mdAltitudes.push(25)
      this.state.mdHighlights.push('#eef8ff')
      this.state.mdShadows.push('#2a2a6e')
    },
    removeLight (i) {
      if (this.mdCount <= 1) return
      this.state.mdDirections.splice(i,1)
      this.state.mdAltitudes.splice(i,1)
      this.state.mdHighlights.splice(i,1)
      this.state.mdShadows.splice(i,1)
    },

    // --- Multidirectionalの配列を正規化（長さを揃える＆安全色に） ---
    normalizeMultiDirectional () {
      const asArr = v => Array.isArray(v) ? v.slice() : [v]
      let dirs = asArr(this.state.mdDirections)
      let alts = asArr(this.state.mdAltitudes)
      let hls  = asArr(this.state.mdHighlights)
      let shs  = asArr(this.state.mdShadows)

      let n = Math.min(dirs.length, alts.length, hls.length, shs.length)
      if (n <= 0) {
        return {
          dirs: [315], alts: [30],
          hls:  ['#fff4cc'], shs: ['#3b3251']
        }
      }
      dirs = dirs.slice(0, n)
      alts = alts.slice(0, n)
      const safeHL = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i === 0 ? '#fff4cc' : '#dcdcdc')
      const safeSH = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i === 0 ? '#3b3251' : '#888888')
      hls  = hls.slice(0, n).map(safeHL)
      shs  = shs.slice(0, n).map(safeSH)
      return { dirs, alts, hls, shs }
    },

    // --- ヒルシェード中核 ---
    ensureDemSource () {
      const map = this.map
      if (map.getSource(this.demSourceId)) return
      if (!this.demTilesUrl) {
        console.warn('[Hillshade] DEM source not found and demTilesUrl is empty.')
        return
      }
      map.addSource(this.demSourceId, {
        type: 'raster-dem',
        url: this.demTilesUrl,
        tileSize: 256
        // encoding: 'terrarium' // 供給元に合わせる（必要なら指定）
      })
    },
    ensureLayer () {
      const map = this.map
      if (!map.getLayer(this.LAYER_ID)) {
        map.addLayer({
          id: this.LAYER_ID,
          type: 'hillshade',
          source: this.demSourceId,
          paint: { 'hillshade-exaggeration': this.state.exaggeration }
        }, this.anchorId)
      }
      this.moveLayerIfExists()
    },
    moveLayerIfExists () {
      const map = this.map
      if (!map.getLayer(this.LAYER_ID)) return
      try { if (this.anchorId) map.moveLayer(this.LAYER_ID, this.anchorId) } catch (e) {}
    },
    removeLayerIfExists () {
      const map = this.map
      if (map.getLayer(this.LAYER_ID)) map.removeLayer(this.LAYER_ID)
    },
    setPaint (name, value) {
      const map = this.map
      if (!map.getLayer(this.LAYER_ID)) return
      try {
        map.setPaintProperty(this.LAYER_ID, name, value)
      } catch (e) {
        // 型が変わった場合は貼り直して再設定
        this.removeLayerIfExists()
        this.ensureLayer()
        try { map.setPaintProperty(this.LAYER_ID, name, value) } catch (e2) {}
      }
    },


    // --- アンカー検出（最上位のラベル=最上位symbol） ---
    detectTopLabelLayerId () {
      const style = this.map?.getStyle?.()
      const layers = (style && style.layers) || []
      for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i]
        if (l.type === 'symbol') {
          const hasText = !!(l.layout && l.layout['text-field'])
          const hasIcon = !!(l.layout && l.layout['icon-image'])
          if (hasText || hasIcon) return l.id
        }
      }
      return undefined
    },

    // --- 公開API ---
    enable () { this.state.enabled = true; this.syncToMap() },
    disable () { this.state.enabled = false; this.syncToMap() },
    toggle () { this.state.enabled = !this.state.enabled; this.syncToMap() },
    setOrder (beforeId) { this.$emit('update:insertBeforeLayerId', beforeId) },

    // --- ホットキー ---
    onKeydown (e) {
      if (!e.altKey) return
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.key) {
        case 'h': case 'H':
          this.state.method = (this.state.method === 'multidirectional') ? 'combined' : 'multidirectional'
          this.syncToMap(); break
        case 'j': case 'J':
          this.state.exaggeration = Math.max(0, +(this.state.exaggeration - 0.05).toFixed(2))
          this.syncToMap(); break
        case 'k': case 'K':
          this.state.exaggeration = Math.min(1, +(this.state.exaggeration + 0.05).toFixed(2))
          this.syncToMap(); break
        case 'ArrowLeft':
          if (this.state.method !== 'multidirectional') {
            this.state.direction = (this.state.direction + 360 - 5) % 360
            this.syncToMap()
          }
          break
        case 'ArrowRight':
          if (this.state.method !== 'multidirectional') {
            this.state.direction = (this.state.direction + 5) % 360
            this.syncToMap()
          }
          break
      }
    }
  }
}
</script>

<style scoped>
@media (max-width: 520px) {
  .v-card { min-width: 280px; }
}
</style>
