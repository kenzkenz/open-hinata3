<template>
  <v-navigation-drawer
      :style="drawerStyle"
      :width="drawerWidth"
      v-model="visible"
      right
      temporary
      class="point-info-drawer"
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0;">
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

        <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs" style="margin-top: -18px;">
          <v-tab value="0">uploaded</v-tab>
          <v-tab value="1">streetview</v-tab>
          <v-tab value="2">mapillary</v-tab>
        </v-tabs>
        <v-window v-model="tab" style="margin-bottom: 20px;">
          <v-window-item value="0">
            <a v-if="photoUrl" :href="photoUrl" target="_blank" rel="noopener noreferrer">
              <div style="position: relative; width: 100%; margin-bottom: 0px;">
                <v-progress-circular
                    v-if="!isImageLoaded"
                    indeterminate
                    color="primary"
                    size="40"
                    class="image-loader"
                />
                <div :class="{'fade-in': isImageLoaded, 'hidden': !isImageLoaded}">
                  <v-img
                      max-height="250px"
                      :src="photoUrl"
                      style="width: 100%;"
                      class="mt-2"
                      @load="isImageLoaded = true"
                      @error="onImageError"
                  />
                </div>
              </div>
            </a>
          </v-window-item>
          <v-window-item value="1">
            <div class="street-view" style="margin-top:10px;height: 200px;width: 380px"></div>
          </v-window-item>
          <v-window-item value="2">
            <div class="mapillary" style="margin-top:10px;height: 200px;width: 380px"></div>
          </v-window-item>
        </v-window>

        <div style="display: flex; gap: 8px; margin-bottom: 16px; align-items: center;">
          <div style="display: flex; align-items: center; height: 56px; padding-top: 4px;">
            <v-btn
                color="primary"
                icon
                @click="$refs.cameraInput.click()"
                title="カメラで撮影"
                style="margin-top: -24px;"
            >
              <v-icon>mdi-camera</v-icon>
            </v-btn>
            <input
                type="file"
                ref="cameraInput"
                accept="image/*"
                capture="environment"
                style="display: none"
                @change="handlePhotoFromCamera"
            />
          </div>
          <v-file-input
              v-model="photo"
              label="写真をアップロード"
              accept="image/*"
              @change="handlePhotoUpload"
              :loading="isUploading"
              style="flex: 1"
              prepend-icon=""
          />
        </div>

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
import {enableMotionPermission} from "@/js/popup";
import ExifReader from 'exifreader';

export default {
  name: 'PointInfoDrawer',
  components: {},
  data() {
    return {
      previewUrl: null,
      tab: '0',
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
    drawerWidth () {
      return window.innerWidth
    },
    drawerStyle() {
      const width = window.innerWidth + 'px'
      return window.innerWidth <= 500
          ? { height: '100vh', width: width, overflowY: 'auto', borderRadius: 0 }
          : { Height: '100vh', width: '400px', overflowY: 'auto', borderRadius: 0 };
    },
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
    tab (newVal) {
      if (newVal === '1') {
        const coordinates = this.$store.state.clickedCoordinates;
        async function setupStreetViewWithMotion() {
          await enableMotionPermission(); // ← 先に許可をもらう
          setTimeout(() => {
            const container = document.querySelector('.street-view')
            new window.google.maps.StreetViewPanorama(container, {
              position: {lat: coordinates[1], lng: coordinates[0]},
              pov: {heading: 34, pitch: 10},
              zoom: 1,
              disableDefaultUI: true,
            });
          }, 100)
        }
        setupStreetViewWithMotion()
      } else if (newVal === '2') {
        const coordinates = this.$store.state.clickedCoordinates;
        const MAPILLARY_CLIENT_ID = 'MLY|9491817110902654|13f790a1e9fc37ee2d4e65193833812c';
        async function aaa () {
          async function mapillary() {
            const deltaLat = 0.00009; // 約10m
            const deltaLng = 0.00011; // 東京近辺での約10m
            const response = await fetch(`https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_ID}&fields=id,thumb_1024_url&bbox=${coordinates[0] - deltaLng},${coordinates[1] - deltaLat},${coordinates[0] + deltaLng},${coordinates[1] + deltaLat}&limit=1`);
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const imageUrl = data.data[0].thumb_1024_url;
              const img = `<br><a href="${imageUrl}" target="_blank"><img width="380px" src="${imageUrl}" alt="Mapillary Image"></a>`;
              return img;
            } else {
              return '<div style="text-align: center;"><span style="font-size: small">10m圏内にMapillary画像が見つかりませんでした。</span></div>';
            }
          }
          const img = await mapillary()
          const container = document.querySelector('.mapillary')
          container.innerHTML = img
        }
        aaa()
      }
    },

    selectedPointFeature(newVal) {
      this.tab = '0'
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
    async handlePhotoFromCamera(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.previewUrl = URL.createObjectURL(file);
      this.isUploading = true;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const tags = ExifReader.load(arrayBuffer);
        const lat = tags.GPSLatitude?.value;
        const lon = tags.GPSLongitude?.value;

        if (lat && lon) {
          const feature = this.selectedPointFeature;
          if (feature?.geometry?.type === 'Point') {
            feature.geometry.coordinates = [lon, lat];
            this.setSelectedPointFeature(feature);
            this.$store.commit('showSnackbarForGroup', `📍 写真の位置情報から座標を設定しました`);

            const map = this.$store.state.map01;
            if (map) {
              const currentZoom = map.getZoom();
              map.flyTo({ center: [lon, lat], zoom: currentZoom });
            }
          }
        } else {
          // this.$store.commit('showSnackbarForGroup', 'EXIF に位置情報がありません。位置は変更しません。');
          console.log('EXIF に位置情報がありません。位置は変更しません。');
        }

        const storageRef = firebase.storage().ref();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${this.selectedPointFeature?.properties?.id || 'new'}_${Date.now()}.${fileExtension}`;
        const photoRef = storageRef.child(`points/${fileName}`);

        const snapshot = await photoRef.put(file);
        const photoUrl = await snapshot.ref.getDownloadURL();

        this.photoUrl = photoUrl;
        this.previewUrl = null;
        this.$store.commit('updateSelectedPointPhotoUrl', photoUrl);
        this.$store.commit('showSnackbarForGroup', 'アップロード成功。保存ボタンを押してください。');
      } catch (error) {
        console.error('写真アップロードエラー:', error);
        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);
      } finally {
        this.isUploading = false;
      }
    },
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
        this.$store.commit('showSnackbarForGroup', 'アップロード成功。保存ボタンを押してください。');

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
    if (this.$store.state.isAndroid){
      let startY;
      let isTouching = false;
      let currentTarget = null;
      let initialScrollTop = 0;
      document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.drawer');
        if (target) {
          startY = e.touches[0].clientY; // タッチ開始位置を記録
          initialScrollTop = target.scrollTop; // 初期スクロール位置を記録
          isTouching = true;
          currentTarget = target;
          target.style.overflowY = 'auto'; // スクロールを強制的に有効化
          target.style.touchAction = 'manipulation';
          // **イベント伝播を防ぐ**
          e.stopPropagation();
        }
      }, { passive: true, capture: true });

      // タッチ移動時の処理
      document.addEventListener('touchmove', (e) => {
        if (!isTouching || !currentTarget) return; // タッチが開始されていなければ処理しない
        const moveY = e.touches[0].clientY;
        const deltaY = startY - moveY; // 移動量を計算
        // スクロール位置を更新
        currentTarget.scrollTop += deltaY;
        startY = moveY; // 開始位置を現在の位置に更新
        // **Android でスクロールが無視されないようにする**
        e.preventDefault();
        e.stopPropagation();

      }, { passive: true, capture: true });

      // タッチ終了時の処理
      document.addEventListener('touchend', () => {
        if (currentTarget) {
          currentTarget.style.overflowY = ''; // スクロール設定をリセット
        }
        currentTarget = null; // 現在のターゲットをリセット
        isTouching = false; // タッチ中フラグをOFF
        initialScrollTop = 0; // 初期スクロール位置をリセット
      });
    }
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
.custom-tabs .v-btn {
  padding: 10px!important;
}
</style>




<!--<template>-->
<!--  <v-navigation-drawer-->
<!--      style="border-radius: 0;"-->
<!--      v-model="visible"-->
<!--      right-->
<!--      temporary-->
<!--      width="400"-->
<!--      class="point-info-drawer"-->
<!--  >-->
<!--    <v-card flat class="bg-white" style="border-radius: 0;">-->
<!--      <v-card-title class="text-h6 text-white" style="background-color: var(&#45;&#45;main-color); height: 40px; display: flex; align-items: center;">-->
<!--        ポイント情報-->
<!--        <div class="close-btn-div" style="margin-top: -3px; font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover close-btn"></i></div>-->
<!--      </v-card-title>-->
<!--      <v-card-text style="margin-top: 20px;" class="text-body-1">-->
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
<!--        <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs" style="margin-top: -18px;">-->
<!--          <v-tab value="0">uploaded</v-tab>-->
<!--          <v-tab value="1">streetview</v-tab>-->
<!--          <v-tab value="2">mapillary</v-tab>-->
<!--        </v-tabs>-->
<!--        <v-window v-model="tab" style="margin-bottom: 20px;">-->
<!--          <v-window-item value="0">-->
<!--            <a v-if="photoUrl" :href="photoUrl" target="_blank" rel="noopener noreferrer">-->
<!--              <div style="position: relative; width: 100%; margin-bottom: 0px;">-->
<!--                <v-progress-circular-->
<!--                    v-if="!isImageLoaded"-->
<!--                    indeterminate-->
<!--                    color="primary"-->
<!--                    size="40"-->
<!--                    class="image-loader"-->
<!--                />-->
<!--                <div :class="{'fade-in': isImageLoaded, 'hidden': !isImageLoaded}">-->
<!--                  <v-img-->
<!--                      :src="photoUrl"-->
<!--                      style="width: 100%;"-->
<!--                      class="mt-2"-->
<!--                      @load="isImageLoaded = true"-->
<!--                      @error="onImageError"-->
<!--                  />-->
<!--                </div>-->
<!--              </div>-->
<!--            </a>-->
<!--          </v-window-item>-->
<!--          <v-window-item value="1">-->
<!--            <div class="street-view" style="margin-top:10px;height: 200px;width: 380px"></div>-->
<!--          </v-window-item>-->
<!--          <v-window-item value="2">-->
<!--            <div class="mapillary" style="margin-top:10px;height: 200px;width: 380px"></div>-->
<!--          </v-window-item>-->
<!--        </v-window>-->

<!--&lt;!&ndash;        <a v-if="photoUrl" :href="photoUrl" target="_blank" rel="noopener noreferrer">&ndash;&gt;-->
<!--&lt;!&ndash;          <div style="position: relative; width: 100%; margin-bottom: 20px;">&ndash;&gt;-->
<!--&lt;!&ndash;            <v-progress-circular&ndash;&gt;-->
<!--&lt;!&ndash;                v-if="!isImageLoaded"&ndash;&gt;-->
<!--&lt;!&ndash;                indeterminate&ndash;&gt;-->
<!--&lt;!&ndash;                color="primary"&ndash;&gt;-->
<!--&lt;!&ndash;                size="40"&ndash;&gt;-->
<!--&lt;!&ndash;                class="image-loader"&ndash;&gt;-->
<!--&lt;!&ndash;            />&ndash;&gt;-->
<!--&lt;!&ndash;            <div :class="{'fade-in': isImageLoaded, 'hidden': !isImageLoaded}">&ndash;&gt;-->
<!--&lt;!&ndash;              <v-img&ndash;&gt;-->
<!--&lt;!&ndash;                  :src="photoUrl"&ndash;&gt;-->
<!--&lt;!&ndash;                  style="width: 100%;"&ndash;&gt;-->
<!--&lt;!&ndash;                  class="mt-2"&ndash;&gt;-->
<!--&lt;!&ndash;                  @load="isImageLoaded = true"&ndash;&gt;-->
<!--&lt;!&ndash;                  @error="onImageError"&ndash;&gt;-->
<!--&lt;!&ndash;              />&ndash;&gt;-->
<!--&lt;!&ndash;            </div>&ndash;&gt;-->
<!--&lt;!&ndash;          </div>&ndash;&gt;-->
<!--&lt;!&ndash;        </a>&ndash;&gt;-->
<!--        <v-file-input-->
<!--            v-model="photo"-->
<!--            label="写真をアップロード"-->
<!--            accept="image/*"-->
<!--            @change="handlePhotoUpload"-->
<!--            prepend-icon="mdi-camera"-->
<!--            :loading="isUploading"-->
<!--        />-->
<!--      </v-card-text>-->

<!--      <v-card-text style="margin-top: -35px;">-->
<!--        <div style="display: flex; justify-content: space-between; padding: 8px 0;">-->
<!--          <div-->
<!--              v-for="c in presetColors"-->
<!--              :class="['color-circle', { selected: color === c }]"-->
<!--              :key="c"-->
<!--              :style="{-->
<!--                backgroundColor: c,-->
<!--                width: '100%',-->
<!--                maxWidth: '36px',-->
<!--                height: '36px',-->
<!--                borderRadius: '50%',-->
<!--                border: color === c ? '2px solid black' : '1px solid #ccc',-->
<!--                cursor: 'pointer',-->
<!--                flex: '1',-->
<!--                margin: '0 4px',-->
<!--              }"-->
<!--              @click="color = c"-->
<!--          />-->
<!--        </div>-->
<!--      </v-card-text>-->

<!--      <v-card-actions style="margin-top: 0px">-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>-->
<!--        <v-spacer />-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="remove">削除</v-btn>-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="save">保存</v-btn>-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="close">閉じる</v-btn>-->
<!--      </v-card-actions>-->
<!--      <v-card-text style="margin-top: -20px">-->
<!--        <div class="mt-2 text-caption text-right">-->
<!--          作成者: {{ creator }}<br>-->
<!--          日時: {{ timestamp }}<br>-->
<!--          グループ: {{ groupName }}<br>-->
<!--          レイヤー: {{ layerName }}-->
<!--        </div>-->
<!--      </v-card-text>-->
<!--    </v-card>-->
<!--  </v-navigation-drawer>-->
<!--</template>-->

<!--<script>-->
<!--import { mapState, mapMutations } from 'vuex';-->
<!--import firebase from "firebase/app";-->
<!--import "firebase/firestore";-->
<!--import "firebase/storage";-->
<!--import {enableMotionPermission} from "@/js/popup";-->
<!--import store from "@/store";-->

<!--export default {-->
<!--  name: 'PointInfoDrawer',-->
<!--  components: {},-->
<!--  data() {-->
<!--    return {-->
<!--      tab: '0',-->
<!--      isImageLoaded: false,-->
<!--      title: '',-->
<!--      description: '',-->
<!--      photo: null,-->
<!--      photoUrl: '',-->
<!--      isUploading: false,-->
<!--      color: '#000000',-->
<!--      presetColors: ['#ff0000', '#00aaff', '#00cc66', '#ffcc00', '#ff66cc', '#9966ff', '#aaaaaa', '#000000'],-->
<!--    };-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState([-->
<!--      'showPointInfoDrawer',-->
<!--      'selectedPointFeature',-->
<!--      'currentGroupId',-->
<!--      'selectedLayerId',-->
<!--      'currentGroupName',-->
<!--      'currentGroupLayers',-->
<!--      'groupFeatures'-->
<!--    ]),-->
<!--    groupName() { return this.currentGroupName || '未選択'; },-->
<!--    layerName() {-->
<!--      const id = this.selectedLayerId;-->
<!--      const layers = this.currentGroupLayers;-->
<!--      const layer = layers.find(l => l.id === id);-->
<!--      return layer?.name || '未選択';-->
<!--    },-->
<!--    visible: {-->
<!--      get() { return this.showPointInfoDrawer; },-->
<!--      set(val) {-->
<!--        this.setPointInfoDrawer(val);-->
<!--        if (!val) {-->
<!--          // ドロワー閉じるときにフィールドをクリア-->
<!--          this.title = '';-->
<!--          this.description = '';-->
<!--          this.photo = null;-->
<!--          this.photoUrl = '';-->
<!--          this.color = '#000000';-->
<!--        }-->
<!--      }-->
<!--    },-->
<!--    creator() { return this.selectedPointFeature?.properties?.createdBy || '不明'; },-->
<!--    timestamp() { return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString(); }-->
<!--  },-->
<!--  watch: {-->

<!--    tab (newVal) {-->
<!--      if (newVal === '1') {-->
<!--        const coordinates = this.$store.state.clickedCoordinates;-->
<!--        async function setupStreetViewWithMotion() {-->
<!--          await enableMotionPermission(); // ← 先に許可をもらう-->
<!--          setTimeout(() => {-->
<!--            const container = document.querySelector('.street-view')-->
<!--            new window.google.maps.StreetViewPanorama(container, {-->
<!--              position: {lat: coordinates[1], lng: coordinates[0]},-->
<!--              pov: {heading: 34, pitch: 10},-->
<!--              zoom: 1,-->
<!--              disableDefaultUI: true,-->
<!--            });-->
<!--          }, 100)-->
<!--        }-->
<!--        setupStreetViewWithMotion()-->
<!--      } else if (newVal === '2') {-->
<!--        const coordinates = this.$store.state.clickedCoordinates;-->
<!--        const MAPILLARY_CLIENT_ID = 'MLY|9491817110902654|13f790a1e9fc37ee2d4e65193833812c';-->
<!--        async function aaa () {-->
<!--          async function mapillary() {-->
<!--            const deltaLat = 0.00009; // 約10m-->
<!--            const deltaLng = 0.00011; // 東京近辺での約10m-->
<!--            const response = await fetch(`https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_ID}&fields=id,thumb_1024_url&bbox=${coordinates[0] - deltaLng},${coordinates[1] - deltaLat},${coordinates[0] + deltaLng},${coordinates[1] + deltaLat}&limit=1`);-->
<!--            const data = await response.json();-->
<!--            if (data.data && data.data.length > 0) {-->
<!--              const imageUrl = data.data[0].thumb_1024_url;-->
<!--              const img = `<br><a href="${imageUrl}" target="_blank"><img width="380px" src="${imageUrl}" alt="Mapillary Image"></a>`;-->
<!--              return img;-->
<!--            } else {-->
<!--              return '<div style="text-align: center;"><span style="font-size: small">10m圏内にMapillary画像が見つかりませんでした。</span></div>';-->
<!--            }-->
<!--          }-->
<!--          const img = await mapillary()-->
<!--          const container = document.querySelector('.mapillary')-->
<!--          container.innerHTML = img-->
<!--        }-->
<!--        aaa()-->
<!--      }-->
<!--    },-->

<!--    selectedPointFeature(newVal) {-->
<!--      this.tab = '0'-->
<!--      // 地物がクリックされたときにフィールドを更新-->
<!--      if (newVal && this.visible) {-->
<!--        this.title = newVal.properties.title || '';-->
<!--        this.description = newVal.properties.description || '';-->
<!--        this.color = newVal.properties.color || '#000000';-->
<!--        this.photoUrl = newVal.properties.photoUrl || '';-->
<!--        this.photo = null;-->
<!--      }-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setPointInfoDrawer',-->
<!--      'saveSelectedPointFeature',-->
<!--      'updateSelectedPointPhotoUrl',-->
<!--      'setSelectedPointFeature',-->
<!--      'setGroupFeatures'-->
<!--    ]),-->
<!--    async handlePhotoUpload() {-->
<!--      if (!this.photo) return;-->

<!--      this.isUploading = true;-->
<!--      try {-->
<!--        const storageRef = firebase.storage().ref();-->
<!--        const fileExtension = this.photo.name.split('.').pop();-->
<!--        const fileName = `${this.selectedPointFeature?.properties?.id || 'new'}_${Date.now()}.${fileExtension}`;-->
<!--        const photoRef = storageRef.child(`points/${fileName}`);-->

<!--        const snapshot = await photoRef.put(this.photo);-->
<!--        const photoUrl = await snapshot.ref.getDownloadURL();-->

<!--        this.photoUrl = photoUrl;-->
<!--        this.$store.commit('updateSelectedPointPhotoUrl', photoUrl);-->
<!--        this.photo = null; // アップロード成功後に photo をリセット-->
<!--      } catch (error) {-->
<!--        console.error('写真アップロードエラー:', error);-->
<!--        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);-->
<!--      } finally {-->
<!--        this.isUploading = false;-->
<!--      }-->
<!--    },-->
<!--    async save() {-->
<!--      console.log('保存開始');-->

<!--      const feature = this.selectedPointFeature;-->
<!--      const layerId = this.selectedLayerId;-->
<!--      const groupId = this.currentGroupId;-->

<!--      console.log('現在の layerId:', layerId);-->
<!--      console.log('feature が属しているレイヤー:', feature?.properties?.layerId);-->

<!--      if (!feature || !feature.properties) {-->
<!--        this.$store.commit('showSnackbarForGroup', '保存対象のポイントがありません');-->
<!--        return;-->
<!--      }-->

<!--      // ★ 必要なら layerId をここで feature にも保存-->
<!--      feature.properties.title = this.title;-->
<!--      feature.properties.description = this.description;-->
<!--      feature.properties.color = this.color;-->
<!--      feature.properties.layerId = layerId;-->

<!--      if (this.photoUrl) {-->
<!--        feature.properties.photoUrl = this.photoUrl;-->
<!--      }-->

<!--      this.saveSelectedPointFeature();-->
<!--      await this.$store.dispatch('saveSelectedPointToFirestore');-->
<!--      console.log('保存完了');-->

<!--      await this.syncPointData();-->
<!--      this.close();-->

<!--      const map = this.$store.state.map01;-->
<!--      const updatedFeatures = this.$store.state.groupFeatures; // ← syncPointData で更新されたやつ-->

<!--      if (map && map.getSource('oh-point-source')) {-->
<!--        map.getSource('oh-point-source').setData({-->
<!--          type: 'FeatureCollection',-->
<!--          features: updatedFeatures-->
<!--        });-->
<!--        map.triggerRepaint();-->
<!--        console.log('🗺️ マップ上のポイントを更新しました');-->
<!--      }-->


<!--    },-->
<!--    remove() {-->
<!--      const selectedPointFeature = this.selectedPointFeature;-->
<!--      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {-->
<!--        console.warn('選択されたポイントがありません');-->
<!--        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');-->
<!--        return;-->
<!--      }-->
<!--      this.deleteSelectedPoint();-->
<!--      this.close();-->
<!--    },-->
<!--    async deleteSelectedPoint() {-->
<!--      const db = firebase.firestore();-->
<!--      const selectedPointFeature = this.selectedPointFeature;-->
<!--      const id = selectedPointFeature?.properties?.id;-->
<!--      const groupId = this.currentGroupId;-->
<!--      const layerId = this.selectedLayerId;-->

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
<!--      const groupId = this.currentGroupId;-->
<!--      const layerId = this.selectedLayerId;-->

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
<!--    },-->
<!--    async syncPointData() {-->
<!--      const groupId = this.currentGroupId;-->
<!--      const layerId = this.selectedLayerId;-->
<!--      const selectedId = this.selectedPointFeature?.properties?.id;-->

<!--      if (!groupId || !layerId || !selectedId) return;-->

<!--      try {-->
<!--        const db = firebase.firestore();-->
<!--        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);-->
<!--        const doc = await docRef.get();-->
<!--        if (doc.exists) {-->
<!--          const features = doc.data().features || [];-->
<!--          const matched = features.find(f => f.properties.id === selectedId);-->
<!--          if (matched) {-->
<!--            this.$store.commit('setSelectedPointFeature', JSON.parse(JSON.stringify(matched)));-->
<!--            this.$store.commit('setGroupFeatures', features);-->
<!--            this.title = matched.properties.title || '';-->
<!--            this.description = matched.properties.description || '';-->
<!--            this.color = matched.properties.color || '#000000';-->
<!--            this.photoUrl = matched.properties.photoUrl || '';-->
<!--            this.photo = null;-->
<!--            console.log('📶 保存後同期: データ更新', matched);-->
<!--          } else {-->
<!--            console.warn('選択されたポイントが見つかりません');-->
<!--            this.$store.commit('setSelectedPointFeature', null);-->
<!--            this.title = '';-->
<!--            this.description = '';-->
<!--            this.photoUrl = '';-->
<!--            this.color = '#000000';-->
<!--          }-->
<!--        }-->
<!--      } catch (error) {-->
<!--        console.error('同期エラー:', error);-->
<!--      }-->
<!--    }-->
<!--  },-->
<!--  mounted() {-->
<!--    // 初期化は watch に依存-->
<!--  },-->
<!--  beforeUnmount() {-->
<!--    // 特にクリーンアップ不要-->
<!--  }-->
<!--};-->
<!--</script>-->

<!--<style scoped>-->
<!--.point-info-drawer {-->
<!--  z-index: 2500;-->
<!--}-->
<!--.fade-in {-->
<!--  opacity: 1;-->
<!--  transition: opacity 0.5s ease-in;-->
<!--}-->
<!--.hidden {-->
<!--  opacity: 0;-->
<!--}-->
<!--.image-loader {-->
<!--  position: absolute;-->
<!--  top: 50%;-->
<!--  left: 50%;-->
<!--  transform: translate(-50%, -50%);-->
<!--  z-index: 2;-->
<!--}-->
<!--.color-picker-row {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  padding: 8px 0;-->
<!--}-->
<!--.color-circle {-->
<!--  width: 36px;-->
<!--  height: 36px;-->
<!--  borderRadius: 50%;-->
<!--  border: 1px solid #ccc;-->
<!--  cursor: pointer;-->
<!--  transition: transform 0.2s ease, opacity 0.2s ease;-->
<!--}-->
<!--.color-circle:hover {-->
<!--  transform: scale(1.15);-->
<!--  opacity: 0.8;-->
<!--}-->
<!--.color-circle.selected {-->
<!--  border: 3px solid black;-->
<!--}-->
<!--.selected-color {-->
<!--  border: 2px solid black;-->
<!--}-->
<!--.custom-tabs .v-btn {-->
<!--  padding: 10px!important;-->
<!--}-->
<!--</style>-->
