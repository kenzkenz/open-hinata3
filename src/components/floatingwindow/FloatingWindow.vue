<template>
  <div
      v-show="visible"
      class="draggable-div"
      :class="[{ maximized: isMaximized }, type]"
      :style="{
      top: top + 'px',
      ...(anchor === 'right' ? { right: right + 'px' } : { left: left + 'px' }),
      width: width + 'px',
      height: rootHeightStyle,
      cursor: isModal ? 'default' : (fullDraggable ? 'move' : 'default'),
      zIndex: zIndex,
    }"
      @pointerdown="onDivPointerDown"
  >
    <!-- ヘッダー（normal のみ表示） -->
    <div v-if="headerShown" class="header" ref="header" :style="{ cursor: isModal ? 'default' : 'move', touchAction: isModal ? 'auto' : 'none' }">
      <!-- タイトル：プレーンテキスト/HTML 切替 -->
      <span v-if="!titleIsHtml" class="title">{{ title }}</span>
      <span v-else class="title" v-html="title"></span>

      <!-- Win風: 拡大/元に戻す（任意） / モーダル時は非表示 -->
      <div v-if="showMaxRestore && !isModal" class="window-controls">
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

    <!-- コンテンツ領域（overflow は props で制御。既定は var(--fw-overflow, hidden)） -->
    <div
        class="content"
        :style="contentBoxStyle"
    >
      <slot />
    </div>

    <!-- リサイズハンドル（ESLint対策: v-if を wrapper に）。モーダルは不可 -->
    <template v-if="resizableEffective">
      <div
          v-for="dir in resizerDirs"
          :key="dir"
          :class="['resizer', dir]"
          @pointerdown.stop="startResize($event, dir)"
      ></div>
    </template>
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
    defaultHeight: { type: [Number, String], default: 'auto' },
    defaultTop: { type: Number, default: 120 },
    defaultLeft: { type: Number, default: 100 },
    defaultRight: { type: Number, default: 0 },

    keepAspectRatio: { type: Boolean, default: false },
    showMaxRestore: { type: Boolean, default: false },

    /** このウィンドウ自体をユーザーがリサイズできるか（通常時） */
    resizable: { type: Boolean, default: true },

    /** モーダル表示にするか（true: 画面中央・固定サイズ・ドラッグ不可・リサイズ不可） */
    isModal: { type: Boolean, default: false },

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

    /** 選択式永続化: 'never' | 'normal' | 'always' */
    persistMode: {
      type: String,
      default: "normal",
      validator: (v) => ["never", "normal", "always"].includes(v),
    },

    /** content 要素の overflow を直接指定 */
    overflow: { type: String, default: "" },

    /** defaultHeight が auto のときの高さ上限（viewport 下端からの余白 px） */
    autoHeightCapOffset: { type: Number, default: 80 },
  },

  data() {
    return {
      top: this.defaultTop,
      left: this.defaultLeft,
      right: this.defaultRight,
      width: this.defaultWidth,
      height: typeof this.defaultHeight === 'number' ? this.defaultHeight : 0,
      autoHeight: this.defaultHeight === 'auto' || this.defaultHeight === '' || this.defaultHeight === null || this.defaultHeight === undefined,
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

      // auto高さクランプ管理
      isAutoClamped: false,
      contentMo: null,

      // モーダル用の余白（必要に応じて調整可）
      SMALL_MARGIN_H: 16, // 左右トータル 16px 余白相当（実際は左右8px目安）
      SMALL_MARGIN_V: 64, // 上下合計の控え（ヘッダー/セーフエリア想定）
    };
  },

  computed: {
    ...mapState(["mapillaryZindex"]),

    // モーダルのときは強制的にリサイズ不可
    resizableEffective() {
      return this.isModal ? false : this.resizable;
    },

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
      return [
        "top-left", "top", "top-right",
        "left",               "right",
        "bottom-left", "bottom", "bottom-right"
      ];
    },
    rootHeightStyle() {
      if (this.isMaximized) return this.height + 'px';
      return this.autoHeight ? 'auto' : (this.height + 'px');
    },
    contentBoxStyle() {
      if (this.autoHeight) {
        return { height: 'auto', overflow: this.contentOverflowStyle };
      }
      return [
        this.headerShown ? { height: `calc(100% - ${this.headerHeight}px)` } : { height: '100%' },
        { overflow: this.contentOverflowStyle }
      ];
    },
    contentOverflowStyle() {
      const v = (this.overflow || '').trim();
      // モーダル or クランプ時は自動スクロールにする
      if (this.isModal || this.isAutoClamped) return 'auto';
      // 通常時は props/変数優先
      return v || 'var(--fw-overflow, hidden)';
    },
  },

  methods: {
    /* -------------------- モーダルレイアウト適用 -------------------- */
    applyModalLayout() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.max(100, vw - this.SMALL_MARGIN_H);
      const h = Math.max(100, vh - this.SMALL_MARGIN_V);

      this.isMaximized = false;
      this.autoHeight = false;
      this.width = Math.floor(w);
      this.height = Math.floor(h);

      // 画面中央に配置
      this.top = Math.max(8, Math.floor((vh - this.height) / 2));
      if (this.anchor === 'right') {
        this.right = Math.max(8, Math.floor((vw - this.width) / 2));
      } else {
        this.left = Math.max(8, Math.floor((vw - this.width) / 2));
      }

      this.$nextTick(() => {
        this.snapToEdges();
        this.$emit('width-changed', this.width);
        this.$emit('height-changed', this.height);
      });
    },

    applyNormalLayout() {
      this.restoreFromStorage();
      this.ensureInitialIfOffscreen();
      this.$nextTick(() => this.updateAutoHeightClamp());
    },

    currentHeight() {
      if (this.autoHeight) {
        const el = this.$el;
        if (el && el.offsetHeight) return el.offsetHeight;
      }
      return this.height;
    },

    /* -------------------- 永続化 -------------------- */
    saveToStorage() {
      if (!this.persist) return;
      if (this.persistMode === "never") return;
      if (this.persistMode === "normal" && this.isMaximized) return; // 最大化中は保存しない

      const key = this.storageKey || `fw:${this.windowId}`;
      const payload = {
        a: this.anchor,
        t: this.top,
        l: this.left,
        r: this.right,
        z: this.zIndex,
        max: false,
      };

      // ★ サイズは resizableEffective のときのみ保存
      if (this.resizableEffective) {
        payload.w  = this.width;
        payload.h  = this.height;
        payload.ah = this.autoHeight;
      }

      try { localStorage.setItem(key, JSON.stringify(payload)); } catch (_) {}
    },
    restoreFromStorage() {
      if (!this.persist) return;
      try {
        const key = this.storageKey || `fw:${this.windowId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          if (Number.isFinite(p.t)) this.top = p.t;
          if (Number.isFinite(p.l)) this.left = p.l;
          if (Number.isFinite(p.r)) this.right = p.r;

          // ★ サイズは resizableEffective のときだけ復元
          if (this.resizableEffective) {
            if (Number.isFinite(p.w)) this.width = p.w;
            if (p.ah !== undefined) this.autoHeight = !!p.ah;
            if (!this.autoHeight && Number.isFinite(p.h)) this.height = p.h;
          }

          if (Number.isFinite(p.z)) this.zIndex = p.z;
        }
      } catch (_) {}
    },

    /* -------------------- スナップ -------------------- */
    snapToEdges(containerW = window.innerWidth, containerH = window.innerHeight) {
      if (this.snap === 'off') return;
      const s = Math.max(0, this.snapPx | 0);
      const ed = new Set(
          this.snap === 'xy' ? ['top','bottom','left','right'] :
              this.snap === 'x'  ? ['left','right'] :
                  this.snap === 'y'  ? ['top','bottom'] :
                      Array.isArray(this.snapEdges) ? this.snapEdges : []
      );
      // 上下
      if (ed.has('top') && this.top <= s) this.top = 0;
      const currH = this.currentHeight();
      const bottomGap = containerH - (this.top + currH);
      if (ed.has('bottom') && bottomGap <= s) this.top = Math.max(0, containerH - currH);
      // 左右（アンカーに応じて）
      if (this.anchor === 'right') {
        if (ed.has('right') && this.right <= s) this.right = 0;
        const leftGap = containerW - (this.right + this.width);
        if (ed.has('left') && leftGap <= s) this.right = Math.max(0, containerW - this.width);
      } else {
        if (ed.has('left') && this.left <= s) this.left = 0;
        const rightGap = containerW - (this.left + this.width);
        if (ed.has('right') && rightGap <= s) this.left = Math.max(0, containerW - this.width);
      }
    },

    /* -------------------- オフスクリーン対策 -------------------- */
    ensureInitialIfOffscreen() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(this.width, vw);
      const h = Math.min(this.currentHeight(), vh);
      const x = this.anchor === 'right' ? vw - (this.right + w) : this.left;
      const y = this.top;
      const interW = Math.min(x + w, vw) - Math.max(x, 0);
      const interH = Math.min(y + h, vh) - Math.max(y, 0);
      const visibleEnough = interW > 24 && interH > 24;
      if (!visibleEnough) {
        this.top = this.defaultTop;
        this.width = Math.min(this.defaultWidth, vw);
        if (typeof this.defaultHeight === 'number') {
          this.height = Math.min(this.defaultHeight, vh);
          this.autoHeight = false;
        } else {
          this.autoHeight = true;
        }
        if (this.anchor === 'right') this.right = this.defaultRight; else this.left = this.defaultLeft;
        this.top = Math.min(this.top, Math.max(0, vh - this.currentHeight()));
        if (this.anchor === 'right') this.right = Math.min(this.right, Math.max(0, vw - this.width));
        else this.left = Math.min(this.left, Math.max(0, vw - this.width));
      }
    },

    /* -------------------- 閉じる -------------------- */
    close(e) {
      this.$emit('close', {
        id: this.windowId,
        isMaximized: this.isMaximized,
        rect: { top: this.top, left: this.left, right: this.right, width: this.width, height: this.height },
        nativeEvent: e || null,
        timestamp: Date.now(),
      });
      this.$store.commit('setFloatingVisible', { id: this.windowId, visible: false });
    },

    /* -------------------- ドラッグ -------------------- */
    onDivPointerDown(e) {
      if (this.isModal) return; // モーダル時はドラッグ禁止
      // リサイズハンドル上の pointerdown はドラッグ抑止
      if (e.target && e.target.closest && e.target.closest('.resizer')) return;
      if (e.cancelable) e.preventDefault();
      this.zIndex = getNextZIndex();
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll('.v-overlay').forEach((elm) => {
            elm.style.zIndex = getNextZIndex();
          });
        }, 30);
      });
      if (this.isMaximized) return;
      this.handlePointerDown(e);
    },
    handlePointerDown(e) {
      if (this.isModal) return; // モーダル時はドラッグ禁止
      if (this.resizing) return;
      if (!this.fullDraggable && this.headerShown && this.$refs.header && !this.$refs.header.contains(e.target)) return;
      this.startDrag(e);
    },
    startDrag(e) {
      this.dragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      if (this.anchor === 'right') this.startLeft = window.innerWidth - (this.right + this.width);
      else this.startLeft = this.left;
      this.startTop = this.top;
      try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch(_) {}
      document.addEventListener('pointermove', this.onDrag, { passive: false });
      document.addEventListener('pointerup', this.stopDrag, { passive: true });
      document.addEventListener('pointercancel', this.stopDrag, { passive: true });
    },
    onDrag(e) {
      if (!this.dragging) return;
      if (e.cancelable) e.preventDefault();
      const newLeft = this.startLeft + (e.clientX - this.startX);
      const newTop = this.startTop + (e.clientY - this.startY);
      if (this.anchor === 'right') this.right = window.innerWidth - Math.max(0, newLeft) - this.width; // newLeft は負値禁止
      else this.left = Math.max(0, newLeft);
      this.top = Math.max(0, newTop);
    },
    stopDrag(e) {
      this.dragging = false;
      try { e && e.target && e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); } catch(_) {}
      document.removeEventListener('pointermove', this.onDrag);
      document.removeEventListener('pointerup', this.stopDrag);
      document.removeEventListener('pointercancel', this.stopDrag);
      this.snapToEdges();
      this.saveToStorage();
      this.$nextTick(() => this.updateAutoHeightClamp());
    },

    /* -------------------- リサイズ -------------------- */
    startResize(e, dir) {
      if (!this.resizableEffective || this.isMaximized) return;
      this.resizing = true;
      this.resizeDir = dir;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startLeft = this.left;
      this.startTop = this.top;
      if (this.autoHeight) { this.height = this.$el ? this.$el.offsetHeight : 0; this.autoHeight = false; }
      this.startWidth = this.width;
      this.startHeight = this.height;
      this.originalAspect = this.startWidth / this.startHeight;
      if (e.cancelable) e.preventDefault();
      try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch(_) {}
      document.addEventListener('pointermove', this.onResize, { passive: false });
      document.addEventListener('pointerup', this.stopResize, { passive: true });
      document.addEventListener('pointercancel', this.stopResize, { passive: true });
    },
    onResize(e) {
      if (!this.resizing) return;
      if (e.cancelable) e.preventDefault();

      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;

      const hasLeft   = this.resizeDir.includes('left');
      const hasRight  = this.resizeDir.includes('right');
      const hasTop    = this.resizeDir.includes('top');
      const hasBottom = this.resizeDir.includes('bottom');

      let newW = this.startWidth;
      let newH = this.startHeight;

      if (this.keepAspectRatio) {
        const aspect = this.originalAspect || (this.startWidth / Math.max(1, this.startHeight));

        if ((hasLeft || hasRight) && !(hasTop || hasBottom)) {
          if (hasRight) newW = this.startWidth + dx;
          if (hasLeft)  newW = this.startWidth - dx;
          newH = newW / aspect;
          const dH = newH - this.startHeight;
          this.top = Math.max(0, this.startTop - dH / 2);
          if (hasLeft) this.left = this.startLeft + (this.startWidth - newW);
        }
        else if ((hasTop || hasBottom) && !(hasLeft || hasRight)) {
          if (hasBottom) newH = this.startHeight + dy;
          if (hasTop)    newH = this.startHeight - dy;
          newW = newH * aspect;
          const dW = newW - this.startWidth;
          this.left = Math.max(0, this.startLeft - dW / 2);
          if (hasTop) this.top = Math.max(0, this.startTop + (this.startHeight - newH));
        }
        else {
          if (hasRight) newW = this.startWidth + dx;
          if (hasLeft)  newW = this.startWidth - dx;
          if (!(hasLeft || hasRight)) {
            if (hasBottom) newH = this.startHeight + dy;
            if (hasTop)    newH = this.startHeight - dy;
            newW = newH * aspect;
          } else {
            newH = newW / aspect;
          }
          if (hasLeft)  this.left = this.startLeft + (this.startWidth - newW);
          if (hasTop)   this.top  = Math.max(0, this.startTop  + (this.startHeight - newH));
        }
      } else {
        if (hasRight) newW = this.startWidth + dx;
        if (hasLeft)  { newW = this.startWidth - dx; this.left = this.startLeft + dx; }
        if (hasBottom) newH = this.startHeight + dy;
        if (hasTop)    { newH = this.startHeight - dy; this.top = Math.max(0, this.startTop + dy); }
      }

      newW = Math.max(20, newW);
      newH = Math.max(20, newH);

      this.width  = newW;
      this.height = newH;
      this.$emit('width-changed', this.width);
      this.$emit('height-changed', this.height);
    },
    stopResize(e) {
      this.resizing = false;
      try { e && e.target && e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); } catch(_) {}
      document.removeEventListener('pointermove', this.onResize);
      document.removeEventListener('pointerup', this.stopResize);
      document.removeEventListener('pointercancel', this.stopResize);
      this.top = Math.min(this.top, Math.max(0, window.innerHeight - this.currentHeight()));
      if (this.anchor === 'right') this.right = Math.min(this.right, Math.max(0, window.innerWidth - this.width));
      else this.left = Math.min(this.left, Math.max(0, window.innerWidth - this.width));
      this.snapToEdges();
      this.saveToStorage();
      this.$nextTick(() => this.updateAutoHeightClamp());
    },

    /* -------------------- 最大化/復元 -------------------- */
    maximize() {
      if (this.isMaximized || this.isModal) return; // モーダルでは無効
      this.preMaxState = { top: this.top, left: this.left, right: this.right, width: this.width, height: this.height, autoHeight: this.autoHeight };
      this.isMaximized = true;
      this.left = 0; this.right = 0; this.top = 0;
      this.width = window.innerWidth; this.height = window.innerHeight; this.autoHeight = false;
      this.$nextTick(() => { this.$emit('width-changed', this.width); this.$emit('height-changed', this.height); });
      this.$emit('maximize');
      window.addEventListener('resize', this.syncMaxSize, { passive: true });
      this.saveToStorage();
    },
    restore() {
      if (!this.isMaximized) return;
      window.removeEventListener('resize', this.syncMaxSize);
      if (this.preMaxState) {
        this.top = this.preMaxState.top;
        this.left = this.preMaxState.left;
        this.right = this.preMaxState.right;
        this.width = this.preMaxState.width;
        this.height = this.preMaxState.height;
        this.autoHeight = !!this.preMaxState.autoHeight;
      }
      this.isMaximized = false;
      this.$nextTick(() => { this.$emit('width-changed', this.width); this.$emit('height-changed', this.height); });
      this.$emit('restore');
      this.saveToStorage();
      this.$nextTick(() => this.updateAutoHeightClamp());
    },
    syncMaxSize() {
      if (!this.isMaximized) return;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.$nextTick(() => { this.$emit('width-changed', this.width); this.$emit('height-changed', this.height); });
    },

    /* -------------------- キーボード操作 -------------------- */
    onKeydown(e) {
      if (!this.visible || this.isMaximized || this.isModal) return;
      const step = e.shiftKey ? 10 : 1; // モーダルではここまで来ない
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowUp')   { this.top = Math.max(0, this.top - step); this.saveToStorage(); }
      if (e.key === 'ArrowDown') { this.top = this.top + step;               this.saveToStorage(); }
      if (e.key === 'ArrowLeft') {
        if (e.altKey && this.resizableEffective) { this.width = Math.max(100, this.width - 10); this.$emit('width-changed', this.width); }
        else if (this.anchor === 'right') this.right = this.right + step;
        else this.left = Math.max(0, this.left - step);
        this.saveToStorage();
      }
      if (e.key === 'ArrowRight') {
        if (e.altKey && this.resizableEffective) { this.width = this.width + 10; this.$emit('width-changed', this.width); }
        else if (this.anchor === 'right') this.right = this.right - step;
        else this.left = this.left + step;
        this.saveToStorage();
      }
      this.$nextTick(() => this.updateAutoHeightClamp());
    },

    /* -------------------- 追加: 表示時/初期表示で width-changed を発火 -------------------- */
    emitWidthNow() {
      this.$emit('width-changed', this.width);
    },

    /* -------------------- auto高さの上限制御 -------------------- */
    updateAutoHeightClamp() {
      if (this.isModal) {
        this.isAutoClamped = false;
        return;
      }
      if (this.resizableEffective) {
        this.isAutoClamped = false;
        return;
      }

      const el = this.$el;
      if (!el) return;

      const maxH = Math.max(
          100,
          window.innerHeight - this.autoHeightCapOffset - Math.max(0, this.top | 0)
      );

      const contentEl = el.querySelector('.content');
      let natural = this.headerShown ? this.headerHeight : 0;
      if (contentEl) natural += contentEl.scrollHeight;

      const needClamp = this.autoHeight && natural > maxH;

      if (needClamp) {
        this.height = maxH;
        this.autoHeight = false;
        this.isAutoClamped = true;
        this.$nextTick(() => this.$emit('height-changed', this.height));
      } else {
        if (!this.autoHeight) {
          if (natural <= maxH) {
            this.autoHeight = true;
            this.isAutoClamped = false;
            this.$nextTick(() => this.$emit('height-changed', this.currentHeight()));
          } else {
            this.isAutoClamped = true;
            this.height = Math.max(100, Math.min(this.height, maxH));
          }
        } else {
          this.isAutoClamped = false;
        }
      }
    },

    setupContentObserver() {
      const contentEl = this.$el?.querySelector('.content');
      if (!contentEl) return;
      this.contentMo?.disconnect();
      this.contentMo = new MutationObserver(() => {
        this.$nextTick(() => this.updateAutoHeightClamp());
      });
      this.contentMo.observe(contentEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    },
  },

  mounted() {
    // 初期座標（右基準なら right を採用）
    this.top = this.defaultTop;
    if (this.anchor === 'right') this.right = this.defaultRight; else this.left = this.defaultLeft;

    // モード適用（モーダル or 通常）
    if (this.isModal) this.applyModalLayout();
    else { this.restoreFromStorage(); this.ensureInitialIfOffscreen(); }

    // 初回通知
    this.$nextTick(() => { this.emitWidthNow(); });

    // キー操作
    window.addEventListener('keydown', this.onKeydown, { passive: false });

    // 監視設定
    this.$nextTick(() => {
      this.updateAutoHeightClamp();
      this.setupContentObserver();
    });

    // 画面回転/リサイズに追従（モーダル時は都度フィット）
    const onWinResize = () => {
      if (this.isModal) this.applyModalLayout();
      else this.updateAutoHeightClamp();
    };
    window.addEventListener('resize', onWinResize, { passive: true });
    // クリーンアップ用に保存
    this._onWinResize = onWinResize;
  },

  watch: {
    mapillaryZindex(value) { this.zIndex = value; },

    // モーダルモードが動的に切り替わるケースに対応
    isModal(val) {
      if (val) this.applyModalLayout();
      else this.applyNormalLayout();
    },

    visible(val) {
      this.zIndex = getNextZIndex();
      this.$nextTick(() => {
        setTimeout(() => {
          document.querySelectorAll('.v-overlay, .bottom-right').forEach((elm) => {
            elm.style.zIndex = getNextZIndex();
          });
        }, 30);
        if (val) {
          if (this.isModal) this.applyModalLayout();
          else {
            this.ensureInitialIfOffscreen();
            this.$nextTick(() => {
              this.emitWidthNow();
              this.updateAutoHeightClamp();
              this.setupContentObserver();
            });
          }
        } else {
          this.contentMo?.disconnect();
        }
      });
    },
  },

  beforeUnmount() {
    document.removeEventListener('pointermove', this.onDrag);
    document.removeEventListener('pointerup', this.stopDrag);
    document.removeEventListener('pointercancel', this.stopDrag);
    document.removeEventListener('pointermove', this.onResize);
    document.removeEventListener('pointerup', this.stopResize);
    document.removeEventListener('pointercancel', this.stopResize);
    window.removeEventListener('resize', this.syncMaxSize);
    window.removeEventListener('keydown', this.onKeydown);
    if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);
    this.contentMo?.disconnect();
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
  -webkit-overflow-scrolling: touch;
  overflow: hidden; /* ルートは常に隠す。スクロールは .content で制御 */
}

.draggable-div.maximized { border-radius: 0; }

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

.header .title { display: inline-flex; align-items: center; gap: 6px; }
.header .title :deep(small) { opacity: 0.9; }

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
.header .window-controls button:hover { color: blue !important; }

.content {
  /* overflow は computed(contentOverflowStyle) 経由 */
}

.resizer {
  position: absolute;
  background: transparent;
  /* リサイズ中の画面スクロール抑止 */
  touch-action: none;
  user-select: none;
  z-index: 5; /* コンテンツより前面に */
}
/* 角ハンドル（デフォルト） */
.top-left    { top: -5px; left: -5px; width: 10px; height: 10px; cursor: nwse-resize; }
.top-right   { top: -5px; right: -5px; width: 10px; height: 10px; cursor: nesw-resize; }
.bottom-left { bottom: -5px; left: -5px; width: 10px; height: 10px; cursor: nesw-resize; }
.bottom-right{ bottom: -5px; right: -5px; width: 30px; height: 30px; cursor: nwse-resize; }
/* 辺ハンドル（デフォルト） */
.top    { top: -4px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
.bottom { bottom: -4px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
.left   { left: -4px; top: 8px; bottom: 8px; width: 8px; cursor: ew-resize; }
.right  { right: -4px; top: 8px; bottom: 8px; width: 8px; cursor: ew-resize; }

/* ===== タッチ（coarse pointer）向けにヒット領域を拡大 ===== */
@media (pointer: coarse) {
  .top-left    { top: -8px; left: -8px; width: 24px; height: 24px; }
  .top-right   { top: -8px; right: -8px; width: 24px; height: 24px; }
  .bottom-left { bottom: -8px; left: -8px; width: 24px; height: 24px; }
  .bottom-right{ bottom: -8px; right: -8px; width: 36px; height: 36px; }

  .top    { top: -8px; left: 12px; right: 12px; height: 16px; }
  .bottom { bottom: -8px; left: 12px; right: 12px; height: 16px; }
  .left   { left: -8px; top: 12px; bottom: 12px; width: 16px; }
  .right  { right: -8px; top: 12px; bottom: 12px; width: 16px; }

  /* 指で分かるように、わずかにヒット領域を可視化（必要なら消す） */
  .resizer { background: transparent; }
}
</style>
