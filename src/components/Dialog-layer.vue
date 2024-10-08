<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      <div class="first-div">
        <draggable v-model="selectedLayers[mapName]" item-key="id" handle=".handle" @sort="onsort">
          <template #item="{element}">
            <div class="drag-item handle">
              <span class="">{{element.label}}</span>
              <div class="close-div" @click="removeLayer(element.id)"><i class="fa-sharp fa-solid fa-trash-arrow-up hover"></i></div>
            </div>
          </template>
        </draggable>
      </div>

      <div class="second-div">
        <Tree
            :nodes="layers"
            :use-checkbox="false"
            :use-icon="true"
            show-child-count
            @nodeClick="onNodeClick"
        />
      </div>
    </div>
  </Dialog>
</template>

<script>

import Tree from "vue3-tree"
import "vue3-tree/dist/style.css"
import * as Layers from '@/js/layers'
import draggable from "vuedraggable"

export default {
  name: 'Dialog-layer',
  props: ['mapName'],
  components: {
    Tree,
    draggable
  },
  data: () => ({
    changeFlg: false,
    selectedLayers: {
      map01:[],
      map02:[]
    },
    mapName0: '',
    layers: [
      {
        id: 1,
        label: "基本地図",
        nodes: [
          {
            id: 'stdLayer',
            label: "標準地図",
            source: Layers.stdSource,
            layer: Layers.stdLayer
          },
          {
            id: 'seamlessphoto',
            label: "最新写真",
            source: Layers.seamlessphotoSource,
            layer: Layers.seamlessphotoLayer
          },
          {
            id: 'plateauPmtiles',
            label: "PLATEAU建物",
            source: Layers.plateauPmtilesSource,
            layer: Layers.plateauPmtilesLayer
          },
          // {
          //   id: 'amx-a-fude',
          //   label: "法務省登記所備付地図",
          // },
        ]
      },
      {
        id: 2,
        label: "テスト",
        nodes: [
          {
            id: 'stdLayer',
            label: "標準地図",
            source: Layers.stdSource,
            layer: Layers.stdLayer
          },
        ]
      }
    ],
    selected: null,
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'},
  }),
  computed: {
    s_dialogs () {
      return this.$store.state.dialogs.layerDialog
    },
    s_layers () {
      return this.$store.state.layers
    }
  },
  methods: {
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
                layer: node.layer
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
  watch: {
    changeFlg(){
      const map = this.$store.state[this.mapName]
      // まずレイヤーを全削除-------------------------
      // const layers = map.getStyle().layers
      // if (layers) {
      //   for (let i = layers.length - 1; i >= 0; i--) {
      //     const layerId = layers[i].id
      //     console.log(layerId)
      //     map.removeLayer(layerId)
      //   }
      // }
      // -----------------------------------------
      for (let i = this.selectedLayers[this.mapName].length - 1; i >= 0 ; i--){
        const layer = this.selectedLayers[this.mapName][i]
        if (map.getLayer(layer.layer.id)) map.removeLayer(layer.layer.id)
        if (map.getSource(layer.source.id)) map.removeSource(layer.source.id)
        map.addSource(layer.source.id, layer.source.obj)
        map.addLayer(layer.layer)
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
.close-div{
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

</style>
<style>
.tree-row-item {
  font-size:medium;
  color:dimgray;
}
.tree-list, .tree-row {
  gap:0px!important;
}
</style>

