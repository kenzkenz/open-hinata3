<template>
    <div :style="menuContentSize">
      鉄道時系列
      <div class="highway-div">
        <input class="highway-range" type="range" v-model.number="s_tetsudojikeiretsuYear" @change="update" @input="highwayYearInput(mapName)" min="1950" max="2024" step="1"/><br>
        <span class="highway-text">{{s_tetsudojikeiretsuYear}}年</span>
      </div>
    </div>
</template>

<script>

export default {
  name: 'ext-tetsudojikeiretsu',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_tetsudojikeiretsuYear: {
      get() {
        return this.$store.state.tetsudojikeiretsuYear[this.mapName]
      },
      set(value) {
        this.$store.state.tetsudojikeiretsuYear[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      const highwayYear = this.s_tetsudojikeiretsuYear
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [highwayYear]});
    },
    highwayYearInput (mapName) {
      const map = this.$store.state[mapName]
      function filterBy(year) {
        const filter = ['all',
          ['<=', ['number', ['to-number', ['get', 'N05_005b']]], year],
          ['>=', ['number', ['to-number', ['get', 'N05_005e']]], year]]
        map.setFilter('oh-tetsudojikeiretsu-blue-lines', filter)
        map.setFilter('oh-tetsudojikeiretsu-points', filter)
      }
      filterBy(Number(this.s_tetsudojikeiretsuYear))
      // this.update()
    }
  },
  mounted() {
    this.highwayYearInput (this.mapName)
  },
  watch: {
    s_watchFlg () {
      this.highwayYearInput (this.mapName)
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

