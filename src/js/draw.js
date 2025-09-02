import store from '@/store'
import {colorNameToRgba, geojsonCreate} from "@/js/pyramid";
import { popup } from "@/js/popup";
import * as turf from "@turf/turf";
import {haptic} from "@/js/utils/haptics";
import {clickCircleSource, zenkokuChibanzuAddLayer} from "@/js/layers";
import {
    highlightSpecificFeatures2025,
    highlightSpecificFeaturesCity,
    layersOnScreen,
    saveDrowFeatures
} from "@/js/downLoad";

// =============================================================
// フリーハンド自己交差(=ループ)検出（Turf.js）
//   - 最後に追加した線分( a1->a2 ) と、過去の各線分( b1->b2 )の交点を
//     turf.lineIntersect で直接探索（端点タッチも検出可能）。
//   - 交点が見つかったら、[交点 → (j+1..n-2) → 交点] で閉じたリングを作成し、
//     options.onLoop(ring, meta) に通知。ポリゴン化は呼び出し側で行う。
//   - options.autoStopOnLoop = true なら検出時に描画停止＆プレビュー消去。
// =============================================================

const tempFreehandCoords = [];
let isDrawing = false;
let loopTriggered = false; // 多重発火防止

const EPS = 1e-9;
const almostEq = (a, b) => Math.abs(a - b) <= EPS;
const sameXY = (p, q) => almostEq(p[0], q[0]) && almostEq(p[1], q[1]);

export default function drawMethods(options = {}) {
    const { autoStopOnLoop = true } = options || {};
    const map01 = store.state.map01;

    function onLineClick(e) {
        popup(e, map01, 'map01', store.state.map2Flg);
    }

    // ------------------------------------
    // 交差検出: lineIntersect で直接判定
    // ------------------------------------
    function detectLoopWithTurf(coords) {
        if (!coords || coords.length < 4) return null; // ループ最短は4点

        const n = coords.length;
        const a1 = coords[n - 2];
        const a2 = coords[n - 1];

        // 0長さ(同一点)の最新セグメントは無視
        if (sameXY(a1, a2)) return null;

        const segA = turf.lineString([a1, a2]);

        // 隣接線分は除外（0..n-4 まで）。
        for (let j = 0; j <= n - 4; j++) {
            const b1 = coords[j];
            const b2 = coords[j + 1];
            // 0長さの古いセグメントはスキップ
            if (sameXY(b1, b2)) continue;

            const segB = turf.lineString([b1, b2]);
            const inter = turf.lineIntersect(segA, segB);
            if (inter.features.length === 0) continue;

            // 複数交点が返る場合があるので、使える交点を一つ選ぶ
            for (const f of inter.features) {
                const p = f.geometry.coordinates; // [lng, lat]

                // a1(直前点)との交点は無視（数値誤差込み）
                if (sameXY(p, a1)) continue;

                // 交点 p を始点・終点にして、[p, ...coords(j+1..n-2), p] で閉じたリングを構築
                const mid = coords.slice(j + 1, n - 1); // a2 は含めない
                const ring = [p, ...mid, p];
                if (ring.length >= 4) {
                    return {
                        ring,
                        meta: { intersection: p, hitOn: { j }, coords: coords.slice() },
                    };
                }
            }
        }

        return null;
    }

    // ------------------------------------
    // Pointer handlers
    // ------------------------------------
    map01.getCanvas().addEventListener('pointerdown', (e) => {
        if (!store.state.isDrawFree) return;

        const point = map01.unproject([e.clientX, e.clientY]);
        isDrawing = true;
        loopTriggered = false;

        tempFreehandCoords.length = 0;
        tempFreehandCoords.push([point.lng, point.lat]);

        map01.getCanvas().style.cursor = 'crosshair';
        map01.dragPan.disable();
    });

    map01.getCanvas().addEventListener('pointermove', (e) => {
        if (!isDrawing) return;

        const pt = map01.unproject([e.clientX, e.clientY]);
        const xy = [pt.lng, pt.lat];

        // 連続同一点のサンプリング抑止
        const last = tempFreehandCoords[tempFreehandCoords.length - 1];
        if (!last || !sameXY(last, xy)) {
            tempFreehandCoords.push(xy);
        }

        // プレビュー更新（存在チェック）
        const previewSrc = map01.getSource('freehand-preview-source');
        if (previewSrc) {
            previewSrc.setData({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: tempFreehandCoords },
                    properties: {
                        keiko: 0,
                        color: store.state.currentFreeHandColor || 'black',
                        'keiko-color': store.state.currentFreeHandKeikoColor || '#1C1C1C',
                        'line-width': store.state.currentFreeHandWidth || 5,
                    },
                }],
            });
        }

        // ループ検知（1回だけ）
        if (!loopTriggered) {
            const hit = detectLoopWithTurf(tempFreehandCoords);
            if (hit) {
                loopTriggered = true;

                // ★交点を始点・終点にした閉じたリング（[p, ..., p]）
                const ring = hit.ring; // すでに先頭=末尾が交点pでクローズ済み
                const p = hit.meta.intersection; // [lng, lat]

                if (autoStopOnLoop) {
                    isDrawing = false;
                    map01.getCanvas().style.cursor = '';
                    map01.dragPan.enable();
                    finishPreview();
                }

                // ★ringをそのままPolygonに使う（交点p始まりp終わり）
                const coords = [ring];

                const id = String(Math.floor(10000 + Math.random() * 90000));
                store.state.id = id;
                const properties = {
                    id,
                    pairId: id,
                    label: 'ポリゴンに変更',
                    // color: colorNameToRgba(store.state.currentPolygonColor || 'yellow', 0.6),
                    color: colorNameToRgba('hotpink', 0.6),
                    'line-width': 3,
                };
                geojsonCreate(map01, 'Polygon', coords, properties);

                // ★擬似クリックも交点pで
                const dummyEvent = { lngLat: { lng: p[0], lat: p[1] } };
                store.state.coordinates = [p[0], p[1]];
                setTimeout(() => { onLineClick(dummyEvent); }, 500);

                finishPreview();
                tempFreehandCoords.length = 0;
            }
        }

    });

    map01.getCanvas().addEventListener('pointerup', () => {
        if (!isDrawing) return;
        isDrawing = false;
        map01.getCanvas().style.cursor = '';
        map01.dragPan.enable();

        // ループ未検知時のみ従来ライン確定（必要な場合）
        if (!loopTriggered && tempFreehandCoords.length >= 2) {
            const id = String(Math.floor(10000 + Math.random() * 90000));
            store.state.id = id;

            const properties = {
                id,
                'free-hand': 1,
                keiko: 0,
                label: '',
                color: 'black',
                'keiko-color': store.state.currentFreeHandKeikoColor || 'rgba(28,28,28,0.5)',
                offsetValue: [0.6, 0],
                'line-width': store.state.currentFreeHandWidth || 5,
                textAnchor: 'left',
                textJustify: 'left',
            };

            geojsonCreate(map01, 'FreeHand', tempFreehandCoords.slice(), properties);

            // 擬似クリック
            store.state.coordinates = tempFreehandCoords[0];
            const ev = { lngLat: { lng: tempFreehandCoords[0][0], lat: tempFreehandCoords[0][1] } };
            setTimeout(() => onLineClick(ev), 500);
        }

        finishPreview();
        tempFreehandCoords.length = 0;
    });

    map01.getCanvas().addEventListener('pointerleave', () => {
        if (!isDrawing) return;
        isDrawing = false;
        map01.dragPan.enable();
        map01.getCanvas().style.cursor = '';
        tempFreehandCoords.length = 0;
        finishPreview();
    });

    function finishPreview() {
        const guide = map01.getSource('guide-line-source');
        if (guide) guide.setData({ type: 'FeatureCollection', features: [] });

        const preview = map01.getSource('freehand-preview-source');
        if (preview) preview.setData({ type: 'FeatureCollection', features: [] });
    }

    map01.on('click', (e) => {
        if (store.state.isDrawPolygon || store.state.isDrawLine || store.state.isDrawPoint) {
            haptic({ strength: 'success' })
        }
    })

    /**
     * 投げ縄
     * @type {boolean}
     */
    let isLassoDrawing = false;
    let lassoCoords = [];
    const lassoSourceId = 'lasso-source';
    const lassoLayerId = 'lasso-layer';

    map01.getCanvas().addEventListener('pointerdown', (e) => {
        if (!store.state.isDrawLasso && !store.state.isDrawLassoForTokizyo && !store.state.isDrawLassoForChibanzu) return;
        if (!map01.getSource(lassoSourceId)) {
            map01.addSource(lassoSourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
            map01.addLayer({
                id: lassoLayerId,
                type: 'line',
                source: lassoSourceId,
                paint: {
                    'line-color': 'rgba(0,0,255,0.6)',
                    'line-width': 10
                }
            });
        }
        map01.dragPan.disable(); // パン無効化
        isLassoDrawing = true;
        lassoCoords = [];
        map01.getCanvas().style.cursor = 'crosshair';
    });

    // 2. pointermove => ラインを更新
    map01.getCanvas().addEventListener('pointermove', (e) => {
        if (!isLassoDrawing) return;
        const point = map01.unproject([e.clientX, e.clientY]);
        lassoCoords.push([point.lng, point.lat]);
        const lineGeojson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: lassoCoords }
            }]
        };
        map01.getSource(lassoSourceId).setData(lineGeojson);
    });

    // 3. pointerup => 投げ縄完了 & 選択処理
    map01.getCanvas().addEventListener('pointerup', async (e) => {
        if (!isLassoDrawing) return;
        isLassoDrawing = false;
        map01.getCanvas().style.cursor = '';
        if (lassoCoords.length >= 3) {
            // ポリゴンを閉じる
            lassoCoords.push(lassoCoords[0]);
            const polygon = turf.polygon([lassoCoords]);
            if (store.state.isDraw) {
                // 対象ソースの全フィーチャ取得
                const source = map01.getSource(clickCircleSource.iD);
                const geojson = source._data; // or source.getData()
                let isLassoSelected = false
                // GeoJSON‐Rbush（空間インデックス）を使う方法もあるらしい。見調査
                // ポリゴンの bbox を先に計算
                const [pMinX, pMinY, pMaxX, pMaxY] = turf.bbox(polygon);
                geojson.features.forEach(feature => {
                    feature.properties.lassoSelected = false;
                    // feature の bbox を計算（事前にキャッシュしておくとさらに速い）
                    if (feature.geometry) {
                        const [fMinX, fMinY, fMaxX, fMaxY] = turf.bbox(feature);
                        // bbox が重ならなければ交差チェック不要
                        if (fMaxX < pMinX || fMinX > pMaxX || fMaxY < pMinY || fMinY > pMaxY) {
                            return;
                        }
                        // 本命チェック
                        if (turf.booleanIntersects(feature, polygon)) {
                            feature.properties.lassoSelected = true;
                            isLassoSelected = true;
                        }
                    }
                });
                store.state.lassoGeojson = JSON.stringify(turf.featureCollection(geojson.features.filter(feature => feature.properties.lassoSelected === true)))
                if (isLassoSelected) {
                    store.state.isLassoSelected = true
                } else {
                    store.state.isLassoSelected = false
                }
                console.log(geojson)
                // 更新
                source.setData(geojson);
                store.state.clickCircleGeojsonText = JSON.stringify(geojson)
                clickCircleSource.obj.data = geojson
                await saveDrowFeatures(geojson.features);
            } else if (store.state.isDrawLassoForTokizyo) {
                const layerId = 'oh-homusyo-2025-polygon';
                const intersectsFeatures = await getIntersectsFeatures(map01, layerId, polygon)
                console.log(intersectsFeatures)
                store.state.highlightedChibans = new Set()
                intersectsFeatures.forEach(f => {
                    const targetId = `${f.properties['筆ID']}_${f.properties['地番']}`;
                    store.state.highlightedChibans.add(targetId);
                })
                highlightSpecificFeatures2025(map01,layerId);
            } else if (store.state.isDrawLassoForChibanzu) {

                const layers = layersOnScreen(map01)
                console.log(layers.filter(layer => layer.id.includes('oh-chiban')))
                const layerId = layers.filter(layer => layer.id.includes('oh-chiban'))[0]?.id
                if (layerId) {
                    const idString = layerId.includes('oh-chibanzu') ? 'id' : 'oh3id'
                    const intersectsFeatures = await getIntersectsFeatures(map01, layerId, polygon)
                    console.log(intersectsFeatures)
                    store.state.highlightedChibans = new Set()
                    intersectsFeatures.forEach(f => {
                        const targetId = `${f.properties[idString]}`;
                        store.state.highlightedChibans.add(targetId);
                    })
                    highlightSpecificFeaturesCity(map01,layerId);
                }
            }
        }
        // 投げ縄ラインをクリア
        map01.getSource(lassoSourceId).setData({ type: 'FeatureCollection', features: [] });
        map01.removeLayer(lassoLayerId)
        map01.removeSource(lassoSourceId)
        map01.dragPan.enable();
    });
}

async function getIntersectsFeatures(map, layerId, polygon) {
    const features = map.queryRenderedFeatures({
        layers: [layerId],
    });
        // GeoJSON形式に変換
        const pmtilesFeatures = {
            type: 'FeatureCollection',
            features: features.map((f) => ({
                type: 'Feature',
                geometry: f.geometry,
                properties: f.properties,
            })),
        };

        console.log(pmtilesFeatures)

    const intersectsFeatures = pmtilesFeatures.features.filter((feature) => {
        if (turf.booleanIntersects(polygon, feature)) {
            return feature
        }
    })
    console.log('該当地物:', intersectsFeatures);
    return intersectsFeatures
}


// ---------------------- 使い方（最小例） --------------------------------------
// const layerId = 'oh-homusyo-2025-polygon';
// const hits = await featuresInPolygonPMTilesFast({
//   map,
//   layerId,
//   selection,           // Feature<Polygon|MultiPolygon>
//   idProp: 'TXTCD',     // あなたの属性名に合わせる
//   mergeExistingFilter: true,
//   restoreFilter: true,
//   fit: true,           // selection 全域を読み込ませたいとき
// });
// console.log('ヒット件数', hits.length, hits.map(f => f.properties.TXTCD));
// // showRenderedFeatures(map, hits); // 目視確認したい場合




// import store from '@/store'
// import {geojsonCreate} from "@/js/pyramid";
// import {popup} from "@/js/popup";
// const tempFreehandCoords = []
// let isDrawing = false;
//
// export default function drawMethods(options = {}) {
//     const map01 = store.state.map01
//
//     function onLineClick(e) {
//         popup(e, map01, 'map01', store.state.map2Flg)
//     }
//
//     map01.getCanvas().addEventListener('pointerdown', (e) => {
//         if (!store.state.isDrawFree) return;
//
//         const point = map01.unproject([e.clientX, e.clientY]);
//         isDrawing = true;
//         tempFreehandCoords.length = 0
//         tempFreehandCoords.push([point.lng, point.lat]);
//
//         map01.getCanvas().style.cursor = 'crosshair';
//         map01.dragPan.disable(); // パン無効化
//     });
//
//     // pointermove（描画中）
//     map01.getCanvas().addEventListener('pointermove', (e) => {
//         if (!isDrawing) return;
//
//         const point = map01.unproject([e.clientX, e.clientY]);
//         tempFreehandCoords.push([point.lng, point.lat]);
//
//         const tempLine = {
//             type: 'FeatureCollection',
//             features: [{
//                 type: 'Feature',
//                 geometry: {
//                     type: 'LineString',
//                     coordinates: tempFreehandCoords
//                 },
//                 properties: {
//                     'keiko': 0,
//                     'color': store.state.currentFreeHandColor || 'black',
//                     'keiko-color': store.state.currentFreeHandKeikoColor || '#1C1C1C',
//                     'line-width': store.state.currentFreeHandWidth || 5,
//                 }
//             }]
//         };
//         map01.getSource('freehand-preview-source').setData(tempLine);
//     });
//
//     // pointerup（終了）
//     map01.getCanvas().addEventListener('pointerup', (e) => {
//         if (!isDrawing) return;
//         isDrawing = false;
//         map01.getCanvas().style.cursor = '';
//         // alert('pan')
//         map01.dragPan.enable(); // パン再有効化
//
//         if (tempFreehandCoords.length >= 2) {
//             const id = String(Math.floor(10000 + Math.random() * 90000));
//             store.state.id = id;
//
//             const properties = {
//                 id: id,
//                 'free-hand': 1,
//                 keiko: 0,
//                 label: '',
//                 color: 'black',
//                 // 'keiko-color': '#FF8000',
//                 'keiko-color': store.state.currentFreeHandKeikoColor || 'rgba( 28,  28,  28, 0.5)',
//                 offsetValue: [0.6, 0],
//                 'line-width': store.state.currentFreeHandWidth || 5,
//                 textAnchor: 'left',
//                 textJustify: 'left'
//             };
//
//             geojsonCreate(map01, 'FreeHand', tempFreehandCoords.slice(), properties);
//
//             // 擬似クリック
//             store.state.coordinates = tempFreehandCoords[0];
//             const dummyEvent = {lngLat: {lng: tempFreehandCoords[0][0], lat: tempFreehandCoords[0][1]}};
//             setTimeout(() => {
//                 onLineClick(dummyEvent);
//             }, 500);
//         }
//
//         finishLine();
//         tempFreehandCoords.length = 0;
//     });
//
//     // pointerleave（指やカーソルが外れたとき）も描画終了しておく
//     map01.getCanvas().addEventListener('pointerleave', () => {
//         if (isDrawing) {
//             isDrawing = false;
//             // alert('pan')
//             map01.dragPan.enable();
//             map01.getCanvas().style.cursor = '';
//             tempFreehandCoords.length = 0
//         }
//     });
//
//     function finishLine() {
//         // ガイドライン消去
//         if (map01.getSource('guide-line-source')) {
//             map01.getSource('guide-line-source').setData({
//                 type: 'FeatureCollection',
//                 features: []
//             });
//         }
//         // フリーハンドプレビューレイヤー消去
//         if (map01.getSource('freehand-preview-source')) {
//             map01.getSource('freehand-preview-source').setData({
//                 type: 'FeatureCollection',
//                 features: []
//             });
//         }
//         tempFreehandCoords.length = 0
//         // this.tempLineCoords = []
//         // this.tempLineCoordsGuide = []
//         // this.tempPolygonCoords = []
//         // this.tempLineCoordsCoords = []
//     }
// }