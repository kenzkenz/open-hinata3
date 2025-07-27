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
      {{ circle['circle-radius'] }}</span>
      <!--            <input type="color" v-model="circle['circle-color']" @input="apply"/>-->
      <ColorPickerButton
          :value="circle['circle-color']"
          @change="val => { circle['circle-color'] = val; apply(); }"
      />

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
      <!--      <ColorPickerButton v-model="symbol['text-color']" @update:modelValue="apply"/>-->
      <ColorPickerButton
          :value="symbol['text-color']"
          @change="val => { symbol['text-color'] = val; apply(); }"
      />
    </div>
    <hr>
    <v-btn @click="save">サーバーに保存</v-btn>

  </div>
  </v-app>
</template>

<script>
import ColorPickerButton from '@/components/ColorPickerButton'
import axios from "axios";

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
    // const paint = {
    //   circle: { ...defaultPaint.circle, ...(this.initialPaint.circle || {}) },
    //   symbol: { ...defaultPaint.symbol, ...(this.initialPaint.symbol || {}) }
    // };
    return {
      menu: false,
      // local: paint,
      label: '',
      circle: { ...JSON.parse(JSON.stringify(defaultPaint)).circle},
      symbol: { ...JSON.parse(JSON.stringify(defaultPaint)).symbol},
      defaultCircle: { ...JSON.parse(JSON.stringify(defaultPaint)).circle},
      defaultSymbol: { ...JSON.parse(JSON.stringify(defaultPaint)).symbol}
      // circle: {
      //   'circle-radius': 5,
      //   'circle-color': 'black',
      //   'circle-stroke-width': 1,
      //   'circle-stroke-color': 'white'
      // },
      // symbol: {
      //   'text-field': [],
      //   'text-size': 12,
      //   'text-color': '#000000'
      // }
    };
  },
  computed: {
    s_pmtilesStyle () {
      return this.$store.state.pmtilesStyle
    },
    s_pmtilesLabel () {
      return this.$store.state.pmtilesLabel
    },
    s_propnames () {
      return this.$store.state.propnames
    },
  },
  methods: {
    save() {
      const vm = this
      const style = {
        circle: { ...this.circle },
        symbol: { ...this.symbol }
      };
      console.log(style)
      console.log(vm.symbol['text-field'])
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtiles0StyleUpdate.php',{
        params: {
          id: this.id,
          label: vm.symbol['text-field'] || '',
          style: JSON.stringify(style),
        }
      }).then(function (response) {
        console.log(response)
        if (response.data.success) {
          vm.$store.state.snackbarForGroup = true
          vm.$store.state.snackbarForGroupText = '保存に成功しました'
          vm.$store.state.fetchImagesFire = !vm.$store.state.fetchImagesFire
        } else {
          alert('保存失敗！')
        }
      })
    },
    apply() {
      // oh-pmtiles-93-point-layer
      const pointLaiyrId = `oh-pmtiles-${this.id}-point-layer`
      const labelLaiyrId = `oh-pmtiles-${this.id}-label-layer`
      const maps = [this.$store.state.map01, this.$store.state.map02]

      Object.entries(this.circle).forEach(([prop, val]) => {
        maps.forEach(map => {
          if (val) {
            console.log(prop,val)
            map.setPaintProperty(pointLaiyrId, prop, val)
          }
        })
      })
      // Symbol 設定反映
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
    },
    updateStyle() {
      this.symbol['text-field'] = this.s_pmtilesLabel
      if (this.s_pmtilesStyle) {
        this.circle = this.s_pmtilesStyle.circle
        this.symbol = this.s_pmtilesStyle.symbol
        console.log(this.s_pmtilesStyle)
        setTimeout(() => {
          this.apply()
        }, 100)
      } else {
        this.circle = this.defaultCircle
        this.symbol = this.defaultSymbol
        setTimeout(() => {
          this.apply()
        }, 100)
      }

    },
  },
  watch: {
    s_pmtilesStyle: 'updateStyle',
    s_pmtilesLabel: 'updateStyle'
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
