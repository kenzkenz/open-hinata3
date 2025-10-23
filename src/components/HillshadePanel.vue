<!-- HillshadePanel.vue -->
<template>
  <!-- 固定オーバーレイ行（OH3の一覧の最上部などに設置想定） -->
  <div class="hs-row">
    <div class="hs-left">
      <v-btn
          :icon="enabled ? 'mdi-eye' : 'mdi-eye-off'"
          variant="text"
          density="comfortable"
          :disabled="!hsReady"
          @click="enabled = !enabled"
          :title="enabled ? 'ヒルシェード ON' : 'ヒルシェード OFF'"
      />
      <span class="hs-title">ヒルシェード</span>
    </div>

    <div class="hs-center">
      <v-slider
          :model-value="exaggeration"
          :min="0" :max="1" :step="0.01"
          hide-details
          density="compact"
          class="hs-slider"
          :disabled="!hsReady || !enabled"
          @update:modelValue="v => exaggeration = v"
      />
    </div>

    <div class="hs-right">
      <v-btn icon variant="text" :disabled="!hsReady" @click="dialog = true" title="詳細">
        <v-icon>mdi-cog-outline</v-icon>
      </v-btn>
    </div>
  </div>

  <!-- 詳細ダイアログ（適用ボタンなし・即時反映） -->
  <v-dialog v-model="dialog" max-width="720">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>ヒルシェード詳細設定</span>
        <v-spacer />
        <v-btn icon variant="text" @click="dialog=false"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>

      <v-card-text>
        <v-switch
            :model-value="enabled"
            color="primary" inset label="有効にする" class="mb-2"
            :disabled="!hsReady"
            @update:modelValue="v => enabled = v"
        />

        <v-select
            :model-value="method"
            :items="methodItems"
            label="方式"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            :disabled="!hsReady"
            @update:modelValue="v => method = v"
        />

        <v-slider
            :model-value="exaggeration"
            :min="0" :max="1" :step="0.01"
            label="強調" show-ticks="always" thumb-label
            class="mb-4"
            :disabled="!hsReady"
            @update:modelValue="v => exaggeration = v"
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
                          @update:modelValue="v => direction = v"/>
            <v-text-field :model-value="altitude"  type="number" :min="0" :max="90"
                          label="高度(°)" density="comfortable" variant="outlined" :disabled="!hsReady"
                          @update:modelValue="v => altitude = v"/>
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
    map: { type: Object, required: true },          // 参照用（UIの有効/無効制御など）
    controller: { type: Object, required: true }    // 親の <HillshadeControl ref="hs"> を渡す
  },
  data () {
    return {
      dialog: false,
      methodItems: [
        { title: 'Multidirectional', value: 'multidirectional' },
        { title: 'Combined', value: 'combined' }
      ],
      syncTimer: null
    }
  },
  computed: {
    // 実体参照
    hs () { return this.controller || null },
    hsReady () { return !!(this.hs && this.hs.state) },

    // --- 固定行・ダイアログの双方向バインド（hs.state を直接読む書く） ---
    enabled: {
      get () { return this.hsReady ? !!this.hs.state.enabled : false },
      set (v) { if (!this.hsReady) return; this.hs.state.enabled = !!v; this.sync(true) }
    },
    exaggeration: {
      get () { return this.hsReady ? Number(this.hs.state.exaggeration || 0) : 0 },
      set (v) { if (!this.hsReady) return; this.hs.state.exaggeration = Number(v); this.sync() }
    },
    method: {
      get () { return this.hsReady ? this.hs.state.method : 'multidirectional' },
      set (v) { if (!this.hsReady) return; this.hs.state.method = v; this.sync(true) } // 方式変更は即時
    },
    direction: {
      get () { return this.hsReady ? Number(this.hs.state.direction || 315) : 315 },
      set (v) { if (!this.hsReady) return; this.hs.state.direction = Number(v); this.sync() }
    },
    altitude: {
      get () { return this.hsReady ? Number(this.hs.state.altitude || 35) : 35 },
      set (v) { if (!this.hsReady) return; this.hs.state.altitude = Number(v); this.sync() }
    },

    // 多光源（配列）— 直接参照し、編集は setMd()/add/remove 経由で
    mdDirections () { return this.hsReady ? this.hs.state.mdDirections : [] },
    mdAltitudes  () { return this.hsReady ? this.hs.state.mdAltitudes  : [] },
    mdHighlights () { return this.hsReady ? this.hs.state.mdHighlights : [] },
    mdShadows    () { return this.hsReady ? this.hs.state.mdShadows    : [] },

    mdCount () {
      if (!this.hsReady) return 0
      const s = this.hs.state
      return Math.min(s.mdDirections.length, s.mdAltitudes.length, s.mdHighlights.length, s.mdShadows.length)
    }
  },
  methods: {
    // デバウンス付き同期（方式/配列長が変わるときは immediate）
    sync (immediate = false) {
      if (!this.hsReady) return
      if (this.syncTimer) { clearTimeout(this.syncTimer); this.syncTimer = null }
      if (immediate) { this.hs.syncToMap(); return }
      this.syncTimer = setTimeout(() => { this.hs && this.hs.syncToMap() }, 60)
    },

    // 多光源編集（4配列を常に同時更新）
    setMd (kind, i, v) {
      if (!this.hsReady) return
      const s = this.hs.state
      const val = (kind === 'dir' || kind === 'alt') ? Number(v) : String(v)
      if (kind === 'dir') s.mdDirections.splice(i, 1, val)
      else if (kind === 'alt') s.mdAltitudes.splice(i, 1, val)
      else if (kind === 'hl') s.mdHighlights.splice(i, 1, val)
      else if (kind === 'sh') s.mdShadows.splice(i, 1, val)
      this.sync(true) // 配列長や要素の型が変わる可能性 → 即時
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
.hs-row{
  display:flex; align-items:center; gap:8px;
  padding:8px 10px; border-radius:14px;
  background: rgba(0,0,0,0.04);
}
.hs-left{ display:flex; align-items:center; gap:6px; min-width:150px; }
.hs-title{ font-weight:600; }
.hs-center{ flex:1 1 auto; display:flex; align-items:center; }
.hs-slider{ width:100%; }
.hs-right{ display:flex; align-items:center; gap:4px; }
</style>





<!--&lt;!&ndash; HillshadePanel.vue &ndash;&gt;-->
<!--<template>-->
<!--  &lt;!&ndash; レイヤー一覧の最上部など“固定オーバーレイ行”として設置想定 &ndash;&gt;-->
<!--  <div class="hs-row">-->
<!--    <div class="hs-left">-->
<!--      <v-btn-->
<!--          :icon="hillshadeOn ? 'mdi-eye' : 'mdi-eye-off'"-->
<!--          variant="text"-->
<!--          @click="toggleHillshade"-->
<!--          :title="hillshadeOn ? 'ヒルシェード ON' : 'ヒルシェード OFF'"-->
<!--      />-->
<!--      <span class="hs-title">ヒルシェード</span>-->
<!--    </div>-->

<!--    <div class="hs-center">-->
<!--      <v-slider-->
<!--          v-model="hillshadeStrength"-->
<!--          :min="0" :max="1" :step="0.01"-->
<!--          hide-details-->
<!--          density="compact"-->
<!--          class="hs-slider"-->
<!--          @change="applyStrength(hillshadeStrength)"-->
<!--      />-->
<!--    </div>-->

<!--    <div class="hs-right">-->
<!--      <v-btn icon variant="text" @click="openAdvanced" title="詳細">-->
<!--        <v-icon>mdi-cog-outline</v-icon>-->
<!--      </v-btn>-->
<!--    </div>-->
<!--  </div>-->

<!--  &lt;!&ndash; 詳細ダイアログ：方式・プリセット・光源配列など &ndash;&gt;-->
<!--  <v-dialog v-model="dialog" max-width="720">-->
<!--    <v-card>-->
<!--      <v-card-title class="d-flex align-center justify-space-between">-->
<!--        <span>ヒルシェード詳細設定</span>-->
<!--        <v-spacer />-->
<!--        <v-btn icon variant="text" @click="dialog=false"><v-icon>mdi-close</v-icon></v-btn>-->
<!--      </v-card-title>-->
<!--      <v-card-text>-->
<!--        &lt;!&ndash; 既存のコントロールUIをそのまま利用 &ndash;&gt;-->
<!--        <HillshadeControl-->
<!--            ref="hs"-->
<!--            :map="map"-->
<!--            dem-source-id="terrain"-->
<!--            :start-enabled="hillshadeOn"-->
<!--            :auto-anchor="true"-->
<!--        />-->
<!--      </v-card-text>-->
<!--      <v-card-actions>-->
<!--        <v-spacer/>-->
<!--        <v-btn variant="tonal" color="primary" @click="dialog=false">閉じる</v-btn>-->
<!--      </v-card-actions>-->
<!--    </v-card>-->
<!--  </v-dialog>-->

<!--  &lt;!&ndash; 実体（非表示マウント）。固定行から操作を橋渡し &ndash;&gt;-->
<!--  <HillshadeControl-->
<!--      v-if="mapReady"-->
<!--      ref="hsHidden"-->
<!--      :map="map"-->
<!--      dem-source-id="terrain"-->
<!--      :start-enabled="false"-->
<!--      :auto-anchor="true"-->
<!--      style="display:none"-->
<!--  />-->
<!--</template>-->

<!--<script>-->
<!--import HillshadeControl from '@/components/HillshadeControl'-->

<!--export default {-->
<!--  name: 'HillshadePanel',-->
<!--  components: { HillshadeControl },-->
<!--  props: {-->
<!--    map: { type: Object, required: true }, // MapLibreのmap-->
<!--    mapReady: { type: Boolean, default: true } // 親でload後にtrue（方式A想定）-->
<!--  },-->
<!--  data () {-->
<!--    return {-->
<!--      hillshadeOn: false,-->
<!--      hillshadeStrength: 0.6,-->
<!--      dialog: false-->
<!--    }-->
<!--  },-->
<!--  watch: {-->
<!--    // ダイアログ内の表示用コンポーネントにも状態反映-->
<!--    dialog (v) {-->
<!--      if (!v) return-->
<!--      // 開いた直後に現在値を同期（安全側）-->
<!--      const hsUI = this.$refs.hs-->
<!--      const hsHidden = this.$refs.hsHidden-->
<!--      if (hsUI && hsHidden) {-->
<!--        hsUI.state.enabled = this.hillshadeOn-->
<!--        hsUI.state.exaggeration = this.hillshadeStrength-->
<!--        hsUI.syncToMap()-->
<!--      }-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    openAdvanced () {-->
<!--      // まだmap未準備なら無視-->
<!--      if (!this.mapReady) return-->
<!--      this.dialog = true-->
<!--    },-->
<!--    toggleHillshade () {-->
<!--      if (!this.mapReady) return-->
<!--      this.hillshadeOn = !this.hillshadeOn-->
<!--      const hs = this.$refs.hsHidden-->
<!--      if (!hs) return-->
<!--      this.hillshadeOn ? hs.enable() : hs.disable()-->
<!--    },-->
<!--    applyStrength (v) {-->
<!--      const hs = this.$refs.hsHidden-->
<!--      this.hillshadeStrength = Number(v)-->
<!--      if (hs) {-->
<!--        hs.state.exaggeration = this.hillshadeStrength-->
<!--        hs.syncToMap()-->
<!--      }-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.hs-row{-->
<!--  display:flex; align-items:center; gap:8px;-->
<!--  padding:6px 8px; border-radius:12px;-->
<!--  background: rgba(0,0,0,0.04);-->
<!--}-->
<!--.hs-left{ display:flex; align-items:center; gap:6px; min-width:150px; }-->
<!--.hs-title{ font-weight:600; }-->
<!--.hs-center{ flex:1 1 auto; display:flex; align-items:center; }-->
<!--.hs-slider{ width:100%; }-->
<!--.hs-right{ display:flex; align-items:center; gap:4px; }-->
<!--</style>-->
