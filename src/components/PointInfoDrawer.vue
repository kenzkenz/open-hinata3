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
        <!-- グループとレイヤー名 -->
        <p class="mt-2 text-caption" style="margin-bottom: 10px;"> グループ: {{ groupName }} / レイヤー: {{ layerName }}</p>
        <!-- タイトル入力欄 -->
        <v-text-field
            v-model="title"
            label="タイトル"
            auto-grow
        />
        <!-- 説明入力欄 -->
        <v-textarea
            v-model="description"
            label="説明（最大500文字）"
            :counter="500"
            auto-grow
            rows="6"
        />
        <!-- ストリートビュー表示エリア（未実装） -->
        <div class="street-view" style="margin-top:0px;height: 200px;width: 100%"></div>
        <!-- 作成者と日時 -->
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
import { deleteAllPoints } from "@/js/glouplayer";

export default {
  name: 'PointInfoDrawer',
  data() {
    return {
      title: '',        // ローカルでタイトルを管理
      description: ''   // ローカルで説明を管理
    };
  },
  computed: {
    ...mapState([
      'showPointInfoDrawer',   // ドロワーの表示状態
      'selectedPointFeature',  // 選択された地物
    ]),
    currentGroupId() {
      return this.$store.state.currentGroupId; // 現在のグループID
    },
    selectedLayerId() {
      return this.$store.state.selectedLayerId; // 現在のレイヤーID
    },
    groupName() {
      return this.$store.state.currentGroupName || '未選択'; // グループ名
    },
    layerName() {
      const id = this.$store.state.selectedLayerId;
      const layers = this.$store.state.currentGroupLayers;
      const layer = layers.find(l => l.id === id);
      return layer?.name || '未選択'; // レイヤー名
    },
    visible: {
      get() {
        return this.showPointInfoDrawer; // ドロワーの表示状態を取得
      },
      set(val) {
        this.setPointInfoDrawer(val); // ドロワーの表示状態を更新
      }
    },
    creator() {
      return this.selectedPointFeature?.properties?.createdBy || '不明'; // 作成者
    },
    timestamp() {
      return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString(); // 作成日時
    }
  },
  watch: {
    // 選択された地物が変更されたらローカル値を更新
    selectedPointFeature: {
      immediate: true, // 初回表示時も動作
      handler(newVal) {
        console.log('selectedPointFeature 更新:', newVal); // デバッグ用
        this.title = newVal?.properties?.title || '';
        this.description = newVal?.properties?.description || '';
        if (!newVal?.properties) {
          console.warn('properties が存在しません:', newVal); // データ構造エラー検知
        }
      }
    },
    // ローカルの title が変更されたらストアに反映
    title(newVal) {
      this.$store.commit('updateSelectedPointTitle', newVal);
    },
    // ローカルの description が変更されたらストアに反映
    description(newVal) {
      this.$store.commit('updateSelectedPointDescription', newVal);
    }
  },
  methods: {
    ...mapMutations([
      'setPointInfoDrawer',      // ドロワーの表示状態を変更
      'saveSelectedPointFeature', // 選択地物をストアに保存
      'removePointFeature',      // 地物を削除（未使用）
    ]),
    save() {
      this.saveSelectedPointFeature(); // ローカルデータをストアに保存
      console.log('保存前の features:', this.$store.state.groupGeojson.features); // デバッグ用
      this.$store.dispatch('saveSelectedPointToFirestore'); // Firestore に保存
      this.close(); // ドロワーを閉じる
    },
    removeAll() {
      if (!this.$store.state.groupId) {
        alert('グループに参加していないと削除できません');
        return;
      }
      if (!confirm("全削除しますか？")) {
        return;
      }
      deleteAllPoints(this.$store.state.groupId); // グループ内の全ポイントを削除
      this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました');
      this.close();
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
        this.$store.commit('setSelectedPointFeature', null); // 選択をリセット
      } catch (error) {
        console.error("削除エラー:", error);
        this.$store.commit('showSnackbarForGroup', '削除に失敗しました: ' + error.message);
      }
    },
    remove() {
      const selectedPointFeature = this.$store.state.selectedPointFeature;
      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {
        console.warn('選択されたポイントがありません');
        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');
        return;
      }
      this.deleteSelectedPoint(); // 選択されたポイントを削除
      this.close()
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
          features: [], // 全地物を削除
          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`✅ ${groupId}/${layerId} の全地物を削除しました`);
        this.$store.commit('showSnackbarForGroup', '🗑️ 全地物を削除しました');
        this.$store.commit('setSelectedPointFeature', null); // 選択をリセット
      } catch (error) {
        console.error("全地物削除エラー:", error);
        this.$store.commit('showSnackbarForGroup', '全地物の削除に失敗しました: ' + error.message);
      }
    },
    close() {
      this.setPointInfoDrawer(false); // ドロワーを閉じる
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
<!--import { deleteAllPoints } from "@/js/glouplayer";-->

<!--export default {-->
<!--  name: 'PointInfoDrawer',-->
<!--  data() {-->
<!--    return {-->
<!--      selectedPointFeature: null,-->
<!--      title: '',        // ローカルでタイトルを管理-->
<!--      description: ''   // ローカルで説明を管理-->
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
<!--      return this.$store.state.currentGroupName;-->
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
<!--    // selectedPointFeature が変更されたらローカル値を更新-->
<!--    selectedPointFeature(newVal) {-->
<!--      this.title = newVal?.properties?.title || '';-->
<!--      this.description = newVal?.properties?.description || '';-->
<!--    },-->
<!--    // title が変更されたらストアに反映-->
<!--    title(newVal) {-->
<!--      this.$store.commit('updateSelectedPointTitle', newVal);-->
<!--    },-->
<!--    // description が変更されたらストアに反映-->
<!--    description(newVal) {-->
<!--      this.$store.commit('updateSelectedPointDescription', newVal);-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setPointInfoDrawer',-->
<!--      'saveSelectedPointFeature',-->
<!--      'removePointFeature',-->
<!--    ]),-->
<!--    save() {-->
<!--      this.saveSelectedPointFeature();-->
<!--      console.log('保存前の features:', this.$store.state.groupGeojson.features);-->
<!--      this.$store.dispatch('saveSelectedPointToFirestore');-->
<!--      this.close();-->
<!--    },-->
<!--    removeAll() {-->
<!--      if (!this.$store.state.groupId) {-->
<!--        alert('グループに参加していないと削除できません');-->
<!--        return;-->
<!--      }-->
<!--      if (!confirm("全削除しますか？")) {-->
<!--        return;-->
<!--      }-->
<!--      deleteAllPoints(this.$store.state.groupId);-->
<!--      this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました');-->
<!--      this.close();-->
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
<!--    remove() {-->
<!--      const selectedPointFeature = this.$store.state.selectedPointFeature;-->
<!--      if (!selectedPointFeature || !selectedPointFeature.properties?.id) {-->
<!--        console.warn('選択されたポイントがありません');-->
<!--        this.$store.commit('showSnackbarForGroup', '削除するポイントを選択してください');-->
<!--        return;-->
<!--      }-->
<!--      this.deleteSelectedPoint();-->
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
<!--        this.selectedPointFeature = null;-->
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
<!--import { mapState, mapMutations } from 'vuex'-->
<!--import firebase from "firebase/app";-->
<!--import "firebase/firestore";-->
<!--import {deleteAllPoints} from "@/js/glouplayer";-->

<!--export default {-->
<!--  name: 'PointInfoDrawer',-->
<!--  data() {-->
<!--    return {-->
<!--      selectedPointFeature: null, // 初期値をnullに設定-->
<!--      // title: ''-->
<!--    };-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState([-->
<!--      'showPointInfoDrawer',-->
<!--      'selectedPointFeature',-->
<!--    ]),-->
<!--    currentGroupId() {-->
<!--      return this.$store.state.currentGroupId; // 最新のgroupIdを監視-->
<!--    },-->
<!--    selectedLayerId() {-->
<!--      return this.$store.state.selectedLayerId; // 最新のlayerIdを監視-->
<!--    },-->
<!--    // カスタム計算プロパティを個別に定義-->
<!--    groupName() {-->
<!--      // alert(this.$store.state.currentGroupName)-->
<!--      return this.$store.state.currentGroupName;-->
<!--    },-->
<!--    layerName() {-->
<!--      const id = this.$store.state.selectedLayerId;-->
<!--      const layers = this.$store.state.currentGroupLayers;-->
<!--      const layer = layers.find(l => l.id === id);-->
<!--      return layer?.name || '未選択';-->
<!--    },-->
<!--    visible: {-->
<!--      get () {-->
<!--        return this.showPointInfoDrawer-->
<!--      },-->
<!--      set (val) {-->
<!--        this.setPointInfoDrawer(val)-->
<!--      }-->
<!--    },-->
<!--    title: { // title を computed に移動-->
<!--      get() {-->
<!--        return this.selectedPointFeature?.properties?.title || '';-->
<!--      },-->
<!--      set(val) {-->
<!--        this.$store.commit('updateSelectedPointTitle', val); // 新しいミューテーションを使用-->
<!--      }-->
<!--    },-->
<!--    description: {-->
<!--      get () {-->
<!--        return this.selectedPointFeature?.properties?.description || ''-->
<!--      },-->
<!--      set (val) {-->
<!--        this.$store.commit('updateSelectedPointDescription', val)-->
<!--      }-->
<!--    },-->
<!--    creator () {-->
<!--      return this.selectedPointFeature?.properties?.createdBy || '不明'-->
<!--    },-->
<!--    timestamp () {-->
<!--      return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString()-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setPointInfoDrawer',-->
<!--      'saveSelectedPointFeature',-->
<!--      'removePointFeature', // ここに追加-->
<!--    ]),-->
<!--    save () {-->
<!--      this.saveSelectedPointFeature()-->
<!--      console.log('保存前の features:', this.$store.state.groupGeojson.features)-->
<!--      this.$store.dispatch('saveSelectedPointToFirestore')-->
<!--      this.close()-->
<!--    },-->
<!--    removeAll () {-->
<!--      if (!this.$store.state.groupId) {-->
<!--        alert('グループに参加していないと削除できません')-->
<!--        return;-->
<!--      }-->
<!--      if (!confirm("全削除しますか？")) {-->
<!--        return-->
<!--      }-->
<!--      deleteAllPoints(this.$store.state.groupId)-->
<!--      this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました')-->
<!--      this.close()-->
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
<!--        this.$store.commit('setSelectedPointFeature', null); // ストアをリセット-->
<!--      } catch (error) {-->
<!--        console.error("削除エラー:", error);-->
<!--        this.$store.commit('showSnackbarForGroup', '削除に失敗しました: ' + error.message);-->
<!--      }-->
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
<!--    async removeAllFeatures() {-->
<!--      const db = firebase.firestore();-->
<!--      const groupId = this.$store.state.currentGroupId;-->
<!--      const layerId = this.$store.state.selectedLayerId;-->

<!--      if (!confirm("全削除しますか？元には戻りません。")) {-->
<!--        return-->
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

<!--        // features配列を空に更新-->
<!--        await docRef.update({-->
<!--          features: [], // 全地物を削除-->
<!--          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()-->
<!--        });-->

<!--        alert(`✅ ${groupId}/${layerId} の全地物を削除しました`);-->
<!--        this.$store.commit('showSnackbarForGroup', '🗑️ 全地物を削除しました');-->
<!--        this.selectedPointFeature = null; // 選択をリセット-->
<!--      } catch (error) {-->
<!--        console.error("全地物削除エラー:", error);-->
<!--        this.$store.commit('showSnackbarForGroup', '全地物の削除に失敗しました: ' + error.message);-->
<!--      }-->
<!--    },-->
<!--    close () {-->
<!--      this.setPointInfoDrawer(false)-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.point-info-drawer {-->
<!--  z-index: 2500;-->
<!--}-->
<!--</style>-->
