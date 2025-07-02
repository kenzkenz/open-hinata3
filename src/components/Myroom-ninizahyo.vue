<template>
  <v-card>
    <div style="margin-bottom: 10px;">

      <v-select class="scrollable-content"
                v-model="pref"
                :items="prefs"
                item-title="prefName"
                item-value="prefId"
                label="都道府県を選択してください"
                outlined
                @update:modelValue="prefChange"
      ></v-select>
      <div>
        <!-- タイトル行をスキップして2行目以降を描画 -->
        <div
            class="data-container"
            v-for="(row, index) in rows.slice(1)"
            :key="index"
            @click="handleRowClick(row, index + 1)"
        >
          {{ row.join(', ') }}
        </div>
      </div>
    </div>
  </v-card>
</template>

<script>


export default {
  name: 'myroom-ninizahyo',
  props: {
    layerName: {
      type: String,
      default: ''
    },
    mapInstance: {
      type: Object,
      default: null // マップが不要な場合に対応
    }
  },
  data: () => ({
    pref: null,
    prefs: [
      {prefId: '28',prefName:'兵庫県'},
      {prefId: '45',prefName:'宮崎県'},
    ],
    rows: [],
  }),
  computed: {

  },
  methods: {
    async prefChange(newPref) {
      this.pref = newPref;
      await this.loadCsv(newPref);
    },
    async loadCsv(pref) {
      try {
        const response = await fetch(`https://kenzkenz2.xsrv.jp/ninizahyo/csv/${pref}.csv`);
        const text = await response.text();
        // Split into lines, then split each line by comma
        this.rows = text
            .trim()
            .split('\n')
            .map(line => line.split(','));
      } catch (error) {
        console.error('CSV load error:', error);
        this.rows = [];
      }
    },
    handleRowClick(row, index) {
      // this.$emit('row-click', row[0]);
      console.log('Clicked row', index, row[0]);
      const geojsonFilename = row[0].replace('.zip','.geojson')
      alert(geojsonFilename)
    },
  },
  watch:{
  },
  mounted() {
  }
}
</script>

<style scoped>
.data-container {
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  position: relative;
  cursor: pointer;
  background-color: rgba(132,163,213,0.3);
}
.data-container:hover {
  background-color: #f0f8ff;
}
.close-btn {
  position: absolute;
  top: -10px;
  right: 10px;
  color: black;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 30px;
}
.close-btn:hover {
  color: red;
}
.data-container.selected {
  background-color: #b2ebf2;
}
.file-count-badge {
  margin-left: 4px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}
</style>