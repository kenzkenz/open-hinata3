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
        <div v-if="s_rightDrawerTitle === '2025登記所地図'">
          <p style="margin-bottom: 8px;">{{ `${popupFeatureProperties.市区町村名 || ''}${popupFeatureProperties.大字名 || ''}${popupFeatureProperties.大字 || ''}${popupFeatureProperties['丁目名'] || ''}${popupFeatureProperties.地番 || ''}` }}の面積等</p>
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
      </v-card-text>

<!--      <v-card-actions style="margin-top: 0px">-->
<!--        <v-btn disabled=true style="background-color: var(--main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>-->
<!--        <v-spacer />-->
<!--        <v-btn style="background-color: var(--main-color); color: white!important;" @click="remove">削除</v-btn>-->
<!--        <v-btn style="background-color: var(--main-color); color: white!important;" @click="save">保存</v-btn>-->
<!--        <v-btn style="background-color: var(--main-color); color: white!important;" @click="close">閉じる</v-btn>-->
<!--      </v-card-actions>-->

    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import {homusyoCalculatePolygonMetrics} from "@/js/downLoad";
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
    };
  },
  computed: {
    ...mapState([
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
    close() {
      this.setRightDrawer(false);
    },
  },
  mounted() {
  },
  watch: {
    async popupFeatureProperties (newVal) {
      const calc = await homusyoCalculatePolygonMetrics([newVal.筆ID])
      this.area = calc.area
      this.perimeter = calc.perimeter
      this.vertexCount = calc.vertexCount

      const fudeIds = Array.from(this.$store.state.highlightedChibans).map(h => h.split('_')[0])
      this.featuresCount = fudeIds.length
      const totalCalc = await homusyoCalculatePolygonMetrics(fudeIds)
      this.totalArea = totalCalc.area
      this.totalVertexCount = totalCalc.vertexCount


      // document.querySelector('.street-view-drawer').innerHTML = '<span style="color: red">現在、street-viewはアクセス増加に伴い停止中です。</span>'

      // const container = document.querySelector('.street-view-drawer')
      // const [lng, lat] = this.$store.state.popupFeatureCoordinates;
      // async function setupStreetViewWithMotion() {
      //   await enableMotionPermission(); // ← 先に許可をもらう
      //   if (container) {
      //     const topDiv = document.querySelector('.top-div')
      //     document.querySelector('.street-view-drawer').style.height = window.innerHeight - topDiv.offsetHeight - topDiv.getBoundingClientRect().top - 30 + 'px'
      //     new window.google.maps.StreetViewPanorama(container, {
      //       position: {lat: lat, lng: lng},
      //       pov: { heading: 34, pitch: 10 },
      //       zoom: 1,
      //       disableDefaultUI: true,
      //     });
      //   }
      // }
      // setupStreetViewWithMotion()
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
