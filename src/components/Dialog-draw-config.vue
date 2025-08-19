<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="config-div">
      <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">
        <v-tab v-if="isEditable || isMine" value="config">設定</v-tab>
        <v-tab value="share">共有ドロー設定</v-tab>
      </v-tabs>
      <v-window v-model="tab" style="margin-top: 10px;">
        <v-window-item v-if="isEditable || isMine" value="config">
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
              <label v-if="isIphone" class="vlike vlike--floating" :class="{ 'is-error': hasError }">
                <span class="vlike__text">フォントサイズ</span>
                <select
                    v-model="s_textPx"
                    class="vlike__control"
                    :data-empty="s_textPx === ''"
                    required
                    style="font-size:16px"
                >
                  <option value="" disabled>選択してください</option>
                  <option v-for="n in 101" :key="n-1" :value="n-1">{{ n-1 }}</option>
                </select>
<!--                <div class="vlike__hint" v-if="!hasError">0〜100の範囲で選択してください</div>-->
<!--                <div class="vlike__message vlike__message&#45;&#45;error" v-else>この項目は必須です</div>-->
              </label>

              <v-text-field
                  v-else
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
            >
            <label for="draw-visible-check" style="font-size: 16px;"> ドロー表示</label>
          </span>
              <input style="width: 200px;margin-left: 10px;" type="range" min="0" max="1" step="0.01" class="range"
                     v-model.number="s_drawOpacity" @change="configChange('opacity',s_drawOpacity)"
              />
              <v-btn @click="qrCodeClick">QRコード貼り付け</v-btn>
            </v-card-text>
          </v-card>
        </v-window-item>
        <v-window-item value="share">
          <p v-if="!isUser" style="font-size: 16px;">ログインすると解放されます。</p>
          <v-card style="text-align: left;font-size: 14px;">
            <v-text-field
                style="margin-top: 10px;"
                v-model="s_geojsonName"
                :label="label"
                :disabled="!isUser"
            />
            <v-select
                style="margin-top: -10px;"
                v-model="s_isEditableForVSelect"
                :items="editType"
                item-title="label"
                item-value="value"
                label="他者が編集可能かどうか"
                outlined
                :disabled="!isUser"
            ></v-select>
            <v-btn :disabled="!isUser" @click="createGeojsonMaster" style="margin-top: -14px;">新規追加</v-btn>
            <v-btn @click="clear" style="margin-top: -14px; margin-left: 5px;">サーバー切断</v-btn>
            <v-btn :disabled="!isUser" v-if="isEditable || isMine" @click="rename" style="margin-top: -14px; margin-left: 5px;">設定変更</v-btn>
            <div class="data-container-wrapper">
              <div v-for="item in jsonData" :key="item.id" class="data-container" @click="rowCick(item)">
                <button class="close-btn" @click.stop="rowRemove(item.geojson_id)">×</button>
                <strong>{{ item.geojson_name }}</strong><br>
              </div>
            </div>
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
import {deleteAll, geojsonUpdate} from "@/js/pyramid";
import {
  changePrintMap03, featureCollectionClear, isJsonString, markaersRemove,
  printDirectionChange,
  saveDrowFeatures,
  startPolling, stopPolling
} from "@/js/downLoad";
import vuetify from "@/plugins/vuetify";
import store from "@/store";
import {mapState} from "vuex";
export default {
  name: 'Dialog-draw-config',
  props: ['mapName'],
  data: () => ({
    editType: [
      { label: 'URLを知っている人全員が編集可能', value: true },
      { label: '自分だけが編集可能', value: false }
    ],
    label: '新規の場合、共有ドロー名を記入してください',
    jsonData: [],
    alertText: '',
    alertType: '',
    showAlert: false,
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
    configFeatureFlg: false,
  }),
  computed: {
    ...mapState([
      'isIphone',
      'isUsingServerGeojson',
      'isEditable',
      'isMine',
      'isEditableForVSelect',
      'configFeature',
    ]),
    s_isEditableForVSelect: {
      get() {
        return this.$store.state.isEditableForVSelect
      },
      set(value) {
        return this.$store.state.isEditableForVSelect = value
      }
    },
    s_isEditable: {
      get() {
        return this.$store.state.isEditable
      },
      set(value) {
        return this.$store.state.isEditable = value
      }
    },
    s_geojsonId: {
      get() {
        return this.$store.state.geojsonId
      },
      set(value) {
        return this.$store.state.geojsonId = value
      }
    },
    s_geojsonName: {
      get() {
        return this.$store.state.geojsonName
      },
      set(value) {
        return this.$store.state.geojsonName = value
      }
    },
    s_myNickname () {
      return this.$store.state.myNickname
    },
    isUser () {
      return !!this.s_userId
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
    async rename() {
      console.log(this.s_geojsonName)
      console.log(this.s_geojsonId)
      const formData = new FormData();
      formData.append('geojson_id', this.s_geojsonId);
      formData.append('geojson_name', this.s_geojsonName);
      formData.append('is_editable', this.s_isEditableForVSelect ? '1' : '0');
      this.s_isEditable = this.s_isEditableForVSelect
      const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/geojson_rename.php', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log(data)
      if (data.success) {
        this.alertType = 'info'
        this.alertText = '変更成功！'
        this.showAlert = true
        await this.selectGeojson()
        return
      } else {
        this.alertType = 'error'
        this.alertText = '変更失敗！'
        this.showAlert = true
        console.log('失敗')
        return
      }
    },
    clear() {
      this.showAlert = false
      this.$store.state.isUsingServerGeojson = false
      this.$store.state.clickCircleGeojsonText = ''
      this.s_geojsonId = ''
      this.s_geojsonName = ''
      setTimeout(() => {
        deleteAll(true)
        this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire
      },100)
      this.$store.state.isUsingServerGeojson = false
      this.$store.state.isEditable = true
      stopPolling()
      markaersRemove()
      featureCollectionClear()
    },
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
        this.showAlert = false
        if (this.s_geojsonId === geojson_id) {
          this.clear()
          this.alertType = 'info'
          this.alertText = '通常モードに戻りました。共有ドロー状態に戻るには再度、行をクリックしてください。'
          this.showAlert = true
        }
        await this.selectGeojson()
        markaersRemove()
        return
      } else {
        console.log(data)
        alert('失敗')
      }
    },
    async rowCick(item) {
      markaersRemove()
      this.$store.state.isUsingServerGeojson = true
      if (item) {
        this.s_geojsonId = item.geojson_id
        this.s_geojsonName = item.geojson_name
        this.alertType = 'info'
        this.alertText = `「${item.geojson_name}」に変更しました。`
        this.showAlert = true
        this.$store.state.isEditable = item.is_editable === '1'
        this.$store.state.isMine = item.creator_user_id === this.$store.state.userId
        this.s_isEditableForVSelect = this.$store.state.isEditable
        this.$store.state.loadingMessage3 = `<div style="text-align: center">「${item.geojson_name}」に変更しました。</div>`
        this.$store.state.loading3 = true
        setTimeout(() => {
          this.$store.state.loading3 = false
        }, 2000)
      } else {
        this.$store.state.editEnabled = false
        this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire
        this.$store.state.isEditable = this.s_isEditableForVSelect
        this.$store.state.isMine = true
        if (!this.$store.state.isEditable && !this.$store.state.isMine) {
          this.$store.state.loadingMessage3 = '<div style="text-align: center">編集不可です。</div>'
          this.$store.state.loading3 = true
          setTimeout(() => {
            this.$store.state.loading3 = false
          },2000)
        }
      }
      this.s_isEditableForVSelect = this.$store.state.isEditable
      markaersRemove()
      startPolling()
      if (!this.$store.state.isEditable) {
        const color = '#9400d3'
        document.documentElement.style.setProperty('--main-color', color);
        vuetify.theme.themes.value.myTheme.colors.primary = color
      } else {
        const color = this.$store.state.isUsingServerGeojson ? '#2e8b57' : 'rgb(50,101,186)'
        document.documentElement.style.setProperty('--main-color', color);
        vuetify.theme.themes.value.myTheme.colors.primary = color
      }
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
        // console.log(data)
        this.jsonData = data.rows
      } else {
        console.log('失敗')
        this.jsonData = []
      }

    },
    async createGeojsonMaster() {
      if (!this.s_geojsonName) {
        this.alertType = 'info'
        this.alertText = '共有名を記入してください'
        this.showAlert = true
        return
      }
      const formData = new FormData();
      formData.append('geojson_name', this.s_geojsonName);
      formData.append('creator_nickname', this.s_myNickname);
      formData.append('creator_user_id', this.s_userId);
      formData.append('is_editable', this.s_isEditableForVSelect ? '1' : 0);
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
      this.s_geojsonId = data.geojson_id;
      this.alertType = 'success'
      this.alertText = '追加成功！そのままドローを始めてください。'
      this.showAlert = true
      this.$store.state.isUsingServerGeojson = true
      await this.selectGeojson()
      const configFeature = this.$store.state.baseConfigFeature
      if (isJsonString(this.$store.state.clickCircleGeojsonText)) {
        const features = JSON.parse(this.$store.state.clickCircleGeojsonText).features
        console.log(features)
        if (features && features.filter(f => f.properties.id !== 'config').length > 0) {
          if (confirm("現在のドローを引き継ぎますか？引き継ぎもとのドローとは完全に独立します。")) {
            await saveDrowFeatures(features)
          } else {
            await saveDrowFeatures([configFeature])
          }
        } else {
          await saveDrowFeatures([configFeature])
        }
      } else {
        await saveDrowFeatures([configFeature])
      }
      await this.rowCick()
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
      if (!this.configFeatureFlg) {
        const map01 = this.$store.state.map01
        this.$store.state.clickCircleGeojsonText = geojsonUpdate(map01, null, clickCircleSource.iD, 'config', tgtProp, value)
        if (tgtProp === 'direction') {
          this.directionChange()
        }
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
    },
    s_drawOpacity() {
      this.drawOpacityInput()
    },
    s_drawVisible() {
      this.onDrawVisibleChange()
    },
    isUsingServerGeojson(value) {
      if (!this.isEditable) {
        const color = '#9400d3'
        document.documentElement.style.setProperty('--main-color', color);
        vuetify.theme.themes.value.myTheme.colors.primary = color
      } else {
        const color = this.isUsingServerGeojson ? '#2e8b57' : 'rgb(50,101,186)'
        document.documentElement.style.setProperty('--main-color', color);
        vuetify.theme.themes.value.myTheme.colors.primary = color
      }
    },
    isEditable(value) {
      if (!this.isEditable) {
        const color = '#9400d3'
        document.documentElement.style.setProperty('--main-color', color);
        vuetify.theme.themes.value.myTheme.colors.primary = color
      } else {
        const color = this.isUsingServerGeojson ? '#2e8b57' : 'rgb(50,101,186)'
        document.documentElement.style.setProperty('--main-color', color);
        vuetify.theme.themes.value.myTheme.colors.primary = color
      }
    },
    s_geojsonName (value) {
      if (value) {
        this.label = '現在、アクティブのドロー'
      } else {
        this.label = '新規の場合、共有ドロー名を記入してください'
      }
    },
    configFeature: {
      handler(newVal, oldVal) {
        console.log('configFeature が変わりました', { oldVal, newVal });
        console.log(newVal)
        if (!this.$store.state.isEditable && !this.$store.state.isMine) return
        const props = newVal?.properties ?? {};
        // nullish coalescing を使うことで false や 0 の値も正しく扱える
        if (Object.keys(props).length === 0) {
          console.log('検証中')
          // this.$store.state.printTitleText = '';
          // this.$store.state.textPx = 30;
          // this.$store.state.titleColor = 'black';
          // this.$store.state.titleDirection = 'vertical';
          // this.$store.state.drawVisible = true;
          // this.$store.state.drawOpacity = 1;
        } else {
          this.configFeatureFlg = true
          this.$store.state.printTitleText = props['title-text'] ?? '';
          this.$store.state.textPx = props['font-size'] ?? 30;
          this.$store.state.titleColor = props['fill-color'] ?? 'black';
          this.$store.state.titleDirection = props['direction'] ?? 'vertical';
          this.$store.state.drawVisible = props['visible'] ?? true;
          this.$store.state.drawOpacity = props['opacity'] ?? 1;
          setTimeout(() => {
            this.configFeatureFlg = false
          },2000)
        }
      },
      deep: true,
      // immediate: true  // マウント時にも一度だけ呼びたいなら true
    }
  }
}
</script>
<style scoped>
.config-div {
  height: auto;
  /*width: 400px;*/
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
.data-container-wrapper {
  max-height: 300px;
  overflow: auto;
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

