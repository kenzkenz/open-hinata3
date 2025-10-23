<!-- HillshadePanel.vue -->
<template>
  <!-- 固定オーバーレイ行 -->
  <div class="hs-row">
    <div class="hs-left">
      <v-btn
          :icon="enabled ? 'mdi-eye' : 'mdi-eye-off'"
          variant="text"
          density="comfortable"
          :disabled="!hsReady"
          @click="enabled = !enabled"
          :title="enabled ? '陰影 ON' : '陰影 OFF'"
      />
      <span class="hs-title">陰影</span>
    </div>

    <div class="hs-center">
      <v-slider
          :model-value="exaggeration"
          :min="0" :max="1" :step="0.01"
          hide-details
          density="compact"
          class="hs-slider"
          :disabled="!hsReady || !enabled"
          @update:modelValue="v => (exaggeration = v)"
      />
    </div>

    <div class="hs-right">
      <v-btn icon variant="text" :disabled="!hsReady" @click="dialog = true" title="詳細">
        <v-icon>mdi-cog-outline</v-icon>
      </v-btn>
    </div>
  </div>

  <!-- 詳細ダイアログ（適用なし・即時反映） -->
  <v-dialog v-model="dialog" max-width="720">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>陰影の詳細設定</span>
        <div class="d-flex align-center" style="gap:8px">
          <v-btn
              variant="text"
              color="secondary"
              :disabled="!hsReady"
              @click="resetToDefaults"
              title="保存済み設定をクリアして初期値に戻します"
          >
            デフォルトに戻す
          </v-btn>
          <v-btn icon variant="text" @click="dialog=false"><v-icon>mdi-close</v-icon></v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-switch
            :model-value="enabled"
            color="primary" inset label="有効にする" class="mb-2"
            :disabled="!hsReady"
            @update:modelValue="v => (enabled = v)"
        />

        <v-select
            :model-value="method"
            :items="methodItems"
            label="方式"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            :disabled="!hsReady"
            @update:modelValue="v => (method = v)"
        />

        <v-slider
            :model-value="exaggeration"
            :min="0" :max="1" :step="0.01"
            label="強調" show-ticks="always" thumb-label
            class="mb-4"
            :disabled="!hsReady"
            @update:modelValue="v => (exaggeration = v)"
        />

        <template v-if="method === 'multidirectional'">
          <div class="text-caption mb-2">光源（方向°／高度°／色）</div>
          <div v-for="i in mdCount" :key="'dlg-'+(i-1)" class="d-flex align-center mb-2" style="gap:8px">
            <v-text-field :model-value="mdDirections[i-1]" type="number" :min="0" :max="359"
                          label="方位" density="compact" variant="outlined" style="max-width:90px"
                          :disabled="!hsReady"
                          @update:modelValue="v => setMd('dir', i-1, v)"/>
            <v-text-field :model-value="mdAltitudes[i-1]"  type="number" :min="0" :max="90"
                          label="高度" density="compact" variant="outlined" style="max-width:90px"
                          :disabled="!hsReady"
                          @update:modelValue="v => setMd('alt', i-1, v)"/>
            <v-text-field :model-value="mdHighlights[i-1]" label="HL" density="compact" variant="outlined"
                          style="max-width:110px" :disabled="!hsReady"
                          @update:modelValue="v => setMd('hl', i-1, v)"/>
            <v-text-field :model-value="mdShadows[i-1]"   label="SH" density="compact" variant="outlined"
                          style="max-width:110px" :disabled="!hsReady"
                          @update:modelValue="v => setMd('sh', i-1, v)"/>
            <v-btn icon size="28" variant="text" :disabled="!hsReady" @click="removeLight(i-1)">
              <v-icon>mdi-delete-outline</v-icon>
            </v-btn>
          </div>
          <v-btn block color="primary" variant="tonal" :disabled="!hsReady" @click="addLight">光源を追加</v-btn>
        </template>

        <template v-else>
          <div class="d-flex mb-2" style="gap:12px">
            <v-text-field :model-value="direction" type="number" :min="0" :max="359"
                          label="方位(°)" density="comfortable" variant="outlined" :disabled="!hsReady"
                          @update:modelValue="v => (direction = v)"/>
            <v-text-field :model-value="altitude"  type="number" :min="0" :max="90"
                          label="高度(°)" density="comfortable" variant="outlined" :disabled="!hsReady"
                          @update:modelValue="v => (altitude = v)"/>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'HillshadePanel',
  props: {
    map: { type: Object, required: true },          // 参照用
    controller: { type: Object, required: true }    // 親の <HillshadeControl ref="hs">
  },
  data () {
    return {
      dialog: false,
      methodItems: [
        { title: 'Multidirectional', value: 'multidirectional' },
        { title: 'Combined', value: 'combined' }
      ],
      syncTimer: null,
      saveTimer: null,
      storageKey: 'oh3_hillshade_settings_v1'
    }
  },
  computed: {
    // 実体
    hs () { return this.controller || null },
    hsReady () { return !!(this.hs && this.hs.state) },

    // デフォルト値（有効 = true）
    defaults () {
      return {
        enabled: true,
        method: 'multidirectional',
        exaggeration: 0.6,
        direction: 315,
        altitude: 35,
        mdDirections: [270,315,0,45],
        mdAltitudes:  [30,30,30,30],
        mdHighlights: ['#fff4cc','#ffeaa1','#eaffd0','#dff8ff'],
        mdShadows:    ['#3b3251','#2e386f','#2a2a6e','#3a2d58']
      }
    },

    // 双方向バインド：hs.state を直接読む/書く
    enabled: {
      get () { return this.hsReady ? !!this.hs.state.enabled : this.defaults.enabled },
      set (v) { if (!this.hsReady) return; this.hs.state.enabled = !!v; this.sync(true) }
    },
    exaggeration: {
      get () { return this.hsReady ? Number(this.hs.state.exaggeration || this.defaults.exaggeration) : this.defaults.exaggeration },
      set (v) { if (!this.hsReady) return; this.hs.state.exaggeration = Number(v); this.sync() }
    },
    method: {
      get () { return this.hsReady ? this.hs.state.method : this.defaults.method },
      set (v) { if (!this.hsReady) return; this.hs.state.method = v; this.sync(true) }
    },
    direction: {
      get () { return this.hsReady ? Number(this.hs.state.direction ?? this.defaults.direction) : this.defaults.direction },
      set (v) { if (!this.hsReady) return; this.hs.state.direction = Number(v); this.sync() }
    },
    altitude: {
      get () { return this.hsReady ? Number(this.hs.state.altitude ?? this.defaults.altitude) : this.defaults.altitude },
      set (v) { if (!this.hsReady) return; this.hs.state.altitude = Number(v); this.sync() }
    },

    mdDirections () { return this.hsReady ? this.hs.state.mdDirections : this.defaults.mdDirections },
    mdAltitudes  () { return this.hsReady ? this.hs.state.mdAltitudes  : this.defaults.mdAltitudes },
    mdHighlights () { return this.hsReady ? this.hs.state.mdHighlights : this.defaults.mdHighlights },
    mdShadows    () { return this.hsReady ? this.hs.state.mdShadows    : this.defaults.mdShadows },

    mdCount () {
      if (!this.hsReady) return 0
      const s = this.hs.state
      return Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length)
    }
  },
  watch: {
    // 実体が準備できたら保存済み設定をロード
    hsReady: {
      immediate: true,
      handler (ready) { if (ready) this.loadSettings() }
    },
    dialog (v) { if (v) this.saveSettingsDebounced() }
  },
  methods: {
    /* ===== Map反映 & 保存 ===== */
    sync (immediate = false) {
      if (!this.hsReady) return
      if (this.syncTimer) { clearTimeout(this.syncTimer); this.syncTimer = null }
      if (immediate) { this.hs.syncToMap() } else {
        this.syncTimer = setTimeout(() => { this.hs && this.hs.syncToMap() }, 60)
      }
      if (immediate) this.saveSettingsImmediate(); else this.saveSettingsDebounced()
    },

    getCurrentSettings () {
      if (!this.hsReady) return this.defaults
      const s = this.hs.state
      return {
        enabled: !!s.enabled,
        method: s.method,
        exaggeration: Number(s.exaggeration),
        direction: Number(s.direction),
        altitude: Number(s.altitude),
        mdDirections: s.mdDirections.slice(),
        mdAltitudes:  s.mdAltitudes.slice(),
        mdHighlights: s.mdHighlights.slice(),
        mdShadows:    s.mdShadows.slice()
      }
    },

    applySettings (obj, immediate = true) {
      if (!this.hsReady) return
      const o = Object.assign({}, this.defaults, obj || {})
      Object.assign(this.hs.state, {
        enabled: !!o.enabled,
        method: o.method,
        exaggeration: Number(o.exaggeration),
        direction: Number(o.direction),
        altitude: Number(o.altitude),
        mdDirections: Array.isArray(o.mdDirections) ? o.mdDirections.slice() : this.defaults.mdDirections.slice(),
        mdAltitudes:  Array.isArray(o.mdAltitudes)  ? o.mdAltitudes.slice()  : this.defaults.mdAltitudes.slice(),
        mdHighlights: Array.isArray(o.mdHighlights) ? o.mdHighlights.slice() : this.defaults.mdHighlights.slice(),
        mdShadows:    Array.isArray(o.mdShadows)    ? o.mdShadows.slice()    : this.defaults.mdShadows.slice()
      })
      this.sync(immediate)
    },

    /* ===== ローカルストレージ ===== */
    loadSettings () {
      try {
        if (typeof window === 'undefined') return
        const raw = window.localStorage.getItem(this.storageKey)
        if (!raw) { this.applySettings(this.defaults, true); return } // 初回はデフォルトON
        const obj = JSON.parse(raw)
        this.applySettings(obj, true)
      } catch (e) {
        this.applySettings(this.defaults, true)
      }
    },
    saveSettingsImmediate () {
      try {
        if (typeof window === 'undefined') return
        const obj = this.getCurrentSettings()
        window.localStorage.setItem(this.storageKey, JSON.stringify(obj))
      } catch (e) {}
    },
    saveSettingsDebounced () {
      if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null }
      this.saveTimer = setTimeout(() => this.saveSettingsImmediate(), 120)
    },
    clearSettings () {
      try {
        if (typeof window === 'undefined') return
        window.localStorage.removeItem(this.storageKey)
      } catch (e) {}
    },

    /* ===== UI操作 ===== */
    resetToDefaults () {
      this.clearSettings()
      this.applySettings(this.defaults, true)
    },

    setMd (kind, i, v) {
      if (!this.hsReady) return
      const s = this.hs.state
      const val = (kind === 'dir' || kind === 'alt') ? Number(v) : String(v)
      if (kind === 'dir') s.mdDirections.splice(i, 1, val)
      else if (kind === 'alt') s.mdAltitudes.splice(i, 1, val)
      else if (kind === 'hl') s.mdHighlights.splice(i, 1, val)
      else if (kind === 'sh') s.mdShadows.splice(i, 1, val)
      this.sync(true)
    },
    addLight () {
      if (!this.hsReady) return
      const s = this.hs.state
      s.mdDirections.push(45)
      s.mdAltitudes.push(25)
      s.mdHighlights.push('#eef8ff')
      s.mdShadows.push('#2a2a6e')
      this.sync(true)
    },
    removeLight (i) {
      if (!this.hsReady) return
      const s = this.hs.state
      if (Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length) <= 1) return
      s.mdDirections.splice(i,1)
      s.mdAltitudes.splice(i,1)
      s.mdHighlights.splice(i,1)
      s.mdShadows.splice(i,1)
      this.sync(true)
    }
  }
}
</script>

<style scoped>
/* 左=アイコン+ラベル / 中央=スライダー(可変) / 右=ギア */
.hs-row{
  display: grid;
  grid-template-columns: auto 1fr auto; /* 中央を最大化 */
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,0.04);
}

/* 左右はコンテンツ任せでOK */
.hs-left{ display:flex; align-items:center; gap:8px; }
.hs-title{ font-weight:600; white-space: nowrap; }
.hs-right{ display:flex; align-items:center; }

/* 中央スライダー：最低幅を確保しつつフルに伸ばす */
.hs-slider{ width: 100%; }

/* Vuetify内部まで100%を伝える（scopedでも効くように :deep 使用） */
.hs-slider :deep(.v-slider){ width: 100%; }

/* 視認性ほどよく（任意調整可） */
.hs-slider :deep(.v-slider-track__fill),
.hs-slider :deep(.v-slider-track__background){ height: 6px; }
.hs-slider :deep(.v-slider-thumb){ width: 18px; height: 18px; }
</style>



<!--&lt;!&ndash; HillshadePanel.vue &ndash;&gt;-->
<!--<template>-->
<!--  &lt;!&ndash; 固定オーバーレイ行 &ndash;&gt;-->
<!--  <div class="hs-row">-->
<!--    <div class="hs-left">-->
<!--      <v-btn-->
<!--          :icon="enabled ? 'mdi-eye' : 'mdi-eye-off'"-->
<!--          variant="text"-->
<!--          density="comfortable"-->
<!--          :disabled="!hsReady"-->
<!--          @click="enabled = !enabled"-->
<!--          :title="enabled ? 'ヒルシェード ON' : 'ヒルシェード OFF'"-->
<!--      />-->
<!--      <span class="hs-title">陰影</span>-->
<!--    </div>-->

<!--    <div class="hs-center">-->
<!--      <v-slider-->
<!--          :model-value="exaggeration"-->
<!--          :min="0" :max="1" :step="0.01"-->
<!--          hide-details density="compact" class="hs-slider"-->
<!--          :disabled="!hsReady || !enabled"-->
<!--          @update:modelValue="v => (exaggeration = v)"-->
<!--      />-->
<!--    </div>-->

<!--    <div class="hs-right">-->
<!--      <v-btn icon variant="text" :disabled="!hsReady" @click="dialog = true" title="詳細">-->
<!--        <v-icon>mdi-cog-outline</v-icon>-->
<!--      </v-btn>-->
<!--    </div>-->
<!--  </div>-->

<!--  &lt;!&ndash; 詳細ダイアログ（適用ボタンなし/即時反映） &ndash;&gt;-->
<!--  <v-dialog v-model="dialog" max-width="720">-->
<!--    <v-card>-->
<!--      <v-card-title class="d-flex align-center justify-space-between">-->
<!--        <span>ヒルシェード詳細設定</span>-->
<!--        <div class="d-flex align-center" style="gap:8px">-->
<!--          <v-btn-->
<!--              variant="text"-->
<!--              color="secondary"-->
<!--              :disabled="!hsReady"-->
<!--              @click="resetToDefaults"-->
<!--              title="保存済み設定をクリアして初期値に戻します"-->
<!--          >-->
<!--            デフォルトに戻す-->
<!--          </v-btn>-->
<!--          <v-btn icon variant="text" @click="dialog=false"><v-icon>mdi-close</v-icon></v-btn>-->
<!--        </div>-->
<!--      </v-card-title>-->

<!--      <v-card-text>-->
<!--        <v-switch-->
<!--            :model-value="enabled"-->
<!--            color="primary" inset label="有効にする" class="mb-2"-->
<!--            :disabled="!hsReady"-->
<!--            @update:modelValue="v => (enabled = v)"-->
<!--        />-->

<!--        <v-select-->
<!--            :model-value="method"-->
<!--            :items="methodItems"-->
<!--            label="方式"-->
<!--            density="comfortable"-->
<!--            variant="outlined"-->
<!--            class="mb-3"-->
<!--            :disabled="!hsReady"-->
<!--            @update:modelValue="v => (method = v)"-->
<!--        />-->

<!--        <v-slider-->
<!--            :model-value="exaggeration"-->
<!--            :min="0" :max="1" :step="0.01"-->
<!--            label="強調" show-ticks="always" thumb-label class="mb-4"-->
<!--            :disabled="!hsReady"-->
<!--            @update:modelValue="v => (exaggeration = v)"-->
<!--        />-->

<!--        <template v-if="method === 'multidirectional'">-->
<!--          <div class="text-caption mb-2">光源（方向°／高度°／色）</div>-->
<!--          <div v-for="i in mdCount" :key="'dlg-'+(i-1)" class="d-flex align-center mb-2" style="gap:8px">-->
<!--            <v-text-field :model-value="mdDirections[i-1]" type="number" :min="0" :max="359"-->
<!--                          label="方位" density="compact" variant="outlined" style="max-width:90px"-->
<!--                          :disabled="!hsReady"-->
<!--                          @update:modelValue="v => setMd('dir', i-1, v)"/>-->
<!--            <v-text-field :model-value="mdAltitudes[i-1]"  type="number" :min="0" :max="90"-->
<!--                          label="高度" density="compact" variant="outlined" style="max-width:90px"-->
<!--                          :disabled="!hsReady"-->
<!--                          @update:modelValue="v => setMd('alt', i-1, v)"/>-->
<!--            <v-text-field :model-value="mdHighlights[i-1]" label="HL" density="compact" variant="outlined"-->
<!--                          style="max-width:110px" :disabled="!hsReady"-->
<!--                          @update:modelValue="v => setMd('hl', i-1, v)"/>-->
<!--            <v-text-field :model-value="mdShadows[i-1]"   label="SH" density="compact" variant="outlined"-->
<!--                          style="max-width:110px" :disabled="!hsReady"-->
<!--                          @update:modelValue="v => setMd('sh', i-1, v)"/>-->
<!--            <v-btn icon size="28" variant="text" :disabled="!hsReady" @click="removeLight(i-1)">-->
<!--              <v-icon>mdi-delete-outline</v-icon>-->
<!--            </v-btn>-->
<!--          </div>-->
<!--          <v-btn block color="primary" variant="tonal" :disabled="!hsReady" @click="addLight">光源を追加</v-btn>-->
<!--        </template>-->

<!--        <template v-else>-->
<!--          <div class="d-flex mb-2" style="gap:12px">-->
<!--            <v-text-field :model-value="direction" type="number" :min="0" :max="359"-->
<!--                          label="方位(°)" density="comfortable" variant="outlined" :disabled="!hsReady"-->
<!--                          @update:modelValue="v => (direction = v)"/>-->
<!--            <v-text-field :model-value="altitude"  type="number" :min="0" :max="90"-->
<!--                          label="高度(°)" density="comfortable" variant="outlined" :disabled="!hsReady"-->
<!--                          @update:modelValue="v => (altitude = v)"/>-->
<!--          </div>-->
<!--        </template>-->
<!--      </v-card-text>-->
<!--    </v-card>-->
<!--  </v-dialog>-->
<!--</template>-->

<!--<script>-->
<!--export default {-->
<!--  name: 'HillshadePanel',-->
<!--  props: {-->
<!--    map: { type: Object, required: true },          // 参照用-->
<!--    controller: { type: Object, required: true }    // 親の <HillshadeControl ref="hs">-->
<!--  },-->
<!--  data () {-->
<!--    return {-->
<!--      dialog: false,-->
<!--      methodItems: [-->
<!--        { title: 'Multidirectional', value: 'multidirectional' },-->
<!--        { title: 'Combined', value: 'combined' }-->
<!--      ],-->
<!--      syncTimer: null,-->
<!--      saveTimer: null,-->
<!--      storageKey: 'oh3_hillshade_settings_v1'-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    // 実体-->
<!--    hs () { return this.controller || null },-->
<!--    hsReady () { return !!(this.hs && this.hs.state) },-->

<!--    // デフォルト値（ここを変えれば「デフォルトに戻す」の内容が変わります）-->
<!--    defaults () {-->
<!--      return {-->
<!--        enabled: true,-->
<!--        method: 'multidirectional',-->
<!--        exaggeration: 0.6,-->
<!--        direction: 315,-->
<!--        altitude: 35,-->
<!--        mdDirections: [270,315,0,45],-->
<!--        mdAltitudes:  [30,30,30,30],-->
<!--        mdHighlights: ['#fff4cc','#ffeaa1','#eaffd0','#dff8ff'],-->
<!--        mdShadows:    ['#3b3251','#2e386f','#2a2a6e','#3a2d58']-->
<!--      }-->
<!--    },-->

<!--    // -&#45;&#45; 双方向バインド：hs.state を直接読む/書く -&#45;&#45;-->
<!--    enabled: {-->
<!--      get () { return this.hsReady ? !!this.hs.state.enabled : false },-->
<!--      set (v) { if (!this.hsReady) return; this.hs.state.enabled = !!v; this.sync(true) }-->
<!--    },-->
<!--    exaggeration: {-->
<!--      get () { return this.hsReady ? Number(this.hs.state.exaggeration || 0) : 0 },-->
<!--      set (v) { if (!this.hsReady) return; this.hs.state.exaggeration = Number(v); this.sync() }-->
<!--    },-->
<!--    method: {-->
<!--      get () { return this.hsReady ? this.hs.state.method : this.defaults.method },-->
<!--      set (v) { if (!this.hsReady) return; this.hs.state.method = v; this.sync(true) }-->
<!--    },-->
<!--    direction: {-->
<!--      get () { return this.hsReady ? Number(this.hs.state.direction || this.defaults.direction) : this.defaults.direction },-->
<!--      set (v) { if (!this.hsReady) return; this.hs.state.direction = Number(v); this.sync() }-->
<!--    },-->
<!--    altitude: {-->
<!--      get () { return this.hsReady ? Number(this.hs.state.altitude || this.defaults.altitude) : this.defaults.altitude },-->
<!--      set (v) { if (!this.hsReady) return; this.hs.state.altitude = Number(v); this.sync() }-->
<!--    },-->

<!--    // 多光源の配列は直接参照（編集は setMd/add/remove 経由で即時反映）-->
<!--    mdDirections () { return this.hsReady ? this.hs.state.mdDirections : this.defaults.mdDirections },-->
<!--    mdAltitudes  () { return this.hsReady ? this.hs.state.mdAltitudes  : this.defaults.mdAltitudes },-->
<!--    mdHighlights () { return this.hsReady ? this.hs.state.mdHighlights : this.defaults.mdHighlights },-->
<!--    mdShadows    () { return this.hsReady ? this.hs.state.mdShadows    : this.defaults.mdShadows },-->

<!--    mdCount () {-->
<!--      if (!this.hsReady) return 0-->
<!--      const s = this.hs.state-->
<!--      return Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length)-->
<!--    }-->
<!--  },-->
<!--  watch: {-->
<!--    // 実体が準備できたら、保存済み設定をロードして同期-->
<!--    hsReady: {-->
<!--      immediate: true,-->
<!--      handler (ready) {-->
<!--        if (ready) this.loadSettings()-->
<!--      }-->
<!--    },-->
<!--    // ダイアログを開くたびに最新を保存（閉じていても常に保存しているが念のため）-->
<!--    dialog (v) { if (v) this.saveSettingsDebounced() }-->
<!--  },-->
<!--  methods: {-->
<!--    /* ================== 同期 & 保存 ================== */-->
<!--    sync (immediate = false) {-->
<!--      if (!this.hsReady) return-->
<!--      // Mapへ反映-->
<!--      if (this.syncTimer) { clearTimeout(this.syncTimer); this.syncTimer = null }-->
<!--      if (immediate) { this.hs.syncToMap() } else {-->
<!--        this.syncTimer = setTimeout(() => { this.hs && this.hs.syncToMap() }, 60)-->
<!--      }-->
<!--      // ローカル保存-->
<!--      if (immediate) this.saveSettingsImmediate()-->
<!--      else this.saveSettingsDebounced()-->
<!--    },-->

<!--    getCurrentSettings () {-->
<!--      if (!this.hsReady) return this.defaults-->
<!--      const s = this.hs.state-->
<!--      return {-->
<!--        enabled: !!s.enabled,-->
<!--        method: s.method,-->
<!--        exaggeration: Number(s.exaggeration),-->
<!--        direction: Number(s.direction),-->
<!--        altitude: Number(s.altitude),-->
<!--        mdDirections: s.mdDirections.slice(),-->
<!--        mdAltitudes:  s.mdAltitudes.slice(),-->
<!--        mdHighlights: s.mdHighlights.slice(),-->
<!--        mdShadows:    s.mdShadows.slice()-->
<!--      }-->
<!--    },-->

<!--    applySettings (obj, immediate = true) {-->
<!--      if (!this.hsReady) return-->
<!--      const o = Object.assign({}, this.defaults, obj || {})-->
<!--      Object.assign(this.hs.state, {-->
<!--        enabled: !!o.enabled,-->
<!--        method: o.method,-->
<!--        exaggeration: Number(o.exaggeration),-->
<!--        direction: Number(o.direction),-->
<!--        altitude: Number(o.altitude),-->
<!--        mdDirections: Array.isArray(o.mdDirections) ? o.mdDirections.slice() : this.defaults.mdDirections.slice(),-->
<!--        mdAltitudes:  Array.isArray(o.mdAltitudes)  ? o.mdAltitudes.slice()  : this.defaults.mdAltitudes.slice(),-->
<!--        mdHighlights: Array.isArray(o.mdHighlights) ? o.mdHighlights.slice() : this.defaults.mdHighlights.slice(),-->
<!--        mdShadows:    Array.isArray(o.mdShadows)    ? o.mdShadows.slice()    : this.defaults.mdShadows.slice()-->
<!--      })-->
<!--      this.sync(immediate)-->
<!--    },-->

<!--    /* ================== ローカルストレージ ================== */-->
<!--    loadSettings () {-->
<!--      try {-->
<!--        if (typeof window === 'undefined') return-->
<!--        const raw = window.localStorage.getItem(this.storageKey)-->
<!--        if (!raw) return // なければ何もしない（親のstart-enabled等を尊重）-->
<!--        const obj = JSON.parse(raw)-->
<!--        this.applySettings(obj, true)-->
<!--      } catch (e) {-->
<!--        // 壊れたJSONなどは無視してデフォルト運用-->
<!--      }-->
<!--    },-->
<!--    saveSettingsImmediate () {-->
<!--      try {-->
<!--        if (typeof window === 'undefined') return-->
<!--        const obj = this.getCurrentSettings()-->
<!--        window.localStorage.setItem(this.storageKey, JSON.stringify(obj))-->
<!--      } catch (e) {}-->
<!--    },-->
<!--    saveSettingsDebounced () {-->
<!--      if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null }-->
<!--      this.saveTimer = setTimeout(() => this.saveSettingsImmediate(), 120)-->
<!--    },-->
<!--    clearSettings () {-->
<!--      try {-->
<!--        if (typeof window === 'undefined') return-->
<!--        window.localStorage.removeItem(this.storageKey)-->
<!--      } catch (e) {}-->
<!--    },-->

<!--    /* ================== UI操作 ================== */-->
<!--    resetToDefaults () {-->
<!--      // 保存をクリア → デフォルトを実体へ適用（即時）-->
<!--      this.clearSettings()-->
<!--      this.applySettings(this.defaults, true)-->
<!--    },-->

<!--    // 多光源編集（4配列を常に同時更新）-->
<!--    setMd (kind, i, v) {-->
<!--      if (!this.hsReady) return-->
<!--      const s = this.hs.state-->
<!--      const val = (kind === 'dir' || kind === 'alt') ? Number(v) : String(v)-->
<!--      if (kind === 'dir') s.mdDirections.splice(i, 1, val)-->
<!--      else if (kind === 'alt') s.mdAltitudes.splice(i, 1, val)-->
<!--      else if (kind === 'hl') s.mdHighlights.splice(i, 1, val)-->
<!--      else if (kind === 'sh') s.mdShadows.splice(i, 1, val)-->
<!--      this.sync(true)-->
<!--    },-->
<!--    addLight () {-->
<!--      if (!this.hsReady) return-->
<!--      const s = this.hs.state-->
<!--      s.mdDirections.push(45)-->
<!--      s.mdAltitudes.push(25)-->
<!--      s.mdHighlights.push('#eef8ff')-->
<!--      s.mdShadows.push('#2a2a6e')-->
<!--      this.sync(true)-->
<!--    },-->
<!--    removeLight (i) {-->
<!--      if (!this.hsReady) return-->
<!--      const s = this.hs.state-->
<!--      if (Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length) <= 1) return-->
<!--      s.mdDirections.splice(i,1)-->
<!--      s.mdAltitudes.splice(i,1)-->
<!--      s.mdHighlights.splice(i,1)-->
<!--      s.mdShadows.splice(i,1)-->
<!--      this.sync(true)-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.hs-row{-->
<!--  display:flex; align-items:center; gap:8px;-->
<!--  padding:8px 10px; border-radius:14px;-->
<!--  background: rgba(0,0,0,0.04);-->
<!--}-->
<!--.hs-left{ display:flex; align-items:center; gap:6px; min-width:150px; }-->
<!--.hs-title{ font-weight:600; }-->
<!--.hs-center{ flex:1 1 auto; display:flex; align-items:center; }-->
<!--.hs-slider{ width:100%; }-->
<!--.hs-right{ display:flex; align-items:center; gap:4px; }-->
<!--</style>-->
