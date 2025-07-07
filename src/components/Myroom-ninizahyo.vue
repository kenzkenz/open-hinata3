<template>
  <v-card>
    <div style="margin-bottom: 10px;" class="d-flex align-center">
      <v-select
          class="scrollable-content"
          v-model="pref"
          :items="prefs"
          item-title="prefName"
          item-value="prefId"
          label="都道府県を選択してください"
          outlined
          @update:modelValue="prefChange"
      ></v-select>
      <v-text-field
          v-model="filterText"
          label="フィルター"
          outlined
          dense
          class="mx-2"
          @input="applyFilter"
      ></v-text-field>
<!--      <v-btn color="primary" @click="applyFilter">抽出</v-btn>-->
    </div>
    <div>
      <div
          class="data-container"
          v-for="(row, idx) in filteredRows"
          :key="idx"
          :class="{ selected: selectedRowIndex === idx }"
          @click="handleRowClick(row, idx)"
      >
        {{ row[0] + ' ' + row[1] + ' ' + row[2] + 'mb' }}
      </div>
    </div>
  </v-card>
</template>

<script>
import {addDraw, recenterGeoJSON, removeNini} from "@/js/downLoad";
import JSZip from 'jszip';
import axios from "axios";

export default {
  name: "myroom-ninizahyo",
  props: {
    layerName: String,
    mapInstance: Object,
  },
  data: () => ({
    pref: null,
    prefs: [
      { prefId: "13", prefName: "東京都" },
      { prefId: "22", prefName: "静岡県" },
      { prefId: "26", prefName: "京都府" },
      { prefId: "28", prefName: "兵庫県" },
      { prefId: "29", prefName: "奈良県" },
      { prefId: "34", prefName: "広島県" },
      { prefId: "40", prefName: "福岡県" },
      { prefId: "45", prefName: "宮崎県" },
    ],
    rows: [],
    filteredRows: [],
    filterText: "",
    selectedRowIndex: null,
  }),
  methods: {
    async prefChange(newPref) {
      this.pref = newPref;
      await this.loadCsv(newPref);
      this.selectedRowIndex = null;
      this.filterText = "";
    },
    async loadCsv(pref) {
      try {
        const res = await fetch(
            `https://kenzkenz.xsrv.jp/ninizahyo/csv/${pref}.csv`
        );
        const text = await res.text();
        this.rows = text
            .trim()
            .split("\n")
            .map((line) => line.split(","));
        // 初期表示は全行
        this.filteredRows = this.rows.slice(1);
      } catch (e) {
        console.error("CSV load error:", e);
        this.rows = [];
        this.filteredRows = [];
      }
    },
    applyFilter() {
      if (!this.filterText) {
        this.filteredRows = this.rows.slice(1);
      } else {
        const keyword = this.filterText;
        this.filteredRows = this.rows
            .slice(1)
            .filter((row) => row.some((cell) => cell.includes(keyword)));
      }
      this.selectedRowIndex = null;
    },
    async handleRowClick(row, idx) {
      this.selectedRowIndex = idx;
      console.log("Clicked row", idx + 2, row[0]); // ヘッダー行を飛ばしているため


      const zipFilename = row[0];
      const zipUrl = `https://kenzkenz.xsrv.jp/ninizahyo/geojson/${zipFilename}`;
      // ZIP を ArrayBuffer 形式で取得
      const resp = await fetch(zipUrl);
      const buf = await resp.arrayBuffer();
      // JSZip で読み込み
      const zip = await JSZip.loadAsync(buf);
      // 中の .geojson ファイルを探す
      const geojsonName = zipFilename.replace(/\.zip$/i, '.geojson');
      let file = zip.file(geojsonName);
      if (!file) {
        // 見つからなければ、アーカイブ内の最初の .geojson を使う
        const candidates = zip.file(/\.geojson$/i);
        if (candidates.length === 0) {
          throw new Error(`${zipFilename} に .geojson が見つかりませんでした`);
        }
        file = candidates[0];
      }
      const geojsonText = await file.async('string');



      // const geojsonFilename = row[0].replace(".zip", ".geojson");
      // const response = await fetch(
      //     `https://kenzkenz2.xsrv.jp/ninizahyo/geojson/${geojsonFilename}`
      // );
      // const geojsonText = await response.text();
      const address = row[1]
      removeNini()
      axios
          .get('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + address)
          .then(function (response) {
            const coordinates = response.data[0].geometry.coordinates
            const shiftedGeoJSON = recenterGeoJSON(JSON.parse(geojsonText), coordinates);
            // 東西の位置関係はあっているが、南北の位置関係が逆でgeojsonができてしまっているので下記で変換。
            // const reversGeojson = flipLatitude(shiftedGeoJSON)
            // addDraw(reversGeojson, true,true);
            addDraw(shiftedGeoJSON, true,true);

          })
    },
  },
};
</script>

<style scoped>
.data-container {
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  position: relative;
  cursor: pointer;
  background-color: rgba(132, 163, 213, 0.3);
}
.data-container:hover {
  background-color: #f0f8ff;
}
/* 選択時は少し濃いめの青に */
.data-container.selected {
  background-color: #4682b4;
  color: white;
}
</style>
