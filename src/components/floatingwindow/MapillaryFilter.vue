<template>
  <div class="p-3">

    <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">
      <v-tab value="1">①-基本</v-tab>
      <v-tab value="2">②-オブジェクト</v-tab>
      <v-tab value="3">③-交通標識</v-tab>
    </v-tabs>

    <v-window v-model="tab" style="margin-top: 20px;">
      <!-- ① 基本 -->
      <v-window-item value="1">
        <div class="mt-2">
          <v-text-field
              v-model="creatorNamesText"
              label="クリエイター名（カンマ区切り / 例: userA,userB）"
              dense
              hide-details
              @input="onCreatorsInput"
              @change="onCreatorsChange"
          />
        </div>

        <div class="mb-2 d-flex align-center">
          <span class="mr-2">年範囲</span>
          <v-range-slider
              style="margin-top: 20px;"
              v-model="yearRange"
              :min="minYear"
              :max="maxYear"
              :step="1"
              class="flex-1"
              tick-size="2"
              @update:modelValue="onYearRangeInput"
          >
            <template v-slot:append>
              <div class="ml-2 text-caption">{{ yearRange[0] }}–{{ yearRange[1] }}</div>
            </template>
          </v-range-slider>
        </div>

        <div style="margin-top: -20px;" class="mb-2 d-flex flex-wrap gap-2">
          <v-switch
              v-model="s_is360Pic"
              color="primary"
              hide-details
              :label="'360度画像をフィルタ'"
              @change="onOnly360Change"
          />
        </div>
        <div class="d-flex align-center justify-space-between">
          <p class="ma-0" v-html="hitText"></p>
          <v-btn small text @click="onResetClick">リセット（全て初期化）</v-btn>
        </div>
      </v-window-item>

      <!-- ② オブジェクト（oh-mapillary-images-2-icon） -->
      <v-window-item value="2">
        <div class="mt-3">
          <div class="text-caption mb-1">画面内のオブジェクト</div>
          <div class="chip-flow">
            <v-chip
                v-for="v in objVisibleValues"
                :key="v"
                :class="objChipClass(v)"
                small
                class="ma-1"
                @click="toggleObj(v)"
            >
              <MiniTooltip :text="v" :offset-x="0" :offset-y="0">
                <img
                    v-if="!objFailedIcon[v]"
                    class="chip-img"
                    :src="objIconUrl(v)"
                    alt=""
                    decoding="async"
                    loading="lazy"
                    @error="onObjImgError(v)"
                    @load="onObjImgLoad(v)"
                />
                <span v-else class="chip-fallback">🛈</span>
              </MiniTooltip>
            </v-chip>
          </div>
          <p v-if="objVisibleValues.length" class="text-caption opacity-70 mt-3">
            画面移動で増減する可能性があります（必要なら再抽出）。
          </p>
          <p v-else class="text-caption opacity-70 mt-3">（該当なし）</p>
        </div>
      </v-window-item>

      <!-- ③ 交通標識（oh-mapillary-images-3-icon） -->
      <v-window-item value="3">
        <div class="mt-3">
          <div class="text-caption mb-1">画面内の標識</div>
          <div class="chip-flow">
            <v-chip
                v-for="v in tsVisibleValues"
                :key="v"
                :class="tsChipClass(v)"
                small
                class="ma-1"
                @click="toggleTs(v)"
            >
              <MiniTooltip :text="v" :offset-x="0" :offset-y="0">
                <img
                    v-if="!tsFailedIcon[v]"
                    class="chip-img"
                    :src="tsIconUrl(v)"
                    alt=""
                    decoding="async"
                    loading="lazy"
                    @error="onTsImgError(v)"
                    @load="onTsImgLoad(v)"
                />
                <span v-else class="chip-fallback">🛈</span>
              </MiniTooltip>
            </v-chip>
          </div>
          <p v-if="tsVisibleValues.length" class="text-caption opacity-70 mt-3">
            画面移動で増減する可能性があります（必要なら再抽出）。
          </p>
          <p v-else class="text-caption opacity-70 mt-3">（該当なし）</p>
        </div>
      </v-window-item>
    </v-window>

  </div>
</template>

<script>
import {
  mapillaryFilterRiset,
  queryMapillaryByUserDatesViewport,
  setFllter360,
  attachViewportIconValues,
  getVisibleIconValues
} from '@/js/downLoad'
import { mapState } from 'vuex'
import MiniTooltip from '@/components/MiniTooltip'
import store from "@/store";

export default {
  name: 'MapillaryFilter',
  components: { MiniTooltip },
  props: {
    observeWidth: { type: Boolean, default: true },
    showClose:    { type: Boolean, default: true },
    closeOnEsc:   { type: Boolean, default: true },
    resetKey:     { type: [Number, String], default: 0 },
  },
  data () {
    const nowY = (new Date()).getFullYear()
    return {
      tab: '1',
      minYear: 2014,
      maxYear: nowY,
      yearRange: [2014, nowY],

      // 交通標識（3-icon）
      tsLayerId: 'oh-mapillary-images-3-icon',
      tsVisibleValues: [],
      tsSelectedValues: [],
      tsFailedIcon: {},

      // オブジェクト（2-icon）
      objLayerId: 'oh-mapillary-images-2-icon',
      objVisibleValues: [],
      objSelectedValues: [],
      objFailedIcon: {},

      // 共通
      creatorNamesText: '',
      ro: null,
      yrChangeTimer: null,
      yrChangeDelayMs: 200,

      // 監視解除ハンドラ
      tsDetachListener: null,
      tsStyleHandler: null,
      objDetachListener: null,
      objStyleHandler: null,
    }
  },
  computed: {
    ...mapState([
        'map01',
        'hitText',
    ]),
    s_is360Pic: {
      get() { return this.$store.state.is360Pic },
      set(v) { this.$store.state.is360Pic = v }
    },
  },
  watch: {
    resetKey () { this.onResetClick() },

    // タブ切替で attach / detach
    tab (v) {
      if (v === '2') this.setupObjWatcher(); else this.teardownObjWatcher()
      if (v === '3') this.setupTsWatcher();  else this.teardownTsWatcher()
    },

    // 可視値の更新に合わせ選択をクリーンアップ
    tsVisibleValues (vals) {
      const set = new Set(vals)
      const next = this.tsSelectedValues.filter(v => set.has(v))
      if (next.length !== this.tsSelectedValues.length) {
        this.tsSelectedValues = next
        this.applyTsFilter(next)
      }
    },
    objVisibleValues (vals) {
      const set = new Set(vals)
      const next = this.objSelectedValues.filter(v => set.has(v))
      if (next.length !== this.objSelectedValues.length) {
        this.objSelectedValues = next
        this.applyObjFilter(next)
      }
    },
  },
  mounted () {
    // 幅通知
    if (this.observeWidth && typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(entries => {
        const cr = entries?.[0]?.contentRect
        if (cr && typeof cr.width === 'number') this.$emit('width-changed', Math.round(cr.width))
      })
      this.ro.observe(this.$el)
      this.$nextTick(() => {
        const w = this.$el?.getBoundingClientRect?.().width
        if (typeof w === 'number') this.$emit('width-changed', Math.round(w))
      })
    }

    // 初期タブに応じて監視を開始
    if (this.tab === '2') this.setupObjWatcher()
    if (this.tab === '3') this.setupTsWatcher()

    this.init()
  },
  beforeUnmount () { this.cleanup() },
  methods: {
    /* ========== 共通ユーティリティ ========== */
    buildValueFilter (values) {
      if (!values || !values.length) return null
      if (values.length === 1) return ['==', ['get', 'value'], values[0]]
      return ['in', ['get', 'value'], ['literal', values]]
    },
    msToYmdUTC (ms) { return new Date(ms).toISOString().slice(0, 10) },
    getCapturedAtRangeMs () {
      const y0 = Number(this.yearRange[0])
      const y1 = Number(this.yearRange[1])
      const startMs = Date.UTC(y0, 0, 1, 0, 0, 0, 0)
      const endMs   = Date.UTC(y1, 11, 31, 23, 59, 59, 999)
      return { startMs, endMs }
    },

    /* ========== 交通標識（3-icon） ========== */
    tsIconUrl (value) {
      return `https://kenzkenz.xsrv.jp/icon/mapillary/package_signs/${encodeURIComponent(value)}.svg`
    },
    tsChipClass (v) { return this.tsSelectedValues.includes(v) ? 'chip-selected' : 'chip-unselected' },
    toggleTs (v) {
      const i = this.tsSelectedValues.indexOf(v)
      if (i >= 0) this.tsSelectedValues.splice(i, 1)
      else this.tsSelectedValues.push(v)
      this.applyTsFilter(this.tsSelectedValues)
    },
    applyTsFilter (vals) {
      const map = this.map01, layerId = this.tsLayerId
      if (!map || !map.getLayer || !map.getLayer(layerId)) return

      const values = Array.isArray(vals) ? vals.slice(0) : this.tsSelectedValues.slice(0)
      const filter = this.buildValueFilter(values)
      try { map.setFilter(layerId, filter || null) } catch (_) {}

      // ヒット0なら解除
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          let n = 0
          try { n = (map.queryRenderedFeatures({ layers: [layerId] }) || []).length } catch (_) {}
          if (values.length > 0 && n === 0) { try { map.setFilter(layerId, null) } catch (_) {} }
        })
      })

      const mode = values.length <= 1 ? 'single' : 'multi'
      this.$emit('ts-filter-change', { values, mode, layerId, property: 'value', filter })
    },
    onTsImgError (value) {
      if (!this.tsFailedIcon[value]) this.tsFailedIcon = { ...this.tsFailedIcon, [value]: true }
    },
    onTsImgLoad (value) {
      if (this.tsFailedIcon[value]) {
        const { [value]: _drop, ...rest } = this.tsFailedIcon
        this.tsFailedIcon = rest
      }
    },

    setupTsWatcher () {
      const map = this.map01, layerId = this.tsLayerId
      if (!map) return
      if (this.tsDetachListener) {
        try { this.tsVisibleValues = getVisibleIconValues(map, layerId) } catch (_) {}
        return
      }
      const attachNow = () => {
        if (map.getLayer && map.getLayer(layerId)) {
          this.tsVisibleValues = getVisibleIconValues(map, layerId)
          this.tsDetachListener = attachViewportIconValues(
              map, layerId, vals => { this.tsVisibleValues = vals },
              { debounceMs: 120, immediate: false }
          )
          if (this.tsStyleHandler) { try { map.off('styledata', this.tsStyleHandler) } catch (_) {} this.tsStyleHandler = null }
        } else {
          if (!this.tsStyleHandler) {
            this.tsStyleHandler = () => {
              if (map.getLayer && map.getLayer(layerId)) {
                this.tsVisibleValues = getVisibleIconValues(map, layerId)
                this.tsDetachListener = attachViewportIconValues(
                    map, layerId, vals => { this.tsVisibleValues = vals },
                    { debounceMs: 120, immediate: false }
                )
                try { map.off('styledata', this.tsStyleHandler) } catch (_) {}
                this.tsStyleHandler = null
              }
            }
            map.on('styledata', this.tsStyleHandler)
          }
        }
      }
      if (map.isStyleLoaded && map.isStyleLoaded()) attachNow()
      else { const onLoad = () => { try { map.off('load', onLoad) } catch (_) {} attachNow() }; map.on('load', onLoad) }
    },
    teardownTsWatcher () {
      const map = this.map01
      if (this.tsDetachListener) { try { this.tsDetachListener() } catch (_) {} this.tsDetachListener = null }
      if (map && this.tsStyleHandler) { try { map.off('styledata', this.tsStyleHandler) } catch (_) {} this.tsStyleHandler = null }
      this.tsVisibleValues = []
      this.tsFailedIcon = {}
      this.tsSelectedValues = []
    },

    /* ========== オブジェクト（2-icon） ========== */
    objIconUrl (value) {
      return `https://kenzkenz.xsrv.jp/icon/mapillary/package_signs/${encodeURIComponent(value)}.svg`
    },
    objChipClass (v) { return this.objSelectedValues.includes(v) ? 'chip-selected' : 'chip-unselected' },
    toggleObj (v) {
      const i = this.objSelectedValues.indexOf(v)
      if (i >= 0) this.objSelectedValues.splice(i, 1)
      else this.objSelectedValues.push(v)
      this.applyObjFilter(this.objSelectedValues)
    },
    applyObjFilter (vals) {
      const map = this.map01, layerId = this.objLayerId
      if (!map || !map.getLayer || !map.getLayer(layerId)) return

      const values = Array.isArray(vals) ? vals.slice(0) : this.objSelectedValues.slice(0)
      const filter = this.buildValueFilter(values)
      try { map.setFilter(layerId, filter || null) } catch (_) {}

      // ヒット0なら解除
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          let n = 0
          try { n = (map.queryRenderedFeatures({ layers: [layerId] }) || []).length } catch (_) {}
          if (values.length > 0 && n === 0) { try { map.setFilter(layerId, null) } catch (_) {} }
        })
      })

      const mode = values.length <= 1 ? 'single' : 'multi'
      this.$emit('obj-filter-change', { values, mode, layerId, property: 'value', filter })
    },
    onObjImgError (value) {
      if (!this.objFailedIcon[value]) this.objFailedIcon = { ...this.objFailedIcon, [value]: true }
    },
    onObjImgLoad (value) {
      if (this.objFailedIcon[value]) {
        const { [value]: _drop, ...rest } = this.objFailedIcon
        this.objFailedIcon = rest
      }
    },

    setupObjWatcher () {
      const map = this.map01, layerId = this.objLayerId
      if (!map) return
      if (this.objDetachListener) {
        try { this.objVisibleValues = getVisibleIconValues(map, layerId) } catch (_) {}
        return
      }
      const attachNow = () => {
        if (map.getLayer && map.getLayer(layerId)) {
          this.objVisibleValues = getVisibleIconValues(map, layerId)
          this.objDetachListener = attachViewportIconValues(
              map, layerId, vals => { this.objVisibleValues = vals },
              { debounceMs: 120, immediate: false }
          )
          if (this.objStyleHandler) { try { map.off('styledata', this.objStyleHandler) } catch (_) {} this.objStyleHandler = null }
        } else {
          if (!this.objStyleHandler) {
            this.objStyleHandler = () => {
              if (map.getLayer && map.getLayer(layerId)) {
                this.objVisibleValues = getVisibleIconValues(map, layerId)
                this.objDetachListener = attachViewportIconValues(
                    map, layerId, vals => { this.objVisibleValues = vals },
                    { debounceMs: 120, immediate: false }
                )
                try { map.off('styledata', this.objStyleHandler) } catch (_) {}
                this.objStyleHandler = null
              }
            }
            map.on('styledata', this.objStyleHandler)
          }
        }
      }
      if (map.isStyleLoaded && map.isStyleLoaded()) attachNow()
      else { const onLoad = () => { try { map.off('load', onLoad) } catch (_) {} attachNow() }; map.on('load', onLoad) }
    },
    teardownObjWatcher () {
      const map = this.map01
      if (this.objDetachListener) { try { this.objDetachListener() } catch (_) {} this.objDetachListener = null }
      if (map && this.objStyleHandler) { try { map.off('styledata', this.objStyleHandler) } catch (_) {} this.objStyleHandler = null }
      this.objVisibleValues = []
      this.objFailedIcon = {}
      this.objSelectedValues = []
    },

    /* ========== 基本系 ========== */
    onYearRangeInput () {
      if (!this.creatorNamesText?.trim()) return
      if (this.yrChangeTimer) clearTimeout(this.yrChangeTimer)
      this.yrChangeTimer = setTimeout(() => {
        this.yrChangeTimer = null
        this.onCreatorsInput()
      }, this.yrChangeDelayMs)
    },

    async onOnly360Change () {
      const map01 = this.$store.state.map01
      if (!map01) return
      if (map01.getZoom && map01.getZoom() < 14) return

      if (this.s_is360Pic) {
        if (map01.getLayer && map01.getLayer('oh-mapillary-images-highlight')) {
          this.$store.state.targetSeq = ''
          map01.setFilter('oh-mapillary-images-highlight', ['==', ['get', 'sequence_id'], this.$store.state.targetSeq])
          const src = map01.getSource && map01.getSource('mly-current-point')
          if (src?.setData) {
            src.setData({ type:'FeatureCollection', features:[{ type:'Feature', geometry:{ type:'LineString', coordinates:[] }, properties:{} }] })
          }
        }
        await setFllter360(map01)
      } else {
        this.$store.state.filter360 = null
        this.$store.state.targetSeq = null
        if (map01.setFilter) {
          map01.setFilter('oh-mapillary-images', this.$store.state.filter360)
          map01.setPaintProperty('oh-mapillary-images', 'circle-color', '#35AF6D')
        }
        await setFllter360(map01)
      }
    },

    async onCreatorsInput () {
      const { startMs, endMs } = this.getCapturedAtRangeMs()
      const start = this.msToYmdUTC(startMs)
      const end   = this.msToYmdUTC(endMs)

      const map01 = this.map01
      this.$store.state.filter360 = null
      this.$store.state.targetSeq = null
      if (map01?.setFilter) {
        map01.setFilter('oh-mapillary-images', this.$store.state.filter360)
        map01.setPaintProperty('oh-mapillary-images', 'circle-color', '#35AF6D')
      }

      await queryMapillaryByUserDatesViewport(map01, {
        username: this.creatorNamesText, // 空でもOK
        start, end,
      })
    },

    onCreatorsChange () { /* noop */ },

    onResetClick () {
      this.resetUIState()
      this.clearAllMapFilters()
      mapillaryFilterRiset()
      this.teardownTsWatcher()
      this.teardownObjWatcher()
      this.$store.state.hitText = ''
    },

    // ==== 親クローズ時に必ず呼ばれる経路 ====
    cleanup () {
      // 監視解除＋マップのフィルタを初期化＋UI初期化
      this.resetOnClose()
      if (this.ro) { try { this.ro.disconnect() } catch (_) {} this.ro = null }
      if (this.yrChangeTimer) { clearTimeout(this.yrChangeTimer); this.yrChangeTimer = null }
    },

    // 親クローズ時の総合リセット
    resetOnClose () {
      this.teardownTsWatcher()
      this.teardownObjWatcher()
      this.clearAllMapFilters()
      mapillaryFilterRiset()
      this.resetUIState()
    },

    // UIの初期状態へ
    resetUIState () {
      this.yearRange = [this.minYear, this.maxYear]
      this.creatorNamesText = ''
      this.tsSelectedValues = []
      this.tsFailedIcon = {}
      this.tsVisibleValues = []
      this.objSelectedValues = []
      this.objFailedIcon = {}
      this.objVisibleValues = []
      this.s_is360Pic = false
    },

    // すべての関連レイヤーのフィルタ解除・色戻し
    clearAllMapFilters () {
      const map = this.map01
      if (!map || !map.getLayer) return

      const layerIds = [
        // 基本ポイント（環境によりID差異あり：両対応）
        'oh-mapillary-images',
        'oh-mapillary-images-1',
        // オブジェクト
        'oh-mapillary-images-2',
        'oh-mapillary-images-2-icon',
        // 交通標識
        'oh-mapillary-images-3',
        'oh-mapillary-images-3-icon',
        // ハイライト等
        'oh-mapillary-images-highlight',
      ]
      layerIds.forEach(id => {
        try { if (map.getLayer(id)) map.setFilter(id, null) } catch (_) {}
      })

      // 色の初期化（存在すれば）
      try { if (map.getLayer('oh-mapillary-images')) map.setPaintProperty('oh-mapillary-images', 'circle-color', '#35AF6D') } catch (_) {}
      try { if (map.getLayer('oh-mapillary-images-1')) map.setPaintProperty('oh-mapillary-images-1', 'circle-color', '#35AF6D') } catch (_) {}

      // 走行軌跡の一時ソースなどをクリア（存在すれば）
      try {
        const src = map.getSource && map.getSource('mly-current-point')
        if (src?.setData) {
          src.setData({ type:'FeatureCollection', features:[{ type:'Feature', geometry:{ type:'LineString', coordinates:[] }, properties:{} }] })
        }
      } catch (_) {}
    },

    init () { /* 必要なら実装 */ },
  },
}
</script>

<style scoped>
.p-3{ padding: 12px; }
.opacity-70{ opacity: .7; }
.flex-1{ flex: 1; }
.gap-2{ gap: .5rem; }

.chip-img{
  width: 18px; height: 18px;
  object-fit: contain;
  vertical-align: middle;
}
.chip-fallback{ opacity: .6; }

/* 折り返し */
.chip-flow{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.chip-flow .v-chip{
  margin: 4px;
}

/* 選択強調 */
.chip-selected{
  background-color: #ff9800 !important;
  color: #ffffff !important;
}
.chip-unselected{
  background-color: #f3f3f3 !important;
  color: #424242 !important;
  border: 1px solid rgba(0,0,0,.15) !important;
}
</style>

<style>
.content:has(> .p-3) {
  overflow: auto !important;
}
</style>
