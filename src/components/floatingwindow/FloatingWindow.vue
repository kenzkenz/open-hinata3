<template>
  <div
      v-show="visible"
      class="draggable-div"
      :class="[{ maximized: isMaximized }, type]"
      :style="{
      top: top + 'px',
      ...(left === 100 && right > 0 ? { right: right + 'px' } : { left: left + 'px' }),
      width: width + 'px',
      height: height + 'px',
      cursor: fullDraggable ? 'move' : 'default',
      zIndex: zIndex
    }"
      @pointerdown="onDivPointerDown"
  >
    <!-- ヘッダー（normal のみ表示） -->
    <div v-if="headerShown" class="header" ref="header">
      <span class="title">{{ title }}</span>

      <!-- Win風: 拡大/元に戻す（任意） -->
      <div v-if="showMaxRestore" class="window-controls">
        <v-btn
            v-if="!isMaximized"
            icon
            variant="text"
            size="small"
            density="comfortable"
            :aria-label="'拡大'"
            @click.stop="maximize"
        >
          <v-icon icon="mdi-window-maximize" />
        </v-btn>
        <v-btn
            v-else
            icon
            variant="text"
            size="small"
            density="comfortable"
            :aria-label="'元に戻す'"
            @click.stop="restore"
        >
          <v-icon icon="mdi-window-restore" />
        </v-btn>
      </div>

      <!-- Close ボタン -->
      <button class="close-btn" @click="close">×</button>
    </div>

    <!-- simple の場合、ヘッダー外にボタン -->
    <button v-else class="close-btn" @click="close">×</button>

    <!-- コンテンツ領域 -->
    <div
        class="content"
        :style="headerShown ? { height: `calc(100% - ${headerHeight}px)` } : { height: '100%' }"
    >
      <slot></slot>
    </div>

    <!-- リサイズハンドル -->
    <div
        v-for="dir in resizerDirs"
        :key="dir"
        :class="['resizer', dir]"
        @pointerdown.stop="startResize($event, dir)"
    ></div>
  </div>
</template>

<script>
import { getNextZIndex } from "@/js/downLoad";
import { mapState } from "vuex";
export default {
  name: "FloatingWindow",
  props: {
    windowId: { type: String, required: true },
    title: { type: String, default: "" },
    defaultWidth: { type: Number, default: 200 },
    defaultHeight: { type: Number, default: 200 },
    defaultTop: { type: Number, default: 120 },
    defaultLeft: { type: Number, default: 100 },
    defaultRight: { type: Number, default: 0 },
    keepAspectRatio: { type: Boolean, default: false },
    // ★ 拡大/元に戻すボタン（標準はなし）
    showMaxRestore: { type: Boolean, default: false },
    type: {
      type: String,
      default: "normal",
      validator: (v) => ["simple", "normal"].includes(v),
    },
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
      resizeDir: "",
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      startWidth: 0,
      startHeight: 0,
      originalAspect: 1,
      // ★ 最大化状態保持
      isMaximized: false,
      preMaxState: null,
    };
  },
  computed: {
    ...mapState(["mapillaryZindex"]),
    // ==== Vuex マップから「自分の ID」の表示状態を取得／更新する visible ====
    visible: {
      get() {
        return !!this.$store.state.floatingWindows[this.windowId];
      },
      set(val) {
        this.$store.commit("setFloatingVisible", { id: this.windowId, visible: val });
      },
    },
    headerShown() {
      return this.type === "normal";
    },
    headerHeight() {
      return this.headerShown ? 32 : 0;
    },
    fullDraggable() {
      return this.type === "simple";
    },
    resizerDirs() {
      return ["top-left", "top-right", "bottom-left", "bottom-right"];
    },
  },
  methods: {
    close() {
      this.$store.commit("setFloatingVisible", { id: this.windowId, visible: false });
    },
    onDivPointerDown(e) {
      // iOS/Safari でのスクロール・選択抑止
      if (e.cancelable) e.preventDefault();

      // クリック/タップで z-index を最前面に
      this.zIndex = getNextZIndex();
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll(".v-overlay").forEach((elm) => {
            elm.style.zIndex = getNextZIndex();
          });
        }, 30);
      });

      // 最大化時はドラッグ不可
      if (this.isMaximized) return;

      // その後ドラッグ処理へ
      this.handlePointerDown(e);
    },
    handlePointerDown(e) {
      if (this.resizing) return;
      if (!this.fullDraggable && this.headerShown && this.$refs.header && !this.$refs.header.contains(e.target)) return;
      this.startDrag(e);
    },
    startDrag(e) {
      this.dragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;

      // 右寄せ開始位置に対応
      if (this.defaultRight > 0) {
        this.startLeft = window.innerWidth - (this.right + this.width);
      } else {
        this.startLeft = this.left;
      }
      this.startTop = this.top;

      // ドラッグ中はポインタイベントをグローバルで捕捉
      document.addEventListener("pointermove", this.onDrag, { passive: false });
      document.addEventListener("pointerup", this.stopDrag, { passive: true });
      document.addEventListener("pointercancel", this.stopDrag, { passive: true });
    },
    onDrag(e) {
      if (!this.dragging) return;
      if (e.cancelable) e.preventDefault();
      const newLeft = this.startLeft + (e.clientX - this.startX);
      const newTop = this.startTop + (e.clientY - this.startY);

      if (this.defaultRight > 0) {
        this.right = window.innerWidth - Math.max(0, newLeft) - this.width;
      } else {
        this.left = Math.max(0, newLeft);
      }
      this.top = Math.max(0, newTop);
    },
    stopDrag() {
      this.dragging = false;
      document.removeEventListener("pointermove", this.onDrag);
      document.removeEventListener("pointerup", this.stopDrag);
      document.removeEventListener("pointercancel", this.stopDrag);
    },
    startResize(e, dir) {
      if (this.isMaximized) return; // 最大化中はリサイズ不可
      this.resizing = true;
      this.resizeDir = dir;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startLeft = this.left;
      this.startTop = this.top;
      this.startWidth = this.width;
      this.startHeight = this.height;
      this.originalAspect = this.startWidth / this.startHeight;

      if (e.cancelable) e.preventDefault();
      document.addEventListener("pointermove", this.onResize, { passive: false });
      document.addEventListener("pointerup", this.stopResize, { passive: true });
      document.addEventListener("pointercancel", this.stopResize, { passive: true });
    },
    onResize(e) {
      if (!this.resizing) return;
      if (e.cancelable) e.preventDefault();
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      let newW = this.startWidth;
      let newH = this.startHeight;

      if (this.keepAspectRatio) {
        if (this.resizeDir.includes("right")) newW = this.startWidth + dx;
        else if (this.resizeDir.includes("left")) newW = this.startWidth - dx;
        else if (this.resizeDir.includes("bottom")) newH = this.startHeight + dy;
        else if (this.resizeDir.includes("top")) newH = this.startHeight - dy;
        newH = newW / this.originalAspect;
        newW = newH * this.originalAspect;
      } else {
        if (this.resizeDir.includes("right")) newW = this.startWidth + dx;
        if (this.resizeDir.includes("left")) { newW = this.startWidth - dx; this.left = this.startLeft + dx; }
        if (this.resizeDir.includes("bottom")) newH = this.startHeight + dy;
        if (this.resizeDir.includes("top")) { newH = this.startHeight - dy; this.top = Math.max(0, this.startTop + dy); }
      }

      if (this.keepAspectRatio && this.resizeDir.includes("left")) {
        this.left = this.startLeft + (this.startWidth - newW);
      }
      if (this.keepAspectRatio && this.resizeDir.includes("top")) {
        this.top = this.startTop + (this.startHeight - newH);
      }

      this.width = Math.max(20, newW);
      this.height = Math.max(20, newH);
      this.$emit("width-changed", this.width);
      this.$emit("height-changed", this.height);
    },
    stopResize() {
      this.resizing = false;
      document.removeEventListener("pointermove", this.onResize);
      document.removeEventListener("pointerup", this.stopResize);
      document.removeEventListener("pointercancel", this.stopResize);
    },

    // ===== 最大化/復元 =====
    maximize() {
      if (this.isMaximized) return;
      // 現在値を保持
      this.preMaxState = {
        top: this.top,
        left: this.left,
        right: this.right,
        width: this.width,
        height: this.height,
      };
      this.isMaximized = true;
      this.left = 0;
      this.right = 0;
      this.top = 0;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.$nextTick(() => {
        this.$emit("width-changed", this.width);
        this.$emit("height-changed", this.height);
      });
      this.$emit("maximize");
      window.addEventListener("resize", this.syncMaxSize, { passive: true });
    },
    restore() {
      if (!this.isMaximized) return;
      window.removeEventListener("resize", this.syncMaxSize);
      if (this.preMaxState) {
        this.top = this.preMaxState.top;
        this.left = this.preMaxState.left;
        this.right = this.preMaxState.right;
        this.width = this.preMaxState.width;
        this.height = this.preMaxState.height;
      }
      this.isMaximized = false;
      this.$nextTick(() => {
        this.$emit("width-changed", this.width);
        this.$emit("height-changed", this.height);
      });
      this.$emit("restore");
    },
    syncMaxSize() {
      if (!this.isMaximized) return;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.$nextTick(() => {
        this.$emit("width-changed", this.width);
        this.$emit("height-changed", this.height);
      });
    },
  },
  watch: {
    mapillaryZindex(value) {
      this.zIndex = value;
    },
    visible() {
      this.zIndex = getNextZIndex();
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll('.v-overlay, .bottom-right').forEach(elm => {
            elm.style.zIndex = getNextZIndex();
          });
        }, 30);
      });
    }
  },
  beforeUnmount() {
    // 念のためクリーンアップ
    document.removeEventListener("pointermove", this.onDrag);
    document.removeEventListener("pointerup", this.stopDrag);
    document.removeEventListener("pointercancel", this.stopDrag);
    document.removeEventListener("pointermove", this.onResize);
    document.removeEventListener("pointerup", this.stopResize);
    document.removeEventListener("pointercancel", this.stopResize);
    window.removeEventListener("resize", this.syncMaxSize);
  },
};
</script>

<style scoped>
.draggable-div {
  position: absolute;
  background-color: white;
  box-sizing: border-box;
  box-shadow: 2px 2px 5px #787878;
  border: 1px solid whitesmoke;
  border-radius: 4px;
  transition: opacity 1s;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /* 親はスクロール/ジェスチャーを基本許可。ドラッグ領域側で抑止する */
  touch-action: auto;
  -webkit-overflow-scrolling: touch;
  overflow: hidden;
}

.draggable-div.maximized {
  border-radius: 0;
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
  /* ドラッグ中の画面スクロール/ダブルタップズームを抑止 */
  touch-action: none;
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
.draggable-div.simple:hover .close-btn { opacity: 1; }

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
.draggable-div.normal .header .close-btn:hover { color: blue; }

/* Win風ウィンドウ操作 */
.header .window-controls {
  position: absolute;
  top: 50%;
  right: 40px; /* × の分だけ左にオフセット */
  transform: translateY(-50%);
  display: flex;
  gap: 6px;
}
.header .window-controls button {
  color: white!important;
  font-size: 20px;
  width: 28px;
  height: 24px;
  background: transparent;
  border: none;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}
.header .window-controls button:hover { color: #cfe8ff; }

.content {
  width: 101%;
  height: 102% !important;
  overflow: hidden;
}

.resizer {
  position: absolute;
  width: 10px;
  height: 10px;
  background: transparent;
  /* リサイズ中の画面スクロール抑止 */
  touch-action: none;
}
.top-left     { top: -5px; left: -5px; cursor: nwse-resize; }
.top-right    { top: -5px; right: -5px; cursor: nesw-resize; }
.bottom-left  { bottom: -5px; left: -5px; cursor: nesw-resize; }
.bottom-right {
  bottom: -5px;
  right: -5px;
  cursor: nwse-resize;
  width: 30px;
  height: 30px;
}
</style>
