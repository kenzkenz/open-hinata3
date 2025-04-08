import store from '@/store'
import maplibregl from 'maplibre-gl'
import { db } from '@/firebase'
import { watch } from 'vue'
import { groupGeojson } from '@/js/layers'
import { popups } from '@/js/popup'
import { v4 as uuidv4 } from 'uuid'
import firebase from 'firebase/app'
import 'firebase/firestore'

let unsubscribeSnapshot = null
let lastClickTimestamp = 0
let previousIds = new Set()
let mapClickHandler = null
let isInitializing = false
let justChangedGroup = false
let isSaving = false

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
            map.setPaintProperty('oh-point-layer', 'circle-color', '#ff0000');
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
                        paint: { 'circle-radius': 6, 'circle-color': '#ff0000', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
                    }],
                    opacity: 1,
                    visibility: true,
                    attribution: '',
                    layerid: layerId
                }
            });
        }
    } else {
        groupGeojson.value.features = [];
        store.commit('setCurrentGroupLayers', []);
    }
}

function deleteAllPoints(currentGroupId) {
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
}

function handleMapClick(e, currentGroupId) {
    const map = store.state.map01;
    const layerId = store.state.selectedLayerId;
    if (!(e.target && e.target.classList.contains('point-remove'))) return;

    const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
    groupGeojson.value.features = groupGeojson.value.features.filter(
        f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
    );

    map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
    map.triggerRepaint();
    saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);

    popups.forEach(popup => popup.remove());
    popups.length = 0;
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

            if (isSaving || modifiedBy === myId) return;

            if (data && data.features) {
                const features = data.features || [];
                const currentIds = new Set(features.map(f => f.properties?.id));
                const newIds = [...currentIds].filter(id => !previousIds.has(id));
                const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
                const userNickname = store.state.myNickname;

                if (!isInitializing && !justChangedGroup) {
                    if (newIds.length > 0) {
                        store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`);
                    } else if (deletedIds.length > 0) {
                        store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`);
                    }
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
        });
}

function createMapClickHandler(map01) {
    return async (e) => {
        const now = Date.now();
        if (now - lastClickTimestamp < 300) return;
        lastClickTimestamp = now;

        const groupId = store.state.currentGroupId;
        const layerId = store.state.selectedLayerId;
        if (!groupId || !layerId) return;

        const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] });
        if (features.length > 0 || !e.lngLat) return;

        const { lng, lat } = e.lngLat;
        const newFeature = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: {
                id: uuidv4(),
                createdAt: Date.now(),
                createdBy: store.state.myNickname || '不明',
                description: 'テスト'
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
    };
}

export default function useGloupLayer() {
    let savedGroupId = localStorage.getItem('lastGroupId');
    let savedLayerId = localStorage.getItem('lastLayerId');

    // 初期化時に savedLayerId を検証し、無効ならデフォルトを設定
    const initializeGroupAndLayer = async () => {
        if (savedGroupId && savedLayerId) {
            const docRef = firebase.firestore()
                .collection('groups')
                .doc(savedGroupId)
                .collection('layers')
                .doc(savedLayerId);
            const doc = await docRef.get();
            if (doc.exists) {
                store.commit('setCurrentGroup', { id: savedGroupId, name: savedGroupId });
                store.commit('setSelectedLayerId', savedLayerId);
            } else {
                localStorage.removeItem('lastLayerId');
                store.commit('setSelectedLayerId', null);
                savedLayerId = null;
            }
        }

        if (savedGroupId && !savedLayerId) {
            const snapshot = await firebase.firestore()
                .collection('groups')
                .doc(savedGroupId)
                .collection('layers')
                .limit(1)
                .get();
            if (!snapshot.empty) {
                const firstLayer = snapshot.docs[0];
                savedLayerId = firstLayer.id;
                localStorage.setItem('lastLayerId', savedLayerId);
                store.commit('setSelectedLayerId', savedLayerId);
            }
        }
    };

    initializeGroupAndLayer().catch(e => console.error('初期化エラー:', e));

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
                        id: 'oh-point-layer',
                        type: 'circle',
                        source: 'oh-point-source',
                        paint: {
                            'circle-radius': 8,
                            'circle-color': '#ff0000',
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff'
                        }
                    });
                }

                await fetchAndSetGeojson(groupId, map01, layerId);
                setupFirestoreListener(groupId, layerId);

                if (mapClickHandler) map01.off('click', mapClickHandler);
                mapClickHandler = createMapClickHandler(map01);
                map01.on('click', mapClickHandler);
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


// import store from '@/store'
// import maplibregl from 'maplibre-gl'
// import { db } from '@/firebase'
// import { watch } from 'vue'
// import { groupGeojson } from '@/js/layers'
// import { popups } from '@/js/popup'
// import { v4 as uuidv4 } from 'uuid'
// import firebase from 'firebase/app'
// import 'firebase/firestore'
//
// let unsubscribeSnapshot = null
// let lastClickTimestamp = 0
// let previousIds = new Set()
// let mapClickHandler = null
// let isInitializing = false
// let justChangedGroup = false
// let isSaving = false
//
//
// async function fetchAndSetGeojson(groupId, map, layerId) {
//     if (groupId !== store.state.currentGroupId) return
//     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get()
//     const data = doc.data()
//
//     if (data && data.features) {
//         const newFeatures = data.features
//
//         // store 更新
//         const updated = store.state.currentGroupLayers.filter(l => l.id !== layerId)
//         updated.push({ id: layerId, name: `Layer_${layerId}`, features: newFeatures })
//         store.commit('setCurrentGroupLayers', updated)
//
//         groupGeojson.value.features = newFeatures
//
//         const source = map.getSource('oh-point-source')
//         if (source) {
//             source.setData({ type: 'FeatureCollection', features: newFeatures })
//             map.setPaintProperty('oh-point-layer', 'circle-color', '#ff0000')
//             map.triggerRepaint()
//         }
//
//         // ✅ レイヤーが選択状態にない場合、追加して構成
//         const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer')
//         if (!existing) {
//             store.commit('addSelectedLayer', {
//                 map: 'map01',
//                 layer: {
//                     id: 'oh-point-layer',
//                     label: `Layer_${layerId}`,
//                     sources: [{
//                         id: 'oh-point-source',
//                         obj: {
//                             type: 'geojson',
//                             data: {
//                                 type: 'FeatureCollection',
//                                 features: newFeatures
//                             }
//                         }
//                     }],
//                     layers: [{
//                         id: 'oh-point-layer',
//                         type: 'circle',
//                         source: 'oh-point-source',
//                         paint: {
//                             'circle-radius': 6,
//                             'circle-color': '#ff0000',
//                             'circle-stroke-width': 2,
//                             'circle-stroke-color': '#fff'
//                         }
//                     }],
//                     opacity: 1,
//                     visibility: true,
//                     attribution: '',
//                     layerid: layerId
//                 }
//             })
//         }
//     } else {
//         groupGeojson.value.features = []
//         store.commit('setCurrentGroupLayers', [])
//     }
// }
//
//
// // async function fetchAndSetGeojson(groupId, map, layerId) {
// //     if (groupId !== store.state.currentGroupId) return
// //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get()
// //     const data = doc.data()
// //     if (data && data.features) {
// //         groupGeojson.value = { type: 'FeatureCollection', features: data.features }
// //         const source = map?.getSource('oh-point-source')
// //         if (source) {
// //             source.setData(groupGeojson.value)
// //             map.triggerRepaint()
// //         }
// //
// //         // 🔁 上書きではなく追記する
// //         const current = store.state.currentGroupLayers.filter(l => l.id !== layerId)
// //         current.push({ id: layerId, name: `Layer_${layerId}`, features: data.features })
// //         store.commit('setCurrentGroupLayers', current)
// //
// //         // ✅ 明示的にレイヤーIDをセット
// //         store.commit('setSelectedLayerId', layerId)
// //     } else {
// //         groupGeojson.value = { type: 'FeatureCollection', features: [] }
// //         store.commit('setCurrentGroupLayers', [])
// //     }
// // }
//
//
// // async function fetchAndSetGeojson(groupId, map, layerId) {
// //     store.commit('setSelectedLayerId', layerId) // ←これを追加
// //     if (groupId !== store.state.currentGroupId) return
// //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get()
// //     const data = doc.data()
// //     if (data && data.features) {
// //         groupGeojson.value = { type: 'FeatureCollection', features: data.features }
// //         const source = map?.getSource('oh-point-source')
// //         if (source) {
// //             source.setData(groupGeojson.value)
// //             map.triggerRepaint()
// //         }
// //         store.commit('setCurrentGroupLayers', [{ id: layerId, name: `Layer_${layerId}`, features: data.features }])
// //     } else {
// //         groupGeojson.value = { type: 'FeatureCollection', features: [] }
// //         store.commit('setCurrentGroupLayers', [])
// //     }
// //     // 1. selectedLayers.map01 にレイヤー追加
// //     const existing = store.state.selectedLayers.map01.find(l => l.id === 'oh-point-layer')
// //     if (!existing) {
// //         store.commit('addSelectedLayer', {
// //             map: 'map01',
// //             layer: {
// //                 id: 'oh-point-layer',
// //                 label: `Layer_${layerId}`,
// //                 sources: [{
// //                     id: 'oh-point-source',
// //                     obj: {
// //                         type: 'geojson',
// //                         data: groupGeojson.value
// //                     }
// //                 }],
// //                 layers: [{
// //                     id: 'oh-point-layer',
// //                     type: 'circle',
// //                     source: 'oh-point-source',
// //                     paint: {
// //                         'circle-radius': 6,
// //                         'circle-color': '#ff0000',
// //                         'circle-stroke-width': 2,
// //                         'circle-stroke-color': '#fff'
// //                     }
// //                 }],
// //                 opacity: 1,
// //                 visibility: true,
// //                 attribution: '',
// //                 layerid: layerId
// //             }
// //         })
// //     }
// //
// // // 2. Firestoreのリアルタイム監視も確実に
// //     setupFirestoreListener(groupId, layerId)
// //
// // }
//
// function deleteAllPoints(currentGroupId) {
//     groupGeojson.value.features = []
//     const map = store.state.map01
//     if (map && map.getSource('oh-point-source')) {
//         map.getSource('oh-point-source').setData({
//             type: 'FeatureCollection',
//             features: []
//         })
//         map.triggerRepaint()
//     }
//     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features)
// }
//
// function handleMapClick(e, currentGroupId) {
//     const map = store.state.map01
//     const layerId = store.state.selectedLayerId
//     if (!(e.target && e.target.classList.contains('point-remove'))) return
//
//     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)))
//     groupGeojson.value.features = groupGeojson.value.features.filter(
//         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
//     )
//
//     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features })
//     map.triggerRepaint()
//     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features)
//
//     popups.forEach(popup => popup.remove())
//     popups.length = 0
// }
//
// async function saveLayerToFirestore(groupId, layerId, features) {
//     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return
//     isSaving = true
//     try {
//         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId)
//         const doc = await docRef.get()
//         if (!doc.exists) return
//
//         await docRef.set({
//             features: features,
//             groupId: groupId,
//             lastModifiedBy: store.state.userId,
//             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
//         }, { merge: true })
//
//         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId)
//         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features })
//         store.commit('setCurrentGroupLayers', updatedLayers)
//         groupGeojson.value.features = features
//     } catch (e) {
//         console.error('Firestore 更新エラー:', e)
//     } finally {
//         await new Promise(resolve => setTimeout(resolve, 200))
//         isSaving = false
//     }
// }
//
// function setupFirestoreListener(groupId, layerId) {
//     if (groupId !== store.state.currentGroupId || !layerId) return
//
//     const map01 = store.state.map01
//     if (unsubscribeSnapshot) unsubscribeSnapshot()
//
//     unsubscribeSnapshot = firebase.firestore()
//         .collection('groups')
//         .doc(groupId)
//         .collection('layers')
//         .doc(layerId)
//         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
//             const data = doc.data()
//             const modifiedBy = data?.lastModifiedBy
//             const myId = store.state.userId
//
//             if (isSaving || modifiedBy === myId) return
//
//             if (data && data.features) {
//                 const features = data.features || []
//                 const currentIds = new Set(features.map(f => f.properties?.id))
//                 const newIds = [...currentIds].filter(id => !previousIds.has(id))
//                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
//                 const userNickname = store.state.myNickname
//
//                 if (!isInitializing && !justChangedGroup) {
//                     if (newIds.length === 1) {
//                         store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`)
//                     } else if (deletedIds.length === 1) {
//                         store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`)
//                     }
//                 }
//
//                 previousIds = currentIds
//
//                 const source = map01.getSource('oh-point-source')
//                 const currentData = groupGeojson.value.features
//                 const newDataStr = JSON.stringify(features)
//                 const currentDataStr = JSON.stringify(currentData)
//
//                 groupGeojson.value.features = features
//                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId)
//                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features })
//                 store.commit('setCurrentGroupLayers', updatedLayers)
//
//                 if (source && newDataStr !== currentDataStr) {
//                     setTimeout(() => {
//                         source.setData({ type: 'FeatureCollection', features })
//                         map01.triggerRepaint()
//                     }, 200)
//                 }
//             } else {
//                 groupGeojson.value.features = []
//                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId))
//                 const source = map01.getSource('oh-point-source')
//                 if (source) {
//                     source.setData({ type: 'FeatureCollection', features: [] })
//                     map01.triggerRepaint()
//                 }
//                 if (store.state.selectedLayerId === layerId) {
//                     store.commit('setSelectedLayerId', null)
//                     localStorage.removeItem('lastLayerId')
//                 }
//             }
//         }, (error) => {
//             console.error('Snapshot エラー:', error)
//         })
// }
//
// function createMapClickHandler(map01) {
//     return async (e) => {
//         const now = Date.now()
//         if (now - lastClickTimestamp < 300) return
//         lastClickTimestamp = now
//
//         const groupId = store.state.currentGroupId
//         const layerId = store.state.selectedLayerId
//         if (!groupId || !layerId) return
//
//         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] })
//         if (features.length > 0 || !e.lngLat) return
//
//         const { lng, lat } = e.lngLat
//         const newFeature = {
//             type: 'Feature',
//             geometry: { type: 'Point', coordinates: [lng, lat] },
//             properties: {
//                 id: uuidv4(),
//                 createdAt: Date.now(),
//                 createdBy: store.state.myNickname || '不明',
//                 description: 'テスト'
//             }
//         }
//
//         const source = map01.getSource('oh-point-source')
//         const currentFeatures = groupGeojson.value.features || []
//         const updatedFeatures = [...currentFeatures, newFeature]
//
//         groupGeojson.value.features = updatedFeatures
//
//         if (source) {
//             setTimeout(() => {
//                 source.setData({
//                     type: 'FeatureCollection',
//                     features: updatedFeatures
//                 })
//                 map01.triggerRepaint()
//             }, 100)
//         }
//
//         if (!isInitializing) {
//             await saveLayerToFirestore(groupId, layerId, updatedFeatures)
//         }
//     }
// }
//
//
// export default function useGloupLayer() {
//     const savedGroupId = localStorage.getItem('lastGroupId')
//     let savedLayerId = localStorage.getItem('lastLayerId')
//
//     // savedLayerId が null の場合、Firestoreから最初のレイヤーを取得してセットする
//     if (savedGroupId && !savedLayerId) {
//         firebase.firestore()
//             .collection('groups')
//             .doc(savedGroupId)
//             .collection('layers')
//             .limit(1)
//             .get()
//             .then(snapshot => {
//                 if (!snapshot.empty) {
//                     const firstLayer = snapshot.docs[0]
//                     savedLayerId = firstLayer.id
//                     localStorage.setItem('lastLayerId', savedLayerId)
//                     store.commit('setSelectedLayerId', savedLayerId)
//                 }
//             })
//             .catch(e => {
//                 console.error('初期レイヤーの取得に失敗しました', e)
//             })
//     }
//
//     if (savedGroupId && savedLayerId) {
//         store.commit('setCurrentGroup', { id: savedGroupId, name: savedGroupId })
//         store.commit('setSelectedLayerId', savedLayerId)
//     }
//
//     watch(
//         () => [store.state.map01, store.state.currentGroupId],
//         async ([map01, groupId]) => {
//             if (!map01) return
//
//             const initializeMap = async () => {
//                 if (!map01.getSource('oh-point-source')) {
//                     map01.addSource('oh-point-source', {
//                         type: 'geojson',
//                         data: { type: 'FeatureCollection', features: [] }
//                     })
//                 }
//                 if (!map01.getLayer('oh-point-layer')) {
//                     map01.addLayer({
//                         id: 'oh-point-layer',
//                         type: 'circle',
//                         source: 'oh-point-source',
//                         paint: {
//                             'circle-radius': 8,
//                             'circle-color': '#ff0000',
//                             'circle-stroke-width': 2,
//                             'circle-stroke-color': '#ffffff'
//                         }
//                     })
//                 }
//
//                 if (savedGroupId && savedLayerId) {
//                     const docRef = firebase.firestore().collection('groups').doc(savedGroupId).collection('layers').doc(savedLayerId)
//                     const doc = await docRef.get()
//                     if (!doc.exists) {
//                         store.commit('setSelectedLayerId', null)
//                         localStorage.removeItem('lastLayerId')
//                     } else {
//                         await fetchAndSetGeojson(savedGroupId, map01, savedLayerId)
//                         if (!store.state.selectedLayers.map01.some(l => l.id === 'oh-point-layer')) {
//                             store.commit('addSelectedLayer', { map: 'map01', layer: { id: 'oh-point-layer' } })
//                         }
//                         setupFirestoreListener(savedGroupId, savedLayerId)
//                     }
//                 }
//
//                 if (mapClickHandler) map01.off('click', mapClickHandler)
//                 mapClickHandler = createMapClickHandler(map01)
//                 map01.on('click', mapClickHandler)
//             }
//
//             if (!groupId) {
//                 if (unsubscribeSnapshot) {
//                     unsubscribeSnapshot()
//                     unsubscribeSnapshot = null
//                 }
//                 if (map01.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer')
//                 if (map01.getSource('oh-point-source')) map01.removeSource('oh-point-source')
//                 store.commit('clearSelectedLayers', 'map01')
//                 groupGeojson.value.features = []
//                 store.commit('setCurrentGroupLayers', [])
//                 previousIds = new Set()
//                 localStorage.removeItem('lastLayerId')
//                 return
//             }
//
//             if (map01.isStyleLoaded()) {
//                 await initializeMap()
//             } else {
//                 map01.on('load', async () => await initializeMap())
//             }
//
//             localStorage.setItem('lastGroupId', groupId)
//             // const layerId = store.state.selectedLayerId
//             // if (layerId) {
//             //     const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId)
//             //     const doc = await docRef.get()
//             //     if (!doc.exists) {
//             //         store.commit('setSelectedLayerId', null)
//             //         localStorage.removeItem('lastLayerId')
//             //     } else {
//             //         localStorage.setItem('lastLayerId', layerId)
//             //         await fetchAndSetGeojson(groupId, map01, layerId)
//             //         setupFirestoreListener(groupId, layerId)
//             //     }
//             // }
//
//             justChangedGroup = false
//             isInitializing = false
//         },
//         { immediate: true }
//     )
//
//     watch(
//         () => store.state.selectedLayers.map01,
//         async (selectedLayers) => {
//             const map = store.state.map01
//             const groupId = store.state.currentGroupId
//             if (!map || !groupId) return
//
//             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer')
//             if (hasGroupLayer && !isInitializing) {
//                 const layerId = store.state.selectedLayerId
//                 if (layerId) {
//                     await fetchAndSetGeojson(groupId, map, layerId)
//                     previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
//                 }
//             }
//
//             // ⛔ localStorage 書き込みを一時停止
//             // localStorage.setItem('selectedLayers_map01', JSON.stringify(selectedLayers))
//         },
//         { deep: true }
//     )
// }
//
//
//
// // export default function useGloupLayer() {
// //     const savedGroupId = localStorage.getItem('lastGroupId')
// //     const savedLayerId = localStorage.getItem('lastLayerId')
// //     if (savedGroupId && savedLayerId) {
// //         store.commit('setCurrentGroup', { id: savedGroupId, name: savedGroupId })
// //         store.commit('setSelectedLayerId', savedLayerId)
// //     }
// //
// //     watch(
// //         () => [store.state.map01, store.state.currentGroupId],
// //         async ([map01, groupId]) => {
// //             if (!map01) return
// //
// //             const initializeMap = async () => {
// //                 const savedGroupId = localStorage.getItem('lastGroupId')
// //                 const savedLayerId = localStorage.getItem('lastLayerId')
// //                 if (!map01.getSource('oh-point-source')) {
// //                     map01.addSource('oh-point-source', {
// //                         type: 'geojson',
// //                         data: { type: 'FeatureCollection', features: [] }
// //                     })
// //                 }
// //                 if (!map01.getLayer('oh-point-layer')) {
// //                     map01.addLayer({
// //                         id: 'oh-point-layer',
// //                         type: 'circle',
// //                         source: 'oh-point-source',
// //                         paint: {
// //                             'circle-radius': 8,
// //                             'circle-color': '#ff0000',
// //                             'circle-stroke-width': 2,
// //                             'circle-stroke-color': '#ffffff'
// //                         }
// //                     })
// //                 }
// //
// //                 alert(444)
// //                 alert(`🟢 savedGroupId: ${savedGroupId}, savedLayerId: ${savedLayerId}`)  // ✅ デバッグ確認用
// //
// //                 if (savedGroupId && savedLayerId) {
// //                     alert(555)
// //                     const docRef = firebase.firestore().collection('groups').doc(savedGroupId).collection('layers').doc(savedLayerId)
// //                     const doc = await docRef.get()
// //                     if (!doc.exists) {
// //                         store.commit('setSelectedLayerId', null)
// //                         localStorage.removeItem('lastLayerId')
// //                         alert(666)
// //                     } else {
// //                         await fetchAndSetGeojson(savedGroupId, map01, savedLayerId)
// //                         if (!store.state.selectedLayers.map01.some(l => l.id === 'oh-point-layer')) {
// //                             store.commit('addSelectedLayer', { map: 'map01', layer: { id: 'oh-point-layer' } })
// //                         }
// //                         setupFirestoreListener(savedGroupId, savedLayerId)
// //                         alert(777)
// //                         setTimeout(() => {
// //                             alert(888)
// //                             const layerData = store.state.currentGroupLayers.find(l => l.id === savedLayerId)
// //                             if (layerData) {
// //                                 const mapLayers = store.state.selectedLayers.map01
// //                                 const exists = mapLayers.find(l => l.id === 'oh-point-layer')
// //                                 if (!exists) {
// //                                     store.commit('addSelectedLayer', {
// //                                         map: 'map01',
// //                                         layer: {
// //                                             id: 'oh-point-layer',
// //                                             label: layerData.name,
// //                                             sources: [{
// //                                                 id: 'oh-point-source',
// //                                                 obj: {
// //                                                     type: 'geojson',
// //                                                     data: {
// //                                                         type: 'FeatureCollection',
// //                                                         features: layerData.features
// //                                                     }
// //                                                 }
// //                                             }],
// //                                             layers: [{
// //                                                 id: 'oh-point-layer',
// //                                                 type: 'circle',
// //                                                 source: 'oh-point-source',
// //                                                 paint: {
// //                                                     'circle-radius': 6,
// //                                                     'circle-color': layerData.color || '#ff0000',
// //                                                     'circle-stroke-width': 2,
// //                                                     'circle-stroke-color': '#fff'
// //                                                 }
// //                                             }],
// //                                             opacity: 1,
// //                                             visibility: true,
// //                                             attribution: '',
// //                                             layerid: savedLayerId
// //                                         }
// //                                     })
// //                                 }
// //
// //                                 // ソースとレイヤーが存在していたらデータだけ更新
// //                                 const source = map01.getSource('oh-point-source')
// //                                 if (source) {
// //                                     source.setData({
// //                                         type: 'FeatureCollection',
// //                                         features: layerData.features
// //                                     })
// //                                     map01.setPaintProperty('oh-point-layer', 'circle-color', layerData.color || '#ff0000')
// //                                     map01.triggerRepaint()
// //                                 }
// //                             }
// //
// //                         },5000)
// //                     }
// //                 }
// //                 if (mapClickHandler) map01.off('click', mapClickHandler)
// //                 mapClickHandler = createMapClickHandler(map01)
// //                 map01.on('click', mapClickHandler)
// //             }
// //
// //             if (!groupId) {
// //                 if (unsubscribeSnapshot) {
// //                     unsubscribeSnapshot()
// //                     unsubscribeSnapshot = null
// //                 }
// //                 if (map01.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer')
// //                 if (map01.getSource('oh-point-source')) map01.removeSource('oh-point-source')
// //                 store.commit('clearSelectedLayers', 'map01')
// //                 groupGeojson.value.features = []
// //                 store.commit('setCurrentGroupLayers', [])
// //                 previousIds = new Set()
// //                 localStorage.removeItem('lastLayerId')
// //                 return
// //             }
// //
// //             if (map01.isStyleLoaded()) {
// //                 await initializeMap()
// //             } else {
// //                 map01.on('load', async () => await initializeMap())
// //             }
// //
// //             localStorage.setItem('lastGroupId', groupId)
// //             const layerId = store.state.selectedLayerId
// //             if (layerId) {
// //                 const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId)
// //                 const doc = await docRef.get()
// //                 if (!doc.exists) {
// //                     store.commit('setSelectedLayerId', null)
// //                     localStorage.removeItem('lastLayerId')
// //                 } else {
// //                     localStorage.setItem('lastLayerId', layerId)
// //                     await fetchAndSetGeojson(groupId, map01, layerId)
// //                     setupFirestoreListener(groupId, layerId)
// //                 }
// //             }
// //
// //             justChangedGroup = false
// //             isInitializing = false
// //         },
// //         { immediate: true }
// //     )
// //
// //     watch(
// //         () => store.state.selectedLayers.map01,
// //         async (selectedLayers) => {
// //             const map = store.state.map01
// //             const groupId = store.state.currentGroupId
// //             if (!map || !groupId) return
// //
// //             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer')
// //             if (hasGroupLayer && !isInitializing) {
// //                 const layerId = store.state.selectedLayerId
// //                 if (layerId) {
// //                     await fetchAndSetGeojson(groupId, map, layerId)
// //                     previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
// //                 }
// //             }
// //
// //             // ⛔ localStorage 書き込みを一時停止
// //             // localStorage.setItem('selectedLayers_map01', JSON.stringify(selectedLayers))
// //         },
// //         { deep: true }
// //     )
// // }
//
//
//
//
//
// // import store from '@/store'
// // import maplibregl from 'maplibre-gl'
// // import { db } from '@/firebase'
// // import { watch } from 'vue'
// // import { groupGeojson } from '@/js/layers'
// // import { popups } from '@/js/popup'
// // import { v4 as uuidv4 } from 'uuid'
// // import firebase from 'firebase/app'
// // import 'firebase/firestore'
// //
// // let unsubscribeSnapshot = null
// // let lastClickTimestamp = 0
// // let previousIds = new Set()
// // let mapClickHandler = null
// // let isInitializing = false
// // let justChangedGroup = false
// // let isSaving = false
// //
// //
// // async function fetchAndSetGeojson(groupId, map, layerId) {
// //     if (groupId !== store.state.currentGroupId) return
// //     const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get()
// //     const data = doc.data()
// //     if (data && data.features) {
// //         groupGeojson.value = { type: 'FeatureCollection', features: data.features }
// //         const source = map?.getSource('oh-point-source')
// //         if (source) {
// //             source.setData(groupGeojson.value)
// //             map.triggerRepaint()
// //         }
// //         store.commit('setCurrentGroupLayers', [{ id: layerId, name: `Layer_${layerId}`, features: data.features }])
// //     } else {
// //         groupGeojson.value = { type: 'FeatureCollection', features: [] }
// //         store.commit('setCurrentGroupLayers', [])
// //     }
// // }
// //
// // function deleteAllPoints(currentGroupId) {
// //     groupGeojson.value.features = []
// //     const map = store.state.map01
// //     if (map && map.getSource('oh-point-source')) {
// //         map.getSource('oh-point-source').setData({
// //             type: 'FeatureCollection',
// //             features: []
// //         })
// //         map.triggerRepaint()
// //     }
// //     saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features)
// // }
// //
// // function handleMapClick(e, currentGroupId) {
// //     const map = store.state.map01
// //     const layerId = store.state.selectedLayerId
// //     if (!(e.target && e.target.classList.contains('point-remove'))) return
// //
// //     const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)))
// //     groupGeojson.value.features = groupGeojson.value.features.filter(
// //         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
// //     )
// //
// //     map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features })
// //     map.triggerRepaint()
// //     saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features)
// //
// //     popups.forEach(popup => popup.remove())
// //     popups.length = 0
// // }
// //
// // async function saveLayerToFirestore(groupId, layerId, features) {
// //     if (!groupId || groupId !== store.state.currentGroupId || !layerId) return
// //     isSaving = true
// //     try {
// //         const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId)
// //         const doc = await docRef.get()
// //         if (!doc.exists) return
// //
// //         await docRef.set({
// //             features: features,
// //             groupId: groupId,
// //             lastModifiedBy: store.state.userId,
// //             lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
// //         }, { merge: true })
// //
// //         const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId)
// //         updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features })
// //         store.commit('setCurrentGroupLayers', updatedLayers)
// //         groupGeojson.value.features = features
// //     } catch (e) {
// //         console.error('Firestore 更新エラー:', e)
// //     } finally {
// //         await new Promise(resolve => setTimeout(resolve, 200))
// //         isSaving = false
// //     }
// // }
// //
// // function setupFirestoreListener(groupId, layerId) {
// //     if (groupId !== store.state.currentGroupId || !layerId) return
// //
// //     const map01 = store.state.map01
// //     if (unsubscribeSnapshot) unsubscribeSnapshot()
// //
// //     unsubscribeSnapshot = firebase.firestore()
// //         .collection('groups')
// //         .doc(groupId)
// //         .collection('layers')
// //         .doc(layerId)
// //         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
// //             const data = doc.data()
// //             const modifiedBy = data?.lastModifiedBy
// //             const myId = store.state.userId
// //
// //             if (isSaving || modifiedBy === myId) return
// //
// //             if (data && data.features) {
// //                 const features = data.features || []
// //                 const currentIds = new Set(features.map(f => f.properties?.id))
// //                 const newIds = [...currentIds].filter(id => !previousIds.has(id))
// //                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
// //                 const userNickname = store.state.myNickname
// //
// //                 if (!isInitializing && !justChangedGroup) {
// //                     if (newIds.length === 1) {
// //                         store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`)
// //                     } else if (deletedIds.length === 1) {
// //                         store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`)
// //                     }
// //                 }
// //
// //                 previousIds = currentIds
// //
// //                 const source = map01.getSource('oh-point-source')
// //                 const currentData = groupGeojson.value.features
// //                 const newDataStr = JSON.stringify(features)
// //                 const currentDataStr = JSON.stringify(currentData)
// //
// //                 groupGeojson.value.features = features
// //                 const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId)
// //                 updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features })
// //                 store.commit('setCurrentGroupLayers', updatedLayers)
// //
// //                 if (source && newDataStr !== currentDataStr) {
// //                     setTimeout(() => {
// //                         source.setData({ type: 'FeatureCollection', features })
// //                         map01.triggerRepaint()
// //                     }, 200)
// //                 }
// //             } else {
// //                 groupGeojson.value.features = []
// //                 store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId))
// //                 const source = map01.getSource('oh-point-source')
// //                 if (source) {
// //                     source.setData({ type: 'FeatureCollection', features: [] })
// //                     map01.triggerRepaint()
// //                 }
// //                 if (store.state.selectedLayerId === layerId) {
// //                     store.commit('setSelectedLayerId', null)
// //                     localStorage.removeItem('lastLayerId')
// //                 }
// //             }
// //         }, (error) => {
// //             console.error('Snapshot エラー:', error)
// //         })
// // }
// //
// // function createMapClickHandler(map01) {
// //     return async (e) => {
// //         const now = Date.now()
// //         if (now - lastClickTimestamp < 300) return
// //         lastClickTimestamp = now
// //
// //         const groupId = store.state.currentGroupId
// //         const layerId = store.state.selectedLayerId
// //         if (!groupId || !layerId) return
// //
// //         const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] })
// //         if (features.length > 0 || !e.lngLat) return
// //
// //         const { lng, lat } = e.lngLat
// //         const newFeature = {
// //             type: 'Feature',
// //             geometry: { type: 'Point', coordinates: [lng, lat] },
// //             properties: {
// //                 id: uuidv4(),
// //                 createdAt: Date.now(),
// //                 createdBy: store.state.myNickname || '不明',
// //                 description: 'テスト'
// //             }
// //         }
// //
// //         const source = map01.getSource('oh-point-source')
// //         const currentFeatures = groupGeojson.value.features || []
// //         const updatedFeatures = [...currentFeatures, newFeature]
// //
// //         groupGeojson.value.features = updatedFeatures
// //
// //         if (source) {
// //             setTimeout(() => {
// //                 source.setData({
// //                     type: 'FeatureCollection',
// //                     features: updatedFeatures
// //                 })
// //                 map01.triggerRepaint()
// //             }, 100)
// //         }
// //
// //         if (!isInitializing) {
// //             await saveLayerToFirestore(groupId, layerId, updatedFeatures)
// //         }
// //     }
// // }
// //
// // export default function useGloupLayer() {
// //     const savedGroupId = localStorage.getItem('lastGroupId')
// //     const savedLayerId = localStorage.getItem('lastLayerId')
// //     if (savedGroupId && savedLayerId) {
// //         store.commit('setCurrentGroup', { id: savedGroupId, name: savedGroupId })
// //         store.commit('setSelectedLayerId', savedLayerId)
// //     }
// //
// //     watch(
// //         () => [store.state.map01, store.state.currentGroupId],
// //         async ([map01, groupId]) => {
// //             if (!map01) return
// //
// //             const initializeMap = async () => {
// //                 if (!map01.getSource('oh-point-source')) {
// //                     map01.addSource('oh-point-source', {
// //                         type: 'geojson',
// //                         data: { type: 'FeatureCollection', features: [] }
// //                     })
// //                 }
// //                 if (!map01.getLayer('oh-point-layer')) {
// //                     map01.addLayer({
// //                         id: 'oh-point-layer',
// //                         type: 'circle',
// //                         source: 'oh-point-source',
// //                         paint: {
// //                             'circle-radius': 8,
// //                             'circle-color': '#ff0000',
// //                             'circle-stroke-width': 2,
// //                             'circle-stroke-color': '#ffffff'
// //                         }
// //                     })
// //                 }
// //
// //                 if (savedGroupId && savedLayerId) {
// //                     const docRef = firebase.firestore().collection('groups').doc(savedGroupId).collection('layers').doc(savedLayerId)
// //                     const doc = await docRef.get()
// //                     if (!doc.exists) {
// //                         store.commit('setSelectedLayerId', null)
// //                         localStorage.removeItem('lastLayerId')
// //                     } else {
// //                         await fetchAndSetGeojson(savedGroupId, map01, savedLayerId)
// //                         if (!store.state.selectedLayers.map01.some(l => l.id === 'oh-point-layer')) {
// //                             store.commit('addSelectedLayer', { map: 'map01', layer: { id: 'oh-point-layer' } })
// //                         }
// //                     }
// //                 }
// //
// //                 if (mapClickHandler) map01.off('click', mapClickHandler)
// //                 mapClickHandler = createMapClickHandler(map01)
// //                 map01.on('click', mapClickHandler)
// //             }
// //
// //             if (!groupId) {
// //                 if (unsubscribeSnapshot) {
// //                     unsubscribeSnapshot()
// //                     unsubscribeSnapshot = null
// //                 }
// //                 if (map01.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer')
// //                 if (map01.getSource('oh-point-source')) map01.removeSource('oh-point-source')
// //                 store.commit('clearSelectedLayers', 'map01')
// //                 groupGeojson.value.features = []
// //                 store.commit('setCurrentGroupLayers', [])
// //                 previousIds = new Set()
// //                 localStorage.removeItem('lastLayerId')
// //                 return
// //             }
// //
// //             if (map01.isStyleLoaded()) {
// //                 await initializeMap()
// //             } else {
// //                 map01.on('load', async () => await initializeMap())
// //             }
// //
// //             localStorage.setItem('lastGroupId', groupId)
// //             const layerId = store.state.selectedLayerId
// //             if (layerId) {
// //                 const docRef = firebase.firestore().collection('groups').doc(groupId).collection('layers').doc(layerId)
// //                 const doc = await docRef.get()
// //                 if (!doc.exists) {
// //                     store.commit('setSelectedLayerId', null)
// //                     localStorage.removeItem('lastLayerId')
// //                 } else {
// //                     localStorage.setItem('lastLayerId', layerId)
// //                     await fetchAndSetGeojson(groupId, map01, layerId)
// //                     setupFirestoreListener(groupId, layerId)
// //                 }
// //             }
// //
// //             justChangedGroup = false
// //             isInitializing = false
// //         },
// //         { immediate: true }
// //     )
// //
// //     watch(
// //         () => store.state.selectedLayers.map01,
// //         async (selectedLayers) => {
// //             const map = store.state.map01
// //             const groupId = store.state.currentGroupId
// //             if (!map || !groupId) return
// //
// //             const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer')
// //             if (hasGroupLayer && !isInitializing) {
// //                 const layerId = store.state.selectedLayerId
// //                 if (layerId) {
// //                     await fetchAndSetGeojson(groupId, map, layerId)
// //                     previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
// //                 }
// //             }
// //
// //             // ⛔ localStorage 書き込みを一時停止
// //             // localStorage.setItem('selectedLayers_map01', JSON.stringify(selectedLayers))
// //         },
// //         { deep: true }
// //     )
// // }
