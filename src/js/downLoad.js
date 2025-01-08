import store from '@/store'
import {GITHUB_TOKEN} from "@/js/config";
import * as turf from '@turf/turf'
import maplibregl from 'maplibre-gl'
import proj4 from 'proj4'
import vuetify from "@/plugins/vuetify";
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
function getChibanAndHoka(geojson) {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.warn('GeoJSONが無効または空です');
        return { firstChiban: '', hoka: '' };
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
            alert('注!簡易の場合、座標値は暫定です。座標の利用は自己責任でお願いします。' + kei + 'でsimファイルを作ります。')
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
        const chiban = feature.properties.地番;
        B01Text += 'D00,' + i + ',' + chiban + ',1,\n';
        let coordinates = [];
        if (feature.geometry.type === 'Polygon') {
            coordinates = feature.geometry.coordinates.map(ring => {
                // 最後の点が最初の点と同じ場合、最後の点を削除
                if (
                    ring.length > 1 &&
                    ring[0][0] === ring[ring.length - 1][0] &&
                    ring[0][1] === ring[ring.length - 1][1]
                ) {
                    return ring.slice(0, -1);
                }
                return ring;
            }).flat();
        } else if (feature.geometry.type === 'MultiPolygon') {
            coordinates = feature.geometry.coordinates.map(polygon =>
                polygon.map(ring => {
                    if (
                        ring.length > 1 &&
                        ring[0][0] === ring[ring.length - 1][0] &&
                        ring[0][1] === ring[ring.length - 1][1]
                    ) {
                        return ring.slice(0, -1);
                    }
                    return ring;
                }).flat()
            ).flat();
        } else {
            console.warn('Unsupported geometry type:', feature.geometry.type);
            return; // 他のタイプはスキップ
        }

        const len = coordinates.length;

        coordinates.forEach((coord, index) => {
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
                if (index === len - 1) {
                    B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\nD99,\n';
                } else {
                    B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\n';
                }
            } else {
                console.error('Invalid coordinate skipped:', coord);
            }
        });

        i++;
    });

    simaData = simaData + A01Text + 'A99\nZ00,区画データ,\n' + B01Text
    // console.log(simaData)
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



    // alert('test')



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

    console.log(geojson)
    try {
        const dxfString = geojsonToDXF(geojson);
        // DXFファイルとしてダウンロード
        const blob = new Blob([dxfString], { type: 'application/dxf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);

        const firstChiban = getChibanAndHoka(geojson).firstChiban
        const hoka = getChibanAndHoka(geojson).hoka
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
    const headers = ['latitude', 'longitude', ...propertyKeys];

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

// SIMAファイルをGeoJSONに変換する関数
export function simaToGeoJSON(simaData,map,simaZahyokei) {
    if (!simaData) return
    console.log(simaData)
    const lines = simaData.split('\n');
    let coordinates = {}; // 座標データを格納
    let features = []; // GeoJSONのフィーチャーを格納
    let currentFeature = null;
    let firstCoordinateChecked = false;
    let detectedCRS
    let code
    if (!simaZahyokei) {
        code = zahyokei.find(item => item.kei === store.state.zahyokei).code
    } else {
        console.log(simaZahyokei)
        code = zahyokei.find(item => item.kei === simaZahyokei).code
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
                console.log(detectedCRS)
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
            // 新しいフィーチャーの開始
            currentFeature = {
                type: 'Feature',
                properties: { id: parts[1].trim() },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[]]
                }
            };
        } else if (type === 'B01' && currentFeature) {
            const coordId = parts[1].trim();
            if (coordinates[coordId]) {
                currentFeature.geometry.coordinates[0].push(coordinates[coordId]);
            }
        } else if (type === 'D99' && currentFeature) {
            // フィーチャー終了
            features.push(currentFeature);
            currentFeature = null;
        }
    });

    // GeoJSONオブジェクトを生成
    const geoJSON = {
        type: 'FeatureCollection',
        features: features
    };
    console.log(JSON.stringify(geoJSON, null, 2));

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
                    'fill-opacity': 0.5
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
        }
    }
    // GeoJSONの範囲にフライ (地図を移動)
    const bounds = new maplibregl.LngLatBounds();
    geoJSON.features.forEach(feature => {
        feature.geometry.coordinates[0].forEach(coord => {
            bounds.extend(coord);
        });
    });
    map.fitBounds(bounds, { padding: 20 });

    // GeoJSONをダウンロード
    // const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = 'output.geojson';
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    // setTimeout(() => URL.revokeObjectURL(url), 1000);
    //
    // ファイル入力をリセット
    const uploadInput = document.querySelector('#simaFileInput');
    if (uploadInput) {
        uploadInput.value = '';
    }
    return JSON.stringify(geoJSON, null, 2);
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
    reader.onload = function(e) {
        const simaData = e.target.result;
        console.log(store.state.zahyokei)
        store.state.simaZahyokei.map01 = store.state.zahyokei
        store.state.simaData.map01 = simaData
        try {
            const map = store.state.map01
            const geoJSON = simaToGeoJSON(simaData,map);
            console.log(geoJSON);
        } catch (error) {
            console.error(`変換エラー: ${error.message}`);
        }
    };
    reader.readAsText(file);
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
        const specialIds = ['22', '26', '29', '40', '43', '44','45','47'];
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
        const specialIds = ['07','22', '26', '29', '40', '43', '44','45','47'];
        switch (layerId) {
            case 'oh-chibanzu2024':
                return 'https://kenzkenz3.xsrv.jp/fgb/Chibanzu_2024_with_id.fgb'
            case 'oh-amx-a-fude':
                return specialIds.includes(prefId)
                    ? `https://kenzkenz3.xsrv.jp/fgb/2024/${prefId}.fgb`
                    : `https://habs.rad.naro.go.jp/spatial_data/amxpoly47/amxpoly_2022_${prefId}.fgb`
        }
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
    console.log(store.state.highlightedChibans)
    if (store.state.highlightedChibans.size > 0) {
        // console.log(fgBoundingBox())
        bbox = getBoundingBoxByLayer(map, layerId);
        // console.log(bbox)
        // bboxが画面内にあるかどうかをチェック
        console.log(bbox.minX)
        if (bbox.minX === Infinity) bbox = fgBoundingBox()
        // function isBBoxInView(bbox) {
        //     const mapBounds = map.getBounds();
        //     return (
        //         bbox[0][0] >= mapBounds.getWest() && // bboxの西端が画面の西端より右
        //         bbox[1][0] <= mapBounds.getEast() && // bboxの東端が画面の東端より左
        //         bbox[0][1] >= mapBounds.getSouth() && // bboxの南端が画面の南端より上
        //         bbox[1][1] <= mapBounds.getNorth()   // bboxの北端が画面の北端より下
        //     );
        // }
        // if (!isBBoxInView(bbox)) bbox = fgBoundingBox();
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
            if (layerId === 'oh-amx-a-fude') {
                geojson = extractMatchingFeatures(map,geojson)
            }
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
    setTimeout(() => {
        map.setPaintProperty(
            layerId,
            'fill-color',
            [
                'case',
                [
                    'in',
                    ['concat', ['get', '丁目コード'], '_', ['get', '小字コード'], '_', ['get', '地番']],
                    ['literal', Array.from(store.state.highlightedChibans)]
                ],
                'rgba(255, 0, 0, 0.5)', // クリックされた地番が選択された場合
                'rgba(0, 0, 0, 0)' // クリックされていない場合は透明
            ]
        );
    }, sec)
    isFirstRun = false
}
let isFirstRunCity1 = true;
export function highlightSpecificFeaturesCity(map,layerId) {
    // alert(store.state.highlightedChibans.size)
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
    const filteredFeatures = map.queryRenderedFeatures({
        layers: [layerId] // 対象のレイヤーIDを指定
    }).filter(feature => {
        let targetId;
        switch (layerId) {
            case 'oh-chibanzu2024':
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-amx-a-fude':
                targetId = `${feature.properties['丁目コード']}_${feature.properties['小字コード']}_${feature.properties['地番']}`;
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
        // console.log(store.state.highlightedChibans)
        return store.state.highlightedChibans.has(targetId); // 特定のIDセットに含まれているか
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
                console.log(coordinates)
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


    console.log({
        minX,
        minY,
        maxX,
        maxY
    })
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
    const filteredFeatures = geojsonData.features.filter(feature => {
        let targetId;
        switch (layerId) {
            case 'oh-chibanzu2024':
                console.log(feature.properties['id'])
                targetId = `${feature.properties['id']}`;
                break;
            case 'oh-amx-a-fude':
                targetId = `${feature.properties['丁目コード']}_${feature.properties['小字コード']}_${feature.properties['地番']}`;
                break;
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
        // console.log(targetId)
        return store.state.highlightedChibans.has(targetId);
    });
    let geojson
    if (filteredFeatures.length > 0) {
        geojson = {
            type: 'FeatureCollection',
            features: filteredFeatures
        };
    } else {
        geojson = geojsonData
    }
    console.log('Extracted GeoJSON from Source:', geojson);
    return geojson;
}

// 全フィーチャの選択状態をリセットする関数
export function resetFeatureColors(map,layerId) {
    store.state.highlightedChibans.clear();
    map.setPaintProperty(
        layerId,
        'fill-color',
        'rgba(0, 0, 0, 0)' // 全ての地番+丁目コードを透明にリセット
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
        const { 丁目コード, 小字コード, 地番 } = feature.properties;
        if (丁目コード && 小字コード && 地番) {
            visiblePropertiesSet.add(`${丁目コード}_${小字コード}_${地番}`);
        }
    });
    // 3. GeoJSONから一致する地物を抽出
    const filteredFeatures = geojson.features.filter(feature => {
        const { 丁目コード, 小字コード, 地番 } = feature.properties || {};
        return 丁目コード && 小字コード && 地番 &&
            visiblePropertiesSet.has(`${丁目コード}_${小字コード}_${地番}`);
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
            if (!coordinateMap.has(coordinateKey)) {
                coordinateMap.set(coordinateKey, j);
                A01Text += 'A01,' + j + ',' + name + ',' + zahyoX + ',' + zahyoY + ',\n';
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

export async function queryFGBWithPolygon(map,polygon,chiban) {
    polygon = polygon.geometry.coordinates[0]
    console.log(polygon)

    let prefId = String(store.state.prefId).padStart(2, '0');
    console.log('初期 prefId:', prefId);

    let fgbUrl;
    function getFgbUrl(prefId) {
        const specialIds = ['22', '26', '29', '40', '43', '44','45','47'];
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