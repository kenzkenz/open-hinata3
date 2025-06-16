<template>
  <div :style="menuContentSize">
    <div class="sea-level-div">
      <input class="sea-level-range" type="range" v-model.number="s_seaLevel" @change="update" @input="seaLevelInput(mapName)" min="1" max="1000" step="1"/><br>
      <div style="text-align: center" class="sea-level-text">{{s_seaLevel}}m上昇</div>
      <div style="margin-top: 10px;font-size: 16px;" v-html="item.attribution"></div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'ext-sea-level',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size': '20px'}
  }),
  computed: {
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
      const seaLevel = this.s_seaLevel
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [seaLevel]})
    },
    seaLevelInput (mapName) {
      try {
        const map = this.$store.state[mapName]
        const seaLevel = Number(this.s_seaLevel)
        map.setPaintProperty("oh-sea-level", "color-relief-color", [
          "interpolate",
          ["linear"],
          ["elevation"],
          seaLevel,
          "rgba(0,0,152,0.5)",
          seaLevel + 0.01,
          "rgba(0,0,0,0)",
        ]);
      }catch (e) {
        console.log(e)
      }
    }
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: 16px;">' + this.item.label + '</span>'
    this.$nextTick(() => {
      setTimeout(() => {
        this.seaLevelInput(this.mapName)
      },200)
    })
  },
}
</script>
<style scoped>
</style>

