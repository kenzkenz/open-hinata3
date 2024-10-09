<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      <div class="first-div">
        <draggable v-model="selectedLayers[mapName]" item-key="id" handle=".handle-div" @sort="onsort">
          <template #item="{element}">
            <div class="drag-item">
              <div class="handle-div"><i class="fa-solid fa-up-down fa-lg handle-icon hover"></i></div>
              <div class="label-div">{{element.label}}</div>
              <div class="range-div">
                <input type="range" min="0" max="1" step="0.01" class="range" v-model.number="element.opacity" @input="changeSlider(element)" />
              </div>
              <div class="trash-div" @click="removeLayer(element.id)"><i class="fa-sharp fa-solid fa-trash-arrow-up hover"></i></div>
            </div>
          </template>
        </draggable>
      </div>

      <div class="second-div">
        <Tree
            :nodes="layers"
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
    count:0,
    changeFlg: false,
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
  },
  methods: {
    changeSlider (element){
      const map = this.$store.state[this.mapName]
      // console.log(element.source.obj.type,element.opacity)
      if (element.source.obj.type === 'raster') {
        map.setPaintProperty(element.id, 'raster-opacity', element.opacity)
      } else {
        map.setPaintProperty(element.id, 'fill-extrusion-opacity', element.opacity)
      }
    },
    removeLayer(id){
      const map = this.$store.state[this.mapName]
      this.selectedLayers[this.mapName] = this.selectedLayers[this.mapName].filter(layer => layer.id !== id)
      map.removeLayer(id)
    },
    onsort(){
      this.changeFlg = !this.changeFlg
    },
    onNodeClick (node) {
      if (node.source) {
        if(!this.selectedLayers[this.mapName].find(layers => layers.id === node.id)) {
          this.changeFlg = !this.changeFlg
          this.selectedLayers[this.mapName].unshift(
              {
                id: node.id,
                label: node.label,
                source: node.source,
                layer: node.layer,
                opacity:100
              }
          )
        } else {
          const map = this.$store.state[this.mapName]
          this.selectedLayers[this.mapName] = this.selectedLayers[this.mapName].filter(layer => layer.id !== node.id)
          map.removeLayer(node.id)
        }
      }
    },
  },
  mounted() {
    this.layers = Layers.layers[this.mapName]
  },
  watch: {
    // selectedLayers: {
    //   handler: function(){
    //     alert('変更を検出しました');
    //   },
    //   deep: true
    // },
    changeFlg(){
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
      for (let i = this.selectedLayers[this.mapName].length - 1; i >= 0 ; i--){
        const layer = this.selectedLayers[this.mapName][i]
        if (map.getLayer(layer.layer.id)) map.removeLayer(layer.layer.id)
        if (map.getSource(layer.source.id)) map.removeSource(layer.source.id)
        map.addSource(layer.source.id, layer.source.obj)
        map.addLayer(layer.layer)
        map.setLayoutProperty(layer.layer.id, 'visibility', 'none')
      }
      for (let i = this.selectedLayers[this.mapName].length - 1; i >= 0 ; i--){
        const layer = this.selectedLayers[this.mapName][i]
        map.setLayoutProperty(layer.layer.id, 'visibility', 'visible')
      }
    }
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

