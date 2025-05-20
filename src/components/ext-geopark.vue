<template>
    <div :style="menuContentSize">
      <v-switch style="height: 50px;" v-model="s_isPaintGeopark" @change="changePaint" label="塗りつぶし" color="primary" />
      <a href="https://tosashimizu-geo.jp/leaflet/geopark/geoparkarea.html" target="_blank">ジオパークエリア</a><br>
      土井恵治氏 土佐清水ジオパーク推進協議会事務局
    </div>
</template>

<script>
export default {
  name: 'ext-geopark',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_isPaintGeopark: {
      get() {
        if (this.$store.state.isPaintGeopark[this.mapName] === 'true') {
          return true
        } else if (this.$store.state.isPaintGeopark[this.mapName] === 'false') {
          return false
        } else {
          return this.$store.state.isPaintGeopark[this.mapName]
        }
      },
      set(value) {
        return this.$store.state.isPaintGeopark[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_isPaintGeopark
        ]})
    },
    changePaint () {
      const map = this.$store.state[this.mapName]
      if (!this.s_isPaintGeopark) {
        map.setPaintProperty('oh-geopark-layer', 'fill-color', 'rgba(0, 0, 0, 0)');
      } else {
        map.setPaintProperty('oh-geopark-layer', 'fill-color', [
          'match',
          ['get', 'attr'],
          'GGP', 'rgba(255, 182, 193, 0.8)', // 淡い赤色
          'JGP', 'rgba(102, 187, 106, 0.8)', // 既存の色
          'rgba(200, 200, 200, 0.8)' // デフォルト色
        ]);
      }
      this.update()
    },
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
    console.log(this.s_isPaintGeopark)
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

