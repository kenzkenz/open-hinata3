<template>
  <v-dialog
      v-model="internal"
      max-width="1440"
      scrollable
      transition="dialog-bottom-transition"
  >
    <v-card class="oh3-dialog" ref="dialogRoot" @keydown="onLocalKeyDown">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2 oh3-title">
          <v-icon class="mr-2" color="primary">mdi-table-search</v-icon>
          求積表インポート（OCR）
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn icon="mdi-undo" variant="text" :disabled="!canUndo || disableAll" @click="undo" />
          <v-btn icon="mdi-close" variant="text" :disabled="disableAll" @click="close" />
        </div>
      </v-card-title>

      <v-divider color="primary" />

      <v-progress-linear v-if="transitioning" :indeterminate="true" color="primary" height="4" />

      <div class="px-3 pt-2 pb-0">
        <v-stepper v-model="step" flat color="primary" class="big-steps">
          <v-stepper-header>
            <v-stepper-item color="primary" :complete="step>1" :value="1" title="取り込み" />
            <v-divider v-if="!compactFlow || showStep2Header" />
            <v-stepper-item v-if="!compactFlow || showStep2Header" color="primary" :complete="step>2" :value="2" title="OCR" />
            <v-divider />
            <v-stepper-item color="primary" :complete="step>(compactFlow?2:3)" :value="3" title="列マッピング" />
            <v-divider />
            <v-stepper-item color="primary" :complete="step>(compactFlow?3:4)" :value="4" title="プレビュー・検算" />
            <v-divider />
            <v-stepper-item color="primary" :complete="false" :value="5" title="取り込み" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- STEP1 -->
            <v-stepper-window-item :value="1">
              <div class="pa-3 step-host">
                <div class="d-flex flex-wrap gap-3">
                  <v-file-input
                      v-model="file"
                      accept="image/*,.pdf"
                      label="求積表の写真 or PDF を選択"
                      prepend-icon="mdi-camera"
                      variant="outlined"
                      density="comfortable"
                      clearable
                      class="file-compact"
                      show-size
                      :disabled="disableAll"
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
              </div>
            </v-stepper-window-item>

            <!-- STEP2 -->
            <v-stepper-window-item v-if="!compactFlow || ocrError || transitioning" :value="2">
              <div class="pa-3 step-host">
                <div class="d-flex align-center gap-3 mb-2">
                  <v-btn :loading="busy" :disabled="disableAll" @click="doOCR" prepend-icon="mdi-text-recognition" color="primary">
                    OCR 実行
                  </v-btn>
                  <span class="text-medium-emphasis">
                    <template v-if="transitioning">（OCR 実行中…）</template>
                  </span>
                </div>

                <v-alert v-if="ocrError" type="error" density="comfortable" class="mb-3">{{ ocrError }}</v-alert>

                <div v-if="transitioning" class="loader-placeholder">
                  <v-skeleton-loader type="table" />
                </div>

                <div v-else-if="rawTable.headers.length" class="ocr-table flex-col">
                  <div class="text-subtitle-2 mb-1">抽出プレビュー（そのまま編集可）</div>
                  <div class="table-host">
                    <table class="oh3-simple editable auto">
                      <thead>
                      <tr><th v-for="(h,i) in rawTable.headers" :key="`h${i}`">{{ h }}</th></tr>
                      </thead>
                      <tbody>
                      <tr v-for="(r,ri) in rawTable.rows" :key="`r2-${ri}`">
                        <td v-for="(c,ci) in r" :key="`c2-${ri}-${ci}`">
                          <input
                              class="cell-input"
                              :class="{num: isNumericRole(ci)}"
                              :value="c"
                              :disabled="disableAll"
                              :inputmode="isNumericRole(ci)?'decimal':undefined"
                              @focus="$event.target.select()"
                              @keydown="onEditKeyDown"
                              @change="onRawCellEditAbs(ri, ci, $event.target.value)"
                              @keydown.enter.prevent="$event.target.blur()"
                          />
                        </td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    ※ ここで修正すると後工程に反映（⌘/Ctrl+Z で直前の修正を取り消し）。
                  </div>
                </div>

                <div v-else class="text-medium-emphasis">まだ結果がありません。OCRを実行してください。</div>
              </div>
            </v-stepper-window-item>

            <!-- STEP3 -->
            <v-stepper-window-item :value="3">
              <div class="pa-3 step-host fill-parent">
                <div v-if="rawTable.headers.length" class="flex-col fill-parent">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-subtitle-2">列の役割を確認/修正（点番は使わず点名に寄せる）</div>
                    <v-btn size="small" variant="text" :disabled="disableAll" @click="autoMapRoles" prepend-icon="mdi-magic-staff">自動マッピング</v-btn>
                  </div>

                  <div class="d-flex flex-wrap gap-2 mb-2">
                    <div v-for="(h, i) in rawTable.headers" :key="`m${i}`" class="map-chip">
                      <div class="text-caption text-medium-emphasis mb-1">{{ h || '(空)' }}</div>
                      <v-select
                          class="no-stretch" density="comfortable" variant="outlined"
                          :items="roleOptions" v-model="columnRoles[i]" style="min-width:160px" hide-details
                          :disabled="disableAll"
                      />
                    </div>
                  </div>

                  <div class="text-caption text-medium-emphasis mb-1">サンプル（編集可）</div>
                  <div class="table-host">
                    <table class="oh3-simple editable auto">
                      <thead>
                      <tr><th v-for="(h,i) in rawTable.headers" :key="`hm${i}`">{{ h }}</th></tr>
                      </thead>
                      <tbody>
                      <tr v-for="(r,ri) in rawTable.rows.slice(0,30)" :key="`rm${ri}`">
                        <td v-for="(c,ci) in r" :key="`cm${ri}-${ci}`">
                          <input
                              class="cell-input"
                              :class="{num: isNumericRole(ci)}"
                              :value="c"
                              :disabled="disableAll"
                              :inputmode="isNumericRole(ci)?'decimal':undefined"
                              @focus="$event.target.select()"
                              @keydown="onEditKeyDown"
                              @change="onRawCellEditAbs(ri, ci, $event.target.value)"
                              @keydown.enter.prevent="$event.target.blur()"
                          />
                        </td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="text-medium-emphasis" v-else>まずOCRを実行してください。</div>
              </div>
            </v-stepper-window-item>

            <!-- STEP4 -->
            <v-stepper-window-item :value="4">
              <div class="pa-3 step-host">
                <v-alert v-if="buildError" type="error" class="mb-3">{{ buildError }}</v-alert>

                <div class="preview-grid" v-if="points.length">
                  <v-card class="oh3-accent-border pane tall" variant="outlined">
                    <v-card-title class="py-2">地図プレビュー</v-card-title>
                    <v-card-text class="pane-body">
                      <div ref="maplibreEl" class="maplibre-host"></div>
                      <div class="text-caption text-medium-emphasis mt-2">出典：地理院タイル（淡色）</div>
                    </v-card-text>
                  </v-card>

                  <v-card class="oh3-accent-border pane tall" variant="outlined">
                    <v-card-title class="py-2">座標プレビュー（編集可）</v-card-title>
                    <v-card-text class="pane-body">
                      <div class="table-host">
                        <table class="oh3-simple editable coords-table">
                          <colgroup>
                            <col class="col-index" />
                            <col class="col-label" :style="{width: colw.label + 'px'}" />
                            <col class="col-num"   :style="{width: colw.x + 'px'}" />
                            <col class="col-num"   :style="{width: colw.y + 'px'}" />
                            <col style="width:20px" />
                          </colgroup>
                          <thead>
                          <tr>
                            <th>#</th>
                            <th>点名 <span class="th-grip" data-resize="label"></span></th>
                            <th>X   <span class="th-grip" data-resize="x"></span></th>
                            <th>Y   <span class="th-grip" data-resize="y"></span></th>
                            <th></th>
                          </tr>
                          </thead>
                          <tbody>
                          <tr v-for="(p,i) in points" :key="`p${i}`">
                            <td>{{ i+1 }}</td>
                            <td :class="cellClass(i,'label')">
                              <input class="cell-input" :value="p.label ?? (i+1)"
                                     :disabled="disableAll"
                                     @focus="$event.target.select()" @keydown="onEditKeyDown"
                                     @change="onCellEdit(p.sourceRow, 'label', $event.target.value)"
                                     @keydown.enter.prevent="$event.target.blur()" />
                            </td>
                            <td :class="cellClass(i,'x')">
                              <input class="cell-input num" :value="p.rawX" inputmode="decimal"
                                     :disabled="disableAll"
                                     @focus="$event.target.select()" @keydown="onEditKeyDown"
                                     @change="onCellEdit(p.sourceRow, 'x', $event.target.value)"
                                     @keydown.enter.prevent="$event.target.blur()" />
                            </td>
                            <td :class="cellClass(i,'y')">
                              <input class="cell-input num" :value="p.rawY" inputmode="decimal"
                                     :disabled="disableAll"
                                     @focus="$event.target.select()" @keydown="onEditKeyDown"
                                     @change="onCellEdit(p.sourceRow, 'y', $event.target.value)"
                                     @keydown.enter.prevent="$event.target.blur()" />
                            </td>
                            <td class="edited-flag"><v-icon v-if="isEdited(p.sourceRow)" size="16" color="primary">mdi-pencil</v-icon></td>
                          </tr>
                          </tbody>
                        </table>
                      </div>
                    </v-card-text>
                  </v-card>

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

                  <v-card variant="outlined">
                    <v-card-title class="py-2">地図プレビュー作成</v-card-title>
                    <v-card-text class="pane-body">
                      <v-select class="no-stretch" v-model="s_zahyokei"
                                :items="crsChoices" item-title="title" item-value="value"
                                label="公共座標系" variant="outlined" density="compact" :disabled="disableAll" />
                      <v-btn :disabled="disableAll" @click="renderPreviewOnMap">地図プレビュー作成</v-btn>
                    </v-card-text>
                  </v-card>
                </div>

                <div v-else>
                  <div class="preview-grid">
                    <v-card class="oh3-accent-border pane tall" variant="outlined">
                      <v-card-title class="py-2">地図プレビュー（MapLibre × 地理院タイル・淡色）</v-card-title>
                      <v-card-text class="pane-body"><div ref="maplibreEl" class="maplibre-host"></div></v-card-text>
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
              <div class="pa-3 step-host">
                <div v-if="points.length">
                  <v-alert type="info" color="primary" variant="tonal" class="mb-2">{{ points.length }} 点を処理します。</v-alert>
                  <div class="d-flex align-center gap-3 mb-2">
                    <v-text-field
                        v-model="importName"
                        label="OH3へ取り込む名前"
                        :disabled="disableAll"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        style="max-width:420px"
                    />
                  </div>
                  <div class="d-flex align-center gap-3">
                    <v-btn variant="outlined" prepend-icon="mdi-download" :disabled="disableAll" @click="downloadSIMA">SIMAファイルダウンロード</v-btn>
                    <v-btn color="primary" :loading="busy" :disabled="disableAll" prepend-icon="mdi-database-import" @click="commit">取り込み実行</v-btn>
                  </div>
                  <div v-if="simaInfo.name" class="text-caption text-medium-emphasis mt-2">生成: {{ simaInfo.name }}（{{ simaInfo.size }} bytes）</div>
                </div>
                <div class="text-medium-emphasis" v-else>先に再構成してください。</div>
              </div>
            </v-stepper-window-item>
          </v-stepper-window>

          <v-stepper-actions>
            <template #prev>
              <v-btn size="x-large" class="oh3-action-btn" variant="elevated" color="secondary" :disabled="step<=1 || disableAll" @click="step--">戻る</v-btn>
            </template>
            <template #next>
              <v-btn size="x-large" class="oh3-action-btn" variant="elevated" color="primary" :disabled="disableAll || (step===1 && !file)" @click="goNext">次へ</v-btn>
            </template>
          </v-stepper-actions>
        </v-stepper>
      </div>

      <v-overlay :model-value="transitioning" persistent contained class="lock-overlay">
        <v-progress-circular indeterminate color="primary" size="48" />
      </v-overlay>
    </v-card>
  </v-dialog>
</template>

<script>
import { downloadTextFile, zahyokei } from '@/js/downLoad'
import { mapState } from 'vuex'
import proj4 from 'proj4'

function fixCell (val) {
  if (val == null) return ''
  let s = String(val).normalize('NFKC')
  s = s.replace(/[，,]/g, '')
  s = s.replace(/[−－—–]/g, '-')            // マイナス統一
  s = s.replace(/(^|\s)\.\s*(\d)/g, '$10.$2')
  s = s.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
  s = s.replace(/-\s+(\d)/g, '-$1')
  s = s.replace(/(\d)\s+(\d{3})(?!\d)/g, '$1$2')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

const minusAndDashes = /[\u2212\uFF0D\u00A0\u2003\u2002\u3000\u2500\u2501\u2010\u2013\u2014]/g

export default {
  name: 'KyusekiImportDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    jobId: { type: [String, Number], default: null },
    startXY: { type: Object, default: null }
  },
  emits: ['update:modelValue', 'imported'],
  data () {
    return {
      internal: this.modelValue,
      step: 1, busy: false,

      file: null, previewUrl: '', isImage: true,
      importName: '',

      ocrError: '', rawTable: { headers: [], rows: [] },

      columnRoles: [],
      roleOptions: [
        { title: '未使用', value: null },
        { title: '点名（文字）', value: 'label' },
        { title: 'X', value: 'x' }, { title: 'Y', value: 'y' },
      ],

      points: [], area: { area: 0, signed: 0 }, closure: { dx: 0, dy: 0, len: 0 }, closureThreshold: 0.02,

      crsChoices: [
        'WGS84',
        '公共座標1系','公共座標2系','公共座標3系',
        '公共座標4系','公共座標5系','公共座標6系',
        '公共座標7系','公共座標8系','公共座標9系',
        '公共座標10系','公共座標11系','公共座標12系',
        '公共座標13系','公共座標14系','公共座標15系',
        '公共座標16系','公共座標17系','公共座標18系','公共座標19系',
      ],

      buildError: '', simaInfo: { name:'', size:0 }, lastSimaText: '',
      map: null,

      suspect: { x: new Set(), y: new Set() },
      edits: new Map(),
      lastEdited: { row:null, field:null, at:0 },

      history: [], historyPtr: -1,

      ro: null, roBusy: false,
      tableMaxPx: 640,
      transitioning: false, compactFlow: true, showStep2Header: true,

      colw: { label: 44, x: 80, y: 80 },
      colResize: { active:false, key:null, startX:0, startW:0 }
    }
  },
  computed: {
    ...mapState(['mapReady']),
    s_zahyokei: {
      get() { return this.$store.state.zahyokei },
      set(value) { this.$store.state.zahyokei = value }
    },
    canUndo () { return this.historyPtr >= 0 },
    disableAll () { return this.busy || this.transitioning }
  },
  watch: {
    modelValue (v) { this.internal = v },
    internal (v) {
      this.$emit('update:modelValue', v)
      if (v) {
        this.$nextTick(this.recalcTableMax)
      } else {
        // ← ここを追加：ダイアログが閉じられた瞬間に全データを捨てる
        this.resetAll()
      }
    },
    step () {
      this.$nextTick(this.recalcTableMax)
      if (this.step===4) {
        this.$nextTick(async () => {
          try {
            await this.initMapLibre()
            this.loadColWidths()
            this.installColResizer()
            this.autoMapRoles()
            this.rebuild()
            await this.ensureMapLoaded()
            await this.renderPreviewOnMap()
          } catch (e) { console.error(e) }
        })
      }
    }
  },
  mounted () {
    if (this.step===4) { this.initMapLibre() }
    this.installGlobalUndo()
    this.$nextTick(this.recalcTableMax)
  },
  unmounted () {
    this.uninstallGlobalUndo()
    if (this.ro) { this.ro.disconnect(); this.ro=null }
    window.removeEventListener('resize', this.recalcTableMax)
  },
  methods: {
    // 追加：ダイアログ内の一切の作業状態を破棄
    resetAll () {
      try {
        // Undo/キー監視解除
        this.uninstallGlobalUndo?.()

        // MapLibre破棄
        if (this.map && this.map.remove) { try { this.map.remove() } catch(e){} }
        this.map = null

        // blob URL解放
        if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(this.previewUrl) } catch(e){}
        }

        // ResizeObserver解除
        if (this.ro) { try { this.ro.disconnect() } catch(e){} this.ro = null }
        window.removeEventListener?.('resize', this.recalcTableMax)

        // 進行状態・フラグ
        this.step = 1
        this.busy = false
        this.transitioning = false
        this.compactFlow = true
        this.showStep2Header = true

        // 入力ファイル等
        this.file = null
        this.previewUrl = ''
        this.isImage = true
        this.importName = ''

        // OCRテーブル
        this.ocrError = ''
        this.rawTable = { headers: [], rows: [] }
        this.columnRoles = []

        // 再構成データ
        this.points = []
        this.area = { area: 0, signed: 0 }
        this.closure = { dx: 0, dy: 0, len: 0 }
        this.buildError = ''
        this.simaInfo = { name: '', size: 0 }
        this.lastSimaText = ''

        // 編集フラグ／履歴
        this.suspect = { x: new Set(), y: new Set() }
        this.edits = new Map()
        this.lastEdited = { row: null, field: null, at: 0 }
        this.history = []
        this.historyPtr = -1

        // テーブル高さ（再計算は再オープン時に）
        this.tableMaxPx = 640

        // 列幅はユーザー設定なので保持（消したいならここで localStorage.removeItem('oh3_coords_colw_v1')）
        this.colResize = { active:false, key:null, startX:0, startW:0 }
      } catch (e) {
        console.warn('resetAll failed', e)
      }
    },

    // 置き換え：×ボタン等で呼ばれたら「閉じる＋全消去」
    close () {
      // 先に非表示にしてから全消去（描画コスト低）
      this.internal = false
      // watcher でも resetAll を呼ぶが、明示で二重呼びでも安全
      this.resetAll()
    },
    /* ===== 高さ再計算（親いっぱい・上限付き） ===== */
    findVisibleStepHost () {
      const root = this.$refs.dialogRoot?.$el || this.$refs.dialogRoot
      if (!root) return null
      const el = root.querySelector('.v-stepper-window-item[aria-hidden="false"] .step-host')
      return el || root.querySelector('.step-host')
    },
    recalcTableMax () {
      if (this.roBusy) return
      this.roBusy = true
      const rootEl = this.$refs.dialogRoot?.$el || this.$refs.dialogRoot
      const host = this.findVisibleStepHost()
      if (!rootEl || !host) { this.roBusy = false; return }

      const updateVar = () => {
        const hostRect = host.getBoundingClientRect()
        const hostH = hostRect.height
        const tall = Math.min(900, Math.max(560, Math.floor(hostH - 8)))
        rootEl.style.setProperty('--tall-h', String(tall) + 'px')
        const tablePx = Math.max(300, tall - 80)
        this.tableMaxPx = tablePx
        rootEl.style.setProperty('--oh3-table-h', String(tablePx) + 'px')
        this.roBusy = false
      }
      requestAnimationFrame(updateVar)

      if (!this.ro) {
        this.ro = new ResizeObserver(() => { this.recalcTableMax() })
        this.ro.observe(host)
        this.ro.observe(rootEl)
        window.addEventListener('resize', this.recalcTableMax, { passive:true })
      }
    },

    /* ===== Undo ===== */
    installGlobalUndo () {
      this._undoHandler = (e) => {
        if (!this.internal) return
        if (e.isComposing) return
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault(); this.undo()
        }
      }
      window.addEventListener('keydown', this._undoHandler, true)
    },
    uninstallGlobalUndo () { if (this._undoHandler) window.removeEventListener('keydown', this._undoHandler, true); this._undoHandler = null },
    onLocalKeyDown (e) { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo() } },

    /* ===== OCR後のクリーンアップ ===== */
    postCleanTable () {
      if (!this.rawTable?.rows) return
      const headers = (this.rawTable.headers || []).map(fixCell)
      const rowsRaw = (this.rawTable.rows || []).map(r => (r || []).map(fixCell))
      const nonEmptyRows = rowsRaw.filter(r => r.some(c => c && c.length))
      const colCount = Math.max(headers.length, ...nonEmptyRows.map(r => r.length))
      const rows = nonEmptyRows.map(r => { const a = r.slice(0, colCount); while (a.length < colCount) a.push(''); return a })
      while (headers.length < colCount) headers.push('')
      const keepCols = []
      for (let i=0;i<colCount;i++){
        const filled = rows.filter(r => (r[i]||'').length>0).length
        keepCols.push(filled >= Math.ceil(rows.length*0.1))
      }
      const headers2 = headers.filter((_,i)=>keepCols[i])
      const rows2 = rows.map(r => r.filter((_,i)=>keepCols[i]))
      this.rawTable = { headers: headers2, rows: rows2 }
    },

    /* ===== 進む ===== */
    async goNext () {
      if (this.step === 1) {
        if (!this.file) return
        if (this.compactFlow) {
          this.transitioning = true
          this.ocrError = ''
          this.showStep2Header = true
          this.step = 2
          await this.$nextTick()
          try {
            const table = await this.runCloudOCR(this.file)
            if (!table?.rows?.length) throw new Error('表が検出できませんでした')
            this.rawTable = table
            this.postCleanTable()
            this.autoMapRoles()
            this.step = 3
          } catch (e) {
            console.error(e); this.ocrError = String(e?.message || e)
          } finally {
            this.transitioning = false
            this.$nextTick(this.recalcTableMax)
          }
          return
        } else { this.step = 2; return }
      }
      if (this.step === 2) { if (this.rawTable.headers.length) { this.step = 3; return } return }
      if (this.step === 3) { this.rebuild(); this.step = 4; return }
      if (this.step === 4) { this.step = 5; return }
      if (this.step === 5) { this.close(); return }
    },

    /* ===== OCR 実行 ===== */
    async doOCR () {
      if (!this.file) return
      this.ocrError=''; this.busy=true
      try {
        const table = await this.runCloudOCR(this.file)
        if (!table?.rows?.length) throw new Error('表が検出できませんでした')
        this.rawTable = table
        this.postCleanTable()
        this.autoMapRoles()
        if (this.step<3) this.step=3
      } catch (e) { console.error(e); this.ocrError=String(e.message||e) }
      finally { this.busy=false }
    },
    async runCloudOCR (file) {
      const f = Array.isArray(file) ? file[0] : file
      if (!f) throw new Error('ファイルが選択されていません')
      const base = import.meta?.env?.VITE_DOCAI_NODE_URL || 'https://oh3-docai-api-node-531336516229.asia-northeast1.run.app'
      const form = new FormData(); form.append('file', f, f?.name || 'upload')
      const url = base + '/api/docai_form_parser'
      const r = await fetch(url, { method: 'POST', body: form })
      const text = await r.text(); let json; try { json = JSON.parse(text) } catch { json = null }
      if (!r.ok) throw new Error((json && json.error) || (json && json.detail) || ('HTTP ' + String(r.status)))
      if (!json || !json.ok) throw new Error((json && json.error) || 'Cloud OCR failed')
      return { headers: json.headers || [], rows: json.rows || [], meta: json.meta || null }
    },

    /* ===== 列マッピング ===== */
    normHeader (s) { if (!s) return ''; return s.normalize('NFKC').replace(/\s+/g,'').replace(/[()【】（）:：ー_−－\u00A0\u2003\u2002\u3000─━‐–—-]/g,'').replace(/\[|\]/g,'').toLowerCase() },
    guessRoleFromHeader (h) {
      const t = (h||'').trim().toLowerCase()
      if (/^(x|xn)\b/.test(t) || /(x座標|東距|東\b|e\b)/.test(t)) return 'x'
      if (/^(y|yn)\b/.test(t) || /(y座標|北距|北\b|n\b)/.test(t)) return 'y'
      if (/(^no\b|点番|番号|^番$|^n0$|^№$)/i.test(t)) return 'label'
      if (/点名|標識|名称/.test(t)) return 'label'
      return null
    },
    autoMapRoles () {
      this.columnRoles = this.rawTable.headers.map(h => this.guessRoleFromHeader(h))
      this.rawTable.headers.forEach((h, i) => {
        const s = String(h || '').toLowerCase()
        if (/[+/*()]/.test(s) || /yn\+?1.*yn-?1/.test(s) || /合計|地積/.test(s)) this.columnRoles[i] = null
      })
    },

    /* ===== Undo ===== */
    onEditKeyDown (e) { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo() } },
    pushHistory (rec) { if (this.historyPtr < this.history.length - 1) this.history = this.history.slice(0, this.historyPtr + 1); this.history.push(rec); this.historyPtr = this.history.length - 1 },
    undo () {
      if (this.historyPtr < 0) return
      const rec = this.history[this.historyPtr]; this.historyPtr--
      if (rec.type === 'raw') {
        if (this.rawTable?.rows?.[rec.ri]) this.rawTable.rows[rec.ri][rec.ci] = rec.prev
        const roles = this.mapColumnsObject()
        if (rec.ci === roles.x || rec.ci === roles.y || rec.ci === roles.label) this.rebuild()
      } else if (rec.type === 'field') {
        const roles = this.mapColumnsObject(); const row = this.rawTable.rows[rec.ri]; if (!row) return
        if (rec.field === 'label' && roles.label != null) row[roles.label] = rec.prev
        if (rec.field === 'x' && roles.x != null) row[roles.x] = rec.prev
        if (rec.field === 'y' && roles.y != null) row[roles.y] = rec.prev
        this.rebuild()
      }
    },

    /* ===== points 再構成／検算 ===== */
    rebuild () {
      this.buildError=''; this.points=[]
      try {
        const rows = this.rawTable.rows || []
        const roles = this.mapColumnsObject()
        const usable = rows.map((r,ri)=>{
          const rawX = (roles.x!=null) ? r[roles.x] : ''
          const rawY = (roles.y!=null) ? r[roles.y] : ''
          const x = this.parseNumber(rawX)
          const y = this.parseNumber(rawY)
          const label = (roles.label!=null) ? String(r[roles.label]||'').trim() : undefined
          return { ri, rawX, rawY, x, y, label }
        }).filter(o => Number.isFinite(o.x) && Number.isFinite(o.y))
        if (usable.length < 3) throw new Error('数値の X/Y を持つ行が3つ未満です。列マッピングや表の行を確認してください。')

        this.points = usable.map((o,i) => ({
          x:o.x, y:o.y, rawX:o.rawX, rawY:o.rawY,
          label:o.label || String(i+1), sourceRow:o.ri
        }))

        this.area = this.shoelace(this.points)
        const a=this.points[0], b=this.points[this.points.length-1]
        const dx=b.x-a.x, dy=b.y-a.y
        this.closure = { dx, dy, len: Math.hypot(dx,dy) }

        this.markSuspects()
        if (this.map?.isStyleLoaded?.()) this.renderPreviewOnMap()
      } catch(e){ console.error(e); this.buildError=String(e.message||e) }
    },
    markSuspects () {
      this.suspect.x = new Set(); this.suspect.y = new Set()
      const n = this.points.length; if (n < 3) return
      const xs = this.points.map(p=>p.x), ys = this.points.map(p=>p.y)
      const flag = (arr) => {
        const set = new Set(), med = this.median(arr)
        const absDev = arr.map(v=>Math.abs(v - med))
        const mad = this.median(absDev) || 1e-9
        arr.forEach((v,i)=>{
          const rz = 0.6745 * Math.abs(v - med) / mad
          const digitOff = Math.abs(Math.log10(Math.abs(v)+1e-9) - Math.log10(Math.abs(med)+1e-9)) > 0.6
          if (rz > 3.5 || digitOff) set.add(i)
        }); return set
      }
      this.suspect.x = flag(xs); this.suspect.y = flag(ys)
    },

    /* ===== util ===== */
    median (a){const b=a.filter(Number.isFinite).slice().sort((x,y)=>x-y); if(!b.length)return NaN; const m=Math.floor(b.length/2); return b.length%2?b[m]:(b[m-1]+b[m])/2},
    shoelace (pts){ let s1=0,s2=0; for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length]; s1+=a.x*b.y; s2+=a.y*b.x} const signed=0.5*(s1-s2); return { area:Math.abs(signed), signed } },
    normNumberStr (s) { if (s==null) return ''; return String(s).normalize('NFKC').replace(/,/g,'').replace(/[\]|]/g,'').replace(minusAndDashes,'-').trim() },
    parseNumber (s) { const m=this.normNumberStr(String(s)).match(/-?\d+(?:\.\d+)?/); return m?parseFloat(m[0]):NaN },
    mapColumnsObject () { const o={}; this.columnRoles.forEach((r,i)=>{ if(r) o[r]=i }); return o },

    /* ===== Step4：points編集→rawTable反映 ===== */
    onCellEdit (sourceRow, field, rawVal) {
      try {
        const roles = this.mapColumnsObject()
        const row = this.rawTable.rows[sourceRow]; if (!row) return
        if (field === 'label') {
          if (roles.label == null) return
          const prev = row[roles.label]; const v = String(rawVal ?? '').trim()
          if (prev !== v) { this.pushHistory({ type:'field', ri:sourceRow, field:'label', prev, next:v }); row[roles.label] = v }
          const p = this.edits.get(sourceRow) || {}; p.label = v; this.edits.set(sourceRow, p)
        } else if (field === 'x' || field === 'y') {
          const idx = roles[field]; if (idx == null) return
          const prev = row[idx]
          const next = String(rawVal ?? '')
          if (prev !== next) {
            this.pushHistory({ type:'field', ri:sourceRow, field, prev, next })
            row[idx] = next
          }
          const p = this.edits.get(sourceRow) || {}; p[field] = next; this.edits.set(sourceRow, p)
        }
        this.lastEdited = { row: sourceRow, field, at: Date.now() }
        setTimeout(()=>{ if (this.lastEdited?.row === sourceRow && this.lastEdited?.field === field) this.lastEdited = { row:null, field:null, at:0 } }, 1000)
        this.rebuild()
      } catch (e) { console.warn('onCellEdit failed', e) }
    },
    isEdited (sourceRow) { return this.edits.has(sourceRow) },
    cellClass (ptIndex, axis) {
      const sr = this.points[ptIndex]?.sourceRow
      const edited = this.edits.has(sr)
      const pulse = (this.lastEdited.row === sr) && (this.lastEdited.field === axis || (axis==='label' && this.lastEdited.field==='label'))
      const suspectSet = axis==='x' ? this.suspect.x : axis==='y' ? this.suspect.y : new Set()
      return { 'suspect-cell': suspectSet.has(ptIndex), 'edited-cell': edited, 'just-edited': !!pulse, 'editable-cell': true }
    },

    /* ===== MapLibre ===== */
    async initMapLibre () {
      if (this.map || !this.$refs.maplibreEl) return
      const id='maplibre-css'
      if (!document.getElementById(id)) {
        const l=document.createElement('link'); l.id=id; l.rel='stylesheet'; l.href='https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css'
        document.head.appendChild(l)
      }
      const { Map } = await import('maplibre-gl')
      const style = {
        version: 8,
        sources: { 'gsi-pale': { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], tileSize: 256, attribution: '地理院タイル（淡色地図）© 国土地理院' } },
        layers: [{ id: 'gsi-pale', type: 'raster', source: 'gsi-pale' }]
      }
      this.map = new Map({ container: this.$refs.maplibreEl, style, center: [137.0, 38.0], zoom: 4.3, preserveDrawingBuffer: true })
      await this.ensureMapLoaded()
    },
    ensureMapLoaded () { if (!this.map) return Promise.resolve(); if (this.map.isStyleLoaded?.()) return Promise.resolve(); return new Promise(resolve => { this.map.once('load', () => resolve()) }) },
    async renderPreviewOnMap () {
      try {
        if (!this.map) await this.initMapLibre()
        await this.ensureMapLoaded()
        if (!this.points?.length) { this.buildError = '点データがありません。'; return }

        const kei = this.s_zahyokei || 'WGS84'
        const srcCode = (zahyokei.find(it => it.kei === kei)?.code) || 'EPSG:4326'
        const dstCode = 'EPSG:4326'

        const coordsLngLat = this.points.map(p => {
          const east = Number(p.x), north = Number(p.y)
          if (!Number.isFinite(east) || !Number.isFinite(north)) return null
          if (srcCode === 'EPSG:4326') return [east, north]
          try { const proj = proj4(srcCode, dstCode); const out = proj.forward([east, north]); return [out[0], out[1]] }
          catch { return [east, north] }
        }).filter(Boolean)

        if (coordsLngLat.length < 3) { this.buildError = 'ポリゴンを作るには3点以上が必要です。'; return }

        const ring = coordsLngLat.concat([coordsLngLat[0]])
        const featurePolygon = { type:'Feature', properties:{type:'polygon', chiban:this.extractLotFromFileName(), srcCrs:kei, srcCode}, geometry:{ type:'Polygon', coordinates:[ring] } }
        const featureVertices = coordsLngLat.map((c,i)=>({ type:'Feature', properties:{type:'vertex', idx:(i+1), label:(this.points[i] && this.points[i].label) || ''}, geometry:{ type:'Point', coordinates:c }}))
        const fc = { type:'FeatureCollection', features:[featurePolygon, ...featureVertices] }

        const srcId = 'kyuseki-preview'
        if (this.map.getSource(srcId)) this.map.getSource(srcId).setData(fc)
        else {
          this.map.addSource(srcId, { type:'geojson', data: fc })
          this.map.addLayer({ id:'kyuseki-fill', type:'fill', source:srcId, filter:['==','$type','Polygon'], paint:{'fill-color':'#088','fill-opacity':0.35} })
          this.map.addLayer({ id:'kyuseki-line', type:'line', source:srcId, filter:['==','$type','Polygon'], paint:{'line-color':'#004','line-width':2} })
          this.map.addLayer({ id:'kyuseki-vertex', type:'circle', source:srcId, filter:['==',['get','type'],'vertex'], paint:{'circle-radius':['interpolate',['linear'],['zoom'],12,2,18,5],'circle-color':'#f00','circle-stroke-width':1,'circle-stroke-color':'#fff'} })
          this.map.addLayer({ id:'kyuseki-vertex-label', type:'symbol', source:srcId, filter:['==',['get','type'],'vertex'],
            layout:{'text-field':['coalesce',['get','label'],['to-string',['get','idx']]],'text-size':12,'text-offset':[0,1.2],'text-variable-anchor':['top']},
            paint:{'text-color':'#111','text-halo-color':'rgba(255,255,255,0.85)','text-halo-width':1}, minzoom:14 })
        }

        const { LngLatBounds } = await import('maplibre-gl')
        const bounds = new LngLatBounds(); ring.forEach(function(c){ bounds.extend(c) })
        this.map.fitBounds(bounds, { padding: 24, maxZoom: 19 })
      } catch (e) {
        console.error(e)
        this.buildError = '地図プレビューの描画に失敗しました。' + (e && e.message ? (' (' + e.message + ')') : '')
      }
    },

    fmt (v) { return (v==null || Number.isNaN(v)) ? '' : Number(v).toFixed(3) },

    async onFileSelected () {
      this.previewUrl=''; this.isImage=true
      if (!this.file) return
      const f = Array.isArray(this.file)? this.file[0] : this.file
      const name = f && f.name || ''
      this.isImage = !/\.pdf$/i.test(name)
      this.previewUrl = this.isImage ? URL.createObjectURL(f) : ''
      this.importName = this.baseFileName(name)
    },

    isNumericRole (ci) { const roles = this.mapColumnsObject(); return ci === roles.x || ci === roles.y },

    /* ===== 列幅保存/復元＋ドラッグ ===== */
    loadColWidths () {
      try {
        const saved = JSON.parse(localStorage.getItem('oh3_coords_colw_v1') || '{}')
        const clamp = function(v,min,max){ return Math.min(max, Math.max(min, v|0)) }
        if (saved && typeof saved==='object') {
          this.colw.label = clamp(saved.label != null ? saved.label : this.colw.label, 32, 420)
          this.colw.x     = clamp(saved.x     != null ? saved.x     : this.colw.x,     64,  260)
          this.colw.y     = clamp(saved.y     != null ? saved.y     : this.colw.y,     64,  260)
        }
      } catch (e) {}
    },
    saveColWidths () { localStorage.setItem('oh3_coords_colw_v1', JSON.stringify(this.colw)) },
    installColResizer () {
      const host = this.$refs.dialogRoot?.$el || this.$refs.dialogRoot
      if (!host) return
      const table = host.querySelector('table.coords-table')
      if (!table) return
      const onMove = (e) => {
        if (!this.colResize.active) return
        const dx = e.clientX - this.colResize.startX
        const key = this.colResize.key
        const min = key==='label' ? 32 : 64
        const max = key==='label' ? 420 : 260
        this.colw[key] = Math.min(max, Math.max(min, this.colResize.startW + dx))
      }
      const onUp = () => {
        if (!this.colResize.active) return
        this.colResize.active = false
        window.removeEventListener('mousemove', onMove, true)
        window.removeEventListener('mouseup', onUp, true)
        this.saveColWidths()
      }
      table.querySelectorAll('.th-grip').forEach((grip) => {
        grip.onmousedown = (e) => {
          const key = grip.dataset.resize
          if (!key) return
          e.preventDefault()
          this.colResize.active = true
          this.colResize.key = key
          this.colResize.startX = e.clientX
          this.colResize.startW = this.colw[key]
          window.addEventListener('mousemove', onMove, true)
          window.addEventListener('mouseup', onUp, true)
        }
      })
    },

    /* ==== SIMA ==== */
    baseFileName (name) { return (name || '').replace(/\.[^.]+$/, '') },
    extractLotFromFileName () { try{ const f=Array.isArray(this.file)?this.file[0]:this.file; const n=f && f.name || ''; const m=String(n).match(/(\d{1,5}-\d{1,5})/); return m?m[1]:'000-0' }catch(e){return '000-0'} },
    resolveProjectName () { return this.jobId ? 'oh3-job-' + String(this.jobId) : 'open-hinata3' },
    buildSIMAContent () {
      if (!this.points.length) return ''
      const prj = this.resolveProjectName(), lot = this.extractLotFromFileName(), L = []
      L.push('G00,01,' + prj + ',')
      L.push('Z00,座標ﾃﾞｰﾀ,,'); L.push('A00,')
      this.points.forEach((p,i)=>{ const label=(p.label && String(p.label).length)?String(p.label):String(i+1)
        L.push('A01,' + String(i+1) + ',' + label + ',' + Number(p.x).toFixed(3) + ',' + Number(p.y).toFixed(3) + ',0,') })
      L.push('A99,')
      L.push('Z00,区画データ,'); L.push('D00,1,' + lot + ',1,')
      this.points.forEach((p,i)=>{ const label=(p.label && String(p.label).length)?String(p.label):String(i+1); L.push('B01,' + String(i+1) + ',' + label + ',') })
      L.push('D99,'); L.push('A99,END')
      return L.join('\n')
    },
    downloadSIMA () {
      if (!this.points.length) return
      const text=this.buildSIMAContent(); this.lastSimaText=text
      const base=(this.importName || this.baseFileName((Array.isArray(this.file)?this.file[0]:this.file)?.name || 'kyuseki')).trim() || 'kyuseki'
      const ts=new Date().toISOString().replace(/[:.]/g,'-'), name= base + '_' + ts + '.sim'
      downloadTextFile(name, text, 'shift-jis')
      let size=text.length
      try{
        if(window.Encoding){
          const u=window.Encoding.stringToCode(text); const s=window.Encoding.convert(u,'SJIS'); size=s.length
        }
      }catch(e){}
      this.simaInfo={name: name, size: size}
    },
    async commit () {
      try { this.busy = true
        const name = (this.importName || this.baseFileName((Array.isArray(this.file)?this.file[0]:this.file)?.name || 'kyuseki')).trim() || 'kyuseki'
        this.$emit('imported', { name, points: this.points.slice(), area: this.area, closure: this.closure })
      } finally { this.busy = false }
    },
  }
}
</script>

<style scoped>
/* =========================================
   KyusekiImportDialog（編集領域最大化＋上限）
   ========================================= */
.oh3-dialog{
  height:min(96vh, 980px);
  display:flex;flex-direction:column;overflow:hidden
}
.oh3-dialog > .v-card-title,.oh3-dialog > .v-divider{flex:0 0 auto}
.oh3-dialog .px-3.pt-2.pb-0{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}
.oh3-dialog .v-stepper{display:flex;flex-direction:column;height:100%;min-height:0}

/* ステッパー超コンパクト */
.big-steps :deep(.v-stepper-header){padding:4px 6px; gap:6px}
.big-steps :deep(.v-stepper-item__avatar){width:26px;height:26px;font-size:13px}
.big-steps :deep(.v-stepper-item__title){font-size:12.5px}
.big-steps :deep(.v-stepper-item__subtitle){display:none}

.oh3-dialog .v-stepper-window{flex:1 1 auto;min-height:0;overflow:hidden}

.oh3-dialog .v-stepper-actions{
  position:sticky;bottom:0;z-index:10;background:#fff;border-top:1px solid #e5e7eb;
  padding:8px 12px;display:flex;justify-content:space-between;gap:12px;
}
.oh3-action-btn{font-weight:700;min-width:140px;letter-spacing:.02em}

.step-host,.oh3-dialog .v-stepper-window-item > .pa-3{display:flex;flex-direction:column;min-height:0}
.fill-parent{flex:1 1 auto}
.flex-col{display:flex;flex-direction:column}

:deep(.v-overlay__content){ overflow:hidden !important; }
:deep(.v-card-text){ overflow:visible !important; }

:root{ --oh3-table-h: 640px; --tall-h: 640px; }

.pane{display:flex;flex-direction:column;min-height:0}
.pane .pane-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}

/* スクロール要素 */
.table-host{
  position:relative;
  flex:1 1 auto;
  min-height:180px;
  height:var(--oh3-table-h);
  max-height:var(--oh3-table-h);
  overflow:auto !important;
  -webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  scrollbar-gutter:stable both-edges;border:1px solid #e5e7eb;border-radius:8px;background:#fff;
}

/* 共通テーブル */
.oh3-simple{width:max(100%, 640px);border-collapse:collapse;table-layout:fixed;font-size:12.5px;}
.oh3-simple.auto{ table-layout:auto; }
.oh3-simple th,.oh3-simple td{ border:1px solid #ddd; white-space:nowrap; }
.oh3-simple thead th{ position:sticky; top:0; z-index:3; background:#f6f6f7; }
.oh3-simple td{ padding:0 }
.oh3-simple .cell-input{width:100%;box-sizing:border-box;padding:2px 4px;border:none;outline:none;font:inherit;background:#dbeafe;color:#0f172a;}
.oh3-simple .cell-input.num{ text-align:right }
.oh3-simple td:focus-within{ background:#bfdbfe; box-shadow:inset 0 0 0 2px #60a5fa }
.oh3-simple .cell-input:focus{ background:#bfdbfe }

/* Flags */
.suspect-cell,.suspect-cell .cell-input{ background:#ffd6d6 !important; color:#7f1d1d !important; }
.suspect-cell{ box-shadow:inset 0 0 0 2px #ff4d4f !important; }
.edited-cell{ background:#e7f6e7 !important; box-shadow:inset 0 0 0 1px #7fbf7f !important; }
.just-edited{ animation: oh3PulseEdited .9s ease-out 1; }
@keyframes oh3PulseEdited{0%{box-shadow:0 0 0 0 rgba(99,102,241,.4)}50%{box-shadow:0 0 0 8px rgba(99,102,241,0)}100%{box-shadow:0 0 0 0 rgba(99,102,241,0)}}

/* Grid */
.preview-grid{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2, calc(var(--tall-h)/2))}
.preview-grid>.tall{grid-row:1/span 2}
.maplibre-host{width:100%;height:100%;min-height:240px;border:1px solid #e2e8f0;border-radius:8px}

/* Minor UI */
:deep(.v-card-title){padding:6px 10px; flex-wrap:wrap;}
:deep(.v-card-text){padding:6px 10px}
.map-chip{border:1px dashed var(--v-theme-outline);border-radius:10px;padding:8px;min-width:180px}
.oh3-title{color:rgb(var(--v-theme-primary))}
.oh3-accent-border{border-top:3px solid rgb(var(--v-theme-primary))}
.no-stretch{align-self:flex-start;max-width:260px}
.no-stretch :deep(.v-field){height:46px}
.no-stretch :deep(.v-input){flex:0 0 auto !important}
.preview-box{width:100%;border:1px dashed var(--v-theme-outline);border-radius:8px;padding:8px;min-height:180px;display:grid;place-items:center}
.preview-img{max-width:100%;max-height:280px;object-fit:contain}
.compact-text{padding-top:4px;padding-bottom:4px}
.inline-metrics{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline}
.warn.small{font-size:12px;color:#a15d00;margin-top:6px}

/* ファイル入力（STEP1） */
.file-compact{max-width:420px}
.file-compact :deep(.v-field){height:44px}
.file-compact :deep(.v-field__input){padding-top:6px;padding-bottom:6px}

/* ★ 座標テーブルの極狭列 */
.coords-table{ table-layout:auto; }
.coords-table .col-index{ width:22px; min-width:20px; }
.coords-table .col-label{ width:44px; min-width:32px; }
.coords-table .col-num{   width:80px; min-width:64px; }

/* ドラッグ用グリップ */
.coords-table thead th{ position:relative; }
.coords-table thead th .th-grip{ position:absolute; right:-4px; top:0; bottom:0; width:8px; cursor:col-resize; background: transparent; }
.coords-table thead th .th-grip::after{ content:''; position:absolute; left:3px; top:25%; bottom:25%; width:2px; border-radius:1px; background:rgba(0,0,0,.08); }
.coords-table thead th:hover .th-grip::after{ background:rgba(0,0,0,.18); }

/* ローダ/ロック */
.loader-placeholder{border:1px dashed #e5e7eb;border-radius:8px;padding:8px}
.lock-overlay :deep(.v-overlay__content){backdrop-filter: blur(1px)}
</style>
