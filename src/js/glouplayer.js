import store from '@/store';
import { db } from '@/firebase';
import { watch } from 'vue';
import { groupGeojson, ohPointLayer } from '@/js/layers';
import { popups } from '@/js/popup';
import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/app';
import 'firebase/firestore';

let unsubscribeSnapshot = null;
let lastClickTimestamp = 0;
let previousIds = new Set();
let mapClickHandler = null;
let isInitializing = false;
let justChangedGroup = false;
let isSaving = false;
let isSyncFailed = !navigator.onLine;
let pingIntervalId = null;

// `oh-point-layer`の存在をチェックする関数
function hasOhPointLayer(map) {
    const selectedLayers = store.state.selectedLayers.map01;
    return selectedLayers.some(layer => layer.id === 'oh-point-layer') && map.getLayer('oh-point-layer');
}

async function pingServer(source = 'interval', retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await firebase.firestore().collection('ping').doc('status').get();
            console.log(`Ping success (${source}, attempt ${i + 1}/${retries})`);
            if (isSyncFailed) {
                isSyncFailed = false;
                // store.dispatch('triggerSnackbarForGroup', { message: 'サーバーに接続できました。操作を再開できます。' });
            }
            return true;
        } catch (error) {
            console.log(`Ping failed (${source}, attempt ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    if (!isSyncFailed) {
        isSyncFailed = true;
        store.dispatch('triggerSnackbarForGroup', { message: 'サーバーに接続できません。操作が制限されています。' });
    }
    return false;
}

window.addEventListener('online', async () => {
    console.log('Network online event triggered');
    await pingServer('online event', 3, 1000);
});

window.addEventListener('offline', () => {
    console.log('Network offline event triggered');
    isSyncFailed = true;
    store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークが切断されました。操作が制限されています。' });
});

pingServer('initial', 3, 1000).then(result => console.log('Initial ping result:', result));
pingIntervalId = setInterval(() => pingServer('interval', 3, 1000), 10000);

function createPointClickHandler(map01) {
    return (e) => {
        if (isSyncFailed) {
            store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。詳細を表示できません。' });
            return;
        }

        const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
        if (features.length > 0) {
            const clickedFeature = features[0];
            const featureData = {
                type: clickedFeature.type,
                geometry: clickedFeature.geometry,
                properties: clickedFeature.properties
            };
            console.log('設定する地物データ:', featureData);
            store.commit('setSelectedPointFeature', featureData);
            store.commit('setPointInfoDrawer', true);
        }
    };
}

async function fetchAndSetGeojson(groupId, map, layerId) {
    console.log('fetchAndSetGeojson開始: groupId=', groupId, 'layerId=', layerId);
    if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) {
        console.log('グループIDまたはレイヤーIDが一致しない、スキップ');
        return;
    }

    try {
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        if (!docRef) {
            throw new Error('Firestoreドキュメント参照が無効');
        }

        const doc = await docRef.get({ source: 'server' });
        console.log('Firestoreドキュメント取得: exists=', doc.exists);

        if (!doc.exists) {
            throw new Error(`レイヤードキュメントが存在しない: layerId=${layerId}`);
        }

        const data = doc.data();

        if (data && data.features) {
            // titleプロパティのデフォルト値を設定（修正点）
            const newFeatures = data.features.map(feature => ({
                ...feature,
                properties: {
                    ...feature.properties,
                    title: feature.properties.title || '未設定' // デフォルト値
                }
            }));
            const layerName = data.name || `Layer_${layerId}`;
            console.log('地物データ: features=', newFeatures.length, 'layerName=', layerName);

            // Vuexストア更新
            const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
            updatedLayers.push({ id: layerId, name: layerName, features: newFeatures });
            store.commit('setCurrentGroupLayers', updatedLayers);

            // マップソース更新
            const source = map.getSource('oh-point-source');
            if (!source) {
                throw new Error('oh-point-sourceが見つからない');
            }

            source.setData({ type: 'FeatureCollection', features: newFeatures });
            map.triggerRepaint();
            console.log('マップソース更新完了: features=', newFeatures.length);

            // レイヤー情報をストアに反映
            const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
            if (!existing) {
                store.commit('addSelectedLayer', {
                    map: 'map01',
                    layer: {
                        id: 'oh-point-layer',
                        label: layerName,
                        sources: [{
                            id: 'oh-point-source',
                            obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
                        }],
                        layers: [{
                            id: 'oh-point-layer',
                            type: 'circle',
                            source: 'oh-point-source',
                            paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
                        }],
                        opacity: 1,
                        visibility: true,
                        attribution: '',
                        layerid: layerId
                    }
                });
                store.dispatch('triggerSnackbarForGroup', { message: `レイヤー "${layerName}" を追加しました` });
            }
        } else {
            console.log('データが空またはfeaturesが存在しない');
            store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
            const source = map.getSource('oh-point-source');
            if (source) {
                source.setData({ type: 'FeatureCollection', features: [] });
                map.triggerRepaint();
                console.log('マップソースを空データで更新');
            }
        }
    } catch (e) {
        console.error('fetchAndSetGeojsonエラー: ', e);
    }
}

async function saveLayerToFirestore(groupId, layerId, features) {
    if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
    isSaving = true;
    try {
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get({ source: 'server' });
        if (!doc.exists) return;

        const existingData = doc.data();
        const layerName = existingData.name || `Layer_${layerId}`;

        await docRef.set({
            features: features,
            groupId: groupId,
            name: layerName,
            lastModifiedBy: store.state.userId,
            lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // ローカル状態を更新
        const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
        if (currentLayer) {
            currentLayer.features = features;
            store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
        } else {
            const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
            updatedLayers.push({ id: layerId, name: layerName, features });
            store.commit('setCurrentGroupLayers', updatedLayers);
        }

        const map = store.state.map01;
        if (map && map.getSource('oh-point-source')) {
            map.getSource('oh-point-source').setData({ type: 'FeatureCollection', features });
            map.triggerRepaint();
        }
    } catch (e) {
        console.error('Firestore 更新エラー:', e);
        store.dispatch('triggerSnackbarForGroup', { message: 'データの保存に失敗しました' });
    } finally {
        isSaving = false;
    }
}

function setupFirestoreListener(groupId, layerId) {
    console.log('setupFirestoreListener開始: groupId=', groupId, 'layerId=', layerId);
    if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) {
        console.log('グループIDまたはレイヤーIDが一致しない、スキップ');
        return;
    }

    try {
        if (unsubscribeSnapshot) {
            console.log('既存のリスナーを解除');
            unsubscribeSnapshot();
        }

        unsubscribeSnapshot = firebase.firestore()
            .collection('groups')
            .doc(groupId)
            .collection('layers')
            .doc(layerId)
            .onSnapshot({ includeMetadataChanges: true }, (doc) => {
                if (isSaving) {
                    console.log('保存中なのでスナップショット処理をスキップ');
                    return;
                }

                try {
                    console.log('スナップショット受信: exists=', doc.exists);
                    if (!doc.exists) {
                        throw new Error('スナップショットのドキュメントが存在しない');
                    }

                    const data = doc.data();
                    if (data && data.features && !doc.metadata.fromCache) {
                        const features = data.features.map(feature => ({
                            ...feature,
                            properties: {
                                ...feature.properties,
                                title: feature.properties.title || '未設定' // デフォルト値（修正点）
                            }
                        }));
                        const layerName = data.name || `Layer_${layerId}`;
                        console.log('スナップショットデータ: features=', features.length, 'layerName=', layerName);

                        const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
                        if (currentLayer) {
                            currentLayer.features = features;
                        } else {
                            const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
                            updatedLayers.push({ id: layerId, name: layerName, features });
                            store.commit('setCurrentGroupLayers', updatedLayers);
                        }
                        store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);

                        const map01 = store.state.map01;
                        if (map01 && map01.getSource('oh-point-source')) {
                            map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features });
                            map01.triggerRepaint();
                            console.log('マップソース更新: features=', features.length);
                        } else {
                            console.warn('マップまたはソースが見つからない');
                        }
                    } else {
                        console.log('スナップショットにデータがない、またはキャッシュデータ');
                        const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
                        if (currentLayer) {
                            currentLayer.features = [];
                            store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
                        }
                        const map01 = store.state.map01;
                        if (map01 && map01.getSource('oh-point-source')) {
                            map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: [] });
                            map01.triggerRepaint();
                            console.log('マップソースを空データで更新');
                        }
                    }
                } catch (error) {
                    console.error('スナップショット処理エラー: ', error);
                    store.dispatch('triggerSnackbarForGroup', { message: `データ同期エラー: ${error.message}` });
                }
            }, (error) => {
                console.error('Firestoreリスナーエラー: ', error);
                isSyncFailed = true;
                store.dispatch('triggerSnackbarForGroup', { message: `リアルタイム同期に失敗: ${error.message}` });
            });

        console.log('リスナー設定完了');
    } catch (error) {
        console.error('setupFirestoreListenerエラー: ', error);
        store.dispatch('triggerSnackbarForGroup', { message: `リスナー設定に失敗: ${error.message}` });
    }
}

function createMapClickHandler(map01) {
    return async (e) => {
        if (!hasOhPointLayer(map01)) {
            console.log('oh-point-layerが存在しません。初期化をスキップします。');
            return;
        }
        if (isSyncFailed) {
            store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。ポイントを追加できません。' });
            return;
        }
        const now = Date.now();
        if (now - lastClickTimestamp < 300) return;
        lastClickTimestamp = now;

        const groupId = store.state.currentGroupId;
        const layerId = store.state.selectedLayerId;
        if (!groupId || !layerId) {
            store.dispatch('triggerSnackbarForGroup', { message: 'グループまたはレイヤーが選択されていません。' });
            return;
        }

        const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
        if (features.length > 0 || !e.lngLat) return;

        const { lng, lat } = e.lngLat;
        const newFeature = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: {
                id: uuidv4(),
                createdAt: Date.now(),
                createdBy: store.state.myNickname || '不明',
                title: '新規ポイント'
            }
        };

        const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
        // alert(JSON.stringify(store.state.currentGroupLayers + '/' + layerId))
        if (!currentLayer) {
            store.dispatch('triggerSnackbarForGroup', { message: '選択中のレイヤーが見つかりません。' });
            return;
        }

        const currentFeatures = currentLayer.features || [];
        currentFeatures.push(newFeature);
        currentLayer.features = currentFeatures;

        store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);

        const source = map01.getSource('oh-point-source');
        if (source) {
            source.setData({
                type: 'FeatureCollection',
                features: currentLayer.features
            });
            map01.triggerRepaint();
        } else {
            console.warn('ソースが見つかりません: oh-point-source');
            store.dispatch('triggerSnackbarForGroup', { message: 'マップソースが見つかりません。' });
            return;
        }

        if (!isInitializing) {
            await saveLayerToFirestore(groupId, layerId, currentLayer.features);
        }

        store.commit('setSelectedPointFeature', newFeature);

        await new Promise(resolve => setTimeout(resolve, 100));
        // store.commit('setPointInfoDrawer', true);

        store.dispatch('triggerSnackbarForGroup', { message: 'ポイントを追加しました' });
    };
}

export default function useGloupLayer() {
    const initializeGroupAndLayer = async () => {
        setTimeout(async () => {
            try {
                const savedGroupId = localStorage.getItem('lastGroupId');
                const savedLayerId = localStorage.getItem('lastLayerId');
                const map01 = store.state.map01;

                if (!map01 || !map01.isStyleLoaded()) return;

                const selectedLayers = store.state.selectedLayers.map01;
                const hasOhPointLayer = selectedLayers.some(layer => layer.id === 'oh-point-layer');

                if (!hasOhPointLayer) return;

                if (savedGroupId && savedLayerId) {
                    store.commit('setCurrentGroupId', savedGroupId);
                    store.commit('setSelectedLayerId', savedLayerId);
                    await fetchAndSetGeojson(savedGroupId, map01, savedLayerId);
                    console.log('グループとレイヤーを復帰しました', { selectedLayers: store.state.selectedLayers.map01 });
                }
            } catch (e) {
                console.error('復帰エラー:', e);
            }
        }, 4000);
    };

    initializeGroupAndLayer();

    watch(
        () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
        async ([map01, groupId, layerId]) => {
            if (!map01 || !groupId || !layerId) {
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                    console.log('Firestoreリスナーを解除しました');
                }
                if (pingIntervalId) {
                    clearInterval(pingIntervalId);
                    pingIntervalId = null;
                    console.log('Pingインターバルを解除しました');
                }
                if (map01?.getLayer('oh-point-layer')) {
                    map01.removeLayer('oh-point-layer');
                    console.log('oh-point-layer を削除しました');
                }
                if (map01?.getLayer('oh-point-label-layer')) {
                    map01.removeLayer('oh-point-label-layer');
                    console.log('oh-point-label-layer を削除しました');
                }
                if (map01?.getSource('oh-point-source')) {
                    map01.removeSource('oh-point-source');
                    console.log('oh-point-source を削除しました');
                }
                groupGeojson.value.features = [];
                store.commit('setCurrentGroupLayers', []);
                previousIds = new Set();
                return;
            }

            const initializeMap = async () => {
                try {
                    if (!map01.getSource('oh-point-source')) {
                        map01.addSource('oh-point-source', {
                            type: 'geojson',
                            data: { type: 'FeatureCollection', features: [] }
                        });
                        console.log('oh-point-source を追加しました');
                    }

                    if (!map01.getLayer('oh-point-layer')) {
                        map01.addLayer({ ...ohPointLayer });
                        console.log('oh-point-layer を追加しました');
                    }

                    // GeoJSONデータを取得（修正点：ラベルレイヤー追加の前）
                    await fetchAndSetGeojson(groupId, map01, layerId);

                    // 既存のラベルレイヤーを削除
                    if (map01.getLayer('oh-point-label-layer')) {
                        map01.removeLayer('oh-point-label-layer');
                        console.log('既存のoh-point-label-layerを削除しました');
                    }

                    // ラベルレイヤーを追加（修正点：fetchAndSetGeojsonの後）
                    console.log('ラベルレイヤー追加前のソースデータ:', map01.getSource('oh-point-source')?.serialize());
                    map01.addLayer({
                        id: 'oh-point-label-layer',
                        type: 'symbol',
                        source: 'oh-point-source',
                        layout: {
                            'text-field': ['get', 'title'],
                            'text-size': 14,
                            'text-offset': [0, 0.5],
                            'text-anchor': 'top'
                        },
                        paint: {
                            'text-color': '#000',
                            'text-halo-color': '#fff',
                            'text-halo-width': 1
                        }
                    });
                    map01.triggerRepaint(); // 再描画を確実にする（修正点）
                    console.log('oh-point-label-layer を追加しました');

                    setupFirestoreListener(groupId, layerId);

                    if (mapClickHandler) map01.off('click', mapClickHandler);
                    mapClickHandler = createMapClickHandler(map01);
                    map01.on('click', mapClickHandler);
                    map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
                    map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));

                //
                //     let draggedFeatureId = null;
                //     let isDragging = false;
                //
                //     map01.on('mousedown', 'oh-point-layer', (e) => {
                //         if (!e.features || !e.features.length) return;
                //         if (isSyncFailed) {
                //             store.dispatch('triggerSnackbarForGroup', {
                //                 message: 'ネットワークに接続されていません。ポイントを移動できません。'
                //             });
                //             return;
                //         }
                //
                //         isDragging = false;
                //         const feature = e.features[0];
                //         const featureId = feature.properties.id;
                //         const mouseDownTime = Date.now();
                //
                //         setTimeout(() => {
                //             if (Date.now() - mouseDownTime >= 100) {
                //                 isDragging = true;
                //                 map01.getCanvas().style.cursor = 'grabbing';
                //                 draggedFeatureId = featureId;
                //                 map01.dragPan.disable();
                //             }
                //         }, 100);
                //     });
                //
                //     map01.on('mousemove', (e) => {
                //         if (!isDragging) return;
                //         if (!draggedFeatureId) return;
                //         if (isSyncFailed) {
                //             store.dispatch('triggerSnackbarForGroup', {
                //                 message: 'ネットワークに接続されていません。ポイントを移動できません。'
                //             });
                //             draggedFeatureId = null;
                //             map01.getCanvas().style.cursor = '';
                //             map01.dragPan.enable();
                //             return;
                //         }
                //
                //         const currentLayer = store.state.currentGroupLayers.find(l => l.id === store.state.selectedLayerId);
                //         if (!currentLayer) return;
                //
                //         currentLayer.features = currentLayer.features.map(f => {
                //             if (f.properties.id === draggedFeatureId) {
                //                 return {
                //                     ...f,
                //                     geometry: {
                //                         ...f.geometry,
                //                         coordinates: [e.lngLat.lng, e.lngLat.lat]
                //                     }
                //                 };
                //             }
                //             return f;
                //         });
                //
                //         store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
                //
                //         const source = map01.getSource('oh-point-source');
                //         if (source) {
                //             source.setData({ type: 'FeatureCollection', features: currentLayer.features });
                //         }
                //     });
                //
                //     map01.on('mouseup', async () => {
                //         if (draggedFeatureId) {
                //             map01.getCanvas().style.cursor = '';
                //             map01.dragPan.enable();
                //             draggedFeatureId = null;
                //
                //             const groupId = store.state.currentGroupId;
                //             const layerId = store.state.selectedLayerId;
                //             const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
                //             if (currentLayer) {
                //                 await saveLayerToFirestore(groupId, layerId, currentLayer.features);
                //             }
                //         }
                //         isDragging = false;
                //         draggedFeatureId = null;
                //     });
                //
                } catch (e) {
                    console.error('マップ初期化エラー:', e);
                }
            };

            if (map01.isStyleLoaded()) {
                await initializeMap();
            } else {
                map01.once('load', async () => await initializeMap());
            }

            localStorage.setItem('lastGroupId', groupId);
            localStorage.setItem('lastLayerId', layerId);

        },
        { immediate: true }
    );

    watch(
        () => store.state.selectedLayers.map01,
        async (selectedLayers) => {
            console.log('selectedLayers watch triggered:', selectedLayers); // デバッグログ
            const map = store.state.map01;
            const groupId = store.state.currentGroupId;
            const layerId = store.state.selectedLayerId;
            if (!map || !groupId || !layerId) {
                console.log('map, groupId, or layerId is missing, skipping...');
                return;
            }

            const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
            if (hasGroupLayer && !isInitializing) {
                // GeoJSONデータを取得してソースを更新
                await fetchAndSetGeojson(groupId, map, layerId);

                // 既存のラベルレイヤーを削除
                if (map.getLayer('oh-point-label-layer')) {
                    map.removeLayer('oh-point-label-layer');
                    console.log('既存のoh-point-label-layerを削除しました');
                }

                // ラベルレイヤーを追加
                console.log('ラベルレイヤー追加前のソースデータ:', map.getSource('oh-point-source')?.serialize());
                map.addLayer({
                    id: 'oh-point-label-layer',
                    type: 'symbol',
                    source: 'oh-point-source',
                    layout: {
                        'text-field': ['get', 'title'],
                        'text-size': 14,
                        'text-offset': [0, 0.5],
                        'text-anchor': 'top'
                    },
                    paint: {
                        'text-color': '#000',
                        'text-halo-color': '#fff',
                        'text-halo-width': 1
                    }
                });
                map.triggerRepaint(); // 再描画を確実にする
                console.log('oh-point-label-layer を追加しました');
            }
        },
        { deep: true }
    );

    window.addEventListener('unload', () => {
        if (pingIntervalId) clearInterval(pingIntervalId);
    });
}


// import store from '@/store';
// import { db } from '@/firebase';
// import { watch } from 'vue';
// import { groupGeojson, ohPointLayer } from '@/js/layers';
// import { popups } from '@/js/popup';
// import { v4 as uuidv4 } from 'uuid';
// import firebase from 'firebase/app';
// import 'firebase/firestore';
//
// let unsubscribeSnapshot = null;
// let lastClickTimestamp = 0;
// let previousIds = new Set();
// let mapClickHandler = null;
// let isInitializing = false;
// let justChangedGroup = false;
// let isSaving = false;
// let isSyncFailed = !navigator.onLine;
// let pingIntervalId = null;
//
// // `oh-point-layer`の存在をチェックする関数
// function hasOhPointLayer(map) {
//     const selectedLayers = store.state.selectedLayers.map01;
//     return selectedLayers.some(layer => layer.id === 'oh-point-layer') && map.getLayer('oh-point-layer');
// }
//
// async function pingServer(source = 'interval', retries = 3, delay = 1000) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             await firebase.firestore().collection('ping').doc('status').get();
//             console.log(`Ping success (${source}, attempt ${i + 1}/${retries})`);
//             if (isSyncFailed) {
//                 isSyncFailed = false;
//                 store.dispatch('triggerSnackbarForGroup', { message: 'サーバーに接続できました。操作を再開できます。' });
//             }
//             return true;
//         } catch (error) {
//             console.log(`Ping failed (${source}, attempt ${i + 1}/${retries}):`, error.message);
//             if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
//         }
//     }
//     if (!isSyncFailed) {
//         isSyncFailed = true;
//         store.dispatch('triggerSnackbarForGroup', { message: 'サーバーに接続できません。操作が制限されています。' });
//     }
//     return false;
// }
//
// window.addEventListener('online', async () => {
//     console.log('Network online event triggered');
//     await pingServer('online event', 3, 1000);
// });
//
// window.addEventListener('offline', () => {
//     console.log('Network offline event triggered');
//     isSyncFailed = true;
//     store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークが切断されました。操作が制限されています。' });
// });
//
// pingServer('initial', 3, 1000).then(result => console.log('Initial ping result:', result));
// pingIntervalId = setInterval(() => pingServer('interval', 3, 1000), 10000);
//
// function createPointClickHandler(map01) {
//     return (e) => {
//         if (isSyncFailed) {
//             store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。詳細を表示できません。' });
//             return;
//         }
//
//         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
//         if (features.length > 0) {
//             const clickedFeature = features[0];
//             const featureData = {
//                 type: clickedFeature.type,
//                 geometry: clickedFeature.geometry,
//                 properties: clickedFeature.properties
//             };
//             console.log('設定する地物データ:', featureData);
//             store.commit('setSelectedPointFeature', featureData);
//             store.commit('setPointInfoDrawer', true);
//         }
//     };
// }
// async function fetchAndSetGeojson(groupId, map, layerId) {
//     console.log('fetchAndSetGeojson開始: groupId=', groupId, 'layerId=', layerId);
//     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) {
//         console.log('グループIDまたはレイヤーIDが一致しない、スキップ');
//         return;
//     }
//
//     try {
//         // Firestoreからデータ取得
//         const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
//         if (!docRef) {
//             throw new Error('Firestoreドキュメント参照が無効');
//         }
//
//         const doc = await docRef.get({ source: 'server' });
//         console.log('Firestoreドキュメント取得: exists=', doc.exists);
//
//         if (!doc.exists) {
//             throw new Error(`レイヤードキュメントが存在しない: layerId=${layerId}`);
//         }
//
//         const data = doc.data();
//         // console.log('取得データ: ', JSON.stringify(data, null, 2));
//
//         if (data && data.features) {
//             const newFeatures = data.features;
//             const layerName = data.name || `Layer_${layerId}`;
//             console.log('地物データ: features=', newFeatures.length, 'layerName=', layerName);
//
//             // Vuexストア更新
//             const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//             updatedLayers.push({ id: layerId, name: layerName, features: newFeatures });
//             store.commit('setCurrentGroupLayers', updatedLayers);
//             // console.log('Vuex: currentGroupLayers更新: ', JSON.stringify(updatedLayers, null, 2));
//
//             // マップソース更新
//             const source = map.getSource('oh-point-source');
//             if (!source) {
//                 throw new Error('oh-point-sourceが見つからない');
//             }
//
//             source.setData({ type: 'FeatureCollection', features: newFeatures });
//             map.triggerRepaint();
//             console.log('マップソース更新完了: features=', newFeatures.length);
//
//             // レイヤー情報をストアに反映
//             const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
//             if (!existing) {
//                 store.commit('addSelectedLayer', {
//                     map: 'map01',
//                     layer: {
//                         id: 'oh-point-layer',
//                         label: layerName,
//                         sources: [{
//                             id: 'oh-point-source',
//                             obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
//                         }],
//                         layers: [{
//                             id: 'oh-point-layer',
//                             type: 'circle',
//                             source: 'oh-point-source',
//                             paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
//                         }],
//                         opacity: 1,
//                         visibility: true,
//                         attribution: '',
//                         layerid: layerId
//                     }
//                 });
//                 store.dispatch('triggerSnackbarForGroup', { message: `レイヤー "${layerName}" を追加しました` });
//             }
//         } else {
//             console.log('データが空またはfeaturesが存在しない');
//             store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
//             const source = map.getSource('oh-point-source');
//             if (source) {
//                 source.setData({ type: 'FeatureCollection', features: [] });
//                 map.triggerRepaint();
//                 console.log('マップソースを空データで更新');
//             }
//         }
//     } catch (e) {
//         console.error('fetchAndSetGeojsonエラー: ', e);
//         // store.dispatch('triggerSnackbarForGroup', { message: `データ取得に失敗: ${e.message}` });
//     }
// }
//
// async function saveLayerToFirestore(groupId, layerId, features) {
//     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
//     isSaving = true;
//     try {
//         const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
//         const doc = await docRef.get({ source: 'server' });
//         if (!doc.exists) return;
//
//         const existingData = doc.data();
//         const layerName = existingData.name || `Layer_${layerId}`;
//
//         await docRef.set({
//             features: features,
//             groupId: groupId,
//             name: layerName,
//             lastModifiedBy: store.state.userId,
//             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
//         }, { merge: true });
//
//         // ローカル状態を更新
//         const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
//         if (currentLayer) {
//             currentLayer.features = features;
//             store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
//         } else {
//             const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//             updatedLayers.push({ id: layerId, name: layerName, features });
//             store.commit('setCurrentGroupLayers', updatedLayers);
//         }
//
//         const map = store.state.map01;
//         if (map && map.getSource('oh-point-source')) {
//             map.getSource('oh-point-source').setData({ type: 'FeatureCollection', features });
//             map.triggerRepaint();
//         }
//     } catch (e) {
//         console.error('Firestore 更新エラー:', e);
//         store.dispatch('triggerSnackbarForGroup', { message: 'データの保存に失敗しました' });
//     } finally {
//         isSaving = false;
//     }
// }
//
// function setupFirestoreListener(groupId, layerId) {
//     console.log('setupFirestoreListener開始: groupId=', groupId, 'layerId=', layerId);
//     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) {
//         console.log('グループIDまたはレイヤーIDが一致しない、スキップ');
//         return;
//     }
//
//     try {
//         if (unsubscribeSnapshot) {
//             console.log('既存のリスナーを解除');
//             unsubscribeSnapshot();
//         }
//
//         unsubscribeSnapshot = firebase.firestore()
//             .collection('groups')
//             .doc(groupId)
//             .collection('layers')
//             .doc(layerId)
//             .onSnapshot({ includeMetadataChanges: true }, (doc) => {
//                 if (isSaving) {
//                     console.log('保存中なのでスナップショット処理をスキップ');
//                     return;
//                 }
//
//                 try {
//                     console.log('スナップショット受信: exists=', doc.exists);
//                     if (!doc.exists) {
//                         throw new Error('スナップショットのドキュメントが存在しない');
//                     }
//
//                     const data = doc.data();
//                     if (data && data.features && !doc.metadata.fromCache) {
//                         const features = data.features || [];
//                         const layerName = data.name || `Layer_${layerId}`;
//                         console.log('スナップショットデータ: features=', features.length, 'layerName=', layerName);
//
//                         const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
//                         if (currentLayer) {
//                             currentLayer.features = features;
//                         } else {
//                             const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//                             updatedLayers.push({ id: layerId, name: layerName, features });
//                             store.commit('setCurrentGroupLayers', updatedLayers);
//                         }
//                         store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
//                         // console.log('Vuex: currentGroupLayers更新: ', JSON.stringify(store.state.currentGroupLayers, null, 2));
//
//                         const map01 = store.state.map01;
//                         if (map01 && map01.getSource('oh-point-source')) {
//                             map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features });
//                             map01.triggerRepaint();
//                             console.log('マップソース更新: features=', features.length);
//                         } else {
//                             console.warn('マップまたはソースが見つからない');
//                         }
//                     } else {
//                         console.log('スナップショットにデータがない、またはキャッシュデータ');
//                         const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
//                         if (currentLayer) {
//                             currentLayer.features = [];
//                             store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
//                         }
//                         const map01 = store.state.map01;
//                         if (map01 && map01.getSource('oh-point-source')) {
//                             map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: [] });
//                             map01.triggerRepaint();
//                             console.log('マップソースを空データで更新');
//                         }
//                     }
//                 } catch (error) {
//                     console.error('スナップショット処理エラー: ', error);
//                     store.dispatch('triggerSnackbarForGroup', { message: `データ同期エラー: ${error.message}` });
//                 }
//             }, (error) => {
//                 console.error('Firestoreリスナーエラー: ', error);
//                 isSyncFailed = true;
//                 store.dispatch('triggerSnackbarForGroup', { message: `リアルタイム同期に失敗: ${error.message}` });
//             });
//
//         console.log('リスナー設定完了');
//     } catch (error) {
//         console.error('setupFirestoreListenerエラー: ', error);
//         store.dispatch('triggerSnackbarForGroup', { message: `リスナー設定に失敗: ${error.message}` });
//     }
// }
//
// function createMapClickHandler(map01) {
//     return async (e) => {
//         if (!hasOhPointLayer(map01)) {
//             console.log('oh-point-layerが存在しません。初期化をスキップします。');
//             return;
//         }
//         if (isSyncFailed) {
//             store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。ポイントを追加できません。' });
//             return;
//         }
//         const now = Date.now();
//         if (now - lastClickTimestamp < 300) return;
//         lastClickTimestamp = now;
//
//         const groupId = store.state.currentGroupId;
//         const layerId = store.state.selectedLayerId;
//         if (!groupId || !layerId) {
//             store.dispatch('triggerSnackbarForGroup', { message: 'グループまたはレイヤーが選択されていません。' });
//             return;
//         }
//
//         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
//         if (features.length > 0 || !e.lngLat) return;
//
//         const { lng, lat } = e.lngLat;
//         const newFeature = {
//             type: 'Feature',
//             geometry: { type: 'Point', coordinates: [lng, lat] },
//             properties: {
//                 id: uuidv4(),
//                 createdAt: Date.now(),
//                 createdBy: store.state.myNickname || '不明',
//                 title: '新規ポイント'
//             }
//         };
//
//         // 選択中のレイヤーのfeaturesを取得
//         const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
//         if (!currentLayer) {
//             store.dispatch('triggerSnackbarForGroup', { message: '選択中のレイヤーが見つかりません。' });
//             return;
//         }
//
//         // 選択中のレイヤーのfeaturesに追加
//         const currentFeatures = currentLayer.features || [];
//         currentFeatures.push(newFeature);
//         currentLayer.features = currentFeatures;
//
//         // Vuexストアを更新
//         store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
//
//         // 共有ソースを更新
//         const source = map01.getSource('oh-point-source');
//         if (source) {
//             source.setData({
//                 type: 'FeatureCollection',
//                 features: currentLayer.features
//             });
//             map01.triggerRepaint();
//         } else {
//             console.warn('ソースが見つかりません: oh-point-source');
//             store.dispatch('triggerSnackbarForGroup', { message: 'マップソースが見つかりません。' });
//             return;
//         }
//
//         if (!isInitializing) {
//             // Firestoreに保存
//             await saveLayerToFirestore(groupId, layerId, currentLayer.features);
//         }
//
//         // 選択地物を設定
//         store.commit('setSelectedPointFeature', newFeature);
//
//         // ドロワーを開く
//         await new Promise(resolve => setTimeout(resolve, 100));
//         store.commit('setPointInfoDrawer', true);
//
//         store.dispatch('triggerSnackbarForGroup', { message: 'ポイントを追加しました' });
//     };
// }
//
// export default function useGloupLayer() {
//     const initializeGroupAndLayer = async () => {
//         setTimeout(async () => {
//             try {
//                 const savedGroupId = localStorage.getItem('lastGroupId');
//                 const savedLayerId = localStorage.getItem('lastLayerId');
//                 const map01 = store.state.map01;
//
//                 if (!map01 || !map01.isStyleLoaded()) return;
//
//                 const selectedLayers = store.state.selectedLayers.map01;
//                 const hasOhPointLayer = selectedLayers.some(layer => layer.id === 'oh-point-layer');
//
//                 if (!hasOhPointLayer) return;
//
//                 if (savedGroupId && savedLayerId) {
//                     store.commit('setCurrentGroupId', savedGroupId);
//                     store.commit('setSelectedLayerId', savedLayerId);
//                     await fetchAndSetGeojson(savedGroupId, map01, savedLayerId);
//                     console.log('グループとレイヤーを復帰しました', { selectedLayers: store.state.selectedLayers.map01 });
//                 }
//             } catch (e) {
//                 console.error('復帰エラー:', e);
//             }
//         }, 3000);
//     };
//
//     initializeGroupAndLayer();
//
//     watch(
//         () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
//         async ([map01, groupId, layerId]) => {
//             if (!map01 || !groupId || !layerId) {
//                 if (unsubscribeSnapshot) unsubscribeSnapshot();
//                 if (pingIntervalId) clearInterval(pingIntervalId);
//                 if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
//                 if (map01?.getLayer('oh-point-label-layer')) map01.removeLayer('oh-point-label-layer');
//                 if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
//                 groupGeojson.value.features = [];
//                 store.commit('setCurrentGroupLayers', []);
//                 previousIds = new Set();
//                 return;
//             }
//
//             const initializeMap = async () => {
//                 try {
//                     if (!map01.getSource('oh-point-source')) {
//                         map01.addSource('oh-point-source', {
//                             type: 'geojson',
//                             data: { type: 'FeatureCollection', features: [] }
//                         });
//                         console.log('oh-point-source を追加しました');
//                     }
//
//                     if (!map01.getLayer('oh-point-layer')) {
//                         map01.addLayer({ ...ohPointLayer });
//                         console.log('oh-point-layer を追加しました');
//                     }
//
//                     await fetchAndSetGeojson(groupId, map01, layerId);
//
//                     if (map01.getLayer('oh-point-label-layer')) {
//                         map01.removeLayer('oh-point-label-layer');
//                     }
//                     map01.addLayer({
//                         id: 'oh-point-label-layer',
//                         type: 'symbol',
//                         source: 'oh-point-source',
//                         layout: {
//                             'text-field': ['get', 'title'],
//                             'text-size': 14,
//                             'text-offset': [0, 0.5],
//                             'text-anchor': 'top'
//                         },
//                         paint: {
//                             'text-color': '#000',
//                             'text-halo-color': '#fff',
//                             'text-halo-width': 1
//                         }
//                     });
//                     console.log('oh-point-label-layer を追加しました');
//
//                     setupFirestoreListener(groupId, layerId);
//
//                     if (mapClickHandler) map01.off('click', mapClickHandler);
//                     mapClickHandler = createMapClickHandler(map01);
//                     map01.on('click', mapClickHandler);
//                     map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
//                     map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
//
//                     let draggedFeatureId = null;
//                     let isDragging = false;
//
//                     map01.on('mousedown', 'oh-point-layer', (e) => {
//                         // e.featuresが存在し、かつ配列に要素があるか確認
//                         if (!e.features || !e.features.length) return;
//                         if (isSyncFailed) {
//                             store.dispatch('triggerSnackbarForGroup', {
//                                 message: 'ネットワークに接続されていません。ポイントを移動できません。'
//                             });
//                             return;
//                         }
//
//                         isDragging = false;
//                         // featuresをキャッシュ
//                         const feature = e.features[0];
//                         const featureId = feature.properties.id;
//                         const mouseDownTime = Date.now();
//
//                         setTimeout(() => {
//                             if (Date.now() - mouseDownTime >= 100) {
//                                 isDragging = true
//                                 map01.getCanvas().style.cursor = 'grabbing';
//                                 draggedFeatureId = featureId; // キャッシュしたIDを使用
//                                 map01.dragPan.disable();
//                             }
//                         }, 100);
//                     });
//
//                     // map01.on('mousedown', 'oh-point-layer', (e) => {
//                     //     if (!e.features.length) return;
//                     //     if (isSyncFailed) {
//                     //         store.dispatch('triggerSnackbarForGroup', {
//                     //             message: 'ネットワークに接続されていません。ポイントを移動できません。'
//                     //         });
//                     //         return;
//                     //     }
//                     //     map01.getCanvas().style.cursor = 'grabbing';
//                     //     draggedFeatureId = e.features[0].properties.id;
//                     //     map01.dragPan.disable();
//                     // });
//
//                     map01.on('mousemove', (e) => {
//                         if (!isDragging) return;
//                         if (!draggedFeatureId) return;
//                         if (isSyncFailed) {
//                             store.dispatch('triggerSnackbarForGroup', {
//                                 message: 'ネットワークに接続されていません。ポイントを移動できません。'
//                             });
//                             draggedFeatureId = null;
//                             map01.getCanvas().style.cursor = '';
//                             map01.dragPan.enable();
//                             return;
//                         }
//
//                         const currentLayer = store.state.currentGroupLayers.find(l => l.id === store.state.selectedLayerId);
//                         if (!currentLayer) return;
//
//                         currentLayer.features = currentLayer.features.map(f => {
//                             if (f.properties.id === draggedFeatureId) {
//                                 return {
//                                     ...f,
//                                     geometry: {
//                                         ...f.geometry,
//                                         coordinates: [e.lngLat.lng, e.lngLat.lat]
//                                     }
//                                 };
//                             }
//                             return f;
//                         });
//
//                         store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
//
//                         const source = map01.getSource('oh-point-source');
//                         if (source) {
//                             source.setData({ type: 'FeatureCollection', features: currentLayer.features });
//                         }
//                     });
//
//                     map01.on('mouseup', async () => {
//                         if (draggedFeatureId) {
//                             map01.getCanvas().style.cursor = '';
//                             map01.dragPan.enable();
//                             draggedFeatureId = null;
//
//                             const groupId = store.state.currentGroupId;
//                             const layerId = store.state.selectedLayerId;
//                             const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
//                             if (currentLayer) {
//                                 await saveLayerToFirestore(groupId, layerId, currentLayer.features);
//                             }
//                         }
//                         isDragging = false;
//                         draggedFeatureId = null
//                     });
//
//                 } catch (e) {
//                     console.error('マップ初期化エラー:', e);
//                 }
//             };
//
//             if (map01.isStyleLoaded()) {
//                 await initializeMap();
//             } else {
//                 map01.once('load', async () => await initializeMap());
//             }
//
//             localStorage.setItem('lastGroupId', groupId);
//             localStorage.setItem('lastLayerId', layerId);
//         },
//         { immediate: true }
//     );
//
//     watch(
//         () => store.state.selectedLayers.map01,
//         async (selectedLayers) => {
//             const map = store.state.map01;
//             const groupId = store.state.currentGroupId;
//             const layerId = store.state.selectedLayerId;
//             if (!map || !groupId || !layerId) return;
//
//             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
//             if (hasGroupLayer && !isInitializing) {
//                 await fetchAndSetGeojson(groupId, map, layerId);
//             }
//         },
//         { deep: true }
//     );
//
//     window.addEventListener('unload', () => {
//         if (pingIntervalId) clearInterval(pingIntervalId);
//     });
// }