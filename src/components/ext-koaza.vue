<template>
    <div :style="menuContentSize">
      <p>小字名で抽出します。</p>
      <v-text-field label="抽出" v-model="s_koazaText" @input="koazaInput(mapName)" style="margin-top: 10px"></v-text-field>
      <p style="margin-top: -10px;"><a href="https://koaza.net/" target="_blank">関東小字地図</a></p>
    </div>
</template>

<script>
export default {
  name: 'ext-koaza',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text','font-size':'16px'}
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_koazaText: {
      get() {
        return this.$store.state.koazaText[this.mapName]
      },
      set(value) {
        this.$store.state.koazaText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      try {
        const koazaText = this.s_koazaText
        this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [koazaText]})
      }catch (e) {
        console.log(e)
      }
    },
    koazaInput (mapName) {
      const map = this.$store.state[mapName]
      function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
          const combinedFields = ["concat", ["get", "KOAZA_NAME"], " ", ["get", "MURA_NAME"], " " ,["get", "GUN_NAME"], ["get", "MURA_NAME"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions]
          console.log(matchCondition)
          map.setFilter('oh-koaza', matchCondition)
          map.setFilter('oh-koaza-line', matchCondition)
          map.setFilter('oh-koaza-label', matchCondition)
          map.setFilter('oh-mura', matchCondition)
          map.setFilter('oh-mura-line', matchCondition)
          map.setFilter('oh-mura-center-label', matchCondition)
        } else {
          map.setFilter('oh-koaza', null)
          map.setFilter('oh-koaza-line', null)
          map.setFilter('oh-koaza-label', null)
          map.setFilter('oh-mura', null)
          map.setFilter('oh-mura-line', null)
          map.setFilter('oh-mura-center-label', null)
        }
      }
      filterBy(this.s_koazaText)
      this.$store.state.watchFlg = false
      this.update()
    }
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
    this.koazaInput(this.mapName)
  },
  watch: {
    s_watchFlg () {
      this.koazaInput(this.mapName)
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

