<template>
    <div :style="menuContentSize">
      <v-select
          v-model="s_busSelected"
          :items="items"
          label="バスルートの色"
          outlined
          @update:modelValue="onSelectChange"
      ></v-select>
    </div>
</template>

<script>

export default {
  name: 'ext-bus',
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
    items: ["標準", "シンプル"],
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_busSelected: {
      get() {
        return this.$store.state.busSelected[this.mapName]
      },
      set(value) {
        this.$store.state.busSelected[this.mapName] = value
      }
    }
  },
  methods: {
    onSelectChange (value) {
      console.log(value)
      const map = this.$store.state[this.mapName]
      switch (value) {
        case '標準':
          map.setPaintProperty('oh-bus-lines', 'line-color', ['get', 'random_color_hash'])
          map.setPaintProperty('oh-bus-points', 'circle-color', ['get', 'random_color_hash'])
          break
        case 'シンプル':
          map.setPaintProperty('oh-bus-lines', 'line-color', 'blue')
          map.setPaintProperty('oh-bus-points', 'circle-color', 'dodgerblue')
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
      }
      this.$store.state.watchFlg = false
      this.update()
    },
    update () {
      try {
        const busSelected = this.s_busSelected
        this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [busSelected]})
      }catch (e) {
        console.log(e)
      }
    },
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
    this.onSelectChange (this.s_busSelected)
  },
  watch: {
    s_watchFlg () {
      this.onSelectChange (this.s_busSelected)
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

