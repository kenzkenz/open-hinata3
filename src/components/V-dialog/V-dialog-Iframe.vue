<template>
  <v-dialog v-model="dlgModel" max-width="800" persistent>
    <v-card>
      <v-card-title class="text-h6">埋め込みコード</v-card-title>

      <v-card-text>
        <v-row dense>
          <v-col cols="4">
            <v-text-field
                v-model.number="widthPercent"
                type="number"
                label="幅（%）"
                min="1" max="100"
            />
          </v-col>
          <v-col cols="4">
            <v-text-field
                v-model.number="heightPx"
                type="number"
                label="高さ（px）"
                min="100"
            />
          </v-col>
          <v-col cols="4" class="d-flex align-center">
            <v-switch
                v-model="s_isDrawFit"
                color="primary"
                inset
                hide-details
                label="ドローにフィット"
                @update:modelValue="onFitDrawToggle"
            />
          </v-col>
        </v-row>
        <div class="d-flex ga-2 mt-2">
          <v-btn color="primary" @click="tagCreate">iframeタグを作成</v-btn>
        </div>

        <!-- 実際の <iframe> でプレビュー -->
        <div class="preview-frame mt-2">
          <iframe
              :src="currentPermalink"
              title="OH3 embed preview"
              allow="fullscreen; clipboard-write"
              :style="{ width: width === 0 ? '100%' : `${width}px`, border: '0' }"
              :height="heightPx"
          ></iframe>
        </div>

        <v-textarea
            :model-value="iframeCode"
            rows="4"
            auto-grow
            readonly
            class="code-area mt-2"
            label="<iframe> タグ"
        />

        <div class="d-flex ga-2 mt-2">
          <v-btn color="primary" @click="copy">iframeタグをコピー</v-btn>
        </div>

        <v-expand-transition>
          <v-alert v-if="copied" type="success" variant="tonal" class="mt-3">コピーしました。</v-alert>
        </v-expand-transition>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="close">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'EmbedIframeSimpleDialog',
  data () {
    return {
      widthPercent: 100,
      width: 0,
      heightPx: 300,
      fitDraw: false,
      copied: false,
      currentPermalink: '',
    }
  },
  computed: {
    s_isDrawFit: {
      get () { return this.$store.state.isDrawFit },
      set (v) { this.$store.state.isDrawFit = v }
    },
    dlgModel: {
      get () { return this.$store.state.iframeVDIalog },
      set (v) { this.$store.state.iframeVDIalog = v }
    },
    iframeCode () {
      const widthAttr = `${this.widthPercent}%`
      const heightAttr = `${this.heightPx}`
      if (this.currentPermalink) {
        return `<iframe src="${this.currentPermalink}" width="${widthAttr}" height="${heightAttr}" loading="lazy" style="border:0;" allow="fullscreen; clipboard-write" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
      } else {
        return  ''
      }
    }
  },
  mounted () {
  },
  methods: {
    tagCreate() {
      this.$store.state.loadingMessage3 = 'タグ作成中'
      this.$store.state.loading3 = true
      // alert(this.s_isDrawFit)
      this.$nextTick(() => {
        this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire
        setTimeout(() => {
          const s = this.$store.state.url
          // alert(s)
          this.currentPermalink = (typeof s === 'string' && s) ? s : window.location.href
          this.$store.state.loading3 = false
        },3000) // たっぷり遅延
      })

    },
    onFitDrawToggle(v) {
      // alert(v)
    },
    copy () {
      navigator.clipboard.writeText(this.iframeCode)
      this.copied = true
      setTimeout(() => { this.copied = false }, 1400)
    },
    close () {
      this.dlgModel = false
    }
  },
  watch: {
    widthPercent(v) {
      this.width = document.querySelector('.preview-frame').clientWidth * v / 100
    },
    dlgModel(v) {
      this.currentPermalink = ''
      const map01 = this.$store.state.map01
      if (v) {
        const length = map01.getSource('click-circle-source')._data.features.filter(f => f.properties.id !== 'config').length
        // alert(length)
        if (length > 0) {
          this.s_isDrawFit = true
        } else {
          this.s_isDrawFit = false
        }
      } else {
        this.s_isDrawFit = false
      }
    },
  }
}
</script>

<style scoped>
.preview-frame { width: 100%; border: 1px solid rgba(0,0,0,.12); border-radius: 12px; overflow: hidden; }
.preview-frame > iframe { display: block; width: 100%; }
.code-area :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style>
