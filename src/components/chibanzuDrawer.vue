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
          {{ (cityName || '') + (cityCode || '') }}
        </h2>
        <p v-else>自治体を選択してください</p>

        <!-- コメント投稿フォーム -->
        <div v-if="user" class="comment-form mt-4">
          <v-textarea
              v-model="newComment"
              placeholder="コメントを入力"
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
        </div>
        <div v-else class="login-prompt mt-4">
          <p>コメントするにはログインしてください</p>
          <v-btn color="primary" @click="login">ログイン</v-btn>
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
              <p>{{ comment.text }}</p>
              <v-row align="center">
                <v-col>
                  <small>{{ comment.user }} - {{ formatDate(comment.date) }}</small>
                </v-col>
                <v-col cols="auto">
                  <v-btn
                      v-if="!comment.parentId"
                      color="primary"
                      small
                      @click="replyToComment(comment.id)"
                  >
                    返信
                  </v-btn>
                  <v-btn
                      v-if="user && comment.user === user.nickname"
                      color="error"
                      small
                      @click="deleteComment(comment.id, comment.replies)"
                      class="ml-2"
                  >
                    削除
                  </v-btn>
                </v-col>
              </v-row>
              <div v-if="comment.replies" class="replies mt-2">
                <v-card
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    class="reply mb-1"
                    outlined
                >
                  <v-card-text>
                    <p>{{ reply.text }}</p>
                    <v-row align="center">
                      <v-col>
                        <small>{{ reply.user }} - {{ formatDate(reply.date) }}</small>
                      </v-col>
                      <v-col cols="auto">
                        <v-btn
                            v-if="user && reply.user === user.nickname"
                            color="error"
                            small
                            @click="deleteComment(reply.id)"
                        >
                          削除
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import { db, auth } from '../firebase';
import firebase from 'firebase/app';

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
      unsubscribe: null,
    };
  },
  computed: {
    ...mapState([
      'showChibanzuDrawer',
      'popupFeatureProperties',
      'popupFeatureCoordinates'
    ]),
    cityCode() {
      return this.popupFeatureProperties?.N03_007?.padStart(5, '0') || '';
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
    close() {
      this.setChibanzuDrawer(false);
    },
    login() {
      this.$emit('login');
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
      } catch (error) {
        console.error('コメント投稿エラー:', error);
      }
    },
    async deleteComment(commentId, replies = []) {
      if (!confirm('このコメントを削除しますか？')) return;

      try {
        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');
        const batch = db.batch();

        // 対象コメントを削除
        batch.delete(commentsRef.doc(commentId));

        // 関連する返信を削除
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
    replyToComment(commentId) {
      this.replyingTo = commentId;
    },
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('ja-JP');
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
<!--          {{ (cityName || '') + (cityCode || '') }}-->
<!--        </h2>-->
<!--        <p v-else>自治体を選択してください</p>-->

<!--        &lt;!&ndash; コメント投稿フォーム &ndash;&gt;-->
<!--        <div v-if="user" class="comment-form mt-4">-->
<!--          <v-textarea-->
<!--              v-model="newComment"-->
<!--              placeholder="コメントを入力"-->
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
<!--        </div>-->
<!--        <div v-else class="login-prompt mt-4">-->
<!--          <p>コメントするにはログインしてください</p>-->
<!--          <v-btn color="primary" @click="login">ログイン</v-btn>-->
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
<!--              <p>{{ comment.text }}</p>-->
<!--              <v-row align="center">-->
<!--                <v-col>-->
<!--                  <small>{{ comment.user }} - {{ formatDate(comment.date) }}</small>-->
<!--                </v-col>-->
<!--                <v-col cols="auto">-->
<!--                  <v-btn-->
<!--                      v-if="!comment.parentId"-->
<!--                      color="primary"-->
<!--                      small-->
<!--                      @click="replyToComment(comment.id)"-->
<!--                  >-->
<!--                    返信-->
<!--                  </v-btn>-->
<!--                </v-col>-->
<!--              </v-row>-->
<!--              <div v-if="comment.replies" class="replies mt-2">-->
<!--                <v-card-->
<!--                    v-for="reply in comment.replies"-->
<!--                    :key="reply.id"-->
<!--                    class="reply mb-1"-->
<!--                    outlined-->
<!--                >-->
<!--                  <v-card-text>-->
<!--                    <p>{{ reply.text }}</p>-->
<!--                    <small>{{ reply.user }} - {{ formatDate(reply.date) }}</small>-->
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
<!--      unsubscribe: null,-->
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
<!--    // ユーザーのログイン状態を監視-->
<!--    auth.onAuthStateChanged((user) => {-->
<!--      if (user) {-->
<!--        const nickname = user.displayName || user.email; // displayNameがなければemailをフォールバック-->
<!--        this.user = { ...user, nickname };-->
<!--      } else {-->
<!--        this.user = null;-->
<!--      }-->
<!--    });-->

<!--    // 初期ロード時にcityCodeが有効ならコメントを取得-->
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

<!--        // メールアドレスからdisplayNameを取得-->
<!--        for (const comment of allComments) {-->
<!--          if (!emailToNicknameMap.has(comment.user)) {-->
<!--            try {-->
<!--              const userSnapshot = await db.collection('users')-->
<!--                  .where('email', '==', comment.user)-->
<!--                  .limit(1)-->
<!--                  .get();-->
<!--              if (!userSnapshot.empty) {-->
<!--                const userDoc = userSnapshot.docs[0];-->
<!--                const user = await firebase.auth().getUser(userDoc.id);-->
<!--                emailToNicknameMap.set(comment.user, user.displayName || comment.user);-->
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
<!--        user: this.user.nickname, // ニックネーム（displayName）を使用-->
<!--        date: new Date().toISOString(),-->
<!--        parentId: this.replyingTo || null,-->
<!--      };-->

<!--      try {-->
<!--        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');-->
<!--        await commentsRef.add(commentData);-->
<!--        this.newComment = '';-->
<!--        this.replyingTo = null;-->
<!--      } catch (error) {-->
<!--        console.error('コメント投稿エラー:', error);-->
<!--      }-->
<!--    },-->
<!--    replyToComment(commentId) {-->
<!--      this.replyingTo = commentId;-->
<!--    },-->
<!--    formatDate(timestamp) {-->
<!--      if (!timestamp) return '';-->
<!--      const date = new Date(timestamp);-->
<!--      return date.toLocaleString('ja-JP');-->
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
<!--          {{ (cityName || '') + (cityCode || '') }}-->
<!--        </h2>-->
<!--        <p v-else>自治体を選択してください</p>-->

<!--        &lt;!&ndash; コメント投稿フォーム &ndash;&gt;-->
<!--        <div v-if="user" class="comment-form mt-4">-->
<!--          <v-textarea-->
<!--              v-model="newComment"-->
<!--              placeholder="コメントを入力"-->
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
<!--        </div>-->
<!--        <div v-else class="login-prompt mt-4">-->
<!--          <p>コメントするにはログインしてください</p>-->
<!--          <v-btn color="primary" @click="login">ログイン</v-btn>-->
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
<!--              <p>{{ comment.text }}</p>-->
<!--              <v-row align="center">-->
<!--                <v-col>-->
<!--                  <small>{{ comment.user }} - {{ formatDate(comment.date) }}</small>-->
<!--                </v-col>-->
<!--                <v-col cols="auto">-->
<!--                  <v-btn-->
<!--                      v-if="!comment.parentId"-->
<!--                      color="primary"-->
<!--                      small-->
<!--                      @click="replyToComment(comment.id)"-->
<!--                  >-->
<!--                    返信-->
<!--                  </v-btn>-->
<!--                </v-col>-->
<!--              </v-row>-->
<!--              <div v-if="comment.replies" class="replies mt-2">-->
<!--                <v-card-->
<!--                    v-for="reply in comment.replies"-->
<!--                    :key="reply.id"-->
<!--                    class="reply mb-1"-->
<!--                    outlined-->
<!--                >-->
<!--                  <v-card-text>-->
<!--                    <p>{{ reply.text }}</p>-->
<!--                    <small>{{ reply.user }} - {{ formatDate(reply.date) }}</small>-->
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
<!--      unsubscribe: null, // Firestoreのリスナーを管理-->
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
<!--    // ユーザーのログイン状態を監視-->
<!--    auth.onAuthStateChanged((user) => {-->
<!--      this.user = user;-->
<!--    });-->

<!--    // 初期ロード時にcityCodeが有効ならコメントを取得-->
<!--    if (this.cityCode) {-->
<!--      this.loadComments();-->
<!--    }-->
<!--  },-->
<!--  beforeUnmount() {-->
<!--    // コンポーネント破棄時にリスナーを解除-->
<!--    if (this.unsubscribe) {-->
<!--      this.unsubscribe();-->
<!--    }-->
<!--  },-->
<!--  watch: {-->
<!--    cityCode(newVal) {-->
<!--      // cityCodeが変更されたらコメントを再取得（有効な値の場合のみ）-->
<!--      if (newVal) {-->
<!--        this.loadComments();-->
<!--      }-->
<!--    },-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setChibanzuDrawer',-->
<!--    ]),-->
<!--    close() {-->
<!--      this.setChibanzuDrawer(false);-->
<!--    },-->
<!--    login() {-->
<!--      this.$emit('login');-->
<!--    },-->
<!--    loadComments() {-->
<!--      // 既存のリスナーを解除-->
<!--      if (this.unsubscribe) {-->
<!--        this.unsubscribe();-->
<!--      }-->

<!--      // Firestoreでコメントをリアルタイムで取得-->
<!--      const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');-->
<!--      this.unsubscribe = commentsRef.orderBy('date', 'desc').onSnapshot((snapshot) => {-->
<!--        const commentList = [];-->
<!--        const allComments = [];-->
<!--        snapshot.forEach((doc) => {-->
<!--          const comment = doc.data();-->
<!--          comment.id = doc.id;-->
<!--          allComments.push(comment);-->
<!--        });-->

<!--        // 親コメントと返信を整理-->
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
<!--        user: this.user.email,-->
<!--        date: new Date().toISOString(), // FirestoreではserverTimestampを使用可能-->
<!--        parentId: this.replyingTo || null,-->
<!--      };-->

<!--      try {-->
<!--        const commentsRef = db.collection('threads').doc(this.cityCode).collection('comments');-->
<!--        await commentsRef.add(commentData);-->
<!--        this.newComment = '';-->
<!--        this.replyingTo = null;-->
<!--      } catch (error) {-->
<!--        console.error('コメント投稿エラー:', error);-->
<!--      }-->
<!--    },-->
<!--    replyToComment(commentId) {-->
<!--      this.replyingTo = commentId;-->
<!--    },-->
<!--    formatDate(timestamp) {-->
<!--      if (!timestamp) return '';-->
<!--      const date = new Date(timestamp);-->
<!--      return date.toLocaleString('ja-JP');-->
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









<!--<template>-->
<!--  <v-navigation-drawer-->
<!--      width=400-->
<!--      temporary-->
<!--      :scrim="false"-->
<!--      v-model="visible"-->
<!--      location="right"-->
<!--      class="point-info-drawer"-->
<!--  >-->
<!--    <v-card flat class="bg-white drawer" style="border-radius: 0;">-->
<!--      <v-card-title class="text-h6 text-white" style="background-color: var(&#45;&#45;main-color); height: 40px; display: flex; align-items: center;">-->
<!--        全国地番図公開マップ-->
<!--        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>-->
<!--      </v-card-title>-->

<!--      <v-card-text style="margin-top: 20px;">-->
<!--        <h2>-->
<!--          {{ cityName + cityCode }}-->
<!--        </h2>-->

<!--        ここにスレッドを設置-->

<!--      </v-card-text>-->

<!--&lt;!&ndash;      <v-card-actions style="margin-top: 0px">&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn disabled=true style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-spacer />&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="remove">削除</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="save">保存</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="close">閉じる</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;      </v-card-actions>&ndash;&gt;-->

<!--    </v-card>-->
<!--  </v-navigation-drawer>-->
<!--</template>-->

<!--<script>-->
<!--import { mapState, mapMutations } from 'vuex';-->

<!--export default {-->
<!--  name: 'chibanzuDrawer',-->
<!--  components: {},-->
<!--  data() {-->
<!--    return {-->
<!--      tab: '0',-->
<!--    };-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState([-->
<!--      'showChibanzuDrawer',-->
<!--      'popupFeatureProperties',-->
<!--      'popupFeatureCoordinates'-->
<!--    ]),-->
<!--    cityCode () {-->
<!--      return this.popupFeatureProperties.N03_007.padStart(5, '0')-->
<!--    },-->
<!--    cityName () {-->
<!--      if (this.popupFeatureProperties.N03_004 === '札幌市') {-->
<!--        return this.popupFeatureProperties.N03_001 + this.popupFeatureProperties.N03_004 + this.popupFeatureProperties.N03_005-->
<!--      } else {-->
<!--        return this.popupFeatureProperties.N03_001 + this.popupFeatureProperties.N03_004-->
<!--      }-->
<!--    },-->
<!--    s_isAndroid () {-->
<!--      return this.$store.state.isAndroid-->
<!--    },-->
<!--    drawerWidth () {-->
<!--      return window.innerWidth-->
<!--    },-->
<!--    visible: {-->
<!--      get() { return this.showChibanzuDrawer; },-->
<!--      set(val) {-->
<!--        this.setChibanzuDrawer(val);-->
<!--        if (!val) {-->
<!--          this.title = '';-->
<!--        }-->
<!--      }-->
<!--    },-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setChibanzuDrawer',-->
<!--    ]),-->
<!--    close() {-->
<!--      this.setChibanzuDrawer(false);-->
<!--    },-->
<!--  },-->
<!--  mounted() {-->
<!--  },-->
<!--  watch: {-->
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
<!--.close-btn {-->
<!--  position: absolute;-->
<!--  top: -10px;-->
<!--  right: 10px;-->
<!--  color: black;-->
<!--  border: none;-->
<!--  cursor: pointer;-->
<!--  padding: 5px;-->
<!--  font-size: 30px;-->
<!--}-->
<!--.close-btn:hover {-->
<!--  color: red;-->
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
