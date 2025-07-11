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
          :menu-props="{
            maxHeight: '300px',
            overflow: 'scroll',
            contentClass: 'scrollable-menu'
          }"
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
        {{ row[0] + ' ' + row[1] + ' ' + row[3] + 'mb' + ' [' + row[5] + ',' + row[4] + ']' }}
      </div>
    </div>
  </v-card>
</template>

<script>
import {addDraw, flipLatitude, recenterGeoJSON, removeNini} from "@/js/downLoad";
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
      { prefId: "01", prefName: "北海道" },
      { prefId: "02", prefName: "青森県" },
      { prefId: "03", prefName: "岩手県" },
      { prefId: "04", prefName: "宮城県" },
      { prefId: "05", prefName: "秋田県" },
      { prefId: "06", prefName: "山形県" },
      { prefId: "07", prefName: "福島県" },
      { prefId: "08", prefName: "茨城県" },
      { prefId: "09", prefName: "栃木県" },
      { prefId: "10", prefName: "群馬県" },
      { prefId: "11", prefName: "埼玉県" },
      { prefId: "12", prefName: "千葉県" },
      { prefId: "13", prefName: "東京都" },
      { prefId: "14", prefName: "神奈川県" },
      { prefId: "15", prefName: "新潟県" },
      { prefId: "16", prefName: "富山県" },
      { prefId: "17", prefName: "石川県" },
      { prefId: "18", prefName: "福井県" },
      { prefId: "19", prefName: "山梨県" },
      { prefId: "20", prefName: "長野県" },
      { prefId: "21", prefName: "岐阜県" },
      { prefId: "22", prefName: "静岡県" },
      { prefId: "23", prefName: "愛知県" },
      { prefId: "24", prefName: "三重県" },
      { prefId: "25", prefName: "滋賀県" },
      { prefId: "26", prefName: "京都府" },
      { prefId: "27", prefName: "大阪府" },
      { prefId: "28", prefName: "兵庫県" },
      { prefId: "29", prefName: "奈良県" },
      { prefId: "30", prefName: "和歌山県" },
      { prefId: "31", prefName: "鳥取県" },
      { prefId: "32", prefName: "島根県" },
      { prefId: "33", prefName: "岡山県" },
      { prefId: "34", prefName: "広島県" },
      { prefId: "35", prefName: "山口県" },
      { prefId: "36", prefName: "徳島県" },
      { prefId: "37", prefName: "香川県" },
      { prefId: "38", prefName: "愛媛県" },
      { prefId: "39", prefName: "高知県" },
      { prefId: "40", prefName: "福岡県" },
      { prefId: "41", prefName: "佐賀県" },
      { prefId: "42", prefName: "長崎県" },
      { prefId: "43", prefName: "熊本県" },
      { prefId: "44", prefName: "大分県" },
      { prefId: "45", prefName: "宮崎県" },
      { prefId: "46", prefName: "鹿児島県" },
      { prefId: "47", prefName: "沖縄県" },
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
      const dir = 'ninizahyoGeojsonZip' + zipFilename.slice(0, 2)
      const zipUrl = `https://kenzkenz.xsrv.jp/ninizahyo/zip/${dir}/${zipFilename}`;
      // alert(zipUrl)
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
      removeNini()
      const address = row[1]
      const lon = row[5]
      const lat = row[4]
      let coordinates = [lon,lat]
      if (lon) {
        const shiftedGeoJSON = recenterGeoJSON(JSON.parse(geojsonText), coordinates);
        addDraw(shiftedGeoJSON, true,true);
      } else {
        axios
            .get('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + address)
            .then(function (response) {
              coordinates = response.data[0].geometry.coordinates
              const shiftedGeoJSON = recenterGeoJSON(JSON.parse(geojsonText), coordinates);
              // 東西の位置関係はあっているが、南北の位置関係が逆でgeojsonができてしまっているので下記で変換。
              // const reversGeojson = flipLatitude(shiftedGeoJSON)
              // addDraw(reversGeojson, true,true);
              addDraw(shiftedGeoJSON, true,true);
            })
      }
    },
  },
  mounted() {
  }
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
