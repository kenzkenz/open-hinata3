/*
 * MapLibre 右クリック / 長押し コンテキストメニュー
 * - PC: 右クリック（contextmenu）
 * - スマホ/タブレット: 長押し（500ms）
 * - ネイティブのコンテキストメニューは抑止
 * - 画面端でのはみ出し防止
 * - 外側クリック/ESC/地図操作で自動クローズ
 *
 * 使い方：
 *   const detach = attachMapRightClickMenu({
 *     map: store.state.map01,
 *     items: [
 *       {
 *         label: 'ここへズーム',
 *         onSelect({ map, lngLat }) { map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 16) }); }
 *       },
 *       {
 *         label: '座標をコピー',
 *         async onSelect({ lngLat }) {
 *           const s = `${lngLat.lng.toFixed(8)}, ${lngLat.lat.toFixed(8)}`;
 *           try { await navigator.clipboard.writeText(s); alert('コピー: ' + s); } catch(_) { alert(s); }
 *         }
 *       },
 *       {
 *         label: 'ここにあるフィーチャ数を表示',
 *         onSelect({ map, point }) {
 *           const feats = map.queryRenderedFeatures(point);
 *           alert(`描画中フィーチャ: ${feats.length}件`);
 *         }
 *       }
 *     ]
 *   });
 *   // 後で無効化: detach()
 */
import store from '@/store'
import {featureCollectionAdd, featuresDelete, markerAddAndRemove, removeThumbnailMarkerByKey} from "@/js/downLoad";

export default function attachMapRightClickMenu({ map, items = [], longPressMs = 500 }) {
    if (!map) throw new Error('map が必要です');
    const container = map.getContainer();
    const canvas = map.getCanvas();

    // ネイティブ右クリックメニュー抑止（Safari含む）
    const preventNative = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', preventNative);

    // メニュー DOM 準備
    const menu = document.createElement('div');
    menu.className = 'ml-contextmenu';
    menu.style.position = 'absolute';
    menu.style.zIndex = '9999';
    menu.style.minWidth = '180px';
    menu.style.padding = '6px';
    menu.style.borderRadius = '12px';
    menu.style.boxShadow = '0 8px 24px rgba(0,0,0,.18)';
    menu.style.background = 'white';
    menu.style.font = '14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    menu.style.display = 'none';
    container.style.position = container.style.position || 'relative';
    container.appendChild(menu);

    function buildMenu({ lngLat, point }) {
        menu.innerHTML = '';
        items.forEach((it, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = it.label ?? `項目 ${i+1}`;
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.style.padding = '10px 12px';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
            btn.style.cursor = 'pointer';
            btn.onmouseenter = () => btn.style.background = 'rgba(0,0,0,.06)';
            btn.onmouseleave = () => btn.style.background = 'transparent';
            btn.onclick = () => {
                hide();
                try { it.onSelect?.({ map, lngLat, point }); } catch (err) { console.error(err); }
            };
            menu.appendChild(btn);
            if (i < items.length - 1) {
                const hr = document.createElement('div');
                hr.style.height = '1px';
                hr.style.background = 'rgba(0,0,0,.08)';
                menu.appendChild(hr);
            }
        });
    }

    function show(px, py, ctx) {
        buildMenu(ctx);
        // いったん表示 → サイズ取得 → はみ出し補正
        menu.style.display = 'block';
        menu.style.left = px + 8 + 'px';
        menu.style.top = py + 8 + 'px';
        const rect = menu.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        let left = px + 8;
        let top = py + 8;
        if (left + rect.width > cRect.width) left = Math.max(8, px - rect.width - 8);
        if (top + rect.height > cRect.height) top = Math.max(8, py - rect.height - 8);
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        window.addEventListener('keydown', onKeyDown, true);
        setTimeout(() => document.addEventListener('pointerdown', onOutsidePointer, true));
    }

    function hide() {
        menu.style.display = 'none';
        document.removeEventListener('pointerdown', onOutsidePointer, true);
        window.removeEventListener('keydown', onKeyDown, true);
    }

    function onOutsidePointer(e) {
        if (!menu.contains(e.target)) hide();
    }
    function onKeyDown(e) {
        if (e.key === 'Escape') hide();
    }

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
    function onPointerUpCancel() {
        clearTimeout(pressTimer); pressTimer = null; pressStartPoint = null;
    }
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
// Google Maps / Street View URL ヘルパー
// ================================
// 使い方（メニュー項目の例）はこの下のサンプル参照。

/**
 * Google マップ（地図）URL
 * @param {{lng:number, lat:number}} lngLat
 * @param {{zoom?:number}} opts
 */
export function buildGoogleMapsUrl(lngLat, opts = {}) {
    const { zoom = 18 } = opts;
    const url = new URL('https://www.google.com/maps/@');
    url.searchParams.set('api', '1');
    url.searchParams.set('map_action', 'map');
    url.searchParams.set('center', `${lngLat.lat},${lngLat.lng}`); // lat,lng 順
    url.searchParams.set('zoom', String(Math.round(zoom)));
    return url.toString();
}

/**
 * Google マップ検索 URL（アプリが入っている端末で開かれやすい）
 */
export function buildGoogleMapsSearchUrl(lngLat) {
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', `${lngLat.lat},${lngLat.lng}`); // lat,lng 順
    return url.toString();
}

/**
 * Google ストリートビュー URL
 * @param {{lng:number, lat:number}} lngLat
 * @param {{heading?:number, pitch?:number, fov?:number}} opts
 */
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

/*
 * ================================
 * 追加サンプル：右クリックメニューに Google マップ / ストリートビュー
 * ================================
 * const detach = attachMapRightClickMenu({
 *   map: store.state.map01,
 *   items: [
 *     {
 *       label: 'Googleマップで開く',
 *       onSelect: ({ map, lngLat }) => {
 *         // 検索URLか、中心指定URLのどちらかお好みで
 *         const url = buildGoogleMapsSearchUrl(lngLat);
 *         // const url = buildGoogleMapsUrl(lngLat, { zoom: map.getZoom() });
 *         window.open(url, '_blank', 'noopener');
 *       }
 *     },
 *     {
 *       label: 'ストリートビューで開く',
 *       onSelect: ({ map, lngLat }) => {
 *         const heading = map.getBearing?.() ?? 0; // 地図の方位を活用（任意）
 *         const pitch = (map.getPitch?.() ?? 0) - 20; // 少し下向き
 *         const url = buildStreetViewUrl(lngLat, { heading, pitch, fov: 90 });
 *         window.open(url, '_blank', 'noopener');
 *       }
 *     },
 *     {
 *       label: 'リンクをコピー（Maps / SV）',
 *       onSelect: async ({ map, lngLat }) => {
 *         const maps = buildGoogleMapsSearchUrl(lngLat);
 *         const sv = buildStreetViewUrl(lngLat, { heading: map.getBearing?.() ?? 0, pitch: map.getPitch?.() ?? 0 });
 *         const text = `Google Maps: ${maps}
Street View: ${sv}`;
 *         try { await navigator.clipboard.writeText(text); alert('リンクをコピーしました'); }
 *         catch { prompt('以下をコピーしてください', text); }
 *       }
 *     }
 *   ]
 * });
 *
 * // 補足：SVが無い場所では Google 側の「画像がありません」になる。
 * // 旧式の cbll パラメータ版（互換用）:
 * // `https://maps.google.com/maps?layer=c&cbll=${lat},${lng}`
 */


// ================================
// 便利メニュー集（コピー／作図／外部リンク／タイル）
// ================================

// ---- 基本フォーマット系
export function toFixedCoord(lngLat, n = 8) {
    return `${lngLat.lng.toFixed(n)}, ${lngLat.lat.toFixed(n)}`;
}
export function toDMS(lngLat) {
    const toD = (deg, pos, neg) => {
        const s = deg >= 0 ? 1 : -1;
        const a = Math.abs(deg);
        const d = Math.floor(a);
        const mFloat = (a - d) * 60;
        const m = Math.floor(mFloat);
        const sec = (mFloat - m) * 60;
        const hemi = s >= 0 ? pos : neg;
        return `${d}°${m}'${sec.toFixed(2)}"${hemi}`;
    };
    return `${toD(lngLat.lat, 'N', 'S')} ${toD(lngLat.lng, 'E', 'W')}`;
}
export function toGeoJSONPointString(lngLat) {
    return JSON.stringify({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] } });
}
export function toWKTPoint(lngLat) {
    return `POINT(${lngLat.lng} ${lngLat.lat})`;
}

// ---- BBOX（m 指定の簡易矩形）
export function buildBBoxAround(lngLat, meters = 100) {
    const latRad = lngLat.lat * Math.PI / 180;
    const dLat = meters / 111_320; // 1度の緯度 ≒ 111.32km
    const dLng = meters / (111_320 * Math.cos(latRad));
    return [lngLat.lng - dLng, lngLat.lat - dLat, lngLat.lng + dLng, lngLat.lat + dLat];
}

// ---- 外部リンク（追加）
export function buildOsmUrl(lngLat, zoom = 18) {
    return `https://www.openstreetmap.org/#map=${Math.round(zoom)}/${lngLat.lat}/${lngLat.lng}`;
}
export function buildBingMapsUrl(lngLat, zoom = 18) {
    return `https://www.bing.com/maps?cp=${lngLat.lat}~${lngLat.lng}&lvl=${Math.round(zoom)}`;
}
export function buildNominatimReverseUrl(lngLat) {
    return `https://nominatim.openstreetmap.org/ui/reverse.html?lat=${lngLat.lat}&lon=${lngLat.lng}`;
}
export function buildMapillaryUrl(lngLat, zoom = 18, bearing = 0) {
    const b = ((bearing % 360) + 360) % 360;
    return `https://www.mapillary.com/app/?lat=${lngLat.lat}&lng=${lngLat.lng}&z=${Math.round(zoom)}&bearing=${Math.round(b)}`;
}

// ---- タイル座標（XYZ / Quadkey）
export function lngLatToTile(lng, lat, z) {
    const latRad = lat * Math.PI / 180;
    const n = 2 ** z;
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y, z };
}
export function tileToQuadkey(x, y, z) {
    let quad = '';
    for (let i = z; i > 0; i--) {
        let digit = 0;
        const mask = 1 << (i - 1);
        if ((x & mask) !== 0) digit += 1;
        if ((y & mask) !== 0) digit += 2;
        quad += String(digit);
    }
    return quad;
}

// ---- GeoJSON ソースに追加
export function pushFeatureToGeoJsonSource(map, sourceId, feature) {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
    feature.properties.label = `${hours}:${minutes}:${seconds}`
    const src = map.getSource(sourceId);
    if (!src || !src.setData) return alert(`GeoJSONソース '${sourceId}' が見つかりません`);
    const data = (src._data && src._data.type === 'FeatureCollection') ? src._data : { type: 'FeatureCollection', features: [] };
    const next = { type: 'FeatureCollection', features: [...(data.features || []), feature] };
    src.setData(next);
    store.state.clickCircleGeojsonText = JSON.stringify(next)
    store.state.updatePermalinkFire = !store.state.updatePermalinkFire
    if (!store.state.isUsingServerGeojson) {
        featureCollectionAdd()
    }
    markerAddAndRemove()
}
export function pointFeature(lngLat, props = {}) {
    return { type: 'Feature',
        properties: {
            id: String(Date.now()), ...props
        },
        geometry: {
            type: 'Point',
            coordinates: [lngLat.lng, lngLat.lat]
        } };
}
export function circlePolygonFeature(lngLat, radiusMeters = 50, steps = 64, props = {}) {
    const latRad = lngLat.lat * Math.PI / 180;
    const dLat = radiusMeters / 111_320;
    const dLngCoeff = 1 / (111_320 * Math.cos(latRad));
    const coords = [];
    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const dx = Math.cos(t) * radiusMeters * dLngCoeff;
        const dy = Math.sin(t) * dLat; // 緯度方向は一定係数で十分
        coords.push([lngLat.lng + dx, lngLat.lat + dy]);
    }
    coords.push(coords[0]);
    return { type: 'Feature', properties: { id: String(Date.now()), ...props }, geometry: { type: 'Polygon', coordinates: [coords] } };
}

// ---- 簡易距離計測（右クリ連携用）
let __measureStart = null;
export function toggleMeasureHere(lngLat) {
    if (!__measureStart) { __measureStart = lngLat; return '計測開始: 次の点で距離を表示'; }
    // Haversine 簡易距離（km）
    const R = 6371_008.8; // m -> use km base
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lngLat.lat - __measureStart.lat);
    const dLng = toRad(lngLat.lng - __measureStart.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(__measureStart.lat))*Math.cos(toRad(lngLat.lat))*Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const meters = R * 1000 * c;
    __measureStart = null;
    return meters >= 1000 ? `約${(meters/1000).toFixed(2)} km` : `約${meters.toFixed(1)} m`;
}

// ---- よく使う実用メニューを一括生成
export function buildUtilityMenuItems({ map, geojsonSourceId = 'click-circle-source' } = {}) {
    return [
        // コピー系
        { label: 'コピー: 緯度経度(10進)', onSelect: async ({ lngLat }) => { const s = toFixedCoord(lngLat, 8); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } },
        { label: 'コピー: 緯度経度(DMS)', onSelect: async ({ lngLat }) => { const s = toDMS(lngLat); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } },
        { label: 'コピー: GeoJSON(Point)', onSelect: async ({ lngLat }) => { const s = toGeoJSONPointString(lngLat); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } },
        { label: 'コピー: WKT(POINT)', onSelect: async ({ lngLat }) => { const s = toWKTPoint(lngLat); try { await navigator.clipboard.writeText(s); } catch { alert(s); } } },
        { label: 'コピー: BBOX±100m', onSelect: async ({ lngLat }) => { const b = buildBBoxAround(lngLat, 100); const s = `[${b.map(n=>n.toFixed(8)).join(',')}]`; try { await navigator.clipboard.writeText(s); } catch { alert(s); } } },

        // 作図系
        { label: 'ここにピンを追加', onSelect: ({ lngLat }) => { pushFeatureToGeoJsonSource(map, geojsonSourceId, pointFeature(lngLat, { label: 'PIN', color: 'red', 'point-color': 'red', 'text-size': 14 })); } },
        { label: '円を追加: 半径50m', onSelect: ({ lngLat }) => { pushFeatureToGeoJsonSource(map, geojsonSourceId, circlePolygonFeature(lngLat, 50, 64, { label: 'r=50m' })); } },
        { label: '円を追加: 半径100m', onSelect: ({ lngLat }) => { pushFeatureToGeoJsonSource(map, geojsonSourceId, circlePolygonFeature(lngLat, 100, 64, { label: 'r=100m' })); } },

        // ナビ／ビュー
        { label: 'ここへセンター', onSelect: ({ lngLat }) => { map.easeTo({ center: lngLat }); } },
        { label: 'ここへズーム(＋1)', onSelect: () => { map.easeTo({ zoom: map.getZoom() + 1 }); } },
        { label: '北を上に(方位=0°)', onSelect: () => { map.easeTo({ bearing: 0 }); } },
        { label: '俯瞰 60°/0° 切替', onSelect: () => { const p = map.getPitch(); map.easeTo({ pitch: p > 30 ? 0 : 60 }); } },

        // 外部リンク
        { label: 'OSMで開く', onSelect: ({ lngLat }) => window.open(buildOsmUrl(lngLat, map.getZoom?.() ?? 18), '_blank', 'noopener') },
        { label: 'Bing Mapsで開く', onSelect: ({ lngLat }) => window.open(buildBingMapsUrl(lngLat, map.getZoom?.() ?? 18), '_blank', 'noopener') },
        { label: '住所を調べる (Nominatim)', onSelect: ({ lngLat }) => window.open(buildNominatimReverseUrl(lngLat), '_blank', 'noopener') },
        { label: 'Mapillaryで開く', onSelect: ({ lngLat }) => window.open(buildMapillaryUrl(lngLat, map.getZoom?.() ?? 18, map.getBearing?.() ?? 0), '_blank', 'noopener') },

        // タイル情報
        { label: 'コピー: XYZ/Quadkey', onSelect: async ({ lngLat }) => { const z = Math.round(map.getZoom?.() ?? 18); const {x,y} = lngLatToTile(lngLat.lng, lngLat.lat, z); const qk = tileToQuadkey(x,y,z); const s = `z=${z}, x=${x}, y=${y}, quadkey=${qk}`; try { await navigator.clipboard.writeText(s); } catch { alert(s); } } },

        // 計測
        { label: '距離計測: ここを起点/終点', onSelect: ({ lngLat }) => { const msg = toggleMeasureHere(lngLat); alert(msg); } },
    ];
}

/*
 * 使用例：
 * const detach = attachMapRightClickMenu({
 *   map: store.state.map01,
 *   items: [
 *     // 既存の Google 関連
 *     { label: 'Googleマップで開く', onSelect: ({ map, lngLat }) => window.open(buildGoogleMapsSearchUrl(lngLat),'_blank','noopener') },
 *     { label: 'ストリートビューで開く', onSelect: ({ map, lngLat }) => window.open(buildStreetViewUrl(lngLat, { heading: map.getBearing?.() ?? 0, pitch: (map.getPitch?.() ?? 0) - 20 }), '_blank', 'noopener') },
 *     // 実用メニューをまとめて展開
 *     ...buildUtilityMenuItems({ map, geojsonSourceId: 'click-circle-source' }),
 *   ]
 * });
 */


// ================================
// ピン削除ユーティリティ（直下/近傍/半径内）
// ================================

function haversineMeters(a, b) {
    const toRad = (d) => d * Math.PI / 180;
    const R = 6371_008.8; // meters base
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export async function removeFeatureByIdFromGeoJsonSource(map, sourceId, featureId, targetFeature) {
    const src = map.getSource(sourceId);
    if (!src || !src._data) return false;
    const fc = src._data.type === 'FeatureCollection' ? src._data : { type: 'FeatureCollection', features: [] };
    const before = fc.features.length;
    const next = { type: 'FeatureCollection', features: fc.features.filter(f => f?.properties?.id !== featureId) };
    src.setData(next);
    store.state.clickCircleGeojsonText = JSON.stringify(next)
    store.state.updatePermalinkFire = !store.state.updatePermalinkFire
    const key = targetFeature.geometry.coordinates.join()
    console.log(key)
    removeThumbnailMarkerByKey(key)
    featureCollectionAdd()
    markerAddAndRemove()
    return next.features.length < before;
}

export function removePointUnderCursor(map, point, sourceId) {
    // 直下の描画フィーチャから、指定 GeoJSON ソース由来の Point を優先して削除
    const feats = map.queryRenderedFeatures(point);
    const target = feats.find(f => f?.layer?.source === sourceId && f?.geometry?.type === 'Point');
    if (target) {
        const fid = target.properties?.id ?? target.id ?? null;
        if (fid != null) return removeFeatureByIdFromGeoJsonSource(map, sourceId, String(fid), target);
    }
    return false;
}

export function removeNearestPointFeature(map, sourceId, lngLat, maxMeters = 50) {
    const src = map.getSource(sourceId);
    if (!src || !src._data) return null;
    const fc = src._data.type === 'FeatureCollection' ? src._data : { type: 'FeatureCollection', features: [] };
    let best = { idx: -1, d: Infinity, id: null };
    for (let i = 0; i < (fc.features?.length || 0); i++) {
        const f = fc.features[i];
        if (!f || f.geometry?.type !== 'Point') continue;
        const [lng, lat] = f.geometry.coordinates || [];
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        const d = haversineMeters(lngLat, { lng, lat });
        if (d < best.d) best = { idx: i, d, id: f.properties?.id ?? null };
    }
    if (best.idx >= 0 && best.d <= maxMeters) {
        const next = { type: 'FeatureCollection', features: fc.features.slice() };
        next.features.splice(best.idx, 1);
        src.setData(next);
        return { removedId: best.id, distanceMeters: best.d };
    }
    return null;
}

export function removeAllPointsInRadius(map, sourceId, lngLat, radiusMeters = 50) {
    const src = map.getSource(sourceId);
    if (!src || !src._data) return 0;
    const fc = src._data.type === 'FeatureCollection' ? src._data : { type: 'FeatureCollection', features: [] };
    const kept = [];
    let removed = 0;
    for (const f of (fc.features || [])) {
        if (f?.geometry?.type !== 'Point') { kept.push(f); continue; }
        const [lng, lat] = f.geometry.coordinates || [];
        const d = haversineMeters(lngLat, { lng, lat });
        if (d <= radiusMeters) removed++; else kept.push(f);
    }
    src.setData({ type: 'FeatureCollection', features: kept });
    return removed;
}

// ---- ピン削除メニュー（個別ファクトリに変更：ESLint no-func-assign 回避）
// 以前は buildUtilityMenuItems を上書きしていましたが、関数再代入は
// ESLint(no-func-assign)に抵触するため、別ファクトリとして提供します。
export function buildPinDeleteMenuItems({ map, geojsonSourceId = 'click-circle-source', radiusMeters = 50 } = {}) {
    return [
        { label: 'ピン削除: 直下のピン', onSelect: ({ point }) => {
                const ok = removePointUnderCursor(map, point, geojsonSourceId);
                if (!ok) alert('直下に削除できる点が見つかりません');
            }
        },
        { label: `ピン削除: 近傍${radiusMeters}mで最も近い1つ`, onSelect: ({ lngLat }) => {
                const res = removeNearestPointFeature(map, geojsonSourceId, lngLat, radiusMeters);
                if (!res) alert(`近傍${radiusMeters}mにピンが見つかりません`);
            }
        },
        { label: `ピン削除: 半径${radiusMeters}mの全て`, onSelect: ({ lngLat }) => {
                const n = removeAllPointsInRadius(map, geojsonSourceId, lngLat, radiusMeters);
                alert(n > 0 ? `削除: ${n}件` : `半径${radiusMeters}m内にピンなし`);
            }
        }
    ];
}

/* 使用例（spread で合成）
 * const detach = attachMapRightClickMenu({
 *   map: store.state.map01,
 *   items: [
 *     // 好きな基本メニュー
 *     ...buildUtilityMenuItems({ map: store.state.map01, geojsonSourceId: 'click-circle-source' }),
 *     // ピン削除系を追加
 *     ...buildPinDeleteMenuItems({ map: store.state.map01, geojsonSourceId: 'click-circle-source', radiusMeters: 50 }),
 *   ]
 * });
 */

