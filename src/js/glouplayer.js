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

// 🔁 復帰時にFirestoreの最新状態で再同期
window.addEventListener('focus', async () => {
    const doc = await db.collection('groups').doc(store.state.currentGroupName).get()
    const layerData = doc.data()?.layers?.points
    if (layerData) {
        groupGeojson.value = JSON.parse(JSON.stringify(layerData))
        store.state.map01?.getSource('group-points-source')?.setData(groupGeojson.value)
        store.state.map01?.triggerRepaint()
    }
})

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

async function saveGroupGeojson(groupId, layerId, geojson) {
    if (!groupId) {
        console.warn('グループIDが未定義のため保存スキップ')
        return
    }

    const docRef = db.collection('groups').doc(groupId)
    await docRef.update({
        [`layers.${layerId}`]: geojson,
        lastModifiedBy: store.state.userId,
        lastModifiedAt: Date.now()
    }).catch(async (error) => {
        if (error.code === 'not-found') {
            // ドキュメントが存在しない場合は set で作成
            await docRef.set({
                layers: {
                    [layerId]: geojson
                },
                lastModifiedBy: store.state.userId,
                lastModifiedAt: Date.now()
            })
        } else {
            console.error('Firestore 書き込みエラー:', error)
        }
    })
}


function deleteAllPoints() {
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

    const groupId = store.state.currentGroupName
    saveGroupGeojson(groupId, 'points', groupGeojson.value)

    console.log('✅ 全ポイント削除完了')
}

// deleteAllPoints()

function handleMapClick(e) {
    const map = store.state.map01
    const groupId = store.state.currentGroupName
    const layerId = 'points'

    if (!(e.target && e.target.classList.contains('point-remove'))) return

    const idsToDelete = new Set((targetFeatures || []).map(f => String(f.properties.id)))
    console.log('🗑️ 削除候補 IDs:', idsToDelete)

    const beforeLength = groupGeojson.value.features.length
    groupGeojson.value.features = groupGeojson.value.features.filter(
        f => !idsToDelete.has(String(f.properties.id))
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
    saveGroupGeojson(groupId, layerId, groupGeojson.value)

    popups.forEach(popup => popup.remove())
    popups.length = 0
}

export default function useGloupLayer() {
    watch(
        () => [store.state.map01, store.state.currentGroupName],
        async ([map01, groupId]) => {
            if (!map01 || !groupId) {
                console.warn('map01 or groupId が未定義')
                return
            }

            const layerId = 'points'
            let isInitializing = true

            if (unsubscribeSnapshot) unsubscribeSnapshot()
            unsubscribeSnapshot = db.collection('groups').doc(groupId)
                .onSnapshot({ includeMetadataChanges: true }, (doc) => {
                    const data = doc.data()
                    if (data && data.layers && data.layers[layerId]) {
                        const features = data.layers[layerId].features || []
                        const currentIds = new Set(features.map(f => f.properties?.id))
                        const newIds = [...currentIds].filter(id => !previousIds.has(id))
                        const deletedIds = [...previousIds].filter(id => !currentIds.has(id))

                        console.log('📡 Snapshot fired')
                        console.log('📄 currentIds:', currentIds)
                        console.log('📄 previousIds:', previousIds)
                        console.log('🆕 new:', newIds)
                        console.log('🗑️ deleted:', deletedIds)

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

            const doc = await db.collection('groups').doc(groupId).get()
            if (doc.exists) {
                const data = doc.data()?.layers?.[layerId]
                if (data) {
                    groupGeojson.value = JSON.parse(JSON.stringify(data))
                    previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
                } else {
                    groupGeojson.value = { type: 'FeatureCollection', features: [] }
                    previousIds = new Set()
                }
            } else {
                groupGeojson.value = { type: 'FeatureCollection', features: [] }
                previousIds = new Set()
            }

            const source = map01.getSource('group-points-source')
            if (source) {
                setTimeout(() => {
                    source.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
                    map01.triggerRepaint()
                }, 500)
            }

            isInitializing = false

            map01.on('click',async (e) => {
                const now = Date.now()
                if (now - lastClickTimestamp < 300) return
                lastClickTimestamp = now

                if (e.originalEvent?.target?.classList.contains('point-remove')) return

                const features = map01.queryRenderedFeatures(e.point, {
                    layers: ['oh-group-points-layer']
                })
                targetFeatures = features

                if (features.length > 0) return
                if (!e.lngLat) return

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
                    saveGroupGeojson(groupId, layerId, groupGeojson.value)
                }

                if (!isInitializing) {
                    await saveGroupGeojson(groupId, layerId, groupGeojson.value);
                    const source = map01.getSource('group-points-source');
                    if (source) {
                        source.setData(JSON.parse(JSON.stringify(groupGeojson.value)));
                        map01.triggerRepaint();
                        console.log('強制的にソース更新');
                    }
                }


            })

            const mapElm = document.querySelector('#map01')
            mapElm.removeEventListener('click', handleMapClick)
            mapElm.addEventListener('click', handleMapClick)
        },
        { immediate: true }
    )
}





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
//
// // Mac Chrome 対策：フォーカス復帰時に Snapshot を再登録
// window.addEventListener('focus', async () => {
//     const groupId = store.state.currentGroupName
//     const map01 = store.state.map01
//     if (!groupId || !map01) return
//
//     console.log('👀 focus event → 再同期開始')
//
//     // 既存の Snapshot を解除
//     if (unsubscribeSnapshot) {
//         unsubscribeSnapshot()
//         unsubscribeSnapshot = null
//     }
//
//     // 最新状態を取得して描画
//     const doc = await db.collection('groups').doc(groupId).get()
//     const layerData = doc.data()?.layers?.points
//     if (layerData) {
//         groupGeojson.value = JSON.parse(JSON.stringify(layerData))
//         previousIds = new Set(layerData.features.map(f => f.properties?.id))
//
//         const source = map01.getSource('group-points-source')
//         if (source) {
//             source.setData(groupGeojson.value)
//             map01.triggerRepaint()
//         }
//     }
//
//     // 再登録（同じ内容で OK）
//     unsubscribeSnapshot = db.collection('groups').doc(groupId)
//         .onSnapshot({ includeMetadataChanges: true }, (doc) => {
//             const data = doc.data()
//             if (data && data.layers && data.layers.points) {
//                 const features = data.layers.points.features || []
//                 const currentIds = new Set(features.map(f => f.properties?.id))
//                 const newIds = [...currentIds].filter(id => !previousIds.has(id))
//                 const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
//
//                 console.log('📡 Snapshot (refocus) fired')
//                 console.log('🆕 new:', newIds, '🗑️ deleted:', deletedIds)
//
//                 previousIds = currentIds
//                 groupGeojson.value.features = features
//
//                 const source = map01.getSource('group-points-source')
//                 if (source) {
//                     source.setData({ type: 'FeatureCollection', features })
//                     map01.triggerRepaint()
//                 }
//
//                 if (newIds.length > 0) {
//                     store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました`)
//                 } else if (deletedIds.length > 0) {
//                     store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました`)
//                 }
//             }
//         })
// })
//
// // // 🔁 復帰時にFirestoreの最新状態で再同期
// // window.addEventListener('focus', async () => {
// //     const doc = await db.collection('groups').doc(store.state.currentGroupName).get()
// //     const layerData = doc.data()?.layers?.points
// //     if (layerData) {
// //         groupGeojson.value = JSON.parse(JSON.stringify(layerData))
// //         store.state.map01?.getSource('group-points-source')?.setData(groupGeojson.value)
// //         store.state.map01?.triggerRepaint()
// //     }
// // })
//
// async function saveGroupGeojson(groupId, layerId, geojson) {
//     if (!groupId) {
//         console.warn('グループIDが未定義のため保存スキップ')
//         return
//     }
//
//     // 🔁 コピーして updatedAt を追加し強制的に差分を作る
//     const updatedGeojson = JSON.parse(JSON.stringify(geojson))
//     updatedGeojson.updatedAt = Date.now()
//
//     try {
//         await db.collection('groups').doc(groupId).set(
//             {
//                 layers: {
//                     [layerId]: updatedGeojson
//                 },
//                 lastModifiedBy: store.state.userId,
//                 lastModifiedAt: Date.now()
//             },
//             { merge: true }
//         )
//         console.log('✅ Firestore 更新完了')
//     } catch (err) {
//         console.error('🔥 Firestore 更新失敗:', err)
//     }
// }
//
//
// // async function saveGroupGeojson(groupId, layerId, geojson) {
// //     if (!groupId) {
// //         console.warn('グループIDが未定義のため保存スキップ')
// //         return
// //     }
// //
// //     // 🔁 geojson に常に変化があるように updatedAt を更新
// //     const geojsonWithMeta = {
// //         ...geojson,
// //         updatedAt: Date.now()
// //     }
// //
// //     try {
// //         await db.collection('groups').doc(groupId).set(
// //             {
// //                 layers: {
// //                     [layerId]: geojsonWithMeta
// //                 },
// //                 lastModifiedBy: store.state.userId,
// //                 lastModifiedAt: Date.now()
// //             },
// //             { merge: true }
// //         )
// //     } catch (err) {
// //         console.error('🔥 Firestore 保存失敗:', err)
// //     }
// // }
//
//
// // async function saveGroupGeojson(groupId, layerId, geojson) {
// //     if (!groupId) {
// //         console.warn('グループIDが未定義のため保存スキップ')
// //         return
// //     }
// //     const docRef = db.collection('groups').doc(groupId)
// //     await docRef.set(
// //         {
// //             layers: {
// //                 [layerId]: geojson
// //             },
// //             lastModifiedBy: store.state.userId,
// //             lastModifiedAt: Date.now()
// //         },
// //         { merge: true }
// //     )
// // }
//
// function deleteAllPoints() {
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
//     const groupId = store.state.currentGroupName
//     saveGroupGeojson(groupId, 'points', groupGeojson.value)
//
//     console.log('✅ 全ポイント削除完了')
// }
//
// function handleMapClick(e) {
//     const map = store.state.map01
//     const groupId = store.state.currentGroupName
//     const layerId = 'points'
//
//     if (!(e.target && e.target.classList.contains('point-remove'))) return
//
//     const idsToDelete = new Set((targetFeatures || []).map(f => String(f.properties.id)))
//     console.log('🗑️ 削除候補 IDs:', idsToDelete)
//
//     const beforeLength = groupGeojson.value.features.length
//     groupGeojson.value.features = groupGeojson.value.features.filter(
//         f => !idsToDelete.has(String(f.properties.id))
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
//     saveGroupGeojson(groupId, layerId, groupGeojson.value)
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
//                         // if (!isInitializing) {
//                         //     if (newIds.length > 0) {
//                         //         store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました`)
//                         //     } else if (deletedIds.length > 0) {
//                         //         store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました`)
//                         //     }
//                         // }
//                         if (!isInitializing && data.lastModifiedBy !== store.state.userId) {
//                             if (newIds.length > 0) {
//                                 store.commit('showSnackbarForGroup', `🔴 他のユーザーが ${newIds.length} 件のポイントを追加しました`)
//                             } else if (deletedIds.length > 0) {
//                                 store.commit('showSnackbarForGroup', `🗑️ 他のユーザーが ${deletedIds.length} 件のポイントを削除しました`)
//                             }
//                         }
//
//
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
//             map01.on('click', (e) => {
//                 const now = Date.now()
//                 if (now - lastClickTimestamp < 300) return
//                 lastClickTimestamp = now
//
//                 if (e.originalEvent?.target?.classList.contains('point-remove')) return
//
//                 const features = map01.queryRenderedFeatures(e.point, {
//                     layers: ['oh-group-points-layer']
//                 })
//                 targetFeatures = features
//
//                 if (features.length > 0) return
//                 if (!e.lngLat) return
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
//                 groupGeojson.value.features.push(pointFeature)
//                 requestAnimationFrame(() => {
//                     map01.getSource('group-points-source')?.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
//                     map01.triggerRepaint()
//                 })
//                 if (!isInitializing) {
//                     saveGroupGeojson(groupId, layerId, groupGeojson.value)
//                 }
//             })
//
//             const mapElm = document.querySelector('#map01')
//             mapElm.removeEventListener('click', handleMapClick)
//             mapElm.addEventListener('click', handleMapClick)
//         },
//         { immediate: true }
//     )
// }



// import store from '@/store'
// import maplibregl from 'maplibre-gl'
// import { db } from '@/firebase'
// import { watch } from 'vue'
// import { groupGeojson } from '@/js/layers'
// import { popups } from '@/js/popup'
//
// let targetFeatures
// let unsubscribeSnapshot = null
// let lastClickTimestamp = 0
// let previousIds = new Set()
//
// // 🔁 復帰時にFirestoreの最新状態で再同期
// window.addEventListener('focus', async () => {
//     const doc = await db.collection('groups').doc(store.state.currentGroupName).get()
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
// function deleteAllPoints() {
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
//     const groupId = store.state.currentGroupName
//     saveGroupGeojson(groupId, 'points', groupGeojson.value)
//
//     console.log('✅ 全ポイント削除完了')
// }
// // deleteAllPoints()
//
// function handleMapClick(e) {
//     const map = store.state.map01
//     const groupId = store.state.currentGroupName
//     const layerId = 'points'
//
//     if (!(e.target && e.target.classList.contains('point-remove'))) return
//
//     targetFeatures.forEach(targetFeature => {
//         const targetId = String(targetFeature.properties.id)
//         console.log('🗑️ 削除対象 ID:', targetId)
//
//         groupGeojson.value.features = groupGeojson.value.features.filter(
//             (f) => String(f.properties.id) !== targetId
//         )
//
//         requestAnimationFrame(() => {
//             map.getSource('group-points-source')?.setData(
//                 JSON.parse(JSON.stringify(groupGeojson.value))
//             )
//             map.triggerRepaint()
//         })
//
//         saveGroupGeojson(groupId, layerId, groupGeojson.value)
//     })
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
//             unsubscribeSnapshot = db.collection('groups').doc(groupId)
//                 .onSnapshot((doc) => {
//                     const data = doc.data()
//                     if (data && data.layers && data.layers[layerId]) {
//                         const features = data.layers[layerId].features || []
//                         const currentIds = new Set(features.map(f => f.properties?.id))
//                         const newIds = [...currentIds].filter(id => !previousIds.has(id))
//                         const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
//
//                         // ✅ 他人の操作だけスナックバー表示
//                         if (!isInitializing && data.lastModifiedBy !== store.state.userId) {
//                             if (newIds.length > 0) {
//                                 store.commit('showSnackbarForGroup', `🔴 他のユーザーが ${newIds.length} 件のポイントを追加しました`)
//                             } else if (deletedIds.length > 0) {
//                                 store.commit('showSnackbarForGroup', `🗑️ 他のユーザーが ${deletedIds.length} 件のポイントを削除しました`)
//                             }
//                         }
//
//                         // ✅ 自分の操作も含めてスナックバー表示
//
//                         // if (!isInitializing) {
//                         //     if (newIds.length > 0) {
//                         //         store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました`)
//                         //     } else if (deletedIds.length > 0) {
//                         //         store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました`)
//                         //     }
//                         // }
//
//                         previousIds = currentIds
//
//                         groupGeojson.value = JSON.parse(JSON.stringify(data.layers[layerId]))
//                         const source = map01.getSource('group-points-source')
//                         if (source) {
//                             source.setData(groupGeojson.value)
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
//             if (!map01.getSource('group-points-source')) {
//                 map01.addSource('group-points-source', {
//                     type: 'geojson',
//                     data: groupGeojson.value
//                 })
//             }
//
//             if (!map01.getLayer('oh-group-points-layer')) {
//                 map01.addLayer({
//                     id: 'oh-group-points-layer',
//                     type: 'circle',
//                     source: 'group-points-source',
//                     paint: {
//                         'circle-radius': 8,
//                         'circle-color': '#ff0000',
//                         'circle-stroke-width': 2,
//                         'circle-stroke-color': '#ffffff'
//                     }
//                 })
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
//             map01.on('click', (e) => {
//                 const now = Date.now()
//                 if (now - lastClickTimestamp < 300) return
//                 lastClickTimestamp = now
//
//                 if (e.originalEvent?.target?.classList.contains('point-remove')) return
//
//                 const features = map01.queryRenderedFeatures(e.point, {
//                     layers: ['oh-group-points-layer']
//                 })
//                 targetFeatures = features
//
//                 if (features.length > 0) return
//                 if (!e.lngLat) return
//
//                 const { lng, lat } = e.lngLat
//                 const pointFeature = {
//                     type: 'Feature',
//                     geometry: {
//                         type: 'Point',
//                         coordinates: [lng, lat]
//                     },
//                     properties: {
//                         id: Date.now().toString(),
//                         createdAt: Date.now()
//                     }
//                 }
//                 groupGeojson.value.features.push(pointFeature)
//                 requestAnimationFrame(() => {
//                     map01.getSource('group-points-source')?.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
//                     map01.triggerRepaint()
//                 })
//                 if (!isInitializing) {
//                     saveGroupGeojson(groupId, layerId, groupGeojson.value)
//                 }
//             })
//
//             const mapElm = document.querySelector('#map01')
//             mapElm.removeEventListener('click', handleMapClick)
//             mapElm.addEventListener('click', handleMapClick)
//         },
//         { immediate: true }
//     )
// }
//
// // import store from '@/store'
// // import maplibregl from 'maplibre-gl'
// // import { db } from '@/firebase'
// // import { watch } from 'vue'
// // import { groupGeojson } from '@/js/layers'
// // import { popups } from '@/js/popup'
// //
// // let targetFeatures
// // let unsubscribeSnapshot = null
// // let lastClickTimestamp = 0
// // let prevIds = new Set()
// // let previousIds = new Set()
// //
// // window.addEventListener('focus', async () => {
// //     const doc = await db.collection('groups').doc(store.state.currentGroupName).get()
// //     const layerData = doc.data()?.layers?.points
// //     if (layerData) {
// //         groupGeojson.value = JSON.parse(JSON.stringify(layerData))
// //         store.state.map01?.getSource('group-points-source')?.setData(groupGeojson.value)
// //         store.state.map01?.triggerRepaint()
// //     }
// // })
// //
// // async function saveGroupGeojson(groupId, layerId, geojson) {
// //     if (!groupId) {
// //         console.warn('グループIDが未定義のため保存スキップ')
// //         return
// //     }
// //     const docRef = db.collection('groups').doc(groupId)
// //     await docRef.set(
// //         {
// //             layers: {
// //                 [layerId]: geojson
// //             }
// //         },
// //         { merge: true }
// //     )
// // }
// //
// // function deleteAllPoints() {
// //     if (!confirm('本当にすべてのポイントを削除しますか？')) return
// //
// //     groupGeojson.value.features = []
// //
// //     const map = store.state.map01
// //     if (map && map.getSource('group-points-source')) {
// //         requestAnimationFrame(() => {
// //             map.getSource('group-points-source').setData({
// //                 type: 'FeatureCollection',
// //                 features: []
// //             })
// //             map.triggerRepaint()
// //         })
// //     }
// //
// //     const groupId = store.state.currentGroupName
// //     saveGroupGeojson(groupId, 'points', groupGeojson.value)
// //
// //     console.log('✅ 全ポイント削除完了')
// // }
// //
// // function handleMapClick(e) {
// //     const map = store.state.map01
// //     const groupId = store.state.currentGroupName
// //     const layerId = 'points'
// //
// //     if (!(e.target && e.target.classList.contains('point-remove'))) return
// //
// //     targetFeatures.forEach(targetFeature => {
// //
// //         const targetId = String(targetFeature.properties.id)
// //         console.log('🗑️ 削除対象 ID:', targetId)
// //
// //         groupGeojson.value.features = groupGeojson.value.features.filter(
// //             (f) => String(f.properties.id) !== targetId
// //         )
// //
// //         requestAnimationFrame(() => {
// //             map.getSource('group-points-source')?.setData(
// //                 JSON.parse(JSON.stringify(groupGeojson.value))
// //             )
// //             map.triggerRepaint()
// //         })
// //
// //         saveGroupGeojson(groupId, layerId, groupGeojson.value)
// //     })
// //
// //     popups.forEach(popup => popup.remove())
// //     popups.length = 0
// // }
// //
// // export default function useGloupLayer() {
// //     watch(
// //         () => [store.state.map01, store.state.currentGroupName],
// //         async ([map01, groupId]) => {
// //             if (!map01 || !groupId) {
// //                 console.warn('map01 or groupId が未定義')
// //                 return
// //             }
// //
// //             const layerId = 'points'
// //             let isInitializing = true
// //
// //             // Firestoreのリアルタイムリスナーを設定
// //             if (unsubscribeSnapshot) unsubscribeSnapshot()
// //
// //             unsubscribeSnapshot = db.collection('groups').doc(groupId)
// //                 .onSnapshot((doc) => {
// //                     const data = doc.data()
// //                     if (data && data.layers && data.layers[layerId]) {
// //                         const features = data.layers[layerId].features || []
// //                         const currentIds = new Set(features.map(f => f.properties?.id))
// //                         const newIds = [...currentIds].filter(id => !previousIds.has(id))
// //                         const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
// //
// //                         if (!isInitializing) {
// //                             if (newIds.length > 0) {
// //                                 store.commit('showSnackbarForGroup', `🔴 他のユーザーが ${newIds.length} 件のポイントを追加しました`)
// //                             } else if (deletedIds.length > 0) {
// //                                 store.commit('showSnackbarForGroup', `🗑️ 他のユーザーが ${deletedIds.length} 件のポイントを削除しました`)
// //                             }
// //                         }
// //
// //                         previousIds = currentIds
// //
// //                         groupGeojson.value = JSON.parse(JSON.stringify(data.layers[layerId]))
// //                         const source = map01.getSource('group-points-source')
// //                         if (source) {
// //                             if (source) {
// //                                 setTimeout(() => {
// //                                     source.setData(groupGeojson.value)
// //                                     map01.triggerRepaint()
// //                                 },1000)
// //                             }
// //                         }
// //                     }
// //                 })
// //
// //             // 初期読み込み（最初の一度だけ）
// //             const doc = await db.collection('groups').doc(groupId).get()
// //
// //             if (doc.exists) {
// //                 const data = doc.data()?.layers?.[layerId]
// //                 if (data) {
// //                     groupGeojson.value = JSON.parse(JSON.stringify(data))
// //                     previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
// //                 } else {
// //                     groupGeojson.value = { type: 'FeatureCollection', features: [] }
// //                     previousIds = new Set()
// //                 }
// //             } else {
// //                 groupGeojson.value = { type: 'FeatureCollection', features: [] }
// //                 previousIds = new Set()
// //             }
// //
// //             if (!map01.getSource('group-points-source')) {
// //                 map01.addSource('group-points-source', {
// //                     type: 'geojson',
// //                     data: groupGeojson.value
// //                 })
// //             }
// //
// //             const source = map01.getSource('group-points-source')
// //             if (source) {
// //                 setTimeout(() => {
// //                     source.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
// //                     map01.triggerRepaint()
// //                 }, 1000)
// //             }
// //
// //             isInitializing = false
// //
// //             map01.on('click', (e) => {
// //                 const now = Date.now()
// //                 if (now - lastClickTimestamp < 300) return
// //                 lastClickTimestamp = now
// //
// //                 const features = map01.queryRenderedFeatures(e.point, {
// //                     layers: ['oh-group-points-layer']
// //                 })
// //                 targetFeatures = features
// //                 if (e.originalEvent?.target?.classList.contains('point-remove')) return
// //                 if (features.length > 0) return
// //                 if (!e.lngLat) return
// //
// //                 const { lng, lat } = e.lngLat
// //                 const pointFeature = {
// //                     type: 'Feature',
// //                     geometry: {
// //                         type: 'Point',
// //                         coordinates: [lng, lat]
// //                     },
// //                     properties: {
// //                         id: Date.now().toString(),
// //                         createdAt: Date.now()
// //                     }
// //                 }
// //                 groupGeojson.value.features.push(pointFeature)
// //                 requestAnimationFrame(() => {
// //                     map01.getSource('group-points-source')?.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
// //                     map01.triggerRepaint()
// //                 })
// //                 if (!isInitializing) {
// //                     saveGroupGeojson(groupId, layerId, groupGeojson.value)
// //                 }
// //             })
// //
// //             const mapElm = document.querySelector('#map01')
// //             mapElm.removeEventListener('click', handleMapClick)
// //             mapElm.addEventListener('click', handleMapClick)
// //         },
// //         { immediate: true }
// //     )
// // }