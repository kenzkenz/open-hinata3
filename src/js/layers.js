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
    'id': 'stdLayer',
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
    'id': seamlessphotoSource.id,
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
        minzoom: 16,
        maxzoom: 16,
        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/plateau">3D都市モデルPLATEAU建築物データ（国土交通省）</a>'
    }
}
export const plateauPmtilesLayer = {
    'id': 'plateauPmtiles',
    'source': 'plateauPmtiles',
    'source-layer': "PLATEAU",
    "minzoom": 16,
    "maxzoom": 23,
    'type': 'fill-extrusion',
    'paint': {
        "fill-extrusion-color": '#797979',
        "fill-extrusion-opacity": 0.7,
        "fill-extrusion-height": ["get", "measuredHeight"]
    }
}