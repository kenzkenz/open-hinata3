<template>
  <div :style="menuContentSize">
    <div class="sea^level-div">
      <input class="sea-level-range" type="range" v-model.number="s_seaLevel" @change="update" @input="seaLevelInput(mapName)" min="1" max="100" step="1"/><br>
      <span class="sea-level--text">{{s_seaLevel}}</span>
    </div>
  </div>
</template>

<script>

export default {
  name: 'ext-bus',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_seaLevel: {
      get() {
        return this.$store.state.seaLevel[this.mapName]
      },
      set(value) {
        this.$store.state.seaLevel[this.mapName] = value
      }
    }
  },
  methods: {
    update () {
      // try {
      //   const busSelected = this.s_busSelected
      //   this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [busSelected]})
      // }catch (e) {
      //   console.log(e)
      // }
    },
    seaLevelInput (mapName) {
      const map = this.$store.state[mapName]
      const seaLevel = Number(this.s_seaLevel)
      map.setPaintProperty("sea-level", "color-relief-color", [
        "interpolate",
        ["linear"],
        ["elevation"],
        seaLevel,
        "rgba(0,0,152,0.5)",
        seaLevel + 0.01,
        "rgba(0,0,0,0)",
      ]);
    }
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
    // this.onSelectChange (this.s_busSelected)
  },
  watch: {
    s_watchFlg () {
      // this.onSelectChange (this.s_busSelected)
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

