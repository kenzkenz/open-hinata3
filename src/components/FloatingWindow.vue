<template>
  <div
      v-show="visible"
      class="draggable-div"
      :style="{
      top: top + 'px',
      left: left + 'px',
      width: width + 'px',
      height: height + 'px',
      cursor: fullDraggable ? 'move' : 'default'
    }"
      @mousedown="handleMouseDown"
  >
    <!-- Close ボタン：常に表示可能 -->
    <button class="close-btn" @click="close">×</button>

    <!-- ヘッダー -->
    <div v-if="hasHeader" class="header" ref="header">
      <span class="title">{{ title }}</span>
    </div>

    <!-- コンテンツ領域 -->
    <div
        class="content"
        :style="hasHeader
        ? { height: `calc(100% - ${headerHeight}px)` }
        : { height: '100%' }"
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
export default {
  name: 'FloatingWindow',
  props: {
    title:            { type: String,  default: '' },
    defaultWidth:     { type: Number,  default: 200 },
    defaultHeight:    { type: Number,  default: 200 },
    restrictToHeader: { type: Boolean, default: false },
    hasHeader:        { type: Boolean, default: true },
    keepAspectRatio:  { type: Boolean, default: false },
  },
  data() {
    return {
      visible: false,
      top: 100,
      left: 100,
      width: this.defaultWidth,
      height: this.defaultHeight,
      dragging: false,
      resizing: false,
      resizeDir: '',
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      startWidth: 0,
      startHeight: 0,
      originalAspect: 1,
    };
  },
  computed: {
    resizerDirs() {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    },
    headerHeight() {
      return this.hasHeader ? 32 : 0;
    },
    fullDraggable() {
      return !this.restrictToHeader || !this.hasHeader;
    }
  },
  methods: {
    show() {
      this.visible = true;
    },
    close() {
      this.visible = false;
    },
    handleMouseDown(e) {
      if (this.resizing) return;
      if (this.restrictToHeader && this.hasHeader && !this.$refs.header.contains(e.target)) {
        return;
      }
      this.startDrag(e);
    },
    startDrag(e) {
      this.dragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startLeft = this.left;
      this.startTop = this.top;
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    },
    onDrag(e) {
      if (!this.dragging) return;
      this.left = this.startLeft + (e.clientX - this.startX);
      this.top  = this.startTop  + (e.clientY - this.startY);
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
      this.startLeft   = this.left;
      this.startTop    = this.top;
      this.startWidth  = this.width;
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
        // どちらかの方向の変化量で新しいサイズを計算
        if (this.resizeDir.includes('right')) {
          newW = this.startWidth + dx;
        } else if (this.resizeDir.includes('left')) {
          newW = this.startWidth - dx;
        } else if (this.resizeDir.includes('bottom')) {
          newH = this.startHeight + dy;
        } else if (this.resizeDir.includes('top')) {
          newH = this.startHeight - dy;
        }
        // アスペクト比を維持
        newH = newW / this.originalAspect;
        newW = newH * this.originalAspect;
      } else {
        // 非固定比率でのリサイズ
        if (this.resizeDir.includes('right'))  newW = this.startWidth + dx;
        if (this.resizeDir.includes('left')) {
          newW = this.startWidth - dx;
          this.left = this.startLeft + dx;
        }
        if (this.resizeDir.includes('bottom')) newH = this.startHeight + dy;
        if (this.resizeDir.includes('top')) {
          newH = this.startHeight - dy;
          this.top = this.startTop + dy;
        }
      }

      // 左／上ハンドルで固定比率の場合、位置補正
      if (this.keepAspectRatio && this.resizeDir.includes('left')) {
        this.left = this.startLeft + (this.startWidth - newW);
      }
      if (this.keepAspectRatio && this.resizeDir.includes('top')) {
        this.top = this.startTop + (this.startHeight - newH);
      }

      this.width  = Math.max(20, newW);
      this.height = Math.max(20, newH);
      this.$emit('width-changed',  this.width);
      this.$emit('height-changed', this.height);
    },
    stopResize() {
      this.resizing = false;
      document.removeEventListener('mousemove', this.onResize);
      document.removeEventListener('mouseup', this.stopResize);
    }
  }
};
</script>

<style scoped>
.draggable-div {
  position: absolute;
  background-color: white;
  box-sizing: border-box;
  user-select: none;
  z-index: 9;
}
.header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: move;
  background-color: var(--main-color);
  color: white;
  height: 32px;
  line-height: 24px;
}
.close-btn {
  color: red;
  position: absolute;
  top: 4px;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 30px;
  line-height: 30px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}
.draggable-div:hover .close-btn {
  opacity: 1;
}
.content {
  width: 100%;
  overflow: auto;
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
@media screen and (max-width: 1000px) {
  .close-btn {
    opacity: 1;
  }
}
</style>
