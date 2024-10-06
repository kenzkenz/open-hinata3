<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      <v-switch v-for="layer in layers" :key="layer"
        v-model="layer.value"
        :label="layer.label"
        hide-details
        inset
        @change="changeSwitch(mapName)"
      ></v-switch>
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'Dialog-layer',
  props: ['mapName'],
  data: () => ({
    test: 'test',
    // layers:{gsiLayer:false, bldg:false, amx:false},
    layers:[
      {name:'gsiLayer',label:'地理院地図',value:false},
      {name:'bldg',label:'東京都23区建物データ',value:false},
      {name:'amx',label:'法務省登記所備付地図',value:false}
    ],
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_dialogs () {
      return this.$store.state.dialogs.layerDialog
    }
  },
  methods: {
    changeSwitch(mapName){
      const vm = this
      const map = this.$store.state[mapName]
      vm.layers.forEach(layer => {
        console.log(layer)
          if (layer.name === 'amx') {
            if (layer.value) {
              map.setLayoutProperty('amx-a-fude', 'visibility', 'visible')
              map.setLayoutProperty('amx-a-daihyo', 'visibility', 'visible')
            } else {
              map.setLayoutProperty('amx-a-fude', 'visibility', 'none')
              map.setLayoutProperty('amx-a-daihyo', 'visibility', 'none')
            }
          } else {
            if (layer.value) {
              map.setLayoutProperty(layer.name, 'visibility', 'visible')
            } else {
              map.setLayoutProperty(layer.name, 'visibility', 'none')
            }
          }
      })
    },
  },
  watch: {
    layers(){
      alert()
    }
  }
}
</script>
<style scoped>

</style>

