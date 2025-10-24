<template>
  <v-dialog v-model="internal" max-width="980" scrollable transition="dialog-bottom-transition">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2 oh3-title">
          <v-icon class="mr-2" color="primary">mdi-table-search</v-icon>
          求積表インポート（OCR）
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-divider color="primary"></v-divider>

      <div class="px-4 pt-2">
        <v-stepper v-model="step" alt-labels flat color="primary">
          <v-stepper-header>
            <v-stepper-item color="primary" :complete="step>1" :value="1" title="取り込み" subtitle="写真/PDF" />
            <v-divider />
            <v-stepper-item color="primary" :complete="step>2" :value="2" title="OCR" subtitle="自動抽出" />
            <v-divider />
            <v-stepper-item color="primary" :complete="step>3" :value="3" title="列マッピング" subtitle="X/Y/距離/角 等" />
            <v-divider />
            <v-stepper-item color="primary" :complete="step>4" :value="4" title="プレビュー・検算" subtitle="閉合/面積＋地図" />
            <v-divider />
            <v-stepper-item color="primary" :complete="false" :value="5" title="取り込み" subtitle="OH3へ反映" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- STEP1 -->
            <v-stepper-window-item :value="1">
              <div class="pa-4">
                <div class="d-flex flex-wrap gap-4">
                  <v-file-input
                      v-model="file"
                      accept="image/*,.pdf"
                      label="求積表の写真 or PDF を選択"
                      prepend-icon="mdi-camera"
                      show-size
                      @change="onFileSelected"
                  />
                  <div class="flex-1 min-h-40">
                    <div v-if="previewUrl" class="preview-box">
                      <img v-if="isImage" :src="previewUrl" class="preview-img" alt="preview" />
                      <div v-else class="text-medium-emphasis">PDFを読み込みました（1ページ目を表示）</div>
                    </div>
                    <div v-else class="text-medium-emphasis">ファイル未選択</div>
                  </div>
                </div>

                <div class="mt-4 d-flex align-center gap-3">
                  <v-switch v-model="useCloudFallback" inset :label="`難しい場合はクラウド表OCRへ自動フォールバック`" />
                  <v-select v-model="cloudService" :items="cloudServiceItems" label="サービス" style="max-width: 240px" :disabled="!useCloudFallback" />
                </div>
              </div>
            </v-stepper-window-item>

            <!-- STEP2 -->
            <v-stepper-window-item :value="2">
              <div class="pa-4">
                <div class="d-flex align-center gap-3 mb-3">
                  <v-btn :loading="busy" @click="doOCR" prepend-icon="mdi-text-recognition" color="primary">OCR 実行</v-btn>
                  <span class="text-medium-emphasis">端末内OCR → 失敗/低信頼なら {{ cloudService }} にフォールバック</span>
                </div>
                <v-alert v-if="ocrError" type="error" density="comfortable" class="mb-4">{{ ocrError }}</v-alert>

                <div v-if="rawTable.headers.length" class="ocr-table">
                  <div class="text-subtitle-2 mb-2">抽出プレビュー</div>
                  <div class="table-scroll">
                    <table class="oh3-simple">
                      <thead>
                      <tr><th v-for="(h,i) in rawTable.headers" :key="'h'+i">{{ h }}</th></tr>
                      </thead>
                      <tbody>
                      <tr v-for="(r,ri) in rawTable.rows.slice(0, 20)" :key="'r'+ri">
                        <td v-for="(c,ci) in r" :key="'c'+ci">{{ c }}</td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-else class="text-medium-emphasis">まだ結果がありません。OCRを実行してください。</div>
              </div>
            </v-stepper-window-item>

            <!-- STEP3 -->
            <v-stepper-window-item :value="3">
              <div class="pa-4">
                <div v-if="rawTable.headers.length">
                  <div class="text-subtitle-2 mb-2">列の役割を確認/修正</div>
                  <div class="d-flex flex-wrap gap-3 mb-4">
                    <div v-for="(h, i) in rawTable.headers" :key="'m'+i" class="map-chip">
                      <div class="text-caption text-medium-emphasis mb-1">{{ h }}</div>
                      <v-select density="comfortable" variant="outlined" :items="roleOptions" v-model="columnRoles[i]" style="min-width:160px" hide-details/>
                    </div>
                  </div>

                  <div class="text-caption text-medium-emphasis mb-2">サンプル行（先頭3行）</div>
                  <div class="table-scroll">
                    <table class="oh3-simple">
                      <thead><tr><th v-for="(h,i) in rawTable.headers" :key="'hm'+i">{{ h }}</th></tr></thead>
                      <tbody>
                      <tr v-for="(r,ri) in rawTable.rows.slice(0,3)" :key="'rm'+ri">
                        <td v-for="(c,ci) in r" :key="'cm'+ci">{{ c }}</td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-else class="text-medium-emphasis">まずOCRを実行してください。</div>
              </div>
            </v-stepper-window-item>

            <!-- STEP4 -->
            <v-stepper-window-item :value="4">
              <div class="pa-4">
                <v-alert v-if="buildError" type="error" class="mb-4">{{ buildError }}</v-alert>

                <div class="preview-grid" v-if="points.length">
                  <!-- Map -->
                  <v-card class="oh3-accent-border pane tall" variant="outlined">
                    <v-card-title class="py-2">地図プレビュー（MapLibre）</v-card-title>
                    <v-card-text class="pane-body">
                      <div ref="maplibreEl" class="maplibre-host"></div>
                      <div class="text-caption text-medium-emphasis mt-2">※ いまは背景のみ。重ね合わせは後で。</div>
                    </v-card-text>
                  </v-card>

                  <!-- 座標プレビュー（親と同じ高さに伸ばす） -->
                  <v-card class="oh3-accent-border pane tall" variant="outlined">
                    <v-card-title class="py-2">座標プレビュー</v-card-title>
                    <v-card-text class="pane-body">
                      <div class="table-fill">
                        <table class="oh3-simple">
                          <thead><tr><th>#</th><th>点名/点番</th><th>X</th><th>Y</th></tr></thead>
                          <tbody>
                          <tr v-for="(p,i) in points" :key="'p'+i">
                            <td>{{ i+1 }}</td>
                            <td>{{ p.label ?? p.idx ?? (i+1) }}</td>
                            <td>{{ fmt(p.x) }}</td>
                            <td>{{ fmt(p.y) }}</td>
                          </tr>
                          </tbody>
                        </table>
                      </div>
                    </v-card-text>
                  </v-card>

                  <!-- 検算（小さく） -->
                  <v-card class="oh3-accent-border pane calc-pane" variant="outlined">
                    <v-card-title class="py-2">検算</v-card-title>
                    <v-card-text class="compact-text pane-body">
                      <div class="inline-metrics">
                        <div>閉合差: <b>{{ fmt(closure.len) }} m</b></div>
                        <div>dx: {{ fmt(closure.dx) }}</div>
                        <div>dy: {{ fmt(closure.dy) }}</div>
                        <div>面積: <b>{{ fmt(area.area) }} m²</b></div>
                      </div>
                      <div v-if="closure.len > closureThreshold" class="warn small">閉合差が閾値（{{ closureThreshold }}m）を超えています。</div>
                    </v-card-text>
                  </v-card>

                  <!-- 検算の“直下”に座標系 -->
                  <v-card class="oh3-accent-border pane crs-pane" variant="outlined">
                    <v-card-title class="py-2">公共座標系（表示名）</v-card-title>
                    <v-card-text class="pane-body">
                      <v-select
                          v-model="crs"
                          :items="crsChoices"
                          item-title="title"
                          item-value="value"
                          label="公共座標系（推定）"
                          density="compact"
                      />
                    </v-card-text>
                  </v-card>
                </div>

                <div v-else>
                  <div class="preview-grid">
                    <v-card class="oh3-accent-border pane tall" variant="outlined">
                      <v-card-title class="py-2">地図プレビュー（MapLibre）</v-card-title>
                      <v-card-text class="pane-body">
                        <div ref="maplibreEl" class="maplibre-host"></div>
                      </v-card-text>
                    </v-card>
                    <v-card class="oh3-accent-border pane tall" variant="outlined">
                      <v-card-text class="pane-body text-medium-emphasis">列マッピング後に「再構成」してください。</v-card-text>
                    </v-card>
                    <v-card class="oh3-accent-border pane calc-pane" variant="outlined"></v-card>
                    <v-card class="oh3-accent-border pane crs-pane" variant="outlined"></v-card>
                  </div>
                </div>
              </div>
            </v-stepper-window-item>

            <!-- STEP5 -->
            <v-stepper-window-item :value="5">
              <div class="pa-4">
                <div v-if="points.length">
                  <v-alert type="info" color="primary" variant="tonal" class="mb-3">{{ points.length }} 点を処理します。</v-alert>
                  <div class="d-flex align-center gap-3">
                    <v-btn variant="outlined" prepend-icon="mdi-download" @click="downloadSIMA">SIMAファイルダウンロード</v-btn>
                    <v-btn color="primary" :loading="busy" prepend-icon="mdi-database-import" @click="commit">取り込み実行</v-btn>
                  </div>
                  <div v-if="simaInfo.name" class="text-caption text-medium-emphasis mt-2">生成: {{ simaInfo.name }}（{{ simaInfo.size }} bytes）</div>
                </div>
                <div class="text-medium-emphasis" v-else>先に再構成してください。</div>
              </div>
            </v-stepper-window-item>
          </v-stepper-window>

          <v-stepper-actions>
            <template #prev><v-btn variant="text" :disabled="step<=1" @click="step--">戻る</v-btn></template>
            <template #next><v-btn variant="elevated" color="primary" @click="goNext">次へ</v-btn></template>
          </v-stepper-actions>
        </v-stepper>
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
import { downloadTextFile } from '@/js/downLoad'

/* === 画像前処理：適応二値化 === */
async function fileToCanvas (file, maxSide = 2400, tiles = 24) {
  const blob = (file instanceof File) ? file : new File([file], 'img')
  const img = await (async () => {
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob)
    return await new Promise((res, rej) => {
      const url = URL.createObjectURL(blob)
      const im = new Image()
      im.onload = () => { res(im); URL.revokeObjectURL(url) }
      im.onerror = rej
      im.src = url
    })
  })()
  const scale = Math.max(1, Math.min(1.6, maxSide / Math.max(img.width, img.height)))
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, w, h)
  const id = ctx.getImageData(0, 0, w, h); const d = id.data
  const tw = Math.max(8, Math.floor(w / tiles)), th = Math.max(8, Math.floor(h / tiles))
  for (let ty=0; ty<h; ty+=th) for (let tx=0; tx<w; tx+=tw) {
    let sum=0, cnt=0, bx=Math.min(tx+tw, w), by=Math.min(ty+th, h)
    for (let y=ty; y<by; y++) for (let x=tx; x<bx; x++) {
      const p=(y*w+x)*4, g=(d[p]*0.299+d[p+1]*0.587+d[p+2]*0.114); sum+=g; cnt++
    }
    const mean=sum/Math.max(1,cnt), thres=Math.max(110, Math.min(190, mean-8))
    for (let y=ty; y<by; y++) for (let x=tx; x<bx; x++) {
      const p=(y*w+x)*4, g=(d[p]*0.299+d[p+1]*0.587+d[p+2]*0.114), v=g>thres?255:0
      d[p]=d[p+1]=d[p+2]=v; d[p+3]=255
    }
  }
  ctx.putImageData(id, 0, 0)
  return canvas
}

/* === 行テキスト分割 === */
function splitRow (line) {
  return line.replace(/]/g, ' ] ').replace(/\|/g, ' | ')
      .split(/,|\t|\||]|\s{2,}/).map(s => s.trim()).filter(s => s.length)
}

/* === 最低限の抽出 [ID, X, Y] === */
function extractIdXY (line) {
  if (!line) return null
  const s = line.replace(/[［\]【】]/g, ' ').replace(/\s+/g, ' ').trim()
  const idMatch = s.match(/[A-Za-z0-9./／-]+/)
  if (!idMatch) return null
  const id = idMatch[0]
  const nums = [...s.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => m[0])
  if (nums.length < 2) return null
  return [id, nums[0], nums[1]]
}

export default {
  name: 'KyusekiImportDialog',
  props: { modelValue: { type: Boolean, default: false }, jobId: { type: [String, Number], default: null }, startXY: { type: Object, default: null } },
  emits: ['update:modelValue', 'imported'],
  data () {
    return {
      internal: this.modelValue,
      step: 1, busy: false,

      file: null, previewUrl: '', isImage: true,
      useCloudFallback: true, cloudService: 'Textract', cloudServiceItems: ['Textract','DocumentAI','Azure'],

      ocrError: '', rawTable: { headers: [], rows: [] },

      columnRoles: [],
      roleOptions: [
        { title: '未使用', value: null },
        { title: '点番（数）', value: 'idx' },
        { title: '点名（文字）', value: 'label' },
        { title: 'X', value: 'x' }, { title: 'Y', value: 'y' },
      ],

      points: [], area: { area: 0, signed: 0 }, closure: { dx: 0, dy: 0, len: 0 }, closureThreshold: 0.02,

      crs: 'EPSG:2444', // 公共座標2系（JGD2000）
      crsChoices: Array.from({length:19},(_,i)=>({title:`公共座標${i+1}系`, value:`EPSG:${2443+i}` })),

      buildError: '', simaInfo: { name:'', size:0 }, lastSimaText: '',

      map: null
    }
  },
  watch: {
    modelValue (v) { this.internal = v },
    internal (v) { this.$emit('update:modelValue', v) },
    step (v) { if (v===4) this.$nextTick(()=>this.initMapLibre()) }
  },
  mounted () { if (this.step===4) this.initMapLibre() },
  methods: {
    fmt (v) { return (v==null || Number.isNaN(v)) ? '' : Number(v).toFixed(3) },
    close () { this.internal = false },
    goNext () {
      if (this.step===1) { if (this.file) this.step=2; return }
      if (this.step===2) { if (this.rawTable.headers.length) this.step=3; return }
      if (this.step===3) { this.rebuild(); this.step=4; return }
      if (this.step===4) { this.step=5; return }
      if (this.step===5) { this.close(); return }
    },

    async onFileSelected () {
      this.previewUrl=''; this.isImage=true
      if (!this.file) return
      const f = Array.isArray(this.file)? this.file[0] : this.file
      const name = f?.name || ''
      this.isImage = !/\.pdf$/i.test(name)
      this.previewUrl = this.isImage ? URL.createObjectURL(f) : ''
    },

    /* ==== OCR ==== */
    async doOCR () {
      if (!this.file) return
      this.ocrError=''; this.busy=true
      try {
        let table = await this.runLocalOCR(this.file)
        const bad = !table || !table.headers?.length || !table.rows?.length
        if (bad && this.useCloudFallback) {
          const t2 = await this.runCloudOCR(this.file, this.cloudService)
          if (t2?.headers?.length) table = t2
        }
        if (!table?.headers?.length) throw new Error('OCRに失敗しました（表が検出できませんでした）')
        this.rawTable = table

        this.columnRoles = this.rawTable.headers.map(h => this.guessRoleFromHeader(h) ?? null)
        this.rawTable.headers.forEach((h,i)=>{ const s=String(h).toLowerCase(); if (/[+/*()]/.test(s) || /y\+?n\+?1.*y\+?n-?1|xn.*yn/.test(s)) this.columnRoles[i]=null })
        if (this.step<3) this.step=3
      } catch (e) { console.error(e); this.ocrError=String(e.message||e) } finally { this.busy=false }
    },

    async runLocalOCR (file) {
      const name = file?.name || ''
      if (/\.pdf$/i.test(name)) return { headers: [], rows: [] } // 画像のみ

      const T = await import('tesseract.js')
      const createWorker = T.createWorker || (T.default && T.default.createWorker)
      if (!createWorker) return { headers: [], rows: [] }

      const canvas = await fileToCanvas(file)
      const opts = {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/dist/tesseract-core.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/5'
      }
      let worker
      try { worker = await createWorker(['jpn','eng'], opts) } catch { worker = await createWorker(opts) }

      try {
        if (worker.load) await worker.load()
        if (worker.loadLanguage) await worker.loadLanguage('jpn+eng')
        if (worker.initialize) await worker.initialize('jpn+eng')
        if (worker.setParameters) {
          await worker.setParameters({
            tessedit_pageseg_mode: 6,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: "0123456789.-+()[]{}:：XxYyNnEeWwSs度°′'\"弧長弦半径中心角点番Noｎｏ東西南北備考/|,",
            tessedit_char_blacklist: 'OoSs',
            classify_bln_numeric_mode: '1',
            user_defined_dpi: '300'
          })
        }
        const res = await worker.recognize(canvas)
        const data = res?.data || res
        let lines = Array.isArray(data?.lines) ? data.lines.map(l => (l.text||'').trim()) : []
        if (!lines.length && typeof data?.text === 'string') lines = data.text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)

        const headerLine = lines.find(L => {
          const s = (L||'').normalize('NFKC')
          const nums = (s.match(/-?\d+(?:\.\d+)?/g)||[]).length
          return /Xn/i.test(s) && /Yn/i.test(s) && nums<=2
        })
        let fixedHeader = null
        if (headerLine) {
          fixedHeader = headerLine.normalize('NFKC')
              .replace(/(N[O0]+)\s*(Xn)/ig,'$1 | $2').replace(/(Xn)\s*(Yn)/ig,'$1 | $2')
              .replace(/(Yn)\s*(Y[^\s|]+)/ig,'$1 | $2').replace(/\s{2,}/g,' ')
        }

        let rows = lines.map(L => (L===headerLine && fixedHeader)? fixedHeader : L).map(splitRow).filter(r=>r.length>1)

        if (!rows.length || Math.max(...rows.map(r=>r.length))<3) {
          const ext = lines.map(extractIdXY).filter(Boolean)
          if (ext.length) return { headers: ['点名','Xn','Yn'], rows: ext.map(([id,x,y])=>[id,x,y]) }
        }
        if (!rows.length) return { headers: [], rows: [] }

        const idxMax = rows.map((r,i)=>({i,score:r.filter(c=>/[^\d\s.-]/.test(c)).length}))
            .sort((a,b)=>b.score-a.score)[0]?.i ?? 0

        let headers = rows[idxMax].map(h=>h.replace(/\s+/g,''))
        if (headers.length<3) {
          const forced = rows[idxMax].join(' ').normalize('NFKC')
              .replace(/(N[O0]+)\s*(Xn)/ig,'$1|$2').replace(/(Xn)\s*(Yn)/ig,'$1|$2')
              .replace(/(Yn)\s*(Y[^\s|]+)/ig,'$1|$2').split('|').map(s=>s.trim()).filter(Boolean)
          if (forced.length>=3) headers = forced
        }

        headers = headers.map(h =>
            h.replace(/点名|標識|名称/i,'点名').replace(/点番|番号|No/i,'点番')
                .replace(/X座標|東距|東/i,'X').replace(/Y座標|北距|北/i,'Y')
        )

        const body = rows.filter((_,i)=>i!==idxMax)
        const colN = Math.max(headers.length, ...body.map(r=>r.length))
        headers = headers.slice(0,colN)
        const normBody = body.map(r => { const a=r.slice(0,colN); while(a.length<colN)a.push(''); return a })
        return { headers, rows: normBody }
      } catch (e) { console.error('local OCR error:', e); return { headers: [], rows: [] } }
      finally { try { await worker.terminate() } catch {} }
    },

    async runCloudOCR () { return { headers: [], rows: [] } },

    /* ==== 列マッピング/正規化 ==== */
    normHeader (s) {
      if (!s) return ''
      return s.normalize('NFKC').replace(/\s+/g,'')
          .replace(/[()【】（）:：ー_−－\u00A0\u2003\u2002\u3000─━‐–—-]/g,'')
          .replace(/\[/g,'').replace(/\]/g,'').toLowerCase()
    },
    guessRoleFromHeader (h) {
      const H = this.normHeader(h), compact = String(h).replace(/\s+/g,'')
      if (/^(no|n0|№|番)$/i.test(compact)) return 'idx'
      if (/^(xn|x)$/i.test(h.trim())) return 'x'
      if (/^(yn|y)$/i.test(h.trim())) return 'y'
      const dict = {
        idx:['点番','番号','no','ｎｏ','番','n0','№'],
        label:['点名','標識','名称'],
        x:['x','xn','x座標','東','e','東距','横座標'],
        y:['y','yn','y座標','北','n','北距','縦座標'],
      }
      for (const [role,arr] of Object.entries(dict)) { if (arr.some(k=>H.includes(k))) return role }
      if (/\b(xn|x)\b/i.test(h)) return 'x'
      if (/\b(yn|y)\b/i.test(h)) return 'y'
      return null
    },

    normNumberStr (s) {
      if (s==null) return ''
      return s.normalize('NFKC').replace(/,/g,'').replace(/[\]|]/g,'')
          .replace(/[−－\u00A0\u2003\u2002\u3000─━‐–—]/g,'-').trim()
    },
    parseNumber (s) { const m=this.normNumberStr(String(s)).match(/-?\d+(?:\.\d+)?/); return m?parseFloat(m[0]):NaN },
    parseAzimuth (str) {
      const s=this.normNumberStr(String(str)).toUpperCase()
      const q=s.match(/([NS])\s*(\d+(?:\.\d+)?)\s*([EW])/); if(q){const d=+q[2],k=q[1]+q[3],m={NE:d,SE:180-d,SW:180+d,NW:360-d};return m[k]??NaN}
      const dms=s.match(/(-?\d+)[°º度 -]\s*(\d+)?[′']?\s*(\d+(?:\.\d+)?)?[″"]?/); if(dms){const d=+dms[1],m=dms[2]?+dms[2]:0,sec=dms[3]?+dms[3]:0;return Math.sign(d)*(Math.abs(d)+m/60+sec/3600)}
      const n=parseFloat(s.replace(/[°度]/g,'')); return Number.isFinite(n)?n:NaN
    },

    mapColumnsObject () { const o={}; this.columnRoles.forEach((r,i)=>{ if(r) o[r]=i }); return o },
    parseRowsToRecords () {
      const rows=this.rawTable.rows, roles=this.mapColumnsObject(), out=[]
      for (const r of rows) {
        const rec={}
        if (roles.idx!=null) rec.idx=this.parseNumber(r[roles.idx])
        if (roles.label!=null) rec.label=String(r[roles.label]??'').trim()||undefined
        if (roles.x!=null) rec.x=this.parseNumber(r[roles.x])
        if (roles.y!=null) rec.y=this.parseNumber(r[roles.y])
        if (roles.azimuth!=null) rec.az=this.parseAzimuth(r[roles.azimuth])
        if (roles.distance!=null) rec.dist=this.parseNumber(r[roles.distance])
        if (roles.radius!=null) rec.R=this.parseNumber(r[roles.radius])
        if (roles.theta!=null) rec.thetaDeg=this.parseNumber(r[roles.theta])
        if (roles.chord!=null) rec.chord=this.parseNumber(r[roles.chord])
        if (roles.arcLength!=null) rec.arcLen=this.parseNumber(r[roles.arcLength])
        rec.kind=(rec.R&&(rec.thetaDeg||rec.chord||rec.arcLen))?'arc':'line'
        out.push(rec)
      }
      return out
    },

    /* === 桁誤読補正の強化 === */
    median (a){const b=a.filter(Number.isFinite).slice().sort((x,y)=>x-y); if(!b.length)return NaN; const m=Math.floor(b.length/2); return b.length%2?b[m]:(b[m-1]+b[m])/2},
    adjustByMagnitude (v,t){ if(!Number.isFinite(v)||!Number.isFinite(t))return v; const cand=[v,v-9000,v+9000]; cand.sort((a,b)=>Math.abs(a-t)-Math.abs(b-t)); return Math.abs(v-t)>4000?cand[0]:v },
    // “似文字”一桁置換：0/5/6/9, 1/7, 2/7, 3/8 を試す
    generateSimilarDigitCandidates (num) {
      const s=Number(num).toFixed(3), arr=s.split(''), map={ '0':['5','6','9'], '5':['0','6','9'], '6':['5','9','0'], '9':['0','5','6'], '1':['7'], '7':['1','2'], '2':['7'], '3':['8'], '8':['3'] }
      const out=[]
      for (let i=0;i<arr.length;i++){
        const alts = map[arr[i]]; if(!alts) continue
        for (const alt of alts){ const a=arr.slice(); a[i]=alt; const v=parseFloat(a.join('')); if(Number.isFinite(v)) out.push(v) }
      }
      return out
    },
    adjustLocalDigit (v, prev) {
      if (!Number.isFinite(v) || !Number.isFinite(prev)) return v
      const cand=[v, ...this.generateSimilarDigitCandidates(v)]
      cand.sort((a,b)=>Math.abs(a-prev)-Math.abs(b-prev))
      return (Math.abs(v-prev)-Math.abs(cand[0]-prev) >= 0.05)? cand[0] : v
    },
    adjustZeroFive (v,t){ if(!Number.isFinite(v)||!Number.isFinite(t))return v; const s=Number(v).toFixed(3), arr=s.split(''), out=[]
      for(let i=0;i<arr.length;i++){ if(arr[i]==='0'||arr[i]==='5'){const a=arr.slice(); a[i]=arr[i]==='0'?'5':'0'; const n=parseFloat(a.join('')); out.push(n)} }
      const cand=[v,...out]; cand.sort((a,b)=>Math.abs(a-t)-Math.abs(b-t)); return (Math.abs(v-t)-Math.abs(cand[0]-t)>=0.04)?cand[0]:v },
    postCorrectRecords (recs){
      if(!recs.length) return recs
      const xs=recs.map(r=>r.x).filter(Number.isFinite), ys=recs.map(r=>r.y).filter(Number.isFinite)
      const mx=this.median(xs), my=this.median(ys)
      const mag=recs.map(r=>({ ...r, x:this.adjustByMagnitude(r.x,mx), y:this.adjustByMagnitude(r.y,my) }))
      const xs2=mag.map(r=>r.x).filter(Number.isFinite), ys2=mag.map(r=>r.y).filter(Number.isFinite)
      const mx2=this.median(xs2), my2=this.median(ys2)
      const z5=mag.map(r=>({ ...r, x:this.adjustZeroFive(r.x,mx2), y:this.adjustZeroFive(r.y,my2) }))
      const out=[]
      for(let i=0;i<z5.length;i++){ const prev=out[i-1]
        out.push(prev?{ ...z5[i], x:this.adjustLocalDigit(z5[i].x,prev.x), y:this.adjustLocalDigit(z5[i].y,prev.y) }:z5[i])
      }
      return out
    },

    /* === 構成/検算 === */
    forwardFromAzDist (x,y,az,dist,zero='north'){ const rad=d=>d*Math.PI/180, th=zero==='north'?rad(90-az):rad(az); return { x:x+dist*Math.cos(th), y:y+dist*Math.sin(th) } },
    shoelace (pts){ let s1=0,s2=0; for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length]; s1+=a.x*b.y; s2+=a.y*b.x} const signed=0.5*(s1-s2); return { area:Math.abs(signed), signed } },
    closureError (pts){ const a=pts[0], b=pts[pts.length-1]; const dx=b.x-a.x, dy=b.y-a.y; return { dx, dy, len: Math.hypot(dx,dy) } },

    rebuild () {
      this.buildError=''; this.points=[]
      try {
        const recs=this.parseRowsToRecords(), fixed=this.postCorrectRecords(recs)
        let pts=[]
        const hasXY=fixed.every(r=>Number.isFinite(r.x)&&Number.isFinite(r.y))
        const hasAD=fixed.every(r=>Number.isFinite(r.az)&&Number.isFinite(r.dist))
        if (hasXY) {
          pts=fixed.map((r,i)=>({ x:r.x, y:r.y, idx:Number.isFinite(r.idx)?r.idx:undefined, label:r.label?String(r.label):undefined }))
        } else if (hasAD && this.startXY) {
          let cur={x:this.startXY.x, y:this.startXY.y}
          pts.push({ ...cur, idx: fixed[0]?.idx ?? 1, label: fixed[0]?.label })
          for (const r of fixed){ const nx=this.forwardFromAzDist(cur.x,cur.y,r.az,r.dist,'north'); pts.push({ ...nx, idx:r.idx, label:r.label }); cur=nx }
        } else { throw new Error('XYまたは方位+距離の列が揃っていません。') }
        if (pts.length<3) throw new Error('点が不足しています。')
        this.points=pts; this.area=this.shoelace(pts); this.closure=this.closureError(pts); this.crs=this.guessCRS(pts)||this.crs
      } catch(e){ console.error(e); this.buildError=String(e.message||e) }
    },

    guessCRS (pts){
      const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y)
      const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys)
      const rangeX=maxX-minX, rangeY=maxY-minY
      if(minX>0 && maxX<400000 && minY>3000000 && maxY<5000000 && rangeX<200000 && rangeY<200000) return this.crs
      return null
    },

    extractLotFromFileName (){
      try{ const f=Array.isArray(this.file)?this.file[0]:this.file; const name=f?.name||''; const m=String(name).match(/(\d{1,5}-\d{1,5})/); return m?m[1]:'000-0' }catch{return '000-0'}
    },
    resolveProjectName () { return this.jobId ? `oh3-job-${this.jobId}` : 'open-hinata3' },

    buildSIMAContent (){
      if(!this.points.length) return ''
      const prj=this.resolveProjectName(), lot=this.extractLotFromFileName(), L=[]
      L.push(`G00,01,${prj},`)
      L.push('Z00,座標ﾃﾞｰﾀ,,'); L.push('A00,')
      this.points.forEach((p,i)=>{ const label=(p.label&&String(p.label).length)?String(p.label):(Number.isFinite(p.idx)?String(p.idx):String(i+1))
        L.push(`A01,${i+1},${label},${Number(p.x).toFixed(3)},${Number(p.y).toFixed(3)},0,`) })
      L.push('A99,')
      L.push('Z00,区画データ,'); L.push(`D00,1,${lot},1,`)
      this.points.forEach((p,i)=>{ const label=(p.label&&String(p.label).length)?String(p.label):(Number.isFinite(p.idx)?String(p.idx):String(i+1)); L.push(`B01,${i+1},${label},`) })
      L.push('D99,'); L.push('A99,END')
      return L.join('\n')
    },

    downloadSIMA (){
      if(!this.points.length) return
      const text=this.buildSIMAContent(); this.lastSimaText=text
      const ts=new Date().toISOString().replace(/[:.]/g,'-'), name=`kyuseki_${ts}.sim`
      downloadTextFile(name, text, 'shift-jis')
      let size=text.length; try{ if(window.Encoding){ const u=window.Encoding.stringToCode(text); const s=window.Encoding.convert(u,'SJIS'); size=s.length } }catch{}
      this.simaInfo={name, size}
    },

    async commit () {
      this.$emit('imported', { count:this.points.length, crs:this.crs, area:this.area.area, sim:!!this.simaInfo.name })
    },

    async initMapLibre () {
      if (this.map || !this.$refs.maplibreEl) return
      const id='maplibre-css'
      if(!document.getElementById(id)){ const l=document.createElement('link'); l.id=id; l.rel='stylesheet'; l.href='https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css'; document.head.appendChild(l) }
      const { Map } = await import('maplibre-gl')
      const style={ version:8, sources:{}, layers:[{id:'bg', type:'background', paint:{'background-color':'#f6f9ff'}}] }
      this.map=new Map({ container:this.$refs.maplibreEl, style, center:[139.767,35.681], zoom:12, preserveDrawingBuffer:true })
    }
  }
}
</script>

<style scoped>
.preview-box{width:100%;border:1px dashed var(--v-theme-outline);border-radius:8px;padding:8px;min-height:180px;display:grid;place-items:center}
.preview-img{max-width:100%;max-height:280px;object-fit:contain}
.ocr-table{border:1px solid var(--v-theme-outline-variant);border-radius:8px;padding:8px}

/* 高さの“物差し” */
:root{ --tall-h: 360px; }  /* 左・中央の合計高さ（=2段ぶん）。数字だけ調整すれば全体が連動 */

.pane{display:flex;flex-direction:column;box-sizing:border-box;min-height:0}
.pane-body{flex:1;display:flex;flex-direction:column;min-height:0}

/* 3カラム + 明示的に 2 段。左と中央は2行ぶん(=--tall-h)を占有、右は1行ずつ */
.preview-grid{
  display:grid;
  grid-template-columns:repeat(3, minmax(0,1fr));
  grid-template-rows:repeat(2, calc(var(--tall-h)/2)); /* 上段=下段=半分 */
  gap:16px;
}

/* 左(地図)・中央(座標) は 2 行にまたがる＝合計 --tall-h */
.preview-grid > .tall{ grid-row: 1 / span 2; height:auto; }

/* 右列の並び（1段目=検算、2段目=公共座標系） */
.preview-grid > .calc-pane{ grid-column:3; grid-row:1; height:auto; }
.preview-grid > .crs-pane { grid-column:3; grid-row:2; height:auto; }

/* Vuetifyカードの余白差でズレないよう、タイトル・本文のパディングを控えめに統一 */
:deep(.v-card-title){ padding:8px 12px !important; }
:deep(.v-card-text){  padding:8px 12px !important; }

/* 表・地図 */
.table-fill{flex:1;overflow:auto}
.maplibre-host{width:100%;height:100%;border:1px solid #e2e8f0;border-radius:8px}

/* レスポンシブ：幅が狭いときは自動的に2列→1列へ */
@media (max-width:1200px){
  .preview-grid{grid-template-columns:repeat(2,minmax(0,1fr)); grid-template-rows:auto}
  .preview-grid > .tall{ grid-row:auto; }
}
@media (max-width:980px){
  .preview-grid{grid-template-columns:1fr; grid-template-rows:auto}
}

.oh3-simple{width:100%;border-collapse:collapse;font-size:12.5px}
.oh3-simple th,.oh3-simple td{border:1px solid #ddd;padding:6px 8px;text-align:left;white-space:nowrap}
.oh3-simple thead th{background:#f6f6f7;position:sticky;top:0;z-index:1}

.compact-text{padding-top:4px;padding-bottom:4px}
.inline-metrics{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline}
.warn.small{font-size:12px;color:#a15d00;margin-top:6px}

.map-chip{border:1px dashed var(--v-theme-outline);border-radius:10px;padding:8px;min-width:180px}
.oh3-title{color:rgb(var(--v-theme-primary))}
.oh3-accent-border{border-top:3px solid rgb(var(--v-theme-primary))}
</style>




