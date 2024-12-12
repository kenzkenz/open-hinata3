<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      <v-switch class="custom-switch" v-model="s_isPaintBunsuirei" @change="changePaint" label="塗りつぶし" color="primary" />
      <v-switch class="custom-switch" v-model="s_isKasen" @change="changePaint" label="河川" color="primary" />
      <br>
      <a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W07.html' target='_blank'>国土数値情報</a>    </div>
</template>

<script>
export default {
  name: 'ext-bunsuirei',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_isPaintBunsuirei: {
      get() {
        if (this.$store.state.isPaintBunsuirei[this.mapName] === 'true') {
          return true
        } else if (this.$store.state.isPaintBunsuirei[this.mapName] === 'false') {
          return false
        } else {
          return this.$store.state.isPaintBunsuirei[this.mapName]
        }
      },
      set(value) {
        return this.$store.state.isPaintBunsuirei[this.mapName] = value
      }
    },
    s_isKasen: {
      get() {
        if (this.$store.state.isKasen[this.mapName] === 'true') {
          return true
        } else if (this.$store.state.isKasen[this.mapName] === 'false') {
          return false
        } else {
          return this.$store.state.isKasen[this.mapName]
        }
      },
      set(value) {
        return this.$store.state.isKasen[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_isPaintBunsuirei,
          this.s_isKasen,
        ]})
    },
    changePaint () {
      const map = this.$store.state[this.mapName]
      if (!this.s_isPaintBunsuirei) {
        map.setPaintProperty('oh-bunsuirei', 'fill-color', 'rgba(0, 0, 0, 0)')
        map.setPaintProperty("oh-bunsuirei-line", "line-width", 4)
      } else {
        map.setPaintProperty('oh-bunsuirei', 'fill-color', ['get', 'random_color'])
        map.setPaintProperty("oh-bunsuirei-line", "line-width", [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0,
          11, 0.5
        ]);
      }
      if (!this.s_isKasen) {
        map.setFilter("oh-kasen", ['==', 'nonexistent-field', true])
        map.setFilter("oh-kasen-label", ['==', 'nonexistent-field', true])
      } else {
        map.setFilter("oh-kasen", null)
        map.setFilter("oh-kasen-label", null)
      }


      this.update()
    },
  },
  watch: {
    s_extFire () {
      this.changePaint(this.mapName)
    },
  }
}
</script>
<style scoped>

</style>

