<!-- components/layers-controller.vue -->
<template>
  <div :style="menuContentSize" class="lc-root" v-show="isOpen">
    <!-- ツールバー -->
    <div class="lc-toolbar">
      <div class="lc-title">
        <span>Layers Controller</span>
        <small style="opacity:.7">（現在のスタイル内の全レイヤーを直接操作）</small>
      </div>
      <div class="lc-tools compact">
        <MiniTooltip text="スタイル再読込" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" @click="refreshFromMap" title="スタイル再読込"><v-icon>mdi-refresh</v-icon></v-btn>
        </MiniTooltip>

        <v-divider vertical class="mx-1"/>

        <MiniTooltip text="すべて表示" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" :disabled="!layers.length" @click="setAllVisibility('visible')" title="すべて表示"><v-icon>mdi-eye</v-icon></v-btn>
        </MiniTooltip>
        <MiniTooltip text="すべて非表示" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" :disabled="!layers.length" @click="setAllVisibility('none')" title="すべて非表示"><v-icon>mdi-eye-off</v-icon></v-btn>
        </MiniTooltip>

        <v-divider vertical class="mx-1"/>

        <v-text-field
            v-model.trim="q"
            density="compact"
            hide-details
            variant="solo-filled"
            placeholder="レイヤー検索（id / type / source / source-layer）"
            style="width: 420px;"
            @keydown.stop
        />

        <v-divider vertical class="mx-1"/>

        <MiniTooltip text="ヘルプ" :offset-x="0" :offset-y="0">
          <v-btn icon variant="text" @click="onHelp" title="ヘルプ"><v-icon>mdi-help-circle-outline</v-icon></v-btn>
        </MiniTooltip>
      </div>
    </div>

    <!-- レイヤー一覧 -->
    <div class="lc-body">
      <div class="lc-panel">
        <div class="lc-list-head">
          <span>ID</span><span>type</span><span>src</span><span>表示</span><span>順序</span><span></span>
        </div>
        <div class="lc-list-scroll">
          <div class="lc-item" v-for="ly in filtered" :key="ly.id">
            <div class="id">
              <code :title="`${ly.id}\nsource: ${ly.source||''}\nsource-layer: ${ly.sourceLayer||''}`">{{ ly.id }}</code>
            </div>

            <div class="type"><span class="pill">{{ ly.type }}</span></div>

            <div class="src">
              <div class="src-main">{{ ly.source || '-' }}</div>
              <div class="src-sub" v-if="ly.sourceLayer">{{ ly.sourceLayer }}</div>
            </div>

            <div class="vis">
              <v-btn icon size="small" variant="text" :title="isVisible(ly.id)?'非表示':'表示'" @click="toggleVisibility(ly.id)">
                <v-icon>{{ isVisible(ly.id)? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
              </v-btn>
            </div>

            <div class="order">
              <v-btn icon size="small" variant="text" @click="moveUp(ly.id)" :title="`1つ上へ`"><v-icon>mdi-arrow-up</v-icon></v-btn>
              <v-btn icon size="small" variant="text" @click="moveDown(ly.id)" :title="`1つ下へ`"><v-icon>mdi-arrow-down</v-icon></v-btn>
            </div>

            <div class="more">
              <v-menu :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-btn icon variant="text" v-bind="props" title="詳細編集"><v-icon>mdi-tune</v-icon></v-btn>
                </template>
                <div class="lc-menu">
                  <!-- タイプ別 代表プロパティ -->
                  <template v-if="ly.type==='background'">
                    <div class="row two">
                      <div>
                        <label>background-color</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'background-color')"
                                      @update:modelValue="setPaint(ly.id,'background-color',$event)" />
                      </div>
                      <div>
                        <label>background-opacity</label>
                        <v-text-field type="number" step="0.05" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'background-opacity')"
                                      @update:modelValue="setPaint(ly.id,'background-opacity', numOrNull($event))" />
                      </div>
                    </div>
                  </template>

                  <template v-else-if="ly.type==='symbol'">
                    <div class="row">
                      <label>text-field</label>
                      <v-text-field density="compact" variant="underlined" hide-details="auto"
                                    :model-value="getLayout(ly.id,'text-field')"
                                    @update:modelValue="setLayout(ly.id,'text-field',$event)" />
                    </div>
                    <div class="row two">
                      <div>
                        <label>text-size</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getLayout(ly.id,'text-size')"
                                      @update:modelValue="setLayout(ly.id,'text-size', numOrObj($event))" />
                      </div>
                      <div>
                        <label>symbol-placement</label>
                        <v-select density="compact" variant="underlined" hide-details="auto"
                                  :model-value="getLayout(ly.id,'symbol-placement')"
                                  :items="['point','line']"
                                  @update:modelValue="setLayout(ly.id,'symbol-placement',$event)" />
                      </div>
                    </div>
                    <div class="row two">
                      <div>
                        <label>text-color</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'text-color')"
                                      @update:modelValue="setPaint(ly.id,'text-color',$event)" />
                      </div>
                      <div>
                        <label>text-halo-color</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'text-halo-color')"
                                      @update:modelValue="setPaint(ly.id,'text-halo-color',$event)" />
                      </div>
                    </div>
                    <div class="row two">
                      <div>
                        <label>text-halo-width</label>
                        <v-text-field type="number" step="0.1" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'text-halo-width')"
                                      @update:modelValue="setPaint(ly.id,'text-halo-width', numOrNull($event))" />
                      </div>
                      <div>
                        <label>icon-image</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getLayout(ly.id,'icon-image')"
                                      @update:modelValue="setLayout(ly.id,'icon-image',$event)" />
                      </div>
                    </div>
                    <div class="row two">
                      <div>
                        <label>icon-size</label>
                        <v-text-field type="number" step="0.1" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'icon-size')"
                                      @update:modelValue="setPaint(ly.id,'icon-size', numOrNull($event))" />
                      </div>
                      <div>
                        <label>icon-opacity</label>
                        <v-text-field type="number" step="0.05" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'icon-opacity')"
                                      @update:modelValue="setPaint(ly.id,'icon-opacity', numOrNull($event))" />
                      </div>
                    </div>
                  </template>

                  <template v-else-if="ly.type==='line'">
                    <div class="row two">
                      <div>
                        <label>line-color</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'line-color')"
                                      @update:modelValue="setPaint(ly.id,'line-color',$event)" />
                      </div>
                      <div>
                        <label>line-width</label>
                        <v-text-field type="number" step="0.1" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'line-width')"
                                      @update:modelValue="setPaint(ly.id,'line-width', numOrNull($event))" />
                      </div>
                    </div>
                    <div class="row two">
                      <div>
                        <label>line-opacity</label>
                        <v-text-field type="number" step="0.05" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'line-opacity')"
                                      @update:modelValue="setPaint(ly.id,'line-opacity', numOrNull($event))" />
                      </div>
                      <div>
                        <label>line-dasharray（JSON）</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'line-dasharray')"
                                      @update:modelValue="setPaint(ly.id,'line-dasharray', arrOrVal($event))" />
                      </div>
                    </div>
                  </template>

                  <template v-else-if="ly.type==='fill'">
                    <div class="row two">
                      <div>
                        <label>fill-color</label>
                        <v-text-field density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'fill-color')"
                                      @update:modelValue="setPaint(ly.id,'fill-color',$event)" />
                      </div>
                      <div>
                        <label>fill-opacity</label>
                        <v-text-field type="number" step="0.05" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'fill-opacity')"
                                      @update:modelValue="setPaint(ly.id,'fill-opacity', numOrNull($event))" />
                      </div>
                    </div>
                    <div class="row">
                      <label>fill-outline-color</label>
                      <v-text-field density="compact" variant="underlined" hide-details="auto"
                                    :model-value="getPaint(ly.id,'fill-outline-color')"
                                    @update:modelValue="setPaint(ly.id,'fill-outline-color',$event)" />
                    </div>
                  </template>

                  <template v-else-if="ly.type==='raster'">
                    <div class="row two">
                      <div>
                        <label>raster-opacity</label>
                        <v-text-field type="number" step="0.05" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'raster-opacity')"
                                      @update:modelValue="setPaint(ly.id,'raster-opacity', numOrNull($event))" />
                      </div>
                      <div>
                        <label>raster-contrast</label>
                        <v-text-field type="number" step="0.1" density="compact" variant="underlined" hide-details="auto"
                                      :model-value="getPaint(ly.id,'raster-contrast')"
                                      @update:modelValue="setPaint(ly.id,'raster-contrast', numOrNull($event))" />
                      </div>
                    </div>
                  </template>

                  <!-- 共通：filter / 任意Key -->
                  <div class="row">
                    <label>filter（JSON配列）</label>
                    <v-textarea rows="3" auto-grow density="compact" variant="underlined" hide-details="auto"
                                :model-value="getFilterJson(ly.id)"
                                @update:modelValue="setFilterJson(ly.id,$event)"/>
                  </div>

                  <div class="row two">
                    <div>
                      <label>任意 layout key</label>
                      <v-text-field density="compact" variant="underlined" hide-details="auto" v-model="kv.layoutKey"
                                    placeholder="例: text-letter-spacing" />
                    </div>
                    <div>
                      <label>値（数値/JSON/文字列）</label>
                      <v-text-field density="compact" variant="underlined" hide-details="auto" v-model="kv.layoutVal"
                                    placeholder='例: 0.2 / {"stops":[[5,10],[10,16]]} / "line"' />
                    </div>
                  </div>
                  <div class="row two">
                    <div class="tools">
                      <v-btn size="small" @click="applyLayoutKey(ly.id)" :disabled="!kv.layoutKey">layout を適用</v-btn>
                    </div>
                    <div class="spacer"></div>
                  </div>

                  <div class="row two">
                    <div>
                      <label>任意 paint key</label>
                      <v-text-field density="compact" variant="underlined" hide-details="auto" v-model="kv.paintKey"
                                    placeholder="例: text-halo-blur / line-gap-width" />
                    </div>
                    <div>
                      <label>値（数値/JSON/文字列）</label>
                      <v-text-field density="compact" variant="underlined" hide-details="auto" v-model="kv.paintVal"
                                    placeholder='例: 1 / [2,2] / "#333" ' />
                    </div>
                  </div>
                  <div class="row two">
                    <div class="tools">
                      <v-btn size="small" @click="applyPaintKey(ly.id)" :disabled="!kv.paintKey">paint を適用</v-btn>
                    </div>
                    <div class="spacer"></div>
                  </div>
                </div>
              </v-menu>
            </div>
          </div>
        </div>
      </div>

      <!-- 一括操作 -->
      <div class="lc-panel" style="margin-top:8px">
        <div class="row two">
          <div>
            <label>表示状態を一括</label>
            <v-select density="compact" variant="underlined" hide-details="auto"
                      :items="['visible','none']" v-model="bulk.visibility" />
          </div>
          <div class="tools">
            <v-btn size="small" @click="applyBulkVisibility" :disabled="!filtered.length || !bulk.visibility">適用</v-btn>
          </div>
        </div>

        <div class="row two">
          <div>
            <label>text-color を一括（symbolのみ）</label>
            <v-text-field density="compact" variant="underlined" hide-details="auto" v-model="bulk.textColor"
                          placeholder="#333 or rgba()" />
          </div>
          <div class="tools">
            <v-btn size="small" @click="applyBulkPaint('text-color', bulk.textColor, 'symbol')" :disabled="!bulk.textColor">適用</v-btn>
          </div>
        </div>

        <div class="row two">
          <div>
            <label>line-width を一括（lineのみ）</label>
            <v-text-field type="number" step="0.1" density="compact" variant="underlined" hide-details="auto" v-model="bulk.lineWidth"/>
          </div>
          <div class="tools">
            <v-btn size="small" @click="applyBulkPaint('line-width', numOrNull(bulk.lineWidth), 'line')" :disabled="!bulk.lineWidth">適用</v-btn>
          </div>
        </div>
      </div>

      <hr style="margin:12px 0;">
      <div style="font-size:14px" v-html="item?.attribution"></div>
    </div>
  </div>
</template>

<script>
import MiniTooltip from '@/components/MiniTooltip'

export default {
  name: 'layers-controller',
  components: { MiniTooltip },
  props: {
    // ★ ext-dem-tint と同じ受け方に統一
    mapName: { type: String, required: true },
    item:    { type: Object,  default: ()=>({}) },

    // 開閉は従来通り（親どちらでも）
    modelValue: { type: Boolean, default: true },
    open:       { type: Boolean, default: undefined }
  },
  emits: ['update:modelValue','update:open'],
  data(){
    return {
      menuContentSize:{ width:'520px', height:'auto', margin:'10px', overflow:'hidden', 'user-select':'text' },
      layers: [],
      q: '',
      kv: { layoutKey:'', layoutVal:'', paintKey:'', paintVal:'' },
      bulk: { visibility:'', textColor:'', lineWidth:'' }
    }
  },
  computed:{
    isOpen(){ return (this.open===undefined ? this.modelValue : this.open) !== false },
    // ★ 親→store → MapLibre インスタンス
    map(){ try{ return this.$store?.state?.[this.mapName] }catch(e){ return null } },
    filtered(){
      const k=(this.q||'').toLowerCase()
      if(!k) return this.layers
      return this.layers.filter(l =>
          l.id.toLowerCase().includes(k) ||
          (l.type||'').toLowerCase().includes(k) ||
          (l.source||'').toLowerCase().includes(k) ||
          (l.sourceLayer||'').toLowerCase().includes(k)
      )
    }
  },
  watch:{
    modelValue(v){ if(v===false) this.$emit('update:open', false) },
    open(v){ if(v===false) this.$emit('update:modelValue', false) },

    // ★ Mapの差し替え/初期化に追従
    map:{
      immediate:true,
      handler(m){
        if(!m) return
        m.on?.('styledata', this.refreshFromMap)
        m.on?.('sourcedata', (e)=>{ if(e.isSourceLoaded) this.$nextTick(this.refreshFromMap) })
        this.refreshFromMap()
      }
    }
  },
  methods:{
    refreshFromMap(){
      const m=this.map
      if(!m?.getStyle) return
      const st=m.getStyle()
      if(!st || !Array.isArray(st.layers)) return
      const arr=[]; let z=0
      for(const l of st.layers){ z++; arr.push({ id:l.id, type:l.type, source:l.source, sourceLayer:l['source-layer'], z }) }
      this.layers=arr
    },
    isVisible(id){ try{ return this.map.getLayoutProperty(id,'visibility') !== 'none' }catch(e){ return true } },
    toggleVisibility(id){ try{ this.map.setLayoutProperty(id,'visibility', this.isVisible(id)?'none':'visible') }catch(e){} },
    setAllVisibility(vis){ this.filtered.forEach(l=>{ try{ this.map.setLayoutProperty(l.id,'visibility',vis) }catch(e){} }) },
    moveUp(id){
      try{
        const ids=this.map.getStyle().layers.map(l=>l.id)
        const i=ids.indexOf(id); if(i<=0) return
        this.map.moveLayer(id, ids[i-1]); this.refreshFromMap()
      }catch(e){}
    },
    moveDown(id){
      try{
        const ids=this.map.getStyle().layers.map(l=>l.id)
        const i=ids.indexOf(id); if(i<0||i>=ids.length-1) return
        this.map.moveLayer(id, ids[i+2]||undefined); this.refreshFromMap()
      }catch(e){}
    },
    getLayout(id,key){ try{ return this.map.getLayoutProperty(id,key) }catch(e){ return '' } },
    setLayout(id,key,val){ try{ this.map.setLayoutProperty(id,key,this._coerce(val)) }catch(e){} },
    getPaint(id,key){ try{ return this.map.getPaintProperty(id,key) }catch(e){ return '' } },
    setPaint(id,key,val){ try{ this.map.setPaintProperty(id,key,this._coerce(val)) }catch(e){} },
    getFilterJson(id){ try{ const f=this.map.getFilter(id); return f?JSON.stringify(f):'' }catch(e){ return '' } },
    setFilterJson(id,jsonText){
      try{
        if(!jsonText){ this.map.setFilter(id,null); return }
        const f=JSON.parse(jsonText); if(Array.isArray(f)) this.map.setFilter(id,f)
      }catch(e){}
    },
    applyLayoutKey(id){ if(!this.kv.layoutKey) return; this.setLayout(id,this.kv.layoutKey,this.kv.layoutVal) },
    applyPaintKey(id){ if(!this.kv.paintKey) return; this.setPaint(id,this.kv.paintKey,this.kv.paintVal) },
    applyBulkVisibility(){
      if(!this.bulk.visibility) return
      this.filtered.forEach(l=>{ try{ this.map.setLayoutProperty(l.id,'visibility',this.bulk.visibility) }catch(e){} })
    },
    applyBulkPaint(key,val,typeOnly=null){
      if(val===undefined||val===null||val==='') return
      this.filtered.forEach(l=>{ if(typeOnly && l.type!==typeOnly) return; try{ this.map.setPaintProperty(l.id,key,this._coerce(val)) }catch(e){} })
    },
    numOrNull(v){ if(v===null||v===undefined||v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null },
    numOrObj(v){
      if(v===0 || v==='0') return 0
      if(!v && v!==0) return null
      if(typeof v==='string' && v.trim().startsWith('{')){ try{ return JSON.parse(v) }catch(e){ return v } }
      const n=Number(v); return Number.isFinite(n)?n:v
    },
    arrOrVal(v){
      if(typeof v==='string' && v.trim().startsWith('[')){ try{ return JSON.parse(v) }catch(e){ return v } }
      const n=Number(v); return Number.isFinite(n)?n:v
    },
    _coerce(val){
      if(val==='true') return true
      if(val==='false') return false
      if(typeof val==='string' && val.trim().startsWith('{')){ try{ return JSON.parse(val) }catch(e){ return val } }
      if(typeof val==='string' && val.trim().startsWith('[')){ try{ return JSON.parse(val) }catch(e){ return val } }
      const n=Number(val); if(Number.isFinite(n) && val!=='') return n
      return val
    },
    onHelp(){
      alert([
        '・このUIは MapLibre の現在スタイルに含まれる「全レイヤー」を列挙します。',
        '・表示/非表示（visibility）、順序（moveLayer）、filter(JSON) を編集可能。',
        '・タイプ別の主要 layout/paint を即時反映。',
        '・任意の layout/paint key も直接適用できます。',
        '・Map インスタンスは this.$store.state[mapName] から参照します。'
      ].join('\n'))
    }
  },
  mounted(){
    // ext-dem-tint と同様：ハンドル表示と帰属表記
    const h = document.querySelector('#handle-'+(this.item?.id||''))
    if(h && this.item?.label) h.innerHTML = `<span style="font-size: large;">${this.item.label}</span>`
    this.refreshFromMap()
  }
}
</script>

<style scoped>
.lc-root{ width:100%; max-width:none; box-sizing:border-box; background:#fff; overflow:hidden; display:flex; flex-direction:column; height:100%; min-height:0; }
.lc-toolbar{ display:flex; align-items:center; justify-content:space-between; padding:6px 8px; background:linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0)); border-bottom:1px solid rgba(0,0,0,0.08); min-height:40px; }
.lc-toolbar .v-btn.v-btn--icon{ width:32px; height:32px; }
.lc-toolbar .mx-1{ margin:0 6px !important; }
.lc-title{ font-weight:600; display:flex; align-items:center; gap:8px; }
.lc-tools.compact{ display:flex; align-items:center; gap:2px; flex-wrap:nowrap; overflow:hidden; }

.lc-body{ flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:8px; padding:10px; }

.lc-panel{ background:rgba(0,0,0,0.03); border:1px dashed rgba(0,0,0,0.2); border-radius:10px; padding:8px; }

.lc-list-head{ display:grid; grid-template-columns: 1fr 88px 220px 64px 86px 48px; gap:6px; font-size:11px; color:#6b7280; font-weight:600; letter-spacing:.02em; text-transform:uppercase; padding:0 6px 4px; }
.lc-list-scroll{ max-height:62vh; overflow:auto; }
.lc-item{ display:grid; grid-template-columns: 1fr 88px 220px 64px 86px 48px; align-items:center; gap:6px; padding:6px; border-top:1px solid rgba(0,0,0,0.05); }
.lc-item:first-child{ border-top:none; }
.lc-item .id code{ font-size:12px; }
.type .pill{ display:inline-block; padding:2px 8px; font-size:11px; border-radius:999px; background:#fff; border:1px solid rgba(0,0,0,0.15); }
.src{ display:flex; flex-direction:column; }
.src-main{ font-size:12px; }
.src-sub{ font-size:11px; color:#6b7280; }

.lc-menu{ padding:10px; width:520px; }
.lc-menu .row{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
.lc-menu .row.two{ flex-direction:row; gap:10px; }
.lc-menu .row.two > *{ flex:1 1 0; min-width:0; }
.lc-menu .spacer{ flex:1 1 auto; }
.lc-menu label{ font-size:12px; color:#6b7280; }

:deep(.v-field__outline){ display:none; }
:deep(.v-field--variant-plain .v-field__overlay){ background:transparent; }
</style>
