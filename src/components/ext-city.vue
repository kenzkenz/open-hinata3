<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      <v-switch class="custom-switch" v-model="s_isPaintCity" @change="changePaint" label="塗りつぶし" color="primary" />
      <br>
      <v-text-field label="抽出" v-model="s_cityText" @input="changePaint" style="margin-top: 10px"></v-text-field>
      <v-btn style="margin-top: -10px" class="tiny-btn" @click="saveGeojson">geojson保存</v-btn>
      <v-btn style="margin-top: -10px;margin-left: 5px;" class="tiny-btn" @click="gistUpload">gistアップロード</v-btn>
      <div v-html="item.attribution"></div>
    </div>
</template>

<script>

import { saveGeojson,gistUpload } from "@/js/downLoad";

export default {
  name: 'ext-city',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_isPaintCity: {
      get() {
        if (this.$store.state.isPaintCity[this.mapName][this.item.id.split('-')[2]] === 'true') {
          return true
        } else if (this.$store.state.isPaintCity[this.mapName][this.item.id.split('-')[2]] === 'false') {
          return false
        } else {
          return this.$store.state.isPaintCity[this.mapName][this.item.id.split('-')[2]]
        }
      },
      set(value) {
        return this.$store.state.isPaintCity[this.mapName][this.item.id.split('-')[2]] = value
      }
    },
    s_cityText: {
      get() {
        return this.$store.state.cityText[this.mapName][this.item.id.split('-')[2]]
      },
      set(value) {
        this.$store.state.cityText[this.mapName][this.item.id.split('-')[2]] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_isPaintCity,
          this.s_cityText
        ]})
    },
    saveGeojson () {
      const map = this.$store.state[this.mapName]
      let fields
      switch (this.item.id) {
        case 'oh-city-gun':
          fields = ['CODE']
          break
        default:
          fields = ['N03_007']
      }
      saveGeojson(map,this.item.id,this.item.id + '-source',fields)
    },
    gistUpload () {
      const map = this.$store.state[this.mapName]
      let fields
      switch (this.item.id) {
        case 'oh-city-gun':
          fields = ['CODE']
          break
        default:
          fields = ['N03_007']
      }
      gistUpload(map,this.item.id,this.item.id + '-source',fields)
    },
    changePaint () {
      console.log(this.item)
      const vm = this
      const map = this.$store.state[this.mapName]
      if (!this.s_isPaintCity) {
        map.setPaintProperty(this.item.id, 'fill-color', 'rgba(0, 0, 0, 0)')
        map.setPaintProperty(this.item.id + '-line', 'line-color', 'black')
        map.setPaintProperty(this.item.id + '-line', 'line-width',  [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          11, 4
        ]);
      } else {
        map.setPaintProperty(this.item.id, 'fill-color', ['get', 'random_color'])
        map.setPaintProperty(this.item.id + '-line', 'line-color', 'black')
        map.setPaintProperty(this.item.id + '-line', 'line-width', [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0,
          11, 0.5
        ]);
      }
      //-------------------------------------------------------------------------
      function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
         const combinedFields = ["concat", ["get", "N03_001"], " ", ["get", "N03_003"], " ", ["get", "N03_004"], " ", ["get", "よみ"],
           " ", ["get", "GUN"], " ", ["get", "KUNI"], " ", ["get", "PREF"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions]
          map.setFilter(vm.item.id, matchCondition)
          map.setFilter(vm.item.id + '-line', matchCondition)
          map.setFilter(vm.item.id + '-label', matchCondition)
        } else {
          map.setFilter(vm.item.id, null)
          map.setFilter(vm.item.id + '-line', null)
          map.setFilter(vm.item.id + '-label', null)
        }
      }
      filterBy(this.s_cityText)
      this.update()
    },
  },
  watch: {
    s_extFire () {
      this.changePaint()
    },
  }
}
</script>
<style scoped>

</style>

