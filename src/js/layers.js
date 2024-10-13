// function filterBy(year) {
//     const eqFilter = ['all', ['==', 'N06_002', year]];
//     const ltFilter = ['all', ['<', 'N06_002', year]];
//     const le1Filter = ['all', ['<=', 'N06_013', year],['>=', 'N06_014', year], ['==', 'N06_019', '1']];
//     const le2Filter = ['all', ['<=', 'N06_013', year],['>=', 'N06_014', year], ['==', 'N06_019', '2']];
//     const le3Filter = ['all', ['<=', 'N06_013', year],['>=', 'N06_014', year], ['==', 'N06_019', '3']];
//     const le4Filter = ['all', ['<=', 'N06_013', year],['>=', 'N06_014', year], ['==', 'N06_019', '4']];
//
//     map.setFilter('green-lines', ltFilter);
//     map.setFilter('red-lines', eqFilter);
//
//     map.setFilter('interchange-IC', le1Filter);
//     map.setFilter('interchange-SIC', le2Filter);
//     map.setFilter('interchange-JCT', le3Filter);
//     map.setFilter('interchange-other', le4Filter);
//
//     document.getElementById('year_label').textContent = year.toString() + '年';
// }

export const highwaySource = {
    id: 'highwaySource', obj: {
        'type': 'geojson',
        'data': require('@/assets/json/highway_sections_2024.geojson')
    }
}
export const highwayLayerGreen = {
    'id': 'oh-highwayLayer-green-lines',
    'type': 'line',
    'source': 'highwaySource',
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
// 能登CS立体図------------------------------------------------------------------------------------------------------
export const csNotoSource = {
    id: 'csNotoSource', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_noto/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 17
    }
}
export const csNotoLayer = {
    'id': 'oh-csNotoLayer',
    'type': 'raster',
    'source': 'csNotoSource',
}
// 静岡県県CS立体図------------------------------------------------------------------------------------------------------
export const csShizuokaSource = {
    id: 'csShizuokaSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/cs/shizuoka/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
export const csShizuokaLayer = {
    'id': 'oh-csShizuokaLayer',
    'type': 'raster',
    'source': 'csShizuokaSource',
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
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bakumatsu/b3.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
// 幕末近世レイヤー
export const bakumatsuLayer = {
    id: "oh-bakumatsu",
    type: "fill",
    source: "bakumatsu",
    "source-layer": "b3",
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
            ['get', '石高計'],
            0, 'white',   // Color for low values
            // 1000, '#f1f075', // Intermediate value
            3000, 'red' // Color for high values
        ]
    }
}
export const bakumatsuLayerLine = {
    id: "oh-bakumatsuLine",
    type: "line",
    source: "bakumatsu",
    "source-layer": "b3",
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
    "source-layer": "b3",
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
            {
                id: 'oh-highway',
                label: "高速道路時系列",
                source: highwaySource,
                layers: [highwayLayerGreen,highwayLayerRed]
            },
            {
                id: 'oh-bakumatsu',
                label: "幕末近世の村",
                source: bakumatsuSource,
                layers: [bakumatsuLayer,bakumatsuLayerLine,bakumatsuLayerLabel]
            },
        ]
    },
    {
        id: 2,
        label: "立体図等",
        nodes: [
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
                id: 'oh-csShizuokaLayer',
                label: "静岡県CS立体図",
                source: csShizuokaSource,
                layers: [csShizuokaLayer]
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