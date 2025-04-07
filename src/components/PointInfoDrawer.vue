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



<!--<template>-->
<!--  <v-navigation-drawer-->
<!--      v-model="visible"-->
<!--      right-->
<!--      temporary-->
<!--      width="400"-->
<!--      class="point-info-drawer"-->
<!--  >-->
<!--    <v-card flat>-->
<!--      <v-card-title class="text-h6">-->
<!--        ポイント情報-->
<!--      </v-card-title>-->
<!--      <v-card-text>-->
<!--        <v-textarea-->
<!--            v-model="description"-->
<!--            label="説明（最大500文字）"-->
<!--            :counter="500"-->
<!--            auto-grow-->
<!--            rows="4"-->
<!--        />-->
<!--        <div class="mt-2 text-caption text-right">-->
<!--          作成者: {{ creator }}<br />-->
<!--          日時: {{ timestamp }}-->
<!--        </div>-->
<!--      </v-card-text>-->
<!--      <v-card-actions>-->
<!--        <v-spacer />-->
<!--        <v-btn color="primary" @click="save">保存</v-btn>-->
<!--        <v-btn text @click="close">閉じる</v-btn>-->
<!--      </v-card-actions>-->
<!--    </v-card>-->
<!--  </v-navigation-drawer>-->
<!--</template>-->

<!--<script>-->
<!--import { db } from '@/firebase'-->
<!--// import { mapState } from 'vuex'-->
<!--import { mapState, mapMutations, mapActions } from 'vuex'-->

<!--export default {-->
<!--  name: 'PointInfoDrawer',-->
<!--  computed: {-->
<!--    ...mapState([-->
<!--      'showPointInfoDrawer',-->
<!--      'selectedPointFeature'-->
<!--    ]),-->
<!--    visible: {-->
<!--      get () {-->
<!--        return this.showPointInfoDrawer-->
<!--      },-->
<!--      set (val) {-->
<!--        this.$store.commit('setPointInfoDrawer', val)-->
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
<!--      'saveSelectedPointFeature'-->
<!--    ]),-->
<!--    ...mapActions([-->
<!--      'saveSelectedPointFeatureToFirestore'-->
<!--    ]),-->
<!--    save () {-->
<!--      this.saveSelectedPointFeature()-->
<!--      console.log('保存前の features:', this.$store.state.groupGeojson.features)-->
<!--      this.$store.dispatch('saveSelectedPointToFirestore')  // ← 追加-->
<!--      this.close()-->
<!--    },-->
<!--    // async save () {-->
<!--    //   await this.saveSelectedPointFeatureToFirestore()-->
<!--    //   this.close()-->
<!--    // },-->
<!--    close () {-->
<!--      this.setPointInfoDrawer(false)-->
<!--    },-->
<!--    // save () {-->
<!--    //   this.$store.commit('saveSelectedPointFeature')-->
<!--    //   this.close()-->
<!--    // },-->
<!--    // close () {-->
<!--    //   this.visible = false-->
<!--    // }-->
<!--  }-->
<!--}-->
<!--</script>-->



<!--&lt;!&ndash;<script>&ndash;&gt;-->
<!--&lt;!&ndash;export default {&ndash;&gt;-->
<!--&lt;!&ndash;  name: 'PointInfoDrawer',&ndash;&gt;-->
<!--&lt;!&ndash;  props: {&ndash;&gt;-->
<!--&lt;!&ndash;    value: Boolean,&ndash;&gt;-->
<!--&lt;!&ndash;    feature: Object&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  data () {&ndash;&gt;-->
<!--&lt;!&ndash;    return {&ndash;&gt;-->
<!--&lt;!&ndash;      visible: this.value,&ndash;&gt;-->
<!--&lt;!&ndash;      description: this.feature?.properties?.description || '',&ndash;&gt;-->
<!--&lt;!&ndash;      creator: this.feature?.properties?.createdBy || '不明',&ndash;&gt;-->
<!--&lt;!&ndash;      timestamp: new Date(this.feature?.properties?.createdAt || 0).toLocaleString()&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  watch: {&ndash;&gt;-->
<!--&lt;!&ndash;    value (val) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.visible = val&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    visible (val) {&ndash;&gt;-->
<!--&lt;!&ndash;      this.$emit('input', val)&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  },&ndash;&gt;-->
<!--&lt;!&ndash;  methods: {&ndash;&gt;-->
<!--&lt;!&ndash;    save () {&ndash;&gt;-->
<!--&lt;!&ndash;      this.$emit('save', this.description)&ndash;&gt;-->
<!--&lt;!&ndash;      this.close()&ndash;&gt;-->
<!--&lt;!&ndash;    },&ndash;&gt;-->
<!--&lt;!&ndash;    close () {&ndash;&gt;-->
<!--&lt;!&ndash;      this.visible = false&ndash;&gt;-->
<!--&lt;!&ndash;    }&ndash;&gt;-->
<!--&lt;!&ndash;  }&ndash;&gt;-->
<!--&lt;!&ndash;}&ndash;&gt;-->
<!--&lt;!&ndash;</script>&ndash;&gt;-->

<!--<style scoped>-->
<!--.point-info-drawer {-->
<!--  z-index: 2500;-->
<!--}-->
<!--</style>-->
