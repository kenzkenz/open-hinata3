<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <v-select class="scrollable-content"
                  v-model="s_zahyokei"
                  :items="items"
                  label="座標系を選択してください"
                  outlined
        ></v-select>
        <v-btn @click="loadSima">読込開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialog2" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <div v-if="isAndroid" class="select-container">
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
                    label="座標系を選択してください"
                    outlined
          ></v-select>
        </div>
        <v-btn @click="outputSima">出力開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialog2 = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialog3" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <div v-if="isAndroid" class="select-container">
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
                    label="座標系を選択してください"
                    outlined
          ></v-select>
        </div>
        <v-btn @click="outputJww">出力開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialog3 = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialog4" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <div v-if="isAndroid" class="select-container">
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
                    label="座標系を選択してください"
                    outlined
          ></v-select>
        </div>
        <v-btn @click="saveDxf">DXF出力開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialog4 = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialog5" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <div v-if="isAndroid" class="select-container">
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
                    label="座標系を選択してください"
                    outlined
          ></v-select>
        </div>
        <v-btn @click="saveSima">sima出力開始</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialog5 = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <div :style="menuContentSize">
    <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
    <div v-if="item.id === 'oh-chibanzu-all2'" style="font-size: small">
      オープンデータは緑、開示請求は青
    </div>

    <v-text-field label="表示地番検索（例）5-7" v-model="s_chibanText" @input="change" style="margin-top: 0px"></v-text-field>

<!--    <v-btn style="margin-top: 0px" class="tiny-btn" @click="saveGeojson">geojson保存</v-btn>-->
<!--    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="gistUpload">gistアップロード</v-btn>-->
    <v-btn style="margin-top: 0px;margin-left: 0px;" class="tiny-btn" @click="dialog5=true" v-if="item.id !== 'oh-chibanzu2024'">sima保存（簡易）</v-btn>
<!--    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="saveSima3" v-if="item.id === 'oh-chibanzu2024'">sima保存</v-btn>-->
    <v-btn style="margin-top: 0px;margin-left: 0px;" class="tiny-btn" @click="dialog2=true" v-if="item.id === 'oh-chibanzu2024'">sima保存</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 5px;width: 72px;" class="tiny-btn" @click="dialog=true">sima読込</v-btn>
    <br>
    <v-btn style="margin-top: 0px;margin-left: 0px;" class="tiny-btn" @click="dialog4=true">dxf保存</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="saveCsv">csv保存</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="saveKml">kml保存</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 0px;" class="tiny-btn" @click="dialog3=true" v-if="item.id === 'oh-chibanzu2024'">jww座標ファイル</v-btn>
    <hr>
    <div style="display: flex; align-items: center; gap: 10px;">
      <v-btn style="height: 40px; line-height: 40px; margin-left: 0px;margin-top: 10px;" class="tiny-btn" @click="resetFeatureColors">
        選択解除
      </v-btn>
      <v-switch
          v-model="s_isRenzoku"
          label="連続選択"
          color="primary"
          style="height: 40px; margin-top: -15px;"
      />
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
    <div v-html="item.attribution"></div>
  </div>
</template>

<script>
import {
  saveGeojson,
  gistUpload,
  saveCima,
  saveCima3,
  saveDxf,
  saveCsv,
  simaToGeoJSON,
  resetFeatureColors, saveSima2, saveKml, getLayersById, getParentIdByLayerId
} from "@/js/downLoad";

export default {
  name: 'ext-chibanzu',
  props: ['mapName','item'],
  data: () => ({
    fields: '',
    sourceId: '',
    layerId: '',
    dialog: false,
    dialog2: false,
    dialog3: false,
    dialog4: false,
    dialog5: false,
    selectedItem: null,
    isAndroid: false,
    items: [
      '公共座標1系', '公共座標2系', '公共座標3系',
      '公共座標4系', '公共座標5系', '公共座標6系',
      '公共座標7系', '公共座標8系', '公共座標9系',
      '公共座標10系', '公共座標11系', '公共座標12系',
      '公共座標13系', '公共座標14系', '公共座標15系',
      '公共座標16系', '公共座標17系', '公共座標18系',
      '公共座標19系'
    ],
    kei: '',
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'hidden', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
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
        if (!value) this.resetFeatureColors()
      }
    },
    s_chibanText: {
      get() {
        return this.$store.state.chibanText[this.mapName]
      },
      set(value) {
        this.$store.state.chibanText[this.mapName] = value
      }
    },
    s_chibanColor: {
      get() {
        return this.$store.state.chibanColor[this.mapName]
      },
      set(value) {
        this.$store.state.chibanColor[this.mapName] = value
      }
    },
    s_chibanColors: {
      get() {
        return this.$store.state.chibanColors[this.mapName]
      },
      set(value) {
        this.$store.state.chibanColors[this.mapName] = value
      }
    },
    s_chibanColorsString: {
      get() {
        return this.$store.state.chibanColorsString[this.mapName]
      },
      set(value) {
        this.$store.state.chibanColorsString[this.mapName] = value
      }
    },
    s_chibanCircleColor: {
      get() {
        return this.$store.state.chibanCircleColor[this.mapName]
      },
      set(value) {
        this.$store.state.chibanCircleColor[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      const map = this.$store.state[this.mapName]
      map.getStyle().layers.forEach(layer => {
        if (layer.id.includes('oh-chibanzu-line') || (layer.id.includes('oh-chibanL-') && layer.id.includes('line'))) {
          // console.log(getParentIdByLayerId(layer.id))
          this.$store.commit('updateSelectedLayers', {
            mapName: this.mapName, id: getParentIdByLayerId(layer.id), values: [
              this.s_chibanText,
              this.s_chibanColorsString,
              this.s_chibanCircleColor
            ]
          })
        }
      })
      // this.$store.commit('updateSelectedLayers', {
      //   mapName: this.mapName, id: this.item.id, values: [
      //     this.s_chibanText,
      //     this.s_chibanColorsString,
      //     this.s_chibanCircleColor
      //   ]
      // })
    },
    checkDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      console.log(/android/i.test(userAgent))
      this.isAndroid = /android/i.test(userAgent);
    },
    idForLayerId (id) {
      console.log(id)
      switch (id) {
        case 'oh-chibanzu2024':
          this.layerId = 'oh-chibanzu2024'
          this.sourceId = 'chibanzu2024-source'
          this.fields = ['地番','所在']
          break
        case 'oh-iwata':
          this.layerId = 'oh-iwatapolygon'
          this.sourceId = 'iwatapolygon-source'
          this.fields = ['SKSCD','AZACD','TXTCD']
          break
        case 'oh-narashi':
          this.layerId = 'oh-narashichiban'
          this.sourceId = 'narashichiban-source'
          this.fields = ['土地key','大字cd']
          break
        case 'oh-fukushimashi':
          this.layerId = 'oh-fukushimachiban'
          this.sourceId = 'fukushimachiban-source'
          this.fields = ['X','Y']
          break
        case 'oh-kitahiroshima':
          this.layerId = 'oh-kitahiroshimachiban'
          this.sourceId = 'kitahiroshimachiban-source'
          this.fields = ['Aza','Chiban','Edaban']
          break
        case 'oh-kunitachishi':
          this.layerId = 'oh-kunitachishi'
          this.sourceId = 'kunitachishichiban-source'
          this.fields = ['id']
          break
        case 'oh-fukuokashi':
          this.layerId = 'oh-fukuokashichiban'
          this.sourceId = 'fukuokashichiban-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-室蘭市':
          this.layerId = 'oh-chibanzu-室蘭市'
          this.sourceId = 'oh-chibanzu-室蘭市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-ニセコ町':
          this.layerId = 'oh-chibanzu-ニセコ町'
          this.sourceId = 'oh-chibanzu-ニセコ町-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-音更町':
          this.layerId = 'oh-chibanzu-音更町'
          this.sourceId = 'oh-chibanzu-音更町-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-鹿角市':
          this.layerId = 'oh-chibanzu-鹿角市'
          this.sourceId = 'oh-chibanzu-鹿角市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-舟形町':
          this.layerId = 'oh-chibanzu-舟形町'
          this.sourceId = 'oh-chibanzu-舟形町-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-利根町':
          this.layerId = 'oh-chibanzu-利根町'
          this.sourceId = 'oh-chibanzu-利根町-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-小平市':
          this.layerId = 'oh-chibanzu-小平市'
          this.sourceId = 'oh-chibanzu-小平市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-町田市':
          this.layerId = 'oh-chibanzu-町田市'
          this.sourceId = 'oh-chibanzu-町田市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-静岡市':
          this.layerId = 'oh-chibanzu-静岡市'
          this.sourceId = 'oh-chibanzu-静岡市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-磐田市':
          this.layerId = 'oh-chibanzu-磐田市'
          this.sourceId = 'oh-chibanzu-磐田市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-半田市':
          this.layerId = 'oh-chibanzu-半田市'
          this.sourceId = 'oh-chibanzu-半田市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-京都市':
          this.layerId = 'oh-chibanzu-京都市'
          this.sourceId = 'oh-chibanzu-京都市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-長岡京市':
          this.layerId = 'oh-chibanzu-長岡京市'
          this.sourceId = 'oh-chibanzu-長岡京市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-岸和田市':
          this.layerId = 'oh-chibanzu-岸和田市'
          this.sourceId = 'oh-chibanzu-岸和田市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-泉南市':
          this.layerId = 'oh-chibanzu-泉南市'
          this.sourceId = 'oh-chibanzu-泉南市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-西宮市':
          this.layerId = 'oh-chibanzu-西宮市'
          this.sourceId = 'oh-chibanzu-西宮市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-加古川市':
          this.layerId = 'oh-chibanzu-加古川市'
          this.sourceId = 'oh-chibanzu-加古川市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-佐用町':
          this.layerId = 'oh-chibanzu-佐用町'
          this.sourceId = 'oh-chibanzu-佐用町-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-奈良市':
          this.layerId = 'oh-chibanzu-奈良市'
          this.sourceId = 'oh-chibanzu-奈良市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-坂出市':
          this.layerId = 'oh-chibanzu-坂出市'
          this.sourceId = 'oh-chibanzu-坂出市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-善通寺市':
          this.layerId = 'oh-chibanzu-善通寺市'
          this.sourceId = 'oh-chibanzu-善通寺市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-長与町':
          this.layerId = 'oh-chibanzu-長与町'
          this.sourceId = 'oh-chibanzu-長与町-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-福島市':
          this.layerId = 'oh-chibanzu-福島市'
          this.sourceId = 'oh-chibanzu-福島市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-北広島市':
          this.layerId = 'oh-chibanzu-北広島市'
          this.sourceId = 'oh-chibanzu-北広島市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-国立市':
          this.layerId = 'oh-chibanzu-国立市'
          this.sourceId = 'oh-chibanzu-国立市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-福岡市':
          this.layerId = 'oh-chibanzu-福岡市'
          this.sourceId = 'oh-chibanzu-福岡市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-越谷市':
          this.layerId = 'oh-chibanzu-越谷市'
          this.sourceId = 'oh-chibanzu-越谷市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-福山市':
          this.layerId = 'oh-chibanzu-福山市'
          this.sourceId = 'oh-chibanzu-福山市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-深谷市':
          this.layerId = 'oh-chibanzu-深谷市'
          this.sourceId = 'oh-chibanzu-深谷市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-伊丹市':
          this.layerId = 'oh-chibanzu-伊丹市'
          this.sourceId = 'oh-chibanzu-伊丹市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-豊中市':
          this.layerId = 'oh-chibanzu-豊中市'
          this.sourceId = 'oh-chibanzu-豊中市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-姫路市':
          this.layerId = 'oh-chibanzu-姫路市'
          this.sourceId = 'oh-chibanzu-姫路市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-仙台市':
          this.layerId = 'oh-chibanzu-仙台市'
          this.sourceId = 'oh-chibanzu-仙台市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-旭川市':
          this.layerId = 'oh-chibanzu-旭川市'
          this.sourceId = 'oh-chibanzu-旭川市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-東村山市':
          this.layerId = 'oh-chibanzu-東村山市'
          this.sourceId = 'oh-chibanzu-東村山市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-城陽市':
          this.layerId = 'oh-chibanzu-城陽市'
          this.sourceId = 'oh-chibanzu-城陽市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-大山崎町':
          this.layerId = 'oh-chibanzu-大山崎町'
          this.sourceId = 'oh-chibanzu-大山崎町-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-川西市':
          this.layerId = 'oh-chibanzu-川西市'
          this.sourceId = 'oh-chibanzu-川西市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-香芝市':
          this.layerId = 'oh-chibanzu-香芝市'
          this.sourceId = 'oh-chibanzu-香芝市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-直方市':
          this.layerId = 'oh-chibanzu-直方市'
          this.sourceId = 'oh-chibanzu-直方市-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-西粟倉村':
          this.layerId = 'oh-chibanzu-西粟倉村'
          this.sourceId = 'oh-chibanzu-西粟倉村-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-高崎市':
          this.layerId = 'oh-chibanzu-高崎市'
          this.sourceId = 'oh-chibanzu-高崎市-source'
          this.fields = ['oh3id']
          break
        case 'oh-chibanzu-all':
          this.layerId = 'oh-chibanzu-all'
          this.sourceId = 'oh-chibanzu-all-source'
          this.fields = ['id']
          break
        case 'oh-chibanzu-all2':
          this.layerId = 'oh-chibanzu-all2'
          this.sourceId = 'oh-chibanzu-all2-source'
          this.fields = ['id']
          break
      }
      if(/^oh-chiban-/.test(id)) {
        this.layerId = id
        this.sourceId = id.replace('-layer','-source')
        this.fields = ['oh3id']
      }
    },
    resetFeatureColors () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      console.log(this.layerId)
      resetFeatureColors(map,this.layerId)
    },
    outputJww () {
      if (!this.s_zahyokei) {
        alert('座標系を選択してください。')
        return
      }
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      saveCima3(map,this.s_zahyokei,true)
    },
    outputSima () {
      if (!this.s_zahyokei) {
        alert('座標系を選択してください。')
        return
      }
      const map = this.$store.state[this.mapName]
      saveCima3(map,this.s_zahyokei)
    },
    saveDxf () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      // saveDxf(map,'oh-iwatapolygon','iwatapolygon-source',['SKSCD','AZACD','TXTCD'])
      // saveDxf(map,this.layerId,this.sourceId,this.fields)
      saveSima2(map,this.layerId,null,true,this.sourceId,this.fields,this.s_zahyokei)
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
      this.idForLayerId(this.item.id)
      console.log(this.layerId,this.sourceId)
      // saveCsv(map,'oh-iwatapolygon','iwatapolygon-source',[])
      saveKml(map,this.layerId,this.sourceId,this.fields,[])
    },
    saveCsv () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      console.log(this.layerId,this.sourceId)
      // saveCsv(map,'oh-iwatapolygon','iwatapolygon-source',[])
      saveCsv(map,this.layerId,this.sourceId,this.fields,[])
    },
    saveSima3 () {
      const map = this.$store.state[this.mapName]
      saveCima3(map)
    },
    saveSima () {
      if (this.item.id === 'oh-chibanzu-all2') {
        alert('まだこのレイヤーでは機能しません。')
        return
      }
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      // saveCima(map,'oh-iwatapolygon','iwatapolygon-source',['SKSCD','AZACD','TXTCD'],true)
      console.log(this.item.id)
      console.log(this.layerId)
      console.log(this.sourceId)
      console.log(this.fields)
      console.log(this.s_zahyokei)
      saveCima(map,this.layerId,this.sourceId,this.fields,true,this.s_zahyokei)
      this.dialog5 = false
    },
    saveGeojson () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      console.log(this.layerId)
      // saveGeojson(map,'oh-iwatapolygon','iwatapolygon-source',['SKSCD','AZACD','TXTCD'])
      saveGeojson(map,this.layerId,this.sourceId,this.fields)
    },
    gistUpload () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      console.log(this.layerId,this.sourceId,this.fields)
      // gistUpload(map,'oh-iwatapolygon','iwatapolygon-source',['SKSCD','AZACD','TXTCD'])
      gistUpload(map,this.layerId,this.sourceId,this.fields)
    },
    changeColorCircle (color,isUpdate) {
      const map = this.$store.state[this.mapName]
      map.getStyle().layers.forEach(layer => {
        if (layer.id.includes('oh-chibanzu-vertex')) {
          map.setPaintProperty(layer.id, 'circle-color', color)
          console.log(map.getPaintProperty(layer.id,'circle-color'))
        }
        if (layer.id.includes('oh-chibanL-') && layer.id.includes('vertex')) {
          map.setPaintProperty(layer.id, 'circle-color', color)
        }
      })
      this.s_chibanCircleColor = color

      if (isUpdate) this.update()
    },
    changeColor (color,isUpdate) {
      // const map = this.$store.state[this.mapName]
      // map.getStyle().layers.forEach(layer => {
      //   if (layer.id.includes('oh-chibanzu-line')) {
      //     map.setPaintProperty(layer.id, 'line-color', color)
      //   }
      //   if (layer.id.includes('oh-chibanL-') && layer.id.includes('line')) {
      //     map.setPaintProperty(layer.id, 'line-color', color)
      //   }
      // })
      // alert(this.item.id)


      let lineColor
      let result
      // console.log(this.s_chibanColorsString)
      if (this.s_chibanColorsString) {
        result = JSON.parse(this.s_chibanColorsString).find(v => {
          return v.layerId === this.item.id}
        )
        // if (result) alert(result.layerId)
        if (result) {
          if (color) {
            lineColor = color
          } else {
            lineColor = result.color
          }
        }
      } else {
        lineColor = 'blue'
      }
      const map = this.$store.state[this.mapName]
      const layers = getLayersById(map,this.item.id)
      const lineLayerId = layers.find(v => v.id.includes('line')).id
      if (lineColor) {
        map.setPaintProperty(lineLayerId, 'line-color', lineColor)
      }

      if (result) {
        this.$store.state.chibanColors = JSON.parse(this.s_chibanColorsString)
        const result1 = this.$store.state.chibanColors.find(v => v.layerId === this.item.id)
        if (result1) {
          result1.color = lineColor
          this.s_chibanColorsString = JSON.stringify(this.$store.state.chibanColors)
        }

      } else {
        if (color) {
          map.setPaintProperty(lineLayerId, 'line-color', color)
          this.$store.state.chibanColors.push({
            layerId: this.item.id,
            color: color
          })
          this.s_chibanColorsString = JSON.stringify(this.$store.state.chibanColors)
        }
      }
      //----------------------------------------------------------------------------------------------------------------
      if (this.item.id === 'oh-chibanzu-all') {
        getLayersById(map,'oh-chibanzu-all').filter(v => v.id.includes('line')).forEach(v => {
          map.setPaintProperty(v.id, 'line-color', lineColor)
        })
      }
      //----------------------------------------------------------------------------------------------------------------
      if (isUpdate) this.update()
    },
    change () {
      const vm = this
      const map = this.$store.state[this.mapName]
      //-------------------------------------------------------------------------
      async function fetchData(id) {
        const response = await fetch(`https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesSelectById.php?id=${id}`);
        const data = await response.json();
        return data;
      }
      async function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
          let combinedFields
          if (vm.item.id.includes('oh-chibanzu-')) {
            combinedFields = ["concat", ["get", "TEXT"], " ", ["get", "地番"], " ", ["get", "Chiban"], " ", ["get", "TIBAN"], " ", ["get", "TXTCD"],
              " ", ["get", "本番"], " ", ["get", "CHIBAN"], " ", ["get", "表示文字列"], " ", ["get", "番地"], " ", ["get", "TXTCODE1"],
              " ", ["get", "地番本番"], " ", ["get", "SAFIELD002"], " ", ["get", "所在地番"], " ", ["get", "TEXTCODE1"], " ", ["get", "DNO"]];
          } else {
            let chibanPropatie = await fetchData(vm.item.id.split('-')[2])
            chibanPropatie = chibanPropatie[0].chiban
            combinedFields = ["get", chibanPropatie]
            // combinedFields = ["get", ["get", "chiban"]]
          }
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions]

          map.getStyle().layers.forEach(layer => {
            if (layer.id.includes('oh-chibanzu-')) {
              map.setFilter(layer.id, matchCondition)
            }
            if (layer.id.includes('oh-chiban-') || layer.id.includes('oh-chibanL-')) {
              const combinedFilter = ["all", matchCondition];
              // 条件を追加
              // if (layer.id.includes('-vertex-')) {
              //   combinedFilter.push(["==", "$type", "Polygon"]);
              // }
              if (layer.id.includes('-point-')) {
                combinedFilter.push(["==", "$type", "Point"]);
              }
              map.setFilter(layer.id, combinedFilter)
            }
          })
        } else {

          map.getStyle().layers.forEach(layer => {
            if (layer.id.includes('oh-chibanzu-')) {
              map.setFilter(layer.id, null)
              if (layer.id.includes('-vertex-')) {
                map.setFilter(layer.id, ["==", "$type", "Polygon"])
              }
            }
            if (layer.id.includes('oh-chiban-') || layer.id.includes('oh-chibanL-')) {
              map.setFilter(layer.id, null)
              if (layer.id.includes('-vertex-')) {
                map.setFilter(layer.id, ["==", "$type", "Polygon"])
              }
              if (layer.id.includes('-point-')) {
                map.setFilter(layer.id, ["==", "$type", "Point"])
              }
            }
          })

        }
      }
      filterBy(this.s_chibanText)
      this.update()
    },
  },
  created() {
    this.checkDevice();
  },
  mounted() {
    // alert(this.s_chibanColorsString)
    console.log(this.s_chibanColorsString)
  },
  watch: {
    s_extFire () {
      this.change()
      this.changeColor()
      this.changeColorCircle(this.s_chibanCircleColor)
    },
  }
}
</script>
<style scoped>
</style>

