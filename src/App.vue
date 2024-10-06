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
import { Protocol } from "pmtiles";

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
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles",protocol.tile)

    // カスタムプロトコルを追加
    // maplibregl.addProtocol('pmtiles', {
    //   fetch: async (url) => {
    //     // pmtilesファイルを読み込む
    //     const pmtiles = new PMTiles(url.replace('pmtiles://', ''));
    //     const source = await pmtiles.getSource();
    //     return source;
    //   },
    // });


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
            // "amx-a-pmtiles": {
            //   type: "vector",
            //   minzoom: 2,
            //   maxzoom: 16,
            //   url: "pmtiles://https://habs.rad.naro.go.jp/spatial_data/amx/a.pmtiles",
            //   attribution:
            //       "<a href='https://www.moj.go.jp/MINJI/minji05_00494.html' target='_blank'>登記所備付地図データ（法務省）</a>",
            // },
          },
          layers: [
            {
              id: "background-osm-raster",
              type: "raster",
              source: "background-osm-raster",
            },
            // // 登記所備付地図データ 間引きなし
            // {
            //   id: "amx-a-fude",
            //   // 塗りつぶされたポリゴン
            //   type: "fill",
            //   source: "amx-a-pmtiles",
            //   // ベクトルタイルソースから使用するレイヤ
            //   "source-layer": "fude",
            //   paint: {
            //     // 塗りつぶし部分の色
            //     "fill-color": "rgba(254, 217, 192, 1)",
            //     // 塗りつぶしの輪郭の色
            //     "fill-outline-color": "rgba(255, 0, 0, 1)",
            //     // 塗りつぶしの不透明度 1に近づくほど不透明になる
            //     "fill-opacity": 0.4,
            //   },
            // },
            // // 登記所備付地図データ 代表点レイヤ
            // {
            //   id: "amx-a-daihyo",
            //   // ヒートマップ
            //   type: "heatmap",
            //   source: "amx-a-pmtiles",
            //   // ベクトルタイルソースから使用するレイヤ
            //   "source-layer": "daihyo",
            //   paint: {
            //     // ヒートマップの密度に基づいて各ピクセルの色を定義
            //     "heatmap-color": [
            //       // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            //       "interpolate",
            //       // 入力より小さいストップと大きいストップのペアを直線的に補間
            //       ["linear"],
            //       // ヒートマップレイヤーの密度推定値を取得
            //       ["heatmap-density"],
            //       0,
            //       "rgba(255, 255, 255, 0)",
            //       0.5,
            //       "rgba(255, 255, 0, 0.5)",
            //       // 1に近づくほど密度が高い
            //       1,
            //       "rgba(255, 0, 0, 0.5)",
            //     ],
            //     // ヒートマップ1点の半径（ピクセル単位）
            //     "heatmap-radius": [
            //       // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            //       "interpolate",
            //       // 出力が増加する割合を制御する、1に近づくほど出力が増加する
            //       ["exponential", 10],
            //       // ズームレベルに応じて半径を調整する
            //       ["zoom"],
            //       2,
            //       5,
            //       14,
            //       50,
            //     ],
            //   },
            // },
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
        map.setLayoutProperty('gsi-layer', 'visibility', 'none')

        map.addSource("amx-a-pmtiles",{
            type: "vector",
            minzoom: 2,
            maxzoom: 16,
            url: "pmtiles://https://habs.rad.naro.go.jp/spatial_data/amx/a.pmtiles",
            attribution:
                "<a href='https://www.moj.go.jp/MINJI/minji05_00494.html' target='_blank'>登記所備付地図データ（法務省）</a>",
        })

        // 登記所備付地図データ 間引きなし
        map.addLayer({
          id: "amx-a-fude",
          type: "fill",
          source: "amx-a-pmtiles", "source-layer": "fude",
          paint: {
            "fill-color": "rgba(254, 217, 192, 1)",
            "fill-outline-color": "rgba(255, 0, 0, 1)",
            "fill-opacity": 0.4,
          },
        })
        // 登記所備付地図データ 代表点レイヤ
        map.addLayer({
            id: "amx-a-daihyo",
            // ヒートマップ
            type: "heatmap",
            source: "amx-a-pmtiles",
            // ベクトルタイルソースから使用するレイヤ
            "source-layer": "daihyo",
            paint: {
              // ヒートマップの密度に基づいて各ピクセルの色を定義
              "heatmap-color": [
                // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
                "interpolate",
                // 入力より小さいストップと大きいストップのペアを直線的に補間
                ["linear"],
                // ヒートマップレイヤーの密度推定値を取得
                ["heatmap-density"],
                0,
                "rgba(255, 255, 255, 0)",
                0.5,
                "rgba(255, 255, 0, 0.5)",
                // 1に近づくほど密度が高い
                1,
                "rgba(255, 0, 0, 0.5)",
              ],
              // ヒートマップ1点の半径（ピクセル単位）
              "heatmap-radius": [
                // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
                "interpolate",
                // 出力が増加する割合を制御する、1に近づくほど出力が増加する
                ["exponential", 10],
                // ズームレベルに応じて半径を調整する
                ["zoom"],
                2,
                5,
                14,
                50,
              ],
            }
        })
        map.setLayoutProperty('amx-a-fude', 'visibility', 'none')
        map.setLayoutProperty('amx-a-daihyo', 'visibility', 'none')

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
