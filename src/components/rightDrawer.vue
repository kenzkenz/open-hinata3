<template>
  <v-navigation-drawer
      width=400
      temporary
      :scrim="false"
      v-model="visible"
      location="right"
      class="point-info-drawer"
      touchless
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0;">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        {{ s_rightDrawerTitle }}
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>

      <v-card-text style="margin-top: 20px;">
        <div class="top-div">
          <h2 style="margin-bottom: 10px;">{{ `${popupFeatureProperties.市区町村名 || ''}${popupFeatureProperties.大字名 || ''}${popupFeatureProperties.大字 || ''}${popupFeatureProperties['丁目名'] || ''}${popupFeatureProperties.地番 || ''}` }}</h2>
          <p v-for="[key, value] in Object.entries(popupFeatureProperties)" :key="key" class="property-text">
            {{ key }}: {{ value }}
          </p>
        </div>
<!--        <div class="street-view-drawer" style="margin-top:10px;height: calc(100vh - 450px);width:100%;"></div>-->
        <hr style="margin-top: 10px;margin-bottom: 10px;">
<!--        <div v-if="s_rightDrawerTitle === '2025登記所地図'">-->
        <div v-if="isLowZoom && s_rightDrawerTitle !== '2025登記所地図'">
          zoom15以上で面積計算します。
        </div>
        <div v-else>
          <p v-if="s_rightDrawerTitle === '2025登記所地図'" style="margin-bottom: 8px;">{{ `${popupFeatureProperties.市区町村名 || ''}${popupFeatureProperties.大字名 || ''}${popupFeatureProperties.大字 || ''}${popupFeatureProperties['丁目名'] || ''}${popupFeatureProperties.地番 || ''}` }}の面積等</p>
          面積：{{ area }}<br>
          周長：{{ perimeter }}<br>
          境界点数：{{ vertexCount }}
          <hr style="margin-top: 10px;margin-bottom: 10px;">
          <div v-if="featuresCount > 1">
            <p style="margin-bottom: 8px;">選択した地物({{ featuresCount }})の総計（注！画面内地物に限る）</p>
            総面積：{{ totalArea }}<br>
            総境界点数：{{ totalVertexCount }}
          </div>
        </div>

        <v-btn v-if="s_rightDrawerTitle === '2025登記所地図'" style="width: 100%; margin-top: 20px;" @click="openToki">地番を整形コピーして登記情報提供サービスを開く</v-btn>

      </v-card-text>

    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import {
  chibanzuCalculatePolygonMetrics,
  getHighlightedChibanFeaturesOnScreen,
  homusyoCalculatePolygonMetrics,
  openToukiFromProps
} from "@/js/downLoad";
import store from "@/store";

export default {
  name: 'RightDrawer',
  components: {},
  data() {
    return {
      tab: '0',
      area: '',
      perimeter: '',
      vertexCount: 0,
      featuresCount: 0,
      totalArea: '',
      totalVertexCount: 0,
      isLowZoom: false,
    };
  },
  computed: {
    ...mapState([
      'map01',
      'showRightDrawer',
      'selectedPointFeature',
      'popupFeatureProperties',
      'rightDrawerTitle'
    ]),
    s_rightDrawerTitle () {
      return this.$store.state.rightDrawerTitle
    },
    s_popupFeatureProperties () {
      return this.$store.state.popupFeatureProperties
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    drawerWidth () {
      return window.innerWidth
    },
    visible: {
      get() { return this.showRightDrawer; },
      set(val) {
        this.setRightDrawer(val);
        if (!val) {
          this.title = '';
        }
      }
    },
  },
  methods: {
    ...mapMutations([
      'setRightDrawer',
      'saveSelectedPointFeature',
      'setSelectedPointFeature',
    ]),
    openToki() {
      const propsArray = getHighlightedChibanFeaturesOnScreen(this.map01).map(f => f.properties)
      console.log(propsArray)
      openToukiFromProps(propsArray)
    },
    close() {
      this.setRightDrawer(false);
    },
  },
  mounted() {
  },
  watch: {
    async popupFeatureProperties (newVal) {
      if (this.s_rightDrawerTitle === '2025登記所地図') {
        const calc = await homusyoCalculatePolygonMetrics([newVal.筆ID])
        this.area = calc.area
        this.perimeter = calc.perimeter
        this.vertexCount = calc.vertexCount
        // ---------------------------------------------------------------------------------------
        const fudeIds = Array.from(this.$store.state.highlightedChibans).map(h => h.split('_')[0])
        this.featuresCount = fudeIds.length
        const totalCalc = await homusyoCalculatePolygonMetrics(fudeIds)
        this.totalArea = totalCalc.area
        this.totalVertexCount = totalCalc.vertexCount
      } else {
        const map01 = this.$store.state.map01
        const zoom = map01.getZoom()
        if (zoom < 15) {
          this.area = ''
          this.perimeter = ''
          this.vertexCount = 0
          this.featuresCount = 0
          this.totalArea = ''
          this.totalVertexCount = 0
          this.isLowZoom = true
          return
        } else {
          this.isLowZoom = false
        }
        const calc = await chibanzuCalculatePolygonMetrics([this.$store.state.popupFeature])
        this.area = calc.area
        this.perimeter = calc.perimeter
        this.vertexCount = calc.vertexCount
        /**
         注！下のコードは完全に動作する。選択地物の総面積を計算する。重いのではずした。
        // ---------------------------------------------------------------------------------------
        const oh3ids = Array.from(this.$store.state.highlightedChibans).map(h => Number(h.split('_')[0]))
        console.log(oh3ids)
        const allFeatures = map01.queryRenderedFeatures();
        const chibanLayerId = allFeatures
                  .map(f => f.layer.id)
                  .find(id => id.includes('oh-chiban'))
        const features = map01.queryRenderedFeatures(
            map01.getCanvas().getBoundingClientRect(),
            { layers: [chibanLayerId] }
        );
        console.log(chibanLayerId)
        const idString = chibanLayerId.includes('oh-chibanzu') ? 'id' : 'oh3id'
        const filteredFeatures = features.filter(f => oh3ids.includes(f.properties[idString]));
        this.featuresCount = filteredFeatures.length
        const totalCalc = await chibanzuCalculatePolygonMetrics(filteredFeatures)
        this.totalArea = totalCalc.area
        this.totalVertexCount = totalCalc.vertexCount
         */
      }
    },
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
