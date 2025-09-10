/*
 * OH3: DEM（GSJ 統合DEM mixed）レイヤ定義（MapLibre GL JS 5.6+）
 * - color-relief（段彩）+ hillshade（陰影）+ terrain（任意）
 * - OH3 の「動的 追加/削除/順序変更」前提のグルーピング
 *
 * 推奨パス（高速・安定）:
 *   1) maplibre-gl-gsi-terrain を導入し、アプリ初期化時に gsidem プロトコルを登録
 *      （例）registerGsidemProtocol(maplibregl.addProtocol)
 *   2) 下記 tiles を `gsidem://https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png` に設定
 *
 * 代替（試用・簡易）:
 *   - 公式 TerrainRGB 変換の中継エンドポイントを利用
 *     tiles: 'https://gsj-seamless.jp/seamless/elev/php/terrainRGB.php?url=https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png'
 */

// gsidem プロトコル登録（本番）。アプリ初期化時に 1 回だけ呼ぶ。
import { getGsiDemProtocolAction } from 'maplibre-gl-gsi-terrain';
export function registerGsiDemProtocol(maplibregl){
    try {
        const action = getGsiDemProtocolAction('gsidem');
        maplibregl.addProtocol('gsidem', action);
    } catch (e) {
        console.warn('gsidem protocol registration failed', e);
    }
}

// ============================= 設定プリセット =============================

/**
 * 段彩ストップ（標高[m] → 色）。
 * 配列は [ [elev,color], [elev,color], ... ] 形式で読みやすく定義し、後でフラット化。
 * GSI「自分で作る色別標高図」に寄せた一例（お好みで調整）。
 */
export const DEM_STOPS_PAIR_GSI_LIKE = [
    [-50,  '#f7fbff'],
    [  0,  '#e0f3db'],
    [ 50,  '#ccebc5'],
    [100,  '#a8ddb5'],
    [200,  '#7bccc4'],
    [500,  '#4eb3d3'],
    [1000, '#2b8cbe'],
    [1500, '#0868ac'],
    [2000, '#084081'],
    [3000, '#081d58']
];

/** pair → フラット配列（e0,c0,e1,c1,…） */
function flattenStopsPair(pairs) {
    const out = [];
    for (const [e, c] of pairs) out.push(e, c);
    return out;
}

/** 帰属表示（GSJ シームレス標高タイル） */
export const GSJ_ATTRIB = '<a href="https://gbank.gsj.jp/seamless/elev/" target="_blank" rel="noopener">産総研シームレス標高タイル</a>';

// ============================= 段彩プリセット群 =============================
export const DEM_PRESETS = {
    gsiLike: { label: '標準（GSI風）', stopsPair: DEM_STOPS_PAIR_GSI_LIKE },

    seaEmphasis: { label: '海面下・沿岸強調', stopsPair: [
            [-1000,'#08306b'],[-200,'#08519c'],[-50,'#2171b5'],[-1,'#6baed6'],
            [0,'#fff5eb'],[50,'#fee6ce'],[200,'#fdd0a2'],[500,'#fdae6b'],
            [1000,'#fd8d3c'],[1500,'#f16913'],[2000,'#d94801'],[3000,'#8c2d04']
        ]},

    highlandWarm: { label: '高地強調（暖色）', stopsPair: [
            [0,'#f7fcf5'],[200,'#e0ecf4'],[500,'#fee8c8'],[1000,'#fdbb84'],
            [1500,'#fc8d59'],[2000,'#ef6548'],[2500,'#d7301f'],[3000,'#b30000']
        ]},

    monoGray: { label: 'モノクロ（0–3000m）', stopsPair: [
            [0,'#000000'],[3000,'#ffffff']
        ]}
};

/**
 * 段彩プリセットを適用（レイヤを作り直さず即時反映）
 * @param {import('maplibre-gl').Map} map
 * @param {ReturnType<typeof createGsjDemGroup>['group']} group
 * @param {keyof DEM_PRESETS} presetKey
 * @param {{opacity?:number}} [opts]
 */
export function applyDemPreset(map, group, presetKey, opts = {}) {
    if (!map || !group) return false;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    const preset = DEM_PRESETS[presetKey] || DEM_PRESETS.gsiLike;
    const stopsFlat = flattenStopsPair(preset.stopsPair);
    map.setPaintProperty(lyr.id, 'color-relief-color', [
        'interpolate', ['linear'], ['elevation'],
        ...stopsFlat
    ]);
    if (opts.opacity != null) {
        map.setPaintProperty(lyr.id, 'color-relief-opacity', opts.opacity);
    }
    return true;
}

/** UI 用：プリセット一覧（キーとラベル） */
export function listDemPresets() {
    return Object.entries(DEM_PRESETS).map(([key, v]) => ({ key, label: v.label }));
}

// ============================= ビルダー関数 =============================

/**
 * GSJ mixed DEM グループを生成
 * @param {Object} opt
 * @param {string} [opt.id='gsj-mixed']             - ID サフィックス
 * @param {string} [opt.label]                      - 表示名
 * @param {string} [opt.tiles]                      - TerrainRGB/ Terrarium な raster-dem タイルURL
 * @param {number} [opt.maxzoom=17]
 * @param {boolean} [opt.useColorRelief=true]       - color-relief レイヤを使う（MapLibre 5.6+）
 * @param {Array<[number,string]>} [opt.stopsPair]  - 段彩ストップ（pair 配列）
 * @param {number} [opt.opacity=1.0]                - 段彩不透明度
 * @param {boolean} [opt.hillshade=true]            - 陰影レイヤを重ねる
 * @param {string} [opt.hillshadeMethod='multidirectional']
 * @param {number} [opt.hillshadeExaggeration=0.35]
 * @param {number|null} [opt.terrainExaggeration=1.0] - 3D 地形の誇張（null で terrain 無効）
 * @param {string} [opt.attribution=GSJ_ATTRIB]
 */
export function createGsjDemGroup(opt = {}) {
    const {
        id = 'gsj-mixed',
        label = 'GSJ 統合DEM（段彩+陰影）',
        // ▼ 推奨: gsidem プロトコル（maplibre-gl-gsi-terrain 必須）
        // tiles = 'gsidem://https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',

        // ▼ 代替: 公式変換中継（試用向け）
        tiles = 'gsidem://https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',

        maxzoom = 17,
        useColorRelief = true,
        stopsPair = DEM_STOPS_PAIR_GSI_LIKE,
        opacity = 1.0,
        hillshade = true,
        hillshadeMethod = 'multidirectional',
        hillshadeExaggeration = 0.35,
        terrainExaggeration = 1.0,
        attribution = GSJ_ATTRIB
    } = opt;

    const stopsFlat = flattenStopsPair(stopsPair);

    // --- IDs ---
    const sourceId = `oh-dem-${id}-source`;
    const colorId  = `oh-dem-${id}-color`;
    const shadeId  = `oh-dem-${id}-hillshade`;

    // --- source ---
    const demSource = {
        id: sourceId,
        obj: {
            type: 'raster-dem',
            tiles: [tiles],
            tileSize: 256,
            encoding: 'terrarium',
            maxzoom
        }
    };

    // --- color-relief ---
    const colorLayer = useColorRelief ? {
        id: colorId,
        type: 'color-relief',
        source: sourceId,
        paint: {
            'color-relief-color': [
                'interpolate', ['linear'], ['elevation'],
                ...stopsFlat
            ],
            'color-relief-opacity': opacity
        }
    } : null;

    // --- hillshade ---
    const hillshadeLayer = hillshade ? {
        id: shadeId,
        type: 'hillshade',
        source: sourceId,
        paint: {
            'hillshade-exaggeration': hillshadeExaggeration,
            'hillshade-shadow-color': '#000000',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#000000',
            'hillshade-illumination-direction': 315,
            'hillshade-illumination-altitude': 45,
            'hillshade-method': hillshadeMethod
        }
    } : null;

    // --- グループ ---
    const group = {
        id: `oh-dem-${id}`,
        label,
        source: demSource,
        layers: [colorLayer, hillshadeLayer].filter(Boolean),
        attribution,
        ext: terrainExaggeration != null ? {
            name: 'ext-dem',
            terrain: { source: sourceId, exaggeration: terrainExaggeration }
        } : undefined
    };

    return { demSource, colorLayer, hillshadeLayer, group };
}

// ============================= 追加/削除ユーティリティ =============================

/**
 * DEM グループの追加
 * @param {import('maplibre-gl').Map} map
 * @param {ReturnType<typeof createGsjDemGroup>['group']} group
 * @param {string} [addAboveLayerId] - このレイヤIDの直下に積む（未指定なら最上位）
 */
export function addDemGroup(map, group, addAboveLayerId) {
    if (!map || !group) return;
    const srcId = group.source.id;

    if (!map.getSource(srcId)) {
        map.addSource(srcId, group.source.obj);
    }

    const insertOpts = addAboveLayerId ? { before: addAboveLayerId } : undefined;
    for (const lyr of group.layers) {
        if (!map.getLayer(lyr.id)) {
            map.addLayer(lyr, addAboveLayerId);
        }
    }

    // terrain（任意）
    if (group.ext && group.ext.terrain) {
        try {
            map.setTerrain(group.ext.terrain);
        } catch (e) {
            // 古い MapLibre / raster-dem 不在時の安全策
            console.warn('setTerrain skipped:', e);
        }
    }
}

/**
 * DEM グループの削除（terrain を自分が立てた場合のみ戻す）
 * @param {import('maplibre-gl').Map} map
 * @param {ReturnType<typeof createGsjDemGroup>['group']} group
 */
export function removeDemGroup(map, group) {
    if (!map || !group) return;
    const srcId = group.source.id;

    // terrain の解除（source が一致する場合のみ）
    try {
        const t = map.getTerrain && map.getTerrain();
        if (t && t.source === srcId) map.setTerrain(null);
    } catch (e) {}

    // レイヤを上から順に削除
    for (const lyr of (group.layers || []).slice().reverse()) {
        if (map.getLayer(lyr.id)) map.removeLayer(lyr.id);
    }
    if (map.getSource(srcId)) map.removeSource(srcId);
}

/**
 * DEM レイヤの順序移動（color → hillshade の相対関係は維持して下端または before 指定へ）
 * @param {import('maplibre-gl').Map} map
 * @param {ReturnType<typeof createGsjDemGroup>['group']} group
 * @param {string} [beforeLayerId] - この ID の直前に color/hillshade を並べ替え
 */
export function moveDemGroup(map, group, beforeLayerId) {
    if (!map || !group) return;
    const ids = (group.layers || []).map(l => l.id).filter(id => map.getLayer(id));
    // color を先に、次に hillshade を移動（相対順を守る）
    for (const id of ids) {
        try { map.moveLayer(id, beforeLayerId); } catch (e) {}
    }
}

// ============================= 既定グループ（即利用） =============================


export const DEM_GSJ_MIXED_DEFAULT = createGsjDemGroup({
    id: 'gsj-mixed',
    label: 'GSJ 統合DEM（段彩+陰影）',
    // 本番は gsidem:// に差し替え（アプリ初期化でプロトコル登録必須）
    // tiles: 'gsidem://https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',
    terrainExaggeration: 1.0,
    hillshade: true,
    hillshadeMethod: 'multidirectional',
    stopsPair: DEM_STOPS_PAIR_GSI_LIKE
});

/*
使用例（OH3 側の UI から）:

import {
  DEM_GSJ_MIXED_DEFAULT,
  addDemGroup,
  removeDemGroup,
  moveDemGroup
} from './layers-dem-gsj.js';

// 追加
addDemGroup(map, DEM_GSJ_MIXED_DEFAULT.group, 'oh-some-layer-below');

// 並べ替え
moveDemGroup(map, DEM_GSJ_MIXED_DEFAULT.group, 'label-layer');

// 削除
removeDemGroup(map, DEM_GSJ_MIXED_DEFAULT.group);
*/

// ============================= 実用ユーティリティ一式 =============================

/** color-relief の不透明度を変更 */
export function setDemOpacity(map, group, opacity){
    if (!map || !group) return false;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    map.setPaintProperty(lyr.id, 'color-relief-opacity', Math.max(0, Math.min(1, opacity)));
    return true;
}

/** hillshade の表示/非表示（layout.visibility） */
export function setHillshadeVisible(map, group, visible){
    if (!map || !group) return false;
    const lyr = (group.layers || []).find(l => l && l.type === 'hillshade');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    map.setLayoutProperty(lyr.id, 'visibility', visible ? 'visible' : 'none');
    return true;
}

/**
 * 画面内サンプリングで標高の概算 min/max を得る（terrain 有効時）
 * @param {import('maplibre-gl').Map} map
 * @param {number} [nx=6] - 横方向サンプル数
 * @param {number} [ny=4] - 縦方向サンプル数
 */
export function sampleViewportMinMax(map, nx = 6, ny = 4){
    if (!map || typeof map.queryTerrainElevation !== 'function') return null;
    const b = map.getBounds();
    const lngMin = b.getWest(), lngMax = b.getEast();
    const latMin = b.getSouth(), latMax = b.getNorth();
    let min = +Infinity, max = -Infinity, cnt = 0;
    for (let ix = 0; ix < nx; ix++){
        for (let iy = 0; iy < ny; iy++){
            const t = (ix + 0.5) / nx;
            const s = (iy + 0.5) / ny;
            const lng = lngMin + (lngMax - lngMin) * t;
            const lat = latMin + (latMax - latMin) * s;
            const z = map.queryTerrainElevation({lng, lat}, { exaggerated: false });
            if (Number.isFinite(z)){
                if (z < min) min = z;
                if (z > max) max = z;
                cnt++;
            }
        }
    }
    if (!cnt || min === +Infinity || max === -Infinity) return null;
    return { min, max, count: cnt };
}

/** 中心地点の標高（terrain 有効時） */
export function sampleCenterElevation(map){
    if (!map || typeof map.queryTerrainElevation !== 'function') return null;
    const c = map.getCenter();
    const z = map.queryTerrainElevation({lng: c.lng, lat: c.lat}, { exaggerated: false });
    return Number.isFinite(z) ? z : null;
}

/** 均等分割の段彩（離散）を生成 */
export function buildEqualIntervalStops(min, max, n = 8, colors){
    if (!Number.isFinite(min) || !Number.isFinite(max) || n <= 1) return DEM_STOPS_PAIR_GSI_LIKE;
    const pairs = [];
    const range = max - min;
    const colorRamp = colors || generateDefaultRamp(n);
    for (let i = 0; i < n; i++){
        const v = min + (range * i) / (n - 1);
        pairs.push([v, colorRamp[i % colorRamp.length]]);
    }
    return pairs;
}

/** シンプルな連続グラデーション（2色→n分割） */
export function buildLinearGradientStops(min, max, n = 8, colorA = '#f7fcf5', colorB = '#00441b'){
    const ramp = interpolateColorRamp(colorA, colorB, n);
    return buildEqualIntervalStops(min, max, n, ramp);
}

/** 単純な色ランプ（カテゴリ数 n に対して一様配列を返す） */
export function generateDefaultRamp(n){
    const base = ['#f7fcf5','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081','#081d58'];
    if (n <= base.length) return base.slice(0, n);
    // 必要なら補間
    return interpolateColorRamp(base[0], base[base.length-1], n);
}

/** 2色間の線形補間ランプ（n色） */
export function interpolateColorRamp(c1, c2, n){
    const a = hexToRgb(c1), b = hexToRgb(c2);
    const out = [];
    for (let i = 0; i < n; i++){
        const t = n === 1 ? 0 : i/(n-1);
        const r = Math.round(a.r + (b.r - a.r)*t);
        const g = Math.round(a.g + (b.g - a.g)*t);
        const bl = Math.round(a.b + (b.b - a.b)*t);
        out.push(rgbToHex(r,g,bl));
    }
    return out;
}

function hexToRgb(hex){
    const s = hex.replace('#','');
    const v = parseInt(s.length===3 ? s.split('').map(x=>x+x).join('') : s, 16);
    return { r:(v>>16)&255, g:(v>>8)&255, b:v&255 };
}
function rgbToHex(r,g,b){
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

/** 現在の color-relief の stopsPair を JSON として取得 */
export function exportDemStyle(map, group){
    if (!map || !group) return null;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return null;
    const val = map.getPaintProperty(lyr.id, 'color-relief-color');
    const opacity = map.getPaintProperty(lyr.id, 'color-relief-opacity');
    // val は [ 'interpolate', ['linear'], ['elevation'], e0, c0, e1, c1, ... ]
    const arr = Array.isArray(val) ? val.slice(3) : [];
    const stopsPair = [];
    for (let i = 0; i < arr.length; i+=2){
        const elev = arr[i];
        const col  = arr[i+1];
        if (typeof elev === 'number' && typeof col === 'string') stopsPair.push([elev, col]);
    }
    // hillshade/terrain 周辺設定
    const hs = (group.layers || []).find(l => l && l.type === 'hillshade');
    const hsPaint = hs && map.getLayer(hs.id) ? {
        method: map.getPaintProperty(hs.id, 'hillshade-method'),
        exaggeration: map.getPaintProperty(hs.id, 'hillshade-exaggeration'),
        illumDir: map.getPaintProperty(hs.id, 'hillshade-illumination-direction'),
        illumAlt: map.getPaintProperty(hs.id, 'hillshade-illumination-altitude')
    } : null;
    const terrain = group.ext && group.ext.terrain ? group.ext.terrain : null;
    return { stopsPair, opacity, hillshade: hsPaint, terrain };
}

/** スタイル JSON を適用 */
export function importDemStyle(map, group, styleObj){
    if (!map || !group || !styleObj) return false;
    const { stopsPair, opacity, hillshade, terrain } = styleObj;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (lyr && map.getLayer(lyr.id) && Array.isArray(stopsPair)){
        const flat = flattenStopsPair(stopsPair);
        map.setPaintProperty(lyr.id, 'color-relief-color', ['interpolate', ['linear'], ['elevation'], ...flat]);
        if (opacity != null) map.setPaintProperty(lyr.id, 'color-relief-opacity', opacity);
    }
    const hs = (group.layers || []).find(l => l && l.type === 'hillshade');
    if (hs && map.getLayer(hs.id) && hillshade){
        if (hillshade.method) map.setPaintProperty(hs.id, 'hillshade-method', hillshade.method);
        if (hillshade.exaggeration!=null) map.setPaintProperty(hs.id, 'hillshade-exaggeration', hillshade.exaggeration);
        if (hillshade.illumDir!=null) map.setPaintProperty(hs.id, 'hillshade-illumination-direction', hillshade.illumDir);
        if (hillshade.illumAlt!=null) map.setPaintProperty(hs.id, 'hillshade-illumination-altitude', hillshade.illumAlt);
    }
    if (terrain && terrain.source){
        try { map.setTerrain(terrain); } catch(e){}
    }
    return true;
}

/** CSV/TSV/空白区切りから "elev,color" ペア配列を生成 */
export function importColorStopsFromText(text){
    const lines = String(text||'').split(/\r?\n/);
    const pairs = [];
    for (const raw of lines){
        const s = raw.trim();
        if (!s || s.startsWith('#') || s.startsWith('//')) continue;
        const cols = s.split(/[\s,\t]+/).filter(Boolean);
        if (cols.length < 2) continue;
        const elev = parseFloat(cols[0]);
        const col  = cols[1];
        if (Number.isFinite(elev) && /^#?[0-9a-fA-F]{3,8}$/.test(col.replace('#',''))){
            const hex = col.startsWith('#') ? col : '#'+col;
            pairs.push([elev, hex]);
        }
    }
    // 標高昇順に
    pairs.sort((a,b)=>a[0]-b[0]);
    return pairs;
}

/** 偽カラー（中心より低い範囲だけ強調）。上側は透明色に逃がす */
export function highlightLowerThanCenter(map, group, color = 'rgba(255,0,0,0.6)'){
    const c = sampleCenterElevation(map);
    if (!Number.isFinite(c)) return false;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    // [min→color, center→透明]
    const current = exportDemStyle(map, group);
    const min = (current?.stopsPair?.[0]?.[0] ?? (c - 1000));
    const pairs = [ [min, color], [c, 'rgba(0,0,0,0)'] ];
    map.setPaintProperty(lyr.id, 'color-relief-color', [ 'interpolate', ['linear'], ['elevation'], ...flattenStopsPair(pairs) ]);
    return true;
}

/** ビューポート自動分級（均等区分 or グラデーション） */
export function autoClassifyFromViewport(map, group, n = 8, mode = 'discrete'){
    const mm = sampleViewportMinMax(map);
    if (!mm) return false;
    const pairs = mode === 'gradient'
        ? buildLinearGradientStops(mm.min, mm.max, n)
        : buildEqualIntervalStops(mm.min, mm.max, n);
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    map.setPaintProperty(lyr.id, 'color-relief-color', ['interpolate',['linear'],['elevation'], ...flattenStopsPair(pairs)]);
    return true;
}

// ============================= 凡例PNG生成 =============================

/** 段彩の凡例 PNG を生成しダウンロード */
export function downloadLegendPng(stopsPair, { title='標高 (m)', width=320, height=72, discrete=true } = {}){
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height);
    ctx.strokeStyle = '#ccc'; ctx.strokeRect(0,0,width,height);

    const pad = 8, barH = 18; const barY = pad + 16;
    if (discrete){
        // 区間ごとに塗る
        const n = stopsPair.length;
        for (let i=0;i<n;i++){
            const x0 = pad + (i * (width-2*pad) / n);
            const x1 = pad + ((i+1) * (width-2*pad) / n);
            ctx.fillStyle = stopsPair[i][1];
            ctx.fillRect(x0, barY, (x1-x0), barH);
        }
    } else {
        // グラデーション
        const grd = ctx.createLinearGradient(pad, 0, width-pad, 0);
        const min = stopsPair[0][0], max = stopsPair[stopsPair.length-1][0];
        for (const [e,c] of stopsPair){
            const t = (e - min) / (max - min || 1);
            grd.addColorStop(Math.min(1, Math.max(0, t)), c);
        }
        ctx.fillStyle = grd;
        ctx.fillRect(pad, barY, width-2*pad, barH);
    }

    // 目盛（左/右）
    ctx.fillStyle = '#333';
    const min = stopsPair[0][0], max = stopsPair[stopsPair.length-1][0];
    ctx.fillText(`${min.toFixed(0)} m`, pad, barY + barH + 14);
    const tw = ctx.measureText(`${max.toFixed(0)} m`).width;
    ctx.fillText(`${max.toFixed(0)} m`, width - pad - tw, barY + barH + 14);

    // タイトル
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(title, pad, pad + 12);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'legend.png'; a.click();
    return url;
}

// ============================= 実用ユーティリティ一式 =============================

/** color-relief の不透明度を変更 */
export function setDemOpacity(map, group, opacity){
    if (!map || !group) return false;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    map.setPaintProperty(lyr.id, 'color-relief-opacity', Math.max(0, Math.min(1, opacity)));
    return true;
}

/** hillshade の表示/非表示（layout.visibility） */
export function setHillshadeVisible(map, group, visible){
    if (!map || !group) return false;
    const lyr = (group.layers || []).find(l => l && l.type === 'hillshade');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    map.setLayoutProperty(lyr.id, 'visibility', visible ? 'visible' : 'none');
    return true;
}

/**
 * 画面内サンプリングで標高の概算 min/max を得る（terrain 有効時）
 * @param {import('maplibre-gl').Map} map
 * @param {number} [nx=6] - 横方向サンプル数
 * @param {number} [ny=4] - 縦方向サンプル数
 */
export function sampleViewportMinMax(map, nx = 6, ny = 4){
    if (!map || typeof map.queryTerrainElevation !== 'function') return null;
    const b = map.getBounds();
    const lngMin = b.getWest(), lngMax = b.getEast();
    const latMin = b.getSouth(), latMax = b.getNorth();
    let min = +Infinity, max = -Infinity, cnt = 0;
    for (let ix = 0; ix < nx; ix++){
        for (let iy = 0; iy < ny; iy++){
            const t = (ix + 0.5) / nx;
            const s = (iy + 0.5) / ny;
            const lng = lngMin + (lngMax - lngMin) * t;
            const lat = latMin + (latMax - latMin) * s;
            const z = map.queryTerrainElevation({lng, lat}, { exaggerated: false });
            if (Number.isFinite(z)){
                if (z < min) min = z;
                if (z > max) max = z;
                cnt++;
            }
        }
    }
    if (!cnt || min === +Infinity || max === -Infinity) return null;
    return { min, max, count: cnt };
}

/** 中心地点の標高（terrain 有効時） */
export function sampleCenterElevation(map){
    if (!map || typeof map.queryTerrainElevation !== 'function') return null;
    const c = map.getCenter();
    const z = map.queryTerrainElevation({lng: c.lng, lat: c.lat}, { exaggerated: false });
    return Number.isFinite(z) ? z : null;
}

/** 均等分割の段彩（離散）を生成 */
export function buildEqualIntervalStops(min, max, n = 8, colors){
    if (!Number.isFinite(min) || !Number.isFinite(max) || n <= 1) return DEM_STOPS_PAIR_GSI_LIKE;
    const pairs = [];
    const range = max - min;
    const colorRamp = colors || generateDefaultRamp(n);
    for (let i = 0; i < n; i++){
        const v = min + (range * i) / (n - 1);
        pairs.push([v, colorRamp[i % colorRamp.length]]);
    }
    return pairs;
}

/** シンプルな連続グラデーション（2色→n分割） */
export function buildLinearGradientStops(min, max, n = 8, colorA = '#f7fcf5', colorB = '#00441b'){
    const ramp = interpolateColorRamp(colorA, colorB, n);
    return buildEqualIntervalStops(min, max, n, ramp);
}

/** 単純な色ランプ（カテゴリ数 n に対して一様配列を返す） */
export function generateDefaultRamp(n){
    const base = ['#f7fcf5','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081','#081d58'];
    if (n <= base.length) return base.slice(0, n);
    // 必要なら補間
    return interpolateColorRamp(base[0], base[base.length-1], n);
}

/** 2色間の線形補間ランプ（n色） */
export function interpolateColorRamp(c1, c2, n){
    const a = hexToRgb(c1), b = hexToRgb(c2);
    const out = [];
    for (let i = 0; i < n; i++){
        const t = n === 1 ? 0 : i/(n-1);
        const r = Math.round(a.r + (b.r - a.r)*t);
        const g = Math.round(a.g + (b.g - a.g)*t);
        const bl = Math.round(a.b + (b.b - a.b)*t);
        out.push(rgbToHex(r,g,bl));
    }
    return out;
}

function hexToRgb(hex){
    const s = hex.replace('#','');
    const v = parseInt(s.length===3 ? s.split('').map(x=>x+x).join('') : s, 16);
    return { r:(v>>16)&255, g:(v>>8)&255, b:v&255 };
}
function rgbToHex(r,g,b){
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

/** 現在の color-relief の stopsPair を JSON として取得 */
export function exportDemStyle(map, group){
    if (!map || !group) return null;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return null;
    const val = map.getPaintProperty(lyr.id, 'color-relief-color');
    const opacity = map.getPaintProperty(lyr.id, 'color-relief-opacity');
    // val は [ 'interpolate', ['linear'], ['elevation'], e0, c0, e1, c1, ... ]
    const arr = Array.isArray(val) ? val.slice(3) : [];
    const stopsPair = [];
    for (let i = 0; i < arr.length; i+=2){
        const elev = arr[i];
        const col  = arr[i+1];
        if (typeof elev === 'number' && typeof col === 'string') stopsPair.push([elev, col]);
    }
    // hillshade/terrain 周辺設定
    const hs = (group.layers || []).find(l => l && l.type === 'hillshade');
    const hsPaint = hs && map.getLayer(hs.id) ? {
        method: map.getPaintProperty(hs.id, 'hillshade-method'),
        exaggeration: map.getPaintProperty(hs.id, 'hillshade-exaggeration'),
        illumDir: map.getPaintProperty(hs.id, 'hillshade-illumination-direction'),
        illumAlt: map.getPaintProperty(hs.id, 'hillshade-illumination-altitude')
    } : null;
    const terrain = group.ext && group.ext.terrain ? group.ext.terrain : null;
    return { stopsPair, opacity, hillshade: hsPaint, terrain };
}

/** スタイル JSON を適用 */
export function importDemStyle(map, group, styleObj){
    if (!map || !group || !styleObj) return false;
    const { stopsPair, opacity, hillshade, terrain } = styleObj;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (lyr && map.getLayer(lyr.id) && Array.isArray(stopsPair)){
        const flat = flattenStopsPair(stopsPair);
        map.setPaintProperty(lyr.id, 'color-relief-color', ['interpolate', ['linear'], ['elevation'], ...flat]);
        if (opacity != null) map.setPaintProperty(lyr.id, 'color-relief-opacity', opacity);
    }
    const hs = (group.layers || []).find(l => l && l.type === 'hillshade');
    if (hs && map.getLayer(hs.id) && hillshade){
        if (hillshade.method) map.setPaintProperty(hs.id, 'hillshade-method', hillshade.method);
        if (hillshade.exaggeration!=null) map.setPaintProperty(hs.id, 'hillshade-exaggeration', hillshade.exaggeration);
        if (hillshade.illumDir!=null) map.setPaintProperty(hs.id, 'hillshade-illumination-direction', hillshade.illumDir);
        if (hillshade.illumAlt!=null) map.setPaintProperty(hs.id, 'hillshade-illumination-altitude', hillshade.illumAlt);
    }
    if (terrain && terrain.source){
        try { map.setTerrain(terrain); } catch(e){}
    }
    return true;
}

/** CSV/TSV/空白区切りから "elev,color" ペア配列を生成 */
export function importColorStopsFromText(text){
    const lines = String(text||'').split(/\r?\n/);
    const pairs = [];
    for (const raw of lines){
        const s = raw.trim();
        if (!s || s.startsWith('#') || s.startsWith('//')) continue;
        const cols = s.split(/[\s,\t]+/).filter(Boolean);
        if (cols.length < 2) continue;
        const elev = parseFloat(cols[0]);
        const col  = cols[1];
        if (Number.isFinite(elev) && /^#?[0-9a-fA-F]{3,8}$/.test(col.replace('#',''))){
            const hex = col.startsWith('#') ? col : '#'+col;
            pairs.push([elev, hex]);
        }
    }
    // 標高昇順に
    pairs.sort((a,b)=>a[0]-b[0]);
    return pairs;
}

/** 偽カラー（中心より低い範囲だけ強調）。上側は透明色に逃がす */
export function highlightLowerThanCenter(map, group, color = 'rgba(255,0,0,0.6)'){
    const c = sampleCenterElevation(map);
    if (!Number.isFinite(c)) return false;
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    // [min→color, center→透明]
    const current = exportDemStyle(map, group);
    const min = (current?.stopsPair?.[0]?.[0] ?? (c - 1000));
    const pairs = [ [min, color], [c, 'rgba(0,0,0,0)'] ];
    map.setPaintProperty(lyr.id, 'color-relief-color', [ 'interpolate', ['linear'], ['elevation'], ...flattenStopsPair(pairs) ]);
    return true;
}

/** ビューポート自動分級（均等区分 or グラデーション） */
export function autoClassifyFromViewport(map, group, n = 8, mode = 'discrete'){
    const mm = sampleViewportMinMax(map);
    if (!mm) return false;
    const pairs = mode === 'gradient'
        ? buildLinearGradientStops(mm.min, mm.max, n)
        : buildEqualIntervalStops(mm.min, mm.max, n);
    const lyr = (group.layers || []).find(l => l && l.type === 'color-relief');
    if (!lyr || !map.getLayer(lyr.id)) return false;
    map.setPaintProperty(lyr.id, 'color-relief-color', ['interpolate',['linear'],['elevation'], ...flattenStopsPair(pairs)]);
    return true;
}

// ============================= 凡例PNG生成 =============================

/** 段彩の凡例 PNG を生成しダウンロード */
export function downloadLegendPng(stopsPair, { title='標高 (m)', width=320, height=72, discrete=true } = {}){
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height);
    ctx.strokeStyle = '#ccc'; ctx.strokeRect(0,0,width,height);

    const pad = 8, barH = 18; const barY = pad + 16;
    if (discrete){
        // 区間ごとに塗る
        const n = stopsPair.length;
        for (let i=0;i<n;i++){
            const x0 = pad + (i * (width-2*pad) / n);
            const x1 = pad + ((i+1) * (width-2*pad) / n);
            ctx.fillStyle = stopsPair[i][1];
            ctx.fillRect(x0, barY, (x1-x0), barH);
        }
    } else {
        // グラデーション
        const grd = ctx.createLinearGradient(pad, 0, width-pad, 0);
        const min = stopsPair[0][0], max = stopsPair[stopsPair.length-1][0];
        for (const [e,c] of stopsPair){
            const t = (e - min) / (max - min || 1);
            grd.addColorStop(Math.min(1, Math.max(0, t)), c);
        }
        ctx.fillStyle = grd;
        ctx.fillRect(pad, barY, width-2*pad, barH);
    }

    // 目盛（左/右）
    ctx.fillStyle = '#333';
    const min = stopsPair[0][0], max = stopsPair[stopsPair.length-1][0];
    ctx.fillText(`${min.toFixed(0)} m`, pad, barY + barH + 14);
    const tw = ctx.measureText(`${max.toFixed(0)} m`).width;
    ctx.fillText(`${max.toFixed(0)} m`, width - pad - tw, barY + barH + 14);

    // タイトル
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(title, pad, pad + 12);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'legend.png'; a.click();
    return url;
}
