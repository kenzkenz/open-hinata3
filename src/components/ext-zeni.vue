<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      半径{{s_zeniKm}}km
      <input class="color-range" type="range" v-model.number="s_zeniKm" @change="update" @input="input" min="1" max="50" step="1"/>
      <div style="margin-top: 0" class="legend-scale">
        <ul class="legend-labels">
          <li><span style="background:red;"></span>公開</li>
          <li><span style="background:blue;"></span>休止</li>
        </ul>
      </div>
      <div v-html="item.attribution"></div>
    </div>
</template>

<script>
import * as turf from "@turf/turf";

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
      const map = this.$store.state[this.mapName]
      const radiusInKm = this.s_zeniKm;
      // 各ポイントごとに円を生成し、プロパティを引き継ぐ
      const circleGeoJSON = {
        type: "FeatureCollection",
        features: this.$store.state.zeniGeojson.features.map(feature => {
          const circle = turf.circle(feature.geometry.coordinates, radiusInKm, {
            steps: 32, // 円の滑らかさ
            units: 'kilometers'
          });
          return {
            type: "Feature",
            properties: feature.properties, // プロパティを引き継ぐ
            geometry: circle.geometry
          };
        })
      };
      map.getSource('zeni-circle-source').setData(circleGeoJSON)
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

