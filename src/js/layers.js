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
                layer: stdLayer
            },
            {
                id: 'oh-seamlessphoto',
                label: "最新写真",
                source: seamlessphotoSource,
                layer: seamlessphotoLayer
            },
            {
                id: 'oh-plateauPmtiles',
                label: "PLATEAU建物",
                source: plateauPmtilesSource,
                layer: plateauPmtilesLayer
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
                layer: csGifuLayer
            },
            {
                id: 'oh-csOsakaLayer',
                label: "大阪府CS立体図",
                source: csOsakaSource,
                layer: csOsakaLayer
            },
            {
                id: 'oh-tamaSekisyokuLayer',
                label: "東京都多摩地域赤色立体地図",
                source: tamaSekisyokuSource,
                layer: tamaSekisyokuLayer
            },
        ]
    }
]
const layers02 = JSON.parse(JSON.stringify(layers01))
export const layers = {
    map01: layers01,
    map02: layers02
}