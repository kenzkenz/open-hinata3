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
      if (this.$store.state.dialogs.menuDialog[mapName].style.display === 'none') {
        this.$store.commit('incrDialogMaxZindex')
        this.$store.state.dialogs.menuDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.menuDialog[mapName].style.display = 'block'
      } else {
        this.$store.state.dialogs.menuDialog[mapName].style.display = 'none'
      }
    },
    btnClickLayer (mapName) {
      if (this.$store.state.dialogs.layerDialog[mapName].style.display === 'none') {
        this.$store.commit('incrDialogMaxZindex')
        this.$store.state.dialogs.layerDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.layerDialog[mapName].style.display = 'block'
      } else {
        this.$store.state.dialogs.layerDialog[mapName].style.display = 'none'
      }
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
    // let protocol = new pmtiles.Protocol();
    // maplibregl.addProtocol('pmtiles', protocol.tile);
    this.mapNames.forEach(mapName => {
      // const map = new maplibregl.Map({
      //   container: mapName,
      //   style: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json',
      //   center: [139.7024, 35.6598],
      //   zoom: 16,
      // })
      // this.$store.state[mapName] = map
      const map = new maplibregl.Map({
        container: mapName,
        center: [139.7024, 35.6598],
        zoom: 16,
        style: {
          version: 8,
          sources: {
            "background-osm-raster": {
              type: "raster",
              tiles: ["https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank'>© OpenStreetMap contributors</a>",
            },
          },
          layers: [
            {
              id: "background-osm-raster",
              type: "raster",
              source: "background-osm-raster",
            },
          ],
        },
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
    // on load
    this.mapNames.forEach(mapName => {
      const map = this.$store.state[mapName]
      map.on('load', () => {
        map.addSource('gsi', {
          type: 'raster',
          tiles: [
            'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png' // 標準地図
          ],
          tileSize: 256
        });
        map.addLayer({
          'id': 'gsi-layer',
          'type': 'raster',
          'source': 'gsi',
          'minzoom': 0,
          'maxzoom': 18
        });
        // レイヤーの初期状態を非表示にする
        map.setLayoutProperty('gsi-layer', 'visibility', 'none');
      })
    })
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
  border: #000 1px solid;
}
#map02 {
  background-color: #787878;
  border: #000 1px solid;
  position:absolute;
}

#left-top-div {
  position:absolute;
  top:10px;
  left:10px;
}
</style>
