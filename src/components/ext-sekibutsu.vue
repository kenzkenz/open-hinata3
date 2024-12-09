<template>
    <div :style="menuContentSize">
      <v-text-field label="抽出" v-model="s_sekibutsuText" @input="input()" style="margin-top: 10px"></v-text-field>
    </div>
</template>

<script>
export default {
  name: 'ext-sekibutsu',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_sekibutsuText: {
      get() {
        return this.$store.state.sekibutsuText[this.mapName]
      },
      set(value) {
        this.$store.state.sekibutsuText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_sekibutsuText
        ]})
    },
    input () {
      const map = this.$store.state[this.mapName]
      function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
          const combinedFields = ["concat",
            ["get", "figure"], " ",
            ["get", "place"], " " ,
            ["get", "type"], " " ,
            ["get", "contributor"], " ",
            ["get", "address"], " " ,
            ["get", "tag"]
          ];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions]
          console.log(matchCondition)
          map.setFilter('oh-sekibutsu', matchCondition)
        } else {
          map.setFilter('oh-sekibutsu', null)
        }
      }
      filterBy(this.s_sekibutsuText)
      this.update()
    },
  },
  watch: {
    s_extFire () {
      this.input()
    },
  }
}
</script>
<style scoped>
</style>

