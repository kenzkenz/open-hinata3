<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      半径{{s_zeniKm}}km
      <input class="color-range" type="range" v-model.number="s_zeniKm" @change="update" @input="input" min="1" max="50" step="1"/>
      <div class="legend-scale">
        <ul class="legend-labels">
          <li><span style="background:hsl(240, 100%, 50%);"></span>稼働中</li>
          <li><span style="background:hsl(230, 100%, 55%);"></span>休止中</li>
        </ul>
      </div>
      <div v-html="item.attribution"></div>
    </div>
</template>

<script>
export default {
  name: 'ext-zeni',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text','font-size':'large'},
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_zeniKm: {
      get() {
        return this.$store.state.zeniKm[this.mapName]
      },
      set(value) {
        return this.$store.state.zeniKm[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_zeniKm,
        ]})
    },
    input () {
      console.log((this.s_zeniKm))
      // const map = this.$store.state[this.mapName]
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

