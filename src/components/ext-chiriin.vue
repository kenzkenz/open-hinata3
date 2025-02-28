<template>

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

</style>

