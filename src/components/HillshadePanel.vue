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
          hide-details density="compact" class="hs-slider"
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

  <!-- 詳細ダイアログ（即時反映） -->
  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>陰影の詳細設定</span>
        <div class="d-flex align-center" style="gap:8px">
          <v-btn
              variant="text" color="secondary"
              :disabled="!hsReady"
              @click="resetToDefaults"
              title="保存済み設定をクリアして初期値に戻します"
          >デフォルトに戻す</v-btn>
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

        <!-- ★ 追加：プリセット ドロップダウン -->
        <div class="mb-4">
          <v-select
              :items="presetItems"
              :model-value="selectedPresetName"
              label="プリセット"
              density="comfortable"
              variant="outlined"
              :disabled="!hsReady"
              :hint="presetHint"
              persistent-hint
              @update:modelValue="onSelectPreset"
          />
        </div>

        <v-select
            :model-value="method"
            :items="methodItems"
            label="方式" density="comfortable" variant="outlined" class="mb-3"
            :disabled="!hsReady"
            @update:modelValue="v => (method = v)"
        />

        <v-slider
            :model-value="exaggeration"
            :min="0" :max="1" :step="0.01"
            label="強調" show-ticks="always" thumb-label class="mb-4"
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
            <v-text-field :model-value="mdAltitudes[i-1]" type="number" :min="0" :max="90"
                          label="高度°" density="compact" variant="outlined" style="max-width:90px"
                          :disabled="!hsReady"
                          @update:modelValue="v => setMd('alt', i-1, v)"/>
            <v-text-field :model-value="mdHighlights[i-1]" label="ハイライト"
                          density="compact" variant="outlined" style="max-width:110px" :disabled="!hsReady"
                          @update:modelValue="v => setMd('hl', i-1, v)"/>
            <v-text-field :model-value="mdShadows[i-1]" label="シャドー"
                          density="compact" variant="outlined" style="max-width:110px" :disabled="!hsReady"
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
            <v-text-field :model-value="altitude" type="number" :min="0" :max="90"
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
    map: { type: Object, required: true },          // 参照のみ
    controller: { type: Object, required: true }    // 親の <HillshadeControl ref="hs">
  },
  data () {
    return {
      dialog: false,
      methodItems: [
        { title: 'Multidirectional', value: 'multidirectional' },
        { title: 'Combined', value: 'combined' }
      ],
      // ★ 追加：プリセット選択の一時状態（名前を保持）
      selectedPresetName: null
    }
  },
  computed: {
    // store.hillshade に一本化（enabled, maps, params…）
    hs () { return this.$store.state.hillshade },
    hsReady () { return !!this.controller },

    // ドロップダウン項目：先頭に「未選択」を置く
    presetItems () {
      const arr = (this.controller?.presets || []).map(p => ({ title: p.name, value: p.name }))
      return [ { title: '（未選択）', value: null }, ...arr ]
    },
    presetHint () {
      return this.selectedPresetName ? `選択中: ${this.selectedPresetName}` : 'プリセットを選ぶと即時適用します'
    },

    // 全体ON/OFF
    enabled: {
      get() {
        return this.$store.state.hillshade.enabled
      },
      set(value) {
        this.$store.commit('SET_HS_ENABLED', value)
      }
    },

    // 詳細パラメータ（双方向）
    method: {
      get () { return this.hs.params.method },
      set (v) {
        this.$store.commit('HS_SET_PARAM', { key: 'method', value: v })
        this.controller?.syncAllMaps?.()
      }
    },
    exaggeration: {
      get () { return this.hs.params.exaggeration },
      set (v) {
        this.$store.commit('HS_SET_PARAM', { key: 'exaggeration', value: Number(v) })
        this.controller?.syncAllMaps?.()
      }
    },
    direction: {
      get () { return this.hs.params.direction },
      set (v) {
        this.$store.commit('HS_SET_PARAM', { key: 'direction', value: Number(v) })
        this.controller?.syncAllMaps?.()
      }
    },
    altitude: {
      get () { return this.hs.params.altitude },
      set (v) {
        this.$store.commit('HS_SET_PARAM', { key: 'altitude', value: Number(v) })
        this.controller?.syncAllMaps?.()
      }
    },

    // 配列系
    mdDirections () { return this.hs.params.mdDirections },
    mdAltitudes  () { return this.hs.params.mdAltitudes  },
    mdHighlights () { return this.hs.params.mdHighlights },
    mdShadows    () { return this.hs.params.mdShadows    },

    mdCount () {
      const p = this.hs.params
      return Math.min(p.mdDirections.length, p.mdAltitudes.length, p.mdHighlights.length, p.mdShadows.length)
    }
  },
  methods: {
    // ★ 追加：プリセット選択時の処理
    onSelectPreset (val) {
      this.selectedPresetName = val
      if (!val) return
      const p = (this.controller?.presets || []).find(x => x.name === val)
      if (!p) return
      this.controller?.applyPreset?.(p)
      this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire
    },

    // kind は 'dir'|'alt'|'hl'|'sh' を想定
    setMd (kind, i, v) {
      const keyMap = {
        dir: 'mdDirections',
        alt: 'mdAltitudes',
        hl:  'mdHighlights',
        sh:  'mdShadows'
      }
      const field = keyMap[kind]
      const val = (field === 'mdDirections' || field === 'mdAltitudes') ? Number(v) : String(v)
      this.$store.commit('HS_MD_SET_AT', { kind: field, index: i, value: val })
      this.controller?.syncAllMaps?.()
    },
    addLight () {
      this.$store.commit('HS_MD_ADD')
      this.controller?.syncAllMaps?.()
    },
    removeLight (i) {
      this.$store.commit('HS_MD_REMOVE', i)
      this.controller?.syncAllMaps?.()
    },
    resetToDefaults () {
      this.$store.commit('HS_RESET')
      this.controller?.syncAllMaps?.()
      // プリセットの一時選択はクリアしておく
      this.selectedPresetName = null
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
