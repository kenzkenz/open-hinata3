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
    <!-- ★ 3分割グリッド化＋モバイルは実画面高 -->
    <v-card class="fw-card" :class="{ 'mobile-full': isMobile }">
      <!-- ヘッダー -->
      <div class="d-flex align-center justify-between px-3 py-2 border-b">
        <div class="d-flex align-center" style="gap:8px">
          <v-icon color="primary" size="30">mdi-camera</v-icon>
          <div class="text-subtitle-1">メディアとノート（任意）</div>
        </div>
      </div>

      <!-- 本文（ここだけがスクロール領域） -->
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

      <!-- フッター（常に見える） -->
      <div class="footer-fixed d-flex justify-end px-3 pb-3 pt-1" style="gap:8px">
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
import { compressImageToTarget } from '@/js/utils/image-compress'
import { mapState } from 'vuex'

export default {
  name: 'MediaNoteDialog',
  props: {
    modelValue:   { type: Boolean, default: false },
    persistent:   { type: Boolean, default: true },
    maxWidth:     { type: [Number, String], default: 520 },
    initialNote:  { type: String, default: '' },
    saveColor:    { type: String, default: 'primary' },
    pointId:      { type: [Number, String], required: true },
    currentJobId: { type: [Number, String], required: true }
  },
  emits: ['save', 'loadPointsForJob', 'save:done', 'cancel', 'error', 'update:modelValue'],
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
    ...mapState(['userId']),
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
    async onSave({ imageMaxBytes = 1 * 1024 * 1024 } = {}) {
      if (this.saving) return;
      if (!this.pointId) { this.$emit('error', 'point_id is required'); return; }
      if (!this.userId)  { this.$emit('error', 'userId is required');  return; }

      this.saving = true;
      try {
        const kind = this.previewKind || 'none';  // 'image' | 'video' | 'none'
        const note = this.note?.trim() || '';
        let outFile = this.file || null;

        // 画像だけクライアント圧縮
        if (kind === 'image' && outFile) {
          outFile = await compressImageToTarget(outFile, { targetBytes: imageMaxBytes });
        }

        // -------- ① 保存サーバーへ（常に FormData）--------
        let media_path = ''; // URL
        let abs_path   = ''; // サーバーフルパス
        let media_size = ''; // 数値文字列
        let media_processing = (kind === 'video') ? 1 : 0; // 動画は処理中=1

        if (outFile && (kind === 'image' || kind === 'video')) {
          const fd1 = new FormData();
          fd1.append('dir', this.userId);                          // 例: 'u12345'
          fd1.append('kind', kind);                                // 'image' | 'video'
          fd1.append('media', outFile, outFile.name || 'media.bin');

          const r1 = await fetch('https://kenzkenz.net/myphp/sokui_upload.php', {
            method: 'POST',
            body: fd1,            // ← Content-Typeは付けない
          });

          let j1 = null;
          try { j1 = await r1.json(); } catch (_) {}
          if (r1.ok && j1 && j1.ok) {
            media_path = j1.url || '';
            abs_path   = j1.abs_path || '';
            media_size = j1.size_mb != null ? String(j1.size_mb) : '';
            if (kind === 'video' && (j1.processing === 0 || j1.processing === '0')) {
              media_processing = 0;
            }
          } else {
            this.$emit('error', (j1 && j1.error) ? j1.error : 'upload failed');
          }
        }

        // -------- ② DB保存（FormDataで6項目すべて送る）--------
        const fd2 = new FormData();
        fd2.append('action', 'job_points.update_media');
        fd2.append('point_id', String(this.pointId));
        fd2.append('note', note);                         // 空でも送る
        fd2.append('media_kind', kind);                   // 'none' | 'image' | 'video'
        fd2.append('media_path', media_path);             // URL（空ならPHPでNULL化）
        fd2.append('abs_path',   abs_path);               // サーバーパス（空→NULL）
        fd2.append('media_size', media_size);             // '' or 数値文字列
        fd2.append('media_processing', String(media_processing)); // '0' | '1'

        const r2 = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/user_kansoku.php', {
          method: 'POST',
          body: fd2,
        });
        const j2 = await r2.json();
        if (!r2.ok || !j2.ok) {
          this.$emit('error', (j2 && j2.error) ? j2.error : 'db update failed');
          return;
        }
        // 成功
        this.$emit('save:done', { upload: { media_path, abs_path, media_size }, db: j2.data });
        this.$emit('loadPointsForJob', this.currentJobId, { fix: true });
        this.onCancel();
      } catch (e) {
        this.$emit('error', e?.message || String(e));
      } finally {
        this.saving = false;
      }
    },
    onOpen(){
      this.note = this.initialNote || ''
    },
    onClose(){
      // クリーンアップ：ObjectURL破棄など
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
      const t = (f.type || '').toLowerCase();
      const isImg = t.startsWith('image/');
      const isVid = t.startsWith('video/');
      if (kind==='image' && !isImg) return;
      if (kind==='video' && !isVid) return;

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
  }
}
</script>

<style scoped>
.border-b{ border-bottom: 1px solid rgba(0,0,0,.08); }

/* === 3分割グリッド：header / body / footer === */
.fw-card{
  display: grid;
  grid-template-rows: auto 1fr auto;
  width: 100%;
  height: 100%; /* PCダイアログ時は v-dialog max-height に従う */
}

/* モバイル全画面時、確実に実画面高に */
.mobile-full{
  height: 100dvh; /* アドレスバー伸縮対策 */
}

/* 本文だけスクロール可能に（子overflow有効化のmin-height:0が肝） */
.dialog-body{
  overflow: auto;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto 1fr; /* プレビュー / 操作群 / ノート */
  gap: 12px;
  padding: 12px;
}

/* フッターは常時見える＋ホームバー安全域 */
.footer-fixed{
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: transparent;
}

/* プレビュー */
.preview-wrap{ width: 100%; }
.preview-box{
  width: 100%;
  max-height: 60vh;             /* デスクトップや非全画面の上限 */
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

/* モバイル時の調整：本文余白をやや縮め、プレビュー上限を45dvhに */
@media (max-width: 600px){
  .dialog-body{ padding: 10px; gap: 10px; }
  .preview-box{ max-height: 45dvh; } /* ★縦長でもフッターを常に露出 */
}
</style>
