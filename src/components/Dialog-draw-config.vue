<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="config-div">

      <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">
        <v-tab value="config">設定</v-tab>
        <v-tab value="share">共有追加</v-tab>
        <v-tab value="list">共有リスト</v-tab>
      </v-tabs>
      <v-window v-model="tab" style="margin-top: 10px;">
        <v-window-item value="config">
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
              <span style="display: inline-block; position: relative; top: -6px;">
            <input
                type="checkbox"
                id="draw-visible-check"
                v-model="s_drawVisible"
                @change="onDrawVisibleChange"
            >
            <label for="draw-visible-check" style="font-size: 16px;"> ドロー表示</label>
          </span>
              <input style="width: 200px;margin-left: 10px;" type="range" min="0" max="1" step="0.01" class="range"
                     v-model.number="s_drawOpacity" @input="drawOpacityInput" @change="configChange('opacity',s_drawOpacity)"
              />
              <v-btn @click="qrCodeClick">QRコード貼り付け</v-btn>
            </v-card-text>
          </v-card>
        </v-window-item>
        <v-window-item value="share">
          <v-card style="text-align: left;font-size: 14px;">
            <p>現在のドローをデータベースに追加、保存します。同時にレイヤーの状態も保存されます。</p>
            <v-text-field
                style="margin-top: 10px;"
                v-model="geojsonName"
                label="共有名を記入してください"
            />
            <v-btn @click="createGeojsonMaster">新規追加</v-btn>
            <v-alert
                v-if="showAlert"
                :type="alertType"
                class="mt-4"
                dismissible
            >
              {{ alertText }}
            </v-alert>
          </v-card>
        </v-window-item>
        <v-window-item value="list">
          <v-card style="text-align: left;font-size: 14px;">
            <p>行をクリックするとドローを変更します。</p>
            <div v-for="item in jsonData" :key="item.id" class="data-container" @click="rowCick(item)">
              <button class="close-btn" @click.stop="rowRemove(item.geojson_id)">×</button>
              <strong>{{ item.geojson_name }}</strong><br>
            </div>
            <v-btn @click="createGeojsonMaster">新規追加</v-btn>
            <v-alert
                v-if="showAlert"
                :type="alertType"
                class="mt-4"
                dismissible
            >
              {{ alertText }}
            </v-alert>
          </v-card>
        </v-window-item>
      </v-window>
    </div>
  </Dialog>
</template>

<script>
import {clickCircleSource, konUrls} from "@/js/layers";
import {geojsonUpdate} from "@/js/pyramid";
import {changePrintMap03, printDirectionChange} from "@/js/downLoad";
export default {
  name: 'Dialog-draw-config',
  props: ['mapName'],
  data: () => ({
    jsonData: [],
    alertText: '',
    alertType: '',
    showAlert: false,
    geojsonId: '',
    geojsonName: '',
    tab: 'config',
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
    s_myNickname () {
      return this.$store.state.myNickname
    },
    s_userId () {
      return this.$store.state.userId
    },
    s_dialogs () {
      this.selectGeojson()
      return this.$store.state.dialogs.drawConfigDialog
    },
    s_drawFire () {
      return this.$store.state.drawFire
    },
    s_drawOpacity: {
      get() {
        return this.$store.state.drawOpacity
      },
      set(value) {
        return this.$store.state.drawOpacity = value
      }
    },
    s_drawVisible: {
      get() {
        return this.$store.state.drawVisible
      },
      set(value) {
        return this.$store.state.drawVisible = value
      }
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
    async rowRemove(geojson_id) {
      if (!confirm("削除しますか？")) {
        return
      }
      const formData = new FormData();
      formData.append('geojson_id', geojson_id);
      const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/geojson_delete.php', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        console.log(data)
        this.selectGeojson()
        return
      } else {
        console.log(data)
        alert('失敗')
      }
    },
    rowCick() {
      alert(999)
    },
    async selectGeojson() {
      if (!this.s_userId) return
      const formData = new FormData();
      formData.append('creator_user_id', this.s_userId);
      const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/geojson_select.php', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        console.log(data)
        this.jsonData = data.rows
        return
      } else {
        console.log('失敗')
      }
    },
    async createGeojsonMaster() {
      if (!this.geojsonName) {
        this.alertType = 'info'
        this.alertText = '共有名を記入してください'
        this.showAlert = true
        return
      }
      const formData = new FormData();
      formData.append('geojson_name', this.geojsonName);
      formData.append('creator_nickname', this.s_myNickname);
      formData.append('creator_user_id', this.s_userId);
      const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/create-geojson.php', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!data.success) {
        this.alertType = 'error'
        this.alertText = '失敗しました'
        this.showAlert = true
        return;
      }
      // 重複だった場合の通知
      if (data.already_exists) {
        this.alertType = 'warning'
        this.alertText = 'その名前はすでに使われています。'
        this.showAlert = true
        console.log('その名前はすでに使われています。既存のGeoJSONを使用します。')
        return
      }
      this.geojsonId = data.geojson_id;
      this.alertType = 'success'
      this.alertText = '追加成功！「共有リスト」タブで共有するドローを選択してください。'
      this.showAlert = true
      return this.geojsonId;
    },
    qrCodeClick () {
      this.$emit('open-floating')
    },
    onDrawVisibleChange () {
      const map01 = this.$store.state.map01
      const v = this.s_drawVisible ? 'visible' : 'none'
      const layerIds = ['click-circle-layer','click-circle-polygon-line-layer','click-circle-polygon-symbol-layer',
        'click-circle-polygon-symbol-area-layer','click-circle-line-layer','click-circle-keiko-line-layer',
        'click-circle-label-layer','click-circle-symbol-layer','arrows-endpoint-layer','segment-label-layer'
      ]
      layerIds.forEach(layerId => {
        map01.setLayoutProperty(layerId, 'visibility', v)
      })
      this.configChange('visible',this.s_drawVisible)
    },
    drawOpacityInput () {
      const map01 = this.$store.state.map01
      map01.setPaintProperty('click-circle-layer', 'fill-opacity', this.s_drawOpacity)
      map01.setPaintProperty('click-circle-polygon-line-layer', 'line-opacity', this.s_drawOpacity)
      map01.setPaintProperty('click-circle-polygon-symbol-layer', 'text-opacity', this.s_drawOpacity)
      map01.setPaintProperty('click-circle-polygon-symbol-area-layer', 'text-opacity', this.s_drawOpacity)
      map01.setPaintProperty('click-circle-line-layer', 'line-opacity', this.s_drawOpacity)
      map01.setPaintProperty('click-circle-keiko-line-layer', 'line-opacity', this.s_drawOpacity)
      map01.setPaintProperty('click-circle-label-layer', 'text-opacity', this.s_drawOpacity)
      // click-circle-symbol-layerは考える必要あり。opacityは使えない。
      map01.setPaintProperty('click-circle-symbol-layer', 'circle-opacity', this.s_drawOpacity)
      map01.setPaintProperty('arrows-endpoint-layer', 'icon-opacity', this.s_drawOpacity)
      map01.setPaintProperty('segment-label-layer', 'text-opacity', this.s_drawOpacity)
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
      changePrintMap03(this.s_titleDirection)
      printDirectionChange(this.s_titleDirection)
    }
  },
  mounted() {
    document.querySelector('#drag-handle-drawConfigDialog-map01').innerHTML = '<span style="font-size: large;">各種設定</span>'
  },
  watch: {
    s_drawFire () {
      this.onDrawVisibleChange()
      this.drawOpacityInput()
    }
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
  max-height: 600px;
}
/* スマホ用のスタイル */
@media screen and (max-width: 768px) {
  .config-div {
    width: 100%;
    margin: 0;
  }
}
.data-container {
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  position: relative;
  cursor: pointer;
  background-color: rgba(132, 163, 213, 0.3);
}
.data-container:hover {
  background-color: #f0f8ff;
}
/* 選択時は少し濃いめの青に */
.data-container.selected {
  background-color: #4682b4;
  color: white;
}
.close-btn {
  position: absolute;
  top: -10px;
  right: 10px;
  color: black;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 30px;
}
.close-btn:hover {
  color: red;
}
</style>

