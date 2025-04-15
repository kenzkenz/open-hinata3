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

async function pingServer(source = 'interval', retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await firebase.firestore().collection('ping').doc('status').get();
            console.log(`Ping success (${source}, attempt ${i + 1}/${retries})`);
            if (isSyncFailed) {
                isSyncFailed = false;
                store.dispatch('triggerSnackbarForGroup', { message: 'サーバーに接続できました。操作を再開できます。' });
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
        // Firestoreからデータ取得
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
        console.log('取得データ: ', JSON.stringify(data, null, 2));

        if (data && data.features) {
            const newFeatures = data.features;
            const layerName = data.name || `Layer_${layerId}`;
            console.log('地物データ: features=', newFeatures.length, 'layerName=', layerName);

            // Vuexストア更新
            const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
            updatedLayers.push({ id: layerId, name: layerName, features: newFeatures });
            store.commit('setCurrentGroupLayers', updatedLayers);
            console.log('Vuex: currentGroupLayers更新: ', JSON.stringify(updatedLayers, null, 2));

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
        store.dispatch('triggerSnackbarForGroup', { message: `データ取得に失敗: ${e.message}` });
    }
}
// async function fetchAndSetGeojson(groupId, map, layerId) {
//     if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
//     try {
//         const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
//         const doc = await docRef.get({ source: 'server' });
//         const data = doc.data();
//         console.log('Firestoreから取得した生データ（全フィールド）:', JSON.stringify(data, null, 2));
//
//         if (data && data.features) {
//             const newFeatures = data.features;
//             const layerName = data.name || `Layer_${layerId}`;
//
//             // Vuexストアを更新
//             const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//             updatedLayers.push({ id: layerId, name: layerName, features: newFeatures });
//             store.commit('setCurrentGroupLayers', updatedLayers);
//             console.log('更新後のcurrentGroupLayers:', store.state.currentGroupLayers);
//
//             // マップソースを更新
//             const source = map.getSource('oh-point-source');
//             if (source) {
//                 source.setData({ type: 'FeatureCollection', features: newFeatures });
//                 map.triggerRepaint();
//             }
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
//             console.log('データが存在しないか、featuresが空です');
//             store.commit('setCurrentGroupLayers', []);
//             const source = map.getSource('oh-point-source');
//             if (source) {
//                 source.setData({ type: 'FeatureCollection', features: [] });
//                 map.triggerRepaint();
//             }
//         }
//     } catch (e) {
//         console.error('データ取得エラー:', e);
//         store.dispatch('triggerSnackbarForGroup', { message: 'データの取得に失敗しました' });
//     }
// }

export function deleteAllPoints(currentGroupId) {
    if (isSyncFailed) {
        store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。ポイントを削除できません。' });
        return;
    }

    const layerId = store.state.selectedLayerId;
    const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
    if (currentLayer) {
        currentLayer.features = [];
        store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
    }

    const map = store.state.map01;
    if (map && map.getSource('oh-point-source')) {
        map.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: [] });
        map.triggerRepaint();
    }

    saveLayerToFirestore(currentGroupId, layerId, []);
    store.dispatch('triggerSnackbarForGroup', { message: 'すべてのポイントを削除しました' });
}

function handleMapClick(e, currentGroupId) {
    const map = store.state.map01;
    const layerId = store.state.selectedLayerId;

    if (!(e.target && e.target.classList.contains('point-remove'))) return;

    if (isSyncFailed) {
        store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。ポイントを削除できません。' });
        return;
    }

    const idsToDelete = new Set((map.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] }) || []).map(f => String(f.properties?.id)));
    if (idsToDelete.size === 0) return;

    const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
    if (!currentLayer) {
        store.dispatch('triggerSnackbarForGroup', { message: '選択中のレイヤーが見つかりません。' });
        return;
    }

    currentLayer.features = currentLayer.features.filter(f => f.properties?.id && !idsToDelete.has(String(f.properties.id)));
    store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);

    const mapSource = map.getSource('oh-point-source');
    if (mapSource) {
        mapSource.setData({ type: 'FeatureCollection', features: currentLayer.features });
        map.triggerRepaint();
    }

    saveLayerToFirestore(currentGroupId, layerId, currentLayer.features);

    popups.forEach(popup => popup.remove());
    popups.length = 0;

    store.dispatch('triggerSnackbarForGroup', { message: `${idsToDelete.size} 件のポイントを削除しました` });
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

async function saveSelectedPointToFirestore() {
    if (isSyncFailed) {
        store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。ポイントを保存できません。' });
        return;
    }

    const feature = store.state.selectedPointFeature;
    const groupId = store.state.currentGroupId;
    const layerId = store.state.selectedLayerId;

    if (!feature || !feature.properties || !groupId || !layerId) {
        store.dispatch('triggerSnackbarForGroup', { message: '保存するポイント、グループ、またはレイヤーが選択されていません。' });
        return;
    }

    try {
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get({ source: 'server' });
        if (!doc.exists) {
            console.warn('ドキュメントが存在しません');
            store.dispatch('triggerSnackbarForGroup', { message: 'レイヤーが存在しません。' });
            return;
        }

        const currentData = doc.data();
        let features = currentData.features || [];

        // 既存のポイントを更新、または新規追加
        const featureIndex = features.findIndex(f => f.properties.id === feature.properties.id);
        if (featureIndex >= 0) {
            features[featureIndex] = feature;
        } else {
            features.push(feature);
        }

        await docRef.update({
            features: features,
            lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastModifiedBy: store.state.userId
        });

        // ローカル状態を更新
        const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
        if (currentLayer) {
            currentLayer.features = features;
            store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
        }

        const map = store.state.map01;
        if (map && map.getSource('oh-point-source')) {
            map.getSource('oh-point-source').setData({
                type: 'FeatureCollection',
                features: features
            });
            map.triggerRepaint();
        }

        store.dispatch('triggerSnackbarForGroup', { message: 'ポイントを保存しました' });
    } catch (error) {
        console.error('ポイント保存エラー:', error);
        store.dispatch('triggerSnackbarForGroup', { message: 'ポイントの保存に失敗しました: ' + error.message });
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
                        const features = data.features || [];
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
                        // console.log('Vuex: currentGroupLayers更新: ', JSON.stringify(store.state.currentGroupLayers, null, 2));

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
//             if (isSaving) return; // 保存中はリスナーを無視
//             const data = doc.data();
//             if (data && data.features && !doc.metadata.fromCache) {
//                 const features = data.features || [];
//                 const layerName = data.name || `Layer_${layerId}`;
//
//                 const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
//                 if (currentLayer) {
//                     currentLayer.features = features;
//                 } else {
//                     const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
//                     updatedLayers.push({ id: layerId, name: layerName, features });
//                     store.commit('setCurrentGroupLayers', updatedLayers);
//                 }
//                 store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
//
//                 const map01 = store.state.map01;
//                 if (map01 && map01.getSource('oh-point-source')) {
//                     map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features });
//                     map01.triggerRepaint();
//                 }
//                 console.log('リスナー更新後のcurrentGroupLayers:', store.state.currentGroupLayers);
//             } else if (!data || !data.features) {
//                 const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
//                 if (currentLayer) {
//                     currentLayer.features = [];
//                     store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);
//                 }
//                 const map01 = store.state.map01;
//                 if (map01 && map01.getSource('oh-point-source')) {
//                     map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: [] });
//                     map01.triggerRepaint();
//                 }
//             }
//         }, (error) => {
//             console.error('Snapshot エラー:', error);
//             isSyncFailed = true;
//             store.dispatch('triggerSnackbarForGroup', { message: 'リアルタイム同期に失敗しました。操作が制限されています。' });
//         });
// }

function createMapClickHandler(map01) {
    return async (e) => {
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

        // 選択中のレイヤーのfeaturesを取得
        const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
        if (!currentLayer) {
            store.dispatch('triggerSnackbarForGroup', { message: '選択中のレイヤーが見つかりません。' });
            return;
        }

        // 選択中のレイヤーのfeaturesに追加
        const currentFeatures = currentLayer.features || [];
        currentFeatures.push(newFeature);
        currentLayer.features = currentFeatures;

        // Vuexストアを更新
        store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);

        // 共有ソースを更新
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
            // Firestoreに保存
            await saveLayerToFirestore(groupId, layerId, currentLayer.features);
        }

        // 選択地物を設定
        store.commit('setSelectedPointFeature', newFeature);

        // ドロワーを開く
        await new Promise(resolve => setTimeout(resolve, 100));
        store.commit('setPointInfoDrawer', true);

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
        }, 3000);
    };

    initializeGroupAndLayer();

    watch(
        () => [store.state.map01, store.state.currentGroupId, store.state.selectedLayerId],
        async ([map01, groupId, layerId]) => {
            if (!map01 || !groupId || !layerId) {
                if (unsubscribeSnapshot) unsubscribeSnapshot();
                if (pingIntervalId) clearInterval(pingIntervalId);
                if (map01?.getLayer('oh-point-layer')) map01.removeLayer('oh-point-layer');
                if (map01?.getLayer('oh-point-label-layer')) map01.removeLayer('oh-point-label-layer');
                if (map01?.getSource('oh-point-source')) map01.removeSource('oh-point-source');
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

                    await fetchAndSetGeojson(groupId, map01, layerId);

                    if (map01.getLayer('oh-point-label-layer')) {
                        map01.removeLayer('oh-point-label-layer');
                    }
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
                    console.log('oh-point-label-layer を追加しました');

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

                        const currentLayer = store.state.currentGroupLayers.find(l => l.id === store.state.selectedLayerId);
                        if (!currentLayer) return;

                        currentLayer.features = currentLayer.features.map(f => {
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

                        store.commit('setCurrentGroupLayers', [...store.state.currentGroupLayers]);

                        const source = map01.getSource('oh-point-source');
                        if (source) {
                            source.setData({ type: 'FeatureCollection', features: currentLayer.features });
                        }
                    });

                    map01.on('mouseup', async () => {
                        if (draggedFeatureId) {
                            map01.getCanvas().style.cursor = '';
                            map01.dragPan.enable();
                            draggedFeatureId = null;

                            const groupId = store.state.currentGroupId;
                            const layerId = store.state.selectedLayerId;
                            const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
                            if (currentLayer) {
                                await saveLayerToFirestore(groupId, layerId, currentLayer.features);
                            }
                        }
                    });

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
            const map = store.state.map01;
            const groupId = store.state.currentGroupId;
            const layerId = store.state.selectedLayerId;
            if (!map || !groupId || !layerId) return;

            const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer');
            if (hasGroupLayer && !isInitializing) {
                await fetchAndSetGeojson(groupId, map, layerId);
            }
        },
        { deep: true }
    );

    window.addEventListener('unload', () => {
        if (pingIntervalId) clearInterval(pingIntervalId);
    });
}