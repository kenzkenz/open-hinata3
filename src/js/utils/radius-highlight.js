/*
 * /src/js/utils/radius-highlight.js
 * 半径円で内部地物をハイライトするユーティリティ（MapLibre GL JS）
 * （既定は 200m。任意半径に対応）
 * - 実行のたびに円レイヤーを remove → add で再作成（中心点も）
 * - 円の内部と判定された地物の ID 属性（任意キー）を配列に収集（毎回リフレッシュ）
 * - 収集した配列を使って指定レイヤーの色を条件付きで変更
 * - 問い合わせ対象レイヤーも、色変更の対象レイヤーも引数で可変に指定可能
 * - デフォルト対象：
 *    - ソースID:   'homusyo-2025-kijyunten-source'
 *    - レイヤーID: 'oh-homusyo-2025-kijyunten'
 * - ID属性の既定: '名称'
 * - Turf.js 前提（window.turf に存在）
 *
 * 使い方例：
 *   import { refreshRadiusHighlight } from '/src/js/utils/radius-highlight.js'
 *
 *   // クリック位置に円 → 内部にある layerA, layerB の地物を拾い、idProperty でハイライト
 *   map.on('click', (e) => {
 *     refreshRadiusHighlight(map, e.lngLat, {
 *       queryLayers: ['oh-bus-lines', 'oh-homusyo-2025-polygon-dissolved-all'],
 *       highlightLayers: ['oh-bus-lines', 'oh-homusyo-2025-polygon-dissolved-all'],
 *       idProperty: 'id',
 *       addAboveLayerId: 'oh-bus-lines',    // 円や中心点の追加位置
 *       radiusMeters: 200,                  // 任意半径
 *       highlight: {
 *         fillColor: 'rgba(255,160,0,0.35)',
 *         lineColor: 'rgba(255,120,0,1.0)',
 *         lineWidth: 3,
 *         circleColor: 'rgba(255,120,0,1.0)',
 *         circleRadius: 6
 *       }
 *     })
 *   })
 *
 *   // ID 配列だけ欲しい場合：
 *   const { ids } = await refreshRadiusHighlight(map, [139.76,35.68], {
 *     queryLayers:['oh-homusyo-2025-kijyunten'],
 *     highlightLayers:['oh-homusyo-2025-kijyunten'],
 *     idProperty:'名称'
 *   })
 */

// Vuex store 参照（import・手渡し・window の順で解決）
// 環境により '@/store' の解決が不要/不可な場合は opts.store または window.store を利用します。
/* eslint-disable import/no-unresolved */
// @ts-ignore
import store from '@/store'
/* eslint-enable import/no-unresolved */

function resolveStore(opts) {
    if (opts && opts.store && opts.store.state) return opts.store;
    try { if (store && store.state) return store; } catch (e) {}
    if (typeof window !== 'undefined' && window.store && window.store.state) return window.store;
    return null;
}

// 内部状態を map にぶら下げて管理（毎回リフレッシュに使う）
const STATE_KEY = '__oh_radius_state';

/**
 * メイン：円（既定200m）の再作成 → 内部地物抽出 → ハイライト色の適用（中心点も描画）
 * @param {import('maplibre-gl').Map} map
 * @param {[number, number] | {lng:number,lat:number}} centerLngLat
 * @param {Object} opts
 * @param {string[]} [opts.queryLayers]       - 内部判定の対象レイヤーID配列（省略時 ['oh-homusyo-2025-kijyunten']）
 * @param {string[]} [opts.highlightLayers]   - 色変更の対象レイヤーID配列（省略時は queryLayers と同一）
 * @param {string}  [opts.idProperty]         - 内部地物のIDにあたるプロパティ名（省略時 '名称'。例: 'TXTCD' など）
 * @param {string}  [opts.circleSourceId]     - 円ソースID（毎回再作成）。既定: 'oh-radius-circle-source'
 * @param {string}  [opts.circleLayerId]      - 円レイヤーID（毎回再作成）。既定: 'oh-radius-circle-layer'
 * @param {number}  [opts.radiusMeters]       - 半径（m）。既定 200
 * @param {string}  [opts.addAboveLayerId]    - 円レイヤーやハイライトを挿入する基準レイヤー（その直上に追加。省略時 'oh-homusyo-2025-kijyunten'）
 * @param {Object}  [opts.highlight]          - ハイライト見た目設定
 * @param {string}  [opts.idsStoreKey]        - 収集ID配列を書き出す store.state のキー名（既定 'oh200mIds'）
 * @param {Object}  [opts.store]              - Vuex ストア（省略時は import '@/store' または window.store を試行）
 * @param {string}  [opts.targetSourceId]     - 対象データのソースID（省略時 'homusyo-2025-kijyunten-source'）
 * @param {boolean} [opts.showCenter]         - 中心点を描画するか（既定 true）
 * @param {string}  [opts.centerSourceId]     - 中心点のソースID（既定 'oh-radius-center-source'）
 * @param {string}  [opts.centerLayerId]      - 中心点のレイヤーID（既定 'oh-radius-center-layer'）
 * @param {Object}  [opts.centerStyle]        - 中心点の見た目 { color, radius, strokeColor, strokeWidth }
 * @returns {Promise<{ids:string[], features:GeoJSON.Feature[]}>}
 */
export async function refreshRadiusHighlight(map, centerLngLat, opts) {
    ensureTurf();

    const {
        queryLayers = ['oh-homusyo-2025-kijyunten'],
        highlightLayers = queryLayers,
        idProperty = '名称',
        circleSourceId = 'oh-radius-circle-source',
        circleLayerId  = 'oh-radius-circle-layer',
        radiusMeters   = 200,
        addAboveLayerId = 'oh-homusyo-2025-kijyunten',
        targetSourceId = 'homusyo-2025-kijyunten-source',
        highlight = {},
        showCenter = true,
        centerSourceId = 'oh-radius-center-source',
        centerLayerId  = 'oh-radius-center-layer',
        centerStyle = {}
    } = opts || {};

    if (!idProperty || typeof idProperty !== 'string') {
        throw new Error('idProperty を文字列で指定してください');
    }

    // --- store.state.isRadius200 === false なら早期リターン ---
    try {
        const vuexFlag = resolveStore(opts);
        if (vuexFlag && vuexFlag.state && vuexFlag.state.isRadius200 === false) {
            // 過去の円や中心点は消して、ID配列は空でリフレッシュ
            clearLegacyNames(map);
            clearPreviousMarks(map, circleLayerId, circleSourceId, centerLayerId, centerSourceId);
            try {
                const key = (opts && opts.idsStoreKey) ? opts.idsStoreKey : 'oh200mIds';
                vuexFlag.state[key] = [];
            } catch (e) { /* noop */ }
            return { ids: [], features: [] };
        }
    } catch (e) { /* noop */ }

    // --- 指定（または既定）のレイヤー存在チェック → 早期リターン ---
    const qLayers = (queryLayers || []).filter(id => map.getLayer(id));
    const hLayers = (highlightLayers || []).filter(id => map.getLayer(id));
    if (qLayers.length === 0 && hLayers.length === 0) {
        // 過去の円や中心点は消して、ID配列は空でリフレッシュ
        clearLegacyNames(map);
        clearPreviousMarks(map, circleLayerId, circleSourceId, centerLayerId, centerSourceId);
        try {
            const vuex = resolveStore(opts);
            if (vuex && vuex.state) {
                const key = (opts && opts.idsStoreKey) ? opts.idsStoreKey : 'oh200mIds';
                vuex.state[key] = [];
            }
        } catch (e) { /* noop */ }
        return { ids: [], features: [] };
    }

    // center の正規化
    const center = Array.isArray(centerLngLat)
        ? { lng: centerLngLat[0], lat: centerLngLat[1] }
        : centerLngLat;

    // 1) 既存の円＆ハイライトをクリア
    clearLegacyNames(map);
    clearPreviousMarks(map, circleLayerId, circleSourceId, centerLayerId, centerSourceId);
    restoreBasePaintsIfAny(map); // 各ターゲットレイヤーを元の色式に戻してから次を適用

    // 2) 円を生成して追加（中心点も）
    const circleFeature = makeCircleFeature(center, radiusMeters);
    addCircle(map, circleFeature, { circleSourceId, circleLayerId, addAboveLayerId });
    if (showCenter) addCenterPoint(map, center, { centerSourceId, centerLayerId, addAboveLayerId, centerStyle });

    // 3) 円の内外判定 → ID 配列を作成
    const { ids, features } = pickInsideFeatures(map, circleFeature, qLayers, idProperty);

    // 4) ハイライト色を適用（指定レイヤーたちに動的式をセット）
    applyConditionalColor(map, hLayers, idProperty, ids, highlight);

    // 4.5) Vuex store.state に ID 配列を書き出し（外部利用向け）
    try {
        const vuex = resolveStore(opts);
        if (vuex && vuex.state) {
            const key = (opts && opts.idsStoreKey) ? opts.idsStoreKey : 'oh200mIds';
            vuex.state[key] = ids;
        }
    } catch (e) { /* noop */ }

    // 内部状態に保存（次回実行時の復元/解除に使う）
    map[STATE_KEY] = map[STATE_KEY] || { basePaints: {}, last: {} };
    map[STATE_KEY].last = {
        ids,
        circleSourceId,
        circleLayerId,
        queryLayers: [...qLayers],
        highlightLayers: [...hLayers],
        idProperty,
        targetSourceId
    };

    return { ids, features };
}

// ========================= 内部関数群 =========================

function ensureTurf() {
    if (!(window && window.turf)) {
        throw new Error('Turf.js が見つかりません。window.turf を用意してください');
    }
}

/** 円GeoJSONを生成 */
function makeCircleFeature(center, radiusMeters) {
    const radiusKm = Math.max(0, Number(radiusMeters)) / 1000;
    const circle = turf.circle([center.lng, center.lat], radiusKm, { steps: 64, units: 'kilometers' });
    circle.properties = { radius_m: radiusMeters };
    return circle; // Polygon Feature
}

/** 既存の円レイヤー/ソースを除去 */
function clearPreviousCircle(map, circleLayerId, circleSourceId) {
    if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId);
    if (map.getSource(circleSourceId)) map.removeSource(circleSourceId);
}

function clearPreviousMarks(map, circleLayerId, circleSourceId, centerLayerId, centerSourceId) {
    clearPreviousCircle(map, circleLayerId, circleSourceId);
    if (map.getLayer(centerLayerId)) map.removeLayer(centerLayerId);
    if (map.getSource(centerSourceId)) map.removeSource(centerSourceId);
}

// 旧 200m 名称のクリーンアップ（後方互換）
function clearLegacyNames(map) {
    const oldLayer = 'oh-200m-circle-layer';
    const oldSource = 'oh-200m-circle-source';
    const oldCenterLayer = 'oh-200m-center-layer';
    const oldCenterSource = 'oh-200m-center-source';
    if (map.getLayer(oldLayer)) map.removeLayer(oldLayer);
    if (map.getSource(oldSource)) map.removeSource(oldSource);
    if (map.getLayer(oldCenterLayer)) map.removeLayer(oldCenterLayer);
    if (map.getSource(oldCenterSource)) map.removeSource(oldCenterSource);
}

/** 円の描画を追加 */
function addCircle(map, circleFeature, { circleSourceId, circleLayerId, addAboveLayerId }) {
    map.addSource(circleSourceId, {
        type: 'geojson',
        data: circleFeature
    });

    const layerDef = {
        id: circleLayerId,
        type: 'fill',
        source: circleSourceId,
        paint: {
            'fill-color': 'rgba(0, 120, 255, 0.12)',
            'fill-outline-color': 'rgba(0, 120, 255, 0.9)'
        }
    };

    if (addAboveLayerId && map.getLayer(addAboveLayerId)) {
        map.addLayer(layerDef, addAboveLayerId);
    } else {
        map.addLayer(layerDef);
    }
}

/** 中心点の描画を追加 */
function addCenterPoint(map, center, { centerSourceId, centerLayerId, addAboveLayerId, centerStyle = {} }) {
    const srcData = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [center.lng, center.lat] },
        properties: {}
    };
    map.addSource(centerSourceId, { type: 'geojson', data: srcData });

    const style = {
        color: 'rgba(0, 120, 255, 1)',
        radius: 5,
        strokeColor: 'rgba(255,255,255,1)',
        strokeWidth: 2,
        ...centerStyle
    };

    const layerDef = {
        id: centerLayerId,
        type: 'circle',
        source: centerSourceId,
        paint: {
            'circle-color': style.color,
            'circle-radius': style.radius,
            'circle-stroke-color': style.strokeColor,
            'circle-stroke-width': style.strokeWidth
        }
    };

    if (addAboveLayerId && map.getLayer(addAboveLayerId)) {
        map.addLayer(layerDef, addAboveLayerId);
    } else {
        map.addLayer(layerDef);
    }
}

/**
 * 円の bbox で queryRenderedFeatures → Turf で厳密内外判定
 * 対象レイヤーごとに走査し、idProperty を配列化
 */
function pickInsideFeatures(map, circlePolygon, queryLayers, idProperty) {
    const [minX, minY, maxX, maxY] = turf.bbox(circlePolygon);
    const p1 = map.project({ lng: minX, lat: minY });
    const p2 = map.project({ lng: maxX, lat: maxY });
    const box = [p1, p2];

    const idsSet = new Set();
    const picked = [];

    for (const lid of queryLayers) {
        if (!map.getLayer(lid)) continue;
        const feats = map.queryRenderedFeatures(box, { layers: [lid] }) || [];
        for (const f of feats) {
            const inside = featureIntersectsCircle(f, circlePolygon);
            if (!inside) continue;
            const val = safeGetIdValue(f, idProperty);
            if (val == null) continue;
            const key = String(val);
            if (!idsSet.has(key)) idsSet.add(key);
            picked.push(f);
        }
    }

    return { ids: Array.from(idsSet), features: picked };
}

/**
 * ジオメトリタイプに応じて円Polygonとの交差/包含を判定
 */
function featureIntersectsCircle(feature, circlePolygon) {
    const g = feature && feature.geometry;
    if (!g) return false;

    try {
        switch (g.type) {
            case 'Point':
                return turf.booleanPointInPolygon(g, circlePolygon);
            case 'MultiPoint':
                return g.coordinates.some(pt => turf.booleanPointInPolygon({ type: 'Point', coordinates: pt }, circlePolygon));
            case 'LineString':
            case 'MultiLineString':
            case 'Polygon':
            case 'MultiPolygon':
                return turf.booleanIntersects(g, circlePolygon);
            default:
                // 未対応タイプは bbox 判定だけにフォールバック（ゆるい）
                const b1 = turf.bbox(turf.feature(g));
                const b2 = turf.bbox(circlePolygon);
                return bboxOverlaps(b1, b2);
        }
    } catch (e) {
        // ジオメトリ欠損などは安全側に false
        return false;
    }
}

function bboxOverlaps(b1, b2) {
    const [aMinX, aMinY, aMaxX, aMaxY] = b1; const [bMinX, bMinY, bMaxX, bMaxY] = b2;
    return aMinX <= bMaxX && aMaxX >= bMinX && aMinY <= bMaxY && aMaxY >= bMinY;
}

/** 指定プロパティから ID を安全に取得 */
function safeGetIdValue(feature, idProperty) {
    if (!feature || !feature.properties) return null;
    const v = feature.properties[idProperty];
    if (v === undefined || v === null || v === '') return null;
    return v;
}

/**
 * 各レイヤーの色プロパティに条件式を適用
 * - 既存の色設定（式/リテラル）は map[STATE_KEY].basePaints に保存
 * - 実行のたびに basePaint を土台に上書き（多重ネストしない）
 */
function applyConditionalColor(map, layerIds, idProperty, idArray, highlight) {
    map[STATE_KEY] = map[STATE_KEY] || { basePaints: {}, last: {} };
    const basePaints = map[STATE_KEY].basePaints;

    const hi = {
        fillColor: 'rgba(255,136,0,0.35)',
        lineColor: 'rgba(255,136,0,1.0)',
        lineWidth: 2,
        circleColor: 'rgba(255,136,0,1.0)',
        circleRadius: 5,
        ...highlight
    };

    for (const lid of layerIds) {
        const layer = getLayer(map, lid);
        if (!layer) continue;

        // 初回のみ元の色設定を保存
        if (!basePaints[lid]) {
            basePaints[lid] = snapshotBasePaint(map, layer);
        }

        const base = basePaints[lid];
        const idIn = ['in', ['get', idProperty], ['literal', idArray]];

        switch (layer.type) {
            case 'fill': {
                const targetProp = 'fill-color';
                const baseVal = base[targetProp] ?? 'rgba(0,0,0,0)';
                const expr = ['case', idIn, hi.fillColor, baseVal];
                map.setPaintProperty(lid, targetProp, expr);
                // アウトラインもあれば強調（任意）
                if (hasPaint(map, lid, 'fill-outline-color')) {
                    const baseOutline = base['fill-outline-color'] ?? 'rgba(0,0,0,0)';
                    const exprOutline = ['case', idIn, hi.lineColor, baseOutline];
                    map.setPaintProperty(lid, 'fill-outline-color', exprOutline);
                }
                break;
            }
            case 'line': {
                const colorProp = 'line-color';
                const widthProp = 'line-width';
                const baseColor = base[colorProp] ?? 'rgba(0,0,0,0)';
                const baseWidth = base[widthProp] ?? 1;
                map.setPaintProperty(lid, colorProp, ['case', idIn, hi.lineColor, baseColor]);
                map.setPaintProperty(lid, widthProp, ['case', idIn, hi.lineWidth, baseWidth]);
                break;
            }
            case 'circle': {
                const colorProp = 'circle-color';
                const radiusProp = 'circle-radius';
                const baseColor = base[colorProp] ?? 'rgba(0,0,0,0.6)';
                const baseRadius = base[radiusProp] ?? 4;
                map.setPaintProperty(lid, colorProp, ['case', idIn, hi.circleColor, baseColor]);
                map.setPaintProperty(lid, radiusProp, ['case', idIn, hi.circleRadius, baseRadius]);
                break;
            }
            default:
                // symbol 等はここではスキップ（必要なら分岐を追加）
                break;
        }
    }
}

/** 指定レイヤーの paint（基底）を保存 */
function snapshotBasePaint(map, layer) {
    const p = {};
    if (layer.type === 'fill') {
        p['fill-color'] = map.getPaintProperty(layer.id, 'fill-color');
        p['fill-outline-color'] = hasPaint(map, layer.id, 'fill-outline-color') ? map.getPaintProperty(layer.id, 'fill-outline-color') : undefined;
    } else if (layer.type === 'line') {
        p['line-color'] = map.getPaintProperty(layer.id, 'line-color');
        p['line-width'] = map.getPaintProperty(layer.id, 'line-width');
    } else if (layer.type === 'circle') {
        p['circle-color'] = map.getPaintProperty(layer.id, 'circle-color');
        p['circle-radius'] = map.getPaintProperty(layer.id, 'circle-radius');
    }
    return p;
}

function restoreBasePaintsIfAny(map) {
    const st = map[STATE_KEY];
    if (!st || !st.basePaints) return;
    for (const [lid, base] of Object.entries(st.basePaints)) {
        if (!map.getLayer(lid)) continue;
        for (const [k, v] of Object.entries(base)) {
            if (v !== undefined) {
                map.setPaintProperty(lid, k, v);
            }
        }
    }
}

function getLayer(map, layerId) {
    try {
        return map.getStyle().layers.find(l => l.id === layerId);
    } catch {
        return null;
    }
}

function hasPaint(map, layerId, paintProp) {
    try {
        const v = map.getPaintProperty(layerId, paintProp);
        return v !== undefined;
    } catch {
        return false;
    }
}

// ========================= 補助：明示解除（任意） =========================

/**
 * ハイライトを完全解除して元に戻す（円も中心点も削除）
 */
export function clearRadiusHighlight(map, opts = {}) {
    const {
        circleSourceId = 'oh-radius-circle-source',
        circleLayerId  = 'oh-radius-circle-layer',
        centerSourceId = 'oh-radius-center-source',
        centerLayerId  = 'oh-radius-center-layer',
        idsStoreKey    = 'oh200mIds',
        store: storeArg
    } = opts;
    clearPreviousMarks(map, circleLayerId, circleSourceId, centerLayerId, centerSourceId);
    restoreBasePaintsIfAny(map);
    try {
        const vuex = resolveStore({ store: storeArg });
        if (vuex && vuex.state && idsStoreKey) vuex.state[idsStoreKey] = [];
    } catch (e) { /* noop */ }
    if (map[STATE_KEY]) map[STATE_KEY].last = {};
}

// 後方互換エイリアス（既存呼び出しの破壊を避ける）
export const refresh200mCircleAndHighlight = refreshRadiusHighlight;
export const clear200mHighlight = clearRadiusHighlight;
