<template>
    <div :style="menuContentSize">
      <v-select
          v-model="s_bakumatsuSelected"
          :items="items"
          label="表示方法を選択してください"
          outlined
          @update:modelValue="onSelectChange"
      ></v-select>
      <v-text-field label="抽出" v-model="s_bakumatsuText" @input="bakumatsuInput(mapName)" @change="aaa" style="margin-top: 10px"></v-text-field>
      <div>
        <p v-html="htmlKokudaka"></p>
      </div>
    </div>
</template>

<script>

import axios from "axios"
import { PMTiles } from "pmtiles"
import * as turf from "@turf/turf"

export default {
  name: 'ext-bakumatsu',
  props: ['mapName','item'],
  data: () => ({
    kokudakakei: {
      map01: 0,
      map02: 0,
    },
    sonsu: {
      map01: 0,
      map02: 0,
    },
    // selected: null, // 選択されたアイテムを格納
    items: ["標準", "藩で色分け",'藩で色分け2','令制国で色分け','県で色分け','郡で色分け','石高（面積割）で色分け'], // 表示するアイテム
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    htmlKokudaka () {
      return '石高の総計=' + Math.round(this.kokudakakei[this.mapName]).toLocaleString() +
          '（' + Math.round(this.sonsu[this.mapName]).toLocaleString() + '村）'
    },
    s_bakumatsuSelected: {
      get() {
        return this.$store.state.bakumatsuSelected[this.mapName]
      },
      set(value) {
        this.$store.state.bakumatsuSelected[this.mapName] = value
      }
    },
    s_bakumatsuText: {
      get() {
        return this.$store.state.bakumatsuText[this.mapName]
      },
      set(value) {
        this.$store.state.bakumatsuText[this.mapName] = value
        this.calcKokudaka()
      }
    },
  },
  methods: {
    calcKokudaka () {
      const vm = this
      this.kokudakakei[this.mapName] = 0
      let parameter
      if (this.s_bakumatsuText) {
        parameter = this.s_bakumatsuText.replace(/\u3000/g,' ').trim()
      } else {
        parameter = this.s_bakumatsuText.trim()
      }
      axios
          .get('https://kenzkenz.xsrv.jp/open-hinata/php/kokudakasokei4.php', {
            params: {
              parameter: parameter
            }
          })
          .then(function (response) {
            console.log(response.data)
            vm.kokudakakei[vm.mapName] = response.data.kokudaka
            vm.sonsu[vm.mapName] = response.data.sonsu
          })
    },
    onSelectChange (value) {
      const map = this.$store.state[this.mapName]
      let field
      switch (value) {
        case '標準':
          field = 'random_color'
          break
        case '藩で色分け':
          field = 'random_color_ryobun'
          break
        case '藩で色分け2':
          map.setPaintProperty('oh-bakumatsu-layer', 'fill-color', [
            'case',
            ['>', ['index-of', '藩', ['get', '領分１']], -1], 'rgba(104,52,154,0.7)',    // 「藩」が含まれる場合
            ['>', ['index-of', '幕領', ['get', '領分１']], -1], 'rgba(255,0,0,0.7)',      // 「幕領」が含まれる場合
            ['>', ['index-of', '皇室領', ['get', '領分１']], -1], 'rgba(255,215,0,0.7)',  // 「皇室領」が含まれる場合
            ['>', ['index-of', '社寺領', ['get', '領分１']], -1], 'rgba(0,0,0,0.7)',      // 「社寺領」が含まれる場合
            'rgba(0,0,255,0.7)'                                                         // 上記の条件に一致しない場合
          ])
          break
        case '令制国で色分け':
          field = 'random_color_ryoseikoku'
          break
        case '県で色分け':
          field = 'random_color_pref'
          break
        case '郡で色分け':
          field = 'random_color_gunmei'
          break
        case '石高（面積割）で色分け':
          map.setPaintProperty('oh-bakumatsu-layer', 'fill-color', [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 'white',
            10000000, 'red',
            50000000, 'black'
          ])
          break
      }
      if (field) map.setPaintProperty('oh-bakumatsu-layer', 'fill-color', ['get', field])
      this.update()
    },
    update () {
      try {
        const bakumatsu = this.s_bakumatsuText
        const bakumatsuSelected = this.s_bakumatsuSelected
        this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [bakumatsu,bakumatsuSelected]})
      }catch (e) {
        console.log(e)
      }
    },
    bakumatsuInput (mapName) {
      const map = this.$store.state[mapName]
      function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
          // const combinedFields = ["concat", ["get", "KEY"], " ", ["get", "令制国"], " ", ["get", "村名"], " ", ["get", "よみ"], " ", ["get", "統合"], " ",
          //   ["get", "領分１"], " ", ["get", "領分２"], " ", ["get", "領分３"], " ", ["get", "領分４"], " ", ["get", "領分５"], " ", ["get", "領分６"], " ", ["get", "領分７"], " ", ["get", "領分８"], " ", ["get", "CITY_NAME"], " ", ["get", "PREF_NAME"]];
          const combinedFields = ["concat", ["get", "KEY"], " ", ["get", "令制国"], " ", ["get", "村名"], " ", ["get", "よみ"], " ", ["get", "統合"], " ",
            ["get", "領分１"], " ", ["get", "CITY_NAME"], " ", ["get", "PREF_NAME"]];

          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions];
          map.setFilter('oh-bakumatsu-line', matchCondition)
          map.setFilter('oh-bakumatsu-label', matchCondition)
          map.setFilter('oh-bakumatsu-layer', matchCondition)
        } else {
          map.setFilter('oh-bakumatsu-line', null)
          map.setFilter('oh-bakumatsu-label', null)
          map.setFilter('oh-bakumatsu-layer', null)
        }
      }
      this.$store.state.watchFlg = false
      filterBy(this.s_bakumatsuText)
      //
      this.update()
    },
  },
  watch: {
    s_extFire () {
      this.bakumatsuInput (this.mapName)
      this.onSelectChange (this.s_bakumatsuSelected)
      this.calcKokudaka()
    },
  }
}
</script>
<style scoped>
.highway-range {
  width: 178px;
}
.highway-text {
  font-size: large;
}
</style>

