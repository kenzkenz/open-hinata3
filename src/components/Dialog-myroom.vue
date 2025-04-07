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
              <v-tab value="11" v-if="s_currentGroupName">{{s_currentGroupName}}</v-tab>
              <v-tab value="2">タイル記憶</v-tab>
              <v-tab @click="myChibanzu" value="3">地番図</v-tab>
              <v-tab value="31">公開地番図</v-tab>
              <v-tab @click="kenzChibanzu" v-if="isOh3Team" value="32">kenz地番図</v-tab>
              <v-tab value="4">画像</v-tab>
              <v-tab value="5">kmz</v-tab>
              <v-tab value="6">復帰</v-tab>
              <v-tab v-if="isAdministrator" value="7">管理者用</v-tab>
            </v-tabs>

            <v-window v-model="tab">
              <v-window-item value="0">
                <v-card>
                  <v-text-field v-model="simaRename" type="text" placeholder="リネームまたは検索"></v-text-field>
                  <v-btn v-if="!isAll" style="margin-top: -10px;margin-bottom: 10px" @click="simaRenameBtn">リネーム</v-btn>
                  <v-btn style="margin-top: -10px;margin-bottom: 10px;margin-left: 10px;" @click="simaSerchBtn">検索</v-btn>
                  <div v-for="item in jsonDataSima" :key="item.id" class="data-container" @click="simaClick(item.name,item.url,item.id,item.simatext,item.zahyokei)">
                    <button v-if="!isAll" class="close-btn" @click="removeSima(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="11">
                <v-card>
                  <div style="margin-bottom: 10px;">
                    <v-text-field v-model="layerName" type="text" placeholder="レイヤーネームまたは検索"></v-text-field>
                    <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="addLayer">レイヤー追加</v-btn>
                    <v-btn style="margin-top: -10px; margin-bottom: 10px; margin-left: 10px" @click="layerRenameBtn">リネーム</v-btn>
                    <v-btn style="margin-top: -10px;margin-bottom: 10px;margin-left: 10px;" @click="layerSerchBtn">検索</v-btn>
                    <div v-for="item in s_currentGroupLayers" :key="item.id" class="data-container" @click="layerSet(item.name,item.id)">
                      <button class="close-btn" @click="deleteLayer(item.id)">×</button>
                      <strong>{{ item.name }}</strong>
                    </div>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="1">
                <v-card>
                  <div style="margin-bottom: 10px;">
                    <v-text-field v-model="urlName" type="text" placeholder="ネーム"></v-text-field>
                    <v-btn v-if="!isAll" style="margin-top: -10px;margin-bottom: 10px" @click="urlSave">URL記憶</v-btn>
                    <v-btn v-if="!isAll" style="margin-top: -10px; margin-bottom: 10px; margin-left: 10px" @click="urlRenameBtn">リネーム</v-btn>
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
                    <v-btn v-if="!isAll" style="margin-top: -10px;margin-bottom: 10px" @click="tileSave">地図タイル記憶</v-btn>
                    <v-btn v-if="!isAll" style="margin-top: -10px;margin-bottom: 10px; margin-left: 10px;" @click="scrapeLinks">微地形表現図追加</v-btn>
                    <span style="margin-left: 5px;">
                      <a href="https://forestgeo.info/%e5%be%ae%e5%9c%b0%e5%bd%a2%e8%a1%a8%e7%8f%be%e5%9b%b3%e3%83%9e%e3%83%83%e3%83%97%e3%82%bf%e3%82%a4%e3%83%ab%e4%b8%80%e8%a6%a7/" target="_blank">微地形表現図</a>
                    </span>
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
                  <v-row>
                    <v-col cols=5 class="px-1">
                      <v-text-field dense v-model="pmtilesRename" type="text" placeholder="地番図名"></v-text-field>
                    </v-col>
                    <v-col cols="3" class="px-1">
                      <v-select
                          v-model="selectedPrefCode"
                          :items="prefItems"
                          item-title="prefName"
                          item-value="prefCode"
                          label="都道府県を選択してください"
                          outlined
                      ></v-select>
                    </v-col>
                    <v-col cols="4" class="px-1">
                      <v-select
                          v-model="selectedCityCode"
                          :items="cityItems"
                          item-title="cityName"
                          item-value="cityCode"
                          label="市区町村名を選択してください"
                          outlined
                      ></v-select>
                    </v-col>
                  </v-row>
                  <v-btn v-if="!isAll" style="margin-top: -10px;margin-bottom: 10px" @click="pmtilesRenameBtn">リネーム</v-btn>
                  <div style="height: 20px">
                    <p v-if="!isAll && isOh3Team" style="position: absolute;right:30px;">公開</p>
                  </div>
                  <div v-for="item in jsonDataPmtile" :key="item.id" class="data-container" @click="pmtileClick(item.name,item.url,item.id,item.chiban,item.bbox,item.length,item.prefcode,item.citycode)">
                    <v-checkbox
                        v-if="!isAll"
                        class="transparent-chk"
                        v-model="item.public"
                        true-value=1
                        false-value=0
                        @change="publicChk(item.id, item.public)"
                        @mousedown.stop
                        @click.stop
                    />
                    <button v-if="!isAll" class="close-btn" @click="removeItemPmtiles(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="31">
                <v-card>
                  <v-text-field v-model="pmtilesSerch" type="text" placeholder="検索"></v-text-field>
                  <v-btn style="margin-top: -10px;margin-bottom: 10px;margin-left: 0px;" @click="pmtilesSerchBtn">検索</v-btn>
                  <div style="margin-left: 0px;margin-bottom:10px;font-size: small;">
                    ユーザーが公開した地番図です。既にオープンデータ化されているものは含まれません。
                  </div>
                  <div v-for="item in jsonDataPmtilePubilc" :key="item.id" class="data-container" @click="pmtileClick(item.name,item.url,item.id,item.chiban,item.bbox,item.length,item.prefcode,item.citycode)">
<!--                    <v-checkbox-->
<!--                        v-if="!isAll"-->
<!--                        class="transparent-chk"-->
<!--                        v-model="item.public"-->
<!--                        true-value=1-->
<!--                        false-value=0-->
<!--                        @change="publicChk(item.id, item.public)"-->
<!--                        @mousedown.stop-->
<!--                        @click.stop-->
<!--                    />-->
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="32">
                <v-card>
                  <div style="margin-left: 0px;margin-bottom:10px;font-size: small;">
                    kenzkenzが持つ地番図です。既にオープンデータ化されているものは含まれません。
                  </div>
                  <div v-for="item in jsonDataPmtile" :key="item.id" class="data-container" @click="pmtileClick(item.name,item.url,item.id,item.chiban,item.bbox,item.length,item.prefcode,item.citycode)">
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="4">
                <v-card>
                  <v-text-field v-model="xyztileRename" type="text" placeholder="リネーム"></v-text-field>
                  <v-btn v-if="!isAll" style="margin-top: -10px;margin-bottom: 10px" @click="xyztileRenameBtn">リネーム</v-btn>
                  <div style="height: 20px">
                    <p v-if="!isAll && isOh3Team" style="position: absolute;right:30px;">透過</p>
                  </div>
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
                  <v-btn v-if="!isAll" style="margin-top: -10px;margin-bottom: 10px" @click="kmzRenameBtn">リネーム</v-btn>
                  <div v-for="item in jsonDataKmz" :key="item.id" class="data-container" @click="kmzClick(item.name,item.url,item.id)">
                    <button v-if="!isAll" class="close-btn" @click="removeKmz(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="6">
                <v-card>
                  <p style="margin-bottom: 10px;">各デバイスの最後に開いた画面に復帰します。ただいま試験運用中です。</p>
                  <v-btn style="margin-bottom: 10px; width: 180px;" @click="device('Windows')">Windowsでの最後</v-btn>
                  <v-btn style="margin-left: 10px;margin-bottom: 10px; width: 180px" @click="device('Macintosh')">Macでの最後</v-btn><br>

                  <v-btn style="margin-bottom: 10px; width: 180px" @click="device('Android')">Androidでの最後</v-btn>
                  <v-btn style="margin-left: 10px;margin-bottom: 10px; width: 180px" @click="device('iPhone')">iPhoneでの最後</v-btn>

                  <p style="margin-top:10px;margin-bottom: 10px;">全デバイスの履歴です。クリックすると復帰します。1000行までです。</p>
                  <v-btn style="margin-left: 0px;margin-bottom: 10px;" class="tiny-btn" @click="reload">再読み込み</v-btn>
<!--                  <div v-for="item in jsonDataHistory" :key="item.id" class="data-container" @click="historyClick(item.name,item.url,item.id)">-->
                  <div
                      v-for="item in filteredHistory"
                      :key="item.id"
                      class="data-container"
                      @click="historyClick(item.name, item.url, item.id)"
                  >
<!--                    <strong :style="item.event.includes('autosave-first') ? 'color: red;' : ''">-->
<!--                      {{ item.date + ' / ' + detectDevice(item.ua) + ' / ' + item.event + item.thumbnail }}-->
<!--                    </strong><br>-->
                    <strong v-html="formatItem(item)" :style="item.event.includes('autosave-first') ? 'color: red;' : ''"></strong><br>

                  </div>

                </v-card>
              </v-window-item>
              <v-window-item value="7">
                <v-card>
                  <!-- <v-btn style="margin-bottom: 10px;" @click="isAllBtn">全表示</v-btn>-->
                  <v-switch style="height: 40px;" v-model="isAll" @change="isAllSwitch" label="全表示" color="primary" />
                  <v-btn style="margin-top:20px;margin-bottom: 30px; width: 180px;" @click="openData">オープンデータ更新</v-btn>

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
  addTileLayerForImage, capture,
  geojsonAddLayer, highlightSpecificFeaturesCity, iko, pngDownload, publicChk,
  simaToGeoJSON, userKmzSet, userPmtileSet, userSimaSet, userTileSet, userXyztileSet
} from "@/js/downLoad";
import muni from '@/js/muni'

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
import {
  cityGeojsonSource,
  extLayer,
  extSource,
  groupPointsLayer, groupPointsSource,
  konUrls, pngLayer,
  pngSource,
  sicyosonChibanzuUrls
} from "@/js/layers";
import * as Layers from "@/js/layers";
import {kml} from "@tmcw/togeojson";
import JSZip from "jszip";
import store from "@/store";
import firebase from 'firebase/app'
import 'firebase/firestore'
import { mapState } from 'vuex'

export default {
  name: 'Dialog-myroom',
  props: ['mapName'],
  components: {
    // MasonryWall,
  },
  data: () => ({
    layerId: '',
    layerName: '',
    selectedPrefName: '',
    selectedCityName: '',
    selectedPrefCode: '',
    selectedCityCode: '',
    isAll: false,
    id: '',
    name: '',
    tileRename: '',
    pmtilesRename: '',
    xyztileRename: '',
    pmtilesSerch: '',
    kmzRename: '',
    simaRename: '',
    tab: '0',
    tileUrl: '',
    tileName: '',
    urlName: '',
    jsonData: null,
    jsonDataTile: null,
    jsonDataPmtile: null,
    jsonDataPmtilePubilc: null,
    jsonDataVector: null,
    jsonDataxyztile: null,
    jsonDataxyztileAll: null,
    jsonDataKmz: null,
    jsonDataSima: null,
    jsonDataHistory: null,
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
    mayroomStyle: {"overflow-y": "auto", "max-height": "530px", "max-width": "560px", "padding-top": "10px"}
  }),
  computed: {
    map01Layers () {
      return this.$store.state.selectedLayers.map01
    },
    s_map01 () {
      return this.$store.state.map01
    },
    s_currentGroupId: {
      get() {
        return this.$store.state.currentGroupId
      },
      set(value) {
        this.$store.state.currentGroupId = value
      }
    },
    s_currentGroupLayers: {
      get() {
        return this.$store.state.currentGroupLayers
      },
      set(value) {
        this.$store.state.currentGroupLayers = value
      }
    },
    s_currentGroupName () {
      return this.$store.state.currentGroupName
    },
    filteredHistory() {
      // return this.jsonDataHistory.filter(item => !item.url.includes('localhost'));
      return (this.jsonDataHistory || []).filter(item => {
        return item.url && !item.url.includes('localhost');
      });
    },
    cityItems() {
      const filteredCities = Object.entries(muni)
          .filter(([_, value]) => value.startsWith(`${Number(this.selectedPrefCode)},`))
          .map(([cityCode, value]) => {
            const parts = value.split(',');
            return { prefCode: parts[0].padStart(5, '0'), cityCode: parts[2], cityName: parts[3] };
          });
      return filteredCities
    },
    prefItems() {
      // 都道府県を重複なく抽出
      const prefsSet = new Set();
      Object.values(muni).forEach(item => {
        const [prefCode, prefName] = item.split(',');
        prefsSet.add(`${prefCode},${prefName}`);
      });
      // 配列を作成
      const result = Array.from(prefsSet).map(item => {
        const [prefCode, prefName] = item.split(',');
        return { prefCode: prefCode.padStart(2, '0'), prefName };
      });
      return result
    },
    s_isDialogVisible: {
      get() {
        return this.$store.state.isDialogVisible
      },
      set(value) {
        this.$store.state.isDialogVisible = value
      }
    },
    isOh3Team () {
      const oh3Team = ['dqyHV8DykbdSVvDXrHc7xweuKT02',
        'GwWbXVuGL7SZuVp3o1wztDYZSVa2',
        'SSQgPmV42EVDSSHHMhlp7IeLdOf1',
        'tb3jBL4qEPdNseETkgGkj9MmsJ42',
        'C3N0zX1NdRSIJNjoQh54ForwFnW2',
        'oi4f1BDMg3WjZXLRV44jOb9Q5VK2',
        // 'GmzTsgclQyMkUFqVpvHVEwPsihC2'
      ]
      return oh3Team.includes(this.s_userId)
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
    setupSelectedLayerWatcher () {
      this.$watch('map01Layers', {
        handler: (newVal) => {
          const map = this.$store.state.map01
          if (!map) return

          newVal.forEach(layer => {
            if (!map.getSource(layer.id)) {
              map.addSource(layer.id, {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: layer.features || []
                }
              })
              map.addLayer({
                id: layer.id + '-layer',
                type: 'circle',
                source: layer.id,
                paint: {
                  'circle-radius': 6,
                  'circle-color': layer.color || '#ff0000'
                }
              })
            }
          })
          console.log(JSON.stringify(this.$store.state.selectedLayers.map01, null, 2))
          // alert(888)
        },
        deep: true,
        immediate: true
      })


      //
      // this.$watch('selectedLayers.map01', {
      //   handler: (newVal) => {
      //     const map = this.$store.state.map01
      //     if (!map) {
      //       return
      //     }
      //     console.log('111',newVal)
      //     alert(0)
      //     newVal.forEach(layer => {
      //       if (!map.getSource(layer.id)) {
      //         map.addSource(layer.id, {
      //           type: 'geojson',
      //           data: {
      //             type: 'FeatureCollection',
      //             features: layer.features || []
      //           }
      //         })
      //         map.addLayer({
      //           id: layer.id + '-layer',
      //           type: 'circle',
      //           source: layer.id,
      //           paint: {
      //             'circle-radius': 6,
      //             'circle-color': layer.color || '#ff0000'
      //           }
      //         })
      //       }
      //     })
      //   },
      //   deep: true,
      //   immediate: true
      // })
    },
    handleMapClick(e) {
      const selectedLayers = this.$store.state.selectedLayers
      if (!selectedLayers.map01) {
        this.$set(selectedLayers, 'map01', [])
      }

      const selected = selectedLayers.map01.find(layer =>
          layer.id.startsWith('oh-userlayer')
      )
      if (!selected) return

      const coord = [e.lngLat.lng, e.lngLat.lat]
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coord
        },
        properties: {}
      }

      if (!selected.features) {
        // this.$set(selected, 'features', [])
        selected.features = [...selected.features, feature]

      }
      selected.features.push(feature)

// setData 更新
      const map = this.$store.state.map01
      const source = map.getSource(selected.id)
      if (source && source.setData) {
        source.setData({
          type: 'FeatureCollection',
          features: selected.features.slice() // Proxy解除
        })
      }
      console.log('ohfeatures', selected.features)
      console.log('ohsource', source)
      console.log('source data set OK')
    },

    //
    // handleMapClick (e) {
    //   const selected = this.$store.state.selectedLayers.map01.find(layer =>
    //       layer.id.startsWith('oh-userlayer')
    //   )
    //   if (!selected) return
    //
    //   const coord = [e.lngLat.lng, e.lngLat.lat]
    //   const feature = {
    //     type: 'Feature',
    //     geometry: {
    //       type: 'Point',
    //       coordinates: coord
    //     },
    //     properties: {}
    //   }
    //   selected.features.push(feature)
    //   // 👇 MapLibre の source を更新
    //   const map = this.$store.state.map01
    //   const source = map.getSource(selected.id)
    //   if (source && source.setData) {
    //     source.setData({
    //       type: 'FeatureCollection',
    //       features: selected.features
    //     })
    //   }
    //   console.log('ポイント追加:', JSON.stringify(feature, null, 2))
    //   console.log('features 全体:', selected.features)
    //   console.log('selected.id:', selected.id)
    //   console.log('source:', map.getSource(selected.id))
    //   // alert(999)
    // },
    // handleMapClick (e) {
    //   const map = this.$store.state.map01
    //   console.log(this.$store.state.selectedLayers.map01)
    //   const groupLayer = this.$store.state.selectedLayers.map01.find(l =>
    //       this.s_currentGroupLayers.some(g => g.id === l.id)
    //   )
    //   alert(groupLayer)
    //   if (!groupLayer) return
    //
    //   const point = {
    //     type: 'Feature',
    //     geometry: {
    //       type: 'Point',
    //       coordinates: [e.lngLat.lng, e.lngLat.lat]
    //     },
    //     properties: {}
    //   }
    //
    //   groupLayer.features = groupLayer.features || []
    //   groupLayer.features.push(point)
    //
    //   const source = map.getSource(groupLayer.source)
    //   if (source) {
    //     source.setData({
    //       type: 'FeatureCollection',
    //       features: groupLayer.features
    //     })
    //   }
    // },
    restoreLayerSources () {
      const baseSource = (layer) => {
        return {
          id: layer.id + '-source',
          obj: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: layer.features || []
            }
          }
        }
      }

      const baseLayer = (layer) => {
        return {
          id: layer.id,
          label: layer.name,
          source: layer.id + '-source',
          layers: [
            {
              id: layer.id + '-circle',
              type: 'circle',
              source: layer.id + '-source',
              paint: {
                'circle-radius': 6,
                'circle-color': layer.color || '#ff0000'
              }
            }
          ],
          opacity: 1,
          visibility: layer.visible !== false
        }
      }

      const restored = this.s_currentGroupLayers.map(layer => {
        return {
          ...baseLayer(layer),
          sources: [baseSource(layer)]
        }
      })

      this.$store.state.selectedLayers.map01 = [
        ...restored,
        ...this.$store.state.selectedLayers.map01
      ]
    },
    // setLayerConfigs () {
    //   const layerMap = Object.fromEntries(
    //       this.s_currentGroupLayers.map(l => [l.id, l])
    //   )
    //   this.$store.state.selectedLayers.map01.forEach(layer => {
    //     // Firestore の ID を抽出
    //     const match = layer.id.match(/^oh-userlayer-(.+)$/)
    //     const pureId = match ? match[1] : layer.id
    //
    //     const config = layerMap[pureId]
    //     if (config) {
    //       layer.label = config.name
    //       layer.color = config.color
    //       layer.visible = config.visible
    //       // layer.features = config.features
    //       layer.features = Array.isArray(config.features) ? config.features : []
    //     }
    //   })
    // },
    // setLayerConfigs () {
    //   const layerMap = Object.fromEntries(
    //       this.s_currentGroupLayers.map(l => [l.id, l])
    //   )
    //   this.$store.state.selectedLayers.map01.forEach(layer => {
    //     const config = layerMap[layer.id]
    //     if (config) {
    //       layer.label = config.name
    //       layer.color = config.color
    //       layer.visible = config.visible
    //       layer.features = config.features
    //     }
    //   })
    // },
    // setLayerLabels () {
    //   const layerMap = Object.fromEntries(
    //       this.s_currentGroupLayers.map(l => [l.id, l.name])
    //   )
    //   this.$store.state.selectedLayers.map01.forEach(layer => {
    //     if (layer.id && layerMap[layer.id]) {
    //       layer.label = layerMap[layer.id]
    //     }
    //   })
    // },
    layerSerchBtn () {
      const keyword = this.layerName.trim()
      if (!keyword) {
        this.fetchLayers()
        return
      }
      const matched = this.s_currentGroupLayers.filter(layer =>
          layer.name.includes(keyword)
      )

      if (matched.length === 0) {
        alert('一致するレイヤーが見つかりません')
      } else {
        // 検索結果だけ一時的に表示
        this.$store.state.currentGroupLayers = matched
      }
    },
    async deleteLayer (id) {
      if (!confirm("本当に削除しますか？元には戻りません。")) {
        return
      }
      try {
        await firebase.firestore()
            .collection('groups')
            .doc(this.s_currentGroupId)
            .collection('layers')
            .doc(id)
            .delete()
        this.layerName = ''
        await this.fetchLayers()
      } catch (e) {
        console.error('Firestore 削除エラー:', e)
      }
    },
    layerSet(name, id) {
      this.layerName = name;
      this.layerId = id;
      this.$store.commit('setSelectedLayerId', id);

      const mapLayers = this.$store.state.selectedLayers['map01'];
      const existingLayer = mapLayers.find(l => l.id === 'oh-point-layer');
      if (!existingLayer) {
        // 初回のみ追加
        mapLayers.unshift({
          id: 'oh-point-layer',
          label: name,
          sources: [{
            id: 'oh-point-source',
            obj: {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: []
              }
            }
          }],
          layers: [{
            id: 'oh-point-layer',
            type: 'circle',
            source: 'oh-point-source',
            paint: {
              'circle-radius': 6,
              'circle-color': '#ff0000',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff'
            }
          }],
          opacity: 1,
          visibility: true,
          attribution: '',
          layerid: id // FirestoreのレイヤーID
        });
      } else {
        // 既存の場合はラベルとlayeridを更新
        existingLayer.label = name;
        existingLayer.layerid = id;
      }

      // 選択レイヤーのデータをマップに反映
      const currentLayer = this.$store.state.currentGroupLayers.find(l => l.id === id);
      const map01 = this.$store.state.map01;
      if (map01 && map01.getSource('oh-point-source')) {
        const features = currentLayer?.features || [];
        map01.getSource('oh-point-source').setData({
          type: 'FeatureCollection',
          features: features
        });
        map01.setPaintProperty('oh-point-layer', 'circle-color', currentLayer?.color || '#ff0000');
        map01.triggerRepaint();
      } else {
        console.warn('マップまたはソースが未初期化');
      }
    },
    // layerSet(name, id) {
    //   this.layerName = name;
    //   this.layerId = id;
    //   this.$store.commit('setSelectedLayerId', id);
    //   // oh-point-layer が既に存在するかチェック
    //   const mapLayers = this.$store.state.selectedLayers['map01'];
    //   const existingLayer = mapLayers.find(l => l.id === 'oh-point-layer');
    //   if (!existingLayer) {
    //     // 初回のみ追加
    //     mapLayers.unshift({
    //       id: 'oh-point-layer',
    //       label: name,
    //       sources: [groupPointsSource],
    //       layers: [groupPointsLayer],
    //       opacity: 1,
    //       visibility: true,
    //       attribution: '',
    //       layerid: id
    //     });
    //   } else {
    //     // 既存の場合はラベル更新
    //     existingLayer.label = name;
    //   }
    //   // 選択レイヤーのデータをマップに反映
    //   const currentLayer = this.$store.state.currentGroupLayers.find(l => l.id === id);
    //   const map01 = this.$store.state.map01
    //   const features = currentLayer?.features || [];
    //   map01.getSource('oh-point-source')?.setData({
    //     type: 'FeatureCollection',
    //     features: features
    //   });
    // },
    // layerSet (name,id) {
    //   this.layerName = name
    //   this.layerId = id
    //   this.$store.commit('setSelectedLayerId', id)
    //   this.$store.state.selectedLayers['map01'].unshift(
    //       {
    //         id: 'oh-point-layer',
    //         label: name,
    //         sources: [groupPointsSource],
    //         layers: [groupPointsLayer],
    //         opacity: 1,
    //         visibility: true,
    //         attribution: '',
    //       },
    //   );
    //   // const newLayer = {
    //   //   // id: 'oh-userlayer-' + id,
    //   //   id: 'oh-group-points-layer',
    //   //   label: name, // ★ここでレイヤー名をセット！
    //   //   source: null,       // 別の処理で source を追加する想定
    //   //   layers: [],         // 同上、レイヤー定義も後から
    //   //   opacity: 1,
    //   //   visibility: true
    //   // }
    //   // // MapLibre 用に selectedLayers.map01 / map02 に追加
    //   // this.$store.state.selectedLayers.map01.unshift(newLayer)
    //   // this.$store.state.selectedLayers.map02.unshift(newLayer)
    // },
    async layerRenameBtn () {
      if (!this.layerName.trim()) return alert('新しい名前を入力してください')
      const selectedLayer = this.s_currentGroupLayers.find(layer => layer.id === this.layerId)
      if (!selectedLayer) return alert('対象のレイヤーが見つかりません')

      try {
        await firebase.firestore()
            .collection('groups')
            .doc(this.s_currentGroupId)
            .collection('layers')
            .doc(selectedLayer.id)
            .update({ name: this.layerName })

        selectedLayer.name = this.layerName
        alert('リネーム成功')
      } catch (e) {
        console.error('Firestore リネームエラー:', e)
        alert('リネーム失敗')
      }
    },
    async fetchLayers () {
      if (!this.s_currentGroupId) return
      try {
        const snapshot = await firebase.firestore()
            .collection('groups')
            .doc(this.s_currentGroupId)
            .collection('layers')
            .orderBy('createdAt')
            .get()

        const layers = []
        snapshot.forEach(doc => {
          layers.push({ id: doc.id, ...doc.data() })
        })
        this.$store.state.currentGroupLayers = layers
        // this.setLayerLabels()
        this.setLayerConfigs()
        // this.restoreLayerSources()
      } catch (e) {
        console.error('Firestore 読み込みエラー:', e)
      }
    },
    async addLayer () {
      if (!this.layerName) {
        alert('ネームが未記入です。')
        return
      }
      const nextIndex = this.s_currentGroupLayers.length + 1
      const name = this.layerName.trim() || `レイヤー${nextIndex}`
      const newLayer = {
        name: name,
        color: '#ff0000',
        visible: true,
        features: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }
      try {
        const docRef = await firebase.firestore()
            .collection('groups')
            .doc(this.s_currentGroupId)
            .collection('layers')
            .add(newLayer)
        newLayer.id = docRef.id
        this.$store.state.currentGroupLayers.push(newLayer)
        // this.$store.state.selectedLayers.map01.unshift({
        //   id: `group-layer-${newLayer.id}`,
        //   label: newLayer.name,
        //   source: `group-layer-${newLayer.id}-source`,
        //   sources: [
        //     {
        //       id: `group-layer-${newLayer.id}-source`,
        //       obj: {
        //         type: 'geojson',
        //         data: {
        //           type: 'FeatureCollection',
        //           features: []
        //         }
        //       }
        //     }
        //   ],
        //   layers: [
        //     {
        //       id: `group-layer-${newLayer.id}-circle`,
        //       type: 'circle',
        //       source: `group-layer-${newLayer.id}-source`,
        //       paint: {
        //         'circle-radius': 6,
        //         'circle-color': newLayer.color,
        //         'circle-stroke-width': 1,
        //         'circle-stroke-color': '#fff'
        //       }
        //     }
        //   ],
        //   visible: true,
        //   opacity: 1
        // })

      } catch (e) {
        console.error('Firestore 書き込みエラー:', e)
      }
    },
    formatItem(item) {
      const device = this.detectDevice(item.ua);
      const text = `${item.date} / ${device} / ${item.event}`;
      const thumbnailImg = item.thumbnail
          ? ` <img src="${item.thumbnail}" alt="thumbnail" style="vertical-align: middle;">`
          : '';
      return thumbnailImg + ' ' + text;
    },
    reload () {
      this.historySelect()
    },
    detectDevice(ua) {
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Macintosh')) return 'Macintosh';
      if (ua.includes('iPhone')) return 'iPhone';
      if (ua.includes('Android')) return 'Android';
      return ua; // 該当がなければそのまま表示
    },
    openData () {
      // PHPへ送信
      fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/insert_opendata.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sicyosonChibanzuUrls)
      })
          .then(response => response.text())
          .then(result => {
            alert('成功')
            console.log('成功:', result);
          })
          .catch(error => {
            alert('失敗')
            console.error('エラー:', error);
          });
    },
    myChibanzu () {
      this.pmtileSelect(this.uid)
    },
    kenzChibanzu () {
      this.pmtileSelect('dqyHV8DykbdSVvDXrHc7xweuKT02')
    },
    scrapeLinks () {
      let count = 0
      const vm = this
      async function scrapeLinks() {
        const response = await fetch('https://forestgeo.info/%e5%be%ae%e5%9c%b0%e5%bd%a2%e8%a1%a8%e7%8f%be%e5%9b%b3%e3%83%9e%e3%83%83%e3%83%97%e3%82%bf%e3%82%a4%e3%83%ab%e4%b8%80%e8%a6%a7/');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const data = [];
        doc.querySelectorAll('p a[href$=".png"], p a[href$=".webp"]').forEach(link => {
          const p = link.closest('p');
          const text = p.innerHTML.split('<br>')[0].replace(/<[^>]+>/g, '').trim();
          data.push({ tileUrl: decodeURIComponent(link.href), tileName: text });
        });
        console.log(JSON.stringify(data, null, 2))
        data.forEach(v => {
          if (!vm.jsonDataTile.find(v2 => v2.name === v.tileName)) {
            vm.tileName = v.tileName
            vm.tileUrl = v.tileUrl
            vm.tileSave(true)
            count++
          }
        })
        vm.tileName = null
        vm.tileUrl = null
        if (count > 0) {
          alert(count + '件追加しました。')
        } else {
          alert('既に全件追加されています。')
        }
      }
      scrapeLinks ()
    },
    history () {
      const vm = this
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userHystorySelect.php',{
        params: {
          uid: this.uid,
        }
      }).then(function (response) {
        console.log(response)
        history('history復帰', window.location.href)
        if (response.data.length > 0) {
          vm.urlClick('', response.data[0].url, '')
        } else {
          alert('履歴が一件もありません。')
        }
      })
    },
    device (device) {
      const vm = this
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userHystorySelect.php',{
        params: {
          uid: this.uid,
          device: device
        }
      }).then(function (response) {
        console.log(response)
        history('device復帰/' + device, window.location.href)
        if (response.data.length > 0) {
          vm.urlClick('', response.data[0].url, '')
        } else {
          alert('履歴が一件もありません。')
        }
      })
    },
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
      if (!confirm("リネームしますか？")) {
        return
      }
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
      if (!confirm("リネームしますか？")) {
        return
      }
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
      if (!confirm("リネームしますか？")) {
        return
      }
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
      if (!confirm("リネームしますか？")) {
        return
      }
      const vm = this
      if (!this.xyztileRename) return
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
      if (!confirm("リネームしますか？")) {
        return
      }
      const vm = this
      const prefCode = String(Number(this.selectedPrefCode)).padStart(2, '0')
      let result = Object.entries(muni).find(([key, _]) => {
        if (key.padStart(5, '0').slice(0,2) === prefCode) {
         return key
        }
      });
      const prefName = result[1].split(',')[1]
      const cityCode = String(Number(this.selectedCityCode)).padStart(5, '0')
      result = Object.entries(muni).find(([key, _]) => {
        if (key.padStart(5, '0') === cityCode) {
          return key
        }
      });
      const cityName = result[1].split(',')[3]
      if (!this.pmtilesRename) return
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesUpdate.php',{
        params: {
          id: this.id,
          name: this.pmtilesRename,
          prefcode: this.selectedPrefCode,
          citycode: this.selectedCityCode,
          prefname: prefName,
          cityname: cityName
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
        // 様修正
        if (sourceAndLayers.geojson.features.length > 1) {
          vm.$store.state.map01.fitBounds(bounds, {
            padding: 50,
            animate: false
          });
        }
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
    pmtileClick (name,url,id, chiban, bbox, length, prefCode, cityCode) {
      this.pmtilesRename = name
      this.id = id
      this.name = name
      this.selectedPrefCode = prefCode
      this.selectedCityCode = cityCode
      userPmtileSet(name,url,id, chiban, JSON.parse(bbox), length)
    },
    tileClick (name,url,id) {
      userTileSet(name,url,id)
    },
    historyClick (name,url,id) {
      this.urlClick (name,url,id)
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
      // alert(url)
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
                    const length = response.data[0].length
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
                        'line-color': 'blue',
                        'line-width': [
                          'interpolate',
                          ['linear'],
                          ['zoom'],
                          1, 0.1,
                          16, 2
                        ]
                      },
                    }
                    let minZoom
                    if (!length) {
                      minZoom = 17
                    } else if (length < 10000) {
                      minZoom = 0
                    } else {
                      minZoom = 17
                    }
                    // const labelLayer = {
                    //   id: 'oh-chibanL-' + name + '-label-layer',
                    //   type: "symbol",
                    //   source: 'oh-chiban-' + id + '-' + name + + '-source',
                    //   "source-layer": "oh3",
                    //   'layout': {
                    //     'text-field': ['get', chiban],
                    //     'text-font': ['NotoSansJP-Regular'],
                    //   },
                    //   'paint': {
                    //     'text-color': 'navy',
                    //     'text-halo-color': 'rgba(255,255,255,1)',
                    //     'text-halo-width': 1.0,
                    //   },
                    //   'minzoom': minZoom
                    // }
                    const labelLayer = {
                      id: 'oh-chibanL-' + name + '-label-layer',
                      type: "symbol",
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      "source-layer": "oh3",
                      layout: {
                        'text-field': ['get', chiban],
                        'text-font': ['NotoSansJP-Regular'],
                        'text-offset': [
                          'case',
                          ['==', ['geometry-type'], 'Point'], ['literal', [0, 1.2]],  // ポイントは下にずらす
                          ['literal', [0, 0]]  // ポリゴンなどはそのまま
                        ]
                      },
                      paint: {
                        'text-color': 'navy',
                        'text-halo-color': 'rgba(255,255,255,1)',
                        'text-halo-width': 1.0,
                      },
                      minzoom: minZoom
                    };
                    const pointLayer = {
                      id: 'oh-chibanL-' + name + '-point-layer',
                      type: "circle",
                      source: 'oh-chiban-' + id + '-' + name + + '-source',
                      filter: ["==", "$type", "Point"],
                      "source-layer": "oh3",
                      paint: {
                        'circle-color': 'rgba(255,0,0,1)', // 赤色で中心点を強調
                        'circle-radius': 5, // 固定サイズの点
                        'circle-opacity': 1,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#fff'
                      }
                    };
                    const vertexLayer = {
                      id: 'oh-chibanL-' + name + '-vertex-layer',
                      type: "circle",
                      source: 'oh-chiban-' + id + '-' + name + + '-source',
                      filter: ["==", "$type", "Polygon"],
                      "source-layer": "oh3",
                      paint: {
                        'circle-radius': [
                          'interpolate', ['linear'], ['zoom'],
                          15, 0,
                          18,4
                        ],
                        'circle-color': 'red',
                      }
                    };
                    v.sources = [source];
                    v.layers = [polygonLayer,lineLayer,labelLayer,vertexLayer,pointLayer];
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

      //   setTimeout(() => {
      //     console.log(map.getStyle().layers)
      //     const targetLayers = map.getStyle().layers
      //         .filter(layer => layer.id.startsWith('oh-chiban-') && !registeredLayers.has(layer.id))
      //         .map(layer => layer.id);
      //     console.log(targetLayers)
      //     targetLayers.forEach(layer => {
      //       console.log(`Adding click event to layer: ${layer}`);
      //       map.on('click', layer, (e) => {
      //         if (e.features && e.features.length > 0) {
      //           const targetId = `${e.features[0].properties['oh3id']}`;
      //           console.log('Clicked ID', targetId);
      //           if (store.state.highlightedChibans.has(targetId)) {
      //             // すでに選択されている場合は解除
      //             store.state.highlightedChibans.delete(targetId);
      //           } else {
      //             // 新しいIDを追加
      //             store.state.highlightedChibans.add(targetId);
      //           }
      //           highlightSpecificFeaturesCity(map, layer);
      //         }
      //       });
      //     });
      //   },500)
      //   const registeredLayers = new Set();
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
        }
      }
      deleteUserData(id)
    },
    publicChk (id,public0) {
      const vm = this
      async function aaa () {
        await publicChk (id,public0)
        vm.pmtileSelectPublic()
      }
      aaa()

      // store.state.loading2 = true
      // store.state.loadingMessage = '処理中です。'
      // const vm = this
      // axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesUpdatePublic.php',{
      //   params: {
      //     id: id,
      //     public: public0
      //   }
      // }).then(function (response) {
      //   vm.pmtileSelectPublic()
      //   console.log(response.data.publics[0].public)
      //   let cities = response.data.publics.map(v => {
      //     return {
      //       citycode:v.citycode,
      //       pmtilesurl:v.url,
      //       public: Number(v.public),
      //       page: ''
      //     }
      //   })
      //   console.log(cities)
      //   const cities2 = []
      //   sicyosonChibanzuUrls.forEach(v => {
      //     if (v.code) {
      //       cities2.push({
      //         citycode:v.code,
      //         pmtilesurl:'999',
      //         public: 2,
      //         page: v.page
      //       })
      //     }
      //   })
      //   console.log(cities2)
      //   cities = [...cities, ...cities2];
      //
      //   async function cityGeojson() {
      //     try {
      //       const response1 = await axios.post('https://kenzkenz.duckdns.org/myphp/city_geojson.php', {
      //         cities: cities
      //         // cities: [{citycode:'45201',pmtilesurl:'9999'}]
      //       });
      //       console.log(response1)
      //       if (response1.data.error) {
      //         console.error('エラー:', response1.data.error);
      //         // alert(`エラー: ${response.data.error}`);
      //       } else {
      //         console.log('成功:', response1.data);
      //         const maps = [vm.$store.state.map01,vm.$store.state.map02]
      //         maps.forEach(map => {
      //           map.getStyle().layers.forEach(layer => {
      //             if (layer.id.includes('oh-chibanL-') && layer.id.includes(id)) {
      //               map.removeLayer(layer.id)
      //             }
      //           })
      //         })
      //         setTimeout(() => {
      //           store.state.loading2 = false
      //           alert('設定を反映するには再読み込みしてください。')
      //         },3000)
      //       }
      //     } catch (error) {
      //       console.error('リクエストエラー:', error);
      //     }
      //   }
      //   cityGeojson()
      // })
    },

    transparentChk (id,transparent) {
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileUpdateTransparent.php',{
        params: {
          id: id,
          transparent: transparent
        }
      }).then(function (response) {
        console.log(response)
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
            // alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
          }
        } catch (error) {
          console.error('リクエストエラー:', error);
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
          }
        } catch (error) {
          console.error('リクエストエラー:', error);
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
        }
      }
      fetchUserData(uid)
    },
    pmtilesSerchBtn () {
      const vm = this
      async function fetchUserData() {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesSerch.php', {
            params: {
              name: vm.pmtilesSerch
            }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataPmtilePubilc = response.data.result
          }
        } catch (error) {
          console.error('通信エラー:', error);
        }
      }
      fetchUserData(this.s_userId)
    },
    simaSerchBtn () {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaSerch.php', {
            params: { uid: uid, isAll: vm.isAll, name: vm.simaRename}
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataSima = response.data.result
          }
        } catch (error) {
          console.error('通信エラー:', error);
        }
      }
      fetchUserData(this.s_userId)
    },
    historySelect () {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userHistorySelect.php', {
            params: { uid: vm.uid}
          });
          if (response.data.error) {
            console.error('エラー!:', response.data.error);
            // 様修正 ここでエラーが出ている。
            // alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataHistory = response.data.result
          }
        } catch (error) {
          console.error('通信エラー:', error);
        }
      }
      fetchUserData()
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
        }
      }
      fetchUserData(uid)
    },
    pmtileSelectPublic () {
      const vm = this
      async function fetchUserData() {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtileSelectPublic.php', {
            params: {}
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            vm.jsonDataPmtilePubilc = response.data
          }
        } catch (error) {
          console.error('通信エラー:', error);
        }
      }
      fetchUserData()
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
            // console.log('取得データ:', response.data);
            // console.log(JSON.stringify(response.data, null, 2))
            // alert(`取得成功！\nデータ: ${JSON.stringify(response.data, null, 2)}`);
            vm.jsonDataTile = response.data
          }
        } catch (error) {
          console.error('通信エラー:', error);
        }
      }
      fetchUserData(uid)
    },
    tileSave (isScrape) {
      if (!isScrape) {
        if (!this.tileName || !this.tileUrl) {
          alert('ネーム、タイルURLを記入してください。')
          return
        }
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
    // s_map01: {
    //   handler(map) {
    //     if (map) {
    //       alert(999)
    //       this.setupSelectedLayerWatcher()
    //     }
    //   },
    //   immediate: true
    // },
    // 'selectedLayers.map01': {
    //   handler (newVal) {
    //     const map = this.$store.state.map01
    //     if (!map) {
    //       alert(0)
    //       return
    //     }
    //     newVal.forEach(layer => {
    //       if (!map.getSource(layer.id)) {
    //         map.addSource(layer.id, {
    //           type: 'geojson',
    //           data: {
    //             type: 'FeatureCollection',
    //             features: layer.features || []
    //           }
    //         })
    //         map.addLayer({
    //           id: layer.id + '-layer',
    //           type: 'circle',
    //           source: layer.id,
    //           paint: {
    //             'circle-radius': 6,
    //             'circle-color': layer.color || '#ff0000'
    //           }
    //         })
    //       }
    //     })
    //     alert('selectedLayers.map01 changed!')
    //   },
    //   deep: true,
    //   immediate: true
    // },
    // s_selectedLayers: {
    //   handler(newVal) {
    //     alert(newVal)
    //     const map = this.$store.state.map01
    //     if (!map) return
    //
    //     newVal.forEach(layer => {
    //       if (!map.getSource(layer.id)) {
    //         map.addSource(layer.id, {
    //           type: 'geojson',
    //           data: {
    //             type: 'FeatureCollection',
    //             features: layer.features || []
    //           }
    //         })
    //         map.addLayer({
    //           id: layer.id + '-layer',
    //           type: 'circle',
    //           source: layer.id,
    //           paint: {
    //             'circle-radius': 6,
    //             'circle-color': layer.color || '#ff0000'
    //           }
    //         })
    //       }
    //     })
    //     this.setLayerConfigs()
    //   },
    //   deep: true,
    //   immediate: true
    // },
    // s_selectedLayers(newVal) {
    //   // id がある程度入ってきたらラベル設定を試みる
    //   if (newVal.length > 0) {
    //     this.setLayerConfigs()
    //   }
    // },
    // s_map01: {
    //   handler (map) {
    //     if (!map || this._clickRegistered) return
    //     this.setupSelectedLayerWatcher()
    //     this._clickRegistered = true
    //     map.on('click', this.handleMapClick)
    //   },
    //   immediate: true
    // },
    s_currentGroupName() {
      this.fetchLayers()
    },
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
      this.pmtileSelectPublic()
      this.historySelect()
    },
    s_fetchImagesFire () {
      try {
        this.fetchImages()
        this.urlSelect(this.$store.state.userId)
        this.tileSelect(this.$store.state.userId)
        this.pmtileSelect(this.$store.state.userId)
        this.xyztileSelect(this.$store.state.userId)
        this.kmzSelect(this.$store.state.userId)
        this.simaSelect(this.$store.state.userId)
        this.xyztileSelectAll()
        this.pmtileSelectPublic()
        this.historySelect()
      } catch (e) {
        console.log(e)
      }
    }
  },
  mounted() {

    // const map = this.$store.state.map01
    // map.on('load', () => {
    //   console.log('レイヤー一覧:', map.getStyle().layers.map(l => l.id))
    //   console.log('ソース一覧:', Object.keys(map.style.sourceCaches))
    // })



    // ------------------
    document.querySelector('#drag-handle-myroomDialog-map01').innerHTML = '<span style="font-size: large;">マイルーム</span>'
    // -------------------------------------------------------------------
    let maxHeight
    if (window.innerWidth <= 500) {
      maxHeight = (window.innerHeight) + 'px'
    } else {
      maxHeight = (window.innerHeight - 150) + 'px'
    }
    this.mayroomStyle["max-height"] = maxHeight
    // 非同期で user の UID を監視
    // // -------------------------------------------------------------------
    const checkUser = setInterval(() => {
      if (user.value && user.value.uid) {
        const uid = user.value.uid
        this.uid = uid
        this.$store.state.userId = uid




        if (this.s_currentGroupId) {
          this.fetchLayers()
        }

        this.fetchImages(uid)
        this.urlSelect(uid)
        this.tileSelect(uid)
        this.pmtileSelect(uid)
        this.xyztileSelect(uid)
        this.kmzSelect(uid)
        this.simaSelect(uid)
        this.xyztileSelectAll()
        this.pmtileSelectPublic()
        this.historySelect()

        clearInterval(checkUser)
      }
    }, 100) // 5ms → 100ms に変更（CPU負荷軽減のため）


    // const checkUser = setInterval(() => {
    //   if (user && user._rawValue && user._rawValue.uid) {
    //     this.uid = user._rawValue.uid;
    //     this.$store.state.userId = user._rawValue.uid
    //     this.fetchImages(this.uid); // UIDを取得した後に fetchImages を実行
    //     this.urlSelect(this.uid)
    //     this.tileSelect(this.uid)
    //     this.pmtileSelect(this.uid)
    //     this.xyztileSelect(this.uid)
    //     this.kmzSelect(this.uid)
    //     this.simaSelect(this.uid)
    //     this.xyztileSelectAll()
    //     this.pmtileSelectPublic()
    //     this.historySelect()
    //     clearInterval(checkUser); // UIDを取得できたら監視を停止
    //   }
    // }, 5);
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
.close-btn:hover {
  color: red;
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

