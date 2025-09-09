/*
 * /src/js/utils/triangle50.js
 * 50°-50°-80° の等角三角形ユーティリティ（context-menu方式に最適化版）
 * - MapLibreの右クリメニューと自然に統合（items: () => … の動的メニュー）
 * - 1点目/2点目のクリック待機は map.once('click', …)（古環境は on/off フォールバック）
 * - 状態変更のたびに container.dispatchEvent('oh3:rcm:refresh') → メニューを開いたまま即反映
 * - add → remove の徹底。idPrefixで複数インスタンスも可能
 * - Turf.js（ESM）前提: import * as turf from '@turf/turf'
 *
 * 【今回の変更】
 * ポリゴン/ラインの描画設定を削除。クリック時に描くポイント設定だけ残す。
 */

import * as turf from '@turf/turf'
import {addDraw} from "@/js/downLoad";
import store from "@/store";
import {colorNameToRgba} from "@/js/pyramid";

// ==== triangle50内で lonlat を自前取得（グローバルポインタ捕捉・フォールバック用）====
let __OH_TRI50_LAST_POINTER = { x: null, y: null }
let __OH_TRI50_POINTER_HOOKED = false
if (typeof document !== 'undefined' && !__OH_TRI50_POINTER_HOOKED) {
    const __update = (ev) => { __OH_TRI50_LAST_POINTER.x = ev.clientX; __OH_TRI50_LAST_POINTER.y = ev.clientY }
    ;['pointerdown','pointermove','contextmenu'].forEach(t => {
        try { document.addEventListener(t, __update, true) } catch (_) {}
    })
    __OH_TRI50_POINTER_HOOKED = true
}
function _lngLatFromGlobalPointer (map) {
    const gp = __OH_TRI50_LAST_POINTER
    if (!gp || gp.x == null || gp.y == null) return null
    const rect = map.getContainer().getBoundingClientRect()
    const px = gp.x - rect.left
    const py = gp.y - rect.top
    if (!(px >= 0 && py >= 0 && px <= rect.width && py <= rect.height)) return null
    const p = map.unproject([px, py])
    return { lng: p.lng, lat: p.lat }
}

// ===== 可変デフォルト =====
const DEF = {
    idPrefix: 'oh-tri50',                 // 各種IDの接頭辞
    baseAngleDeg: 50,                     // 各端点の角度（頂角は80°）
    baseLine: 'rgba(0,0,0,0.85)',         // クリックポイントの色に使用
    addAboveLayerId: null                 // 指定があればこのレイヤーの直前に addLayer
}

// map に一時状態をぶら下げる（既存 store を汚さない）
function ensureLocalState (map) {
    if (!map.__oh_tri50) {
        map.__oh_tri50 = {
            first: null,       // [lng,lat] | null
            lastLngLat: null,  // 直近で取得した {lng,lat}
            ids: null,         // 追加済みID群
            _armedOff: null    // 次クリック待機の解除関数
        }
    }
    return map.__oh_tri50
}

function idset (prefix = DEF.idPrefix) {
    return {
        source: `${prefix}-source`,
        points: `${prefix}-points`
    }
}

function removeIfExists (map, ids) {
    const rmL = (id) => { if (map.getLayer(id)) map.removeLayer(id) }
    const rmS = (id) => { if (map.getSource(id)) map.removeSource(id) }
    rmL(ids.points)
    rmS(ids.source)
}

// ※ ポリゴン/ライン用の addLayers は削除（クリック点のみ描画）

function buildGeoJSON (A, B, apexL, apexR) {
    return {
        type: 'FeatureCollection',
        features: [
            // 三角形2枚 + ベースライン + 端点（GeoJSON自体は click-circle-source へ流す素材として保持）
            { type: 'Feature', properties: { side: 'left'  }, geometry: { type: 'Polygon',   coordinates: [[ A, apexL, B, A ]] } },
            { type: 'Feature', properties: { side: 'right' }, geometry: { type: 'Polygon',   coordinates: [[ A, B, apexR, A ]] } },
            { type: 'Feature', properties: { kind: 'base'  }, geometry: { type: 'LineString',coordinates: [ A, B ] } },
            { type: 'Feature', properties: { kind: 'endpoint' }, geometry: { type: 'Point', coordinates: A } },
            { type: 'Feature', properties: { kind: 'endpoint' }, geometry: { type: 'Point', coordinates: B } }
        ]
    }
}

// A,B から左右の頂点を計算
function computeApexes (A, B, baseAngleDeg = DEF.baseAngleDeg) {
    const d = turf.distance(turf.point(A), turf.point(B), { units: 'meters' })
    if (!Number.isFinite(d) || d <= 0) return null
    // 各端点の角度 = baseAngleDeg。底辺長 d のとき、頂点の高さ h = (d/2) * tan(baseAngle)
    const h = (d / 2) * Math.tan(baseAngleDeg * Math.PI / 180)
    const mid = turf.midpoint(turf.point(A), turf.point(B))
    const bearAB = turf.bearing(turf.point(A), turf.point(B)) // -180..180
    const b1 = bearAB + 90
    const b2 = bearAB - 90
    const apexL = turf.destination(mid, h, b1, { units: 'meters' }).geometry.coordinates
    const apexR = turf.destination(mid, h, b2, { units: 'meters' }).geometry.coordinates
    return { apexL, apexR }
}

// ==== メニュー即時更新ユーティリティ ====
function refreshMenu (map) {
    try { map.getContainer().dispatchEvent(new CustomEvent('oh3:rcm:refresh')) } catch (_) {}
}

export function clearTriangle50 (map, opts = {}) {
    const state = ensureLocalState(map)
    // クリック待機があれば解除
    if (state._armedOff) { try { state._armedOff(); } catch(_){} state._armedOff = null }

    const ids = idset(opts.idPrefix || DEF.idPrefix)
    removeIfExists(map, ids)
    state.ids = null
    state.first = null
    // lastLngLat は維持
    refreshMenu(map)

    const src = map.getSource('click-circle-source');
    const fc = src._data.type === 'FeatureCollection' ? src._data : { type: 'FeatureCollection', features: [] };
    const next = { type: 'FeatureCollection', features: fc.features.filter(f => f?.properties?.is50 === null) };
    src.setData(next);
    store.state.clickCircleGeojsonText = JSON.stringify(next)
    store.state.updatePermalinkFire = !store.state.updatePermalinkFire
}

// ---- lnglat 解決 & 記憶 ----
function resolveLngLat (map, arg) {
    // 1) {lng,lat}
    if (arg && typeof arg.lng === 'number' && typeof arg.lat === 'number') return { lng: arg.lng, lat: arg.lat }
    // 2) MapLibre の e.lngLat / {lngLat}
    if (arg && arg.lngLat && typeof arg.lngLat.lng === 'number') return { lng: arg.lngLat.lng, lat: arg.lngLat.lat }
    if (arg && arg.e && arg.e.lngLat && typeof arg.e.lngLat.lng === 'number') return { lng: arg.e.lngLat.lng, lat: arg.e.lngLat.lat }
    // 3) [lng,lat]
    if (Array.isArray(arg) && arg.length === 2 && isFinite(arg[0]) && isFinite(arg[1])) return { lng: +arg[0], lat: +arg[1] }
    // 4) {px,py}（画面/コンテナ座標）
    if (arg && typeof arg.px === 'number' && typeof arg.py === 'number') {
        const rect = map.getContainer().getBoundingClientRect()
        const x = arg.px - rect.left
        const y = arg.py - rect.top
        const p = map.unproject([x, y])
        return { lng: p.lng, lat: p.lat }
    }
    // 5) フォールバック: 内部で捕捉したグローバルポインタ
    const gp = _lngLatFromGlobalPointer(map)
    if (gp) return gp
    return null
}

export function rememberLngLat (map, arg) {
    const state = ensureLocalState(map)
    const ll = resolveLngLat(map, arg)
    if (ll) state.lastLngLat = ll
    return ll
}

export function queuePoint (map, arg, opts = {}) {
    const state = ensureLocalState(map)
    // lnglat を解決（引数→lastLngLat→内部ポインタ の順で採用）
    const picked = resolveLngLat(map, arg) || state.lastLngLat
    if (!picked) return 'NO_LNGLAT'
    state.lastLngLat = picked

    const A = state.first
    if (!A) {
        // 1点目セット（クリックポイントのみ描画）
        state.first = [picked.lng, picked.lat]
        // 前回の待機があれば解除
        const prevOff = state._armedOff; if (prevOff) { try { prevOff() } catch(_){} state._armedOff = null }
        const ids = idset(opts.idPrefix || DEF.idPrefix)
        removeIfExists(map, ids)
        const fc = { type: 'FeatureCollection', features: [ { type: 'Feature', properties: { kind: 'endpoint' }, geometry: { type: 'Point', coordinates: state.first } } ] }
        if (!map.getSource(ids.source)) map.addSource(ids.source, { type: 'geojson', data: fc })
        const add = (layer) => {
            if (opts.addAboveLayerId && map.getLayer(opts.addAboveLayerId)) map.addLayer(layer, opts.addAboveLayerId); else map.addLayer(layer)
        }
        add({ id: ids.points, type: 'circle', source: ids.source, filter: ['==', ['get','kind'], 'endpoint'], paint: { 'circle-radius': 4, 'circle-color': DEF.baseLine } })
        state.ids = ids
        refreshMenu(map)
        // 自動で2点目待機
        setTimeout(() => { try { armQueuePoint(map, opts) } catch (_) {} }, 0)
        return 'FIRST_SET'
    }

    // 2点目 → 三角形GeoJSON作成（描画設定はせず、既存フローに合流）
    const B = [picked.lng, picked.lat]
    const calc = computeApexes(A, B, opts.baseAngleDeg || DEF.baseAngleDeg)
    if (!calc) return 'INVALID'
    const { apexL, apexR } = calc
    const ids = idset(opts.idPrefix || DEF.idPrefix)
    removeIfExists(map, ids)
    const geojson = buildGeoJSON(A, B, apexL, apexR)

    geojson.features.forEach(f => {
        f.properties.is50 = true
        if (f.properties.side === 'left') {
            f.properties.color = colorNameToRgba('hotpink', 0.6)
        } else {
            f.properties.color = colorNameToRgba('green', 0.6)
        }
    })
    addDraw(geojson)

    state.ids = ids
    state.first = null
    refreshMenu(map)
    return 'CREATED'
}

// 次の“クリック”で queuePoint を発火させるワンショット待機
export function armQueuePoint (map, opts = {}) {
    const state = ensureLocalState(map)
    // 既存の待機があれば解除
    if (state._armedOff) { try { state._armedOff() } catch(_) {} }

    const handler = (e) => {
        try { queuePoint(map, e, opts) } finally {
            if (state._armedOff) { try { state._armedOff() } catch(_) {} state._armedOff = null }
        }
    }
    if (typeof map.once === 'function') {
        map.once('click', handler)
        state._armedOff = () => { try { map.off('click', handler) } catch(_) {} }
    } else {
        const wrapped = (e) => { handler(e); try { map.off('click', wrapped) } catch(_) {} }
        map.on('click', wrapped)
        state._armedOff = () => { try { map.off('click', wrapped) } catch(_) {} }
    }
    return 'ARMED'
}

/* ============================= */
/* 右クリックメニュー統合（context-menu方式） */
/* ============================= */
// フラット2項目（インライン展開用）※ 旧互換 API 名
export function buildTriangle50MenuInline (ctx, opts = {}) {
    return buildTri50Items(ctx, opts)
}

// items 配列に push（context-menu 向け）
export function addTri50MenuItems (items, ctx, opts = {}) {
    items.push({
        label: '50°三角形',
        // 開くたびに状態反映
        items: () => buildTri50Items(ctx, opts)
    })
}

// サブメニュー1項目（context-menu 向け）
export function buildTri50Submenu (ctx, label, opts = {}) {
    return {
        label: label,
        items: () => buildTri50Items(ctx, opts)
    }
}

// 実体：現在状態に応じた2項目を構築
export function buildTri50Items (ctx, opts = {}) {
    const map = ctx.map
    const state = ensureLocalState(map)
    const idPrefix = (opts.idPrefix || DEF.idPrefix)
    const hasLayer = !!map.getSource(`${idPrefix}-source`)

    return [
        {
            label: '基準点を2点クリックします',
            onSelect: () => armQueuePoint(map, opts)
        },
        {
            label: '削除',
            disabled: !hasLayer,
            onSelect: () => clearTriangle50(map, opts)
        }
    ]
}

/* ============================= */
/* データ取得ユーティリティ       */
/* ============================= */

export function getTriangle50FeatureCollection (map, opts = {}) {
    const ids = idset(opts.idPrefix || DEF.idPrefix)
    const src = map.getSource(ids.source)
    return src ? (src._data || src._options?.data || null) : null
}
export function getTriangle50LonLats (map, opts = {}) {
    const fc = getTriangle50FeatureCollection(map, opts)
    if (!fc) return null
    const base  = fc.features.find(f => f.properties?.kind === 'base')
    const left  = fc.features.find(f => f.properties?.side === 'left')
    const right = fc.features.find(f => f.properties?.side === 'right')
    if (!base) return null
    const [A, B] = base.geometry.coordinates
    const apexL = left?.geometry?.coordinates?.[0]?.[1]  || (left?.geometry?.coordinates?.[1])
    const apexR = right?.geometry?.coordinates?.[0]?.[2] || (right?.geometry?.coordinates?.[2])
    return { A, B, apexL, apexR }
}
