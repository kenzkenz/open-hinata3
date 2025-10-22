<template>
  <!-- バージョン通知 -->
  <v-dialog v-model="sVersionMessage" max-width="500px">
    <v-card>
      <v-card-title>バージョンが古くなっています。</v-card-title>
      <v-card-text>
        <p class="mb-4">アップデートしてください。現在のレイヤーを記憶したままアップデートします。</p>
        <v-btn @click="appUpdate">アップデート実行</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="sVersionMessage=false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 本体 -->
  <v-dialog v-model="sFileDialogOpen" :max-width="isMobile ? 680 : 1080">
    <v-card class="pa-2">
      <!-- ヘッダー -->
      <div class="d-flex align-center justify-space-between px-3 py-2">
        <div class="d-flex align-center" style="gap:10px">
          <v-icon :color="iconColor" size="32">{{ iconName }}</v-icon>
          <div>
            <div class="text-subtitle-1">{{ detectedMessage }}</div>
            <!-- ↓ 要望により説明行は削除 -->
            <!-- <div class="text-caption text-medium-emphasis">拡張子に応じて処理を切り替えます（{{ files.length }}件）</div> -->
          </div>
        </div>
        <v-btn icon variant="text" @click="sFileDialogOpen=false">
          <v-icon size="28">mdi-close</v-icon>
        </v-btn>
      </div>

      <v-card-text>
        <!-- ファイル名 -->
        <div class="mb-4" v-if="files.length">
          <v-chip
              v-for="(f,i) in files"
              :key="i"
              class="ma-1"
              label
              variant="flat"
              size="small"
          >
            <v-icon start size="18">mdi-file</v-icon>{{ f.name || ('file-'+(i+1)) }}
          </v-chip>
        </div>

        <!-- ====== PDF ====== -->
        <div v-if="ext==='pdf'">
          <!-- 進行表示（青系） -->
          <div v-if="stage==='upload' || stage==='open' || stage==='warm'" class="statusBar mb-3">
            <div class="statusText">
              <template v-if="stage==='upload'">アップロード中…</template>
              <template v-else-if="stage==='open'">サーバーで準備中…</template>
              <template v-else>サムネ生成中… {{ thumbLoaded }} / {{ pdfPages }}</template>
            </div>
            <v-progress-linear
                color="primary"
                :indeterminate="stage!=='warm'"
                :model-value="stage==='warm' ? Math.round((thumbLoaded/(pdfPages||1))*100) : 0"
                height="6"
            />
          </div>

          <!-- コントロール -->
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center" style="gap:8px">
              <v-btn size="small" variant="tonal" :disabled="!pdfToken || pdfPage<=1" @click="stepPage(-1)">
                <v-icon>mdi-chevron-left</v-icon>
              </v-btn>
              <v-text-field
                  v-model.number="pdfPage"
                  type="number"
                  min="1"
                  :max="pdfPages || 1"
                  density="compact"
                  hide-details
                  style="width:96px"
              />
              <v-btn size="small" variant="tonal" :disabled="!pdfToken || (pdfPages && pdfPage>=pdfPages)" @click="stepPage(1)">
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
              <span class="text-caption text-medium-emphasis" v-if="pdfPages">/ 全{{ pdfPages }}ページ</span>
            </div>
            <div>
              <v-btn color="primary" size="small" :disabled="!pdfToken" :loading="pdfExporting" @click="exportCurrentPage">
                <v-icon start>mdi-file-image</v-icon> このページをJPEG化
              </v-btn>
            </div>
          </div>

          <!-- 2カラム -->
          <div class="d-flex" style="gap:16px">
            <!-- 左：サムネ -->
            <div class="thumbColumn">
              <div v-if="!pdfToken" class="pa-4 text-medium-emphasis">PDFを選択すると自動でサムネを生成します</div>
              <div v-else class="thumbGrid">
                <div
                    v-for="i in pdfPages"
                    :key="'thumb-'+i"
                    class="thumbCard"
                    :class="[{ active: pdfPage===i }, i % 2 === 0 ? 'isEven' : 'isOdd']"
                    @click="selectPage(i)"
                    v-show="!thumbErrorMap[i]"
                >
                  <div class="thumbBadge">
                    <v-icon size="14">mdi-file-pdf-box</v-icon><span>{{ i }}</span>
                  </div>
                  <img
                      :src="thumbUrl(i)"
                      :alt="'p'+i"
                      class="thumbImg"
                      loading="lazy"
                      @load="onThumbLoad(i)"
                      @error="onThumbError(i)"
                  >
                  <div class="thumbHover">
                    <v-btn icon size="small" variant="text" title="このページを表示" @click.stop="selectPage(i)">
                      <v-icon size="18">mdi-eye</v-icon>
                    </v-btn>
                    <v-btn icon size="small" variant="text" title="このページをJPEG化" @click.stop="exportPage(i)">
                      <v-icon size="18">mdi-download</v-icon>
                    </v-btn>
                  </div>
                  <div class="thumbAccent" v-show="pdfPage===i"></div>
                </div>
              </div>
            </div>

            <!-- 右：プレビュー（縦長でも切れない） -->
            <div class="previewFrame">
              <div class="previewPane noScroll">
                <img
                    v-if="pdfToken"
                    :key="'preview-'+previewKey"
                    :src="currentPreviewSrc"
                    :alt="'preview-p'+pdfPage"
                    class="previewImg"
                    @load="onPreviewLoad"
                    @error="onPreviewError"
                >
                <div v-else class="pa-6 text-medium-emphasis">プレビューを表示できません</div>

                <div v-show="pdfOpening || previewLoading" class="overlay">
                  <v-progress-circular indeterminate size="32" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="pdfError" class="mt-2 text-error text-caption">{{ pdfError }}</div>
        </div>

        <!-- 画像 -->
        <div v-else-if="ext==='jpg' || ext==='jpeg' || ext==='png'">
          <div class="text-body-2 mb-2">画像プレビュー</div>
          <div class="d-flex flex-wrap" style="gap:12px">
            <div
                v-for="(url,i) in previewUrls"
                :key="'img-'+i"
                class="rounded-lg overflow-hidden"
                style="width:min(320px,100%); border:1px solid var(--v-theme-outline);"
            >
              <img :src="url" alt="preview" style="display:block; width:100%; height:auto; object-fit:contain">
            </div>
          </div>
        </div>

        <!-- フォールバック -->
        <div v-else>
          <div class="text-medium-emphasis">この拡張子（{{ extUpper }}）のUIはまだ用意していません。</div>
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer></v-spacer>
        <v-btn
            v-if="ext==='pdf'"
            color="primary"
            :loading="pdfOpening"
            :disabled="!files.length"
            @click="openOnServer(true)"
        >
          <v-icon start>mdi-file-pdf-box</v-icon> サーバーで全ページ準備
        </v-btn>
        <v-btn v-else-if="ext==='jpg' || ext==='jpeg' || ext==='png'" color="primary" @click="processImage">
          <v-icon start>mdi-file-image</v-icon> 画像を処理
        </v-btn>
        <v-btn v-else color="primary" @click="processUnknown">
          <v-icon start>mdi-cog</v-icon> 汎用処理
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
const APIBASE = 'https://kenzkenz.net/myphp/pdf-service.php'

export default {
  name: 'VDialogCommon',

  computed: {
    sVersionMessage: {
      get(){ return this.$store.state.commonDialog.versionMessage },
      set(v){ this.$store.state.commonDialog.versionMessage = v }
    },
    sFileDialogOpen: {
      get(){ return this.$store.state.commonDialog.fileDropOpen },
      set(v){ this.$store.state.commonDialog.fileDropOpen = v }
    },
    ext(){ return (this.$store.state.commonDialog.fileDropExt || '').toLowerCase() },
    files(){ return this.$store.state.commonDialog.fileDropFiles || [] },
    extUpper(){ return (this.ext || '').toUpperCase() },
    detectedMessage(){
      const label = this.ext==='pdf' ? 'PDF' : (this.ext==='png' ? 'PNG' : ((this.ext==='jpg'||this.ext==='jpeg')?'JPG':this.extUpper||'未知の'))
      return `${label}ファイルを検出しました。`
    },
    iconName(){
      if(this.ext==='pdf') return 'mdi-file-pdf-box'
      if(this.ext==='png' || this.ext==='jpg' || this.ext==='jpeg') return 'mdi-file-image'
      return 'mdi-file'
    },
    iconColor(){
      if(this.ext==='pdf') return 'red'
      if(this.ext==='png' || this.ext==='jpg' || this.ext==='jpeg') return 'teal'
      return 'grey'
    },
    isMobile(){ return /iPhone|Android.+Mobile/.test(navigator.userAgent) },
    previewUrls(){
      try {
        return (this.files||[]).map(f => (f instanceof File || f instanceof Blob) ? URL.createObjectURL(f) : null).filter(Boolean)
      } catch(e){ console.warn('preview url error', e); return [] }
    }
  },

  data(){
    return {
      // PDF管理
      pdfToken: '',
      pdfPages: 0,
      pdfName: '',
      pdfPage: 1,

      // サムネ進捗（warm表示用）
      thumbLoadedMap: {},   // {page:true}
      thumbLoaded: 0,

      // サムネ失敗
      thumbErrorMap: {},

      // プレビュー
      currentPreviewSrc: '',
      previewLoading: false,
      previewError: '',   // 画面には出さない
      previewKey: 0,

      // 状態
      stage: 'idle',        // idle | upload | open | warm | ready
      pdfOpening: false,
      pdfExporting: false,

      // エラー
      pdfError: '',
      openAbort: null
    }
  },

  watch:{
    sFileDialogOpen(v){
      if(v && this.ext==='pdf' && this.files.length) this.openOnServer(true)
      if(!v) this.resetServerState()
    },
    files(){
      this.resetServerState()
      if(this.ext==='pdf' && this.sFileDialogOpen && this.files.length) this.openOnServer(true)
    },
    pdfPage(v){
      if(!this.pdfToken) return
      const n = Math.max(1, Math.min(this.pdfPages||1, Number(v||1)))
      if(n!==v) this.pdfPage = n
      this.loadPreview(n)
    }
  },

  methods:{
    appUpdate(){
      location.reload(true)
      this.sVersionMessage = false
    },

    resetServerState(){
      this.pdfToken = ''
      this.pdfPages = 0
      this.pdfName = ''
      this.pdfPage = 1
      this.thumbLoadedMap = {}
      this.thumbLoaded = 0
      this.thumbErrorMap = {}
      this.currentPreviewSrc = ''
      this.previewLoading = false
      this.previewError = ''
      this.pdfError = ''
      this.stage = 'idle'
      if(this.openAbort){ try{ this.openAbort.abort() }catch(e){} this.openAbort = null }
    },

    stepPage(delta){
      const next = Math.max(1, Math.min((this.pdfPages||Infinity), Number(this.pdfPage||1)+Number(delta||0)))
      this.pdfPage = next
    },
    selectPage(i){ this.pdfPage = i },

    async openOnServer(showSpinner=false){
      if(!this.files.length || this.ext!=='pdf') return
      const file = this.files[0]
      this.pdfError = ''
      this.previewError = ''

      if(showSpinner) this.previewLoading = true
      this.pdfOpening = true
      this.stage = 'upload'

      try{
        const fd = new FormData()
        fd.append('file', file, file.name || 'document.pdf')

        const ctrl = new AbortController()
        this.openAbort = ctrl

        const res = await fetch(`${APIBASE}?action=open`, { method:'POST', body:fd, signal:ctrl.signal })
        this.stage = 'open'
        if(!res.ok) throw new Error(await res.text().catch(()=> '') || `open failed: ${res.status}`)

        const json = await res.json()
        this.pdfToken = json.token
        this.pdfPages = json.pages
        this.pdfName = json.name
        this.pdfPage = 1
        this.thumbLoadedMap = {}
        this.thumbLoaded = 0
        this.thumbErrorMap = {}

        this.stage = 'warm'
        await this.loadPreview(1)
      }catch(e){
        if(e && e.name!=='AbortError') this.pdfError = String((e && e.message) || e)
        this.previewLoading = false
      }finally{
        this.pdfOpening = false
        this.openAbort = null
      }
    },

    thumbUrl(p){
      if(!this.pdfToken) return ''
      const qp = new URLSearchParams({ action:'thumb', token:this.pdfToken, page:String(p) })
      return `${APIBASE}?${qp.toString()}`
    },
    previewUrl(p){
      if(!this.pdfToken) return ''
      const qp = new URLSearchParams({ action:'preview', token:this.pdfToken, page:String(p) })
      return `${APIBASE}?${qp.toString()}`
    },

    onThumbLoad(p){
      if(this.thumbLoadedMap[p]) return
      this.thumbLoadedMap = { ...this.thumbLoadedMap, [p]: true }
      this.thumbLoaded = Object.keys(this.thumbLoadedMap).length
      if(this.thumbLoaded >= (this.pdfPages||0)) this.stage = 'ready'
    },
    onThumbError(p){
      this.thumbErrorMap = { ...this.thumbErrorMap, [p]: true }
      if(!this.thumbLoadedMap[p]){
        this.thumbLoadedMap = { ...this.thumbLoadedMap, [p]: true }
        this.thumbLoaded = Object.keys(this.thumbLoadedMap).length
      }
      if(this.thumbLoaded >= (this.pdfPages||0)) this.stage = 'ready'
    },

    async loadPreview(p){
      if(!this.pdfToken) return
      this.previewError = ''
      this.previewLoading = true

      const url = this.previewUrl(p)
      try{
        await new Promise((resolve, reject)=>{
          const img = new Image()
          img.onload = ()=> resolve(true)
          img.onerror = ()=> reject(new Error('preview load error'))
          img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now()
        })
        this.currentPreviewSrc = url
        this.previewKey++
        this.previewLoading = false
      }catch(e){
        this.previewLoading = false
      }
    },

    onPreviewLoad(){ this.previewLoading = false },
    onPreviewError(){ this.previewLoading = false },

    exportCurrentPage(){ this.exportPage(this.pdfPage) },
    exportPage(p){
      if(!this.pdfToken) return
      const qp = new URLSearchParams({ action:'export', token:this.pdfToken, page:String(p) })
      window.open(`${APIBASE}?${qp.toString()}`, '_blank')
    },

    async processImage(){ this.toast('画像処理を開始しました'); this.sFileDialogOpen=false },
    async processUnknown(){ this.toast('汎用処理を開始しました'); this.sFileDialogOpen=false },

    toast(msg){ try{ console.log('[INFO]', msg) }catch(e){} }
  },

  beforeUnmount(){
    (this.previewUrls||[]).forEach(u=>{ try{ URL.revokeObjectURL(u) }catch(e){} })
    if(this.openAbort){ try{ this.openAbort.abort() }catch(e){} this.openAbort=null }
  }
}
</script>

<style scoped>
/* 進捗バー */
.statusBar{
  border:1px solid var(--v-theme-outline);
  background: linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,0));
  border-radius: 10px;
  padding: 10px 12px
}
.statusText{ font-size:.9rem; margin-bottom:6px }

/* プレビュー枠（ヘッダー無し） */
.previewFrame{
  flex:1 1 auto;
  display:flex;
  flex-direction:column;
  border-radius:14px;
  border:1px solid rgba(0,0,0,.12);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.35), 0 6px 18px rgba(0,0,0,.06);
  overflow:hidden;
  background:#fff
}
.previewPane{
  position: relative;
  height: 60vh;
  max-height: 60vh;
  overflow: hidden;   /* スクロールさせない */
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0))
}
.previewPane::-webkit-scrollbar{ display:none }
.previewPane{ -ms-overflow-style:none; scrollbar-width:none }

/* ←ここを変更：縦長でも切れないようにmaxでフィット */
.previewImg{
  display:block;
  max-width:100%;
  max-height:100%;
  width:auto;
  height:auto;
  object-fit:contain;
}

.overlay{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background: rgba(0,0,0,0.06);
}

/* サムネ装飾 */
.thumbColumn{
  width: 280px;
  max-height: 60vh;
  overflow: auto;
  border: 1px solid var(--v-theme-outline);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(0,0,0,.015), rgba(0,0,0,0))
}
.thumbGrid{
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 8px
}
.thumbCard{
  position: relative;
  border: 1px solid var(--v-theme-outline);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 1px rgba(0,0,0,.02), 0 2px 6px rgba(0,0,0,.04);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease
}
.thumbCard.isOdd{ border-color: rgba(0,128,255,.35) }
.thumbCard.isEven{ border-color: rgba(0,200,120,.35) }
.thumbCard:hover{ box-shadow: 0 4px 12px rgba(0,0,0,.08); transform: translateY(-1px) }
.thumbCard.active{ border-color: var(--v-theme-primary); box-shadow: 0 6px 16px rgba(0,0,0,.12) }
.thumbAccent{ position:absolute; left:0; top:0; bottom:0; width:4px; background: var(--v-theme-primary) }
.thumbBadge{
  position: absolute;
  top: 6px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 1;
  border-radius: 999px;
  color: #0a0a0a;
  background: rgba(255,255,255,.92);
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
  z-index: 2
}
.thumbImg{ display:block; width:100%; height:auto; object-fit:contain; background:#f7f7f8 }
.thumbHover{
  position:absolute; right:6px; top:6px; display:flex; gap:4px;
  opacity:0; transform:translateY(-2px); transition:all .15s ease; z-index:3
}
.thumbCard:hover .thumbHover{ opacity:1; transform:translateY(0) }
</style>
