<template>
  <v-dialog v-model="s_dialogForSima" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <v-select class="scrollable-content"
            v-model="s_zahyokei"
            :items="items"
            label="選択してください"
            outlined
        ></v-select>
        <v-btn @click="loadSima">SIMA読込開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="s_dialogForSima = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialogInfo" max-width="400px">
    <v-card>
      <v-card-title>
        簡易と詳細の違い
      </v-card-title>
      <v-card-text>
        <ul>
          <li>
            SIMA保存（簡易）
            <div>描画用に簡略化された座標です。</div>
          </li>
          <li>
            SIMA保存（詳細）
            <div>元のXMLと同様の座標を持っています。</div>
          </li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialogInfo = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <div :style="menuContentSize">
    <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
    <v-text-field label="抽出" v-model="s_tokijyoText" @input="change" style="margin-top: 10px"></v-text-field>

      <!-- 1行目 -->
      <div style="display: flex; justify-content: space-between; gap: 10px; padding-right: 30px;">
        <v-btn class="tiny-btn" @click="saveGeojson">geojson保存</v-btn>
        <v-btn class="tiny-btn" @click="gistUpload">gistアップロード</v-btn>
      </div>

      <!-- 2行目 -->
      <div style="display: flex; justify-content: space-between; gap: 10px; padding-right: 30px;">
        <v-btn class="tiny-btn" @click="saveSima2">sima保存</v-btn>
        <v-btn class="tiny-btn" @click="s_dialogForSima = true">sima読込</v-btn>
        <v-btn class="tiny-btn" @click="saveDxf">dxf保存</v-btn>
      </div>

      <!-- 3行目 -->
      <div style="display: flex; justify-content: space-between; gap: 10px; padding-right: 17px;">
        <v-btn class="tiny-btn" @click="saveCsv">csv保存</v-btn>
        <v-btn class="tiny-btn" @click="jww">jww座標ファイル保存</v-btn>
      </div>

    <hr>
    <div style="display: flex; align-items: center; gap: 10px;">
      <v-btn style="height: 40px; line-height: 40px; margin-left: 0px;margin-top: 10px;" class="tiny-btn" @click="resetFeatureColors">
        選択解除
      </v-btn>
      <div class="swich">
      <v-tooltip top>
        <template v-slot:activator="{ props }">
          <v-switch
              v-model="s_isRenzoku"
              label="連続選択"
              color="primary"
              style="height: 20px; margin-top: -30px;padding-bottom: 30px"
              v-bind="props"
          />
        </template>
        <span>オフにするとポップアップします。</span>
      </v-tooltip>
      </div>
    </div>
    <div class="color-container">
      <div class="box box1" @click="changeColor('red')"></div>
      <div class="box box2" @click="changeColor('black')"></div>
      <div class="box box3" @click="changeColor('blue')"></div>
      <div class="box box4" @click="changeColor('green')"></div>
      <div class="box box5" @click="changeColor('orange')"></div>
    </div>
<!--    <v-btn style="margin-top: 10px;margin-left: 100px;width: 50px" class="tiny-btn" @click="info">help</v-btn>-->

    <div style="font-size: 12px;margin-top: 10px;"><div v-html="item.attribution"></div>{{ s_zahyokei }}</div>
  </div>
</template>

<script>

import {
  saveGeojson,
  gistUpload,
  saveCima,
  saveSima2,
  saveDxf,
  initializePlaneRectangularCRS,
  saveCsv,
  simaToGeoJSON,
  resetFeatureColors
} from "@/js/downLoad";
import {history} from "@/App";

export default {
  name: 'ext-tokijyo',
  props: ['mapName','item'],
  data: () => ({
    mode: false,
    // dialog: false,
    dialogInfo: false,
    selectedItem: null,
    items: [
      '公共座標1系', '公共座標2系', '公共座標3系',
      '公共座標4系', '公共座標5系', '公共座標6系',
      '公共座標7系', '公共座標8系', '公共座標9系',
      '公共座標10系', '公共座標11系', '公共座標12系',
      '公共座標13系', '公共座標14系', '公共座標15系',
      '公共座標16系', '公共座標17系', '公共座標18系',
      '公共座標19系'
    ],
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'hidden', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_dialogForSima: {
      get() {
        return this.$store.state.dialogForSima
      },
      set(value) {
        return this.$store.state.dialogForSima = value
      }
    },
    s_tokijyoText: {
      get() {
        return this.$store.state.tokijyoText[this.mapName]
      },
      set(value) {
        this.$store.state.tokijyoText[this.mapName] = value
      }
    },
    s_tokijyoColor: {
      get() {
        return this.$store.state.tokijyoColor[this.mapName]
      },
      set(value) {
        this.$store.state.tokijyoColor[this.mapName] = value
      }
    },
    s_zahyokei: {
      get() {
        return this.$store.state.zahyokei
      },
      set(value) {
        this.$store.state.zahyokei = value
      }
    },
    s_isRenzoku: {
      get() {
        return this.$store.state.isRenzoku
      },
      set(value) {
        this.$store.state.isRenzoku = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_tokijyoText,
          this.s_tokijyoColor
        ]})
    },
    changeColor (color) {
      const map = this.$store.state[this.mapName]
      map.setPaintProperty('oh-amx-a-fude-line', 'line-color', color)
      this.s_tokijyoColor = color

      // map.setPaintProperty(
      //     'oh-amx-a-daihyo', // レイヤID
      //     'heatmap-color',   // プロパティ
      //     [
      //       'interpolate',
      //       ['linear'],
      //       ['heatmap-density'],
      //       0,
      //       'rgba(255, 255, 255, 0)', // 透明
      //       0.5,
      //       'rgba(144, 238, 144, 0.5)', // 薄い緑
      //       1,
      //       'rgba(0, 100, 0, 0.8)' // 濃い緑
      //     ]
      // );




      this.update()
    },
    changeMode () {
      this.$store.state.isPopupVisible = !this.$store.state.isPopupVisible
    },
    info () {
      this.dialogInfo = true
    },
    jww () {
      const map = this.$store.state[this.mapName]
      saveSima2(map,'oh-amx-a-fude',true)
    },
    resetFeatureColors () {
      const map = this.$store.state[this.mapName]
      resetFeatureColors(map,'oh-amx-a-fude')
    },
    loadSima () {
      if (!this.s_zahyokei) {
        alert('座標系を選択してください。')
        return
      }
      document.querySelector('#simaFileInput').click()
      this.dialog = false
    },
    saveCsv () {
      const map = this.$store.state[this.mapName]
      saveCsv(map,'oh-amx-a-fude','amx-a-pmtiles',[])
    },
    saveDxf () {
      const map = this.$store.state[this.mapName]
      // saveDxf(map,'oh-amx-a-fude','amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
      saveSima2(map,'oh-amx-a-fude',null,true,'amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
    },
    saveSima2 () {
      const map = this.$store.state[this.mapName]
      saveSima2(map,'oh-amx-a-fude')
      history('SIMA保存',window.location.href)
    },
    saveSima () {
      const map = this.$store.state[this.mapName]
      saveCima(map,'oh-amx-a-fude','amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'],true)
    },
    saveGeojson () {
      const map = this.$store.state[this.mapName]
      saveGeojson(map,'oh-amx-a-fude','amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
    },
    gistUpload () {
      const map = this.$store.state[this.mapName]
      gistUpload(map,'oh-amx-a-fude','amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
    },
    change () {
      console.log(this.item)
      // const vm = this
      const map = this.$store.state[this.mapName]
      // if (!this.s_isPaintCity) {
      //   map.setPaintProperty(this.item.id, 'fill-color', 'rgba(0, 0, 0, 0)')
      //   map.setPaintProperty(this.item.id + '-line', 'line-color', 'black')
      //   map.setPaintProperty(this.item.id + '-line', 'line-width',  [
      //     'interpolate',
      //     ['linear'],
      //     ['zoom'],
      //     7, 1,
      //     11, 4
      //   ]);
      // } else {
      //   map.setPaintProperty(this.item.id, 'fill-color', ['get', 'random_color'])
      //   map.setPaintProperty(this.item.id + '-line', 'line-color', 'black')
      //   map.setPaintProperty(this.item.id + '-line', 'line-width', [
      //     'interpolate',
      //     ['linear'],
      //     ['zoom'],
      //     7, 0,
      //     11, 0.5
      //   ]);
      // }
      //-------------------------------------------------------------------------
      function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
         const combinedFields = ["concat", ["get", "大字名"], " ", ["get", "大字コード"], " ", ["get", "地番"], " ", ["get", "丁目コード"],
           " ", ["get", "小字コード"], " ", ["get", "市区町村名"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions]
          map.setFilter('oh-amx-a-fude', matchCondition)
          map.setFilter('oh-amx-a-fude-line', matchCondition)
          map.setFilter('oh-amx-label', matchCondition)
          // map.setFilter('oh-amx-a-daihyo', matchCondition)
        } else {
          map.setFilter('oh-amx-a-fude', null)
          map.setFilter('oh-amx-a-fude-line', null)
          map.setFilter('oh-amx-label', null)
          // map.setFilter('oh-amx-a-daihyo', null)
        }
      }
      filterBy(this.s_tokijyoText)
      this.update()
    },
  },
  mounted() {
    const map = this.$store.state[this.mapName]
    map.on('moveend', () => {
      // const crs = initializePlaneRectangularCRS(map)
      // this.kei = crs.kei
      // console.log(crs.kei)
    })
  },
  watch: {
    s_extFire () {
      this.change()
      this.changeColor(this.s_tokijyoColor)
    },
  }
}
</script>
<style scoped>
.small-label .v-label {
  font-size: 1px;
}

</style>

