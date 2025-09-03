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

