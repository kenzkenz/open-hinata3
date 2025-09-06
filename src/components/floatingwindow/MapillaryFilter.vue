<template>
  <v-card class="p-3" elevation="4">
    <div class="text-subtitle-1 mb-2">Mapillary フィルタ（360° × 検出カテゴリ × クリエイター名）</div>

    <!-- 年度レンジ -->
    <div class="mb-2 d-flex align-center">
      <span class="mr-2">年範囲</span>
      <v-range-slider
          v-model="yearRange"
          :min="minYear"
          :max="maxYear"
          :step="1"
          class="flex-1"
          tick-size="2"
      >
        <template v-slot:append>
          <div class="ml-2 text-caption">{{ yearRange[0] }}–{{ yearRange[1] }}</div>
        </template>
      </v-range-slider>
    </div>

    <!-- 360切替 / 検出カテゴリ / クリエイター名 -->
    <div class="mb-2 d-flex flex-wrap gap-2">
      <v-switch
          v-model="only360"
          color="primary"
          hide-details
          :label="'360°のみ（Graph API）'"
      />
      <v-btn small text @click="resetFilters">リセット</v-btn>
    </div>

    <div class="text-caption mb-1">検出カテゴリ（Map Features）</div>
    <v-chip-group v-model="selectedCats" multiple>
      <v-chip
          v-for="c in CATEGORIES"
          :key="c.id"
          :value="c.id"
          small
          class="ma-1"
          outlined
      >
        {{ c.label }}
      </v-chip>
    </v-chip-group>

    <div class="mt-2">
      <v-text-field
          v-model="creatorNamesText"
          label="クリエイター名（カンマ区切り / 例: userA,userB）"
          dense
          hide-details
      />
    </div>

    <v-divider class="my-3" />
    <div class="text-caption opacity-70">
      * 360°抽出は <code>/images?bbox=...&is_pano=true</code> に <code>creator_username</code> を併用（複数は分割呼び出し）。<br>
      * 検出は <code>/map_features?bbox=...&values=...</code> を取得し、返却の <code>images</code> 配列と 360°画像ID集合を突合。<br>
      * 360°ON時はオーバーレイ（GeoJSON）描画、OFF時は既存レイヤに通常フィルタを適用。
    </div>
  </v-card>
</template>

<script>
import axios from 'axios'
import store from '@/store'

export default {
  name: 'MapillaryFilter',
  props: {
    // ★ 単体IDでも配列でもOK（複数レイヤに一括適用）
    imageLayerId: { type: [String, Array], default: 'mly_image_points' },
    detectionLayerId: { type: [String, Array], default: 'mly_map_feature_point' },
    // store.state の MapLibre インスタンスキー
    mapStoreKey: { type: String, default: 'map01' },
  },
  data () {
    const nowY = (new Date()).getFullYear()
    return {
      // 年レンジ
      minYear: 2014,
      maxYear: nowY,
      yearRange: [2014, nowY],

      // UI
      only360: false,
      selectedCats: [],
      creatorNamesText: '',

      // カテゴリ候補（必要に応じて置換）
      CATEGORIES: [
        { id:'traffic_sign', label:'標識' },
        { id:'crosswalk', label:'横断歩道' },
        { id:'guardrail', label:'ガードレール' },
        { id:'lane_marking', label:'レーンマーキング' },
        { id:'speed_bump', label:'ハンプ' },
        { id:'utility_pole', label:'電柱' },
      ],

      // API & オーバーレイ
      MLY_TOKEN: '', // ← mounted() で自動解決（store / .env）
      panoSrcId: 'mly_pano_overlay_src',
      panoLyrId: 'mly_pano_overlay_lyr',
      featSrcId: 'mly_feat_overlay_src',
      featLyrId: 'mly_feat_overlay_lyr',

      // 内部（debounce / ハンドラ / 360画像ID集合）
      applyFiltersDebounced: null,
      fetchPanoDebounced: null,
      fetchBothDebounced: null,
      onMoveEndBound: null,
      panoImageIdSet: new Set(),
    }
  },
  computed: {
    creatorNames () {
      return (this.creatorNamesText || '')
          .split(',')
          .map(function (s) { return s.trim() })
          .filter(function (s) { return !!s })
    },
  },
  watch: {
    yearRange: { handler () { this.onFiltersChanged() }, deep: true },
    selectedCats: { handler () { this.onFiltersChanged() }, deep: true },
    creatorNamesText () { this.onFiltersChanged() },
    only360 (val) {
      const map = store.state[this.mapStoreKey]
      if (!map) return

      if (val) {
        // 360° ON → 既存の画像レイヤを隠す
        this.toggleBaseImageLayers(false)

        // 以降は既存ロジック
        if (!this.onMoveEndBound) {
          const self = this
          this.onMoveEndBound = this.debounce(function () { self.fetchCompositeInView() }, 200)
        }
        map.on('moveend', this.onMoveEndBound)
        this.fetchCompositeInView()
      } else {
        // 360° OFF → 元の画像レイヤを再表示
        this.toggleBaseImageLayers(true)

        // 以降は既存ロジック
        this.clearPanoOverlay()
        this.clearFeatureOverlay()
        this.panoImageIdSet = new Set()
        if (this.onMoveEndBound) map.off('moveend', this.onMoveEndBound)
        this.applyDetectionsFilter()
      }
    },
  },
  mounted () {
    // トークン解決（優先度: store → Vite env → Vue CLI env）
    try {
      this.MLY_TOKEN = (store.state && store.state.mapillaryToken) ||
          (typeof import_meta_env_available !== 'undefined' ? import.meta.env.VITE_MAPILLARY_TOKEN : (import.meta && import.meta.env && import.meta.env.VITE_MAPILLARY_TOKEN)) ||
          ((typeof process !== 'undefined' && process.env && process.env.VUE_APP_MAPILLARY_TOKEN) || '')
    } catch (e) {
      try {
        this.MLY_TOKEN = (store.state && store.state.mapillaryToken) ||
            ((typeof process !== 'undefined' && process.env && process.env.VUE_APP_MAPILLARY_TOKEN) || '')
      } catch (e2) {
        this.MLY_TOKEN = (store.state && store.state.mapillaryToken) || ''
      }
    }

    // debounce 準備
    const self = this
    this.applyFiltersDebounced = this.debounce(function () { self.applyDetectionsFilter() }, 120)
    this.fetchPanoDebounced = this.debounce(function () { self.fetchPanoInView() }, 200)
    this.fetchBothDebounced = this.debounce(function () { self.fetchCompositeInView() }, 220)

    // 初期適用
    const map = store.state[this.mapStoreKey]
    if (!map) return
        ;(function wait () {
      if (!map.isStyleLoaded()) return requestAnimationFrame(wait)
      self.applyDetectionsFilter()
      self.$emit('ready')
    })()
  },
  methods: {
    // ---------- Utils ----------
    debounce (fn, ms) {
      ms = (typeof ms === 'number') ? ms : 120
      var t = null
      return function () {
        var ctx = this, args = arguments
        if (t) clearTimeout(t)
        t = setTimeout(function () { fn.apply(ctx, args) }, ms)
      }
    },
    asArray (x) { return Array.isArray(x) ? x : [x] },
    yStartMs (y) { return new Date(y,0,1,0,0,0,0).getTime() },
    yEndMs (y) { return new Date(y,11,31,23,59,59,999).getTime() },
    getViewBbox () {
      const map = store.state[this.mapStoreKey]
      if (!map) return null
      const b = map.getBounds()
      return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',')
    },

    toggleBaseImageLayers (show) {
      const map = store.state[this.mapStoreKey]; if (!map) return
      const vis = show ? 'visible' : 'none'
      var arr = this.asArray(this.imageLayerId)
      for (var i=0; i<arr.length; i++) {
        var id = arr[i]
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
      }
    },

    // ---------- /images（360° & クリエイター） ----------
    async fetchImagesByBbox (opt) {
      const base = 'https://graph.mapillary.com/images'
      const bbox = opt && opt.bbox
      const isPano = !opt || typeof opt.isPano === 'undefined' ? true : !!opt.isPano
      const creatorUsername = opt && opt.creatorUsername
      const limit = (opt && opt.limit) || 1000

      const params = {
        access_token: this.MLY_TOKEN,
        fields: 'id,captured_at,computed_geometry,creator_username',
        bbox: bbox,
        limit: limit
      }
      if (isPano) params.is_pano = true
      if (creatorUsername) params.creator_username = creatorUsername

      const out = []
      var url = base, query = Object.assign({}, params)
      for (var guard=0; guard<10; guard++) {
        const resp = await axios.get(url, { params: query })
        const data = resp && resp.data
        if (data && Array.isArray(data.data)) out.push.apply(out, data.data)
        const next = data && data.paging && data.paging.next
        if (!next) break
        url = next; query = undefined
      }
      return out
    },

    async fetchPanoInView () {
      const bbox = this.getViewBbox(); if (!bbox) return []
      if (!this.MLY_TOKEN) { console.warn('[Mapillary] Missing token'); return [] }
      const names = this.creatorNames

      const results = []
      if (names.length === 0) {
        const items = await this.fetchImagesByBbox({ bbox: bbox, isPano: true })
        results.push.apply(results, items)
      } else {
        for (var i=0; i<names.length; i++) {
          const nm = names[i]
          const items = await this.fetchImagesByBbox({ bbox: bbox, isPano: true, creatorUsername: nm })
          results.push.apply(results, items)
        }
      }

      const minMs = this.yStartMs(this.yearRange[0])
      const maxMs = this.yEndMs(this.yearRange[1])
      const ids = []
      const feats = []

      for (var j=0; j<results.length; j++) {
        const it = results[j]
        var t = (typeof it.captured_at === 'number') ? it.captured_at : Date.parse(it.captured_at)
        if (!isFinite(t) || t<minMs || t>maxMs) continue
        const coord = it.computed_geometry && it.computed_geometry.coordinates
        if (!coord) continue
        var creator = it.creator_username || (it.creator && it.creator.username) || null
        ids.push(it.id)
        feats.push({
          type: 'Feature',
          properties: { id: it.id, captured_at: t, creator: creator },
          geometry: { type: 'Point', coordinates: coord }
        })
      }
      this.panoImageIdSet = new Set(ids)
      this.updatePanoOverlay({ type:'FeatureCollection', features:feats })
      this.$emit('pano-count', feats.length)
      return ids
    },

    // ---------- /map_features（カテゴリ）→ 360画像IDで突合 ----------
    async fetchFeaturesInViewAndJoin () {
      const bbox = this.getViewBbox(); if (!bbox) return []
      if (!this.selectedCats.length) {
        this.updateFeatureOverlay({ type:'FeatureCollection', features:[] })
        this.$emit('feature-count', 0)
        return []
      }
      if (!this.MLY_TOKEN) { console.warn('[Mapillary] Missing token'); return [] }

      const valuesParam = this.selectedCats.join(',')
      const base = 'https://graph.mapillary.com/map_features'
      const params = {
        access_token: this.MLY_TOKEN,
        fields: 'id,object_value,object_type,geometry,images',
        bbox: bbox,
        values: valuesParam,
        limit: 1000
      }

      const feats = []
      var url = base, query = Object.assign({}, params)
      for (var guard=0; guard<10; guard++) {
        const resp = await axios.get(url, { params: query })
        const data = resp && resp.data
        if (data && Array.isArray(data.data)) feats.push.apply(feats, data.data)
        const next = data && data.paging && data.paging.next
        if (!next) break
        url = next; query = undefined
      }

      const allowed = this.panoImageIdSet
      const filtered = feats.filter(function (f) {
        return Array.isArray(f.images) && f.images.some(function (id) { return allowed.has(id) })
      })

      const gj = {
        type:'FeatureCollection',
        features: filtered.map(function (f) {
          return { type:'Feature', properties:{ id:f.id, value:f.object_value, type:f.object_type }, geometry: f.geometry }
        })
      }
      this.updateFeatureOverlay(gj)
      this.$emit('feature-count', filtered.length)
      return filtered
    },

    // ---------- 合成（360° + クリエイター + カテゴリ + 年） ----------
    async fetchCompositeInView () {
      if (!this.only360) return
      try {
        await this.fetchPanoInView()
        await this.fetchFeaturesInViewAndJoin()
      } catch (e) {
        console.error('[Mapillary] composite fetch failed', e)
      }
    },

    // ---------- オーバーレイ（360画像点 / Features点） ----------
    ensurePanoOverlay () {
      const map = store.state[this.mapStoreKey]; if (!map) return
      if (!map.getSource(this.panoSrcId)) {
        map.addSource(this.panoSrcId, { type:'geojson', data:{ type:'FeatureCollection', features:[] } })
      }
      if (!map.getLayer(this.panoLyrId)) {
        map.addLayer({
          id:this.panoLyrId, type:'circle', source:this.panoSrcId,
          paint: {
            'circle-radius':['interpolate',['linear'],['zoom'],10,2,16,5],
            'circle-color':'#00A86B',
            'circle-stroke-color':'#003B2F',
            'circle-stroke-width':1
          }
        })
      }
    },
    updatePanoOverlay (geojson) {
      const map = store.state[this.mapStoreKey]; if (!map) return
      this.ensurePanoOverlay()
      const src = map.getSource(this.panoSrcId)
      if (src) src.setData(geojson)
    },
    clearPanoOverlay () {
      const map = store.state[this.mapStoreKey]; if (!map) return
      if (map.getLayer(this.panoLyrId)) map.removeLayer(this.panoLyrId)
      if (map.getSource(this.panoSrcId)) map.removeSource(this.panoSrcId)
    },

    ensureFeatureOverlay () {
      const map = store.state[this.mapStoreKey]; if (!map) return
      if (!map.getSource(this.featSrcId)) {
        map.addSource(this.featSrcId, { type:'geojson', data:{ type:'FeatureCollection', features:[] } })
      }
      if (!map.getLayer(this.featLyrId)) {
        map.addLayer({
          id:this.featLyrId, type:'circle', source:this.featSrcId,
          paint: {
            'circle-radius':['interpolate',['linear'],['zoom'],10,2.2,16,5.5],
            'circle-color':'#2962FF',
            'circle-stroke-color':'#0D47A1',
            'circle-stroke-width':1
          }
        })
      }
    },
    updateFeatureOverlay (geojson) {
      const map = store.state[this.mapStoreKey]; if (!map) return
      this.ensureFeatureOverlay()
      const src = map.getSource(this.featSrcId)
      if (src) src.setData(geojson)
    },
    clearFeatureOverlay () {
      const map = store.state[this.mapStoreKey]; if (!map) return
      if (map.getLayer(this.featLyrId)) map.removeLayer(this.featLyrId)
      if (map.getSource(this.featSrcId)) map.removeSource(this.featSrcId)
    },

    // ---------- 既存タイルレイヤへの通常フィルタ（360OFF時） ----------
    buildDateExpr () {
      const minMs = this.yStartMs(this.yearRange[0])
      const maxMs = this.yEndMs(this.yearRange[1])
      const numCapturedMs = [
        'coalesce',
        ['to-number',['get','captured_at_ms']],
        ['*',['to-number',['get','captured_at']],1] // 数値文字列orms文字列を想定
      ]
      return ['all', ['>=', numCapturedMs, minMs], ['<=', numCapturedMs, maxMs] ]
    },
    buildCategoryExpr () {
      if (!this.selectedCats || !this.selectedCats.length) return null
      const catProp = ['coalesce', ['get','class'], ['get','value'], ['get','feature_type'], ['get','type']]
      return ['in', catProp, ['literal', this.selectedCats]]
    },
    combineAllExpr (parts) {
      const c = []
      for (var i=0; i<parts.length; i++) if (parts[i]) c.push(parts[i])
      return c.length ? ['all', ...c] : null
    },
    applyDetectionsFilter () {
      const map = store.state[this.mapStoreKey]; if (!map) return
      const f = this.combineAllExpr([ this.buildDateExpr(), this.buildCategoryExpr() ])
      const arr = this.asArray(this.detectionLayerId)
      for (var i=0; i<arr.length; i++) {
        const id = arr[i]
        if (map.getLayer(id)) map.setFilter(id, f)
      }
    },

    // ---------- 変更トリガ ----------
    onFiltersChanged () {
      if (this.only360) {
        if (this.fetchBothDebounced) this.fetchBothDebounced()
      } else {
        if (this.applyFiltersDebounced) this.applyFiltersDebounced()
      }
    },

    // ---------- 親から呼べる公開API ----------
    setOnly360 (val) { this.only360 = !!val },
    setYearRange (range) {
      if (Array.isArray(range) && range.length===2) {
        const a = Math.max(this.minYear, Math.min(this.maxYear, Number(range[0])))
        const b = Math.max(this.minYear, Math.min(this.maxYear, Number(range[1])))
        this.yearRange = [Math.min(a,b), Math.max(a,b)]
      }
    },
    setCreatorNames (val) {
      this.creatorNamesText = Array.isArray(val) ? val.join(',') : String(val || '')
    },
    setCategories (arr) { this.selectedCats = Array.isArray(arr) ? arr : [] },
    refresh () { if (this.only360) this.fetchCompositeInView(); else this.applyDetectionsFilter() },
    clear () { this.resetFilters() },

    resetFilters () {
      this.yearRange = [this.minYear, this.maxYear]
      this.only360 = false
      this.selectedCats = []
      this.creatorNamesText = ''
    },
  },
}
</script>

<style scoped>
.p-3{ padding: 12px; }
.opacity-70{ opacity: .7; }
.flex-1{ flex: 1; }
.gap-2{ gap: .5rem; }
</style>
