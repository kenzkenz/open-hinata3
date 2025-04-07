<template>
  <v-card>
    <v-tabs
        v-model="currentTab"
        background-color="primary"
        show-arrows
        dark
    >
      <v-tab
          v-for="(layer, index) in pointLayers"
          :key="layer.id"
          @click="selectLayer(layer.id)"
      >
        {{ layer.name }}
      </v-tab>
      <v-tab @click="addLayer">
        <v-icon small>mdi-plus</v-icon>
      </v-tab>
    </v-tabs>

    <v-tabs-items v-model="currentTab">
      <v-tab-item
          v-for="(layer, index) in pointLayers"
          :key="layer.id"
      >
        <v-card flat class="pa-3">
          <v-text-field
              v-model="layer.name"
              label="レイヤー名"
              dense
          />
          <v-color-picker
              v-model="layer.color"
              hide-canvas
              show-swatches
              swatches-max-height="150"
              dot-size="20"
              class="mt-3"
          />
          <v-checkbox
              v-model="layer.visible"
              label="このレイヤーを表示"
              class="mt-2"
          />
          <v-btn small color="error" @click="removeLayer(layer.id)">削除</v-btn>
        </v-card>
      </v-tab-item>
    </v-tabs-items>
  </v-card>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'LayerTabPanel',
  computed: {
    ...mapState([
      'pointLayers',
      'currentPointLayerId'
    ]),
    currentTab: {
      get () {
        return this.pointLayers.findIndex(l => l.id === this.currentPointLayerId)
      },
      set (index) {
        const id = this.pointLayers[index]?.id
        if (id) this.setCurrentPointLayerId(id)
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
      this.addPointLayer()
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







<!--<template>-->
<!--  <v-card>-->
<!--    &lt;!&ndash; タブ &ndash;&gt;-->
<!--    <v-tabs-->
<!--        v-model="currentTab"-->
<!--        background-color="primary"-->
<!--        dark-->
<!--        show-arrows-->
<!--    >-->
<!--      <v-tab-->
<!--          v-for="(layer, index) in pointLayers"-->
<!--          :key="layer.id"-->
<!--      >-->
<!--        {{ layer.name }}-->
<!--      </v-tab>-->

<!--      &lt;!&ndash; 追加ボタン &ndash;&gt;-->
<!--      <v-tab @click="addLayer">-->
<!--        <v-icon small>mdi-plus</v-icon>-->
<!--      </v-tab>-->
<!--    </v-tabs>-->

<!--    &lt;!&ndash; 各タブごとの中身 &ndash;&gt;-->
<!--    <v-tabs-items v-model="currentTab">-->
<!--      <v-tab-item-->
<!--          v-for="(layer, index) in pointLayers"-->
<!--          :key="layer.id"-->
<!--      >-->
<!--        <v-card flat class="pa-3">-->
<!--          <v-text-field-->
<!--              v-model="layer.name"-->
<!--              label="レイヤー名"-->
<!--              dense-->
<!--          />-->
<!--          <v-color-picker-->
<!--              v-model="layer.color"-->
<!--              hide-canvas-->
<!--              show-swatches-->
<!--              swatches-max-height="150"-->
<!--              dot-size="20"-->
<!--              class="mt-3"-->
<!--          />-->
<!--          <v-checkbox-->
<!--              v-model="layer.visible"-->
<!--              label="このレイヤーを表示"-->
<!--              class="mt-2"-->
<!--          />-->
<!--          <v-btn small color="error" class="mt-4" @click="removeLayer(layer.id)">このレイヤーを削除</v-btn>-->
<!--        </v-card>-->
<!--      </v-tab-item>-->
<!--    </v-tabs-items>-->
<!--  </v-card>-->
<!--</template>-->
