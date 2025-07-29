<template>
  <div class="paint-editor">

    <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">
      <v-tab value="point">ポイント</v-tab>
      <v-tab value="polygon">ポリゴン</v-tab>
      <v-tab value="line">ライン</v-tab>
    </v-tabs>
<!--    <hr>-->
    <v-window v-model="tab" style="margin-top: 20px;">
      <v-window-item value="point">
        <v-card>
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
            <span class="val-span">{{ circle['circle-radius'] }}</span>
            <!--            <input type="color" v-model="circle['circle-color']" @input="apply"/>-->
            <ColorPickerButton
                :value="circle['circle-color']"
                @change="val => { circle['circle-color'] = val; apply(); }"
            />
          </div>
<!--          <hr>-->
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
        </v-card>
      </v-window-item>
      <v-window-item value="polygon">
        <h4>ポリゴン設定</h4>
        <div class="mb-4" style="margin-top: 10px; padding-left: 10px;">
          ポリゴン内
          <ColorPickerButton
              :value="polygon['fill-color']"
              @change="val => { polygon['fill-color'] = val; apply(); }"
          />
          <br>
          ポリゴン枠
          <ColorPickerButton
              :value="polygon['line-color']"
              @change="val => { polygon['line-color'] = val; apply(); }"
          />
          <input
              style="width: 30%"
              class="range-input"
              type="range"
              min="1"
              max="20"
              v-model.number="polygon['line-width']"
              @input="apply"
          />
          <span class="val-span">{{ polygon['line-width'] }}</span>
        </div>
        <h4>ラベル設定</h4>
        <div class="mb-4" style="margin-top: 10px; padding-left: 10px;">
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
          <ColorPickerButton
              :value="symbol['text-color']"
              @change="val => { symbol['text-color'] = val; apply(); }"
          />
        </div>
        <h4>頂点設定</h4>
        <div class="mb-4" style="margin-top: 10px; padding-left: 10px;">
          <span class="label-span">半径</span>
          <input
              class="range-input"
              type="range"
              min="0"
              max="20"
              v-model.number="polygon['circle-radius']"
              @input="apply"
          />
          <span class="val-span">{{ polygon['circle-radius'] }}</span>
          <ColorPickerButton
              :value="polygon['circle-color']"
              @change="val => { polygon['circle-color'] = val; apply(); }"
          />
        </div>
      </v-window-item>
      <v-window-item  value="line">
        <p style="color: deeppink; margin-top: 20px; margin-bottom: 100px;">ラインは未作成です。</p>

      </v-window-item>
    </v-window>
    <hr>
    <v-btn @click="save">サーバーに保存</v-btn>

  </div>
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
        'text-size': 15,
        'text-color': '#000000'
      },
      polygon: {
        'fill-color': 'rgba(0,0,0,0.2)',
        'line-color': 'blue',
        'line-width': 1,
        'circle-radius': 0,
        'circle-color': 'red'
      },
      line: {
        'line-color': 'blue',
        'line-width': 1
      },
    };
    return {
      tab: 'point',
      menu: false,
      label: '',
      circle: { ...JSON.parse(JSON.stringify(defaultPaint)).circle},
      symbol: { ...JSON.parse(JSON.stringify(defaultPaint)).symbol},
      polygon: { ...JSON.parse(JSON.stringify(defaultPaint)).polygon},
      line: { ...JSON.parse(JSON.stringify(defaultPaint)).line},
      defaultCircle: { ...JSON.parse(JSON.stringify(defaultPaint)).circle},
      defaultSymbol: { ...JSON.parse(JSON.stringify(defaultPaint)).symbol},
      defaultPolygon: { ...JSON.parse(JSON.stringify(defaultPaint)).polygon},
      defaultLine: { ...JSON.parse(JSON.stringify(defaultPaint)).line},
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
      return this.$store.state.propnames || []
    },
  },
  methods: {
    save() {
      const vm = this
      const style = {
        circle: { ...this.circle },
        symbol: { ...this.symbol },
        polygon: { ...this.polygon },
        line: { ...this.line },
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
      const polygonLaiyrId = `oh-pmtiles-${this.id}-layer`
      const vertexLaiyrId = `oh-pmtiles-${this.id}-vertex-layer`
      const polygonLineLaiyrId = `oh-pmtiles-${this.id}-line-layer`

      const maps = [this.$store.state.map01, this.$store.state.map02]
      Object.entries(this.circle).forEach(([prop, val]) => {
        maps.forEach(map => {
          if (val) {
            map.setPaintProperty(pointLaiyrId, prop, val)
          }
        })
      })
      maps.forEach(map => {
        // Symbol 設定反映
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
        map.setPaintProperty(
            polygonLaiyrId,
            'fill-color',
            this.polygon['fill-color']
        )
        map.setPaintProperty(
            vertexLaiyrId,
            'circle-radius', [
              'interpolate',
              ['linear'],
              ['zoom'],
              15, 0,
              18, this.polygon['circle-radius']
            ]);
        map.setPaintProperty(
            vertexLaiyrId,
            'circle-color',
            this.polygon['circle-color']
        )
        map.setPaintProperty(
            polygonLineLaiyrId,
            'line-color',
            this.polygon['line-color']
        )
        map.setPaintProperty(
            polygonLineLaiyrId,
            'line-width',
            this.polygon['line-width']
        )

      })
    },
    updateStyle() {
      this.symbol['text-field'] = this.s_pmtilesLabel
      if (this.s_pmtilesStyle) {
        this.circle = this.s_pmtilesStyle.circle || this.defaultCircle
        this.symbol = this.s_pmtilesStyle.symbol || this.defaultSymbol
        this.polygon = this.s_pmtilesStyle.polygon || this.defaultPolygon
        this.line = this.s_pmtilesStyle.line || this.defaultLine

        console.log(this.s_pmtilesStyle)
        setTimeout(() => {
          this.apply()
        }, 100)
      } else {
        this.circle = this.defaultCircle
        this.symbol = this.defaultSymbol
        this.polygon = this.defaultPolygon
        this.line = this.defaultLine
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
  padding: 0 15px 15px 15px;
}
.range-input {
  width: 35%;
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
.custom-tabs {
  min-width: auto;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 10px;
  position: relative;
}
.custom-tabs .v-tab {
  min-width: 60px; /* タブの最小幅を狭く */
  padding: 5px 8px; /* 余白を小さく */
  font-size: 14px; /* フォントサイズを小さく */
}
</style>
