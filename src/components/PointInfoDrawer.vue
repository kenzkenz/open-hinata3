<template>
  <v-navigation-drawer
      v-model="visible"
      right
      temporary
      width="400"
      class="point-info-drawer"
  >
    <v-card flat class="bg-white">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color);height: 40px;display: flex;align-items: center ">
        ポイント情報
      </v-card-title>
      <v-card-text style="margin-top: 20px;" class="text-body-1">
        <p class="mt-2 text-caption" style="margin-bottom: 10px;"> グループ: {{ groupName }} / レイヤー: {{ layerName }}</p>
        <v-text-field
            v-model="title"
            label="タイトル"
            auto-grow
        />
        <v-textarea
            v-model="description"
            label="説明（最大500文字）"
            :counter="500"
            auto-grow
            rows="6"
        />
        <v-file-input
            v-model="photo"
            label="写真をアップロード"
            accept="image/*"
            @change="handlePhotoUpload"
        prepend-icon="mdi-camera"
        :loading="isUploading"
        />
        <v-img
            v-if="photoUrl"
            :src="photoUrl"
            max-height="200"
            max-width="100%"
            class="mt-2"
        />
        <div class="street-view" style="margin-top:0px;height: 200px;width: 100%"></div>
        <div class="mt-2 text-caption text-right">
          作成者: {{ creator }}<br />
          日時: {{ timestamp }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>
        <v-spacer />
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="remove">削除</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="save">保存</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="close">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/storage";

export default {
  name: 'PointInfoDrawer',
  data() {
    return {
      title: '',
      description: '',
      photo: null,
      photoUrl: '',
      isUploading: false
    };
  },
  computed: {
    ...mapState([
      'showPointInfoDrawer',
      'selectedPointFeature',
    ]),
    currentGroupId() {
      return this.$store.state.currentGroupId;
    },
    selectedLayerId() {
      return this.$store.state.selectedLayerId;
    },
    groupName() {
      return this.$store.state.currentGroupName || '未選択';
    },
    layerName() {
      const id = this.$store.state.selectedLayerId;
      const layers = this.$store.state.currentGroupLayers;
      const layer = layers.find(l => l.id === id);
      return layer?.name || '未選択';
    },
    visible: {
      get() {
        return this.showPointInfoDrawer;
      },
      set(val) {
        this.setPointInfoDrawer(val);
      }
    },
    creator() {
      return this.selectedPointFeature?.properties?.createdBy || '不明';
    },
    timestamp() {
      return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString();
    }
  },
  watch: {
    selectedPointFeature: {
      immediate: true,
      handler(newVal) {
        console.log('selectedPointFeature 更新:', newVal);
        this.title = newVal?.properties?.title || '';
        this.description = newVal?.properties?.description || '';
        this.photoUrl = newVal?.properties?.photoUrl || '';
        this.photo = null;
        if (!newVal?.properties) {
          console.warn('properties が存在しません:', newVal);
        }
      }
    },
    title(newVal) {
      this.$store.commit('updateSelectedPointTitle', newVal);
    },
    description(newVal) {
      this.$store.commit('updateSelectedPointDescription', newVal);
    }
  },
  methods: {
    ...mapMutations([
      'setPointInfoDrawer',
      'saveSelectedPointFeature',
      'updateSelectedPointPhotoUrl'
    ]),
    async handlePhotoUpload() { // 引数を削除し、this.photo を使用
      console.log('handlePhotoUpload 開始, photo:', this.photo);
      if (!this.photo) {
        console.log('写真が選択されていません');
        this.photoUrl = '';
        this.$store.commit('updateSelectedPointPhotoUrl', '');
        return;
      }

      if (!firebase.storage) {
        console.error('Firebase Storage が初期化されていません');
        this.$store.commit('showSnackbarForGroup', 'Firebase Storage が利用できません');
        return;
      }

      this.isUploading = true;
      try {
        const storageRef = firebase.storage().ref();
        const fileExtension = this.photo.name.split('.').pop();
        const fileName = `${this.selectedPointFeature?.properties?.id || 'new'}_${Date.now()}.${fileExtension}`;
        const photoRef = storageRef.child(`points/${fileName}`);

        console.log('アップロード開始, fileName:', fileName);
        const snapshot = await photoRef.put(this.photo);
        const photoUrl = await snapshot.ref.getDownloadURL();
        console.log('アップロード成功, photoUrl:', photoUrl);

        this.photoUrl = photoUrl;
        this.$store.commit('updateSelectedPointPhotoUrl', photoUrl);
      } catch (error) {
        console.error('写真アップロードエラー:', error);
        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);
      } finally {
        this.isUploading = false;
        console.log('アップロード処理終了');
      }
    },
    save() {
      this.saveSelectedPointFeature();
      console.log('保存前の features:', this.$store.state.groupGeojson.features);
      this.$store.dispatch('saveSelectedPointToFirestore');
      this.close();
    },
    remove() {
      const selectedPointFeature = this.$store.state.selectedPointFeature;
      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {
        console.warn('選択されたポイントがありません');
        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');
        return;
      }
      this.deleteSelectedPoint();
    },
    async deleteSelectedPoint() {
      const db = firebase.firestore();
      const selectedPointFeature = this.$store.state.selectedPointFeature;
      const id = selectedPointFeature?.properties?.id;
      const groupId = this.$store.state.currentGroupId;
      const layerId = this.$store.state.selectedLayerId;

      if (!id) {
        console.warn('削除対象のIDがありません');
        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');
        return;
      }

      try {
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get();
        if (!doc.exists) {
          console.warn('ドキュメントが存在しません');
          return;
        }

        const currentData = doc.data();
        const updatedFeatures = (currentData.features || []).filter(
            (feature) => feature.properties.id !== id
        );

        await docRef.update({
          features: updatedFeatures,
          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました');
        this.$store.commit('setSelectedPointFeature', null);
      } catch (error) {
        console.error("削除エラー:", error);
        this.$store.commit('showSnackbarForGroup', '削除に失敗しました: ' + error.message);
      }
    },
    async removeAllFeatures() {
      const db = firebase.firestore();
      const groupId = this.$store.state.currentGroupId;
      const layerId = this.$store.state.selectedLayerId;

      if (!confirm("全削除しますか？元には戻りません。")) {
        return;
      }

      if (!groupId || !layerId) {
        console.warn('groupIdまたはlayerIdが未設定です');
        this.$store.commit('showSnackbarForGroup', 'グループまたはレイヤーが選択されていません');
        return;
      }

      try {
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get();
        if (!doc.exists) {
          console.warn('ドキュメントが存在しません');
          return;
        }

        await docRef.update({
          features: [],
          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`✅ ${groupId}/${layerId} の全地物を削除しました`);
        this.$store.commit('showSnackbarForGroup', '🗑️ 全地物を削除しました');
        this.$store.commit('setSelectedPointFeature', null);
      } catch (error) {
        console.error("全地物削除エラー:", error);
        this.$store.commit('showSnackbarForGroup', '全地物の削除に失敗しました: ' + error.message);
      }
    },
    close() {
      this.setPointInfoDrawer(false);
    }
  }
}
</script>

<style scoped>
.point-info-drawer {
  z-index: 2500;
}
</style>
<!--<template>-->
<!--  <v-navigation-drawer-->
<!--      v-model="visible"-->
<!--      right-->
<!--      temporary-->
<!--      width="400"-->
<!--      class="point-info-drawer"-->
<!--  >-->
<!--    <v-card flat class="bg-white">-->
<!--      <v-card-title class="text-h6 text-white" style="background-color: var(&#45;&#45;main-color);height: 40px;display: flex;align-items: center ">-->
<!--        ポイント情報-->
<!--      </v-card-title>-->
<!--      <v-card-text style="margin-top: 20px;" class="text-body-1">-->
<!--        <p class="mt-2 text-caption" style="margin-bottom: 10px;"> グループ: {{ groupName }} / レイヤー: {{ layerName }}</p>-->
<!--        <v-text-field-->
<!--            v-model="title"-->
<!--            label="タイトル"-->
<!--            auto-grow-->
<!--        />-->
<!--        <v-textarea-->
<!--            v-model="description"-->
<!--            label="説明（最大500文字）"-->
<!--            :counter="500"-->
<!--            auto-grow-->
<!--            rows="6"-->
<!--        />-->
<!--        &lt;!&ndash; 写真アップロード欄 &ndash;&gt;-->
<!--        <v-file-input-->
<!--            v-model="photo"-->
<!--            label="写真をアップロード"-->
<!--            accept="image/*"-->
<!--            @change="handlePhotoUpload"-->
<!--            prepend-icon="mdi-camera"-->
<!--        />-->
<!--        &lt;!&ndash; アップロード済みの写真を表示（オプション） &ndash;&gt;-->
<!--        <v-img-->
<!--            v-if="photoUrl"-->
<!--            :src="photoUrl"-->
<!--            max-height="200"-->
<!--            max-width="100%"-->
<!--            class="mt-2"-->
<!--        />-->
<!--        <div class="street-view" style="margin-top:0px;height: 200px;width: 100%"></div>-->
<!--        <div class="mt-2 text-caption text-right">-->
<!--          作成者: {{ creator }}<br />-->
<!--          日時: {{ timestamp }}-->
<!--        </div>-->
<!--      </v-card-text>-->
<!--      <v-card-actions>-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>-->
<!--        <v-spacer />-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="remove">削除</v-btn>-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="save">保存</v-btn>-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="close">閉じる</v-btn>-->
<!--      </v-card-actions>-->
<!--    </v-card>-->
<!--  </v-navigation-drawer>-->
<!--</template>-->

<!--<script>-->
<!--import { mapState, mapMutations } from 'vuex';-->
<!--import firebase from "firebase/app";-->
<!--import "firebase/firestore";-->
<!--import "firebase/storage"; // Storage をインポート-->
<!--import { deleteAllPoints } from "@/js/glouplayer";-->

<!--export default {-->
<!--  name: 'PointInfoDrawer',-->
<!--  data() {-->
<!--    return {-->
<!--      title: '',-->
<!--      description: '',-->
<!--      photo: null,      // アップロードする写真ファイル-->
<!--      photoUrl: ''      // 表示用の写真 URL-->
<!--    };-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState([-->
<!--      'showPointInfoDrawer',-->
<!--      'selectedPointFeature',-->
<!--    ]),-->
<!--    currentGroupId() {-->
<!--      return this.$store.state.currentGroupId;-->
<!--    },-->
<!--    selectedLayerId() {-->
<!--      return this.$store.state.selectedLayerId;-->
<!--    },-->
<!--    groupName() {-->
<!--      return this.$store.state.currentGroupName || '未選択';-->
<!--    },-->
<!--    layerName() {-->
<!--      const id = this.$store.state.selectedLayerId;-->
<!--      const layers = this.$store.state.currentGroupLayers;-->
<!--      const layer = layers.find(l => l.id === id);-->
<!--      return layer?.name || '未選択';-->
<!--    },-->
<!--    visible: {-->
<!--      get() {-->
<!--        return this.showPointInfoDrawer;-->
<!--      },-->
<!--      set(val) {-->
<!--        this.setPointInfoDrawer(val);-->
<!--      }-->
<!--    },-->
<!--    creator() {-->
<!--      return this.selectedPointFeature?.properties?.createdBy || '不明';-->
<!--    },-->
<!--    timestamp() {-->
<!--      return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString();-->
<!--    }-->
<!--  },-->
<!--  watch: {-->
<!--    selectedPointFeature: {-->
<!--      immediate: true,-->
<!--      handler(newVal) {-->
<!--        console.log('selectedPointFeature 更新:', newVal);-->
<!--        this.title = newVal?.properties?.title || '';-->
<!--        this.description = newVal?.properties?.description || '';-->
<!--        this.photoUrl = newVal?.properties?.photoUrl || ''; // 既存の写真 URL を反映-->
<!--        this.photo = null; // 新しい写真が選択されていない限りリセット-->
<!--        if (!newVal?.properties) {-->
<!--          console.warn('properties が存在しません:', newVal);-->
<!--        }-->
<!--      }-->
<!--    },-->
<!--    title(newVal) {-->
<!--      this.$store.commit('updateSelectedPointTitle', newVal);-->
<!--    },-->
<!--    description(newVal) {-->
<!--      this.$store.commit('updateSelectedPointDescription', newVal);-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setPointInfoDrawer',-->
<!--      'saveSelectedPointFeature',-->
<!--      'updateSelectedPointPhotoUrl' // 新しいミューテーションを追加-->
<!--    ]),-->
<!--    // 写真アップロード処理-->
<!--    async handlePhotoUpload(file) {-->
<!--      // file が null または undefined の場合、処理をスキップ-->
<!--      if (!file) {-->
<!--        console.log('写真が選択されていません');-->
<!--        this.photoUrl = ''; // 既存の写真URLをクリア（任意）-->
<!--        this.$store.commit('updateSelectedPointPhotoUrl', ''); // ストアもクリア（任意）-->
<!--        return;-->
<!--      }-->

<!--      const storageRef = firebase.storage().ref();-->
<!--      const fileName = `${this.selectedPointFeature?.properties?.id || 'new'}_${Date.now()}.${file.name.split('.').pop()}`;-->
<!--      const photoRef = storageRef.child(`points/${fileName}`);-->

<!--      try {-->
<!--        const snapshot = await photoRef.put(file);-->
<!--        const photoUrl = await snapshot.ref.getDownloadURL();-->
<!--        this.photoUrl = photoUrl;-->
<!--        this.$store.commit('updateSelectedPointPhotoUrl', photoUrl);-->
<!--        console.log('写真アップロード成功:', photoUrl);-->
<!--      } catch (error) {-->
<!--        console.error('写真アップロードエラー:', error);-->
<!--        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);-->
<!--      }-->
<!--    },-->
<!--    // async handlePhotoUpload(file) {-->
<!--    //   if (!file) return;-->
<!--    //   const storageRef = firebase.storage().ref();-->
<!--    //   const fileName = `${this.selectedPointFeature?.properties?.id || 'new'}_${Date.now()}.${file.name.split('.').pop()}`;-->
<!--    //   const photoRef = storageRef.child(`points/${fileName}`);-->
<!--    //-->
<!--    //   try {-->
<!--    //     const snapshot = await photoRef.put(file);-->
<!--    //     const photoUrl = await snapshot.ref.getDownloadURL();-->
<!--    //     this.photoUrl = photoUrl; // 表示用に設定-->
<!--    //     this.$store.commit('updateSelectedPointPhotoUrl', photoUrl); // ストアに保存-->
<!--    //     console.log('写真アップロード成功:', photoUrl);-->
<!--    //   } catch (error) {-->
<!--    //     console.error('写真アップロードエラー:', error);-->
<!--    //     this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);-->
<!--    //   }-->
<!--    // },-->
<!--    save() {-->
<!--      this.saveSelectedPointFeature();-->
<!--      console.log('保存前の features:', this.$store.state.groupGeojson.features);-->
<!--      this.$store.dispatch('saveSelectedPointToFirestore');-->
<!--      this.close();-->
<!--    },-->
<!--    remove() {-->
<!--      const selectedPointFeature = this.$store.state.selectedPointFeature;-->
<!--      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {-->
<!--        console.warn('選択されたポイントがありません');-->
<!--        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');-->
<!--        return;-->
<!--      }-->
<!--      this.deleteSelectedPoint();-->
<!--    },-->
<!--    async deleteSelectedPoint() {-->
<!--      const db = firebase.firestore();-->
<!--      const selectedPointFeature = this.$store.state.selectedPointFeature;-->
<!--      const id = selectedPointFeature?.properties?.id;-->
<!--      const groupId = this.$store.state.currentGroupId;-->
<!--      const layerId = this.$store.state.selectedLayerId;-->

<!--      if (!id) {-->
<!--        console.warn('削除対象のIDがありません');-->
<!--        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');-->
<!--        return;-->
<!--      }-->

<!--      try {-->
<!--        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);-->
<!--        const doc = await docRef.get();-->
<!--        if (!doc.exists) {-->
<!--          console.warn('ドキュメントが存在しません');-->
<!--          return;-->
<!--        }-->

<!--        const currentData = doc.data();-->
<!--        const updatedFeatures = (currentData.features || []).filter(-->
<!--            (feature) => feature.properties.id !== id-->
<!--        );-->

<!--        await docRef.update({-->
<!--          features: updatedFeatures,-->
<!--          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()-->
<!--        });-->

<!--        this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました');-->
<!--        this.$store.commit('setSelectedPointFeature', null);-->
<!--      } catch (error) {-->
<!--        console.error("削除エラー:", error);-->
<!--        this.$store.commit('showSnackbarForGroup', '削除に失敗しました: ' + error.message);-->
<!--      }-->
<!--    },-->
<!--    async removeAllFeatures() {-->
<!--      const db = firebase.firestore();-->
<!--      const groupId = this.$store.state.currentGroupId;-->
<!--      const layerId = this.$store.state.selectedLayerId;-->

<!--      if (!confirm("全削除しますか？元には戻りません。")) {-->
<!--        return;-->
<!--      }-->

<!--      if (!groupId || !layerId) {-->
<!--        console.warn('groupIdまたはlayerIdが未設定です');-->
<!--        this.$store.commit('showSnackbarForGroup', 'グループまたはレイヤーが選択されていません');-->
<!--        return;-->
<!--      }-->

<!--      try {-->
<!--        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);-->
<!--        const doc = await docRef.get();-->
<!--        if (!doc.exists) {-->
<!--          console.warn('ドキュメントが存在しません');-->
<!--          return;-->
<!--        }-->

<!--        await docRef.update({-->
<!--          features: [],-->
<!--          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()-->
<!--        });-->

<!--        alert(`✅ ${groupId}/${layerId} の全地物を削除しました`);-->
<!--        this.$store.commit('showSnackbarForGroup', '🗑️ 全地物を削除しました');-->
<!--        this.$store.commit('setSelectedPointFeature', null);-->
<!--      } catch (error) {-->
<!--        console.error("全地物削除エラー:", error);-->
<!--        this.$store.commit('showSnackbarForGroup', '全地物の削除に失敗しました: ' + error.message);-->
<!--      }-->
<!--    },-->
<!--    close() {-->
<!--      this.setPointInfoDrawer(false);-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.point-info-drawer {-->
<!--  z-index: 2500;-->
<!--}-->
<!--</style>-->





<!--&lt;!&ndash;<template>&ndash;&gt;-->
<!--&lt;!&ndash;  <v-navigation-drawer&ndash;&gt;-->
<!--&lt;!&ndash;      v-model="visible"&ndash;&gt;-->
<!--&lt;!&ndash;      right&ndash;&gt;-->
<!--&lt;!&ndash;      temporary&ndash;&gt;-->
<!--&lt;!&ndash;      width="400"&ndash;&gt;-->
<!--&lt;!&ndash;      class="point-info-drawer"&ndash;&gt;-->
<!--&lt;!&ndash;  >&ndash;&gt;-->
<!--&lt;!&ndash;    <v-card flat class="bg-white">&ndash;&gt;-->
<!--&lt;!&ndash;      <v-card-title class="text-h6 text-white" style="background-color: var(&#45;&#45;main-color);height: 40px;display: flex;align-items: center ">&ndash;&gt;-->
<!--&lt;!&ndash;        ポイント情報&ndash;&gt;-->
<!--&lt;!&ndash;      </v-card-title>&ndash;&gt;-->
<!--&lt;!&ndash;      <v-card-text style="margin-top: 20px;" class="text-body-1">&ndash;&gt;-->
<!--&lt;!&ndash;        &lt;!&ndash; グループとレイヤー名 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;        <p class="mt-2 text-caption" style="margin-bottom: 10px;"> グループ: {{ groupName }} / レイヤー: {{ layerName }}</p>&ndash;&gt;-->
<!--&lt;!&ndash;        &lt;!&ndash; タイトル入力欄 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;        <v-text-field&ndash;&gt;-->
<!--&lt;!&ndash;            v-model="title"&ndash;&gt;-->
<!--&lt;!&ndash;            label="タイトル"&ndash;&gt;-->
<!--&lt;!&ndash;            auto-grow&ndash;&gt;-->
<!--&lt;!&ndash;        />&ndash;&gt;-->
<!--&lt;!&ndash;        &lt;!&ndash; 説明入力欄 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;        <v-textarea&ndash;&gt;-->
<!--&lt;!&ndash;            v-model="description"&ndash;&gt;-->
<!--&lt;!&ndash;            label="説明（最大500文字）"&ndash;&gt;-->
<!--&lt;!&ndash;            :counter="500"&ndash;&gt;-->
<!--&lt;!&ndash;            auto-grow&ndash;&gt;-->
<!--&lt;!&ndash;            rows="6"&ndash;&gt;-->
<!--&lt;!&ndash;        />&ndash;&gt;-->
<!--&lt;!&ndash;        &lt;!&ndash; ストリートビュー表示エリア（未実装） &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;        <div class="street-view" style="margin-top:0px;height: 200px;width: 100%"></div>&ndash;&gt;-->
<!--&lt;!&ndash;        &lt;!&ndash; 作成者と日時 &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;        <div class="mt-2 text-caption text-right">&ndash;&gt;-->
<!--&lt;!&ndash;          作成者: {{ creator }}<br />&ndash;&gt;-->
<!--&lt;!&ndash;          日時: {{ timestamp }}&ndash;&gt;-->
<!--&lt;!&ndash;        </div>&ndash;&gt;-->
<!--&lt;!&ndash;      </v-card-text>&ndash;&gt;-->
<!--&lt;!&ndash;      <v-card-actions>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-spacer />&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="remove">削除</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="save">保存</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="close">閉じる</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;      </v-card-actions>&ndash;&gt;-->
<!--&lt;!&ndash;    </v-card>&ndash;&gt;-->
<!--&lt;!&ndash;  </v-navigation-drawer>&ndash;&gt;-->
<!--&lt;!&ndash;</template>&ndash;&gt;-->

<!--&lt;!&ndash;<script>&ndash;&gt;-->
<!--&lt;!&ndash;import { mapState, mapMutations } from 'vuex';&ndash;&gt;-->
<!--&lt;!&ndash;import firebase from "firebase/app";&ndash;&gt;-->
<!--&lt;!&ndash;import "firebase/firestore";&ndash;&gt;-->
<!--&lt;!&ndash;import { deleteAllPoints } from "@/js/glouplayer";&ndash;&gt;-->

<!--&lt;!&ndash;export default {&ndash;&gt;-->
<!--&lt;!&ndash;  name: 'PointInfoDrawer',&ndash;&gt;-->
<!--&lt;!&ndash;  data() {&ndash;&gt;-->
<!--&lt;!&ndash;    return {&ndash;&gt;-->
<!--&lt;!&ndash;      title: '',        // ローカルでタイトルを管理&ndash;&gt;-->
<!--&lt;!&ndash;      description: ''   // ローカルで説明を管理&ndash;&gt;-->
<!--&lt;!&ndash;    };&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  computed: {&ndash;&gt;-->
<!--&lt;!&ndash;    ...mapState([&ndash;&gt;-->
<!--&lt;!&ndash;      'showPointInfoDrawer',   // ドロワーの表示状態&ndash;&gt;-->
<!--&lt;!&ndash;      'selectedPointFeature',  // 選択された地物&ndash;&gt;-->
<!--&lt;!&ndash;    ]),&ndash;&gt;-->
<!--&lt;!&ndash;    currentGroupId() {&ndash;&gt;-->
<!--&lt;!&ndash;      return this.$store.state.currentGroupId; // 現在のグループID&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    selectedLayerId() {&ndash;&gt;-->
<!--&lt;!&ndash;      return this.$store.state.selectedLayerId; // 現在のレイヤーID&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    groupName() {&ndash;&gt;-->
<!--&lt;!&ndash;      return this.$store.state.currentGroupName || '未選択'; // グループ名&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    layerName() {&ndash;&gt;-->
<!--&lt;!&ndash;      const id = this.$store.state.selectedLayerId;&ndash;&gt;-->
<!--&lt;!&ndash;      const layers = this.$store.state.currentGroupLayers;&ndash;&gt;-->
<!--&lt;!&ndash;      const layer = layers.find(l => l.id === id);&ndash;&gt;-->
<!--&lt;!&ndash;      return layer?.name || '未選択'; // レイヤー名&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    visible: {&ndash;&gt;-->
<!--&lt;!&ndash;      get() {&ndash;&gt;-->
<!--&lt;!&ndash;        return this.showPointInfoDrawer; // ドロワーの表示状態を取得&ndash;&gt;-->
<!--&lt;!&ndash;      },&ndash;&gt;-->
<!--&lt;!&ndash;      set(val) {&ndash;&gt;-->
<!--&lt;!&ndash;        this.setPointInfoDrawer(val); // ドロワーの表示状態を更新&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    creator() {&ndash;&gt;-->
<!--&lt;!&ndash;      return this.selectedPointFeature?.properties?.createdBy || '不明'; // 作成者&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    timestamp() {&ndash;&gt;-->
<!--&lt;!&ndash;      return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString(); // 作成日時&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  watch: {&ndash;&gt;-->
<!--&lt;!&ndash;    // 選択された地物が変更されたらローカル値を更新&ndash;&gt;-->
<!--&lt;!&ndash;    selectedPointFeature: {&ndash;&gt;-->
<!--&lt;!&ndash;      immediate: true, // 初回表示時も動作&ndash;&gt;-->
<!--&lt;!&ndash;      handler(newVal) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.log('selectedPointFeature 更新:', newVal); // デバッグ用&ndash;&gt;-->
<!--&lt;!&ndash;        this.title = newVal?.properties?.title || '';&ndash;&gt;-->
<!--&lt;!&ndash;        this.description = newVal?.properties?.description || '';&ndash;&gt;-->
<!--&lt;!&ndash;        if (!newVal?.properties) {&ndash;&gt;-->
<!--&lt;!&ndash;          console.warn('properties が存在しません:', newVal); // データ構造エラー検知&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    // ローカルの title が変更されたらストアに反映&ndash;&gt;-->
<!--&lt;!&ndash;    title(newVal) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.$store.commit('updateSelectedPointTitle', newVal);&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    // ローカルの description が変更されたらストアに反映&ndash;&gt;-->
<!--&lt;!&ndash;    description(newVal) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.$store.commit('updateSelectedPointDescription', newVal);&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  methods: {&ndash;&gt;-->
<!--&lt;!&ndash;    ...mapMutations([&ndash;&gt;-->
<!--&lt;!&ndash;      'setPointInfoDrawer',      // ドロワーの表示状態を変更&ndash;&gt;-->
<!--&lt;!&ndash;      'saveSelectedPointFeature', // 選択地物をストアに保存&ndash;&gt;-->
<!--&lt;!&ndash;      'removePointFeature',      // 地物を削除（未使用）&ndash;&gt;-->
<!--&lt;!&ndash;    ]),&ndash;&gt;-->
<!--&lt;!&ndash;    save() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.saveSelectedPointFeature(); // ローカルデータをストアに保存&ndash;&gt;-->
<!--&lt;!&ndash;      console.log('保存前の features:', this.$store.state.groupGeojson.features); // デバッグ用&ndash;&gt;-->
<!--&lt;!&ndash;      this.$store.dispatch('saveSelectedPointToFirestore'); // Firestore に保存&ndash;&gt;-->
<!--&lt;!&ndash;      this.close(); // ドロワーを閉じる&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    removeAll() {&ndash;&gt;-->
<!--&lt;!&ndash;      if (!this.$store.state.groupId) {&ndash;&gt;-->
<!--&lt;!&ndash;        alert('グループに参加していないと削除できません');&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;      if (!confirm("全削除しますか？")) {&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;      deleteAllPoints(this.$store.state.groupId); // グループ内の全ポイントを削除&ndash;&gt;-->
<!--&lt;!&ndash;      this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました');&ndash;&gt;-->
<!--&lt;!&ndash;      this.close();&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    async deleteSelectedPoint() {&ndash;&gt;-->
<!--&lt;!&ndash;      const db = firebase.firestore();&ndash;&gt;-->
<!--&lt;!&ndash;      const selectedPointFeature = this.$store.state.selectedPointFeature;&ndash;&gt;-->
<!--&lt;!&ndash;      const id = selectedPointFeature?.properties?.id;&ndash;&gt;-->
<!--&lt;!&ndash;      const groupId = this.$store.state.currentGroupId;&ndash;&gt;-->
<!--&lt;!&ndash;      const layerId = this.$store.state.selectedLayerId;&ndash;&gt;-->

<!--&lt;!&ndash;      if (!id) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.warn('削除対象のIDがありません');&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);&ndash;&gt;-->
<!--&lt;!&ndash;        const doc = await docRef.get();&ndash;&gt;-->
<!--&lt;!&ndash;        if (!doc.exists) {&ndash;&gt;-->
<!--&lt;!&ndash;          console.warn('ドキュメントが存在しません');&ndash;&gt;-->
<!--&lt;!&ndash;          return;&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        const currentData = doc.data();&ndash;&gt;-->
<!--&lt;!&ndash;        const updatedFeatures = (currentData.features || []).filter(&ndash;&gt;-->
<!--&lt;!&ndash;            (feature) => feature.properties.id !== id&ndash;&gt;-->
<!--&lt;!&ndash;        );&ndash;&gt;-->

<!--&lt;!&ndash;        await docRef.update({&ndash;&gt;-->
<!--&lt;!&ndash;          features: updatedFeatures,&ndash;&gt;-->
<!--&lt;!&ndash;          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()&ndash;&gt;-->
<!--&lt;!&ndash;        });&ndash;&gt;-->

<!--&lt;!&ndash;        this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました');&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('setSelectedPointFeature', null); // 選択をリセット&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error("削除エラー:", error);&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('showSnackbarForGroup', '削除に失敗しました: ' + error.message);&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    remove() {&ndash;&gt;-->
<!--&lt;!&ndash;      const selectedPointFeature = this.$store.state.selectedPointFeature;&ndash;&gt;-->
<!--&lt;!&ndash;      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.warn('選択されたポイントがありません');&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;      this.deleteSelectedPoint(); // 選択されたポイントを削除&ndash;&gt;-->
<!--&lt;!&ndash;      this.close()&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    async removeAllFeatures() {&ndash;&gt;-->
<!--&lt;!&ndash;      const db = firebase.firestore();&ndash;&gt;-->
<!--&lt;!&ndash;      const groupId = this.$store.state.currentGroupId;&ndash;&gt;-->
<!--&lt;!&ndash;      const layerId = this.$store.state.selectedLayerId;&ndash;&gt;-->

<!--&lt;!&ndash;      if (!confirm("全削除しますか？元には戻りません。")) {&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      if (!groupId || !layerId) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.warn('groupIdまたはlayerIdが未設定です');&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('showSnackbarForGroup', 'グループまたはレイヤーが選択されていません');&ndash;&gt;-->
<!--&lt;!&ndash;        return;&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->

<!--&lt;!&ndash;      try {&ndash;&gt;-->
<!--&lt;!&ndash;        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);&ndash;&gt;-->
<!--&lt;!&ndash;        const doc = await docRef.get();&ndash;&gt;-->
<!--&lt;!&ndash;        if (!doc.exists) {&ndash;&gt;-->
<!--&lt;!&ndash;          console.warn('ドキュメントが存在しません');&ndash;&gt;-->
<!--&lt;!&ndash;          return;&ndash;&gt;-->
<!--&lt;!&ndash;        }&ndash;&gt;-->

<!--&lt;!&ndash;        await docRef.update({&ndash;&gt;-->
<!--&lt;!&ndash;          features: [], // 全地物を削除&ndash;&gt;-->
<!--&lt;!&ndash;          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()&ndash;&gt;-->
<!--&lt;!&ndash;        });&ndash;&gt;-->

<!--&lt;!&ndash;        alert(`✅ ${groupId}/${layerId} の全地物を削除しました`);&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('showSnackbarForGroup', '🗑️ 全地物を削除しました');&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('setSelectedPointFeature', null); // 選択をリセット&ndash;&gt;-->
<!--&lt;!&ndash;      } catch (error) {&ndash;&gt;-->
<!--&lt;!&ndash;        console.error("全地物削除エラー:", error);&ndash;&gt;-->
<!--&lt;!&ndash;        this.$store.commit('showSnackbarForGroup', '全地物の削除に失敗しました: ' + error.message);&ndash;&gt;-->
<!--&lt;!&ndash;      }&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    close() {&ndash;&gt;-->
<!--&lt;!&ndash;      this.setPointInfoDrawer(false); // ドロワーを閉じる&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  }&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</script>&ndash;&gt;-->

<!--&lt;!&ndash;<style scoped>&ndash;&gt;-->
<!--&lt;!&ndash;.point-info-drawer {&ndash;&gt;-->
<!--&lt;!&ndash;  z-index: 2500;&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</style>&ndash;&gt;-->