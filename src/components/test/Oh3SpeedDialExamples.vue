
<!-- ===================== v-speed-dial Deep Dive ===================== -->
<!-- Oh3SpeedDialExamples.vue（JS版：TypeScript不要） -->
<template>
  <div class="pa-4">
    <v-row>
      <!-- A) 画面右下に固定するグローバルFAB -->
      <v-col cols="12" md="6">
        <v-card variant="tonal" class="pa-4">
          <v-card-title class="text-subtitle-1">v-speed-dial — 基本（固定FAB）</v-card-title>
          <v-card-text>
            <div class="oh-fab-fixed">
              <v-speed-dial :model-value="openA" @update:model-value="openA = $event" transition="scale-transition">
                <template #activator="{ props }">
                  <v-btn v-bind="props" color="primary" icon="mdi-plus" :aria-label="openA ? '閉じる' : '開く'" size="large" elevation="10" />
                </template>
                <v-btn icon="mdi-map-marker-plus" :title="'ポイント追加'" @click="emit('add-point')" />
                <v-btn icon="mdi-draw" :title="'ポリゴン描画'" @click="emit('start-draw-polygon')" />
                <v-btn icon="mdi-image-multiple" :title="'Mapillary'" @click="emit('open-mapillary')" />
                <v-btn icon="mdi-layers-outline" :title="'レイヤー'" @click="emit('open-layer-panel')" />
              </v-speed-dial>
            </div>
            <div class="text-caption mt-2">※ 位置はCSS（fixed + bottom/right）で制御、重なりは z-index で調整</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- B) 選択フィーチャの近くに追従するコンテキストFAB（アニメ移動対応） -->
      <v-col cols="12" md="6">
        <v-card variant="tonal" class="pa-4">
          <v-card-title class="text-subtitle-1">v-speed-dial — コンテキスト追従（アニメ移動）</v-card-title>
          <v-card-text>
            <div class="oh-fab-context" :style="contextStyle">
              <v-speed-dial :model-value="openB" @update:model-value="openB = $event" transition="scale-transition">
                <template #activator="{ props }">
                  <v-btn v-bind="props" color="secondary" icon="mdi-crosshairs-gps" size="large" elevation="10" />
                </template>
                <v-btn icon="mdi-magnify-plus" :title="'ズームイン'" @click="emit('zoom-in')" />
                <v-btn icon="mdi-magnify-minus" :title="'ズームアウト'" @click="emit('zoom-out')" />
                <v-btn icon="mdi-crosshairs" :title="'ここを中心に'" @click="emit('center-here')" />
              </v-speed-dial>
            </div>
            <div class="text-caption mt-2">※ マップの project() で画面座標へ変換し、CSS transform で平滑移動</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

// Props（JS版）
const props = defineProps({
  map: { type: Object, default: null }, // MapLibre GL JS インスタンス
  targetLngLat: { type: Array, default: null }, // [lng, lat]
})

// Emits（JS版）
const emit = defineEmits([
  'add-point',
  'start-draw-polygon',
  'open-mapillary',
  'open-layer-panel',
  'zoom-in',
  'zoom-out',
  'center-here',
])

// A) 固定 FAB の開閉
const openA = ref(false)

// B) 追従 FAB の開閉と位置管理
const openB = ref(false)
const anchor = ref(null)

function updateAnchor () {
  if (!props.map || !props.targetLngLat) return
  const p = props.map.project(props.targetLngLat)
  anchor.value = { x: p.x, y: p.y }
}

// マップ追従：move / zoom / rotate で更新
let offMove = null
onMounted(() => {
  if (props.map) {
    const handler = () => updateAnchor()
    props.map.on('move', handler)
    props.map.on('zoom', handler)
    props.map.on('rotate', handler)
    offMove = () => {
      props.map.off('move', handler)
      props.map.off('zoom', handler)
      props.map.off('rotate', handler)
    }
  }
  updateAnchor()
})

onBeforeUnmount(() => { if (offMove) offMove() })

watch(() => props.targetLngLat, () => updateAnchor(), { immediate: true })

const contextStyle = computed(() => {
  const M = 12 // マージン
  if (!anchor.value) return { display: 'none' }
  const mapEl = document.getElementById('map01') || document.body
  const w = mapEl.clientWidth || window.innerWidth
  const isLeftHalf = anchor.value.x <= w / 2
  const left = isLeftHalf ? anchor.value.x + M : anchor.value.x - M
  const top = anchor.value.y + M
  return {
    transform: `translate3d(${left}px, ${top}px, 0)`,
    opacity: 1,
  }
})
</script>

<style scoped>
/* 右下固定用（最前面に） */
.oh-fab-fixed { position: fixed; right: 18px; bottom: 18px; z-index: 1000; }

/* 追従用（アニメで滑らかに移動） */
.oh-fab-context {
  position: absolute;
  z-index: 1000;
  transition: transform .25s ease, opacity .2s ease;
  will-change: transform;
}
</style>
