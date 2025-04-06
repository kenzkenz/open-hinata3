import store from '@/store'
import maplibregl from 'maplibre-gl'
import { db } from '@/firebase'
import { watch } from 'vue'
import { groupGeojson } from '@/js/layers'
import {popups} from "@/js/popup";

let targetFeatures

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

function handleMapClick(e) {
    const map = store.state.map01
    const groupId = store.state.currentGroupName
    const layerId = 'points'
    // // ボタンクリックでなければスキップ
    if (!(e.target && e.target.classList.contains('point-remove'))) return

    const targetId = String(targetFeatures[0].properties.id)
    console.log('🗑️ 削除対象 ID:', targetId)

    groupGeojson.value.features = groupGeojson.value.features.filter(
        (f) => String(f.properties.id) !== targetId
    )

    requestAnimationFrame(() => {
        map.getSource('group-points-source')?.setData(
            JSON.parse(JSON.stringify(groupGeojson.value))
        )
        map.triggerRepaint()
    })

    saveGroupGeojson(groupId, layerId, groupGeojson.value)

    popups.forEach(popup => popup.remove());
    popups.length = 0;

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

            const geojson = await loadGroupGeojson(groupId, layerId)
            if (geojson) {
                groupGeojson.value = JSON.parse(JSON.stringify(geojson))
            } else {
                groupGeojson.value = {
                    type: 'FeatureCollection',
                    features: []
                }
            }

            if (!map01.getSource('group-points-source')) {
                map01.addSource('group-points-source', {
                    type: 'geojson',
                    data: groupGeojson.value
                })
            }

            const source = map01.getSource('group-points-source')
            if (source) {
                setTimeout(() => {
                    source.setData(JSON.parse(JSON.stringify(groupGeojson.value)))
                    map01.triggerRepaint()
                },500)
            }

            isInitializing = false

            map01.on('click', (e) => {
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
                        id: Date.now().toString(),
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
            })

            const mapElm = document.querySelector('#map01')
            mapElm.removeEventListener('click', handleMapClick)
            mapElm.addEventListener('click', handleMapClick)
        },
        { immediate: true }
    )
}
