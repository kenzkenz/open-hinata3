import store from '@/store'
import {GITHUB_TOKEN} from "@/js/config";
import * as turf from '@turf/turf'
import maplibregl from 'maplibre-gl'
import proj4 from 'proj4'
import axios from "axios";
import {geotiffSource, geotiffLayer, jpgSource, jpgLayer} from "@/js/layers";
import JSZip from 'jszip'
// 複数のクリックされた地番を強調表示するためのセット
// export let highlightedChibans = new Set();
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


    // proj4.defs([
    //     ["EPSG:6668", "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],   // 第1系
    //     ["EPSG:6669", "+proj=tmerc +lat_0=33 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],   // 第2系
    //     ["EPSG:6670", "+proj=tmerc +lat_0=36 +lon_0=132.1667 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"], // 第3系
    //     ["EPSG:6671", "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],   // 第4系
    //     ["EPSG:6672", "+proj=tmerc +lat_0=36 +lon_0=134.3333 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"], // 第5系
    //     ["EPSG:6673", "+proj=tmerc +lat_0=36 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],   // 第6系
    //     ["EPSG:6674", "+proj=tmerc +lat_0=36 +lon_0=137.1667 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"], // 第7系
    //     ["EPSG:6675", "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],   // 第8系
    //     // ["EPSG:6676", "+proj=tmerc +lat_0=36 +lon_0=139.8333 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"], // 第9系がおかしい
    //     // ["EPSG:6676", "+proj=tmerc +lat_0=36 +lon_0=139.833333 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],
    //     // ["EPSG:6676", "+proj=tmerc +lat_0=36 +lon_0=139.833333 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +x_0=1 +y_0=-0.019 +no_defs"],
    //     ["EPSG:6677", "+proj=tmerc +lat_0=40 +lon_0=140.8333 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"], // 第10系
    //     ["EPSG:6678", "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],   // 第11系
    //     ["EPSG:6679", "+proj=tmerc +lat_0=44 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],    // 第12系
    //     ["EPSG:6680", "+proj=tmerc +lat_0=44 +lon_0=144.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],    // 第13系
    //     ["EPSG:6681", "+proj=tmerc +lat_0=26 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],    // 第14系
    //     ["EPSG:6682", "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],    // 第15系
    //     ["EPSG:6683", "+proj=tmerc +lat_0=26 +lon_0=124.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],    // 第16系
    //     ["EPSG:6684", "+proj=tmerc +lat_0=26 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],    // 第17系
    //     ["EPSG:6685", "+proj=tmerc +lat_0=20 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"],    // 第18系
    //     ["EPSG:6686", "+proj=tmerc +lat_0=26 +lon_0=154.0 +k=0.9999 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"]     // 第19系
    // ]);
    // proj4.defs['EPSG:2451'] = proj4.Proj("+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");	// 9邉ｻ
    //

})()
const zahyokei = [
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
    // { kei: '公共座標1系', code: "EPSG:6668" },
    // { kei: '公共座標2系', code: "EPSG:6669" },
    // { kei: '公共座標3系', code: "EPSG:6670" },
    // { kei: '公共座標4系', code: "EPSG:6671" },
    // { kei: '公共座標5系', code: "EPSG:6672" },
    // { kei: '公共座標6系', code: "EPSG:6673" },
    // { kei: '公共座標7系', code: "EPSG:6674" },
    // { kei: '公共座標8系', code: "EPSG:6675" },
    // // { kei: '公共座標9系', code: "EPSG:6676" },
    // { kei: '公共座標9系', code: "EPSG:2451" },
    // { kei: '公共座標10系', code: "EPSG:6677" },
    // { kei: '公共座標11系', code: "EPSG:6678" },
    // { kei: '公共座標12系', code: "EPSG:6679" },
    // { kei: '公共座標13系', code: "EPSG:6680" },
    // { kei: '公共座標14系', code: "EPSG:6681" },
    // { kei: '公共座標15系', code: "EPSG:6682" },
    // { kei: '公共座標16系', code: "EPSG:6683" },
    // { kei: '公共座標17系', code: "EPSG:6684" },
    // { kei: '公共座標18系', code: "EPSG:6685" },
    // { kei: '公共座標19系', code: "EPSG:6686" }
];
// codeからkeiを取得する関数
function getKeiByCode(code) {
    const result = zahyokei.find(item => item.code === code);
    return result ? result.kei : null;
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
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    const geojsonText = JSON.stringify(exportLayerToGeoJSON(map,layerId,sourceId,fields))
    console.log(geojsonText)
    uploadGeoJSONToGist(geojsonText, 'GeoJSON Dataset Upload');
}

// geojsonから最小の地番を取得する関数
function getChibanAndHoka(geojson,isDxf) {

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

    // 地番の最小値を取得
    let firstChiban = geojson.features
        .map(feature => feature.properties?.地番) // 地番を抽出
        .filter(chiban => chiban !== undefined && chiban !== null) // undefinedやnullを除外
        .map(chiban => Number(chiban)) // 数値に変換（地番が数値型である場合）
        .filter(chiban => !isNaN(chiban)) // NaNを除外
        .reduce((min, current) => Math.min(min, current), Infinity); // 最小値を取得
    if (firstChiban === Infinity) {
        // 有効な地番が見つからない場合、最初の地番を取得
        firstChiban = geojson.features[0]?.properties?.地番 || '';
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
}
// GeoJSONから最初に現れる「基準点等名称」または「街区点・補助点名称」を取得する関数
function getFirstPointName(geojson) {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.warn('GeoJSONが無効または空です');
        return { pointName: '', hoka: '' };
    }

    // 最初に見つかった「基準点等名称」または「街区点・補助点名称」を取得
    let pointName = geojson.features
        .map(feature => feature.properties?.['基準点等名称'] || feature.properties?.['街区点・補助点名称'])
        .find(name => name !== undefined && name !== null && name !== '');

    if (!pointName) {
        pointName = geojson.features[0]?.properties?.['基準点等名称'] || geojson.features[0]?.properties?.['街区点・補助点名称'] || '';
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


function convertAndDownloadGeoJSONToSIMA(map,layerId,geojson, fileName, kaniFlg, zahyokei2, kukaku,jww, kei2) {
    console.log(geojson)
    geojson = extractHighlightedGeoJSONFromSource(geojson,layerId)
    console.log(geojson)
    if (!geojson || geojson.type !== 'FeatureCollection') {
        throw new Error('無効なGeoJSONデータです。FeatureCollectionが必要です。');
    }
    let zahyo
    console.log(layerId)
    if (layerId ==='oh-amx-a-fude') {
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
    if (kukaku) {
        alert(kei + 'で区画ファイルを作ります。作図範囲は1区画です。ドーナツ形状には対応していません。')
    } else {
        if (kaniFlg) {
            alert('注!簡易の場合、座標値は元データとほんの少し異なります。座標の利用は自己責任でお願いします。' + kei + 'でsimファイルを作ります。')
        } else {
            // alert(kei + 'でsimファイルを作ります。')
        }
    }

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';

    let A01Text = '';
    let B01Text = '';
    let i = 1;
    let j = 1;

    // 座標とカウンターを関連付けるマップ
    const coordinateMap = new Map();
    const firstChiban = getChibanAndHoka(geojson).firstChiban
    const hoka = getChibanAndHoka(geojson).hoka
    geojson.features.forEach((feature) => {
        let chiban = feature.properties.地番;
        switch (layerId) {
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
            case 'oh-chibanzu-京都市':
            case 'oh-chibanzu-舟形町':
                chiban = feature.properties.TIBAN
                break
            case 'oh-chibanzu-磐田市':
            case 'oh-chibanzu-福島市':
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
            case 'oh-chibanzu-長与町':
                chiban = feature.properties.SAFIELD002
                break
            case 'oh-chibanzu-伊丹市':
                chiban = feature.properties.所在地番
                break
            case 'oh-chibanzu-豊中市':
                chiban = feature.properties.TEXTCODE1
                break
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

    document.querySelector('.loadingImg').style.display = 'none'

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

export function saveCima(map, layerId, sourceId, fields, kaniFlg, kei) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    const geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields);
    console.log(geojson)
    convertAndDownloadGeoJSONToSIMA(map,layerId,geojson,'簡易_',kaniFlg,kei);
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




    console.log(geojson)
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

export function saveCsv(map, layerId, sourceId, fields) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。')
        return
    }
    const geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields);
    console.log(geojson)
    downloadGeoJSONAsCSV(geojson)
}


export function simaToGeoJSON(simaData, map, simaZahyokei, isFlyto) {
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
                    chiban: chiban
                },
                geometry: {
                    type: 'Point',
                    coordinates: coordinates[id]
                }
            });
        }
    });

    // GeoJSONオブジェクトを生成
    const geoJSON = {
        type: 'FeatureCollection',
        features: features
    };
    // console.log(JSON.stringify(geoJSON, null, 2));

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
                layout: {},
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
                filter: ['==', '$type', 'Point']
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
        map.fitBounds(bounds, { padding: 20 });
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
            console.warn(`系 ${i + 1} の変換でエラー:`, error);
        }
    }
    return closestZone;
}

async function detailGeojson(map, layerId, kukaku) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。');
        return;
    }
    let prefId = String(store.state.prefId).padStart(2, '0');
    console.log('初期 prefId:', prefId);

    let fgb_URL;
    let retryAttempted = false;

    function getFgbUrl(prefId) {
        const specialIds = ['07', '15', '22', '26', '28', '29', '40', '43', '44','45','47'];
        return specialIds.includes(prefId)
            ? `https://kenzkenz3.xsrv.jp/fgb/2024/${prefId}.fgb`
            : `https://habs.rad.naro.go.jp/spatial_data/amxpoly47/amxpoly_2022_${prefId}.fgb`;
    }

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
    console.log(store.state.highlightedChibans.size);
    if (store.state.highlightedChibans.size > 0) {
        bbox = getBoundingBoxByLayer(map, layerId);
    } else {
        bbox = fgBoundingBox();
    }

    async function deserializeAndPrepareGeojson(layerId) {
        const geojson = { type: 'FeatureCollection', features: [] };
        console.log('データをデシリアライズ中...');
        fgb_URL = getFgbUrl(prefId);
        // alert(fgb_URL)
        const iter = window.flatgeobuf.deserialize(fgb_URL, bbox);

        for await (const feature of iter) {
            geojson.features.push(feature);
        }
        console.log('取得した地物:', geojson);
        if (geojson.features.length === 0) {
            if (prefId !== '43') {
                console.warn('地物が存在しません。prefIdを43に変更して再試行します。');
                alert('データが見つかりませんでした。再試行します。')
                prefId = '43';
                retryAttempted = true;
                await deserializeAndPrepareGeojson(layerId);
            } else {
                alert('地物が一つもありません。「簡易」で出力します。。');
                saveCima(map,'oh-amx-a-fude','amx-a-pmtiles',['市区町村コード','大字コード','丁目コード','小字コード','予備コード','地番'],true)
            }
            return;
        }

        convertAndDownloadGeoJSONToSIMA(map, layerId, geojson, '詳細_', false,'',kukaku);
    }
    deserializeAndPrepareGeojson(layerId);
}


export async function saveSima2(map, layerId, kukaku, isDfx, sourceId, fields, kei) {
    if (map.getZoom() <= 15) {
        alert('ズーム15以上にしてください。');
        return;
    }
    document.querySelector('.loadingImg').style.display = 'block'
    let prefId = String(store.state.prefId).padStart(2, '0');
    console.log('初期 prefId:', prefId);

    let fgb_URL;
    let retryAttempted = false;
    // ここを改修する必要あり。amxと24自治体以外の動きがあやしい。
    function getFgbUrl(prefId) {
        const specialIds = ['07', '15', '22', '26', '28', '29', '40', '43', '44','45','47'];
        switch (layerId) {
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
        console.log(isDfx)
        if (!isDfx) {
            console.log(geojson)
            if (layerId === 'oh-amx-a-fude') {
                geojson = extractMatchingFeatures(map,geojson)
            }
            console.log(geojson)
            convertAndDownloadGeoJSONToSIMA(map, layerId, geojson, '詳細_', false, '', kukaku);
        } else {
            console.log(geojson)
            saveDxf (map, layerId, sourceId, fields, geojson, kei)
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
    document.querySelector('.loadingImg').style.display = 'none'
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
        'fill-color',
        [
            "case",
            ["in", "道", ["get", "地番"]],
            "rgba(192, 192, 192, 0.7)", // 道っぽい灰色
            ["in", "水", ["get", "地番"]],
            "rgba(135, 206, 250, 0.7)", // 水っぽい青色
            "rgba(254, 217, 192, 0)" // それ以外は透明
        ],
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
                // 'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
                [
                    "case",
                    ["in", "道", ["get", "地番"]],
                    "rgba(192, 192, 192, 0.7)", // 道っぽい灰色
                    ["in", "水", ["get", "地番"]],
                    "rgba(135, 206, 250, 0.7)", // 水っぽい青色
                    "rgba(254, 217, 192, 0)" // それ以外は透明
                ],
            ]
        );
    }, sec)
    isFirstRun = false
}
let isFirstRunCity1 = true;
export function highlightSpecificFeaturesCity(map,layerId) {
    console.log(store.state.highlightedChibans);
    console.log(Array.from(store.state.highlightedChibans))
    console.log(layerId)
    let sec = 0
    if (isFirstRunCity1) {
        sec = 1000
    } else {
        sec = 0
    }
    setTimeout(() => {
        console.log(Array.from(store.state.highlightedChibans))
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
            case 'oh-chibanzu-音更町':
            case 'oh-chibanzu-ニセコ町':
            case 'oh-chibanzu-室蘭市':
                fields = ['concat', ['get', 'id']]
                break

        }
        console.log(layerId)
        console.log(fields)
        console.log(Array.from(store.state.highlightedChibans))
        map.setPaintProperty(
            layerId,
            'fill-color',
            [
                'case',
                [
                    'in',
                    fields,
                    ['literal', Array.from(store.state.highlightedChibans)]
                ],
                'rgba(255, 0, 0, 0.5)', // クリックされた地番が選択された場合
                'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
            ]
        );
    }, sec)
    isFirstRunCity1 = false
}
// 特定のレイヤーから地物を取得し、フィルタリング後にBBOXを計算する関数
function getBoundingBoxByLayer(map, layerId) {
    // 地物をフィルタリング
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
    console.log(chyome)
    const filteredFeatures = map.queryRenderedFeatures({
        layers: [layerId] // 対象のレイヤーIDを指定
    }).filter(feature => {
        let targetId;
        switch (layerId) {
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
            case 'oh-chibanzu-音更町':
            case 'oh-chibanzu-ニセコ町':
            case 'oh-chibanzu-室蘭市':
                targetId = `${feature.properties['id']}`;
                break;
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
    console.log(chyome)
    const filteredFeatures = geojsonData.features.filter(feature => {
        let targetId;
        switch (layerId) {
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
            case 'oh-chibanzu-音更町':
            case 'oh-chibanzu-ニセコ町':
            case 'oh-chibanzu-室蘭市':
                targetId = `${feature.properties['id']}`;
                break;
        }
        console.log(targetId)
         // amx2024対策
         if (layerId === 'oh-amx-a-fude') {
             return chiban.includes(feature.properties['地番'])
             // return chiban.includes(feature.properties['地番']) && chyome.includes(feature.properties['丁目名'])
         } else {
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
        alert('データ取得失敗')
        return
        // geojson = geojsonData
    }
    console.log('Extracted GeoJSON from Source:', geojson);
    return geojson;
}

// 全フィーチャの選択状態をリセットする関数
export function resetFeatureColors(map,layerId) {
    store.state.highlightedChibans.clear();
    // map.setPaintProperty(
    //     layerId,
    //     'fill-color',
    //     'rgba(0, 0, 0, 0)' // 全ての地番+丁目コードを透明にリセット
    // );

    map.setPaintProperty(
        layerId,
        'fill-color',
        [
            "case",
            ["in", "道", ["get", "地番"]],
            "rgba(192, 192, 192, 0.7)", // 道っぽい灰色
            ["in", "水", ["get", "地番"]],
            "rgba(135, 206, 250, 0.7)", // 水っぽい青色
            "rgba(254, 217, 192, 0)" // それ以外は透明
        ],
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
function extractMatchingFeatures(map,geojson) {
    const layerId = 'oh-amx-a-fude'
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
        const specialIds = ['07', '15', '22', '26', '28', '29', '40', '43', '44','45','47'];
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

export function downloadSimaText () {
    const simaText = JSON.parse(store.state.simaText).text;
    // UTF-8で文字列をコードポイントに変換
    const utf8Array = window.Encoding.stringToCode(simaText);
    // UTF-8からShift-JISに変換
    const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
    // Shift-JISエンコードされたデータをUint8Arrayに格納
    const uint8Array = new Uint8Array(shiftJISArray);
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' }); // MIMEタイプを変更
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sima.sim'; // ファイル名を'sima.sim'に設定
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export async function addImageLayer(tiffFile, worldFile, code, isFirst) {

    const map = store.state.map01;
    const map2 = store.state.map02;
    // ワールドファイルを読み込む
    const worldFileText = await worldFile.text();
    const [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);

    // GeoTIFF.jsを使用してTIFFファイルを読み込む
    const arrayBuffer = await tiffFile.arrayBuffer();
    const tiff = await window.GeoTIFF.fromArrayBuffer(arrayBuffer);
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

    for (let i = 0; i < width * height; i++) {
        const red = rasters[0][i] !== undefined ? rasters[0][i] : 128; // 赤
        const green = isMonochrome ? red : (rasters[1][i] !== undefined ? rasters[1][i] : 128); // 緑
        const blue = isMonochrome ? red : (rasters[2][i] !== undefined ? rasters[2][i] : 128); // 青

        imageData.data[i * 4] = red;
        imageData.data[i * 4 + 1] = green;
        imageData.data[i * 4 + 2] = blue;
        imageData.data[i * 4 + 3] = 255; // アルファ値（不透明）
    }

    ctx.putImageData(imageData, 0, 0);

    // 平面直角座標系の範囲を緯度経度に変換
    let bounds = [
        [originX, originY], // 左上
        [originX + pixelSizeX * width, originY], // 右上
        [originX + pixelSizeX * width, originY + pixelSizeY * height], // 右下
        [originX, originY + pixelSizeY * height] // 左下
    ].map(coord => proj4(code, 'EPSG:4326', coord));

    let index = 0;
    const result = store.state.selectedLayers['map01'].find((v, i) => {
        index = i;
        return v.id === 'oh-geotiff-layer';
    });

    store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-geotiff-layer');
    store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-geotiff-layer');

    geotiffSource.obj.url = canvas.toDataURL();
    geotiffSource.obj.coordinates = bounds;

    if (map.getLayer('oh-geotiff-layer')) {
        map.removeLayer('oh-geotiff-layer');
        map2.removeLayer('oh-geotiff-layer');
    }
    if (map.getSource('geotiff-source')) {
        map.removeSource('geotiff-source');
        map2.removeSource('geotiff-source');
    }
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
}


// export async function addImageLayer (tiffFile,worldFile,code,isFirst) {
//
//     const map = store.state.map01
//     const map2 = store.state.map02
//     // ワールドファイルを読み込む
//     const worldFileText = await worldFile.text();
//     const [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);
//
//     // GeoTIFF.jsを使用してTIFFファイルを読み込む
//     const arrayBuffer = await tiffFile.arrayBuffer();
//     const tiff = await window.GeoTIFF.fromArrayBuffer(arrayBuffer);
//     const image = await tiff.getImage();
//
//     const width = image.getWidth();
//     const height = image.getHeight();
//     const rasters = await image.readRasters({ samples: [0, 1, 2] }); // RGBバンドを指定
//
//     // Canvasにカラー画像を描画
//     const canvas = document.createElement('canvas');
//     canvas.width = width;
//     canvas.height = height;
//     const ctx = canvas.getContext('2d');
//     const imageData = ctx.createImageData(width, height);
//
//     for (let i = 0; i < width * height; i++) {
//         imageData.data[i * 4] = rasters[0][i];     // 赤バンド
//         imageData.data[i * 4 + 1] = rasters[1][i]; // 緑バンド
//         imageData.data[i * 4 + 2] = rasters[2][i]; // 青バンド
//         imageData.data[i * 4 + 3] = 255;           // アルファ値（不透明）
//     }
//
//     ctx.putImageData(imageData, 0, 0);
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
//
//     store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-geotiff-layer')
//     store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-geotiff-layer')
//
//     geotiffSource.obj.url = canvas.toDataURL()
//     geotiffSource.obj.coordinates = bounds
//
//     if (map.getLayer('oh-geotiff-layer')) {
//         map.removeLayer('oh-geotiff-layer')
//         map2.removeLayer('oh-geotiff-layer')
//     }
//     if (map.getSource('geotiff-source')) {
//         map.removeSource('geotiff-source')
//         map2.removeSource('geotiff-source')
//     }
//     store.state.selectedLayers['map01'].splice(index, 0,
//         {
//             id: 'oh-geotiff-layer',
//             label: 'geotiffレイヤー',
//             source: geotiffSource,
//             layers: [geotiffLayer],
//             opacity: 1,
//             visibility: true,
//         }
//     )
//
//     store.state.selectedLayers['map02'].splice(index, 0,
//         {
//             id: 'oh-geotiff-layer',
//             label: 'geotiffレイヤー',
//             source: geotiffSource,
//             layers: [geotiffLayer],
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
//         map.fitBounds(flyToBounds, {padding: 20});
//     } else {
//         setTimeout(function() {
//             store.state.map01.zoomTo(currentZoom + 0.01, {duration: 500})
//             store.state.map02.zoomTo(currentZoom + 0.01, {duration: 500})
//         },0)
//     }
// }

export async function addImageLayerJpg(jpgFile, worldFile, code, isFirst) {
    const map = store.state.map01;
    const map2 = store.state.map02;

    // ワールドファイルを読み込む
    const worldFileText = await worldFile.text();
    const [pixelSizeX, rotationX, rotationY, pixelSizeY, originX, originY] = worldFileText.split('\n').map(Number);

    // JPGファイルを読み込む
    const imageUrl = URL.createObjectURL(jpgFile);
    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
    });

    const width = img.width;
    const height = img.height;

    // 平面直角座標系の範囲を緯度経度に変換
    let bounds = [
        [originX, originY], // 左上
        [originX + pixelSizeX * width, originY], // 右上
        [originX + pixelSizeX * width, originY + pixelSizeY * height], // 右下
        [originX, originY + pixelSizeY * height] // 左下
    ].map(coord => proj4(code, 'EPSG:4326', coord));

    let index = 0
    const result = store.state.selectedLayers['map01'].find((v,i) => {
        index = i
        return v.id === 'oh-geotiff-layer'
    })
    if (!result) {
        index = 0
        store.state.selectedLayers['map01'].find((v,i) => {
            index = i
            return v.id === 'oh-jpg-layer'
        })
    }

    store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-geotiff-layer')
    store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-geotiff-layer')
    store.state.selectedLayers['map01'] = store.state.selectedLayers['map01'].filter(v => v.id !== 'oh-jpg-layer');
    store.state.selectedLayers['map02'] = store.state.selectedLayers['map02'].filter(v => v.id !== 'oh-jpg-layer');

    jpgSource.obj.url = imageUrl
    jpgSource.obj.coordinates = bounds

    if (map.getLayer('oh-jpg-layer')) {
        map.removeLayer('oh-jpg-layer')
        map2.removeLayer('oh-jpg-layer')
    }
    if (map.getSource('jpg-source')) {
        map.removeSource('jpg-source')
        map2.removeSource('jpg-source')
    }
    store.state.selectedLayers['map01'].splice(index, 0,
        {
            id: 'oh-jpg-layer',
            label: 'jpgレイヤー',
            source: jpgSource,
            layers: [jpgLayer],
            opacity: 1,
            visibility: true,
        }
    )
    store.state.selectedLayers['map02'].splice(index, 0,
        {
            id: 'oh-jpg-layer',
            label: 'jpgレイヤー',
            source: jpgSource,
            layers: [jpgLayer],
            opacity: 1,
            visibility: true,
        }
    )









    // if (map.getLayer('oh-jpg-layer')) {
    //     map.removeLayer('oh-jpg-layer')
    //     map2.removeLayer('oh-jpg-layer')
    // }
    // if (map.getSource('jpg-source')) {
    //     map.removeSource('jpg-source')
    //     map2.removeSource('jpg-source')
    // }
    //
    // store.state.selectedLayers['map01'].unshift(
    //     {
    //         id: 'oh-jpg-layer',
    //         label: 'jpgレイヤー',
    //         source: jpgSource,
    //         layers: [jpgLayer],
    //         opacity: 1,
    //         visibility: true,
    //     }
    // )
    //
    // store.state.selectedLayers['map02'].unshift(
    //     {
    //         id: 'oh-jpg-layer',
    //         label: 'jpgレイヤー',
    //         source: jpgSource,
    //         layers: [jpgLayer],
    //         opacity: 1,
    //         visibility: true,
    //     }
    // )





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
            // store.state.map02.zoomTo(currentZoom + 0.01, { duration: 500 });
        }, 0);
    }
}



export async function geoTiffLoad (map,mapName,isUpload) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    const files = store.state.tiffAndWorldFile
    console.log(files)
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

// export function pngDownload(map) {
//     const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
//     // 地図のレンダリング完了を待機
//     map.once('idle', () => {
//         const canvas = map.getCanvas();
//         const imageData = canvas.toDataURL("image/png");
//         // 画像をダウンロード
//         let link = document.createElement("a");
//         link.href = imageData;
//         link.download = "map-image.png";
//         // link.click();
//
//         // ワールドファイルの生成
//         const bounds = map.getBounds(); // 地図の表示範囲を取得
//         const canvasWidth = canvas.width;
//         const canvasHeight = canvas.height;
//
//         // WGS 84 -> 平面直角座標系2系に変換
//         const topLeft = proj4('EPSG:4326', code, [bounds.getWest(), bounds.getNorth()]);
//         const bottomRight = proj4('EPSG:4326', code, [bounds.getEast(), bounds.getSouth()]);
//
//         const xMin = topLeft[0];
//         const xMax = bottomRight[0];
//         const yMin = bottomRight[1];
//         const yMax = topLeft[1];
//
//         const pixelWidth = (xMax - xMin) / canvasWidth;
//         const pixelHeight = (yMax - yMin) / canvasHeight;
//
//         const worldFileContent = `
//             ${pixelWidth}
//             0
//             0
//             -${pixelHeight}
//             ${xMin + pixelWidth / 2}
//             ${yMax - pixelHeight / 2}
//             `.trim();
//
//         // ワールドファイルをダウンロード
//         let blob = new Blob([worldFileContent], { type: "text/plain" });
//         const worldFileLink = document.createElement("a");
//         worldFileLink.href = URL.createObjectURL(blob);
//         worldFileLink.download = "map-image.pgw"; // 適切な拡張子
//         // worldFileLink.click();
//
//         // simaファイル
//         let simaData = 'G00,01,open-hinata3,\n';
//         simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
//         simaData += 'A00,\n';
//         let A01Text = '';
//         A01Text += 'A01,' + 1 + ',' + 1 + ',' + yMax + ',' + xMin + ',\n';
//         A01Text += 'A01,' + 2 + ',' + 2 + ',' + yMax + ',' + xMax + ',\n';
//         A01Text += 'A01,' + 3 + ',' + 3 + ',' + yMin + ',' + xMin + ',\n';
//         A01Text += 'A01,' + 4 + ',' + 4 + ',' + yMin + ',' + xMax + ',\n';
//         simaData += A01Text + 'A99,END,,\n';
//
//         // UTF-8で文字列をコードポイントに変換
//         const utf8Array = window.Encoding.stringToCode(simaData);
//         // UTF-8からShift-JISに変換
//         const shiftJISArray = window.Encoding.convert(utf8Array, 'SJIS');
//         // Shift-JISエンコードされたデータをUint8Arrayに格納
//         const uint8Array = new Uint8Array(shiftJISArray);
//         // Blobを作成（MIMEタイプを変更）
//         blob = new Blob([uint8Array], { type: 'application/octet-stream' });
//
//         // ダウンロード用リンクを作成
//         link = document.createElement('a');
//         link.href = URL.createObjectURL(blob);
//
//         link.download = "map-image.sim"; // ファイル名を正確に指定
//         // リンクをクリックしてダウンロード
//         // link.click();
//         URL.revokeObjectURL(link.href);
//
//         // DXFファイル
//         // GeoJSONの初期構造
//         const geojson = {
//             type: "FeatureCollection",
//             features: []
//         };
//         // ポイントを作成する関数
//         function createPoint(x, y) {
//             return {
//                 type: "Feature",
//                 geometry: {
//                     type: "Point",
//                     coordinates: [x, y]
//                 },
//                 properties: {} // 必要に応じて属性を追加
//             };
//         }
//         // 4つのポイントの座標を定義
//         const points = [
//             createPoint(xMin, yMin), // 左下
//             createPoint(xMax, yMin), // 右下
//             createPoint(xMin, yMax), // 左上
//             createPoint(xMax, yMax)  // 右上
//         ];
//         // pointsをGeoJSONのfeaturesに追加
//         geojson.features.push(...points);
//         // 結果を表示
//         console.log(JSON.stringify(geojson, null, 2));
//         const dxfString = geojsonToDXF(geojson)
//         // DXFファイルとしてダウンロード
//         blob = new Blob([dxfString], { type: 'application/dxf' });
//         link = document.createElement('a');
//         link.href = URL.createObjectURL(blob);
//         link.download = "map-image.dxf";
//
//         link.click();
//     });
//     const currentZoom = map.getZoom();
//     // 地図をズームさせる
//     map.zoomTo(currentZoom + 0.001, { duration: 500 }); // 0.1だけズームイン（アニメーション付き）
// }

export function pngDownload(map) {
    const code = zahyokei.find(item => item.kei === store.state.zahyokei).code;
    // 地図のレンダリング完了を待機
    map.once('idle', async () => {
        const zip = new JSZip();

        const canvas = map.getCanvas();
        const imageData = canvas.toDataURL("image/png");
        // PNGファイルを追加
        const pngBlob = await fetch(imageData).then(res => res.blob());
        zip.file("map-image.png", pngBlob);

        // ワールドファイルの生成
        const bounds = map.getBounds(); // 表示範囲を取得
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

    const currentZoom = map.getZoom();
    map.zoomTo(currentZoom + 0.00000000000000000000000000001);
}


