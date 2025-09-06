<template>
  <div class="p-3" elevation="4">
    <div class="d-flex align-center mb-2">
      <div class="text-subtitle-1">Mapillary フィルタ（360° × 検出カテゴリ × クリエイター名）</div>
      <v-spacer/>
      <!-- ×ボタン等は不要のため未実装 -->
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

    <!-- 360切替 / 検出カテゴリ / クリエイター名 -->
    <div class="mb-2 d-flex flex-wrap gap-2">
      <v-switch
          v-model="only360"
          color="primary"
          hide-details
          :label="'360°のみ（Graph API）'"
          @change="onOnly360Change"
      />
      <v-btn small text @click="onResetClick">リセット</v-btn>
    </div>

    <div class="text-caption mb-1">検出カテゴリ（Map Features）</div>
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
    <div class="text-caption opacity-70">
      * 子はUIとイベント通知のみ。実処理は子メソッド（TODO）に実装してください。<br>
      * 親には各入力イベント＋集約イベント <code>filters-changed</code> をemitします。
    </div>
  </div>
</template>

<script>
export default {
  name: 'MapillaryFilter',
  props: {
    // 幅の変化を親へ通知したい場合のみ true
    observeWidth: { type: Boolean, default: true },
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

      // --- 実装用（あなたが使う用。不要なら削除OK） ---
      map: null,                // MapLibreのmapインスタンスをここに
      imageLayerIds: [],        // 既存 画像レイヤID（複数OK）
      detectionLayerIds: [],    // 既存 検出レイヤID（複数OK）
      mapillaryToken: '',       // トークン等

      // オーバーレイ用ID（必要なら使用）
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
  mounted () {
    // 幅監視 → 親へ通知
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
  // Vue3 / Vue2 両対応のクリーンアップ
  beforeUnmount () { this.cleanup() },   // Vue3
  methods: {
    // 共通クリーンアップ
    cleanup () {
      if (this.__ro) {
        try { this.__ro.disconnect() } catch (e) {}
        this.__ro = null
      }
      // 他にリスナー等を追加したらここで外す
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
</style>
