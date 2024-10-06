<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      <v-switch
          v-model="switchFlg.gsiLayer"
          label="地理院地図"
          hide-details
          inset
          @change="changeSwitch(mapName)"
      ></v-switch>
      <v-switch
          v-model="switchFlg.amx"
          label="法務省登記所備付地図"
          hide-details
          inset
          @change="changeSwitch(mapName)"
      ></v-switch>
      <v-switch
          v-model="switchFlg.bldg"
          label="東京都23区建物データ"
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
    switchFlg:{gsiLayer:false, bldg:false, amx:false},
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
      Object.keys(vm.switchFlg).forEach(function(key) {
        if (key === 'amx') {
          if (vm.switchFlg[key]) {
            map.setLayoutProperty('amx-a-fude', 'visibility', 'visible')
            map.setLayoutProperty('amx-a-daihyo', 'visibility', 'visible')
          } else {
            map.setLayoutProperty('amx-a-fude', 'visibility', 'none')
            map.setLayoutProperty('amx-a-daihyo', 'visibility', 'none')
          }
        } else {
          if (vm.switchFlg[key]) {
            map.setLayoutProperty(key, 'visibility', 'visible')
          } else {
            map.setLayoutProperty(key, 'visibility', 'none')
          }
        }
      })
    },
  },
  watch: {
    switchFlg(){
      alert()
    }
  }
}
</script>
<style scoped>

</style>

