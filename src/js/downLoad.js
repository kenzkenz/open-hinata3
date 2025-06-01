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
    vpsTileLayer, chibanzuLayers0, chibanzuLayers, chibanzuSources, sicyosonChibanzuUrls, loadColorData
} from "@/js/layers";
import shpwrite from "@mapbox/shp-write"
import JSZip from 'jszip'
import {history, transformCoordinates} from "@/App";
import tokml from 'tokml'
import iconv from "iconv-lite";
import pako from "pako";
import {kml} from "@tmcw/togeojson";
import * as GeoTIFF from 'geotiff';
import muni from "@/js/muni";
import * as exifr from 'exifr'
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
export function saveGeojson (map,layerId,sourceId,fields) {
    // if (map.getZoom() <= 15) {
    //     alert('ズーム15以上にしてください。')
    //     return
    // }
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
                        B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\nD99,\n';
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

    simaData = simaData + A01Text + saveSimaGaiku2 (map,j) + 'A99\nZ00,区画データ,\n' + B01Text
    simaData += 'A99,END,,\n';

    if (kukaku || jww) {
        simaData = convertSIMtoTXT(simaData)
    }

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

export function saveCima(map, layerId, sourceId, fields, kaniFlg, kei, chiban) {
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
    convertAndDownloadGeoJSONToSIMA(map,layerId,geojson,'簡易_',kaniFlg,kei,null,null,null,chiban);
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

function downloadGeoJSONAsCSV(geojson, filename = 'data.csv') {
    if (!geojson || !geojson.features || !Array.isArray(geojson.features)) {
        throw new Error('Invalid GeoJSON data');
    }

    // 1. 属性のキーを取得（最初のfeatureから）
    const properties = geojson.features[0]?.properties || {};
    const propertyKeys = Object.keys(properties);
    // const headers = ['latitude', 'longitude', ...propertyKeys];
    const headers = propertyKeys;

    // 2. 各フィーチャのデータを抽出
    const rows = geojson.features.map(feature => {
        const coords = feature.geometry?.coordinates || [];
        let latitude = '';
        let longitude = '';

        // Pointの場合
        if (feature.geometry?.type === 'Point') {
            [longitude, latitude] = coords;
        }
        // PolygonまたはLineStringの場合（代表点を使用）
        else if (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'LineString') {
            [longitude, latitude] = coords[0][0] || coords[0];
        }

        // 各プロパティの値を取得
        const propValues = propertyKeys.map(key => feature.properties[key] || '');

        // return [latitude, longitude, ...propValues];
        return propValues;
    });

    // 3. CSV形式に変換
    const csvContent = [
        headers.join(','), // ヘッダー
        ...rows.map(row => row.join(',')) // 各行
    ].join('\n');

    // 4. CSVをダウンロード
    const firstChiban = getChibanAndHoka(geojson).firstChiban
    const hoka = getChibanAndHoka(geojson).hoka
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', firstChiban + hoka);
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
    console.log('初期 prefId:', prefId);

    let fgb_URL;
    let retryAttempted = false;
    // ここを改修する必要あり。amxと24自治体以外の動きがあやしい。
    function getFgbUrl(prefId) {
        const specialIds = ['07', '15', '22', '26', '28', '29', '30', '40', '43', '44','45','47'];
        switch (layerId) {
            case 'oh-homusyo-2025-polygon':
                // return 'https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025.fgb'
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
        const iter = window.flatgeobuf.deserialize(fgb_URL, bbox);
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
        const iter = window.flatgeobuf.deserialize(fgb_URL, fgBoundingBox());

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
    // alert(999999)
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
    let sec = 0
    if (isFirstRun) {
        sec = 0
    } else {
        sec = 0
    }
    try {
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
                        ['concat', ['get', 'id']],
                        ['literal', Array.from(store.state.highlightedSimas)]
                    ],
                    'rgba(0, 128, 128, 0.5)', // クリックされた地番が選択された場合
                    'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
                ]
            );
        }, sec)
        isFirstRun = false
    }catch (e) {
        console.log(e)
    }
}

let isFirstRunCity1 = true;
export function highlightSpecificFeaturesCity(map,layerId) {
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
        for await (const feature of window.flatgeobuf.deserialize(fgbUrl, bbox)) {
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
function calculatePolygonMetrics(polygon) {
    try {
        // 面積の計算
        const area = '約' + turf.area(polygon).toFixed(1) + 'm2'; // Turf.jsで面積を計算
        // 周長の計算
        const perimeter = '約' + turf.length(polygon, { units: 'meters' }).toFixed(1) + 'm'; // Turf.jsで周長を計算
        // 頂点数の計算 (GeoJSON座標から取得)
        const coordinates = polygon.geometry.coordinates[0]; // 外周の座標を取得
        console.log(coordinates[0].length)
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
        return '面積：' + area + ' 周長:' + perimeter + '<br>境界点数：' + vertexCount
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

export function downloadSimaText (isUser) {
    let simaText
    let fileName = 'sima.sim'
    if (isUser) {
        try {
            simaText = JSON.parse(store.state.simaTextForUser).text;
        }catch (e) {
            simaText = store.state.simaTextForUser;
            fileName = '部分DL.sim'
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

        let response = await fetch("https://kenzkenz.duckdns.org/myphp/generate_csv4.php", {
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
    fetch("https://kenzkenz.duckdns.org/myphp/uploadPng.php", {
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

        let response = await fetch("https://kenzkenz.duckdns.org/myphp/extract_numbers5.php", {
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
        let response = await fetch("https://kenzkenz.duckdns.org/myphp/generate_tiles4.php", {
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
    fetch("https://kenzkenz.duckdns.org/myphp/upload.php", {
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

export async function tileGenerateForUser(imageExtension, worldFileExtension) {
    // タイル生成関数
    async function generateTiles(filePath, srsCode = "2450", dir, fileName, resolution, transparent) {
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
            // generate_tiles11.phpにリクエスト送信
            const response = await fetch("https://kenzkenz.duckdns.org/myphp/generate_tiles15.php", {
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
    const srsCode = zahyokei.find(item => item.kei === store.state.zahyokei)?.code || "2450";
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
        let phpUrl = "https://kenzkenz.duckdns.org/myphp/upload.php"
        if (!worldFile) phpUrl = "https://kenzkenz.duckdns.org/myphp/upload1file.php"
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
    if (bbox) {
        map01.fitBounds([
            [bbox[0], bbox[1]], // minX, minY
            [bbox[2], bbox[3]]  // maxX, maxY
        ], { padding: 20 });
    }
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
    // async function insertSimaData(uid, name, url, url2, simaText, zahyokei) {
    //     try {
    //         const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaInsert.php', new URLSearchParams({
    //             uid: uid,
    //             name: name,
    //             url: url,
    //             url2: url2,
    //             simatext: simaText,
    //             zahyokei: zahyokei
    //         }));
    //         if (response.data.error) {
    //             console.error('エラー:', response.data.error);
    //             alert(`エラー: ${response.data.error}`);
    //         } else {
    //             console.log('登録成功:', response.data);
    //             // alert('登録成功')
    //             store.state.fetchImagesFire = !store.state.fetchImagesFire
    //             async function aaa() {
    //                 const id = response.data.lastId
    //                 const sourceAndLayers = await userSimaSet(name, url, id, null, simaText, isUpload)
    //                 console.log(sourceAndLayers)
    //                 store.state.geojsonSources.push({
    //                     sourceId: sourceAndLayers.source.id,
    //                     source: sourceAndLayers.source
    //                 })
    //                 console.log(store.state.geojsonSources)
    //                 store.state.selectedLayers.map01.unshift(
    //                     {
    //                         id: 'oh-sima-' + id + '-' + name + '-layer',
    //                         label: name,
    //                         source: sourceAndLayers.source.id,
    //                         layers: sourceAndLayers.layers,
    //                         opacity: 1,
    //                         visibility: true,
    //                     }
    //                 );
    //                 console.log(store.state.selectedLayers.map01)
    //                 const bounds = new maplibregl.LngLatBounds();
    //                 sourceAndLayers.geojson.features.forEach(feature => {
    //                     const geometry = feature.geometry;
    //                     if (!geometry) return;
    //                     switch (geometry.type) {
    //                         case 'Point':
    //                             bounds.extend(geometry.coordinates);
    //                             break;
    //                         case 'LineString':
    //                             geometry.coordinates.forEach(coord => bounds.extend(coord));
    //                             break;
    //                         case 'Polygon':
    //                             geometry.coordinates.flat().forEach(coord => bounds.extend(coord));
    //                             break;
    //                         case 'MultiPolygon':
    //                             geometry.coordinates.flat(2).forEach(coord => bounds.extend(coord));
    //                             break;
    //                     }
    //                 });
    //                 map.fitBounds(bounds, {
    //                     padding: 50,
    //                     animate: true
    //                 });
    //                 store.state.snackbar = true
    //                 store.state.loading2 = false
    //             }
    //             aaa()
    //         }
    //     } catch (error) {
    //         console.error('通信エラー:', error);
    //     }
    // }

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
        axios.post('https://kenzkenz.duckdns.org/myphp/upload_sima.php', formData, {
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
                const webUrl = 'https://kenzkenz.duckdns.org/' + response.data.simaPath.replace('/var/www/html/public_html/','')
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
        axios.post('https://kenzkenz.duckdns.org/myphp/upload_kmz.php', formData, {
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
                const webUrl = 'https://kenzkenz.duckdns.org/' + response.data.kmzPath.replace('/var/www/html/public_html/','')
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

// export function capture(uid) {
//     const map = store.state.map01
//     console.log(map)
//     if (!map || !map.isStyleLoaded()) {
//         console.error("mapがまだ初期化されていません");
//         return;
//     }
//     map.once('idle', async () => {
//         const canvas = map.getCanvas();
//         console.log("キャンバスサイズ:", canvas.width, canvas.height);
//         if (canvas.width === 0 || canvas.height === 0) {
//             console.error("キャンバスのサイズがゼロです");
//             return;
//         }
//         const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
//         console.log("生成された画像URL:", dataUrl); // ここで確認
//
//         fetch("https://kenzkenz.duckdns.org/myphp/thumbnail.php", {
//             method: "POST",
//             body: JSON.stringify({
//                 image: dataUrl,
//                 dir: uid
//             }),
//             headers: {
//                 "Content-Type": "application/json"
//             }
//         })
//             .then(res => res.json())
//             .then(msg => console.log("保存結果:", msg))
//             .catch(err => console.error("Fetch failed:", err));
//     })
// }

// export function capture(uid) {
//     if(!uid) return
//     const map01 = store.state.map01
//     // 地図のレンダリング完了を待機
//     map01.once('idle', async () => {
//         const canvas = map01.getCanvas();
//         console.log("キャンバスサイズ:", canvas.width, canvas.height);
//         if (canvas.width === 0 || canvas.height === 0) {
//             console.error("キャンバスのサイズがゼロです");
//             return;
//         }
//         const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
//         console.log("生成された画像URL:", dataUrl); // ここで確認
//
//         fetch("https://kenzkenz.duckdns.org/myphp/thumbnail.php", {
//             method: "POST",
//             body: JSON.stringify({
//                 image: dataUrl,
//                 dir: uid
//             }),
//             headers: {
//                 "Content-Type": "application/json"
//             }
//         })
//             .then(res => res.json())
//             .then(msg => console.log("保存結果:", msg))
//             .catch(err => console.error("Fetch failed:", err));
//     });
//     // これ重要↓
//     const currentZoom = map01.getZoom();
//     map01.zoomTo(currentZoom + 0.00000000000000000000000000001);
// }

export function capture(uid,isFirst) {
    if (!uid) return;
    const map01 = store.state.map01;
    map01.once('idle', async () => {
        const canvas = map01.getCanvas();
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        // console.log("生成された画像URL:", dataUrl);
        try {
            const res = await fetch("https://kenzkenz.duckdns.org/myphp/thumbnail.php", {
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
        // alert(zahyokei)
        // zahyokei = store.state.zahyokei
        // alert(zahyokei)
        const geojson = simaToGeoJSON(simaText, map, zahyokei, false, true);
        return createSourceAndLayers(geojson);
    // } catch (error) {
    //     console.error(error);
    //     return null;
    // }

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
            id: 'oh-sima-' + id + '-' + name + '-label-layer',
            type: 'symbol',
            source: sourceId,
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
        }
        const vertexLayer = {
            id: 'oh-sima-' + id + '-' + name + '-vertex-layer',
            type: 'circle',
            source: sourceId,
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
        };
        const pointLayer = {
            id: 'oh-sima-' + id + '-' + name + '-point-layer',
            type: 'circle',
            source: sourceId,
            layout: {},
            paint: {
                'circle-radius': 6,
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

// export async function pmtilesGenerateForUser (geojsonBlob,bbox) {
//     async function generatePmtiles(filePath) {
//         store.state.loading2 = true
//         store.state.loadingMessage = 'pmtiles作成中です。'
//         let response = await fetch("https://kenzkenz.duckdns.org/myphp/generate_pmtiles2.php", {
//             method: "POST",
//             headers: {"Content-Type": "application/json"},
//             body: JSON.stringify({
//                 file: filePath,
//                 // dir: dir,
//                 // fileName: fileName,
//             })
//         });
//         let result = await response.json();
//         if (result.success) {
//             // addTileLayer(result.tiles_url, result.bbox)
//             console.log(result.tippecanoeCmd)
//             const webUrl = 'https://kenzkenz.duckdns.org/' + result.pmtiles_file.replace('/var/www/html/public_html/','')
//             console.log(result.pmtiles_file)
//             insertPmtilesData(store.state.userId , store.state.pmtilesName, webUrl, result.pmtiles_file, store.state.pmtilesPropertieName)
//             console.log('pmtiles作成完了')
//             store.state.loading2 = false
//
//         } else {
//             console.log(result)
//             store.state.loading2 = false
//             alert("タイル生成に失敗しました！" + result.error);
//         }
//     }
//     async function insertPmtilesData(uid, name, url, url2,  chiban) {
//         try {
//             const response = await axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesInsert.php', new URLSearchParams({
//                 uid: uid,
//                 name: name,
//                 url: url,
//                 url2: url2,
//                 chiban: chiban,
//                 bbox: JSON.stringify(bbox)
//             }));
//             if (response.data.error) {
//                 console.error('エラー:', response.data.error);
//                 alert(`エラー: ${response.data.error}`);
//             } else {
//                 console.log('登録成功:', response.data);
//                 userPmtileSet(name,url,response.data.id, chiban, bbox)
//                 store.state.fetchImagesFire = !store.state.fetchImagesFire
//             }
//         } catch (error) {
//             console.error('通信エラー:', error);
//         }
//     }
//     // -------------------------------------------------------------------------------------------------
//     store.state.loading2 = true
//     store.state.loadingMessage = 'アップロード中です。'
//
//     const formData = new FormData();
//     formData.append("file", geojsonBlob,"data.geojson");
//     formData.append("dir", store.state.userId + '/pmtiles'); // 指定したフォルダにアップロード
//     fetch("https://kenzkenz.duckdns.org/myphp/uploadGeojson.php", {
//         method: "POST",
//         body: formData
//     })
//         .then(response => response.json())
//         .then(data => {
//             if (data.success) {
//                 console.log("アップロード成功:", data);
//                 // alert("アップロード成功!")
//                 store.state.loading2 = false
//                 generatePmtiles(data.file);
//             } else {
//                 console.error("アップロード失敗:", data);
//                 store.state.loading = false
//                 alert("アップロードエラー: " + data.error);
//             }
//         })
//         .catch(error => console.error("エラー:", error));
//     // -------------------------------------------------------------------------------------------------
// }
export async function pmtilesGenerateForUser2 (geojson,bbox,chiban,prefcode,citycode,selectedPublic,file) {
    async function insertPmtilesData(uid, name, url, url2,  chiban, bbox, length, prefcode, citycode) {
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
                public: public0
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

    const response = await fetch("https://kenzkenz.duckdns.org/myphp/generate_pmtiles7.php", {
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
            const webUrl = 'https://kenzkenz.duckdns.org/' + result.pmtiles_file.replace('/var/www/html/public_html/', '');
            console.log(result.pmtiles_file);
            insertPmtilesData(
                store.state.userId,
                store.state.pmtilesName,
                webUrl,
                result.pmtiles_file,
                store.state.pmtilesPropertieName,
                result.bbox,
                result.length,
                prefcode,
                citycode
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
    let response = await fetch("https://kenzkenz.duckdns.org/myphp/iko.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    let result = await response.json();

    if (result.success) {
        store.state.loading2 = false
        console.log(result)
        result.directories.forEach(directorie => {
            const webUrl = 'https://kenzkenz.duckdns.org/' + directorie.path.replace('/var/www/html/public_html/','') + '/{z}/{x}/{y}.png'
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
                const chibanzuColors = await loadColorData();
                const maps = [store.state.map01,store.state.map02]
                maps.forEach(map => {
                    map.setPaintProperty('oh-city-geojson-poligon-layer', 'fill-color', [
                        'match',
                        ['get', 'N03_007'],
                        ...Object.entries(chibanzuColors).flat(),
                        'rgba(0,0,0,0)' // デフォルト色
                    ]);
                })
                store.state.loading2 = false
            }
            aaa()
        })
    })
}


// export function publicChk (id,public0) {
//     store.state.loading2 = true
//     store.state.loadingMessage = '全国地番図公開マップ作成中です。'
//     axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesUpdatePublic.php',{
//         params: {
//             id: id,
//             public: public0
//         }
//     }).then(function (response) {
//         // vm.pmtileSelectPublic()
//         console.log(response.data.publics[0].public)
//         let cities = response.data.publics.map(v => {
//             return {
//                 citycode:v.citycode,
//                 pmtilesurl:v.url,
//                 public: Number(v.public),
//                 page: ''
//             }
//         })
//         console.log(cities)
//         const cities2 = []
//         sicyosonChibanzuUrls.forEach(v => {
//             if (v.code) {
//                 cities2.push({
//                     citycode:v.code,
//                     pmtilesurl:'999',
//                     public: 2,
//                     page: v.page
//                 })
//             }
//         })
//         console.log(cities2)
//         cities = [...cities, ...cities2];
//
//         async function cityGeojson() {
//             try {
//                 const response1 = await axios.post('https://kenzkenz.duckdns.org/myphp/city_geojson.php', {
//                     cities: cities
//                     // cities: [{citycode:'45201',pmtilesurl:'9999'}]
//                 });
//                 console.log(response1)
//                 if (response1.data.error) {
//                     console.error('エラー:', response1.data.error);
//                     // alert(`エラー: ${response.data.error}`);
//                 } else {
//                     console.log('成功:', response1.data);
//                     const maps = [store.state.map01,store.state.map02]
//                     maps.forEach(map => {
//                         map.getStyle().layers.forEach(layer => {
//                             if (layer.id.includes('oh-chibanL-') && layer.id.includes(id)) {
//                                 map.removeLayer(layer.id)
//                             }
//                         })
//                     })
//                     setTimeout(() => {
//                         store.state.loading2 = false
//                         alert('設定を反映するには再読み込みしてください。')
//                     },0)
//                 }
//             } catch (error) {
//                 console.error('リクエストエラー:', error);
//             }
//         }
//         cityGeojson()
//     })
// }

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

        const response = await fetch('https://kenzkenz.duckdns.org/myphp/geojsonToDxf.php', {
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





