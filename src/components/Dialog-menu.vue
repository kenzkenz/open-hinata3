<script setup>
import { user as user1 } from "@/authState"; // グローバルの認証情報を取得
</script>

<template>
  <v-app>

    <v-snackbar v-model="snackbar" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

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
            ログイン管理
            <span v-if="user1 && user1.displayName" style="margin-left:20px;font-size: 16px;">
              ようこそ、{{ user1.displayName }}さん！
            </span>
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

      <!-- グループ管理ダイアログ -->
      <v-dialog v-model="s_dialogForGroup" max-width="500px" height="500px">
        <v-card>
          <v-card-title>
            グループ管理
          </v-card-title>

          <v-card-text>
            <v-tabs mobile-breakpoint="0" v-model="tab">
              <v-tab value="9">参加</v-tab>
              <v-tab value="0">作成</v-tab>
              <v-tab value="1">招待</v-tab>
              <v-tab value="2">変更</v-tab>
              <v-tab value="3">削除</v-tab>
            </v-tabs>

            <v-window v-model="tab">
              <v-window-item value="9" class="my-v-window">
                <!-- グループID入力欄を追加 -->
<!--                <v-text-field-->
<!--                    v-model="joinGroupId"-->
<!--                    label="グループIDを入力（招待リンクから取得）"-->
<!--                    outlined-->
<!--                    clearable-->
<!--                    :rules="[v => !!v || 'グループIDを入力してください']"-->
<!--                />-->
                <v-text-field
                    v-model="joinGroupId"
                    label="グループID"
                    outlined
                    clearable
                    :rules="[v => !!v || 'グループIDを入力してください']"
                    :disabled="joinGroupId"
                />
                <v-text-field
                    v-model="emailInput"
                    label="あなたのメールアドレスを入力"
                    type="email"
                    :rules="emailRules"
                    outlined
                    clearable
                    required
                />
                <v-btn
                    color="primary"
                    @click="joinGroupFromDialog"
                    :disabled="!emailInput || !joinGroupId || !/.+@.+\..+/.test(emailInput)"
                >
                  参加する
                </v-btn>
              </v-window-item>
              <v-window-item value="0" class="my-v-window">
                <div class="create-group" v-if="user1 && !loginDiv && !signUpDiv">
                  <v-text-field v-model="groupName" label="グループ名" />
                  <v-btn @click="createGroup">グループ作成</v-btn>
                </div>
              </v-window-item>

              <v-window-item value="1" class="my-v-window">
                <div style="margin-bottom: 20px;">
                  <div v-if="s_currentGroupName">
                    現在のグループは「{{ s_currentGroupName }}」です。
                  </div>
                  <div v-else>
                    グループに所属していません。
                  </div>
                </div>
                <v-select
                    v-model="selectedGroupId"
                    :items="groupOptions.filter((g, i) => i !== 0)"
                    item-value="id"
                    item-title="name"
                    label="グループを選択"
                    outlined
                    dense
                    class="mt-2"
                    @update:modelValue="onGroupChange"
                    v-model:menu="selectMenuOpen1"
                    :disabled="isSendingInvite"
                />
                <v-text-field
                    v-model="inviteEmail"
                    :rules="emailRules"
                    label="メールアドレスで招待"
                    :disabled="isSendingInvite"
                />
                <v-btn style="margin-top: 10px;"
                    @click="sendInvite"
                    :disabled="isSendingInvite"
                    :loading="isSendingInvite"
                >
                  招待を送信
                </v-btn>

                <v-btn v-if="selectedGroupId && inviteEmail && !isSendingInvite" style="margin-top: 10px;margin-left: 30px;"
                    @click="copyInviteLink"
                >
                  下記招待リンクをコピー
                </v-btn>
                <div v-if="selectedGroupId && inviteEmail && !isSendingInvite" style="margin-top: 10px;">
                  <p>招待リンク（手動で共有する場合）:</p>
                  <span style="font-size: small">
                  <a
                      :href="`https://kenzkenz.xsrv.jp/open-hinata3/?group=${selectedGroupId}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="invite-link"
                  >
                    {{ `https://kenzkenz.xsrv.jp/open-hinata3/?group=${selectedGroupId}` }}
                  </a>
                  </span>
                </div>


<!--                <div v-if="selectedGroupId && inviteEmail && !isSendingInvite" style="margin-top: 10px;">-->
<!--                  <p>招待リンク（手動で共有する場合）:</p>-->
<!--                  <a-->
<!--                      :href="`https://kenzkenz.xsrv.jp/open-hinata3/join?group=${selectedGroupId}`"-->
<!--                      target="_blank"-->
<!--                      rel="noopener noreferrer"-->
<!--                  >-->
<!--                    {{ `https://kenzkenz.xsrv.jp/open-hinata3/join?group=${selectedGroupId}` }}-->
<!--                  </a>-->
<!--                </div>-->
              </v-window-item>

              <v-window-item value="2" class="my-v-window">
                <div style="margin-bottom: 20px;">
                  <div v-if="s_currentGroupName">
                    現在のグループは「{{ s_currentGroupName }}」です。
                  </div>
                  <div v-else>
                    グループに所属していません。
                  </div>
                </div>
                <v-select
                    ref="groupSelect1"
                    v-model="selectedGroupId"
                    :items="groupOptions"
                    item-value="id"
                    item-title="name"
                    label="グループを選択"
                    outlined
                    dense
                    class="mt-2"
                    @update:modelValue="onGroupChange"
                    v-model:menu="selectMenuOpen2"
                />
<!--                <v-btn @click="kakunin">確認</v-btn>-->
              </v-window-item>
              <v-window-item value="3" class="my-v-window">
                <v-select
                    ref="groupSelect3"
                    v-model="selectedGroupId2"
                    :items="ownerGroupOptions"
                    item-value="id"
                    item-title="name"
                    label="削除するグループを選択"
                    outlined
                    dense
                    class="mt-2"
                    @update:modelValue="deleteBtn"
                    v-model:menu="selectMenuOpen3"
                />
                <div v-if="ownerGroupOptions.length === 0" style="margin-top: 20px; color: gray;">
                  オーナー権限を持つグループがありません。
                </div>
                <v-btn
                    v-if="canDeleteSelectedGroup"
                    color="red"
                    @click="deleteGroup"
                >
                  <v-icon start>mdi-delete</v-icon>
                  グループを削除
                </v-btn>
              </v-window-item>
            </v-window>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForGroup = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <p style="margin-top: 3px;margin-bottom: 10px;">
        v0.805
      </p>
      <div v-if="user1">
        <p style="margin-bottom: 20px;">
          <template v-if="initialGroupName && initialGroupName !== ''">
            現在のグループは「{{ initialGroupName }}」です。
          </template>
          <template v-else>
            グループに所属していません。
          </template>
        </p>
      </div>

      <v-btn style="width:100%;margin-bottom: 20px;" @click="reset">リセット（初期時に戻す）</v-btn>
      <v-text-field label="住所で検索" v-model="address" @change="sercheAdress" style="margin-top: 10px"></v-text-field>

<!--      <v-btn class="tiny-btn" @click="simaLoad">SIMA読み込</v-btn>-->
      <v-btn class="tiny-btn" @click="upLoad">各種アップロード</v-btn>
      <v-btn style="margin-left: 5px;" class="tiny-btn" @click="pngDownload">PNGダウンロード</v-btn>

      <v-switch style="height: 40px;" v-model="s_isClickPointsLayer" @change="changeVisible" label="座標取得レイヤー表示" color="primary" />

      <v-switch style="height: 40px;" v-model="s_isPitch" @change="changePitch" label="２画面時に傾きを同期" color="primary" />

      <v-switch style="height: 40px;" v-model="s_isWindow" label="ウインドウ復帰" color="primary" />

      <v-switch style="height: 40px;margin-bottom: 20px;" v-model="s_mapillary" label="mapillary" color="primary" />

      <div class="range-div" style="text-align: center">
        標高を強調します。{{s_terrainLevel}}倍
        <input style="width: 200px" type="range" min="1" max="10" step="0.1" class="range" v-model.number="s_terrainLevel" @input="terrainLevelInput"/>
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
  </v-app>
</template>

<script>

import {iko, simaFileUpload} from "@/js/downLoad";
import { db, auth } from '@/firebase'
import {user} from "@/authState";
import axios from "axios"
import maplibregl from 'maplibre-gl'
import {history} from "@/App";
import {extLayer, extSource, konUrls} from "@/js/layers";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import firebase from '@/firebase'
import { nextTick } from 'vue'
import store from "@/store";

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

export default {
  name: 'Dialog-menu',
  props: ['mapName'],
  components: {
  },
  data: () => ({
    // 追加
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
    // showGroupName: false,
    // lastSetTime: 0,
    snackbar: false,
    snackbarText: '',
    isGroupOwner: false,
    selectMenuOpen1: false, // ← false にしておくことで勝手に開かないように
    selectMenuOpen2: false,
    selectMenuOpen3: false,
    groupOptions: [],
    selectedGroupId: null,
    selectedGroupId2: null,
    groupName: '',
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
    showAuthArea: false, // 👈 追加（初期は非表示）
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
    // 追加: 自分がオーナーであるグループのみを抽出
    ownerGroupOptions() {
      // groupOptions から「グループなし」を除外し、ownerUid が currentUserId と一致するもののみをフィルタリング
      return this.groupOptions
          .filter((g, i) => i !== 0) // 「グループなし」を除外
          .filter(g => g.ownerUid === this.currentUserId);
    },
    canDeleteSelectedGroup() {
      const selectedGroup = this.groupOptions.find(g => g.id === this.selectedGroupId2)
      console.log('selectedGroup:', selectedGroup)
      console.log('currentUserId:', this.currentUserId)
      return selectedGroup && selectedGroup.ownerUid === this.currentUserId
    },
    s_dialogForGroup: {
      get() {
        return this.$store.state.dialogForGroup
      },
      set(value) {
        this.$store.state.dialogForGroup = value
      }
    },
    currentUserId() {
      return this.$store.state.userId
    },
    s_currentGroupName: {
      get() {
        return this.$store.state.currentGroupName
      },
      set(value) {
        this.$store.state.currentGroupName = value
      }
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
    isAdministrator () {
      return this.s_userId === 'dqyHV8DykbdSVvDXrHc7xweuKT02'
    },
    s_userId () {
      return this.$store.state.userId
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
    copyInviteLink() {
      const inviteLink = `https://kenzkenz.xsrv.jp/open-hinata3/?group=${this.selectedGroupId}`;
      navigator.clipboard.writeText(inviteLink).then(() => {
        this.snackbarText = "招待リンクをコピーしました";
        this.snackbar = true;
      }).catch(err => {
        console.error("リンクのコピーに失敗しました:", err);
        this.snackbarText = "リンクのコピーに失敗しました";
        this.snackbar = true;
      });
    },
    async joinGroupFromDialog() {
      try {
        this.groupId = this.joinGroupId;
        await this.joinGroup();
        this.tab = 0; // 成功したら「作成」タブに戻す（任意）
      } catch (error) {
        console.error("❌ グループ参加処理でエラーが発生しました:", error);
        alert(`エラーが発生しました: ${error.message}`);
      }
    },
    async joinGroup() {
      try {
        if (!this.emailInput) {
          alert("メールアドレスを入力してください");
          return;
        }

        if (!this.groupId || typeof this.groupId !== "string") {
          alert("グループIDを入力してください");
          return;
        }

        const user = firebase.auth().currentUser;
        if (!user) {
          alert("ログインしてください！");
          return;
        }

        const userRef = firebase.firestore().collection("users").doc(user.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const groups = userDoc.data().groups || [];
          if (groups.includes(this.groupId)) {
            alert("すでにこのグループに参加済みです！");
            return;
          }
        } else {
          console.warn(`⚠️ users/${user.uid} ドキュメントが存在しません`);
        }

        console.log("✅ 入力されたメール:", this.emailInput);
        console.log("✅ 取得した groupId:", this.groupId);

        await firebase.firestore().runTransaction(async (transaction) => {
          const query = firebase.firestore()
              .collection("invitations")
              .where("email", "==", this.emailInput)
              .where("groupId", "==", this.groupId);

          const snapshot = await query.get();
          if (snapshot.empty) {
            throw new Error("招待が見つかりませんでした。メールアドレスが正しいかご確認ください。");
          }

          const invitationDoc = snapshot.docs[0];
          const invitationRef = invitationDoc.ref;
          const currentStatus = invitationDoc.data().status;

          console.log("📦 取得したステータス:", currentStatus);

          if (currentStatus !== "joined") {
            transaction.update(invitationRef, { status: "joined" });
            console.log("✅ Firestoreのstatusをjoinedに更新しました");
          } else {
            console.log("ℹ️ すでにjoined状態でしたが、usersにも追加します");
          }

          transaction.set(
              userRef,
              {
                groups: firebase.firestore.FieldValue.arrayUnion(this.groupId),
              },
              { merge: true }
          );

          const groupRef = firebase.firestore().collection("groups").doc(this.groupId);
          transaction.set(
              groupRef,
              {
                members: firebase.firestore.FieldValue.arrayUnion(user.uid),
              },
              { merge: true }
          );
        });

        const updatedUserDoc = await userRef.get();
        if (updatedUserDoc.exists) {
          const groups = updatedUserDoc.data().groups || [];
          if (groups.includes(this.groupId)) {
            console.log(`🟢 成功: groupId ${this.groupId} が users/${user.uid} に追加されました`);
          } else {
            console.warn(`🔴 失敗: groupId ${this.groupId} が users/${user.uid} に見つかりません`);
            throw new Error("グループへの参加に失敗しました。");
          }
        } else {
          console.warn(`⚠️ users/${user.uid} ドキュメントが存在しません`);
          throw new Error("ユーザー情報の取得に失敗しました。");
        }

        alert("🎉 参加が完了しました！");
      } catch (error) {
        console.error("❌ グループ参加処理でエラーが発生しました:", error);
        alert(`エラーが発生しました: ${error.message}`);
      }
    },
    kakunin () {
      const user = firebase.auth().currentUser;
      if (user) {
        console.log("✅ ログイン中のユーザー:", user.email);
      } else {
        console.log("❌ ログインしていません");
      }
    },
    async sendInvite() {
      try {
        // ローディング開始
        this.isSendingInvite = true;

        // バリデーション
        if (!this.inviteEmail || !/.+@.+\..+/.test(this.inviteEmail)) {
          this.snackbarText = "正しいメールアドレスを入力してください";
          this.snackbar = true;
          return;
        }
        if (!this.selectedGroupId) {
          this.snackbarText = "グループを選択してください";
          this.snackbar = true;
          return;
        }

        const group = this.groupOptions.find(g => g.id === this.selectedGroupId);
        if (!group) {
          this.snackbarText = "選択したグループが見つかりません";
          this.snackbar = true;
          return;
        }

        // Firestore に保存
        await db.collection("invitations").add({
          email: this.inviteEmail,
          groupId: this.selectedGroupId,
          groupName: group.name,
          invitedBy: this.currentUserId,
          status: "pending",
          createdAt: new Date(),
        });

        // PHP (SMTPメール送信) に送信
        const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/invite_mail.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: this.inviteEmail,
            group: group.name,
            groupId: this.selectedGroupId, // groupId を追加
          }),
        });

        const result = await response.json();

        if (result.success) {
          this.snackbarText = "招待メールを送信しました";
          this.snackbar = true;
          this.inviteEmail = ""; // 招待済みのメールをリセット
        } else {
          this.snackbarText = `メール送信に失敗しました: ${result.message}`;
          this.snackbar = true;
        }
      } catch (err) {
        console.error("招待送信エラー:", err);
        this.snackbarText = "サーバーへの接続に失敗しました: " + err.message;
        this.snackbar = true;
      } finally {
        // ローディング終了
        this.isSendingInvite = false;
      }
    },
    // async sendInvite() {
    //   // メールアドレスとグループ名のバリデーション
    //   if (!this.inviteEmail || !/.+@.+\..+/.test(this.inviteEmail)) {
    //     alert("正しいメールアドレスを入力してください");
    //     return;
    //   }
    //   if (!this.selectedGroupId || !this.initialGroupName) {
    //     alert("グループを選択してください");
    //     return;
    //   }
    //   // Firestore に保存（例: Firestore を使う場合）
    //   try {
    //     // Firestore に保存
    //     await db.collection("invitations").add({
    //       email: this.inviteEmail,
    //       groupId: this.selectedGroupId,
    //       groupName: this.groupOptions.find(g => g.id === this.selectedGroupId)?.name,
    //       invitedBy: this.currentUserId,
    //       status: "pending",
    //       createdAt: new Date()
    //     });
    //
    //   } catch (e) {
    //     console.error("Firestore 保存失敗:", e);
    //     alert("Firestore への保存に失敗しました");
    //     return;
    //   }
    //
    //   // PHP (SMTPメール送信) に送信
    //   try {
    //     const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/invite_mail.php", {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       body: JSON.stringify({
    //         email: this.inviteEmail,
    //         group: this.initialGroupName
    //       })
    //     });
    //
    //     const result = await response.json();
    //
    //     if (result.success) {
    //       alert("招待メールを送信しました。");
    //     } else {
    //       alert("メール送信に失敗しました: " + result.message);
    //     }
    //   } catch (err) {
    //     console.error("PHPへの送信エラー:", err);
    //     alert("サーバーへの接続に失敗しました");
    //   }
    //   // 招待済みのメールはリセット（任意）
    //   // this.inviteEmail = "";
    // },
    // async sendInvite() {
    //   if (!this.inviteEmail || !/.+@.+\..+/.test(this.inviteEmail)) {
    //     alert("正しいメールアドレスを入力してください");
    //     return;
    //   }
    //   if (!this.selectedGroupId) {
    //     alert("グループを選択してください");
    //     return;
    //   }
    //
    //   // Firestore 登録などはここに
    //
    //   // PHP へメール送信
    //   try {
    //     const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/invite_mail.php", {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       body: JSON.stringify({
    //         email: this.inviteEmail,
    //         groupName: this.groupOptions.find(g => g.id === this.selectedGroupId)?.name,
    //         groupId: this.selectedGroupId
    //       })
    //     });
    //
    //     const result = await response.json();
    //
    //     if (result.success) {
    //       alert("招待メールを送信しました。");
    //     } else {
    //       alert("メール送信に失敗しました: " + result.message);
    //     }
    //   } catch (err) {
    //     console.error("PHPへの送信エラー:", err);
    //     alert("サーバーへの接続に失敗しました");
    //   }
    // },







    // async sendInvite() {
    //   if (!this.inviteEmail || !/.+@.+\..+/.test(this.inviteEmail)) {
    //     alert("正しいメールアドレスを入力してください");
    //     return;
    //   }
    //   if (!this.selectedGroupId) {
    //     alert("グループを選択してください");
    //     return;
    //   }
    //
    //   // Firestore に保存
    //   await db.collection("invitations").add({
    //     email: this.inviteEmail,
    //     groupId: this.selectedGroupId,
    //     groupName: this.groupOptions.find(g => g.id === this.selectedGroupId)?.name,
    //     invitedBy: this.currentUserId,
    //     status: "pending",
    //     createdAt: new Date()
    //   });
    //
    //   // PHP にメール送信リクエスト
    //   try {
    //     const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/invite_mail.php", {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       body: JSON.stringify({
    //         email: this.inviteEmail,
    //         groupName: this.groupOptions.find(g => g.id === this.selectedGroupId)?.name,
    //         groupId: this.selectedGroupId
    //       })
    //     });
    //
    //     const result = await response.json();
    //
    //     if (result.success) {
    //       alert("招待メールを送信しました。");
    //     } else {
    //       alert("メール送信に失敗しました: " + result.message);
    //     }
    //   } catch (err) {
    //     console.error("PHPへの送信エラー:", err);
    //     alert("サーバーへの接続に失敗しました");
    //   }
    // },

    // async sendInvite() {
    //   // メールアドレスとグループ名のバリデーション
    //   if (!this.inviteEmail || !/.+@.+\..+/.test(this.inviteEmail)) {
    //     alert("正しいメールアドレスを入力してください");
    //     return;
    //   }
    //   if (!this.selectedGroupId || !this.initialGroupName) {
    //     alert("グループを選択してください");
    //     return;
    //   }
    //
    //   // Firestore に保存（例: Firestore を使う場合）
    //   try {
    //     // await this.$firestore.collection("invitations").add({
    //     //   email: this.inviteEmail,
    //     //   groupId: this.selectedGroupId,
    //     //   groupName: this.initialGroupName,
    //     //   invitedBy: this.currentUserId,
    //     //   status: "pending",
    //     //   createdAt: new Date()
    //     // });
    //     // Firestore に保存
    //     await db.collection("invitations").add({
    //       email: this.inviteEmail,
    //       groupId: this.selectedGroupId,
    //       groupName: this.groupOptions.find(g => g.id === this.selectedGroupId)?.name,
    //       invitedBy: this.currentUserId,
    //       status: "pending",
    //       createdAt: new Date()
    //     });
    //
    //   } catch (e) {
    //     console.error("Firestore 保存失敗:", e);
    //     alert("Firestore への保存に失敗しました");
    //     return;
    //   }
    //
    //   // PHP (SMTPメール送信) に送信
    //   try {
    //     const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/invite_mail.php", {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       body: JSON.stringify({
    //         email: this.inviteEmail,
    //         group: this.initialGroupName
    //       })
    //     });
    //
    //     const result = await response.json();
    //
    //     if (result.success) {
    //       alert("招待メールを送信しました。");
    //     } else {
    //       alert("メール送信に失敗しました: " + result.message);
    //     }
    //   } catch (err) {
    //     console.error("PHPへの送信エラー:", err);
    //     alert("サーバーへの接続に失敗しました");
    //   }
    //
    //   // 招待済みのメールはリセット（任意）
    //   // this.inviteEmail = "";
    // },
    // async sendInvite() {
    //   if (!this.inviteEmail || !/.+@.+\..+/.test(this.inviteEmail)) {
    //     alert("正しいメールアドレスを入力してください");
    //     return;
    //   }
    //   if (!this.selectedGroupId) {
    //     alert("グループを選択してください");
    //     return;
    //   }
    //
    //   // Firestore に保存
    //   await db.collection("invitations").add({
    //     email: this.inviteEmail,
    //     groupId: this.selectedGroupId,
    //     groupName: this.groupOptions.find(g => g.id === this.selectedGroupId)?.name,
    //     invitedBy: this.currentUserId,
    //     status: "pending",
    //     createdAt: new Date()
    //   });
    //
    //   // PHP に送信
    //   try {
    //     const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/invite_mail.php", {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       body: JSON.stringify({
    //         email: this.inviteEmail,
    //         group: this.initialGroupName || "(不明なグループ名)"
    //       })
    //     });
    //
    //     const result = await response.json();
    //
    //     if (result.success) {
    //       alert("招待メールを送信しました。");
    //     } else {
    //       alert("メール送信に失敗しました: " + result.message);
    //     }
    //   } catch (err) {
    //     console.error("PHPへの送信エラー:", err);
    //     alert("サーバーへの接続に失敗しました");
    //   }
    //   // this.inviteEmail = "";
    // },
    async deleteGroup() {
      const groupId = this.selectedGroupId2
      if (!groupId) return alert("削除するグループを選択してください")

      const groupDoc = await db.collection("groups").doc(groupId).get()
      if (!groupDoc.exists) return alert("グループが見つかりません")

      const groupData = groupDoc.data()
      if (groupData.ownerUid !== this.currentUserId) {
        return alert("このグループを削除する権限がありません")
      }

      if (!confirm(`本当にグループ「${groupData.name}」を削除しますか？`)) return

      try {
        // Firestore: グループ削除
        await db.collection("groups").doc(groupId).delete()

        // Firestore: 各メンバーからグループを除外
        const members = groupData.members || []
        for (const memberUid of members) {
          await db.collection("users").doc(memberUid).update({
            groups: firebase.firestore.FieldValue.arrayRemove(groupId)
          })
        }

        // 🔄 Vue側の groupOptions 更新（リアクティブに反映）
        const updatedGroups = this.groupOptions.filter(g => g.id !== groupId)
        this.groupOptions = [] // 一度空にして nextTick で反映確実に
        await this.$nextTick()
        this.groupOptions = updatedGroups

        // 🔄 選択状態リセット
        const fallbackGroup = updatedGroups[0] || null

        if (this.selectedGroupId === groupId) {
          this.selectedGroupId = fallbackGroup ? fallbackGroup.id : null
          this.s_currentGroupName = fallbackGroup ? fallbackGroup.name : ""
          if (fallbackGroup) {
            localStorage.setItem("lastUsedGroupId", fallbackGroup.id)
          } else {
            localStorage.removeItem("lastUsedGroupId")
          }
        }

        // セレクトボックスを強制同期（特に Vuetify）
        await this.$nextTick()
        if (this.$refs.groupSelect1) {
          // this.$refs.groupSelect1.items = this.groupOptions
          this.$refs.groupSelect1.internalValue = this.selectedGroupId
        }
        console.log("🧪 groupSelect2:", this.$refs.groupSelect2)
        if (this.$refs.groupSelect2) {
          alert(100)
          this.$refs.groupSelect2.internalValue = this.selectedGroupId
        }

        this.selectedGroupId2 = null
        this.snackbarText = "グループを削除しました"
        this.snackbar = true

        // 🎉 アニメーション用にトーストやスナックバー
        this.$emit('showSnackbar', `${groupData.name} を削除しました`)

      } catch (e) {
        console.error("🔥 グループ削除失敗", e)
        alert("削除に失敗しました")
      }
    },
    showSnackbar(msg) {
      this.snackbarText = msg
      this.snackbar = true
    },
    async deleteBtn(groupId) {
      const group = this.groupOptions.find(g => g.id === groupId)
      if (group) {
        // グループ作成者か確認（削除ボタン表示制御用）
        const groupDoc = await db.collection("groups").doc(groupId).get()
        if (groupDoc.exists) {
          this.isGroupOwner = groupDoc.data().ownerUid === this.s_userId
        } else {
          this.isGroupOwner = false
        }
        console.log("🔄 グループ切り替え:", group.name)
      }
    },

    async onGroupChange(groupId) {
      const group = this.groupOptions.find(g => g.id === groupId)

      if (!groupId || !group) {
        this.s_currentGroupName = ''
        this.selectedGroupId = null
        localStorage.setItem('lastUsedGroupId', '')         // ← 空ID保存
        localStorage.setItem('lastUsedGroupName', '')       // ✅ 名前も空に！
        this.initialGroupName = ''                          // ✅ 表示クリア！
        console.log('🧼 グループなしモードに切り替え')
        return
      }

      if (group) {
        this.$store.commit("setCurrentGroupName", group.name)
        localStorage.setItem("lastUsedGroupId", group.id)
        localStorage.setItem("lastUsedGroupName", group.name)  // 👈 保存
        this.initialGroupName = group.name                     // 👈 同期表示用
        // this.selectMenuOpen = false
        console.log("🔄 グループ変更で initialGroupName 更新:", group.name)
      }
    },
    async switchGroup(groupId) {
      const groupDoc = await db.collection('groups').doc(groupId).get()
      if (groupDoc.exists) {
        this.$store.commit('setCurrentGroupName', groupDoc.data().name)
        localStorage.setItem('lastUsedGroupId', groupId)
      }
    },
    toggleLogin() {
      this.showAuthArea = true
      this.loginDiv = !this.loginDiv
      this.signUpDiv = false
    },
    toggleSignUp() {
      this.showAuthArea = true
      this.signUpDiv = !this.signUpDiv
      this.loginDiv = false
    },
    async createGroup() {
      try {
        const user = auth.currentUser
        if (!user) {
          alert("ログインが必要です")
          return
        }
        if (!this.groupName) {
          alert("グループ名を入力してください")
          return
        }

        const groupId = db.collection('groups').doc().id

        // Firestore にグループ作成
        await db.collection('groups').doc(groupId).set({
          name: this.groupName,
          ownerUid: user.uid,
          members: [user.uid],
          createdAt: new Date(),
        })

        // ユーザーにグループ追加
        await db.collection('users').doc(user.uid).set(
            {
              groups: firebase.firestore.FieldValue.arrayUnion(groupId),
            },
            { merge: true }
        )

        // ✅ UI に即時反映（ownerUid を含める！）
        const newGroup = {
          id: groupId,
          name: this.groupName,
          ownerUid: user.uid // ← これが重要！
        }
        this.groupOptions.push(newGroup)

        // 選択状態と保存
        this.selectedGroupId = groupId
        this.s_currentGroupName = this.groupName
        localStorage.setItem("lastUsedGroupId", groupId)

        alert('グループを作成しました')
        this.groupName = ''
      } catch (error) {
        console.error("グループ作成中にエラーが発生:", error)
        alert(`グループ作成に失敗しました：${error.message || '不明なエラー'}`)
      }
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
          await firebase.auth().signOut()
          this.$store.state.userId = 'dummy'
          this.s_fetchImagesFire = !this.s_fetchImagesFire
          document.querySelector('#drag-handle-menuDialog-map01').innerHTML = '<span style="font-size: large;">メニュー</span>'
          alert("ログアウトしました")
        } catch (error) {
          console.error("ログアウトエラー:", error.message)
        }
      }
      logout()
    },

    signUp () {
      if (!(this.email && this.password && this.nickname)) {
        alert('入力されていません。')
        return
      }

      const signup = async () => {
        try {
          const userCredential = await firebase.auth().createUserWithEmailAndPassword(this.email, this.password)
          const user = userCredential.user

          await firebase.auth().currentUser.updateProfile({
            displayName: this.nickname
          })

          this.createDirectory()
          alert(`登録成功！ようこそ、${this.nickname} さん！`)
          this.errorMsg = ''
          this.signUpDiv = false
        } catch (error) {
          console.error("サインアップ失敗:", error.message)
          switch (error.code) {
            case "auth/user-not-found":
              this.errorMsg = "ユーザーが見つかりません"
              break
            case "auth/wrong-password":
              this.errorMsg = "パスワードが違います"
              break
            case "auth/invalid-email":
              this.errorMsg = "無効なメールアドレスです"
              break
            default:
              this.errorMsg = "登録に失敗しました"
          }
        }
      }
      signup()
    },
    login () {
      const login = async () => {
        try {
          const userCredential = await firebase.auth().signInWithEmailAndPassword(this.email, this.password)
          const user = userCredential.user

          if (!user) {
            this.errorMsg = "ログインは成功しましたが、ユーザー情報が取得できません"
            return
          }

          console.log("ログイン成功！", user)

          this.createDirectory()
          this.errorMsg = 'ログイン成功'
          this.loginDiv = false
          this.$store.state.userId = user.uid
          this.s_fetchImagesFire = !this.s_fetchImagesFire
          this.s_currentGroupName = '' // ← 先に初期化しておく

          // 🔽 ユーザーIDを元に所属グループを取得
          const userDoc = await db.collection('users').doc(user.uid).get()
          const groups = userDoc.exists ? userDoc.data().groups : []
          if (groups.length > 0) {
            // とりあえず最初のグループを取得して表示
            const groupId = groups[0]
            const groupDoc = await db.collection('groups').doc(groupId).get()
            if (groupDoc.exists) {
              this.s_currentGroupName = groupDoc.data().name
              console.log(groupDoc)
              console.log("groupDoc データ:", groupDoc.data())
              // alert(groupDoc.data().name)
            }
          }
        } catch (error) {
          console.error("ログイン失敗:", error.message)

          switch (error.code) {
            case "auth/user-not-found":
              this.errorMsg = "ユーザーが見つかりません"
              break
            case "auth/wrong-password":
              this.errorMsg = "パスワードが違います"
              break
            case "auth/invalid-email":
              this.errorMsg = "無効なメールアドレスです"
              break
            default:
              this.errorMsg = "ログインに失敗しました"
          }
        }
      }
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



    currentUserId: {
      immediate: true,
      async handler(uid) {
        if (!uid || uid === 'dummy') return

        try {
          const userDoc = await db.collection("users").doc(uid).get()
          const groupIds = userDoc.exists ? userDoc.data().groups || [] : []
          const groups = []


          // const groupIds = userDoc.exists ? userDoc.data().groups || [] : []
          //
          // const groups = []
          // for (const groupId of groupIds) {
          //   const groupDoc = await db.collection("groups").doc(groupId).get()
          //   if (groupDoc.exists) {
          //     const name = groupDoc.data().name || "(名前なし)"
          //     groups.push({
          //       id: groupId,
          //       name,
          //       ownerUid: groupDoc.data().ownerUid
          //     })
          //   }
          // }
          //




          for (const groupId of groupIds) {
            const groupDoc = await db.collection("groups").doc(groupId).get()
            if (groupDoc.exists) {
              const name = groupDoc.data().name || "(名前なし)"
              groups.push({
                id: groupId,
                name,
                ownerUid: groupDoc.data().ownerUid
              })
            }
          }

          // 先頭に「グループに入らない」を追加
          this.groupOptions = [
            { id: null, name: "（グループに入らない）" },
            ...groups
          ]

          const savedGroupId = localStorage.getItem("lastUsedGroupId")

          // ✅ 空文字のときは null として扱う（これが重要！）
          const validGroupId = savedGroupId === "" ? null : savedGroupId

          // ✅ groupOptions に含まれていればそれを使う
          const defaultGroupId = this.groupOptions.find(g => g.id === validGroupId)
              ? validGroupId
              : null

          this.selectedGroupId = defaultGroupId
          this.onGroupChange(defaultGroupId)
        } catch (e) {
          console.error("🔥 グループ取得中エラー", e)
        }
      }
    },
  },
  created() {
    auth.onAuthStateChanged(async user => {
      if (user) {
        const uid = user.uid
        this.$store.commit('setUserId', uid)

        const userDoc = await db.collection('users').doc(uid).get()
        const groupIds = userDoc.exists ? userDoc.data().groups || [] : []

        const groups = []
        for (const groupId of groupIds) {
          const groupDoc = await db.collection("groups").doc(groupId).get()
          if (groupDoc.exists) {
            groups.push({
              id: groupId,
              name: groupDoc.data().name,
              ownerUid: groupDoc.data().ownerUid
            })
          }
        }

        this.groupOptions = [
          { id: null, name: "（グループに入らない）" },
          ...groups
        ]

        const savedGroupId = localStorage.getItem("lastUsedGroupId")
        const validGroupId = savedGroupId === "" ? null : savedGroupId

        const defaultGroupId = this.groupOptions.find(g => g.id === validGroupId)
            ? validGroupId
            : null

        this.selectedGroupId = defaultGroupId

        // 🕒 強制的に一番最後に反映（これで上書きされない）
        setTimeout(() => {
          console.log("🛡 強制的に onGroupChange 実行")
          this.onGroupChange(defaultGroupId)
        }, 1000) // ← 必要なら 2000 でもOK
      }
    })
  },
  mounted() {

    const user = firebase.auth().currentUser;
    if (user && user.email) {
      this.emailInput = user.email;
    }

    // URLパラメータからグループIDを取得
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("group");
    if (groupId) {
      this.joinGroupId = groupId;
      this.tab = "9"; // 自動で「参加」タブに移動
    }

    //
    //
    // const params = new URLSearchParams(window.location.search);
    // console.log(params)
    // const groupParam = params.get("group");
    //
    // console.log("🔍 URLから取得したgroupパラメータ:", groupParam);
    //
    // if (!groupParam) {
    //   console.warn("❌ URLにグループIDが含まれていません");
    //   return;
    // }
    //
    // firebase.firestore().collection("groups").doc(groupParam).get()
    //     .then(async (doc) => {
    //       if (doc.exists) {
    //         this.groupId = doc.id;
    //         this.groupName = doc.data().name;
    //         console.log("✅ Firestoreの doc 検索で groupId を取得:", this.groupId);
    //       } else {
    //         // name フィールドでの検索（古い形式対応）
    //         const snapshot = await firebase.firestore()
    //             .collection("groups")
    //             .where("name", "==", groupParam)
    //             .limit(1)
    //             .get();
    //
    //         if (!snapshot.empty) {
    //           const matchedDoc = snapshot.docs[0];
    //           this.groupId = matchedDoc.id;
    //           this.groupName = matchedDoc.data().name;
    //           console.log("✅ Firestoreの name 検索で groupId を取得:", this.groupId);
    //         } else {
    //           console.warn("❌ グループが見つかりませんでした（name検索も失敗）");
    //         }
    //       }
    //     })
    //     .catch((err) => {
    //       console.error("❌ Firestoreエラー:", err);
    //     });
  }




  // mounted() {
  //
  //   document.querySelector('#drag-handle-menuDialog-map01').innerHTML = '<span style="font-size: large;">メニュー</span>'
  //
  //   // 非同期で user の UID を監視
  //   const checkUser = setInterval(() => {
  //     if (user && user._rawValue && user._rawValue.uid) {
  //       this.uid = user._rawValue.uid;
  //       this.$store.state.userId = user._rawValue.uid
  //        document.querySelector('#drag-handle-menuDialog-map01').innerHTML = '<span style="font-size: large;">メニューようこそ' + user._rawValue.displayName + 'さん</span>'
  //       clearInterval(checkUser); // UIDを取得できたら監視を停止
  //     }
  //   }, 5);
  //
  //   if (localStorage.getItem('terrainLevel')) {
  //     this.s_terrainLevel = Number(localStorage.getItem('terrainLevel'))
  //   } else {
  //     this.s_terrainLevel = 1
  //   }
  //   this.s_isPitch = JSON.parse(localStorage.getItem('isPitch'))
  //   if (localStorage.getItem('resolution')) {
  //     this.s_resolution = localStorage.getItem('resolution')
  //   }
  //   if (localStorage.getItem('window')) {
  //     this.s_isWindow = JSON.parse(localStorage.getItem('window'))
  //   }
  //   if (localStorage.getItem('mapillary')) {
  //     this.s_mapillary = JSON.parse(localStorage.getItem('mapillary'))
  //   }
  // }
}
</script>
<style scoped>
.menu-div {
  height: auto;
  width: 300px;
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

