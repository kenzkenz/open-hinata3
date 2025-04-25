<template>

  <v-dialog v-model="dialogForDxf" max-width="500px">
    <v-card>
      <v-card-title>
        CAD選択
      </v-card-title>
      <v-card-text>
        <div>
          <p> 作成中です。今の所どちらを選んでも差異はないです。</p><br>
          <v-select class="scrollable-content"
                    v-model="s_cad"
                    :items="caditems"
                    label="選択してください"
                    outlined
          ></v-select>
        </div>
        <v-btn @click="saveDxf">DXF保存開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialogForDxf = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogForShape" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <div>
          <v-select class="scrollable-content"
                    v-model="s_zahyokeiShape"
                    :items="items2"
                    label="選択してください"
                    outlined
          ></v-select>
        </div>
        <v-btn @click="saveShape">SHAPE保存開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialogForShape = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="s_dialogForSima" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <div v-if="s_isAndroid" class="select-container">
          <select id="selectBox" v-model="s_zahyokei" class="custom-select">
            <option value="" disabled selected>座標を選択してください。</option>
            <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
              公共座標{{ number }}系
            </option>
          </select>
        </div>
        <div v-else>
          <v-select class="scrollable-content"
                    v-model="s_zahyokei"
                    :items="items"
                    label="選択してください"
                    outlined
          ></v-select>
        </div>
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
<!--    <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>-->

    <v-text-field label="表示地番検索（例）5-7" v-model="s_tokijyoText" @input="change" style="margin-top: 0px"></v-text-field>

      <!-- 1行目 -->
<!--      <div style="display: flex; justify-content: space-between; gap: 10px; padding-right: 30px;">-->
<!--        <v-btn class="tiny-btn" @click="saveGeojson">geojson保存</v-btn>-->
<!--        <v-btn class="tiny-btn" @click="gistUpload">gistアップロード</v-btn>-->
<!--      </div>-->

      <!-- 2行目 -->
      <div style="margin-top:0px;display: flex; justify-content: space-between; gap: 0px; padding-right: 0px;">
        <v-btn style="width: 70px;" class="tiny-btn" @click="saveSima2">sima保存</v-btn>
        <v-btn style="width: 70px;" class="tiny-btn" @click="s_dialogForSima = true">sima読込</v-btn>
        <v-btn style="width: 70px;" class="tiny-btn" @click="dialogForDxf = true">dxf保存</v-btn>
      </div>

      <!-- 3行目 -->
      <div style="display: flex; justify-content: space-between; gap: 5px; padding-right: 100px;">
        <v-btn style="width: 70px;" class="tiny-btn" @click="saveCsv">csv保存</v-btn>
        <v-btn style="width: 70px;" class="tiny-btn" @click="saveKml">KML保存</v-btn>
        <v-btn style="width: 70px;" class="tiny-btn" @click="dialogForShape = true">shape保存</v-btn>

<!--        <v-btn class="tiny-btn" @click="jww">jww座標ファイル保存</v-btn>-->
      </div>

    <!-- 4行目 -->
    <div style="display: flex; justify-content: space-between; gap: 0px; padding-right: 0px;">
      <v-btn style="width: 70px;" class="tiny-btn" @click="saveGeojson"><span style="font-size: 8px;">geojson保存</span></v-btn>
      <v-btn style="width: 145px;" @click="tutorial">使い方説明</v-btn>
    </div>

    <hr>
    <div style="display: flex; align-items: center; gap: 10px;">
      <v-btn style="height: 40px; line-height: 40px; margin-left: 0px;margin-top: 10px;" class="tiny-btn" @click="resetFeatureColors">
        選択解除
      </v-btn>
      <div class="swich">
        <v-switch
            v-model="s_isRenzoku"
            label="連続選択"
            color="primary"
            style="height: 20px; margin-top: -30px;padding-bottom: 30px"
        />
<!--      <v-tooltip top>-->
<!--        <template v-slot:activator="{ props }">-->
<!--          <v-switch-->
<!--              v-model="s_isRenzoku"-->
<!--              label="連続選択"-->
<!--              color="primary"-->
<!--              style="height: 20px; margin-top: -30px;padding-bottom: 30px"-->
<!--              v-bind="props"-->
<!--          />-->
<!--        </template>-->
<!--        <span>オフにするとポップアップします。</span>-->
<!--      </v-tooltip>-->
      </div>
    </div>
    <div class="color-container">
      <div class="box box1" @click="changeColor('red',true)"></div>
      <div class="box box2" @click="changeColor('black',true)"></div>
      <div class="box box3" @click="changeColor('blue',true)"></div>
      <div class="box box4" @click="changeColor('green',true)"></div>
      <div class="box box5" @click="changeColor('orange',true)"></div>
    </div>
    <div class="color-container2">
      <div class="circle box1" @click="changeColorCircle('red',true)"></div>
      <div class="circle box2" @click="changeColorCircle('black',true)"></div>
      <div class="circle box3" @click="changeColorCircle('blue',true)"></div>
      <div class="circle box4" @click="changeColorCircle('green',true)"></div>
      <div class="circle box5" @click="changeColorCircle('orange',true)"></div>
      <div class="circle box6" @click="changeColorCircle('rgba(0,0,0,0)')"></div>
    </div>
    <v-row
        class="justify-center align-center"
        no-gutters
    >
      <v-btn icon @click="decrement" size="mini"
             @mousedown="startDecrement"
             @mouseup="stopAdjust"
             @mouseleave="stopAdjust"
             @touchstart.prevent="startDecrement"
             @touchend="stopAdjust"
      >
        <v-icon>mdi-minus</v-icon>
      </v-btn>
      <v-text-field
          label="線の太さ"
          v-model.number="lineWidth"
          type="number"
          class="mx-2"
          style="max-width: 150px;"
          hide-details
          :min=1
          @input="changeLineWidth(lineWidth,true)"
      />
      <v-btn icon @click="increment" size="mini"
             @mousedown="startIncrement"
             @mouseup="stopAdjust"
             @mouseleave="stopAdjust"
             @touchstart.prevent="startIncrement"
             @touchend="stopAdjust"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-row>
    <div style="text-align: center" v-if="!s_isUnder500">
      <div style="font-size: 12px;margin-top: 10px;"><div v-html="item.attribution"></div>{{ s_zahyokei }}</div>
    </div>
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
  resetFeatureColors, downloadKML, getLayersById
} from "@/js/downLoad";
import {history} from "@/App";

export default {
  name: 'ext-tokijyo2025',
  props: ['mapName','item'],
  data: () => ({
    adjustTimer: null,
    lineWidth: null,
    dialogForDxf: false,
    dialogForShape: false,
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
    items2: [
      'WGS84', '公共座標XX系'
    ],
    caditems: [
      'jww', 'その他'
    ],
    zahyokei: 'WGS84',
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'hidden', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_isUnder500 () {
      return this.$store.state.isUnder500
    },
    s_cad: {
      get() {
        return this.$store.state.cad
      },
      set(value) {
        return this.$store.state.cad = value
      }
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    s_extFire () {
      return this.$store.state.extFire
    },
    s_simaData () {
      return this.$store.state.simaData[this.mapName]
    },
    s_simaZahyokei () {
      return this.$store.state.simaZahyokei[this.mapName]
    },
    s_dialogForSima: {
      get() {
        return this.$store.state.dialogForSima
      },
      set(value) {
        return this.$store.state.dialogForSima = value
      }
    },
    s_tokijyoText2025: {
      get() {
        return this.$store.state.tokijyoText2025[this.mapName]
      },
      set(value) {
        this.$store.state.tokijyoText2025[this.mapName] = value
      }
    },
    s_tokijyoLineWidth2025: {
      get() {
        return this.$store.state.tokijyoLineWidth2025[this.mapName]
      },
      set(value) {
        this.$store.state.tokijyoLineWidth2025[this.mapName] = value
      }
    },
    s_tokijyoColor2025: {
      get() {
        return this.$store.state.tokijyoColor2025[this.mapName]
      },
      set(value) {
        this.$store.state.tokijyoColor2025[this.mapName] = value
      }
    },
    s_tokijyoCircleColor2025: {
      get() {
        return this.$store.state.tokijyoCircleColor2025[this.mapName]
      },
      set(value) {
        this.$store.state.tokijyoCircleColor2025[this.mapName] = value
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
    s_zahyokeiShape: {
      get() {
        return this.$store.state.zahyokeiShape
      },
      set(value) {
        this.$store.state.zahyokeiShape = value
      }
    },
    s_isRenzoku: {
      get() {
        return this.$store.state.isRenzoku
      },
      set(value) {
        this.$store.state.isRenzoku = value
        if (!value) this.resetFeatureColors()
      }
    },
  },
  methods: {
    startIncrement() {
      this.increment()
      this.adjustTimer = setInterval(this.increment, 100)
    },
    startDecrement() {
      this.decrement()
      this.adjustTimer = setInterval(this.decrement, 100)
    },
    stopAdjust() {
      clearInterval(this.adjustTimer)
      this.adjustTimer = null
    },
    increment() {
      this.lineWidth = Number(this.lineWidth) + 1
      this.changeLineWidth(this.lineWidth,true)
    },
    decrement() {
      if (this.lineWidth > 1) {
        this.lineWidth -= 1
        this.changeLineWidth(this.lineWidth,true)
      }
    },
    tutorial () {
      window.open("https://hackmd.io/@kenz/H15Iq49D1g", "_blank");
      history('チュートリアル',window.location.href)
    },
    update () {
      this.$store.commit('updateSelectedLayers', {
        mapName: this.mapName, id: this.item.id, values: [
          this.s_tokijyoText2025,
          this.s_tokijyoColor2025,
          this.s_tokijyoCircleColor2025,
          this.s_tokijyoLineWidth2025
        ]
      })
    },
    changeLineWidth (width,isUpdate) {
      const map = this.$store.state[this.mapName]
      // ⭐️ここを修正する必要あり。このままだと2は設定されない。
      if (isNaN(width)) width = this.lineWidth = 2
      if(this.lineWidth !== 2) map.setPaintProperty('oh-homusyo-2025-line', 'line-width', width)
      this.s_tokijyoLineWidth2025 = Number(width)
      if (isUpdate) this.update()
    },
    changeColorCircle (color,isUpdate) {
      const map = this.$store.state[this.mapName]
      map.setPaintProperty('oh-homusyo-2025-vertex', 'circle-color', color)
      this.s_tokijyoCircleColor2025 = color
      if (isUpdate) this.update()
    },
    changeColor (color,isUpdate) {
      const map = this.$store.state[this.mapName]
      map.setPaintProperty('oh-homusyo-2025-line', 'line-color', color)
      this.s_tokijyoColor2025 = color

      // 既存のレイヤーを削除
      if (map.getLayer('oh-homusyo-2025-daihyo')) {
        map.removeLayer('oh-homusyo-2025-daihyo');
      }

      let colors
      switch (color) {
        case 'red':
          colors = ["rgba(255, 255, 255, 0)", "rgba(255, 255, 0, 0.5)", "rgba(255, 0, 0, 0.5)"]
          break
        case 'black':
          colors = ["rgba(0, 0, 0, 0)","rgba(0, 0, 0, 0.5)","rgba(0, 0, 0, 1)"]
          break
        case 'blue':
          colors = ["rgba(0, 0, 255, 0)","rgba(0, 0, 255, 0.5)","rgba(0, 0, 255, 1)"]
          break
        case 'green':
          colors = ["rgba(0, 255, 0, 0)","rgba(0, 255, 0, 0.5)","rgba(0, 128, 0, 1)"]
          break
        case 'orange':
          colors = ["rgba(255, 165, 0, 0)","rgba(255, 165, 0, 0.5)","rgba(255, 140, 0, 1)"]
          break
      }

      // 新しい設定でレイヤーを追加
      map.addLayer({
        id: 'oh-homusyo-2025-daihyo',
        type: 'heatmap',
        source: "homusyo-2025-diahyo-source",
        "source-layer": "daihyo",
        paint: {
          'heatmap-color': [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, colors[0],
            0.5, colors[1],
            1, colors[2],
          ],
          "heatmap-radius": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 出力が増加する割合を制御する、1に近づくほど出力が増加する
            ["exponential", 10],
            // ズームレベルに応じて半径を調整する
            ["zoom"],
            2,
            5,
            14,
            50,
          ],
        },
        'maxzoom': 14
      });

      if (isUpdate) this.update()
    },
    changeMode () {
      this.$store.state.isPopupVisible = !this.$store.state.isPopupVisible
    },
    info () {
      this.dialogInfo = true
    },
    jww () {
      const map = this.$store.state[this.mapName]
      saveSima2(map,'oh-homusyo-2025-polygon',true)
    },
    resetFeatureColors () {
      const map = this.$store.state[this.mapName]
      resetFeatureColors(map,'oh-homusyo-2025-polygon')
    },
    loadSima () {
      if (!this.s_zahyokei) {
        alert('座標系を選択してください。')
        return
      }
      document.querySelector('#simaFileInput').click()
      this.dialog = false
    },
    saveKml () {
      const map = this.$store.state[this.mapName]
      downloadKML(map, 'oh-homusyo-2025-polygon')
      history('KML保存',window.location.href)
    },
    saveCsv () {
      const map = this.$store.state[this.mapName]
      saveCsv(map,'oh-homusyo-2025-polygon','homusyo-2025-source',[])
      history('CSV保存',window.location.href)
    },
    saveDxf () {
      const map = this.$store.state[this.mapName]
      // saveDxf(map,'oh-homusyo-2025-polygon','homusyo-2025-source',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
      saveSima2(map,'oh-homusyo-2025-polygon',null,true,'homusyo-2025-source',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
      history('DXF保存',window.location.href)
    },
    saveShape () {
      const map = this.$store.state[this.mapName]
      saveSima2(map, 'oh-homusyo-2025-polygon', null, false, null, null, null, true)
      this.dialogForShape = false
      history('SHAPE保存',window.location.href)
    },
    saveSima2 () {
      const map = this.$store.state[this.mapName]
      saveSima2(map,'oh-homusyo-2025-polygon')
      history('SIMA保存',window.location.href)
    },
    saveSima () {
      const map = this.$store.state[this.mapName]
      saveCima(map,'oh-homusyo-2025-polygon','homusyo-2025-source',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'],true)
    },
    saveGeojson () {
      const map = this.$store.state[this.mapName]
      saveGeojson(map,'oh-homusyo-2025-polygon','homusyo-2025-source',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
    },
    gistUpload () {
      const map = this.$store.state[this.mapName]
      gistUpload(map,'oh-homusyo-2025-polygon','homusyo-2025-source',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
    },
    change () {
      console.log(this.item)
      // const vm = this
      const map = this.$store.state[this.mapName]
      //-------------------------------------------------------------------------
      function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
          const combinedFields = ["concat", ["get", "市区町村名"], " ", ["get", "大字名"], " ", ["get", "地番"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions]
          map.setFilter('oh-homusyo-2025-polygon', matchCondition)
          map.setFilter('oh-homusyo-2025-line', matchCondition)
          map.setFilter('oh-homusyo-2025-label', matchCondition)
          map.setFilter('oh-homusyo-2025-vertex', matchCondition)
        } else {
          map.setFilter('oh-homusyo-2025-polygon', null)
          map.setFilter('oh-homusyo-2025-line', null)
          map.setFilter('oh-homusyo-2025-label', null)
          map.setFilter('oh-homusyo-2025-vertex', null)
        }
      }
      filterBy(this.s_tokijyoText2025)
      this.update()
    },
  },
  created() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    console.log(/android/i.test(userAgent))
    this.$store.state.isAndroid = /android/i.test(userAgent);
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
    if (this.s_tokijyoLineWidth2025) {
      this.lineWidth = this.s_tokijyoLineWidth2025
    } else {
      this.lineWidth = 2
    }
  },
  watch: {
    s_extFire () {
      this.change()
      this.changeColor(this.s_tokijyoColor2025)
      this.changeColorCircle(this.s_tokijyoCircleColor2025)
      this.changeLineWidth(this.s_tokijyoLineWidth2025)
    },
  }
}
</script>
<style scoped>
.small-label .v-label {
  font-size: 1px;
}

</style>

