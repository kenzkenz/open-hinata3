// 地理院グリフを使う時は以下のフォントを使う。
// "text-font": ["NotoSansJP-Regular"],

// ---------------------------------------------------------------------------------------------------------------------
// syochiikiソース
export const syochiikiSource = {
    id: "syochiikiSource", obj:{
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/syochiiki/syochiiki.pmtiles",
        attribution: '<a href="https://github.com/shiwaku/mlit-plateau-bldg-pmtiles">mlit-plateau-bldg-pmtiles</a>'
    }
}
export const syochiikiLayer = {
    'id': 'oh-syochiikiLayer',
    'source': 'syochiikiSource',
    'source-layer': "polygon",
    'type': 'fill',
    paint: {
        "fill-color": "rgba(0, 0, 0, 0)",
    },
}
export const syochiikLayerLine = {
    id: "oh-syochiik-Line",
    type: "line",
    source: "syochiikiSource",
    "source-layer": "polygon",
    paint: {
        'line-color': 'red',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            4, 0.2,
            6, 0.5,
            8, 0.7,
            11, 1.0,
            12, 1.5,
            14, 2,
            16, 3,
            18, 6,
            30, 10,
        ]
    },
}
export const syochiikiLayerLabel = {
    id: "oh-syochiiki-Label",
    type: "symbol",
    source: "syochiikiSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': [
            'format',
            ['get', 'S_NAME'],{},
            '\n', {},
            ['get', 'JINKO'], { 'font-scale': 1.2 },
            '人', {},
        ],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0.5, 0],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
export const syochiikiLayerHeight = {
    id: 'oh-syochiiki-height',
    type: 'fill-extrusion',
    source: "syochiikiSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['/', ['get', 'JINKO'], ['get', 'AREA']],
            0, 100,
            0.2, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['/', ['get', 'JINKO'], ['get', 'AREA']],
            0, 'silver',
            0.1, 'black'
        ]
    }
}
// 高速道路--------------------------------------
export const highwaySource = {
    id: 'highwaySource', obj: {
        // 'type': 'geojson',
        // 'data': require('@/assets/json/highway_sections_2024.geojson'),
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kosoku/kosoku.pmtiles",

    }
}
export const highwayLayerGreen = {
    'id': 'oh-highwayLayer-green-lines',
    'type': 'line',
    'source': 'highwaySource',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': '#007356',
        'line-width': 5,
        'line-blur': 0.8,
        'line-opacity':1
    },
    'filter': ['<', 'N06_002', 2024]
}
export const highwayLayerRed = {
    'id': 'oh-highwayLayer-red-lines',
    'type': 'line',
    'source': 'highwaySource',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': '#FF0000',
        'line-width': 5,
        'line-blur': 0.8,
        'line-opacity':1
    },
    'filter': ['==', 'N06_002', 2024]
}
// 鉄道--------------------------------------
export const tetsudoSource = {
    id: 'tetsudo-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tetsudo/tetsudojikeiretsu2.pmtiles",

    }
}
export const tetsudoLayerRed = {
    'id': 'oh-tetsudo-red-lines',
    'type': 'line',
    'source': 'tetsudo-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'orangered',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    }
}
export const tetsudoLayerBlue = {
    'id': 'oh-tetsudo-blue-lines',
    'type': 'line',
    'source': 'tetsudo-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'dodgerblue',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    },
    'filter': ['==', 'N05_005e', '9999']
}
export const tetsudoLayerPointRed = {
    id: "oh-tetsudo-points-red",
    type: "circle",
    source: "tetsudo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'orangered',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
export const tetsudoLayerPointBlue = {
    id: "oh-tetsudo-points-blue",
    type: "circle",
    source: "tetsudo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'dodgerblue',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
    'filter': ['==', 'N05_005e', '9999']
}
// 鉄道時系列--------------------------------------
export const tetsudojikeiretsuSource = {
    id: 'tetsudojikeiretsu-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tetsudo/tetsudojikeiretsu2.pmtiles",

    }
}
export const tetsudojikeiretsuLayerPoint = {
    id: "oh-tetsudojikeiretsu-points",
    type: "circle",
    source: "tetsudojikeiretsu-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'white',  // 固定の赤色
        'circle-radius': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
    'filter':
        ['all',
            ['<=', ['number', ['to-number', ['get', 'N05_005b']]], 2024],
            ['>=', ['number', ['to-number', ['get', 'N05_005e']]], 2024]]
}
export const tetsudojikeiretsuLayerBlue = {
    'id': 'oh-tetsudojikeiretsu-blue-lines',
    'type': 'line',
    'source': 'tetsudojikeiretsu-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'dodgerblue',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    },
    'filter':
        ['all',
            ['<=', ['number', ['to-number', ['get', 'N05_005b']]], 2024],
            ['>=', ['number', ['to-number', ['get', 'N05_005e']]], 2024]]
}
// export const tetsudojikeiretsuLayerRed = {
//     'id': 'oh-tetsudojikeiretsu-red-lines',
//     'type': 'line',
//     'source': 'tetsudojikeiretsu-source',
//     "source-layer": "line",
//     'layout': {
//         'line-join': 'round',
//         'line-cap': 'round'
//     },
//     'paint': {
//         'line-color': '#FF0000',
//         'line-width': 5,
//         'line-blur': 0.8,
//         'line-opacity':1
//     },
//     'filter': ['==', 'N06_002', 2024]
// }
// 標準地図--------------------------------------------------------------------------------------------------------------
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
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256
    }
}
export const seamlessphotoLayer = {
    'id': 'oh-seamlessphoto',
    'source': seamlessphotoSource.id,
    'type': 'raster',
}
// ---------------------------------------------------------------------------------------------------------------------
// PLATEAU建物（PMTiles）ソース
export const plateauPmtilesSource = {
    id: "plateauPmtiles", obj:{
        type: "vector",
        // url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2022_LOD1.pmtiles",
        url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2023_LOD0.pmtiles",
        minzoom: 16,
        maxzoom: 16,
        attribution: '<a href="https://github.com/shiwaku/mlit-plateau-bldg-pmtiles">mlit-plateau-bldg-pmtiles</a>'
    }
}
export const plateauPmtilesLayer = {
    'id': 'oh-plateauPmtiles',
    'source': 'plateauPmtiles',
    // 'source-layer': "PLATEAU",
    'source-layer': "PLATEAU_2023_LOD0",
    "minzoom": 14,
    "maxzoom": 23,
    'type': 'fill-extrusion',
    'paint': {
        "fill-extrusion-color": '#797979',
        "fill-extrusion-opacity": 1.0,
        // "fill-extrusion-height": ["get", "measuredHeight"]
        "fill-extrusion-height": ["get", "measured_height"]
    }
}
// 岐阜県CS立体図---------------------------------------------------------------------------------------------------------
export const csGifuSource = {
    id: 'csGifu', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://kenzkenz2.xsrv.jp/gihucs/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms'
    }
}
export const csGifuLayer = {
    'id': 'oh-csGifuLayer',
    'type': 'raster',
    'source': 'csGifu'
}
// 能登CS立体図------------------------------------------------------------------------------------------------------
export const csNotoSource = {
    id: 'csNotoSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://www2.ffpri.go.jp/soilmap/tile/cs_noto/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
export const csNotoLayer = {
    'id': 'oh-csNotoLayer',
    'type': 'raster',
    'source': 'csNotoSource',
    // paint: {
    //     "raster-resampling": "nearest" // ぼやけを防ぐために「nearest」を使用
    // }
}
// 静岡県県CS立体図------------------------------------------------------------------------------------------------------
export const csShizuokaSource = {
    id: 'csShizuokaSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://kenzkenz3.xsrv.jp/cs/shizuoka/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
export const csShizuokaLayer = {
    'id': 'oh-csShizuokaLayer',
    'type': 'raster',
    'source': 'csShizuokaSource',
}
// 兵庫県CS立体図------------------------------------------------------------------------------------------------------
export const csHyogoSource = {
    id: 'cs-hiyogo-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://rinya-hyogo.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
export const csHyogoLayer = {
    'id': 'oh-csHyogoLayer',
    'type': 'raster',
    'source': 'cs-hiyogo-source',
}
// 愛知県赤色立体図------------------------------------------------------------------------------------------------------
export const aichiSekisyokuSource = {
    id: 'aichiSekisyokuSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://bg.maps.pref.aichi.jp/tiles/w213665/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
        preload: 1 // 現在の範囲に隣接するタイルも事前に読み込む
    }
}
export const aichiSekisyokuLayer = {
    'id': 'oh-aichiSekisyokuLayer',
    'type': 'raster',
    'source': 'aichiSekisyokuSource',
}
// 多摩地域赤色立体地図------------------------------------------------------------------------------------------------------
export const tamaSekisyokuSource = {
    id: 'tamaSekisyokuSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tamasekisyoku/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
export const tamaSekisyokuLayer = {
    'id': 'oh-tamaSekisyokuLayer',
    'type': 'raster',
    'source': 'tamaSekisyokuSource',
}
// -------------------------------------
export const tousyoSekisyoku01Source = {
    id: 'tousyo-sekisyoku01-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku01/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
        // minzoom: 14,
        // maxzoom: 18,
    }
}
export const tousyoSekisyoku01Layer = {
    'id': 'oh-tousyoSekisyoku01Layer',
    'type': 'raster',
    'source': 'tousyo-sekisyoku01-source',
}
// -------------------------------------
export const tousyoSekisyoku02Source = {
    id: 'tousyo-sekisyoku02-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku02/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
export const tousyoSekisyoku02Layer = {
    'id': 'oh-tousyoSekisyoku02Layer',
    'type': 'raster',
    'source': 'tousyo-sekisyoku02-source',
}
// -------------------------------------
export const tousyoSekisyoku03Source = {
    id: 'tousyo-sekisyoku03-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku03/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
export const tousyoSekisyoku03Layer = {
    'id': 'oh-tousyoSekisyoku03Layer',
    'type': 'raster',
    'source': 'tousyo-sekisyoku03-source',
}
// -------------------------------------
export const tousyoSekisyoku04Source = {
    id: 'tousyo-sekisyoku04-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku04/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
export const tousyoSekisyoku04Layer = {
    'id': 'oh-tousyoSekisyoku04Layer',
    'type': 'raster',
    'source': 'tousyo-sekisyoku04-source',
}
// -------------------------------------
export const tousyoSekisyoku05Source = {
    id: 'tousyo-sekisyoku05-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku05/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
export const tousyoSekisyoku05Layer = {
    'id': 'oh-tousyoSekisyoku05Layer',
    'type': 'raster',
    'source': 'tousyo-sekisyoku05-source',
}
// -------------------------------------
export const tousyoSekisyoku06Source = {
    id: 'tousyo-sekisyoku06-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku06/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
export const tousyoSekisyoku06Layer = {
    'id': 'oh-tousyoSekisyoku06Layer',
    'type': 'raster',
    'source': 'tousyo-sekisyoku06-source',
}
// 大阪府CS立体地図------------------------------------------------------------------------------------------------------
export const csOsakaSource = {
    id: 'csOsakaSource', obj: {
        type: 'raster',
        tiles: ['https://xs489works.xsrv.jp/raster-tiles/pref-osaka/osaka-cs-tiles/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
    }
}
export const csOsakaLayer = {
    'id': 'oh-csOsakaLayer',
    'type': 'raster',
    'source': 'csOsakaSource',
}
// 川だけ地形地図------------------------------------------------------------------------------------------------------
export const kawadakeSource = {
    id: 'kawadake-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://www.gridscapes.net/AllRivers/1.0.0/t/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
        // crossOrigin: 'anonymous',
        minzoom: 5,
        maxzoom: 14
    }
}
export const kawddakeLayer = {
    'id': 'oh-kawadakeLayer',
    'type': 'raster',
    'source': 'kawadake-source',
}
// 川と流域地図------------------------------------------------------------------------------------------------------
export const ryuikiSource = {
    id: 'ryuiki-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://tiles.dammaps.jp/ryuiki_t/1/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
        minzoom: 5,
        maxzoom: 14
    }
}
export const ryuikiLayer = {
    'id': 'oh-ryuikiLayer',
    'type': 'raster',
    'source': 'ryuiki-source',
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
    source: "amx-a-pmtiles",
    "source-layer": "fude",
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
// 幕末近世ソース --------------------------------------------------------------------------------------------
export const bakumatsuSource = {
    id: "bakumatsu", obj: {
        type: "vector",
        // url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bakumatsu/b3.pmtiles",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bakumatsu/b41.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
// 幕末近世レイヤー
export const bakumatsuLayer = {
    id: "oh-bakumatsu",
    type: "fill",
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'fill-color': ['get', 'random_color'],  // フィーチャのプロパティ 'color' から色を取得
        'fill-opacity': 1  // 透明度を設定
    }
}
export const bakumatsuLayerKokudaka = {
    id: "oh-bakumatsu-kokudaka",
    type: "fill",
    source: "bakumatsu",
    "source-layer": "b41",
    // paint: {
    //     "fill-color": "rgba(254, 217, 192, 0.7)",
    //     "fill-outline-color": "rgba(255, 0, 0, 1)",
    // },
    // 'paint': {
    //     'fill-color': [
    //         'match',
    //         ['get', 'PREF'], // Get the 'category' property from the data
    //         '45', '#f28cb1', // Color for category A
    //         'B', '#3bb2d0', // Color for category B
    //         '#ccc' // Default color (if no match)
    //     ],
    // },
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 'white',   // Color for low values
            10000000, 'red', // Intermediate value
            50000000, 'black' // Color for high values
        ]
    }
}
export const bakumatsuLayerHeight = {
    id: 'oh-bakumatsu-height',
    type: 'fill-extrusion',
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 100,
            50000000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 'white',
            10000000, 'red',
            50000000, 'black'
        ]
    }
}
export const bakumatsuLayerHan = {
    id: "oh-bakumatsu-han",
    type: "fill",
    source: "bakumatsu",
    "source-layer": "b41",
    'paint': {
        'fill-color': [
            // 'match',
            // ['get', '領分１'], '幕領', 'rgba(255,0,0,0.7)',
            // '#ccc' // Default color (if no match)
            'case',
            ['>', ['index-of', '藩', ['get', '領分１']], -1], 'rgba(104,52,154,0.7)',
            ['>', ['index-of', '幕領', ['get', '領分１']], -1], 'rgba(255,0,0,0.7)',
            ['>', ['index-of', '皇室領', ['get', '領分１']], -1], 'rgba(255,215,0,0.7)',
            ['>', ['index-of', '社寺領', ['get', '領分１']], -1], 'rgba(0,0,0,0.7)',
            'rgba(0,0,255,0.7)'
        ]
    }
    // paint: {
    //     'fill-color': '#d7352b',
    //     'fill-opacity': 0.6,
    // },
    // //別海町のジオコード（01691）で始まる町丁目のみ表示されるようにフィルターをセット
    // filter: ['==', ['index-of', '吉村', ['get', '村名']], 0]
}
export const bakumatsuLayerLine = {
    id: "oh-bakumatsuLine",
    type: "line",
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'line-color': '#000',
        // 'line-width': 0.5
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
export const bakumatsuLayerLabel = {
    id: "oh-bakumatsuLabel",
    type: "symbol",
    source: "bakumatsu",
    "source-layer": "b41",
    'layout': {
        'text-field': ['get', '村名0'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0.5, 0],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// 小学校ソース --------------------------------------------------------------------------------------------
export const syogakkoR05Source = {
    id: "syogakkoR05Source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/syogakko/r05/s4joint.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
// 小学校レイヤー
export const syogakkoR05Layer = {
    id: "oh-syogakkoR05",
    type: "fill",
    source: "syogakkoR05Source",
    "source-layer": "s4polygon",
    paint: {
        'fill-color': ['get', 'random_color'],  // フィーチャのプロパティ 'color' から色を取得
        'fill-opacity': 0.8  // 透明度を設定
    }

}
export const syogakkoR05LayerLine = {
    id: "oh-syogakkoR05_line",
    type: "line",
    source: "syogakkoR05Source",
    "source-layer": "s4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
export const syogakkoR05LayerLabel = {
    id: "oh-syogakkoR05-label",
    type: "symbol",
    source: "syogakkoR05Source",
    "source-layer": "s4point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
export const syogakkoR05LayerPoint = {
    id: "oh-syogakkoR05_point",
    type: "circle",
    source: "syogakkoR05Source",
    "source-layer": "s4point",
    'paint': {
        'circle-color': '#000',  // 固定の赤色
        'circle-radius': 6  // 半径を設定
    }
}
// 中学校ソース --------------------------------------------------------------------------------------------
export const cyugakuR05Source = {
    id: "cyugakuR05Source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/cyugakko/r05/t4joint.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
// 中学校レイヤー
export const cyugakuR05Layer = {
    id: "oh-cyugakuR05",
    type: "fill",
    source: "cyugakuR05Source",
    "source-layer": "t4polygon",
    paint: {
        'fill-color': ['get', 'random_color'],  // フィーチャのプロパティ 'color' から色を取得
        'fill-opacity': 0.8  // 透明度を設定
    }

}
export const cyugakuR05LayerLine = {
    id: "oh-cyugakuR05_line",
    type: "line",
    source: "cyugakuR05Source",
    "source-layer": "t4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
export const cyugakuR05LayerLabel = {
    id: "oh-cyugakuR05-label",
    type: "symbol",
    source: "cyugakuR05Source",
    "source-layer": "t4point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
export const cyugakuR05LayerPoint = {
    id: "oh-cyugakuR05_point",
    type: "circle",
    source: "cyugakuR05Source",
    "source-layer": "t4point",
    'paint': {
        'circle-color': '#000',
        'circle-radius': 6
    }
}
// 地形分類タイルソース --------------------------------------------------------------------------------------------
export const chikeibunruiSource = {
    id: "chikeibunruiSource", obj: {
        type: "vector",
        tiles: ["https://optgeo.github.io/unite-one/zxy/{z}/{x}/{y}.pbf"],
        attribution: "国土地理院ベクトルタイル提供実験",
        minzoom: 10,
        maxzoom: 12
    }
}
export const chikeibunruiLayer = {
    id: "oh-chikeibunrui",
    type: "fill",
    source: "chikeibunruiSource",
    "source-layer": "one",
    "paint": {
        "fill-color": [
            "match",
            [
                "get",
                "code"
            ],
            "山地",
            "#d9cbae",
            "崖・段丘崖",
            "#9466ab",
            "地すべり地形",
            "#cc99ff",
            "台地・段丘",
            "#ffaa00",
            "山麓堆積地形",
            "#99804d",
            "扇状地",
            "#cacc60",
            "自然堤防",
            "#ffff33",
            "天井川",
            "#fbe09d",
            "砂州・砂丘",
            "#ffff99",
            "凹地・浅い谷",
            "#a3cc7e",
            "氾濫平野",
            "#bbff99",
            "後背低地・湿地",
            "#00d1a4",
            "旧河道",
            "#6699ff",
            "落堀",
            "#1f9999",
            "河川敷・浜",
            "#9f9fc4",
            "水部",
            "#e5ffff",
            "旧水部",
            "#779999",
            "#f00"
        ]
    },
}
// 日本歴史地名大系ソース --------------------------------------------------------------------------------------------
export const nihonrekishiSource = {
    id: "nihonrekishiSouce", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chimei/c.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
// 日本歴史地名大系レイヤー
export const nihonrekishiLayer = {
    id: "oh-nihonrekishi",
    type: "circle",
    source: "nihonrekishiSouce",
    "source-layer": "point",
    'paint': {
        'circle-color': 'red',
        'circle-radius': 6
    }
}
export const nihonrekishiLayerLabel = {
    id: "oh-nihonrekishi-label",
    type: "symbol",
    source: "nihonrekishiSouce",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '名称'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// ---------------------------------------------------------------------------------------------------------------------
export const iryokikanSource = {
    id: "iryokikanSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/iryo/i.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
export const iryokikanLayer = {
    id: "oh-iryokikan",
    type: "circle",
    source: "iryokikanSource",
    "source-layer": "i",
    'paint': {
        'circle-color': [
            'match',
            ['get', 'P04_001'],
            1, 'red',
            2, 'green',
            3, 'blue',
            'black'
        ],
        'circle-radius': 6
    }
}
export const iryokikanLayerLabel = {
    id: "oh-iryokikanLayer-label",
    type: "symbol",
    source: "iryokikanSource",
    "source-layer": "i",
    'layout': {
        'text-field': ['get', 'P04_002'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0, 2],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
// 100mメッシュソース --------------------------------------------------------------------------------------------
export const m100mSource = {
    id: "m100mSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/100m/100m.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m100mLayer = {
    id: "oh-m100m",
    type: "fill",
    source: "m100mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'PopT'],
            0, 'white',   // Color for low values
            500, 'red', // Intermediate value
            1400, 'black' // Color for high values
        ]
    }
}
export const m100mLayerLine = {
    id: "oh-m100m_line",
    type: "line",
    source: "m100mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m100mLayerLabel = {
    id: "oh-m100m-label",
    type: "symbol",
    source: "m100mSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0, 0],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 15
}
export const m100mLayerHeight = {
    id: 'oh-m100mLayer-height',
    type: 'fill-extrusion',
    source: "m100mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            1400, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            500, 'red',
            1400, 'black'
        ]
    }
}
// 250mメッシュソース --------------------------------------------------------------------------------------------
export const m250mSource = {
    id: "m250mSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/250m/250m.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m250mLayer = {
    id: "oh-m250m",
    type: "fill",
    source: "m250mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',   // Color for low values
            1000, 'red', // Intermediate value
            3000, 'black' // Color for high values
        ]
    }
}
export const m250mLayerLine = {
    id: "oh-m250m_line",
    type: "line",
    source: "m250mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m250mLayerLabel = {
    id: "oh-m250m-label",
    type: "symbol",
    source: "m250mSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0, 0],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
export const m250mLayerHeight = {
    id: 'oh-m250mLayer-height',
    type: 'fill-extrusion',
    source: "m250mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            3000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            1000, 'red',
            3000, 'black'
        ]
    }
}
// 500mメッシュソース --------------------------------------------------------------------------------------------
export const m500mSource = {
    id: "m500mSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/500m/500m2.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m500mLayer = {
    id: "oh-m500m",
    type: "fill",
    source: "m500mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            5000, 'red',
            17500, 'black'
        ]
    }
}
export const m500mLayerLine = {
    id: "oh-m500m_line",
    type: "line",
    source: "m500mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m500mLayerLabel = {
    id: "oh-m500m-label",
    type: "symbol",
    source: "m500mSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['Noto Sans CJK JP Bold'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
export const m500mLayerHeight = {
    id: 'oh-m500mLayer-height',
    type: 'fill-extrusion',
    source: "m500mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            17500, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            5000, 'red',
            17500, 'black'
        ]
    }
}
// 1kmメッシュソース --------------------------------------------------------------------------------------------
export const m1kmSource = {
    id: "m1kmSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/1km/1km2.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m1kmLayer = {
    id: "oh-m1km",
    type: "fill",
    source: "m1kmSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            10000, 'red',
            35000, 'black'
        ]
    }
}
export const m1kmLayerLine = {
    id: "oh-m1km_line",
    type: "line",
    source: "m1kmSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m1kmLayerLabel = {
    id: "oh-m1km-label",
    type: "symbol",
    source: "m1kmSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['Noto Sans CJK JP Bold'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
export const m1kmLayerHeight = {
    id: 'oh-m1kmLayer-height',
    type: 'fill-extrusion',
    source: "m1kmSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', 'jinko'],
            0, 100,
            35000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', 'jinko'],
            0, 'white',
            10000, 'red',
            35000, 'black'
        ]
    }
}
// ---------------------------------------------------------------------------------------------------------------------
// 全国旧石器
export const kyusekkiSource = {
    id: "kyusekkiSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kyusekki/kyusekki.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
export const kyusekkiLayer = {
    id: "oh-kyusekki",
    type: "circle",
    source: "kyusekkiSource",
    "source-layer": "point",
    "minzoom":12,
    'paint': {
        'circle-color': '#3cb371',
        'circle-radius': 8,
    }
}
export const kyusekkiLayerHeatmap = {
    id: "oh-kyusekki-heatmap",
    type: "heatmap",
    source: "kyusekkiSource",
    "source-layer": "point",
    "maxzoom":12,
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
            "rgba(60, 179, 113, 0.6)",
            // 1に近づくほど密度が高い
            1,
            "rgba(255, 215, 0, 0.8)",
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
            20,
            5,
            20,
            14,
            20,
            50,
            20
        ],
    }
}
// 河川ソース --------------------------------------------------------------------------------------------
export const kasenSource = {
    id: "kasenSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kasen/kasen.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const kasenLayer = {
    id: "oh-kasen",
    type: "line",
    source: "kasenSource",
    "source-layer": "line",
    paint: {
        'line-color': 'blue',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            4, 0.2,
            6, 0.5,
            8, 0.7,
            11, 1.0,
            12, 1.5,
            14, 2,
            16, 3,
            18, 6,
            30, 10,
        ]
    },
}
export const kasenLayerLabel = {
    id: "oh-kasen-label",
    type: "symbol",
    source: "kasenSource",
    "source-layer": "line",
    'layout': {
        'text-field': ['get', 'W05_004'],
        'text-font': ['Noto Sans CJK JP Bold'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
// ---------------------------------------------------------------------------------------------------------------------
// 災害伝承碑
export const densyohiSource = {
    id: "densyohiSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/densyohi/densyohi.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
export const densyohiLayer = {
    id: "oh-densyohi",
    type: "circle",
    source: "densyohiSource",
    "source-layer": "point",
    'paint': {
        'circle-color': '#3cb371',
        'circle-radius': 8,
    }
}
export const densyohiLayer2 = {
    id: "oh-densyohi",
    type: "symbol",
    source: "densyohiSource",
    "source-layer": "point",
    "layout": {
        "icon-image": "densyouhi",  // JSONに記述されたアイコン名を指定
        "icon-size": 1.0
    }
}
// did------------------------------------------------------------------------------------------------------------------
export const didSource = {
    id: "did-source", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/did/did.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const didLayer = {
    id: "oh-did",
    type: "fill",
    source: "did-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
export const didLayerLine = {
    id: "oh-did_line",
    type: "line",
    source: "did-source",
    "source-layer": "4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
// 選挙区----------------------------------------------------------------------------------------------------------------
export const senkyokuSource = {
    id: "senkyoku-source", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/senkyoku/senkyoku2022.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const senkyokuLayer = {
    id: "oh-senkyoku",
    type: "fill",
    source: "senkyoku-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
export const senkyokuLayerLine = {
    id: "oh-senkyoku_line",
    type: "line",
    source: "senkyoku-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
export const senkyokuLayerLabel = {
    id: "oh-senkyoku-label",
    type: "symbol",
    source: "senkyoku-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'kuname'],
        'text-font': ['Noto Sans CJK JP Bold'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// 公示価格--------------------------------------------------------------------------------------------------------------
export const kojiSource = {
    id: "koji-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kojikakaku/kojikakaku2.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const kojiLayerLabel = {
    id: "oh-koji-label",
    type: "symbol",
    source: "koji-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'L01_025'],
        'text-font': ['Noto Sans CJK JP Bold'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
export const kojiLayerPoint = {
    id: "oh-koji_point",
    type: "circle",
    source: "koji-source",
    "source-layer": "point",
    'paint': {
        'circle-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'L01_008']],
            0, 'white',
            500000, 'red',
            50000000, 'black'
        ],
        'circle-stroke-color': 'black',
        'circle-stroke-width': 1,
        'circle-radius': 8  // 半径を設定
    }
}
export const kojilayerheight = {
    id: 'oh-koji-height',
    type: 'fill-extrusion',
    source: "koji-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['^', ["to-number",['get', 'L01_008']],0.8],
            0, 100,
            4000000, 100000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['^', ["to-number",['get', 'L01_008']],0.8],
            0, 'white',
            50000, 'red',
            4000000, 'black'
        ]
    }
}
// 道の駅 --------------------------------------------------------------------------------------------
export const michinoekiSource = {
    id: "michinoeki-source", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/michinoeki/michinoeki.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
export const michinoekiLayer = {
    id: "oh-michinoeki",
    type: "circle",
    source: "michinoeki-source",
    "source-layer": "michinoeki",
    'paint': {
        'circle-color': 'navy',
        'circle-radius':[
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            2, 1,
            4, 3,
            7, 6,
            11, 10
            ]
    }
}
export const michinoekiLayerLabel = {
    id: "oh-michinoeki-label",
    type: "symbol",
    source: "michinoeki-source",
    "source-layer": "michinoeki",
    'layout': {
        'text-field': ['get', 'P35_006'],
        'text-font': ['Noto Sans CJK JP Bold'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 東京地震----------------------------------------------------------------------------------------------------------------
export const tokyojishinSource = {
    id: "tokyojishin-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tokyojishin/tokyojishin.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
export const tokyojishinLayerSogo = {
    id: "oh-tokyojishin",
    type: "fill",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', '総合_ラ'],
            1, 'rgb(162,209,229,0.8)',
            2, 'rgb(125,170,118,0.8)',
            3, 'rgb(206,135,52,0.8)',
            4, 'rgb(213,64,43,0.8)',
            5, 'rgb(79,19,19,0.8)',
            'red' // Default color (if no match)
        ],
    },
}
export const tokyojishinLayer = {
    id: "oh-tokyojishin",
    type: "fill",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
export const tokyojishinLayerLine = {
    id: "oh-tokyojishin_line",
    type: "line",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
export const tokyojishinLayerLabel = {
    id: "oh-tokyojishin-label",
    type: "symbol",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', '町丁目名'],
        'text-font': ['Noto Sans CJK JP Bold'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 16
}
// export const tokyojishinheight = {
//     id: 'oh-tokyojishin-height',
//     type: 'fill-extrusion',
//     source: "tokyojishin-source",
//     "source-layer": "polygon",
//     paint: {
//         'fill-extrusion-height': [
//             'interpolate',
//             ['linear'],
//             ["to-number",['get', '総合_順']],
//             0, 10,
//             6000, 3000
//         ],
//         'fill-extrusion-color': [
//             'interpolate',
//             ['linear'],
//             ["to-number",['get', '総合_順']],
//             0, 'white',
//             4000, 'red',
//             6000, 'black'
//         ]
//     }
// }
export const tokyojishinheightSogo = {
    id: 'oh-tokyojishin-height',
    type: 'fill-extrusion',
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'match',
            ['get', '総合_ラ'],
            1, 100,
            2, 500,
            3, 1500,
            4, 2000,
            5, 2500,
            0 // Default color (if no match)
        ],
        'fill-extrusion-color': [
            'match',
            ['get', '総合_ラ'],
            1, 'rgb(162,209,229,0.8)',
            2, 'rgb(125,170,118,0.8)',
            3, 'rgb(206,135,52,0.8)',
            4, 'rgb(213,64,43,0.8)',
            5, 'rgb(79,19,19,0.8)',
            'red' // Default color (if no match)
        ]
    }
}
// ---------------------------------------------------------------------------------------------------------------------
const layers01 = [
    {
        id: 1,
        label: "基本地図",
        nodes: [
            {
                id: 'oh-stdLayer',
                label: "標準地図",
                source: stdSource,
                layers: [stdLayer]
            },
            {
                id: 'oh-plateauPmtiles',
                label: "PLATEAU建物",
                source: plateauPmtilesSource,
                layers: [plateauPmtilesLayer]
            },
        ]
    },
    {
        id: 'syashin',
        label: "航空写真",
        nodes: [
            {
                id: 'oh-seamlessphoto',
                label: "最新写真",
                source: seamlessphotoSource,
                layers: [seamlessphotoLayer]
            },
        ]
    },
    {
        id: 'tokei',
        label: "統計",
        nodes: [
            {
                id: 'oh-syochiiki',
                label: "国勢調査小地域人口ピラミッド",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikLayerLine,syochiikiLayerLabel]
            },
            {
                id: 'oh-syochiiki-2',
                label: "国勢調査小地域人口密度3D",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikiLayerHeight]
            },
            {
                id: 'oh-m100m',
                label: "100mメッシュ人口",
                source: m100mSource,
                layers: [m100mLayer,m100mLayerLine,m100mLayerLabel]
            },
            {
                id: 'oh-m100m-3d',
                label: "100mメッシュ人口3D",
                source: m100mSource,
                layers: [m100mLayer,m100mLayerLine,m100mLayerLabel,m100mLayerHeight]
            },
            {
                id: 'oh-m250m',
                label: "250mメッシュ人口",
                source: m250mSource,
                layers: [m250mLayer,m250mLayerLine,m250mLayerLabel]
            },
            {
                id: 'oh-m250m-3d',
                label: "250mメッシュ人口3D",
                source: m250mSource,
                layers: [m250mLayer,m250mLayerLine,m250mLayerLabel,m250mLayerHeight]
            },
            {
                id: 'oh-m500m',
                label: "500mメッシュ人口",
                source: m500mSource,
                layers: [m500mLayer,m500mLayerLine,m500mLayerLabel]
            },
            {
                id: 'oh-m500m-3d',
                label: "500mメッシュ人口3D",
                source: m500mSource,
                layers: [m500mLayer,m500mLayerLine,m500mLayerLabel,m500mLayerHeight]
            },
            {
                id: 'oh-m1km',
                label: "1kmメッシュ人口",
                source: m1kmSource,
                layers: [m1kmLayer,m1kmLayerLine,m1kmLayerLabel]
            },
            {
                id: 'oh-m1km-3d',
                label: "1kmメッシュ人口3D",
                source: m1kmSource,
                layers: [m1kmLayer,m1kmLayerLine,m1kmLayerLabel,m1kmLayerHeight]
            },
            {
                id: 'oh-did',
                label: "人口集中地区",
                source: didSource,
                layers: [didLayer,didLayerLine]
            },
        ]
    },
    {
        id: 'doro',
        label: "鉄道、道路等",
        nodes: [
            {
                id: 'oh-tetsudo',
                label: "鉄道（廃線は赤色）",
                source: tetsudoSource,
                layers: [tetsudoLayerRed,tetsudoLayerBlue,tetsudoLayerPointRed,tetsudoLayerPointBlue],
            },
            {
                id: 'oh-tetsudojikeiretsu',
                label: "鉄道時系列",
                source: tetsudojikeiretsuSource,
                layers: [tetsudojikeiretsuLayerBlue,tetsudojikeiretsuLayerPoint],
                ext: {name:'extTetsudojikeiretsu',parameters:[]}
            },
            {
                id: 'oh-highway',
                label: "高速道路時系列",
                source: highwaySource,
                layers: [highwayLayerGreen,highwayLayerRed],
                ext: {name:'extHighway',parameters:[]}
            },
            {
                id: 'oh-michinoeki',
                label: "道の駅",
                source: michinoekiSource,
                layers: [michinoekiLayer,michinoekiLayerLabel],
            },
        ]
    },
    {
        id: 'skosodate',
        label: "子育て",
        nodes: [
            {
                id: 'oh-syogakkoR05',
                label: "小学校（R05）",
                source: syogakkoR05Source,
                layers: [syogakkoR05Layer,syogakkoR05LayerLine,syogakkoR05LayerLabel,syogakkoR05LayerPoint]
            },
            {
                id: 'oh-cyugakuR05',
                label: "中学校（R05）",
                source: cyugakuR05Source,
                layers: [cyugakuR05Layer,cyugakuR05LayerLine,cyugakuR05LayerLabel,cyugakuR05LayerPoint]
            },
            {
                id: 'oh-iryokikan',
                label: "医療機関（R02）",
                source: iryokikanSource,
                layers: [iryokikanLayer,iryokikanLayerLabel]
            }
        ]
    },
    {
        id: 'bakumatsu',
        label: "幕末期近世の村",
        nodes: [
            {
                id: 'oh-bakumatsu',
                label: "幕末期近世の村",
                source: bakumatsuSource,
                layers: [bakumatsuLayer, bakumatsuLayerLine, bakumatsuLayerLabel]
            },
            {
                id: 'oh-bakumatsu-kokudaka',
                label: "幕末期近世の村（石高/面積）",
                source: bakumatsuSource,
                layers: [bakumatsuLayerKokudaka,bakumatsuLayerLine,bakumatsuLayerLabel]
            },
            {
                id: 'oh-bakumatsu-kokudaka-height',
                label: "幕末期近世の村（石高/面積）3D",
                source: bakumatsuSource,
                layers: [bakumatsuLayerHeight]
            },
            {
                id: 'oh-bakumatsu',
                label: "幕末期近世の村（藩）",
                source: bakumatsuSource,
                layers: [bakumatsuLayerHan,bakumatsuLayerLine,bakumatsuLayerLabel]
            },
        ]
    },
    {
        id: 2,
        label: "自然、立体図等",
        nodes: [
            {
                id: 'oh-kawadak',
                label: "川だけ地形地図",
                source: kawadakeSource,
                layers: [kawddakeLayer]
            },
            {
                id: 'oh-ryuiki',
                label: "川と流域地図",
                source: ryuikiSource,
                layers: [ryuikiLayer]
            },
            {
                id: 'oh-kasen',
                label: "河川",
                source: kasenSource,
                layers: [kasenLayer,kasenLayerLabel]
            },
            {
                id: 'oh-chikeibunrui',
                label: "地形分類",
                source: chikeibunruiSource,
                layers: [chikeibunruiLayer]
            },
            {
                id: 'oh-csNotoLayer',
                label: "能登CS立体図",
                source: csNotoSource,
                layers: [csNotoLayer]
            },
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
                id: 'oh-csHyogoLayer',
                label: "兵庫県CS立体図",
                source: csHyogoSource,
                layers: [csHyogoLayer]
            },
            {
                id: 'oh-csShizuokaLayer',
                label: "静岡県CS立体図",
                source: csShizuokaSource,
                layers: [csShizuokaLayer]
            },
            {
                id: 'oh-tokyoSekisyokuLayer',
                label: "東京都赤色立体地図",
                sources: [tamaSekisyokuSource,
                    tousyoSekisyoku01Source,
                    tousyoSekisyoku02Source,
                    tousyoSekisyoku03Source,
                    tousyoSekisyoku04Source,
                    tousyoSekisyoku05Source,
                    tousyoSekisyoku06Source],
                layers: [tamaSekisyokuLayer,
                    tousyoSekisyoku01Layer,
                    tousyoSekisyoku02Layer,
                    tousyoSekisyoku03Layer,
                    tousyoSekisyoku04Layer,
                    tousyoSekisyoku05Layer,
                    tousyoSekisyoku06Layer]
            },
            {
                id: 'oh-aichiSekisyokuLayer',
                label: "愛知県赤色立体地図",
                source: aichiSekisyokuSource,
                layers: [aichiSekisyokuLayer]
            },
        ]
    },
    {
        id: 'iseki',
        label: "遺跡等",
        nodes: [
            {
                id: 'oh-kyusekki',
                label: "全国旧石器遺跡",
                source: kyusekkiSource,
                layers: [kyusekkiLayer,kyusekkiLayerHeatmap],
            },
        ]
    },
    {
        id: 'hazard',
        label: "ハザードマップ等",
        nodes: [
            // {
            //     id: 'oh-tokyojishin',
            //     label: "地震に関する危険度一覧(東京都)",
            //     source: tokyojishinSource,
            //     layers: [tokyojishinLayer,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheight],
            // },
            {
                id: 'oh-tokyojishin',
                label: "地震に関する危険度一覧(東京都)",
                source: tokyojishinSource,
                layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel],
            },
            {
                id: 'oh-tokyojishin3d',
                label: "地震に関する危険度一覧(東京都)3D",
                source: tokyojishinSource,
                layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheightSogo],
            },
            {
                id: 'oh-densyohi',
                label: "災害伝承碑",
                source: densyohiSource,
                layers: [densyohiLayer],
            },
        ]
    },
    {
        id: 'sonohoka',
        label: "その他",
        nodes: [
            {
                id: 'oh-senkyoku',
                label: "選挙区（2022）",
                source: senkyokuSource,
                layers:[senkyokuLayer,senkyokuLayerLine,senkyokuLayerLabel]
            },
            {
                id: 'oh-koji',
                label: "公示価格（R06）",
                source: kojiSource,
                layers:[kojiLayerPoint,kojiLayerLabel]
            },
            {
                id: 'oh-koji-3d',
                label: "公示価格（R06）3D",
                source: kojiSource,
                layers:[kojilayerheight]
            },
            {
                id: 'oh-nihonrekishi',
                label: "日本歴史地名大系",
                source: nihonrekishiSource,
                layers:[nihonrekishiLayer,nihonrekishiLayerLabel]
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
        id: 'test',
        label: "テスト",
        nodes: [
            {
                id: 'test2',
                label: "標準地図",
                nodes: [
                    {
                        id: 'test3',
                        label: "標準地図",
                        nodes: [
                            {
                                id: 'oh-stdLayer',
                                label: "テスト標準地図",
                                source: stdSource,
                                layers: [stdLayer]
                            },
                        ]
                    },
                ]
            },
        ]
    },
]
const layers02 = JSON.parse(JSON.stringify(layers01))
export const layers = {
    map01: layers01,
    map02: layers02
}