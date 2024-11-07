<template>
    <div :style="menuContentSize">
      <v-text-field label="抽出" v-model="s_bakumatsuText3d" @input="bakumatsuInput(mapName)" style="margin-top: 10px"></v-text-field>
      <div>
        <p v-html="htmlKokudaka"></p>
      </div>
    </div>
</template>

<script>
import axios from "axios";
export default {
  name: 'ext-bakumatsu-3d',
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
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    htmlKokudaka () {
      return '石高の総計=' + Math.round(this.kokudakakei[this.mapName]).toLocaleString() +
          '（' + Math.round(this.sonsu[this.mapName]).toLocaleString() + '村）'
    },
    s_bakumatsuText3d: {
      get() {
        return this.$store.state.bakumatsuText3d[this.mapName]
      },
      set(value) {
        this.$store.state.bakumatsuText3d[this.mapName] = value
        this.calcKokudaka()
      }
    },
  },
  methods: {
    calcKokudaka () {
      const vm = this
      this.kokudakakei[this.mapName] = 0
      let parameter
      if (this.s_bakumatsuText3d) {
        parameter = this.s_bakumatsuText3d.replace(/\u3000/g,' ').trim()
      } else {
        parameter = this.s_bakumatsuText3d.trim()
      }
      // const parameter = 'かみくぜ'
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
    update () {
      try {
        const bakumatsu = this.s_bakumatsuText3d
        this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [bakumatsu]})
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
          const combinedFields = ["concat", ["get", "KEY"], " ", ["get", "令制国"], " ", ["get", "村名"], " ", ["get", "よみ"], " ", ["get", "統合"], " ",
            ["get", "領分１"], " ", ["get", "CITY_NAME"], " ", ["get", "PREF_NAME"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions];
          map.setFilter('oh-bakumatsu-kokudaka-height', matchCondition)
        } else {

          map.setFilter('oh-bakumatsu-kokudaka-height', null)
        }
      }
      filterBy(this.s_bakumatsuText3d)
      this.$store.state.watchFlg = false
      this.update()
    }
  },
  mounted() {
    this.bakumatsuInput (this.mapName)
    this.calcKokudaka()
  },
  watch: {
    s_watchFlg () {
      this.bakumatsuInput (this.mapName)
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

