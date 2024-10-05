<template>
  <v-app>
    <v-main>
      <div id="map00">
        <div v-for="mapName in mapNames" :key="mapName">
          <div :id=mapName :style="mapSize[mapName]" v-show="mapFlg[mapName]">
            <div id="left-top-div">
              <v-btn @click="btnClickMenu"><i class="fa-solid fa-bars"></i></v-btn>
              <v-btn style="margin-left:10px;" @click="btnClickLayer"><i class="fa-solid fa-layer-group"></i></v-btn>
            </div>
            <DialogMenu/>
            <DialogLayer/>
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import DialogMenu from '@/components/Dialog-menu'
import DialogLayer from '@/components/Dialog-layer'

export default {
  name: 'App',
  components: {
    DialogLayer,
    DialogMenu,
  },
  data: () => ({
    mapNames: ['map01','map02'],
    mapFlg: {map01:true, map02:true},
    mapSize: {
      map01: {top: 0, left: 0, width: '50%', height: window.innerHeight + 'px'},
      map02: {top: 0, right: 0, width: '50%', height: window.innerHeight + 'px'},
    },
  }),
  methods: {
    btnClickMenu () {
      this.$store.state.dialogs.menuDialog.style.display = 'block'
    },
    btnClickLayer () {
      this.$store.state.dialogs.layerDialog.style.display = 'block'
    }
  }
}
</script>
<style scoped>
#map01 {

}
#map02 {
  background-color: #787878;
  position:absolute;;
}

#left-top-div {
  position:absolute;
  top:10px;
  left:10px;
}
</style>
