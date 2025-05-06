<!--<template>-->
<!--  <v-navigation-drawer-->
<!--      width="400"-->
<!--      temporary-->
<!--      :scrim="false"-->
<!--      v-model="visible"-->
<!--      location="right"-->
<!--      class="point-info-drawer"-->
<!--  >-->
<!--    <v-card flat class="drawer" style="border-radius: 0;">-->
<!--      <v-card-title class="header">-->
<!--        <v-icon left color="white">mdi-map</v-icon>-->
<!--        全国地番図公開マップ-->
<!--        <v-spacer />-->
<!--        <v-btn icon @click="close" class="close-btn">-->
<!--          <v-icon color="white">mdi-close</v-icon>-->
<!--        </v-btn>-->
<!--      </v-card-title>-->

<!--      <v-card-text class="pa-4">-->
<!--        <h2 v-if="cityName || cityCode" class="text-h5 mb-4">-->
<!--          {{ cityName || '' }}-->
<!--        </h2>-->
<!--        <p v-else class="text-body-1 grey&#45;&#45;text">自治体を選択してください</p>-->

<!--        <v-btn-->
<!--            v-if="user"-->
<!--            color="error"-->
<!--            class="mb-4"-->
<!--            outlined-->
<!--            @click="red"-->
<!--        >-->
<!--          <v-icon left>mdi-circle</v-icon>-->
<!--          赤色on/off-->
<!--        </v-btn>-->
<!--        <span v-if="user" class="ml-2 text-caption grey&#45;&#45;text">既に色がついている場合は無効</span>-->

<!--        &lt;!&ndash; コメント投稿フォーム &ndash;&gt;-->
<!--        <div v-if="user" class="comment-form mt-4">-->
<!--          <div v-if="replyingTo" class="replying-to mb-2">-->
<!--            <v-chip small color="primary" outlined>-->
<!--              <v-icon left small>mdi-reply</v-icon>-->
<!--              {{ replyingToUser }} への返信-->
<!--            </v-chip>-->
<!--          </div>-->
<!--          <v-textarea-->
<!--              v-model="newComment"-->
<!--              :placeholder="replyingTo ? '返信を入力' : 'コメントを入力'"-->
<!--              rows="3"-->
<!--              outlined-->
<!--              dense-->
<!--              class="comment-textarea"-->
<!--          ></v-textarea>-->
<!--          <v-btn-->
<!--              color="primary"-->
<!--              class="submit-btn"-->
<!--              @click="submitComment"-->
<!--              :disabled="!newComment.trim()"-->
<!--          >-->
<!--            <v-icon left>mdi-send</v-icon>-->
<!--            投稿-->
<!--          </v-btn>-->
<!--          <v-btn-->
<!--              v-if="replyingTo"-->
<!--              color="primary"-->
<!--              text-->
<!--              class="ml-2"-->
<!--              @click="cancelReply"-->
<!--          >-->
<!--            キャンセル-->
<!--          </v-btn>-->
<!--        </div>-->
<!--        <div v-else class="login-prompt mt-4 text-center">-->
<!--          <p class="text-body-2 grey&#45;&#45;text">コメントするにはログインしてください</p>-->
<!--          <v-btn color="primary" outlined @click="login">ログイン</v-btn>-->
<!--        </div>-->

<!--        &lt;!&ndash; コメントリスト &ndash;&gt;-->
<!--        <div class="comment-list mt-6">-->
<!--          <v-card-->
<!--              v-for="comment in comments"-->
<!--              :key="comment.id"-->
<!--              class="comment mb-3"-->
<!--              elevation="1"-->
<!--              @mouseover="hoverComment = comment.id"-->
<!--              @mouseleave="hoverComment = null"-->
<!--          >-->
<!--            <v-card-text>-->
<!--              &lt;!&ndash; 編集モード &ndash;&gt;-->
<!--              <div v-if="editingCommentId === comment.id && user && comment.user === user.nickname" class="edit-form">-->
<!--                <v-textarea-->
<!--                    v-model="editedCommentText"-->
<!--                    placeholder="コメントを編集"-->
<!--                    rows="3"-->
<!--                    outlined-->
<!--                    dense-->
<!--                    class="comment-textarea"-->
<!--                ></v-textarea>-->
<!--                <v-btn-->
<!--                    color="success"-->
<!--                    class="submit-btn"-->
<!--                    @click="saveEditedComment(comment.id)"-->
<!--                    :disabled="!editedCommentText.trim()"-->
<!--                >-->
<!--                  <v-icon left>mdi-content-save</v-icon>-->
<!--                  保存-->
<!--                </v-btn>-->
<!--                <v-btn-->
<!--                    color="primary"-->
<!--                    text-->
<!--                    class="ml-2"-->
<!--                    @click="cancelEdit"-->
<!--                >-->
<!--                  キャンセル-->
<!--                </v-btn>-->
<!--              </div>-->
<!--              &lt;!&ndash; 通常表示 &ndash;&gt;-->
<!--              <div v-else>-->
<!--                <div class="d-flex align-center mb-2">-->
<!--                  <v-avatar size="32" color="primary" class="mr-2">-->
<!--                    <span class="white&#45;&#45;text text-caption">{{ comment.user[0] }}</span>-->
<!--                  </v-avatar>-->
<!--                  <div>-->
<!--                    <span class="text-subtitle-2">{{ comment.user }}</span>-->
<!--                    <small class="grey&#45;&#45;text ml-2">{{ formatDate(comment.date) }}</small>-->
<!--                  </div>-->
<!--                </div>-->
<!--                <p class="text-body-1">{{ comment.text }}</p>-->
<!--                <v-row align="center" class="mt-2">-->
<!--                  <v-col cols="auto">-->
<!--                    <v-tooltip top>-->
<!--                      <template v-slot:activator="{ on, attrs }">-->
<!--                        <v-btn-->
<!--                            v-if="!comment.parentId"-->
<!--                            color="primary"-->
<!--                            icon-->
<!--                            small-->
<!--                            @click="replyToComment(comment.id, comment.user)"-->
<!--                            v-bind="attrs"-->
<!--                            v-on="on"-->
<!--                        >-->
<!--                          <v-icon>mdi-reply</v-icon>-->
<!--                        </v-btn>-->
<!--                      </template>-->
<!--                      <span>返信</span>-->
<!--                    </v-tooltip>-->
<!--                    <v-tooltip top>-->
<!--                      <template v-slot:activator="{ on, attrs }">-->
<!--                        <v-btn-->
<!--                            v-if="user && comment.user === user.nickname"-->
<!--                            color="primary"-->
<!--                            icon-->
<!--                            small-->
<!--                            @click="startEdit(comment.id, comment.text)"-->
<!--                            v-bind="attrs"-->
<!--                            v-on="on"-->
<!--                        >-->
<!--                          <v-icon>mdi-pencil</v-icon>-->
<!--                        </v-btn>-->
<!--                      </template>-->
<!--                      <span>編集</span>-->
<!--                    </v-tooltip>-->
<!--                    <v-tooltip top>-->
<!--                      <template v-slot:activator="{ on, attrs }">-->
<!--                        <v-btn-->
<!--                            v-if="user && comment.user === user.nickname && (!comment.replies || comment.replies.length === 0)"-->
<!--                            color="error"-->
<!--                            icon-->
<!--                            small-->
<!--                            @click="deleteComment(comment.id, comment.replies)"-->
<!--                            v-bind="attrs"-->
<!--                            v-on="on"-->
<!--                        >-->
<!--                          <v-icon>mdi-delete</v-icon>-->
<!--                        </v-btn>-->
<!--                      </template>-->
<!--                      <span>削除</span>-->
<!--                    </v-tooltip>-->
<!--                  </v-col>-->
<!--                </v-row>-->
<!--              </div>-->
<!--              &lt;!&ndash; リプライ &ndash;&gt;-->
<!--              <div v-if="comment.replies" class="replies mt-4">-->
<!--                <v-card-->
<!--                    v-for="reply in comment.replies"-->
<!--                    :key="reply.id"-->
<!--                    class="reply mb-2"-->
<!--                    elevation="0"-->
<!--                    outlined-->
<!--                >-->
<!--                  <v-card-text>-->
<!--                    &lt;!&ndash; リプライの編集モード &ndash;&gt;-->
<!--                    <div v-if="editingCommentId === reply.id && user && reply.user === user.nickname" class="edit-form">-->
<!--                      <v-textarea-->
<!--                          v-model="editedCommentText"-->
<!--                          placeholder="リプライを編集"-->
<!--                          rows="3"-->
<!--                          outlined-->
<!--                          dense-->
<!--                          class="comment-textarea"-->
<!--                      ></v-textarea>-->
<!--                      <v-btn-->
<!--                          color="success"-->
<!--                          class="submit-btn"-->
<!--                          @click="saveEditedComment(reply.id)"-->
<!--                          :disabled="!editedCommentText.trim()"-->
<!--                      >-->
<!--                        <v-icon left>mdi-content-save</v-icon>-->
<!--                        保存-->
<!--                      </v-btn>-->
<!--                      <v-btn-->
<!--                          color="primary"-->
<!--                          text-->
<!--                          class="ml-2"-->
<!--                          @click="cancelEdit"-->
<!--                      >-->
<!--                        キャンセル-->
<!--                      </v-btn>-->
<!--                    </div>-->
<!--                    &lt;!&ndash; リプライの通常表示 &ndash;&gt;-->
<!--                    <div v-else>-->
<!--                      <div class="d-flex align-center mb-2">-->
<!--                        <v-avatar size="28" color="primary" class="mr-2">-->
<!--                          <span class="white&#45;&#45;text text-caption">{{ reply.user[0] }}</span>-->
<!--                        </v-avatar>-->
<!--                        <div>-->
<!--                          <span class="text-subtitle-2">{{ reply.user }}</span>-->
<!--                          <small class="grey&#45;&#45;text ml-2">{{ formatDate(reply.date) }}</small>-->
<!--                        </div>-->
<!--                      </div>-->
<!--                      <p class="text-body-1">{{ reply.text }}</p>-->
<!--                      <v-row align="center" class="mt-2">-->
<!--                        <v-col cols="auto">-->
<!--                          <v-tooltip top>-->
<!--                            <template v-slot:activator="{ on, attrs }">-->
<!--                              <v-btn-->
<!--                                  v-if="user && reply.user === user.nickname"-->
<!--                                  color="primary"-->
<!--                                  icon-->
<!--                                  small-->
<!--                                  @click="startEdit(reply.id, reply.text)"-->
<!--                                  v-bind="attrs"-->
<!--                                  v-on="on"-->
<!--                              >-->
<!--                                <v-icon>mdi-pencil</v-icon>-->
<!--                              </v-btn>-->
<!--                            </template>-->
<!--                            <span>編集</span>-->
<!--                          </v-tooltip>-->
<!--                          <v-tooltip top>-->
<!--                            <template v-slot:activator="{ on, attrs }">-->
<!--                              <v-btn-->
<!--                                  v-if="user && reply.user === user.nickname"-->
<!--                                  color="error"-->
<!--                                  icon-->
<!--                                  small-->
<!--                                  @click="deleteComment(reply.id)"-->
<!--                                  v-bind="attrs"-->
<!--                                  v-on="on"-->
<!--                              >-->
<!--                                <v-icon>mdi-delete</v-icon>-->
<!--                              </v-btn>-->
<!--                            </template>-->
<!--                            <span>削除</span>-->
<!--                          </v-tooltip>-->
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
<!--      editingCommentId: null,-->
<!--      editedCommentText: '',-->
<!--      hoverComment: null,-->
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
<!--          date: new Date().toISOString(),-->
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
<!--  background-color: #f5f5f5;-->
<!--}-->

<!--.point-info-drawer {-->
<!--  z-index: 2500;-->
<!--}-->

<!--.header {-->
<!--  background: linear-gradient(90deg, #1976d2, #42a5f5);-->
<!--  color: white;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  padding: 12px 16px;-->
<!--}-->

<!--.close-btn {-->
<!--  transition: transform 0.2s;-->
<!--}-->

<!--.close-btn:hover {-->
<!--  transform: scale(1.2);-->
<!--}-->

<!--.comment-form {-->
<!--  background: white;-->
<!--  padding: 16px;-->
<!--  border-radius: 8px;-->
<!--  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);-->
<!--}-->

<!--.comment-textarea {-->
<!--  border-radius: 8px;-->
<!--  transition: box-shadow 0.2s;-->
<!--}-->

<!--.comment-textarea:focus-within {-->
<!--  box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);-->
<!--}-->

<!--.submit-btn {-->
<!--  transition: transform 0.2s;-->
<!--}-->

<!--.submit-btn:hover {-->
<!--  transform: translateY(-2px);-->
<!--}-->

<!--.comment-list {-->
<!--  margin-top: 24px;-->
<!--}-->

<!--.comment {-->
<!--  transition: all 0.2s;-->
<!--  border-radius: 8px;-->
<!--}-->

<!--.comment:hover {-->
<!--  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);-->
<!--  transform: scale(1.01);-->
<!--}-->

<!--.replies {-->
<!--  margin-left: 24px;-->
<!--  margin-top: 16px;-->
<!--  border-left: 2px solid #e0e0e0;-->
<!--  padding-left: 16px;-->
<!--}-->

<!--.reply {-->
<!--  border-radius: 8px;-->
<!--  background: #fafafa;-->
<!--}-->

<!--.login-prompt {-->
<!--  background: white;-->
<!--  padding: 24px;-->
<!--  border-radius: 8px;-->
<!--  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);-->
<!--}-->

<!--.replying-to {-->
<!--  font-size: 14px;-->
<!--  color: #666;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  margin-bottom: 12px;-->
<!--}-->

<!--.edit-form {-->
<!--  background: #e8f0fe;-->
<!--  padding: 16px;-->
<!--  border-radius: 8px;-->
<!--  margin-bottom: 12px;-->
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

<!--/* レスポンシブデザイン */-->
<!--@media (max-width: 600px) {-->
<!--  .point-info-drawer {-->
<!--    width: 100% !important;-->
<!--  }-->

<!--  .submit-btn {-->
<!--    width: 100%;-->
<!--    margin-bottom: 8px;-->
<!--  }-->

<!--  .comment-form {-->
<!--    padding: 12px;-->
<!--  }-->

<!--  .comment {-->
<!--    padding: 12px;-->
<!--  }-->
<!--}-->
<!--</style>-->

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
               @click="red"
        >
          赤色onoff
        </v-btn>

        <span v-if="user" style="margin-left: 20px;">既に色がついている場合は無効</span>
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
                      <p>{{ reply.text }}</p>
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
      editingCommentId: null, // 編集中のコメントID
      editedCommentText: '',  // 編集中のコメントテキスト
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
          date: new Date().toISOString(), // 編集時刻を更新
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