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
export async function registerGsiDemProtocol(maplibregl){
    try {
        // 動的 import：パッケージ未導入でもクラッシュしない
        const mod = await import('maplibre-gl-gsi-terrain');
        const action = mod.getGsiDemProtocolAction('gsidem');
        maplibregl.addProtocol('gsidem', action);
    } catch (e) {
        console.warn('gsidem protocol registration skipped (module missing or failed)', e);
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

/**
 * 実行環境が color-relief をサポートしているか簡易判定（MapLibre 5.6+）
 */
function supportsColorReliefRuntime(){
    try {
        // できる限りグローバル参照を安全に（typeof 経由なら未定義でもOK）
        const ml = (typeof window !== 'undefined' && window && window['maplibregl'])
            || (typeof self !== 'undefined' && self && self['maplibregl']);
        const ver = (ml && typeof ml.version === 'string') ? ml.version : '';
        const parts = ver.split('.');
        const major = parseInt(parts[0] || '0', 10);
        const minor = parseInt(parts[1] || '0', 10);
        return major > 5 || (major === 5 && minor >= 6);
    } catch (e) {
        return false;
    }
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
 * @param {number} [opt.maxzoom=15]
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

        maxzoom = 15,
        useColorRelief = true,
        stopsPair = DEM_STOPS_PAIR_GSI_LIKE,
        opacity = 0.65,
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
            'hillshade-highlight-color': 'rgba(255,255,255,0.9)',
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
 * できるだけ“下のほう”に入れるためのアンカーを推定
 * - 背景（background）より上、最下層のレイヤIDを返す
 * - これにより DEM が他レイヤを覆って真っ白になるのを回避
 */
function pickBottomAnchor(map){
    try {
        const layers = (map.getStyle() && map.getStyle().layers) || [];
        for (const l of layers){
            if (l && l.type && l.type !== 'background') return l.id; // 最初の非 background
        }
    } catch {}
    return undefined;
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
    const supportsCR = supportsColorReliefRuntime();
    const safeLayers = (group.layers || []).filter(l => supportsCR ? true : l.type !== 'color-relief');
    const anchor = addAboveLayerId || pickBottomAnchor(map);
    for (const lyr of safeLayers) {
        if (!map.getLayer(lyr.id)) {
            try { map.addLayer(lyr, anchor); }
            catch (e) { console.error('addLayer failed:', lyr?.id, e); }
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


export const DEM_GSJ_LAND_DEFAULT = createGsjDemGroup({
    id: 'gsj-land',
    label: 'GSJ 陸域統合DEM（段彩+陰影）',
    tiles: 'gsidem://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png',
    maxzoom: 19,
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
