// MapLibre用: Mapillaryカバレッジ（シーケンス線＆画像点）をレイヤー表示
// 使い方:
// import { addMapillaryCoverage, removeMapillaryCoverage, toggleMapillaryCoverage } from '@/lib/addMapillaryCoverage'
// map.on('load', () => addMapillaryCoverage(map, 'MLY|YOUR_TOKEN_HERE'))

export function addMapillaryCoverage(map, mapillaryToken) {
    if (!map || !mapillaryToken) return;

    const sourceId = 'mapillary-coverage';

    // 既存なら一旦削除（再実行に強く）
    if (map.getLayer('oh-mapillary-images')) map.removeLayer('oh-mapillary-images');
    if (map.getLayer('oh-mapillary-sequences')) map.removeLayer('oh-mapillary-sequences');
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Mapillary Vector Tile ソース（mly1_public）
    map.addSource(sourceId, {
        type: 'vector',
        tiles: [
            `https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${mapillaryToken}`
        ],
        minzoom: 0,
        maxzoom: 14,
        attribution: '© Mapillary'
    });

    // シーケンス（走行軌跡）をラインで表示
    map.addLayer({
        id: 'oh-mapillary-sequences',
        type: 'line',
        source: sourceId,
        'source-layer': 'sequence',
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-opacity': 0.6,
            'line-width': [
                'interpolate', ['linear'], ['zoom'],
                8, 0.5,
                12, 1.2,
                16, 2.0
            ],
            'line-color': '#35AF6D'
        }
    });

    // 画像位置（ポイント）を円で表示（ズーム 13+ で）
    map.addLayer({
        id: 'oh-mapillary-images',
        type: 'circle',
        source: sourceId,
        'source-layer': 'image',
        minzoom: 13,
        paint: {
            'circle-opacity': 0.7,
            'circle-stroke-color': '#1b5e3a',
            'circle-stroke-width': 1,
            'circle-color': '#35AF6D',
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                13, 2,
                16, 4,
                19, 6
            ]
        }
    });

    // --- クリック/ホバーのハンドラを登録（後で外せるように保持）
    const onClickImages = (e) => {
        const f = e.features && e.features[0];
        const props = f && f.properties ? f.properties : {};
        const imgId = props.id || props.image_id; // 両対応
        if (imgId) window.open(`https://www.mapillary.com/app/?image=${imgId}`, '_blank');
    };
    const onClickSequences = (e) => {
        const f = e.features && e.features[0];
        const props = f && f.properties ? f.properties : {};
        const imgId = props.id || props.image_id;
        if (imgId) window.open(`https://www.mapillary.com/app/?image=${imgId}`, '_blank');
    };
    const onEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onLeave = () => { map.getCanvas().style.cursor = ''; };

    map.on('click', 'oh-mapillary-images', onClickImages);
    map.on('click', 'oh-mapillary-sequences', onClickSequences);
    map.on('mouseenter', 'oh-mapillary-images', onEnter);
    map.on('mouseleave', 'oh-mapillary-images', onLeave);
    map.on('mouseenter', 'oh-mapillary-sequences', onEnter);
    map.on('mouseleave', 'oh-mapillary-sequences', onLeave);

    map.__mlyHandlers = { onClickImages, onClickSequences, onEnter, onLeave };
}

export function removeMapillaryCoverage(map) {
    if (!map) return;
    const sourceId = 'mapillary-coverage';

    const h = map.__mlyHandlers || {};
    try { if (h.onClickImages) map.off('click', 'oh-mapillary-images', h.onClickImages); } catch (_) {}
    try { if (h.onClickSequences) map.off('click', 'oh-mapillary-sequences', h.onClickSequences); } catch (_) {}
    try { if (h.onEnter) map.off('mouseenter', 'oh-mapillary-images', h.onEnter); } catch (_) {}
    try { if (h.onLeave) map.off('mouseleave', 'oh-mapillary-images', h.onLeave); } catch (_) {}
    try { if (h.onEnter) map.off('mouseenter', 'oh-mapillary-sequences', h.onEnter); } catch (_) {}
    try { if (h.onLeave) map.off('mouseleave', 'oh-mapillary-sequences', h.onLeave); } catch (_) {}
    delete map.__mlyHandlers;

    if (map.getLayer('oh-mapillary-images')) map.removeLayer('oh-mapillary-images');
    if (map.getLayer('oh-mapillary-sequences')) map.removeLayer('oh-mapillary-sequences');
    if (map.getSource(sourceId)) map.removeSource(sourceId);
}

export function toggleMapillaryCoverage(map, token, enabled) {
    const has = !!map.getSource('mapillary-coverage');
    if (enabled && !has) return addMapillaryCoverage(map, token);
    if (!enabled && has) return removeMapillaryCoverage(map);
}
