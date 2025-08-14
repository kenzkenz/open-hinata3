<template>
  <v-navigation-drawer
      width=400
      temporary
      :scrim="false"
      v-model="showDrawDrawer"
      location="left"
      class="point-info-drawer"
      touchless
      @mousedown="setZindex"
      :style="{ zIndex: zIndex }"
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0;">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        {{ type }} <span style="font-size: 12px; margin-left: 20px;">{{ id }}</span>
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>
      <v-card-text style="margin-top: 15px;">
        <v-textarea
            v-model="longText"
            placeholder="長文を入力してください"
            outlined
            rows="8"
            auto-grow
            hint=""
        ></v-textarea>
        <v-btn style="margin-top: -10px;" @click="longTextSave">長文保存</v-btn>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import store from "@/store";
import {clickCircleSource} from "@/js/layers";
import {geojsonUpdate} from "@/js/pyramid";
import {getNextZIndex} from "@/js/downLoad";

export default {
  name: 'drawDrawer',
  components: {},
  data: () => ({
    id: '',
    type: '',
    longText: '',
    zIndex: '10',
  }),
  computed: {
    ...mapState([
      'showDrawDrawer',
      'drawFeature',
    ]),
    s_popupFeatureProperties () {
      return this.$store.state.popupFeatureProperties
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    drawerWidth () {
      return window.innerWidth
    },
  },
  methods: {
    ...mapMutations([
      'setDrawDrawer',
      'saveSelectedPointFeature',
      'setSelectedPointFeature',
    ]),
    setZindex() {
      this.zIndex = getNextZIndex()
    },
    longTextSave() {
      const map01 = store.state.map01
      const id =  this.id
      const tgtProp = 'longText'
      const value = this.longText
      store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
    },
    close() {
      this.setDrawDrawer(false);
    },
  },
  mounted() {
  },
  watch: {
    showDrawDrawer() {
      const props = this.drawFeature.properties
      this.type = this.drawFeature.geometry.type
      this.id = props.id
      this.longText = props.longText



      const canterLng = props.canterLng
      const canterLat = props.canterLat
      const radius = Number(props.radius)
      const textSize = props['text-size'] || 16
      const lineWidth = props['line-width'] || 5
      const arrowType = props['arrow-type'] || 'end'
      const labelType = props['labelType'] || 'start'
      const isRadius = props.isRadius
      const isArea = props.isArea || false
      const isKeiko = props.keiko || false
      const isCalc = props.calc || false
      const isFreeHand = props['free-hand'] || false
      const offsetX = String(props.offsetValue).split(',')[0]
      const offsetY = String(props.offsetValue).split(',')[1]
      let display = 'block'
      let display2 = 'none'
      let lineType = 'ラインストリング'
      if (isFreeHand) {
        display = 'none'
        display2 = 'block'
        lineType = 'フリーハンド'
      }
      let selectedEnd,selectedNone,selectedBoth
      switch (arrowType) {
        case 'end':
          selectedEnd = 'selected'
          break
        case 'none':
          selectedNone = 'selected'
          break
        case 'both':
          selectedBoth = 'selected'
          break
      }
      let labelSelectedStart,labelSelectedMid,labelSelectedNone,
          labelSelected0, labelSelected1
      switch (labelType) {
        case 'start':
          labelSelectedStart = 'selected'
          break
        case 'mid':
          labelSelectedMid = 'selected'
          break
        case 'none':
          labelSelectedNone = 'selected'
          break
        case '0':
          labelSelected0 = 'selected'
          break
        case '1':
          labelSelected1 = 'selected'
          break
      }
    }
  },
};
</script>

<style scoped>
.drawer {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: auto;
}
.point-info-drawer {
  z-index: 2500;
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
/* フェードアニメーション */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
