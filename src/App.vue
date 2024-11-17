<template>
  <v-app>
    <v-main>
      <div id="map00">
        <div v-for="mapName in mapNames" :key="mapName" :id=mapName :style="mapSize[mapName]" v-show="mapFlg[mapName]" @click="btnPosition">

          <div id="pointer1" class="pointer" v-if="mapName === 'map01'"></div>
          <div id="pointer2" class="pointer" v-if="mapName === 'map02'"></div>

          <div class="center-target"></div>
          <div id="left-top-div">
            <v-btn icon @click="btnClickMenu(mapName)" v-if="mapName === 'map01'"><v-icon>mdi-menu</v-icon></v-btn>
            <v-btn icon style="margin-left:10px;" @click="btnClickSplit" v-if="mapName === 'map01'"><v-icon>mdi-monitor-multiple</v-icon></v-btn>
            <v-btn icon style="margin-left:10px;" @click="btnClickLayer(mapName)"><v-icon>mdi-layers</v-icon></v-btn>
          </div>
          <div id="right-top-div">
            <v-btn icon @click="goToCurrentLocation" v-if="mapName === 'map01'"><v-icon>mdi-crosshairs-gps</v-icon></v-btn>
            <v-btn class="zoom-in" icon @click="zoomIn" v-if="mapName === 'map01'"><v-icon>mdi-plus</v-icon></v-btn>
            <v-btn class="zoom-out" icon @click="zoomOut" v-if="mapName === 'map01'"><v-icon>mdi-minus</v-icon></v-btn>
          </div>

          <DialogMenu :mapName=mapName />
          <DialogLayer :mapName=mapName />
          <dialog-info :mapName=mapName />
          <dialog2 :mapName=mapName />

          <div :id="'terrain-btn-div-' + mapName" class="terrain-btn-div">
            <div class="terrain-btn-container">
              <v-btn type="button" class="terrain-btn-up terrain-btn" @pointerdown="upMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-up fa-lg hover'></i></v-btn>
              <v-btn type="button" class="terrain-btn-down terrain-btn" @pointerdown="downMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-down fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-left terrain-btn" @pointerdown="leftMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-left fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-right terrain-btn" @pointerdown="rightMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-right fa-lg'></i></v-btn>
              <v-btn icon type="button" class="terrain-btn-center terrain-btn" @pointerdown="terrainReset(mapName)"><v-icon>mdi-undo</v-icon></v-btn>
            </div>
          </div>
          <div class="zoom-div">zoom={{zoom.toFixed(2)}}<br>{{address}}</div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
const popups = []
function closeAllPopups() {
  popups.forEach(popup => popup.remove())
  // 配列をクリア
  popups.length = 0
}
export function history (event,url) {
  const ua = navigator.userAgent
  const width = window.screen.width
  const height = window.screen.height
  const referrer = document.referrer
  axios
      .get('https://kenzkenz.xsrv.jp/open-hinata3/php/history.php',{
        params: {
          event: event,
          screen: width + ' x ' + height,
          ua: ua,
          referrer:referrer,
          url: url
        }
      })
}

import axios from "axios"
import DialogMenu from '@/components/Dialog-menu'
import DialogLayer from '@/components/Dialog-layer'
import DialogInfo from '@/components/Dialog-info'
import Dialog2 from '@/components/Dialog2'
import codeShizen from '@/js/codeShizen'
import pyramid from '@/js/pyramid'
import * as Layers from '@/js/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import { Protocol } from "pmtiles"
import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain'
import {monoLayers, monoSources} from "@/js/layers"
// import {paleLayer, paleSource} from "@/js/layers"
import muni from '@/js/muni'

export default {
  name: 'App',
  components: {
    DialogLayer,
    DialogMenu,
    DialogInfo,
    Dialog2,
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
    pitch:{map01:0,map02:0},
    bearing:0,
    zoom:0,
    address:''
  }),
  computed: {
    s_terrainLevel: {
      get() {
        return this.$store.state.terrainLevel
      },
      set(value) {
        this.$store.state.terrainLevel = value
      }
    },
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
    zoomIn () {
      const map = this.$store.state.map01
      map.zoomIn({ duration: 500 })
    },
    zoomOut () {
      const map = this.$store.state.map01
      map.zoomOut({ duration: 500 })
    },
    goToCurrentLocation () {
      const map = this.$store.state.map01
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLongitude = position.coords.longitude;
              const userLatitude = position.coords.latitude;
              // ユーザーの操作を一時的に無効化
              map.scrollZoom.disable();
              map.dragPan.disable();
              map.keyboard.disable();
              map.doubleClickZoom.disable();
              // 現在位置にマップを移動
              map.flyTo({
                center: [userLongitude, userLatitude],
                zoom: 14,
                essential: true // アニメーションを有効にする
              });
              // flyToアニメーション完了後にユーザー操作を再度有効化
              map.once('moveend', () => {
                map.scrollZoom.enable();
                map.dragPan.enable();
                map.keyboard.enable();
                map.doubleClickZoom.enable();
              });
              // 現在位置にマーカーを追加
              const marker = new maplibregl.Marker()
                  .setLngLat([userLongitude, userLatitude])
                  // .setPopup(new maplibregl.Popup().setHTML("<strong>現在位置</strong>"))
                  .addTo(map);
              // マーカーをクリックしたときにマーカーを削除
              marker.getElement().addEventListener('click', () => {
                marker.remove(); // マーカーをマップから削除
              });
            },
            (error) => {
              console.error("現在位置の取得に失敗しました:", error);
            }
        );
      } else {
        console.error("Geolocationはこのブラウザでサポートされていません。");
      }
      history('現在位置取得',window.location.href)
    },
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
        vm.pitch[mapName] = map.getPitch()
        if (vm.pitch[mapName] !==0) {
          map.setPitch(map.getPitch() - 5)
          requestAnimationFrame(pitch)
        } else {
          map.setPitch(0)
          vm.pitch[mapName] = map.getPitch()
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
      this.$store.state[mapName].setTerrain(null)
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
          map.setBearing(map.getBearing() + 2)
          // vm.$store.state.map01.setBearing(map.getBearing() + 2)
          // vm.$store.state.map02.setBearing(map.getBearing() + 2)
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
          map.setBearing(map.getBearing() - 2)
          // vm.$store.state.map01.setBearing(map.getBearing() - 2)
          // vm.$store.state.map02.setBearing(map.getBearing() - 2)
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
        vm.pitch[mapName] = map.getPitch()
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() + 2)
          requestAnimationFrame(pitch)
        } else {
          vm.pitch[mapName] = map.getPitch()
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
        vm.pitch[mapName] = map.getPitch()
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() - 2)
          requestAnimationFrame(pitch)
        } else {
          vm.pitch[mapName] = map.getPitch()
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
        if (popups.length > 0) {
          closeAllPopups()
        }
      }
    },
    updatePermalink() {
      const map = this.$store.state.map01
      const center = map.getCenter()
      const zoom = map.getZoom()
      const { lng, lat } = center
      const split = this.mapFlg.map02
      const pitch01 = !isNaN(this.pitch.map01) ? this.pitch.map01: 0
      const pitch02 = !isNaN(this.pitch.map02) ? this.pitch.map02: 0
      let terrainLevel = this.s_terrainLevel
      if (isNaN(terrainLevel)) terrainLevel = 1
      // console.log(this.bearing)
      let bearing = 0
      if (isNaN(this.bearing)) {
        bearing = 0
      } else {
        if (this.bearing > -5 && this.bearing < 5 ) {
          console.log('0に修正')
          bearing = 0
          this.bearing = 0
        } else {
          bearing = this.bearing
        }
      }
      // console.log(pitch01)
      const selectedLayersJson = JSON.stringify(this.$store.state.selectedLayers)
      // パーマリンクの生成
      this.param = `?lng=${lng}&lat=${lat}&zoom=${zoom}&split=${split}&pitch01=${pitch01}&pitch02=${pitch02}&bearing=${bearing}&terrainLevel=${terrainLevel}&slj=${selectedLayersJson}`
      // console.log(this.param)
      // this.permalink = `${window.location.origin}${window.location.pathname}${this.param}`
      // URLを更新
      // window.history.pushState({ lng, lat, zoom }, '', this.permalink)
      this.createShortUrl()
      this.zoom = zoom
      const vm = this
      axios
          .get('https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress', {
            params: {
              lon: lng,
              lat: lat
            }
          })
          .then(function (response) {
            if (response.data.results) {
              const splitMuni = muni[Number(response.data.results.muniCd)].split(',')
              vm.address = splitMuni[1] + splitMuni[3] + response.data.results.lv01Nm
            }
          })

      history('updatePermalink',window.location.href)
    },
    createShortUrl() {
      let params = new URLSearchParams()
      params.append('parameters', this.param)
      axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrl.php', params)
          .then(response => {
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
      const lng = parseFloat(params.get('lng'))
      const lat = parseFloat(params.get('lat'))
      const zoom = parseFloat(params.get('zoom'))
      const split = params.get('split')
      const pitch = parseFloat(params.get('pitch'))// 以前のリンクをいかすため---------------------------------
      const pitch01 = parseFloat(params.get('pitch01'))
      const pitch02 = parseFloat(params.get('pitch02'))
      const bearing = parseFloat(params.get('bearing'))
      const terrainLevel = parseFloat(params.get('terrainLevel'))
      const slj = JSON.parse(params.get('slj'))
      this.pitch.map01 = pitch01
      this.pitch.map02 = pitch02
      this.bearing = bearing
      this.s_terrainLevel = terrainLevel
      return {lng,lat,zoom,split,pitch,pitch01,pitch02,bearing,terrainLevel,slj}// 以前のリンクをいかすためpitchを入れている。
    },
    init() {
      let protocol = new Protocol();
      maplibregl.addProtocol("pmtiles",protocol.tile)
      const params = this.parseUrlParams()
      this.mapNames.forEach(mapName => {

        // 2画面-----------------------------------------------------------
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
        // --------------------------------------------------------------
        let center = [139.84267451046338,38.36453863570733]
        let zoom = 5
        let pitch= {map01:0,map02:0}
        let bearing = 0
        if (params.lng) {
          center = [params.lng,params.lat]
          zoom = params.zoom
          pitch = {map01:params.pitch01,map02:params.pitch02}
          bearing = params.bearing
        }
        // 以前のリンクをいかすため---------------------------------
        if (params.pitch || params.pitch === 0) {
          if (isNaN(params.pitch)) {
            pitch = {map01:0,map02:0}
          } else {
            pitch = {map01:params.pitch,map02:params.pitch}
          }
        }
        // 以前のリンクをいかすため---------------------------------
        // const maptilerApiKey = 'CDedb3rcFcdaYuHkD9zR'
        const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
          tileUrl: 'https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png',
          maxzoom: 19,
          attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_int">全国Q地図日本国内統合標高データ</a>'
        })

        const map = new maplibregl.Map({
          container: mapName,
          localIdeographFontFamily: ['sans-serif'], // 日本語を表示するための設定
          center: center,
          zoom: zoom,
          pitch: pitch[mapName],
          bearing:bearing,
          maxPitch: 85, // 最大の傾き、デフォルトは60
          attributionControl: false,
          // style: 'https://raw.githubusercontent.com/gsi-cyberjapan/optimal_bvmap/52ba56f645334c979998b730477b2072c7418b94/style/std.json',
          // style:require('@/assets/json/std.json')
          // style:"https://kenzkenz.xsrv.jp/open-hinata3/json/std.json",
          // style: {
          //   version: 8,
          //   // sprite: 'https://kenzkenz.xsrv.jp/open-hinata3/json/spritesheet',
          //   glyphs: "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
          //   // "glyphs": "https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf",
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
          //     ]
          // },

          // style: `https://api.maptiler.com/maps/streets/style.json?key=${maptilerApiKey}`, // MapTilerのスタイルURL

          // style:require('@/assets/json/basic.json')

          style: {
            'version': 8,
            // glyphs: "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
            "glyphs": "https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf",
            "sprite": "https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std",
            'sources': {
              terrain: gsiTerrainSource,
            },
            'layers': []
          },
        })
        this.$store.state[mapName] = map

      })
      // --------------------------------
      const map = this.$store.state.map01
      const vm = this
      //----------------------------------

      map.on('click', (e) => {
        const latitude = e.lngLat.lat
        const longitude = e.lngLat.lng
        console.log(longitude, latitude)
      })

      map.on('moveend', () => {
        this.$store.state.watchFlg = true
        const bounds = map.getBounds()
        // 南西端と北東端の座標を取得
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        this.$store.state.lngRange = [sw.lng,ne.lng]
        this.$store.state.latRange = [sw.lat,ne.lat]
      })

      // 画面同期----------------------------------------------------------------------------------------------------------
      // スロットリング用のヘルパー関数
      // function throttle(func, limit) {
      //   let lastFunc;
      //   let lastRan;
      //   return function(...args) {
      //     if (!lastRan) {
      //       func(...args);
      //       lastRan = Date.now();
      //     } else {
      //       clearTimeout(lastFunc);
      //       lastFunc = setTimeout(function() {
      //         if ((Date.now() - lastRan) >= limit) {
      //           func(...args);
      //           lastRan = Date.now();
      //         }
      //       }, limit - (Date.now() - lastRan));
      //     }
      //   };
      // }

      let syncing = false
      function syncMaps(mapA, mapB) {
        // iphoneのtきmoveではフリーズする。moveendではフリーズしない。
        let m = 'move'
        if (window.innerWidth < 1000) {
          m = 'moveend'
        }
        mapA.on(m, () => {
          // throttle(() => {
            if (!syncing) {
              syncing = true
              mapB.setCenter(mapA.getCenter())
              mapB.setZoom(mapA.getZoom())
              mapB.setBearing(mapA.getBearing())
              if (vm.$store.state.isPitch) mapB.setPitch(mapA.getPitch())
              syncing = false
            }
          // }, 100); // 100msの間隔で発火
        })
        mapB.on(m, () => {
          // throttle(() => {
            if (!syncing) {
              syncing = true
              mapA.setCenter(mapB.getCenter())
              mapA.setZoom(mapB.getZoom())
              mapA.setBearing(mapB.getBearing())
              if (vm.$store.state.isPitch) mapA.setPitch(mapB.getPitch())
              syncing = false
            }
          // }, 100); // 100msの間隔で発火
        })
      }
      syncMaps(this.$store.state.map01, this.$store.state.map02)
      // --------------
      const pointer1 = document.getElementById('pointer1')
      const pointer2 = document.getElementById('pointer2')
      // マップ1のマウス移動イベントでポインターを同期
      const map1 = this.$store.state.map01
      const map2 = this.$store.state.map02
      map1.on('mousemove', (e) => {
        const bounds = map1.getContainer().getBoundingClientRect()
        const x = e.originalEvent.clientX - bounds.left
        const y = e.originalEvent.clientY - bounds.top

        // map1のポインター位置を更新
        pointer1.style.left = `${x}px`
        pointer1.style.top = `${y}px`
        pointer1.style.display = 'none'

        // 同じ位置をmap2に変換
        const lngLat = map1.unproject([x, y])
        const projectedPoint = map2.project(lngLat)
        pointer2.style.left = `${projectedPoint.x}px`
        pointer2.style.top = `${projectedPoint.y}px`
        pointer2.style.display = 'block'
      })

      // マップ2のマウス移動イベントでポインターを同期
      map2.on('mousemove', (e) => {
        const bounds = map2.getContainer().getBoundingClientRect()
        const x = e.originalEvent.clientX - bounds.left
        const y = e.originalEvent.clientY - bounds.top

        // map2のポインター位置を更新
        pointer2.style.left = `${x}px`
        pointer2.style.top = `${y}px`
        pointer2.style.display = 'none'

        // 同じ位置をmap1に変換
        const lngLat = map2.unproject([x, y])
        const projectedPoint = map1.project(lngLat)
        pointer1.style.left = `${projectedPoint.x}px`
        pointer1.style.top = `${projectedPoint.y}px`
        pointer1.style.display = 'block'
      })

      // map1のクリックイベント
      // map1.on('click', (e) => {
      //   if (syncing) return  // 同期中の場合は再帰呼び出しを防ぐ
      //   syncing = true
      //   const coordinates = e.lngLat
      //   // map2のクリックイベントをプログラムで発生させる
      //   map2.fire('click', { lngLat: coordinates })
      //   syncing = false
      // })
      //
      // // map2のクリックイベント
      // map2.on('click', (e) => {
      //   if (syncing) return  // 同期中の場合は再帰呼び出しを防ぐ
      //   syncing = true
      //   const coordinates = e.lngLat
      //   // map1のクリックイベントをプログラムで発生させる
      //   map1.fire('click', { lngLat: coordinates })
      //   syncing = false
      // })

      // -----------------------------------------------------------------------------------------------------------------
      // on load
      this.mapNames.forEach(mapName => {
        const map = this.$store.state[mapName]
        const params = this.parseUrlParams()
        map.on('load', () => {
          // map.setProjection({"type": "globe"})
          map.resize()

          // const attributionButton = document.querySelector('#' + mapName +' .maplibregl-ctrl-attrib-button');
          // if (attributionButton) {
          //   attributionButton.click(); // 初期状態で折りたたむ
          // }

          // // 二画面-----------------------------------------------------------
          // if (mapName === 'map02') {
          //   if (params.split === 'true') {
          //     this.mapFlg.map02 = true
          //     if (window.innerWidth > 1000) {
          //       this.mapSize.map01.width = '50%'
          //       this.mapSize.map01.height = '100%'
          //     } else {
          //       this.mapSize.map01.width = '100%'
          //       this.mapSize.map01.height = '50%'
          //       this.mapSize.map02.width = '100%'
          //       this.mapSize.map02.height = '50%'
          //       this.mapSize.map02.top = '50%'
          //     }
          //   }
          // }
          // ----------------------------------------------------------------
          // ここを改善する必要あり ここでプログラムがエラーなしでとまる。
          //
          // console.log(mapName)
          // console.log(params.slj)

          if (params.slj) {
            const mapNames = ['map01','map02']
            mapNames.forEach(mapName => {
              params.slj[mapName].forEach(slg => {
                let cnt = 0
                function aaa() {
                  Layers.layers[mapName].forEach(value => {
                    if (!value.nodes) cnt++

                    function bbb(v1) {
                      if (v1.nodes) {
                        v1.nodes.forEach(v2 => {
                          // console.log(v2.nodes)
                          if (!v2.nodes) {
                            if (v2.id === slg.id) {
                              slg.source = v2.source
                              slg.layers = v2.layers
                            }
                            cnt++
                          } else {
                            bbb(v2)
                          }
                        })
                      } else {
                        if (value.id === slg.id) {
                          slg.source = value.source
                          slg.layers = value.layers
                        }
                      }
                    }
                    bbb(value)
                  })
                }
                aaa()
                console.log('背景' + cnt + '件')
              })            })
          } else {
            this.s_selectedLayers[mapName].unshift(
                // {
                //   id: 'oh-pale-layer',
                //   label: '淡色地図',
                //   source: paleSource,
                //   layers: [paleLayer],
                //   attribution: '国土地理院',
                //   opacity: 1,
                //   visibility: true,
                // }
                {
                  id: 'oh-vector-layer-mono',
                  label: 'ベクトルタイルモノクロ',
                  sources: monoSources,
                  layers: monoLayers,
                  attribution: '国土地理院',
                  opacity: 1,
                  visibility: true,
                }
            )
          }
          console.log(params.slj)
          if (params.slj) this.s_selectedLayers = params.slj
          this.s_selectedLayers.map01 = this.s_selectedLayers.map01.filter(layer => layer.id !== 'oh-konzyaku-layer')


          // ----------------------------------------------------------------

          // const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
          //   tileUrl: 'https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',
          //   maxzoom: 17,
          //   attribution: '<a href="https://gbank.gsj.jp/seamless/elev/">産総研シームレス標高タイル</a>'
          // });
          // const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
          // map.addSource(gsiTerrainSource)




          // 標高タイルソース---------------------------------------------------
          // map.addSource("gsidem-terrain-rgb", {
          //   type: 'raster-dem',
          //   tiles: ['https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png'],
          //   // tiles: ['https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png'],
          //   attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html#dem" target="_blank">地理院タイル(標高タイル)</a>',
          //   tileSize: 256,
          // })
          // 標高タイルセット
          // map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel });
          const vm = this
          if (isNaN(vm.s_terrainLevel)) vm.s_terrainLevel = 1

          document.querySelector('#' + mapName + ' .terrain-btn-up,terrain-btn-down').addEventListener('mouseover', function() {
            const layers = map.getStyle().layers
            if (!layers.find(layer => {
              return layer.id.indexOf('height') !== -1
            }
            )) {
              map.setTerrain({'source': 'terrain', 'exaggeration': vm.s_terrainLevel})
            } else {
              map.setTerrain(null)
            }
          }, false);
          document.querySelector('#' + mapName + ' .terrain-btn-up,terrain-btn-down').addEventListener('pointerdown', function() {
            const layers = map.getStyle().layers
            if (!layers.find(layer => {
                  return layer.id.indexOf('height') !== -1
                }
            )) {
              map.setTerrain({'source': 'terrain', 'exaggeration': vm.s_terrainLevel})
            } else {
              map.setTerrain(null)
            }
          }, false);


          // document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('mouseover', function() {
          //   map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          // }, false);
          // document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('pointerdown', function() {
          //   map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          // }, false);



          // addEventListener('keydown', function () {
          //   map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          // })
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
          // map.setTerrain({ 'source': 'aws-terrain', 'exaggeration': this.s_terrainLevel });

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
          // ここを改善
          // map.on('moveend', this.updatePermalink)
          map.on('click', this.updatePermalink)
          map.on('dragend', this.updatePermalink)
          // map.on('zoomend', this.updatePermalink)
          map.on('idle', this.updatePermalink)

          //------------------------------------------------------------------------------------------------------------
          map.on('mousemove', (e) => {
            // クリック可能なすべてのレイヤーからフィーチャーを取得
            const features = map.queryRenderedFeatures(e.point);
            if (features.length) {
              const feature = features[0]; // 最初のフィーチャーのみ取得
              const layerId = feature.layer.id
              // console.log(layerId)
              if (layerId.indexOf('vector') !== -1) {
                map.getCanvas().style.cursor = 'default'
              } else {
                map.getCanvas().style.cursor = 'pointer'
              }
              // map.getCanvas().style.cursor = 'pointer'
            } else {
              map.getCanvas().style.cursor = 'default'
            }
          })
          //------------------------------------------------------------------------------------------------------------
          map.on('click', (e) => {
            let html = ''
            let features = map.queryRenderedFeatures(e.point); // クリック位置のフィーチャーを全て取得
            console.log(features[0])
            // const coordinates = e.lngLat
            let coordinates
            if (features.length > 0) {
              coordinates = features[0].geometry.coordinates.slice()
              if (coordinates.length === 2) {
                if (coordinates[0].length > 0) {
                  coordinates = e.lngLat
                }
              } else {
                coordinates = e.lngLat
              }
            } else {
              coordinates = e.lngLat
            }

            // if (features.length > 0) {
            features.forEach(feature => {
              const layerId = feature.layer.id
              console.log(layerId)
              let props = feature.properties
              // const coordinates = e.lngLat
              // let coordinates = feature.geometry.coordinates.slice()
              // if (coordinates.length !== 2) coordinates = e.lngLat
              console.log(props)
              switch (layerId) {
                case 'oh-zosei-line':
                case 'oh-zosei-label':
                case 'oh-zosei': {
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-zosei']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  let name
                  if (props.A54_001 === '1') {
                    name = '谷埋め型'
                  } else if (props.A54_001 === '2') {
                    name = '腹付け型'
                  } else if (props.A54_001 === '9') {
                    name = '区分をしていない'
                  }
                  const syozai = props.A54_003 + props.A54_005
                  const bango = props.A54_006
                  if (html.indexOf('zosei') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="zosei" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + syozai + '</span><hr>' +
                        '<span style="font-size: 12px;">' + bango + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-mw5-center': {
                  console.log(props)
                  const name = props.title
                  const link = '<a href="https://mapwarper.h-gis.jp/maps/' + props.id + '" target="_blank" >日本版Map Warper</a>'
                  if (html.indexOf('mw5-center') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="mw5-center" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + link + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-tetsudo-blue-lines':
                case 'oh-tetsudo-red-lines': {
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  if (html.indexOf('tetsudo-red-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudo-red-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-tetsudo-points-blue':
                case 'oh-tetsudo-points-red': {
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  const eki = props.N05_011
                  if (html.indexOf('tetsudo-points-red') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudo-points-red" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + eki + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-tetsudojikeiretsu-red-lines':
                case 'oh-tetsudojikeiretsu-blue-lines': {
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  if (html.indexOf('tetsudojikeiretsu-blue-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudojikeiretsu-blue-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-tetsudojikeiretsu-points': {
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  const eki = props.N05_011
                  if (html.indexOf('tetsudojikeiretsu-points') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudojikeiretsu-points" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + eki + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-michinoeki-label':
                case 'oh-michinoeki': {
                  const name = props.P35_006
                  const link = '<a href="' + props.P35_007 + '" target="_blank">道の駅ページへ</a>'
                  if (html.indexOf('michinoeki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="michinoeki" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<div style="font-size: 20px;margin-top: 10px;">' + link + '</div>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-koji-label':
                case 'oh-koji-height':
                case 'oh-koji_point': {
                  const name = props.L01_025
                  const kojikakaku = props.L01_008.toLocaleString() + '円'
                  if (html.indexOf('koji_point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="koji_point" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + kojikakaku + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-did': {
                  const name = props.A16_003
                  const jinko = props.A16_005.toLocaleString() + '人'
                  if (html.indexOf('did') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="did" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + jinko + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-syochiiki-height':
                case 'oh-syochiiki-label':
                case 'oh-syochiiki-layer': {
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-syochiiki-layer']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.S_NAME
                  if (html.indexOf('syochiiki-layer') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="syochiiki-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + props.JINKO + '人</span>' +
                        '<button class="pyramid-syochiiki-r02 pyramid-btn" year=2020 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2020（R02）人口ピラミッド</button><br>' +
                        '<button class="pyramid-syochiiki-h27 pyramid-btn" year=2015 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2015（H27）人口ピラミッド</button><br>' +
                        '<button class="pyramid-syochiiki-h22 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2010（H22）人口ピラミッド</button><br>' +
                        '<button class="pyramid-syochiiki-h17 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2005（H17）人口ピラミッド</button><br>' +
                        '<button class="jinkosuii pyramid-btn" mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">人口推移</button>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-kyusekki': {
                  let sekkiHtml = ''
                  const sekki = ['ナイフ形石器', '台形（様）石器', '斧形石器', '剥片尖頭器', '角錐状石器・三稜尖頭器', '槍先形尖頭器',
                    '両面調整石器', '細石刃・細石核等', '神子柴型石斧', '有茎（舌）尖頭器', '掻器・削器', '彫器', '砥石', '叩石', '台石',
                    '礫器', 'その他の石器', '草創期土器', 'ブロック･ユニット', '礫群・配石', '炭化物集中', 'その他の遺構', '特記事項'
                  ]
                  sekki.forEach((value) => {
                    if (props[value]) {
                      sekkiHtml = sekkiHtml + value + '=' + props[value] + '<br>'
                    }
                  })
                  if (html.indexOf('kyusekki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html += '<div class="kyusekki" style=font-size:small;>' +
                        '<h4>' + props.遺跡名 + '</h4>' +
                        '読み方=' + props.遺跡名読み方 + '<br>' +
                        '都道府県=' + props.都道府県 + '<br>' +
                        '所在地=' + props.所在地 + '<br>' +
                        '標高=' + props.標高 + '<br>' +
                        '文献=' + props.文献 + '<br>' +
                        '調査歴=' + props.調査歴 + '<br>' +
                        '作成年月日=' + props.作成年月日 + '<br>' +
                        '作成者=' + props.作成者 + '<br>' +
                        sekkiHtml +
                        '</div>'
                  }
                  break
                }
                case 'oh-m250m-height':
                case 'oh-m250m-label':
                case 'oh-m250m-line':
                case 'oh-m250m': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-m250m']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.round(Number(props.jinko)) + '人'
                  if (html.indexOf('m250m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="m250m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-m500m-height':
                case 'oh-m500m-label':
                case 'oh-m500m-line':
                case 'oh-m500m': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-m500m']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.round(Number(props.jinko)) + '人'
                  if (html.indexOf('m500m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="m500m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-m1km-height':
                case 'oh-m1km-label':
                case 'oh-m1km-line':
                case 'oh-m1km': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-m1km']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.round(Number(props.jinko)) + '人'
                  if (html.indexOf('m1km') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="m1km" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-m100m-height':
                case 'oh-m100m-label':
                case 'oh-m100m-line':
                case 'oh-m100m': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-m100m']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.round(Number(props.PopT)) + '人'
                  if (html.indexOf('m100m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="m100m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-iryokikan-label':
                case 'oh-iryokikan': {
                  const name = props.P04_002
                  const address = props.P04_003
                  const kamoku = props.P04_004
                  if (html.indexOf('iryokikan') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="iryokikan" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + address + '</span><hr>' +
                        '<span style="font-size: 12px;">' + kamoku + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-nihonrekishi-label':
                case 'oh-nihonrekishi': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )

                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.名称
                  if (html.indexOf('nihonrekishi') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="nihonrekishi" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                  }
                  break
                }
                case 'oh-chikeibunrui': {
                  console.log(coordinates)
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-chikeibunrui']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.code
                  let naritachi = "", risk = ""
                  const list = codeShizen
                  for (let i = 0; i < list.length; i++) {
                    if (list[i][1] === name) {//ズーム率によって数値型になったり文字型になったりしている模様
                      naritachi = list[i][2]
                      risk = list[i][3]
                      break;
                    }
                  }
                  if (html.indexOf('chikeibunrui') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="chikeibunrui" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + naritachi + '</span><hr>' +
                        '<span style="font-size: 12px;">' + risk + '</span>' +
                        '</div>'
                  }
                  break
                }
                  // ここを改善する
                case 'oh-cyugakuR05': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-cyugakuR05']}
                  )
                  console.log(features)
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.A32_004
                  if (html.indexOf('cyugakuR05') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="cyugakuR05" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                  }
                  break
                }
                case 'oh-cyugakuR05-line':
                case 'oh-cyugakuR05-label':
                case 'oh-cyugakuR05-point': {
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  let objName = 'P29_004'
                  if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-cyugakuR05']}
                    )
                    objName = 'A32_004'
                  }
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props[objName]
                  if (html.indexOf('cyugakuR05-point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="cyugakuR05-point" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                  }
                  break
                }
                  // ここを改善する
                case 'oh-syogakkoR05': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-syogakkoR05']}
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.A27_004
                  if (html.indexOf('syogakkoR05') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="syogakkoR05" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                  }
                  break
                }
                case 'oh-syogakkoR05-line':
                case 'oh-syogakkoR05-label':
                case 'oh-syogakkoR05-point': {
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  let objName = 'P29_004'
                  if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-syogakkoR05']}
                    )
                    objName = 'A27_004'
                  }
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props[objName]
                  if (html.indexOf('syogakkoR05-point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="syogakkoR05-point" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                  }
                  break
                }
                case 'oh-bakumatsu-label':
                case 'oh-bakumatsu-line':
                case 'oh-bakumatsu-layer': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-bakumatsu-layer']}
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const ryobun2p = props.領分２ ? '<tr><td>領分２</td><td>' + props.領分２ + '</td><td>' + Math.round(props.石高２).toLocaleString() + '</td></tr>' : ''
                  const ryobun3p = props.領分３ ? '<tr><td>領分３</td><td>' + props.領分３ + '</td><td>' + Math.round(props.石高３).toLocaleString() + '</td></tr>' : ''
                  const ryobun4p = props.領分４ ? '<tr><td>領分４</td><td>' + props.領分４ + '</td><td>' + Math.round(props.石高４).toLocaleString() + '</td></tr>' : ''
                  const ryobun5p = props.領分５ ? '<tr><td>領分５</td><td>' + props.領分５ + '</td><td>' + Math.round(props.石高５).toLocaleString() + '</td></tr>' : ''
                  const ryobun6p = props.領分６ ? '<tr><td>領分６</td><td>' + props.領分６ + '</td><td>' + Math.round(props.石高６).toLocaleString() + '</td></tr>' : ''
                  const ryobun7p = props.領分７ ? '<tr><td>領分７</td><td>' + props.領分７ + '</td><td>' + Math.round(props.石高７).toLocaleString() + '</td></tr>' : ''
                  const ryobun8p = props.領分８ ? '<tr><td>領分８</td><td>' + props.領分８ + '</td><td>' + Math.round(props.石高８).toLocaleString() + '</td></tr>' : ''
                  if (html.indexOf('bakumatsu-layer') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html += '<div class="kinseipoint bakumatsu-layer" style=width:250px;>' +
                        '<span style="font-size: 20px">' + props.村名0 + '' +
                        '<span style="font-size: 14px">(' + props.よみ0 + ')<span/><br>' +
                        '石高計=' + Math.round(props.石高計).toLocaleString() + '' +
                        '<table class="popup-table" align="center">' +
                        '<tr><th></th><th>領分</th><th>石高</th></tr>' +
                        '<tr><td>領分１</td><td>' + props.領分１ + '</td><td>' + Math.round(props.石高１).toLocaleString() + '</td></tr>' +
                        ryobun2p +
                        ryobun3p +
                        ryobun4p +
                        ryobun5p +
                        ryobun6p +
                        ryobun7p +
                        ryobun8p +
                        '</table>' +
                        '<p>令制国=' + props.令制国 + '国</p>' +
                        '<p>国郡名=' + props.国郡名 + '</p>' +
                        '<p>郡名=' + props.郡名 + '</p>' +
                        '<p>KEY=' + props.KEY + '</p>' +
                        '<p>' + props.PREF_NAME + props.CITY_NAME + '</p>' +
                        // '<p>面積=' + prop.area + '</p>' +
                        // '<p>周長=' + prop.perimeter + '</p>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-bakumatsu-point': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-bakumatsu-point']}
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const ryobun2p = props.領分２ ? '<tr><td>領分２</td><td>' + props.領分２ + '</td><td>' + Math.round(props.石高２).toLocaleString() + '</td></tr>' : ''
                  const ryobun3p = props.領分３ ? '<tr><td>領分３</td><td>' + props.領分３ + '</td><td>' + Math.round(props.石高３).toLocaleString() + '</td></tr>' : ''
                  const ryobun4p = props.領分４ ? '<tr><td>領分４</td><td>' + props.領分４ + '</td><td>' + Math.round(props.石高４).toLocaleString() + '</td></tr>' : ''
                  const ryobun5p = props.領分５ ? '<tr><td>領分５</td><td>' + props.領分５ + '</td><td>' + Math.round(props.石高５).toLocaleString() + '</td></tr>' : ''
                  const ryobun6p = props.領分６ ? '<tr><td>領分６</td><td>' + props.領分６ + '</td><td>' + Math.round(props.石高６).toLocaleString() + '</td></tr>' : ''
                  const ryobun7p = props.領分７ ? '<tr><td>領分７</td><td>' + props.領分７ + '</td><td>' + Math.round(props.石高７).toLocaleString() + '</td></tr>' : ''
                  const ryobun8p = props.領分８ ? '<tr><td>領分８</td><td>' + props.領分８ + '</td><td>' + Math.round(props.石高８).toLocaleString() + '</td></tr>' : ''
                  if (html.indexOf('bakumatsu-point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html += '<div class="kinseipoint bakumatsu-point" style=width:250px;>' +
                        '<span style="font-size: 20px">' + props.村名 + '' +
                        '<span style="font-size: 14px">(' + props.よみ + ')<span/><br>' +
                        '<p>領分１=' + props.領分１ + '</p>' +
                        '<p>石高計=' + Math.round(props.石高計).toLocaleString() + '</p>' +
                        '<table class="popup-table" align="center">' +
                        '<tr><th></th><th>領分</th><th>石高</th></tr>' +
                        '<tr><td>領分１</td><td>' + props.領分１ + '</td><td>' + Math.round(props.石高１).toLocaleString() + '</td></tr>' +
                        ryobun2p +
                        ryobun3p +
                        ryobun4p +
                        ryobun5p +
                        ryobun6p +
                        ryobun7p +
                        ryobun8p +
                        '</table>' +
                        '<p>国名=' + props.国名 + '</p>' +
                        '<p>国郡=' + props.国郡 + '</p>' +
                        '<p>郡名=' + props.郡名 + '</p>' +
                        '<p>相給=' + props.相給 + '</p>' +
                        '</div>'
                    console.log(html)
                  }
                  break
                }
                case 'oh-bakumatsu-kokudaka-height': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-bakumatsu-kokudaka-height']}
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const ryobun2p = props.領分２ ? '<tr><td>領分２</td><td>' + props.領分２ + '</td><td>' + Math.round(props.石高２).toLocaleString() + '</td></tr>' : ''
                  const ryobun3p = props.領分３ ? '<tr><td>領分３</td><td>' + props.領分３ + '</td><td>' + Math.round(props.石高３).toLocaleString() + '</td></tr>' : ''
                  const ryobun4p = props.領分４ ? '<tr><td>領分４</td><td>' + props.領分４ + '</td><td>' + Math.round(props.石高４).toLocaleString() + '</td></tr>' : ''
                  const ryobun5p = props.領分５ ? '<tr><td>領分５</td><td>' + props.領分５ + '</td><td>' + Math.round(props.石高５).toLocaleString() + '</td></tr>' : ''
                  const ryobun6p = props.領分６ ? '<tr><td>領分６</td><td>' + props.領分６ + '</td><td>' + Math.round(props.石高６).toLocaleString() + '</td></tr>' : ''
                  const ryobun7p = props.領分７ ? '<tr><td>領分７</td><td>' + props.領分７ + '</td><td>' + Math.round(props.石高７).toLocaleString() + '</td></tr>' : ''
                  const ryobun8p = props.領分８ ? '<tr><td>領分８</td><td>' + props.領分８ + '</td><td>' + Math.round(props.石高８).toLocaleString() + '</td></tr>' : ''

                  if (html.indexOf('bakumatsu-kokudaka-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html += '<div class="kinseipoint bakumatsu-kokudaka-height" style=width:250px;>' +
                        '<span style="font-size: 20px">' + props.村名0 + '' +
                        '<span style="font-size: 14px">(' + props.よみ0 + ')<span/><br>' +
                        '石高計=' + Math.round(props.石高計).toLocaleString() + '' +
                        '<table class="popup-table" align="center">' +
                        '<tr><th></th><th>領分</th><th>石高</th></tr>' +
                        '<tr><td>領分１</td><td>' + props.領分１ + '</td><td>' + Math.round(props.石高１).toLocaleString() + '</td></tr>' +
                        ryobun2p +
                        ryobun3p +
                        ryobun4p +
                        ryobun5p +
                        ryobun6p +
                        ryobun7p +
                        ryobun8p +
                        '</table>' +
                        '<p>令制国=' + props.令制国 + '国</p>' +
                        '<p>国郡名=' + props.国郡名 + '</p>' +
                        '<p>郡名=' + props.郡名 + '</p>' +
                        '<p>KEY=' + props.KEY + '</p>' +
                        '<p>' + props.PREF_NAME + props.CITY_NAME + '</p>' +
                        // '<p>面積=' + prop.area + '</p>' +
                        // '<p>周長=' + prop.perimeter + '</p>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-bakumatsu-line2':
                case 'oh-bakumatsu-han': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-bakumatsu-han']}
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.村名
                  const kokudaka = Math.floor(Number(props.石高計))
                  const ryobun = props.領分１
                  html +=
                      `
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `
                  break
                }
                case 'oh-bakumatsu-label2':
                case 'oh-bakumatsu-kokudaka': {
                  let features
                  console.log(map.getLayer('oh-bakumatsu-kokudaka'))
                  if (map.getLayer('oh-bakumatsu-kokudaka')) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-bakumatsu-kokudaka']}
                    )
                  } else {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-bakumatsu']}
                    )
                  }
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.村名
                  const kokudaka = Math.floor(Number(props.石高計))
                  const ryobun = props.領分１
                  if (html.indexOf('bakumatsu-kokudaka') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                  html +=
                      `
                  <div class="bakumatsu-kokudaka" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `}
                  break
                }
                case 'oh-highwayLayer-green-lines':
                case 'oh-highwayLayer-red-lines': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-highwayLayer-green-lines']}
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.N06_007
                  const id = props.N06_004
                  const kyouyounen = props.N06_001
                  const kaishinen = props.N06_002
                  if (html.indexOf('highwayLayer-red-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class=highwayLayer-red-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">id=' + id + '</span><br>' +
                        '<span style="font-size: 12px;">供用開始年=' + kyouyounen + '</span><br>' +
                        '<span style="font-size: 12px;">設置期間（開始年）=' + kaishinen + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-q-kyoryo-label':
                case 'oh-q-kyoryo': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-q-kyoryo']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props._html
                  if (html.indexOf('q-kyoryo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="q-kyoryo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">よみ=' + props.No1 + '</span><br>' +
                        '<span style="font-size: 12px;">路線名=' + props.No2 + '</span><br>' +
                        '<span style="font-size: 12px;">完成年（度）=' + props.No3 + '</span><br>' +
                        '<span style="font-size: 12px;">延長=' + props.No4 + '</span><br>' +
                        '<span style="font-size: 12px;">幅員=' + props.No5 + '</span><br>' +
                        '<span style="font-size: 12px;">管理者名=' + props.No6 + '</span><br>' +
                        '<span style="font-size: 12px;">所在市区町村=' + props.No7 + props.No8 + '</span><br>' +
                        '<span style="font-size: 12px;">点検実施年度=' + props.No9 + '</span><br>' +
                        '<span style="font-size: 12px;">判定区分=' + props.No10 + '</span><br>' +
                        '<span style="font-size: 12px;">Ｑ地図管理ID=' + props.No14 + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-q-tunnel-label':
                case 'oh-q-tunnel': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-q-tunnel']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props._html
                  if (html.indexOf('q-tunnel') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="q-tunnel" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">よみ=' + props.No1 + '</span><br>' +
                        '<span style="font-size: 12px;">路線名=' + props.No2 + '</span><br>' +
                        '<span style="font-size: 12px;">完成年（度）=' + props.No3 + '</span><br>' +
                        '<span style="font-size: 12px;">延長=' + props.No4 + '</span><br>' +
                        '<span style="font-size: 12px;">幅員=' + props.No5 + '</span><br>' +
                        '<span style="font-size: 12px;">管理者名=' + props.No6 + '</span><br>' +
                        '<span style="font-size: 12px;">所在市区町村=' + props.No7 + props.No8 + '</span><br>' +
                        '<span style="font-size: 12px;">点検実施年度=' + props.No9 + '</span><br>' +
                        '<span style="font-size: 12px;">判定区分=' + props.No10 + '</span><br>' +
                        '<span style="font-size: 12px;">Ｑ地図管理ID=' + props.No14 + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-yotochiiki-height':
                case 'oh-yotochiiki-line':
                case 'oh-yotochiiki': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-yotochiiki']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.用途地域
                  if (html.indexOf('yotochiiki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="yotochiiki" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-bus-lines': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-bus-lines']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.N07_001
                  if (html.indexOf('bus-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="bus-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-bus-label':
                case 'oh-bus-points': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.P11_001
                  if (html.indexOf('bus-points') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="bus-points" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">事業者名=' + props.P11_002 + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-koaza-label':
                case 'oh-koaza': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-koaza']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.KOAZA_NAME
                  if (html.indexOf('koaza') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="koaza" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-amx-label':
                case 'oh-amx-a-fude-line':
                case 'oh-amx-a-fude': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-amx-a-fude']}
                  )
                  console.log(features)
                  if (features.length === 0) return
                  props = features[0].properties
                  let html0 = ''
                  if (html.indexOf('amx-a-fude') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html0 += '<div class="amx-a-fude" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                      html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div>'
                    html += html0
                  }
                  break
                }
                case 'oh-city-t09-label':
                case 'oh-city-t09-line':
                case 'oh-city-t09': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-city-t09']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.N03_004
                  if (html.indexOf('city-t09') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="city-t09" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:14px;">' + props.N03_001 + props.N03_003 + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-city-r05-label':
                case 'oh-city-r05-line':
                case 'oh-city-r05': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-city-r05']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.N03_004
                  const gun = props.N03_003 ? props.N03_003 : ''
                  if (html.indexOf('city-r05') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="city-r05" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:14px;">' + props.N03_001 + gun + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-tochiriyo-line':
                case 'oh-tochiriyo': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-tochiriyo']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  let shisetsu = ''
                  switch (props.LU_1) {
                    case '111': //官公庁施設
                      shisetsu = '官公庁施設'
                      break
                    case '112': //教育文化施設
                      switch (props.LU_2) {
                        case '1': //教育施設
                          shisetsu = '教育施設'
                          break
                        case '2': //文化施設
                          shisetsu = '文化施設'
                          break
                        case '3': //宗教施設
                          shisetsu = '宗教施設'
                          break
                      }
                      break
                    case '113': //厚生医療施設
                      switch (props.LU_2) {
                        case '1': //医療施設
                          shisetsu = '医療施設'
                          break
                        case '2': //厚生施設
                          shisetsu = '厚生施設'
                          break
                      }
                      break
                    case '114': //供給処理施設
                      switch (props.LU_2) {
                        case '1': //供給施設
                          shisetsu = '供給施設'
                          break
                        case '2': //処理施設
                          shisetsu = '処理施設'
                          break
                      }
                      break
                    case '121': //事務所建築物
                      shisetsu = '事務所建築物'
                      break
                    case '122': //専用商業施設
                      switch (props.LU_2) {
                        case '1': //商業施設
                          shisetsu = '専用商業施設'
                          break
                        case '2': //公衆浴場等
                          shisetsu = '公衆浴場等'
                          break
                      }
                      break
                    case '123': //住商併用建物
                      shisetsu = '住商併用建物'
                      break
                    case '124': //宿泊・遊興施設
                      switch (props.LU_2) {
                        case '1': //宿泊施設
                          shisetsu = '宿泊施設'
                          break
                        case '2': //遊興施設
                          shisetsu = '遊興施設'
                          break
                      }
                      break
                    case '125': //スポーツ・興行施設
                      switch (props.LU_2) {
                        case '1': //スポーツ施設
                          shisetsu = 'スポーツ施設'
                          break
                        case '2': //興行施設
                          shisetsu = '興行施設'
                          break
                      }
                      break
                    case '131': //独立住宅
                      shisetsu = '独立住宅'
                      break
                    case '132': //集合住宅
                      shisetsu = '集合住宅'
                      break
                    case '141': //専用工場
                      shisetsu = '専用工場'
                      break
                    case '142': //住居併用工場
                      shisetsu = '住居併用工場'
                      break
                    case '143': //倉庫運輸関係施設
                      switch (props.LU_2) {
                        case '1': //運輸施設等
                          shisetsu = '運輸施設等'
                          break
                        case '2': //倉庫施設等
                          shisetsu = '倉庫施設等'
                          break
                      }
                      break
                    case '150': //農林漁業施設
                      shisetsu = '農林漁業施設'
                      break
                    case '210': //屋外利用地・仮設建物
                      switch (props.LU_2) {
                        case '1': //太陽光発電
                          shisetsu = '太陽光発電'
                          break
                        case '2': //屋外駐車場
                          shisetsu = '屋外駐車場'
                          break
                        case '3': //その他
                          shisetsu = '屋外利用地・仮設建物、その他'
                          break
                      }
                      break
                    case '300': //公園、運動場等
                      switch (props.LU_2) {
                        case '1': //ゴルフ場
                          shisetsu = 'ゴルフ場'
                          break
                        case '2': //その他
                          shisetsu = '公園、運動場等、その他'
                          break
                      }
                      break
                    case '400': //未利用地等
                      shisetsu = '未利用地等'
                      break
                    case '510': //道路
                      shisetsu = '道路'
                      break
                    case '520': //鉄道・港湾等
                      shisetsu = '鉄道・港湾等'
                      break
                    case '611': //田
                      shisetsu = '田'
                      break
                    case '612': //畑
                      shisetsu = '畑'
                      break
                    case '613': //樹園地
                      shisetsu = '樹園地'
                      break
                    case '620': //採草放牧地
                      shisetsu = '採草放牧地'
                      break
                    case '700': //水面・河川・水路
                      shisetsu = '水面・河川・水路'
                      break
                    case '800': //原野
                      shisetsu = '原野'
                      break
                    case '900': //森林
                      shisetsu = '森林'
                      break
                    case '220': //その他
                      shisetsu = 'その他'
                      break
                    case '0': //不明
                      shisetsu = '不明'
                      break
                    case '9': //不整合
                      shisetsu = '不整合'
                      break
                  }
                  if (html.indexOf('tochiriyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html += '<div class="tochiriyo" style=width:200px;>' +
                        '<span style="font-size: 20px">' + shisetsu + '</span>' +
                        '<p>' + props.NAME1 + props.NAME2 + '</p>' +
                        '<p>' + Math.floor(props.AREA) + 'm2</p>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-hikari': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-hikari']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.light
                  if (html.indexOf('hikari') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="hikari" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">明るさ＝' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-hikari-height': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-hikari-height']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.light
                  if (html.indexOf('hikari-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="hikari-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">明るさ＝' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-nantora-height': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-nantora-height']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.最大浸水深
                  if (html.indexOf('nantora-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="nantora-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">最大浸水深＝' + name + 'm</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-tsunami-height': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-tsunami-height']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.A40_003
                  if (html.indexOf('tsunami-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="tsunami-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-hokkaidotsunami-height': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-hokkaidotsunami-height']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  let name = props.max
                  console.log(name)
                  if (name === undefined) name = props.MAX_SIN
                  if (html.indexOf('hokkaidotsunami-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="hokkaidotsunami-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + 'm</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-city-gun': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-city-gun']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.GUN
                  const kuni = props.KUNI
                  if (html.indexOf('gun') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="gun" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + kuni + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-tochiriyo100': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: ['oh-tochiriyo100']}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  let text
                  switch (props.土地利用種別) {
                    case '0100': // 田
                      text = '田'
                      break
                    case '0200': // その他の農用地
                      text = 'その他の農用地'
                      break
                    case '0500': // 森林
                      text = '森林'
                      break
                    case '0600': // 荒地
                      text = '荒地'
                      break
                    case '0700': // 建物用地
                      text = '建物用地'
                      break
                    case '0901': // 道路
                      text = '道路'
                      break
                    case '0902': // 鉄道
                      text = '鉄道'
                      break
                    case '1000': // その他の用地
                      text = 'その他の用地'
                      break
                    case '1100': // 河川地及び湖沼
                      text = '河川地及び湖沼'
                      break
                    case '1400': // 海浜
                      text = '海浜'
                      break
                    case '1500': // 海水域
                      text = '海水域'
                      break
                    case '1600': // ゴルフ場
                      text = 'ゴルフ場'
                      break
                  }
                  if (html.indexOf('tochiriyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="tochiriyo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + text + '</span><br>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-yochien-label':
                case 'oh-yochien-layer': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.P29_004
                  const address = props.P29_005
                  if (html.indexOf('yochien') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="yochien" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:12px;">' + address + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-jinjya-label':
                case 'oh-jinjya-layer': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  let href = ''
                  if (props.description) {
                    const description = props.description.split('\t')
                    const url = description[3] ? description[3].split('<br>')[0] : ''
                    if (url) {
                      if (description[3].split('<br>').length > 1) {
                        href = '<a href="' + url + '" target="_blank">神社と古事記を開く</a>'
                      }
                    }
                  }
                  const name = props.name
                  if (html.indexOf('jinjya') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="jimjya" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '<span style="font-size:14px;">' + href + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-kokuarea-layer': {
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.name
                  if (html.indexOf('kokuarea') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="kokuarea" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-hinanjyo-tsunami-label':
                case 'oh-hinanjyo-tsunami':
                case 'oh-hinanjyo-dosekiryu-label':
                case 'oh-hinanjyo-dosekiryu':
                case 'oh-hinanjyo-kozui-label':
                case 'oh-hinanjyo-kozui': {
                  let features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                  }
                  props = features[0].properties
                  const name = props.name
                  const address = props.address
                  if (html.indexOf('hinanjyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html +=
                        '<div class="hinanjyo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '<span style="font-size:14px;">' + address + '</span>' +
                        '</div>'
                  }
                  break
                }
                case 'oh-densyohi-label':
                case 'oh-densyohi': {
                  let features = map.queryRenderedFeatures(
                      map.project(coordinates), {layers: [layerId]}
                  )
                  if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                  }
                  props = features[0].properties
                  const src = 'https://maps.gsi.go.jp/legend/disaster_lore/' + props.ID.split('-')[0] + '/' + props.ID + '.jpg'
                  if (html.indexOf('densyohi') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, this.s_selectedLayers) + '</div>'
                    html += '<div class="densyohi" style="width:300px;font-size:small">' +
                        '<h4>' + props.碑名 + '</h4>' +
                        '災害名=' + props.災害名 + '<br>' +
                        '災害種別=' + props.災害種別 + '<br>' +
                        '所在地=' + props.所在地 + '<br>' +
                        '建立年=' + props.建立年 + '<hr>' +
                        '' + props.伝承内容 + '<br>' +
                        '<a href="' + src + '" target="_blank"><img style="object-fit:cover;height:200px;width:300px;" src="' + src + '"></a>' +
                        '</div>'
                  }
                  break
                }
              }
            })

            if (this.mapFlg.map02) {
              const layer = this.$store.state.map02.getStyle().layers.at(-1)
              if (layer.type === 'raster') {
                closeAllPopups()
              } else {
                if (popups.length === 2) closeAllPopups()
              }
              if (popups.length === 2) closeAllPopups()
            } else {
              closeAllPopups()
            }

            // ポップアップ作成

            let rasterLayerIds = [];
            const mapLayers = map.getStyle().layers
            // console.log(mapLayers)
            mapLayers.forEach(layer => {
              // レイヤーのtypeプロパティを取得
              const type = layer.type;
              if (type === 'raster') {
                rasterLayerIds.push(layer.id);
              }
              // 本当は↓こっちが良い。昔のリンクの関係で↑を使用している。
              // if (layer.id.indexOf('rgb') !== -1) {
              //   rasterLayerIds.push(layer.id)
              // }
            });
            // console.log(rasterLayerIds)
            // ラスタレイヤのidからポップアップ表示に使用するURLを生成
            rasterLayerIds.forEach(rasterLayerId => {
              const RasterTileUrl = urlByLayerId(rasterLayerId)[0]
              const legend = urlByLayerId(rasterLayerId)[1]
              const z = urlByLayerId(rasterLayerId)[2]
              const lng = e.lngLat.lng
              const lat = e.lngLat.lat
              // if (RasterTileUrl) {
              getLegendItem(legend, RasterTileUrl, lat, lng,z).then(function (v) {
                let res = (v ? v.title : '')
                // if (res === '') return
                // let popup
                if (res) {
                  // if (html) html += '<hr class="break-hr">'
                  html += '<div class="layer-label-div-red">' + getLabelByLayerId(rasterLayerId, vm.s_selectedLayers) + '</div>'
                  switch (rasterLayerId) {
                    case 'oh-rgb-kozui-saidai-layer':
                      html +=
                          '<div font-weight: normal; color: #333;line-height: 25px;">' +
                          '<span style="font-size: 12px;">洪水によって想定される浸水深</span><br>' +
                          '<span style="font-size: 24px;">' + res + '</span>' +
                          '</div>'
                      break
                    case 'oh-rgb-tsunami-layer':
                      html +=
                          '<div font-weight: normal; color: #333;line-height: 25px;">' +
                          '<span style="font-size: 12px;">津波によって想定される浸水深</span><br>' +
                          '<span style="font-size: 24px;">' + res + '</span>' +
                          '</div>'
                      break
                    case 'oh-rgb-shitchi-layer':
                      html +=
                            '<div font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size: 16px;">' + res[0] + '</span><hr>' +
                            '<span style="font-size: 12px;">' + res[1] + '</span>' +
                            '</div>'
                      break
                    default:
                        html +=
                            '<div font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size: 16px;">' + res + '</span>' +
                            '</div>'
                  }
                }

                if (html) {
                  popups.forEach(popup => popup.remove())
                  popups.length = 0;
                  const popup = new maplibregl.Popup({
                    closeButton: true,
                    // className: 'custom-popup'
                  })
                      .setLngLat(coordinates)
                      .setHTML(html)
                      .setMaxWidth("350px")
                      .addTo(map)
                  popups.push(popup)
                  popups.push(popup)
                  popup.on('close', () => closeAllPopups())
                  document.querySelector('.maplibregl-popup-content').scrollTop = 0
                }
              })
            })

            if (rasterLayerIds.length === 0){
              if (html) {
                popups.forEach(popup => popup.remove())
                popups.length = 0;
                const popup = new maplibregl.Popup({
                  closeButton: true,
                  // className: 'custom-popup'
                })
                    .setLngLat(coordinates)
                    .setHTML(html)
                    .setMaxWidth("350px")
                    .addTo(map)
                popups.push(popup)
                popup.on('close', () => closeAllPopups())
                document.querySelector('.maplibregl-popup-content').scrollTop = 0
              }
            }
          })
          // IDから対応するlabelを取得する関数
          function getLabelByLayerId(layerId, data) {
            for (const mapKey in data) {
              const mapLayers = data[mapKey];
              for (const item of mapLayers) {
                if (item.layers.some(layer => layer.id === layerId)) {
                  return item.label;
                }
              }
            }
            return null
          }
          //------------------------------------------------------------------------------------------------------------
          function latLngToTile(lat, lng, z) {
            const
                w = Math.pow(2, (z === undefined) ? 0 : z) / 2,		// 世界全体のピクセル幅
                yrad = Math.log(Math.tan(Math.PI * (90 + lat) / 360))
            return { x: (lng / 180 + 1) * w, y: (1 - yrad / Math.PI) * w }
          }
          function getLegendItem(legend, url, lat, lng, z) {
            // map.getCanvas().style.cursor = 'progress'
            return new Promise(function (resolve) {
              const
                  p = latLngToTile(lat, lng, z),
                  x = Math.floor(p.x),			// タイルX座標
                  y = Math.floor(p.y),			// タイルY座標
                  i = (p.x - x) * 256,			// タイル内i座標
                  j = (p.y - y) * 256,			// タイル内j座標
                  img = new Image();
              img.crossOrigin = 'anonymous'
              img.onload = function () {
                const
                    canvas = document.createElement('canvas'),
                    context = canvas.getContext('2d')
                let
                    v,
                    d;
                canvas.width = 1
                canvas.height = 1
                context.drawImage(img, i, j, 1, 1, 0, 0, 1, 1)
                d = context.getImageData(0, 0, 1, 1).data
                console.log(d[0],d[1],d[2])
                // if (d[3] !== 255) {
                //   v = null
                // } else {
                  v = legend.find(o => o.r == d[0] && o.g == d[1] && o.b == d[2])
                // }
                // map.getCanvas().style.cursor = 'default'
                resolve(v)
              }
              img.onerror = function () {
                // map.getCanvas().style.cursor = 'default'
                resolve(null)
              }
              img.src = url.replace('{z}', z).replace('{y}', y).replace('{x}', x)
            })
          }
          function urlByLayerId (layerId) {
            let RasterTileUrl,legend,zoom
            switch (layerId) {
              case 'oh-kozui-saidai-layer':
              case 'oh-rgb-kozui-saidai-layer':
                RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin/{z}/{x}/{y}.png'
                legend = legend_shinsuishin
                zoom = 16
                break;
              case 'oh-shitchi-layer':
              case 'oh-rgb-shitchi-layer':
                RasterTileUrl = 'https://cyberjapandata.gsi.go.jp/xyz/swale/{z}/{x}/{y}.png';
                legend = legend_shitchi
                zoom = 16
                break;
              case 'oh-tsunami-layer':
              case 'oh-rgb-tsunami-layer':
                RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png';
                legend = legend_hightide_tsunami
                zoom = 16
                break;
              case 'oh-dosya-layer':
              case 'oh-rgb-dosya-layer':
                RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png';
                legend = legend_dosyasaigai
                zoom = 16
                break;
              case 'oh-dosekiryu-layer':
              case 'oh-rgb-dosekiryu-layer':
                RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukikenkeiryu/{z}/{x}/{y}.png';
                legend = legend_dosekiryu
                zoom = 16
                break;
              case 'oh-rgb-kyukeisya-layer':
                RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_kyukeisyachihoukai/{z}/{x}/{y}.png';
                legend = legend_kyukeisya
                zoom = 16
                break;
              case 'oh-rgb-jisuberi-layer':
                RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_jisuberikikenkasyo/{z}/{x}/{y}.png';
                legend = legend_jisuberi
                zoom = 16
                break;
              case 'oh-rgb-tameike-layer':
                RasterTileUrl = 'https://disaportal.gsi.go.jp/data/raster/07_tameike/{z}/{x}/{y}.png';
                legend = legend_tameike
                zoom = 15
                break;
              default:
                // 何も該当しない場合の処理
                RasterTileUrl = '';
                legend = null;
                break;
            }
            return [RasterTileUrl,legend,zoom]
          }
          const legend_shinsuishin = [
            { r: 247, g: 245, b: 169, title: '0.5m未満' },
            { r: 255, g: 216, b: 192, title: '0.5～3.0m' },
            { r: 255, g: 183, b: 183, title: '3.0～5.0m' },
            { r: 255, g: 145, b: 145, title: '5.0～10.0m' },
            { r: 242, g: 133, b: 201, title: '10.0～20.0m' },
            { r: 220, g: 122, b: 220, title: '20.0m以上' }
          ]
          const legend_shitchi = [
            { r: 254, g: 227, b: 200, title: ['砂礫地',"土地の表面が砂と小石のところ。砂や礫でできた荒地、風の運搬作用によって砂が堆積してできた砂丘も含む。"] },
            { r: 254, g: 200, b: 200, title: ['泥地','常にぬかるんでいて植物が存在せず、通過が困難な土地。'] },
            { r: 228, g: 172, b: 123, title: ['泥炭地','｢泥炭地｣と記された範囲。'] },
            { r: 200, g: 200, b: 228, title: ['湿地','概ね湿潤で葦(あし)などの植物が生えるような土地のこと。'] },
            { r: 209, g: 234, b: 255, title: ['干潟・砂浜','満潮時には、海面に没する地形。'] },
            { r: 147, g: 200, b: 254, title: ['河川、湖沼、海面','河川や水路、湖沼と記された範囲及び、河口部から海上の範囲。養魚場や貯木場、小規模な農業用の池なども含む。'] },
            { r: 251, g: 247, b: 176, title: ['田（水田、陸田）','水田は稲や蓮などを栽培する田で四季を通じて水がある土地のこと。陸田は稲を栽培する田で冬季に水が涸れ、歩けるような土地のこと。乾田とも言う。'] },
            { r: 225, g: 227, b: 118, title: ['深田','膝ぐらいまでぬかる泥深い田もしくは小舟を用いて耕作するような田のこと。沼田とも言う。'] },
            { r: 227, g: 227, b: 200, title: ['塩田','海水から食塩を取るために設けた砂浜の設備。'] },
            { r: 162, g: 222, b: 162, title: ['草地','牧草を栽培する土地や｢草｣と記された範囲。ただし、山地や台地上のものは取得しない。'] },
            { r: 173, g: 200, b: 147, title: ['荒地','開墾されたことがないまたは、かつては開墾されていたが長期間荒れ果てたところ。ただし、山地や台地上のものは取得しない。'] },
            { r: 119, g: 227, b: 201, title: ['ヨシ（芦葦）','蘆｣、｢芦｣、｢葦｣、｢葮｣、｢蓮｣と記された範囲。または芦葦記号。'] },
            { r: 173, g: 255, b: 173, title: ['茅','｢茅｣、｢萱｣と記された範囲。'] },
            { r: 144, g: 73, b: 11, title: ['堤防' ,'河川の氾濫や海水の浸入を防ぐため、河岸･海岸に沿って設けた土石の構築物。']}
          ]
          // 高潮浸水想定区域、津波浸水想定
          const legend_hightide_tsunami = [
            { r: 255, g: 255, b: 179, title: '0.3m未満' },
            { r: 247, g: 245, b: 169, title: '0.3～0.5m' },
            { r: 248, g: 225, b: 166, title: '0.5～1.0m' },
            { r: 255, g: 216, b: 192, title: '1.0～3.0m' },
            { r: 255, g: 183, b: 183, title: '3.0～5.0m' },
            { r: 255, g: 145, b: 145, title: '5.0～10.0m' },
            { r: 242, g: 133, b: 201, title: '10.0～20.0m' },
            { r: 220, g: 122, b: 188, title: '20.0m以上' }
          ]
          // 土砂災害警戒区域
          const legend_dosyasaigai = [
            { r: 229, g: 200, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 230, g: 201, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 229, g: 200, b: 50, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 230, g: 200, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 230, g: 201, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 230, g: 200, b: 50, title: '土石流警戒区域(指定済)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 165, g: 0, b: 33, title: '土石流<span style="color: red">特別</span>警戒区域(指定済)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 169, g: 10, b: 34, title: '土石流<span style="color: red">特別</span>警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
            { r: 169, g: 10, b: 33, title: '土石流<span style="color: red">特別</span>警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
          ]
          // 土石流危険渓流
          const legend_dosekiryu = [
            { r: 245, g: 153, b: 101, title: '土石流危険渓流<br><br>土石流の発生の危険性があり、人家等に被害を与えるおそれがある渓流' },
          ]
          // 急傾斜地崩壊危険箇所
          const legend_kyukeisya = [
            { r: 224, g: 224, b: 254, title: '急傾斜地崩壊危険箇所<br><br>傾斜度30°かつ高さ5m以上の急傾斜地で人家等に被害を与えるおそれのある箇所' },
          ]
          // 地すべり危険箇所
          const legend_jisuberi = [
              { r: 255, g: 235, b: 223, title: '地すべり危険箇所<br><br>地すべりが発生している又は地すべりが発生するおそれがある区域のうち、人家等に被害を与えるおそれのある箇所' },
          ]
          // ため池結界
          const legend_tameike = [
            { r: 0, g: 0, b: 255, title: 'ため池決壊による危険性' },
          ]

          map.on('mousemove', function (e) {
            let rasterLayerIds = [];
            const mapLayers = map.getStyle().layers;
            mapLayers.forEach(layer => {
              // const visibility = map.getLayoutProperty(layer.id, 'visibility');
              // レイヤーのtypeプロパティを取得
              const type = layer.type;
              if (type === 'raster') {
                rasterLayerIds.push(layer.id);
              }
            });
            // ラスタレイヤのidからポップアップ表示に使用するURLを生成

            rasterLayerIds.forEach(rasterLayerId => {
              const RasterTileUrl = urlByLayerId(rasterLayerId)[0]
              const legend = urlByLayerId(rasterLayerId)[1]
              const z = urlByLayerId(rasterLayerId)[2]
              const lng = e.lngLat.lng;
              const lat = e.lngLat.lat;
              if (RasterTileUrl) {
                getLegendItem(legend, RasterTileUrl, lat, lng,z).then(function (v) {
                  let res = (v ? v.title : '')
                  if (res === '') {
                    // map.getCanvas().style.cursor = "default"
                    return
                  }
                  map.getCanvas().style.cursor = "pointer"
                })
              }
            })
          })
          // -----------------------------------------------------------------------------------------------------------
          const pitch = !isNaN(this.pitch[mapName]) ? this.pitch[mapName]: 0
          if (pitch !== 0) {
            // this.$store.state[mapName].setTerrain({ 'source': 'terrain', 'exaggeration': this.s_terrainLevel })
            if (!this.s_selectedLayers[mapName].find(layer => {
              // return layer.id === 'oh-bakumatsu-kokudaka-height'
              return layer.id.indexOf('height') !== -1
            }
            )) {
              this.$store.state[mapName].setTerrain({ 'source': 'terrain', 'exaggeration': this.s_terrainLevel })
            } else {
              map.setTerrain(null)
            }
          }
        })
        //on load終了----------------------------------------------------------------------------------------------------
      })
    }
  },
  mounted() {
    const vm = this
    // -----------------------------------------------------------------------------------------------------------------
    this.mapNames.forEach(mapName => {
      const myDiv = document.getElementById("terrain-btn-div-" + mapName)
      let startY = 0;      // マウスまたはタッチの初期Y座標
      let startX = 0;      // マウスまたはタッチの初期X座標
      let startBottom = 0; // divの初期bottom位置
      let startRight = 0;  // divの初期right位置
      let isDragging = false;

      // ドラッグ開始（マウスまたはタッチ）
      function startDrag(e) {
        isDragging = true;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        startY = clientY;
        startX = clientX;
        startBottom = parseInt(window.getComputedStyle(myDiv).bottom, 10);
        startRight = parseInt(window.getComputedStyle(myDiv).right, 10);
        myDiv.style.cursor = "grabbing";
        e.preventDefault(); // タッチ時のスクロール防止
      }

      // ドラッグ中（マウスまたはタッチ）
      function drag(e) {
        if (isDragging) {
          const clientX = e.clientX || e.touches[0].clientX;
          const clientY = e.clientY || e.touches[0].clientY;
          const deltaY = startY - clientY;
          const deltaX = startX - clientX;
          myDiv.style.bottom = `${startBottom + deltaY}px`;
          myDiv.style.right = `${startRight + deltaX}px`;
        }
      }

      // ドラッグ終了（マウスまたはタッチ）
      function endDrag() {
        isDragging = false;
        myDiv.style.cursor = "grab";
      }

      // イベントリスナーの追加（マウスとタッチの両方に対応）
      myDiv.addEventListener("mousedown", startDrag);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", endDrag);

      myDiv.addEventListener("touchstart", startDrag);
      document.addEventListener("touchmove", drag);
      document.addEventListener("touchend", endDrag);
    })
    // -----------------------------------------------------------------------------------------------------------------
    pyramid()
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
        // console.log(JSON.stringify(this.s_selectedLayers))
        console.log('変更を検出しました2')
        this.updatePermalink()
        history('selectedLayers',window.location.href)
      },
      deep: true
    },
    pitch: {
      handler: function () {
        // console.log('変更を検出しました')
        // this.updatePermalink()
          // this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
      },
      deep: true
    },
  }
}
</script>
<style scoped>
#map00 {
  background-color: rgb(194,210,251);
  height: 100%;
}
#map01 {
  border: #000 1px solid;
  height: 100%;
}
#map02 {
  border: #000 1px solid;
  position:absolute;
}
.pointer {
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  border: #fff 1px solid;
  position: absolute;
  pointer-events: none;
  z-index: 10;
  display: none;
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
#right-top-div {
  position:absolute;
  top:10px;
  right:10px;
  z-index:1;
}
.zoom-div {
  position: absolute;
  left: 10px;
  bottom: 10px;
  font-size: large;
  z-index: 2;
  text-shadow:
      -1px -1px 0 #ffffff,
      1px -1px 0 #ffffff,
      -1px  1px 0 #ffffff,
      1px  1px 0 #ffffff;
}
.zoom-in {
  position: absolute;
  top: 60px;
  left: 0;
}
.zoom-out {
  position: absolute;
  top: 120px;
  left: 0;
}
/*3Dのボタン-------------------------------------------------------------*/
.terrain-btn {
  background-color: rgb(50,101,186);
}
.terrain-btn-div{
  position:absolute;
  /*top:60%;*/
  bottom: 20px;
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
  cursor:move;
}
/*@media screen and (max-width:480px) {*/
/*  .terrain-btn-div {*/
/*    top:calc(50% - 73px);*/
/*  }*/
/*}*/
.terrain-btn-container{
  position:relative;
  height:100%;
}
.terrain-btn-up{
  position:absolute;
  top:10px;
  left:50%;
  padding:0;
  width: 50px;
  min-width: 50px;
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
  width: 50px;
  min-width: 50px;
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
  width: 50px;
  min-width: 50px;
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
  width: 50px;
  min-width: 50px;
  height:50px;
  margin-top:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-center{
  position:absolute;
  top:50%;
  right:calc(50% - 25px);
  padding:0;
  width:50px;
  height:50px;
  margin-top:-25px;
  color: white;
  border-radius:50px;
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
html, body {
  overscroll-behavior: none;
  touch-action: manipulation;
}
.maplibregl-popup-content {
  padding: 30px 20px 10px 20px;
  max-height: 500px;
  overflow: auto;
}
.maplibregl-popup-close-button{
  font-size: 40px;
}
font {
  pointer-events: none;
}
.pyramid-btn {
  margin-top: 10px;
  height: 40px;
  width: 100%;
  background-color: rgb(50,101,186);
  color: white;
  border-radius:8px;
}
.maplibregl-popup {
  z-index: 1;
}
.popup-table {
  margin-bottom: 10px;
  width: 100%;
}

.popup-table, .popup-table th, .popup-table td {
  border: 1px solid darkgray;
  border-collapse: collapse;
  font-size: large;
  padding: 5px;
}
.popup-table th {
  text-align: center;
  font-weight: normal;
}

.popup-table td:nth-of-type(3) {
  text-align: right;
}

.maplibregl-popup-content hr {
  margin-top: 10px;
  margin-bottom: 10px;
}
.break-hr {
  border: solid 2px rgb(50,101,186);;
}
.layer-label-div {
  color: white;
  background-color: rgb(50,101,186);;
  text-align: right;
  padding-left: 5px;
  padding-right: 5px;
  margin-bottom: 10px;
}
.layer-label-div-red {
  color: white;
  background-color: red;
  text-align: right;
  padding-left: 5px;
  padding-right: 5px;
  margin-bottom: 10px;
}
</style>