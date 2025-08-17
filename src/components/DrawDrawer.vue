<template>
  <v-navigation-drawer
      :width='drawerWidth'
      temporary
      :scrim="false"
      v-model="showDrawDrawer"
      location="left"
      class="point-info-drawer"
      touchless
      @mousedown="setZindex"
      :style="{ zIndex: zIndex }"
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0; overflow: hidden">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        <!--        {{ type }} <span style="font-size: 12px; margin-left: 20px;">{{ id }}</span>-->
        {{ truncate(label, 17) }}
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>
      <div class="overflow-div" :style="{maxHeight: `calc(100vh - ${isIphone ? 250 : 150}px)`}">
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
<!--          <p v-if="!isDraw || !isEdit" class="comment-text" v-html="longTextForA"></p>-->
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
        <v-btn :disabled="!isDraw || !isEdit" style="margin-top: -10px;" @click="longTextSave">保存</v-btn>
        <v-btn :disabled="!isDraw || isEdit" style="margin-top: -10px; margin-left: 10px;" @click="toEdit">書き込み</v-btn>

        <v-btn v-if="isDraw && isEdit" style="margin-top: -10px; margin-left: 10px;" @click="isEdit = false">書き込み解除</v-btn>
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
import {getNextZIndex, isImageFile, sanitizeLongText, toPlainText} from "@/js/downLoad";
import {history} from "@/App";

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
  }),
  computed: {
    ...mapState([
      'showDrawDrawer',
      'isDraw',
      'drawFeature',
      'isIphone',
    ]),
    s_popupFeatureProperties () {
      return this.$store.state.popupFeatureProperties
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
  },
  methods: {
    ...mapMutations([
      'setDrawDrawer',
      'saveSelectedPointFeature',
      'setSelectedPointFeature',
    ]),
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
      if (window.innerWidth > 500){
        this.openMediaModal()
        // window.open(this.pictureUrl, '_blank', 'noopener,noreferrer');
      }
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
    if (window.innerWidth < 500) {
      this.drawerWidth = window.innerWidth
    }
  },
  watch: {
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
        /**
         * 様改修
         */
        if (activeEl.tagName === "TEXTAREA" && activeEl.selectionStart !== 0) {
          console.log("アクティブなTEXTAREA:", activeEl.tagName)
        } else {
          this.setZindex()
        }
        const props = this.drawFeature.properties
        this.type = this.drawFeature.geometry.type
        this.label = props.label
        // if (this.id === props.id) return
        this.id = props.id
        this.longText = toPlainText(props.longText)
        if (this.longText) {
          this.isEdit = false
        } else {
          this.isEdit = true
        }
        this.originalLongText = this.longText

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
  /*max-height: calc(100vh - 200px);*/
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
  max-height: 90vh;
  object-fit: contain; /* 画像/動画の比率を維持して収める */
  background: #000; /* レターボックス部分を黒 */
  border-radius: 8px;
}
/* 画面いっぱいに引き伸ばす（動画用） */
/* これでは切れる。要検討 */
.video-full {
  width: 80vw;
  max-height: 90vh;
  object-fit: cover;
}

@media (max-width: 500px) {

}
</style>
