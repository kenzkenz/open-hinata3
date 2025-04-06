import store from '@/store'
import maplibregl from 'maplibre-gl'
import * as turf from '@turf/turf'
import { nextTick, toRef, reactive, ref, computed, watch } from 'vue';
import {gropuGeojson, groupGeojson} from "@/js/layers";
export default function useGloupLayer() {
    watch(
        () => store.state.map01,
        (map01) => {
            if (!map01) return;
            console.log(map01)
            map01.on('load', () => {
                map01.on('click', (e) => {
                    if (!map01.getLayer('oh-group-points-layer') || !e.lngLat) return;
                    const { lng, lat } = e.lngLat;
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
                    // GeoJSONに追加
                    groupGeojson.value.features.push(pointFeature)
                    // 地図に反映
                    const source = map01.getSource('group-points-source')
                    if (source) {
                        source.setData(groupGeojson.value)
                    }
                });
            })
        },
        { immediate: true }
    );
}