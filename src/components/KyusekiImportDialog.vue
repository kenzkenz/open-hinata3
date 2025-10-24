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
            <v-stepper-item color="primary" :complete="step>4" :value="4" title="プレビュー・検算" subtitle="閉合/面積＋地図" />
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

            <!-- Step 4 プレビュー・検算（＋ MapLibre） -->
            <v-stepper-window-item :value="4">
              <div class="pa-4">
                <v-alert v-if="buildError" type="error" class="mb-4">{{ buildError }}</v-alert>

                <div v-if="points.length">
                  <div class="preview-grid">
                    <!-- MapLibre -->
                    <v-card class="oh3-accent-border pane" variant="outlined">
                      <v-card-title class="py-2">地図プレビュー（MapLibre）</v-card-title>
                      <v-card-text class="pane-body">
                        <div ref="maplibreEl" class="maplibre-host"></div>
                        <div class="text-caption text-medium-emphasis mt-2">
                          ※ 現状は背景のみ表示。重ね合わせは後で実装します。
                        </div>
                      </v-card-text>
                    </v-card>

                    <!-- 座標プレビュー：親と同じ高さに揃える -->
                    <v-card class="oh3-accent-border pane" variant="outlined">
                      <v-card-title class="py-2">座標プレビュー</v-card-title>
                      <v-card-text class="pane-body">
                        <div class="table-fill">
                          <table class="oh3-simple">
                            <thead>
                            <tr>
                              <th>#</th>
                              <th>点名/点番</th>
                              <th>X</th>
                              <th>Y</th>
                            </tr>
                            </thead>
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

                    <!-- 検算 -->
                    <v-card class="oh3-accent-border pane" variant="outlined">
                      <v-card-title class="py-2">検算</v-card-title>
                      <v-card-text class="compact-text pane-body">
                        <div class="inline-metrics">
                          <div>閉合差: <b>{{ fmt(closure.len) }} m</b></div>
                          <div>dx: {{ fmt(closure.dx) }}</div>
                          <div>dy: {{ fmt(closure.dy) }}</div>
                          <div>面積: <b>{{ fmt(area.area) }} m²</b></div>
                        </div>
                        <div v-if="closure.len > closureThreshold" class="warn small">
                          閉合差が閾値（{{ closureThreshold }}m）を超えています。
                        </div>
                      </v-card-text>
                    </v-card>
                  </div>

                  <div class="d-flex align-center gap-3 mt-3">
                    <!-- 公共座標系（表示名のみ。内部はJGD2000 EPSG） -->
                    <v-select
                        v-model="crs"
                        :items="crsChoices"
                        item-title="title"
                        item-value="value"
                        label="公共座標系（推定）"
                        style="max-width: 260px"
                        density="compact"
                    />
                  </div>
                </div>

                <div v-else>
                  <div class="preview-grid">
                    <v-card class="oh3-accent-border pane" variant="outlined">
                      <v-card-title class="py-2">地図プレビュー（MapLibre）</v-card-title>
                      <v-card-text class="pane-body">
                        <div ref="maplibreEl" class="maplibre-host"></div>
                        <div class="text-caption text-medium-emphasis mt-2">
                          ※ 現状は背景のみ表示。重ね合わせは後で実装します。
                        </div>
                      </v-card-text>
                    </v-card>

                    <v-card class="oh3-accent-border pane" variant="outlined">
                      <v-card-text class="pane-body text-medium-emphasis">
                        列マッピング後に「再構成」してください。
                      </v-card-text>
                    </v-card>

                    <div class="d-none d-md-block"></div>
                  </div>
                </div>
              </div>
            </v-stepper-window-item>

            <!-- Step 5 取り込み -->
            <v-stepper-window-item :value="5">
              <div class="pa-4">
                <div v-if="points.length">
                  <v-alert type="info" color="primary" variant="tonal" class="mb-3">
                    {{ points.length }} 点を処理します。
                  </v-alert>
                  <div class="d-flex align-center gap-3">
                    <v-btn variant="outlined" prepend-icon="mdi-download" @click="downloadSIMA">SIMAファイルダウンロード</v-btn>
                    <v-btn color="primary" :loading="busy" prepend-icon="mdi-database-import" @click="commit">取り込み実行</v-btn>
                  </div>
                  <div v-if="simaInfo.name" class="text-caption text-medium-emphasis mt-2">
                    生成: {{ simaInfo.name }}（{{ simaInfo.size }} bytes）
                  </div>
                </div>
                <div class="text-medium-emphasis" v-else>先に再構成してください。</div>
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
import { downloadTextFile } from '@/js/downLoad'

// ===== 画像前処理（劣化原稿向け：適応二値化） =====
async function fileToCanvas (file, maxSide = 2400, tiles = 24) {
  const blob = (file instanceof File) ? file : new File([file], 'img')

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

  const scale = Math.max(1, Math.min(1.6, maxSide / Math.max(img.width, img.height)))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, w, h)

  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const tw = Math.max(8, Math.floor(w / tiles))
  const th = Math.max(8, Math.floor(h / tiles))
  for (let ty = 0; ty < h; ty += th) {
    for (let tx = 0; tx < w; tx += tw) {
      let sum = 0, cnt = 0
      const bx = Math.min(tx + tw, w), by = Math.min(ty + th, h)
      for (let y = ty; y < by; y++) {
        for (let x = tx; x < bx; x++) {
          const p = (y*w + x) * 4
          const g = (d[p]*0.299 + d[p+1]*0.587 + d[p+2]*0.114)
          sum += g; cnt++
        }
      }
      const mean = sum / Math.max(1, cnt)
      const thres = Math.max(110, Math.min(190, mean - 8))
      for (let y = ty; y < by; y++) {
        for (let x = tx; x < bx; x++) {
          const p = (y*w + x) * 4
          const g = (d[p]*0.299 + d[p+1]*0.587 + d[p+2]*0.114)
          const v = g > thres ? 255 : 0
          d[p] = d[p+1] = d[p+2] = v
          d[p+3] = 255
        }
      }
    }
  }
  ctx.putImageData(id, 0, 0)
  return canvas
}

// セル分割（堅牢）
function splitRow (line) {
  return line
      .replace(/]/g, ' ] ')
      .replace(/\|/g, ' | ')
      .split(/,|\t|\||]|\s{2,}/)
      .map(s => s.trim())
      .filter(s => s.length)
}

// 崩壊救済： [ID, X, Y] を粗く抽出
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
  props: {
    modelValue: { type: Boolean, default: false },
    jobId: { type: [String, Number], default: null },
    startXY: { type: Object, default: null } // {x,y}
  },
  emits: ['update:modelValue', 'imported'],
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
      cloudServiceItems: ['Textract', 'DocumentAI', 'Azure'],

      // Step2 OCR結果（表形式）
      ocrError: '',
      rawTable: { headers: [], rows: [] },

      // Step3 列ロール
      columnRoles: [],
      roleOptions: [
        { title: '未使用', value: null },
        { title: '点番（数）', value: 'idx' },
        { title: '点名（文字）', value: 'label' },
        { title: 'X', value: 'x' },
        { title: 'Y', value: 'y' },
        { title: '方位角', value: 'azimuth' },
        { title: '距離', value: 'distance' },
        { title: '半径R', value: 'radius' },
        { title: '中心角θ(度)', value: 'theta' },
        { title: '弦長c', value: 'chord' },
        { title: '弧長L', value: 'arcLength' },
        { title: '備考', value: 'remark' }
      ],

      // Step4 再構成
      points: [],
      area: { area: 0, signed: 0 },
      closure: { dx: 0, dy: 0, len: 0 },
      closureThreshold: 0.02,

      // 内部CRS（JGD2000 2000系）既定：公共座標2系
      crs: 'EPSG:2444',
      crsChoices: [
        { title: '公共座標1系', value: 'EPSG:2443' },
        { title: '公共座標2系', value: 'EPSG:2444' },
        { title: '公共座標3系', value: 'EPSG:2445' },
        { title: '公共座標4系', value: 'EPSG:2446' },
        { title: '公共座標5系', value: 'EPSG:2447' },
        { title: '公共座標6系', value: 'EPSG:2448' },
        { title: '公共座標7系', value: 'EPSG:2449' },
        { title: '公共座標8系', value: 'EPSG:2450' },
        { title: '公共座標9系', value: 'EPSG:2451' },
        { title: '公共座標10系', value: 'EPSG:2452' },
        { title: '公共座標11系', value: 'EPSG:2453' },
        { title: '公共座標12系', value: 'EPSG:2454' },
        { title: '公共座標13系', value: 'EPSG:2455' },
        { title: '公共座標14系', value: 'EPSG:2456' },
        { title: '公共座標15系', value: 'EPSG:2457' },
        { title: '公共座標16系', value: 'EPSG:2458' },
        { title: '公共座標17系', value: 'EPSG:2459' },
        { title: '公共座標18系', value: 'EPSG:2460' },
        { title: '公共座標19系', value: 'EPSG:2461' }
      ],

      buildError: '',
      simaInfo: { name: '', size: 0 },
      lastSimaText: '',

      // MapLibre
      map: null
    }
  },
  watch: {
    modelValue (v) { this.internal = v },
    internal (v) { this.$emit('update:modelValue', v) },
    step (v) {
      if (v === 4) this.$nextTick(() => this.initMapLibre())
    }
  },
  mounted () {
    if (this.step === 4) this.initMapLibre()
  },
  methods: {
    // ===== ユーティリティ =====
    fmt (v) { return (v == null || Number.isNaN(v)) ? '' : Number(v).toFixed(3) },
    close () { this.internal = false },
    goNext () {
      if (this.step === 1) { if (this.file) this.step = 2; return }
      if (this.step === 2) { if (this.rawTable.headers.length) this.step = 3; return }
      if (this.step === 3) { this.rebuild(); this.step = 4; return }
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

        // 初期ロール推定
        this.columnRoles = this.rawTable.headers.map(h => this.guessRoleFromHeader(h)).map(v => v ?? null)
        // 派生列っぽいヘッダは自動で未使用へ
        this.rawTable.headers.forEach((h, i) => {
          const clean = String(h).toLowerCase()
          if (/[+/*()]/.test(clean) || /y\+?n\+?1.*y\+?n-?1|xn.*yn/i.test(clean)) {
            this.columnRoles[i] = null
          }
        })

        if (this.step < 3) this.step = 3
      } catch (e) {
        console.error(e)
        this.ocrError = String(e.message || e)
      } finally {
        this.busy = false
      }
    },

    // 端末内OCR（PNG/JPG） tesseract.js v5/v2両対応
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
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/dist/tesseract-core.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/5'
      }
      let worker
      try {
        worker = await createWorker(['jpn', 'eng'], workerOptions) // v5
      } catch {
        worker = await createWorker(workerOptions) // v2
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
                "0123456789.-+()[]{}:：XxYyNnEeWwSs度°′'\"弧長弦半径中心角点番Noｎｏ東西南北備考/|,",
            classify_bln_numeric_mode: '1', // 数値優先
            tessedit_char_blacklist: 'OoSs', // 0↔O / 5↔Sを抑制
            user_defined_dpi: '300',
            tessedit_write_images: '0'
          })
        }

        const res = await worker.recognize(canvas)
        const data = res?.data || res

        // 行テキスト抽出
        let lines = Array.isArray(data?.lines) ? data.lines.map(l => (l.text || '').trim()) : []
        if (!lines.length && typeof data?.text === 'string') {
          lines = data.text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
        }

        // ヘッダ候補（Xn/Yn があって数値が少ない行）
        const headerLine = lines.find(L => {
          const s = (L || '').normalize('NFKC')
          const hasXY = /Xn/i.test(s) && /Yn/i.test(s)
          const nums = (s.match(/-?\d+(?:\.\d+)?/g) || []).length
          return hasXY && nums <= 2
        })

        let fixedHeader = null
        if (headerLine) {
          fixedHeader = headerLine
              .normalize('NFKC')
              .replace(/(N[O0]+)\s*(Xn)/ig, '$1 | $2')
              .replace(/(Xn)\s*(Yn)/ig, '$1 | $2')
              .replace(/(Yn)\s*(Y[^\s|]+)/ig, '$1 | $2')
              .replace(/\s{2,}/g, ' ')
        }

        let rows = lines
            .map(L => (L === headerLine && fixedHeader) ? fixedHeader : L)
            .map(splitRow)
            .filter(r => r.length > 1)

        // 列崩壊救済：最低限 NO(点名代用), Xn, Yn を抽出
        if (!rows.length || Math.max(...rows.map(r => r.length)) < 3) {
          const ext = lines.map(extractIdXY).filter(Boolean)
          if (ext.length) {
            const headers = ['点名', 'Xn', 'Yn']
            const body = ext.map(([id, x, y]) => [id, x, y])
            return { headers, rows: body }
          }
        }
        if (!rows.length) return { headers: [], rows: [] }

        // ヘッダ行推定：非数字文字の多い行をヘッダとみなす
        const idxMax = rows
            .map((r, i) => ({ i, score: r.filter(c => /[^\d\s.-]/.test(c)).length }))
            .sort((a, b) => b.score - a.score)[0]?.i ?? 0

        // ヘッダ整形
        let headers = rows[idxMax].map(h => h.replace(/\s+/g, ''))
        if (headers.length < 3) {
          const joined = rows[idxMax].join(' ')
          const forced = joined
              .normalize('NFKC')
              .replace(/(N[O0]+)\s*(Xn)/ig, '$1|$2')
              .replace(/(Xn)\s*(Yn)/ig, '$1|$2')
              .replace(/(Yn)\s*(Y[^\s|]+)/ig, '$1|$2')
              .split('|').map(s => s.trim()).filter(Boolean)
          if (forced.length >= 3) headers = forced
        }

        // 表記を正規化（点名/点番を分ける）
        headers = headers.map(h =>
            h.replace(/点名|標識|名称/i, '点名')
                .replace(/点番|番号|No/i, '点番')
                .replace(/X座標|東距|東/i, 'X')
                .replace(/Y座標|北距|北/i, 'Y')
                .replace(/方位角|方位/i, '方位角')
                .replace(/距離|長さ|延長/i, '距離')
                .replace(/半径|R/i, '半径R')
                .replace(/中心角|角度/i, '中心角θ')
                .replace(/弦長|弦/i, '弦長c')
                .replace(/弧長/i, '弧長L')
        )

        // ボディ整形
        const body = rows.filter((_, i) => i !== idxMax)
        const colN = Math.max(headers.length, ...body.map(r => r.length))
        headers = headers.slice(0, colN)
        const normBody = body.map(r => {
          const a = r.slice(0, colN)
          while (a.length < colN) a.push('')
          return a
        })

        return { headers, rows: normBody }
      } catch (e) {
        console.error('local OCR error:', e)
        return { headers: [], rows: [] }
      } finally {
        try { await worker.terminate() } catch {}
      }
    },

    // クラウドOCR（差し替えポイント：現状ダミー）
    async runCloudOCR () { return { headers: [], rows: [] } },

    // ===== Step3: 列マッピング推定 & 正規化 =====
    normHeader (s) {
      if (!s) return ''
      const z2h = s.normalize('NFKC')
      return z2h
          .replace(/\s+/g, '')
          .replace(/[()【】（）:：ー_−－\u00A0\u2003\u2002\u3000─━‐–—-]/g, '')
          .replace(/\[/g, '')
          .replace(/\]/g, '')
          .toLowerCase()
    },
    guessRoleFromHeader (h) {
      const H = this.normHeader(h)
      const compact = String(h).replace(/\s+/g, '')
      if (/^(no|n0|№|番)$/i.test(compact)) return 'idx'
      if (/^(xn|x)$/i.test(h.trim())) return 'x'
      if (/^(yn|y)$/i.test(h.trim())) return 'y'

      const dict = {
        idx: ['点番', '番号', 'no', 'ｎｏ', '番', 'n0', '№'],
        label: ['点名', '標識', '名称'],
        x: ['x', 'xn', 'x座標', '東', 'e', '東距', '横座標'],
        y: ['y', 'yn', 'y座標', '北', 'n', '北距', '縦座標'],
        azimuth: ['方位', '方位角', '方角', 'bearing', '方位角度'],
        distance: ['距離', '長さ', '延長', 'd', 'l', '辺長'],
        radius: ['r', '半径', '曲率半径'],
        theta: ['中心角', '角度', 'θ', 'デルタ', 'delta', 'セクタ角'],
        chord: ['弦', '弦長'],
        arcLength: ['弧長', 'アーク長', '弧線長'],
        remark: ['備考', '注記', 'メモ']
      }
      for (const [role, arr] of Object.entries(dict)) {
        if (arr.some(k => H.includes(k))) return role
      }
      if (/\b(xn|x)\b/i.test(h)) return 'x'
      if (/\b(yn|y)\b/i.test(h)) return 'y'
      return null
    },

    normNumberStr (s) {
      if (s == null) return ''
      const z2h = s.normalize('NFKC').replace(/,/g, '')
      return z2h
          .replace(/[\]|]/g, '')
          .replace(/[−－\u00A0\u2003\u2002\u3000─━‐–—]/g, '-')
          .trim()
    },
    parseNumber (s) {
      const t = this.normNumberStr(String(s)).match(/-?\d+(?:\.\d+)?/)
      return t ? parseFloat(t[0]) : NaN
    },
    parseAzimuth (str) {
      const s = this.normNumberStr(String(str)).toUpperCase()
      const q = s.match(/([NS])\s*(\d+(?:\.\d+)?)\s*([EW])/)
      if (q) {
        const deg = parseFloat(q[2])
        const NSEW = q[1] + q[3]
        const map = { NE: deg, SE: 180 - deg, SW: 180 + deg, NW: 360 - deg }
        return map[NSEW] ?? NaN
      }
      const dms = s.match(/(-?\d+)[°º度 -]\s*(\d+)?[′']?\s*(\d+(?:\.\d+)?)?[″"]?/)
      if (dms) {
        const d = parseFloat(dms[1])
        const m = dms[2] ? parseFloat(dms[2]) : 0
        const sec = dms[3] ? parseFloat(dms[3]) : 0
        return Math.sign(d) * (Math.abs(d) + m / 60 + sec / 3600)
      }
      const n = parseFloat(s.replace(/[°度]/g, ''))
      return Number.isFinite(n) ? n : NaN
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
        if (roles.idx != null) rec.idx = this.parseNumber(r[roles.idx])
        if (roles.label != null) rec.label = String(r[roles.label] ?? '').trim() || undefined
        if (roles.x != null) rec.x = this.parseNumber(r[roles.x])
        if (roles.y != null) rec.y = this.parseNumber(r[roles.y])
        if (roles.azimuth != null) rec.az = this.parseAzimuth(r[roles.azimuth])
        if (roles.distance != null) rec.dist = this.parseNumber(r[roles.distance])
        if (roles.radius != null) rec.R = this.parseNumber(r[roles.radius])
        if (roles.theta != null) rec.thetaDeg = this.parseNumber(r[roles.theta])
        if (roles.chord != null) rec.chord = this.parseNumber(r[roles.chord])
        if (roles.arcLength != null) rec.arcLen = this.parseNumber(r[roles.arcLength])
        rec.kind = (rec.R && (rec.thetaDeg || rec.chord || rec.arcLen)) ? 'arc' : 'line'
        out.push(rec)
      }
      return out
    },

    // ===== 外れ値補正（±9000 / 0↔5 / 0↔5↔9 の局所補正） =====
    median (arr) {
      const a = arr.filter(v => Number.isFinite(v)).slice().sort((x, y) => x - y)
      if (!a.length) return NaN
      const m = Math.floor(a.length / 2)
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
    },
    adjustByMagnitude (v, target) {
      if (!Number.isFinite(v) || !Number.isFinite(target)) return v
      const cand = [v, v - 9000, v + 9000]
      cand.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
      return Math.abs(v - target) > 4000 ? cand[0] : v
    },
    // 一桁だけ 0/5/9 を試し置換し、前点からのジャンプが最小になる候補を選ぶ
    adjustLocalDigit (v, prev) {
      if (!Number.isFinite(v) || !Number.isFinite(prev)) return v
      const s = Number(v).toFixed(3)
      const tryFlip = (str) => {
        const arr = str.split('')
        const cand = []
        for (let i = 0; i < arr.length; i++) {
          const ch = arr[i]
          const opts = ch === '0' ? ['5', '9'] : ch === '5' ? ['0', '9'] : ch === '9' ? ['0', '5'] : []
          for (const o of opts) {
            const a = arr.slice(); a[i] = o
            const num = parseFloat(a.join(''))
            if (Number.isFinite(num)) cand.push(num)
          }
        }
        return cand
      }
      const candidates = [v, ...tryFlip(s)]
      candidates.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev))
      // 前点との差が 0.05 以上改善するなら採用
      return (Math.abs(v - prev) - Math.abs(candidates[0] - prev) >= 0.05) ? candidates[0] : v
    },
    adjustZeroFive (v, target) {
      if (!Number.isFinite(v) || !Number.isFinite(target)) return v
      const s = Number(v).toFixed(3)
      const tryFlip = (str) => {
        const arr = str.split(''); const out = []
        for (let i=0;i<arr.length;i++) {
          if (arr[i] === '0' || arr[i] === '5') {
            const alt = arr[i] === '0' ? '5' : '0'
            const a = arr.slice(); a[i] = alt
            const num = parseFloat(a.join('')); out.push(num)
          }
        }
        return out
      }
      const candidates = [v, ...tryFlip(s)]
      candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))
      return (Math.abs(v-target) - Math.abs(candidates[0]-target) >= 0.04) ? candidates[0] : v
    },
    postCorrectRecords (recs) {
      if (!recs.length) return recs
      // 1) ±9000補正（大桁崩れ）
      const xs = recs.map(r => r.x).filter(Number.isFinite)
      const ys = recs.map(r => r.y).filter(Number.isFinite)
      const mx = this.median(xs), my = this.median(ys)
      const magFixed = recs.map(r => ({
        ...r,
        x: this.adjustByMagnitude(r.x, mx),
        y: this.adjustByMagnitude(r.y, my)
      }))
      // 2) 0↔5 全体補正（中央値）
      const xs2 = magFixed.map(r => r.x).filter(Number.isFinite)
      const ys2 = magFixed.map(r => r.y).filter(Number.isFinite)
      const mx2 = this.median(xs2), my2 = this.median(ys2)
      const z5Fixed = magFixed.map(r => ({
        ...r,
        x: this.adjustZeroFive(r.x, mx2),
        y: this.adjustZeroFive(r.y, my2)
      }))
      // 3) 連続性重視の局所補正（前点からのジャンプ最小）
      const out = []
      for (let i = 0; i < z5Fixed.length; i++) {
        const prev = out[i-1]
        if (prev) {
          out.push({
            ...z5Fixed[i],
            x: this.adjustLocalDigit(z5Fixed[i].x, prev.x),
            y: this.adjustLocalDigit(z5Fixed[i].y, prev.y)
          })
        } else {
          out.push(z5Fixed[i])
        }
      }
      return out
    },

    // ===== Step4: 再構成 & 検算 =====
    forwardFromAzDist (x, y, azDeg, dist, azZero = 'north') {
      const rad = (d) => d * Math.PI / 180
      const theta = azZero === 'north' ? rad(90 - azDeg) : rad(azDeg)
      const dx = dist * Math.cos(theta)
      const dy = dist * Math.sin(theta)
      return { x: x + dx, y: y + dy }
    },
    shoelace (pts) {
      const n = pts.length
      let s1 = 0, s2 = 0
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n]
        s1 += a.x * b.y; s2 += a.y * b.x
      }
      const signed = 0.5 * (s1 - s2)
      return { area: Math.abs(signed), signed }
    },
    closureError (pts) {
      const first = pts[0], last = pts[pts.length - 1]
      const dx = last.x - first.x, dy = last.y - first.y
      return { dx, dy, len: Math.hypot(dx, dy) }
    },

    rebuild () {
      this.buildError = ''
      this.points = []
      try {
        const recs = this.parseRowsToRecords()
        const fixed = this.postCorrectRecords(recs)
        let pts = []
        const hasXY = fixed.every(r => Number.isFinite(r.x) && Number.isFinite(r.y))
        const hasAD = fixed.every(r => Number.isFinite(r.az) && Number.isFinite(r.dist))
        if (hasXY) {
          pts = fixed.map((r, i) => ({
            x: r.x, y: r.y,
            idx: Number.isFinite(r.idx) ? r.idx : undefined,
            label: r.label ? String(r.label) : undefined
          }))
        } else if (hasAD && this.startXY) {
          let cur = { x: this.startXY.x, y: this.startXY.y }
          pts.push({ ...cur, idx: fixed[0]?.idx ?? 1, label: fixed[0]?.label })
          for (const r of fixed) {
            const nxt = this.forwardFromAzDist(cur.x, cur.y, r.az, r.dist, 'north')
            pts.push({ ...nxt, idx: r.idx, label: r.label })
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

    // 簡易CRS推定（値域ベース）
    guessCRS (pts) {
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const rangeX = maxX - minX, rangeY = maxY - minY
      if (minX > 0 && maxX < 400000 && minY > 3000000 && maxY < 5000000 && (rangeX < 200000) && (rangeY < 200000)) {
        return this.crs
      }
      return null
    },

    // ===== SIM（ユーザ形式：A01,seq,点名or点番,X,Y,0,） =====
    extractLotFromFileName () {
      try {
        const f = Array.isArray(this.file) ? this.file[0] : this.file
        const name = (f && f.name) ? f.name : ''
        const m = String(name).match(/(\d{1,5}-\d{1,5})/)
        return m ? m[1] : '000-0'
      } catch {
        return '000-0'
      }
    },
    resolveProjectName () {
      if (this.jobId) return `oh3-job-${this.jobId}`
      return 'open-hinata3'
    },
    buildSIMAContent () {
      if (!this.points.length) return ''
      const prj = this.resolveProjectName()
      const lot = this.extractLotFromFileName()

      const lines = []
      // ヘッダ
      lines.push(`G00,01,${prj},`)
      // 座標データ
      lines.push('Z00,座標ﾃﾞｰﾀ,,')
      lines.push('A00,')
      this.points.forEach((p, i) => {
        const display = (p.label && String(p.label).length) ? String(p.label) :
            (Number.isFinite(p.idx) ? String(p.idx) : String(i + 1))
        const x = Number(p.x).toFixed(3)
        const y = Number(p.y).toFixed(3)
        lines.push(`A01,${i + 1},${display},${x},${y},0,`)
      })
      lines.push('A99,')
      // 区画データ（単一）
      lines.push('Z00,区画データ,')
      lines.push(`D00,1,${lot},1,`)
      this.points.forEach((p, i) => {
        const display = (p.label && String(p.label).length) ? String(p.label) :
            (Number.isFinite(p.idx) ? String(p.idx) : String(i + 1))
        lines.push(`B01,${i + 1},${display},`)
      })
      lines.push('D99,')
      // 終端
      lines.push('A99,END')

      return lines.join('\n')
    },

    // ===== ダウンロード（Shift_JIS, .sim） =====
    downloadSIMA () {
      if (!this.points.length) return
      const text = this.buildSIMAContent()
      this.lastSimaText = text
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const name = `kyuseki_${ts}.sim`
      downloadTextFile(name, text, 'shift-jis')

      // サイズ表示（SJIS長が取れればそれを使う）
      let size = text.length
      try {
        if (window.Encoding) {
          const utf8 = window.Encoding.stringToCode(text)
          const sjis = window.Encoding.convert(utf8, 'SJIS')
          size = sjis.length
        }
      } catch {}
      this.simaInfo = { name, size }
    },

    // ===== 取り込み実行（今は空：将来 OH3 既存機能へ接続） =====
    async commit () {
      this.$emit('imported', {
        count: this.points.length,
        crs: this.crs,
        area: this.area.area,
        sim: !!this.simaInfo.name
      })
    },

    // ===== MapLibre 初期化（空マップ） =====
    async initMapLibre () {
      if (this.map || !this.$refs.maplibreEl) return

      // CSS を動的ロード
      const id = 'maplibre-css'
      if (!document.getElementById(id)) {
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css'
        document.head.appendChild(link)
      }
      const { Map } = await import('maplibre-gl')

      // 完全“空”のスタイル（背景のみ）
      const blankStyle = {
        version: 8,
        sources: {},
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#f6f9ff' } }
        ]
      }

      this.map = new Map({
        container: this.$refs.maplibreEl,
        style: blankStyle,
        center: [139.767, 35.681], // 仮：東京駅
        zoom: 12,
        preserveDrawingBuffer: true
      })
    }
  }
}
</script>

<style scoped>
/* 全体 */
.preview-box { width: 100%; border: 1px dashed var(--v-theme-outline); border-radius: 8px; padding: 8px; min-height: 180px; display: grid; place-items: center; }
.preview-img { max-width: 100%; max-height: 280px; object-fit: contain; }
.ocr-table { border: 1px solid var(--v-theme-outline-variant); border-radius: 8px; padding: 8px; }

/* パネルの共通高さを統一（親と揃える） */
:root { --pane-h: 340px; } /* 必要あればここを調整 */
.pane { display: flex; flex-direction: column; min-height: var(--pane-h); }
.pane-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }

/* PCでスクロール最小化（テーブル/地図） */
.table-fill { flex: 1; overflow: auto; }
.maplibre-host { width: 100%; height: 100%; border: 1px solid #e2e8f0; border-radius: 8px; }

/* 横並び（狭いと縦） */
.preview-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 1200px) { .preview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 980px) { .preview-grid { grid-template-columns: 1fr; } }

/* テーブル */
.oh3-simple { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.oh3-simple th, .oh3-simple td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; white-space: nowrap; }
.oh3-simple thead th { background: #f6f6f7; position: sticky; top: 0; z-index: 1; }

/* 検算をコンパクトに */
.compact-text { padding-top: 4px; padding-bottom: 4px; }
.inline-metrics { display: flex; flex-wrap: wrap; gap: 12px; align-items: baseline; }
.warn.small { font-size: 12px; color: #a15d00; margin-top: 6px; }

.map-chip { border: 1px dashed var(--v-theme-outline); border-radius: 10px; padding: 8px; min-width: 180px; }
.oh3-title { color: rgb(var(--v-theme-primary)); }
.oh3-accent-border { border-top: 3px solid rgb(var(--v-theme-primary)); }
</style>
