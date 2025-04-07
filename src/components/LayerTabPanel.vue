<template>
  <v-dialog v-model="dialogVisible" max-width="400" persistent transition="dialog-right-transition">
    <v-card>
      <v-card-title>
        ポイントレイヤー管理
      </v-card-title>

      <v-card-text>
        <v-tabs mobile-breakpoint="0" v-model="currentTab">
          <v-tab
              v-for="layer in pointLayers"
              :key="layer.id"
              :value="layer.id"
              @click="selectLayer(layer.id)"
          >
            {{ layer.name }}
          </v-tab>
          <v-tab @click="addLayer">
            <v-icon small>mdi-plus</v-icon>
          </v-tab>
        </v-tabs>

        <v-window v-model="currentPointLayerId">
          <v-window-item
              v-for="layer in pointLayers"
              :key="layer.id"
              :value="layer.id"
          >
            <v-text-field
                v-model="layer.name"
                label="レイヤー名"
                dense
                class="mt-3"
            />
            <v-checkbox
                v-model="layer.visible"
                label="このレイヤーを表示"
                class="mt-2"
            />
            <v-btn small color="error" class="mt-2" @click="removeLayer(layer.id)">
              削除
            </v-btn>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialogVisible = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'LayerTabPanel',
  data () {
    return {
      dialogVisible: true
    }
  },
  computed: {
    ...mapState([
      'pointLayers',
      'currentPointLayerId'
    ]),
    currentTab: {
      get () {
        return this.currentPointLayerId
      },
      set (val) {
        this.setCurrentPointLayerId(val)
      }
    }
  },
  methods: {
    ...mapMutations([
      'addPointLayer',
      'removePointLayer',
      'setCurrentPointLayerId'
    ]),
    addLayer () {
      const nextIndex = this.pointLayers.length + 1
      this.addPointLayer({
        id: `layer${nextIndex}`,
        name: `レイヤー${nextIndex}`,
        color: '#ff0000',
        visible: true,
        features: []
      })
    },
    removeLayer (id) {
      this.removePointLayer(id)
    },
    selectLayer (id) {
      this.setCurrentPointLayerId(id)
    }
  }
}
</script>

<style scoped>
.my-v-window {
  padding: 16px;
}
</style>




<!--<template>-->
<!--  <v-dialog v-model="dialogVisible" max-width="500px" height="500px">-->
<!--    <v-card>-->
<!--      <v-card-title>-->
<!--        レイヤー管理-->
<!--      </v-card-title>-->

<!--      <v-card-text>-->
<!--        <v-tabs-->
<!--            v-model="currentTabId"-->
<!--            mobile-breakpoint="0"-->
<!--            background-color="primary"-->
<!--            show-arrows-->
<!--            dark-->
<!--        >-->
<!--          <v-tab-->
<!--              v-for="layer in pointLayers"-->
<!--              :key="layer.id"-->
<!--              :value="layer.id"-->
<!--          >-->
<!--            {{ layer.name }}-->
<!--          </v-tab>-->
<!--          <v-tab @click="addLayer">-->
<!--            <v-icon small>mdi-plus</v-icon>-->
<!--          </v-tab>-->
<!--        </v-tabs>-->

<!--        <v-window v-model="currentTabId">-->
<!--          <v-window-item-->
<!--              v-for="layer in pointLayers"-->
<!--              :key="layer.id"-->
<!--              :value="layer.id"-->
<!--              class="pa-3"-->
<!--          >-->
<!--            <v-text-field-->
<!--                v-model="layer.name"-->
<!--                label="レイヤー名"-->
<!--                dense-->
<!--            />-->
<!--            <v-checkbox-->
<!--                v-model="layer.visible"-->
<!--                label="このレイヤーを表示"-->
<!--                class="mt-2"-->
<!--            />-->
<!--            <v-btn small color="error" @click="removeLayer(layer.id)">-->
<!--              削除-->
<!--            </v-btn>-->
<!--          </v-window-item>-->
<!--        </v-window>-->
<!--      </v-card-text>-->

<!--      <v-card-actions>-->
<!--        <v-spacer />-->
<!--        <v-btn color="blue-darken-1" text @click="dialogVisible = false">閉じる</v-btn>-->
<!--      </v-card-actions>-->
<!--    </v-card>-->
<!--  </v-dialog>-->
<!--</template>-->

<!--<script>-->
<!--import { mapState, mapMutations } from 'vuex'-->

<!--export default {-->
<!--  name: 'LayerTabPanel',-->
<!--  data () {-->
<!--    return {-->
<!--      dialogVisible: true-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    ...mapState(['pointLayers', 'currentPointLayerId']),-->
<!--    currentTabId: {-->
<!--      get () {-->
<!--        return this.currentPointLayerId-->
<!--      },-->
<!--      set (val) {-->
<!--        this.setCurrentPointLayerId(val)-->
<!--      }-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'addPointLayer',-->
<!--      'removePointLayer',-->
<!--      'setCurrentPointLayerId'-->
<!--    ]),-->
<!--    addLayer () {-->
<!--      this.addPointLayer()-->
<!--    },-->
<!--    removeLayer (id) {-->
<!--      this.removePointLayer(id)-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->
