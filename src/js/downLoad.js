import store from '@/store'
import {GITHUB_TOKEN} from "@/js/config";
import * as turf from '@turf/turf'
import maplibregl from 'maplibre-gl'
import proj4 from 'proj4'
import axios from "axios";
import {
    geotiffSource,
    geotiffLayer,
    jpgSource,
    jpgLayer,
    pngSource,
    pngLayer,
    vpsTileSource,
    vpsTileLayer,
    chibanzuLayers0,
    chibanzuLayers,
    chibanzuSources,
    sicyosonChibanzuUrls,
    loadColorData,
    caseTextField,
    clickCircleSource
} from "@/js/layers";
import shpwrite from "@mapbox/shp-write"
import JSZip from 'jszip'
import {history, transformCoordinates} from "@/App";
import tokml from 'tokml'
import iconv from "iconv-lite";
import {kml} from "@tmcw/togeojson";
import * as GeoTIFF from 'geotiff';
import html2canvas from 'html2canvas'
import muni from "@/js/muni";
import Papa from 'papaparse'
import {
    generateSegmentLabelGeoJSON, generateStartEndPointsFromGeoJSON,
    getAllVertexPoints,
    setAllMidpoints
} from "@/js/pyramid";
import { deserialize } from 'flatgeobuf/lib/mjs/geojson.js';
import { PMTiles } from "pmtiles";
import {feature} from "@turf/turf";
import {closeAllPopups} from "@/js/popup";


// import publicChk from '@/components/Dialog-myroom'
// 複数のクリックされた地番を強調表示するためのセット
// export let highlightedChibans = new Set();

const dlMsg = '本データは参考図であり、筆界や権利関係を証明するものではありません。\n\n' +
    'データ利用はすべて自己責任となりますので、地番参考図利用規約を十分に確認してください。\n\n' +
    'ダウンロードをもって地番参考図利用規約に同意したものとみなします。';

(function() {
    // 座標系の定義
    // proj4.defs['EPSG:4326'] = proj4.Proj("+proj=longlat +datum=WGS84 +no_defs");
    proj4.defs['EPSG:2443'] = proj4.Proj("+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");		// 1系
    proj4.defs['EPSG:2444'] = proj4.Proj("+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");			// 2系
    proj4.defs['EPSG:2445'] = proj4.Proj("+proj=tmerc +lat_0=36 +lon_0=132.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");	// 3系
    proj4.defs['EPSG:2446'] = proj4.Proj("+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");		// 4系
    proj4.defs['EPSG:2447'] = proj4.Proj("+proj=tmerc +lat_0=36 +lon_0=134.3333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");	// 5系
    proj4.defs['EPSG:2448'] = proj4.Proj("+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");			// 6系
    proj4.defs['EPSG:2449'] = proj4.Proj("+proj=tmerc +lat_0=36 +lon_0=137.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");	// 7系
    proj4.defs['EPSG:2450'] = proj4.Proj("+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");		// 8系
    proj4.defs['EPSG:2451'] = proj4.Proj("+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");	// 9系
    proj4.defs['EPSG:2452'] = proj4.Proj("+proj=tmerc +lat_0=40 +lon_0=140.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");	//10系
    proj4.defs['EPSG:2453'] = proj4.Proj("+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");		//11系
    proj4.defs['EPSG:2454'] = proj4.Proj("+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");		//12系
    proj4.defs['EPSG:2455'] = proj4.Proj("+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");		//13系
    proj4.defs['EPSG:2456'] = proj4.Proj("+proj=tmerc +lat_0=26 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");			//14系
    proj4.defs['EPSG:2457'] = proj4.Proj("+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");		//15系
    proj4.defs['EPSG:2458'] = proj4.Proj("+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");			//16系
    proj4.defs['EPSG:2459'] = proj4.Proj("+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");			//17系
    proj4.defs['EPSG:2460'] = proj4.Proj("+proj=tmerc +lat_0=20 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");			//18系
    proj4.defs['EPSG:2461'] = proj4.Proj("+proj=tmerc +lat_0=26 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
})()
export const zahyokei = [
    { kei: 'WGS84', code: "EPSG:4326" },
    { kei: 'WGS 84', code: "EPSG:4326" },
    { kei: '公共座標1系', code: "EPSG:2443" },
    { kei: '公共座標2系', code: "EPSG:2444" },
    { kei: '公共座標3系', code: "EPSG:2445" },
    { kei: '公共座標4系', code: "EPSG:2446" },
    { kei: '公共座標5系', code: "EPSG:2447" },
    { kei: '公共座標6系', code: "EPSG:2448" },
    { kei: '公共座標7系', code: "EPSG:2449" },
    { kei: '公共座標8系', code: "EPSG:2450" },
    { kei: '公共座標9系', code: "EPSG:2451" },
    { kei: '公共座標10系', code: "EPSG:2452" },
    { kei: '公共座標11系', code: "EPSG:2453" },
    { kei: '公共座標12系', code: "EPSG:2454" },
    { kei: '公共座標13系', code: "EPSG:2455" },
    { kei: '公共座標14系', code: "EPSG:2456" },
    { kei: '公共座標15系', code: "EPSG:2457" },
    { kei: '公共座標16系', code: "EPSG:2458" },
    { kei: '公共座標17系', code: "EPSG:2459" },
    { kei: '公共座標18系', code: "EPSG:2460" },
    { kei: '公共座標19系', code: "EPSG:2461" }
];
// codeからkeiを取得する関数
function getKeiByCode(code) {
    const result = zahyokei.find(item => item.code === code);
    return result ? result.kei : null;
}
// 現在表示されているレイヤーを取得する関数
function getVisibleRenderedLayers(map) {
    const visibleLayerIds = [];
    const allLayers = map.getStyle().layers;
    allLayers.forEach(layer => {
        const visibility = map.getLayoutProperty(layer.id, 'visibility');
        if (visibility === 'none') return;

        const features = map.queryRenderedFeatures({ layers: [layer.id] });
        if (features.length > 0) {
            visibleLayerIds.push(layer.id);
        }
    });
    return visibleLayerIds;
}


function dissolveGeoJSONByFields(geojson, fields) {
    if (!geojson || !fields || !Array.isArray(fields)) {
        throw new Error("GeoJSONデータとフィールド名（配列）は必須です。");
    }
    try {
        // 1. MultiPolygonやMultiLineStringを標準化
        const normalizedFeatures = geojson.features
            .map((feature) => {
                if (feature.geometry.type === "MultiPolygon") {
                    return feature.geometry.coordinates.map((polygon) => ({
                        type: "Feature",
                        properties: feature.properties,
                        geometry: {
                            type: "Polygon",
                            coordinates: polygon,
                        },
                    }));
                } else if (feature.geometry.type === "MultiLineString") {
                    return feature.geometry.coordinates.map((line) => ({
                        type: "Feature",
                        properties: feature.properties,
                        geometry: {
                            type: "LineString",
                            coordinates: line,
                        },
                    }));
                } else if (
                    feature.geometry.type === "Polygon" ||
                    feature.geometry.type === "LineString"
                ) {
                    return feature;
                }
                return null; // PointやMultiPointは無視
            })
            .flat()
            .filter(Boolean);

        const normalizedGeoJSON = {
            type: "FeatureCollection",
            features: normalizedFeatures,
        };

        // 2. _combinedField を追加して結合キーを作成
        normalizedGeoJSON.features.forEach(feature => {
            feature.properties._combinedField = fields
                .map(field => feature.properties[field] || '')
                .join('_');
        });

        // 3. 融合を実行
        const dissolved = turf.dissolve(normalizedGeoJSON, { propertyName: '_combinedField' });

        // 4. 融合後のプロパティを修復
        const featurePropertyMap = new Map();

        normalizedGeoJSON.features.forEach(feature => {
            const key = feature.properties._combinedField;
            if (!featurePropertyMap.has(key)) {
                featurePropertyMap.set(key, feature.properties);
            }
        });

        dissolved.features.forEach(feature => {
            const key = feature.properties._combinedField;
            if (featurePropertyMap.has(key)) {
                // 融合後のプロパティに元のプロパティを統合
                feature.properties = {
                    ...featurePropertyMap.get(key)
                };
                // _combinedFieldを削除して元に戻す
                delete feature.properties._combinedField;
            }
        });
        return dissolved;
    } catch (error) {
        console.error("GeoJSON処理中にエラーが発生しました:", error);
        return geojson;
    }
}

export function exportLayerToGeoJSON(map,layerId,sourceId,fields) {
    console.log(layerId)
    const source = map.getSource(sourceId);
    if (!source) {
        console.error(`レイヤー ${layerId} のソースが見つかりません。`);
        return null;
    }
    if (source.type === 'geojson') {
        // GeoJSONソースならそのまま返す
        return source._data;
    } else if (source.type === 'vector') {
        // Vectorタイルの場合、現在表示されているフィーチャを取得
        const features = map.queryRenderedFeatures({ layers: [layerId] });
        console.log(features)
        let geojson = {
            type: "FeatureCollection",
            features: features.map(f => f.toJSON())
        };
        console.log(geojson)
        // alert(JSON.stringify(geojson))
        if (geojson.features.length === 0) {
            return null
        }

        if (fields.length === 0) {
            geojson = extractHighlightedGeoJSONFromSource(geojson,layerId)
            console.log(geojson)
            return geojson
        } else {
            geojson = extractHighlightedGeoJSONFromSource(geojson,layerId)
            console.log(geojson)
            return dissolveGeoJSONByFields(geojson, fields)
        }
    } else {
        console.warn('このソースタイプはサポートされていません。');
        return null;
    }
}
export function saveGeojsonToDraw (map,layerId,sourceId,fields) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    const geojson = exportLayerToGeoJSON(map,layerId,sourceId,fields)
    addDraw (geojson,false)
}

export function saveGeojson (map,layerId,sourceId,fields) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    const geojsonText = JSON.stringify(exportLayerToGeoJSON(map,layerId,sourceId,fields))
    console.log(geojsonText)
    const blob = new Blob([geojsonText], { type: 'application/json' });
    // 一時的なダウンロード用リンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = layerId + '.geojson'; // ダウンロードするファイル名
    // リンクをクリックしてダウンロードを実行
    document.body.appendChild(link);
    link.click();
    // 後処理: リンクを削除してメモリを解放
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export async function uploadGeoJSONToGist(geojsonText, gistDescription = 'Uploaded GeoJSON') {
    const token = GITHUB_TOKEN;
    const gistAPIUrl = 'https://api.github.com/gists';
    try {
        const response = await fetch(gistAPIUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: gistDescription,
                public: true,
                files: {
                    'data.geojson': {
                        content: geojsonText
                    }
                }
            })
        });
        if (!response.ok) {
            throw new Error(`アップロード失敗: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('アップロード成功:', data.html_url);
        // alert(`アップロード成功: ${data.html_url}`);
        window.open(data.html_url, '_blank'); // Gistページを新しいタブで開く
        return data.html_url;
    } catch (error) {
        console.error('GeoJSONをアップロード中にエラーが発生しました:', error.message);
        alert(`エラー: ${error.message}`);
    }
}

export function gistUpload (map,layerId,sourceId,fields) {
    // if (map.getZoom() <= 15) {
    //     alert('ズーム15以上にしてください。')
    //     return
    // }
    const geojsonText = JSON.stringify(exportLayerToGeoJSON(map,layerId,sourceId,fields))
    console.log(geojsonText)
    uploadGeoJSONToGist(geojsonText, 'GeoJSON Dataset Upload');
}

// geojsonから最小の地番を取得する関数
function getChibanAndHoka(geojson,isDxf,chiban) {
    if (isDxf) {
        const filteredFeatures = geojson.features.filter(feature => {
            const geometryType = feature.geometry?.type;
            return geometryType === "Polygon" || geometryType === "MultiPolygon";
        });
        // 新しいGeoJSONを構築して返す
        geojson = {
            type: "FeatureCollection",
            features: filteredFeatures
        };
    }
    try {
        // 地番の最小値を取得
        let chiban0 = chiban ? chiban : '地番';
        let firstChiban = geojson.features
            .map(feature => feature.properties?.[chiban0]) // 地番を抽出
            .filter(chiban => chiban !== undefined && chiban !== null) // undefinedやnullを除外
            .map(chiban => Number(chiban)) // 数値に変換
            .filter(chiban => !isNaN(chiban)) // NaNを除外
            .reduce((min, current) => Math.min(min, current), Infinity); // 最小値を取得
        if (firstChiban === Infinity && geojson.features.length > 0) {
            firstChiban = geojson.features[0].properties?.[chiban0] ?? '';
        }
        // hokaの値を設定
        let hoka = '';
        if (firstChiban !== '') {
            if (geojson.features.length > 1) {
                hoka = '外' + (geojson.features.length - 1) + '筆';
            }
        } else {
            firstChiban = '';
        }
        return { firstChiban, hoka };
    }catch (e) {
        return { firstChiban:'', hoka:'' };
    }
}
// GeoJSONから最初に現れる「基準点等名称」または「街区点・補助点名称」を取得する関数
function getFirstPointName(geojson) {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.warn('GeoJSONが無効または空です');
        return { pointName: '', hoka: '' };
    }

    // 最初に見つかった「基準点等名称」または「街区点・補助点名称」を取得
    let pointName = geojson.features
        .map(feature => feature.properties?.['基準点等名称'] || feature.properties?.['街区点・補助点名称'] || feature.properties?.['名称'])
        .find(name => name !== undefined && name !== null && name !== '');

    if (!pointName) {
        pointName = geojson.features[0]?.properties?.['基準点等名称'] || geojson.features[0]?.properties?.['街区点・補助点名称'] || geojson.features[0]?.properties?.['名称'];
    }

    // hokaの値を設定
    let hoka = '';
    if (pointName !== '') {
        if (geojson.features.length > 1) {
            hoka = '外' + (geojson.features.length - 1) + '点';
        }
    } else {
        pointName = '';
    }

    return { pointName, hoka };
}

async function fetchData(id) {
    const response = await fetch(`https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesSelectById.php?id=${id}`);
    const data = await response.json();
    return data;
}

export async function convertAndDownloadGeoJSONToSIMA(map,layerId, geojson, fileName, kaniFlg, zahyokei2, kukaku,jww, kei2,chiban) {
    console.log(geojson)
    geojson = extractHighlightedGeoJSONFromSource(geojson,layerId)
    console.log(geojson)
    let zahyo
    console.log(layerId)
    if (layerId ==='oh-amx-a-fude' || layerId ==='oh-homusyo-2025-polygon') {
        for (const feature of geojson.features) {
            if (feature.properties && feature.properties.座標系) {
                console.log("Found Coordinate Property:", feature.properties.座標系);
                zahyo = feature.properties.座標系; // 最初に見つけた値を返す
                // alert(zahyo)
            }
        }
    } else {
        zahyo = kei2
    }

    console.log(zahyokei2)
    if (zahyokei2) zahyo = zahyokei2

    console.log(zahyo)
    // 公共座標系のリスト
    const code = zahyokei.find(item => item.kei === zahyo).code
    const kei = zahyokei.find(item => item.kei === zahyo).kei
    console.log(code,kei)

    const visibleLayers = getVisibleRenderedLayers(map)
    const osakashi = visibleLayers.find(l => l.includes('大阪市'))
    // alert(JSON.stringify(visibleLayers))
    // alert(osakashi)

    if (kukaku) {
        alert(kei + 'で区画ファイルを作ります。作図範囲は1区画です。ドーナツ形状には対応していません。')
    } else {
        if (kaniFlg) {
            if (osakashi) {
                alert('（１）公開用地籍図データを利用する際は、出典を記載してください。\n' +
                    '（２）公開用地籍図データを編集・加工等して利用する場合は、上記出典とは別に、編集・加工等を行ったことを記載してください。\n' +
                    'なお、編集・加工した情報を、あたかも大阪市が作成したかのような態様で公表・利用しないでください。')
            } else {
                // alert('注!簡易の場合、座標値は元データとほんの少し異なります。座標の利用は自己責任でお願いします。' + kei + 'でsimファイルを作ります。')
                alert(dlMsg)
            }
        } else {
            // alert(kei + 'でsimファイルを作ります。')
        }
    }

    let chibanPropatie
    if(/^oh-chiban-/.test(layerId)) {
        chibanPropatie = await fetchData(layerId.split('-')[2])
        chibanPropatie = chibanPropatie[0].chiban
    }
    // alert(chibanPropatie)

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let B01Text = '';
    let i = 1;
    let j = 1;

    // 座標とカウンターを関連付けるマップ
    const coordinateMap = new Map();
    const firstChiban = getChibanAndHoka(geojson,null,chiban).firstChiban
    const hoka = getChibanAndHoka(geojson,null,chiban).hoka
    console.log(geojson)
    geojson.features.forEach((feature) => {
        let chiban = feature.properties.地番;
        switch (layerId) {
            case 'oh-homusyo-2025-polygon':
                chiban = feature.properties.地番
                break
            case 'oh-chibanzu-川西市':
            case 'oh-chibanzu-長与町':
            case 'oh-chibanzu-福山市':
            case 'oh-chibanzu-甲府市':
            case 'oh-chibanzu-潮来市':
            case 'oh-chibanzu-直方市':
            case 'oh-chibanzu-静岡市':
            case 'oh-chibanzu-福岡市':
            case 'oh-chibanzu-利根町':
            case 'oh-chibanzu-鹿角市':
            case 'oh-chibanzu-ニセコ町':
            case 'oh-chibanzu-室蘭市':
                chiban = feature.properties.地番
                break
            case 'oh-chibanzu-北広島市':
                chiban = feature.properties.Chiban + '-'  + feature.properties.Edaban
                break
            case 'oh-chibanzu-西粟倉村':
            case 'oh-chibanzu-京都市':
            case 'oh-chibanzu-舟形町':
                chiban = feature.properties.TIBAN
                break
            case 'oh-chibanzu-名古屋市':
            case 'oh-chibanzu-西宮市':
            case 'oh-chibanzu-東村山市':
            case 'oh-chibanzu-姫路市':
            case 'oh-chibanzu-磐田市':
            case 'oh-chibanzu-福島市':
            case 'oh-chibanzu-旭川市':
                chiban = feature.properties.TXTCD
                break
            case 'oh-chibanzu-深谷市':
            case 'oh-chibanzu-越谷市':
                chiban = feature.properties.本番 + '-'  + feature.properties.枝番
                break
            case 'oh-chibanzu-佐用町':
            case 'oh-chibanzu-岸和田市':
            case 'oh-chibanzu-町田市':
                chiban = feature.properties.CHIBAN
                break
            case 'oh-chibanzu-長岡京市':
            case 'oh-chibanzu-泉南市':
            case 'oh-chibanzu-国立市':
                chiban = feature.properties.表示文字列
                break
            case 'oh-chibanzu-半田市':
                chiban = feature.properties.番地 + '-' + feature.properties.枝番 + '-' + feature.properties.小枝
                break
            case 'oh-chibanzu-加古川市':
                chiban = feature.properties.TXTCODE1
                break
            case 'oh-chibanzu-奈良市':
                chiban = feature.properties.地番本番 + '-' + feature.properties.地番枝番 + '-' + feature.properties.地番小枝
                break
            case 'oh-chibanzu-坂出市':
                chiban = feature.properties.所在地番3 + '-'  + feature.properties.所在地番5
                break
            case 'oh-chibanzu-善通寺市':
                chiban = feature.properties.本番 + '-' + feature.properties.枝番 + '-' + feature.properties.孫番
                break
            case 'oh-chibanzu-伊丹市':
                chiban = feature.properties.所在地番
                break
            case 'oh-chibanzu-大山崎町':
                chiban = feature.properties.所在
                break
            case 'oh-chibanzu-豊中市':
                chiban = feature.properties.TEXTCODE1
                break
            case 'oh-chibanzu-仙台市':
                chiban = feature.properties.DNO
                break
            case 'oh-chibanzu-高崎市':
                chiban = feature.properties.地番_地番図_label
                break
            case 'oh-chibanzu-城陽市':
            case 'oh-chibanzu-音更町':
                chiban = feature.properties.chiban
                break
            case 'oh-chibanzu-香芝市':
                chiban = feature.properties.地番名称
                break
            case 'oh-chibanzu-唐津市':
                chiban = feature.properties.SAFIELD001
                break
            case 'oh-chibanzu-all':
                // とりあえずidにする。
                chiban = feature.properties.id
                break
        }

        if(/^oh-chiban-/.test(layerId)) {
            chiban = feature.properties[chibanPropatie]
        }

        B01Text += 'D00,' + i + ',' + chiban + ',1,\n';
        let coordinates = [];
        if (feature.geometry.type === 'Polygon') {
            coordinates = feature.geometry.coordinates.map(ring => {
                if (
                    ring.length > 1 &&
                    (ring[0][0] !== ring[ring.length - 1][0] ||
                        ring[0][1] !== ring[ring.length - 1][1])
                ) {
                    // 閉じていない場合、始点を終点として追加
                    ring.push(ring[0]);
                }
                return ring;
            });
        } else if (feature.geometry.type === 'MultiPolygon') {
            coordinates = feature.geometry.coordinates.map(polygon =>
                polygon.map(ring => {
                    if (
                        ring.length > 1 &&
                        (ring[0][0] !== ring[ring.length - 1][0] ||
                            ring[0][1] !== ring[ring.length - 1][1])
                    ) {
                        ring.push(ring[0]);
                    }
                    return ring;
                })
            ).flat();
        } else if (feature.geometry.type === 'Point') {
            coordinates = [feature.geometry.coordinates]; // 単一のポイント
        } else if (feature.geometry.type === 'MultiPoint') {
            coordinates = feature.geometry.coordinates.map(point => [...point]); // 複数のポイント
        } else {
            console.warn('Unsupported geometry type:', feature.geometry.type);
            return; // 他のタイプはスキップ
        }

        coordinates.forEach((ring, ringIndex) => {
            const len = ring.length;
            ring.forEach((coord, index) => {
                if (
                    Array.isArray(coord) &&
                    coord.length === 2 &&
                    Number.isFinite(coord[0]) &&
                    Number.isFinite(coord[1])
                ) {
                    const [x, y] = proj4('EPSG:4326', code, coord); // 座標系変換
                    const coordinateKey = `${x},${y}`;

                    if (!coordinateMap.has(coordinateKey)) {
                        coordinateMap.set(coordinateKey, j);
                        A01Text += 'A01,' + j + ',' + j + ',' + y.toFixed(3) + ',' + x.toFixed(3) + ',\n';
                        j++;
                    }
                    const currentCounter = coordinateMap.get(coordinateKey);
                    if (index === len - 1 && ringIndex === coordinates.length - 1) {
                        // B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\nD99,\n';
                        B01Text += 'D99,\n';
                    } else {
                        B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\n';
                    }
                } else {
                    console.error('Invalid coordinate skipped:', coord);
                }
            });
        });
        i++;
    });

    saveSimaGaiku2 (map,j)

    simaData = simaData + A01Text + saveSimaGaiku2 (map,j) + 'A99,\nZ00,区画データ,\n' + B01Text
    simaData += 'A99,END\n';

    if (kukaku || jww) {
        simaData = convertSIMtoTXT(simaData)
    }

    console.log(simaData)

    store.state.loading = false

    // UTF-8で文字列をコードポイントに変換
    const utf8Array = window.Encoding.stringToCode(simaData);
    // UTF-8からShift-JISに変換
    const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // Shift-JISエンコードされたデータをUint8Arrayに格納
    const uint8Array = new Uint8Array(shiftJISArray);
    // Blobを作成（MIMEタイプを変更）
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' });

    // ダウンロード用リンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    if (!kukaku) {
        fileName = fileName + kei + firstChiban + hoka + '.sim';
    } else {
        fileName = fileName + kei + firstChiban + hoka + '.txt';
    }
    link.download = fileName; // ファイル名を正確に指定
    // リンクをクリックしてダウンロード
    link.click();
    URL.revokeObjectURL(link.href);

    if (store.state.userId) {
        insertSimaData(store.state.userId, fileName.split('.')[0], 'dummy', 'dummy', simaData, store.state.zahyokei)
            .then(r => {
                store.state.fetchImagesFire = !store.state.fetchImagesFire
            })
    }

}



// function convertAndDownloadGeoJSONToSIMA(map,layerId,geojson, fileName, kaniFlg, zahyokei2, kukaku,jww, kei2) {
//     geojson = extractHighlightedGeoJSONFromSource(geojson,layerId)
//     console.log(geojson)
//     if (!geojson || geojson.type !== 'FeatureCollection') {
//         throw new Error('無効なGeoJSONデータです。FeatureCollectionが必要です。');
//     }
//     let zahyo
//     console.log(layerId)
//     if (layerId ==='oh-amx-a-fude') {
//         for (const feature of geojson.features) {
//             if (feature.properties && feature.properties.座標系) {
//                 console.log("Found Coordinate Property:", feature.properties.座標系);
//                 zahyo = feature.properties.座標系; // 最初に見つけた値を返す
//             }
//         }
//     } else {
//         zahyo = kei2
//     }
//
//     console.log(zahyokei2)
//     if (zahyokei2) zahyo = zahyokei2
//
//     console.log(zahyo)
//     // 公共座標系のリスト
//     const code = zahyokei.find(item => item.kei === zahyo).code
//     const kei = zahyokei.find(item => item.kei === zahyo).kei
//     console.log(code,kei)
//     if (kukaku) {
//         alert(kei + 'で区画ファイルを作ります。作図範囲は1区画です。ドーナツ形状には対応していません。')
//     } else {
//         if (kaniFlg) {
//             alert('注!簡易の場合、座標値は元データとほんの少し異なります。座標の利用は自己責任でお願いします。' + kei + 'でsimファイルを作ります。')
//         } else {
//             // alert(kei + 'でsimファイルを作ります。')
//         }
//     }
//
//     let simaData = 'G00,01,open-hinata3,\n';
//     simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
//     simaData += 'A00,\n';
//
//     let A01Text = '';
//     let B01Text = '';
//     let i = 1;
//     let j = 1;
//
//     // 座標とカウンターを関連付けるマップ
//     const coordinateMap = new Map();
//     const firstChiban = getChibanAndHoka(geojson).firstChiban
//     const hoka = getChibanAndHoka(geojson).hoka
//     geojson.features.forEach((feature) => {
//         let chiban = feature.properties.地番;
//         switch (layerId) {
//             case 'oh-chibanzu-静岡市':
//             case 'oh-chibanzu-福岡市':
//             case 'oh-chibanzu-利根町':
//             case 'oh-chibanzu-鹿角市':
//             case 'oh-chibanzu-ニセコ町':
//             case 'oh-chibanzu-室蘭市':
//                 chiban = feature.properties.地番
//                 break
//             case 'oh-chibanzu-北広島市':
//                 chiban = feature.properties.Chiban + '-'  + feature.properties.Edaban
//                 break
//             case 'oh-chibanzu-京都市':
//             case 'oh-chibanzu-舟形町':
//                 chiban = feature.properties.TIBAN
//                 break
//             case 'oh-chibanzu-磐田市':
//             case 'oh-chibanzu-福島市':
//                 chiban = feature.properties.TXTCD
//                 break
//             case 'oh-chibanzu-越谷市':
//                 chiban = feature.properties.本番 + '-'  + feature.properties.枝番
//                 break
//             case 'oh-chibanzu-佐用町':
//             case 'oh-chibanzu-岸和田市':
//             case 'oh-chibanzu-町田市':
//                 chiban = feature.properties.CHIBAN
//                 break
//             case 'oh-chibanzu-泉南市':
//             case 'oh-chibanzu-国立市':
//                 chiban = feature.properties.表示文字列
//                 break
//             case 'oh-chibanzu-半田市':
//                 chiban = feature.properties.番地 + '-' + feature.properties.枝番 + '-' + feature.properties.小枝
//                 break
//             case 'oh-chibanzu-加古川市':
//                 chiban = feature.properties.TXTCODE1
//                 break
//             case 'oh-chibanzu-奈良市':
//                 chiban = feature.properties.地番本番 + '-' + feature.properties.地番枝番 + '-' + feature.properties.地番小枝
//                 break
//             case 'oh-chibanzu-坂出市':
//                 chiban = feature.properties.所在地番3 + '-'  + feature.properties.所在地番5
//                 break
//             case 'oh-chibanzu-善通寺市':
//                 chiban = feature.properties.本番 + '-' + feature.properties.枝番 + '-' + feature.properties.孫番
//                 break
//             case 'oh-chibanzu-長与町':
//                 chiban = feature.properties.SAFIELD002
//                 break
//         }
//
//         B01Text += 'D00,' + i + ',' + chiban + ',1,\n';
//         let coordinates = [];
//         if (feature.geometry.type === 'Polygon') {
//             coordinates = feature.geometry.coordinates.map(ring => {
//                 // 最後の点が最初の点と同じ場合、最後の点を削除
//                 if (
//                     ring.length > 1 &&
//                     ring[0][0] === ring[ring.length - 1][0] &&
//                     ring[0][1] === ring[ring.length - 1][1]
//                 ) {
//                     return ring.slice(0, -1);
//                 }
//                 return ring;
//             }).flat();
//         } else if (feature.geometry.type === 'MultiPolygon') {
//             coordinates = feature.geometry.coordinates.map(polygon =>
//                 polygon.map(ring => {
//                     if (
//                         ring.length > 1 &&
//                         ring[0][0] === ring[ring.length - 1][0] &&
//                         ring[0][1] === ring[ring.length - 1][1]
//                     ) {
//                         return ring.slice(0, -1);
//                     }
//                     return ring;
//                 }).flat()
//             ).flat();
//         } else {
//             console.warn('Unsupported geometry type:', feature.geometry.type);
//             return; // 他のタイプはスキップ
//         }
//
//         const len = coordinates.length;
//
//         coordinates.forEach((coord, index) => {
//             if (
//                 Array.isArray(coord) &&
//                 coord.length === 2 &&
//                 Number.isFinite(coord[0]) &&
//                 Number.isFinite(coord[1])
//             ) {
//                 const [x, y] = proj4('EPSG:4326', code, coord); // 座標系変換
//                 const coordinateKey = `${x},${y}`;
//
//                 if (!coordinateMap.has(coordinateKey)) {
//                     coordinateMap.set(coordinateKey, j);
//                     A01Text += 'A01,' + j + ',' + j + ',' + y.toFixed(3) + ',' + x.toFixed(3) + ',\n';
//                     j++;
//                 }
//                 const currentCounter = coordinateMap.get(coordinateKey);
//                 if (index === len - 1) {
//                     B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\nD99,\n';
//                 } else {
//                     B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\n';
//                 }
//             } else {
//                 console.error('Invalid coordinate skipped:', coord);
//             }
//         });
//
//         i++;
//     });
//
//     saveSimaGaiku2 (map,j)
//
//     // simaData = simaData + A01Text + 'A99\nZ00,区画データ,\n' + B01Text
//     simaData = simaData + A01Text + saveSimaGaiku2 (map,j) + 'A99\nZ00,区画データ,\n' + B01Text
//     // console.log(simaData)
//     simaData += 'A99,END,,\n';
//
//     if (kukaku || jww) {
//         simaData = convertSIMtoTXT(simaData)
//     }
//
//     document.querySelector('.loadingImg').style.display = 'none'
//
//     // UTF-8で文字列をコードポイントに変換
//     const utf8Array = window.Encoding.stringToCode(simaData);
//     // UTF-8からShift-JISに変換
//     const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
//     // Shift-JISエンコードされたデータをUint8Arrayに格納
//     const uint8Array = new Uint8Array(shiftJISArray);
//     // Blobを作成（MIMEタイプを変更）
//     const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
//
//     // ダウンロード用リンクを作成
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     if (!kukaku) {
//         fileName = fileName + kei + firstChiban + hoka + '.sim';
//     } else {
//         fileName = fileName + kei + firstChiban + hoka + '.txt';
//     }
//     link.download = fileName; // ファイル名を正確に指定
//     // リンクをクリックしてダウンロード
//     link.click();
//     URL.revokeObjectURL(link.href);
// }

export function saveCima(map, layerId, sourceId, fields, kaniFlg, kei, chiban, isDraw) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    let geojson
    const geojsons = []
    if (layerId === 'oh-chibanzu-all') {
        console.log(chibanzuLayers)
        chibanzuLayers.forEach((layer,i) => {
            console.log(layer)
            const layerId = layer.id
            const sourceId = chibanzuSources[i].id
            let fields
            if (layerId === 'oh-chibanzu-高崎市') {
                fields = ['oh3id']
            } else {
                fields = ['id']
            }
            console.log(layerId,sourceId,fields)
            console.log(sourceId)
            const geojson0 = exportLayerToGeoJSON(map, layerId, sourceId, fields)
            if (geojson0) {
                // alert(JSON.stringify(geojson0))
                geojsons.push(geojson0)
            }
        })
        console.log(geojsons)
        geojson = {
            type: "FeatureCollection",
            features: geojsons.flatMap(geojson => geojson.features)
        }
    } else {
        console.log(layerId,sourceId,fields)
        geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields);
    }
    console.log(geojson)
    if (isDraw) {
        return geojson
    } else {
        convertAndDownloadGeoJSONToSIMA(map,layerId,geojson,'簡易_',kaniFlg,kei,null,null,null,chiban);
    }
}

// // ⭐️これは地番がない最もベーシックなもの をm単位にしたもの 1月4日時点の決定版
function geojsonToDXF(geojson) {
    let dxf = "0\n" +
        "SECTION\n" +
        "2\n" +
        "HEADER\n" +
        "9\n$INSUNITS\n70\n6\n" + // 単位をメートルに設定
        "0\n" +
        "ENDSEC\n" +
        "0\n" +
        "SECTION\n" +
        "2\n" +
        "TABLES\n" +
        "0\n" +
        "ENDSEC\n" +
        "0\n" +
        "SECTION\n" +
        "2\n" +
        "ENTITIES\n";

    function processPoint(coord, layer = 'Default') {
        return "0\n" +
            "POINT\n" +
            "8\n" + layer + "\n" +
            "10\n" + coord[0] + "\n" +
            "20\n" + coord[1] + "\n";
    }

    function processLineString(coords, layer = 'Default') {
        let dxfPart = "0\n" +
            "LWPOLYLINE\n" +
            "8\n" + layer + "\n" +
            "90\n" + coords.length + "\n";
        coords.forEach(coord => {
            dxfPart += "10\n" + coord[0] + "\n" +
                "20\n" + coord[1] + "\n";
        });
        return dxfPart;
    }

    function processPolygon(coords, layer = 'Default') {
        let dxfPart = "0\n" +
            "LWPOLYLINE\n" +
            "8\n" + layer + "\n" +
            "90\n" + coords[0].length + "\n" +
            "70\n1\n";
        coords[0].forEach(coord => {
            dxfPart += "10\n" + coord[0] + "\n" +
                "20\n" + coord[1] + "\n";
        });
        return dxfPart;
    }

    function processMultiPoint(coords, layer = 'Default') {
        return coords.map(coord => processPoint(coord, layer)).join('');
    }

    function processMultiLineString(coords, layer = 'Default') {
        return coords.map(line => processLineString(line, layer)).join('');
    }

    function processMultiPolygon(coords, layer = 'Default') {
        return coords.map(polygon => processPolygon(polygon, layer)).join('');
    }

    geojson.features.forEach(feature => {
        const geometry = feature.geometry;
        const properties = feature.properties || {};
        const layer = properties.layer || 'Default';

        switch (geometry.type) {
            case 'Point':
                dxf += processPoint(geometry.coordinates, layer);
                break;
            case 'LineString':
                dxf += processLineString(geometry.coordinates, layer);
                break;
            case 'Polygon':
                dxf += processPolygon(geometry.coordinates, layer);
                break;
            case 'MultiPoint':
                dxf += processMultiPoint(geometry.coordinates, layer);
                break;
            case 'MultiLineString':
                dxf += processMultiLineString(geometry.coordinates, layer);
                break;
            case 'MultiPolygon':
                dxf += processMultiPolygon(geometry.coordinates, layer);
                break;
            default:
                console.warn("サポートされていないジオメトリタイプ: " + geometry.type);
                break;
        }
    });
    store.state.loading = false
    dxf += "0\n" +
        "ENDSEC\n" +
        "0\n" +
        "EOF\n";
    return dxf;
}



// ⭐️これは地番がない最もベーシックなもの
// function geojsonToDXF(geojson) {
//     let dxf = "0\n" +
//         "SECTION\n" +
//         "2\n" +
//         "HEADER\n" +
//         "0\n" +
//         "ENDSEC\n" +
//         "0\n" +
//         "SECTION\n" +
//         "2\n" +
//         "TABLES\n" +
//         "0\n" +
//         "ENDSEC\n" +
//         "0\n" +
//         "SECTION\n" +
//         "2\n" +
//         "ENTITIES\n";
//
//     function processPoint(coord, layer = 'Default') {
//         return "0\n" +
//             "POINT\n" +
//             "8\n" + layer + "\n" +
//             "10\n" + coord[0] + "\n" +
//             "20\n" + coord[1] + "\n";
//     }
//
//     function processLineString(coords, layer = 'Default') {
//         let dxfPart = "0\n" +
//             "LWPOLYLINE\n" +
//             "8\n" + layer + "\n" +
//             "90\n" + coords.length + "\n";
//         coords.forEach(coord => {
//             dxfPart += "10\n" + coord[0] + "\n" +
//                 "20\n" + coord[1] + "\n";
//         });
//         return dxfPart;
//     }
//
//     function processPolygon(coords, layer = 'Default') {
//         let dxfPart = "0\n" +
//             "LWPOLYLINE\n" +
//             "8\n" + layer + "\n" +
//             "90\n" + coords[0].length + "\n" +
//             "70\n1\n";
//         coords[0].forEach(coord => {
//             dxfPart += "10\n" + coord[0] + "\n" +
//                 "20\n" + coord[1] + "\n";
//         });
//         return dxfPart;
//     }
//
//     function processMultiPoint(coords, layer = 'Default') {
//         return coords.map(coord => processPoint(coord, layer)).join('');
//     }
//
//     function processMultiLineString(coords, layer = 'Default') {
//         return coords.map(line => processLineString(line, layer)).join('');
//     }
//
//     function processMultiPolygon(coords, layer = 'Default') {
//         return coords.map(polygon => processPolygon(polygon, layer)).join('');
//     }
//
//     geojson.features.forEach(feature => {
//         const geometry = feature.geometry;
//         const properties = feature.properties || {};
//         const layer = properties.layer || 'Default';
//
//         switch (geometry.type) {
//             case 'Point':
//                 dxf += processPoint(geometry.coordinates, layer);
//                 break;
//             case 'LineString':
//                 dxf += processLineString(geometry.coordinates, layer);
//                 break;
//             case 'Polygon':
//                 dxf += processPolygon(geometry.coordinates, layer);
//                 break;
//             case 'MultiPoint':
//                 dxf += processMultiPoint(geometry.coordinates, layer);
//                 break;
//             case 'MultiLineString':
//                 dxf += processMultiLineString(geometry.coordinates, layer);
//                 break;
//             case 'MultiPolygon':
//                 dxf += processMultiPolygon(geometry.coordinates, layer);
//                 break;
//             default:
//                 console.warn("サポートされていないジオメトリタイプ: " + geometry.type);
//                 break;
//         }
//     });
//
//     dxf += "0\n" +
//         "ENDSEC\n" +
//         "0\n" +
//         "EOF\n";
//     return dxf;
// }

export function saveDXfGaiku (map,geojson,zahyo) {
    const layerIds = []
    if (map.getLayer('oh-gaiku-layer')) {
        layerIds.push('oh-gaiku-layer')
    }
    if (map.getLayer('oh-toshikan-layer')) {
        layerIds.push('oh-toshikan-layer')
    }
    const features = map.queryRenderedFeatures({
        layers: layerIds // 対象のレイヤー名を指定
    });
    if (features.length === 0) {
        return geojson
    }
    // GeoJSON形式に変換
    const gaikuGeojson = {
        type: 'FeatureCollection',
        features: features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
        }))
    };
    // const code = zahyokei.find(item => item.kei === zahyo).code
    // gaikuGeojson.features.forEach(feature => {
    //     console.log(proj4('EPSG:4326', code, feature.geometry.coordinates))
    //     feature.geometry.coordinates = proj4('EPSG:4326', code, feature.geometry.coordinates)
    // })

    gaikuGeojson.features.forEach(feature => {
        console.log(feature.properties)
        let x,y
        if (feature.properties.補正後X座標) {
            x = feature.properties.補正後X座標
            y = feature.properties.補正後Y座標
        } else {
            x = feature.properties.X座標
            y = feature.properties.Y座標
        }
        feature.geometry.coordinates = [y,x]
    })
    // 新しいGeoJSONオブジェクトを作成
    geojson = {
        type: "FeatureCollection",
        features: [...geojson.features, ...gaikuGeojson.features] // featuresを結合
    };
    return geojson;
}

export function saveDxf (map, layerId, sourceId, fields, detailGeojson, kei2) {
    console.log(detailGeojson)
    let geojson
    if (detailGeojson) {
        geojson = detailGeojson
    } else {
        if (map.getZoom() <= 15) {
            alert('ズーム15以上にしてください。')
            return
        }
        geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields)
    }
    console.log(geojson)
    geojson = extractHighlightedGeoJSONFromSource(geojson,layerId)
    console.log(geojson)
    let zahyo
    if (kei2) {
        zahyo = kei2
    } else {
        for (const feature of geojson.features) {
            if (feature.properties && feature.properties.座標系) {
                console.log("Found Coordinate Property:", feature.properties.座標系);
                zahyo = feature.properties.座標系; // 最初に見つけた値を返す
            }
        }
    }
    console.log(zahyo)
    const code = zahyokei.find(item => item.kei === zahyo).code
    const kei = zahyokei.find(item => item.kei === zahyo).kei
    console.log(code,kei)
    console.log(zahyo)
    function transformGeoJSON(geojson, crsCode) {
        if (!geojson || !geojson.type) {
            console.warn('⚠️ 無効なGeoJSONデータです。');
            return null;
        }

        // 再帰的に座標を変換する関数
        function transformCoordinates(coords) {
            if (Array.isArray(coords[0])) {
                return coords.map(transformCoordinates);
            } else if (Array.isArray(coords) && coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                return proj4('EPSG:4326', code, coords);
            } else {
                console.warn('⚠️ 無効な座標が検出され、スキップされました:', coords);
                return null;
            }
        }

        // 再帰的にジオメトリを処理する関数
        function transformGeometry(geometry) {
            if (!geometry || !geometry.type) return null;

            const transformed = { ...geometry };

            switch (geometry.type) {
                case 'Point':
                    transformed.coordinates = transformCoordinates(geometry.coordinates);
                    break;
                case 'LineString':
                case 'MultiPoint':
                    transformed.coordinates = geometry.coordinates.map(transformCoordinates);
                    break;
                case 'Polygon':
                case 'MultiLineString':
                    transformed.coordinates = geometry.coordinates.map(ring => ring.map(transformCoordinates));
                    break;
                case 'MultiPolygon':
                    transformed.coordinates = geometry.coordinates.map(polygon =>
                        polygon.map(ring => ring.map(transformCoordinates))
                    );
                    break;
                default:
                    console.warn(`⚠️ 未対応のジオメトリタイプ: ${geometry.type}`);
                    return null;
            }

            return transformed;
        }

        // FeatureとFeatureCollectionを処理
        if (geojson.type === 'Feature') {
            return {
                ...geojson,
                geometry: transformGeometry(geojson.geometry),
            };
        } else if (geojson.type === 'FeatureCollection') {
            return {
                ...geojson,
                features: geojson.features.map(feature => ({
                    ...feature,
                    geometry: transformGeometry(feature.geometry),
                })),
            };
        } else if (geojson.type === 'GeometryCollection') {
            return {
                ...geojson,
                geometries: geojson.geometries.map(transformGeometry),
            };
        } else {
            return transformGeometry(geojson);
        }
    }

    geojson = transformGeoJSON(geojson,code)

    // 各頂点をポイントとして追加
    function addPolygonVerticesAsPoints(geojson) {
        const pointFeatures = [];

        geojson.features.forEach(feature => {
            if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
                const coordinates = feature.geometry.type === "Polygon"
                    ? [feature.geometry.coordinates]
                    : feature.geometry.coordinates;

                coordinates.forEach(polygon => {
                    polygon.forEach(ring => {
                        ring.forEach(coord => {
                            pointFeatures.push({
                                type: "Feature",
                                geometry: {
                                    type: "Point",
                                    coordinates: coord
                                },
                                properties: { source: "vertex", parent: feature.properties.name || null }
                            });
                        });
                    });
                });
            }
        });

        return {
            ...geojson,
            features: [...geojson.features, ...pointFeatures]
        };
    }

    geojson = addPolygonVerticesAsPoints(geojson)

    geojson = saveDXfGaiku (map,geojson,zahyo)

    console.log(code)
    console.log(geojson)
    // convertGeoJSON(geojson,code) // ここを復活するとPHP版になる。
    store.state.loading = false


    try {
        const dxfString = geojsonToDXF(geojson);
        // DXFファイルとしてダウンロード
        const blob = new Blob([dxfString], { type: 'application/dxf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);

        const firstChiban = getChibanAndHoka(geojson,true).firstChiban
        const hoka = getChibanAndHoka(geojson,true).hoka
        const kei = getKeiByCode(code)
        link.download = kei + firstChiban + hoka + '.dxf';

        link.click();
    } catch (error) {
        console.error('GeoJSONの解析中にエラーが発生しました:', error);
        alert('有効なGeoJSONを入力してください。');
    }
}

export function downloadGeoJSONAsCSV(geojson, filename = 'data.csv') {
    if (!geojson || !geojson.features || !Array.isArray(geojson.features)) {
        throw new Error('Invalid GeoJSON data');
    }

    // 1. 属性のキーを取得（最初のfeatureから）
    const properties = geojson.features[0]?.properties || {};
    const propertyKeys = Object.keys(properties);
    const headers = ['lat', 'lon', 'z'];
    // const headers = propertyKeys;

    // 2. 各フィーチャのデータを抽出
    const rows = geojson.features.map(feature => {
        const coords = feature.geometry?.coordinates || [];
        let latitude = '';
        let longitude = '';
        let z = ''
        // Pointの場合
        if (feature.geometry?.type === 'Point') {
            [longitude, latitude, z] = coords;
        }
        // PolygonまたはLineStringの場合（代表点を使用） 使用しない。
        else if (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'LineString') {
            [longitude, latitude] = coords[0][0] || coords[0];
        }

        // 各プロパティの値を取得
        const propValues = propertyKeys.map(key => feature.properties[key] || '');
        if (feature.geometry?.type === 'Point') {
            return [...propValues, latitude, longitude, z]
        } else {
            return propValues
        }
    });

    // 3. CSV形式に変換
    // const csvContent = [
    //     headers.join(','), // ヘッダー
    //     ...rows.map(row => row.join(',')) // 各行
    // ].join('\n');
    const csvContent = [
        ...rows.map(row => row.join(',')) // 各行
    ].join('\n');


    // 4. CSVをダウンロード
    const firstChiban = getChibanAndHoka(geojson).firstChiban
    const hoka = getChibanAndHoka(geojson).hoka
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function saveKml(map, layerId, sourceId, fields) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    alert(dlMsg)
    // const geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields);
    // console.log(geojson)
    downloadKML(map, layerId, null,fields)
}

export function saveCsv(map, layerId, sourceId, fields) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    alert(dlMsg)
    const geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields);
    console.log(geojson)
    downloadGeoJSONAsCSV(geojson)
}

export function simaToGeoJSON(simaData, map, simaZahyokei, isFlyto, isGeojson) {
    if (!simaData) return;
    // console.log(simaData);
    const lines = simaData.split('\n');
    let coordinates = {}; // 座標データを格納
    let coordinatesUsedInPolygons = new Set(); // 区画データで使用された座標IDを追跡
    let features = []; // GeoJSONのフィーチャーを格納
    let currentFeature = null;
    let firstCoordinateChecked = false;
    let detectedCRS;
    let code;
    let hasPolygonData = false; // 区画データの有無を判定

    if (!simaZahyokei) {
        code = zahyokei.find(item => item.kei === store.state.zahyokei).code;
    } else {
        console.log(simaZahyokei);
        code = zahyokei.find(item => item.kei === simaZahyokei).code;
    }

    lines.forEach(line => {
        const parts = line.split(',');
        const type = parts[0].trim();

        // 座標データ (A01)
        if (type === 'A01') {
            const id = parts[1].trim();
            const x = parseFloat(parts[3]); // X座標 (東方向)
            const y = parseFloat(parts[4]); // Y座標 (北方向)

            // 最初の座標で座標系を判定
            if (!firstCoordinateChecked) {
                detectedCRS = determinePlaneRectangularZone(x, y);
                console.log(detectedCRS);
                firstCoordinateChecked = true;
            }

            try {
                // 座標系をEPSG:4326に変換 (x, yの順番で指定)
                const [lon, lat] = proj4(code, 'EPSG:4326', [y, x]);
                coordinates[id] = [lon, lat];
            } catch (error) {
                console.error(`座標変換エラー: ${error.message}`);
                coordinates[id] = [x, y]; // 変換失敗時は元の座標を使用
            }
        }

        // 区画データ (D00, B01, D99)
        if (type === 'D00') {
            hasPolygonData = true; // 区画データが存在
            currentFeature = {
                type: 'Feature',
                properties: {
                    id: parts[1].trim(),
                    chiban: parts[2]?.trim() || null
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[]]
                }
            };
        } else if (type === 'B01' && currentFeature) {
            const coordId = parts[1].trim();
            if (coordinates[coordId]) {
                currentFeature.geometry.coordinates[0].push(coordinates[coordId]);
                coordinatesUsedInPolygons.add(coordId); // この座標が区画データで使用されたことを記録
            }
        } else if (type === 'D99' && currentFeature) {
            // ポリゴンを閉じる（最初の座標を最後に追加）
            if (currentFeature.geometry.coordinates[0].length > 0) {
                const firstCoord = currentFeature.geometry.coordinates[0][0];
                currentFeature.geometry.coordinates[0].push(firstCoord);
            }
            // フィーチャー終了
            features.push(currentFeature);
            currentFeature = null;
        }
    });

    // 区画データに含まれていない座標をポイントとして追加
    Object.keys(coordinates).forEach(id => {
        const chiban = lines.find(line => new RegExp(`A01\\s*,\\s*${id}\\s*,`).test(line))?.split(',')[2]?.trim()
        if (!coordinatesUsedInPolygons.has(id)) {
            features.push({
                type: 'Feature',
                properties: {
                    id: id,
                    chiban: chiban,
                    type: 'point'
                },
                geometry: {
                    type: 'Point',
                    coordinates: coordinates[id]
                }
            });
        }
    });

    // if (isGeojson) {
        // 区画データの頂点をポイントとして追加
        Object.keys(coordinates).forEach(id => {
            const chiban = lines.find(line => new RegExp(`A01\\s*,\\s*${id}\\s*,`).test(line))?.split(',')[2]?.trim()
            if (coordinatesUsedInPolygons.has(id)) {
                features.push({
                    type: 'Feature',
                    properties: {
                        id: id,
                        chiban: chiban,
                        type: 'vertex'
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: coordinates[id]
                    }
                });
            }
        });
    // }

    // GeoJSONオブジェクトを生成
    const geoJSON = {
        type: 'FeatureCollection',
        features: features
    };

    if (isGeojson) {
        return geoJSON
    }

    console.log(geoJSON)

    if (map) {
        if (map.getSource('sima-data')) {
            map.getSource('sima-data').setData(geoJSON);
        } else {
            map.addSource('sima-data', {
                type: 'geojson',
                data: geoJSON
            });
        }
        if (!map.getLayer('sima-layer')) {
            map.addLayer({
                id: 'sima-layer',
                type: 'fill',
                source: 'sima-data',
                filter: ["==", "$type", "Polygon"],
                paint: {
                    'fill-color': '#088',
                    'fill-opacity': 0.7
                }
            });
            map.addLayer({
                id: 'sima-borders',
                type: 'line',
                source: 'sima-data',
                layout: {},
                paint: {
                    'line-color': '#000',
                    'line-width': 2
                }
            });

            // ポイント用ラベルレイヤー
            map.addLayer({
                id: 'sima-label-point',
                type: 'symbol',
                source: 'sima-data',
                layout: {
                    'text-field': ['get', 'chiban'],
                    'text-font': ['NotoSansJP-Regular'],
                    'text-offset': [0, 1.3], // ラベルを下にずらす
                },
                paint: {
                    'text-color': 'rgba(0, 0, 0, 1)',
                    'text-halo-color': 'rgba(255,255,255,0.7)',
                    'text-halo-width': 1.0
                },
                minzoom: 14,
                filter: ['==', '$type', 'Point']
            });
            map.addLayer({
                id: 'sima-points',
                type: 'circle',
                source: 'sima-data',
                layout: {},
                paint: {
                    'circle-radius': 5,
                    'circle-color': 'navy',
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#000'
                },
                filter: ['==', ['get', 'type'], 'point']
            });
            map.addLayer ({
                id: 'sima-Vertex',
                type: 'circle',
                source: 'sima-data',
                layout: {},
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        15, 0,
                        18, 4
                    ],
                    'circle-color': '#f00',
                },
                filter: ['==', ['get', 'type'], 'vertex']
            });
            map.addLayer({
                id: 'sima-label',
                type: 'symbol',
                source: 'sima-data',
                layout: {
                    'text-field': ['get', 'chiban'],
                    'text-font': ['NotoSansJP-Regular'],
                },
                paint: {
                    'text-color': 'rgba(0, 0, 0, 1)',
                    'text-halo-color': 'rgba(255,255,255,0.7)',
                    'text-halo-width': 1.0
                },
                minzoom: 17,
                filter: ['==', '$type', 'Polygon']
            });
            setTimeout(() => {
                map.addLayer({
                    id: 'sima-polygon-points',
                    type: 'circle',
                    source: 'sima-data',
                    layout: {},
                    paint: {
                        'circle-radius': [
                            'interpolate', ['linear'], ['zoom'],
                            15, 0,
                            18, 4
                        ],
                        'circle-color': '#f00',
                    },
                    filter: ['==', '$type', 'Polygon']
                });
            }, 1000);
        }
    }

    if (isFlyto) {
        // GeoJSONの範囲にフライ (地図を移動)
        const bounds = new maplibregl.LngLatBounds();
        geoJSON.features.forEach(feature => {
            if (feature.geometry.type === 'Point') {
                bounds.extend(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach(coord => {
                    bounds.extend(coord);
                });
            }
        });
        if (geoJSON.features.length === 1 && geoJSON.features[0].geometry.type === 'Point') {
            map.fitBounds(bounds, { padding: 20, maxZoom: 18 });
        } else {
            map.fitBounds(bounds, { padding: 20 });
        }
    }

    // ファイル入力をリセット
    const uploadInput = document.querySelector('#simaFileInput');
    if (uploadInput) {
        uploadInput.value = '';
    }
    return JSON.stringify(geoJSON, null, 2);
}




// export function simaToGeoJSON(simaData, map, simaZahyokei, isFlyto) {
//     if (!simaData) return;
//     console.log(simaData);
//     const lines = simaData.split('\n');
//     let coordinates = {}; // 座標データを格納
//     let features = []; // GeoJSONのフィーチャーを格納
//     let currentFeature = null;
//     let firstCoordinateChecked = false;
//     let detectedCRS;
//     let code;
//     let hasPolygonData = false; // 区画データの有無を判定
//
//     if (!simaZahyokei) {
//         code = zahyokei.find(item => item.kei === store.state.zahyokei).code;
//     } else {
//         console.log(simaZahyokei);
//         code = zahyokei.find(item => item.kei === simaZahyokei).code;
//     }
//
//     lines.forEach(line => {
//         const parts = line.split(',');
//         const type = parts[0].trim();
//
//         // 座標データ (A01)
//         if (type === 'A01') {
//             const id = parts[1].trim();
//             const x = parseFloat(parts[3]); // X座標 (東方向)
//             const y = parseFloat(parts[4]); // Y座標 (北方向)
//
//             // 最初の座標で座標系を判定
//             if (!firstCoordinateChecked) {
//                 detectedCRS = determinePlaneRectangularZone(x, y);
//                 console.log(detectedCRS);
//                 firstCoordinateChecked = true;
//             }
//
//             try {
//                 // 座標系をEPSG:4326に変換 (x, yの順番で指定)
//                 const [lon, lat] = proj4(code, 'EPSG:4326', [y, x]);
//                 coordinates[id] = [lon, lat];
//             } catch (error) {
//                 console.error(`座標変換エラー: ${error.message}`);
//                 coordinates[id] = [x, y]; // 変換失敗時は元の座標を使用
//             }
//         }
//
//         // 区画データ (D00, B01, D99)
//         if (type === 'D00') {
//             alert(99)
//             hasPolygonData = true; // 区画データが存在
//             currentFeature = {
//                 type: 'Feature',
//                 properties: {
//                     id: parts[1].trim(),
//                     chiban: parts[2].trim()
//                 },
//                 geometry: {
//                     type: 'Polygon',
//                     coordinates: [[]]
//                 }
//             };
//         } else if (type === 'B01' && currentFeature) {
//             const coordId = parts[1].trim();
//             if (coordinates[coordId]) {
//                 currentFeature.geometry.coordinates[0].push(coordinates[coordId]);
//             }
//         } else if (type === 'D99' && currentFeature) {
//             // ポリゴンを閉じる（最初の座標を最後に追加）
//             if (currentFeature.geometry.coordinates[0].length > 0) {
//                 const firstCoord = currentFeature.geometry.coordinates[0][0];
//                 currentFeature.geometry.coordinates[0].push(firstCoord);
//             }
//             // フィーチャー終了
//             features.push(currentFeature);
//             currentFeature = null;
//         }
//     });
//
//     // 区画データがない場合に座標データをポイントとして追加
//     if (!hasPolygonData) {
//         alert()
//         Object.keys(coordinates).forEach(id => {
//             features.push({
//                 type: 'Feature',
//                 properties: {
//                     id: id,
//                     chiban: lines.find(line => line.startsWith(`A01,${id},`))?.split(',')[2]?.trim() || null
//                 },
//                 geometry: {
//                     type: 'Point',
//                     coordinates: coordinates[id]
//                 }
//             });
//         });
//     }
//
//     // GeoJSONオブジェクトを生成
//     const geoJSON = {
//         type: 'FeatureCollection',
//         features: features
//     };
//     console.log(JSON.stringify(geoJSON, null, 2));
//
//     if (map) {
//         if (map.getSource('sima-data')) {
//             map.getSource('sima-data').setData(geoJSON);
//         } else {
//             map.addSource('sima-data', {
//                 type: 'geojson',
//                 data: geoJSON
//             });
//         }
//         if (!map.getLayer('sima-layer')) {
//             map.addLayer({
//                 id: 'sima-layer',
//                 type: 'fill',
//                 source: 'sima-data',
//                 layout: {},
//                 paint: {
//                     'fill-color': '#088',
//                     'fill-opacity': 0.7
//                 }
//             });
//             map.addLayer({
//                 id: 'sima-borders',
//                 type: 'line',
//                 source: 'sima-data',
//                 layout: {},
//                 paint: {
//                     'line-color': '#000',
//                     'line-width': 2
//                 }
//             });
//
//             // ポイント用ラベルレイヤー
//             map.addLayer({
//                 id: 'sima-label-point',
//                 type: 'symbol',
//                 source: 'sima-data',
//                 layout: {
//                     'text-field': ['get', 'chiban'],
//                     'text-font': ['NotoSansJP-Regular'],
//                     'text-offset': [0, 1.3], // ラベルを下にずらす
//                 },
//                 paint: {
//                     'text-color': 'rgba(0, 0, 0, 1)',
//                     'text-halo-color': 'rgba(255,255,255,0.7)',
//                     'text-halo-width': 1.0
//                 },
//                 maxzoom: 24,
//                 minzoom: 14,
//                 filter: ['==', '$type', 'Point']
//             });
//             map.addLayer({
//                 id: 'sima-points',
//                 type: 'circle',
//                 source: 'sima-data',
//                 layout: {},
//                 paint: {
//                     'circle-radius': 8,
//                     'circle-color': '#f00',
//                     'circle-stroke-width': 1,
//                     'circle-stroke-color': '#000'
//                 },
//                 filter: ['==', '$type', 'Point']
//             });
//             map.addLayer({
//                 id: 'sima-label',
//                 type: 'symbol',
//                 source: 'sima-data',
//                 layout: {
//                     'text-field': ['get', 'chiban'],
//                     'text-font': ['NotoSansJP-Regular'],
//                 },
//                 paint: {
//                     'text-color': 'rgba(0, 0, 0, 1)',
//                     'text-halo-color': 'rgba(255,255,255,0.7)',
//                     'text-halo-width': 1.0
//                 },
//                 maxzoom: 24,
//                 minzoom: 17,
//                 filter: ['==', '$type', 'Polygon']
//             });
//             setTimeout(() => {
//                 map.addLayer({
//                     id: 'sima-polygon-points',
//                     type: 'circle',
//                     source: 'sima-data',
//                     layout: {},
//                     paint: {
//                         'circle-radius': [
//                             'interpolate', ['linear'], ['zoom'],
//                             15, 0,
//                             18, 4
//                         ],
//                         'circle-color': '#f00',
//                         // 'circle-stroke-width': 1,
//                         // 'circle-stroke-color': '#000'
//                     },
//                     filter: ['==', '$type', 'Polygon']
//                 });
//             },1000)
//         }
//     }
//
//     if (isFlyto) {
//         // GeoJSONの範囲にフライ (地図を移動)
//         const bounds = new maplibregl.LngLatBounds();
//         geoJSON.features.forEach(feature => {
//             if (feature.geometry.type === 'Point') {
//                 bounds.extend(feature.geometry.coordinates);
//             } else if (feature.geometry.type === 'Polygon') {
//                 feature.geometry.coordinates[0].forEach(coord => {
//                     bounds.extend(coord);
//                 });
//             }
//         });
//         map.fitBounds(bounds, { padding: 20 });
//     }
//
//     // ファイル入力をリセット
//     const uploadInput = document.querySelector('#simaFileInput');
//     if (uploadInput) {
//         uploadInput.value = '';
//     }
//
//     return JSON.stringify(geoJSON, null, 2);
// }




// SIMAファイルをGeoJSONに変換する関数
// export function simaToGeoJSON(simaData,map,simaZahyokei,isFlyto) {
//     if (!simaData) return
//     console.log(simaData)
//     const lines = simaData.split('\n');
//     let coordinates = {}; // 座標データを格納
//     let features = []; // GeoJSONのフィーチャーを格納
//     let currentFeature = null;
//     let firstCoordinateChecked = false;
//     let detectedCRS
//     let code
//     if (!simaZahyokei) {
//         code = zahyokei.find(item => item.kei === store.state.zahyokei).code
//     } else {
//         console.log(simaZahyokei)
//         code = zahyokei.find(item => item.kei === simaZahyokei).code
//     }
//     lines.forEach(line => {
//         const parts = line.split(',');
//         const type = parts[0].trim();
//         // 座標データ (A01)
//         if (type === 'A01') {
//             const id = parts[1].trim();
//             const x = parseFloat(parts[3]); // X座標 (東方向)
//             const y = parseFloat(parts[4]); // Y座標 (北方向)
//
//             // 最初の座標で座標系を判定
//             if (!firstCoordinateChecked) {
//                 detectedCRS = determinePlaneRectangularZone(x, y);
//                 console.log(detectedCRS)
//                 firstCoordinateChecked = true;
//             }
//
//             try {
//                 // 座標系をEPSG:4326に変換 (x, yの順番で指定)
//                 const [lon, lat] = proj4(code, 'EPSG:4326', [y, x]);
//                 coordinates[id] = [lon, lat];
//             } catch (error) {
//                 console.error(`座標変換エラー: ${error.message}`);
//                 coordinates[id] = [x, y]; // 変換失敗時は元の座標を使用
//             }
//         }
//
//         // 区画データ (D00, B01, D99)
//         if (type === 'D00') {
//             // 新しいフィーチャーの開始
//             // alert(parts[2])
//             currentFeature = {
//                 type: 'Feature',
//                 properties: {
//                     id: parts[1].trim(),
//                     chiban: parts[2].trim()
//                 },
//                 geometry: {
//                     type: 'Polygon',
//                     coordinates: [[]]
//                 }
//             };
//         } else if (type === 'B01' && currentFeature) {
//             const coordId = parts[1].trim();
//             if (coordinates[coordId]) {
//                 // alert(coordinates[coordId])
//                 currentFeature.geometry.coordinates[0].push(coordinates[coordId]);
//             }
//         } else if (type === 'D99' && currentFeature) {
//             // ポリゴンを閉じる（最初の座標を最後に追加）
//             if (currentFeature.geometry.coordinates[0].length > 0) {
//                 const firstCoord = currentFeature.geometry.coordinates[0][0];
//                 currentFeature.geometry.coordinates[0].push(firstCoord);
//             }
//             // フィーチャー終了
//             features.push(currentFeature);
//             currentFeature = null;
//         }
//     });
//
//     // GeoJSONオブジェクトを生成
//     const geoJSON = {
//         type: 'FeatureCollection',
//         features: features
//     };
//     console.log(JSON.stringify(geoJSON, null, 2));
//
//     if (map) {
//         if (map.getSource('sima-data')) {
//             map.getSource('sima-data').setData(geoJSON);
//         } else {
//             map.addSource('sima-data', {
//                 type: 'geojson',
//                 data: geoJSON
//             });
//         }
//         if (!map.getLayer('sima-layer')) {
//             map.addLayer({
//                 id: 'sima-layer',
//                 type: 'fill',
//                 source: 'sima-data',
//                 layout: {},
//                 paint: {
//                     'fill-color': '#088',
//                     'fill-opacity': 0.7
//                 }
//             });
//             map.addLayer({
//                 id: 'sima-borders',
//                 type: 'line',
//                 source: 'sima-data',
//                 layout: {},
//                 paint: {
//                     'line-color': '#000',
//                     'line-width': 2
//                 }
//             });
//             map.addLayer({
//                 id: 'sima-label',
//                 type: 'symbol',
//                 source: 'sima-data',
//                 'layout': {
//                     'text-field': ['get', 'chiban'],
//                     'text-font': ['NotoSansJP-Regular'],
//                 },
//                 'paint': {
//                     'text-color': 'rgba(0, 0, 0, 1)',
//                     'text-halo-color': 'rgba(255,255,255,0.7)',
//                     'text-halo-width': 1.0,
//                 },
//                 'maxzoom': 24,
//                 'minzoom': 17
//             });
//         }
//     }
//     if (isFlyto) {
//         // GeoJSONの範囲にフライ (地図を移動)
//         const bounds = new maplibregl.LngLatBounds();
//         geoJSON.features.forEach(feature => {
//             feature.geometry.coordinates[0].forEach(coord => {
//                 bounds.extend(coord);
//             });
//         });
//         map.fitBounds(bounds, { padding: 20 });
//     }
//     // ファイル入力をリセット
//     const uploadInput = document.querySelector('#simaFileInput');
//     if (uploadInput) {
//         uploadInput.value = '';
//     }
//     return JSON.stringify(geoJSON, null, 2);
// }

export function simaFileUpload(event) {
    store.state.tiffAndWorldFile = event.target.files
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.sim')) {
        alert('SIMAファイル(.sim)をアップロードしてください。');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const arrayBuffer = e.target.result; // ArrayBufferとして読み込む
        const text = new TextDecoder("shift-jis").decode(arrayBuffer); // Shift JISをUTF-8に変換
        console.log("変換されたテキスト:", text)
        const simaData = text;
        if (store.state.userId) {
            const map1 = store.state.map01
            simaLoadForUser (map1,true, simaData)
        } else {
            ddSimaUpload(simaData)
        }
    };
    reader.readAsArrayBuffer(file);
}




// ファイルアップロード処理
export function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.sim')) {
        alert('SIMAファイル(.sim)をアップロードしてください。');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const arrayBuffer = e.target.result; // ArrayBufferとして読み込む
        const text = new TextDecoder("shift-jis").decode(arrayBuffer); // Shift JISをUTF-8に変換
        console.log("変換されたテキスト:", text)
        const simaData = text;
        console.log(store.state.zahyokei)
        store.state.simaZahyokei.map01 = store.state.zahyokei
        store.state.simaData.map01 = simaData
        store.state.simaText = JSON.stringify({
            text: simaData,
            zahyokei: store.state.zahyokei,
            opacity: 0.7
        })
        console.log(store.state.simaText)
        // alert('読み込み' + store.state.simaText)
        try {
            const map = store.state.map01
            simaToGeoJSON(simaData,map,null,true);
            store.state.snackbar = true
        } catch (error) {
            console.error(`変換エラー: ${error.message}`);
        }
    };
    reader.readAsArrayBuffer(file);
}

export function ddSimaUpload(simaData) {
        console.log(store.state.zahyokei)
        store.state.simaZahyokei.map01 = store.state.zahyokei
        store.state.simaData.map01 = simaData
        store.state.simaText = JSON.stringify({
            text: simaData,
            zahyokei: store.state.zahyokei,
            opacity: 0.7
        })
        console.log(store.state.simaText)
        // alert('読み込み' + store.state.simaText)
        try {
            const map = store.state.map01
            simaToGeoJSON(simaData,map,null,true);
            store.state.snackbar = true
        } catch (error) {
            console.error(`変換エラー: ${error.message}`);
        }
}

function determinePlaneRectangularZone(x, y) {
    let closestZone = null;
    let minDistance = Number.MAX_VALUE;

    for (let i = 0; i < 19; i++) {
        try {
            const [lon, lat] = proj4(`EPSG:666${8 + i}`, 'EPSG:4326', [x, y]);
            const [zoneLon, zoneLat] = proj4(`EPSG:666${8 + i}`, 'EPSG:4326', [0, 0]);
            const distance = Math.sqrt(Math.pow(lon - zoneLon, 2) + Math.pow(lat - zoneLat, 2));

            if (distance < minDistance) {
                minDistance = distance;
                closestZone = i + 1;
            }
        } catch (error) {
            // console.warn(`系 ${i + 1} の変換でエラー:`, error);
        }
    }
    return closestZone;
}

export async function saveSima2(map, layerId, kukaku, isDfx, sourceId, fields, kei, isShape) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。');
        return;
    }
    alert(dlMsg)
    store.state.loading = true
    let prefId = String(store.state.prefId).padStart(2, '0');
    if (prefId === '00') {
        const features = map.queryRenderedFeatures({ layers: ['oh-homusyo-2025-polygon'] });
        // 最初のフィーチャの 市区町村コード プロパティから先頭2文字を取得
        if (features.length > 0) {
            const firstFeature = features[0];
            const citycode = firstFeature.properties['市区町村コード'];
            if (typeof citycode === 'string' && citycode.length >= 2) {
                prefId = citycode.substring(0, 2);
            }
        }
    }

    console.log('初期 prefId:', prefId);

    let fgb_URL;
    let retryAttempted = false;
    // ここを改修する必要あり。amxと24自治体以外の動きがあやしい。
    function getFgbUrl(prefId) {
        const specialIds = ['07', '15', '22', '26', '28', '29', '30', '40', '43', '44','45','47'];
        switch (layerId) {
            case 'oh-homusyo-2025-polygon':
                return `https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/fgb/${prefId}.fgb`
            case 'oh-chibanzu2024':
                return 'https://kenzkenz3.xsrv.jp/fgb/Chibanzu_2024_with_id.fgb'
            case 'oh-amx-a-fude':
                return specialIds.includes(prefId)
                    ? `https://kenzkenz3.xsrv.jp/fgb/2024/${prefId}.fgb`
                    : `https://habs.rad.naro.go.jp/spatial_data/amxpoly47/amxpoly_2022_${prefId}.fgb`
        }
    }
    // alert(getFgbUrl(prefId))
    console.log(getFgbUrl(prefId))

    function fgBoundingBox() {
        const LngLatBounds = map.getBounds();
        var Lng01 = LngLatBounds.getWest();
        var Lng02 = LngLatBounds.getEast();
        var Lat01 = LngLatBounds.getNorth();
        var Lat02 = LngLatBounds.getSouth();
        return {
            minX: Lng01,
            minY: Lat02,
            maxX: Lng02,
            maxY: Lat01,
        };
    }

    let bbox;
    console.log(store.state.highlightedChibans)
    if (store.state.highlightedChibans.size > 0) {
        bbox = getBoundingBoxByLayer(map, layerId)
        // alert(bbox.minX)
        console.log(bbox)
        if (bbox.minX === Infinity) bbox = fgBoundingBox()
    } else {
        bbox = fgBoundingBox();
    }
    console.log(bbox)
    fgb_URL = getFgbUrl(prefId);
    async function deserializeAndPrepareGeojson(layerId) {
        let geojson = { type: 'FeatureCollection', features: [] };
        console.log('データをデシリアライズ中...');
        // alert(fgb_URL)
        console.error('bbox',bbox)
        const iter = deserialize(fgb_URL, bbox);
        console.log(iter)
        for await (const feature of iter) {
            geojson.features.push(feature);
        }
        console.log('取得した地物:', geojson);
        if (geojson.features.length === 0) {
            if (prefId !== '43' && !retryAttempted) {
                console.warn('地物が存在しません。prefIdを43に変更して再試行します。');
                alert('データが見つかりませんでした。。再試行します。')
                prefId = '43';
                retryAttempted = true;
                await deserializeAndPrepareGeojson(layerId);
            } else {
                alert('地物が一つもありません。「簡易」で出力します。');
                saveCima(map,'oh-amx-a-fude','amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'],true)
            }
            return;
        }
        if (isShape) {
            console.log(geojson)
            geojson = extractMatchingFeatures(map,geojson,layerId)
            console.log(geojson)
            geojson = extractHighlightedGeoJSONFromSource(geojson,layerId)
            console.log(geojson)
            geojsonToShapefile(geojson)
            store.state.loading = false
        } else {
            if (!isDfx) {
                console.log(geojson)
                if (layerId === 'oh-amx-a-fude' || layerId === 'oh-homusyo-2025-polygon') {
                    geojson = extractMatchingFeatures(map,geojson,layerId)
                }
                console.log(geojson)
                convertAndDownloadGeoJSONToSIMA(map, layerId, geojson, '詳細_', false, '', kukaku);
            } else {
                console.log(geojson)
                saveDxf (map, layerId, sourceId, fields, geojson, kei)
            }
        }

    }
    if (fgb_URL) {
        deserializeAndPrepareGeojson(layerId);
    } else {
        const features = map.queryRenderedFeatures({
            layers: [layerId] // 対象レイヤーを指定
        });
        // GeoJSONに変換
        const geojson = {
            type: "FeatureCollection",
            features: features.map(feature => ({
                type: "Feature",
                geometry: feature.geometry,
                properties: feature.properties
            }))
        };
        console.log(geojson);
        saveDxf (map, layerId, sourceId, fields, geojson, kei)
    }
}

export async function saveCima3(map,kei,jww) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。');
        return;
    }
    const layerId = 'oh-chibanzu2024'
    const fgb_URL = 'https://kenzkenz3.xsrv.jp/fgb/Chibanzu_2024_with_id.fgb'

    function fgBoundingBox() {
        const LngLatBounds = map.getBounds();
        var Lng01 = LngLatBounds.getWest();
        var Lng02 = LngLatBounds.getEast();
        var Lat01 = LngLatBounds.getNorth();
        var Lat02 = LngLatBounds.getSouth();
        return {
            minX: Lng01,
            minY: Lat02,
            maxX: Lng02,
            maxY: Lat01,
        };
    }

    async function deserializeAndPrepareGeojson(layerId) {
        const geojson = { type: 'FeatureCollection', features: [] };
        console.log('データをデシリアライズ中...');
        const iter = deserialize(fgb_URL, fgBoundingBox());

        for await (const feature of iter) {
            geojson.features.push(feature);
        }
        console.log('取得した地物:', geojson);
        if (geojson.features.length === 0) {
            return;
        }
        convertAndDownloadGeoJSONToSIMA(map, layerId, geojson, '詳細_',false, kei, jww);
    }
    deserializeAndPrepareGeojson(layerId);
}

// クリックされた地番を強調表示する関数
let isFirstRun = true;
export function highlightSpecificFeatures2025(map,layerId) {
    console.log(store.state.highlightedChibans);
    let sec = 0
    if (isFirstRun) {
        sec = 0
    } else {
        sec = 0
    }

    if (!map.getLayer(layerId)) return

    map.setPaintProperty(
        layerId,
        "fill-color", "rgba(0, 0, 0, 0)",
    );
    setTimeout(() => {
        map.setPaintProperty(
            layerId,
            'fill-color',
            [
                'case',
                [
                    'in',
                    ['concat', ['get', '筆ID'], '_', ['get', '地番']],
                    ['literal', Array.from(store.state.highlightedChibans)]
                ],
                'rgba(140, 255, 0, 0.5)', // クリックされた地番が選択された場合
                'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
            ]
        );
    }, sec)
    isFirstRun = false
}

export function highlightSpecificFeatures(map,layerId) {
    console.log(store.state.highlightedChibans);
    let sec = 0
    if (isFirstRun) {
        sec = 1000
    } else {
        sec = 0
    }
    map.setPaintProperty(
        layerId,
        "fill-color", "rgba(0, 0, 0, 0)",
    );
    setTimeout(() => {
        map.setPaintProperty(
            layerId,
            'fill-color',
            [
                'case',
                [
                    'in',
                    // ['concat', ['get', '丁目コード'], '_', ['get', '小字コード'], '_', ['get', '地番']],
                    ['concat', ['get', '地番区域'], '_', ['get', '地番']],
                    ['literal', Array.from(store.state.highlightedChibans)]
                ],
                'rgba(255, 0, 0, 0.5)', // クリックされた地番が選択された場合
                'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
            ]
        );
    }, sec)
    isFirstRun = false
}

export function highlightSpecificFeaturesSima(map,layerId) {
    console.log(layerId)
    const isPoint = layerId.includes('-point-layer')
    console.log(isPoint)
    let sec = 0
    if (isFirstRun) {
        sec = 0
    } else {
        sec = 0
    }
    try {
        setTimeout(() => {
            if (layerId.includes('-polygon-layer')) {
                map.setPaintProperty(
                    layerId,
                    'fill-color',
                    [
                        'case',
                        [
                            'in',
                            ['concat', ['get', 'id']],
                            ['literal', Array.from(store.state.highlightedSimas)]
                        ],
                        'rgba(0, 128, 128, 0.5)', // クリックされた地番が選択された場合
                        'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
                    ]
                );
            } else if (layerId.includes('-point-layer')) {
                map.setPaintProperty(
                    layerId,
                    'circle-color',
                    [
                        'case',
                        [
                            'in',
                            ['get', 'id'],
                            ['literal', Array.from(store.state.highlightedSimas)]
                        ],
                        'rgba(0, 128, 128, 1)', // 選択されている場合
                        'navy'         // されてない場合
                    ]
                )
                map.setPaintProperty(
                    layerId,
                    'circle-color',
                    [
                        'case',
                        [
                            'in',
                            ['get', 'id'],
                            ['literal', Array.from(store.state.highlightedSimas)]
                        ],
                        'green',  // 含まれている時
                        'blue'   // 含まれていない時
                    ]
                )
                map.setPaintProperty(layerId, 'circle-stroke-width', 3)
            } else if (layerId.includes('-point-label-layer')) {
                console.log(layerId)
                layerId = layerId.replace('-point-label-layer','-point-layer')
                map.setPaintProperty(
                    layerId,
                    'circle-color',
                    [
                        'case',
                        [
                            'in',
                            ['get', 'id'],
                            ['literal', Array.from(store.state.highlightedSimas)]
                        ],
                        'green',  // 含まれている時
                        'blue'   // 含まれていない時
                    ]
                )
            }
        }, sec)
        isFirstRun = false
    }catch (e) {
        console.log(e)
    }
}

let isFirstRunCity1 = true;
export function highlightSpecificFeaturesCity(map,layerId) {
    // alert(999)
    // console.log(store.state.highlightedChibans);
    // console.log(Array.from(store.state.highlightedChibans))
    // console.log(layerId)
    let sec = 0
    if (isFirstRunCity1) {
        sec = 1000
    } else {
        sec = 0
    }
    setTimeout(() => {
        // console.log(Array.from(store.state.highlightedChibans))
        let fields
        switch (layerId) {
            case 'oh-chibanzu2024':
                fields = ['concat', ['get', 'id']]
                break
            case 'oh-iwatapolygon':
                fields = ['concat', ['get', 'SKSCD'], '_', ['get', 'AZACD'], '_', ['get', 'TXTCD']]
                break
            case 'oh-narashichiban':
                fields = ['concat', ['get', '土地key'], '_', ['get', '大字cd']]
                break
            case 'oh-fukushimachiban':
                fields = ['concat', ['get', 'X'], '_', ['get', 'Y']]
                break
            case 'oh-kitahiroshimachiban':
                fields = ['concat', ['get', 'Aza'], '_', ['get', 'Chiban'], '_', ['get', 'Edaban']]
                break
            case 'oh-kunitachishi':
                fields = ['concat', ['get', 'id']]
                break
            case 'oh-fukuokashichiban':
                fields = ['concat', ['get', 'id']]
                break
            case 'oh-chibanzu-唐津市':
            case 'oh-chibanzu-名古屋市':
            case 'oh-chibanzu-甲府市':
            case 'oh-chibanzu-潮来市':
            case 'oh-chibanzu-西粟倉村':
            case 'oh-chibanzu-直方市':
            case 'oh-chibanzu-香芝市':
            case 'oh-chibanzu-川西市':
            case 'oh-chibanzu-大山崎町':
            case 'oh-chibanzu-城陽市':
            case 'oh-chibanzu-東村山市':
            case 'oh-chibanzu-音更町':
            case 'oh-chibanzu-旭川市':
            case 'oh-chibanzu-仙台市':
            case 'oh-chibanzu-姫路市':
            case 'oh-chibanzu-豊中市':
            case 'oh-chibanzu-伊丹市':
            case 'oh-chibanzu-深谷市':
            case 'oh-chibanzu-福山市':
            case 'oh-chibanzu-越谷市':
            case 'oh-chibanzu-福岡市':
            case 'oh-chibanzu-国立市':
            case 'oh-chibanzu-北広島市':
            case 'oh-chibanzu-福島市':
            case 'oh-chibanzu-長与町':
            case 'oh-chibanzu-善通寺市':
            case 'oh-chibanzu-坂出市':
            case 'oh-chibanzu-奈良市':
            case 'oh-chibanzu-佐用町':
            case 'oh-chibanzu-加古川市':
            case 'oh-chibanzu-西宮市':
            case 'oh-chibanzu-泉南市':
            case 'oh-chibanzu-岸和田市':
            case 'oh-chibanzu-長岡京市':
            case 'oh-chibanzu-京都市':
            case 'oh-chibanzu-半田市':
            case 'oh-chibanzu-磐田市':
            case 'oh-chibanzu-静岡市':
            case 'oh-chibanzu-町田市':
            case 'oh-chibanzu-小平市':
            case 'oh-chibanzu-利根町':
            case 'oh-chibanzu-舟形町':
            case 'oh-chibanzu-鹿角市':
            case 'oh-chibanzu-ニセコ町':
            case 'oh-chibanzu-室蘭市':
                fields = ['concat', ['get', 'id']]
                break
            case 'oh-chibanzu-高崎市':
                fields = ['concat', ['get', 'oh3id']]
                break
            case 'oh-chibanzu-all':
                fields = ['concat', ['get', 'id']]
                break
        }

        if(/^oh-chiban-/.test(layerId)) {
            fields = ['concat', ['get', 'oh3id']]
        }
        // console.log(layerId)
        // console.log(fields)
        // console.log(Array.from(store.state.highlightedChibans))
        // alert(Array.from(store.state.highlightedChibans))
        if (Array.from(store.state.highlightedChibans)) {
            try {
                // map.setPaintProperty(
                //     layerId,
                //     'fill-color',
                //     [
                //         'case',
                //         [
                //             'in',
                //             fields,
                //             ['literal', Array.from(store.state.highlightedChibans)]
                //         ],
                //         'rgba(255, 0, 0, 0.5)', // クリックされた地番が選択された場合
                //         'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
                //     ]
                // );
                map.setPaintProperty(
                    layerId,
                    'fill-color',
                    [
                        'case',
                        // クリックされた地番が選択された場合
                        [
                            'in',
                            fields,
                            ['literal', Array.from(store.state.highlightedChibans)]
                        ],
                        'rgba(255, 0, 0, 0.5)', // 赤色
                        // AzaNameが存在し、Txtcdが存在しない場合
                        // [
                        //     'all',
                        //     ['has', 'AzaName'],
                        //     ['!', ['has', 'Txtcd']]
                        // ],
                        // 'rgba(0,120,255,0.6)', // 青色
                        // // それ以外の場合は透明
                        'rgba(0, 0, 0, 0)'
                    ]
                );
            } catch (e) {
                // console.log(e)
            }
        }
    }, sec)
    isFirstRunCity1 = false
}
// 特定のレイヤーから地物を取得し、フィルタリング後にBBOXを計算する関数
// ⭐️これ・・・効いているのか？遅くなる元じゃないのか？
function getBoundingBoxByLayer(map, layerId) {
    // 地物をフィルタリング
    const chiban = []
    const chyome = []
    store.state.highlightedChibans.forEach(c => {
        // console.log(c)
        const lastUnderscoreIndex = c.lastIndexOf("_");
        // 最後の「_」の次の文字列を取得
        const result = c.substring(lastUnderscoreIndex + 1);
        // console.log(result)
        chiban.push(result)
        chyome.push(c.split('_')[2])
    })
    console.log(chiban)
    console.log(chyome)
    const filteredFeatures = map.queryRenderedFeatures({
        layers: [layerId] // 対象のレイヤーIDを指定
    }).filter(feature => {
        let targetId;
        switch (layerId) {
            case 'oh-homusyo-2025-polygon':
                targetId = `${feature.properties['筆ID']}`;
                break;
            case 'oh-chibanzu2024':
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-amx-a-fude':
                // targetId = `${feature.properties['丁目コード']}_${feature.properties['小字コード']}_${feature.properties['地番']}`;
                targetId = `${feature.properties['地番区域']}_${feature.properties['地番']}`;
                break;
            case 'oh-iwatapolygon':
                targetId = `${feature.properties['SKSCD']}_${feature.properties['AZACD']}_${feature.properties['TXTCD']}`;
                break;
            case 'oh-narashichiban':
                targetId = `${feature.properties['土地key']}_${feature.properties['大字cd']}`;
                break;
            case 'oh-fukushimachiban':
                targetId = `${feature.properties['X']}_${feature.properties['Y']}`;
                break;
            case 'oh-kitahiroshimachiban':
                targetId = `${feature.properties['Aza']}_${feature.properties['Chiban']}_${feature.properties['Edaban']}`;
                break;
            case 'oh-fukuokashichiban':
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-chibanzu-唐津市':
            case 'oh-chibanzu-名古屋市':
            case 'oh-chibanzu-甲府市':
            case 'oh-chibanzu-潮来市':
            case 'oh-chibanzu-西粟倉村':
            case 'oh-chibanzu-直方市':
            case 'oh-chibanzu-香芝市':
            case 'oh-chibanzu-川西市':
            case 'oh-chibanzu-大山崎町':
            case 'oh-chibanzu-城陽市':
            case 'oh-chibanzu-東村山市':
            case 'oh-chibanzu-音更町':
            case 'oh-chibanzu-旭川市':
            case 'oh-chibanzu-仙台市':
            case 'oh-chibanzu-姫路市':
            case 'oh-chibanzu-豊中市':
            case 'oh-chibanzu-伊丹市':
            case 'oh-chibanzu-深谷市':
            case 'oh-chibanzu-福山市':
            case 'oh-chibanzu-越谷市':
            case 'oh-chibanzu-福岡市':
            case 'oh-chibanzu-国立市':
            case 'oh-chibanzu-北広島市':
            case 'oh-chibanzu-福島市':
            case 'oh-chibanzu-長与町':
            case 'oh-chibanzu-善通寺市':
            case 'oh-chibanzu-坂出市':
            case 'oh-chibanzu-奈良市':
            case 'oh-chibanzu-佐用町':
            case 'oh-chibanzu-加古川市':
            case 'oh-chibanzu-西宮市':
            case 'oh-chibanzu-泉南市':
            case 'oh-chibanzu-岸和田市':
            case 'oh-chibanzu-長岡京市':
            case 'oh-chibanzu-京都市':
            case 'oh-chibanzu-半田市':
            case 'oh-chibanzu-磐田市':
            case 'oh-chibanzu-静岡市':
            case 'oh-chibanzu-町田市':
            case 'oh-chibanzu-小平市':
            case 'oh-chibanzu-利根町':
            case 'oh-chibanzu-舟形町':
            case 'oh-chibanzu-鹿角市':
            case 'oh-chibanzu-ニセコ町':
            case 'oh-chibanzu-室蘭市':
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-chibanzu-高崎市':
                targetId = `${feature.properties['oh3id']}`;
                break
            case 'oh-chibanzu-all':
                targetId = `${feature.properties['id']}`;
                break;
        }
        if(/^oh-chiban-/.test(layerId)) {
            targetId = `${feature.properties['oh3id']}`;
        }

        // amx2024対策
        // if (layerId === 'oh-amx-a-fude') {
        //     return chiban.includes(feature.properties['地番'])
        // } else {
            return store.state.highlightedChibans.has(targetId);
        // }
    });

    // 抽出結果の確認
    console.log(filteredFeatures);

    // BBOX計算
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    filteredFeatures.forEach(feature => {
        console.log(feature)
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            const coordinates = feature.geometry.coordinates.flat(Infinity);
            for (let i = 0; i < coordinates.length; i += 2) {
                // console.log(coordinates)
                const [x, y] = [coordinates[i], coordinates[i + 1]];
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    });

    // // MapLibreに新しいレイヤーを追加
    // map.addLayer({
    //     // id: `${layerId}-filtered`,
    //     type: 'fill',
    //     source: {
    //         type: 'geojson',
    //         data: {
    //             type: 'FeatureCollection',
    //             features: filteredFeatures
    //         }
    //     },
    //     paint: {
    //         'fill-color': '#ff0000',
    //         'fill-opacity': 0.5
    //     }
    // });


    // console.log({
    //     minX,
    //     minY,
    //     maxX,
    //     maxY
    // })
    return {
        minX,
        minY,
        maxX,
        maxY
    };
}
// 既存の GeoJSON データから store.state.highlightedChibans に基づいてフィーチャを抽出する関数
function extractHighlightedGeoJSONFromSource(geojsonData,layerId) {
    if (store.state.highlightedChibans.size === 0) {
        console.warn('No highlighted features to extract.');
        return geojsonData;
    }
    console.log(geojsonData)
    console.log(layerId)
    console.log(store.state.highlightedChibans)
    const chiban = []
    const chyome = []
    store.state.highlightedChibans.forEach(c => {
        console.log(c)
        const lastUnderscoreIndex = c.lastIndexOf("_");
        // 最後の「_」の次の文字列を取得
        const result = c.substring(lastUnderscoreIndex + 1);
        console.log(result)
        chiban.push(result)
        chyome.push(c.split('_')[2])
    })
    console.log(chiban)
    console.log(geojsonData)
    const filteredFeatures = geojsonData.features.filter(feature => {
        let targetId;
        switch (layerId) {
            case 'oh-homusyo-2025-polygon':
                targetId = `${feature.properties['筆ID']}_${feature.properties['地番']}`
                break
            case 'oh-chibanzu2024':
                console.log(feature.properties['id'])
                targetId = `${feature.properties['id']}`;
                break;
            // case 'oh-amx-a-fude':
            //     targetId = feature.properties['地番'];
            //     break;
            case 'oh-iwatapolygon':
                targetId = `${feature.properties['SKSCD']}_${feature.properties['AZACD']}_${feature.properties['TXTCD']}`;
                break;
            case 'oh-narashichiban':
                targetId = `${feature.properties['土地key']}_${feature.properties['大字cd']}`;
                break;
            case 'oh-fukushimachiban':
                console.log(feature.properties)
                targetId = `${feature.properties['X']}_${feature.properties['Y']}`;
                break;
            default:
                targetId = null; // どのケースにも一致しない場合のデフォルト値
                break;
            case 'oh-kitahiroshimachiban':
                targetId = `${feature.properties['Aza']}_${feature.properties['Chiban']}_${feature.properties['Edaban']}`;
                break;
            case 'oh-kunitachishi':
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-fukuokashichiban':
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-chibanzu-唐津市':
            case 'oh-chibanzu-名古屋市':
            case 'oh-chibanzu-甲府市':
            case 'oh-chibanzu-潮来市':
            case 'oh-chibanzu-西粟倉村':
            case 'oh-chibanzu-直方市':
            case 'oh-chibanzu-香芝市':
            case 'oh-chibanzu-川西市':
            case 'oh-chibanzu-大山崎町':
            case 'oh-chibanzu-城陽市':
            case 'oh-chibanzu-東村山市':
            case 'oh-chibanzu-音更町':
            case 'oh-chibanzu-旭川市':
            case 'oh-chibanzu-仙台市':
            case 'oh-chibanzu-姫路市':
            case 'oh-chibanzu-豊中市':
            case 'oh-chibanzu-伊丹市':
            case 'oh-chibanzu-深谷市':
            case 'oh-chibanzu-福山市':
            case 'oh-chibanzu-越谷市':
            case 'oh-chibanzu-福岡市':
            case 'oh-chibanzu-国立市':
            case 'oh-chibanzu-北広島市':
            case 'oh-chibanzu-福島市':
            case 'oh-chibanzu-長与町':
            case 'oh-chibanzu-善通寺市':
            case 'oh-chibanzu-坂出市':
            case 'oh-chibanzu-奈良市':
            case 'oh-chibanzu-佐用町':
            case 'oh-chibanzu-加古川市':
            case 'oh-chibanzu-西宮市':
            case 'oh-chibanzu-泉南市':
            case 'oh-chibanzu-岸和田市':
            case 'oh-chibanzu-長岡京市':
            case 'oh-chibanzu-京都市':
            case 'oh-chibanzu-半田市':
            case 'oh-chibanzu-磐田市':
            case 'oh-chibanzu-静岡市':
            case 'oh-chibanzu-町田市':
            case 'oh-chibanzu-小平市':
            case 'oh-chibanzu-利根町':
            case 'oh-chibanzu-舟形町':
            case 'oh-chibanzu-鹿角市':
            case 'oh-chibanzu-ニセコ町':
            case 'oh-chibanzu-室蘭市':
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-chibanzu-高崎市':
                targetId = `${feature.properties['oh3id']}`;
                break;
            case 'oh-chibanzu-all':
                if (feature.properties['id']) {
                    targetId = `${feature.properties['id']}`
                } else {
                    targetId = `${feature.properties['oh3id']}`
                }
                break;
        }
        // console.log(layerId)
        if(/^oh-chiban-/.test(layerId)) {
            targetId = `${feature.properties['oh3id']}`;
        }
        // console.log(targetId)
        // amx2024対策
        if (layerId === 'oh-amx-a-fude') {
            return chiban.includes(feature.properties['地番'])
            // return chiban.includes(feature.properties['地番']) && chyome.includes(feature.properties['丁目名'])
        } else {
            // console.log(targetId)
            return store.state.highlightedChibans.has(targetId);
        }
    });
    let geojson
    if (filteredFeatures.length > 0) {
        geojson = {
            type: 'FeatureCollection',
            features: filteredFeatures
        };
    } else {
        alert('データ取得失敗!')
        return
        // geojson = geojsonData
    }
    console.log('Extracted GeoJSON from Source:', geojson);
    return geojson;
}

// 全フィーチャの選択状態をリセットする関数
export function resetFeatureColors(map,layerId) {
    store.state.highlightedChibans.clear();
    map.setPaintProperty(
        layerId,
        "fill-color", "rgba(0, 0, 0, 0)",
    );
}
function convertSIMtoTXT(simText) {
    const lines = simText.split('\n');
    let formattedLines = '';

    lines.forEach(line => {
        if (line.startsWith('A01')) {
            const parts = line.split(',');
            if (parts.length >= 5) {
                const x = parseFloat(parts[3]);
                const y = parseFloat(parts[4]);
                if (!isNaN(x) && !isNaN(y)) {
                    formattedLines += `${x.toFixed(3)} ${y.toFixed(3)}\n`;
                }
            }
        }
    });

    // 最初のA01行を最後に追加
    const firstA01 = lines.find(line => line.startsWith('A01'));
    if (firstA01) {
        const parts = firstA01.split(',');
        if (parts.length >= 5) {
            const x = parseFloat(parts[3]);
            const y = parseFloat(parts[4]);
            if (!isNaN(x) && !isNaN(y)) {
                formattedLines += `${x.toFixed(3)} ${y.toFixed(3)}\n`;
            }
        }
    }

    return formattedLines;
}
// oh-amx-a-fude専用ファンクション。
function extractMatchingFeatures(map,geojson,layerId) {
    // const layerId = 'oh-amx-a-fude'
    // 1. MapLibreから現在表示されている地物を取得
    const visibleFeatures = map.queryRenderedFeatures({ layers: [layerId] });
    // 2. 表示中地物のプロパティを収集
    const visiblePropertiesSet = new Set();
    visibleFeatures.forEach(feature => {
        const { 地番 } = feature.properties;
        if (地番) {
            visiblePropertiesSet.add(`${地番}`);
        }
    });
    // 3. GeoJSONから一致する地物を抽出
    const filteredFeatures = geojson.features.filter(feature => {
        const { 地番} = feature.properties || {};
        return 地番 &&
            visiblePropertiesSet.has(`${地番}`);
    });
    // 4. 新しいGeoJSONを生成して返却
    return {
        type: "FeatureCollection",
        features: filteredFeatures
    };
}

export function savePointSimaForSaga (map) {
    const code = 'EPSG:2444'
    console.log(code)

    const features = map.queryRenderedFeatures({
        layers: ['oh-saga-kijyunten-point'] // 対象のレイヤー名を指定
    });
    // GeoJSON形式に変換
    const geojson = {
        type: 'FeatureCollection',
        features: features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
        }))
    };

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let j = 1;

    // 座標を関連付けるマップ
    const coordinateMap = new Map();

    geojson.features.forEach((feature) => {
        if (feature.geometry.type !== 'Point') {
            console.warn('Unsupported geometry type:', feature.geometry.type);
            return; // Point以外はスキップ
        }

        const coord = feature.geometry.coordinates;
        if (
            Array.isArray(coord) &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1])
        ) {
            // const [x, y] = proj4('EPSG:4326', code, [coord[0],coord[1]]); // 座標系変換
            const [x, y] = [feature.properties.Y, feature.properties.X]
            const coordinateKey = `${x},${y}`;
            const name = feature.properties.点名
            const zahyoY = y
            const zahyoX = x
            const zahyoZ = feature.properties.標高
            console.log(zahyoY)
            console.log(zahyoX)
            console.log(coord[2])
            if (!coordinateMap.has(coordinateKey)) {
                coordinateMap.set(coordinateKey, j);
                A01Text += 'A01,' + j + ',' + name + ',' + zahyoY + ',' + zahyoX + ',' + zahyoZ + ',\n';
                // A01Text += 'A01,' + j + ',' + j + ',' + zahyoY + ',' + zahyoX + ',\n';
                j++;
            }
        } else {
            console.error('Invalid coordinate skipped:', coord);
        }
    });

    simaData += A01Text + 'A99\n';
    simaData += 'A99,END,,\n';
    console.log(simaData)

    // UTF-8で文字列をコードポイントに変換
    const utf8Array = window.Encoding.stringToCode(simaData);
    // UTF-8からShift-JISに変換
    const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // Shift-JISエンコードされたデータをUint8Arrayに格納
    const uint8Array = new Uint8Array(shiftJISArray);
    // Blobを作成（MIMEタイプを変更）
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
    // ダウンロード用リンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = 'saga.sim'
    link.download = fileName; // ファイル名を正確に指定
    // リンクをクリックしてダウンロード
    link.click();
    URL.revokeObjectURL(link.href);
}

export function savePointSima (map,geojson,zahyokei0) {
    console.log(zahyokei0)
    const code = zahyokei.find(item => item.kei === zahyokei0).code
    console.log(code)

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let j = 1;

    // 座標を関連付けるマップ
    const coordinateMap = new Map();

    geojson.features.forEach((feature) => {
        if (feature.geometry.type !== 'Point') {
            console.warn('Unsupported geometry type:', feature.geometry.type);
            return; // Point以外はスキップ
        }

        const coord = feature.geometry.coordinates;
        if (
            Array.isArray(coord) &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1])
        ) {
            const [x, y] = proj4('EPSG:4326', code, [coord[0],coord[1]]); // 座標系変換
            const coordinateKey = `${x},${y}`;
            const name = ''
            const zahyoY = y
            const zahyoX = x
            const zahyoZ = coord[2]
            console.log(zahyoY)
            console.log(zahyoX)
            console.log(coord[2])
            if (!coordinateMap.has(coordinateKey)) {
                coordinateMap.set(coordinateKey, j);
                A01Text += 'A01,' + j + ',' + j + ',' + zahyoY + ',' + zahyoX + ',' + zahyoZ + ',\n';
                // A01Text += 'A01,' + j + ',' + j + ',' + zahyoY + ',' + zahyoX + ',\n';
                j++;
            }
        } else {
            console.error('Invalid coordinate skipped:', coord);
        }
    });

    simaData += A01Text + 'A99\n';
    simaData += 'A99,END,,\n';
    console.log(simaData)

    // UTF-8で文字列をコードポイントに変換
    const utf8Array = window.Encoding.stringToCode(simaData);
    // UTF-8からShift-JISに変換
    const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // Shift-JISエンコードされたデータをUint8Arrayに格納
    const uint8Array = new Uint8Array(shiftJISArray);
    // Blobを作成（MIMEタイプを変更）
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
    // ダウンロード用リンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = 'point.sim'
    link.download = fileName; // ファイル名を正確に指定
    // リンクをクリックしてダウンロード
    link.click();
    URL.revokeObjectURL(link.href);
}

export function saveSimaImage (chiban,data) {
    // 配列からGeoJSONを作成する関数
    function createGeoJSON(dataArray) {
        const features = dataArray.map(([name, lon, lat]) => {
            return turf.point([lon, lat], { name });
        });
        return turf.featureCollection(features);
    }
    // GeoJSONを作成
    const geojson = createGeoJSON(data);

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let B01Text = '';
    let i = 1;

    // 座標を関連付けるマップ
    const coordinateMap = new Map();

    geojson.features.forEach((feature) => {
        const coord = feature.geometry.coordinates;
        const [x, y] = coord
        const z = 0
        const coordinateKey = `${x},${y}`;
        console.log(feature.properties.name)
        const name = feature.properties.name
        if (!coordinateMap.has(coordinateKey)) {
            coordinateMap.set(coordinateKey, i);
            A01Text += 'A01,' + i + ',' + name + ',' + x + ',' + y + ',' + z + ',\n';
            B01Text += 'B01,' + i + ',' + name + ',\n';
            i++;
        }
    });
    // simaData += A01Text + 'A99\n';
    simaData += A01Text + 'A99\nZ00,区画データ,\nD00,1,' + chiban + ',1,\n' + B01Text + 'D99,\n'
    simaData += 'A99,END';
    console.log(simaData)

    store.state.simaText = JSON.stringify({
        text: simaData,
        zahyokei: store.state.zahyokei,
        opacity: 0.7
    })

    simaToGeoJSON(simaData, store.state.map01, null, true)
    store.state.snackbar = true

    // // UTF-8で文字列をコードポイントに変換
    // const utf8Array = window.Encoding.stringToCode(simaData);
    // // UTF-8からShift-JISに変換
    // const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // // Shift-JISエンコードされたデータをUint8Arrayに格納
    // const uint8Array = new Uint8Array(shiftJISArray);
    // // Blobを作成（MIMEタイプを変更）
    // const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
    //
    // // ダウンロード用リンクを作成
    // const link = document.createElement('a');
    // link.href = URL.createObjectURL(blob);
    //
    // const fileName = 'aaa.sim'
    //
    // link.download = fileName; // ファイル名を正確に指定
    // // リンクをクリックしてダウンロード
    // link.click();
    // URL.revokeObjectURL(link.href);

}

export function saveSimaKijyunten (map,layerId) {
    if (map.getZoom() <= 16) {
        alert('ズーム16以上にしてください。')
        return
    }
    console.log(layerId)
    const features = map.queryRenderedFeatures({
        layers: [layerId] // 対象のレイヤー名を指定
    });
    // GeoJSON形式に変換
    const geojson = {
        type: 'FeatureCollection',
        features: features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
        }))
    };
    console.log(geojson)
    console.log(store.state.zahyokei)
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    console.log(code)

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let j = 1;

    // 座標を関連付けるマップ
    const coordinateMap = new Map();

    geojson.features.forEach((feature) => {
        if (feature.geometry.type !== 'Point') {
            console.warn('Unsupported geometry type:', feature.geometry.type);
            return; // Point以外はスキップ
        }

        const coord = feature.geometry.coordinates;
        if (
            Array.isArray(coord) &&
            coord.length === 2 &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1])
        ) {
            const [x, y] = proj4('EPSG:4326', code, coord); // 座標系変換
            const coordinateKey = `${x},${y}`;
            console.log(feature.properties.名称)
            const name = feature.properties.名称
            const zahyoY = feature.properties.Y
            const zahyoX = feature.properties.X
            const zahyoZ = 0
            if (!coordinateMap.has(coordinateKey)) {
                coordinateMap.set(coordinateKey, j);
                A01Text += 'A01,' + j + ',' + name + ',' + zahyoX + ',' + zahyoY + ',' + zahyoZ + ',\n';
                j++;
            }
        } else {
            console.error('Invalid coordinate skipped:', coord);
        }
    });

    simaData += A01Text + 'A99\n';
    simaData += 'A99,END,,\n';
    console.log(simaData)

    // UTF-8で文字列をコードポイントに変換
    const utf8Array = window.Encoding.stringToCode(simaData);
    // UTF-8からShift-JISに変換
    const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // Shift-JISエンコードされたデータをUint8Arrayに格納
    const uint8Array = new Uint8Array(shiftJISArray);
    // Blobを作成（MIMEタイプを変更）
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' });

    // ダウンロード用リンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const firstPoint = getFirstPointName(geojson).pointName
    const hoka = getFirstPointName(geojson).hoka
    const fileName = '基準点_' + store.state.zahyokei + firstPoint + hoka + '.sim'

    link.download = fileName; // ファイル名を正確に指定
    // リンクをクリックしてダウンロード
    link.click();
    URL.revokeObjectURL(link.href);

    if (store.state.userId) {
        insertSimaData(store.state.userId, fileName.split('.')[0], 'dummy', 'dummy', simaData, store.state.zahyokei)
            .then(r => {
                store.state.fetchImagesFire = !store.state.fetchImagesFire
            })
    }
}

export function saveSimaGaiku (map,layerId) {
    if (map.getZoom() <= 12) {
        alert('ズーム12以上にしてください。')
        return
    }
    console.log(layerId)
    const features = map.queryRenderedFeatures({
        layers: [layerId] // 対象のレイヤー名を指定
    });
    // GeoJSON形式に変換
    const geojson = {
        type: 'FeatureCollection',
        features: features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
        }))
    };
    console.log(geojson)
    console.log(store.state.zahyokei)
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    console.log(code)

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let j = 1;

    // 座標を関連付けるマップ
    const coordinateMap = new Map();

    geojson.features.forEach((feature) => {
        if (feature.geometry.type !== 'Point') {
            console.warn('Unsupported geometry type:', feature.geometry.type);
            return; // Point以外はスキップ
        }

        const coord = feature.geometry.coordinates;
        if (
            Array.isArray(coord) &&
            coord.length === 2 &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1])
        ) {
            const [x, y] = proj4('EPSG:4326', code, coord); // 座標系変換
            const coordinateKey = `${x},${y}`;
            console.log(feature.properties.基準点等名称)
            let name = ''
            if (feature.properties.基準点等名称) {
                name = feature.properties.基準点等名称
            } else if (feature.properties['街区点・補助点名称']){
                name = feature.properties['街区点・補助点名称']
            }
            let zahyoY, zahyoX
            if (feature.properties.補正後Y座標) {
                zahyoY = feature.properties.補正後Y座標
                zahyoX = feature.properties.補正後X座標
            } else {
                zahyoY = feature.properties.Y座標
                zahyoX = feature.properties.X座標
            }
            const zahyoZ = feature.properties.標高
            if (!coordinateMap.has(coordinateKey)) {
                coordinateMap.set(coordinateKey, j);
                A01Text += 'A01,' + j + ',' + name + ',' + zahyoX + ',' + zahyoY + ',' + zahyoZ + ',\n';
                // A01Text += 'A01,' + j + ',' + name + ',' + zahyoY + ',' + zahyoX + ',\n';
                // A01Text += 'A01,' + j + ',' + name + ',' + y.toFixed(3) + ',' + x.toFixed(3) + ',\n';
                j++;
            }
        } else {
            console.error('Invalid coordinate skipped:', coord);
        }
    });

    simaData += A01Text + 'A99\n';
    simaData += 'A99,END,,\n';
    console.log(simaData)

    // UTF-8で文字列をコードポイントに変換
    const utf8Array = window.Encoding.stringToCode(simaData);
    // UTF-8からShift-JISに変換
    const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // Shift-JISエンコードされたデータをUint8Arrayに格納
    const uint8Array = new Uint8Array(shiftJISArray);
    // Blobを作成（MIMEタイプを変更）
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' });

    // ダウンロード用リンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const firstPoint = getFirstPointName(geojson).pointName
    const hoka = getFirstPointName(geojson).hoka
    let gaiku = ''
    if (layerId === 'oh-gaiku-layer') {
        gaiku = '街区_'
    } else {
        gaiku = '都管_'
    }
    const fileName = gaiku + store.state.zahyokei + firstPoint + hoka + '.sim'

    link.download = fileName; // ファイル名を正確に指定
    // リンクをクリックしてダウンロード
    link.click();
    URL.revokeObjectURL(link.href);

    if (store.state.userId) {
        insertSimaData(store.state.userId, fileName.split('.')[0], 'dummy', 'dummy', simaData, store.state.zahyokei)
            .then(r => {
                store.state.fetchImagesFire = !store.state.fetchImagesFire
            })
    }
}

export function saveSimaGaiku2 (map,j) {
    const layerIds = []
    if (map.getLayer('oh-gaiku-layer')) {
        layerIds.push('oh-gaiku-layer')
    }
    if (map.getLayer('oh-toshikan-layer')) {
        layerIds.push('oh-toshikan-layer')
    }
    const features = map.queryRenderedFeatures({
        layers: layerIds // 対象のレイヤー名を指定
    });
    if (features.length === 0) {
        return ''
    }
    // GeoJSON形式に変換
    const geojson = {
        type: 'FeatureCollection',
        features: features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
        }))
    };
    console.log(geojson)
    console.log(store.state.zahyokei)
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    console.log(code)

    let simaData = '';
    let A01Text = '';
    // let j = 1;

    // 座標を関連付けるマップ
    const coordinateMap = new Map();

    geojson.features.forEach((feature) => {
        if (feature.geometry.type !== 'Point') {
            console.warn('Unsupported geometry type:', feature.geometry.type);
            return; // Point以外はスキップ
        }
        const coord = feature.geometry.coordinates;
        if (
            Array.isArray(coord) &&
            coord.length === 2 &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1])
        ) {
            const [x, y] = proj4('EPSG:4326', code, coord); // 座標系変換
            const coordinateKey = `${x},${y}`;
            console.log(feature.properties.基準点等名称)
            let name = ''
            if (feature.properties.基準点等名称) {
                name = feature.properties.基準点等名称
            } else if (feature.properties['街区点・補助点名称']){
                name = feature.properties['街区点・補助点名称']
            }
            let zahyoY, zahyoX
            if (feature.properties.補正後Y座標) {
                zahyoY = feature.properties.補正後Y座標
                zahyoX = feature.properties.補正後X座標
            } else {
                zahyoY = feature.properties.Y座標
                zahyoX = feature.properties.X座標
            }
            const zahyoZ = feature.properties.標高
            if (!coordinateMap.has(coordinateKey)) {
                coordinateMap.set(coordinateKey, j);
                A01Text += 'A01,' + j + ',' + name + ',' + zahyoX + ',' + zahyoY + ',' + zahyoZ + ',\n';
                // A01Text += 'A01,' + j + ',' + name + ',' + zahyoY + ',' + zahyoX + ',\n';
                // A01Text += 'A01,' + j + ',' + name + ',' + y.toFixed(3) + ',' + x.toFixed(3) + ',\n';
                j++;
            }
        } else {
            console.error('Invalid coordinate skipped:', coord);
        }
    });

    simaData += A01Text;
    // simaData += 'A99,END,,\n';
    console.log(simaData)
    return simaData
}


export async function queryFGBWithPolygon(map,polygon,chiban) {
    polygon = polygon.geometry.coordinates[0]
    console.log(polygon)

    let prefId = String(store.state.prefId).padStart(2, '0');
    console.log('初期 prefId:', prefId);

    let fgbUrl;
    function getFgbUrl(prefId) {
        const specialIds = ['07', '15', '22', '26', '28', '29', '30', '40', '43', '44','45','47'];
        return specialIds.includes(prefId)
            ? `https://kenzkenz3.xsrv.jp/fgb/2024/${prefId}.fgb`
            : `https://habs.rad.naro.go.jp/spatial_data/amxpoly47/amxpoly_2022_${prefId}.fgb`;
    }
    fgbUrl = getFgbUrl(prefId)
    try {
        // BBOXを計算
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        polygon.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });

        const bbox = {
            minX,
            minY,
            maxX,
            maxY,
        };
        console.log(bbox)
        // FlatGeobuf ファイルを取得し、GeoJSON 形式で BBOX クエリ
        let features = [];
        for await (const feature of deserialize(fgbUrl, bbox)) {
            features.push(feature);
        }
        features = features.filter(feature => feature.properties.地番 === chiban);
        console.log(features)

        if (features.length === 1) {
            // Turf.jsのGeoJSONフォーマットに変換
            const polygon = {
                type: 'Feature',
                geometry: features[0].geometry,
                properties: {}
            };
            console.log(calculatePolygonMetrics(polygon))
            document.querySelector('.feature-area').innerHTML = calculatePolygonMetrics(polygon)
        }

        // return features;
    } catch (error) {
        console.error("FGBからの地物取得に失敗しました:", error);
    }
}

/**
 * 複数のポリゴンをまとめて処理し、面積・周長・頂点数を合算して返す
 * @param {GeoJSON.Feature<GeoJSON.Polygon>[]|GeoJSON.Feature<GeoJSON.MultiPolygon>[]} polygons - 処理対象のポリゴン配列
 * @returns {{ area: string, perimeter: string, vertexCount: number }}
 */
function calculatePolygonsMetrics(polygons) {
    // 引数が単一のポリゴンなら配列に変換
    const list = Array.isArray(polygons) ? polygons : [polygons];

    let totalArea = 0;
    let totalPerimeter = 0;
    let totalVertexCount = 0;

    list.forEach(polygon => {
        // 面積を積算
        const area = turf.area(polygon);
        totalArea += area;

        // 周長を積算
        const perimeter = turf.length(polygon, { units: 'meters' });
        totalPerimeter += perimeter;

        // 頂点数を計算して積算
        // GeoJSONでは外周を0番目の配列として扱う
        let coords = polygon.geometry.coordinates[0];
        let vertexCount = coords.length;
        // ネストされた形式の場合の補正
        if (vertexCount === 1 && Array.isArray(coords[0])) {
            vertexCount = coords[0].length;
        }
        // 閉ループによる重複点を除外
        vertexCount = Math.max(0, vertexCount - 1);
        totalVertexCount += vertexCount;
    });

    return {
        area: `約${totalArea.toFixed(1)}m2`,    // 合計面積
        perimeter: `約${totalPerimeter.toFixed(1)}m`, // 合計周長
        vertexCount: totalVertexCount           // 合計頂点数
    };
}

function calculatePolygonMetrics(polygon) {
    try {
        // 面積の計算
        const area = '約' + turf.area(polygon).toFixed(1) + 'm2'; // Turf.jsで面積を計算
        // 周長の計算
        const perimeter = '約' + turf.length(polygon, { units: 'meters' }).toFixed(1) + 'm'; // Turf.jsで周長を計算
        // 頂点数の計算 (GeoJSON座標から取得)
        const coordinates = polygon.geometry.coordinates[0]; // 外周の座標を取得
        // console.log(coordinates[0].length)
        let vertexCount = coordinates.length;
        if (vertexCount === 1) {
            vertexCount = coordinates[0].length
        }
        // GeoJSONでは最初と最後の座標が同じなので、閉じたポリゴンの場合は1点減らす
        vertexCount -= 1;
        // if (coordinates[0][0] === coordinates[vertexCount - 1][0] &&
        //     coordinates[0][1] === coordinates[vertexCount - 1][1]) {
        //     vertexCount -= 1;
        // }
        return {
            area: area,
            perimeter: perimeter,
            vertexCount: vertexCount
        };
        // return '面積：' + area + ' 周長:' + perimeter + '<br>境界点数：' + vertexCount
    } catch (error) {
        console.error('面積・周長・頂点数の計算中にエラーが発生しました:', error);
    }
}

export async function zipDownloadSimaText (simaTexts) {
    const zip = new JSZip();
    // UTF-8で文字列をコードポイントに変換
    let blob
    simaTexts.forEach((simaText) => {
        const utf8Array = window.Encoding.stringToCode(simaText.simaText);
        // UTF-8からShift-JISに変換
        const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
        // Shift-JISエンコードされたデータをUint8Arrayに格納
        const uint8Array = new Uint8Array(shiftJISArray);
        blob = new Blob([uint8Array], { type: 'application/octet-stream' }); // MIMEタイプを変更
        zip.file(simaText.name + ".sim", blob);
    })

    if (simaTexts.length > 1) {
        // ZIPファイルを生成してダウンロード
        const zipBlob = await zip.generateAsync({type: "blob"});
        const zipLink = document.createElement("a");
        zipLink.href = URL.createObjectURL(zipBlob);
        zipLink.download = "simzip.zip";
        zipLink.click();
        URL.revokeObjectURL(zipLink.href);
    } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = simaTexts[0].name + '.sim'
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
}

export function downloadSimaText (isUser,fileName0) {
    let simaText
    let fileName = 'sima.sim'
    if (isUser) {
        try {
            simaText = JSON.parse(store.state.simaTextForUser).text;
        }catch (e) {
            simaText = store.state.simaTextForUser;
            fileName = fileName0 + '部分DL.sim'
        }
    } else {
        simaText = JSON.parse(store.state.simaText).text;
    }
    // UTF-8で文字列をコードポイントに変換
    const utf8Array = window.Encoding.stringToCode(simaText);
    // UTF-8からShift-JISに変換
    const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // Shift-JISエンコードされたデータをUint8Arrayに格納
    const uint8Array = new Uint8Array(shiftJISArray);
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' }); // MIMEタイプを変更
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export async function getCRS(tiffFile) {
    const arrayBuffer = await tiffFile.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const metadata = image.getFileDirectory();

    console.log("GeoTIFF Metadata:", metadata);

    // CRSの取得（EPSGコードが含まれている場合）
    const epsgCode = metadata.ProjectedCSType || metadata.GeographicType;

    // GeoAsciiParamsTag から座標系情報を取得
    let geoAsciiParams = metadata.GeoAsciiParams;

    if (epsgCode) {
        console.log("EPSG Code:", epsgCode);
    } else if (geoAsciiParams) {
        console.log("GeoAsciiParams (Raw):", geoAsciiParams);

        // 不要な null 文字を削除
        // geoAsciiParams = geoAsciiParams.replace(/\u0000/g, "").trim();

        // EPSG コードの検索 (EPSG:xxxx 形式)
        const epsgMatch = geoAsciiParams.match(/EPSG\s*:\s*(\d+)/);

        // 日本の座標系 (JGD2011 / Plane Rectangular CS)
        // const jgdMatch = geoAsciiParams.match(/JGD2011\s*\/\s*Japan\s*Plane\s*Rectangular\s*CS\s*(\w+)/i);
        const jgdMatch = geoAsciiParams.match(/JGD(?:2000|2011)\s*\/\s*Japan\s*Plane\s*Rectangular\s*CS\s*(\w+)/i);
        // JGD2000 / Japan Plane Rectangular CS XII|JGD2000

        // もし EPSG コードが見つかったら
        if (epsgMatch) {
            console.log("Extracted EPSG Code:", epsgMatch[1]);
            return null
        }
        // もし JGD2011 の平面直角座標系が見つかったら
        else if (jgdMatch) {
            console.log("Extracted JGD2011 Zone:", `Japan Plane Rectangular CS Zone ${jgdMatch[1]}`);
            let zahyokei = null
            switch(jgdMatch[1]) {
                case 'I':
                    zahyokei = '公共座標1系';
                    break;
                case 'II':
                    zahyokei = '公共座標2系';
                    break;
                case 'III':
                    zahyokei = '公共座標3系';
                    break;
                case 'IV':
                    zahyokei = '公共座標4系';
                    break;
                case 'V':
                    zahyokei = '公共座標5系';
                    break;
                case 'VI':
                    zahyokei = '公共座標6系';
                    break;
                case 'VII':
                    zahyokei = '公共座標7系';
                    break;
                case 'VIII':
                    zahyokei = '公共座標8系';
                    break;
                case 'IX':
                    zahyokei = '公共座標9系';
                    break;
                case 'X':
                    zahyokei = '公共座標10系';
                    break;
                case 'XI':
                    zahyokei = '公共座標11系';
                    break;
                case 'XII':
                    zahyokei = '公共座標12系';
                    break;
                case 'XIII':
                    zahyokei = '公共座標13系';
                    break;
                case 'XIV':
                    zahyokei = '公共座標14系';
                    break;
                case 'XV':
                    zahyokei = '公共座標15系';
                    break;
            }
            return zahyokei
        }
        // それ以外の座標系名を抽出
        else {
            const crsNameMatch = geoAsciiParams.match(/^[^|]+/);
            if (crsNameMatch) {
                console.log("Extracted CRS Name:", crsNameMatch[0]);
                return crsNameMatch[0]
            } else {
                console.log("CRS情報を特定できませんでした。");
                return null
            }
        }
    } else {
        console.log("CRS情報が見つかりません。");
        return null
    }
}

export async function addImageLayerPng(pngFile, worldFile, code, isFirst) {

    const map = store.state.map01;
    const map2 = store.state.map02;

    // PNGファイルを読み込む
    const url = URL.createObjectURL(pngFile);
    const img = new Image();
    img.src = url;
    await new Promise((resolve) => (img.onload = resolve));

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    let bounds;
    if (worldFile) {
        const worldFileText = await worldFile.text();
        const [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);
        bounds = [
            [originX, originY],
            [originX + pixelSizeX * img.width, originY],
            [originX + pixelSizeX * img.width, originY + pixelSizeY * img.height],
            [originX, originY + pixelSizeY * img.height]
        ].map(coord => proj4(code, 'EPSG:4326', coord));
    } else {
        alert('ワールドファイルが必要です。');
        return;
    }
    let index = 0;
    const result = store.state.selectedLayers['map01'].find((v, i) => {
        index = i;
        return v.id === 'oh-png-layer';
    });

    store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-png-layer');
    store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-png-layer');

    // const pngSource = {
    //     type: 'image',
    //     url: canvas.toDataURL('image/png'),
    //     coordinates: bounds
    // };

    pngSource.obj.url = canvas.toDataURL('image/png');
    pngSource.obj.coordinates = bounds;

    if (map.getLayer('oh-png-layer')) {
        map.removeLayer('oh-png-layer');
        map2.removeLayer('oh-png-layer');
    }
    if (map.getSource('png-source')) {
        map.removeSource('png-source');
        map2.removeSource('png-source');
    }

    if (isFirst) {
        store.state.selectedLayers['map01'].unshift(
            {
                id: 'oh-png-layer',
                label: 'pngレイヤー',
                source: pngSource,
                layers: [pngLayer],
                opacity: 1,
                visibility: true,
            }
        );

        store.state.selectedLayers['map02'].unshift(
            {
                id: 'oh-png-layer',
                label: 'pngレイヤー',
                source: pngSource,
                layers: [pngLayer],
                opacity: 1,
                visibility: true,
            }
        );
    } else {
        store.state.selectedLayers['map01'].splice(index, 0,
            {
                id: 'oh-png-layer',
                label: 'pngレイヤー',
                source: pngSource,
                layers: [pngLayer],
                opacity: 1,
                visibility: true,
            }
        );

        store.state.selectedLayers['map02'].splice(index, 0,
            {
                id: 'oh-png-layer',
                label: 'pngレイヤー',
                source: pngSource,
                layers: [pngLayer],
                opacity: 1,
                visibility: true,
            }
        );
    }

    if (isFirst) {
        const flyToBounds = [
            [bounds[0][0], bounds[0][1]],
            [bounds[2][0], bounds[2][1]]
        ];
        map.fitBounds(flyToBounds, { padding: 20 });
    }

    history('PNG読込', window.location.href);
}


export async function addImageLayer(tiffFile, worldFile, code, isFirst) {
    console.log(tiffFile)
    const map = store.state.map01;
    const map2 = store.state.map02;

    // GeoTIFF.jsを使用してTIFFファイルを読み込む
    const arrayBuffer = await tiffFile.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();
    let rasters;
    let isMonochrome = false;

    try {
        rasters = await image.readRasters(); // バンドをすべて読み込む
        if (rasters.length < 3) {
            isMonochrome = true;
            rasters = [rasters[0], rasters[0], rasters[0]]; // グレースケールに変換
        }
    } catch (error) {
        console.error("Failed to read rasters:", error);
        return;
    }
    // Canvasに画像を描画
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    ctx.clearRect(0, 0, width, height); // 背景を透明にする

    const threshold = 5; // 透過する明るさのしきい値（適宜調整）

    for (let i = 0; i < width * height; i++) {
        const red = rasters[0][i] !== undefined ? rasters[0][i] : 128;
        const green = isMonochrome ? red : (rasters[1][i] !== undefined ? rasters[1][i] : 128);
        const blue = isMonochrome ? red : (rasters[2][i] !== undefined ? rasters[2][i] : 128);

        // 明るさ（RGB 平均）
        const brightness = (red + green + blue) / 3;

        // 透過条件
        const isTransparent = (red === 255 && green === 255 && blue === 255) || // 白を透過
            (red === 0 && green === 0 && blue === 0) || // 黒を透過
            brightness < threshold; // 低輝度を透過

        imageData.data[i * 4] = red;
        imageData.data[i * 4 + 1] = green;
        imageData.data[i * 4 + 2] = blue;
        imageData.data[i * 4 + 3] = isTransparent ? 0 : 255; // 透過処理
    }

    ctx.putImageData(imageData, 0, 0);
    geotiffSource.obj.url = canvas.toDataURL('image/png'); // 透明部分を保持

    ctx.putImageData(imageData, 0, 0);
    let bounds
    if (worldFile) {
        const worldFileText = await worldFile.text();
        const [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);
        // 平面直角座標系の範囲を緯度経度に変換
        bounds = [
            [originX, originY], // 左上
            [originX + pixelSizeX * width, originY], // 右上
            [originX + pixelSizeX * width, originY + pixelSizeY * height], // 右下
            [originX, originY + pixelSizeY * height] // 左下
        ].map(coord => proj4(code, 'EPSG:4326', coord));
    } else {
        try {
            const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
            bounds = [
                [bbox[0], bbox[3]], // top-left
                [bbox[2], bbox[3]], // top-right
                [bbox[2], bbox[1]], // bottom-right
                [bbox[0], bbox[1]], // bottom-left
            ].map(coord => proj4(code, 'EPSG:4326', coord));
        }catch (e) {
            alert('ワールドファイルが必要です。')
            return
        }
    }
    let index = 0;
    const result = store.state.selectedLayers['map01'].find((v, i) => {
        index = i;
        return v.id === 'oh-geotiff-layer';
    });

    store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-geotiff-layer');
    store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-geotiff-layer');

    geotiffSource.obj.url = canvas.toDataURL();
    geotiffSource.obj.coordinates = bounds;
    // geotiffSource.obj.bounds = [
    //     [bounds[0][0], bounds[0][1]], // 左上
    //     [bounds[2][0], bounds[2][1]]  // 右下
    // ]

    if (map.getLayer('oh-geotiff-layer')) {
        map.removeLayer('oh-geotiff-layer');
    }
    if (map.getSource('geotiff-source')) {
        map.removeSource('geotiff-source');
    }
    if (map2.getLayer('oh-geotiff-layer')) {
        map2.removeLayer('oh-geotiff-layer');
    }
    if (map2.getSource('geotiff-source')) {
        map2.removeSource('geotiff-source');
    }

    if (isFirst) {
        store.state.selectedLayers['map01'].unshift(
            {
                id: 'oh-geotiff-layer',
                label: 'geotiffレイヤー',
                source: geotiffSource,
                layers: [geotiffLayer],
                opacity: 1,
                visibility: true,
            }
        );

        store.state.selectedLayers['map02'].unshift(
            {
                id: 'oh-geotiff-layer',
                label: 'geotiffレイヤー',
                source: geotiffSource,
                layers: [geotiffLayer],
                opacity: 1,
                visibility: true,
            }
        );
    } else {
        store.state.selectedLayers['map01'].splice(index, 0,
            {
                id: 'oh-geotiff-layer',
                label: 'geotiffレイヤー',
                source: geotiffSource,
                layers: [geotiffLayer],
                opacity: 1,
                visibility: true,
            }
        );

        store.state.selectedLayers['map02'].splice(index, 0,
            {
                id: 'oh-geotiff-layer',
                label: 'geotiffレイヤー',
                source: geotiffSource,
                layers: [geotiffLayer],
                opacity: 1,
                visibility: true,
            }
        );
    }

    const currentZoom = map.getZoom();

    // 地図の範囲を設定
    if (isFirst) {
        const flyToBounds = [
            [bounds[0][0], bounds[0][1]], // 左上
            [bounds[2][0], bounds[2][1]]  // 右下
        ];
        map.fitBounds(flyToBounds, { padding: 20 });
    } else {
        setTimeout(function () {
            store.state.map01.zoomTo(currentZoom + 0.01, { duration: 500 });
            store.state.map02.zoomTo(currentZoom + 0.01, { duration: 500 });
        }, 0);
    }
    history('GEOTIFF読込',window.location.href)
}

export async function addImageLayerJpg(jpgFile, worldFile, code, isFirst) {
    const map = store.state.map01;
    const map2 = store.state.map02;

    let gl = null;
    if (map.painter && map.painter.context) {
        gl = map.painter.context.gl;
    }
    let maxTextureSize = 4096;
    if (gl) {
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        console.log("Max Texture Size:", maxTextureSize);
    }

    const worldFileText = await worldFile.text();
    let [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);
    if (pixelSizeY > 0) pixelSizeY = -pixelSizeY;

    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(jpgFile);
    });

    const originalWidth = img.width;
    const originalHeight = img.height;

    let scale = 1;
    let imageUrl = img.src;
    if (originalWidth > maxTextureSize || originalHeight > maxTextureSize) {
        console.warn("画像サイズがWebGLの最大テクスチャサイズを超えています。縮小します。");
        scale = maxTextureSize / Math.max(originalWidth, originalHeight);
        imageUrl = resizeImage(img, maxTextureSize);
    }

    let bounds = [
        [originX, originY],
        [originX + pixelSizeX * originalWidth, originY],
        [originX + pixelSizeX * originalWidth, originY + pixelSizeY * originalHeight],
        [originX, originY + pixelSizeY * originalHeight]
    ].map(coord => proj4(code, 'EPSG:4326', coord));

    let index = store.state.selectedLayers['map01'].findIndex(v => v.id === 'oh-jpg-layer');
    if (index === -1) index = store.state.selectedLayers['map01'].findIndex(v => v.id === 'oh-geotiff-layer');
    if (index === -1) index = 0;

    store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-geotiff-layer' && v.id !== 'oh-jpg-layer');
    store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-geotiff-layer' && v.id !== 'oh-jpg-layer');

    jpgSource.obj.url = imageUrl;
    jpgSource.obj.coordinates = bounds;

    if (map.getLayer('oh-jpg-layer')) {
        map.removeLayer('oh-jpg-layer');
        map2.removeLayer('oh-jpg-layer');
    }
    if (map.getSource('jpg-source')) {
        map.removeSource('jpg-source');
        map2.removeSource('jpg-source');
    }

    store.state.selectedLayers['map01'].splice(index, 0, {
        id: 'oh-jpg-layer',
        label: 'jpgレイヤー',
        source: jpgSource,
        layers: [jpgLayer],
        opacity: 1,
        visibility: true,
    });

    store.state.selectedLayers['map02'].splice(index, 0, {
        id: 'oh-jpg-layer',
        label: 'jpgレイヤー',
        source: jpgSource,
        layers: [jpgLayer],
        opacity: 1,
        visibility: true,
    });

    const currentZoom = map.getZoom();

    if (isFirst) {
        const flyToBounds = [
            [bounds[0][0], bounds[0][1]],
            [bounds[2][0], bounds[2][1]]
        ];
        map.fitBounds(flyToBounds, { padding: 20 });
    } else {
        setTimeout(() => {
            store.state.map01.zoomTo(currentZoom + 0.01, { duration: 500 });
        }, 0);
    }
}


function resizeImage(image, maxSize) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = maxSize / Math.max(image.width, image.height);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg");
}








// export async function addImageLayerJpg(jpgFile, worldFile, code, isFirst) {
//     const map = store.state.map01;
//     const map2 = store.state.map02;
//
//     // WebGL コンテキストを取得（エラー回避）
//     let gl = null;
//     if (map.painter && map.painter.context) {
//         gl = map.painter.context.gl;
//     }
//     let maxTextureSize = 4096; // デフォルト値
//     if (gl) {
//         maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
//         console.log("Max Texture Size:", maxTextureSize);
//     }
//
//     // ワールドファイルを読み込む
//     const worldFileText = await worldFile.text();
//     let [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);
//
//     // pixelSizeY が負でない場合、負にする（Android での座標変換問題を防ぐ）
//     if (pixelSizeY > 0) {
//         pixelSizeY = -pixelSizeY;
//     }
//
//     // JPGファイルを Base64 に変換して読み込む（Android の createObjectURL 問題を回避）
//     let imageUrl = await new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result);
//         reader.onerror = reject;
//         reader.readAsDataURL(jpgFile);
//     });
//
//     const img = new Image();
//     img.crossOrigin = "anonymous";
//     await new Promise((resolve, reject) => {
//         img.onload = resolve;
//         img.onerror = reject;
//         img.src = imageUrl;
//     });
//
//     // 画像サイズが WebGL の最大サイズを超える場合、縮小
//     if (img.width > maxTextureSize || img.height > maxTextureSize) {
//         console.warn("画像サイズがWebGLの最大テクスチャサイズを超えています。縮小します。");
//         imageUrl = resizeImage(img, maxTextureSize);
//     }
//
//     const width = img.width;
//     const height = img.height;
//
//     // 平面直角座標系の範囲を緯度経度に変換
//     let bounds = [
//         [originX, originY],
//         [originX + pixelSizeX * width, originY],
//         [originX + pixelSizeX * width, originY + pixelSizeY * height],
//         [originX, originY + pixelSizeY * height]
//     ].map(coord => proj4(code, 'EPSG:4326', coord));
//
//     let index = store.state.selectedLayers['map01'].findIndex(v => v.id === 'oh-jpg-layer');
//     if (index === -1) {
//         index = store.state.selectedLayers['map01'].findIndex(v => v.id === 'oh-geotiff-layer');
//     }
//
//     if (index === -1) {
//         index = 0;
//     }
//
//     store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-geotiff-layer' && v.id !== 'oh-jpg-layer');
//     store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-geotiff-layer' && v.id !== 'oh-jpg-layer');
//
//     jpgSource.obj.url = imageUrl;
//     jpgSource.obj.coordinates = bounds;
//
//     if (map.getLayer('oh-jpg-layer')) {
//         map.removeLayer('oh-jpg-layer');
//         map2.removeLayer('oh-jpg-layer');
//     }
//     if (map.getSource('jpg-source')) {
//         map.removeSource('jpg-source');
//         map2.removeSource('jpg-source');
//     }
//
//     store.state.selectedLayers['map01'].splice(index, 0, {
//         id: 'oh-jpg-layer',
//         label: 'jpgレイヤー',
//         source: jpgSource,
//         layers: [jpgLayer],
//         opacity: 1,
//         visibility: true,
//     });
//
//     store.state.selectedLayers['map02'].splice(index, 0, {
//         id: 'oh-jpg-layer',
//         label: 'jpgレイヤー',
//         source: jpgSource,
//         layers: [jpgLayer],
//         opacity: 1,
//         visibility: true,
//     });
//
//     const currentZoom = map.getZoom();
//
//     if (isFirst) {
//         const flyToBounds = [
//             [bounds[0][0], bounds[0][1]],
//             [bounds[2][0], bounds[2][1]]
//         ];
//         map.fitBounds(flyToBounds, { padding: 20 });
//     } else {
//         setTimeout(() => {
//             store.state.map01.zoomTo(currentZoom + 0.01, { duration: 500 });
//         }, 0);
//     }
//
//     // WebGL のコンテキストをリセット
//     map.once('load', () => {
//         if (map.painter && map.painter.context) {
//             const gl = map.painter.context.gl;
//             if (gl) {
//                 gl.getExtension('WEBGL_lose_context')?.loseContext();
//             }
//         }
//     });
// }
//
// function resizeImage(image, maxSize) {
//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');
//     const scale = maxSize / Math.max(image.width, image.height);
//     canvas.width = image.width * scale;
//     canvas.height = image.height * scale;
//     ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
//     return canvas.toDataURL("image/jpeg");
// }











// export async function addImageLayerJpg(jpgFile, worldFile, code, isFirst) {
//
//     const map = store.state.map01;
//     const map2 = store.state.map02;
//
//     // ワールドファイルを読み込む
//     const worldFileText = await worldFile.text();
//     const [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);
//     // JPGファイルを読み込む
//     const imageUrl = URL.createObjectURL(jpgFile);
//     const img = new Image();
//     await new Promise((resolve, reject) => {
//         img.onload = resolve;
//         img.onerror = reject;
//         img.src = imageUrl;
//     });
//
//     const width = img.width;
//     const height = img.height;
//
//     // 平面直角座標系の範囲を緯度経度に変換
//     let bounds = [
//         [originX, originY], // 左上
//         [originX + pixelSizeX * width, originY], // 右上
//         [originX + pixelSizeX * width, originY + pixelSizeY * height], // 右下
//         [originX, originY + pixelSizeY * height] // 左下
//     ].map(coord => proj4(code, 'EPSG:4326', coord));
//
//     let index = 0
//     const result = store.state.selectedLayers['map01'].find((v,i) => {
//         index = i
//         return v.id === 'oh-geotiff-layer'
//     })
//     if (!result) {
//         index = 0
//         store.state.selectedLayers['map01'].find((v,i) => {
//             index = i
//             return v.id === 'oh-jpg-layer'
//         })
//     }
//
//     store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-geotiff-layer')
//     store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-geotiff-layer')
//     store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-jpg-layer');
//     store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-jpg-layer');
//
//     jpgSource.obj.url = imageUrl
//     jpgSource.obj.coordinates = bounds
//
//     if (map.getLayer('oh-jpg-layer')) {
//         map.removeLayer('oh-jpg-layer')
//         map2.removeLayer('oh-jpg-layer')
//     }
//     if (map.getSource('jpg-source')) {
//         map.removeSource('jpg-source')
//         map2.removeSource('jpg-source')
//     }
//     store.state.selectedLayers['map01'].splice(index, 0,
//         {
//             id: 'oh-jpg-layer',
//             label: 'jpgレイヤー',
//             source: jpgSource,
//             layers: [jpgLayer],
//             opacity: 1,
//             visibility: true,
//         }
//     )
//     store.state.selectedLayers['map02'].splice(index, 0,
//         {
//             id: 'oh-jpg-layer',
//             label: 'jpgレイヤー',
//             source: jpgSource,
//             layers: [jpgLayer],
//             opacity: 1,
//             visibility: true,
//         }
//     )
//
//     const currentZoom = map.getZoom();
//
//     // 地図の範囲を設定
//     if (isFirst) {
//         const flyToBounds = [
//             [bounds[0][0], bounds[0][1]], // 左上
//             [bounds[2][0], bounds[2][1]]  // 右下
//         ];
//         map.fitBounds(flyToBounds, { padding: 20 });
//     } else {
//         setTimeout(function () {
//             store.state.map01.zoomTo(currentZoom + 0.01, { duration: 500 });
//             // store.state.map02.zoomTo(currentZoom + 0.01, { duration: 500 });
//         }, 0);
//     }
// }

export function addTileLayerForImage (tileURL,jsonData, isFit) {
    const map01 = store.state.map01
    const mapName = map01.getContainer().id
    const bounds = jsonData.bounds
    const fileName = jsonData.fileName
    const index = store.state.selectedLayers[mapName].findIndex(v => v.id === 'oh-vpstile-layer');
    store.state.selectedLayers[mapName] = store.state.selectedLayers[mapName].filter(v => v.id !== 'oh-vpstile-layer');
    vpsTileSource.obj.tiles = [tileURL]
    vpsTileSource.obj.bounds = bounds

    if (map01.getLayer('oh-vpstile-layer')) {
        map01.removeLayer('oh-vpstile-layer');
    }
    if (map01.getSource('vpstile-source')) {
        map01.removeSource('vpstile-source');
    }

    store.state.selectedLayers[mapName].splice(index, 0,
        {
            id: 'oh-vpstile-layer',
            label: fileName,
            source: vpsTileSource,
            layers: [vpsTileLayer],
            opacity: 1,
            visibility: true,
        }
    );

    store.state.uploadedImage = JSON.stringify({
        tile: tileURL,
        bbox: bounds,
        fileName: fileName,
        uid: store.state.userId,
    })

    if (isFit) {
        map01.fitBounds([
            [bounds[0], bounds[1]], // minX, minY
            [bounds[2], bounds[3]]  // maxX, maxY
        ], { padding: 20 });
    }
}

export function addTileLayer (map) {
    if (map.getLayer('oh-vpstile-layer')) {
        return
    }

    try {
        const mapName = map.getContainer().id
        const tileURL = JSON.parse(store.state.uploadedImage).tile
        const bbox = JSON.parse(store.state.uploadedImage).bbox
        const fileName = JSON.parse(store.state.uploadedImage).fileName
        const index = store.state.selectedLayers[mapName].findIndex(v => v.id === 'oh-vpstile-layer');
        const opacity = store.state.selectedLayers[mapName].find(v => v.id === 'oh-vpstile-layer').opacity
        store.state.selectedLayers[mapName] = store.state.selectedLayers[mapName].filter(v => v.id !== 'oh-vpstile-layer');
        vpsTileSource.obj.tiles = [tileURL]
        vpsTileSource.obj.bounds = [bbox[0], bbox[1], bbox[2], bbox[3]]
        // store.state.selectedLayers[mapName].splice(index, 0,
        //     {
        //         id: 'oh-vpstile-layer',
        //         label: fileName,
        //         source: vpsTileSource,
        //         layers: [vpsTileLayer],
        //         opacity: opacity,
        //         visibility: true,
        //     }
        // );
    }catch (e) {
        console.log(e)
    }
}

export async function csvGenerateForUserPng () {
    // -------------------------------------------------------------------------------------------------
    async function generateCsv(filePath, dir) {
        store.state.loading2 = true
        store.state.loadingMessage = 'データ作成中です。'

        let response = await fetch("https://kenzkenz.net/myphp/generate_csv4.php", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                image_path: filePath,
                scale: store.state.ocrAccuracy,
            })
        });
        let result = await response.json();
        if (result.success) {
            console.log(result)
            console.log(result.chiban_data)
            console.log(result.raw_output)
            console.log(result.structured_data)
            console.log(result.test_data)
            // console.log(result.tables)
            // alert("データ生成完了！");
            saveSimaImage(result.chiban_data,result.structured_data)
            store.state.loading2 = false


        } else {
            console.log(result)
            store.state.loading2 = false
            alert("データ生成に失敗しました！" + result.error);
        }
    }
    // -------------------------------------------------------------------------------------------------
    store.state.loading = true
    const files = store.state.tiffAndWorldFile
    let pngFile = files[0]
    let fileName = pngFile.name;
    let dataFile
    fileName = fileName.slice(0, fileName.lastIndexOf('.'))
    const formData = new FormData();
    formData.append("file", pngFile);
    formData.append("dir", store.state.userId); // 指定したフォルダにアップロード
    fetch("https://kenzkenz.net/myphp/uploadPng.php", {
        method: "POST",
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("アップロード成功:", data);
                // alert("アップロード成功!")
                store.state.loading = false
                dataFile = data.file
                generateCsv(data.file, store.state.userId)
            } else {
                console.error("アップロード失敗:", data);
                store.state.loading = false
                alert("アップロードエラー: " + data.error);
            }
        })
        .catch(error => console.error("エラー:", error));
    // -------------------------------------------------------------------------------------------------
}


export async function tileGenerateForUserPdf () {
    // -------------------------------------------------------------------------------------------------
    let thumbnail = ''
    async function extractNumbers(filePath, dir) {
        store.state.loading2 = true
        store.state.loadingMessage = 'OCR処理中です。'

        let response = await fetch("https://kenzkenz.net/myphp/extract_numbers5.php", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                file: filePath,
                dir: dir,
            })
        });
        let result = await response.json();
        if (result.success) {
            // alert("ワールドファイル生成完了！");
            generateTiles(dataFile.replace(/\.pdf$/, '.tif'), srsCode, store.state.userId);
        } else {
            console.log(result)
            store.state.loading2 = false
            alert("ワールドファイル生成に失敗しました！" + result.error);
        }
    }

    async function generateTiles(filePath, srsCode = "2450", dir) {
        store.state.loading2 = true
        store.state.loadingMessage = '地図タイル作成中です。'
        let response = await fetch("https://kenzkenz.net/myphp/generate_tiles4.php", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                file: filePath,
                srs: srsCode,
                dir: dir,
                fileName: fileName,
                resolution: store.state.resolution,
                transparent: store.state.isTransparent,
            })
        });
        let result = await response.json();
        if (result.success) {
            console.log(result.tiles_url, result.bbox)
            addTileLayer(result.tiles_url, result.bbox)
            // alert("タイル生成完了！");
            store.state.loading2 = false
            const loclUrl = '/var/www/html/public_html/' + result.tiles_url.replace('https://kenzkenz.duckdns.org/','').replace('/{z}/{x}/{y}.png','')
            insertXyztileData(store.state.userId, fileName, result.tiles_url, loclUrl, thumbnail, '[' + result.bbox + ']')
        } else {
            console.log(result)
            store.state.loading2 = false
            alert("タイル生成に失敗しました！" + result.error);
        }
    }

    function addTileLayer(tileURL, bbox) {
        vpsTileSource.obj.tiles = [tileURL]
        vpsTileSource.obj.bounds = [bbox[0], bbox[1], bbox[2], bbox[3]]

        const map01 = store.state.map01
        if (map01.getLayer('oh-vpstile-layer')) {
            map01.removeLayer('oh-vpstile-layer');
        }
        if (map01.getSource('vpstile-source')) {
            map01.removeSource('vpstile-source');
        }

        const mapNames = ['map01', 'map02']
        mapNames.forEach(mapName => {
            store.state.selectedLayers[mapName].unshift(
                {
                    id: 'oh-vpstile-layer',
                    label: fileName,
                    source: vpsTileSource,
                    layers: [vpsTileLayer],
                    opacity: 1,
                    visibility: true,
                }
            );
        })

        if (bbox) {
            map01.fitBounds([
                [bbox[0], bbox[1]], // minX, minY
                [bbox[2], bbox[3]]  // maxX, maxY
            ], {padding: 20});
        }

        store.state.uploadedImage = JSON.stringify({
            tile: tileURL,
            bbox: bbox,
            fileName: fileName,
            uid: store.state.userId,
        })
        store.state.fetchImagesFire = !store.state.fetchImagesFire
    }
    // -------------------------------------------------------------------------------------------------
    store.state.loading = true
    const srsCode = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    let pdfFile = null
    for (const file of files) {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith(".pdf")) pdfFile = file;
    }
    if (!pdfFile) {
        alert(" PDFをアップロードしてください！");
        return;
    }
    let fileName = pdfFile.name;
    let dataFile
    fileName = fileName.slice(0, fileName.lastIndexOf('.'))
    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("dir", store.state.userId); // 指定したフォルダにアップロード
    fetch("https://kenzkenz.net/myphp/upload.php", {
        method: "POST",
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("アップロード成功:", data);
                // alert("アップロード成功!")
                store.state.loading = false
                dataFile = data.file
                thumbnail = data.thumbnail
                extractNumbers(data.file, store.state.userId)
            } else {
                console.error("アップロード失敗:", data);
                store.state.loading = false
                alert("アップロードエラー: " + data.error);
            }
        })
        .catch(error => console.error("エラー:", error));
    // -------------------------------------------------------------------------------------------------
}

export async function tileGenerateForUser(imageExtension, worldFileExtension, is3857) {
    // タイル生成関数
    async function generateTiles(filePath, srsCode = "3857", dir, fileName, resolution, transparent) {
        store.state.loading2 = true;
        // FormDataを作成
        const formData = new FormData();
        formData.append("file", filePath);
        formData.append("srs", srsCode);
        formData.append("dir", dir);
        formData.append("fileName", fileName);
        // formData.append("resolution", resolution || 22);
        formData.append("transparent", transparent || '1');

        try {
            // generate_tiles11.phpにリクエスト送信 generate_tiles15.phpが安定版
            const response = await fetch("https://kenzkenz.net/myphp/generate_tiles17.php", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                store.state.loading2 = false;
                alert("サーバーエラー: " + response.statusText);
                console.error("HTTPエラー:", response.status, response.statusText);
                return;
            }

            // ReadableStreamを取得
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = null;
            let buffer = '';

            // ストリーム処理
            async function processStream() {
                for await (const chunk of streamAsyncIterator(reader)) {
                    buffer += decoder.decode(chunk, { stream: true });
                    console.log("受信バッファ:", buffer); // デバッグ: 生のバッファ

                    // #でメッセージを分割
                    while (buffer.includes('#')) {
                        const index = buffer.indexOf('#');
                        const event = buffer.substring(0, index).trim();
                        buffer = buffer.substring(index + 1);

                        console.log("イベント:", event); // デバッグ: イベント内容
                        // data: フィールドを抽出
                        const dataMatch = event.match(/^data:\s*(.+)$/m);
                        if (dataMatch) {
                            const jsonStr = dataMatch[1].trim();
                            try {
                                const data = JSON.parse(jsonStr);
                                console.log("パース済みデータ:", data); // デバッグ: パース結果

                                if (data.log) {
                                    if (!data.log.includes('[ERROR]')) {
                                        // store.state.loadingMessage = data.log.slice(0, 40); // ログをリアルタイム表示
                                        store.state.loadingMessage = store.state.loadingMessage + '<br>' + data.log.slice(0, 100); // ログをリアルタイム表示
                                    }
                                } else if (data.error) {
                                    console.error("サーバーエラー:", data);
                                    store.state.loading2 = false;
                                    alert("タイル生成エラー: " + data.error);
                                    return;
                                } else if (data.success) {
                                    result = data; // 成功レスポンスを保存
                                }
                            } catch (e) {
                                console.error("JSONパースエラー:", jsonStr, e);
                            }
                        } else {
                            console.warn("data: フィールドが見つかりません:", event);
                        }
                    }
                }

                // バッファに残ったデータを処理
                if (buffer) {
                    console.log("残りのバッファ:", buffer);
                    const dataMatch = buffer.match(/^data:\s*(.+)$/m);
                    if (dataMatch) {
                        const jsonStr = dataMatch[1].trim();
                        try {
                            const data = JSON.parse(jsonStr);
                            console.log("最終パース済みデータ:", data);
                            if (data.success) {
                                result = data;
                            } else if (data.error) {
                                console.error("サーバーエラー:", data);
                                store.state.loading2 = false;
                                alert("タイル生成エラー: " + data.error);
                                return;
                            }
                        } catch (e) {
                            console.error("最終バッファパースエラー:", jsonStr, e);
                        }
                    }
                }

                // 成功時の処理
                if (result && result.success) {
                    console.log("成功:", result);
                    let mb = result.pmtiles_size_mb
                    if (mb === 0) mb = 0.01
                    const dbResult = await insertXyztileData(
                        store.state.userId,
                        fileName,
                        result.tiles_url,
                        result.tiles_dir,
                        'dummy',
                        '[' + result.bbox + ']',
                        mb,
                        result.max_zoom
                    );
                    addXyztileLayer(dbResult.id, dbResult.name, result.tiles_url, result.bbox);
                    console.log('タイル作成完了');
                    setTimeout(() => {
                        store.state.loading2 = false;
                    },0)

                    if (!result.bbox) {
                        alert('座標系が間違えている可能性があります。EPSG:4326に設定してください。');
                    }
                } else {
                    console.error("成功レスポンスがありません");
                    store.state.loading2 = false;
                    alert("タイル生成に失敗しました！");
                }
            }

            // ReadableStreamを非同期イテレータに変換
            async function* streamAsyncIterator(reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) return;
                        yield value;
                    }
                } finally {
                    reader.releaseLock();
                }
            }

            await processStream().catch(error => {
                console.error("ストリーム処理エラー:", error);
                store.state.loadingMessage = 'ログ処理に失敗しましたが、処理を続行します。';
                store.state.loading2 = false;
            });
        } catch (error) {
            console.error("タイル生成エラー:", error);
            store.state.loading2 = false;
            alert("タイル生成に失敗しました: " + error.message);
        }
    }

    // アップロード処理
    store.state.loading2 = true;
    store.state.loadingMessage = 'アップロード中です。少々お待ちください。';
    let srsCode = zahyokei.find(item => item.kei === store.state.zahyokei)?.code || "EPSG:3857";
    if (is3857) srsCode = 'EPSG:3857'
    const files = store.state.tiffAndWorldFile || [];
    let imageFile = null, worldFile = null;

    // 拡張子を正規表現でマッチング
    // imageExtension はカンマ区切りで複数指定可能（例: "jpg,jpeg"）
    const imageExtRegex = new RegExp(`\\.(${imageExtension.replace(/,/g, '|')})$`, 'i');
    const worldExtRegex = new RegExp(`\\.${worldFileExtension}$`, 'i');

    for (const file of files) {
        const fileName = file.name.toLowerCase();
        if (imageExtRegex.test(fileName)) imageFile = file;
        if (worldExtRegex.test(fileName)) worldFile = file;
    }

    if (!worldFile) imageFile = files[0]

    // if (!imageFile || !worldFile) {
    //     alert(`${imageExtension.toUpperCase()}ファイルと${worldFileExtension.toUpperCase()}ファイルの両方をアップロードしてください。`);
    //     store.state.loading2 = false;
    //     return;
    // }

    // let fileName = imageFile.name;
    // fileName = fileName.slice(0, fileName.lastIndexOf('.'));

    const fileName = store.state.gazoName

    const formData = new FormData();
    formData.append("file", imageFile);
    if (worldFile) formData.append("worldfile", worldFile);
    formData.append("dir", store.state.userId);

    try {
        let phpUrl = "https://kenzkenz.net/myphp/upload.php"
        if (!worldFile) phpUrl = "https://kenzkenz.net/myphp/upload1file.php"
        const response = await fetch(phpUrl, {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            console.log("アップロード成功:", data);
            store.state.loadingMessage = store.state.loadingMessage + '<br>アップロード成功'
            await generateTiles(data.file, srsCode, store.state.userId, fileName, store.state.resolution, store.state.transparent);
        } else {
            console.error("アップロード失敗:", data);
            store.state.loading2 = false;
            alert("アップロードエラー: " + data.error);
        }
    } catch (error) {
        console.error("アップロードエラー:", error);
        store.state.loading2 = false;
        alert("アップロードに失敗しました: " + error.message);
    }
}

async function insertXyztileData(uid, name, url, url2, url3, bbox, size, maxzoom) {
    try {
        const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileInsert.php', new URLSearchParams({
            uid: uid,
            name: name,
            url: url,
            url2: url2,
            url3: url3,
            bbox: bbox,
            size: size,
            maxzoom: maxzoom
        }));
        if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
        } else {
            console.log('登録成功:', response.data);
            return response.data
            // store.state.fetchImagesFire = !store.state.fetchImagesFire
        }
    } catch (error) {
        console.error('通信エラー:', error);
    }
}

export function addXyztileLayer(id,name,url,bbox) {
    const map01 = store.state.map01
    const bounds = [bbox[0], bbox[1], bbox[2], bbox[3]]
    const source = {
        id: 'oh-vpstile-' + id + '-' + name + '-source',obj: {
            type: 'raster',
            // tiles: ['transparentBlack://' + url],
            url: 'pmtiles://' + url,
            bounds: bounds,
            maxzoom: 26,
        }
    };
    const layer = {
        id: 'oh-vpstile-' + id + '-' + name + '-layer',
        type: 'raster',
        source: 'oh-vpstile-' + id + '-' + name  + '-source',
    }
    const mapNames = ['map01', 'map02']
    mapNames.forEach(mapName => {
        store.state.selectedLayers[mapName].unshift(
            {
                id: 'oh-vpstile-' + id + '-' + name + '-layer',
                label: name,
                source: source,
                layers: [layer],
                opacity: 1,
                visibility: true,
            }
        );
    })


    function fitBoundsAndThen(map, bbox, callback) {
        const onMoveEnd = () => {
            map.off('moveend', onMoveEnd); // 一度だけ実行
            callback();
        };
        map.on('moveend', onMoveEnd);
        map.fitBounds([
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]]
        ], {
            padding: 20,
            duration: 1000 // アニメーション時間（ms）必要に応じて調整
        });
    }
    fitBoundsAndThen(map01, bbox, () => {
        const currentZoom = map01.getZoom();
        map01.zoomTo(currentZoom + 0.00000000000000000000000000001);
    });
    // if (bbox) {
    //     map01.fitBounds([
    //         [bbox[0], bbox[1]], // minX, minY
    //         [bbox[2], bbox[3]]  // maxX, maxY
    //     ], { padding: 20 });
    // }
    store.state.fetchImagesFire = !store.state.fetchImagesFire
}

export async function pngLoadForUser (map,mapName,isUpload) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    let pngFile = null;
    let worldFile = null;

    // ファイルをペアリング
    for (const file of files) {
        if (file.name.endsWith('.png')) {
            pngFile = file;
        } else if (file.name.endsWith('.pgw') || file.name.endsWith('.wld')) {
            worldFile = file;
        }
    }

    if (!pngFile) {
        // alert('GeoTIFFファイル（.tif）をドラッグ＆ドロップしてください。');
        return;
    }
    if (!worldFile) {
        // alert('対応するワールドファイル（.tfw）も必要です。');
        return;
    }

    await addImageLayerPng(pngFile, worldFile, code, true)

    //----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file_1', pngFile);
        formData.append("file_2", worldFile);
        formData.append('code', code);
        formData.append('userId', store.state.userId);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadPngForUser.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    console.log(response.data.error)
                    alert(response.data.error)
                    return
                }
                console.log('イメージ保存成功:', response.data.file_1.file);
                console.log('イメージ保存成功:', response.data.file_2.file);
                console.log(response)
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file_1.file,
                    worldFile: response.data.file_2.file,
                    code: code,
                    uid: store.state.userId,
                })
                store.state.fetchImagesFire = !store.state.fetchImagesFire
                console.log(store.state.uploadedImage)
            })
            .catch(error => {
                // エラー時の処理
                console.error('エラー:', error.response ? error.response.data : error.message);
                store.state.uploadedImage = ''
            });
    }
}

async function fetchFile(url) {
    try {
        // Fetchリクエストでファイルを取得
        const response = await fetch(url);
        // レスポンスが成功したか確認
        if (!response.ok) {
            throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }
        // Blobとしてレスポンスを取得
        const blob = await response.blob();
        // BlobをFileオブジェクトに変換
        const file = new File([blob], "downloaded_file", { type: blob.type });
        console.log("Fileオブジェクトが作成されました:", file);
        return file;
    } catch (error) {
        console.error("ファイルの取得中にエラーが発生しました:", error);
    }
}

async function insertSimaData(uid, name, url, url2, simaText, zahyokei) {
    try {
        const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaInsert.php', new URLSearchParams({
            uid: uid,
            name: name,
            url: url,
            url2: url2,
            simatext: simaText,
            zahyokei: zahyokei
        }));
        if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
        } else {
            console.log('登録成功:', response.data);
            return response.data
        }
    } catch (error) {
        console.error('通信エラー:', error);
    }
}

export async function simaLoadForUser (map,isUpload,simaText,zahyokei) {
    store.state.loading2 = true
    store.state.loadingMessage = 'アップロード中です。'
    const files = store.state.tiffAndWorldFile
    const file = files[0];
    console.log(file)
    //----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        store.state.loading2 = true
        // FormDataを作成
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dir', store.state.userId);
        axios.post('https://kenzkenz.net/myphp/upload_sima.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    console.log(response.data.error)
                    alert(response.data.error)
                    return
                }
                // alert('成功')
                console.log('sima保存成功:', response.data.simaPath);
                console.log(response)
                // alert(store.state.zahyokei)
                const webUrl = 'https://kenzkenz.net/' + response.data.simaPath.replace('/var/www/html/public_html/','')
                const name = response.data.simaName.replace('.sim','')
                let id
                async function bbb () {
                    const res = await insertSimaData(store.state.userId, name, webUrl, response.data.simaPath, simaText, zahyokei)
                    id = res.lastId
                }
                bbb().then(() => {
                    store.state.fetchImagesFire = !store.state.fetchImagesFire
                    async function aaa() {
                        console.log(response)
                        // alert(222 + zahyokei)
                        const sourceAndLayers = await userSimaSet(name, webUrl, id, zahyokei, simaText, isUpload)
                        console.log(sourceAndLayers)
                        store.state.geojsonSources.push({
                            sourceId: sourceAndLayers.source.id,
                            source: sourceAndLayers.source
                        })
                        console.log(store.state.geojsonSources)
                        store.state.selectedLayers.map01.unshift(
                            {
                                id: 'oh-sima-' + id + '-' + name + '-layer',
                                label: name,
                                source: sourceAndLayers.source.id,
                                layers: sourceAndLayers.layers,
                                opacity: 1,
                                visibility: true,
                            }
                        );
                        console.log(store.state.selectedLayers.map01)
                        const bounds = new maplibregl.LngLatBounds();
                        sourceAndLayers.geojson.features.forEach(feature => {
                            const geometry = feature.geometry;
                            if (!geometry) return;
                            switch (geometry.type) {
                                case 'Point':
                                    bounds.extend(geometry.coordinates);
                                    break;
                                case 'LineString':
                                    geometry.coordinates.forEach(coord => bounds.extend(coord));
                                    break;
                                case 'Polygon':
                                    geometry.coordinates.flat().forEach(coord => bounds.extend(coord));
                                    break;
                                case 'MultiPolygon':
                                    geometry.coordinates.flat(2).forEach(coord => bounds.extend(coord));
                                    break;
                            }
                        });
                        map.fitBounds(bounds, {
                            padding: 50,
                            animate: true
                        });
                        store.state.snackbar = true
                        store.state.loading2 = false
                        store.state.fetchImagesFire = !store.state.fetchImagesFire
                    }
                    aaa()
                })
            })
            .catch(error => {
                // エラー時の処理
                console.error('エラー:', error.response ? error.response.data : error.message);
                store.state.uploadedImage = ''
            });
    }
}

export async function kmzLoadForUser (map,isUpload) {
    async function insertKmzData(uid, name, url, url2) {
        try {
            const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userKmzInsert.php', new URLSearchParams({
                uid: uid,
                name: name,
                url: url,
                url2: url2,
            }));
            if (response.data.error) {
                console.error('エラー:', response.data.error);
                alert(`エラー: ${response.data.error}`);
            } else {
                console.log('登録成功:', response.data);
                store.state.fetchImagesFire = !store.state.fetchImagesFire
                async function aaa() {
                    const id = response.data.lastId
                    const sourceAndLayers = await userKmzSet(name, response.data.url, id)
                    console.log(sourceAndLayers)
                    store.state.geojsonSources.push({
                        sourceId: sourceAndLayers.source.id,
                        source: sourceAndLayers.source
                    })
                    console.log(store.state.geojsonSources)
                    store.state.selectedLayers.map01.unshift(
                        {
                            id: 'oh-kmz-' + id + '-' + name + '-layer',
                            label: name,
                            source: sourceAndLayers.source.id,
                            layers: sourceAndLayers.layers,
                            opacity: 1,
                            visibility: true,
                        }
                    );
                    console.log(store.state.selectedLayers.map01)
                    const bounds = new maplibregl.LngLatBounds();
                    sourceAndLayers.geojson.features.forEach(feature => {
                        const geometry = feature.geometry;
                        if (!geometry) return;
                        switch (geometry.type) {
                            case 'Point':
                                bounds.extend(geometry.coordinates);
                                break;
                            case 'LineString':
                                geometry.coordinates.forEach(coord => bounds.extend(coord));
                                break;
                            case 'Polygon':
                                geometry.coordinates.flat().forEach(coord => bounds.extend(coord));
                                break;
                            case 'MultiPolygon':
                                geometry.coordinates.flat(2).forEach(coord => bounds.extend(coord));
                                break;
                        }
                    });
                    map.fitBounds(bounds, {
                        padding: 50,
                        animate: true
                    });
                    store.state.loading2 = false
                }
                aaa()
            }
        } catch (error) {
            console.error('通信エラー:', error);
        }
    }

    store.state.loading2 = true
    store.state.loadingMessage = 'アップロード中です。'
    const files = store.state.tiffAndWorldFile
    const zipFile = files[0];
    //----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        store.state.loading2 = true
        // FormDataを作成
        const formData = new FormData();
        formData.append('file', zipFile);
        formData.append('dir', store.state.userId);
        axios.post('https://kenzkenz.net/myphp/upload_kmz.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    console.log(response.data.error)
                    alert(response.data.error)
                    return
                }
                console.log('KMZ保存成功:', response.data.kmzPath);
                console.log(response)
                const webUrl = 'https://kenzkenz.net/' + response.data.kmzPath.replace('/var/www/html/public_html/','')
                const name = response.data.kmzName.replace('.kmz','')
                insertKmzData(store.state.userId, name, webUrl, response.data.kmzPath)
                store.state.fetchImagesFire = !store.state.fetchImagesFire
            })
            .catch(error => {
                // エラー時の処理
                console.error('エラー:', error.response ? error.response.data : error.message);
                store.state.uploadedImage = ''
            });
    }
}




// export async function kmzLoadForUser (map,isUpload,geojson) {
//
//     const files = store.state.tiffAndWorldFile
//     const zipFile = files[0];
//
//     console.log(geojson)
//
//     await geojsonAddLayer(map, geojson,true, 'kml')
//
//     //----------------------------------------------------------------------------------------------------------------
//     if (isUpload) {
//         // FormDataを作成
//         const formData = new FormData();
//         formData.append('file_1', zipFile);
//         formData.append('userId', store.state.userId);
//
//         axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadKmzForUser.php', formData, {
//             headers: {
//                 'Content-Type': 'multipart/form-data', // 必須
//             },
//         })
//             .then(response => {
//                 // 成功時の処理
//                 if (response.data.error) {
//                     console.log(response.data.error)
//                     alert(response.data.error)
//                     return
//                 }
//                 console.log('イメージ保存成功:', response.data.file_1.file);
//                 console.log(response)
//                 store.state.uploadedVector = JSON.stringify({
//                     image: response.data.file_1.file,
//                     uid: store.state.userId,
//                 })
//                 store.state.fetchImagesFire = !store.state.fetchImagesFire
//             })
//             .catch(error => {
//                 // エラー時の処理
//                 console.error('エラー:', error.response ? error.response.data : error.message);
//                 store.state.uploadedImage = ''
//             });
//     }
// }

export async function jpgLoadForUser (map,mapName,isUpload) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    let jpgFile = null;
    let worldFile = null;

    // ファイルをペアリング
    for (const file of files) {
        if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
            jpgFile = file;
        } else if (file.name.endsWith('.jgw') || file.name.endsWith('.wld')) {
            worldFile = file;
        }
    }

    if (!jpgFile) {
        // alert('GeoTIFFファイル（.tif）をドラッグ＆ドロップしてください。');
        return;
    }
    if (!worldFile) {
        // alert('対応するワールドファイル（.tfw）も必要です。');
        return;
    }

    await addImageLayerJpg(jpgFile, worldFile, code, true)

    //----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file_1', jpgFile);
        formData.append("file_2", worldFile);
        formData.append('code', code);
        formData.append('userId', store.state.userId);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadJpgForUser.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    console.log(response.data.error)
                    alert(response.data.error)
                    return
                }
                console.log('イメージ保存成功:', response.data.file_1.file);
                console.log('イメージ保存成功:', response.data.file_2.file);
                console.log(response)
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file_1.file,
                    worldFile: response.data.file_2.file,
                    code: code,
                    uid: store.state.userId,
                })
                store.state.fetchImagesFire = !store.state.fetchImagesFire
                console.log(store.state.uploadedImage)
            })
            .catch(error => {
                // エラー時の処理
                console.error('エラー:', error.response ? error.response.data : error.message);
                store.state.uploadedImage = ''
            });
    }
}

export async function geoTiffLoadForUser1 (map,mapName,isUpload) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    let tiffFile = null;
    let worldFile = null;

    // ファイルをペアリング
    for (const file of files) {
        if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
            tiffFile = file;
        } else if (file.name.endsWith('.tfw') || file.name.endsWith('.wld')) {
            worldFile = file;
        }
    }

    if (!tiffFile) {
        // alert('GeoTIFFファイル（.tif）をドラッグ＆ドロップしてください。');
        return;
    }
    if (!worldFile) {
        // alert('対応するワールドファイル（.tfw）も必要です。');
        return;
    }

    await addImageLayer(tiffFile, worldFile, code, true)

    // ----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file_1', tiffFile);
        formData.append("file_2", worldFile);
        formData.append('code', code);
        formData.append('userId', store.state.userId);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadForUserTif1.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {

                // 成功時の処理
                // alert('成功')
                if (response.data.error) {
                    alert(response.data.error)
                    return
                }
                console.log('イメージ保存成功:', response.data);
                console.log('イメージ保存成功:', response.data.file_1.file);
                console.log('イメージ保存成功:', response.data.file_2.file);
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file_1.file,
                    worldFile: response.data.file_2.file,
                    code: code,
                    uid: store.state.userId,
                })
                store.state.fetchImagesFire = !store.state.fetchImagesFire
                // alert(store.state.uploadedImage)
            })
            .catch(error => {
                alert('失敗!')
                store.state.uploadedImage = ''
            });
    }
}

export async function geoTiffLoadForUser2 (map,mapName,isUpload) {
    history('ユーザーGEOTIFF読込',window.location.href)
    const zahyokei0 = zahyokei.find(item => item.kei === store.state.zahyokei)
    if (!zahyokei0) {
        // alert('座標系を選択してください。')
        return
    }
    const code = zahyokei0.code
    const files = store.state.tiffAndWorldFile
    const tiffFile = files[0];
    const worldFile = null;
    await addImageLayer(tiffFile, worldFile, code, true)
    // ----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file', tiffFile);
        formData.append('code', code);
        formData.append('userId', store.state.userId);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadForUserTif0.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                // alert('成功')
                if (response.data.error) {
                    alert(response.data.error)
                    return
                }
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file,
                    code: code,
                    uid: store.state.userId,
                })
                store.state.fetchImagesFire = !store.state.fetchImagesFire
                // alert(store.state.uploadedImage)
            })
            .catch(error => {
                alert('失敗')
                store.state.uploadedImage = ''
            });
    }
}

export async function geoTiffLoad2 (map,mapName,isUpload) {
    alert()
    history('GEOTIFF2読込',window.location.href)
    const zahyokei0 = zahyokei.find(item => item.kei === store.state.zahyokei)
    if (!zahyokei0) {
        // alert('座標系を選択してください。')
        return
    }
    const code = zahyokei0.code
    const files = store.state.tiffAndWorldFile
    const tiffFile = files[0];
    const worldFile = null;
    await addImageLayer(tiffFile, worldFile, code, true)
    // ----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file', tiffFile);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUpload.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    alert(response.data.error)
                    return
                }
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file,
                    code: code
                })
            })
            .catch(error => {
                store.state.uploadedImage = ''
            });
    }
}

export async function jpgLoad (map,mapName,isUpload) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    let jpgFile = null;
    let worldFile = null;

    // ファイルをペアリング
    for (const file of files) {
        if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
            jpgFile = file;
        } else if (file.name.endsWith('.jgw') || file.name.endsWith('.wld')) {
            worldFile = file;
        }
    }

    if (!jpgFile) {
        // alert('GeoTIFFファイル（.tif）をドラッグ＆ドロップしてください。');
        return;
    }
    if (!worldFile) {
        // alert('対応するワールドファイル（.tfw）も必要です。');
        return;
    }

    await addImageLayerJpg(jpgFile, worldFile, code, true)

    //----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file_1', jpgFile);
        formData.append("file_2", worldFile);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadJpg.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    console.log(response.data.error)
                    alert(response.data.error)
                    return
                }
                console.log('イメージ保存成功:', response.data.file1);
                console.log('イメージ保存成功:', response.data.file2);
                console.log(response)
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file1,
                    worldFile: response.data.file2,
                    // jpg: response.data.file3,
                    code: code
                })
                console.log(store.state.uploadedImage)
            })
            .catch(error => {
                // エラー時の処理
                console.error('エラー:', error.response ? error.response.data : error.message);
                store.state.uploadedImage = ''
            });
    }
}

export async function pngLoad (map,mapName,isUpload) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    let pngFile = null;
    let worldFile = null;

    // ファイルをペアリング
    for (const file of files) {
        if (file.name.endsWith('.png')) {
            pngFile = file;
        } else if (file.name.endsWith('.pgw') || file.name.endsWith('.wld')) {
            worldFile = file;
        }
    }

    if (!pngFile) {
        // alert('GeoTIFFファイル（.tif）をドラッグ＆ドロップしてください。');
        return;
    }
    if (!worldFile) {
        // alert('対応するワールドファイル（.tfw）も必要です。');
        return;
    }

    await addImageLayerPng(pngFile, worldFile, code, true)

    //----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file_1', pngFile);
        formData.append("file_2", worldFile);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadJpg.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    console.log(response.data.error)
                    alert(response.data.error)
                    return
                }
                console.log('イメージ保存成功:', response.data.file1);
                console.log('イメージ保存成功:', response.data.file2);
                console.log(response)
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file1,
                    worldFile: response.data.file2,
                    // jpg: response.data.file3,
                    code: code
                })
                console.log(store.state.uploadedImage)
            })
            .catch(error => {
                // エラー時の処理
                console.error('エラー:', error.response ? error.response.data : error.message);
                store.state.uploadedImage = ''
            });
    }
}


export async function geoTiffLoad (map,mapName,isUpload) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    let tiffFile = null;
    let worldFile = null;

    // ファイルをペアリング
    for (const file of files) {
      if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
        tiffFile = file;
      } else if (file.name.endsWith('.tfw') || file.name.endsWith('.wld')) {
        worldFile = file;
      }
    }

    if (!tiffFile) {
      // alert('GeoTIFFファイル（.tif）をドラッグ＆ドロップしてください。');
      return;
    }
    if (!worldFile) {
      // alert('対応するワールドファイル（.tfw）も必要です。');
      return;
    }

    await addImageLayer(tiffFile, worldFile, code, true)

    // ----------------------------------------------------------------------------------------------------------------
    if (isUpload) {
        // FormDataを作成
        const formData = new FormData();
        formData.append('file_1', tiffFile);
        formData.append("file_2", worldFile);
        axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/imageUploadtoJpeg.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // 必須
            },
        })
            .then(response => {
                // 成功時の処理
                if (response.data.error) {
                    console.log(response.data.error)
                    alert('20mbを超えていますので保存できませんでした。')
                    return
                }
                console.log('イメージ保存成功:', response.data.file1);
                console.log('イメージ保存成功:', response.data.file2);
                console.log('イメージ保存成功:', response.data.file3);
                console.log(response)
                store.state.uploadedImage = JSON.stringify({
                    image: response.data.file1,
                    worldFile: response.data.file2,
                    jpg: response.data.file3,
                    code: code
                })
                console.log(store.state.uploadedImage)
            })
            .catch(error => {
                // エラー時の処理
                console.error('エラー:', error.response ? error.response.data : error.message);
                store.state.uploadedImage = ''
            });
    }
}

export function capture(uid,isFirst) {
    if (!uid) return;
    const map01 = store.state.map01;
    map01.once('idle', async () => {
        const canvas = map01.getCanvas();
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        // console.log("生成された画像URL:", dataUrl);
        try {
            const res = await fetch("https://kenzkenz.net/myphp/thumbnail.php", {
                method: "POST",
                body: JSON.stringify({
                    image: dataUrl,
                    dir: uid
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const msg = await res.json();
            console.log("保存結果:", msg);
            // alert(msg.url)
            if (isFirst) {
                history('autosave-first', window.location.href,msg.url)
            } else {
                history('autosave', window.location.href,msg.url)
            }
            store.state.fetchImagesFire = !store.state.fetchImagesFire
        } catch (err) {
            console.error("Fetch failed:", err);
        }
    });
    // idle を強制発火させるため微小ズーム 重要！これがないと動かない。
    const currentZoom = map01.getZoom();
    map01.zoomTo(currentZoom + 0.00000000000000000000000000001);
}

export function fncPngDl(printMap) {
    let mapContainer
    switch (printMap) {
        case 'map01':
            mapContainer = document.getElementById('map01')
            break
        case 'map02':
            mapContainer = document.getElementById('map02')
            break
        case 'map03':
            mapContainer = document.getElementById('map00')
            break
    }
    const map01 = store.state.map01
    const map02 = store.state.map02
    let fileName = ''
    try {
        const config = JSON.parse(store.state.clickCircleGeojsonText).features.find(f => f.properties.id === 'config').properties
        fileName = config['title-text']
    }catch (e) {
        console.log(e)
    }
    if (!fileName) {
        fileName = store.state.address
        if (!fileName) {
            fileName = printMap + getNowFileNameTimestamp()
        }
    }
    // 地図のレンダリング完了を待機
    // document.querySelector('.print-buttons').style.display = 'none'
    document.querySelectorAll('.terrain-btn-div').forEach(s => {
        s.style.display = 'none'
    })
    map02.once('idle', async () => {
        html2canvas(mapContainer, { useCORS: true }).then(canvas => {
            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName + '.png';
                link.click();
                document.querySelectorAll('.terrain-btn-div').forEach(s => {
                    s.style.display = 'block'
                })
            });
        });
    });
    const currentZoom = map01.getZoom();
    map01.zoomTo(currentZoom + 0.00000000000000000000000000001);
}


export function pngDownload() {
    const map01 = store.state.map01
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code;
    // 地図のレンダリング完了を待機
    map01.once('idle', async () => {
        const zip = new JSZip();

        const canvas = map01.getCanvas();
        const imageData = canvas.toDataURL("image/png");
        // PNGファイルを追加
        const pngBlob = await fetch(imageData).then(res => res.blob());
        zip.file("map-image.png", pngBlob);

        // ワールドファイルの生成
        const bounds = map01.getBounds(); // 表示範囲を取得
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // WGS84 -> 平面直角座標系に変換
        const topLeft = proj4('EPSG:4326', code, [bounds.getWest(), bounds.getNorth()]);
        const bottomRight = proj4('EPSG:4326', code, [bounds.getEast(), bounds.getSouth()]);

        const xMin = topLeft[0];
        const xMax = bottomRight[0];
        const yMin = bottomRight[1];
        const yMax = topLeft[1];

        const pixelWidth = (xMax - xMin) / canvasWidth;
        const pixelHeight = (yMax - yMin) / canvasHeight;

        const worldFileContent = `
            ${pixelWidth}
            0
            0
            -${pixelHeight}
            ${xMin + pixelWidth / 2}
            ${yMax - pixelHeight / 2}`.trim();

        // ワールドファイルをZIPに追加
        zip.file("map-image.pgw", worldFileContent);

        // simaファイル
        let simaData = 'G00,01,open-hinata3,\n';
        simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
        simaData += 'A00,\n';
        let A01Text = '';
        A01Text += 'A01,' + 1 + ',' + 1 + ',' + yMax.toFixed(3) + ',' + xMin.toFixed(3) + ',\n';
        A01Text += 'A01,' + 2 + ',' + 2 + ',' + yMax.toFixed(3) + ',' + xMax.toFixed(3) + ',\n';
        A01Text += 'A01,' + 3 + ',' + 3 + ',' + yMin.toFixed(3) + ',' + xMin.toFixed(3) + ',\n';
        A01Text += 'A01,' + 4 + ',' + 4 + ',' + yMin.toFixed(3) + ',' + xMax.toFixed(3) + ',\n';
        simaData += A01Text + 'A99,END,,\n';

        // UTF-8で文字列をコードポイントに変換
        const utf8Array = window.Encoding.stringToCode(simaData);
        // UTF-8からShift-JISに変換
        const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
        // Shift-JISエンコードされたデータをUint8Arrayに格納
        const uint8Array = new Uint8Array(shiftJISArray);
        // Blobを作成
        const simaBlob = new Blob([uint8Array], { type: 'application/octet-stream' });

        // simaファイルをZIPに追加
        zip.file("map-image.sim", simaBlob);

        // DXFファイル
        const geojson = {
            type: "FeatureCollection",
            features: []
        };

        function createPoint(x, y) {
            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [x, y]
                },
                properties: {}
            };
        }

        const points = [
            createPoint(xMin.toFixed(3), yMin.toFixed(3)),
            createPoint(xMax.toFixed(3), yMin.toFixed(3)),
            createPoint(xMin.toFixed(3), yMax.toFixed(3)),
            createPoint(xMax.toFixed(3), yMax.toFixed(3))
        ];

        geojson.features.push(...points);
        const dxfString = geojsonToDXF(geojson);

        // DXFファイルをZIPに追加
        zip.file("map-image.dxf", dxfString);

        // ZIPファイルを生成してダウンロード
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipLink = document.createElement("a");
        zipLink.href = URL.createObjectURL(zipBlob);
        zipLink.download = "map-files.zip";
        zipLink.click();
        URL.revokeObjectURL(zipLink.href);
    });
    const currentZoom = map01.getZoom();
    map01.zoomTo(currentZoom + 0.00000000000000000000000000001);
}

// 改修必要あり！！！！！
export function geojsonAddLayer (map, geojson, isFitBounds, fileExtension) {

    if (map.getSource(fileExtension + '-source')) {
        map.removeLayer(fileExtension + '-polygon-layer')
        map.removeLayer(fileExtension + '-layer')
        map.removeLayer(fileExtension + '-line-layer')
        map.removeLayer(fileExtension + '-point-layer')
        map.removeLayer(fileExtension + '-label')
        // map.removeLayer(fileExtension + '-polygon-points')
        map.removeSource(fileExtension + '-source')
    }

    map.addSource(fileExtension + '-source', {
        type: 'geojson',
        data: geojson
    });

    map.addLayer({
        id: fileExtension + '-polygon-layer',
        type: 'fill',
        source: fileExtension + '-source',
        filter: ["==", "$type", "Polygon"],
        paint: {
            'fill-color': 'blue',
            'fill-opacity': 0.5
        }
    });
    map.addLayer({
        id: fileExtension + '-layer',
        type: 'line',
        source: fileExtension + '-source',
        filter: ["==", "$type", "Polygon"],
        paint: {
            'line-color': '#000',
            'line-width': 1
        }
    });
    map.addLayer({
        id: fileExtension + '-line-layer',
        type: 'line',
        source: fileExtension + '-source',
        filter: ["==", "$type", "LineString"],
        paint: {
            'line-color': ['get', 'stroke'],
            'line-width': ["*", ["get", "stroke-width"], 2],
        }
    });
    if (fileExtension === 'dxf') {
        // map.addLayer({
        //     id: 'dxf-point-layer',
        //     type: 'circle',
        //     source: 'dxf-source',
        //     filter: ["==", "$type", "Point"],
        //     paint: {
        //         'circle-color': 'black',
        //         'circle-radius': 6
        //     }
        // })
        map.addLayer({
            id: 'dxf-label',
            type: 'symbol',
            source: 'dxf-source',
            'layout': {
                'text-field': ['get', 'text'],
                "text-size": [
                    "interpolate", ["linear"], ["get", "textHeight"],
                    0, 0,
                    1, 8,
                    3, 24,
                    5, 40
                ]
            },
            'paint': {
                'text-color': 'rgba(0, 0, 0, 1)',
                'text-halo-color': 'rgba(255,255,255,1)',
                'text-halo-width': 1.0,
            },
            "text-anchor": "bottom-left",
            "symbol-placement": "point",
            'maxzoom': 24,
            'minzoom': 15
        });

    } else {
        map.addLayer({
            id: fileExtension + '-point-layer',
            type: 'circle',
            source: fileExtension + '-source',
            filter: ["==", "$type", "Point"],
            paint: {
                'circle-color': '#00FF00',
                'circle-radius': 6
            }
        })
        map.addLayer({
            id: fileExtension + '-label',
            type: 'symbol',
            source: fileExtension + '-source',
            'layout': {
                'text-field': ['get', store.state.shpPropertieName],
            },
            'paint': {
                'text-color': 'rgba(255, 0, 0, 1)',
                'text-halo-color': 'rgba(255,255,255,0.7)',
                'text-halo-width': 1.0,
            },
            'maxzoom': 24,
            'minzoom': 17
        });
    }

    // map.addLayer({
    //     id: fileExtension + '-polygon-points',
    //     type: 'circle',
    //     source: fileExtension + '-source',
    //     paint: {
    //         'circle-radius': 4,
    //         // 'circle-radius': [
    //         //     'interpolate', ['linear'], ['zoom'],
    //         //     15, 0,
    //         //     18, 4
    //         // ],
    //         'circle-color': '#f00',
    //     },
    //     filter: ['==', '$type', 'Polygon']
    // });
    if (isFitBounds) {
        const bounds = new maplibregl.LngLatBounds();
        geojson.features.forEach(feature => {
            const geometry = feature.geometry;
            if (!geometry) return;
            switch (geometry.type) {
                case 'Point':
                    bounds.extend(geometry.coordinates);
                    break;
                case 'LineString':
                    geometry.coordinates.forEach(coord => bounds.extend(coord));
                    break;
                case 'Polygon':
                    geometry.coordinates.flat().forEach(coord => bounds.extend(coord));
                    break;
                case 'MultiPolygon':
                    geometry.coordinates.flat(2).forEach(coord => bounds.extend(coord));
                    break;
            }
        });
        map.fitBounds(bounds, {
            padding: 50,
            animate: true
        });
    }
}

// 現在の表示範囲のGeoJSONを取得
function getVisibleGeoJSON(map, layerId) {
    const bounds = map.getBounds(); // 表示範囲を取得
    const features = map.queryRenderedFeatures(bounds, {
        layers: [layerId] // 適切なレイヤー名を指定
    });
    // GeoJSONを作成
    const geojson = {
        type: 'FeatureCollection',
        features: features.map(feature => feature.toJSON())
    };
    return geojson;
}

// GeoJSONをKMLに変換し、ダウンロード
export function downloadKML(map, layerId, drawGeojson, fields) {
    let geojson
    let chiban
    if (drawGeojson) {
        geojson = drawGeojson
    } else {
        geojson = getVisibleGeoJSON(map, layerId);
        geojson = extractHighlightedGeoJSONFromSource(geojson, layerId);
        if (fields) {
            geojson = dissolveGeoJSONByFields(geojson, fields)
            chiban = geojson.features[0].properties.chiban
        } else if (geojson.features[0].properties.地番) {
            geojson = dissolveGeoJSONByFields(geojson, ['地番'])
            chiban = '地番'
        } else {
            // ここを改修する。
            chiban = geojson.features[0].properties.chiban
        }
    }

    // GeoJSONをKMLに変換（スタイルを追加）
    const kml = tokml(geojson, {
        name: chiban, // KMLで名前に使うフィールド（GeoJSONのプロパティ名）
        documentName: 'Exported KML',
        documentDescription: 'This is an exported KML with styles.',
        simplestyle: true // 簡易スタイルを有効化
    });

    // スタイルの設定
    const styledKML = kml.replace(
        /<Placemark>/g,
        `<Placemark>
    <Style>
        <LineStyle>
            <color>ff000000</color> <!-- 黒色（ARGB形式で設定） -->
            <width>2</width> <!-- 枠線の太さ -->
        </LineStyle>
        <PolyStyle>
            <color>4d0000ff</color> <!-- 赤色 (30%透過; ARGB形式: AARRGGBB) -->
        </PolyStyle>
    </Style>`
    );

    // KMLファイルをダウンロード
    const blob = new Blob([styledKML], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const chibanAndHoka = getChibanAndHoka(geojson, false);
    if (drawGeojson) {
        a.download = 'draw.kml';
    } else if (chibanAndHoka.firstChiban) {
        const firstChiban = chibanAndHoka.firstChiban;
        const hoka = chibanAndHoka.hoka;
        a.download = firstChiban + hoka + '.kml';
    } else {
        a.download = geojson.features[0].properties[chiban] + '.kml';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function transformGeoJSONToEPSG4326(geojson) {
    // GeoJSONの各座標を変換
    const transformCoordinates = (coords) => {
        if (typeof coords[0] === "number" && typeof coords[1] === "number") {
            return proj4('EPSG:2450', 'EPSG:4326', coords);
            // return proj4(planeRectangularZone2, wgs84, coords);
        }
        return coords.map(transformCoordinates);
    };
    // GeoJSON全体を変換
    const transformedGeoJSON = {
        ...geojson,
        features: geojson.features.map((feature) => ({
            ...feature,
            geometry: {
                ...feature.geometry,
                coordinates: transformCoordinates(feature.geometry.coordinates),
            },
        })),
    };
    return transformedGeoJSON;
}

function geojsonToShapefile(geojson) {

    if (store.state.zahyokeiShape !== 'WGS84') {
        let zahyo
        for (const feature of geojson.features) {
            if (feature.properties && feature.properties.座標系) {
                console.log("Found Coordinate Property:", feature.properties.座標系);
                zahyo = feature.properties.座標系; // 最初に見つけた値を返す
            }
        }
        const code = zahyokei.find(item => item.kei === zahyo).code
        // GeoJSONの各座標を変換
        const transformCoordinates = (coords) => {
            if (typeof coords[0] === "number" && typeof coords[1] === "number") {
                return proj4('EPSG:4326', code, coords);
            }
            return coords.map(transformCoordinates);
        };
        // GeoJSON全体を変換
        geojson = {
            ...geojson,
            features: geojson.features.map((feature) => ({
                ...feature,
                geometry: {
                    ...feature.geometry,
                    coordinates: transformCoordinates(feature.geometry.coordinates),
                },
            })),
        };
    }

    const firstChiban = getChibanAndHoka(geojson).firstChiban
    const hoka = getChibanAndHoka(geojson).hoka
    // GeoJSONのプロパティを Shift_JIS に変換
    geojson = {
        type: geojson.type,
        features: geojson.features.map(feature => {
            const convertedProperties = {};
            Object.entries(feature.properties).forEach(([key, value]) => {
                // 列名（フィールド名）と値を Shift_JIS に変換
                const encodedKey = iconv.encode(key, "Shift_JIS").toString("binary");
                const encodedValue = typeof value === "string" ? iconv.encode(value, "Shift_JIS").toString("binary") : value;
                convertedProperties[encodedKey] = encodedValue;
            });
            return {
                ...feature,
                properties: convertedProperties
            };
        })
    };

    const options = {
        filename: firstChiban + hoka,
        outputType: "blob",
        compression: "DEFLATE",
        types: {
            point: "points",
            polygon: "polygons",
            polyline: "lines",
        },
    };
    shpwrite.download(geojson,options);
}

export const wsg84ToJgd = (coordinates) => {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    return proj4("EPSG:4326", code, coordinates);
};

export const wsg84ToJgdForGeojson = (geojson,code0) => {
    let code
    if (code0) {
        code = code0
    } else {
        code = zahyokei.find(item => item.kei === store.state.zahyokei).code;
    }
    const transformCoords = (coords) => {
        if (typeof coords[0] === 'number') {
            return proj4("EPSG:4326", code, coords);
        }
        return coords.map(transformCoords);
    };

    const transformed = JSON.parse(JSON.stringify(geojson)); // deep copy

    if (geojson.type === 'FeatureCollection') {
        transformed.features = geojson.features.map(feature => {
            return {
                ...feature,
                geometry: {
                    ...feature.geometry,
                    coordinates: transformCoords(feature.geometry.coordinates),
                },
            };
        });
    } else if (geojson.type === 'Feature') {
        transformed.geometry.coordinates = transformCoords(geojson.geometry.coordinates);
    } else if (geojson.coordinates) {
        transformed.coordinates = transformCoords(geojson.coordinates);
    }

    return transformed;
};

export async function userSimaSet(name, url, id, zahyokei, simaText, isFirst) {
    const map = store.state.map01;
    // try {
        if (!simaText) {
            const files = await Promise.all([fetchFile(url)]);
            const file = files[0];
            if (!file) {
                throw new Error("SIMAファイルがありません。");
            }
            // FileReaderをPromiseでラップ
            simaText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const arrayBuffer = event.target.result; // ArrayBufferとして読み込む
                        const text = new TextDecoder("shift-jis").decode(arrayBuffer); // Shift JISをUTF-8に変換
                        resolve(text);
                    } catch (error) {
                        reject(new Error(`エンコーディング変換エラー: ${error.message}`));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            });
        }
        if (isFirst) {
            let opacity
            if (store.state.simaTextForUser) {
                try {
                    opacity = JSON.parse(store.state.simaTextForUser).opacity
                }catch (e) {
                    opacity = store.state.simaTextForUser
                }
            } else {
                opacity = 0
            }
            store.state.simaTextForUser = JSON.stringify({
                text: simaText,
                opacity: opacity
            })
            store.state.simaOpacity = opacity
        }
        const geojson = simaToGeoJSON(simaText, map, zahyokei, false, true);
        return createSourceAndLayers(geojson);

    function createSourceAndLayers(geojson) {
        if (map.getLayer('oh-sima-' + id + '-' + name + '-layer')) {
            return null;
        }
        const sourceId = 'oh-sima-' + id + '-' + name + '-source';
        const source = {
            id: sourceId,
            obj: {
                type: 'geojson',
                data: geojson
            }
        };
        const polygonLayer = {
            id: 'oh-sima-' + id + '-' + name + '-polygon-layer',
            type: 'fill',
            source: sourceId,
            filter: ["==", "$type", "Polygon"],
            paint: {
                // 'fill-color': 'rgb(50,101,186)',
                'fill-color': 'rgba(0,0,0,0)',
                'fill-opacity': 0
            }
        };
        const lineLayer = {
            id: 'oh-sima-' + id + '-' + name + '-line-layer',
            type: 'line',
            source: sourceId,
            filter: ["==", "$type", "Polygon"],
            paint: {
                'line-color': '#000',
                'line-width': 2
            }
        };
        const labelLayer = {
            id: 'oh-sima-' + id + '-' + name + '-polygon-label-layer',
            type: 'symbol',
            source: sourceId,
            layout: {
                'text-field': ['get', 'chiban'],
            },
            paint: {
                'text-color': 'rgba(0, 0, 0, 1)',
                'text-halo-color': 'rgba(255,255,255,0.7)',
                'text-halo-width': 1.0
            },
            minzoom: 17,
            filter: ['==', '$type', 'Polygon']
        }
        const vertexLayer = {
            id: 'oh-sima-' + id + '-' + name + '-vertex-layer',
            type: 'circle',
            source: sourceId,
            paint: {
                'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    18, 4
                ],
                'circle-color': 'red',
            },
            filter: ['==', ['get', 'type'], 'vertex']
        };
        const pointLayer = {
            id: 'oh-sima-' + id + '-' + name + '-point-layer',
            type: 'circle',
            source: sourceId,
            paint: {
                // 'circle-radius': 6,
                'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    18, 3
                ],
                'circle-color': 'navy',
            },
            filter: ['==', ['get', 'type'], 'point']
        };
        const pointLabelLayer = {
            id: 'oh-sima-' + id + '-' + name + '-point-label-layer',
            type: 'symbol',
            source: sourceId,
            layout: {
                'text-field': ['get', 'chiban'],
                'text-offset': [0, 1.3], // ラベルを下にずらす
            },
            paint: {
                'text-color': 'rgba(0, 0, 0, 1)',
                'text-halo-color': 'rgba(255,255,255,0.7)',
                'text-halo-width': 1.0
            },
            minzoom: 14,
            filter: ['==', '$type', 'Point']
        }
        return { source, layers: [polygonLayer, lineLayer, labelLayer, vertexLayer, pointLayer, pointLabelLayer], geojson: geojson };
    }
}

export async function userKmzSet(name, url, id) {
    const map = store.state.map01;

    try {
        const files = await Promise.all([fetchFile(url)]);
        const zip = await JSZip.loadAsync(files[0]);
        const kmlFile = Object.keys(zip.files).find((name) => name.endsWith('.kml'));
        if (!kmlFile) {
            throw new Error("KML file not found in KMZ.");
        }
        const kmlText = await zip.files[kmlFile].async('text');
        const parser = new DOMParser();
        const kmlData = parser.parseFromString(kmlText, 'application/xml');
        const geojson = kml(kmlData);
        return createSourceAndLayers(geojson);
    } catch (error) {
        console.error("Error loading KMZ file:", error);
        return null;
    }

    function createSourceAndLayers(geojson) {
        if (map.getLayer('oh-kmz-' + id + '-' + name + '-layer')) {
            return null;
        }
        const sourceId = 'oh-kmz-' + id + '-' + name + '-source';
        const source = {
            id: sourceId,
            obj: {
                type: 'geojson',
                data: geojson
            }
        };
        const polygonLayer = {
            id: 'oh-kmz-' + id + '-' + name + 'polygon-layer',
            type: 'fill',
            source: sourceId,
            filter: ["==", "$type", "Polygon"],
            paint: {
                'fill-color': 'blue',
                'fill-opacity': 0.5
            }
        };
        const lineLayer = {
            id: 'oh-kmz-' + id + '-' + name + 'line-layer',
            type: 'line',
            source: sourceId,
            filter: ["==", "$type", "LineString"],
            paint: {
                'line-color': ['get', 'stroke'],
                'line-width': ["*", ["get", "stroke-width"], 2],
            }
        };
        return { source, layers: [polygonLayer, lineLayer], geojson: geojson };
    }
}

export function userXyztileSet(name,url,id,bbox,transparent) {
    const map = store.state.map01
    const bounds = [bbox[0], bbox[1], bbox[2], bbox[3]]
    if (map.getLayer('oh-vpstile-' + id + '-' + name + '-layer')) {
        map.getSource('oh-vpstile-' + id + '-' + name + '-source').setTiles([tile])
    }
    store.state.selectedLayers.map01 = store.state.selectedLayers.map01.filter(layer => layer.id !== 'oh-vpstile-' + id + '-' + name + '-layer')

    let tile = ''
    let source = null
    if (url.endsWith('.pmtiles')) {
        source = {
            id: 'oh-vpstile-' + id + '-' + name + '-source',obj: {
                type: 'raster',
                url: 'pmtiles://' + url,
                bounds: bounds,
                maxzoom: 26,
            }
        };
    } else {
        if (transparent !== 0) {
            tile = 'transparentBlack://' + url
        } else {
            tile = url
        }
        source = {
            id: 'oh-vpstile-' + id + '-' + name + '-source',obj: {
                type: 'raster',
                tiles: [tile],
                bounds: bounds,
                maxzoom: 26,
            }
        };
    }
    const layer = {
        id: 'oh-vpstile-' + id + '-' + name + '-layer',
        type: 'raster',
        source: 'oh-vpstile-' + id + '-' + name  + '-source',
    }

    store.state.selectedLayers.map01.unshift(
        {
            id: 'oh-vpstile-' + id + '-' + name + '-layer',
            label: name,
            source: source,
            layers: [layer],
            opacity: 1,
            visibility: true,
        }
    );
    if (bbox) {
        map.fitBounds([
            [bbox[0], bbox[1]], // minX, minY
            [bbox[2], bbox[3]]  // maxX, maxY
        ], { padding: 20, animate: false });
    }
}

export function userPmtile0Set(name, url, id, bbox, length, label) {
    const map = store.state.map01
    const sopurce = {
        id: 'oh-pmtiles-' + id + '-source',obj: {
            type: 'vector',
            url: "pmtiles://" + url
        }
    };
    const polygonLayer = {
        id: 'oh-pmtiles-' + id + '-layer',
        type: 'fill',
        source: 'oh-pmtiles-' + id + '-source',
        "source-layer": 'oh3',
        'paint': {
            'fill-color': 'rgba(0,0,0,0)',
        },
    }
    const lineLayer = {
        id: 'oh-pmtiles-' + id + '-line-layer',
        source: 'oh-pmtiles-' + id + '-source',
        type: 'line',
        "source-layer": "oh3",
        paint: {
            'line-color': 'blue',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                1, 0.1,
                16, 2
            ]
        },
    }
    let minZoom
    if (!length) {
        minZoom = 17
    } else if (length < 10000) {
        minZoom = 0
    } else {
        minZoom = 17
    }
    const labelLayer = {
        id: 'oh-pmtiles-' + id + '-label-layer',
        type: "symbol",
        source: 'oh-pmtiles-' + id + '-source',
        "source-layer": "oh3",
        layout: {
            'text-field': ['get', label],
            'text-offset': [
                'case',
                ['==', ['geometry-type'], 'Point'], ['literal', [0, 1.2]],  // ポイントは下にずらす
                ['literal', [0, 0]]  // ポリゴンなどはそのまま
            ]
        },
        paint: {
            'text-color': 'black',
            'text-halo-color': 'rgba(255,255,255,1)',
            'text-halo-width': 1.0,
        },
        // minzoom: minZoom
    };
    const pointLayer = {
        id: 'oh-pmtiles-' + id + '-point-layer',
        type: "circle",
        source: 'oh-pmtiles-' + id + '-source',
        filter: ["==", "$type", "Point"],
        "source-layer": "oh3",
        paint: {
            'circle-color': 'rgba(0,0,0,1)', // 赤色で中心点を強調
            'circle-radius': 8, // 固定サイズの点
            'circle-opacity': 1,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    };
    const vertexLayer = {
        id: 'oh-pmtiles-' + id + '-vertex-layer',
        type: "circle",
        source: 'oh-pmtiles-' + id + '-source',
        filter: ["==", "$type", "Polygon"],
        "source-layer": "oh3",
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                18,0
            ],
            'circle-color': 'red',
        }
    };
    const maps = [store.state.selectedLayers.map01, store.state.selectedLayers.map02]
    maps.forEach(map => {
        map.unshift(
            {
                id: 'oh-pmtiles-' + id + '-' + name + '-layer',
                label: name,
                source: sopurce,
                layers: [polygonLayer,lineLayer,labelLayer,vertexLayer,pointLayer],
                opacity: 1,
                visibility: true,
            }
        );
    })
    if (bbox) {
        map.fitBounds([
            [bbox[0], bbox[1]], // minX, minY
            [bbox[2], bbox[3]]  // maxX, maxY
        ], { padding: 20, animate: false  });
    }
}

export function userPmtileSet(name,url,id, chiban, bbox, length) {
    const map = store.state.map01
    const sopurce = {
        id: 'oh-chiban-' + id + '-' + name + '-source',obj: {
            type: 'vector',
            url: "pmtiles://" + url
        }
    };
    const polygonLayer = {
        id: 'oh-chiban-' + id + '-' + name + '-layer',
        type: 'fill',
        source: 'oh-chiban-' + id + '-' + name  + '-source',
        "source-layer": 'oh3',
        'paint': {
            'fill-color': 'rgba(0,0,0,0)',
        },
    }
    const lineLayer = {
        id: 'oh-chibanL-' + name + '-line-layer',
        source: 'oh-chiban-' + id + '-' + name + '-source',
        type: 'line',
        "source-layer": "oh3",
        paint: {
            'line-color': 'blue',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                1, 0.1,
                16, 2
            ]
        },
    }
    let minZoom
    if (!length) {
        minZoom = 17
    } else if (length < 10000) {
        minZoom = 0
    } else {
        minZoom = 17
    }
    // const labelLayer = {
    //     id: 'oh-chibanL-' + name + '-label-layer',
    //     type: "symbol",
    //     source: 'oh-chiban-' + id + '-' + name + '-source',
    //     "source-layer": "oh3",
    //     'layout': {
    //         'text-field': ['get', chiban],
    //         'text-font': ['NotoSansJP-Regular'],
    //     },
    //     'paint': {
    //         'text-color': 'navy',
    //         'text-halo-color': 'rgba(255,255,255,1)',
    //         'text-halo-width': 1.0,
    //     },
    //     'minzoom': minZoom
    // }
    const labelLayer = {
        id: 'oh-chibanL-' + name + '-label-layer',
        type: "symbol",
        source: 'oh-chiban-' + id + '-' + name + '-source',
        "source-layer": "oh3",
        layout: {
            'text-field': ['get', chiban],
            'text-font': ['NotoSansJP-Regular'],
            'text-offset': [
                'case',
                ['==', ['geometry-type'], 'Point'], ['literal', [0, 1.2]],  // ポイントは下にずらす
                ['literal', [0, 0]]  // ポリゴンなどはそのまま
            ]
        },
        paint: {
            'text-color': 'navy',
            'text-halo-color': 'rgba(255,255,255,1)',
            'text-halo-width': 1.0,
        },
        minzoom: minZoom
    };
    const pointLayer = {
        id: 'oh-chibanL-' + name + '-point-layer',
        type: "circle",
        source: 'oh-chiban-' + id + '-' + name + '-source',
        filter: ["==", "$type", "Point"],
        "source-layer": "oh3",
        paint: {
            'circle-color': 'rgba(255,0,0,1)', // 赤色で中心点を強調
            'circle-radius': 5, // 固定サイズの点
            'circle-opacity': 1,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    };
    const vertexLayer = {
        id: 'oh-chibanL-' + name + '-vertex-layer',
        type: "circle",
        source: 'oh-chiban-' + id + '-' + name + '-source',
        filter: ["==", "$type", "Polygon"],
        "source-layer": "oh3",
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                18,4
            ],
            'circle-color': 'red',
        }
    };
    const maps = [store.state.selectedLayers.map01, store.state.selectedLayers.map02]
    maps.forEach(map => {
        map.unshift(
            {
                id: 'oh-chiban-' + id + '-' + name + '-layer',
                label: name,
                source: sopurce,
                layers: [polygonLayer,lineLayer,labelLayer,vertexLayer,pointLayer],
                opacity: 1,
                visibility: true,
                ext: {name:'ext-chibanzu'}
            }
        );
    })

    if (bbox) {
        map.fitBounds([
            [bbox[0], bbox[1]], // minX, minY
            [bbox[2], bbox[3]]  // maxX, maxY
        ], { padding: 20, animate: false  });
    }

    // setTimeout(() => {
    //     console.log(map.getStyle().layers)
    //     const targetLayers = map.getStyle().layers
    //         .filter(layer => layer.id.startsWith('oh-chiban-') && !registeredLayers.has(layer.id))
    //         .map(layer => layer.id);
    //     console.log(targetLayers)
    //     targetLayers.forEach(layer => {
    //         console.log(`Adding click event to layer: ${layer}`);
    //         map.on('click', layer, (e) => {
    //             if (e.features && e.features.length > 0) {
    //                 const targetId = `${e.features[0].properties['oh3id']}`;
    //                 console.log('Clicked ID', targetId);
    //                 if (store.state.highlightedChibans.has(targetId)) {
    //                     // すでに選択されている場合は解除
    //                     store.state.highlightedChibans.delete(targetId);
    //                 } else {
    //                     // 新しいIDを追加
    //                     // alert(targetId)
    //                     store.state.highlightedChibans.add(targetId);
    //                     // alert(Array.from(store.state.highlightedChibans))
    //                 }
    //                 highlightSpecificFeaturesCity(map, layer);
    //             }
    //         });
    //     });
    // },100)
    // const registeredLayers = new Set();
}

export function userTileSet(name,url,id) {
    let sopurce
    if (url.includes('{-y}')) {
        url = url.replace(/{-y}/,'{y}')
        sopurce = {
            id: name + '-source',obj: {
                type: 'raster',
                tiles: [url],
                scheme: 'tms',
            }
        }
    } else {
        sopurce = {
            id: name + '-source',obj: {
                type: 'raster',
                tiles: [url],
            }
        }
    }

    const layer = {
        id: 'oh-' + name + '-layer',
        type: 'raster',
        source: name + '-source',
    }

    store.state.selectedLayers.map01.unshift(
        {
            id: 'oh-usertile-' + id + '-' + name + '-layer',
            label: name,
            source: sopurce,
            layers: [layer],
            opacity: 1,
            visibility: true,
        }
    );
}

export async function pmtilesGenerate(geojsonObj, layerName, label, file) {
    // PMTilesデータ登録用のヘルパー関数。成功時に response.data.id を返す。
    async function insertPmtilesData(uid, layerName, url, url2, label, bbox, length, nickname, propnames) {
        try {
            const response = await axios.post(
                'https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtiles0Insert.php',
                new URLSearchParams({
                    uid,
                    name: layerName,
                    url,
                    url2,
                    label,
                    bbox: JSON.stringify(bbox),
                    length,
                    nickname,
                    propnames
                })
            );

            if (response.data.error) {
                console.error('エラー:', response.data.error);
                alert(`エラー: ${response.data.error}`);
                return null;  // エラー時は null を返す
            } else {
                console.log('登録成功:', response.data);
                userPmtile0Set(layerName, url, response.data.id, bbox, length, label);
                store.state.fetchImagesFire = !store.state.fetchImagesFire;
                return response.data.id;  // ← 登録された ID を返す
            }
        } catch (error) {
            console.error('通信エラー:', error);
            return null;  // 通信エラー時も null を返す
        }
    }

    // ローディング表示開始
    store.state.loading2 = true;
    store.state.loadingMessage = 'アップロード中です。';
    console.log('geojson送信前の中身:', geojsonObj);

    // フォームデータ作成
    const formData = new FormData();
    formData.append('dir', store.state.userId);
    if (file) {
        formData.append('geojson', file, file.name);
    } else {
        const geojsonBlob = new Blob([JSON.stringify(geojsonObj)], { type: 'application/json' });
        formData.append('geojson', geojsonBlob, 'data.geojson');
    }
    formData.append('maximum', store.state.pmtilesMaximum);

    // PMTiles生成リクエスト
    const response = await fetch('https://kenzkenz.net/myphp/generate_pmtiles.php', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        store.state.loading2 = false;
        alert('サーバーエラーが発生しました: ' + response.statusText);
        return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = null;
    let buffer = '';

    // SSE ストリーム処理
    async function processStream() {
        for await (const chunk of streamAsyncIterator(reader)) {
            buffer += decoder.decode(chunk, { stream: true });
            while (buffer.includes('\n\n')) {
                const index = buffer.indexOf('\n\n');
                const event = buffer.substring(0, index);
                buffer = buffer.substring(index + 2);

                if (event.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(event.substring(6));
                        if (data.log) {
                            // ログ表示更新（プログレスパーセント等）
                            const lines = data.log.trim().split(/\r?\n/).reverse();
                            const targetLine = (lines.find(line => line.includes('%')) || '').slice(0, 20);
                            store.state.loadingMessage = targetLine;
                        } else if (data.error) {
                            store.state.loading2 = false;
                            alert('タイル生成に失敗しました！' + data.error);
                            return null;
                        } else if (data.success) {
                            result = data;
                        }
                    } catch (e) {
                        console.error('JSONパースエラー:', event);
                    }
                }
            }
        }

        // 最終バッファ処理
        if (buffer.startsWith('data: ')) {
            try {
                const data = JSON.parse(buffer.substring(6));
                if (data.success) result = data;
                else if (data.error) {
                    alert('タイル生成に失敗しました！' + data.error);
                    return null;
                }
            } catch (e) {
                console.error('最終バッファパースエラー:', buffer);
            }
        }

        // 成功レスポンス後の登録処理
        if (result && result.success) {
            store.state.loading2 = false;
            console.log('PMTiles生成結果:', result);
            const webUrl = 'https://kenzkenz.net/' + result.pmtiles_file.replace('/var/www/html/public_html/', '');

            // PMTilesデータを DB に挿入し、ID を取得
            const insertedId = await insertPmtilesData(
                store.state.userId,
                layerName,
                webUrl,
                result.pmtiles_file,
                label,
                result.bbox,
                result.length,
                store.state.myNickname,
                JSON.stringify(store.state.propnames)
            );
            console.log('pmtiles作成完了, 登録ID:', insertedId);

            if (!result.bbox) {
                alert('座標系が間違えているかもしれません。EPSG:4326 にしてください。');
            }

            return insertedId;  // ← processStream が ID を返す
        } else {
            store.state.loading2 = false;
            alert('タイル生成に失敗しました！');
            return null;
        }
    }

    // ReadableStream を非同期イテレータ化
    async function* streamAsyncIterator(reader) {
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) return;
                yield value;
            }
        } finally {
            reader.releaseLock();
        }
    }

    // ストリーム処理開始と ID の返却
    try {
        const id = await processStream();  // ← ここで ID を受け取る
        return id;  // ← pmtilesGenerate 自体が ID を返す
    } catch (error) {
        console.error('ストリーム処理エラー:', error);
        store.state.loadingMessage = 'ログ取得に失敗しましたが、このまま実行します。';
        throw error;
    }
}



export async function pmtilesGenerateForUser2 (geojson,bbox,chiban,prefcode,citycode,selectedPublic,selectedKaiji2,file) {
    async function insertPmtilesData(uid, name, url, url2,  chiban, bbox, length, prefcode, citycode,selectedKaiji2,nickname) {
        try {
            const prefCode = String(Number(prefcode)).padStart(2, '0')
            let result = Object.entries(muni).find(([key, _]) => {
                if (key.padStart(5, '0').slice(0,2) === prefCode) {
                    return key
                }
            });
            const prefName = result[1].split(',')[1]
            const cityCode = String(Number(citycode)).padStart(5, '0')
            result = Object.entries(muni).find(([key, _]) => {
                if (key.padStart(5, '0') === cityCode) {
                    return key
                }
            });
            const cityName = result[1].split(',')[3]
            const public0 = selectedPublic
            if (Number(selectedPublic) > 0) {
                // alert(Number(selectedPublic))
                publicChk (0,Number(selectedPublic))
            }
            const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesInsert.php', new URLSearchParams({
                uid: uid,
                name: name,
                url: url,
                url2: url2,
                chiban: chiban,
                bbox: JSON.stringify(bbox),
                length: length,
                prefcode: prefcode,
                citycode: citycode,
                prefname: prefName,
                cityname: cityName,
                public: public0,
                kaiji2: Number(selectedKaiji2),
                nickname: nickname
            }));
            if (response.data.error) {
                console.error('エラー:', response.data.error);
                alert(`エラー: ${response.data.error}`);
            } else {
                console.log('登録成功:', response.data);
                publicChk()
                userPmtileSet(name,url,response.data.id, chiban, bbox, length)
                store.state.fetchImagesFire = !store.state.fetchImagesFire
            }
        } catch (error) {
            console.error('通信エラー:', error);
        }
    }
    // -------------------------------------------------------------------------------------------------
    store.state.loading2 = true
    store.state.loadingMessage = 'アップロード中です。'
    console.log("geojson送信前の中身:", geojson);
    console.log(file)
    console.log(store.state.userId)

    const formData = new FormData();
    formData.append("geojson", file, file.name);
    formData.append("dir", store.state.userId);
    formData.append("chiban", chiban);

    const response = await fetch("https://kenzkenz.net/myphp/generate_pmtiles7.php", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        store.state.loading2 = false;
        alert("サーバーエラーが発生しました: " + response.statusText);
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = null;
    let buffer = '';

    async function processStream() {
        for await (const chunk of streamAsyncIterator(reader)) {
            buffer += decoder.decode(chunk, { stream: true });
            // SSEイベントを即座に処理
            while (buffer.includes('\n\n')) {
                const index = buffer.indexOf('\n\n');
                const event = buffer.substring(0, index);
                buffer = buffer.substring(index + 2);

                if (event.startsWith('data: ')) {
                    try {
                        const jsonStr = event.substring(6); // 'data: 'を削除
                        const data = JSON.parse(jsonStr);
                        if (data.log) {
                            // ログを一行ずつリアルタイムで表示
                            // console.log(data.is_error ? `[ERROR] ${data.log}` : data.log);
                            // 行単位に分割して後ろから走査
                            const lines = data.log.trim().split(/\r?\n/).reverse();
                            let targetLine = lines.find(line => line.includes('%'));
                            targetLine = targetLine.slice(0, 20);
                            store.state.loadingMessage = targetLine
                        } else if (data.error) {
                            console.log("エラー:", data);
                            store.state.loading2 = false;
                            alert("タイル生成に失敗しました！" + data.error);
                            return;
                        } else if (data.success) {
                            result = data;
                        }
                    } catch (e) {
                        console.error("JSONパースエラー:", event);
                        // store.state.loadingMessage = event.substring(6).slice(0, 45)
                        store.state.loadingMessage = JSON.parse(event.substring(6)).log.slice(0, 45)
                    }
                }
            }
        }

        // バッファに残ったデータがあれば処理
        if (buffer.startsWith('data: ')) {
            try {
                const jsonStr = buffer.substring(6);
                const data = JSON.parse(jsonStr);
                if (data.success) result = data;
                else if (data.error) {
                    console.log("エラー:", data);
                    store.state.loading2 = false;
                    alert("タイル生成に失敗しました！" + data.error);
                    return;
                }
            } catch (e) {
                console.error("最終バッファパースエラー:", buffer);
            }
        }

        // 最終レスポンスを処理
        if (result && result.success) {
            store.state.loading2 = false;
            console.log(result);
            const webUrl = 'https://kenzkenz.net/' + result.pmtiles_file.replace('/var/www/html/public_html/', '');
            console.log(result.pmtiles_file);
            console.log(store.state.myNickname)
            insertPmtilesData(
                store.state.userId,
                store.state.pmtilesName,
                webUrl,
                result.pmtiles_file,
                store.state.pmtilesPropertieName,
                result.bbox,
                result.length,
                prefcode,
                citycode,
                selectedKaiji2,
                store.state.myNickname
            );
            console.log('pmtiles作成完了');
            if (!result.bbox) {
                alert('座標系が間違えているかもしれません。geojson化するときはEPSG:4326に設定してください。');
            }
        } else {
            console.log("成功レスポンスがありません");
            store.state.loading2 = false;
            alert("タイル生成に失敗しました！");
        }
    }

    // ReadableStreamを非同期イテレータとして処理
    async function* streamAsyncIterator(reader) {
        try {
            let done, value;
            do {
                ({ done, value } = await reader.read());
                if (done) return;
                yield value;
            } while (!done);
        } finally {
            reader.releaseLock();
        }
    }

    // ストリーム処理を開始
    processStream().catch(error => {
        console.error("ストリーム処理エラー:", error);
        // store.state.loading2 = false;
        // alert("ストリーム処理に失敗しました！");
        store.state.loadingMessage = 'ログ取得に失敗しましたが、このまま実行します。ブラウザを閉じないでください。'
    });
}

export function saveDxfForChiriin (map,layerIds) {
    function getGeoJSONFromLayers(map, layerIds) {
        let allFeatures = [];
        layerIds.forEach(layerId => {
            const bounds = map.getBounds(); // 表示範囲を取得
            const features = map.queryRenderedFeatures(bounds, {
                layers: [layerId] // 適切なレイヤー名を指定
            });
            if (features.length > 0) {
                allFeatures = allFeatures.concat(features);
            }
        });
        return {
            "type": "FeatureCollection",
            "features": allFeatures
        };
    }
    const geojson = wsg84ToJgdForGeojson(getGeoJSONFromLayers(map, layerIds))
    try {
        const dxfString = geojsonToDXF(geojson);
        // DXFファイルとしてダウンロード
        const blob = new Blob([dxfString], { type: 'application/dxf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'vector.dxf';
        link.click();
    } catch (error) {
        console.error('GeoJSONの解析中にエラーが発生しました:', error);
        alert('有効なGeoJSONを入力してください。');
    }
}

export async function iko() {
    async function insert (uid,name,url,url2,url3,bbox) {
        const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileInsert.php', new URLSearchParams({
            uid: uid,
            name: name,
            url: url,
            url2: url2,
            url3: url3,
            bbox: bbox
        }));
        if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
        } else {
            console.log('登録成功:', response.data);
            // store.state.fetchImagesFire = !store.state.fetchImagesFire
        }
    }

    store.state.loading2 = true
    store.state.loadingMessage = ''
    let response = await fetch("https://kenzkenz.net/myphp/iko.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    let result = await response.json();

    if (result.success) {
        store.state.loading2 = false
        console.log(result)
        result.directories.forEach(directorie => {
            const webUrl = 'https://kenzkenz.net/' + directorie.path.replace('/var/www/html/public_html/','') + '/{z}/{x}/{y}.png'
            const thumbnail = 'thumbnail'
            insert (directorie.uid,directorie.fileName,webUrl,directorie.path,thumbnail,'[' + directorie.bounds + ']')
        })
        alert("登録成功！");
    } else {
        console.log(result)
        store.state.loading2 = false
        alert("失敗しました！");
    }
}

export function scrollForAndroid (className) {
    if (store.state.isAndroid) {
        // alert('テスト２')
        let startY;
        let isTouching = false;
        let currentTarget = null;
        let initialScrollTop = 0;
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest(className);
            if (target) {
                startY = e.touches[0].clientY; // タッチ開始位置を記録
                initialScrollTop = target.scrollTop; // 初期スクロール位置を記録
                isTouching = true;
                currentTarget = target;
                target.style.overflowY = 'auto'; // スクロールを強制的に有効化
                target.style.touchAction = 'manipulation';
                // **イベント伝播を防ぐ**
                e.stopPropagation();
            }
        }, {passive: true, capture: true});

        // タッチ移動時の処理
        document.addEventListener('touchmove', (e) => {
            if (!isTouching || !currentTarget) return; // タッチが開始されていなければ処理しない
            const moveY = e.touches[0].clientY;
            const deltaY = startY - moveY; // 移動量を計算
            // スクロール位置を更新
            currentTarget.scrollTop += deltaY;
            startY = moveY; // 開始位置を現在の位置に更新
            // **Android でスクロールが無視されないようにする**
            e.preventDefault();
            e.stopPropagation();

        }, {passive: true, capture: true});

        // タッチ終了時の処理
        document.addEventListener('touchend', () => {
            if (currentTarget) {
                currentTarget.style.overflowY = ''; // スクロール設定をリセット
            }
            currentTarget = null; // 現在のターゲットをリセット
            isTouching = false; // タッチ中フラグをOFF
            initialScrollTop = 0; // 初期スクロール位置をリセット
        });
    }
}

export function getLayersById(map, targetId) {
    const mapName = map.getContainer().id
    // `map01` の配列を検索
    const mapEntry = store.state.selectedLayers[mapName].find(entry => entry.id === targetId);
    // 対応するエントリがあれば layers を返し、なければ null
    return mapEntry ? mapEntry.layers : null;
}

export function getParentIdByLayerId(targetLayerId) {
    const data = store.state.selectedLayers
    for (const mapKey in data) {
        for (const item of data[mapKey]) {
            if (item.layers.some(layer => layer.id === targetLayerId)) {
                return item.id;
            }
        }
    }
    return null;
}

export const labelTextFieldInMeters = [
    'concat',
    ['to-string', ['get', 'distance']],
    ' m',
    [
        'case',
        ['==', ['get', 'total'], 0],
        '',
        ['concat', '\n(', ['to-string', ['get', 'total']], ' m', ')']
    ],
    [
        'case',
        ['all', ['has', 'elevation'], ['>', ['get', 'elevation'], 0]],
        ['concat', '\nAlt. ', ['to-string', ['floor', ['get', 'elevation']]], ' m'],
        ''
    ]
];

export const labelTextFieldInCentimeters = [
    'concat',
    // ['/', ['round', ['*', ['*', ['get', 'distance'], 1000], 100]], 100],
    ['get', 'distance'],
    ' m',
    [
        'case',
        ['==', ['get', 'total'], 0],
        '',
        // ['concat', '\n(', ['/', ['round',  ['*', ['*', ['get', 'total'], 1000], 100]], 100], ' m', ')'],
        ['concat', '\n(', ['/', ['get', 'total'], ' m', ')']]
    ],
    [//未修正
        'case',
        ['all', ['has', 'elevation'], ['>', ['get', 'elevation'], 0]],
        ['concat', '\nAlt. ', ['to-string', ['floor', ['get', 'elevation']]], ' m'],
        ''
    ]
];

export function updateMeasureUnit(unit) {
    // let textField
    // if (unit === 'm') {
    //     textField = labelTextFieldInCentimeters
    // }
    // const maps = [store.state.map01,store.state.map02]
    // maps.forEach(map => {
    //     map.setLayoutProperty(
    //         'terradraw-measure-line-label',
    //         'text-field',
    //         textField
    //     );
    //     // map.setPaintProperty('td-linestring', 'line-color', 'dodgerblue')
    //     // map.setPaintProperty('td-polygon-outline', 'line-color', 'dodgerblue')
    // })
}
export function publicChk (id,public0) {
    store.state.loading2 = true
    store.state.loadingMessage = '全国地番図公開マップ作成中です。'
    axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesUpdatePublic.php',{
        params: {
            id: id,
            public: public0
        }
    }).then(function (response) {
        axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userChibanzumapUpdate.php',{
            params: {}
        }).then(function (response) {
            async function aaa () {
                const abc = await loadColorData()
                const chibanzuColors = abc.colorMap
                const isNew = abc.isNew
                const maps = [store.state.map01,store.state.map02]
                maps.forEach(map => {
                    map.setPaintProperty('oh-city-geojson-poligon-layer', 'fill-color', [
                        'case',
                        ...Object.entries(chibanzuColors).flatMap(([key, color]) => ([
                            ['==', ['to-number', ['get', 'N03_007']], Number(key)], color
                        ])),
                        'rgba(0,0,0,0)' // デフォルト色
                    ]);

                    const newCodes = Object.keys(isNew).filter(k => isNew[k] === 1);

                    const newLabelColorOnRed = '#39ff14';
                    const newHaloColorOnRed  = '#000';

                    const newLabelColor = '#fff600';    // 普段のNEW（蛍光イエロー）
                    const newHaloColor  = '#ff00cc';    // 普段のNEW（蛍光ピンク）

                    // 蛍光色・NEW表示のcase式を生成
                    const caseTextField = [
                        'case',
                        ...newCodes.flatMap(code => [
                            ['==', ['get', 'N03_007'], code], ['concat', 'NEW\n', ['get', 'N03_004']]
                        ]),
                        ['get', 'N03_004'] // デフォルト: 市区町村名
                    ];
                    const caseTextColor = [
                        'case',
                        ...Object.entries(chibanzuColors).flatMap(([code, color]) => {
                            if (newCodes.includes(code)) {
                                if (color === "rgba(255,0,0,0.8)") {
                                    // NEW かつ 赤背景
                                    return [['==', ['get', 'N03_007'], code], newLabelColorOnRed];
                                } else {
                                    // NEW かつ 非赤背景
                                    return [['==', ['get', 'N03_007'], code], newLabelColor];
                                }
                            }
                            return [];
                        }),
                        '#000' // デフォルト
                    ];

                    const caseTextHaloColor = [
                        'case',
                        ...Object.entries(chibanzuColors).flatMap(([code, color]) => {
                            if (newCodes.includes(code)) {
                                if (color === "rgba(255,0,0,0.8)") {
                                    // NEW かつ 赤背景
                                    return [['==', ['get', 'N03_007'], code], newHaloColorOnRed];
                                } else {
                                    // NEW かつ 非赤背景
                                    return [['==', ['get', 'N03_007'], code], newHaloColor];
                                }
                            }
                            return [];
                        }),
                        '#fff' // デフォルト
                    ];
                    map.setLayoutProperty('oh-city-geojson-label-layer', 'text-field', caseTextField)
                    map.setPaintProperty('oh-city-geojson-label-layer', 'text-color', caseTextColor)
                    map.setPaintProperty('oh-city-geojson-label-layer', 'text-halo-color', caseTextHaloColor)
                    // ん？下が効いていないようだ。
                    map.setLayoutProperty('oh-city-geojson-label-layer2', 'text-field', caseTextField)
                    map.setPaintProperty('oh-city-geojson-label-layer2', 'text-color', caseTextColor)
                    map.setPaintProperty('oh-city-geojson-label-layer2', 'text-halo-color', caseTextHaloColor)
                })
                store.state.loading2 = false
            }
            aaa()
        })
    })
}

export async function convertGeoJSON(geojson,code) {
    try {

        let scale
        if (store.state.cad === 'jww') {
            scale = 1000
        } else {
            scale = 1
        }
        console.log(geojson)
        // リクエストボディにGeoJSONとスケール値を含める
        const requestBody = {
            geojson: geojson,
            scale: scale
        };

        const response = await fetch('https://kenzkenz.net/myphp/geojsonToDxf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // body: JSON.stringify(geojson) // オブジェクトを文字列に変換
            body: JSON.stringify(requestBody) // オブジェクトを文字列に変換
        });

        console.log(response)
        if (!response.ok) {
            alert(99)
            const errorData = await response.json();
            throw new Error(errorData.error || 'サーバーエラー');
        }

        // DXFファイルとしてダウンロード
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);

        const firstChiban = getChibanAndHoka(geojson,true).firstChiban
        const hoka = getChibanAndHoka(geojson,true).hoka
        const kei = getKeiByCode(code)
        link.download = kei + firstChiban + hoka + '.dxf';
        link.click();

    } catch (error) {
        alert('失敗！')
        console.log(`エラー: ${error.message}`)
    }
}

export function selectAll (map) {
    const visibleFeatures = map.queryRenderedFeatures({
        layers: ['oh-homusyo-2025-polygon']
    });
    const uniqueVisibleFeatures = Array.from(new Set(visibleFeatures.map(f => f.id)))
        .map(id => visibleFeatures.find(f => f.id === id));
    uniqueVisibleFeatures.forEach(f => {
        const targetId = `${f.properties['筆ID']}_${f.properties['地番']}`;
        store.state.highlightedChibans.add(targetId);
    })
    highlightSpecificFeatures2025(map,'oh-homusyo-2025-polygon');
}

export async function extractFirstFeaturePropertiesAndCheckCRS(file) {
    const chunkSize = 1024 * 1024; // 1MB
    let offset = 0;
    let foundProperties = false;
    let properties = null;
    let buffer = '';
    let checkedCRS = false;

    while (!foundProperties && offset < file.size) {
        const blob = file.slice(offset, offset + chunkSize);
        const text = await blob.text();
        buffer += text; // チャンクをバッファに追加

        // CRSフィールドがあれば最優先でチェック
        if (!checkedCRS) {
            const crsMatch = buffer.match(/"crs"\s*:\s*{[^}]*"properties"\s*:\s*{([^}]*)}/);
            if (crsMatch) {
                const props = crsMatch[1];
                // nameまたはcodeを抽出
                const nameMatch = props.match(/"name"\s*:\s*"([^"]+)"/);
                const codeMatch = props.match(/"code"\s*:\s*(\d+)/);
                if (
                    (nameMatch && nameMatch[1] !== 'urn:ogc:def:crs:OGC:1.3:CRS84' && nameMatch[1] !== 'EPSG:4326') ||
                    (codeMatch && codeMatch[1] !== '4326')
                ) {
                    alert("座標系が違います！\nこのGeoJSONはEPSG:4326ではありません。処理を中止します。\nEPSG:4326で作成してください。");
                    throw new Error("Not EPSG:4326");
                }
                checkedCRS = true;
            }
        }

        // featuresが出てきたら座標値をざっくり検査
        const featuresIndex = buffer.indexOf('"features"');
        if (featuresIndex !== -1 && !checkedCRS) {
            // coordinatesをざっくりサーチ
            const coordMatch = buffer.slice(featuresIndex).match(/"coordinates"\s*:\s*\[([^\]]+)\]/);
            if (coordMatch) {
                const nums = coordMatch[1].split(",").map(s => parseFloat(s.trim()));
                if (nums.length >= 2) {
                    const lon = nums[0], lat = nums[1];
                    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
                        alert("座標値がEPSG:4326（経度緯度）として不正です。処理を中止します。");
                        throw new Error("Coordinates out of range for EPSG:4326");
                    }
                }
                checkedCRS = true;
            }
        }

        // 最初のpropertiesを取得
        const propertiesMatch = buffer.slice(featuresIndex >= 0 ? featuresIndex : 0).match(/"properties"\s*:\s*{([^}]*)}/);
        if (propertiesMatch) {
            // propertiesをJSONとしてパース
            const propertiesStr = `{${propertiesMatch[1]}}`;
            try {
                properties = JSON.parse(propertiesStr);
                foundProperties = true;
            } catch (err) {
                throw new Error('プロパティのパースに失敗しました');
            }
        }
        offset += chunkSize;
    }
    if (!foundProperties) {
        throw new Error('GeoJSONにプロパティが見つかりませんでした');
    }
    return Object.keys(properties);
}
// アドレス、住所
export async function LngLatToAddress(lng, lat) {
    try {
        const response = await axios.get('https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress', {
            params: {
                lon: lng,
                lat: lat
            }
        });
        if (response.data.results) {
            const splitMuni = muni[Number(response.data.results.muniCd)].split(',');
            return splitMuni[1] + splitMuni[3] + response.data.results.lv01Nm;
        } else {
            return null;
        }
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function findLayerById(map, targetId) {
    const mapDivName = map?._container?.id
    const layers = store.state.selectedLayers[mapDivName];
    if (!layers) return null;

    for (const layer of layers) {
        if (layer.id === targetId) {
            return layer;
        }
    }
    return null; // 見つからなかった場合
}

export function dxfToGeoJSON(dxf) {
    const features = [];
    dxf.entities.forEach((entity) => {
        if (entity.type === 'LINE') {
            const start = entity.start || entity.vertices?.[0];
            const end = entity.end || entity.vertices?.[1];
            if (start && end) {
                features.push(
                    turf.lineString([
                        transformCoordinates([start.x, start.y]),
                        transformCoordinates([end.x, end.y]),
                    ], { ...entity }) // ← ここ
                );
            }
        } else if (entity.type === 'POINT') {
            const pos = entity.position || entity;
            if (pos.x !== undefined && pos.y !== undefined) {
                features.push(
                    turf.point(
                        transformCoordinates([pos.x, pos.y]),
                        { ...entity }
                    )
                );
            }
        } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
            if (entity.vertices && entity.vertices.length > 1) {
                const coordinates = entity.vertices.map(vertex => transformCoordinates([vertex.x, vertex.y]));
                features.push(
                    turf.lineString(coordinates, { ...entity })
                );
            }
        } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
            const pos = entity.position || entity.startPoint || entity;
            if (pos.x !== undefined && pos.y !== undefined) {
                features.push(
                    turf.point(
                        transformCoordinates([pos.x, pos.y]),
                        { ...entity }
                    )
                );
            }
        }
        // 必要ならCIRCLE, ARC, ELLIPSEなども同様に
    });
    return {
        type: 'FeatureCollection',
        features,
    };
}

export function extractSimaById(simaText, targetIds) {
    if (!Array.isArray(targetIds)) targetIds = [targetIds].map(String);
    else targetIds = targetIds.map(String);

    const lines = simaText.split(/\r?\n/);

    // 1. 全B01の点IDセット
    const b01PointSet = new Set();
    // D00ブロック内容保持
    const blockMap = {};
    let inBlock = false, curBlock = [], curId = null;
    for (const line of lines) {
        if (line.startsWith('B01,')) {
            b01PointSet.add(line.split(',')[1]);
        }
        if (line.startsWith('D00,')) {
            inBlock = true; curBlock = [line]; curId = line.split(',')[1];
        } else if (line.startsWith('D99')) {
            if (inBlock && curId) {
                curBlock.push(line);
                blockMap[curId] = [...curBlock];
            }
            inBlock = false; curBlock = []; curId = null;
        } else if (inBlock) {
            curBlock.push(line);
        }
    }

    // 2. ポリゴンで参照されてる点ID（B01が属するD00がtargetIdのもののみ）
    const usedA01Ids = new Set();
    for (const id of targetIds) {
        const block = blockMap[id];
        if (block) {
            for (const l of block) {
                if (l.startsWith('B01,')) usedA01Ids.add(l.split(',')[1]);
            }
        }
    }

    // 3. ポイントA01: B01に1度も出ず、A01だけでtargetIdに該当するもの
    //    例：A01,16,... で16がB01に出てこないもの
    const pointIdSet = new Set(
        targetIds.filter(id => !b01PointSet.has(id))
    );

    // 4. 出力判定
    let inTargetBlock = false;
    let targetBlockId = null;
    const output = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // G00, Z00, A00, A99,END,, はそのまま残す
        if (
            line.startsWith('G00,') ||
            line.startsWith('Z00,') ||
            line.startsWith('A00') ||
            (line === 'A99') ||
            (line === 'A99,END,,')
        ) {
            output.push(line);
            continue;
        }

        // A01は「ポイントとして抽出すべきもの」または「usedA01Idsに含まれるもの」だけ残す
        if (line.startsWith('A01,')) {
            const ptId = line.split(',')[1];
            if (pointIdSet.has(ptId) || usedA01Ids.has(ptId)) {
                output.push(line);
            }
            continue;
        }

        // D00（targetIdsのみ残す）→以降D99まで残す
        if (line.startsWith('D00,')) {
            const id = line.split(',')[1];
            if (targetIds.includes(id)) {
                inTargetBlock = true;
                targetBlockId = id;
                output.push(line);
            } else {
                inTargetBlock = false;
                targetBlockId = null;
            }
            continue;
        }
        // D99（今inTargetBlock中なら残す）
        if (line.startsWith('D99')) {
            if (inTargetBlock) output.push(line);
            inTargetBlock = false;
            targetBlockId = null;
            continue;
        }
        // D00～D99間（targetBlockのみ出力）
        if (inTargetBlock) {
            output.push(line);
            continue;
        }
        // それ以外（B01など）は全消去
    }

    return output.join('\n');
}
/**
 * Vuex store.state.map01 上の click-circle-source に対し、
 * lassoSelected=true な地物群を重心まわりに拡大縮小および回転して更新します。
 *
 * @param {number} scalePercent - 拡大縮小率（100で元サイズ、>100で拡大、<100で縮小）
 * @param {number} rotationDeg - 回転角度（度単位、正で時計回り）
 */

export function scaleAndRotateLassoSelected(scalePercent, rotationDeg) {
    const scaleFactor = scalePercent / 100;
    const map = store.state.map01;
    const src = map.getSource('click-circle-source');
    const allFeatures = (src._data && src._data.features) || [];

    // lassoSelected = true のフィーチャのみ
    const selected = allFeatures.filter(f => f.properties.lassoSelected === true);
    if (selected.length === 0) {
        console.info('選択されたフィーチャがありません');
        return;
    }

    // ストアにあるオリジナル GeoJSON から、元形状を取得
    const originalFeatures = JSON.parse(store.state.lassoGeojson).features;
    selected.forEach(sel => {
        const orig = originalFeatures.find(o => o.properties.id === sel.properties.id);
        if (orig) {
            // geometry オブジェクトごとコピーしてリセット
            sel.geometry = JSON.parse(JSON.stringify(orig.geometry));
        }
    });

    // 選択フィーチャの重心（pivot）を計算
    const groupFC = {
        type: 'FeatureCollection',
        features: selected.map(sel => ({
            type: 'Feature',
            geometry: sel.geometry,
            properties: {}
        }))
    };
    const [pivotLng, pivotLat] = turf.centroid(groupFC).geometry.coordinates;

    // Turf.js で拡大縮小 → 回転
    const transformed = selected.map(sel => {
        // Deep copy してから変換
        let feat = JSON.parse(JSON.stringify(sel));
        feat = turf.transformScale(feat, scaleFactor, { origin: [pivotLng, pivotLat] });
        feat = turf.transformRotate(feat, rotationDeg,  { pivot: [pivotLng, pivotLat] });
        return feat;
    });

    // 全フィーチャに戻し込む
    const updatedFeatures = allFeatures.map(f => {
        if (f.properties.lassoSelected === true) {
            return transformed.find(tf => tf.properties.id === f.properties.id);
        }
        return f;
    });

    // ソースとテキストを更新
    const updatedGeojson = { type: 'FeatureCollection', features: updatedFeatures };
    src.setData(updatedGeojson);
    store.state.clickCircleGeojsonText = JSON.stringify(updatedGeojson);
}
// 移動のドラッグハンドルを作る
export function updateDragHandles(editEnabled) {
    const map = store.state.map01;
    const originalGeojson = map.getSource('click-circle-source')._data;
    const source = map.getSource('drag-handles-source');
    if (!source) {
        console.warn('drag-handles-source が存在しません');
        return;
    }
    if (!editEnabled) {
        // 編集モードOFF → 空にして消す
        source.setData({ type: 'FeatureCollection', features: [] });
        return;
    }
    // lassoSelected=true のフィーチャを抽出
    const selected = originalGeojson.features.filter(f => f.properties.lassoSelected);
    // 編集モードON → isCircleCenter が true の地物を除外して中心点を生成
    const centerFeatures = originalGeojson.features
        .filter(f => !f.properties?.isCircleCenter && f.properties.id !== 'config' && f.properties.lassoSelected !== true) // ← この行で除外
        .map(f => {
            const center = turf.center(f); // 中心点（Point）
            return {
                type: 'Feature',
                geometry: center.geometry,
                properties: {
                    targetId: f.properties.id
                }
            };
        });

    if (selected.length > 0) {
        // ① 各フィーチャーを centroid(中心点) に変換
        const pointFeatures = selected.map(f => turf.centroid(f));
        // ② その PointFeature の集合からグループ重心を計算
        const groupCenter = turf.centroid(turf.featureCollection(pointFeatures));
        groupCenter.properties['targetId'] = selected[0].properties.id
        source.setData({
            type: 'FeatureCollection',
            features: [...centerFeatures,groupCenter]
        });
    } else {
        source.setData({
            type: 'FeatureCollection',
            features: centerFeatures
        });
    }

}

// 移動------------------------------------------------------------------------------------------------------------------
/**
 * 地物移動
 * @param map
 */
export function enableDragHandles(map) {
    let isDragging = false;
    let dragOrigin = null;
    let dragTargetId = null;
    let panWasInitiallyEnabled = true;

    let originalFeatures = null;      // click-circle-source のコピー
    let originalHandles = null;       // drag-handles-source のコピー
    let originalEndPoints = null;     // end-point-source のコピー

    let geojson = null

    function getTouchOrMouseLngLat(e) {
        if (store.state.isDrawLasso) return
        if (e.lngLat) return e.lngLat;
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = map.getCanvas().getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            return map.unproject([x, y]);
        }
        return null;
    }

    function onDown(e) {
        const point = e.point || map.project(getTouchOrMouseLngLat(e));
        const features = map.queryRenderedFeatures(point, {
            layers: ['drag-handles-layer']
        });

        if (!features.length) return;

        // 頂点、中点を一度クリア
        getAllVertexPoints(map);
        setAllMidpoints(map);
        // map.getSource('drag-handles-source').setData({ type: 'FeatureCollection', features: [] })

        const handle = features[0];
        dragTargetId = handle.properties.targetId;
        dragOrigin = getTouchOrMouseLngLat(e);
        isDragging = true;

        panWasInitiallyEnabled = map.dragPan.isEnabled();
        if (panWasInitiallyEnabled) {
            map.dragPan.disable();
        }

        const circleSrc = map.getSource('click-circle-source');
        const handleSrc = map.getSource('drag-handles-source');
        const endPointSrc = map.getSource('end-point-source');
        if (!circleSrc || !handleSrc) return;

        originalFeatures = JSON.parse(JSON.stringify(circleSrc._data || circleSrc._options.data));
        originalHandles = JSON.parse(JSON.stringify(handleSrc._data || handleSrc._options.data));
        if (endPointSrc) {
            originalEndPoints = JSON.parse(JSON.stringify(endPointSrc._data || endPointSrc._options.data));
        }

        e.preventDefault?.();
    }

    let lassoSelected = null
    let movedFeatures = null
    function onMove(e) {
        if (!isDragging) return;
        const current = getTouchOrMouseLngLat(e);
        if (!current || !dragOrigin) return;

        const dx = current.lng - dragOrigin.lng;
        const dy = current.lat - dragOrigin.lat;

        // ① click-circle-source の該当 feature を移動
        lassoSelected = originalFeatures.features.find(f => f.properties.id === dragTargetId && f.properties.lassoSelected === true)
        movedFeatures = originalFeatures.features.map(f => {
            let idMatch = f.properties.id === dragTargetId || f.properties.pairId === dragTargetId;
            if (lassoSelected) {
                idMatch = f.properties.lassoSelected === true
            }
            if (!idMatch) return f;

            const moved = JSON.parse(JSON.stringify(f));
            const geom = moved.geometry;

            if (geom.type === 'Point') {
                geom.coordinates[0] += dx;
                geom.coordinates[1] += dy;
                // canterLng, canterLat プロパティがある場合は更新
                if (typeof moved.properties.canterLng === 'number' && typeof moved.properties.canterLat === 'number') {
                    moved.properties.canterLng = geom.coordinates[0];
                    moved.properties.canterLat = geom.coordinates[1];
                }

            } else {
                // 座標移動用の関数
                const moveCoord = coords => coords.map(([lng, lat]) => [lng + dx, lat + dy]);

                if (geom.type === 'LineString') {
                    geom.coordinates = moveCoord(geom.coordinates);

                } else if (geom.type === 'Polygon') {
                    geom.coordinates = geom.coordinates.map(ring => moveCoord(ring));

                } else if (geom.type === 'MultiLineString') {
                    // 各 LineString を移動
                    geom.coordinates = geom.coordinates.map(line => moveCoord(line));

                } else if (geom.type === 'MultiPolygon') {
                    // 各 Polygon の各リングを移動
                    geom.coordinates = geom.coordinates.map(polygon =>
                        polygon.map(ring => moveCoord(ring))
                    );

                }

                // 中心座標プロパティがある場合は重心を再計算して更新
                if (typeof moved.properties.canterLng === 'number' && typeof moved.properties.canterLat === 'number') {
                    try {
                        // 全座標を 1 次元配列にフラット化
                        let allCoords = [];
                        if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
                            // Multi の場合は配列をフラットに
                            allCoords = Array.isArray(geom.coordinates[0][0])
                                ? geom.coordinates.flat()
                                : geom.coordinates;
                        } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
                            // Polygon や MultiPolygon はさらにネストあり
                            allCoords = geom.coordinates.flat(2);
                        }
                        // 重心計算
                        const sum = allCoords.reduce(
                            (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
                            [0, 0]
                        );
                        const len = allCoords.length;
                        moved.properties.canterLng = sum[0] / len;
                        moved.properties.canterLat = sum[1] / len;
                    }catch (e) {
                        console.log(e)
                    }
                }
            }

            return moved;
        });

        // ② drag-handles-source の該当ポイントを移動
        const movedHandles = originalHandles.features.map(f => {
            // if (f.properties.targetId !== dragTargetId) return f;
            if (!lassoSelected) {
                if (f.properties.targetId !== dragTargetId) return f;
            } else {
                const idMatch =  originalFeatures.features.find(originalF =>  {
                    return originalF.properties.lassoSelected === true && originalF.properties.id === f.properties.targetId
                })
                if (!idMatch) return f;
            }

            const moved = JSON.parse(JSON.stringify(f));
            moved.geometry.coordinates[0] += dx;
            moved.geometry.coordinates[1] += dy;
            return moved;
        });

        // ③ end-point-source の該当ポイントを移動（pairIdで判定）
        let movedEndPoints = originalEndPoints?.features || [];
        if (originalEndPoints) {
            movedEndPoints = originalEndPoints.features.map(f => {
                if (f.properties.pairId !== dragTargetId) return f;

                const moved = JSON.parse(JSON.stringify(f));
                const geom = moved.geometry;

                if (geom.type === 'Point') {
                    geom.coordinates[0] += dx;
                    geom.coordinates[1] += dy;
                } else if (geom.type === 'LineString' || geom.type === 'Polygon') {
                    const moveCoord = coords => coords.map(([lng, lat]) => [lng + dx, lat + dy]);
                    if (geom.type === 'LineString') {
                        geom.coordinates = moveCoord(geom.coordinates);
                    } else if (geom.type === 'Polygon') {
                        geom.coordinates = geom.coordinates.map(ring => moveCoord(ring));
                    }
                }

                return moved;
            });

            map.getSource('end-point-source').setData({ type: 'FeatureCollection', features: movedEndPoints });
        }

        // 更新反映
        geojson = { type: 'FeatureCollection', features: movedFeatures }
        map.getSource('click-circle-source').setData(geojson);
        map.getSource('drag-handles-source').setData({ type: 'FeatureCollection', features: movedHandles });

        e.preventDefault?.();
    }

    function onUp() {
        // 頂点・中点を再生成
        console.log(geojson)
        if (geojson && store.state.editEnabled) {
            updateDragHandles(true)
            getAllVertexPoints(map, geojson);
            setAllMidpoints(map, geojson);
            store.state.clickCircleGeojsonText = JSON.stringify(geojson)
            store.state.lassoGeojson = JSON.stringify(turf.featureCollection(geojson.features.filter(feature => feature.properties.lassoSelected === true)))
            // 移動したフィーチャのみを保存
            const featuresToSave = lassoSelected
                ? movedFeatures.filter(f => f.properties.lassoSelected === true)
                : movedFeatures.filter(f => f.properties.id === dragTargetId);
            console.log(featuresToSave,dragTargetId)
            saveDrowFeatures(featuresToSave);
        }
        if (panWasInitiallyEnabled) {
            map.dragPan.enable();
        }
        isDragging = false;
        dragOrigin = null;
        dragTargetId = null;
    }

    // マウス対応
    map.on('mousedown', onDown);
    map.on('mousemove', onMove);
    map.on('mouseup', onUp);

    // タッチ対応
    map.getCanvas().addEventListener('touchstart', onDown, { passive: false });
    map.getCanvas().addEventListener('touchmove', onMove, { passive: false });
    map.getCanvas().addEventListener('touchend', onUp, { passive: false });
}

export function japanCoord (coordinates) {
    if (zahyokei.length > 0) {
        const found = zahyokei.find(item => item.kei === store.state.zahyokei)
        if (found) {
            const code = found.code
            const jdpCoordinates = proj4('EPSG:4326', code, coordinates);
            store.state.jdpCoordinates = jdpCoordinates //storeにも登録
            store.state.jdpCode = code
            return jdpCoordinates
        } else {
            store.state.jdpCoordinates = ''
            store.state.jdpCode = ''
        }
    }
}

export function DXFDownload() {
    const map01 = store.state.map01
    const source = map01.getSource('click-circle-source');
    if (!source || !source._data) {
        alert('ソースが見つかりません');
        return;
    }
    const originalGeojson = source._data;
    // endpointプロパティがないフィーチャだけを残す
    const filteredFeatures = originalGeojson.features.filter(
        feature => !('endpoint' in feature.properties)
    );
    const filteredGeojson = {
        type: 'FeatureCollection',
        features: filteredFeatures
    };
    const toEPSG = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const convertedGeojson = convertFromEPSG4326(filteredGeojson, toEPSG)
    const dxfString = geojsonToDXF(convertedGeojson)
    // Blobとしてダウンロード処理
    const blob = new Blob([dxfString], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getNowFileNameTimestamp() + '.dxf';
    a.click();
    URL.revokeObjectURL(url); // 後片付け
}

/**
 * GeoJSONの座標を EPSG:4326 から任意の EPSG に変換する
 * @param {object} geojson - GeoJSON FeatureCollection
 * @param {string} toEPSG - 変換先のEPSGコード（例: 'EPSG:2450'）
 * @returns {object} - 変換後のGeoJSON
 */
export function convertFromEPSG4326(geojson, toEPSG) {
    const fromEPSG = 'EPSG:4326';
    // alert(toEPSG)
    const transformCoords = (coords) => {
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            return proj4(fromEPSG, toEPSG, coords);
        }
        return coords.map(transformCoords);
    };

    const transformGeometry = (geometry) => {
        if (!geometry) return null;

        if (geometry.type === 'GeometryCollection') {
            return {
                ...geometry,
                geometries: geometry.geometries.map(transformGeometry),
            };
        }

        return {
            ...geometry,
            coordinates: transformCoords(geometry.coordinates),
        };
    };

    return {
        ...geojson,
        features: geojson.features.map((feature) => ({
            ...feature,
            geometry: transformGeometry(feature.geometry),
        })),
    };
}
// タイムスタンプ生成。ファイル名などに使う
export function getNowFileNameTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // 月は0始まり
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

// 緯度経度をタイル座標 (z, x, y) に変換
function lonLatToTile(lon, lat, zoom) {
    const n = Math.pow(2, zoom);
    const xTile = Math.floor((lon + 180.0) / 360.0 * n);
    const yTile = Math.floor(
        (1.0 - Math.log(Math.tan((lat * Math.PI) / 180.0) + 1.0 / Math.cos((lat * Math.PI) / 180.0)) / Math.PI) /
        2.0 *
        n
    );
    return { xTile, yTile };
}

// タイル内のピクセル座標を計算
function calculatePixelInTile(lon, lat, zoom, xTile, yTile, tileSize = 256) {
    const n = Math.pow(2, zoom);
    const x = ((lon + 180.0) / 360.0 * n - xTile) * tileSize;
    const y =
        ((1.0 - Math.log(Math.tan((lat * Math.PI) / 180.0) + 1.0 / Math.cos((lat * Math.PI) / 180.0)) / Math.PI) / 2.0 *
            n -
            yTile) *
        tileSize;
    return { x: Math.floor(x), y: Math.floor(y) };
}

// 修正版: RGB値を標高にデコードする関数
function decodeElevationFromRGB(r, g, b) {
    const scale = 0.01; // スケール値（仮定）
    const offset = 0;   // オフセット値（仮定）
    return (r * 256 * 256 + g * 256 + b) * scale + offset; // RGB値を計算
}

// 標高データをタイル画像から取得し、キャンバスに出力
async function fetchElevationFromImage(imageUrl, lon, lat, zoom) {
    const { xTile, yTile } = lonLatToTile(lon, lat, zoom);

    const img = new Image();
    img.crossOrigin = "Anonymous"; // クロスオリジン対応
    img.src = imageUrl;

    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.style.display = "none"
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // タイル内のピクセル座標を計算
            const { x, y } = calculatePixelInTile(lon, lat, zoom, xTile, yTile, img.width);

            // ピクセルデータを取得
            const imageData = ctx.getImageData(x, y, 1, 1).data;
            const [r, g, b] = imageData; // R, G, B 値を取得
            const elevation = decodeElevationFromRGB(r, g, b); // 標高を計算

            // キャンバスに描画
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.font = "12px Arial";
            ctx.fillStyle = "white";
            ctx.fillText(`${elevation}m`, x + 10, y - 10);
            document.body.appendChild(canvas);

            resolve(elevation);
        };

        img.onerror = (err) => {
            reject(`画像の読み込みに失敗しました: ${err}`);
        };
    });
}

// 標高を取得する関数
export async function fetchElevation(lon, lat, zoom = 15) {
    const baseUrl = "https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png";
    const { xTile, yTile } = lonLatToTile(lon, lat, zoom);
    // y と x を反転してタイルURLを生成
    const tileUrl = baseUrl.replace("{z}", zoom).replace("{x}", xTile).replace("{y}", yTile);
    try {
        const elevation = await fetchElevationFromImage(tileUrl, lon, lat, zoom);
        // console.log(`標高: ${elevation}m`);
        return elevation;
    } catch (error) {
        // console.error("エラー:", error);
    }
}

// geoJSONToSIMA
export function geoJSONToSIMA(geojson) {
    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let B01Text = '';
    let i = 1;
    let j = 1;
    const coordinateMap = new Map();

    geojson.features.forEach((feature) => {
        const geomType = feature.geometry?.type;
        const props = feature.properties || {};

        // -------- Point / MultiPoint --------
        if (geomType === 'Point' || geomType === 'MultiPoint') {
            const points = geomType === 'Point'
                ? [feature.geometry.coordinates]
                : feature.geometry.coordinates;

            points.forEach((coord) => {
                const [x, y, z] = coord;
                if (!Number.isFinite(x) || !Number.isFinite(y)) return;

                const key = `${x},${y},${z ?? ''}`;
                if (!coordinateMap.has(key)) {
                    coordinateMap.set(key, j);
                    const name = props.地番 || props.chiban || `点${j}`;
                    A01Text += `A01,${j},${name},${y.toFixed(3)},${x.toFixed(3)},${Number.isFinite(z) ? z.toFixed(3) : ''},\n`;
                    j++;
                }
            });
            return;
        }

        // -------- Polygon / MultiPolygon --------
        const chiban = props.地番 || props.chiban || `地番${i}`;
        B01Text += `D00,${i},${chiban},1,\n`;

        let coordinates = [];
        if (geomType === 'Polygon') {
            coordinates = feature.geometry.coordinates.map(ring => {
                if (
                    ring.length > 1 &&
                    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
                ) {
                    ring.push(ring[0]);
                }
                return ring;
            });
        } else if (geomType === 'MultiPolygon') {
            coordinates = feature.geometry.coordinates.flat().map(ring => {
                if (
                    ring.length > 1 &&
                    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
                ) {
                    ring.push(ring[0]);
                }
                return ring;
            });
        } else {
            console.warn('Unsupported geometry:', geomType);
            return;
        }

        coordinates.forEach((ring, ringIndex) => {
            const len = ring.length;
            ring.forEach((coord, index) => {
                const [x, y, z] = coord;
                if (!Number.isFinite(x) || !Number.isFinite(y)) return;

                const key = `${x},${y},${z ?? ''}`;
                if (!coordinateMap.has(key)) {
                    coordinateMap.set(key, j);
                    A01Text += `A01,${j},${j},${y.toFixed(3)},${x.toFixed(3)},${Number.isFinite(z) ? z.toFixed(3) : ''},\n`;
                    j++;
                }
                const current = coordinateMap.get(key);
                const isLast = index === len - 1 && ringIndex === coordinates.length - 1;
                B01Text += `B01,${current},${current},\n`;
                if (isLast) B01Text += `D99,\n`;
            });
        });

        i++;
    });

    simaData += A01Text + B01Text;
    return simaData;
}
// ダウンロード汎用関数
export function downloadTextFile(fileName, textContent, encoding = 'utf-8') {
    let blob;

    if (encoding.toLowerCase() === 'shift-jis' || encoding.toLowerCase() === 'sjis') {
        // Shift_JISへの変換（window.Encoding を使用）
        const utf8Array = window.Encoding.stringToCode(textContent);
        const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
        const uint8Array = new Uint8Array(shiftJISArray);
        blob = new Blob([uint8Array], { type: 'application/octet-stream' });
    } else {
        // UTF-8（BOMなし）
        blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 各地点に距離情報を追加する（標高なし）
 * @param {Array} points - 各要素に coord:[lon,lat] を含む配列
 * @returns {Array} - 距離情報付きの配列
 */

export function splitLineStringIntoPoints(lineStringGeoJSON, numPoints) {
    if (!lineStringGeoJSON || lineStringGeoJSON.geometry.type !== 'LineString') {
        console.error('入力はLineStringのGeoJSONである必要があります');
        return null;
    }

    if (numPoints < 2) {
        console.error('ポイント数は2以上である必要があります');
        return null;
    }

    const line = turf.lineString(lineStringGeoJSON.geometry.coordinates);
    const totalLength = turf.length(line, { units: 'kilometers' }); // 総距離（km）

    const segmentLength = totalLength / (numPoints - 1);
    const points = [];
    let accumulated = 0;

    for (let i = 0; i < numPoints; i++) {
        const distance = i * segmentLength;
        const point = turf.along(line, distance, { units: 'kilometers' });

        // プロパティ追加
        point.properties.segment_distance = i === 0 ? 0 : segmentLength;
        point.properties.accumulated_distance = accumulated;
        point.properties.total_distance = totalLength;

        accumulated += segmentLength;

        points.push(point);
    }

    console.log(turf.featureCollection(points));
    return turf.featureCollection(points);
}
/**
 * GeoJSONをKMLに変換する関数
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {Object} [options] - オプション
 * @param {string} [options.documentName] - KML Document の <name> 要素の値
 * @param {string} [options.documentDescription] - KML Document の <description> 要素の値
 * @returns {string} KML形式の文字列
 */
export function geojsonToKml(geojson, options = {}) {
    const {
        documentName = '',
        documentDescription = ''
    } = options;

    const lines = [];
    // XML宣言＋kml開始
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
    lines.push('  <Document>');
    if (documentName) {
        lines.push(`    <name>${escapeXml(documentName)}</name>`);
    }
    if (documentDescription) {
        lines.push(`    <description>${escapeXml(documentDescription)}</description>`);
    }

    // 各 Feature を Placemark として出力
    geojson.features.forEach(feature => {
        const { geometry, properties = {} } = feature;
        lines.push('    <Placemark>');
        if (properties.name) {
            lines.push(`      <name>${escapeXml(properties.name)}</name>`);
        }
        const desc = properties.description || properties.desc;
        if (desc) {
            lines.push(`      <description>${escapeXml(desc)}</description>`);
        }

        // ジオメトリ別処理
        switch (geometry.type) {
            case 'Point': {
                const [lon, lat, alt] = geometry.coordinates;
                const coord = [lon, lat, alt || 0].join(',');
                lines.push('      <Point>');
                lines.push(`        <coordinates>${coord}</coordinates>`);
                lines.push('      </Point>');
                break;
            }
            case 'LineString': {
                lines.push('      <LineString>');
                lines.push('        <coordinates>');
                geometry.coordinates.forEach(([lon, lat, alt]) => {
                    lines.push(`          ${[lon, lat, alt || 0].join(',')}`);
                });
                lines.push('        </coordinates>');
                lines.push('      </LineString>');
                break;
            }
            case 'Polygon': {
                lines.push('      <Polygon>');
                // 外殻のみサポート（innerBoundary は省略可）
                lines.push('        <outerBoundaryIs>');
                lines.push('          <LinearRing>');
                lines.push('            <coordinates>');
                geometry.coordinates[0].forEach(([lon, lat, alt]) => {
                    lines.push(`              ${[lon, lat, alt || 0].join(',')}`);
                });
                lines.push('            </coordinates>');
                lines.push('          </LinearRing>');
                lines.push('        </outerBoundaryIs>');
                lines.push('      </Polygon>');
                break;
            }
            case 'MultiLineString':
            case 'MultiPolygon': {
                lines.push('      <MultiGeometry>');
                if (geometry.type === 'MultiLineString') {
                    geometry.coordinates.forEach(line => {
                        lines.push('        <LineString>');
                        lines.push('          <coordinates>');
                        line.forEach(([lon, lat, alt]) => {
                            lines.push(`            ${[lon, lat, alt || 0].join(',')}`);
                        });
                        lines.push('          </coordinates>');
                        lines.push('        </LineString>');
                    });
                } else { // MultiPolygon
                    geometry.coordinates.forEach(polygon => {
                        lines.push('        <Polygon>');
                        lines.push('          <outerBoundaryIs>');
                        lines.push('            <LinearRing>');
                        lines.push('              <coordinates>');
                        polygon[0].forEach(([lon, lat, alt]) => {
                            lines.push(`                ${[lon, lat, alt || 0].join(',')}`);
                        });
                        lines.push('              </coordinates>');
                        lines.push('            </LinearRing>');
                        lines.push('          </outerBoundaryIs>');
                        lines.push('        </Polygon>');
                    });
                }
                lines.push('      </MultiGeometry>');
                break;
            }
            default:
                console.warn(`Unsupported geometry type: ${geometry.type}`);
        }

        lines.push('    </Placemark>');
    });

    // 閉じタグ
    lines.push('  </Document>');
    lines.push('</kml>');

    return lines.join('\n');
}

/**
 * XML 内に埋め込む文字列をエスケープ
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * GeoJSONをGPXに変換する関数
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {Object} [options] - オプション
 * @param {string} [options.creator] - GPX creator 属性の値
 * @param {string} [options.version] - GPX バージョン
 * @param {Object} [options.metadata] - メタデータ (name, desc など)
 * @returns {string} GPX形式の文字列
 */
export function geojsonToGpx(geojson, options = {}) {
    const {
        creator = 'geojson-to-gpx',
        version = '1.1',
        metadata = {}
    } = options;

    const lines = [];
    // XML宣言
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    // GPX開始タグ
    lines.push(`<gpx version="${version}" creator="${creator}" xmlns="http://www.topografix.com/GPX/1/1"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`);

    // メタデータ
    if (metadata.name || metadata.desc) {
        lines.push('  <metadata>');
        if (metadata.name) lines.push(`    <name>${metadata.name}</name>`);
        if (metadata.desc) lines.push(`    <desc>${metadata.desc}</desc>`);
        lines.push('  </metadata>');
    }

    // 各Featureを処理
    geojson.features.forEach(feature => {
        const { geometry, properties = {} } = feature;
        switch (geometry.type) {
            case 'Point': {
                const [lon, lat] = geometry.coordinates;
                lines.push(`  <wpt lat="${lat}" lon="${lon}">`);
                if (properties.name) lines.push(`    <name>${properties.name}</name>`);
                if (properties.desc) lines.push(`    <desc>${properties.desc}</desc>`);
                lines.push('  </wpt>');
                break;
            }
            case 'LineString':
            case 'MultiLineString': {
                lines.push('  <trk>');
                if (properties.name) lines.push(`    <name>${properties.name}</name>`);
                lines.push('    <trkseg>');
                const coords = geometry.type === 'LineString'
                    ? geometry.coordinates
                    : geometry.coordinates.flat();
                coords.forEach(([lon, lat]) => {
                    lines.push(`      <trkpt lat="${lat}" lon="${lon}" />`);
                });
                lines.push('    </trkseg>');
                lines.push('  </trk>');
                break;
            }
            case 'Polygon':
            case 'MultiPolygon': {
                lines.push('  <trk>');
                if (properties.name) lines.push(`    <name>${properties.name}</name>`);
                const rings = geometry.type === 'Polygon'
                    ? [geometry.coordinates[0]]
                    : geometry.coordinates.map(poly => poly[0]);
                rings.forEach(ring => {
                    lines.push('    <trkseg>');
                    ring.forEach(([lon, lat]) => {
                        lines.push(`      <trkpt lat="${lat}" lon="${lon}" />`);
                    });
                    lines.push('    </trkseg>');
                });
                lines.push('  </trk>');
                break;
            }
            default:
                console.warn(`Unsupported geometry type: ${geometry.type}`);
        }
    });
    // GPX終了タグ
    lines.push('</gpx>');
    return lines.join('\n');
}
export function removeNini() {
    const map = store.state.map01;
    const source = map.getSource(clickCircleSource.iD);
    const drawGeojson = source._data;
    // features を上書き：isNini が true かつ lassoSelected が false のものを除外
    drawGeojson.features = drawGeojson.features.filter(feature => {
        const hasNini  = !!feature.properties.isNini;
        const hasLasso = !!feature.properties.lassoSelected;
        // isNini && !lassoSelected の場合は false を返して除外
        return !(hasNini && !hasLasso);
    });
    source.setData(drawGeojson);
    store.state.clickCircleGeojsonText = JSON.stringify(drawGeojson);
}

/**
 * ドローレイヤーにgeojsonを追加
 * @param geojson
 * @param isFit
 * @param isNini
 */
export function addDraw (geojson,isFit,isNini) {
    console.log(geojson)
    const map = store.state.map01
    geojson.features.forEach(feature => {
        const id = String(Math.floor(10000 + Math.random() * 90000));
        feature.properties['id'] = id
        if (!feature.properties.label) feature.properties['label'] = ''
        if (!feature.properties.color) feature.properties['color'] = 'rgba(0,0,255,0.1)'
        feature.properties['line-width'] = 1
        feature.properties['arrow-type'] = 'none'
        if (isNini) {
            feature.properties['isNini'] = true;
        }
    })
    const drawGeojson = map.getSource(clickCircleSource.iD)._data
    drawGeojson.features.push(...geojson.features);
    map.getSource(clickCircleSource.iD).setData(drawGeojson);
    drawGeojson.features.forEach(feature => {
        if (feature.geometry && feature.geometry.type !== 'Point') {
            const calc = calculatePolygonMetrics(feature);
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === "MultiPolygon") {
                feature.properties['area'] = calc.area;
            } else if (feature.geometry.type === 'LineString' || feature.geometry.type === "MultiLineString")  {
                feature.properties['area'] = calc.perimeter;
            }
        }
    })
    store.state.clickCircleGeojsonText = JSON.stringify(drawGeojson)
    console.log(geojson.features)
    saveDrowFeatures(geojson.features)
    if (isFit) {
        const bbox = turf.bbox(geojson);
        map.fitBounds(bbox, {
            padding: 40,
            duration: 1000,
            linear: false
        });
    }
}
/**
 * GeoJSON 全体を指定座標に再センタリングする
 * @param {GeoJSON} geojson - 入力 GeoJSON（FeatureCollection）
 * @param {[number, number]} targetCoord - 目的の中心座標 [lng, lat]
 * @returns {GeoJSON} - 座標をシフトした GeoJSON
 */
export function recenterGeoJSON(geojson, targetCoord) {
    // 1. 入力の重心を計算
    const center = turf.centroid(geojson).geometry.coordinates; // [lng, lat]

    // 2. 移動量 Δlng, Δlat を求める
    const dx = targetCoord[0] - center[0];
    const dy = targetCoord[1] - center[1];

    // 3. ディープコピーして新しいオブジェクトを作成
    const moved = JSON.parse(JSON.stringify(geojson));

    // 4. 再帰的に座標配列をシフトする関数
    function shiftCoords(coords) {
        // 座標ペア [lng, lat] の場合
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            return [coords[0] + dx, coords[1] + dy];
        }
        // それ以外（ネストされた配列）の場合は再帰
        return coords.map(shiftCoords);
    }

    // 5. 各 Feature のジオメトリをシフト
    moved.features.forEach(feature => {
        feature.geometry.coordinates = shiftCoords(feature.geometry.coordinates);
    });

    return moved;
}
/**
 * GeoJSON の南北（緯度）だけを反転（上下反転）する
 * @param {GeoJSON} geojson - FeatureCollection／Feature／Geometry
 * @returns {GeoJSON} - 縦方向に反転済み GeoJSON の新オブジェクト
 */
export function flipLatitude(geojson) {
    // 1. GeoJSON 全体のバウンディングボックス [minX, minY, maxX, maxY] を取得
    const [minX, minY, maxX, maxY] = turf.bbox(geojson);
    const midLat = (minY + maxY) / 2;
    // 2. 深いコピー（元のオブジェクトは変更しない）
    const copy = JSON.parse(JSON.stringify(geojson));
    // 3. 座標配列を再帰的に反転
    function reflect(coords) {
        // 単一座標 [lng, lat] の場合
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            const lng = coords[0];
            const lat = coords[1];
            // 緯度だけ midLat を基準に反転
            return [ lng, 2 * midLat - lat ];
        }
        // 配列（LineString や Polygon のネスト配列）の場合は再帰
        return coords.map(reflect);
    }
    // 4. GeoJSON の種類に応じて座標反転を適用
    function process(obj) {
        switch (obj.type) {
            case 'FeatureCollection':
                obj.features.forEach(process);
                break;
            case 'Feature':
                process(obj.geometry);
                break;
            case 'Point':
            case 'MultiPoint':
            case 'LineString':
            case 'MultiLineString':
            case 'Polygon':
            case 'MultiPolygon':
                obj.coordinates = reflect(obj.coordinates);
                break;
            // GeometryCollection などがあれば追加対応
        }
    }
    process(copy);
    return copy;
}
/**
 * 文字列からURLを抽出し、新しいタブで開く
 * @param {string} text - URLを含む文字列
 */
export function extractAndOpenUrls(text) {
    // URLをマッチさせる正規表現（http/https対応）
    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    // マッチしたすべてのURLを配列で取得
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
        window.open(url, '_blank');
    });
    if (urls.length === 0) {
        console.warn('文字列にURLが見つかりませんでした。');
    }
}
export function printDirectionChange (titleDirection) {
    const map00Div = document.getElementById('map00');
    const map01Div = document.getElementById('map01');
    const map02Div = document.getElementById('map02');
    // A4サイズ（mm→px）: 210mm x 297mm
    // 1mm ≒ 3.7795275591px
    let widthPx
    let heightPx
    console.log(titleDirection)
    switch (titleDirection) {
        case 'horizontal':
            widthPx = 260 * 3.7795275591;
            heightPx = 190 * 3.7795275591;
            break
        case 'vertical':
            widthPx = 190 * 3.7795275591;
            heightPx = 260 * 3.7795275591;
            break
        default:
            widthPx = 190 * 3.7795275591;
            heightPx = 260 * 3.7795275591;
    }
    // リサイズ＆中央に
    map00Div.style.width  = widthPx + 'px';
    map00Div.style.height = heightPx + 'px';
    // map00Div.style.margin = '0 auto';
    map00Div.style.margin = '20px auto 0 auto';
    map00Div.style.display = 'block';
}
// export function getMaxZIndex () {
//     const elements = document.querySelectorAll('.my-div, .maplibregl-popup');
//     let maxZ = 0;
//     elements.forEach(el => {
//         const z = window.getComputedStyle(el).zIndex;
//         const zi = parseInt(z, 10);
//         if (!isNaN(zi) && zi > maxZ) maxZ = zi;
//     });
//     return maxZ + 1
// }
export function gpxDownload (geojson) {
    const gpxString = geojsonToGpx(geojson)
    const fileName =  getNowFileNameTimestamp() + '.gpx'
    downloadTextFile(fileName, gpxString)
}
export function kmlDownload (geojson) {
    const kmlString = geojsonToKml(geojson)
    const fileName =  getNowFileNameTimestamp() + '.kml'
    downloadTextFile(fileName, kmlString)
}
export function geojsonDownload (geojson) {
    const geojsonString = JSON.stringify(geojson)
    const fileName =  getNowFileNameTimestamp() + '.geojson'
    downloadTextFile(fileName, geojsonString)
}
// CSV→オブジェクト配列に変換
export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: res => resolve(res.data),
            error: err => reject(err)
        });
    });
}

// Nominatim でジオコーディング（1件 limit=1）
export async function geocode(query) {
    try {
        const url = 'https://msearch.gsi.go.jp/address-search/AddressSearch?q='
            + encodeURIComponent(query);
        const res = await fetch(url);
        const data = await res.json();
        return data[0] || null;
        // const url = 'https://nominatim.openstreetmap.org/search'
        //     + '?format=json'
        //     + '&limit=1'
        //     + '&accept-language=ja'
        //     + '&q=' + encodeURIComponent(query);
        // const res = await fetch(url, {
        //     headers: { 'User-Agent': 'meibo-csv-geojson-js/1.0' }
        // });
        // const arr = await res.json();
        // return arr[0] || null;
    } catch {
        return null;
    }
}

// 指定ミリ秒だけ待つ
export function delay0(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 緯度経度カラムを予想する関数
export function detectLatLonColumns(records) {
    if (!records || records.length === 0) return null;
    const columns = Object.keys(records[0]);
    // 緯度・経度と判断するためのカラム名パターン
    const latPatterns = [/lat(i?tude)?$/i, /緯度/, /^y$/i];
    const lonPatterns = [/lon(gitude)?$/i, /lng/i, /経度/, /^x$/i];
    const sampleSize = Math.min(records.length, 10);
    // パターンにマッチするカラムを収集
    const candidates = { lat: [], lon: [] };
    columns.forEach((col) => {
        if (latPatterns.some((pat) => pat.test(col))) candidates.lat.push(col);
        if (lonPatterns.some((pat) => pat.test(col))) candidates.lon.push(col);
    });
    // 数値と範囲チェック用のヘルパー
    function isValidRange(values, min, max) {
        return values.every((v) => {
            const num = parseFloat(v);
            return !isNaN(num) && num >= min && num <= max;
        });
    }
    // サンプルデータで範囲内か検証
    const sampleRecords = records.slice(0, sampleSize);
    const latCol = candidates.lat.find((col) =>
        isValidRange(sampleRecords.map((r) => r[col]), -90, 90)
    );
    const lonCol = candidates.lon.find((col) =>
        isValidRange(sampleRecords.map((r) => r[col]), -180, 180)
    );
    // 両方見つかったら結果を返す
    if (latCol && lonCol) {
        return { lat: latCol, lon: lonCol };
    }
    return null;
}

/**
 全国地番図面積計算
 */
export async function chibanzuCalculatePolygonMetrics(tgtFeatures) {
    let polygons = []
    tgtFeatures.forEach(feature => {
        console.log(feature.geometry)
        polygons.push(turf.polygon(feature.geometry.coordinates))
    })
    const calc = calculatePolygonsMetrics(polygons)
    return calc
}

/**
 法務省地図面積計算
 */
export async function homusyoCalculatePolygonMetrics(fudeIds) {
    const map01 = store.state.map01;
    let prefId = String(store.state.prefId).padStart(2, '0');
    // prefId が '00' の場合、最初のフィーチャから都道府県コードを取得
    if (prefId === '00') {
        const features = map01.queryRenderedFeatures({ layers: ['oh-homusyo-2025-polygon'] });
        if (features.length > 0) {
            const firstFeature = features[0];
            const citycode = firstFeature.properties['市区町村コード'];
            if (typeof citycode === 'string' && citycode.length >= 2) {
                prefId = citycode.substring(0, 2);
            }
        }
    }
    console.log('初期 prefId:', prefId);
    // 地図の現在表示範囲からバウンディングボックスを作成
    function fgBoundingBox() {
        const bounds = map01.getBounds();
        return {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth(),
        };
    }
    let bbox;
    // highlightedChibans が存在する場合は該当レイヤーからバウンディングボックスを取得
    if (store.state.highlightedChibans.size > 0) {
        bbox = getBoundingBoxByLayer(map01, 'oh-homusyo-2025-polygon');
        if (bbox.minX === Infinity) {
            bbox = fgBoundingBox();
        }
    } else {
        bbox = fgBoundingBox();
    }
    // flatgeobuf から GeoJSON をフェッチ＆デシリアライズ
    async function deserializeAndPrepareGeojson() {
        const geojson = { type: 'FeatureCollection', features: [] };
        console.log('データをデシリアライズ中...', bbox);
        const iter = deserialize(
            `https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/fgb/${prefId}.fgb`,
            bbox
        );
        for await (const feature of iter) {
            geojson.features.push(feature);
        }
        console.log('取得した地物:', geojson);
        return geojson;
    }
    // デシリアライズ処理を await し、GeoJSON を返却
    const geojson = await deserializeAndPrepareGeojson();
    // 敢えてフィルター。
    let features = []
    fudeIds.forEach(fudeId => {
        features = [...features, ...geojson.features.filter(feature => feature.properties.筆ID === fudeId)]
    })
    if (fudeIds.length === 1 && features.length > 1) {
        alert('地物を二つ以上発見。総計で計算します。')
    }
    let polygons = []
    features.forEach(feature => {
        console.log(feature.geometry)
        feature.geometry.coordinates.forEach(coordinate => {
            polygons.push(turf.polygon(coordinate))
        })
    })
    const calc = calculatePolygonsMetrics(polygons)
    return calc
}

//

/**
 * 緯度経度 → WebMercator タイル X
 */
export function lon2tile(lon, z) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}

/**
 * 緯度経度 → WebMercator タイル Y
 */
export function lat2tile(lat, z) {
    const rad = (lat * Math.PI) / 180;
    return Math.floor(
        (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 *
        Math.pow(2, z)
    );
}

/**
 * ポリゴン（GeoJSON Feature, Geometry または座標配列）から BBOX を計算
 * @param {Object|Array} polygon GeoJSON Polygon Feature/Geometry または [ [lng,lat], ... ]
 * @returns {[number,number,number,number]} [minLng, minLat, maxLng, maxLat]
 */
export function getBBoxFromPolygon(polygon) {
    let coords;
    if (polygon.type === 'Feature' && polygon.geometry?.type === 'Polygon') {
        coords = polygon.geometry.coordinates[0];
    } else if (polygon.type === 'Polygon' && Array.isArray(polygon.coordinates)) {
        coords = polygon.coordinates[0];
    } else if (Array.isArray(polygon) && Array.isArray(polygon[0])) {
        coords = polygon;
    } else {
        throw new Error('Invalid polygon input');
    }
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;
    coords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
    });
    return [minLng, minLat, maxLng, maxLat];
}

/**
 * 任意のタイル URL テンプレートから URL 一覧を生成
 * @param {[number,number,number,number]} bbox
 * @param {number} minZ
 * @param {number} maxZ
 * @param {string|function} tileUrlTemplate '{z}','{x}','{y}' を含む文字列 or (z,x,y)=>string
 * @returns {string[]} URL の配列
 */
export function genTileUrls(bbox, minZ, maxZ, tileUrlTemplate) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const urls = [];
    let urlFn;
    if (typeof tileUrlTemplate === 'string') {
        urlFn = (z, x, y) =>
            tileUrlTemplate.replace(/{z}/g, z)
                .replace(/{x}/g, x)
                .replace(/{y}/g, y);
    } else if (typeof tileUrlTemplate === 'function') {
        urlFn = tileUrlTemplate;
    } else {
        throw new Error('tileUrlTemplate must be a string or function');
    }
    for (let z = minZ; z <= maxZ; z++) {
        const x0 = lon2tile(minLng, z), x1 = lon2tile(maxLng, z);
        const y0 = lat2tile(maxLat, z), y1 = lat2tile(minLat, z);
        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= y1; y++) {
                urls.push(urlFn(z, x, y));
            }
        }
    }
    return urls;
}

/**
 * Service Worker に URL 一覧を送ってキャッシュさせる
 * controller がいない場合は ready を待ってメッセージ送信
 * @param {string[]} urls
 */
export function cacheTilesViaSW(urls) {
    const post = controller => controller.postMessage({ type: 'CACHE_RASTER_TILES', urls });
    if (navigator.serviceWorker.controller) {
        post(navigator.serviceWorker.controller);
    } else if (navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) post(reg.active);
            else console.warn('Service Worker active worker not found');
        });
    } else {
        console.warn('Service Worker not supported or not ready');
    }
}

export function cachePmtiles(pmtilesUrl,bbox,zoomLevels) {
    const post = controller => controller.postMessage({
        type: 'CACHE_TILES',
        pmtilesUrl,
        bbox,
        zoomLevels
    });
    if (navigator.serviceWorker.controller) {
        post(navigator.serviceWorker.controller);
    } else if (navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) post(reg.active);
            else console.warn('Service Worker active worker not found');
        });
    } else {
        console.warn('Service Worker not supported or not ready');
    }
}

/**
 * 並列制限付きで fetch しつつ進捗コールバック
 * @param {string[]} urls
 * @param {{ concurrent?: number, onProgress?: (done: number, total: number) => void }} options
 */
export async function fetchWithProgress(
    urls,
    { concurrent = 10, onProgress } = {}
) {
    let done = 0;
    const total = urls.length;
    const queue = urls.slice();
    const workers = Array(concurrent).fill(null).map(async () => {
        while (queue.length) {
            const url = queue.shift();
            try {
                await fetch(url, { cache: 'reload' });
            } catch {
                // ignore errors
            }
            done++;
            if (onProgress) onProgress(done, total);
        }
    });
    await Promise.all(workers);
}

/**
 * ページ内の全ての<div>のz-indexを調べ、
 * 最大値 + 1 を返す
 */
export function getNextZIndex() {
    const divs = document.getElementsByTagName('div');
    let maxZ = 0;
    // HTMLCollectionを配列に変換してループ
    Array.from(divs).forEach(div => {
        // .v-overlay を除外
        if (div.classList.contains('v-overlay')) return;

        const z = window.getComputedStyle(div).zIndex;
        const zi = parseInt(z, 10);
        if (!isNaN(zi) && zi > maxZ) {
            maxZ = zi;
        }
    });
    return maxZ + 1;
}
// urlの変更を監視
// export function watchSParamOnce(callback) {
//     let prevS = new URLSearchParams(location.search).get('s');
//     const timer = setInterval(() => {
//         const currentS = new URLSearchParams(location.search).get('s');
//         if (currentS !== prevS) {
//             clearInterval(timer);
//             callback(currentS); // 新しい s の値を渡す
//         }
//     }, 100);
// }
export function watchSParamOnce() {
    return new Promise((resolve) => {
        let prevS = new URLSearchParams(location.search).get('s');
        const timer = setInterval(() => {
            const currentS = new URLSearchParams(location.search).get('s');
            if (currentS !== prevS) {
                clearInterval(timer);
                resolve(currentS); // Promise を解決して値を返す
            }
        }, 100);
    });
}

export function changePrintMap03 (titleDirection) {
    const map01Div = document.getElementById('map01');
    const map02Div = document.getElementById('map02');
    switch (titleDirection) {
        case 'vertical':
            setTimeout(() => {
                map01Div.style.display = 'block'
                map01Div.style.height = '50%'
                map01Div.style.width = '100%'
                map02Div.style.position = 'relative'
                map02Div.style.display = 'block'
                map02Div.style.height = '50%'
                map02Div.style.width = '100%'
            },10)
            break
        case 'horizontal':
            setTimeout(() => {
                map01Div.style.display = 'block'
                map01Div.style.height = '100%'
                map01Div.style.width = '50%'
                map02Div.style.position = 'absolute'
                map02Div.style.top = '0px'
                map02Div.style.right = '0px'
                map02Div.style.display = 'block'
                map02Div.style.height = '100%'
                map02Div.style.width = '50%'
            },10)
            break
    }
}
/**
地理院タイル取得の一連
 */
function insertBrEveryNChars(str, n) {
    const regex = new RegExp(`.{1,${n}}`, 'g');
    return str.match(regex).join('<br>');
}

function zxyToLonLat(z, x, y) {
    const n = Math.pow(2, z);
    const lon = (x + 0.5) / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / n)));
    const lat = latRad * (180 / Math.PI);
    return { lon, lat };
}

export async function fetchGsiTile() {
    const res = await fetch('https://maps.gsi.go.jp/development/ichiran.html');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const result = {};
    const titles = doc.querySelectorAll('h4.title');

    let currentCategory = '';
    titles.forEach((titleEl) => {
        const id = titleEl.getAttribute('id');
        if (!id) return;

        // 直前の <p> を探す
        let prev = titleEl.previousElementSibling;
        let foundCategory = '';
        while (prev) {
            if (prev.tagName === 'P') {
                foundCategory = prev.textContent.trim();
                break;
            }
            prev = prev.previousElementSibling;
        }
        if (foundCategory) {
            if (foundCategory === '基準点・地磁気・地殻変動') {
                foundCategory = '地磁気'
            }
            currentCategory = foundCategory;
        }

        if (!result[currentCategory]) result[currentCategory] = [];

        const baseTitle = titleEl.textContent.trim();
        const layers = [];

        let el = titleEl.nextElementSibling;

        // source 抽出
        if (!(el && el.classList.contains('source'))) return;
        const rawSources = [];

        while (el && el.classList.contains('source')) {
            rawSources.push(el.textContent.trim());
            el = el.nextElementSibling;
            if (el?.tagName === 'BR') el = el.nextElementSibling;
        }

        // source → layer オブジェクトへ変換
        rawSources.forEach((srcLine) => {
            const matches = srcLine.match(/URL：(.+?)(（.+）)?$/);
            if (!matches) return;

            const url = matches[1].replace(/（.+）/, '').trim().replace(/^URL：/, '');
            const note = matches[2]?.replace(/[（）]/g, '').trim();
            const ext = url.split('.').pop();

            // .png or .jpg 以外 → スキップ
            if (!['png', 'jpg'].includes(ext)) return;

            // URLに漢字が含まれていたらスキップ
            if (/[一-龯々]/.test(url)) return;

            // URLに{year}含まれていたらスキップ
            if (/{year}/.test(url)) return;

            const fullTitle = note ? `${baseTitle}（${note}）` : baseTitle;
            layers.push({
                title: fullTitle,
                source: url,
            });
        });

        if (layers.length === 0) return;

        // テーブルから情報抽出
        let sourceInfo = null;
        let minzoom = Infinity;
        let maxzoom = -Infinity;
        let latestDate = null;
        let coverage = null;
        let note = null;
        let zxy = null;

        while (el && !(el.tagName === 'H4' && el.classList.contains('title'))) {
            if (el.tagName === 'TABLE') {
                const rows = el.querySelectorAll('tr');
                rows.forEach((tr) => {
                    const tds = tr.querySelectorAll('td');
                    if (tds.length >= 2) {
                        const label = tds[0].textContent.trim();
                        const value = tds[1].textContent.trim();

                        if (label.includes('データソース') && !sourceInfo) {
                            const html = tds[1].innerHTML.trim();
                            if (html) sourceInfo = html;
                        }

                        // z/x/y 取得
                        // 無条件に tiletd の href を取得
                        const tiletd = tr.querySelector('.tiletd a[href*="tilejump.html#"]');
                        if (tiletd) {
                            const href = tiletd.getAttribute('href');
                            const match = href.match(/tilejump\.html#[^/]+\/(\d+)\/(\d+)\/(\d+)/);
                            if (match) {
                                const z = parseInt(match[1], 10);
                                const x = parseInt(match[2], 10);
                                const y = parseInt(match[3], 10);
                                if (!isNaN(z) && !isNaN(x) && !isNaN(y)) {
                                    zxy = { z, x, y };
                                }
                            }
                        }
                        // zxy = { z:1, x:2, y:3 }
                        if (label.includes('ズームレベル')) {
                            const match = value.match(/(\d+)\s*(?:～|-)\s*(\d+)/);
                            if (match) {
                                const zmin = parseInt(match[1], 10);
                                const zmax = parseInt(match[2], 10);
                                if (!isNaN(zmin)) minzoom = Math.min(minzoom, zmin);
                                if (!isNaN(zmax)) maxzoom = Math.max(maxzoom, zmax);
                            } else {
                                const z = parseInt(value, 10);
                                if (!isNaN(z)) {
                                    minzoom = Math.min(minzoom, z);
                                    maxzoom = Math.max(maxzoom, z);
                                }
                            }
                        }

                        if (label.includes('提供開始')) {
                            let match = value.match(/平成\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
                            if (match) {
                                const y = 1988 + parseInt(match[1], 10);
                                const m = String(parseInt(match[2], 10)).padStart(2, '0');
                                const d = String(parseInt(match[3], 10)).padStart(2, '0');
                                latestDate = `${y}-${m}-${d}`;
                            }
                            match = value.match(/令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
                            if (match) {
                                const y = 2018 + parseInt(match[1], 10);
                                const m = String(parseInt(match[2], 10)).padStart(2, '0');
                                const d = String(parseInt(match[3], 10)).padStart(2, '0');
                                latestDate = `${y}-${m}-${d}`;
                            }
                        }

                        if (label.includes('提供範囲') && !coverage) {
                            coverage = value;
                        }

                        if (label.includes('備考')) {
                            const html = tds[1].innerHTML.trim();
                            if (html) note = html;
                        }
                    }
                });
            }
            el = el.nextElementSibling;
        }

        const obj = { id, layers };
        if (sourceInfo) obj.sourceInfo = sourceInfo;
        if (isFinite(minzoom)) obj.minzoom = minzoom;
        if (isFinite(maxzoom)) obj.maxzoom = maxzoom;
        if (latestDate) obj.latestDate = latestDate;
        if (coverage) obj.coverage = coverage;
        if (note) obj.note = note;
        if (zxy) {
            obj.zxy = zxy
            const { lon, lat } = zxyToLonLat(zxy.z, zxy.x, zxy.y);
            // obj.coordinate = [lon, lat];  // MapLibre の setCenter 等と互換
            obj.position = [lon, lat];  // MapLibre の setCenter 等と互換
        }

        result[currentCategory].push(obj);
    });

    // 空の配列カテゴリを削除
    for (const key in result) {
        if (result[key].length === 0) {
            delete result[key];
        }
    }

    return result;
}

export function convertGsiTileJson(categorizedData, lineLength = 30) {
    const result = [];
    let isNew = false

    Object.entries(categorizedData).forEach(([categoryKey, entries]) => {
        const categoryNodes = []
        let newHtml = ''
        entries.forEach(entry => {
            const baseId = entry.id;
            const attribution = entry.note;
            const z = entry.zxy?.z
            const position = entry.position;
            const latestDate = entry.latestDate;
            const isPosition = entry.position && categoryKey.includes('■') ? true : false

            // 1年以内
            const isWithinOneYear = new Date(entry.latestDate ?? 0) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            // 1ヶ月以内（30日とする）
            const isWithinOneMonth = new Date(entry.latestDate ?? 0) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            // 1週間以内（7日）
            const isWithinOneWeek = new Date(entry.latestDate ?? 0) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            if (isWithinOneWeek) {
                isNew = true
                newHtml = '<span style="color: red;">new </span>'
            } else {
                newHtml = ''
            }

            entry.layers.forEach((layerObj, index) => {
                const sourceId = `${baseId}-source-${index}`;
                const layerId = `oh-${baseId}-layer-${index}`;
                const formattedTitle = newHtml + insertBrEveryNChars(layerObj.title, lineLength);

                categoryNodes.push({
                    id: baseId,
                    label: formattedTitle,
                    source: {
                        id: sourceId,
                        obj: {
                            type: 'raster',
                            tiles: [layerObj.source],
                        },
                    },
                    layers: [
                        {
                            id: layerId,
                            type: 'raster',
                            source: sourceId,
                            position: position,
                            z: z,
                            latestDate: latestDate,
                        },
                    ],
                    attribution: `<div style="width: 300px;">${attribution}</div>`,
                    position: isPosition,
                });
            });
        });
        const category = {
            id: categoryKey,
            label: newHtml + categoryKey,
            nodes: categoryNodes,
        };
        result.push(category);
    });

    return {
        result:result,
        isNew:isNew
    }
}

export function isImageFile(fileName) {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const ext = fileName.split('.').pop().toLowerCase();
    return imageExts.includes(ext);
}

export function isVideoFile(fileName) {
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    const ext = fileName.split('.').pop().toLowerCase();
    return videoExts.includes(ext);
}

export async function compressImageToUnder10MB(file, type = 'image/jpeg') {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_DIMENSION = 1920; // 幅・高さの最大値
    let quality = 0.9;

    const imageBitmap = await createImageBitmap(file);

    // リサイズ処理
    let width = imageBitmap.width;
    let height = imageBitmap.height;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    // 再帰的に圧縮して10MB以下を目指す
    async function tryCompress(q) {
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                if (blob.size <= MAX_SIZE || q <= 0.1) {
                    resolve(blob);
                } else {
                    resolve(await tryCompress(q - 0.1));
                }
            }, type, q);
        });
    }
    return await tryCompress(quality);
}

/**
 * 平面直角座標系と座標を指定してwgs84の座標を返す
 * @param zone
 * @param x
 * @param y
 * @returns {{lon: *, lat: *}}
 */
export function jgd2000ZoneToWgs84(zone, x, y) {
    if (zone < 1 || zone > 19) {
        throw new Error("zoneは1〜19の整数で指定してください");
    }

    const epsgOrigins = {
        1: [129.5, 33.0],
        2: [131.0, 33.0],
        3: [132.1666666667, 36.0],
        4: [133.5, 33.0],
        5: [134.3333333333, 33.0],
        6: [136.0, 36.0],
        7: [137.1666666667, 36.0],
        8: [138.5, 36.0],
        9: [139.8333333333, 36.0],
        10: [140.8333333333, 40.0],
        11: [140.25, 44.0],
        12: [142.25, 44.0],
        13: [144.25, 44.0],
        14: [142.0, 26.0],
        15: [127.5, 26.0],
        16: [124.0, 24.0],
        17: [131.0, 27.0],
        18: [136.0, 20.0],
        19: [154.0, 24.0]
    };

    const origin = epsgOrigins[zone];
    if (!origin) throw new Error(`zone ${zone} に対応する原点が定義されていません`);

    const [lon0, lat0] = origin;
    const projString = `+proj=tmerc +lat_0=${lat0} +lon_0=${lon0} +k=1 +x_0=0 +y_0=0 +datum=GRS80 +units=m +no_defs`;
    const [lon, lat] = proj4(projString, proj4.WGS84, [x, y]);
    return { lat, lon };
}

/**
 * ドローの地物を新規追加、更新する。
 * @param features
 * @returns {Promise<*>}
 */
export async function saveDrowFeatures(features) {
    if (!store.state.isUsingServerGeojson) return
    store.state.loading2 = true
    store.state.loadingMessage = '更新中'
    const formData = new FormData();
    formData.append('geojson_id', store.state.geojsonId);
    features.forEach(f => {
        formData.append('feature_id[]', f.properties.id);
        formData.append('last_editor_user_id[]', store.state.userId);
        formData.append('last_editor_nickname[]', store.state.myNickname);
        formData.append('feature[]', JSON.stringify(f));
        if (f.properties.updated_at) {
            formData.append('prev_updated_at[]', f.properties.updated_at);
        }
    });
    console.log(features)
    const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/features_save.php', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    console.log(result)
    if (result.success) {
        const map01 = store.state.map01
        result.results.forEach(result => {
            const target = map01.getSource(clickCircleSource.iD)._data.features?.find(feature => {
                return feature.properties.id === result.feature_id
            })
            console.log(target)
            if (target) target.properties.updated_at = result.updated_at
            if (result.status === 'conflict') {
                // store.state.loadingMessage = '競合が発生しました'
            } else if (result.status === 'inserted') {
                store.state.loadingMessage = '新規追加しました'
            } else {
                store.state.loadingMessage = '更新しました'
            }
        })
        console.log(result.results)
    } else {
        console.error('保存失敗', result);
        store.state.loadingMessage = '失敗'
    }
    setTimeout(() => {
        store.state.loading2 = false
    },2000)
}

/**
 * 文字列が JSON 形式か判定する
 * @param {string} str 判定したい文字列
 * @returns {boolean} JSON として parse できれば true, それ以外は false
 */
export function isJsonString(str) {
    if (typeof str !== 'string') return false;
    const s = str.trim();
    if (
        !(
            (s.startsWith('{') && s.endsWith('}')) ||
            (s.startsWith('[') && s.endsWith(']'))
        )
    ) {
        return false;
    }
    try {
        JSON.parse(s);
        return true;
    } catch {
        return false;
    }
}

/**
 * 2つの GeoJSON FeatureCollection を比較して差分を取得します。
 * @param {object} oldGeoJSON - 元の GeoJSON (FeatureCollection)
 * @param {object} newGeoJSON - 新しい GeoJSON (FeatureCollection)
 * @param {string} [idProp='id'] - 各 Feature の一意キー (feature.id または feature.properties[idProp])
 * @returns {{ added: object[], removed: object[], modified: object[] }}
 *   added: newGeoJSON にのみ存在する地物
 *   removed: oldGeoJSON にのみ存在する地物
 *   modified: 両方に存在するが geometry または properties が異なる地物 (newGeoJSON 側の Feature)
 */
export function diffGeoJSON(oldGeoJSON, newGeoJSON, idProp = 'id') {
    const getId = feature =>
        feature.id != null
            ? feature.id
            : feature.properties?.[idProp];

    const oldMap = new Map(
        (oldGeoJSON.features || []).map(f => [getId(f), f])
    );
    const newMap = new Map(
        (newGeoJSON.features || []).map(f => [getId(f), f])
    );

    const added = [];
    const removed = [];
    const modified = [];

    // newGeoJSON 側を走査して added / modified を判定
    for (const [id, newF] of newMap) {
        if (!oldMap.has(id)) {
            added.push(newF);
        } else {
            const oldF = oldMap.get(id);
            // geometry か properties が異なる場合を modified とみなす
            const geomChanged = JSON.stringify(oldF.geometry) !== JSON.stringify(newF.geometry);
            const propsChanged = JSON.stringify(oldF.properties) !== JSON.stringify(newF.properties);
            if (geomChanged || propsChanged) {
                modified.push(newF);
            }
        }
    }

    // oldGeoJSON 側を走査して removed を判定
    for (const [id, oldF] of oldMap) {
        if (!newMap.has(id)) {
            removed.push(oldF);
        }
    }

    return { added, removed, modified };
}

/**
 * 複数削除復活する。idを配列で渡す
 * @param ids
 * @returns {Promise<void>}
 */
export async function featuresRestore(ids) {
    if (store.state.isUsingServerGeojson) {
        store.state.loading2 = true
        const formData = new FormData();
        formData.append('geojson_id', store.state.geojsonId);
        // 配列で複数回 append
        ids.forEach(id => {
            formData.append('feature_id[]', id)
        });
        const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/features_restore.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        console.log(result)
        if (result.success) {
            store.state.loadingMessage = '復活成功'
            setTimeout(() => {
                store.state.loading2 = false
            },2000)
        } else {
            store.state.loading2 = false
            alert('復活失敗')
        }
    }
}

/**
 * 初回ロードで全フィーチャーを取得して featureCollection を作る
 * @type {{features: *[], type: string}}
 */
let featureCollection = {
    type: 'FeatureCollection',
    features: []
};
export async function loadAllFeatures() {
    const map01 = store.state.map01;
    const formData = new FormData();
    formData.append('geojson_id', store.state.geojsonId);
    const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/features_select.php', {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    if (!data.success) throw new Error('初回ロード失敗');

    featureCollection.features = data.rows.map(row => {
        const f = JSON.parse(row.feature);
        f.properties = f.properties || {};
        f.properties.updated_at = row.updated_at;
        return f;
    });

    // MapLibre にソースを反映
    map01.getSource(clickCircleSource.iD).setData(featureCollection)
    store.state.clickCircleGeojsonText = JSON.stringify(featureCollection)
    closeAllPopups()
    generateStartEndPointsFromGeoJSON(featureCollection)

    const configFeature = featureCollection.features.find(f => f.properties.id === 'config')
    if (configFeature) {
        store.state.configFeature = configFeature
    }
}

/**
 * 差分ポーリングの upsert / delete 関数
 * @param f
 */
function upsertFeature(f) {
    const id = f.properties.id;
    const idx = featureCollection.features.findIndex(x => x.properties.id === id);
    if (idx !== -1) {
        // 既存要素を更新
        featureCollection.features[idx] = f;
    } else {
        // 新規要素を追加
        featureCollection.features.push(f);
    }
}
function removeFeature(id) {
    featureCollection.features = featureCollection.features.filter(
        x => x.properties.id !== id
    );
    // MapLibre に反映するならここで再セット
    // map.getSource(clickCircleSource.iD).setData(featureCollection);
}

/**
 * ポーリング本体
 * @type {string}
 */
let pollingTimer = null;
let lastFetch = new Date(0).toISOString();
export async function pollUpdates() {
    try {
        const map01 = store.state.map01;
        const formData = new FormData();
        formData.append('geojson_id', store.state.geojsonId);
        formData.append('since', lastFetch);

        const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/features_get_update.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error||'差分取得失敗');

        const existingIds = new Set(featureCollection.features.map(f => f.properties.id));
        const newFeatures = data.features.filter(f => !existingIds.has(f.properties.id));
        newFeatures.forEach(f => {
            if (f.properties.last_editor_user_id !== store.state.userId) {
                store.state.loading2 = true
                if (f.properties.last_editor_nickname) {
                    store.state.loadingMessage = `${f.properties.last_editor_nickname} さんが新しい地物を追加しました`
                } else {
                    store.state.loadingMessage = `guestさんが新しい地物を追加しました`
                }
                setTimeout(() => {
                    store.state.loading2 = false
                },3000)
            }
            // // 例：Vue の $toast を使う場合
            // this.$toast.info(
            //     `${f.properties.last_editor_nickname} さんが新しい地物を追加しました`,
            //     { timeout: 3000 }
            // );
            // // あるいは、store.commit('addNotification', { ... })
        });

        data.features.forEach(upsertFeature);
        data.deletions.forEach(d => removeFeature(d.feature_id));

        // 全体を再セット
        map01.getSource(clickCircleSource.iD).setData(featureCollection);
        generateStartEndPointsFromGeoJSON(featureCollection)
        store.state.clickCircleGeojsonText = JSON.stringify(featureCollection)

        // console.log(store.state.clickCircleGeojsonText)

        featureCollection.features.forEach(feature => {
            if (feature.properties.pictureUrl) {
                // console.log(feature.properties.pictureUrl)
                // console.log(feature.geometry.coordinates)
                const coords = feature.geometry.coordinates
                const photoURL = feature.properties.pictureUrl
                createThumbnailMarker(map01, coords, photoURL)
            }
        })


        const configFeature = featureCollection.features.find(feature => feature.properties.id === 'config')
        if (configFeature) {
            store.state.configFeature = configFeature
        }

        // lastFetchを更新
        const times = [
            ...data.features.map(f => f.properties.updated_at),
            ...data.deletions.map(d => d.deleted_at),
            lastFetch
        ];
        lastFetch = times.sort().pop();
    } catch (e) {
        console.warn('pollUpdates error:', e);
    } finally {
        pollingTimer = setTimeout(pollUpdates, 3000 + Math.random()*500);
    }
}

/**
 * ポーリング停止
 */
export function stopPolling() {
    if (pollingTimer) {
        clearTimeout(pollingTimer);
        pollingTimer = null;
    }
}

/**
 * ポーリング開始（geojson_id を切替えてリセットから始める）
 * @param newGeojsonId
 */
export function startPolling() {
    stopPolling();
    lastFetch = new Date(0).toISOString();    // or 初回ロード時刻に置き換え
    featureCollection.features = [];           // 前のデータをクリア
    // 初回全件ロードしてから差分へ移行する場合はここで呼ぶ
    loadAllFeatures().then(() => {
        // pollingTimer = setTimeout(pollUpdates, 0);
        pollUpdates()
    });
}

/**
 * 小さいサムネイル風のマーカーをつくる
 * @param map
 * @param coords
 * @param photoURL
 */
export function createThumbnailMarker(map, coords, photoURL) {
    const key = coords.join(',');
    if (!map.__thumbnailMarkerKeys) {
        map.__thumbnailMarkerKeys = new Set();
    }
    if (map.__thumbnailMarkerKeys.has(key)) {
        return;
    }
    map.__thumbnailMarkerKeys.add(key);

    const size = 50;
    const arrowSize = 10; // 三角の高さ

    // コンテナ要素を作成
    const container = document.createElement('div');
    // container.style.position = 'relative';
    container.style.width    = `${size}px`;
    container.style.height   = `${size + 6}px`; // 縦幅に三角分を追加
    container.style.cursor   = 'pointer';

    const thumb = document.createElement('div');
    thumb.style.width             = `${size}px`;
    thumb.style.height            = `${size}px`;
    thumb.style.backgroundImage   = `url(${photoURL})`;
    thumb.style.backgroundSize    = 'cover';
    thumb.style.backgroundPosition= 'center';
    thumb.style.borderRadius      = '10px';
    thumb.style.border            = '2px solid #ffffff';
    thumb.style.boxShadow         = '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.5)';
    thumb.style.cursor            = 'pointer';
    container.appendChild(thumb);

    // 下向き三角ポインタ
    const arrow = document.createElement('div');
    arrow.style.position     = 'absolute';
    arrow.style.left         = '50%';
    arrow.style.bottom       = '0';
    arrow.style.transform    = 'translateX(-50%) translateY(50%)';
    arrow.style.width        = '0';
    arrow.style.height       = '0';
    arrow.style.borderLeft   = `${arrowSize}px solid transparent`;
    arrow.style.borderRight  = `${arrowSize}px solid transparent`;
    arrow.style.borderTop    = `${arrowSize}px solid #ffffff`;
    container.appendChild(arrow);

    // クリックで元画像を別タブで開く
    container.addEventListener('click', (e) => {
        e.stopPropagation(); // マップのクリックイベントを阻止
        window.open(photoURL, '_blank', 'noopener,noreferrer');
    });

    const offsetX = 0
    const offsetY = -35;
    new maplibregl.Marker({
        element: container,
        offset: [ offsetX, offsetY ]
    })
        .setLngLat(coords)
        .addTo(map);
}
