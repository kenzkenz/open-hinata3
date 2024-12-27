import store from '@/store'
import {GITHUB_TOKEN} from "@/js/config";
import * as turf from '@turf/turf'
import * as flatgeobuf from 'flatgeobuf'
import maplibregl from 'maplibre-gl'
import proj4 from 'proj4'
// function dissolveGeoJSONByFields(geojson, fields) {
//     if (!geojson || !fields || !Array.isArray(fields)) {
//         throw new Error("GeoJSONデータとフィールド名（配列）は必須です。");
//     }
//     try {
//         const normalizedFeatures = geojson.features
//             .map((feature) => {
//                 if (feature.geometry.type === "MultiPolygon") {
//                     return feature.geometry.coordinates.map((polygon) => ({
//                         type: "Feature",
//                         properties: feature.properties,
//                         geometry: {
//                             type: "Polygon",
//                             coordinates: polygon,
//                         },
//                     }));
//                 } else if (feature.geometry.type === "MultiLineString") {
//                     return feature.geometry.coordinates.map((line) => ({
//                         type: "Feature",
//                         properties: feature.properties,
//                         geometry: {
//                             type: "LineString",
//                             coordinates: line,
//                         },
//                     }));
//                 } else if (
//                     feature.geometry.type === "Polygon" ||
//                     feature.geometry.type === "LineString"
//                 ) {
//                     return feature;
//                 }
//                 return null; // PointやMultiPointは無視
//             })
//             .flat()
//             .filter(Boolean);
//
//         const normalizedGeoJSON = {
//             type: "FeatureCollection",
//             features: normalizedFeatures,
//         };
//
//         try {
//             // AND条件でプロパティ結合
//             normalizedGeoJSON.features.forEach(feature => {
//                 feature.properties._combinedField = fields.map(field => feature.properties[field]).join('_');
//             });
//
//             return turf.dissolve(normalizedGeoJSON, { propertyName: '_combinedField' });
//         } catch (error) {
//             console.warn("ディゾルブ中にエラーが発生しましたが無視します:", error);
//             return normalizedGeoJSON;
//         }
//     } catch (error) {
//         console.error("GeoJSON処理中にエラーが発生しましたが無視します:", error);
//         return geojson;
//     }
// }

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
        if (fields.length === 0) {
            return geojson
        } else {
            return dissolveGeoJSONByFields(geojson, fields)
        }
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
 * 📌 平面直角座標系 (JGD2011) の初期化・判定・定義
 */
export function initializePlaneRectangularCRS(map) {
    const kei = store.state.kei; // ストアからkeiを取得

    // 1. 平面直角座標系 (JGD2011) の定義
    const planeCS = [
        { kei: '第1系', code: "EPSG:6668", originLon: 129.5, originLat: 33 },
        { kei: '第2系', code: "EPSG:6669", originLon: 131.0, originLat: 33 },
        { kei: '第3系', code: "EPSG:6670", originLon: 132.1667, originLat: 36 },
        { kei: '第4系', code: "EPSG:6671", originLon: 133.5, originLat: 33 },
        { kei: '第5系', code: "EPSG:6672", originLon: 134.3333, originLat: 36 },
        { kei: '第6系', code: "EPSG:6673", originLon: 136.0, originLat: 36 },
        { kei: '第7系', code: "EPSG:6674", originLon: 137.1667, originLat: 36 },
        { kei: '第8系', code: "EPSG:6675", originLon: 138.5, originLat: 36 },
        { kei: '第9系', code: "EPSG:6676", originLon: 139.8333, originLat: 36 },
        { kei: '第10系', code: "EPSG:6677", originLon: 140.8333, originLat: 40 },
        { kei: '第11系', code: "EPSG:6678", originLon: 140.25, originLat: 44 },
        { kei: '第12系', code: "EPSG:6679", originLon: 142.0, originLat: 44 },
        { kei: '第13系', code: "EPSG:6680", originLon: 144.0, originLat: 44 },
        { kei: '第14系', code: "EPSG:6681", originLon: 142.0, originLat: 26 },
        { kei: '第15系', code: "EPSG:6682", originLon: 127.5, originLat: 26 },
        { kei: '第16系', code: "EPSG:6683", originLon: 124.0, originLat: 26 },
        { kei: '第17系', code: "EPSG:6684", originLon: 131.0, originLat: 26 },
        { kei: '第18系', code: "EPSG:6685", originLon: 136.0, originLat: 20 },
        { kei: '第19系', code: "EPSG:6686", originLon: 154.0, originLat: 26 }
    ];

    // 2. EPSGコードに対応する座標系の定義文字列を返す
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

    let detected;
    if (kei) {
        detected = planeCS.find(item => item.kei === kei);
        if (!detected) {
            console.warn(`⚠️ 指定された kei (${kei}) に一致する座標系が見つかりません。最も近い座標系を自動選択します。`);
        }
    }

    if (!detected) {
        const center = map.getCenter();
        detected = planeCS.reduce((prev, curr) => {
            const prevDist = Math.sqrt(Math.pow(prev.originLon - center.lng, 2) + Math.pow(prev.originLat - center.lat, 2));
            const currDist = Math.sqrt(Math.pow(curr.originLon - center.lng, 2) + Math.pow(curr.originLat - center.lat, 2));
            return currDist < prevDist ? curr : prev;
        });
    }

    const definition = getCRSDefinition(detected.code);
    if (definition) {
        proj4.defs(detected.code, definition);
        console.log(`✅ 座標系 (${detected.code} - ${detected.kei}): ${definition}`);
    } else {
        console.warn(`⚠️ 指定された座標系 (${detected.code}) は存在しません。`);
    }

    return { code: detected.code, kei: detected.kei };
}
// export function initializePlaneRectangularCRS(map) {
//     const kei = store.state.kei
//     // 1. 平面直角座標系 (JGD2011) の定義
//     const planeCS = [
//         { kei: '第1系', code: "EPSG:6668", originLon: 129.5, originLat: 33 },
//         { kei: '第2系', code: "EPSG:6669", originLon: 131.0, originLat: 33 },
//         { kei: '第3系', code: "EPSG:6670", originLon: 132.1667, originLat: 36 },
//         { kei: '第4系', code: "EPSG:6671", originLon: 133.5, originLat: 33 },
//         { kei: '第5系', code: "EPSG:6672", originLon: 134.3333, originLat: 36 },
//         { kei: '第6系', code: "EPSG:6673", originLon: 136.0, originLat: 36 },
//         { kei: '第7系', code: "EPSG:6674", originLon: 137.1667, originLat: 36 },
//         { kei: '第8系', code: "EPSG:6675", originLon: 138.5, originLat: 36 },
//         { kei: '第9系', code: "EPSG:6676", originLon: 139.8333, originLat: 36 },
//         { kei: '第10系', code: "EPSG:6677", originLon: 140.8333, originLat: 40 },
//         { kei: '第11系', code: "EPSG:6678", originLon: 140.25, originLat: 44 },
//         { kei: '第12系', code: "EPSG:6679", originLon: 142.0, originLat: 44 },
//         { kei: '第13系', code: "EPSG:6680", originLon: 144.0, originLat: 44 },
//         { kei: '第14系', code: "EPSG:6681", originLon: 142.0, originLat: 26 },
//         { kei: '第15系', code: "EPSG:6682", originLon: 127.5, originLat: 26 },
//         { kei: '第16系', code: "EPSG:6683", originLon: 124.0, originLat: 26 },
//         { kei: '第17系', code: "EPSG:6684", originLon: 131.0, originLat: 26 },
//         { kei: '第18系', code: "EPSG:6685", originLon: 136.0, originLat: 20 },
//         { kei: '第19系', code: "EPSG:6686", originLon: 154.0, originLat: 26 }
//     ];
//
//     // 2. EPSGコードに対応する座標系の定義文字列を返す
//     function getCRSDefinition(epsgCode) {
//             const crsDefs = {
//                 "EPSG:6668": "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第1系
//                 "EPSG:6669": "+proj=tmerc +lat_0=33 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第2系
//                 "EPSG:6670": "+proj=tmerc +lat_0=36 +lon_0=132.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第3系
//                 "EPSG:6671": "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第4系
//                 "EPSG:6672": "+proj=tmerc +lat_0=36 +lon_0=134.3333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第5系
//                 "EPSG:6673": "+proj=tmerc +lat_0=36 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第6系
//                 "EPSG:6674": "+proj=tmerc +lat_0=36 +lon_0=137.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第7系
//                 "EPSG:6675": "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第8系
//                 "EPSG:6676": "+proj=tmerc +lat_0=36 +lon_0=139.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第9系
//                 "EPSG:6677": "+proj=tmerc +lat_0=40 +lon_0=140.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第10系
//                 "EPSG:6678": "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第11系
//                 "EPSG:6679": "+proj=tmerc +lat_0=44 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第12系
//                 "EPSG:6680": "+proj=tmerc +lat_0=44 +lon_0=144.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第13系
//                 "EPSG:6681": "+proj=tmerc +lat_0=26 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第14系
//                 "EPSG:6682": "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第15系
//                 "EPSG:6683": "+proj=tmerc +lat_0=26 +lon_0=124.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第16系
//                 "EPSG:6684": "+proj=tmerc +lat_0=26 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第17系
//                 "EPSG:6685": "+proj=tmerc +lat_0=20 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第18系
//                 "EPSG:6686": "+proj=tmerc +lat_0=26 +lon_0=154.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"     // 第19系
//             };
//         return crsDefs[epsgCode] || null;
//     }
//
//     // 3. 緯度・経度から最も近い平面直角座標系 (EPSGコード) を判定
//     function detectPlaneRectangularCRS(lon, lat) {
//         return planeCS.reduce((prev, curr) => {
//             const prevDist = Math.sqrt(Math.pow(prev.originLon - lon, 2) + Math.pow(prev.originLat - lat, 2));
//             const currDist = Math.sqrt(Math.pow(curr.originLon - lon, 2) + Math.pow(curr.originLat - lat, 2));
//             return currDist < prevDist ? curr : prev;
//         });
//     }
//
//     // 4. 初期化処理
//     const center = map.getCenter();
//     const detected = detectPlaneRectangularCRS(center.lng, center.lat);
//     const definition = getCRSDefinition(detected.code);
//
//     if (definition) {
//         proj4.defs(detected.code, definition);
//         console.log(`✅ 座標系 (${detected.code} - ${detected.kei}): ${definition}`);
//     } else {
//         console.warn(`⚠️ 指定された座標系 (${detected.code}) は存在しません。`);
//     }
//
//     return { code: detected.code, kei: detected.kei };
// }



/**
 * GeoJSONをSIMA形式に変換してダウンロード
 * @param {Object} geojson - 入力GeoJSONデータ
 * @param {String} fileName - 出力ファイル名
 */
function convertAndDownloadGeoJSONToSIMA(map,geojson, fileName = 'output.sim') {
    if (!geojson || geojson.type !== 'FeatureCollection') {
        throw new Error('無効なGeoJSONデータです。FeatureCollectionが必要です。');
    }

    // /**
    //  * 📌 1. 平面直角座標系 (JGD2011) の定義
    //  */
    // const planeCS = [
    //     { kei:'第1系', code: "EPSG:6668", originLon: 129.5, originLat: 33 },    // 第1系
    //     { kei:'第2系',code: "EPSG:6669", originLon: 131.0, originLat: 33 },    // 第2系
    //     { kei:'第3系',code: "EPSG:6670", originLon: 132.1667, originLat: 36 }, // 第3系
    //     { kei:'第4系', code: "EPSG:6671", originLon: 133.5, originLat: 33 },    // 第4系
    //     { kei:'第5系', code: "EPSG:6672", originLon: 134.3333, originLat: 36 }, // 第5系
    //     { kei:'第6系', code: "EPSG:6673", originLon: 136.0, originLat: 36 },    // 第6系
    //     { kei:'第7系', code: "EPSG:6674", originLon: 137.1667, originLat: 36 }, // 第7系
    //     { kei:'第8系', code: "EPSG:6675", originLon: 138.5, originLat: 36 },    // 第8系
    //     { kei:'第9系', code: "EPSG:6676", originLon: 139.8333, originLat: 36 }, // 第9系
    //     { kei:'第10系', code: "EPSG:6677", originLon: 140.8333, originLat: 40 }, // 第10系
    //     { kei:'第11系', code: "EPSG:6678", originLon: 140.25, originLat: 44 },   // 第11系
    //     { kei:'第12系', code: "EPSG:6679", originLon: 142.0, originLat: 44 },    // 第12系
    //     { kei:'第13系', code: "EPSG:6680", originLon: 144.0, originLat: 44 },    // 第13系
    //     { kei:'第14系', code: "EPSG:6681", originLon: 142.0, originLat: 26 },    // 第14系
    //     { kei:'第15系', code: "EPSG:6682", originLon: 127.5, originLat: 26 },    // 第15系
    //     { kei:'第16系', code: "EPSG:6683", originLon: 124.0, originLat: 26 },    // 第16系
    //     { kei:'第17系', code: "EPSG:6684", originLon: 131.0, originLat: 26 },    // 第17系
    //     { kei:'第18系', code: "EPSG:6685", originLon: 136.0, originLat: 20 },    // 第18系
    //     { kei:'第19系', code: "EPSG:6686", originLon: 154.0, originLat: 26 }     // 第19系
    // ];
    //
    //
    // /**
    //  * 📌 2. EPSGコードに対応する座標系の定義文字列を返す
    //  */
    // function getCRSDefinition(epsgCode) {
    //     const crsDefs = {
    //         "EPSG:6668": "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第1系
    //         "EPSG:6669": "+proj=tmerc +lat_0=33 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第2系
    //         "EPSG:6670": "+proj=tmerc +lat_0=36 +lon_0=132.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第3系
    //         "EPSG:6671": "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第4系
    //         "EPSG:6672": "+proj=tmerc +lat_0=36 +lon_0=134.3333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第5系
    //         "EPSG:6673": "+proj=tmerc +lat_0=36 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第6系
    //         "EPSG:6674": "+proj=tmerc +lat_0=36 +lon_0=137.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第7系
    //         "EPSG:6675": "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第8系
    //         "EPSG:6676": "+proj=tmerc +lat_0=36 +lon_0=139.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第9系
    //         "EPSG:6677": "+proj=tmerc +lat_0=40 +lon_0=140.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs", // 第10系
    //         "EPSG:6678": "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +ellps=GRS80 +units=m +no_defs",   // 第11系
    //         "EPSG:6679": "+proj=tmerc +lat_0=44 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第12系
    //         "EPSG:6680": "+proj=tmerc +lat_0=44 +lon_0=144.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第13系
    //         "EPSG:6681": "+proj=tmerc +lat_0=26 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第14系
    //         "EPSG:6682": "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第15系
    //         "EPSG:6683": "+proj=tmerc +lat_0=26 +lon_0=124.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第16系
    //         "EPSG:6684": "+proj=tmerc +lat_0=26 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第17系
    //         "EPSG:6685": "+proj=tmerc +lat_0=20 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs",    // 第18系
    //         "EPSG:6686": "+proj=tmerc +lat_0=26 +lon_0=154.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"     // 第19系
    //     };
    //
    //     return crsDefs[epsgCode] || null;
    // }
    //
    // /**
    //  * 📌 3. 緯度・経度から最も近い平面直角座標系 (EPSGコード) を判定
    //  */
    // function detectPlaneRectangularCRS(lon, lat) {
    //     const closest = planeCS.reduce((prev, curr) => {
    //         const prevDist = Math.sqrt(Math.pow(prev.originLon - lon, 2) + Math.pow(prev.originLat - lat, 2));
    //         const currDist = Math.sqrt(Math.pow(curr.originLon - lon, 2) + Math.pow(curr.originLat - lat, 2));
    //         return currDist < prevDist ? curr : prev;
    //     });
    //     alert('平面直角座標' + closest.kei + 'で作成します。');
    //     return closest.code;
    // }
    //
    // /**
    //  * 📌 4. 画面中心から座標系を判定し、定義文字列を取得
    //  */
    // const center = map.getCenter();
    // const detectedCRS = detectPlaneRectangularCRS(center.lng, center.lat);
    // const definition = getCRSDefinition(detectedCRS);
    //
    // if (definition) {
    //     proj4.defs(detectedCRS, definition);
    //     console.log(`✅ 座標系 (${detectedCRS}): ${definition}`);
    // } else {
    //     console.warn(`⚠️ 指定された座標系 (${detectedCRS}) は存在しません。`);
    //     return;
    // }

    const crs = initializePlaneRectangularCRS(map)
    console.log(crs)
    alert('平面直角座標系（' + crs.kei + ')でsimファイルを作ります。')
    // let simaData = 'G00,01,open-hinata3,\n';
    // simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    // simaData += 'A00,\n';
    // let A01Text = ''４３２６
    // let B01Text = ''
    // let i = 1
    // let j = 1
    // geojson.features.forEach((feature) => {
    //     B01Text += 'D00,' + i + ',' + i + ',\n'
    //     const len = feature.geometry.coordinates.flat().length
    //     feature.geometry.coordinates.flat().forEach((coord,index) => {
    //         const [x, y] = proj4('EPSG:4326', crs.code, coord); // 座標系変換
    //         A01Text += 'A01,' + j + ',' + j + ',' + y + ',' + x + ',\n'
    //         if (len-2 < index) {
    //             B01Text += 'B01,' + j + ',' + j + ',\nD99,\n'
    //         } else {
    //             B01Text += 'B01,' + j + ',' + j + ',\n'
    //         }
    //         j++
    //     })
    //     i++
    // })
    let simaData = 'G00,01,open-hinata3,\n';
    simaData += 'Z00,座標ﾃﾞｰﾀ,,\n';
    simaData += 'A00,\n';
    let A01Text = '';
    let B01Text = '';
    let i = 1;
    let j = 1;
    // 座標とカウンターを関連付けるマップ
    const coordinateMap = new Map();
    geojson.features.forEach((feature) => {
        B01Text += 'D00,' + i + ',' + i + ',\n';
        const len = feature.geometry.coordinates.flat().length;
        feature.geometry.coordinates.flat().forEach((coord, index) => {
            const [x, y] = proj4('EPSG:4326', crs.code, coord); // 座標系変換
            // 座標のキーを作成
            const coordinateKey = `${x},${y}`;
            if (!coordinateMap.has(coordinateKey)) {
                // 新しい座標の場合、A01Textに追加し、カウンターを登録
                coordinateMap.set(coordinateKey, j);
                A01Text += 'A01,' + j + ',' + j + ',' + y + ',' + x + ',\n';
                j++;
            }
            // 現在の座標のカウンターを取得してB01Textに使用
            const currentCounter = coordinateMap.get(coordinateKey);
            if (len - 2 < index) {
                B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\nD99,\n';
            } else {
                B01Text += 'B01,' + currentCounter + ',' + currentCounter + ',\n';
            }
        });
        i++;
    });

    simaData = simaData + A01Text + 'A99\nZ00,区画データ,\n' + B01Text
    // console.log(simaData)
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

function geojsonToDXF(geojson) {
    let dxf = "0\n" +
        "SECTION\n" +
        "2\n" +
        "HEADER\n" +
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

export function saveDxf (map, layerId, sourceId, fields) {
    const crs = initializePlaneRectangularCRS(map)
    let geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields)
    console.log(geojson)
    console.log(crs.code)
    // geojson = proj4('EPSG:4326', crs.code, geojson);

    function transformGeoJSON(geojson, crsCode) {
        if (!geojson || !geojson.type) {
            console.warn('⚠️ 無効なGeoJSONデータです。');
            return null;
        }
        const transformed = JSON.parse(JSON.stringify(geojson));
        function transformCoordinates(coords) {
            if (Array.isArray(coords)) {
                return coords.map(coord => {
                    if (Array.isArray(coord) && coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1])) {
                        return proj4('EPSG:4326', crsCode, coord);
                    } else {
                        console.warn('⚠️ 無効な座標が検出され、スキップされました:', coord);
                        return null;
                    }
                }).filter(coord => coord !== null);
            }
            return coords;
        }
        transformed.coordinates = transformCoordinates(geojson.coordinates);
        return transformed;
    }
    geojson = transformGeoJSON(geojson)

    console.log(geojson)
    try {
        const dxfString = geojsonToDXF(geojson);
        // DXFファイルとしてダウンロード
        const blob = new Blob([dxfString], { type: 'application/dxf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'output.dxf';
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

        return [latitude, longitude, ...propValues];
    });

    // 3. CSV形式に変換
    const csvContent = [
        headers.join(','), // ヘッダー
        ...rows.map(row => row.join(',')) // 各行
    ].join('\n');

    // 4. CSVをダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function saveCsv(map, layerId, sourceId, fields) {
    const geojson = exportLayerToGeoJSON(map, layerId, sourceId, fields);
    downloadGeoJSONAsCSV(geojson)
}

// SIMAファイルをGeoJSONに変換する関数 (EPSG:6669変換対応)
function simaToGeoJSON(simaData,map) {
    // 座標系の定義
    proj4.defs([
        ["EPSG:6668", "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第1系
        ["EPSG:6669", "+proj=tmerc +lat_0=33 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第2系
        ["EPSG:6670", "+proj=tmerc +lat_0=36 +lon_0=132.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第3系
        ["EPSG:6671", "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第4系
        ["EPSG:6672", "+proj=tmerc +lat_0=36 +lon_0=134.3333 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第5系
        ["EPSG:6673", "+proj=tmerc +lat_0=36 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第6系
        ["EPSG:6674", "+proj=tmerc +lat_0=36 +lon_0=137.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第7系
        ["EPSG:6675", "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第8系
        ["EPSG:6676", "+proj=tmerc +lat_0=36 +lon_0=139.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第9系
        ["EPSG:6677", "+proj=tmerc +lat_0=40 +lon_0=140.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第10系
        ["EPSG:6678", "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第11系
        ["EPSG:6679", "+proj=tmerc +lat_0=44 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第12系
        ["EPSG:6680", "+proj=tmerc +lat_0=44 +lon_0=144.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第13系
        ["EPSG:6681", "+proj=tmerc +lat_0=26 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第14系
        ["EPSG:6682", "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第15系
        ["EPSG:6683", "+proj=tmerc +lat_0=26 +lon_0=124.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第16系
        ["EPSG:6684", "+proj=tmerc +lat_0=26 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第17系
        ["EPSG:6685", "+proj=tmerc +lat_0=20 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第18系
        ["EPSG:6686", "+proj=tmerc +lat_0=26 +lon_0=154.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"]     // 第19系
    ]);


    const lines = simaData.split('\n');
    let coordinates = {}; // 座標データを格納
    let features = []; // GeoJSONのフィーチャーを格納
    let currentFeature = null;
    let firstCoordinateChecked = false;
    let detectedCRS

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
                const [lon, lat] = proj4('EPSG:6669', 'EPSG:4326', [y, x]);
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
    // 平面直角座標系（1系〜19系）の定義
    proj4.defs([
        ["EPSG:6668", "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第1系
        ["EPSG:6669", "+proj=tmerc +lat_0=33 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第2系
        ["EPSG:6670", "+proj=tmerc +lat_0=36 +lon_0=132.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第3系
        ["EPSG:6671", "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第4系
        ["EPSG:6672", "+proj=tmerc +lat_0=36 +lon_0=134.3333 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第5系
        ["EPSG:6673", "+proj=tmerc +lat_0=36 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第6系
        ["EPSG:6674", "+proj=tmerc +lat_0=36 +lon_0=137.1667 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第7系
        ["EPSG:6675", "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第8系
        ["EPSG:6676", "+proj=tmerc +lat_0=36 +lon_0=139.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第9系
        ["EPSG:6677", "+proj=tmerc +lat_0=40 +lon_0=140.8333 +k=0.9999 +ellps=GRS80 +units=m +no_defs"], // 第10系
        ["EPSG:6678", "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],   // 第11系
        ["EPSG:6679", "+proj=tmerc +lat_0=44 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第12系
        ["EPSG:6680", "+proj=tmerc +lat_0=44 +lon_0=144.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第13系
        ["EPSG:6681", "+proj=tmerc +lat_0=26 +lon_0=142.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第14系
        ["EPSG:6682", "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第15系
        ["EPSG:6683", "+proj=tmerc +lat_0=26 +lon_0=124.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第16系
        ["EPSG:6684", "+proj=tmerc +lat_0=26 +lon_0=131.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第17系
        ["EPSG:6685", "+proj=tmerc +lat_0=20 +lon_0=136.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"],    // 第18系
        ["EPSG:6686", "+proj=tmerc +lat_0=26 +lon_0=154.0 +k=0.9999 +ellps=GRS80 +units=m +no_defs"]     // 第19系
    ]);

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
