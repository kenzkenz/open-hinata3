<template>
  <div
      v-show="visible"
      class="draggable-div"
      :class="type"
      :style="{
      top: top + 'px',
      ...(left === 100 && right > 0
      ? { right: right + 'px' }
      : { left: left + 'px' }),
      width: width + 'px',
      height: height + 'px',
      cursor: fullDraggable ? 'move' : 'default',
      zIndex: zIndex
    }"
      @mousedown="onDivMouseDown"
  >
    <!-- ヘッダー（normal のみ表示） -->
    <div v-if="headerShown" class="header" ref="header">
      <span class="title">{{ title }}</span>
      <!-- Close ボタン -->
      <button class="close-btn" @click="close">×</button>
    </div>
    <!-- simple の場合、ヘッダー外にボタン -->
    <button v-else class="close-btn" @click="close">×</button>

    <!-- コンテンツ領域 -->
    <div
        class="content"
        :style="
        headerShown
          ? { height: `calc(100% - ${headerHeight}px)` }
          : { height: '100%' }
      "
    >
      <slot></slot>
    </div>

    <!-- リサイズハンドル -->
    <div
        v-for="dir in resizerDirs"
        :key="dir"
        :class="['resizer', dir]"
        @mousedown.stop="startResize($event, dir)"
    ></div>
  </div>
</template>

<script>
import { getNextZIndex } from "@/js/downLoad";
export default {
  name: 'FloatingWindow',
  props: {
    windowId: { type: String, required: true },
    title: { type: String, default: '' },
    defaultWidth: { type: Number, default: 200 },
    defaultHeight: { type: Number, default: 200 },
    defaultTop: { type: Number, default: 120 },
    defaultLeft: { type: Number, default: 100 },
    defaultRight: { type: Number, default: 0 },
    keepAspectRatio: { type: Boolean, default: false },
    type: {
      type: String,
      default: 'normal',
      validator: v => ['simple', 'normal'].includes(v)
    }
  },
  data() {
    return {
      top: this.defaultTop,
      left: this.defaultLeft,
      right: this.defaultRight,
      width: this.defaultWidth,
      height: this.defaultHeight,
      zIndex: 0,
      dragging: false,
      resizing: false,
      resizeDir: '',
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      startWidth: 0,
      startHeight: 0,
      originalAspect: 1
    };
  },
  computed: {
    // ==== Vuex マップから「自分の ID」の表示状態を取得／更新する visible ====
    visible: {
      get() {
        // alert(this.windowId + '//' + this.$store.state.floatingWindows[this.windowId])
        return !!this.$store.state.floatingWindows[this.windowId];
      },
      set(val) {
        this.$store.commit('setFloatingVisible', { id: this.windowId, visible: val });
      }
    },
    headerShown() {
      return this.type === 'normal';
    },
    headerHeight() {
      return this.headerShown ? 32 : 0;
    },
    fullDraggable() {
      return this.type === 'simple';
    },
    resizerDirs() {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    }
  },
  methods: {
    close() {
      this.$store.commit('setFloatingVisible', { id: this.windowId, visible: false });
    },
    onDivMouseDown(e) {
      // クリックで z-index を最前面に
      this.zIndex = getNextZIndex();
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll('.v-overlay').forEach(elm => {
            elm.style.zIndex = getNextZIndex()
          });
        },30)
      });
      // その後ドラッグ処理へ
      this.handleMouseDown(e);
    },
    // onDivMouseDown(e) {
    //   // const myZ = this.zIndex
    //   //
    //   // // 現在の .v-overlay の最大 z-index を取得
    //   // const overlays = Array.from(document.querySelectorAll('.v-overlay'))
    //   // const overlayZ = Math.max(
    //   //     ...overlays.map(elm => {
    //   //       const z = window.getComputedStyle(elm).zIndex
    //   //       return isNaN(z) ? 0 : Number(z)
    //   //     }),
    //   //     0
    //   // )
    //   //
    //   // // v-overlay が自分より上なら何もしない
    //   // if (overlayZ > myZ) {
    //   //   return
    //   // }
    //   //
    //   // // ↓通常処理：z-index 上げ + ドラッグ開始
    //   // this.zIndex = getNextZIndex()
    //   // this.handleMouseDown(e)
    // },
    handleMouseDown(e) {
      if (this.resizing) return;
      if (!this.fullDraggable && this.headerShown && !this.$refs.header.contains(e.target)) return;
      this.startDrag(e);
    },
    startDrag(e) {
      this.dragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      // ここを改修
      if (this.defaultRight > 0) {
        this.startLeft = window.innerWidth - (this.right + this.width);
      } else {
        this.startLeft = this.left;
      }
      this.startTop = this.top;
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    },
    onDrag(e) {
      if (!this.dragging) return;
      const newLeft = this.startLeft + (e.clientX - this.startX);
      const newTop = this.startTop + (e.clientY - this.startY);
      // ここを改修
      if (this.defaultRight > 0) {
         this.right = window.innerWidth - Math.max(0, newLeft) - this.width
      } else {
        this.left = Math.max(0, newLeft);
      }
      this.top = Math.max(0, newTop);
    },
    stopDrag() {
      this.dragging = false;
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
    },
    startResize(e, dir) {
      this.resizing = true;
      this.resizeDir = dir;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startLeft = this.left;
      this.startTop = this.top;
      this.startWidth = this.width;
      this.startHeight = this.height;
      this.originalAspect = this.startWidth / this.startHeight;
      document.addEventListener('mousemove', this.onResize);
      document.addEventListener('mouseup', this.stopResize);
    },
    onResize(e) {
      if (!this.resizing) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      let newW = this.startWidth;
      let newH = this.startHeight;
      if (this.keepAspectRatio) {
        if (this.resizeDir.includes('right')) newW = this.startWidth + dx;
        else if (this.resizeDir.includes('left')) newW = this.startWidth - dx;
        else if (this.resizeDir.includes('bottom')) newH = this.startHeight + dy;
        else if (this.resizeDir.includes('top')) newH = this.startHeight - dy;
        newH = newW / this.originalAspect;
        newW = newH * this.originalAspect;
      } else {
        if (this.resizeDir.includes('right')) newW = this.startWidth + dx;
        if (this.resizeDir.includes('left')) { newW = this.startWidth - dx; this.left = this.startLeft + dx; }
        if (this.resizeDir.includes('bottom')) newH = this.startHeight + dy;
        if (this.resizeDir.includes('top')) { newH = this.startHeight - dy; this.top = Math.max(0, this.startTop + dy); }
      }
      if (this.keepAspectRatio && this.resizeDir.includes('left')) {
        this.left = this.startLeft + (this.startWidth - newW);
      }
      if (this.keepAspectRatio && this.resizeDir.includes('top')) {
        this.top = this.startTop + (this.startHeight - newH);
      }
      this.width = Math.max(20, newW);
      this.height = Math.max(20, newH);
      this.$emit('width-changed', this.width);
      this.$emit('height-changed', this.height);
    },
    stopResize() {
      this.resizing = false;
      document.removeEventListener('mousemove', this.onResize);
      document.removeEventListener('mouseup', this.stopResize);
    }
  },
  watch: {
    visible() {
      this.zIndex = getNextZIndex()
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll('.v-overlay').forEach(elm => {
            elm.style.zIndex = getNextZIndex()
          });
        },30)
      });
    }
  }
};
</script>

<style scoped>
.draggable-div {
  position: absolute;
  background-color: white;
  box-sizing: border-box;
  box-shadow:2px 2px 5px #787878;
  border: 1px solid whitesmoke;
  border-radius: 4px;
  transition: opacity 1s;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  touch-action: auto; /* タッチイベントを有効化 */
  -webkit-overflow-scrolling: touch;

  overflow: hidden;

}

.header {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: move;
  background-color: var(--main-color);
  color: white;
  height: 32px;
  line-height: 24px;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  overflow: hidden;
}

/* simple: headerなし、全体ドラッグ、×はホバー時のみ */
.draggable-div.simple .close-btn {
  position: absolute;
  top: -4px;
  right: 8px;
  color: red;
  opacity: 0;
  font-size: 36px;
  transition: opacity 0.2s, color 0.2s;
}
.draggable-div.simple:hover .close-btn {
  opacity: 1;
}

/* normal: ヘッダー内に配置、×は白、大きく、中央寄せ、ホバーで青 */
.draggable-div.normal .header .close-btn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  opacity: 1;
  color: white;
  font-size: 42px;
  background: transparent;
  border: none;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, font-size 0.2s;
}
.draggable-div.normal .header .close-btn:hover {
  color: blue;
}

.content {
  width: 101%;
  height: 102%!important;
  /*overflow: auto;*/

  overflow: hidden;

}

.resizer {
  position: absolute;
  width: 10px;
  height: 10px;
  background: transparent;
}
.top-left     { top: -5px;    left: -5px;    cursor: nwse-resize; }
.top-right    { top: -5px;    right: -5px;   cursor: nesw-resize; }
.bottom-left  { bottom: -5px; left: -5px;    cursor: nesw-resize; }
.bottom-right { bottom: -5px; right: -5px;   cursor: nwse-resize; }
</style>