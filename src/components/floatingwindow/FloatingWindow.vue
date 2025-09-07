<template>
  <div
      v-show="visible"
      class="draggable-div"
      :class="[{ maximized: isMaximized }, type]"
      :style="{
      top: top + 'px',
      ...(anchor === 'right' ? { right: right + 'px' } : { left: left + 'px' }),
      width: width + 'px',
      height: height + 'px',
      cursor: fullDraggable ? 'move' : 'default',
      zIndex: zIndex
    }"
      @pointerdown="onDivPointerDown"
  >
    <!-- ヘッダー（normal のみ表示） -->
    <div v-if="headerShown" class="header" ref="header">
      <!-- タイトル：プレーンテキスト/HTML 切替 -->
      <span v-if="!titleIsHtml" class="title">{{ title }}</span>
      <span v-else class="title" v-html="title"></span>

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

      <!-- Close -->
      <button class="close-btn" @click.stop="close($event)">×</button>
    </div>

    <!-- simple の場合、ヘッダー外にボタン -->
    <button v-else class="close-btn" @click.stop="close($event)">×</button>

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
  emits: ["close", "maximize", "restore", "width-changed", "height-changed"],
  props: {
    windowId: { type: String, required: true },
    title: { type: String, default: "" },
    /** タイトルを HTML として描画するか（デフォルトはテキスト） */
    titleIsHtml: { type: Boolean, default: false },

    // 初期サイズ・位置
    defaultWidth: { type: Number, default: 200 },
    defaultHeight: { type: Number, default: 200 },
    defaultTop: { type: Number, default: 120 },
    defaultLeft: { type: Number, default: 100 },
    defaultRight: { type: Number, default: 0 },

    keepAspectRatio: { type: Boolean, default: false },
    showMaxRestore: { type: Boolean, default: false },

    type: {
      type: String,
      default: "normal",
      validator: (v) => ["simple", "normal"].includes(v),
    },

    /** 左右アンカー（右寄せウィンドウを素直に扱う） */
    anchor: {
      type: String,
      default: "left",
      validator: (v) => ["left", "right"].includes(v),
    },

    /** 端スナップ距離(px) */
    snapPx: { type: Number, default: 12 },

    /** スナップ選択（'off'|'x'|'y'|'xy'|'edges'） */
    // ★ 既定を 'y' に変更（水平は吸着しない）
    snap: {
      type: String,
      default: "y",
      validator: (v) => ["off", "x", "y", "xy", "edges"].includes(v),
    },

    /** snap==='edges' のときに適用するエッジ集合 */
    snapEdges: {
      type: Array,
      default: () => ["top", "bottom", "left", "right"],
    },

    /** 位置/サイズの保存（全体ON/OFF） */
    persist: { type: Boolean, default: true },

    /** 保存キー（未指定時は windowId を使用） */
    storageKey: { type: String, default: "" },

    /** 選択式永続化: 'never' | 'normal' | 'always'
     *  - never  : 常に保存しない
     *  - normal : 通常時のみ保存（最大化中は保存しない）[既定]
     *  - always : 最大化中も含め常に保存
     */
    persistMode: {
      type: String,
      default: "normal",
      validator: (v) => ["never", "normal", "always"].includes(v),
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

      // 最大化
      isMaximized: false,
      preMaxState: null,
    };
  },

  computed: {
    ...mapState(["mapillaryZindex"]),
    // Vuex: このIDの表示状態
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
    /* -------------------- 永続化 -------------------- */
    saveToStorage() {
      // 全体オプトアウト
      if (!this.persist) return;
      // モードで分岐
      if (this.persistMode === "never") return;
      // normal: 最大化中は保存しない（要件）
      if (this.persistMode === "normal" && this.isMaximized) return;

      const key = this.storageKey || `fw:${this.windowId}`;
      const payload = {
        a: this.anchor, // 参照用（復元で上書きはしない）
        t: this.top,
        l: this.left,
        r: this.right,
        w: this.width,
        h: this.height,
        z: this.zIndex,
        max: false, // 最大化状態は保存しない
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (_e) {}
    },
    restoreFromStorage() {
      if (!this.persist) return;
      try {
        const key = this.storageKey || `fw:${this.windowId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p && typeof p === "object") {
          if (Number.isFinite(p.t)) this.top = p.t;
          if (Number.isFinite(p.l)) this.left = p.l;
          if (Number.isFinite(p.r)) this.right = p.r;
          if (Number.isFinite(p.w)) this.width = p.w;
          if (Number.isFinite(p.h)) this.height = p.h;
          if (Number.isFinite(p.z)) this.zIndex = p.z;
          // isMaximized は復元しない（画面サイズ依存）
        }
      } catch (_e) {}
    },

    /* -------------------- スナップ -------------------- */
    snapToEdges(containerW = window.innerWidth, containerH = window.innerHeight) {
      if (this.snap === "off") return;
      const s = Math.max(0, this.snapPx | 0);
      const ed = new Set(
          this.snap === "xy"
              ? ["top", "bottom", "left", "right"]
              : this.snap === "x"
                  ? ["left", "right"]
                  : this.snap === "y"
                      ? ["top", "bottom"]
                      : Array.isArray(this.snapEdges)
                          ? this.snapEdges
                          : []
      );
      // 上下
      if (ed.has("top") && this.top <= s) this.top = 0;
      const bottomGap = containerH - (this.top + this.height);
      if (ed.has("bottom") && bottomGap <= s)
        this.top = Math.max(0, containerH - this.height);
      // 左右（アンカーに応じて）
      if (this.anchor === "right") {
        if (ed.has("right") && this.right <= s) this.right = 0;
        const leftGap = containerW - (this.right + this.width);
        if (ed.has("left") && leftGap <= s)
          this.right = Math.max(0, containerW - this.width);
      } else {
        if (ed.has("left") && this.left <= s) this.left = 0;
        const rightGap = containerW - (this.left + this.width);
        if (ed.has("right") && rightGap <= s)
          this.left = Math.max(0, containerW - this.width);
      }
    },

    /* -------------------- オフスクリーン対策 -------------------- */
    ensureInitialIfOffscreen() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 評価用サイズ（画面より大きければ収まる範囲で判定）
      const w = Math.min(this.width, vw);
      const h = Math.min(this.height, vh);

      // 左上位置（rightアンカーはxを計算）
      const x = this.anchor === "right" ? vw - (this.right + w) : this.left;
      const y = this.top;

      // 可視領域との交差（24px以上見えていればOK）
      const interW = Math.min(x + w, vw) - Math.max(x, 0);
      const interH = Math.min(y + h, vh) - Math.max(y, 0);
      const visibleEnough = interW > 24 && interH > 24;

      if (!visibleEnough) {
        // 初期値へ戻す（クランプ込み）
        this.top = this.defaultTop;
        this.width = Math.min(this.defaultWidth, vw);
        this.height = Math.min(this.defaultHeight, vh);
        if (this.anchor === "right") {
          this.right = this.defaultRight;
        } else {
          this.left = this.defaultLeft;
        }
        // 念のためクランプ
        this.top = Math.min(this.top, Math.max(0, vh - this.height));
        if (this.anchor === "right") {
          this.right = Math.min(this.right, Math.max(0, vw - this.width));
        } else {
          this.left = Math.min(this.left, Math.max(0, vw - this.width));
        }
      }
    },

    /* -------------------- 閉じる -------------------- */
    close(e) {
      this.$emit("close", {
        id: this.windowId,
        isMaximized: this.isMaximized,
        rect: {
          top: this.top,
          left: this.left,
          right: this.right,
          width: this.width,
          height: this.height,
        },
        nativeEvent: e || null,
        timestamp: Date.now(),
      });
      this.$store.commit("setFloatingVisible", {
        id: this.windowId,
        visible: false,
      });
    },

    /* -------------------- ドラッグ -------------------- */
    onDivPointerDown(e) {
      if (e.cancelable) e.preventDefault();
      this.zIndex = getNextZIndex();
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll(".v-overlay").forEach((elm) => {
            elm.style.zIndex = getNextZIndex();
          });
        }, 30);
      });
      if (this.isMaximized) return;
      this.handlePointerDown(e);
    },
    handlePointerDown(e) {
      if (this.resizing) return;
      if (
          !this.fullDraggable &&
          this.headerShown &&
          this.$refs.header &&
          !this.$refs.header.contains(e.target)
      )
        return;
      this.startDrag(e);
    },
    startDrag(e) {
      this.dragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;

      // 右寄せ開始位置に対応
      if (this.anchor === "right") {
        this.startLeft = window.innerWidth - (this.right + this.width);
      } else {
        this.startLeft = this.left;
      }
      this.startTop = this.top;

      document.addEventListener("pointermove", this.onDrag, { passive: false });
      document.addEventListener("pointerup", this.stopDrag, { passive: true });
      document.addEventListener("pointercancel", this.stopDrag, { passive: true });
    },
    onDrag(e) {
      if (!this.dragging) return;
      if (e.cancelable) e.preventDefault();
      const newLeft = this.startLeft + (e.clientX - this.startX);
      const newTop = this.startTop + (e.clientY - this.startY);

      if (this.anchor === "right") {
        this.right = window.innerWidth - Math.max(0, newLeft) - this.width; // 右端は越境可（newLeft側は負値禁止）
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
      // スナップ＆保存
      this.snapToEdges();
      this.saveToStorage();
    },

    /* -------------------- リサイズ -------------------- */
    startResize(e, dir) {
      if (this.isMaximized) return;
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
      // 画面内に収めてスナップ＆保存
      this.top = Math.min(this.top, Math.max(0, window.innerHeight - this.height));
      if (this.anchor === "right")
        this.right = Math.min(this.right, Math.max(0, window.innerWidth - this.width));
      else this.left = Math.min(this.left, Math.max(0, window.innerWidth - this.width));
      this.snapToEdges();
      this.saveToStorage();
    },

    /* -------------------- 最大化/復元 -------------------- */
    maximize() {
      if (this.isMaximized) return;
      this.preMaxState = { top: this.top, left: this.left, right: this.right, width: this.width, height: this.height };
      this.isMaximized = true;
      this.left = 0; this.right = 0; this.top = 0;
      this.width = window.innerWidth; this.height = window.innerHeight;
      this.$nextTick(() => { this.$emit("width-changed", this.width); this.$emit("height-changed", this.height); });
      this.$emit("maximize");
      window.addEventListener("resize", this.syncMaxSize, { passive: true });
      // ガード付きなので normal モードでは保存されない
      this.saveToStorage();
    },
    restore() {
      if (!this.isMaximized) return;
      window.removeEventListener("resize", this.syncMaxSize);
      if (this.preMaxState) {
        this.top = this.preMaxState.top; this.left = this.preMaxState.left; this.right = this.preMaxState.right;
        this.width = this.preMaxState.width; this.height = this.preMaxState.height;
      }
      this.isMaximized = false;
      this.$nextTick(() => { this.$emit("width-changed", this.width); this.$emit("height-changed", this.height); });
      this.$emit("restore");
      this.saveToStorage();
    },
    syncMaxSize() {
      if (!this.isMaximized) return;
      this.width = window.innerWidth; this.height = window.innerHeight;
      this.$nextTick(() => { this.$emit("width-changed", this.width); this.$emit("height-changed", this.height); });
    },

    /* -------------------- キーボード操作 -------------------- */
    onKeydown(e) {
      if (!this.visible || this.isMaximized) return;
      const step = e.shiftKey ? 10 : 1;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();

      if (e.key === "ArrowUp")   { this.top = Math.max(0, this.top - step); this.saveToStorage(); }
      if (e.key === "ArrowDown") { this.top = this.top + step;               this.saveToStorage(); }
      if (e.key === "ArrowLeft") {
        if (e.altKey) { this.width = Math.max(100, this.width - 10); this.$emit("width-changed", this.width); }
        else if (this.anchor === "right") this.right = this.right + step; // 右アンカー: 左へ移動
        else this.left = Math.max(0, this.left - step);
        this.saveToStorage();
      }
      if (e.key === "ArrowRight") {
        if (e.altKey) { this.width = this.width + 10; this.$emit("width-changed", this.width); }
        else if (this.anchor === "right") this.right = this.right - step;   // ★ 越境許可: 0未満OK
        else this.left = this.left + step;
        this.saveToStorage();
      }
    },
  },

  mounted() {
    // 初期座標（右基準なら right を採用）
    this.top = this.defaultTop;
    if (this.anchor === "right") this.right = this.defaultRight; else this.left = this.defaultLeft;

    // 保存値復元 → 画面外チェック
    this.restoreFromStorage();
    this.ensureInitialIfOffscreen();

    // キー操作
    window.addEventListener("keydown", this.onKeydown, { passive: false });
  },

  watch: {
    mapillaryZindex(value) {
      this.zIndex = value;
    },
    visible(val) {
      this.zIndex = getNextZIndex();
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll('.v-overlay, .bottom-right').forEach((elm) => {
            elm.style.zIndex = getNextZIndex();
          });
        }, 30);
        if (val) this.ensureInitialIfOffscreen(); // 表示になったら再チェック
      });
    },
  },

  beforeUnmount() {
    // クリーンアップ
    document.removeEventListener("pointermove", this.onDrag);
    document.removeEventListener("pointerup", this.stopDrag);
    document.removeEventListener("pointercancel", this.stopDrag);
    document.removeEventListener("pointermove", this.onResize);
    document.removeEventListener("pointerup", this.stopResize);
    document.removeEventListener("pointercancel", this.stopResize);
    window.removeEventListener("resize", this.syncMaxSize);
    window.removeEventListener("keydown", this.onKeydown);
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

/* タイトル内 HTML の軽い調整 */
.header .title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.header .title :deep(small) {
  opacity: 0.9;
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
  color: white !important;
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
.header .window-controls button:hover {
  color: blue !important;
}

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
.top-left    { top: -5px; left: -5px; cursor: nwse-resize; }
.top-right   { top: -5px; right: -5px; cursor: nesw-resize; }
.bottom-left { bottom: -5px; left: -5px; cursor: nesw-resize; }
.bottom-right{
  bottom: -5px;
  right: -5px;
  cursor: nwse-resize;
  width: 30px;
  height: 30px;
}
</style>



<!--

完全に覚えさせない（保存もしない・復元もしない）
  <FloatingWindow :persist="false" />
  ※ persist=false だと内部で保存・復元ロジックを丸ごとスキップします。

「保存しない」だけを明示（persist は使うが方針でOFF）
  <FloatingWindow persist-mode="never" />
  ※ persist-mode="never" は常に保存しません（復元は既存データがあれば読む）。
  復元もさせたくないなら :persist="false" を使うのが手っ取り早いです。

既に保存されている位置サイズを消したいとき（任意）
  例：windowId が 'mapillary-filter' の場合
  localStorage.removeItem('fw:mapillary-filter')
  storageKey を指定しているならそのキー名で消す

参考：既定は persist=true ＋ persist-mode="normal"（通常時のみ保存・最大化中は保存しない）です。

-->