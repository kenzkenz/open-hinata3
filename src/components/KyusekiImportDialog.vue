<template>
  <v-dialog v-model="internal" max-width="980" scrollable transition="dialog-bottom-transition">
    <v-card>
      <!-- ヘッダー -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2 oh3-title">
          <v-icon class="mr-2" color="primary">mdi-table-search</v-icon>
          求積表インポート（OCR）
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-divider color="primary"></v-divider>

      <!-- ステッパー -->
      <div class="px-4 pt-2">
        <v-stepper v-model="step" alt-labels flat color="primary">
          <v-stepper-header>
            <v-stepper-item color="primary" :complete="step>1" :value="1" title="取り込み" subtitle="写真/PDF" />
            <v-divider></v-divider>
            <v-stepper-item color="primary" :complete="step>2" :value="2" title="OCR" subtitle="自動抽出" />
            <v-divider></v-divider>
            <v-stepper-item color="primary" :complete="step>3" :value="3" title="列マッピング" subtitle="X/Y/距離/角 等" />
            <v-divider></v-divider>
            <v-stepper-item color="primary" :complete="step>4" :value="4" title="プレビュー・検算" subtitle="閉合/面積" />
            <v-divider></v-divider>
            <v-stepper-item color="primary" :complete="false" :value="5" title="取り込み" subtitle="OH3へ反映" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- Step 1 取り込み -->
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

            <!-- Step 2 OCR -->
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
                      <tr>
                        <th v-for="(h,i) in rawTable.headers" :key="'h'+i">{{ h }}</th>
                      </tr>
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

            <!-- Step 3 列マッピング -->
            <v-stepper-window-item :value="3">
              <div class="pa-4">
                <div v-if="rawTable.headers.length">
                  <div class="text-subtitle-2 mb-2">列の役割を確認/修正</div>
                  <div class="d-flex flex-wrap gap-3 mb-4">
                    <div v-for="(h, i) in rawTable.headers" :key="'m'+i" class="map-chip">
                      <div class="text-caption text-medium-emphasis mb-1">{{ h }}</div>
                      <v-select
                          density="comfortable"
                          variant="outlined"
                          :items="roleOptions"
                          v-model="columnRoles[i]"
                          style="min-width: 160px"
                          hide-details
                      />
                    </div>
                  </div>

                  <div class="text-caption text-medium-emphasis mb-2">サンプル行（先頭3行）</div>
                  <div class="table-scroll">
                    <table class="oh3-simple">
                      <thead>
                      <tr>
                        <th v-for="(h,i) in rawTable.headers" :key="'hm'+i">{{ h }}</th>
                      </tr>
                      </thead>
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

            <!-- Step 4 プレビュー・検算 -->
            <v-stepper-window-item :value="4">
              <div class="pa-4">
                <v-alert v-if="buildError" type="error" class="mb-4">{{ buildError }}</v-alert>

                <div v-if="points.length">
                  <div class="d-flex flex-wrap gap-4">
                    <v-card class="flex-1 oh3-accent-border" variant="outlined">
                      <v-card-title class="py-2">座標プレビュー</v-card-title>
                      <v-card-text>
                        <div class="table-scroll">
                          <table class="oh3-simple">
                            <thead>
                            <tr>
                              <th>#</th>
                              <th>X</th>
                              <th>Y</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-for="(p,i) in points" :key="'p'+i">
                              <td>{{ p.idx ?? (i+1) }}</td>
                              <td>{{ fmt(p.x) }}</td>
                              <td>{{ fmt(p.y) }}</td>
                            </tr>
                            </tbody>
                          </table>
                        </div>
                      </v-card-text>
                    </v-card>

                    <v-card class="flex-1 oh3-accent-border" variant="outlined">
                      <v-card-title class="py-2">検算</v-card-title>
                      <v-card-text>
                        <div class="mb-2">閉合差：<b>{{ fmt(closure.len) }} m</b>（dx={{ fmt(closure.dx) }}, dy={{ fmt(closure.dy) }}）</div>
                        <div class="mb-2">面積（座標法）：<b>{{ fmt(area.area) }} m²</b></div>
                        <div class="text-medium-emphasis">符号付面積：{{ fmt(area.signed) }}</div>
                        <v-alert v-if="closure.len > closureThreshold" type="warning" density="comfortable" class="mt-4">
                          閉合差が閾値（{{ closureThreshold }}m）を超えています。列マッピングや値を確認してください。
                        </v-alert>
                      </v-card-text>
                    </v-card>
                  </div>

                  <div class="d-flex align-center gap-3 mt-4">
                    <v-select v-model="crs" :items="crsChoices" label="座標系（推定）" style="max-width: 260px" />
                    <v-text-field v-model="featureName" label="取り込み名" density="comfortable" style="max-width: 260px" />
                  </div>
                </div>
                <div v-else class="text-medium-emphasis">列マッピング後に「再構成」してください。</div>
              </div>
            </v-stepper-window-item>

            <!-- Step 5 取り込み -->
            <v-stepper-window-item :value="5">
              <div class="pa-4">
                <div v-if="points.length">
                  <v-alert type="info" color="primary" variant="tonal" class="mb-4">{{ points.length }} 点を OH3 に取り込みます。</v-alert>
                  <v-btn color="primary" :loading="busy" prepend-icon="mdi-database-import" @click="commit">取り込み実行</v-btn>
                </div>
                <div v-else class="text-medium-emphasis">先に再構成してください。</div>
              </div>
            </v-stepper-window-item>
          </v-stepper-window>

          <!-- フッター操作 -->
          <v-stepper-actions>
            <template #prev>
              <v-btn variant="text" :disabled="step<=1" @click="step--">戻る</v-btn>
            </template>
            <template #next>
              <v-btn variant="elevated" color="primary" @click="goNext">次へ</v-btn>
            </template>
          </v-stepper-actions>
        </v-stepper>
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
// ===== 画像前処理ユーティリティ（端末内OCR向け, 互換強化） =====
async function fileToCanvas (file, maxSide = 2200) {
  const blob = (file instanceof File) ? file : new File([file], 'img')

  // createImageBitmap 非対応環境にも対応
  const img = await (async () => {
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob)
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const image = new Image()
      image.onload = () => { resolve(image); URL.revokeObjectURL(url) }
      image.onerror = reject
      image.src = url
    })
  })()

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)

  // グレースケール + 簡易二値化（平均値しきい）
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) {
    const gray = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) | 0
    sum += gray
  }
  const mean = sum / (d.length/4)
  const th = Math.max(120, Math.min(180, mean))
  for (let i = 0; i < d.length; i += 4) {
    const gray = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) | 0
    const v = gray > th ? 255 : 0
    d[i]=d[i+1]=d[i+2]=v
  }
  ctx.putImageData(imgData, 0, 0)
  return canvas
}

// 行テキスト → セル分割（空白/タブ/カンマ/縦棒/連続空白）
function splitRow (line) {
  return line
      .replace(/\s+\|/g, ' |')
      .replace(/\|\s+/g, '| ')
      .split(/[,\t|]| {2,}/)
      .map(s => s.trim())
      .filter(s => s.length)
}

export default {
  name: 'KyusekiImportDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    jobId: { type: [String, Number], default: null },
    startXY: { type: Object, default: null }, // {x,y}
  },
  emits: ['update:modelValue','imported'],
  data () {
    return {
      internal: this.modelValue,
      step: 1,
      busy: false,
      // Step1
      file: null,
      previewUrl: '',
      isImage: true,
      useCloudFallback: true,
      cloudService: 'Textract',
      cloudServiceItems: ['Textract','DocumentAI','Azure'],

      // Step2 OCR結果（表形式）
      ocrError: '',
      rawTable: { headers: [], rows: [] },

      // Step3 列ロール
      columnRoles: [],
      roleOptions: [
        { title:'未使用', value:null },
        { title:'点番', value:'idx' },
        { title:'X', value:'x' },
        { title:'Y', value:'y' },
        { title:'方位角', value:'azimuth' },
        { title:'距離', value:'distance' },
        { title:'半径R', value:'radius' },
        { title:'中心角θ(度)', value:'theta' },
        { title:'弦長c', value:'chord' },
        { title:'弧長L', value:'arcLength' },
        { title:'備考', value:'remark' }
      ],

      // Step4 再構成
      points: [],
      area: { area: 0, signed: 0 },
      closure: { dx:0, dy:0, len:0 },
      closureThreshold: 0.02,
      featureName: 'kyuseki-import',
      crs: 'EPSG:6677',
      crsChoices: ['EPSG:6677','EPSG:6668','EPSG:6669','EPSG:6670','EPSG:6671','EPSG:6672','EPSG:6673','EPSG:6674','EPSG:6675','EPSG:6676','EPSG:6677','EPSG:6678','EPSG:6679','EPSG:6680','EPSG:6681','EPSG:6682','EPSG:6683','EPSG:6684','EPSG:6685','EPSG:6686'],
      buildError: '',
    }
  },
  watch: {
    modelValue (v) { this.internal = v },
    internal (v) { this.$emit('update:modelValue', v) },
  },
  methods: {
    // ===== ユーティリティ =====
    fmt (v) { return (v==null || Number.isNaN(v)) ? '' : Number(v).toFixed(3) },
    close () { this.internal = false },
    goNext () {
      if (this.step === 1) { if (this.file) this.step = 2; return }
      if (this.step === 2) { if (this.rawTable.headers.length) this.step = 3; return }
      if (this.step === 3) { this.rebuild(); if (this.points.length) this.step = 4; return }
      if (this.step === 4) { this.step = 5; return }
      if (this.step === 5) { this.close(); return }
    },

    // ===== Step1: 取り込み =====
    async onFileSelected () {
      this.previewUrl = ''
      this.isImage = true
      if (!this.file) return
      const file = Array.isArray(this.file) ? this.file[0] : this.file
      const name = (file && file.name) ? file.name : ''
      this.isImage = !/\.pdf$/i.test(name)
      if (this.isImage) {
        this.previewUrl = URL.createObjectURL(file)
      } else {
        this.previewUrl = '' // PDFはここでは画像表示しない
      }
    },

    // ===== Step2: OCR 実行 =====
    async doOCR () {
      if (!this.file) return
      this.ocrError = ''
      this.busy = true
      try {
        // 端末内OCR
        let table = await this.runLocalOCR(this.file)
        const localEmpty = !table || !table.headers?.length || !table.rows?.length

        // フォールバック
        if (localEmpty && this.useCloudFallback) {
          const t2 = await this.runCloudOCR(this.file, this.cloudService)
          const cloudEmpty = !t2 || !t2.headers?.length || !t2.rows?.length
          if (!cloudEmpty) table = t2
        }

        if (!table || !table.headers?.length) {
          throw new Error('OCRに失敗しました（端末内/クラウドともに表を検出できず）')
        }

        this.rawTable = table
        this.columnRoles = this.rawTable.headers.map(h => this.guessRoleFromHeader(h)).map(v => v ?? null)
        if (this.step < 3) this.step = 3
      } catch (e) {
        console.error(e)
        this.ocrError = String(e.message || e)
      } finally {
        this.busy = false
      }
    },

    // 端末内OCR（PNG/JPG, tesseract.js v2/v5 両対応 / CDN パス明示）
    async runLocalOCR (file) {
      const name = (file && file.name) ? file.name : ''
      const isImage = !/\.pdf$/i.test(name)
      if (!isImage) return { headers: [], rows: [] }

      const T = await import('tesseract.js')
      const createWorker = T.createWorker || (T.default && T.default.createWorker)
      if (!createWorker) return { headers: [], rows: [] }

      const canvas = await fileToCanvas(file)





                    const workerOptions = {
                  workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
                  corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/dist/tesseract-core.wasm.js',
                  langPath:   'https://tessdata.projectnaptha.com/5'
            }
            let worker
            try {
                // v5 署名: createWorker(langs[, options])
                    worker = await createWorker(['jpn', 'eng'], workerOptions)
                  } catch {
                // v2 署名: createWorker([options])
                    worker = await createWorker(workerOptions)
                  }


      try {
        if (worker.load) await worker.load()
        if (worker.loadLanguage) await worker.loadLanguage('jpn+eng')
        if (worker.initialize) await worker.initialize('jpn+eng')

        if (worker.setParameters) {
          await worker.setParameters({
            tessedit_pageseg_mode: 6,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist:
                '0123456789.-+()[]{}:：XxYyNnEeWwSs度°′\'"弧長弦半径中心角点番Noｎｏ東西南北備考/|,',
          })
        }

        const res = await worker.recognize(canvas)
        const data = res?.data || res

        // 信頼度の安全取得
        let conf = typeof data?.confidence === 'number' ? data.confidence : 0
        if (!conf && Array.isArray(data?.words) && data.words.length) {
          conf = data.words.reduce((s,w)=>s+(w.confidence||0),0) / data.words.length
        }

        // 行テキスト抽出（lines が空なら text を使う）
        let lines = Array.isArray(data?.lines) ? data.lines.map(l => (l.text||'').trim()) : []
        if (!lines.length && typeof data?.text === 'string') {
          lines = data.text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
        }

        // セル化
        let rows = lines.map(splitRow).filter(r => r.length > 1)
        if (!rows.length) {
          rows = lines
              .map(line => line.split(/ {3,}|\t|,/).map(s => s.trim()).filter(Boolean))
              .filter(r => r.length > 1)
        }
        if (!rows.length) return { headers: [], rows: [] }

        // ヘッダ候補：非数字の多さでスコア（ハイフンは末尾）
        const idxMax = rows
            .map((r, i) => ({ i, score: r.filter(c => /[^\d\s.-]/.test(c)).length }))
            .sort((a,b)=>b.score-a.score)[0]?.i ?? 0

        let headers = rows[idxMax].map(h => h.replace(/\s+/g,''))
        headers = headers.map(h =>
            h.replace(/点名|点番|番号|No/i,'点番')
                .replace(/X座標|東距|東/i,'X')
                .replace(/Y座標|北距|北/i,'Y')
                .replace(/方位角|方位/i,'方位角')
                .replace(/距離|長さ|延長/i,'距離')
                .replace(/半径|R/i,'半径R')
                .replace(/中心角|角度/i,'中心角θ')
                .replace(/弦長|弦/i,'弦長c')
                .replace(/弧長/i,'弧長L')
        )

        const body = rows.filter((_,i)=> i !== idxMax)
        const colN = Math.max(headers.length, ...body.map(r=>r.length))
        headers = headers.slice(0, colN)
        const normBody = body.map(r => {
          const a = r.slice(0, colN)
          while (a.length < colN) a.push('')
          return a
        })

        // conf が低くても形になっていれば返す
        return { headers, rows: normBody }
      } catch (e) {
        console.error('local OCR error:', e)
        return { headers: [], rows: [] }
      } finally {
        try { await worker.terminate() } catch {}
      }
    },

    // クラウドOCR（差し替えポイント：現状ダミー）
    async runCloudOCR () {
      return { headers: [], rows: [] }
    },

    // ===== Step3: 列マッピング推定 & 正規化 =====
    normHeader (s) {
      if (!s) return ''
      const z2h = s.normalize('NFKC')
      return z2h
          .replace(/\s+/g,'')
          /* 記号除去（ハイフンは末尾配置でLint回避） */
          .replace(/[()【】（）:：ー_-]/g,'')
          /* 角括弧は個別に除去（Lint回避） */
          .replace(/\[/g,'')
          .replace(/\]/g,'')
          .toLowerCase()
    },
    guessRoleFromHeader (h) {
      const H = this.normHeader(h)
      const dict = {
        idx: ['点','点番','点名','番号','no','ｎｏ'],
        x: ['x','x座標','東','e','東距','横座標'],
        y: ['y','y座標','北','n','北距','縦座標'],
        azimuth: ['方位','方位角','方角','bearing','方位角度'],
        distance: ['距離','長さ','延長','d','l','辺長'],
        radius: ['r','半径','曲率半径'],
        theta: ['中心角','角度','θ','デルタ','delta','セクタ角'],
        chord: ['弦','弦長'],
        arcLength: ['弧長','アーク長','弧線長'],
        remark: ['備考','注記','メモ']
      }
      for (const [role, arr] of Object.entries(dict)) {
        if (arr.some(k => H.includes(k))) return role
      }
      if (/x|東|e/.test(H)) return 'x'
      if (/y|北|n/.test(H)) return 'y'
      return null
    },

    normNumberStr (s) {
      if (s == null) return ''
      const z2h = s.normalize('NFKC').replace(/,/g,'')
      return z2h.replace(/[−－─━‐–—]/g,'-').trim()
    },
    parseNumber (s) {
      const t = this.normNumberStr(String(s)).match(/-?\d+(?:\.\d+)?/)
      return t ? parseFloat(t[0]) : NaN
    },
    parseAzimuth (str) {
      const s = this.normNumberStr(String(str)).toUpperCase()
      // N30E / S12W
      const q = s.match(/([NS])\s*(\d+(?:\.\d+)?)\s*([EW])/)
      if (q) {
        const deg = parseFloat(q[2])
        const NSEW = q[1] + q[3]
        const map = { NE:deg, SE:180-deg, SW:180+deg, NW:360-deg }
        return map[NSEW] ?? NaN
      }
      // d°m′s″ / d-m-s / d 度（ハイフンは文字クラス末尾）
      const dms = s.match(/(-?\d+)[°º度 -]\s*(\d+)?[′']?\s*(\d+(?:\.\d+)?)?[″"]?/)
      if (dms) {
        const d = parseFloat(dms[1])
        const m = dms[2] ? parseFloat(dms[2]) : 0
        const sec = dms[3] ? parseFloat(dms[3]) : 0
        return Math.sign(d) * (Math.abs(d) + m/60 + sec/3600)
      }
      const n = parseFloat(s.replace(/[°度]/g,''))
      return isFinite(n) ? n : NaN
    },

    mapColumnsObject () {
      const obj = {}
      this.columnRoles.forEach((role, i) => { if (role) obj[role] = i })
      return obj
    },

    parseRowsToRecords () {
      const rows = this.rawTable.rows
      const roles = this.mapColumnsObject()
      const out = []
      for (const r of rows) {
        const rec = {}
        if (roles.idx!=null) rec.idx = r[roles.idx]
        if (roles.x!=null) rec.x = this.parseNumber(r[roles.x])
        if (roles.y!=null) rec.y = this.parseNumber(r[roles.y])
        if (roles.azimuth!=null) rec.az = this.parseAzimuth(r[roles.azimuth])
        if (roles.distance!=null) rec.dist = this.parseNumber(r[roles.distance])
        if (roles.radius!=null) rec.R = this.parseNumber(r[roles.radius])
        if (roles.theta!=null) rec.thetaDeg = this.parseNumber(r[roles.theta])
        if (roles.chord!=null) rec.chord = this.parseNumber(r[roles.chord])
        if (roles.arcLength!=null) rec.arcLen = this.parseNumber(r[roles.arcLength])
        rec.kind = (rec.R && (rec.thetaDeg || rec.chord || rec.arcLen)) ? 'arc' : 'line'
        out.push(rec)
      }
      return out
    },

    // ===== Step4: 再構成 & 検算 =====
    forwardFromAzDist (x, y, azDeg, dist, azZero='north') {
      const rad = (d)=> d*Math.PI/180
      const theta = azZero === 'north' ? rad(90 - azDeg) : rad(azDeg)
      const dx = dist * Math.cos(theta)
      const dy = dist * Math.sin(theta)
      return { x: x + dx, y: y + dy }
    },
    shoelace (pts) {
      const n = pts.length
      let s1=0,s2=0
      for (let i=0;i<n;i++){
        const a=pts[i], b=pts[(i+1)%n]
        s1+=a.x*b.y; s2+=a.y*b.x
      }
      const signed = 0.5*(s1-s2)
      return { area: Math.abs(signed), signed }
    },
    closureError (pts) {
      const first=pts[0], last=pts[pts.length-1]
      const dx = last.x-first.x, dy = last.y-first.y
      return { dx, dy, len: Math.hypot(dx,dy) }
    },

    rebuild () {
      this.buildError = ''
      this.points = []
      try {
        const recs = this.parseRowsToRecords()
        let pts = []
        const hasXY = recs.every(r => Number.isFinite(r.x) && Number.isFinite(r.y))
        const hasAD = recs.every(r => Number.isFinite(r.az) && Number.isFinite(r.dist))
        if (hasXY) {
          pts = recs.map((r,i)=>({ x:r.x, y:r.y, idx:r.idx ?? (i+1) }))
        } else if (hasAD && this.startXY) {
          let cur = { x:this.startXY.x, y:this.startXY.y }
          pts.push({ ...cur, idx: recs[0]?.idx ?? 1 })
          for (const r of recs) {
            const nxt = this.forwardFromAzDist(cur.x, cur.y, r.az, r.dist, 'north')
            pts.push({ ...nxt, idx: r.idx })
            cur = nxt
          }
        } else {
          throw new Error('XYまたは方位+距離の列が揃っていません。')
        }
        if (pts.length < 3) throw new Error('点が不足しています。')
        this.points = pts
        this.area = this.shoelace(pts)
        this.closure = this.closureError(pts)
        this.crs = this.guessCRS(pts) || this.crs
      } catch (e) {
        console.error(e)
        this.buildError = String(e.message || e)
      }
    },

    // 超簡易CRS推定（値域ベース）
    guessCRS (pts) {
      const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const rangeX = maxX-minX, rangeY = maxY-minY
      if (minX>0 && maxX< 400000 && minY> 3000000 && maxY< 5000000 && (rangeX<200000) && (rangeY<200000)) {
        return 'EPSG:6677'
      }
      return null
    },

    // ===== Step5: OH3へ投入 =====
    toGeoJSONLineString (points, crs) {
      return {
        type:'Feature',
        properties:{ crs, name: this.featureName },
        geometry:{ type:'LineString', coordinates: points.map(p=>[p.x,p.y]) }
      }
    },
    async commit () {
      if (!this.points.length) return
      this.busy = true
      try {
        if (this.jobId) {
          await this.$store.dispatch('jobs/addPoints', { jobId: this.jobId, points: this.points, crs: this.crs })
        }
        const feature = this.toGeoJSONLineString(this.points, this.crs)
        await this.$store.dispatch('layers/addGeoJSON', { id: 'kyuseki-import', feature })
        this.$emit('imported', { count: this.points.length, crs: this.crs, area: this.area.area })
        this.step = 5
      } catch (e) {
        console.error(e)
        this.$emit('imported', { error: String(e.message || e) })
      } finally {
        this.busy = false
      }
    },
  }
}
</script>

<style scoped>
.preview-box { width: 100%; border: 1px dashed var(--v-theme-outline); border-radius: 8px; padding: 8px; min-height: 180px; display: grid; place-items:center; }
.preview-img { max-width: 100%; max-height: 280px; object-fit: contain; }
.ocr-table { border: 1px solid var(--v-theme-outline-variant); border-radius: 8px; padding: 8px; }
.table-scroll { overflow: auto; max-height: 340px; }
.oh3-simple { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.oh3-simple th, .oh3-simple td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; white-space: nowrap; }
.oh3-simple thead th { background: #f6f6f7; position: sticky; top: 0; z-index: 1; }
.map-chip { border: 1px dashed var(--v-theme-outline); border-radius: 10px; padding: 8px; min-width: 180px; }
.oh3-title { color: rgb(var(--v-theme-primary)); }
.oh3-accent-border { border-top: 3px solid rgb(var(--v-theme-primary)); }
</style>
