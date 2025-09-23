<!-- components/ext-label-only.vue (final, validated, resetAll強化) -->
<template>
  <div class="label-controller-root" v-show="isOpen">
    <!-- Toolbar（検索／可視切替のみ） -->
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
        <v-btn icon variant="text" class="allvis" :title="'すべて表示'" @click="setAllVisibility(true)">
          <v-icon>mdi-eye</v-icon>
        </v-btn>
        <v-btn icon variant="text" class="allvis" :title="'すべて非表示'" @click="setAllVisibility(false)">
          <v-icon>mdi-eye-off</v-icon>
        </v-btn>
        <v-btn icon variant="text" class="allvis" :title="'すべてリセット'" @click="resetAll">
          <v-icon>mdi-backup-restore</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Body -->
    <div class="body">
      <div class="panel">
        <!-- ヘッダ行 -->
        <div class="list-head">
          <span>レイヤー名</span><span>種別</span><span>表示</span><span>編集</span>
        </div>
        <!-- リスト -->
        <div class="list-scroll">
          <div class="item" v-for="(ly, i) in filtered" :key="ly.id + '-' + i">
            <div class="id"><code :title="ly.id">{{ ly.displayName }}</code></div>
            <div class="kind">
              <v-chip v-if="ly.hasText" size="small" class="chip chip-text" label>ラベル</v-chip>
              <v-chip v-if="ly.hasIcon" size="small" class="chip chip-icon" label>アイコン</v-chip>
            </div>
            <div class="vis">
              <v-btn icon size="small" variant="text" :title="isActuallyVisible(ly.id) ? '非表示' : '表示'" @click="toggleVisibility(ly.id)">
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

        <!-- ▼ 一括操作（カード直下） -->
        <div class="bulk-controls under-card">
          <v-text-field v-model.trim="bulk.textColor" density="compact" hide-details variant="outlined" placeholder="#333 or rgba()" class="bulk-color" />
          <v-btn size="small" variant="tonal" class="mr-2" @click="applyAllTextColor" :disabled="!bulk.textColor">全ラベル色</v-btn>
          <v-text-field v-model.number="bulk.textSizeFactor" type="number" step="0.1" min="0.1" density="compact" hide-details variant="outlined" placeholder="倍率 X" class="bulk-factor" />
          <v-btn size="small" color="primary" variant="flat" @click="multiplyAllTextSize">X倍に</v-btn>
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
              <v-text-field v-model="edit.form.iconSize" type="number" step="0.1" density="comfortable" variant="outlined" hide-details placeholder="例: 1.0" :disabled="!edit.target?.hasIcon" />
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
            <div class="minz-cell">
              <label class="field-label">minzoom</label>
              <v-switch class="minz-switch" v-model="edit.form.minzoomEnabled" hide-details density="compact" inset :color="edit.form.minzoomEnabled ? 'primary' : undefined" :ripple="false" />
              <label class="field-label" style="padding-left: 14px;">オフにすると小ズームでも表示されます。</label>
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4 py-3 d-flex justify-end">
          <v-btn variant="outlined" @click="resetCurrent" class="mr-auto">リセット</v-btn>
          <v-btn variant="text" @click="edit.open=false">閉じる</v-btn>
          <v-btn color="primary" @click="applyEdit">反映</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import osmBrightLabelOnly from '@/assets/json/osm_bright_label_only.json'

const HIDE_PREFIX  = 'oh-vector-osm-bright-labels-only-'
const ICON_ONLY_ID = 'oh-vector-osm-bright-labels-only-poi-level-1-1'
const DEFAULT_TEXT_SIZE = 12

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
      kind: 'all',
      layers: [],
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
          minzoomEnabled: true,
          minzoomOriginal: null,
        },
      },
      bulk: {
        textColor: '',
        textSizeFactor: 1.0,
      },
      localZ: 2000,
      originalStyle: null,
      textSizeBaseline: Object.create(null),
      idSet: new Set(), // このコンポが管理するレイヤーID集合（symbolかつテキスト or ICON_ONLY）
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
    map(){ return this.$store.state?.[this.mapName] || null },
  },
  watch:{
    modelValue(v){ if(v===false) this.$emit('update:open', false) },
    open(v){ if(v===false) this.$emit('update:modelValue', false) },
  },
  mounted(){
    this.originalStyle = JSON.parse(JSON.stringify(osmBrightLabelOnly))

    // 管轄レイヤーIDを抽出（symbol かつ text-field を持つもの、もしくは ICON_ONLY_ID）
    const ids = []
    for (const l of this.originalStyle.layers || []) {
      if (l.type !== 'symbol') continue
      const hasText = !!(l.layout && l.layout['text-field'] != null)
      const isIconOnly = l.id === ICON_ONLY_ID
      if (hasText || isIconOnly) ids.push(l.id)
    }
    this.idSet = new Set(ids)

    this.buildFromJson()
  },
  methods:{
    // ===== 一括操作 =====
    applyAllTextColor(){
      const color = (this.bulk.textColor||'').trim()
      if(!color) return
      this.eachTextSymbolLayerLive((id)=>{
        try{ if(this.map?.getLayer?.(id)) this.map.setPaintProperty(id, 'text-color', color) }catch(e){}
        const jsonLayer = this.findLayerInJson(id)
        if(jsonLayer){ jsonLayer.paint = jsonLayer.paint || {}; jsonLayer.paint['text-color'] = color }
      })
    },
    multiplyAllTextSize(){
      const f = Number(this.bulk.textSizeFactor)
      if(!Number.isFinite(f) || f <= 0) return

      this.eachTextSymbolLayerLive((id, liveLayer)=>{
        const jsonLayer = this.findLayerInJson(id)
        const origLayer = this.findLayerInOriginal(id)

        // ベースは originalStyle 優先。無ければ live を使うが外側の * を剥がす
        let base = origLayer?.layout?.['text-size']
        if(base === undefined || base === null){
          const live = liveLayer?.layout?.['text-size']
          base = this.stripOuterMultiply(live) ?? DEFAULT_TEXT_SIZE
        }

        // 初回はベース保存、2回目以降は保存ベースを使用
        if(this.textSizeBaseline[id] === undefined){
          this.textSizeBaseline[id] = JSON.parse(JSON.stringify(base))
        } else {
          base = this.textSizeBaseline[id]
        }

        const next = this.mulExpr(base, f)
        const nextClamped = this.clampTextSize(next)

        try{ if(this.map?.getLayer?.(id)) this.map.setLayoutProperty(id, 'text-size', nextClamped) }catch(e){}

        if(jsonLayer){
          jsonLayer.layout = jsonLayer.layout || {}
          jsonLayer.layout['text-size'] = JSON.parse(JSON.stringify(nextClamped))
        }
      })
    },
    mulExpr(valueOrExpr, factor){
      if(typeof valueOrExpr === 'number') return valueOrExpr * factor
      if(Array.isArray(valueOrExpr)) return this.scaleExpression(valueOrExpr, factor)
      if(valueOrExpr && typeof valueOrExpr === 'object'){
        const v = JSON.parse(JSON.stringify(valueOrExpr))
        if(Array.isArray(v.stops)){
          v.stops = v.stops.map(stop=>{
            if(Array.isArray(stop) && stop.length >= 2){
              const zoom = stop[0]
              const size = stop[1]
              if(typeof size === 'number') return [zoom, size * factor]
              if(Array.isArray(size)) return [zoom, this.scaleExpression(size, factor)]
              const n = Number(size)
              if(Number.isFinite(n)) return [zoom, n * factor]
              return [zoom, size]
            }
            return stop
          })
          return v
        }
        return valueOrExpr
      }
      const n = Number(valueOrExpr)
      if(Number.isFinite(n)) return n * factor
      return valueOrExpr
    },
    scaleExpression(expr, factor){
      if(Array.isArray(expr) && expr[0] === '*' && expr.length === 3){
        const k = expr[2]
        if(typeof k === 'number') return ['*', expr[1], k * factor]
      }
      return ['*', expr, factor]
    },
    stripOuterMultiply(expr){
      if(Array.isArray(expr) && expr[0] === '*' && expr.length === 3){
        return expr[1]
      }
      return expr
    },
    clampTextSize(val){
      const MIN = 6, MAX = 64
      if(typeof val === 'number') return Math.max(MIN, Math.min(MAX, val))
      if(Array.isArray(val)) return ['clamp', MIN, val, MAX]
      if(val && typeof val === 'object' && Array.isArray(val.stops)){
        const v = JSON.parse(JSON.stringify(val))
        v.stops = v.stops.map(s=>{
          if(Array.isArray(s) && s.length>=2 && typeof s[1]==='number'){
            s[1] = Math.max(MIN, Math.min(MAX, s[1]))
          }
          return s
        })
        return v
      }
      return val
    },

    // ===== 走査ユーティリティ =====
    eachTextSymbolLayer(fn){
      const style = osmBrightLabelOnly
      if(!style || !Array.isArray(style.layers)) return
      for(const l of style.layers){
        if(l.type !== 'symbol') continue
        const hasText = !!(l.layout && l.layout['text-field'] != null)
        if(!hasText) continue
        fn(l.id, l)
      }
    },
    eachTextSymbolLayerLive(fn){
      try{
        const style = this.map?.getStyle?.()
        const layers = style?.layers || []
        for(const l of layers){
          if(l.type !== 'symbol') continue
          if(!this.idSet.has(l.id)) continue // 対象外レイヤーは無視
          const hasText = !!(l.layout && l.layout['text-field'] != null)
          const isIconOnly = l.id === ICON_ONLY_ID
          if(!hasText && !isIconOnly) continue
          fn(l.id, l)
        }
      }catch(e){}
    },

    // ===== 既存機能 =====
    buildFromJson(){
      const style = osmBrightLabelOnly
      const list = []
      if(!style || !Array.isArray(style.layers)) return
      for(const l of style.layers){
        if(l.type !== 'symbol') continue
        const hasText = !!(l.layout && l.layout['text-field'] != null)
        const hasIcon = l.id === ICON_ONLY_ID
        if(!this.idSet.size || this.idSet.has(l.id)){
          list.push({
            id: l.id,
            displayName: (l.id || '').startsWith(HIDE_PREFIX) ? l.id.slice(HIDE_PREFIX.length) : l.id,
            hasText, hasIcon,
            visible: (l.layout?.visibility ?? 'visible') !== 'none'
          })
        }
      }
      this.layers = list
    },
    toggleVisibility(id){
      const t = this.layers.find(x=>x.id===id); if(!t) return
      const newVis = !this.isActuallyVisible(id)
      t.visible = newVis
      const l = this.findLayerInJson(id)
      if(l){ l.layout = l.layout || {}; l.layout.visibility = newVis ? 'visible' : 'none' }
      this.setMapVisibility(id, newVis)
    },
    setAllVisibility(flag){
      for(const t of this.layers){
        t.visible = !!flag
        const l = this.findLayerInJson(t.id)
        if(l){ l.layout = l.layout || {}; l.layout.visibility = flag ? 'visible' : 'none' }
        this.setMapVisibility(t.id, !!flag)
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
    setMapVisibility(id, flag){
      try{
        if(this.map?.getLayer?.(id)){
          this.map.setLayoutProperty(id, 'visibility', flag ? 'visible' : 'none')
        }
      }catch(e){}
    },
    openEdit(ly){
      this.edit.target = ly
      const l = this.findLayerInJson(ly.id)
      const layout = l?.layout || {}
      const paint  = l?.paint || {}
      const orig = this.findLayerInOriginal(ly.id)
      const originalMin = (orig && typeof orig.minzoom !== 'undefined') ? orig.minzoom : null
      this.edit.form = {
        textSize:        this.numOrNull(layout['text-size']),
        iconSize:        this.numOrNull(layout['icon-size']),
        textColor:       paint['text-color'] ?? '',
        textHaloColor:   paint['text-halo-color'] ?? '',
        textHaloWidth:   this.numOrNull(paint['text-halo-width']),
        symbolPlacement: layout['symbol-placement'] ?? null,
        minzoomEnabled:  (typeof l?.minzoom !== 'undefined'),
        minzoomOriginal: originalMin,
      }
      this.edit.open = true
    },
    applyEdit(){
      const id = this.edit.target?.id; if(!id) return
      const l = this.findLayerInJson(id); if(!l) return
      l.layout = l.layout || {}; l.paint = l.paint || {}
      if(this.edit.form.textSize != null) l.layout['text-size'] = Number(this.edit.form.textSize); else delete l.layout['text-size']
      if(this.edit.form.symbolPlacement) l.layout['symbol-placement'] = this.edit.form.symbolPlacement; else delete l.layout['symbol-placement']
      if(id === ICON_ONLY_ID && this.edit.target?.hasIcon){
        if(this.edit.form.iconSize != null) l.layout['icon-size'] = Number(this.edit.form.iconSize); else delete l.layout['icon-size']
      } else {
        delete l.layout['icon-size']
      }
      if(this.edit.form.textColor)     l.paint['text-color'] = this.edit.form.textColor;         else delete l.paint['text-color']
      if(this.edit.form.textHaloColor) l.paint['text-halo-color'] = this.edit.form.textHaloColor; else delete l.paint['text-halo-color']
      if(this.edit.form.textHaloWidth != null) l.paint['text-halo-width'] = Number(this.edit.form.textHaloWidth); else delete l.paint['text-halo-width']
      if(this.edit.form.minzoomEnabled){
        if(this.edit.form.minzoomOriginal != null) l.minzoom = this.edit.form.minzoomOriginal
        else delete l.minzoom
      } else {
        delete l.minzoom
      }
      const m = this.map
      try{
        if(m?.getLayer?.(id)){
          if('text-size' in l.layout) m.setLayoutProperty(id,'text-size', l.layout['text-size']); else m.setLayoutProperty(id,'text-size', null)
          if('symbol-placement' in l.layout) m.setLayoutProperty(id,'symbol-placement', l.layout['symbol-placement'])
          if(id === ICON_ONLY_ID){
            if('icon-size' in l.layout) m.setLayoutProperty(id,'icon-size', l.layout['icon-size']); else m.setLayoutProperty(id,'icon-size', null)
          } else {
            m.setLayoutProperty(id,'icon-size', null)
          }
          if('text-color' in l.paint) m.setPaintProperty(id,'text-color', l.paint['text-color']); else m.setPaintProperty(id,'text-color', null)
          if('text-halo-color' in l.paint) m.setPaintProperty(id,'text-halo-color', l.paint['text-halo-color']); else m.setPaintProperty(id,'text-halo-color', null)
          if('text-halo-width' in l.paint) m.setPaintProperty(id,'text-halo-width', l.paint['text-halo-width']); else m.setPaintProperty(id,'text-halo-width', null)
          const max = this.resolveMaxZoom(id, l)
          const min = this.edit.form.minzoomEnabled ? (this.edit.form.minzoomOriginal != null ? this.edit.form.minzoomOriginal : 0) : 1
          m.setLayerZoomRange(id, min, max)
        }
      }catch(e){}
    },
    resetCurrent(){
      const trg = this.edit.target; if(!trg) return
      const orig = this.findLayerInOriginal(trg.id)
      const cur  = this.findLayerInJson(trg.id)
      if(!orig || !cur) return
      cur.layout = JSON.parse(JSON.stringify(orig.layout || {}))
      cur.paint  = JSON.parse(JSON.stringify(orig.paint  || {}))
      if(typeof orig.minzoom !== 'undefined') cur.minzoom = orig.minzoom
      else delete cur.minzoom
      this.openEdit({ id: trg.id, displayName: trg.displayName, hasIcon: trg.hasIcon, hasText: trg.hasText })
      const m = this.map
      try{
        if(m?.getLayer?.(trg.id)){
          m.setLayoutProperty(trg.id,'visibility', (cur.layout?.visibility ?? 'visible') !== 'none' ? 'visible' : 'none')
          if('text-size' in cur.layout) m.setLayoutProperty(trg.id,'text-size', cur.layout['text-size']); else m.setLayoutProperty(trg.id,'text-size', null)
          if('symbol-placement' in cur.layout) m.setLayoutProperty(trg.id,'symbol-placement', cur.layout['symbol-placement'])
          if(trg.id === ICON_ONLY_ID){
            if('icon-size' in cur.layout) m.setLayoutProperty(trg.id,'icon-size', cur.layout['icon-size']); else m.setLayoutProperty(trg.id,'icon-size', null)
          } else {
            m.setLayoutProperty(trg.id,'icon-size', null)
          }
          m.setPaintProperty(trg.id,'text-color',      ('text-color'      in (cur.paint||{})) ? cur.paint['text-color'] : null)
          m.setPaintProperty(trg.id,'text-halo-color', ('text-halo-color' in (cur.paint||{})) ? cur.paint['text-halo-color'] : null)
          m.setPaintProperty(trg.id,'text-halo-width', ('text-halo-width' in (cur.paint||{})) ? cur.paint['text-halo-width'] : null)
          const max = this.resolveMaxZoom(trg.id, cur)
          const min = (typeof cur.minzoom !== 'undefined') ? cur.minzoom : 1
          m.setLayerZoomRange(trg.id, min, max)
        }
      }catch(e){}
    },
    resetAll(){
      // 1) 倍率適用ベースを反映してからクリア（対象IDのみ）
      this.eachTextSymbolLayerLive((id)=>{
        const base = this.textSizeBaseline[id]
        if(base !== undefined){
          const val = JSON.parse(JSON.stringify(base))
          try{ if(this.map?.getLayer?.(id)) this.map.setLayoutProperty(id, 'text-size', val) }catch(e){}
          const jsonLayer = this.findLayerInJson(id)
          if(jsonLayer){
            jsonLayer.layout = jsonLayer.layout || {}
            if(val === null) delete jsonLayer.layout['text-size']
            else jsonLayer.layout['text-size'] = JSON.parse(JSON.stringify(val))
          }
        }
      })
      this.textSizeBaseline = Object.create(null)

      // 2) 作業JSONを元JSONで配列ごと完全復元
      if(!this.originalStyle) return
      osmBrightLabelOnly.layers = JSON.parse(JSON.stringify(this.originalStyle.layers))

      // 3) UIリストを再構築
      this.buildFromJson()

      // 4) MapLibreへ対象IDのみ反映
      const m = this.map
      for (const cur of osmBrightLabelOnly.layers) {
        if(cur.type !== 'symbol') continue
        if(!this.idSet.has(cur.id)) continue
        const ui = this.layers.find(x=>x.id===cur.id)
        try{
          if(m?.getLayer?.(cur.id)){
            m.setLayoutProperty(cur.id, 'visibility', (ui?.visible ? 'visible' : 'none'))
            m.setLayoutProperty(cur.id, 'text-size', ('text-size' in (cur.layout||{})) ? cur.layout['text-size'] : null)
            if('symbol-placement' in (cur.layout||{})) m.setLayoutProperty(cur.id, 'symbol-placement', cur.layout['symbol-placement'])
            if(cur.id === ICON_ONLY_ID){
              m.setLayoutProperty(cur.id, 'icon-size', ('icon-size' in (cur.layout||{})) ? cur.layout['icon-size'] : null)
            } else {
              m.setLayoutProperty(cur.id, 'icon-size', null)
            }
            m.setPaintProperty(cur.id, 'text-color',      ('text-color'      in (cur.paint||{})) ? cur.paint['text-color'] : null)
            m.setPaintProperty(cur.id, 'text-halo-color', ('text-halo-color' in (cur.paint||{})) ? cur.paint['text-halo-color'] : null)
            m.setPaintProperty(cur.id, 'text-halo-width', ('text-halo-width' in (cur.paint||{})) ? cur.paint['text-halo-width'] : null)
            const max = this.resolveMaxZoom(cur.id, cur)
            const min = (typeof cur.minzoom !== 'undefined') ? cur.minzoom : 1
            m.setLayerZoomRange(cur.id, min, max)
          }
        }catch(e){}
      }
    },
    resolveMaxZoom(id, layerJson){
      const jsonMax = (typeof layerJson?.maxzoom !== 'undefined') ? layerJson.maxzoom : undefined
      if(typeof jsonMax !== 'undefined') return jsonMax
      try{
        const lyr = this.map?.getLayer?.(id)
        if(lyr && typeof lyr.maxzoom !== 'undefined') return lyr.maxzoom
      }catch(e){}
      return 24
    },
    findLayerInJson(id){ return osmBrightLabelOnly.layers.find(x=>x.id===id) },
    findLayerInOriginal(id){ return this.originalStyle?.layers?.find(x=>x.id===id) || null },
    numOrNull(v){ if(v===null || v===undefined || v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null },
  },
}
</script>

<style scoped>
.label-controller-root{ width: 420px; max-width: 100%; box-sizing: border-box; background: #fff; border-radius: 10px; border: 1px solid rgba(0,0,0,.08); box-shadow: 0 6px 22px rgba(0,0,0,.08); overflow: hidden; display: flex; flex-direction: column; }
.toolbar{ display:flex; align-items:center; padding:10px 12px; background:linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,0)); border-bottom:1px solid rgba(0,0,0,.08); }
.tools{ display:flex; align-items:center; gap:6px; width:100%; flex-wrap:nowrap; }
.search{ flex:1 1 auto; min-width:100px; max-width:150px; }
.allvis{ margin-left:0; }
.body{ padding:8px; }
.panel{ background:rgba(0,0,0,.03); border:1px dashed rgba(0,0,0,.2); border-radius:10px; padding:8px; }
.list-head{ display:grid; grid-template-columns: minmax(0,1fr) 96px 44px 44px; gap:8px; font-size:12px; line-height:1.2; color:#6b7280; font-weight:600; letter-spacing:.02em; text-transform:uppercase; padding:0 8px 4px; min-height:32px; align-items:center; }
.list-scroll{ max-height:48vh; overflow:auto; padding:0 8px 6px; }
.item{ display:grid; grid-template-columns: minmax(0,1fr) 96px 44px 44px; align-items:center; gap:8px; padding: 6px 8px; border-top:1px solid rgba(0,0,0,.06); min-height: 40px; }
.item:first-child{ border-top:none; }
.id{ min-width:0; }
.id code{ display:block; font-size:12px; line-height:1.25; white-space: normal; word-break: break-word; overflow: visible; margin:0; padding:0; }
.kind{ display:flex; align-items:center; gap:4px; flex-wrap:nowrap; white-space:nowrap; min-width:0; }
.chip{ border-radius:8px !important; height:22px !important; line-height:22px !important; font-size:11px !important; padding:0 6px !important; min-width:auto !important; margin:0 !important; }
.chip-text{ background:#eef6ff; border:1px solid #cfe6ff; }
.chip-icon{ background:#f9f3ff; border:1px solid #eadcff; }
.vis :deep(.v-btn), .edit :deep(.v-btn){ width:32px; height:32px; }
.vis :deep(.v-icon), .edit :deep(.v-icon){ font-size:20px; }
.bulk-controls.under-card{ display:flex; align-items:center; gap:8px; padding:8px; margin-top:4px; border-top:1px dashed rgba(0,0,0,.15); background:rgba(255,255,255,.6); }
.bulk-controls .bulk-color{ width:160px; }
.bulk-controls .bulk-factor{ width:110px; }
.editor-dialog :deep(.v-overlay__scrim){ background: rgba(15,18,25,0.5) !important; }
.editor-body{ padding:8px 4px; }
.grid.two-col{ display:grid; gap:12px; grid-template-columns: 1fr 1fr; }
@media (max-width:560px){ .grid.two-col{ grid-template-columns:1fr; } }
.field-label{ display:block; margin-bottom:6px; font-size:12px; color:#6b7280; }
.minz-cell{ display:flex; align-items:center; gap:10px; }
:deep(.v-field--variant-outlined){ --v-field-padding-start:8px; }
:deep(.v-field__outline__start), :deep(.v-field__outline__end){ opacity:.9; }
</style>
