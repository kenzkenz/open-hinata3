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
          <dialog-info :mapName=mapName />
          <ExtHighway :mapName=mapName />

          <div class="terrain-btn-div" v-drag>
            <div class="terrain-btn-container">
              <button type="button" class="terrain-btn-up terrain-btn" @pointerdown="upMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-up fa-lg hover'></i></button>
              <button type="button" class="terrain-btn-down terrain-btn" @pointerdown="downMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-down fa-lg'></i></button>
              <button type="button" class="terrain-btn-left terrain-btn" @pointerdown="leftMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-left fa-lg'></i></button>
              <button type="button" class="terrain-btn-right terrain-btn" @pointerdown="rightMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-right fa-lg'></i></button>
              <div class="terrain-reset">
                <button type="button" @pointerdown="terrainReset(mapName)">戻す</button>
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
import DialogInfo from '@/components/Dialog-info'
import ExtHighway from '@/components/ext-highway'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import { Protocol } from "pmtiles";

export default {
  name: 'App',
  components: {
    DialogLayer,
    DialogMenu,
    DialogInfo,
    ExtHighway,
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
          // console.log(vm.pitch)
          vm.updatePermalink()
          cancelAnimationFrame(pitch)
        }
      }
      function bearing () {
        vm.bearing = map.getBearing()
        let step = -5
        if(vm.bearing < 0) step = 5

        if (step !== 5) {
          if (vm.bearing >= 5) {
            vm.$store.state.map01.setBearing(map.getBearing() + step)
            vm.$store.state.map02.setBearing(map.getBearing() + step)
            requestAnimationFrame(bearing)
          } else {
            vm.bearing = map.getBearing()
            vm.updatePermalink()
            cancelAnimationFrame(bearing)
          }
        } else {
          if (vm.bearing <= -5) {
            vm.$store.state.map01.setBearing(map.getBearing() + step)
            vm.$store.state.map02.setBearing(map.getBearing() + step)
            requestAnimationFrame(bearing)
          } else {
            vm.bearing = map.getBearing()
            vm.updatePermalink()
            cancelAnimationFrame(bearing)
          }
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
          vm.$store.state.map01.setBearing(map.getBearing() + 2)
          vm.$store.state.map02.setBearing(map.getBearing() + 2)
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
          vm.$store.state.map01.setBearing(map.getBearing() - 2)
          vm.$store.state.map02.setBearing(map.getBearing() - 2)
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
          map.setPitch(map.getPitch() + 2)
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
          map.setPitch(map.getPitch() - 2)
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
          localIdeographFontFamily: ['sans-serif'], // 日本語を表示するための設定
          center: center,
          zoom: zoom,
          pitch: pitch,
          bearing:bearing,
          maxPitch: 85, // 最大の傾き、デフォルトは60
          // style: 'https://raw.githubusercontent.com/gsi-cyberjapan/optimal_bvmap/52ba56f645334c979998b730477b2072c7418b94/style/std.json',
          // style:require('@/assets/json/std.json')
          style: {
            version: 8,
            glyphs: "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
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
              ]
          },
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
        const params = this.parseUrlParams()
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
          // ここを改善する必要あり
          if (params.slj) this.s_selectedLayers = params.slj

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
          document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('mouseover', function() {
            map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 });
          }, false);
          document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('pointerdown', function() {
            map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 });
          }, false);

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
          // map.on('moveend', this.updatePermalink)
          map.on('click', this.updatePermalink)
          map.on('dragend', this.updatePermalink)
          // map.on('zoomend', this.updatePermalink)
          map.on('idle', this.updatePermalink)

          //------------------------------------------------------------------------------------------------------------
          const pitch = !isNaN(this.pitch) ? this.pitch: 0
          if (pitch !== 0) {
            this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
            this.$store.state.map02.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
          }
          // ウオッチ 効いたり効かなかったりで安定しない。
          // this.$watch(function () {
          //   return [this.pitch]
          // }, function () {
          //   console.log(this.pitch)
          //   // if (this.pitch !== 0 ) {
          //   //   this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
          //   //   this.$store.state.map02.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 })
          //   // } else {
          //   //   this.$store.state.map01.setTerrain(null)
          //   //   this.$store.state.map02.setTerrain(null)
          //   // }
          // })

          // 地物クリック時にポップアップを表示する----------------------------------------------------------------------------
          map.on('click', 'oh-chikeibunrui', (e) => {

            const codeList_sizen = new Array(
                [999999,"地図を拡大すると表示されます。","",""],
                [100,"数値地図25000(土地条件)","地図を拡大すると表示されます。",""],
                [101,"数値地図25000(土地条件)","地図を拡大すると表示されます。",""],
                [102,"治水地形分類図(更新版)","地図を拡大すると表示されます。",""],
                [103,"脆弱地形調査","地図を拡大すると表示されます。",""],
                [104,"土地条件図","地図を拡大すると表示されます。",""],
                [105,"沿岸海域土地条件図","地図を拡大すると表示されます。",""],
                [10101,"山地","尾根や谷からなる土地や、比較的斜面の急な土地。山がちな古い段丘崖の斜面や火山地を含む。","大雨や地震により、崖崩れや土石流、地すべりなどの土砂災害のリスクがある。"],
                [11201,"山地","尾根や谷からなる土地や、比較的斜面の急な土地。山がちな古い段丘崖の斜面や火山地を含む。","大雨や地震により、崖崩れや土石流、地すべりなどの土砂災害のリスクがある。"],
                [11202,"山地","尾根や谷からなる土地や、比較的斜面の急な土地。山がちな古い段丘崖の斜面や火山地を含む。","大雨や地震により、崖崩れや土石流、地すべりなどの土砂災害のリスクがある。"],
                [11203,"山地","尾根や谷からなる土地や、比較的斜面の急な土地。山がちな古い段丘崖の斜面や火山地を含む。","大雨や地震により、崖崩れや土石流、地すべりなどの土砂災害のリスクがある。"],
                [11204,"山地","尾根や谷からなる土地や、比較的斜面の急な土地。山がちな古い段丘崖の斜面や火山地を含む。","大雨や地震により、崖崩れや土石流、地すべりなどの土砂災害のリスクがある。"],
                [1010101,"山地","尾根や谷からなる土地や、比較的斜面の急な土地。山がちな古い段丘崖の斜面や火山地を含む。","大雨や地震により、崖崩れや土石流、地すべりなどの土砂災害のリスクがある。"],
                [10202,"崖･段丘崖","台地の縁にある極めて急な斜面や、山地や海岸沿いなどの岩場。","周辺では大雨や地震の揺れによる崖崩れなどの土砂災害のリスクがある。"],
                [10204,"崖･段丘崖","台地の縁にある極めて急な斜面や、山地や海岸沿いなどの岩場。","周辺では大雨や地震の揺れによる崖崩れなどの土砂災害のリスクがある。"],
                [2010201,"崖･段丘崖","台地の縁にある極めて急な斜面や、山地や海岸沿いなどの岩場。","周辺では大雨や地震の揺れによる崖崩れなどの土砂災害のリスクがある。"],
                [10205,"地すべり地形","斜面が下方に移動し、斜面上部の崖と不規則な凹凸のある移動部分からなる土地。山体の一部が重力により滑ってできる。","大雨・雪解けにより多量の水分が土中に含まれたり、地震で揺れたりすることで、土地が滑って土砂災害を引き起こすことがある。"],
                [10206,"地すべり地形","斜面が下方に移動し、斜面上部の崖と不規則な凹凸のある移動部分からなる土地。山体の一部が重力により滑ってできる。","大雨・雪解けにより多量の水分が土中に含まれたり、地震で揺れたりすることで、土地が滑って土砂災害を引き起こすことがある。"],
                [10301,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10302,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10303,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10304,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10308,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10314,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10305,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10508,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [2010101,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10306,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10307,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10310,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10312,"台地･段丘","周囲より階段状に高くなった平坦な土地。周囲が侵食により削られて取り残されてできる。","河川氾濫のリスクはほとんどないが、河川との高さが小さい場合には注意。縁辺部の斜面近くでは崖崩れに注意。地盤は良く、地震の揺れや液状化のリスクは小さい。"],
                [10401,"山麓堆積地形","山地や崖･段丘崖の下方にあり、山地より斜面の緩やかな土地。崖崩れや土石流などによって土砂が堆積してできる。","大雨により土石流が発生するリスクがある。地盤は不安定で、地震による崖崩れにも注意。"],
                [10402,"山麓堆積地形","山地や崖･段丘崖の下方にあり、山地より斜面の緩やかな土地。崖崩れや土石流などによって土砂が堆積してできる。","大雨により土石流が発生するリスクがある。地盤は不安定で、地震による崖崩れにも注意。"],
                [10403,"山麓堆積地形","山地や崖･段丘崖の下方にあり、山地より斜面の緩やかな土地。崖崩れや土石流などによって土砂が堆積してできる。","大雨により土石流が発生するリスクがある。地盤は不安定で、地震による崖崩れにも注意。"],
                [10404,"山麓堆積地形","山地や崖･段丘崖の下方にあり、山地より斜面の緩やかな土地。崖崩れや土石流などによって土砂が堆積してできる。","大雨により土石流が発生するリスクがある。地盤は不安定で、地震による崖崩れにも注意。"],
                [10406,"山麓堆積地形","山地や崖･段丘崖の下方にあり、山地より斜面の緩やかな土地。崖崩れや土石流などによって土砂が堆積してできる。","大雨により土石流が発生するリスクがある。地盤は不安定で、地震による崖崩れにも注意。"],
                [10407,"山麓堆積地形","山地や崖･段丘崖の下方にあり、山地より斜面の緩やかな土地。崖崩れや土石流などによって土砂が堆積してできる。","大雨により土石流が発生するリスクがある。地盤は不安定で、地震による崖崩れにも注意。"],
                [3010101,"山麓堆積地形","山地や崖･段丘崖の下方にあり、山地より斜面の緩やかな土地。崖崩れや土石流などによって土砂が堆積してできる。","大雨により土石流が発生するリスクがある。地盤は不安定で、地震による崖崩れにも注意。"],
                [10501,"扇状地","山麓の谷の出口から扇状に広がる緩やかな斜面。谷口からの氾濫によって運ばれた土砂が堆積してできる。","山地からの出水による浸水や、谷口に近い場所では土石流のリスクがある。比較的地盤は良いため、地震の際には揺れにくい。下流部では液状化のリスクがある。"],
                [10502,"扇状地","山麓の谷の出口から扇状に広がる緩やかな斜面。谷口からの氾濫によって運ばれた土砂が堆積してできる。","山地からの出水による浸水や、谷口に近い場所では土石流のリスクがある。比較的地盤は良いため、地震の際には揺れにくい。下流部では液状化のリスクがある。"],
                [3020101,"扇状地","山麓の谷の出口から扇状に広がる緩やかな斜面。谷口からの氾濫によって運ばれた土砂が堆積してできる。","山地からの出水による浸水や、谷口に近い場所では土石流のリスクがある。比較的地盤は良いため、地震の際には揺れにくい。下流部では液状化のリスクがある。"],
                [10503,"自然堤防","現在や昔の河川に沿って細長く分布し、周囲より0.5～数メートル高い土地。河川が氾濫した場所に土砂が堆積してできる。","洪水に対しては比較的安全だが、大規模な洪水では浸水することがある。縁辺部では液状化のリスクがある。"],
                [3040101,"自然堤防","現在や昔の河川に沿って細長く分布し、周囲より0.5～数メートル高い土地。河川が氾濫した場所に土砂が堆積してできる。","洪水に対しては比較的安全だが、大規模な洪水では浸水することがある。縁辺部では液状化のリスクがある。"],
                [10506,"天井川","周囲の土地より河床が高い河川。人工的な河川堤防が築かれることで、固定された河床に土砂が堆積してできる。","ひとたび天井川の堤防が決壊すれば、氾濫流が周辺に一気に拡がるため注意が必要。"],
                [10507,"天井川","周囲の土地より河床が高い河川。人工的な河川堤防が築かれることで、固定された河床に土砂が堆積してできる。","ひとたび天井川の堤防が決壊すれば、氾濫流が周辺に一気に拡がるため注意が必要。"],
                [10801,"天井川","周囲の土地より河床が高い河川。人工的な河川堤防が築かれることで、固定された河床に土砂が堆積してできる。","ひとたび天井川の堤防が決壊すれば、氾濫流が周辺に一気に拡がるため注意が必要。"],
                [10504,"砂州・砂丘","主に現在や昔の海岸･湖岸･河岸沿いにあり、周囲よりわずかに高い土地。波によって打ち上げられた砂や礫、風によって運ばれた砂が堆積することでできる。","通常の洪水では浸水を免れることが多い。縁辺部では強い地震によって液状化しやすい。"],
                [10505,"砂州・砂丘","主に現在や昔の海岸･湖岸･河岸沿いにあり、周囲よりわずかに高い土地。波によって打ち上げられた砂や礫、風によって運ばれた砂が堆積することでできる。","通常の洪水では浸水を免れることが多い。縁辺部では強い地震によって液状化しやすい。"],
                [10512,"砂州・砂丘","主に現在や昔の海岸･湖岸･河岸沿いにあり、周囲よりわずかに高い土地。波によって打ち上げられた砂や礫、風によって運ばれた砂が堆積することでできる。","通常の洪水では浸水を免れることが多い。縁辺部では強い地震によって液状化しやすい。"],
                [3050101,"砂州・砂丘","主に現在や昔の海岸･湖岸･河岸沿いにあり、周囲よりわずかに高い土地。波によって打ち上げられた砂や礫、風によって運ばれた砂が堆積することでできる。","通常の洪水では浸水を免れることが多い。縁辺部では強い地震によって液状化しやすい。"],
                [10601,"凹地・浅い谷","台地や扇状地、砂丘などの中にあり、周辺と比べてわずかに低い土地。小規模な流水の働きや、周辺部に砂礫が堆積して相対的に低くなる等でできる。","大雨の際に一時的に雨水が集まりやすく、浸水のおそれがある。地盤は周囲（台地･段丘など）より軟弱な場合があり、とくに周辺が砂州・砂丘の場所では液状化のリスクがある。"],
                [2010301,"凹地・浅い谷","台地や扇状地、砂丘などの中にあり、周辺と比べてわずかに低い土地。小規模な流水の働きや、周辺部に砂礫が堆積して相対的に低くなる等でできる。","大雨の際に一時的に雨水が集まりやすく、浸水のおそれがある。地盤は周囲（台地･段丘など）より軟弱な場合があり、とくに周辺が砂州・砂丘の場所では液状化のリスクがある。"],
                [3030101,"氾濫平野","起伏が小さく、低くて平坦な土地。洪水で運ばれた砂や泥などが河川周辺に堆積したり、過去の海底が干上がったりしてできる。","河川の氾濫に注意。地盤は海岸に近いほど軟弱で、地震の際にやや揺れやすい。液状化のリスクがある。沿岸部では高潮に注意。"],
                [10701,"氾濫平野","起伏が小さく、低くて平坦な土地。洪水で運ばれた砂や泥などが河川周辺に堆積したり、過去の海底が干上がったりしてできる。","河川の氾濫に注意。地盤は海岸に近いほど軟弱で、地震の際にやや揺れやすい。液状化のリスクがある。沿岸部では高潮に注意。"],
                [10702,"氾濫平野","起伏が小さく、低くて平坦な土地。洪水で運ばれた砂や泥などが河川周辺に堆積したり、過去の海底が干上がったりしてできる。","河川の氾濫に注意。地盤は海岸に近いほど軟弱で、地震の際にやや揺れやすい。液状化のリスクがある。沿岸部では高潮に注意。"],
                [10705,"氾濫平野","起伏が小さく、低くて平坦な土地。洪水で運ばれた砂や泥などが河川周辺に堆積したり、過去の海底が干上がったりしてできる。","河川の氾濫に注意。地盤は海岸に近いほど軟弱で、地震の際にやや揺れやすい。液状化のリスクがある。沿岸部では高潮に注意。"],
                [10703,"後背低地･湿地","主に氾濫平野の中にあり、周囲よりわずかに低い土地。洪水による砂や礫の堆積がほとんどなく、氾濫水に含まれる泥が堆積してできる。","河川の氾濫によって周囲よりも長期間浸水し、水はけが悪い。地盤が極めて軟弱で、地震の際は揺れが大きくなりやすい。液状化のリスクが大きい。沿岸部では高潮に注意。"],
                [10804,"後背低地･湿地","主に氾濫平野の中にあり、周囲よりわずかに低い土地。洪水による砂や礫の堆積がほとんどなく、氾濫水に含まれる泥が堆積してできる。","河川の氾濫によって周囲よりも長期間浸水し、水はけが悪い。地盤が極めて軟弱で、地震の際は揺れが大きくなりやすい。液状化のリスクが大きい。沿岸部では高潮に注意。"],
                [3030201,"後背低地･湿地","主に氾濫平野の中にあり、周囲よりわずかに低い土地。洪水による砂や礫の堆積がほとんどなく、氾濫水に含まれる泥が堆積してできる。","河川の氾濫によって周囲よりも長期間浸水し、水はけが悪い。地盤が極めて軟弱で、地震の際は揺れが大きくなりやすい。液状化のリスクが大きい。沿岸部では高潮に注意。"],
                [10704,"旧河道","かつて河川の流路だった場所で、周囲よりもわずかに低い土地。流路の移動によって河川から切り離されて、その後に砂や泥などで埋められてできる。","河川の氾濫によって周囲よりも長期間浸水し、水はけが悪い。地盤が軟弱で、地震の際は揺れが大きくなりやすい。液状化のリスクが大きい。"],
                [3040201,"旧河道","かつて河川の流路だった場所で、周囲よりもわずかに低い土地。流路の移動によって河川から切り離されて、その後に砂や泥などで埋められてできる。","河川の氾濫によって周囲よりも長期間浸水し、水はけが悪い。地盤が軟弱で、地震の際は揺れが大きくなりやすい。液状化のリスクが大きい。"],
                [3040202,"旧河道","かつて河川の流路だった場所で、周囲よりもわずかに低い土地。流路の移動によって河川から切り離されて、その後に砂や泥などで埋められてできる。","河川の氾濫によって周囲よりも長期間浸水し、水はけが悪い。地盤が軟弱で、地震の際は揺れが大きくなりやすい。液状化のリスクが大きい。"],
                [3040301,"落堀","河川堤防沿いにある凹地状の土地。洪水のときに、堤防を越えた水によって地面が侵食されてできる。","河川の氾濫や堤防からの越水に注意。周囲の地盤に比べて軟弱なことが多い。液状化のリスクが大きい。"],
                [10802,"河川敷･浜","調査時の河川敷や、調査時または明治期等に浜辺、岩礁である土地。","河川の増水や高波で冠水する。河川敷は液状化のリスクが大きい。"],
                [10803,"河川敷･浜","調査時の河川敷や、調査時または明治期等に浜辺、岩礁である土地。","河川の増水や高波で冠水する。河川敷は液状化のリスクが大きい。"],
                [10807,"河川敷･浜","調査時の河川敷や、調査時または明治期等に浜辺、岩礁である土地。","河川の増水や高波で冠水する。河川敷は液状化のリスクが大きい。"],
                [10808,"河川敷･浜","調査時の河川敷や、調査時または明治期等に浜辺、岩礁である土地。","河川の増水や高波で冠水する。河川敷は液状化のリスクが大きい。"],
                [10805,"水部","調査時において、海や湖沼、河川などの水面である場所。",""],
                [10806,"水部","調査時において、海や湖沼、河川などの水面である場所。",""],
                [10901,"水部","調査時において、海や湖沼、河川などの水面である場所。",""],
                [10903,"水部","調査時において、海や湖沼、河川などの水面である場所。",""],
                [5010201,"水部","調査時において、海や湖沼、河川などの水面である場所。",""],
                [10904,"旧水部","江戸時代もしくは明治期から調査時までの間に海や湖、池･貯水池であり、過去の地形図などから水部であったと確認できる土地。その後の土砂の堆積や土木工事により陸地になったところ。","地盤が軟弱である。液状化のリスクが大きい。沿岸部では高潮に注意。"],
                [5010301,"旧水部","江戸時代もしくは明治期から調査時までの間に海や湖、池･貯水池であり、過去の地形図などから水部であったと確認できる土地。その後の土砂の堆積や土木工事により陸地になったところ。","地盤が軟弱である。液状化のリスクが大きい。沿岸部では高潮に注意。"],
                [11001,"切土地","山地、台地の縁などの斜面を切取りにより造成した土地。","切取り斜面によっては、大雨や地震により斜面崩壊のリスクがある。地盤は一般的に良好。"],
                [11003,"切土地","山地、台地の縁などの斜面を切取りにより造成した土地。","切取り斜面によっては、大雨や地震により斜面崩壊のリスクがある。地盤は一般的に良好。"],
                [11009,"切土地","山地、台地の縁などの斜面を切取りにより造成した土地。","切取り斜面によっては、大雨や地震により斜面崩壊のリスクがある。地盤は一般的に良好。"],
                [11011,"切土地","山地、台地の縁などの斜面を切取りにより造成した土地。","切取り斜面によっては、大雨や地震により斜面崩壊のリスクがある。地盤は一般的に良好。"],
                [4010301,"切土地","山地、台地の縁などの斜面を切取りにより造成した土地。","切取り斜面によっては、大雨や地震により斜面崩壊のリスクがある。地盤は一般的に良好。"],
                [11002,"農耕平坦化地","山地などを切り開いて整地した農耕地。","大雨や地震により崩壊するリスクがある。"],
                [11005,"高い盛土地","周辺よりも約2m以上盛土した造成地。主に海水面などの水部に土砂を投入して陸地にしたり、谷のような凹地を埋め立てて造成した土地。","海や湖沼、河川を埋め立てた場所では、強い地震の際に液状化のリスクがある。山間部の谷を埋め立てた造成地では、大雨や地震により地盤崩壊のリスクがある。"],
                [4010201,"高い盛土地","周辺よりも約2m以上盛土した造成地。主に海水面などの水部に土砂を投入して陸地にしたり、谷のような凹地を埋め立てて造成した土地。","海や湖沼、河川を埋め立てた場所では、強い地震の際に液状化のリスクがある。山間部の谷を埋め立てた造成地では、大雨や地震により地盤崩壊のリスクがある。"],
                [11008,"干拓地","水面や低湿地を堤防で締め切って排水して、新たな陸地になった土地。過去の地形図や資料から、干拓されたことが確認できる場所。","一般に海･湖水面より低いため、洪水時に氾濫水が留まりやすい。沿岸部では特に高潮に対して注意が必要。地盤は軟弱で、地震による揺れも大きくなりやすい。液状化のリスクがある。"],
                [4010101,"干拓地","水面や低湿地を堤防で締め切って排水して、新たな陸地になった土地。過去の地形図や資料から、干拓されたことが確認できる場所。","一般に海･湖水面より低いため、洪水時に氾濫水が留まりやすい。沿岸部では特に高潮に対して注意が必要。地盤は軟弱で、地震による揺れも大きくなりやすい。液状化のリスクがある。"],
                [11004,"盛土地･埋立地","周囲の地表より高く盛土した土地や、海水面などの水部に土砂を投入して陸地にしたり、谷のような凹地を埋め立てて造成した土地。","高さが十分でない場合には浸水のリスクがある。山地や台地では降雨･地震により地盤崩壊のリスクがある。低地では液状化のリスクがあり、海や湖沼･河川を埋め立てた場所では特に注意。"],
                [11006,"盛土地･埋立地","周囲の地表より高く盛土した土地や、海水面などの水部に土砂を投入して陸地にしたり、谷のような凹地を埋め立てて造成した土地。","高さが十分でない場合には浸水のリスクがある。山地や台地では降雨･地震により地盤崩壊のリスクがある。低地では液状化のリスクがあり、海や湖沼･河川を埋め立てた場所では特に注意。"],
                [11007,"盛土地･埋立地","周囲の地表より高く盛土した土地や、海水面などの水部に土砂を投入して陸地にしたり、谷のような凹地を埋め立てて造成した土地。","高さが十分でない場合には浸水のリスクがある。山地や台地では降雨･地震により地盤崩壊のリスクがある。低地では液状化のリスクがあり、海や湖沼･河川を埋め立てた場所では特に注意。"],
                [11014,"盛土地･埋立地","周囲の地表より高く盛土した土地や、海水面などの水部に土砂を投入して陸地にしたり、谷のような凹地を埋め立てて造成した土地。","高さが十分でない場合には浸水のリスクがある。山地や台地では降雨･地震により地盤崩壊のリスクがある。低地では液状化のリスクがあり、海や湖沼･河川を埋め立てた場所では特に注意。"],
                [11010,"改変工事中","調査時に土地の改変工事が行われていた土地。",""],
                [9999,"拡大すると地形分類が表示されます。","",""],

                [11,"山地","起伏が大きな尾根と谷からなる地形。","土砂災害に注意。"],
                [12,"残丘状地形","周囲から孤立して突出した岩峰または台地状の地形（約260万年前よりも古い時代の火山岩からなるものに限る）。","土砂災害に注意。とくに周縁部の崖では、落石や斜面崩壊に注意。"],
                [13,"カルスト地形","石灰岩が雨水で溶けてできた地形。尾根や谷が少なく、しばしば陥没地形がみられる。","地盤の陥没に注意。周縁部の崖では、落石や斜面崩壊に注意。"],
                [21,"丘陵・小起伏地","起伏が小さな尾根と谷からなる地形。","土砂災害に注意。"],

                [31,"火山地形（明瞭）","火山噴火によってできた急斜面のうち、比較的新しい時代にできた地形。溶岩流などの詳細な地形が多く残されている部分。","火山噴火、土砂災害に注意。"],
                [32,"火山地形（やや不明瞭）","火山噴火によってできた急斜面のうち、比較的古い時代にできた地形。侵食作用によって削られて、火山の大まかな地形のみを残している部分。","土砂災害に注意。"],
                [33,"火山性丘陵","火山噴出物や、火山から運ばれた土砂によってできた緩やかな斜面が、その後の侵食作用によって削られてできた地形。起伏が小さな尾根と谷からなる。","土砂災害に注意。"],
                [34,"火山麓地形","火山噴出物や、火山から運ばれた土砂によってできた緩やかな斜面。比較的新しい時代の火砕流や火山斜面の侵食によって生じた土砂が堆積してできた地形。","火山噴火、土砂災害に注意。"],
                [41,"台地・段丘","低地が隆起してできた台地状の地形。低地との境界などには侵食による崖（段丘崖）がみられることが多い。","段丘崖の周辺では、落石や崖崩れに注意。"],
                [51,"低地","河川や海の流れによって運ばれた砂礫や泥が堆積してできた平坦地。または、その流れの侵食によってできた平坦地。","河川氾濫、高潮、液状化に注意。地震時に揺れやすい。"],
                [61,"砂丘","風によって運ばれた砂が小高く堆積してできた地形。","周縁部や、周囲よりも低い場所では、液状化に注意。地震時に揺れやすい。"],
                [71,"湖","自然にできた湖。下流部が土砂や火山噴出物などで塞がれたり、土地が沈降したりしてできる。",""],

                [1,"山地・丘陵","尾根と谷からなる地形。","土砂災害に注意。"],
                [3,"火山地形","火山噴出物や、火山から運ばれた土砂によってできた地形。","火山噴火、土砂災害に注意。"],
                [4,"台地・段丘","低地が隆起してできた台地状の地形。低地との境界などには侵食による崖（段丘崖）がみられることが多い。","段丘崖の周辺では、落石や崖崩れに注意。"],
                [5,"低地","河川や海の流れによって運ばれた砂礫や泥が堆積してできた平坦地。または、その流れの侵食によってできた平坦地。","河川氾濫、高潮、液状化に注意。地震時に揺れやすい。"],
                [6,"砂丘","風によって運ばれた砂が小高く堆積してできた地形。","周縁部や、周囲よりも低い場所では、液状化に注意。地震時に揺れやすい。"],
                [7,"湖","自然にできた湖。下流部が土砂や火山噴出物などで塞がれたり、土地が沈降したりしてできる。",""]
            )


            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.code
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            let naritachi = "",risk = ""
            const list = codeList_sizen
            for(var i=0;i<list.length;i++){
              if(list[i][1] === name){//ズーム率によって数値型になったり文字型になったりしている模様
                naritachi = list[i][2]
                risk = list[i][3]
                break;
              }
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(
                    '<div font-weight: normal; color: #333;line-height: 25px;">' +
                    '<span style="font-size: 20px;">' + name + '</span><hr>' +
                    '<span style="font-size: 12px;">' + naritachi + '</span><hr>' +
                    '<span style="font-size: 12px;">' + risk + '</span>' +
                    '</div>'
                )
                .addTo(map)
          })
          map.on('click', 'oh-cyugakuR05', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.A32_004
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(`
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   ${name}
                  </div>
                `)
                .addTo(map)
          })
          map.on('click', 'oh-syogakkoR05', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.A27_004
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(`
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   ${name}
                  </div>
                `)
                .addTo(map)
          })
          map.on('click', 'oh-bakumatsu', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.村名
            const kokudaka = Math.floor(Number(props.石高計))
            const ryobun = props.領分１

            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(`
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `)
                .addTo(map)
          })
          map.on('click', 'oh-bakumatsu-kokudaka', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.村名
            const kokudaka = Math.floor(Number(props.石高計))
            const ryobun = props.領分１

            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(`
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `)
                .addTo(map)
          })
          map.on('click', 'oh-bakumatsu-han', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.村名
            const kokudaka = Math.floor(Number(props.石高計))
            const ryobun = props.領分１

            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(`
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `)
                .addTo(map)
          })
          // ------------------------------------------
          map.on('click', 'oh-highwayLayer-green-lines', (e) => {
            let coordinates = e.lngLat
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            const props = e.features[0].properties
            console.log(props)
            const name = props.N06_007
            console.log(name)
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(`
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   ${name}
                  </div>
                `)
                .addTo(map)
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
        // console.log('変更を検出しました')
        this.updatePermalink()
      },
      deep: true
    },
    pitch () {
      // document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('click', function() {
      // 上とセットで動く。
      if (this.pitch === 0 ) {
        this.$store.state.map01.setTerrain(null)
        this.$store.state.map02.setTerrain(null)
      }
    }
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

<style>
.maplibregl-popup-content {
  padding: 30px 20px 10px 20px;
  width: 300px;
}
.maplibregl-popup-close-button{
  font-size: 40px;
}
</style>