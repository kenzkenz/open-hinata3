
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
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>
      <v-card-text style="margin-top: 20px;" class="text-body-1">
        <!-- トリミング用の非表示Canvas（v-ifの外に移動） -->
        <canvas id="trimCanvas" style="display: none;"></canvas>
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
          <v-tab value="0">photo</v-tab>
          <v-tab value="3">
            file
            <v-chip
                v-if="fileList.length > 0"
                class="file-count-badge"
                size="x-small"
                color="red"
                text-color="white"
            >
              {{ fileList.length }}
            </v-chip>
          </v-tab>
          <v-tab value="1">streetview</v-tab>
          <v-tab value="2">mapillary</v-tab>
          <v-tab value="9">close</v-tab>
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
                  <!-- トリミング後の画像 -->
                  <img
                      id="trimmedImage"
                      style="width: 100%; height: 206px; object-fit: cover;"
                      class="mt-2"
                      @load="isImageLoaded = true"
                      @error="onImageError"
                  />
                </div>
              </div>
            </a>
            <div v-else style="text-align: center; color: #888; margin-top: 10px;">
              写真がありません
            </div>
          </v-window-item>
          <v-window-item value="1">
            <div class="street-view" style="margin-top:10px;height: 200px;width: 100%"></div>
          </v-window-item>
          <v-window-item value="2">
            <div ref="mlyContainer" style="margin-top:10px;height: 200px;width: 100%"></div>
          </v-window-item>
          <v-window-item value="3">
            <!-- タブ3: ファイル一覧のみ -->
            <div style="margin-top: 10px;">
              <!-- ファイル一覧 -->
              <div v-if="fileList.length > 0" style="margin-top: 10px;">
                <div class="data-container"
                     v-for="file in fileList"
                     :key="file.id"
                     @click="openFile(file.url, file.type)"
                >
                  <span>{{ file.name }}</span>
                  <button class="close-btn" @click.stop="deleteFile(file.id, file.url)">×</button>
                </div>
              </div>
              <div v-else style="text-align: center; color: #888; margin-top: 10px;">
                ファイルがありません
              </div>
            </div>
          </v-window-item>
          <v-window-item value="9">
            <!-- 閉じるタブ（空でも可） -->
          </v-window-item>
        </v-window>

        <div style="display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap;">
          <!-- カメラアイコン（Androidでは非表示） -->
          <div v-if="!s_isAndroid" style="display: flex; align-items: center; height: 56px; padding-top: 4px;">
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
          <!-- 写真アップロード -->
          <v-file-input
              v-model="photo"
              label="写真をアップロード"
              accept="image/*"
              @change="handlePhotoUpload"
              :loading="isUploading"
              :style="s_isAndroid ? 'flex: 1; min-width: 0; width: 100%;' : 'flex: 1; min-width: 0;'"
              prepend-icon=""
          />
          <!-- ファイル選択（PDF/画像） -->
          <v-file-input
              v-model="files"
              label="ファイルをアップロード"
              accept="image/*,application/pdf"
              multiple
              @change="handleFileUpload"
              :loading="isFileUploading"
              :style="s_isAndroid ? 'flex: 1; min-width: 0; width: 100%;' : 'flex: 1; min-width: 0;'"
              prepend-icon=""
          />
        </div>
      </v-card-text>

      <v-card-text style="margin-top: -40px;">
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
        <v-btn disabled=true style="background-color: var(--main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>
        <v-spacer />
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="remove">削除</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="save">保存</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="close">閉じる</v-btn>
      </v-card-actions>

      <v-card-text style="margin-top: -20px; height: 300px;">
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
import { Viewer } from 'mapillary-js'
import {groupGeojson} from "@/js/layers";

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
      files: [], // アップロード用の一時ファイル
      fileList: [], // 表示用のファイルリスト
      isFileUploading: false, // ファイルアップロード中の状態
      // トリミング用の設定
      targetAspectRatio: 16 / 9, // トリミングのアスペクト比
      outputWidth: 800, // 出力画像の幅
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
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
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
          this.title = '';
          this.description = '';
          this.photo = null;
          this.photoUrl = '';
          this.color = '#000000';
          this.files = [];
          this.fileList = [];
        }
      }
    },
    creator() { return this.selectedPointFeature?.properties?.createdBy || '不明'; },
    timestamp() { return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString(); }
  },
  methods: {
    ...mapMutations([
      'setPointInfoDrawer',
      'saveSelectedPointFeature',
      'updateSelectedPointPhotoUrl',
      'setSelectedPointFeature',
      'setGroupFeatures'
    ]),
    // トリミング処理
    trimImage() {
      if (!this.photoUrl) return;

      // DOMレンダリングを待機
      this.$nextTick(() => {
        const canvas = document.getElementById('trimCanvas');
        if (!canvas) {
          console.warn('Canvas要素が見つかりません。DOMレンダリングを待機して再試行。');
          return;
        }

        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Firebase Storageの画像用
        img.src = this.photoUrl;

        img.onload = () => {
          const imgAspectRatio = img.width / img.height;
          let sx, sy, sWidth, sHeight;

          // トリミング範囲の計算
          if (imgAspectRatio > this.targetAspectRatio) {
            // 画像が横長すぎる場合、幅を基準にトリミング
            sHeight = img.height;
            sWidth = img.height * this.targetAspectRatio;
            sx = (img.width - sWidth) / 2; // 中央からトリミング
            sy = 0;
          } else {
            // 画像が縦長すぎる場合、高さを基準にトリミング
            sWidth = img.width;
            sHeight = img.width / this.targetAspectRatio;
            sx = 0;
            sy = (img.height - sHeight) / 2; // 中央からトリミング
          }

          // Canvasサイズを設定
          canvas.width = this.outputWidth;
          canvas.height = this.outputWidth / this.targetAspectRatio;

          // 画像をトリミングして描画
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

          // トリミング結果をプレビューに設定
          const trimmedImage = document.getElementById('trimmedImage');
          if (trimmedImage) {
            trimmedImage.src = canvas.toDataURL('image/jpeg');
            this.isImageLoaded = true;
          } else {
            console.warn('trimmedImage要素が見つかりません。');
          }
        };

        img.onerror = () => {
          console.error('画像読み込みエラー:', this.photoUrl);
          this.isImageLoaded = false;
          this.onImageError();
        };
      });
    },
    // 画像エラーハンドラ
    onImageError() {
      this.isImageLoaded = false;
      console.log('画像の読み込みに失敗しました')
      // this.$store.commit('showSnackbarForGroup', '画像の読み込みに失敗しました');
    },
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
        // トリミングをトリガー
        this.trimImage();
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
        this.photo = null;
        this.$store.commit('showSnackbarForGroup', 'アップロード成功');
        // トリミングをトリガー
        this.trimImage();
      } catch (error) {
        console.error('写真アップロードエラー:', error);
        this.$store.commit('showSnackbarForGroup', '写真のアップロードに失敗しました: ' + error.message);
      } finally {
        this.isUploading = false;
      }
    },
    async handleFileUpload() {
      if (!this.files || this.files.length === 0) return;

      this.isFileUploading = true;
      const storageRef = firebase.storage().ref();
      const db = firebase.firestore();
      const pointId = this.selectedPointFeature?.properties?.id || 'new';
      const groupId = this.currentGroupId;
      const layerId = this.selectedLayerId;

      try {
        for (const file of this.files) {
          const fileExtension = file.name.split('.').pop().toLowerCase();
          const fileName = `${pointId}_${Date.now()}_${file.name}`;
          const fileRef = storageRef.child(`points/${fileName}`);

          // アップロード
          const snapshot = await fileRef.put(file);
          const downloadUrl = await snapshot.ref.getDownloadURL();

          // ファイルメタデータをFirestoreに保存
          const fileData = {
            id: `${pointId}_${Date.now()}`,
            name: file.name,
            url: downloadUrl,
            type: fileExtension === 'pdf' ? 'pdf' : 'image',
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
          };

          await db
              .collection('groups')
              .doc(groupId)
              .collection('layers')
              .doc(layerId)
              .collection('points')
              .doc(pointId)
              .collection('files')
              .doc(fileData.id)
              .set(fileData);

          // ローカルのfileListに先頭に追加
          this.fileList.unshift(fileData);
        }

        this.$store.commit('showSnackbarForGroup', 'ファイルのアップロードに成功しました');
        this.files = [];
        // タブ3を自動で開く
        this.tab = '3';
      } catch (error) {
        console.error('ファイルアップロードエラー:', error);
        this.$store.commit('showSnackbarForGroup', 'ファイルのアップロードに失敗しました: ' + error.message);
      } finally {
        this.isFileUploading = false;
      }
    },
    async deleteFile(fileId, fileUrl) {
      if (!confirm('このファイルを削除しますか？')) return;

      const storageRef = firebase.storage().refFromURL(fileUrl);
      const db = firebase.firestore();
      const pointId = this.selectedPointFeature?.properties?.id;
      const groupId = this.currentGroupId;
      const layerId = this.selectedLayerId;

      try {
        // Storageから削除
        await storageRef.delete();
        // Firestoreから削除
        await db
            .collection('groups')
            .doc(groupId)
            .collection('layers')
            .doc(layerId)
            .collection('points')
            .doc(pointId)
            .collection('files')
            .doc(fileId)
            .delete();

        // ローカルのfileListから削除
        this.fileList = this.fileList.filter(file => file.id !== fileId);
        this.$store.commit('showSnackbarForGroup', 'ファイルを削除しました');
      } catch (error) {
        console.error('ファイル削除エラー:', error);
        this.$store.commit('showSnackbarForGroup', 'ファイルの削除に失敗しました: ' + error.message);
      }
    },
    openFile(url, type) {
      window.open(url, '_blank');
    },
    async loadFiles() {
      const pointId = this.selectedPointFeature?.properties?.id;
      const groupId = this.currentGroupId;
      const layerId = this.selectedLayerId;

      if (!pointId || !groupId || !layerId) {
        this.fileList = [];
        return;
      }

      try {
        const db = firebase.firestore();
        const snapshot = await db
            .collection('groups')
            .doc(groupId)
            .collection('layers')
            .doc(layerId)
            .collection('points')
            .doc(pointId)
            .collection('files')
            .orderBy('uploadedAt', 'desc') // 最新のファイルが先頭に
            .get();

        this.fileList = snapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        this.$store.commit('showSnackbarForGroup', 'ファイルの読み込みに失敗しました');
      }
    },
    async save() {
      this.close();

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

      feature.properties.title = this.title;
      feature.properties.description = this.description;
      feature.properties.color = this.color;
      feature.properties.layerId = layerId;
      feature.properties.fileCount = this.fileList.length;

      if (this.photoUrl) {
        feature.properties.photoUrl = this.photoUrl;
      }

      this.saveSelectedPointFeature();
      await this.$store.dispatch('saveSelectedPointToFirestore');
      console.log('保存完了');

      await this.syncPointData();

      const map = this.$store.state.map01;
      const updatedFeatures = this.$store.state.groupFeatures;

      if (map && map.getSource('oh-point-source')) {
        map.getSource('oh-point-source').setData({
          type: 'FeatureCollection',
          features: updatedFeatures
        });
        map.triggerRepaint();
        console.log('🗺️ マップ上のポイントを更新しました');
      }
      const currentZoom = map.getZoom();
      map.flyTo({
        center: this.$store.state.clickedCoordinates,
        zoom: currentZoom,
        speed: 0.8,
        curve: 1.42,
        essential: true
      });
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

        const map = this.$store.state.map01
        const source = map.getSource('oh-point-source');
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: updatedFeatures
          });
        }

        this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました!');
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

        const map = this.$store.state.map01
        const source = map.getSource('oh-point-source');
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: []
          });
        }

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
    const drawer = document.querySelector('.drawer');
    drawer.addEventListener('scroll', () => {
      const isAtBottom = drawer.scrollTop + drawer.clientHeight >= drawer.scrollHeight - 10;
      if (isAtBottom) {
        drawer.scrollTop = drawer.scrollHeight - drawer.clientHeight;
      }
    });

    if (this.$store.state.isAndroid){
      let startY;
      let isTouching = false;
      let currentTarget = null;
      let initialScrollTop = 0;
      document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.drawer');
        if (target) {
          startY = e.touches[0].clientY;
          initialScrollTop = target.scrollTop;
          isTouching = true;
          currentTarget = target;
          target.style.overflowY = 'auto';
          target.style.touchAction = 'manipulation';
          e.stopPropagation();
        }
      }, { passive: true, capture: true });

      document.addEventListener('touchmove', (e) => {
        if (!isTouching || !currentTarget) return;
        const moveY = e.touches[0].clientY;
        const deltaY = startY - moveY;
        currentTarget.scrollTop += deltaY;
        startY = moveY;
        e.preventDefault();
        e.stopPropagation();
      }, { passive: true, capture: true });

      document.addEventListener('touchend', () => {
        if (currentTarget) {
          currentTarget.style.overflowY = '';
        }
        currentTarget = null;
        isTouching = false;
        initialScrollTop = 0;
      });
    }
  },
  watch: {
    tab (newVal) {
      if (newVal === '1') {
        // const coordinates = this.$store.state.clickedCoordinates;
        // async function setupStreetViewWithMotion() {
        //   await enableMotionPermission();
        //   setTimeout(() => {
        //     const container = document.querySelector('.street-view')
        //     new window.google.maps.StreetViewPanorama(container, {
        //       position: {lat: coordinates[1], lng: coordinates[0]},
        //       pov: {heading: 34, pitch: 10},
        //       zoom: 1,
        //       disableDefaultUI: true,
        //     });
        //   }, 100)
        // }
        // setupStreetViewWithMotion()
      } else if (newVal === '2') {
        this.$nextTick(() => {
          const self = this
          self.$refs.mlyContainer.innerHTML = ''
          async function mapillarySet () {
            const coordinates = self.$store.state.clickedCoordinates;
            const MAPILLARY_CLIENT_ID = 'MLY|9491817110902654|13f790a1e9fc37ee2d4e65193833812c';
            const deltaLat = 0.00009;
            const deltaLng = 0.00011;
            const response = await fetch(`https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_ID}&fields=id,thumb_1024_url&bbox=${coordinates[0] - deltaLng},${coordinates[1] - deltaLat},${coordinates[0] + deltaLng},${coordinates[1] + deltaLat}&limit=1`);
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const imageId = data.data[0].id;
              self.viewer = new Viewer({
                accessToken: MAPILLARY_CLIENT_ID,
                container: self.$refs.mlyContainer,
                imageId: imageId,
                component: { cover: false }
              })
            } else {
              self.$refs.mlyContainer.innerHTML = '<div style="text-align: center;"><span style="font-size: small">Mapillary画像が見つかりませんでした。</span></div>'
              console.warn('Mapillary画像が見つかりませんでした');
            }
          }
          mapillarySet();
        });
      }
    },
    photoUrl(newVal) {
      // photoUrlが変更されたらトリミングをトリガー
      if (newVal) {
        this.isImageLoaded = false;
        this.trimImage();
      } else {
        this.isImageLoaded = false;
        const trimmedImage = document.getElementById('trimmedImage');
        if (trimmedImage) {
          trimmedImage.src = '';
        }
      }
    },
    selectedPointFeature(newVal) {
      this.tab = '0';
      if (newVal && this.visible) {
        this.title = newVal.properties.title || '';
        this.description = newVal.properties.description || '';
        this.color = newVal.properties.color || '#000000';
        this.photoUrl = newVal.properties.photoUrl || '';
        this.photo = null;
        this.loadFiles();
        // トリミングをトリガー（DOMレンダリングを待機）
        if (this.photoUrl) {
          this.$nextTick(() => {
            this.trimImage();
          });
        }
      } else {
        this.fileList = [];
        this.photoUrl = '';
        this.isImageLoaded = false;
        const trimmedImage = document.getElementById('trimmedImage');
        if (trimmedImage) {
          trimmedImage.src = '';
        }
      }
    }
  },
  beforeUnmount() {
    // クリーンアップ不要
  }
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
.mapillary-viewer {
  position: relative !important;
  left: 0px !important;
  background: #eee;
}
.data-container {
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  position: relative;
  cursor: pointer;
  background-color: rgba(132,163,213,0.3);
}
.data-container:hover {
  background-color: #f0f8ff;
}
.close-btn {
  position: absolute;
  top: -10px;
  right: 10px;
  color: black;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 30px;
}
.close-btn:hover {
  color: red;
}
.file-count-badge {
  margin-left: 4px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}
</style>
