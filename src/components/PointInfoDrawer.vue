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
<!--        <v-img-->
<!--            :src="'https://firebasestorage.googleapis.com/v0/b/open-hinata3.firebasestorage.app/o/points%2F26eb966e-af30-4ceb-9e01-7b4ead31b2ab_1744191841794.jpeg?alt=media&token=a4f78f7c-8cec-44b7-810e-3e2603a84719'"-->
<!--            max-height="200"-->
<!--            max-width="100%"-->
<!--            class="mt-2"-->
<!--        />-->
        <v-img
            v-if="photoUrl"
            :src="photoUrl"
            max-height="200"
            max-width="100%"
            class="mt-2"
            @error="onImageError"
        />
<!--        <div class="street-view" style="margin-top:0px;height: 200px;width: 100%"></div>-->
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
      'currentGroupId',
      'selectedLayerId',
      'currentGroupName',
      'currentGroupLayers'
    ]),
    groupName() { return this.currentGroupName || '未選択'; },
    layerName() {
      const id = this.selectedLayerId;
      const layers = this.currentGroupLayers;
      const layer = layers.find(l => l.id === id);
      return layer?.name || '未選択';
    },
    visible: {
      get() { return this.showPointInfoDrawer; },
      set(val) { this.setPointInfoDrawer(val); }
    },
    creator() { return this.selectedPointFeature?.properties?.createdBy || '不明'; },
    timestamp() { return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString(); }
  },
  watch: {
    selectedPointFeature: {
      immediate: true,
      deep: true,
      async handler(newVal) {
        console.log('selectedPointFeature 更新:', JSON.stringify(newVal));
        this.title = newVal?.properties?.title || '';
        this.description = newVal?.properties?.description || '';
        this.photo = null;

        const id = newVal?.properties?.id;
        const photoUrlFromProp = newVal?.properties?.photoUrl;

        if (photoUrlFromProp) {
          this.photoUrl = photoUrlFromProp;
        } else if (id) {
          // Firestore に photoUrl がない場合は、Storage から取得してみる
          try {
            const storage = firebase.storage();
            const [file] = await storage.ref('points').listAll().then(res =>
                res.items.filter(item => item.name.startsWith(id + '_'))
            );
            if (file) {
              this.photoUrl = await file.getDownloadURL();
            } else {
              this.photoUrl = '';
            }
          } catch (e) {
            console.warn('Storage からの画像取得に失敗:', e);
            this.photoUrl = '';
          }
        } else {
          this.photoUrl = '';
        }

        this.$nextTick(() => {
          console.log('次tickでのphotoUrl:', this.photoUrl);
        });
      }
    },
    // selectedPointFeature: {
    //   immediate: true,
    //   deep: true, // 深い変更を監視
    //   handler(newVal) {
    //     console.log('selectedPointFeature 更新:', JSON.stringify(newVal));
    //     this.title = newVal?.properties?.title || '';
    //     this.description = newVal?.properties?.description || '';
    //     this.photoUrl = newVal?.properties?.photoUrl || '';
    //     this.photo = null;
    //     console.log('photoUrl 初期化:', this.photoUrl);
    //     this.$nextTick(() => {
    //       console.log('次tickでのphotoUrl:', this.photoUrl);
    //     });
    //   }
    // },
    // title(newVal) { this.$store.commit('updateSelectedPointTitle', newVal); },
    // description(newVal) { this.$store.commit('updateSelectedPointDescription', newVal); },
    // photoUrl(newVal) {
    //   console.log('photoUrl 更新:', newVal);
    // }
  },
  methods: {
    ...mapMutations([
      'setPointInfoDrawer',
      'saveSelectedPointFeature',
      'updateSelectedPointPhotoUrl'
    ]),
    async handlePhotoUpload() {
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
        console.log('ストアのphotoUrl:', this.selectedPointFeature?.properties?.photoUrl);
        this.$forceUpdate(); // 必要に応じて強制再レンダリング
      } catch (error) {
        console.error('写真アップロードエラー:', error);
        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);
      } finally {
        this.isUploading = false;
        console.log('アップロード処理終了');
      }
    },
    save() {
      console.log('保存開始');
      this.saveSelectedPointFeature();
      this.$store.dispatch('saveSelectedPointToFirestore');
      console.log('保存後のselectedPointFeature:', JSON.stringify(this.selectedPointFeature));
      this.close();
    },
    onImageError() {
      console.error('画像の読み込みに失敗しました:', this.photoUrl);
      this.photoUrl = '';
    },
    remove() {
      const selectedPointFeature = this.selectedPointFeature;
      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {
        console.warn('選択されたポイントがありません');
        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');
        return;
      }
      this.deleteSelectedPoint();
    },
    async deleteSelectedPoint() {
      const db = firebase.firestore();
      const selectedPointFeature = this.selectedPointFeature;
      const id = selectedPointFeature?.properties?.id;
      const groupId = this.currentGroupId;
      const layerId = this.selectedLayerId;

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
      const groupId = this.currentGroupId;
      const layerId = this.selectedLayerId;

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
};
</script>

<style scoped>
.point-info-drawer {
  z-index: 2500;
}
</style>
