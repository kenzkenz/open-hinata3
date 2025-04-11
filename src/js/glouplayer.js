import store from '@/store';
import maplibregl from 'maplibre-gl';
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

async function pingServer(source = 'interval', retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await firebase.firestore().collection('ping').doc('status').get();
            console.log(`Ping success (${source}, attempt ${i + 1}/${retries})`);
            if (isSyncFailed) {
                isSyncFailed = false;
                store.dispatch('triggerSnackbarForGroup', {
                    message: 'サーバーに接続できました。操作を再開できます。'
                });
                console.log('isSyncFailed set to false');
            }
            return true;
        } catch (error) {
            console.log(`Ping failed (${source}, attempt ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    if (!isSyncFailed) {
        isSyncFailed = true;
        store.dispatch('triggerSnackbarForGroup', {
            message: 'サーバーに接続できません。操作が制限されています。'
        });
        console.log('isSyncFailed set to true after retries');
    }
    return false;
}

window.addEventListener('online', async () => {
    console.log('Network online event triggered');
    const wasConnected = await pingServer('online event', 3, 1000);
    if (wasConnected) {
        console.log('Operation restriction lifted after online event');
    } else {
        console.log('Failed to connect to server despite online event');
    }
});

window.addEventListener('offline', () => {
    console.log('Network offline event triggered');
    isSyncFailed = true;
    store.dispatch('triggerSnackbarForGroup', {
        message: 'ネットワークが切断されました。操作が制限されています。'
    });
    console.log('isSyncFailed set to true due to offline event');
});

setTimeout(async () => {
    await pingServer('initial', 1, 0);
    pingIntervalId = setInterval(() => {
        pingServer('interval', 3, 1000).then(result => {
            console.log('Interval ping result:', result);
        });
    }, 10000);
}, 1000);

function createPointClickHandler(map01) {
    return (e) => {
        if (isSyncFailed) {
            store.dispatch('triggerSnackbarForGroup', {
                message: 'ネットワークに接続されていません。詳細を表示できません。'
            });
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

async function fetchAndSetGeojson(groupId, map, layerId, isRestoring = false) {
    // 復元時は currentGroupId と selectedLayerId のチェックをスキップ
    if (!isRestoring && (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId)) return;

    console.log(`Fetching GeoJSON for groupId: ${groupId}, layerId: ${layerId}, isRestoring: ${isRestoring}`);
    const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
    const data = doc.data();

    if (data && data.features) {
        const newFeatures = data.features;
        groupGeojson.value.features = newFeatures;

        if (!map.getSource('oh-point-source')) {
            map.addSource('oh-point-source', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: newFeatures }
            });
        } else {
            map.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: newFeatures });
        }

        if (!map.getLayer('oh-point-layer')) {
            map.addLayer({
                ...ohPointLayer
            });
        }

        map.triggerRepaint();
        console.log('GeoJSON set and layer rendered:', newFeatures);

        const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
        updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures });
        store.commit('setCurrentGroupLayers', updatedLayers);

        const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
        if (!existing) {
            store.commit('addSelectedLayer', {
                map: 'map01',
                layer: {
                    id: 'oh-point-layer',
                    label: `Layer_${layerId}`,
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
            console.log('Added oh-point-layer to selectedLayers');
            if (isRestoring) {
                store.dispatch('triggerSnackbarForGroup', {
                    message: '前回のレイヤーを復元しました。'
                });
            } else {
                store.dispatch('triggerSnackbarForGroup', {
                    message: `レイヤー "Layer_${layerId}" を追加しました`
                });
            }
        }
    } else {
        groupGeojson.value.features = [];
        store.commit('setCurrentGroupLayers', []);
        console.log('No features found for layerId:', layerId);
    }
}

export function deleteAllPoints(currentGroupId) {
    if (isSyncFailed) {
        store.dispatch('triggerSnackbarForGroup', {
            message: 'ネットワークに接続されていません。ポイントを削除できません。'
        });
        return;
    }

    groupGeojson.value.features = [];
    const map = store.state.map01;
    if (map && map.getSource('oh-point-source')) {
        map.getSource('oh-point-source').setData({
            type: 'FeatureCollection',
            features: []
        });
        map.triggerRepaint();
    }
    saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
    store.dispatch('triggerSnackbarForGroup', {
        message: 'すべてのポイントを削除しました'
    });
}

function handleMapClick(e, currentGroupId) {
    const map = store.state.map01;
    const layerId = store.state.selectedLayerId;

    if (!(e.target && e.target.classList.contains('point-remove'))) return;

    if (isSyncFailed) {
        store.dispatch('triggerSnackbarForGroup', {
            message: 'ネットワークに接続されていません。ポイントを削除できません。'
        });
        return;
    }

    const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
    if (idsToDelete.size === 0) return;

    groupGeojson.value.features = groupGeojson.value.features.filter(
        f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
    );

    map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
    map.triggerRepaint();
    saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);

    popups.forEach(popup => popup.remove());
    popups.length = 0;

    store.dispatch('triggerSnackbarForGroup', {
        message: `${idsToDelete.size} 件のポイントを削除しました`
    });
}

async function saveLayerToFirestore(groupId, layerId, features) {
    if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
    isSaving = true;
    try {
        const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get();
        if (!doc.exists) return;

        await docRef.set({
            features: features,
            groupId: groupId,
            lastModifiedBy: store.state.userId,
            lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
        updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
        store.commit('setCurrentGroupLayers', updatedLayers);
        groupGeojson.value.features = features;
    } catch (e) {
        console.error('Firestore 更新エラー:', e);
        store.dispatch('triggerSnackbarForGroup', {
            message: 'データの保存に失敗しました'
        });
    } finally {
        await new Promise(resolve => setTimeout(resolve, 200));
        isSaving = false;
    }
}

function setupFirestoreListener(groupId, layerId) {
    if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
    if (unsubscribeSnapshot) unsubscribeSnapshot();

    unsubscribeSnapshot = firebase.firestore()
        .collection('groups')
        .doc(groupId)
        .collection('layers')
        .doc(layerId)
        .onSnapshot({ includeMetadataChanges: true }, (doc) => {
            const data = doc.data();
            const modifiedBy = data?.lastModifiedBy;
            const myId = store.state.userId;

            if (data && data.features) {
                const features = data.features || [];
                const currentIds = new Set(features.map(f => f.properties?.id));
                const newIds = [...currentIds].filter(id => !previousIds.has(id));
                const deletedIds = [...previousIds].filter(id => !currentIds.has(id));

                if (!isInitializing && !justChangedGroup) {
                    if (newIds.length === 1) {
                        console.log('ポイント追加通知トリガー');
                        store.dispatch('triggerSnackbarForGroup', {
                            message: `🔴 ${newIds.length} 件のポイントが追加されました。`
                        });
                    } else if (deletedIds.length === 1) {
                        console.log('ポイント削除通知トリガー');
                        store.dispatch('triggerSnackbarForGroup', {
                            message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。`
                        });
                    }
                } else {
                    console.log('通知スキップ: ', { isInitializing, justChangedGroup });
                }

                previousIds = currentIds;

                groupGeojson.value.features = features;
                const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
                updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
                store.commit('setCurrentGroupLayers', updatedLayers);

                const map01 = store.state.map01;
                const source = map01.getSource('oh-point-source');
                if (source) {
                    source.setData({ type: 'FeatureCollection', features });
                    map01.triggerRepaint();
                }
            } else {
                groupGeojson.value.features = [];
                store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
                const map01 = store.state.map01;
                const source = map01.getSource('oh-point-source');
                if (source) {
                    source.setData({ type: 'FeatureCollection', features: [] });
                    map01.triggerRepaint();
                }
                if (store.state.selectedLayerId === layerId) {
                    store.commit('setSelectedLayerId', null);
                    localStorage.removeItem('lastLayerId');
                }
            }
        }, (error) => {
            console.error('Snapshot エラー:', error);
            isSyncFailed = true;
            store.dispatch('triggerSnackbarForGroup', {
                message: 'リアルタイム同期に失敗しました。操作が制限されています。'
            });
            console.log('Snapshot error, isSyncFailed set to true');
        });
}

function createMapClickHandler(map01) {
    return async (e) => {
        if (isSyncFailed) {
            store.dispatch('triggerSnackbarForGroup', {
                message: 'ネットワークに接続されていません。ポイントを追加できません。'
            });
            return;
        }

        try {
            if (!map01.getLayer('oh-point-layer')) {
                console.warn('oh-point-layer が存在しません。処理をスキップします。');
                return;
            }
        } catch (e) {
            console.log(e);
        }

        const now = Date.now();
        if (now - lastClickTimestamp < 300) return;
        lastClickTimestamp = now;

        const groupId = store.state.currentGroupId;
        const layerId = store.state.selectedLayerId;
        if (!groupId || !layerId) return;

        const features = map01.queryRenderedFeatures(e.point, {
            layers: ['oh-point-layer', 'oh-point-label-layer']
        });
        if (features.length > 0 || !e.lngLat) return;

        const { lng, lat } = e.lngLat;
        const newFeature = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: {
                id: uuidv4(),
                createdAt: Date.now(),
                createdBy: store.state.myNickname || '不明',
                description: ''
            }
        };

        const source = map01.getSource('oh-point-source');
        const currentFeatures = groupGeojson.value.features || [];
        const updatedFeatures = [...currentFeatures, newFeature];

        groupGeojson.value.features = updatedFeatures;

        if (source) {
            source.setData({ type: 'FeatureCollection', features: updatedFeatures });
            map01.triggerRepaint();
        }

        if (!isInitializing) {
            await saveLayerToFirestore(groupId, layerId, updatedFeatures);
        }

        store.commit('setSelectedPointFeature', newFeature);
        store.commit('setPointInfoDrawer', true);
    };
}

export default function useGloupLayer() {
    let savedGroupId = localStorage.getItem('lastGroupId');
    let savedLayerId = localStorage.getItem('lastLayerId');

    // レイヤー復帰用の初期化関数
    const initializeGroupAndLayer = async () => {
        const map01 = store.state.map01;

        // マップがロードされるのを待つ
        if (!map01) {
            console.log('Map not yet initialized, waiting...');
            return;
        }

        if (!map01.isStyleLoaded()) {
            console.log('Map style not loaded, waiting for load event');
            map01.once('load', async () => {
                await restoreLayer(map01);
            });
        } else {
            await restoreLayer(map01);
        }
    };

    // レイヤー復元処理を分離
    async function restoreLayer(map) {
        console.log('Starting layer restoration with savedGroupId:', savedGroupId, 'savedLayerId:', savedLayerId);

        // ストアに保存された値を設定
        if (savedGroupId && savedLayerId) {
            store.commit('setCurrentGroupId', savedGroupId);
            store.commit('setSelectedLayerId', savedLayerId);
            console.log('Set store states: currentGroupId:', savedGroupId, 'selectedLayerId:', savedLayerId);

            // 既存の oh-point-layer をクリア
            if (map.getLayer('oh-point-layer')) {
                map.removeLayer('oh-point-layer');
            }
            if (map.getSource('oh-point-source')) {
                map.removeSource('oh-point-source');
            }

            // レイヤーを復元
            await fetchAndSetGeojson(savedGroupId, map, savedLayerId, true);
            console.log('Layer restoration completed');
        } else {
            console.log('No saved groupId or layerId found in localStorage');
        }
    }

    initializeGroupAndLayer().catch(e => {
        console.error('初期化エラー:', e);
        store.dispatch('triggerSnackbarForGroup', {
            message: '初期化に失敗しました'
        });
    });

    watch(
        () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
        async ([map01, groupId, layerId]) => {
            if (!map01 || !groupId || !layerId) {
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
                if (pingIntervalId) {
                    clearInterval(pingIntervalId);
                    pingIntervalId = null;
                }
                if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
                if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
                store.commit('clearSelectedLayers', 'map01');
                groupGeojson.value.features = [];
                store.commit('setCurrentGroupLayers', []);
                previousIds = new Set();
                return;
            }

            const initializeMap = async () => {
                if (!map01.getSource('oh-point-source')) {
                    map01.addSource('oh-point-source', {
                        type: 'geojson',
                        data: { type: 'FeatureCollection', features: [] }
                    });
                }
                if (!map01.getLayer('oh-point-layer')) {
                    map01.addLayer({
                        ...ohPointLayer
                    });
                }

                await fetchAndSetGeojson(groupId, map01, layerId);
                setupFirestoreListener(groupId, layerId);

                if (mapClickHandler) map01.off('click', mapClickHandler);
                mapClickHandler = createMapClickHandler(map01);
                map01.on('click', mapClickHandler);
                map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
                map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));

                let draggedFeatureId = null;

                map01.on('mousedown', 'oh-point-layer', (e) => {
                    if (!e.features.length) return;
                    if (isSyncFailed) {
                        store.dispatch('triggerSnackbarForGroup', {
                            message: 'ネットワークに接続されていません。ポイントを移動できません。'
                        });
                        return;
                    }
                    map01.getCanvas().style.cursor = 'grabbing';
                    draggedFeatureId = e.features[0].properties.id;
                    map01.dragPan.disable();
                });

                map01.on('mousemove', (e) => {
                    if (!draggedFeatureId) return;
                    if (isSyncFailed) {
                        store.dispatch('triggerSnackbarForGroup', {
                            message: 'ネットワークに接続されていません。ポイントを移動できません。'
                        });
                        draggedFeatureId = null;
                        map01.getCanvas().style.cursor = '';
                        map01.dragPan.enable();
                        return;
                    }

                    const features = groupGeojson.value.features.map(f => {
                        if (f.properties.id === draggedFeatureId) {
                            return {
                                ...f,
                                geometry: {
                                    ...f.geometry,
                                    coordinates: [e.lngLat.lng, e.lngLat.lat]
                                }
                            };
                        }
                        return f;
                    });

                    groupGeojson.value.features = features;
                    const source = map01.getSource('oh-point-source');
                    if (source) {
                        source.setData({ type: 'FeatureCollection', features });
                    }
                });

                map01.on('mouseup', async () => {
                    if (draggedFeatureId) {
                        map01.getCanvas().style.cursor = '';
                        map01.dragPan.enable();
                        draggedFeatureId = null;

                        const groupId = store.state.currentGroupId;
                        const layerId = store.state.selectedLayerId;
                        await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
                    }
                });

                map01.on('touchstart', 'oh-point-layer', (e) => {
                    if (!e.features.length) return;
                    if (isSyncFailed) {
                        store.dispatch('triggerSnackbarForGroup', {
                            message: 'ネットワークに接続されていません。ポイントを移動できません。'
                        });
                        return;
                    }
                    draggedFeatureId = e.features[0].properties.id;
                    map01.dragPan.disable();
                });

                map01.on('touchmove', (e) => {
                    if (!draggedFeatureId || !e.points || e.points.length === 0) return;
                    if (isSyncFailed) {
                        store.dispatch('triggerSnackbarForGroup', {
                            message: 'ネットワークに接続されていません。ポイントを移動できません。'
                        });
                        draggedFeatureId = null;
                        map01.dragPan.enable();
                        return;
                    }

                    const touch = e.lngLat;
                    const features = groupGeojson.value.features.map(f => {
                        if (f.properties.id === draggedFeatureId) {
                            return {
                                ...f,
                                geometry: {
                                    ...f.geometry,
                                    coordinates: [touch.lng, touch.lat]
                                }
                            };
                        }
                        return f;
                    });

                    groupGeojson.value.features = features;
                    const source = map01.getSource('oh-point-source');
                    if (source) {
                        source.setData({ type: 'FeatureCollection', features });
                    }
                });

                map01.on('touchend', async () => {
                    if (draggedFeatureId) {
                        map01.dragPan.enable();
                        draggedFeatureId = null;

                        const groupId = store.state.currentGroupId;
                        const layerId = store.state.selectedLayerId;
                        await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
                    }
                });
            };

            if (map01.isStyleLoaded()) {
                await initializeMap();
            } else {
                map01.once('load', async () => await initializeMap());
            }

            localStorage.setItem('lastGroupId', groupId);
            localStorage.setItem('lastLayerId', layerId);

            justChangedGroup = false;
            isInitializing = false;
        },
        { immediate: true }
    );

    watch(
        () => store.state.selectedLayers.map01,
        async (selectedLayers) => {
            const map = store.state.map01;
            const groupId = store.state.currentGroupId;
            const layerId = store.state.selectedLayerId;
            if (!map || !groupId || !layerId) return;

            const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
            if (hasGroupLayer && !isInitializing) {
                await fetchAndSetGeojson(groupId, map, layerId);
                previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
            }
        },
        { deep: true }
    );

    window.addEventListener('unload', () => {
        if (pingIntervalId) {
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
    });
}

// import store from '@/store';
// import maplibregl from 'maplibre-gl';
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
// let isSyncFailed = !navigator.onLine; // 初期状態でオフライン確認
// let pingIntervalId = null; // ピングのインターバルID
//
// // サーバーピング関数（再試行ロジック付き）
// async function pingServer(source = 'interval', retries = 3, delay = 1000) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             await firebase.firestore().collection('ping').doc('status').get();
//             console.log(`Ping success (${source}, attempt ${i + 1}/${retries})`);
//             if (isSyncFailed) {
//                 isSyncFailed = false;
//                 store.dispatch('triggerSnackbarForGroup', {
//                     message: 'サーバーに接続できました。操作を再開できます。'
//                 });
//                 console.log('isSyncFailed set to false');
//             }
//             return true;
//         } catch (error) {
//             console.log(`Ping failed (${source}, attempt ${i + 1}/${retries}):`, error.message);
//             if (i < retries - 1) {
//                 await new Promise(resolve => setTimeout(resolve, delay));
//             }
//         }
//     }
//     if (!isSyncFailed) {
//         isSyncFailed = true;
//         store.dispatch('triggerSnackbarForGroup', {
//             message: 'サーバーに接続できません。操作が制限されています。'
//         });
//         console.log('isSyncFailed set to true after retries');
//     }
//     return false;
// }
//
// // ネットワーク状態の監視（定期ピンングを元に戻す）
// window.addEventListener('online', async () => {
//     console.log('Network online event triggered');
//     const wasConnected = await pingServer('online event', 3, 1000);
//     if (wasConnected) {
//         console.log('Operation restriction lifted after online event');
//     } else {
//         console.log('Failed to connect to server despite online event');
//     }
// });
//
// window.addEventListener('offline', () => {
//     console.log('Network offline event triggered');
//     isSyncFailed = true;
//     store.dispatch('triggerSnackbarForGroup', {
//         message: 'ネットワークが切断されました。操作が制限されています。'
//     });
//     console.log('isSyncFailed set to true due to offline event');
// });
//
// // 定期ピンングの復元（初回は起動時にシンプルに確認）
// setTimeout(async () => {
//     await pingServer('initial', 1, 0); // 起動時は1回のみ、遅延なしで確認
//     pingIntervalId = setInterval(() => {
//         pingServer('interval', 3, 1000).then(result => {
//             console.log('Interval ping result:', result);
//         });
//     }, 10000); // 10秒間隔で定期ピンング
// }, 1000); // 起動後1秒で開始
//
// // 地物クリック時のハンドラー
// function createPointClickHandler(map01) {
//     return (e) => {
//         if (isSyncFailed) {
//             store.dispatch('triggerSnackbarForGroup', {
//                 message: 'ネットワークに接続されていません。詳細を表示できません。'
//             });
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
//
// async function fetchAndSetGeojson(groupId, map, layerId) {
//     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
//     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
//     const data = doc.data();
//
//     if (data && data.features) {
//         const newFeatures = data.features;
//         groupGeojson.value.features = newFeatures;
//
//         const source = map.getSource('oh-point-source');
//         if (source) {
//             source.setData({ type: 'FeatureCollection', features: newFeatures });
//             map.triggerRepaint();
//         }
//
//         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures });
//         store.commit('setCurrentGroupLayers', updatedLayers);
//
//         const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
//         if (!existing) {
//             store.commit('addSelectedLayer', {
//                 map: 'map01',
//                 layer: {
//                     id: 'oh-point-layer',
//                     label: `Layer_${layerId}`,
//                     sources: [{
//                         id: 'oh-point-source',
//                         obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
//                     }],
//                     layers: [{
//                         id: 'oh-point-layer',
//                         type: 'circle',
//                         source: 'oh-point-source',
//                         paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
//                     }],
//                     opacity: 1,
//                     visibility: true,
//                     attribution: '',
//                     layerid: layerId
//                 }
//             });
//             store.dispatch('triggerSnackbarForGroup', {
//                 message: `レイヤー "Layer_${layerId}" を追加しました`
//             });
//         }
//     } else {
//         groupGeojson.value.features = [];
//         store.commit('setCurrentGroupLayers', []);
//     }
// }
//
// export function deleteAllPoints(currentGroupId) {
//     if (isSyncFailed) {
//         store.dispatch('triggerSnackbarForGroup', {
//             message: 'ネットワークに接続されていません。ポイントを削除できません。'
//         });
//         return;
//     }
//
//     groupGeojson.value.features = [];
//     const map = store.state.map01;
//     if (map && map.getSource('oh-point-source')) {
//         map.getSource('oh-point-source').setData({
//             type: 'FeatureCollection',
//             features: []
//         });
//         map.triggerRepaint();
//     }
//     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
//     store.dispatch('triggerSnackbarForGroup', {
//         message: 'すべてのポイントを削除しました'
//     });
// }
//
// function handleMapClick(e, currentGroupId) {
//     const map = store.state.map01;
//     const layerId = store.state.selectedLayerId;
//
//     if (!(e.target && e.target.classList.contains('point-remove'))) return;
//
//     if (isSyncFailed) {
//         store.dispatch('triggerSnackbarForGroup', {
//             message: 'ネットワークに接続されていません。ポイントを削除できません。'
//         });
//         return;
//     }
//
//     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
//     if (idsToDelete.size === 0) return;
//
//     groupGeojson.value.features = groupGeojson.value.features.filter(
//         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
//     );
//
//     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
//     map.triggerRepaint();
//     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);
//
//     popups.forEach(popup => popup.remove());
//     popups.length = 0;
//
//     store.dispatch('triggerSnackbarForGroup', {
//         message: `${idsToDelete.size} 件のポイントを削除しました`
//     });
// }
//
// async function saveLayerToFirestore(groupId, layerId, features) {
//     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
//     isSaving = true;
//     try {
//         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId);
//         const doc = await docRef.get();
//         if (!doc.exists) return;
//
//         await docRef.set({
//             features: features,
//             groupId: groupId,
//             lastModifiedBy: store.state.userId,
//             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
//         }, { merge: true });
//
//         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
//         store.commit('setCurrentGroupLayers', updatedLayers);
//         groupGeojson.value.features = features;
//     } catch (e) {
//         console.error('Firestore 更新エラー:', e);
//         store.dispatch('triggerSnackbarForGroup', {
//             message: 'データの保存に失敗しました'
//         });
//     } finally {
//         await new Promise(resolve => setTimeout(resolve, 200));
//         isSaving = false;
//     }
// }
//
// function setupFirestoreListener(groupId, layerId) {
//     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
//     if (unsubscribeSnapshot) unsubscribeSnapshot();
//
//     unsubscribeSnapshot = firebase.firestore()
//         .collection('groups')
//         .doc(groupId)
//         .collection('layers')
//         .doc(layerId)
//         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
//             const data = doc.data();
//             const modifiedBy = data?.lastModifiedBy;
//             const myId = store.state.userId;
//
//             if (data && data.features) {
//                 const features = data.features || [];
//                 const currentIds = new Set(features.map(f => f.properties?.id));
//                 const newIds = [...currentIds].filter(id => !previousIds.has(id));
//                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
//
//                 if (!isInitializing && !justChangedGroup) {
//                     if (newIds.length === 1) {
//                         console.log('ポイント追加通知トリガー');
//                         store.dispatch('triggerSnackbarForGroup', {
//                             message: `🔴 ${newIds.length} 件のポイントが追加されました。`
//                         });
//                     } else if (deletedIds.length === 1) {
//                         console.log('ポイント削除通知トリガー');
//                         store.dispatch('triggerSnackbarForGroup', {
//                             message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。`
//                         });
//                     }
//                 } else {
//                     console.log('通知スキップ: ', { isInitializing, justChangedGroup });
//                 }
//
//                 previousIds = currentIds;
//
//                 groupGeojson.value.features = features;
//                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
//                 store.commit('setCurrentGroupLayers', updatedLayers);
//
//                 const map01 = store.state.map01;
//                 const source = map01.getSource('oh-point-source');
//                 if (source) {
//                     source.setData({ type: 'FeatureCollection', features });
//                     map01.triggerRepaint();
//                 }
//             } else {
//                 groupGeojson.value.features = [];
//                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
//                 const map01 = store.state.map01;
//                 const source = map01.getSource('oh-point-source');
//                 if (source) {
//                     source.setData({ type: 'FeatureCollection', features: [] });
//                     map01.triggerRepaint();
//                 }
//                 if (store.state.selectedLayerId === layerId) {
//                     store.commit('setSelectedLayerId', null);
//                     localStorage.removeItem('lastLayerId');
//                 }
//             }
//         }, (error) => {
//             console.error('Snapshot エラー:', error);
//             isSyncFailed = true;
//             store.dispatch('triggerSnackbarForGroup', {
//                 message: 'リアルタイム同期に失敗しました。操作が制限されています。'
//             });
//             console.log('Snapshot error, isSyncFailed set to true');
//         });
// }
//
// function createMapClickHandler(map01) {
//     return async (e) => {
//         if (isSyncFailed) {
//             store.dispatch('triggerSnackbarForGroup', {
//                 message: 'ネットワークに接続されていません。ポイントを追加できません。'
//             });
//             return;
//         }
//
//         try {
//             if (!map01.getLayer('oh-point-layer')) {
//                 console.warn('oh-point-layer が存在しません。処理をスキップします。');
//                 return;
//             }
//         } catch (e) {
//             console.log(e);
//         }
//
//         const now = Date.now();
//         if (now - lastClickTimestamp < 300) return;
//         lastClickTimestamp = now;
//
//         const groupId = store.state.currentGroupId;
//         const layerId = store.state.selectedLayerId;
//         if (!groupId || !layerId) return;
//
//         const features = map01.queryRenderedFeatures(e.point, {
//             layers: ['oh-point-layer', 'oh-point-label-layer']
//         });
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
//                 description: ''
//             }
//         };
//
//         const source = map01.getSource('oh-point-source');
//         const currentFeatures = groupGeojson.value.features || [];
//         const updatedFeatures = [...currentFeatures, newFeature];
//
//         groupGeojson.value.features = updatedFeatures;
//
//         if (source) {
//             source.setData({ type: 'FeatureCollection', features: updatedFeatures });
//             map01.triggerRepaint();
//         }
//
//         if (!isInitializing) {
//             await saveLayerToFirestore(groupId, layerId, updatedFeatures);
//         }
//
//         store.commit('setSelectedPointFeature', newFeature);
//         store.commit('setPointInfoDrawer', true);
//     };
// }
//
// export default function useGloupLayer() {
//     let savedGroupId = localStorage.getItem('lastGroupId');
//     let savedLayerId = localStorage.getItem('lastLayerId');
//
//     const initializeGroupAndLayer = async () => {
//         setTimeout(() => {
//             let selectedLayers = store.state.selectedLayers.map01;
//             store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
//             console.log(selectedLayers);
//         }, 1500);
//     };
//
//     initializeGroupAndLayer().catch(e => {
//         console.error('初期化エラー:', e);
//         store.dispatch('triggerSnackbarForGroup', {
//             message: '初期化に失敗しました'
//         });
//     });
//
//     watch(
//         () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
//         async ([map01, groupId, layerId]) => {
//             if (!map01 || !groupId || !layerId) {
//                 if (unsubscribeSnapshot) {
//                     unsubscribeSnapshot();
//                     unsubscribeSnapshot = null;
//                 }
//                 if (pingIntervalId) {
//                     clearInterval(pingIntervalId);
//                     pingIntervalId = null;
//                 }
//                 if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
//                 if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
//                 store.commit('clearSelectedLayers', 'map01');
//                 groupGeojson.value.features = [];
//                 store.commit('setCurrentGroupLayers', []);
//                 previousIds = new Set();
//                 return;
//             }
//
//             const initializeMap = async () => {
//                 if (!map01.getSource('oh-point-source')) {
//                     map01.addSource('oh-point-source', {
//                         type: 'geojson',
//                         data: { type: 'FeatureCollection', features: [] }
//                     });
//                 }
//                 if (!map01.getLayer('oh-point-layer')) {
//                     map01.addLayer({
//                         ...ohPointLayer
//                     });
//                 }
//
//                 await fetchAndSetGeojson(groupId, map01, layerId);
//                 setupFirestoreListener(groupId, layerId);
//
//                 if (mapClickHandler) map01.off('click', mapClickHandler);
//                 mapClickHandler = createMapClickHandler(map01);
//                 map01.on('click', mapClickHandler);
//                 map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
//                 map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
//
//                 let draggedFeatureId = null;
//
//                 map01.on('mousedown', 'oh-point-layer', (e) => {
//                     if (!e.features.length) return;
//                     if (isSyncFailed) {
//                         store.dispatch('triggerSnackbarForGroup', {
//                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
//                         });
//                         return;
//                     }
//                     map01.getCanvas().style.cursor = 'grabbing';
//                     draggedFeatureId = e.features[0].properties.id;
//                     map01.dragPan.disable();
//                 });
//
//                 map01.on('mousemove', (e) => {
//                     if (!draggedFeatureId) return;
//                     if (isSyncFailed) {
//                         store.dispatch('triggerSnackbarForGroup', {
//                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
//                         });
//                         draggedFeatureId = null;
//                         map01.getCanvas().style.cursor = '';
//                         map01.dragPan.enable();
//                         return;
//                     }
//
//                     const features = groupGeojson.value.features.map(f => {
//                         if (f.properties.id === draggedFeatureId) {
//                             return {
//                                 ...f,
//                                 geometry: {
//                                     ...f.geometry,
//                                     coordinates: [e.lngLat.lng, e.lngLat.lat]
//                                 }
//                             };
//                         }
//                         return f;
//                     });
//
//                     groupGeojson.value.features = features;
//                     const source = map01.getSource('oh-point-source');
//                     if (source) {
//                         source.setData({ type: 'FeatureCollection', features });
//                     }
//                 });
//
//                 map01.on('mouseup', async () => {
//                     if (draggedFeatureId) {
//                         map01.getCanvas().style.cursor = '';
//                         map01.dragPan.enable();
//                         draggedFeatureId = null;
//
//                         const groupId = store.state.currentGroupId;
//                         const layerId = store.state.selectedLayerId;
//                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
//                     }
//                 });
//
//                 map01.on('touchstart', 'oh-point-layer', (e) => {
//                     if (!e.features.length) return;
//                     if (isSyncFailed) {
//                         store.dispatch('triggerSnackbarForGroup', {
//                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
//                         });
//                         return;
//                     }
//                     draggedFeatureId = e.features[0].properties.id;
//                     map01.dragPan.disable();
//                 });
//
//                 map01.on('touchmove', (e) => {
//                     if (!draggedFeatureId || !e.points || e.points.length === 0) return;
//                     if (isSyncFailed) {
//                         store.dispatch('triggerSnackbarForGroup', {
//                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
//                         });
//                         draggedFeatureId = null;
//                         map01.dragPan.enable();
//                         return;
//                     }
//
//                     const touch = e.lngLat;
//                     const features = groupGeojson.value.features.map(f => {
//                         if (f.properties.id === draggedFeatureId) {
//                             return {
//                                 ...f,
//                                 geometry: {
//                                     ...f.geometry,
//                                     coordinates: [touch.lng, touch.lat]
//                                 }
//                             };
//                         }
//                         return f;
//                     });
//
//                     groupGeojson.value.features = features;
//                     const source = map01.getSource('oh-point-source');
//                     if (source) {
//                         source.setData({ type: 'FeatureCollection', features });
//                     }
//                 });
//
//                 map01.on('touchend', async () => {
//                     if (draggedFeatureId) {
//                         map01.dragPan.enable();
//                         draggedFeatureId = null;
//
//                         const groupId = store.state.currentGroupId;
//                         const layerId = store.state.selectedLayerId;
//                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
//                     }
//                 });
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
//
//             justChangedGroup = false;
//             isInitializing = false;
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
//                 previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
//             }
//         },
//         { deep: true }
//     );
//
//     window.addEventListener('unload', () => {
//         if (pingIntervalId) {
//             clearInterval(pingIntervalId);
//             pingIntervalId = null;
//         }
//     });
// }
//
// // import store from '@/store';
// // import maplibregl from 'maplibre-gl';
// // import { db } from '@/firebase';
// // import { watch } from 'vue';
// // import { groupGeojson, ohPointLayer } from '@/js/layers';
// // import { popups } from '@/js/popup';
// // import { v4 as uuidv4 } from 'uuid';
// // import firebase from 'firebase/app';
// // import 'firebase/firestore';
// //
// // let unsubscribeSnapshot = null;
// // let lastClickTimestamp = 0;
// // let previousIds = new Set();
// // let mapClickHandler = null;
// // let isInitializing = false;
// // let justChangedGroup = false;
// // let isSaving = false;
// // let isSyncFailed = !navigator.onLine; // 初期状態でオフライン確認
// // let pingIntervalId = null; // ピングのインターバルID
// //
// // // サーバーピング関数（再試行ロジックと詳細ログ追加）
// // async function pingServer(source = 'interval', retries = 3, delay = 1000) {
// //     for (let i = 0; i < retries; i++) {
// //         try {
// //             await firebase.firestore().collection('ping').doc('status').get();
// //             console.log(`Ping success (${source}, attempt ${i + 1}/${retries})`);
// //             if (isSyncFailed) {
// //                 isSyncFailed = false;
// //                 store.dispatch('triggerSnackbarForGroup', {
// //                     message: 'サーバーに接続できました。操作を再開できます。'
// //                 });
// //                 console.log('isSyncFailed set to false');
// //             }
// //             return true; // 成功したら即時終了
// //         } catch (error) {
// //             console.log(`Ping failed (${source}, attempt ${i + 1}/${retries}):`, error.message);
// //             if (i < retries - 1) {
// //                 await new Promise(resolve => setTimeout(resolve, delay)); // 再試行前に待機
// //             }
// //         }
// //     }
// //     if (!isSyncFailed) {
// //         isSyncFailed = true;
// //         store.dispatch('triggerSnackbarForGroup', {
// //             message: 'サーバーに接続できません。操作が制限されています。'
// //         });
// //         console.log('isSyncFailed set to true after retries');
// //     }
// //     return false;
// // }
// //
// // // ネットワーク状態の監視（即時ピンングと再試行）
// // window.addEventListener('online', async () => {
// //     console.log('Network online event triggered');
// //     const wasConnected = await pingServer('online event', 3, 1000);
// //     if (wasConnected) {
// //         console.log('Operation restriction lifted after online event');
// //     } else {
// //         console.log('Failed to connect to server despite online event');
// //     }
// // });
// //
// // window.addEventListener('offline', () => {
// //     console.log('Network offline event triggered');
// //     isSyncFailed = true;
// //     store.dispatch('triggerSnackbarForGroup', {
// //         message: 'ネットワークが切断されました。操作が制限されています。'
// //     });
// //     console.log('isSyncFailed set to true due to offline event');
// // });
// //
// // // 定期的なサーバーピング（初回即時実行）
// // pingServer('initial', 3, 1000).then(result => {
// //     console.log('Initial ping result:', result);
// // });
// // pingIntervalId = setInterval(() => {
// //     pingServer('interval', 3, 1000).then(result => {
// //         console.log('Interval ping result:', result);
// //     });
// // }, 10000); // 10秒間隔に短縮して復帰検知を高速化
// //
// // // 地物クリック時のハンドラー（ドロワー制御を追加）
// // function createPointClickHandler(map01) {
// //     return (e) => {
// //         if (isSyncFailed) {
// //             store.dispatch('triggerSnackbarForGroup', {
// //                 message: 'ネットワークに接続されていません。詳細を表示できません。'
// //             });
// //             return;
// //         }
// //
// //         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
// //         if (features.length > 0) {
// //             const clickedFeature = features[0];
// //             const featureData = {
// //                 type: clickedFeature.type,
// //                 geometry: clickedFeature.geometry,
// //                 properties: clickedFeature.properties
// //             };
// //             console.log('設定する地物データ:', featureData);
// //             store.commit('setSelectedPointFeature', featureData);
// //             store.commit('setPointInfoDrawer', true);
// //         }
// //     };
// // }
// //
// // async function fetchAndSetGeojson(groupId, map, layerId) {
// //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
// //     const data = doc.data();
// //
// //     if (data && data.features) {
// //         const newFeatures = data.features;
// //         groupGeojson.value.features = newFeatures;
// //
// //         const source = map.getSource('oh-point-source');
// //         if (source) {
// //             source.setData({ type: 'FeatureCollection', features: newFeatures });
// //             map.triggerRepaint();
// //         }
// //
// //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures });
// //         store.commit('setCurrentGroupLayers', updatedLayers);
// //
// //         const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
// //         if (!existing) {
// //             store.commit('addSelectedLayer', {
// //                 map: 'map01',
// //                 layer: {
// //                     id: 'oh-point-layer',
// //                     label: `Layer_${layerId}`,
// //                     sources: [{
// //                         id: 'oh-point-source',
// //                         obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
// //                     }],
// //                     layers: [{
// //                         id: 'oh-point-layer',
// //                         type: 'circle',
// //                         source: 'oh-point-source',
// //                         paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
// //                     }],
// //                     opacity: 1,
// //                     visibility: true,
// //                     attribution: '',
// //                     layerid: layerId
// //                 }
// //             });
// //             store.dispatch('triggerSnackbarForGroup', {
// //                 message: `レイヤー "Layer_${layerId}" を追加しました`
// //             });
// //         }
// //     } else {
// //         groupGeojson.value.features = [];
// //         store.commit('setCurrentGroupLayers', []);
// //     }
// // }
// //
// // export function deleteAllPoints(currentGroupId) {
// //     if (isSyncFailed) {
// //         store.dispatch('triggerSnackbarForGroup', {
// //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// //         });
// //         return;
// //     }
// //
// //     groupGeojson.value.features = [];
// //     const map = store.state.map01;
// //     if (map && map.getSource('oh-point-source')) {
// //         map.getSource('oh-point-source').setData({
// //             type: 'FeatureCollection',
// //             features: []
// //         });
// //         map.triggerRepaint();
// //     }
// //     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
// //     store.dispatch('triggerSnackbarForGroup', {
// //         message: 'すべてのポイントを削除しました'
// //     });
// // }
// //
// // function handleMapClick(e, currentGroupId) {
// //     const map = store.state.map01;
// //     const layerId = store.state.selectedLayerId;
// //
// //     if (!(e.target && e.target.classList.contains('point-remove'))) return;
// //
// //     if (isSyncFailed) {
// //         store.dispatch('triggerSnackbarForGroup', {
// //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// //         });
// //         return;
// //     }
// //
// //     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
// //     if (idsToDelete.size === 0) return;
// //
// //     groupGeojson.value.features = groupGeojson.value.features.filter(
// //         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
// //     );
// //
// //     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
// //     map.triggerRepaint();
// //     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);
// //
// //     popups.forEach(popup => popup.remove());
// //     popups.length = 0;
// //
// //     store.dispatch('triggerSnackbarForGroup', {
// //         message: `${idsToDelete.size} 件のポイントを削除しました`
// //     });
// // }
// //
// // async function saveLayerToFirestore(groupId, layerId, features) {
// //     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
// //     isSaving = true;
// //     try {
// //         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId);
// //         const doc = await docRef.get();
// //         if (!doc.exists) return;
// //
// //         await docRef.set({
// //             features: features,
// //             groupId: groupId,
// //             lastModifiedBy: store.state.userId,
// //             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
// //         }, { merge: true });
// //
// //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// //         store.commit('setCurrentGroupLayers', updatedLayers);
// //         groupGeojson.value.features = features;
// //     } catch (e) {
// //         console.error('Firestore 更新エラー:', e);
// //         store.dispatch('triggerSnackbarForGroup', {
// //             message: 'データの保存に失敗しました'
// //         });
// //     } finally {
// //         await new Promise(resolve => setTimeout(resolve, 200));
// //         isSaving = false;
// //     }
// // }
// //
// // function setupFirestoreListener(groupId, layerId) {
// //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// //     if (unsubscribeSnapshot) unsubscribeSnapshot();
// //
// //     unsubscribeSnapshot = firebase.firestore()
// //         .collection('groups')
// //         .doc(groupId)
// //         .collection('layers')
// //         .doc(layerId)
// //         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
// //             const wasSyncFailed = isSyncFailed;
// //
// //             if (!isSyncFailed && wasSyncFailed) {
// //                 store.dispatch('triggerSnackbarForGroup', {
// //                     message: '同期が復旧しました。操作を再開できます。'
// //                 });
// //                 console.log('Sync restored, isSyncFailed:', isSyncFailed);
// //             }
// //
// //             const data = doc.data();
// //             const modifiedBy = data?.lastModifiedBy;
// //             const myId = store.state.userId;
// //
// //             if (data && data.features) {
// //                 const features = data.features || [];
// //                 const currentIds = new Set(features.map(f => f.properties?.id));
// //                 const newIds = [...currentIds].filter(id => !previousIds.has(id));
// //                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
// //
// //                 if (!isInitializing && !justChangedGroup) {
// //                     if (newIds.length === 1) {
// //                         console.log('ポイント追加通知トリガー');
// //                         store.dispatch('triggerSnackbarForGroup', {
// //                             message: `🔴 ${newIds.length} 件のポイントが追加されました。`
// //                         });
// //                     } else if (deletedIds.length === 1) {
// //                         console.log('ポイント削除通知トリガー');
// //                         store.dispatch('triggerSnackbarForGroup', {
// //                             message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。`
// //                         });
// //                     }
// //                 } else {
// //                     console.log('通知スキップ: ', { isInitializing, justChangedGroup });
// //                 }
// //
// //                 previousIds = currentIds;
// //
// //                 groupGeojson.value.features = features;
// //                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// //                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// //                 store.commit('setCurrentGroupLayers', updatedLayers);
// //
// //                 const map01 = store.state.map01;
// //                 const source = map01.getSource('oh-point-source');
// //                 if (source) {
// //                     source.setData({ type: 'FeatureCollection', features });
// //                     map01.triggerRepaint();
// //                 }
// //             } else {
// //                 groupGeojson.value.features = [];
// //                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
// //                 const map01 = store.state.map01;
// //                 const source = map01.getSource('oh-point-source');
// //                 if (source) {
// //                     source.setData({ type: 'FeatureCollection', features: [] });
// //                     map01.triggerRepaint();
// //                 }
// //                 if (store.state.selectedLayerId === layerId) {
// //                     store.commit('setSelectedLayerId', null);
// //                     localStorage.removeItem('lastLayerId');
// //                 }
// //             }
// //         }, (error) => {
// //             console.error('Snapshot エラー:', error);
// //             isSyncFailed = true;
// //             store.dispatch('triggerSnackbarForGroup', {
// //                 message: 'リアルタイム同期に失敗しました。操作が制限されています。'
// //             });
// //             console.log('Snapshot error, isSyncFailed set to true');
// //         });
// // }
// //
// // function createMapClickHandler(map01) {
// //     return async (e) => {
// //         if (isSyncFailed) {
// //             store.dispatch('triggerSnackbarForGroup', {
// //                 message: 'ネットワークに接続されていません。ポイントを追加できません。'
// //             });
// //             return;
// //         }
// //
// //         try {
// //             if (!map01.getLayer('oh-point-layer')) {
// //                 console.warn('oh-point-layer が存在しません。処理をスキップします。');
// //                 return;
// //             }
// //         } catch (e) {
// //             console.log(e);
// //         }
// //
// //         const now = Date.now();
// //         if (now - lastClickTimestamp < 300) return;
// //         lastClickTimestamp = now;
// //
// //         const groupId = store.state.currentGroupId;
// //         const layerId = store.state.selectedLayerId;
// //         if (!groupId || !layerId) return;
// //
// //         const features = map01.queryRenderedFeatures(e.point, {
// //             layers: ['oh-point-layer', 'oh-point-label-layer']
// //         });
// //         if (features.length > 0 || !e.lngLat) return;
// //
// //         const { lng, lat } = e.lngLat;
// //         const newFeature = {
// //             type: 'Feature',
// //             geometry: { type: 'Point', coordinates: [lng, lat] },
// //             properties: {
// //                 id: uuidv4(),
// //                 createdAt: Date.now(),
// //                 createdBy: store.state.myNickname || '不明',
// //                 description: ''
// //             }
// //         };
// //
// //         const source = map01.getSource('oh-point-source');
// //         const currentFeatures = groupGeojson.value.features || [];
// //         const updatedFeatures = [...currentFeatures, newFeature];
// //
// //         groupGeojson.value.features = updatedFeatures;
// //
// //         if (source) {
// //             source.setData({ type: 'FeatureCollection', features: updatedFeatures });
// //             map01.triggerRepaint();
// //         }
// //
// //         if (!isInitializing) {
// //             await saveLayerToFirestore(groupId, layerId, updatedFeatures);
// //         }
// //
// //         store.commit('setSelectedPointFeature', newFeature);
// //         store.commit('setPointInfoDrawer', true);
// //     };
// // }
// //
// // export default function useGloupLayer() {
// //     let savedGroupId = localStorage.getItem('lastGroupId');
// //     let savedLayerId = localStorage.getItem('lastLayerId');
// //
// //     const initializeGroupAndLayer = async () => {
// //         setTimeout(() => {
// //             let selectedLayers = store.state.selectedLayers.map01;
// //             store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
// //             console.log(selectedLayers);
// //         }, 1500);
// //     };
// //
// //     initializeGroupAndLayer().catch(e => {
// //         console.error('初期化エラー:', e);
// //         store.dispatch('triggerSnackbarForGroup', {
// //             message: '初期化に失敗しました'
// //         });
// //     });
// //
// //     watch(
// //         () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
// //         async ([map01, groupId, layerId]) => {
// //             if (!map01 || !groupId || !layerId) {
// //                 if (unsubscribeSnapshot) {
// //                     unsubscribeSnapshot();
// //                     unsubscribeSnapshot = null;
// //                 }
// //                 if (pingIntervalId) {
// //                     clearInterval(pingIntervalId);
// //                     pingIntervalId = null;
// //                 }
// //                 if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
// //                 if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
// //                 store.commit('clearSelectedLayers', 'map01');
// //                 groupGeojson.value.features = [];
// //                 store.commit('setCurrentGroupLayers', []);
// //                 previousIds = new Set();
// //                 return;
// //             }
// //
// //             const initializeMap = async () => {
// //                 if (!map01.getSource('oh-point-source')) {
// //                     map01.addSource('oh-point-source', {
// //                         type: 'geojson',
// //                         data: { type: 'FeatureCollection', features: [] }
// //                     });
// //                 }
// //                 if (!map01.getLayer('oh-point-layer')) {
// //                     map01.addLayer({
// //                         ...ohPointLayer
// //                     });
// //                 }
// //
// //                 await fetchAndSetGeojson(groupId, map01, layerId);
// //                 setupFirestoreListener(groupId, layerId);
// //
// //                 if (mapClickHandler) map01.off('click', mapClickHandler);
// //                 mapClickHandler = createMapClickHandler(map01);
// //                 map01.on('click', mapClickHandler);
// //                 map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
// //                 map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
// //
// //                 let draggedFeatureId = null;
// //
// //                 map01.on('mousedown', 'oh-point-layer', (e) => {
// //                     if (!e.features.length) return;
// //                     if (isSyncFailed) {
// //                         store.dispatch('triggerSnackbarForGroup', {
// //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// //                         });
// //                         return;
// //                     }
// //                     map01.getCanvas().style.cursor = 'grabbing';
// //                     draggedFeatureId = e.features[0].properties.id;
// //                     map01.dragPan.disable();
// //                 });
// //
// //                 map01.on('mousemove', (e) => {
// //                     if (!draggedFeatureId) return;
// //                     if (isSyncFailed) {
// //                         store.dispatch('triggerSnackbarForGroup', {
// //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// //                         });
// //                         draggedFeatureId = null;
// //                         map01.getCanvas().style.cursor = '';
// //                         map01.dragPan.enable();
// //                         return;
// //                     }
// //
// //                     const features = groupGeojson.value.features.map(f => {
// //                         if (f.properties.id === draggedFeatureId) {
// //                             return {
// //                                 ...f,
// //                                 geometry: {
// //                                     ...f.geometry,
// //                                     coordinates: [e.lngLat.lng, e.lngLat.lat]
// //                                 }
// //                             };
// //                         }
// //                         return f;
// //                     });
// //
// //                     groupGeojson.value.features = features;
// //                     const source = map01.getSource('oh-point-source');
// //                     if (source) {
// //                         source.setData({ type: 'FeatureCollection', features });
// //                     }
// //                 });
// //
// //                 map01.on('mouseup', async () => {
// //                     if (draggedFeatureId) {
// //                         map01.getCanvas().style.cursor = '';
// //                         map01.dragPan.enable();
// //                         draggedFeatureId = null;
// //
// //                         const groupId = store.state.currentGroupId;
// //                         const layerId = store.state.selectedLayerId;
// //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// //                     }
// //                 });
// //
// //                 map01.on('touchstart', 'oh-point-layer', (e) => {
// //                     if (!e.features.length) return;
// //                     if (isSyncFailed) {
// //                         store.dispatch('triggerSnackbarForGroup', {
// //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// //                         });
// //                         return;
// //                     }
// //                     draggedFeatureId = e.features[0].properties.id;
// //                     map01.dragPan.disable();
// //                 });
// //
// //                 map01.on('touchmove', (e) => {
// //                     if (!draggedFeatureId || !e.points || e.points.length === 0) return;
// //                     if (isSyncFailed) {
// //                         store.dispatch('triggerSnackbarForGroup', {
// //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// //                         });
// //                         draggedFeatureId = null;
// //                         map01.dragPan.enable();
// //                         return;
// //                     }
// //
// //                     const touch = e.lngLat;
// //                     const features = groupGeojson.value.features.map(f => {
// //                         if (f.properties.id === draggedFeatureId) {
// //                             return {
// //                                 ...f,
// //                                 geometry: {
// //                                     ...f.geometry,
// //                                     coordinates: [touch.lng, touch.lat]
// //                                 }
// //                             };
// //                         }
// //                         return f;
// //                     });
// //
// //                     groupGeojson.value.features = features;
// //                     const source = map01.getSource('oh-point-source');
// //                     if (source) {
// //                         source.setData({ type: 'FeatureCollection', features });
// //                     }
// //                 });
// //
// //                 map01.on('touchend', async () => {
// //                     if (draggedFeatureId) {
// //                         map01.dragPan.enable();
// //                         draggedFeatureId = null;
// //
// //                         const groupId = store.state.currentGroupId;
// //                         const layerId = store.state.selectedLayerId;
// //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// //                     }
// //                 });
// //             };
// //
// //             if (map01.isStyleLoaded()) {
// //                 await initializeMap();
// //             } else {
// //                 map01.once('load', async () => await initializeMap());
// //             }
// //
// //             localStorage.setItem('lastGroupId', groupId);
// //             localStorage.setItem('lastLayerId', layerId);
// //
// //             justChangedGroup = false;
// //             isInitializing = false;
// //         },
// //         { immediate: true }
// //     );
// //
// //     watch(
// //         () => store.state.selectedLayers.map01,
// //         async (selectedLayers) => {
// //             const map = store.state.map01;
// //             const groupId = store.state.currentGroupId;
// //             const layerId = store.state.selectedLayerId;
// //             if (!map || !groupId || !layerId) return;
// //
// //             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
// //             if (hasGroupLayer && !isInitializing) {
// //                 await fetchAndSetGeojson(groupId, map, layerId);
// //                 previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
// //             }
// //         },
// //         { deep: true }
// //     );
// //
// //     window.addEventListener('unload', () => {
// //         if (pingIntervalId) {
// //             clearInterval(pingIntervalId);
// //             pingIntervalId = null;
// //         }
// //     });
// // }
// //
// // // import store from '@/store';
// // // import maplibregl from 'maplibre-gl';
// // // import { db } from '@/firebase';
// // // import { watch } from 'vue';
// // // import { groupGeojson, ohPointLayer } from '@/js/layers';
// // // import { popups } from '@/js/popup';
// // // import { v4 as uuidv4 } from 'uuid';
// // // import firebase from 'firebase/app';
// // // import 'firebase/firestore';
// // //
// // // let unsubscribeSnapshot = null;
// // // let lastClickTimestamp = 0;
// // // let previousIds = new Set();
// // // let mapClickHandler = null;
// // // let isInitializing = false;
// // // let justChangedGroup = false;
// // // let isSaving = false;
// // // let isSyncFailed = !navigator.onLine; // 初期状態でオフライン確認
// // // let pingIntervalId = null; // ピングのインターバルID
// // //
// // // // サーバーピング関数（即時状態更新とデバッグログ追加）
// // // async function pingServer(source = 'interval') {
// // //     try {
// // //         // Firestore の軽量読み取りでサーバー接続を確認
// // //         await firebase.firestore().collection('ping').doc('status').get();
// // //         console.log(`Ping success (${source})`);
// // //         if (isSyncFailed) {
// // //             isSyncFailed = false;
// // //             store.dispatch('triggerSnackbarForGroup', {
// // //                 message: 'サーバーに接続できました。操作を再開できます。'
// // //             });
// // //         }
// // //     } catch (error) {
// // //         console.log(`Ping failed (${source}):`, error.message);
// // //         if (!isSyncFailed) {
// // //             isSyncFailed = true;
// // //             store.dispatch('triggerSnackbarForGroup', {
// // //                 message: 'サーバーに接続できません。操作が制限されています。'
// // //             });
// // //         }
// // //     }
// // //     return !isSyncFailed; // 現在の接続状態を返す
// // // }
// // //
// // // // ネットワーク状態の監視と即時ピンング
// // // window.addEventListener('online', async () => {
// // //     console.log('Network online event triggered');
// // //     const wasConnected = await pingServer('online event');
// // //     if (wasConnected) {
// // //         console.log('Operation restriction lifted after online event');
// // //     }
// // // });
// // //
// // // window.addEventListener('offline', () => {
// // //     console.log('Network offline event triggered');
// // //     isSyncFailed = true;
// // //     store.dispatch('triggerSnackbarForGroup', {
// // //         message: 'ネットワークが切断されました。操作が制限されています。'
// // //     });
// // // });
// // //
// // // // 定期的なサーバーピングを開始（初回は即時実行）
// // // pingServer('initial');
// // // pingIntervalId = setInterval(() => pingServer('interval'), 30000); // 30秒ごとにピング
// // //
// // // // 地物クリック時のハンドラー（ドロワー制御を追加）
// // // function createPointClickHandler(map01) {
// // //     return (e) => {
// // //         if (isSyncFailed) {
// // //             store.dispatch('triggerSnackbarForGroup', {
// // //                 message: 'ネットワークに接続されていません。詳細を表示できません。'
// // //             });
// // //             return;
// // //         }
// // //
// // //         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
// // //         if (features.length > 0) {
// // //             const clickedFeature = features[0];
// // //             const featureData = {
// // //                 type: clickedFeature.type,
// // //                 geometry: clickedFeature.geometry,
// // //                 properties: clickedFeature.properties
// // //             };
// // //             console.log('設定する地物データ:', featureData);
// // //             store.commit('setSelectedPointFeature', featureData);
// // //             store.commit('setPointInfoDrawer', true);
// // //         }
// // //     };
// // // }
// // //
// // // async function fetchAndSetGeojson(groupId, map, layerId) {
// // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
// // //     const data = doc.data();
// // //
// // //     if (data && data.features) {
// // //         const newFeatures = data.features;
// // //         groupGeojson.value.features = newFeatures;
// // //
// // //         const source = map.getSource('oh-point-source');
// // //         if (source) {
// // //             source.setData({ type: 'FeatureCollection', features: newFeatures });
// // //             map.triggerRepaint();
// // //         }
// // //
// // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures });
// // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // //
// // //         const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
// // //         if (!existing) {
// // //             store.commit('addSelectedLayer', {
// // //                 map: 'map01',
// // //                 layer: {
// // //                     id: 'oh-point-layer',
// // //                     label: `Layer_${layerId}`,
// // //                     sources: [{
// // //                         id: 'oh-point-source',
// // //                         obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
// // //                     }],
// // //                     layers: [{
// // //                         id: 'oh-point-layer',
// // //                         type: 'circle',
// // //                         source: 'oh-point-source',
// // //                         paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
// // //                     }],
// // //                     opacity: 1,
// // //                     visibility: true,
// // //                     attribution: '',
// // //                     layerid: layerId
// // //                 }
// // //             });
// // //             store.dispatch('triggerSnackbarForGroup', {
// // //                 message: `レイヤー "Layer_${layerId}" を追加しました`
// // //             });
// // //         }
// // //     } else {
// // //         groupGeojson.value.features = [];
// // //         store.commit('setCurrentGroupLayers', []);
// // //     }
// // // }
// // //
// // // export function deleteAllPoints(currentGroupId) {
// // //     if (isSyncFailed) {
// // //         store.dispatch('triggerSnackbarForGroup', {
// // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // //         });
// // //         return;
// // //     }
// // //
// // //     groupGeojson.value.features = [];
// // //     const map = store.state.map01;
// // //     if (map && map.getSource('oh-point-source')) {
// // //         map.getSource('oh-point-source').setData({
// // //             type: 'FeatureCollection',
// // //             features: []
// // //         });
// // //         map.triggerRepaint();
// // //     }
// // //     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
// // //     store.dispatch('triggerSnackbarForGroup', {
// // //         message: 'すべてのポイントを削除しました'
// // //     });
// // // }
// // //
// // // function handleMapClick(e, currentGroupId) {
// // //     const map = store.state.map01;
// // //     const layerId = store.state.selectedLayerId;
// // //
// // //     // point-remove クラスが含まれていない場合は処理をスキップ
// // //     if (!(e.target && e.target.classList.contains('point-remove'))) return;
// // //
// // //     // オフライン時は削除をブロック
// // //     if (isSyncFailed) {
// // //         store.dispatch('triggerSnackbarForGroup', {
// // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // //         });
// // //         return;
// // //     }
// // //
// // //     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
// // //     if (idsToDelete.size === 0) return;
// // //
// // //     groupGeojson.value.features = groupGeojson.value.features.filter(
// // //         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
// // //     );
// // //
// // //     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
// // //     map.triggerRepaint();
// // //     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);
// // //
// // //     popups.forEach(popup => popup.remove());
// // //     popups.length = 0;
// // //
// // //     store.dispatch('triggerSnackbarForGroup', {
// // //         message: `${idsToDelete.size} 件のポイントを削除しました`
// // //     });
// // // }
// // //
// // // async function saveLayerToFirestore(groupId, layerId, features) {
// // //     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
// // //     isSaving = true;
// // //     try {
// // //         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId);
// // //         const doc = await docRef.get();
// // //         if (!doc.exists) return;
// // //
// // //         await docRef.set({
// // //             features: features,
// // //             groupId: groupId,
// // //             lastModifiedBy: store.state.userId,
// // //             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
// // //         }, { merge: true });
// // //
// // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // //         groupGeojson.value.features = features;
// // //     } catch (e) {
// // //         console.error('Firestore 更新エラー:', e);
// // //         store.dispatch('triggerSnackbarForGroup', {
// // //             message: 'データの保存に失敗しました'
// // //         });
// // //     } finally {
// // //         await new Promise(resolve => setTimeout(resolve, 200));
// // //         isSaving = false;
// // //     }
// // // }
// // //
// // // function setupFirestoreListener(groupId, layerId) {
// // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // //     if (unsubscribeSnapshot) unsubscribeSnapshot();
// // //
// // //     unsubscribeSnapshot = firebase.firestore()
// // //         .collection('groups')
// // //         .doc(groupId)
// // //         .collection('layers')
// // //         .doc(layerId)
// // //         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
// // //             const wasSyncFailed = isSyncFailed;
// // //             // isSyncFailed はピングで管理するため、ここでは更新しない
// // //
// // //             if (!isSyncFailed && wasSyncFailed) {
// // //                 store.dispatch('triggerSnackbarForGroup', {
// // //                     message: '同期が復旧しました。操作を再開できます。'
// // //                 });
// // //             }
// // //
// // //             const data = doc.data();
// // //             const modifiedBy = data?.lastModifiedBy;
// // //             const myId = store.state.userId;
// // //
// // //             if (data && data.features) {
// // //                 const features = data.features || [];
// // //                 const currentIds = new Set(features.map(f => f.properties?.id));
// // //                 const newIds = [...currentIds].filter(id => !previousIds.has(id));
// // //                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
// // //
// // //                 if (!isInitializing && !justChangedGroup) {
// // //                     if (newIds.length === 1) {
// // //                         console.log('ポイント追加通知トリガー');
// // //                         store.dispatch('triggerSnackbarForGroup', {
// // //                             message: `🔴 ${newIds.length} 件のポイントが追加されました。`
// // //                         });
// // //                     } else if (deletedIds.length === 1) {
// // //                         console.log('ポイント削除通知トリガー');
// // //                         store.dispatch('triggerSnackbarForGroup', {
// // //                             message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。`
// // //                         });
// // //                     }
// // //                 } else {
// // //                     console.log('通知スキップ: ', { isInitializing, justChangedGroup });
// // //                 }
// // //
// // //                 previousIds = currentIds;
// // //
// // //                 groupGeojson.value.features = features;
// // //                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // //                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // //                 store.commit('setCurrentGroupLayers', updatedLayers);
// // //
// // //                 const map01 = store.state.map01;
// // //                 const source = map01.getSource('oh-point-source');
// // //                 if (source) {
// // //                     source.setData({ type: 'FeatureCollection', features });
// // //                     map01.triggerRepaint();
// // //                 }
// // //             } else {
// // //                 groupGeojson.value.features = [];
// // //                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
// // //                 const map01 = store.state.map01;
// // //                 const source = map01.getSource('oh-point-source');
// // //                 if (source) {
// // //                     source.setData({ type: 'FeatureCollection', features: [] });
// // //                     map01.triggerRepaint();
// // //                 }
// // //                 if (store.state.selectedLayerId === layerId) {
// // //                     store.commit('setSelectedLayerId', null);
// // //                     localStorage.removeItem('lastLayerId');
// // //                 }
// // //             }
// // //         }, (error) => {
// // //             console.error('Snapshot エラー:', error);
// // //             isSyncFailed = true;
// // //             store.dispatch('triggerSnackbarForGroup', {
// // //                 message: 'リアルタイム同期に失敗しました。操作が制限されています。'
// // //             });
// // //         });
// // // }
// // //
// // // function createMapClickHandler(map01) {
// // //     return async (e) => {
// // //         if (isSyncFailed) {
// // //             store.dispatch('triggerSnackbarForGroup', {
// // //                 message: 'ネットワークに接続されていません。ポイントを追加できません。'
// // //             });
// // //             return;
// // //         }
// // //
// // //         try {
// // //             if (!map01.getLayer('oh-point-layer')) {
// // //                 console.warn('oh-point-layer が存在しません。処理をスキップします。');
// // //                 return;
// // //             }
// // //         } catch (e) {
// // //             console.log(e);
// // //         }
// // //
// // //         const now = Date.now();
// // //         if (now - lastClickTimestamp < 300) return;
// // //         lastClickTimestamp = now;
// // //
// // //         const groupId = store.state.currentGroupId;
// // //         const layerId = store.state.selectedLayerId;
// // //         if (!groupId || !layerId) return;
// // //
// // //         const features = map01.queryRenderedFeatures(e.point, {
// // //             layers: ['oh-point-layer', 'oh-point-label-layer']
// // //         });
// // //         if (features.length > 0 || !e.lngLat) return;
// // //
// // //         const { lng, lat } = e.lngLat;
// // //         const newFeature = {
// // //             type: 'Feature',
// // //             geometry: { type: 'Point', coordinates: [lng, lat] },
// // //             properties: {
// // //                 id: uuidv4(),
// // //                 createdAt: Date.now(),
// // //                 createdBy: store.state.myNickname || '不明',
// // //                 description: ''
// // //             }
// // //         };
// // //
// // //         const source = map01.getSource('oh-point-source');
// // //         const currentFeatures = groupGeojson.value.features || [];
// // //         const updatedFeatures = [...currentFeatures, newFeature];
// // //
// // //         groupGeojson.value.features = updatedFeatures;
// // //
// // //         if (source) {
// // //             source.setData({ type: 'FeatureCollection', features: updatedFeatures });
// // //             map01.triggerRepaint();
// // //         }
// // //
// // //         if (!isInitializing) {
// // //             await saveLayerToFirestore(groupId, layerId, updatedFeatures);
// // //         }
// // //
// // //         store.commit('setSelectedPointFeature', newFeature);
// // //         store.commit('setPointInfoDrawer', true);
// // //     };
// // // }
// // //
// // // export default function useGloupLayer() {
// // //     let savedGroupId = localStorage.getItem('lastGroupId');
// // //     let savedLayerId = localStorage.getItem('lastLayerId');
// // //
// // //     const initializeGroupAndLayer = async () => {
// // //         setTimeout(() => {
// // //             let selectedLayers = store.state.selectedLayers.map01;
// // //             store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
// // //             console.log(selectedLayers);
// // //         }, 1500);
// // //     };
// // //
// // //     initializeGroupAndLayer().catch(e => {
// // //         console.error('初期化エラー:', e);
// // //         store.dispatch('triggerSnackbarForGroup', {
// // //             message: '初期化に失敗しました'
// // //         });
// // //     });
// // //
// // //     watch(
// // //         () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
// // //         async ([map01, groupId, layerId]) => {
// // //             if (!map01 || !groupId || !layerId) {
// // //                 if (unsubscribeSnapshot) {
// // //                     unsubscribeSnapshot();
// // //                     unsubscribeSnapshot = null;
// // //                 }
// // //                 if (pingIntervalId) {
// // //                     clearInterval(pingIntervalId); // ピングを停止
// // //                     pingIntervalId = null;
// // //                 }
// // //                 if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
// // //                 if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
// // //                 store.commit('clearSelectedLayers', 'map01');
// // //                 groupGeojson.value.features = [];
// // //                 store.commit('setCurrentGroupLayers', []);
// // //                 previousIds = new Set();
// // //                 return;
// // //             }
// // //
// // //             const initializeMap = async () => {
// // //                 if (!map01.getSource('oh-point-source')) {
// // //                     map01.addSource('oh-point-source', {
// // //                         type: 'geojson',
// // //                         data: { type: 'FeatureCollection', features: [] }
// // //                     });
// // //                 }
// // //                 if (!map01.getLayer('oh-point-layer')) {
// // //                     map01.addLayer({
// // //                         ...ohPointLayer
// // //                     });
// // //                 }
// // //
// // //                 await fetchAndSetGeojson(groupId, map01, layerId);
// // //                 setupFirestoreListener(groupId, layerId);
// // //
// // //                 if (mapClickHandler) map01.off('click', mapClickHandler);
// // //                 mapClickHandler = createMapClickHandler(map01);
// // //                 map01.on('click', mapClickHandler);
// // //                 map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
// // //                 map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
// // //
// // //                 let draggedFeatureId = null;
// // //
// // //                 // PC用マウスドラッグ移動
// // //                 map01.on('mousedown', 'oh-point-layer', (e) => {
// // //                     if (!e.features.length) return;
// // //                     if (isSyncFailed) {
// // //                         store.dispatch('triggerSnackbarForGroup', {
// // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // //                         });
// // //                         return;
// // //                     }
// // //                     map01.getCanvas().style.cursor = 'grabbing';
// // //                     draggedFeatureId = e.features[0].properties.id;
// // //                     map01.dragPan.disable();
// // //                 });
// // //
// // //                 map01.on('mousemove', (e) => {
// // //                     if (!draggedFeatureId) return;
// // //                     if (isSyncFailed) {
// // //                         store.dispatch('triggerSnackbarForGroup', {
// // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // //                         });
// // //                         draggedFeatureId = null;
// // //                         map01.getCanvas().style.cursor = '';
// // //                         map01.dragPan.enable();
// // //                         return;
// // //                     }
// // //
// // //                     const features = groupGeojson.value.features.map(f => {
// // //                         if (f.properties.id === draggedFeatureId) {
// // //                             return {
// // //                                 ...f,
// // //                                 geometry: {
// // //                                     ...f.geometry,
// // //                                     coordinates: [e.lngLat.lng, e.lngLat.lat]
// // //                                 }
// // //                             };
// // //                         }
// // //                         return f;
// // //                     });
// // //
// // //                     groupGeojson.value.features = features;
// // //                     const source = map01.getSource('oh-point-source');
// // //                     if (source) {
// // //                         source.setData({ type: 'FeatureCollection', features });
// // //                     }
// // //                 });
// // //
// // //                 map01.on('mouseup', async () => {
// // //                     if (draggedFeatureId) {
// // //                         map01.getCanvas().style.cursor = '';
// // //                         map01.dragPan.enable();
// // //                         draggedFeatureId = null;
// // //
// // //                         const groupId = store.state.currentGroupId;
// // //                         const layerId = store.state.selectedLayerId;
// // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // //                     }
// // //                 });
// // //
// // //                 // スマホ用タッチ移動
// // //                 map01.on('touchstart', 'oh-point-layer', (e) => {
// // //                     if (!e.features.length) return;
// // //                     if (isSyncFailed) {
// // //                         store.dispatch('triggerSnackbarForGroup', {
// // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // //                         });
// // //                         return;
// // //                     }
// // //                     draggedFeatureId = e.features[0].properties.id;
// // //                     map01.dragPan.disable();
// // //                 });
// // //
// // //                 map01.on('touchmove', (e) => {
// // //                     if (!draggedFeatureId || !e.points || e.points.length === 0) return;
// // //                     if (isSyncFailed) {
// // //                         store.dispatch('triggerSnackbarForGroup', {
// // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // //                         });
// // //                         draggedFeatureId = null;
// // //                         map01.dragPan.enable();
// // //                         return;
// // //                     }
// // //
// // //                     const touch = e.lngLat;
// // //                     const features = groupGeojson.value.features.map(f => {
// // //                         if (f.properties.id === draggedFeatureId) {
// // //                             return {
// // //                                 ...f,
// // //                                 geometry: {
// // //                                     ...f.geometry,
// // //                                     coordinates: [touch.lng, touch.lat]
// // //                                 }
// // //                             };
// // //                         }
// // //                         return f;
// // //                     });
// // //
// // //                     groupGeojson.value.features = features;
// // //                     const source = map01.getSource('oh-point-source');
// // //                     if (source) {
// // //                         source.setData({ type: 'FeatureCollection', features });
// // //                     }
// // //                 });
// // //
// // //                 map01.on('touchend', async () => {
// // //                     if (draggedFeatureId) {
// // //                         map01.dragPan.enable();
// // //                         draggedFeatureId = null;
// // //
// // //                         const groupId = store.state.currentGroupId;
// // //                         const layerId = store.state.selectedLayerId;
// // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // //                     }
// // //                 });
// // //             };
// // //
// // //             if (map01.isStyleLoaded()) {
// // //                 await initializeMap();
// // //             } else {
// // //                 map01.once('load', async () => await initializeMap());
// // //             }
// // //
// // //             localStorage.setItem('lastGroupId', groupId);
// // //             localStorage.setItem('lastLayerId', layerId);
// // //
// // //             justChangedGroup = false;
// // //             isInitializing = false;
// // //         },
// // //         { immediate: true }
// // //     );
// // //
// // //     watch(
// // //         () => store.state.selectedLayers.map01,
// // //         async (selectedLayers) => {
// // //             const map = store.state.map01;
// // //             const groupId = store.state.currentGroupId;
// // //             const layerId = store.state.selectedLayerId;
// // //             if (!map || !groupId || !layerId) return;
// // //
// // //             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
// // //             if (hasGroupLayer && !isInitializing) {
// // //                 await fetchAndSetGeojson(groupId, map, layerId);
// // //                 previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
// // //             }
// // //         },
// // //         { deep: true }
// // //     );
// // //
// // //     // クリーンアップ（ページ離脱時などにピングを停止）
// // //     window.addEventListener('unload', () => {
// // //         if (pingIntervalId) {
// // //             clearInterval(pingIntervalId);
// // //             pingIntervalId = null;
// // //         }
// // //     });
// // // }
// // //
// // // // import store from '@/store';
// // // // import maplibregl from 'maplibre-gl';
// // // // import { db } from '@/firebase';
// // // // import { watch } from 'vue';
// // // // import { groupGeojson, ohPointLayer } from '@/js/layers';
// // // // import { popups } from '@/js/popup';
// // // // import { v4 as uuidv4 } from 'uuid';
// // // // import firebase from 'firebase/app';
// // // // import 'firebase/firestore';
// // // //
// // // // let unsubscribeSnapshot = null;
// // // // let lastClickTimestamp = 0;
// // // // let previousIds = new Set();
// // // // let mapClickHandler = null;
// // // // let isInitializing = false;
// // // // let justChangedGroup = false;
// // // // let isSaving = false;
// // // // let isSyncFailed = !navigator.onLine; // 初期状態でオフライン確認
// // // // let pingIntervalId = null; // ピングのインターバルID
// // // //
// // // // // サーバーピング関数（即時状態更新とデバッグログ追加）
// // // // async function pingServer(source = 'interval') {
// // // //     try {
// // // //         // Firestore の軽量読み取りでサーバー接続を確認
// // // //         await firebase.firestore().collection('ping').doc('status').get();
// // // //         console.log(`Ping success (${source})`);
// // // //         if (isSyncFailed) {
// // // //             isSyncFailed = false;
// // // //             store.dispatch('triggerSnackbarForGroup', {
// // // //                 message: 'サーバーに接続できました。操作を再開できます。'
// // // //             });
// // // //         }
// // // //     } catch (error) {
// // // //         console.log(`Ping failed (${source}):`, error.message);
// // // //         if (!isSyncFailed) {
// // // //             isSyncFailed = true;
// // // //             store.dispatch('triggerSnackbarForGroup', {
// // // //                 message: 'サーバーに接続できません。操作が制限されています。'
// // // //             });
// // // //         }
// // // //     }
// // // //     return !isSyncFailed; // 現在の接続状態を返す
// // // // }
// // // //
// // // // // ネットワーク状態の監視と即時ピンング
// // // // window.addEventListener('online', async () => {
// // // //     console.log('Network online event triggered');
// // // //     const wasConnected = await pingServer('online event');
// // // //     if (wasConnected) {
// // // //         console.log('Operation restriction lifted after online event');
// // // //     }
// // // // });
// // // //
// // // // window.addEventListener('offline', () => {
// // // //     console.log('Network offline event triggered');
// // // //     isSyncFailed = true;
// // // //     store.dispatch('triggerSnackbarForGroup', {
// // // //         message: 'ネットワークが切断されました。操作が制限されています。'
// // // //     });
// // // // });
// // // //
// // // // // 定期的なサーバーピングを開始（初回は即時実行）
// // // // pingServer('initial');
// // // // pingIntervalId = setInterval(() => pingServer('interval'), 30000); // 30秒ごとにピング
// // // //
// // // // // 地物クリック時のハンドラー（ドロワー制御を追加）
// // // // function createPointClickHandler(map01) {
// // // //     return (e) => {
// // // //         if (isSyncFailed) {
// // // //             store.dispatch('triggerSnackbarForGroup', {
// // // //                 message: 'ネットワークに接続されていません。詳細を表示できません。'
// // // //             });
// // // //             return;
// // // //         }
// // // //
// // // //         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
// // // //         if (features.length > 0) {
// // // //             const clickedFeature = features[0];
// // // //             const featureData = {
// // // //                 type: clickedFeature.type,
// // // //                 geometry: clickedFeature.geometry,
// // // //                 properties: clickedFeature.properties
// // // //             };
// // // //             console.log('設定する地物データ:', featureData);
// // // //             store.commit('setSelectedPointFeature', featureData);
// // // //             store.commit('setPointInfoDrawer', true);
// // // //         }
// // // //     };
// // // // }
// // // //
// // // // async function fetchAndSetGeojson(groupId, map, layerId) {
// // // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // // //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
// // // //     const data = doc.data();
// // // //
// // // //     if (data && data.features) {
// // // //         const newFeatures = data.features;
// // // //         groupGeojson.value.features = newFeatures;
// // // //
// // // //         const source = map.getSource('oh-point-source');
// // // //         if (source) {
// // // //             source.setData({ type: 'FeatureCollection', features: newFeatures });
// // // //             map.triggerRepaint();
// // // //         }
// // // //
// // // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures });
// // // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // // //
// // // //         const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
// // // //         if (!existing) {
// // // //             store.commit('addSelectedLayer', {
// // // //                 map: 'map01',
// // // //                 layer: {
// // // //                     id: 'oh-point-layer',
// // // //                     label: `Layer_${layerId}`,
// // // //                     sources: [{
// // // //                         id: 'oh-point-source',
// // // //                         obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
// // // //                     }],
// // // //                     layers: [{
// // // //                         id: 'oh-point-layer',
// // // //                         type: 'circle',
// // // //                         source: 'oh-point-source',
// // // //                         paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
// // // //                     }],
// // // //                     opacity: 1,
// // // //                     visibility: true,
// // // //                     attribution: '',
// // // //                     layerid: layerId
// // // //                 }
// // // //             });
// // // //             store.dispatch('triggerSnackbarForGroup', {
// // // //                 message: `レイヤー "Layer_${layerId}" を追加しました`
// // // //             });
// // // //         }
// // // //     } else {
// // // //         groupGeojson.value.features = [];
// // // //         store.commit('setCurrentGroupLayers', []);
// // // //     }
// // // // }
// // // //
// // // // export function deleteAllPoints(currentGroupId) {
// // // //     if (isSyncFailed) {
// // // //         store.dispatch('triggerSnackbarForGroup', {
// // // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // // //         });
// // // //         return;
// // // //     }
// // // //
// // // //     groupGeojson.value.features = [];
// // // //     const map = store.state.map01;
// // // //     if (map && map.getSource('oh-point-source')) {
// // // //         map.getSource('oh-point-source').setData({
// // // //             type: 'FeatureCollection',
// // // //             features: []
// // // //         });
// // // //         map.triggerRepaint();
// // // //     }
// // // //     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
// // // //     store.dispatch('triggerSnackbarForGroup', {
// // // //         message: 'すべてのポイントを削除しました'
// // // //     });
// // // // }
// // // //
// // // // function handleMapClick(e, currentGroupId) {
// // // //     const map = store.state.map01;
// // // //     const layerId = store.state.selectedLayerId;
// // // //
// // // //     // point-remove クラスが含まれていない場合は処理をスキップ
// // // //     if (!(e.target && e.target.classList.contains('point-remove'))) return;
// // // //
// // // //     // オフライン時は削除をブロック
// // // //     if (isSyncFailed) {
// // // //         store.dispatch('triggerSnackbarForGroup', {
// // // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // // //         });
// // // //         return;
// // // //     }
// // // //
// // // //     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
// // // //     if (idsToDelete.size === 0) return;
// // // //
// // // //     groupGeojson.value.features = groupGeojson.value.features.filter(
// // // //         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
// // // //     );
// // // //
// // // //     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
// // // //     map.triggerRepaint();
// // // //     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);
// // // //
// // // //     popups.forEach(popup => popup.remove());
// // // //     popups.length = 0;
// // // //
// // // //     store.dispatch('triggerSnackbarForGroup', {
// // // //         message: `${idsToDelete.size} 件のポイントを削除しました`
// // // //     });
// // // // }
// // // //
// // // // async function saveLayerToFirestore(groupId, layerId, features) {
// // // //     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
// // // //     isSaving = true;
// // // //     try {
// // // //         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId);
// // // //         const doc = await docRef.get();
// // // //         if (!doc.exists) return;
// // // //
// // // //         await docRef.set({
// // // //             features: features,
// // // //             groupId: groupId,
// // // //             lastModifiedBy: store.state.userId,
// // // //             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
// // // //         }, { merge: true });
// // // //
// // // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // // //         groupGeojson.value.features = features;
// // // //     } catch (e) {
// // // //         console.error('Firestore 更新エラー:', e);
// // // //         store.dispatch('triggerSnackbarForGroup', {
// // // //             message: 'データの保存に失敗しました'
// // // //         });
// // // //     } finally {
// // // //         await new Promise(resolve => setTimeout(resolve, 200));
// // // //         isSaving = false;
// // // //     }
// // // // }
// // // //
// // // // function setupFirestoreListener(groupId, layerId) {
// // // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // // //     if (unsubscribeSnapshot) unsubscribeSnapshot();
// // // //
// // // //     unsubscribeSnapshot = firebase.firestore()
// // // //         .collection('groups')
// // // //         .doc(groupId)
// // // //         .collection('layers')
// // // //         .doc(layerId)
// // // //         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
// // // //             const wasSyncFailed = isSyncFailed;
// // // //             // isSyncFailed はピングで管理するため、ここでは更新しない
// // // //
// // // //             if (!isSyncFailed && wasSyncFailed) {
// // // //                 store.dispatch('triggerSnackbarForGroup', {
// // // //                     message: '同期が復旧しました。操作を再開できます。'
// // // //                 });
// // // //             }
// // // //
// // // //             const data = doc.data();
// // // //             const modifiedBy = data?.lastModifiedBy;
// // // //             const myId = store.state.userId;
// // // //
// // // //             if (data && data.features) {
// // // //                 const features = data.features || [];
// // // //                 const currentIds = new Set(features.map(f => f.properties?.id));
// // // //                 const newIds = [...currentIds].filter(id => !previousIds.has(id));
// // // //                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
// // // //
// // // //                 if (!isInitializing && !justChangedGroup) {
// // // //                     if (newIds.length === 1) {
// // // //                         console.log('ポイント追加通知トリガー');
// // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // //                             message: `🔴 ${newIds.length} 件のポイントが追加されました。`
// // // //                         });
// // // //                     } else if (deletedIds.length === 1) {
// // // //                         console.log('ポイント削除通知トリガー');
// // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // //                             message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。`
// // // //                         });
// // // //                     }
// // // //                 } else {
// // // //                     console.log('通知スキップ: ', { isInitializing, justChangedGroup });
// // // //                 }
// // // //
// // // //                 previousIds = currentIds;
// // // //
// // // //                 groupGeojson.value.features = features;
// // // //                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // //                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // // //                 store.commit('setCurrentGroupLayers', updatedLayers);
// // // //
// // // //                 const map01 = store.state.map01;
// // // //                 const source = map01.getSource('oh-point-source');
// // // //                 if (source) {
// // // //                     source.setData({ type: 'FeatureCollection', features });
// // // //                     map01.triggerRepaint();
// // // //                 }
// // // //             } else {
// // // //                 groupGeojson.value.features = [];
// // // //                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
// // // //                 const map01 = store.state.map01;
// // // //                 const source = map01.getSource('oh-point-source');
// // // //                 if (source) {
// // // //                     source.setData({ type: 'FeatureCollection', features: [] });
// // // //                     map01.triggerRepaint();
// // // //                 }
// // // //                 if (store.state.selectedLayerId === layerId) {
// // // //                     store.commit('setSelectedLayerId', null);
// // // //                     localStorage.removeItem('lastLayerId');
// // // //                 }
// // // //             }
// // // //         }, (error) => {
// // // //             console.error('Snapshot エラー:', error);
// // // //             isSyncFailed = true;
// // // //             store.dispatch('triggerSnackbarForGroup', {
// // // //                 message: 'リアルタイム同期に失敗しました。操作が制限されています。'
// // // //             });
// // // //         });
// // // // }
// // // //
// // // // function createMapClickHandler(map01) {
// // // //     return async (e) => {
// // // //         if (isSyncFailed) {
// // // //             store.dispatch('triggerSnackbarForGroup', {
// // // //                 message: 'ネットワークに接続されていません。ポイントを追加できません。'
// // // //             });
// // // //             return;
// // // //         }
// // // //
// // // //         try {
// // // //             if (!map01.getLayer('oh-point-layer')) {
// // // //                 console.warn('oh-point-layer が存在しません。処理をスキップします。');
// // // //                 return;
// // // //             }
// // // //         } catch (e) {
// // // //             console.log(e);
// // // //         }
// // // //
// // // //         const now = Date.now();
// // // //         if (now - lastClickTimestamp < 300) return;
// // // //         lastClickTimestamp = now;
// // // //
// // // //         const groupId = store.state.currentGroupId;
// // // //         const layerId = store.state.selectedLayerId;
// // // //         if (!groupId || !layerId) return;
// // // //
// // // //         const features = map01.queryRenderedFeatures(e.point, {
// // // //             layers: ['oh-point-layer', 'oh-point-label-layer']
// // // //         });
// // // //         if (features.length > 0 || !e.lngLat) return;
// // // //
// // // //         const { lng, lat } = e.lngLat;
// // // //         const newFeature = {
// // // //             type: 'Feature',
// // // //             geometry: { type: 'Point', coordinates: [lng, lat] },
// // // //             properties: {
// // // //                 id: uuidv4(),
// // // //                 createdAt: Date.now(),
// // // //                 createdBy: store.state.myNickname || '不明',
// // // //                 description: ''
// // // //             }
// // // //         };
// // // //
// // // //         const source = map01.getSource('oh-point-source');
// // // //         const currentFeatures = groupGeojson.value.features || [];
// // // //         const updatedFeatures = [...currentFeatures, newFeature];
// // // //
// // // //         groupGeojson.value.features = updatedFeatures;
// // // //
// // // //         if (source) {
// // // //             source.setData({ type: 'FeatureCollection', features: updatedFeatures });
// // // //             map01.triggerRepaint();
// // // //         }
// // // //
// // // //         if (!isInitializing) {
// // // //             await saveLayerToFirestore(groupId, layerId, updatedFeatures);
// // // //         }
// // // //
// // // //         store.commit('setSelectedPointFeature', newFeature);
// // // //         store.commit('setPointInfoDrawer', true);
// // // //     };
// // // // }
// // // //
// // // // export default function useGloupLayer() {
// // // //     let savedGroupId = localStorage.getItem('lastGroupId');
// // // //     let savedLayerId = localStorage.getItem('lastLayerId');
// // // //
// // // //     const initializeGroupAndLayer = async () => {
// // // //         setTimeout(() => {
// // // //             let selectedLayers = store.state.selectedLayers.map01;
// // // //             store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
// // // //             console.log(selectedLayers);
// // // //         }, 1500);
// // // //     };
// // // //
// // // //     initializeGroupAndLayer().catch(e => {
// // // //         console.error('初期化エラー:', e);
// // // //         store.dispatch('triggerSnackbarForGroup', {
// // // //             message: '初期化に失敗しました'
// // // //         });
// // // //     });
// // // //
// // // //     watch(
// // // //         () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
// // // //         async ([map01, groupId, layerId]) => {
// // // //             if (!map01 || !groupId || !layerId) {
// // // //                 if (unsubscribeSnapshot) {
// // // //                     unsubscribeSnapshot();
// // // //                     unsubscribeSnapshot = null;
// // // //                 }
// // // //                 if (pingIntervalId) {
// // // //                     clearInterval(pingIntervalId); // ピングを停止
// // // //                     pingIntervalId = null;
// // // //                 }
// // // //                 if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
// // // //                 if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
// // // //                 store.commit('clearSelectedLayers', 'map01');
// // // //                 groupGeojson.value.features = [];
// // // //                 store.commit('setCurrentGroupLayers', []);
// // // //                 previousIds = new Set();
// // // //                 return;
// // // //             }
// // // //
// // // //             const initializeMap = async () => {
// // // //                 if (!map01.getSource('oh-point-source')) {
// // // //                     map01.addSource('oh-point-source', {
// // // //                         type: 'geojson',
// // // //                         data: { type: 'FeatureCollection', features: [] }
// // // //                     });
// // // //                 }
// // // //                 if (!map01.getLayer('oh-point-layer')) {
// // // //                     map01.addLayer({
// // // //                         ...ohPointLayer
// // // //                     });
// // // //                 }
// // // //
// // // //                 await fetchAndSetGeojson(groupId, map01, layerId);
// // // //                 setupFirestoreListener(groupId, layerId);
// // // //
// // // //                 if (mapClickHandler) map01.off('click', mapClickHandler);
// // // //                 mapClickHandler = createMapClickHandler(map01);
// // // //                 map01.on('click', mapClickHandler);
// // // //                 map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
// // // //                 map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
// // // //
// // // //                 let draggedFeatureId = null;
// // // //
// // // //                 // PC用マウスドラッグ移動
// // // //                 map01.on('mousedown', 'oh-point-layer', (e) => {
// // // //                     if (!e.features.length) return;
// // // //                     if (isSyncFailed) {
// // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // //                         });
// // // //                         return;
// // // //                     }
// // // //                     map01.getCanvas().style.cursor = 'grabbing';
// // // //                     draggedFeatureId = e.features[0].properties.id;
// // // //                     map01.dragPan.disable();
// // // //                 });
// // // //
// // // //                 map01.on('mousemove', (e) => {
// // // //                     if (!draggedFeatureId) return;
// // // //                     if (isSyncFailed) {
// // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // //                         });
// // // //                         draggedFeatureId = null;
// // // //                         map01.getCanvas().style.cursor = '';
// // // //                         map01.dragPan.enable();
// // // //                         return;
// // // //                     }
// // // //
// // // //                     const features = groupGeojson.value.features.map(f => {
// // // //                         if (f.properties.id === draggedFeatureId) {
// // // //                             return {
// // // //                                 ...f,
// // // //                                 geometry: {
// // // //                                     ...f.geometry,
// // // //                                     coordinates: [e.lngLat.lng, e.lngLat.lat]
// // // //                                 }
// // // //                             };
// // // //                         }
// // // //                         return f;
// // // //                     });
// // // //
// // // //                     groupGeojson.value.features = features;
// // // //                     const source = map01.getSource('oh-point-source');
// // // //                     if (source) {
// // // //                         source.setData({ type: 'FeatureCollection', features });
// // // //                     }
// // // //                 });
// // // //
// // // //                 map01.on('mouseup', async () => {
// // // //                     if (draggedFeatureId) {
// // // //                         map01.getCanvas().style.cursor = '';
// // // //                         map01.dragPan.enable();
// // // //                         draggedFeatureId = null;
// // // //
// // // //                         const groupId = store.state.currentGroupId;
// // // //                         const layerId = store.state.selectedLayerId;
// // // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // // //                     }
// // // //                 });
// // // //
// // // //                 // スマホ用タッチ移動
// // // //                 map01.on('touchstart', 'oh-point-layer', (e) => {
// // // //                     if (!e.features.length) return;
// // // //                     if (isSyncFailed) {
// // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // //                         });
// // // //                         return;
// // // //                     }
// // // //                     draggedFeatureId = e.features[0].properties.id;
// // // //                     map01.dragPan.disable();
// // // //                 });
// // // //
// // // //                 map01.on('touchmove', (e) => {
// // // //                     if (!draggedFeatureId || !e.points || e.points.length === 0) return;
// // // //                     if (isSyncFailed) {
// // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // //                         });
// // // //                         draggedFeatureId = null;
// // // //                         map01.dragPan.enable();
// // // //                         return;
// // // //                     }
// // // //
// // // //                     const touch = e.lngLat;
// // // //                     const features = groupGeojson.value.features.map(f => {
// // // //                         if (f.properties.id === draggedFeatureId) {
// // // //                             return {
// // // //                                 ...f,
// // // //                                 geometry: {
// // // //                                     ...f.geometry,
// // // //                                     coordinates: [touch.lng, touch.lat]
// // // //                                 }
// // // //                             };
// // // //                         }
// // // //                         return f;
// // // //                     });
// // // //
// // // //                     groupGeojson.value.features = features;
// // // //                     const source = map01.getSource('oh-point-source');
// // // //                     if (source) {
// // // //                         source.setData({ type: 'FeatureCollection', features });
// // // //                     }
// // // //                 });
// // // //
// // // //                 map01.on('touchend', async () => {
// // // //                     if (draggedFeatureId) {
// // // //                         map01.dragPan.enable();
// // // //                         draggedFeatureId = null;
// // // //
// // // //                         const groupId = store.state.currentGroupId;
// // // //                         const layerId = store.state.selectedLayerId;
// // // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // // //                     }
// // // //                 });
// // // //             };
// // // //
// // // //             if (map01.isStyleLoaded()) {
// // // //                 await initializeMap();
// // // //             } else {
// // // //                 map01.once('load', async () => await initializeMap());
// // // //             }
// // // //
// // // //             localStorage.setItem('lastGroupId', groupId);
// // // //             localStorage.setItem('lastLayerId', layerId);
// // // //
// // // //             justChangedGroup = false;
// // // //             isInitializing = false;
// // // //         },
// // // //         { immediate: true }
// // // //     );
// // // //
// // // //     watch(
// // // //         () => store.state.selectedLayers.map01,
// // // //         async (selectedLayers) => {
// // // //             const map = store.state.map01;
// // // //             const groupId = store.state.currentGroupId;
// // // //             const layerId = store.state.selectedLayerId;
// // // //             if (!map || !groupId || !layerId) return;
// // // //
// // // //             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
// // // //             if (hasGroupLayer && !isInitializing) {
// // // //                 await fetchAndSetGeojson(groupId, map, layerId);
// // // //                 previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
// // // //             }
// // // //         },
// // // //         { deep: true }
// // // //     );
// // // //
// // // //     // クリーンアップ（ページ離脱時などにピングを停止）
// // // //     window.addEventListener('unload', () => {
// // // //         if (pingIntervalId) {
// // // //             clearInterval(pingIntervalId);
// // // //             pingIntervalId = null;
// // // //         }
// // // //     });
// // // // }
// // // //
// // // //
// // // // // import store from '@/store';
// // // // // import maplibregl from 'maplibre-gl';
// // // // // import { db } from '@/firebase';
// // // // // import { watch } from 'vue';
// // // // // import { groupGeojson, ohPointLayer } from '@/js/layers';
// // // // // import { popups } from '@/js/popup';
// // // // // import { v4 as uuidv4 } from 'uuid';
// // // // // import firebase from 'firebase/app';
// // // // // import 'firebase/firestore';
// // // // //
// // // // // let unsubscribeSnapshot = null;
// // // // // let lastClickTimestamp = 0;
// // // // // let previousIds = new Set();
// // // // // let mapClickHandler = null;
// // // // // let isInitializing = false;
// // // // // let justChangedGroup = false;
// // // // // let isSaving = false;
// // // // // let isSyncFailed = !navigator.onLine; // 初期状態でオフライン確認
// // // // // let pingIntervalId = null; // ピングのインターバルID
// // // // //
// // // // // // サーバーピング関数
// // // // // async function pingServer() {
// // // // //     try {
// // // // //         // 軽量な読み取り操作でサーバー接続を確認（ダミードキュメントを使用）
// // // // //         await firebase.firestore().collection('ping').doc('status').get();
// // // // //         if (isSyncFailed) {
// // // // //             isSyncFailed = false;
// // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // //                 message: 'サーバーに接続できました。操作を再開できます。'
// // // // //             });
// // // // //         }
// // // // //     } catch (error) {
// // // // //         if (!isSyncFailed) {
// // // // //             isSyncFailed = true;
// // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // //                 message: 'サーバーに接続できません。操作が制限されています。'
// // // // //             });
// // // // //         }
// // // // //     }
// // // // // }
// // // // //
// // // // // // ネットワーク状態の監視とピング開始
// // // // // window.addEventListener('online', () => {
// // // // //     // navigator.onLine が true になっても即座に isSyncFailed を解除せず、ピングで確認
// // // // //     pingServer();
// // // // // });
// // // // //
// // // // // window.addEventListener('offline', () => {
// // // // //     isSyncFailed = true;
// // // // //     store.dispatch('triggerSnackbarForGroup', {
// // // // //         message: 'ネットワークが切断されました。操作が制限されています。'
// // // // //     });
// // // // // });
// // // // //
// // // // // // 定期的なサーバーピングを開始（初回は即時実行）
// // // // // pingServer();
// // // // // pingIntervalId = setInterval(pingServer, 30000); // 30秒ごとにピング
// // // // //
// // // // // // 地物クリック時のハンドラー（ドロワー制御を追加）
// // // // // function createPointClickHandler(map01) {
// // // // //     return (e) => {
// // // // //         if (isSyncFailed) {
// // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // //                 message: 'ネットワークに接続されていません。詳細を表示できません。'
// // // // //             });
// // // // //             return;
// // // // //         }
// // // // //
// // // // //         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
// // // // //         if (features.length > 0) {
// // // // //             const clickedFeature = features[0];
// // // // //             const featureData = {
// // // // //                 type: clickedFeature.type,
// // // // //                 geometry: clickedFeature.geometry,
// // // // //                 properties: clickedFeature.properties
// // // // //             };
// // // // //             console.log('設定する地物データ:', featureData);
// // // // //             store.commit('setSelectedPointFeature', featureData);
// // // // //             store.commit('setPointInfoDrawer', true);
// // // // //         }
// // // // //     };
// // // // // }
// // // // //
// // // // // async function fetchAndSetGeojson(groupId, map, layerId) {
// // // // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // // // //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
// // // // //     const data = doc.data();
// // // // //
// // // // //     if (data && data.features) {
// // // // //         const newFeatures = data.features;
// // // // //         groupGeojson.value.features = newFeatures;
// // // // //
// // // // //         const source = map.getSource('oh-point-source');
// // // // //         if (source) {
// // // // //             source.setData({ type: 'FeatureCollection', features: newFeatures });
// // // // //             map.triggerRepaint();
// // // // //         }
// // // // //
// // // // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures });
// // // // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // // // //
// // // // //         const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
// // // // //         if (!existing) {
// // // // //             store.commit('addSelectedLayer', {
// // // // //                 map: 'map01',
// // // // //                 layer: {
// // // // //                     id: 'oh-point-layer',
// // // // //                     label: `Layer_${layerId}`,
// // // // //                     sources: [{
// // // // //                         id: 'oh-point-source',
// // // // //                         obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
// // // // //                     }],
// // // // //                     layers: [{
// // // // //                         id: 'oh-point-layer',
// // // // //                         type: 'circle',
// // // // //                         source: 'oh-point-source',
// // // // //                         paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
// // // // //                     }],
// // // // //                     opacity: 1,
// // // // //                     visibility: true,
// // // // //                     attribution: '',
// // // // //                     layerid: layerId
// // // // //                 }
// // // // //             });
// // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // //                 message: `レイヤー "Layer_${layerId}" を追加しました`
// // // // //             });
// // // // //         }
// // // // //     } else {
// // // // //         groupGeojson.value.features = [];
// // // // //         store.commit('setCurrentGroupLayers', []);
// // // // //     }
// // // // // }
// // // // //
// // // // // export function deleteAllPoints(currentGroupId) {
// // // // //     if (isSyncFailed) {
// // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // // // //         });
// // // // //         return;
// // // // //     }
// // // // //
// // // // //     groupGeojson.value.features = [];
// // // // //     const map = store.state.map01;
// // // // //     if (map && map.getSource('oh-point-source')) {
// // // // //         map.getSource('oh-point-source').setData({
// // // // //             type: 'FeatureCollection',
// // // // //             features: []
// // // // //         });
// // // // //         map.triggerRepaint();
// // // // //     }
// // // // //     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
// // // // //     store.dispatch('triggerSnackbarForGroup', {
// // // // //         message: 'すべてのポイントを削除しました'
// // // // //     });
// // // // // }
// // // // //
// // // // // function handleMapClick(e, currentGroupId) {
// // // // //     const map = store.state.map01;
// // // // //     const layerId = store.state.selectedLayerId;
// // // // //
// // // // //     // point-remove クラスが含まれていない場合は処理をスキップ
// // // // //     if (!(e.target && e.target.classList.contains('point-remove'))) return;
// // // // //
// // // // //     // オフライン時は削除をブロック
// // // // //     if (isSyncFailed) {
// // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // // // //         });
// // // // //         return;
// // // // //     }
// // // // //
// // // // //     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
// // // // //     if (idsToDelete.size === 0) return;
// // // // //
// // // // //     groupGeojson.value.features = groupGeojson.value.features.filter(
// // // // //         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
// // // // //     );
// // // // //
// // // // //     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
// // // // //     map.triggerRepaint();
// // // // //     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);
// // // // //
// // // // //     popups.forEach(popup => popup.remove());
// // // // //     popups.length = 0;
// // // // //
// // // // //     store.dispatch('triggerSnackbarForGroup', {
// // // // //         message: `${idsToDelete.size} 件のポイントを削除しました`
// // // // //     });
// // // // // }
// // // // //
// // // // // async function saveLayerToFirestore(groupId, layerId, features) {
// // // // //     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
// // // // //     isSaving = true;
// // // // //     try {
// // // // //         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId);
// // // // //         const doc = await docRef.get();
// // // // //         if (!doc.exists) return;
// // // // //
// // // // //         await docRef.set({
// // // // //             features: features,
// // // // //             groupId: groupId,
// // // // //             lastModifiedBy: store.state.userId,
// // // // //             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
// // // // //         }, { merge: true });
// // // // //
// // // // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // // // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // // // //         groupGeojson.value.features = features;
// // // // //     } catch (e) {
// // // // //         console.error('Firestore 更新エラー:', e);
// // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // //             message: 'データの保存に失敗しました'
// // // // //         });
// // // // //     } finally {
// // // // //         await new Promise(resolve => setTimeout(resolve, 200));
// // // // //         isSaving = false;
// // // // //     }
// // // // // }
// // // // //
// // // // // function setupFirestoreListener(groupId, layerId) {
// // // // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // // // //     if (unsubscribeSnapshot) unsubscribeSnapshot();
// // // // //
// // // // //     unsubscribeSnapshot = firebase.firestore()
// // // // //         .collection('groups')
// // // // //         .doc(groupId)
// // // // //         .collection('layers')
// // // // //         .doc(layerId)
// // // // //         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
// // // // //             const wasSyncFailed = isSyncFailed;
// // // // //             // isSyncFailed はピングで管理するため、ここでは更新しない
// // // // //
// // // // //             if (!isSyncFailed && wasSyncFailed) {
// // // // //                 store.dispatch('triggerSnackbarForGroup', {
// // // // //                     message: '同期が復旧しました。操作を再開できます。'
// // // // //                 });
// // // // //             }
// // // // //
// // // // //             const data = doc.data();
// // // // //             const modifiedBy = data?.lastModifiedBy;
// // // // //             const myId = store.state.userId;
// // // // //
// // // // //             if (data && data.features) {
// // // // //                 const features = data.features || [];
// // // // //                 const currentIds = new Set(features.map(f => f.properties?.id));
// // // // //                 const newIds = [...currentIds].filter(id => !previousIds.has(id));
// // // // //                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
// // // // //
// // // // //                 if (!isInitializing && !justChangedGroup) {
// // // // //                     if (newIds.length === 1) {
// // // // //                         console.log('ポイント追加通知トリガー');
// // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // //                             message: `🔴 ${newIds.length} 件のポイントが追加されました。`
// // // // //                         });
// // // // //                     } else if (deletedIds.length === 1) {
// // // // //                         console.log('ポイント削除通知トリガー');
// // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // //                             message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。`
// // // // //                         });
// // // // //                     }
// // // // //                 } else {
// // // // //                     console.log('通知スキップ: ', { isInitializing, justChangedGroup });
// // // // //                 }
// // // // //
// // // // //                 previousIds = currentIds;
// // // // //
// // // // //                 groupGeojson.value.features = features;
// // // // //                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // // //                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // // // //                 store.commit('setCurrentGroupLayers', updatedLayers);
// // // // //
// // // // //                 const map01 = store.state.map01;
// // // // //                 const source = map01.getSource('oh-point-source');
// // // // //                 if (source) {
// // // // //                     source.setData({ type: 'FeatureCollection', features });
// // // // //                     map01.triggerRepaint();
// // // // //                 }
// // // // //             } else {
// // // // //                 groupGeojson.value.features = [];
// // // // //                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
// // // // //                 const map01 = store.state.map01;
// // // // //                 const source = map01.getSource('oh-point-source');
// // // // //                 if (source) {
// // // // //                     source.setData({ type: 'FeatureCollection', features: [] });
// // // // //                     map01.triggerRepaint();
// // // // //                 }
// // // // //                 if (store.state.selectedLayerId === layerId) {
// // // // //                     store.commit('setSelectedLayerId', null);
// // // // //                     localStorage.removeItem('lastLayerId');
// // // // //                 }
// // // // //             }
// // // // //         }, (error) => {
// // // // //             console.error('Snapshot エラー:', error);
// // // // //             isSyncFailed = true;
// // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // //                 message: 'リアルタイム同期に失敗しました。操作が制限されています。'
// // // // //             });
// // // // //         });
// // // // // }
// // // // //
// // // // // function createMapClickHandler(map01) {
// // // // //     return async (e) => {
// // // // //         if (isSyncFailed) {
// // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // //                 message: 'ネットワークに接続されていません。ポイントを追加できません。'
// // // // //             });
// // // // //             return;
// // // // //         }
// // // // //
// // // // //         try {
// // // // //             if (!map01.getLayer('oh-point-layer')) {
// // // // //                 console.warn('oh-point-layer が存在しません。処理をスキップします。');
// // // // //                 return;
// // // // //             }
// // // // //         } catch (e) {
// // // // //             console.log(e);
// // // // //         }
// // // // //
// // // // //         const now = Date.now();
// // // // //         if (now - lastClickTimestamp < 300) return;
// // // // //         lastClickTimestamp = now;
// // // // //
// // // // //         const groupId = store.state.currentGroupId;
// // // // //         const layerId = store.state.selectedLayerId;
// // // // //         if (!groupId || !layerId) return;
// // // // //
// // // // //         const features = map01.queryRenderedFeatures(e.point, {
// // // // //             layers: ['oh-point-layer', 'oh-point-label-layer']
// // // // //         });
// // // // //         if (features.length > 0 || !e.lngLat) return;
// // // // //
// // // // //         const { lng, lat } = e.lngLat;
// // // // //         const newFeature = {
// // // // //             type: 'Feature',
// // // // //             geometry: { type: 'Point', coordinates: [lng, lat] },
// // // // //             properties: {
// // // // //                 id: uuidv4(),
// // // // //                 createdAt: Date.now(),
// // // // //                 createdBy: store.state.myNickname || '不明',
// // // // //                 description: ''
// // // // //             }
// // // // //         };
// // // // //
// // // // //         const source = map01.getSource('oh-point-source');
// // // // //         const currentFeatures = groupGeojson.value.features || [];
// // // // //         const updatedFeatures = [...currentFeatures, newFeature];
// // // // //
// // // // //         groupGeojson.value.features = updatedFeatures;
// // // // //
// // // // //         if (source) {
// // // // //             source.setData({ type: 'FeatureCollection', features: updatedFeatures });
// // // // //             map01.triggerRepaint();
// // // // //         }
// // // // //
// // // // //         if (!isInitializing) {
// // // // //             await saveLayerToFirestore(groupId, layerId, updatedFeatures);
// // // // //         }
// // // // //
// // // // //         store.commit('setSelectedPointFeature', newFeature);
// // // // //         store.commit('setPointInfoDrawer', true);
// // // // //     };
// // // // // }
// // // // //
// // // // // export default function useGloupLayer() {
// // // // //     let savedGroupId = localStorage.getItem('lastGroupId');
// // // // //     let savedLayerId = localStorage.getItem('lastLayerId');
// // // // //
// // // // //     const initializeGroupAndLayer = async () => {
// // // // //         setTimeout(() => {
// // // // //             let selectedLayers = store.state.selectedLayers.map01;
// // // // //             store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
// // // // //             console.log(selectedLayers);
// // // // //         }, 1500);
// // // // //     };
// // // // //
// // // // //     initializeGroupAndLayer().catch(e => {
// // // // //         console.error('初期化エラー:', e);
// // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // //             message: '初期化に失敗しました'
// // // // //         });
// // // // //     });
// // // // //
// // // // //     watch(
// // // // //         () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
// // // // //         async ([map01, groupId, layerId]) => {
// // // // //             if (!map01 || !groupId || !layerId) {
// // // // //                 if (unsubscribeSnapshot) {
// // // // //                     unsubscribeSnapshot();
// // // // //                     unsubscribeSnapshot = null;
// // // // //                 }
// // // // //                 if (pingIntervalId) {
// // // // //                     clearInterval(pingIntervalId); // ピングを停止
// // // // //                     pingIntervalId = null;
// // // // //                 }
// // // // //                 if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
// // // // //                 if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
// // // // //                 store.commit('clearSelectedLayers', 'map01');
// // // // //                 groupGeojson.value.features = [];
// // // // //                 store.commit('setCurrentGroupLayers', []);
// // // // //                 previousIds = new Set();
// // // // //                 return;
// // // // //             }
// // // // //
// // // // //             const initializeMap = async () => {
// // // // //                 if (!map01.getSource('oh-point-source')) {
// // // // //                     map01.addSource('oh-point-source', {
// // // // //                         type: 'geojson',
// // // // //                         data: { type: 'FeatureCollection', features: [] }
// // // // //                     });
// // // // //                 }
// // // // //                 if (!map01.getLayer('oh-point-layer')) {
// // // // //                     map01.addLayer({
// // // // //                         ...ohPointLayer
// // // // //                     });
// // // // //                 }
// // // // //
// // // // //                 await fetchAndSetGeojson(groupId, map01, layerId);
// // // // //                 setupFirestoreListener(groupId, layerId);
// // // // //
// // // // //                 if (mapClickHandler) map01.off('click', mapClickHandler);
// // // // //                 mapClickHandler = createMapClickHandler(map01);
// // // // //                 map01.on('click', mapClickHandler);
// // // // //                 map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
// // // // //                 map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
// // // // //
// // // // //                 let draggedFeatureId = null;
// // // // //
// // // // //                 // PC用マウスドラッグ移動
// // // // //                 map01.on('mousedown', 'oh-point-layer', (e) => {
// // // // //                     if (!e.features.length) return;
// // // // //                     if (isSyncFailed) {
// // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // //                         });
// // // // //                         return;
// // // // //                     }
// // // // //                     map01.getCanvas().style.cursor = 'grabbing';
// // // // //                     draggedFeatureId = e.features[0].properties.id;
// // // // //                     map01.dragPan.disable();
// // // // //                 });
// // // // //
// // // // //                 map01.on('mousemove', (e) => {
// // // // //                     if (!draggedFeatureId) return;
// // // // //                     if (isSyncFailed) {
// // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // //                         });
// // // // //                         draggedFeatureId = null;
// // // // //                         map01.getCanvas().style.cursor = '';
// // // // //                         map01.dragPan.enable();
// // // // //                         return;
// // // // //                     }
// // // // //
// // // // //                     const features = groupGeojson.value.features.map(f => {
// // // // //                         if (f.properties.id === draggedFeatureId) {
// // // // //                             return {
// // // // //                                 ...f,
// // // // //                                 geometry: {
// // // // //                                     ...f.geometry,
// // // // //                                     coordinates: [e.lngLat.lng, e.lngLat.lat]
// // // // //                                 }
// // // // //                             };
// // // // //                         }
// // // // //                         return f;
// // // // //                     });
// // // // //
// // // // //                     groupGeojson.value.features = features;
// // // // //                     const source = map01.getSource('oh-point-source');
// // // // //                     if (source) {
// // // // //                         source.setData({ type: 'FeatureCollection', features });
// // // // //                     }
// // // // //                 });
// // // // //
// // // // //                 map01.on('mouseup', async () => {
// // // // //                     if (draggedFeatureId) {
// // // // //                         map01.getCanvas().style.cursor = '';
// // // // //                         map01.dragPan.enable();
// // // // //                         draggedFeatureId = null;
// // // // //
// // // // //                         const groupId = store.state.currentGroupId;
// // // // //                         const layerId = store.state.selectedLayerId;
// // // // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // // // //                     }
// // // // //                 });
// // // // //
// // // // //                 // スマホ用タッチ移動
// // // // //                 map01.on('touchstart', 'oh-point-layer', (e) => {
// // // // //                     if (!e.features.length) return;
// // // // //                     if (isSyncFailed) {
// // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // //                         });
// // // // //                         return;
// // // // //                     }
// // // // //                     draggedFeatureId = e.features[0].properties.id;
// // // // //                     map01.dragPan.disable();
// // // // //                 });
// // // // //
// // // // //                 map01.on('touchmove', (e) => {
// // // // //                     if (!draggedFeatureId || !e.points || e.points.length === 0) return;
// // // // //                     if (isSyncFailed) {
// // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // //                         });
// // // // //                         draggedFeatureId = null;
// // // // //                         map01.dragPan.enable();
// // // // //                         return;
// // // // //                     }
// // // // //
// // // // //                     const touch = e.lngLat;
// // // // //                     const features = groupGeojson.value.features.map(f => {
// // // // //                         if (f.properties.id === draggedFeatureId) {
// // // // //                             return {
// // // // //                                 ...f,
// // // // //                                 geometry: {
// // // // //                                     ...f.geometry,
// // // // //                                     coordinates: [touch.lng, touch.lat]
// // // // //                                 }
// // // // //                             };
// // // // //                         }
// // // // //                         return f;
// // // // //                     });
// // // // //
// // // // //                     groupGeojson.value.features = features;
// // // // //                     const source = map01.getSource('oh-point-source');
// // // // //                     if (source) {
// // // // //                         source.setData({ type: 'FeatureCollection', features });
// // // // //                     }
// // // // //                 });
// // // // //
// // // // //                 map01.on('touchend', async () => {
// // // // //                     if (draggedFeatureId) {
// // // // //                         map01.dragPan.enable();
// // // // //                         draggedFeatureId = null;
// // // // //
// // // // //                         const groupId = store.state.currentGroupId;
// // // // //                         const layerId = store.state.selectedLayerId;
// // // // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // // // //                     }
// // // // //                 });
// // // // //             };
// // // // //
// // // // //             if (map01.isStyleLoaded()) {
// // // // //                 await initializeMap();
// // // // //             } else {
// // // // //                 map01.once('load', async () => await initializeMap());
// // // // //             }
// // // // //
// // // // //             localStorage.setItem('lastGroupId', groupId);
// // // // //             localStorage.setItem('lastLayerId', layerId);
// // // // //
// // // // //             justChangedGroup = false;
// // // // //             isInitializing = false;
// // // // //         },
// // // // //         { immediate: true }
// // // // //     );
// // // // //
// // // // //     watch(
// // // // //         () => store.state.selectedLayers.map01,
// // // // //         async (selectedLayers) => {
// // // // //             const map = store.state.map01;
// // // // //             const groupId = store.state.currentGroupId;
// // // // //             const layerId = store.state.selectedLayerId;
// // // // //             if (!map || !groupId || !layerId) return;
// // // // //
// // // // //             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
// // // // //             if (hasGroupLayer && !isInitializing) {
// // // // //                 await fetchAndSetGeojson(groupId, map, layerId);
// // // // //                 previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
// // // // //             }
// // // // //         },
// // // // //         { deep: true }
// // // // //     );
// // // // //
// // // // //     // クリーンアップ（ページ離脱時などにピングを停止）
// // // // //     window.addEventListener('unload', () => {
// // // // //         if (pingIntervalId) {
// // // // //             clearInterval(pingIntervalId);
// // // // //             pingIntervalId = null;
// // // // //         }
// // // // //     });
// // // // // }
// // // // //
// // // // //
// // // // // // import store from '@/store';
// // // // // // import maplibregl from 'maplibre-gl';
// // // // // // import { db } from '@/firebase';
// // // // // // import { watch } from 'vue';
// // // // // // import { groupGeojson, ohPointLayer } from '@/js/layers';
// // // // // // import { popups } from '@/js/popup';
// // // // // // import { v4 as uuidv4 } from 'uuid';
// // // // // // import firebase from 'firebase/app';
// // // // // // import 'firebase/firestore';
// // // // // //
// // // // // // let unsubscribeSnapshot = null;
// // // // // // let lastClickTimestamp = 0;
// // // // // // let previousIds = new Set();
// // // // // // let mapClickHandler = null;
// // // // // // let isInitializing = false;
// // // // // // let justChangedGroup = false;
// // // // // // let isSaving = false;
// // // // // // let isSyncFailed = !navigator.onLine; // 初期状態でオフライン確認
// // // // // //
// // // // // // // ネットワーク状態の監視
// // // // // // window.addEventListener('online', () => {
// // // // // //     isSyncFailed = false;
// // // // // //     store.dispatch('triggerSnackbarForGroup', {
// // // // // //         message: 'ネットワークが復帰しました。同期を再開しました。'
// // // // // //     });
// // // // // // });
// // // // // //
// // // // // // window.addEventListener('offline', () => {
// // // // // //     isSyncFailed = true;
// // // // // //     store.dispatch('triggerSnackbarForGroup', {
// // // // // //         message: 'ネットワークが切断されました。操作が制限されています。'
// // // // // //     });
// // // // // // });
// // // // // //
// // // // // // // 地物クリック時のハンドラー（ドロワー制御を追加）
// // // // // // function createPointClickHandler(map01) {
// // // // // //     return (e) => {
// // // // // //         if (isSyncFailed) {
// // // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // // //                 message: 'ネットワークに接続されていません。詳細を表示できません。'
// // // // // //             });
// // // // // //             return;
// // // // // //         }
// // // // // //
// // // // // //         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer', 'oh-point-label-layer'] });
// // // // // //         if (features.length > 0) {
// // // // // //             const clickedFeature = features[0];
// // // // // //             const featureData = {
// // // // // //                 type: clickedFeature.type,
// // // // // //                 geometry: clickedFeature.geometry,
// // // // // //                 properties: clickedFeature.properties
// // // // // //             };
// // // // // //             console.log('設定する地物データ:', featureData);
// // // // // //             store.commit('setSelectedPointFeature', featureData);
// // // // // //             store.commit('setPointInfoDrawer', true);
// // // // // //         }
// // // // // //     };
// // // // // // }
// // // // // //
// // // // // // async function fetchAndSetGeojson(groupId, map, layerId) {
// // // // // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // // // // //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
// // // // // //     const data = doc.data();
// // // // // //
// // // // // //     if (data && data.features) {
// // // // // //         const newFeatures = data.features;
// // // // // //         groupGeojson.value.features = newFeatures;
// // // // // //
// // // // // //         const source = map.getSource('oh-point-source');
// // // // // //         if (source) {
// // // // // //             source.setData({ type: 'FeatureCollection', features: newFeatures });
// // // // // //             map.triggerRepaint();
// // // // // //         }
// // // // // //
// // // // // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // // // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures });
// // // // // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // // // // //
// // // // // //         const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer');
// // // // // //         if (!existing) {
// // // // // //             store.commit('addSelectedLayer', {
// // // // // //                 map: 'map01',
// // // // // //                 layer: {
// // // // // //                     id: 'oh-point-layer',
// // // // // //                     label: `Layer_${layerId}`,
// // // // // //                     sources: [{
// // // // // //                         id: 'oh-point-source',
// // // // // //                         obj: { type: 'geojson', data: { type: 'FeatureCollection', features: newFeatures } }
// // // // // //                     }],
// // // // // //                     layers: [{
// // // // // //                         id: 'oh-point-layer',
// // // // // //                         type: 'circle',
// // // // // //                         source: 'oh-point-source',
// // // // // //                         paint: { 'circle-radius': 6, 'circle-color': 'navy', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
// // // // // //                     }],
// // // // // //                     opacity: 1,
// // // // // //                     visibility: true,
// // // // // //                     attribution: '',
// // // // // //                     layerid: layerId
// // // // // //                 }
// // // // // //             });
// // // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // // //                 message: `レイヤー "Layer_${layerId}" を追加しました`
// // // // // //             });
// // // // // //         }
// // // // // //     } else {
// // // // // //         groupGeojson.value.features = [];
// // // // // //         store.commit('setCurrentGroupLayers', []);
// // // // // //     }
// // // // // // }
// // // // // //
// // // // // // export function deleteAllPoints(currentGroupId) {
// // // // // //     if (isSyncFailed) {
// // // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // // // // //         });
// // // // // //         return;
// // // // // //     }
// // // // // //
// // // // // //     groupGeojson.value.features = [];
// // // // // //     const map = store.state.map01;
// // // // // //     if (map && map.getSource('oh-point-source')) {
// // // // // //         map.getSource('oh-point-source').setData({
// // // // // //             type: 'FeatureCollection',
// // // // // //             features: []
// // // // // //         });
// // // // // //         map.triggerRepaint();
// // // // // //     }
// // // // // //     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
// // // // // //     store.dispatch('triggerSnackbarForGroup', {
// // // // // //         message: 'すべてのポイントを削除しました'
// // // // // //     });
// // // // // // }
// // // // // //
// // // // // // function handleMapClick(e, currentGroupId) {
// // // // // //     const map = store.state.map01;
// // // // // //     const layerId = store.state.selectedLayerId;
// // // // // //
// // // // // //     // point-remove クラスが含まれていない場合は処理をスキップ
// // // // // //     if (!(e.target && e.target.classList.contains('point-remove'))) return;
// // // // // //
// // // // // //     // オフライン時は削除をブロック
// // // // // //     if (isSyncFailed) {
// // // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // // //             message: 'ネットワークに接続されていません。ポイントを削除できません。'
// // // // // //         });
// // // // // //         return;
// // // // // //     }
// // // // // //
// // // // // //     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
// // // // // //     if (idsToDelete.size === 0) return;
// // // // // //
// // // // // //     groupGeojson.value.features = groupGeojson.value.features.filter(
// // // // // //         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
// // // // // //     );
// // // // // //
// // // // // //     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
// // // // // //     map.triggerRepaint();
// // // // // //     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);
// // // // // //
// // // // // //     popups.forEach(popup => popup.remove());
// // // // // //     popups.length = 0;
// // // // // //
// // // // // //     store.dispatch('triggerSnackbarForGroup', {
// // // // // //         message: `${idsToDelete.size} 件のポイントを削除しました`
// // // // // //     });
// // // // // // }
// // // // // //
// // // // // // async function saveLayerToFirestore(groupId, layerId, features) {
// // // // // //     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return;
// // // // // //     isSaving = true;
// // // // // //     try {
// // // // // //         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId);
// // // // // //         const doc = await docRef.get();
// // // // // //         if (!doc.exists) return;
// // // // // //
// // // // // //         await docRef.set({
// // // // // //             features: features,
// // // // // //             groupId: groupId,
// // // // // //             lastModifiedBy: store.state.userId,
// // // // // //             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
// // // // // //         }, { merge: true });
// // // // // //
// // // // // //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // // // //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // // // // //         store.commit('setCurrentGroupLayers', updatedLayers);
// // // // // //         groupGeojson.value.features = features;
// // // // // //     } catch (e) {
// // // // // //         console.error('Firestore 更新エラー:', e);
// // // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // // //             message: 'データの保存に失敗しました'
// // // // // //         });
// // // // // //     } finally {
// // // // // //         await new Promise(resolve => setTimeout(resolve, 200));
// // // // // //         isSaving = false;
// // // // // //     }
// // // // // // }
// // // // // //
// // // // // // function setupFirestoreListener(groupId, layerId) {
// // // // // //     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
// // // // // //     if (unsubscribeSnapshot) unsubscribeSnapshot();
// // // // // //
// // // // // //     unsubscribeSnapshot = firebase.firestore()
// // // // // //         .collection('groups')
// // // // // //         .doc(groupId)
// // // // // //         .collection('layers')
// // // // // //         .doc(layerId)
// // // // // //         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
// // // // // //             const wasSyncFailed = isSyncFailed;
// // // // // //             isSyncFailed = !navigator.onLine; // オフライン時は true を維持
// // // // // //
// // // // // //             if (!isSyncFailed && wasSyncFailed) {
// // // // // //                 store.dispatch('triggerSnackbarForGroup', {
// // // // // //                     message: '同期が復旧しました。操作を再開できます。'
// // // // // //                 });
// // // // // //             }
// // // // // //
// // // // // //             const data = doc.data();
// // // // // //             const modifiedBy = data?.lastModifiedBy;
// // // // // //             const myId = store.state.userId;
// // // // // //
// // // // // //             if (data && data.features) {
// // // // // //                 const features = data.features || [];
// // // // // //                 const currentIds = new Set(features.map(f => f.properties?.id));
// // // // // //                 const newIds = [...currentIds].filter(id => !previousIds.has(id));
// // // // // //                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
// // // // // //
// // // // // //                 if (!isInitializing && !justChangedGroup) {
// // // // // //                     if (newIds.length === 1) {
// // // // // //                         console.log('ポイント追加通知トリガー');
// // // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // // //                             message: `🔴 ${newIds.length} 件のポイントが追加されました。`
// // // // // //                         });
// // // // // //                     } else if (deletedIds.length === 1) {
// // // // // //                         console.log('ポイント削除通知トリガー');
// // // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // // //                             message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。`
// // // // // //                         });
// // // // // //                     }
// // // // // //                 } else {
// // // // // //                     console.log('通知スキップ: ', { isInitializing, justChangedGroup });
// // // // // //                 }
// // // // // //
// // // // // //                 previousIds = currentIds;
// // // // // //
// // // // // //                 groupGeojson.value.features = features;
// // // // // //                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
// // // // // //                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features });
// // // // // //                 store.commit('setCurrentGroupLayers', updatedLayers);
// // // // // //
// // // // // //                 const map01 = store.state.map01;
// // // // // //                 const source = map01.getSource('oh-point-source');
// // // // // //                 if (source) {
// // // // // //                     source.setData({ type: 'FeatureCollection', features });
// // // // // //                     map01.triggerRepaint();
// // // // // //                 }
// // // // // //             } else {
// // // // // //                 groupGeojson.value.features = [];
// // // // // //                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId));
// // // // // //                 const map01 = store.state.map01;
// // // // // //                 const source = map01.getSource('oh-point-source');
// // // // // //                 if (source) {
// // // // // //                     source.setData({ type: 'FeatureCollection', features: [] });
// // // // // //                     map01.triggerRepaint();
// // // // // //                 }
// // // // // //                 if (store.state.selectedLayerId === layerId) {
// // // // // //                     store.commit('setSelectedLayerId', null);
// // // // // //                     localStorage.removeItem('lastLayerId');
// // // // // //                 }
// // // // // //             }
// // // // // //         }, (error) => {
// // // // // //             console.error('Snapshot エラー:', error);
// // // // // //             isSyncFailed = true;
// // // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // // //                 message: 'リアルタイム同期に失敗しました。操作が制限されています。'
// // // // // //             });
// // // // // //         });
// // // // // // }
// // // // // //
// // // // // // function createMapClickHandler(map01) {
// // // // // //     return async (e) => {
// // // // // //         if (isSyncFailed) {
// // // // // //             store.dispatch('triggerSnackbarForGroup', {
// // // // // //                 message: 'ネットワークに接続されていません。ポイントを追加できません。'
// // // // // //             });
// // // // // //             return;
// // // // // //         }
// // // // // //
// // // // // //         try {
// // // // // //             if (!map01.getLayer('oh-point-layer')) {
// // // // // //                 console.warn('oh-point-layer が存在しません。処理をスキップします。');
// // // // // //                 return;
// // // // // //             }
// // // // // //         } catch (e) {
// // // // // //             console.log(e);
// // // // // //         }
// // // // // //
// // // // // //         const now = Date.now();
// // // // // //         if (now - lastClickTimestamp < 300) return;
// // // // // //         lastClickTimestamp = now;
// // // // // //
// // // // // //         const groupId = store.state.currentGroupId;
// // // // // //         const layerId = store.state.selectedLayerId;
// // // // // //         if (!groupId || !layerId) return;
// // // // // //
// // // // // //         const features = map01.queryRenderedFeatures(e.point, {
// // // // // //             layers: ['oh-point-layer', 'oh-point-label-layer']
// // // // // //         });
// // // // // //         if (features.length > 0 || !e.lngLat) return;
// // // // // //
// // // // // //         const { lng, lat } = e.lngLat;
// // // // // //         const newFeature = {
// // // // // //             type: 'Feature',
// // // // // //             geometry: { type: 'Point', coordinates: [lng, lat] },
// // // // // //             properties: {
// // // // // //                 id: uuidv4(),
// // // // // //                 createdAt: Date.now(),
// // // // // //                 createdBy: store.state.myNickname || '不明',
// // // // // //                 description: ''
// // // // // //             }
// // // // // //         };
// // // // // //
// // // // // //         const source = map01.getSource('oh-point-source');
// // // // // //         const currentFeatures = groupGeojson.value.features || [];
// // // // // //         const updatedFeatures = [...currentFeatures, newFeature];
// // // // // //
// // // // // //         groupGeojson.value.features = updatedFeatures;
// // // // // //
// // // // // //         if (source) {
// // // // // //             source.setData({ type: 'FeatureCollection', features: updatedFeatures });
// // // // // //             map01.triggerRepaint();
// // // // // //         }
// // // // // //
// // // // // //         if (!isInitializing) {
// // // // // //             await saveLayerToFirestore(groupId, layerId, updatedFeatures);
// // // // // //         }
// // // // // //
// // // // // //         store.commit('setSelectedPointFeature', newFeature);
// // // // // //         store.commit('setPointInfoDrawer', true);
// // // // // //     };
// // // // // // }
// // // // // //
// // // // // // export default function useGloupLayer() {
// // // // // //     let savedGroupId = localStorage.getItem('lastGroupId');
// // // // // //     let savedLayerId = localStorage.getItem('lastLayerId');
// // // // // //
// // // // // //     const initializeGroupAndLayer = async () => {
// // // // // //         setTimeout(() => {
// // // // // //             let selectedLayers = store.state.selectedLayers.map01;
// // // // // //             store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
// // // // // //             console.log(selectedLayers);
// // // // // //         }, 1500);
// // // // // //     };
// // // // // //
// // // // // //     initializeGroupAndLayer().catch(e => {
// // // // // //         console.error('初期化エラー:', e);
// // // // // //         store.dispatch('triggerSnackbarForGroup', {
// // // // // //             message: '初期化に失敗しました'
// // // // // //         });
// // // // // //     });
// // // // // //
// // // // // //     watch(
// // // // // //         () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
// // // // // //         async ([map01, groupId, layerId]) => {
// // // // // //             if (!map01 || !groupId || !layerId) {
// // // // // //                 if (unsubscribeSnapshot) {
// // // // // //                     unsubscribeSnapshot();
// // // // // //                     unsubscribeSnapshot = null;
// // // // // //                 }
// // // // // //                 if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
// // // // // //                 if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
// // // // // //                 store.commit('clearSelectedLayers', 'map01');
// // // // // //                 groupGeojson.value.features = [];
// // // // // //                 store.commit('setCurrentGroupLayers', []);
// // // // // //                 previousIds = new Set();
// // // // // //                 return;
// // // // // //             }
// // // // // //
// // // // // //             const initializeMap = async () => {
// // // // // //                 if (!map01.getSource('oh-point-source')) {
// // // // // //                     map01.addSource('oh-point-source', {
// // // // // //                         type: 'geojson',
// // // // // //                         data: { type: 'FeatureCollection', features: [] }
// // // // // //                     });
// // // // // //                 }
// // // // // //                 if (!map01.getLayer('oh-point-layer')) {
// // // // // //                     map01.addLayer({
// // // // // //                         ...ohPointLayer
// // // // // //                     });
// // // // // //                 }
// // // // // //
// // // // // //                 await fetchAndSetGeojson(groupId, map01, layerId);
// // // // // //                 setupFirestoreListener(groupId, layerId);
// // // // // //
// // // // // //                 if (mapClickHandler) map01.off('click', mapClickHandler);
// // // // // //                 mapClickHandler = createMapClickHandler(map01);
// // // // // //                 map01.on('click', mapClickHandler);
// // // // // //                 map01.on('click', 'oh-point-layer', createPointClickHandler(map01));
// // // // // //                 map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
// // // // // //
// // // // // //                 let draggedFeatureId = null;
// // // // // //
// // // // // //                 map01.on('mousedown', 'oh-point-layer', (e) => {
// // // // // //                     if (!e.features.length) return;
// // // // // //                     if (isSyncFailed) {
// // // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // // //                         });
// // // // // //                         return;
// // // // // //                     }
// // // // // //                     map01.getCanvas().style.cursor = 'grabbing';
// // // // // //                     draggedFeatureId = e.features[0].properties.id;
// // // // // //                     map01.dragPan.disable();
// // // // // //                 });
// // // // // //
// // // // // //                 map01.on('mousemove', (e) => {
// // // // // //                     if (!draggedFeatureId) return;
// // // // // //                     if (isSyncFailed) {
// // // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // // //                         });
// // // // // //                         draggedFeatureId = null;
// // // // // //                         map01.getCanvas().style.cursor = '';
// // // // // //                         map01.dragPan.enable();
// // // // // //                         return;
// // // // // //                     }
// // // // // //
// // // // // //                     const features = groupGeojson.value.features.map(f => {
// // // // // //                         if (f.properties.id === draggedFeatureId) {
// // // // // //                             return {
// // // // // //                                 ...f,
// // // // // //                                 geometry: {
// // // // // //                                     ...f.geometry,
// // // // // //                                     coordinates: [e.lngLat.lng, e.lngLat.lat]
// // // // // //                                 }
// // // // // //                             };
// // // // // //                         }
// // // // // //                         return f;
// // // // // //                     });
// // // // // //
// // // // // //                     groupGeojson.value.features = features;
// // // // // //                     const source = map01.getSource('oh-point-source');
// // // // // //                     if (source) {
// // // // // //                         source.setData({ type: 'FeatureCollection', features });
// // // // // //                     }
// // // // // //                 });
// // // // // //
// // // // // //                 map01.on('mouseup', async () => {
// // // // // //                     if (draggedFeatureId) {
// // // // // //                         map01.getCanvas().style.cursor = '';
// // // // // //                         map01.dragPan.enable();
// // // // // //                         draggedFeatureId = null;
// // // // // //
// // // // // //                         const groupId = store.state.currentGroupId;
// // // // // //                         const layerId = store.state.selectedLayerId;
// // // // // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // // // // //                     }
// // // // // //                 });
// // // // // //
// // // // // //                 map01.on('touchstart', 'oh-point-layer', (e) => {
// // // // // //                     if (!e.features.length) return;
// // // // // //                     if (isSyncFailed) {
// // // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // // //                         });
// // // // // //                         return;
// // // // // //                     }
// // // // // //                     draggedFeatureId = e.features[0].properties.id;
// // // // // //                     map01.dragPan.disable();
// // // // // //                 });
// // // // // //
// // // // // //                 map01.on('touchmove', (e) => {
// // // // // //                     if (!draggedFeatureId || !e.points || e.points.length === 0) return;
// // // // // //                     if (isSyncFailed) {
// // // // // //                         store.dispatch('triggerSnackbarForGroup', {
// // // // // //                             message: 'ネットワークに接続されていません。ポイントを移動できません。'
// // // // // //                         });
// // // // // //                         draggedFeatureId = null;
// // // // // //                         map01.dragPan.enable();
// // // // // //                         return;
// // // // // //                     }
// // // // // //
// // // // // //                     const touch = e.lngLat;
// // // // // //                     const features = groupGeojson.value.features.map(f => {
// // // // // //                         if (f.properties.id === draggedFeatureId) {
// // // // // //                             return {
// // // // // //                                 ...f,
// // // // // //                                 geometry: {
// // // // // //                                     ...f.geometry,
// // // // // //                                     coordinates: [touch.lng, touch.lat]
// // // // // //                                 }
// // // // // //                             };
// // // // // //                         }
// // // // // //                         return f;
// // // // // //                     });
// // // // // //
// // // // // //                     groupGeojson.value.features = features;
// // // // // //                     const source = map01.getSource('oh-point-source');
// // // // // //                     if (source) {
// // // // // //                         source.setData({ type: 'FeatureCollection', features });
// // // // // //                     }
// // // // // //                 });
// // // // // //
// // // // // //                 map01.on('touchend', async () => {
// // // // // //                     if (draggedFeatureId) {
// // // // // //                         map01.dragPan.enable();
// // // // // //                         draggedFeatureId = null;
// // // // // //
// // // // // //                         const groupId = store.state.currentGroupId;
// // // // // //                         const layerId = store.state.selectedLayerId;
// // // // // //                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
// // // // // //                     }
// // // // // //                 });
// // // // // //             };
// // // // // //
// // // // // //             if (map01.isStyleLoaded()) {
// // // // // //                 await initializeMap();
// // // // // //             } else {
// // // // // //                 map01.once('load', async () => await initializeMap());
// // // // // //             }
// // // // // //
// // // // // //             localStorage.setItem('lastGroupId', groupId);
// // // // // //             localStorage.setItem('lastLayerId', layerId);
// // // // // //
// // // // // //             justChangedGroup = false;
// // // // // //             isInitializing = false;
// // // // // //         },
// // // // // //         { immediate: true }
// // // // // //     );
// // // // // //
// // // // // //     watch(
// // // // // //         () => store.state.selectedLayers.map01,
// // // // // //         async (selectedLayers) => {
// // // // // //             const map = store.state.map01;
// // // // // //             const groupId = store.state.currentGroupId;
// // // // // //             const layerId = store.state.selectedLayerId;
// // // // // //             if (!map || !groupId || !layerId) return;
// // // // // //
// // // // // //             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
// // // // // //             if (hasGroupLayer && !isInitializing) {
// // // // // //                 await fetchAndSetGeojson(groupId, map, layerId);
// // // // // //                 previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
// // // // // //             }
// // // // // //         },
// // // // // //         { deep: true }
// // // // // //     );
// // // // // // }
