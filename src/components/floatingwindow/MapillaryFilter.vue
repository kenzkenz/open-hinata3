<template>
  <div class="p-3">
    <div class="d-flex align-center mb-2">
      <div class="text-subtitle-1">Mapillary フィルタ</div>
      <v-spacer/>
      <!-- ×ボタンなどは未実装 -->
    </div>

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
          @input="onYearRangeInput"
          @change="onYearRangeChange"
      >
        <template v-slot:append>
          <div class="ml-2 text-caption">{{ yearRange[0] }}–{{ yearRange[1] }}</div>
        </template>
      </v-range-slider>
    </div>

    <!-- 360切替 -->
    <div class="mb-2 d-flex flex-wrap gap-2">
      <v-switch
          v-model="only360"
          color="primary"
          hide-details
          :label="'360°のみ'"
          @change="onOnly360Change"
      />
    </div>

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

    <v-divider class="my-3" />

    <!-- フッター：全リセットを最下部に -->
    <div class="d-flex align-center justify-end">
      <v-btn small text @click="onResetClick" class="reset-btn">
        リセット（全て初期化）
      </v-btn>
    </div>

  </div>
</template>

<script>
export default {
  name: 'MapillaryFilter',
  props: {
    // 親で使っている props（クローズ等は未使用）
    observeWidth: { type: Boolean, default: true },
    showClose:    { type: Boolean, default: true },   // 受けるだけ・未使用
    closeOnEsc:   { type: Boolean, default: true },   // 受けるだけ・未使用
    // 親→子 リセットトリガ（インクリメントで子が全リセット）
    resetKey: { type: [Number, String], default: 0 },
  },
  data () {
    const nowY = (new Date()).getFullYear()
    return {
      // --- UI状態 ---
      minYear: 2014,
      maxYear: nowY,
      yearRange: [2014, nowY],
      only360: false,
      selectedCats: [],
      creatorNamesText: '',
      CATEGORIES: [
        { id:'traffic_sign', label:'標識' },
        { id:'crosswalk',     label:'横断歩道' },
        { id:'guardrail',     label:'ガードレール' },
        { id:'lane_marking',  label:'レーンマーキング' },
        { id:'speed_bump',    label:'ハンプ' },
        { id:'utility_pole',  label:'電柱' },
      ],

      // --- 実装用（必要なら使用） ---
      map: null,
      imageLayerIds: [],
      detectionLayerIds: [],
      mapillaryToken: '',

      panoSrcId: 'mly_pano_overlay_src',
      panoLyrId: 'mly_pano_overlay_lyr',
      featSrcId: 'mly_feat_overlay_src',
      featLyrId: 'mly_feat_overlay_lyr',
    }
  },
  computed: {
    creatorNames () {
      return (this.creatorNamesText || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
    },
  },
  watch: {
    // 親からのリセット要求を受ける
    resetKey () {
      this.resetFilters()
      // 必要なら親へ通知も可：
      // this.$emit('reset')
      // this.emitFilters('reset-from-parent')
    },
  },
  mounted () {
    // 幅監視 → 親へ通知（closeは実装しない）
    if (this.observeWidth && typeof ResizeObserver !== 'undefined') {
      this.__ro = new ResizeObserver(entries => {
        const cr = entries && entries[0] && entries[0].contentRect
        if (cr && typeof cr.width === 'number') this.$emit('width-changed', Math.round(cr.width))
      })
      this.__ro.observe(this.$el)
      this.$nextTick(() => {
        const w = this.$el && this.$el.getBoundingClientRect && this.$el.getBoundingClientRect().width
        if (typeof w === 'number') this.$emit('width-changed', Math.round(w))
      })
    }

    // 必要なら初期化（あなたの実装）
    this.init()
  },
  // beforeDestroy は使わない。Vue3向けのみ最小クリーンアップ
  beforeUnmount () { this.cleanup() },
  methods: {
    cleanup () {
      if (this.__ro) {
        try { this.__ro.disconnect() } catch (e) {}
        this.__ro = null
      }
    },

    // ===== 親に渡すイベント・ハンドラ =====
    onYearRangeInput (val) {
      this.$emit('year-range-input', val)
      this.emitFilters('year-range-input')
      this.onFiltersChanged()
    },
    onYearRangeChange (val) {
      this.$emit('year-range-change', val)
      this.emitFilters('year-range-change')
      this.onFiltersChanged()
    },
    onOnly360Change () {
      this.$emit('only360-change', this.only360)
      this.emitFilters('only360-change')
      this.onOnly360Changed(this.only360)
    },
    onCategoriesChange () {
      this.$emit('categories-change', this.selectedCats.slice(0))
      this.emitFilters('categories-change')
      this.onFiltersChanged()
    },
    onCreatorsInput () {
      this.$emit('creators-input', this.creatorNamesText)
      this.emitFilters('creators-input')
    },
    onCreatorsChange () {
      this.$emit('creators-change', this.creatorNamesText)
      this.emitFilters('creators-change')
      this.onFiltersChanged()
    },
    onResetClick () {
      this.resetFilters()
      this.$emit('reset')
      this.emitFilters('reset')
      this.onFiltersChanged()
    },

    // 集約ペイロード
    emitFilters (trigger) {
      this.$emit('filters-changed', {
        trigger,
        yearRange: this.yearRange.slice(0),
        only360: this.only360,
        categories: this.selectedCats.slice(0),
        creatorsText: this.creatorNamesText,
        creators: this.creatorNames,
      })
    },

    // ===== 子でやるロジック（TODO：中身はあなたが実装） =====
    init () { /* TODO */ },
    onFiltersChanged () { /* TODO */ },
    onOnly360Changed (/* val */) { /* TODO */ },
    resetFilters () {
      this.yearRange = [this.minYear, this.maxYear]
      this.only360   = false
      this.selectedCats = []
      this.creatorNamesText = ''
    },

    // ユーティリティ
    asArray (x) { return Array.isArray(x) ? x : (x ? [x] : []) },
    yStartMs (y) { return new Date(y,0,1,0,0,0,0).getTime() },
    yEndMs (y)   { return new Date(y,11,31,23,59,59,999).getTime() },
  },
}
</script>

<style scoped>
.p-3{ padding: 12px; }
.opacity-70{ opacity: .7; }
.flex-1{ flex: 1; }
.gap-2{ gap: .5rem; }
/* 任意：リセットを目立たせたい場合
.reset-btn { color: #b00020; }  // error系のトーンに寄せる
*/
</style>
