<template>
  <div class="paint-editor">
    <h3>Circle 設定</h3>
    <label>
      半径 (circle-radius):
      <input
          type="range"
          min="1"
          max="20"
          v-model.number="local.circle['circle-radius']"
      />
      {{ local.circle['circle-radius'] }}
    </label>
    <label>
      塗り色 (circle-color):
      <input type="color" v-model="local.circle['circle-color']" />
    </label>
    <label>
      枠線幅 (circle-stroke-width):
      <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          v-model.number="local.circle['circle-stroke-width']"
      />
      {{ local.circle['circle-stroke-width'] }}
    </label>
    <label>
      枠線色 (circle-stroke-color):
      <input type="color" v-model="local.circle['circle-stroke-color']" />
    </label>

    <h3>ラベル (Symbol) 設定</h3>
    <label>
      テキスト (text-field):
      <input
          type="text"
          v-model="local.symbol['text-field']"
          placeholder="例: ['get','name']"
      />
    </label>
    <label>
      サイズ (text-size):
      <input
          type="range"
          min="8"
          max="32"
          v-model.number="local.symbol['text-size']"
      />
      {{ local.symbol['text-size'] }}
    </label>
    <label>
      文字色 (text-color):
      <input type="color" v-model="local.symbol['text-color']" />
    </label>

    <button @click="apply">適用</button>
  </div>
</template>

<script>
export default {
  name: 'PaintEditor',
  props: {
    initialPaint: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    // デフォルト設定
    const defaultPaint = {
      circle: {
        'circle-radius': 5,
        'circle-color': '#ff0000',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#000000'
      },
      symbol: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-color': '#000000'
      }
    }
    // 初期値とマージ
    const paint = {
      circle: { ...defaultPaint.circle, ...(this.initialPaint.circle || {}) },
      symbol: { ...defaultPaint.symbol, ...(this.initialPaint.symbol || {}) }
    }
    return {
      local: paint
    }
  },
  watch: {
    local: {
      handler() {
        this.$emit('update:paint', {
          circle: { ...this.local.circle },
          symbol: { ...this.local.symbol }
        });
      },
      deep: true
    }
  },
  methods: {
    apply() {
      this.$emit('update:paint', {
        circle: { ...this.local.circle },
        symbol: { ...this.local.symbol }
      });
    }
  }
}
</script>

<style scoped>
.paint-editor {
  padding: 1em;
  border: 1px solid #ccc;
}
.paint-editor h3 {
  margin-top: 1em;
}
.paint-editor label {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0.5em 0;
}
.paint-editor button {
  margin-top: 1em;
  padding: 0.5em 1em;
}
</style>
