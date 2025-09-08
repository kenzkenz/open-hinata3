/*
 * MapLibre 右クリック / 長押し コンテキストメニュー（多層式・後方互換 / ホバー安定）
 *
 * 変更要旨（重要）：
 * - サブメニューのホバー遷移で閉じてしまう問題を修正。
 *   親行の mouseleave で即クローズせず、遅延タイマーを入れ、
 *   サブメニューに mouseenter したらタイマーをキャンセルする方式。
 * - 既存のフラット items はそのまま動作（後方互換）。
 * - サブメニューは各要素に items / children を持たせるだけでOK。
 */
import store from '@/store'
import {featureCollectionAdd, featuresDelete, markerAddAndRemove, removeThumbnailMarkerByKey} from "@/js/downLoad";
import {haptic} from "@/js/utils/haptics";

export default function attachMapRightClickMenu({ map, items = [], longPressMs = 800, submenuDelay = 260 }) {
    if (!map) throw new Error('map が必要です');
    const container = map.getContainer();
    const canvas = map.getCanvas();

    // ネイティブ右クリックメニュー抑止（Safari含む）
    const preventNative = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', preventNative);

    // メニュー DOM（トップレベル）
    const menu = document.createElement('div');
    menu.className = 'ml-contextmenu';
    Object.assign(menu.style, {
        position: 'absolute', zIndex: '9999', minWidth: '180px', padding: '6px',
        borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,.18)', background: 'white',
        font: '14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        display: 'none'
    });
    container.style.position = container.style.position || 'relative';
    container.appendChild(menu);

    // ===== サブメニュー管理 =====
    const stacks = [];            // depth ごとの wrap DOM（0 はトップの中身）
    const hoverCloseTimers = [];  // depth ごとのクローズ遅延タイマー
    const isTouchEnv = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function clearStacksFrom(depth) {
        for (let i = stacks.length - 1; i >= depth; i--) {
            const el = stacks[i];
            if (el && el.parentNode) el.parentNode.removeChild(el);
            stacks.pop();
        }
        // タイマーもクリア
        for (let d = depth; d < hoverCloseTimers.length; d++) {
            if (hoverCloseTimers[d]) clearTimeout(hoverCloseTimers[d]);
            hoverCloseTimers[d] = null;
        }
    }
    function scheduleClose(depth) {
        if (hoverCloseTimers[depth]) clearTimeout(hoverCloseTimers[depth]);
        hoverCloseTimers[depth] = setTimeout(() => clearStacksFrom(depth + 1), submenuDelay);
    }
    function cancelClose(depth) {
        if (hoverCloseTimers[depth]) { clearTimeout(hoverCloseTimers[depth]); hoverCloseTimers[depth] = null; }
    }

    function makeSeparator() {
        const hr = document.createElement('div');
        Object.assign(hr.style, { height: '1px', background: 'rgba(0,0,0,.08)', margin: '4px 0' });
        return hr;
    }
    const isSeparator = (it) => it === '-' || it?.type === 'separator';
    const hasChildren = (it) => Array.isArray(it?.items) || Array.isArray(it?.children);
    const childrenOf = (it) => (it?.items || it?.children || []).filter(Boolean);

    function createLeafButton(it, ctx) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = it.label ?? '項目';
        Object.assign(btn.style, {
            display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
            border: 'none', background: 'transparent', cursor: 'pointer'
        });
        btn.onmouseenter = () => (btn.style.background = 'rgba(0,0,0,.06)');
        btn.onmouseleave = () => (btn.style.background = 'transparent');
        btn.onclick = (e) => {
            hide();
            try { it.onSelect?.({ map, lngLat: ctx.lngLat, point: ctx.point, originalEvent: e }); } catch (err) { console.error(err); }
        };
        return btn;
    }

    function createRowBase() {
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
            userSelect: 'none', whiteSpace: 'nowrap'
        });
        row.addEventListener('mouseenter', () => (row.style.background = 'rgba(0,0,0,.06)'));
        row.addEventListener('mouseleave', () => (row.style.background = 'transparent'));
        return row;
    }

    function createMenuList(listItems, ctx, depth) {
        const wrap = document.createElement('div');
        Object.assign(wrap.style, {
            position: depth === 0 ? 'static' : 'absolute',
            left: depth === 0 ? '0' : '100%',
            top: '0',
            minWidth: '180px', padding: '6px', borderRadius: '12px',
            boxShadow: depth === 0 ? 'none' : '0 8px 24px rgba(0,0,0,.18)', background: 'white'
        });
        wrap.dataset.depth = String(depth);

        listItems.forEach((it, i) => {
            if (!it) return;
            if (isSeparator(it)) { wrap.appendChild(makeSeparator()); return; }

            if (hasChildren(it)) {
                const row = createRowBase();
                const label = document.createElement('div');
                label.textContent = it.label ?? `項目 ${i+1}`;
                label.style.flex = '1';
                const arrow = document.createElement('div');
                arrow.textContent = '›';
                arrow.style.opacity = '.5';
                row.appendChild(label); row.appendChild(arrow);

                const openSub = () => {
                    cancelClose(depth);
                    clearStacksFrom(depth + 1);
                    const sub = createMenuList(childrenOf(it), ctx, depth + 1);
                    // サブメニューに hover ハンドラを付与（親のクローズ遅延を制御）
                    sub.addEventListener('mouseenter', () => cancelClose(depth));
                    sub.addEventListener('mouseleave', () => scheduleClose(depth));
                    menu.appendChild(sub);
                    positionSubmenu(row, sub);
                    stacks.push(sub);
                };

                // PC: hover / タッチ: click トグル
                row.addEventListener('mouseenter', () => { if (!isTouchEnv) { cancelClose(depth); openSub(); } });
                row.addEventListener('mouseleave', (e) => {
                    if (isTouchEnv) return;
                    // サブメニューへ移動中なら閉じない
                    const next = stacks[depth + 1];
                    const rt = e && (e.relatedTarget || null);
                    if (next && rt && (next === rt || next.contains(rt))) return;
                    scheduleClose(depth);
                });
                row.addEventListener('click', (e) => {
                    const last = stacks[stacks.length - 1];
                    const lastDepth = last ? Number(last.dataset.depth) : -1;
                    if (last && lastDepth === depth + 1) { clearStacksFrom(depth + 1); }
                    else { openSub(); }
                    e.stopPropagation();
                });

                wrap.appendChild(row);
            } else {
                wrap.appendChild(createLeafButton(it, ctx));
            }
        });

        return wrap;
    }

    function positionSubmenu(parentRow, subEl) {
        // subEl は menu（トップ）直下に absolute 配置される
        const rParent = parentRow.getBoundingClientRect();
        const rMenu   = menu.getBoundingClientRect();
        const rCont   = container.getBoundingClientRect();

        // 右側に出すのが基本
        let left = rParent.right - rMenu.left - 2; // 2px 重ねてギャップを消す
        let top  = rParent.top   - rMenu.top  - 6;

        subEl.style.left = left + 'px';
        subEl.style.top  = top  + 'px';

        const rSub = subEl.getBoundingClientRect();
        // 右端に溢れたら左側へフリップ
        if (rSub.right > rCont.right - 8) {
            left = rParent.left - rMenu.left - rSub.width - 2;
            subEl.style.left = left + 'px';
        }
        // 下端に溢れたら上方向に持ち上げ
        if (rSub.bottom > rCont.bottom - 8) {
            top = Math.max(6, rCont.bottom - rMenu.top - rSub.height - 6);
            subEl.style.top = top + 'px';
        }
    }

    function buildMenu(ctx) {
        menu.innerHTML = '';
        clearStacksFrom(0);
        const root = createMenuList(items, ctx, 0);
        menu.appendChild(root);
        stacks.push(root);
    }

    function show(px, py, ctx) {
        if (store.state.isIframe) return;
        buildMenu(ctx);
        // いったん表示 → サイズ取得 → はみ出し補正
        menu.style.display = 'block';
        menu.style.left = px + 8 + 'px';
        menu.style.top  = py + 8 + 'px';
        const rect  = menu.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        let left = px + 8;
        let top  = py + 8;
        if (left + rect.width  > cRect.width)  left = Math.max(8, px - rect.width - 8);
        if (top  + rect.height > cRect.height) top  = Math.max(8, py - rect.height - 8);
        menu.style.left = left + 'px';
        menu.style.top  = top  + 'px';
        window.addEventListener('keydown', onKeyDown, true);
        setTimeout(() => document.addEventListener('pointerdown', onOutsidePointer, true));
        try { haptic({ strength: 'success' }) } catch {}
    }

    function hide() {
        menu.style.display = 'none';
        clearStacksFrom(0);
        document.removeEventListener('pointerdown', onOutsidePointer, true);
        window.removeEventListener('keydown', onKeyDown, true);
    }

    function onOutsidePointer(e) { if (!menu.contains(e.target)) hide(); }
    function onKeyDown(e) { if (e.key === 'Escape') hide(); }

    // コンテキストメニュー（PC）
    function onContextMenu(e) {
        e.preventDefault();
        const { x, y } = e.point; // MapLibreのピクセル（コンテナ基準）
        show(x, y, { lngLat: e.lngLat, point: e.point });
    }
    map.on('contextmenu', onContextMenu);

    // 長押し（タッチ）
    let pressTimer = null;
    let pressStartPoint = null;
    function onPointerDown(ev) {
        if (ev.pointerType === 'mouse') return; // マウスは contextmenu に任せる
        pressStartPoint = getPointFromEvent(ev);
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            const lngLat = map.unproject([pressStartPoint.x, pressStartPoint.y]);
            show(pressStartPoint.x, pressStartPoint.y, { lngLat, point: pressStartPoint });
        }, longPressMs);
    }
    function onPointerUpCancel() { clearTimeout(pressTimer); pressTimer = null; pressStartPoint = null; }
    canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
    canvas.addEventListener('pointerup', onPointerUpCancel, { passive: true });
    canvas.addEventListener('pointercancel', onPointerUpCancel, { passive: true });
    canvas.addEventListener('pointerleave', onPointerUpCancel, { passive: true });

    // 地図操作で自動クローズ
    const autoHide = () => hide();
    map.on('movestart', autoHide);
    map.on('zoomstart', autoHide);
    map.on('rotatestart', autoHide);
    map.on('dragstart', autoHide);

    function getPointFromEvent(ev) {
        const r = container.getBoundingClientRect();
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    // クリーンアップ
    function detach() {
        try { canvas.removeEventListener('contextmenu', preventNative); } catch {}
        try { map.off('contextmenu', onContextMenu); } catch {}
        try { canvas.removeEventListener('pointerdown', onPointerDown); } catch {}
        try { canvas.removeEventListener('pointerup', onPointerUpCancel); } catch {}
        try { canvas.removeEventListener('pointercancel', onPointerUpCancel); } catch {}
        try { canvas.removeEventListener('pointerleave', onPointerUpCancel); } catch {}
        try { map.off('movestart', autoHide); map.off('zoomstart', autoHide); map.off('rotatestart', autoHide); map.off('dragstart', autoHide); } catch {}
        hide();
        try { menu.remove(); } catch {}
    }

    return detach;
}

// ================================
// Google Maps / Street View URL ヘルパー（以下は元コードのまま）
// ================================
export function buildGoogleMapsUrl(lngLat, opts = {}) {
    const { zoom = 18 } = opts;
    const url = new URL('https://www.google.com/maps/@');
    url.searchParams.set('api', '1');
    url.searchParams.set('map_action', 'map');
    url.searchParams.set('center', `${lngLat.lat},${lngLat.lng}`); // lat,lng 順
    url.searchParams.set('zoom', String(Math.round(zoom)));
    return url.toString();
}
export function buildGoogleMapsSearchUrl(lngLat) {
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', `${lngLat.lat},${lngLat.lng}`); // lat,lng 順
    return url.toString();
}
export function buildStreetViewUrl(lngLat, opts = {}) {
    const heading = Number.isFinite(opts.heading) ? opts.heading : 0; // 0..360 (北=0, 東=90)
    const pitch = Number.isFinite(opts.pitch) ? opts.pitch : 0; // -90..90（下..上）
    const fov = Number.isFinite(opts.fov) ? opts.fov : 90; // 10..120（画角）
    const normHeading = ((heading % 360) + 360) % 360;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const url = new URL('https://www.google.com/maps/@');
    url.searchParams.set('api', '1');
    url.searchParams.set('map_action', 'pano');
    url.searchParams.set('viewpoint', `${lngLat.lat},${lngLat.lng}`); // lat,lng 順
    url.searchParams.set('heading', String(Math.round(normHeading)));
    url.searchParams.set('pitch', String(Math.round(clamp(pitch, -90, 90))));
    url.searchParams.set('fov', String(Math.round(clamp(fov, 10, 120))));
    return url.toString();
}

// ================================
// 便利メニュー集/ピン削除/SVウインドウ/可視ベクター出力
// （この下は元コードと同内容。省略せず残しています）
// ================================
export function toFixedCoord(lngLat, n = 8) { return `${lngLat.lng.toFixed(n)}, ${lngLat.lat.toFixed(n)}`; }
export function toDMS(lngLat) { const toD = (deg, pos, neg) => { const s = deg >= 0 ? 1 : -1; const a = Math.abs(deg); const d = Math.floor(a); const mFloat = (a - d) * 60; const m = Math.floor(mFloat); const sec = (mFloat - m) * 60; const hemi = s >= 0 ? pos : neg; return `${d}°${m}'${sec.toFixed(2)}"${hemi}`; }; return `${toD(lngLat.lat, 'N', 'S')} ${toD(lngLat.lng, 'E', 'W')}`; }
export function toGeoJSONPointString(lngLat) { return JSON.stringify({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] } }); }
export function toWKTPoint(lngLat) { return `POINT(${lngLat.lng} ${lngLat.lat})`; }
export function buildBBoxAround(lngLat, meters = 100) { const latRad = lngLat.lat * Math.PI / 180; const dLat = meters / 111_320; const dLng = meters / (111_320 * Math.cos(latRad)); return [lngLat.lng - dLng, lngLat.lat - dLat, lngLat.lng + dLng, lngLat.lat + dLat]; }
export function buildOsmUrl(lngLat, zoom = 18) { return `https://www.openstreetmap.org/#map=${Math.round(zoom)}/${lngLat.lat}/${lngLat.lng}`; }
export function buildBingMapsUrl(lngLat, zoom = 18) { return `https://www.bing.com/maps?cp=${lngLat.lat}~${lngLat.lng}&lvl=${Math.round(zoom)}`; }
export function buildNominatimReverseUrl(lngLat) { return `https://nominatim.openstreetmap.org/ui/reverse.html?lat=${lngLat.lat}&lon=${lngLat.lng}`; }
export function buildMapillaryUrl(lngLat, zoom = 18, bearing = 0) { const b = ((bearing % 360) + 360) % 360; return `https://www.mapillary.com/app/?lat=${lngLat.lat}&lng=${lngLat.lng}&z=${Math.round(zoom)}&bearing=${Math.round(b)}`; }
export function lngLatToTile(lng, lat, z) { const latRad = lat * Math.PI / 180; const n = 2 ** z; const x = Math.floor(((lng + 180) / 360) * n); const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n); return { x, y, z }; }
export function tileToQuadkey(x, y, z) { let quad = ''; for (let i = z; i > 0; i--) { let digit = 0; const mask = 1 << (i - 1); if ((x & mask) !== 0) digit += 1; if ((y & mask) !== 0) digit += 2; quad += String(digit); } return quad; }
export function pushFeatureToGeoJsonSource(map, sourceId, feature) { const now = new Date(); const hours = now.getHours(); const minutes = now.getMinutes(); const seconds = now.getSeconds(); feature.properties.label = `${hours}:${minutes}:${seconds}`; const src = map.getSource(sourceId); if (!src || !src.setData) return alert(`GeoJSONソース '${sourceId}' が見つかりません`); const data = (src._data && src._data.type === 'FeatureCollection') ? src._data : { type: 'FeatureCollection', features: [] }; const next = { type: 'FeatureCollection', features: [...(data.features || []), feature] }; src.setData(next); store.state.clickCircleGeojsonText = JSON.stringify(next); store.state.updatePermalinkFire = !store.state.updatePermalinkFire; if (!store.state.isUsingServerGeojson) { featureCollectionAdd() } markerAddAndRemove() }
export function pointFeature(lngLat, props = {}) { return { type: 'Feature', properties: { id: String(Date.now()), ...props }, geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] } }; }
export function circlePolygonFeature(lngLat, radiusMeters = 50, steps = 64, props = {}) { const latRad = lngLat.lat * Math.PI / 180; const dLat = radiusMeters / 111_320; const dLngCoeff = 1 / (111_320 * Math.cos(latRad)); const coords = []; for (let i = 0; i < steps; i++) { const t = (i / steps) * Math.PI * 2; const dx = Math.cos(t) * radiusMeters * dLngCoeff; const dy = Math.sin(t) * dLat; coords.push([lngLat.lng + dx, lngLat.lat + dy]); } coords.push(coords[0]); return { type: 'Feature', properties: { id: String(Date.now()), ...props }, geometry: { type: 'Polygon', coordinates: [coords] } } }
let __measureStart = null; export function toggleMeasureHere(lngLat) { if (!__measureStart) { __measureStart = lngLat; return '計測開始: 次の点で距離を表示'; } const R = 6371_008.8; const toRad = (d) => d * Math.PI / 180; const dLat = toRad(lngLat.lat - __measureStart.lat); const dLng = toRad(lngLat.lng - __measureStart.lng); const a = Math.sin(dLat/2)**2 + Math.cos(toRad(__measureStart.lat))*Math.cos(toRad(lngLat.lat))*Math.sin(dLng/2)**2; const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); const meters = R * 1000 * c; __measureStart = null; return meters >= 1000 ? `約${(meters/1000).toFixed(2)} km` : `約${meters.toFixed(1)} m`; }
export function buildUtilityMenuItems({ map, geojsonSourceId = 'click-circle-source' } = {}) { return [ { label: 'コピー: 緯度経度(10進)', onSelect: async ({ lngLat }) => { const s = toFixedCoord(lngLat, 8); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } }, { label: 'コピー: 緯度経度(DMS)', onSelect: async ({ lngLat }) => { const s = toDMS(lngLat); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } }, { label: 'コピー: GeoJSON(Point)', onSelect: async ({ lngLat }) => { const s = toGeoJSONPointString(lngLat); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } }, { label: 'コピー: WKT(POINT)', onSelect: async ({ lngLat }) => { const s = toWKTPoint(lngLat); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } }, { label: 'コピー: BBOX±100m', onSelect: async ({ lngLat }) => { const b = buildBBoxAround(lngLat, 100); const s = `[${b.map(n=>n.toFixed(8)).join(',')}]`; try { await navigator.clipboard.writeText(s); } catch { alert(s); } } }, { label: 'ここにピンを追加', onSelect: ({ lngLat }) => { pushFeatureToGeoJsonSource(map, geojsonSourceId, pointFeature(lngLat, { label: 'PIN', color: 'red', 'point-color': 'red', 'text-size': 14 })); } }, { label: '円を追加: 半径50m', onSelect: ({ lngLat }) => { pushFeatureToGeoJsonSource(map, geojsonSourceId, circlePolygonFeature(lngLat, 50, 64, { label: 'r=50m' })); } }, { label: '円を追加: 半径100m', onSelect: ({ lngLat }) => { pushFeatureToGeoJsonSource(map, geojsonSourceId, circlePolygonFeature(lngLat, 100, 64, { label: 'r=100m' })); } }, { label: 'ここへセンター', onSelect: ({ lngLat }) => { map.easeTo({ center: lngLat }); } }, { label: 'ここへズーム(＋1)', onSelect: () => { map.easeTo({ zoom: map.getZoom() + 1 }); } }, { label: '北を上に(方位=0°)', onSelect: () => { map.easeTo({ bearing: 0 }); } }, { label: '俯瞰 60°/0° 切替', onSelect: () => { const p = map.getPitch(); map.easeTo({ pitch: p > 30 ? 0 : 60 }); } }, { label: 'OSMで開く', onSelect: ({ lngLat }) => window.open(buildOsmUrl(lngLat, map.getZoom?.() ?? 18), '_blank', 'noopener') }, { label: 'Bing Mapsで開く', onSelect: ({ lngLat }) => window.open(buildBingMapsUrl(lngLat, map.getZoom?.() ?? 18), '_blank', 'noopener') }, { label: '住所を調べる (Nominatim)', onSelect: ({ lngLat }) => window.open(buildNominatimReverseUrl(lngLat), '_blank', 'noopener') }, { label: 'Mapillaryで開く', onSelect: ({ lngLat }) => window.open(buildMapillaryUrl(lngLat, map.getZoom?.() ?? 18, map.getBearing?.() ?? 0), '_blank', 'noopener') }, { label: 'コピー: XYZ/Quadkey', onSelect: async ({ lngLat }) => { const z = Math.round(map.getZoom?.() ?? 18); const {x,y} = lngLatToTile(lngLat.lng, lngLat.lat, z); const qk = tileToQuadkey(x,y,z); const s = `z=${z}, x=${x}, y=${y}, quadkey=${qk}`; try { await navigator.clipboard.writeText(s); } catch { alert(s); } } }, { label: '距離計測: ここを起点/終点', onSelect: ({ lngLat }) => { const msg = toggleMeasureHere(lngLat); alert(msg); } }, ]; }
function haversineMeters(a, b) { const toRad = (d) => d * Math.PI / 180; const R = 6371_008.8; const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng); const lat1 = toRad(a.lat); const lat2 = toRad(b.lat); const h = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2)**2; return 2 * R * Math.asin(Math.sqrt(h)); }
export async function removeFeatureByIdFromGeoJsonSource(map, sourceId, featureId, targetFeature) { const src = map.getSource(sourceId); if (!src || !src._data) return false; const fc = src._data.type === 'FeatureCollection' ? src._data : { type: 'FeatureCollection', features: [] }; const before = fc.features.length; const next = { type: 'FeatureCollection', features: fc.features.filter(f => f?.properties?.id !== featureId) }; src.setData(next); store.state.clickCircleGeojsonText = JSON.stringify(next); store.state.updatePermalinkFire = !store.state.updatePermalinkFire; const key = targetFeature.geometry.coordinates.join(); console.log(key); removeThumbnailMarkerByKey(key); featureCollectionAdd(); markerAddAndRemove(); return next.features.length < before; }
export function removePointUnderCursor(map, point, sourceId) { const feats = map.queryRenderedFeatures(point); const target = feats.find(f => f?.layer?.source === sourceId && f?.geometry?.type === 'Point'); if (target) { const fid = target.properties?.id ?? target.id ?? null; if (fid != null) return removeFeatureByIdFromGeoJsonSource(map, sourceId, String(fid), target); } return false; }
export function removeNearestPointFeature(map, sourceId, lngLat, maxMeters = 50) { const src = map.getSource(sourceId); if (!src || !src._data) return null; const fc = src._data.type === 'FeatureCollection' ? src._data : { type: 'FeatureCollection', features: [] }; let best = { idx: -1, d: Infinity, id: null }; for (let i = 0; i < (fc.features?.length || 0); i++) { const f = fc.features[i]; if (!f || f.geometry?.type !== 'Point') continue; const [lng, lat] = f.geometry.coordinates || []; if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue; const d = haversineMeters(lngLat, { lng, lat }); if (d < best.d) best = { idx: i, d, id: f.properties?.id ?? null }; } if (best.idx >= 0 && best.d <= maxMeters) { const next = { type: 'FeatureCollection', features: fc.features.slice() }; next.features.splice(best.idx, 1); src.setData(next); return { removedId: best.id, distanceMeters: best.d }; } return null; }
export function removeAllPointsInRadius(map, sourceId, lngLat, radiusMeters = 50) { const src = map.getSource(sourceId); if (!src || !src._data) return 0; const fc = src._data.type === 'FeatureCollection' ? src._data : { type: 'FeatureCollection', features: [] }; const kept = []; let removed = 0; for (const f of (fc.features || [])) { if (f?.geometry?.type !== 'Point') { kept.push(f); continue; } const [lng, lat] = f.geometry.coordinates || []; const d = haversineMeters(lngLat, { lng, lat }); if (d <= radiusMeters) removed++; else kept.push(f); } src.setData({ type: 'FeatureCollection', features: kept }); return removed; }
export function buildSVUrlSimple(lngLat, { heading = 0, pitch = -15, fov = 90 } = {}) { const norm = ((heading % 360) + 360) % 360; const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const url = new URL('https://www.google.com/maps/@'); url.searchParams.set('api', '1'); url.searchParams.set('map_action', 'pano'); url.searchParams.set('viewpoint', `${lngLat.lat},${lngLat.lng}`); url.searchParams.set('heading', String(Math.round(norm))); url.searchParams.set('pitch', String(Math.round(clamp(pitch, -90, 90)))); url.searchParams.set('fov', String(Math.round(clamp(fov, 10, 120)))); return url.toString(); }
export function openTopRightWindowFlushHalfWidthFullHeight(url, { name = 'GSV-TopRight-Half' } = {}) { const baseLeft = (typeof screen.availLeft === 'number') ? screen.availLeft : 0; const baseTop  = (typeof screen.availTop  === 'number') ? screen.availTop  : 0; const availW   = screen.availWidth  || screen.width; const availH   = screen.availHeight || screen.height; const targetW = Math.max(200, Math.floor(availW / 2)); const approxLeft = Math.max(baseLeft, Math.round(baseLeft + availW - targetW)); const approxTop  = baseTop; const features = `width=${targetW},height=${availH},left=${approxLeft},top=${approxTop},resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no`; const win = window.open(url, name, features); if (!win) return null; try { win.opener = null; } catch {} const align = () => { try { win.resizeTo(targetW, availH); const ow = win.outerWidth; const left = baseLeft + availW - ow; const top  = baseTop; win.moveTo(Math.max(baseLeft, Math.round(left)), Math.max(baseTop, Math.round(top))); } catch (_) {} }; align(); setTimeout(align, 50); setTimeout(align, 200); try { win.focus(); } catch {} return win; }
export const menuItemGsvTopRightHalfFull = { label: 'ストリートビュー（右上ビタ・全高・半幅）', onSelect: ({ map, lngLat }) => { const heading = ((map?.getBearing?.() ?? 0) + 360) % 360; const url = buildSVUrlSimple(lngLat, { heading, pitch: -15, fov: 90 }); openTopRightWindowFlushHalfWidthFullHeight(url, { name: 'GSV-TopRight-Half' }); } };
const SV_PIN_SOURCE_ID = 'sv-pin-source'; const SV_PIN_LAYER_ID = 'sv-pin-circle';
export function ensureSvPinLayers(map) { if (!map.isStyleLoaded || !map.isStyleLoaded()) { try { map.once('load', () => ensureSvPinLayers(map)); } catch {} return; } if (!map.getSource(SV_PIN_SOURCE_ID)) { map.addSource(SV_PIN_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); } if (!map.getLayer(SV_PIN_LAYER_ID)) { map.addLayer({ id: SV_PIN_LAYER_ID, type: 'circle', source: SV_PIN_SOURCE_ID, paint: { 'circle-radius': 8, 'circle-color': '#ff5722', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': 1 } }); } map.moveLayer(SV_PIN_LAYER_ID); if (!map.__svPinClickBound) { try { map.on('click', SV_PIN_LAYER_ID, () => removeSvPin(map)); map.on('mouseenter', SV_PIN_LAYER_ID, () => map.getCanvas().style.cursor = 'pointer'); map.on('mouseleave', SV_PIN_LAYER_ID, () => map.getCanvas().style.cursor = ''); } catch {} map.__svPinClickBound = true; } }
export function setSvPin(map, lngLat) { const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'sv-pin' }, geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] } }] }; const setData = () => { const src = map.getSource(SV_PIN_SOURCE_ID); if (src && src.setData) src.setData(fc); }; if (!map.getSource(SV_PIN_SOURCE_ID)) { ensureSvPinLayers(map); if (!map.getSource(SV_PIN_SOURCE_ID)) { try { map.once('load', setData); } catch {} return; } } ensureSvPinLayers(map); setData(); }
export function removeSvPin(map) { const src = map.getSource(SV_PIN_SOURCE_ID); if (src && src.setData) src.setData({ type: 'FeatureCollection', features: [] }); }
const LAYER_BLOCKLIST = [ 'zones-layer' ];
const DEFAULT_EXCLUDE_PATTERNS = [ /^background$/i, /basemap/i, /osm/i, /openmaptiles/i, /openstreetmap/i, /gsi/i, /std/i, /seamless/i, /hillshade/i, /terrain/i, /contour/i, /water/i, /road/i, /label/i, /poi/i, /transit/i, /building/i, /satellite/i ];
function _isVectorType(t) { return t === 'fill' || t === 'line' || t === 'circle' || t === 'symbol' || t === 'fill-extrusion'; }
function _isVisible(map, id) { const v = map.getLayoutProperty(id, 'visibility'); return v == null || v === 'visible'; }
function _isExcluded(id, includeExcluded) { if (includeExcluded) return false; if (!id) return false; if (id.includes('-vector-')) return true; if (LAYER_BLOCKLIST.includes(id)) return true; return DEFAULT_EXCLUDE_PATTERNS.some(re => re.test(id)); }
function _featKey(f) { const src = f.source || ''; const sl  = f.sourceLayer || ''; return `${src}|${sl}|${JSON.stringify(f.geometry)}`; }
function _nowStr() { const d = new Date(), p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }
function _baseGeomType(t) { if (!t) return null; return t.startsWith('Multi') ? t.slice(5) : t; }
function _combinedType(base) { if (!base) return null; return base === 'GeometryCollection' ? 'GeometryCollection' : ('Multi' + base); }
function _combineById(features) { const groups = new Map(); for (const f of features) { const gid = (f.properties?.id ?? f.properties?._id ?? f.id); if (gid == null) continue; if (!groups.has(gid)) groups.set(gid, []); groups.get(gid).push(f); } for (const [gid, arr] of groups) { if (arr.length <= 1) continue; const base = _baseGeomType(arr[0].geometry?.type); if (!base) continue; const combinedType = _combinedType(base); const acc = []; for (const f of arr) { const g = f.geometry; if (!g || !g.type) continue; const t = _baseGeomType(g.type); if (t !== base) continue; if (g.type.startsWith('Multi')) { for (const part of g.coordinates) acc.push(part); } else { acc.push(g.coordinates); } } if (acc.length >= 2) { arr[0].geometry = { type: combinedType, coordinates: acc }; for (let i = 1; i < arr.length; i++) arr[i]._drop = true; } } return features.filter(f => !f._drop); }
export function exportVisibleGeoJSON_fromMap01(opts = {}) { const includeExcluded = !!opts.includeExcluded; const map = store.state.map01; const targetLayerIds = map.getStyle().layers.filter(l => _isVectorType(l.type) && _isVisible(map, l.id) && !_isExcluded(l.id, includeExcluded)).map(l => l.id); if (!targetLayerIds.length) { alert('対象レイヤがありません。（除外設定により全て除外されている可能性があります）'); return; } const w = map.getContainer().clientWidth, h = map.getContainer().clientHeight; const feats = map.queryRenderedFeatures([[0,0],[w,h]], { layers: targetLayerIds }); if (!feats.length) { alert('画面内に出力対象の地物がありません。'); return; } const seen = new Set(); const features = []; for (const f of feats) { const key = _featKey(f); if (seen.has(key)) continue; seen.add(key); const props = f.properties ? { ...f.properties } : {}; props.__layer = f.layer?.id; props.__source = f.source; props.__sourceLayer = f.sourceLayer; features.push({ type: 'Feature', geometry: JSON.parse(JSON.stringify(f.geometry)), properties: props }); } const combinedFeatures = _combineById(features); const fc = { type: 'FeatureCollection', features: combinedFeatures }; const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `oh3_visible_${_nowStr()}.geojson`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function visibleGeojsonMenuItem() { return { id: 'export-visible-geojson', label: '可視ベクター地物をGeoJSONで出力', onSelect: (ev) => { const includeExcluded = !!(ev && (ev.altKey || ev.metaKey)); exportVisibleGeoJSON_fromMap01({ includeExcluded }); }, }; }
function visibleGeojsonMenuItemIncludeBase() { return { id: 'export-visible-geojson-all', label: 'ベースも含めてGeoJSON出力（可視ベクター）', onSelect: () => exportVisibleGeoJSON_fromMap01({ includeExcluded: true }), }; }
