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

        <!-- フィルタトグル（スマホ対応のため一時的に非表示。ロジックは残す） -->
        <!--
        <v-btn-toggle v-model="kind" density="comfortable" mandatory class="seg">
          <v-btn value="all"   class="seg-btn is-all">すべて</v-btn>
          <v-btn value="label" class="seg-btn is-label">ラベル</v-btn>
          <v-btn value="icon"  class="seg-btn is-icon">アイコン</v-btn>
        </v-btn-toggle>
        -->

        <!-- すべて表示/非表示 -->
        <v-btn icon variant="text" class="allvis" :title="'すべて表示'"  @click="setAllVisibility(true)">
          <v-icon>mdi-eye</v-icon>
        </v-btn>
        <v-btn icon variant="text" class="allvis" :title="'すべて非表示'" @click="setAllVisibility(false)">
          <v-icon>mdi-eye-off</v-icon>
        </v-btn>

        <!-- すべてリセット -->
        <v-btn icon variant="text" class="allvis" :title="'すべてリセット'" @click="resetAll">
          <v-icon>mdi-backup-restore</v-icon>
        </v-btn>
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
              <v-chip v-if="ly.hasText" size="small" class="chip chip-text" label>ラベル</v-chip>
              <v-chip v-if="ly.hasIcon" size="small" class="chip chip-icon" label>アイコン</v-chip>
            </div>

            <div class="vis">
              <v-btn
                  icon size="small" variant="text"
                  :title="isActuallyVisible(ly.id) ? '非表示' : '表示'"
                  @click="toggleVisibility(ly.id)"
              >
                <v-icon>{{ isActuallyVisible(ly.id) ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
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
              <v-text-field
                  v-model="edit.form.iconSize"
                  type="number" step="0.1" density="comfortable" variant="outlined" hide-details placeholder="例: 1.0"
                  :disabled="!edit.target?.hasIcon"
              />
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
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-4 py-3 d-flex justify-end">
          <v-btn variant="text" @click="edit.open=false">閉じる</v-btn>
          <v-btn color="primary" @click="applyEdit">反映</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import osmBrightLabelOnly from '@/assets/json/osm_bright_label_only.json'

const HIDE_PREFIX   = 'oh-vector-osm-bright-labels-only-'
const ICON_ONLY_ID  = 'oh-vector-osm-bright-labels-only-poi-level-1-1'

export default {
  name: 'ExtLabelOnly',
  props: {
    modelValue: { type: Boolean, default: true },
    open:       { type: Boolean, default: undefined },
    mapName:    { type: String,  required: true },
  },
  emits: ['update:modelValue','update:open'],
  data(){
    return {
      q: '',
      kind: 'all', // all | label | icon（UIは一時非表示だがロジックは生存）
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
      originalStyle: null,
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
    },
    map(){ return this.$store.state?.[this.mapName] || null }
  },
  watch:{
    modelValue(v){ if(v===false) this.$emit('update:open', false) },
    open(v){ if(v===false) this.$emit('update:modelValue', false) },
  },
  mounted(){
    this.originalStyle = JSON.parse(JSON.stringify(osmBrightLabelOnly))
    this.buildFromJson()
  },
  methods:{
    buildFromJson(){
      const style = osmBrightLabelOnly
      const list = []
      if(!style || !Array.isArray(style.layers)) return
      for(const l of style.layers){
        if(l.type !== 'symbol') continue
        const hasText = !!(l.layout && l.layout['text-field'] !== undefined && l.layout['text-field'] !== null)
        const hasIcon = l.id === ICON_ONLY_ID
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
      const newVis = !this.isActuallyVisible(id)
      t.visible = newVis
      const l = this._findLayerInJson(id)
      if(l){
        l.layout = l.layout || {}
        l.layout.visibility = newVis ? 'visible' : 'none'
      }
      this._setMapVisibility(id, newVis)
    },
    setAllVisibility(flag){
      for(const t of this.layers){
        t.visible = !!flag
        const l = this._findLayerInJson(t.id)
        if(l){
          l.layout = l.layout || {}
          l.layout.visibility = flag ? 'visible' : 'none'
        }
      }
      if(this.map?.getStyle){
        for(const t of this.layers){
          this._setMapVisibility(t.id, !!flag)
        }
      }
    },
    isActuallyVisible(id){
      try{
        const v = this.map?.getLayoutProperty?.(id, 'visibility')
        if(v === 'none') return false
        if(v === 'visible') return true
      }catch(e){}
      const l = this.layers.find(x=>x.id===id)
      return l ? !!l.visible : true
    },
    _setMapVisibility(id, flag){
      try{
        if(this.map?.getLayer?.(id)){
          this.map.setLayoutProperty(id, 'visibility', flag ? 'visible' : 'none')
        }
      }catch(e){}
    },

    openEdit(ly){
      this.edit.target = ly
      const l = this._findLayerInJson(ly.id)
      const layout = l?.layout || {}
      const paint  = l?.paint || {}
      this.edit.form = {
        textSize:        this._numOrNull(layout['text-size']),
        iconSize:        this._numOrNull(layout['icon-size']),
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

      if(id === ICON_ONLY_ID && this.edit.target?.hasIcon){
        if(this.edit.form.iconSize !== null && this.edit.form.iconSize !== undefined) l.layout['icon-size'] = Number(this.edit.form.iconSize)
        else delete l.layout['icon-size']
      }else{
        delete l.layout['icon-size']
      }

      if(this.edit.form.textColor)     l.paint['text-color'] = this.edit.form.textColor;         else delete l.paint['text-color']
      if(this.edit.form.textHaloColor) l.paint['text-halo-color'] = this.edit.form.textHaloColor; else delete l.paint['text-halo-color']
      if(this.edit.form.textHaloWidth !== null && this.edit.form.textHaloWidth !== undefined) l.paint['text-halo-width'] = Number(this.edit.form.textHaloWidth)
      else delete l['paint']['text-halo-width']

      try{
        if(this.map?.getLayer?.(id)){
          if('text-size' in l.layout) this.map.setLayoutProperty(id, 'text-size', l['layout']['text-size']); else this.map.setLayoutProperty(id, 'text-size', null)
          if('symbol-placement' in l.layout) this.map.setLayoutProperty(id, 'symbol-placement', l['layout']['symbol-placement'])
          if(id === ICON_ONLY_ID){
            if('icon-size' in l.layout) this.map.setLayoutProperty(id, 'icon-size', l['layout']['icon-size']); else this.map.setLayoutProperty(id, 'icon-size', null)
          }else{
            this.map.setLayoutProperty(id, 'icon-size', null)
          }
          if('text-color' in l.paint) this.map.setPaintProperty(id, 'text-color', l['paint']['text-color']); else this.map.setPaintProperty(id, 'text-color', null)
          if('text-halo-color' in l.paint) this.map.setPaintProperty(id, 'text-halo-color', l['paint']['text-halo-color']); else this.map.setPaintProperty(id, 'text-halo-color', null)
          if('text-halo-width' in l.paint) this.map.setPaintProperty(id, 'text-halo-width', l['paint']['text-halo-width']); else this.map.setPaintProperty(id, 'text-halo-width', null)
        }
      }catch(e){}
      // ダイアログは閉じない
    },

    resetAll(){
      if(!this.originalStyle) return
      const origLayers = this.originalStyle.layers || []
      const m = this.map

      for (const cur of osmBrightLabelOnly.layers) {
        if(cur.type !== 'symbol') continue
        const orig = origLayers.find(x=>x.id===cur.id)
        if(!orig) continue

        cur.layout = JSON.parse(JSON.stringify(orig.layout || {}))
        cur.paint  = JSON.parse(JSON.stringify(orig.paint  || {}))

        const ui = this.layers.find(x=>x.id===cur.id)
        if(ui) ui.visible = (cur.layout?.visibility ?? 'visible') !== 'none'

        if(m?.getLayer?.(cur.id)){
          try{
            m.setLayoutProperty(cur.id, 'visibility', ui?.visible ? 'visible' : 'none')
            m.setLayoutProperty(cur.id, 'text-size', ('text-size' in (cur.layout||{})) ? cur.layout['text-size'] : null)
            if('symbol-placement' in (cur.layout||{})) m.setLayoutProperty(cur.id, 'symbol-placement', cur.layout['symbol-placement'])
            if(cur.id === ICON_ONLY_ID){
              m.setLayoutProperty(cur.id, 'icon-size', ('icon-size' in (cur.layout||{})) ? cur.layout['icon-size'] : null)
            }else{
              m.setLayoutProperty(cur.id, 'icon-size', null)
            }
            m.setPaintProperty(cur.id, 'text-color',      ('text-color'      in (cur.paint||{})) ? cur.paint['text-color'] : null)
            m.setPaintProperty(cur.id, 'text-halo-color', ('text-halo-color' in (cur.paint||{})) ? cur.paint['text-halo-color'] : null)
            m.setPaintProperty(cur.id, 'text-halo-width', ('text-halo-width' in (cur.paint||{})) ? cur.paint['text-halo-width'] : null)
          }catch(e){}
        }
      }
    },

    _findLayerInJson(id){ return osmBrightLabelOnly.layers.find(x=>x.id===id) },
    _numOrNull(v){ if(v===null || v===undefined || v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null }
  }
}
</script>

<style scoped>
/* ====== 共通（カード） ====== */
.label-controller-root{
  width: 380px;  /* スマホ幅 */
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

/* ====== ツールバー ====== */
.toolbar{
  display:flex; align-items:center;
  padding: 10px 12px;
  background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0));
  border-bottom: 1px solid rgba(0,0,0,.08);
}
.tools{ display:flex; align-items:center; gap:6px; width:100%; flex-wrap:nowrap; }

/* 検索フィールドを短く（スマホでボタンが並ぶように） */
.search{ flex:1 1 auto; min-width:100px; max-width:150px; }

.allvis{ margin-left: 0; }

/* ====== セグメントトグル（いまは非表示：上のtemplateでコメントアウト） ====== */
:root{ --chip-radius:8px; --chip-h:28px; --chip-gap:8px; --chip-pad-x:12px; --chip-fs:13px; }
.seg{
  flex:0 0 auto; display:flex; gap:var(--chip-gap); background:transparent; padding:0; border:0;
}
.seg :deep(.v-btn){
  text-transform:none;
  border-radius:var(--chip-radius) !important;
  height:var(--chip-h); line-height:var(--chip-h);
  min-width:auto; padding:0 var(--chip-pad-x);
  font-size:var(--chip-fs);
  box-shadow:none;
  border:1px solid var(--seg-bd,#e5e7eb);
  background:var(--seg-bg,#f7f8fa);
  color:#374151;
}
.seg .is-all   { --seg-bg:#f6f7fa; --seg-bd:#e5e7eb; --seg-bg-active:#ffffff; --seg-bd-active:#d1d5db; }
.seg .is-label { --seg-bg:#eef6ff; --seg-bd:#cfe6ff; --seg-bg-active:#e7f0ff; --seg-bd-active:#9cc3ff; }
.seg .is-icon  { --seg-bg:#f9f3ff; --seg-bd:#eadcff; --seg-bg-active:#f0eaff; --seg-bd-active:#c3b7ff; }
.seg :deep(.v-btn.v-btn--active){
  background:var(--seg-bg-active,#fff) !important;
  border-color:var(--seg-bd-active,#d1d5db) !important;
  box-shadow:none;
}
.seg-btn{ padding: 0 10px!important; }

/* ====== 本体 ====== */
.body{ padding:8px; }
.panel{
  background: rgba(0,0,0,0.03);
  border: 1px dashed rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 10px;
}

/* ====== リスト（スマホ幅に合わせて列幅調整） ====== */
.list-head{
  display:grid;
  grid-template-columns: 1fr 110px 48px 48px; /* ← 380px用に圧縮 */
  gap:8px;
  font-size:11px;
  color:#6b7280;
  font-weight:600;
  letter-spacing:.02em;
  text-transform:uppercase;
  padding: 0 8px 6px;
}
.list-scroll{
  max-height: 50vh;
  overflow: auto;
  padding: 0 8px 6px;
}
.item{
  display:grid;
  grid-template-columns: 1fr 110px 48px 48px;
  align-items:center;
  gap:8px;
  padding:8px 8px;
  border-top:1px solid rgba(0,0,0,0.06);
}
.item:first-child{ border-top:none; }
.item .id code{ font-size:12px; word-break: break-all; }

.chip{
  border-radius: var(--chip-radius) !important;
  height: var(--chip-h) !important;
  font-size: var(--chip-fs) !important;
}
.chip-text{ background:#eef6ff; border:1px solid #cfe6ff; }
.chip-icon{ background:#f9f3ff; border:1px solid #eadcff; }

/* ====== ダイアログ ====== */
.editor-dialog :deep(.v-overlay__scrim){ background: rgba(15,18,25,0.5) !important; }
.editor-body{ padding: 8px 4px; }
.grid.two-col{ display:grid; gap:12px; grid-template-columns: 1fr 1fr; }
@media (max-width: 560px){ .grid.two-col{ grid-template-columns: 1fr; } }
.field-label{ display:block; margin-bottom:6px; font-size:12px; color:#6b7280; }

/* Vuetify fields 少しだけタイトに */
:deep(.v-field--variant-outlined){ --v-field-padding-start: 8px; }
:deep(.v-field__outline__start), :deep(.v-field__outline__end){ opacity:.9; }

/* 種別（ラベル/アイコン）を必ず1行で収める：最小限の修正だけ */
.kind{
  display:flex; align-items:center; justify-content:flex-start;
  gap:4px;                 /* ちょい詰める */
  flex-wrap:nowrap;        /* 折り返し禁止 */
  white-space:nowrap;      /* 文言も折り返さない */
  min-width:0;             /* グリッド内での計算を安定させる */
}

.kind .chip{
  height:22px !important;
  line-height:22px !important;
  font-size:11px !important;
  padding:0 6px !important;
  min-width:auto !important;  /* v-chip のデフォ最小幅を解除して縮められるように */
  flex:0 1 auto;              /* 必要に応じて“少しだけ”縮む */
}
</style>
