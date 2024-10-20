<template>
<!--  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">-->
    <div :style="menuContentSize">
      高速道路
      <div class="highway-div">
        <input class="highway-range" type="range" v-model="s_highwayYear" @change="update" @input="highwayYearInput(mapName)" min="1958" max="2024" step="1"/><br>
        <span class="highway-text">{{s_highwayYear}}年</span>
      </div>
    </div>
<!--  </Dialog>-->
</template>

<script>

export default {
  name: 'ext-highway',
  props: ['mapName','item'],
  data: () => ({
    // highwayYear:2024,
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
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
      const highwayYear = this.s_highwayYear
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [highwayYear]});
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
      // this.update()
    }
  },
  mounted() {
    this.highwayYearInput (this.mapName)
  },
  watch: {
    s_highwayYear () {
    }
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

