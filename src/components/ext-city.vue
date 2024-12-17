<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      <v-switch class="custom-switch" v-model="s_isPaintCity" @change="changePaint" label="塗りつぶし" color="primary" />
      <br>
<!--      <v-text-field label="水系名、水系コードで抽出" v-model="s_suikeiText" @input="changePaint" style="margin-top: 10px"></v-text-field>-->
    </div>
</template>

<script>
export default {
  name: 'ext-city',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_isPaintCity: {
      get() {
        if (this.$store.state.isPaintCity[this.mapName].t09 === 'true') {
          return true
        } else if (this.$store.state.isPaintCity[this.mapName].t09 === 'false') {
          return false
        } else {
          return this.$store.state.isPaintCity[this.mapName].t09
        }
      },
      set(value) {
        return this.$store.state.isPaintCity[this.mapName].t09 = value
      }
    },
    s_suikeiText: {
      get() {
        return this.$store.state.suikeiText[this.mapName]
      },
      set(value) {
        this.$store.state.suikeiText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_isPaintCity
        ]})
    },
    changePaint () {
      const map = this.$store.state[this.mapName]
      if (!this.s_isPaintCity) {
        map.setPaintProperty('oh-city-t09', 'fill-color', 'rgba(0, 0, 0, 0)')
        map.setPaintProperty("oh-city-t09-line", "line-color", 'black')
        map.setPaintProperty("oh-city-t09-line", "line-width", 4)
      } else {
        map.setPaintProperty('oh-city-t09', 'fill-color', ['get', 'random_color'])
        map.setPaintProperty("oh-city-t09-line", "line-color", 'black')
        map.setPaintProperty("oh-city-t09-line", "line-width", [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0,
          11, 0.5
        ]);
      }
      this.update()
    },
  },
  watch: {
    s_extFire () {
      this.changePaint()
    },
  }
}
</script>
<style scoped>

</style>

