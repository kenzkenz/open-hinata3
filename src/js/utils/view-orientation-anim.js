/*
 * view-orientation-anim.js
 * MapLibre 用: ピッチ/ベアリング操作を「速く・滑らか」にするユーティリティ
 * - リセットは MapLibre の easeTo に任せて一気に 0° へ（※既定で pitch/bearing 両方=0）
 * - ボタン押しっぱなし操作は Δt（経過時間）ベースで安定した角速度
 * - rAF のハンドル（ID）で確実に停止できる stop 関数を返す
 *
 * 使い方（例）:
 *   import { resetOrientation, resetBothMapsToZero, startHoldRotate, startHoldPitch } from '@/js/utils/view-orientation-anim'
 *
 *   // 片方の地図を 0° に（もう片方も 0° 同期したいなら syncMaps に渡す）
 *   resetOrientation({
 *     targetMap: store.state.map01,
 *     syncMaps: [store.state.map02],    // 同期したい地図（任意）
 *     // syncPitch は既定で true（両方 0°）。false にすると同期側は bearing のみ 0°
 *     duration: 600,                    // ms
 *     easing: EASING.easeOutCubic,      // お好みで
 *     zeroTerrain: true,                // 完了後に setTerrain(null)
 *     afterMoveEnd: () => updatePermalink(),
 *   })
 *
 *   // 両地図まとめて 0°（簡便ヘルパ）
 *   resetBothMapsToZero(store.state.map01, store.state.map02, {
 *     duration: 600,
 *     zeroTerrain: false,
 *   })
 *
 *   // 左回転（押している間だけ）
 *   const stopSpin = startHoldRotate(store.state.map01, {
 *     speed: 150,       // deg/sec
 *     direction: +1,    // +1: 時計回り, -1: 反時計回り
 *     targets: [store.state.map01], // 複数渡せば同時に回す
 *   })
 *   // 停止: stopSpin()
 *
 *   // ピッチアップ（押している間だけ）
 *   const stopPitch = startHoldPitch(store.state.map01, {
 *     speed: 100,       // deg/sec
 *     direction: +1,    // +1: 上げる, -1: 下げる
 *     targets: [store.state.map01],
 *   })
 *   // 停止: stopPitch()
 */

export const EASING = {
    /** MapLibre の easeTo に渡せるイージング (t:0..1) */
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

/**
 * 指定地図のピッチ/ベアリングを 0 へスムーズに戻す。同期対象も一緒に処理。
 * @param {Object} opts
 * @param {import('maplibre-gl').Map} opts.targetMap - 主対象
 * @param {import('maplibre-gl').Map[]} [opts.syncMaps=[]] - 同期対象（一緒に 0 へ）
 * @param {boolean} [opts.syncPitch=true] - 同期側も pitch=0 にする（既定 true）
 * @param {number} [opts.duration=600] - ミリ秒
 * @param {(t:number)=>number} [opts.easing=EASING.easeOutCubic]
 * @param {boolean} [opts.zeroTerrain=false] - 完了後 setTerrain(null)
 * @param {()=>void} [opts.afterMoveEnd] - 完了時コールバック（1回だけ）
 */
export function resetOrientation(opts = {}) {
    const {
        targetMap,
        syncMaps = [],
        syncPitch = true,
        duration = 600,
        easing = EASING.easeOutCubic,
        zeroTerrain = false,
        afterMoveEnd,
    } = opts;

    if (!targetMap) throw new Error('resetOrientation: targetMap が未定義');

    const doRun = () => {
        // 既存アニメを停止してから始める
        safeStop(targetMap);
        for (const m of syncMaps) safeStop(m);

        // moveend は 1 回だけ
        const onEnd = () => {
            try { targetMap.off('moveend', onEnd); } catch (_) {}
            if (zeroTerrain) try { targetMap.setTerrain(null); } catch (_) {}
            if (typeof afterMoveEnd === 'function') {
                try { afterMoveEnd(); } catch (_) {}
            }
        };
        targetMap.on('moveend', onEnd);

        targetMap.easeTo({ bearing: 0, pitch: 0, duration, easing });

        for (const m of syncMaps) {
            if (!m) continue;
            const params = { bearing: 0, duration, easing };
            if (syncPitch) params.pitch = 0;
            m.easeTo(params);
        }
    };

    targetMap.loaded() ? doRun() : targetMap.once('load', doRun);
}

/** 簡便ヘルパ：両地図を 0° に */
export function resetBothMapsToZero(map01, map02, { duration = 600, easing = EASING.easeOutCubic, zeroTerrain = false, afterMoveEnd } = {}) {
    if (!map01 || !map02) throw new Error('resetBothMapsToZero: map01/map02 が未定義');
    resetOrientation({
        targetMap: map01,
        syncMaps: [map02],
        syncPitch: true,
        duration,
        easing,
        zeroTerrain,
        afterMoveEnd,
    });
}

/**
 * 押している間だけ連続回転。戻り値は停止関数。
 * @param {import('maplibre-gl').Map} map - 主対象（targets に含めなくてもOK）
 * @param {Object} [options]
 * @param {number} [options.speed=120] - deg/sec
 * @param {1|-1} [options.direction=1]
 * @param {import('maplibre-gl').Map[]} [options.targets=[map]] - 同時に回す対象
 * @returns {() => void} stop - 停止関数
 */
export function startHoldRotate(map, options = {}) {
    const {
        speed = 120,
        direction = 1,
        targets = [map],
    } = options;

    if (!map) return () => {};

    let rafId = null;
    let last = 0;
    const runTargets = targets.filter(Boolean);

    const step = (now) => {
        if (!last) last = now;
        const dt = (now - last) / 1000; // sec
        last = now;

        const delta = direction * speed * dt; // deg
        for (const m of runTargets) {
            try { m.setBearing(m.getBearing() + delta); } catch (_) {}
        }
        rafId = requestAnimationFrame(step);
    };

    // 既存アニメは止める
    for (const m of runTargets) safeStop(m);
    rafId = requestAnimationFrame(step);

    return () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; };
}

/**
 * 押している間だけ連続ピッチ。戻り値は停止関数。
 * @param {import('maplibre-gl').Map} map - 主対象（targets に含めなくてもOK）
 * @param {Object} [options]
 * @param {number} [options.speed=90] - deg/sec
 * @param {1|-1} [options.direction=1]
 * @param {number} [options.minPitch=0]
 * @param {number} [options.maxPitch=85]
 * @param {import('maplibre-gl').Map[]} [options.targets=[map]] - 同時に変化させる対象
 * @returns {() => void} stop - 停止関数
 */
export function startHoldPitch(map, options = {}) {
    const {
        speed = 90,
        direction = 1,
        minPitch = 0,
        maxPitch = 85,
        targets = [map],
    } = options;

    if (!map) return () => {};

    let rafId = null;
    let last = 0;
    const runTargets = targets.filter(Boolean);

    const step = (now) => {
        if (!last) last = now;
        const dt = (now - last) / 1000; // sec
        last = now;

        for (const m of runTargets) {
            try {
                const cur = clampPitch(m.getPitch());
                const next = clampPitch(cur + direction * speed * dt, minPitch, maxPitch);
                if (next !== cur) m.setPitch(next);
            } catch (_) {}
        }
        rafId = requestAnimationFrame(step);
    };

    for (const m of runTargets) safeStop(m);
    rafId = requestAnimationFrame(step);

    return () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; };
}

// --- helpers ---
function safeStop(map) { try { map.stop(); } catch (_) {} }
function clampPitch(v, min = 0, max = 85) {
    let x = +v; if (Number.isNaN(x)) x = 0;
    return Math.max(min, Math.min(max, x));
}
