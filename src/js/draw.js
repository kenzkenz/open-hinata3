import store from '@/store'
import {
    colorNameToRgba,
    generateSegmentLabelGeoJSON,
    generateStartEndPointsFromGeoJSON,
    geojsonCreate
} from "@/js/pyramid";
import { popup } from "@/js/popup";
import * as turf from "@turf/turf";
import {haptic} from "@/js/utils/haptics";
import {clickCircleSource, zenkokuChibanzuAddLayer} from "@/js/layers";
import {
    dedupeCoords, featureCollectionAdd,
    highlightSpecificFeatures2025,
    highlightSpecificFeaturesCity,
    layersOnScreen, markaersRemove, markerAddAndRemove,
    saveDrowFeatures
} from "@/js/downLoad";

// =============================================================
// フリーハンド自己交差(=ループ)検出（Turf.js）
// =============================================================
const tempFreehandCoords = []
const tempPolygonCoords  = []
let   tempLineCoordsGuide = []
let tempLineCoords     = []
let isDrawing = false;
let loopTriggered = false; // 多重発火防止
let clickTimer = null;
let isDrawingLine = false
let lastSnapHit = null;
const CLICK_DELAY = 150; // ms

const EPS = 1e-9;
const almostEq = (a, b) => Math.abs(a - b) <= EPS;
const sameXY = (p, q) => almostEq(p[0], q[0]) && almostEq(p[1], q[1]);

export default function drawMethods(options = {}) {
    const { autoStopOnLoop = true } = options || {};
    const map01 = store.state.map01;

    // ---------------- Utils: 正規化 / 距離 / ガイド ----------------
    function normalizeLngLat(ll) {
        let lng = ll.lng;
        lng = ((lng + 180) % 360 + 360) % 360 - 180; // [-180,180)
        return { lng, lat: ll.lat };
    }
    function pxDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function ensureGuideLineSource(map) {
        if (!map.getSource('guide-line-source')) {
            map.addSource('guide-line-source', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
        }
        if (!map.getLayer('guide-line-layer')) {
            map.addLayer({
                id: 'guide-line-layer',
                type: 'line',
                source: 'guide-line-source',
                paint: { 'line-color': '#333', 'line-width': 2 }
            });
        }
    }
    function updateGuideLine(map, baseCoords, cursorLL) {
        ensureGuideLineSource(map);
        if (!baseCoords?.length) return;
        const gsrc = map.getSource('guide-line-source');
        const guideCoords = baseCoords.concat([[cursorLL.lng, cursorLL.lat]]);
        gsrc.setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: guideCoords },
                properties: {}
            }]
        });
    }

    // 画面空間 最近点（辺）
    function nearestOnScreenLines(map, lines, pointPx) {
        let best = null;
        const nearestOnSegPx = (A, B, P) => {
            const vx = B.x - A.x, vy = B.y - A.y;
            const wx = P.x - A.x, wy = P.y - A.y;
            const vv = vx*vx + vy*vy || 1e-9;
            let t = (vx*wx + vy*wy) / vv;
            t = Math.max(0, Math.min(1, t));
            return { x: A.x + t*vx, y: A.y + t*vy };
        };
        for (const line of lines) {
            if (!line || line.length < 2) continue;
            const px = line.map(([lng,lat]) => map.project({lng,lat}));
            for (let i=0;i<px.length-1;i++) {
                const Q = nearestOnSegPx(px[i], px[i+1], pointPx);
                const d = Math.hypot(Q.x - pointPx.x, Q.y - pointPx.y);
                if (!best || d < best.d) best = { Q, d };
            }
        }
        if (!best) return null;
        const lngLat = map.unproject([best.Q.x, best.Q.y]);
        return { lng: lngLat.lng, lat: lngLat.lat, distPx: best.d };
    }

    // MapLibreの版差対策: 生データ取得
    function readGeojsonData(src) {
        return src?._data || (typeof src?.getData === 'function' ? src.getData() : null) ||
            (src?._options && src._options.data) || null;
    }

    // 交差検出
    function detectLoopWithTurf(coords) {
        if (!coords || coords.length < 4) return null;
        const n = coords.length;
        const a1 = coords[n - 2];
        const a2 = coords[n - 1];
        if (sameXY(a1, a2)) return null;
        const segA = turf.lineString([a1, a2]);
        for (let j = 0; j <= n - 4; j++) {
            const b1 = coords[j], b2 = coords[j + 1];
            if (sameXY(b1, b2)) continue;
            const segB = turf.lineString([b1, b2]);
            const inter = turf.lineIntersect(segA, segB);
            if (inter.features.length === 0) continue;
            for (const f of inter.features) {
                const p = f.geometry.coordinates;
                if (sameXY(p, a1)) continue;
                const mid = coords.slice(j + 1, n - 1);
                const ring = [p, ...mid, p];
                if (ring.length >= 4) {
                    return { ring, meta: { intersection: p, hitOn: { j }, coords: coords.slice() } };
                }
            }
        }
        return null;
    }

    // ---------------- 強力スナッパ ----------------
    function createStrongRawSnapper(
        map,
        {
            sourceIds = [],                         // ← スナップ対象 GeoJSON Source ID を全部
            radii = { vertexBase: 16, edgeBase: 12 }, // px
            zoomRef = 14,                           // ここより低ズームで半径拡大
            zoomScale = 1.25,                       // 1段ズームアウトごとに ×1.25
            sticky = { enable: true, radiusFactor: 1.8 }, // 例: 頂点半径×1.8以内なら保持
            self = { enable: true, getCoords: () => tempPolygonCoords },
            previewSourceId = 'snap-point-src',
            previewLayerId = 'snap-point-lyr',
            excludeSources = ['snap-point-src','freehand-preview-source','guide-line-source','lasso-source']
        } = {}
    ) {
        // プレビュー点
        if (!map.getSource(previewSourceId)) {
            map.addSource(previewSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        }
        if (!map.getLayer(previewLayerId)) {
            map.addLayer({
                id: previewLayerId, type: 'circle', source: previewSourceId,
                paint: { 'circle-radius': 6, 'circle-color': '#22aaff', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
            });
        }
        const setPreview = (lngLat) => {
            const ll = lngLat ? normalizeLngLat(lngLat) : null;
            const fc = ll
                ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] }, properties: {} }] }
                : { type: 'FeatureCollection', features: [] };
            map.getSource(previewSourceId).setData(fc);
        };

        const collectVertices = (geom, push) => {
            const t = geom.type;
            if (t === 'Point') push(geom.coordinates);
            else if (t === 'MultiPoint') geom.coordinates.forEach(push);
            else if (t === 'LineString') geom.coordinates.forEach(push);
            else if (t === 'MultiLineString') geom.coordinates.flat().forEach(push);
            else if (t === 'Polygon') geom.coordinates.flat().forEach(push);
            else if (t === 'MultiPolygon') geom.coordinates.flat(2).forEach(push);
        };
        const collectLines = (geom) => {
            const t = geom.type;
            if (t === 'LineString') return [geom.coordinates];
            if (t === 'MultiLineString') return geom.coordinates;
            if (t === 'Polygon') return geom.coordinates;             // 各リング
            if (t === 'MultiPolygon') return geom.coordinates.flat(); // 全リング
            return [];
        };

        const getRadii = () => {
            const z = map.getZoom?.() ?? zoomRef;
            const k = Math.max(1, Math.pow(zoomScale, Math.max(0, zoomRef - z))); // z<zoomRef で拡大
            return { v: radii.vertexBase * k, e: radii.edgeBase * k, k };
        };

        const getSnap = (pointPx, { first = null, preferVertex = false, lastSnapHit = null } = {}) => {
            const { v: tolV, e: tolE } = getRadii();

            // スティッキー
            if (sticky?.enable && lastSnapHit?.lngLat) {
                const dPrev = pxDist(map.project(lastSnapHit.lngLat), pointPx);
                const keepR = (lastSnapHit.type?.startsWith('vertex') ? tolV : tolE) * (sticky.radiusFactor ?? 1.5);
                if (dPrev <= keepR) {
                    setPreview(lastSnapHit.lngLat);
                    return lastSnapHit;
                }
            }

            let bestVertex = null;
            let bestEdge   = null;

            const considerV = (lngLat, type='vertex') => {
                const d = pxDist(map.project(lngLat), pointPx);
                if (d <= tolV && (!bestVertex || d < bestVertex.distPx)) {
                    bestVertex = { lngLat, type, distPx: d };
                }
            };
            const considerE = (lngLat, type='edge') => {
                const d = pxDist(map.project(lngLat), pointPx);
                if (d <= tolE && (!bestEdge || d < bestEdge.distPx)) {
                    bestEdge = { lngLat, type, distPx: d };
                }
            };

            // 0) 先頭点で閉じる
            if (first) considerV(first, 'first');

            // 1) GeoJSON生データ
            for (const sid of sourceIds) {
                if (excludeSources.includes(sid)) continue;
                const src = map.getSource(sid);
                if (!src) continue;

                const raw = readGeojsonData(src);
                if (!raw) continue;

                const fc = raw.type === 'FeatureCollection'
                    ? raw
                    : { type: 'FeatureCollection', features: Array.isArray(raw.features) ? raw.features : [] };

                for (const f of fc.features || []) {
                    const g = f?.geometry; if (!g) continue;
                    // 頂点
                    collectVertices(g, (c) => considerV({ lng: c[0], lat: c[1] }, 'vertex'));
                    // 辺
                    if (!preferVertex) {
                        const lines = collectLines(g);
                        const ll = nearestOnScreenLines(map, lines, pointPx);
                        if (ll) considerE({ lng: ll.lng, lat: ll.lat }, 'edge');
                    }
                }
            }

            // 2) 自分自身（描画中リング）
            if (self?.enable) {
                const coords = (self.getCoords?.() || []).slice();
                if (coords.length) {
                    for (const c of coords) considerV({ lng: c[0], lat: c[1] }, 'self-vertex');
                    if (!preferVertex && coords.length >= 2) {
                        const ringClosed = (coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1])
                            ? coords : coords.concat([coords[0]]);
                        const ll = nearestOnScreenLines(map, [ringClosed], pointPx);
                        if (ll) considerE({ lng: ll.lng, lat: ll.lat }, 'self-edge');
                    }
                }
            }

            const result = bestVertex || (preferVertex ? null : bestEdge) || null;
            setPreview(result?.lngLat || null);
            return result;
        };

        return { getSnap, setPreview, getRadii };
    }

    // ---------------- Pointer handlers: Freehand ----------------
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

        const last = tempFreehandCoords[tempFreehandCoords.length - 1];
        if (!last || !sameXY(last, xy)) tempFreehandCoords.push(xy);

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

        if (!loopTriggered) {
            const hit = detectLoopWithTurf(tempFreehandCoords);
            if (hit) {
                loopTriggered = true;

                const ring = hit.ring;
                const p = hit.meta.intersection;

                if (autoStopOnLoop) {
                    isDrawing = false;
                    map01.getCanvas().style.cursor = '';
                    map01.dragPan.enable();
                    finishPreview();
                }

                const coords = [ring];

                const id = String(Math.floor(10000 + Math.random() * 90000));
                store.state.id = id;
                const properties = {
                    id, pairId: id, label: 'ポリゴンに変更',
                    color: colorNameToRgba('hotpink', 0.6),
                    'line-width': 3,
                };
                geojsonCreate(map01, 'Polygon', coords, properties);

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

        if (!loopTriggered && tempFreehandCoords.length >= 2) {
            const id = String(Math.floor(10000 + Math.random() * 90000));
            store.state.id = id;

            const properties = {
                id, 'free-hand': 1, keiko: 0, label: '',
                color: 'black',
                'keiko-color': store.state.currentFreeHandKeikoColor || 'rgba(28,28,28,0.5)',
                offsetValue: [0.6, 0],
                'line-width': store.state.currentFreeHandWidth || 5,
                textAnchor: 'left',
                textJustify: 'left',
            };

            geojsonCreate(map01, 'FreeHand', tempFreehandCoords.slice(), properties);

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

    map01.on('click', (e) => {
        if (store.state.isDrawPolygon || store.state.isDrawLine || store.state.isDrawPoint) {
            haptic({ strength: 'success' })
        }
    })

    // ---------------- Lasso（既存そのまま） ----------------
    let isLassoDrawing = false;
    let lassoCoords = [];
    const lassoSourceId = 'lasso-source';
    const lassoLayerId = 'lasso-layer';

    map01.getCanvas().addEventListener('pointerdown', (e) => {
        if (!store.state.isDrawLasso && !store.state.isDrawLassoForTokizyo && !store.state.isDrawLassoForChibanzu) return;
        if (!map01.getSource(lassoSourceId)) {
            map01.addSource(lassoSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map01.addLayer({
                id: lassoLayerId, type: 'line', source: lassoSourceId,
                paint: { 'line-color': 'rgba(0,0,255,0.6)', 'line-width': 10 }
            });
        }
        map01.dragPan.disable();
        isLassoDrawing = true;
        lassoCoords = [];
        map01.getCanvas().style.cursor = 'crosshair';
    });

    map01.getCanvas().addEventListener('pointermove', (e) => {
        if (!isLassoDrawing) return;
        const point = map01.unproject([e.clientX, e.clientY]);
        lassoCoords.push([point.lng, point.lat]);
        map01.getSource(lassoSourceId).setData({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: lassoCoords } }]
        });
    });

    map01.getCanvas().addEventListener('pointerup', async (e) => {
        if (!isLassoDrawing) return;
        isLassoDrawing = false;
        map01.getCanvas().style.cursor = '';
        if (lassoCoords.length >= 3) {
            lassoCoords.push(lassoCoords[0]);
            const polygon = turf.polygon([lassoCoords]);
            if (store.state.isDraw) {
                const source = map01.getSource(clickCircleSource.iD);
                const geojson = source._data;
                let isLassoSelected = false
                const [pMinX, pMinY, pMaxX, pMaxY] = turf.bbox(polygon);
                geojson.features.forEach(feature => {
                    feature.properties.lassoSelected = false;
                    if (feature.geometry) {
                        const [fMinX, fMinY, fMaxX, fMaxY] = turf.bbox(feature);
                        if (fMaxX < pMinX || fMinX > pMaxX || fMaxY < pMinY || fMinY > pMaxY) return;
                        if (turf.booleanIntersects(feature, polygon)) {
                            feature.properties.lassoSelected = true;
                            isLassoSelected = true;
                        }
                    }
                });
                store.state.lassoGeojson = JSON.stringify(turf.featureCollection(geojson.features.filter(f => f.properties.lassoSelected === true)))
                store.state.isLassoSelected = !!isLassoSelected
                source.setData(geojson);
                store.state.clickCircleGeojsonText = JSON.stringify(geojson)
                clickCircleSource.obj.data = geojson
                await saveDrowFeatures(geojson.features);
            } else if (store.state.isDrawLassoForTokizyo) {
                const layerId = 'oh-homusyo-2025-polygon';
                const intersectsFeatures = await getIntersectsFeatures(map01, layerId, polygon)
                store.state.highlightedChibans = new Set()
                intersectsFeatures.forEach(f => {
                    const targetId = `${f.properties['筆ID']}_${f.properties['地番']}`;
                    store.state.highlightedChibans.add(targetId);
                })
                highlightSpecificFeatures2025(map01,layerId);
            } else if (store.state.isDrawLassoForChibanzu) {
                const layers = layersOnScreen(map01)
                const layerId = layers.filter(layer => layer.id.includes('oh-chiban'))[0]?.id
                if (layerId) {
                    const idString = layerId.includes('oh-chibanzu') ? 'id' : 'oh3id'
                    const intersectsFeatures = await getIntersectsFeatures(map01, layerId, polygon)
                    store.state.highlightedChibans = new Set()
                    intersectsFeatures.forEach(f => {
                        const targetId = `${f.properties[idString]}`;
                        store.state.highlightedChibans.add(targetId);
                    })
                    highlightSpecificFeaturesCity(map01,layerId);
                }
            }
        }
        map01.getSource(lassoSourceId).setData({ type: 'FeatureCollection', features: [] });
        map01.removeLayer(lassoLayerId)
        map01.removeSource(lassoSourceId)
        map01.dragPan.enable();
    });

    // ---------------- スナップ（強力版） ----------------
    setTimeout(() => {
        const snap = createStrongRawSnapper(map01, {
            sourceIds: [clickCircleSource.iD], // ←必要な GeoJSON Source を全部
            radii: { vertexBase: 16, edgeBase: 12 },
            zoomRef: 14, zoomScale: 1.25,
            sticky: { enable: true, radiusFactor: 1.8 },
            self: { enable: true, getCoords: () => tempPolygonCoords },
            excludeSources: ['snap-point-src','freehand-preview-source','guide-line-source','lasso-source']
        });

        function onPolygonClick(e) {
            popup(e, map01, 'map01', store.state.map2Flg);
        }

        // mousemove: スナップ判定 & プレビュー更新（描画中のみ）
        map01.on('mousemove', (e) => {
            if (!store.state.isDrawPolygon && !store.state.isDrawLine) {
                snap.setPreview(null);
                lastSnapHit = null;
                return;
            }
            const firstLL = tempPolygonCoords.length
                ? {lng: tempPolygonCoords[0][0], lat: tempPolygonCoords[0][1]}
                : null;

            const preferVertex = !!e.originalEvent?.shiftKey;
            lastSnapHit = snap.getSnap(e.point, { first: firstLL, preferVertex, lastSnapHit });

            // ガイドもスナップ位置で更新
            const cursor = lastSnapHit?.lngLat ? normalizeLngLat(lastSnapHit.lngLat) : e.lngLat;
            if (store.state.isDrawPolygon) {
                updateGuideLine(map01, tempPolygonCoords, cursor);
            } else if (store.state.isDrawLine) {
                updateGuideLine(map01, tempLineCoordsGuide, cursor);
            }
        });

        // click: ヒット最優先で確定（ガイド始点もスナップ座標）
        map01.on('click', (e) => {
            if (!store.state.isDrawPolygon && !store.state.isDrawLine) return;

            const firstLL = tempPolygonCoords.length
                ? { lng: tempPolygonCoords[0][0], lat: tempPolygonCoords[0][1] }
                : null;

            const preferVertex = !!e.originalEvent?.shiftKey;
            const hit = lastSnapHit || snap.getSnap(e.point, { first: firstLL, preferVertex, lastSnapHit });
            const ll = normalizeLngLat(hit?.lngLat || e.lngLat);
            const p  = [ll.lng, ll.lat];

            if (store.state.isDrawPolygon) {
                const last = tempPolygonCoords[tempPolygonCoords.length - 1];
                if (!last || last[0] !== p[0] || last[1] !== p[1]) tempPolygonCoords.push(p);
            }

            // ガイド始点も同じ点で
            ensureGuideLineSource(map01);
            const lastG = tempLineCoordsGuide[tempLineCoordsGuide.length - 1];
            if (!lastG || lastG[0] !== p[0] || lastG[1] !== p[1]) {
                tempLineCoordsGuide.push(p);
            }
        });

        // dblclick: ポリゴン確定
        map01.on('dblclick', (e) => {
            if (!store.state.isDrawPolygon) return;
            if (clickTimer !== null) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }
            e.preventDefault();
            if (tempPolygonCoords.length >= 3) {
                if (
                    tempPolygonCoords.length < 4 ||
                    tempPolygonCoords[0][0] !== tempPolygonCoords.at(-1)[0] ||
                    tempPolygonCoords[0][1] !== tempPolygonCoords.at(-1)[1]
                ) {
                    tempPolygonCoords.push([...tempPolygonCoords[0]]);
                }
                const coords = [tempPolygonCoords.slice()];
                const id = String(Math.floor(10000 + Math.random() * 90000));
                store.state.id = id;
                const properties = {
                    id, pairId: id, label: '',
                    color: colorNameToRgba(store.state.currentPolygonColor || 'yellow', 0.6),
                    'line-width': 1,
                };
                geojsonCreate(map01, 'Polygon', coords, properties);

                const dummyEvent = { lngLat: {lng: tempPolygonCoords[0][0], lat: tempPolygonCoords[0][1]} };
                store.state.coordinates = [tempPolygonCoords[0][0], tempPolygonCoords[0][1]];
                setTimeout(() => { onPolygonClick(dummyEvent); }, 500);

                finishPreview();
                tempPolygonCoords.length = 0;
                tempLineCoordsGuide.length = 0;
                snap.setPreview(null);
                lastSnapHit = null;
            }
        });
    }, 10);

    // ライン描画
    map01.on('click', (e) => {
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;
        const coordinates = [lng, lat];
        store.state.coordinates = coordinates
        // クリック判定
        const targetId = getLineFeatureIdAtClickByPixel(map01, e);
        if (targetId) {
            store.state.id = targetId;
            return;
        }
        if (!store.state.isDrawLine) return;
        if (clickTimer !== null) return; // 2回目のクリック時は無視
        clickTimer = setTimeout(() => {
            // 節点追加
            tempLineCoords.push(coordinates);
            tempLineCoords = dedupeCoords(tempLineCoords)
            console.log('シングルクリック！');
            clickTimer = null;
        }, CLICK_DELAY);
    });
    // ダブルクリック時：ライン確定
    map01.on('dblclick', (e) => {
        if (!store.state.isDrawLine) return;
        if (clickTimer !== null) {
            clearTimeout(clickTimer); // シングルの予定をキャンセル
            clickTimer = null;
        }
        e.preventDefault(); // 地図ズーム防止
        if (tempLineCoords.length >= 2) {
            // ライン作成
            const id = String(Math.floor(10000 + Math.random() * 90000));
            store.state.id = id;
            const properties = {
                id: id,
                pairId: id,
                label: '',
                labelType: store.state.currentLineLabelType,
                offsetValue: [0.6, 0],
                color: store.state.currentLineColor,
                arrow: store.state.currentArrowColor,
                'line-width': store.state.currentLineWidth,
                textAnchor: 'left',
                textJustify: 'left',
                calc: store.state.currentLineCalcCheck
            };
            geojsonCreate(map01, 'LineString', tempLineCoords.slice(), properties);
            // 擬似クリックイベント発火（最初の点）
            const dummyEvent = {
                lngLat: {
                    lng: tempLineCoords[0][0],
                    lat: tempLineCoords[0][1]
                }
            };
            store.state.coordinates = [tempLineCoords[0][0], tempLineCoords[0][1]];
            setTimeout(() => {
                onLineClick(dummyEvent);
            }, 500);
            finishPreview()
            // 終了
            tempLineCoords.length = 0
        }
    });
    // let isFirstTouch = true;
    map01.on('touchstart', (e) => {
        if (!store.state.isDrawLine && !store.state.isDrawPolygon) return;
        // if (!isFirstTouch) return;
        // isFirstTouch = false;
        const touch = e.touches?.[0] || e.originalEvent?.touches?.[0];
        if (!touch) return;
        const rect = map01.getCanvas().getBoundingClientRect();
        const point = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
        const lngLat = map01.unproject(point);
        const vertexGeojson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lngLat.lng, lngLat.lat]
                },
                properties: {}
            }]
        };
        map01.getSource('guide-line-source')?.setData(vertexGeojson);
    });
}

function getLineFeatureIdAtClickByPixel(map, e, pixelTolerance = 20) {
    if (!e || !e.lngLat) return null;
    const clickPixel = map.project(e.lngLat);
    const features = map.getSource(clickCircleSource.iD)._data.features || [];
    const found = features.find(f => {
        if (!f.geometry || f.geometry.type !== 'LineString') return false;
        const coords = f.geometry.coordinates;
        // 各線分ごとに最短ピクセル距離を調べる
        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = map.project({ lng: coords[i][0], lat: coords[i][1] });
            const p2 = map.project({ lng: coords[i + 1][0], lat: coords[i + 1][1] });
            const d = pointToSegmentDistance(clickPixel, p1, p2);
            if (d <= pixelTolerance) return true;
        }
        return false;
    });
    return found ? found.properties.id : null;
}
// 2点間の線分への最短距離（ピクセル空間で）
function pointToSegmentDistance(pt, p1, p2) {
    const x = pt.x, y = pt.y;
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
        // 線分が点の場合
        return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
    }
    // t: 線分上の最近点パラメータ（0～1）
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
}


// import store from '@/store'
// import {colorNameToRgba, geojsonCreate} from "@/js/pyramid";
// import { popup } from "@/js/popup";
// import * as turf from "@turf/turf";
// import {haptic} from "@/js/utils/haptics";
// import {clickCircleSource, zenkokuChibanzuAddLayer} from "@/js/layers";
// import {
//     dedupeCoords,
//     highlightSpecificFeatures2025,
//     highlightSpecificFeaturesCity,
//     layersOnScreen,
//     saveDrowFeatures
// } from "@/js/downLoad";
//
// // =============================================================
// // フリーハンド自己交差(=ループ)検出（Turf.js）
// //   - 最後に追加した線分( a1->a2 ) と、過去の各線分( b1->b2 )の交点を
// //     turf.lineIntersect で直接探索（端点タッチも検出可能）。
// //   - 交点が見つかったら、[交点 → (j+1..n-2) → 交点] で閉じたリングを作成し、
// //     options.onLoop(ring, meta) に通知。ポリゴン化は呼び出し側で行う。
// //   - options.autoStopOnLoop = true なら検出時に描画停止＆プレビュー消去。
// // =============================================================
//
// const tempFreehandCoords = []
// const tempPolygonCoords = []
// let tempLineCoordsGuide = []
// const tempLineCoords = []
// let isDrawing = false;
// let loopTriggered = false; // 多重発火防止
// let clickTimer = null;
// let isDrawingLine = false
// let lastSnapHit = null;
// const CLICK_DELAY = 150; // ms
//
// const EPS = 1e-9;
// const almostEq = (a, b) => Math.abs(a - b) <= EPS;
// const sameXY = (p, q) => almostEq(p[0], q[0]) && almostEq(p[1], q[1]);
//
// export default function drawMethods(options = {}) {
//     const { autoStopOnLoop = true } = options || {};
//     const map01 = store.state.map01;
//
//     // ------------------------------------
//     // 交差検出: lineIntersect で直接判定
//     // ------------------------------------
//     function detectLoopWithTurf(coords) {
//         if (!coords || coords.length < 4) return null; // ループ最短は4点
//
//         const n = coords.length;
//         const a1 = coords[n - 2];
//         const a2 = coords[n - 1];
//
//         // 0長さ(同一点)の最新セグメントは無視
//         if (sameXY(a1, a2)) return null;
//
//         const segA = turf.lineString([a1, a2]);
//
//         // 隣接線分は除外（0..n-4 まで）。
//         for (let j = 0; j <= n - 4; j++) {
//             const b1 = coords[j];
//             const b2 = coords[j + 1];
//             // 0長さの古いセグメントはスキップ
//             if (sameXY(b1, b2)) continue;
//
//             const segB = turf.lineString([b1, b2]);
//             const inter = turf.lineIntersect(segA, segB);
//             if (inter.features.length === 0) continue;
//
//             // 複数交点が返る場合があるので、使える交点を一つ選ぶ
//             for (const f of inter.features) {
//                 const p = f.geometry.coordinates; // [lng, lat]
//
//                 // a1(直前点)との交点は無視（数値誤差込み）
//                 if (sameXY(p, a1)) continue;
//
//                 // 交点 p を始点・終点にして、[p, ...coords(j+1..n-2), p] で閉じたリングを構築
//                 const mid = coords.slice(j + 1, n - 1); // a2 は含めない
//                 const ring = [p, ...mid, p];
//                 if (ring.length >= 4) {
//                     return {
//                         ring,
//                         meta: { intersection: p, hitOn: { j }, coords: coords.slice() },
//                     };
//                 }
//             }
//         }
//
//         return null;
//     }
//
//     // ------------------------------------
//     // Pointer handlers
//     // ------------------------------------
//     map01.getCanvas().addEventListener('pointerdown', (e) => {
//         if (!store.state.isDrawFree) return;
//
//         const point = map01.unproject([e.clientX, e.clientY]);
//         isDrawing = true;
//         loopTriggered = false;
//
//         tempFreehandCoords.length = 0;
//         tempFreehandCoords.push([point.lng, point.lat]);
//
//         map01.getCanvas().style.cursor = 'crosshair';
//         map01.dragPan.disable();
//     });
//
//     map01.getCanvas().addEventListener('pointermove', (e) => {
//         if (!isDrawing) return;
//
//         const pt = map01.unproject([e.clientX, e.clientY]);
//         const xy = [pt.lng, pt.lat];
//
//         // 連続同一点のサンプリング抑止
//         const last = tempFreehandCoords[tempFreehandCoords.length - 1];
//         if (!last || !sameXY(last, xy)) {
//             tempFreehandCoords.push(xy);
//         }
//
//         // プレビュー更新（存在チェック）
//         const previewSrc = map01.getSource('freehand-preview-source');
//         if (previewSrc) {
//             previewSrc.setData({
//                 type: 'FeatureCollection',
//                 features: [{
//                     type: 'Feature',
//                     geometry: { type: 'LineString', coordinates: tempFreehandCoords },
//                     properties: {
//                         keiko: 0,
//                         color: store.state.currentFreeHandColor || 'black',
//                         'keiko-color': store.state.currentFreeHandKeikoColor || '#1C1C1C',
//                         'line-width': store.state.currentFreeHandWidth || 5,
//                     },
//                 }],
//             });
//         }
//
//         // ループ検知（1回だけ）
//         if (!loopTriggered) {
//             const hit = detectLoopWithTurf(tempFreehandCoords);
//             if (hit) {
//                 loopTriggered = true;
//
//                 // ★交点を始点・終点にした閉じたリング（[p, ..., p]）
//                 const ring = hit.ring; // すでに先頭=末尾が交点pでクローズ済み
//                 const p = hit.meta.intersection; // [lng, lat]
//
//                 if (autoStopOnLoop) {
//                     isDrawing = false;
//                     map01.getCanvas().style.cursor = '';
//                     map01.dragPan.enable();
//                     finishPreview();
//                 }
//
//                 // ★ringをそのままPolygonに使う（交点p始まりp終わり）
//                 const coords = [ring];
//
//                 const id = String(Math.floor(10000 + Math.random() * 90000));
//                 store.state.id = id;
//                 const properties = {
//                     id,
//                     pairId: id,
//                     label: 'ポリゴンに変更',
//                     // color: colorNameToRgba(store.state.currentPolygonColor || 'yellow', 0.6),
//                     color: colorNameToRgba('hotpink', 0.6),
//                     'line-width': 3,
//                 };
//                 geojsonCreate(map01, 'Polygon', coords, properties);
//
//                 // ★擬似クリックも交点pで
//                 const dummyEvent = { lngLat: { lng: p[0], lat: p[1] } };
//                 store.state.coordinates = [p[0], p[1]];
//                 setTimeout(() => { onLineClick(dummyEvent); }, 500);
//
//                 finishPreview();
//                 tempFreehandCoords.length = 0;
//             }
//         }
//
//     });
//
//     map01.getCanvas().addEventListener('pointerup', () => {
//         if (!isDrawing) return;
//         isDrawing = false;
//         map01.getCanvas().style.cursor = '';
//         map01.dragPan.enable();
//
//         // ループ未検知時のみ従来ライン確定（必要な場合）
//         if (!loopTriggered && tempFreehandCoords.length >= 2) {
//             const id = String(Math.floor(10000 + Math.random() * 90000));
//             store.state.id = id;
//
//             const properties = {
//                 id,
//                 'free-hand': 1,
//                 keiko: 0,
//                 label: '',
//                 color: 'black',
//                 'keiko-color': store.state.currentFreeHandKeikoColor || 'rgba(28,28,28,0.5)',
//                 offsetValue: [0.6, 0],
//                 'line-width': store.state.currentFreeHandWidth || 5,
//                 textAnchor: 'left',
//                 textJustify: 'left',
//             };
//
//             geojsonCreate(map01, 'FreeHand', tempFreehandCoords.slice(), properties);
//
//             // 擬似クリック
//             store.state.coordinates = tempFreehandCoords[0];
//             const ev = { lngLat: { lng: tempFreehandCoords[0][0], lat: tempFreehandCoords[0][1] } };
//             setTimeout(() => onLineClick(ev), 500);
//         }
//
//         finishPreview();
//         tempFreehandCoords.length = 0;
//     });
//
//     map01.getCanvas().addEventListener('pointerleave', () => {
//         if (!isDrawing) return;
//         isDrawing = false;
//         map01.dragPan.enable();
//         map01.getCanvas().style.cursor = '';
//         tempFreehandCoords.length = 0;
//         finishPreview();
//     });
//
//     // function finishPreview() {
//     //     const guide = map01.getSource('guide-line-source');
//     //     if (guide) guide.setData({ type: 'FeatureCollection', features: [] });
//     //
//     //     const preview = map01.getSource('freehand-preview-source');
//     //     if (preview) preview.setData({ type: 'FeatureCollection', features: [] });
//     //
//     //     isDrawingLine = false
//     //     tempFreehandCoords.length = 0
//     //     tempPolygonCoords.length = 0
//     //     tempLineCoordsGuide.length = 0
//     // }
//
//     map01.on('click', (e) => {
//         if (store.state.isDrawPolygon || store.state.isDrawLine || store.state.isDrawPoint) {
//             haptic({ strength: 'success' })
//         }
//     })
//
//     /**
//      * 投げ縄
//      * @type {boolean}
//      */
//     let isLassoDrawing = false;
//     let lassoCoords = [];
//     const lassoSourceId = 'lasso-source';
//     const lassoLayerId = 'lasso-layer';
//
//     map01.getCanvas().addEventListener('pointerdown', (e) => {
//         if (!store.state.isDrawLasso && !store.state.isDrawLassoForTokizyo && !store.state.isDrawLassoForChibanzu) return;
//         if (!map01.getSource(lassoSourceId)) {
//             map01.addSource(lassoSourceId, {
//                 type: 'geojson',
//                 data: {
//                     type: 'FeatureCollection',
//                     features: []
//                 }
//             });
//             map01.addLayer({
//                 id: lassoLayerId,
//                 type: 'line',
//                 source: lassoSourceId,
//                 paint: {
//                     'line-color': 'rgba(0,0,255,0.6)',
//                     'line-width': 10
//                 }
//             });
//         }
//         map01.dragPan.disable(); // パン無効化
//         isLassoDrawing = true;
//         lassoCoords = [];
//         map01.getCanvas().style.cursor = 'crosshair';
//     });
//
//     // 2. pointermove => ラインを更新
//     map01.getCanvas().addEventListener('pointermove', (e) => {
//         if (!isLassoDrawing) return;
//         const point = map01.unproject([e.clientX, e.clientY]);
//         lassoCoords.push([point.lng, point.lat]);
//         const lineGeojson = {
//             type: 'FeatureCollection',
//             features: [{
//                 type: 'Feature',
//                 geometry: { type: 'LineString', coordinates: lassoCoords }
//             }]
//         };
//         map01.getSource(lassoSourceId).setData(lineGeojson);
//     });
//
//     // 3. pointerup => 投げ縄完了 & 選択処理
//     map01.getCanvas().addEventListener('pointerup', async (e) => {
//         if (!isLassoDrawing) return;
//         isLassoDrawing = false;
//         map01.getCanvas().style.cursor = '';
//         if (lassoCoords.length >= 3) {
//             // ポリゴンを閉じる
//             lassoCoords.push(lassoCoords[0]);
//             const polygon = turf.polygon([lassoCoords]);
//             if (store.state.isDraw) {
//                 // 対象ソースの全フィーチャ取得
//                 const source = map01.getSource(clickCircleSource.iD);
//                 const geojson = source._data; // or source.getData()
//                 let isLassoSelected = false
//                 // GeoJSON‐Rbush（空間インデックス）を使う方法もあるらしい。見調査
//                 // ポリゴンの bbox を先に計算
//                 const [pMinX, pMinY, pMaxX, pMaxY] = turf.bbox(polygon);
//                 geojson.features.forEach(feature => {
//                     feature.properties.lassoSelected = false;
//                     // feature の bbox を計算（事前にキャッシュしておくとさらに速い）
//                     if (feature.geometry) {
//                         const [fMinX, fMinY, fMaxX, fMaxY] = turf.bbox(feature);
//                         // bbox が重ならなければ交差チェック不要
//                         if (fMaxX < pMinX || fMinX > pMaxX || fMaxY < pMinY || fMinY > pMaxY) {
//                             return;
//                         }
//                         // 本命チェック
//                         if (turf.booleanIntersects(feature, polygon)) {
//                             feature.properties.lassoSelected = true;
//                             isLassoSelected = true;
//                         }
//                     }
//                 });
//                 store.state.lassoGeojson = JSON.stringify(turf.featureCollection(geojson.features.filter(feature => feature.properties.lassoSelected === true)))
//                 if (isLassoSelected) {
//                     store.state.isLassoSelected = true
//                 } else {
//                     store.state.isLassoSelected = false
//                 }
//                 console.log(geojson)
//                 // 更新
//                 source.setData(geojson);
//                 store.state.clickCircleGeojsonText = JSON.stringify(geojson)
//                 clickCircleSource.obj.data = geojson
//                 await saveDrowFeatures(geojson.features);
//             } else if (store.state.isDrawLassoForTokizyo) {
//                 const layerId = 'oh-homusyo-2025-polygon';
//                 const intersectsFeatures = await getIntersectsFeatures(map01, layerId, polygon)
//                 console.log(intersectsFeatures)
//                 store.state.highlightedChibans = new Set()
//                 intersectsFeatures.forEach(f => {
//                     const targetId = `${f.properties['筆ID']}_${f.properties['地番']}`;
//                     store.state.highlightedChibans.add(targetId);
//                 })
//                 highlightSpecificFeatures2025(map01,layerId);
//             } else if (store.state.isDrawLassoForChibanzu) {
//
//                 const layers = layersOnScreen(map01)
//                 console.log(layers.filter(layer => layer.id.includes('oh-chiban')))
//                 const layerId = layers.filter(layer => layer.id.includes('oh-chiban'))[0]?.id
//                 if (layerId) {
//                     const idString = layerId.includes('oh-chibanzu') ? 'id' : 'oh3id'
//                     const intersectsFeatures = await getIntersectsFeatures(map01, layerId, polygon)
//                     console.log(intersectsFeatures)
//                     store.state.highlightedChibans = new Set()
//                     intersectsFeatures.forEach(f => {
//                         const targetId = `${f.properties[idString]}`;
//                         store.state.highlightedChibans.add(targetId);
//                     })
//                     highlightSpecificFeaturesCity(map01,layerId);
//                 }
//             }
//         }
//         // 投げ縄ラインをクリア
//         map01.getSource(lassoSourceId).setData({ type: 'FeatureCollection', features: [] });
//         map01.removeLayer(lassoLayerId)
//         map01.removeSource(lassoSourceId)
//         map01.dragPan.enable();
//     });
//     /**
//      * スナップ
//      */
//     // まずユーティリティ（どこか上で1回定義）
//     function normalizeLngLat(ll) {
//         let lng = ll.lng;
//         lng = ((lng + 180) % 360 + 360) % 360 - 180; // [-180,180)
//         return { lng, lat: ll.lat };
//     }
//     function pxDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
//
//     // 画面空間 最近点（辺）
//     function nearestOnScreenLines(map, lines, pointPx) {
//         let best = null;
//         const nearestOnSegPx = (A, B, P) => {
//             const vx = B.x - A.x, vy = B.y - A.y;
//             const wx = P.x - A.x, wy = P.y - A.y;
//             const vv = vx*vx + vy*vy || 1e-9;
//             let t = (vx*wx + vy*wy) / vv;
//             t = Math.max(0, Math.min(1, t));
//             return { x: A.x + t*vx, y: A.y + t*vy };
//         };
//         for (const line of lines) {
//             if (!line || line.length < 2) continue;
//             const px = line.map(([lng,lat]) => map.project({lng,lat}));
//             for (let i=0;i<px.length-1;i++) {
//                 const Q = nearestOnSegPx(px[i], px[i+1], pointPx);
//                 const d = Math.hypot(Q.x - pointPx.x, Q.y - pointPx.y);
//                 if (!best || d < best.d) best = { Q, d };
//             }
//         }
//         if (!best) return null;
//         const lngLat = map.unproject([best.Q.x, best.Q.y]);
//         return { lng: lngLat.lng, lat: lngLat.lat, distPx: best.d };
//     }
//
// // 生データ読み（MapLibreの版差対策）
//     function readGeojsonData(src) {
//         return src?._data || (typeof src?.getData === 'function' ? src.getData() : null) ||
//             (src?._options && src._options.data) || null;
//     }
//
//     function createStrongRawSnapper(
//         map,
//         {
//             sourceIds = [],                         // ← スナップ対象 GeoJSON Source ID を全部
//             radii = { vertexBase: 14, edgeBase: 12 }, // px（あとでズーム連動で拡大）
//             zoomRef = 14,                           // ここより低ズームで半径拡大
//             zoomScale = 1.25,                       // 1段ズームアウトごとに ×1.25
//             sticky = { enable: true, radiusFactor: 1.5 }, // 例: 頂点半径×1.5以内なら保持
//             self = { enable: true, getCoords: () => tempPolygonCoords },
//             previewSourceId = 'snap-point-src',
//             previewLayerId = 'snap-point-lyr',
//             excludeSources = ['snap-point-src','freehand-preview-source','guide-line-source','lasso-source']
//         } = {}
//     ) {
//         // プレビュー点
//         if (!map.getSource(previewSourceId)) {
//             map.addSource(previewSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
//         }
//         if (!map.getLayer(previewLayerId)) {
//             map.addLayer({
//                 id: previewLayerId, type: 'circle', source: previewSourceId,
//                 paint: { 'circle-radius': 6, 'circle-color': '#22aaff', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
//             });
//         }
//         const setPreview = (lngLat) => {
//             const ll = lngLat ? normalizeLngLat(lngLat) : null;
//             const fc = ll
//                 ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] }, properties: {} }] }
//                 : { type: 'FeatureCollection', features: [] };
//             map.getSource(previewSourceId).setData(fc);
//         };
//
//         // 形状抽出
//         const collectVertices = (geom, push) => {
//             const t = geom.type;
//             if (t === 'Point') push(geom.coordinates);
//             else if (t === 'MultiPoint') geom.coordinates.forEach(push);
//             else if (t === 'LineString') geom.coordinates.forEach(push);
//             else if (t === 'MultiLineString') geom.coordinates.flat().forEach(push);
//             else if (t === 'Polygon') geom.coordinates.flat().forEach(push);
//             else if (t === 'MultiPolygon') geom.coordinates.flat(2).forEach(push);
//         };
//         const collectLines = (geom) => {
//             const t = geom.type;
//             if (t === 'LineString') return [geom.coordinates];
//             if (t === 'MultiLineString') return geom.coordinates;
//             if (t === 'Polygon') return geom.coordinates;             // 各リング
//             if (t === 'MultiPolygon') return geom.coordinates.flat(); // 全リング
//             return [];
//         };
//
//         // ズームに応じて半径を拡大
//         const getRadii = () => {
//             const z = map.getZoom?.() ?? zoomRef;
//             const k = Math.max(1, Math.pow(zoomScale, Math.max(0, zoomRef - z))); // z<zoomRef で拡大
//             return { v: radii.vertexBase * k, e: radii.edgeBase * k, k };
//         };
//
//         // スナップ本体
//         const getSnap = (pointPx, { first = null, preferVertex = false, lastSnapHit = null } = {}) => {
//             const { v: tolV, e: tolE } = getRadii();
//
//             // スティッキー：前回ヒットが一定内ならそれを返して安定化
//             if (sticky?.enable && lastSnapHit?.lngLat) {
//                 const dPrev = pxDist(map.project(lastSnapHit.lngLat), pointPx);
//                 const keepR = (lastSnapHit.type?.startsWith('vertex') ? tolV : tolE) * (sticky.radiusFactor ?? 1.5);
//                 if (dPrev <= keepR) {
//                     setPreview(lastSnapHit.lngLat);
//                     return lastSnapHit; // ← ここで“粘着”
//                 }
//             }
//
//             let bestVertex = null;
//             let bestEdge   = null;
//
//             const considerV = (lngLat, type='vertex') => {
//                 const d = pxDist(map.project(lngLat), pointPx);
//                 if (d <= tolV && (!bestVertex || d < bestVertex.distPx)) {
//                     bestVertex = { lngLat, type, distPx: d };
//                 }
//             };
//             const considerE = (lngLat, type='edge') => {
//                 const d = pxDist(map.project(lngLat), pointPx);
//                 if (d <= tolE && (!bestEdge || d < bestEdge.distPx)) {
//                     bestEdge = { lngLat, type, distPx: d };
//                 }
//             };
//
//             // 0) 先頭点で閉じる
//             if (first) considerV(first, 'first');
//
//             // 1) 対象 GeoJSON を総なめ（生データ）
//             for (const sid of sourceIds) {
//                 if (excludeSources.includes(sid)) continue;
//                 const src = map.getSource(sid);
//                 if (!src) continue;
//
//                 const raw = readGeojsonData(src);
//                 if (!raw) continue;
//
//                 const fc = raw.type === 'FeatureCollection'
//                     ? raw
//                     : { type: 'FeatureCollection', features: Array.isArray(raw.features) ? raw.features : [] };
//
//                 for (const f of fc.features || []) {
//                     const g = f?.geometry; if (!g) continue;
//                     // 頂点
//                     collectVertices(g, (c) => considerV({ lng: c[0], lat: c[1] }, 'vertex'));
//                     // 辺
//                     if (!preferVertex) { // Shift 等で「頂点優先」したい場合に使える
//                         const lines = collectLines(g);
//                         const ll = nearestOnScreenLines(map, lines, pointPx);
//                         if (ll) considerE({ lng: ll.lng, lat: ll.lat }, 'edge');
//                     }
//                 }
//             }
//
//             // 2) 自分自身（描画中リング）
//             if (self?.enable) {
//                 const coords = (self.getCoords?.() || []).slice();
//                 if (coords.length) {
//                     // 頂点
//                     for (const c of coords) considerV({ lng: c[0], lat: c[1] }, 'self-vertex');
//                     // 辺
//                     if (!preferVertex && coords.length >= 2) {
//                         const ringClosed = (coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1])
//                             ? coords : coords.concat([coords[0]]);
//                         const ll = nearestOnScreenLines(map, [ringClosed], pointPx);
//                         if (ll) considerE({ lng: ll.lng, lat: ll.lat }, 'self-edge');
//                     }
//                 }
//             }
//
//             // 3) 頂点 > 辺 の優先。preferVertex=true なら頂点のみ。
//             const result = bestVertex || (preferVertex ? null : bestEdge) || null;
//             setPreview(result?.lngLat || null);
//             return result;
//         };
//
//         return { getSnap, setPreview, getRadii };
//     }
//
//     // ② 追加：スナップ対象レイヤと許容ピクセル半径（必要に応じて調整）
//     setTimeout(() => {
//         // 強力スナッパ生成（使う Source ID を全部入れてください）
//         const snap = createStrongRawSnapper(map01, {
//             sourceIds: [clickCircleSource.iD, 'homusyo-2025-source'],
//             radii: { vertexBase: 16, edgeBase: 12 }, // 頂点を盛る
//             zoomRef: 14, zoomScale: 1.25,
//             sticky: { enable: true, radiusFactor: 1.8 },
//             self: { enable: true, getCoords: () => tempPolygonCoords },
//             excludeSources: ['snap-point-src','freehand-preview-source','guide-line-source','lasso-source']
//         });
//
//         // ③ 既存：ポリゴン用クリック処理に“スナップ”を注入
//         //      ※ onPolygonClick はそのまま
//         function onPolygonClick(e) {
//             popup(e, map01, 'map01', store.state.map2Flg);
//         }
//
//         // ★ 追加：mousemoveでプレビュー表示（描画中のみ）
//         map01.on('mousemove', (e) => {
//             if (!store.state.isDrawPolygon) {
//                 snap.setPreview(null);
//                 lastSnapHit = null;           // ← リセット
//                 return;
//             }
//             const firstLL = tempPolygonCoords.length
//                 ? {lng: tempPolygonCoords[0][0], lat: tempPolygonCoords[0][1]}
//                 : null;
//             // snap.getSnap(e.point, {first: firstLL}); // 内部でプレビュー更新
//             lastSnapHit = snap.getSnap(e.point, { first: firstLL }); // ← ここで保存
//
//         });
//
//         // ★ 差し替え：click時にスナップ座標を採用
//         // ★ click: まず lastSnapHit を優先的に使う（なければ再計算）
//         map01.on('click', (e) => {
//             if (!store.state.isDrawPolygon) return;
//
//             const firstLL = tempPolygonCoords.length
//                 ? { lng: tempPolygonCoords[0][0], lat: tempPolygonCoords[0][1] }
//                 : null;
//
//             // alert(snap.getSnap(e.point, { first: firstLL }))
//
//             const snapFeature = map01.getSource('snap-point-src')._data.features[0]
//
//             const hit = lastSnapHit || snap.getSnap(e.point, { first: firstLL });
//             const ll = hit?.lngLat || e.lngLat;
//             const coordinates = [ll.lng, ll.lat];
//             // const coordinates = snapFeature?.geometry?.coordinates || [e.lngLat.lng, e.lngLat.lat]
//
//             tempPolygonCoords.push(coordinates);
//             const newTempPolygonCoords = dedupeCoords(tempPolygonCoords);
//             tempPolygonCoords.length = 0;
//             tempPolygonCoords.push(...newTempPolygonCoords);
//         });
//
//         // ★ おまけ: イベントでヒットをクリア（古い値が残らないように）
//         map01.on('mouseleave', () => { lastSnapHit = null; });
//         map01.on('dblclick',   () => { lastSnapHit = null; snap.setPreview(null); });
//
//         // ④ 既存：ダブルクリック確定に“プレビュー消去”だけ追加
//         map01.on('dblclick', (e) => {
//             if (!store.state.isDrawPolygon) return;
//             if (clickTimer !== null) {
//                 clearTimeout(clickTimer);
//                 clickTimer = null;
//             }
//             e.preventDefault();
//             if (tempPolygonCoords.length >= 3) {
//                 // ポリゴンは必ず閉じる
//                 if (
//                     tempPolygonCoords.length < 4 ||
//                     tempPolygonCoords[0][0] !== tempPolygonCoords[tempPolygonCoords.length - 1][0] ||
//                     tempPolygonCoords[0][1] !== tempPolygonCoords[tempPolygonCoords.length - 1][1]
//                 ) {
//                     tempPolygonCoords.push([...tempPolygonCoords[0]]);
//                 }
//
//                 // GeoJSONのPolygonは2重配列
//                 const coords = [tempPolygonCoords.slice()];
//
//                 const id = String(Math.floor(10000 + Math.random() * 90000));
//                 store.state.id = id;
//                 const properties = {
//                     id,
//                     pairId: id,
//                     label: '',
//                     color: colorNameToRgba(store.state.currentPolygonColor || 'yellow', 0.6),
//                     'line-width': 1,
//                 };
//                 geojsonCreate(map01, 'Polygon', coords, properties);
//
//                 // 擬似クリックイベント（最初の点）
//                 const dummyEvent = {
//                     lngLat: {lng: tempPolygonCoords[0][0], lat: tempPolygonCoords[0][1]}
//                 };
//                 store.state.coordinates = [tempPolygonCoords[0][0], tempPolygonCoords[0][1]];
//                 setTimeout(() => {
//                     onPolygonClick(dummyEvent);
//                 }, 500);
//
//                 finishPreview();
//                 tempPolygonCoords.length = 0;
//                 snap.setPreview(null); // ★ 確定後はプレビュー消す
//             }
//         });
//     },10)
//
//     // ガイドライン作成-----------------------------------------------------------------------------------------------------
//     map01.on('click', (e) => {
//         if (!store.state.isDrawLine && !store.state.isDrawPolygon) return;
//         const lng = e.lngLat.lng;
//         const lat = e.lngLat.lat;
//         tempLineCoordsGuide.push([lng, lat]);
//         isDrawingLine = true;
//         console.log(tempLineCoordsGuide.length)
//         if (tempLineCoordsGuide.length === 1) {
//             const fc = turf.featureCollection([turf.point([lng, lat])])
//             console.log(fc)
//             map01.getSource('guide-line-source').setData(fc)
//         }
//     });
//
//     map01.on('mousemove', (e) => {
//         // 他モード（フリーハンド/ラッソ等）中は動かさない
//         const polyOn = !!store.state.isDrawPolygon;
//         const lineOn = !!store.state.isDrawLine;
//         if (!polyOn && !lineOn) {
//             if (lastSnapHit) { lastSnapHit = null; }
//             return;
//         }
//         const cursor = lastSnapHit?.lngLat ? normalizeLngLat(lastSnapHit.lngLat) : e.lngLat;
//         if (polyOn) {
//             updateGuideLine(map01, tempPolygonCoords, cursor);
//         } else if (lineOn) {
//             updateGuideLine(map01, tempLineCoordsGuide, cursor);
//         }
//     });
// }

/**
 * ---------------------------------------------------------------------------------------------------------------------
 */
let targetDate = null
export function drawUndo() {
    if (!store.state.isEditable && !store.state.isMine) {
        alert('編集不可です！！')
        return
    }
    const map01 = store.state.map01
    store.state.isDrawUndoRedo = true
    let geojson = null
    if (!targetDate) {
        geojson = JSON.parse(store.state.prevGeojsons.at(-1).geojsonString)
        targetDate = store.state.prevGeojsons.at(-1).date
    } else {
        const rows = store.state.prevGeojsons
        const prevRow = rows.findLast?.(r => r.date < targetDate)    // ES2023+
            ?? [...rows].reverse().find(r => r.date < targetDate); // 互換
        if (prevRow) {
            geojson = JSON.parse(prevRow.geojsonString)
            targetDate = prevRow.date
        } else {
            setTimeout(() => {
                store.state.isDrawUndoRedo = false
            },1000)
            return
        }
    }
    map01.getSource(clickCircleSource.iD).setData(geojson)
    store.state.clickCircleGeojsonText = JSON.stringify(geojson)
    generateStartEndPointsFromGeoJSON(geojson)
    generateSegmentLabelGeoJSON(geojson)
    if (!store.state.isUsingServerGeojson) {
        featureCollectionAdd()
    }
    markerAddAndRemove()
    store.state.updatePermalinkFire = !store.state.updatePermalinkFire
    setTimeout(() => {
        store.state.isDrawUndoRedo = false
    },1000)
}
export function drawRedo() {
    if (!store.state.isEditable && !store.state.isMine) {
        alert('編集不可です！！')
        return
    }
    const map01 = store.state.map01
    store.state.isDrawUndoRedo = true
    let geojson = null
    if (!targetDate) {
        return;
    } else {
        const rows = store.state.prevGeojsons
        const nextRow = rows.find(r => r.date > targetDate);
        if (nextRow) {
            geojson = JSON.parse(nextRow.geojsonString)
            targetDate = nextRow.date
        } else {
            setTimeout(() => {
                store.state.isDrawUndoRedo = false
            },1000)
            return
        }
    }
    map01.getSource(clickCircleSource.iD).setData(geojson)
    store.state.clickCircleGeojsonText = JSON.stringify(geojson)
    generateStartEndPointsFromGeoJSON(geojson)
    generateSegmentLabelGeoJSON(geojson)
    if (!store.state.isUsingServerGeojson) {
        featureCollectionAdd()
    }
    markerAddAndRemove()
    store.state.updatePermalinkFire = !store.state.updatePermalinkFire
    setTimeout(() => {
        store.state.isDrawUndoRedo = false
    },1000)
}

function updateGuideLine(map, baseCoords, cursorLL) {
    const gsrc = map.getSource('guide-line-source');
    if (!gsrc || !baseCoords?.length) return;
    const guideCoords = baseCoords.concat([[cursorLL.lng, cursorLL.lat]]);
    gsrc.setData({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: guideCoords },
            properties: {}
        }]
    });
}

function onLineClick(e) {
    const map01 = store.state.map01
    popup(e, map01, 'map01', store.state.map2Flg);
}

function finishPreview() {
    const map01 = store.state.map01
    const guide = map01.getSource('guide-line-source')
    const preview = map01.getSource('freehand-preview-source')
    const vertex = map01.getSource('vertex-source')
    const midpoint = map01.getSource('midpoint-source')
    const dragHandles = map01.getSource('drag-handles-source')

    if (guide) guide.setData({ type: 'FeatureCollection', features: [] })
    if (preview) preview.setData({ type: 'FeatureCollection', features: [] })
    if (vertex) vertex.setData({ type: 'FeatureCollection', features: [] })
    if (midpoint) midpoint.setData({ type: 'FeatureCollection', features: [] })
    if (dragHandles) dragHandles.setData({ type: 'FeatureCollection', features: [] })

    isDrawingLine = false
    tempFreehandCoords.length = 0
    tempPolygonCoords.length = 0
    tempLineCoordsGuide.length = 0
}
// 最後の頂点を一つ削除してプレビューを更新
export function removeLastVertex() {
    if (store.state.isDrawLine) {
        if (!tempLineCoords.length) return;
        const coords = tempLineCoords;
        if (!coords.length) return;
        // // 最後の頂点がカーソル位置と重なっている場合は2回削除
        // if (this.lastMouseLngLat && coords.length >= 1) {
        //     const [lastLng, lastLat] = coords[coords.length - 1];
        //     if (lastLng === this.lastMouseLngLat.lng && lastLat === this.lastMouseLngLat.lat) {
        //         // カーソル重なり頂点を2回削除
        //         coords.pop();
        //         if (coords.length) coords.pop();
        //         this.tempLineCoordsGuide = this.tempLineCoords
        //         this.updateDynamicLinePreview();
        //         return;
        //     }
        // }
        // それ以外は1回だけ削除
        coords.pop();
        tempLineCoordsGuide = tempLineCoords
        updateDynamicLinePreview();

    } else if (store.state.isDrawPolygon) {
        const coords = tempPolygonCoords;
        if (!coords.length) return;
        // // 最後の頂点がカーソル位置と重なっている場合は2回削除
        // if (this.lastMouseLngLat && coords.length >= 1) {
        //     const [lastLng, lastLat] = coords[coords.length - 1];
        //     if (lastLng === this.lastMouseLngLat.lng && lastLat === this.lastMouseLngLat.lat) {
        //         // カーソル重なり頂点を2回削除
        //         coords.pop();
        //         // guideCoords.pop()
        //         if (coords.length) coords.pop();
        //         this.tempLineCoordsGuide = this.tempPolygonCoords
        //         this.updateDynamicPolygonPreview();
        //         return;
        //     }
        // }
        // それ以外は1回だけ削除
        console.log(tempPolygonCoords)
        coords.pop();
        tempLineCoordsGuide = tempPolygonCoords
        updateDynamicPolygonPreview();
    }
}
// 動的ラインプレビュー
function updateDynamicLinePreview() {
    const map01 = store.state.map01
    const coords = tempLineCoords
    map01.getSource('guide-line-source').setData({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {}
        }]
    });
}
// 動的ポリゴンプレビュー
function updateDynamicPolygonPreview() {
    const map01 = store.state.map01;
    const coords = tempPolygonCoords
    map01.getSource('guide-line-source').setData({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {}
        }]
    });
}

export function drawConfirm() {
    let minPoints
    if (store.state.isDrawPolygon) {
        minPoints = 3
    } else if (store.state.isDrawLine) {
        minPoints = 2
    }
    tempLineCoordsGuide = dedupeCoords(tempLineCoordsGuide)
    if (tempLineCoordsGuide.length < minPoints) {
        store.state.loadingMessage3 = `ポイントが足りません。最低${minPoints}点必要です。`
        store.state.loading3 = true
        setTimeout(() => {
            store.state.loading3 = false
        }, 2000)
        return
    }
    finishDrawing()
    finishPreview()
    store.state.showDrawConfrim = false
    store.state.editEnabled = false
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

function finishDrawing() {

    // if (this.s_editEnabled) {
    //     this.toggleEditEnabled()
    // }
    const map01 = store.state.map01
    store.state.clickCircleGeojsonText = JSON.stringify(map01.getSource('click-circle-source')._data)

    const id = String(Math.floor(10000 + Math.random() * 90000));
    store.state.id = id;
    let coords,properties
    if (store.state.isDrawPolygon) {
        if (!tempPolygonCoords || tempPolygonCoords.length < 2) return; // 最低2点以上だけ確定
        coords = [tempPolygonCoords.concat([tempPolygonCoords[0]])]
        properties = {
            id: id,
            pairId: id,
            label: '',
            color: colorNameToRgba(store.state.currentPolygonColor || 'yellow', 0.6),
            'line-width': 1,
        };
        geojsonCreate(map01, 'Polygon', coords, properties);
        const dummyEvent = {
            lngLat: {
                lng: tempPolygonCoords[0][0],
                lat: tempPolygonCoords[0][1]
            }
        };
        store.state.coordinates = [tempPolygonCoords[0][0], tempPolygonCoords[0][1]];
        setTimeout(() => {
            onLineClick(dummyEvent, map01, store.state.map2Flg);
        }, 500);
        tempPolygonCoords.length = 0;
    } else if (store.state.isDrawLine) {
        if (!tempLineCoords || tempLineCoords.length < 2) return; // 最低2点以上だけ確定
        properties = {
            id: id,
            pairId: id,
            label: '',
            offsetValue: [0.6, 0],
            'line-width': 5,
            textAnchor: 'left',
            textJustify: 'left'
        };
        geojsonCreate(map01, 'LineString', tempLineCoords.slice(), properties);
        const dummyEvent = {
            lngLat: {
                lng: tempLineCoords[0][0],
                lat: tempLineCoords[0][1]
            }
        };
        store.state.coordinates = [tempLineCoords[0][0], tempLineCoords[0][1]];
        setTimeout(() => {
            onLineClick(dummyEvent, map01, store.state.map2Flg);
        }, 500);
        tempLineCoords.length = 0
    }
    finishPreview()
}

export function drawCancel() {
    const map01 = store.state.map01
    finishPreview()
    store.state.showDrawConfrim = false
    if (store.state.editEnabled) {
        map01.getSource('click-circle-source').setData(store.state.prevGeojson)
        finishDrawing()
        store.state.clickCircleGeojsonText = JSON.stringify(store.state.prevGeojson)
        store.state.prevGeojson = null
        store.state.editEnabled = false
    }
}

