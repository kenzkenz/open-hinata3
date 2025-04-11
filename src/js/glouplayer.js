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
let isSyncFailed = false; // 同期失敗状態を追跡

// 地物クリック時のハンドラー
function createPointClickHandler(map01) {
    return (e) => {
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
    if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
    const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
    const data = doc.data();

    if (data && data.features) {
        const newFeatures = data.features;
        groupGeojson.value.features = newFeatures;

        const source = map.getSource('oh-point-source');
        if (source) {
            source.setData({ type: 'FeatureCollection', features: newFeatures });
            map.triggerRepaint();
        }

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
            store.dispatch('triggerSnackbarForGroup', {
                message: `レイヤー "Layer_${layerId}" を追加しました`
            });
        }
    } else {
        groupGeojson.value.features = [];
        store.commit('setCurrentGroupLayers', []);
    }
}

export function deleteAllPoints(currentGroupId) {
    if (isSyncFailed) {
        store.dispatch('triggerSnackbarForGroup', {
            message: '同期に失敗しているため、ポイントを削除できません。'
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
            message: '同期に失敗しているため、ポイントを削除できません。'
        });
        return;
    }

    const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
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
            isSyncFailed = false; // 同期成功時にフラグをリセット

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
            isSyncFailed = true; // 同期失敗時にフラグを設定
            store.dispatch('triggerSnackbarForGroup', {
                message: 'リアルタイム同期に失敗しました。操作が制限されています。'
            });
        });
}

function createMapClickHandler(map01) {
    return async (e) => {
        if (isSyncFailed) {
            store.dispatch('triggerSnackbarForGroup', {
                message: '同期に失敗しているため、ポイントを追加できません。'
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

    const initializeGroupAndLayer = async () => {
        setTimeout(() => {
            let selectedLayers = store.state.selectedLayers.map01;
            store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
            console.log(selectedLayers);
        }, 1500);
    };

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
                            message: '同期に失敗しているため、ポイントを移動できません。'
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
                            message: '同期に失敗しているため、ポイントを移動できません。'
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
                            message: '同期に失敗しているため、ポイントを移動できません。'
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
                            message: '同期に失敗しているため、ポイントを移動できません。'
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
}



// import store from '@/store';
// import maplibregl from 'maplibre-gl';
// import { db } from '@/firebase';
// import { watch } from 'vue';
// import {groupGeojson, ohPointLayer} from '@/js/layers';
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
// let isSaving = false
//
// // 地物クリック時のハンドラー
// function createPointClickHandler(map01) {
//     return (e) => {
//         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer','oh-point-label-layer'] });
//         // alert(features.length)
//         if (features.length > 0) {
//             const clickedFeature = features[0];
//             const featureData = {
//                 type: clickedFeature.type,
//                 geometry: clickedFeature.geometry,
//                 properties: clickedFeature.properties
//             };
//             console.log('設定する地物データ:', featureData);
//             store.commit('setSelectedPointFeature', featureData); // 必要なデータのみ設定
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
//             // map.setPaintProperty('oh-point-layer', 'circle-color', '#ff0000');
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
//             // スナックバー通知
//             store.dispatch('triggerSnackbarForGroup', {
//                 message: `レイヤー "Layer_${layerId}" を追加しました`
//             });
//         }
//     } else {
//         groupGeojson.value.features = [];
//         store.commit('setCurrentGroupLayers', []);
//         // スナックバー通知
//         // store.dispatch('triggerSnackbarForGroup', {
//         //     message: 'レイヤーデータが空です'
//         // });
//     }
// }
//
// export function deleteAllPoints(currentGroupId) {
//     console.log(1)
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
//     // スナックバー通知
//     store.dispatch('triggerSnackbarForGroup', {
//         message: 'すべてのポイントを削除しました'
//     });
// }
//
// function handleMapClick(e, currentGroupId) {
//     const map = store.state.map01;
//     const layerId = store.state.selectedLayerId;
//     if (!(e.target && e.target.classList.contains('point-remove'))) return;
//
//     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
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
//     // スナックバー通知
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
//         // スナックバー通知
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
//             // if (isSaving || modifiedBy === myId) return;
//
//             if (data && data.features) {
//                 const features = data.features || [];
//                 const currentIds = new Set(features.map(f => f.properties?.id));
//                 const newIds = [...currentIds].filter(id => !previousIds.has(id));
//                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
//                 const userNickname = store.state.myNickname;
//
//                 console.log('Firestore スナップショット: ', { currentIds, previousIds, newIds, deletedIds }); // デバッグログ
//
//                 if (!isInitializing && !justChangedGroup) {
//                     if (newIds.length === 1) {
//                         console.log('ポイント追加通知トリガー');
//                         store.dispatch('triggerSnackbarForGroup', {
//                             // message: `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`
//                             message: `🔴 ${newIds.length} 件のポイントが追加されました。`
//                         });
//                     } else if (deletedIds.length === 1) {
//                         console.log('ポイント削除通知トリガー');
//                         store.dispatch('triggerSnackbarForGroup', {
//                             // message: `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`
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
//             store.dispatch('triggerSnackbarForGroup', {
//                 message: 'リアルタイム更新に失敗しました' // "messege" ではなく "message"
//             });
//         });
// }
//
// function createMapClickHandler(map01) {
//     return async (e) => {
//         // oh-point-layer が存在しない場合は処理を抜ける
//         try {
//             if (!map01.getLayer('oh-point-layer')) {
//                 console.warn('oh-point-layer が存在しません。処理をスキップします。');
//                 return;
//             }
//         } catch (e) {
//             console.log(e)
//         }
//         const now = Date.now();
//         if (now - lastClickTimestamp < 300) return;
//         lastClickTimestamp = now;
//
//         const groupId = store.state.currentGroupId;
//         const layerId = store.state.selectedLayerId;
//         if (!groupId || !layerId) return;
//
//         // const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] });
//         // if (features.length > 0 || !e.lngLat) return;
//
//         const features = map01.queryRenderedFeatures(e.point, {
//             layers: ['oh-point-layer', 'oh-point-label-layer']
//         });
//         if (features.length > 0 || !e.lngLat) return;
//
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
//         // ✅ ドロワーを開く！
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
//
//         // selectedLayers.map01 から oh-point-layer を削除
//         setTimeout(() => {
//             let selectedLayers = store.state.selectedLayers.map01;
//             // alert(JSON.stringify(selectedLayers.length))
//             store.state.selectedLayers.map01 = selectedLayers.filter(layer => layer.id !== 'oh-point-layer');
//             console.log(selectedLayers)
//             // alert(JSON.stringify(selectedLayers.length))
//         },1500)
//
//
//         // if (selectedLayers.length !== updatedLayers.length) {
//         //     alert(8888)
//         //     console.log('oh-point-layer を selectedLayers から削除しました');
//         //     store.commit('setSelectedLayers', { map: 'map01', layers: updatedLayers });
//         // }
//
//
//         // 一時的に復帰を停止
//         // if (savedGroupId && savedLayerId) {
//         //     const docRef = firebase.firestore()
//         //         .collection('groups')
//         //         .doc(savedGroupId)
//         //         .collection('layers')
//         //         .doc(savedLayerId);
//         //     const doc = await docRef.get();
//         //     if (doc.exists) {
//         //         store.commit('setCurrentGroup', { id: savedGroupId, name: savedGroupId });
//         //         store.commit('setSelectedLayerId', savedLayerId);
//         //     } else {
//         //         localStorage.removeItem('lastLayerId');
//         //         store.commit('setSelectedLayerId', null);
//         //         savedLayerId = null;
//         //     }
//         // }
//         //
//         // if (savedGroupId && !savedLayerId) {
//         //     const snapshot = await firebase.firestore()
//         //         .collection('groups')
//         //         .doc(savedGroupId)
//         //         .collection('layers')
//         //         .limit(1)
//         //         .get();
//         //     if (!snapshot.empty) {
//         //         const firstLayer = snapshot.docs[0];
//         //         savedLayerId = firstLayer.id;
//         //         localStorage.setItem('lastLayerId', savedLayerId);
//         //         store.commit('setSelectedLayerId', savedLayerId);
//         //     }
//         // }
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
//                         ohPointLayer
//                     });
//                 }
//
//                 await fetchAndSetGeojson(groupId, map01, layerId);
//                 setupFirestoreListener(groupId, layerId);
//
//                 if (mapClickHandler) map01.off('click', mapClickHandler);
//                 mapClickHandler = createMapClickHandler(map01);
//                 map01.on('click', mapClickHandler);
//                 // 地物クリックイベントを追加
//                 map01.on('click', 'oh-point-layer', createPointClickHandler(map01)); // ★ここでクリックを監視★
//                 map01.on('click', 'oh-point-label-layer', createPointClickHandler(map01));
//
//                 let draggedFeatureId = null;
//
//                 map01.on('mousedown', 'oh-point-layer', (e) => {
//                     if (!e.features.length) return;
//                     map01.getCanvas().style.cursor = 'grabbing';
//
//                     draggedFeatureId = e.features[0].properties.id;
//                     map01.dragPan.disable(); // ドラッグ中は地図のパンを無効化
//                 });
//
//                 map01.on('mousemove', (e) => {
//                     if (!draggedFeatureId) return;
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
//                         // Firestoreへ保存
//                         const groupId = store.state.currentGroupId;
//                         const layerId = store.state.selectedLayerId;
//                         await saveLayerToFirestore(groupId, layerId, groupGeojson.value.features);
//                     }
//                 });
//
//                 // スマホ向けの変数と処理
//                 map01.on('touchstart', 'oh-point-layer', (e) => {
//                     if (!e.features.length) return;
//                     draggedFeatureId = e.features[0].properties.id;
//                     map01.dragPan.disable(); // 地図のパンを一時無効化
//                 });
//
//                 map01.on('touchmove', (e) => {
//                     if (!draggedFeatureId || !e.points || e.points.length === 0) return;
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
//
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
// }
