/*
 * MapLibre 右クリック / 長押し コンテキストメニュー（多層・ハイライト・プリセット対応 完全版）
 * - 右クリック / 長押し
 * - 多段サブメニューでも消えない（ホバー遷移でも安定）
 * - hover/active 可視化は「ハイライト専用オーバーレイ + filter」で強制表示
 * - Overpass / Rapid / iD / JOSM / Mapillary / Google / OSM ヘルパー
 * - ショートURLプリセット（トークン置換・Alt/Cmdでコピー・管理UIあり）
 * - プリセット追加後は oh3:rcm:refresh でメニューを開いたまま即反映
 *
 * 親の呼び出し例：
 *   const detach = attachMapRightClickMenu({
 *     map: store.state.map01,
 *     items: [
 *       {
 *         label: 'ショートURL',
 *         ...buildShortLinksMenu({
 *           links: [
 *             { label: '案件A', url: 'https://ex.example/s/{lat},{lng}?z={zoom}' },
 *             { label: 'Overpass±200m', url: 'https://overpass-turbo.eu/?Q=[out:json];(node({bbox});way({bbox});relation({bbox}););out body;>;out skel qt;#map={zoom}/{lat}/{lng}' }
 *           ],
 *           metersForBBox: 200,
 *           onSelectUrl: (url, ctx) => {
 *             // ここで自由に処理（window.open など）。メニュー側は何もしない
 *             // window.open(url, '_blank', 'noopener');
 *           }
 *         })
 *       },
 *       // 既存の項目…
 *     ]
 *   });
 *
 */

import store from '@/store'
import {featureCollectionAdd, markerAddAndRemove, removeThumbnailMarkerByKey} from '@/js/downLoad'
import {haptic} from '@/js/utils/haptics'

export default function attachMapRightClickMenu({
                                                    map,
                                                    items = [],
                                                    longPressMs = 800,
                                                    submenuDelay = 260,
                                                }) {
    if (!map) throw new Error('map が必要です');
    const container = map.getContainer();
    const canvas = map.getCanvas();

    // ネイティブコンテキストを止める
    const preventNative = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', preventNative);

    // ルートメニュー
    const menu = document.createElement('div');
    menu.className = 'ml-contextmenu';
    Object.assign(menu.style, {
        position: 'absolute',
        zIndex: '2147483647',
        minWidth: '180px',
        padding: '6px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,.18)',
        background: 'white',
        font: '14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        display: 'none'
    });
    container.style.position = container.style.position || 'relative';
    container.appendChild(menu);

    injectMenuStyles(container); // 強制色のCSS変数を注入

    // ====== 多層管理 ======
    const stacks = [];
    const hoverCloseTimers = [];
    const isTouchEnv = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function clearStacksFrom(depth) {
        for (let i = stacks.length - 1; i >= depth; i--) {
            const el = stacks[i];
            if (el && el.parentNode) el.parentNode.removeChild(el);
            stacks.pop();
        }
        for (let d = depth; d < hoverCloseTimers.length; d++) {
            if (hoverCloseTimers[d]) clearTimeout(hoverCloseTimers[d]);
            hoverCloseTimers[d] = null;
        }
        deactivateDepth(depth - 1);
    }
    function scheduleClose(depth) {
        if (hoverCloseTimers[depth]) clearTimeout(hoverCloseTimers[depth]);
        hoverCloseTimers[depth] = setTimeout(() => clearStacksFrom(depth + 1), submenuDelay);
    }
    function cancelClose(depth) {
        if (hoverCloseTimers[depth]) { clearTimeout(hoverCloseTimers[depth]); hoverCloseTimers[depth] = null; }
    }
    function cancelAncestors(depth) { for (let d = 0; d <= depth; d++) cancelClose(d); }
    function isIntoAnyDeeper(depth, target) {
        if (!target) return false;
        for (let d = depth + 1; d < stacks.length; d++) {
            const el = stacks[d];
            if (el && (el === target || el.contains(target))) return true;
        }
        return false;
    }
    function deactivateDepth(depth) {
        if (depth < 0) return;
        menu.querySelectorAll(`.ml-cm-row.is-active[data-depth="${depth}"]`).forEach(el => {
            el.classList.remove('is-active');
            clearHL(el);
        });
    }

    // ====== ハイライト層 ======
    function ensureHL(el) {
        if (el.__hl) return el.__hl;
        el.style.position = el.style.position || 'relative';
        const hl = document.createElement('span');
        hl.className = 'ml-cm-hl';
        Object.assign(hl.style, {
            position: 'absolute', inset: '0', borderRadius: 'inherit', pointerEvents: 'none',
            opacity: '0', transition: 'opacity 80ms linear', background: 'rgba(0,153,255,0.18)'
        });
        const bar = document.createElement('span');
        Object.assign(bar.style, {
            position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px',
            background: 'rgba(0,153,255,0.9)', opacity: '0', transition: 'opacity 80ms linear', pointerEvents: 'none',
            borderTopLeftRadius: 'inherit', borderBottomLeftRadius: 'inherit'
        });
        hl.appendChild(bar);
        el.prepend(hl);
        el.__hl = { hl, bar };
        return el.__hl;
    }
    function applyHL(el, state) {
        const {hl, bar} = ensureHL(el);
        if (state === 'hover') {
            hl.style.opacity = '1';
            hl.style.background = getVar(menu, '--ml-hover', 'rgba(0,153,255,0.18)');
            bar.style.opacity = '.75';
            el.style.setProperty('filter', 'brightness(0.97)', 'important');
        } else if (state === 'active') {
            hl.style.opacity = '1';
            hl.style.background = getVar(menu, '--ml-active', 'rgba(0,153,255,0.28)');
            bar.style.opacity = '1';
            el.style.setProperty('filter', 'brightness(0.94)', 'important');
        }
    }
    function clearHL(el) {
        if (!el.__hl) return;
        el.__hl.hl.style.opacity = '0';
        el.__hl.bar.style.opacity = '0';
        el.style.removeProperty('filter');
    }
    function getVar(rootEl, name, fallback) {
        try { const cs = getComputedStyle(rootEl); const v = cs.getPropertyValue(name).trim(); return v || fallback; } catch { return fallback; }
    }

    // ====== 行/ボタン ======
    function makeSeparator() {
        const hr = document.createElement('div');
        Object.assign(hr.style, { height: '1px', background: 'rgba(0,0,0,.08)', margin: '4px 0' });
        return hr;
    }

    // 動的アイテム対応
    const isSeparator = (it) => it === '-' || it?.type === 'separator';
    const hasChildren = (it) => typeof it?.items === 'function' || Array.isArray(it?.items) || Array.isArray(it?.children);
    const childrenOf  = (it, ctx) => {
        if (typeof it?.items === 'function') { try { return (it.items(ctx) || []).filter(Boolean); } catch { return []; } }
        return (it?.items || it?.children || []).filter(Boolean);
    };

    function createLeafButton(it, ctx) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = it.label ?? '項目';
        Object.assign(btn.style, {
            display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
            border: 'none', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap'
        });
        btn.className = 'ml-cm-btn';
        ensureHL(btn);

        btn.addEventListener('mouseenter', () => applyHL(btn, 'hover'));
        btn.addEventListener('mouseleave', () => clearHL(btn));
        btn.addEventListener('mousedown', () => applyHL(btn, 'active'));
        btn.addEventListener('mouseup',   () => applyHL(btn, 'hover'));
        btn.addEventListener('blur', () => clearHL(btn));

        btn.onclick = (e) => {
            if (!it.keepOpen) hide(); // 管理UIは閉じない
            try { it.onSelect?.({ map, lngLat: ctx.lngLat, point: ctx.point, originalEvent: e }); } catch (err) { console.error(err); }
        };
        return btn;
    }

    function createRowBase(depth) {
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '10px 12px', border: 'none', cursor: 'pointer', userSelect: 'none',
            whiteSpace: 'nowrap', background: 'transparent'
        });
        row.className = 'ml-cm-row';
        row.dataset.depth = String(depth);
        ensureHL(row);

        row.addEventListener('mouseenter', () => { if (!isTouchEnv) { applyHL(row, 'hover'); cancelClose(depth); } });
        row.addEventListener('mouseleave', (e) => {
            if (isTouchEnv) return;
            const rt = e?.relatedTarget || null;
            if (isIntoAnyDeeper(Number(row.dataset.depth || 0), rt)) return;
            if (!row.classList.contains('is-active')) clearHL(row);
            scheduleClose(Number(row.dataset.depth || 0));
        });
        row.addEventListener('mousedown', () => applyHL(row, 'active'));
        row.addEventListener('mouseup',   () => applyHL(row, 'hover'));
        row.addEventListener('blur', () => { if (!row.classList.contains('is-active')) clearHL(row); });

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
                const row = createRowBase(depth);
                const label = document.createElement('div');
                label.textContent = it.label ?? `項目 ${i+1}`;
                label.style.flex = '1';
                const arrow = document.createElement('div');
                arrow.textContent = '›'; arrow.style.opacity = '.5';
                row.appendChild(label); row.appendChild(arrow);

                const openSub = () => {
                    cancelClose(depth);
                    clearStacksFrom(depth + 1);
                    deactivateDepth(depth);
                    row.classList.add('is-active');
                    applyHL(row, 'active');

                    const sub = createMenuList(childrenOf(it, ctx), ctx, depth + 1);
                    sub.addEventListener('mouseenter', () => cancelAncestors(depth));
                    sub.addEventListener('mouseleave', (e) => {
                        if (isTouchEnv) return;
                        const rt = e?.relatedTarget || null;
                        if (isIntoAnyDeeper(depth, rt)) return;
                        scheduleClose(depth);
                    });
                    menu.appendChild(sub);
                    positionSubmenu(row, sub);
                    stacks.push(sub);
                };

                // PC: hoverで開く / タッチ: clickトグル
                row.addEventListener('mouseenter', () => { if (!isTouchEnv) { openSub(); } });
                row.addEventListener('click', (e) => {
                    const last = stacks[stacks.length - 1];
                    const lastDepth = last ? Number(last.dataset.depth) : -1;
                    if (last && lastDepth === depth + 1) {
                        clearStacksFrom(depth + 1);
                        row.classList.remove('is-active');
                        clearHL(row);
                    } else {
                        openSub();
                    }
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
        const rParent = parentRow.getBoundingClientRect();
        const rMenu   = menu.getBoundingClientRect();
        const rCont   = container.getBoundingClientRect();

        let left = rParent.right - rMenu.left - 2;
        let top  = rParent.top   - rMenu.top  - 6;

        subEl.style.left = left + 'px';
        subEl.style.top  = top  + 'px';

        const rSub = subEl.getBoundingClientRect();
        if (rSub.right > rCont.right - 8) {
            left = rParent.left - rMenu.left - rSub.width + 2;
            subEl.style.left = left + 'px';
        }
        if (rSub.bottom > rCont.bottom - 8) {
            top = Math.max(6, rCont.bottom - rMenu.top - rSub.height - 6);
            subEl.style.top = top + 'px';
        }
    }

    // ==== 動的リフレッシュ対応 ====
    let __last = { px: null, py: null, ctx: null };

    function buildMenu(ctx) {
        menu.innerHTML = '';
        clearStacksFrom(0);
        const root = createMenuList(items, ctx, 0);
        menu.appendChild(root);
        stacks.push(root);
    }

    function refreshMenuNow() {
        if (menu.style.display !== 'none' && __last.ctx) {
            buildMenu(__last.ctx);
        }
    }
    container.addEventListener('oh3:rcm:refresh', () => refreshMenuNow());

    function show(px, py, ctx) {
        if (store.state.isIframe) return;
        __last = { px, py, ctx };
        buildMenu(ctx);
        menu.style.display = 'block';
        menu.style.left = px + 8 + 'px';
        menu.style.top  = py + 8 + 'px';
        const rect  = menu.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        let left = px + 8; let top = py + 8;
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

    // PC: 右クリック
    function onContextMenu(e) {
        e.preventDefault();
        const { x, y } = e.point;
        show(x, y, { lngLat: e.lngLat, point: e.point });
    }
    map.on('contextmenu', onContextMenu);

    // タッチ: 長押し
    let pressTimer = null; let pressStartPoint = null;
    function onPointerDown(ev) {
        if (ev.pointerType === 'mouse') return;
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

    // ====== スタイル注入 ======
    function injectMenuStyles(rootEl) {
        const root = (rootEl && rootEl.getRootNode) ? rootEl.getRootNode() : document;
        const id = root === document ? 'ml-cm-style' : 'ml-cm-style-' + Math.random().toString(36).slice(2,8);
        if ((root.getElementById && root.getElementById(id)) || (root.querySelector && root.querySelector('style[data-ml-cm-style]'))) return;

        const style = document.createElement('style');
        style.setAttribute('data-ml-cm-style', '1');
        style.id = id;
        style.textContent = `
      .ml-contextmenu { --ml-hover: rgba(0,153,255,0.18); --ml-active: rgba(0,153,255,0.28); }
      @media (prefers-color-scheme: dark) {
        .ml-contextmenu { --ml-hover: rgba(0,153,255,0.22); --ml-active: rgba(0,153,255,0.36); }
      }
    `;
        const headLike = (root.head ?? root);
        (headLike.appendChild ? headLike : document.head).appendChild(style);
    }
}

/* ============================== */
/* Google / OSM / Rapid / Overpass / JOSM / Mapillary ヘルパー */
/* ============================== */

export function buildGoogleMapsUrl(lngLat, opts = {}) {
    const { zoom = 18 } = opts;
    const url = new URL('https://www.google.com/maps/@');
    url.searchParams.set('api', '1');
    url.searchParams.set('map_action', 'map');
    url.searchParams.set('center', `${lngLat.lat},${lngLat.lng}`);
    url.searchParams.set('zoom', String(Math.round(zoom)));
    return url.toString();
}
export function buildGoogleMapsSearchUrl(lngLat) {
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', `${lngLat.lat},${lngLat.lng}`);
    return url.toString();
}
export function buildStreetViewUrl(lngLat, opts = {}) {
    const heading = Number.isFinite(opts.heading) ? opts.heading : 0;
    const pitch = Number.isFinite(opts.pitch) ? opts.pitch : 0;
    const fov = Number.isFinite(opts.fov) ? opts.fov : 90;
    const normHeading = ((heading % 360) + 360) % 360;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const url = new URL('https://www.google.com/maps/@');
    url.searchParams.set('api', '1');
    url.searchParams.set('map_action', 'pano');
    url.searchParams.set('viewpoint', `${lngLat.lat},${lngLat.lng}`);
    url.searchParams.set('heading', String(Math.round(normHeading)));
    url.searchParams.set('pitch', String(Math.round(clamp(pitch, -90, 90))));
    url.searchParams.set('fov', String(Math.round(clamp(fov, 10, 120))));
    return url.toString();
}

export function buildOsmUrl(lngLat, zoom = 18) {
    return `https://www.openstreetmap.org/#map=${Math.round(zoom)}/${lngLat.lat}/${lngLat.lng}`;
}
export function buildOsmEditorUrl(lngLat, { zoom = 19, editor = 'id' } = {}) {
    const z = Math.round(zoom);
    const e = (editor === 'rapid') ? 'rapid' : 'id';
    return `https://www.openstreetmap.org/edit?editor=${e}#map=${z}/${lngLat.lat}/${lngLat.lng}`;
}
export function buildRapidUrl(lngLat, { zoom = 19 } = {}) {
    const z = Math.round(zoom);
    return `https://rapideditor.org/rapid#map=${z}/${lngLat.lat}/${lngLat.lng}`;
}
export function buildRapidMapillaryUrl(lngLat, { zoom = 19 } = {}) {
    const z = Math.round(zoom);
    return `https://rapideditor.org/rapid-mapillary-features#map=${z}/${lngLat.lat}/${lngLat.lng}`;
}
export function buildJosmRemoteUrlByCenter(lngLat, radiusMeters = 200) {
    const [minLng, minLat, maxLng, maxLat] = buildBBoxAround(lngLat, radiusMeters);
    return `http://127.0.0.1:8111/load_and_zoom?left=${minLng}&right=${maxLng}&top=${maxLat}&bottom=${minLat}`;
}

export function buildOverpassTurboUrl(lngLat, { meters = 100, zoom = 19, feature = 'all' } = {}) {
    const [minLng, minLat, maxLng, maxLat] = buildBBoxAround(lngLat, meters);
    const swne = `${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)}`; // S,W,N,E
    const lat = lngLat.lat.toFixed(6);
    const lon = lngLat.lng.toFixed(6);
    const z   = Math.round(zoom);

    let query;
    switch (feature) {
        case 'highway':
            query = `[out:json][timeout:25];\nway[highway](${swne});\nout body; >; out skel qt;`;
            break;
        case 'amenity':
            query = `[out:json][timeout:25];\nnode[amenity](${swne});\nout;`;
            break;
        default:
            query = `[out:json][timeout:25];\n(node(${swne});way(${swne});relation(${swne}););\nout body; >; out skel qt;`;
    }

    const url = new URL('https://overpass-turbo.eu/');
    url.searchParams.set('Q', query);
    url.searchParams.set('C', `${lat};${lon};${z}`);
    url.hash = `map=${z}/${lat}/${lon}`;
    return url.toString();
}

export async function openOrCopyOverpass({ map, lngLat, meters, feature = 'all', originalEvent }) {
    const ev = originalEvent;
    if (ev && (ev.altKey || ev.metaKey)) {
        const [minLng, minLat, maxLng, maxLat] = buildBBoxAround(lngLat, meters);
        let q;
        if (feature === 'highway') {
            q = `[out:json][timeout:25];\nway[highway](${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)});\nout body; >; out skel qt;`;
        } else if (feature === 'amenity') {
            q = `[out:json][timeout:25];\nnode[amenity](${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)});\nout;`;
        } else {
            q = `[out:json][timeout:25];\n(node(${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)});\n way(${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)});\n relation(${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)}););\nout body; >; out skel qt;`;
        }
        await cmCopyToClipboard(q);
    } else {
        const url = buildOverpassTurboUrl(lngLat, { meters, zoom: map.getZoom?.() ?? 19, feature });
        window.open(url, '_blank', 'noopener');
    }
}

/* ============================== */
/* 汎用ユーティリティ */
/* ============================== */

export function toFixedCoord(lngLat, n = 8) { return `${lngLat.lng.toFixed(n)}, ${lngLat.lat.toFixed(n)}`; }
export function toDMS(lngLat) {
    const toD = (deg, pos, neg) => {
        const s = deg >= 0 ? 1 : -1; const a = Math.abs(deg);
        const d = Math.floor(a); const mFloat = (a - d) * 60; const m = Math.floor(mFloat);
        const sec = (mFloat - m) * 60; const hemi = s >= 0 ? pos : neg;
        return `${d}°${m}'${sec.toFixed(2)}"${hemi}`;
    };
    return `${toD(lngLat.lat, 'N', 'S')} ${toD(lngLat.lng, 'E', 'W')}`;
}
export function toGeoJSONPointString(lngLat) {
    return JSON.stringify({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] } });
}
export function toWKTPoint(lngLat) { return `POINT(${lngLat.lng} ${lngLat.lat})`; }

export function buildBBoxAround(lngLat, meters = 100) {
    const latRad = lngLat.lat * Math.PI / 180;
    const dLat = meters / 111_320; // lat 度換算
    const dLng = meters / (111_320 * Math.cos(latRad));
    return [lngLat.lng - dLng, lngLat.lat - dLat, lngLat.lng + dLng, lngLat.lat + dLat];
}

export function lngLatToTile(lng, lat, z) {
    const latRad = lat * Math.PI / 180, n = 2 ** z;
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y, z };
}
export function tileToQuadkey(x, y, z) {
    let quad = '';
    for (let i = z; i > 0; i--) {
        let digit = 0; const mask = 1 << (i - 1);
        if ((x & mask) !== 0) digit += 1;
        if ((y & mask) !== 0) digit += 2;
        quad += String(digit);
    }
    return quad;
}

export function pushFeatureToGeoJsonSource(map, sourceId, feature) {
    const now = new Date();
    const hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
    feature.properties.label = `${hours}:${minutes}:${seconds}`;
    const src = map.getSource(sourceId);
    if (!src || !src.setData) return alert(`GeoJSONソース '${sourceId}' が見つかりません`);
    const data = (src._data && src._data.type === 'FeatureCollection') ? src._data : { type: 'FeatureCollection', features: [] };
    const next = { type: 'FeatureCollection', features: [...(data.features || []), feature] };
    src.setData(next);
    store.state.clickCircleGeojsonText = JSON.stringify(next)
    store.state.updatePermalinkFire = !store.state.updatePermalinkFire
    if (!store.state.isUsingServerGeojson) { featureCollectionAdd() }
    markerAddAndRemove()
}
export function pointFeature(lngLat, props = {}) {
    return { type: 'Feature', properties: { id: String(Date.now()), ...props }, geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] } };
}
export function circlePolygonFeature(lngLat, radiusMeters = 50, steps = 64, props = {}) {
    const latRad = lngLat.lat * Math.PI / 180;
    const dLat = radiusMeters / 111_320;
    const dLngCoeff = 1 / (111_320 * Math.cos(latRad));
    const coords = [];
    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const dx = Math.cos(t) * radiusMeters * dLngCoeff;
        const dy = Math.sin(t) * dLat;
        coords.push([lngLat.lng + dx, lngLat.lat + dy]);
    }
    coords.push(coords[0]);
    return { type: 'Feature', properties: { id: String(Date.now()), ...props }, geometry: { type: 'Polygon', coordinates: [coords] } };
}

// 計測
let __measureStart = null;
export function toggleMeasureHere(lngLat) {
    if (!__measureStart) { __measureStart = lngLat; return '計測開始: 次の点で距離を表示'; }
    const R = 6371_008.8;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lngLat.lat - __measureStart.lat);
    const dLng = toRad(lngLat.lng - __measureStart.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(__measureStart.lat))*Math.cos(toRad(lngLat.lat))*Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const meters = R * 1000 * c;
    __measureStart = null;
    return meters >= 1000 ? `約${(meters/1000).toFixed(2)} km` : `約${meters.toFixed(1)} m`;
}

// クリップボード
export async function cmCopyToClipboard(text, { notify = true } = {}) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.setAttribute('readonly', '');
            document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
            const ok = document.execCommand && document.execCommand('copy');
            document.body.removeChild(ta);
            if (!ok) throw new Error('execCommand copy failed');
        }
        if (notify) alert('クリップボードにコピーしました。');
    } catch {
        alert(text);
    }
}

/* ============================== */
/* ピン削除ユーティリティ */
/* ============================== */
function haversineMeters(a, b) {
    const toRad = (d) => d * Math.PI / 180; const R = 6371_008.8;
    const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
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
    removeThumbnailMarkerByKey(key)
    featureCollectionAdd()
    markerAddAndRemove()
    return next.features.length < before;
}
export function removePointUnderCursor(map, point, sourceId) {
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
    const kept = []; let removed = 0;
    for (const f of (fc.features || [])) {
        if (f?.geometry?.type !== 'Point') { kept.push(f); continue; }
        const [lng, lat] = f.geometry.coordinates || [];
        const d = haversineMeters(lngLat, { lng, lat });
        if (d <= radiusMeters) removed++; else kept.push(f);
    }
    src.setData({ type: 'FeatureCollection', features: kept });
    return removed;
}

/* ============================== */
/* ショートURL プリセット（動的・即時反映） */
/* ============================== */
const SHORTLINKS_KEY = 'oh3.shortlinks.v1';

export function resolveShortLink(template, { lngLat, map, meters = 120 } = {}) {
    const z = Math.round(map?.getZoom?.() ?? 19);
    const [minLng, minLat, maxLng, maxLat] = buildBBoxAround(lngLat, meters);
    return String(template)
        .replaceAll('{lat}', lngLat.lat.toFixed(6))
        .replaceAll('{lng}', lngLat.lng.toFixed(6))
        .replaceAll('{zoom}', String(z))
        .replaceAll('{bbox}', `${minLat.toFixed(6)},${minLng.toFixed(6)},${maxLat.toFixed(6)},${maxLng.toFixed(6)}`)
        .replaceAll('{minLat}', minLat.toFixed(6))
        .replaceAll('{minLng}', minLng.toFixed(6))
        .replaceAll('{maxLat}', maxLat.toFixed(6))
        .replaceAll('{maxLng}', maxLng.toFixed(6));
}
export function loadShortLinks() {
    try { return JSON.parse(localStorage.getItem(SHORTLINKS_KEY) || '[]'); } catch { return []; }
}
export function saveShortLinks(arr) { localStorage.setItem(SHORTLINKS_KEY, JSON.stringify(arr || [])); }
export function addShortLink(link) { const arr = loadShortLinks(); arr.push({ label: link.label, url: link.url }); saveShortLinks(arr); }
export function clearShortLinks() { localStorage.removeItem(SHORTLINKS_KEY); }

export function removeShortLinkByIndex(idx) {
    const arr = loadShortLinks();
    if (!Array.isArray(arr)) return;
    const i = Number(idx);
    if (!Number.isFinite(i) || i < 0 || i >= arr.length) return;
    arr.splice(i, 1);
    saveShortLinks(arr);
}
export function removeShortLinkByLabel(label) {
    const arr = loadShortLinks();
    const i = arr.findIndex((x) => (x?.label || x?.url) === label);
    if (i >= 0) {
        arr.splice(i, 1);
        saveShortLinks(arr);
    }
}

export function buildShortLinksMenu({
                                        title = '簡易でURL記憶',
                                        links = [],
                                        metersForBBox = 120,
                                        onSelectUrl = null,
                                        allowManage = true,
                                    } = {}) {
    const clickHandler = (meta) => (ctx) => {
        const { map, lngLat, point, originalEvent } = ctx;
        const url = resolveShortLink(meta.url, { lngLat, map, meters: metersForBBox });

        // Alt/Cmd でコピー
        if (originalEvent && (originalEvent.altKey || originalEvent.metaKey)) { cmCopyToClipboard(url); return; }

        // 呼び出し側で挙動を差し替えたい場合
        if (typeof onSelectUrl === 'function') { onSelectUrl(url, { map, lngLat, point, meta, originalEvent }); return; }

        // 既定: 新しいタブで開く
        try { window.open(url, '_blank', 'noopener'); }
        catch (e) { console.warn('shorturl open failed', e); }
    };

    const dynamicItems = (ctx) => {
        const saved = loadShortLinks();
        const merged = [ ...links.filter(Boolean), ...saved.filter(Boolean) ];

        const items = merged.map((meta) => ({ label: meta.label || meta.url, onSelect: clickHandler(meta) }));

        if (allowManage) {
            items.push({ type: 'separator' });
            items.push({
                label: '簡易でURL記憶',
                keepOpen: true,
                onSelect: ({ map }) => {
                    // OH3のパーマリンクを最新化 → 200ms 待ってから自動入力
                    try { store.state.updatePermalinkFire = !store.state.updatePermalinkFire; } catch {}
                    setTimeout(() => {
                        const cur = (store?.state?.permalinkUrl || store?.state?.permalink || window?.location?.href || '');
                        const label = prompt('表示名を入力してください', 'OH3リンク');
                        if (!label) return;
                        // const url = prompt('OH3のURLを入力（自動入力済み。必要なら編集）', cur);
                        // if (!url) return;
                        // addShortLink({ label, url });
                        addShortLink({ label, url: cur });
                        try { map.getContainer().dispatchEvent(new CustomEvent('oh3:rcm:refresh')); } catch {}
                    }, 200);
                }
            });
            // items.push({ label: 'エクスポート（JSONをコピー）', keepOpen: true, onSelect: async () => { const json = JSON.stringify(loadShortLinks(), null, 2); await cmCopyToClipboard(json); } });
            // items.push({ label: 'インポート（JSON貼り付け）', keepOpen: true, onSelect: async ({ map }) => {
            //         const txt = prompt('保存したJSONを貼り付けてください'); if (!txt) return;
            //         try { const arr = JSON.parse(txt); saveShortLinks(arr); } catch { return alert('JSONの形式が不正です'); }
            //         try { map.getContainer().dispatchEvent(new CustomEvent('oh3:rcm:refresh')); } catch {}
            //     }});
            items.push({
                label: 'URLを個別に削除',
                keepOpen: true,
                items: () => {
                    const saved = loadShortLinks();
                    if (!saved.length) return [{ label: '（保存済みなし）', onSelect: () => {} }];
                    return saved.map((meta, idx) => ({
                        label: (meta.label || meta.url) + ' を削除',
                        keepOpen: true,
                        onSelect: ({ map }) => {
                            if (!confirm(`「${meta.label || meta.url}」を削除しますか？`)) return;
                            removeShortLinkByIndex(idx);
                            try { map.getContainer().dispatchEvent(new CustomEvent('oh3:rcm:refresh')); } catch {}
                        }
                    }));
                }
            });
            items.push({
                label: 'URL全削除',
                keepOpen: true,
                onSelect: ({ map }) => {
                    if (!confirm('保存済みのショートURLをすべて削除しますか？')) return;
                    clearShortLinks();
                    try { map.getContainer().dispatchEvent(new CustomEvent('oh3:rcm:refresh')); } catch {}
                }
            });
        }

        return items;
    };

    return { label: title, items: dynamicItems };
}

/* =============================== */
/* 可視ベクター地物 → GeoJSON（復活・互換API） */
/* =============================== */
// 以前の exportVisibleGeoJSON_fromMap01 と同じ関数名・引数で提供します。
// 内部のユーティリティ名は重複回避のため _geo_* に変更しています。

const GEOEXPORT_LAYER_BLOCKLIST = [
    'zones-layer',
];

const GEOEXPORT_DEFAULT_EXCLUDE_PATTERNS = [
    /^background$/i,
    /basemap/i,
    /osm/i,
    /openmaptiles/i,
    /openstreetmap/i,
    /gsi/i,
    /std/i,
    /seamless/i,
    /hillshade/i,
    /terrain/i,
    /contour/i,
    /water/i,
    /road/i,
    /label/i,
    /poi/i,
    /transit/i,
    /building/i,
    /satellite/i,
];

function _geo_isVectorType(t) {
    return t === 'fill' || t === 'line' || t === 'circle' || t === 'symbol' || t === 'fill-extrusion';
}
function _geo_isVisible(map, id) {
    const v = map.getLayoutProperty(id, 'visibility');
    return v == null || v === 'visible';
}
function _geo_isExcluded(id, includeExcluded) {
    if (includeExcluded) return false;
    if (!id) return false;
    if (id.includes('-vector-')) return true;           // 「-vector-」系は既定で除外
    if (GEOEXPORT_LAYER_BLOCKLIST.includes(id)) return true;
    return GEOEXPORT_DEFAULT_EXCLUDE_PATTERNS.some(re => re.test(id));
}
function _geo_featKey(f) {
    const src = f.source || '';
    const sl  = f.sourceLayer || '';
    return `${src}|${sl}|${JSON.stringify(f.geometry)}`;
}
function _geo_nowStr() {
    const d = new Date(), p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function _geo_baseGeomType(t) {
    if (!t) return null;
    return t.startsWith('Multi') ? t.slice(5) : t;
}
function _geo_combinedType(base) {
    if (!base) return null;
    return base === 'GeometryCollection' ? 'GeometryCollection' : ('Multi' + base);
}
function _geo_combineById(features) {
    const groups = new Map();
    for (const f of features) {
        const gid = (f.properties?.id ?? f.properties?._id ?? f.id);
        if (gid == null) continue;
        if (!groups.has(gid)) groups.set(gid, []);
        groups.get(gid).push(f);
    }
    for (const [, arr] of groups) {
        if (arr.length <= 1) continue;
        const base = _geo_baseGeomType(arr[0].geometry?.type);
        if (!base) continue;
        const combinedType = _geo_combinedType(base);
        const acc = [];
        for (const f of arr) {
            const g = f.geometry;
            if (!g || !g.type) continue;
            const t = _geo_baseGeomType(g.type);
            if (t !== base) continue;
            if (g.type.startsWith('Multi')) {
                for (const part of g.coordinates) acc.push(part);
            } else {
                acc.push(g.coordinates);
            }
        }
        if (acc.length >= 2) {
            arr[0].geometry = { type: combinedType, coordinates: acc };
            for (let i = 1; i < arr.length; i++) arr[i]._drop = true;
        }
    }
    return features.filter(f => !f._drop);
}

export function exportVisibleGeoJSON_fromMap01(opts = {}) {
    const includeExcluded = !!opts.includeExcluded; // true で除外OFF（ベースも含めて出力）
    const map = store.state.map01;
    if (!map) { alert('store.state.map01 が見つかりません'); return; }
    const style = map.getStyle?.();
    if (!style || !Array.isArray(style.layers)) { alert('スタイルが未ロードです'); return; }

    const targetLayerIds = style.layers
        .filter(l => _geo_isVectorType(l.type) && _geo_isVisible(map, l.id) && !_geo_isExcluded(l.id, includeExcluded))
        .map(l => l.id);

    if (!targetLayerIds.length) { alert('対象レイヤがありません。（除外設定により全て除外されている可能性があります）'); return; }

    const w = map.getContainer().clientWidth, h = map.getContainer().clientHeight;
    const feats = map.queryRenderedFeatures([[0,0],[w,h]], { layers: targetLayerIds });
    if (!feats.length) { alert('画面内に出力対象の地物がありません。'); return; }

    const seen = new Set();
    const features = [];
    for (const f of feats) {
        const key = _geo_featKey(f);
        if (seen.has(key)) continue;
        seen.add(key);

        const props = f.properties ? { ...f.properties } : {};
        props.__layer = f.layer?.id;
        props.__source = f.source;
        props.__sourceLayer = f.sourceLayer;

        features.push({
            type: 'Feature',
            geometry: JSON.parse(JSON.stringify(f.geometry)),
            properties: props,
        });
    }

    const combinedFeatures = _geo_combineById(features);
    const fc = { type: 'FeatureCollection', features: combinedFeatures };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oh3_visible_${_geo_nowStr()}.geojson`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

