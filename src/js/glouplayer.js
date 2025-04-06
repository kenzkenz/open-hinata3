import store from '@/store'
import maplibregl from 'maplibre-gl'
import { db } from '@/firebase'
import { watch } from 'vue'
import { groupGeojson } from '@/js/layers'

// Firestore に保存
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
            }
        },
        { merge: true }
    )
}

// Firestore から読み込み
async function loadGroupGeojson(groupId, layerId) {
    if (!groupId) {
        console.warn('グループIDが未定義のため読み込みスキップ')
        return null
    }
    const docRef = db.collection('groups').doc(groupId)
    const snap = await docRef.get()
    if (snap.exists) {
        return snap.data()?.layers?.[layerId] || null
    } else {
        console.warn('グループデータがFirestoreに存在しません')
        return null
    }
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

            const setupMapLogic = async () => {
                // 1. Firestoreから読み込み
                const geojson = await loadGroupGeojson(groupId, layerId)
                if (geojson) {
                    groupGeojson.value = geojson
                }

                // 2. ソース追加 or 更新
                if (!map01.getSource('group-points-source')) {
                    map01.addSource('group-points-source', {
                        type: 'geojson',
                        data: groupGeojson.value
                    })
                } else {
                    map01.getSource('group-points-source')?.setData(groupGeojson.value)
                }

                // 3. レイヤー追加監視＋クリック登録
                let clickRegistered = false
                const checkLayerInterval = setInterval(() => {
                    if (map01.getLayer('oh-group-points-layer') && !clickRegistered) {
                        console.log('✅ レイヤー検知 → クリックイベント登録')

                        // ✅ ポイントを強制描画（復活させる）
                        const source = map01.getSource('group-points-source')
                        if (source) {
                            source.setData(groupGeojson.value)
                        }

                        // ✅ クリックイベント登録
                        map01.on('click', (e) => {
                            if (!e.lngLat) return
                            const { lng, lat } = e.lngLat

                            const pointFeature = {
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: [lng, lat]
                                },
                                properties: {
                                    createdAt: Date.now()
                                }
                            }

                            groupGeojson.value.features.push(pointFeature)
                            map01.getSource('group-points-source')?.setData(groupGeojson.value)
                            saveGroupGeojson(groupId, layerId, groupGeojson.value)
                        })

                        clickRegistered = true
                        clearInterval(checkLayerInterval)
                    }
                }, 300) // 0.3秒ごとにレイヤー存在チェック
            }

            if (map01.loaded()) {
                await setupMapLogic()
            } else {
                map01.on('load', setupMapLogic)
            }
        },
        { immediate: true }
    )
}
