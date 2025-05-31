<template>
  <v-navigation-drawer
      width="400"
      temporary
      :scrim="false"
      v-model="visible"
      location="right"
      class="point-info-drawer"
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0;">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        全国地番図公開マップ
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; font-size: 30px!important;" @click="close">
          <i class="fa-solid fa-xmark hover"></i>
        </div>
      </v-card-title>

      <v-card-text style="margin-top: 20px;">
        <h2 v-if="cityName || cityCode">
          {{ (cityName || '') }}
        </h2>
        <p v-else>自治体を選択してください</p>

        <div class="mini-tooltip-wrapper">
          <v-btn v-if="user"
                 style="margin-top: 20px;"
                 color="error"
                 @click="public0(4)"
          >
            赤色
          </v-btn>
          <span class="mini-tooltip-text mini-tooltip-bottom">
            赤色は・・・・
            <span class="mini-tooltip-arrow-up"></span>
          </span>
        </div>

        <div class="mini-tooltip-wrapper">
          <v-btn v-if="user"
                 style="margin-top: 20px;margin-left: 10px;background: gray !important;"
                 @click="public0(3)"
          >
            灰色
          </v-btn>
          <span class="mini-tooltip-text mini-tooltip-bottom">
            開示請求により入手できたが公開の可否不明
            <span class="mini-tooltip-arrow-up"></span>
          </span>
        </div>

        <div class="mini-tooltip-wrapper">
          <v-btn v-if="user"
                 style="margin-top: 20px;margin-left: 10px;background: orange !important;"
                 @click="public0(5)"
          >
            黄色
          </v-btn>
          <span class="mini-tooltip-text mini-tooltip-bottom">
            開示請求中！
            <span class="mini-tooltip-arrow-up"></span>
          </span>
        </div>

        <v-btn v-if="user"
               style="margin-top: 20px;margin-left: 10px;background: rgba(0,0,0,0.2) !important;"
               @click="public0(0)"
        >
          色なし
        </v-btn>

        <p v-if="user" style="margin-left: 0px;">アップロードがある場合は無効</p>
        <!-- コメント投稿フォーム -->
        <div v-if="user" class="comment-form mt-4">
          <div v-if="replyingTo" class="replying-to mb-2">
            <span>{{ replyingToUser }} への返信</span>
          </div>
          <v-textarea
              v-model="newComment"
              :placeholder="replyingTo ? '返信を入力' : 'コメントを入力'"
              rows="3"
              outlined
              dense
          ></v-textarea>
          <v-btn
              color="primary"
              @click="submitComment"
              :disabled="!newComment.trim()"
          >
            投稿
          </v-btn>
          <v-btn v-if="replyingTo"
                 style="margin-left: 10px;"
                 color="primary"
                 small
                 text
                 @click="cancelReply"
          >
            返信をキャンセル
          </v-btn>
        </div>
        <div v-else class="login-prompt mt-4">
          <p>コメント、アップロードするにはログインしてください</p>
          <v-btn
              style="margin-top: 10px;"
              color="primary"
              small
              text
              @click="login"
          >
            ログイン
          </v-btn>
        </div>

        <!-- コメントリスト -->
        <div class="comment-list mt-6">
          <v-card
              v-for="comment in comments"
              :key="comment.id"
              class="comment mb-2"
              outlined
          >
            <v-card-text>
              <!-- 編集モードの場合 -->
              <div v-if="editingCommentId === comment.id && user && comment.user === user.nickname">
                <v-textarea
                    v-model="editedCommentText"
                    placeholder="コメントを編集"
                    rows="3"
                    outlined
                    dense
                ></v-textarea>
                <v-btn
                    color="success"
                    @click="saveEditedComment(comment.id)"
                    :disabled="!editedCommentText.trim()"
                >
                  保存
                </v-btn>
                <v-btn
                    color="primary"
                    text
                    @click="cancelEdit"
                    style="margin-left: 10px;"
                >
                  キャンセル
                </v-btn>
              </div>
              <!-- 通常表示の場合 -->
              <div v-else>
                <p class="comment-text" v-html="convertUrlsToLinks(comment.text)"></p>
                <v-row align="center" style="margin-top: 10px;">
                  <v-col>
                    <small>{{ comment.user }} - {{ formatDate(comment.date) }}</small>
                  </v-col>
                  <v-col cols="auto">
                    <v-btn
                        v-if="!comment.parentId"
                        color="primary"
                        small
                        @click="replyToComment(comment.id, comment.user)"
                    >
                      返信
                    </v-btn>
                    <v-btn
                        v-if="user && comment.user === user.nickname"
                        color="primary"
                        small
                        @click="startEdit(comment.id, comment.text)"
                        class="ml-2"
                    >
                      編集
                    </v-btn>
                    <v-btn
                        v-if="user && comment.user === user.nickname && (!comment.replies || comment.replies.length === 0)"
                        color="error"
                        small
                        @click="deleteComment(comment.id, comment.replies)"
                        class="ml-2"
                    >
                      削除
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
              <!-- リプライ -->
              <div v-if="comment.replies" class="replies mt-2">
                <v-card
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    class="reply mb-1"
                    outlined
                >
                  <v-card-text>
                    <!-- リプライの編集モード -->
                    <div v-if="editingCommentId === reply.id && user && reply.user === user.nickname">
                      <v-textarea
                          v-model="editedCommentText"
                          placeholder="リプライを編集"
                          rows="3"
                          outlined
                          dense
                      ></v-textarea>
                      <v-btn
                          color="success"
                          @click="saveEditedComment(reply.id)"
                          :disabled="!editedCommentText.trim()"
                      >
                        保存
                      </v-btn>
                      <v-btn
                          color="primary"
                          text
                          @click="cancelEdit"
                          style="margin-left: 10px;"
                      >
                        キャンセル
                      </v-btn>
                    </div>
                    <!-- リプライの通常表示 -->
                    <div v-else>
                      <p class="comment-text" v-html="convertUrlsToLinks(reply.text)"></p>
                      <v-row align="center">
                        <v-col>
                          <small>{{ reply.user }} - {{ formatDate(reply.date) }}</small>
                        </v-col>
                        <v-col cols="auto">
                          <v-btn
                              v-if="user && reply.user === user.nickname"
                              color="primary"
                              small
                              @click="startEdit(reply.id, reply.text)"
                          >
                            編集
                          </v-btn>
                          <v-btn
                              v-if="user && reply.user === user.nickname"
                              color="error"
                              small
                              @click="deleteComment(reply.id)"
                              class="ml-2"
                          >
                            削除
                          </v-btn>
                        </v-col>
                      </v-row>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
          <div v-if="user">
            <v-btn
                style="margin-top: 20px;width: 100%;"
                v-if="user"
                @click="geojsonUpload"
            >
              地番図アップロード（geojsonファイル）
            </v-btn>
            <p style="margin-top: 10px;">どうしてもUPに失敗するときは@kenzkenzに連絡を。</p>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import { db, auth } from '../firebase';
import firebase from 'firebase/app';
import {extractFirstFeatureProperties, publicChk} from '@/js/downLoad';
import sanitizeHtml from 'sanitize-html'; // sanitize-htmlをインポート

export default {
  name: 'chibanzuDrawer',
  components: {},
  data() {
    return {
      tab: '0',
      user: null,
      comments: [],
      newComment: '',
      replyingTo: null,
      replyingToUser: '',
      unsubscribe: null,
      editingCommentId: null,
      editedCommentText: '',
    };
  },
  computed: {
    ...mapState([
      'showChibanzuDrawer',
      'popupFeatureProperties',
      'popupFeatureCoordinates',
    ]),
    s_geojsonFile: {
      get() {
        return this.$store.state.geojsonFile
      },
      set(value) {
        return this.$store.state.geojsonFile = value
      }
    },
    s_chibanzuPrefCode: {
      get() {
        return this.$store.state.chibanzuPrefCode;
      },
      set(value) {
        return (this.$store.state.chibanzuPrefCode = value);
      },
    },
    s_chibanzuCityCode: {
      get() {
        return this.$store.state.chibanzuCityCode;
      },
      set(value) {
        return (this.$store.state.chibanzuCityCode = value);
      },
    },
    s_chibanzuPropaties: {
      get() {
        return this.$store.state.chibanzuPropaties;
      },
      set(value) {
        this.$store.state.chibanzuPropaties = value;
      },
    },
    s_chibanzuGeojson: {
      get() {
        return this.$store.state.chibanzuGeojson;
      },
      set(value) {
        this.$store.state.chibanzuGeojson = value;
      },
    },
    s_pmtilesName: {
      get() {
        return this.$store.state.pmtilesName;
      },
      set(value) {
        this.$store.state.pmtilesName = value;
      },
    },
    s_showChibanzuDialog: {
      get() {
        return this.$store.state.showChibanzuDialog;
      },
      set(value) {
        this.$store.state.showChibanzuDialog = value;
      },
    },
    s_dialogForLogin: {
      get() {
        return this.$store.state.dialogForLogin;
      },
      set(value) {
        this.$store.state.dialogForLogin = value;
      },
    },
    cityCode() {
      return this.popupFeatureProperties?.N03_007?.padStart(5, '0') || '';
    },
    prefName() {
      return this.popupFeatureProperties?.N03_001;
    },
    cityName() {
      if (!this.popupFeatureProperties) return '';
      if (this.popupFeatureProperties.N03_004 === '札幌市') {
        return (
            (this.popupFeatureProperties.N03_001 || '') +
            '-' +
            (this.popupFeatureProperties.N03_004 || '') +
            (this.popupFeatureProperties.N03_005 || '')
        );
      } else {
        return (
            (this.popupFeatureProperties.N03_001 || '') +
            '-' +
            (this.popupFeatureProperties.N03_004 || '')
        );
      }
    },
    s_isAndroid() {
      return this.$store.state.isAndroid;
    },
    drawerWidth() {
      return window.innerWidth;
    },
    visible: {
      get() {
        return this.showChibanzuDrawer;
      },
      set(val) {
        this.setChibanzuDrawer(val);
        if (!val) {
          this.title = '';
        }
      },
    },
  },
  created() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        const nickname = user.displayName || user.email;
        this.user = { ...user, nickname };
      } else {
        this.user = null;
      }
    });

    if (this.cityCode) {
      this.loadComments();
    }
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  watch: {
    cityCode(newVal) {
      if (newVal) {
        this.loadComments();
      }
    },
  },
  methods: {
    ...mapMutations(['setChibanzuDrawer']),
    geojsonUpload() {
      const vm = this
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.geojson,.json';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          vm.s_geojsonFile = file
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              // const geojsonText = event.target.result;
              // const geojson = JSON.parse(geojsonText);
              // const firstFeature = geojson.features[0];
              // this.s_chibanzuPropaties = Object.keys(firstFeature.properties);
              // this.s_chibanzuGeojson = geojson;
              async function aaa () {
                vm.s_chibanzuPropaties = await extractFirstFeatureProperties(file)
                vm.s_showChibanzuDialog = true;
                vm.s_pmtilesName = vm.cityName;
                vm.s_chibanzuPrefCode = vm.cityCode.slice(0, 2);
                vm.s_chibanzuCityCode = String(Number(vm.cityCode));
              }
              aaa()
            } catch (error) {
              console.error('GeoJSONファイルの読み込みエラー:', error);
            } finally {
              fileInput.remove();
            }
          };
          reader.readAsText(file);
        } else {
          fileInput.remove();
        }
      });
      fileInput.click();
    },
    async public0(no) {
      // alert(this.$store.state.userId)
      const url = 'https://kenzkenz.xsrv.jp/open-hinata3/php/userChibanzumapRedUpdate.php';
      const data = {
        citycode: this.cityCode,
        prefname: this.prefName,
        cityname: this.cityName,
        public: no,
        uid: this.$store.state.userId
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.error) {
          console.log(result);
        } else {
          console.log(result);
          publicChk();
        }
      } catch (error) {
        console.log(error);
      }
    },
    async red() {
      const url = 'https://kenzkenz.xsrv.jp/open-hinata3/php/userChibanzumapRedUpdate.php';
      const data = {
        citycode: this.cityCode,
        prefname: this.prefName,
        cityname: this.cityName,
        uid: this.$store.state.userId
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.error) {
          console.log(result);
        } else {
          console.log(result);
          publicChk();
        }
      } catch (error) {
        console.log(error);
      }
    },
    close() {
      this.setChibanzuDrawer(false);
    },
    login() {
      this.s_dialogForLogin = true;
    },
    async loadComments() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');
      this.unsubscribe = commentsRef.orderBy('date', 'desc').onSnapshot(
          async (snapshot) => {
            const commentList = [];
            const allComments = [];
            const emailToNicknameMap = new Map();

            snapshot.forEach((doc) => {
              const comment = doc.data();
              comment.id = doc.id;
              allComments.push(comment);
            });

            for (const comment of allComments) {
              if (!emailToNicknameMap.has(comment.user)) {
                try {
                  const userSnapshot = await db
                      .collection('users')
                      .where('email', '==', comment.user)
                      .limit(1)
                      .get();
                  if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    const userData = userDoc.data();
                    emailToNicknameMap.set(comment.user, userData.displayName || comment.user);
                  } else {
                    emailToNicknameMap.set(comment.user, comment.user);
                  }
                } catch (error) {
                  console.error('ユーザー取得エラー:', error);
                  emailToNicknameMap.set(comment.user, comment.user);
                }
              }
              comment.user = emailToNicknameMap.get(comment.user);
            }

            allComments.forEach((comment) => {
              if (!comment.parentId) {
                comment.replies = allComments.filter((reply) => reply.parentId === comment.id);
                commentList.push(comment);
              }
            });

            this.comments = commentList;
          },
          (error) => {
            console.error('コメント取得エラー:', error);
          }
      );
    },
    async submitComment() {
      if (!this.newComment.trim()) return;
      if (!this.user) {
        alert('ログインしてください');
        return;
      }

      const commentData = {
        text: this.newComment,
        user: this.user.nickname,
        date: new Date().toISOString(),
        parentId: this.replyingTo || null,
      };

      try {
        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');
        await commentsRef.add(commentData);
        this.newComment = '';
        this.replyingTo = null;
        this.replyingToUser = '';
      } catch (error) {
        console.error('コメント投稿エラー:', error);
      }
    },
    replyToComment(commentId, user) {
      this.replyingTo = commentId;
      this.replyingToUser = user;
    },
    cancelReply() {
      this.replyingTo = null;
      this.replyingToUser = '';
    },
    async deleteComment(commentId, replies = []) {
      if (!confirm('このコメントを削除しますか？')) return;

      try {
        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');
        const batch = db.batch();

        batch.delete(commentsRef.doc(commentId));

        if (replies.length > 0) {
          replies.forEach((reply) => {
            batch.delete(commentsRef.doc(reply.id));
          });
        }

        await batch.commit();
        console.log('コメントを削除しました');
      } catch (error) {
        console.error('コメント削除エラー:', error);
        alert('コメント削除に失敗しました');
      }
    },
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('ja-JP');
    },
    startEdit(commentId, commentText) {
      this.editingCommentId = commentId;
      this.editedCommentText = commentText;
    },
    async saveEditedComment(commentId) {
      if (!this.editedCommentText.trim()) {
        alert('コメントを入力してください');
        return;
      }

      try {
        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');
        await commentsRef.doc(commentId).update({
          text: this.editedCommentText,
          date: new Date().toISOString(),
        });
        this.editingCommentId = null;
        this.editedCommentText = '';
        console.log('コメントを編集しました');
      } catch (error) {
        console.error('コメント編集エラー:', error);
        alert('コメント編集に失敗しました');
      }
    },
    cancelEdit() {
      this.editingCommentId = null;
      this.editedCommentText = '';
    },
    convertUrlsToLinks(text) {
      // URLを検出する正規表現
      const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
      // URLを<a>タグで囲む
      const linkedText = text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      });
      // XSS防止のため出力をサニタイズ
      return sanitizeHtml(linkedText, {
        allowedTags: ['a'],
        allowedAttributes: {
          a: ['href', 'target', 'rel'],
        },
      });
    },
  },
};
</script>

<style scoped>
.drawer {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: auto;
}
.point-info-drawer {
  z-index: 2500;
}
.close-btn-div {
  cursor: pointer;
}
.close-btn-div:hover {
  color: red !important;
}
.comment-form textarea {
  width: 100%;
  margin-bottom: 10px;
}
.comment-list {
  margin-top: 20px;
}
.comment {
  padding: 10px 0;
}
.replies {
  margin-left: 20px;
  margin-top: 10px;
}
.reply {
  padding-left: 10px;
  margin-bottom: 10px;
}
.login-prompt {
  text-align: center;
  padding: 20px;
}
.replying-to {
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
}
.edit-form {
  margin-bottom: 10px;
}
.edit-form textarea {
  white-space: pre-wrap;
  width: 100%;
  margin-bottom: 10px;
}
.comment-text {
  white-space: pre-wrap; /* 改行を反映 */
  word-wrap: break-word; /* 長い単語を折り返す */
}
.comment-text a {
  color: #1e88e5; /* リンクの色 */
  text-decoration: underline;
}
.comment-text a:hover {
  color: #1565c0; /* ホバー時の色 */
}
/* フェードアニメーション */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>