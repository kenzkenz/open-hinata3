<!-- components/ext-label-only.vue -->
<template>
  <div class="label-controller" v-show="isOpen">
    <!-- ツールバー -->
    <div class="lc-toolbar">
      <div class="lc-tools">
        <MiniTooltip text="スタイル再読込" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" @click="reloadFromJson" :disabled="busy" title="スタイル再読込">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </MiniTooltip>

        <v-divider vertical class="mx-1" />

        <MiniTooltip text="すべて表示" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" @click="setAllVisibility('visible')" :disabled="!layers.length">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
        </MiniTooltip>
        <MiniTooltip text="すべて非表示" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" @click="setAllVisibility('none')" :disabled="!layers.length">
            <v-icon>mdi-eye-off</v-icon>
          </v-btn>
        </MiniTooltip>

        <v-divider vertical class="mx-1" />

        <v-text-field
            v-model.trim="q"
            density="compact"
            hide-details
            variant="solo-filled"
            placeholder="レイヤー検索（id）"
            class="lc-search"
            @keydown.stop
        />
      </div>
    </div>

    <!-- 本体 -->
    <div class="lc-body">
      <div class="panel">
        <div class="list-head">
          <span>ID</span><span>表示</span><span>編集</span>
        </div>

        <div class="list-scroll">
          <div class="item" v-for="(ly) in filtered" :key="ly.id">
            <div class="id">
              <code :title="ly.id">{{ ly.id }}</code>
            </div>
            <div class="vis">
              <v-btn icon size="small" variant="text"
                     :title="isVisible(ly.id)?'非表示':'表示'"
                     @click="toggleVisibility(ly.id)">
                <v-icon>{{ isVisible(ly.id)? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
              </v-btn>
            </div>
            <div class="more">
              <v-btn icon variant="text" @click="openEditor(ly.id)" title="詳細編集">
                <v-icon>mdi-tune-variant</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 編集ダイアログ（幅だけ縮小） -->
    <v-dialog v-model="editor.open" :scrim="editor.scrimColor" :retain-focus="false" width="560">
      <v-card class="lc-editor-card">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="lc-editor-title">{{ editor.layerId }}</span>
          <v-btn icon variant="text" @click="editor.open=false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>

        <v-card-text class="lc-editor-content">
          <div class="form-grid">
            <div class="cell">
              <div class="label">icon-size</div>
              <v-text-field type="number" step="0.1" density="comfortable" variant="outlined" color="primary" hide-details="auto"
                            :model-value="getPaint(editor.layerId,'icon-size') ?? ''"
                            @update:modelValue="setPaint(editor.layerId,'icon-size', numOrNull($event))" />
            </div>

            <div class="cell">
              <div class="label">text-size</div>
              <v-text-field type="number" step="1" density="comfortable" variant="outlined" color="primary" hide-details="auto"
                            :model-value="getLayout(editor.layerId,'text-size') ?? ''"
                            @update:modelValue="setLayout(editor.layerId,'text-size', numOrObj($event))" />
            </div>

            <div class="cell">
              <div class="label">text-color</div>
              <v-text-field density="comfortable" variant="outlined" color="primary" hide-details="auto"
                            :model-value="getPaint(editor.layerId,'text-color') ?? ''"
                            @update:modelValue="setPaint(editor.layerId,'text-color',$event)" placeholder="#333 / rgba()" />
            </div>

            <div class="cell">
              <div class="label">text-halo-color</div>
              <v-text-field density="comfortable" variant="outlined" color="primary" hide-details="auto"
                            :model-value="getPaint(editor.layerId,'text-halo-color') ?? ''"
                            @update:modelValue="setPaint(editor.layerId,'text-halo-color',$event)" placeholder="#fff / rgba()" />
            </div>

            <div class="cell">
              <div class="label">text-halo-width</div>
              <v-text-field type="number" step="0.1" density="comfortable" variant="outlined" color="primary" hide-details="auto"
                            :model-value="getPaint(editor.layerId,'text-halo-width') ?? ''"
                            @update:modelValue="setPaint(editor.layerId,'text-halo-width', numOrNull($event))" />
            </div>

            <div class="cell">
              <div class="label">symbol-placement</div>
              <v-select density="comfortable" variant="outlined" color="primary" hide-details="auto"
                        :model-value="getLayout(editor.layerId,'symbol-placement') ?? ''"
                        :items="['point','line']"
                        @update:modelValue="setLayout(editor.layerId,'symbol-placement',$event)" />
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="tonal" @click="editor.open=false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import MiniTooltip from '@/components/MiniTooltip'
import osmBrightLabelOnly from '@/assets/json/osm_bright_label_only.json'

export default {
  name: 'ExtLabelOnly',
  components: { MiniTooltip },
  props: {
    map: { type: Object, required: true },
    modelValue: { type: Boolean, default: true },
    open: { type: Boolean, default: undefined }
  },
  emits: ['update:modelValue','update:open'],
  data(){
    return {
      busy:false,
      layers: [],
      q: '',
      editor: {
        open:false,
        layerId:'',
        scrimColor:'rgba(24,27,32,.36)'
      }
    }
  },
  computed:{
    isOpen(){ return (this.open===undefined ? this.modelValue : this.open) !== false },
    filtered(){
      const k = (this.q||'').toLowerCase()
      if(!k) return this.layers
      return this.layers.filter(l => l.id.toLowerCase().includes(k))
    },
  },
  watch:{
    modelValue(v){ if(v===false) this.$emit('update:open', false) },
    open(v){ if(v===false) this.$emit('update:modelValue', false) }
  },
  mounted(){ this.reloadFromJson() },
  methods:{
    reloadFromJson(){
      try{
        this.busy=true
        const style = osmBrightLabelOnly
        const arr=[]
        let z=0
        for(const l of (style.layers||[])){
          z++
          if(l.type!=='symbol') continue
          arr.push({ id:l.id, z })
        }
        this.layers = arr
      }finally{ this.busy=false }
    },
    isVisible(id){
      try{ return this.map.getLayoutProperty(id,'visibility') !== 'none' }catch(e){ return true }
    },
    toggleVisibility(id){
      try{
        const vis = this.isVisible(id) ? 'none' : 'visible'
        this.map.setLayoutProperty(id,'visibility',vis)
      }catch(e){}
    },
    setAllVisibility(vis){
      this.layers.forEach(l=>{ try{ this.map.setLayoutProperty(l.id,'visibility', vis) }catch(e){} })
    },
    getLayout(id, key){ try{ return this.map.getLayoutProperty(id, key) }catch(e){ return '' } },
    setLayout(id, key, val){ try{ this.map.setLayoutProperty(id, key, this._coerce(val)) }catch(e){} },
    getPaint(id, key){ try{ return this.map.getPaintProperty(id, key) }catch(e){ return '' } },
    setPaint(id, key, val){ try{ this.map.setPaintProperty(id, key, this._coerce(val)) }catch(e){} },
    openEditor(id){ this.editor.layerId = id; this.editor.open = true },
    numOrNull(v){ if(v===null||v===undefined||v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null },
    numOrObj(v){
      if(!v && v!==0) return null
      if(typeof v==='string' && v.trim().startsWith('{')){ try{ return JSON.parse(v) }catch(e){ return v } }
      const n=Number(v); return Number.isFinite(n)?n:v
    },
    _coerce(val){
      if(typeof val==='string' && val.trim().startsWith('{')){ try{ return JSON.parse(val) }catch(e){ return val } }
      if(val==='true') return true
      if(val==='false') return false
      const n=Number(val); if(Number.isFinite(n) && val!=='' && val!==null) return n
      return val
    },
  }
}
</script>

<style scoped>
/* === 横幅と縦幅だけ縮小（他はそのまま） === */
.label-controller{
  width: 520px;              /* 760 → 520 */
  max-width: 100%;
  box-sizing: border-box;
  background:#fff;
  display:flex;
  flex-direction:column;
  height: auto;              /* 100% → auto */
  max-height: 72vh;          /* 追加：縦方向を縮める */
  overflow: auto;            /* はみ出し時にスクロール */
  min-height: 0;
}

.lc-toolbar{
  display:flex; align-items:center; justify-content:flex-start;
  padding:6px 8px; gap:6px;
  background:linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0));
  border-bottom:1px solid rgba(0,0,0,0.08);
  min-height:40px;
}
.lc-tools{ display:flex; align-items:center; gap:6px; width:100%; }
.lc-toolbar .mx-1{ margin:0 6px !important; }
.lc-search{ width: 260px; max-width: 48vw; } /* 検索欄も少しだけ縮小 */

.lc-body{
  flex: 1 1 auto; min-height:0;
  display:flex; flex-direction:column; gap:8px;
  padding:10px;
  overflow: hidden;
}

.panel{
  background:rgba(0,0,0,0.03);
  border:1px dashed rgba(0,0,0,0.2);
  border-radius:10px;
  padding:8px;
  min-height:0;
}

.list-head{
  display:grid;
  grid-template-columns: 1fr 56px 56px; /* 少し狭める */
  gap:6px; font-size:11px; color:#6b7280; font-weight:600; letter-spacing:.02em;
  text-transform:uppercase; padding:0 6px 4px;
}
.list-scroll{
  max-height: 50vh;  /* 100vh-… → 50vh にして縦を抑える */
  overflow:auto;
}
.item{
  display:grid;
  grid-template-columns: 1fr 56px 56px; /* 少し狭める */
  align-items:center; gap:6px; padding:6px;
  border-top:1px solid rgba(0,0,0,0.06);
}
.item:first-child{ border-top:none; }
.item .id code{ font-size:12px; }

/* 編集ダイアログ */
.lc-editor-card{ border-radius: 14px; }
.lc-editor-title{ font-size:14px; font-weight:600; }
.lc-editor-content{ padding-top: 6px; }
.form-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
.form-grid .cell .label{ font-size: 12px; color:#6b7280; margin-bottom:4px; }

:deep(.v-field--variant-solo-filled .v-field__overlay){ background: rgba(0,0,0,0.03); }
</style>
