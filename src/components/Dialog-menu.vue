<script setup>
import { user as user1 } from "@/authState"; // グローバルの認証情報を取得
</script>

<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="menu-div">

      <v-dialog v-model="s_dialogForLogin" max-width="500px">
        <v-card>
          <v-card-title>
            <p v-if="user1">ようこそ、{{ user1.displayName }}さん！</p>
          </v-card-title>
          <v-card-text>

            <div style="margin-top: 10px;">
              <v-btn v-if="!user1" @click="loginDiv=!loginDiv,signUpDiv=false">ログイン</v-btn><v-btn v-if="user1" @click="logOut">ログアウト</v-btn>
              <v-btn style="margin-left: 10px;" v-if="!user1" @click="signUpDiv=!signUpDiv,loginDiv=false">新規登録</v-btn>

              <div v-if="loginDiv" style="margin-top: 10px;">
                <v-text-field v-model="email" type="email" placeholder="メールアドレス" ></v-text-field>
                <v-text-field v-model="password" type="password" placeholder="パスワード"></v-text-field>
                <v-btn @click="login">ログインします</v-btn>
                <p style="margin-top: 10px;" v-if="errorMsg">{{ errorMsg }}</p>
              </div>
            </div>
            <div style="margin-top: 10px;">

              <div v-if="signUpDiv" style="margin-top: 10px;">
                <v-text-field  v-model="nickname" type="text" placeholder="ニックネーム"></v-text-field>
                <v-text-field v-model="email" type="email" placeholder="メールアドレス" ></v-text-field>
                <v-text-field v-model="password" type="password" placeholder="パスワード"></v-text-field>
                <v-btn @click="signUp">新規登録します</v-btn>
                <p style="margin-top: 10px;" v-if="errorMsg">{{ errorMsg }}</p>
              </div>
            </div>

          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForLogin = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!--URL記録-->
      <v-dialog attach="body" v-model="s_dialogForLink" :scrim="false" persistent="false" max-width="500px" height="500px" content-class="scrollable-dialog" class="scrollable-content">
        <v-card>
          <v-card-title style="text-align: right">
            <v-icon @click="s_dialogForLink = false">mdi-close</v-icon>
          </v-card-title>
          <v-card-text>
            <v-tabs v-model="tab" style="margin-bottom: 10px;">
              <v-tab value="1">URL記憶</v-tab>
              <v-tab value="2">タイル記憶</v-tab>
              <v-tab value="3">地番図</v-tab>
              <v-tab value="4">画像</v-tab>
            </v-tabs>

            <v-window v-model="tab">
              <v-window-item value="1">
                <v-card>
                  <div style="margin-bottom: 10px;">
                    <v-text-field  v-model="urlName" type="text" placeholder="ネーム"></v-text-field>
                    <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="urlSave">URL記憶</v-btn>
                    <div v-for="item in jsonData" :key="item.id" class="data-container" @click="urlClick(item.url)">
                      <button class="close-btn" @click="removeItem(item.id, $event)">×</button>
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
                      <button class="close-btn" @click="removeItemTile(item.id, $event)">×</button>
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
                    <button class="close-btn" @click="removeItemPmtiles(item.id,item.url2,$event)">×</button>
                    <strong>{{ item.name }}</strong><br>
                  </div>
                </v-card>
              </v-window-item>
              <v-window-item value="4">
                <v-card>
                  <v-card-text style="margin-bottom: 10px;">ドラッグ&ドロップされたgeotif,jpg,pngが表示されます。</v-card-text>
                  <div class="image-grid">
                    <div v-for="item in images" :key="item" class="image-container">
                      <img :src="item" class="gallery-image" @click="handleImageClick(item)" />
                      <div class="close-button" @click="handleClose(item)">×</div>
                    </div>
                  </div>
                </v-card>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-dialog>

      <div>
        <p v-if="user1">ようこそ、{{ user1.displayName || "ゲスト" }}さん！</p>
        <p v-else></p>
      </div>
      v0.545<br>
      <v-btn @click="reset">リセット</v-btn>
      <v-text-field label="住所で検索" v-model="address" @change="sercheAdress" style="margin-top: 10px"></v-text-field>

      <v-btn class="tiny-btn" @click="simaLoad">SIMA読み込</v-btn>
      <v-btn style="margin-left: 5px;" class="tiny-btn" @click="pngDownload">PNGダウンロード</v-btn>

      <v-switch style="height: 40px;" v-model="s_isClickPointsLayer" @change="changeVisible" label="座標取得レイヤー表示" color="primary" />

      <v-switch style="height: 40px;" v-model="s_isPitch" @change="changePitch" label="２画面時に傾きを同期" color="primary" />

      <v-switch style="height: 40px;margin-bottom: 20px;" v-model="s_isWindow" label="ウインドウ復帰" color="primary" />

      標高を強調します。{{s_terrainLevel}}倍
      <div class="range-div">
        <input type="range" min="1" max="10" step="0.1" class="range" v-model.number="s_terrainLevel" @input="terrainLevelInput"/>
      </div>
<!--      <v-btn @click="addLayerDiv=!addLayerDiv">レイヤー追加（XYZタイル）</v-btn>-->
<!--      <div v-if="addLayerDiv">-->
<!--        <v-text-field label="レイヤー名を記入" v-model="s_extLayerName" style="margin-top: 10px"></v-text-field>-->
<!--        <v-text-field label="URLを記入" v-model="s_extLayer" style="margin-top: -15px"></v-text-field>-->
<!--        <v-btn style="margin-top: -15px;margin-left: 100px;" @click="addLayer">レイヤー追加&変更</v-btn>-->
<!--      </div>-->

<!--      <hr style="margin-top: 20px">-->
<!--      今昔マップ<br>{{konjyakuYear}}年の直近（過去）の地図を表示します。-->
<!--      <div class="range-div">-->
<!--        <input type="range" min="1890" max="2024" step="1" class="range" v-model.number="konjyakuYear" @change="konjyakuYearInput"/>-->
<!--      </div>-->

<!--      <hr style="margin-top: 10px;">-->

    </div>
  </Dialog>
</template>

<script>


import {
  addImageLayer,
  addImageLayerJpg,
  addImageLayerPng,
  addTileLayerForImage,
  geojsonAddLayer, highlightSpecificFeaturesCity,
  simaToGeoJSON, userPmileSet, userPmtileSet, userTileSet
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
import { auth } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import * as Layers from "@/js/layers";
import {kml} from "@tmcw/togeojson";
import JSZip from "jszip";
import store from "@/store";

export default {
  name: 'Dialog-menu',
  props: ['mapName'],
  components: {
    // MasonryWall,
  },
  data: () => ({
    id: '',
    name: '',
    pmtilesRename: '',
    tab: 'one',
    tileUrl: '',
    tileName: '',
    urlName: '',
    jsonData: null,
    jsonDataTile: null,
    jsonDataPmtile: null,
    jsonDataVector: null,
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
  }),
  computed: {
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
    s_fetchImagesFire () {
      return this.$store.state.fetchImagesFire
    },
    s_dialogs () {
      return this.$store.state.dialogs.menuDialog
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
    pmtileClick (name,url,id, chiban, bbox) {
      this.pmtilesRename = name
      this.id = id
      this.name = name
      userPmtileSet(name,url,id, chiban, JSON.parse(bbox))
    },
    tileClick (name,url,id) {
      userTileSet(name,url,id)
    },
    urlClick (url) {
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

        // map.jumpTo({
        //   center: [lng, lat],
        //   zoom: zoom
        // });

        map.flyTo({
          center: [lng, lat],
          zoom: zoom,
          speed: 1.2,
          curve: 1.42,    // アニメーションの曲線効果（オプション）
          essential: true
        });

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
            params: { uid: uid }
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('取得データ:', response.data);
            console.log(JSON.stringify(response.data, null, 2))
            // alert(`取得成功！\nデータ: ${JSON.stringify(response.data, null, 2)}`);
            vm.jsonData = response.data
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
            params: { uid: uid }
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('取得データ:', response.data);
            console.log(JSON.stringify(response.data, null, 2))
            // alert(`取得成功！\nデータ: ${JSON.stringify(response.data, null, 2)}`);
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
            params: { uid: uid }
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
    handleClose(url) {
      if (!confirm("削除しますか？")) {
        return
      }
      let regex = /uploads\/(.*?)\/thumbnail-/;
      let match = url.match(regex);
      const dir0 = match[1]
      regex = /thumbnail-(.*?)\./;
      match = url.match(regex);
      const dir1 = match[1]
      const tileUrl = 'https://kenzkenz.duckdns.org/tiles/' + dir0 + '/' + dir1

      fetch("https://kenzkenz.duckdns.org/myphp/delete_dirs.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dir: "/var/www/html/public_html/tiles/" + dir0 + '/' + dir1,
          dir2: "/var/www/html/public_html/uploads/" + dir0,
          string: dir1
        })
      })
          .then(response => response.json())
          .then(data => {
            // alert('削除成功')
            this.fetchImages(); // 正常終了後に実行
            const map01 = this.$store.state.map01
            if (map01.getLayer('oh-vpstile-layer')) {
              map01.removeLayer('oh-vpstile-layer');
            }
            if (map01.getSource('vpstile-source')) {
              map01.removeSource('vpstile-source');
            }
            console.log(data)
          })
          .catch(error => console.error("エラー:", error));
    },
    handleImageClick(url) {
      async function fetchJson(jsonUrl) {
        try {
          const response = await fetch(jsonUrl);
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          return await response.json();
        } catch (error) {
          console.error("Error fetching JSON:", error);
        }
      }
      let regex = /uploads\/(.*?)\/thumbnail-/;
      let match = url.match(regex);
      const dir0 = match[1]
      regex = /thumbnail-(.*?)\./;
      match = url.match(regex);
      const dir1 = match[1]
      const tileUrl = 'https://kenzkenz.duckdns.org/tiles/' + dir0 + '/' + dir1 + '/{z}/{x}/{y}.png'
      const jsonUrl = 'https://kenzkenz.duckdns.org/tiles/' + dir0 + '/' + dir1 + '/layer.json'
      fetchJson(jsonUrl).then(jsonData => {
        if (jsonData) {
          addTileLayerForImage(tileUrl,jsonData,true)
        }
      });
    },
    createDirectory () {
      // getFirebaseUid()
      createUserDirectory()
    },
    logOut () {
      const logout = async () => {
        try {
          await signOut(auth); // ここで `auth` を明示的に指定
          alert("ログアウトしました");
        } catch (error) {
          console.error("ログアウトエラー:", error.message);
        }
      };
      logout()
    },
    signUp () {
      const signup = async () => {
        try {
          // Firebase 認証でアカウント作成
          const userCredential = await createUserWithEmailAndPassword(auth,  this.email, this.password);
          const user = userCredential.user;
          // ニックネーム（displayName）を設定
          await updateProfile(user, {
            displayName: this.nickname
          });
          console.log("アカウント作成成功！ユーザー:", user);
          this.createDirectory()
          alert(`登録成功！ようこそ、${user.displayName} さん！`);
          this.errorMsg = ''
          this.signUpDiv = false
        } catch (error) {
          console.error("サインアップ失敗:", error.message);
          // エラーメッセージを表示
          switch (error.code) {
            case "auth/user-not-found":
              this.errorMsg = "ユーザーが見つかりません";
              break;
            case "auth/wrong-password":
              this.errorMsg = "パスワードが違います";
              break;
            case "auth/invalid-email":
              this.errorMsg = "無効なメールアドレスです";
              break;
            default:
              this.errorMsg = "ログインに失敗しました";
          }
        }
      };
      signup()
    },
    login () {
      const login = async () => {
        try {
          // Firebase の signInWithEmailAndPassword を使ってログイン
          const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
          // ユーザー情報を取得
          const user = userCredential.user;
          console.log("ログイン成功！", user);
          this.createDirectory()
          this.errorMsg = 'ログイン成功';
          this.loginDiv = false
        } catch (error) {
          console.error("ログイン失敗:", error.message);
          // エラーメッセージを表示
          switch (error.code) {
            case "auth/user-not-found":
              this.errorMsg = "ユーザーが見つかりません";
              break;
            case "auth/wrong-password":
              this.errorMsg = "パスワードが違います";
              break;
            case "auth/invalid-email":
              this.errorMsg = "無効なメールアドレスです";
              break;
            default:
              this.errorMsg = "ログインに失敗しました";
          }
        }
      };
      login()
    },
    addLayer () {
      const map = this.$store.state.map01
      extSource.obj.tiles = [this.s_extLayer]
      const result = this.$store.state.selectedLayers['map01'].find(v => v.id === 'oh-extLayer')
      if (!result) {
        this.$store.state.selectedLayers['map01'].unshift(
            {
              id: 'oh-extLayer',
              label: this.s_extLayerName,
              source: extSource,
              layers: [extLayer],
              opacity: 1,
              visibility: true,
            }
        )
      } else {
        if (map.getLayer('oh-extLayer')) {
          map.removeLayer('oh-extLayer');
        }
        if (map.getSource('ext-source')) {
          map.removeSource('ext-source');
        }
        map.addSource('ext-source', {
          type: "raster",
          tiles: [this.s_extLayer],
        });
        map.addLayer({
          id: 'oh-extLayer',
          type: "raster",
          source: 'ext-source',
        });
        result.label = this.s_extLayerName
      }
      const zoom = map.getZoom()
      setTimeout(() => {
        map.setZoom(12)
        map.setZoom(zoom)
      },1000)
    },
    pngDownload () {
      this.$store.state.dialogForPngApp = true
    },
    simaLoad () {
      this.$store.state.isMenu = true
      this.$store.state.dialogForSimaApp = true
    },
    konjyakuYearInput () {
      let filterdKonUrls = konUrls.filter(url => {
        // console.log(url.timeStart)
        if (url.timeStart <= Number(this.konjyakuYear) && url.timeEnd >= Number(this.konjyakuYear)) {
          return true
        } else if (url.timeEnd <= Number(this.konjyakuYear)) {
          return true
        }
        // return url.timeStart <= Number(this.konjyakuYear) && url.timeEnd >= Number(this.konjyakuYear)u
      })
      console.log(JSON.stringify(filterdKonUrls))

      // filterdKonUrls = filterdKonUrls.

      // nameごとに最もtimeEndが大きいものを選択する処理
      filterdKonUrls = Object.values(filterdKonUrls.reduce((acc, item) => {
        // nameが未登録、または現在のtimeEndが登録済みより大きければ更新
        if (!acc[item.name] || item.timeEnd > acc[item.name].timeEnd) {
          acc[item.name] = item;
        }
        return acc;
      }, {}));

      // 結果を表示
      console.log(JSON.stringify(filterdKonUrls, null, 2));

      const konSources = []
      const konLayers = []
      filterdKonUrls.forEach(url => {
        konSources.push({
          id: url.id,
          obj:{
            type: 'raster',
            tiles: url.tiles,
            scheme: 'tms',
          }
        })
        konLayers.push({
          id: url.id,
          source: url.source,
          name0: url.name,
          name: url.name + url.time,
          type: 'raster',
        })
      })

      this.s_selectedLayers.map01 = this.s_selectedLayers.map01.filter(layer => layer.id !== 'oh-konzyaku-layer')
      this.$store.state.watchFlg = true
      this.s_selectedLayers.map01.unshift(
          {
            id: 'oh-konzyaku-layer',
            label: '今昔マップ',
            sources: konSources,
            layers: konLayers,
            opacity: 1,
            visibility: true,
          }
      )
    },
    changePitch () {
      localStorage.setItem('isPitch',this.s_isPitch)
    },
    reset () {
      const baseUrl = `${window.location.origin}${window.location.pathname}`
      location.href = baseUrl
    },
    sercheAdress () {
      const map = this.$store.state.map01
      // const vm = this
      axios
          .get('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + this.address)
          .then(function (response) {
            console.log(response)
            const coordinates = response.data[0].geometry.coordinates
            // ユーザーの操作を一時的に無効化
            map.scrollZoom.disable();
            map.dragPan.disable();
            map.keyboard.disable();
            map.doubleClickZoom.disable();
            map.flyTo({
              center: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
              zoom: 14,
              essential: true
            })
            // flyToアニメーション完了後にユーザー操作を再度有効化
            map.once('moveend', () => {
              map.scrollZoom.enable();
              map.dragPan.enable();
              map.keyboard.enable();
              map.doubleClickZoom.enable();
            });
            // 検索結果の位置にマーカーを追加
            const marker = new maplibregl.Marker()
                .setLngLat([parseFloat(coordinates[0]), parseFloat(coordinates[1])])
                // .setPopup(new maplibregl.Popup().setHTML(`<strong>${vm.address}</strong>`)) // ポップアップに住所を表示
                .addTo(map);
            // マーカーをクリックしたときにマーカーを削除
            marker.getElement().addEventListener('click', () => {
              marker.remove(); // マーカーをマップから削除
            });
          })
    },
    terrainLevelInput () {
      this.$store.state.map01.setTerrain({ 'source': 'terrain', 'exaggeration': this.s_terrainLevel })
      this.$store.state.map02.setTerrain({ 'source': 'terrain', 'exaggeration': this.s_terrainLevel })
      localStorage.setItem('terrainLevel',this.s_terrainLevel)
      history('terrainLevelInput',window.location.href)
    }
  },
  watch: {
    s_dialogForLink () {
      this.urlSelect(this.$store.state.userId)
      this.tileSelect(this.$store.state.userId)
      this.pmtileSelect(this.$store.state.userId)
    },
    s_fetchImagesFire () {
      this.fetchImages()
      this.pmtileSelect(this.$store.state.userId)
    }
  },
  mounted() {
    // 非同期で user の UID を監視
    const checkUser = setInterval(() => {
      if (user && user._rawValue && user._rawValue.uid) {
        this.uid = user._rawValue.uid;
        this.$store.state.userId = user._rawValue.uid
        clearInterval(checkUser); // UIDを取得できたら監視を停止
        this.fetchImages(this.uid); // UIDを取得した後に fetchImages を実行
        this.urlSelect(this.uid)
        this.tileSelect(this.uid)
        this.pmtileSelect(this.uid)
      }
    }, 5);

    if (localStorage.getItem('terrainLevel')) {
      this.s_terrainLevel = Number(localStorage.getItem('terrainLevel'))
    } else {
      this.s_terrainLevel = 1
    }
    this.s_isPitch = JSON.parse(localStorage.getItem('isPitch'))
    if (localStorage.getItem('resolution')) {
      this.s_resolution = localStorage.getItem('resolution')
    }
    if (localStorage.getItem('window')) {
      this.s_isWindow = JSON.parse(localStorage.getItem('window'))
    }
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
</style>

