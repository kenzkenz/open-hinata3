import store from '@/store'
import {colorNameToRgba, geojsonCreate} from "@/js/pyramid";
import { popup } from "@/js/popup";
import * as turf from "@turf/turf";
import {haptic} from "@/js/utils/haptics";

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
}




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