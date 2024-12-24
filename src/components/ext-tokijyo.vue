<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      <v-text-field label="抽出" v-model="s_tokijyoText" @input="change" style="margin-top: 10px"></v-text-field>
      <v-btn style="margin-top: -10px" class="tiny-btn" @click="saveGeojson">geojson保存</v-btn>
      <v-btn style="margin-top: -10px;margin-left: 5px;" class="tiny-btn" @click="gistUpload">gistアップロード</v-btn>
      <v-btn style="margin-top: 0px;margin-left: 0px;" class="tiny-btn" @click="saveCima">simaテスト(宮崎県の座標系)</v-btn>
      <div v-html="item.attribution"></div>
    </div>
</template>

<script>

import { saveGeojson,gistUpload,saveCima } from "@/js/downLoad";

export default {
  name: 'ext-tokijyo',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_tokijyoText: {
      get() {
        return this.$store.state.tokijyoText[this.mapName]
      },
      set(value) {
        this.$store.state.tokijyoText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_tokijyoText
        ]})
    },
    saveCima () {
      const map = this.$store.state[this.mapName]
      saveCima (map,'oh-amx-a-fude','amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'])
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
  watch: {
    s_extFire () {
      this.change()
    },
  }
}
</script>
<style scoped>

</style>

