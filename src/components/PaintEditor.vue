<template>
  <v-app>
  <div class="paint-editor">

    <h4>ポイント設定</h4>
    <div class="mb-4">
      <span class="label-span">半径</span>
      <input
          class="range-input"
          type="range"
          min="1"
          max="20"
          v-model.number="circle['circle-radius']"
          @input="apply"
      />
      <span class="val-span">
      {{ local.circle['circle-radius'] }}</span>
      <!--      <input type="color" v-model="circle['circle-color']" @input="apply"/>-->
      <ColorPickerButton v-model="circle['circle-color']" @update:modelValue="apply"/>

    </div>
    <hr>
    <h4 style="margin-bottom: 10px;">ラベル設定</h4>
    <div class="mb-4">
      <v-select v-model="symbol['text-field']"
                :items="s_propnames"
                label="列を選択してください"
                outlined
                @update:modelValue="apply"
      ></v-select>
      <span class="label-span">サイズ</span>
      <input
          class="range-input"
          type="range"
          min="8"
          max="32"
          v-model.number="symbol['text-size']"
          @input="apply"
      />
      <span class="val-span">{{ symbol['text-size'] }}</span>
      <ColorPickerButton v-model="symbol['text-color']" @update:modelValue="apply"/>

    </div>
    <hr>
    <v-btn @click="apply">サーバーに保存</v-btn>

  </div>
  </v-app>
</template>

<script>
import {getNextZIndex} from "@/js/downLoad";
import ColorPickerButton from '@/components/ColorPickerButton'


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
  components: { ColorPickerButton },
  data() {
    const defaultPaint = {
      circle: {
        'circle-radius': 5,
        'circle-color': 'black',
        'circle-stroke-width': 1,
        'circle-stroke-color': 'white'
      },
      symbol: {
        'text-field': [],
        'text-size': 12,
        'text-color': '#000000'
      }
    };
    const paint = {
      circle: { ...defaultPaint.circle, ...(this.initialPaint.circle || {}) },
      symbol: { ...defaultPaint.symbol, ...(this.initialPaint.symbol || {}) }
    };
    return {
      menu: false,
      local: paint,
      label: '',
      circle: {
        'circle-radius': 5,
        'circle-color': 'black',
        'circle-stroke-width': 1,
        'circle-stroke-color': 'white'
      },
      symbol: {
        'text-field': [],
        'text-size': 12,
        'text-color': '#000000'
      }
    };
  },
  computed: {
    s_propnames () {
      console.log(this.$store.state.propnames)
      return this.$store.state.propnames
    },
  },
  methods: {
    aaa() {
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll('.v-overlay').forEach(elm => {
            elm.style.zIndex = getNextZIndex()
          });
        },30)
      });
    },
    apply() {

      // oh-pmtiles-93-point-layer

      const pointLaiyrId = `oh-pmtiles-${this.id}-point-layer`
      const labelLaiyrId = `oh-pmtiles-${this.id}-label-layer`
      const maps = [this.$store.state.map01, this.$store.state.map02]

      // const paint = {
      //   circle: { ...this.local.circle },
      //   symbol: { ...this.local.symbol }
      // };

      Object.entries(this.circle).forEach(([prop, val]) => {
        console.log(prop,val)
        maps.forEach(map => {
          map.setPaintProperty(pointLaiyrId, prop, val)
        })
      })

      // Symbol 設定反映
      // alert( this.local.symbol['text-size'])
      maps.forEach(map => {
        map.setLayoutProperty(
            labelLaiyrId,
            'text-field',
            ['get', this.symbol['text-field']]
        )
        map.setLayoutProperty(
            labelLaiyrId,
            'text-size',
            this.symbol['text-size']
        )
        map.setPaintProperty(
            labelLaiyrId,
            'text-color',
            this.symbol['text-color']
        )

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
  width: 50%;
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
