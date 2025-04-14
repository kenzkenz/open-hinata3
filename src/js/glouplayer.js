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
    if (groupId !== store.state.currentGroupId || layerId !== store.state.selectedLayerId) return;
    try {
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get({ source: 'server' });
        const data = doc.data();
        console.log('Firestoreから取得した生データ（全フィールド）:', JSON.stringify(data, null, 2));

        if (data && data.features) {
            const newFeatures = data.features;
            // レイヤー名をdata.nameから取得
            const layerName = data.name || `Layer_${layerId}`; // フォールバックはLayer_${layerId}
            // console.log('取得したレイヤー名:', layerName);
            // groupGeojson.value.features = newFeatures;
            // console.log('フェッチしたGeoJSONデータ:', newFeatures);
            // console.log('各フィーチャーのdescription:', newFeatures.map(f => f.properties?.description || 'なし'));
            // console.log('各フィーチャーのtitle:', newFeatures.map(f => f.properties?.title || 'なし'));

            const source = map.getSource('oh-point-source');
            if (source) {
                source.setData({ type: 'FeatureCollection', features: newFeatures });
                map.triggerRepaint();
            }

            const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
            updatedLayers.push({ id: layerId, name: layerName, features: newFeatures });
            store.commit('setCurrentGroupLayers', updatedLayers);
            console.log('更新後のcurrentGroupLayers:', store.state.currentGroupLayers);

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
            console.log('データが存在しないか、featuresが空です');
            groupGeojson.value.features = [];
            store.commit('setCurrentGroupLayers', []);
        }
    } catch (e) {
        console.error('データ取得エラー:', e);
        store.dispatch('triggerSnackbarForGroup', { message: 'データの取得に失敗しました' });
    }
}

export function deleteAllPoints(currentGroupId) {
    if (isSyncFailed) {
        store.dispatch('triggerSnackbarForGroup', { message: 'ネットワークに接続されていません。ポイントを削除できません。' });
        return;
    }

    groupGeojson.value.features = [];
    const map = store.state.map01;
    if (map && map.getSource('oh-point-source')) {
        map.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: [] });
        map.triggerRepaint();
    }
    saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features);
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

    groupGeojson.value.features = groupGeojson.value.features.filter(f => f.properties?.id && !idsToDelete.has(String(f.properties.id)));

    map.getSource('oh-point-source')?.setData({ type: 'FeatureCollection', features: groupGeojson.value.features });
    map.triggerRepaint();
    saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features);

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
        const existingFeatures = existingData?.features || [];
        const updatedFeatures = existingFeatures.map(existing => {
            const updated = features.find(f => f.properties?.id === existing.properties?.id);
            return updated ? { ...existing, ...updated } : existing;
        });
        const newFeatures = features.filter(f => !existingFeatures.some(e => e.properties?.id === f.properties?.id));
        const finalFeatures = [...updatedFeatures, ...newFeatures];

        await docRef.set({
            features: finalFeatures,
            groupId: groupId,
            lastModifiedBy: store.state.userId,
            lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        groupGeojson.value.features = finalFeatures;
        const map = store.state.map01;
        if (map && map.getSource('oh-point-source')) {
            map.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: finalFeatures });
            map.triggerRepaint();
        }

        const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
        const layerName = existingData.name || `Layer_${layerId}`;
        updatedLayers.push({ id: layerId, name: layerName, features: finalFeatures });
        store.commit('setCurrentGroupLayers', updatedLayers);
        console.log('保存後のcurrentGroupLayers:', store.state.currentGroupLayers);
    } catch (e) {
        console.error('Firestore 更新エラー:', e);
        store.dispatch('triggerSnackbarForGroup', { message: 'データの保存に失敗しました' });
    } finally {
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
            if (data && data.features) {
                const features = data.features || [];
                const layerName = data.name || `Layer_${layerId}`;
                groupGeojson.value.features = features;
                const map01 = store.state.map01;
                if (map01 && map01.getSource('oh-point-source')) {
                    map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features });
                    map01.triggerRepaint();
                }
                const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId);
                updatedLayers.push({ id: layerId, name: layerName, features });
                store.commit('setCurrentGroupLayers', updatedLayers);
                console.log('リスナー更新後のcurrentGroupLayers:', store.state.currentGroupLayers);
            } else {
                groupGeojson.value.features = [];
                store.commit('setCurrentGroupLayers', []);
                const map01 = store.state.map01;
                if (map01 && map01.getSource('oh-point-source')) {
                    map01.getSource('oh-point-source').setData({ type: 'FeatureCollection', features: [] });
                    map01.triggerRepaint();
                }
            }
        }, (error) => {
            console.error('Snapshot エラー:', error);
            isSyncFailed = true;
            store.dispatch('triggerSnackbarForGroup', { message: 'リアルタイム同期に失敗しました。操作が制限されています。' });
        });
}

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
        if (!groupId || !layerId) return;

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
        const updatedFeatures = [...currentFeatures, newFeature];

        // // レイヤーのfeaturesを更新
        // currentLayer.features = updatedFeatures;
        //
        // // 共有ソースを更新（仕様上、oh-point-sourceを使わざるを得ない）
        // const source = map01.getSource('oh-point-source');
        // if (source) {
        //     source.setData({
        //         type: 'FeatureCollection',
        //         features: updatedFeatures // 選択中のレイヤーのfeaturesのみ
        //     });
        //     map01.triggerRepaint();
        // } else {
        //     console.warn('ソースが見つかりません: oh-point-source');
        //     return;
        // }
        //
        if (!isInitializing) {
            // Firestoreに保存（選択中のレイヤーのfeaturesのみ）
            await saveLayerToFirestore(groupId, layerId, updatedFeatures);
        }

        store.commit('setSelectedPointFeature', newFeature);
        setTimeout(() => {
            store.commit('setPointInfoDrawer', true);
        }, 0);

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