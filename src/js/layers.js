// 標準地図------------------------------------------------------------------------------------------------------
export const stdSource = {
    id: 'stdSource', obj: {
        type: 'raster',
        tiles: [
            'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png' // 標準地図
        ],
        tileSize: 256
    }
}
export const stdLayer = {
    'id': 'oh-stdLayer',
    'type': 'raster',
    'source': 'stdSource',
    'minzoom': 0,
    'maxzoom': 18
}
// 最新写真--------------------------------------------------------------------------------------------------------------
export const seamlessphotoSource = {
    id:'seamlessphoto',obj:{
        type: 'raster',
        tiles: [
            'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
        ],
        tileSize: 256
    }
}
export const seamlessphotoLayer = {
    'id': 'oh-seamlessphoto',
    'source': seamlessphotoSource.id,
    'type': 'raster',
    'minzoom': 2,
    'maxzoom': 23
}
// -------------------------------------------------------------------------------------------------------------
// PLATEAU建物（PMTiles）ソース
export const plateauPmtilesSource = {
    id: "plateauPmtiles", obj:{
        type: "vector",
        url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2022_LOD1.pmtiles",
        // url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2023_LOD0.pmtiles",
        minzoom: 16,
        maxzoom: 16,
        attribution: '<a href=""></a>'
    }
}
export const plateauPmtilesLayer = {
    'id': 'oh-plateauPmtiles',
    'source': 'plateauPmtiles',
    'source-layer': "PLATEAU",
    // 'source-layer': "PLATEAU_2023_LOD0",
    "minzoom": 14,
    "maxzoom": 23,
    'type': 'fill-extrusion',
    'paint': {
        "fill-extrusion-color": '#797979',
        "fill-extrusion-opacity": 1.0,
        "fill-extrusion-height": ["get", "measuredHeight"]
    }
}
// 岐阜県CS立体図------------------------------------------------------------------------------------------------------
export const csGifuSource = {
    id: 'csGifu', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/gihucs/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms'
    }
}
export const csGifuLayer = {
    'id': 'oh-csGifuLayer',
    'type': 'raster',
    'source': 'csGifu',
    'minzoom': 0,
    'maxzoom': 23
}
// 多摩地域赤色立体地図------------------------------------------------------------------------------------------------------
export const tamaSekisyokuSource = {
    id: 'tamaSekisyokuSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tamasekisyoku/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
        crossOrigin: 'anonymous',
        paint: {
            'raster-resampling': 'nearest'
        }
    }
}
export const tamaSekisyokuLayer = {
    'id': 'oh-tamaSekisyokuLayer',
    'type': 'raster',
    'source': 'tamaSekisyokuSource',
    'minzoom': 1,
    'maxzoom': 23
}
// 多摩地域赤色立体地図------------------------------------------------------------------------------------------------------
export const csOsakaSource = {
    id: 'csOsakaSource', obj: {
        type: 'raster',
        tiles: ['https://xs489works.xsrv.jp/raster-tiles/pref-osaka/osaka-cs-tiles/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
        paint: {
            'raster-resampling': 'nearest'
        }
    }
}
export const csOsakaLayer = {
    'id': 'oh-csOsakaLayer',
    'type': 'raster',
    'source': 'csOsakaSource',
    'minzoom': 1,
    'maxzoom': 23
}
// 登記所備付地図データ --------------------------------------------------------------------------------------------
export const amxSource = {
    id: "amx-a-pmtiles", obj: {
        type: "vector",
        minzoom: 2,
        maxzoom: 16,
        url: "pmtiles://https://habs.rad.naro.go.jp/spatial_data/amx/a.pmtiles",
        attribution:
            "<a href='https://www.moj.go.jp/MINJI/minji05_00494.html' target='_blank'>登記所備付地図データ（法務省）</a>",
    }
}
// 登記所備付地図データ 間引きなし
export const amxLayer = {
    id: "oh-amx-a-fude",
    type: "fill",
    source: "amx-a-pmtiles", "source-layer": "fude",
    paint: {
        "fill-color": "rgba(254, 217, 192, 1)",
        "fill-outline-color": "rgba(255, 0, 0, 1)",
        "fill-opacity": 0.4,
    },
}
// 登記所備付地図データ 代表点レイヤ
export const amxLayerDaihyou = {
    id: "oh-amx-a-daihyo",
    // ヒートマップ
    type: "heatmap",
    source: "amx-a-pmtiles",
    // ベクトルタイルソースから使用するレイヤ
    "source-layer": "daihyo",
    paint: {
        // ヒートマップの密度に基づいて各ピクセルの色を定義
        "heatmap-color": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 入力より小さいストップと大きいストップのペアを直線的に補間
            ["linear"],
            // ヒートマップレイヤーの密度推定値を取得
            ["heatmap-density"],
            0,
            "rgba(255, 255, 255, 0)",
            0.5,
            "rgba(255, 255, 0, 0.5)",
            // 1に近づくほど密度が高い
            1,
            "rgba(255, 0, 0, 0.5)",
        ],
        // ヒートマップ1点の半径（ピクセル単位）
        "heatmap-radius": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 出力が増加する割合を制御する、1に近づくほど出力が増加する
            ["exponential", 10],
            // ズームレベルに応じて半径を調整する
            ["zoom"],
            2,
            5,
            14,
            50,
        ],
    }
}
// ---------------------------------------------------------------------------------------------------------------------
const layers01 = [
    {
        id: 1,
        label: "基本地図テスト",
        nodes: [
            {
                id: 'oh-stdLayer',
                label: "標準地図",
                source: stdSource,
                layers: [stdLayer]
            },
            {
                id: 'oh-seamlessphoto',
                label: "最新写真",
                source: seamlessphotoSource,
                layers: [seamlessphotoLayer]
            },
            {
                id: 'oh-plateauPmtiles',
                label: "PLATEAU建物",
                source: plateauPmtilesSource,
                layers: [plateauPmtilesLayer]
            },
            {
                id: 'oh-amx-a-fude',
                label: "登記所備付地図データ",
                source: amxSource,
                layers:[amxLayer,amxLayerDaihyou]
            },
        ]
    },
    {
        id: 2,
        label: "立体図等",
        nodes: [
            {
                id: 'oh-csGifuLayer',
                label: "岐阜県CS立体図",
                source: csGifuSource,
                layers: [csGifuLayer]
            },
            {
                id: 'oh-csOsakaLayer',
                label: "大阪府CS立体図",
                source: csOsakaSource,
                layers: [csOsakaLayer]
            },
            {
                id: 'oh-tamaSekisyokuLayer',
                label: "東京都多摩地域赤色立体地図",
                source: tamaSekisyokuSource,
                layers: [tamaSekisyokuLayer]
            },
        ]
    }
]
const layers02 = JSON.parse(JSON.stringify(layers01))
export const layers = {
    map01: layers01,
    map02: layers02
}