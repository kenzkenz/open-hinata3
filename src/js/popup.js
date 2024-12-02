import store from '@/store'
import codeShizen from "@/js/codeShizen"
import codeShizenOriginal from "@/js/codeShizenOriginal"
import maplibregl from "maplibre-gl"
import axios from "axios";
import muni from "@/js/muni";
const popups = []


console.log(store.state.selectedLayers)

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
function closeAllPopups() {
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
export function popup(e,map,mapName,mapFlg) {
    console.log(mapName)
    let html = ''
    let features = map.queryRenderedFeatures(e.point); // クリック位置のフィーチャーを全て取得
    console.log(features[0])
    // const coordinates = e.lngLat
    let coordinates
    if (features.length > 0) {
        coordinates = features[0].geometry.coordinates.slice()
        if (coordinates.length === 2) {
            if (coordinates[0].length > 0) {
                coordinates = e.lngLat
            }
        } else {
            coordinates = e.lngLat
        }
    } else {
        coordinates = e.lngLat
    }

    // if (features.length > 0) {
    features.forEach(feature => {
        const layerId = feature.layer.id
        console.log(layerId)
        let props = feature.properties
        // const coordinates = e.lngLat
        // let coordinates = feature.geometry.coordinates.slice()
        // if (coordinates.length !== 2) coordinates = e.lngLat
        console.log(props)
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
            case 'oh-koji-label':
            case 'oh-koji-height':
            case 'oh-koji_point': {
                const name = props.L01_025
                const kojikakaku = props.L01_008.toLocaleString() + '円'
                if (html.indexOf('koji_point') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="koji_point" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 20px;">' + name + '</span><br>' +
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
                        '<button class="jinkosuii pyramid-btn" mapname="' + mapName + '" cdArea="' + props.KEY_CODE + '" syochiikiname="' + name + '">人口推移</button>' +
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
            case 'oh-bus-lines': {
                const features = map.queryRenderedFeatures(
                    map.project(coordinates), {layers: ['oh-bus-lines']}
                )
                console.log(features)
                if (features.length === 0) return;
                props = features[0].properties
                const name = props.N07_001
                if (html.indexOf('bus-lines') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="bus-lines" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
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
                        '<span style="font-size: 16px;">' + name + '</span><br>' +
                        '<span style="font-size: 12px;">事業者名=' + props.P11_002 + '</span><br>' +
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
            case 'oh-amx-label':
            case 'oh-amx-a-fude-line':
            case 'oh-amx-a-fude': {
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
                    html0 += '<div>'
                    html += html0
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
            case 'oh-kasen-label':
            case 'oh-kasen': {
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
                if (html.indexOf('kasen') === -1) {
                    html += '<div class="layer-label-div">' + getLabelByLayerId(layerId, store.state.selectedLayers) + '</div>'
                    html +=
                        '<div class="kasen" font-weight: normal; color: #333;line-height: 25px;">' +
                        '<span style="font-size:20px;">河川名＝' + props.W05_004 + '</span><hr>' +
                        '<span style="font-size:16px;">水系名＝' + props.suikei + '</span><br>' +
                        '<button class="kasen-suikei pyramid-btn" mapname="' + mapName + '" suikei="' + props.suikei + '">水系で抽出</button><br>' +
                        '</div>'
                }
                break
            }
        }
    })

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
                createPopup(map, [lng,lat], html, mapName)
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

    if (rasterLayerIds.length === 0){
        let lng = e.lngLat.lng
        let lat = e.lngLat.lat
        if (coordinates.length > 0) {
            lng = coordinates[0]
            lat = coordinates[1]
        }
        if (html) {
            createPopup(map, [lng,lat], html, mapName)
        }
    }
}
function createPopup(map, coordinates, htmlContent, mapName) {
    // ストリートビューとGoogleマップへのリンクを追加
    const [lng, lat] = coordinates;
    const streetView =
        '<hr>' +
        '<div style="text-align: center;">' +
        '<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat + ',' + lng + '&hl=ja" target="_blank">Street View</a>　' +
        '<a href="https://www.google.co.jp/maps?q=' + lat + ',' + lng + '&hl=ja" target="_blank">GoogleMap</a>' +
        '</div>'

    // ポップアップHTMLを生成
    const popupHtml = `<div class="popup-html-div">${htmlContent}${streetView}</div>`;

    // 既存のポップアップを全て削除
    popups.forEach(popup => popup.remove());
    popups.length = 0;

    // ポップアップを作成して地図に追加
    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "350px" })
        .setLngLat(coordinates)
        .setHTML(popupHtml)
        .addTo(map);

    // ポップアップイベント設定
    popups.push(popup);
    popup.on('close', closeAllPopups);

    // スクロールリセット（ポップアップ内のスクロール位置をリセット）
    document.querySelectorAll('.popup-html-div').forEach(element => {
        element.scrollTop = 0;
    });
    // 逆ジオコーディング（住所の取得）
    fetchReverseGeocoding(lng, lat, mapName);
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
        console.log(legend)
        const z = urlByLayerId(rasterLayerId)[2]
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        if (RasterTileUrl) {
            getLegendItem(legend, RasterTileUrl, lat, lng,z).then(function (v) {
                let res = (v ? v.title : '')
                if (res === '') {
                    // map.getCanvas().style.cursor = "default"
                    return
                }
                map.getCanvas().style.cursor = "pointer"
            })
        }
    })
}

