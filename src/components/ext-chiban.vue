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
                  label="選択してください"
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
  <div :style="menuContentSize">
    <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
    <v-btn style="margin-top: 0px" class="tiny-btn" @click="saveGeojson">geojson保存</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="gistUpload">gistアップロード</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 0px;" class="tiny-btn" @click="saveSima">sima保存（簡易）</v-btn>
<!--    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="saveSima2">sima保存（詳細）</v-btn>-->
    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="saveDxf">dxf保存</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 0px;" class="tiny-btn" @click="saveCsv">csv保存</v-btn>
    <v-btn style="margin-top: 0px;margin-left: 5px;" class="tiny-btn" @click="dialog=true">sima読込</v-btn>
    <hr>
    <v-btn style="margin-top: 10px;margin-left: 0px;" class="tiny-btn" @click="resetFeatureColors">選択解除</v-btn>
    <!--      <span style="font-size: 12px"><div v-html="item.attribution"></div>平面直角座標系の時は「{{ kei }}」で変換</span>-->
    <hr>
    <div v-html="item.attribution"></div>
  </div>
</template>

<script>
import {
  saveGeojson,
  gistUpload,
  saveCima,
  saveCima2,
  saveDxf,
  initializePlaneRectangularCRS,
  saveCsv,
  simaToGeoJSON,
  resetFeatureColors
} from "@/js/downLoad";

export default {
  name: 'ext-iwate',
  props: ['mapName','item'],
  data: () => ({
    fields: '',
    sourceId: '',
    layerId: '',
    dialog: false,
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
    kei: '',
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size':'large'}
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
  },
  methods: {
    // update () {
    //   this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
    //       this.s_tokijyoText
    //     ]})
    // },
    idForLayerId (id) {
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
      }
    },
    resetFeatureColors () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      console.log(this.layerId)
      resetFeatureColors(map,this.layerId)
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
      this.idForLayerId(this.item.id)
      console.log(this.layerId,this.sourceId)
      // saveCsv(map,'oh-iwatapolygon','iwatapolygon-source',[])
      saveCsv(map,this.layerId,this.sourceId,this.fields,[])
    },
    saveDxf () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      // saveDxf(map,'oh-iwatapolygon','iwatapolygon-source',['SKSCD','AZACD','TXTCD'])
      saveDxf(map,this.layerId,this.sourceId,this.fields)

    },
    // saveSima2 () {
    //   const map = this.$store.state[this.mapName]
    //   saveCima2(map)
    // },
    saveSima () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      // saveCima(map,'oh-iwatapolygon','iwatapolygon-source',['SKSCD','AZACD','TXTCD'],true)
      saveCima(map,this.layerId,this.sourceId,this.fields,true)
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
      // gistUpload(map,'oh-iwatapolygon','iwatapolygon-source',['SKSCD','AZACD','TXTCD'])
      gistUpload(map,this.layerId,this.sourceId,this.fields)
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
      // this.update()
    },
  },
  mounted() {
    const map = this.$store.state[this.mapName]
    map.on('moveend', () => {
      const crs = initializePlaneRectangularCRS(map)
      this.kei = crs.kei
      console.log(crs.kei)
    })
  },
  watch: {
    s_extFire () {
      // this.change()
    },
  }
}
</script>
<style scoped>

</style>

