<script setup>
import { user as user1 } from "@/authState"; // グローバルの認証情報を取得
</script>

<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="menu-div">

      <input @change="simaUploadInput" type="file" id="simaFileInput" accept=".sim" style="display: none;">

      <v-dialog v-model="dialogForUpload" max-width="500px">
        <v-card>
          <v-card-title>
            アップロード選択!
          </v-card-title>

          <v-card-text>
            <v-tabs mobile-breakpoint="0" v-model="tab">
              <v-tab value="0">SIMA</v-tab>
              <v-tab value="1">geotif</v-tab>
              <v-tab value="2">JPG</v-tab>
              <v-tab value="3">PNG</v-tab>
            </v-tabs>

            <v-window v-model="tab">
              <v-window-item value="0" class="my-v-window">
                <v-card>
                  <div v-if="s_isAndroid" class="select-container">
                    <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                      <option value="" disabled selected>座標を選択してください。</option>
                      <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
                        公共座標{{ number }}系
                      </option>
                    </select>
                  </div>
                  <div v-else>
                    <v-select class="scrollable-content"
                              v-model="s_zahyokei"
                              :items="items"
                              label="選択してください"
                              outlined
                              @update:menu="onMenuToggle"
                    ></v-select>
                  </div>
                  <v-btn style="margin-top: 0px;margin-bottom: 10px" @click="simaUploadBtn">SIMA読込開始</v-btn>
                </v-card>
              </v-window-item>
              <v-window-item value="1" class="my-v-window">
                <v-card>
                  作成中
                </v-card>
              </v-window-item>
              <v-window-item value="2" class="my-v-window">
                <v-card>
                  作成中
                </v-card>
              </v-window-item>
              <v-window-item value="3" class="my-v-window">
                <v-card>
                  作成中
                </v-card>
              </v-window-item>
            </v-window>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForUpload = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForLogin" max-width="500px">
        <v-card>
          <v-card-title>
            <p v-if="user1">ようこそ、{{ user1.displayName }}さん！</p>
          </v-card-title>
          <v-card-text>

            <div style="margin-top: 10px;">
              <v-btn v-if="!user1" @click="loginDiv=!loginDiv,signUpDiv=false">ログイン</v-btn><v-btn v-if="user1" @click="logOut">ログアウト</v-btn>
              <v-btn style="margin-left: 10px;" v-if="!user1" @click="signUpDiv=!signUpDiv,loginDiv=false">新規登録</v-btn>
              <span v-if="!user1" style="margin-left: 20px;">新規登録は無料です。</span>

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

      <div>
        <p v-if="user1">ようこそ、{{ user1.displayName || "ゲスト" }}さん！</p>
        <p v-else></p>
      </div>
      <p style="margin-top: 10px;margin-bottom: 10px;">
        v0.691
      </p>
      <v-btn @click="reset">リセット</v-btn>
      <v-text-field label="住所で検索" v-model="address" @change="sercheAdress" style="margin-top: 10px"></v-text-field>

<!--      <v-btn class="tiny-btn" @click="simaLoad">SIMA読み込</v-btn>-->
      <v-btn class="tiny-btn" @click="upLoad">各種アップロード</v-btn>
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
  geojsonAddLayer, highlightSpecificFeaturesCity, iko, scrollForAndroid, simaFileUpload,
  simaToGeoJSON, userPmileSet, userPmtileSet, userTileSet, userXyztileSet
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
    tab: 0,
    tileUrl: '',
    tileName: '',
    urlName: '',
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
    dialogForUpload: false,
    items: [
      'WGS84',
      '公共座標1系', '公共座標2系', '公共座標3系',
      '公共座標4系', '公共座標5系', '公共座標6系',
      '公共座標7系', '公共座標8系', '公共座標9系',
      '公共座標10系', '公共座標11系', '公共座標12系',
      '公共座標13系', '公共座標14系', '公共座標15系',
      '公共座標16系', '公共座標17系', '公共座標18系',
      '公共座標19系'
    ],
  }),
  computed: {
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    s_zahyokei: {
      get() {
        return this.$store.state.zahyokei
      },
      set(value) {
        this.$store.state.zahyokei = value
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
    simaUploadInput (event) {
      simaFileUpload(event)
      this.dialogForUpload = false
    },
    simaUploadBtn () {
      if (!this.s_zahyokei) {
        alert('選択してください。')
        return
      }
      document.querySelector('#simaFileInput').click()
      document.querySelector('#simaFileInput').value = ''
    },
    changeVisible () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map01
      const visibility = this.s_isClickPointsLayer ? "visible" : "none";
      map01.setLayoutProperty("click-points-layer", "visibility", visibility);
      map02.setLayoutProperty("click-points-layer", "visibility", visibility);
    },
    createDirectory () {
      // getFirebaseUid()
      createUserDirectory()
    },
    logOut () {
      const logout = async () => {
        try {
          await signOut(auth); // ここで `auth` を明示的に指定
          this.$store.state.userId = 'dummy'
          this.s_fetchImagesFire = !this.s_fetchImagesFire
          alert("ログアウトしました");
        } catch (error) {
          console.error("ログアウトエラー:", error.message);
        }
      };
      logout()
    },
    signUp () {
      if (!(this.email && this.password &&this.nickname)) {
        alert('入力されていません。')
        return
      }
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
          this.$store.state.userId = user._rawValue.uid
          this.s_fetchImagesFire = !this.s_fetchImagesFire
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
              this.$store.state.userId = user._rawValue.uid
              this.s_fetchImagesFire = !this.s_fetchImagesFire
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
    onMenuToggle () {
      // alert()
      // scrollForAndroid('.v-menu__content')
    },
    upLoad () {
      this.$store.state.isMenu = true
      this.dialogForUpload = true
      // scrollForAndroid('.v-menu__content')
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
  },
  mounted() {
    // 非同期で user の UID を監視
    const checkUser = setInterval(() => {
      if (user && user._rawValue && user._rawValue.uid) {
        this.uid = user._rawValue.uid;
        this.$store.state.userId = user._rawValue.uid
        clearInterval(checkUser); // UIDを取得できたら監視を停止


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
.my-v-window {
  margin-top: 20px;
}
/* スマホ用のスタイル */
@media screen and (max-width: 500px) {
  .menu-div {
    padding: 20px;
  }
}
</style>

