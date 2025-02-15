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
      <v-dialog v-model="s_dialogForLink" :scrim="false" persistent="false" max-width="500px" height="500px">
        <v-card>
          <v-card-title style="text-align: right">
            <v-icon @click="s_dialogForLink = false">mdi-close</v-icon>
          </v-card-title>
          <v-card-text>
            <div style="margin-bottom: 10px;">
              <v-text-field  v-model="urlName" type="text" placeholder="ネーム"></v-text-field>
              <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="urlSave">URL記憶</v-btn>
              <div v-for="item in jsonData" :key="item.id" class="data-container" @click="urlClick(item.url)">
                <button class="close-btn" @click="removeItem(item.id, $event)">×</button>
                <strong>{{ item.name }}</strong><br>
                <strong></strong>{{ item.url }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-dialog>


      <v-dialog v-model="s_dialogForImage" :scrim="false" persistent="false" max-width="500px" height="500px">
        <v-card>
          <v-card-title style="text-align: right">
            <v-icon @click="s_dialogForImage = false">mdi-close</v-icon>
          </v-card-title>
          <v-card-text>
            <div style="margin-bottom: 10px;">

              <v-tabs v-model="tab">
                <v-tab value="one">画像</v-tab>
                <v-tab value="two">KMZ</v-tab>
              </v-tabs>

              <v-window v-model="tab">
                <v-window-item value="one">
                  <v-card>
                  <v-card-text style="margin-bottom: 10px;">ドラッグ&ドロップされたgeotif,jpgが表示されます。</v-card-text>
                  <div class="image-grid">
                    <div v-for="item in images" :key="item" class="image-container">
                      <img :src="item" class="gallery-image" @click="handleImageClick(item)" />
                      <div class="close-button" @click="handleClose(item)">×</div>
                    </div>
                  </div>
                  </v-card>

                </v-window-item>
                <v-window-item value="two">
                  <v-card>
                    <v-card-text>作成中です。</v-card-text>

<!--                    <v-card-text>-->
<!--                      <div style="margin-bottom: 10px;">-->
<!--                        <div v-for="item in jsonData" :key="item.id" class="data-container" @click="urlClick(item.url)">-->
<!--                          <button class="close-btn" @click="removeItem(item.id, $event)">×</button>-->
<!--                          <strong>{{ item.name }}</strong><br>-->
<!--                          <strong></strong>{{ item.url }}-->
<!--                        </div>-->
<!--                      </div>-->
<!--                    </v-card-text>-->

                  </v-card>
                </v-window-item>
                <v-window-item value="three">
                  <v-card>
                    <v-card-text>タブ3の内容</v-card-text>
                  </v-card>
                </v-window-item>
              </v-window>
            </div>
          </v-card-text>
        </v-card>
      </v-dialog>

      <div>
        <p v-if="user1">ようこそ、{{ user1.displayName || "ゲスト" }}さん！</p>
        <p v-else></p>
      </div>
      v0.526<br>
      <v-btn @click="reset">リセット</v-btn>
      <v-text-field label="住所で検索" v-model="address" @change="sercheAdress" style="margin-top: 10px"></v-text-field>

      <v-btn class="tiny-btn" @click="simaLoad">SIMA読み込</v-btn>
      <v-btn style="margin-left: 5px;" class="tiny-btn" @click="pngDownload">PNGダウンロード</v-btn>

      <v-switch style="height: 40px;" v-model="s_isClickPointsLayer" @change="changeVisible" label="座標取得レイヤー表示" color="primary" />

      <v-switch style="height: 40px;margin-bottom: 20px;" v-model="s_isPitch" @change="changePitch" label="２画面時に傾きを同期" color="primary" />

      <v-select class="scrollable-content"
                v-model="s_resolution"
                :items="zoomItems"
                label="画像取込最大解像度"
                outlined
                v-if="user1"
      ></v-select>

      標高を強調します。{{s_terrainLevel}}倍
      <div class="range-div">
        <input type="range" min="1" max="10" step="0.1" class="range" v-model.number="s_terrainLevel" @input="terrainLevelInput"/>
      </div>
      <v-btn @click="addLayerDiv=!addLayerDiv">レイヤー追加（XYZタイル）</v-btn>
      <div v-if="addLayerDiv">
        <v-text-field label="レイヤー名を記入" v-model="s_extLayerName" style="margin-top: 10px"></v-text-field>
        <v-text-field label="URLを記入" v-model="s_extLayer" style="margin-top: -15px"></v-text-field>
        <v-btn style="margin-top: -15px;margin-left: 100px;" @click="addLayer">レイヤー追加&変更</v-btn>
      </div>

<!--      <hr style="margin-top: 20px">-->
<!--      今昔マップ<br>{{konjyakuYear}}年の直近（過去）の地図を表示します。-->
<!--      <div class="range-div">-->
<!--        <input type="range" min="1890" max="2024" step="1" class="range" v-model.number="konjyakuYear" @change="konjyakuYearInput"/>-->
<!--      </div>-->

      <hr style="margin-top: 10px;">

    </div>
  </Dialog>
</template>

<script>


import {
  addImageLayer,
  addImageLayerJpg,
  addImageLayerPng,
  addTileLayerForImage,
  geojsonAddLayer,
  simaToGeoJSON
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

export default {
  name: 'Dialog-menu',
  props: ['mapName'],
  components: {
    // MasonryWall,
  },
  data: () => ({
    zoom: 19,
    zoomItems: [13,14,15,16,17,18,19,20,21,22,23,24,25],
    tab: 'one',
    urlName: '',
    jsonData: null,
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
    changeVisible () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map01
      const visibility = this.s_isClickPointsLayer ? "visible" : "none";
      map01.setLayoutProperty("click-points-layer", "visibility", visibility);
      map02.setLayoutProperty("click-points-layer", "visibility", visibility);
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

        if (image && image != '""') {
          const uploadImage = JSON.parse(JSON.parse(image))
          vm.$store.state.uploadedImage = JSON.parse(image)
          const image0 = uploadImage.image
          const code = uploadImage.code
          const uid = uploadImage.uid
          const worldFile = uploadImage.worldFile
          const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + uid + '/' + image0
          const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + uid + '/' + worldFile
          const extension = imageUrl.split('.').pop();
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
          const result = slj0[mapName].find(v => v.id === 'oh-extLayer')
          if (result) {
            extSource.obj.tiles = [vm.$store.state.extLayer]
            result.sources = [extSource]
            result.layers = [extLayer]
            result.label = vm.$store.state.extLayerName
          }
          vm.$store.state.selectedLayers = slj0
        });
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
      // const url = `https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/${this.uid}/`
      const url = `https://kenzkenz.duckdns.org/uploads/${this.uid}/`
      console.log(url)
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const imageElements = doc.querySelectorAll("a");
      this.images = Array.from(imageElements)
          .map(a => a.getAttribute("href"))
          .filter(href => href.startsWith('thumbnail-') && /\.(jpg|jpeg)$/i.test(href))
          .map(href => `${url}${href}`);
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

      // alert("/var/www/html/public_html/tiles/" + dir0 + '/' + dir1)

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



      // const dirMatch = url.match(/^(.*)\/thumbnail-/);
      // const targetMatch = url.match(/thumbnail-(.*?)\./);
      // if (dirMatch && targetMatch) {
      //   const dir = dirMatch[1];  // `thumbnail-` の前の部分を取得
      //   const target = targetMatch[1];
      //   console.log(`ディレクトリ: ${dir}`);
      //   console.log(`ターゲット文字列: ${target}`);
      //   fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/delete-files.php", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json"
      //     },
      //     body: JSON.stringify({ dir: dir, keyword: target })
      //   })
      //       .then(response => response.json())
      //       .then(data => {
      //         console.log(data.message, data.deleted_files);
      //         this.fetchImages(); // 正常終了後に実行
      //         const map01 = this.$store.state.map01
      //         const map02 = this.$store.state.map02
      //         if (map01.getLayer('oh-geotiff-layer')) {
      //           map01.removeLayer('oh-geotiff-layer');
      //         }
      //         if (map01.getSource('geotiff-source')) {
      //           map01.removeSource('geotiff-source');
      //         }
      //         if (map02.getLayer('oh-geotiff-layer')) {
      //           map02.removeLayer('oh-geotiff-layer');
      //         }
      //         if (map02.getSource('geotiff-source')) {
      //           map02.removeSource('geotiff-source');
      //         }
      //       })
      //       .catch(error => console.error("エラー:", error));
      // } else {
      //   console.log("適切な形式のURLではありません");
      // }
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
          addTileLayerForImage(tileUrl,jsonData)
        }
      });


      // async function fetchFile(url) {
      //   try {
      //     // Fetchリクエストでファイルを取得
      //     const response = await fetch(url);
      //     // レスポンスが成功したか確認
      //     if (!response.ok) {
      //       throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      //     }
      //     // Blobとしてレスポンスを取得
      //     const blob = await response.blob();
      //     // BlobをFileオブジェクトに変換
      //     const file = new File([blob], "downloaded_file", { type: blob.type });
      //     console.log("Fileオブジェクトが作成されました:", file);
      //     return file;
      //   } catch (error) {
      //     console.error("ファイルの取得中にエラーが発生しました:", error);
      //   }
      // }
      // // ---------------------------------------------------------------------
      // async function checkFileExists(filename) {
      //   try {
      //     const response = await fetch(filename, { method: 'HEAD' });
      //     return response.ok;
      //   } catch (error) {
      //     console.error('Error checking file:', error);
      //     return false;
      //   }
      // }
      // // ----------------------------------------------------------------------
      // const url = image
      // const tifUrl = url.replace(/thumbnail-(.*)\.jpg/, '$1.tif');
      // const tfwUrl = url.replace(/thumbnail-(.*)\.jpg/, '$1.tfw');
      // const jpgUrl = url.replace(/thumbnail-(.*)\.jpg/, '$1.jpg');
      // const jgwUrl = url.replace(/thumbnail-(.*)\.jpg/, '$1.jgw');
      // const pngUrl = url.replace(/thumbnail-(.*)\.jpg/, '$1.png');
      // const pgwUrl = url.replace(/thumbnail-(.*)\.jpg/, '$1.pgw');
      // const vm = this
      // // tifファイルのとき-------------------------------------------------------
      // checkFileExists(tifUrl).then(exists => {
      //       if (exists) {
      //         checkFileExists(tfwUrl).then(exists => {
      //           if (exists) {
      //             Promise.all([fetchFile(tifUrl), fetchFile(tfwUrl)]).then(files => {
      //               const image = files[0]
      //               const worldFile = files[1]
      //               const match = url.match(/thumbnail-(.*?)-/);
      //               let code = match ? match[1] : null;
      //               code = code.replace(/(EPSG)(\d+)/, '$1:$2');
      //               addImageLayer(image, worldFile, code, true)
      //               vm.$store.state.uploadedImage = JSON.stringify({
      //                 image: tifUrl.split('/').pop(),
      //                 worldFile: tfwUrl.split('/').pop(),
      //                 code: code,
      //                 uid: vm.$store.state.userId
      //               })
      //             });
      //           } else {
      //             Promise.all([fetchFile(tifUrl)]).then(files => {
      //               const image = files[0]
      //               const match = url.match(/thumbnail-(.*?)-/);
      //               let code = match ? match[1] : null;
      //               code = code.replace(/(EPSG)(\d+)/, '$1:$2');
      //               addImageLayer(image, null, code, true)
      //               vm.$store.state.uploadedImage = JSON.stringify({
      //                 image: tifUrl.split('/').pop(),
      //                 code: code,
      //                 uid: vm.$store.state.userId
      //               })
      //             });
      //             console.log("クリックした画像:", image);
      //             // alert(`画像がクリックされました: ${image}`);
      //           }
      //         })
      //       }
      // })
      // // jpgファイルのとき-------------------------------------------------------
      // checkFileExists(jpgUrl).then(exists => {
      //       if (exists) {
      //         Promise.all([fetchFile(jpgUrl), fetchFile(jgwUrl)]).then(files => {
      //           const image = files[0]
      //           const worldFile = files[1]
      //           const match = url.match(/thumbnail-(.*?)-/);
      //           let code = match ? match[1] : null;
      //           code = code.replace(/(EPSG)(\d+)/, '$1:$2');
      //           addImageLayerJpg(image, worldFile, code, true)
      //           vm.$store.state.uploadedImage = JSON.stringify({
      //             image: jpgUrl.split('/').pop(),
      //             worldFile: jgwUrl.split('/').pop(),
      //             code: code,
      //             uid: vm.$store.state.userId
      //           })
      //         });
      //       }
      // })
      // // pngファイルのとき-------------------------------------------------------
      // checkFileExists(pngUrl).then(exists => {
      //   if (exists) {
      //     Promise.all([fetchFile(pngUrl), fetchFile(pgwUrl)]).then(files => {
      //       const image = files[0]
      //       const worldFile = files[1]
      //       const match = url.match(/thumbnail-(.*?)-/);
      //       let code = match ? match[1] : null;
      //       code = code.replace(/(EPSG)(\d+)/, '$1:$2');
      //       addImageLayerPng(image, worldFile, code, true)
      //       vm.$store.state.uploadedImage = JSON.stringify({
      //         image: pngUrl.split('/').pop(),
      //         worldFile: pgwUrl.split('/').pop(),
      //         code: code,
      //         uid: vm.$store.state.userId
      //       })
      //     });
      //   }
      // })
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
    },
    s_fetchImagesFire () {
      this.fetchImages()
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
</style>

