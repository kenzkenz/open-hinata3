/*
 * OH3専用: Vuetify(MDI)アイコン → MapLibreシンボル一括登録ヘルパー (JS)
 * 2025-09
 *
 * 目的:
 *  - Vuetifyで使う MDI の SVGパス(@mdi/js)を、色/サイズ/ストローク付きで Canvas 描画 → map.addImage 登録
 *  - 命名規則・キャッシュ・一括登録(色×サイズ×アイコン名の直積)に対応
 *  - Retina対応(pixelRatio)、iPhone/Safari を含む主要ブラウザで安定
 *
 * 注意:
 *  - 生成アイコンは通常RGBA画像です。SDFではないため 'icon-color' での色替えはできません
 *    (色を変える場合は別名で再登録)。
 *  - @mdi/js の動的 import はバンドルサイズを増やす可能性があります。必要数が少ない場合は
 *    個別 import を推奨 (例: `import { mdiMapMarker } from '@mdi/js'`)。
 */

// ========================= 設定(デフォルト) =========================
export const OhMdiDefaults = {
    prefix: 'oh-mdi',
    sizes: [16, 20, 24, 28, 32],
    palette: { // Vuetifyっぽい色名を用意
        primary: '#1976D2',
        secondary: '#424242',
        success: '#2E7D32',
        info: '#0288D1',
        warning: '#F9A825',
        error: '#D32F2F',
        black: '#000000',
        white: '#FFFFFF',
        gray: '#9E9E9E',
    },
    padding: 2,
    strokeWidth: 0,        // 0で無効 (見やすさが必要なら 1〜2 推奨)
    strokeColor: '#000000',
    anchor: 'bottom',
};

// ========================= 内部ユーティリティ =========================
const __mdiIconCache = new Map(); // key → true (二重生成防止)

function colorValue(input, palette) {
    if (!input) return palette.primary;
    if (/^#|^rgb\(|^hsl\(/i.test(input)) return input; // 直接色指定
    return palette[input] || input; // 名前→HEX/そのまま
}

export function makeIconId({ prefix = OhMdiDefaults.prefix, base, size, colorName, strokeWidth = 0 }) {
    const sw = strokeWidth ? `-sw${strokeWidth}` : '';
    return `${prefix}-${base}-${size}-${colorName}${sw}`;
}

async function svgPathToCanvas({ d, size, color, padding = 2, rotate = 0, strokeWidth = 0, strokeColor = '#000', pixelRatio }) {
    // 改良版: まず Path2D(ベクタ直接描画) を試し、失敗時のみ SVG→画像デコードにフォールバック。
    const dpr = Math.max(1, Math.floor(pixelRatio || window.devicePixelRatio || 1));
    const W = Math.ceil((size + padding * 2) * dpr);
    const H = W;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 1) Path2D で直接描画（最速・安定。iOS/Safari でも createImageBitmap 不要）
    try {
        const s = (size * dpr) / 24; // MDIは 24x24 基準
        ctx.save();
        // 余白オフセット
        ctx.translate(padding * dpr, padding * dpr);
        // 中心(12,12)回りに回転
        ctx.translate(12 * s, 12 * s);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.translate(-12 * s, -12 * s);
        // スケール
        ctx.scale(s, s);

        const p = new Path2D(d);
        ctx.fillStyle = color;
        ctx.fill(p);

        if (strokeWidth > 0) {
            ctx.strokeStyle = strokeColor;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            // 現在座標系は 24 ベースに s 倍されている → 目標px幅を座標系幅に変換
            ctx.lineWidth = (strokeWidth * dpr) / s;
            ctx.stroke(p);
        }
        ctx.restore();

        return { canvas, dpr };
    } catch (err) {
        console.warn('[svgPathToCanvas] Path2D fallback → 画像デコードに切替', err);
    }

    // 2) 画像デコード(フォールバック)。まず createImageBitmap、ダメなら <img>.decode()
    const svgSize = size * dpr;
    const strokeAttr = strokeWidth > 0 ? ` stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"` : '';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
` +
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${svgSize}" height="${svgSize}" shape-rendering="geometricPrecision">` +
        `<path fill="${color}" d="${d}" transform="rotate(${rotate},12,12)"${strokeAttr}/>` +
        `</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });

    // 2-a) createImageBitmap（Chromium系は高速）
    try {
        const bmp = await createImageBitmap(blob);
        ctx.drawImage(bmp, padding * dpr, padding * dpr);
        return { canvas, dpr };
    } catch (e1) {
        console.warn('[svgPathToCanvas] createImageBitmap 失敗 → HTMLImageElement.decode へ', e1);
    }

    // 2-b) HTMLImageElement.decode（iOS Safari で安定）
    try {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.decoding = 'sync';
        img.crossOrigin = 'anonymous';
        img.src = url;
        // decode() が無い/失敗する環境は load イベントで代替
        if (img.decode) {
            await img.decode();
        } else {
            await new Promise((res, rej) => {
                img.onload = () => res();
                img.onerror = rej;
            });
        }
        ctx.drawImage(img, padding * dpr, padding * dpr);
        URL.revokeObjectURL(url);
        return { canvas, dpr };
    } catch (e2) {
        console.error('[svgPathToCanvas] 最終フォールバックも失敗: 画像をデコードできません', e2);
        throw e2;
    }
}

// ========================= 単体登録 =========================
/**
 * MDIパス(d)を MapLibre のアイコンとして登録
 * @param {maplibregl.Map} map
 * @param {Object} o
 * @param {string} o.name  addImage用の一意名
 * @param {string} o.path  @mdi/js から得たSVGパス(d)
 * @param {number} [o.size=28]
 * @param {string} [o.color="#1976D2"] // HEX or rgb()/hsl() or パレット名
 * @param {number} [o.padding=2]
 * @param {number} [o.rotate=0]
 * @param {number} [o.strokeWidth=0]
 * @param {string} [o.strokeColor="#000000"]
 * @param {number} [o.pixelRatio] // 指定なければ devicePixelRatio
 */
export async function registerMdiIcon(map, o) {
    const {
        name, path, size = 28, color = OhMdiDefaults.palette.primary,
        padding = OhMdiDefaults.padding, rotate = 0,
        strokeWidth = OhMdiDefaults.strokeWidth, strokeColor = OhMdiDefaults.strokeColor,
        pixelRatio,
    } = o || {};
    if (!map || !name || !path) throw new Error('map, name, path は必須です');

    const dpr = Math.max(1, Math.floor(pixelRatio || window.devicePixelRatio || 1));
    const cacheKey = `${name}|${size}|${color}|${padding}|${rotate}|${strokeWidth}|${strokeColor}|${dpr}`;
    if (__mdiIconCache.has(cacheKey) || map.hasImage(name)) return name;

    const { canvas, dpr: usedDpr } = await svgPathToCanvas({ d: path, size, color, padding, rotate, strokeWidth, strokeColor, pixelRatio });
    // MapLibre v5 で稀に Canvas 直渡しが data長チェックで誤判定される事例に対処
// 常に明示の {width,height,data} 形式で渡す
    const ctx2 = canvas.getContext('2d');
    const w2 = canvas.width | 0;
    const h2 = canvas.height | 0;
    if (!w2 || !h2) throw new Error(`[registerMdiIcon] canvas size is zero (w=${w2}, h=${h2})`);
    const imgData = ctx2.getImageData(0, 0, w2, h2);
    map.addImage(name, { width: w2, height: h2, data: imgData.data }, { pixelRatio: usedDpr });
    __mdiIconCache.set(cacheKey, true);
    return name;
}

// ========================= @mdi/js から名前で取得(任意) =========================
async function loadMdiPathByName(mdiExportName) {
    // 動的 import: ビルドに全アイコンが入る可能性あり。必要に応じて個別 import に切替推奨。
    const mod = await import(/* @vite-ignore */ '@mdi/js');
    const d = mod?.[mdiExportName];
    if (!d) throw new Error(`@mdi/js に '${mdiExportName}' が見つかりません`);
    return d;
}

// ========================= 一括登録 =========================
/**
 * アイコン(パス/名前)×色×サイズを直積で一括登録
 * @param {maplibregl.Map} map
 * @param {Object} opt
 * @param {Object<string,string>} [opt.mdiPaths]  // { baseName: mdiPath }
 * @param {string[]} [opt.mdiNames]              // ['mdiMapMarker', 'mdiAccount'] → @mdi/js から解決
 * @param {number[]} [opt.sizes=OhMdiDefaults.sizes]
 * @param {string[]} [opt.colors=['primary']]
 * @param {string} [opt.prefix=OhMdiDefaults.prefix]
 * @param {number} [opt.padding=OhMdiDefaults.padding]
 * @param {number} [opt.rotate=0]
 * @param {number} [opt.strokeWidth=OhMdiDefaults.strokeWidth]
 * @param {string} [opt.strokeColor=OhMdiDefaults.strokeColor]
 * @returns {Promise<string[]>} 追加された iconId 配列
 */
export async function registerMdiSet(map, opt = {}) {
    const sizes = opt.sizes || OhMdiDefaults.sizes;
    const colors = (opt.colors || ['primary']);
    const prefix = opt.prefix || OhMdiDefaults.prefix;
    const padding = opt.padding ?? OhMdiDefaults.padding;
    const rotate = opt.rotate ?? 0;
    const strokeWidth = opt.strokeWidth ?? OhMdiDefaults.strokeWidth;
    const strokeColor = opt.strokeColor ?? OhMdiDefaults.strokeColor;

    // ベース: パス指定 + 名前指定(@mdi/js 解決)
    const entries = [];
    if (opt.mdiPaths) {
        for (const [base, d] of Object.entries(opt.mdiPaths)) entries.push({ base, d });
    }
    if (opt.mdiNames?.length) {
        for (const name of opt.mdiNames) {
            const d = await loadMdiPathByName(name);
            const base = name.replace(/^mdi/, '').replace(/^[A-Z]/, m => m.toLowerCase()); // mdiMapMarker → mapMarker
            entries.push({ base, d });
        }
    }
    if (!entries.length) return [];

    const added = [];
    for (const { base, d } of entries) {
        for (const size of sizes) {
            for (const colorName of colors) {
                const color = colorValue(colorName, OhMdiDefaults.palette);
                const id = makeIconId({ prefix, base, size, colorName, strokeWidth });
                await registerMdiIcon(map, { name: id, path: d, size, color, padding, rotate, strokeWidth, strokeColor });
                added.push(id);
            }
        }
    }
    return added;
}

// ========================= GeoJSONユーティリティ =========================
export function pointFeature([lng, lat], { iconId, properties = {} } = {}) {
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { iconId, ...properties } };
}

// ========================= レイヤー作成の雛形 =========================
export function addMdiPointLayer(map, { sourceId, layerId, data, anchor = OhMdiDefaults.anchor } = {}) {
    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data });
    }
    if (!map.getLayer(layerId)) {
        map.addLayer({
            id: layerId,
            type: 'symbol',
            source: sourceId,
            layout: {
                'icon-image': ['coalesce', ['get', 'iconId'], ['get', 'icon']], // iconId or icon プロパティ
                'icon-allow-overlap': true,
                'icon-anchor': anchor,
                'icon-offset': [0, -6],
                'text-field': ['get', 'title'],
                'text-size': 12,
                'text-offset': [0, 1.0],
            },
        });
    }
}

// ========================= 使い方(OH3想定) =========================
/*
import { registerMdiSet, addMdiPointLayer, pointFeature, OhMdiDefaults } from './oh3-mdi-to-maplibre.js'
import { mdiMapMarker, mdiAccount } from '@mdi/js'

// 1) 起動時にまとめて登録（色・サイズバリエーション）
await registerMdiSet(map01, {
  mdiPaths: {
    mapMarker: mdiMapMarker,
    account: mdiAccount,
  },
  sizes: [20, 28, 36],
  colors: ['primary', 'warning', 'white'],
  prefix: 'oh-mdi',
  strokeWidth: 1,           // 視認性UP
  strokeColor: 'rgba(0,0,0,0.35)'
});

// 2) ソース/レイヤー（プロパティ iconId に登録名を入れる）
const fc = {
  type: 'FeatureCollection',
  features: [
    pointFeature([139.767,35.681], { iconId: 'oh-mdi-mapMarker-28-primary', properties: { title: '東京駅' } }),
    pointFeature([135.758,35.011], { iconId: 'oh-mdi-account-28-warning', properties: { title: '京都' } }),
  ]
};
addMdiPointLayer(map01, { sourceId: 'mdi-points', layerId: 'mdi-points-layer', data: fc });

// 3) 追加のアイコンが必要になったら registerMdiSet を再度呼ぶだけ
*/
