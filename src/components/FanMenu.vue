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
      const content = this.$slots.default
      return Array.isArray(content) ? content.filter(Boolean) : [content].filter(Boolean)
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
      if (!this.open) return { opacity: 0, pointerEvents: 'none' }

      const arc = 150
      const radius = 120
      const spacing = 0
      const size = 44

      let x = 0
      let y = 0

      switch (this.layout) {
        case 'vertical': {
          x = this.offsetX
          y = spacing
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

      return {
        position: 'absolute',
        left: `${this.centerPos.x + x - size / 2}px`,
        top: `${this.centerPos.y + y - size / 2}px`,
        zIndex: 1,
        opacity: 1,
        transition: 'all 0.3s cubic-bezier(.4,2,.6,1)'
      }
    }
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
  display: flex;
  align-items: center;
  justify-content: center;
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




<!--<template>-->
<!--  <div ref="container" class="fan-container">-->
<!--    &lt;!&ndash; 中心ボタンスロット &ndash;&gt;-->
<!--    <div ref="centerBtnRef" @click="toggle" class="center-wrapper">-->
<!--      <slot name="center">-->
<!--        <button class="center-btn">🌟</button>-->
<!--      </slot>-->
<!--    </div>-->

<!--    &lt;!&ndash; サブボタン &ndash;&gt;-->
<!--    <transition-group name="fade" tag="div">-->
<!--      <div-->
<!--          v-for="(vnode, i) in subButtons"-->
<!--          :key="i"-->
<!--          class="fan-btn"-->
<!--          :style="getBtnStyle(i, subButtons.length)"-->
<!--      >-->
<!--        <component :is="vnode" />-->
<!--      </div>-->
<!--    </transition-group>-->
<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--export default {-->
<!--  name: 'FanMenu',-->
<!--  props: {-->
<!--    layout: {-->
<!--      type: String,-->
<!--      default: 'fan',-->
<!--      validator: v => ['fan', 'vertical', 'horizontal', 'grid'].includes(v)-->
<!--    }-->
<!--  },-->
<!--  data() {-->
<!--    return {-->
<!--      open: false,-->
<!--      centerPos: { x: 0, y: 0 }-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    subButtons() {-->
<!--      const content = this.$slots.default-->
<!--      return Array.isArray(content) ? content.filter(Boolean) : [content].filter(Boolean)-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    toggle() {-->
<!--      this.open = !this.open-->
<!--      if (this.open) {-->
<!--        this.$nextTick(() => {-->
<!--          this.updateCenter()-->
<!--        })-->
<!--      }-->
<!--    },-->
<!--    updateCenter() {-->
<!--      const btn = this.$refs.centerBtnRef-->
<!--      const container = this.$refs.container-->
<!--      if (!btn || !container) return-->

<!--      const btnRect = btn.getBoundingClientRect()-->
<!--      const containerRect = container.getBoundingClientRect()-->
<!--      this.centerPos = {-->
<!--        x: btnRect.left - containerRect.left + btnRect.width / 2,-->
<!--        y: btnRect.top - containerRect.top + btnRect.height / 2-->
<!--      }-->
<!--    },-->
<!--    getBtnStyle(idx, total) {-->
<!--      if (!this.open) return { opacity: 0, pointerEvents: 'none' }-->

<!--      const arc = 150-->
<!--      const radius = 120-->
<!--      const spacing = 56-->
<!--      const size = 44-->

<!--      let x = 0-->
<!--      let y = 0-->

<!--      switch (this.layout) {-->
<!--        case 'vertical': {-->
<!--          x = 0-->
<!--          y = (idx - (total - 1) / 2) * spacing-->
<!--          break-->
<!--        }-->
<!--        case 'horizontal': {-->
<!--          x = (idx - (total - 1) / 2) * spacing-->
<!--          y = 0-->
<!--          break-->
<!--        }-->
<!--        case 'grid': {-->
<!--          const cols = 2-->
<!--          const row = Math.floor(idx / cols)-->
<!--          const col = idx % cols-->
<!--          x = (col - 0.5) * spacing * 1.5-->
<!--          y = (row - (Math.ceil(total / cols) - 1) / 2) * spacing-->
<!--          break-->
<!--        }-->
<!--        default: {-->
<!--          const startAngle = -270-->
<!--          const angle = (total === 1)-->
<!--              ? -90-->
<!--              : startAngle + idx * (arc / (total - 1))-->
<!--          const rad = angle * Math.PI / 180-->
<!--          x = Math.cos(rad) * radius-->
<!--          y = Math.sin(rad) * radius-->
<!--        }-->
<!--      }-->

<!--      return {-->
<!--        position: 'absolute',-->
<!--        left: `${this.centerPos.x + x - size / 2}px`,-->
<!--        top: `${this.centerPos.y + y - size / 2}px`,-->
<!--        zIndex: 1,-->
<!--        opacity: 1,-->
<!--        transition: 'all 0.3s cubic-bezier(.4,2,.6,1)'-->
<!--      }-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.fan-container {-->
<!--  position: relative;-->
<!--  display: inline-block;-->
<!--}-->
<!--.center-wrapper {-->
<!--  display: inline-block;-->
<!--}-->
<!--.center-btn {-->
<!--  width: 44px;-->
<!--  height: 44px;-->
<!--  border-radius: 50%;-->
<!--  border: none;-->
<!--  font-size: 2em;-->
<!--  background: #fff;-->
<!--  box-shadow: 0 2px 8px #0002;-->
<!--  cursor: pointer;-->
<!--  transition: box-shadow 0.15s;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--}-->
<!--.center-btn:active {-->
<!--  box-shadow: 0 1px 3px #0003;-->
<!--}-->
<!--.fan-btn {-->
<!--  width: 44px;-->
<!--  height: 44px;-->
<!--  border-radius: 50%;-->
<!--  border: none;-->
<!--  background: #fafafa;-->
<!--  font-size: 2em;-->
<!--  box-shadow: 0 1px 6px #0001;-->
<!--  cursor: pointer;-->
<!--  position: absolute;-->
<!--  opacity: 0;-->
<!--  transition: all 0.3s cubic-bezier(.4,2,.6,1);-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--}-->
<!--.fade-enter-active,-->
<!--.fade-leave-active {-->
<!--  transition: opacity 0.2s;-->
<!--}-->
<!--.fade-enter-from,-->
<!--.fade-leave-to {-->
<!--  opacity: 0;-->
<!--}-->
<!--.fade-enter-to,-->
<!--.fade-leave-from {-->
<!--  opacity: 1;-->
<!--}-->
<!--</style>-->






<!--<template>-->
<!--&lt;!&ndash;  <div ref="container" style="display:flex;align-items:center;justify-content:center;position:relative;min-height:120px;">&ndash;&gt;-->
<!--  <div ref="container" style="display:flex;align-items:center;justify-content:center;position:relative;">-->
<!--    &lt;!&ndash; 中心ボタンスロット &ndash;&gt;-->
<!--    <div ref="centerBtnRef" @click="toggle" style="display:inline-block;">-->
<!--      <slot name="center">-->
<!--        <button class="center-btn">🌟</button>-->
<!--      </slot>-->
<!--    </div>-->
<!--    &lt;!&ndash; サブボタン（default slotで全部受ける） &ndash;&gt;-->
<!--    <transition-group name="fade">-->
<!--      <div-->
<!--          v-for="(vnode, i) in subButtons"-->
<!--          :key="i"-->
<!--          class="fan-btn"-->
<!--          :style="getBtnStyle(i, subButtons.length)"-->
<!--      >-->
<!--        &lt;!&ndash; slotで渡されたVNodeそのものを描画 &ndash;&gt;-->
<!--        <component :is="vnode" />-->
<!--      </div>-->
<!--    </transition-group>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup>-->
<!--import { ref, nextTick, useSlots, computed } from 'vue'-->

<!--const open = ref(false)-->
<!--const centerBtnRef = ref(null)-->
<!--const container = ref(null)-->
<!--const centerPos = ref({ x: 0, y: 0 })-->

<!--const slots = useSlots()-->
<!--const subButtons = computed(() => slots.default ? slots.default() : [])-->

<!--function updateCenter() {-->
<!--  if (centerBtnRef.value && container.value) {-->
<!--    const btnRect = centerBtnRef.value.getBoundingClientRect()-->
<!--    const containerRect = container.value.getBoundingClientRect()-->
<!--    centerPos.value = {-->
<!--      x: btnRect.left - containerRect.left + btnRect.width / 2,-->
<!--      y: btnRect.top - containerRect.top + btnRect.height / 2-->
<!--    }-->
<!--  }-->
<!--}-->
<!--function toggle() {-->
<!--  open.value = !open.value-->
<!--  if (open.value) nextTick(updateCenter)-->
<!--}-->

<!--// arcやradiusは固定値で-->
<!--const arc = 150-->
<!--const radius = 120-->

<!--function getBtnStyle(idx, total) {-->
<!--  if (!open.value) return { opacity: 0, pointerEvents: 'none' }-->
<!--  const startAngle = -270-->
<!--  const angle = (total === 1)-->
<!--      ? -90-->
<!--      : startAngle + idx * (arc / (total - 1))-->
<!--  const rad = angle * Math.PI / 180-->
<!--  const x = Math.cos(rad) * radius-->
<!--  const y = Math.sin(rad) * radius-->
<!--  return {-->
<!--    position: 'absolute',-->
<!--    left: `${centerPos.value.x + x - 22}px`,-->
<!--    top:  `${centerPos.value.y + y - 22}px`,-->
<!--    zIndex: 1,-->
<!--    opacity: 1,-->
<!--    transition: 'all 0.3s cubic-bezier(.4,2,.6,1)'-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.center-btn {-->
<!--  width: 44px; height: 44px;-->
<!--  border-radius: 50%;-->
<!--  border: none;-->
<!--  font-size: 2em;-->
<!--  background: #fff;-->
<!--  box-shadow: 0 2px 8px #0002;-->
<!--  cursor: pointer;-->
<!--  transition: box-shadow 0.15s;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--}-->
<!--.center-btn:active {-->
<!--  box-shadow: 0 1px 3px #0003;-->
<!--}-->
<!--.fan-btn {-->
<!--  width: 44px; height: 44px;-->
<!--  border-radius: 50%;-->
<!--  border: none;-->
<!--  background: #fafafa;-->
<!--  font-size: 2em;-->
<!--  box-shadow: 0 1px 6px #0001;-->
<!--  cursor: pointer;-->
<!--  position: absolute;-->
<!--  opacity: 0;-->
<!--  transition: all 0.3s cubic-bezier(.4,2,.6,1);-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--}-->
<!--.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }-->
<!--.fade-enter-from, .fade-leave-to { opacity: 0; }-->
<!--.fade-enter-to, .fade-leave-from { opacity: 1; }-->
<!--</style>-->
