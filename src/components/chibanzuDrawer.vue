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

        <v-btn v-if="user"
               style="margin-top: 20px;"
               color="error"
               @click="public0(4)"
        >
          赤色
        </v-btn>
        <v-btn v-if="user"
               style="margin-top: 20px;margin-left: 10px;background: gray !important;"
               @click="public0(3)"
        >
          灰色
        </v-btn>
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
          <p>コメントするにはログインしてください</p>
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
              <div v-else >
                <p class="comment-text">{{ comment.text }}</p>
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
                      <p class="comment-text">{{ reply.text }}</p>
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
          <hr>
          <v-btn
              style="margin-top: 20px;width: 100%;"
              v-if="user"
              @click="geojsonUpload"
          >
            地番図アップロード（geojsonファイル）
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import { db, auth } from '../firebase';
import firebase from 'firebase/app';
import { publicChk } from '@/js/downLoad';

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
    s_dialogForLogin: {
      get() {
        return this.$store.state.dialogForLogin
      },
      set(value) {
        this.$store.state.dialogForLogin = value
      }
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
        return (this.popupFeatureProperties.N03_001 || '') +
            (this.popupFeatureProperties.N03_004 || '') +
            (this.popupFeatureProperties.N03_005 || '');
      } else {
        return (this.popupFeatureProperties.N03_001 || '') +
            (this.popupFeatureProperties.N03_004 || '');
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
    ...mapMutations([
      'setChibanzuDrawer',
    ]),
    geojsonUpload () {

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.geojson,.json';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const geojsonText = event.target.result;
              const geojson = JSON.parse(geojsonText);
              alert()
            } catch (error) {
              console.error('GeoJSONファイルの読み込みエラー:', error);
            } finally {
              // 隠しファイル入力を破棄
              fileInput.remove();
            }
          };
          reader.readAsText(file);
        } else {
          // ファイルが選択されなかった場合も破棄
          fileInput.remove();
        }
      });
      fileInput.click();
    },
    async public0 (no) {
      const url = 'https://kenzkenz.xsrv.jp/open-hinata3/php/userChibanzumapRedUpdate.php';
      const data = {
        citycode: this.cityCode,
        prefname: this.prefName,
        cityname: this.cityName,
        public: no,
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
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
        cityname: this.cityName
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
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
      this.s_dialogForLogin = true
      // this.$emit('login');
    },
    async loadComments() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');
      this.unsubscribe = commentsRef.orderBy('date', 'desc').onSnapshot(async (snapshot) => {
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
              const userSnapshot = await db.collection('users')
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
            comment.replies = allComments.filter(reply => reply.parentId === comment.id);
            commentList.push(comment);
          }
        });

        this.comments = commentList;
      }, (error) => {
        console.error('コメント取得エラー:', error);
      });
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
          replies.forEach(reply => {
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
  width: 100%;
  margin-bottom: 10px;
}
.comment-text {
  white-space: pre-wrap; /* 改行を反映 */
  word-wrap: break-word; /* 長い単語を折り返す */
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


<!--&lt;!&ndash;<template>&ndash;&gt;-->
<!--&lt;!&ndash;  <v-navigation-drawer&ndash;&gt;-->
<!--&lt;!&ndash;      width="400"&ndash;&gt;-->
<!--&lt;!&ndash;      temporary&ndash;&gt;-->
<!--&lt;!&ndash;      :scrim="false"&ndash;&gt;-->
<!--&lt;!&ndash;      v-model="visible"&ndash;&gt;-->
<!--&lt;!&ndash;      location="right"&ndash;&gt;-->
<!--&lt;!&ndash;      class="point-info-drawer"&ndash;&gt;-->
<!--&lt;!&ndash;  >&ndash;&gt;-->
<!--&lt;!&ndash;    <v-card flat class="drawer" style="border-radius: 0;">&ndash;&gt;-->
<!--&lt;!&ndash;      <v-card-title class="header">&ndash;&gt;-->
<!--&lt;!&ndash;        <v-icon left color="white">mdi-map</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;        全国地番図公開マップ&ndash;&gt;-->
<!--&lt;!&ndash;        <v-spacer />&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn icon @click="close" class="close-btn">&ndash;&gt;-->
<!--&lt;!&ndash;          <v-icon color="white">mdi-close</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;        </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;      </v-card-title>&ndash;&gt;-->

<!--&lt;!&ndash;      <v-card-text class="pa-4">&ndash;&gt;-->
<!--&lt;!&ndash;        <h2 v-if="cityName || cityCode" class="text-h5 mb-4">&ndash;&gt;-->
<!--&lt;!&ndash;          {{ cityName || '' }}&ndash;&gt;-->
<!--&lt;!&ndash;        </h2>&ndash;&gt;-->
<!--&lt;!&ndash;        <p v-else class="text-body-1 grey&#45;&#45;text">自治体を選択してください</p>&ndash;&gt;-->

<!--&lt;!&ndash;        <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;            v-if="user"&ndash;&gt;-->
<!--&lt;!&ndash;            color="error"&ndash;&gt;-->
<!--&lt;!&ndash;            class="mb-4"&ndash;&gt;-->
<!--&lt;!&ndash;            outlined&ndash;&gt;-->
<!--&lt;!&ndash;            @click="red"&ndash;&gt;-->
<!--&lt;!&ndash;        >&ndash;&gt;-->
<!--&lt;!&ndash;          <v-icon left>mdi-circle</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;          赤色on/off&ndash;&gt;-->
<!--&lt;!&ndash;        </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <span v-if="user" class="ml-2 text-caption grey&#45;&#45;text">既に色がついている場合は無効</span>&ndash;&gt;-->

<!--&lt;!&ndash;        &lt;!&ndash; コメント投稿フォーム &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;        <div v-if="user" class="comment-form mt-4">&ndash;&gt;-->
<!--&lt;!&ndash;          <div v-if="replyingTo" class="replying-to mb-2">&ndash;&gt;-->
<!--&lt;!&ndash;            <v-chip small color="primary" outlined>&ndash;&gt;-->
<!--&lt;!&ndash;              <v-icon left small>mdi-reply</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;              {{ replyingToUser }} への返信&ndash;&gt;-->
<!--&lt;!&ndash;            </v-chip>&ndash;&gt;-->
<!--&lt;!&ndash;          </div>&ndash;&gt;-->
<!--&lt;!&ndash;          <v-textarea&ndash;&gt;-->
<!--&lt;!&ndash;              v-model="newComment"&ndash;&gt;-->
<!--&lt;!&ndash;              :placeholder="replyingTo ? '返信を入力' : 'コメントを入力'"&ndash;&gt;-->
<!--&lt;!&ndash;              rows="3"&ndash;&gt;-->
<!--&lt;!&ndash;              outlined&ndash;&gt;-->
<!--&lt;!&ndash;              dense&ndash;&gt;-->
<!--&lt;!&ndash;              class="comment-textarea"&ndash;&gt;-->
<!--&lt;!&ndash;          ></v-textarea>&ndash;&gt;-->
<!--&lt;!&ndash;          <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;              color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;              class="submit-btn"&ndash;&gt;-->
<!--&lt;!&ndash;              @click="submitComment"&ndash;&gt;-->
<!--&lt;!&ndash;              :disabled="!newComment.trim()"&ndash;&gt;-->
<!--&lt;!&ndash;          >&ndash;&gt;-->
<!--&lt;!&ndash;            <v-icon left>mdi-send</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;            投稿&ndash;&gt;-->
<!--&lt;!&ndash;          </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;          <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;              v-if="replyingTo"&ndash;&gt;-->
<!--&lt;!&ndash;              color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;              text&ndash;&gt;-->
<!--&lt;!&ndash;              class="ml-2"&ndash;&gt;-->
<!--&lt;!&ndash;              @click="cancelReply"&ndash;&gt;-->
<!--&lt;!&ndash;          >&ndash;&gt;-->
<!--&lt;!&ndash;            キャンセル&ndash;&gt;-->
<!--&lt;!&ndash;          </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        </div>&ndash;&gt;-->
<!--&lt;!&ndash;        <div v-else class="login-prompt mt-4 text-center">&ndash;&gt;-->
<!--&lt;!&ndash;          <p class="text-body-2 grey&#45;&#45;text">コメントするにはログインしてください</p>&ndash;&gt;-->
<!--&lt;!&ndash;          <v-btn color="primary" outlined @click="login">ログイン</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        </div>&ndash;&gt;-->

<!--&lt;!&ndash;        &lt;!&ndash; コメントリスト &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;        <div class="comment-list mt-6">&ndash;&gt;-->
<!--&lt;!&ndash;          <v-card&ndash;&gt;-->
<!--&lt;!&ndash;              v-for="comment in comments"&ndash;&gt;-->
<!--&lt;!&ndash;              :key="comment.id"&ndash;&gt;-->
<!--&lt;!&ndash;              class="comment mb-3"&ndash;&gt;-->
<!--&lt;!&ndash;              elevation="1"&ndash;&gt;-->
<!--&lt;!&ndash;              @mouseover="hoverComment = comment.id"&ndash;&gt;-->
<!--&lt;!&ndash;              @mouseleave="hoverComment = null"&ndash;&gt;-->
<!--&lt;!&ndash;          >&ndash;&gt;-->
<!--&lt;!&ndash;            <v-card-text>&ndash;&gt;-->
<!--&lt;!&ndash;              &lt;!&ndash; 編集モード &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;              <div v-if="editingCommentId === comment.id && user && comment.user === user.nickname" class="edit-form">&ndash;&gt;-->
<!--&lt;!&ndash;                <v-textarea&ndash;&gt;-->
<!--&lt;!&ndash;                    v-model="editedCommentText"&ndash;&gt;-->
<!--&lt;!&ndash;                    placeholder="コメントを編集"&ndash;&gt;-->
<!--&lt;!&ndash;                    rows="3"&ndash;&gt;-->
<!--&lt;!&ndash;                    outlined&ndash;&gt;-->
<!--&lt;!&ndash;                    dense&ndash;&gt;-->
<!--&lt;!&ndash;                    class="comment-textarea"&ndash;&gt;-->
<!--&lt;!&ndash;                ></v-textarea>&ndash;&gt;-->
<!--&lt;!&ndash;                <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                    color="success"&ndash;&gt;-->
<!--&lt;!&ndash;                    class="submit-btn"&ndash;&gt;-->
<!--&lt;!&ndash;                    @click="saveEditedComment(comment.id)"&ndash;&gt;-->
<!--&lt;!&ndash;                    :disabled="!editedCommentText.trim()"&ndash;&gt;-->
<!--&lt;!&ndash;                >&ndash;&gt;-->
<!--&lt;!&ndash;                  <v-icon left>mdi-content-save</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;                  保存&ndash;&gt;-->
<!--&lt;!&ndash;                </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                    color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;                    text&ndash;&gt;-->
<!--&lt;!&ndash;                    class="ml-2"&ndash;&gt;-->
<!--&lt;!&ndash;                    @click="cancelEdit"&ndash;&gt;-->
<!--&lt;!&ndash;                >&ndash;&gt;-->
<!--&lt;!&ndash;                  キャンセル&ndash;&gt;-->
<!--&lt;!&ndash;                </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;              </div>&ndash;&gt;-->
<!--&lt;!&ndash;              &lt;!&ndash; 通常表示 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;              <div v-else>&ndash;&gt;-->
<!--&lt;!&ndash;                <div class="d-flex align-center mb-2">&ndash;&gt;-->
<!--&lt;!&ndash;                  <v-avatar size="32" color="primary" class="mr-2">&ndash;&gt;-->
<!--&lt;!&ndash;                    <span class="white&#45;&#45;text text-caption">{{ comment.user[0] }}</span>&ndash;&gt;-->
<!--&lt;!&ndash;                  </v-avatar>&ndash;&gt;-->
<!--&lt;!&ndash;                  <div>&ndash;&gt;-->
<!--&lt;!&ndash;                    <span class="text-subtitle-2">{{ comment.user }}</span>&ndash;&gt;-->
<!--&lt;!&ndash;                    <small class="grey&#45;&#45;text ml-2">{{ formatDate(comment.date) }}</small>&ndash;&gt;-->
<!--&lt;!&ndash;                  </div>&ndash;&gt;-->
<!--&lt;!&ndash;                </div>&ndash;&gt;-->
<!--&lt;!&ndash;                <p class="text-body-1">{{ comment.text }}</p>&ndash;&gt;-->
<!--&lt;!&ndash;                <v-row align="center" class="mt-2">&ndash;&gt;-->
<!--&lt;!&ndash;                  <v-col cols="auto">&ndash;&gt;-->
<!--&lt;!&ndash;                    <v-tooltip top>&ndash;&gt;-->
<!--&lt;!&ndash;                      <template v-slot:activator="{ on, attrs }">&ndash;&gt;-->
<!--&lt;!&ndash;                        <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                            v-if="!comment.parentId"&ndash;&gt;-->
<!--&lt;!&ndash;                            color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;                            icon&ndash;&gt;-->
<!--&lt;!&ndash;                            small&ndash;&gt;-->
<!--&lt;!&ndash;                            @click="replyToComment(comment.id, comment.user)"&ndash;&gt;-->
<!--&lt;!&ndash;                            v-bind="attrs"&ndash;&gt;-->
<!--&lt;!&ndash;                            v-on="on"&ndash;&gt;-->
<!--&lt;!&ndash;                        >&ndash;&gt;-->
<!--&lt;!&ndash;                          <v-icon>mdi-reply</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;                        </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                      </template>&ndash;&gt;-->
<!--&lt;!&ndash;                      <span>返信</span>&ndash;&gt;-->
<!--&lt;!&ndash;                    </v-tooltip>&ndash;&gt;-->
<!--&lt;!&ndash;                    <v-tooltip top>&ndash;&gt;-->
<!--&lt;!&ndash;                      <template v-slot:activator="{ on, attrs }">&ndash;&gt;-->
<!--&lt;!&ndash;                        <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                            v-if="user && comment.user === user.nickname"&ndash;&gt;-->
<!--&lt;!&ndash;                            color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;                            icon&ndash;&gt;-->
<!--&lt;!&ndash;                            small&ndash;&gt;-->
<!--&lt;!&ndash;                            @click="startEdit(comment.id, comment.text)"&ndash;&gt;-->
<!--&lt;!&ndash;                            v-bind="attrs"&ndash;&gt;-->
<!--&lt;!&ndash;                            v-on="on"&ndash;&gt;-->
<!--&lt;!&ndash;                        >&ndash;&gt;-->
<!--&lt;!&ndash;                          <v-icon>mdi-pencil</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;                        </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                      </template>&ndash;&gt;-->
<!--&lt;!&ndash;                      <span>編集</span>&ndash;&gt;-->
<!--&lt;!&ndash;                    </v-tooltip>&ndash;&gt;-->
<!--&lt;!&ndash;                    <v-tooltip top>&ndash;&gt;-->
<!--&lt;!&ndash;                      <template v-slot:activator="{ on, attrs }">&ndash;&gt;-->
<!--&lt;!&ndash;                        <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                            v-if="user && comment.user === user.nickname && (!comment.replies || comment.replies.length === 0)"&ndash;&gt;-->
<!--&lt;!&ndash;                            color="error"&ndash;&gt;-->
<!--&lt;!&ndash;                            icon&ndash;&gt;-->
<!--&lt;!&ndash;                            small&ndash;&gt;-->
<!--&lt;!&ndash;                            @click="deleteComment(comment.id, comment.replies)"&ndash;&gt;-->
<!--&lt;!&ndash;                            v-bind="attrs"&ndash;&gt;-->
<!--&lt;!&ndash;                            v-on="on"&ndash;&gt;-->
<!--&lt;!&ndash;                        >&ndash;&gt;-->
<!--&lt;!&ndash;                          <v-icon>mdi-delete</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;                        </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                      </template>&ndash;&gt;-->
<!--&lt;!&ndash;                      <span>削除</span>&ndash;&gt;-->
<!--&lt;!&ndash;                    </v-tooltip>&ndash;&gt;-->
<!--&lt;!&ndash;                  </v-col>&ndash;&gt;-->
<!--&lt;!&ndash;                </v-row>&ndash;&gt;-->
<!--&lt;!&ndash;              </div>&ndash;&gt;-->
<!--&lt;!&ndash;              &lt;!&ndash; リプライ &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;              <div v-if="comment.replies" class="replies mt-4">&ndash;&gt;-->
<!--&lt;!&ndash;                <v-card&ndash;&gt;-->
<!--&lt;!&ndash;                    v-for="reply in comment.replies"&ndash;&gt;-->
<!--&lt;!&ndash;                    :key="reply.id"&ndash;&gt;-->
<!--&lt;!&ndash;                    class="reply mb-2"&ndash;&gt;-->
<!--&lt;!&ndash;                    elevation="0"&ndash;&gt;-->
<!--&lt;!&ndash;                    outlined&ndash;&gt;-->
<!--&lt;!&ndash;                >&ndash;&gt;-->
<!--&lt;!&ndash;                  <v-card-text>&ndash;&gt;-->
<!--&lt;!&ndash;                    &lt;!&ndash; リプライの編集モード &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;                    <div v-if="editingCommentId === reply.id && user && reply.user === user.nickname" class="edit-form">&ndash;&gt;-->
<!--&lt;!&ndash;                      <v-textarea&ndash;&gt;-->
<!--&lt;!&ndash;                          v-model="editedCommentText"&ndash;&gt;-->
<!--&lt;!&ndash;                          placeholder="リプライを編集"&ndash;&gt;-->
<!--&lt;!&ndash;                          rows="3"&ndash;&gt;-->
<!--&lt;!&ndash;                          outlined&ndash;&gt;-->
<!--&lt;!&ndash;                          dense&ndash;&gt;-->
<!--&lt;!&ndash;                          class="comment-textarea"&ndash;&gt;-->
<!--&lt;!&ndash;                      ></v-textarea>&ndash;&gt;-->
<!--&lt;!&ndash;                      <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                          color="success"&ndash;&gt;-->
<!--&lt;!&ndash;                          class="submit-btn"&ndash;&gt;-->
<!--&lt;!&ndash;                          @click="saveEditedComment(reply.id)"&ndash;&gt;-->
<!--&lt;!&ndash;                          :disabled="!editedCommentText.trim()"&ndash;&gt;-->
<!--&lt;!&ndash;                      >&ndash;&gt;-->
<!--&lt;!&ndash;                        <v-icon left>mdi-content-save</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;                        保存&ndash;&gt;-->
<!--&lt;!&ndash;                      </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                      <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                          color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;                          text&ndash;&gt;-->
<!--&lt;!&ndash;                          class="ml-2"&ndash;&gt;-->
<!--&lt;!&ndash;                          @click="cancelEdit"&ndash;&gt;-->
<!--&lt;!&ndash;                      >&ndash;&gt;-->
<!--&lt;!&ndash;                        キャンセル&ndash;&gt;-->
<!--&lt;!&ndash;                      </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                    </div>&ndash;&gt;-->
<!--&lt;!&ndash;                    &lt;!&ndash; リプライの通常表示 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;                    <div v-else>&ndash;&gt;-->
<!--&lt;!&ndash;                      <div class="d-flex align-center mb-2">&ndash;&gt;-->
<!--&lt;!&ndash;                        <v-avatar size="28" color="primary" class="mr-2">&ndash;&gt;-->
<!--&lt;!&ndash;                          <span class="white&#45;&#45;text text-caption">{{ reply.user[0] }}</span>&ndash;&gt;-->
<!--&lt;!&ndash;                        </v-avatar>&ndash;&gt;-->
<!--&lt;!&ndash;                        <div>&ndash;&gt;-->
<!--&lt;!&ndash;                          <span class="text-subtitle-2">{{ reply.user }}</span>&ndash;&gt;-->
<!--&lt;!&ndash;                          <small class="grey&#45;&#45;text ml-2">{{ formatDate(reply.date) }}</small>&ndash;&gt;-->
<!--&lt;!&ndash;                        </div>&ndash;&gt;-->
<!--&lt;!&ndash;                      </div>&ndash;&gt;-->
<!--&lt;!&ndash;                      <p class="text-body-1">{{ reply.text }}</p>&ndash;&gt;-->
<!--&lt;!&ndash;                      <v-row align="center" class="mt-2">&ndash;&gt;-->
<!--&lt;!&ndash;                        <v-col cols="auto">&ndash;&gt;-->
<!--&lt;!&ndash;                          <v-tooltip top>&ndash;&gt;-->
<!--&lt;!&ndash;                            <template v-slot:activator="{ on, attrs }">&ndash;&gt;-->
<!--&lt;!&ndash;                              <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                                  v-if="user && reply.user === user.nickname"&ndash;&gt;-->
<!--&lt;!&ndash;                                  color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;                                  icon&ndash;&gt;-->
<!--&lt;!&ndash;                                  small&ndash;&gt;-->
<!--&lt;!&ndash;                                  @click="startEdit(reply.id, reply.text)"&ndash;&gt;-->
<!--&lt;!&ndash;                                  v-bind="attrs"&ndash;&gt;-->
<!--&lt;!&ndash;                                  v-on="on"&ndash;&gt;-->
<!--&lt;!&ndash;                              >&ndash;&gt;-->
<!--&lt;!&ndash;                                <v-icon>mdi-pencil</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;                              </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                            </template>&ndash;&gt;-->
<!--&lt;!&ndash;                            <span>編集</span>&ndash;&gt;-->
<!--&lt;!&ndash;                          </v-tooltip>&ndash;&gt;-->
<!--&lt;!&ndash;                          <v-tooltip top>&ndash;&gt;-->
<!--&lt;!&ndash;                            <template v-slot:activator="{ on, attrs }">&ndash;&gt;-->
<!--&lt;!&ndash;                              <v-btn&ndash;&gt;-->
<!--&lt;!&ndash;                                  v-if="user && reply.user === user.nickname"&ndash;&gt;-->
<!--&lt;!&ndash;                                  color="error"&ndash;&gt;-->
<!--&lt;!&ndash;                                  icon&ndash;&gt;-->
<!--&lt;!&ndash;                                  small&ndash;&gt;-->
<!--&lt;!&ndash;                                  @click="deleteComment(reply.id)"&ndash;&gt;-->
<!--&lt;!&ndash;                                  v-bind="attrs"&ndash;&gt;-->
<!--&lt;!&ndash;                                  v-on="on"&ndash;&gt;-->
<!--&lt;!&ndash;                              >&ndash;&gt;-->
<!--&lt;!&ndash;                                <v-icon>mdi-delete</v-icon>&ndash;&gt;-->
<!--&lt;!&ndash;                              </v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;                            </template>&ndash;&gt;-->
<!--&lt;!&ndash;                            <span>削除</span>&ndash;&gt;-->
<!--&lt;!&ndash;                          </v-tooltip>&ndash;&gt;-->
<!--&lt;!&ndash;                        </v-col>&ndash;&gt;-->
<!--&lt;!&ndash;                      </v-row>&ndash;&gt;-->
<!--&lt;!&ndash;                    </div>&ndash;&gt;-->
<!--&lt;!&ndash;                  </v-card-text>&ndash;&gt;-->
<!--&lt;!&ndash;                </v-card>&ndash;&gt;-->
<!--&lt;!&ndash;              </div>&ndash;&gt;-->
<!--&lt;!&ndash;            </v-card-text>&ndash;&gt;-->
<!--&lt;!&ndash;          </v-card>&ndash;&gt;-->
<!--&lt;!&ndash;        </div>&ndash;&gt;-->
<!--&lt;!&ndash;      </v-card-text>&ndash;&gt;-->
<!--&lt;!&ndash;    </v-card>&ndash;&gt;-->
<!--&lt;!&ndash;  </v-navigation-drawer>&ndash;&gt;-->
<!--&lt;!&ndash;</template>&ndash;&gt;-->

<!--&lt;!&ndash;<script>&ndash;&gt;-->
<!--&lt;!&ndash;import { mapState, mapMutations } from 'vuex';&ndash;&gt;-->
<!--&lt;!&ndash;import { db, auth } from '../firebase';&ndash;&gt;-->
<!--&lt;!&ndash;import firebase from 'firebase/app';&ndash;&gt;-->
<!--&lt;!&ndash;import { publicChk } from '@/js/downLoad';&ndash;&gt;-->

<!--&lt;!&ndash;export default {&ndash;&gt;-->
<!--&lt;!&ndash;  name: 'chibanzuDrawer',&ndash;&gt;-->
<!--&lt;!&ndash;  components: {},&ndash;&gt;-->
<!--&lt;!&ndash;  data() {&ndash;&gt;-->
<!--&lt;!&ndash;    return {&ndash;&gt;-->
<!--&lt;!&ndash;      tab: '0',&ndash;&gt;-->
<!--&lt;!&ndash;      user: null,&ndash;&gt;-->
<!--&lt;!&ndash;      comments: [],&ndash;&gt;-->
<!--&lt;!&ndash;      newComment: '',&ndash;&gt;-->
<!--&lt;!&ndash;      replyingTo: null,&ndash;&gt;-->
<!--&lt;!&ndash;      replyingToUser: '',&ndash;&gt;-->
<!--&lt;!&ndash;      unsubscribe: null,&ndash;&gt;-->
<!--&lt;!&ndash;      editingCommentId: null,&ndash;&gt;-->
<!--&lt;!&ndash;      editedCommentText: '',&ndash;&gt;-->
<!--&lt;!&ndash;      hoverComment: null,&ndash;&gt;-->
<!--&lt;!&ndash;    };&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  computed: {&ndash;&gt;-->
<!--&lt;!&ndash;    ...mapState([&ndash;&gt;-->
<!--&lt;!&ndash;      'showChibanzuDrawer',&ndash;&gt;-->
<!--&lt;!&ndash;      'popupFeatureProperties',&ndash;&gt;-->
<!--&lt;!&ndash;      'popupFeatureCoordinates'&ndash;&gt;-->
<!--&lt;!&ndash;    ]),&ndash;&gt;-->
<!--&lt;!&ndash;    cityCode() {&ndash;&gt;-->
<!--&lt;!&ndash;      return this.popupFeatureProperties?.N03_007?.padStart(5, '0') || '';&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    prefName() {&ndash;&gt;-->
<!--&lt;!&ndash;      return this.popupFeatureProperties?.N03_001;&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    cityName() {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!this.popupFeatureProperties) return '';&ndash;&gt;-->
<!--&lt;!&ndash;      if (this.popupFeatureProperties.N03_004 === '札幌市') {&ndash;&gt;-->
<!--&lt;!&ndash;        return (this.popupFeatureProperties.N03_001 || '') +&ndash;&gt;-->
<!--&lt;!&ndash;            (this.popupFeatureProperties.N03_004 || '') +&ndash;&gt;-->
<!--&lt;!&ndash;            (this.popupFeatureProperties.N03_005 || '');&ndash;&gt;-->
<!--&lt;!&ndash;      } else {&ndash;&gt;-->
<!--&lt;!&ndash;        return (this.popupFeatureProperties.N03_001 || '') +&ndash;&gt;-->
<!--&lt;!&ndash;            (this.popupFeatureProperties.N03_004 || '');&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    s_isAndroid() {&ndash;&gt;-->
<!--&lt;!&ndash;      return this.$store.state.isAndroid;&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    drawerWidth() {&ndash;&gt;-->
<!--&lt;!&ndash;      return window.innerWidth;&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    visible: {&ndash;&gt;-->
<!--&lt;!&ndash;      get() {&ndash;&gt;-->
<!--&lt;!&ndash;        return this.showChibanzuDrawer;&ndash;&gt;-->
<!--&lt;!&ndash;      },&ndash;&gt;-->
<!--&lt;!&ndash;      set(val) {&ndash;&gt;-->
<!--&lt;!&ndash;        this.setChibanzuDrawer(val);&ndash;&gt;-->
<!--&lt;!&ndash;        if (!val) {&ndash;&gt;-->
<!--&lt;!&ndash;          this.title = '';&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->
<!--&lt;!&ndash;      },&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  created() {&ndash;&gt;-->
<!--&lt;!&ndash;    auth.onAuthStateChanged((user) => {&ndash;&gt;-->
<!--&lt;!&ndash;      if (user) {&ndash;&gt;-->
<!--&lt;!&ndash;        const nickname = user.displayName || user.email;&ndash;&gt;-->
<!--&lt;!&ndash;        this.user = { ...user, nickname };&ndash;&gt;-->
<!--&lt;!&ndash;      } else {&ndash;&gt;-->
<!--&lt;!&ndash;        this.user = null;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    });&ndash;&gt;-->

<!--&lt;!&ndash;    if (this.cityCode) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.loadComments();&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  beforeUnmount() {&ndash;&gt;-->
<!--&lt;!&ndash;    if (this.unsubscribe) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.unsubscribe();&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  watch: {&ndash;&gt;-->
<!--&lt;!&ndash;    cityCode(newVal) {&ndash;&gt;-->
<!--&lt;!&ndash;      if (newVal) {&ndash;&gt;-->
<!--&lt;!&ndash;        this.loadComments();&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  methods: {&ndash;&gt;-->
<!--&lt;!&ndash;    ...mapMutations([&ndash;&gt;-->
<!--&lt;!&ndash;      'setChibanzuDrawer',&ndash;&gt;-->
<!--&lt;!&ndash;    ]),&ndash;&gt;-->
<!--&lt;!&ndash;    async red() {&ndash;&gt;-->
<!--&lt;!&ndash;      const url = 'https://kenzkenz.xsrv.jp/open-hinata3/php/userChibanzumapRedUpdate.php';&ndash;&gt;-->
<!--&lt;!&ndash;      const data = {&ndash;&gt;-->
<!--&lt;!&ndash;        citycode: this.cityCode,&ndash;&gt;-->
<!--&lt;!&ndash;        prefname: this.prefName,&ndash;&gt;-->
<!--&lt;!&ndash;        cityname: this.cityName&ndash;&gt;-->
<!--&lt;!&ndash;      };&ndash;&gt;-->
<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        const response = await fetch(url, {&ndash;&gt;-->
<!--&lt;!&ndash;          method: 'POST',&ndash;&gt;-->
<!--&lt;!&ndash;          headers: {&ndash;&gt;-->
<!--&lt;!&ndash;            'Content-Type': 'application/json'&ndash;&gt;-->
<!--&lt;!&ndash;          },&ndash;&gt;-->
<!--&lt;!&ndash;          body: JSON.stringify(data)&ndash;&gt;-->
<!--&lt;!&ndash;        });&ndash;&gt;-->
<!--&lt;!&ndash;        const result = await response.json();&ndash;&gt;-->
<!--&lt;!&ndash;        if (result.error) {&ndash;&gt;-->
<!--&lt;!&ndash;          console.log(result);&ndash;&gt;-->
<!--&lt;!&ndash;        } else {&ndash;&gt;-->
<!--&lt;!&ndash;          console.log(result);&ndash;&gt;-->
<!--&lt;!&ndash;          publicChk();&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.log(error);&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    close() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.setChibanzuDrawer(false);&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    login() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.$emit('login');&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    async loadComments() {&ndash;&gt;-->
<!--&lt;!&ndash;      if (this.unsubscribe) {&ndash;&gt;-->
<!--&lt;!&ndash;        this.unsubscribe();&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');&ndash;&gt;-->
<!--&lt;!&ndash;      this.unsubscribe = commentsRef.orderBy('date', 'desc').onSnapshot(async (snapshot) => {&ndash;&gt;-->
<!--&lt;!&ndash;        const commentList = [];&ndash;&gt;-->
<!--&lt;!&ndash;        const allComments = [];&ndash;&gt;-->
<!--&lt;!&ndash;        const emailToNicknameMap = new Map();&ndash;&gt;-->

<!--&lt;!&ndash;        snapshot.forEach((doc) => {&ndash;&gt;-->
<!--&lt;!&ndash;          const comment = doc.data();&ndash;&gt;-->
<!--&lt;!&ndash;          comment.id = doc.id;&ndash;&gt;-->
<!--&lt;!&ndash;          allComments.push(comment);&ndash;&gt;-->
<!--&lt;!&ndash;        });&ndash;&gt;-->

<!--&lt;!&ndash;        for (const comment of allComments) {&ndash;&gt;-->
<!--&lt;!&ndash;          if (!emailToNicknameMap.has(comment.user)) {&ndash;&gt;-->
<!--&lt;!&ndash;            try {&ndash;&gt;-->
<!--&lt;!&ndash;              const userSnapshot = await db.collection('users')&ndash;&gt;-->
<!--&lt;!&ndash;                  .where('email', '==', comment.user)&ndash;&gt;-->
<!--&lt;!&ndash;                  .limit(1)&ndash;&gt;-->
<!--&lt;!&ndash;                  .get();&ndash;&gt;-->
<!--&lt;!&ndash;              if (!userSnapshot.empty) {&ndash;&gt;-->
<!--&lt;!&ndash;                const userDoc = userSnapshot.docs[0];&ndash;&gt;-->
<!--&lt;!&ndash;                const userData = userDoc.data();&ndash;&gt;-->
<!--&lt;!&ndash;                emailToNicknameMap.set(comment.user, userData.displayName || comment.user);&ndash;&gt;-->
<!--&lt;!&ndash;              } else {&ndash;&gt;-->
<!--&lt;!&ndash;                emailToNicknameMap.set(comment.user, comment.user);&ndash;&gt;-->
<!--&lt;!&ndash;              }&ndash;&gt;-->
<!--&lt;!&ndash;            } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;              console.error('ユーザー取得エラー:', error);&ndash;&gt;-->
<!--&lt;!&ndash;              emailToNicknameMap.set(comment.user, comment.user);&ndash;&gt;-->
<!--&lt;!&ndash;            }&ndash;&gt;-->
<!--&lt;!&ndash;          }&ndash;&gt;-->
<!--&lt;!&ndash;          comment.user = emailToNicknameMap.get(comment.user);&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        allComments.forEach((comment) => {&ndash;&gt;-->
<!--&lt;!&ndash;          if (!comment.parentId) {&ndash;&gt;-->
<!--&lt;!&ndash;            comment.replies = allComments.filter(reply => reply.parentId === comment.id);&ndash;&gt;-->
<!--&lt;!&ndash;            commentList.push(comment);&ndash;&gt;-->
<!--&lt;!&ndash;          }&ndash;&gt;-->
<!--&lt;!&ndash;        });&ndash;&gt;-->

<!--&lt;!&ndash;        this.comments = commentList;&ndash;&gt;-->
<!--&lt;!&ndash;      }, (error) => {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error('コメント取得エラー:', error);&ndash;&gt;-->
<!--&lt;!&ndash;      });&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    async submitComment() {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!this.newComment.trim()) return;&ndash;&gt;-->
<!--&lt;!&ndash;      if (!this.user) {&ndash;&gt;-->
<!--&lt;!&ndash;        alert('ログインしてください');&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      const commentData = {&ndash;&gt;-->
<!--&lt;!&ndash;        text: this.newComment,&ndash;&gt;-->
<!--&lt;!&ndash;        user: this.user.nickname,&ndash;&gt;-->
<!--&lt;!&ndash;        date: new Date().toISOString(),&ndash;&gt;-->
<!--&lt;!&ndash;        parentId: this.replyingTo || null,&ndash;&gt;-->
<!--&lt;!&ndash;      };&ndash;&gt;-->

<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');&ndash;&gt;-->
<!--&lt;!&ndash;        await commentsRef.add(commentData);&ndash;&gt;-->
<!--&lt;!&ndash;        this.newComment = '';&ndash;&gt;-->
<!--&lt;!&ndash;        this.replyingTo = null;&ndash;&gt;-->
<!--&lt;!&ndash;        this.replyingToUser = '';&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error('コメント投稿エラー:', error);&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    replyToComment(commentId, user) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.replyingTo = commentId;&ndash;&gt;-->
<!--&lt;!&ndash;      this.replyingToUser = user;&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    cancelReply() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.replyingTo = null;&ndash;&gt;-->
<!--&lt;!&ndash;      this.replyingToUser = '';&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    async deleteComment(commentId, replies = []) {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!confirm('このコメントを削除しますか？')) return;&ndash;&gt;-->

<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');&ndash;&gt;-->
<!--&lt;!&ndash;        const batch = db.batch();&ndash;&gt;-->

<!--&lt;!&ndash;        batch.delete(commentsRef.doc(commentId));&ndash;&gt;-->

<!--&lt;!&ndash;        if (replies.length > 0) {&ndash;&gt;-->
<!--&lt;!&ndash;          replies.forEach(reply => {&ndash;&gt;-->
<!--&lt;!&ndash;            batch.delete(commentsRef.doc(reply.id));&ndash;&gt;-->
<!--&lt;!&ndash;          });&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        await batch.commit();&ndash;&gt;-->
<!--&lt;!&ndash;        console.log('コメントを削除しました');&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error('コメント削除エラー:', error);&ndash;&gt;-->
<!--&lt;!&ndash;        alert('コメント削除に失敗しました');&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    formatDate(timestamp) {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!timestamp) return '';&ndash;&gt;-->
<!--&lt;!&ndash;      const date = new Date(timestamp);&ndash;&gt;-->
<!--&lt;!&ndash;      return date.toLocaleString('ja-JP');&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    startEdit(commentId, commentText) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.editingCommentId = commentId;&ndash;&gt;-->
<!--&lt;!&ndash;      this.editedCommentText = commentText;&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    async saveEditedComment(commentId) {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!this.editedCommentText.trim()) {&ndash;&gt;-->
<!--&lt;!&ndash;        alert('コメントを入力してください');&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');&ndash;&gt;-->
<!--&lt;!&ndash;        await commentsRef.doc(commentId).update({&ndash;&gt;-->
<!--&lt;!&ndash;          text: this.editedCommentText,&ndash;&gt;-->
<!--&lt;!&ndash;          date: new Date().toISOString(),&ndash;&gt;-->
<!--&lt;!&ndash;        });&ndash;&gt;-->
<!--&lt;!&ndash;        this.editingCommentId = null;&ndash;&gt;-->
<!--&lt;!&ndash;        this.editedCommentText = '';&ndash;&gt;-->
<!--&lt;!&ndash;        console.log('コメントを編集しました');&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error('コメント編集エラー:', error);&ndash;&gt;-->
<!--&lt;!&ndash;        alert('コメント編集に失敗しました');&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    cancelEdit() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.editingCommentId = null;&ndash;&gt;-->
<!--&lt;!&ndash;      this.editedCommentText = '';&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;};&ndash;&gt;-->
<!--&lt;!&ndash;</script>&ndash;&gt;-->

<!--&lt;!&ndash;<style scoped>&ndash;&gt;-->
<!--&lt;!&ndash;.drawer {&ndash;&gt;-->
<!--&lt;!&ndash;  height: 100%;&ndash;&gt;-->
<!--&lt;!&ndash;  overflow-y: auto;&ndash;&gt;-->
<!--&lt;!&ndash;  overscroll-behavior: contain;&ndash;&gt;-->
<!--&lt;!&ndash;  -webkit-overflow-scrolling: auto;&ndash;&gt;-->
<!--&lt;!&ndash;  background-color: #f5f5f5;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.point-info-drawer {&ndash;&gt;-->
<!--&lt;!&ndash;  z-index: 2500;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.header {&ndash;&gt;-->
<!--&lt;!&ndash;  background: linear-gradient(90deg, #1976d2, #42a5f5);&ndash;&gt;-->
<!--&lt;!&ndash;  color: white;&ndash;&gt;-->
<!--&lt;!&ndash;  display: flex;&ndash;&gt;-->
<!--&lt;!&ndash;  align-items: center;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 12px 16px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.close-btn {&ndash;&gt;-->
<!--&lt;!&ndash;  transition: transform 0.2s;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.close-btn:hover {&ndash;&gt;-->
<!--&lt;!&ndash;  transform: scale(1.2);&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.comment-form {&ndash;&gt;-->
<!--&lt;!&ndash;  background: white;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 8px;&ndash;&gt;-->
<!--&lt;!&ndash;  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.comment-textarea {&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 8px;&ndash;&gt;-->
<!--&lt;!&ndash;  transition: box-shadow 0.2s;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.comment-textarea:focus-within {&ndash;&gt;-->
<!--&lt;!&ndash;  box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.submit-btn {&ndash;&gt;-->
<!--&lt;!&ndash;  transition: transform 0.2s;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.submit-btn:hover {&ndash;&gt;-->
<!--&lt;!&ndash;  transform: translateY(-2px);&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.comment-list {&ndash;&gt;-->
<!--&lt;!&ndash;  margin-top: 24px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.comment {&ndash;&gt;-->
<!--&lt;!&ndash;  transition: all 0.2s;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 8px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.comment:hover {&ndash;&gt;-->
<!--&lt;!&ndash;  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);&ndash;&gt;-->
<!--&lt;!&ndash;  transform: scale(1.01);&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.replies {&ndash;&gt;-->
<!--&lt;!&ndash;  margin-left: 24px;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-top: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;  border-left: 2px solid #e0e0e0;&ndash;&gt;-->
<!--&lt;!&ndash;  padding-left: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.reply {&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 8px;&ndash;&gt;-->
<!--&lt;!&ndash;  background: #fafafa;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.login-prompt {&ndash;&gt;-->
<!--&lt;!&ndash;  background: white;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 24px;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 8px;&ndash;&gt;-->
<!--&lt;!&ndash;  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.replying-to {&ndash;&gt;-->
<!--&lt;!&ndash;  font-size: 14px;&ndash;&gt;-->
<!--&lt;!&ndash;  color: #666;&ndash;&gt;-->
<!--&lt;!&ndash;  display: flex;&ndash;&gt;-->
<!--&lt;!&ndash;  align-items: center;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.edit-form {&ndash;&gt;-->
<!--&lt;!&ndash;  background: #e8f0fe;&ndash;&gt;-->
<!--&lt;!&ndash;  padding: 16px;&ndash;&gt;-->
<!--&lt;!&ndash;  border-radius: 8px;&ndash;&gt;-->
<!--&lt;!&ndash;  margin-bottom: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* フェードアニメーション */&ndash;&gt;-->
<!--&lt;!&ndash;.fade-enter-active,&ndash;&gt;-->
<!--&lt;!&ndash;.fade-leave-active {&ndash;&gt;-->
<!--&lt;!&ndash;  transition: opacity 0.3s ease;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;.fade-enter-from,&ndash;&gt;-->
<!--&lt;!&ndash;.fade-leave-to {&ndash;&gt;-->
<!--&lt;!&ndash;  opacity: 0;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->

<!--&lt;!&ndash;/* レスポンシブデザイン */&ndash;&gt;-->
<!--&lt;!&ndash;@media (max-width: 600px) {&ndash;&gt;-->
<!--&lt;!&ndash;  .point-info-drawer {&ndash;&gt;-->
<!--&lt;!&ndash;    width: 100% !important;&ndash;&gt;-->
<!--&lt;!&ndash;  }&ndash;&gt;-->

<!--&lt;!&ndash;  .submit-btn {&ndash;&gt;-->
<!--&lt;!&ndash;    width: 100%;&ndash;&gt;-->
<!--&lt;!&ndash;    margin-bottom: 8px;&ndash;&gt;-->
<!--&lt;!&ndash;  }&ndash;&gt;-->

<!--&lt;!&ndash;  .comment-form {&ndash;&gt;-->
<!--&lt;!&ndash;    padding: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  }&ndash;&gt;-->

<!--&lt;!&ndash;  .comment {&ndash;&gt;-->
<!--&lt;!&ndash;    padding: 12px;&ndash;&gt;-->
<!--&lt;!&ndash;  }&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</style>&ndash;&gt;-->

<!--<template>-->
<!--  <v-navigation-drawer-->
<!--      width="400"-->
<!--      temporary-->
<!--      :scrim="false"-->
<!--      v-model="visible"-->
<!--      location="right"-->
<!--      class="point-info-drawer"-->
<!--  >-->
<!--    <v-card flat class="bg-white drawer" style="border-radius: 0;">-->
<!--      <v-card-title class="text-h6 text-white" style="background-color: var(&#45;&#45;main-color); height: 40px; display: flex; align-items: center;">-->
<!--        全国地番図公開マップ-->
<!--        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; font-size: 30px!important;" @click="close">-->
<!--          <i class="fa-solid fa-xmark hover"></i>-->
<!--        </div>-->
<!--      </v-card-title>-->

<!--      <v-card-text style="margin-top: 20px;">-->
<!--        <h2 v-if="cityName || cityCode">-->
<!--          {{ (cityName || '') }}-->
<!--        </h2>-->
<!--        <p v-else>自治体を選択してください</p>-->

<!--        <v-btn v-if="user"-->
<!--               style="margin-top: 20px;"-->
<!--               color="error"-->
<!--               @click="red"-->
<!--        >-->
<!--          赤色onoff-->
<!--        </v-btn>-->

<!--        <span v-if="user" style="margin-left: 20px;">既に色がついている場合は無効</span>-->
<!--        &lt;!&ndash; コメント投稿フォーム &ndash;&gt;-->
<!--        <div v-if="user" class="comment-form mt-4">-->
<!--          <div v-if="replyingTo" class="replying-to mb-2">-->
<!--            <span>{{ replyingToUser }} への返信</span>-->
<!--          </div>-->
<!--          <v-textarea-->
<!--              v-model="newComment"-->
<!--              :placeholder="replyingTo ? '返信を入力' : 'コメントを入力'"-->
<!--              rows="3"-->
<!--              outlined-->
<!--              dense-->
<!--          ></v-textarea>-->
<!--          <v-btn-->
<!--              color="primary"-->
<!--              @click="submitComment"-->
<!--              :disabled="!newComment.trim()"-->
<!--          >-->
<!--            投稿-->
<!--          </v-btn>-->
<!--          <v-btn v-if="replyingTo"-->
<!--                 style="margin-left: 10px;"-->
<!--                 color="primary"-->
<!--                 small-->
<!--                 text-->
<!--                 @click="cancelReply"-->
<!--          >-->
<!--            返信をキャンセル-->
<!--          </v-btn>-->
<!--        </div>-->
<!--        <div v-else class="login-prompt mt-4">-->
<!--          <p>コメントするにはログインしてください</p>-->
<!--        </div>-->

<!--        &lt;!&ndash; コメントリスト &ndash;&gt;-->
<!--        <div class="comment-list mt-6">-->
<!--          <v-card-->
<!--              v-for="comment in comments"-->
<!--              :key="comment.id"-->
<!--              class="comment mb-2"-->
<!--              outlined-->
<!--          >-->
<!--            <v-card-text>-->
<!--              &lt;!&ndash; 編集モードの場合 &ndash;&gt;-->
<!--              <div v-if="editingCommentId === comment.id && user && comment.user === user.nickname">-->
<!--                <v-textarea-->
<!--                    v-model="editedCommentText"-->
<!--                    placeholder="コメントを編集"-->
<!--                    rows="3"-->
<!--                    outlined-->
<!--                    dense-->
<!--                ></v-textarea>-->
<!--                <v-btn-->
<!--                    color="success"-->
<!--                    @click="saveEditedComment(comment.id)"-->
<!--                    :disabled="!editedCommentText.trim()"-->
<!--                >-->
<!--                  保存-->
<!--                </v-btn>-->
<!--                <v-btn-->
<!--                    color="primary"-->
<!--                    text-->
<!--                    @click="cancelEdit"-->
<!--                    style="margin-left: 10px;"-->
<!--                >-->
<!--                  キャンセル-->
<!--                </v-btn>-->
<!--              </div>-->
<!--              &lt;!&ndash; 通常表示の場合 &ndash;&gt;-->
<!--              <div v-else>-->
<!--                <p>{{ comment.text }}</p>-->
<!--                <v-row align="center">-->
<!--                  <v-col>-->
<!--                    <small>{{ comment.user }} - {{ formatDate(comment.date) }}</small>-->
<!--                  </v-col>-->
<!--                  <v-col cols="auto">-->
<!--                    <v-btn-->
<!--                        v-if="!comment.parentId"-->
<!--                        color="primary"-->
<!--                        small-->
<!--                        @click="replyToComment(comment.id, comment.user)"-->
<!--                    >-->
<!--                      返信-->
<!--                    </v-btn>-->
<!--                    <v-btn-->
<!--                        v-if="user && comment.user === user.nickname"-->
<!--                        color="primary"-->
<!--                        small-->
<!--                        @click="startEdit(comment.id, comment.text)"-->
<!--                        class="ml-2"-->
<!--                    >-->
<!--                      編集-->
<!--                    </v-btn>-->
<!--                    <v-btn-->
<!--                        v-if="user && comment.user === user.nickname && (!comment.replies || comment.replies.length === 0)"-->
<!--                        color="error"-->
<!--                        small-->
<!--                        @click="deleteComment(comment.id, comment.replies)"-->
<!--                        class="ml-2"-->
<!--                    >-->
<!--                      削除-->
<!--                    </v-btn>-->
<!--                  </v-col>-->
<!--                </v-row>-->
<!--              </div>-->
<!--              &lt;!&ndash; リプライ &ndash;&gt;-->
<!--              <div v-if="comment.replies" class="replies mt-2">-->
<!--                <v-card-->
<!--                    v-for="reply in comment.replies"-->
<!--                    :key="reply.id"-->
<!--                    class="reply mb-1"-->
<!--                    outlined-->
<!--                >-->
<!--                  <v-card-text>-->
<!--                    &lt;!&ndash; リプライの編集モード &ndash;&gt;-->
<!--                    <div v-if="editingCommentId === reply.id && user && reply.user === user.nickname">-->
<!--                      <v-textarea-->
<!--                          v-model="editedCommentText"-->
<!--                          placeholder="リプライを編集"-->
<!--                          rows="3"-->
<!--                          outlined-->
<!--                          dense-->
<!--                      ></v-textarea>-->
<!--                      <v-btn-->
<!--                          color="success"-->
<!--                          @click="saveEditedComment(reply.id)"-->
<!--                          :disabled="!editedCommentText.trim()"-->
<!--                      >-->
<!--                        保存-->
<!--                      </v-btn>-->
<!--                      <v-btn-->
<!--                          color="primary"-->
<!--                          text-->
<!--                          @click="cancelEdit"-->
<!--                          style="margin-left: 10px;"-->
<!--                      >-->
<!--                        キャンセル-->
<!--                      </v-btn>-->
<!--                    </div>-->
<!--                    &lt;!&ndash; リプライの通常表示 &ndash;&gt;-->
<!--                    <div v-else>-->
<!--                      <p>{{ reply.text }}</p>-->
<!--                      <v-row align="center">-->
<!--                        <v-col>-->
<!--                          <small>{{ reply.user }} - {{ formatDate(reply.date) }}</small>-->
<!--                        </v-col>-->
<!--                        <v-col cols="auto">-->
<!--                          <v-btn-->
<!--                              v-if="user && reply.user === user.nickname"-->
<!--                              color="primary"-->
<!--                              small-->
<!--                              @click="startEdit(reply.id, reply.text)"-->
<!--                          >-->
<!--                            編集-->
<!--                          </v-btn>-->
<!--                          <v-btn-->
<!--                              v-if="user && reply.user === user.nickname"-->
<!--                              color="error"-->
<!--                              small-->
<!--                              @click="deleteComment(reply.id)"-->
<!--                              class="ml-2"-->
<!--                          >-->
<!--                            削除-->
<!--                          </v-btn>-->
<!--                        </v-col>-->
<!--                      </v-row>-->
<!--                    </div>-->
<!--                  </v-card-text>-->
<!--                </v-card>-->
<!--              </div>-->
<!--            </v-card-text>-->
<!--          </v-card>-->
<!--        </div>-->
<!--      </v-card-text>-->
<!--    </v-card>-->
<!--  </v-navigation-drawer>-->
<!--</template>-->

<!--<script>-->
<!--import { mapState, mapMutations } from 'vuex';-->
<!--import { db, auth } from '../firebase';-->
<!--import firebase from 'firebase/app';-->
<!--import { publicChk } from '@/js/downLoad';-->

<!--export default {-->
<!--  name: 'chibanzuDrawer',-->
<!--  components: {},-->
<!--  data() {-->
<!--    return {-->
<!--      tab: '0',-->
<!--      user: null,-->
<!--      comments: [],-->
<!--      newComment: '',-->
<!--      replyingTo: null,-->
<!--      replyingToUser: '',-->
<!--      unsubscribe: null,-->
<!--      editingCommentId: null, // 編集中のコメントID-->
<!--      editedCommentText: '',  // 編集中のコメントテキスト-->
<!--    };-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState([-->
<!--      'showChibanzuDrawer',-->
<!--      'popupFeatureProperties',-->
<!--      'popupFeatureCoordinates'-->
<!--    ]),-->
<!--    cityCode() {-->
<!--      return this.popupFeatureProperties?.N03_007?.padStart(5, '0') || '';-->
<!--    },-->
<!--    prefName() {-->
<!--      return this.popupFeatureProperties?.N03_001;-->
<!--    },-->
<!--    cityName() {-->
<!--      if (!this.popupFeatureProperties) return '';-->
<!--      if (this.popupFeatureProperties.N03_004 === '札幌市') {-->
<!--        return (this.popupFeatureProperties.N03_001 || '') +-->
<!--            (this.popupFeatureProperties.N03_004 || '') +-->
<!--            (this.popupFeatureProperties.N03_005 || '');-->
<!--      } else {-->
<!--        return (this.popupFeatureProperties.N03_001 || '') +-->
<!--            (this.popupFeatureProperties.N03_004 || '');-->
<!--      }-->
<!--    },-->
<!--    s_isAndroid() {-->
<!--      return this.$store.state.isAndroid;-->
<!--    },-->
<!--    drawerWidth() {-->
<!--      return window.innerWidth;-->
<!--    },-->
<!--    visible: {-->
<!--      get() {-->
<!--        return this.showChibanzuDrawer;-->
<!--      },-->
<!--      set(val) {-->
<!--        this.setChibanzuDrawer(val);-->
<!--        if (!val) {-->
<!--          this.title = '';-->
<!--        }-->
<!--      },-->
<!--    },-->
<!--  },-->
<!--  created() {-->
<!--    auth.onAuthStateChanged((user) => {-->
<!--      if (user) {-->
<!--        const nickname = user.displayName || user.email;-->
<!--        this.user = { ...user, nickname };-->
<!--      } else {-->
<!--        this.user = null;-->
<!--      }-->
<!--    });-->

<!--    if (this.cityCode) {-->
<!--      this.loadComments();-->
<!--    }-->
<!--  },-->
<!--  beforeUnmount() {-->
<!--    if (this.unsubscribe) {-->
<!--      this.unsubscribe();-->
<!--    }-->
<!--  },-->
<!--  watch: {-->
<!--    cityCode(newVal) {-->
<!--      if (newVal) {-->
<!--        this.loadComments();-->
<!--      }-->
<!--    },-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setChibanzuDrawer',-->
<!--    ]),-->
<!--    async red() {-->
<!--      const url = 'https://kenzkenz.xsrv.jp/open-hinata3/php/userChibanzumapRedUpdate.php';-->
<!--      const data = {-->
<!--        citycode: this.cityCode,-->
<!--        prefname: this.prefName,-->
<!--        cityname: this.cityName-->
<!--      };-->
<!--      try {-->
<!--        const response = await fetch(url, {-->
<!--          method: 'POST',-->
<!--          headers: {-->
<!--            'Content-Type': 'application/json'-->
<!--          },-->
<!--          body: JSON.stringify(data)-->
<!--        });-->
<!--        const result = await response.json();-->
<!--        if (result.error) {-->
<!--          console.log(result);-->
<!--        } else {-->
<!--          console.log(result);-->
<!--          publicChk();-->
<!--        }-->
<!--      } catch (error) {-->
<!--        console.log(error);-->
<!--      }-->
<!--    },-->
<!--    close() {-->
<!--      this.setChibanzuDrawer(false);-->
<!--    },-->
<!--    login() {-->
<!--      this.$emit('login');-->
<!--    },-->
<!--    async loadComments() {-->
<!--      if (this.unsubscribe) {-->
<!--        this.unsubscribe();-->
<!--      }-->

<!--      const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');-->
<!--      this.unsubscribe = commentsRef.orderBy('date', 'desc').onSnapshot(async (snapshot) => {-->
<!--        const commentList = [];-->
<!--        const allComments = [];-->
<!--        const emailToNicknameMap = new Map();-->

<!--        snapshot.forEach((doc) => {-->
<!--          const comment = doc.data();-->
<!--          comment.id = doc.id;-->
<!--          allComments.push(comment);-->
<!--        });-->

<!--        for (const comment of allComments) {-->
<!--          if (!emailToNicknameMap.has(comment.user)) {-->
<!--            try {-->
<!--              const userSnapshot = await db.collection('users')-->
<!--                  .where('email', '==', comment.user)-->
<!--                  .limit(1)-->
<!--                  .get();-->
<!--              if (!userSnapshot.empty) {-->
<!--                const userDoc = userSnapshot.docs[0];-->
<!--                const userData = userDoc.data();-->
<!--                emailToNicknameMap.set(comment.user, userData.displayName || comment.user);-->
<!--              } else {-->
<!--                emailToNicknameMap.set(comment.user, comment.user);-->
<!--              }-->
<!--            } catch (error) {-->
<!--              console.error('ユーザー取得エラー:', error);-->
<!--              emailToNicknameMap.set(comment.user, comment.user);-->
<!--            }-->
<!--          }-->
<!--          comment.user = emailToNicknameMap.get(comment.user);-->
<!--        }-->

<!--        allComments.forEach((comment) => {-->
<!--          if (!comment.parentId) {-->
<!--            comment.replies = allComments.filter(reply => reply.parentId === comment.id);-->
<!--            commentList.push(comment);-->
<!--          }-->
<!--        });-->

<!--        this.comments = commentList;-->
<!--      }, (error) => {-->
<!--        console.error('コメント取得エラー:', error);-->
<!--      });-->
<!--    },-->
<!--    async submitComment() {-->
<!--      if (!this.newComment.trim()) return;-->
<!--      if (!this.user) {-->
<!--        alert('ログインしてください');-->
<!--        return;-->
<!--      }-->

<!--      const commentData = {-->
<!--        text: this.newComment,-->
<!--        user: this.user.nickname,-->
<!--        date: new Date().toISOString(),-->
<!--        parentId: this.replyingTo || null,-->
<!--      };-->

<!--      try {-->
<!--        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');-->
<!--        await commentsRef.add(commentData);-->
<!--        this.newComment = '';-->
<!--        this.replyingTo = null;-->
<!--        this.replyingToUser = '';-->
<!--      } catch (error) {-->
<!--        console.error('コメント投稿エラー:', error);-->
<!--      }-->
<!--    },-->
<!--    replyToComment(commentId, user) {-->
<!--      this.replyingTo = commentId;-->
<!--      this.replyingToUser = user;-->
<!--    },-->
<!--    cancelReply() {-->
<!--      this.replyingTo = null;-->
<!--      this.replyingToUser = '';-->
<!--    },-->
<!--    async deleteComment(commentId, replies = []) {-->
<!--      if (!confirm('このコメントを削除しますか？')) return;-->

<!--      try {-->
<!--        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');-->
<!--        const batch = db.batch();-->

<!--        batch.delete(commentsRef.doc(commentId));-->

<!--        if (replies.length > 0) {-->
<!--          replies.forEach(reply => {-->
<!--            batch.delete(commentsRef.doc(reply.id));-->
<!--          });-->
<!--        }-->

<!--        await batch.commit();-->
<!--        console.log('コメントを削除しました');-->
<!--      } catch (error) {-->
<!--        console.error('コメント削除エラー:', error);-->
<!--        alert('コメント削除に失敗しました');-->
<!--      }-->
<!--    },-->
<!--    formatDate(timestamp) {-->
<!--      if (!timestamp) return '';-->
<!--      const date = new Date(timestamp);-->
<!--      return date.toLocaleString('ja-JP');-->
<!--    },-->
<!--    startEdit(commentId, commentText) {-->
<!--      this.editingCommentId = commentId;-->
<!--      this.editedCommentText = commentText;-->
<!--    },-->
<!--    async saveEditedComment(commentId) {-->
<!--      if (!this.editedCommentText.trim()) {-->
<!--        alert('コメントを入力してください');-->
<!--        return;-->
<!--      }-->

<!--      try {-->
<!--        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');-->
<!--        await commentsRef.doc(commentId).update({-->
<!--          text: this.editedCommentText,-->
<!--          date: new Date().toISOString(), // 編集時刻を更新-->
<!--        });-->
<!--        this.editingCommentId = null;-->
<!--        this.editedCommentText = '';-->
<!--        console.log('コメントを編集しました');-->
<!--      } catch (error) {-->
<!--        console.error('コメント編集エラー:', error);-->
<!--        alert('コメント編集に失敗しました');-->
<!--      }-->
<!--    },-->
<!--    cancelEdit() {-->
<!--      this.editingCommentId = null;-->
<!--      this.editedCommentText = '';-->
<!--    },-->
<!--  },-->
<!--};-->
<!--</script>-->

<!--<style scoped>-->
<!--.drawer {-->
<!--  height: 100%;-->
<!--  overflow-y: auto;-->
<!--  overscroll-behavior: contain;-->
<!--  -webkit-overflow-scrolling: auto;-->
<!--}-->
<!--.point-info-drawer {-->
<!--  z-index: 2500;-->
<!--}-->
<!--.close-btn-div {-->
<!--  cursor: pointer;-->
<!--}-->
<!--.close-btn-div:hover {-->
<!--  color: red !important;-->
<!--}-->
<!--.comment-form textarea {-->
<!--  width: 100%;-->
<!--  margin-bottom: 10px;-->
<!--}-->
<!--.comment-list {-->
<!--  margin-top: 20px;-->
<!--}-->
<!--.comment {-->
<!--  padding: 10px 0;-->
<!--}-->
<!--.replies {-->
<!--  margin-left: 20px;-->
<!--  margin-top: 10px;-->
<!--}-->
<!--.reply {-->
<!--  padding-left: 10px;-->
<!--  margin-bottom: 10px;-->
<!--}-->
<!--.login-prompt {-->
<!--  text-align: center;-->
<!--  padding: 20px;-->
<!--}-->
<!--.replying-to {-->
<!--  font-size: 14px;-->
<!--  color: #666;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--}-->
<!--.edit-form {-->
<!--  margin-bottom: 10px;-->
<!--}-->
<!--.edit-form textarea {-->
<!--  width: 100%;-->
<!--  margin-bottom: 10px;-->
<!--}-->
<!--/* フェードアニメーション */-->
<!--.fade-enter-active,-->
<!--.fade-leave-active {-->
<!--  transition: opacity 0.3s ease;-->
<!--}-->
<!--.fade-enter-from,-->
<!--.fade-leave-to {-->
<!--  opacity: 0;-->
<!--}-->
<!--</style>-->