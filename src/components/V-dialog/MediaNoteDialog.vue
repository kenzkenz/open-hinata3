<template>
  <v-dialog
      v-model="internal"
      :persistent="persistent"
      :fullscreen="isMobile"
      :max-width="isMobile ? undefined : maxWidth"
      transition="dialog-transition"
      @keydown.esc="onCancel"
      @update:modelValue="onUpdate"
  >
    <v-card class="fw-card">
      <!-- ヘッダー -->
      <div class="d-flex align-center justify-between px-3 py-2 border-b">
        <div class="d-flex align-center" style="gap:8px">
          <v-icon color="primary" size="30">mdi-camera</v-icon>
          <div class="text-subtitle-1">メディアとノート（任意）</div>
        </div>
      </div>

      <!-- 本文 -->
      <div class="dialog-body">
        <!-- プレビュー：縦長にも対応（contain）／動画にも対応 -->
        <div class="preview-wrap">
          <div v-if="previewUrl" class="preview-box">
            <template v-if="previewKind==='image'">
              <img :src="previewUrl" alt="preview" class="preview-img" />
            </template>
            <template v-else-if="previewKind==='video'">
              <video :src="previewUrl" class="preview-video" controls playsinline muted></video>
            </template>
          </div>
          <div v-else class="empty-box">
            <v-icon size="36">mdi-image-multiple-outline</v-icon>
            <div class="text-caption mt-1">未選択です</div>
          </div>
        </div>

        <!-- 操作ボタン群 -->
        <div class="controls">
          <v-menu location="bottom">
            <template #activator="{ props }">
              <v-btn size="small" variant="elevated" v-bind="props">
                <v-icon size="18" class="mr-1">mdi-camera</v-icon>撮影／選択
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item @click="openPicker('image')"><v-list-item-title>写真を撮影/選択</v-list-item-title></v-list-item>
              <v-list-item @click="openPicker('video')"><v-list-item-title>動画を撮影/選択</v-list-item-title></v-list-item>
            </v-list>
          </v-menu>
          <v-btn size="small" variant="text" :disabled="!previewUrl" @click="retake">
            <v-icon size="18" class="mr-1">mdi-autorenew</v-icon>撮り直し
          </v-btn>
        </div>

        <!-- ノート入力 -->
        <div class="note-wrap">
          <v-textarea
              v-model="note"
              variant="outlined"
              density="compact"
              :rows="isMobile ? 3 : 4"
              auto-grow
              maxlength="1000"
              counter
              hide-details="auto"
              label="ノート／コメント（任意）"
          />
        </div>
      </div>

      <!-- フッター -->
      <div class="d-flex justify-end px-3 pb-3 pt-1" style="gap:8px">
        <v-btn variant="text" @click="onCancel">キャンセル</v-btn>
        <v-btn :color="saveColor" :disabled="saving || !canSave" @click="onSave">
          <v-progress-circular v-if="saving" indeterminate size="16" class="mr-2" />
          保存
        </v-btn>
      </div>

      <!-- 隠しファイル入力：用途別に2つ（スマホでの挙動最適化） -->
      <input
          ref="fileInputImage"
          type="file"
          accept="image/*"
          capture="environment"
          class="d-none"
          @change="onFileChange('image', $event)"
      />
      <input
          ref="fileInputVideo"
          type="file"
          accept="video/*"
          class="d-none"
          @change="onFileChange('video', $event)"
      />
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'MediaNoteDialog',
  props: {
    modelValue:   { type: Boolean, default: false },
    persistent:   { type: Boolean, default: true },
    maxWidth:     { type: [Number, String], default: 520 },
    initialNote:  { type: String, default: '' },
    saveColor:    { type: String, default: 'primary' },
  },
  emits: ['update:modelValue', 'save', 'cancel'],
  data(){
    return {
      internal: false,
      isMobile: false,
      file: null,          // File | Blob
      previewUrl: '',
      previewKind: '',     // 'image' | 'video'
      note: '',
      saving: false,
    }
  },
  computed: {
    canSave(){
      // 画像/動画/ノートのいずれかがあれば保存可能
      return !!this.previewUrl || this.note.trim().length > 0
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v){
        this.internal = v
        if (v) this.onOpen(); else this.onClose()
      }
    }
  },
  mounted(){
    this.isMobile = /iPhone|Android.+Mobile/.test(navigator.userAgent)
  },
  methods: {
    onOpen(){
      this.note = this.initialNote || ''
    },
    onClose(){
      // クリーンアップ
    },
    onUpdate(v){ this.$emit('update:modelValue', v) },
    onCancel(){
      this.$emit('cancel');
      this.internal = false;
      this.$emit('update:modelValue', false);
    },
    openPicker(kind){
      if (kind==='video') this.$refs.fileInputVideo?.click();
      else this.$refs.fileInputImage?.click();
    },
    async onFileChange(kind, e){
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      // MIME 判定
      const t = (f.type || '').toLowerCase();
      const isImg = t.startsWith('image/');
      const isVid = t.startsWith('video/');
      if (kind==='image' && !isImg) return;
      if (kind==='video' && !isVid) return;

      // 既存URL掃除
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.file = f;
      this.previewKind = isVid ? 'video' : 'image';
      this.previewUrl = URL.createObjectURL(f);
    },
    retake(){ this.clearMedia(); this.openPicker(this.previewKind || 'image'); },
    clearMedia(){
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = '';
      this.previewKind = '';
      this.file = null;
      if (this.$refs.fileInputImage) this.$refs.fileInputImage.value = '';
      if (this.$refs.fileInputVideo) this.$refs.fileInputVideo.value = '';
    },
    async onSave(){
      if (this.saving) return;
      this.saving = true;
      try{
        const payload = { file: this.file || null, kind: this.previewKind || null, note: this.note.trim() };
        this.$emit('save', payload);
        this.internal = false;
        this.$emit('update:modelValue', false);
      } finally { this.saving = false; }
    },
  }
}
</script>

<style scoped>
.border-b{ border-bottom: 1px solid rgba(0,0,0,.08); }
.dialog-body{
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 12px;
  padding: 12px;
}
.preview-wrap{ width: 100%; }
.preview-box{
  width: 100%;
  max-height: 60vh;             /* スマホ縦長でもスクロール不要を目標 */
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.04);
  border-radius: 12px;
  overflow: hidden;              /* 角丸 */
}
.preview-img{ width: 100%; height: 100%; object-fit: contain; }
.preview-video{ width: 100%; height: 100%; object-fit: contain; }
.empty-box{
  width: 100%; height: 180px;
  border: 1px dashed rgba(0,0,0,.2);
  border-radius: 12px;
  display: grid; place-items: center;
  color: rgba(0,0,0,.5);
}
.controls{ display: flex; gap: 8px; }
.note-wrap{ }
@media (max-width: 480px){ .dialog-body{ padding:10px; gap:10px; } }
</style>
