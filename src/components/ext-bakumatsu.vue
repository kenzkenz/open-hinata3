<template>
    <div :style="menuContentSize">
      <v-text-field label="抽出" v-model="s_bakumatsuText" @input="bakumatsuInput(mapName)" style="margin-top: 10px"></v-text-field>
    </div>
</template>

<script>

export default {
  name: 'ext-bakumatsu',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_bakumatsuText: {
      get() {
        return this.$store.state.bakumatsuText[this.mapName]
      },
      set(value) {
        this.$store.state.bakumatsuText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      try {
        const bakumatsu = this.s_bakumatsuText
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
          const combinedFields = ["concat", ["get", "令制国"], " ", ["get", "村名"], " ", ["get", "よみ"], " ", ["get", "統合"], " ",
            ["get", "領分１"], " ", ["get", "CITY_NAME"], " ", ["get", "PREF_NAME"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions];
          map.setFilter('oh-bakumatsu-line', matchCondition)
          map.setFilter('oh-bakumatsu-label', matchCondition)
          map.setFilter('oh-bakumatsu-layer', matchCondition)
          // map.setPaintProperty('oh-bakumatsu-layer', 'fill-color', [
          //   'case',
          //   matchCondition,
          //   'rgba(255,0,0,0.4)',
          //   // 条件が一致しない場合の色
          //   'rgba(0,0,0,0)'
          // ])
          // map.setFilter('oh-syochiiki-line', [">=", ["index-of", text, ["get", "S_NAME"]], 0])
        } else {
          map.setFilter('oh-bakumatsu-line', null)
          map.setFilter('oh-bakumatsu-label', null)
          map.setFilter('oh-bakumatsu-layer', null)
          // map.setPaintProperty('oh-bakumatsu-layer', 'fill-color', 'rgba(0,0,0,0)')
        }
      }
      filterBy(this.s_bakumatsuText)
      this.update()
    }
  },
  mounted() {
    this.bakumatsuInput (this.mapName)
  },
  watch: {
    s_watchFlg () {
      this.bakumatsuInput (this.mapName)
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

