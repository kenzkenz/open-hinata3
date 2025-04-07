<template>
  <v-card>
    <!-- タブ -->
    <v-tabs
        v-model="currentTab"
        background-color="primary"
        dark
        show-arrows
    >
      <v-tab
          v-for="(layer, index) in pointLayers"
          :key="layer.id"
      >
        {{ layer.name }}
      </v-tab>

      <!-- 追加ボタン -->
      <v-tab @click="addLayer">
        <v-icon small>mdi-plus</v-icon>
      </v-tab>
    </v-tabs>

    <!-- 各タブごとの中身 -->
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
          <v-btn small color="error" class="mt-4" @click="removeLayer(layer.id)">このレイヤーを削除</v-btn>
        </v-card>
      </v-tab-item>
    </v-tabs-items>
  </v-card>
</template>
