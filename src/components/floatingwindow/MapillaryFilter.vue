<template>
  <div class="p-3">

    <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">
      <v-tab value="1">①-基本</v-tab>
      <v-tab value="2">②-オブジェクト</v-tab>
      <v-tab value="3">③-交通標識</v-tab>
    </v-tabs>

    <v-window v-model="tab" style="margin-top: 20px;">
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
          <v-btn small text @click="onResetClick" class="reset-btn">
            リセット（全て初期化）
          </v-btn>
        </div>
      </v-window-item>

      <v-window-item value="3">
        <!-- 検出カテゴリ -->
        <div class="text-caption mb-1">検出カテゴリ</div>
        <v-chip-group
            v-model="selectedCats"
            multiple
            @change="onCategoriesChange"
        >
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

        <!-- 画面内の oh-mapillary-images-3-icon の properties.value を表示（任意） -->
        <div class="mt-3">
          <div class="text-caption mb-1">画面内 value（oh-mapillary-images-3-icon）</div>
          <div class="d-flex flex-wrap">
            <v-chip
                v-for="v in visibleIconValues"
                :key="v"
                small
                class="ma-1"
                outlined
            >{{ v }}</v-chip>
            <span v-if="!visibleIconValues.length" class="text-caption opacity-70">（該当なし）</span>
          </div>
        </div>
      </v-window-item>
    </v-window>

  </div>
</template>

<script>
import { mapillaryFilterRiset, queryMapillaryByUserDatesViewport, setFllter360 } from '@/js/downLoad'
import { mapState } from 'vuex'
import { attachViewportIconValues, getVisibleIconValues } from '@/js/downLoad'

export default {
  name: 'MapillaryFilter',
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
      creatorNamesText: '',
      CATEGORIES: [
        { id:'traffic_sign', label:'標識' },
        { id:'crosswalk',    label:'横断歩道' },
        { id:'guardrail',    label:'ガードレール' },
        { id:'lane_marking', label:'レーンマーキング' },
        { id:'speed_bump',   label:'ハンプ' },
        { id:'utility_pole', label:'電柱' },
      ],

      // ビューポートの value 監視用
      iconLayerId: 'oh-mapillary-images-3-icon',
      visibleIconValues: [],
      detachIconListener: null,   // ← attachViewportIconValues の戻り関数を保持
      styleDataHandler: null,     // ← スタイルロード待ち用

      // 内部
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
    resetKey () { this.resetFilters() },

    // タブが ③-交通標識 になったら attach、離れたら detach（負荷軽減）
    tab (v) {
      if (v === '3') {
        this.setupIconValueWatcher()
      } else {
        this.teardownIconValueWatcher()
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

    // ★ attach を仕掛ける場所：mounted のタイミング
    // ただし実際に動かすのはタブ3が開いた時（初期タブが3なら即時）
    if (this.tab === '3') this.setupIconValueWatcher()

    this.init()
  },
  beforeUnmount () { this.cleanup() },
  methods: {
    cleanup () {
      if (this.ro) { try { this.ro.disconnect() } catch (_) {} this.ro = null }
      if (this.yrChangeTimer) { clearTimeout(this.yrChangeTimer); this.yrChangeTimer = null }
      this.teardownIconValueWatcher()
    },

    // === ★ attachViewportIconValues を仕掛ける・外す ===
    setupIconValueWatcher () {
      const map = this.map01
      const layerId = this.iconLayerId
      if (!map) return

      // すでにアタッチ済みなら値だけ更新して終了
      if (this.detachIconListener) {
        try {
          this.visibleIconValues = getVisibleIconValues(map, layerId)
        } catch (_) {}
        return
      }

      const attachNow = () => {
        // レイヤーが存在するなら即アタッチ
        if (map.getLayer && map.getLayer(layerId)) {
          // 初期値
          this.visibleIconValues = getVisibleIconValues(map, layerId)
          // 以後は moveend で更新（デバウンスは関数内で実施）
          this.detachIconListener = attachViewportIconValues(map, layerId, vals => {
            this.visibleIconValues = vals
          }, { debounceMs: 120, immediate: false })
          // styledata 監視は不要になったら解除
          if (this.styleDataHandler) { try { map.off('styledata', this.styleDataHandler) } catch (_) {} this.styleDataHandler = null }
        } else {
          // レイヤーがまだない → styledata で待つ（1回）
          if (!this.styleDataHandler) {
            this.styleDataHandler = () => {
              if (map.getLayer && map.getLayer(layerId)) {
                // 見つかったらセットして styledata リスナは外す
                this.visibleIconValues = getVisibleIconValues(map, layerId)
                this.detachIconListener = attachViewportIconValues(map, layerId, vals => {
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

      // スタイルがロード済みかで分岐
      if (map.isStyleLoaded && map.isStyleLoaded()) {
        attachNow()
      } else {
        // スタイルロード完了を待ってから
        const onLoad = () => {
          try { map.off('load', onLoad) } catch (_) {}
          attachNow()
        }
        map.on('load', onLoad)
      }
    },
    teardownIconValueWatcher () {
      const map = this.map01
      if (this.detachIconListener) {
        try { this.detachIconListener() } catch (_) {}
        this.detachIconListener = null
      }
      if (map && this.styleDataHandler) {
        try { map.off('styledata', this.styleDataHandler) } catch (_) {}
        this.styleDataHandler = null
      }
      this.visibleIconValues = []
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

    onCategoriesChange () {
      // 現状イベントは親へ送らない
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
        username: this.creatorNamesText, // 空でもOK（日時のみ抽出可能）
        start, end,
      })
    },

    onCreatorsChange () { /* noop */ },

    onResetClick () {
      this.yearRange = [this.minYear, this.maxYear]
      this.selectedCats = []
      this.creatorNamesText = ''
      mapillaryFilterRiset()
      // 交通標識タブを開いているなら、可視 value もクリア
      if (this.tab === '3') this.teardownIconValueWatcher()
    },

    // ===== 子でやるロジック（必要なら実装） =====
    init () { /* TODO */ },

    // ===== 日付変換：（UTC固定） =====
    getCapturedAtRangeMs () {
      const y0 = Number(this.yearRange[0])
      const y1 = Number(this.yearRange[1])
      const startMs = Date.UTC(y0, 0, 1, 0, 0, 0, 0)
      const endMs   = Date.UTC(y1, 11, 31, 23, 59, 59, 999)
      return { startMs, endMs }
    },
    msToYmdUTC (ms) { return new Date(ms).toISOString().slice(0, 10) },

    // ユーティリティ
    asArray (x) { return Array.isArray(x) ? x : (x ? [x] : []) },
    yStartMs (y) { return Date.UTC(y,0,1,0,0,0,0) },
    yEndMs (y)   { return Date.UTC(y,11,31,23,59,59,999) },
  },
}
</script>

<style scoped>
.p-3{
  padding: 12px;
}
.opacity-70{ opacity: .7; }
.flex-1{ flex: 1; }
.gap-2{ gap: .5rem; }
</style>

<style>
.content:has(> .p-3) {
  overflow: auto !important;
}
</style>



<!--<template>-->
<!--  <div class="p-3">-->

<!--    <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">-->
<!--      <v-tab value="1">①-基本</v-tab>-->
<!--      <v-tab value="2">②-オブジェクト</v-tab>-->
<!--      <v-tab value="3">③-交通標識</v-tab>-->
<!--    </v-tabs>-->

<!--    <v-window v-model="tab" style="margin-top: 20px;">-->
<!--      <v-window-item value="1">-->
<!--        &lt;!&ndash; クリエイター &ndash;&gt;-->
<!--        <div class="mt-2">-->
<!--          <v-text-field-->
<!--              v-model="creatorNamesText"-->
<!--              label="クリエイター名（カンマ区切り / 例: userA,userB）"-->
<!--              dense-->
<!--              hide-details-->
<!--              @input="onCreatorsInput"-->
<!--              @change="onCreatorsChange"-->
<!--          />-->
<!--        </div>-->

<!--        &lt;!&ndash; 年度レンジ &ndash;&gt;-->
<!--        <div class="mb-2 d-flex align-center">-->
<!--          <span class="mr-2">年範囲</span>-->
<!--          <v-range-slider-->
<!--              style="margin-top: 20px;"-->
<!--              v-model="yearRange"-->
<!--              :min="minYear"-->
<!--              :max="maxYear"-->
<!--              :step="1"-->
<!--              class="flex-1"-->
<!--              tick-size="2"-->
<!--              @update:modelValue="onYearRangeInput"-->
<!--              @end="onYearRangeEnd"-->
<!--          >-->
<!--            <template v-slot:append>-->
<!--              <div class="ml-2 text-caption">{{ yearRange[0] }}–{{ yearRange[1] }}</div>-->
<!--            </template>-->
<!--          </v-range-slider>-->
<!--        </div>-->

<!--        &lt;!&ndash; 360切替 &ndash;&gt;-->
<!--        <div style="margin-top: -20px;" class="mb-2 d-flex flex-wrap gap-2">-->
<!--          <v-switch-->
<!--              v-model="s_is360Pic"-->
<!--              color="primary"-->
<!--              hide-details-->
<!--              :label="'360度画像をフィルタ'"-->
<!--              @change="onOnly360Change"-->
<!--          />-->
<!--        </div>-->

<!--        &lt;!&ndash;    <v-divider class="my-3" />&ndash;&gt;-->

<!--        &lt;!&ndash; フッター：全リセットを最下部に &ndash;&gt;-->
<!--        <div class="d-flex align-center justify-end">-->
<!--          <v-btn small text @click="onResetClick" class="reset-btn">-->
<!--            リセット（全て初期化）-->
<!--          </v-btn>-->
<!--        </div>-->
<!--      </v-window-item>-->
<!--      <v-window-item value="3">-->
<!--            &lt;!&ndash; 検出カテゴリ &ndash;&gt;-->
<!--            <div class="text-caption mb-1">検出カテゴリ</div>-->
<!--            <v-chip-group-->
<!--                v-model="selectedCats"-->
<!--                multiple-->
<!--                @change="onCategoriesChange"-->
<!--            >-->
<!--              <v-chip-->
<!--                  v-for="c in CATEGORIES"-->
<!--                  :key="c.id"-->
<!--                  :value="c.id"-->
<!--                  small-->
<!--                  class="ma-1"-->
<!--                  outlined-->
<!--              >-->
<!--                {{ c.label }}-->
<!--              </v-chip>-->
<!--            </v-chip-group>-->
<!--      </v-window-item>-->
<!--    </v-window>-->

<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--import {mapillaryFilterRiset, queryMapillaryByUserDatesViewport, setFllter360} from '@/js/downLoad'-->
<!--import { mapState } from 'vuex'-->

<!--export default {-->
<!--  name: 'MapillaryFilter',-->
<!--  props: {-->
<!--    observeWidth: { type: Boolean, default: true },-->
<!--    showClose:    { type: Boolean, default: true },   // 受けるだけ・未使用-->
<!--    closeOnEsc:   { type: Boolean, default: true },   // 受けるだけ・未使用-->
<!--    resetKey:     { type: [Number, String], default: 0 }, // 親→子リセット-->
<!--  },-->
<!--  data () {-->
<!--    const nowY = (new Date()).getFullYear()-->
<!--    return {-->
<!--      // -&#45;&#45; UI状態 -&#45;&#45;-->
<!--      tab: 1,-->
<!--      minYear: 2014,-->
<!--      maxYear: nowY,-->
<!--      yearRange: [2014, nowY],-->
<!--      only360: false,-->
<!--      selectedCats: [],-->
<!--      creatorNamesText: '',-->
<!--      CATEGORIES: [-->
<!--        { id:'traffic_sign', label:'標識' },-->
<!--        { id:'crosswalk',     label:'横断歩道' },-->
<!--        { id:'guardrail',     label:'ガードレール' },-->
<!--        { id:'lane_marking',  label:'レーンマーキング' },-->
<!--        { id:'speed_bump',    label:'ハンプ' },-->
<!--        { id:'utility_pole',  label:'電柱' },-->
<!--      ],-->

<!--      // -&#45;&#45; 実装用（必要なら使用） -&#45;&#45;-->
<!--      map: null,-->
<!--      imageLayerIds: [],-->
<!--      detectionLayerIds: [],-->
<!--      mapillaryToken: '',-->

<!--      panoSrcId: 'mly_pano_overlay_src',-->
<!--      panoLyrId: 'mly_pano_overlay_lyr',-->
<!--      featSrcId: 'mly_feat_overlay_src',-->
<!--      featLyrId: 'mly_feat_overlay_lyr',-->

<!--      // 年レンジ確定用デバウンス-->
<!--      yrChangeTimer: null,-->
<!--      yrChangeDelayMs: 200,-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState(['map01']),-->
<!--    s_is360Pic: {-->
<!--      get() {-->
<!--        return this.$store.state.is360Pic-->
<!--      },-->
<!--      set(value) {-->
<!--        this.$store.state.is360Pic = value-->
<!--      }-->
<!--    },-->
<!--    creatorNames () {-->
<!--      return (this.creatorNamesText || '')-->
<!--          .split(',')-->
<!--          .map(s => s.trim())-->
<!--          .filter(Boolean)-->
<!--    },-->
<!--  },-->
<!--  watch: {-->
<!--    resetKey () { this.resetFilters() },-->
<!--  },-->
<!--  mounted () {-->
<!--    if (this.observeWidth && typeof ResizeObserver !== 'undefined') {-->
<!--      this.ro = new ResizeObserver(entries => {-->
<!--        const cr = entries && entries[0] && entries[0].contentRect-->
<!--        if (cr && typeof cr.width === 'number') this.$emit('width-changed', Math.round(cr.width))-->
<!--      })-->
<!--      this.ro.observe(this.$el)-->
<!--      this.$nextTick(() => {-->
<!--        const w = this.$el && this.$el.getBoundingClientRect && this.$el.getBoundingClientRect().width-->
<!--        if (typeof w === 'number') this.$emit('width-changed', Math.round(w))-->
<!--      })-->
<!--    }-->
<!--    this.init()-->
<!--  },-->
<!--  beforeUnmount () { this.cleanup() },-->
<!--  methods: {-->
<!--    cleanup () {-->
<!--      if (this.ro) {-->
<!--        try { this.ro.disconnect() } catch (e) {}-->
<!--        this.ro = null-->
<!--      }-->
<!--      if (this.yrChangeTimer) { clearTimeout(this.yrChangeTimer); this.yrChangeTimer = null }-->
<!--    },-->

<!--    // ===== 年レンジ =====-->
<!--    onYearRangeEnd (val) {-->
<!--      if (!this.creatorNamesText) {-->
<!--        alert('クリエーター名を記入してください')-->
<!--        return-->
<!--      }-->
<!--      this.onCreatorsInput()-->
<!--    },-->
<!--    onYearRangeInput (val) {-->
<!--      // // 即時通知-->
<!--      // this.$emit('year-range-input', val)-->
<!--      // this.emitFilters('year-range-input')-->
<!--      // this.onFiltersChanged()-->
<!--      //-->
<!--      // // デバウンスで「確定」相当も流す-->
<!--      // if (this.yrChangeTimer) clearTimeout(this.yrChangeTimer)-->
<!--      // this.yrChangeTimer = setTimeout(() => {-->
<!--      //   const v = this.yearRange.slice(0)-->
<!--      //   this.$emit('year-range-change', v)-->
<!--      //   this.emitFilters('year-range-change')-->
<!--      //   this.onFiltersChanged()-->
<!--      //   this.yrChangeTimer = null-->
<!--      // }, this.yrChangeDelayMs)-->

<!--      // this.onCreatorsInput()-->
<!--    },-->

<!--    async onOnly360Change () {-->
<!--      const map01 = this.$store.state.map01-->
<!--      if (map01.getZoom() < 14) return-->
<!--      if (this.s_is360Pic) {-->
<!--        if (map01.getLayer('oh-mapillary-images-highlight')) {-->
<!--          this.$store.state.targetSeq = ''-->
<!--          map01.setFilter('oh-mapillary-images-highlight', ['==', ['get', 'sequence_id'], this.$store.state.targetSeq]);-->
<!--          const src = map01.getSource('mly-current-point');-->
<!--          if (src && src.setData) {-->
<!--            src.setData({-->
<!--              type: 'FeatureCollection',-->
<!--              features: [{-->
<!--                type: 'Feature',-->
<!--                geometry: { type: 'LineString', coordinates: [] },-->
<!--                properties: {}-->
<!--              }]-->
<!--            });-->
<!--          }-->
<!--        }-->
<!--        await setFllter360(map01)-->
<!--      } else {-->
<!--        this.$store.state.filter360 = null-->
<!--        this.$store.state.targetSeq = null-->
<!--        map01.setFilter('oh-mapillary-images', this.$store.state.filter360)-->
<!--        map01.setPaintProperty('oh-mapillary-images', 'circle-color', '#35AF6D');-->
<!--        await setFllter360(map01)-->
<!--      }-->


<!--      // this.$emit('only360-change', this.only360)-->
<!--      // this.emitFilters('only360-change')-->
<!--      // this.onOnly360Changed(this.only360)-->
<!--    },-->
<!--    onCategoriesChange () {-->
<!--      // this.$emit('categories-change', this.selectedCats.slice(0))-->
<!--      // this.emitFilters('categories-change')-->
<!--      // this.onFiltersChanged()-->
<!--    },-->

<!--    // === クリエイター入力：ここで API 呼び出し（start/end を 'YYYY-MM-DD' で渡す） ===-->
<!--    async onCreatorsInput () {-->
<!--      // startMs/endMs を作る + 'YYYY-MM-DD' へ-->
<!--      const { startMs, endMs } = this.getCapturedAtRangeMs()-->
<!--      const start = this.msToYmdUTC(startMs)-->
<!--      const end   = this.msToYmdUTC(endMs)-->

<!--      const map01 = this.map01-->
<!--      this.$store.state.filter360 = null-->
<!--      this.$store.state.targetSeq = null-->
<!--      if (map01 && map01.setFilter) {-->
<!--        map01.setFilter('oh-mapillary-images', this.$store.state.filter360)-->
<!--        map01.setPaintProperty('oh-mapillary-images', 'circle-color', '#35AF6D')-->
<!--      }-->

<!--      await queryMapillaryByUserDatesViewport(map01, {-->
<!--        username: this.creatorNamesText,-->
<!--        start,           // 'YYYY-MM-DD'-->
<!--        end,             // 'YYYY-MM-DD'-->
<!--      })-->
<!--    },-->

<!--    onCreatorsChange () {-->
<!--      this.$emit('creators-change', this.creatorNamesText)-->
<!--      this.emitFilters('creators-change')-->
<!--      this.onFiltersChanged()-->
<!--    },-->
<!--    onResetClick () {-->
<!--      this.yearRange = [this.minYear, this.maxYear]-->
<!--      this.only360   = false-->
<!--      this.selectedCats = []-->
<!--      this.creatorNamesText = ''-->
<!--      mapillaryFilterRiset()-->

<!--      // this.resetFilters()-->
<!--      // this.$emit('reset')-->
<!--      // this.emitFilters('reset')-->
<!--      // this.onFiltersChanged()-->
<!--    },-->

<!--    // 集約ペイロード-->
<!--    emitFilters (trigger) {-->
<!--      this.$emit('filters-changed', {-->
<!--        trigger,-->
<!--        yearRange: this.yearRange.slice(0),-->
<!--        only360: this.only360,-->
<!--        categories: this.selectedCats.slice(0),-->
<!--        creatorsText: this.creatorNamesText,-->
<!--        creators: this.creatorNames,-->
<!--      })-->
<!--    },-->

<!--    // ===== 子でやるロジック（TODO：必要なら実装） =====-->
<!--    init () { /* TODO */ },-->
<!--    onFiltersChanged () { /* TODO */ },-->
<!--    onOnly360Changed (/* val */) { /* TODO */ },-->


<!--    // ===== 日付変換：（UTC固定） =====-->
<!--    getCapturedAtRangeMs () {-->
<!--      const y0 = Number(this.yearRange[0])-->
<!--      const y1 = Number(this.yearRange[1])-->
<!--      const startMs = Date.UTC(y0, 0, 1, 0, 0, 0, 0)                  // YYYY-01-01T00:00:00.000Z-->
<!--      const endMs   = Date.UTC(y1, 11, 31, 23, 59, 59, 999)           // YYYY-12-31T23:59:59.999Z-->
<!--      return { startMs, endMs }-->
<!--    },-->
<!--    msToYmdUTC (ms) {-->
<!--      return new Date(ms).toISOString().slice(0, 10) // 'YYYY-MM-DD'-->
<!--    },-->
<!--    // 参考：他形式が必要になった場合-->
<!--    getCapturedAtRangeSec () {-->
<!--      const { startMs, endMs } = this.getCapturedAtRangeMs()-->
<!--      return { startSec: Math.floor(startMs / 1000), endSec: Math.floor(endMs / 1000) }-->
<!--    },-->
<!--    getCapturedAtRangeISO () {-->
<!--      const { startMs, endMs } = this.getCapturedAtRangeMs()-->
<!--      return { startISO: new Date(startMs).toISOString(), endISO: new Date(endMs).toISOString() }-->
<!--    },-->
<!--    getDateParams (options) {-->
<!--      const opt  = options || {}-->
<!--      const unit = opt.unit || 'iso'   // 'iso' | 'ms' | 's'-->
<!--      const keys = opt.keys || { start: 'start', end: 'end' }-->
<!--      let a, b-->
<!--      if (unit === 'ms') {-->
<!--        const { startMs, endMs } = this.getCapturedAtRangeMs(); a = startMs; b = endMs-->
<!--      } else if (unit === 's') {-->
<!--        const { startSec, endSec } = this.getCapturedAtRangeSec(); a = startSec; b = endSec-->
<!--      } else {-->
<!--        const { startISO, endISO } = this.getCapturedAtRangeISO(); a = startISO; b = endISO-->
<!--      }-->
<!--      const out = {}; out[keys.start] = a; out[keys.end] = b; return out-->
<!--    },-->

<!--    // ユーティリティ-->
<!--    asArray (x) { return Array.isArray(x) ? x : (x ? [x] : []) },-->
<!--    yStartMs (y) { return Date.UTC(y,0,1,0,0,0,0) },-->
<!--    yEndMs (y)   { return Date.UTC(y,11,31,23,59,59,999) },-->
<!--  },-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.p-3{ padding: 12px; }-->
<!--.opacity-70{ opacity: .7; }-->
<!--.flex-1{ flex: 1; }-->
<!--.gap-2{ gap: .5rem; }-->
<!--/* .reset-btn { color: #b00020; } */-->
<!--</style>-->
