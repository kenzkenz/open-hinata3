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
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color);height: 40px;display: flex;align-items: center ">
        ポイント情報
        <div class="close-btn-div" style="margin-top: -3px;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover close-btn"></i></div>
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
            <!-- ローディング（中央） -->
            <v-progress-circular
                v-if="!isImageLoaded"
                indeterminate
                color="primary"
                size="40"
                class="image-loader"
            />
            <!-- 画像（フェードイン） -->
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
<!--        <p class="mt-2 text-caption" style="margin-bottom: 10px;"> グループ: {{ groupName }} / レイヤー: {{ layerName }}</p>-->
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
  components: {
  },
  data() {
    return {
      isImageLoaded: false,
      title: '',
      description: '',
      photo: null,
      photoUrl: '',
      isUploading: false,
      color: '#000000',  // 初期色（黒）
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
        this.title = newVal?.properties?.title || '';
        this.description = newVal?.properties?.description || '';
        this.photo = null;
        this.color = newVal?.properties?.color || '#000000';

        const id = newVal?.properties?.id;
        const photoUrlFromProp = newVal?.properties?.photoUrl;

        if (photoUrlFromProp) {
          if (this.photoUrl !== photoUrlFromProp) {
            this.isImageLoaded = false;
            this.photoUrl = '';
            setTimeout(() => {
              this.photoUrl = photoUrlFromProp;
            }, 10);
          }
        } else if (id) {
          try {
            const storage = firebase.storage();
            const [file] = await storage.ref('points').listAll().then(res =>
                res.items.filter(item => item.name.startsWith(id + '_'))
            );
            if (file) {
              const url = await file.getDownloadURL();
              if (this.photoUrl !== url) {
                this.isImageLoaded = false;
                this.photoUrl = '';
                setTimeout(() => {
                  this.photoUrl = url;
                }, 10);
              }
            } else {
              this.photoUrl = '';
            }
          } catch (e) {
            this.photoUrl = '';
          }
        } else {
          this.photoUrl = '';
        }
      }
    },
    // selectedPointFeature: {
    //   immediate: true,
    //   deep: true,
    //   async handler(newVal) {
    //     console.log('selectedPointFeature 更新:', JSON.stringify(newVal));
    //
    //     this.isImageLoaded = false;
    //     this.photoUrl = ''; // ← 一旦空にすることで強制的に画像をリセット
    //
    //     this.title = newVal?.properties?.title || '';
    //     this.description = newVal?.properties?.description || '';
    //     this.photo = null
    //
    //     // this.color = newVal?.properties?.color || this.presetColors[0]; // ←★ここ！
    //     this.color = newVal?.properties?.color || '#000000';
    //
    //     const id = newVal?.properties?.id;
    //     const photoUrlFromProp = newVal?.properties?.photoUrl;
    //
    //     if (photoUrlFromProp) {
    //       // 💡 少し遅らせて再セットする（再描画させるため）
    //       setTimeout(() => {
    //         this.photoUrl = photoUrlFromProp;
    //       }, 10);
    //     } else if (id) {
    //       try {
    //         const storage = firebase.storage();
    //         const [file] = await storage.ref('points').listAll().then(res =>
    //             res.items.filter(item => item.name.startsWith(id + '_'))
    //         );
    //         if (file) {
    //           const url = await file.getDownloadURL();
    //           setTimeout(() => {
    //             this.photoUrl = url;
    //           }, 10);
    //         } else {
    //           this.photoUrl = '';
    //         }
    //       } catch (e) {
    //         console.warn('Storage からの画像取得に失敗:', e);
    //         this.photoUrl = '';
    //       }
    //     } else {
    //       this.photoUrl = '';
    //     }
    //   }
    // },
  },
  methods: {
    ...mapMutations([
      'setPointInfoDrawer',
      'saveSelectedPointFeature',
      'updateSelectedPointPhotoUrl'
    ]),
    // 画像アップロード専用にする（保存は save() 側で一括）
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
      } catch (error) {
        console.error('写真アップロードエラー:', error);
        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);
      } finally {
        this.isUploading = false;
      }
    },
    async save() {
      console.log('保存開始');

      // 新しい画像が選択されているならアップロードしてから保存
      if (this.photo) {
        await this.handlePhotoUpload();
      }

      if (this.selectedPointFeature?.properties) {
        this.selectedPointFeature.properties.title = this.title;
        this.selectedPointFeature.properties.description = this.description;
        this.selectedPointFeature.properties.color = this.color; // ← ★ここを追加

        if (this.photoUrl) {
          this.selectedPointFeature.properties.photoUrl = this.photoUrl;
        }
      }

      this.saveSelectedPointFeature();
      this.$store.dispatch('saveSelectedPointToFirestore');
      console.log('保存後のselectedPointFeature:', JSON.stringify(this.selectedPointFeature));
      this.close();
    },
    // async save() {
    //   console.log('保存開始');
    //
    //   // 新しい画像が選択されているならアップロードしてから保存
    //   if (this.photo) {
    //     await this.handlePhotoUpload(); // ← ここで画像アップしてから return で終わらず続ける
    //   }
    //
    //   if (this.selectedPointFeature?.properties) {
    //     this.selectedPointFeature.properties.title = this.title;
    //     this.selectedPointFeature.properties.description = this.description;
    //
    //     if (this.photoUrl) {
    //       this.selectedPointFeature.properties.photoUrl = this.photoUrl;
    //     }
    //   }
    //
    //   this.saveSelectedPointFeature();
    //   this.$store.dispatch('saveSelectedPointToFirestore');
    //   console.log('保存後のselectedPointFeature:', JSON.stringify(this.selectedPointFeature));
    //   this.close();
    // },
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
    async handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        this.forceResync();
      }
    },
    async forceResync() {
      try {
        const db = firebase.firestore();
        const docRef = db.collection('groups')
            .doc(this.currentGroupId)
            .collection('layers')
            .doc(this.selectedLayerId);
        const doc = await docRef.get();
        if (doc.exists) {
          const data = doc.data();
          if (data?.features) {
            const matched = data.features.find(f =>
                f.properties?.id === this.selectedPointFeature?.properties?.id
            );
            if (matched) {
              this.$store.commit('setSelectedPointFeature', JSON.parse(JSON.stringify(matched)));
              console.log('📶 ポーリング同期: データ更新');
            }
          }
        }
      } catch (e) {
        console.warn('同期失敗:', e);
      }
    }
  },
  mounted() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.forceResync);
    window.addEventListener('online', this.forceResync);
    this.pollingInterval = setInterval(this.forceResync, 30000);
    this.fastInterval = setInterval(this.forceResync, 7000);
    this.superInterval = setInterval(this.forceResync, 5000);
  },
  beforeUnmount() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    clearInterval(this.pollingInterval);
    clearInterval(this.fastInterval);
    clearInterval(this.superInterval);
    window.removeEventListener('focus', this.forceResync);
    window.removeEventListener('online', this.forceResync);
  },
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
  border-radius: 50%;
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
