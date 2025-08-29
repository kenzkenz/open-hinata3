<template>
  <v-navigation-drawer
      :width="isSmall500 ? null : drawerWidth"
      temporary
      :scrim="false"
      v-model="showDrawDrawer"
      :location="isSmall500 ? 'bottom' : 'left'"
      class="point-info-drawer"
      touchless
      @mousedown="setZindex"
      :style="[{ zIndex: zIndex }, isSmall500 ? { height: bottomHeight, width: '100vw' } : {}]"
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0; overflow: hidden">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        {{ truncate(label, 17) }}
<!--        <div v-if="isSmall500" class="maximize-dialog-div" @click="maximizeDialog">拡大</div>-->
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>

      <div class="overflow-div" :style="listMaxHeightStyle">
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
              muted
              autoplay
              loop
              playsinline
              controls
              @click="imgClick"
              style="cursor: pointer"
          ></video>
        </div>
        <v-card-text style="margin-top: 10px; padding-bottom: 0">
          <p
              v-if="(!isDraw || !isEdit) && longTextForA && longTextForA.trim() !== ''"
              class="comment-text"
              v-html="longTextForA">
          </p>
          <v-textarea
              v-if="isDraw && isEdit"
              v-model="longText"
              placeholder="長文を入力してください。（最大約3000文字）"
              counter="3000"
              outlined
              rows="8"
              auto-grow
              hint=""
          ></v-textarea>
        </v-card-text>
      </div>

      <v-card-text style="margin-top: 0px;">
        <div class="d-flex align-center" style="gap:10px;">
          <v-btn :disabled="!isDraw || !isEdit" style="margin-top:-10px" @click="longTextSave">保存</v-btn>
          <v-btn :disabled="!isDraw || isEdit" style="margin-top:-10px" @click="toEdit">書込</v-btn>
          <v-btn v-if="isDraw && isEdit" style="margin-top:-10px" @click="isEdit = false">書込解除</v-btn>
          <v-btn v-if="isSmall500" icon class="ms-auto" style="margin-top:-10px; margin-right: 0px;" @click="close"><v-icon>mdi-close</v-icon></v-btn>

          <v-btn  icon class="ms-auto" style="margin-top:-10px;" @click="isDrawChange"><v-icon>mdi-pencil</v-icon></v-btn>
        </div>
        <br>
        <span style="margin-left: 10px; font-size: 10.5px; margin: 0" v-if="!isDraw">編集するには右のペンアイコンをクリックしてドロー状態にしてください。</span>
      </v-card-text>

      <!-- フルスクリーン・モーダル -->
      <teleport to="body">
        <div v-if="showMediaModal" class="media-modal" @click.self="closeMediaModal" :style="{ zIndex: modalZIndex }">
          <button class="modal-close" @click="closeMediaModal" aria-label="閉じる">✕</button>
          <img
              v-if="isImageFile && pictureUrl"
              :src="pictureUrl"
              alt="画像（拡大表示）"
              class="modal-media"
              draggable="false"
          />
          <video
              v-else-if="pictureUrl"
              :src="pictureUrl"
              class="modal-media video-full"
              autoplay
              muted
              loop
              controls
              playsinline
          ></video>
        </div>
      </teleport>

    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import store from "@/store";
import {clickCircleSource} from "@/js/layers";
import {geojsonUpdate} from "@/js/pyramid";
import {getNextZIndex, isImageFile, sanitizeLongText, stopDrawerAnimations, toPlainText} from "@/js/downLoad";
import {popup} from "@/js/popup";

export default {
  name: 'drawDrawer',
  components: {},
  data: () => ({
    id: '',
    type: '',
    originalLongText: '',
    longText: '',
    longTextForA: '',
    label: '',
    drawerWidth: 400,
    zIndex: '10',
    modalZIndex: 0,
    pictureUrl: '',
    isImageFile: true,
    isEdit: false,
    showMediaModal: false,
    // ▼ 500px以下（bottom表示）の高さ
    bottomHeight: '100dvh',
  }),
  computed: {
    ...mapState([
      'showDrawDrawer',
      'isDraw',
      'drawFeature',
      'isIphone',
      'isSmall500',
    ]),
    s_isDraw: {
      get() {
        return this.$store.state.isDraw
      },
      set(value) {
        this.$store.state.isDraw = value
      }
    },
    s_popupFeatureProperties () {
      return this.$store.state.popupFeatureProperties
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    listMaxHeightStyle() {
      if (this.isSmall500) {
        return { maxHeight: `calc(${this.bottomHeight} - 150px)` };
      }
      return { maxHeight: `calc(100dvh - ${this.isIphone ? 260 : 150}px)` };
    },
  },
  methods: {
    ...mapMutations([
      'setDrawDrawer',
      'saveSelectedPointFeature',
      'setSelectedPointFeature',
    ]),
    maximizeDialog() {
      this.bottomHeight = this.bottomHeight === '100dvh' ? '45dvh' : '100dvh'
    },
    isDrawChange() {
      /**
       * isSmall500のときの特殊な運用。少し違和感がある。
       * 本来、if文の中の文だけで良い。
       */
      if (!this.s_isDraw || !this.isSmall500) {
        this.s_isDraw = true
        const btn = document.getElementById("centerDrawBtn2")
        if (btn) btn.click()
      }
      // this.s_isDraw = true
      // const btn = document.getElementById("centerDrawBtn2")
      // if (btn) btn.click()
      const map = this.$store.state.map01
      this.$store.state.id = this.drawFeature.properties.id
      const dummyEvent = {
        lngLat: { lng: this.drawFeature.geometry.coordinates[0], lat: this.drawFeature.geometry.coordinates[1] },
      };
      function onPointClick(e) {
        popup(e,map,'map01', store.state.map2Flg)
      }
      onPointClick(dummyEvent)
    },
    toEdit() {
      this.isEdit = true;
      if (this.isEdit) {
        this.$nextTick(() => {
          const el = document.querySelector('.overflow-div');
          if (el) {
            el.scrollTo({
              top: el.scrollHeight,
              behavior: 'smooth'
            });
          }
        });
      }
    },
    openMediaModal() {
      if (!this.pictureUrl) return
      this.showMediaModal = true
      // スクロール固定
      this._prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      // ESC で閉じる
      window.addEventListener('keydown', this._onKeydown, { passive: true })
    },
    closeMediaModal() {
      this.showMediaModal = false
      document.body.style.overflow = this._prevOverflow || ''
      window.removeEventListener('keydown', this._onKeydown)
      // this.pictureUrl = ''
    },
    _onKeydown(e) {
      if (e.key === 'Escape') this.closeMediaModal()
    },
    truncate(str, maxLength) {
      return str.length > maxLength
          ? str.slice(0, maxLength) + '...'
          : str;
    },
    imgClick() {
      this.openMediaModal()
      // if (window.innerWidth > 500) {
      //   this.openMediaModal()
      // } else {
      //   // モバイルは暴発しやすいので無効化
      // }
    },
    setZindex() {
      // alert(888)
      this.zIndex = getNextZIndex() + 1
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
    if (window.innerWidth < 500) this.drawerWidth = window.innerWidth
  },
  watch: {
    showDrawDrawer(value) {
      if (!value) {
        this.bottomHeight = '100dvh'
      }
    },
    bottomHeight(value) {
      if (this.isSmall500) {
        if (value === '100dvh') {
          document.querySelector('.maximize-dialog-div').innerText = '元'
        } else {
          document.querySelector('.maximize-dialog-div').innerText = '拡大'

        }
      }
    },
    showMediaModal(value) {
      if (value) {
        this.modalZIndex = getNextZIndex()
      }
    },
    isEdit(value) {
      if (!value) {
        this.longText = this.originalLongText
      }
    },
    drawFeature: {
      handler: function () {
        if (this.drawFeature.properties.id === 'config') return
        const activeEl = document.activeElement;
        if (!(activeEl.tagName === "TEXTAREA" && activeEl.selectionStart !== 0)) {
          this.setZindex()
        }
        const props = this.drawFeature.properties
        this.type = this.drawFeature.geometry.type
        this.label = props.label
        this.id = props.id
        this.longText = toPlainText(props.longText)
        this.isEdit = !this.longText
        this.originalLongText = this.longText
        this.longTextForA = props.longText
        this.pictureUrl = props.pictureUrl
        this.isImageFile = isImageFile(this.pictureUrl || '')
        // 以降は既存ロジック維持（必要なら参照用に変数を保つ）
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
          case 'end': selectedEnd = 'selected'; break
          case 'none': selectedNone = 'selected'; break
          case 'both': selectedBoth = 'selected'; break
        }
        let labelSelectedStart,labelSelectedMid,labelSelectedNone,
            labelSelected0, labelSelected1
        switch (labelType) {
          case 'start': labelSelectedStart = 'selected'; break
          case 'mid': labelSelectedMid = 'selected'; break
          case 'none': labelSelectedNone = 'selected'; break
          case '0': labelSelected0 = 'selected'; break
          case '1': labelSelected1 = 'selected'; break
        }
      },
      deep: true
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
.close-btn:hover { color: red; }

/* フェードアニメーション */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.comment-text {
  font-size: 16px;
  padding: 16px;
  background-color: ghostwhite;
  margin-top: -10px;
  margin-bottom: 20px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.comment-text a { color: #1e88e5; text-decoration: underline; }
.comment-text a:hover { color: #1565c0; }

.overflow-div{ overflow-y: auto; overflow-x: hidden; }

/* 画面いっぱいの黒透過（背景） */
.media-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
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

.modal-media {
  max-width: 90vw;
  max-height: 90dvh;
  object-fit: contain;
  background: #000;
  border-radius: 8px;
}
.video-full {
  width: 80vw;
  max-height: 90dvh;
  object-fit: cover;
}

.maximize-dialog-div {
  position: absolute;
  top: 5px;
  right: 45px;
  color: white;
  font-size: 22px;
}

/*.maximize-dialog-div:hover {*/
/*  color: red;*/
/*}*/


@media (max-width: 500px) {
  :deep(.v-navigation-drawer--bottom) {
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
}
</style>
