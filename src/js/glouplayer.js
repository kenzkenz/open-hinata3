import store from '@/store'
import maplibregl from 'maplibre-gl'
import { db } from '@/firebase'
import { watch } from 'vue'
import { groupGeojson } from '@/js/layers'
import { popups } from '@/js/popup'
import { v4 as uuidv4 } from 'uuid'

let targetFeatures
let unsubscribeSnapshot = null
let lastClickTimestamp = 0
let previousIds = new Set()
let mapClickHandler = null

async function fetchAndSetGeojson(groupId, map) {
    const doc = await db.collection('groups').doc(groupId).get()
    const layerData = doc.data()?.layers?.points
    if (layerData) {
        groupGeojson.value = JSON.parse(JSON.stringify(layerData))
        map?.getSource('group-points-source')?.setData(groupGeojson.value)
        map?.triggerRepaint()
    }
}

window.addEventListener('focus', async () => {
    const currentGroupId = store.state.currentGroupName
    const map = store.state.map01
    if (!currentGroupId || !map) return
    await fetchAndSetGeojson(currentGroupId, map)
})

async function saveGroupGeojson(groupId, layerId, geojson) {
    if (!groupId) {
        console.warn('グループIDが未定義のため保存スキップ')
        return
    }
    const docRef = db.collection('groups').doc(groupId)
    await docRef.set(
        {
            layers: {
                [layerId]: geojson
            },
            lastModifiedBy: store.state.userId,
            lastModifiedAt: Date.now()
        },
        { merge: true }
    )
}

function deleteAllPoints(currentGroupId) {
    if (!confirm('本当にすべてのポイントを削除しますか？')) return

    groupGeojson.value.features = []

    const map = store.state.map01
    if (map && map.getSource('group-points-source')) {
        requestAnimationFrame(() => {
            map.getSource('group-points-source').setData({
                type: 'FeatureCollection',
                features: []
            })
            map.triggerRepaint()
        })
    }

    saveGroupGeojson(currentGroupId, 'points', groupGeojson.value)
    console.log('✅ 全ポイント削除完了')
}

function handleMapClick(e, currentGroupId) {
    const map = store.state.map01
    const layerId = 'points'

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

    map.getSource('group-points-source')?.setData(
        JSON.parse(JSON.stringify(groupGeojson.value))
    )
    map.triggerRepaint()
    saveGroupGeojson(currentGroupId, layerId, groupGeojson.value)

    popups.forEach(popup => popup.remove())
    popups.length = 0
}

export default function useGloupLayer() {
    watch(
        () => store.state.selectedLayers.map01,
        async (layers) => {
            const hasGroupLayer = layers.some(l => l.id === 'oh-gloup-layer')
            if (!hasGroupLayer) return

            const map = store.state.map01
            const groupId = store.state.currentGroupName
            if (!map || !groupId) return

            await fetchAndSetGeojson(groupId, map)
        },
        { immediate: false, deep: true }
    )

    watch(
        () => store.state.currentGroupName,
        async (groupId) => {
            const map01 = store.state.map01
            if (!map01 || !groupId) {
                console.warn('map01 or groupId が未定義')
                return
            }

            const layerId = 'points'
            let isInitializing = true

            if (unsubscribeSnapshot) unsubscribeSnapshot()

            if (map01.getLayer('oh-group-points-layer')) {
                map01.removeLayer('oh-group-points-layer')
            }
            if (map01.getSource('group-points-source')) {
                map01.removeSource('group-points-source')
            }

            store.state.selectedLayers.map01 = store.state.selectedLayers.map01.filter(
                l => l.id !== 'oh-gloup-layer'
            )

            groupGeojson.value = { type: 'FeatureCollection', features: [] }

            unsubscribeSnapshot = db.collection('groups').doc(groupId)
                .onSnapshot({ includeMetadataChanges: true }, (doc) => {
                    const data = doc.data()
                    if (data && data.layers && data.layers[layerId]) {
                        const features = data.layers[layerId].features || []
                        const currentIds = new Set(features.map(f => f.properties?.id))
                        const newIds = [...currentIds].filter(id => !previousIds.has(id))
                        const deletedIds = [...previousIds].filter(id => !currentIds.has(id))

                        if (!isInitializing) {
                            if (newIds.length > 0) {
                                store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました`)
                            } else if (deletedIds.length > 0) {
                                store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました`)
                            }
                        }

                        previousIds = currentIds
                        groupGeojson.value.features = features
                        const source = map01.getSource('group-points-source')
                        if (source) {
                            source.setData({ type: 'FeatureCollection', features })
                            map01.triggerRepaint()
                        }
                    }
                })

            isInitializing = false

            if (mapClickHandler) {
                map01.off('click', mapClickHandler)
            }

            mapClickHandler = (e) => {
                const now = Date.now()
                if (now - lastClickTimestamp < 300) return
                lastClickTimestamp = now

                if (!store.state.currentGroupName) return

                if (e.originalEvent?.target?.classList.contains('point-remove')) return

                const features = map01.queryRenderedFeatures(e.point, {
                    layers: ['oh-group-points-layer']
                })
                targetFeatures = features

                if (features.length > 0 || !e.lngLat) return

                const { lng, lat } = e.lngLat
                const pointFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    properties: {
                        id: uuidv4(),
                        createdAt: Date.now()
                    }
                }

                groupGeojson.value.features.push(pointFeature)

                requestAnimationFrame(() => {
                    map01.getSource('group-points-source')?.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
                    map01.triggerRepaint()
                })

                if (!isInitializing) {
                    saveGroupGeojson(store.state.currentGroupName, layerId, groupGeojson.value)
                }
            }

            map01.on('click', mapClickHandler)

            const mapElm = document.querySelector('#map01')
            mapElm.removeEventListener('click', handleMapClick)
            mapElm.addEventListener('click', (e) => handleMapClick(e, groupId))
        },
        { immediate: true }
    )
}



//
//
//
//
// import store from '@/store'
// import maplibregl from 'maplibre-gl'
// import { db } from '@/firebase'
// import { watch } from 'vue'
// import { groupGeojson } from '@/js/layers'
// import { popups } from '@/js/popup'
// import { v4 as uuidv4 } from 'uuid'
//
// let targetFeatures
// let unsubscribeSnapshot = null
// let lastClickTimestamp = 0
// let previousIds = new Set()
// let mapClickHandler = null
//
// // 🔁 復帰時にFirestoreの最新状態で再同期
// window.addEventListener('focus', async () => {
//     const currentGroupId = store.state.currentGroupName
//     if (!currentGroupId) return
//     const doc = await db.collection('groups').doc(currentGroupId).get()
//     const layerData = doc.data()?.layers?.points
//     if (layerData) {
//         groupGeojson.value = JSON.parse(JSON.stringify(layerData))
//         store.state.map01?.getSource('group-points-source')?.setData(groupGeojson.value)
//         store.state.map01?.triggerRepaint()
//     }
// })
//
// async function saveGroupGeojson(groupId, layerId, geojson) {
//     if (!groupId) {
//         console.warn('グループIDが未定義のため保存スキップ')
//         return
//     }
//     const docRef = db.collection('groups').doc(groupId)
//     await docRef.set(
//         {
//             layers: {
//                 [layerId]: geojson
//             },
//             lastModifiedBy: store.state.userId,
//             lastModifiedAt: Date.now()
//         },
//         { merge: true }
//     )
// }
//
// function deleteAllPoints(currentGroupId) {
//     if (!confirm('本当にすべてのポイントを削除しますか？')) return
//
//     groupGeojson.value.features = []
//
//     const map = store.state.map01
//     if (map && map.getSource('group-points-source')) {
//         requestAnimationFrame(() => {
//             map.getSource('group-points-source').setData({
//                 type: 'FeatureCollection',
//                 features: []
//             })
//             map.triggerRepaint()
//         })
//     }
//
//     saveGroupGeojson(currentGroupId, 'points', groupGeojson.value)
//     console.log('✅ 全ポイント削除完了')
// }
//
// function handleMapClick(e, currentGroupId) {
//     const map = store.state.map01
//     const layerId = 'points'
//
//     if (!(e.target && e.target.classList.contains('point-remove'))) return
//
//     const idsToDelete = new Set((targetFeatures || []).map(f => String(f.properties?.id)))
//     console.log('🗑️ 削除候補 IDs:', idsToDelete)
//
//     const beforeLength = groupGeojson.value.features.length
//     groupGeojson.value.features = groupGeojson.value.features.filter(
//         f => f.properties?.id && !idsToDelete.has(String(f.properties.id))
//     )
//
//     const afterLength = groupGeojson.value.features.length
//     if (beforeLength === afterLength) {
//         console.warn('❗ 該当 feature が削除対象に見つからなかった')
//         return
//     }
//
//     map.getSource('group-points-source')?.setData(
//         JSON.parse(JSON.stringify(groupGeojson.value))
//     )
//     map.triggerRepaint()
//     saveGroupGeojson(currentGroupId, layerId, groupGeojson.value)
//
//     popups.forEach(popup => popup.remove())
//     popups.length = 0
// }
//
// export default function useGloupLayer() {
//     watch(
//         () => [store.state.map01, store.state.currentGroupName],
//         async ([map01, groupId]) => {
//             if (!map01 || !groupId) {
//                 console.warn('map01 or groupId が未定義')
//                 return
//             }
//
//             const layerId = 'points'
//             let isInitializing = true
//
//             if (unsubscribeSnapshot) unsubscribeSnapshot()
//
//             // 💥 グループ変更時に前のレイヤー削除
//             if (map01.getLayer('oh-group-points-layer')) {
//                 map01.removeLayer('oh-group-points-layer')
//             }
//             if (map01.getSource('group-points-source')) {
//                 map01.removeSource('group-points-source')
//             }
//
//             // 💥 selectedLayers から group レイヤーを削除
//             store.state.selectedLayers.map01 = store.state.selectedLayers.map01.filter(
//                 l => l.id !== 'oh-gloup-layer'
//             )
//
//             unsubscribeSnapshot = db.collection('groups').doc(groupId)
//                 .onSnapshot({ includeMetadataChanges: true }, (doc) => {
//                     const data = doc.data()
//                     if (data && data.layers && data.layers[layerId]) {
//                         const features = data.layers[layerId].features || []
//                         const currentIds = new Set(features.map(f => f.properties?.id))
//                         const newIds = [...currentIds].filter(id => !previousIds.has(id))
//                         const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
//
//                         console.log('📡 Snapshot fired')
//                         console.log('📄 currentIds:', currentIds)
//                         console.log('📄 previousIds:', previousIds)
//                         console.log('🆕 new:', newIds)
//                         console.log('🗑️ deleted:', deletedIds)
//
//                         if (!isInitializing) {
//                             if (newIds.length > 0) {
//                                 store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました`)
//                             } else if (deletedIds.length > 0) {
//                                 store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました`)
//                             }
//                         }
//
//                         previousIds = currentIds
//                         groupGeojson.value.features = features
//                         const source = map01.getSource('group-points-source')
//                         if (source) {
//                             source.setData({ type: 'FeatureCollection', features })
//                             map01.triggerRepaint()
//                         }
//                     }
//                 })
//
//             const doc = await db.collection('groups').doc(groupId).get()
//             if (doc.exists) {
//                 const data = doc.data()?.layers?.[layerId]
//                 if (data) {
//                     groupGeojson.value = JSON.parse(JSON.stringify(data))
//                     previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
//                 } else {
//                     groupGeojson.value = { type: 'FeatureCollection', features: [] }
//                     previousIds = new Set()
//                 }
//             } else {
//                 groupGeojson.value = { type: 'FeatureCollection', features: [] }
//                 previousIds = new Set()
//             }
//
//             const source = map01.getSource('group-points-source')
//             if (source) {
//                 setTimeout(() => {
//                     source.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
//                     map01.triggerRepaint()
//                 }, 500)
//             }
//
//             isInitializing = false
//
//             if (mapClickHandler) {
//                 map01.off('click', mapClickHandler)
//             }
//
//             mapClickHandler = (e) => {
//                 const now = Date.now()
//                 if (now - lastClickTimestamp < 300) return
//                 lastClickTimestamp = now
//
//                 if (!store.state.currentGroupName) return // 🔒 グループ未所属なら無視
//
//                 if (e.originalEvent?.target?.classList.contains('point-remove')) return
//
//                 const features = map01.queryRenderedFeatures(e.point, {
//                     layers: ['oh-group-points-layer']
//                 })
//                 targetFeatures = features
//
//                 if (features.length > 0 || !e.lngLat) return
//
//                 alert(`✅ 書き込み先グループ: ${store.state.currentGroupName}`)
//
//                 const { lng, lat } = e.lngLat
//                 const pointFeature = {
//                     type: 'Feature',
//                     geometry: {
//                         type: 'Point',
//                         coordinates: [lng, lat]
//                     },
//                     properties: {
//                         id: uuidv4(),
//                         createdAt: Date.now()
//                     }
//                 }
//
//                 groupGeojson.value.features.push(pointFeature)
//
//                 requestAnimationFrame(() => {
//                     map01.getSource('group-points-source')?.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
//                     map01.triggerRepaint()
//                 })
//
//                 if (!isInitializing) {
//                     saveGroupGeojson(store.state.currentGroupName, layerId, groupGeojson.value)
//                 }
//             }
//
//             map01.on('click', mapClickHandler)
//
//             const mapElm = document.querySelector('#map01')
//             mapElm.removeEventListener('click', handleMapClick)
//             mapElm.addEventListener('click', (e) => handleMapClick(e, groupId))
//         },
//         { immediate: true }
//     )
// }
