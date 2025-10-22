<template>
  <!-- ① 既存：バージョン通知ダイアログ -->
  <v-dialog v-model="s_versionMessage" max-width="500px">
    <v-card>
      <v-card-title>バージョンが古くなっています。</v-card-title>
      <v-card-text>
        <p style="margin-bottom:20px;">
          アップデートしてください。現在のレイヤーを記憶したままアップデートします。
        </p>
        <v-btn @click="appUpdate">アップデート実行</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="s_versionMessage = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ② 子：拡張子分岐ダイアログ（親がStoreで開く） -->
  <v-dialog v-model="s_fileDialogOpen" :max-width="isMobile ? 680 : 820">
    <v-card class="pa-2">
      <!-- ヘッダー：アイコン + テキスト（バッジなし） -->
      <div class="d-flex align-center justify-space-between px-3 py-2">
        <div class="d-flex align-center" style="gap:10px">
          <v-icon :color="iconColor" size="32">{{ iconName }}</v-icon>
          <div>
            <div class="text-subtitle-1">{{ detectedMessage }}</div>
            <div class="text-caption text-medium-emphasis">
              拡張子に応じて処理を切り替えます（{{ files.length }}件）
            </div>
          </div>
        </div>
        <v-btn icon variant="text" @click="s_fileDialogOpen = false">
          <v-icon size="28">mdi-close</v-icon>
        </v-btn>
      </div>

      <v-card-text>
        <!-- ファイル名チップ -->
        <div class="mb-4" v-if="files.length">
          <v-chip
              v-for="(f, i) in files"
              :key="i"
              class="ma-1"
              label
              variant="flat"
              size="small"
          >
            <v-icon start size="18">mdi-file</v-icon>{{ f.name || ('file-' + (i + 1)) }}
          </v-chip>
        </div>

        <!-- PDFプレビュー -->
        <div v-if="ext==='pdf'">
          <div class="text-body-2 mb-2">PDF プレビュー</div>
          <div class="rounded-lg overflow-hidden" style="border:1px solid var(--v-theme-outline);">
            <iframe
                v-if="previewUrls[0]"
                :src="previewUrls[0]"
                style="width:100%; height:60vh; border:0;"
                title="PDF Preview"
            ></iframe>
            <div v-else class="pa-6 text-medium-emphasis">プレビューを生成できませんでした。</div>
          </div>
        </div>

        <!-- 画像プレビュー（jpg / png） -->
        <div v-else-if="ext==='jpg' || ext==='jpeg' || ext==='png'">
          <div class="text-body-2 mb-2">画像プレビュー</div>
          <div class="d-flex flex-wrap" style="gap:12px">
            <div
                v-for="(url, i) in previewUrls"
                :key="'img-'+i"
                class="rounded-lg overflow-hidden"
                style="width: min(320px, 100%); border:1px solid var(--v-theme-outline);"
            >
              <img :src="url" alt="preview" style="display:block; width:100%; height:auto; object-fit:contain;">
            </div>
          </div>
        </div>

        <!-- フォールバック（将来拡張） -->
        <div v-else>
          <div class="text-medium-emphasis">
            この拡張子（{{ extUpper }}）のUIはまだ用意していません。
          </div>
        </div>
      </v-card-text>

      <!-- アクション：拡張子別に処理開始 -->
      <v-card-actions class="px-4 pb-4">
        <v-spacer></v-spacer>

        <v-btn
            v-if="ext==='pdf'"
            color="primary"
            @click="processPdf"
        >
          <v-icon start>mdi-file-pdf-box</v-icon> PDFを処理
        </v-btn>

        <v-btn
            v-else-if="ext==='jpg' || ext==='jpeg' || ext==='png'"
            color="primary"
            @click="processImage"
        >
          <v-icon start>mdi-file-image</v-icon> 画像を処理
        </v-btn>

        <v-btn
            v-else
            color="primary"
            @click="processUnknown"
        >
          <v-icon start>mdi-cog</v-icon> 汎用処理
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'VDialogCommon',
  computed: {
    // 既存：バージョン通知
    s_versionMessage: {
      get() { return this.$store.state.commonDialog.versionMessage },
      set(v) { this.$store.state.commonDialog.versionMessage = v }
    },

    // 子：開閉・拡張子・ファイルはすべてStore由来
    s_fileDialogOpen: {
      get() { return this.$store.state.commonDialog.fileDropOpen },
      set(v) { this.$store.state.commonDialog.fileDropOpen = v }
    },
    ext() {
      return (this.$store.state.commonDialog.fileDropExt || '').toLowerCase()
    },
    files() {
      return this.$store.state.commonDialog.fileDropFiles || []
    },

    // 表示テキスト
    extUpper() { return (this.ext || '').toUpperCase() },
    detectedMessage() {
      const label =
          this.ext === 'pdf' ? 'PDF' :
              (this.ext === 'png' ? 'PNG' :
                  (this.ext === 'jpg' || this.ext === 'jpeg' ? 'JPG' : this.extUpper || '未知の'));
      return `${label}ファイルを検出しました。`
    },

    // 拡張子ごとのアイコンと色
    iconName() {
      if (this.ext === 'pdf') return 'mdi-file-pdf-box'
      if (this.ext === 'png' || this.ext === 'jpg' || this.ext === 'jpeg') return 'mdi-file-image'
      return 'mdi-file'
    },
    iconColor() {
      if (this.ext === 'pdf') return 'red'
      if (this.ext === 'png' || this.ext === 'jpg' || this.ext === 'jpeg') return 'teal'
      return 'grey'
    },

    isMobile() {
      return /iPhone|Android.+Mobile/.test(navigator.userAgent)
    },

    // プレビューURL（ObjectURLを生成）
    previewUrls() {
      try {
        return (this.files || [])
            .map(f => (f instanceof File || f instanceof Blob) ? URL.createObjectURL(f) : null)
            .filter(Boolean)
      } catch (e) {
        console.warn('preview url error', e)
        return []
      }
    }
  },

  methods: {
    // 既存
    appUpdate() {
      location.reload(true)
      this.s_versionMessage = false
    },

    // 拡張子別の処理（必要に応じて実装）
    async processPdf() {
      this.toast('PDF処理を開始しました')
      this.s_fileDialogOpen = false
    },
    async processImage() {
      this.toast('画像処理を開始しました')
      this.s_fileDialogOpen = false
    },
    async processUnknown() {
      this.toast('汎用処理を開始しました')
      this.s_fileDialogOpen = false
    },

    toast(msg) {
      try { console.log('[INFO]', msg) } catch (e) {}
    }
  },

  beforeUnmount() {
    // ObjectURLの後始末
    (this.previewUrls || []).forEach(u => { try { URL.revokeObjectURL(u) } catch (e) {} })
  }
}
</script>

<style scoped>
/* 必要ならスタイルをここに追加（ドロップゾーンは親側にあり、この子には不要） */
</style>
