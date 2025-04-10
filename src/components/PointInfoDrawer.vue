<template>
  <v-navigation-drawer
      style="border-radius: 0;"
      v-model="visible"
      right
      temporary
      width="400"
      class="point-info-drawer"
  >
    <v-card flat class="bg-white" style="border-radius: 0;">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        ポイント情報
        <div class="close-btn-div" style="margin-top: -3px; font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover close-btn"></i></div>
      </v-card-title>
      <v-card-text style="margin-top: 20px;" class="text-body-1">
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
        <a v-if="photoUrl" :href="photoUrl" target="_blank" rel="noopener noreferrer">
          <div style="position: relative; width: 100%; margin-bottom: 20px;">
            <v-progress-circular
                v-if="!isImageLoaded"
                indeterminate
                color="primary"
                size="40"
                class="image-loader"
            />
            <div :class="{'fade-in': isImageLoaded, 'hidden': !isImageLoaded}">
              <v-img
                  :src="photoUrl"
                  style="width: 100%;"
                  class="mt-2"
                  @load="isImageLoaded = true"
                  @error="onImageError"
              />
            </div>
          </div>
        </a>
        <v-file-input
            v-model="photo"
            label="写真をアップロード"
            accept="image/*"
            @change="handlePhotoUpload"
            prepend-icon="mdi-camera"
            :loading="isUploading"
        />
      </v-card-text>

      <v-card-text style="margin-top: -35px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <div
              v-for="c in presetColors"
              :class="['color-circle', { selected: color === c }]"
              :key="c"
              :style="{
                backgroundColor: c,
                width: '100%',
                maxWidth: '36px',
                height: '36px',
                borderRadius: '50%',
                border: color === c ? '2px solid black' : '1px solid #ccc',
                cursor: 'pointer',
                flex: '1',
                margin: '0 4px',
              }"
              @click="color = c"
          />
        </div>
      </v-card-text>

      <v-card-actions style="margin-top: 0px">
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>
        <v-spacer />
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="remove">削除</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="save">保存</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="close">閉じる</v-btn>
      </v-card-actions>
      <v-card-text style="margin-top: -20px">
        <div class="mt-2 text-caption text-right">
          作成者: {{ creator }}<br>
          日時: {{ timestamp }}<br>
          グループ: {{ groupName }}<br>
          レイヤー: {{ layerName }}
        </div>
      </v-card-text>
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
  components: {},
  data() {
    return {
      isImageLoaded: false,
      title: '',
      description: '',
      photo: null,
      photoUrl: '',
      isUploading: false,
      color: '#000000',
      presetColors: ['#ff0000', '#00aaff', '#00cc66', '#ffcc00', '#ff66cc', '#9966ff', '#aaaaaa', '#000000'],
    };
  },
  computed: {
    ...mapState([
      'showPointInfoDrawer',
      'selectedPointFeature',
      'currentGroupId',
      'selectedLayerId',
      'currentGroupName',
      'currentGroupLayers',
      'groupFeatures'
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
      set(val) {
        this.setPointInfoDrawer(val);
        if (!val) {
          // ドロワー閉じるときにフィールドをクリア
          this.title = '';
          this.description = '';
          this.photo = null;
          this.photoUrl = '';
          this.color = '#000000';
        }
      }
    },
    creator() { return this.selectedPointFeature?.properties?.createdBy || '不明'; },
    timestamp() { return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString(); }
  },
  watch: {
    selectedPointFeature(newVal) {
      // 地物がクリックされたときにフィールドを更新
      if (newVal && this.visible) {
        this.title = newVal.properties.title || '';
        this.description = newVal.properties.description || '';
        this.color = newVal.properties.color || '#000000';
        this.photoUrl = newVal.properties.photoUrl || '';
        this.photo = null;
      }
    }
  },
  methods: {
    ...mapMutations([
      'setPointInfoDrawer',
      'saveSelectedPointFeature',
      'updateSelectedPointPhotoUrl',
      'setSelectedPointFeature',
      'setGroupFeatures'
    ]),
    async handlePhotoUpload() {
      if (!this.photo) return;

      this.isUploading = true;
      try {
        const storageRef = firebase.storage().ref();
        const fileExtension = this.photo.name.split('.').pop();
        const fileName = `${this.selectedPointFeature?.properties?.id || 'new'}_${Date.now()}.${fileExtension}`;
        const photoRef = storageRef.child(`points/${fileName}`);

        const snapshot = await photoRef.put(this.photo);
        const photoUrl = await snapshot.ref.getDownloadURL();

        this.photoUrl = photoUrl;
        this.$store.commit('updateSelectedPointPhotoUrl', photoUrl);
        this.photo = null; // アップロード成功後に photo をリセット
      } catch (error) {
        console.error('写真アップロードエラー:', error);
        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);
      } finally {
        this.isUploading = false;
      }
    },
    async save() {
      console.log('保存開始');

      const feature = this.selectedPointFeature;
      const layerId = this.selectedLayerId;
      const groupId = this.currentGroupId;

      console.log('現在の layerId:', layerId);
      console.log('feature が属しているレイヤー:', feature?.properties?.layerId);

      if (!feature || !feature.properties) {
        this.$store.commit('showSnackbarForGroup', '保存対象のポイントがありません');
        return;
      }

      // ★ 必要なら layerId をここで feature にも保存
      feature.properties.title = this.title;
      feature.properties.description = this.description;
      feature.properties.color = this.color;
      feature.properties.layerId = layerId;

      if (this.photoUrl) {
        feature.properties.photoUrl = this.photoUrl;
      }

      this.saveSelectedPointFeature();
      await this.$store.dispatch('saveSelectedPointToFirestore');
      console.log('保存完了');

      await this.syncPointData();
      this.close();

      const map = this.$store.state.map01;
      const updatedFeatures = this.$store.state.groupFeatures; // ← syncPointData で更新されたやつ

      if (map && map.getSource('oh-point-source')) {
        map.getSource('oh-point-source').setData({
          type: 'FeatureCollection',
          features: updatedFeatures
        });
        map.triggerRepaint();
        console.log('🗺️ マップ上のポイントを更新しました');
      }


    },
    // async save() {
    //   console.log('保存開始');
    //
    //   // 既に photoUrl があればアップロード済みとみなし、再アップロードしない
    //   if (this.selectedPointFeature?.properties) {
    //     this.selectedPointFeature.properties.title = this.title;
    //     this.selectedPointFeature.properties.description = this.description;
    //     this.selectedPointFeature.properties.color = this.color;
    //     if (this.photoUrl) {
    //       this.selectedPointFeature.properties.photoUrl = this.photoUrl;
    //     }
    //   }
    //
    //   this.saveSelectedPointFeature();
    //   await this.$store.dispatch('saveSelectedPointToFirestore');
    //   console.log('保存後のselectedPointFeature:', JSON.stringify(this.selectedPointFeature));
    //
    //   // 保存後に最新データを再取得
    //   await this.syncPointData();
    //   this.close();
    // },
    // onImageError() {
    //   console.error('画像の読み込みに失敗しました:', this.photoUrl);
    //   this.photoUrl = '';
    // },
    remove() {
      const selectedPointFeature = this.selectedPointFeature;
      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {
        console.warn('選択されたポイントがありません');
        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');
        return;
      }
      this.deleteSelectedPoint();
      this.close();
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
    },
    async syncPointData() {
      const groupId = this.currentGroupId;
      const layerId = this.selectedLayerId;
      const selectedId = this.selectedPointFeature?.properties?.id;

      if (!groupId || !layerId || !selectedId) return;

      try {
        const db = firebase.firestore();
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get();
        if (doc.exists) {
          const features = doc.data().features || [];
          const matched = features.find(f => f.properties.id === selectedId);
          if (matched) {
            this.$store.commit('setSelectedPointFeature', JSON.parse(JSON.stringify(matched)));
            this.$store.commit('setGroupFeatures', features);
            this.title = matched.properties.title || '';
            this.description = matched.properties.description || '';
            this.color = matched.properties.color || '#000000';
            this.photoUrl = matched.properties.photoUrl || '';
            this.photo = null;
            console.log('📶 保存後同期: データ更新', matched);
          } else {
            console.warn('選択されたポイントが見つかりません');
            this.$store.commit('setSelectedPointFeature', null);
            this.title = '';
            this.description = '';
            this.photoUrl = '';
            this.color = '#000000';
          }
        }
      } catch (error) {
        console.error('同期エラー:', error);
      }
    }
  },
  mounted() {
    // 初期化は watch に依存
  },
  beforeUnmount() {
    // 特にクリーンアップ不要
  }
};
</script>

<style scoped>
.point-info-drawer {
  z-index: 2500;
}
.fade-in {
  opacity: 1;
  transition: opacity 0.5s ease-in;
}
.hidden {
  opacity: 0;
}
.image-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}
.color-picker-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}
.color-circle {
  width: 36px;
  height: 36px;
  borderRadius: 50%;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.color-circle:hover {
  transform: scale(1.15);
  opacity: 0.8;
}
.color-circle.selected {
  border: 3px solid black;
}
.selected-color {
  border: 2px solid black;
}
</style>
