<template>
  <v-navigation-drawer
      v-model="showPointInfoDrawer"
      right
      temporary
      width="400"
      class="point-info-drawer"
  >
    <v-card flat>
      <v-card-title class="text-h6">
        ポイント情報
      </v-card-title>
      <v-card-text>
        <v-textarea
            v-model="description"
            label="説明（最大500文字）"
            :counter="500"
            auto-grow
            rows="4"
        />
        <div class="mt-2 text-caption text-right">
          作成者: {{ creator }}<br />
          日時: {{ timestamp }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn color="error" @click="remove">削除</v-btn>
        <v-spacer />
        <v-btn color="primary" @click="save">保存</v-btn>
        <v-btn text @click="close">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'PointInfoDrawer',
  computed: {
    ...mapState([
      'showPointInfoDrawer',
      'selectedPointFeature'
    ]),
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
      'saveSelectedPointFeature'
    ]),
    save () {
      this.saveSelectedPointFeature()
      console.log('保存前の features:', this.$store.state.groupGeojson.features)
      this.$store.dispatch('saveSelectedPointToFirestore')  // ← Firestoreへ保存
      this.close()
    },
    remove () {
      const id = this.selectedPointFeature?.properties?.id
      console.log('🧩 選択された feature ID:', id)

      if (!id) {
        console.warn('❌ ID が存在しないため削除中止')
        return
      }

      const features = this.$store.state.groupGeojson.features
      console.log('🔍 現在の features:', features.map(f => f.properties?.id))

      const index = features.findIndex(f => f.properties?.id === id)
      console.log('📌 該当 feature の index:', index)

      if (index !== -1) {
        features.splice(index, 1)
        // this.$store.dispatch('saveSelectedPointToFirestore')
        this.$store.dispatch('saveSelectedPointToFirestore', JSON.parse(JSON.stringify(this.$store.state.groupGeojson)))
        this.$store.commit('showSnackbarForGroup', '🗑️ ポイントを削除しました')
      } else {
        console.warn('❗ 削除対象が見つかりませんでした')
      }

      this.close()
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
