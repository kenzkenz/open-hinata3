<script setup>
import { user as user1 } from "@/authState"; // グローバルの認証情報を取得
</script>

<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="myroom-div">
        <v-card>
          <v-card-text :style="mayroomStyle">
            <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">
              <v-tab value="0">SIMA</v-tab>
              <v-tab value="1">URL記憶</v-tab>
              <v-tab value="2">タイル記憶</v-tab>
              <v-tab value="3">地番図</v-tab>
              <v-tab value="4">画像</v-tab>
              <v-tab value="5">kmz</v-tab>
              <v-tab v-if="isAdministrator" value="6">管理者用</v-tab>
            </v-tabs>

            <v-window v-model="tab">
              <v-window-item value="0">
                <v-card>
                  <v-text-field v-model="simaRename" type="text" placeholder="リネーム"></v-text-field>
                  <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="simaRenameBtn">リネーム</v-btn>
                  <div v-for="item in jsonDataSima" :key="item.id" class="data-container" @click="simaClick(item.name,item.url,item.id,item.simatext,item.zahyokei)">
                    <button v-if="!isAll" class="close-btn" @click="removeSima(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="1">
                <v-card>
                  <div style="margin-bottom: 10px;">
                    <v-text-field v-model="urlName" type="text" placeholder="ネーム"></v-text-field>
                    <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="urlSave">URL記憶</v-btn>
                    <v-btn style="margin-top: -10px; margin-bottom: 10px; margin-left: 10px" @click="urlRenameBtn">リネーム</v-btn>
                    <div v-for="item in jsonData" :key="item.id" class="data-container" @click="urlClick(item.name, item.url, item.id)">
                      <button v-if="!isAll" class="close-btn" @click="removeItem(item.id, $event)">×</button>
                      <strong>{{ item.name }}</strong><br>
                      <strong></strong>{{ item.url }}
                    </div>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="2">
                <v-card>
                  <div style="margin-bottom: 10px;">
                    <v-text-field  v-model="tileName" type="text" placeholder="ネーム"></v-text-field>
                    <v-text-field  v-model="tileUrl" type="text" placeholder="タイルURL"></v-text-field>
                    <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="tileSave">地図タイル記憶</v-btn>
                    <div v-for="item in jsonDataTile" :key="item.id" class="data-container" @click="tileClick(item.name,item.url,item.id)">
                      <button v-if="!isAll" class="close-btn" @click="removeItemTile(item.id, $event)">×</button>
                      <strong>{{ item.name }}</strong><br>
                      <strong></strong>{{ item.url }}
                    </div>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="3">
                <v-card>
                  <v-text-field  v-model="pmtilesRename" type="text" placeholder="リネーム"></v-text-field>
                  <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="pmtilesRenameBtn">リネーム</v-btn>
                  <div v-for="item in jsonDataPmtile" :key="item.id" class="data-container" @click="pmtileClick(item.name,item.url,item.id,item.chiban,item.bbox)">
                    <button v-if="!isAll" class="close-btn" @click="removeItemPmtiles(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="4">
                <v-card>
                  <v-text-field v-model="xyztileRename" type="text" placeholder="リネーム"></v-text-field>
                  <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="xyztileRenameBtn">リネーム</v-btn>
                  <div v-for="item in jsonDataxyztile" :key="item.id" class="data-container" @click="xyztileClick(item.name,item.url,item.id,item.bbox,item.transparent)">
                    <v-checkbox
                        v-if="!isAll"
                        class="transparent-chk"
                        v-model="item.transparent"
                        true-value=1
                        false-value=0
                        @change="transparentChk(item.id, item.transparent)"
                        @mousedown.stop
                        @click.stop
                    />
                    <button v-if="!isAll" class="close-btn" @click="removeItemxyztile(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="5">
                <v-card>
                  <v-text-field v-model="kmzRename" type="text" placeholder="リネーム"></v-text-field>
                  <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="kmzRenameBtn">リネーム</v-btn>
                  <div v-for="item in jsonDataKmz" :key="item.id" class="data-container" @click="kmzClick(item.name,item.url,item.id)">
                    <button v-if="!isAll" class="close-btn" @click="removeKmz(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="6">
                <v-card>
<!--                  <v-btn style="margin-bottom: 10px;" @click="isAllBtn">全表示</v-btn>-->
                  <v-switch style="height: 40px;" v-model="isAll" @change="isAllSwitch" label="全表示" color="primary" />

                  <!--                  <v-btn style="margin-bottom: 10px;" @click="iko">移行</v-btn>-->
<!--                  <div v-for="item in jsonDataxyztileAll" :key="item.id" class="data-container" @click="xyztileClick(item.name,item.url,item.id,item.bbox,item.transparent)">-->
<!--                    <strong>{{ item.name }}</strong><br>-->
<!--                  </div>-->
                </v-card>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
    </div>
  </Dialog>
</template>

<script>

import {
  addImageLayer,
  addImageLayerJpg,
  addImageLayerPng,
  addTileLayerForImage,
  geojsonAddLayer, highlightSpecificFeaturesCity, iko,
  simaToGeoJSON, userKmzSet, userPmtileSet, userSimaSet, userTileSet, userXyztileSet
} from "@/js/downLoad";

const getFirebaseUid = async () => {
  if (!user.value) return;

  try {
    // **Firebase の認証トークンを取得**
    const token = await user.value.getIdToken();
    console.log("送信するトークン:", token); // **デバッグ用**

    const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/verify_token.php", {
      method: "POST", // **POST を使う**
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: token }) // **idToken を送信**
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("エラー:", errorData);
      return;
    }
    const data = await response.json();
    console.log("取得した UID:", data.uid);
  } catch (error) {
    console.error("UID 取得エラー:", error);
  }
};

const createUserDirectory = async () => {
  if (!user.value) return;
  try {
    // Firebase 認証トークンを取得
    const token = await user.value.getIdToken();
    // create_directory.php にリクエストを送信
    const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/create_directory.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: token }),
    });

    // レスポンスを取得
    const data = await response.json();

    if (!response.ok) {
      console.error("エラー:", data);
      return;
    }
    // alert("ディレクトリ作成成功")
    console.log("ディレクトリ作成成功:", data);
  } catch (error) {
    console.error("ディレクトリ作成エラー:", error);
  }
};
import {user} from "@/authState";
import axios from "axios"
import maplibregl from 'maplibre-gl'
import {history} from "@/App";
import {extLayer, extSource, konUrls} from "@/js/layers";
import * as Layers from "@/js/layers";
import {kml} from "@tmcw/togeojson";
import JSZip from "jszip";
import store from "@/store";

export default {
  name: 'Dialog-myroom',
  props: ['mapName'],
  components: {
    // MasonryWall,
  },
  data: () => ({
    isAll: false,
    id: '',
    name: '',
    tileRename: '',
    pmtilesRename: '',
    xyztileRename: '',
    kmzRename: '',
    simaRename: '',
    tab: '0',
    tileUrl: '',
    tileName: '',
    urlName: '',
    jsonData: null,
    jsonDataTile: null,
    jsonDataPmtile: null,
    jsonDataVector: null,
    jsonDataxyztile: null,
    jsonDataxyztileAll: null,
    jsonDataKmz: null,
    jsonDataSima: null,
    uid: null,
    images: [],
    email: '',
    password: '',
    nickname: '',
    errorMsg: '',
    konjyakuYear: '1890',
    address: '',
    addLayerDiv: false,
    loginDiv: false,
    signUpDiv: false,
    isDialogVisible: false, // ダイアログの手動制御
    dialogTop: 0, // 初期位置
    dialogLeft: 0, // 初期位置
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    mayroomStyle: {"overflow-y": "auto", "max-height": "530px", "max-width": "600px", "padding-top": "10px"}
  }),
  computed: {
    s_isDialogVisible: {
      get() {
        return this.$store.state.isDialogVisible
      },
      set(value) {
        this.$store.state.isDialogVisible = value
      }
    },
    isAdministrator () {
      return this.s_userId === 'dqyHV8DykbdSVvDXrHc7xweuKT02'
    },
    s_userId () {
      return this.$store.state.userId
    },
    s_isWindow: {
      get() {
        return this.$store.state.isWindow
      },
      set(value) {
        this.$store.state.isWindow = value
        localStorage.setItem('window',value)
      }
    },
    s_resolution: {
      get() {
        return this.$store.state.resolution
      },
      set(value) {
        this.$store.state.resolution = value
        localStorage.setItem('resolution',value)
      }
    },
    s_dialogForLink: {
      get() {
        return this.$store.state.dialogForLink
      },
      set(value) {
        this.$store.state.dialogForLink = value
      }
    },
    s_dialogForLogin: {
      get() {
        return this.$store.state.dialogForLogin
      },
      set(value) {
        this.$store.state.dialogForLogin = value
      }
    },
    s_dialogForImage: {
      get() {
        return this.$store.state.dialogForImage
      },
      set(value) {
        this.$store.state.dialogForImage = value
      }
    },
    s_extLayerName: {
      get() {
        return this.$store.state.extLayerName
      },
      set(value) {
        this.$store.state.extLayerName = value
      }
    },
    s_extLayer: {
      get() {
        return this.$store.state.extLayer
      },
      set(value) {
        this.$store.state.extLayer = value
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
    s_terrainLevel: {
      get() {
        return this.$store.state.terrainLevel
      },
      set(value) {
        this.$store.state.terrainLevel = value
      }
    },
    s_fetchImagesFire : {
      get() {
        return this.$store.state.fetchImagesFire
      },
      set(value) {
        this.$store.state.fetchImagesFire = value
      }
    },
    s_dialogs () {
      return this.$store.state.dialogs.myroomDialog
    },
    s_isClickPointsLayer: {
      get() {
        return this.$store.state.isClickPointsLayer
      },
      set(value) {
        this.$store.state.isClickPointsLayer = value
      }
    },
    s_isPitch: {
      get() {
        return this.$store.state.isPitch
      },
      set(value) {
        this.$store.state.isPitch = value
      }
    },
  },
  methods: {
    isAllSwitch () {
      this.s_fetchImagesFire = !this.s_fetchImagesFire
    },
    isAllBtn () {
      this.isAll = !this.isAll
    },
    iko () {
      if (!confirm("実行しますか？")) {
        return
      }
      iko()
    },
    urlRenameBtn () {
      const vm = this
      if (!this.urlName) return
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userUrlUpdate.php',{
        params: {
          id: this.id,
          name: this.urlName
        }
      }).then(function (response) {
        console.log(response)
        vm.urlSelect(vm.$store.state.userId)
      })
    },
    simaRenameBtn () {
      const vm = this
      if (!this.simaRename) return
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaUpdate.php',{
        params: {
          id: this.id,
          name: this.simaRename
        }
      }).then(function (response) {
        console.log(response)
        vm.simaSelect(vm.$store.state.userId)
      })
    },
    kmzRenameBtn () {
      const vm = this
      if (!this.kmzRename) return
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userKmzUpdate.php',{
        params: {
          id: this.id,
          name: this.kmzRename
        }
      }).then(function (response) {
        console.log(response)
        vm.kmzSelect(vm.$store.state.userId)
      })
    },
    xyztileRenameBtn () {
      const vm = this
      if (!this.xyztileRename) return
      // alert(this.id + '/' + this.xyztileRename)
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileUpdate.php',{
        params: {
          id: this.id,
          name: this.xyztileRename
        }
      }).then(function (response) {
        console.log(response)
        vm.xyztileSelect(vm.$store.state.userId)
      })
    },
    pmtilesRenameBtn () {
      const vm = this
      if (!this.pmtilesRename) return
      // alert(this.id + '/' + this.pmtilesRename)
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesUpdate.php',{
        params: {
          id: this.id,
          name: this.pmtilesRename
        }
      }).then(function (response) {
        console.log(response)
        vm.pmtileSelect(vm.$store.state.userId)
      })
    },
    changeVisible () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map01
      const visibility = this.s_isClickPointsLayer ? "visible" : "none";
      map01.setLayoutProperty("click-points-layer", "visibility", visibility);
      map02.setLayoutProperty("click-points-layer", "visibility", visibility);
    },
    simaClick (name,url,id,simaText,zahyokei) {
      store.state.loading2 = true
      store.state.loadingMessage = 'SIMA読み込み中です。'
      const vm = this
      this.simaRename = name
      this.id = id
      this.name = name
      vm.s_selectedLayers.map01 = vm.s_selectedLayers.map01.filter(layer => layer.id !== 'oh-sima-' + id + '-' + name + '-layer')
      vm.s_selectedLayers.map02 = vm.s_selectedLayers.map02.filter(layer => layer.id !== 'oh-sima-' + id + '-' + name + '-layer')
      async function aaa() {
        const map01 = store.state.selectedLayers.map01
        const map02 = store.state.selectedLayers.map02
        const maps = [map01, map02]
        const id = vm.id
        const sourceAndLayers = await userSimaSet(name, url, id, zahyokei, simaText)
        console.log(sourceAndLayers)
        store.state.geojsonSources.push({
          sourceId: sourceAndLayers.source.id,
          source: sourceAndLayers.source
        })
        console.log(store.state.geojsonSources)
        maps.forEach(map => {
          map.unshift(
              {
                id: 'oh-sima-' + id + '-' + name + '-layer',
                label: name,
                source: sourceAndLayers.source.id,
                layers: sourceAndLayers.layers,
                opacity: 1,
                visibility: true,
              }
          );
        })
        const bounds = new maplibregl.LngLatBounds();
        sourceAndLayers.geojson.features.forEach(feature => {
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
        vm.$store.state.map01.fitBounds(bounds, {
          padding: 50,
          animate: false
        });
        let opacity
        if (vm.$store.state.simaTextForUser) {
          opacity = JSON.parse(vm.$store.state.simaTextForUser).opacity
        } else {
          opacity = 0
        }
        store.state.simaTextForUser = JSON.stringify({
          text: simaText,
          opacity: opacity
        })
        store.state.snackbar = true
        store.state.loading2 = false
      }
      aaa()
    },
    kmzClick (name,url,id) {
      store.state.loading2 = true
      store.state.loadingMessage = 'KMZ読み込み中です。'
      const vm = this
      this.kmzRename = name
      this.id = id
      this.name = name
      vm.s_selectedLayers.map01 = vm.s_selectedLayers.map01.filter(layer => layer.id !== 'oh-kmz-' + id + '-' + name + '-layer')
      vm.s_selectedLayers.map02 = vm.s_selectedLayers.map02.filter(layer => layer.id !== 'oh-kmz-' + id + '-' + name + '-layer')
      async function aaa() {
        const map01 = store.state.selectedLayers.map01
        const map02 = store.state.selectedLayers.map02
        const maps = [map01, map02]
        const id = vm.id
        const sourceAndLayers = await userKmzSet(name, url, id)
        console.log(sourceAndLayers)
        store.state.geojsonSources.push({
          sourceId: sourceAndLayers.source.id,
          source: sourceAndLayers.source
        })
        console.log(store.state.geojsonSources)
        maps.forEach(map => {
          map.unshift(
              {
                id: 'oh-kmz-' + id + '-' + name + '-layer',
                label: name,
                source: sourceAndLayers.source.id,
                layers: sourceAndLayers.layers,
                opacity: 1,
                visibility: true,
              }
          );
        })
        try {
          const bounds = new maplibregl.LngLatBounds();
          sourceAndLayers.geojson.features.forEach(feature => {
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
          vm.$store.state.map01.fitBounds(bounds, {
            padding: 50,
            animate: false
          });
        } catch (e) {
          console.log(e)
        }
        store.state.loading2 = false
      }
      aaa()
    },
    xyztileClick (name,url,id,bbox,transparent) {
      this.xyztileRename = name
      this.id = id
      this.name = name
      userXyztileSet(name,url,id,JSON.parse(bbox),JSON.parse(transparent))
    },
    pmtileClick (name,url,id, chiban, bbox) {
      this.pmtilesRename = name
      this.id = id
      this.name = name
      userPmtileSet(name,url,id, chiban, JSON.parse(bbox))
    },
    tileClick (name,url,id) {
      userTileSet(name,url,id)
    },
    urlClick (name,url,id) {
      this.urlName = name
      this.id = id
      this.name = name
      async function fetchFile(url) {
        try {
          // Fetchリクエストでファイルを取得
          const response = await fetch(url);
          // レスポンスが成功したか確認
          if (!response.ok) {
            throw new Error(`HTTPエラー! ステータス: ${response.status}`);
          }
          // Blobとしてレスポンスを取得
          const blob = await response.blob();
          // BlobをFileオブジェクトに変換
          const file = new File([blob], "downloaded_file", { type: blob.type });
          console.log("Fileオブジェクトが作成されました:", file);
          return file;
        } catch (error) {
          console.error("ファイルの取得中にエラーが発生しました:", error);
        }
      }
      //-------------------------------------------------------------------------------------
      const vm = this
      const map = this.$store.state.map01
      const urlid = new URL(url).searchParams.get('s')
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrlSelect.php',{
        params: {
          urlid: urlid
        }
      }).then(function (response) {

        // 現在のURLを取得
        let url = new URL(window.location.href);

        // URLSearchParamsを使ってクエリパラメーターを更新
        url.searchParams.set('s', urlid);  // 'param1'の値を'newValue'に変更

        // 新しいURLをアドレスバーに反映
        window.history.pushState({}, '', url);

        console.log(response.data)
        const params = new URL('https://dummy/&' + response.data).searchParams
        const lng = parseFloat(params.get('lng'))
        const lat = parseFloat(params.get('lat'))
        const zoom = parseFloat(params.get('zoom'))
        const split = params.get('split')
        const pitch = parseFloat(params.get('pitch'))// 以前のリンクをいかすため---------------------------------
        const pitch01 = parseFloat(params.get('pitch01'))
        const pitch02 = parseFloat(params.get('pitch02'))
        const bearing = parseFloat(params.get('bearing'))
        const terrainLevel = parseFloat(params.get('terrainLevel'))
        const chibans = params.get('chibans')
        const simaText = params.get('simatext')
        const image = params.get('image')
        const extLayer = params.get('extlayer')
        // let kmlText = params.get('kmltext')
        const geojsonText = params.get('geojsontext')
        // const dxfText = params.get('dxftext')
        const gpxText = params.get('gpxtext')
        const vector0 = params.get('vector')

        map.jumpTo({
          center: [lng, lat],
          zoom: zoom
        });

        // map.flyTo({
        //   center: [lng, lat],
        //   zoom: zoom,
        //   speed: 1.2,
        //   curve: 1.42,    // アニメーションの曲線効果（オプション）
        //   essential: true
        // });

        if (split === 'true') {
          vm.$store.state.map2Flg = true
        } else {
          vm.$store.state.map2Flg = false
        }
        vm.$store.state.simaText = simaText
        if (simaText) {
          const simaData = JSON.parse(simaText).text
          const simaZahyokei = JSON.parse(simaText).zahyokei
          const simaOpacity = JSON.parse(simaText).opacity
          simaToGeoJSON(simaData, map, simaZahyokei, false)
        }

        if (vector0 && vector0 != '""') {
          const uploadVector = JSON.parse(JSON.parse(vector0))
          vm.$store.state.uploadedVector = JSON.parse(vector0)
          const vector = uploadVector.image
          const uid = uploadVector.uid
          const vectorUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + uid + '/' + vector
          const extension = vectorUrl.split('.').pop();
          switch (extension) {
            case 'kmz':
              Promise.all([fetchFile(vectorUrl)]).then(files => {
                async function load () {
                  const zip = await JSZip.loadAsync(files[0]);
                  const kmlFile = Object.keys(zip.files).find((name) => name.endsWith('.kml'));
                  const kmlText = await zip.files[kmlFile].async('text');
                  const parser = new DOMParser();
                  const kmlData = parser.parseFromString(kmlText, 'application/xml');
                  const geojson = kml(kmlData);
                  geojsonAddLayer(map, geojson, true, 'kml')
                }
                load()
              })
              break
          }
        }

        async function fetchJson(jsonUrl) {
          try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
          } catch (error) {
            console.error("Error fetching JSON:", error);
          }
        }

        if (image && image != '""') {
          const uploadImage = JSON.parse(JSON.parse(image))
          vm.$store.state.uploadedImage = JSON.parse(image)
          console.log(vm.$store.state.uploadedImage)
          const image0 = uploadImage.image
          const code = uploadImage.code
          const uid = uploadImage.uid
          const worldFile = uploadImage.worldFile
          const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + uid + '/' + image0
          const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + uid + '/' + worldFile
          const extension = imageUrl.split('.').pop();
          const tile = uploadImage.tile
          // alert(tile)
          const match = tile.match(/tiles\/(.*?)\/\{z\}\//);
          const dir0 = match[1].split('/')[0]
          const dir1 = match[1].split('/')[1]
          const tileUrl = 'https://kenzkenz.duckdns.org/tiles/' + dir0 + '/' + dir1 + '/{z}/{x}/{y}.png'
          const jsonUrl = 'https://kenzkenz.duckdns.org/tiles/' + dir0 + '/' + dir1 + '/layer.json'
          fetchJson(jsonUrl).then(jsonData => {
            if (jsonData) {
              addTileLayerForImage(tileUrl,jsonData,false)
            }
          });
          switch (extension) {
            case 'tif':
              if (worldFileUrl) {
                Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                  const image = files[0]
                  const worldFile = files[1]
                  addImageLayer(image, worldFile, code, false)
                })
              } else {
                Promise.all([fetchFile(imageUrl)]).then(files => {
                  const image = files[0]
                  addImageLayer(image, null, code, false)
                })
              }
              break
            case 'jpg':
              Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                const image = files[0]
                const worldFile = files[1]
                addImageLayerJpg(image, worldFile, code, false)
              })
              break
            case 'png':
              Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                const image = files[0]
                const worldFile = files[1]
                addImageLayerPng(image, worldFile, code, false)
              })
              break
          }
        }
        // 謎の現象を回避するため正規表現でKMLを取得する。
        let match = response.data.match(/kmltext=(.*?)&geojson/s);
        const kmlText = match ? match[1] : null;
        if (kmlText) vm.$store.state.kmlText = kmlText

        match = response.data.match(/dxftext=(.*?)&/s);
        let dxfText = match ? match[1] : null;
        dxfText = JSON.parse(dxfText)
        const zahyokei = dxfText.zahyokei
        vm.$store.state.zahyokei = zahyokei
        if (dxfText) vm.$store.state.dxfText = dxfText

        if (geojsonText) vm.$store.state.geojsonText = geojsonText
        if (gpxText) vm.$store.state.gpxText = gpxText

        const slj0 = JSON.parse(params.get('slj'))
        const mapNames = ['map01', 'map02']
        mapNames.forEach(mapName => {
          slj0[mapName].forEach(slj => {
            const layerNames = []
            let count = 0;
            // レイヤーを探索して必要な情報を取得する関数
            // ここを修正するときは一緒にApp.vueも修正すること。
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
                      layerNames.push(node.label)
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
                  layerNames.push(layer.label)
                  count++;
                }
              });
            }
            // レイヤーの探索を開始
            const layers = Layers.layers[mapName];
            traverseLayers(layers, slj);
          });

          let fetchFlg = false
          async function fetchAllUserLayers() {
            const promises = slj0.map01.map(async (v) => {
              console.log(v.id);
              if (v.id.includes('usertile')) {
                fetchFlg = true
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userTileSelectById.php', {
                    params: { id: layerId }
                  });

                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    console.log('取得データ:', response.data);
                    console.log(JSON.stringify(response.data, null, 2));
                    const source = {
                      id: response.data[0].name + '-source',
                      obj: {
                        type: 'raster',
                        tiles: [response.data[0].url]
                      }
                    };

                    const layer = {
                      id: 'oh-' + response.data[0].name + '-layer',
                      type: 'raster',
                      source: response.data[0].name + '-source',
                    };

                    v.sources = [source];
                    v.layers = [layer];
                    v.label = response.data[0].name;

                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }
              // -----------------------------------------------------------------------------------------------------------
              if (v.id.includes('oh-sima-')) {
                fetchFlg = true;
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    const name = response.data[0].name;
                    const id = response.data[0].id;
                    const url = response.data[0].url;
                    const zahyokei = response.data[0].zahyokei;
                    const simaText = response.data[0].simatext;
                    async function aaa() {
                      const sourceAndLayers = await userSimaSet(name, url, id, zahyokei, simaText)
                      store.state.geojsonSources.push({
                        sourceId: sourceAndLayers.source.id,
                        source: sourceAndLayers.source
                      })
                      console.log(sourceAndLayers.layers)
                      v.source = sourceAndLayers.source.id;
                      v.layers = sourceAndLayers.layers;
                      v.label = name;
                      // alert(JSON.parse(vm.$store.state.simaTextForUser).opacity)
                      vm.$store.state.simaTextForUser = JSON.stringify({
                        text: simaText,
                        opacity:JSON.parse(vm.$store.state.simaTextForUser).opacity
                      })
                      vm.s_simaOpacity = JSON.parse(vm.$store.state.simaTextForUser).opacity
                      vm.$store.state.snackbar = true
                    }
                    await aaa()
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }
              // -----------------------------------------------------------------------------------------------------------
              if (v.id.includes('oh-kmz-')) {
                fetchFlg = true;
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userKmzSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    const name = response.data[0].name;
                    const id = response.data[0].id;
                    const url = response.data[0].url;
                    async function aaa() {
                      const sourceAndLayers = await userKmzSet(name, url, id)
                      store.state.geojsonSources.push({
                        sourceId: sourceAndLayers.source.id,
                        source: sourceAndLayers.source
                      })
                      v.source = sourceAndLayers.source.id;
                      v.layers = sourceAndLayers.layers;
                      v.label = name;
                      // alert(sourceAndLayers.layers[0].id)
                    }
                    await aaa()
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }
              // -----------------------------------------------------------------------------------------------------------
              if (v.id.includes('oh-vpstile-')) {
                // alert(v.id)
                fetchFlg = true
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    console.log('取得データ:', response.data);
                    console.log(JSON.stringify(response.data, null, 2));

                    const name = response.data[0].name
                    const id = response.data[0].id
                    const url = response.data[0].url
                    const bbox = JSON.parse(response.data[0].bbox)
                    const bounds = [bbox[0], bbox[1], bbox[2], bbox[3]]
                    console.log(bbox)
                    const source = {
                      id: 'oh-vpstile-' + id + '-' + name + '-source',obj: {
                        type: 'raster',
                        tiles: ['transparentBlack://' +url],
                        bounds: bounds,
                        maxzoom: 26,
                      }
                    };
                    const layer = {
                      id: 'oh-vpstile-' + id + '-' + name + '-layer',
                      type: 'raster',
                      source: 'oh-vpstile-' + id + '-' + name  + '-source',
                    }
                    v.sources = [source];
                    v.layers = [layer];
                    v.label = response.data[0].name;
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }
              // -----------------------------------------------------------------------------------------------------------
              if (v.id.includes('oh-chiban-')) {
                fetchFlg = true
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    console.log('取得データ:', response.data);
                    console.log(JSON.stringify(response.data, null, 2));
                    const name = response.data[0].name
                    const id = response.data[0].id
                    const url = response.data[0].url
                    const chiban = response.data[0].chiban

                    const source = {
                      id: 'oh-chiban-' + id + '-' + name + + '-source',obj: {
                        type: 'vector',
                        url: "pmtiles://" + url
                      }
                    };
                    const polygonLayer = {
                      id: 'oh-chiban-' + id + '-' + name + '-layer',
                      type: 'fill',
                      source: 'oh-chiban-' + id + '-' + name + + '-source',
                      "source-layer": 'oh3',
                      'paint': {
                        'fill-color': 'rgba(0,0,0,0)',
                      },
                    }
                    const lineLayer = {
                      id: 'oh-chibanL-' + name + '-line-layer',
                      source: 'oh-chiban-' + id + '-' + name + + '-source',
                      type: 'line',
                      "source-layer": "oh3",
                      paint: {
                        'line-color': 'navy',
                        'line-width': [
                          'interpolate',
                          ['linear'],
                          ['zoom'],
                          1, 0.1,
                          16, 2
                        ]
                      },
                    }
                    const labelLayer = {
                      id: 'oh-chibanL-' + name + '-label-layer',
                      type: "symbol",
                      source: 'oh-chiban-' + id + '-' + name + + '-source',
                      "source-layer": "oh3",
                      'layout': {
                        'text-field': ['get', chiban],
                        'text-font': ['NotoSansJP-Regular'],
                      },
                      'paint': {
                        'text-color': 'navy',
                        'text-halo-color': 'rgba(255,255,255,1)',
                        'text-halo-width': 1.0,
                      },
                      'minzoom': 17
                    }
                    const pointLayer = {
                      id: 'oh-chibanL-' + name + '-point-layer',
                      type: "circle",
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      filter: ["==", "$type", "Point"],
                      "source-layer": "oh3",        paint: {
                        'circle-color': 'rgba(255,0,0,1)', // 赤色で中心点を強調
                        'circle-radius': 5, // 固定サイズの点
                        'circle-opacity': 1,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#fff'
                      }
                    };
                    v.sources = [source];
                    v.layers = [polygonLayer,lineLayer,labelLayer,pointLayer];
                    v.label = response.data[0].name;
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }
            });
            // すべての fetchUserLayer の実行が完了するのを待つ
            await Promise.all(promises);
            // すべての非同期処理が完了したら次を実行
            console.log(slj0)
            vm.$store.state.selectedLayers = slj0
          }
          fetchAllUserLayers()

          const result = slj0[mapName].find(v => v.id === 'oh-extLayer')
          if (result) {
            extSource.obj.tiles = [vm.$store.state.extLayer]
            result.sources = [extSource]
            result.layers = [extLayer]
            result.label = vm.$store.state.extLayerName
          }
          if (!fetchFlg) vm.$store.state.selectedLayers = slj0
        });

        setTimeout(() => {
          console.log(map.getStyle().layers)
          const targetLayers = map.getStyle().layers
              .filter(layer => layer.id.startsWith('oh-chiban-') && !registeredLayers.has(layer.id))
              .map(layer => layer.id);
          console.log(targetLayers)
          targetLayers.forEach(layer => {
            console.log(`Adding click event to layer: ${layer}`);
            map.on('click', layer, (e) => {
              if (e.features && e.features.length > 0) {
                const targetId = `${e.features[0].properties['oh3id']}`;
                console.log('Clicked ID', targetId);
                if (store.state.highlightedChibans.has(targetId)) {
                  // すでに選択されている場合は解除
                  store.state.highlightedChibans.delete(targetId);
                } else {
                  // 新しいIDを追加
                  store.state.highlightedChibans.add(targetId);
                }
                highlightSpecificFeaturesCity(map, layer);
              }
            });
          });
        },500)
        const registeredLayers = new Set();

      })
    },
    removeItem (id,event) {
      event.stopPropagation();  // バブリングを止める
      if (!confirm("削除しますか？")) {
        return
      }
      const vm = this
      async function deleteUserData(id) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userDbDelete.php', {
            params: { id: id }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            // vm.urlSelect(vm.$store.state.userId)
            vm.jsonData = vm.jsonData.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserData(id)
    },
    transparentChk (id,transparent) {
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileUpdateTransparent.php',{
        params: {
          id: id,
          transparent: transparent
        }
      }).then(function (response) {
        console.log(response)
        // vm.xyztileSelect(vm.$store.state.userId)
      })
    },
    removeSima (id,url2,event) {
      event.stopPropagation();  // バブリングを止める
      if (!confirm("削除しますか？")) {
        return
      }
      const vm = this
      console.log(url2)
      async function deleteUserSima(url2) {
        try {
          const response = await axios.post('https://kenzkenz.duckdns.org/myphp/sima_unlink.php', {
            url2: url2
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
          }
        } catch (error) {
          console.error('リクエストエラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserSima(url2)

      async function deleteUserData(id) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaDelete.php', {
            params: { id: id }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            vm.jsonDataSima = vm.jsonDataSima.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('通信エラー2:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserData(id)
    },
    removeKmz (id,url2,event) {
      event.stopPropagation();  // バブリングを止める
      if (!confirm("削除しますか？")) {
        return
      }
      const vm = this
      console.log(url2)
      async function deleteUserKmz(url2) {
        try {
          const response = await axios.post('https://kenzkenz.duckdns.org/myphp/kmz_unlink.php', {
            url2: url2
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
          }
        } catch (error) {
          console.error('リクエストエラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserKmz(url2)

      async function deleteUserData(id) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userKmzDelete.php', {
            params: { id: id }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            vm.jsonDataKmz = vm.jsonDataKmz.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('通信エラー2:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserData(id)
    },
    removeItemxyztile  (id,url2,event) {
      event.stopPropagation();  // バブリングを止める
      if (!confirm("削除しますか？")) {
        return
      }
      const vm = this
      console.log(url2)
      async function deleteUserXyztile(url2) {
        try {
          const response = await axios.post('https://kenzkenz.duckdns.org/myphp/xyztile_unlink.php', {
            url2: url2
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
          }
        } catch (error) {
          console.error('リクエストエラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserXyztile(url2)

      async function deleteUserData(id) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileDelete.php', {
            params: { id: id }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            vm.jsonDataxyztile = vm.jsonDataxyztile.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('通信エラー2:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserData(id)
    },
    removeItemPmtiles (id,url2,event) {
      event.stopPropagation();  // バブリングを止める
      if (!confirm("削除しますか？")) {
        return
      }
      const vm = this
      console.log(url2)
      async function deleteUserPmtiles(url2) {
        try {
          const response = await axios.post('https://kenzkenz.duckdns.org/myphp/pmtiles_unlink.php', {
            url2: url2
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            // vm.jsonDataPmtile = vm.jsonDataPmtile.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('リクエストエラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserPmtiles(url2)

      async function deleteUserData(id) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtileDelete.php', {
            params: { id: id }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            vm.jsonDataPmtile = vm.jsonDataPmtile.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('通信エラー2:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserData(id)
    },
    removeItemTile (id,event) {
      event.stopPropagation();  // バブリングを止める
      if (!confirm("削除しますか？")) {
        return
      }
      const vm = this
      async function deleteUserData(id) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userTileDelete.php', {
            params: { id: id }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            // vm.urlSelect(vm.$store.state.userId)
            vm.jsonDataTile = vm.jsonDataTile.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      deleteUserData(id)
    },
    urlSelect (uid) {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userDbSelect.php', {
            params: { uid: uid, isAll: vm.isAll }
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonData = response.data
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      fetchUserData(uid)
    },
    simaSelect (uid) {
      const vm = this
      // alert(vm.isAll)
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaSelect.php', {
            params: { uid: uid, isAll: vm.isAll}
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataSima = response.data.result
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      fetchUserData(uid)
    },
    kmzSelect (uid) {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userKmzSelect.php', {
            params: { uid: uid, isAll: vm.isAll }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataKmz = response.data.result
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      fetchUserData(uid)
    },
    xyztileSelectAll (uid) {
      // alert(uid)
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileSelectAll.php', {
            params: { uid: uid }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataxyztileAll = response.data.result
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      fetchUserData(uid)
    },
    xyztileSelect (uid) {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileSelect.php', {
            params: { uid: uid, isAll: vm.isAll }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataxyztile = response.data.result
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      fetchUserData(uid)
    },
    pmtileSelect (uid) {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtileSelect.php', {
            params: { uid: uid, isAll: vm.isAll }
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataPmtile = response.data
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      fetchUserData(uid)
    },
    tileSelect (uid) {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userTileSelect.php', {
            params: { uid: uid, isAll: vm.isAll }
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('取得データ:', response.data);
            console.log(JSON.stringify(response.data, null, 2))
            // alert(`取得成功！\nデータ: ${JSON.stringify(response.data, null, 2)}`);
            vm.jsonDataTile = response.data
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      fetchUserData(uid)
    },
    tileSave () {
      if (!this.tileName || !this.tileUrl) {
        alert('ネーム、タイルURLを記入してください。')
        return
      }
      const vm = this
      async function insertUserData(uid, name, url) {
        try {
          const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userTileInsert.php', new URLSearchParams({
            uid:uid,
            name: name,
            url: url
          }));
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('登録成功:', response.data);
            // alert(`登録成功！\nid: ${response.data.id}\nuid: ${response.data.uid}\nName: ${response.data.name}\nURL: ${response.data.url}`);
            vm.tileSelect(vm.$store.state.userId)
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      insertUserData(this.$store.state.userId,this.tileName,this.tileUrl)
    },
    urlSave () {
      if (!this.urlName) {
        alert('ネームを記入してください。')
        return
      }
      const vm = this
      async function insertUserData(uid, name, url) {
        try {
          const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userDbInsert.php', new URLSearchParams({
            uid:uid,
            name: name,
            url: url
          }));
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('登録成功:', response.data);
            // alert(`登録成功！\nid: ${response.data.id}\nuid: ${response.data.uid}\nName: ${response.data.name}\nURL: ${response.data.url}`);
            vm.urlSelect(vm.$store.state.userId)
          }
        } catch (error) {
          console.error('通信エラー:', error);
          alert('通信エラーが発生しました');
        }
      }
      insertUserData(this.$store.state.userId,this.urlName,window.location.href)
    },
    async fetchImages() {
      const uid = this.uid;
      const url = `https://kenzkenz.duckdns.org/myphp/list.php?dir=/var/www/html/public_html/uploads/${uid}`;
      console.log(url);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const imageList = await response.json();
        this.images = imageList.map(file => `https://kenzkenz.duckdns.org/uploads/${uid}/${file}`);
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    },
  },
  watch: {
    s_dialogForLink () {
      this.openDialog();
      try {
        document.querySelector('.v-overlay').style.display = 'none'
      } catch (e) {
        console.log(e)
      }
      this.urlSelect(this.$store.state.userId)
      this.tileSelect(this.$store.state.userId)
      this.pmtileSelect(this.$store.state.userId)
      this.xyztileSelect(this.$store.state.userId)
      this.kmzSelect(this.$store.state.userId)
      this.simaSelect(this.$store.state.userId)
      this.xyztileSelectAll()
    },
    s_fetchImagesFire () {
      this.fetchImages()
      this.urlSelect(this.$store.state.userId)
      this.tileSelect(this.$store.state.userId)
      this.pmtileSelect(this.$store.state.userId)
      this.xyztileSelect(this.$store.state.userId)
      this.kmzSelect(this.$store.state.userId)
      this.simaSelect(this.$store.state.userId)
      this.xyztileSelectAll()
    }
  },
  mounted() {
    document.querySelector('#drag-handle-myroomDialog-map01').innerHTML = '<span style="font-size: large;">my room</span>'
    // -------------------------------------------------------------------
    let maxHeight
    if (window.innerWidth <= 500) {
      maxHeight = (window.innerHeight) + 'px'
    } else {
      maxHeight = (window.innerHeight - 150) + 'px'
    }
    this.mayroomStyle["max-height"] = maxHeight
    // 非同期で user の UID を監視
    // -------------------------------------------------------------------
    const checkUser = setInterval(() => {
      if (user && user._rawValue && user._rawValue.uid) {
        this.uid = user._rawValue.uid;
        this.$store.state.userId = user._rawValue.uid
        clearInterval(checkUser); // UIDを取得できたら監視を停止
        this.fetchImages(this.uid); // UIDを取得した後に fetchImages を実行
        this.urlSelect(this.uid)
        this.tileSelect(this.uid)
        this.pmtileSelect(this.uid)
        this.xyztileSelect(this.uid)
        this.kmzSelect(this.uid)
        this.simaSelect(this.uid)
        this.xyztileSelectAll()
      }
    }, 5);
  }
}
</script>
<style scoped>
.menu-div {
  height: auto;
  margin: 10px;
  overflow: auto;
  user-select: text;
  font-size: larger;
  color: black;
  background-color: white;
}
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.image-container {
  width: 105px;
  height: 105px;
  overflow: hidden;
  border-radius: 8px;
  position: relative;
  display: inline-block;
}
.gallery-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s ease;
}
.gallery-image:hover {
  transform: scale(1.05);
}
.close-button {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.data-container {
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  position: relative;
  cursor: pointer;
  background-color: rgba(132,163,213,0.3);
}
.data-container:hover {
  background-color: #f0f8ff;
}
.transparent-chk {
  position: absolute;
  top: -15px;
  right: 20px;
  color: rgb(50,101,186);
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 12px;
}
.close-btn {
  position: absolute;
  top: -10px;
  right: 10px;
  color: black;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 30px;
}
.scrollable-dialog {
  overflow-y: auto !important;
  touch-action: auto !important;
}
.custom-tabs {
  min-width: auto;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 10px;
}

.custom-tabs .v-tab {
  min-width: 60px; /* タブの最小幅を狭く */
  padding: 5px 8px; /* 余白を小さく */
  font-size: 14px; /* フォントサイズを小さく */
}
</style>

