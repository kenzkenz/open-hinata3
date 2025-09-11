/*
 * /src/js/utils/radius-highlight.js (PMTiles z16 lock, v3)
 * 半径円で内部地物をハイライト & oh200mIds を正しく生成（画面外も含む / 固定ズーム16のPMTilesを直接読む）
 * - 目的：エクスポート用に「円内部の全地物ID(oh200mIds)」を確実に取得
 * - 仕様：queryRenderedFeatures は使わず、PMTiles の z=16 タイルを直接走査して内外判定
 * - データが GeoJSON ソースの場合はメモリ走査（Turf）
 * - 表示上のハイライトはおまけ（oh200mIds と画面の一致は不要、という要件）
 *
 * 依存：
 *   npm i pmtiles @mapbox/vector-tile pbf
 *   import * as turf from '@turf/turf'
 *
 * 使い方（同じ）：
 *   import { refreshRadiusHighlight } from '/src/js/utils/radius-highlight.js'
 *   map.on('click', (e) => {
 *     refreshRadiusHighlight(map, e.lngLat, {
 *       queryLayers: ['oh-homusyo-2025-kijyunten'],
 *       highlightLayers: ['oh-homusyo-2025-kijyunten'],
 *       idProperty: '名称',
 *       radiusMeters: 200
 *     })
 *   })
 */

import store from '@/store'
import * as turf from '@turf/turf'
import { PMTiles } from 'pmtiles'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'

function resolveStore(opts) {
    if (opts && opts.store && opts.store.state) return opts.store;
    try { if (store && store.state) return store; } catch (e) {}
    if (typeof window !== 'undefined' && window.store && window.store.state) return window.store;
    return null;
}

// 内部状態を map にぶら下げて管理（毎回リフレッシュに使う）
const STATE_KEY = '__oh_radius_state';

/**
 * メイン：円（既定200m）の再作成 → PMTiles/GeoJSON から内外抽出（z=16固定）→ ハイライト（任意）
 * @param {import('maplibre-gl').Map} map
 * @param {[number, number] | {lng:number,lat:number}} centerLngLat
 * @param {Object} opts
 * @param {string[]} [opts.queryLayers]       - 内部判定の対象レイヤーID配列（省略時 ['oh-homusyo-2025-kijyunten']）
 * @param {string[]} [opts.highlightLayers]   - 色変更の対象レイヤーID配列（省略時は queryLayers と同一）
 * @param {string}  [opts.idProperty]         - 内部地物のIDにあたるプロパティ名（省略時 '名称'）
 * @param {string}  [opts.circleSourceId]     - 円ソースID（既定: 'oh-radius-circle-source'）
 * @param {string}  [opts.circleLayerId]      - 円レイヤーID（既定: 'oh-radius-circle-layer'）
 * @param {number}  [opts.radiusMeters]       - 半径（m）。既定 200
 * @param {string}  [opts.addAboveLayerId]    - 円/中心点の追加位置（既定 'oh-homusyo-2025-kijyunten' の直上）
 * @param {Object}  [opts.highlight]          - ハイライト見た目設定
 * @param {string}  [opts.idsStoreKey]        - 収集ID配列を書き出す store.state のキー名（既定 'oh200mIds'）
 * @param {string}  [opts.geojsonStoreKey]    - 円内FeatureCollectionを書き出す store.state のキー名（既定 'oh200mGeoJSON'）
 * @param {Object}  [opts.store]              - Vuex ストア（省略時は import '@/store' または window.store を試行）
 * @returns {Promise<{ids:string[], features:GeoJSON.Feature[]}>}
 */
export async function refreshRadiusHighlight(map, centerLngLat, opts) {
    // const exists = !!(map && map.getLayer('oh-homusyo-2025-kijyunten'));
    // if (!exists) return
    // if (!store.state.isRadius200) return

    ensureTurf();

    const {
        queryLayers = ['oh-homusyo-2025-kijyunten'],
        highlightLayers = queryLayers,
        idProperty = '名称',
        circleSourceId = 'oh-radius-circle-source',
        circleLayerId  = 'oh-radius-circle-layer',
        radiusMeters   = 200,
        addAboveLayerId = 'oh-homusyo-2025-kijyunten',
        highlight = {},
        idsStoreKey = 'oh200mIds',
        geojsonStoreKey = 'oh200mGeoJSON',
        zoom = 16
    } = opts || {};

    if (!idProperty || typeof idProperty !== 'string') {
        throw new Error('idProperty を文字列で指定してください');
    }

    // center の正規化
    const center = Array.isArray(centerLngLat)
        ? { lng: centerLngLat[0], lat: centerLngLat[1] }
        : centerLngLat;

    // 1) 既存の円＆ハイライトをクリア
    clearLegacyNames(map);
    clearPreviousMarks(map, circleLayerId, circleSourceId, 'oh-radius-center-layer', 'oh-radius-center-source');
    restoreBasePaintsIfAny(map);

    // 2) 円を生成して追加（中心点も）
    const circleFeature = makeCircleFeature(center, radiusMeters);
    addCircle(map, circleFeature, { circleSourceId, circleLayerId, addAboveLayerId });
    addCenterPoint(map, center, { centerSourceId: 'oh-radius-center-source', centerLayerId: 'oh-radius-center-layer', addAboveLayerId });

    // 3) 円の内外判定 → **PMTiles z=16** / GeoJSON で ID 配列を作成
    const { ids, features } = await collectIdsAtZ16(map, circleFeature, queryLayers, idProperty, zoom);

    // 4) ハイライト色を適用（指定レイヤーたちに動的式をセット）
    applyConditionalColor(map, highlightLayers, idProperty, ids, highlight);

    // 5) Vuex store.state に ID 配列と円内GeoJSONを書き出し
    try {
        const vuex = resolveStore(opts);
        if (vuex && vuex.state) {
            // oh200mIds
            vuex.state[idsStoreKey] = ids;
            // oh200mGeoJSON（FeatureCollection 全量）
            vuex.state[geojsonStoreKey] = { type: 'FeatureCollection', features };
        }
    } catch (e) { /* noop */ }

    // 内部状態に保存
    map[STATE_KEY] = map[STATE_KEY] || { basePaints: {}, last: {} };
    map[STATE_KEY].last = { ids, circleSourceId, circleLayerId, queryLayers: [...queryLayers], highlightLayers: [...highlightLayers], idProperty };

    return { ids, features };
}

// ========================= 内部関数群 =========================

function ensureTurf() {
    if (!turf || typeof turf.circle !== 'function') {
        throw new Error("Turf.js の import が見つかりません。`import * as turf from '@turf/turf'` を確認してください");
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
    map.addSource(circleSourceId, { type: 'geojson', data: circleFeature });
    const layerDef = {
        id: circleLayerId,
        type: 'fill',
        source: circleSourceId,
        paint: {
            'fill-color': 'rgba(0, 120, 255, 0.12)',
            'fill-outline-color': 'rgba(0, 120, 255, 0.9)'
        }
    };
    if (addAboveLayerId && map.getLayer(addAboveLayerId)) map.addLayer(layerDef, addAboveLayerId);
    else map.addLayer(layerDef);
}

/** 中心点の描画を追加 */
function addCenterPoint(map, center, { centerSourceId, centerLayerId, addAboveLayerId, centerStyle = {} }) {
    const srcData = { type: 'Feature', geometry: { type: 'Point', coordinates: [center.lng, center.lat] }, properties: {} };
    map.addSource(centerSourceId, { type: 'geojson', data: srcData });
    const style = { color: 'rgba(0,120,255,1)', radius: 5, strokeColor: 'rgba(255,255,255,1)', strokeWidth: 2, ...centerStyle };
    const layerDef = { id: centerLayerId, type: 'circle', source: centerSourceId, paint: { 'circle-color': style.color, 'circle-radius': style.radius, 'circle-stroke-color': style.strokeColor, 'circle-stroke-width': style.strokeWidth } };
    if (addAboveLayerId && map.getLayer(addAboveLayerId)) map.addLayer(layerDef, addAboveLayerId); else map.addLayer(layerDef);
}

/**
 * PMTiles z=16 で円内部のIDを収集
 * - queryLayers で与えられた各レイヤーの source / source-layer を参照
 * - スタイルの source.url が pmtiles:// であることが前提
 */
async function collectIdsAtZ16(map, circlePolygon, queryLayers, idProperty, zoom) {
    const z = zoom;
    const bbox = turf.bbox(circlePolygon); // [minLng,minLat,maxLng,maxLat]
    const [minX, minY] = lngLatToTile(bbox[0], bbox[3], z);
    const [maxX, maxY] = lngLatToTile(bbox[2], bbox[1], z);

    const idsSet = new Set();
    const picked = [];

    for (const lid of (queryLayers || [])) {
        const layer = getLayer(map, lid);
        if (!layer) continue;
        const sourceId = layer.source;
        const sourceLayer = layer['source-layer'];
        if (!sourceId || !sourceLayer) continue;

        const styleSrc = map.getStyle()?.sources?.[sourceId];
        if (!styleSrc || typeof styleSrc.url !== 'string' || !styleSrc.url.startsWith('pmtiles://')) {
            // GeoJSON ソースならメモリ走査
            const src = map.getSource(sourceId);
            if (src && src.type === 'geojson' && src._data) {
                const fc = toFeatureArray(src._data);
                for (const f of fc) pushIfInside(f);
            }
            continue;
        }

        const pm = new PMTiles(styleSrc.url.replace('pmtiles://', ''));

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                try {
                    const tile = await pm.getZxy(z, x, y);
                    if (!tile?.data) continue;
                    const vt = new VectorTile(new Pbf(new Uint8Array(tile.data)));
                    const vtl = vt.layers?.[sourceLayer];
                    if (!vtl) continue;
                    for (let i = 0; i < vtl.length; i++) {
                        const gj = vtl.feature(i).toGeoJSON(x, y, z);
                        pushIfInside(gj);
                    }
                } catch (_) { /* ignore */ }
            }
        }
    }

    function pushIfInside(f) {
        if (!f || !f.geometry) return;
        if (!featureIntersectsCircle(f, circlePolygon)) return;
        const val = safeGetIdValue(f, idProperty);
        if (val == null) return;
        const key = String(val);
        if (!idsSet.has(key)) {
            idsSet.add(key);
            picked.push(f);
        }
    }

    return { ids: Array.from(idsSet), features: picked };
}

/** WebMercator ヘルパ（XYZ） */
function lngLatToTile(lon, lat, z) {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, z);
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    // clamp（安全側）
    return [Math.max(0, Math.min(n - 1, x)), Math.max(0, Math.min(n - 1, y))];
}

/** ジオメトリタイプに応じて円Polygonとの交差/包含を判定 */
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
            default: {
                const b1 = turf.bbox(turf.feature(g));
                const b2 = turf.bbox(circlePolygon);
                return bboxOverlaps(b1, b2);
            }
        }
    } catch (e) { return false; }
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
 * 各レイヤーの色プロパティに条件式を適用（任意）
 */
function applyConditionalColor(map, layerIds, idProperty, idArray, highlight) {
    map[STATE_KEY] = map[STATE_KEY] || { basePaints: {}, last: {} };
    const basePaints = map[STATE_KEY].basePaints;
    const hi = { fillColor: 'rgba(255,136,0,0.35)', lineColor: 'rgba(255,136,0,1.0)', lineWidth: 2, circleColor: 'rgba(255,136,0,1.0)', circleRadius: 5, ...highlight };

    for (const lid of (layerIds || [])) {
        const layer = getLayer(map, lid);
        if (!layer) continue;
        if (!basePaints[lid]) basePaints[lid] = snapshotBasePaint(map, layer);
        const base = basePaints[lid];
        const idIn = ['in', ['get', idProperty], ['literal', idArray]];

        switch (layer.type) {
            case 'fill': {
                const baseVal = base['fill-color'] ?? 'rgba(0,0,0,0)';
                map.setPaintProperty(lid, 'fill-color', ['case', idIn, hi.fillColor, baseVal]);
                if (hasPaint(map, lid, 'fill-outline-color')) {
                    const baseOutline = base['fill-outline-color'] ?? 'rgba(0,0,0,0)';
                    map.setPaintProperty(lid, 'fill-outline-color', ['case', idIn, hi.lineColor, baseOutline]);
                }
                break;
            }
            case 'line': {
                const baseColor = base['line-color'] ?? 'rgba(0,0,0,0)';
                const baseWidth = base['line-width'] ?? 1;
                map.setPaintProperty(lid, 'line-color', ['case', idIn, hi.lineColor, baseColor]);
                map.setPaintProperty(lid, 'line-width', ['case', idIn, hi.lineWidth, baseWidth]);
                break;
            }
            case 'circle': {
                const baseColor = base['circle-color'] ?? 'rgba(0,0,0,0.6)';
                const baseRadius = base['circle-radius'] ?? 4;
                map.setPaintProperty(lid, 'circle-color', ['case', idIn, hi.circleColor, baseColor]);
                map.setPaintProperty(lid, 'circle-radius', ['case', idIn, hi.circleRadius, baseRadius]);
                break;
            }
            default: break;
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
        for (const [k, v] of Object.entries(base)) if (v !== undefined) map.setPaintProperty(lid, k, v);
    }
}

function getLayer(map, layerId) {
    try { return map.getStyle().layers.find(l => l.id === layerId); } catch { return null; }
}

function hasPaint(map, layerId, paintProp) {
    try { return map.getPaintProperty(layerId, paintProp) !== undefined; } catch { return false; }
}

function toFeatureArray(data) {
    if (!data) return [];
    if (data.type === 'FeatureCollection') return Array.isArray(data.features) ? data.features : [];
    if (data.type === 'Feature') return [data];
    return [];
}

// ========================= 補助：明示解除（任意） =========================

/** ハイライトを完全解除して元に戻す（円も中心点も削除） */
export function clearRadiusHighlight(map, opts = {}) {
    const {
        circleSourceId = 'oh-radius-circle-source',
        circleLayerId  = 'oh-radius-circle-layer',
        centerSourceId = 'oh-radius-center-source',
        centerLayerId  = 'oh-radius-center-layer',
        idsStoreKey    = 'oh200mIds',
        geojsonStoreKey= 'oh200mGeoJSON',
        store: storeArg
    } = opts;

    // レイヤ/ソースを撤去
    clearPreviousMarks(map, circleLayerId, circleSourceId, centerLayerId, centerSourceId);

    // 変更した paint を元に戻す
    restoreBasePaintsIfAny(map);

    // store.state をクリア
    try {
        const vuex = resolveStore({ store: storeArg });
        if (vuex && vuex.state) {
            if (idsStoreKey)     vuex.state[idsStoreKey] = [];
            if (geojsonStoreKey) vuex.state[geojsonStoreKey] = { type: 'FeatureCollection', features: [] };
        }
    } catch (e) { /* noop */ }

    // 内部状態クリア
    if (map[STATE_KEY]) map[STATE_KEY].last = {};
}

// 後方互換エイリアス
export const refresh200mCircleAndHighlight = refreshRadiusHighlight;
export const clear200mHighlight = clearRadiusHighlight;
