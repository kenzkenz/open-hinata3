<template>
    <div :style="menuContentSize">
      <div class="input-container">
        <v-btn icon @click="decrease" :disabled="s_zeniKm <= 1" class="expand-btn">−</v-btn>
        <span class="radius-text">半径{{ s_zeniKm }}km</span>
        <v-btn icon @click="increase" :disabled="s_zeniKm >= 50" class="expand-btn">＋</v-btn>
      </div>
      <input class="color-range" type="range" v-model.number="s_zeniKm" @change="update" @input="input" min="1" max="50" step="1"/>
      <div v-if="item.id === 'oh-zeni'" style="margin-top: 0" class="legend-scale">
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
        if (this.item.id === 'oh-zeni') {
          return this.$store.state.zeniKm[this.mapName]
        } else if (this.item.id === 'oh-ntrip') {
          return this.$store.state.ntripKm[this.mapName]
        } else {
          return this.$store.state.mindenKm[this.mapName]
        }
      },
      set(value) {
        if (this.item.id === 'oh-zeni') {
          return this.$store.state.zeniKm[this.mapName] = value
        } else if (this.item.id === 'oh-ntrip') {
          return this.$store.state.ntripKm[this.mapName] = value
        } else {
          return this.$store.state.mindenKm[this.mapName] = value
        }
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_zeniKm,
        ]})
    },
    increase() {
      if (this.s_zeniKm < 50) {
        this.s_zeniKm++;
        this.input()
      }
    },
    decrease() {
      if (this.s_zeniKm > 1) {
        this.s_zeniKm--;
        this.input()
      }
    },
    input () {
      console.log((this.s_zeniKm))
      const map = this.$store.state[this.mapName]
      let geojson
      if (this.item.id === 'oh-zeni') {
        geojson = this.$store.state.zeniGeojson
      } else if (this.item.id === 'oh-ntrip') {
        geojson = this.$store.state.ntripGeojson
      } else {
        geojson = this.$store.state.mindenGeojson
      }
      const radiusInKm = this.s_zeniKm;
      // 各ポイントごとに円を生成し、プロパティを引き継ぐ
      const circleGeoJSON = {
        type: "FeatureCollection",
        features: geojson.features.map(feature => {
          if (feature.geometry) {
            const circle = turf.circle(feature.geometry.coordinates, radiusInKm, {
              steps: 32, // 円の滑らかさ
              units: 'kilometers'
            });
            return {
              type: "Feature",
              properties: feature.properties, // プロパティを引き継ぐ
              geometry: circle.geometry
            };
          }
        })
      };
      if (this.item.id === 'oh-zeni') {
        if (map.getSource('zeni-circle-source')) map.getSource('zeni-circle-source').setData(circleGeoJSON)
      } else if (this.item.id === 'oh-ntrip') {
        if (map.getSource('ntrip-circle-source')) map.getSource('ntrip-circle-source').setData(circleGeoJSON)
      } else {
        if (map.getSource('minden-circle-source')) map.getSource('minden-circle-source').setData(circleGeoJSON)
      }
      this.update()
    },
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
  },
  watch: {
    s_extFire () {
      this.input()
    },
  }
}
</script>
<style scoped>
.input-container {
  display: flex;
  justify-content: space-between; /* 均等配置 */
  align-items: center; /* 垂直方向中央揃え */
  width: 100%; /* 横幅いっぱい */
  gap: 10px; /* ボタンとテキストの間隔 */
}

.expand-btn {
  flex: 1; /* 均等に横幅を広げる */
  text-align: center;
  font-size: 25px;
  cursor: pointer;
}

.radius-text {
  flex: 2; /* テキスト部分をボタンの2倍の幅に */
  text-align: center;
  font-size: 20px;
  cursor: pointer;
}

</style>

