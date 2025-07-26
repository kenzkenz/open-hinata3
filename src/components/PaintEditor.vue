<template>
  <div class="paint-editor">
    <h4>ポイント設定</h4>
    <div class="mb-4">
      <span class="label-span">半径</span>
      <input
          class="range-input"
          type="range"
          min="1"
          max="20"
          v-model.number="local.circle['circle-radius']"
          @input="apply"
      />
      <span class="val-span">
      {{ local.circle['circle-radius'] }}</span>
      <input type="color" v-model="local.circle['circle-color']" @input="apply"/>
    </div>
<!--    <div class="mb-4">-->
<!--      枠線幅 (circle-stroke-width):-->
<!--      <input-->
<!--          type="range"-->
<!--          min="0"-->
<!--          max="5"-->
<!--          step="0.5"-->
<!--          v-model.number="local.circle['circle-stroke-width']"-->
<!--      />-->
<!--      {{ local.circle['circle-stroke-width'] }}-->
<!--    </div>-->
<!--    <div class="mb-4">-->
<!--      枠線色 (circle-stroke-color):-->
<!--      <input type="color" v-model="local.circle['circle-stroke-color']" />-->
<!--    </div>-->
    <hr>
    <h4>ラベル設定</h4>
    <div class="mb-4">
      <span class="label-span">列選択</span>
      <input
          type="text"
          v-model="local.symbol['text-field']"
          placeholder="例: ['get','name']"
      />
      <br>
      <span class="label-span">サイズ</span>
      <input
          class="range-input"
          type="range"
          min="8"
          max="32"
          v-model.number="local.symbol['text-size']"
      />
      <span class="val-span">{{ local.symbol['text-size'] }}</span>
      <input type="color" v-model="local.symbol['text-color']" />
    </div>

    <v-btn @click="apply">サーバーに保存</v-btn>

  </div>

</template>

<script>
export default {
  name: 'PaintEditor',
  props: {
    initialPaint: {
      type: Object,
      default: () => ({})
    },
    id: {
      type: Number
    },
    // メソッドを外部から渡せるようにFunction型プロップを追加
    applyMethod: {
      type: Function,
      default: null
    }
  },
  data() {
    const defaultPaint = {
      circle: {
        'circle-radius': 5,
        'circle-color': 'black',
        'circle-stroke-width': 1,
        'circle-stroke-color': 'white'
      },
      symbol: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-color': '#000000'
      }
    };
    const paint = {
      circle: { ...defaultPaint.circle, ...(this.initialPaint.circle || {}) },
      symbol: { ...defaultPaint.symbol, ...(this.initialPaint.symbol || {}) }
    };
    return {
      local: paint
    };
  },
  methods: {
    apply() {

      // oh-pmtiles-93-point-layer

      const laiyrId = `oh-pmtiles-${this.id}-point-layer`
      const maps = [this.$store.state.map01, this.$store.state.map02]

      const paint = {
        circle: { ...this.local.circle },
        symbol: { ...this.local.symbol }
      };

      Object.entries(this.local.circle).forEach(([prop, val]) => {
        console.log(prop,val)
        maps.forEach(map => {
          map.setPaintProperty(laiyrId, prop, val)
        })
      })

      // // 外部から渡されたメソッドがあれば実行
      // if (this.applyMethod) {
      //   this.applyMethod(this.id, paint);
      // }
      // // イベントもエミット
      // this.$emit('update:paint', paint);
    }
  }
};
</script>

<style scoped>
.paint-editor {
  padding: 1em;
}
.paint-editor h3 {
  margin-top: 1em;
}
.paint-editor label {
  /*display: flex;*/
  /*align-items: center;*/
  /*gap: 0.5em;*/
  /*margin: 0.5em 0;*/
}
.paint-editor button {
  margin-top: 1em;
  padding: 0.5em 1em;
}
.range-input {
  width: 60%;
  position: relative;
  top: 8px;
}
.label-span{
  display: inline-block;
  width: 50px;
  text-align: center;
  margin: 0 5px;
}
.val-span{
  display: inline-block;
  width: 20px;
  text-align: center;
  margin: 0 5px;
}
hr {
  margin-bottom: 20px;
}
</style>
