

<script>
export default {
  name: 'HillshadeControl', // Vue3 + Vuetify3（Options API）
  props: {
    map01: { type: Object, required: true },
    map02: { type: Object, default: null },
    demSourceId: { type: String, default: 'terrain' },
    demTilesUrl: { type: String, default: '' },
    insertBeforeLayerId: { type: String, default: undefined },
    startEnabled: { type: Boolean, default: false },   // 初期化時にストアへ反映
    autoAnchor: { type: Boolean, default: true }
  },
  data () {
    return {
      LAYER_ID: 'oh3-hillshade',
      // 描画パラメータはローカル管理（enabled/可視はストア）
      state: {
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
      anchorCandidateId: undefined,
      onStyleDataHandler01: null,
      onStyleDataHandler02: null
    }
  },
  computed: {
    // ストアの全体ON/OFF
    enabled: {
      get () { return this.$store.state.hsEnabled },
      set (v) { this.$store.commit('SET_HS_ENABLED', !!v) }
    },
    // ストアの個別ON/OFF（必要に応じて外から直接 commit してもOK）
    enabledMaps () { return this.$store.state.hsEnabledMaps },

    mdCount () {
      const s = this.state
      return Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length)
    },
    // 実際に使う “挿入先” レイヤID（手動指定優先、無ければ自動検出）
    anchorId () { return this.insertBeforeLayerId ?? this.anchorCandidateId }
  },
  watch: {
    insertBeforeLayerId () { this.syncAllMaps() },

    // ストアの可視が変われば同期
    enabled () { this.syncAllMaps() },
    enabledMaps: {
      handler () { this.syncAllMaps() },
      deep: true
    },

    // 描画パラメータ変更（両方に反映）
    'state.method' () { this.syncAllMaps() },
    'state.exaggeration' () { this.syncAllMaps() },
    'state.direction' () { this.syncAllMaps() },
    'state.altitude' () { this.syncAllMaps() },
    state: { handler () { this.syncAllMaps() }, deep: true },

    // mapが後から来るケースも安全に
    map01: {
      immediate: true,
      handler (m) { if (m) this.attachToMap(m, 'map01') }
    },
    map02: {
      immediate: true,
      handler (m) { if (m) this.attachToMap(m, 'map02') }
    }
  },
  created () {
    // 初期値をストアへ（未設定時だけ）
    if (typeof this.$store.state.hsEnabled !== 'boolean') {
      this.$store.commit('SET_HS_ENABLED', !!this.startEnabled)
    }
    if (!this.$store.state.hsEnabledMaps) {
      this.$store.commit('SET_HS_FOR', { mapKey: 'map01', enabled: true })
      this.$store.commit('SET_HS_FOR', { mapKey: 'map02', enabled: true })
    }
  },
  mounted () {
    if (this.map01) this.attachToMap(this.map01, 'map01')
    if (this.map02) this.attachToMap(this.map02, 'map02')
    window.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.onKeydown)
    if (this.map01 && this.onStyleDataHandler01) this.map01.off('styledata', this.onStyleDataHandler01)
    if (this.map02 && this.onStyleDataHandler02) this.map02.off('styledata', this.onStyleDataHandler02)
  },
  methods: {
    /* ========== 共通ユーティリティ ========== */
    getMapByKey (k) { return k === 'map02' ? this.map02 : this.map01 },
    mapKeys () { return [ 'map01', ...(this.map02 ? ['map02'] : []) ] },

    /* ========== Paint 構築 ========== */
    normalizeMultiDirectional () {
      const asArr = v => Array.isArray(v) ? v.slice() : [v]
      let dirs = asArr(this.state.mdDirections)
      let alts = asArr(this.state.mdAltitudes)
      let hls  = asArr(this.state.mdHighlights)
      let shs  = asArr(this.state.mdShadows)

      let n = Math.min(dirs.length, alts.length, hls.length, shs.length)
      if (n <= 0) {
        return { dirs: [315], alts: [30], hls: ['#fff4cc'], shs: ['#3b3251'] }
      }
      dirs = dirs.slice(0, n)
      alts = alts.slice(0, n)
      const safeHL = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i === 0 ? '#fff4cc' : '#dcdcdc')
      const safeSH = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i === 0 ? '#3b3251' : '#888888')
      hls = hls.slice(0, n).map(safeHL)
      shs = shs.slice(0, n).map(safeSH)
      return { dirs, alts, hls, shs }
    },

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

    /* ========== 核：同期 ========== */
    syncAllMaps () { this.mapKeys().forEach(k => this.syncToMap(k)) },

    syncToMap (mapKey) {
      const map = this.getMapByKey(mapKey)
      if (!map) return

      // ストアのON/OFFを見る
      const isAllEnabled = !!this.$store.state.hsEnabled
      const isMapEnabled = !!(this.$store.state.hsEnabledMaps && this.$store.state.hsEnabledMaps[mapKey])

      // 全体OFF or 当該マップOFF → レイヤ削除
      if (!isAllEnabled || !isMapEnabled) {
        this.removeLayerIfExists(map)
        return
      }

      this.ensureDemSource(map)

      const paint = this.buildPaintObject()
      const layerExists = !!map.getLayer(this.LAYER_ID)

      // 方式変更 or 配列長変更ならレイヤ張り替え
      let needRecreate = false
      if (layerExists) {
        const curMethod = map.getPaintProperty(this.LAYER_ID, 'hillshade-method')
        const curDir    = map.getPaintProperty(this.LAYER_ID, 'hillshade-illumination-direction')
        const curHL     = map.getPaintProperty(this.LAYER_ID, 'hillshade-highlight-color')
        const isArray   = v => Array.isArray(v)
        const len = v => (Array.isArray(v) ? v.length : 1)
        if (curMethod !== paint['hillshade-method']) needRecreate = true
        if (isArray(curDir) !== isArray(paint['hillshade-illumination-direction'])) needRecreate = true
        if (isArray(curHL)  !== isArray(paint['hillshade-highlight-color'])) needRecreate = true
        if (isArray(curDir) && isArray(paint['hillshade-illumination-direction']) &&
            len(curDir) !== len(paint['hillshade-illumination-direction'])) needRecreate = true
        if (isArray(curHL) && isArray(paint['hillshade-highlight-color']) &&
            len(curHL) !== len(paint['hillshade-highlight-color'])) needRecreate = true
      }

      if (layerExists && needRecreate) {
        try { map.removeLayer(this.LAYER_ID) } catch (e) {}
      }
      if (!map.getLayer(this.LAYER_ID)) {
        map.addLayer({
          id: this.LAYER_ID,
          type: 'hillshade',
          source: this.demSourceId,
          paint
        }, this.anchorId)
        this.moveLayerIfExists(map)
        return
      }

      // 個別更新（色補間を切って安全に）
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color-transition', {duration:0}) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color-transition',   {duration:0}) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-direction', paint['hillshade-illumination-direction']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-altitude',  paint['hillshade-illumination-altitude']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color',        paint['hillshade-highlight-color']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color',           paint['hillshade-shadow-color']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-exaggeration',           paint['hillshade-exaggeration']) } catch (e) {}

      this.moveLayerIfExists(map)

      map.resize()

    },

    /* ========== マップ接続 ========== */
    attachToMap (m, mapKey) {
      const init = () => {
        if (this.autoAnchor) this.anchorCandidateId = this.detectTopLabelLayerId(m)
        this.syncToMap(mapKey)
      }
      if (m.isStyleLoaded && m.isStyleLoaded()) init()
      else m.once('load', init)

      const handler = () => {
        if (this.autoAnchor) this.anchorCandidateId = this.detectTopLabelLayerId(m)
        this.syncToMap(mapKey)
      }
      if (mapKey === 'map01') {
        if (this.onStyleDataHandler01) { try { m.off('styledata', this.onStyleDataHandler01) } catch (e) {} }
        this.onStyleDataHandler01 = handler
      } else {
        if (this.onStyleDataHandler02) { try { m.off('styledata', this.onStyleDataHandler02) } catch (e) {} }
        this.onStyleDataHandler02 = handler
      }
      m.on('styledata', handler)
    },

    /* ========== 周辺ユーティリティ ========== */
    ensureDemSource (map) {
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

    moveLayerIfExists (map) {
      if (!map.getLayer(this.LAYER_ID)) return
      try { if (this.anchorId) map.moveLayer(this.LAYER_ID, this.anchorId) } catch (e) {}
    },
    removeLayerIfExists (map) {
      if (map.getLayer(this.LAYER_ID)) map.removeLayer(this.LAYER_ID)
    },

    // 最上位のラベル=最上位symbol を検出
    detectTopLabelLayerId (map) {
      const style = map?.getStyle?.()
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

    /* ========== 公開API（任意） ========== */
    // 外部が this.$refs.hs.enableFor('map02') などを使いたい場合も残しておく
    enable ()  { this.$store.commit('SET_HS_ENABLED', true)  },
    disable () { this.$store.commit('SET_HS_ENABLED', false) },
    toggle ()  { this.$store.commit('SET_HS_ENABLED', !this.$store.state.hsEnabled) },
    enableFor  (k) { this.$store.commit('SET_HS_FOR', { mapKey: k, enabled: true  }) },
    disableFor (k) { this.$store.commit('SET_HS_FOR', { mapKey: k, enabled: false }) },
    toggleFor  (k) {
      const cur = !!(this.$store.state.hsEnabledMaps && this.$store.state.hsEnabledMaps[k])
      this.$store.commit('SET_HS_FOR', { mapKey: k, enabled: !cur })
    },

    /* ========== ホットキー ========== */
    onKeydown (e) {
      if (!e.altKey) return
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.key) {
        case 'h': case 'H':
          this.state.method = (this.state.method === 'multidirectional') ? 'combined' : 'multidirectional'
          this.syncAllMaps(); break
        case 'j': case 'J':
          this.state.exaggeration = Math.max(0, +(this.state.exaggeration - 0.05).toFixed(2))
          this.syncAllMaps(); break
        case 'k': case 'K':
          this.state.exaggeration = Math.min(1, +(this.state.exaggeration + 0.05).toFixed(2))
          this.syncAllMaps(); break
        case 'ArrowLeft':
          if (this.state.method !== 'multidirectional') {
            this.state.direction = (this.state.direction + 360 - 5) % 360
            this.syncAllMaps()
          }
          break
        case 'ArrowRight':
          if (this.state.method !== 'multidirectional') {
            this.state.direction = (this.state.direction + 5) % 360
            this.syncAllMaps()
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




<!--<template>-->
<!--  <v-card class="pa-3" elevation="6" rounded="xl" style="min-width: 320px;">-->
<!--    &lt;!&ndash; ヘッダ：ON/OFF &ndash;&gt;-->
<!--    <div class="d-flex align-center justify-space-between mb-2">-->
<!--      <div class="text-subtitle-1 font-weight-bold">地形×ヒルシェード</div>-->
<!--      <v-switch v-model="state.enabled" inset hide-details color="primary" />-->
<!--    </div>-->

<!--    &lt;!&ndash; プリセット &ndash;&gt;-->
<!--    <div class="d-flex flex-wrap mb-2" style="gap:8px">-->
<!--      <v-chip-->
<!--          v-for="p in presets" :key="p.name"-->
<!--          size="small" variant="outlined" color="primary"-->
<!--          @click="applyPreset(p)"-->
<!--      >{{ p.name }}</v-chip>-->
<!--    </div>-->

<!--    &lt;!&ndash; 方式 &ndash;&gt;-->
<!--    <v-select-->
<!--        v-model="state.method" :items="methodItems" label="方式"-->
<!--        density="comfortable" variant="outlined" hide-details class="mb-3"-->
<!--    />-->

<!--    &lt;!&ndash; 強調 &ndash;&gt;-->
<!--    <v-slider-->
<!--        v-model="state.exaggeration"-->
<!--        :step="0.01" :min="0" :max="1"-->
<!--        label="強調（Exaggeration）" show-ticks="always" thumb-label-->
<!--        class="mb-4"-->
<!--    />-->

<!--    &lt;!&ndash; Multidirectional: 光源配列 &ndash;&gt;-->
<!--    <template v-if="state.method === 'multidirectional'">-->
<!--      <div class="text-caption mb-2">光源（方向°／高度°／色）</div>-->
<!--      <div v-for="i in mdCount" :key="'md-'+(i-1)" class="d-flex align-center mb-2" style="gap:8px">-->
<!--        <v-text-field-->
<!--            v-model.number="state.mdDirections[i-1]"-->
<!--            type="number" :min="0" :max="359"-->
<!--            label="方位" density="compact" variant="outlined" hide-details-->
<!--            style="max-width:90px"-->
<!--        />-->
<!--        <v-text-field-->
<!--            v-model.number="state.mdAltitudes[i-1]"-->
<!--            type="number" :min="0" :max="90"-->
<!--            label="高度" density="compact" variant="outlined" hide-details-->
<!--            style="max-width:90px"-->
<!--        />-->
<!--        <v-text-field-->
<!--            v-model="state.mdHighlights[i-1]"-->
<!--            label="HL" density="compact" variant="outlined" hide-details-->
<!--            style="max-width:110px"-->
<!--        />-->
<!--        <v-text-field-->
<!--            v-model="state.mdShadows[i-1]"-->
<!--            label="SH" density="compact" variant="outlined" hide-details-->
<!--            style="max-width:110px"-->
<!--        />-->
<!--        <v-btn icon size="28" variant="text" @click="removeLight(i-1)">-->
<!--          <v-icon>mdi-delete-outline</v-icon>-->
<!--        </v-btn>-->
<!--      </div>-->
<!--      <div class="d-flex">-->
<!--        <v-btn block color="primary" variant="tonal" @click="addLight">光源を追加</v-btn>-->
<!--      </div>-->
<!--    </template>-->

<!--    &lt;!&ndash; 単一光源モード &ndash;&gt;-->
<!--    <template v-else>-->
<!--      <div class="d-flex mb-2" style="gap:12px">-->
<!--        <v-text-field v-model.number="state.direction" type="number" :min="0" :max="359"-->
<!--                      label="方位(°)" density="comfortable" variant="outlined" />-->
<!--        <v-text-field v-model.number="state.altitude"  type="number" :min="0" :max="90"-->
<!--                      label="高度(°)" density="comfortable" variant="outlined" />-->
<!--      </div>-->
<!--      <div class="text-caption">Alt+←/→ で方位、Alt+J/K で強弱、Alt+H 方式トグル</div>-->
<!--    </template>-->
<!--  </v-card>-->
<!--</template>-->

<!--<script>-->
<!--export default {-->
<!--  name: 'HillshadeControl', // Vue3 + Vuetify3（Options API）-->
<!--  props: {-->
<!--    map: { type: Object, required: true },-->
<!--    demSourceId: { type: String, default: 'terrain' }, // Terrainと共有想定-->
<!--    demTilesUrl: { type: String, default: '' },        // 無いなら既存ソースを再利用-->
<!--    insertBeforeLayerId: { type: String, default: undefined }, // 明示アンカー-->
<!--    startEnabled: { type: Boolean, default: false },-->
<!--    autoAnchor: { type: Boolean, default: true }       // 最上位ラベル直下へ自動配置-->
<!--  },-->
<!--  data () {-->
<!--    return {-->
<!--      LAYER_ID: 'oh3-hillshade',-->
<!--      state: {-->
<!--        enabled: false,-->
<!--        method: 'multidirectional', // or 'combined'-->
<!--        exaggeration: 0.6,-->
<!--        // 単一光源-->
<!--        direction: 315,-->
<!--        altitude: 35,-->
<!--        // 複数光源（配列長を揃える）-->
<!--        mdDirections: [270, 315, 0, 45],-->
<!--        mdAltitudes:  [30, 30, 30, 30],-->
<!--        mdHighlights: ['#fff4cc', '#ffeaa1', '#eaffd0', '#dff8ff'],-->
<!--        mdShadows:    ['#3b3251', '#2e386f', '#2a2a6e', '#3a2d58']-->
<!--      },-->
<!--      presets: [-->
<!--        { name: 'Soft', method: 'multidirectional', exaggeration: 0.5,-->
<!--          mdDirections: [270,315,0,45], mdAltitudes:[25,25,25,25],-->
<!--          mdHighlights: ['#f7f7f7','#f3f6ff','#f6fff0','#f0fbff'],-->
<!--          mdShadows: ['#5a5a5a','#4a4a5f','#3f3f58','#4a4a55'] },-->
<!--        { name: 'Crisp', method: 'combined', exaggeration: 0.7, direction: 320, altitude: 30 },-->
<!--        { name: 'Sunset', method: 'multidirectional', exaggeration: 0.6,-->
<!--          mdDirections:[260,300,340], mdAltitudes:[18,22,25],-->
<!--          mdHighlights:['#ffd6a5','#ffe8b6','#ffd1dc'],-->
<!--          mdShadows:['#3c2d4f','#2f2f63','#2a2a6e'] },-->
<!--        { name: 'Night', method: 'combined', exaggeration: 0.55, direction: 315, altitude: 20 }-->
<!--      ],-->
<!--      methodItems: [-->
<!--        { title: 'Multidirectional', value: 'multidirectional' },-->
<!--        { title: 'Combined', value: 'combined' }-->
<!--      ],-->
<!--      anchorCandidateId: undefined,    // 自動検出したアンカー（最上位ラベルID）-->
<!--      onStyleDataHandler: null-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    mdCount () {-->
<!--      const s = this.state-->
<!--      return Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length)-->
<!--    },-->
<!--    // 実際に使う “挿入先” レイヤID（手動指定優先、無ければ自動検出）-->
<!--    anchorId () { return this.insertBeforeLayerId ?? this.anchorCandidateId }-->
<!--  },-->
<!--  watch: {-->
<!--    insertBeforeLayerId () { this.moveLayerIfExists() },-->
<!--    'state.enabled' () { this.syncToMap() },-->
<!--    'state.method' () { this.syncToMap() },-->
<!--    'state.exaggeration' () { this.syncToMap() },-->
<!--    'state.direction' () { this.syncToMap() },-->
<!--    'state.altitude' () { this.syncToMap() },-->
<!--    state: { handler () { this.syncToMap() }, deep: true },-->
<!--    // mapが後から来るケースも安全に-->
<!--    map: {-->
<!--      immediate: true,-->
<!--      handler (m) { if (m) this.attachToMap(m) }-->
<!--    }-->
<!--  },-->
<!--  created () {-->
<!--    this.state.enabled = !!this.startEnabled-->
<!--  },-->
<!--  mounted () {-->
<!--    if (this.map) this.attachToMap(this.map)-->
<!--    window.addEventListener('keydown', this.onKeydown)-->
<!--  },-->
<!--  beforeUnmount () {-->
<!--    window.removeEventListener('keydown', this.onKeydown)-->
<!--    if (this.map && this.onStyleDataHandler) this.map.off('styledata', this.onStyleDataHandler)-->
<!--  },-->
<!--  methods: {-->
<!--    buildPaintObject () {-->
<!--      const p = { 'hillshade-exaggeration': this.state.exaggeration }-->
<!--      if (this.state.method === 'multidirectional') {-->
<!--        const { dirs, alts, hls, shs } = this.normalizeMultiDirectional()-->
<!--        p['hillshade-method'] = 'multidirectional'-->
<!--        p['hillshade-illumination-direction'] = dirs-->
<!--        p['hillshade-illumination-altitude']  = alts-->
<!--        p['hillshade-highlight-color']        = hls-->
<!--        p['hillshade-shadow-color']           = shs-->
<!--      } else {-->
<!--        p['hillshade-method'] = this.state.method // 'combined' など-->
<!--        p['hillshade-illumination-direction'] = this.state.direction-->
<!--        p['hillshade-illumination-altitude']  = this.state.altitude-->
<!--      }-->
<!--      return p-->
<!--    },-->

<!--    // 既存の ensureDemSource/ensureLayer/moveLayerIfExists はそのまま使います-->
<!--    syncToMap () {-->
<!--      const map = this.map-->
<!--      if (!this.state.enabled) { this.removeLayerIfExists(); return }-->

<!--      this.ensureDemSource()-->

<!--      const paint = this.buildPaintObject()-->
<!--      const layerExists = !!map.getLayer(this.LAYER_ID)-->

<!--      // -&#45;&#45; ここがポイント：配列長変化 or 方式切替っぽいときは張り直し -&#45;&#45;-->
<!--      let needRecreate = false-->
<!--      if (layerExists) {-->
<!--        const s = map.getStyle()-->
<!--        const l = s && s.layers && s.layers.find(x => x.id === this.LAYER_ID)-->
<!--        const curMethod = map.getPaintProperty(this.LAYER_ID, 'hillshade-method')-->
<!--        const curDir    = map.getPaintProperty(this.LAYER_ID, 'hillshade-illumination-direction')-->
<!--        const curHL     = map.getPaintProperty(this.LAYER_ID, 'hillshade-highlight-color')-->
<!--        const isArray   = v => Array.isArray(v)-->
<!--        const len = v => (Array.isArray(v) ? v.length : 1)-->

<!--        // 方式が変わる、または配列長が変わる場合は再作成（補間回避）-->
<!--        if (curMethod !== paint['hillshade-method']) needRecreate = true-->
<!--        if (isArray(curDir) !== isArray(paint['hillshade-illumination-direction'])) needRecreate = true-->
<!--        if (isArray(curHL)  !== isArray(paint['hillshade-highlight-color'])) needRecreate = true-->
<!--        if (isArray(curDir) && isArray(paint['hillshade-illumination-direction']) &&-->
<!--            len(curDir) !== len(paint['hillshade-illumination-direction'])) needRecreate = true-->
<!--        if (isArray(curHL) && isArray(paint['hillshade-highlight-color']) &&-->
<!--            len(curHL) !== len(paint['hillshade-highlight-color'])) needRecreate = true-->
<!--      }-->

<!--      if (layerExists && needRecreate) {-->
<!--        map.removeLayer(this.LAYER_ID)-->
<!--      }-->
<!--      if (!map.getLayer(this.LAYER_ID)) {-->
<!--        map.addLayer({-->
<!--          id: this.LAYER_ID,-->
<!--          type: 'hillshade',-->
<!--          source: this.demSourceId,-->
<!--          paint-->
<!--        }, this.anchorId)-->
<!--        this.moveLayerIfExists()-->
<!--        return-->
<!--      }-->

<!--      // ここまで来たら方式・配列長は同じ → 個別更新でもOK（補間OFFにする保険付き）-->
<!--      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color-transition', {duration:0}) } catch (e) {}-->
<!--      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color-transition',   {duration:0}) } catch (e) {}-->
<!--      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-direction', paint['hillshade-illumination-direction']) } catch (e) {}-->
<!--      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-altitude',  paint['hillshade-illumination-altitude']) } catch (e) {}-->
<!--      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color',        paint['hillshade-highlight-color']) } catch (e) {}-->
<!--      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color',           paint['hillshade-shadow-color']) } catch (e) {}-->
<!--      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-exaggeration',           paint['hillshade-exaggeration']) } catch (e) {}-->

<!--      this.moveLayerIfExists()-->

<!--      map.resize()-->

<!--    },-->


<!--    // -&#45;&#45; map 接続（後から map が入ってもOK） -&#45;&#45;-->
<!--    attachToMap (m) {-->
<!--      const init = () => {-->
<!--        if (this.autoAnchor) this.anchorCandidateId = this.detectTopLabelLayerId()-->
<!--        this.syncToMap()-->
<!--      }-->
<!--      if (m.isStyleLoaded && m.isStyleLoaded()) init()-->
<!--      else m.once('load', init)-->

<!--      if (this.onStyleDataHandler) {-->
<!--        try { m.off('styledata', this.onStyleDataHandler) } catch (e) {}-->
<!--      }-->
<!--      this.onStyleDataHandler = () => {-->
<!--        if (this.autoAnchor) this.anchorCandidateId = this.detectTopLabelLayerId()-->
<!--        if (this.state.enabled) this.syncToMap()-->
<!--      }-->
<!--      m.on('styledata', this.onStyleDataHandler)-->
<!--    },-->

<!--    // -&#45;&#45; UI -&#45;&#45;-->
<!--    applyPreset (p) {-->
<!--      this.state.method = p.method-->
<!--      this.state.exaggeration = p.exaggeration-->
<!--      if (p.method === 'multidirectional') {-->
<!--        this.state.mdDirections = p.mdDirections.slice()-->
<!--        this.state.mdAltitudes  = p.mdAltitudes.slice()-->
<!--        this.state.mdHighlights = p.mdHighlights.slice()-->
<!--        this.state.mdShadows    = p.mdShadows.slice()-->
<!--      } else {-->
<!--        if (p.direction != null) this.state.direction = p.direction-->
<!--        if (p.altitude  != null) this.state.altitude  = p.altitude-->
<!--      }-->
<!--      this.syncToMap()-->
<!--    },-->
<!--    addLight () {-->
<!--      this.state.mdDirections.push(45)-->
<!--      this.state.mdAltitudes.push(25)-->
<!--      this.state.mdHighlights.push('#eef8ff')-->
<!--      this.state.mdShadows.push('#2a2a6e')-->
<!--    },-->
<!--    removeLight (i) {-->
<!--      if (this.mdCount <= 1) return-->
<!--      this.state.mdDirections.splice(i,1)-->
<!--      this.state.mdAltitudes.splice(i,1)-->
<!--      this.state.mdHighlights.splice(i,1)-->
<!--      this.state.mdShadows.splice(i,1)-->
<!--    },-->

<!--    // -&#45;&#45; Multidirectionalの配列を正規化（長さを揃える＆安全色に） -&#45;&#45;-->
<!--    normalizeMultiDirectional () {-->
<!--      const asArr = v => Array.isArray(v) ? v.slice() : [v]-->
<!--      let dirs = asArr(this.state.mdDirections)-->
<!--      let alts = asArr(this.state.mdAltitudes)-->
<!--      let hls  = asArr(this.state.mdHighlights)-->
<!--      let shs  = asArr(this.state.mdShadows)-->

<!--      let n = Math.min(dirs.length, alts.length, hls.length, shs.length)-->
<!--      if (n <= 0) {-->
<!--        return {-->
<!--          dirs: [315], alts: [30],-->
<!--          hls:  ['#fff4cc'], shs: ['#3b3251']-->
<!--        }-->
<!--      }-->
<!--      dirs = dirs.slice(0, n)-->
<!--      alts = alts.slice(0, n)-->
<!--      const safeHL = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i === 0 ? '#fff4cc' : '#dcdcdc')-->
<!--      const safeSH = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i === 0 ? '#3b3251' : '#888888')-->
<!--      hls  = hls.slice(0, n).map(safeHL)-->
<!--      shs  = shs.slice(0, n).map(safeSH)-->
<!--      return { dirs, alts, hls, shs }-->
<!--    },-->

<!--    // -&#45;&#45; ヒルシェード中核 -&#45;&#45;-->
<!--    ensureDemSource () {-->
<!--      const map = this.map-->
<!--      if (map.getSource(this.demSourceId)) return-->
<!--      if (!this.demTilesUrl) {-->
<!--        console.warn('[Hillshade] DEM source not found and demTilesUrl is empty.')-->
<!--        return-->
<!--      }-->
<!--      map.addSource(this.demSourceId, {-->
<!--        type: 'raster-dem',-->
<!--        url: this.demTilesUrl,-->
<!--        tileSize: 256-->
<!--        // encoding: 'terrarium' // 供給元に合わせる（必要なら指定）-->
<!--      })-->
<!--    },-->

<!--    moveLayerIfExists () {-->
<!--      const map = this.map-->
<!--      if (!map.getLayer(this.LAYER_ID)) return-->
<!--      try { if (this.anchorId) map.moveLayer(this.LAYER_ID, this.anchorId) } catch (e) {}-->
<!--    },-->
<!--    removeLayerIfExists () {-->
<!--      const map = this.map-->
<!--      if (map.getLayer(this.LAYER_ID)) map.removeLayer(this.LAYER_ID)-->
<!--    },-->

<!--    // -&#45;&#45; アンカー検出（最上位のラベル=最上位symbol） -&#45;&#45;-->
<!--    detectTopLabelLayerId () {-->
<!--      const style = this.map?.getStyle?.()-->
<!--      const layers = (style && style.layers) || []-->
<!--      for (let i = layers.length - 1; i >= 0; i&#45;&#45;) {-->
<!--        const l = layers[i]-->
<!--        if (l.type === 'symbol') {-->
<!--          const hasText = !!(l.layout && l.layout['text-field'])-->
<!--          const hasIcon = !!(l.layout && l.layout['icon-image'])-->
<!--          if (hasText || hasIcon) return l.id-->
<!--        }-->
<!--      }-->
<!--      return undefined-->
<!--    },-->

<!--    // -&#45;&#45; 公開API -&#45;&#45;-->
<!--    enable () { this.state.enabled = true; this.syncToMap() },-->
<!--    disable () { this.state.enabled = false; this.syncToMap() },-->
<!--    toggle () { this.state.enabled = !this.state.enabled; this.syncToMap() },-->

<!--    // -&#45;&#45; ホットキー -&#45;&#45;-->
<!--    onKeydown (e) {-->
<!--      if (!e.altKey) return-->
<!--      const tag = (e.target && e.target.tagName) || ''-->
<!--      if (tag === 'INPUT' || tag === 'TEXTAREA') return-->
<!--      switch (e.key) {-->
<!--        case 'h': case 'H':-->
<!--          this.state.method = (this.state.method === 'multidirectional') ? 'combined' : 'multidirectional'-->
<!--          this.syncToMap(); break-->
<!--        case 'j': case 'J':-->
<!--          this.state.exaggeration = Math.max(0, +(this.state.exaggeration - 0.05).toFixed(2))-->
<!--          this.syncToMap(); break-->
<!--        case 'k': case 'K':-->
<!--          this.state.exaggeration = Math.min(1, +(this.state.exaggeration + 0.05).toFixed(2))-->
<!--          this.syncToMap(); break-->
<!--        case 'ArrowLeft':-->
<!--          if (this.state.method !== 'multidirectional') {-->
<!--            this.state.direction = (this.state.direction + 360 - 5) % 360-->
<!--            this.syncToMap()-->
<!--          }-->
<!--          break-->
<!--        case 'ArrowRight':-->
<!--          if (this.state.method !== 'multidirectional') {-->
<!--            this.state.direction = (this.state.direction + 5) % 360-->
<!--            this.syncToMap()-->
<!--          }-->
<!--          break-->
<!--      }-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--@media (max-width: 520px) {-->
<!--  .v-card { min-width: 280px; }-->
<!--}-->
<!--</style>-->
