
<template>
  <v-dialog v-model="dlgModel" max-width="800" persistent>
    <v-card>
      <v-card-title class="text-h6">埋め込みコード</v-card-title>

      <v-card-text>
        <v-row dense>
          <v-col cols="6">
            <v-text-field
                v-model.number="widthPercent"
                type="number"
                label="幅（%）"
                min="1" max="100"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
                v-model.number="heightPx"
                type="number"
                label="高さ（px）"
                min="100"
            />
          </v-col>
        </v-row>

        <!-- 実際の <iframe> でプレビュー -->
        <div class="preview-frame mt-2">
          <iframe
              :src="srcUrl"
              title="OH3 embed preview"
              allow="fullscreen; clipboard-write"
              style="width:100%; border:0;"
              :height="heightPx"
          ></iframe>
        </div>

        <v-textarea
            :value="iframeCode"
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
      heightPx: 300,
      copied: false
    }
  },
  computed: {
    // ストアの state をそのまま v-model したい要求に対応
    dlgModel: {
      get () { return this.$store.state.iframeVDIalog },
      set (v) { this.$store.state.iframeVDIalog = v }
    },
    srcUrl () {
      // パーマリンクそのまま（embed=1 は付与しない運用）
      return this.currentPermalink()
    },
    iframeCode () {
      const widthAttr = `${this.widthPercent}%`
      const heightAttr = `${this.heightPx}`
      return `<iframe src="${this.srcUrl}" width="${widthAttr}" height="${heightAttr}" loading="lazy" style="border:0;" allow="fullscreen; clipboard-write" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    }
  },
  mounted () {
    // パーマリンクを最新化（OH3 既存のトグルに合わせる）
    if (this.$store && this.$store.state && 'updatePermalinkFire' in this.$store.state) {
      this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire
    }
  },
  methods: {
    currentPermalink () {
      const s = this.$store && this.$store.state && this.$store.state.url
      return (typeof s === 'string' && s) ? s : window.location.href
    },
    copy () {
      navigator.clipboard.writeText(this.iframeCode)
      this.copied = true
      setTimeout(() => { this.copied = false }, 1400)
    },
    close () {
      this.dlgModel = false
    }
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
