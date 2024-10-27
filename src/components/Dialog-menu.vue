<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      標高強調
      <div class="range-div">
        {{s_terrainLevel}}倍<br>
        <input type="range" min="1" max="10" step="0.1" class="range" v-model.number="s_terrainLevel" @input="terrainLevelInput"/>
      </div>
<!--      <button @click="aaa">aaa</button>-->
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'Dialog-menu',
  props: ['mapName'],
  data: () => ({
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_terrainLevel: {
      get() {
        return this.$store.state.terrainLevel
      },
      set(value) {
        this.$store.state.terrainLevel = value

      }
    },
    s_dialogs () {
      return this.$store.state.dialogs.menuDialog
    }
  },
  methods: {
    aaa () {
      async function mergeGeoJSONTiles(z, xRange, yRange) {
        let mergedFeatures = [];

        // 日本全域をカバーするタイル範囲を取得
        for (let x = xRange[0]; x <= xRange[1]; x++) {
          for (let y = yRange[0]; y <= yRange[1]; y++) {
            const url = `https://mapdata.qchizu.xyz/vector/mlit_road2019/bridge2/${z}/${x}/${y}.geojson`;

            try {
              const response = await fetch(url);
              if (!response.ok) {
                console.warn(`Failed to fetch tile ${z}/${x}/${y}`);
                continue;
              }

              const tileGeoJSON = await response.json();
              if (tileGeoJSON.features) {
                mergedFeatures = mergedFeatures.concat(tileGeoJSON.features);
              }
            } catch (error) {
              console.error(`Error fetching tile ${z}/${x}/${y}:`, error);
            }
          }
        }

        // マージしたGeoJSONデータ
        const mergedGeoJSON = {
          type: "FeatureCollection",
          features: mergedFeatures
        };

        // ダウンロード用にJSONファイルを生成
        const blob = new Blob([JSON.stringify(mergedGeoJSON)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `merged-geojson-${z}.geojson`;
        a.click();
        URL.revokeObjectURL(url);
      }
      // 宮崎市全域をカバーするズームレベル14の範囲で実行
      // mergeGeoJSONTiles(14, [14160, 14190], [6630, 6650]);
      mergeGeoJSONTiles(14, [13500, 14500], [6200, 6700]);


    },
    terrainLevelInput () {
      this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
      this.$store.state.map02.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
    }
  }
}
</script>
<style scoped>

</style>

