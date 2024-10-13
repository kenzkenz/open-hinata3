<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      高速道路
      <div class="highway-div">
        <input class="highway-range" type="range" v-model="highwayYear" @input="highwayYearInput(mapName)" min="1958" max="2024" step="1"/><br>
        <span class="highway-text">{{highwayYear}}年</span>
      </div>
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'ext-highway',
  props: ['mapName'],
  data: () => ({
    highwayYear:2024,
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_dialogs () {
      return this.$store.state.dialogs.extHighway
    }
  },
  methods: {
    highwayYearInput (mapName) {
      console.log(mapName)
      const map = this.$store.state[mapName]
      function filterBy(year) {
        const eqFilter = ['all', ['==', 'N06_002', year]]
        const ltFilter = ['all', ['<', 'N06_002', year]]
        map.setFilter('oh-highwayLayer-green-lines', ltFilter)
        map.setFilter('oh-highwayLayer-red-lines', eqFilter)
      }
      filterBy(Number(this.highwayYear))
    }
  }
}
</script>
<style scoped>
.highway-range {
  width: 200px;
}
.highway-text {
  font-size: large;
}
</style>

