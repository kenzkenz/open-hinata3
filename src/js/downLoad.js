import {GITHUB_TOKEN} from "@/js/config";
import * as turf from '@turf/turf'
import proj4 from 'proj4'
function dissolveGeoJSONByFields(geojson, fields) {
    if (!geojson || !fields || !Array.isArray(fields)) {
        throw new Error("GeoJSONデータとフィールド名（配列）は必須です。");
    }
    try {
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

        try {
            // AND条件でプロパティ結合
            normalizedGeoJSON.features.forEach(feature => {
                feature.properties._combinedField = fields.map(field => feature.properties[field]).join('_');
            });

            return turf.dissolve(normalizedGeoJSON, { propertyName: '_combinedField' });
        } catch (error) {
            console.warn("ディゾルブ中にエラーが発生しましたが無視します:", error);
            return normalizedGeoJSON;
        }
    } catch (error) {
        console.error("GeoJSON処理中にエラーが発生しましたが無視します:", error);
        return geojson;
    }
}

export function exportLayerToGeoJSON(map,layerId,sourceId,fields) {
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
        let geojson = {
            type: "FeatureCollection",
            features: features.map(f => f.toJSON())
        };



        // geojson = {
        //     "type": "FeatureCollection",
        //     "features": [
        //         {
        //             "type": "Feature",
        //             "geometry": {
        //                 "type": "MultiPolygon",
        //                 "coordinates": [
        //                     [
        //                         [
        //                             [
        //                                 -51763.867,
        //                                 3666.959
        //                             ],
        //                             [
        //                                 -51751.211,
        //                                 3661.721
        //                             ],
        //                             [
        //                                 -51748.36,
        //                                 3654.315
        //                             ],
        //                             [
        //                                 -51751.157,
        //                                 3648.169
        //                             ],
        //                             [
        //                                 -51768.324,
        //                                 3655.634
        //                             ],
        //                             [
        //                                 -51763.867,
        //                                 3666.959
        //                             ]
        //                         ]
        //                     ]
        //                 ]
        //             },
        //             "properties": {
        //                 "筆ID": "H000000001",
        //                 "version": "ver1.0",
        //                 "座標系": "公共座標2系",
        //                 "測地系判別": "測量",
        //                 "地図名": "有明町１７Ａ０２",
        //                 "地図番号": "682",
        //                 "縮尺分母": "600",
        //                 "地図種類": "街区基本調査成果図",
        //                 "地図分類": "地図に準ずる図面（街区成果B）",
        //                 "市区町村コード": "40202",
        //                 "市区町村名": "大牟田市",
        //                 "大字コード": "028",
        //                 "丁目コード": "002",
        //                 "小字コード": "0000",
        //                 "予備コード": "00",
        //                 "大字名": "有明町",
        //                 "丁目名": "２丁目",
        //                 "小字名": null,
        //                 "予備名": null,
        //                 "地番": "1-1",
        //                 "精度区分": null,
        //                 "座標値種別": "図上測量",
        //                 "筆界未定構成筆": null,
        //                 "代表点緯度": 3658.6775,
        //                 "代表点経度": -51758.58279902
        //             }
        //         }
        //     ]
        // }


        return dissolveGeoJSONByFields(geojson, fields)
    } else {
        console.warn('このソースタイプはサポートされていません。');
        return null;
    }
}
export function saveGeojson (map,layerId,sourceId,fields) {
    const geojsonText = JSON.stringify(exportLayerToGeoJSON(map,layerId,sourceId,fields))
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
    const geojsonText = JSON.stringify(exportLayerToGeoJSON(map,layerId,sourceId,fields))
    uploadGeoJSONToGist(geojsonText, 'GeoJSON Dataset Upload');
}

/**
 * GeoJSONをSIMA形式に変換してダウンロード
 * @param {Object} geojson - 入力GeoJSONデータ
 * @param {String} fileName - 出力ファイル名
 */
function convertAndDownloadGeoJSONToSIMA(map,geojson, fileName = 'output.sim') {
    if (!geojson || geojson.type !== 'FeatureCollection') {
        throw new Error('無効なGeoJSONデータです。FeatureCollectionが必要です。');
    }

    /**
     * 📌 1. 平面直角座標系 (JGD2011) の定義
     */
    const planeCS = [
        { kei:'第1系', code: "EPSG:6668", originLon: 129.5, originLat: 33 },    // 第1系
        { kei:'第2系',code: "EPSG:6669", originLon: 131.0, originLat: 33 },    // 第2系
        { kei:'第3系',code: "EPSG:6670", originLon: 132.1667, originLat: 36 }, // 第3系
        { kei:'第4系', code: "EPSG:6671", originLon: 133.5, originLat: 33 },    // 第4系
        { kei:'第5系', code: "EPSG:6672", originLon: 134.3333, originLat: 36 }, // 第5系
        { kei:'第6系', code: "EPSG:6673", originLon: 136.0, originLat: 36 },    // 第6系
        { kei:'第7系', code: "EPSG:6674", originLon: 137.1667, originLat: 36 }, // 第7系
        { kei:'第8系', code: "EPSG:6675", originLon: 138.5, originLat: 36 },    // 第8系
        { kei:'第9系', code: "EPSG:6676", originLon: 139.8333, originLat: 36 }, // 第9系
        { kei:'第10系', code: "EPSG:6677", originLon: 140.8333, originLat: 40 }, // 第10系
        { kei:'第11系', code: "EPSG:6678", originLon: 140.25, originLat: 44 },   // 第11系
        { kei:'第12系', code: "EPSG:6679", originLon: 142.0, originLat: 44 },    // 第12系
        { kei:'第13系', code: "EPSG:6680", originLon: 144.0, originLat: 44 },    // 第13系
        { kei:'第14系', code: "EPSG:6681", originLon: 142.0, originLat: 26 },    // 第14系
        { kei:'第15系', code: "EPSG:6682", originLon: 127.5, originLat: 26 },    // 第15系
        { kei:'第16系', code: "EPSG:6683", originLon: 124.0, originLat: 26 },    // 第16系
        { kei:'第17系', code: "EPSG:6684", originLon: 131.0, originLat: 26 },    // 第17系
        { kei:'第18系', code: "EPSG:6685", originLon: 136.0, originLat: 20 },    // 第18系
        { kei:'第19系', code: "EPSG:6686", originLon: 154.0, originLat: 26 }     // 第19系
    ];


    /**
     * 📌 2. EPSGコードに対応する座標系の定義文字列を返す
     */
    function getCRSDefinition(epsgCode) {
        const crsDefs = {
            "EPSG:6668": "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第1系
            "EPSG:6669": "+proj=tmerc +lat_0=33 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第2系
            "EPSG:6670": "+proj=tmerc +lat_0=36 +lon_0=132.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第3系
            "EPSG:6671": "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第4系
            "EPSG:6672": "+proj=tmerc +lat_0=36 +lon_0=134.3333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第5系
            "EPSG:6673": "+proj=tmerc +lat_0=36 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第6系
            "EPSG:6674": "+proj=tmerc +lat_0=36 +lon_0=137.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第7系
            "EPSG:6675": "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第8系
            "EPSG:6676": "+proj=tmerc +lat_0=36 +lon_0=139.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第9系
            "EPSG:6677": "+proj=tmerc +lat_0=40 +lon_0=140.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第10系
            "EPSG:6678": "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第11系
            "EPSG:6679": "+proj=tmerc +lat_0=44 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第12系
            "EPSG:6680": "+proj=tmerc +lat_0=44 +lon_0=144.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第13系
            "EPSG:6681": "+proj=tmerc +lat_0=26 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第14系
            "EPSG:6682": "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第15系
            "EPSG:6683": "+proj=tmerc +lat_0=26 +lon_0=124.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第16系
            "EPSG:6684": "+proj=tmerc +lat_0=26 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第17系
            "EPSG:6685": "+proj=tmerc +lat_0=20 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第18系
            "EPSG:6686": "+proj=tmerc +lat_0=26 +lon_0=154.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"     // 第19系
        };

        return crsDefs[epsgCode] || null;
    }

    /**
     * 📌 3. 緯度・経度から最も近い平面直角座標系 (EPSGコード) を判定
     */
    function detectPlaneRectangularCRS(lon, lat) {
        const closest = planeCS.reduce((prev, curr) => {
            const prevDist = Math.sqrt(Math.pow(prev.originLon - lon, 2) + Math.pow(prev.originLat - lat, 2));
            const currDist = Math.sqrt(Math.pow(curr.originLon - lon, 2) + Math.pow(curr.originLat - lat, 2));
            return currDist < prevDist ? curr : prev;
        });
        alert('平面直角座標' + closest.kei + 'で作成します。');
        return closest.code;
    }

    /**
     * 📌 4. 画面中心から座標系を判定し、定義文字列を取得
     */
    const center = map.getCenter();
    const detectedCRS = detectPlaneRectangularCRS(center.lng, center.lat);
    const definition = getCRSDefinition(detectedCRS);

    if (definition) {
        proj4.defs(detectedCRS, definition);
        console.log(`✅ 座標系 (${detectedCRS}): ${definition}`);
    } else {
        console.warn(`⚠️ 指定された座標系 (${detectedCRS}) は存在しません。`);
        return;
    }

    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';
    let pointMapping = {};
    let A01Text = ''
    let B01Text = ''
    let i = 1
    let j = 1

    geojson.features.forEach((feature) => {
        B01Text += 'D00,' + i + ',' + i + ',\n'
        const len = feature.geometry.coordinates.flat().length
        feature.geometry.coordinates.flat().forEach((coord,index) => {
            const [x, y] = proj4('EPSG:4326', detectedCRS, coord); // 座標系変換
            A01Text += 'A01,' + j + ',' + j + ',' + y + ',' + x + ',\n'
            if (len-2 < index) {
                B01Text += 'B01,' + j + ',' + j + ',\nD99,\n'
            } else {
                B01Text += 'B01,' + j + ',' + j + ',\n'
            }
            j++
        })
        i++
    })
    simaData = simaData + A01Text + 'A99\nZ00,区画データ,\n' + B01Text
    console.log(simaData)
    simaData += 'A99,END,,\n';

    const blob = new Blob([simaData], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 保存関数
 */
export function saveCima(map, layerId, sourceId, fields) {
    const geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields);
    convertAndDownloadGeoJSONToSIMA(map,geojson);
}

