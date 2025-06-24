// ✅ FanMenu.vue（Vue 2 完全対応・縦一列で左側に展開）
<template>
  <div ref="container" class="fan-container">
    <!-- 中心ボタンスロット -->
    <div ref="centerBtnRef" @click="toggle" class="center-wrapper">
      <slot name="center">
        <button class="center-btn">🌟</button>
      </slot>
    </div>
    <!-- サブボタン -->
    <div ref="subBtnRef" class="sub-btns">
    <transition-group name="fade" tag="div">
      <div
          v-for="(vnode, i) in subButtons"
          :key="i"
          class="fan-btn"
          :style="getBtnStyle(i, subButtons.length)"
      >
        <component :is="vnode" />
      </div>
    </transition-group>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FanMenu',
  props: {
    layout: {
      type: String,
      default: 'fan',
      validator: v => ['fan', 'vertical', 'horizontal', 'grid'].includes(v)
    },
    offsetX: { // ← 追加：X方向のずらし量
      type: Number,
      default: -70
    },
    // 追加：何番目のボタンから2列目にするか（0始まりのインデックス）
    columnBreakIndex: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      open: false,
      centerPos: { x: 0, y: 0 }
    }
  },
  computed: {
    subButtons() {
      let content = this.$slots.default
      // Vue 3 では default が関数なので実行して子要素を取得
      if (typeof content === 'function') {
        content = content()
      }
      return content[0].children[0].children
    }
  },
  methods: {
    toggle() {
      this.open = !this.open
      if (this.open) {
        this.$nextTick(this.updateCenter)
      }
    },
    updateCenter() {
      const btn = this.$refs.centerBtnRef
      const container = this.$refs.container
      if (!btn || !container) return
      const btnRect = btn.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      this.centerPos = {
        x: btnRect.left - containerRect.left + btnRect.width / 2,
        y: btnRect.top - containerRect.top + btnRect.height / 2
      }
    },
    getBtnStyle(idx, total) {
      console.log(total)
      if (!this.open) return { opacity: 0, pointerEvents: 'none' }
      let spacing = 50
      spacing = 70
      // if (window.innerWidth < 500) spacing = 300

      const arc = 150
      const radius = 120
      // const spacing = 100
      const size = 44

      let x = 0
      let y = 0

      switch (this.layout) {
        // case 'vertical': {
        //   x = this.offsetX
        //   y = spacing
        //   break
        // }
        case 'vertical': {
          // どこで折り返すか。prop があればそれを、なければ半分
          // alert(this.columnBreakIndex)
          const breakIdx = this.columnBreakIndex !== null
              ? this.columnBreakIndex
              : Math.ceil(total / 2)
          // 何列目？ 0 or 1
          const col = idx < breakIdx ? 0 : 1
          // 何行目？
          const row = idx < breakIdx ? idx : (idx - breakIdx)
          // alert(idx + '/' + total)
          // X方向のずらし量に、列間隔(spacing)を乗じる
          x = this.offsetX - col * spacing
          // Y方向は行ごとに spacing
          y = row * spacing
          break
        }
        case 'horizontal': {
          x = (idx - (total - 1) / 2) * spacing
          y = 0
          break
        }
        case 'grid': {
          const cols = 2
          const row = Math.floor(idx / cols)
          const col = idx % cols
          x = (col - 0.5) * spacing * 1.5
          y = (row - (Math.ceil(total / cols) - 1) / 2) * spacing
          break
        }
        default: {
          const startAngle = -270
          const angle = (total === 1) ? -90 : startAngle + idx * (arc / (total - 1))
          const rad = angle * Math.PI / 180
          x = Math.cos(rad) * radius
          y = Math.sin(rad) * radius
        }
      }

      let top
      // ── 縦モード時は親DIVの上から10pxに固定 ──
      if (this.layout === 'vertical') {
        top = '0px'
      } else {
        top = `${this.centerPos.y + y - size / 2}px`
      }

      // return {
      //   position: 'absolute',
      //   left: `${this.centerPos.x + x - size / 2}px`,
      //   top: top,
      //   zIndex: 1,
      //   opacity: 1,
      //   transition: 'all 0.3s cubic-bezier(.4,2,.6,1)'
      // }

      // 中心座標にオフセットをかけて最終的な left/top を算出
      return {
        position: 'absolute',
        left: `${this.centerPos.x + x - size/2}px`,
        top:  `${this.centerPos.y + y - size/2}px`,
        zIndex: 1,
        opacity: 1,
        transition: 'all 0.3s cubic-bezier(.4,2,.6,1)'
      }
    }
  },
  mounted() {
    const centerBtn = this.$refs.centerBtnRef
    // const centerBtn = document.querySelector('.fan-menu-0')
    const rect = centerBtn.getBoundingClientRect();
    const centerBtnTop = rect.top;  // ビューポートの上端からのピクセル数
    const subBtn = this.$refs.subBtnRef
    subBtn.style.position = 'absolute'
    subBtn.style.top = - +  centerBtnTop + 10 + 'px'
  }
}
</script>

<style>
.fan-container {
  position: relative;
  display: inline-block;
}
.center-wrapper {
  display: inline-block;
}
.center-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  font-size: 2em;
  background: #fff;
  box-shadow: 0 2px 8px #0002;
  cursor: pointer;
  transition: box-shadow 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.center-btn:active {
  box-shadow: 0 1px 3px #0003;
}
.fan-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  /*background: #fafafa;*/
  font-size: 2em;
  box-shadow: 0 1px 6px #0001;
  cursor: pointer;
  position: absolute;
  opacity: 0;
  transition: all 0.3s cubic-bezier(.4,2,.6,1);
  /*display: flex;*/
  /*align-items: center;*/
  /*justify-content: center;*/
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
.v-btn {
  margin-bottom: 6px;
}

</style>
