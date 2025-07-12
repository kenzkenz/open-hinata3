<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="config-div">
      <v-card>
        <v-card-text>
          <v-textarea
              v-model="s_printTitleText"
              label="タイトル"
              auto-grow
              rows="3"
              outlined
              @input="configChange('title-text',s_printTitleText)"
          />
          <v-text-field
              v-model="s_textPx"
              label="フォントサイズ"
              type="number"
              variant="outlined"
              min="0"
              max="100"
              @input="configChange('font-size',s_textPx)"
          />
          <v-select
              v-model="s_titleColor"
              :items="titleColors"
              item-title="label"
              item-value="color"
              label="色を選択してください"
              @update:modelValue="configChange('fill-color',s_titleColor)"
          />
          <v-select
              v-model="titleScale"
              :items="titleScales"
              item-title="label"
              item-value="zoom"
              label="縮尺率固定"
              @update:modelValue="setZoom()"
          />
          <v-select
              v-if="s_isPrint"
              v-model="s_titleDirection"
              :items="titleDirections"
              item-title="label"
              item-value="direction"
              label="印刷方向を選択してください"
              @update:modelValue="configChange('direction',s_titleDirection)"
          />
          <span><input checked type="checkbox" id="draw-visible-check" value=""><label for="draw-visible-check" style="font-size: 16px;"> 表示</label></span>
          <input style="width: 200px;margin-left: 10px;" type="range" min="0" max="1" step="0.01" class="range" v-model.number="drawOpacity" @input="drawOpacityInput"/>

        </v-card-text>
      </v-card>
    </div>
  </Dialog>
</template>

<script>
import {clickCircleSource, konUrls} from "@/js/layers";
import {geojsonUpdate} from "@/js/pyramid";
import {printDirectionChange} from "@/js/downLoad";
export default {
  name: 'Dialog-draw-config',
  props: ['mapName'],
  data: () => ({
    drawOpacity: 1,
    titleColors: [{color:'black',label:'黒'},{color:'red',label:'赤'},{color:'blue',label:'青'},{color:'green',label:'緑'},{color:'orange',label:'オレンジ'}],
    titleDirections: [{direction:'vertical',label:'A4縦'},{direction:'horizontal',label:'A4横'}],
    titleScale: 0,
    // titleScales: [//grokの回答
    //   {zoom: 0, label: '固定なし'},
    //   {zoom: 22.6, label: '1/250で固定'},
    //   {zoom: 21.6, label: '1/500で固定'},
    //   {zoom: 20.6, label: '1/1000で固定'},
    //   {zoom: 19.6, label: '1/2000で固定'},
    //   {zoom: 19.3, label: '1/2500で固定'},
    //   {zoom: 18.3, label: '1/5000で固定'},
    //   {zoom: 16.0, label: '1/25000で固定'},
    //   {zoom: 15.0, label: '1/50000で固定'},
    //   {zoom: 13.0, label: '1/200000で固定'},
    // ],
    titleScales: [//gptの回答
      { zoom: 0.0,  label: '固定なし'            },
      { zoom: 20.9, label: '1/250で固定'        },
      { zoom: 19.9, label: '1/500で固定'        },
      { zoom: 18.9, label: '1/1000で固定'       },
      { zoom: 17.9, label: '1/2000で固定'       },
      { zoom: 17.6, label: '1/2500で固定'       },
      { zoom: 16.6, label: '1/5000で固定'       },
      { zoom: 14.2, label: '1/25000で固定'      },
      { zoom: 13.2, label: '1/50000で固定'      },
      { zoom: 11.2, label: '1/200000で固定'     },
    ],
  }),
  computed: {
    s_dialogs () {
      return this.$store.state.dialogs.drawConfigDialog
    },
    s_isPrint: {
      get() {
        return this.$store.state.isPrint
      },
      set(value) {
        return this.$store.state.isPrint = value
      }
    },
    s_printTitleText: {
      get() {
        return this.$store.state.printTitleText
      },
      set(value) {
        return this.$store.state.printTitleText = value
      }
    },
    s_textPx: {
      get() {
        return this.$store.state.textPx
      },
      set(value) {
        return this.$store.state.textPx = value
      }
    },
    s_titleColor: {
      get() {
        return this.$store.state.titleColor
      },
      set(value) {
        return this.$store.state.titleColor = value
      }
    },
    s_titleDirection: {
      get() {
        return this.$store.state.titleDirection
      },
      set(value) {
        return this.$store.state.titleDirection = value
      }
    },
  },
  methods: {
    drawOpacityInput () {
      const map01 = this.$store.state.map01
      map01.setPaintProperty('click-circle-layer', 'fill-opacity', this.drawOpacity)
      map01.setPaintProperty('click-circle-polygon-line-layer', 'line-opacity', this.drawOpacity)
      map01.setPaintProperty('click-circle-polygon-symbol-layer', 'text-opacity', this.drawOpacity)
      map01.setPaintProperty('click-circle-polygon-symbol-area-layer', 'text-opacity', this.drawOpacity)
      map01.setPaintProperty('click-circle-line-layer', 'line-opacity', this.drawOpacity)
      map01.setPaintProperty('click-circle-keiko-line-layer', 'line-opacity', this.drawOpacity)
      map01.setPaintProperty('click-circle-label-layer', 'text-opacity', this.drawOpacity)
      // click-circle-symbol-layerは考える必要あり。opacityは使えない。
      map01.setPaintProperty('click-circle-symbol-layer', 'circle-opacity', this.drawOpacity)
      map01.setPaintProperty('arrows-endpoint-layer', 'icon-opacity', this.drawOpacity)
      map01.setPaintProperty('segment-label-layer', 'text-opacity', this.drawOpacity)
    },
    configChange (tgtProp,value) {
      console.log(tgtProp,value)
      const map01 = this.$store.state.map01
      this.$store.state.clickCircleGeojsonText = geojsonUpdate(map01, null, clickCircleSource.iD, 'config', tgtProp, value)
      if (tgtProp === 'direction') {
        this.directionChange()
      }
    },
    setZoom () {
      const map01 = this.$store.state.map01
      if (this.titleScale !== 0) {
        map01.setZoom(this.titleScale)
        this.scaleText = '縮尺：' + this.titleScales.find(t => t.zoom === this.titleScale).label.replace('で固定', '')
        map01.on('zoom', () => {
          if (map01.getZoom() !== this.titleScale && this.titleScale !== 0 && this.isPrint) {
            map01.setZoom(this.titleScale);
          }
        })
      } else {
        this.scaleText = ''
      }
    },
    directionChange() {
      printDirectionChange(this.s_titleDirection)
    }
  },
  mounted() {
    document.querySelector('#drag-handle-drawConfigDialog-map01').innerHTML = '<span style="font-size: large;">各種設定</span>'
  }
}
</script>
<style scoped>
.config-div {
  height: auto;
  width: 400px;
  margin: 10px;
  overflow: auto;
  user-select: text;
  font-size: larger;
  color: black;
  background-color: white;
  text-align: center;
}
/* スマホ用のスタイル */
@media screen and (max-width: 768px) {
  .config-div {
    width: 100%;
    margin: 0;
  }
}
</style>

