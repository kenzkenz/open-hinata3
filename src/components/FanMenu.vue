<template>
  <div ref="container" style="display:flex;align-items:center;justify-content:center;position:relative;min-height:120px;">
    <!-- 中心ボタンスロット -->
    <div ref="centerBtnRef" @click="toggle" style="display:inline-block;">
      <slot name="center">
        <button class="center-btn">🌟</button>
      </slot>
    </div>
    <!-- 扇状に展開されるサブアイコン -->
    <transition-group name="fade">
      <button
          v-for="(item, i) in items"
          :key="item.label"
          class="fan-btn"
          :style="getBtnStyle(i, items.length)"
          @click="select(item)"
      >{{ item.icon }}</button>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const open = ref(false)
const items = [
  { label: 'A', icon: '🍎' },
  { label: 'B', icon: '🍊' },
  { label: 'C', icon: '🍇' },
  { label: 'D', icon: '🍋' },
]

const arc = 120
const radius = 90

const centerBtnRef = ref(null)
const container = ref(null)

const centerPos = ref({ x: 0, y: 0 })

function updateCenter() {
  if (centerBtnRef.value && container.value) {
    const btnRect = centerBtnRef.value.getBoundingClientRect()
    const containerRect = container.value.getBoundingClientRect()
    centerPos.value = {
      x: btnRect.left - containerRect.left + btnRect.width / 2,
      y: btnRect.top - containerRect.top + btnRect.height / 2
    }
  }
}
function toggle() {
  open.value = !open.value
  if (open.value) nextTick(updateCenter)
}

function select(item) {
  alert('選択: ' + item.label)
  open.value = false
}

function getBtnStyle(idx, total) {
  if (!open.value) return { opacity: 0, pointerEvents: 'none' }
  // スロット中心から扇状に
  const startAngle = -250
  const angle = (total === 1)
      ? -90
      : startAngle + idx * (arc / (total - 1))
  const rad = angle * Math.PI / 180
  const x = Math.cos(rad) * radius
  const y = Math.sin(rad) * radius
  return {
    position: 'absolute',
    left: `${centerPos.value.x + x - 22}px`,
    top:  `${centerPos.value.y + y - 22}px`,
    zIndex: 1,
    opacity: 1,
    transition: 'all 0.3s cubic-bezier(.4,2,.6,1)'
  }
}
</script>

<style scoped>
.center-btn {
  width: 44px; height: 44px;
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
  width: 44px; height: 44px;
  border-radius: 50%;
  border: none;
  background: #fafafa;
  font-size: 2em;
  box-shadow: 0 1px 6px #0001;
  cursor: pointer;
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(.4,2,.6,1);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-to, .fade-leave-from { opacity: 1; }
</style>
