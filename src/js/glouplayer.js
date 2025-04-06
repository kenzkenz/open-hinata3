import store from '@/store'
import maplibregl from 'maplibre-gl'
import * as turf from '@turf/turf'
import { nextTick, toRef, reactive, ref, computed, watch } from 'vue';
export default function useGloupLayer() {
    watch(
        () => store.state.map01,
        (map01) => {
            if (!map01) return;
            console.log(map01)
            map01.on('load', () => {
                map01.on('click', (e) => {
                    console.log(map01.getStyle().layers)
                    const hasLayer = map01.getStyle().layers.some(layer => layer.id === 'oh-group-points-layer');
                    if (!hasLayer || !e.lngLat) return;
                    const { lng, lat } = e.lngLat;
                    new maplibregl.Marker()
                        .setLngLat([lng, lat])
                        .addTo(map01); // map01 を使って追加！
                });
            })
        },
        { immediate: true }
    );
}