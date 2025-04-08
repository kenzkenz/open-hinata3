import store from '@/store'
import maplibregl from 'maplibre-gl'
import { db } from '@/firebase'
import { watch } from 'vue'
import { groupGeojson } from '@/js/layers'
import { popups } from '@/js/popup'
import { v4 as uuidv4 } from 'uuid'
import firebase from 'firebase/app'
import 'firebase/firestore'

let targetFeatures
let unsubscribeSnapshot = null
let lastClickTimestamp = 0
let previousIds = new Set()
let mapClickHandler = null
let isInitializing = false
let justChangedGroup = false
let isInitialStartup = true
let isSaving = false

function handleMapClickWithCurrentGroup(e) {
    const currentGroupId = store.state.currentGroupId
    handleMapClick(e, currentGroupId)
}

async function fetchAndSetGeojson(groupId, map, layerId) {
    if (groupId !== store.state.currentGroupId) {
        console.warn('fetchAndSetGeojson: 不正なgroupId=', groupId, '期待値=', store.state.currentGroupId)
        return
    }
    const doc = await db.collection('groups').doc(groupId).collection('layers').doc(layerId).get()
    const data = doc.data()
    console.log('fetchAndSetGeojson データ: groupId=', groupId, 'layerId=', layerId, 'data=', JSON.stringify(data))
    if (data && data.features) {
        groupGeojson.value = { type: 'FeatureCollection', features: data.features }
        const source = map?.getSource('oh-point-source')
        if (source) {
            source.setData(groupGeojson.value)
            map.triggerRepaint()
            console.log('fetchAndSetGeojson: マップにデータを設定しました')
        } else {
            console.warn('oh-point-sourceが見つかりません')
        }
        store.commit('setCurrentGroupLayers', [{ id: layerId, name: `Layer_${layerId}`, features: data.features }])
    } else {
        groupGeojson.value = { type: 'FeatureCollection', features: [] }
        store.commit('setCurrentGroupLayers', [])
    }
}

window.addEventListener('focus', async () => {
    const currentGroupId = store.state.currentGroupId
    const layerId = store.state.selectedLayerId
    const map = store.state.map01
    if (!currentGroupId || !layerId || !map) return
    await fetchAndSetGeojson(currentGroupId, map, layerId)
})

function deleteAllPoints(currentGroupId) {
    groupGeojson.value.features = []
    const map = store.state.map01
    if (map && map.getSource('oh-point-source')) {
        map.getSource('oh-point-source').setData({
            type: 'FeatureCollection',
            features: []
        })
        map.triggerRepaint()
    }
    saveLayerToFirestore(currentGroupId, store.state.selectedLayerId, groupGeojson.value.features)
    console.log('✅ 全ポイント削除完了')
}

function handleMapClick(e, currentGroupId) {
    const map = store.state.map01
    const layerId = store.state.selectedLayerId
    if (!(e.target && e.target.classList.contains('point-remove'))) return

    const idsToDelete = new Set((targetFeatures || []).map(f => String(f.properties?.id)))
    console.log('🗑️ 削除候補 IDs:', idsToDelete)

    const beforeLength = groupGeojson.value.features.length
    groupGeojson.value.features = groupGeojson.value.features.filter(
        f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
    )

    const afterLength = groupGeojson.value.features.length
    if (beforeLength === afterLength) {
        console.warn('❗ 該当 feature が削除対象に見つからなかった')
        return
    }

    map.getSource('oh-point-source')?.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
    map.triggerRepaint()
    saveLayerToFirestore(currentGroupId, layerId, groupGeojson.value.features)

    popups.forEach(popup => popup.remove())
    popups.length = 0
}

async function saveLayerToFirestore(groupId, layerId, features) {
    if (!groupId || groupId !== store.state.currentGroupId || !layerId) {
        console.error('保存エラー: 不正なgroupIdまたはlayerId: groupId=', groupId, 'layerId=', layerId, '期待値=', store.state.currentGroupId)
        return
    }
    isSaving = true
    try {
        const docRef = firebase.firestore()
            .collection('groups')
            .doc(groupId)
            .collection('layers')
            .doc(layerId)
        const doc = await docRef.get()
        if (!doc.exists) {
            console.warn('保存中止: layerIdが存在しません:', layerId)
            return
        }

        await docRef.set({
            features: features,
            groupId: groupId,
            lastModifiedBy: store.state.userId,
            lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        console.log('Firestore保存成功: groupId=', groupId, 'layerId=', layerId)

        // 保存後にローカルデータを更新
        const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId)
        updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features })
        store.commit('setCurrentGroupLayers', updatedLayers)
        groupGeojson.value.features = features
    } catch (e) {
        console.error('Firestore 更新エラー:', e)
    } finally {
        // リスナーが反応する前に少し待機
        await new Promise(resolve => setTimeout(resolve, 200))
        isSaving = false
    }
}

function setupFirestoreListener(groupId, layerId) {
    if (groupId !== store.state.currentGroupId || !layerId) {
        console.warn('setupFirestoreListener: 不正なgroupIdまたはlayerId: groupId=', groupId, 'layerId=', layerId, '期待値=', store.state.currentGroupId)
        return
    }
    const map01 = store.state.map01
    if (unsubscribeSnapshot) unsubscribeSnapshot()

    unsubscribeSnapshot = firebase.firestore()
        .collection('groups')
        .doc(groupId)
        .collection('layers')
        .doc(layerId)
        .onSnapshot({ includeMetadataChanges: true }, (doc) => {
            if (isSaving) {
                console.log('保存中なのでリスナーをスキップ')
                return
            }
            const data = doc.data()
            console.log('Firestoreから取得: groupId=', groupId, 'layerId=', layerId, 'data=', JSON.stringify(data))
            if (data && data.features) {
                const features = data.features || []
                const currentIds = new Set(features.map(f => f.properties?.id))
                const newIds = [...currentIds].filter(id => !previousIds.has(id))
                const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
                const userNickname = store.state.myNickname

                if (!isInitializing && !justChangedGroup) {
                    if (newIds.length === 1) {
                        store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`)
                    } else if (deletedIds.length === 1) {
                        store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`)
                    }
                }

                previousIds = currentIds
                // リスナーではgroupGeojsonのみ更新、マップは更新しない
                groupGeojson.value.features = features
                const updatedLayers = store.state.currentGroupLayers.filter(l => l.id !== layerId)
                updatedLayers.push({ id: layerId, name: `Layer_${layerId}`, features })
                store.commit('setCurrentGroupLayers', updatedLayers)
                console.log('リスナーでデータ更新:', JSON.stringify(features))
            } else {
                groupGeojson.value.features = []
                store.commit('setCurrentGroupLayers', store.state.currentGroupLayers.filter(l => l.id !== layerId))
                const source = map01.getSource('oh-point-source')
                if (source) {
                    source.setData({ type: 'FeatureCollection', features: [] })
                    map01.triggerRepaint()
                }
                if (store.state.selectedLayerId === layerId) {
                    store.commit('setSelectedLayerId', null)
                    localStorage.removeItem('lastLayerId')
                    console.log('リスナー: selectedLayerIdをクリア:', layerId)
                }
            }
        }, (error) => {
            console.error('Snapshot エラー:', error)
        })
}

function createMapClickHandler(map01) {
    return async (e) => {
        // alert('mapClickHandler開始: ' + store.state.selectedLayerId)
        const style = map01.getStyle()
        console.log('全レイヤ:', style.layers)

        const now = Date.now()
        if (now - lastClickTimestamp < 300) return
        lastClickTimestamp = now

        const groupId = store.state.currentGroupId
        const layerId = store.state.selectedLayerId
        console.log('クリック: groupId=', groupId, 'layerId=', layerId)
        if (!groupId || !layerId) {
            console.warn('グループIDまたはレイヤーIDが未定義: groupId=', groupId, 'layerId=', layerId)
            return
        }

        const docRef = firebase.firestore()
            .collection('groups')
            .doc(groupId)
            .collection('layers')
            .doc(layerId)
        const doc = await docRef.get()
        if (!doc.exists) {
            console.warn('クリック無効: layerIdが存在しません:', layerId)
            store.commit('setSelectedLayerId', null)
            localStorage.removeItem('lastLayerId')
            alert('選択されたレイヤーが存在しないため、リセットしました')
            return
        }

        const features = map01.queryRenderedFeatures(e.point, { layers: ['oh-point-layer'] })
        console.log('既存のfeatures:', features)
        if (features.length > 0 || !e.lngLat) return

        const { lng, lat } = e.lngLat
        const pointFeature = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: {
                id: uuidv4(),
                createdAt: Date.now(),
                createdBy: store.state.myNickname || '不明',
                description: 'テスト'
            }
        }
        console.log('新しいポイント:', pointFeature)

        if (!store.state.currentGroupLayers) store.state.currentGroupLayers = []
        let currentLayer = store.state.currentGroupLayers.find(l => l.id === layerId)
        if (!currentLayer) {
            currentLayer = { id: layerId, name: `Layer_${layerId}`, features: [] }
            store.state.currentGroupLayers.push(currentLayer)
        }
        currentLayer.features.push(pointFeature)
        groupGeojson.value.features = currentLayer.features

        // マップに即時反映（ここで表示を確定）
        const source = map01.getSource('oh-point-source')
        if (source) {
            source.setData({ type: 'FeatureCollection', features: currentLayer.features })
            map01.triggerRepaint()
            console.log('クリック直後にマップを更新:', JSON.stringify(currentLayer.features))
        }

        if (!isInitializing) {
            await saveLayerToFirestore(groupId, layerId, currentLayer.features)
            // 保存後のマップ再確認
            if (source) {
                source.setData({ type: 'FeatureCollection', features: currentLayer.features })
                map01.triggerRepaint()
                console.log('保存後にマップを再確認:', JSON.stringify(currentLayer.features))
            }
        }
        // alert('mapClickHandler終了: ' + store.state.selectedLayerId)
    }
}

export default function useGloupLayer() {
    const savedGroupId = localStorage.getItem('lastGroupId')
    const savedLayerId = localStorage.getItem('lastLayerId')
    if (savedGroupId && savedLayerId) {
        store.commit('setCurrentGroup', { id: savedGroupId, name: savedGroupId })
        store.commit('setSelectedLayerId', savedLayerId)
        console.log('起動時に復元: groupId=', savedGroupId, 'layerId=', savedLayerId)
    }

    watch(
        () => [store.state.map01, store.state.currentGroupId],
        async ([map01, groupId]) => {
            if (!map01) return

            const initializeMap = async () => {
                if (!map01.getSource('oh-point-source')) {
                    map01.addSource('oh-point-source', {
                        type: 'geojson',
                        data: { type: 'FeatureCollection', features: [] }
                    })
                    console.log('ソースを初期化')
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
                    })
                    console.log('レイヤーを初期化')
                }

                if (savedGroupId && savedLayerId) {
                    const docRef = firebase.firestore()
                        .collection('groups')
                        .doc(savedGroupId)
                        .collection('layers')
                        .doc(savedLayerId)
                    const doc = await docRef.get()
                    if (!doc.exists) {
                        console.warn('初期化時: 保存されたlayerIdが存在しません:', savedLayerId)
                        store.commit('setSelectedLayerId', null)
                        localStorage.removeItem('lastLayerId')
                    } else {
                        await fetchAndSetGeojson(savedGroupId, map01, savedLayerId)
                        if (!store.state.selectedLayers.map01.some(l => l.id === 'oh-point-layer')) {
                            store.commit('addSelectedLayer', { map: 'map01', layer: { id: 'oh-point-layer' } })
                        }
                    }
                }

                if (mapClickHandler) {
                    map01.off('click', mapClickHandler)
                }
                mapClickHandler = createMapClickHandler(map01)
                map01.on('click', mapClickHandler)
                console.log('mapClickHandlerを再登録:', mapClickHandler)

                const mapElm = document.querySelector('#map01')
                mapElm.removeEventListener('click', handleMapClickWithCurrentGroup)
                mapElm.addEventListener('click', handleMapClickWithCurrentGroup)
            }

            if (!groupId) {
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot()
                    unsubscribeSnapshot = null
                }
                if (map01.getLayer('oh-point-layer')) {
                    map01.removeLayer('oh-point-layer')
                }
                if (map01.getSource('oh-point-source')) {
                    map01.removeSource('oh-point-source')
                }
                store.commit('clearSelectedLayers', 'map01')
                groupGeojson.value.features = []
                store.commit('setCurrentGroupLayers', [])
                previousIds = new Set()
                localStorage.removeItem('lastLayerId')
                console.log('グループ解除: currentGroupLayersをクリア')
                return
            }

            if (map01.isStyleLoaded()) {
                await initializeMap()
            } else {
                map01.on('load', async () => await initializeMap())
            }

            localStorage.setItem('lastGroupId', groupId)
            const layerId = store.state.selectedLayerId
            if (layerId) {
                const docRef = firebase.firestore()
                    .collection('groups')
                    .doc(groupId)
                    .collection('layers')
                    .doc(layerId)
                const doc = await docRef.get()
                if (!doc.exists) {
                    store.commit('setSelectedLayerId', null)
                    localStorage.removeItem('lastLayerId')
                } else {
                    localStorage.setItem('lastLayerId', layerId)
                    await fetchAndSetGeojson(groupId, map01, layerId)
                    setupFirestoreListener(groupId, layerId)
                }
            }

            justChangedGroup = false
            isInitializing = false
        },
        { immediate: true }
    )

    watch(
        () => store.state.selectedLayers.map01,
        async (selectedLayers) => {
            const map = store.state.map01
            const groupId = store.state.currentGroupId
            if (!map || !groupId) return

            const hasGroupLayer = selectedLayers.some(l => l.id === 'oh-point-layer')
            if (hasGroupLayer && !isInitializing) {
                const layerId = store.state.selectedLayerId
                if (layerId) {
                    await fetchAndSetGeojson(groupId, map, layerId)
                    previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
                }
            }
        },
        { deep: true }
    )
}