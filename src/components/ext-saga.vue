<template>
  <div :style="menuContentSize">
    <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
    <v-btn style="margin-top: 0px;margin-left: 0px;margin-bottom: 10px;" @click="saveSima">sima保存</v-btn>
    <div v-html="item.attribution"></div>
  </div>
</template>

<script>
import {
  saveDxfForChiriin, savePointSimaForSaga
} from "@/js/downLoad";

export default {
  name: 'ext-saga',
  props: ['mapName','item'],
  data: () => ({
    layerVisibility: {},
    filteredLayerIds: [],
    dialogForDxf: false,
    layerId: '',
    selectedItem: null,
    isAndroid: false,
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
    saveSima () {
      const map = this.$store.state[this.mapName]
      savePointSimaForSaga (map)    },
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

