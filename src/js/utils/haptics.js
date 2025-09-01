/**
 * v-hapticで使用
 * 関数で直接呼ぶ場合は import { haptic } from '@/utils/haptics'; haptic({ strength: 'light' })）
 * @returns {boolean}
 */
/*
 * OH3 Haptics Utility (mobile tap feedback)
 * - Android: uses Vibration API (navigator.vibrate)
 * - iOS Safari: falls back to a tiny click sound + micro bump animation
 *
 * USAGE (Vue 3 + Vuetify 3):
 *   // 1) Register as plugin (main.js)
 *   import { createApp } from 'vue'
 *   import App from './App.vue'
 *   import Haptics, { haptic } from '@/utils/haptics'
 *   const app = createApp(App)
 *   app.use(Haptics) // registers v-haptic directive
 *   app.mount('#app')
 *
 *   // 2) In components
 *   <v-btn v-haptic="'light'" @click="save">保存</v-btn>
 *   <v-btn v-haptic="'medium'">削除</v-btn>
 *   <v-btn v-haptic="'success'">OK</v-btn>
 *   // or manually in code: haptic({ strength: 'light' })
 */

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function isProbablyMobile() {
    const ua = navigator.userAgent || ''
    // UA か、タッチ対応端末（maxTouchPoints）を広めに許容
    return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 0)
}

let audioCtx = null
function ensureAudioCtx() {
    if (audioCtx) return audioCtx
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return null
        audioCtx = new Ctx()
        return audioCtx
    } catch (_) {
        return null
    }
}

function playHapticSound(strength = 'light') {
    const ctx = ensureAudioCtx()
    if (!ctx) return
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {})
    }
    // クリック風エンベロープ
    const click = (freq = 140, dur = 0.07, vol = 0.22) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'square'
        o.frequency.setValueAtTime(freq, ctx.currentTime)
        g.gain.setValueAtTime(0.001, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.006)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
        o.connect(g).connect(ctx.destination)
        o.start()
        o.stop(ctx.currentTime + dur + 0.01)
    }

    switch (strength) {
        case 'heavy':
            click(130, 0.10, 0.28)
            break
        case 'medium':
            click(135, 0.08, 0.24)
            break
        case 'success':
            // 二段クリック（後段を強く）
            click(145, 0.07, 0.22)
            setTimeout(() => click(120, 0.11, 0.30), 95)
            break
        case 'light':
        default:
            click(150, 0.06, 0.18)
    }
}

// Inject a tiny CSS for micro bump animation (scales down briefly)
(function ensureStyle() {
    const id = 'oh3-haptic-style'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
  .haptic-bump { transform: scale(0.98); transition: transform 80ms ease; }
  .haptic-bump-end { transform: none; }
  `
    document.head.appendChild(style)
})()

// ------------------------------------------------------------
// Core haptic function
// ------------------------------------------------------------
export function haptic({ strength = 'light' } = {}) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!isProbablyMobile()) return

    const patterns = {
        // より明確に：短→長、成功は強めの二段階
        light: [20],           // コツ（最短）
        medium: [35],          // コツ（中）
        heavy: [60],           // グッ（長め）
        success: [25, 40, 80]  // コツ → コッ（間を置いて強め）
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(patterns[strength] || patterns.light) } catch (_) {}
        return
    }

    // Fallback (iOS Safari など): 小さなクリック音
    try { playHapticSound(strength) } catch (_) {}
}

// ------------------------------------------------------------
// Element helpers + Vue directive
// ------------------------------------------------------------
export function attachHaptic(el, strength = 'light') {
    const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const bumpMap = {
        light:  { scale: 0.985, dur: 90,  repeats: 1, gap: 90 },
        medium: { scale: 0.975, dur: 110, repeats: 1, gap: 110 },
        heavy:  { scale: 0.965, dur: 130, repeats: 1, gap: 130 },
        success:{ scale: 0.940, dur: 150, repeats: 2, gap: 110 }, // 2段バンプ
    }
    const microBump = () => {
        if (prefersReduce) return
        const p = bumpMap[strength] || bumpMap.light
        const once = () => {
            el.style.transition = `transform ${p.dur}ms ease`
            el.style.transform = `scale(${p.scale})`
            setTimeout(() => { el.style.transform = '' }, p.dur)
        }
        once()
        for (let i = 1; i < p.repeats; i++) setTimeout(once, p.gap * i)
    }

    const handler = () => {
        haptic({ strength })
        microBump()
    }
    el.__oh3HapticHandler__ = handler
    el.addEventListener('click', handler, { passive: true })
}

export function detachHaptic(el) {
    const h = el.__oh3HapticHandler__
    if (h) el.removeEventListener('click', h)
    delete el.__oh3HapticHandler__
}

export const vHaptic = {
    mounted(el, binding) { attachHaptic(el, binding?.value || 'light') },
    updated(el, binding) {
        if (binding.oldValue !== binding.value) {
            detachHaptic(el)
            attachHaptic(el, binding?.value || 'light')
        }
    },
    unmounted(el) { detachHaptic(el) }
}

const HapticsPlugin = {
    install(app) {
        app.directive('haptic', vHaptic)
    }
}

export default HapticsPlugin


