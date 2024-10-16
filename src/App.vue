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
import codeShizen from '@/js/codeShizen'
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
            // "glyphs": "https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf",
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
          addEventListener('keydown', function () {
            map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': 1 });
          })




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
          map.on('click', 'oh-m250m', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            let name = props.jinko
            name = '人口' + Math.floor(Number(name)) + '人'
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(
                    '<div font-weight: normal; color: #333;line-height: 25px;">' +
                    '<span style="font-size: 20px;">' + name + '</span>' +
                    '</div>'
                )
                .addTo(map)
          })
          map.on('click', 'oh-m100m', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            let name = props.PopT
            name = '人口' + Math.floor(Number(name)) + '人'
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            // ポップアップを表示する
            new maplibregl.Popup({
              offset: 10,
              closeButton: true,
            })
                .setLngLat(coordinates)
                .setHTML(
                    '<div font-weight: normal; color: #333;line-height: 25px;">' +
                    '<span style="font-size: 20px;">' + name + '</span>' +
                    '</div>'
                )
                .addTo(map)
          })
          // -----------------------------------------------------------------------------------------------------------

          map.on('mouseenter', 'oh-iryokikan', function () {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'oh-iryokikan', function () {
            map.getCanvas().style.cursor = '';
          });
          map.on('click', 'oh-iryokikan', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.P04_002
            const address = props.P04_003
            const kamoku = props.P04_004
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
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
                    '<span style="font-size: 12px;">' + address + '</span><hr>' +
                    '<span style="font-size: 12px;">' + kamoku + '</span>' +
                    '</div>'
                )
                .addTo(map)
          })
          // -----------------------------------------------------------------------------------------------------------
          map.on('mouseenter', 'oh-iryokikanLayer-label', function () {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'oh-iryokikanLayer-label', function () {
            map.getCanvas().style.cursor = '';
          });
          map.on('click', 'oh-iryokikanLayer-label', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.P04_002
            const address = props.P04_003
            const kamoku = props.P04_004
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
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
                    '<span style="font-size: 12px;">' + address + '</span><hr>' +
                    '<span style="font-size: 12px;">' + kamoku + '</span>' +
                    '</div>'
                )
                .addTo(map)
          })
          map.on('click', 'oh-nihonrekishi', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.名称

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
          map.on('click', 'oh-chikeibunrui', (e) => {
            let coordinates = e.lngLat
            const props = e.features[0].properties
            console.log(props)
            const name = props.code
            while (Math.abs(e.lngLat.lng - coordinates) > 180) {
              coordinates += e.lngLat.lng > coordinates ? 360 : -360;
            }
            let naritachi = "",risk = ""
            const list = codeShizen
            for(var i=0;i < list.length; i++){
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
  max-width: 300px;
}
.maplibregl-popup-close-button{
  font-size: 40px;
}
</style>