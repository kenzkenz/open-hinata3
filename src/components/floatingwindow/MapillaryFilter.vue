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
        <!-- クリエイター -->
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

        <!-- 年度レンジ -->
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

        <!-- 360切替 -->
        <div style="margin-top: -20px;" class="mb-2 d-flex flex-wrap gap-2">
          <v-switch
              v-model="s_is360Pic"
              color="primary"
              hide-details
              :label="'360度画像をフィルタ'"
              @change="onOnly360Change"
          />
        </div>

        <div class="d-flex align-center justify-end">
          <v-btn small text @click="onResetClick">リセット（全て初期化）</v-btn>
        </div>
      </v-window-item>

      <!-- ② オブジェクト（必要なら後で実装） -->
      <v-window-item value="2">
        <div class="text-caption opacity-70 mt-2">（未設定）</div>
      </v-window-item>

      <!-- ③ 交通標識 -->
      <v-window-item value="3">
        <!-- 可視アイコン（折り返し＋手動トグル） -->
        <div class="mt-3">
          <div class="text-caption mb-1">画面内の標識</div>
          <div class="chip-flow">
            <v-chip
                v-for="v in visibleIconValues"
                :key="v"
                :class="chipClass(v)"
                small
                class="ma-1"
                @click="toggleSign(v)"
            >
              <MiniTooltip :text="v" :offset-x="0" :offset-y="0">
                <img
                    v-if="!failedIcon[v]"
                    class="chip-img"
                    :src="iconUrl(v)"
                    alt=""
                    decoding="async"
                    loading="lazy"
                    @error="onImgError(v)"
                    @load="onImgLoad(v)"
                />
                <span v-else class="chip-fallback">🛈</span>
              </MiniTooltip>
            </v-chip>
            <p v-if="visibleIconValues.length" style="margin-top: 20px" class="text-caption opacity-70">画面移動があった場合は標識の増減がある可能性がありますので、再抽出してください。</p>
            <p v-else style="margin-top: 20px" class="text-caption opacity-70">（該当なし）</p>
          </div>
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
      selectedCats: [],
      selectedSignValues: [],      // 可視アイコンの選択
      creatorNamesText: '',
      CATEGORIES: [
        { id:'traffic_sign', label:'標識' },
        { id:'crosswalk',    label:'横断歩道' },
        { id:'guardrail',    label:'ガードレール' },
        { id:'lane_marking', label:'レーンマーキング' },
        { id:'speed_bump',   label:'ハンプ' },
        { id:'utility_pole', label:'電柱' },
      ],

      iconLayerId: 'oh-mapillary-images-3-icon',
      visibleIconValues: [],
      failedIcon: {},

      detachIconListener: null,
      styleDataHandler: null,

      ro: null,
      yrChangeTimer: null,
      yrChangeDelayMs: 200,
    }
  },
  computed: {
    ...mapState(['map01']),
    s_is360Pic: {
      get() { return this.$store.state.is360Pic },
      set(v) { this.$store.state.is360Pic = v }
    },
    creatorNames () {
      return (this.creatorNamesText || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
    },
  },
  watch: {
    resetKey () { this.onResetClick() },
    tab (v) {
      if (v === '3') this.setupIconValueWatcher()
      else this.teardownIconValueWatcher()
    },
    // 可視値の更新に合わせ、選択から外れた値をクリーンアップ
    visibleIconValues (vals) {
      const set = new Set(vals)
      const next = this.selectedSignValues.filter(v => set.has(v))
      if (next.length !== this.selectedSignValues.length) {
        this.selectedSignValues = next
        this.onSignValuesChange(next)   // 親へ最新状態を通知
      }
    }
  },
  mounted () {
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

    if (this.tab === '3') this.setupIconValueWatcher()
    this.init()
  },
  beforeUnmount () { this.cleanup() },
  methods: {
    // ===== 単一/複数でモードとフィルタを作る（交通標識） =====
    buildSignFilter (values) {
      if (!values || !values.length) return null
      if (values.length === 1) return ['==', ['get', 'value'], values[0]]
      return ['in', ['get', 'value'], ['literal', values]]
    },

    // ===== 選択関連（可視アイコン） =====
    isSelected (v) { return this.selectedSignValues.includes(v) },
    chipClass (v) { return this.isSelected(v) ? 'chip-selected' : 'chip-unselected' },
    toggleSign (v) {
      const i = this.selectedSignValues.indexOf(v)
      if (i >= 0) this.selectedSignValues.splice(i, 1)
      else this.selectedSignValues.push(v)
      this.onSignValuesChange(this.selectedSignValues)
    },

    // 該当0なら全表示に戻す
    onSignValuesChange (vals) {
      const map = this.map01
      const layerId = this.iconLayerId
      if (!map || !map.getLayer || !map.getLayer(layerId)) return

      const values = Array.isArray(vals) ? vals.slice(0) : this.selectedSignValues.slice(0)
      const filter = this.buildSignFilter(values)

      try {
        map.setFilter(layerId, filter || null)
      } catch (_) {}

      this.$nextTick(() => {
        requestAnimationFrame(() => {
          let count = 0
          try {
            const feats = map.queryRenderedFeatures({ layers: [layerId] }) || []
            count = feats.length
          } catch (_) {}
          if (values.length > 0 && count === 0) {
            try { map.setFilter(layerId, null) } catch (_) {}
          }
        })
      })

      const mode = values.length <= 1 ? 'single' : 'multi'
      this.$emit('sign-values-change', values)
      this.$emit('sign-filter-change', {
        values, mode, filter, layerId, property: 'value'
      })
    },

    // ===== 検出カテゴリ（単一/複数判定付きで通知） =====
    onCategoriesChange () {
      const values = this.selectedCats.slice(0)
      const mode = values.length <= 1 ? 'single' : 'multi'
      this.$emit('categories-change', values)
      this.$emit('categories-filter-change', { values, mode })
    },

    // ===== SVG URL =====
    iconUrl (value) {
      return `https://kenzkenz.xsrv.jp/icon/mapillary/package_signs/${encodeURIComponent(value)}.svg`
    },
    onImgError (value) { if (!this.failedIcon[value]) this.$set(this.failedIcon, value, true) },
    onImgLoad  (value) { if (this.failedIcon[value])  this.$delete(this.failedIcon, value) },

    cleanup () {
      if (this.ro) { try { this.ro.disconnect() } catch (_) {} this.ro = null }
      if (this.yrChangeTimer) { clearTimeout(this.yrChangeTimer); this.yrChangeTimer = null }
      this.teardownIconValueWatcher()
    },

    // ===== 画面内 value 監視 =====
    setupIconValueWatcher () {
      const map = this.map01
      const layerId = this.iconLayerId
      if (!map) return

      if (this.detachIconListener) {
        try { this.visibleIconValues = getVisibleIconValues(map, layerId) } catch (_) {}
        return
      }

      const attachNow = () => {
        if (map.getLayer && map.getLayer(layerId)) {
          this.visibleIconValues = getVisibleIconValues(map, layerId)
          this.detachIconListener = attachViewportIconValues(map, layerId, (vals) => {
            this.visibleIconValues = vals
          }, { debounceMs: 120, immediate: false })
          if (this.styleDataHandler) { try { map.off('styledata', this.styleDataHandler) } catch (_) {} this.styleDataHandler = null }
        } else {
          if (!this.styleDataHandler) {
            this.styleDataHandler = () => {
              if (map.getLayer && map.getLayer(layerId)) {
                this.visibleIconValues = getVisibleIconValues(map, layerId)
                this.detachIconListener = attachViewportIconValues(map, layerId, (vals) => {
                  this.visibleIconValues = vals
                }, { debounceMs: 120, immediate: false })
                try { map.off('styledata', this.styleDataHandler) } catch (_) {}
                this.styleDataHandler = null
              }
            }
            map.on('styledata', this.styleDataHandler)
          }
        }
      }

      if (map.isStyleLoaded && map.isStyleLoaded()) {
        attachNow()
      } else {
        const onLoad = () => { try { map.off('load', onLoad) } catch (_) {} attachNow() }
        map.on('load', onLoad)
      }
    },
    teardownIconValueWatcher () {
      const map = this.map01
      if (this.detachIconListener) { try { this.detachIconListener() } catch (_) {} this.detachIconListener = null }
      if (map && this.styleDataHandler) { try { map.off('styledata', this.styleDataHandler) } catch (_) {} this.styleDataHandler = null }
      this.visibleIconValues = []
      this.failedIcon = {}
      this.selectedSignValues = []
    },

    // ===== 年レンジ =====
    onYearRangeInput () {
      if (!this.creatorNamesText?.trim()) return
      if (this.yrChangeTimer) clearTimeout(this.yrChangeTimer)
      this.yrChangeTimer = setTimeout(() => {
        this.yrChangeTimer = null
        this.onCreatorsInput()
      }, this.yrChangeDelayMs)
    },

    // ===== 360トグル =====
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
            src.setData({
              type:'FeatureCollection',
              features:[{ type:'Feature', geometry:{ type:'LineString', coordinates:[] }, properties:{} }]
            })
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

    // === クリエイター入力：start/end を 'YYYY-MM-DD' で渡す ===
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
        username: this.creatorNamesText,
        start, end,
      })
    },

    onCreatorsChange () { /* noop */ },

    onResetClick () {
      this.yearRange = [this.minYear, this.maxYear]
      this.selectedCats = []
      this.selectedSignValues = []
      this.creatorNamesText = ''
      mapillaryFilterRiset()
      if (this.tab === '3') this.teardownIconValueWatcher()
    },

    // ===== 子でやるロジック（必要なら実装） =====
    init () { /* TODO */ },

    // ===== 日付変換（UTC固定） =====
    getCapturedAtRangeMs () {
      const y0 = Number(this.yearRange[0])
      const y1 = Number(this.yearRange[1])
      const startMs = Date.UTC(y0, 0, 1, 0, 0, 0, 0)
      const endMs   = Date.UTC(y1, 11, 31, 23, 59, 59, 999)
      return { startMs, endMs }
    },
    msToYmdUTC (ms) { return new Date(ms).toISOString().slice(0, 10) },
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

/* ===== 可視アイコン用：横幅内で折り返す ===== */
.chip-flow{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.chip-flow .v-chip{
  margin: 4px;
}

/* ===== 選択状態を強調（色・枠・影） ===== */
.chip-selected{
  background-color: #ff9800 !important;  /* 濃いめのオレンジ */
  color: #ffffff !important;
  /*border: 2px solid #ef6c00 !important;*/
  /*box-shadow: 0 1px 4px rgba(0,0,0,.25) !important;*/
  /*transform: translateY(-1px);*/
}
.chip-unselected{
  background-color: #f3f3f3 !important;
  color: #424242 !important;
  border: 1px solid rgba(0,0,0,.15) !important;
}
</style>

<style>
/* このコンポーネント内スクロールが切られる場合の補助（任意） */
.content:has(> .p-3) {
  overflow: auto !important;
}
</style>
