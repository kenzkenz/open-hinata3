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
let isInitializing = false
let justChangedGroup = false
let isInitialStartup = true

function handleMapClickWithCurrentGroup(e) {
    const currentGroupId = store.state.currentGroupName
    handleMapClick(e, currentGroupId)
}

// wrapper 関数を追加
// function handleMapClickWithGroup(e, groupId) {
//     handleMapClick(e, groupId)
// }

async function fetchAndSetGeojson(groupId, map) {
    const doc = await db.collection('groups').doc(groupId).get()
    const layerData = doc.data()?.layers?.points
    if (layerData) {
        groupGeojson.value = JSON.parse(JSON.stringify(layerData))
        setTimeout(() => {
            map?.getSource('group-points-source')?.setData(groupGeojson.value)
            map?.triggerRepaint()
        }, 0)
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
// 例：現在のグループIDを取得して実行
// deleteAllPoints(store.state.currentGroupName)

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

            if (!map.getSource('group-points-source')) {
                map.addSource('group-points-source', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                })
            }

            if (!map.getLayer('oh-group-points-layer')) {
                map.addLayer({
                    id: 'oh-group-points-layer',
                    type: 'circle',
                    source: 'group-points-source',
                    paint: {
                        'circle-radius': 8,
                        'circle-color': '#ff0000',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff'
                    }
                })
            }

            isInitializing = true
            await fetchAndSetGeojson(groupId, map)
            previousIds = new Set(groupGeojson.value.features.map(f => f.properties?.id))
            isInitializing = false
        },
        { immediate: false, deep: true }
    )

    watch(
        () => store.state.currentGroupName,
        async (groupId) => {
            const map01 = store.state.map01

            if (!map01 || !groupId) {
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot()
                    unsubscribeSnapshot = null
                }
                if (map01?.getLayer('oh-group-points-layer')) {
                    map01.removeLayer('oh-group-points-layer')
                }
                if (map01?.getSource('group-points-source')) {
                    map01.removeSource('group-points-source')
                }
                store.state.selectedLayers.map01 = store.state.selectedLayers.map01.filter(
                    l => l.id !== 'oh-gloup-layer'
                )
                groupGeojson.value.features = []
                previousIds = new Set()
                return
            }

            const layerId = 'points'
            isInitializing = true
            justChangedGroup = true

            if (unsubscribeSnapshot) unsubscribeSnapshot()

            if (map01.getLayer('oh-group-points-layer')) {
                map01.removeLayer('oh-group-points-layer')
            }
            if (map01.getSource('group-points-source')) {
                map01.removeSource('group-points-source')
            }

            // とりあえずコメントアウト。このコメントを外すと起動時にグループレイヤーが表示される。
            // しかしポップアップは復帰しない。
            // if (!isInitialStartup) {
                store.state.selectedLayers.map01 = store.state.selectedLayers.map01.filter(
                    l => l.id !== 'oh-gloup-layer'
                )
            // }

            isInitialStartup = false

            // setTimeout(() => {
            //     justChangedGroup = false
            // }, 500)

            // 🔒 justChangedGroup を安全に false に戻す
            setTimeout(() => {
                justChangedGroup = false
            }, 0)

            groupGeojson.value = { type: 'FeatureCollection', features: [] }

            unsubscribeSnapshot = db.collection('groups').doc(groupId)
                .onSnapshot({ includeMetadataChanges: true }, (doc) => {
                    const data = doc.data()
                    if (data && data.layers && data.layers[layerId]) {
                        const features = data.layers[layerId].features || []
                        const currentIds = new Set(features.map(f => f.properties?.id))
                        const newIds = [...currentIds].filter(id => !previousIds.has(id))
                        const deletedIds = [...previousIds].filter(id => !currentIds.has(id))
                        const userNickname = store.state.myNickname
                        // ✅ 通知はグループ変更では出さないようにする
                        if (!isInitializing && !justChangedGroup) {
                            // if (newIds.length > 0) {
                            //     store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`)
                            // } else if (deletedIds.length > 0) {
                            //     store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`)
                            // }
                            if (newIds.length === 1) {
                                store.commit('showSnackbarForGroup', `🔴 ${newIds.length} 件のポイントが追加されました。${userNickname}`)
                            } else if (deletedIds.length === 1) {
                                store.commit('showSnackbarForGroup', `🗑️ ${deletedIds.length} 件のポイントが削除されました。${userNickname}`)
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
                        createdAt: Date.now(),
                        createdBy: store.state.myNickname || '不明', // 👈 これを追加
                        description: 'テスト' // 👈 任意で初期化（空文字でOK）
                    }
                }
                // ✅ 追加前にグループ名をアラート表示
                // alert(`✅ 書き込み先グループ: ${store.state.currentGroupName}`)
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
            mapElm.removeEventListener('click', handleMapClickWithCurrentGroup)
            mapElm.addEventListener('click', handleMapClickWithCurrentGroup)

        },
        { immediate: true }
    )
}
