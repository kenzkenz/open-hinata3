<template>
  <v-card>
    <div style="margin-bottom: 10px;">
      <v-text-field
          :value="layerName"
          type="text"
          placeholder="レイヤーネームまたは検索"
          @update:modelValue="$emit('update:layerName', $event)"
      ></v-text-field>
      <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="addLayer">レイヤー追加</v-btn>
      <v-btn style="margin-top: -10px; margin-bottom: 10px; margin-left: 10px" @click="renameLayer">リネーム</v-btn>
      <v-btn style="margin-top: -10px;margin-bottom: 10px;margin-left: 10px;" @click="searchLayer">検索</v-btn>
      <div
          style="height: 50px;"
          v-for="item in sortedGroupLayers"
          :key="item.id"
          class="data-container"
          :class="{ 'selected': selectedLayerId === item.id }"
          @click="selectLayer(item.name, item.id)"
      >
        <v-chip
            v-if="item.features?.length ?? 0"
            class="file-count-badge"
            size="small"
            color="navy"
            text-color="white"
        >
          {{ item.features?.length ?? 0 }}
        </v-chip>
        <span v-else style="color: red;">new </span>
        <button class="close-btn" @click.stop="deleteLayer(item.id)">×</button>
        <span v-html="'<strong>' + item.name + '</strong>_' + item.nickName + 'が作成_' + readableTime(item.createdAt)"></span>
      </div>
    </div>
  </v-card>
</template>

<script>
import firebase from 'firebase/app';
import 'firebase/firestore';
import { ohPointLayer } from "@/js/layers";
import 'firebase/auth';

export default {
  name: 'LayerManager',
  props: {
    layerName: {
      type: String,
      default: ''
    },
    groupId: {
      type: String,
      required: true
    },
    currentGroupLayers: {
      type: Array,
      required: true
    },
    selectedLayerId: {
      type: String,
      default: null
    },
    mapInstance: {
      type: Object,
      default: null // マップが不要な場合に対応
    }
  },
  data: () => ({
    // localLayerName: this.layerName, // プロパティをローカルデータにコピー エラーを起こす
    // isDeleted: false
  }),
  computed: {
    // localLayerName () {
    //   if (this.isDeleted) {
    //     // this.isDeleted = false
    //     return ''
    //   } else {
    //     return this.layerName
    //   }
    // },
    sortedGroupLayers() {
      return [...this.currentGroupLayers].sort((a, b) => {
        const aLength = a.features?.length || 0;
        const bLength = b.features?.length || 0;
        // lengthが0の場合は先頭に
        if (aLength === 0 && bLength === 0) return 0;
        if (aLength === 0) return -1;
        if (bLength === 0) return 1;
        // それ以外はlengthの降順
        return bLength - aLength;
      });
    },
    s_currentGroupId() {
      return this.$store.state.currentGroupId ;
    },
  },
  methods: {
    updateLocalLayerName() {
      this.localLayerName = ''; // ローカルデータを変更
    },
    async fetchLayers() {
      if (!this.groupId) {
        console.warn('fetchLayers: グループIDが未定義、currentGroupLayersをクリア');
        this.$emit('update:currentGroupLayers', []);
        return;
      }
      try {
        console.log('fetchLayers開始: groupId=', this.groupId);
        const snapshot = await firebase.firestore()
            .collection('groups')
            .doc(this.groupId)
            .collection('layers')
            .orderBy('createdAt')
            .get();
        const layers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('取得したレイヤー数:', layers.length);
        this.$emit('update:currentGroupLayers', layers);
        if (this.selectedLayerId && !layers.find(l => l.id === this.selectedLayerId)) {
          console.warn('選択中のレイヤーIDがリストにない:', this.selectedLayerId);
          this.$emit('update:selectedLayerId', null);
        }
      } catch (error) {
        console.error('fetchLayersエラー:', error);
        this.$store.commit('showSnackbarForGroup', `レイヤー取得に失敗: ${error.message}`);
        this.$emit('update:currentGroupLayers', []);
      }
    },
    async addLayer() {
      // layerNameと一致する要素を検索
      const matchedLayer = this.currentGroupLayers.find(layer => layer?.name === this.layerName);
      if (matchedLayer) {
        alert ('同じ名前でレイヤー追加はできません')
        return
      }
      try {
        if (!this.layerName) {
          throw new Error('レイヤー名を入力してください');
        }
        if (!this.groupId) {
          throw new Error('グループIDが必要です');
        }
        console.log('addLayer: layerName=', this.layerName);
        const layerRef = await firebase.firestore()
            .collection('groups')
            .doc(this.groupId)
            .collection('layers')
            .add({
              name: this.layerName,
              nickName: this.$store.state.myNickname || '匿名',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              features: [],
              color: 'navy'
            });
        this.$emit('update:layerName', '');
        await this.fetchLayers();
        this.$store.commit('showSnackbarForGroup', 'レイヤーを追加しました');
      } catch (error) {
        console.error('addLayerエラー:', error);
        this.$store.commit('showSnackbarForGroup', `レイヤー追加に失敗: ${error.message}`);
      }
    },
    async renameLayer() {
      // layerNameと一致する要素を検索
      // const matchedLayer = this.currentGroupLayers.find(layer => layer?.name === this.layerName);
      // if (matchedLayer) {
      //   alert ('同じ名前にリネームはできません')
      //   return
      // }
      try {
        if (!this.selectedLayerId || !this.layerName) {
          throw new Error('レイヤーを選択し、名前を入力してください');
        }
        await firebase.firestore()
            .collection('groups')
            .doc(this.groupId)
            .collection('layers')
            .doc(this.selectedLayerId)
            .update({ name: this.layerName });
        await this.fetchLayers();
        this.$store.commit('showSnackbarForGroup', 'レイヤーをリネームしました');
      } catch (error) {
        console.error('renameLayerエラー:', error);
        this.$store.commit('showSnackbarForGroup', `リネームに失敗: ${error.message}`);
      }
    },
    async searchLayer() {
      try {
        if (!this.groupId) {
          throw new Error('グループIDが必要です');
        }
        console.log('searchLayer: search=', this.layerName);
        const snapshot = await firebase.firestore()
            .collection('groups')
            .doc(this.groupId)
            .collection('layers')
            .where('name', '>=', this.layerName)
            .where('name', '<=', this.layerName + '\uf8ff')
            .get();
        const layers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.$emit('update:currentGroupLayers', layers);
        this.$store.commit('showSnackbarForGroup', `検索結果: ${layers.length}件`);
      } catch (error) {
        console.error('searchLayerエラー:', error);
        this.$store.commit('showSnackbarForGroup', `検索に失敗: ${error.message}`);
      }
    },
    async selectLayer(name, id) {
      try {
        if (this.selectedLayerId === id) {
          console.log('同じレイヤーが選択済み、処理スキップ');
          return;
        }
        this.$emit('update:selectedLayerId', id);
        this.$emit('select-layer', { name, id });

        // マップ依存の処理（mapInstanceがある場合）
        if (this.mapInstance) {
          const docRef = firebase.firestore()
              .collection('groups')
              .doc(this.groupId)
              .collection('layers')
              .doc(id);
          const doc = await docRef.get();
          if (!doc.exists) {
            throw new Error(`レイヤードキュメントが存在しない: id=${id}`);
          }
          const currentLayer = { id: doc.id, ...doc.data() };
          console.log('Firestoreから取得したレイヤー:', JSON.stringify(currentLayer, null, 2));

          const mapLayers = this.$store.state.selectedLayers['map01'];
          let existingLayer = mapLayers.find(l => l.id === 'oh-point-layer');

          const pointColor = currentLayer.color || 'navy';
          const labelColor = currentLayer.labelColor || 'navy';

          if (!existingLayer) {
            console.log('oh-point-layerが存在しないので新規追加');
            const newLayer = {
              id: 'oh-point-layer',
              label: name,
              sources: [{
                id: 'oh-point-source',
                obj: {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: currentLayer.features || []
                  }
                }
              }],
              layers: [
                ohPointLayer,
                {
                  id: 'oh-label-layer',
                  type: 'symbol',
                  source: 'oh-point-source',
                  layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['NotoSansJP-Regular'],
                    'text-size': 12,
                    'text-offset': [0, 1.5]
                  },
                  paint: {
                    'text-color': labelColor,
                    'text-halo-color': '#fff',
                    'text-halo-width': 1
                  }
                }
              ],
              opacity: 1,
              visibility: true,
              layerid: id
            };
            mapLayers.unshift(newLayer);
            existingLayer = newLayer;
          } else {
            console.log('既存のoh-point-layerを更新');
            existingLayer.label = name;
            existingLayer.layerid = id;
            if (!existingLayer.sources || !existingLayer.sources.length) {
              console.warn('sourcesが欠落、修復');
              existingLayer.sources = [{
                id: 'oh-point-source',
                obj: {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: currentLayer.features || []
                  }
                }
              }];
            } else {
              existingLayer.sources[0].obj.data.features = currentLayer.features || [];
            }
            if (!existingLayer.layers || !existingLayer.layers.length) {
              console.warn('layersが欠落、修復');
              existingLayer.layers = [
                ohPointLayer,
                {
                  id: 'oh-label-layer',
                  type: 'symbol',
                  source: 'oh-point-source',
                  layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['NotoSansJP-Regular'],
                    'text-size': 12,
                    'text-offset': [0, 1.5]
                  },
                  paint: {
                    'text-color': labelColor,
                    'text-halo-color': '#fff',
                    'text-halo-width': 1
                  }
                }
              ];
            }
          }
          console.log('更新後のselectedLayers.map01:', JSON.stringify(mapLayers, null, 2));

          if (!this.mapInstance.getSource('oh-point-source')) {
            console.warn('oh-point-sourceが存在しない、追加');
            this.mapInstance.addSource('oh-point-source', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: currentLayer.features || []
              }
            });
            this.mapInstance.addLayer({
              ...ohPointLayer,
              paint: {
                ...ohPointLayer.paint,
                'circle-color': pointColor
              }
            });
            this.mapInstance.addLayer({
              id: 'oh-label-layer',
              type: 'symbol',
              source: 'oh-point-source',
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['NotoSansJP-Regular'],
                'text-size': 12,
                'text-offset': [0, 1.5]
              },
              paint: {
                'text-color': labelColor,
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }
            });
          } else {
            this.mapInstance.getSource('oh-point-source').setData({
              type: 'FeatureCollection',
              features: currentLayer.features || []
            });
            this.mapInstance.setPaintProperty('oh-point-layer', 'circle-color', pointColor);
            this.mapInstance.setPaintProperty('oh-label-layer', 'text-color', labelColor);
          }
          console.log('マップソースにデータセット完了: features=', currentLayer.features?.length || 0);

          this.mapInstance.triggerRepaint();
          console.log('マップ再描画トリガー');
        }

        this.$store.commit('showSnackbarForGroup', `${name} を選択しました`);
      } catch (error) {
        console.error('selectLayerエラー:', error);
        this.$store.commit('showSnackbarForGroup', `レイヤー選択に失敗: ${error.message}`);
      }
    },
    async deleteLayer(id) {
      if (!confirm(`本当に削除しますか？元には戻りません。`)) return
      try {
        if (!this.groupId) {
          throw new Error('グループIDが必要です');
        }
        await firebase.firestore()
            .collection('groups')
            .doc(this.groupId)
            .collection('layers')
            .doc(id)
            .delete();
        await this.fetchLayers();
        if (this.selectedLayerId === id) {
          this.$emit('update:selectedLayerId', null);
        }
        this.$store.commit('showSnackbarForGroup', 'レイヤーを削除しました');
        // this.isDeleted = true
      } catch (error) {
        console.error('deleteLayerエラー:', error);
        this.$store.commit('showSnackbarForGroup', `レイヤー削除に失敗: ${error.message}`);
      }
    },
    readableTime(timestamp) {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    async createSoloGroupOnLogin() {
      try {
        const user = firebase.auth().currentUser;
        if (!user) {
          console.log('ログイン情報がありません');
          return;
        }
        // ユーザー情報を取得（ニックネーム用）
        const nickname = user.displayName || 'ユーザー'; // ニックネームがない場合はデフォルト
        // グループIDとしてユーザーIDを使用
        const groupId = user.uid;
        // 既にグループが存在するかチェック
        const groupDoc = await firebase.firestore().collection('groups').doc(groupId).get();
        if (groupDoc.exists) {
          console.log('お一人様グループは既に存在します');
          return;
        }
        // グループ名を自動生成
        const groupName = `${nickname}のお一人様グループ`;
        // Firestore にグループ作成
        await firebase.firestore().collection('groups').doc(groupId).set({
          name: groupName,
          ownerUid: user.uid,
          members: [user.uid],
          createdAt: new Date(),
          isSoloGroup: true, // お一人様グループ用のフラグ
          isProtected: true, // 削除防止フラグ
          priority: 1, // リスト先頭表示用
        });
        // ユーザーにグループ追加
        await firebase.firestore().collection('users').doc(user.uid).set(
            {
              groups: firebase.firestore.FieldValue.arrayUnion(groupId),
            },
            { merge: true }
        );
        // レイヤーを作成（IDはFirestoreに自動生成させる）
        const layerName = `${nickname}のお一人様レイヤー`;
        const layerRef = await firebase.firestore()
            .collection('groups')
            .doc(groupId)
            .collection('layers')
            .add({
              name: layerName,
              ownerUid: user.uid,
              createdAt: new Date(),
              nickName: 'OH3'
              // isSoloLayer: true, // お一人様レイヤー用のフラグ（必要に応じて）
            });
        console.log('お一人様グループとレイヤーを作成しました！ レイヤーID:', layerRef.id);
        this.$store.state.soloFlg = true;
        this.fetchLayers()
        alert(`${nickname}のお一人様グループと${layerName}を自動作成しました！グループを選択してください。`);
      } catch (error) {
        console.error('お一人様グループ作成中にエラーが発生:', error);
      }
    },
  },
  watch:{
    s_currentGroupId(){
      this.fetchLayers()
    }
  },
  mounted() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.createSoloGroupOnLogin();
      }
    });
    this.fetchLayers()
  }
}
</script>

<style scoped>
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
.data-container.selected {
  background-color: #b2ebf2;
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