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
        <v-textarea
            v-model="description"
            label="説明（最大500文字）"
            :counter="500"
            auto-grow
            rows="6"
        />
        <div class="street-view" style="margin-top:0px;height: 200px;width: 100%"></div>
        <div class="mt-2 text-caption text-right">
          作成者: {{ creator }}<br />
          日時: {{ timestamp }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="removeAll">全削除</v-btn>
        <v-spacer />
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="remove">削除</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="save">保存</v-btn>
        <v-btn style="background-color: var(--main-color); color: white!important;" @click="close">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import {deleteAllPoints} from "@/js/glouplayer";

export default {
  name: 'PointInfoDrawer',
  computed: {
    ...mapState([
      'showPointInfoDrawer',
      'selectedPointFeature',
    ]),
    // カスタム計算プロパティを個別に定義
    groupName() {
      return this.$store.state.currentGroup?.name || '未選択';
    },
    layerName() {
      const id = this.$store.state.selectedLayerId;
      const layers = this.$store.state.currentGroupLayers;
      const layer = layers.find(l => l.id === id);
      return layer?.name || '未選択';
    },
    visible: {
      get () {
        return this.showPointInfoDrawer
      },
      set (val) {
        this.setPointInfoDrawer(val)
      }
    },
    description: {
      get () {
        return this.selectedPointFeature?.properties?.description || ''
      },
      set (val) {
        this.$store.commit('updateSelectedPointDescription', val)
      }
    },
    creator () {
      return this.selectedPointFeature?.properties?.createdBy || '不明'
    },
    timestamp () {
      return new Date(this.selectedPointFeature?.properties?.createdAt || 0).toLocaleString()
    }
  },
  methods: {
    ...mapMutations([
      'setPointInfoDrawer',
      'saveSelectedPointFeature',
      'removePointFeature', // ここに追加
    ]),
    save () {
      this.saveSelectedPointFeature()
      console.log('保存前の features:', this.$store.state.groupGeojson.features)
      this.$store.dispatch('saveSelectedPointToFirestore')
      this.close()
    },
    removeAll () {
      if (!this.$store.state.groupId) {
        alert('グループに参加していないと削除できません')
        return;
      }
      if (!confirm("全削除しますか？")) {
        return
      }
      deleteAllPoints(this.$store.state.groupId)
      this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました')
      this.close()
    },
    async remove() {
      const id = this.selectedPointFeature?.properties?.id;
      if (!id) {
        console.warn('削除対象のIDがありません');
        return;
      }

      // ここに1行追加
      console.log('現在の状態:', { features: this.$store.state.groupGeojson.features, groupId: this.$store.state.currentGroupId, layerId: this.$store.state.selectedLayerId });
      console.log('削除対象のID:', id);
      console.log('現在のfeatures:', this.$store.state.groupGeojson.features);
      const index = this.$store.state.groupGeojson.features.findIndex(f => f.properties?.id === id);
      console.log('削除対象のindex:', index);
      console.log('削除対象のindex:', index);
      console.log('削除対象のID:', id);
      console.log('現在のfeatures:', this.$store.state.groupGeojson.features);
alert(id)
      if (index !== -1) {
        // Vuex ミューテーションで削除
        this.removePointFeature(id);
        await this.$store.dispatch('saveSelectedPointToFirestore');
        this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました');
      } else {
        console.warn('削除対象が見つかりませんでした');
      }
      this.close();
    },
    close () {
      this.setPointInfoDrawer(false)
    }
  }
}
</script>

<style scoped>
.point-info-drawer {
  z-index: 2500;
}
</style>
