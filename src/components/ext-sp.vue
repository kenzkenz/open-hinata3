<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      <v-btn class="tiny-btn" @click="reset">元に戻す</v-btn>
      <div class="container">
        <div class="input-label">最小明るさ</div><input class="color-range" type="range" v-model.number="s_brightnessMin" @change="update" @input="input" min="0" max="1" step="0.01"/>
      </div>
      <div class="container">
        <div class="input-label">最大明るさ</div><input class="color-range" type="range" v-model.number="s_brightnessMax" @change="update" @input="input" min="0" max="1" step="0.01"/>
      </div>
      <div class="container">
        <div class="input-label">色相</div><input class="color-range" type="range" v-model.number="s_hueRotate" @change="update" @input="input" min="0" max="360" step="1"/><br>
      </div>
      <div class="container">
        <div class="input-label">コントラスト</div><input class="color-range" type="range" v-model.number="s_contrast" @change="update" @input="input" min="0" max="0.99" step="0.01"/><br>
      </div>
      <div class="container">
        <div class="input-label">彩度</div><input class="color-range" type="range" v-model.number="s_saturation" @change="update" @input="input" min="0" max="1" step="0.01"/><br>
      </div>
    </div>
</template>

<script>
export default {
  name: 'ext-sp',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_brightnessMin: {
      get() {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].brightnessMin
      },
      set(value) {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].brightnessMin = value
      }
    },
    s_brightnessMax: {
      get() {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].brightnessMax
      },
      set(value) {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].brightnessMax = value
      }
    },
    s_hueRotate: {
      get() {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].hueRotate
      },
      set(value) {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].hueRotate = value
      }
    },
    s_contrast: {
      get() {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].contrast
      },
      set(value) {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].contrast = value
      }
    },
    s_saturation: {
      get() {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].saturation
      },
      set(value) {
        return this.$store.state.color[this.mapName][this.item.id.split('-')[1]].saturation = value
      }
    },
  },
  methods: {
    reset () {
      this.s_brightnessMin = 0
      this.s_brightnessMax = 1
      this.s_hueRotate = 0
      this.s_contrast = 0
      this.s_saturation = 0
      this.input()
      this.update()
    },
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_brightnessMin,
          this.s_brightnessMax,
          this.s_hueRotate,
          this.s_contrast,
          this.s_saturation
        ]})
    },
    input () {
      const vm = this
      const map = this.$store.state[this.mapName]
      function updateRasterPaintProperties(brightnessMin, brightnessMax, hueRotate, contrast, saturation) {
        console.log(vm.item.id)
        if (map.getLayer(vm.item.id)) { // レイヤーが存在することを確認
          map.setPaintProperty(vm.item.id, 'raster-brightness-min', brightnessMin)// 最小明るさ
          map.setPaintProperty(vm.item.id, 'raster-brightness-max', brightnessMax)// 最大明るさ
          map.setPaintProperty(vm.item.id, 'raster-hue-rotate', hueRotate)        // 色相（0～360)
          map.setPaintProperty(vm.item.id, 'raster-contrast', contrast)           // コントラスト
          map.setPaintProperty(vm.item.id, 'raster-saturation', saturation)       // 彩度
          // map.setPaintProperty(vm.item.id, 'raster-sharpness', 1)       // シャープネス。動かない。
        } else {
          console.error('Layer does not exist');
        }
      }
      updateRasterPaintProperties(this.s_brightnessMin,this.s_brightnessMax,this.s_hueRotate,this.s_contrast,this.s_saturation)
    },
  },
  // mounted() {
  //   this.input(this.mapName)
  // },
  watch: {
    // s_watchFlg () {
    //   this.input(this.mapName)
    // },
    s_extFire () {
      this.input(this.mapName)
    },
  }
}
</script>
<style scoped>
.container {
  display: flex; /* 子要素を横並びにする */
  gap: 10px; /* 要素間の余白を設定 */
}
.input-label {
  width: 75px;
}
.color-range {
  width: 120px;
}
.color-text {
  font-size: large;
}
</style>

