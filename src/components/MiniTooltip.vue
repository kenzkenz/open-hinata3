<template>
  <span
      ref="wrapper"
      @mouseenter="show"
      @mouseleave="hide"
      @focus="show"
      @blur="hide"
      tabindex="0"
      style="display:inline-block;"
  >
    <slot></slot>
  </span>
</template>

<script>
export default {
  name: 'MiniTooltip',
  props: {
    text: {
      type: String,
      required: true
    },
    offsetX: {
      type: Number,
      default: 0
    },
    offsetY: {
      type: Number,
      default: 8
    },
    placement: {
      type: String,
      default: 'bottom' // 'bottom' or 'top'
    }
  },
  data() {
    return {
      tooltipEl: null
    }
  },
  methods: {
    show() {
      if (window.innerWidth < 1000) return
      if (this.tooltipEl) return

      const wrapper = this.$refs.wrapper
      const rect = wrapper.getBoundingClientRect()
      const tooltip = document.createElement('div')
      tooltip.className = 'mini-tooltip-text mini-tooltip-bottom'
      tooltip.innerText = this.text

      // 位置計算
      let left = rect.left + rect.width / 2 + this.offsetX
      let top
      if (this.placement === 'top') {
        top = rect.top - this.offsetY
        // 下向き三角がいい場合はarrowのCSSを変えることも可
      } else {
        top = rect.bottom + this.offsetY
      }

      Object.assign(tooltip.style, {
        position: 'absolute',
        left: left + 'px',
        top: top + 'px',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        pointerEvents: 'none'
      })

      // 矢印
      const arrow = document.createElement('div')
      arrow.className = 'mini-tooltip-arrow-up'
      tooltip.appendChild(arrow)

      document.body.appendChild(tooltip)
      this.tooltipEl = tooltip

      window.addEventListener('scroll', this.update, true)
      window.addEventListener('resize', this.update, true)
    },
    hide() {
      if (this.tooltipEl) {
        document.body.removeChild(this.tooltipEl)
        this.tooltipEl = null
      }
      window.removeEventListener('scroll', this.update, true)
      window.removeEventListener('resize', this.update, true)
    },
    update() {
      if (!this.tooltipEl) return
      const wrapper = this.$refs.wrapper
      const rect = wrapper.getBoundingClientRect()
      let left = rect.left + rect.width / 2 + this.offsetX
      let top
      if (this.placement === 'top') {
        top = rect.top - this.offsetY
      } else {
        top = rect.bottom + this.offsetY
      }
      Object.assign(this.tooltipEl.style, {
        left: left + 'px',
        top: top + 'px'
      })
    }
  },
  // beforeDestroy() {
  //   this.hide()
  // }
}
</script>

<!-- 注意！scopedは絶対につけない -->
<style>
.mini-tooltip-text {
  background-color: var(--main-color);
  color: #fff;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.2s;
  pointer-events: none;
  position: absolute;
}
.mini-tooltip-bottom { }
.mini-tooltip-arrow-up {
  position: absolute;
  left: 50%;
  top: -6px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid var(--main-color);
  z-index: 10001;
}
</style>
