<template>
  <v-navigation-drawer
      :width="isSmall500 ? null : drawerWidth"
      temporary
      :scrim="false"
      v-model="showDrawListDrawer"
      :location="isSmall500 ? 'bottom' : 'right'"
      touchless
      @mousedown="setZindex"
      :style="[{ zIndex: zIndex }, isSmall500 ? { height: bottomHeight, width: '100vw' } : {}]"
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0; overflow: hidden">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        ドローリスト
        <v-chip
            v-if="featuresLength > 0"
            class="file-count-badge"
            size="small"
            color="red"
            text-color="white"
        >
          {{ featuresLength }}
        </v-chip>
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>

      <v-virtual-scroll
          class="my-scroll"
          :style="listMaxHeightStyle"
          :items="drawFeaturesTexts"
          item-height="32"
      >
        <template #default="{ item }">
          <v-list-item
              :data-id="item.id"
              :data-coordinates="item.coordinates"
              density="compact"
              style="min-height: 32px;"
              :ripple="false"
              @click="onItemClick($event)"
          >
            <v-list-item-title class="truncate">{{ item.label }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-virtual-scroll>

    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import store from "@/store";
import {
  getNextZIndex,
  moveToMap,
} from "@/js/downLoad";
import {popup} from "@/js/popup";

export default {
  name: 'drawListDrawer',
  components: {},
  data: () => ({
    featuresLength: 0,
    drawFeaturesTexts: [],
    id: '',
    type: '',
    originalLongText: '',
    longText: '',
    longTextForA: '',
    label: '',
    drawerWidth: 250,
    zIndex: '10',
    modalZIndex: 0,
    pictureUrl: '',
    isImageFile: true,
    isEdit: false,
    showMediaModal: false,
    // ▼ 500px以下のときのボトムドロワーの高さ（必要に応じて調整）
    bottomHeight: '45dvh',
  }),
  computed: {
    ...mapState([
      'clickCircleGeojsonText',
      'showDrawListDrawer',
      'isSmall500',
      'isIphone',
    ]),
    listMaxHeightStyle() {
      // ヘッダー 40px を差し引く
      if (this.isSmall500) {
        return { maxHeight: `calc(${this.bottomHeight} - 40px)` };
      }
      return { maxHeight: `calc(100dvh - ${this.isIphone ? 200 : 100}px)` };
    },
  },
  methods: {
    ...mapMutations([
      'setDrawDrawer',
      'setDrawListDrawer',
      'saveSelectedPointFeature',
      'setSelectedPointFeature',
    ]),
    async onItemClick(event) {
      // if (this.isSmall500) {
      //   this.close()
      // }
      this.setDrawDrawer(false);
      const { id, coordinates } = event.currentTarget.dataset
      const map = this.$store.state.map01
      this.$store.state.id = id
      const dummyEvent = {
        lngLat: { lng: coordinates.split(',')[0], lat: coordinates.split(',')[1] },
      };
      function onPointClick(e) {
        popup(e,map,'map01', store.state.map2Flg, true)
      }
      await moveToMap(Number(coordinates.split(',')[0]), Number(coordinates.split(',')[1]))
      if (!this.isSmall500) {
        const ov = document.querySelector('.overflow-div')
        if (ov) ov.scrollTop = 0;
        setTimeout(() => {
          onPointClick(dummyEvent)
        },200)
      }
    },
    truncate(str, maxLength) {
      return str.length > maxLength
          ? str.slice(0, maxLength) + '...'
          : str;
    },
    setZindex() {
      this.zIndex = getNextZIndex()
    },
    close() {
      this.setDrawListDrawer(false);
    },
    getList() {
      const features = JSON.parse(this.clickCircleGeojsonText).features?.filter(f => f.properties.id !== 'config')
      // console.log(features)
      if (!features || features.length === 0) return
      if (features[0].properties._index) {
        features.sort((a, b) => {
          /**
           * 差がプラスマイナス１０秒以内なら同じとみなして_indexでソートする。
           */
          if (Math.abs(new Date(b.properties.updated_at) - new Date(a.properties.updated_at)) <= 10000) {
            return a.properties._index - b.properties._index;
          } else {
            return new Date(b.properties.updated_at) - new Date(a.properties.updated_at);
          }
        });
      } else {
        features.sort((a, b) => {
          return new Date(b.properties.updated_at) - new Date(a.properties.updated_at);
        });
      }
      this.featuresLength = features.length
      this.drawFeaturesTexts = features.map(f => {
        let label = ''
        switch (f.geometry.type){
          case 'Point':
            label = f.properties.label
            break
          case 'LineString':
            label = 'ライン'
            break
          case 'Polygon':
            label = 'ポリゴン'
            break
        }
        return {
          label: label,
          id: f.properties.id,
          coordinates: f.geometry.coordinates,
        }
      })
    },
  },
  mounted() {
    if (window.innerWidth < 500) this.drawerWidth = window.innerWidth
  },
  watch: {
    showDrawListDrawer(value) {
      if (value) {
        this.getList()
        if (!this.isSmall500) {
          const r1 = document.querySelector('#right-top-div')
          const r2 = document.querySelector('.sub-btns')
          if (r1) r1.style.right = '260px'
          if (r2) r2.style.right = '288px'
        }
      } else {
        const r1 = document.querySelector('#right-top-div')
        const r2 = document.querySelector('.sub-btns')
        if (r1) r1.style.right = '20px'
        if (r2) r2.style.right = '48px'
      }
    },
    clickCircleGeojsonText() {
      this.getList()
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
.overflow-div{
  overflow-y: auto;
  overflow-x: hidden;
}
/* 画面いっぱいの黒透過（背景） */
.media-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999; /* 必要に応じて上げる */
}
/* 右上の閉じるボタン */
.modal-close {
  position: absolute;
  top: 32px;
  right: 52px;
  font-size: 34px;
  line-height: 1;
  color: #fff;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 10px;
}
.modal-close:hover { opacity: 0.9; }
/* メディアの最大化表示（余白は黒透過のまま） */
.modal-media {
  max-width: 90vw;
  max-height: 90dvh;
  object-fit: contain; /* 画像/動画の比率を維持して収める */
  background: #000; /* レターボックス部分を黒 */
  border-radius: 8px;
}
/* 画面いっぱいに引き伸ばす（動画用） */
/* これでは切れる。要検討 */
.video-full {
  width: 80vw;
  max-height: 90dvh;
  object-fit: cover;
}

.my-scroll {
  margin-top: 10px;
}

.file-count-badge {
  margin-left: 4px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
  background-color: ghostwhite;
}

@media (max-width: 500px) {
  /* bottom時に角丸が欲しければ */
  :deep(.v-navigation-drawer--bottom) {
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
}
</style>



<!--<template>-->
<!--  <v-navigation-drawer-->
<!--      :width='drawerWidth'-->
<!--      temporary-->
<!--      :scrim="false"-->
<!--      v-model="showDrawListDrawer"-->
<!--      location="right"-->
<!--      touchless-->
<!--      @mousedown="setZindex"-->
<!--      :style="{ zIndex: zIndex }"-->
<!--  >-->
<!--    <v-card flat class="bg-white drawer" style="border-radius: 0; overflow: hidden">-->
<!--      <v-card-title class="text-h6 text-white" style="background-color: var(&#45;&#45;main-color); height: 40px; display: flex; align-items: center;">-->
<!--        ドローリスト-->
<!--        <v-chip-->
<!--            v-if="featuresLength > 0"-->
<!--            class="file-count-badge"-->
<!--            size="small"-->
<!--            color="red"-->
<!--            text-color="white"-->
<!--        >-->
<!--          {{ featuresLength }}-->
<!--        </v-chip>-->
<!--        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>-->
<!--      </v-card-title>-->

<!--      <v-virtual-scroll-->
<!--          class="my-scroll"-->
<!--          :style="{ maxHeight: `calc(100dvh - ${isIphone ? 200 : 100}px)` }"-->
<!--          :items="drawFeaturesTexts"-->
<!--          item-height="32"-->
<!--      >-->
<!--        <template #default="{ item }">-->
<!--          <v-list-item-->
<!--              :data-id="item.id"-->
<!--              :data-coordinates="item.coordinates"-->
<!--              density="compact"-->
<!--              style="min-height: 32px;"-->
<!--              :ripple="false"-->
<!--              @click="onItemClick($event)"-->
<!--          >-->
<!--            <v-list-item-title class="truncate">{{ item.label }}</v-list-item-title>-->
<!--          </v-list-item>-->
<!--        </template>-->
<!--      </v-virtual-scroll>-->




<!--&lt;!&ndash;      <v-card-text style="margin-top: 0px;">&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn :disabled="!isDraw || !isEdit" style="margin-top: -10px;" @click="longTextSave">保存</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn :disabled="!isDraw || isEdit" style="margin-top: -10px; margin-left: 10px;" @click="toEdit">書き込み</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <v-btn v-if="isDraw && isEdit" style="margin-top: -10px; margin-left: 10px;" @click="isEdit = false">書き込み解除</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;        <br>&ndash;&gt;-->
<!--&lt;!&ndash;      </v-card-text>&ndash;&gt;-->


<!--    </v-card>-->
<!--  </v-navigation-drawer>-->
<!--</template>-->

<!--<script>-->
<!--import { mapState, mapMutations } from 'vuex';-->
<!--import store from "@/store";-->
<!--import {-->
<!--  getNextZIndex,-->
<!--  moveToMap,-->
<!--} from "@/js/downLoad";-->
<!--import {popup} from "@/js/popup";-->

<!--export default {-->
<!--  name: 'drawListDrawer',-->
<!--  components: {},-->
<!--  data: () => ({-->
<!--    featuresLength: 0,-->
<!--    drawFeaturesTexts: [],-->
<!--    id: '',-->
<!--    type: '',-->
<!--    originalLongText: '',-->
<!--    longText: '',-->
<!--    longTextForA: '',-->
<!--    label: '',-->
<!--    drawerWidth: 250,-->
<!--    zIndex: '10',-->
<!--    modalZIndex: 0,-->
<!--    pictureUrl: '',-->
<!--    isImageFile: true,-->
<!--    isEdit: false,-->
<!--    showMediaModal: false,-->
<!--  }),-->
<!--  computed: {-->
<!--    ...mapState([-->
<!--      'clickCircleGeojsonText',-->
<!--      'showDrawListDrawer',-->
<!--      'isSmall500',-->
<!--      'isIphone',-->
<!--    ]),-->
<!--  },-->
<!--  methods: {-->
<!--    ...mapMutations([-->
<!--      'setDrawDrawer',-->
<!--      'setDrawListDrawer',-->
<!--      'saveSelectedPointFeature',-->
<!--      'setSelectedPointFeature',-->
<!--    ]),-->
<!--    async onItemClick(event) {-->
<!--      if (this.isSmall500) {-->
<!--        this.close()-->
<!--      }-->
<!--      this.setDrawDrawer(false);-->
<!--      const { id, coordinates } = event.currentTarget.dataset-->
<!--      console.log(coordinates.split(',')[0])-->
<!--      const map = this.$store.state.map01-->
<!--      this.$store.state.id = id-->
<!--      const dummyEvent = {-->
<!--        lngLat: { lng: coordinates.split(',')[0], lat: coordinates.split(',')[1] },-->
<!--      };-->
<!--      function onPointClick(e) {-->
<!--        popup(e,map,'map01', store.state.map2Flg, true)-->
<!--      }-->
<!--      await moveToMap(Number(coordinates.split(',')[0]), Number(coordinates.split(',')[1]))-->
<!--      document.querySelector('.overflow-div').scrollTop = 0;-->
<!--      setTimeout(() => {-->
<!--        onPointClick(dummyEvent)-->
<!--      },200)-->
<!--    },-->
<!--    truncate(str, maxLength) {-->
<!--      return str.length > maxLength-->
<!--          ? str.slice(0, maxLength) + '...'-->
<!--          : str;-->
<!--    },-->
<!--    setZindex() {-->
<!--      this.zIndex = getNextZIndex()-->
<!--    },-->
<!--    close() {-->
<!--      this.setDrawListDrawer(false);-->
<!--    },-->
<!--    getList() {-->
<!--      const features = JSON.parse(this.clickCircleGeojsonText).features.filter(f => f.properties.id !== 'config')-->
<!--      // console.log(features)-->
<!--      features.sort((a, b) => {-->
<!--        return new Date(b.properties.updated_at) - new Date(a.properties.updated_at);-->
<!--      });-->
<!--      this.featuresLength = features.length-->
<!--      this.drawFeaturesTexts = features.map(f => {-->
<!--        let label = ''-->
<!--        switch (f.geometry.type){-->
<!--          case 'Point':-->
<!--            label = f.properties.label-->
<!--            break-->
<!--          case 'LineString':-->
<!--            label = 'ライン'-->
<!--            break-->
<!--          case 'Polygon':-->
<!--            label = 'ポリゴン'-->
<!--            break-->
<!--        }-->
<!--        return {-->
<!--          label: label,-->
<!--          id: f.properties.id,-->
<!--          coordinates: f.geometry.coordinates,-->
<!--        }-->
<!--      })-->
<!--    },-->
<!--  },-->
<!--  mounted() {-->
<!--    if (window.innerWidth < 500) this.drawerWidth = window.innerWidth-->
<!--  },-->
<!--  watch: {-->
<!--    showDrawListDrawer(value) {-->
<!--      if (value) {-->
<!--        this.getList()-->
<!--        document.querySelector('#right-top-div').style.right = '260px'-->
<!--        document.querySelector('.sub-btns').style.right = '288px'-->
<!--      } else {-->
<!--        document.querySelector('#right-top-div').style.right = '20px'-->
<!--        document.querySelector('.sub-btns').style.right = '48px'-->
<!--      }-->
<!--    },-->
<!--    clickCircleGeojsonText(value) {-->
<!--      // alert(999)-->
<!--      this.getList()-->
<!--    },-->
<!--  },-->
<!--};-->
<!--</script>-->

<!--<style scoped>-->
<!--.drawer {-->
<!--  height: 100%;-->
<!--  overflow-y: auto;-->
<!--  overscroll-behavior: contain;-->
<!--  -webkit-overflow-scrolling: auto;-->
<!--}-->
<!--.point-info-drawer {-->
<!--  z-index: 2500;-->
<!--}-->
<!--.close-btn {-->
<!--  position: absolute;-->
<!--  top: -10px;-->
<!--  right: 10px;-->
<!--  color: black;-->
<!--  border: none;-->
<!--  cursor: pointer;-->
<!--  padding: 5px;-->
<!--  font-size: 30px;-->
<!--}-->
<!--.close-btn:hover {-->
<!--  color: red;-->
<!--}-->
<!--/* フェードアニメーション */-->
<!--.fade-enter-active,-->
<!--.fade-leave-active {-->
<!--  transition: opacity 0.3s ease;-->
<!--}-->
<!--.fade-enter-from,-->
<!--.fade-leave-to {-->
<!--  opacity: 0;-->
<!--}-->
<!--.comment-text {-->
<!--  font-size: 16px;-->
<!--  padding: 16px;-->
<!--  background-color: ghostwhite;-->
<!--  margin-top: -10px;-->
<!--  margin-bottom: 20px;-->
<!--  white-space: pre-wrap; /* 改行を反映 */-->
<!--  word-wrap: break-word; /* 長い単語を折り返す */-->
<!--}-->
<!--.comment-text a {-->
<!--  color: #1e88e5; /* リンクの色 */-->
<!--  text-decoration: underline;-->
<!--}-->
<!--.comment-text a:hover {-->
<!--  color: #1565c0; /* ホバー時の色 */-->
<!--}-->
<!--.overflow-div{-->
<!--  overflow-y: auto;-->
<!--  overflow-x: hidden;-->
<!--  /*max-height: calc(100dvh - 200px);*/-->
<!--}-->
<!--/* 画面いっぱいの黒透過（背景） */-->
<!--.media-modal {-->
<!--  position: fixed;-->
<!--  inset: 0;-->
<!--  background: rgba(0, 0, 0, 0.85);-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  z-index: 9999; /* 必要に応じて上げる */-->
<!--}-->
<!--/* 右上の閉じるボタン */-->
<!--.modal-close {-->
<!--  position: absolute;-->
<!--  top: 32px;-->
<!--  right: 52px;-->
<!--  font-size: 34px;-->
<!--  line-height: 1;-->
<!--  color: #fff;-->
<!--  background: transparent;-->
<!--  border: none;-->
<!--  cursor: pointer;-->
<!--  padding: 8px 10px;-->
<!--  border-radius: 10px;-->
<!--}-->
<!--.modal-close:hover { opacity: 0.9; }-->
<!--/* メディアの最大化表示（余白は黒透過のまま） */-->
<!--.modal-media {-->
<!--  max-width: 90vw;-->
<!--  max-height: 90dvh;-->
<!--  object-fit: contain; /* 画像/動画の比率を維持して収める */-->
<!--  background: #000; /* レターボックス部分を黒 */-->
<!--  border-radius: 8px;-->
<!--}-->
<!--/* 画面いっぱいに引き伸ばす（動画用） */-->
<!--/* これでは切れる。要検討 */-->
<!--.video-full {-->
<!--  width: 80vw;-->
<!--  max-height: 90dvh;-->
<!--  object-fit: cover;-->
<!--}-->

<!--.my-scroll {-->
<!--  margin-top: 10px;-->
<!--}-->

<!--.file-count-badge {-->
<!--  margin-left: 4px;-->
<!--  font-size: 10px;-->
<!--  font-weight: bold;-->
<!--  min-width: 16px;-->
<!--  height: 16px;-->
<!--  line-height: 16px;-->
<!--  padding: 0 4px;-->
<!--  background-color: ghostwhite;-->
<!--}-->

<!--@media (max-width: 500px) {-->

<!--}-->
<!--</style>-->


