<template>
  <v-app>
    <v-main>
      <div id="map00">
        <div v-for="mapName in mapNames" :key="mapName" :id=mapName :style="mapSize[mapName]" v-show="mapFlg[mapName]" @click="btnPosition">

          <div id="pointer1" class="pointer" v-if="mapName === 'map01'"></div>
          <div id="pointer2" class="pointer" v-if="mapName === 'map02'"></div>

          <div class="center-target"></div>
          <div id="left-top-div">
            <v-btn @click="btnClickMenu(mapName)" v-if="mapName === 'map01'"><v-icon>mdi-menu</v-icon></v-btn>
            <v-btn style="margin-left:10px;" @click="btnClickSplit" v-if="mapName === 'map01'"><v-icon>mdi-monitor-multiple</v-icon></v-btn>
            <v-btn style="margin-left:10px;" @click="btnClickLayer(mapName)"><v-icon>mdi-layers</v-icon></v-btn>
          </div>
          <div id="right-top-div">
            <v-btn icon @click="goToCurrentLocation" v-if="mapName === 'map01'"><v-icon>mdi-crosshairs-gps</v-icon></v-btn>
          </div>

          <DialogMenu :mapName=mapName />
          <DialogLayer :mapName=mapName />
          <dialog-info :mapName=mapName />
          <dialog2 :mapName=mapName />

          <div class="terrain-btn-div" v-drag>
            <div class="terrain-btn-container">
              <button type="button" class="terrain-btn-up terrain-btn" @pointerdown="upMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-up fa-lg hover'></i></button>
              <button type="button" class="terrain-btn-down terrain-btn" @pointerdown="downMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-down fa-lg'></i></button>
              <button type="button" class="terrain-btn-left terrain-btn" @pointerdown="leftMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-left fa-lg'></i></button>
              <button type="button" class="terrain-btn-right terrain-btn" @pointerdown="rightMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-right fa-lg'></i></button>
              <button type="button" class="terrain-btn-center terrain-btn" @pointerdown="terrainReset(mapName)"><v-icon>mdi-undo</v-icon></button>
            </div>
          </div>
          <div class="zoom-div">zoom={{zoom.toFixed(2)}}</div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>

export function history (event,url) {
  const ua = navigator.userAgent
  const width = window.screen.width;
  const height = window.screen.height;
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
  }),
  computed: {
    // s_terrainLevel () {
    //   return this.$store.state.terrainLevel
    // },

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
      this.param = `?lng=${lng}&lat=${lat}&zoom=${zoom}&split=${split}&pitch01=${pitch01}&pitch02=${pitch02}&bearing=${bearing}&slj=${selectedLayersJson}`
      // console.log(this.param)
      // this.permalink = `${window.location.origin}${window.location.pathname}${this.param}`
      // URLを更新
      // window.history.pushState({ lng, lat, zoom }, '', this.permalink)
      this.createShortUrl()
      this.zoom = zoom
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
      const slj = JSON.parse(params.get('slj'))
      this.pitch.map01 = pitch01
      this.pitch.map02 = pitch02
      this.bearing = bearing
      return {lng,lat,zoom,split,pitch,pitch01,pitch02,bearing,slj}// 以前のリンクをいかすためpitchを入れている。
    },
    init() {
      let protocol = new Protocol();
      maplibregl.addProtocol("pmtiles",protocol.tile)
      const params = this.parseUrlParams()
      this.mapNames.forEach(mapName => {
        let center = [139.7024, 35.6598]
        let zoom = 16
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

        const map = new maplibregl.Map({
          container: mapName,
          localIdeographFontFamily: ['sans-serif'], // 日本語を表示するための設定
          center: center,
          zoom: zoom,
          pitch: pitch[mapName],
          bearing:bearing,
          maxPitch: 85, // 最大の傾き、デフォルトは60
          attributionControl: false, // デフォルトのアトリビューションコントロールを無効化
          // style: 'https://raw.githubusercontent.com/gsi-cyberjapan/optimal_bvmap/52ba56f645334c979998b730477b2072c7418b94/style/std.json',
          // style:require('@/assets/json/std.json')
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
          style: {
            'version': 8,
            glyphs: "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
            'sources': {
              'gsi-monochrome': {
                'type': 'raster',
                'tiles': [
                  'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'
                ],
                'tileSize': 256,
                'attribution': '© 国土地理院'
              }
            },
            'layers': [
              {
                'id': 'gsi-monochrome-layer',
                'type': 'raster',
                'source': 'gsi-monochrome',
              }
            ]
          },
        })
        this.$store.state[mapName] = map

        map.addControl(
            new maplibregl.AttributionControl({
              compact: true, // アトリビューションを小さくする
            })
        )

      })
      // -----------------------
      const map = this.$store.state.map01
      map.on('moveend', () => {
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


      map1.on('click', (e) => {
        if (syncing) return  // 同期中の場合は再帰呼び出しを防ぐ
        syncing = true
        const coordinates = e.lngLat
        console.log(coordinates)
        // map2のクリックイベントをプログラムで発生させる
        map2.fire('click', { lngLat: coordinates })
        syncing = false
      })

      // map2のクリックイベント
      map2.on('click', (e) => {
        if (syncing) return  // 同期中の場合は再帰呼び出しを防ぐ
        syncing = true
        const coordinates = e.lngLat
        // map1のクリックイベントをプログラムで発生させる
        map1.fire('click', { lngLat: coordinates })
        syncing = false
      })
      // -----------------------------------------------------------------------------------------------------------------
      // on load
      this.mapNames.forEach(mapName => {
        const map = this.$store.state[mapName]
        const params = this.parseUrlParams()
        map.on('load', () => {

          const attributionButton = document.querySelector('#' + mapName +' .maplibregl-ctrl-attrib-button');
          if (attributionButton) {
            attributionButton.click(); // 初期状態で折りたたむ
          }

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
          // ここを改善する必要あり ここでプログラムがエラーなしでとまる。
          //
          // console.log(mapName)
          // console.log(params.slj)
          if (params.slj) {
            params.slj[mapName].forEach(slg => {
              let cnt = 0
              function aaa () {
                Layers.layers[mapName].forEach(value => {
                  if (!value.nodes) cnt++
                  function bbb (v1) {
                    if (v1.nodes) {
                      v1.nodes.forEach(v2 => {
                        if (!v2.nodes) {
                          if (v2.id === slg.id) {
                            slg.source = v2.source
                            slg.layers = v2.layers
                            // console.log(slg.layers)
                            // console.log(v2.layers)
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
            })
          }
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
          // map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel });
          const vm = this
          document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('mouseover', function() {
            map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          }, false);
          document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('pointerdown', function() {
            map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          }, false);
          addEventListener('keydown', function () {
            map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
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
              map.getCanvas().style.cursor = 'pointer'
            } else {
              map.getCanvas().style.cursor = 'default'
            }
          })

          // レイヤーIDを特定せずに全てのフィーチャーから最初のものだけにポップアップ表示
          map.on('click', (e) => {
            let features = map.queryRenderedFeatures(e.point); // クリック位置のフィーチャーを全て取得

            console.log(features[0])

            if (features.length > 0) {
              const feature = features[0]; // 最初のフィーチャーのみ取得
              const layerId = feature.layer.id
              console.log(layerId)
              let props = feature.properties
              const coordinates = e.lngLat
              // let coordinates = feature.geometry.coordinates.slice()
              // if (coordinates.length !== 2) coordinates = e.lngLat
              console.log(coordinates)
              console.log(props)
              let html = ''
              switch (layerId) {
                case 'oh-zosei-line':
                case 'oh-zosei-label':
                case 'oh-zosei': {
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-zosei'] }
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
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><hr>' +
                      '<span style="font-size: 12px;">' + syozai + '</span><hr>' +
                      '<span style="font-size: 12px;">' + bango + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-mw5-center': {
                  console.log(props)
                  const name = props.title
                  const link = '<a href="https://mapwarper.h-gis.jp/maps/' + props.id + '" target="_blank" >日本版Map Warper</a>'
                  html=
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><hr>' +
                      '<span style="font-size: 12px;">' + link + '</span><br>' +
                      '</div>'
                  break
                }
                case 'oh-tetsudo-blue-lines':
                case 'oh-tetsudo-red-lines':{
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '</div>'
                  break
                }
                case 'oh-tetsudo-points-blue':
                case 'oh-tetsudo-points-red':{
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  const eki = props.N05_011
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '<span style="font-size: 20px;">' + eki + '</span><br>' +
                      '</div>'
                  break
                }
                case 'oh-tetsudojikeiretsu-red-lines':
                case 'oh-tetsudojikeiretsu-blue-lines':{
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '</div>'
                  break
                }
                case 'oh-tetsudojikeiretsu-points':{
                  const name = props.N05_002
                  const kaisya = props.N05_003
                  const eki = props.N05_011
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                      '<span style="font-size: 16px;">' + name + '</span><br>' +
                      '<span style="font-size: 20px;">' + eki + '</span><br>' +
                      '</div>'
                  break
                }
                case 'oh-michinoeki-label':
                case 'oh-michinoeki':{
                  const name = props.P35_006
                  const link = '<a href="' + props.P35_007 + '" target="_blank">道の駅ページへ</a>'
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '<div style="font-size: 20px;margin-top: 10px;">' + link + '</div>' +
                      '</div>'
                  break
                }
                case 'oh-koji-label':
                case 'oh-koji-height':
                case 'oh-koji_point':{
                  const name = props.L01_025
                  const kojikakaku = props.L01_008.toLocaleString() + '円'
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '<span style="font-size: 20px;">' + kojikakaku + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-did':{
                  const name = props.A16_003
                  const jinko = props.A16_005.toLocaleString() + '人'
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '<span style="font-size: 20px;">' + jinko + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-syochiiki-height':
                case 'oh-syochiiki-label':
                case 'oh-syochiikiLayer':{
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-syochiikiLayer'] }
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.S_NAME
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '<span style="font-size: 20px;">' + props.JINKO + '人</span>' +
                      '<button class="pyramid-syochiiki-r02 pyramid-btn" year=2020 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2020（R02）人口ピラミッド</button><br>' +
                      '<button class="pyramid-syochiiki-h27 pyramid-btn" year=2015 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2015（H27）人口ピラミッド</button><br>' +
                      '<button class="pyramid-syochiiki-h22 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2010（H22）人口ピラミッド</button><br>' +
                      '<button class="pyramid-syochiiki-h17 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2005（H17）人口ピラミッド</button><br>' +
                      '<button class="jinkosuii pyramid-btn" mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">人口推移</button>' +
                      '</div>'
                  break
                }
                case 'oh-kyusekki':{
                  let name = props.遺跡名
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-m250m-height':
                case 'oh-m250m-label':
                case 'oh-m250m-line':
                case 'oh-m250m':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-m250m'] }
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.floor(Number(props.jinko)) + '人'
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-m500m-height':
                case 'oh-m500m-label':
                case 'oh-m500m-line':
                case 'oh-m500m':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-m500m'] }
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.floor(Number(props.jinko)) + '人'
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-m1km-height':
                case 'oh-m1km-label':
                case 'oh-m1km-line':
                case 'oh-m1km':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-m1km'] }
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.floor(Number(props.jinko)) + '人'
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-m100m-height':
                case 'oh-m100m-label':
                case 'oh-m100m-line':
                case 'oh-m100m':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-m100m'] }
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = '人口' + Math.floor(Number(props.PopT)) + '人'
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-iryokikan-label':
                case 'oh-iryokikan':{
                  const name = props.P04_002
                  const address = props.P04_003
                  const kamoku = props.P04_004
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><hr>' +
                      '<span style="font-size: 12px;">' + address + '</span><hr>' +
                      '<span style="font-size: 12px;">' + kamoku + '</span>' +
                      '</div>'
                  break
                }
                case 'oh-nihonrekishi-label':
                case 'oh-nihonrekishi':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: [layerId] }
                  )

                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.名称
                  html =
                      '<div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                       name +
                       '</div>'
                  break
                }
                case 'oh-chikeibunrui':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-chikeibunrui'] }
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.code
                  let naritachi = "",risk = ""
                  const list = codeShizen
                  for(let i=0;i < list.length; i++){
                    if(list[i][1] === name){//ズーム率によって数値型になったり文字型になったりしている模様
                      naritachi = list[i][2]
                      risk = list[i][3]
                      break;
                    }
                  }
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><hr>' +
                      '<span style="font-size: 12px;">' + naritachi + '</span><hr>' +
                      '<span style="font-size: 12px;">' + risk + '</span>' +
                      '</div>'
                  break
                }
                // ここを改善する
                case 'oh-cyugakuR05':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-cyugakuR05'] }
                  )
                  console.log(features)
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.A32_004
                  html =
                      '<div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                       name +
                      '</div>'
                  break
                }
                case 'oh-cyugakuR05-line':
                case 'oh-cyugakuR05-label':
                case 'oh-cyugakuR05-point':{
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: [layerId] }
                  )
                  let objName = 'P29_004'
                  if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), { layers: ['oh-cyugakuR05'] }
                    )
                    objName = 'A32_004'
                  }
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props[objName]
                  html =
                      '<div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                      name +
                      '</div>'
                  break
                }
                  // ここを改善する
                case 'oh-syogakkoR05':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-syogakkoR05'] }
                  )
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props.A27_004
                  html =
                      '<div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                      name +
                      '</div>'
                  break
                }
                case 'oh-syogakkoR05-line':
                case 'oh-syogakkoR05-label':
                case 'oh-syogakkoR05-point':{
                  features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: [layerId] }
                  )
                  let objName = 'P29_004'
                  if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), { layers: ['oh-syogakkoR05'] }
                    )
                    objName = 'A27_004'
                  }
                  if (features.length === 0) return
                  props = features[0].properties
                  const name = props[objName]
                  html =
                      '<div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                      name +
                      '</div>'
                  break
                }
                case 'oh-bakumatsu-line':
                case 'oh-bakumatsu':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-bakumatsu'] }
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.村名
                  const kokudaka = Math.floor(Number(props.石高計))
                  const ryobun = props.領分１
                  html =
                      `
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `
                  break
                }
                case 'oh-bakumatsu-height':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-bakumatsu-height'] }
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.村名
                  const kokudaka = Math.floor(Number(props.石高計))
                  const ryobun = props.領分１
                  html =
                      `
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `
                  break
                }
                case 'oh-bakumatsu-line2':
                case 'oh-bakumatsu-han':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-bakumatsu-han'] }
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.村名
                  const kokudaka = Math.floor(Number(props.石高計))
                  const ryobun = props.領分１
                  html =
                      `
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `
                  break
                }
                case 'oh-bakumatsu-label':
                case 'oh-bakumatsu-kokudaka':{
                  // ここを参考に
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
                  html =
                      `
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `
                  break
                }
                case 'oh-highwayLayer-green-lines':
                case 'oh-highwayLayer-red-lines':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-highwayLayer-green-lines'] }
                  )
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.N06_007
                  const id = props.N06_004
                  const kyouyounen = props.N06_001
                  const kaishinen = props.N06_002
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '<span style="font-size: 12px;">id=' + id + '</span><br>' +
                      '<span style="font-size: 12px;">供用開始年=' + kyouyounen + '</span><br>' +
                      '<span style="font-size: 12px;">設置期間（開始年）=' + kaishinen + '</span><br>' +
                      '</div>'
                  break
                }
                case 'oh-q-kyoryo-label':
                case 'oh-q-kyoryo':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-q-kyoryo'] }
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props._html
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
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
                  break
                }
                case 'oh-q-tunnel-label':
                case 'oh-q-tunnel':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-q-tunnel'] }
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props._html
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
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
                  break
                }
                case 'oh-yotochiiki-height':
                case 'oh-yotochiiki-line':
                case 'oh-yotochiiki':{
                  const features = map.queryRenderedFeatures(
                      map.project(coordinates), { layers: ['oh-yotochiiki'] }
                  )
                  console.log(features)
                  if (features.length === 0) return;
                  props = features[0].properties
                  const name = props.用途地域
                  html =
                      '<div font-weight: normal; color: #333;line-height: 25px;">' +
                      '<span style="font-size: 20px;">' + name + '</span><br>' +
                      '</div>'
                  break
                }
              }

              // ポップアップ作成
                new maplibregl.Popup({
                  // offset: 10,
                  closeButton: true,
                })
                    .setLngLat(coordinates)
                    .setHTML(html)
                    .addTo(map)
              }
          })



          //------------------------------------------------------------------------------------------------------------
          function latLngToTile(lat, lng, z) {
            const
                w = Math.pow(2, (z === undefined) ? 0 : z) / 2,		// 世界全体のピクセル幅
                yrad = Math.log(Math.tan(Math.PI * (90 + lat) / 360))

            return { x: (lng / 180 + 1) * w, y: (1 - yrad / Math.PI) * w }
          }
          function getLegendItem(legend, url, lat, lng, z) {
            map.getCanvas().style.cursor = 'progress'
            return new Promise(function (resolve) {
              const
                  p = latLngToTile(lat, lng, z),
                  x = Math.floor(p.x),			// タイルX座標
                  y = Math.floor(p.y),			// タイルY座標
                  i = (p.x - x) * 256,			// タイル内i座標
                  j = (p.y - y) * 256,			// タイル内j座標
                  img = new Image();

              img.crossOrigin = 'anonymous';	// 画像ファイルからデータを取り出すために必要です
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
                if (d[3] !== 255) {
                  v = null
                } else {
                  v = legend.find(o => o.r == d[0] && o.g == d[1] && o.b == d[2])
                }
                map.getCanvas().style.cursor = 'default'
                resolve(v)
              }
              img.onerror = function () {
                map.getCanvas().style.cursor = 'default'
                resolve(null)
              }
              img.src = url.replace('{z}', z).replace('{y}', y).replace('{x}', x);
            });
          }
          const legend_shinsuishin = [
            { r: 247, g: 245, b: 169, title: '0.5m未満' },
            { r: 255, g: 216, b: 192, title: '0.5～3.0m' },
            { r: 255, g: 183, b: 183, title: '3.0～5.0m' },
            { r: 255, g: 145, b: 145, title: '5.0～10.0m' },
            { r: 242, g: 133, b: 201, title: '10.0～20.0m' },
            { r: 220, g: 122, b: 220, title: '20.0m以上' }
          ]
          map.on('click', function (e) {
            // 表示されているレイヤーのIDを格納する配列
            let rasterLayerIds = [];
            const mapLayers = map.getStyle().layers;

            // 全てのレイヤーを走査して、'type'が'rasterのものをフィルタリング
            mapLayers.forEach(layer => {
              // const visibility = map.getLayoutProperty(layer.id, 'visibility');
              // レイヤーのtypeプロパティを取得
              const type = layer.type;
              if (type === 'raster') {
                rasterLayerIds.push(layer.id);
              }
            });
            // ラスタレイヤのidからポップアップ表示に使用するURLを生成
            let RasterTileUrl = '';
            let legend = [];
            rasterLayerIds.forEach(rasterLayerId => {
              if (rasterLayerId === 'oh-kozui-saidai-layer') {
                // 洪水浸水想定区域（想定最大規模）
                RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin/{z}/{x}/{y}.png';
                legend = legend_shinsuishin;
              }
              const lng = e.lngLat.lng;
              const lat = e.lngLat.lat;
              const z = 17
              if (RasterTileUrl) {
                getLegendItem(legend, RasterTileUrl, lat, lng,z).then(function (v) {
                  let res = (v ? v.title : '')
                  if (res === '') return
                  if (rasterLayerId === 'oh-kozui-saidai-layer') {
                    new maplibregl.Popup()
                        .setLngLat(e.lngLat)
                        .setHTML(
                            '<div font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size: 12px;">洪水によって想定される浸水深</span><br>' +
                            '<span style="font-size: 24px;">' + res + '</span>' +
                            '</div>'
                        )
                        .addTo(map);
                  }
                })
              }
            })
          })
          // map.on('click', 'oh-zosei', (e) => {
          //   let coordinates = e.lngLat
          //   const features = map.queryRenderedFeatures(
          //       map.project(coordinates), { layers: ['oh-zosei'] }
          //   )
          //   if (features.length === 0) return
          //   const props = features[0].properties
          //   console.log(props)
          //   let name
          //   if (props.A54_001 === '1') {
          //     name = '谷埋め型'
          //   } else if (props.A54_001 === '2') {
          //     name = '腹付け型'
          //   } else if (props.A54_001 === '9') {
          //     name = '区分をしていない'
          //   }
          //   const syozai = props.A54_003 + props.A54_005
          //   const bango = props.A54_006
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + syozai + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + bango + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-mw5-center', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.title
          //   const link = '<a href="https://mapwarper.h-gis.jp/maps/' + props.id + '" target="_blank" >日本版Map Warper</a>'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + link + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })

          // map.on('click', 'oh-tetsudo-red-lines', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N05_002
          //   const kaisya = props.N05_003
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-tetsudo-blue-lines', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N05_002
          //   const kaisya = props.N05_003
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-tetsudo-points-red', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N05_002
          //   const kaisya = props.N05_003
          //   const eki = props.N05_011
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
          //           '<span style="font-size: 16px;">' + name + '</span><br>' +
          //           '<span style="font-size: 20px;">' + eki + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-tetsudo-points-blue', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N05_002
          //   const kaisya = props.N05_003
          //   const eki = props.N05_011
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
          //           '<span style="font-size: 16px;">' + name + '</span><br>' +
          //           '<span style="font-size: 20px;">' + eki + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-tetsudojikeiretsu-blue-lines', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N05_002
          //   const kaisya = props.N05_003
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-tetsudojikeiretsu-points', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N05_002
          //   const kaisya = props.N05_003
          //   const eki = props.N05_011
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
          //           '<span style="font-size: 16px;">' + name + '</span><br>' +
          //           '<span style="font-size: 20px;">' + eki + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-michinoeki', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.P35_006
          //   const link = '<a href="' + props.P35_007 + '" target="_blank">道の駅ページへ</a>'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '<div style="font-size: 20px;margin-top: 10px;">' + link + '</div>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-koji-height', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.L01_025
          //   const kojikakaku = props.L01_008.toLocaleString() + '円'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '<span style="font-size: 20px;">' + kojikakaku + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-koji_point', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.L01_025
          //   const kojikakaku = props.L01_008.toLocaleString() + '円'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '<span style="font-size: 20px;">' + kojikakaku + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-did', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.A16_003
          //   const jinko = props.A16_005.toLocaleString() + '人'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '<span style="font-size: 20px;">' + jinko + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-syochiikiLayer', (e) => {
          //   let coordinates = e.lngLat
          //   const features = map.queryRenderedFeatures(
          //       map.project(coordinates), { layers: ['oh-syochiikiLayer'] }
          //   )
          //   if (features.length === 0) return
          //   const props = features[0].properties
          //   console.log(props)
          //   let name = props.S_NAME
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '<span style="font-size: 20px;">' + props.JINKO + '人</span>' +
          //           '<button class="pyramid-syochiiki-r02 pyramid-btn" year=2020 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2020（R02）人口ピラミッド</button><br>' +
          //           '<button class="pyramid-syochiiki-h27 pyramid-btn" year=2015 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2015（H27）人口ピラミッド</button><br>' +
          //           '<button class="pyramid-syochiiki-h22 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2010（H22）人口ピラミッド</button><br>' +
          //           '<button class="pyramid-syochiiki-h17 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2005（H17）人口ピラミッド</button><br>' +
          //           '<button class="jinkosuii pyramid-btn" mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">人口推移</button>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-kyusekki', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   let name = props.遺跡名
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-m250m', (e) => {
          //   let coordinates = e.lngLat
          //   const features = map.queryRenderedFeatures(
          //       map.project(coordinates), { layers: ['oh-m250m'] }
          //   )
          //   if (features.length === 0) return
          //   const props = features[0].properties
          //   let name = props.jinko
          //   name = '人口' + Math.floor(Number(name)) + '人'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-m500m', (e) => {
          //   let coordinates = e.lngLat
          //   const features = map.queryRenderedFeatures(
          //       map.project(coordinates), { layers: ['oh-m500m'] }
          //   )
          //   if (features.length === 0) return
          //   const props = features[0].properties
          //   console.log(props)
          //   let name = props.jinko
          //   name = '人口' + Math.floor(Number(name)) + '人'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-m1km', (e) => {
          //   let coordinates = e.lngLat
          //   const features = map.queryRenderedFeatures(
          //       map.project(coordinates), { layers: ['oh-m1km'] }
          //   )
          //   if (features.length === 0) return
          //   const props = features[0].properties
          //   console.log(props)
          //   let name = props.jinko
          //   name = '人口' + Math.floor(Number(name)) + '人'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-m100m', (e) => {
          //   let coordinates = e.lngLat
          //   const features = map.queryRenderedFeatures(
          //       map.project(coordinates), { layers: ['oh-m100m'] }
          //   )
          //   if (features.length === 0) return
          //   const props = features[0].properties
          //   console.log(props)
          //   let name = props.PopT
          //   name = '人口' + Math.floor(Number(name)) + '人'
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // -----------------------------------------------------------------------------------------------------------
          //
          // map.on('mouseenter', 'oh-iryokikan', function () {
          //   map.getCanvas().style.cursor = 'pointer';
          // });
          // map.on('mouseleave', 'oh-iryokikan', function () {
          //   map.getCanvas().style.cursor = '';
          // });
          // map.on('click', 'oh-iryokikan', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.P04_002
          //   const address = props.P04_003
          //   const kamoku = props.P04_004
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + address + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + kamoku + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // -----------------------------------------------------------------------------------------------------------
          // map.on('mouseenter', 'oh-iryokikanLayer-label', function () {
          //   map.getCanvas().style.cursor = 'pointer';
          // });
          // map.on('mouseleave', 'oh-iryokikanLayer-label', function () {
          //   map.getCanvas().style.cursor = '';
          // });
          // map.on('click', 'oh-iryokikanLayer-label', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.P04_002
          //   const address = props.P04_003
          //   const kamoku = props.P04_004
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + address + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + kamoku + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-nihonrekishi', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.名称
          //
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(`
          //         <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
          //          ${name}
          //         </div>
          //       `)
          //       .addTo(map)
          // })
          // map.on('click', 'oh-chikeibunrui', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.code
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   let naritachi = "",risk = ""
          //   const list = codeShizen
          //   for(var i=0;i < list.length; i++){
          //     if(list[i][1] === name){//ズーム率によって数値型になったり文字型になったりしている模様
          //       naritachi = list[i][2]
          //       risk = list[i][3]
          //       break;
          //     }
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + naritachi + '</span><hr>' +
          //           '<span style="font-size: 12px;">' + risk + '</span>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-cyugakuR05', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.A32_004
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(`
          //         <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
          //          ${name}
          //         </div>
          //       `)
          //       .addTo(map)
          // })
          // map.on('click', 'oh-syogakkoR05', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.A27_004
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(`
          //         <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
          //          ${name}
          //         </div>
          //       `)
          //       .addTo(map)
          // })
          // map.on('click', 'oh-bakumatsu', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.村名
          //   const kokudaka = Math.floor(Number(props.石高計))
          //   const ryobun = props.領分１
          //
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(`
          //         <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
          //          村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
          //         </div>
          //       `)
          //       .addTo(map)
          // })
          // map.on('click', 'oh-bakumatsu-kokudaka', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.村名
          //   const kokudaka = Math.floor(Number(props.石高計))
          //   const ryobun = props.領分１
          //
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(`
          //         <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
          //          村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
          //         </div>
          //       `)
          //       .addTo(map)
          // })
          // map.on('click', 'oh-bakumatsu-height', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.村名
          //   const kokudaka = Math.floor(Number(props.石高計))
          //   const ryobun = props.領分１
          //
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(`
          //         <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
          //          村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
          //         </div>
          //       `)
          //       .addTo(map)
          // })
          // map.on('click', 'oh-bakumatsu-han', (e) => {
          //   let coordinates = e.lngLat
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.村名
          //   const kokudaka = Math.floor(Number(props.石高計))
          //   const ryobun = props.領分１
          //
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(`
          //         <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
          //          村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
          //         </div>
          //       `)
          //       .addTo(map)
          // })
          // ------------------------------------------
          // map.on('click', 'oh-highwayLayer-red-lines', (e) => {
          //   let coordinates = e.lngLat
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N06_007
          //   const id = props.N06_004
          //   const kyouyounen = props.N06_001
          //   const kaishinen = props.N06_002
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '<span style="font-size: 12px;">id=' + id + '</span><br>' +
          //           '<span style="font-size: 12px;">供用開始年=' + kyouyounen + '</span><br>' +
          //           '<span style="font-size: 12px;">設置期間（開始年）=' + kaishinen + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          // map.on('click', 'oh-highwayLayer-green-lines', (e) => {
          //   let coordinates = e.lngLat
          //   while (Math.abs(e.lngLat.lng - coordinates) > 180) {
          //     coordinates += e.lngLat.lng > coordinates ? 360 : -360;
          //   }
          //   const props = e.features[0].properties
          //   console.log(props)
          //   const name = props.N06_007
          //   const id = props.N06_004
          //   const kyouyounen = props.N06_001
          //   const kaishinen = props.N06_002
          //   // ポップアップを表示する
          //   new maplibregl.Popup({
          //     offset: 10,
          //     closeButton: true,
          //   })
          //       .setLngLat(coordinates)
          //       .setHTML(
          //           '<div font-weight: normal; color: #333;line-height: 25px;">' +
          //           '<span style="font-size: 20px;">' + name + '</span><br>' +
          //           '<span style="font-size: 12px;">id=' + id + '</span><br>' +
          //           '<span style="font-size: 12px;">供用開始年=' + kyouyounen + '</span><br>' +
          //           '<span style="font-size: 12px;">設置期間（開始年）=' + kaishinen + '</span><br>' +
          //           '</div>'
          //       )
          //       .addTo(map)
          // })
          const pitch = !isNaN(this.pitch[mapName]) ? this.pitch[mapName]: 0
          if (pitch !== 0) {
            this.$store.state[mapName].setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
          }
        })

        //on load終了----------------------------------------------------------------------------------------------------
      })
    }
  },
  mounted() {
    const vm = this
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
        // console.log('変更を検出しました')
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




    // pitch () {
    //   console.log(11111111)
    //   this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
    //
    //   // document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('click', function() {
    //   // 上とセットで動く。
    //   // if (this.pitch === 0 ) {
    //   //   this.$store.state.map01.setTerrain(null)
    //   //   this.$store.state.map02.setTerrain(null)
    //   // }
    // }
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
  /*cursor:move;*/
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
}
.maplibregl-popup-content {
  padding: 30px 20px 10px 20px;
  max-width: 300px;
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
</style>