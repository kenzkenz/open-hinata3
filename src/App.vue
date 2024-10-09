<template>
  <v-app>
    <v-main>
      <div id="map00">
        <div v-for="mapName in mapNames" :key="mapName" :id=mapName :style="mapSize[mapName]" v-show="mapFlg[mapName]">
          <div class="center-target"></div>
          <div id="left-top-div">
            <v-btn @click="btnClickMenu(mapName)" v-if="mapName === 'map01'"><i class="fa-solid fa-bars"></i></v-btn>
            <v-btn style="margin-left:10px;" @click="btnClickSplit" v-if="mapName === 'map01'"><i class="fa-solid fa-table-columns"></i></v-btn>
            <v-btn style="margin-left:10px;" @click="btnClickLayer(mapName)"><i class="fa-solid fa-layer-group"></i></v-btn>
          </div>
          <DialogMenu :mapName=mapName />
          <DialogLayer :mapName=mapName />
          <div class="terrain-btn-div">
            <div class="cesiun-btn-container">
              <button type="button" class="terrain-btn-up terrain-btn" @pointerdown.stop="upMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-up fa-lg hover'></i></button>
              <button type="button" class="terrain-btn-down terrain-btn" @pointerdown.stop="downMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-down fa-lg'></i></button>
              <button type="button" class="terrain-btn-left terrain-btn" @pointerdown="leftMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-left fa-lg'></i></button>
              <button type="button" class="terrain-btn-right terrain-btn" @pointerdown="rightMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-right fa-lg'></i></button>
              <div class="terrain-reset">
                <button type="button" @click="terrainReset(mapName)">戻す</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import DialogMenu from '@/components/Dialog-menu'
import DialogLayer from '@/components/Dialog-layer'
import 'maplibre-gl/dist/maplibre-gl.css'
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
    permalink: '',
    mapName: '',
    mouseDown: false,
  }),
  methods: {
    terrainReset (mapName) {
      const map = this.$store.state[mapName]
      map.setPitch(0)
      this.$store.state.map01.setBearing(0)
      this.$store.state.map02.setBearing(0)
    },
    mouseup () {
      this.mouseDown = false
    },
    leftMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function bearing () {
        if (vm.mouseDown) {
          // map.setBearing(map.getBearing() + 5)
          vm.$store.state.map01.setBearing(map.getBearing() + 5)
          vm.$store.state.map02.setBearing(map.getBearing() + 5)
          setTimeout(function () {bearing()}, 50)
        } else {
          clearTimeout(bearing)
        }
      }
      bearing()
    },
    rightMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function bearing () {
        if (vm.mouseDown) {
          // map.setBearing(map.getBearing() - 5)
          vm.$store.state.map01.setBearing(map.getBearing() - 5)
          vm.$store.state.map02.setBearing(map.getBearing() - 5)
          setTimeout(function () {bearing()}, 50)
        } else {
          clearTimeout(bearing)
        }
      }
      bearing()
    },
    upMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function pitch () {
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() + 5)
          setTimeout(function () {pitch()}, 50)
        } else {
          clearTimeout(pitch)
        }
      }
      pitch()
    },
    downMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function pitch () {
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() - 5)
          setTimeout(function () {pitch()}, 50)
        } else {
          clearTimeout(pitch)
        }
      }
      pitch()
    },
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
        this.mapSize.map01.height = window.innerHeight + 'px'
        this.mapFlg.map02 = false
      } else {
        if (window.innerWidth > 1000) {
          this.mapSize.map01.width = '50%'
          this.mapSize.map01.height = window.innerHeight + 'px'
        } else {
          this.mapSize.map01.width = '100%'
          this.mapSize.map01.height = (window.innerHeight / 2) + 'px'
          this.mapSize.map02.width = '100%'
          this.mapSize.map02.height = (window.innerHeight / 2) + 'px'
          this.mapSize.map02.top = (window.innerHeight / 2) + 'px'
        }
        this.mapFlg.map02 = true
      }
    },
    updatePermalink() {
      const map = this.$store.state.map01
      const center = map.getCenter();
      const zoom = map.getZoom();
      const { lng, lat } = center;
      // パーマリンクの生成
      this.permalink = `${window.location.origin}${window.location.pathname}?lng=${lng}&lat=${lat}&zoom=${zoom}`;
      // URLを更新
      window.history.pushState({ lng, lat, zoom }, '', this.permalink);
    },
    parseUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const lng = parseFloat(params.get('lng'));
      const lat = parseFloat(params.get('lat'));
      const zoom = parseFloat(params.get('zoom'));
      return {lng,lat,zoom}
    },
  },
  mounted() {
    //------------------------------------------------------------------------------------------------------------------
    document.addEventListener('touchmove', function (event) {
      if (event.scale !== 1) {
        event.preventDefault();
      }
    }, { passive: false });
    //------------------------------------------------------------------------------------------------------------------

    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles",protocol.tile)
    this.mapNames.forEach(mapName => {
      const params = this.parseUrlParams()
      let center = [139.7024, 35.6598]
      let zoom = 16
      if (params.lng) {
        center = [params.lng,params.lat]
        zoom = params.zoom
      }
      const map = new maplibregl.Map({
        container: mapName,
        center: center,
        zoom: zoom,
        maxPitch: 85, // 最大の傾き、デフォルトは60
        // maxZoom: 17.9,
        // style: 'https://raw.githubusercontent.com/gsi-cyberjapan/optimal_bvmap/52ba56f645334c979998b730477b2072c7418b94/style/std.json',
        style:require('@/assets/json/std.json')
        // style: {
        //   version: 8,
        //   sources: {
        //     "background-osm-raster": {
        //       type: "raster",
        //       tiles: ["https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"],
        //       tileSize: 256,
        //       attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank'>© OpenStreetMap contributors</a>",
        //     },
        //   },
        //   layers: [
        //     {
        //       id: "background-osm-raster",
        //       type: "raster",
        //       source: "background-osm-raster",
        //     },
        //     // // 陰影起伏
        //     // {
        //     //   id: "hills",
        //     //   type: "hillshade",
        //     //   source: "aws-terrain",
        //     // },
        //   ],
        //   // 地形
        //   terrain: {
        //     // 地形データのソース
        //     source: "aws-terrain",
        //     // 標高の誇張度
        //     exaggeration: 1,
        //   },
        //   sky: {
        //     // 空のベースカラー
        //     "sky-color": "#199EF3",
        //     // 空の色と水平線の色の混ぜ合わせ。1は空の真ん中の色を、0は空の色を使用する
        //     "sky-horizon-blend": 0.5,
        //     // 地平線のベースカラー
        //     "horizon-color": "#ffffff",
        //     // 霧の色と水平線の色の混ぜ合わせ。0は水平線の色、1は霧の色を使用する
        //     "horizon-fog-blend": 0.5,
        //     // 霧のベースカラー。 3D地形が必要
        //     "fog-color": "#0000ff",
        //     // 3D地形に霧を混ぜ合わせる。 0はマップの中心、1は地平線
        //     "fog-ground-blend": 0.5,
        //     // 大気の混ぜ合わせ。 1が可視大気、0が非表示大気
        //     "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 10, 1, 12, 0],
        //   },
        // },
      })
      this.$store.state[mapName] = map
    })
    // 画面同期----------------------------------------------------------------------------------------------------------
    let syncing = false
    function syncMaps(mapA, mapB) {
      // iphoneのtきmoveではフリーズする。moveendではフリーズしない。
      let m = 'move'
      if (window.innerWidth < 1000) {
        m = 'moveend'
      }
      mapA.on(m, () => {
        if (!syncing) {
          syncing = true
          mapB.setCenter(mapA.getCenter())
          mapB.setZoom(mapA.getZoom())
          syncing = false
        }
      })
      mapB.on(m, () => {
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
        // 標高タイルソース---------------------------------------------------
        map.addSource("gsidem-terrain-rgb", {
          type: 'raster-dem',
          tiles: ['https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png'],
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html#dem" target="_blank">地理院タイル(標高タイル)</a>',
          tileSize: 256
        })
        // 標高タイルセット
        map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 });
        // 標高タイルソース---------------------------------------------------
        map.addSource("aws-terrain", {
          type: "raster-dem",
              minzoom: 1,
              maxzoom: 15,
              // このソースが使用するエンコーディング。terrarium（Terrarium形式のPNGタイル）、mapbox（Mapbox Terrain RGBタイル）、custom のいずれか
              encoding: "terrarium",
              tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        })
        // Skyレイヤ
        map.setSky({
          "sky-color": "#199EF3",
          "sky-horizon-blend": 0.7,
          "horizon-color": "#f0f8ff",
          "horizon-fog-blend": 0.8,
          "fog-color": "#2c7fb8",
          "fog-ground-blend": 0.9,
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0]
        });
        // 登記所備付地図データ --------------------------------------------------------------------------------------------
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
        // ------------------------------------------------------------------------------------------------------------
        // 3D都市モデル（Project PLATEAU）東京都23区（2020年度）建物データ
        // map.addSource("plateau-bldg", {
        //   type: "vector",
        //   // tiles: ["https://indigo-lab.github.io/plateau-lod2-mvt/{z}/{x}/{y}.pbf"],
        //   tiles: ['https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2023_LOD0.pmtiles'],
        //   minzoom: 10,
        //   maxzoom: 16,
        //   attribution: "<a href='https://github.com/indigo-lab/plateau-lod2-mvt'>plateau-lod2-mvt by indigo-lab</a> (<a href='https://www.mlit.go.jp/plateau/'>国土交通省 Project PLATEAU</a> のデータを加工して作成)",
        // })
        // map.addLayer({
        //   id: "bldg",
        //   type: "fill-extrusion",
        //   source: "plateau-bldg",
        //   // ベクタタイルソースから使用するレイヤ
        //   "source-layer": "bldg",
        //   paint: {
        //     // 高さ
        //     "fill-extrusion-height": ["*", ["get", "z"], 1],
        //     // 塗りつぶしの色
        //     "fill-extrusion-color": "#797979",
        //     // 透明度
        //     "fill-extrusion-opacity": 0.7,
        //   },
        // })
        // map.setLayoutProperty('bldg', 'visibility', 'none')
        // -------------------------------------------------------------------------------------------------------------
        // PLATEAU建物（PMTiles）ソース
        // map.addSource("plateauPmtiles", {
        //   type: "vector",
        //   url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2022_LOD1.pmtiles",
        //   minzoom: 16,
        //   maxzoom: 16,
        //   attribution: '<a href="https://www.geospatial.jp/ckan/dataset/plateau">3D都市モデルPLATEAU建築物データ（国土交通省）</a>'
        // });
        //
        // // PLATEAU建物（PMTiles）レイヤ
        // map.addLayer({
        //   'id': 'plateauPmtiles',
        //   'source': 'plateauPmtiles',
        //   'source-layer': "PLATEAU",
        //   "minzoom": 16,
        //   "maxzoom": 23,
        //   'type': 'fill-extrusion',
        //   'paint': {
        //     "fill-extrusion-color": '#797979',
        //     "fill-extrusion-opacity": 0.7,
        //     "fill-extrusion-height": ["get", "measuredHeight"]
        //   }
        // });
        // map.setLayoutProperty('plateauPmtiles', 'visibility', 'none')
        // -------------------------------------------------------------------------------------------------------------
        map.on('moveend', this.updatePermalink)
        // this.parseUrlParams()
      })
      // on load
      //----------------------------------------------------------------------------------------------------------------
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
  background-color: #fff;
  border: #000 1px solid;
  position:absolute;
}
.center-target{
  position: absolute;
  background-image:url('@/assets/images/target.gif');
  background-repeat:  no-repeat;
  width:24px;
  height:24pX;
  pointer-events: none;
  top: calc(50% - 12px);
  left: calc(50% - 12px);
  z-index: 1;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
#left-top-div {
  position:absolute;
  top:10px;
  left:10px;
  z-index:1;
}
/*セシウムのボタン-------------------------------------------------------------*/
.terrain-btn {
  background-color: rgb(50,101,186);
}
.terrain-btn-div{
  position:absolute;
  top:60%;
  right:10px;
  z-index:2;
  /*display:none;*/
  height:180px;
  width:180px;
  margin-left:-90px;
  /*margin-top:-72px;*/
  margin-top:20px;
  background:rgba(0,0,0,0.1);
  /*border-radius:180px 0 0 180px;*/
  border-radius:180px;
  -moz-user-select:none;
  -webkit-user-select:none;
  -ms-user-select:none;
  /*cursor:move;*/
}
@media screen and (max-width:480px) {
  .terrain-btn-div {
    top:calc(50% - 73px);
  }
}
.cesiun-btn-container{
  position:relative;
  height:100%;
}
.terrain-btn-up{
  position:absolute;
  top:10px;
  left:50%;
  padding:0;
  width:50px;
  height:50px;
  margin-left:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-down{
  position:absolute;
  bottom:10px;
  left:50%;
  padding:0;
  width:50px;
  height:50px;
  margin-left:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-left{
  position:absolute;
  top:50%;
  left:10px;
  padding:0;
  width:50px;
  height:50px;
  margin-top:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-right{
  position:absolute;
  top:50%;
  right:10px;
  padding:0;
  width:50px;
  height:50px;
  margin-top:-25px;
  color: white;
  border-radius:8px;
}
.terrain-reset{
  position:absolute;
  top:80px;
  left:50%;
  padding:0;
  width:40px;
  height:20px;
  margin-left:-20px;
  text-align:center;
  font-size: larger;
  color: white;
  /*-webkit-text-stroke: 1px #FFF;*/
  /*text-stroke: 1px #FFF;*/
}

.terrain-btn-div .ui-spinner{
  font-size:10px;
  width:30px;
  background:rgba(0,0,0,0);
  border:none;
}
</style>
