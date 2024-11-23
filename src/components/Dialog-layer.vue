<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :id="'container-div-' + mapName" :style="menuContentSize">
      <div :id="'first-div-' + mapName" class="first-div">
        <draggable @start="onStart" @end="onEnd" v-model="s_selectedLayers[mapName]" item-key="id" handle=".handle-div">
          <template #item="{element}">
            <div class="drag-item">

              <div class="visible-layer-div">
                <v-icon @click="toggleCheck(element)" class="clickable-icon">
                  {{ element.visibility ? 'mdi-eye' : 'mdi-eye-off' }}
                </v-icon>
              </div>

              <div class="handle-div"><i class="fa-solid fa-up-down fa-lg handle-icon hover"></i></div>
              <div class="info-div" @click="infoOpen(element,true)">
                <v-icon v-if="element.ext">mdi-cog</v-icon>
                <v-icon v-if="!element.ext">mdi-information</v-icon>
              </div>
              <div class="label-div">{{element.label}}</div>
              <div class="range-div">
<!--                <input type="range" min="0" max="1" step="0.01" class="range" v-model.number="element.opacity" @input="changeSlider(element)"/>-->
                <input type="range" min="0" max="1" step="0.01" class="range" v-model.number="element.opacity" @input="inputSlider(element)" @change="changeSlider" @mouseover="changeWatchFlg(false)" @mouseleave="changeWatchFlg(true)"/>
              </div>
              <div class="trash-div" @click="removeLayer(element.id)"><i class="fa-sharp fa-solid fa-trash-arrow-up hover"></i></div>
            </div>
          </template>
        </draggable>
        <div style="color: white;font-size: larger;text-align: center">
          下のリストから選んでください。
        </div>
      </div>

      <div :id="'center-div-' + mapName" class="center-div"></div>

      <div :id="'second-div-' + mapName" :style="s_secondDivStyle" class="second-div">
        <v-text-field label="地図抽出" v-model="searchText" style="margin-top: 10px"></v-text-field>
        <Tree
            :nodes="layers"
            :search-text="searchText"
            :use-checkbox="false"
            :use-icon="true"
            @nodeClick="onNodeClick"
        />
      </div>
    </div>
  </Dialog>
</template>

<script>
let infoCount = 0
import * as Layers from '@/js/layers'
import Tree from "vue3-tree"
import "vue3-tree/dist/style.css"
import draggable from "vuedraggable"
import mw5 from '@/js/mw5'
import * as turf from '@turf/turf'
// import {stdLayer, stdSource} from "@/js/layers";

export default {
  name: 'Dialog-layer',
  props: ['mapName'],
  components: {
    Tree,
    draggable
  },
  data: () => ({
    isDragging:false,
    isChecked: true,
    searchText: '',
    selectedLayers: {
      map01:[],
      map02:[]
    },
    layers:[],
    menuContentSize: {'height': '600px','margin': '10px', 'user-select': 'text'},
    // secondDivStyle: {'height': '390px', 'overflow': 'auto', 'user-select': 'text'},
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_secondDivStyle: {
      get() {
        return this.$store.state.secondDivStyle
      },
      set(value) {
        this.$store.state.secondDivStyle = value
      }
    },
    s_lngRange () {
      return this.$store.state.lngRange
    },
    s_latRange () {
      return this.$store.state.latRange
    },
    s_dialogsINfo () {
      return this.$store.state.dialogsInfo
    },
    s_dialogs () {
      return this.$store.state.dialogs.layerDialog
    },
    s_selectedLayers: {
      get() {
        return this.$store.state.selectedLayers
      },
      set(value) {
        this.$store.state.selectedLayers = value
      }
    },
  },
  methods: {
    onStart () {
      this.isDragging = true
    },
    onEnd () {
      this.isDragging = false
      this.$store.state.watchFlg = !this.$store.state.watchFlg
      this.$store.state.watchFlg = true
      this.zoomOperation(500)
    },
    toggleCheck(element) {
      this.$store.state.watchFlg = true
      const map = this.$store.state[this.mapName]
      element.layers.forEach(layer0 => {
        let visible
        if (element.visibility) {
          visible = 'visible'
        } else {
          visible = 'none'
        }

        if (layer0.id === 'oh-mw-dummy') {
          const layers = map.getStyle().layers
          layers.forEach(layer => {
            if (layer.id.slice(0, 5) === 'oh-mw') {
              map.setLayoutProperty(layer.id, 'visibility', visible)
            }
          })
        } else {
          console.log(layer0.id,visible)
          map.setLayoutProperty(layer0.id, 'visibility', visible)
        }
      })
      element.visibility = !element.visibility
      this.zoomOperation(1000)
    },
    infoOpen (element,isNew) {
      this.$store.commit('incrDialogMaxZindex')
      const result = this.s_dialogsINfo[this.mapName].find(el => el.id === element.id)
      const dialogEl = document.querySelector('#dialog-div-layerDialog-' + this.mapName)
      let top = dialogEl.offsetTop + 'px'
      let left
      if (window.innerWidth > 1000) {
        left = (dialogEl.offsetLeft + dialogEl.offsetWidth + 5) + 'px'
      } else {
        left = '10px'
      }

      if (top === '0px') {
        top = '100px'
        left = '10px'
      }

      const dialogDivs = document.querySelectorAll(".dialog-info-div")
      if (dialogDivs.length > 0) {
        const lastDiv = dialogDivs[dialogDivs.length - 1];
        const rect = lastDiv.getBoundingClientRect();
        top = (rect.top + 20) + 'px'
        left = (rect.left + 20) + 'px'
      } else {
        top = Number(top.replace('px','')) + (infoCount * 20) + 'px'
        left = Number(left.replace('px','')) + (infoCount * 20) + 'px'
        infoCount++
      }

      console.log(element.label,top,left)

      if (!result) {
        const infoDialog =
            {
              id: element.id,
              label: element.label,
              attribution: element.attribution,
              ext: element.ext,
              style: {
                // width: '200px',
                width: 'auto',
                display: 'block',
                top: top,
                left: left,
                'z-index': this.$store.state.dialogMaxZindex
              }
            }
        this.$store.commit('pushDialogsInfo', {mapName: this.mapName, dialog: infoDialog})
        const dialogDivs = document.querySelectorAll(".dialog-info-div")
        console.log(dialogDivs.length)

      } else {
        if (isNew) {
          result.style.display = 'block'
          result.style["z-index"] = this.$store.state.dialogMaxZindex
        }
      }


      // const lastDiv = dialogDivs[dialogDivs.length - 1]
      // lastDiv.style.top = top
      // lastDiv.style.left = left

    },
    changeWatchFlg (bool) {
      this.$store.state.watchFlg = bool
    },
    changeSlider () {
      this.zoomOperation(500)
    },
    inputSlider (element){
      const map = this.$store.state[this.mapName]
      if (element.layers) {
        element.layers.forEach(layer0 => {
          if (layer0.id === 'oh-mw-dummy') {
            const layers = map.getStyle().layers
            layers.forEach(layer => {
              if (layer.id.slice(0,5) === 'oh-mw') {
                if (layer.type === 'raster') {
                  map.setPaintProperty(layer.id, 'raster-opacity', element.opacity)
                } else if (layer.type === 'symbol') {
                  map.setPaintProperty(layer.id, 'text-opacity', element.opacity)
                }
              }
            })
          }
          // console.log(layer0.type)

          let opacity
          if (layer0['max-opacity']) {
            opacity = element.opacity * layer0['max-opacity']
          } else {
            opacity = element.opacity
          }
          if (layer0.type === 'raster') {
            map.setPaintProperty(layer0.id, 'raster-opacity', opacity)
          } else if (layer0.type === 'fill') {
            map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
          } else if (layer0.type === 'line') {
            map.setPaintProperty(layer0.id, 'line-opacity', opacity)
          } else if (layer0.type === 'fill-extrusion') {
            map.setPaintProperty(layer0.id, 'fill-extrusion-opacity', opacity)
          } else if (layer0.type === 'heatmap') {
            map.setPaintProperty(layer0.id, 'heatmap-opacity', opacity)
          } else if (layer0.type === 'circle') {
            map.setPaintProperty(layer0.id, 'circle-opacity', opacity)
          } else if (layer0.type === 'symbol') {
            map.setPaintProperty(layer0.id, 'text-opacity', opacity)
          } else if (layer0.type === 'background') {
            map.setPaintProperty(layer0.id, 'background-opacity', opacity)
          }
        })
      }
    },
    zoomOperation (timeOut) {
      // なぜか一度ズームしないと最適化ベクタータイルが反映しない。
      const map = this.$store.state.map01
      const zoom = map.getZoom()
      setTimeout(() => {
        map.setZoom(12)
        map.setZoom(zoom)
      },timeOut)
    },
    removeLayer(id){
      this.s_selectedLayers[this.mapName] = this.s_selectedLayers[this.mapName].filter(layer => layer.id !== id)
      this.$store.state.dialogsInfo[this.mapName] = this.$store.state.dialogsInfo[this.mapName].filter(layer => layer.id !== id)
      this.$store.state.watchFlg = true
      this.zoomOperation(1000)
    },
    onNodeClick (node) {
      if (node.layers) {
        this.$store.state.watchFlg = true
        const map = this.$store.state[this.mapName]
        if(!this.s_selectedLayers[this.mapName].find(layers => layers.id === node.id)) {
          // const opacity =
          console.log(node)
          this.s_selectedLayers[this.mapName].unshift(
              {
                id: node.id,
                label: node.label,
                source: node.source,
                sources: node.sources,
                layer: node.layer,
                layers: node.layers,
                attribution: node.attribution,
                opacity: 1,
                visibility: true,
                ext: node.ext,
                info: node.info,
              }
          )
        } else {
          this.s_selectedLayers[this.mapName] = this.s_selectedLayers[this.mapName].filter(layer => layer.id !== node.id)
          map.removeLayer(node.id)
        }
        this.zoomOperation(1000)
      }
    },
    addLayers() {
      if(!this.$store.state.watchFlg && !this.isDragging) return
      // console.log('aaaaaaaaaaaaaaaaa')
      // ------------------------------------------------------------------
      const map = this.$store.state[this.mapName]
      // まずレイヤーを削除-------------------------
      const layers = map.getStyle().layers
      if (layers) {
        for (let i = layers.length - 1; i >= 0; i--) {
          const layerId = layers[i].id
          // console.log(layers[i].id)
          if (layerId.slice(0,2) === 'oh' ) {
            map.removeLayer(layerId)
          }
        }
      }
      // -----------------------------------------
      // console.log(this.mapName)
      for (let i = this.s_selectedLayers[this.mapName].length - 1; i >= 0 ; i--){
        // console.log('bbbbbbbbbbb')

        const layer = this.s_selectedLayers[this.mapName][i]
        if (layer.layers) {
          if (layer.sources) {
            layer.sources.forEach(source => {
              // console.log(source,source.obj)
              if (!map.getSource(source.id)) map.addSource(source.id, source.obj)
            })
          }
          if (layer.source) {
            // console.log(layer)
            if (!map.getSource(layer.source.id)) map.addSource(layer.source.id, layer.source.obj)
          }
          layer.layers.forEach(layer0 => {
            if (layer0.id === 'oh-mw-dummy') {
              this.mw5AddLayers(map,this.mapName)
            } else {
              // console.log(layer0)
              if (!map.getLayer(layer0.id)) {
                  map.addLayer(layer0)
              }
              let opacity
              if (layer0['max-opacity']) {
                opacity = layer.opacity * layer0['max-opacity']
              } else {
                opacity = layer.opacity
              }
              if (layer0.type === 'raster') {
                map.setPaintProperty(layer0.id, 'raster-opacity', opacity)
              } else if (layer0.type === 'fill') {
                map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
              } else if (layer0.type === 'line') {
                map.setPaintProperty(layer0.id, 'line-opacity', opacity)
              } else if (layer0.type === 'fill-extrusion') {
                map.setPaintProperty(layer0.id, 'fill-extrusion-opacity', opacity)
              } else if (layer0.type === 'heatmap') {
                map.setPaintProperty(layer0.id, 'heatmap-opacity', opacity)
              } else if (layer0.type === 'circle') {
                map.setPaintProperty(layer0.id, 'circle-opacity', opacity)
              } else if (layer0.type === 'symbol') {
                map.setPaintProperty(layer0.id, 'text-opacity', opacity)
              } else if (layer0.type === 'background') {
                map.setPaintProperty(layer0.id, 'background-opacity', opacity)
              }
              let visibility
              if (layer.visibility) {
                visibility = 'visible'
              } else {
                visibility = 'none'
              }
              if (layer.visibility === undefined) visibility = 'visible'
              // ここを修正する必要があるが、昔のリンクがなくなれば問題なくなるか？
              // console.log(layer.visibility)
              map.setLayoutProperty(layer0.id, 'visibility',visibility)
            }
          })
          // -------------------------------------------------
          // console.log(layer.ext)
          // console.log(layer)
          // console.log(this.mapName)
          if(!this.isDragging) {
            if (layer.ext) {
              // console.log(layer.ext)
              // alert()
              if (layer.ext.values) {
                // console.log(layer.ext.values)
                layer.ext.values.forEach((v,i) => {
                  // console.log(String(v))
                  this.$store.commit('updateParam', {
                    name: layer.ext.name,
                    mapName: this.mapName,
                    value: String(v),
                    order: i
                  })
                })
              }
              // ここを改修する。
              this.infoOpen(layer,false)
            }
          }
          // -------------------------------------------------
          if (layer.info) this.infoOpen(layer,false)
          // -------------------------------------------------
        }
      }
    },
    mw5AddLayers(map,mapName) {
      // console.log(map._container)
      if (!this.s_selectedLayers[mapName].find(v => v.id === 'oh-mw5')) {
        return
      }
      // まずレイヤーを削除-------------------------
      const layers = map.getStyle().layers
      if (layers) {
        for (let i = layers.length - 1; i >= 0; i--) {
          const layerId = layers[i].id
          if (layerId.slice(0,5) === 'oh-mw' ) {
            if (map.getSource(layerId)) map.removeLayer(layerId)
          }
        }
      }

      if (map.getZoom() <= 7) return;

      mw5.forEach((value) => {
        const poly1 = turf.polygon([
          [
            [this.s_lngRange[0], this.s_latRange[0]],
            [this.s_lngRange[0], this.s_latRange[1]],
            [this.s_lngRange[1], this.s_latRange[1]],
            [this.s_lngRange[1], this.s_latRange[0]],
            [this.s_lngRange[0], this.s_latRange[0]],
          ],
        ])
        const poly2 = turf.polygon([
          [
            [value.extent[0], value.extent[3]],
            [value.extent[0], value.extent[1]],
            [value.extent[2], value.extent[1]],
            [value.extent[2], value.extent[3]],
            [value.extent[0], value.extent[3]],
          ],
        ])
        if (turf.booleanIntersects(poly1, poly2)) {
          if (!map.getSource(value.id)) map.addSource(value.id,{
            type: 'raster',
            tiles: ['https://mapwarper.h-gis.jp/maps/tile/' + value.id + '/{z}/{x}/{y}.png'],
            bounds: [value.extent[0], value.extent[3], value.extent[2], value.extent[1]],
          })

          if (!map.getLayer(value.id)) map.addLayer({
            id: 'oh-mw-' + value.id,
            source: value.id,
            type: 'raster',
            paint: {
              'raster-fade-duration': 0
            }
          })

          const opacity = this.s_selectedLayers[mapName].find(v => v.id === 'oh-mw5').opacity
          map.setPaintProperty('oh-mw-' + value.id, 'raster-opacity', opacity)
          const visibility0 = this.s_selectedLayers[mapName].find(v => v.id === 'oh-mw5').visibility
          console.log(visibility0)
          let visibility
          if (visibility0) {
            visibility = 'visible'
          } else {
            visibility = 'none'
          }
          map.setLayoutProperty('oh-mw-' + value.id, 'visibility',visibility)

        }
      })
    }
  },
  mounted() {
    // ----------------------------------------------------------------------------------------------------------------
    this.layers = Layers.layers[this.mapName];
    // ----------------------------------------------------
    const handle = document.getElementById('center-div-' + this.mapName);
    const topDiv = document.getElementById('first-div-' + this.mapName);
    // const bottomDiv = document.getElementById('second-div-' + this.mapName);
    const container = document.getElementById('container-div-' + this.mapName);

    let isDragging = false;

    // マウスおよびタッチイベントの開始
    const startDrag = () => {
      isDragging = true;
    };

    const endDrag = () => {
      if (isDragging) {
        isDragging = false;
      }
    };

    // マウスおよびタッチイベントの動作
    const dragMove = (clientY) => {
      if (!isDragging) return;
      const containerRect = container.getBoundingClientRect();
      const topHeight = clientY - containerRect.top;
      const bottomHeight = containerRect.height - topHeight - handle.offsetHeight;
      if (topHeight > 0 && bottomHeight > 0) {
        topDiv.style.height = `${topHeight - 8}px`
        this.s_secondDivStyle.height = `${bottomHeight - 8}px`
      }
    };

    // マウスイベントのリスナー
    handle.addEventListener('mousedown', startDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mousemove', (e) => dragMove(e.clientY));

    // タッチイベントのリスナー
    handle.addEventListener('touchstart', startDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        dragMove(e.touches[0].clientY);
      }
    });
  },
  watch: {
    s_lngRange: {
      handler: function(){
        if (this.s_selectedLayers.map01.find(v => v.id === 'oh-mw5') || this.s_selectedLayers.map02.find(v => v.id === 'oh-mw5')) {
          this.addLayers()
        }
      },
      deep: true
    },
    s_watchFlg: {
      handler: function(){
        // alert("333333333")
      },
      deep: true
    },
    s_selectedLayers: {
      handler: function(val){
        console.log('変更を検出しました',this.$store.state.watchFlg,val)
        // ------------------------------------------------------------------
        const map01 = this.$store.state.map01
        const bounds = map01.getBounds()
        // 南西端と北東端の座標を取得
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        this.$store.state.lngRange = [sw.lng,ne.lng]
        this.$store.state.latRange = [sw.lat,ne.lat]
        // ------------------------------------------------------------------
        this.addLayers()

        // const vm = this
        // setTimeout(function() {
        //   vm.$store.state.watchFlg = !vm.$store.state.watchFlg
        //   vm.$store.state.watchFlg = !vm.$store.state.watchFlg
        // },11000)

      },
      deep: true
    },
  },
}
</script>
<style scoped>
.first-div {
  height: 200px;
  min-width: 300px;
  background-color:gray;
  border: #000 1px solid;
  overflow: auto;
  margin-bottom: 5px;
}
.center-div {
  height: 8px;
  background-color:rgba(0,60,136,0.5);
  cursor: grab;
}
.second-div {
  /*min-height: 200px;*/
  background-color: white;
}
.drag-item {
  position:relative;
  height:40px;
  font-size:larger;
  color:white;
  background-color: rgba(157,157,193,1);
  border-bottom: #fff 1px solid;
}
.trash-div{
  font-size: x-large;
  position: absolute;
  top:9px;
  right:10px;
  width:15px;
  color:rgba(0,60,136,0.5);
  cursor: pointer;
}
.hover:hover{
  color: blue;
}
.range-div {
  position:absolute;
  top:10px;
  left:80px;
  width:calc(100% - 80px);
}
.range{
  width:calc(100% - 40px);
}
.handle-div {
  width:30px;
  height:100%;
  background-color:rgba(0,60,136,0.5);
  font-size: x-large;
  padding-left: 6px;
  padding-top: 6px;
  cursor: grab;
}
.label-div{
  position:absolute;
  top:0;
  left:80px;
  width:calc(100% - 80px);
  padding-left: 5px;
}
.visible-layer-div {
  position:absolute;
  top:0;
  left:30px;
  padding-left: 5px;
}
.info-div{
  position:absolute;
  top:0;
  left:55px;
  padding-left: 5px;
}
.v-icon:hover {
  color: blue;
  transition: transform 0.3s ease;
  transform: rotate(360deg);
}
</style>

<style>
.tree-row-item {
  font-size:medium;
  color:dimgray;
}
.tree-list, .tree-row {
  gap:0!important;
}
/*スライダー*/
input[type=range] {
  height: 26px;
  -webkit-appearance: none;
  margin: 0 0;/*修正*/
  width: 100%;
  background-color: rgba(0,0,0,0);/*修正*/
}
input[type=range]:focus {
  outline: none;
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 5px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: 0 0 0 #000000;
  background: #B6B6B6;
  border-radius: 6px;
  border: 1px solid #8A8A8A;
}
input[type=range]::-webkit-slider-thumb {
  box-shadow: 1px 1px 1px #828282;
  border: 1px solid #8A8A8A;
  height: 18px;
  width: 18px;
  border-radius: 18px;
  background: #DADADA;
  cursor: grab;
  -webkit-appearance: none;
  margin-top: -7.5px;
}
@media screen and (max-width:480px) {
  input[type=range]::-webkit-slider-thumb {
    height: 23px;
    width: 30px;
    border-radius: 0;
    margin-top: -12.5px;
  }
  .vue-slider-dot-handle{
    width: 150%!important;
    border-radius:0!important;
  }
}
input[type=range]:focus::-webkit-slider-runnable-track {
  background: #B6B6B6;
}
input[type=range]::-moz-range-track {
  width: 100%;
  height: 5px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: 0 0 0 #000000;
  background: #B6B6B6;
  border-radius: 6px;
  border: 1px solid #8A8A8A;
}
input[type=range]::-moz-range-thumb {
  box-shadow: 1px 1px 1px #828282;
  border: 1px solid #8A8A8A;
  height: 18px;
  width: 18px;
  border-radius: 18px;
  background: #DADADA;
  cursor: grab;
}
input[type=range]::-ms-track {
  width: 100%;
  height: 5px;
  cursor: pointer;
  animate: 0.2s;
  background: transparent;
  border-color: transparent;
  color: transparent;
}
input[type=range]::-ms-fill-lower {
  background: #B6B6B6;
  border: 1px solid #8A8A8A;
  border-radius: 12px;
  box-shadow: 0 0 0 #000000;
}
input[type=range]::-ms-fill-upper {
  background: #B6B6B6;
  border: 1px solid #8A8A8A;
  border-radius: 12px;
  box-shadow: 0 0 0 #000000;
}
input[type=range]::-ms-thumb {
  margin-top: 1px;
  box-shadow: 1px 1px 1px #828282;
  border: 1px solid #8A8A8A;
  height: 18px;
  width: 18px;
  border-radius: 18px;
  background: #DADADA;
  cursor: grab;
}
input[type=range]:focus::-ms-fill-lower {
  background: #B6B6B6;
}
input[type=range]:focus::-ms-fill-upper {
  background: #B6B6B6;
}
/*スライダーここまで*/
</style>

