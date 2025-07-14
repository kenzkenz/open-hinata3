import store from '@/store'
import codeShizen from "@/js/codeShizen"
import codeShizenOriginal from "@/js/codeShizenOriginal"
import maplibregl from "maplibre-gl"
import axios from "axios";
import muni from "@/js/muni";
import pyramid from "@/js/pyramid";
import * as turf from '@turf/turf'
import {extractAndOpenUrls, getMaxZIndex, queryFGBWithPolygon, wsg84ToJgd} from "@/js/downLoad";
import {feature} from "@turf/turf";
import {transformCoordinates} from "@/App";
// import { Viewer } from 'mapillary-js';
// import {Viewer, ViewerOptions} from 'mapillary-js';
import { Viewer, CameraControls, RenderMode, TransitionMode } from 'mapillary-js';
export const popups = []

console.log(store.state.selectedLayers)

function isIphone() {
    return /iPhone/i.test(navigator.userAgent);
}

// Turf.jsを使用して面積、周長、頂点数を計算する関数
export function calculatePolygonMetrics(polygon) {
    try {
        // 面積の計算（㎡単位で取得）
        const areaRaw = turf.area(polygon); // m2
        // 面積のフォーマット
        let area;
        if (areaRaw >= 1_000_000) {
            // 100万m²以上はkm²で
            area = '約' + (areaRaw / 1_000_000).toFixed(2) + 'km²';
        } else if (areaRaw >= 10_000) {
            // 1万m²以上は1k m²表記
            area = '約' + (areaRaw / 1_000).toFixed(1) + 'k m²';
        } else {
            // それ未満はそのままm²
            area = '約' + areaRaw.toFixed(1) + 'm²';
        }
        // 周長の計算（m単位で取得）
        const perimRaw = turf.length(polygon, { units: 'meters' });
        // 周長のフォーマット
        let perimeter;
        if (perimRaw >= 1000) {
            perimeter = '約' + (perimRaw / 1000).toFixed(2) + 'km';
        } else {
            perimeter = '約' + perimRaw.toFixed(1) + 'm';
        }
        // 頂点数の計算
        const coordinates = polygon.geometry.coordinates[0];
        let vertexCount = coordinates.length;
        if (
            coordinates[0][0] === coordinates[vertexCount - 1][0] &&
            coordinates[0][1] === coordinates[vertexCount - 1][1]
        ) {
            vertexCount -= 1;
        }
        return {
            area: area,
            perimeter: perimeter,
            vertexCount: vertexCount
        };
    } catch (error) {
        console.error('面積・周長・頂点数の計算中にエラーが発生しました:', error);
    }
}

/**
 * LineString の各区間の距離と、始点・終点の座標を返す
 * @param {GeoJSON} lineGeoJSON - LineString形式のGeoJSON
 * @returns {{
 *   segments: { index: number, from: number[], to: number[], distance: string }[],
 *   total: string
 * }}
 */
export function calculateLineSegmentDetails(lineGeoJSON) {
    try {
        const coords = lineGeoJSON.geometry.coordinates;
        if (!coords || coords.length < 2) throw new Error("2点以上の座標が必要です");

        let totalLength = 0;
        const segments = [];

        for (let i = 0; i < coords.length - 1; i++) {
            const from = coords[i];
            const to = coords[i + 1];
            const segment = turf.lineString([from, to]);
            const dist = turf.length(segment, { units: 'kilometers' }); // km単位
            totalLength += dist;

            const distanceLabel = dist >= 1
                ? `約${dist.toFixed(2)}km`
                : `約${(dist * 1000).toFixed(0)}m`;

            segments.push({
                index: i + 1,
                from: from,  // [lng, lat]
                to: to,      // [lng, lat]
                distance: distanceLabel
            });
        }

        const totalFormatted = totalLength >= 1
            ? `合計距離: 約${totalLength.toFixed(2)}km`
            : `合計距離: 約${(totalLength * 1000).toFixed(0)}m`;

        return {
            segments,
            total: totalFormatted
        };
    } catch (error) {
        console.error('区間情報の計算中にエラーが発生しました:', error);
        return null;
    }
}

const legend_shinsuishin = [
    { r: 247, g: 245, b: 169, title: '0.5m未満' },
    { r: 255, g: 216, b: 192, title: '0.5～3.0m' },
    { r: 255, g: 183, b: 183, title: '3.0～5.0m' },
    { r: 255, g: 145, b: 145, title: '5.0～10.0m' },
    { r: 242, g: 133, b: 201, title: '10.0～20.0m' },
    { r: 220, g: 122, b: 220, title: '20.0m以上' }
]
const legend_shitchi = [
    { r: 254, g: 227, b: 200, title: ['砂礫地',"土地の表面が砂と小石のところ。砂や礫でできた荒地、風の運搬作用によって砂が堆積してできた砂丘も含む。"] },
    { r: 254, g: 200, b: 200, title: ['泥地','常にぬかるんでいて植物が存在せず、通過が困難な土地。'] },
    { r: 228, g: 172, b: 123, title: ['泥炭地','｢泥炭地｣と記された範囲。'] },
    { r: 200, g: 200, b: 228, title: ['湿地','概ね湿潤で葦(あし)などの植物が生えるような土地のこと。'] },
    { r: 209, g: 234, b: 255, title: ['干潟・砂浜','満潮時には、海面に没する地形。'] },
    { r: 147, g: 200, b: 254, title: ['河川、湖沼、海面','河川や水路、湖沼と記された範囲及び、河口部から海上の範囲。養魚場や貯木場、小規模な農業用の池なども含む。'] },
    { r: 251, g: 247, b: 176, title: ['田（水田、陸田）','水田は稲や蓮などを栽培する田で四季を通じて水がある土地のこと。陸田は稲を栽培する田で冬季に水が涸れ、歩けるような土地のこと。乾田とも言う。'] },
    { r: 225, g: 227, b: 118, title: ['深田','膝ぐらいまでぬかる泥深い田もしくは小舟を用いて耕作するような田のこと。沼田とも言う。'] },
    { r: 227, g: 227, b: 200, title: ['塩田','海水から食塩を取るために設けた砂浜の設備。'] },
    { r: 162, g: 222, b: 162, title: ['草地','牧草を栽培する土地や｢草｣と記された範囲。ただし、山地や台地上のものは取得しない。'] },
    { r: 173, g: 200, b: 147, title: ['荒地','開墾されたことがないまたは、かつては開墾されていたが長期間荒れ果てたところ。ただし、山地や台地上のものは取得しない。'] },
    { r: 119, g: 227, b: 201, title: ['ヨシ（芦葦）','蘆｣、｢芦｣、｢葦｣、｢葮｣、｢蓮｣と記された範囲。または芦葦記号。'] },
    { r: 173, g: 255, b: 173, title: ['茅','｢茅｣、｢萱｣と記された範囲。'] },
    { r: 144, g: 73, b: 11, title: ['堤防' ,'河川の氾濫や海水の浸入を防ぐため、河岸･海岸に沿って設けた土石の構築物。']}
]
// 高潮浸水想定区域、津波浸水想定
const legend_hightide_tsunami = [
    { r: 255, g: 255, b: 179, title: '0.3m未満' },
    { r: 247, g: 245, b: 169, title: '0.3～0.5m' },
    { r: 248, g: 225, b: 166, title: '0.5～1.0m' },
    { r: 255, g: 216, b: 192, title: '1.0～3.0m' },
    { r: 255, g: 183, b: 183, title: '3.0～5.0m' },
    { r: 255, g: 145, b: 145, title: '5.0～10.0m' },
    { r: 242, g: 133, b: 201, title: '10.0～20.0m' },
    { r: 220, g: 122, b: 188, title: '20.0m以上' }
]
// 土砂災害警戒区域
const legend_dosyasaigai = [
    { r: 229, g: 200, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 230, g: 201, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 229, g: 200, b: 50, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 230, g: 200, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 230, g: 201, b: 49, title: '土石流警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 230, g: 200, b: 50, title: '土石流警戒区域(指定済)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 165, g: 0, b: 33, title: '土石流<span style="color: red">特別</span>警戒区域(指定済)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 169, g: 10, b: 34, title: '土石流<span style="color: red">特別</span>警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
    { r: 169, g: 10, b: 33, title: '土石流<span style="color: red">特別</span>警戒区域(指定前)<br><br>山腹が崩壊して生じた土石等又は渓流の土石等が水と一体となって流下する自然現象' },
]
// 土石流危険渓流
const legend_dosekiryu = [
    { r: 245, g: 153, b: 101, title: '土石流危険渓流<br><br>土石流の発生の危険性があり、人家等に被害を与えるおそれがある渓流' },
]
// 急傾斜地崩壊危険箇所
const legend_kyukeisya = [
    { r: 224, g: 224, b: 254, title: '急傾斜地崩壊危険箇所<br><br>傾斜度30°かつ高さ5m以上の急傾斜地で人家等に被害を与えるおそれのある箇所' },
]
// 地すべり危険箇所
const legend_jisuberi = [
    { r: 255, g: 235, b: 223, title: '地すべり危険箇所<br><br>地すべりが発生している又は地すべりが発生するおそれがある区域のうち、人家等に被害を与えるおそれのある箇所' },
]
// ため池結界
const legend_tameike = [
    { r: 0, g: 0, b: 255, title: 'ため池決壊による危険性' },
]
// シームレス地質図
const legend_seamless = [
    { r: 0, g: 0, b: 0, title: '' },
]
export function closeAllPopups() {
    popups.forEach(popup => popup.remove())
    // 配列をクリア
    popups.length = 0
}
// IDから対応するlabelを取得する関数
function getLabelByLayerId(layerId, data) {
    for (const mapKey in data) {
        const mapLayers = data[mapKey];
        for (const item of mapLayers) {
            if (item.layers.some(layer => layer.id === layerId)) {
                return item.label;
            }
        }
    }
    return null
}
//------------------------------------------------------------------------------------------------------------
function latLngToTile(lat, lng, z) {
    const
        w = Math.pow(2, (z === undefined) ? 0 : z) / 2,		// 世界全体のピクセル幅
        yrad = Math.log(Math.tan(Math.PI * (90 + lat) / 360))
    return { x: (lng / 180 + 1) * w, y: (1 - yrad / Math.PI) * w }
}
function getLegendItem(legend, url, lat, lng, z) {
    // map.getCanvas().style.cursor = 'progress'
    return new Promise(function (resolve) {
        const
            p = latLngToTile(lat, lng, z),
            x = Math.floor(p.x),			// タイルX座標
            y = Math.floor(p.y),			// タイルY座標
            i = (p.x - x) * 256,			// タイル内i座標
            j = (p.y - y) * 256,			// タイル内j座標
            img = new Image();
        img.crossOrigin = 'anonymous'
        img.onload = function () {
            const
                canvas = document.createElement('canvas'),
                context = canvas.getContext('2d')
            let
                v,
                d;
            canvas.width = 1
            canvas.height = 1
            context.drawImage(img, i, j, 1, 1, 0, 0, 1, 1)
            d = context.getImageData(0, 0, 1, 1).data
            console.log(d[0],d[1],d[2])
            if (legend[0].r + legend[0].g + legend[0].b === 0) {
                if (d[3] === 255) {
                    v = 'dummy'
                } else {
                    v = null
                }
            } else {
                v = legend.find(o => o.r == d[0] && o.g == d[1] && o.b == d[2])
            }
            // map.getCanvas().style.cursor = 'default'
            resolve(v)
        }
        img.onerror = function () {
            // map.getCanvas().style.cursor = 'default'
            resolve(null)
        }
        img.src = url.replace('{z}', z).replace('{y}', y).replace('{x}', x)
    })
}
function urlByLayerId (layerId) {
    let RasterTileUrl,legend,zoom
    switch (layerId) {
        case 'oh-kozui-saidai-layer':
        case 'oh-rgb-kozui-saidai-layer':
            RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin/{z}/{x}/{y}.png'
            legend = legend_shinsuishin
            zoom = 16
            break;
        case 'oh-rgb-kozui-keikaku-layer':
            RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/01_flood_l1_shinsuishin_newlegend_kuni_data/{z}/{x}/{y}.png'
            legend = legend_shinsuishin
            zoom = 16
            break;
        case 'oh-shitchi-layer':
        case 'oh-rgb-shitchi-layer':
            RasterTileUrl = 'https://cyberjapandata.gsi.go.jp/xyz/swale/{z}/{x}/{y}.png';
            legend = legend_shitchi
            zoom = 16
            break;
        case 'oh-tsunami-layer':
        case 'oh-rgb-tsunami-layer':
            RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png';
            legend = legend_hightide_tsunami
            zoom = 16
            break;
        case 'oh-dosya-layer':
        case 'oh-rgb-dosya-layer':
            RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png';
            legend = legend_dosyasaigai
            zoom = 16
            break;
        case 'oh-dosekiryu-layer':
        case 'oh-rgb-dosekiryu-layer':
            RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukikenkeiryu/{z}/{x}/{y}.png';
            legend = legend_dosekiryu
            zoom = 16
            break;
        case 'oh-rgb-kyukeisya-layer':
            RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_kyukeisyachihoukai/{z}/{x}/{y}.png';
            legend = legend_kyukeisya
            zoom = 16
            break;
        case 'oh-rgb-jisuberi-layer':
            RasterTileUrl = 'https://disaportaldata.gsi.go.jp/raster/05_jisuberikikenkasyo/{z}/{x}/{y}.png';
            legend = legend_jisuberi
            zoom = 16
            break;
        case 'oh-rgb-tameike-layer':
            RasterTileUrl = 'https://disaportal.gsi.go.jp/data/raster/07_tameike/{z}/{x}/{y}.png';
            legend = legend_tameike
            zoom = 15
            break;
        case 'oh-rgb-seamless-layer':
            RasterTileUrl = 'https://gbank.gsj.jp/seamless/v2/api/1.2/tiles/{z}/{y}/{x}.png';
            legend = legend_seamless
            zoom = 13
            break;
        default:
            // 何も該当しない場合の処理
            RasterTileUrl = '';
            legend = null;
            break;
    }
    return [RasterTileUrl,legend,zoom]
}
let isGooglemap = true
export function popup(e,map,mapName,mapFlg) {
    if (store.state.editEnabled) return;
    // alert(mapName)
    let html = ''
    enableMotionPermission()
    let features = map.queryRenderedFeatures(e.point); // クリック位置のフィーチャーを全て取得
    console.log(features[0])
    console.log(map.getStyle().layers)
    if (features.length> 20) {
        features = features.slice(0, 20);
    }
    // const coordinates = e.lngLat

    // クリックした地物の中からレイヤーIDが"oh-amx-a-fude"かつポリゴンを探す
    let featureIndex
    const polygonFeature = features.find((feature,index) => {
        featureIndex = index
        return feature.layer.id === 'oh-amx-a-fude' && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
    });
    if (polygonFeature) {
        const chiban = features[featureIndex].properties.地番
        console.log(chiban)
        console.log(queryFGBWithPolygon(map,polygonFeature,chiban))
    }

    let PolygonMetrics
    if (polygonFeature) {
        // Turf.jsのGeoJSONフォーマットに変換
        const polygon = {
            type: 'Feature',
            geometry: polygonFeature.geometry,
            properties: {}
        };
        // 面積と周長を計算
        PolygonMetrics = calculatePolygonMetrics(polygon);
    } else {
        console.log('クリックされた地物は対象レイヤーのポリゴンではありません。');
    }

    let coordinates
    if (features.length > 0) {
        coordinates = features[0].geometry.coordinates.slice()
        if (coordinates.length === 2) {
            if (coordinates[0].length > 0) {
                // coordinates = e.lngLat
                coordinates = [e.lngLat.lng,e.lngLat.lat]
            }
        } else {
            // coordinates = e.lngLat
            coordinates = [e.lngLat.lng,e.lngLat.lat]
        }
    } else {
        // coordinates = e.lngLat
        coordinates = [e.lngLat.lng,e.lngLat.lat]
    }

    if (map.getLayer('oh-point-layer')) {
        store.state.clickedCoordinates = coordinates
        return
    }
    // if (features.length > 0) {
    let regionType = ''
    const f0 = [features[0]]
    let isBreak = false
    for (const feature of features) {
        // features.forEach(feature => {
        const layerId = feature.layer.id
        console.log(feature)
        console.log(layerId)
        let props = feature.properties
        // const coordinates = e.lngLat
        // let coordinates = feature.geometry.coordinates.slice()
        // if (coordinates.length !== 2) coordinates = e.lngLat
        console.log(props)
        console.log(layerId)
        // alert(layerId)
        switch (layerId) {
            case 'oh-zosei-line':
            case 'oh-zosei-label':
            case 'oh-zosei': {
                features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-zosei']}
                )
                if (features.length === 0) return
                props = features[0].properties
                let name
                if (props.A54_001 === '1') {
                    name = '谷埋め型'
                } else if (props.A54_001 === '2') {
                    name = '腹付け型'
                } else if (props.A54_001 === '9') {
                    name = '区分をしていない'
                }
                const syozai = props.A54_003 + props.A54_005
                const bango = props.A54_006
                if (html.indexOf('zosei') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="zosei" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + syozai + '</span><hr>' +
                        '<span style="font-size: 12px;">' + bango + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-mw5-center': {
                console.log(props)
                const name = props.title
                const link = '<a href="https://mapwarper.h-gis.jp/maps/' + props.id + '" target="_blank" >日本版Map Warper</a>'
                if (html.indexOf('mw5-center') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="mw5-center" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + link + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-tetsudo-blue-lines':
            case 'oh-tetsudo-red-lines': {
                const name = props.N05_002
                const kaisya = props.N05_003
                if (html.indexOf('tetsudo-red-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudo-red-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-tetsudo-points-blue':
            case 'oh-tetsudo-points-red': {
                const name = props.N05_002
                const kaisya = props.N05_003
                const eki = props.N05_011
                if (html.indexOf('tetsudo-points-red') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudo-points-red" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + eki + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-tetsudojikeiretsu-red-lines':
            case 'oh-tetsudojikeiretsu-blue-lines': {
                const name = props.N05_002
                const kaisya = props.N05_003
                if (html.indexOf('tetsudojikeiretsu-blue-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudojikeiretsu-blue-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-tetsudojikeiretsu-points': {
                const name = props.N05_002
                const kaisya = props.N05_003
                const eki = props.N05_011
                if (html.indexOf('tetsudojikeiretsu-points') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="tetsudojikeiretsu-points" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 12px;">運営会社=' + kaisya + '</span><hr>' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + eki + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-michinoeki-label':
            case 'oh-michinoeki': {
                const name = props.P35_006
                const link = '<a href="' + props.P35_007 + '" target="_blank">道の駅ページへ</a>'
                if (html.indexOf('michinoeki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="michinoeki" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<div style="font-size: 14px;margin-top: 10px;">' + link + '</div>' +
                        '</div>'
                }
                break
            }
            case 'oh-r07koji-label':
            case 'oh-r07koji-height':
            case 'oh-r07koji_point':
            case 'oh-koji-label':
            case 'oh-koji-height':
            case 'oh-koji_point': {
                const name = props.L01_025
                const kojikakaku = props.L01_008.toLocaleString() + '円'
                if (html.indexOf('koji_point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="koji_point" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + kojikakaku + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-did': {
                const name = props.A16_003
                const jinko = props.A16_005.toLocaleString() + '人'
                if (html.indexOf('did') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="did" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + jinko + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-syochiiki-height':
            case 'oh-syochiiki-label':
            case 'oh-syochiiki-layer': {
                features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-syochiiki-layer']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const name = props.S_NAME
                if (html.indexOf('syochiiki-layer') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="syochiiki-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 20px;">' + props.JINKO + '人</span>' +
                        '<button class="pyramid-syochiiki-r02 pyramid-btn" year=2020 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2020（R02）人口ピラミッド</button><br>' +
                        '<button class="pyramid-syochiiki-h27 pyramid-btn" year=2015 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2015（H27）人口ピラミッド</button><br>' +
                        '<button class="pyramid-syochiiki-h22 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2010（H22）人口ピラミッド</button><br>' +
                        '<button class="pyramid-syochiiki-h17 pyramid-btn" year=2010 mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">2005（H17）人口ピラミッド</button><br>' +
                        '<button style="margin-bottom: 10px;" class="jinkosuii pyramid-btn" mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">人口推移</button>' +
                        '</div>'
                }
                break
            }
            case 'oh-kyusekki': {
                let sekkiHtml = ''
                const sekki = ['ナイフ形石器', '台形（様）石器', '斧形石器', '剥片尖頭器', '角錐状石器・三稜尖頭器', '槍先形尖頭器',
                    '両面調整石器', '細石刃・細石核等', '神子柴型石斧', '有茎（舌）尖頭器', '掻器・削器', '彫器', '砥石', '叩石', '台石',
                    '礫器', 'その他の石器', '草創期土器', 'ブロック･ユニット', '礫群・配石', '炭化物集中', 'その他の遺構', '特記事項'
                ]
                sekki.forEach((value) => {
                    if (props[value]) {
                        sekkiHtml = sekkiHtml + value + '=' + props[value] + '<br>'
                    }
                })
                if (html.indexOf('kyusekki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html += '<div class="kyusekki" style=font-size:small;>' +
                        '<h4>' + props.遺跡名 + '</h4>' +
                        '読み方=' + props.遺跡名読み方 + '<br>' +
                        '都道府県=' + props.都道府県 + '<br>' +
                        '所在地=' + props.所在地 + '<br>' +
                        '標高=' + props.標高 + '<br>' +
                        '文献=' + props.文献 + '<br>' +
                        '調査歴=' + props.調査歴 + '<br>' +
                        '作成年月日=' + props.作成年月日 + '<br>' +
                        '作成者=' + props.作成者 + '<br>' +
                        sekkiHtml +
                        '</div>'
                }
                break
            }
            case 'oh-m250m-height':
            case 'oh-m250m-label':
            case 'oh-m250m-line':
            case 'oh-m250m': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-m250m']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const name = '人口' + Math.round(Number(props.jinko)) + '人'
                if (html.indexOf('m250m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="m250m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-m500m-height':
            case 'oh-m500m-label':
            case 'oh-m500m-line':
            case 'oh-m500m': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-m500m']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const name = '人口' + Math.round(Number(props.jinko)) + '人'
                if (html.indexOf('m500m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="m500m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-m1km-height':
            case 'oh-m1km-label':
            case 'oh-m1km-line':
            case 'oh-m1km': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-m1km']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const name = '人口' + Math.round(Number(props.jinko)) + '人'
                if (html.indexOf('m1km') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="m1km" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-m100m-height':
            case 'oh-m100m-label':
            case 'oh-m100m-line':
            case 'oh-m100m': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-m100m']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const name = '人口' + Math.round(Number(props.PopT)) + '人'
                if (html.indexOf('m100m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="m100m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-iryokikan-label':
            case 'oh-iryokikan': {
                const name = props.P04_002
                const address = props.P04_003
                const kamoku = props.P04_004
                if (html.indexOf('iryokikan') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="iryokikan" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + address + '</span><hr>' +
                        '<span style="font-size: 12px;">' + kamoku + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-nihonrekishi-label':
            case 'oh-nihonrekishi': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )

                if (features.length === 0) return
                props = features[0].properties
                const name = props.名称
                if (html.indexOf('nihonrekishi') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="nihonrekishi" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                }
                break
            }
            case 'oh-chikeibunrui': {
                console.log(coordinates)
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-chikeibunrui']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const name = props.code
                let naritachi = "", risk = ""
                const list = codeShizen
                for (let i = 0; i < list.length; i++) {
                    if (list[i][1] === name) {//ズーム率によって数値型になったり文字型になったりしている模様
                        naritachi = list[i][2]
                        risk = list[i][3]
                        break;
                    }
                }
                if (html.indexOf('chikeibunrui') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="chikeibunrui" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + naritachi + '</span><hr>' +
                        '<span style="font-size: 12px;">' + risk + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-shizenchikei': {
                console.log(coordinates)
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-shizenchikei']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const code = props.code
                let name = '', naritachi = "", risk = ""
                const list = codeShizenOriginal
                for (let i = 0; i < list.length; i++) {
                    if (list[i][0] === Number(code)) {
                        name = list[i][1]
                        naritachi = list[i][2]
                        risk = list[i][3]
                        break;
                    }
                }
                if (html.indexOf('shizenchikei') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="shizenchikei" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + naritachi + '</span><hr>' +
                        '<span style="font-size: 12px;">' + risk + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-jinkochikei': {
                console.log(coordinates)
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-jinkochikei']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const code = props.code
                let name = '', naritachi = "", risk = ""
                const list = codeShizenOriginal
                for (let i = 0; i < list.length; i++) {
                    if (list[i][0] === Number(code)) {
                        name = list[i][1]
                        naritachi = list[i][2]
                        risk = list[i][3]
                        break;
                    }
                }
                if (html.indexOf('jinkochikei') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="jinkochikei" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><hr>' +
                        '<span style="font-size: 12px;">' + naritachi + '</span><hr>' +
                        '<span style="font-size: 12px;">' + risk + '</span>' +
                        '</div>'
                }
                break
            }
            // ここを改善する
            case 'oh-cyugakuR05': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-cyugakuR05']}
                )
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                const name = props.A32_004
                if (html.indexOf('cyugakuR05') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="cyugakuR05" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                }
                break
            }
            case 'oh-cyugakuR05-line':
            case 'oh-cyugakuR05-label':
            case 'oh-cyugakuR05-point': {
                features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                let objName = 'P29_004'
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-cyugakuR05']}
                    )
                    objName = 'A32_004'
                }
                if (features.length === 0) return
                props = features[0].properties
                const name = props[objName]
                if (html.indexOf('cyugakuR05-point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="cyugakuR05-point" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                }
                break
            }
            // ここを改善する
            case 'oh-syogakkoR05': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-syogakkoR05']}
                )
                if (features.length === 0) return
                props = features[0].properties
                const name = props.A27_004
                if (html.indexOf('syogakkoR05') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="syogakkoR05" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                }
                break
            }
            case 'oh-syogakkoR05-line':
            case 'oh-syogakkoR05-label':
            case 'oh-syogakkoR05-point': {
                features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                let objName = 'P29_004'
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-syogakkoR05']}
                    )
                    objName = 'A27_004'
                }
                if (features.length === 0) return
                props = features[0].properties
                const name = props[objName]
                if (html.indexOf('syogakkoR05-point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="syogakkoR05-point" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">' +
                        name +
                        '</div>'
                }
                break
            }
            case 'oh-bakumatsu-label':
            case 'oh-bakumatsu-line':
            case 'oh-bakumatsu-layer': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-bakumatsu-layer']}
                )
                if (features.length === 0) return;
                props = features[0].properties
                const ryobun2p = props.領分２ ? '<tr><td>領分２</td><td>' + props.領分２ + '</td><td>' + Math.round(props.石高２).toLocaleString() + '</td></tr>' : ''
                const ryobun3p = props.領分３ ? '<tr><td>領分３</td><td>' + props.領分３ + '</td><td>' + Math.round(props.石高３).toLocaleString() + '</td></tr>' : ''
                const ryobun4p = props.領分４ ? '<tr><td>領分４</td><td>' + props.領分４ + '</td><td>' + Math.round(props.石高４).toLocaleString() + '</td></tr>' : ''
                const ryobun5p = props.領分５ ? '<tr><td>領分５</td><td>' + props.領分５ + '</td><td>' + Math.round(props.石高５).toLocaleString() + '</td></tr>' : ''
                const ryobun6p = props.領分６ ? '<tr><td>領分６</td><td>' + props.領分６ + '</td><td>' + Math.round(props.石高６).toLocaleString() + '</td></tr>' : ''
                const ryobun7p = props.領分７ ? '<tr><td>領分７</td><td>' + props.領分７ + '</td><td>' + Math.round(props.石高７).toLocaleString() + '</td></tr>' : ''
                const ryobun8p = props.領分８ ? '<tr><td>領分８</td><td>' + props.領分８ + '</td><td>' + Math.round(props.石高８).toLocaleString() + '</td></tr>' : ''
                if (html.indexOf('bakumatsu-layer') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html += '<div class="kinseipoint bakumatsu-layer" style=width:250px;>' +
                        '<span style="font-size: 20px">' + props.村名0 + '' +
                        '<span style="font-size: 14px">(' + props.よみ0 + ')<span/><br>' +
                        '石高計=' + Math.round(props.石高計).toLocaleString() + '' +
                        '<table class="popup-table" align="center">' +
                        '<tr><th></th><th>領分</th><th>石高</th></tr>' +
                        '<tr><td>領分１</td><td>' + props.領分１ + '</td><td>' + Math.round(props.石高１).toLocaleString() + '</td></tr>' +
                        ryobun2p +
                        ryobun3p +
                        ryobun4p +
                        ryobun5p +
                        ryobun6p +
                        ryobun7p +
                        ryobun8p +
                        '</table>' +
                        '<p>令制国=' + props.令制国 + '国</p>' +
                        '<p>国郡名=' + props.国郡名 + '</p>' +
                        '<p>郡名=' + props.郡名 + '</p>' +
                        '<p>KEY=' + props.KEY + '</p>' +
                        '<p>' + props.PREF_NAME + props.CITY_NAME + '</p>' +
                        // '<p>面積=' + prop.area + '</p>' +
                        // '<p>周長=' + prop.perimeter + '</p>' +
                        '</div>'
                }
                break
            }
            case 'oh-bakumatsu-point': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-bakumatsu-point']}
                )
                if (features.length === 0) return;
                props = features[0].properties
                const ryobun2p = props.領分２ ? '<tr><td>領分２</td><td>' + props.領分２ + '</td><td>' + Math.round(props.石高２).toLocaleString() + '</td></tr>' : ''
                const ryobun3p = props.領分３ ? '<tr><td>領分３</td><td>' + props.領分３ + '</td><td>' + Math.round(props.石高３).toLocaleString() + '</td></tr>' : ''
                const ryobun4p = props.領分４ ? '<tr><td>領分４</td><td>' + props.領分４ + '</td><td>' + Math.round(props.石高４).toLocaleString() + '</td></tr>' : ''
                const ryobun5p = props.領分５ ? '<tr><td>領分５</td><td>' + props.領分５ + '</td><td>' + Math.round(props.石高５).toLocaleString() + '</td></tr>' : ''
                const ryobun6p = props.領分６ ? '<tr><td>領分６</td><td>' + props.領分６ + '</td><td>' + Math.round(props.石高６).toLocaleString() + '</td></tr>' : ''
                const ryobun7p = props.領分７ ? '<tr><td>領分７</td><td>' + props.領分７ + '</td><td>' + Math.round(props.石高７).toLocaleString() + '</td></tr>' : ''
                const ryobun8p = props.領分８ ? '<tr><td>領分８</td><td>' + props.領分８ + '</td><td>' + Math.round(props.石高８).toLocaleString() + '</td></tr>' : ''
                if (html.indexOf('bakumatsu-point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html += '<div class="kinseipoint bakumatsu-point" style=width:250px;>' +
                        '<span style="font-size: 20px">' + props.村名 + '' +
                        '<span style="font-size: 14px">(' + props.よみ + ')<span/><br>' +
                        '<p>領分１=' + props.領分１ + '</p>' +
                        '<p>石高計=' + Math.round(props.石高計).toLocaleString() + '</p>' +
                        '<table class="popup-table" align="center">' +
                        '<tr><th></th><th>領分</th><th>石高</th></tr>' +
                        '<tr><td>領分１</td><td>' + props.領分１ + '</td><td>' + Math.round(props.石高１).toLocaleString() + '</td></tr>' +
                        ryobun2p +
                        ryobun3p +
                        ryobun4p +
                        ryobun5p +
                        ryobun6p +
                        ryobun7p +
                        ryobun8p +
                        '</table>' +
                        '<p>国名=' + props.国名 + '</p>' +
                        '<p>国郡=' + props.国郡 + '</p>' +
                        '<p>郡名=' + props.郡名 + '</p>' +
                        '<p>相給=' + props.相給 + '</p>' +
                        '</div>'
                    console.log(html)
                }
                break
            }
            case 'oh-bakumatsu-kokudaka-height': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-bakumatsu-kokudaka-height']}
                )
                if (features.length === 0) return;
                props = features[0].properties
                const ryobun2p = props.領分２ ? '<tr><td>領分２</td><td>' + props.領分２ + '</td><td>' + Math.round(props.石高２).toLocaleString() + '</td></tr>' : ''
                const ryobun3p = props.領分３ ? '<tr><td>領分３</td><td>' + props.領分３ + '</td><td>' + Math.round(props.石高３).toLocaleString() + '</td></tr>' : ''
                const ryobun4p = props.領分４ ? '<tr><td>領分４</td><td>' + props.領分４ + '</td><td>' + Math.round(props.石高４).toLocaleString() + '</td></tr>' : ''
                const ryobun5p = props.領分５ ? '<tr><td>領分５</td><td>' + props.領分５ + '</td><td>' + Math.round(props.石高５).toLocaleString() + '</td></tr>' : ''
                const ryobun6p = props.領分６ ? '<tr><td>領分６</td><td>' + props.領分６ + '</td><td>' + Math.round(props.石高６).toLocaleString() + '</td></tr>' : ''
                const ryobun7p = props.領分７ ? '<tr><td>領分７</td><td>' + props.領分７ + '</td><td>' + Math.round(props.石高７).toLocaleString() + '</td></tr>' : ''
                const ryobun8p = props.領分８ ? '<tr><td>領分８</td><td>' + props.領分８ + '</td><td>' + Math.round(props.石高８).toLocaleString() + '</td></tr>' : ''

                if (html.indexOf('bakumatsu-kokudaka-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html += '<div class="kinseipoint bakumatsu-kokudaka-height" style=width:250px;>' +
                        '<span style="font-size: 20px">' + props.村名0 + '' +
                        '<span style="font-size: 14px">(' + props.よみ0 + ')<span/><br>' +
                        '石高計=' + Math.round(props.石高計).toLocaleString() + '' +
                        '<table class="popup-table" align="center">' +
                        '<tr><th></th><th>領分</th><th>石高</th></tr>' +
                        '<tr><td>領分１</td><td>' + props.領分１ + '</td><td>' + Math.round(props.石高１).toLocaleString() + '</td></tr>' +
                        ryobun2p +
                        ryobun3p +
                        ryobun4p +
                        ryobun5p +
                        ryobun6p +
                        ryobun7p +
                        ryobun8p +
                        '</table>' +
                        '<p>令制国=' + props.令制国 + '国</p>' +
                        '<p>国郡名=' + props.国郡名 + '</p>' +
                        '<p>郡名=' + props.郡名 + '</p>' +
                        '<p>KEY=' + props.KEY + '</p>' +
                        '<p>' + props.PREF_NAME + props.CITY_NAME + '</p>' +
                        // '<p>面積=' + prop.area + '</p>' +
                        // '<p>周長=' + prop.perimeter + '</p>' +
                        '</div>'
                }
                break
            }
            case 'oh-bakumatsu-line2':
            case 'oh-bakumatsu-han': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-bakumatsu-han']}
                )
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.村名
                const kokudaka = Math.floor(Number(props.石高計))
                const ryobun = props.領分１
                html +=
                    `
                  <div style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `
                break
            }
            case 'oh-bakumatsu-label2':
            case 'oh-bakumatsu-kokudaka': {
                let features
                console.log(map.getLayer('oh-bakumatsu-kokudaka'))
                if (map.getLayer('oh-bakumatsu-kokudaka')) {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-bakumatsu-kokudaka']}
                    )
                } else {
                    features = map.queryRenderedFeatures(
                        map.project(coordinates), {layers: ['oh-bakumatsu']}
                    )
                }
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.村名
                const kokudaka = Math.floor(Number(props.石高計))
                const ryobun = props.領分１
                if (html.indexOf('bakumatsu-kokudaka') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        `
                  <div class="bakumatsu-kokudaka" style="font-size: 20px; font-weight: normal; color: #333;line-height: 25px;">
                   村名=${name}<br>石高=${kokudaka}<br>領分=${ryobun}
                  </div>
                `}
                break
            }
            case 'oh-highwayLayer-green-lines':
            case 'oh-highwayLayer-red-lines': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-highwayLayer-green-lines']}
                )
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.N06_007
                const id = props.N06_004
                const kyouyounen = props.N06_001
                const kaishinen = props.N06_002
                if (html.indexOf('highwayLayer-red-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class=highwayLayer-red-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">id=' + id + '</span><br>' +
                        '<span style="font-size: 12px;">供用開始年=' + kyouyounen + '</span><br>' +
                        '<span style="font-size: 12px;">設置期間（開始年）=' + kaishinen + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-q-kyoryo-label':
            case 'oh-q-kyoryo': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-q-kyoryo']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props._html
                if (html.indexOf('q-kyoryo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="q-kyoryo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">よみ=' + props.No1 + '</span><br>' +
                        '<span style="font-size: 12px;">路線名=' + props.No2 + '</span><br>' +
                        '<span style="font-size: 12px;">完成年（度）=' + props.No3 + '</span><br>' +
                        '<span style="font-size: 12px;">延長=' + props.No4 + '</span><br>' +
                        '<span style="font-size: 12px;">幅員=' + props.No5 + '</span><br>' +
                        '<span style="font-size: 12px;">管理者名=' + props.No6 + '</span><br>' +
                        '<span style="font-size: 12px;">所在市区町村=' + props.No7 + props.No8 + '</span><br>' +
                        '<span style="font-size: 12px;">点検実施年度=' + props.No9 + '</span><br>' +
                        '<span style="font-size: 12px;">判定区分=' + props.No10 + '</span><br>' +
                        '<span style="font-size: 12px;">Ｑ地図管理ID=' + props.No14 + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-q-tunnel-label':
            case 'oh-q-tunnel': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-q-tunnel']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props._html
                if (html.indexOf('q-tunnel') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="q-tunnel" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">よみ=' + props.No1 + '</span><br>' +
                        '<span style="font-size: 12px;">路線名=' + props.No2 + '</span><br>' +
                        '<span style="font-size: 12px;">完成年（度）=' + props.No3 + '</span><br>' +
                        '<span style="font-size: 12px;">延長=' + props.No4 + '</span><br>' +
                        '<span style="font-size: 12px;">幅員=' + props.No5 + '</span><br>' +
                        '<span style="font-size: 12px;">管理者名=' + props.No6 + '</span><br>' +
                        '<span style="font-size: 12px;">所在市区町村=' + props.No7 + props.No8 + '</span><br>' +
                        '<span style="font-size: 12px;">点検実施年度=' + props.No9 + '</span><br>' +
                        '<span style="font-size: 12px;">判定区分=' + props.No10 + '</span><br>' +
                        '<span style="font-size: 12px;">Ｑ地図管理ID=' + props.No14 + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-yotochiiki-height':
            case 'oh-yotochiiki-line':
            case 'oh-yotochiiki': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-yotochiiki']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.用途地域
                if (html.indexOf('yotochiiki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="yotochiiki" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-bus-label':
            case 'oh-bus-points': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.P11_001
                if (html.indexOf('bus-points') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="bus-points" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">事業者名=' + props.P11_002 + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-bus-lines': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-bus-lines']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.N07_001
                if (html.indexOf('bus-points') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="bus-points" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-koaza-label':
            case 'oh-koaza': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-koaza']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const gun = props.GUN_NAME
                const name = props.KOAZA_NAME
                const a = '<a href="https://koaza.net/list/' + props.KUNI_NAME + props.GUN_NAME + '.html' + '#'+ props.MURA_NAME + '" target="_blank">' + props.MURA_NAME + '</a>'
                if (html.indexOf('kantokoaza') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kantokoaza" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">郡　名＝' + gun + '</span><br>' +
                        '<span style="font-size: 20px;">村　名＝' + a + '</span><hr>' +
                        '<span style="font-size: 20px;">小字名＝' + name + '</span><br>' +
                        '<button class="mura-name pyramid-btn" mapname="' + mapName + '" mura="' + props.MURA_NAME + '">村で抽出</button><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-mura-label':
            case 'oh-mura': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const gun = props.GUN_NAME
                const name = props.MURA_NAME
                const a = '<a href="https://koaza.net/list/' + props.KUNI_NAME + props.GUN_NAME + '.html' + '#'+ props.MURA_NAME + '" target="_blank">' + name + '</a>'
                console.log(a)
                if (html.indexOf('kantokoaza') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '(mura)</div>'
                    html +=
                        '<div class="kantokoaza" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">郡名＝' + gun + '</span><br>' +
                        '<span style="font-size: 20px;">村名＝' + a + '</span>' +
                        '<button class="mura-name pyramid-btn" mapname="' + mapName + '" mura="' + props.MURA_NAME + '">村で抽出</button><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-city-t09-label':
            case 'oh-city-t09-line':
            case 'oh-city-t09': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-city-t09']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.N03_004
                if (html.indexOf('city-t09') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="city-t09" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:14px;">' + props.N03_001 + props.N03_003 + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-city-r05-label':
            case 'oh-city-r05-line':
            case 'oh-city-r05': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-city-r05']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.N03_004
                const gun = props.N03_003 ? props.N03_003 : ''
                if (html.indexOf('city-r05') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="city-r05" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:14px;">' + props.N03_001 + gun + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-city-h12-label':
            case 'oh-city-h12-line':
            case 'oh-city-h12': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-city-h12']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.N03_004
                const gun = props.N03_003 ? props.N03_003 : ''
                if (html.indexOf('city-h12') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="city-h12" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:14px;">' + props.N03_001 + gun + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-tochiriyo-line':
            case 'oh-tochiriyo': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-tochiriyo']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                let shisetsu = ''
                switch (props.LU_1) {
                    case '111': //官公庁施設
                        shisetsu = '官公庁施設'
                        break
                    case '112': //教育文化施設
                        switch (props.LU_2) {
                            case '1': //教育施設
                                shisetsu = '教育施設'
                                break
                            case '2': //文化施設
                                shisetsu = '文化施設'
                                break
                            case '3': //宗教施設
                                shisetsu = '宗教施設'
                                break
                        }
                        break
                    case '113': //厚生医療施設
                        switch (props.LU_2) {
                            case '1': //医療施設
                                shisetsu = '医療施設'
                                break
                            case '2': //厚生施設
                                shisetsu = '厚生施設'
                                break
                        }
                        break
                    case '114': //供給処理施設
                        switch (props.LU_2) {
                            case '1': //供給施設
                                shisetsu = '供給施設'
                                break
                            case '2': //処理施設
                                shisetsu = '処理施設'
                                break
                        }
                        break
                    case '121': //事務所建築物
                        shisetsu = '事務所建築物'
                        break
                    case '122': //専用商業施設
                        switch (props.LU_2) {
                            case '1': //商業施設
                                shisetsu = '専用商業施設'
                                break
                            case '2': //公衆浴場等
                                shisetsu = '公衆浴場等'
                                break
                        }
                        break
                    case '123': //住商併用建物
                        shisetsu = '住商併用建物'
                        break
                    case '124': //宿泊・遊興施設
                        switch (props.LU_2) {
                            case '1': //宿泊施設
                                shisetsu = '宿泊施設'
                                break
                            case '2': //遊興施設
                                shisetsu = '遊興施設'
                                break
                        }
                        break
                    case '125': //スポーツ・興行施設
                        switch (props.LU_2) {
                            case '1': //スポーツ施設
                                shisetsu = 'スポーツ施設'
                                break
                            case '2': //興行施設
                                shisetsu = '興行施設'
                                break
                        }
                        break
                    case '131': //独立住宅
                        shisetsu = '独立住宅'
                        break
                    case '132': //集合住宅
                        shisetsu = '集合住宅'
                        break
                    case '141': //専用工場
                        shisetsu = '専用工場'
                        break
                    case '142': //住居併用工場
                        shisetsu = '住居併用工場'
                        break
                    case '143': //倉庫運輸関係施設
                        switch (props.LU_2) {
                            case '1': //運輸施設等
                                shisetsu = '運輸施設等'
                                break
                            case '2': //倉庫施設等
                                shisetsu = '倉庫施設等'
                                break
                        }
                        break
                    case '150': //農林漁業施設
                        shisetsu = '農林漁業施設'
                        break
                    case '210': //屋外利用地・仮設建物
                        switch (props.LU_2) {
                            case '1': //太陽光発電
                                shisetsu = '太陽光発電'
                                break
                            case '2': //屋外駐車場
                                shisetsu = '屋外駐車場'
                                break
                            case '3': //その他
                                shisetsu = '屋外利用地・仮設建物、その他'
                                break
                        }
                        break
                    case '300': //公園、運動場等
                        switch (props.LU_2) {
                            case '1': //ゴルフ場
                                shisetsu = 'ゴルフ場'
                                break
                            case '2': //その他
                                shisetsu = '公園、運動場等、その他'
                                break
                        }
                        break
                    case '400': //未利用地等
                        shisetsu = '未利用地等'
                        break
                    case '510': //道路
                        shisetsu = '道路'
                        break
                    case '520': //鉄道・港湾等
                        shisetsu = '鉄道・港湾等'
                        break
                    case '611': //田
                        shisetsu = '田'
                        break
                    case '612': //畑
                        shisetsu = '畑'
                        break
                    case '613': //樹園地
                        shisetsu = '樹園地'
                        break
                    case '620': //採草放牧地
                        shisetsu = '採草放牧地'
                        break
                    case '700': //水面・河川・水路
                        shisetsu = '水面・河川・水路'
                        break
                    case '800': //原野
                        shisetsu = '原野'
                        break
                    case '900': //森林
                        shisetsu = '森林'
                        break
                    case '220': //その他
                        shisetsu = 'その他'
                        break
                    case '0': //不明
                        shisetsu = '不明'
                        break
                    case '9': //不整合
                        shisetsu = '不整合'
                        break
                }
                if (html.indexOf('tochiriyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html += '<div class="tochiriyo" style=width:200px;>' +
                        '<span style="font-size: 20px">' + shisetsu + '</span>' +
                        '<p>' + props.NAME1 + props.NAME2 + '</p>' +
                        '<p>' + Math.floor(props.AREA) + 'm2</p>' +
                        '</div>'
                }
                break
            }
            case 'oh-hikari': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-hikari']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.light
                if (html.indexOf('hikari') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="hikari" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">明るさ＝' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-hikari-height': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-hikari-height']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.light
                if (html.indexOf('hikari-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="hikari-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">明るさ＝' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-nantora-height': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-nantora-height']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.最大浸水深
                if (html.indexOf('nantora-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="nantora-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">最大浸水深＝' + name + 'm</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-tsunami-height': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-tsunami-height']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.A40_003
                if (html.indexOf('tsunami-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="tsunami-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-hokkaidotsunami-height': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-hokkaidotsunami-height']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                let name = props.max
                console.log(name)
                if (name === undefined) name = props.MAX_SIN
                if (html.indexOf('hokkaidotsunami-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="hokkaidotsunami-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + 'm</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-city-gun': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-city-gun']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.GUN
                const kuni = props.KUNI
                if (html.indexOf('gun') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="gun" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + kuni + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-tochiriyo100': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-tochiriyo100']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                let text
                switch (props.土地利用種別) {
                    case '0100': // 田
                        text = '田'
                        break
                    case '0200': // その他の農用地
                        text = 'その他の農用地'
                        break
                    case '0500': // 森林
                        text = '森林'
                        break
                    case '0600': // 荒地
                        text = '荒地'
                        break
                    case '0700': // 建物用地
                        text = '建物用地'
                        break
                    case '0901': // 道路
                        text = '道路'
                        break
                    case '0902': // 鉄道
                        text = '鉄道'
                        break
                    case '1000': // その他の用地
                        text = 'その他の用地'
                        break
                    case '1100': // 河川地及び湖沼
                        text = '河川地及び湖沼'
                        break
                    case '1400': // 海浜
                        text = '海浜'
                        break
                    case '1500': // 海水域
                        text = '海水域'
                        break
                    case '1600': // ゴルフ場
                        text = 'ゴルフ場'
                        break
                }
                if (html.indexOf('tochiriyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="tochiriyo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + text + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-yochien-label':
            case 'oh-yochien-layer': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.P29_004
                const address = props.P29_005
                if (html.indexOf('yochien') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="yochien" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:12px;">' + address + '</span><br>' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-jinjya-label':
            case 'oh-jinjya-layer': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) return;
                props = features[0].properties
                let href = ''
                if (props.description) {
                    const description = props.description.split('\t')
                    const url = description[3] ? description[3].split('<br>')[0] : ''
                    if (url) {
                        if (description[3].split('<br>').length > 1) {
                            href = '<a href="' + url + '" target="_blank">神社と古事記を開く</a>'
                        }
                    }
                }
                const name = props.name
                if (html.indexOf('jinjya') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="jimjya" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '<span style="font-size:14px;">' + href + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-kokuarea-layer': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.name
                if (html.indexOf('kokuarea') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kokuarea" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-hinanjyo-tsunami-label':
            case 'oh-hinanjyo-tsunami':
            case 'oh-hinanjyo-dosekiryu-label':
            case 'oh-hinanjyo-dosekiryu':
            case 'oh-hinanjyo-kozui-label':
            case 'oh-hinanjyo-kozui': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                props = features[0].properties
                const name = props.name
                const address = props.address
                if (html.indexOf('hinanjyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="hinanjyo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '<span style="font-size:14px;">' + address + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-densyohi-label':
            case 'oh-densyohi': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                props = features[0].properties
                const src = 'https://maps.gsi.go.jp/legend/disaster_lore/' + props.ID.split('-')[0] + '/' + props.ID + '.jpg'
                if (html.indexOf('densyohi') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html += '<div class="densyohi" style="width:300px;font-size:small">' +
                        '<h4>' + props.碑名 + '</h4>' +
                        '災害名=' + props.災害名 + '<br>' +
                        '災害種別=' + props.災害種別 + '<br>' +
                        '所在地=' + props.所在地 + '<br>' +
                        '建立年=' + props.建立年 + '<hr>' +
                        '' + props.伝承内容 + '<br>' +
                        '<a href="' + src + '" target="_blank"><img style="object-fit:cover;height:200px;width:300px;" src="' + src + '"></a>' +
                        '</div>'
                }
                break
            }
            case 'oh-r02suikei250m': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const rate = '<span style="font-size:12px;">2070年人口/2020年人口＝</span>' + Math.floor(props.PTN_2070 / props.PTN_2020 * 100) + '%'
                if (html.indexOf('r02suikei250m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="r02suikei250m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span class="popup-address" style="font-size:12px;"></span><br>' +
                        // '<span style="font-size:12px;">MESH_ID=' + props.MESH_ID + '</span><br>' +
                        '<span style="font-size:24px;">' + rate + '</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2070年人口＝</span>' + Math.floor(props.PTN_2070).toLocaleString(0) + '人</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2020年人口＝</span>' + Math.floor(props.PTN_2020).toLocaleString(0) + '人</span>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2050 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2050人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2040 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2040人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2030 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2030人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2020 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2020人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-jinkosuii pyramid-btn" mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">人口推移</button><br><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-r02suikei500m': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const rate = '<span style="font-size:12px;">2070年人口/2020年人口＝</span>' + Math.floor(props.PTN_2070 / props.PTN_2020 * 100) + '%'
                if (html.indexOf('r02suikei500m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="r02suikei500m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span class="popup-address" style="font-size:12px;"></span><br>' +
                        // '<span style="font-size:12px;">MESH_ID=' + props.MESH_ID + '</span><br>' +
                        '<span style="font-size:24px;">' + rate + '</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2070年人口＝</span>' + Math.floor(props.PTN_2070).toLocaleString(0) + '人</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2020年人口＝</span>' + Math.floor(props.PTN_2020).toLocaleString(0) + '人</span>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2050 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2050人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2040 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2040人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2030 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2030人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2020 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2020人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-jinkosuii pyramid-btn" mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">人口推移</button><br><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-r02suikei1km': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const rate = '<span style="font-size:12px;">2070年人口/2020年人口＝</span>' + Math.floor(props.PTN_2070 / props.PTN_2020 * 100) + '%'
                if (html.indexOf('r02suikei1km') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="r02suikei1km" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span class="popup-address" style="font-size:12px;"></span><br>' +
                        // '<span style="font-size:12px;">MESH_ID=' + props.MESH_ID + '</span><br>' +
                        '<span style="font-size:24px;">' + rate + '</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2070年人口＝</span>' + Math.floor(props.PTN_2070).toLocaleString(0) + '人</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2020年人口＝</span>' + Math.floor(props.PTN_2020).toLocaleString(0) + '人</span>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2050 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2050人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2040 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2040人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2030 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2030人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2020 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2020人口ピラミッド</button><br>' +
                        // '<button class="suikei1km-jinkosuii pyramid-btn" mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">人口推移</button><br><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-suikei1km': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const rate = '<span style="font-size:12px;">2050年人口/2020年人口＝</span>' + Math.floor(props.PTN_2050 / props.PTN_2020 * 100) + '%'
                if (html.indexOf('suikei1km') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="suikei1km" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span class="popup-address" style="font-size:12px;"></span><br>' +
                        // '<span style="font-size:12px;">MESH_ID=' + props.MESH_ID + '</span><br>' +
                        '<span style="font-size:24px;">' + rate + '</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2050年人口＝</span>' + Math.floor(props.PTN_2050).toLocaleString(0) + '人</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2020年人口＝</span>' + Math.floor(props.PTN_2020).toLocaleString(0) + '人</span>' +
                        '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2050 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2050人口ピラミッド</button><br>' +
                        '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2040 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2040人口ピラミッド</button><br>' +
                        '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2030 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2030人口ピラミッド</button><br>' +
                        '<button class="suikei1km-2050 pyramid-btn" suikeiYear=2020 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2020人口ピラミッド</button><br>' +
                        '<button class="suikei1km-jinkosuii pyramid-btn" mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">人口推移</button><br><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-suikei500m': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const rate = '<span style="font-size:12px;">2050年人口/2020年人口＝</span>' + Math.floor(props.PTN_2050 / props.PTN_2020 * 100) + '%'
                if (html.indexOf('suikei500m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="suikei500m" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span class="popup-address" style="font-size:12px;"></span><br>' +
                        '<span style="font-size:12px;">MESH_ID=' + props.MESH_ID + '</span><br>' +
                        '<span style="font-size:24px;">' + rate + '</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2050年人口＝</span>' + Math.floor(props.PTN_2050).toLocaleString(0) + '人</span><br>' +
                        '<span style="font-size:20px;"><span style="font-size:12px;">2020年人口＝</span>' + Math.floor(props.PTN_2020).toLocaleString(0) + '人</span><br>' +
                        '<button class="suikei500m-2050 pyramid-btn" suikeiYear=2050 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2050人口ピラミッド</button><br>' +
                        '<button class="suikei500m-2050 pyramid-btn" suikeiYear=2040 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2040人口ピラミッド</button><br>' +
                        '<button class="suikei500m-2050 pyramid-btn" suikeiYear=2030 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2030人口ピラミッド</button><br>' +
                        '<button class="suikei500m-2050 pyramid-btn" suikeiYear=2020 mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">2020人口ピラミッド</button><br>' +
                        '<button class="suikei500m-jinkosuii pyramid-btn" mapname="' + mapName + '" MESH_ID="' + props.MESH_ID + '">人口推移</button><br><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-kansui-label':
            case 'oh-kansui': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                const str = props.description
                const pattern = new RegExp( '(?<= href=).*?(?=target)' )
                const name = props.name
                if (html.indexOf('kansui') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kansui" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name + '</span><br>' +
                        '<span style="font-size:20px;"><a href=' + str.match(pattern)[0] + ' target="_blank">箇所表</a></span>' +
                        '</div>'
                }
                break
            }
            case 'oh-teii': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                const name = props.G08_002
                if (html.indexOf('teii') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="teii" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">最大浸水深＝' + name + 'm</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-tokei': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                // const name = props.G08_002
                if (html.indexOf('tokei') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="tokei" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + props.Type + '</span><br>' +
                        '<span style="font-size:20px;">' + props.Pref + props.Cityname + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-kuikikubun': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                // const name = props.G08_002
                if (html.indexOf('kuikikubun') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kuikikubun" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + props.区域区分 + '</span><br>' +
                        '<span style="font-size:20px;">' + props.Pref + props.Cityname + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-yotochiikiP': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                // const name = props.G08_002
                if (html.indexOf('kuikikubun') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kuikikubun" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + props.用途地域 + '</span><br>' +
                        '<span style="font-size:20px;">' + props.Pref + props.Cityname + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-tkbt': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                // const name = props.G08_002
                if (html.indexOf('kuikikubun') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kuikikubun" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + props.Type + '</span><br>' +
                        '<span style="font-size:20px;">' + props.Pref + props.Cityname + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-kosyo': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                // const name = props.G08_002
                if (html.indexOf('kosyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kosyo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + props.W09_001 + '</span><br>' +
                        '<span style="font-size:16px;">水深＝' + props.W09_003 + 'm</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-dam-label':
            case 'oh-dam-layer': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                function getDamType(W01_005) {
                    switch (W01_005) {
                        case 1:
                            return "アーチダム";
                        case 2:
                            return "バットレスダム";
                        case 3:
                            return "アースダム";
                        case 4:
                            return "アスファルトフェイシングダム";
                        case 5:
                            return "アスファルトコアダム";
                        case 6:
                            return "フローティングゲートダム（可動堰）";
                        case 7:
                            return "重力式コンクリートダム";
                        case 8:
                            return "重力式アーチダム";
                        case 9:
                            return "重力式コンクリートダム・フィルダム複合ダム";
                        case 10:
                            return "中空重力式コンクリートダム";
                        case 11:
                            return "マルティプルアーチダム";
                        case 12:
                            return "ロックフィルダム";
                        case 13:
                            return "台形CSGダム";
                        default:
                            return "不明なダムタイプ";
                    }
                }
                function getPurposes(W01_006) {
                    // 文字列をカンマで分割して数値に変換
                    const purposes = W01_006.split(",").map(Number);

                    // 各値に対応する目的を取得
                    return purposes.map(purpose => {
                        switch (purpose) {
                            case 1:
                                return "洪水調節、農地防災";
                            case 2:
                                return "不特定用水、河川維持用水";
                            case 3:
                                return "灌漑、特定(新規)灌漑用水";
                            case 4:
                                return "上水道用水";
                            case 5:
                                return "工業用水道用水";
                            case 6:
                                return "発電";
                            case 7:
                                return "消流雪用水";
                            case 8:
                                return "レクリエーション";
                            default:
                                return "不明な目的";
                        }
                    });
                }
                function getProjectOperator(W01_011) {
                    switch (W01_011) {
                        case 1:
                            return "国土交通省（各地方整備局、北海道開発局含む）";
                        case 2:
                            return "沖縄開発庁";
                        case 3:
                            return "農林水産省（各地方農政局含む）";
                        case 4:
                            return "都道府県";
                        case 5:
                            return "市区町村";
                        case 6:
                            return "水資源開発公団";
                        case 7:
                            return "その他の公共企業体";
                        case 8:
                            return "土地改良区";
                        case 9:
                            return "利水組合・用水組合";
                        case 10:
                            return "電力会社・電源開発株式会社";
                        case 11:
                            return "その他の企業";
                        case 12:
                            return "個人";
                        case 13:
                            return "その他";
                        default:
                            return "不明な事業者";
                    }
                }
                const damType = getDamType(Number(props.W01_005))
                const projectOperator = getProjectOperator(Number(props.W01_011))
                const purposes = getPurposes(props.W01_006)
                if (html.indexOf('kosyo') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kosyo" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">ダム名＝' + props.W01_001 + '</span><hr>' +
                        '<span style="font-size:16px;">タイプ＝' + damType + '</span><br>' +
                        '<span style="font-size:16px;">水系名＝' + props.W01_003 + '</span><br>' +
                        '<span style="font-size:16px;">河川名＝' + props.W01_004 + '</span><br>' +
                        '<span style="font-size:16px;">目的＝' + purposes + '</span><br>' +
                        '<span style="font-size:16px;">ダム規模（堤高）＝' + props.W01_007 + 'm</span><br>' +
                        '<span style="font-size:16px;">ダム規模（堤頂長）＝' + props.W01_008 + 'm</span><br>' +
                        '<span style="font-size:16px;">堤体積＝' + props.W01_009 + '000m3</span><br>' +
                        '<span style="font-size:16px;">総貯水量＝' + props.W01_010 + '000m3</span><br>' +
                        '<span style="font-size:16px;">事業者＝' + projectOperator + '</span><br>' +
                        '<span style="font-size:16px;">竣工年＝' + props.W01_012 + '</span><br>' +
                        '<span style="font-size:16px;">所在地＝' + props.W01_013 + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-hifuku': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('hifuku') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="hifuku" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">植生被覆率＝' +  Math.round(Number(props.c_FRAC_VEG) * 1000) / 1000 + '</span><hr>' +
                        '<span style="font-size:16px;">' + props.c_PREF_NAME + props.c_CITY_NAME + props.c_S_NAME + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-shizenisan': {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                let name
                let link
                switch (props.WHC) {
                    case '01':
                        name = '知床';
                        link = '<a href="https://www.env.go.jp/nature/isan/worldheritage/shiretoko/index.html" target="_blank">日本の世界自然遺産</a>'
                        break;
                    case '02':
                        name = '白神山地';
                        link = '<a href="https://www.env.go.jp/nature/isan/worldheritage/shirakami/index.html" target="_blank">日本の世界自然遺産</a>'
                        break;
                    case '03':
                        name = '屋久島';
                        link = '<a href="https://www.env.go.jp/nature/isan/worldheritage/yakushima/index.html" target="_blank">日本の世界自然遺産</a>'
                        break;
                    case '04':
                        name = '小笠原';
                        link = '<a href="https://www.env.go.jp/nature/isan/worldheritage/ogasawara/index.html" target="_blank">日本の世界自然遺産</a>'
                        break;
                    case '05':
                        name = '奄美大島、徳之島、沖縄県北部及び西表島';
                        link = '<a href="https://www.env.go.jp/nature/isan/worldheritage/amami/index.html" target="_blank">日本の世界自然遺産</a>'
                        break;
                    default:
                        name = '不明なWHCコード';
                }
                if (html.indexOf('shizenisan') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="shizenisan" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' + name  + '</span><br>' +
                        '<span style="font-size:16px;">' + link  + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-bunkaisan-point-A34g':
            case 'oh-bunkaisan-point-A34e':
            case 'oh-bunkaisan-point-A34d':
            case 'oh-bunkaisan-line-A34c':
            case 'oh-bunkaisan-point-A34b':
            case 'oh-bunkaisan-layer-A34f':
            case 'oh-bunkaisan-layer-A34a':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                let layerName = layerId.split('-')[3]
                console.log(layerName)
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf(layerName) === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="' + layerName + '" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">' +  props[layerName + '_003'] + '</span><hr>' +
                        '<span style="font-size:16px;">' +  props[layerName + '_007'] + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-kokuritsukoen-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('kokuritsukoen') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kokuritsukoen" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">名称＝' +  props.名称 + '</span><br>' +
                        '<span style="font-size:16px;">地域区＝' +  props.地域区 + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-shizenkoen-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                // props = features[0].properties
                // let regionType = ''
                switch (props.LAYER_NO) {
                    case 1:
                        regionType += "都市地域";
                        break;
                    case 2:
                        regionType += "市街化区域";
                        break;
                    case 3:
                        regionType += "市街化調整区域";
                        break;
                    case 4:
                        regionType += "その他用途地域";
                        break;
                    case 5:
                        regionType += "農業地域";
                        break;
                    case 6:
                        regionType += "農用地区域";
                        break;
                    case 7:
                        regionType += "森林地域";
                        break;
                    case 8:
                        regionType += "国有林";
                        break;
                    case 9:
                        regionType += "地域森林計画対象民有林";
                        break;
                    case 10:
                        regionType += "・保安林<br>";
                        break;
                    case 11:
                        regionType += "・自然公園地域<br>";
                        break;
                    case 12:
                        regionType += "・特別地域<br>";
                        break;
                    case 13:
                        regionType += "・特別保護地区<br>";
                        break;
                    case 14:
                        regionType += "・自然保全地域<br>";
                        break;
                    case 15:
                        regionType += "・原生自然環境保全地域<br>";
                        break;
                    case 16:
                        regionType += "・特別地区<br>";
                        break;
                }
                console.log(props.LAYER_NO,regionType)
                if (html.indexOf('shizenkoen') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="shizenkoen" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:14px;">市町村名＝' + props.CTV_NAME + '<hr>' +
                        '<span style="font-size:14px;">土地利用基本計画＝<br><span class="region-type">' + regionType + '</span>' +
                        '</div>'
                } else {
                    const regionType2 = regionType.slice(0, -4)
                    html = html.replace(/<span class="region-type">.*?<\/span>/, `<span class="region-type">${regionType2}</span>`);
                }
                break
            }
            case 'oh-plateau-tokyo23ku-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('plateau-tokyo23ku') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="plateau-tokyo23ku" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:24px;">高さ＝' +  props.measuredHeight + 'm</span><br>' +
                        '<span style="font-size:14px;">建物ID＝' +  props.建物ID + '</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-geopark-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                let geoPark = ''
                if (props.attr === 'GGP') {
                    geoPark = 'ユネスコ世界ジオパーク'
                } else {
                    geoPark = 'ジオパーク'
                }
                if (html.indexOf('plateau-tokyo23ku') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="plateau-tokyo23ku" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">名称＝' +  props.name + geoPark + '</span><br>' +
                        '<span style="font-size:14px;">運営組織＝' +  props.organization + '</span><br>' +
                        '<span style="font-size:14px;">事務局所在地＝' +  props.office + '</span><br>' +
                        '<span style="font-size:14px;">構成自治体＝' +  props.member.replace(/<br>/gi,'・') + '</span><br>' +
                        '<span style="font-size:14px;">' +  '<a href="' + props.url + '" target="_blank">' + 'リンク' +  '</a></span>' +
                        '</div>'
                }
                break
            }
            case 'oh-chiriin250m-height':
            case 'oh-chiriin250m':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('chiriin250m') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="chiriin250m" font-weight: normal; color: #333;line-height: 25px;">' +
                        // '<span class="popup-address" style="font-size:14px;"></span><br>' +
                        '<span style="font-size:20px;">人口＝' +  props['人口（人）'] + '人</span>' +
                        '</div>'
                }
                break
            }
            case 'oh-chika-height':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                let yoto
                switch (props.L02_003) {
                    case '000':
                        yoto = '住宅地'
                        break
                    case '003':
                        yoto = '宅地見込地'
                        break
                    case '005':
                        yoto = '商業地'
                        break
                    case '009':
                        yoto = '工業地'
                        break
                }
                if (html.indexOf('chika-height') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="chika-height" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">調査価格＝' +  props.L02_006.toLocaleString() + '円</span><br>' +
                        '<span style="font-size:14px;">' +  props.L02_022 + '</span><br>' +
                        '<span style="font-size:14px;">' +  yoto + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-ekibetsukyakue-height':
            case 'oh-ekibetsukyaku-label':
            case 'oh-ekibetsukyaku-line':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                function localeString (prop) {
                    if (prop) {
                        return prop.toLocaleString()
                    } else {
                        return 0
                    }
                }
                const kyakusu =
                        '<span style="font-size:20px;">2022乗降客数＝' + localeString(props.S12_053) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2021乗降客数＝' + localeString(props.S12_049) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2020乗降客数＝' + localeString(props.S12_045) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2019乗降客数＝' + localeString(props.S12_041) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2018乗降客数＝' + localeString(props.S12_037) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2017乗降客数＝' + localeString(props.S12_033) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2016乗降客数＝' + localeString(props.S12_029) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2015乗降客数＝' + localeString(props.S12_025) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2014乗降客数＝' + localeString(props.S12_021) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2013乗降客数＝' + localeString(props.S12_017) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2012乗降客数＝' + localeString(props.S12_013) + '人/日</span><br>' +
                        '<span style="font-size:20px;">2011乗降客数＝' + localeString(props.S12_009) + '人/日</span><br>'
                const dataset =
                    [
                        { year: 2011, value: props.S12_009 },
                        { year: 2012, value: props.S12_013 },
                        { year: 2013, value: props.S12_017 },
                        { year: 2014, value: props.S12_021 },
                        { year: 2015, value: props.S12_025 },
                        { year: 2016, value: props.S12_029 },
                        { year: 2017, value: props.S12_033 },
                        { year: 2018, value: props.S12_037 },
                        { year: 2019, value: props.S12_041 },
                        { year: 2020, value: props.S12_045 },
                        { year: 2021, value: props.S12_049 },
                        { year: 2022, value: props.S12_053 }
                    ]
                if (html.indexOf('ekibetsukyaku-line') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="ekibetsukyaku-line" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">駅名＝' +  props.S12_001 + '</span><br>' +
                        '<span style="font-size:14px;">運営会社＝' +  props.S12_002 + '</span><br>' +
                        '<span style="font-size:14px;">路線名＝' +  props.S12_003 + '</span><br>' +
                        "<button style='margin-bottom:10px;' class='kyakusu-suii popup-btn' mapname='" + mapName + "' dataset='" + JSON.stringify(dataset) + "' stationname='" + props.S12_001 + "'>駅別乗降客数推移</button><br>" +
                        kyakusu +
                        '</div>'
                }
                break
            }
            case 'oh-traffic-accident':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                function getDay(d) {
                    const days = {
                        '1': '日',
                        '2': '月',
                        '3': '火',
                        '4': '水',
                        '5': '木',
                        '6': '金',
                        '7': '土'
                    };
                    return days[d] || '-';
                }

                function getWeather(d) {
                    const weather = {
                        '1': '晴れ',
                        '2': '曇り',
                        '3': '雨',
                        '4': '霧',
                        '5': '雪'
                    };
                    return weather[d] || '不明';
                }

                function getCondition(d) {
                    const conditions = {
                        '1': '良好だった',
                        '2': '湿っていた',
                        '3': '凍結していた',
                        '4': '積雪していた',
                        '5': '舗装されていなかった'
                    };
                    return conditions[d] || '不明';
                }

                function getRoadtype(d) {
                    const roadTypes = {
                        '1': '上りカーブの',
                        '2': '下りカーブの',
                        '3': '平坦なカーブの',
                        '4': '上りカーブの',
                        '5': '下りカーブの',
                        '6': '平坦なカーブの',
                        '7': '上り直線の',
                        '8': '下り直線の',
                        '9': '平坦な直線の',
                        '0': '自由通行可能な'
                    };
                    return roadTypes[d] || '';
                }

                function getLocation(d) {
                    const locations = {
                        '01': '交差点',
                        '07': '交差点',
                        '31': '交差点',
                        '37': '交差点',
                        '11': 'トンネル',
                        '12': '橋',
                        '13': '曲がり道',
                        '14': '道路',
                        '21': '踏切',
                        '22': '踏切',
                        '23': '踏切',
                        '00': '場所'
                    };
                    return locations[d] || '場所';
                }

                function getSignal(d) {
                    const signals = {
                        '1': '信号機がある',
                        '2': '信号機がある',
                        '3': '信号機がある',
                        '4': '信号機がある',
                        '5': '信号機が消灯中の',
                        '6': '信号機が故障中の',
                        '7': '信号機がない',
                        '8': '信号機がある'
                    };
                    return signals[d] || '';
                }

                function getType(d) {
                    const types = {
                        '01': '人と車両',
                        '21': '車両同士',
                        '41': '車両単独',
                        '61': '列車'
                    };
                    return types[d] || '状況不明';
                }

                function getAge(d) {
                    const ages = {
                        '01': '24歳以下の若年者',
                        '25': '25～34歳',
                        '35': '35～44歳',
                        '45': '45～54歳',
                        '55': '55～64歳',
                        '65': '65～74歳',
                        '75': '75歳以上の高齢者'
                    };
                    return ages[d] || '-';
                }
                let html0 = ''
                Object.keys(props).forEach(function (key) {
                    html0 += key + '=' + props[key] + '<br>'
                })
                html0 = '<btn class="popup-btn popup-btn-traffic">全データ表示</btn><div style="display: none">' + html0 + '</div>'

                const a_size = Number(props["負傷者数"])+Number(props["死者数"])
                let popupContent = '<p class="tipstyle02"><span class="style01">'+props["発生日時　　年"]+'年'+props["発生日時　　月"]+'月'+props["発生日時　　日"]+'日（'+getDay(props["曜日(発生年月日)"])+(props["祝日(発生年月日)"]==="0"?'・祝':'')+'）';
                popupContent += props["発生日時　　時"]+'時'+props["発生日時　　分"]+'分頃</span>に発生した<span class="style01">'+ getType(props["事故類型"]) +'の事故</span>で、';
                popupContent += (props["負傷者数"] != "0" ? '<span class="style01">'+props["負傷者数"]+'名が負傷</span>':'')+(props["死者数"] != "0" ? " ":"した。")+(props["死者数"] != "0" ? '<span class="style01">'+props["死者数"]+'名が亡くなった</span>。':'')+'<br>';
                popupContent += '当事者の年齢層は<span class="style01">'+ getAge(props["年齢（当事者A）"]) +(getAge(props["年齢（当事者B）"]) != "-" ? 'と、'+getAge(props["年齢（当事者B）"]):'')+'</span>'+(a_size > 2 ? '（本票記載の２名のみ表示）':'')+'。<br>';
                popupContent += '現場は<span class="style01">'+getRoadtype(props["道路線形"])+(getLocation(props["道路形状"]) != "交差点" ? getLocation(props["道路形状"]):getSignal(props["信号機"])+"交差点")+'</span>で、';
                popupContent += '当時の天候は<span class="style01">'+getWeather(props["天候"])+'</span>、路面状態は<span class="style01">'+getCondition(props["路面状態"])+'</span>。</p>';
                if (html.indexOf('traffic-accident') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="traffic-accident" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:14px;">' + popupContent + '</span>' +
                        '</div>'
                    html = html + html0
                }
                break
            }
            case 'oh-sekibutsu':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                function parseAndJoin (propArr) {
                    if (propArr === undefined) {
                        return ''
                    } else {
                        return JSON.parse(propArr).join(',')
                    }
                }
                function parseAndJoinImage (propArr) {
                    if (propArr === undefined) {
                        return ''
                    } else {
                        const srcArr = JSON.parse(propArr).map(prop => {
                            return '<a href="https://map.sekibutsu.info/images/' + prop + '" target="_blank"><img src="https://map.sekibutsu.info/images/' + prop + '"></a>'
                        })
                        return srcArr.join('')
                    }
                }
                console.log(parseAndJoinImage(props.image))

                const carousel =
                    '<div class="carousel">' +
                    '<div class="carousel-images">' +
                    parseAndJoinImage(props.image) +
                    '</div>' +
                    '<div class="carousel-buttons">' +
                    '<button class="carousel-button carousel-button-prev" id="prev">&#10094;</button>' +
                    '<button class="carousel-button carousel-button-next" id="next">&#10095;</button>' +
                    '</div>' +
                    '</div>'

                if (html.indexOf('sekibutsu') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="sekibutsu" font-weight: normal; color: #333;line-height: 25px;">' +
                        carousel +
                        '<span style="font-size:20px;">場所＝' +  parseAndJoin(props.place) + '</span><br>' +
                        '<span style="font-size:12px;">所在地＝' +  parseAndJoin(props.address) + '</span><br>' +
                        '<span style="font-size:12px;">データ作成者＝' +  props.contributor + '</span><br>' +
                        '<span style="font-size:12px;">データ作成日＝' +  props.created_at + '</span><br>' +
                        '<span style="font-size:12px;">写真撮影日＝' +  props.photo_date + '</span><br>' +
                        '<span style="font-size:12px;">種類＝' +  parseAndJoin(props.type) + '</span><br>' +
                        '<span style="font-size:12px;">造立年（和暦）＝' +  parseAndJoin(props.built_year) + '</span><br>' +
                        '<span style="font-size:12px;">造立年（西暦）＝' +  parseAndJoin(props.built_year_ce) + '</span><br>' +
                        '<span style="font-size:12px;">タグ＝' +  parseAndJoin(props.tag) + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-ryuiki':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('ryuiki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="ryuiki" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">水系名＝' +  props.suikei + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-bunsuirei':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('bunsuirei') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="bunsuirei" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">水系名＝' +  props.suikei + '</span><br>' +
                        '<span style="font-size:14px;">水系コード＝' +  props.W07_002 + '</span><br>' +
                        '<span style="font-size:14px;">面積＝' +  props.area + 'km2</span><br>' +
                        '<button style="margin-bottom: 10px;" class="bunsuikai-btn pyramid-btn" mapname="' + mapName + '" bunsuikai="' + props.W07_002 + '">分水界で抽出</button><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-kasen-label':
            case 'oh-kasen':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                // const name = props.G08_002
                let totalLength = ''
                if (props.W05_004 !== '名称不明') {
                    totalLength = '<span style="font-size:16px;">全長＝' + (props.totallength/1000).toFixed(2) + 'km</span><br>'
                }
                if (props.W05_002.endsWith('0000')) {
                    totalLength = '<span style="font-size:16px;">全長＝' + (props.length/1000).toFixed(2) + 'km</span><br>'
                }
                if (html.indexOf('kasen') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kasen" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">河川名＝' + props.W05_004 + '</span><hr>' +
                        '<span style="font-size:16px;">水系名＝' + props.suikei + '</span><br>' +
                        totalLength +
                        '<button style="margin-bottom: 10px;" class="kasen-highlights pyramid-btn" mapname="' + mapName + '" kasen="' + props.W05_002 + '" kasenmei="' + props.W05_004 + '">河川を強調</button><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-kanko-line':
            case 'oh-kanko-point':
            case 'oh-kanko':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('kanko') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kanko" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">名称＝' +  props.P12_003 + '</span><br>' +
                        '<span style="font-size:14px;">種別＝' +  props.P12_004 + '</span>' +
                        '</div>'
                }
                break
            }
            case 'user-geojson-polygons':
            case 'user-geojson-lines':
            case 'user-geojson-points':
            case 'oh-osm-overpass-layer-line':
            case 'oh-osm-overpass-layer-polygon':
            case 'oh-osm-overpass-layer-point':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties

                let html0 = ''
                Object.keys(props).forEach(function (key) {
                    html0 += key + '=' + props[key] + '<br>'
                })
                html0 = '<div style="margin-top: 10px;"><btn class="popup-btn popup-btn-traffic">全データ表示</btn><div style="display: none;">' + html0 + '</div></div>'
                if (html.indexOf('osm') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="osm" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">名称＝' +  props.name + '</span><br>' +
                        '</div>'
                    html = html + html0
                }
                break
            }
            case 'oh-syukuhaku':
            case 'oh-syukuhaku-height':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('osm') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="osm" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:18px;">総収容人数＝' +  Number(props.P09_013).toLocaleString() + '人</span><br>' +
                        '<span style="font-size:18px;">総数客室数＝' +  Number(props.P09_014).toLocaleString() + '室</span><hr>' +
                        '<span style="font-size:16px;">ホテル＝' +  Number(props.P09_002).toLocaleString() + '施設</span><br>' +
                        '<span style="font-size:16px;">旅館＝' +  Number(props.P09_003).toLocaleString() + '施設</span><br>' +
                        '<span style="font-size:16px;">民宿＝' +  Number(props.P09_005).toLocaleString() + '施設</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-fude':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                let nouti
                if (props.land_type === 100) {
                    nouti = '田'
                } else if (props.land_type === 200) {
                    nouti = '畑'
                }
                if (html.indexOf('fude') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="fude" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:26px;">' + nouti + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-zeni-center':
            case 'oh-zeni-circle':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('zeni') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="zeni" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-nogyochiiki':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                let nouti
                if (props.LAYER_NO === 5) {
                    nouti = '農業地域'
                } else if (props.LAYER_NO === 6) {
                    nouti = '農用地区域'
                }
                if (html.indexOf('nogyochiiki') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="nogyochiiki" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:26px;">' + nouti + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-kizyunten-point-label':
            case 'oh-kizyunten-point':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                if (html.indexOf('kizyunten') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kizyunten" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:24px;">点名＝' + props.点名 + '</span><hr>' +
                        '<span style="font-size:20px;">基準点種別＝' + props.基準点種別 + '</span><br>' +
                        '<span style="font-size:14px;">基準点コード＝' + props.基準点コード + '</span><br>' +
                        '<span style="font-size:14px;">成果状態＝' + props.成果状態 + '</span><br>' +
                        '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>' +
                        '</div>'
                }
                break
            }
            case 'oh-amx-vertex': {
                if (store.state.isRenzoku) return
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-amx-a-fude']}
                )
                console.log(features[0].geometry.coordinates)
                console.log([coordinates.lng,coordinates.lat])


                function getNearestCoordinate(targetCoord, featureCoords) {
                    if (!Array.isArray(featureCoords) || featureCoords.length === 0) {
                        console.error("Invalid featureCoords:", featureCoords);
                        return null;
                    }

                    // ネストされた配列を展開（Polygon に対応）
                    let flatCoords = featureCoords.flat(1).filter(coord =>
                        Array.isArray(coord) && coord.length >= 2 &&
                        typeof coord[0] === "number" && typeof coord[1] === "number"
                    );

                    if (flatCoords.length === 0) {
                        console.error("No valid coordinates found in featureCoords.");
                        return null;
                    }

                    let minDistance = Infinity;
                    let nearestCoord = null;

                    flatCoords.forEach(coord => {
                        let distance = getDistance(targetCoord, coord);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestCoord = coord;
                        }
                    });

                    return nearestCoord;
                }

                // Haversine 公式を使用した距離計算
                function getDistance(coord1, coord2) {
                    const toRad = (deg) => (deg * Math.PI) / 180;
                    const R = 6371e3; // 地球の半径（メートル）

                    const lat1 = toRad(coord1[1]);
                    const lat2 = toRad(coord2[1]);
                    const deltaLat = toRad(coord2[1] - coord1[1]);
                    const deltaLon = toRad(coord2[0] - coord1[0]);

                    const a =
                        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                        Math.cos(lat1) * Math.cos(lat2) *
                        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    return R * c; // メートル単位
                }

                const featureCoords = features[0].geometry.coordinates
                const targetCoord = [coordinates.lng,coordinates.lat]

                const nearest = getNearestCoordinate(targetCoord, featureCoords);
                console.log("Nearest Coordinate:", nearest);

                if (features.length === 0) return
                props = features[0].properties
                if (html.indexOf('amx-a-fude') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="amx-a-fude" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:16px;">座標はおおよそです。</span><hr>' +
                        '<span style="font-size:18px;">座標＝' + nearest[0].toFixed(5)  + ', ' + nearest[1].toFixed(5)  + '</span><hr>' +
                        '<span style="font-size:18px;">' + store.state.zahyokei  + '</span><br>' +
                        '<span style="font-size:18px;">座標＝' + wsg84ToJgd(nearest)[0].toFixed(3)  + ', ' + wsg84ToJgd(nearest)[1].toFixed(3)  + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-amx-label':
            case 'oh-amx-a-fude-line':
            case 'oh-amx-a-fude': {
                if (store.state.isRenzoku) return
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-amx-a-fude']}
                )
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('amx-a-fude') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="amx-a-fude" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div style="font-size: 14px;margin-top: 5px;" class="feature-area"></div>'
                    html0 += '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>'
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-homusyo-2025-polygon':
            {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-homusyo-2025-polygon']}
                )
                console.log(features[0].properties.市区町村コード.slice(0,2))
                if (features.length === 0) return

                // ⭐️---------------------------------------------------------------------------------------------------
                if (store.state.isRenzoku) {
                    const targetId = `${features[0].properties['筆ID']}_${features[0].properties['地番']}`
                    if (!store.state.highlightedChibans.has(targetId)) {
                        store.state.popupFeatureProperties = features[0].properties
                        store.state.popupFeatureCoordinates = coordinates
                        store.state.rightDrawerTitle = '2025登記所地図'
                        if (!store.state.isDrawPoint) {
                            store.commit('setRightDrawer', true)
                        }
                    } else {
                        store.commit('setRightDrawer', false)
                    }
                    return
                }
                // -----------------------------------------------------------------------------------------------------

                props = features[0].properties
                let html0 = ''
                if (html.indexOf('oh-homusyo-2025-polygon') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="oh-homusyo-2025-polygon" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        if (!key.includes('コード')) {
                            html0 += key + '=' + props[key] + '<br>'
                        }
                    })
                    html0 += '<div style="font-size: 14px;margin-top: 5px;" class="feature-area"></div>'
                    html0 += '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>'
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-homusyo-2025-kijyunten-label':
            case 'oh-homusyo-2025-kijyunten':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('kijyunten') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="street-view" style="margin-top:10px;height: 200px;width: 300px"></div>'
                    html0 += '<div class="kijyunten" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-homusyo-2025-zukaku-label':
            case 'oh-homusyo-2025-zukaku':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('zukaku') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    // html0 += '<div class="street-view" style="margin-top:10px;height: 200px;width: 300px"></div>'
                    html0 += '<div class="zukaku" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-fukuokakenshinrin':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf(layerId) === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="' + layerId + '" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<br><span style="font-size: 14px;">面積:' + PolygonMetrics.area + ' 周長:' + PolygonMetrics.perimeter +
                        '<br>境界点数:' + PolygonMetrics.vertexCount + '</span>'
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-toshikan-label-layer':
            case 'oh-toshikan-label':
            case 'oh-toshikan-layer':
            case 'oh-gaiku-label-layer':
            case 'oh-gaiku-label':
            case 'oh-gaiku-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('gaiku') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="street-view" style="margin-top:10px;height: 200px;width: 300px"></div>'
                    html0 += '<div class="gaiku" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    // if (isIphone()) html0 += '<div class="street-view" style="margin-top:10px;height: 200px;width: 300px"></div>'
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-fukuokakenhazard':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(coordinates)
                props = features[0].properties
                let kuiki
                if (props.kubun === '特別警戒区域') {
                    kuiki = '<span style="color: red">' + props.kubun + '</span>'
                } else {
                    kuiki = props.kubun
                }
                if (html.indexOf('fukuokakenhazard') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="fukuokakenhazard" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:22px;">' + props.genshoname + ' ' + kuiki + '</span><hr>' +
                        '<span style="font-size:14px;">' + props.shozaichi + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-minden-circle':
            case 'oh-ntrip-circle':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('ntrip') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="ntrip" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'geojson-polygon-layer':
            case 'geojson-polygon-line-layer':
            case 'geojson-line-layer':
            case 'geojson-point-layer':
            case 'kml-polygon-layer':
            case 'kml-polygon-line-layer':
            case 'kml-line-layer':
            case 'kml-point-layer':
            case 'dxf-polygon-layer':
            case 'dxf-polygon-line-layer':
            case 'dxf-line-layer':
            case 'dxf-point-layer':
            case 'dxf-label':
            case 'gpx-polygon-layer':
            case 'gpx-polygon-line-layer':
            case 'gpx-line-layer':
            case 'gpx-point-layer':
            case 'zip-polygon-layer':
            case 'zip-polygon-line-layer':
            case 'zip-line-layer':
            case 'zip-point-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('kml') === -1) {
                    html += '<div class="layer-label-div">　</div>'
                    html0 += '<div class="kml" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'click-points-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                if (features.length === 0) return
                props = features[0].properties

                const jgdCoord = wsg84ToJgd(coordinates)

                if (html.indexOf('click-points-layer') === -1) {
                    html += '<div class="layer-label-div">' + '座標取得＆SIMA出力' + '</div>'
                    html +=
                        '<div class="click-points-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:16px;">経度:' + coordinates[0].toFixed(3) + ' 緯度:' + coordinates[1].toFixed(3) + '</span><hr>' +
                        '<span style="font-size:16px;">' + store.state.zahyokei + '</span><br>' +
                        '<span style="font-size:16px;">' + jgdCoord[0].toFixed(3) + ', ' + jgdCoord[1].toFixed(3) + '</span><hr>' +
                        '<button class="sima-output pyramid-btn" id="' + props.id  + '" zahyokei="' + store.state.zahyokei + '">SIMA出力一点</button><br>' +
                        '<button class="sima-output-all pyramid-btn" zahyokei="' + store.state.zahyokei + '">SIMA出力全部</button><br>' +
                        '<button class="point-delete pyramid-btn" id="' + props.id + '">このポイントを削除</button><br>' +
                        '<button class="point-delete-all pyramid-btn">ポイントを全て削除</button><br>' +
                        '</div>'
                }
                break
            }
            case 'sima-layer':
            case 'sima-points':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                if (features.length === 0) return
                props = features[0].properties
                if (html.indexOf('sima-points') === -1) {
                    html += '<div class="layer-label-div">' + 'SIMA' + '</div>'
                    html +=
                        '<div class="sima-points" font-weight: normal; color: #333;line-height: 25px;">' +
                        '</div>'
                }
                break
            }
            case 'oh-fj-ekijyoka-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('ekijyoka') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="ekijyoka" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:16px;">' + props.topographic_classification_name_ja + '</span><br>' +
                        '<span style="font-size:16px;">液状化発生傾向=' + props.liquefaction_tendency_level + '</span><br>' +
                        '<span style="font-size:16px;">' + props.note + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-fj-ricchitekiseika-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('ricchitekiseika') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="ricchitekiseika" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">区域名＝' + props.kubun_name_ja + '</span><br>' +
                        '<span style="font-size:16px;">都道府県名＝' + props.prefecture + '</span><br>' +
                        '<span style="font-size:16px;">行政区域コード=' + props.city_code + '</span><br>' +
                        '<span style="font-size:16px;">市町村名＝' + props.city_name + '</span><br>' +
                        '<span style="font-size:16px;">区域設定年月日＝' + props.decision_date + '</span><br>' +
                        '<span style="font-size:16px;">設定区分＝' + props.decision_classification + '</span><br>' +
                        '<span style="font-size:16px;">設定者名＝' + props.decision_maker + '</span><br>' +
                        '<span style="font-size:16px;">告示番号＝' + props.notice_number + '</span><br>' +
                        '<span style="font-size:16px;">区域コード＝' + props.kubun_id + '</span><br>' +
                        '<span style="font-size:16px;">区域区分＝' + props.area_classification_ja + '</span><br>' +
                        '<span style="font-size:16px;">当初決定日＝' + props.first_decision_date + '</span><br>' +
                        '<span style="font-size:16px;">告示番号S＝' + props.notice_number_s + '</span><br>' +
                        '</div>'
                }
                break
            }
            case 'oh-saga-kijyunten-label':
            case 'oh-saga-kijyunten-point':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('saga-kijyunten') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>'
                    html0 += '<div class="saga-kijyunten" font-weight: normal; color: #333;line-height: 25px;">'
                    Object.keys(props).forEach(function (key) {
                        html0 += key + '=' + props[key] + '<br>'
                    })
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-city-geojson-poligon-layer':
            case 'oh-city-pmtiles-poligon-layer':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                if (features.length === 0) return

                // ⭐️---------------------------------------------------------------------------------------------------
                let sec
                if (store.state.showChibanzuDrawer) {
                    store.commit('setChibanzuDrawer', false)
                    sec = 500
                } else {
                    sec = 0
                }
                store.state.popupFeatureProperties = features[0].properties
                store.state.popupFeatureCoordinates = coordinates
                const tgtElm = document.querySelector('.comment-text')
                if (tgtElm) tgtElm.innerHTML = ''
                const tgtElm2 = document.querySelector('.v-cool small')
                if (tgtElm2) tgtElm2.innerHTML = ''
                setTimeout(() => {
                    store.commit('setRightDrawer', false)
                    store.commit('setChibanzuDrawer', true)
                },sec)
                // -----------------------------------------------------------------------------------------------------


                // props = features[0].properties
                // let publicType
                // switch (props.public) {
                //     case 1:
                //         publicType = '入手方法＝ユーザーによる開示請求'
                //         break
                //     case 2:
                //         publicType = '<a target="_blank" href=' + props.page + '>入手方法＝オープンデータ</a>'
                //         break
                //     case 3:
                //         publicType = '<span style="font-size: smaller;">開示請求により入手できたが公開の可否不明</span>'
                //         break
                //     default:
                //         publicType = '入手方法＝未取得'
                // }
                // let ku = ''
                // // if (props.N03_005) ku = props.N03_005
                // if (props.N03_004 === '札幌市') ku = props.N03_005
                // if (html.indexOf('oh-city-geojson-poligon-layer') === -1) {
                //     html += '<div class="layer-label-div">全国地番図公開マップ</div>'
                //     html +=
                //         '<div class="oh-city-geojson-poligon-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                //         // '<span style="font-size:16px;">' + publicType + '</span><hr>' +
                //         '<span style="font-size:22px;">' + props.N03_001 + props.N03_004 + ku + '</span>' +
                //         '</div>'
                // }

                break
            }
            case 'oh-point-layer':
            {

                // let features = map.queryRenderedFeatures(map.project(coordinates), {layers: [layerId]})
                // if (features.length === 0) {
                //     features = map.queryRenderedFeatures(map.project(e.lngLat), {layers: [layerId]})
                // }
                //
                // if (features.length > 0) {
                //     const clickedFeature = features[0]
                //
                //     // Vuex に選択中ポイントとして保存
                //     store.commit('setSelectedPointFeature', clickedFeature)
                //
                //     // groupGeojson.features になければ push（重複チェック）
                //     const exists = store.state.groupGeojson.features.some(f => f.properties?.id === clickedFeature.properties?.id)
                //     if (!exists) {
                //         store.state.groupGeojson.features.push(JSON.parse(JSON.stringify(clickedFeature)))
                //     }
                //
                //     store.commit('setPointInfoDrawer', true)
                // }
                html = 'dumy'
                // const featureId = feature.properties.id
                // console.log(coordinates)
                // props = features[0].properties
                // if (html.indexOf('oh-group-points-layer') === -1) {
                //     html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                //     html +=
                //         '<div class="oh-group-points-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                //         '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>' +
                //         `<button class="point-remove pyramid-btn" data-id="${featureId}">ポイントを削除</button>` +
                //         '</div>'
                // }
                break
            }
            case 'oh-kokuyurin-polygon':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                console.log(features)
                if (features.length === 0) return
                props = features[0].properties
                let html0 = ''
                if (html.indexOf('kokuyurin') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html0 += '<div class="kokuyurin" font-weight: normal; color: #333;line-height: 25px;">'
                    html0 += '<span style="font-size:16px;">森林管理局＝' + props.A45_008 + '</span><br>'
                    html0 += '<span style="font-size:16px;">森林管理署＝' + props.A45_009 + '</span><br>'
                    html0 += '<span style="font-size:16px;">小班＝' + props.A45_010 + '</span><br>'
                    html0 += '<span style="font-size:16px;">林小班＝' + props.A45_011 + '</span><br>'
                    html0 += '<span style="font-size:16px;">国有林名称＝' + props.A45_013 + '</span><br>'
                    html0 += '<span style="font-size:16px;">県市町村名＝' + props.A45_014 + '</span><br>'
                    html0 += '<span style="font-size:16px;">雑種１＝' + props.A45_015 + '</span><br>'
                    html0 += '<span style="font-size:16px;">雑種２＝' + props.A45_018 + '</span><br>'
                    html0 += '<span style="font-size:16px;">林種＝' + props.A45_025 + '</span><br>'
                    html0 += '<span style="font-size:16px;">機能類型＝' + props.A45_026 + '</span><br>'
                    html0 += '<span style="font-size:16px;">小班面積ha＝' + props.A45_027 + '</span><br>'
                    html0 += '<span style="font-size:16px;">保安林＝' + props.A45_028 + '</span><br>'
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'oh-homusyo-2025-ninizahyo-simbol':
            case 'oh-homusyo-2025-ninizahyo-circle':
            {
                let features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: [layerId]}
                )
                if (features.length === 0) {
                    features = map.queryRenderedFeatures(
                        map.project(e.lngLat), {layers: [layerId]}
                    )
                }
                if (features.length === 0) return
                props = features[0].properties
                const zips = JSON.parse(props.ZIPファイル名)
                const lonLat = JSON.stringify([props.経度,props.緯度])
                isBreak = true
                let zipBtnsHtml = ''
                zips.forEach(zipName => {
                    zipBtnsHtml += '<button lon-lat = "' + lonLat + '" style="margin-bottom: 5px; height: 30px; font-size: medium; width: 100%;" class="ninnzahyo-zip pyramid-btn">' + zipName + '</button>'
                })
                let html0 = ''
                if (html.indexOf('ninizahyo') === -1) {
                    html += '<div class="layer-label-div">任意座標追加</div>'
                    html0 += '<div style="width: 200px; class="ninizahyo" font-weight: normal; color: #333;line-height: 25px;">'
                    html0 += '編集は右のペンのアイコンから'
                    html0 += zipBtnsHtml
                    html0 += '<button style="margin-bottom: 5px; height: 30px; font-size: medium; width: 100%;" class="ninnzahyo-zip-remove pyramid-btn">削　除</button>'
                    html0 += '<div>'
                    html += html0
                }
                break
            }
            case 'click-circle-layer':
            case 'click-circle-symbol-layer':
            case 'click-circle-line-layer':
            case 'click-circle-keiko-line-layer':
            case 'click-circle-label-layer':
            {
                html = ''
                isBreak = true
                coordinates = store.state.coordinates
                console.log(store.state.clickCircleGeojsonText)
                console.log(store.state.id)
                if (store.state.clickCircleGeojsonText) {
                    features = JSON.parse(store.state.clickCircleGeojsonText).features
                } else {
                    features = JSON.parse(store.state.clickCircleGeojsonTextMyroom).features
                    store.state.clickCircleGeojsonText = store.state.clickCircleGeojsonTextMyroom
                }
                const feature = features.find(feature => feature.properties.id === store.state.id)
                // alert('到達')
                if (!feature) return;
                // alert('到達')
                props = feature.properties
                console.log(props)
                const lng = props.lng
                const lat = props.lat
                const canterLng = props.canterLng
                const canterLat = props.canterLat
                const radius = Number(props.radius)
                const textSize = props['text-size'] || 16
                const lineWidth = props['line-width'] || 5
                const arrowType = props['arrow-type'] || 'end'
                const isRadius = props.isRadius
                const isArea = props.isArea || false
                const isKeiko = props.keiko || false
                const isCalc = props.calc || false
                const isFreeHand = props['free-hand'] || false
                let display = 'block'
                let display2 = 'none'
                let lineType = 'ラインストリング'
                if (isFreeHand) {
                    display = 'none'
                    display2 = 'block'
                    lineType = 'フリーハンド'
                }
                let selectedEnd,selectedNone,selectedBoth
                switch (arrowType) {
                    case 'end':
                        selectedEnd = 'selected'
                        break
                    case 'none':
                        selectedNone = 'selected'
                        break
                    case 'both':
                        selectedBoth = 'selected'
                        break
                }
                const geoType = feature.geometry.type
                console.log(geoType)
                switch (geoType) {
                    case 'MultiPolygon':
                    case 'Polygon':
                        if (radius) {
                            if (html.indexOf('click-circle-layer') === -1) {
                                let checked = ''
                                if (isRadius) checked = 'checked'
                                html += '<div class="layer-label-div">サークル</div>'
                                html +=
                                    '<div style="width: 260px;"class="click-circle-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                                    '<span style="font-size:20px;" class="circle-label">半径' + radius + 'm</span>' +
                                    '<span style="margin-left: 10px;font-size: 16px;"><input type="checkbox" id="' + props.id + '" class="circle200-check" value=""><label for="' + props.id + '"> 200m</span>' +
                                    '<span style="margin-left: 10px;font-size: 16px;"><input ' + checked + ' type="checkbox" id="' + props.id + '-radius" class="circle-radius-check" value=""><label for="' + props.id + '-radius"> 半径表示</span>' +
                                    '<input id="' + props.id + '" style="width: 100%;" type="range" min="10" max="' + radius * 5 + '" step="10" value="' + radius + '" class="circle-range" lng="' + canterLng + '" lat="' + canterLat + '"/><br>' +
                                    '<input id="' + props.id + '" type="number" style="margin-bottom: 10px;width: 90px;" class="oh-cool-input-number circle-radius-input" min="1" max="100000" step="1" value="' + radius +'">' +
                                    '<input id="' + props.id + '" style="width: 100%;margin-bottom: 10px;" type="text" class="oh-cool-input circle-text" placeholder="ここに入力" value="' + props.label2 + '">' +
                                    '<button id="' + props.id + '" style="margin-bottom: 10px;height: 3wq230px;font-size: medium;" class="circle-delete pyramid-btn">削　除</button><br>' +
                                    '<div style="display: flex;gap: 8px;">' +
                                    '<div class="circle-list">' +
                                    '<div id="' + props.id + '" data-color="red" class="circle-color circle red" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="black" class="circle-color circle black" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="blue" class="circle-color circle blue" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="green" class="circle-color circle green" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="orange" class="circle-color circle orange" tabindex="0"></div>' +
                                    '</div>' +
                                    '<input id="' + props.id + '" type="number" class="oh-cool-input-number line-width-input" min="1" max="100" step="1" value="' + lineWidth +'">' +
                                    '</div>' +
                                    '</div>'
                            }
                        } else {
                            if (html.indexOf('click-circle-layer') === -1) {
                                let ninizahyoPropHtml = ''
                                if (props.isNini) {
                                    ninizahyoPropHtml += '<div style="font-size: 16px;margin-top: 5px;">' + props.大字名 + props.地番 + '</div>'
                                }
                                let checked = ''
                                if (isArea) checked = 'checked'
                                html += '<div class="layer-label-div">ポリゴン</div>'
                                html +=
                                    '<div style="width: 240px;"class="click-circle-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                                    '<div style="position: relative">' +
                                    '<div style="margin-left: 10px;margin-bottom: 10px; font-size: 16px;"><input ' + checked + ' type="checkbox" id="' + props.id + '" class="polygon-area-check" value=""><label for="' + props.id + '"> 面積表示</label>' +
                                    '<input id="' + props.id + '" type="number" class="oh-cool-input-number line-width-input" min="1" max="100" step="1" value="' + lineWidth +'" style="position: absolute;left:120px;top:0px;">' +
                                    '</div>' +
                                    '<input id="' + props.id + '" style="width: 100%;margin-bottom: 5px;" type="text" class="oh-cool-input polygon-text" placeholder="ここに入力" value="' + props.label + '">' +
                                    '<button id="' + props.id + '" style="width: 45%;margin-bottom: 10px;height: 30px;font-size: medium;" class="circle-delete pyramid-btn">削　除</button>' +
                                    '<button id="' + props.id + '" style="width: 50%;margin-bottom: 10px;height: 30px;font-size: medium;margin-left: 10px;" class="remove-others pyramid-btn">自分意外削除</button><br>' +
                                    '<div style="display: flex;gap: 8px;">' +
                                    '<div class="circle-list">' +
                                    '<div id="' + props.id + '" data-color="red" class="polygon-color circle red" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="black" class="polygon-color circle black" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="blue" class="polygon-color circle blue" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="green" class="polygon-color circle green" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="orange" class="polygon-color circle orange" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="hotpink" class="polygon-color circle hotpink" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="yellow" class="polygon-color circle yellow" tabindex="0"></div>' +
                                    '<div id="' + props.id + '" data-color="rgba(0,0,0,0)" class="polygon-color circle transparent" style="border: 1px silver solid" tabindex="0"></div>' +
                                    '</div>' +
                                    '</div>' +
                                    ninizahyoPropHtml +
                                    '</div>'
                            }
                        }
                        break
                    case 'Point':
                        if (html.indexOf('click-circle-layer') === -1) {
                            const keywordList = ['道路', '水路', '畑', '宅地', '田', '雑種地', 'コン杭', 'プレート','プラ杭','鋲'];
                            html += '<div class="layer-label-div">ポイント</div>';
                            html += '<div style="display: flex; width: 100%;">';
                            // 左側：250px固定
                            html += '<div style="width: 250px;">';
                            html +=
                                '<div class="click-circle-layer" style="font-weight: normal; color: #333; line-height: 25px;">' +
                                '<textarea id="' + props.id + '" rows="6" style="width: 100%; margin-bottom: 0px;" type="text" class="oh-cool-input point-text" placeholder="ここに入力">' + props.label + '</textarea>' +
                                '<button id="' + props.id + '" style="margin-bottom: 10px; height: 30px; font-size: medium; width: 100%;" class="point-delete pyramid-btn">削　除</button>' +
                                '<div style="display: flex; gap: 8px;">' +
                                '<div class="circle-list">' +
                                '<div id="' + props.id + '" data-color="red" class="text-color circle red" tabindex="0">T</div>' +
                                '<div id="' + props.id + '" data-color="black" class="text-color circle black" tabindex="0">T</div>' +
                                '<div id="' + props.id + '" data-color="blue" class="text-color circle blue" tabindex="0">T</div>' +
                                '<div id="' + props.id + '" data-color="green" class="text-color circle green" tabindex="0">T</div>' +
                                '<div id="' + props.id + '" data-color="orange" class="text-color circle orange" tabindex="0">T</div>' +
                                '<div id="' + props.id + '" data-color="hotpink" class="text-color circle hotpink" tabindex="0">T</div>' +
                                '</div>' +
                                '<input id="' + props.id + '" style="margin-bottom: 5px;" type="number" class="oh-cool-input-number font-size-input" min="10" max="100" step="1" value="' + textSize + '">' +
                                '</div>' +
                                // '<hr>' +
                                '<div class="circle-list">' +
                                '<div id="' + props.id + '" data-color="red" class="point-color circle red" tabindex="0">P</div>' +
                                '<div id="' + props.id + '" data-color="black" class="point-color circle black" tabindex="0">P</div>' +
                                '<div id="' + props.id + '" data-color="blue" class="point-color circle blue" tabindex="0">P</div>' +
                                '<div id="' + props.id + '" data-color="green" class="point-color circle green" tabindex="0">P</div>' +
                                '<div id="' + props.id + '" data-color="orange" class="point-color circle orange" tabindex="0">P</div>' +
                                '<div id="' + props.id + '" data-color="hotpink" class="point-color circle hotpink" tabindex="0">P</div>' +
                                '<div id="' + props.id + '" data-color="rgba(0,0,0,0)" class="point-color circle transparent" style="border: 1px silver solid" tabindex="0">P</div>' +
                                '</div>' +
                                '</div>';
                            html += '</div>';

                            // 右側：単語リスト
                            html += '<div style="flex: 1; margin-left: 10px; height: 290px; overflow: scroll">';

                            keywordList.forEach(word => {
                                html += '<div id="' + props.id + '"  class="keyword-item" ' +
                                    'onclick="document.getElementById(\'' + props.id + '\').value = \'' + word + '\'">' + word + '</div>';
                            });
                            html += '</div>'; // 右パネル終わり
                            html += '</div>'; // flex container end
                        }
                        break
                    case 'LineString': {
                        // ラインストリングとフリーハンド
                        let checked,calcChecked
                        if (isKeiko) checked = 'checked'
                        if (isCalc) calcChecked = 'checked'
                        if (html.indexOf('click-circle-layer') === -1) {
                            html += '<div class="layer-label-div">' + lineType + '</div>'
                            html +=
                                '<div style="width: 225px;"class="click-circle-layer" font-weight: normal; color: #333;line-height: 25px;">' +
                                '<div style="display: ' + display + '">' +
                                '<select id="' + props.id + '" class="oh-cool-select">' +
                                '<option value="end" ' + selectedEnd + '>矢印有り</option>' +
                                '<option value="none" ' + selectedNone + '>矢印無し</option>' +
                                '<option value="both" ' + selectedBoth + '>両矢印</option>' +
                                '</select>' +
                                '<span style="margin-left: 10px;font-size: 16px;"><input ' + calcChecked + ' type="checkbox" id="calc-' + props.id + '" class="calc-check"><label for="calc-' + props.id + '"> 距離計測</span>' +
                                '</div>' +
                                '<div style="display: ' + display2 + '">' +
                                '<span style="margin-left: 10px;font-size: 16px;"><input ' + checked + ' type="checkbox" id="keiko-' + props.id + '" class="keiko-check"><label for="keiko-' + props.id + '"> 蛍光ペン</span>' +
                                '</div>' +
                                '<button id="' + props.id + '" style="margin-bottom: 10px;height: 30px;font-size: medium;width:47%;" class="line-delete pyramid-btn">削　除</button>' +
                                '<div class="tooltip-wrapper" data-tooltip="標高値も取得できます。" style="position:relative; display:inline-block;width:47%;">' +
                                '<button id="' + props.id + '" style="margin-bottom: 10px;margin-left:10px;height: 30px;font-size: medium;width:100%;" class="line-sima pyramid-btn">各種出力</button>' +
                                '</div>' +
                                '<div style="display: flex;gap: 8px;">' +
                                '<div class="circle-list">' +
                                '<div id="' + props.id + '" data-color="red" class="line-color circle red" tabindex="0"></div>' +
                                '<div id="' + props.id + '" data-color="black" class="line-color circle black" tabindex="0"></div>' +
                                '<div id="' + props.id + '" data-color="blue" class="line-color circle blue" tabindex="0"></div>' +
                                '<div id="' + props.id + '" data-color="green" class="line-color circle green" tabindex="0"></div>' +
                                '<div id="' + props.id + '" data-color="orange" class="line-color circle orange" tabindex="0"></div>' +
                                '</div>' +
                                '<input id="' + props.id + '" type="number" class="oh-cool-input-number line-width-input" min="1" max="100" step="1" value="' + lineWidth + '">' +
                                '</div>' +
                                '</div>'
                        }
                        break
                    }
                }
                isGooglemap = false
                if (window.innerWidth < 500) {
                    store.state.popupHtml = html
                    store.state.popupDialog = true
                    html = ''
                }
                if (layerId === 'click-circle-label-layer') {
                    extractAndOpenUrls(props.label)
                }
                if (props.lassoSelected) {
                    store.state.isLassoSelected = true
                }
                break
            }
        }
        if (isBreak) {
            isBreak = false
            break;
        } // 完全に抜ける}

        if(/^oh-chibanzu-/.test(layerId)) {
            let features = map.queryRenderedFeatures(
                map.project(coordinates), {layers: [layerId]}
            )
            if (features.length === 0) {
                features = map.queryRenderedFeatures(
                    map.project(e.lngLat), {layers: [layerId]}
                )
            }
            // ⭐️---------------------------------------------------------------------------------------------------
            // app.vueの4250行あたりに移動
            // if (store.state.isRenzoku) {
            //     const targetId = features[0].properties.id
            //     console.log(targetId)
            //     console.log(store.state.highlightedChibans)
            //     if (!store.state.highlightedChibans.has(targetId)) {
            //         console.log(store.state.highlightedChibans)
            //         store.state.popupFeatureProperties = features[0].properties
            //         store.state.popupFeatureCoordinates = coordinates
            //         store.commit('setRightDrawer', true)
            //     } else {
            //         console.log(111)
            //     }
            //     return
            // }
            // -----------------------------------------------------------------------------------------------------
            if (store.state.isRenzoku) return
            props = features[0].properties

            let html0 = ''
            if (html.indexOf('iwatapolygon') === -1) {
                html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                html0 += '<div class="iwatapolygon" font-weight: normal; color: #333;line-height: 25px;">'
                Object.keys(props).forEach(function (key) {
                    html0 += key + '=' + props[key] + '<br>'
                })
                html0 += '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>'
                html0 += '<div>'
                html += html0
            }
        }

        if(/^oh-chiban-/.test(layerId) || /^oh-chibanL-/.test(layerId)) {

            let features = map.queryRenderedFeatures(
                map.project(coordinates), {layers: [layerId]}
            )
            if (features.length === 0) {
                features = map.queryRenderedFeatures(
                    map.project(e.lngLat), {layers: [layerId]}
                )
            }
            console.log(features[0].geometry.type)
            if (store.state.isRenzoku && features[0].geometry.type === 'Polygon') return
            if (features.length === 0) return
            props = features[0].properties
            let html0 = ''
            if (html.indexOf(layerId) === -1) {
                html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                html0 += '<div class=' + layerId + ' font-weight: normal; color: #333;line-height: 25px;">'
                Object.keys(props).forEach(function (key) {
                    html0 += key + '=' + props[key] + '<br>'
                })
                html0 += '<div class="street-view" style="margin-top:0px;height: 200px;width: 300px"></div>'
                html0 += '<div>'
                html += html0
            }
        }

        if(/^oh-sima-/.test(layerId)) {
            // const streetViewHref = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + coordinates.lat + "," + coordinates.lng + "&hl=ja"
            let features = map.queryRenderedFeatures(
                map.project(coordinates), {layers: [layerId]}
            )
            if (features.length === 0) {
                features = map.queryRenderedFeatures(
                    map.project(e.lngLat), {layers: [layerId]}
                )
            }
            if (features.length === 0) return
            props = features[0].properties
            let propName
            if (props.type && props.type === 'vertex') {
                propName = '筆界点'
            } else {
                propName = '地番'
            }
            if (html.indexOf("oh-sima") === -1) {
                html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                html +=
                    '<div class="oh-sima" font-weight: normal; color: #333;line-height: 25px;">' +
                    '<span style="font-size:18px;">' + propName + '=' + props.chiban + '</span><br>' +
                    '<div class="street-view" style="margin-top:10px;height: 200px;width: 300px"></div>' +
                    '</div>'
            }
            store.state.snackbar = true
        }
    }

    if (mapFlg.map02) {
        const layer = store.state.map02.getStyle().layers.at(-1)
        if (layer.type === 'raster') {
            closeAllPopups()
        } else {
            if (popups.length === 2) closeAllPopups()
        }
        if (popups.length === 2) closeAllPopups()
    } else {
        closeAllPopups()
    }

    // ポップアップ作成
    let rasterLayerIds = [];
    const mapLayers = map.getStyle().layers
    // console.log(mapLayers)
    mapLayers.forEach(layer => {
        // レイヤーのtypeプロパティを取得
        const type = layer.type;
        if (type === 'raster') {
            rasterLayerIds.push(layer.id);
        }
        // 本当は↓こっちが良い。昔のリンクの関係で↑を使用している。
        // if (layer.id.indexOf('rgb') !== -1) {
        //   rasterLayerIds.push(layer.id)
        // }
    });
    // console.log(rasterLayerIds)
    // ラスタレイヤのidからポップアップ表示に使用するURLを生成
    rasterLayerIds.forEach(rasterLayerId => {
        const RasterTileUrl = urlByLayerId(rasterLayerId)[0]
        const legend = urlByLayerId(rasterLayerId)[1]
        const z = urlByLayerId(rasterLayerId)[2]
        const lng = e.lngLat.lng
        const lat = e.lngLat.lat
        // if (RasterTileUrl) {
        getLegendItem(legend, RasterTileUrl, lat, lng,z).then(function (v) {
            let res = (v ? v.title : '')
            // if (res === '') return
            if (res) {
                html += '<div class="layer-label-div-red">' + getLabelByLayerId(rasterLayerId, store.state.selectedLayers) + '</div>'
                switch (rasterLayerId) {
                    case 'oh-rgb-kozui-keikaku-layer':
                    case 'oh-rgb-kozui-saidai-layer':
                        html +=
                            '<div font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size: 12px;">洪水によって想定される浸水深</span><br>' +
                            '<span style="font-size: 24px;">' + res + '</span>' +
                            '</div>'
                        break
                    case 'oh-rgb-tsunami-layer':
                        html +=
                            '<div font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size: 12px;">津波によって想定される浸水深</span><br>' +
                            '<span style="font-size: 24px;">' + res + '</span>' +
                            '</div>'
                        break
                    case 'oh-rgb-shitchi-layer':
                        html +=
                            '<div font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size: 16px;">' + res[0] + '</span><hr>' +
                            '<span style="font-size: 12px;">' + res[1] + '</span>' +
                            '</div>'
                        break
                    default:
                        html +=
                            '<div font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size: 16px;">' + res + '</span>' +
                            '</div>'
                }
            }
            if (html) {
                try {
                    createPopup(map, [lng,lat], html, mapName)
                } catch (e) {
                    console.log(e)
                }
            }
        })

        const result = mapLayers.find(layer => {
            return layer.id === 'oh-rgb-seamless-layer'
        })
        if (result) {
            const point = lat + "," + lng;
            const url = 'https://gbank.gsj.jp/seamless/v2/api/1.2/legend.json'
            axios.get(url, {
                params: {
                    point:point
                }
            }) .then(function (response) {
                if (response.data.symbol) {
                    if (html.indexOf('seamless') === -1) {
                        html += '<div class="layer-label-div">' + getLabelByLayerId('oh-rgb-seamless-layer', store.state.selectedLayers) + '</div>'
                        html +=
                            '<div class="seamless" font-weight: normal; color: #333;line-height: 25px;">' +
                            '<span style="font-size:16px;">形成時代 = ' + response.data["formationAge_ja"] + '</span><hr>' +
                            '<span style="font-size:16px;">グループ = ' + response.data["group_ja"] + '</span><hr>' +
                            '<span style="font-size:16px;">岩相 = ' + response.data["lithology_ja"] + '</span>'
                        createPopup(map, [lng,lat], html, mapName)
                    }
                }
            })
        }
    })

    if (rasterLayerIds.length === 0) {
        let lng = e.lngLat.lng
        let lat = e.lngLat.lat
        if (coordinates.length > 0) {
            lng = coordinates[0]
            lat = coordinates[1]
        }
        if (html || store.state.mapillaryFlg) {
            createPopup(map, [lng, lat], html, mapName)
        }
    } else {
        if (!html && store.state.mapillaryFlg) {
            let lng = e.lngLat.lng
            let lat = e.lngLat.lat
            createPopup(map, [lng,lat], html, mapName)
        }
    }
    // if (!html && store.state.mapillaryFlg) {
    //     let lng = e.lngLat.lng
    //     let lat = e.lngLat.lat
    //     createPopup(map, [lng,lat], html, mapName)
    // }
}

export function enableMotionPermission() {
    if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
        // iOS (Safariなど)
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    console.log('📱 モーションセンサーの使用が許可されました');
                } else {
                    alert('モーションセンサーが許可されていません');
                }
            })
            .catch(console.error);
    } else {
        // Android / PC（多くは許可不要）
        console.log('モーションセンサーの許可は不要です');
    }
}

async function createPopup(map, coordinates, htmlContent, mapName) {
    // ストリートビューとGoogleマップへのリンクを追加
    const [lng, lat] = coordinates;
    console.log(lng)
    let streetView =
        '<hr>' +
        '<div style="text-align: center;">' +
        '<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat + ',' + lng + '&hl=ja" target="_blank">Street View</a>　' +
        '<a href="https://www.google.co.jp/maps?q=' + lat + ',' + lng + '&hl=ja" target="_blank">GoogleMap</a>' +
        '</div>'

    if (!isGooglemap) streetView = ''

    // ポップアップHTMLを生成
    let popupHtml = `<div class="popup-html-div">${htmlContent}${streetView}</div>`;
    let popupWidth = 300
    if (store.state.mapillaryFlg) {
        let height
        if (window.innerWidth < 400) {
            popupWidth = 300
            height = 200
        }
        if (htmlContent.includes('street-view') || !htmlContent) {
            popupHtml = `<div class="popup-html-div">${htmlContent}<div class="mapillary-container" style="width: ${popupWidth}px;height: ${height}px; margin-top: 20px;"></div>${streetView}</div>`
        }
    }

    // // マピラリー---------------------------------------------------------------------------------------------------------
    // if (store.state.mapillaryFlg) {
    //     const MAPILLARY_CLIENT_ID = 'MLY|9491817110902654|13f790a1e9fc37ee2d4e65193833812c';
    //     async function mapillary() {
    //         const deltaLat = 0.00009; // 約10m
    //         const deltaLng = 0.00011; // 東京近辺での約10m
    //         const response = await fetch(`https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_ID}&fields=id,thumb_1024_url&bbox=${lng - deltaLng},${lat - deltaLat},${lng + deltaLng},${lat + deltaLat}&limit=1`);
    //         const data = await response.json();
    //         if (data.data && data.data.length > 0) {
    //             const imageUrl = data.data[0].thumb_1024_url;
    //             const img = `mapillary<br><a href="${imageUrl}" target="_blank"><img width="300px" src="${imageUrl}" alt="Mapillary Image"></a>`;
    //             return img;
    //         } else {
    //             return '近くにMapillary画像が見つかりませんでした。';
    //         }
    //     }
    //     const img = await mapillary()
    //     htmlContent = htmlContent.replace(/<div class="street-view"[^>]*>.*?<\/div>/gs, '');
    //     popupHtml = `<div class="popup-html-div">${htmlContent}${img}${streetView}</div>`;
    // }
    // マピラリーここまで----------------------------------------------------------------------------------------------------
//     if (store.state.mapillaryFlg) {
//         const mlyHtml = `
//             <div class="mapillary-viewer-container" style="width: 300px; height: 200px;">
// <!--                <div id="mly" style="width: 100%; height: 100%;"></div>-->
//                 <div id="mly" style="width: 300px; height: 200px; background: #ccc;"></div>
//             </div>
//         `;
//         htmlContent = htmlContent.replace(/<div class="street-view"[^>]*>.*?<\/div>/gs, '');
//         popupHtml = `<div class="popup-html-div">${htmlContent}${mlyHtml}${streetView}</div>`;
//     }

    // 既存のポップアップを全て削除
    popups.forEach(popup => popup.remove());
    popups.length = 0;

    // ポップアップを作成して地図に追加
    function onPanelEnter () {
        store.state.panelHoverCount++;
        store.state.isCursorOnPanel = true;
        console.log(store.state.isCursorOnPanel)
    }
    function onPanelLeave() {
        store.state.panelHoverCount = Math.max(store.state.panelHoverCount - 1, 0);
        if (store.state.panelHoverCount === 0) {
            store.state.isCursorOnPanel = false;
        }
    }
    const center = map.getCenter(); // 中心の緯度経度
    let position = coordinates
    let isSmartPhone = false
    if (window.innerWidth < 450) isSmartPhone = true
    if (isSmartPhone) {
        position = center
    }

    if (htmlContent !== 'dumy') {
        const popup = new maplibregl.Popup({
            closeButton: true,
            maxWidth: "380px",
        })
            .setLngLat(position)
            .setHTML(popupHtml)
            .addTo(map);
        // ポップアップイベント設定
        popups.push(popup);
        popup.on('close', closeAllPopups);
        const popupEl = popup.getElement();
        popupEl.style.zIndex = getMaxZIndex()
        popupEl.addEventListener('click', (e) => {
            console.log('popup clicked!', e.currentTarget);
            e.currentTarget.style.zIndex = getMaxZIndex()
        });

        // 次の描画タイミングで高さを取得して再配置
        if (isSmartPhone) {
            requestAnimationFrame(() => {
                const h = popup.getElement().offsetHeight;
                const screen = map.getCanvas().getBoundingClientRect();
                const lngLat = map.unproject([screen.width / 2, screen.height / 2 + h / 2]);
                popup.setLngLat(lngLat);
            });
        }

        // Popupのdivは複数存在する場合があるので全てに仕掛けるのが安全
        setTimeout(() => {
            document.querySelectorAll('.maplibregl-popup').forEach(div => {
                div.addEventListener('mouseenter', onPanelEnter);
                div.addEventListener('mouseleave', onPanelLeave);
            });
        },500)
    }

    let container = document.querySelector('.street-view');
    let viewer = null;
    if (store.state.mapillaryFlg) {
        if (!container) {
            if (window.innerWidth < 0) {
                container = document.querySelector('.mapillary-container');
            } else {
                store.state.mapillaryDialog = true
                popups.forEach(popup => popup.remove());
                popups.length = 0;
            }
        }
        setTimeout(() => {
            if (window.innerWidth > 0) container = document.querySelector('.mapillary-container2');
            if (container && store.state.mapillaryFlg) {
                store.state.loading2 = true
                store.state.loadingMessage = '読み込み中です。'
                async function mapillarySet() {
                    const MAPILLARY_CLIENT_ID = 'MLY|9491817110902654|13f790a1e9fc37ee2d4e65193833812c';
                    const deltaLat = 0.00009; // 約10m
                    const deltaLng = 0.00011; // 東京近辺での約10m
                    const response = await fetch(`https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_ID}&fields=id,thumb_1024_url&bbox=${lng - deltaLng},${lat - deltaLat},${lng + deltaLng},${lat + deltaLat}&limit=1`);
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        const imageId = data.data[0].id;
                        // Graph API で画像の sequence を取得
                        // const url = `https://graph.mapillary.com/${imageId}?access_token=${MAPILLARY_CLIENT_ID}&fields=sequence`;
                        // console.log(url)
                        // try {
                        //     const res = await fetch(url);
                        //     const data = await res.json();
                        //     console.log(data)
                        //     if (data.sequence && data.id) {
                        //         console.log('✅ つながっている画像です。Sequence ID:', data.sequence);
                        //     } else {
                        //         console.warn('⚠️ この画像は他とつながっていません（シーケンスなし）');
                        //     }
                        // } catch (err) {
                        //     console.error('❌ 取得エラー:', err);
                        // }
                        // const viewerOptions = {
                        //     accessToken: MAPILLARY_CLIENT_ID,
                        //     cameraControls:CameraControls.Street,
                        //     combinedPanning: false,
                        //     component: {cover: false},
                        //     container,
                        //     imageId,
                        //     imageTiling: false,
                        //     renderMode: RenderMode.Letterbox,
                        //     trackResize: false,
                        //     transitionMode:TransitionMode.Instantaneous,
                        // };
                        // viewer = new Viewer(viewerOptions)
                        viewer = new Viewer({
                            accessToken: MAPILLARY_CLIENT_ID,
                            container: container,
                            imageId: imageId,
                            component: {cover: false}
                        })
                        viewer.on('image', image => {
                            setTimeout(() => {
                                try {
                                    const link = document.querySelector('.mapillary-attribution-image-container').href;
                                    document.querySelector('.attribution-username').innerHTML = `<a href=${link} target=_'blank' >${document.querySelector('.mapillary-attribution-username').innerHTML}</a>`
                                    document.querySelector('.attribution-date').innerHTML = document.querySelector('.mapillary-attribution-date').innerHTML
                                } catch (e) {
                                    console.log(e)
                                }
                            },0)
                            console.log('✔️ 画像読み込み完了:', image);
                            store.state.loading2 = false;
                        });
                    } else {
                        container.innerHTML = '<div style="text-align: center;"><span style="font-size: small">Mapillary画像が見つかりませんでした。</span></div>'
                        console.warn('Mapillary画像が見つかりませんでした');
                        store.state.loading2 = false
                    }
                }
                mapillarySet();
            }
        },0)
    } else {
        if (document.querySelector('.street-view')) {
            document.querySelector('.street-view').style.height = '0px'
            document.querySelector('.street-view').style.width = '0px'
        }
        // setTimeout(() => {
        //     if (container && !store.state.mapillaryFlg) {
        //         async function setupStreetViewWithMotion() {
        //             await enableMotionPermission(); // ← 先に許可をもらう
        //             if (container) {
        //                 new window.google.maps.StreetViewPanorama(container, {
        //                     position: {lat: lat, lng: lng},
        //                     pov: { heading: 34, pitch: 10 },
        //                     zoom: 1,
        //                     disableDefaultUI: true,
        //                 });
        //                 // スクロールリセット（ポップアップ内のスクロール位置をリセット）
        //                 setTimeout(() => {
        //                     document.querySelectorAll('.popup-html-div').forEach(element => {
        //                         element.scrollTop = 0;
        //                     });
        //                 },200)
        //             }
        //         }
        //         setupStreetViewWithMotion()
        //     }
        // },100)
    }







    // if (store.state.mapillaryFlg) {
    //     alert(888)
    //     // popup.on('open', () => {
    //     // 必ず mly の div がある前提！
    //     const mlyContainer = document.getElementById('mly');
    //     if (!mlyContainer) {
    //         console.warn('#mly が存在しないので Mapillary Viewer を描画できません');
    //         return;
    //     }
    //     // async 関数定義 & 実行
    //     (async () => {
    //         const MAPILLARY_CLIENT_ID = 'MLY|9491817110902654|13f790a1e9fc37ee2d4e65193833812c';
    //         const deltaLat = 0.00009;
    //         const deltaLng = 0.00011;
    //
    //         try {
    //             const response = await fetch(`https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_ID}&fields=id&bbox=${lng - deltaLng},${lat - deltaLat},${lng + deltaLng},${lat + deltaLat}&limit=1`);
    //             const data = await response.json();
    //
    //             if (data.data && data.data.length > 0) {
    //                 const imageId = data.data[0].id;
    //                 // setTimeout(() => {
    //                     alert(imageId)
    //                     const mly = document.getElementById('mly');
    //                     console.log('mly:', mly);
    //                     console.log('mly size:', mly.offsetWidth, mly.offsetHeight);
    //                     // Viewer を描画
    //                     new Viewer({
    //                         accessToken: MAPILLARY_CLIENT_ID,
    //                         container: 'mly',
    //                         imageId: imageId
    //                         // imageId: '534813209971432' // ← これは動作確認済みの公開 imageId
    //                         // imageId: '655287021358907' // ※動作確認済み（東京・公開）
    //                         // imageId: '734238110657399' // 東京・都内・確認済
    //                     });
    //                 // },500)
    //             } else {
    //                 mlyContainer.innerHTML = '<p>近くにMapillary画像が見つかりませんでした。</p>';
    //             }
    //         } catch (err) {
    //             console.error('Mapillary fetch error:', err);
    //             mlyContainer.innerHTML = '<p>Mapillaryの画像取得に失敗しました。</p>';
    //         }
    //     })();
    // }



    // スクロールリセット（ポップアップ内のスクロール位置をリセット）
    document.querySelectorAll('.popup-html-div').forEach(element => {
        element.scrollTop = 0;
    });
    // 逆ジオコーディング（住所の取得）
    fetchReverseGeocoding(lng, lat, mapName);
    // -------------------
    const images = document.querySelectorAll('.carousel-images img');
    const carouselButtons = document.querySelector('.carousel-buttons');
    const totalImages = images.length;
    if (totalImages === 1) {
        console.log(carouselButtons)
        carouselButtons.classList.add('hidden');
    }
    pyramid.currentIndex = 0
}
function fetchReverseGeocoding(lng, lat, mapName) {
    axios.get('https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress', {
        params: { lon: lng, lat: lat }
    })
        .then(response => {
            // レスポンスデータの処理
            if (response.data.results) {
                // const address = response.data.results.lv01Nm;
                // ポップアップ内の住所表示要素を更新
                const splitMuni = muni[Number(response.data.results.muniCd)].split(',')
                const address = splitMuni[1] + splitMuni[3] + response.data.results.lv01Nm
                const popupAddress = document.querySelector(`#${mapName} .popup-address`);
                if (popupAddress) {
                    popupAddress.innerHTML = address;
                    store.state.popupAddress = address; // 状態に住所を保存
                }
            }
        })
        .catch(error => {
            console.error('Reverse geocoding failed:', error);
        });
}

export function mouseMoveForPopup (e,map) {
    let rasterLayerIds = [];
    const mapLayers = map.getStyle().layers;
    mapLayers.forEach(layer => {
        // const visibility = map.getLayoutProperty(layer.id, 'visibility');
        // レイヤーのtypeプロパティを取得
        const type = layer.type;
        if (type === 'raster') {
            rasterLayerIds.push(layer.id);
        }
    });
    // ラスタレイヤのidからポップアップ表示に使用するURLを生成
    rasterLayerIds.forEach(rasterLayerId => {
        const RasterTileUrl = urlByLayerId(rasterLayerId)[0]
        const legend = urlByLayerId(rasterLayerId)[1]
        // console.log(legend)
        const z = urlByLayerId(rasterLayerId)[2]
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        if (RasterTileUrl) {
            getLegendItem(legend, RasterTileUrl, lat, lng,z).then(function (v) {
                let res = (v ? v.title : '')
                if (res === '') {
                    // map.getCanvas().style.cursor = ""
                    return
                }
                map.getCanvas().style.cursor = "pointer"
            })
        }
    })
}

