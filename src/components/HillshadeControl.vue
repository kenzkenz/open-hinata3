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
        { name: 'Night', method: 'combined', exaggeration: 0.55, direction: 315, altitude: 20 },

        // ★ 追加：MPI風 RRIM プリセット（必要なければ削除OK）
        // { name: 'RRIM (MPI-like)', method: 'multidirectional', exaggeration: 0.55,
        //   mdDirections: [260, 290, 315, 340, 20, 45],
        //   mdAltitudes:  [15,  20,  25,  25,  20, 15],
        //   mdHighlights: ['#ad2e24','#c3382a','#d9472e','#e85b3a','#f0714a','#f68c5e'],
        //   mdShadows:    ['#1b3a5b','#15445f','#0f4c5d','#0b5a63','#0f6a6a','#147a74']
        // }
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
    // ---- store 側の一本化された状態を参照 ----
    enabled: {
      get () { return this.$store.state.hillshade.enabled },
      set (v) { this.$store.commit('SET_HS_ENABLED', !!v) }
    },
    enabledMaps () { return this.$store.state.hillshade.maps || {} },
    params () { return this.$store.state.hillshade.params }, // ← ここが中核

    mdCount () {
      const p = this.params
      return Math.min(p.mdDirections.length, p.mdAltitudes.length, p.mdHighlights.length, p.mdShadows.length)
    },
    anchorId () { return this.insertBeforeLayerId ?? this.anchorCandidateId }
  },
  watch: {
    insertBeforeLayerId () { this.syncAllMaps() },

    // ON/OFF 変化で同期
    enabled () { this.syncAllMaps() },
    enabledMaps: { handler () { this.syncAllMaps() }, deep: true },

    // 描画パラメータ（store）変化で同期
    params: { handler () { this.syncAllMaps() }, deep: true },

    // map が後から来ても OK
    map01: { immediate: true, handler (m) { if (m) this.attachToMap(m, 'map01') } },
    map02: { immediate: true, handler (m) { if (m) this.attachToMap(m, 'map02') } }
  },
  created () {
    // 初期値を store へ（未設定時のみ）
    if (typeof this.$store.state.hillshade.enabled !== 'boolean') {
      this.$store.commit('SET_HS_ENABLED', !!this.startEnabled)
    }
    if (!this.$store.state.hillshade.maps) {
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
      const p = this.params
      const asArr = v => Array.isArray(v) ? v.slice() : [v]
      let dirs = asArr(p.mdDirections)
      let alts = asArr(p.mdAltitudes)
      let hls  = asArr(p.mdHighlights)
      let shs  = asArr(p.mdShadows)
      let n = Math.min(dirs.length, alts.length, hls.length, shs.length)
      if (n <= 0) return { dirs:[315], alts:[30], hls:['#fff4cc'], shs:['#3b3251'] }
      dirs = dirs.slice(0, n); alts = alts.slice(0, n)
      const safeHL = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i===0?'#fff4cc':'#dcdcdc')
      const safeSH = (c, i) => (typeof c === 'string' && c.trim()) ? c : (i===0?'#3b3251':'#888888')
      hls  = hls.slice(0, n).map(safeHL)
      shs  = shs.slice(0, n).map(safeSH)
      return { dirs, alts, hls, shs }
    },

    buildPaintObject () {
      const p = this.params
      const paint = { 'hillshade-exaggeration': p.exaggeration }
      if (p.method === 'multidirectional') {
        const { dirs, alts, hls, shs } = this.normalizeMultiDirectional()
        paint['hillshade-method'] = 'multidirectional'
        paint['hillshade-illumination-direction'] = dirs
        paint['hillshade-illumination-altitude']  = alts
        paint['hillshade-highlight-color']        = hls
        paint['hillshade-shadow-color']           = shs
      } else {
        paint['hillshade-method'] = p.method // 'combined' など
        paint['hillshade-illumination-direction'] = p.direction
        paint['hillshade-illumination-altitude']  = p.altitude
      }
      return paint
    },

    /* ========== 同期 ========== */
    syncAllMaps () { this.mapKeys().forEach(k => this.syncToMap(k)) },

    syncToMap (mapKey) {
      const map = this.getMapByKey(mapKey)
      if (!map) return

      const isAllEnabled = !!this.$store.state.hillshade.enabled
      const isMapEnabled = !!(this.$store.state.hillshade.maps && this.$store.state.hillshade.maps[mapKey])
      if (!isAllEnabled || !isMapEnabled) { this.removeLayerIfExists(map); return }

      this.ensureDemSource(map)

      const paint = this.buildPaintObject()
      const layerExists = !!map.getLayer(this.LAYER_ID)

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
        map.addLayer({ id: this.LAYER_ID, type: 'hillshade', source: this.demSourceId, paint }, this.anchorId)
        this.moveLayerIfExists(map)
        return
      }

      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color-transition', {duration:0}) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color-transition',   {duration:0}) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-direction', paint['hillshade-illumination-direction']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-illumination-altitude',  paint['hillshade-illumination-altitude']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-highlight-color',        paint['hillshade-highlight-color']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-shadow-color',           paint['hillshade-shadow-color']) } catch (e) {}
      try { map.setPaintProperty(this.LAYER_ID, 'hillshade-exaggeration',           paint['hillshade-exaggeration']) } catch (e) {}

      this.moveLayerIfExists(map)
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
      map.addSource(this.demSourceId, { type: 'raster-dem', url: this.demTilesUrl, tileSize: 256 })
    },
    moveLayerIfExists (map) {
      if (!map.getLayer(this.LAYER_ID)) return
      try { if (this.anchorId) map.moveLayer(this.LAYER_ID, this.anchorId) } catch (e) {}
    },
    removeLayerIfExists (map) {
      if (map.getLayer(this.LAYER_ID)) map.removeLayer(this.LAYER_ID)
    },
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

    /* ========== 公開API（enabled/maps は既存ミューテーション） ========== */
    enable ()  { this.$store.commit('SET_HS_ENABLED', true)  },
    disable () { this.$store.commit('SET_HS_ENABLED', false) },
    toggle ()  { this.$store.commit('SET_HS_ENABLED', !this.$store.state.hillshade.enabled) },
    enableFor  (k) { this.$store.commit('SET_HS_FOR', { mapKey: k, enabled: true  }) },
    disableFor (k) { this.$store.commit('SET_HS_FOR', { mapKey: k, enabled: false }) },
    toggleFor  (k) {
      const cur = !!(this.$store.state.hillshade.maps && this.$store.state.hillshade.maps[k])
      this.$store.commit('SET_HS_FOR', { mapKey: k, enabled: !cur })
    },

    /* ========== ホットキー（params は store へ書く） ========== */
    onKeydown (e) {
      if (!e.altKey) return
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.key) {
        case 'h': case 'H': {
          const next = (this.params.method === 'multidirectional') ? 'combined' : 'multidirectional'
          this.$store.commit('HS_SET_PARAM', { key: 'method', value: next })
          this.syncAllMaps()
          break
        }
        case 'j': case 'J': {
          const v = Math.max(0, +(this.params.exaggeration - 0.05).toFixed(2))
          this.$store.commit('HS_SET_PARAM', { key: 'exaggeration', value: v })
          this.syncAllMaps()
          break
        }
        case 'k': case 'K': {
          const v = Math.min(1, +(this.params.exaggeration + 0.05).toFixed(2))
          this.$store.commit('HS_SET_PARAM', { key: 'exaggeration', value: v })
          this.syncAllMaps()
          break
        }
        case 'ArrowLeft':
          if (this.params.method !== 'multidirectional') {
            const v = (this.params.direction + 360 - 5) % 360
            this.$store.commit('HS_SET_PARAM', { key: 'direction', value: v })
            this.syncAllMaps()
          }
          break
        case 'ArrowRight':
          if (this.params.method !== 'multidirectional') {
            const v = (this.params.direction + 5) % 360
            this.$store.commit('HS_SET_PARAM', { key: 'direction', value: v })
            this.syncAllMaps()
          }
          break
      }
    },

    /* ========== プリセット適用（store に反映） ========== */
    applyPreset (p) {
      this.$store.commit('HS_SET_PARAM', { key: 'method', value: p.method })
      this.$store.commit('HS_SET_PARAM', { key: 'exaggeration', value: p.exaggeration })
      if (p.method === 'multidirectional') {
        this.$store.commit('HS_SET_PARAM', { key: 'mdDirections', value: p.mdDirections.slice() })
        this.$store.commit('HS_SET_PARAM', { key: 'mdAltitudes',  value: p.mdAltitudes.slice() })
        this.$store.commit('HS_SET_PARAM', { key: 'mdHighlights', value: p.mdHighlights.slice() })
        this.$store.commit('HS_SET_PARAM', { key: 'mdShadows',    value: p.mdShadows.slice() })
      } else {
        if (p.direction != null) this.$store.commit('HS_SET_PARAM', { key: 'direction', value: p.direction })
        if (p.altitude  != null) this.$store.commit('HS_SET_PARAM', { key: 'altitude',  value: p.altitude  })
      }
      this.syncAllMaps()
    }
  }
}
</script>

<style scoped>
@media (max-width: 520px) {
  .v-card { min-width: 280px; }
}
</style>
