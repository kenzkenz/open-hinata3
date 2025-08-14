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
      <div v-if="pictureUrl">
        <img
            width="100%"
            v-if="isImageFile"
            :src="pictureUrl"
            alt="画像"
            @click="imgClick"
            style="cursor: pointer"
        />
        <video
            v-else
            width="100%"
            :src="pictureUrl"
            muted="true"
            autoplay="true"
            loop="true"
            controls
            @click="imgClick"
            style="cursor: pointer"
        ></video>
      </div>
      <v-card-text style="margin-top: 10px;">
        <p v-if="!isEdit" class="comment-text" v-html="longTextForA"></p>
        <v-textarea
            v-else
            v-model="longText"
            placeholder="長文を入力してください"
            outlined
            rows="8"
            auto-grow
            hint=""
        ></v-textarea>
        <v-btn :disabled="!isEdit" style="margin-top: -10px;" @click="longTextSave">保存</v-btn>
        <v-btn :disabled="isEdit" style="margin-top: -10px; margin-left: 10px;" @click="isEdit = !isEdit">編集</v-btn>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import store from "@/store";
import {clickCircleSource} from "@/js/layers";
import {geojsonUpdate} from "@/js/pyramid";
import {getNextZIndex, isImageFile, sanitizeLongText, toPlainText} from "@/js/downLoad";

export default {
  name: 'drawDrawer',
  components: {},
  data: () => ({
    id: '',
    type: '',
    longText: '',
    longTextForA: '',
    zIndex: '10',
    pictureUrl: '',
    isImageFile: true,
    isEdit: false,
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
    imgClick() {
      window.open(this.pictureUrl, '_blank', 'noopener,noreferrer');
    },
    setZindex() {
      this.zIndex = getNextZIndex()
    },
    longTextSave() {
      const map01 = store.state.map01
      const id =  this.id
      const tgtProp = 'longText'
      const value = sanitizeLongText(this.longText)
      this.longTextForA = value
      this.isEdit = false

      store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
    },
    close() {
      this.setDrawDrawer(false);
    },
  },
  mounted() {
  },
  watch: {
    drawFeature() {
      this.setZindex()
      const props = this.drawFeature.properties
      this.type = this.drawFeature.geometry.type
      if (this.id === props.id) return
      this.id = props.id
      this.longText = toPlainText(props.longText)
      if (this.longText) {
        this.isEdit = false
      } else {
        this.isEdit = true
      }
      this.longTextForA = props.longText
      this.pictureUrl = props.pictureUrl
      this.isImageFile = isImageFile(this.pictureUrl || '')


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
.comment-text {
  font-size: 16px;
  padding: 16px;
  background-color: ghostwhite;
  margin-top: -10px;
  margin-bottom: 20px;
  white-space: pre-wrap; /* 改行を反映 */
  word-wrap: break-word; /* 長い単語を折り返す */
}
.comment-text a {
  color: #1e88e5; /* リンクの色 */
  text-decoration: underline;
}
.comment-text a:hover {
  color: #1565c0; /* ホバー時の色 */
}
</style>
