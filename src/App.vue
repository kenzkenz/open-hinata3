<template>
  <v-app>
    <v-main>
      <div id="map00">
        <div v-for="mapName in mapNames" :key="mapName">
          <div :id=mapName :style="mapSize[mapName]" v-show="mapFlg[mapName]">
            <div id="left-top-div">
              <v-btn @click="btnClickMenu(mapName)" v-if="mapName === 'map01'"><i class="fa-solid fa-bars"></i></v-btn>
              <v-btn style="margin-left:10px;" @click="btnClickSplit" v-if="mapName === 'map01'"><i class="fa-solid fa-table-columns"></i></v-btn>
              <v-btn style="margin-left:10px;" @click="btnClickLayer(mapName)"><i class="fa-solid fa-layer-group"></i></v-btn>
            </div>
            <DialogMenu :mapName=mapName />
            <DialogLayer :mapName=mapName />
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import DialogMenu from '@/components/Dialog-menu'
import DialogLayer from '@/components/Dialog-layer'
import maplibregl from 'maplibre-gl'

export default {
  name: 'App',
  components: {
    DialogLayer,
    DialogMenu,
  },
  data: () => ({
    mapNames: ['map01','map02'],
    mapFlg: {map01:true, map02:false},
    mapSize: {
      map01: {top: 0, left: 0, width: '100%', height: window.innerHeight + 'px'},
      map02: {top: 0, right: 0, width: '50%', height: window.innerHeight + 'px'},
    },
  }),
  methods: {
    btnClickMenu (mapName) {
      this.$store.state.dialogs.menuDialog[mapName].style.display = 'block'
    },
    btnClickLayer (mapName) {
      this.$store.state.dialogs.layerDialog[mapName].style.display = 'block'
    },
    btnClickSplit () {
      if (this.mapFlg.map02) {
        this.mapSize.map01.width = '100%'
        this.mapFlg.map02 = false
      } else {
        this.mapSize.map01.width = '50%'
        this.mapFlg.map02 = true
      }
    }
  },
  mounted() {
    this.mapNames.forEach(mapName => {
      const map = new maplibregl.Map({
        container: mapName,
        style: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json', // 地図のスタイル
        center: [139.7024, 35.6598],
        zoom: 16,
      })
      this.$store.state[mapName] = map
    })
    // 画面同期----------------------------------------------------------------------------------------------------------
    let syncing = false
    function syncMaps(mapA, mapB) {
      mapA.on('move', () => {
        if (!syncing) {
          syncing = true
          mapB.setCenter(mapA.getCenter())
          mapB.setZoom(mapA.getZoom())
          syncing = false
        }
      })
      mapB.on('move', () => {
        if (!syncing) {
          syncing = true
          mapA.setCenter(mapB.getCenter())
          mapA.setZoom(mapB.getZoom())
          syncing = false
        }
      })
    }
    syncMaps(this.$store.state.map01, this.$store.state.map02)
    // -----------------------------------------------------------------------------------------------------------------

  }
}
</script>
<style scoped>
#map00 {
  background-color: #000;
}
#map01 {
  background-color: #fff;
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
