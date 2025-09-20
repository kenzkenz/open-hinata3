<!-- components/ext-label-only.vue -->
<template>
  <div class="label-controller-root" v-show="isOpen">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="tools">
        <v-text-field
            v-model.trim="q"
            density="compact"
            hide-details
            variant="solo-filled"
            placeholder="レイヤーを検索"
            class="search"
            @keydown.stop
        />
        <v-btn-toggle v-model="kind" density="comfortable" mandatory class="seg">
          <v-btn value="all"   class="seg-btn is-all">すべて</v-btn>
          <v-btn value="label" class="seg-btn is-label">ラベル</v-btn>
          <v-btn value="icon"  class="seg-btn is-icon">アイコン</v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <!-- Body (list pane only) -->
    <div class="body">
      <div class="panel">
        <div class="list-head">
          <span>レイヤー名</span><span>種別</span><span>表示</span><span>編集</span>
        </div>
        <div class="list-scroll">
          <div class="item" v-for="(ly, i) in filtered" :key="ly.id + '-' + i">
            <div class="id">
              <code :title="ly.id">{{ ly.displayName }}</code>
            </div>

            <div class="kind">
              <v-chip v-if="ly.hasText"  size="small" class="chip-text"  label>ラベル</v-chip>
              <v-chip v-if="ly.hasIcon"  size="small" class="chip-icon"  label>アイコン</v-chip>
            </div>

            <div class="vis">
              <v-btn
                  icon size="small" variant="text"
                  :title="ly.visible ? '非表示' : '表示'"
                  @click="toggleVisibility(ly.id)"
              >
                <v-icon>{{ ly.visible ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
              </v-btn>
            </div>

            <div class="edit">
              <v-btn icon size="small" variant="text" title="編集" @click="openEdit(ly)">
                <v-icon>mdi-tune</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit dialog -->
    <v-dialog v-model="edit.open" :scrim="true" :z-index="localZ" width="520" class="editor-dialog">
      <v-card>
        <v-card-title class="px-4 py-3">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center gap-2">
              <v-icon class="mr-2">mdi-tune</v-icon>
              <span class="font-semibold">レイヤー編集</span>
            </div>
            <code class="text-sm text-medium-emphasis">{{ edit.target?.displayName }}</code>
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="px-4 py-4 editor-body">
          <div class="grid two-col">
            <div>
              <label class="field-label">text-size</label>
              <v-text-field v-model="edit.form.textSize" type="number" density="comfortable" variant="outlined" hide-details placeholder="例: 12" />
            </div>
            <div>
              <label class="field-label">icon-size</label>
              <v-text-field v-model="edit.form.iconSize" type="number" step="0.1" density="comfortable" variant="outlined" hide-details placeholder="例: 1.0" />
            </div>
            <div>
              <label class="field-label">text-color</label>
              <v-text-field v-model="edit.form.textColor" density="comfortable" variant="outlined" hide-details placeholder="#333 or rgba()" />
            </div>
            <div>
              <label class="field-label">text-halo-color</label>
              <v-text-field v-model="edit.form.textHaloColor" density="comfortable" variant="outlined" hide-details placeholder="#fff or rgba()" />
            </div>
            <div>
              <label class="field-label">text-halo-width</label>
              <v-text-field v-model="edit.form.textHaloWidth" type="number" step="0.1" density="comfortable" variant="outlined" hide-details placeholder="例: 1.0" />
            </div>
            <div>
              <label class="field-label">symbol-placement</label>
              <v-select v-model="edit.form.symbolPlacement" :items="['point','line']" density="comfortable" variant="outlined" hide-details placeholder="point / line" />
            </div>
          </div>
          <div class="hint mt-2">※ いまは <strong>JSON（スタイル定義）</strong> に対してのみ変更を保持します（Map へは即時反映しません）。</div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-4 py-3 d-flex justify-end">
          <v-btn variant="text" @click="edit.open=false">閉じる</v-btn>
          <v-btn color="primary" @click="applyEdit">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import osmBrightLabelOnly from '@/assets/json/osm_bright_label_only.json'

const HIDE_PREFIX = 'oh-vector-osm-bright-labels-only-'

export default {
  name: 'ExtLabelOnly',
  props: {
    modelValue: { type: Boolean, default: true },
    open:       { type: Boolean, default: undefined },
  },
  emits: ['update:modelValue','update:open'],
  data(){
    return {
      q: '',
      kind: 'all', // all | label | icon
      layers: [],  // {id, displayName, hasText, hasIcon, visible}
      edit: {
        open: false,
        target: null,
        form: {
          textSize: null,
          iconSize: null,
          textColor: '',
          textHaloColor: '',
          textHaloWidth: null,
          symbolPlacement: null,
        },
      },
      localZ: 2000,
    }
  },
  computed:{
    isOpen(){ return (this.open===undefined ? this.modelValue : this.open) !== false },
    filtered(){
      const k = (this.q||'').toLowerCase()
      return this.layers.filter(l=>{
        if(k){
          const nameHit = l.displayName.toLowerCase().includes(k)
          const idHit   = l.id.toLowerCase().includes(k)
          if(!nameHit && !idHit) return false
        }
        if(this.kind==='label') return l.hasText === true
        if(this.kind==='icon')  return l.hasIcon === true
        return true
      })
    }
  },
  watch:{
    modelValue(v){ if(v===false) this.$emit('update:open', false) },
    open(v){ if(v===false) this.$emit('update:modelValue', false) },
  },
  mounted(){ this.buildFromJson() },
  methods:{
    buildFromJson(){
      const style = osmBrightLabelOnly
      const list = []
      if(!style || !Array.isArray(style.layers)) return
      for(const l of style.layers){
        if(l.type !== 'symbol') continue
        const hasText = !!(l.layout && l.layout['text-field'] !== undefined && l.layout['text-field'] !== null)
        const hasIcon = !!(
            (l.layout && l.layout['icon-image'] !== undefined && l.layout['icon-image'] !== null) ||
            (l.paint  && l.paint['icon-image']  !== undefined && l.paint['icon-image']  !== null)
        )
        list.push({
          id: l.id,
          displayName: (l.id || '').startsWith(HIDE_PREFIX) ? l.id.slice(HIDE_PREFIX.length) : l.id,
          hasText, hasIcon,
          visible: (l.layout?.visibility ?? 'visible') !== 'none'
        })
      }
      this.layers = list
    },
    toggleVisibility(id){
      const t = this.layers.find(x=>x.id===id)
      if(!t) return
      t.visible = !t.visible
      const l = this._findLayerInJson(id)
      if(l){
        l.layout = l.layout || {}
        l.layout.visibility = t.visible ? 'visible' : 'none'
      }
    },
    openEdit(ly){
      this.edit.target = ly
      const l = this._findLayerInJson(ly.id)
      const layout = l?.layout || {}
      const paint  = l?.paint || {}
      this.edit.form = {
        textSize:        this._numOrNull(layout['text-size']),
        iconSize:        this._numOrNull(paint['icon-size']),
        textColor:       paint['text-color'] ?? '',
        textHaloColor:   paint['text-halo-color'] ?? '',
        textHaloWidth:   this._numOrNull(paint['text-halo-width']),
        symbolPlacement: layout['symbol-placement'] ?? null,
      }
      this.edit.open = true
    },
    applyEdit(){
      const id = this.edit.target?.id
      if(!id) return
      const l = this._findLayerInJson(id)
      if(!l) return
      l.layout = l.layout || {}
      l.paint  = l.paint  || {}

      if(this.edit.form.textSize !== null && this.edit.form.textSize !== undefined) l.layout['text-size'] = Number(this.edit.form.textSize)
      else delete l.layout['text-size']

      if(this.edit.form.symbolPlacement) l.layout['symbol-placement'] = this.edit.form.symbolPlacement
      else delete l.layout['symbol-placement']

      if(this.edit.form.iconSize !== null && this.edit.form.iconSize !== undefined) l.paint['icon-size'] = Number(this.edit.form.iconSize)
      else delete l.paint['icon-size']

      if(this.edit.form.textColor)     l.paint['text-color'] = this.edit.form.textColor;       else delete l.paint['text-color']
      if(this.edit.form.textHaloColor) l.paint['text-halo-color'] = this.edit.form.textHaloColor; else delete l.paint['text-halo-color']

      if(this.edit.form.textHaloWidth !== null && this.edit.form.textHaloWidth !== undefined) l.paint['text-halo-width'] = Number(this.edit.form.textHaloWidth)
      else delete l.paint['text-halo-width']

      this.edit.open = false
    },
    _findLayerInJson(id){ return osmBrightLabelOnly.layers.find(x=>x.id===id) },
    _numOrNull(v){ if(v===null || v===undefined || v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null }
  }
}
</script>

<style scoped>
.label-controller-root{
  width: 560px;
  max-width: 100%;
  box-sizing: border-box;
  background: #fff;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,.08);
  box-shadow: 0 6px 22px rgba(0,0,0,.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Toolbar — 左端にくっつかないようパディング */
.toolbar{
  display:flex; align-items:center;
  padding: 12px 16px;
  background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0));
  border-bottom: 1px solid rgba(0,0,0,.08);
}
.tools{ display:flex; align-items:center; gap:10px; width:100%; flex-wrap:nowrap; }
.search{ flex:1 1 auto; min-width:140px; max-width:300px; }

/* Segmented (chip-like) toggle — 一覧のチップ配色に統一、折り返し無し */
.seg{ flex:0 0 auto; display:flex; gap:8px; background:transparent; padding:0; border:0; }
.seg :deep(.v-btn){
  text-transform:none;
  border-radius:12px !important;
  height:34px; min-width:84px; padding:0 14px;
  box-shadow:none;
  border:1px solid var(--seg-bd,#e5e7eb);
  background:var(--seg-bg,#f7f8fa);
  color:#374151;
}
/* すべて（ニュートラル） */
.seg .is-all   { --seg-bg:#f6f7fa; --seg-bd:#e5e7eb; --seg-bg-active:#ffffff; --seg-bd-active:#d1d5db; }
/* ラベル（青系） */
.seg .is-label { --seg-bg:#eef6ff; --seg-bd:#cfe6ff; --seg-bg-active:#e7f0ff; --seg-bd-active:#9cc3ff; }
/* アイコン（紫系） */
.seg .is-icon  { --seg-bg:#f9f3ff; --seg-bd:#eadcff; --seg-bg-active:#f0eaff; --seg-bd-active:#c3b7ff; }
/* Active状態 */
.seg :deep(.v-btn.v-btn--active){
  background:var(--seg-bg-active,#fff) !important;
  border-color:var(--seg-bd-active,#d1d5db) !important;
  box-shadow:0 2px 8px rgba(0,0,0,.10);
}

/* Body */
.body{ padding:10px; }
.panel{
  background: rgba(0,0,0,0.03);
  border: 1px dashed rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 12px;
}

/* List */
.list-head{
  display:grid;
  grid-template-columns: 1fr 160px 64px 64px;
  gap:10px;
  font-size:11px;
  color:#6b7280;
  font-weight:600;
  letter-spacing:.02em;
  text-transform:uppercase;
  padding: 0 12px 8px;
}
.list-scroll{
  max-height: 48vh;
  overflow: auto;
  padding: 0 12px 8px;
}
.item{
  display:grid;
  grid-template-columns: 1fr 160px 64px 64px;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-top:1px solid rgba(0,0,0,0.06);
}
.item:first-child{ border-top:none; }
.item .id code{ font-size:12px; }

/* Chips (一覧とトグルで色統一) */
.chip-text{ background:#eef6ff; border:1px solid #cfe6ff; }
.chip-icon{ background:#f9f3ff; border:1px solid #eadcff; }

/* Dialog */
.editor-dialog :deep(.v-overlay__scrim){ background: rgba(15,18,25,0.5) !important; }
.editor-body{ padding: 8px 4px; }
.grid.two-col{ display:grid; gap:12px; grid-template-columns: 1fr 1fr; }
@media (max-width: 560px){ .grid.two-col{ grid-template-columns: 1fr; } }
.field-label{ display:block; margin-bottom:6px; font-size:12px; color:#6b7280; }
.hint{ font-size:12px; color:#6b7280; }

/* Vuetify fields a bit tighter */
:deep(.v-field--variant-outlined){ --v-field-padding-start: 8px; }
:deep(.v-field__outline__start), :deep(.v-field__outline__end){ opacity:.9; }
</style>
