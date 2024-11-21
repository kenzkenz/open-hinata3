<template>
    <div :style="menuContentSize">
      <v-text-field label="小地域名で抽出" v-model="s_syochiikiNameText" @input="syochiikiInput(mapName)" style="margin-top: 10px"></v-text-field>
    </div>
</template>

<script>

export default {
  name: 'ext-syochiiki',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_syochiikiNameText: {
      get() {
        return this.$store.state.syochiikiNameText[this.mapName]
      },
      set(value) {
        this.$store.state.syochiikiNameText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      try {
        const syochiikiNameText = this.s_syochiikiNameText
        this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [syochiikiNameText]})
      }catch (e) {
        console.log(e)
      }
    },
    syochiikiInput (mapName) {
      const map = this.$store.state[mapName]
      function filterBy(text) {
        console.log(text)
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 各単語に対して index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, ["get", "S_NAME"]], 0])
          // いずれかの単語が含まれる場合の条件を作成 (どれか1つの条件が true であればOK)
          const matchCondition = ["any", ...filterConditions]
          map.setFilter('oh-syochiiki-line', matchCondition)
          map.setFilter('oh-syochiiki-label', matchCondition)
          map.setFilter('oh-syochiiki-layer', matchCondition)
          map.setPaintProperty('oh-syochiiki-layer', 'fill-color', [
            'case',
            matchCondition,
            'rgba(255,0,0,0.4)',
            // 条件が一致しない場合の色
            'rgba(0,0,0,0)'
          ])
          // map.setFilter('oh-syochiiki-line', [">=", ["index-of", text, ["get", "S_NAME"]], 0])
        } else {
          map.setFilter('oh-syochiiki-line', null)
          map.setFilter('oh-syochiiki-label', null)
          map.setFilter('oh-syochiiki-layer', null)
          map.setPaintProperty('oh-syochiiki-layer', 'fill-color', 'rgba(0,0,0,0)')
        }
      }
      filterBy(this.s_syochiikiNameText)
      this.update()
    }
  },
  mounted() {
    this.syochiikiInput (this.mapName)
  },
  watch: {
    s_watchFlg () {
      // alert(1111)
      this.syochiikiInput (this.mapName)
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

