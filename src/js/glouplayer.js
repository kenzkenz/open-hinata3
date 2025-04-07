import store from '@/store';
import maplibregl from 'maplibre-gl';
import { db } from '@/firebase';
import { watch } from 'vue';
import { groupGeojson } from '@/js/layers';
import { popups } from '@/js/popup';
import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/app';
import 'firebase/firestore';

let targetFeatures;
let unsubscribeSnapshot = null;
let lastClickTimestamp = 0;
let previousIds = new Set();
let mapClickHandler = null;
let isInitializing = false;
let justChangedGroup = false;
let isInitialStartup = true;
let isSaving = false; // 保存中フラグを追加

function handleMapClickWithCurrentGroup(e) {
    const currentGroupId = store.state.currentGroupName;
    handleMapClick(e, currentGroupId);
}

async function fetchAndSetGeojson(groupId, map, layerId) {
    const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get();
    const data = doc.data();
    console.log('fetchAndSetGeojson データ:', data);
    if (data && data.features) {
        groupGeojson.value = { type: 'FeatureCollection', features: data.features };
        setTimeout(() => {
            map?.getSource('oh-point-source')?.setData(groupGeojson.value);
            map?.triggerRepaint();
        }, 0);
    }
}

window.addEventListener('focus', async () => {
    const currentGroupId = store.state.currentGroupName;
    const layerId = store.state.selectedLayerId || 'points';
    const map = store.state.map01;
    if (!currentGroupId || !map) return;
    await fetchAndSetGeojson(currentGroupId, map, layerId);
});

async function saveGroupGeojson(groupId, layerId, geojson) {
    if (!groupId) {
        console.warn('グループIDが未定義のため保存スキップ');
        return;
    }
    const docRef = db.collection('groups').doc(groupId);
    await docRef.set(
        {
            layers: {
                [layerId]: geojson
            },
            lastModifiedBy: store.state.userId,
            lastModifiedAt: Date.now()
        },
        { merge: true }
    );
}

function deleteAllPoints(currentGroupId) {
    groupGeojson.value.features = [];
    const map = store.state.map01;
    if (map && map.getSource('oh-point-source')) {
        requestAnimationFrame(() => {
            map.getSource('oh-point-source').setData({
                type: 'FeatureCollection',
                features: []
            });
            map.triggerRepaint();
        });
    }
    saveGroupGeojson(currentGroupId, 'points', groupGeojson.value);
    console.log('✅ 全ポイント削除完了');
}

function handleMapClick(e, currentGroupId) {
    const map = store.state.map01;
    const layerId = 'points';
    if (!(e.target && e.target.classList.contains('point-remove'))) return;

    const idsToDelete = new Set((targetFeatures || []).map(f => String(f.properties?.id)));
    console.log('🗑️ 削除候補 IDs:', idsToDelete);

    const beforeLength = groupGeojson.value.features.length;
    groupGeojson.value.features = groupGeojson.value.features.filter(
        f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
    );

    const afterLength = groupGeojson.value.features.length;
    if (beforeLength === afterLength) {
        console.warn('❗ 該当 feature が削除対象に見つからなかった');
        return;
    }

    map.getSource('oh-point-source')?.setData(JSON.parse(JSON.stringify(groupGeojson.value)));
    map.triggerRepaint();
    saveGroupGeojson(currentGroupId, layerId, groupGeojson.value);

    popups.forEach(popup => popup.remove());
    popups.length = 0;
}

async function saveLayerToFirestore(groupId, layerId, features) {
    isSaving = true;
    try {
        const docRef = firebase.firestore()
            .collection('groups')
            .doc(groupId)
            .collection('layers')
            .doc(layerId);

        await docRef.set({
            features: features,
            lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('10. Firestore保存成功: Group=', groupId, 'Layer=', layerId, 'Features=', JSON.stringify(features));

        const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
        if (currentLayer) {
            currentLayer.features = features;
        }
    } catch (e) {
        console.error('11. Firestore 更新エラー:', e);
    } finally {
        isSaving = false;
    }
}

function setupFirestoreListener(groupId, layerId) {
    const map01 = store.state.map01;
    if (unsubscribeSnapshot) unsubscribeSnapshot();

    unsubscribeSnapshot = firebase.firestore()
        .collection('groups')
        .doc(groupId)
        .collection('layers')
        .doc(layerId)
        .onSnapshot({ includeMetadataChanges: true }, (doc) => {
            if (isSaving) return; // 保存中はスキップ
            const data = doc.data();
            console.log('12. Firestoreから取得したデータ:', JSON.stringify(data));
            if (data && data.features) {
                const features = data.features || [];
                const currentIds = new Set(features.map(f => f.properties?.id));
                const newIds = [...currentIds].filter(id => !previousIds.has(id));
                const deletedIds = [...previousIds].filter(id => !currentIds.has(id));
                const userNickname = store.state.myNickname;

                if (!isInitializing && !justChangedGroup) {
                    if (newIds.length === 1) {
                        store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`);
                    } else if (deletedIds.length === 1) {
                        store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`);
                    }
                }

                previousIds = currentIds;
                groupGeojson.value.features = features;

                const currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
                if (currentLayer) {
                    currentLayer.features = features;
                    console.log('13. currentLayerを更新:', JSON.stringify(currentLayer.features));
                }

                const source = map01.getSource('oh-point-source');
                if (source) {
                    source.setData({ type: 'FeatureCollection', features });
                    map01.triggerRepaint();
                    console.log('14. onSnapshotで設定したデータ:', JSON.stringify(features));
                }
            }
        }, (error) => {
            console.error('15. Snapshot エラー:', error);
        });
}

export default function useGloupLayer() {
    watch(
        () => store.state.selectedLayers.map01,
        async (layers) => {
            const hasGroupLayer = layers.some(l => l.id === 'oh-point-layer');
            if (!hasGroupLayer) return;

            const map = store.state.map01;
            const groupId = store.state.currentGroupName;
            const layerId = store.state.selectedLayerId || 'points';
            if (!map || !groupId) return;

            if (!map.getSource('oh-point-source')) {
                map.addSource('oh-point-source', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
                console.log('ソースを初期化');
            }

            if (!map.getLayer('oh-point-layer')) {
                map.addLayer({
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
                console.log('レイヤーを初期化');
            }

            isInitializing = true;
            await fetchAndSetGeojson(groupId, map, layerId);
            previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id));
            isInitializing = false;
        },
        { immediate: false, deep: true }
    );

    watch(
        () => store.state.currentGroupName,
        async (groupId) => {
            const map01 = store.state.map01;

            if (!map01 || !groupId) {
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
                if (map01?.getLayer('oh-point-layer')) {
                    map01.removeLayer('oh-point-layer');
                }
                if (map01?.getSource('oh-point-source')) {
                    map01.removeSource('oh-point-source');
                }
                store.state.selectedLayers.map01 = store.state.selectedLayers.map01.filter(
                    l => l.id !== 'oh-point-layer'
                );
                groupGeojson.value.features = [];
                previousIds = new Set();
                return;
            }

            const layerId = store.state.selectedLayerId || 'points';
            isInitializing = true;
            justChangedGroup = true;

            if (unsubscribeSnapshot) unsubscribeSnapshot();

            if (map01.getLayer('oh-point-layer')) {
                map01.removeLayer('oh-point-layer');
            }
            if (map01.getSource('oh-point-source')) {
                map01.removeSource('oh-point-source');
            }

            store.state.selectedLayers.map01 = store.state.selectedLayers.map01.filter(
                l => l.id !== 'oh-point-layer'
            );

            setTimeout(() => {
                justChangedGroup = false;
            }, 0);

            groupGeojson.value = { type: 'FeatureCollection', features: [] };

            setupFirestoreListener(groupId, layerId);

            if (mapClickHandler) {
                map01.off('click', mapClickHandler);
            }

            mapClickHandler = async (e) => {
                const style = map01.getStyle();
                console.log('1. 全レイヤ:', style.layers);

                const now = Date.now();
                if (now - lastClickTimestamp < 300) return;
                lastClickTimestamp = now;

                const groupId = store.state.currentGroupId;
                const layerId = store.state.selectedLayerId;
                console.log('2. groupId:', groupId, 'layerId:', layerId);
                if (!groupId || !layerId) {
                    console.warn('グループIDまたはレイヤーIDが未定義');
                    return;
                }

                const features = map01.queryRenderedFeatures(e.point, {
                    layers: ['oh-point-layer']
                });
                console.log('3. 既存のfeatures:', features);
                if (features.length > 0 || !e.lngLat) return;

                const { lng, lat } = e.lngLat;
                const pointFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    properties: {
                        id: uuidv4(),
                        createdAt: Date.now(),
                        createdBy: store.state.myNickname || '不明',
                        description: 'テスト'
                    }
                };
                console.log('4. 新しいポイント:', pointFeature);

                if (!store.state.currentGroupLayers) store.state.currentGroupLayers = [];
                let currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId);
                if (!currentLayer) {
                    currentLayer = { id: layerId, features: [] };
                    store.state.currentGroupLayers.push(currentLayer);
                }
                console.log('5. currentLayer before:', JSON.stringify(currentLayer.features));
                currentLayer.features.push(pointFeature);
                console.log('6. currentLayer after:', JSON.stringify(currentLayer.features));
                groupGeojson.value.features = currentLayer.features; // 同期
                console.log('7. groupGeojson after:', JSON.stringify(groupGeojson.value.features));

                requestAnimationFrame(() => {
                    const source = map01.getSource('oh-point-source');
                    if (source) {
                        source.setData({
                            type: 'FeatureCollection',
                            features: currentLayer.features
                        });
                        map01.triggerRepaint();
                        console.log('8. ソースに設定したデータ:', JSON.stringify(currentLayer.features));
                    } else {
                        console.warn('oh-point-sourceが見つかりません');
                    }
                });

                if (!isInitializing) {
                    console.log('9. Firestore保存開始');
                    await saveLayerToFirestore(groupId, layerId, currentLayer.features); // await追加
                }
                alert(999);
            };

            map01.on('click', mapClickHandler);
            console.log('mapClickHandler registered:', mapClickHandler);

            const mapElm = document.querySelector('#map01');
            mapElm.removeEventListener('click', handleMapClickWithCurrentGroup);
            mapElm.addEventListener('click', handleMapClickWithCurrentGroup);

            isInitializing = false;
        },
        { immediate: true }
    );
}