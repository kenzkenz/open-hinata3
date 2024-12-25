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
 * 座標変換関数
 * @param {Array} coords - 座標データ
 * @param {String} sourceProj - 元の座標系（EPSG:4326）
 * @param {String} targetProj - 変換先の座標系（EPSG:6670）
 * @returns {Array} - 変換後の座標データ
 */
function transformCoordinates(coords, sourceProj, targetProj) {
    if (Array.isArray(coords[0])) {
        return coords.map(coord => transformCoordinates(coord, sourceProj, targetProj));
    } else {
        const [x, y] = proj4(sourceProj, targetProj, [coords[0], coords[1]]);
        return [x, y]; // 緯度と経度の反転は不要
    }
}

/**
 * ジオメトリ変換関数
 * @param {Object} geometry - GeoJSONジオメトリオブジェクト
 * @param {String} sourceProj - 元の座標系（EPSG:4326）
 * @param {String} targetProj - 変換先の座標系（EPSG:6670）
 * @returns {Object} - 変換後のジオメトリ
 */
function transformGeometry(geometry, sourceProj, targetProj) {
    switch (geometry.type) {
        case 'Point':
        case 'LineString':
        case 'Polygon':
            geometry.coordinates = transformCoordinates(geometry.coordinates, sourceProj, targetProj);
            break;
        case 'MultiLineString':
        case 'MultiPolygon':
            geometry.coordinates = geometry.coordinates.map(coords =>
                transformCoordinates(coords, sourceProj, targetProj)
            );
            break;
        default:
            console.warn(`Unsupported geometry type: ${geometry.type}`);
    }
    return geometry;
}

/**
 * GeoJSONを指定した直角座標系に変換
 * @param {Object} geojson - 入力GeoJSONデータ（EPSG:4326）
 * @param {String} targetProj - 変換先の座標系（EPSG:6670）
 * @returns {Object} - 変換後のGeoJSONデータ
 */
function convertGeoJSONToCRS(geojson, targetProj) {
    if (!geojson || geojson.type !== 'FeatureCollection') {
        throw new Error('無効なGeoJSONデータです。FeatureCollectionが必要です。');
    }

    proj4.defs([
        ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
        ["EPSG:6670", "+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=200000 +y_0=0 +ellps=GRS80 +datum=JGD2011 +units=m +no_defs"]
    ]);

    const sourceProj = 'EPSG:4326';

    const transformCoordinates = (coords, sourceProj, targetProj) => {
        if (Array.isArray(coords[0])) {
            return coords.map((innerCoords) => transformCoordinates(innerCoords, sourceProj, targetProj));
        }
        const transformed = proj4(sourceProj, targetProj, coords);
        console.log(`変換前: ${coords}, 変換後: ${transformed}`);
        return transformed;
    };

    const transformGeometry = (geometry, sourceProj, targetProj) => {
        if (!geometry) return null;

        const { type, coordinates } = geometry;

        return {
            type,
            coordinates: transformCoordinates(coordinates, sourceProj, targetProj)
        };
    };

    const transformedGeoJSON = JSON.parse(JSON.stringify(geojson));
    transformedGeoJSON.features = transformedGeoJSON.features.map((feature) => {
        if (!feature.geometry) return feature;
        feature.geometry = transformGeometry(feature.geometry, sourceProj, targetProj);
        return feature;
    });

    return transformedGeoJSON;
}

/**
 * GeoJSONをSIMA形式に変換してダウンロード
 * @param {Object} geojson - 入力GeoJSONデータ
 * @param {String} fileName - 出力ファイル名
 */
function convertAndDownloadGeoJSONToSIMA(geojson, fileName = 'output.sim') {
    if (!geojson || geojson.type !== 'FeatureCollection') {
        throw new Error('無効なGeoJSONデータです。FeatureCollectionが必要です。');
    }

    let simaData = 'G00,01,法務省地図XML2sima,\n';
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
            A01Text += 'A01,' + j + ',' + j + ',' + coord[1] + ',' + coord[0] + ',\n'
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

    geojson.features.forEach((feature, featureIndex) => {
        const plotId = feature.properties?.['筆ID'] || `${featureIndex + 1}`;
        simaData += `D00,${featureIndex + 1},${plotId},1,\n`;
        let pointIndex = 1;
        feature.geometry.coordinates.flat().forEach((coord) => {
            if (Array.isArray(coord) && coord.length >= 2) {
                simaData += `B01,${pointIndex},${pointMapping[pointIndex]},\n`;
                pointIndex++;
            }
        });
        simaData += 'D99,\n';
    });

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
    const geojson = convertGeoJSONToCRS(exportLayerToGeoJSON(map, layerId, sourceId, fields), 'EPSG:6670');
    convertAndDownloadGeoJSONToSIMA(geojson);
}







// GeoJSONをSIMAに変換してダウンロード
// convertAndDownloadGeoJSONToSIMA(sampleGeoJSON, 'output.sim');

