<template>
  <v-app>
    <v-main>
      <div id="map00">
        <div v-for="mapName in mapNames" :key="mapName" :id=mapName :style="mapSize[mapName]" v-show="mapFlg[mapName]" @click="btnPosition">
          <div class="center-target"></div>
          <div id="left-top-div">
            <v-btn @click="btnClickMenu(mapName)" v-if="mapName === 'map01'"><i class="fa-solid fa-bars"></i></v-btn>
            <v-btn style="margin-left:10px;" @click="btnClickSplit" v-if="mapName === 'map01'"><i class="fa-solid fa-table-columns"></i></v-btn>
            <v-btn style="margin-left:10px;" @click="btnClickLayer(mapName)"><i class="fa-solid fa-layer-group"></i></v-btn>
          </div>
          <DialogMenu :mapName=mapName />
          <DialogLayer :mapName=mapName />
          <div class="terrain-btn-div" v-drag>
            <div class="terrain-btn-container">
              <button type="button" class="terrain-btn-up terrain-btn" @pointerdown="upMousedown(mapName)" @touchstart="upMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-up fa-lg hover'></i></button>
              <button type="button" class="terrain-btn-down terrain-btn" @pointerdown="downMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-down fa-lg'></i></button>
              <button type="button" class="terrain-btn-left terrain-btn" @pointerdown="leftMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-left fa-lg'></i></button>
              <button type="button" class="terrain-btn-right terrain-btn" @pointerdown="rightMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-right fa-lg'></i></button>
              <div class="terrain-reset">
                <button type="button" @click="terrainReset(mapName)">戻す</button>
              </div>
            </div>
          </div>
          <div class="zoom-div">zoom={{zoom.toFixed(2)}}</div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import axios from "axios";
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
      map01: {top: 0, left: 0, width: '100%', height: '100%'},
      map02: {top: 0, right: 0, width: '50%', height: '100%'},
    },
    permalink: '',
    param:'',
    dbparams:'',
    mapName: '',
    pitch:0,
    bearing:0,
    zoom:0,
  }),
  computed: {
    s_selectedLayers: {
      get() {
        return this.$store.state.selectedLayers
      },
      set(value) {
        this.$store.state.selectedLayers = value
      }
    },
  },
  methods: {
    btnPosition() {
      if (document.querySelector('#map01').clientWidth < Number(document.querySelector('.terrain-btn-div').style.left.replace('px',''))) {
        document.querySelector('.terrain-btn-div').style.left = ''
        document.querySelector('.terrain-btn-div').style.right = '10px'
      }
    },
    terrainReset (mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      function pitch () {
        vm.pitch = map.getPitch()
        if (vm.pitch !==0) {
          map.setPitch(map.getPitch() - 5)
          requestAnimationFrame(pitch)
        } else {
          map.setPitch(0)
          vm.pitch = map.getPitch()
          console.log(vm.pitch)
          vm.updatePermalink()
          cancelAnimationFrame(pitch)
        }
      }
      function bearing () {
        vm.bearing = map.getBearing()
        let step = -5
        if(vm.bearing < 0) step = 5
        if (vm.bearing !==0) {
          vm.$store.state.map01.setBearing(map.getBearing() + step)
          vm.$store.state.map02.setBearing(map.getBearing() + step)
          requestAnimationFrame(bearing)
        } else {
          vm.bearing = map.getBearing()
          vm.updatePermalink()
          cancelAnimationFrame(bearing)
        }
      }
      if (window.innerWidth < 1000) {
        map.setPitch(0)
        this.$store.state.map01.setBearing(0)
        this.$store.state.map02.setBearing(0)
      } else {
        pitch ()
        bearing ()
      }
    },
    mouseup () {
      this.mouseDown = false
    },
    leftMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function bearing () {
        vm.bearing = map.getBearing()
        if (vm.mouseDown) {
          // map.setBearing(map.getBearing() + 5)
          vm.$store.state.map01.setBearing(map.getBearing() + 5)
          vm.$store.state.map02.setBearing(map.getBearing() + 5)
          requestAnimationFrame(bearing)
        } else {
          vm.bearing = map.getBearing()
          cancelAnimationFrame(bearing)
        }
      }
      bearing()
    },
    rightMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function bearing () {
        vm.bearing = map.getBearing()
        if (vm.mouseDown) {
          // map.setBearing(map.getBearing() - 5)
          vm.$store.state.map01.setBearing(map.getBearing() - 5)
          vm.$store.state.map02.setBearing(map.getBearing() - 5)
          requestAnimationFrame(bearing)
        } else {
          vm.bearing = map.getBearing()
          cancelAnimationFrame(bearing)
        }
      }
      bearing()
    },
    upMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function pitch () {
        vm.pitch = map.getPitch()
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() + 5)
          requestAnimationFrame(pitch)
        } else {
          vm.pitch = map.getPitch()
          cancelAnimationFrame(pitch)
        }
      }
      pitch()
    },
    downMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function pitch () {
        vm.pitch = map.getPitch()
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() - 5)
          requestAnimationFrame(pitch)
        } else {
          vm.pitch = map.getPitch()
          cancelAnimationFrame(pitch)
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
        this.mapSize.map01.height = '100%'
        this.mapFlg.map02 = false
      } else {
        if (window.innerWidth > 1000) {
          document.querySelector('.terrain-btn-div').style.left = ''
          document.querySelector('.terrain-btn-div').style.right = '10px'
          this.mapSize.map01.width = '50%'
          this.mapSize.map01.height = '100%'
        } else {
          this.mapSize.map01.width = '100%'
          this.mapSize.map01.height = '50%'
          this.mapSize.map02.width = '100%'
          this.mapSize.map02.height = '50%'
          this.mapSize.map02.top = '50%'
        }
        this.mapFlg.map02 = true
      }
    },
    updatePermalink() {
      const map = this.$store.state.map01
      const center = map.getCenter()
      const zoom = map.getZoom()
      const { lng, lat } = center
      const split = this.mapFlg.map02
      const pitch = !isNaN(this.pitch) ? this.pitch: 0
      const bearing = !isNaN(this.bearing) ? this.bearing: 0
      const selectedLayersJson = JSON.stringify(this.$store.state.selectedLayers)
      // パーマリンクの生成
      this.param = `?lng=${lng}&lat=${lat}&zoom=${zoom}&split=${split}&pitch=${pitch}&bearing=${bearing}&slj=${selectedLayersJson}`
      // console.log(this.param)
      // this.permalink = `${window.location.origin}${window.location.pathname}${this.param}`
      // URLを更新
      // window.history.pushState({ lng, lat, zoom }, '', this.permalink)
      this.createShortUrl()
      this.zoom = zoom
    },
    createShortUrl() {
      let params = new URLSearchParams()
      params.append('parameters', this.param)
      axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrl.php', params)
          .then(response => {
            // console.log(response.data)
            window.history.pushState(null, 'map', "?s=" + response.data.urlid)
            console.log('保存成功')
          })
          .catch(error => {
            console.log(error)
          })
    },
    parseUrlParams() {
      let params
      if (this.dbparams) {
        params = new URLSearchParams(this.dbparams)
      } else {
        params = new URLSearchParams(window.location.search)
      }
      // console.log(params)
      const lng = parseFloat(params.get('lng'))
      const lat = parseFloat(params.get('lat'))
      const zoom = parseFloat(params.get('zoom'))
      const split = params.get('split')
      const pitch = parseFloat(params.get('pitch'))
      const bearing = parseFloat(params.get('bearing'))
      const slj = JSON.parse(params.get('slj'))
      this.pitch = pitch
      this.bearing = bearing
      return {lng,lat,zoom,split,pitch,bearing,slj}
    },
    init() {
      let protocol = new Protocol();
      maplibregl.addProtocol("pmtiles",protocol.tile)
      const params = this.parseUrlParams()
      this.mapNames.forEach(mapName => {
        let center = [139.7024, 35.6598]
        let zoom = 16
        let pitch = 0
        let bearing = 0
        if (params.lng) {
          center = [params.lng,params.lat]
          zoom = params.zoom
          pitch = params.pitch
          bearing = params.bearing
        }
        const map = new maplibregl.Map({
          container: mapName,
          center: center,
          zoom: zoom,
          pitch: pitch,
          bearing:bearing,
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
          // 二画面-----------------------------------------------------------
          if (mapName === 'map02') {
            if (params.split === 'true') {
              this.mapFlg.map02 = true
              if (window.innerWidth > 1000) {
                this.mapSize.map01.width = '50%'
                this.mapSize.map01.height = '100%'
              } else {
                this.mapSize.map01.width = '100%'
                this.mapSize.map01.height = '50%'
                this.mapSize.map02.width = '100%'
                this.mapSize.map02.height = '50%'
                this.mapSize.map02.top = '50%'
              }
            }
          }
          // ----------------------------------------------------------------
          this.mapNames.forEach(() => {
            const params = this.parseUrlParams()
            if (params.slj) this.s_selectedLayers = params.slj
          })
          // ----------------------------------------------------------------
          // 標高タイルソース---------------------------------------------------
          map.addSource("gsidem-terrain-rgb", {
            type: 'raster-dem',
            tiles: ['https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png'],
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html#dem" target="_blank">地理院タイル(標高タイル)</a>',
            tileSize: 256
          })
          // 標高タイルセット
          // map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 });
          // 標高タイルソース---------------------------------------------------
          // map.addSource("aws-terrain", {
          //   type: "raster-dem",
          //   minzoom: 1,
          //   maxzoom: 15,
          //   // このソースが使用するエンコーディング。terrarium（Terrarium形式のPNGタイル）、mapbox（Mapbox Terrain RGBタイル）、custom のいずれか
          //   encoding: "terrarium",
          //   tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
          // })
          // // 標高タイルセット
          // map.setTerrain({ 'source': 'aws-terrain', 'exaggeration': 1 });

          // Skyレイヤ
          if (mapName === 'map01') {
            map.setSky({
              "sky-color": "#199EF3",
              "sky-horizon-blend": 0.7,
              "horizon-color": "#f0f8ff",
              "horizon-fog-blend": 0.8,
              "fog-color": "#2c7fb8",
              "fog-ground-blend": 0.9,
              "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0]
            })
          } else {
            map.setSky({
              "sky-color": "#199EF3",
              "sky-horizon-blend": 0.71,//少し変えるとskayが反映するようになる。謎。
              "horizon-color": "#f0f8ff",
              "horizon-fog-blend": 0.8,
              "fog-color": "#2c7fb8",
              "fog-ground-blend": 0.9,
              "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0]
            })
          }
          // -----------------------------------------------------------------------------------------------------------
          map.on('moveend', this.updatePermalink)
          //------------------------------------------------------------------------------------------------------------
          if (this.pitch !== 0) {
            this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
            this.$store.state.map02.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
          }
          // ウオッチ
          this.$watch(function () {
            return [this.pitch]
          }, function () {
            if (this.pitch !== 0 ) {
              this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
              this.$store.state.map02.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
            } else {
              this.$store.state.map01.setTerrain(null)
              this.$store.state.map02.setTerrain(null)
            }
          })
        })
        //on load終了----------------------------------------------------------------------------------------------------
      })
    }
  },
  mounted() {
    const vm = this
    //------------------------------------------------------------------------------------------------------------------
    document.addEventListener('touchmove', function (event) {
      if (event.scale !== 1) {
        event.preventDefault();
      }
    }, { passive: false });
    //------------------------------------------------------------------------------------------------------------------
    const params = new URLSearchParams(window.location.search)
    const urlid = params.get('s')
    axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrlSelect.php',{
      params: {
        urlid: urlid
      }
    }).then(function (response) {
      vm.dbparams = response.data
      vm.init()
      const url = new URL(window.location.href) // URLを取得
      window.history.replaceState(null, '', url.pathname + window.location.hash) //パラメータを削除 FB対策
    })
    // -----------------------------------------------------------------------------------------------------------------
  },
  watch: {
    s_selectedLayers: {
      handler: function () {
        console.log('変更を検出しました')
        this.updatePermalink()
      },
      deep: true
    },
  }
}
</script>
<style scoped>
#map00 {
  background-color: #000;
  height: 100%;
}
#map01 {
  background-color: #fff;
  border: #000 1px solid;
  height: 100%;
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
.zoom-div {
  position: absolute;
  left: 10px;
  bottom: 10px;
  font-size: large;
  z-index: 2;
}
/*3Dのボタン-------------------------------------------------------------*/
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
.terrain-btn-container{
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
