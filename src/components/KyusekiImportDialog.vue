<template>
  <v-dialog v-model="internal" max-width="1440" scrollable transition="dialog-bottom-transition">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2 oh3-title">
          <v-icon class="mr-2" color="primary">mdi-table-search</v-icon>
          求積表インポート（OCR）
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-divider color="primary" />

      <div class="px-4 pt-2">
        <v-stepper v-model="step" alt-labels flat color="primary" class="big-steps">
          <v-stepper-header>
            <v-stepper-item color="primary" :complete="step>1" :value="1" title="取り込み" subtitle="写真/PDF" />
            <v-divider />
            <v-stepper-item color="primary" :complete="step>2" :value="2" title="OCR" subtitle="Form Parser（Cloud）" />
            <v-divider />
            <v-stepper-item color="primary" :complete="step>3" :value="3" title="列マッピング" subtitle="X/Y/点名" />
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
              </div>
            </v-stepper-window-item>

            <!-- STEP2 -->
            <v-stepper-window-item :value="2">
              <div class="pa-4">
                <div class="d-flex align-center gap-3 mb-3">
                  <v-btn :loading="busy" @click="doOCR" prepend-icon="mdi-text-recognition" color="primary">
                    OCR 実行（Cloud）
                  </v-btn>
                  <span class="text-medium-emphasis">Google Document AI Form Parser を使用します</span>
                </div>
                <v-alert v-if="ocrError" type="error" density="comfortable" class="mb-4">{{ ocrError }}</v-alert>

                <div v-if="rawTable.headers.length" class="ocr-table">
                  <div class="text-subtitle-2 mb-2">抽出プレビュー（ヘッダは“素の値”を表示）</div>
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
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-subtitle-2">列の役割を確認/修正（点番は使わず点名に寄せる）</div>
                    <v-btn size="small" variant="text" @click="autoMapRoles" prepend-icon="mdi-magic-staff">自動マッピング</v-btn>
                  </div>

                  <div class="d-flex flex-wrap gap-3 mb-4">
                    <div v-for="(h, i) in rawTable.headers" :key="'m'+i" class="map-chip">
                      <div class="text-caption text-medium-emphasis mb-1">{{ h || '(空)' }}</div>
                      <v-select
                          class="no-stretch"
                          density="comfortable"
                          variant="outlined"
                          :items="roleOptions"
                          v-model="columnRoles[i]"
                          style="min-width:160px"
                          hide-details
                      />
                    </div>
                  </div>

                  <div class="text-caption text-medium-emphasis mb-2">サンプル行（先頭3行・確認用）</div>
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
                <div class="text-medium-emphasis" v-else>まずOCRを実行してください。</div>
              </div>
            </v-stepper-window-item>

            <!-- STEP4 -->
            <v-stepper-window-item :value="4">
              <div class="pa-4">
                <v-alert v-if="buildError" type="error" class="mb-4">{{ buildError }}</v-alert>

                <div class="preview-grid" v-if="points.length">
                  <!-- Map -->
                  <v-card class="oh3-accent-border pane tall" variant="outlined">
                    <v-card-title class="py-2">地図プレビュー</v-card-title>
                    <v-card-text class="pane-body">
                      <div ref="maplibreEl" class="maplibre-host"></div>
                      <div class="text-caption text-medium-emphasis mt-2">出典：地理院タイル（淡色）</div>
                    </v-card-text>
                  </v-card>

                  <!-- 座標プレビュー（クリック編集可） -->
                  <v-card class="oh3-accent-border pane tall" variant="outlined">
                    <v-card-title class="py-2 d-flex align-center justify-space-between">
                      <span>座標プレビュー（クリックで編集）</span>
                      <div class="text-caption text-medium-emphasis d-flex align-center" style="gap:12px;">
                        <v-chip size="small" color="warning" variant="tonal" v-if="suspect.x.size + suspect.y.size > 0">
                          外れ値候補 {{ suspect.x.size + suspect.y.size }} 箇所
                        </v-chip>
                        <span class="legend suspect"></span> 外れ値候補
                        <span class="legend edited"></span> 編集済み
                      </div>
                    </v-card-title>
                    <v-card-text class="pane-body">
                      <div class="table-fill">
                        <table class="oh3-simple editable">
                          <thead>
                          <tr>
                            <th>#</th>
                            <th>点名</th>
                            <th>X</th>
                            <th>Y</th>
                            <th style="width:24px"></th>
                          </tr>
                          </thead>
                          <tbody>
                          <tr v-for="(p,i) in points" :key="'p'+i">
                            <td>{{ i+1 }}</td>

                            <!-- label -->
                            <td :class="cellClass(i,'label')">
                              <input
                                  class="cell-input"
                                  :value="p.label ?? (i+1)"
                                  @focus="$event.target.select()"
                                  @change="onCellEdit(p.sourceRow, 'label', $event.target.value)"
                                  @keydown.enter.prevent="$event.target.blur()"
                              />
                            </td>

                            <!-- X -->
                            <td :class="cellClass(i,'x')">
                              <input
                                  class="cell-input num"
                                  :value="fmt(p.x)"
                                  inputmode="decimal"
                                  @focus="$event.target.select()"
                                  @change="onCellEdit(p.sourceRow, 'x', $event.target.value)"
                                  @keydown.enter.prevent="$event.target.blur()"
                              />
                            </td>

                            <!-- Y -->
                            <td :class="cellClass(i,'y')">
                              <input
                                  class="cell-input num"
                                  :value="fmt(p.y)"
                                  inputmode="decimal"
                                  @focus="$event.target.select()"
                                  @change="onCellEdit(p.sourceRow, 'y', $event.target.value)"
                                  @keydown.enter.prevent="$event.target.blur()"
                              />
                            </td>

                            <!-- edited flag -->
                            <td class="edited-flag">
                              <v-icon v-if="isEdited(p.sourceRow)" size="16" color="primary">mdi-pencil</v-icon>
                            </td>
                          </tr>
                          </tbody>
                        </table>
                      </div>
                    </v-card-text>
                  </v-card>

                  <!-- 検算 -->
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

                  <!-- 座標系選択 -->
                  <v-card class="" variant="outlined">
                    <v-card-title class="py-2">地図プレビュー作成</v-card-title>
                    <v-card-text class="pane-body">
                      <v-select
                          class="no-stretch"
                          v-model="s_zahyokei"
                          :items="crsChoices"
                          item-title="title"
                          item-value="value"
                          label="公共座標系"
                          variant="outlined"
                          density="compact"
                      />
                      <v-btn @click="renderPreviewOnMap">地図プレビュー作成</v-btn>
                    </v-card-text>
                  </v-card>
                </div>

                <div v-else>
                  <div class="preview-grid">
                    <v-card class="oh3-accent-border pane tall" variant="outlined">
                      <v-card-title class="py-2">地図プレビュー（MapLibre × 地理院タイル・淡色）</v-card-title>
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
                  <div v-if="simaInfo.name" class="text-caption text-medium-emphasis mt-2">
                    生成: {{ simaInfo.name }}（{{ simaInfo.size }} bytes）
                  </div>
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
import { downloadTextFile, zahyokei } from '@/js/downLoad'
import { mapState } from 'vuex'
import proj4 from 'proj4'

function fixCell (val) {
  if (val == null) return ''
  let s = String(val).normalize('NFKC')
  s = s.replace(/[，,]/g, '')
  s = s.replace(/[−－—–]/g, '-')            // マイナス統一
  s = s.replace(/(^|\s)\.\s*(\d)/g, '$10.$2') // ". 123"→"0.123"
  s = s.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2') // "135669 . 231"→"135669.231"
  s = s.replace(/-\s+(\d)/g, '-$1')           // "- 6905"→"-6905"
  s = s.replace(/(\d)\s+(\d{3})(?!\d)/g, '$1$2') // "69054. 320"→"69054.320"
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

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

      ocrError: '', rawTable: { headers: [], rows: [] },

      columnRoles: [],
      // 役割は X / Y / 点名 のみ（点番は廃止）
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
    }
  },
  computed: {
    ...mapState(['mapReady']),
    s_zahyokei: {
      get() { return this.$store.state.zahyokei },
      set(value) { this.$store.state.zahyokei = value }
    },
  },
  watch: {
    modelValue (v) { this.internal = v },
    internal (v) { this.$emit('update:modelValue', v) },
    step (v) { if (v===4) this.$nextTick(()=>this.initMapLibre()) }
  },
  mounted () { if (this.step===4) this.initMapLibre() },
  methods: {
    /* DocAI→受領後の表クリーニング（ヘッダ名は“素のまま”保持） */
    postCleanTable () {
      if (!this.rawTable?.rows) return
      const headers = (this.rawTable.headers || []).map(fixCell)        // ← 表示は素のまま（整形のみ）
      const rowsRaw = (this.rawTable.rows || []).map(r => (r || []).map(fixCell))

      // 空行・全空列を軽く整理（ヘッダ名称は変えない）
      const nonEmptyRows = rowsRaw.filter(r => r.some(c => c && c.length))
      const colCount = Math.max(headers.length, ...nonEmptyRows.map(r => r.length))
      const rows = nonEmptyRows.map(r => {
        const a = r.slice(0, colCount)
        while (a.length < colCount) a.push('')
        return a
      })
      while (headers.length < colCount) headers.push('')

      // ほぼ空の列を落とす（本文の9割が空）
      const keepCols = []
      for (let i=0;i<colCount;i++){
        const filled = rows.filter(r => (r[i]||'').length>0).length
        keepCols.push(filled >= Math.ceil(rows.length*0.1))
      }
      const headers2 = headers.filter((_,i)=>keepCols[i])
      const rows2 = rows.map(r => r.filter((_,i)=>keepCols[i]))

      this.rawTable = { headers: headers2, rows: rows2 } // ← リネームなし！
    },

    /* ==== OCR ==== */
    async doOCR () {
      if (!this.file) return
      this.ocrError=''; this.busy=true
      try {
        const table = await this.runCloudOCR(this.file)
        if (!table?.rows?.length) throw new Error('表が検出できませんでした')
        this.rawTable = table

        // 表ゆがみ補正（ヘッダは素のまま）
        this.postCleanTable()
        // 自動マッピング初期値
        this.autoMapRoles()

        if (this.step<3) this.step=3
      } catch (e) {
        console.error(e); this.ocrError=String(e.message||e)
      } finally { this.busy=false }
    },

    // Node 版
    async runCloudOCR (file) {
      const f = Array.isArray(file) ? file[0] : file;
      if (!f) throw new Error('ファイルが選択されていません');

      const base =
          import.meta?.env?.VITE_DOCAI_NODE_URL
          || 'https://oh3-docai-api-node-531336516229.asia-northeast1.run.app';

      const form = new FormData();
      form.append('file', f, f?.name || 'upload');

      const url = `${base}/api/docai_form_parser`;
      const r = await fetch(url, { method: 'POST', body: form });

      const text = await r.text();
      let json; try { json = JSON.parse(text); } catch { json = null; }
      if (!r.ok) throw new Error(json?.error || json?.detail || `HTTP ${r.status}`);
      if (!json?.ok) throw new Error(json?.error || 'Cloud OCR failed');
      return { headers: json.headers || [], rows: json.rows || [], meta: json.meta || null };
    },

    /* ==== 列マッピング ==== */
    normHeader (s) {
      if (!s) return ''
      return s.normalize('NFKC').replace(/\s+/g,'')
          .replace(/[()【】（）:：ー_−－\u00A0\u2003\u2002\u3000─━‐–—-]/g,'')
          .replace(/\[/g,'').replace(/\]/g,'')
          .toLowerCase()
    },
    // 点番は「点名」に寄せる（idx は使わない）
    guessRoleFromHeader (h) {
      const H = this.normHeader(h), trimmed = (h||'').trim().toLowerCase()
      // X / Y の素直な判定
      if (/^(x|xn)\b/.test(trimmed) || /(x座標|東距|東\b|e\b)/.test(trimmed)) return 'x'
      if (/^(y|yn)\b/.test(trimmed) || /(y座標|北距|北\b|n\b)/.test(trimmed)) return 'y'
      // 点番/番号/NOは点名へ寄せる
      if (/(^no\b|点番|番号|^番$|^n0$|^№$)/i.test(trimmed)) return 'label'
      // 点名らしいキーワード
      if (/点名|標識|名称/.test(trimmed)) return 'label'
      return null
    },

    autoMapRoles () {
      // 見出しから役割推定。式/集計っぽい列は未使用。
      this.columnRoles = this.rawTable.headers.map(h => this.guessRoleFromHeader(h))
      this.rawTable.headers.forEach((h, i) => {
        const s = String(h || '').toLowerCase()
        if (/[+/*()]/.test(s) || /yn\+?1.*yn-?1/.test(s) || /合計|地積/.test(s)) {
          this.columnRoles[i] = null
        }
      })
    },

    normNumberStr (s) {
      if (s==null) return ''
      return String(s).normalize('NFKC')
          .replace(/,/g,'')
          .replace(/[\]|]/g,'')
          .replace(/[−－\u00A0\u2003\u2002\u3000─━‐–—]/g,'-')
          .trim()
    },
    parseNumber (s) {
      const m=this.normNumberStr(String(s)).match(/-?\d+(?:\.\d+)?/); return m?parseFloat(m[0]):NaN
    },

    mapColumnsObject () { const o={}; this.columnRoles.forEach((r,i)=>{ if(r) o[r]=i }); return o },

    /* === 表→points 構成（sourceRow を保持） === */
    rebuild () {
      this.buildError=''; this.points=[]
      try {
        const rows = this.rawTable.rows
        const roles = this.mapColumnsObject()

        const usable = rows.map((r,ri)=>{
          const x = (roles.x!=null) ? this.parseNumber(r[roles.x]) : NaN
          const y = (roles.y!=null) ? this.parseNumber(r[roles.y]) : NaN
          const label = (roles.label!=null) ? String(r[roles.label]||'').trim() : undefined
          return { ri, x, y, label }
        }).filter(o => Number.isFinite(o.x) && Number.isFinite(o.y))

        if (usable.length < 3) throw new Error('数値の X/Y を持つ行が3つ未満です。列マッピングや表の行を確認してください。')

        this.points = usable.map((o,i) => ({
          x:o.x, y:o.y, label:o.label || String(i+1), sourceRow:o.ri
        }))

        // 面積と閉合
        this.area = this.shoelace(this.points)
        const a=this.points[0], b=this.points[this.points.length-1]
        const dx=b.x-a.x, dy=b.y-a.y
        this.closure = { dx, dy, len: Math.hypot(dx,dy) }

        // 外れ値ハイライト
        this.markSuspects()
        // 地図も更新（既に表示済みなら）
        if (this.map) this.renderPreviewOnMap()
      } catch(e){ console.error(e); this.buildError=String(e.message||e) }
    },

    /* === 外れ値マーキング（強化版） === */
    markSuspects () {
      this.suspect.x = new Set()
      this.suspect.y = new Set()
      const n = this.points.length
      if (n < 3) return

      const xs = this.points.map(p=>p.x)
      const ys = this.points.map(p=>p.y)

      const flagByRules = (arr) => {
        const set = new Set()

        // (1) ロバストZ（中央値/MAD）: 3.5超で外れ候補
        const med = this.median(arr)
        const absDev = arr.map(v=>Math.abs(v - med))
        const mad = this.median(absDev) || 1e-9
        arr.forEach((v,i)=>{
          const rz = 0.6745 * Math.abs(v - med) / mad
          if (rz > 3.5) set.add(i)
        })

        // (2) 桁ズレ（対数差）: 0.6桁超（約×4以上）
        arr.forEach((v,i)=>{
          const digitOff = Math.abs(Math.log10(Math.abs(v)+1e-9) - Math.log10(Math.abs(med)+1e-9))
          if (digitOff > 0.6) set.add(i)
        })

        // (3) 近傍ジャンプ: 差分のロバストZが3.5超
        if (arr.length >= 4) {
          const diffs = []
          for (let i=1;i<n;i++) diffs.push(arr[i]-arr[i-1])
          const dMed = this.median(diffs)
          const dMad = this.median(diffs.map(d=>Math.abs(d-dMed))) || 1e-9
          const diffZ = (i) => 0.6745 * Math.abs((arr[i]-arr[i-1]) - dMed) / dMad
          for (let i=1;i<n;i++){
            if (diffZ(i) > 3.5) { set.add(i); set.add(i-1) }
          }
        }

        // (4) 1/100〜100倍レンジ外
        arr.forEach((v,i)=>{
          const r = Math.abs(v)/(Math.abs(med)+1e-9)
          if (r < 0.01 || r > 100) set.add(i)
        })
        return set
      }

      this.suspect.x = flagByRules(xs)
      this.suspect.y = flagByRules(ys)
    },

    median (a){const b=a.filter(Number.isFinite).slice().sort((x,y)=>x-y); if(!b.length)return NaN; const m=Math.floor(b.length/2); return b.length%2?b[m]:(b[m-1]+b[m])/2},

    shoelace (pts){ let s1=0,s2=0; for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length]; s1+=a.x*b.y; s2+=a.y*b.x} const signed=0.5*(s1-s2); return { area:Math.abs(signed), signed } },

    extractLotFromFileName (){
      try{
        const f=Array.isArray(this.file)?this.file[0]:this.file
        const name=f?.name||''
        const m=String(name).match(/(\d{1,5}-\d{1,5})/)
        return m?m[1]:'000-0'
      }catch{return '000-0'}
    },
    resolveProjectName () { return this.jobId ? `oh3-job-${this.jobId}` : 'open-hinata3' },

    buildSIMAContent (){
      if(!this.points.length) return ''
      const prj=this.resolveProjectName(), lot=this.extractLotFromFileName(), L=[]
      L.push(`G00,01,${prj},`)
      L.push('Z00,座標ﾃﾞｰﾀ,,'); L.push('A00,')
      this.points.forEach((p,i)=>{ const label=(p.label&&String(p.label).length)?String(p.label):String(i+1)
        L.push(`A01,${i+1},${label},${Number(p.x).toFixed(3)},${Number(p.y).toFixed(3)},0,`) })
      L.push('A99,')
      L.push('Z00,区画データ,'); L.push(`D00,1,${lot},1,`)
      this.points.forEach((p,i)=>{ const label=(p.label&&String(p.label).length)?String(p.label):String(i+1); L.push(`B01,${i+1},${label},`) })
      L.push('D99,'); L.push('A99,END')
      return L.join('\n')
    },

    downloadSIMA (){
      if(!this.points.length) return
      const text=this.buildSIMAContent(); this.lastSimaText=text
      const ts=new Date().toISOString().replace(/[:.]/g,'-'), name=`kyuseki_${ts}.sim`
      downloadTextFile(name, text, 'shift-jis')
      let size=text.length
      try{
        if(window.Encoding){
          const u=window.Encoding.stringToCode(text); const s=window.Encoding.convert(u,'SJIS'); size=s.length
        }
      }catch{}
      this.simaInfo={name, size}
    },

    async commit () {
      this.$emit('imported', { count:this.points.length, crs:this.crs, area:this.area.area, sim:!!this.simaInfo.name })
    },

    /* === セル編集：rawTable をバックパッチ → rebuild → 地図更新 === */
    onCellEdit (sourceRow, field, rawVal) {
      try {
        const roles = this.mapColumnsObject()
        const row = this.rawTable.rows[sourceRow]
        if (!row) return

        if (field === 'label') {
          if (roles.label == null) return
          const v = String(rawVal ?? '').trim()
          row[roles.label] = v
          const prev = this.edits.get(sourceRow) || {}
          prev.label = v
          this.edits.set(sourceRow, prev)
        } else if (field === 'x' || field === 'y') {
          const idx = roles[field]
          if (idx == null) return
          const s = fixCell(rawVal)
          const num = this.parseNumber(s)
          if (!Number.isFinite(num)) return // 無効は破棄
          row[idx] = Number(num).toFixed(3)
          const prev = this.edits.get(sourceRow) || {}
          prev[field] = row[idx]
          this.edits.set(sourceRow, prev)
        }

        // 編集パルス
        this.lastEdited = { row: sourceRow, field, at: Date.now() }
        setTimeout(()=>{
          if (this.lastEdited?.row === sourceRow && this.lastEdited?.field === field) {
            this.lastEdited = { row:null, field:null, at:0 }
          }
        }, 1200)

        // 再構成
        this.rebuild()
      } catch (e) {
        console.warn('onCellEdit failed', e)
      }
    },

    isEdited (sourceRow) { return this.edits.has(sourceRow) },

    cellClass (ptIndex, axis) {
      const sr = this.points[ptIndex]?.sourceRow
      const edited = this.edits.has(sr)
      const pulse = (this.lastEdited.row === sr) && (this.lastEdited.field === axis || (axis==='label' && this.lastEdited.field==='label'))
      const s = axis==='label' ? new Set() : (axis === 'x' ? this.suspect.x : this.suspect.y)
      return {
        'suspect-cell': s.has(ptIndex),
        'edited-cell': edited,
        'just-edited': !!pulse
      }
    },

    /* MapLibre 初期化（地理院タイル：淡色） */
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
        sources: {
          'gsi-pale': {
            type: 'raster',
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '地理院タイル（淡色地図）© 国土地理院'
          }
        },
        layers: [{ id: 'gsi-pale', type: 'raster', source: 'gsi-pale' }]
      }

      this.map = new Map({
        container: this.$refs.maplibreEl,
        style,
        center: [137.0, 38.0],
        zoom: 4.3,
        preserveDrawingBuffer: true
      })
    },

    async renderPreviewOnMap () {
      try {
        if (!this.map) await this.initMapLibre()
        if (!this.points?.length) { this.buildError = '点データがありません。'; return }

        const kei = this.s_zahyokei || 'WGS84'
        const srcCode = (zahyokei.find(it => it.kei === kei)?.code) || 'EPSG:4326'
        const dstCode = 'EPSG:4326'

        const coordsLngLat = this.points.map(p => {
          const east = Number(p.x), north = Number(p.y)
          if (!Number.isFinite(east) || !Number.isFinite(north)) return null
          if (srcCode === 'EPSG:4326') return [east, north]
          try {
            const [lon, lat] = proj4(srcCode, dstCode, [east, north])
            return [lon, lat]
          } catch (e) { console.warn('proj4変換失敗', e); return [east, north] }
        }).filter(Boolean)

        if (coordsLngLat.length < 3) { this.buildError = 'ポリゴンを作るには3点以上が必要です。'; return }

        const ring = [...coordsLngLat, coordsLngLat[0]]
        const featurePolygon = {
          type: 'Feature',
          properties: { type: 'polygon', chiban: this.extractLotFromFileName(), srcCrs: kei, srcCode },
          geometry: { type: 'Polygon', coordinates: [ring] }
        }
        const featureVertices = coordsLngLat.map((c,i) => ({
          type: 'Feature',
          properties: { type: 'vertex', idx: (i+1), label: (this.points[i]?.label ?? '') },
          geometry: { type: 'Point', coordinates: c }
        }))
        const fc = { type: 'FeatureCollection', features: [featurePolygon, ...featureVertices] }

        const srcId = 'kyuseki-preview'
        if (this.map.getSource(srcId)) {
          this.map.getSource(srcId).setData(fc)
        } else {
          this.map.addSource(srcId, { type: 'geojson', data: fc })
          this.map.addLayer({ id: 'kyuseki-fill', type: 'fill', source: srcId, filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#088', 'fill-opacity': 0.35 } })
          this.map.addLayer({ id: 'kyuseki-line', type: 'line', source: srcId, filter: ['==', '$type', 'Polygon'], paint: { 'line-color': '#004', 'line-width': 2 } })
          this.map.addLayer({
            id: 'kyuseki-vertex', type: 'circle', source: srcId,
            filter: ['==', ['get','type'], 'vertex'],
            paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 12, 2, 18, 5], 'circle-color': '#f00', 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' }
          })
          this.map.addLayer({
            id: 'kyuseki-vertex-label', type: 'symbol', source: srcId,
            filter: ['==', ['get','type'], 'vertex'],
            layout: { 'text-field': ['coalesce', ['get','label'], ['to-string', ['get','idx']]], 'text-size': 12, 'text-offset': [0, 1.2], 'text-variable-anchor': ['top'] },
            paint: { 'text-color': '#111', 'text-halo-color': 'rgba(255,255,255,0.85)', 'text-halo-width': 1 },
            minzoom: 14
          })
        }

        const { LngLatBounds } = await import('maplibre-gl')
        const bounds = new LngLatBounds(); ring.forEach(c => bounds.extend(c))
        this.map.fitBounds(bounds, { padding: 24, maxZoom: 19 })
      } catch (e) {
        console.error(e)
        this.buildError = '地図プレビューの描画に失敗しました。' + (e?.message ? ` (${e.message})` : '')
      }
    },

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
  }
}
</script>

<style scoped>
.preview-box{width:100%;border:1px dashed var(--v-theme-outline);border-radius:8px;padding:8px;min-height:180px;display:grid;place-items:center}
.preview-img{max-width:100%;max-height:280px;object-fit:contain}
.ocr-table{border:1px solid var(--v-theme-outline-variant);border-radius:8px;padding:8px}

/* ステッパーの番号を少し大きく */
.big-steps :deep(.v-stepper-item__avatar){ width:36px;height:36px;font-size:16px; }

:root{ --tall-h: 300px; }
.pane{display:flex;flex-direction:column;box-sizing:border-box;min-height:0}
.pane-body{flex:1;display:flex;flex-direction:column;min-height:0}

.preview-grid{
  display:grid;gap:16px;
  grid-template-columns:repeat(3,minmax(0,1fr));
  grid-template-rows:repeat(2, calc(var(--tall-h)/2));
}
.preview-grid > .tall{ grid-row: 1 / span 2; height:auto; }
.preview-grid > .calc-pane{ grid-column:3; grid-row:1; height:auto; }
.preview-grid > .crs-pane { grid-column:3; grid-row:2; height:auto; }

:deep(.v-card-title){ padding:8px 12px !important; }
:deep(.v-card-text){  padding:8px 12px !important; }

.table-fill{flex:1;overflow:auto; position:relative; }
.maplibre-host{width:100%;height:100%;border:1px solid #e2e8f0;border-radius:8px}

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

/* ===== インライン編集（Step4） ===== */
.oh3-simple.editable td { padding:0; position:relative; pointer-events:auto; }
.cell-input{
  width:100%;
  box-sizing:border-box;
  padding:6px 8px;
  border:none;
  outline:none;
  background:white;
  font:inherit;
  position:relative;
  z-index:2;
  pointer-events:auto;
}
.cell-input.num{ text-align:right; }
.oh3-simple.editable td:focus-within { background:#e8f0fe !important; } /* フォーカス */
.cell-input:focus{ background:#fffef6; }

/* 外れ値/編集済み/パルス */
.suspect-cell{ background:#fff1b8 !important; box-shadow: inset 0 0 0 1px #e0b84a; }
.edited-cell{ background:#e7f6e7; box-shadow: inset 0 0 0 1px #7fbf7f; }
.just-edited{ animation: pulseEdited 1.2s ease-out 1; }
@keyframes pulseEdited{
  0% { box-shadow: 0 0 0 0 rgba(25,118,210,.45); }
  50%{ box-shadow: 0 0 0 6px rgba(25,118,210,0); }
  100%{ box-shadow: 0 0 0 0 rgba(25,118,210,0); }
}
.legend{ display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:4px; vertical-align:middle }
.legend.suspect{ background:#fff3cd; border:1px solid #e2c46b }
.legend.edited{ background:rgba(25,118,210,.15); border:1px solid rgba(25,118,210,.45) }
.edited-flag{ text-align:center; }

/* 既存指定の維持 */
.compact-text{padding-top:4px;padding-bottom:4px}
.inline-metrics{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline}
.warn.small{font-size:12px;color:#a15d00;margin-top:6px}

.map-chip{border:1px dashed var(--v-theme-outline);border-radius:10px;padding:8px;min-width:180px}
.oh3-title{color:rgb(var(--v-theme-primary))}
.oh3-accent-border{border-top:3px solid rgb(var(--v-theme-primary))}
.no-stretch { align-self: flex-start; max-width: 260px; }
.no-stretch :deep(.v-field) { height: 50px; }
.no-stretch :deep(.v-input) { flex: 0 0 auto !important; }
</style>
