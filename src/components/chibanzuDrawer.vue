
<template>
  <v-navigation-drawer
      width=400
      temporary
      :scrim="false"
      v-model="visible"
      location="right"
      class="point-info-drawer"
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0;">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        全国地番図公開マップ
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>

      <v-card-text style="margin-top: 20px;">
        <h2>
          {{ cityName + cityCode }}
        </h2>
<!--        <transition name="fade" mode="out-in">-->
<!--          <h2-->
<!--              :key="`${popupFeatureProperties.市区町村名}${popupFeatureProperties.大字名}${popupFeatureProperties.丁目名}${popupFeatureProperties.地番}`"-->
<!--              style="margin-bottom: 10px;"-->
<!--          >-->
<!--            {{ `${popupFeatureProperties.市区町村名}${popupFeatureProperties.大字名}${popupFeatureProperties['丁目名'] || ''}${popupFeatureProperties.地番}` }}-->
<!--          </h2>-->
<!--        </transition>-->
<!--        <p v-for="[key, value] in Object.entries(popupFeatureProperties)" :key="key" class="property-text">-->
<!--          {{ key }}: {{ value }}-->
<!--        </p>-->
      </v-card-text>

<!--      <v-card-actions style="margin-top: 0px">-->
<!--        <v-btn disabled=true style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="removeAllFeatures">全削除</v-btn>-->
<!--        <v-spacer />-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="remove">削除</v-btn>-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="save">保存</v-btn>-->
<!--        <v-btn style="background-color: var(&#45;&#45;main-color); color: white!important;" @click="close">閉じる</v-btn>-->
<!--      </v-card-actions>-->

    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

export default {
  name: 'chibanzuDrawer',
  components: {},
  data() {
    return {
      tab: '0',
    };
  },
  computed: {
    ...mapState([
      'showChibanzuDrawer',
      'popupFeatureProperties',
      'popupFeatureCoordinates'
    ]),
    cityCode () {
      return this.popupFeatureProperties.N03_007.padStart(5, '0')
    },
    cityName () {
      if (this.popupFeatureProperties.N03_004 === '札幌市') {
        return this.popupFeatureProperties.N03_001 + this.popupFeatureProperties.N03_004 + this.popupFeatureProperties.N03_005
      } else {
        return this.popupFeatureProperties.N03_001 + this.popupFeatureProperties.N03_004
      }
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    drawerWidth () {
      return window.innerWidth
    },
    visible: {
      get() { return this.showChibanzuDrawer; },
      set(val) {
        this.setChibanzuDrawer(val);
        if (!val) {
          this.title = '';
        }
      }
    },
  },
  methods: {
    ...mapMutations([
      'setChibanzuDrawer',
    ]),
    close() {
      this.setChibanzuDrawer(false);
    },
  },
  mounted() {
  },
  watch: {
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
