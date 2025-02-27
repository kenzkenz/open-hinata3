<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>
        座標系選択
      </v-card-title>
      <v-card-text>
        <v-select class="scrollable-content"
                  v-model="s_zahyokei"
                  :items="items"
                  label="座標系を選択してください"
                  outlined
        ></v-select>
        <v-btn @click="saveSimaGaiku">SIMA保存</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogForDxf" max-width="500px">
    <v-card>
      <v-card-title style="text-align: right">
        <v-icon @click="dialogForDxf = false">mdi-close</v-icon>
      </v-card-title>
      <v-card-text>
        <p style="margin-bottom: 10px;">レイヤーを選択してください。</p>
        <v-btn @click="saveDxf1">出力開始</v-btn>
        <v-btn style="margin-left: 10px;" @click="allon">全てオン</v-btn>
        <v-btn style="margin-left: 10px;" @click="alloff">全てオフ</v-btn>
        <div style="margin-bottom: 20px;">
          <div v-for="layerId in filteredLayerIds" :key="layerId">
            <v-switch style="height: 40px; width: 90%;" color="primary"
                      v-model="layerVisibility[layerId]"
                      :label="layerId.split('-')[3]"
                      @change="toggleLayer(layerId)"
            ></v-switch>
          </div>
        </div>
        <v-btn @click="saveDxf1">出力開始</v-btn>
        <v-btn style="margin-left: 10px;" @click="allon">全てオン</v-btn>
        <v-btn style="margin-left: 10px;" @click="alloff">全てオフ</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="dialogForDxf = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <div :style="menuContentSize">
    <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
<!--    <v-btn style="margin-top: 0px;margin-left: 0px;margin-bottom: 10px;" @click="saveSimaGaiku">sima保存</v-btn>-->
    <v-btn style="margin-top: 0px;margin-left: 0px;margin-bottom: 10px;" @click="saveDxf0">dxf保存</v-btn>
<!--    <hr>-->
    <div v-html="item.attribution"></div>
  </div>
</template>

<script>
import {
  saveDxfForChiriin
} from "@/js/downLoad";

export default {
  name: 'ext-chiriin',
  props: ['mapName','item'],
  data: () => ({
    layerVisibility: {},
    filteredLayerIds: [],
    dialogForDxf: false,
    layerId: '',
    selectedItem: null,
    isAndroid: false,
    items: [
      '公共座標1系', '公共座標2系', '公共座標3系',
      '公共座標4系', '公共座標5系', '公共座標6系',
      '公共座標7系', '公共座標8系', '公共座標9系',
      '公共座標10系', '公共座標11系', '公共座標12系',
      '公共座標13系', '公共座標14系', '公共座標15系',
      '公共座標16系', '公共座標17系', '公共座標18系',
      '公共座標19系'
    ],
    kei: '',
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'hidden', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_userId () {
      return this.$store.state.userId
    },
    s_extFire () {
      return this.$store.state.extFire
    },
    s_zahyokei: {
      get() {
        return this.$store.state.zahyokei
      },
      set(value) {
        this.$store.state.zahyokei = value
      }
    },
    s_isRenzoku: {
      get() {
        return this.$store.state.isRenzoku
      },
      set(value) {
        this.$store.state.isRenzoku = value
      }
    },
  },
  methods: {
    // update () {
    //   this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
    //       this.s_tokijyoText
    //     ]})
    // },
    toggleLayer(layerId) {
      console.log(`Layer ${layerId} visibility: ${this.layerVisibility[layerId]}`);
      // MapLibre のレイヤー表示切り替えを実装
      // map.setLayoutProperty(layerId, "visibility", this.layerVisibility[layerId] ? "visible" : "none");
    },
    checkDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      console.log(/android/i.test(userAgent))
      this.isAndroid = /android/i.test(userAgent);
    },
    allon () {
      this.filteredLayerIds.forEach((id) => {
        this.layerVisibility[id] = true;
      });
    },
    alloff () {
      this.filteredLayerIds.forEach((id) => {
        this.layerVisibility[id] = false;
      });
    },
    saveDxf0 () {
      const map = this.$store.state[this.mapName]
      const allLayers = map.getStyle().layers;
      this.filteredLayerIds = allLayers
          .map(layer => layer.id) // レイヤーのIDのみ取得
          .filter(id => id.startsWith(this.item.id));
      // 初期状態をすべて true に設定
      this.filteredLayerIds.forEach((id) => {
        this.layerVisibility[id] = true;
      });
      this.dialogForDxf = true
    },
    saveDxf1 () {
      function getTrueKeys(obj) {
        return Object.keys(obj).filter(key => obj[key] === true);
      }
      const layerIds = getTrueKeys(this.layerVisibility)
      const map = this.$store.state[this.mapName]
      saveDxfForChiriin(map,layerIds)
    },
  },
  created() {
    this.checkDevice();
  },
  mounted() {

  },
  watch: {
    s_extFire () {
      // this.change()
    },
  }
}
</script>
<style scoped>
.select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: auto;
  margin: 20px auto;
}

.select-label {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.custom-select {
  appearance: none; /* ブラウザのデフォルトスタイルを無効化 */
  background: linear-gradient(to right, #f0f4ff, #e0eaff);
  border: 1px solid #a0c4ff;
  border-radius: 8px;
  padding: 10px 15px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.custom-select:hover {
  border-color: #4d94ff;
}

.custom-select:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 5px rgba(26, 115, 232, 0.5);
}

.custom-select option {
  padding: 10px;
}

select {
  position: relative;
  z-index: 1000; /* 他の要素の上に表示 */
  direction: ltr; /* 左から右に展開 */
}

</style>

