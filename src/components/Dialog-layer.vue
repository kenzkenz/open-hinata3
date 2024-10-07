<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize" @mousedown="mouseDown(mapName)">
<!--      <v-switch v-for="layer in s_layers" :key="layer"-->
<!--        v-model="layer.value"-->
<!--        :label="layer.text"-->
<!--        hide-details-->
<!--        inset-->
<!--        @change="changeSwitch(mapName)"-->
<!--      ></v-switch>-->
      <Tree
          :nodes="layers"
          :use-checkbox="false"
          :use-icon="true"
          show-child-count
          @nodeClick="onNodeClick"
      />
    </div>
  </Dialog>
</template>

<script>

import Tree from "vue3-tree";
import "vue3-tree/dist/style.css";

export default {
  name: 'Dialog-layer',
  props: ['mapName'],
  components: {
    Tree
  },
  data: () => ({
    mapName0: '',
    layers: [
      {
        id: 1,
        label: "基本地図",
        nodes: [
          {
            id: 'gsiLayer',
            label: "標準地図",
          },
          {
            id: 'plateauPmtiles',
            label: "PLATEAU建物",
          },
          {
            id: 'amx-a-fude',
            label: "法務省登記所備付地図",
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
    mouseDown (mapName) {
      this.mapName0 = mapName
    } ,
    onNodeClick (node) {
      const map = this.$store.state[this.mapName0]
      if (node.id === 'amx-a-fude') {
        if (map.getLayoutProperty(node.id, 'visibility') === 'none') {
          map.setLayoutProperty('amx-a-fude', 'visibility', 'visible')
          map.setLayoutProperty('amx-a-daihyo', 'visibility', 'visible')
        } else {
          map.setLayoutProperty('amx-a-fude', 'visibility', 'none')
          map.setLayoutProperty('amx-a-daihyo', 'visibility', 'none')
        }
      } else {
        if(map.getLayoutProperty(node.id, 'visibility') === 'none') {
          map.setLayoutProperty(node.id, 'visibility', 'visible')
        } else {
          map.setLayoutProperty(node.id, 'visibility', 'none')
        }
      }
    },
    changeSwitch(mapName){
      const vm = this
      const map = this.$store.state[mapName]
      vm.s_layers.forEach(layer => {
        console.log(layer)
          if (layer.id === 'amx') {
            if (layer.value) {
              map.setLayoutProperty('amx-a-fude', 'visibility', 'visible')
              map.setLayoutProperty('amx-a-daihyo', 'visibility', 'visible')
            } else {
              map.setLayoutProperty('amx-a-fude', 'visibility', 'none')
              map.setLayoutProperty('amx-a-daihyo', 'visibility', 'none')
            }
          } else {
            if (layer.value) {
              map.setLayoutProperty(layer.id, 'visibility', 'visible')
            } else {
              map.setLayoutProperty(layer.id, 'visibility', 'none')
            }
          }
      })
    },
  },
  watch: {
  },
}
</script>
<style>
.tree-row-item {
  font-size:medium;
  color:dimgray;
}
.tree-list, .tree-row {
  gap:0px!important;
}

</style>

