<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      <div class="first-div">
        <draggable v-model="s_selectedLayers[mapName]" item-key="id" handle=".handle-div">
          <template #item="{element}">
            <div class="drag-item">
              <div class="handle-div"><i class="fa-solid fa-up-down fa-lg handle-icon hover"></i></div>
              <div class="label-div">{{element.label}}</div>
              <div class="range-div">
                <input type="range" min="0" max="1" step="0.01" class="range" v-model.number="element.opacity" @input="changeSlider(element)" @mouseover="changeWatchFlg(false)" @mouseleave="changeWatchFlg(true)"/>
              </div>
              <div class="trash-div" @click="removeLayer(element.id)"><i class="fa-sharp fa-solid fa-trash-arrow-up hover"></i></div>
            </div>
          </template>
        </draggable>
        <div style="color: white;font-size: larger;text-align: center">
          下のリストから選んでください。
        </div>
      </div>

      <div class="second-div">
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
import * as Layers from '@/js/layers'
import Tree from "vue3-tree"
import "vue3-tree/dist/style.css"
import draggable from "vuedraggable"

export default {
  name: 'Dialog-layer',
  props: ['mapName'],
  components: {
    Tree,
    draggable
  },
  data: () => ({
    searchText: '',
    watchFlg: true,
    selectedLayers: {
      map01:[],
      map02:[]
    },
    layers:[],
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'},
  }),
  computed: {
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
    changeWatchFlg (bool) {
      this.watchFlg = bool
    },
    changeSlider (element){
      const map = this.$store.state[this.mapName]
      if (element.layers) {
        element.layers.forEach(layer0 => {
          if (element.source.obj.type === 'raster') {
            map.setPaintProperty(layer0.id, 'raster-opacity', element.opacity)
          } else {
            if (layer0.type === 'fill') {
              map.setPaintProperty(layer0.id, 'fill-opacity', element.opacity)
            } else if (layer0.type === 'line') {
              map.setPaintProperty(layer0.id, 'line-opacity', element.opacity)
            } else if (layer0.type === 'fill-extrusion') {
              map.setPaintProperty(layer0.id, 'fill-extrusion-opacity', element.opacity)
            } else if (layer0.type === 'heatmap') {
              map.setPaintProperty(layer0.id, 'heatmap-opacity', element.opacity)
            }
          }
        })
      }
    },
    removeLayer(id){
      const map = this.$store.state[this.mapName]
      this.s_selectedLayers[this.mapName] = this.s_selectedLayers[this.mapName].filter(layer => layer.id !== id)
      map.removeLayer(id)
    },
    onNodeClick (node) {
      if (node.source) {
        if(!this.s_selectedLayers[this.mapName].find(layers => layers.id === node.id)) {
          this.s_selectedLayers[this.mapName].unshift(
              {
                id: node.id,
                label: node.label,
                source: node.source,
                layer: node.layer,
                layers: node.layers,
                opacity: 1
              }
          )
        } else {
          const map = this.$store.state[this.mapName]
          this.s_selectedLayers[this.mapName] = this.s_selectedLayers[this.mapName].filter(layer => layer.id !== node.id)
          map.removeLayer(node.id)
        }
      }
    },
  },
  mounted() {
    this.layers = Layers.layers[this.mapName]
  },
  watch: {
    s_selectedLayers: {
      handler: function(){
        console.log('変更を検出しました')
        if(!this.watchFlg) return
        const map = this.$store.state[this.mapName]
        // まずレイヤーを全削除-------------------------
        const layers = map.getStyle().layers
        if (layers) {
          for (let i = layers.length - 1; i >= 0; i--) {
            const layerId = layers[i].id
            if (layerId.slice(0,2) === 'oh' ) {
              map.removeLayer(layerId)
            }
          }
        }
        // -----------------------------------------
        for (let i = this.s_selectedLayers[this.mapName].length - 1; i >= 0 ; i--){
          const layer = this.s_selectedLayers[this.mapName][i]
          if (layer.layers) {
            layer.layers.forEach(layer0 => {
              if (!map.getSource(layer.source.id)) map.addSource(layer.source.id, layer.source.obj)
              map.addLayer(layer0)
              if (layer.source.obj.type === 'raster') {
                map.setPaintProperty(layer0.id, 'raster-opacity', layer.opacity)
              } else {
                if (layer0.type === 'fill') {
                  map.setPaintProperty(layer0.id, 'fill-opacity', layer.opacity)
                } else if (layer0.type === 'line') {
                  map.setPaintProperty(layer0.id, 'line-opacity', layer.opacity)
                } else if (layer0.type === 'fill-extrusion') {
                  map.setPaintProperty(layer0.id, 'fill-extrusion-opacity', layer.opacity)
                } else if (layer0.type === 'heatmap') {
                  map.setPaintProperty(layer0.id, 'heatmap-opacity', layer.opacity)
                }
              }
            })
          }
        }
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
  overflow: scroll;
}
.second-div {
  min-height: 200px;
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
  left:30px;
  width:calc(100% - 30px);
}
.range{
  width:calc(100% - 30px);
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
  left:30px;
  width:calc(100% - 30px);
  padding-left: 5px;
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

