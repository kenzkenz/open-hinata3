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
            <v-btn class="watch-position" :color="isTracking ? 'green' : undefined" icon @click="toggleWatchPosition" v-if="mapName === 'map01'"><v-icon>mdi-map-marker-radius</v-icon></v-btn>
            <v-btn class="zoom-in" icon @click="zoomIn" v-if="mapName === 'map01'"><v-icon>mdi-plus</v-icon></v-btn>
            <v-btn class="zoom-out" icon @click="zoomOut" v-if="mapName === 'map01'"><v-icon>mdi-minus</v-icon></v-btn>
            <v-btn class="share" icon @click="share(mapName)" v-if="mapName === 'map01'"><v-icon>mdi-share-variant</v-icon></v-btn>
          </div>

          <DialogMenu :mapName=mapName />
          <DialogLayer :mapName=mapName />
          <dialog-info :mapName=mapName />
          <dialog2 :mapName=mapName />
          <dialogShare :mapName=mapName />

          <div :id="'terrain-btn-div-' + mapName" class="terrain-btn-div">
            <div class="terrain-btn-container">
              <v-icon class="terrain-btn-close" @pointerdown="terrainBtnClos">mdi-close</v-icon>
              <v-btn type="button" class="terrain-btn-up terrain-btn" @pointerdown="upMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-up fa-lg hover'></i></v-btn>
              <v-btn type="button" class="terrain-btn-down terrain-btn" @pointerdown="downMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-down fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-left terrain-btn" @pointerdown="leftMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-left fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-right terrain-btn" @pointerdown="rightMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-right fa-lg'></i></v-btn>
              <v-btn icon type="button" class="terrain-btn-center terrain-btn" @pointerdown="terrainReset(mapName)"><v-icon>mdi-undo</v-icon></v-btn>
            </div>
          </div>
          <div class="terrain-btn-expand-div">
            <v-btn icon type="button" @pointerdown="terrainBtnExpand"><v-icon>mdi-arrow-expand</v-icon></v-btn>
          </div>

          <div class="zoom-div">
            zoom={{zoom.toFixed(2)}} {{elevation}}<br>
            {{address}}
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import {mouseMoveForPopup, popup} from "@/js/popup";
import { CompassControl } from 'maplibre-gl-compass'
import {
  handleFileUpload,
  highlightSpecificFeatures,
  highlightSpecificFeaturesCity
} from '@/js/downLoad'

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
// 緯度経度をタイル座標 (z, x, y) に変換
function lonLatToTile(lon, lat, zoom) {
  const n = Math.pow(2, zoom);
  const xTile = Math.floor((lon + 180.0) / 360.0 * n);
  const yTile = Math.floor(
      (1.0 - Math.log(Math.tan((lat * Math.PI) / 180.0) + 1.0 / Math.cos((lat * Math.PI) / 180.0)) / Math.PI) /
      2.0 *
      n
  );
  return { xTile, yTile };
}

// タイル内のピクセル座標を計算
function calculatePixelInTile(lon, lat, zoom, xTile, yTile, tileSize = 256) {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180.0) / 360.0 * n - xTile) * tileSize;
  const y =
      ((1.0 - Math.log(Math.tan((lat * Math.PI) / 180.0) + 1.0 / Math.cos((lat * Math.PI) / 180.0)) / Math.PI) / 2.0 *
          n -
          yTile) *
      tileSize;
  return { x: Math.floor(x), y: Math.floor(y) };
}

// 修正版: RGB値を標高にデコードする関数
function decodeElevationFromRGB(r, g, b) {
  const scale = 0.01; // スケール値（仮定）
  const offset = 0;   // オフセット値（仮定）
  return (r * 256 * 256 + g * 256 + b) * scale + offset; // RGB値を計算
}

// 標高データをタイル画像から取得し、キャンバスに出力
async function fetchElevationFromImage(imageUrl, lon, lat, zoom) {
  const { xTile, yTile } = lonLatToTile(lon, lat, zoom);

  const img = new Image();
  img.crossOrigin = "Anonymous"; // クロスオリジン対応
  img.src = imageUrl;

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // タイル内のピクセル座標を計算
      const { x, y } = calculatePixelInTile(lon, lat, zoom, xTile, yTile, img.width);

      // ピクセルデータを取得
      const imageData = ctx.getImageData(x, y, 1, 1).data;
      const [r, g, b] = imageData; // R, G, B 値を取得
      const elevation = decodeElevationFromRGB(r, g, b); // 標高を計算

      // キャンバスに描画
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = "12px Arial";
      ctx.fillStyle = "white";
      ctx.fillText(`${elevation}m`, x + 10, y - 10);
      document.body.appendChild(canvas);

      resolve(elevation);
    };

    img.onerror = (err) => {
      reject(`画像の読み込みに失敗しました: ${err}`);
    };
  });
}

// 標高を取得する関数
async function fetchElevation(lon, lat, zoom = 15) {
  const baseUrl = "https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png";
  const { xTile, yTile } = lonLatToTile(lon, lat, zoom);

  // y と x を反転してタイルURLを生成
  const tileUrl = baseUrl.replace("{z}", zoom).replace("{x}", xTile).replace("{y}", yTile);

  try {
    const elevation = await fetchElevationFromImage(tileUrl, lon, lat, zoom);
    console.log(`標高: ${elevation}m`);
    return elevation;
  } catch (error) {
    console.error("エラー:", error);
  }
}

import axios from "axios"
import DialogMenu from '@/components/Dialog-menu'
import DialogLayer from '@/components/Dialog-layer'
import DialogInfo from '@/components/Dialog-info'
import Dialog2 from '@/components/Dialog2'
import DialogShare from "@/components/Dialog-share"
// import codeShizen from '@/js/codeShizen'
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
    DialogShare,
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
    address:'',
    elevation:'',
    watchId: null,
    centerMarker: null,
    isTracking: false,
    compass: null,
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
    share(mapName) {
      if (this.$store.state.dialogs.shareDialog[mapName].style.display === 'none') {
        this.$store.commit('incrDialogMaxZindex')
        this.$store.state.dialogs.shareDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.shareDialog[mapName].style.display = 'block'
        if (window.innerWidth < 450) {
          this.$store.state.dialogs.shareDialog[mapName].style.left = '0px'
        } else {
          this.$store.state.dialogs.shareDialog[mapName].style.left = (window.innerWidth - 360) + 'px'
        }
      } else {
        this.$store.state.dialogs.shareDialog[mapName].style.display = 'none'
      }
    },
    zoomIn() {
      const map = this.$store.state.map01
      map.zoomIn({duration: 500})
    },
    zoomOut() {
      const map = this.$store.state.map01
      map.zoomOut({duration: 500})
    },
    startWatchPosition () {
      if (this.watchId === null && navigator.geolocation) {
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
              this.updateLocationAndCoordinates(position);
            },
            (error) => {
              console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }
    },
    toggleWatchPosition () {
      if (this.watchId === null) {
        this.startWatchPosition()
        this.isTracking = true
        this.compass.turnOn()
        history('現在位置継続取得スタート',window.location.href)
      } else {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
        this.centerMarker.remove()
        this.centerMarker = null
        this.isTracking = false
        this.compass.turnOff()
        history('現在位置継続取得ストップ',window.location.href)
      }
    },
    updateLocationAndCoordinates(position) {
      const map = this.$store.state.map01
      let longitude, latitude;
      if (position) {
        ({latitude, longitude} = position.coords);
        // map.setCenter([longitude, latitude]);
        // map.setZoom(15);
        map.flyTo({ center: [longitude, latitude], zoom: map.getZoom() });
      } else {
        const center = map.getCenter();
        longitude = center.lng;
        latitude = center.lat;
      }
      // 中心を示すマーカーを追加・更新
      if (!this.centerMarker) {
        this.centerMarker = new maplibregl.Marker({ color: 'green' })
            .setLngLat([longitude, latitude])
            .addTo(map);
      } else {
        this.centerMarker.setLngLat([longitude, latitude]);
      }
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
    terrainBtnClos () {
      document.querySelectorAll('.terrain-btn-div').forEach(elm => {
        elm.style.display = 'none'
      })
      document.querySelectorAll('.terrain-btn-expand-div').forEach(elm => {
        elm.style.display = 'block'
      })
    },
    terrainBtnExpand () {
      document.querySelectorAll('.terrain-btn-div').forEach(elm => {
        elm.style.display = 'block'
      })
      document.querySelectorAll('.terrain-btn-expand-div').forEach(elm => {
        elm.style.display = 'none'
      })
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
      function removeKeys(obj, keysToRemove) {
        if (Array.isArray(obj)) {
          return obj.map(item => removeKeys(item, keysToRemove))
        } else if (typeof obj === 'object' && obj !== null) {
          const newObj = {}
          for (const [key, value] of Object.entries(obj)) {
            if (!keysToRemove.includes(key)) {
              newObj[key] = removeKeys(value, keysToRemove)
            }
          }
          return newObj
        }
        return obj
      }

      const keysToRemove = ['label', 'source', 'layers', 'sources', 'attribution','info']
      let copiedSelectedLayers = JSON.parse(JSON.stringify(this.$store.state.selectedLayers))
      copiedSelectedLayers = removeKeys(copiedSelectedLayers, keysToRemove)
      // console.log(JSON.stringify(copiedSelectedLayers))
      const selectedLayersJson = JSON.stringify(copiedSelectedLayers)
      console.log(this.$store.state.highlightedChibans)
      const chibans = []
      this.$store.state.highlightedChibans.forEach(h => {
        console.log(h)
        chibans.push(h)
      })
      console.log(chibans)
      // パーマリンクの生成
      this.param = `?lng=${lng}&lat=${lat}&zoom=${zoom}&split=${split}&pitch01=
      ${pitch01}&pitch02=${pitch02}&bearing=${bearing}&terrainLevel=${terrainLevel}&slj=${selectedLayersJson}&chibans=${JSON.stringify(chibans)}`
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
              console.log(splitMuni[0])
              vm.$store.state.prefId = splitMuni[0]



              // const zahyokei = [
              //   { kei: '第1系', regions: ['長崎県', '鹿児島県（北部・奄美群島含む）'] },
              //   { kei: '第2系', regions: ['福岡県', '佐賀県', '熊本県', '大分県', '宮崎県', '鹿児島県（第1系除く）'] },
              //   { kei: '第3系', regions: ['山口県', '島根県', '広島県'] },
              //   { kei: '第4系', regions: ['香川県', '愛媛県', '徳島県', '高知県'] },
              //   { kei: '第5系', regions: ['兵庫県', '鳥取県', '岡山県'] },
              //   { kei: '第6系', regions: ['京都府', '大阪府', '福井県', '滋賀県', '三重県', '奈良県', '和歌山県'] },
              //   { kei: '第7系', regions: ['石川県', '富山県', '岐阜県', '愛知県'] },
              //   { kei: '第8系', regions: ['新潟県', '長野県', '山梨県', '静岡県'] },
              //   { kei: '第9系', regions: ['東京都', '神奈川県', '千葉県', '埼玉県', '群馬県', '栃木県'] },
              //   { kei: '第10系', regions: ['青森県', '秋田県', '山形県', '岩手県', '宮城県'] },
              //   { kei: '第11系', regions: ['茨城県', '福島県'] },
              //   { kei: '第12系', regions: ['北海道（道央）'] },
              //   { kei: '第13系', regions: ['北海道（道北・道東）'] },
              //   { kei: '第14系', regions: ['北海道（道東）'] },
              //   { kei: '第15系', regions: ['小笠原諸島'] },
              //   { kei: '第16系', regions: ['沖縄本島'] },
              //   { kei: '第17系', regions: ['宮古島'] },
              //   { kei: '第18系', regions: ['石垣島'] },
              //   { kei: '第19系', regions: ['南大東島'] }
              // ];
              //
              // const kei = zahyokei.find(item => item.regions.includes(splitMuni[1]))?.kei;
              // vm.$store.state.kei = kei
              // console.log(kei)
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
            console.log(window.location.pathname)
            let pathName = ''
            if (window.location.pathname !== '/') {
              pathName = window.location.pathname
            }
            this.$store.state.url = window.location.protocol + window.location.host + pathName + "/?s=" + response.data.urlid
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
      const chibans = params.get('chibans')
      console.log(chibans)
      this.pitch.map01 = pitch01
      this.pitch.map02 = pitch02
      this.bearing = bearing
      this.s_terrainLevel = terrainLevel
      return {lng,lat,zoom,split,pitch,pitch01,pitch02,bearing,terrainLevel,slj,chibans}// 以前のリンクをいかすためpitchを入れている。
    },
    init() {

// HTML要素を追加
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.id = 'simaFileInput';
      uploadInput.accept = '.sim';
      uploadInput.style.display = 'none';
      uploadInput.addEventListener('change', handleFileUpload);
      document.body.appendChild(uploadInput);


// 複数の.scrollable-content要素やVuetifyのv-selectに対応したタッチスクロール処理

// グローバルイベントリスナーを使用して動的要素にも対応
      let startY;
      let isTouching = false;
      let currentTarget = null;
      let initialScrollTop = 0;



      function watchSelectMenu() {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              const menuContent = document.querySelector('.v-overlay__content');
              if (menuContent) {
                observer.disconnect(); // 監視を終了
                menuContent.scrollTop = 200; // スクロール位置を調整
              }
            }
          });
        });

        observer.observe(document.body, { childList: true, subtree: true });
      }
      watchSelectMenu()




// Android向けにタッチイベントの挙動を調整
      const isAndroid = /Android/i.test(navigator.userAgent);

// タッチ開始時の処理
      document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.scrollable-content, .v-overlay-container .v-select__content');
        if (target) {
          startY = e.touches[0].clientY; // タッチ開始位置を記録
          initialScrollTop = target.scrollTop; // 初期スクロール位置を記録
          isTouching = true;
          currentTarget = target;
          target.style.overflowY = 'auto'; // スクロールを強制的に有効化
        }
      }, { passive: false });

// タッチ移動時の処理
      document.addEventListener('touchmove', (e) => {
        if (!isTouching || !currentTarget) return; // タッチが開始されていなければ処理しない

        const moveY = e.touches[0].clientY;
        const deltaY = startY - moveY; // 移動量を計算

        // スクロール位置を更新
        currentTarget.scrollTop += deltaY;

        startY = moveY; // 開始位置を現在の位置に更新
        e.preventDefault(); // デフォルトのスクロールを防止
      }, { passive: false });

// タッチ終了時の処理
      document.addEventListener('touchend', () => {
        if (currentTarget) {
          currentTarget.style.overflowY = ''; // スクロール設定をリセット
        }
        currentTarget = null; // 現在のターゲットをリセット
        isTouching = false; // タッチ中フラグをOFF
        initialScrollTop = 0; // 初期スクロール位置をリセット
      });



      // ======================================================================

      let protocol = new Protocol();
      maplibregl.addProtocol("pmtiles",protocol.tile)
      // protocol.setCacheSize(50) // タイルキャッシュサイズを設定（単位: タイル数）
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




        // const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
        //   tileUrl: 'https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png',
        //   // tileUrl: 'https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png',
        //   maxzoom: 19,
        // })

        const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
          tileUrl: 'https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',
          maxzoom: 17,
          attribution: '<a href="https://gbank.gsj.jp/seamless/elev/">産総研シームレス標高タイル</a>'
        });


        const map = new maplibregl.Map({
          container: mapName,
          localIdeographFontFamily: ['sans-serif'], // 日本語を表示するための設定
          center: center,
          zoom: zoom,
          pitch: pitch[mapName],
          bearing:bearing,
          maxPitch: 85, // 最大の傾き85、デフォルトは60
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
            "glyphs": "https://tile.openstreetmap.jp/fonts/{fontstack}/{range}.pbf",
            // "glyphs": "https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf",
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
        console.log(JSON.stringify([longitude, latitude]))
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
      function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
          if (!lastRan) {
            func(...args);
            lastRan = Date.now();
          } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
              if ((Date.now() - lastRan) >= limit) {
                func(...args);
                lastRan = Date.now();
              }
            }, limit - (Date.now() - lastRan));
          }
        };
      }

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

          if (params.chibans) {
            console.log(params.chibans)
            JSON.parse(params.chibans).forEach(c => {
              console.log(c)
              this.$store.state.highlightedChibans.add(c)
            })
            setTimeout(() => {
              if (map.getLayer('oh-amx-a-fude')) highlightSpecificFeatures(map, 'oh-amx-a-fude');
              if (map.getLayer('oh-chibanzu2024')) highlightSpecificFeaturesCity(map, 'oh-chibanzu2024');
              if (map.getLayer('oh-kitahiroshimachiban')) highlightSpecificFeaturesCity(map, 'oh-kitahiroshimachiban');
              if (map.getLayer('oh-narashichiban')) highlightSpecificFeaturesCity(map, 'oh-narashichiban');
              if (map.getLayer('oh-iwatapolygon')) highlightSpecificFeaturesCity(map, 'oh-iwatapolygon');
              if (map.getLayer('oh-fukushimachiban')) highlightSpecificFeaturesCity(map, 'oh-fukushimachiban');
              if (map.getLayer('oh-kitahiroshimachiban')) highlightSpecificFeaturesCity(map, 'oh-kitahiroshimachiban');
              if (map.getLayer('oh-kunitachishi')) highlightSpecificFeaturesCity(map, 'oh-kunitachishi');
              if (map.getLayer('oh-fukuokashichiban')) highlightSpecificFeaturesCity(map, 'oh-fukuokashichiban');
              if (map.getLayer('oh-chibanzu-室蘭市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-室蘭市');
              if (map.getLayer('oh-chibanzu-ニセコ町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-ニセコ町');
              if (map.getLayer('oh-chibanzu-音更町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-音更町');
              if (map.getLayer('oh-chibanzu-鹿角市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-鹿角市');
              if (map.getLayer('oh-chibanzu-舟形町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-舟形町');
              if (map.getLayer('oh-chibanzu-利根町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-利根町');
              if (map.getLayer('oh-chibanzu-小平市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-小平市');
              if (map.getLayer('oh-chibanzu-町田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-町田市');
              if (map.getLayer('oh-chibanzu-静岡市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-静岡市');
              if (map.getLayer('oh-chibanzu-磐田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-磐田市');
              if (map.getLayer('oh-chibanzu-半田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-半田市');
              if (map.getLayer('oh-chibanzu-京都市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-京都市');
              if (map.getLayer('oh-chibanzu-長岡京市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-長岡京市');
              if (map.getLayer('oh-chibanzu-岸和田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-岸和田市');
              if (map.getLayer('oh-chibanzu-泉南市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-泉南市');
              if (map.getLayer('oh-chibanzu-西宮市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-西宮市');
              if (map.getLayer('oh-chibanzu-加古川市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-加古川市');
              if (map.getLayer('oh-chibanzu-佐用町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-佐用町');
              if (map.getLayer('oh-chibanzu-奈良市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-奈良市');
              if (map.getLayer('oh-chibanzu-坂出市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-坂出市');
              if (map.getLayer('oh-chibanzu-善通寺市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-善通寺市');
              if (map.getLayer('oh-chibanzu-長与町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-長与町');
              if (map.getLayer('oh-chibanzu-福島市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-福島市');
              if (map.getLayer('oh-chibanzu-北広島市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-北広島市');
              if (map.getLayer('oh-chibanzu-国立市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-国立市');
              if (map.getLayer('oh-chibanzu-福岡市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-福岡市');
              if (map.getLayer('oh-chibanzu-越谷市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-越谷市');
              if (map.getLayer('oh-chibanzu-福山市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-福山市');
            },100)
          }

          if (params.slj) {
            const mapNames = ['map01', 'map02']
            mapNames.forEach(mapName => {
              params.slj[mapName].forEach(slj => {
                let count = 0;
                // レイヤーを探索して必要な情報を取得する関数
                function traverseLayers(layers, slj) {
                  layers.forEach(layer => {
                    if (layer.nodes) {
                      // 子ノードがある場合は再帰的に処理
                      layer.nodes.forEach(node => {
                        if (node.nodes) {
                          traverseLayers([node], slj); // 再帰処理
                        } else {
                          // 子ノードがない場合の処理
                          if (node.id === slj.id) {
                            slj.label = node.label
                            slj.source = node.source
                            slj.sources = node.sources
                            slj.layers = node.layers
                            slj.attribution = node.attribution
                            slj.info = node.info
                          }
                          count++
                        }
                      });
                    } else {
                      // 子ノードがない場合の処理
                      if (layer.id === slj.id) {
                        slj.label = layer.label
                        slj.source = layer.source
                        slj.sources = layer.sources
                        slj.layers = layer.layers
                        slj.attribution = layer.attribution
                        slj.info = layer.info
                      }
                      count++;
                    }
                  });
                }
                // レイヤーの探索を開始
                const layers = Layers.layers[mapName];
                traverseLayers(layers, slj);
                // 必要であれば処理結果のログを出力
                console.log(`Processed ${count} layers for map: ${mapName}`);
              });
            });
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
                  label: '地理院ベクター・モノクロ',
                  sources: monoSources,
                  layers: monoLayers,
                  attribution: '国土地理院',
                  opacity: 1,
                  visibility: true,
                }
            )
          }
          // console.log(params.slj)
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

          // map.on('dragend', () => {
          //   this.$store.state.osmFire = !this.$store.state.osmFire
          // })
          // map.on('zoomend', () => {
          //   this.$store.state.osmFire = !this.$store.state.osmFire
          // })

          // let previousBounds = null;

          // デバウンス関数
          function debounce(func, delay) {
            let timer;
            return function (...args) {
              clearTimeout(timer);
              timer = setTimeout(() => func.apply(this, args), delay);
            };
          }

          // マップ範囲の変更を処理
          let previousBounds = null;
          let previousZoom = map.getZoom(); // 初期ズームレベルを取得

          const handleBoundsChange = () => {
            const currentBounds = map.getBounds();
            const currentZoom = map.getZoom();

            // ズームイン時は発火しない
            if (currentZoom > previousZoom) {
              console.log('Zoomed in - No action taken');
              previousZoom = currentZoom;
              previousBounds = currentBounds;
              return;
            }

            if (
                !previousBounds ||
                currentBounds.getNorth() > previousBounds.getNorth() ||
                currentBounds.getSouth() < previousBounds.getSouth() ||
                currentBounds.getEast() > previousBounds.getEast() ||
                currentBounds.getWest() < previousBounds.getWest()
            ) {
              // マップの範囲が拡大または移動した場合のみ発火
              console.log('Bounds expanded or moved:', currentBounds);
              this.$store.state.osmFire = !this.$store.state.osmFire;
            }

            // 現在の範囲とズームレベルを保存
            previousBounds = currentBounds;
            previousZoom = currentZoom;
          };

          // デバウンス版の関数を作成（遅延を500msに設定）
          const debouncedHandleBoundsChange = debounce(handleBoundsChange, 500);

          // イベントリスナーにデバウンス関数を適用
          map.on('dragend', debouncedHandleBoundsChange);
          map.on('zoomend', debouncedHandleBoundsChange);




          // let previousBounds = null;
          // map.on('dragend', () => {
          //   const currentBounds = map.getBounds();
          //   if (!previousBounds ||
          //       currentBounds.getNorth() > previousBounds.getNorth() ||
          //       currentBounds.getSouth() < previousBounds.getSouth() ||
          //       currentBounds.getEast() > previousBounds.getEast() ||
          //       currentBounds.getWest() < previousBounds.getWest()) {
          //     // マップの範囲が拡大または移動した場合のみ発火
          //     console.log('Bounds expanded or moved:', currentBounds);
          //     this.$store.state.osmFire = !this.$store.state.osmFire
          //   }
          //   // 現在の範囲を保存
          //   previousBounds = currentBounds;
          // });
          //
          // map.on('zoomend', () => {
          //   const currentBounds = map.getBounds();
          //   if (!previousBounds ||
          //       currentBounds.getNorth() > previousBounds.getNorth() ||
          //       currentBounds.getSouth() < previousBounds.getSouth() ||
          //       currentBounds.getEast() > previousBounds.getEast() ||
          //       currentBounds.getWest() < previousBounds.getWest()) {
          //     // マップの範囲が拡大または移動した場合のみ発火
          //     // console.log('Bounds expanded or moved:', currentBounds);
          //     this.$store.state.osmFire = !this.$store.state.osmFire
          //   }
          //   // 現在の範囲を保存
          //   previousBounds = currentBounds;
          // });


          map.on('move', async () => {
            const center = map.getCenter(); // マップの中心座標を取得
            const lon = center.lng; // 経度
            const lat = center.lat; // 緯度
            // const zoom = Math.round(map.getZoom()); // 現在のズームレベル

            // 標高を取得
            const elevation = await fetchElevation(lon, lat);

            // 標高を画面に表示
            if (elevation !== null) {
              if (elevation <= 4000) {
                // console.log(`画面の中心標高: ${elevation.toFixed(2)}m`)
                this.elevation = `中心の標高: ${elevation.toFixed(2)}m`
              } else {
                this.elevation = ''
              }
            } else {
              this.elevation = ''
            }
          });

          //------------------------------------------------------------------------------------------------------------
          map.on('mousemove', (e) => {
            // クリック可能なすべてのレイヤーからフィーチャーを取得
            const features = map.queryRenderedFeatures(e.point);
            if (features.length) {
              const feature = features[0]; // 最初のフィーチャーのみ取得
              const layerId = feature.layer.id;
              // console.log(layerId)
              if (layerId.indexOf('vector') !== -1) {
                if (map.getCanvas().style.cursor !== 'wait') {
                  map.getCanvas().style.cursor = 'default';
                }
              } else {
                if (map.getCanvas().style.cursor !== 'wait') {
                  map.getCanvas().style.cursor = 'pointer';
                }
              }
            } else {
              if (map.getCanvas().style.cursor !== 'wait') {
                map.getCanvas().style.cursor = 'default';
              }
            }
          });
          //------------------------------------------------------------------------------------------------------------
          // ポップアップ
          map.on('click', (e) => {
            popup(e,map,mapName,this.mapFlg)
          })
          map.on('mousemove', function (e) {
            mouseMoveForPopup(e,map)
          })
          //------------------------------------------------------------------------------------------------------------
          // PLATEAU建物東京都23区
          map.on('mousemove', 'oh-plateau-tokyo23ku-layer', function (e) {
            map.getCanvas().style.cursor = 'pointer'
            map.setPaintProperty(
                'oh-plateau-tokyo23ku-layer',
                'fill-extrusion-color',
                [
                  'case',
                  ['==', ['get', '建物ID'], e.features[0].properties['建物ID']],
                  'rgba(255, 0, 0, 1)', // カーソルが当たったフィーチャーの色
                  [
                    "interpolate",
                    ["linear"],
                    ["get", "measuredHeight"],
                    0, "#d9d9d9",       // 0m: グレー
                    10, "#a6bddb",      // 10m: 明るいブルー
                    30, "#74a9cf",      // 30m: 中間ブルー
                    60, "#2b8cbe",      // 60m: 濃いブルー
                    100, "#045a8d"      // 100m以上: 非常に濃いブルー
                  ]
                ]
            )
          })
          map.on('mouseleave', 'oh-plateau-tokyo23ku-layer', function () {
            map.getCanvas().style.cursor = ''
            map.setPaintProperty(
                'oh-plateau-tokyo23ku-layer',
                'fill-extrusion-color',
                [
                  "interpolate",
                  ["linear"],
                  ["get", "measuredHeight"],
                  0, "#d9d9d9",       // 0m: グレー
                  10, "#a6bddb",      // 10m: 明るいブルー
                  30, "#74a9cf",      // 30m: 中間ブルー
                  60, "#2b8cbe",      // 60m: 濃いブルー
                  100, "#045a8d"      // 100m以上: 非常に濃いブルー
                ]
            )
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

          // -----------------------------------------------------------------------------------------------------------

          // ドラッグ&ドロップ用の要素
          const dropzone = document.getElementById('map00');

          // ドラッグイベントのリスナー追加
          document.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropzone.classList.add('active');
          });

          document.addEventListener('dragleave', (event) => {
            event.preventDefault();
            dropzone.classList.remove('active');
          });


          // ドロップ時の処理 SIMA
          dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropzone.style.backgroundColor = '';

            const files = event.dataTransfer.files;

            if (files.length > 0) {
              const file = files[0];
              const fileName = file.name;
              const fileExtension = fileName.split('.').pop().toLowerCase();

              if (fileExtension === 'sim') {
                this.$store.state.dialogForSima = true
                // const fileInputEvent = { target: { files: [file] } };

                // handleFileUpload(fileInputEvent);
              } else {
                alert('拡張子が.simのファイルのみ対応しています。');
              }
            }
          });

          // ファイルドロップ処理
          document.addEventListener('drop', (event) => {
            event.preventDefault();
            dropzone.classList.remove('active');

            const files = event.dataTransfer.files;
            if (files.length === 0) {
              // alert('ファイルが選択されていません');
              return;
            }

            const file = files[0];
            if (file.type !== 'application/geo+json' && file.type !== 'application/json') {
              // alert('GeoJSONファイルを選択してください');
              return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const geojson = JSON.parse(e.target.result);

                // if (!geojson || !geojson.features) {
                //   throw new Error('無効なGeoJSONデータです');
                // }

                const sourceId = 'user-geojson';
                const pointLayerId = 'user-geojson-points';
                const lineLayerId = 'user-geojson-lines';
                const polygonLayerId = 'user-geojson-polygons';
                const polygonLayerLineId = 'user-geojson-polygons-line';

                    // 既存のレイヤーとソースがある場合は削除
                [pointLayerId, lineLayerId, polygonLayerId].forEach(layer => {
                  if (map.getLayer(layer)) {
                    map.removeLayer(layer);
                  }
                });
                if (map.getSource(sourceId)) {
                  map.removeSource(sourceId);
                }

                // GeoJSONをソースとして追加
                map.addSource(sourceId, {
                  type: 'geojson',
                  data: geojson
                });

                // ポイントレイヤー
                map.addLayer({
                  id: pointLayerId,
                  type: 'circle',
                  source: sourceId,
                  filter: ['==', '$type', 'Point'],
                  paint: {
                    'circle-radius': 6,
                    'circle-color': '#ff5722',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                  }
                });

                // ラインレイヤー
                map.addLayer({
                  id: lineLayerId,
                  type: 'line',
                  source: sourceId,
                  filter: ['==', '$type', 'LineString'],
                  paint: {
                    'line-color': '#4caf50',
                    'line-width': 3
                  }
                });

                // ポリゴンレイヤー
                map.addLayer({
                  id: polygonLayerId,
                  type: 'fill',
                  source: sourceId,
                  filter: ['==', '$type', 'Polygon'],
                  paint: {
                    'fill-color': '#2196f3',
                    'fill-opacity': 0.5,
                    'fill-outline-color': '#000'
                  }
                });

                // ポリゴンレイヤーライン
                map.addLayer({
                  id: polygonLayerLineId,
                  type: 'line',
                  source: sourceId,
                  filter: ['==', '$type', 'Polygon'],
                  paint: {
                    'line-color': '##000',
                    'line-width': '1'
                  }
                });

                // 地図をGeoJSONの範囲にズーム
                const bounds = new maplibregl.LngLatBounds();

                geojson.features.forEach(feature => {
                  const geometry = feature.geometry;
                  if (!geometry) return;

                  switch (geometry.type) {
                    case 'Point':
                      bounds.extend(geometry.coordinates);
                      break;
                    case 'LineString':
                      geometry.coordinates.forEach(coord => bounds.extend(coord));
                      break;
                    case 'Polygon':
                      geometry.coordinates.flat().forEach(coord => bounds.extend(coord));
                      break;
                    case 'MultiPolygon':
                      geometry.coordinates.flat(2).forEach(coord => bounds.extend(coord));
                      break;
                  }
                });

                // boundsが有効か確認
                if (bounds.isEmpty()) {
                  console.warn('有効な座標範囲が見つかりませんでした。');
                  return;
                }

                // fitBoundsを適用
                map.fitBounds(bounds, {
                  padding: 50,
                  animate: true
                });

              } catch (error) {
                console.error('GeoJSONの読み込みに失敗しました:', error);
                alert('無効なGeoJSONファイルです');
              }
            };

            reader.readAsText(file);
          });
          // -----------------------------------------------------------------------------------------------------------
          map.addSource('zones-source', {
            type: 'vector',
            url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/zahyokei/zahyokei.pmtiles',
          });

          map.addLayer({
            id: 'zones-layer',
            type: 'fill',
            source: 'zones-source',
            'source-layer': 'polygon',
            paint: {
              'fill-color': '#0080',
              'fill-opacity': 0
            }
          });

          setTimeout(() => {
            const center = map.getCenter();
            const centerPoint = map.project([center.lng, center.lat]);
            // 画面中心地点でのフィーチャークエリ
            const features = map.queryRenderedFeatures(centerPoint, {
              layers: ['zones-layer']
            });
            if (features.length > 0) {
              const zoneFeature = features[0];
              const zone = zoneFeature.properties.zone;
              this.$store.state.zahyokei = '公共座標' + zone + '系';
              console.log(this.$store.state.zahyokei);
            }
          },1000)
          map.on('moveend', () => {
            const center = map.getCenter();
            const centerPoint = map.project([center.lng, center.lat]);
            // 画面中心地点でのフィーチャークエリ
            const features = map.queryRenderedFeatures(centerPoint, {
              layers: ['zones-layer']
            });
            if (features.length > 0) {
              const zoneFeature = features[0];
              const zone = zoneFeature.properties.zone;
              this.$store.state.zahyokei = '公共座標' + zone + '系';
              console.log(this.$store.state.zahyokei);
            } else {
              console.log('画面中心地点は座標系ゾーンに該当しません。');
              this.$store.state.zahyokei = '';
            }
          });

          // -----------------------------------------------------------------------------------------------------------
          // マップ上でポリゴンをクリックしたときのイベントリスナー
          let highlightCounter = 0;
          map.on('click', 'oh-amx-a-fude', (e) => {
            console.log(this.$store.state.highlightedChibans)
            // this.$store.state.highlightedChibans = new Set()
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['丁目コード']}_${e.features[0].properties['小字コード']}_${e.features[0].properties['地番']}`;
              console.log(targetId);
              console.log(this.$store.state.highlightedChibans)
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeatures(map,'oh-amx-a-fude');
            }
          });
          map.on('click', 'oh-chibanzu2024', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['id']}`;
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-chibanzu2024');
            }
          });
          map.on('click', 'oh-fukushimachiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['X']}_${e.features[0].properties['Y']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
                console.log(this.$store.state.highlightedChibans)
              }
              highlightSpecificFeaturesCity(map,'oh-fukushimachiban');
            }
          });
          map.on('click', 'oh-iwatapolygon', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['SKSCD']}_${e.features[0].properties['AZACD']}_${e.features[0].properties['TXTCD']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-iwatapolygon');
            }
          });
          map.on('click', 'oh-narashichiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['土地key']}_${e.features[0].properties['大字cd']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-narashichiban');
            }
          });
          map.on('click', 'oh-kitahiroshimachiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['Aza']}_${e.features[0].properties['Chiban']}_${e.features[0].properties['Edaban']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-kitahiroshimachiban');
            }
          });
          map.on('click', 'oh-kunitachishi', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['id']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-kunitachishi');
            }
          });
          map.on('click', 'oh-fukuokashichiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['id']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-fukuokashichiban');
            }
          });
        })
        const layers = ['oh-chibanzu-室蘭市', 'oh-chibanzu-ニセコ町', 'oh-chibanzu-音更町',
          'oh-chibanzu-鹿角市', 'oh-chibanzu-舟形町', 'oh-chibanzu-利根町','oh-chibanzu-小平市',
          'oh-chibanzu-町田市','oh-chibanzu-静岡市','oh-chibanzu-磐田市','oh-chibanzu-半田市',
          'oh-chibanzu-京都市','oh-chibanzu-長岡京市','oh-chibanzu-岸和田市','oh-chibanzu-泉南市',
          'oh-chibanzu-西宮市','oh-chibanzu-加古川市','oh-chibanzu-佐用町','oh-chibanzu-奈良市',
          'oh-chibanzu-坂出市','oh-chibanzu-善通寺市','oh-chibanzu-長与町','oh-chibanzu-福島市',
          'oh-chibanzu-北広島市','oh-chibanzu-国立市','oh-chibanzu-福岡市','oh-chibanzu-越谷市',
          'oh-chibanzu-福山市'];
        layers.forEach(layer => {
          map.on('click', layer, (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['id']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                vm.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,layer);
            }
          });
        });

        this.compass = new CompassControl({
          visible: false // ボタンを非表示にする
        })
        map.addControl(this.compass)


        //on load終了----------------------------------------------------------------------------------------------------
      })
    }
  },
  mounted() {
    // this.$store.state.highlightedChibans = new Set()
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
    let urlid = params.get('s')
    if (urlid === 'jIdukg') urlid = '2O65Hr' //以前のリンクを活かす
    if (urlid === 'da0J4l') urlid = 'W8lFo4' //以前のリンクを活かす
    // https://kenzkenz.xsrv.jp/open-hinata3/?s=da0J4l
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
        console.log('変更を検出しました。URLを作成します。')
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
.watch-position {
  position: absolute;
  top: 60px;
  left: 0;
}
.zoom-in {
  position: absolute;
  top: 120px;
  left: 0;
}
.zoom-out {
  position: absolute;
  top: 180px;
  left: 0;
}
.share {
  position: absolute;
  top: 240px;
  left: 0;
}
/*3Dのボタン-------------------------------------------------------------*/
.terrain-btn-expand-div {
  position:absolute;
  bottom: 20px;
  right:10px;
  z-index:2;
  display: none;
}
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
.terrain-btn-close {
  position: absolute;
  top:25px;
  left:25px;
  font-size: x-large;
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

  overflow: hidden;
  touch-action: none;

  -webkit-overflow-scrolling: touch;
  height: 100%;
}
#app {
  height: 100%; /* 親要素が100%の高さを持つ */
}
.maplibregl-popup-content {
  padding: 10px 20px 10px 20px;

}
.maplibregl-popup-close-button{
  font-size: 40px;
}
.popup-html-div {
  max-height: 500px;
  overflow: auto;
}
font {
  pointer-events: none;
}
.pyramid-btn {
  margin-top: 5px;
  height: 20px;
  line-height: 20px;
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
.popup-btn {
  cursor: pointer;
  background-color: rgb(50,101,186);
  color: white;
  padding: 3px 10px 3px 10px;
  border-radius:8px;
}
.maplibregl-popup-content hr {
  margin-top: 10px;
  margin-bottom: 10px;
}
.break-hr {
  border: solid 2px rgb(50,101,186);
}
.layer-label-div {
  color: white;
  background-color: rgb(50,101,186);
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
.tiny-btn {
  font-size: 10px; /* フォントサイズを小さく */
  padding: 2px 6px; /* パディングを小さく */
  min-width: 24px; /* ボタンの最小幅 */
  height: 24px; /* ボタンの高さ */
  line-height: 24px; /* 中央揃え */
  margin-bottom: 10px;
}
.style01 {
  background: linear-gradient(transparent 85%, #ffd700 80%);
}

.carousel {
  position: relative;
  width: 80%;
  /*max-width: 600px;*/
  width: 200px;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}
.carousel-images {
  display: flex;
  transition: transform 0.5s ease-in-out;
}
.carousel-images img {
  display: block;
  width: 200px; /* Ensures consistent width */
  height: auto; /* Maintains aspect ratio */
  flex-shrink: 0;
  object-fit: contain; /* Prevents stretching */
}
.carousel-buttons {
  position: absolute;
  top: 50%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  transform: translateY(-50%);
}
.carousel-button {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 5px;
}
.carousel-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
}
.carousel-buttons.hidden {
  display: none;
}
.carousel-button.disabled {
  background-color: rgba(0, 0, 0, 0.2);
  cursor: not-allowed;
}
.custom-switch {
  height: 34px; /* 全体の高さを調整 */
}
.custom-switch .v-switch__control {
  height: 18px; /* スイッチ部分の高さ */
  width: 32px;  /* スイッチ部分の幅 */
}
.custom-switch .v-switch__thumb {
  height: 18px; /* スイッチの丸部分の高さ */
  width: 18px;  /* スイッチの丸部分の幅 */
}
.v-overlay-container .v-select__content {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  max-height: 300px; /* 必要に応じて調整 */
  touch-action: pan-y !important; /* 縦方向のタッチスクロールを有効化 */
}
.maplibregl-ctrl-compass-heading {
  display: none!important;
}
</style>