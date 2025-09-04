/*
 * view-orientation-tracker.js
 * MapLibre: ピッチ & ベアリングの検知（最新値のみ保持）
 * JS/ESMユーティリティ（Vue 2/3 どちらでも可）
 *
 * 命名（A案）:
 *  - 関数: attachViewOrientation / attachViewOrientationPair
 *  - オプション: pitchThreshold, bearingThreshold, bearingIn360
 *
 * 仕様:
 *  - 履歴は保持せず、常に最後の値だけを Vuex に保存
 *  - しきい値でノイズを抑制（pitchThreshold / bearingThreshold）
 *  - rotate/pitch/move 中は rAF で間引き、*end で最終値を確定
 *  - ベアリングは -180..180（既定）/ 0..360 の切替可（bearingIn360）
 *
 * 使い方（最小）:
 *   import { attachViewOrientation, attachViewOrientationPair } from '@/js/utils/view-orientation-tracker'
 *
 *   // 単体（map01）
 *   const t1 = attachViewOrientation(store.state.map01, {
 *     store,
 *     pitchKey: 'map01Pitch',
 *     bearingKey: 'map01Bearing',
 *     pitchThreshold: 0.1,
 *     bearingThreshold: 0.2,
 *   })
 *
 *   // 2枚まとめて
 *   const { map01Tracker, map02Tracker } = attachViewOrientationPair({
 *     map01: store.state.map01,
 *     map02: store.state.map02,
 *     store,
 *     bearingIn360: false,
 *   })
 *
 * ▼Vuex ミューテーションで書きたい場合（例）
 *   attachViewOrientation(store.state.map01, {
 *     store,
 *     pitchKey: 'map01Pitch',
 *     bearingKey: 'map01Bearing',
 *     pitchMutationType: 'view/SET_VIEW',
 *     bearingMutationType: 'view/SET_VIEW',
 *     mutationPitchPayload:  v => ({ key: 'map01Pitch',  value: v }),
 *     mutationBearingPayload:v => ({ key: 'map01Bearing', value: v }),
 *   })
 */

export function attachViewOrientation(map, options = {}) {
    if (!map) throw new Error('attachViewOrientation: map が未定義です');

    const {
        store = null,
        pitchKey = 'mapPitch',        // store.state[pitchKey] に最後のピッチ
        bearingKey = 'mapBearing',    // store.state[bearingKey] に最後のベアリング
        pitchThreshold = 0.05,        // ピッチ変化のしきい値（度）
        bearingThreshold = 0.05,      // ベアリング変化のしきい値（度）
        bearingIn360 = false,         // true: 0..360 / false: -180..180
        onChange = null,              // (pitch, bearing, ctx)
        onPitchChange = null,         // (pitch, ctx)
        onBearingChange = null,       // (bearing, ctx)
        // ▼Vuex ミューテーション指定（任意）
        pitchMutationType = null,     // 例: 'view/SET_MAP01_PITCH' or 'view/SET_VIEW'
        bearingMutationType = null,   // 例: 'view/SET_MAP01_BEARING' or 'view/SET_VIEW'
        mutationPitchPayload = (v) => v,    // 既定は値そのまま
        mutationBearingPayload = (v) => v,  // 既定は値そのまま
    } = options;

    // 初期値
    let pitch = clampPitch(map.getPitch());
    let bearing = clampBearing(map.getBearing(), bearingIn360);

    // 初回書き込み
    writeCurrent(pitch, bearing);

    // rAF で間引き
    let rafId = null;
    let disposed = false;

    function scheduleTick() {
        if (disposed || rafId != null) return;
        rafId = requestAnimationFrame(tick);
    }

    function tick() {
        rafId = null;
        const p = clampPitch(map.getPitch());
        const b = clampBearing(map.getBearing(), bearingIn360);

        const pChanged = Math.abs(p - pitch) >= pitchThreshold;
        const bChanged = deltaBearing(b, bearing, bearingIn360) >= bearingThreshold;
        if (!pChanged && !bChanged) return;

        if (pChanged) {
            pitch = p;
            if (onPitchChange) try { onPitchChange(pitch, { map }); } catch (_) {}
        }
        if (bChanged) {
            bearing = b;
            if (onBearingChange) try { onBearingChange(bearing, { map }); } catch (_) {}
        }

        writeCurrent(pitch, bearing);
        if (onChange) try { onChange(pitch, bearing, { map }); } catch (_) {}
    }

    function finalize() {
        if (disposed) return;
        const p = clampPitch(map.getPitch());
        const b = clampBearing(map.getBearing(), bearingIn360);
        const pChanged = Math.abs(p - pitch) >= pitchThreshold;
        const bChanged = deltaBearing(b, bearing, bearingIn360) >= bearingThreshold;
        if (!pChanged && !bChanged) return;
        pitch = p; bearing = b;
        writeCurrent(pitch, bearing);
        if (pChanged && onPitchChange) try { onPitchChange(pitch, { map }); } catch (_) {}
        if (bChanged && onBearingChange) try { onBearingChange(bearing, { map }); } catch (_) {}
        if (onChange) try { onChange(pitch, bearing, { map }); } catch (_) {}
    }

    // イベント登録（move 系で十分だが、対応環境では rotate/pitch も拾う）
    map.on('move', scheduleTick);
    map.on('moveend', finalize);
    try { map.on('rotate', scheduleTick); } catch (_) {}
    try { map.on('rotateend', finalize); } catch (_) {}
    try { map.on('pitch', scheduleTick); } catch (_) {}
    try { map.on('pitchend', finalize); } catch (_) {}
    map.on('remove', dispose);

    function writeCurrent(p, b) {
        if (!store) return;
        // ピッチ
        if (pitchMutationType && store.commit) {
            try { store.commit(pitchMutationType, mutationPitchPayload(p)); } catch (_) {}
        } else if (store.state) {
            store.state[pitchKey] = p;
        }
        // ベアリング
        if (bearingMutationType && store.commit) {
            try { store.commit(bearingMutationType, mutationBearingPayload(b)); } catch (_) {}
        } else if (store.state) {
            store.state[bearingKey] = b;
        }
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        if (rafId != null) cancelAnimationFrame(rafId);
        try { map.off('move', scheduleTick); } catch (_) {}
        try { map.off('moveend', finalize); } catch (_) {}
        try { map.off('rotate', scheduleTick); } catch (_) {}
        try { map.off('rotateend', finalize); } catch (_) {}
        try { map.off('pitch', scheduleTick); } catch (_) {}
        try { map.off('pitchend', finalize); } catch (_) {}
        try { map.off('remove', dispose); } catch (_) {}
    }

    return {
        get pitch() { return pitch; },
        get bearing() { return bearing; },
        destroy: dispose,
    };
}

// map01/map02 用のまとめ登録ヘルパー
export function attachViewOrientationPair({ map01, map02, store, options01 = {}, options02 = {}, bearingIn360 = false }) {
    const map01Tracker = attachViewOrientation(map01, {
        store,
        pitchKey: 'map01Pitch',
        bearingKey: 'map01Bearing',
        bearingIn360,
        ...options01,
    });
    const map02Tracker = attachViewOrientation(map02, {
        store,
        pitchKey: 'map02Pitch',
        bearingKey: 'map02Bearing',
        bearingIn360,
        ...options02,
    });
    return { map01Tracker, map02Tracker };
}

// --- ユーティリティ ---
function clampPitch(v) {
    if (Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(85, +v));
}

function clampBearing(v, in360) {
    let x = +v;
    if (Number.isNaN(x)) x = 0;
    if (in360) {
        x = ((x % 360) + 360) % 360; // 0..360
    } else {
        x = ((x + 180) % 360 + 360) % 360 - 180; // -180..180
    }
    return x;
}

function deltaBearing(a, b, in360) {
    if (in360) {
        const diff = Math.abs(((a - b) % 360 + 360) % 360);
        return Math.min(diff, 360 - diff);
    } else {
        let diff = a - b;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return Math.abs(diff);
    }
}

/*
// --- Vue 組み込み例（疑似コード） ---
import store from '@/store'
import { attachViewOrientationPair } from '@/js/utils/view-orientation-tracker'

let map01Tracker, map02Tracker

onMounted(() => {
  const res = attachViewOrientationPair({
    map01: store.state.map01,
    map02: store.state.map02,
    store,
    bearingIn360: false,
  })
  map01Tracker = res.map01Tracker
  map02Tracker = res.map02Tracker
})

onBeforeUnmount(() => {
  map01Tracker?.destroy()
  map02Tracker?.destroy()
})
*/
