import store from '@/store'
import maplibregl from 'maplibre-gl'
import { db } from '@/firebase'
import { watch } from 'vue'
import { groupGeojson } from '@/js/layers'

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

function deleteAllPoints() {
    if (!confirm('本当にすべてのポイントを削除しますか？')) return

    groupGeojson.value.features = []

    const map = store.state.map01
    if (map && map.getSource('group-points-source')) {
        map.getSource('group-points-source').setData(groupGeojson.value)
        map.triggerRepaint()
    }

    const groupId = store.state.currentGroupName
    saveGroupGeojson(groupId, 'points', groupGeojson.value)

    console.log('✅ 全ポイント削除完了')
}

// 削除ボタン処理を先に定義
function handleMapClick(e) {
    const map = store.state.map01
    const groupId = store.state.currentGroupName
    const layerId = 'points'

    if (e.target && e.target.classList.contains('point-remove')) {
        const id = Number(e.target.getAttribute('data-id'))
        if (!id) return
        groupGeojson.value.features = groupGeojson.value.features.filter(
            (f) => f.properties.id !== id
        )
        map.getSource('group-points-source')?.setData(groupGeojson.value)
        map.triggerRepaint()
        saveGroupGeojson(groupId, layerId, groupGeojson.value)
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

            const geojson = await loadGroupGeojson(groupId, layerId)
            if (geojson) {
                groupGeojson.value = geojson
            }

            if (!map01.getSource('group-points-source')) {
                map01.addSource('group-points-source', {
                    type: 'geojson',
                    data: groupGeojson.value
                })
            }

            if (!map01.getLayer('oh-group-points-layer')) {
                map01.addLayer({
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

            const source = map01.getSource('group-points-source')
            if (source) {
                source.setData(groupGeojson.value)
                map01.triggerRepaint()
            }

            map01.on('click', (e) => {
                const features = map01.queryRenderedFeatures(e.point, {
                    layers: ['oh-group-points-layer']
                })
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
                        id: Date.now(),
                        createdAt: Date.now()
                    }
                }
                groupGeojson.value.features.push(pointFeature)
                map01.getSource('group-points-source')?.setData(groupGeojson.value)
                map01.triggerRepaint()
                saveGroupGeojson(groupId, layerId, groupGeojson.value)
            })

            const mapElm = document.querySelector('#map01')
            mapElm.removeEventListener('click', handleMapClick)
            mapElm.addEventListener('click', handleMapClick)
        },
        { immediate: true }
    )
}