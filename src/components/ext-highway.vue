<template>
  <div :style="menuContentSize">
    高速道路
    <div class="highway-div">
      <input class="highway-range" type="range" v-model.number="s_highwayYear" @change="update" @input="highwayYearInput(mapName)" min="1958" max="2024" step="1"/><br>
      <span class="highway-text">{{s_highwayYear}}年</span>
    </div>
  </div>
</template>

<script>

export default {
  name: 'ext-highway',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_selectedLayers () {
      return this.$store.state.selectedLayers
    },
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_dialogs () {
      return this.$store.state.dialogs.extHighway
    },
    s_highwayYear: {
      get() {
        return this.$store.state.highwayYear[this.mapName]
      },
      set(value) {
        this.$store.state.highwayYear[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.s_watchFlg = false
      const highwayYear = this.s_highwayYear
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [highwayYear]})
    },
    highwayYearInput (mapName) {
      const map = this.$store.state[mapName]
      function filterBy(year) {
        const eqFilter = ['all', ['==', 'N06_002', year]]
        const ltFilter = ['all', ['<', 'N06_002', year]]
        map.setFilter('oh-highwayLayer-green-lines', ltFilter)
        map.setFilter('oh-highwayLayer-red-lines', eqFilter)
      }
      filterBy(Number(this.s_highwayYear))
    }
  },
  mounted() {
    this.highwayYearInput (this.mapName)
  },
  watch: {
    s_selectedLayers: {
      handler() {
        this.highwayYearInput (this.mapName)
      },
      deep: true
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

