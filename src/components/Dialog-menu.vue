<template>
  <v-app>
    <HillshadeControl
        v-if="mapReady"
        ref="hs"
        :map="map01"
        dem-source-id="terrain"
        :start-enabled="true"
        :auto-anchor="true"
        style="display:none"
    />
    <HillshadeControl
        v-if="mapReady"
        ref="hs"
        :map="map02"
        dem-source-id="terrain"
        :start-enabled="true"
        :auto-anchor="true"
        style="display:none"
    />

    <v-snackbar v-model="snackbar" :timeout="3000" color="primary">
      {{ snackbarText }}
    </v-snackbar>
    <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="menu-div">
      <input @change="simaUploadInput" type="file" id="simaFileInput" accept=".sim" style="display: none;">
      <v-dialog v-model="dialogForUpload" max-width="500px">
        <v-card>
          <v-card-title>
            アップロード
          </v-card-title>

          <v-card-text>
            <v-tabs mobile-breakpoint="0" v-model="tab">
              <v-tab value="0">SIMA</v-tab>
<!--              <v-tab value="1">geotif</v-tab>-->
<!--              <v-tab value="2">JPG</v-tab>-->
<!--              <v-tab value="3">PNG</v-tab>-->
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

      <p style="margin-top: 3px;margin-bottom: 10px;">
        v{{ clientVersion }}
      </p>

      <v-btn style="width:100%;margin-bottom: 20px;" @click="reset">リセット（初期時に戻す）</v-btn>
      座標検索で使用する系を選択
      <select style="margin-left: 8px;" class="oh-cool-select" v-model="zahyokeiForSercheAdress">
        <option v-for="item in items" :key="item" :value="item">
          {{ item }}
        </option>
      </select>
      <v-text-field
          variant="outlined"
          density="compact"
          label="住所、座標で検索"
          v-model="address"
          @change="sercheAdress"
          style="margin-top: 10px"
      ></v-text-field>

      <v-btn class="tiny-btn" @click="upLoad">各種アップロード</v-btn>
      <v-btn style="margin-left: 5px;" class="tiny-btn" @click="pngDownload">画面保存</v-btn>
      <v-btn style="margin-left: 5px;" class="tiny-btn" @click="s_dialogForOffline = true">オフライン設定</v-btn>

      <v-switch style="height: 40px;" v-model="s_isPitch" @change="changePitch" label="２画面時に傾きを同期" color="primary" />
      <v-switch style="height: 40px;" v-model="s_isWindow" label="ウインドウ復帰" color="primary" />
      <v-switch style="height: 40px;" v-model="s_mapillary" label="mapillary" color="primary" />
      <v-switch style="height: 40px;margin-bottom: 20px;" v-model="s_isContextMenu" label="右クリックメニュー" color="primary" />

      起動時レイヤーを現在のレイヤーに設定します。
      <v-btn style="margin-top: 10px;margin-bottom: 10px; width: 100%" @click="setStartUrl">起動時レイヤー設定変更</v-btn>

      <div class="range-div">
        標高を強調します。{{s_terrainLevel}}倍<br>
        <input style="width: 100%;margin-top: 10px;" type="range" min="1" max="10" step="0.1" class="range" v-model.number="s_terrainLevel" @input="terrainLevelInput"/>
      </div>

<!--      <HillshadePanel :map="map01" :map-ready="mapReady" v-if="mapReady"/>-->
      <HillshadePanel
          v-if="mapReady"
          :map="map01"
          :controller="hsRef"
      />

      <p style="margin-top: 10px;">お問合せなど、サイト管理者への御連絡は、<a href="https://x.com/kenzkenz" target="_blank">https://x.com/kenzkenz</a>にDMを送ってください。</p>
    </div>
  </Dialog>
  </v-app>
</template>

<script>

import {jgd2000ZoneToWgs84, mapillaryFilterRiset, simaFileUpload, startUrl} from "@/js/downLoad";
import axios from "axios"
import maplibregl from 'maplibre-gl'
import {history} from "@/App";
import firebase from '@/firebase'
import store from "@/store";
import {mapState} from "vuex";
import HillshadeControl from "@/components/HillshadeControl";
import HillshadePanel from '@/components/HillshadePanel'

export default {
  name: 'Dialog-menu',
  props: ['mapName'],
  components: {
    HillshadeControl,
    HillshadePanel,
  },
  data: () => ({
    hsRef: null,
    isLoggedIn: false,
    newName: '',
    message: '',
    alertType: 'info',
    layerName: '',
    joinLoading: false,
    invitedGroupName: "", // 招待されたグループ名
    isSendingInvite: false, // ローディング状態
    joinGroupId: "", // 入力されたグループID
    groupId: "",
    emailInput: "",         // 入力フォームのメールアドレス
    groupIdFromURL: "",     // URL から取得した groupId
    emailRules: [
      (v) => !!v || "メールアドレスを入力してください",
      (v) => /.+@.+\..+/.test(v) || "正しいメールアドレスを入力してください"
    ],
    inviteEmail: '',
    initialGroupName: localStorage.getItem("lastUsedGroupName") || "",
    snackbar: false,
    snackbarText: '',
    isGroupOwner: false,
    selectMenuOpen1: false,
    selectMenuOpen2: false,
    selectMenuOpen3: false,
    groupOptions: [],
    selectedGroupId: null,
    selectedGroupId2: null,
    inviteGroupId: null,
    groupName: '',
    tab: 0,
    tileUrl: '',
    tileName: '',
    urlName: '',
    uid: null,
    images: [],
    nickname: '',
    email: '',
    password: '',
    errorMsg: '',
    konjyakuYear: '1890',
    address: '',
    addLayerDiv: false,
    loginDiv: false,
    signUpDiv: false,
    showAuthArea: false, // 👈 追加（初期は非表示）
    dialogForUpload: false,
    zahyokeiForSercheAdress: 'WGS84',
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
    ...mapState([
      'map01',
      'map02',
      'mapReady',
      'myNickname',
      'clientVersion',
      'myNickname',
    ]),
    s_dialogForOffline: {
      get() {
        return this.$store.state.dialogForOffline
      },
      set(value) {
        this.$store.state.dialogForOffline = value
      }
    },
    s_myNickname() {
      return this.$store.state.myNickname;
    },
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
    s_isContextMenu: {
      get() {
        return this.$store.state.isContextMenu
      },
      set(value) {
        this.$store.state.isContextMenu = value
        localStorage.setItem('isContextMenu',value)
      }
    },
    s_mapillary: {
      get() {
        return this.$store.state.mapillaryFlg
      },
      set(value) {
        this.$store.state.mapillaryFlg = value
        localStorage.setItem('mapillary',value)
      }
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
    async setStartUrl() {
      await startUrl()
    },
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
    pngDownload () {
      this.$store.state.dialogForPngApp = true
    },
    upLoad () {
      this.$store.state.isMenu = true
      this.dialogForUpload = true
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

      const input = this.address.trim();
      // 角括弧あり・なし両対応の正規表現
      const coordRegex = /^\s*\[?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]?\s*$/;
      const match = coordRegex.exec(input);

      if (match) {
        let lat, lon;
        let val1 = parseFloat(match[1]);
        let val2 = parseFloat(match[2]);
        if (this.zahyokeiForSercheAdress === 'WGS84') {
          // 緯度・経度を自動判別
          if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
            lat = val1;
            lon = val2;
          } else if (Math.abs(val2) <= 90 && Math.abs(val1) <= 180) {
            lat = val2;
            lon = val1;
          }
        } else {
          const zahyokeiMatch = this.zahyokeiForSercheAdress.match(/\d+/);
          const zone = zahyokeiMatch ? parseInt(zahyokeiMatch[0], 10) : null;
          const latLon  = jgd2000ZoneToWgs84(zone, val2, val1)
          lat = latLon.lat
          lon = latLon.lon
        }

        if (lat !== undefined && lon !== undefined) {
          map.flyTo({ center: [lon, lat], zoom: 14 });
          // flyToアニメーション完了後にユーザー操作を再度有効化
          map.once('moveend', () => {
            map.scrollZoom.enable();
            // alert('pan')
            map.dragPan.enable();
            map.keyboard.enable();
            map.doubleClickZoom.enable();
          });
          // 検索結果の位置にマーカーを追加
          const marker = new maplibregl.Marker()
              .setLngLat([lon, lat])
              .addTo(map);
          // マーカーをクリックしたときにマーカーを削除
          marker.getElement().addEventListener('click', () => {
            marker.remove(); // マーカーをマップから削除
          });
          return;
        }
      }

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
              // alert('pan')
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
    },
  },
  watch: {
    myNickname() {
      document.querySelector('#drag-handle-menuDialog-map01').innerHTML = '<span style="font-size: large;">メニュー ようこそ' + this.myNickname + 'さん</span>'
    },
    s_mapillary(value) {
      mapillaryFilterRiset()
      if (value) {
        store.dispatch('showFloatingWindow', 'mapillary');
      } else {
        store.dispatch('hideFloatingWindow', 'mapillary');
      }
    },
    mapReady(value) {
      if (value) {
        this.$nextTick(() => { this.hsRef = this.$refs.hs })
      }
    },
  },
  mounted() {
    document.querySelector('#drag-handle-menuDialog-map01').innerHTML = '<span style="font-size: large;">メニュー</span>'
    // Firebase の認証状態が確定するまで監視
    if (!store.state.isOffline) {
      firebase.auth().onAuthStateChanged(user => {
        if (user && user.email) {
          console.log("✅ ログイン中のユーザー:", user.email);
          this.emailInput = user.email;
          store.state.myNickname = user.displayName || ''
          this.newName = user.displayName
          this.isLoggedIn = true
        } else {
          console.warn("⚠️ ログイン中のユーザーが見つかりません");
          this.emailInput = ""; // ログインしていない場合は空に
        }
      });
    }
    // URLパラメータからグループIDとグループ名を取得
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("group");
    const groupName = params.get("groupName");
    if (groupId) {
      this.joinGroupId = groupId;
      this.invitedGroupName = groupName || "不明なグループ";
      this.tab = "9";
      this.s_dialogForGroup = true;
    }

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
    if (localStorage.getItem('mapillary')) {
      this.s_mapillary = JSON.parse(localStorage.getItem('mapillary'))
    }
    if (localStorage.getItem('isContextMenu')) {
      this.s_isContextMenu = JSON.parse(localStorage.getItem('isContextMenu'))
    }
  },
}
</script>
<style scoped>
.menu-div {
  height: auto;
  width: 310px;
  margin: 10px;
  overflow: auto;
  user-select: text;
  font-size: 14px;
  color: black;
  background-color: white;
}
.my-v-window {
  margin-top: 20px;
}
/* スマホ用のスタイル */
@media screen and (max-width: 500px) {
  .menu-div {
    margin: 0px;
    padding: 10px 30px 30px 30px;
    width: 100%;
  }
}
</style>

