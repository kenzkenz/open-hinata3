import {user} from "@/authState";
import store from '@/store'
import * as turf from '@turf/turf'
import { nextTick, toRef, reactive, ref, computed, watch } from 'vue';

// export async function fetchGsiTile() {
//     const res = await fetch('https://maps.gsi.go.jp/development/ichiran.html');
//     const html = await res.text();
//     const doc = new DOMParser().parseFromString(html, 'text/html');
//
//     const result = {};
//     const titles = doc.querySelectorAll('h4.title');
//
//     titles.forEach(titleEl => {
//         const id = titleEl.getAttribute('id');
//         if (!id) return;
//
//         const baseTitle = titleEl.textContent.trim();
//         const layers = [];
//
//         let el = titleEl.nextElementSibling;
//
//         // source 抽出
//         if (!(el && el.classList.contains('source'))) return;
//         const rawSources = [];
//         const sourceTitle = baseTitle;
//
//         while (el && el.classList.contains('source')) {
//             rawSources.push(el.textContent.trim());
//             el = el.nextElementSibling;
//             if (el?.tagName === 'BR') el = el.nextElementSibling;
//         }
//
//         // source → layer オブジェクトへ変換
//         rawSources.forEach(srcLine => {
//             const matches = srcLine.match(/URL：(.+?)(（.+）)?$/);
//             if (!matches) return;
//
//             const url = matches[1].replace(/（.+）/, '').trim().replace(/^URL：/, '');
//             const note = matches[2]?.replace(/[（）]/g, '').trim();
//             const ext = url.split('.').pop();
//
//             // .png or .jpg 以外 → スキップ
//             if (!['png', 'jpg'].includes(ext)) return;
//
//             // URLに漢字が含まれていたらスキップ
//             if (/[一-龯々]/.test(url)) return;
//
//             const fullTitle = note ? `${sourceTitle}（${note}）` : sourceTitle;
//             layers.push({
//                 title: fullTitle,
//                 source: url
//             });
//         });
//
//         if (layers.length === 0) return;
//
//         // table群処理（minzoom/maxzoom/latestDate）
//         let sourceInfo = null;
//         let minzoom = Infinity;
//         let maxzoom = -Infinity;
//         let latestDate = null;
//         let coverage = null;
//         let note = null;
//
//         while (el && !el.classList.contains('title')) {
//             if (el.tagName === 'TABLE') {
//                 const rows = el.querySelectorAll('tr');
//                 rows.forEach(tr => {
//                     const tds = tr.querySelectorAll('td');
//                     if (tds.length >= 2) {
//                         const label = tds[0].textContent.trim();
//                         const value = tds[1].textContent.trim();
//
//                         if (label.includes('データソース') && !sourceInfo && tds[1]) {
//                             const html = tds[1].innerHTML.trim();
//                             if (html) sourceInfo = html;
//                         }
//
//                         if (label.includes('ズームレベル')) {
//                             const match = value.match(/(\d+)\s*(?:～|-)\s*(\d+)/);
//                             if (match) {
//                                 const zmin = parseInt(match[1], 10);
//                                 const zmax = parseInt(match[2], 10);
//                                 if (!isNaN(zmin)) minzoom = Math.min(minzoom, zmin);
//                                 if (!isNaN(zmax)) maxzoom = Math.max(maxzoom, zmax);
//                             } else {
//                                 const z = parseInt(value, 10);
//                                 if (!isNaN(z)) {
//                                     minzoom = Math.min(minzoom, z);
//                                     maxzoom = Math.max(maxzoom, z);
//                                 }
//                             }
//                         }
//
//                         if (label.includes('提供開始')) {
//                             const match = value.match(/平成\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
//                             if (match) {
//                                 const y = 1988 + parseInt(match[1], 10);
//                                 const m = String(parseInt(match[2], 10)).padStart(2, '0');
//                                 const d = String(parseInt(match[3], 10)).padStart(2, '0');
//                                 const iso = `${y}-${m}-${d}`;
//                                 if (!latestDate || iso > latestDate) latestDate = iso;
//                             }
//                         }
//
//                         if (label.includes('提供範囲') && !coverage && value) {
//                             coverage = value;
//                         }
//
//                         if (label.includes('備考') && value) {
//                             const html = tds[1].innerHTML.trim();
//                             if (html) note = html;
//                             // const text = tds[1].innerHTML.trim();
//                             // if (text) notes.push(text);
//                         }
//                     }
//                 });
//             }
//             el = el.nextElementSibling;
//         }
//
//         // 格納
//         result[id] = {
//             layers,
//         };
//         if (sourceInfo) result[id].sourceInfo = sourceInfo;
//         if (isFinite(minzoom)) result[id].minzoom = minzoom;
//         if (isFinite(maxzoom)) result[id].maxzoom = maxzoom;
//         if (latestDate) result[id].latestDate = latestDate;
//         if (coverage) result[id].coverage = coverage;
//         if (note) result[id].note = note;
//     });
//
//     return result;
// }

const checkUser = setInterval(() => {
    if (user.value && user.value.uid) {
        const uid = user.value.uid
        store.state.userId = uid
        localStorage.setItem('lastUserId', uid)
        const nickname = user.value.displayName
        store.state.myNickname = nickname
        localStorage.setItem('lastNickname', nickname)
        clearInterval(checkUser)
    }
}, 100) // 5ms → 100ms に変更（CPU負荷軽減のため）

store.state.isOffline = !window.navigator.onLine;
let convertTileJson = []
let isGsiNew = false
if (!store.state.isOffline) {
    const tileJson = await fetchGsiTile()
    // console.log('tileJson', tileJson)
    const convertTileJsonObject = convertGsiTileJson(tileJson)
    convertTileJson = convertTileJsonObject.result
    isGsiNew = convertTileJsonObject.isNew
    // console.log('convertTileJson', convertTileJson)
}

// ---------------------------------------------------------------------------------------------------------------------
// cs https://rinya-ehime.geospatial.jp/tile/rinya/2024/csmap_Ehime/14/14251/9830.png
export const csUrls = [
    {selected: 1,citycode:'04000', name:'宮城県CS',maxzoom: 24, bbox:[], url:'https://forestgeo.info/opendata/4_miyagi/topography_2023/{z}/{x}/{y}.webp', page:"<a href='https://miyagi.dataeye.jp/resources/1521' target='_blank'>【宮城県】3次元点群データ_データ一覧_2023</a>"},
    {selected: 1,citycode:'07201', name:'福島県CS',maxzoom: 24, bbox:[], url:'https://www2.ffpri.go.jp/soilmap/tile/cs_fukushima/{z}/{x}/{y}.png', page:"<a href='https://www2.ffpri.go.jp/soilmap/data-src.html' target='_blank'>森林総合研究所 CS立体図</a>"},
    {selected: 1,citycode:'09200', name:'栃木県CS',maxzoom: 24, bbox:[], url:'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/csmap_tochigi' target='_blank'>栃木県微地形図（CS立体図）</a>"},
    {selected: 1,citycode:'13000', name:'東京都23区CS',maxzoom: 24, bbox:[], url:'https://shiworks.xsrv.jp/raster-tiles/tokyo-digitaltwin/tokyopc-23ku-2024-cs-tiles/{z}/{x}/{y}.png', page:"<a href='' target='_blank'>東京都(区部)CS立体図(東京都デジタルツイン実現プロジェクト 区部点群データを加工して作成)</a>"},
    {selected: 1,citycode:'13000', name:'東京都多摩地域CS',maxzoom: 24, bbox:[], url:'https://shiworks.xsrv.jp/raster-tiles/tokyo-digitaltwin/tokyopc-tama-2023-cs-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/tokyopc-tama-2023' target='_blank'>東京都(多摩地域)CS立体図(東京都デジタルツイン実現プロジェクト 多摩地域点群データを加工して作成)</a>"},
    {selected: 1,citycode:'14100', name:'神奈川県CS',maxzoom: 24, bbox:[], url:'https://shiworks.xsrv.jp/raster-tiles/pref-kanagawa/kanagawapc-cs-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset?q=%E7%A5%9E%E5%A5%88%E5%B7%9D%E7%9C%8C+3%E6%AC%A1%E5%85%83%E7%82%B9%E7%BE%A4&sort=metadata_modified+desc' target='_blank'>神奈川県CS立体図(データ提供:(神奈川県環境農政局緑政部森林再生課))</a>"},
    {selected: 1,citycode:'15202', name:'長岡市CS',maxzoom: 24, bbox:[], url:'https://forestgeo.info/opendata/15_niigata/nagaoka/csmap_2024/{z}/{x}/{y}.webp', page:"<a href='https://www.geospatial.jp/ckan/dataset/rinya-csmap-nagaoka2024' target='_blank'>林野庁長岡地域CS立体図</a>"},
    {selected: 1,citycode:'16201', name:'富山県CS',maxzoom: 24, bbox:[], url:'https://shiworks2.xsrv.jp/raster-tiles/pref-toyama/toyama-csmap-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/dem' target='_blank'>富山県CS立体図(富山県 数値標高モデル（DEM）を加工して作成)</a>"},
    {selected: 0,citycode:'17463', name:'能登CS',maxzoom: 24, bbox:[], url:'https://rinya.geospatial.jp/tile/csmaptile_noto/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/2024noto_rinya' target='_blank'>林野庁能登地域CS立体図(発災後)</a>"},
    {selected: 1,citycode:'17463', name:'能登CS2',maxzoom: 24, bbox:[], url:'https://shiworks.xsrv.jp/raster-tiles/rinya/noto-2024-csmap-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/2024noto_dem' target='_blank'>林野庁能登地域CS立体図(能登地域0.5mDEM(発災後)を加工して作成)</a>"},
    {selected: 1,citycode:'19201', name:'山梨県CS',maxzoom: 24, bbox:[], url:'https://shiworks2.xsrv.jp/raster-tiles/pref-yamanashi/yamanashi-csmap-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/yamanashi-pointcloud-2024' target='_blank'>山梨県CS立体図(山梨県グリッドデータDEMを加工して作成)</a>"},
    {selected: 0,citycode:'20200', name:'長野県CS', maxzoom: 24, bbox:[], url:'https://tile.geospatial.jp/CS/VER2/{z}/{x}/{y}.png', page:'<a href=\'https://www.geospatial.jp/ckan/dataset/nagano-csmap\' target=\'_blank\'>長野県CS立体図（長野県林業総合センター）</a>'},
    {selected: 1,citycode:'20200', name:'長野県CS0.5m',maxzoom: 24, bbox:[], url:'https://shiworks2.xsrv.jp/raster-tiles/pref-nagano/nagano-csmap-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/r3-4-50cmdem' target='_blank'>この長野県CS立体図(0.5m)は長野県林務部長の承認を得て森林計画図を使用して作成したものである。承認番号 7森政第51-3号</a>"},
    {selected: 1,tms:1,citycode:'21200', name:'岐阜県CS',maxzoom: 24, bbox:[], url:'https://kenzkenz2.xsrv.jp/gihucs/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/cs-2019-geotiff' target='_blank'>岐阜県CS立体図</a>"},
    {selected: 1,citycode:'22100', name:'静岡県CS',maxzoom: 24, bbox:[], url:'https://shiworks.xsrv.jp/raster-tiles/pref-shizuoka/shizuoka-cs-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/shizuoka-2023-csmap' target='_blank'>静岡県CS立体図</a>"},
    {selected: 1,citycode:'26100', name:'京都府CS',maxzoom: 24, bbox:[], url:'https://shiworks2.xsrv.jp/raster-tiles/pref-kyoto/kyoto-csmap-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/dem05_kyoto' target='_blank'>京都府CS立体図(京都府「数値標高モデル（DEM）」を加工して作成)</a>"},
    {selected: 1,citycode:'27100', name:'大阪府CS',maxzoom: 24, bbox:[], url:'https://xs489works.xsrv.jp/raster-tiles/pref-osaka/osaka-cs-tiles/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/cs' target='_blank'>大阪府CS立体図</a>"},
    {selected: 1,citycode:'28100', name:'兵庫県CS',maxzoom: 24, bbox:[], url:'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/csmap_hyogo' target='_blank'>兵庫県微地形図（CS立体図）</a>"},
    {selected: 1,citycode:'30201', name:'和歌山県CS',maxzoom: 24, bbox:[], url:'https://xs489works.xsrv.jp/raster-tiles/pref-wakayama/wakayamapc-cs-tiles/{z}/{x}/{y}.png', page:"<a href='https://wakayamaken.geocloud.jp/mp/22' target='_blank'>和歌山県CS立体図(和歌山県3次元点群データを加工して作成)</a>"},
    {selected: 1,citycode:'31201', name:'鳥取県CS',maxzoom: 24, bbox:[], url:'https://rinya-tottori.geospatial.jp/tile/rinya/2024/csmap_tottori/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/csmap_tottori' target='_blank'>鳥取県CS立体図</a>"},
    {selected: 1,citycode:'33100', name:'岡山県CS',maxzoom: 24, bbox:[], url:'https://www2.ffpri.go.jp/soilmap/tile/cs_okayama/{z}/{x}/{y}.png', page:"https://www2.ffpri.go.jp/soilmap/tile/cs_okayama/{z}/{x}/{y}.png"},
    {selected: 0,citycode:'34100', name:'広島県CS(林野庁0.5m)',maxzoom: 24, bbox:[], url:'https://www2.ffpri.go.jp/soilmap/tile/cs_hiroshima/{z}/{x}/{y}.png', page:"<a href='https://www2.ffpri.go.jp/soilmap/data-src.html' target='_blank'>森林総合研究所CS立体図</a>"},
    {selected: 0,citycode:'34100', name:'広島県CS(広島県1m)',maxzoom: 24, bbox:[], url:'https://xs489works.xsrv.jp/raster-tiles/pref-hiroshima/hiroshimapc-cs-tiles/{z}/{x}/{y}.png', page:"<a href='https://hiroshima-dobox.jp/index2' target='_blank'>広島県CS立体図(広島県3次元点群データを加工して作成)</a>\""},
    {selected: 1,citycode:'34100', name:'広島県CS(広島県0.5m)',maxzoom: 24, bbox:[], url:'https://shiworks.xsrv.jp/raster-tiles/pref-hiroshima/hiroshimapc-2022-cs-tiles/{z}/{x}/{y}.png', page:"https://shiworks.xsrv.jp/raster-tiles/pref-hiroshima/hiroshimapc-2022-cs-tiles/{z}/{x}/{y}.png"},
    {selected: 1,tms:1, citycode:'38200', name:'愛媛CS',maxzoom: 24, bbox:[], url:'https://rinya-ehime.geospatial.jp/tile/rinya/2024/csmap_Ehime/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/csmap_ehime' target='_blank'>愛媛県CS立体図</a>"},
    {selected: 1,citycode:'39200', name:'高知県CS',maxzoom: 24, bbox:[], url:'https://rinya-kochi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png', page:"<a href='https://www.geospatial.jp/ckan/dataset/csmap_kochi' target='_blank'>高知県微地形図（CS立体図）</a>"},
    {selected: 1,citycode:'43100', name:'熊本県大分県CS',maxzoom: 24, bbox:[], url:'https://www2.ffpri.go.jp/soilmap/tile/cs_kumamoto_oita/{z}/{x}/{y}.png', page:"<a href='https://www2.ffpri.go.jp/soilmap/data-src.html' target='_blank'>森林総合研究所 CS立体図</a>"},
];
function csLayersCreate (url) {
    const csSource = {
        id: 'oh-cs-' + url.name + '-source',
        obj: {
            type: "raster",
            tiles: [url.url],
            ...(url.tms !== undefined && { scheme: 'tms'}),
            tileSize: 256
        },
    }
    const csLayer = {
        id: 'oh-cs-' + url.name,
        type: 'raster',
        source: 'oh-cs-' + url.name + '-source',
        name: url.name,
        minzoom: 0,
        ...(url.maxzoom !== undefined && { maxzoom: url.maxzoom }),
    }

    return {csSource,csLayer}
}
export const csSources = []
export const csLayers = []
export const csLayersSelected = []
csUrls.forEach(url => {
    const layers = csLayersCreate (url)
    csSources.push(layers.csSource)
    csLayers.push(layers.csLayer)
    if (url.selected) csLayersSelected.push(layers.csLayer)
})
const csLayers2 = csLayers.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.name,
        source: csSources[i],
        layers:[layer],
        attribution: '<a href="' + layer.page + '" target="_blank">' + name + '</a>',
    }
})
console.log(csLayers2)
// --------------------------------------------------------------------------------------------------------------------

export function zenkokuChibanzuAddLayer (map,zoom) {
    const targetLayer = findLayerById(map,'oh-chibanzu-all2')
    if (targetLayer) {
        // console.log('ターゲットレイヤー', targetLayer.layers)
        if (zoom >= 11) {
            const bounds = map.getBounds();
            const maplibreBbox = [
                bounds.getWest(),  // 最小経度（left）
                bounds.getSouth(), // 最小緯度（bottom）
                bounds.getEast(),  // 最大経度（right）
                bounds.getNorth()  // 最大緯度（top）
            ];
            console.log('現在のBBOX:', maplibreBbox);
            if (pablicDatas.length > 0) {
                pablicDatas.forEach(v => {
                    if (v.bbox) {
                        const dataBbox = JSON.parse(v.bbox); // [west, south, east, north]
                        const isIntersecting =
                            maplibreBbox[2] > dataBbox[0] && // east > west
                            maplibreBbox[0] < dataBbox[2] && // west < east
                            maplibreBbox[3] > dataBbox[1] && // north > south
                            maplibreBbox[1] < dataBbox[3];   // south < north
                        if (isIntersecting) {
                            // console.log('重なってる:', v);
                            if (!v.url) {
                                return
                            }
                            const layers = publiLayersCreate(v)
                            const allLayers = map.getStyle().layers;
                            const result = allLayers.find(l => {
                                return l.id === layers.publicPolygonLayer.id
                            })
                            if (!result) {
                                targetLayer.layers.push(layers.publicPolygonLayer)
                                targetLayer.layers.push(layers.publicLineLayer)
                                targetLayer.layers.push(layers.publicLabelLayer)
                                targetLayer.layers.push(layers.publicPointLayer)
                                targetLayer.layers.push(layers.publicVertexLayer)
                            }
                        }
                    }
                })
            }
            sicyosonChibanzuUrls.forEach(v => {
                if (v.bbox) {
                    const dataBbox = v.bbox; // [west, south, east, north]
                    const isIntersecting =
                        Number(maplibreBbox[2]) > Number(dataBbox[0]) && // east > west
                        Number(maplibreBbox[0]) < Number(dataBbox[2]) && // west < east
                        Number(maplibreBbox[3]) > Number(dataBbox[1]) && // north > south
                        Number(maplibreBbox[1]) < Number(dataBbox[3]);   // south < north
                    if (isIntersecting) {
                        // console.log('重なってる2:', v);
                        // if (!v.url) {
                        //     return
                        // }
                        const layers = chibanzuLayersCreate(v)
                        const allLayers = map.getStyle().layers;
                        const result = allLayers.find(l => {
                            return l.id === layers.chibanzuLayer.id
                        })
                        if (!result) {
                            targetLayer.layers.push(layers.chibanzuLayer)
                            targetLayer.layers.push(layers.chibanzuLayerLineGreen)
                            targetLayer.layers.push(layers.chibanzuLayerLabelGreen)
                            targetLayer.layers.push(layers.chibanzuLayerVertexGreen)
                            targetLayer.layers.push(layers.chibanzuLayerPoint)
                        }
                    }
                }
            })
        }
    }
}

export async function loadColorData() {
    if (store.state.isOffline) {
        return { colorMap: {}, isNew: {} }
    }
    try {
        const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/userChibanzumapSelect2.php');
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        const data = await response.json();
        // console.log(data)
        if (data.error) throw new Error(data.error);

        const colorMap = {};
        const isNew = {};
        const now = new Date();

        data.forEach(item => {
            // public値を色に変換
            const code = parseInt(item.public, 10);
            const color =
                code === -1 ? 'rgba(0,128,0,0.8)' :
                    code === 0 ? 'rgba(0,0,0,0)' :
                        code === 1 ? 'rgba(0,0,255,0.8)' :
                            code === 3 ? 'rgba(128,128,128,0.8)' :
                                code === 4 ? 'rgba(255,0,0,0.8)' :
                                    code === 5 ? 'rgba(255,165,0,0.8)' :
                                        '#CCCCCC';

            colorMap[item.citycode] = color;

            // 新着判定
            if (item.last_modified_date) {
                const last = new Date(item.last_modified_date.replace(' ', 'T')); // Safari対策
                const diffMs = now - last;
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                if (diffDays <= 3) {// 3日間をNEWとする
                    isNew[item.citycode] = 1;
                }
            }
        });

        return { colorMap, isNew };
    } catch (error) {
        console.error('色データの取得に失敗:', error);
        return { colorMap: {}, isNew: {} };
    }
}
const abc = await loadColorData();
const chibanzuColors = abc.colorMap
const isNew = abc.isNew
// console.log(chibanzuColors)
// console.log(isNew)

function waitForStateValue(getter, checkFn = val => val !== undefined && val !== null, interval = 50) {
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            const val = getter();
            if (checkFn(val)) {
                clearInterval(timer);
                resolve(val);
            }
        }, interval);
    });
}

function boundsSort (bounds) {
    function compareFunc(a, b) {
        return a - b;
    }
    bounds.sort(compareFunc);
    return [bounds[2],bounds[0],bounds[3],bounds[1]]
}

async function publicData() {
    if (store.state.isOffline) {
        return null
    }
    try {
        const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtileSelectPublicNew.php', {
            params: {}
        });

        if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
        } else {
            // vm.jsonDataPmtilePubilc = response.data
            // console.log(response.data)
            return response.data
        }
    } catch (error) {
        // console.error('通信エラー:', error);
    }
}
const pablicDatas = await publicData()
// console.log(pablicDatas)
function publiLayersCreate (v) {
    const publicSource = {
        id: 'oh-chiban-' + v.id + '-' + v.name + '-source',
        obj: {
            type: 'vector',
            url: "pmtiles://" + v.url
        },
        // minZoom: 11,
        minzoom: 13,
        bounds: boundsSort(JSON.parse(v.bbox))
    }
    const publicPolygonLayer = {
        name: v.name,
        id: 'oh-chiban-' + v.id + '-' + v.name + '-layer',
        type: 'fill',
        source: 'oh-chiban-' + v.id + '-' + v.name + '-source',
        "source-layer": 'oh3',
        'paint': {
            'fill-color': 'rgba(0,0,0,0)',
            // 'fill-color': [
            //     'case',
            //     ['has', 'AzaName'],
            //     'rgba(0,0,255,0.5)',
            //     'rgba(0,0,0,0)'
            // ],
        },
        // minzoom: 11
        minzoom: 13,
    }
    let lineColor
    switch (v.public) {
        case '-1':
            lineColor = 'green'
            break
        case '1':
            lineColor = 'blue'
            break
    }
    const publicLineLayer = {
        id: 'oh-chibanL-' + v.id + '-' + v.name + '-line-layer',
        source: 'oh-chiban-' + v.id + '-' + v.name + '-source',
        type: 'line',
        "source-layer": "oh3",
        paint: {
            'line-color': lineColor,
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.1,
                16, 2
            ]
        },
        // minzoom: 11
        minzoom: 13,
    }
    let minZoom
    if (!v.length) {
        minZoom = 17
    } else if (v.length < 10000) {
        minZoom = 0
    } else {
        minZoom = 17
    }
    const publicLabelLayer = {
        id: 'oh-chibanL-' + v.id + '-' + v.name + '-label-layer',
        type: "symbol",
        source: 'oh-chiban-' + v.id + '-' + v.name + '-source',
        "source-layer": "oh3",
        'layout': {
            'text-field': ['get', v.chiban],
        },
        'paint': {
            'text-color': 'navy',
            'text-halo-color': 'rgba(255,255,255,1)',
            'text-halo-width': 1.0,
        },
        'minzoom': minZoom
    }
    const publicPointLayer = {
        id: 'oh-chibanL-' + v.id + '-' + v.name + '-point-layer',
        type: "circle",
        source: 'oh-chiban-' + v.id + '-' + v.name + '-source',
        filter: ["==", "$type", "Point"],
        "source-layer": "oh3",
        paint: {
            'circle-color': 'rgba(0,0,255,1)', // 赤色で中心点を強調
            'circle-radius': 5, // 固定サイズの点
            'circle-opacity': 1,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        },
        // minzoom: 11
        minzoom: 13,
    }
    const publicVertexLayer = {
        id: 'oh-chibanL-' + v.id + '-' + v.name + '-vertex-layer',
        type: "circle",
        source: 'oh-chiban-' + v.id + '-' + v.name + '-source',
        filter: ["==", "$type", "Polygon"],
        "source-layer": "oh3",
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                18,4
            ],
            'circle-color': 'red',
        },
        // minzoom: 11
        minzoom: 13,
    }
    return {publicSource,publicPolygonLayer,publicLineLayer,publicLabelLayer,publicPointLayer,publicVertexLayer}
}
export const publicSources = []
const publicPolygonLayers = []
const publicLineLayers = []
const publicLabelLayers = []
const publicPointLayers = []
const publicVertexLayers = []
if (pablicDatas && pablicDatas.length > 0) {
    pablicDatas.forEach(v => {
        if (!v.url) {
            return
        }
        const layers = publiLayersCreate(v)
        publicSources.push(layers.publicSource)
        publicPolygonLayers.push(layers.publicPolygonLayer)
        publicLineLayers.push(layers.publicLineLayer)
        publicLabelLayers.push(layers.publicLabelLayer)
        publicPointLayers.push(layers.publicPointLayer)
        publicVertexLayers.push(layers.publicVertexLayer)
    })
}
const publicLayers = publicPolygonLayers.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.name,
        source: publicSources[i],
        layers:[layer,publicLineLayers[i],publicLabelLayers[i],publicPointLayers[i],publicVertexLayers[i]],
        // attribution: '<a href="' + layer.page + '" target="_blank">' + name + '</a>',
        ext: {name:'ext-chibanzu'}
    }
})
console.log(publicLayers)
const publicLayers0 = [...publicPolygonLayers,...publicLineLayers,...publicLabelLayers,...publicPointLayers,...publicVertexLayers]

export const cityPmtilesSource = {
    id: 'city-pmtiles-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz.net/original-data/city.pmtiles?nocache=" + Date.now(),
        // url: "pmtiles://https://kenzkenz.net/original-data/city.pmtiles",
    }
}

const cityPmtilesPolygonLayer = {
    id: 'oh-city-pmtiles-poligon-layer',
    type: 'fill',
    source: 'city-pmtiles-source',
    'source-layer': "oh3",
    paint: {
        'fill-color': [
            'case',
            ['==', ['get', 'public'], 1],
            'rgba(0,0,255,0.8)', // public が 1 のとき
            ['==', ['get', 'public'], 2],
            'rgba(0,128,0,0.8)', // public が 2 のとき
            ['==', ['get', 'public'], 3],
            'rgba(128,128,128,0.8)', // public が 3 のとき
            'rgba(255,255,255,0.1)'
        ],
    },
    maxzoom: 11.5
};

const cityPmtilesLineLayer = {
    id: 'oh-city-pmtiles-line-layer',
    source: 'city-pmtiles-source',
    'source-layer': "oh3",
    type: 'line',
    paint: {
        'line-color': 'black',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            9, 1,
            16, 2
        ]
    },
}
const cityPmtilesLabelLayer = {
    id: 'oh-city-pmtiles-label-layer',
    type: 'symbol',
    source: 'city-pmtiles-source',
    'source-layer': "oh3",
    layout: {
        'text-field': ['get', 'N03_004'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    // paint: {
    //     'text-color': 'rgba(255, 255, 255, 1)',
    //     'text-halo-color': 'rgba(0,0,0,1)',
    //     'text-halo-width': 1.0,
    // },
    paint: {
        'text-color': 'navy',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    minzoom: 7
}

export const cityGeojsonSource = {
    id: 'city-geojson-source', obj: {
        'type': 'geojson',
        // 'data': 'https://kenzkenz.net/original-data/chibanzumap.geojson?nocache=' + Date.now()
        'data': 'https://kenzkenz.net/original-data/chibanzumap.geojson?v=2'
    }
}

export const cityGeojsonPolygonLayer = {
    id: 'oh-city-geojson-poligon-layer',
    type: 'fill',
    source: 'city-geojson-source',
    paint: {
        'fill-color': [
            'case',
            ...Object.entries(chibanzuColors).flatMap(([key, color]) => ([
                ['==', ['to-number', ['get', 'N03_007']], Number(key)], color
            ])),
            'rgba(0,0,0,0)' // デフォルト色
        ]
    },
    maxzoom: 14
};

export const cityGeojsonLineLayer = {
    id: 'oh-city-geojson-line-layer',
    source: 'city-geojson-source',
    // "source-layer": 'polygon',
    type: 'line',
    paint: {
        'line-color': 'black',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            9, 1,
            16, 2
        ]
    },
}
// export const cityGeojsonLabelLayer = {
//     id: 'oh-city-geojson-label-layer',
//     type: 'symbol',
//     source: 'city-geojson-source',
//     layout: {
//         'text-field': ['get', 'N03_004'],
//         'text-offset': [0, 1],
//     },
//     paint: {
//         'text-color': '#000',
//         'text-halo-color': '#fff',
//         'text-halo-width': 1
//     },
//     minzoom: 7
// }
// NEWな市町村コード一覧
const newCodes = Object.keys(isNew).filter(k => isNew[k] === 1);

// 1. 白字＋黒ハロー
// const newLabelColorOnRed = '#fff';
// const newHaloColorOnRed  = '#000';

// 2. 黒字＋白ハロー
// const newLabelColorOnRed = '#000';
// const newHaloColorOnRed  = '#fff';

// 3. 黄字＋黒ハロー
// const newLabelColorOnRed = '#fff600';
// const newHaloColorOnRed  = '#000';

// 4. 蛍光グリーン＋黒ハロー
const newLabelColorOnRed = '#39ff14';
const newHaloColorOnRed  = '#000';

const newLabelColor = '#fff600';    // 普段のNEW（蛍光イエロー）
const newHaloColor  = '#ff00cc';    // 普段のNEW（蛍光ピンク）

const caseTextColor = [
    'case',
    ...Object.entries(chibanzuColors).flatMap(([code, color]) => {
        if (newCodes.includes(code)) {
            if (color === "rgba(255,0,0,0.8)") {
                // NEW かつ 赤背景
                return [['==', ['get', 'N03_007'], code], newLabelColorOnRed];
            } else {
                // NEW かつ 非赤背景
                return [['==', ['get', 'N03_007'], code], newLabelColor];
            }
        }
        return [];
    }),
    '#000' // デフォルト
];

const caseTextHaloColor = [
    'case',
    ...Object.entries(chibanzuColors).flatMap(([code, color]) => {
        if (newCodes.includes(code)) {
            if (color === "rgba(255,0,0,0.8)") {
                // NEW かつ 赤背景
                return [['==', ['get', 'N03_007'], code], newHaloColorOnRed];
            } else {
                // NEW かつ 非赤背景
                return [['==', ['get', 'N03_007'], code], newHaloColor];
            }
        }
        return [];
    }),
    '#fff' // デフォルト
];

// 蛍光色・NEW表示のcase式を生成
// const caseTextField = [
//     'case',
//     ...newCodes.flatMap(code => [
//         ['==', ['get', 'N03_007'], code], ['concat', 'NEW\n', ['get', 'N03_004']]
//     ]),
//     ['get', 'N03_004'] // デフォルト: 市区町村名
// ];
const caseTextField = [
    'case',

    // ① newCodes に含まれるキーだけを抽出
    ...Object.entries(chibanzuColors)
        .filter(([key]) => newCodes.map(Number).includes(Number(key)))
        // ② その上で flatMap して条件＋テキストを作成
        .flatMap(([key, color]) => {
            const codeNum = Number(key);
            // MapLibre の「このコードか？」を判定する条件
            const condition = ['==', ['to-number', ['get', 'N03_007']], codeNum];
            // 色によって prefix を切り替え（特定色なら★付き）
            const prefix = color === 'rgba(0,0,255,0.8)' ? '★NEW★\n' : 'NEW\n';
            return [
                condition,
                ['concat', prefix, ['get', 'N03_004']]
            ];
        }),

    // ③ どの条件にも当てはまらなかったときのデフォルト
    ['get', 'N03_004']
];



export const cityGeojsonLabelLayer = {
    id: 'oh-city-geojson-label-layer',
    type: 'symbol',
    source: 'city-geojson-source',
    layout: {
        'text-field': caseTextField,
        'text-offset': [0, 1],
    },
    paint: {
        'text-color': caseTextColor,
        'text-halo-color': caseTextHaloColor,
        'text-halo-width': 2,
        'text-halo-blur': 0.5,
    },
    minzoom: 7,
};
export const cityGeojsonLabelLayer2 = {
    id: 'oh-city-geojson-label-layer2',
    type: 'symbol',
    source: 'city-geojson-source',
    layout: {
        'text-field': caseTextField,
        'text-offset': [0, 1],
    },
    paint: {
        'text-color': caseTextColor,
        'text-halo-color': caseTextHaloColor,
        'text-halo-width': 2,
        'text-halo-blur': 0.5,
    },
    minzoom: 0,
    filter: [
        'any',
        ...newCodes.map(code => ['==', ['get', 'N03_007'], code])
    ]
};

// --------------------------------------------------------------------------------
// クリックで追加する円のGeoJSONソースを作成
export const clickCircleSource ={
    iD: 'click-circle-source', obj: {
        type: 'geojson',
        data: {
            "type": "FeatureCollection",
            "features": [
            ]
        }
    }
}
// 円を描画するレイヤーを追加--------------------------------------------------
export const clickCircleLayer = {
    id: 'click-circle-layer',
    type: 'fill',
    source: 'click-circle-source',
    filter: ['==', '$type', 'Polygon'],
    paint: {
        'fill-color': ['get', 'color'],
    }
}
export const clickCirclePolygonLineLayer = {
    id: 'click-circle-polygon-line-layer',
    type: 'line',
    source: 'click-circle-source',
    filter: ['==', '$type', 'Polygon'],
    paint: {
        'line-color': [
            'case',
            // 1) lassoSelected が true の場合は常に赤
            ['==', ['get', 'lassoSelected'], true], 'red',
            // 2) lineColor プロパティがあればその値を使用
            ['has', 'lineColor'], ['get', 'lineColor'],
            // 3) デフォルトは黒
            'black'
        ],
        'line-width': [
            'case',
            ['==', ['get', 'lassoSelected'], true],
            4,
            ['get', 'line-width']
        ],
    }
}
export const clickCircPolygonSymbolLayer = {
    id: 'click-circle-polygon-symbol-layer',
    type: 'symbol',
    source: 'click-circle-source',
    filter: ['all', ['==', '$type', 'Polygon'], ['!has', 'bearing'], ['!has', 'radius']],
    layout: {
        // 'text-field': ['get', 'label'],
        'text-field': [
            'case',
            // label プロパティがあり、かつ文字数が 0 より大きいときは label
            ['all',
                ['has', 'label'],
                ['>', ['length', ['get', 'label']], 0]
            ], ['get', 'label'],
            // それ以外は地番
            ['get', '地番']
        ],
        'text-size': 18,   // サイズ調整
        'text-anchor': 'center',
        'text-allow-overlap': true
    },
    paint: {
        'text-color': 'black',
        'text-halo-color': '#fff',
        'text-halo-width': 1
    },
    'maxzoom': 24,
    'minzoom': 17
}
export const clickCircPolygonSymbolAreaLayer = {
    id: 'click-circle-polygon-symbol-area-layer',
    type: 'symbol',
    source: 'click-circle-source',
    filter: ['all', ['has', 'isArea'], ['!=', ['get', 'isArea'], false]],
    layout: {
        'text-field': ['get', 'area'],
        'text-size': 20,   // サイズ調整
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-offset': [0, 1.2],
    },
    paint: {
        'text-color': 'black',
        'text-halo-color': '#fff',
        'text-halo-width': 1
    }
}
export const clickCircleLineLayer = {
    id: 'click-circle-line-layer',
    type: 'line',
    source: 'click-circle-source',
    filter: [
        'all',
        [
            'any',
            ['==', ['get', 'keiko'], 0],
            ['!', ['has', 'keiko']]
        ]
    ],
    paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'line-width'],
    }
}
export const clickCircleKeikoLineLayer = {
    id: 'click-circle-keiko-line-layer',
    type: 'line',
    source: 'click-circle-source',
    filter: [
        'all',
        ['==', ['get', 'keiko'], 1]
    ],
    paint: {
        'line-color': ['get', 'keiko-color'],
         'line-width': ['*', ['get', 'line-width'], 3],
        'line-opacity': 0.3,
        'line-blur': 2                     // にじみ（ぼかし）
    }
}
export const clickCircleLabelLayer = {
    id: 'click-circle-label-layer',
    type: 'symbol',
    source: 'click-circle-source',
    filter: ['==', '$type', 'Point'],
    layout: {
        // isRadius が真（boolean true）なら label、偽なら label2 を表示
        'text-field': [
            'case',
            [
                'any',
                // isRadius がない場合に true
                ['!', ['has', 'isRadius']],
                // isRadius が true の場合に true
                ['==', ['get', 'isRadius'], true]
            ],
            ['get', 'label'],   // 上記 any が true のとき
            ['get', 'label2']   // それ以外（isRadius が存在かつ false）のとき
        ],
        'text-size': ['get', 'text-size'],
        'text-offset': ['get', 'offsetValue'],
        'text-anchor': ['get', 'textAnchor'],
        'text-justify': ['get', 'textJustify'], // 追加: 複数行のテキストを左寄せにする
        'text-max-width': 100 // 非常に大きな値に設定して改行を防ぐ
    },
    'paint': {
        'text-color': ['get', 'color'],
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
}
export const clickCircSymbolLayer = {
    id: 'click-circle-symbol-layer',
    type: 'circle',
    source: 'click-circle-source',
    filter: [
        'all',
        ['==', '$type', 'Point'],
        ['!has', 'bearing'],
    ],
    paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'point-color'],
        'circle-stroke-width': [
            'case',
            ['==', ['get', 'lassoSelected'], true],
            4,
            2
        ],
        // 'circle-stroke-color': [
        //     'case',
        //     ['==', ['get', 'point-color'], 'rgba(0,0,0,0)'],  // point-color が透明なら…
        //     'rgba(0,0,0,0)',                                   // ストロークも透明に
        //     'white'                                          // それ以外は白
        // ],
        'circle-stroke-color': [
            'case',
            // 1. 選択中は赤
            ['==', ['get', 'lassoSelected'], true], 'red',
            // 2. point-color が透明ならストロークも透明
            ['==', ['get', 'point-color'], 'rgba(0,0,0,0)'], 'rgba(0,0,0,0)',
            // 3. それ以外は白
            'white'
        ],
        'circle-opacity': [
            'case',
            ['==', ['get', 'isRadius'], false],
            0,
            1     // それ以外
        ],
        'circle-stroke-opacity':  [
            'case',
            ['==', ['get', 'isRadius'], false],
            0,
            1     // それ以外
        ],
    }
}
// 矢印シンボルレイヤー----------------------------------------------------------
export const arrowsLayer = {
    'id': 'arrows-layer',
    'type': 'symbol',
    'source': 'click-circle-source',
    'layout': {
        'symbol-placement': 'line',
        'symbol-spacing': 50000, // 矢印の間隔（ピクセル）
        'icon-image': 'arrow_black',
        'icon-size': 1,
        'icon-rotate': 0, // ラインの方向に合わせて回転
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
    },
    'paint': {},
}
// ----------------------------------------------------------------------------
// 矢印ソース
export const endPointSouce = {
    id: 'end-point-source', obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}
// 矢印レイヤー（始点、終点にのみ表示）
export const arrowsEndpointLayer ={
    id: 'arrows-endpoint-layer',
    type: 'symbol',
    source: 'end-point-source',
    filter: [
        'all',
        ['any',
            ['all',
                ['==', ['get', 'arrow-type'], 'end'],
                ['has', 'endpoint'],
                ['==', ['get', 'endpoint'], 'end']
            ],
            ['==', ['get', 'arrow-type'], 'both']
        ]
    ],
    layout: {
        'symbol-placement': 'point', // ポイントに配置
        'icon-image':  ['get', 'arrow'],
        'icon-size': 1,
        'icon-rotate': ['get', 'bearing'], // ラインの方向に合わせて回転
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-offset': [-4, 0], // 矢印を終点から10ピクセル内側にずらす
    },
    paint: {
        'icon-opacity': 1,
    }
}
// 矢印レイヤー（ラベル）
export const arrowsEndpointLabelLayer ={
    id: 'arrows-endpoint-label-layer',
    type: 'symbol',
    source: 'end-point-source',
    layout: {
        'text-field': ['get', 'label'],
        'text-size': 18,
        'text-offset': [0, -1],
        'text-anchor': 'center',              // テキストのアンカー位置
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-rotate': ['get', 'textBearing'],
    },
    paint: {
        'icon-opacity': 1,
        'text-color': ['get', 'color'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 1
    }
}
// 頂点レイヤー------------------------------------------------------------------
export const vertexSource = {
    id: 'vertex-source', obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}
export const vertexLayer = {
    id: 'vertex-layer',
    type: 'circle',
    source: 'vertex-source',
    paint: {
        'circle-radius': 7,
        'circle-color': '#2196f3',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2
    },
    filter: ['==', '$type', 'Point']
}
// 中点レイヤー--------------------------------------------------------------------
export const midpointSource = {
    id: 'midpoint-source', obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}
// シンプルなcircleレイヤーで中点表示
export const midpointLayer = {
    id: 'midpoint-layer',
    type: 'circle',
    source: 'midpoint-source',
    paint: {
        'circle-radius': 6,
        'circle-color': 'green',
        'circle-opacity': 0.8,
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1
    },
    layout: {},
    filter: ['==', '$type', 'Point']
}
// 移動レイヤー ドラッグアイコン---------------------------------------------------------------------
export const dragHandlesSource = {
    id:'drag-handles-source',obj:
        {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        }
}
export const dragHandleslayer = {
    id: 'drag-handles-layer',
    type: 'symbol',
    source: 'drag-handles-source',
    layout: {
        'icon-image': 'drag-icon',
        'icon-size': 0.1,            // タッチ対応で少し大きめに
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
    }
}
// 距離ラベルレイヤー-----------------------------------------------------------------
export const segmentLabelSource = {
    id: 'segment-label-source', obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}
export const segmentLabeleLayer = {
    id: 'segment-label-layer',
    type: 'symbol',
    source: 'segment-label-source',
    filter: ['==', ['get', 'calc'], 1],
    layout: {
        'text-field': ['get', 'distance'],
        'text-size': 18,
        'text-offset': [0, 0.6],
        'text-anchor': 'top'
    },
    paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1
    }
}
// フリーハンドプレビューレイヤー（ガイド）----------------------------------------------------------------
export const freehandPreviewSource = {
    id: 'freehand-preview-source', obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}
export const freehandPreviewLayer = {
    id: 'freehand-preview-layer',
    type: 'line',
    source: 'freehand-preview-source',
    paint: {
        'line-color': [
            'case',
            ['==', ['get', 'keiko'], 0],
            ['get', 'color'],          // keiko が 0 のとき
            ['get', 'keiko-color']     // それ以外
        ],
        // 'line-color': 'black',
        'line-width': [
            'case',
            ['==', ['get', 'keiko'], 0],
            ['get', 'line-width'],
            ['*', ['get', 'line-width'], 3]
        ],
        'line-opacity': [
            'case',
            ['==', ['get', 'keiko'], 0],
            0.6,          // keiko が 0 のとき
            0.3     // それ以外
        ],
        // 'line-opacity': 0.3,
        // 'line-dasharray': [2, 2]
    }
}
// ガイドレイヤー-----------------------------------------------------------------
export const guideLineSource = {
    id: 'guide-line-source', obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}
export const guideLineLayer = {
    id: 'guide-line-layer',
    type: 'line',
    source: 'guide-line-source',
    paint: {
        'line-color': '#00f',
        'line-width': 2,
        'line-dasharray': [2, 2]
    }
}
export const guideLineVertexLayer = {
    id: 'guide-line-vertex-layer',
    type: 'circle',
    source: 'guide-line-source',
    // filter: ['==', '$type', 'Point'],
    paint: {
        'circle-radius': 4,
        'circle-color': '#00f',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
    }
}
// 標高レイヤーー-----------------------------------------------------------------
export const elevationSource = {
    id:'elevation-source',obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}
export const elevationLayer = {
    id: 'elevation-layer',
    type: 'circle',
    source: 'elevation-source',
    paint: {
        'circle-radius': 8,
        'circle-color': '#ff0000',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1
    }
}
// --------------------------------------------------------------------------------
// クリックで追加するポイントのGeoJSONソースを作成
export const clickPointSource ={
    iD: 'click-points-source', obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [
            ]
        }
    }
};

// ポイントを描画するレイヤーを追加
export const clickPointLayer = {
    id: 'click-points-layer',
    type: 'circle',
    source: 'click-points-source',
    paint: {
        'circle-radius': 8,
        'circle-color': '#ff0000',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
    }
}

export const extSource = {
    id: 'ext-source', obj: {
        type: 'raster',
        tiles: [],
    }
}
export const extLayer = {
    'id': 'oh-extLayer',
    'type': 'raster',
    'source': 'ext-source',
}

export const geotiffSource = {
    id:'geotiff-source',obj:{
        type: 'image',
        url: '',
        coordinates: '',
    }
}
export const geotiffLayer= {
    id: 'oh-geotiff-layer',
    type: 'raster',
    source: 'geotiff-source',
    paint: {
        'raster-resampling': 'nearest', // タイル境界の補間方式を変更
        // 'raster-padding': 5 // 境界パディングを追加
    },
}

export const jpgSource = {
    id:'jpg-source',obj:{
        type: 'image',
        url: '',
        coordinates: ''
    }
}
export const jpgLayer= {
    id: 'oh-jpg-layer',
    type: 'raster',
    source: 'jpg-source',
    paint: {}
}

export const pngSource = {
    id:'png-source',obj:{
        type: 'image',
        url: '',
        coordinates: ''
    }
}
export const pngLayer= {
    id: 'oh-png-layer',
    type: 'raster',
    source: 'png-source',
    paint: {}
}

export const vpsTileSource = {
    id:'vpstile-source',obj:{
        type: 'raster',
        tiles: [],
        bounds: null,
        maxzoom: 26,
        // scheme: 'tms',
    }
}
export const vpsTileLayer= {
    id: 'oh-vpstile-layer',
    type: 'raster',
    source: 'vpstile-source',
    paint: {}
}
// 液状化（不動産情報ライブラリ）---------------------------------------------------------------------------------------------
const fjEkijyokaSourse = {
    id:'fj-ekijyoka-source',obj:{
        type: "vector",
        tiles: [
            "https://kenzkenz.net/myphp/proxy.php?api=XKT025&z={z}&x={x}&y={y}"
        ],
        minzoom: 10,
        maxzoom: 15
    }
}

const fjEkijyokatLayer = {
    id: "oh-fj-ekijyoka-layer",
    type: "fill",
    source: "fj-ekijyoka-source",
    'source-layer': 'hits',
    paint: {
        "fill-color": [
            "match",
            ["get", "liquefaction_tendency_level"],
            1, "rgba(8, 64, 129, 0.8)",  // 濃い色
            2, "rgba(8, 104, 172, 0.8)",
            3, "rgba(67, 162, 202, 0.8)",
            4, "rgba(123, 204, 196, 0.8)",
            5, "rgba(204, 235, 197, 0.8)",
            6, "rgba(247, 252, 240, 0.8)",  // 薄い色
            "rgba(136, 136, 136, 0.8)"   // デフォルト
        ],
    },
    minzoom: 9,
    maxzoom: 15
}
const fjEkijyokatLayerLine = {
    id: "oh-fj-ekijyoka-layer-line",
    type: "line",
    source: "fj-ekijyoka-source",
    'source-layer': 'hits',
    paint: {
        'line-color': 'gray',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            15, 1
        ]
    },
}
// 立地適正化計画（不動産情報ライブラリ）---------------------------------------------------------------------------------------------
const fjRicchitekiseiksSourse = {
    id:'fj-ricchitekiseika-source',obj:{
        type: "vector",
        tiles: [
            "https://kenzkenz.net/myphp/proxy.php?api=XKT003&z={z}&x={x}&y={y}"
        ],
        minzoom: 10,
        maxzoom: 15
    }
}

const fjRicchitekiseikaLayer = {
    id: "oh-fj-ricchitekiseika-layer",
    type: "fill",
    source: "fj-ricchitekiseika-source",
    'source-layer': 'hits',
    paint: {
        "fill-color": [
            "match",
            ["get", "kubun_id"],
            0, "rgba(8, 64, 129, 0.8)",  // 立地適正化計画区域
            31, "rgba(0, 255, 0, 0.8)", // 居住誘導区域
            32, "rgba(6, 162, 2, 0.8)",// 都市機能誘導区域
            "rgba(0, 0, 0, 0.8)"   // デフォルト
        ],
    },
    minzoom: 9,
    maxzoom: 15
}
const fjRicchitekiseikaLayerLine = {
    id: "oh-fj-ricchitekiseika-layer-line",
    type: "line",
    source: "fj-ricchitekiseika-source",
    'source-layer': 'hits',
    paint: {
        'line-color': 'gray',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 0,
            15, 1
        ]
    },
}

// 民電 -----------------------------------------------------------------------------------------------------------------
const mindenSource = {
    id: "minden-source", obj: {
        'type': 'geojson',
        'data': 'https://kenzkenz3.xsrv.jp/geojson/ntrip/2025_minden5.geojson',
    }
}
const mindenCenterPointLayer = {
    id: "oh-minden-center",
    type: "circle",
    source: "minden-source",
    paint: {
        'circle-color': 'rgba(255,0,0,1)', // 赤色で中心点を強調
        'circle-radius': 5, // 固定サイズの点
        'circle-opacity': 1,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
    }
};
const mindenCircleSource = {
    id: "minden-circle-source", obj: {
        'type': 'geojson',
        'data': null,
    }
};
async function convertToGeoJSONforMinden() {
    const response = await fetch('https://kenzkenz3.xsrv.jp/geojson/ntrip/2025_minden5.geojson');
    const geojson = await response.json();
    console.log(geojson.features[0].geometry.coordinates)
    const radiusInKm = 20;
    // 各ポイントごとに円を生成し、プロパティを引き継ぐ
    const circleGeoJSON = {
        type: "FeatureCollection",
        features: geojson.features.map(feature => {
            if (feature.geometry) {
                const circle = turf.circle(feature.geometry.coordinates, radiusInKm, {
                    steps: 64, // 円の滑らかさ
                    units: 'kilometers'
                });
                return {
                    type: "Feature",
                    properties: feature.properties, // プロパティを引き継ぐ
                    geometry: circle.geometry
                };
            }
        })
    };
    mindenCircleSource.obj.data = circleGeoJSON
    store.state.mindenGeojson = geojson
}
convertToGeoJSONforMinden()

// 円形レイヤー
const mindenCircleLayer = {
    id: 'oh-minden-circle',
    type: 'fill',
    source: 'minden-circle-source',
    paint: {
        'fill-color': 'rgba(0,105,180,0.5)',
        'fill-outline-color': '#000'
    }
};
const mindenCircleLayerLine = {
    id: 'oh-minden-circle-line',
    type: 'line',
    source: 'minden-circle-source',
    paint: {
        'line-color': 'rgba(0,0,0,1)',
        'line-width': 1
    }
};

// ntrip --------------------------------------------------------------------------------------------
const ntripSource = {
    id: "ntrip-source", obj: {
        'type': 'geojson',
        // 'data': 'https://kenzkenz3.xsrv.jp/geojson/ntrip/sonohoka.geojson',
        // 'data': 'https://kenzkenz3.xsrv.jp/geojson/ntrip/ntrip0.geojson',
    }
}
const ntripCenterPointLayer = {
    id: "oh-ntrip-center",
    type: "circle",
    source: "ntrip-source",
    paint: {
        'circle-color': 'rgba(255,0,0,1)', // 赤色で中心点を強調
        'circle-radius': 5, // 固定サイズの点
        'circle-opacity': 1,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
    }
};
const ntripCircleSource = {
    id: "ntrip-circle-source", obj: {
        'type': 'geojson',
        'data': null,
    }
};
async function convertAndMergeGeoJSON() {
    // 最初のデータをフェッチ
    const response1 = await fetch('https://raw.githubusercontent.com/Bolero-fk/ZeniKijunkyokuChecker/main/Viewer/resource/result.json');
    const data1 = await response1.json();

    // 2つ目のGeoJSONデータをフェッチ
    const response2 = await fetch('https://kenzkenz3.xsrv.jp/geojson/ntrip/ntrip0.geojson');
    const data2 = await response2.json();

    // 最初のデータをGeoJSONに変換
    const geojson1 = {
        type: "FeatureCollection",
        features: data1.ReferenceStationData.map(station => ({
            type: "Feature",
            properties: {
                id: station.id,
                city_name: station.city_name,
                station_name: station.station_name,
                geoid_height: parseFloat(station.geoid_height),
                server_address: station.server_address,
                port_number: station.port_number,
                data_type: station.data_type,
                connection_type: station.connection_type,
                status: station.status,
                mail: station.mail,
                comment: station.comment
            },
            geometry: {
                type: "Point",
                coordinates: [
                    parseFloat(station.longitude),
                    parseFloat(station.latitude)
                ]
            }
        }))
    };
    // 2つのGeoJSONデータをマージ
    const mergedGeoJSON = {
        type: "FeatureCollection",
        features: [...geojson1.features, ...data2.features]
    };
    const radiusInKm = 20;
    // 各ポイントごとに円を生成し、プロパティを引き継ぐ
    const circleGeoJSON = {
        type: "FeatureCollection",
        features: mergedGeoJSON.features.map(feature => {
            const circle = turf.circle(feature.geometry.coordinates, radiusInKm, {
                steps: 64, // 円の滑らかさ
                units: 'kilometers'
            });
            return {
                type: "Feature",
                properties: feature.properties, // プロパティを引き継ぐ
                geometry: circle.geometry
            };
        })
    };
    ntripCircleSource.obj.data = circleGeoJSON;
    ntripSource.obj.data = mergedGeoJSON;
    store.state.ntripGeojson = mergedGeoJSON;
}
if (!store.state.isOffline) {
    convertAndMergeGeoJSON()
}

// 円形レイヤー
const ntripCircleLayer = {
    id: 'oh-ntrip-circle',
    type: 'fill',
    source: 'ntrip-circle-source',
    layout: {},
    filter: [
        '!=', ['get', 'status'], '休止' // 'status'が'休止'ではない場合のみ表示
    ],
    paint: {
        'fill-color': 'rgba(255,105,180,0.5)',
        'fill-outline-color': '#000'
    }
};
const ntripCircleLayerLine = {
    id: 'oh-ntrip-circle-line',
    type: 'line',
    source: 'ntrip-circle-source',
    filter: [
        '!=', ['get', 'status'], '休止' // 'status'が'休止'ではない場合のみ表示
    ],
    paint: {
        'line-color': 'rgba(0,0,0,1)',
        'line-width': 1
    }
};

// // 善意の基準局 --------------------------------------------------------------------------------------------
// const zeniSource = {
//     id: "zeni-source", obj: {
//         'type': 'geojson',
//         'data': null,
//     }
// }
// const zeniCenterPointLayer = {
//     id: "oh-zeni-center",
//     type: "circle",
//     source: "zeni-source",
//     paint: {
//         // 'circle-color': 'rgba(255,0,0,1)', // 赤色で中心点を強調
//         'circle-color': [
//             'match',
//             ['get', 'status'], // 'status'フィールドの値を取得
//             '公開', 'rgba(255,0,0,1)', // 公開の場合は赤色
//             '休止', 'rgba(0,0,255,1)', // 中止の場合は青色
//             'rgba(0,0,0,0)' // その他の場合は透明（黒を指定しても見えないようにする）
//         ],
//         'circle-radius': 5, // 固定サイズの点
//         'circle-opacity': 1,
//         'circle-stroke-width': 1,
//         'circle-stroke-color': '#fff'
//     }
// };
// const zeniCircleSource = {
//     id: "zeni-circle-source", obj: {
//         'type': 'geojson',
//         'data': null,
//     }
// };
// // 円形レイヤー
// const zeniCircleLayer = {
//     id: 'oh-zeni-circle',
//     type: 'fill',
//     source: 'zeni-circle-source',
//     layout: {},
//     filter: [
//         '!=', ['get', 'status'], '休止' // 'status'が'休止'ではない場合のみ表示
//     ],
//     paint: {
//         'fill-color': 'rgba(0,255,0,0.3)',
//         'fill-outline-color': '#000'
//     }
// };
// const zeniCircleLayerLine = {
//     id: 'oh-zeni-circle-line',
//     type: 'line',
//     source: 'zeni-circle-source',
//     filter: [
//         '!=', ['get', 'status'], '休止' // 'status'が'休止'ではない場合のみ表示
//     ],
//     paint: {
//         'line-color': 'rgba(0,0,0,1)',
//         'line-width': 1
//     }
// };
//
// // eslint-disable-next-line no-unexpected-multiline
// async function convertToGeoJSON() {
//     try {
//         // データをフェッチ
//         const response = await fetch('https://raw.githubusercontent.com/Bolero-fk/ZeniKijunkyokuChecker/main/Viewer/resource/result.json');
//         const data = await response.json();
//
//         // GeoJSONフォーマットに変換
//         const geojson = {
//             type: "FeatureCollection",
//             features: data.ReferenceStationData.map(station => ({
//                 type: "Feature",
//                 properties: {
//                     id: station.id,
//                     city_name: station.city_name,
//                     station_name: station.station_name,
//                     geoid_height: parseFloat(station.geoid_height),
//                     server_address: station.server_address,
//                     port_number: station.port_number,
//                     data_type: station.data_type,
//                     connection_type: station.connection_type,
//                     status: station.status,
//                     mail: station.mail,
//                     comment: station.comment
//                 },
//                 geometry: {
//                     type: "Point",
//                     coordinates: [
//                         parseFloat(station.longitude),
//                         parseFloat(station.latitude)
//                     ]
//                 }
//             }))
//         };
//
//         const radiusInKm = 20;
//         // 各ポイントごとに円を生成し、プロパティを引き継ぐ
//         const circleGeoJSON = {
//             type: "FeatureCollection",
//             features: geojson.features.map(feature => {
//                 const circle = turf.circle(feature.geometry.coordinates, radiusInKm, {
//                     steps: 64, // 円の滑らかさ
//                     units: 'kilometers'
//                 });
//                 return {
//                     type: "Feature",
//                     properties: feature.properties, // プロパティを引き継ぐ
//                     geometry: circle.geometry
//                 };
//             })
//         };
//         zeniCircleSource.obj.data = circleGeoJSON
//         zeniSource.obj.data = geojson;
//         store.state.zeniGeojson = geojson
//         console.log(JSON.stringify(geojson));
//         console.log(circleGeoJSON);
//         return { geojson, circleGeoJSON };
//     } catch (error) {
//         console.error('Error converting to GeoJSON:', error);
//     }
// }
// convertToGeoJSON()

// import std from '@/assets/json/modified_std.json'
import fxBasic from '@/assets/json/modified_fx_basic.json'
import mono from '@/assets/json/modified_mono.json'
import fxDark from '@/assets/json/modified_fx-dark.json'
import osmBright from '@/assets/json/osm_bright.json'
import osmToner from '@/assets/json/osm_toner.json'
import osm3d from '@/assets/json/osmfj_nopoi.json'
import axios from "axios";
import {convertGsiTileJson, fetchGsiTile, findLayerById} from "@/js/downLoad";
import {cs} from "vuetify/lib/locale";
//-------------------------------------------------------
export const osm3dSources = []
export const osm3dLayers = osm3d.layers.map(layer => {
    return {
        ...layer, // 既存のレイヤー設定を維持
        metadata: {
            group: 'osm-3d' // 新しいmetadataプロパティを追加
        }
    }
})
Object.keys(osm3d.sources).forEach(function(key) {
    osm3dSources.push({
        id: key,
        obj: osm3d.sources[key]
    })
})
//----------------------------------------------------------
const osmTonerSources = []
const osmTonerLayers = osmToner.layers.map(layer => {
    return {
        ...layer, // 既存のレイヤー設定を維持
        metadata: {
            group: 'osm-toner' // 新しいmetadataプロパティを追加
        }
    }
})
Object.keys(osmToner.sources).forEach(function(key) {
    osmTonerSources.push({
        id: key,
        obj: osmToner.sources[key]
    })
})
//-------------------------------------------------------
export const osmBrightSources = []
export const osmBrightLayers = osmBright.layers.map(layer => {
    return {
        ...layer, // 既存のレイヤー設定を維持
        metadata: {
            group: 'osm-bright' // 新しいmetadataプロパティを追加
        }
    }
})
Object.keys(osmBright.sources).forEach(function(key) {
    osmBrightSources.push({
        id: key,
        obj: osmBright.sources[key]
    })
})
//----------------------------------------------------------
const overpassSource = {
    id: 'osm-overpass-source', obj: {
        type: 'geojson',
        data: null
    }
}
const overpassPoint = {
    id: 'oh-osm-overpass-layer-point',
    type: 'circle',
    source: 'osm-overpass-source',
    filter: ['==', '$type', 'Point'],
    paint: {
        'circle-radius': 8,
        'circle-color': 'green',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
    }
}
const overpassPolygon = {
    id: 'oh-osm-overpass-layer-polygon',
    type: 'fill',
    source: 'osm-overpass-source',
    filter: ['==', '$type', 'Polygon'],
    paint: {
        'fill-color': 'rgba(0,0,255,0.5)',
    }
}
const overpassPolygonLine = {
    id: "oh-osm-overpass-layer-polygon-line",
    type: "line",
    source: "osm-overpass-source",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 1,
            12, 1.5
        ]
    },
}
const overpassLine = {
    id: 'oh-osm-overpass-layer-line',
    type: 'line',
    source: 'osm-overpass-source',
    filter: ['==', '$type', 'LineString'],
    paint: {
        'line-color': 'blue',
        'line-width': [
            'case',
            ['boolean', ['get', 'name'], false], // name フィールドが存在する場合 効いていない
            4, // 倍の太さ
            2  // 通常の太さ
        ]
    }
};

// const stdSources = []
// const stdLayers = std.layers
// Object.keys(std.sources).forEach(function(key) {
//     stdSources.push({
//         id: key,
//         obj: std.sources[key]
//     })
// })
// ---------------------------------------------------------------------
export const monoSources = []
export const monoLayers = mono.layers
Object.keys(mono.sources).forEach(function(key) {
    monoSources.push({
        id: key,
        obj: mono.sources[key]
    })
})
// ---------------------------------------------------------------------
const fxDarkSources = []
const fxDarkLayers = fxDark.layers
Object.keys(fxDark.sources).forEach(function(key) {
    fxDarkSources.push({
        id: key,
        obj: fxDark.sources[key]
    })
})
// ---------------------------------------------------------------------
const fxBasicSources = []
const fxBasicLayers = fxBasic.layers
Object.keys(fxBasic.sources).forEach(function(key) {
    fxBasicSources.push({
        id: key,
        obj: fxBasic.sources[key]
    })
})


export let konUrls = [
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1896-1909年', timeFolder: '2man'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1917-1924年', timeFolder: '00'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1927-1939年', timeFolder: '01'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1944-1954年', timeFolder: '02'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1965-1968年', timeFolder: '03'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1975-1978年', timeFolder: '04'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1983-1987年', timeFolder: '05'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1992-1995年', timeFolder: '06'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1998-2005年', timeFolder: '07'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1888-1898年', timeFolder: '2man'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1920年', timeFolder: '00'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1932年', timeFolder: '01'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1937-1938年', timeFolder: '02'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1947年', timeFolder: '03'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1959-1960年', timeFolder: '04'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1968-1973年', timeFolder: '05'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1976-1980年', timeFolder: '06'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1984-1989年', timeFolder: '07'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1992-1996年', timeFolder: '08'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1892-1910年', timeFolder: '2man'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1922-1923年', timeFolder: '00'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1927-1935年', timeFolder: '01'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1947-1950年', timeFolder: '02'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1954-1956年', timeFolder: '03'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1961-1964年', timeFolder: '03x'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1967-1970年', timeFolder: '04'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1975-1979年', timeFolder: '05'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1983-1988年', timeFolder: '06'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1993-1997年', timeFolder: '07'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1916年', timeFolder: '00'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1935年', timeFolder: '01'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1950-1952年', timeFolder: '02'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1975-1976年', timeFolder: '03'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1995-1998年', timeFolder: '04'},
    {name: '仙台', datasetFolder: 'sendai', time: '1928-1933年', timeFolder: '00'},
    {name: '仙台', datasetFolder: 'sendai', time: '1946年', timeFolder: '01'},
    {name: '仙台', datasetFolder: 'sendai', time: '1963-1967年', timeFolder: '02'},
    {name: '仙台', datasetFolder: 'sendai', time: '1977-1978年', timeFolder: '03'},
    {name: '仙台', datasetFolder: 'sendai', time: '1995-2000年', timeFolder: '04'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1894-1899年', timeFolder: '2man'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1925-1932年', timeFolder: '00'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1950-1954年', timeFolder: '01'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1967-1969年', timeFolder: '02'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1984-1990年', timeFolder: '03'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1992-2001年', timeFolder: '04'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1922-1926年', timeFolder: '00'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1936-1938年', timeFolder: '01'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1948-1956年', timeFolder: '02'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1967-1972年', timeFolder: '03'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1982-1986年', timeFolder: '04'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1991-2000年', timeFolder: '05'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1901-1913年', timeFolder: '00'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1949-1953年', timeFolder: '01'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1969-1982年', timeFolder: '02'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1990-2008年', timeFolder: '03'},
    {name: '関東', datasetFolder: 'kanto', time: '1894-1915年', timeFolder: '00'},
    {name: '関東', datasetFolder: 'kanto', time: '1928-1945年', timeFolder: '01'},
    {name: '関東', datasetFolder: 'kanto', time: '1972-1982年', timeFolder: '02'},
    {name: '関東', datasetFolder: 'kanto', time: '1988-2008年', timeFolder: '03'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '1919年', timeFolder: '00'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '1973-1975年', timeFolder: '01'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '1992-1994年', timeFolder: '02'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '2005-2008年', timeFolder: '03'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1889-1890年', timeFolder: '2man'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1916-1918年', timeFolder: '00'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1938-1950年', timeFolder: '01'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1956-1959年', timeFolder: '02'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1975-1988年', timeFolder: '03'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1988-1995年', timeFolder: '04'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1996-2010年', timeFolder: '05'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1900-1901年', timeFolder: '2man'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1926年', timeFolder: '00'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1965-1971年', timeFolder: '01'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1983年', timeFolder: '02'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1998-2000年', timeFolder: '03'},
    {name: '新潟', datasetFolder: 'niigata', time: '1910-1911年', timeFolder: '00'},
    {name: '新潟', datasetFolder: 'niigata', time: '1930-1931年', timeFolder: '01'},
    {name: '新潟', datasetFolder: 'niigata', time: '1966-1968年', timeFolder: '02'},
    {name: '新潟', datasetFolder: 'niigata', time: '1980-1988年', timeFolder: '03'},
    {name: '新潟', datasetFolder: 'niigata', time: '1997-2001年', timeFolder: '04'},
    {name: '姫路', datasetFolder: 'himeji', time: '1903-1910年', timeFolder: '2man'},
    {name: '姫路', datasetFolder: 'himeji', time: '1923年', timeFolder: '00'},
    {name: '姫路', datasetFolder: 'himeji', time: '1967年', timeFolder: '01'},
    {name: '姫路', datasetFolder: 'himeji', time: '1981-1985年', timeFolder: '02'},
    {name: '姫路', datasetFolder: 'himeji', time: '1997-2001年', timeFolder: '03'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1895-1898年', timeFolder: '2man'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1925年', timeFolder: '00'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1965-1970年', timeFolder: '01'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1978-1988年', timeFolder: '02'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1990-2000年', timeFolder: '03'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1902年', timeFolder: '5man'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1902年', timeFolder: '2man'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1932年', timeFolder: '00'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1966年', timeFolder: '01'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1982-1983年', timeFolder: '02'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1996-2001年', timeFolder: '03'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1903年', timeFolder: '2man'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1928-1955年', timeFolder: '00'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1968年', timeFolder: '01'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1985年', timeFolder: '02'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1998-1999年', timeFolder: '03'},
    {name: '大分', datasetFolder: 'oita', time: '1914年', timeFolder: '00'},
    {name: '大分', datasetFolder: 'oita', time: '1973年', timeFolder: '01'},
    {name: '大分', datasetFolder: 'oita', time: '1984-1986年', timeFolder: '02'},
    {name: '大分', datasetFolder: 'oita', time: '1997-2001年', timeFolder: '03'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1900-1901年', timeFolder: '2man'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1924-1926年', timeFolder: '00'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1954年', timeFolder: '01'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1970年', timeFolder: '02'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1982-1983年', timeFolder: '03'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1996-2000年', timeFolder: '03'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1909-1910年', timeFolder: '2man'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1930年', timeFolder: '00'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1968-1969年', timeFolder: '01'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1981-1985年', timeFolder: '02'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1994-2001年', timeFolder: '03'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1908-1912年', timeFolder: '2man'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1934年', timeFolder: '00'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1947年', timeFolder: '01'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1966-1967年', timeFolder: '02'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1984-1985年', timeFolder: '03'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1998-2000年', timeFolder: '04'},
    {name: '青森', datasetFolder: 'aomori', time: '1912年', timeFolder: '00'},
    {name: '青森', datasetFolder: 'aomori', time: '1939-1955年', timeFolder: '01'},
    {name: '青森', datasetFolder: 'aomori', time: '1970年', timeFolder: '02'},
    {name: '青森', datasetFolder: 'aomori', time: '1984-1989年', timeFolder: '03'},
    {name: '青森', datasetFolder: 'aomori', time: '2003-2011年', timeFolder: '04'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1896-1910年', timeFolder: '2man'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1928年', timeFolder: '00'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1969年', timeFolder: '01'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1983-1984年', timeFolder: '02'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1990-2000年', timeFolder: '03'},
    {name: '長野', datasetFolder: 'nagano', time: '1912年', timeFolder: '00'},
    {name: '長野', datasetFolder: 'nagano', time: '1937年', timeFolder: '01'},
    {name: '長野', datasetFolder: 'nagano', time: '1960年', timeFolder: '02'},
    {name: '長野', datasetFolder: 'nagano', time: '1972-1973年', timeFolder: '03'},
    {name: '長野', datasetFolder: 'nagano', time: '1985年', timeFolder: '04'},
    {name: '長野', datasetFolder: 'nagano', time: '2001年', timeFolder: '05'},
    {name: '福島', datasetFolder: 'fukushima', time: '1908年', timeFolder: '00'},
    {name: '福島', datasetFolder: 'fukushima', time: '1931年', timeFolder: '01'},
    {name: '福島', datasetFolder: 'fukushima', time: '1972-1973年', timeFolder: '02'},
    {name: '福島', datasetFolder: 'fukushima', time: '1983年', timeFolder: '03'},
    {name: '福島', datasetFolder: 'fukushima', time: '1996-2000年', timeFolder: '04'},
    {name: '福井', datasetFolder: 'fukui', time: '1909年', timeFolder: '2man'},
    {name: '福井', datasetFolder: 'fukui', time: '1930年', timeFolder: '00'},
    {name: '福井', datasetFolder: 'fukui', time: '1969-1973年', timeFolder: '01'},
    {name: '福井', datasetFolder: 'fukui', time: '1988-1990年', timeFolder: '02'},
    {name: '福井', datasetFolder: 'fukui', time: '1996-2000年', timeFolder: '03'},
    {name: '秋田', datasetFolder: 'akita', time: '1912年', timeFolder: '00'},
    {name: '秋田', datasetFolder: 'akita', time: '1971-1972年', timeFolder: '01'},
    {name: '秋田', datasetFolder: 'akita', time: '1985-1990年', timeFolder: '02'},
    {name: '秋田', datasetFolder: 'akita', time: '2006-2007年', timeFolder: '03'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1811-1912年', timeFolder: '00'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1939年', timeFolder: '01'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1968-1969年', timeFolder: '02'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1983-1988年', timeFolder: '03'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1999-2002年', timeFolder: '04'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1897年', timeFolder: '2man'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1932年', timeFolder: '00'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1973年', timeFolder: '01'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1988年', timeFolder: '02'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1999-2001年', timeFolder: '03'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1896-1909年', timeFolder: '2man'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1917年', timeFolder: '00'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1928-1934年', timeFolder: '01'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1969-1970年', timeFolder: '02'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1981-1987年', timeFolder: '03'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1997-2000年', timeFolder: '04'},
    {name: '高知', datasetFolder: 'kochi', time: '1906-1907年', timeFolder: '2man'},
    {name: '高知', datasetFolder: 'kochi', time: '1933年', timeFolder: '00'},
    {name: '高知', datasetFolder: 'kochi', time: '1965年', timeFolder: '01'},
    {name: '高知', datasetFolder: 'kochi', time: '1982年', timeFolder: '02'},
    {name: '高知', datasetFolder: 'kochi', time: '1998-2003年', timeFolder: '03'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1902年', timeFolder: '00'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1935年', timeFolder: '01'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1962年', timeFolder: '02'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1979年', timeFolder: '03'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1999-2001年', timeFolder: '04'},
    {name: '山形', datasetFolder: 'yamagata', time: '1901-1903年', timeFolder: '2man'},
    {name: '山形', datasetFolder: 'yamagata', time: '1931年', timeFolder: '00'},
    {name: '山形', datasetFolder: 'yamagata', time: '1970年', timeFolder: '01'},
    {name: '山形', datasetFolder: 'yamagata', time: '1980-1989年', timeFolder: '02'},
    {name: '山形', datasetFolder: 'yamagata', time: '1999-2001年', timeFolder: '03'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1900-1911年', timeFolder: '2man'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1914-1926年', timeFolder: '00'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1931-1940年', timeFolder: '01'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1958-1964年', timeFolder: '02'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1977-1982年', timeFolder: '03'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1998-2001年', timeFolder: '04'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1915年', timeFolder: '00'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1934年', timeFolder: '01'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1975年', timeFolder: '02'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1989-1990年', timeFolder: '03'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1997-2003年', timeFolder: '04'},
    {name: '津', datasetFolder: 'tsu', time: '1892-1898年', timeFolder: '2man'},
    {name: '津', datasetFolder: 'tsu', time: '1920年', timeFolder: '00'},
    {name: '津', datasetFolder: 'tsu', time: '1937年', timeFolder: '01'},
    {name: '津', datasetFolder: 'tsu', time: '1959年', timeFolder: '02'},
    {name: '津', datasetFolder: 'tsu', time: '1980-1982年', timeFolder: '03'},
    {name: '津', datasetFolder: 'tsu', time: '1991-1999年', timeFolder: '04'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1897-1909年', timeFolder: '2man'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1922-1927年', timeFolder: '00'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1936-1951年', timeFolder: '01'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1969年', timeFolder: '02'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1983-1989年', timeFolder: '03'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '2000-2001年', timeFolder: '04'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1916-1917年', timeFolder: '00'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1950-1952年', timeFolder: '01'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1972-1974年', timeFolder: '02'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1986年', timeFolder: '03'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1999-2001年', timeFolder: '04'},
    {name: '函館', datasetFolder: 'hakodate', time: '19159年', timeFolder: '00'},
    {name: '函館', datasetFolder: 'hakodate', time: '1951-1955年', timeFolder: '01'},
    {name: '函館', datasetFolder: 'hakodate', time: '1968年', timeFolder: '02'},
    {name: '函館', datasetFolder: 'hakodate', time: '1986-1989年', timeFolder: '03'},
    {name: '函館', datasetFolder: 'hakodate', time: '1996-2001年', timeFolder: '04'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1910年', timeFolder: '00'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1931年', timeFolder: '01'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1974-1975年', timeFolder: '02'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1987-1992年', timeFolder: '03'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1996-2001年', timeFolder: '04'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1900-1901年', timeFolder: '2man'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1924年', timeFolder: '00'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1971年', timeFolder: '01'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1985-1987年', timeFolder: '02'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1997-1998年', timeFolder: '03'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1912年', timeFolder: '00'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1939年', timeFolder: '01'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1970-1971年', timeFolder: '02'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1980-1986年', timeFolder: '03'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1994-1997年', timeFolder: '04'},
    {name: '会津', datasetFolder: 'aizu', time: '1908-1910年', timeFolder: '00'},
    {name: '会津', datasetFolder: 'aizu', time: '1931年', timeFolder: '01'},
    {name: '会津', datasetFolder: 'aizu', time: '1972-1975年', timeFolder: '02'},
    {name: '会津', datasetFolder: 'aizu', time: '1988-1991年', timeFolder: '03'},
    {name: '会津', datasetFolder: 'aizu', time: '1997-2000年', timeFolder: '04'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1897年', timeFolder: '00'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1922年', timeFolder: '01'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1958年', timeFolder: '02'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1981年', timeFolder: '03'},
    {name: '釧路', datasetFolder: 'kushiro', time: '2001年', timeFolder: '04'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1896年', timeFolder: '00'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1935年', timeFolder: '01'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1954-1955年', timeFolder: '02'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1983-1984年', timeFolder: '03'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1993-999年', timeFolder: '04'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1896年', timeFolder: '00'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1930年', timeFolder: '01'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1956-1957年', timeFolder: '02'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1985年', timeFolder: '03'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1998-2000年', timeFolder: '04'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1902年', timeFolder: '00'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1932年', timeFolder: '01'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1966年', timeFolder: '02'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1979-1980年', timeFolder: '03'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1998-2001年', timeFolder: '04'},
    {name: '東予', datasetFolder: 'toyo', time: '1898-1906年', timeFolder: '00'},
    {name: '東予', datasetFolder: 'toyo', time: '1928年', timeFolder: '01'},
    {name: '東予', datasetFolder: 'toyo', time: '1966-1969年', timeFolder: '02'},
    {name: '東予', datasetFolder: 'toyo', time: '1984-1989年', timeFolder: '03'},
    {name: '東予', datasetFolder: 'toyo', time: '1994-2001年', timeFolder: '04'},
    {name: '庄内', datasetFolder: 'syonai', time: '1913年', timeFolder: '00'},
    {name: '庄内', datasetFolder: 'syonai', time: '1934年', timeFolder: '01'},
    {name: '庄内', datasetFolder: 'syonai', time: '1974年', timeFolder: '02'},
    {name: '庄内', datasetFolder: 'syonai', time: '1987年', timeFolder: '03'},
    {name: '庄内', datasetFolder: 'syonai', time: '1997-2001年', timeFolder: '04'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1896年', timeFolder: '00'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1917年', timeFolder: '01'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1955年', timeFolder: '02'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1986-1987年', timeFolder: '03'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1998-2000年', timeFolder: '04'},
    {name: '近江', datasetFolder: 'omi', time: '1891-1909年', timeFolder: '2man'},
    {name: '近江', datasetFolder: 'omi', time: '1920-1922年', timeFolder: '00'},
    {name: '近江', datasetFolder: 'omi', time: '1954年', timeFolder: '01'},
    {name: '近江', datasetFolder: 'omi', time: '1967-1971年', timeFolder: '02'},
    {name: '近江', datasetFolder: 'omi', time: '1979-1986年', timeFolder: '03'},
    {name: '近江', datasetFolder: 'omi', time: '1992-1999年', timeFolder: '04'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1913年', timeFolder: '00'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1951年', timeFolder: '01'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1968年', timeFolder: '02'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1985-1986年', timeFolder: '03'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1996-2001年', timeFolder: '04'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1901年', timeFolder: '00'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1932-1942年', timeFolder: '01'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1965年', timeFolder: '02'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1978年', timeFolder: '03'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1999-2000年', timeFolder: '04'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1913年', timeFolder: '00'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1951年', timeFolder: '01'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1968年', timeFolder: '02'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1983-1986年', timeFolder: '03'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1997-2000年', timeFolder: '04'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1910年', timeFolder: '00'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1941-1942年', timeFolder: '01'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1970年', timeFolder: '02'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1983-1987年', timeFolder: '03'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1993-1994年', timeFolder: '04'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1999-2000年', timeFolder: '05'},
    {name: '周南', datasetFolder: 'shunan', time: '1899年', timeFolder: '00'},
    {name: '周南', datasetFolder: 'shunan', time: '1949年', timeFolder: '01'},
    {name: '周南', datasetFolder: 'shunan', time: '1968-1969年', timeFolder: '02'},
    {name: '周南', datasetFolder: 'shunan', time: '1985年', timeFolder: '03'},
    {name: '周南', datasetFolder: 'shunan', time: '1994-2001年', timeFolder: '04'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1908-1910年', timeFolder: '00'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1952-1953年', timeFolder: '01'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1970-1973年', timeFolder: '02'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1984年', timeFolder: '03'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1999-2001年', timeFolder: '04'},
    {name: '伊那', datasetFolder: 'ina', time: '1911年', timeFolder: '00'},
    {name: '伊那', datasetFolder: 'ina', time: '1951-1952年', timeFolder: '01'},
    {name: '伊那', datasetFolder: 'ina', time: '1976年', timeFolder: '02'},
    {name: '伊那', datasetFolder: 'ina', time: '1987-1990年', timeFolder: '03'},
    {name: '伊那', datasetFolder: 'ina', time: '1998-2001年', timeFolder: '04'},
    {name: '伊賀', datasetFolder: 'iga', time: '1892年', timeFolder: '00'},
    {name: '伊賀', datasetFolder: 'iga', time: '1937年', timeFolder: '01'},
    {name: '伊賀', datasetFolder: 'iga', time: '1968年', timeFolder: '02'},
    {name: '伊賀', datasetFolder: 'iga', time: '1980-1986年', timeFolder: '03'},
    {name: '伊賀', datasetFolder: 'iga', time: '1996-2001年', timeFolder: '04'},
]
console.log(konUrls.length)

konUrls = konUrls.map(url => {
    const times = url.time.replace('年','').split('-')
    return {
        name: url.name,
        time: url.time,
        id:'oh-kon-' + url.name + '-source-' + url.timeFolder,
        source: 'oh-kon-' + url.name + '-source-' + url.timeFolder,
        tiles: ['https://ktgis.net/kjmapw/kjtilemap/' + url.datasetFolder + '/' + url.timeFolder + '/{z}/{x}/{y}.png'],
        timeStart: Number(times[0]),
        timeEnd: isNaN(Number(times[1])) ? Number(times[0]) :Number(times[1])
    }
})

const konSources = []
const konLayers = []
konUrls.forEach(url => {
    konSources.push({
        id: url.id,
        obj:{
            type: 'raster',
            tiles: url.tiles,
            scheme: 'tms',
        }
    })
    konLayers.push({
        id: url.id,
        source: url.source,
        name0: url.name,
        name: url.name + url.time,
        type: 'raster',
    })
})
const konLayers2 = konLayers.map((layer,i) => {
    return {
        id: layer.id,
        name: layer.name0,
        label: layer.name,
        source: konSources[i],
        layers:[layer],
        attribution: "<a href='https://ktgis.net/kjmapw/tilemapservice.html' target='_blank'>今昔マップ</a>",
    }
})
// 親ノードごとにグループ化する
const groupedLayers = konLayers2.reduce((acc, layer) => {
    // 親ノードを `name` フィールドでグループ化
    if (!acc[layer.name]) {
        acc[layer.name] = {
            id: 'kon-' + layer.name,      // 親ノードの ID
            label: layer.name,            // 親ノードのラベル
            nodes: [],                    // 子ノードとしてレイヤーを格納する配列
        };
    }
    acc[layer.name].nodes.push(layer);    // 子ノードとして追加
    return acc;
}, {});
// オブジェクトを配列に変換
const konjyakuMapWithParentNodes = Object.values(groupedLayers);

// 「今昔マップ」の親ノードとしてまとめる
const konjyakuMap = {
    id: 'konjyaku',
    label: "今昔マップ",
    nodes: konjyakuMapWithParentNodes
};

// 戦後米軍地図-----------------------------------------------------------------------------------------------------------
let urls =[
    {'50on':'みやざきし',name:'宮崎市',url:'https://kenzkenz2.xsrv.jp/usarmy/miyazaki/{z}/{x}/{y}.png',tms:true,bounds:[131.38730562869546, 31.94874904974968, 131.47186495009896, 31.85909130381588]},
    {'50on':'のべおかし',name:'延岡市',url:'https://kenzkenz2.xsrv.jp/usarmy/nobeoka/{z}/{x}/{y}.png',tms:true,bounds: [131.63757572120534, 32.62500535406083, 131.72436281180384, 32.54331840955494]},
    {'50on':'みやこのじょうし',name:'都城市',url:'https://t.tilemap.jp/jcp_maps/miyakonojo/{z}/{x}/{y}.png',tms:true,bounds: [131.01477802559293, 31.759362148868007, 131.10179776971427, 31.69135798671786]},
    {'50on':'かごしまし',name:'鹿児島市',url:'https://kenzkenz2.xsrv.jp/usarmy/kagosima/{z}/{x}/{y}.png',tms:true,bounds: [130.5199329928549, 31.625904260596627, 130.60040625640664, 31.53839471681782]},
    {'50on':'むろらんし',name:'室蘭市',url:'https://t.tilemap.jp/jcp_maps/muroran/{z}/{x}/{y}.png',tms:true,bounds: [140.90440038348575, 42.38405121586513, 141.05923356332505, 42.29059914480226]},
    {'50on':'あかしし',name:'明石市',url:'https://t.tilemap.jp/jcp_maps/akashi/{z}/{x}/{y}.png',tms:true,bounds: [134.9178464474012, 34.710923217623645, 135.04999909886737, 34.6239626197396]},
    {'50on':'あいおいし',name:'相生市',url:'https://t.tilemap.jp/jcp_maps/harima/{z}/{x}/{y}.png',tms:true,bounds: [134.40899456747056, 34.827906424389056, 134.51680327661515, 34.734588690535986]},
    {'50on':'あきたし',name:'秋田市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/akita/{z}/{x}/{y}.png',tms:false,bounds:[140.0717562014137, 39.73918236291928, 140.14706081310268, 39.6820763867207]},
    {'50on':'あおもりし',name:'青森市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/aomori/{z}/{x}/{y}.png',tms:false,bounds: [140.70599744657008, 40.85260097581303, 140.79743395188777, 40.7935556203787]},
    {'50on':'あさひかわし',name:'旭川市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/asahikawa/{z}/{x}/{y}.png',tms:false,bounds: [142.30618215432563, 43.8296431351975, 142.425113984255, 43.7268853650624]},
    {'50on':'ちばし',name:'千葉市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/chiba/{z}/{x}/{y}.png',tms:false,bounds: [140.08764378681573,35.62917380173154, 140.15972144856843,35.554932756846156]},
    {'50on':'ふじのみやし',name:'富士宮市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fujinomiya/{z}/{x}/{y}.png',tms:false,bounds: [138.5809732397614,35.25121212484136, 138.6515394767342,35.18069262503313]},
    {'50on':'ふくいし',name:'福井市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fukui/{z}/{x}/{y}.png',tms:false,bounds: [136.16942055402976,36.0976050324894, 136.25602908312064,36.01592560352381]},
    {'50on':'ふくしまし',name:'福島市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fukushima/{z}/{x}/{y}.png',tms:false,bounds: [140.44319076482216,37.78090343507313, 140.5007616991178,37.72953717372495]},
    {'50on':'ふしきし',name:'伏木',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fushiki/{z}/{x}/{y}.png',tms:false,bounds: [137.02508679699687,36.8245491449906, 137.1126408047655,36.7604369200003]},
    {'50on':'ぎふし',name:'岐阜市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/gifu/{z}/{x}/{y}.png',tms:false,bounds: [136.70751515094838,35.470986568936624, 136.82609225873549,35.37258621685527]},
    {'50on':'はぶ',name:'habu',url:'https://kenzkenz3.xsrv.jp/jcp_maps/habu/{z}/{x}/{y}.png',tms:false,bounds: [133.1350108897345,34.32262791592599, 133.2262140428679,34.24586042631]},
    {'50on':'はちのへ',name:'八戸市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hachinohe/{z}/{x}/{y}.png',tms:false,bounds: [141.4589812322207,40.56255590542611, 141.57631044226363,40.48799652674896]},
    {'50on':'はぎし',name:'萩市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hagi/{z}/{x}/{y}.png',tms:false,bounds:[131.3620548860769,34.4605107256224, 131.43111774489685,34.38617650807586] },
    {'50on':'はこだてし',name:'函館市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hakodate/{z}/{x}/{y}.png',tms:false,bounds: [140.68097748426095,41.82926676413055, 140.7901943531384,41.73143517073271] },
    {'50on':'はんだし',name:'半田市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/handa/{z}/{x}/{y}.png',tms:false,bounds: [136.89242595186886,34.945077593842996, 137.00722449770626,34.85734903493045]},
    {'50on':'ひがしいわせ',name:'東岩瀬',url:'https://kenzkenz3.xsrv.jp/jcp_maps/higashiiwase/{z}/{x}/{y}.png',tms:false,bounds: [137.16815167238158,36.78583199289653, 137.25717016627235,36.71700039282162]},
    {'50on':'ひこねし',name:'彦根市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hikone/{z}/{x}/{y}.png',tms:false,bounds: [136.1900204514088,35.32992409688262, 136.30520216294815,35.224721393195296]},
    {'50on':'ひめじし',name:'姫路市',url:'https://t.tilemap.jp/jcp_maps/himeji/{z}/{x}/{-y}.png',tms:false,bounds: [134.64098624425583, 34.8708631072014, 134.7378282897613, 34.80268817759354]},
    {'50on':'ひらかたし',name:'枚方市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hirakata/{z}/{x}/{y}.png',tms:false,bounds:[135.57194920276365,34.87011100775344, 135.68724932168683,34.800562973217296]},
    {'50on':'ひらつかし',name:'平塚市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hiratsuka/{z}/{x}/{y}.png',tms:false,bounds: [139.31229120023235,35.35904999646574, 139.3878805441378,35.28874804475291]},
    {'50on':'ひろまち',name:'広町',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hiromachi/{z}/{x}/{y}.png',tms:false,bounds: [132.5731525471544,34.26760068261592, 132.67292535809037,34.1905277967504]},
    {'50on':'ひろさきし',name:'弘前市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hirosaki/{z}/{x}/{y}.png',tms:false,bounds: [140.4235199121323,40.631355509931836, 140.5010183369034,40.56109320751867]},
    {'50on':'ひろしまし',name:'広島市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hiroshima/{z}/{x}/{y}.png',tms:false,bounds: [132.3884909359741,34.431458513241665, 132.52820720355984,34.330487127792665]},
    {'50on':'ひたちし',name:'日立市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hitachi/{z}/{x}/{y}.png',tms:false,bounds: [140.57999833282472,36.64482954491233, 140.6999440377617,36.53230602703728]},
    {'50on':'ひとよしし',name:'人吉市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hitoyoshi/{z}/{x}/{y}.png',tms:false,bounds: [130.73763423508643,32.2355050464609, 130.79378929829835,32.1887013821016]},
    {'50on':'いちのみやし',name:'一宮市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/ichinomiya/{z}/{x}/{y}.png',tms:false,bounds: [136.73726867270835,35.34563130774367, 136.8879913849867,35.19549105733337]},
    {'50on':'いさはやし',name:'諫早市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/isahaya/{z}/{x}/{y}.png',tms:false,bounds: [130.02394444628715,32.86659294976408, 130.108573505125,32.81428582145436]},
    {'50on':'いいづかし',name:'飯塚市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/iizuka/{z}/{x}/{y}.png',tms:false,bounds: [130.65216494469635,33.671544924421084, 130.71290557949533,33.589367508699866]},
    {'50on':'かじきし',name:'加治木',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kajiki/{z}/{x}/{y}.png',tms:false,bounds: [130.6334297037225,31.757366116931934, 130.6942427581649,31.706007526498084]},
    {'50on':'かまいしし',name:'釜石市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kamaishi/{z}/{x}/{y}.png',tms:false,bounds: [141.83555625727507,39.29839433432599, 141.9190507416997,39.24137226047998]},
    {'50on':'かなざわし',name:'金沢市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kanazawa/{z}/{x}/{y}.png',tms:false,bounds: [136.57678119459374,36.616141434534484, 136.70692666986213,36.51525054188362]},
    {'50on':'かんだ',name:'苅田町',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kanda/{z}/{x}/{y}.png',tms:false,bounds: [130.94005143590758,33.81584169930497, 131.02026222594566,33.747149681232116]},
    {'50on':'からつし',name:'唐津市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/karatsu/{z}/{x}/{y}.png',tms:false,bounds: [129.921021511898,33.50559209417867, 130.005309930191,33.43203779434077]},
    {'50on':'かりやし',name:'刈谷市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kariya/{z}/{x}/{y}.png',tms:false,bounds: [136.94200877634015,35.03318584159486, 137.0601647773119,34.959046536665284]},
    {'50on':'かしわざきし',name:'柏崎市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kashiwazaki/{z}/{x}/{y}.png',tms:false,bounds: [138.50568101943807,37.40203383548953, 138.59532647968607,37.342488307171394]},
    {'50on':'かわごえし',name:'川越市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kawagoe/{z}/{x}/{y}.png',tms:false,bounds: [139.4570958921943,35.942500179173905, 139.52681723332742,35.87309357493287]},
    {'50on':'とよたし',name:'豊田市（挙母）',url:'https://kenzkenz3.xsrv.jp/jcp_maps/koromo/{z}/{x}/{y}.png',tms:false,bounds: [137.08772963931085,35.13859479723625, 137.1960466270638,35.027068132737384]},
    {'50on':'くだまつし',name:'下松市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kudamatsu/{z}/{x}/{y}.png',tms:false,bounds: [131.8186521172428,34.038862259919966, 131.89699206649303,33.96796119128024]},
    {'50on':'くわなし',name:'桑名市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kuwana/{z}/{x}/{y}.png',tms:false,bounds: [136.61704718511825,35.13788876963871, 136.77256971042877,34.97847375883852]},
    {'50on':'こうちし',name:'高知市',url:'https://t.tilemap.jp/jcp_maps/kochi/{z}/{x}/{y}.png',tms:true,bounds: [133.4697604427741, 33.593332069856146, 133.58746118164257, 33.48248877930844]},
    {'50on':'こうふし',name:'甲府市',url:'https://t.tilemap.jp/jcp_maps/kofu/{z}/{x}/{y}.png',tms:true,bounds: [138.5192430532455, 35.713904772878024, 138.61371447806357, 35.62085584514263]},
    {'50on':'こくら',name:'小倉',url:'https://t.tilemap.jp/jcp_maps/kokura/{z}/{x}/{y}.png',tms:true,bounds: [130.83351113737584, 33.92073003726122, 130.95307633268283, 33.83365615261114]},
    {'50on':'こおりやまし',name:'郡山市',url:'https://t.tilemap.jp/jcp_maps/koriyama/{z}/{x}/{y}.png',tms:true,bounds: [140.33108953120356, 37.43688472335944, 140.4249240446428, 37.367662796402]},
    {'50on':'くまもとし',name:'熊本市',url:'https://t.tilemap.jp/jcp_maps/kumamoto/{z}/{x}/{y}.png',tms:true,bounds: [130.6754534531498, 32.83726270469704, 130.77889418491364, 32.75070766375866]},
    {'50on':'くるめし',name:'久留米市',url:'https://t.tilemap.jp/jcp_maps/kurume/{z}/{x}/{y}.png',tms:true,bounds: [130.4842734730671, 33.33550789416525, 130.58554027442437, 33.26640037986165]},
    {'50on':'くしろし',name:'釧路市',url:'https://t.tilemap.jp/jcp_maps/kushiro/{z}/{x}/{y}.png',tms:true,bounds: [144.34146030236244, 43.03742598091131, 144.44208605576515, 42.94577285147719]},
    {'50on':'きょうとし１',name:'京都市(北)',url:'https://t.tilemap.jp/jcp_maps/kyoto_north/{z}/{x}/{y}.png',tms:true,bounds: [135.69243533265592, 35.07483494738305, 135.80488895726202, 34.98779081635700]},
    {'50on':'きょうとし２',name:'京都市(南)',url:'https://t.tilemap.jp/jcp_maps/kyoto_south/{z}/{x}/{y}.png',tms:true,bounds: [135.6943010138845, 34.996985089808334, 135.80539677017686, 34.916474628902776]},
    {'50on':'まえはしし',name:'前橋市',url:'https://t.tilemap.jp/jcp_maps/maebashi/{z}/{x}/{y}.png',tms:true,bounds: [139.03692848520149, 36.42476537937992, 139.10921177449703, 36.36642121340162]},
    {'50on':'まくらざきし',name:'枕崎市',url:'https://t.tilemap.jp/jcp_maps/makurazaki/{z}/{x}/{y}.png',tms:true,bounds: [130.27057404867296, 31.293447219997688, 130.3296372970093, 31.248059353360432]},
    {'50on':'まつえし',name:'松江市',url:'https://t.tilemap.jp/jcp_maps/matsue/{z}/{x}/{y}.png',tms:true,bounds: [132.99721215263972, 35.49991858248744, 133.10912531212935, 35.42483380090842]},
    {'50on':'みはらし',name:'三原市',url:'https://t.tilemap.jp/jcp_maps/mihara_itozaki/{z}/{x}/{y}.png',tms:true,bounds: [133.02333144783972, 34.425199058736396, 133.13130511283873, 34.356677113032205]},
    {'50on':'みとし',name:'水戸市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/mito/{z}/{x}/{y}.png',tms:false,bounds: [140.4179578231387, 36.413769771836456, 140.545391585093, 36.350511004933594]},
    {'50on':'ながのし',name:'長野市',url:'https://t.tilemap.jp/jcp_maps/nagano/{z}/{x}/{y}.png',tms:true,bounds: [138.14073032198428, 36.69619682804296, 138.2340108459997, 36.615546045100615]},
    {'50on':'ながおかし',name:'長岡市',url:'https://t.tilemap.jp/jcp_maps/nagaoka/{z}/{x}/{y}.png',tms:true,bounds: [138.81563140898004, 37.48632713465814, 138.87307359724298, 37.41690979613216]},
    {'50on':'ながさきし',name:'長崎市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/nagasaki/{z}/{x}/{y}.png',tms:false,bounds: [129.82426933289048, 32.80116245898009, 129.92143838942525, 32.69767898831918]},
    {'50on':'なごやし１',name:'名古屋市(北東)',url:'https://t.tilemap.jp/jcp_maps/nagoya_ne/{z}/{x}/{y}.png',tms:true,bounds: [136.8897098705461, 35.22421193160979, 136.98818271993733, 35.13233810303973]},
    {'50on':'なごやし２',name:'名古屋市(北西)',url:'https://t.tilemap.jp/jcp_maps/nagoya_nw/{z}/{x}/{y}.png',tms:true,bounds: [136.80611080422372, 35.225824131738065, 136.90547197474476, 35.13243456671647]},
    {'50on':'なごやし３',name:'名古屋市(南東)',url:'https://t.tilemap.jp/jcp_maps/nagoya_se/{z}/{x}/{y}.png',tms:true,bounds: [136.88919877397763, 35.14167895962797, 136.98842441427456, 35.04951319684166]},
    {'50on':'なごやし４',name:'名古屋市(南西)',url:'https://t.tilemap.jp/jcp_maps/nagoya_sw/{z}/{x}/{y}.png',tms:true,bounds: [136.80523113396558, 35.141184354273065, 136.90487806511402, 35.048543288426316]},
    {'50on':'ななおし',name:'七尾市',url:'https://t.tilemap.jp/jcp_maps/nanao/{z}/{x}/{y}.png',tms:true,bounds: [136.90164078074454, 37.09788232838679, 137.0370105286217, 37.0228343649801]},
    {'50on':'なおえつ',name:'直江津',url:'https://kenzkenz3.xsrv.jp/jcp_maps/naoetsu/{z}/{x}/{y}.png',tms:false,bounds: [138.20747979491517,37.20133085529935, 138.27912193297908,37.1554182778262]},
    {'50on':'にいがたし',name:'新潟市',url:'https://t.tilemap.jp/jcp_maps/niigata/{z}/{x}/{y}.png',tms:true,bounds: [138.99186708819562, 37.96788748388437, 139.0933551717966, 37.8983254944878]},
    {'50on':'にいはまし',name:'新居浜市',url:'https://t.tilemap.jp/jcp_maps/niihama/{z}/{x}/{y}.png',tms:true,bounds: [133.22255519907048, 34.00367828974015, 133.31210141758493, 33.92086221440381]},
    {'50on':'にっこうし',name:'日光市',url:'https://t.tilemap.jp/jcp_maps/nikko/{z}/{x}/{y}.png',tms:true,bounds: [139.48407988645982, 36.78855612641945, 139.64399721124124, 36.71216243946745]},
    {'50on':'のおがたし',name:'直方市',url:'https://t.tilemap.jp/jcp_maps/nogata/{z}/{x}/{y}.png',tms:true,bounds: [130.69598996782418, 33.77216740394658, 130.75809919977306, 33.71618955385571]},
    {'50on':'ぬまづし',name:'沼津市',url:'https://t.tilemap.jp/jcp_maps/numazu/{z}/{x}/{y}.png',tms:true,bounds: [138.8324112693624, 35.1277526279410, 138.89685871702, 35.06471308977173]},
    {'50on':'おおがきし',name:'大垣市',url:'https://t.tilemap.jp/jcp_maps/ogaki/{z}/{x}/{y}.png',tms:true,bounds: [136.55413836399077, 35.40195135119643, 136.66695408681392, 35.33227207940551]},
    {'50on':'おおいたし',name:'大分市',url:'https://t.tilemap.jp/jcp_maps/oita/{z}/{x}/{y}.png',tms:true,bounds: [131.55698081039802, 33.27340799027354, 131.65331704103366, 33.203760920003575]},
    {'50on':'おかやまし',name:'岡山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/okayama/{z}/{x}/{y}.png',tms:false,bounds: [133.87770654276844,34.708880685750856, 133.97912757114406,34.6163776195384]},
    {'50on':'おけがわし',name:'桶川市',url:'https://t.tilemap.jp/jcp_maps/okegawa/{z}/{x}/{y}.png',tms:true,bounds: [139.52177323905948, 36.0269588999937, 139.6205921455574, 35.95245423653812]},
    {'50on':'おおみなと',name:'大湊',url:'https://kenzkenz3.xsrv.jp/jcp_maps/ominato/{z}/{x}/{y}.png',tms:false,bounds: [141.10173496456386, 41.30304157411669, 141.22543978543519, 41.20456356172045]},
    {'50on':'おおむらし',name:'大村市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/omura/{z}/{x}/{y}.png',tms:false,bounds: [129.89270322251053, 32.95816906007779, 129.98746633755894, 32.8826256032659]},
    {'50on':'おおむたし',name:'大牟田市',url:'https://t.tilemap.jp/jcp_maps/omuta/{z}/{x}/{y}.png',tms:true,bounds: [130.37973611582464, 33.056731972736316, 130.48797531951612, 32.98711858353457]},
    {'50on':'さんようおのだし',name:'山陽小野田市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/onoda/{z}/{x}/{y}.png',tms:false,bounds: [131.13791842343807,34.01405470527139, 131.20457467021942,33.944588710860714]},
    {'50on':'おたるし',name:'小樽市',url:'https://t.tilemap.jp/jcp_maps/otaru/{z}/{x}/{y}.png',tms:true,bounds: [140.95003125711892, 43.2498339236171, 141.06840585812543, 43.1510898825083]},
    {'50on':'おおつし',name:'大津市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/otsu/{z}/{x}/{y}.png',tms:false,bounds: [135.8276778607642,35.04236537027731, 135.9406216590678,34.950260003281315]},
    {'50on':'るもいし',name:'留萌市',url:'https://t.tilemap.jp/jcp_maps/rumoi/{z}/{x}/{y}.png',tms:true,bounds: [141.6042188327817, 43.98252204659977, 141.70030494742667, 43.90720818339608]},
    {'50on':'さえきし',name:'佐伯市',url:'https://t.tilemap.jp/jcp_maps/saeki/{z}/{x}/{y}.png',tms:true,bounds: [131.85777088174342, 32.99383225285267, 131.93490104102835, 32.90668177072595]},
    {'50on':'さかたし',name:'酒田市',url:'https://t.tilemap.jp/jcp_maps/sakata/{z}/{x}/{y}.png',tms:true,bounds: [139.79572723006245, 38.94697215540117, 139.86472236310482, 38.893991742680754]},
    {'50on':'さっぽろし',name:'札幌市',url:'https://t.tilemap.jp/jcp_maps/sapporo/{z}/{x}/{y}.png',tms:true,bounds: [141.2872269967413, 43.12652987403498, 141.4241048765094, 43.0095195482877]},
    {'50on':'させぼし',name:'佐世保市',url:'https://t.tilemap.jp/jcp_maps/sasebo/{z}/{x}/{y}.png',tms:true,bounds: [129.67363106960568, 33.21108635181264, 129.77110120410237, 33.10068154282844]},
    {'50on':'さつませんだいし',name:'薩摩川内市',url:'https://t.tilemap.jp/jcp_maps/satsuma_sendai/{z}/{x}/{y}.png',tms:true,bounds: [130.2660942035549, 31.84126574443949, 130.32700482335025, 31.789400580167452]},
    {'50on':'せんだいし',name:'仙台市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/sendai/{z}/{x}/{y}.png',tms:false,bounds: [140.82992065404846, 38.293472864168336, 140.9386044338842, 38.20103124986022]},
    {'50on':'しかま',name:'飾磨',url:'https://t.tilemap.jp/jcp_maps/shikama/{z}/{x}/{y}.png',tms:true,bounds: [134.57381908301352, 34.830801155046686, 134.69907891456126, 34.7487640772753]},
    {'50on':'しまばらし',name:'島原市',url:'https://t.tilemap.jp/jcp_maps/shimabara/{z}/{x}/{y}.png',tms:true,bounds: [130.33991189911603, 32.80562992452464, 130.40247509494066, 32.75341095906735]},
    {'50on':'しみずし',name:'清水市',url:'https://t.tilemap.jp/jcp_maps/shimizu/{z}/{x}/{y}.png',tms:true,bounds: [138.44154622744944, 35.05407685272354, 138.53987265717413, 34.97184831284642]},
    {'50on':'しものせきし',name:'下関市',url:'https://t.tilemap.jp/jcp_maps/shimonoseki_moji/{z}/{x}/{y}.png',tms:true,bounds: [130.86186034693543, 33.99364348447547, 130.99910898222745, 33.9010277531139]},
    {'50on':'すいたし',name:'吹田市',url:'https://t.tilemap.jp/jcp_maps/suita/{z}/{x}/{y}.png',tms:true,bounds: [135.46811271576692, 34.81241595216801, 135.58729734389593, 34.73599802051933]},
    {'50on':'たかだし',name:'高田市',url:'https://t.tilemap.jp/jcp_maps/takada/{z}/{x}/{y}.png',tms:true,bounds: [138.2140323701369, 37.14730687866512, 138.28622804908625, 37.08329203410612]},
    {'50on':'たかまつし',name:'高松市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/takamatsu/{z}/{x}/{y}.png',tms:false,bounds: [133.99545893909394,34.39269918414061, 134.11711991669594,34.301570982649295]},
    {'50on':'たかさごし',name:'高砂市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/takasago/{z}/{x}/{y}.png\'',tms:false,bounds: [134.74741530689215,34.79614117291294, 134.91089795800664,34.698735552479135]},
    {'50on':'たかさきし',name:'高崎市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/takasaki/{z}/{x}/{y}.png',tms:false,bounds: [138.97691229387246,36.35389563865152, 139.03623605175935,36.294564407602934]},
    {'50on':'とばし',name:'鳥羽市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toba/{z}/{x}/{y}.png',tms:false,bounds: [136.80242859001117,34.5282360211439, 136.8797379004474,34.4474052593944]},
    {'50on':'たまのし',name:'玉野市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tomano/{z}/{x}/{y}.png',tms:false,bounds: [133.8988852990205,34.519890070517164, 133.99005626564573,34.436591886068825]},
    {'50on':'とくしまし',name:'徳島市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tokushima/{z}/{x}/{y}.png',tms:false,bounds: [134.4936030594145,34.12235468581463, 134.61755866682876,34.02929803919676]},
    {'50on':'とくやま',name:'徳山',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tokuyama/{z}/{x}/{y}.png',tms:false,bounds: [131.74538715278192,34.08462384762474, 131.84149338399453,33.99426773843973]},
    {'50on':'とっとりし',name:'鳥取市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tottori/{z}/{x}/{y}.png',tms:false,bounds: [134.1900909428445,35.52696479360749, 134.28330172942555,35.46730267834758]},
    {'50on':'とやまし',name:'富山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyama/{z}/{x}/{y}.png',tms:false,bounds:[137.1684165214623,36.72884284984751, 137.25429548970115,36.66525139660453]},
    {'50on':'とよはしし１',name:'豊橋市(北)',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyohashi_north/{z}/{x}/{y}.png',tms:false,bounds: [137.30419119783116,34.79819174398203, 137.4371489692516,34.699863481299786]},
    {'50on':'とよはしし２',name:'豊橋市(南)',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyohashi_south/{z}/{x}/{y}.png',tms:false,bounds: [137.3040570873804,34.77214256985337, 137.4375519711561,34.67231637720508]},
    {'50on':'とよかわし',name:'豊川市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyokawa/{z}/{x}/{y}.png',tms:false,bounds: [137.3300625528809,34.87697931243254, 137.4370303894993,34.78739376103327]},
    {'50on':'つちざき',name:'土崎',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tsuchizaki/{z}/{x}/{y}.png',tms:false,bounds: [140.0322280044941,39.77748578452113, 140.10570276186743,39.73013139828953]},
    {'50on':'つるがし',name:'敦賀市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tsuruga/{z}/{x}/{y}.png',tms:false,bounds: [136.02015594007466,35.67725529086043, 136.1043337172458,35.61019094654843]},
    {'50on':'つやまし',name:'津山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tsuyama/{z}/{x}/{y}.png',tms:false,bounds: [133.9546515527164,35.093894098921695, 134.05467984406104,35.028394837132595]},
    {'50on':'うべし',name:'宇部市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/ube/{z}/{x}/{y}.png',tms:false,bounds: [131.21090737917757,33.985496410975, 131.27556202748153,33.91514344585086]},
    {'50on':'うおつし',name:'魚津市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/uotsu/{z}/{x}/{y}.png',tms:false,bounds: [137.359654715174,36.84154335048109, 137.4231533313926,36.78819929793053]},
    {'50on':'うつのみやし',name:'宇都宮市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/utsunomiya/{z}/{x}/{y}.png',tms:false,bounds: [139.80726931534997,36.60692094994177, 139.94236346625078,36.51922096392269]},
    {'50on':'あいづわかまつし',name:'会津若松市',url:'https://t.tilemap.jp/jcp_maps/wakamatsu/{z}/{x}/{y}.png',tms:true,bounds: [139.89971460019447, 37.5246569332612, 139.9580861738811, 37.4662552780602]},
    {'50on':'わかやまし',name:'和歌山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/wakayama/{z}/{x}/{y}.png',tms:false,bounds: [135.10168442914156,34.278745841537926, 135.2230356116023,34.16603880752899]},
    {'50on':'やまがたし',name:'山形市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yamagata/{z}/{x}/{y}.png',tms:false,bounds: [140.31046887145618,38.2869380235048, 140.37764680789093,38.223610501260254]},
    {'50on':'やまぐちし',name:'山口市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yamaguchi/{z}/{x}/{y}.png',tms:false,bounds: [131.44143730059048,34.20638353543529, 131.50447591796302,34.15296649850379]},
    {'50on':'やはた',name:'八幡',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yawata/{z}/{x}/{y}.png',tms:false,bounds: [130.7352353711359,33.93668107746137, 130.8548940797083,33.848555614389184]},
    {'50on':'やつしろし',name:'八代市',url:'https://t.tilemap.jp/jcp_maps/yatsushiro/{z}/{x}/{y}.png',tms:true,bounds: [130.56782128418257, 32.52529691909547, 130.64291911328604, 32.4722538224630]},
    {'50on':'よっかいち',name:'四日市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yokkaichi/{z}/{x}/{y}.png',tms:false,bounds: [136.5812700596467,34.997838813507684, 136.66969176203165,34.92287302729859]},
    {'50on':'よなごし',name:'米子市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yonago/{z}/{x}/{y}.png',tms:false,bounds: [133.28164837924874,35.480611440807465, 133.3806044575397,35.397899772912595]},
    {'50on':'ぜんつじし',name:'善通寺市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/zentsuji/{z}/{x}/{y}.png',tms:false,bounds: [133.74462727940428,34.25811177699647, 133.81558511889327,34.199615898483586]},
    {'50on':'たかなべちょう',name:'高鍋町',url:'https://t.tilemap.jp/jcp_maps/takanabe/{z}/{x}/{y}.png',tms:true,bounds: [131.49437198658654, 32.14926230220921, 131.55480667761816, 32.097161098583]},
    {'50on':'ん01',name:'高岡',url:'https://t.tilemap.jp/jcp_maps/takaoka/{z}/{x}/{y}.png',tms:true,bounds: [136.95122553245773, 36.78462123872494, 137.07285137091316, 36.72027436365445]},
    {'50on':'ん02',name:'大宮',url:'https://kenzkenz3.xsrv.jp/jcp_maps/omiya/{z}/{x}/{y}.png',tms:false,bounds: [139.58288807604737, 35.936471778972816, 139.68984384272522, 35.82067028475796]},
    {'50on':'ん03',name:'板橋区',url:'https://kenzkenz3.xsrv.jp/jcp_maps/itabashi/{z}/{x}/{y}.png',tms:false,bounds: [139.55659942810058, 35.84279388096407, 139.6851201552582, 35.74376046340615]},
    {'50on':'ん04',name:'川口市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kawaguchi/{z}/{x}/{y}.png',tms:false,bounds: [139.67232242769714, 35.8422159012266, 139.8030720705461, 35.74493041694202]},
    {'50on':'ん05',name:'松戸市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/matsudo/{z}/{x}/{y}.png',tms:false,bounds: [139.787265544735, 35.84270580004852, 139.92278817852593, 35.74447067756418]},
    {'50on':'ん06',name:'立川市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tachikawa/{z}/{x}/{y}.png',tms:false,bounds: [139.3257750300442, 35.7677794416578, 139.45130978801595, 35.66939179444587]},
    {'50on':'ん07',name:'田無',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tanashi/{z}/{x}/{y}.png',tms:false,bounds: [139.4374114036049, 35.768251043426986, 139.57501073772565, 35.6676261138138]},
    {'50on':'ん08',name:'中野区',url:'https://kenzkenz3.xsrv.jp/jcp_maps/nakano/{z}/{x}/{y}.png',tms:false,bounds: [139.55876057440844, 35.766645453219354, 139.6859080105504, 35.66883929724342]},
    {'50on':'ん09',name:'小石川',url:'https://kenzkenz3.xsrv.jp/jcp_maps/koishikawa/{z}/{x}/{y}.png',tms:false,bounds: [139.67579968662739, 35.7659536404624, 139.8011419961023, 35.67149249224876]},
    {'50on':'ん10',name:'本所',url:'https://kenzkenz3.xsrv.jp/jcp_maps/honjo/{z}/{x}/{y}.png',tms:false,bounds: [139.78699439491749, 35.76692444138439, 139.92178432779318, 35.66956521078299]},
    {'50on':'ん11',name:'調布',url:'https://kenzkenz3.xsrv.jp/jcp_maps/chofu/{z}/{x}/{y}.png',tms:false,bounds: [139.43793800309393, 35.69264409802105, 139.5735330565283, 35.5942285900592]},
    {'50on':'ん12',name:'世田谷区',url:'https://kenzkenz3.xsrv.jp/jcp_maps/setagaya/{z}/{x}/{y}.png',tms:false,bounds: [139.55750953987325, 35.69020645502415, 139.68686778679574, 35.59558138323757]},
    {'50on':'ん13',name:'日本橋',url:'https://kenzkenz3.xsrv.jp/jcp_maps/nihonbashi/{z}/{x}/{y}.png',tms:false,bounds: [139.67133578494247, 35.691982412751216, 139.8057094274467, 35.59480793294374]},
    {'50on':'ん14',name:'砂町',url:'https://kenzkenz3.xsrv.jp/jcp_maps/sunamachi/{z}/{x}/{y}.png',tms:false,bounds: [139.7912620438637, 35.6927029142241, 139.9203983379902, 35.595771132326846]},
    {'50on':'ん15',name:'田園調布',url:'https://kenzkenz3.xsrv.jp/jcp_maps/denen/{z}/{x}/{y}.png',tms:false,bounds: [139.5552674729985, 35.61684183769074, 139.68731262280164, 35.520543926413254]},
    {'50on':'ん16',name:'大森',url:'https://kenzkenz3.xsrv.jp/jcp_maps/omori/{z}/{x}/{y}.png',tms:false,bounds: [139.67116572453156, 35.61793041851628, 139.80602518214357, 35.53127408650961]},
    {'50on':'ん17',name:'川崎',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kawasaki/{z}/{x}/{y}.png',tms:false,bounds: [139.67419982036674, 35.54299845717924, 139.80459004720768, 35.4553511140454]},
    {'50on':'ん18',name:'横浜市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yokohama/{z}/{x}/{y}.png',tms:false,bounds: [139.55378204664274, 35.466367420903566, 139.689263106194, 35.37842491230309]},
    {'50on':'ん19',name:'根岸湾',url:'https://kenzkenz3.xsrv.jp/jcp_maps/negishi/{z}/{x}/{y}.png',tms:false,bounds: [139.56020459612833, 35.4006437745536, 139.68445926984774, 35.30432787941882]},
    {'50on':'ん20',name:'横須賀市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yokosuka/{z}/{x}/{y}.png',tms:false,bounds: [139.60289262315248, 35.342237358161995, 139.72813703199841, 35.24850065660095]},
    {'50on':'ん21',name:'浦賀',url:'https://kenzkenz3.xsrv.jp/jcp_maps/uraga/{z}/{x}/{y}.png',tms:false,bounds: [139.65567449304083, 35.29220632171602, 139.75966105433923, 35.179361639527656]},
]
// position を計算して追加する
urls = urls.map(item => {
    let [minLon, minLat, maxLon, maxLat] = item.bounds;
    return {
        ...item,
        position: [(minLon + maxLon) / 2, (minLat + maxLat) / 2]
    };
});
// console.log(urls);
urls.sort((a, b) => {
    const aValue = a['50on'] || '';
    const bValue = b['50on'] || '';
    return aValue.localeCompare(bValue, 'ja');
});
const amsSources = []
const amsLayers = []
const amsGeojsonSources = []
const amsGeojsonLayers = []
const amsGeojsonLabelLayers = []
urls.forEach(url => {
    function compareFunc(a, b) {
        return a - b;
    }
    url.bounds.sort(compareFunc);
    url.bounds = [url.bounds[2],url.bounds[0],url.bounds[3],url.bounds[1]]
    if (!url.tms) {
        amsSources.push({
            id: 'oh-ams-' + url.name,
            obj:{
                type: 'raster',
                tiles: [url.url],
                minzoom: 0,
                bounds: url.bounds,
            }
        })
    } else {
        amsSources.push({
            id: 'oh-ams-' + url.name,
            obj:{
                type: 'raster',
                tiles: [url.url],
                scheme: 'tms',
                minzoom: 0,
                bounds: url.bounds,
            }
        })
    }
    amsLayers.push({
        id: 'oh-' + url.name,
        source: 'oh-ams-' + url.name,
        type: 'raster',
        position: url.position,
    })

    const geojson = turf.point(url.position, {name: url.name});

    amsGeojsonSources.push({
        id: 'oh-ams-geojson-' + url.name,
        obj: {
            type: 'geojson',
            data: geojson
        }
    })
    amsGeojsonLayers.push({
        id: 'oh-ams-geojson-' + url.name,
        type: "circle",
        source: 'oh-ams-geojson-' + url.name,
        'paint': {
            'circle-color': 'red',
            'circle-radius': [
                'interpolate', // Zoom-based interpolation
                ['linear'],
                ['zoom'], // Use the zoom level as the input
                10, 8,
                12, 0
            ]
        }
    })
    amsGeojsonLabelLayers.push({
        id: 'oh-ams-geojson-label-' + url.name,
        type: "symbol",
        source: 'oh-ams-geojson-' + url.name,
        layout: {
            'text-field': ['get', 'name'],
            'text-offset': [0, 1],
        },
        paint: {
            'text-color': 'rgba(255, 0, 0, 1)',
            'text-halo-color': 'rgba(255,255,255,1)',
            'text-halo-width': 1.0,
        },
        minzoom: 6,
        maxzoom: 12
    })
})
const amsLayers2 = amsLayers.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.id.replace('oh-','') + '戦後米軍地図',
        sources: [amsSources[i],amsGeojsonSources[i]],
        layers:[layer,amsGeojsonLayers[i],amsGeojsonLabelLayers[i]],
        position: layer.position,
        flyZoom: 13,
    }
})

// 江戸切絵図-----------------------------------------------------------------------------------------------------------
// https://mapwarper.h-gis.jp/maps/tile/4915/{z}/{x}/{y}.png
const kirieurls =[
    {name:'麻布絵図',url:'4915'},
    {name:'御江戸大名小路絵図',url:'4709'},
    {name:'築地八町堀日本橋南絵図',url:'4901'},
    {name:'外桜田永田町絵図',url:'4910'},
    {name:'芝高輪辺絵図（挿入図）',url:'4986'},
    {name:'芝高輪辺絵図',url:'4908'},
    {name:'東都小石川繪圖',url:'4942'},
    {name:'目黒白金辺図',url:'4939'},
    {name:'今戸箕輪浅草絵図',url:'4935'},
    {name:'駒込絵図',url:'4937'},
    {name:'巣鴨絵図',url:'4938'},
    {name:'根岸谷中辺絵図',url:'4941'},
    {name:'隅田川向島絵図',url:'4940'},
    {name:'本郷湯島絵図',url:'4934'},
    {name:'音羽絵図',url:'4933'},
    {name:'青山渋谷絵図',url:'4932'},
    {name:'浅草御蔵前辺図',url:'4931'},
    {name:'本所絵図',url:'4930'},
    {name:'小日向絵図',url:'4929'},
    {name:'深川絵図',url:'4928'},
    {name:'下谷絵図',url:'4919'},
    {name:'内藤新宿千駄ヶ谷絵図',url:'4918'},
    {name:'大久保絵図',url:'4917'},
    {name:'市ヶ谷牛込絵図',url:'4916'},
    {name:'赤坂絵図',url:'4913'},
    {name:'御江戸番町絵図',url:'4914'},
    {name:'四ツ谷絵図',url:'4911'},
    {name:'日本橋北神田浜町絵図',url:'4902'},
    {name:'駿河台小川町絵図',url:'4909'},
    {name:'芝愛宕下絵図',url:'4907'},
    {name:'今戸箕輪浅草絵図',url:'3899'},
]
const kirieSources = []
const kirieLayers = []
kirieurls.forEach(url => {
    kirieSources.push({
        id: 'oh-kirie-' + url.name,
        obj:{
            type: 'raster',
            tiles: ['https://mapwarper.h-gis.jp/maps/tile/' + url.url + '/{z}/{x}/{y}.png'],
            minzoom: 0,
        }
    })
    kirieLayers.push({
        url: url.url,
        id: 'oh-kirie-' + url.name,
        source: 'oh-kirie-' + url.name,
        type: 'raster',
    })
})
const kirieLayers2 = kirieLayers.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.id.replace('oh-kirie-','') + '',
        source: kirieSources[i],
        layers:[layer],
        attribution: '<a href="http://codh.rois.ac.jp/edo-maps/owariya/" target="_blank">人文学オープンデータ共同利用センター</a>' +
            '<br><br><a href="https://mapwarper.h-gis.jp/maps/' + layer.url + '" target="_blank">日本版Map Warper</a>'
    }
})
console.log(kirieLayers2)
// 兵庫県以外遺跡立体図-----------------------------------------------------------------------------------------------------------
const isekiurls2 =[
 {name:'横地城跡（静岡県菊川市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/yokochi-tile', position:[133.9494864960191,34.72801130848333],bounds:[34.725992296143794, 133.9529354877004, 34.73003032082288, 133.9460375043378]},
]
const isekiSources2 = []
const isekiLayers22 = []
isekiurls2.forEach(url => {
    function compareFunc(a, b) {
        return a - b;
    }
    url.bounds.sort(compareFunc);
    url.bounds = [url.bounds[2],url.bounds[0],url.bounds[3],url.bounds[1]]
    isekiSources2.push({
        id: 'oh-iseki-' + url.name,
        obj:{
            type: 'raster',
            tiles: [url.url + '/{z}/{x}/{y}.png'],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 20,
            bounds: url.bounds,
        }
    })
    isekiLayers22.push({
        url: url.url,
        id: 'oh-iseki-' + url.name,
        source: 'oh-iseki-' + url.name,
        position: url.position,
        type: 'raster',
    })
})
const isekiLayers222 = isekiLayers22.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.id.replace('oh-iseki-','') + '',
        source: isekiSources2[i],
        layers:[layer],
        position: layer.position,
        flyZoom: 17,
        attribution: '<a href="" target="_blank"></a>'
    }
})
// 遺跡立体図-----------------------------------------------------------------------------------------------------------
const isekiurls =[
    {name:'摩耶山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/mayasanjyou', position:[135.20985199593505, 34.72741190512792],bounds:[135.20105045211955,34.73279014407757,135.21883391747724,34.722107316142726]},
    {name:'滝山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/takiyamajyou', position:[135.1897115742397, 34.708324634323816],bounds:[135.1811636521441,34.71356094319536,135.1989171157232,34.70295673805569]},
    {name:'山下城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/yamashitajyou', position:[135.4093350403387, 34.900789307859384],bounds:[135.40595830756104,34.90297874530522,135.41291561094295,34.898833833523184]},
    {name:'有子山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/arikoyamajyou', position:[134.87834538212564, 35.45526548044384],bounds:[134.86921146149115,35.46161227722132,134.88782312819717,35.450662087068324]},
    {name:'八木城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/yagijyou', position:[134.71133629505152, 35.389083335934004],bounds:[134.70144039714773,35.39450401424877,134.72006291468165,35.38357515514262]},
    {name:'岩尾城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/iwaojyou', position:[134.97477380615132, 35.09959197988046],bounds:[134.97054375114186,35.10349471085739,134.97715122438717,35.09571185635595]},
    {name:'黒井城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/kuroijyou', position:[135.104463141811, 35.17901861202279],bounds:[135.09125485809108,35.186551363082145,135.11452796371236,35.17272942931801]},
    {name:'篠山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/sasayamajyou', position:[135.2176231845597, 35.07313601425689],bounds:[135.21067062750097,35.07723659438874,135.22457719282704,35.06895762382021]},
    {name:'八上城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/yakamijyou', position:[135.2552485425144, 35.06204731412491],bounds:[135.24767699390202,35.067020572658194,135.26391061635007,35.05735417422389]},
    {name:'洲本城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/sumotojyou', position:[134.90319944266878, 34.337478918073074],bounds:[134.89626883902872,34.34139875471037,134.90778467141337,34.334485389039344]},
    {name:'白巣城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/shirasujyou', position:[134.8259033029899, 34.38150414125458],bounds:[134.82013715493042,34.3853353447405,134.83166360685556,34.378462801992896]},
    {name:'由良古城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/yurakojyou', position:[134.9480666440312, 34.2959981627496],bounds:[134.9442422389984,34.29915852698697,134.9512267112732,34.29196133115981]},
    {name:'炬口城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/takenokuchijyou', position:[134.8898952135649, 34.35267276116555],bounds:[134.8877334397722,34.35487280694649,134.8968472599871,34.34943863860731]},
    {name:'竹田城・観音寺山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/takedajyou', position:[134.82901156539475, 35.30050695947483],bounds:[134.82715461493302,35.30456725526851,134.83369077542886,35.29689752045901]},
    {name:'有岡城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/ariokajyou', position:[135.42095254641023, 34.78123344214727],bounds:[135.4114554147389,34.78669658496949,135.42611879302478,34.771058180218404]},
    {name:'感状山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/kanjyousanjyou', position:[134.45129592319765, 34.88099338453634],bounds:[134.44783080193332,34.882416265679495,134.4548245213308,34.878333487443555]},
    {name:'鶏籠山城（龍野古城）',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/keirousanjyou', position:[134.54521904569506, 34.87164477770631],bounds:[134.5419758472067,34.87526787552183,134.5485310782828,34.86757240459204]},
    {name:'三木城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/mikijyou', position:[134.98743099511933, 34.79910988651466],bounds:[134.98231945734608,34.80123645077782,134.9962428841048,34.79304042076464]},
    {name:'篠の丸城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/sasanomarujyou', position:[134.53574276742006, 35.01356494052959],bounds:[134.5306233267566,35.016378648842476,134.5399937281045,35.010809782033775]},
    {name:'小谷城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/kodanijyou', position:[134.8319333497427, 34.945512107423895],bounds:[134.82939862060977,34.948400543391585,134.8343025174825,34.94266854256047]},
    {name:'上月城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/koudukijyou', position:[134.32357851200157, 34.97535169002647],bounds:[134.32030338353172,34.97778774733989,134.32729889143042,34.973688782383846]},
    {name:'城山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/kinoyamajyou', position:[134.52762221800918, 34.89462795246601],bounds:[134.52261448236823,34.90081639479682,134.5309124254295,34.8911684626696]},
    {name:'仁井山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/niisanjyou', position:[134.33284507693375, 34.9790563824087],bounds:[134.32827254655837,34.98215771605422,134.33763287275258,34.976615080071795]},
    {name:'赤穂城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/akoujyou', position:[134.3888453601225, 34.74598150175633],bounds:[134.38473699411367,34.751164323898266,134.3914859691194,34.743374620541005]},
    {name:'置塩城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/oshiojyou', position:[134.6830576345791, 34.92332845324563],bounds:[134.67459731119794,34.92625928854153,134.68621715261793,34.91940721541867]},
    {name:'中道子山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/tyuudoushisanjyou', position:[134.85475696735378, 34.83149611922066],bounds:[134.85120350915133,34.834983695995945,134.8578004701689,34.82725278455213]},
    {name:'播磨高倉山城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/takakurayamajyou', position:[134.355514070868, 34.978895498696204],bounds:[134.34926770508866,34.982082295662636,134.36098090425196,34.975282668782285]},
    {name:'白旗城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/shirohatajyou', position:[134.38063468592168, 34.90809762405915],bounds:[134.37166347576454,34.91289369844226,134.38810242288082,34.90326433635215]},
    {name:'姫路城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/himejijyou', position:[134.69313061573334, 34.83893632057601],bounds:[134.68979898141345,34.84258881669952,134.69640995169885,34.83491596939099]},
    {name:'明石城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/akashijyou', position:[134.9927713856956, 34.65286024595012],bounds:[134.9877140821119,34.65792140535697,134.9960404310877,34.64831907000149]},
    {name:'利神城',url:'https://kenzkenz3.xsrv.jp/hyougoiseki/rikanjyou', position:[134.37733576935972, 35.04615261130358],bounds:[134.36990790872557,35.049536077045985,134.38151009873025,35.04270684275602]},

    {name:'下土井城跡（相生市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/shimodoi-tile', position:[134.43595760697713,34.844884088076114],bounds:[34.84298829198103, 134.43920742120724, 34.846779884171205, 134.43270779274704]},
    {name:'柿の木谷城跡（南あわじ市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/kakinokidani-tile', position:[134.81087814227217,34.28864064255846],bounds:[34.28527158705211, 134.8165995048252, 34.29200969806482, 134.80515677971914]},
    {name:'金鑵城跡（小野市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/kanatsurube-tile', position:[134.90708402156795,34.878267704837505],bounds:[34.87683646219006, 134.909530334671, 34.87969894748495, 134.90463770846492]},
    {name:'光明山城痕（相生市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/komyosan-tile', position:[134.47002262773958,34.84724440558978],bounds:[34.84420930408064, 134.4752239654938, 34.85027950709892, 134.4648212899854]},
    {name:'恒屋城跡（姫路市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/tsuneya-tile', position:[134.71672996190716,34.947095856521244],bounds:[34.944050440586665, 134.72194647817182, 34.95014127245582, 134.71151344564248]},
    {name:'志知城跡（南あわじ市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/shichi-tile', position:[134.7455981609756,34.301430075912634],bounds:[34.29874517013217, 134.75016041727295, 34.3041149816931, 134.74103590467826]},
    {name:'生野城跡（朝来市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/ikuno-tile', position:[134.7998680812666,35.17147382765063],bounds:[35.168615394723496, 134.8047746977891, 35.17433226057776, 134.7949614647441]},
    {name:'石野氏館跡（三木市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/ishino-tile', position:[134.93306572481305,34.794430883865346],bounds:[34.792521788625066, 134.93632510066152, 34.79633997910562, 134.9298063489645]},
    {name:'端谷城跡（神戸市西区）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/hashitani-tile', position:[135.05132547119246,34.72790313341303],bounds:[34.726469036009995, 135.05376975799234, 34.729337230816064, 135.04888118439254]},
    {name:'段ノ城跡下段（築ヶ鼻城跡、多可町）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/dannoshiro-tile', position:[134.89669785467362,35.08019550651794],bounds:[35.078287216606235, 134.899967600773, 35.08210379642965, 134.8934281085742]},
    {name:'段ノ城跡上段（多可町）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/dannoshiroue-tile', position:[134.89957517736428,35.087081582754834],bounds:[35.08304986605937, 134.90305758574328, 35.0911132994503, 134.89609276898528]},
    {name:'池谷城跡（神戸市西区）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/iketani-tile', position:[135.02723227922036,34.70878200965534],bounds:[34.7073484770029, 135.02967566398198, 34.710215542307765, 135.0247888944587]},
    {name:'中の子城跡（南あわじ市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/nakanoko-tile', position:[134.80418245745335,34.25849369387224],bounds:[34.25647225428759, 134.80761405496435, 34.2605151334569, 134.80075085994238]},
    {name:'猪鼻城跡（洲本市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/inohana-tile', position:[134.87594815753798,34.30572928978148],bounds:[34.303031397066555, 134.88052845603355, 34.3084271824964, 134.8713678590424]},
    {name:'釣鐘尾城跡（香美町）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/tsuriganeo-tile', position:[134.62478465970315,35.619449661609295],bounds:[35.61773877165105, 134.62774155609276, 35.62116055156755, 134.62182776331358]},
    {name:'天神山城跡（加古川市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/tenjinyama-tile', position:[134.82501551796724,34.828073336839466],bounds:[34.82521424748591, 134.82990242798698, 34.83093242619302, 134.8201286079475]},
    {name:'福田城跡（神戸市西区）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/fukuda-tile', position:[135.04239448741896,34.71874514957057],bounds:[34.71731133503643, 135.04483850777535, 34.72017896410472, 135.03995046706257]},
    {name:'法界寺山ノ上付城・朝日ヶ丘土塁（三木市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/hokaiji-tile', position:[134.96605257482443,34.79175568733935],bounds:[34.78889091018418, 134.97094216259921, 34.794620464494514, 134.96116298704965]},
    {name:'堀井城跡・河合城跡・小堀城跡（小野市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/horii-tile', position:[134.9246964964473,34.88493901697369],bounds:[34.88064444131104, 134.93203706078467, 34.88923359263633, 134.91735593210993]},
    {name:'満久城跡（加西市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/maku-tile', position:[134.8802539292252,34.952348916121394],bounds:[34.95044136279089, 134.88351814514985, 34.954256469451906, 134.8769897133006]},
    {name:'湊城跡（南あわじ市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/minato-tile', position:[134.72839586225896,34.32611965009076],bounds:[34.324100498722835, 134.73182848649716, 34.32813880145868, 134.72496323802076]},
    {name:'門村構居（多可町）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/kadomura-tile', position:[134.91990599380097,35.126018348978484],bounds:[35.12363252506995, 134.9239960319977, 35.128404172887016, 134.91581595560422]},
    {name:'養宜館痕（南あわじ市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/yanagikata-tile', position:[134.79506796448158,34.305191677316365],bounds:[34.3022273288832, 134.8001032457949, 34.30815602574953, 134.79003268316828]},
    {name:'野村城跡（加古川市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/nomura-tile', position:[134.92389188024887,34.787648911997884],bounds:[34.78574019471035, 134.927150529112, 34.78955762928542, 134.92063323138575]},
    // {name:'',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/-tile', position:[,],bounds:[]},

    {name:'吉島古墳（たつの市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/yoshima-tile', position:[134.54688130043553,34.93555770118321],bounds:[34.93271362826281, 134.54932695739282, 34.9384017741036, 134.54443564347824]},
    {name:'玉丘古墳群（加西市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/tamaoka-tile', position:[134.8504914852914, 34.921500394087985],bounds:[34.919477654884005, 134.85395175056618, 34.92352313329196, 134.84703122001662]},
    {name:'五色塚（千壺）古墳・小壺古墳（神戸市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/gosikiduka-tile', position:[135.0454792120451, 34.62914336740906],bounds:[135.04053534197493,34.632079997356385, 135.0502499065675,34.62626646890381]},
    {name:'五斗長垣内遺跡（淡路市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/gossakaito-tile', position:[134.90880718822058,34.50434474517985],bounds:[34.49894678660786, 134.91799121828302, 34.50974270375183, 134.8996231581581]},
    {name:'山陽道野磨駅家（上郡町）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/sanyo-tile', position:[134.32640583497596,34.84832033262013],bounds:[34.8454805283103, 134.32884194702086, 34.85116013692998, 134.32396972293108]},
    {name:'舟木遺跡（淡路市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/funaki-tile', position:[134.9537192047685,34.54259466043517],bounds:[34.53498964199028, 134.9602463096072, 34.55019967888007, 134.94719209992985]},
    {name:'書写山圓教寺',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/syosya-tile', position:[134.65541545404145,34.892755659757974],bounds:[34.881371318662566, 134.6652083546048, 34.90414000085338, 134.6456225534781]},
    {name:'西条古墳群（加古川市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/saijyo-tile', position:[134.88559914036207,34.78296164187521],bounds:[34.777260308076904, 134.89050439085932, 34.78866297567352, 134.88069388986483]},
    {name:'石の宝殿及び竜山石採石遺跡（高砂市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/ishi-tile', position:[134.79265339372392,34.78044711870095],bounds:[34.77190021051588, 134.8000016945760, 34.78899402688601, 134.7853050928718]},
    {name:'多田院（川西市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/tadain-tile', position:[135.40334153530273,34.860861365416184],bounds:[34.855426632586166, 135.41259585052342, 34.866296098246195, 135.39408722008207]},
    {name:'多田銀銅山遺跡（猪名川町）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/tadagin-tile', position:[135.350519435385,34.900806255594716],bounds:[34.88746140289514, 135.36205541443198, 34.91415110829429, 135.338983456338]},
    {name:'大坂城石垣石丁場跡 東六甲石丁場跡（西宮市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/osakajyo-tile', position:[135.33905603802287 ,34.76983201591138],bounds:[135.33676493533846,34.77242443397971, 135.3411954120524,34.76741401412228]},
    {name:'壇場山古墳と播磨国分寺跡（姫路市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/danjyo-tile', position:[134.73310188683377,34.82141913842871],bounds:[34.81872667792709, 134.73770585972392, 34.82411159893032, 134.7284979139435]},
    {name:'丁瓢塚古墳（姫路市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/hisago-tile', position:[134.6000101473541,34.818145009745336],bounds:[34.816627691284644, 134.6013135835035, 34.81966232820603, 134.59870671120473]},
    {name:'衣笠城跡（三木市）',url:'https://kenzkenz4.xsrv.jp/tile/isekirittaizu/kinugasa-tile', position:[135.0428908139503,34.84621030969268],bounds:[34.84429819857235, 135.04615450920315, 34.848122420813006, 135.03962711869744]},
]
const isekiSources = []
const isekiLayers = []
const isekiGeojsonSources = []
const isekiGeojsonLayers = []
const isekiGeojsonLabelLayers = []
isekiurls.forEach(url => {
    function compareFunc(a, b) {
        return a - b;
    }

    url.bounds.sort(compareFunc);
    url.bounds = [url.bounds[2], url.bounds[0], url.bounds[3], url.bounds[1]]
    isekiSources.push({
        id: 'oh-iseki-' + url.name,
        obj: {
            type: 'raster',
            tiles: [url.url + '/{z}/{x}/{y}.png'],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 20,
            bounds: url.bounds,
        }
    })
    isekiLayers.push({
        id: 'oh-iseki-' + url.name,
        source: 'oh-iseki-' + url.name,
        position: url.position,
        type: 'raster',
    })

    const geojson = turf.point(url.position, {name: url.name});

    isekiGeojsonSources.push({
        id: 'oh-iseki-geojson-' + url.name,
        obj: {
            type: 'geojson',
            data: geojson
        }
    })
    isekiGeojsonLayers.push({
        id: 'oh-iseki-geojson-' + url.name,
        type: "circle",
        source: 'oh-iseki-geojson-' + url.name,
        'paint': {
            'circle-color': 'red',
            'circle-radius': [
                'interpolate', // Zoom-based interpolation
                ['linear'],
                ['zoom'], // Use the zoom level as the input
                10, 8,
                13, 0
            ]
        }
    })
    isekiGeojsonLabelLayers.push({
        id: 'oh-iseki-geojson-label-' + url.name,
        type: "symbol",
        source: 'oh-iseki-geojson-' + url.name,
        layout: {
            'text-field': ['get', 'name'],
            'text-font': ['NotoSansJP-Regular'],
            'text-offset': [0, 1],
        },
        paint: {
            'text-color': 'rgba(255, 0, 0, 1)',
            'text-halo-color': 'rgba(255,255,255,1)',
            'text-halo-width': 1.0,
        },
        minzoom: 6,
        maxzoom: 13
    })
})
const isekiLayersMarge = isekiLayers.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.id.replace('oh-iseki-','') + '',
        sources: [isekiSources[i],isekiGeojsonSources[i]],
        layers:[layer,isekiGeojsonLayers[i],isekiGeojsonLabelLayers[i]],
        position: layer.position,
        flyZoom: 17,
        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/2021-2022-hyogo-shiseki" target="_blank">兵庫県遺跡立体図</a>'
    }
})
// ---------------------------------------------------------------------------------------------------------------------
// 市町村地番図
export const sicyosonChibanzuUrls = [
    // 北海道
    {prefname:'北海道', prefcode:'01', code:'01205', name:'室蘭市', chiban: ['get', '地番'], bbox:[140.932617, 42.281818, 141.051931, 42.394547], position:[140.99286678768675,42.36472347973418], url:'muroranshi', page:'https://murorancity-opendata-muroran.hub.arcgis.com/datasets/f5a188ea9ae94d7abd68983eb351aeff/explore?layer=3&location=42.368631%2C140.979326%2C12.64'},
    {prefname:'北海道', prefcode:'01', code:'01234', name:'北広島市', chiban: ['concat', ['get', 'Chiban'], '-', ['get', 'Edaban']], bbox:[141.442421, 42.903004, 141.602161, 43.003404], position:[141.56311494973653,42.98537981878215], url:'kitahiroshimashi2', page:'https://www.harp.lg.jp/opendata/dataset/2061.html'},
    {prefname:'北海道', prefcode:'01', code:'01204', name:'旭川市', chiban: ['get', 'TXTCD'], bbox:[142.213058, 43.568596, 142.586277, 43.925816], position:[142.36538083068262,43.77140401060319], url:'asahikawashi', page:'https://www.city.asahikawa.hokkaido.jp/kurashi/112/113/116/d080184.html'},
    {prefname:'北海道', prefcode:'01', code:'01395', name:'ニセコ町', chiban: ['get', '地番'], bbox:[140.626111, 42.738333, 140.841667, 42.911111], position:[140.68806409835815,42.80495731522012], url:'nisekocyo', page:'https://www.harp.lg.jp/opendata/dataset/1750.html'},
    {prefname:'北海道', prefcode:'01', code:'01631', name:'音更町', chiban: ['get', 'chiban'], bbox:[143.050000, 42.850000, 143.350000, 43.050000], position:[143.19816291534738,42.99393583189044], url:'otohukechyo', page:'https://www.harp.lg.jp/opendata/dataset/2035.html'},
    // 宮城県
    {prefname:'宮城県', prefcode:'04', code:'04100', name:'仙台市', chiban: ['get', 'DNO'], bbox:[140.702500, 38.144722, 140.999444, 38.412222], position:[140.86946408465997,38.26816199999661], url:'sendaishi', page:'https://www.geospatial.jp/ckan/dataset/chibanzu'},
    // 秋田県
    {prefname:'秋田県', prefcode:'05', code:'05209', name:'鹿角市', chiban: ['get', '地番'], bbox:[140.626111, 40.109167, 140.841667, 40.215778], position:[140.7886727460321,40.21559737412008], url:'kazunoshi', page:'https://www.city.kazuno.lg.jp/soshiki/somu/digital/gyomu/opendata/9788.html'},
    // 山形県
    {prefname:'山形県', prefcode:'06', code:'06363', name:'舟形町', chiban: ['get', 'TIBAN'], bbox:[140.1875, 38.6375, 140.3875, 38.7875], position:[140.32022099999745,38.691255021073715], url: 'funagatamachi', page:'https://www.town.funagata.yamagata.jp/s012/opendata/010/010/20230711101613.html'},
    // 福島県
    {prefname:'福島県', prefcode:'07', code:'07201', name:'福島市', chiban: ['get', 'TXTCD'], bbox:[140.3801617, 37.699613, 140.469673, 37.7430938], position:[140.47460922099737,37.76082999999447], url:'fukushimashi2', page:'https://www.city.fukushima.fukushima.jp/d-kikaku/shise/opendate/machidukuri.html'},
    // 茨城県
    {prefname:'茨城県', prefcode:'08', code:'08223', name:'潮来市', chiban: ['get', '地番'], bbox:[140.500000, 35.900000, 140.600000, 36.000000], position:[140.55540531603634,35.947116226224], url: 'itakoshi', page:'https://www.city.itako.lg.jp/opendata.php'},
    {prefname:'茨城県', prefcode:'08', code:'08564', name:'利根町', chiban: ['get', '地番'], bbox:[140.100000, 35.850000, 140.200000, 35.950000], position:[140.1391729153425,35.85756030920088], url: 'tonechyo', page:'https://www.town.tone.ibaraki.jp/opendata.php'},
    // 群馬県
    {prefname:'群馬県', prefcode:'10', code:'10202', name:'高崎市', chiban: ['get', '地番_地番図_label'], bbox:[138.816667, 36.183333, 139.116667, 36.416667], position:[139.00336683069094,36.32182569208747], url:'takasakishi', page:'https://www.city.takasaki.gunma.jp/page/3130.html'},
    // 埼玉県
    {prefname:'埼玉県', prefcode:'11', code:'11222', name:'越谷市', chiban: ['concat', ['get', '本番'], '-', ['get', '枝番']], bbox:[139.750000, 35.850000, 139.850000, 35.950000], position:[139.79105245767255,35.890609232668695], url:'koshigayashi', page:'https://www.city.koshigaya.saitama.jp/kurashi_shisei/kurashi/zeikin/koteisisan_tosikeikaku/tibanzu_opendate.html'},
    {prefname:'埼玉県', prefcode:'11', code:'11218', name:'深谷市', chiban: ['concat', ['get', '本番'], '-', ['get', '枝番']], bbox:[138.983333, 36.100000, 139.250000, 36.283333], position:[139.281707999998,36.197104580699204], url:'fukayashi', page:'https://opendata.pref.saitama.lg.jp/resources/6204'},
    // 東京都
    {prefname:'東京都', prefcode:'13', code:'13209', name:'町田市', chiban: ['get', 'CHIBAN'], bbox:[139.266667, 35.500000, 139.516667, 35.616667], position:[139.4387823343277,35.546591812173475], url:'machidashi', page:'https://www.city.machida.tokyo.jp/shisei/opendata/chizujoho/chisekizu.html'},
    {prefname:'東京都', prefcode:'13', code:'13211', name:'小平市', chiban: ['get', '表示地番'], bbox:[139.450000, 35.710000, 139.520000, 35.750000], position:[139.47753045767575,35.728369484747276], url:'kodairashi', page:'https://www.city.kodaira.tokyo.jp/kurashi/111/111978.html'},
    {prefname:'東京都', prefcode:'13', code:'13213', name:'東村山市', chiban: ['get', 'TXTCD'], bbox:[139.440000, 35.740000, 139.500000, 35.780000], position:[139.4687322037018,35.75465000000037], url:'higashimurayamashi', page:'https://catalog.data.metro.tokyo.lg.jp/dataset/t132136d0000000005'},
    {prefname:'東京都', prefcode:'13', code:'13215', name:'国立市', chiban: ['get', '表示文字列'], bbox:[139.420000, 35.670000, 139.460000, 35.710000], position:[139.44141245767452,35.68379371055923], url:'kunitachishi3', page:'https://www.city.kunitachi.tokyo.jp/soshiki/Dept01/Div03/Sec01/oshirase/11883.html'},
    // 山梨県
    {prefname:'山梨県', prefcode:'19', code:'19201', name:'甲府市', chiban: ['get', '地番'], bbox:[138.500000, 35.600000, 138.650000, 35.700000], position:[138.56829800000241,35.66205666308586], url:'kofushi', page:'https://kofu.geocloud.jp/webgis/?p=0&bt=0&mp=337-1&'},
    // 静岡県
    {prefname:'静岡県', prefcode:'22', code:'22100', name:'静岡市', chiban: ['get', '地番'], bbox:[138.08306, 34.89861, 138.63944, 35.64583], position:[138.38294267724638,34.974974010631584], url:'shizuokashi', page:'https://dataset.city.shizuoka.jp/dataset/1707986930/resource/4a40cc33-0aef-4426-825e-3b034347812b'},
    {prefname:'静岡県', prefcode:'22', code:'22211', name:'磐田市', chiban: ['get', 'TXTCD'], bbox:[137.800000, 34.650000, 137.950000, 34.800000], position:[137.85162388532535,34.7178716931619], url:'iwatashi', page:'https://www.city.iwata.shizuoka.jp/shiseijouhou/1006207/1002775.html'},
    // 愛知県
    {prefname:'愛知県', prefcode:'23', code:'23100', name:'名古屋市', chiban: ['get', 'TXTCD'], bbox:[136.800000, 35.000000, 137.050000, 35.300000], position:[136.9066772883615,35.1812626194769], url:'nagoyashi', page:'https://data.bodik.jp/dataset/231002_0703030000_chibansankouzu'},
    {prefname:'愛知県', prefcode:'23', code:'23205', name:'半田市', chiban: ['concat', ['get', '番地'], '-', ['get', '枝番'], '-', ['get', '小枝']], bbox:[136.900000, 34.850000, 137.050000, 35.000000], position:[136.93819204686196,34.891670467553226], url:'handashi', page:'https://www.city.handa.lg.jp/opendata/1005557/1005561/1004329.html'},
    // 京都府
    {prefname:'京都府', prefcode:'26', code:'26100', name:'京都市', chiban: ['get', 'TIBAN'], bbox:[135.550000, 34.866667, 135.866667, 35.316667], position:[135.76794033862097,35.011458104660534], url:'kyotoshi', page:'https://data.city.kyoto.lg.jp/resource/?id=18537'},
    {prefname:'京都府', prefcode:'26', code:'26207', name:'城陽市', chiban: ['get', 'chiban'], bbox:[135.74946, 34.82160, 135.84821, 34.87000], position:[135.7800419153457,34.85309321719859], url:'jyoyoshi', page:'https://data.bodik.jp/dataset/262072_koteishisanzeichibanzu/resource/8f5c8de3-f574-45b4-9291-3791ffa41407'},
    {prefname:'京都府', prefcode:'26', code:'26209', name:'長岡京市', chiban: ['get', '表示文字列'], bbox:[135.6806947, 34.921000, 135.710000, 34.940000], position:[135.69535828836183,34.926424814234565], url:'nagaokakyoshi', page:'https://www.city.nagaokakyo.lg.jp/0000012991.html'},
    {prefname:'京都府', prefcode:'26', code:'26303', name:'大山崎町', chiban: ['get', '所在'], bbox:[135.650000, 34.880000, 135.700000, 34.930000], position:[135.68867837302201,34.902743804081595], url:'oyamasakichyo', page:'https://www.town.oyamazaki.kyoto.jp/annai/zeijyuminka/zeimukakari/chozei/koteisisanzei/5857.html'},
    // 大阪府
    {prefname:'大阪府', prefcode:'27', code:'27202', name:'岸和田市', chiban: ['get', 'CHIBAN'], bbox:[135.340000, 34.430000, 135.460000, 34.540000], position:[135.37090737539307,34.46054514396512], url:'kishiwadashi', page:'https://www.city.kishiwada.osaka.jp/soshiki/16/tochi-chibankrnnsakuichiranhyou.html'},
    {prefname:'大阪府', prefcode:'27', code:'27228', name:'泉南市', chiban: ['get', '表示文字列'], bbox:[135.160000, 34.330000, 135.250000, 34.400000], position:[135.2734460647299,34.36591222577401], url:'sennanshi', page:'https://www.city.sennan.lg.jp/kakuka/soumu/zeimuka/kazeikakari/zeikin/koteishisan/1505179465186.html'},
    {prefname:'大阪府', prefcode:'27', code:'27203', name:'豊中市', chiban: ['get', 'TEXTCODE1'], bbox:[135.420000, 34.750000, 135.520000, 34.820000], position:[135.4697598501699,34.78130126564767], url:'toyonakashi', page:'https://data.bodik.jp/dataset/272035_chibansanko/resource/c5858297-c312-489f-b244-885074c70daa'},
    // 兵庫県
    // {prefname:'', prefcode:'', code:'28201, name:'姫路市', chiban: ['get', 'TXTCD'], position:[134.68545471163947,34.815118449686565], url:'himejishi', page:''},
    // {prefname:'兵庫県', prefcode:'28', code:'28204', name:'西宮市', chiban: ['get', 'TXTCD'], position:[135.34190737301537,34.73766946698089], url:'nishinomiyashi', page:'https://opendata.nishi.or.jp/opendata/ResultDetail.php?id=69'},
    {prefname:'兵庫県', prefcode:'28', code:'28207', name:'伊丹市', chiban: ['get', '所在地番'], bbox:[135.350000, 34.750000, 135.460000, 34.820000], position:[135.40037589806093,34.784457867420755], url:'itamishi', page:'https://www.geospatial.jp/ckan/dataset/202401/resource/ec8eb484-66e4-40a7-bf05-248476b0d61d'},
    {prefname:'兵庫県', prefcode:'28', code:'28210', name:'加古川市', chiban: ['get', 'TXTCODE1'], bbox:[134.800000, 34.700000, 134.950000, 34.850000], position:[134.84064926983825,34.75678296665963], url:'kakogawashi', page:'https://opendata-api-kakogawa.jp/ckan/dataset/landhouse/resource/c37f9b63-54c8-4094-9e48-8d3817918476'},
    {prefname:'兵庫県', prefcode:'28', code:'28217', name:'川西市', chiban: ['get', '地番'], bbox:[135.350000, 34.800000, 135.500000, 34.950000], position:[135.4173282883612,34.82989631871767], url:'kawanishishi', page:'https://www.city.kawanishi.hyogo.jp/opendata/1017548/1009883/1016648.html'},
    {prefname:'兵庫県', prefcode:'28', code:'28501', name:'佐用町', chiban: ['get', 'CHIBAN'], bbox:[134.300000, 34.950000, 134.500000, 35.150000], position:[134.35598183068578,35.004205695261106], url:'sayochyo', page:'https://www.town.sayo.lg.jp/cms-sypher/www/service/detail.jsp?id=9343'},
    // 奈良県
    {prefname:'奈良県', prefcode:'29', code:'29201', name:'奈良市', chiban: ['concat', ['get', '地番本番'], '-', ['get', '地番枝番'], '-', ['get', '地番小枝']], bbox:[135.700000, 34.600000, 135.950000, 34.800000], position:[135.80463216931253,34.684824554866864], url:'narashi2', page:'https://www.city.nara.lg.jp/soshiki/14/104605.html'},
    {prefname:'奈良県', prefcode:'29', code:'29210', name:'香芝市', chiban: ['get', '地番名称'], bbox:[135.650000, 34.510000, 135.730000, 34.570000], position:[135.69894062698785,34.5410982491169], url:'kashibashi', page:'https://www.city.kashiba.lg.jp/soshiki/5/31946.html'},
    // 岡山県
    {prefname:'岡山県', prefcode:'33', code:'33643', name:'西粟倉村', chiban: ['get', 'TIBAN'], bbox:[134.300000, 35.100000, 134.500000, 35.250000], position:[134.33562862698358,35.171553518278486], url:'nishiawakuramura', page:'https://www.vill.nishiawakura.okayama.jp/open_data/others/index.html'},
    // 広島県
    {prefname:'広島県', prefcode:'34', code:'34207', name:'福山市', chiban: ['get', '地番'], bbox:[133.200000, 34.350000, 133.550000, 34.650000], position:[133.36252445767389,34.485761252632884], url:'fukuyamashi', page:'https://data.city.fukuyama.hiroshima.jp/dataset/digital_numbers_map/resource/93328fe8-64fb-4321-9964-84eab4f68fcd'},
    // 香川県
    {prefname:'香川県', prefcode:'37', code:'37203', name:'坂出市', chiban: ['concat', ['get', '所在地番3'], '-', ['get', '所在地番5']], bbox:[133.800000, 34.250000, 134.000000, 34.400000], position:[133.8605011373076,34.3166967696347], url:'sakaideshi', page:'https://www.city.sakaide.lg.jp/soshiki/kouminrenkei/opendata.html'},
    {prefname:'香川県', prefcode:'37', code:'37204', name:'善通寺市', chiban: ['concat', ['get', '本番'], '-', ['get', '枝番'], '-', ['get', '孫番']], bbox:[133.740000, 34.210000, 133.800000, 34.260000], position:[133.78706908666885,34.22705330992301], url:'zentujishi', page:'https://opendata.pref.kagawa.lg.jp/dataset/701.html'},
    // 福岡県
    // {prefname:'福岡県', prefcode:'40', code:'40130', name:'福岡市', chiban: ['get', '地番'], bbox:[130.200000, 33.500000, 130.500000, 33.750000], position:[130.40177928836357,33.5897855042562], url:'fukuokashi2', page:'https://webmap.city.fukuoka.lg.jp/fukuoka/OpenData?mids=&pno=1'},
    {prefname:'福岡県', prefcode:'40', code:'40204', name:'直方市', chiban: ['get', '地番'], bbox:[130.650000, 33.700000, 130.800000, 33.780000], position:[130.72966337301625,33.743983314699236], url:'nogatashi', page:'https://data.bodik.jp/dataset/402044_land_lot_correspondence_map/resource/3e57cf4e-a84b-4a6a-adba-fd27013531c7'},
    // 佐賀県
    {prefname:'佐賀県', prefcode:'41', code:'41202', name:'唐津市', chiban: ['get', 'SAFIELD001'], bbox:[129.800000, 33.300000, 130.100000, 33.600000], position:[129.9677463730212,33.44981990361434], url:'karatsushi', page:'https://www.open-data-portal.jp/opendata/dataset/chiban'},
    // 長崎県
    {prefname:'長崎県', prefcode:'42', code:'42307', name:'長与町', chiban: ['get', '地番'], bbox:[129.840000, 32.800000, 129.900000, 32.850000], position:[129.87507937301513,32.82524812594376], url:'nagayochyo', page:'https://data.bodik.jp/dataset/423076_tibansankouzu/resource/580da941-74d1-4ddd-a0f0-fb6b88fc793a'}
];
function chibanzuLayersCreate (url) {
    let sourceLayer
    if (url.name === '高崎市') {
        sourceLayer = 'oh3'
    } else {
        sourceLayer = 'chibanzu'
    }
    const chibanzuSource = {
        id: 'oh-chibanzu-' + url.name + '-source',
        obj: {
            type: "vector",
            url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chiban/' + url.url + '.pmtiles',
            tileSize: 512, // タイルサイズを適切に設定
        },
        // minzoom: 11
        minzoom: 13
    }
    const chibanzuLayer = {
        id: 'oh-chibanzu-' + url.name,
        source: 'oh-chibanzu-' + url.name + '-source',
        type: 'fill',
        "source-layer": sourceLayer,
        'fill-color': 'rgba(0,0,0,0)',
        position: url.position,
        page: url.page,
        name: `${url.prefname}-${url.name}`
    }
    const chibanzuLayerLine = {
        id: 'oh-chibanzu-line-' + url.name,
        source: 'oh-chibanzu-' + url.name + '-source',
        type: 'line',
        "source-layer": sourceLayer,
        paint: {
            'line-color': 'blue',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                1, 0.1,
                16, 2
            ]
        },
    }
    const chibanzuLayerLineGreen = {
        id: 'oh-chibanzu-line-' + url.name,
        source: 'oh-chibanzu-' + url.name + '-source',
        type: 'line',
        "source-layer": sourceLayer,
        paint: {
            'line-color': 'green',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                1, 0.1,
                16, 2
            ]
        },
        // minzoom: 11
        minzoom: 13
    }
    const chibanzuLayerLabel = {
        id: 'oh-chibanzu-label-' + url.name,
        type: "symbol",
        source: 'oh-chibanzu-' + url.name + '-source',
        "source-layer": sourceLayer,
        'layout': {
            'text-field': url.chiban,
        },
        'paint': {
            'text-color': 'navy',
            'text-halo-color': 'rgba(255,255,255,1)',
            'text-halo-width': 1.0,
        },
        'maxzoom': 24,
        'minzoom': 15
    }
    const chibanzuLayerLabelGreen = {
        id: 'oh-chibanzu-label-green-' + url.name,
        type: "symbol",
        source: 'oh-chibanzu-' + url.name + '-source',
        "source-layer": sourceLayer,
        'layout': {
            'text-field': url.chiban,
        },
        'paint': {
            'text-color': 'green',
            'text-halo-color': 'rgba(255,255,255,1)',
            'text-halo-width': 1.0,
        },
        'maxzoom': 24,
        'minzoom': 15
    }
    const chibanzuLayerVertex = {
        id: 'oh-chibanzu-vertex-' + url.name,
        type: "circle",
        source: 'oh-chibanzu-' + url.name + '-source',
        "source-layer": sourceLayer,
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                18,4
            ],
            'circle-color': 'green',
        }
    }
    const chibanzuLayerVertexGreen = {
        id: 'oh-chibanzu-vertex-green-' + url.name,
        type: "circle",
        source: 'oh-chibanzu-' + url.name + '-source',
        "source-layer": sourceLayer,
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                18,4
            ],
            'circle-color': 'green',
        }
    }
    // ここの filter: ['==', '$type', 'Point']が効いたり効かなかったり。様修正
    const chibanzuLayerPoint = {
        id: 'oh-chibanzu-point-' + url.name,
        type: "circle",
        source: 'oh-chibanzu-' + url.name + '-source',
        "source-layer": sourceLayer,
        filter: ['==', '$type', 'Point'],
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                18,4
            ],
            'circle-color': 'green',
        }
    }
    return {chibanzuSource,chibanzuLayer,chibanzuLayerLine,chibanzuLayerLineGreen,chibanzuLayerLabel,
        chibanzuLayerLabelGreen,chibanzuLayerVertex,chibanzuLayerVertexGreen,chibanzuLayerPoint}
}
export const chibanzuSources = []
export const chibanzuLayers = []
const chibanzuLayerLines = []
const chibanzuLayerLinesGreen = []
const chibanzuLayerLabel = []
const chibanzuLayerLabelGreen = []
const chibanzuLayerVertex = []
const chibanzuLayerVertexGreen = []
const chibanzuLayerPoint = []
sicyosonChibanzuUrls.forEach(url => {
    const layers = chibanzuLayersCreate (url)
    chibanzuSources.push(layers.chibanzuSource)
    chibanzuLayers.push(layers.chibanzuLayer)
    chibanzuLayerLines.push(layers.chibanzuLayerLine)
    chibanzuLayerLinesGreen.push(layers.chibanzuLayerLineGreen)
    chibanzuLayerLabel.push(layers.chibanzuLayerLabel)
    chibanzuLayerLabelGreen.push(layers.chibanzuLayerLabelGreen)
    chibanzuLayerVertex.push(layers.chibanzuLayerVertex)
    chibanzuLayerVertexGreen.push(layers.chibanzuLayerVertexGreen)
    chibanzuLayerPoint.push(layers.chibanzuLayerPoint)
})
const chibanzuLayers2 = chibanzuLayers.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.name,
        source: chibanzuSources[i],
        layers:[layer,chibanzuLayerLines[i],chibanzuLayerLabel[i],chibanzuLayerPoint[i],chibanzuLayerVertex[i]],
        attribution: '<a href="' + layer.page + '" target="_blank">' + name + '</a>',
        position: layer.position,
        ext: {name:'ext-chibanzu'}
    }
})
// 並びを様修正
const chibanzuLayers1 = [...chibanzuLayers,...chibanzuLayerLinesGreen,...chibanzuLayerLabelGreen,...chibanzuLayerPoint,...chibanzuLayerVertexGreen]

// 古地図----------------------------------------------------------------------------------------------------------------
// 戦前の旧版地形図
const mw5DummySource = {
    id:'mw5DummySource',obj:{
        type: 'raster',
        tileSize: 256
    }
}
const mw5DummyLayer = {
    'id': 'oh-mw-dummy',
    'source': mw5DummySource,
    'type': 'raster',
}
const mw5CenterSource = {
    id: 'mw5CenterSource', obj: {
        'type': 'geojson',
        'data': 'https://kenzkenz.xsrv.jp/open-hinata/geojson/mw5centerNew.geojson',
    }
}
const mw5CenterLabel = {
    id: "oh-mw5-center",
    type: "symbol",
    source: "mw5CenterSource",
    'layout': {
        'text-field': ['get', 'title'],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 7
}
// 北海道----------------------------------------------------------------------------------------------------------
const jissokuSource = {
    id: 'jissoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/jissoku/{z}/{x}/{y}.png'],
    }
}
const jissokuLayer = {
    'id': 'oh-jissoku-layer',
    'type': 'raster',
    'source': 'jissoku-source',
}
const jissokuMatsumaeSource = {
    id: 'jissoku-matsumae-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/jissokumatsumae/{z}/{x}/{y}.png'],
        tileSize: 256
    }
}
const jissokuMatsumaeLayer = {
    'id': 'oh-jissoku-matsumae-layer',
    'type': 'raster',
    'source': 'jissoku-matsumae-source',
}
// 迅速測図----------------------------------------------------------------------------------------------
const jinsokuSource = {
    id: 'jinsoku-source', obj: {
        type: 'raster',
        tiles: ['https://boiledorange73.sakura.ne.jp/ws/tile/Kanto_Rapid-900913/{z}/{x}/{y}.png'],
    }
}
const jinsokuLayer = {
    'id': 'oh-jinsoku',
    'type': 'raster',
    'source': 'jinsoku-source',
}
// ---------------------------------------------------------------------------------------------------------------------
// syochiikiソース
const syochiikiSource = {
    id: "syochiikiSource", obj:{
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/syochiiki/syochiiki.pmtiles",
        attribution: '<a href="https://github.com/shiwaku/mlit-plateau-bldg-pmtiles">mlit-plateau-bldg-pmtiles</a>'
    }
}
const syochiikiLayer = {
    'id': 'oh-syochiiki-layer',
    'source': 'syochiikiSource',
    'source-layer': "polygon",
    'type': 'fill',
    paint: {
        "fill-color": "rgba(0, 0, 0, 0)",
    },
}
const syochiikLayerLine = {
    id: "oh-syochiiki-line",
    type: "line",
    source: "syochiikiSource",
    "source-layer": "polygon",
    paint: {
        'line-color': 'red',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            4, 0.2,
            6, 0.5,
            8, 0.7,
            11, 1.0,
            12, 1.5,
            14, 2,
            16, 3,
            18, 6,
            30, 10,
        ]
    },
}
const syochiikLayerLine2 = {
    id: "oh-syochiiki-line",
    type: "line",
    source: "syochiikiSource",
    "source-layer": "polygon",
    paint: {
        'line-color': 'black',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            11, 2.0,
            12, 3,
            14, 4,
            16, 6,
            18, 12,
            30, 14,
        ]
    },
}
const syochiikiLayerLabel = {
    id: "oh-syochiiki-label",
    type: "symbol",
    source: "syochiikiSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': [
            'format',
            ['get', 'S_NAME'],{},
            '\n', {},
            ['get', 'JINKO'], { 'font-scale': 1.2 },
            '人', {},
        ],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0.5, 0],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
const syochiikiLayerLabel2 = {
    id: "oh-syochiiki-label",
    type: "symbol",
    source: "syochiikiSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': [
            'format',
            ['get', 'S_NAME'],{}
        ],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0.5, 0],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
const syochiikiLayerHeight = {
    id: 'oh-syochiiki-height',
    type: 'fill-extrusion',
    source: "syochiikiSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['/', ['get', 'JINKO'], ['get', 'AREA']],
            0, 100,
            0.2, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['/', ['get', 'JINKO'], ['get', 'AREA']],
            0, 'silver',
            0.1, 'black'
        ]
    }
}
// 高速道路--------------------------------------
const highwaySource = {
    id: 'highwaySource', obj: {
        // 'type': 'geojson',
        // 'data': require('@/assets/json/highway_sections_2024.geojson'),
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kosoku/kosoku.pmtiles",

    }
}
const highwayLayerGreen = {
    'id': 'oh-highwayLayer-green-lines',
    'type': 'line',
    'source': 'highwaySource',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': '#007356',
        'line-width': 5,
        'line-blur': 0.8,
        'line-opacity':1
    },
    'filter': ['<', 'N06_002', 2024]
}
const highwayLayerRed = {
    'id': 'oh-highwayLayer-red-lines',
    'type': 'line',
    'source': 'highwaySource',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': '#FF0000',
        'line-width': 5,
        'line-blur': 0.8,
        'line-opacity':1
    },
    'filter': ['==', 'N06_002', 2024]
}
// バス--------------------------------------
const busSource = {
    id: 'bus-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bus/bus-h.pmtiles",
    }
}
const busteiSource = {
    id: 'bustei-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bus/bustei-h.pmtiles",
    }
}
const busLayer = {
    'id': 'oh-bus-lines',
    'type': 'line',
    'source': 'bus-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        // 'line-color': ['get', 'random_color'],
        'line-color': ['get', 'random_color_hash'],
        'line-blur': 0.8,
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            11, 5
        ]
    }
}
const busteiLayer = {
    id: "oh-bus-points",
    type: "circle",
    source: "bustei-source",
    "source-layer": "point",
    'paint': {
        // 'circle-color': 'dodgerblue',
        'circle-color': ['get', 'random_color_hash'],
        // 'circle-color': [
        //     'match',
        //     ['slice', ['get', 'P11_004_01'], 0, 1], // 最初の1文字を取得
        //     '1', '#ff0000', // 最初の1文字が '"1' の場合の色 路線バス（民間）
        //     '2', '#00ff00', // 最初の1文字が '"2' の場合の色 路線バス（公営）
        //     '3', '#0000ff', // 最初の1文字が '"3' の場合の色 コミュニティバス
        //     '4', '#ffff00', // 最初の1文字が '"4' の場合の色
        //     '5', '#ff00ff', // 最初の1文字が '"5' の場合の色
        //     '#ffffff' // マッチしない場合のデフォルト色
        // ],
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
            // 6, 0.1,
            // 13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
const busteiLayerLabel = {
    id: "oh-bus-label",
    type: "symbol",
    source: "bustei-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'P11_001'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.5,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// 鉄道--------------------------------------
const tetsudoSource = {
    id: 'tetsudo-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tetsudo/tetsudojikeiretsu2.pmtiles",
    }
}
const tetsudoLayerRed = {
    'id': 'oh-tetsudo-red-lines',
    'type': 'line',
    'source': 'tetsudo-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'orangered',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    }
}
const tetsudoLayerBlue = {
    'id': 'oh-tetsudo-blue-lines',
    'type': 'line',
    'source': 'tetsudo-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'dodgerblue',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    },
    'filter': ['==', 'N05_005e', '9999']
}
const tetsudoLayerPointRed = {
    id: "oh-tetsudo-points-red",
    type: "circle",
    source: "tetsudo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'orangered',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
const tetsudoLayerPointBlue = {
    id: "oh-tetsudo-points-blue",
    type: "circle",
    source: "tetsudo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'dodgerblue',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
    'filter': ['==', 'N05_005e', '9999']
}
// 鉄道時系列--------------------------------------
const tetsudojikeiretsuSource = {
    id: 'tetsudojikeiretsu-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tetsudo/tetsudojikeiretsu2.pmtiles",

    }
}
const tetsudojikeiretsuLayerPoint = {
    id: "oh-tetsudojikeiretsu-points",
    type: "circle",
    source: "tetsudojikeiretsu-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'white',  // 固定の赤色
        'circle-radius': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
    'filter':
        ['all',
            ['<=', ['number', ['to-number', ['get', 'N05_005b']]], 2024],
            ['>=', ['number', ['to-number', ['get', 'N05_005e']]], 2024]]
}
const tetsudojikeiretsuLayerBlue = {
    'id': 'oh-tetsudojikeiretsu-blue-lines',
    'type': 'line',
    'source': 'tetsudojikeiretsu-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'dodgerblue',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    },
    'filter':
        ['all',
            ['<=', ['number', ['to-number', ['get', 'N05_005b']]], 2024],
            ['>=', ['number', ['to-number', ['get', 'N05_005e']]], 2024]]
}
// export const tetsudojikeiretsuLayerRed = {
//     'id': 'oh-tetsudojikeiretsu-red-lines',
//     'type': 'line',
//     'source': 'tetsudojikeiretsu-source',
//     "source-layer": "line",
//     'layout': {
//         'line-join': 'round',
//         'line-cap': 'round'
//     },
//     'paint': {
//         'line-color': '#FF0000',
//         'line-width': 5,
//         'line-blur': 0.8,
//         'line-opacity':1
//     },
//     'filter': ['==', 'N06_002', 2024]
// }
// 標準地図--------------------------------------------------------------------------------------------------------------
const osmSource = {
    id: 'osm-source', obj: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    }
}
const osmLayer = {
    'id': 'oh-osm-layer',
    'type': 'raster',
    'source': 'osm-source',
}
// 標準地図--------------------------------------------------------------------------------------------------------------
const stdSource = {
    id: 'stdSource', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
    }
}
const stdLayer = {
    'id': 'oh-stdLayer',
    'type': 'raster',
    'source': 'stdSource',
}
// 淡色地図--------------------------------------------------------------------------------------------------------------
export const paleSource = {
    id: 'pale-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
    }
}
export const paleLayer = {
    'id': 'oh-pale-layer',
    'type': 'raster',
    'source': 'pale-source',
}
// 最新写真--------------------------------------------------------------------------------------------------------------
const seamlessphotoSource = {
    id:'seamlessphoto',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256
    }
}
const seamlessphotoLayer = {
    'id': 'oh-seamlessphoto',
    'source': seamlessphotoSource.id,
    'type': 'raster',
}
// 87写真--------------------------------------------------------------------------------------------------------------
const sp87Source = {
    id:'sp87-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo4/{z}/{x}/{y}.jpg'],
    }
}
const sp87Layer = {
    'id': 'oh-sp87',
    'source': 'sp87-source',
    'type': 'raster',
}
// 84写真--------------------------------------------------------------------------------------------------------------
const sp84Source = {
    id:'sp84-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo3/{z}/{x}/{y}.jpg'],
    }
}
const sp84Layer = {
    'id': 'oh-sp84',
    'source': 'sp84-source',
    'type': 'raster',
}
// 79写真--------------------------------------------------------------------------------------------------------------
const sp79Source = {
    id:'sp79-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg'],
    }
}
const sp79Layer = {
    'id': 'oh-sp79',
    'source': 'sp79-source',
    'type': 'raster',
}
// 74写真--------------------------------------------------------------------------------------------------------------
const sp74Source = {
    id:'sp74-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg'],
    }
}
const sp74Layer = {
    'id': 'oh-sp74',
    'source': 'sp74-source',
    'type': 'raster',
}
// 61写真--------------------------------------------------------------------------------------------------------------
const sp61Source = {
    id:'sp61-source',obj:{
        type: 'raster',
        tiles: ['https://maps.gsi.go.jp/xyz/ort_old10/{z}/{x}/{y}.png'],
    }
}
const sp61Layer = {
    'id': 'oh-sp61',
    'source': 'sp61-source',
    'type': 'raster',
    // paint: {
    //     // 明るさ、コントラスト、彩度を調整
    //     'raster-brightness-min': 0.3, // 最小明るさ
    //     'raster-brightness-max': 0.8, // 最大明るさ
    //     'raster-hue-rotate': 180,     // 色相
    //     'raster-contrast': 0.7,       // コントラスト
    //     'raster-saturation': 1,       // 彩度
    // },
}
// 45写真--------------------------------------------------------------------------------------------------------------
const sp45Source = {
    id:'sp45-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort_USA10/{z}/{x}/{y}.png'],
    }
}
const sp45Layer = {
    'id': 'oh-sp45',
    'source': 'sp45-source',
    'type': 'raster',
}
// 36写真--------------------------------------------------------------------------------------------------------------
const sp36Source = {
    id:'sp36-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort_riku10/{z}/{x}/{y}.png'],
    }
}
const sp36Layer = {
    'id': 'oh-sp36',
    'source': 'sp36-source',
    'type': 'raster',
}
// 28写真--------------------------------------------------------------------------------------------------------------
const sp28Source = {
    id:'sp28-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort_1928/{z}/{x}/{y}.png'],
    }
}
const sp28Layer = {
    'id': 'oh-sp28',
    'source': 'sp28-source',
    'type': 'raster',
}
// 宮崎県航空写真--------------------------------------------------------------------------------------------------------------
const miyazakiSyashinSource = {
    id:'miyazaki-syashin-source',obj:{
        type: 'raster',
        tiles: ['https://mtile.pref.miyazaki.lg.jp/tile/ort/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const miyazakiSyashinLayer = {
    'id': 'oh-miyazaki-syashin',
    'source': 'miyazaki-syashin-source',
    'type': 'raster',
}
// 神奈川県航空写真--------------------------------------------------------------------------------------------------------------
const kanagawaSyashinSource = {
    id:'kanagawa-syashin-source',obj:{
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/kokusyashin/kanagawa2/{z}/{x}/{y}.png'],
    }
}
const kanagawaSyashinLayer = {
    'id': 'oh-kanagawa-syashin',
    'source': 'kanagawa-syashin-source',
    'type': 'raster',
}
// 横浜北部、川崎航空写真--------------------------------------------------------------------------------------------------------------
const yokohamaSyashinSource = {
    id:'yokohama-syashin-source',obj:{
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/kokusyashin/yokohama/{z}/{x}/{y}.png'],
    }
}
const yokohamaSyashinLayer = {
    'id': 'oh-yokohama-syashin',
    'source': 'yokohama-syashin-source',
    'type': 'raster',
}
// plateau-tokyo23ku-building-mvt-2020--------------------------------------------------------------------------------------------
const plateauTokyo23kuSource = {
    id: "plateau-tokyo23ku-source", obj: {
        type: "vector",
        tiles: ["https://indigo-lab.github.io/plateau-tokyo23ku-building-mvt-2020/{z}/{x}/{y}.pbf"],
        attribution: "国土地理院ベクトルタイル提供実験",
        minzoom: 10,
        maxzoom: 16
    }
}
const plateauTokyo23kuLayer = {
    'id': 'oh-plateau-tokyo23ku-layer',
    'source': 'plateau-tokyo23ku-source',
    'source-layer': "bldg",
    'type': 'fill-extrusion',
    'paint': {
        "fill-extrusion-height": ["get", "measuredHeight"],
        "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "measuredHeight"],
            0, "#d9d9d9",       // 0m: グレー
            10, "#a6bddb",      // 10m: 明るいブルー
            30, "#74a9cf",      // 30m: 中間ブルー
            60, "#2b8cbe",      // 60m: 濃いブルー
            100, "#045a8d"      // 100m以上: 非常に濃いブルー
        ],
    },
    'max-opacity': 0.9
}
// ---------------------------------------------------------------------------------------------------------------------
// PLATEAU建物（PMTiles）ソース
const plateauPmtilesSource = {
    id: "plateauPmtiles", obj:{
        type: "vector",
        // url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2022_LOD1.pmtiles",
        url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2023_LOD0.pmtiles",
        minzoom: 16,
        maxzoom: 16,
        attribution: '<a href="https://github.com/shiwaku/mlit-plateau-bldg-pmtiles">mlit-plateau-bldg-pmtiles</a>'
    }
}
const plateauPmtilesLayer = {
    'id': 'oh-plateauPmtiles',
    'source': 'plateauPmtiles',
    // 'source-layer': "PLATEAU",
    'source-layer': "PLATEAU_2023_LOD0",
    "minzoom": 14,
    "maxzoom": 23,
    'type': 'fill-extrusion',
    'paint': {
        "fill-extrusion-color": '#797979',
        "fill-extrusion-opacity": 1.0,
        // "fill-extrusion-height": ["get", "measuredHeight"]
        "fill-extrusion-height": ["get", "measured_height"]
    }
}
// 横浜北部、川崎CS立体図---------------------------------------------------------------------------------------------------------
const csYokohamSource = {
    id: 'cs-yokohama-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/cs/yokohama/{z}/{x}/{y}.png'],
    }
}
const csYokohamaLayer = {
    'id': 'oh-cs-yokohama-layer',
    'type': 'raster',
    'source': 'cs-yokohama-source',
}
// 神奈川県CS立体図---------------------------------------------------------------------------------------------------------
const csKanagawaSource = {
    id: 'cs-kanagawa-source', obj: {
        type: 'raster',
        tiles: ['https://shiworks.xsrv.jp/raster-tiles/pref-kanagawa/kanagawapc-cs-tiles/{z}/{x}/{y}.png'],
    }
}
const csKanagawaLayer = {
    'id': 'oh-cs-kanagawa-layer',
    'type': 'raster',
    'source': 'cs-kanagawa-source',
}
// 色別標高図---------------------------------------------------------------------------------------------------------
const shikibetsuSource = {
    id: 'shikibetsu-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
    }
}
const shikibetsuLayer = {
    'id': 'oh-shikibetsu-layer',
    'type': 'raster',
    'source': 'shikibetsu-source'
}
// 陰影起伏図---------------------------------------------------------------------------------------------------------
const ineiSource = {
    id: 'inei-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
    }
}
const ineiLayer = {
    'id': 'oh-inei-layer',
    'type': 'raster',
    'source': 'inei-source'
}
// 栃木県CS立体図---------------------------------------------------------------------------------------------------------
const csTochigiSource = {
    id: 'cs-tochigi', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://rinya-tochigi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'],
    }
}
const csTochigiLayer = {
    'id': 'oh-cs-tochigi-layer',
    'type': 'raster',
    'source': 'cs-tochigi'
}
// 長野県CS立体図---------------------------------------------------------------------------------------------------------
const csNaganoSource = {
    id: 'cs-nagano', obj: {
        type: 'raster',
        tiles: ['https://tile.geospatial.jp/CS/VER2/{z}/{x}/{y}.png'],
    }
}
const csNaganoLayer = {
    'id': 'oh-cs-nagano-layer',
    'type': 'raster',
    'source': 'cs-nagano'
}
// 広島県CS立体図shi-works氏-CS 1m---------------------------------------------------------------------------------------------------------
const csHiroshimaSource = {
    id: 'cs-hiroshima', obj: {
        type: 'raster',
        tiles: ['https://xs489works.xsrv.jp/raster-tiles/pref-hiroshima/hiroshimapc-cs-tiles/{z}/{x}/{y}.png'],
    }
}
const csHiroshimaLayer = {
    'id': 'oh-cs-hiroshima-layer',
    'type': 'raster',
    'source': 'cs-hiroshima'
}
// 岡山県CS立体図---------------------------------------------------------------------------------------------------------
const csOkayamaSource = {
    id: 'cs-okayama', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_okayama/{z}/{x}/{y}.png'],
    }
}
const csOkayamaLayer = {
    'id': 'oh-cs-okayama-layer',
    'type': 'raster',
    'source': 'cs-okayama'
}
// 福島県CS立体図---------------------------------------------------------------------------------------------------------
const csFukushimaSource = {
    id: 'cs-fukushima', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_fukushima/{z}/{x}/{y}.png'],
    }
}
const csFukushimaLayer = {
    'id': 'oh-cs-fukushima-layer',
    'type': 'raster',
    'source': 'cs-fukushima'
}
// 愛媛県CS立体図---------------------------------------------------------------------------------------------------------
const csEhimeSource = {
    id: 'cs-ehime-source', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_ehime/{z}/{x}/{y}.png'],
    }
}
const csEhimeLayer = {
    'id': 'oh-cs-ehime-layer',
    'type': 'raster',
    'source': 'cs-ehime-source'
}
// 高知県CS立体図---------------------------------------------------------------------------------------------------------
const csKochiSource = {
    id: 'cs-kochi-source', obj: {
        type: 'raster',
        tiles: ['https://rinya-kochi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'],
    }
}
const csKochiLayer = {
    'id': 'oh-cs-kochi-layer',
    'type': 'raster',
    'source': 'cs-kochi-source'
}
// 熊本県・大分県CS立体図---------------------------------------------------------------------------------------------------------
const csKumamotoSource = {
    id: 'cs-kumamoto-source', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_kumamoto_oita/{z}/{x}/{y}.png'],
    }
}
const csKumamotoLayer = {
    'id': 'oh-cs-kumamoto-layer',
    'type': 'raster',
    'source': 'cs-kumamoto-source'
}
// 岐阜県CS立体図---------------------------------------------------------------------------------------------------------
const csGifuSource = {
    id: 'csGifu', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://kenzkenz2.xsrv.jp/gihucs/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const csGifuLayer = {
    'id': 'oh-csGifuLayer',
    'type': 'raster',
    'source': 'csGifu'
}
// 能登CS立体図------------------------------------------------------------------------------------------------------
const csNotoSource = {
    id: 'csNotoSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://www2.ffpri.go.jp/soilmap/tile/cs_noto/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const csNotoLayer = {
    'id': 'oh-csNotoLayer',
    'type': 'raster',
    'source': 'csNotoSource',
    // paint: {
    //     "raster-resampling": "nearest" // ぼやけを防ぐために「nearest」を使用
    // }
}
// 静岡県県CS立体図------------------------------------------------------------------------------------------------------
const csShizuokaSource = {
    id: 'csShizuokaSource', obj: {
        type: 'raster',
        tiles: ['transparentWhite://https://kenzkenz3.xsrv.jp/cs/shizuoka/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const csShizuokaLayer = {
    'id': 'oh-csShizuokaLayer',
    'type': 'raster',
    'source': 'csShizuokaSource',
}
// 兵庫県CS立体図------------------------------------------------------------------------------------------------------
const csHyogoSource = {
    id: 'cs-hiyogo-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://rinya-hyogo.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const csHyogoLayer = {
    'id': 'oh-csHyogoLayer',
    'type': 'raster',
    'source': 'cs-hiyogo-source',
}
// 愛知県赤色立体図------------------------------------------------------------------------------------------------------
// const aichiSekisyokuSource = {
//     id: 'aichiSekisyokuSource', obj: {
//         type: 'raster',
//         tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://bg.maps.pref.aichi.jp/tiles/w213665/{z}/{x}/{y}.png'],
//         tileSize: 256,
//         crossOrigin: 'anonymous',
//     }
// }
// const aichiSekisyokuLayer = {
//     'id': 'oh-aichiSekisyokuLayer',
//     'type': 'raster',
//     'source': 'aichiSekisyokuSource',
// }
// 神奈川県赤色立体図------------------------------------------------------------------------------------------------------
const kanagawaSekisyokuSource = {
    id: 'kanagawa-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['transparentWhite://https://kenzkenz3.xsrv.jp/sekisyoku/kanagawa/{z}/{x}/{y}.png'],
    }
}
const kanagawaSekisyokuLayer = {
    'id': 'oh-kanagawa-sekisyoku-layer',
    'type': 'raster',
    'source': 'kanagawa-sekisyoku-source',
}
// 神奈川県相模原市赤色立体地図------------------------------------------------------------------------------------------------------
const sagamiharaSekisyokuSource = {
    id: 'sagamihara-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['transparentWhite://https://kenzkenz4.xsrv.jp/tile/sekisyoku/sagamihara/{z}/{x}/{y}.png'],
    }
}
const sagamiharaSekisyokuLayer = {
    'id': 'oh-sagamihara-sekisyoku-layer',
    'type': 'raster',
    'source': 'sagamihara-sekisyoku-source',
}
// 神奈川西部赤色立体地図------------------------------------------------------------------------------------------------------
const kanagawakenseibuSekisyokuSource = {
    id: 'kanagawakenseibu-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['transparentWhite://https://kenzkenz4.xsrv.jp/tile/sekisyoku/kanagawakenseibu/{z}/{x}/{y}.png'],
    }
}
const kanagawakenseibuSekisyokuLayer = {
    'id': 'oh-kanagawakenseibu-sekisyoku-layer',
    'type': 'raster',
    'source': 'kanagawakenseibu-sekisyoku-source',
}
// 神奈川横浜市南部赤色立体地図------------------------------------------------------------------------------------------------------
const kanagawakenyokohamaSekisyokuSource = {
    id: 'kanagawakenyokohama-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['transparentWhite://https://kenzkenz4.xsrv.jp/tile/sekisyoku/yokohamananbu/{z}/{x}/{y}.png'],
    }
}
const kanagawakenyokohamaSekisyokuLayer = {
    'id': 'oh-kanagawakenyokohama-sekisyoku-layer',
    'type': 'raster',
    'source': 'kanagawakenyokohama-sekisyoku-source',
}
// 多摩地域赤色立体地図------------------------------------------------------------------------------------------------------
const tamaSekisyokuSource = {
    id: 'tamaSekisyokuSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tamasekisyoku/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
const tamaSekisyokuLayer = {
    'id': 'oh-tamaSekisyokuLayer',
    'type': 'raster',
    'source': 'tamaSekisyokuSource',
}
// 東京都23区赤色立体地図------------------------------------------------------------------------------------------------------
const tokyo23SekisyokuSource = {
    id: 'tokyo23-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/sekisyoku/tokyo/{z}/{x}/{y}.png'],
    }
}
const tokyo23SekisyokuLayer = {
    'id': 'oh-tokyo23-sekisyoku-layer',
    'type': 'raster',
    'source': 'tokyo23-sekisyoku-source',
}
// 東京都島しょ地域赤色立体地図------------------------------------------------------------------------------------------------------
const tosyo01SekisyokuSource = {
    id: 'tosyo01-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku01/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo01SekisyokuLayer = {
    'id': 'oh-tosyo01-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo01-sekisyoku-source',
}
const tosyo02SekisyokuSource = {
    id: 'tosyo02-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku02/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo02SekisyokuLayer = {
    'id': 'oh-tosyo02-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo02-sekisyoku-source',
}
const tosyo03SekisyokuSource = {
    id: 'tosyo03-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku03/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo03SekisyokuLayer = {
    'id': 'oh-tosyo03-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo03-sekisyoku-source',
    'raster-resampling': 'nearest'
}
const tosyo04SekisyokuSource = {
    id: 'tosyo04-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku04/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo04SekisyokuLayer = {
    'id': 'oh-tosyo04-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo04-sekisyoku-source',
}
const tosyo05SekisyokuSource = {
    id: 'tosyo05-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku05/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo05SekisyokuLayer = {
    'id': 'oh-tosyo05-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo05-sekisyoku-source',
}
const tosyo06SekisyokuSource = {
    id: 'tosyo06-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku06/{z}/{x}/{y}.png'],
        scheme: 'tms',
        tileSize: 256, // タイルサイズに合わせる
        maxzoom: 18,   // 適切なズーム範囲を設定
        minzoom: 1,
        bounds: boundsSort([139.74046773079067,32.48017775032204,139.78740051701084,32.439009913129155])
    }
}
const tosyo06SekisyokuLayer = {
    'id': 'oh-tosyo06-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo06-sekisyoku-source',
}
// 高知県赤色立体地図------------------------------------------------------------------------------------------------------
const kochiSekisyokuSource = {
    id: 'kochi-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/sekisyoku/kochi/{z}/{x}/{y}.png'],
    }
}
const kochiSekisyokuLayer = {
    'id': 'oh-kochi-sekisyoku-layer',
    'type': 'raster',
    'source': 'kochi-sekisyoku-source',
}
// 富山県赤色立体地図------------------------------------------------------------------------------------------------------
const toyamaSekisyokuSource = {
    id: 'toyama-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['transparentWhite://https://rinya-toyama.geospatial.jp/tile/rinya/2024/rrimap/{z}/{x}/{y}.png'],
    }
}
const toyamaSekisyokuLayer = {
    'id': 'oh-toyama-sekisyoku-layer',
    'type': 'raster',
    'source': 'toyama-sekisyoku-source',
}
// 東京都23区CS立体図------------------------------------------------------------------------------------------------------
const tokyo23CsSource = {
    id: 'tokyo23-cs-source', obj: {
        type: 'raster',
        tiles: ['https://shiworks.xsrv.jp/raster-tiles/tokyo-digitaltwin/tokyopc-23ku-2024-cs-tiles/{z}/{x}/{y}.png'],
    }
}
const tokyo23CsLayer = {
    'id': 'oh-tokyo23-cs-layer',
    'type': 'raster',
    'source': 'tokyo23-cs-source',
}
// 大阪府CS立体地図------------------------------------------------------------------------------------------------------
const csOsakaSource = {
    id: 'csOsakaSource', obj: {
        type: 'raster',
        tiles: ['https://xs489works.xsrv.jp/raster-tiles/pref-osaka/osaka-cs-tiles/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
    }
}
const csOsakaLayer = {
    'id': 'oh-csOsakaLayer',
    'type': 'raster',
    'source': 'csOsakaSource',
}
// 川だけ地形地図------------------------------------------------------------------------------------------------------
const kawadakeSource = {
    id: 'kawadake-source', obj: {
        type: 'raster',
        // tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://www.gridscapes.net/AllRivers/1.0.0/t/{z}/{x}/{y}.png'],
        tiles: ['transparentWhite://https://kenzkenz.xsrv.jp/kawadake/{z}/{x}/{y}.png'],
        tileSize: 256,
        // scheme: 'tms',
        'maxzoom': 14,
        'minzoom': 5
    }
}
const kawddakeLayer = {
    'id': 'oh-kawadakeLayer',
    'type': 'raster',
    'source': 'kawadake-source',
}
// 川と流域地図------------------------------------------------------------------------------------------------------
const ryuikiSource = {
    id: 'ryuiki-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://tiles.dammaps.jp/ryuiki_t/1/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
        minzoom: 5,
        maxzoom: 14
    }
}
const ryuikiLayer = {
    'id': 'oh-ryuikiLayer',
    'type': 'raster',
    'source': 'ryuiki-source',
}
// 登記所備付地図データ ----------------------------------------------------------------------------------------------------
// オフライン
const homusyo2025SourceOffline = {
    id: "homusyo-2025-source-offline",
    obj: {
        type: 'vector',
        tiles: [
            'https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025final3.pmtiles/{z}/{x}/{y}.pbf'
        ],
        minzoom: 14,
        maxzoom: 16
    }
}
const homusyo2025LayerOffline = {
    id: "oh-homusyo-2025-polygon-offline",
    type: 'fill',
    source: 'homusyo-2025-source-offline',
    'source-layer': 'fude',
    paint: {
        'fill-color': 'red',
        'fill-opacity': 0.6
    }
}


// 登記所備付地図データ ----------------------------------------------------------------------------------------------------
let homusyo2025Source
if (!store.state.isOffline) {
    homusyo2025Source = {
        id: "homusyo-2025-source", obj: {
            type: "vector",
            // url: 'pmtiles://https://kenzkenz.xsrv.jp/pmtiles/homusyo/2025/2025.pmtiles'
            // url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025light.pmtiles'
            // url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025.pmtiles'
            // url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025final.pmtiles'
            url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025final3.pmtiles'
        },
    }
} else {
    homusyo2025Source = {
        id: "homusyo-2025-source",
        obj: {
            type: 'vector',
            tiles: [
                'https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025final3.pmtiles/{z}/{x}/{y}.pbf'
            ],
            minzoom: 14,
            maxzoom: 16
        }
    }
}


const homusyo2025DDissolvedSource = {
    id: "homusyo-2025-dissolved-source", obj: {
        type: "vector",
        url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025dissolved.pmtiles'
    },
}
const homusyo2025KijyuntenSource = {
    id: "homusyo-2025-kijyunten-source", obj: {
        type: "vector",
        // url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025kijyunten.pmtiles",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025kijyuntenFull.pmtiles",
    }
}
const homusyo2025ZukakuSource = {
    id: "homusyo-2025-zukaku-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025zukaku.pmtiles",
    }
}
const homusyo2025NinizahyoSource = {
    id: "homusyo-2025-ninizahyo-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz2.xsrv.jp/pmtiles/ninizahyo.pmtiles",
    }
}
// 登記所備付地図データ 間引きなし
const homusyo2025Layer = {
    id: "oh-homusyo-2025-polygon",
    type: "fill",
    source: "homusyo-2025-source",
    "source-layer": "fude",
    paint: {
        "fill-color": "rgba(0, 0, 0, 0)"
    },
}
const homusyo2025DissolvedLayer = {
    id: "oh-homusyo-2025-polygon-dissolved",
    type: "fill",
    source: "homusyo-2025-dissolved-source",
    "source-layer": "polygon",
    paint: {
        "fill-color": "rgba(0, 0, 0, 0)"
    },
    // minzoom: 10,
    maxzoom: 15
}
const homusyo2025DissolvedAllLayer = {
    id: "oh-homusyo-2025-polygon-dissolved-all",
    type: "fill",
    // source: "homusyo-2025-dissolved-source-all",
    source: "homusyo-2025-source",
    // "source-layer": "dissolved",
    "source-layer": "fude",
    paint: {
        "fill-color": "rgba(0, 0, 0, 0)"
    },
    maxzoom: 14.5
}
export const homusyo2025LayerLine = {
    id: "oh-homusyo-2025-line",
    type: "line",
    source: "homusyo-2025-source",
    "source-layer": "fude",
    paint: {
        "line-color": "red",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.5,
            20, 6
        ]
    },
}
const homusyo2025LayerLabel = {
    id: "oh-homusyo-2025-label",
    type: "symbol",
    source: "homusyo-2025-source",
    "source-layer": "fude",
    'layout': {
        'text-field': ['get', '地番'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'red',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 15
}
const homusyo2025LayerVertex = {
    id: 'oh-homusyo-2025-vertex',
    type: 'circle',
    source: 'homusyo-2025-source',
    "source-layer": "fude",
    paint: {
        'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            18,4
        ],
        'circle-color': 'red',
    }
}

const colors = ["rgba(255, 255, 255, 0)", "rgba(255, 255, 0, 0.5)", "rgba(255, 0, 0, 0.5)"]
export const homusyo2025LayerDaihyou = {
    id: "oh-homusyo-2025-daihyo",
    type: "heatmap",
    source: "homusyo-2025-diahyo-source",
    "source-layer": "daihyo",
    paint: {
        // ヒートマップの密度に基づいて各ピクセルの色を定義
        "heatmap-color": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 入力より小さいストップと大きいストップのペアを直線的に補間
            ["linear"],
            // ヒートマップレイヤーの密度推定値を取得
            ["heatmap-density"],
            0, colors[0],
            0.5, colors[1],
            // 1に近づくほど密度が高い
            1, colors[2],
        ],
        // ヒートマップ1点の半径（ピクセル単位）
        "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"],
            0, 0,
            4, 5,
            15, 20
        ],
    },
    'maxzoom': 15,
}
const homusyo2025LayerKijyunten = {
    id: "oh-homusyo-2025-kijyunten",
    type: "circle",
    source: "homusyo-2025-kijyunten-source",
    "source-layer": "point",
    paint: {
        'circle-color': 'navy',
        'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            0,0,
            14, 3,
            20,6
        ],
        'circle-opacity': 1,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
    },
}
const homusyo2025LayerKijyuntenLabel = {
    id: "oh-homusyo-2025-kijyunten-label",
    type: "symbol",
    source: "homusyo-2025-kijyunten-source",
    "source-layer": "point",
    'layout': {
        // 'text-field': ['concat', ['get', '基準点種別'], '\n', ['get', '名称']],
        'text-field': ['get', '名称'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'navy',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'minzoom': 14,
}
const homusyo2025LayerZukaku = {
    id: "oh-homusyo-2025-zukaku",
    type: "fill",
    source: "homusyo-2025-zukaku-source",
    "source-layer": "polygon",
    paint: {
        // "fill-color": "rgba(0, 0, 0, 0.1)"
        "fill-color": [
            "step",
            ["zoom"],
            "rgba(0, 0, 0, 0.1)", // ズーム < 14 → 不透明
            14,
            "rgba(0, 0, 0, 0)"  // ズーム >= 14 → 完全に透明
        ]
    }
}
const homusyo2025LayerZukakuLine = {
    id: "oh-homusyo-2025-zukaku-line",
    type: "line",
    source: "homusyo-2025-zukaku-source",
    "source-layer": "polygon",
    paint: {
        "line-color": "black",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.5,
            20, 6
        ]
    },
    'minzoom': 12,
}
const homusyo2025LayerZukakuLabel = {
    id: "oh-homusyo-2025-zukaku-label",
    type: "symbol",
    source: "homusyo-2025-zukaku-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', '地図番号'],
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'minzoom': 14,
}
export const homusyo2025LayerSearchedPoint = {
    id: "oh-homusyo-2025-searched-point",
    type: "circle",
    source: "homusyo-2025-diahyo-source2",
    "source-layer": "daihyo",
    filter: ['==', ['get', '市町村名'], '999'],
    paint: {
        'circle-color': 'red',
        'circle-radius': 8,
    },
    'maxzoom': 14
}
const homusyo2025NinizahyoCircle = {
    id: 'oh-homusyo-2025-ninizahyo-circle',
    type: 'circle',
    source: 'homusyo-2025-ninizahyo-source',
    "source-layer": "point",
    paint: {
        'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            11, 0,
            13,12,
        ],
        'circle-color': 'rgba(0,0,0,0.4)',
    }
}
const homusyo2025NinizahyoSymbol = {
    id: "oh-homusyo-2025-ninizahyo-simbol",
    type: "symbol",
    source: "homusyo-2025-ninizahyo-source",
    "source-layer": "point",
    'layout': {
        'text-field': '任',
        'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,0,
            13, 12
        ],
        'text-anchor': 'center', // テキストを中央配置
        'text-allow-overlap': true // サークルとテキストの重なりを許可
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.5
    }
}

// ---------------------------------------------------------------------------------------------------------------------
const amx2024Source = {
    id: "amx-a-2024-pmtiles", obj: {
        type: "vector",
        // url: 'pmtiles://https://kenzkenz4.xsrv.jp/pmtiles/homusyo/2024/MojMap_amx_2024v2.pmtiles'
        url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/amx/MojMap_amx_2024.pmtiles'
        // url: 'pmtiles://https://data.source.coop/smartmaps/amx-2024-04/MojMap_amx_2024.pmtiles',
    },
}
// 登記所備付地図データ 間引きなし
const amx2024Layer = {
    id: "oh-amx-a-fude",
    type: "fill",
    source: "amx-a-2024-pmtiles",
    "source-layer": "fude",
    paint: {
        "fill-color": "rgba(0, 0, 0, 0)",
        "fill-outline-color": "rgba(255, 0, 0, 1)",
    },
};
const amx2024LayerLine = {
    id: "oh-amx-a-fude-line",
    type: "line",
    source: "amx-a-2024-pmtiles",
    "source-layer": "fude",
    paint: {
        "line-color": "red",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.5,
            20, 6
        ]
    },
}
const amx2024LayerLabel = {
    id: "oh-amx-label",
    type: "symbol",
    source: "amx-a-2024-pmtiles",
    "source-layer": "fude",
    'layout': {
        'text-field': ['get', '地番'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 15
}
const amx2024LayerVertex = {
    id: 'oh-amx-vertex',
    type: 'circle',
    source: 'amx-a-2024-pmtiles',
    "source-layer": "fude",
    paint: {
        'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            18,4
        ],
        'circle-color': 'red',
    }
}
// ---------------------------------------------------------------------------------------------------------------------
const amxSource = {
    id: "amx-a-pmtiles", obj: {
        type: "vector",
        url: "pmtiles://https://habs.rad.naro.go.jp/spatial_data/amx/a.pmtiles",
        // url: 'https://data.source.coop/smartmaps/amx-2024-04/MojMap_amx_2024.pmtiles',
    }
}
// 登記所備付地図データ 間引きなし
const amxLayer = {
    id: "oh-amx-a-fude",
    type: "fill",
    source: "amx-a-pmtiles",
    "source-layer": "fude",
    paint: {
        "fill-color": "rgba(254, 217, 192, 0)",
        "fill-outline-color": "rgba(255, 0, 0, 1)",
    },
}
const amxLayerLine = {
    id: "oh-amx-a-fude-line",
    type: "line",
    source: "amx-a-pmtiles",
    "source-layer": "fude",
    paint: {
        "line-color": "red",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.5,
            20, 6
        ]
    },
}
// 登記所備付地図データ 代表点レイヤ
const amxLayerDaihyou = {
    id: "oh-amx-a-daihyo",
    // ヒートマップ
    type: "heatmap",
    source: "amx-a-pmtiles",
    // ベクトルタイルソースから使用するレイヤ
    "source-layer": "daihyo",
    paint: {
        // ヒートマップの密度に基づいて各ピクセルの色を定義
        "heatmap-color": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 入力より小さいストップと大きいストップのペアを直線的に補間
            ["linear"],
            // ヒートマップレイヤーの密度推定値を取得
            ["heatmap-density"],
            0,
            "rgba(255, 255, 255, 0)",
            0.5,
            "rgba(255, 255, 0, 0.5)",
            // 1に近づくほど密度が高い
            1,
            "rgba(255, 0, 0, 0.5)",
        ],
        // ヒートマップ1点の半径（ピクセル単位）
        "heatmap-radius": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 出力が増加する割合を制御する、1に近づくほど出力が増加する
            ["exponential", 10],
            // ズームレベルに応じて半径を調整する
            ["zoom"],
            2,
            5,
            14,
            50,
        ],
    },
}
const amxLayerLabel = {
    id: "oh-amx-label",
    type: "symbol",
    source: "amx-a-pmtiles",
    "source-layer": "fude",
    'layout': {
        'text-field': ['get', '地番'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 17
}
const amxLayerVertex = {
    id: 'oh-amx-vertex',
    type: 'circle',
    source: 'amx-a-pmtiles',
    "source-layer": "fude",
    paint: {
        'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            18,4
        ],
        'circle-color': 'red',
        // 'circle-stroke-width': 1,
        // 'circle-stroke-color': 'white'
    }
}
// 幕末近世 --------------------------------------------------------------------------------------------
const bakumatsuSource = {
    id: "bakumatsu", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bakumatsu/b410.pmtiles",
    }
}
const bakumatsuLayer = {
    id: "oh-bakumatsu-layer",
    type: "fill",
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'fill-color': ['get', 'random_color_ryobun'],
    }
}
const bakumatsuLayerHeight = {
    id: 'oh-bakumatsu-kokudaka-height',
    type: 'fill-extrusion',
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 100,
            50000000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 'white',
            10000000, 'red',
            50000000, 'black'
        ]
    }
}
const bakumatsuLayerLine = {
    id: "oh-bakumatsu-line",
    type: "line",
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'line-color': '#000',
        // 'line-width': 0.5
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const bakumatsuLayerLabel = {
    id: "oh-bakumatsu-label",
    type: "symbol",
    source: "bakumatsu",
    "source-layer": "b41",
    'layout': {
        'text-field': [
            'let', 'splitIndex', ['index-of', '・', ['get', '村名']],
            [
                'case',
                ['>=', ['var', 'splitIndex'], 0],
                ['slice', ['get', '村名'], 0, ['var', 'splitIndex']],
                ['get', '村名']
            ]
        ],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0.5, 0],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// 幕末近世ポイント --------------------------------------------------------------------------------------------
const bakumatsuPointSource = {
    id: "bakumatsu-point-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bakumatsupoint/bp.pmtiles",
    }
}
const bakumatsuPointLayer = {
    id: "oh-bakumatsu-point",
    type: "circle",
    source: "bakumatsu-point-source",
    "source-layer": "bp",
    'paint': {
        'circle-color': ['get','random_color_ryobun'],
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['sqrt', ['get', '石高計']],
            0, 1,
            200, 40
        ],
    }
}
// 小学校-------------------------------------------------------------------------------------------
const syogakkoR05Source = {
    id: "syogakkoR05Source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/syogakko/r05/s4joint.pmtiles",
    }
}
const syogakkoR05Layer = {
    id: "oh-syogakkoR05",
    type: "fill",
    source: "syogakkoR05Source",
    "source-layer": "s4polygon",
    paint: {
        'fill-color': ['get', 'random_color']
    }
}
const syogakkoR05LayerLine = {
    id: "oh-syogakkoR05-line",
    type: "line",
    source: "syogakkoR05Source",
    "source-layer": "s4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const syogakkoR05LayerLabel = {
    id: "oh-syogakkoR05-label",
    type: "symbol",
    source: "syogakkoR05Source",
    "source-layer": "s4point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
const syogakkoR05LayerPoint = {
    id: "oh-syogakkoR05-point",
    type: "circle",
    source: "syogakkoR05Source",
    "source-layer": "s4point",
    'paint': {
        'circle-color': '#000',  // 固定の赤色
        'circle-radius': 6  // 半径を設定
    }
}
// 中学校ソース --------------------------------------------------------------------------------------------
const cyugakuR05Source = {
    id: "cyugakuR05Source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/cyugakko/r05/t4joint.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
// 中学校レイヤー
const cyugakuR05Layer = {
    id: "oh-cyugakuR05",
    type: "fill",
    source: "cyugakuR05Source",
    "source-layer": "t4polygon",
    paint: {
        'fill-color': ['get', 'random_color']
    }
}
const cyugakuR05LayerLine = {
    id: "oh-cyugakuR05-line",
    type: "line",
    source: "cyugakuR05Source",
    "source-layer": "t4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cyugakuR05LayerLabel = {
    id: "oh-cyugakuR05-label",
    type: "symbol",
    source: "cyugakuR05Source",
    "source-layer": "t4point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
const cyugakuR05LayerPoint = {
    id: "oh-cyugakuR05-point",
    type: "circle",
    source: "cyugakuR05Source",
    "source-layer": "t4point",
    'paint': {
        'circle-color': '#000',
        'circle-radius': 6
    }
}
// 低位地帯--------------------------------------------------------------------------------------------
const teiiSource = {
    id: "teii-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/teiichitai/teiichitai.pmtiles",
    }
}
const teiiLayer = {
    id: "oh-teii",
    type: "fill",
    source: "teii-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'G08_002'],
            // 0, 'rgba(30, 30, 30, 0.8)', // 最小値の色（濃い灰色）
            // 5, 'rgba(0, 80, 200, 0.8)', // 任意の色（濃い青）
            // 10, 'rgba(0, 0, 180, 0.8)', // 任意の色（深い青）
            // 15, 'rgba(0, 0, 130, 0.8)', // 任意の色（濃紺）
            // 20, 'rgba(0, 0, 90, 0.8)' // 最大値の色（非常に濃い紺）
            0, 'rgba(255,255,179,0.8)',    // 0.3m未満
            0.3, 'rgba(247,245,169,0.8)',  // 0.3~0.5m
            0.5, 'rgba(248,225,116,0.8)',  // 0.5~1.0m
            1.0, 'rgba(255,216,192,0.8)',  // 1.0~3.0m
            3.0, 'rgba(255,183,183,0.8)',  // 3.0~5.0m
            5.0, 'rgba(255,145,145,0.8)',  // 5.0~10.0m
            10.0, 'rgba(242,133,201,0.8)', // 10.0~20.0m
            20.0, 'rgba(220,122,220,0.8)'  // 20.0m以上
        ],
    }
}
// 地形分類--------------------------------------------------------------------------------------------
const chikeibunruiSource = {
    id: "chikeibunruiSource", obj: {
        type: "vector",
        tiles: ["https://optgeo.github.io/unite-one/zxy/{z}/{x}/{y}.pbf"],
        attribution: "国土地理院ベクトルタイル提供実験",
        minzoom: 10,
        maxzoom: 12
    }
}
const chikeibunruiLayer = {
    id: "oh-chikeibunrui",
    type: "fill",
    source: "chikeibunruiSource",
    "source-layer": "one",
    "paint": {
        "fill-color": [
            "match",
            ["get", "code"],
            "山地", "rgba(217, 203, 174, 0.8)",
            "崖・段丘崖", "rgba(148, 102, 171, 0.8)",
            "地すべり地形", "rgba(204, 153, 255, 0.8)",
            "台地・段丘", "rgba(255, 170, 0, 0.8)",
            "山麓堆積地形", "rgba(153, 128, 77, 0.8)",
            "扇状地", "rgba(202, 204, 96, 0.8)",
            "自然堤防", "rgba(255, 255, 51, 0.8)",
            "天井川", "rgba(251, 224, 157, 0.8)",
            "砂州・砂丘", "rgba(255, 255, 153, 0.8)",
            "凹地・浅い谷", "rgba(163, 204, 126, 0.8)",
            "氾濫平野", "rgba(187, 255, 153, 0.8)",
            "後背低地・湿地", "rgba(0, 209, 164, 0.8)",
            "旧河道", "rgba(102, 153, 255, 0.8)",
            "落堀", "rgba(31, 153, 153, 0.8)",
            "河川敷・浜", "rgba(159, 159, 196, 0.8)",
            "水部", "rgba(229, 255, 255, 0.8)",
            "旧水部", "rgba(119, 153, 153, 0.8)",
            "rgba(255, 0, 0, 0.8)"
        ]
    }
}
// 日本歴史地名大系ソース --------------------------------------------------------------------------------------------
const nihonrekishiSource = {
    id: "nihonrekishiSouce", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chimei/c.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
// 日本歴史地名大系レイヤー
const nihonrekishiLayer = {
    id: "oh-nihonrekishi",
    type: "circle",
    source: "nihonrekishiSouce",
    "source-layer": "point",
    'paint': {
        'circle-color': 'red',
        'circle-radius': 6
    }
}
const nihonrekishiLayerLabel = {
    id: "oh-nihonrekishi-label",
    type: "symbol",
    source: "nihonrekishiSouce",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '名称'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// ---------------------------------------------------------------------------------------------------------------------
const iryokikanSource = {
    id: "iryokikanSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/iryo/i.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
const iryokikanLayer = {
    id: "oh-iryokikan",
    type: "circle",
    source: "iryokikanSource",
    "source-layer": "i",
    'paint': {
        'circle-color': [
            'match',
            ['get', 'P04_001'],
            1, 'red',
            2, 'green',
            3, 'blue',
            'black'
        ],
        'circle-radius': 6
    }
}
const iryokikanLayerLabel = {
    id: "oh-iryokikan-label",
    type: "symbol",
    source: "iryokikanSource",
    "source-layer": "i",
    'layout': {
        'text-field': ['get', 'P04_002'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 2],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
// 100mメッシュソース --------------------------------------------------------------------------------------------
const m100mSource = {
    id: "m100mSource", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/100m/100m.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const m100mLayer = {
    id: "oh-m100m",
    type: "fill",
    source: "m100mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'PopT'],
            0, 'rgba(255,255,255,0.8)',   // Color for low values
            500, 'rgba(255,0,0,0.8)', // Intermediate value
            1400, 'rgba(0,0,0,0.8)' // Color for high values
        ],
        'fill-opacity': 1
    }
}
const m100mLayerLine = {
    id: "oh-m100m-line",
    type: "line",
    source: "m100mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
const m100mLayerLabel = {
    id: "oh-m100m-label",
    type: "symbol",
    source: "m100mSource",
    "source-layer": "polygon",
    'layout': {
        "text-field": [
            "to-string", ["round", ["get", "PopT"]]
        ],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 15
}
const m100mLayerHeight = {
    id: 'oh-m100m-height',
    type: 'fill-extrusion',
    source: "m100mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            1400, 5000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            500, 'red',
            1400, 'black'
        ]
    }
}
// 250mメッシュソース --------------------------------------------------------------------------------------------
export const m250mSource = {
    id: "m250mSource", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/250m/250m.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m250mLayer = {
    id: "oh-m250m",
    type: "fill",
    source: "m250mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            1000, 'red',
            3000, 'black'
        ]
    }
}
export const m250mLayerLine = {
    id: "oh-m250m-line",
    type: "line",
    source: "m250mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m250mLayerLabel = {
    id: "oh-m250m-label",
    type: "symbol",
    source: "m250mSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 0],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
export const m250mLayerHeight = {
    id: 'oh-m250m-height',
    type: 'fill-extrusion',
    source: "m250mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            3000, 5000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            1000, 'red',
            3000, 'black'
        ]
    }
}
// 500mメッシュソース --------------------------------------------------------------------------------------------
const m500mSource = {
    id: "m500mSource", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/500m/500m2.pmtiles",
    }
}
const m500mLayer = {
    id: "oh-m500m",
    type: "fill",
    source: "m500mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            5000, 'red',
            17500, 'black'
        ]
    }
}
const m500mLayerLine = {
    id: "oh-m500m-line",
    type: "line",
    source: "m500mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
const m500mLayerLabel = {
    id: "oh-m500m-label",
    type: "symbol",
    source: "m500mSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
const m500mLayerHeight = {
    id: 'oh-m500m-height',
    type: 'fill-extrusion',
    source: "m500mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            17500, 5000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            5000, 'red',
            17500, 'black'
        ]
    }
}
// r02推計人口250m --------------------------------------------------------------------------------------------
const r02suikei250mSource = {
    id: "r02suikei250m-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/suikei/r02suikei250m.pmtiles",
    }
}
const r02suikei250mLayer = {
    id: "oh-r02suikei250m",
    type: "fill",
    source: "r02suikei250m-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'case',
            ['==', ['get', 'PTN_2070'], 0],
            'rgba(196, 253, 187, 0.8)',
            // 'rgba(0, 0, 255, 0.8)',
            // Check if PTN_2050 or PTN_2020 is NaN
            ['any',
                ['!=', ['typeof', ['get', 'PTN_2070']], 'number'],
                ['!=', ['typeof', ['get', 'PTN_2020']], 'number']
            ],
            'rgba(196, 253, 187, 0.8)', // Color for NaN
            // 'rgba(0, 0, 255, 0.8)',
            ['==', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0], 'rgba(196, 253, 187, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 1.1], 'rgba(255, 0, 0, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 1.0], 'rgba(184, 38, 25, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.7], 'rgba(89, 119, 246, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.5], 'rgba(97, 197, 250, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.00000000000001], 'rgba(140, 252, 114, 0.8)',
            'rgba(0, 0, 0, 0)' // Default color (fully transparent)
        ]
    }
}
const r02suikei250mLayerLine = {
    id: "ohr02-suikei250m-line",
    type: "line",
    source: "r02suikei250m-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// r02推計人口500m --------------------------------------------------------------------------------------------
const r02suikei500mSource = {
    id: "r02suikei500m-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/suikei/r02suikei500m.pmtiles",
    }
}
const r02suikei500mLayer = {
    id: "oh-r02suikei500m",
    type: "fill",
    source: "r02suikei500m-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'case',
            ['==', ['get', 'PTN_2070'], 0],
            'rgba(196, 253, 187, 0.8)',
            // 'rgba(0, 0, 255, 0.8)',
            // Check if PTN_2050 or PTN_2020 is NaN
            ['any',
                ['!=', ['typeof', ['get', 'PTN_2070']], 'number'],
                ['!=', ['typeof', ['get', 'PTN_2020']], 'number']
            ],
            'rgba(196, 253, 187, 0.8)', // Color for NaN
            // 'rgba(0, 0, 255, 0.8)',
            ['==', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0], 'rgba(196, 253, 187, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 1.1], 'rgba(255, 0, 0, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 1.0], 'rgba(184, 38, 25, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.7], 'rgba(89, 119, 246, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.5], 'rgba(97, 197, 250, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.00000000000001], 'rgba(140, 252, 114, 0.8)',
            'rgba(0, 0, 0, 0)' // Default color (fully transparent)
        ]
    }
}
const r02suikei500mLayerLine = {
    id: "ohr02-suikei500m-line",
    type: "line",
    source: "r02suikei500m-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// r02推計人口1km --------------------------------------------------------------------------------------------
const r02suikei1kmSource = {
    id: "r02suikei1km-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/suikei/r02suikei1km.pmtiles",
    }
}
const r02suikei1kmLayer = {
    id: "oh-r02suikei1km",
    type: "fill",
    source: "r02suikei1km-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'case',
            ['==', ['get', 'PTN_2070'], 0],
            'rgba(196, 253, 187, 0.8)',
            // 'rgba(0, 0, 255, 0.8)',
            // Check if PTN_2050 or PTN_2020 is NaN
            ['any',
                ['!=', ['typeof', ['get', 'PTN_2070']], 'number'],
                ['!=', ['typeof', ['get', 'PTN_2020']], 'number']
            ],
            'rgba(196, 253, 187, 0.8)', // Color for NaN
            // 'rgba(0, 0, 255, 0.8)',
            ['==', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0], 'rgba(196, 253, 187, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 1.1], 'rgba(255, 0, 0, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 1.0], 'rgba(184, 38, 25, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.7], 'rgba(89, 119, 246, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.5], 'rgba(97, 197, 250, 0.8)',
            ['>', ['/', ['get', 'PTN_2070'], ['get', 'PTN_2020']], 0.00000000000001], 'rgba(140, 252, 114, 0.8)',
            'rgba(0, 0, 0, 0)' // Default color (fully transparent)
        ]
    }
}
const r02suikei1kmLayerLine = {
    id: "ohr02-suikei1km-line",
    type: "line",
    source: "r02suikei1km-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 推計人口500mm --------------------------------------------------------------------------------------------
const suikei500mSource = {
    id: "suikei500m-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/suikei/suikei500mMini2.pmtiles",
    }
}
const suikei500mLayer = {
    id: "oh-suikei500m",
    type: "fill",
    source: "suikei500m-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'case',
            ['==', ['get', 'PTN_2050'], 0],
            'rgba(196, 253, 187, 0.8)',
            ['any',
                ['!=', ['typeof', ['get', 'PTN_2050']], 'number'],
                ['!=', ['typeof', ['get', 'PTN_2020']], 'number']
            ],
            'rgba(196, 253, 187, 0.8)',
            ['==', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0], 'rgba(196, 253, 187, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 1.1], 'rgba(255, 0, 0, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 1.0], 'rgba(184, 38, 25, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.7], 'rgba(89, 119, 246, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.5], 'rgba(97, 197, 250, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.00000000000001], 'rgba(140, 252, 114, 0.8)',
            'rgba(0, 0, 0, 0)'
        ]
    }
}
const suikei500mLayerLine = {
    id: "oh-suikei500m-line",
    type: "line",
    source: "suikei500m-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 0,
            12, 0.5
        ]
    },
}
// 推計人口1kmフル --------------------------------------------------------------------------------------------
const suikei1kmFullSource = {
    id: "suikei1km-full-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/suikei/suikei1km.pmtiles",
    }
}
const suikei1kmFullLayer = {
    id: "oh-suikei1km-full",
    type: "fill",
    source: "suikei1km-full-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'case',
            ['==', ['get', 'PTN_2050'], 0],
            'rgba(196, 253, 187, 0.8)',
            ['any',
                ['!=', ['typeof', ['get', 'PTN_2050']], 'number'],
                ['!=', ['typeof', ['get', 'PTN_2020']], 'number']
            ],
            'rgba(196, 253, 187, 0.8)',
            ['==', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0], 'rgba(196, 253, 187, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 1.1], 'rgba(255, 0, 0, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 1.0], 'rgba(184, 38, 25, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.7], 'rgba(89, 119, 246, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.5], 'rgba(97, 197, 250, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.00000000000001], 'rgba(140, 252, 114, 0.8)',
            'rgba(0, 0, 0, 0)'
        ]
    }
}
const suikei1kmFullLayerLine = {
    id: "oh-suikei1km-full-line",
    type: "line",
    source: "suikei1km-full-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 推計人口1km --------------------------------------------------------------------------------------------
const suikei1kmSource = {
    id: "suikei1km-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/suikei/suikei1kmMini2.pmtiles",
    }
}
const suikei1kmLayer = {
    id: "oh-suikei1km",
    type: "fill",
    source: "suikei1km-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'case',
            ['==', ['get', 'PTN_2050'], 0],
            'rgba(196, 253, 187, 0.8)',
            // 'rgba(0, 0, 255, 0.8)',
            // Check if PTN_2050 or PTN_2020 is NaN
            ['any',
                ['!=', ['typeof', ['get', 'PTN_2050']], 'number'],
                ['!=', ['typeof', ['get', 'PTN_2020']], 'number']
            ],
            'rgba(196, 253, 187, 0.8)', // Color for NaN
            // 'rgba(0, 0, 255, 0.8)',
            ['==', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0], 'rgba(196, 253, 187, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 1.1], 'rgba(255, 0, 0, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 1.0], 'rgba(184, 38, 25, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.7], 'rgba(89, 119, 246, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.5], 'rgba(97, 197, 250, 0.8)',
            ['>', ['/', ['get', 'PTN_2050'], ['get', 'PTN_2020']], 0.00000000000001], 'rgba(140, 252, 114, 0.8)',
            'rgba(0, 0, 0, 0)' // Default color (fully transparent)
        ]
    }
}
const suikei1kmLayerLine = {
    id: "oh-suikei1km-line",
    type: "line",
    source: "suikei1km-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 1kmメッシュソース --------------------------------------------------------------------------------------------
export const m1kmSource = {
    id: "m1kmSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/1km/1km2.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m1kmLayer = {
    id: "oh-m1km",
    type: "fill",
    source: "m1kmSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            10000, 'red',
            35000, 'black'
        ]
    }
}
export const m1kmLayerLine = {
    id: "oh-m1km-line",
    type: "line",
    source: "m1kmSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m1kmLayerLabel = {
    id: "oh-m1km-label",
    type: "symbol",
    source: "m1kmSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
export const m1kmLayerHeight = {
    id: 'oh-m1km-height',
    type: 'fill-extrusion',
    source: "m1kmSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            35000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            10000, 'red',
            35000, 'black'
        ]
    }
}
// 地理院250mメッシュソース --------------------------------------------------------------------------------------------
export const chiriin250mSource = {
    id: "chiriin250m-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/chiriin250m/chiriin250m3.pmtiles"
    }
}
export const chiriin250mLayer = {
    id: "oh-chiriin250m",
    type: "fill",
    source: "chiriin250m-source",
    "source-layer": "polygon",
    'paint': {
        "fill-color": ['get', '_fillColor']
    },
    'max-opacity': 0.9
}
export const chiriin250mLayerLine = {
    id: "oh-m250m-line",
    type: "line",
    source: "chiriin250m-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 0,
            12, 0.5
        ]
    },
}
export const chiriin250mLayerLabel = {
    id: "oh-chiriin250m-label",
    type: "symbol",
    source: "chiriin250m-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 0],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
const chiriin250mLayerHeight = {
    id: 'oh-chiriin250m-height',
    type: 'fill-extrusion',
    source: "chiriin250m-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', '人口（人）'],
            0, 50.0, // 高さの最小値を50mに設定
            10000, 5000 // 高さの最大値を5000mに設定
        ],
        'fill-extrusion-color': ['get', '_fillColor'],
    }
}
// ---------------------------------------------------------------------------------------------------------------------
// 全国旧石器
export const kyusekkiSource = {
    id: "kyusekkiSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kyusekki/kyusekki.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
export const kyusekkiLayer = {
    id: "oh-kyusekki",
    type: "circle",
    source: "kyusekkiSource",
    "source-layer": "point",
    "minzoom":12,
    'paint': {
        'circle-color': '#3cb371',
        'circle-radius': 8,
    }
}
export const kyusekkiLayerHeatmap = {
    id: "oh-kyusekki-heatmap",
    type: "heatmap",
    source: "kyusekkiSource",
    "source-layer": "point",
    "maxzoom":12,
    paint: {
        // ヒートマップの密度に基づいて各ピクセルの色を定義
        "heatmap-color": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 入力より小さいストップと大きいストップのペアを直線的に補間
            ["linear"],
            // ヒートマップレイヤーの密度推定値を取得
            ["heatmap-density"],
            0,
            "rgba(255, 255, 255, 0)",
            0.5,
            "rgba(60, 179, 113, 0.6)",
            // 1に近づくほど密度が高い
            1,
            "rgba(255, 215, 0, 0.8)",
        ],
        // ヒートマップ1点の半径（ピクセル単位）
        "heatmap-radius": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 出力が増加する割合を制御する、1に近づくほど出力が増加する
            ["exponential", 10],
            // ズームレベルに応じて半径を調整する
            ["zoom"],
            2,
            20,
            5,
            20,
            14,
            20,
            50,
            20
        ],
    }
}
// 河川ソース --------------------------------------------------------------------------------------------
const kasenSource = {
    id: "kasenSource", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kasen/kasen3.pmtiles",
    }
}
const kasenLayer = {
    id: "oh-kasen",
    type: "line",
    source: "kasenSource",
    "source-layer": "line",
    paint: {
        'line-color': 'blue',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, [
                '*',
                0.1,
                ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ],
            11, [
                '*',
                1,
                ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ],
            12, [
                '*',
                2,
                ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ],
            14, [
                '*',
                3,
                ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ],
            16, [
                '*',
                5,
                ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ],
        ]
    },
};
const kasenGlowLayer = {
    id: "oh-kasen-glow",
    type: "line",
    source: "kasenSource",
    "source-layer": "line",
    paint: {
        'line-color': 'rgba(0, 0, 255, 0.3)', // Outer glow color
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 1,
            18, 20
        ],
        'line-blur': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 2,
            18, 7
        ]
    },
    layout: {
        'visibility': 'visible'
    }
};
const kasenLayerLabel = {
    id: "oh-kasen-label",
    type: "symbol",
    source: "kasenSource",
    "source-layer": "line",
    'layout': {
        'text-field': ['get', 'W05_004'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12,
    filter: ['!=', 'W05_004', '名称不明'],
}
// ---------------------------------------------------------------------------------------------------------------------
// 災害伝承碑
const densyohiSource = {
    id: "densyohi-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/densyohi/densyohi.pmtiles",
    }
}
const densyohiLayer = {
    id: "oh-densyohi",
    type: "circle",
    source: "densyohi-source",
    "source-layer": "point",
    'paint': {
        'circle-color': '#3cb371',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 1,
            4, 3,
            7, 6,
            11, 10
        ]
    }
}
const densyohiLayerLabel = {
    id: "oh-densyohi-label",
    type: "symbol",
    source: "densyohi-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '碑名'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'minzoom': 10
}

// const densyohiLayer2 = {
//     id: "oh-densyohi",
//     type: "symbol",
//     source: "densyohiSource",
//     "source-layer": "point",
//     "layout": {
//         "icon-image": "densyouhi",  // JSONに記述されたアイコン名を指定
//         "icon-size": 1.0
//     }
// }
// did------------------------------------------------------------------------------------------------------------------
const didSource = {
    id: "did-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/did/did.pmtiles",
    }
}
const didLayer = {
    id: "oh-did",
    type: "fill",
    source: "did-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'rgba(255,192,203,0.8)'
    }
}
const didLayerLine = {
    id: "oh-did_line",
    type: "line",
    source: "did-source",
    "source-layer": "4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
// 選挙区----------------------------------------------------------------------------------------------------------------
const senkyokuSource = {
    id: "senkyoku-source", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/senkyoku/senkyoku2022.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
const senkyokuLayer = {
    id: "oh-senkyoku",
    type: "fill",
    source: "senkyoku-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
const senkyokuLayerLine = {
    id: "oh-senkyoku_line",
    type: "line",
    source: "senkyoku-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
const senkyokuLayerLabel = {
    id: "oh-senkyoku-label",
    type: "symbol",
    source: "senkyoku-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'kuname'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// 地価--------------------------------------------------------------------------------------------------------------
const chikaSource3d = {
    id: "chika-source-3d", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chika/chika3d.pmtiles",
    }
}
const chikaLayerLabel = {
    id: "oh-chika-label",
    type: "symbol",
    source: "chika-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'L01_025'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
const chikaLayerPoint = {
    id: "oh-koji_point",
    type: "circle",
    source: "koji-source",
    "source-layer": "point",
    'paint': {
        'circle-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'L01_008']],
            0, 'white',
            500000, 'red',
            50000000, 'black'
        ],
        'circle-stroke-color': 'black',
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0,
            10, 1
        ],
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 8
        ]
    }
}
const chikalayerheight = {
    id: 'oh-chika-height',
    type: 'fill-extrusion',
    source: "chika-source-3d",
    "source-layer": "polygon",
    filter: [
        "!=", ["get", "L02_003"], "020" // フィールドL02_003が020のときは表示しない
    ],
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', 'L02_006'],
            0, 50.0, // 高さの最小値を50mに設定
            50000000, 5000.0 // 高さの最大値を5000mに設定
        ],
        'fill-extrusion-color': [
            'step',
            ['get', 'L02_006'],
            'rgb(245, 245, 81)', // 10万未満の色
            100000, 'rgb(239, 211, 71)', // 10万から25万の色
            250000, 'rgb(235, 178, 61)', // 25万から50万の色
            500000, 'rgb(231, 145, 52)', // 50万から75万の色
            750000, 'rgb(226, 84, 39)', // 75万から100万の色
            1000000, 'rgb(225, 61, 35)', // 100万から1000万の色
            10000000, 'rgb(225, 49, 33)', // 1000万から2000万の色
            20000000, 'rgb(180, 30, 25)', // 2000万から4000万をさらに赤黒く
            40000000, 'rgb(160, 20, 20)' // 4000万以上をさらにさらに赤黒く
        ]
    }
}
// 公示価格--------------------------------------------------------------------------------------------------------------
const r07kojiSource = {
    id: "r07koji-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz4.xsrv.jp/pmtiles/kojikakaku/r07kojikakaku.pmtiles",
    }
}
const r07kojiLayerLabel = {
    id: "oh-r07koji-label",
    type: "symbol",
    source: "r07koji-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'L01_025'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
const r07kojiLayerPoint = {
    id: "oh-r07koji_point",
    type: "circle",
    source: "r07koji-source",
    "source-layer": "point",
    'paint': {
        'circle-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'L01_008']],
            0, 'white',
            500000, 'red',
            50000000, 'black'
        ],
        'circle-stroke-color': 'black',
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0,
            10, 1
        ],
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 8
        ]
    }
}
const r07kojilayerheight = {
    id: 'oh-r07koji-height',
    type: 'fill-extrusion',
    source: "r07koji-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'L01_008']],
            0, 50.0, // 高さの最小値を50mに設定
            50000000, 5000.0 // 高さの最大値を5000mに設定
        ],
        'fill-extrusion-color': [
            'step',
            ['get', 'L01_008'],
            'rgb(245, 245, 81)', // 10万未満の色
            100000, 'rgb(239, 211, 71)', // 10万から25万の色
            250000, 'rgb(235, 178, 61)', // 25万から50万の色
            500000, 'rgb(231, 145, 52)', // 50万から75万の色
            750000, 'rgb(226, 84, 39)', // 75万から100万の色
            1000000, 'rgb(225, 61, 35)', // 100万から1000万の色
            10000000, 'rgb(225, 49, 33)', // 1000万から2000万の色
            20000000, 'rgb(180, 30, 25)', // 2000万から4000万をさらに赤黒く
            40000000, 'rgb(160, 20, 20)' // 4000万以上をさらにさらに赤黒く
        ]
    }
}

const kojiSource = {
    id: "koji-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kojikakaku/kojikakaku2.pmtiles",
    }
}
const kojiLayerLabel = {
    id: "oh-koji-label",
    type: "symbol",
    source: "koji-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'L01_025'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 1)',
        'text-halo-color': 'rgba(0,0,0,1)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
const kojiLayerPoint = {
    id: "oh-koji_point",
    type: "circle",
    source: "koji-source",
    "source-layer": "point",
    'paint': {
        'circle-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'L01_008']],
            0, 'white',
            500000, 'red',
            50000000, 'black'
        ],
        'circle-stroke-color': 'black',
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0,
            10, 1
        ],
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 8
        ]
    }
}
const kojilayerheight = {
    id: 'oh-koji-height',
    type: 'fill-extrusion',
    source: "koji-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'L01_008']],
            0, 50.0, // 高さの最小値を50mに設定
            50000000, 5000.0 // 高さの最大値を5000mに設定
        ],
        'fill-extrusion-color': [
            'step',
            ['get', 'L01_008'],
            'rgb(245, 245, 81)', // 10万未満の色
            100000, 'rgb(239, 211, 71)', // 10万から25万の色
            250000, 'rgb(235, 178, 61)', // 25万から50万の色
            500000, 'rgb(231, 145, 52)', // 50万から75万の色
            750000, 'rgb(226, 84, 39)', // 75万から100万の色
            1000000, 'rgb(225, 61, 35)', // 100万から1000万の色
            10000000, 'rgb(225, 49, 33)', // 1000万から2000万の色
            20000000, 'rgb(180, 30, 25)', // 2000万から4000万をさらに赤黒く
            40000000, 'rgb(160, 20, 20)' // 4000万以上をさらにさらに赤黒く
        ]
    }
}
// 神社 --------------------------------------------------------------------------------------------
const jinjyaSource = {
    id: "jinjya-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/jinjya/jinjya.pmtiles",
    }
}
const jinjyaLayer = {
    id: "oh-jinjya-layer",
    type: "circle",
    source: "jinjya-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'navy',
        'circle-radius':[
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            2, 1,
            4, 3,
            7, 6,
            11, 10
        ]
    }
}
const jinjyaLayerLabel = {
    id: "oh-jinjya-label",
    type: "symbol",
    source: "jinjya-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 道の駅 --------------------------------------------------------------------------------------------
const michinoekiSource = {
    id: "michinoeki-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/michinoeki/michinoeki.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const michinoekiLayer = {
    id: "oh-michinoeki",
    type: "circle",
    source: "michinoeki-source",
    "source-layer": "michinoeki",
    'paint': {
        'circle-color': 'navy',
        'circle-radius':[
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            2, 1,
            4, 3,
            7, 6,
            11, 10
            ]
    }
}
const michinoekiLayerLabel = {
    id: "oh-michinoeki-label",
    type: "symbol",
    source: "michinoeki-source",
    "source-layer": "michinoeki",
    'layout': {
        'text-field': ['get', 'P35_006'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 東京地震----------------------------------------------------------------------------------------------------------------
const tokyojishinSource = {
    id: "tokyojishin-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tokyojishin/tokyojishin.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const tokyojishinLayerSogo = {
    id: "oh-tokyojishin",
    type: "fill",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', '総合_ラ'],
            1, 'rgb(162,209,229,0.8)',
            2, 'rgb(125,170,118,0.8)',
            3, 'rgb(206,135,52,0.8)',
            4, 'rgb(213,64,43,0.8)',
            5, 'rgb(79,19,19,0.8)',
            'red' // Default color (if no match)
        ],
    },
}
export const tokyojishinLayer = {
    id: "oh-tokyojishin",
    type: "fill",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
const tokyojishinLayerLine = {
    id: "oh-tokyojishin_line",
    type: "line",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
const tokyojishinLayerLabel = {
    id: "oh-tokyojishin-label",
    type: "symbol",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', '町丁目名'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 16
}
// export const tokyojishinheight = {
//     id: 'oh-tokyojishin-height',
//     type: 'fill-extrusion',
//     source: "tokyojishin-source",
//     "source-layer": "polygon",
//     paint: {
//         'fill-extrusion-height': [
//             'interpolate',
//             ['linear'],
//             ["to-number",['get', '総合_順']],
//             0, 10,
//             6000, 3000
//         ],
//         'fill-extrusion-color': [
//             'interpolate',
//             ['linear'],
//             ["to-number",['get', '総合_順']],
//             0, 'white',
//             4000, 'red',
//             6000, 'black'
//         ]
//     }
// }
const tokyojishinheightSogo = {
    id: 'oh-tokyojishin-height',
    type: 'fill-extrusion',
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'match',
            ['get', '総合_ラ'],
            1, 100,
            2, 500,
            3, 1500,
            4, 2000,
            5, 2500,
            0 // Default color (if no match)
        ],
        'fill-extrusion-color': [
            'match',
            ['get', '総合_ラ'],
            1, 'rgb(162,209,229,0.8)',
            2, 'rgb(125,170,118,0.8)',
            3, 'rgb(206,135,52,0.8)',
            4, 'rgb(213,64,43,0.8)',
            5, 'rgb(79,19,19,0.8)',
            'red'
        ]
    }
}
// ハザードマップ等--------------------------------------------------------------------------------------------------------
// 避難所洪水 --------------------------------------------------------------------------------------------
const hinanjyoKozuiSource = {
    id: "hinanjyo-kozui-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hinanjyo/hinanjyo-kozui.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const hinanjyoKozuiLayer = {
    id: "oh-hinanjyo-kozui",
    type: "circle",
    source: "hinanjyo-kozui-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'steelblue',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const hinanjyoKozuiLayerLabel = {
    id: "oh-hinanjyo-kozui-label",
    type: "symbol",
    source: "hinanjyo-kozui-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'minzoom': 13
}
// 避難所津波 --------------------------------------------------------------------------------------------
const hinanjyoTsunamiSource = {
    id: "hinanjyo-tsunami-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hinanjyo/hinanjyo-tsunami.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const hinanjyoTsunamiLayer = {
    id: "oh-hinanjyo-tsunami",
    type: "circle",
    source: "hinanjyo-tsunami-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'blue',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const hinanjyoTsunamiLayerLabel = {
    id: "oh-hinanjyo-tsunami-label",
    type: "symbol",
    source: "hinanjyo-tsunami-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'minzoom': 13
}
// 避難所土石流 --------------------------------------------------------------------------------------------
const hinanjyoDosekiryuSource = {
    id: "hinanjyo-dosekiryu-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hinanjyo/hinanjyo-dosekiryu.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const hinanjyoDosekiryuLayer = {
    id: "oh-hinanjyo-dosekiryu",
    type: "circle",
    source: "hinanjyo-dosekiryu-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'tomato',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const hinanjyoDosekiryuLayerLabel = {
    id: "oh-hinanjyo-dosekiryu-label",
    type: "symbol",
    source: "hinanjyo-dosekiryu-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// 冠水 --------------------------------------------------------------------------------------------
const kansuiSource = {
    id: "kansui-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kansui/kansui.pmtiles",
    }
}
const kansuiLayer = {
    id: "oh-kansui",
    type: "circle",
    source: "kansui-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'navy',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.2,
            4, 1,
            7, 4,
            11, 10
        ]
    }
}
const kansuiLayerLabel = {
    id: "oh-kansui-label",
    type: "symbol",
    source: "kansui-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// R05大規模盛土造成地-----------------------------------------------------------------------------------------------------
const zoseiSource = {
    id: "zosei-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/zosei/zosei.pmtiles",
    }
}
const zoseiLayer = {
    id: "oh-zosei",
    type: "fill",
    source: "zosei-source",
    "source-layer": "polygon",
    paint: {
        // 'fill-color': 'rgba(179,253,165,0.8)'
        'fill-color': [
            'match',
            ['get', 'A54_001'],
            '1', 'rgba(179,253,165,0.8)',
            '2', 'rgba(155,155,248,0.8)',
            '9', 'rgba(0,255,0,0.8)',
            'red'
        ]
    }
}
const zoseiLayerLine = {
    id: "oh-zosei-line",
    type: "line",
    source: "zosei-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
const zoseiLayerLabel = {
    id: "oh-zosei-label",
    type: "symbol",
    source: "zosei-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': [
            'match',
            ['get', 'A54_001'],
            '1', '谷埋め型',
            '2', '腹付け型',
            '9', '区分をしていない',
            'その他' // デフォルトのテキスト
        ],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 14
}
// rgbで値を取得するレイヤー------------------------------------------------------------------------------------------------
// シームレス地質図--------------------------------------------------------------------------------------------------------
const seamlessSource = {
    id: 'seamless-source', obj: {
        type: 'raster',
        tiles: ['https://gbank.gsj.jp/seamless/v2/api/1.2/tiles/{z}/{y}/{x}.png?layer=glf'],
        rasterResampling: 'nearest',
    }
}
const seamlessLayer = {
    'id': 'oh-rgb-seamless-layer',
    'type': 'raster',
    'source': 'seamless-source',
    'max-opacity': 0.8
}
// 土砂災害警戒区域--------------------------------------------------------------------------------------------------------
const dosyaSource = {
    id: 'dosya-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const dosyaLayer = {
    'id': 'oh-rgb-dosya-layer',
    'type': 'raster',
    'source': 'dosya-source',
    'max-opacity': 0.8
}
// 土石流危険渓流------------------------------------------------------------------------------------------------------
const dosekiryuSource = {
    id: 'dosekiryu-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_dosekiryukikenkeiryu/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const dosekiryuLayer = {
    'id': 'oh-rgb-dosekiryu-layer',
    'type': 'raster',
    'source': 'dosekiryu-source',
    'max-opacity': 0.8
}
// 急傾斜地崩壊危険箇所------------------------------------------------------------------------------------------------------
const kyukeisyaSource = {
    id: 'kyukeisya-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_kyukeisyachihoukai/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const kyukeisyaLayer = {
    'id': 'oh-rgb-kyukeisya-layer',
    'type': 'raster',
    'source': 'kyukeisya-source',
    'max-opacity': 0.8,
    paint: {
        'raster-hue-rotate': 180,          // 色相
        'raster-brightness-min': 0.1,     // 最小輝度
        'raster-brightness-max': 1.0,     // 最大輝度
        'raster-saturation': 0.8          // 彩度
    }
}
// 地すべり危険箇所------------------------------------------------------------------------------------------------------
const jisuberiSource = {
    id: 'jisuberi-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_jisuberikikenkasyo/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const jisuberiLayer = {
    'id': 'oh-rgb-jisuberi-layer',
    'type': 'raster',
    'source': 'jisuberi-source',
    'max-opacity': 0.8
}
// 洪水浸水想定（最大）------------------------------------------------------------------------------------------------------
const kozuiSaidaiSource = {
    id: 'kozui-saidai-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const kozuiSaidaiLayer = {
    'id': 'oh-rgb-kozui-saidai-layer',
    'type': 'raster',
    'source': 'kozui-saidai-source',
    'max-opacity': 0.8,
}
// 洪水浸水想定（計画規模）------------------------------------------------------------------------------------------------------
const kozuikeikskuSource = {
    id: 'kozui-keikaku-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l1_shinsuishin_newlegend_kuni_data/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const kozuiKeikskuLayer = {
    'id': 'oh-rgb-kozui-keikaku-layer',
    'type': 'raster',
    'source': 'kozui-keikaku-source',
    'max-opacity': 0.8,
}
// 津波------------------------------------------------------------------------------------------------------
const tsunamiSource = {
    id: 'tsunami-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const tsunamiLayer = {
    'id': 'oh-rgb-tsunami-layer',
    'type': 'raster',
    'source': 'tsunami-source',
    'max-opacity': 0.8
}
// ため池決壊------------------------------------------------------------------------------------------------------
const tameikeSource = {
    id: 'tameike-source', obj: {
        type: 'raster',
        tiles: ['https://disaportal.gsi.go.jp/data/raster/07_tameike/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const tameikeLayer = {
    'id': 'oh-rgb-tameike-layer',
    'type': 'raster',
    'source': 'tameike-source',
    'max-opacity': 0.8
}
// rgbで値を取得するレイヤー ここまで-----------------------------------------------------------------------------------------

// 明治期の低湿地------------------------------------------------------------------------------------------------------
const shitchiSource = {
    id: 'shitchi-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/swale/{z}/{x}/{y}.png'],
        rasterResampling: 'nearest',
    }
}
const shitchiLayer = {
    'id': 'oh-rgb-shitchi-layer',
    'type': 'raster',
    'source': 'shitchi-source',
    'max-opacity': 0.8
}

// Q地図橋梁 --------------------------------------------------------------------------------------------
const qKyouryoSource = {
    id: "q-kyoryo-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/q/kyoryo/kyoryo.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const qKyoryoLayer = {
    id: "oh-q-kyoryo",
    type: "circle",
    source: "q-kyoryo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'steelblue',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const qKyoryoLayerLabel = {
    id: "oh-q-kyoryo-label",
    type: "symbol",
    source: "q-kyoryo-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '_html'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// Q地図トンネル --------------------------------------------------------------------------------------------
const qTunnelSource = {
    id: "q-tunnel-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/q/tunnel/tunnel.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const qTunnelLayer = {
    id: "oh-q-tunnel",
    type: "circle",
    source: "q-tunnel-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'peru',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const qTunnelLayerLabel = {
    id: "oh-q-tunnel-label",
    type: "symbol",
    source: "q-tunnel-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '_html'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// R05用途地域-----------------------------------------------------------------------------------------------------
const yotochiikiSource = {
    id: "yotochiiki-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/yotochiiki/r05/y.pmtiles",
    }
}
const yotochiikiLayer = {
    id: "oh-yotochiiki",
    type: "fill",
    source: "yotochiiki-source",
    "source-layer": "y",
    paint: {
        'fill-color': [
            'match',
            ['get', 'YoutoID'],
            1, 'rgba(92,201,59,0.8)',
            2, 'rgba(92,201,59,0.8)',
            3, 'rgba(214,254,81,0.8)',
            4, 'rgba(255,255,209,0.8)',
            5, 'rgba(255,255,84,0.8)',
            6, 'rgba(247,206,160,0.8)',
            7, 'rgba(247,206,85,0.8)',
            8, 'rgba(247,206,85,0.8)',
            9, 'rgba(247,206,252,0.8)',
            10, 'rgba(241,158,202,0.8)',
            11, 'rgba(196,155,249,0.8)',
            12, 'rgba(214,254,254,0.8)',
            13, 'rgba(164,203,203,0.8)',
            99, 'rgba(200,200,200,0.8)',
            'red'
        ]
    }
}
const yotochiikiLayerHeight = {
    id: "oh-yotochiiki-height",
    type: "fill-extrusion",
    source: "yotochiiki-source",
    "source-layer": "y",
    paint: {
        'fill-extrusion-color': [
            'match',
            ['get', 'YoutoID'],
            1, 'rgba(92,201,59,0.8)',
            2, 'rgba(92,201,59,0.8)',
            3, 'rgba(214,254,81,0.8)',
            4, 'rgba(255,255,209,0.8)',
            5, 'rgba(255,255,84,0.8)',
            6, 'rgba(247,206,160,0.8)',
            7, 'rgba(247,206,85,0.8)',
            8, 'rgba(247,206,85,0.8)',
            9, 'rgba(247,206,252,0.8)',
            10, 'rgba(241,158,202,0.8)',
            11, 'rgba(196,155,249,0.8)',
            12, 'rgba(214,254,254,0.8)',
            13, 'rgba(164,203,203,0.8)',
            99, 'rgba(200,200,200,0.8)',
            'red'
        ],
        'fill-extrusion-height': [
            'match',
            ['get', 'YoutoID'],
            1, 20, // 住宅用: 高さ20メートル
            2, 20,
            3, 30,
            4, 30,
            5, 20,
            6, 20,
            7, 20,
            9, 50, // 商業用: 高さ40メートル
            10, 60,
            11, 40, // 工業用: 高さ30メートル
            12, 40,
            13, 40,
            10 // その他: 高さ10メートル
        ],
    }
}
const yotochiikiLayerLine = {
    id: "oh-yotochiiki-line",
    type: "line",
    source: "yotochiiki-source",
    "source-layer": "y",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0,
            11, 1
        ]
    },
}
const yotochiikiLayerLabel = {
    id: "oh-yotochiiki-label",
    type: "symbol",
    source: "yotochiiki-source",
    "source-layer": "y",
    'layout': {
        'text-field': ['get', '用途地域'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 14
}
// 関東小字地図-----------------------------------------------------------------------------------------------------
const koazaSource = {
    id: "koaza-source", obj: {
        type: "vector",
        // url: "pmtiles://https://kenzkenz.xsrv.jp/open-hinata3/php/proxy2.php?url=https://koaza.net/border/koaza.pmtiles",
        url: "pmtiles://https://kenzkenz2.xsrv.jp/pmtiles/koazachizu/koaza.pmtiles",
    }
}
const koazaLayer = {
    id: "oh-koaza",
    type: "fill",
    source: "koaza-source",
    "source-layer": "koaza",
    paint: {
        'fill-color': 'rgba(255,255,255,0.1)'
    },
}
const koazaLayerLine = {
    id: "oh-koaza-line",
    type: "line",
    source: "koaza-source",
    "source-layer": "koaza",
    paint: {
        'line-color': 'hotpink',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 1,
            14, 4
        ]
    },
}
const koazaLayerLabel = {
    id: "oh-koaza-label",
    type: "symbol",
    source: "koaza-source",
    "source-layer": "koaza",
    'layout': {
        'text-field': ['get', 'KOAZA_NAME'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'hotpink',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 14
}
// ---------------------------------------------------
const muraSource = {
    id: "mura-source", obj: {
        type: "vector",
        // url: "pmtiles://https://koaza.net/border/mura.pmtiles",
        url: "pmtiles://https://kenzkenz2.xsrv.jp/pmtiles/koazachizu/mura.pmtiles",
    }
}
const muraLayer = {
    id: "oh-mura",
    type: "fill",
    source: "mura-source",
    "source-layer": "mura",
    paint: {
        'fill-color': 'rgba(0,0,0,0)'
    },
}
const muraLayerLine = {
    id: "oh-mura-line",
    type: "line",
    source: "mura-source",
    "source-layer": "mura",
    paint: {
        'line-color': 'blue',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.5,
            14, 4
        ]
    },
}
// const muraLayerLabel = {
//     id: "oh-mura-label",
//     type: "symbol",
//     source: "mura-source",
//     "source-layer": "polygon",
//     // 'layout': {
//     //     'text-field': ['get', 'MURA_NAME'],
//     //     'text-font': ['NotoSansJP-Regular'],
//     // },
//     layout: {
//         'text-field': ['get', 'MURA_NAME'],
//         'text-font': ['NotoSansJP-Regular'],
//         'text-anchor': 'center',
//         'symbol-placement': 'point', // ポイントとして配置
//         'text-allow-overlap': false, // ラベルの重複を防ぐ
//         'text-size': 20,
//         'text-max-width': 50,
//         'text-offset': [0, 0],
//     },
//     'paint': {
//         'text-color': 'blue',
//         'text-halo-color': 'white',
//         'text-halo-width': 1.0,
//     },
//     'minzoom': 13
// }


const muraCenterSource = {
    id: "mura-center-source", obj: {
        type: "vector",
        // url: "pmtiles://https://osaru-san1.github.io/border/mura.pmtiles",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/koaza/mura_center_point.pmtiles",
    }
}
const muraCenterLabel = {
    id: "oh-mura-center-label",
    type: "symbol",
    source: "mura-center-source",
    "source-layer": "point",
    layout: {
        'text-field': ['get', 'MURA_NAME'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'blue',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 13
}
// dronebird---------------------------------------------------------------------------------------------------------
const dronebirdSource = {
    id: 'dronebird-source', obj: {
        type: 'raster',
        tiles: ['https://apps.kontur.io/raster-tiler/oam/mosaic/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const dronebirdLayer = {
    'id': 'oh-dronebird-layer',
    'type': 'raster',
    'source': 'dronebird-source',
}
// 明治中期の郡 --------------------------------------------------------------------------------------------
const cityGunSource = {
    id: "oh-city-gun-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/gun/gun.pmtiles",
    }
}
const cityGunLayer = {
    id: "oh-city-gun",
    type: "fill",
    source: "oh-city-gun-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color'],
    }
}
const cityGunLayerLine = {
    id: "oh-city-gun-line",
    type: "line",
    source: "oh-city-gun-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cityGunLayerLabel = {
    id: "oh-city-gun-label",
    type: "symbol",
    source: "oh-city-gun-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'GUN'],
        'text-font': ['NotoSansJP-Regular'],
        'symbol-placement': 'point',
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 8
}
// 市町村大正09年 --------------------------------------------------------------------------------------------
const cityT09Source = {
    id: "oh-city-t09-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/city/t09/t09.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const cityT09Layer = {
    id: "oh-city-t09",
    type: "fill",
    source: "oh-city-t09-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color'],
    }
}
const cityT09LayerLine = {
    id: "oh-city-t09-line",
    type: "line",
    source: "oh-city-t09-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cityT09LayerLabel = {
    id: "oh-city-t09-label",
    type: "symbol",
    source: "oh-city-t09-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'N03_004'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 10
}
// 市町村平成12年 --------------------------------------------------------------------------------------------
const cityH12Source = {
    id: "oh-city-h12-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/city/h12/h12.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const cityH12Layer = {
    id: "oh-city-h12",
    type: "fill",
    source: "oh-city-h12-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color'],
    }
}
const cityH12LayerLine = {
    id: "oh-city-h12-line",
    type: "line",
    source: "oh-city-h12-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cityH12LayerLabel = {
    id: "oh-city-h12-label",
    type: "symbol",
    source: "oh-city-h12-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'N03_004'],
        'text-font': ['NotoSansJP-Regular'],
        'symbol-placement': 'point',
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 10
}
// 市町村令和５年 --------------------------------------------------------------------------------------------
const cityR05Source = {
    id: "oh-city-r05-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/city/r05/r05.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const cityR05Layer = {
    id: "oh-city-r05",
    type: "fill",
    source: "oh-city-r05-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color'],
    }
}
const cityR05LayerLine = {
    id: "oh-city-r05-line",
    type: "line",
    source: "oh-city-r05-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cityR05LayerLabel = {
    id: "oh-city-r05-label",
    type: "symbol",
    source: "oh-city-r05-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'N03_004'],
        'text-font': ['NotoSansJP-Regular'],
        'symbol-placement': 'point',
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 10
}
// エコリス植生図---------------------------------------------------------------------------------------------------------
const ecoris67Source = {
    id: 'ecoris67-source', obj: {
        type: 'raster',
        tiles: ['https://map.ecoris.info/tiles/vege67/{z}/{x}/{y}.png'],
    }
}
const ecoris67Layer = {
    'id': 'oh-ecoris67-layer',
    'type': 'raster',
    'source': 'ecoris67-source',
    'raster-resampling': 'nearest'
}
// 東京都土地利用現況調査----------------------------------------------------------------------------------------------------------------
export const tochiriyoSource = {
    id: "tochiriyo-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tokyotochiriyo/t.pmtiles",
    }
}
export const tochiriyoLayer = {
    id: "oh-tochiriyo",
    type: "fill",
    source: "tochiriyo-source",
    "source-layer": "t",
    paint: {
        'fill-color': [
            'match',
            ['get', 'LU_1'],

            '111', 'rgba(128,128,128,0.7)', // 官公庁施設
            '112', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,192,255,0.7)', // 教育施設
                '2', 'rgba(240,230,140,0.7)', // 文化施設
                '3', 'rgba(255,215,0,0.7)', // 宗教施設
                /* default */ 'rgba(0,0,0,0)' // Default color if LU_2 doesn't match
            ],
            '113', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(255,192,203,0.7)', // 医療施設
                '2', 'rgba(219,112,147,0.7)', // 厚生施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '114', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,0,255,0.7)', // 供給施設
                '2', 'rgba(0,0,139,0.7)', // 処理施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '121', 'rgba(255,127,80,0.7)', // 事務所建築物
            '122', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(255,0,0,0.7)', // 商業施設
                '2', 'rgba(255,99,71,0.7)', // 公衆浴場等
                /* default */ 'rgba(0,0,0,0)'
            ],
            '123', 'rgba(255,69,0,0.7)', // 住商併用建物
            '124', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,255,127,0.7)', // 宿泊施設
                '2', 'rgba(124,255,2,0.7)', // 遊興施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '125', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,255,255,0.7)', // スポーツ施設
                '2', 'rgba(64,224,208,0.7)', // 興行施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '131', 'rgba(60,179,113,0.7)', // 独立住宅
            '132', 'rgba(0,100,0,0.7)', // 集合住宅
            '141', 'rgba(105,105,105,0.7)', // 専用工場
            '142', 'rgba(169,169,169,0.7)', // 住居併用工場
            '143', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(32,178,120,0.7)', // 運輸施設等
                '2', 'rgba(95,158,160,0.7)', // 倉庫施設等
                /* default */ 'rgba(0,0,0,0)'
            ],
            '150', 'rgba(85,107,47,0.7)', // 農林漁業施設
            '210', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(250,250,120,0.7)', // 太陽光発電
                '2', 'rgba(119,136,153,0.7)', // 屋外駐車場
                '3', 'rgba(176,196,222,0.7)', // その他
                /* default */ 'rgba(0,0,0,0)'
            ],
            '300', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(120,100,100,0.7)', // ゴルフ場
                '2', 'rgba(154,205,50,0.7)', // その他
                /* default */ 'rgba(0,0,0,0)'
            ],
            '400', 'rgba(255,222,173,0.7)', // 未利用地等
            '510', 'rgba(192,192,192,0.7)', // 道路
            '520', 'rgba(105,105,105,0.7)', // 鉄道・港湾等
            '611', 'rgba(255,165,0,0.7)', // 田
            '612', 'rgba(255,165,122,0.7)', // 畑
            '613', 'rgba(128,0,0,0.7)', // 樹園地
            '620', 'rgba(34,139,34,0.7)', // 採草放牧地
            '700', 'rgba(0,0,205,0.7)', // 水面・河川・水路
            '800', 'rgba(128,128,0,0.7)', // 原野
            '900', 'rgba(205,133,63,0.7)', // 森林
            '220', 'rgba(106,90,205,0.7)', // その他
            '0', 'rgba(128,0,128,0.7)', // 不明
            '9', 'rgba(75,0,130,0.7)', // 不整合

            /* default */ 'rgba(0,0,0,0)' // Default color if LU_1 doesn't match
        ]

    }
}
export const tochiriyoLayerLine = {
    id: "oh-tochiriyo-line",
    type: "line",
    source: "tochiriyo-source",
    "source-layer": "t",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.1,
            11, 0.5,
            16, 1
        ]
    },
}
// 夜の光----------------------------------------------------------------------------------------------------------------
const hikariSource = {
    id: "hikari-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hikari/hikari.pmtiles",
    }
}
const hikariLayer = {
    id: "oh-hikari",
    type: "fill",
    source: "hikari-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'light']],
            0, '#000000',     // Black at 0
            128, '#808000',   // Dark yellow (olive) at midpoint
            254, '#FFFF00',   // Yellow right up to 254
            255, 'gold'    // White at 255
        ]
    }
}
const hikariLayerHeight = {
    id: "oh-hikari-height",
    type: "fill-extrusion",
    source: "hikari-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'light']],
            0, '#000000',     // Black at 0
            128, '#808000',   // Dark yellow (olive) at midpoint
            254, '#FFFF00',   // Yellow right up to 254
            255, 'gold'    // White at 255
        ],
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'light']],
            0, 10,
            254, 6000,
            255, 10000      // 20mで高さ200
        ],
    }
}
// 津波浸水想定-----------------------------------------------------------------------------------------------------
const tsunamiSource2 = {
    id: "tsunami-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz.xsrv.jp/pmtiles/tsunami/tsunami.pmtiles",
    }
}
const tsunamiLayerHeight = {
    id: "oh-tsunami-height",
    type: "fill-extrusion",
    source: "tsunami-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'match',
            ['get', 'A40_003'],
            '0.01m以上 ～ 0.3m未満', '#f7fcf0', // 最小カテゴリーの色（新しく追加）
            '～0.3m未満', '#d1e5f0',           // 0.3m未満の色
            '0.3m未満', '#d1e5f0',
            '0.3m以上 ～ 1.0m未満', '#a6dba0',  // 0.3~1.0mの色
            '0.3m以上 ～ 1m未満', '#a6dba0',
            '1.0m以上 ～ 2.0m未満', '#7bccc4',  // 1.0~2.0mの色
            '1m以上 ～ 2m未満', '#7bccc4',

            '0.3m以上 ～ 0.5m未満', '#d1e5f0',
            '0.5m以上 ～ 1.0m未満','#a6dba0',
            '1.0m以上 ～ 3.0m未満', '#7bccc4',
            '1m以上 ～ 3m未満', '#7bccc4',


            '2m以上 ～ 3m未満', '#7bccc4',
            '3m以上 ～ 4m未満', '#2b8cbe',
            '4m以上 ～ 5m未満', '#2b8cbe',

            '3.0m以上 ～ 5.0m未満', '#2b8cbe',
            '3m以上 ～ 5m未満','#2b8cbe',
            '5m以上 ～ 10m未満','#0868ac',
            '10m以上 ～ 20m未満', '#084081',
            '10.0m以上 ～ 20.0m未満', '#084081',

            '2.0m以上 ～ 5.0m未満', '#2b8cbe',  // 2.0~5.0mの色
            '2m以上 ～ 5m未満', '#2b8cbe',
            '5.0m以上 ～ 10.0m未満', '#0868ac', // 5.0~10.0mの色
            'gray' // 該当しない場合のデフォルトカラー
        ],
        'fill-extrusion-opacity': 0.8,
        'fill-extrusion-height': [
            'match',
            ['get', 'A40_003'],
            '0.01m以上 ～ 0.3m未満', 2,      // 新しく追加した最小カテゴリーの高さ
            '～0.3m未満', 5,
            '0.3m未満', 5,
            '0.3m以上 ～ 1.0m未満', 20,
            '0.3m以上 ～ 1m未満', 20,
            '1.0m以上 ～ 2.0m未満', 40,
            '1m以上 ～ 2m未満', 40,

            '0.3m以上 ～ 0.5m未満', 4,
            '0.5m以上 ～ 1.0m未満',20,
            '1.0m以上 ～ 3.0m未満', 40,
            '1m以上 ～ 3m未満', 40,

            '2m以上 ～ 3m未満', 50,
            '3m以上 ～ 4m未満', 60,
            '4m以上 ～ 5m未満', 70,


            '3.0m以上 ～ 5.0m未満', 80,
            '3m以上 ～ 5m未満',80,
            '5m以上 ～ 10m未満',100,
            '10m以上 ～ 20m未満', 120,
            '10.0m以上 ～ 20.0m未満',120,

            '2.0m以上 ～ 5.0m未満', 80,
            '2m以上 ～ 5m未満', 80,
            '5.0m以上 ～ 10.0m未満', 100,
            10 // デフォルトの高さ
        ]
    }
}
// 宮崎県南海トラフ-----------------------------------------------------------------------------------------------------
const nantoraSource = {
    id: "nantora-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz.xsrv.jp/pmtiles/tsunami/nantora.pmtiles",
    }
}
const nantoraLayerHeight = {
    id: "oh-nantora-height",
    type: "fill-extrusion",
    source: "nantora-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', '最大浸水深'],
            0, 'rgba(255,255,179,0.8)',    // 0.3m未満
            0.3, 'rgba(247,245,169,0.8)',  // 0.3~0.5m
            0.5, 'rgba(248,225,116,0.8)',  // 0.5~1.0m
            1.0, 'rgba(255,216,192,0.8)',  // 1.0~3.0m
            3.0, 'rgba(255,183,183,0.8)',  // 3.0~5.0m
            5.0, 'rgba(255,145,145,0.8)',  // 5.0~10.0m
            10.0, 'rgba(242,133,201,0.8)', // 10.0~20.0m
            20.0, 'rgba(220,122,220,0.8)'  // 20.0m以上
        ],
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', '最大浸水深'],
            0, 10,          // 0mで高さ10
            0.5, 15,        // 0.5mで高さ15
            1.0, 20,        // 1.0mで高さ20
            3.0, 50,        // 3.0mで高さ50
            5.0, 75,        // 5.0mで高さ75
            10.0, 125,      // 10.0mで高さ125
            20.0, 200       // 20mで高さ200
        ],
    }
}
// 北海道津波-----------------------------------------------------------------------------------------------------
const hokkaidotsunamiSource = {
    id: "hokkaidotsunami-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz.xsrv.jp/pmtiles/tsunami/hokkaidotsunami.pmtiles",
    }
}
const hokkaidotsunamiLayerHeight = {
    id: "oh-hokkaidotsunami-height",
    type: "fill-extrusion",
    source: "hokkaidotsunami-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'max'], ['get', 'MAX_SIN']],
            0, 'rgba(255,255,179,0.8)',    // 0.3m未満
            0.3, 'rgba(247,245,169,0.8)',  // 0.3~0.5m
            0.5, 'rgba(248,225,116,0.8)',  // 0.5~1.0m
            1.0, 'rgba(255,216,192,0.8)',  // 1.0~3.0m
            3.0, 'rgba(255,183,183,0.8)',  // 3.0~5.0m
            5.0, 'rgba(255,145,145,0.8)',  // 5.0~10.0m
            10.0, 'rgba(242,133,201,0.8)', // 10.0~20.0m
            20.0, 'rgba(220,122,220,0.8)'  // 20.0m以上
        ],
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'max'], ['get', 'MAX_SIN']],
            0, 10,          // 0mで高さ10
            0.5, 15,        // 0.5mで高さ15
            1.0, 20,        // 1.0mで高さ20
            3.0, 50,        // 3.0mで高さ50
            5.0, 75,        // 5.0mで高さ75
            10.0, 125,      // 10.0mで高さ125
            20.0, 200       // 20mで高さ200
        ],
    }
}
// 土地利用100mメッシュ----------------------------------------------------------------------------------------------------------------
const tochiriyo100Source = {
    id: "tochiriyo100-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tochiriyo/tochiriyoD.pmtiles",
        // minzoom: 11
    }
}
const tochiriyo100Layer = {
    id: "oh-tochiriyo100",
    type: "fill",
    source: "tochiriyo100-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': [
            'match',
            ['get', '土地利用種別'],
            '0100', 'rgba(255,255,0,0.8)',      // 田
            '0200', 'rgba(255,204,153,0.8)',    // その他の農用地
            '0500', 'rgba(0,170,0,0.8)',        // 森林
            '0600', 'rgba(0,255,153,0.8)',      // 荒地
            '0700', 'rgba(255,0,0,0.8)',        // 建物用地
            '0901', 'rgba(140,140,140,0.8)',    // 道路
            '0902', 'rgba(180,180,180,0.8)',    // 鉄道
            '1000', 'rgba(200,70,15,0.8)',      // その他の用地
            '1100', 'rgba(0,0,255,0.8)',        // 河川地及び湖沼
            '1400', 'rgba(255,255,153,0.8)',    // 海浜
            '1500', 'rgba(0,204,255,0.8)',      // 海水域
            '1600', 'rgba(0,204,255,0.8)',      // ゴルフ場
            'rgba(0,0,0,0)' // デフォルト値（該当しない場合は透明）
        ]
    }
}// 幼稚園 --------------------------------------------------------------------------------------------
const yochienSource = {
    id: "yochien-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/yochien/yochien.pmtiles",
    }
}
const yochienLayer = {
    id: "oh-yochien-layer",
    type: "circle",
    source: "yochien-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'pink',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.5,
            4, 1,
            7, 6,
            11, 10
        ]
    }
}
const yochienLayerLabel = {
    id: "oh-yochien-label",
    type: "symbol",
    source: "yochien-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 空港等の周辺空域 --------------------------------------------------------------------------------------------
const kokuareaSource = {
    id: "kokuarea-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kokuarea/kokuarea.pmtiles",
        'maxzoom': 8,
        'minzoom': 1
    }
}
const kokuareaLayer = {
    id: "oh-kokuarea-layer",
    type: "fill",
    source: "kokuarea-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'rgba'],
    }
}
const kokuareaLayerLine = {
    id: "oh-kokuarea-line",
    type: "line",
    source: "kokuarea-source",
    "source-layer": "polygon",
    paint: {
        "line-color": "black",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.5,
            20, 6
        ]
    },
}
// 海洋地質図---------------------------------------------------------------------------------------------------------
const kaiyochishitsuource = {
    id: 'kaiyochishitsu-source', obj: {
        type: 'raster',
        tiles: ['https://gbank.gsj.jp/geonavi/maptile/wmts/1.0.0/MA3000_23japanes/default/EPSG900913/{z}/{y}/{x}.png'],
    }
}
const kaiyochishitsuLayer = {
    'id': 'oh-kaiyochishitsu-layer',
    'type': 'raster',
    'source': 'kaiyochishitsu-source',
    'raster-resampling': 'nearest'
}
// 人工地形-----------------------------------------------------------------------------------------------------
const jinkochikeiSource = {
    id: "jinkochikei-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/jinkochikei/jinkochikei.pmtiles",
    }
}
const jinkochikeiLayer = {
    id: "oh-jinkochikei",
    type: "fill",
    source: "jinkochikei-source",
    "source-layer": "polygon",
    "paint": {
        "fill-color": [
            "match",
            ["get", "code"],
            "11001", "rgba(133, 196, 209, 0.8)",
            "11003", "rgba(133, 196, 209, 0.8)",
            "11009", "rgba(133, 196, 209, 0.8)",
            "11011", "rgba(133, 196, 209, 0.8)",
            "4010301", "rgba(133, 196, 209, 0.8)",
            "11002", "rgba(138, 216, 182, 0.8)",
            "11004", "rgba(239, 136, 136, 0.8)",
            "11006", "rgba(239, 136, 136, 0.8)",
            "11007", "rgba(239, 136, 136, 0.8)",
            "11014", "rgba(239, 136, 136, 0.8)",
            "4010201", "rgba(255, 79, 79, 0.8)",
            "11005", "rgba(255, 79, 79, 0.8)",
            "11008", "rgba(195, 122, 255, 0.8)",
            "4010101", "rgba(195, 122, 255, 0.8)",
            "11010", "rgba(255, 232, 232, 0.8)",
            "rgba(0, 0, 0, 0.8)"  // デフォルトカラー
        ]
    }
}
// 自然地形-----------------------------------------------------------------------------------------------------
const shizenchikeiSource = {
    id: "shizenchikei-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/shizenchikei/shizenchikei_mini.pmtiles",
    }
}
const shizenchikeiLayer = {
    id: "oh-shizenchikei",
    type: "fill",
    source: "shizenchikei-source",
    "source-layer": "polygon",
    "paint": {
        "fill-color": [
            "match",
            ["to-string", ["get", "code"]],
            "10101", "rgba(217, 203, 174, 0.8)",
            "1010101", "rgba(217, 203, 174, 0.8)",
            "11201", "rgba(217, 203, 174, 0.8)",
            "11202", "rgba(217, 203, 174, 0.8)",
            "11203", "rgba(217, 203, 174, 0.8)",
            "11204", "rgba(217, 203, 174, 0.8)",
            "10202", "rgba(148, 102, 171, 0.8)",
            "10204", "rgba(148, 102, 171, 0.8)",
            "2010201", "rgba(148, 102, 171, 0.8)",
            "10205", "rgba(204, 153, 255, 0.8)",
            "10206", "rgba(204, 153, 255, 0.8)",
            "10301", "rgba(255, 170, 0, 0.8)",
            "10302", "rgba(255, 170, 0, 0.8)",
            "10303", "rgba(255, 170, 0, 0.8)",
            "10304", "rgba(255, 170, 0, 0.8)",
            "10308", "rgba(255, 170, 0, 0.8)",
            "10314", "rgba(255, 170, 0, 0.8)",
            "10305", "rgba(255, 170, 0, 0.8)",
            "10508", "rgba(255, 170, 0, 0.8)",
            "2010101", "rgba(255, 170, 0, 0.8)",
            "10306", "rgba(255, 170, 0, 0.8)",
            "10307", "rgba(255, 170, 0, 0.8)",
            "10310", "rgba(255, 170, 0, 0.8)",
            "10312", "rgba(255, 170, 0, 0.8)",
            "10401", "rgba(153, 128, 77, 0.8)",
            "10402", "rgba(153, 128, 77, 0.8)",
            "10403", "rgba(153, 128, 77, 0.8)",
            "10404", "rgba(153, 128, 77, 0.8)",
            "10406", "rgba(153, 128, 77, 0.8)",
            "10407", "rgba(153, 128, 77, 0.8)",
            "3010101", "rgba(153, 128, 77, 0.8)",
            "10501", "rgba(202, 204, 96, 0.8)",
            "10502", "rgba(202, 204, 96, 0.8)",
            "3020101", "rgba(202, 204, 96, 0.8)",
            "10503", "rgba(255, 255, 51, 0.8)",
            "3040101", "rgba(255, 255, 51, 0.8)",
            "10506", "rgba(251, 224, 157, 0.8)",
            "10507", "rgba(251, 224, 157, 0.8)",
            "10801", "rgba(251, 224, 157, 0.8)",
            "10504", "rgba(255, 255, 153, 0.8)",
            "10505", "rgba(255, 255, 153, 0.8)",
            "10512", "rgba(255, 255, 153, 0.8)",
            "3050101", "rgba(255, 255, 153, 0.8)",
            "10601", "rgba(163, 204, 126, 0.8)",
            "2010301", "rgba(163, 204, 126, 0.8)",
            "10701", "rgba(187, 255, 153, 0.8)",
            "3030101", "rgba(187, 255, 153, 0.8)",
            "10702", "rgba(187, 255, 153, 0.8)",
            "10705", "rgba(187, 255, 153, 0.8)",
            "10703", "rgba(0, 209, 164, 0.8)",
            "10804", "rgba(0, 209, 164, 0.8)",
            "3030201", "rgba(0, 209, 164, 0.8)",
            "10704", "rgba(102, 153, 255, 0.8)",
            "3040201", "rgba(102, 153, 255, 0.8)",
            "3040202", "rgba(102, 153, 255, 0.8)",
            "3040301", "rgba(31, 153, 153, 0.8)",
            "10802", "rgba(159, 159, 196, 0.8)",
            "10803", "rgba(159, 159, 196, 0.8)",
            "10807", "rgba(159, 159, 196, 0.8)",
            "10808", "rgba(159, 159, 196, 0.8)",
            "10805", "rgba(229, 255, 255, 0.8)",
            "10806", "rgba(229, 255, 255, 0.8)",
            "10901", "rgba(229, 255, 255, 0.8)",
            "10903", "rgba(229, 255, 255, 0.8)",
            "5010201", "rgba(229, 255, 255, 0.8)",
            "10904", "rgba(119, 153, 153, 0.8)",
            "5010301", "rgba(119, 153, 153, 0.8)",
            "11001", "rgba(133, 196, 209, 0.8)",
            "11003", "rgba(133, 196, 209, 0.8)",
            "11009", "rgba(133, 196, 209, 0.8)",
            "11011", "rgba(133, 196, 209, 0.8)",
            "4010301", "rgba(133, 196, 209, 0.8)",
            "11002", "rgba(138, 216, 182, 0.8)",
            "11004", "rgba(239, 136, 136, 0.8)",
            "11006", "rgba(239, 136, 136, 0.8)",
            "11007", "rgba(239, 136, 136, 0.8)",
            "11014", "rgba(239, 136, 136, 0.8)",
            "4010201", "rgba(255, 79, 79, 0.8)",
            "11005", "rgba(255, 79, 79, 0.8)",
            "11008", "rgba(195, 122, 255, 0.8)",
            "4010101", "rgba(195, 122, 255, 0.8)",
            "11010", "rgba(255, 232, 232, 0.8)",
            "999999", "rgba(20, 77, 250, 0.8)",
            "101", "rgba(230, 230, 0, 0.8)",
            "102", "rgba(0, 226, 230, 0.8)",
            "103", "rgba(42, 230, 0, 0.8)",
            "104", "rgba(230, 4, 0, 0.8)",
            "105", "rgba(94, 92, 230, 0.8)",
            "11", "rgba(153, 139, 121, 0.8)",
            "12", "rgba(102, 77, 85, 0.8)",
            "13", "rgba(117, 128, 210, 0.8)",
            "21", "rgba(201, 255, 5, 0.8)",
            "31", "rgba(255, 1, 22, 0.8)",
            "32", "rgba(255, 81, 1, 0.8)",
            "33", "rgba(201, 117, 176, 0.8)",
            "34", "rgba(255, 187, 252, 0.8)",
            "41", "rgba(255, 179, 26, 0.8)",
            "51", "rgba(199, 255, 247, 0.8)",
            "61", "rgba(255, 234, 1, 0.8)",
            "71", "rgba(18, 1, 255, 0.8)",
            "1", "rgba(153, 140, 122, 0.8)",
            "3", "rgba(255, 1, 22, 0.8)",
            "4", "rgba(255, 179, 26, 0.8)",
            "5", "rgba(199, 255, 247, 0.8)",
            "6", "rgba(255, 234, 1, 0.8)",
            "7", "rgba(18, 1, 255, 0.8)",
            "", "rgba(133, 182, 231, 0.8)",
            "9999", "rgba(255, 0, 255, 0.8)",
            "rgba(0, 0, 0, 0.8)" // デフォルトカラー
        ]
    }
}
// 都市計画決定情報パッケージ
// 都市計画 --------------------------------------------------------------------------------------------
const tokeiSource = {
    id: "tokei-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/toshikeikaku/tokei.pmtiles",
    }
}
const tokeiLayer = {
    id: "oh-tokei",
    type: "fill",
    source: "tokei-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', 'kubunID'],
            21, 'rgba(255, 0, 0, 0.6)',  // 都市計画区域（赤色）
            26, 'rgba(0, 255, 0, 0.6)',  // 準都市計画区域（緑色）
            27, 'rgba(0, 0, 255, 0.6)',  // 都市計画区域外（青色）
            'rgba(200, 200, 200, 0.6)'   // デフォルト色（グレー）
        ],
    }
}
const tokeiLayerLine = {
    id: "oh-tokei-line",
    type: "line",
    source: "tokei-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 区域区分 --------------------------------------------------------------------------------------------
const kuikikubunSource = {
    id: "kuikikubun-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/toshikeikaku/senbiki.pmtiles",
    }
}
const kuikikubunLayer = {
    id: "oh-kuikikubun",
    type: "fill",
    source: "kuikikubun-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', 'kubunID'],
            22, 'rgba(255, 165, 0, 0.6)',  // 市街化区域（オレンジ色）
            23, 'rgba(0, 128, 0, 0.6)',    // 市街化調整区域（緑色）
            'rgba(200, 200, 200, 0.6)'     // デフォルト色（グレー）
        ],
    }
}
const kuikikubunLayerLine = {
    id: "oh-kuikikubun-line",
    type: "line",
    source: "kuikikubun-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 用途地域 --------------------------------------------------------------------------------------------
const yotochiikiPSource = {
    id: "yotochiikiP-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/toshikeikaku/yoto.pmtiles",
    }
}
const yotochiikiPLayer = {
    id: "oh-yotochiikiP",
    type: "fill",
    source: "yotochiikiP-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', 'YoutoID'],
            0, 'rgba(169, 169, 169 , 0.8)',   // 用途地域の指定をしない区域（ダークグレー）
            1, 'rgba(144, 238, 144 , 0.8)',   // 第1種低層住居専用地域（ライトグリーン）
            2, 'rgba(152, 251, 152 , 0.8)',   // 第2種低層住居専用地域（パレグリーン）
            3, 'rgba(60, 179, 113 , 0.8)',    // 第1種中高層住居専用地域（ミディアムシースグリーン）
            4, 'rgba(46, 139, 87 , 0.8)',     // 第2種中高層住居専用地域（シーグリーン）
            5, 'rgba(107, 142, 35 , 0.8)',    // 第1種住居地域（オリーブドラブ）
            6, 'rgba(0, 128, 0 , 0.8)',       // 第2種住居地域（緑色）
            7, 'rgba(144, 238, 144 , 0.8)',   // 準住居地域（ライトグリーン）
            8, 'rgba(60, 179, 113 , 0.8)',    // 田園住居地域（ミディアムシースグリーン）
            9, 'rgba(255, 69, 0 , 0.8)',      // 近隣商業地域（オレンジレッド）
            10, 'rgba(255, 0, 0 , 0.8)',      // 商業地域（赤色）
            11, 'rgba(105, 105, 105 , 0.8)',  // 準工業地域（ディムグレー）
            12, 'rgba(0, 0, 0 , 0.8)',        // 工業地域（黒色）
            13, 'rgba(47, 79, 79 , 0.8)',     // 工業専用地域（ダークスレートグレー）
            14, 'rgba(218, 112, 214 , 0.8)',  // 特別用途地区（オーキッド）
            15, 'rgba(186, 85, 211 , 0.8)',   // 特定用途制限地域（ミディアムオーキッド）
            16, 'rgba(147, 112, 219 , 0.8)',  // 特例容積率適用地区（ミディアムスレートブルー）
            17, 'rgba(138, 43, 226 , 0.8)',   // 高層住居誘導地区（ブルーバイオレット）
            18, 'rgba(75, 0, 130 , 0.8)',     // 高度地区（インディゴ）
            19, 'rgba(72, 61, 139 , 0.8)',    // 高度利用地区（ダークスレートブルー）
            20, 'rgba(0, 0, 205 , 0.8)',      // 特定街区（ミディアムブルー）
            21, 'rgba(0, 0, 255 , 0.8)',      // 都市再生特別地区（ブルー）
            22, 'rgba(34, 139, 34 , 0.8)',    // 居住調整地域（フォレストグリーン）
            23, 'rgba(46, 139, 87 , 0.8)',    // 特定用途誘導地区（シーグリーン）
            24, 'rgba(255, 0, 0 , 0.8)',      // 防火地域（赤色）
            25, 'rgba(255, 99, 71 , 0.8)',    // 準防火地域（トマト）
            26, 'rgba(220, 20, 60 , 0.8)',    // 特定防災街区整備地区（クリムゾン）
            27, 'rgba(154, 205, 50 , 0.8)',   // 景観地区（イエローグリーン）
            28, 'rgba(85, 107, 47 , 0.8)',    // 風致地区（ダークオリーブグリーン）
            29, 'rgba(139, 69, 19 , 0.8)',    // 駐車場整備地区（サドルブラウン）
            30, 'rgba(210, 105, 30 , 0.8)',   // 臨港地区（チョコレート）
            31, 'rgba(160, 82, 45 , 0.8)',    // 歴史的風土特別保存地区（シエナ）
            32, 'rgba(205, 92, 92 , 0.8)',    // 第1種歴史的風土保存地区（インディアンレッド）
            33, 'rgba(233, 150, 122 , 0.8)',  // 第2種歴史的風土保存地区（ダークサーモン）
            34, 'rgba(152, 251, 152 , 0.8)',  // 緑地保全地域（パレグリーン）
            35, 'rgba(0, 128, 0 , 0.8)',      // 特別緑地保全地区（緑色）
            36, 'rgba(107, 142, 35 , 0.8)',   // 緑化地域（オリーブドラブ）
            37, 'rgba(189, 183, 107 , 0.8)',  // 流通業務地区（ダークカーキ）
            38, 'rgba(85, 107, 47 , 0.8)',    // 生産緑地地区（ダークオリーブグリーン）
            39, 'rgba(255, 20, 147 , 0.8)',   // 伝統的建造物群保存地区（ディープピンク）
            40, 'rgba(255, 105, 180 , 0.8)',  // 航空機騒音障害防止地区（ホットピンク）
            41, 'rgba(199, 21, 133 , 0.8)',   // 航空機騒音障害防止特別地区（ミディアムバイオレットレッド）
            42, 'rgba(255, 182, 193 , 0.8)',  // 居住環境向上用途誘導地区（ライトピンク）
            'rgba(200, 200, 200 , 0.8)'       // デフォルト色（グレー）
        ],
    }
    }
const yotochiikiPLayerLine = {
    id: "oh-yotochiikiP-line",
    type: "line",
    source: "yotochiikiP-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 特別用途地区 --------------------------------------------------------------------------------------------
const tkbtSource = {
    id: "tkbt-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/toshikeikaku/tkbt.pmtiles",
    }
}
const tkbtLayer = {
    id: "oh-tkbt",
    type: "fill",
    source: "tkbt-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(255, 0, 0, 0.8)',
    }
}
const tkbtLayerLine = {
    id: "oh-tkbt-line",
    type: "line",
    source: "tkbt-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// ---------------------------------------------------------------------------------------------------------------------
// 湖沼 --------------------------------------------------------------------------------------------
const kosyoSource = {
    id: "kosyo-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kosyo/kosyo.pmtiles",
    }
}
const kosyoLayer = {
    id: "oh-kosyo",
    type: "fill",
    source: "kosyo-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(0, 0, 255, 0.8)',
    }
}
const kosyoLine = {
    id: "oh-kosyo-line",
    type: "line",
    source: "kosyo-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// ダム --------------------------------------------------------------------------------------------
const damSource = {
    id: "dam-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/dam/dam.pmtiles",
    }
}
const damLayer = {
    id: "oh-dam-layer",
    type: "circle",
    source: "dam-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'navy',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.5,
            4, 1,
            7, 6,
            11, 10
        ]
    }
}
const damLayerLabel = {
    id: "oh-dam-label",
    type: "symbol",
    source: "dam-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'W01_001'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// ----------------------------------------------------------------------------------------------
const kazanSource = {
    id: 'kazan-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/vlcd/{z}/{x}/{y}.png'],
    }
}
const kazanLayer = {
    'id': 'oh-kazan',
    'type': 'raster',
    'source': 'kazan-source',
}
// 植生被覆率 --------------------------------------------------------------------------------------------
const hifukuSource = {
    id: "hifuku-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hifuku/hifuku.pmtiles",
    }
}
const hifukuLayer = {
    id: "oh-hifuku",
    type: "fill",
    source: "hifuku-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'c_FRAC_VEG']],
            0, 'rgba(255, 255, 200, 0.8)', // 淡い黄色
            1, 'rgba(0, 128, 0, 0.8)'       // 濃い緑
        ],
    }
}
const hifukuLine = {
    id: "oh-hifuku-line",
    type: "line",
    source: "hifuku-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 世界自然遺産 --------------------------------------------------------------------------------------------
const shizenisanSource = {
    id: "shizenisan-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/sekaiisan/shizenisan.pmtiles",
    }
}
const shizenisanLayer = {
    id: "oh-shizenisan",
    type: "fill",
    source: "shizenisan-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(255, 105, 180, 0.8)',
    }
}
const shizenisanLine = {
    id: "oh-shizenisan-line",
    type: "line",
    source: "shizenisan-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 世界文化遺産 --------------------------------------------------------------------------------------------
const bunkaisanSource = {
    id: "bunkaisan-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/sekaiisan/bunkaisan.pmtiles",
    }
}
const bunkaisanLayerA34a = {
    id: "oh-bunkaisan-layer-A34a",
    type: "fill",
    source: "bunkaisan-source",
    "source-layer": "A34a",
    'paint': {
        'fill-color': 'rgba(157, 209, 199, 0.8)',
    }
}
const bunkaisanLineA34a = {
    id: "oh-bunkaisan-line-A34a",
    type: "line",
    source: "bunkaisan-source",
    "source-layer": "A34a",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
const bunkaisanLayerA34f = {
    id: "oh-bunkaisan-layer-A34f",
    type: "fill",
    source: "bunkaisan-source",
    "source-layer": "A34f",
    'paint': {
        'fill-color': 'rgba(242, 183, 112, 0.8)',
    }
}
const bunkaisanLineA34f = {
    id: "oh-bunkaisan-line-A34f",
    type: "line",
    source: "bunkaisan-source",
    "source-layer": "A34f",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
const bunkaisanLineA34c = {
    id: "oh-bunkaisan-line-A34c",
    type: "line",
    source: "bunkaisan-source",
    "source-layer": "A34c",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 1,
            12, 4
        ]
    },
}
const bunkaisanPointA34b = {
    id: "oh-bunkaisan-point-A34b",
    type: "circle",
    source: "bunkaisan-source",
    "source-layer": "A34b",
    paint: {
        'circle-color': 'rgba(145, 82, 45, 1)',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 1,
            13, 8
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
const bunkaisanPointA34d = {
    id: "oh-bunkaisan-point-A34d",
    type: "circle",
    source: "bunkaisan-source",
    "source-layer": "A34d",
    paint: {
        'circle-color': 'rgba(152, 125, 183, 1)',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 1,
            13, 8
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
const bunkaisanPointA34e = {
    id: "oh-bunkaisan-point-A34e",
    type: "circle",
    source: "bunkaisan-source",
    "source-layer": "A34e",
    paint: {
        'circle-color': 'rgba(255, 158, 23, 1)',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 1,
            13, 8
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
const bunkaisanPointA34g = {
    id: "oh-bunkaisan-point-A34g",
    type: "circle",
    source: "bunkaisan-source",
    "source-layer": "A34g",
    paint: {
        'circle-color': 'rgba(164, 113, 88, 1)',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 1,
            13, 8
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
// ジオパーク --------------------------------------------------------------------------------------------
const geoparkSource = {
    id: "geopark-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/geopark/geopark.pmtiles",
    }
}
const geoparkLayer = {
    id: "oh-geopark-layer",
    type: "fill",
    source: "geopark-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', 'attr'],
            'GGP', 'rgba(255, 182, 193, 0.8)', // 淡い赤色
            'JGP', 'rgba(102, 187, 106, 0.8)', // 既存の色
            'rgba(200, 200, 200, 0.8)' // デフォルト色
        ],
    }
}
const geoparkLine = {
    id: "oh-geopark-line",
    type: "line",
    source: "geopark-source",
    "source-layer": "polygon",
    paint: {
        'line-color': 'red',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            9,2,
            10, 4,
            12, 8,
            14,10
        ]
    },
}
// 自然公園 --------------------------------------------------------------------------------------------
const shizenkoenSource = {
    id: "shizenkoen-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/shizenkoen/shizenkoen.pmtiles",
    }
}
const shizenkoenLayer = {
    id: "oh-shizenkoen-layer",
    type: "fill",
    source: "shizenkoen-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['to-number', ['get', 'LAYER_NO']], // 数値に変換
            1, 'rgba(169, 223, 191, 0.8)', // 薄い緑
            2, 'rgba(144, 190, 109, 0.8)', // 明るい緑
            3, 'rgba(116, 178, 97, 0.8)',  // 中程度の緑
            4, 'rgba(92, 154, 82, 0.8)',   // 深い緑
            5, 'rgba(162, 217, 206, 0.8)', // パステルの緑
            6, 'rgba(127, 205, 153, 0.8)', // 爽やかな緑
            7, 'rgba(139, 195, 74, 0.8)',  // 少し黄緑寄り
            8, 'rgba(102, 187, 106, 0.8)', // 鮮やかな緑
            9, 'rgba(174, 213, 129, 0.8)', // 薄めの緑
            10, 'rgba(76, 175, 80, 0.8)',   // 標準的な緑
            11, 'rgba(124, 179, 66, 0.8)',  // 明るい深緑
            12, 'rgba(85, 139, 47, 0.8)',   // 暗めの緑
            13, 'rgba(51, 105, 30, 0.8)',   // 森っぽい深緑
            14, 'rgba(130, 204, 171, 0.8)', // パステル深緑
            15, 'rgba(165, 214, 167, 0.8)', // 柔らかな緑
            16, 'rgba(200, 230, 201, 0.8)', // とても柔らかな緑
            'rgba(0, 0, 0, 0.8)'            // デフォルト色
        ],
    }
}
const shizenkoenLine = {
    id: "oh-shizenkoen-line",
    type: "line",
    source: "shizenkoen-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 国立公園 --------------------------------------------------------------------------------------------
const kokuritsukoenSource = {
    id: "kokuritsukoen-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kokuritsukoen/kokuritsukoen.pmtiles",
    }
}
const kokuritsukoenLayer = {
    id: "oh-kokuritsukoen-layer",
    type: "fill",
    source: "kokuritsukoen-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', '地域区'],
            '特別保護地区', 'rgba(34, 139, 34, 0.8)',          // フォレストグリーン
            '第1種特別地域', 'rgba(60, 179, 113, 0.8)',        // ミディアムシーグリーン
            '第2種特別地域', 'rgba(107, 142, 35, 0.8)',        // オリーブドラブ
            '第3種特別地域', 'rgba(85, 107, 47, 0.8)',         // ダークオリーブグリーン
            '普通地域', 'rgba(144, 238, 144, 0.8)',           // ライトグリーン
            '海域公園地区', 'rgba(32, 178, 170, 0.8)',        // ライトシーグリーン
            '区分未定', 'rgba(169, 169, 169, 0.8)',           // ダークグレー
            /* default */ 'rgba(0, 0, 0, 0.8)'                // デフォルトは黒
        ],
    }
}
const kokuritsukoenLine = {
    id: "oh-kokuritsukoen-line",
    type: "line",
    source: "kokuritsukoen-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 都市圏活断層図----------------------------------------------------------------------------------------------------------
const dansoSource = {
    id: 'danso-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png'],
    }
}
const dansoLayer = {
    'id': 'oh-danso-layer',
    'type': 'raster',
    'source': 'danso-source',
}
// 駅別乗降客数-----------------------------------------------------------------------------------------------------
const ekibetsukyakuSource = {
    id: "ekibetsukyaku-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/ekibetsukyaku/ekibetsukyaku.pmtiles",
    }
}
const ekibetsukyakuSource3d = {
    id: "ekibetsukyaku-source-3d", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/ekibetsukyaku/ekibetsukyaku3d.pmtiles",
    }
}
const tetsudo2Source = {
    id: "tetsudo-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tetsudo/tetsudo.pmtiles",
    }
}
const tetsudoLine = {
    id: "oh-tetsudo-line",
    type: "line",
    source: "tetsudo-source",
    "source-layer": "line",
    paint: {
        'line-color': 'blue',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 1,
            11, 3
        ]
    },
}
const ekibetsukyakuLine = {
    id: "oh-ekibetsukyaku-line",
    type: "line",
    source: "ekibetsukyaku-source",
    "source-layer": "line",
    paint: {
        'line-color': 'hotpink',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 5,
            11, 10
        ]
    },
}
const ekibetsukyakuHeight = {
    id: "oh-ekibetsukyakue-height",
    type: "fill-extrusion",
    source: "ekibetsukyaku-source-3d",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', 'S12_053'],
            0, 50,
            1200000, 3000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', 'S12_053'],
            0, 'hsl(240, 100%, 50%)',    // 深い青
            100, 'hsl(230, 100%, 55%)',  // 明るめの青
            300, 'hsl(220, 100%, 60%)',  // 薄い青
            500, 'hsl(210, 100%, 65%)',  // 青
            1000, 'hsl(200, 100%, 70%)', // 青みがかったシアン
            5000, 'hsl(180, 100%, 50%)', // シアン
            20000, 'hsl(150, 100%, 50%)', // 青緑
            100000, 'hsl(120, 100%, 50%)', // 緑
            500000, 'hsl(60, 100%, 50%)',  // 黄色
            1200000, 'hsl(0, 100%, 50%)'   // 赤
        ],
    },
}
const ekibetsukyakuLabel = {
    id: "oh-ekibetsukyaku-label",
    type: "symbol",
    source: "ekibetsukyaku-source",
    "source-layer": "line",
    'layout': {
        'text-field': [
            "number-format",
            ["to-number", ["get", "S12_053"]],
            { "min-fraction-digits": 0 }
        ],
        'text-font': ['NotoSansJP-Regular'],
        'symbol-placement': 'line', // ラインに沿って配置
        'text-offset': [0, 1], // ラインの横側に表示（Y方向にオフセット）
        'text-anchor': 'center', // テキストのアンカー位置
        'text-rotation-alignment': 'map' // マップの向きにテキストを合わせる
    },
    'paint': {
        'text-color': 'rgba(255, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'filter': ['!=', ['to-number', ['get', 'S12_053']], 0], // 0以外を表示
    'minzoom': 10
}
// ---------------------------------------------------------------------------------------------------------------------
// 交通事故統計情報(2019年〜2022年)
const trafficAccidentSource = {
    id: "traffic-accident-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/TrafficAccidentRecord/TrafficAccidentRecord_20192022.pmtiles",
    }
}
const trafficAccidentLayer = {
    id: "oh-traffic-accident",
    type: "circle",
    source: "traffic-accident-source",
    "source-layer": "TrafficAccidentRecord_20192022",
    'paint': {
        'circle-color': [
            'case',
            [
                'all',
                ['>=', ['to-number', ['get', '発生日時　　時']], 6],
                ['<', ['to-number', ['get', '発生日時　　時']], 18]
            ],
            'rgba(173, 216, 230, 1)', // 昼間: 淡い青色（Light Blue）
            'rgba(47, 79, 79, 0.9)'    // 夜間: 暗っぽい色（Dark Slate Gray）
        ],
        'circle-radius':[
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            2, 1,
            4, 3,
            7, 6,
            11, 10
        ]
    }
}
// みんなで石仏調査--------------------------------------------------------------------------------------------------------
const sekibutsuSource = {
    id: "sekibutsu-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/sekibutsu/sekibutsu.pmtiles",
    }
}
const sekibutsuLayer = {
    id: "oh-sekibutsu",
    type: "circle",
    source: "sekibutsu-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'rgba(47, 79, 79, 0.9)',
        'circle-radius':[
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            2, 1,
            4, 3,
            7, 6,
            11, 10
        ]
    }
}
// 流域（分水嶺）-------------------------------------------------------------------------------------------
const ryuikiSource2 = {
    id: "ryuiki-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/ryuiki/ryuiki5.pmtiles",
    }
}
const ryuikiLayer2 = {
    id: "oh-ryuiki",
    type: "fill",
    source: "ryuiki-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color']
    },
    filter: ['has', 'suikei']
}
const ryuikiLayerLine2 = {
    id: "oh-ryuiki-line",
    type: "line",
    source: "ryuiki-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
    filter: ['has', 'suikei']
}
// 分水嶺-------------------------------------------------------------------------------------------
const bunsuireiSource = {
    id: "bunsuirei-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/ryuiki/ryuiki5.pmtiles",
    }
}
const bunsuireiLayer = {
    id: "oh-bunsuirei",
    type: "fill",
    source: "bunsuirei-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color']
    },
    // filter: ['has', 'suikei']
}
const bunsuireiLayerLine = {
    id: "oh-bunsuirei-line",
    type: "line",
    source: "bunsuirei-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0,
            11, 0.5
        ]
    },
    // filter: ['has', 'suikei']
}
// 観光-------------------------------------------------------------------------------------------
const kankoSource = {
    id: "kanko-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kanko/kanko.pmtiles",
    }
}
const kankoLayer = {
    id: "oh-kanko",
    type: "fill",
    source: "kanko-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'rgba(216,233,169,0.8)'
    },
}
const kankoLayerLine = {
    id: "oh-kanko-layer-line",
    type: "line",
    source: "kanko-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0,
            11, 0.5
        ]
    },
}
const kankoLine = {
    id: "oh-kanko-line",
    type: "line",
    source: "kanko-source",
    "source-layer": "line",
    paint: {
        'line-color': 'rgba(173,135,184,1)',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            11, 4
        ]
    },
}
const kankoPoint = {
    id: "oh-kanko-point",
    type: "circle",
    source: "kanko-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'rgba(248,216,74,1.0)',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 1,
            11, 10
        ],
        'circle-stroke-color': 'rgba(255, 255, 255, 1)',
        'circle-stroke-width': 1
    }
}
// 宿泊容量メッシュ --------------------------------------------------------------------------------------------
const syukuhakuSource = {
    id: "syukuhaku-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/syukuhaku/syukuhaku.pmtiles",
    }
}
const syukuhakuLayer = {
    id: "oh-syukuhaku",
    type: "fill",
    source: "syukuhaku-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'P09_013']],
            0, 'white',
            3000, 'red',
            20000, 'black'
        ]
    }
}
const syukuhakuLayerLine = {
    id: "oh-syukuhaku-line",
    type: "line",
    source: "syukuhaku-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
const syukuhakuLayerHeight = {
    id: 'oh-syukuhaku-height',
    type: 'fill-extrusion',
    source: "syukuhaku-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'P09_013']],
            0, 50,
            11000, 5000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'P09_013']],
            0, 'white',
            3000, 'red',
            20000, 'black'
        ]
    }
}
// 筆ポリゴン --------------------------------------------------------------------------------------------
const fudeSource = {
    id: "fude-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/fude/f.pmtiles",
    }
}
const fudeLayer = {
    id: "oh-fude",
    type: "fill",
    source: "fude-source",
    "source-layer": "f",
    'paint': {
        'fill-color': [
            'case',
            ['==', ['get', 'land_type'], 100], 'rgba(0, 128, 0, 0.8)',  // 緑色 (透明度 0.8)
            ['==', ['get', 'land_type'], 200], 'rgba(255, 0, 0, 0.8)',  // 赤色 (透明度 0.8)
            'rgba(255, 255, 255, 0.8)' // 白色 (透明度 0.8)
        ]
    }
}
const fudeLine = {
    id: "oh-fude-line",
    type: "line",
    source: "fude-source",
    "source-layer": "f",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 農業地域 --------------------------------------------------------------------------------------------
const nogyochiikiSource = {
    id: "nogyochiiki-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/nogyo/nogyo.pmtiles",
    }
}
const nogyochiikiLayer = {
    id: "oh-nogyochiiki",
    type: "fill",
    source: "nogyochiiki-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'LAYER_NO'],
            5, 'rgba(163,222,192,0.8)',
            6, 'rgba(166,142,186,0.8)',
        ],
    }
}
const nogyochiikiLine = {
    id: "oh-nogyochiiki-line",
    type: "line",
    source: "nogyochiiki-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
// 基本基準点-------------------------------------------------------------------------------------------
const kizyuntenSource = {
    id: "kizyunten-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kizyunten/kizyunten2.pmtiles",
    }
}
export const kizyuntenPoint = {
    id: "oh-kizyunten-point",
    type: "circle",
    source: "kizyunten-source",
    "source-layer": "point",
    filter: [
        'any', // OR条件でフィルタ
        ['>=', ['zoom'], 9], // ズームレベル11以上の場合は全て表示
        [
            'all', // AND条件
            ['<=', ['zoom'], 8], // ズームレベル10以下
            ['match', ['get', '基準点種別'], ['電子基準点', '一等三角点'], true, false] // 電子基準点と一等三角点のみ
        ]
    ],
    'paint': {
        'circle-color': [
            'case',
            ['==', ['get', '成果状態'], '正常'],
            [
                'match',
                ['get', '基準点種別'],
                '電子基準点', 'darkorange',  // 正常な電子基準点
                '一等三角点', 'rgba(255, 0, 0, 1.0)',    // 正常な一等三角点
                '二等三角点', 'rgba(0, 128, 0, 1.0)',   // 正常な二等三角点
                '三等三角点', 'rgba(0, 0, 255, 1.0)',   // 正常な三等三角点
                '四等三角点', 'rgba(128, 0, 128, 1.0)', // 正常な四等三角点
                '基準水準点', 'rgba(255, 165, 0, 1.0)', // 正常な基準水準点
                '準基準水準点', 'rgba(0, 255, 255, 1.0)', // 正常な準基準水準点
                '一等水準交差点', 'rgba(75, 0, 130, 1.0)', // 正常な一等水準交差点
                '一等道路水準点', 'rgba(128, 128, 0, 1.0)', // 正常な一等道路水準点
                '一等水準点', 'rgba(255, 20, 147, 1.0)',  // 正常な一等水準点
                '二等水準点', 'rgba(0, 191, 255, 1.0)',   // 正常な二等水準点
                '二等道路水準点', 'rgba(46, 139, 87, 1.0)', // 正常な二等道路水準点
                /* デフォルト色（正常な場合） */
                'rgba(0, 0, 0, 1.0)'
            ],
            [
                'match',
                ['get', '基準点種別'],
                '電子基準点', 'rgba(200, 200, 200, 1.0)',  // 異常な電子基準点
                '一等三角点', 'rgba(128, 0, 0, 1.0)',    // 異常な一等三角点
                '二等三角点', 'rgba(0, 64, 0, 1.0)',     // 異常な二等三角点
                '三等三角点', 'rgba(0, 0, 128, 1.0)',    // 異常な三等三角点
                '四等三角点', 'rgba(64, 0, 64, 1.0)',    // 異常な四等三角点
                '基準水準点', 'rgba(128, 85, 0, 1.0)',   // 異常な基準水準点
                '準基準水準点', 'rgba(0, 128, 128, 1.0)', // 異常な準基準水準点
                '一等水準交差点', 'rgba(37, 0, 64, 1.0)',  // 異常な一等水準交差点
                '一等道路水準点', 'rgba(64, 64, 0, 1.0)',  // 異常な一等道路水準点
                '一等水準点', 'rgba(128, 10, 73, 1.0)',   // 異常な一等水準点
                '二等水準点', 'rgba(0, 95, 128, 1.0)',    // 異常な二等水準点
                '二等道路水準点', 'rgba(23, 64, 43, 1.0)', // 異常な二等道路水準点
                /* デフォルト色（異常な場合） */
                'rgba(0, 0, 0, 1.0)'
            ]
        ],
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, [
                'match',
                ['get', '基準点種別'],
                '電子基準点', 8,
                '一等三角点', 8,
                '二等三角点', 1,
                '三等三角点', 1,
                '四等三角点', 1,
                1 // デフォルト
            ],
            16, [
                'match',
                ['get', '基準点種別'],
                '電子基準点', 20,
                '一等三角点',20,
                '二等三角点', 16,
                '三等三角点', 16,
                '四等三角点', 14,
                8 // デフォルト
            ]
        ],
        'circle-stroke-color': 'rgba(255, 255, 255, 1)',
        'circle-stroke-width': 1
    }
};
const kizyuntenPointLabel = {
    id: "oh-kizyunten-point-label",
    type: "symbol",
    source: "kizyunten-source",
    "source-layer": "point",
    filter: [
        'any', // OR条件でフィルタ
        ['>=', ['zoom'], 9], // ズームレベル11以上の場合は全て表示
        [
            'all', // AND条件
            ['<=', ['zoom'], 8], // ズームレベル10以下
            ['match', ['get', '基準点種別'], ['電子基準点', '一等三角点'], true, false] // 電子基準点と一等三角点のみ
        ]
    ],
    layout: {
        "text-field": [
            "match",
            ["get", "基準点種別"], // フィールド名に基づいて条件分岐
            "電子基準点", "電",
            "一等三角点", "1",
            "二等三角点", "2",
            "三等三角点", "3",
            "四等三角点", "4",
            /* デフォルト値 */
            ""
        ],
        "text-size": 16, // テキストのサイズ
        // "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], // フォント
        "text-anchor": "center", // テキストをポイントの中心に配置
        "text-offset": [0, 0], // テキストのオフセット
        "text-allow-overlap": true, //重なっても表示されるように
        "text-ignore-placement": true,//重なっても表示されるように
    },
    paint: {
        "text-color": "rgba(255, 255, 255, 1)", // テキストの色
        // "text-halo-color": "rgba(255, 255, 255, 1)", // テキストの背景（ハロー）色
        // "text-halo-width": 1, // テキストの背景（ハロー）の幅
    }
};
// 磐田 --------------------------------------------------------------------------------------------
const iwatapolygonSource = {
    id: "iwatapolygon-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/iwata/iwatapolygon.pmtiles",
    }
}
const iwatapolygonLayer = {
    id: "oh-iwatapolygon",
    type: "fill",
    source: "iwatapolygon-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(0,0,0,0)',
    }
}
const iwatapolygonLine = {
    id: "oh-iwatapolygon-line",
    type: "line",
    source: "iwatapolygon-source",
    "source-layer": "polygon",
    paint: {
        'line-color': 'navy',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            16, 2
        ]
    },
}
// 奈良市 --------------------------------------------------------------------------------------------
const narashichibanSource = {
    id: "narashichiban-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chiban/narashi.pmtiles",
    }
}
const narashichibanLayer = {
    id: "oh-narashichiban",
    type: "fill",
    source: "narashichiban-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(0,0,0,0)',
    }
}
const narashichibanLine = {
    id: "oh-narashichiban-line",
    type: "line",
    source: "narashichiban-source",
    "source-layer": "polygon",
    paint: {
        'line-color': 'navy',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            16, 2
        ]
    },
}
// 福島市 --------------------------------------------------------------------------------------------
const fukushimachibanSource = {
    id: "fukushimachiban-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chiban/fukushimashi.pmtiles",
    }
}
const fukushimachibanLayer = {
    id: "oh-fukushimachiban",
    type: "fill",
    source: "fukushimachiban-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(0,0,0,0)',
    }
}
const fukushimachibanLine = {
    id: "oh-fukushimachiban-line",
    type: "line",
    source: "fukushimachiban-source",
    "source-layer": "polygon",
    paint: {
        'line-color': 'navy',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            16, 2
        ]
    },
}
// 北広島市 --------------------------------------------------------------------------------------------
const kitahiroshimachibanSource = {
    id: "kitahiroshimachiban-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chiban/kitahiroshimashi.pmtiles",
    }
}
const kitahiroshimachibanLayer = {
    id: "oh-kitahiroshimachiban",
    type: "fill",
    source: "kitahiroshimachiban-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(0,0,0,0)',
    }
}
const kitahiroshimachibanLine = {
    id: "oh-kitahiroshimachiban-line",
    type: "line",
    source: "kitahiroshimachiban-source",
    "source-layer": "polygon",
    paint: {
        'line-color': 'navy',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 0.1,
            16, 2
        ]
    },
}
// 国立市 --------------------------------------------------------------------------------------------
const kunitachishichibanSource = {
    id: "kunitachishichiban-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chiban/kunitachishi.pmtiles",
    }
}
const kunitachishichibanLayer = {
    id: "oh-kunitachishi",
    type: "fill",
    source: "kunitachishichiban-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': 'rgba(0,0,0,0)',
    }
}
const kunitachishichibanLine = {
    id: "oh-kunitachishichiban-line",
    type: "line",
    source: "kunitachishichiban-source",
    "source-layer": "polygon",
    paint: {
        'line-color': 'navy',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 0.1,
            16, 2
        ]
    },
}
// 福岡市 --------------------------------------------------------------------------------------------
const fukuokashichibanSource = {
    id: "fukuokashichiban-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chiban/fukuokashi.pmtiles",
    }
}
const fukuokashichibanLayer = {
    id: "oh-fukuokashichiban",
    type: "fill",
    source: "fukuokashichiban-source",
    "source-layer": "chibanzu",
    'paint': {
        'fill-color': 'rgba(0,0,0,0)',
    }
}
const fukuokashichibanLine = {
    id: "oh-fukuokashichiban-line",
    type: "line",
    source: "fukuokashichiban-source",
    "source-layer": "chibanzu",
    paint: {
        'line-color': 'navy',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 0.1,
            16, 2
        ]
    },
}
// Chibanzu_2024 --------------------------------------------------------------------------------------------
const chibanzu2024Source = {
    id: "chibanzu2024-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chiban/Chibanzu_2024_with_id2.pmtiles",
    }
}
const chibanzu2024Layer = {
    id: "oh-chibanzu2024",
    type: "fill",
    source: "chibanzu2024-source",
    "source-layer": "chibanzu",
    'paint': {
        'fill-color': 'rgba(0,0,0,0)',
    }
}
const chibanzu2024Line = {
    id: "oh-chibanzu2024-line",
    type: "line",
    source: "chibanzu2024-source",
    "source-layer": "chibanzu",
    paint: {
        'line-color': 'navy',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            16, 2
        ]
    },
}


// 福岡県森林計画区域-------------------------------------------------------------------------------------------
const fukuokakenshinrinSource = {
    id: "fukuokakenshinrin-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/shinrin/fukuokaken/fukuokashinrin.pmtiles",
    }
}
const fukuokakenshinrinLayer = {
    id: "oh-fukuokakenshinrin",
    type: "fill",
    source: "fukuokakenshinrin-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': [
            'match',
            ['get', 'rinsyu_nam'],
            '人工林', 'rgba(139, 69, 19, 0.8)', // 茶色（人工林, 透過度0.8）
            '天然林', 'rgba(34, 139, 34, 0.8)', // 緑色（天然林, 透過度0.8）
            '伐採跡地', 'rgba(169, 169, 169, 0.8)', // 灰色（伐採跡地, 透過度0.8）
            '竹林', 'rgba(107, 142, 35, 0.8)', // オリーブ色（竹林, 透過度0.8）
            'rgba(204, 204, 204, 0.8)' // デフォルト色（透過度0.8）
        ]
    }
};
const fukuokakenshinrinLayerLine = {
    id: "oh-fukuokakenshinrin-line",
    type: "line",
    source: "fukuokakenshinrin-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            12, 0,
            16, 2
        ]
    },
}

// 街区基準点--------------------------------------------------------------------------------------------
const gaikuSource = {
    id: "gaiku-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/gaiku/gaiku2.pmtiles",
    }
}
const gaikuLayer = {
    id: "oh-gaiku-layer",
    type: "circle",
    source: "gaiku-source",
    "source-layer": "point",
    filter: ['!=', ['get', '廃点情報'], '廃点'], // 廃点情報が "廃点" の場合は非表示
    'paint': {
        'circle-color': [
            'match',
            ['get', 'type'],
            'S', 'rgba(255, 100, 100, 1)', // Sは赤っぽく
            'T', 'rgba(100, 100, 255, 1)', // Tは青っぽく
            'TS', 'rgba(150, 50, 200, 1)', // TSは紫っぽく
            'SS', 'rgba(200, 200, 0, 1)', // SSは黄色っぽく
            'H', 'rgba(100, 200, 100, 1)', // Hは緑っぽく
            'red'
        ],
        'circle-opacity': 1, // すべて不透明
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,
            12,10,
            16,18
        ]
    }
}

const gaikuLabelLayer = {
    id: "oh-gaiku-label-layer",
    type: "symbol",
    source: "gaiku-source",
    "source-layer": "point",
    filter: ['!=', ['get', '廃点情報'], '廃点'], // 廃点情報が "廃点" の場合は非表示
    'layout': {
        'text-field': [
            'match',
            ['get', 'type'],
            'S', '三',
            'T', '多',
            'TS', '多節',
            'SS', '三節',
            'H', '補',
            '' // デフォルトは空文字
        ],
        'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,0,
            13, 14
        ],
        'text-anchor': 'center', // テキストを中央配置
        'text-allow-overlap': true // サークルとテキストの重なりを許可
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.5
    }
}

const gaikuLayerLabel = {
    id: "oh-gaiku-label",
    type: "symbol",
    source: "gaiku-source",
    "source-layer": "point",
    filter: ['!=', ['get', '廃点情報'], '廃点'], // 廃点情報が "廃点" の場合は非表示
    'layout': {
        'text-field': [
            'coalesce',
            ['get', '基準点等名称'], // 優先的に使用
            ['get', '街区点・補助点名称'] // 基準点等名称がない場合はこちらを使用
        ],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1.7],
        'text-allow-overlap': true // サークルとテキストの重なりを許可
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    // 'maxzoom': 25,
    'minzoom': 15
};
// 都市部官民基準点--------------------------------------------------------------------------------------------
const toshikanSource = {
    id: "toshikan-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/toshikan/toshikan.pmtiles",
    }
}
const toshikanLayer = {
    id: "oh-toshikan-layer",
    type: "circle",
    source: "toshikan-source",
    "source-layer": "point",
    filter: ['!=', ['get', '廃点情報'], '廃点'], // 廃点情報が "廃点" の場合は非表示
    'paint': {
        'circle-color': [
            'match',
            ['get', 'type'],
            'TKS', 'rgba(200, 100, 100, 1)', // Sは赤っぽく
            'TKT', 'green', // Tは青っぽく
            'red'
        ],
        'circle-opacity': 1, // すべて不透明
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,
            12,10,
            16,18

        ]
    }
}

const toshikanLabelLayer = {
    id: "oh-toshikan-label-layer",
    type: "symbol",
    source: "toshikan-source",
    "source-layer": "point",
    filter: ['!=', ['get', '廃点情報'], '廃点'], // 廃点情報が "廃点" の場合は非表示
    'layout': {
        'text-field': [
            'match',
            ['get', 'type'],
            'TKS', '都三',
            'TKT', '都多',
            '' // デフォルトは空文字
        ],
        'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,0,
            13, 14
        ],
        'text-anchor': 'center', // テキストを中央配置
        'text-allow-overlap': true // サークルとテキストの重なりを許可
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.5
    }
}

const toshikanLayerLabel = {
    id: "oh-toshikan-label",
    type: "symbol",
    source: "toshikan-source",
    "source-layer": "point",
    filter: ['!=', ['get', '廃点情報'], '廃点'], // 廃点情報が "廃点" の場合は非表示
    'layout': {
        'text-field': [
            'coalesce',
            ['get', '基準点等名称'], // 優先的に使用
            ['get', '街区点・補助点名称'] // 基準点等名称がない場合はこちらを使用
        ],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1.7],
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    // 'maxzoom': 24,
    'minzoom': 15
};

// VIRTUAL SHIZUOKA 静岡県 中・西部オルソ---------------------------------------------------------------------------------------------------------
const shizuokaOrthoSource = {
    id:'shizuoka-ortho-source', obj:{
        type: 'raster',
        tiles: ['https://kenzkenz4.xsrv.jp/tile/virtual-shizuoka/tyuseibu/{z}/{x}/{y}.png'],
        tileSize: 256, // タイルサイズに合わせる
        maxzoom: 19,   // 適切なズーム範囲を設定
        minzoom: 1,
        bounds: boundsSort([137.36343383789062,35.380092992092145,138.702392578125,34.51447797766275]),
        crossOrigin: "anonymous"
    }
}
const shizuokaOrthoLayer = {
    'id': 'oh-shizuoka-ortho-layer',
    'type': 'raster',
    'source': 'shizuoka-ortho-source',
}
// VIRTUAL SHIZUOKA 静岡県 伊豆西部オルソ-------------------------------------------------------------------------------------------------------
const shizuokaOrthoIzuseibuSource = {
    id:'shizuoka-ortho-izuseibu-source', obj:{
        type: 'raster',
        tiles: ['https://kenzkenz4.xsrv.jp/tile/virtual-shizuoka/izuseibu/{z}/{x}/{y}.png'],
        tileSize: 256, // タイルサイズに合わせる
        maxzoom: 19,   // 適切なズーム範囲を設定
        minzoom: 1,
        bounds: boundsSort([138.6951786465345,35.05418582519269,139.0030710863183,34.556764466321724])
    }
}
const shizuokaOrthoIzuseibuLayer = {
    'id': 'oh-shizuoka-ortho-izuseibu-layer',
    'type': 'raster',
    'source': 'shizuoka-ortho-izuseibu-source',
}
// VIRTUAL SHIZUOKA 静岡県 東部オルソ-------------------------------------------------------------------------------------------------------
const shizuokaOrthoTobuSource = {
    id:'shizuoka-ortho-tobu-source', obj:{
        type: 'raster',
        tiles: ['https://kenzkenz4.xsrv.jp/tile/virtual-shizuoka/tobu/{z}/{x}/{y}.png'],
        tileSize: 256, // タイルサイズに合わせる
        maxzoom: 19,   // 適切なズーム範囲を設定
        minzoom: 1,
        bounds: boundsSort([138.658447265625,35.43717666390691,139.20639038085938,34.61738705240718])
    }
}
const shizuokaOrthoTobuLayer = {
    'id': 'oh-shizuoka-ortho-tobu-layer',
    'type': 'raster',
    'source': 'shizuoka-ortho-tobu-source',
}
// VIRTUAL SHIZUOKA 静岡県 富士オルソ-------------------------------------------------------------------------------------------------------
const shizuokaOrthoFujiSource = {
    id:'shizuoka-ortho-fuji-source', obj:{
        type: 'raster',
        tiles: ['https://kenzkenz4.xsrv.jp/tile/virtual-shizuoka/fuji/{z}/{x}/{y}.png'],
        tileSize: 256, // タイルサイズに合わせる
        maxzoom: 19,   // 適切なズーム範囲を設定
        minzoom: 1,
        bounds: boundsSort([138.47923278808594,35.455636252952445,138.9269256591797,35.10418108827649])

    }
}
const shizuokaOrthoFujiLayer = {
    'id': 'oh-shizuoka-ortho-fuji-layer',
    'type': 'raster',
    'source': 'shizuoka-ortho-fuji-source',
}
// VIRTUAL SHIZUOKA 静岡県 北部 南アルプス-------------------------------------------------------------------------------------------------------
const shizuokaOrthoAlpusSource = {
    id:'shizuoka-ortho-alpus-source', obj:{
        type: 'raster',
        tiles: ['https://kenzkenz4.xsrv.jp/tile/virtual-shizuoka/alpus/{z}/{x}/{y}.png'],
        tileSize: 256, // タイルサイズに合わせる
        maxzoom: 19,   // 適切なズーム範囲を設定
        minzoom: 1,
        bounds: boundsSort([138.0037227785058,35.62288537726742,138.3478132990051,35.077789209561246])
    }
}
const shizuokaOrthoAlpusLayer = {
    'id': 'oh-shizuoka-ortho-alpus-layer',
    'type': 'raster',
    'source': 'shizuoka-ortho-alpus-source',
    // minzoom: 10,
}
// 福岡県土砂災害-------------------------------------------------------------------------------------------
const fukuokakenHazardSource = {
    id: "fukuokakenhazard-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/fukuokakenhazard/fukuokakenhazard.pmtiles",
    }
}
const fukuokakenHazardLayer = {
    id: "oh-fukuokakenhazard",
    type: "fill",
    source: "fukuokakenhazard-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': [
            'match',
            ['concat', ['get', 'genshoname'], ['get', 'kubun']],
            '土石流特別警戒区域', 'rgba(255, 0, 0, 0.8)', // 赤（特別警戒区域, 透過度0.8）
            '土石流警戒区域', 'rgba(255, 255, 0, 0.8)', // 黄色（警戒区域, 透過度0.8）
            '急傾斜地の崩壊特別警戒区域', 'rgba(255, 100, 0, 0.8)', // 赤（特別警戒区域, 透過度0.8）
            '急傾斜地の崩壊警戒区域', 'rgba(255, 200, 100, 0.8)', // 黄色（警戒区域, 透過度0.8）
            '地滑り特別警戒区域', 'rgba(255, 0, 200, 0.8)', // 赤（特別警戒区域, 透過度0.8）
            '地滑り警戒区域', 'rgba(255, 200, 200, 0.8)', // 黄色（警戒区域, 透過度0.8）
            'rgba(0, 0, 0, 0.8)' // その他（黒, 透過度0.8）
        ]
    }
}
const fukuokakenHazardLayerLine = {
    id: "oh-fukuokakenhazard-line",
    type: "line",
    source: "fukuokakenhazard-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            12, 0,
            16, 2
        ]
    },
}
// 佐賀県基準点 -----------------------------------------------------------------------------------------------------------------
const sagakijyuntenSource = {
    id: "saga-kijyunten-source", obj: {
        'type': 'geojson',
        'data': 'https://kenzkenz3.xsrv.jp/geojson/sagakijyunten.geojson',
    }
}
const sagakijyuntenPointLayer = {
    id: "oh-saga-kijyunten-point",
    type: "circle",
    source: "saga-kijyunten-source",
    paint: {
        'circle-color': 'navy', // 赤色で中心点を強調
        'circle-radius': 8, // 固定サイズの点
        'circle-opacity': 1,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
    }
};
const sagakijyuntenLabelLayer = {
    id: "oh-saga-kijyunten-label",
    type: "symbol",
    source: "saga-kijyunten-source",
    'layout': {
        'text-field': ['get', '点名'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 1)',
        'text-halo-color': 'rgba(0,0,0,1)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 国有林
const kokuyurinSource = {
    id: "kokuyurin-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kokuyurin/kokuyurin.pmtiles",
    }
}
const kokuyurinLayer = {
    id: "oh-kokuyurin-polygon",
    type: "fill",
    source: "kokuyurin-source",
    "source-layer": "polygon",
    paint: {
        "fill-color": "rgba(0, 128, 0, 0.6)"
    },
};
const kokuyurinLayerLine = {
    id: "oh-kokuyurin-line",
    type: "line",
    source: "kokuyurin-source",
    "source-layer": "polygon",
    paint: {
        "line-color": "black",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0,
            20, 4
        ]
    },
}
const kokuyurinLayerLabel = {
    id: "oh-kokuyurin-label",
    type: "symbol",
    source: "kokuyurin-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'A45_011'],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 1)',
        // 'text-halo-color': 'rgba(255,255,255,1)',
        // 'text-halo-width': 1.0,
    },
    'minzoom': 15
};
// // 地形分類テスト --------------------------------------------------------------------------------------------
// const chikeibunruiSource2 = {
//     id: "chikeibunrui-source", obj: {
//         type: "vector",
//         url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chikeibunrui/chikeibunrui.pmtiles",
//     }
// }
// const chikeibunruiLayer2 = {
//     id: "oh-chikeibunrui",
//     type: "fill",
//     source: "chikeibunrui-source",
//     "source-layer": "polygon",
//     'paint': {
//         'fill-color': 'rgba(255, 0, 0, 0.8)',
//     }
// }
// const chikeibunruiLine2 = {
//     id: "oh-chikeibunrui-line",
//     type: "line",
//     source: "chikeibunrui-source",
//     "source-layer": "polygon",
//     paint: {
//         'line-color': '#000',
//         'line-width': [
//             'interpolate', // Zoom-based interpolation
//             ['linear'],
//             ['zoom'], // Use the zoom level as the input
//             11, 0,
//             12, 0.5
//         ]
//     },
// }




// const aaa = new CustomMultiplyLayer({
//     id: 'oh-custom-multiply',
//     label: "乗算合成テスト",
//     source: 'multiply-source',
//     baseSource: 'dosya-source',
//     opacity: 0.8
// })
//
// console.log(aaa)

// // グループでクリックで追加するポイントのGeoJSONソースを作成
// const groupPointsSource ={
//     iD: 'group-points-source', obj: {
//         type: 'geojson',
//         data: {
//             type: 'FeatureCollection',
//             features: [
//             ]
//         }
//     }
// };
//
// // グループでポイントを描画するレイヤーを追加
// const groupPointsLayer = {
//     id: 'oh-group-points-layer',
//     type: 'circle',
//     source: 'group-points-source',
//     paint: {
//         'circle-radius': 8,
//         'circle-color': '#ff0000',
//         'circle-stroke-width': 2,
//         'circle-stroke-color': '#ffffff'
//     }
// }

export const groupGeojson = ref({
    type: 'FeatureCollection',
    features: []
})


export const groupPointsSource = {
    id: "group-points-source", obj: {
        'type': 'geojson',
        data: groupGeojson.value
    }
}
export const groupPointsLayer = {
    id: "oh-group-points-layer",
    type: "circle",
    source: "group-points-source",
    paint: {
        'circle-color': 'navy', // 赤色で中心点を強調
        'circle-radius': 8, // 固定サイズの点
        'circle-opacity': 1,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
    }
}

const getLayerData = (layerId) => {
    try {
        const layer = store?.state?.pointLayers?.find(l => l.id === layerId)
        return layer || { color: '#ff0000', features: [] }
    } catch (e) {
        console.warn('💥 store.state.pointLayers アクセスエラー:', e)
        return { color: '#ff0000', features: [] }
    }
}

// 1回だけ呼ぶ
const layerData = getLayerData('layer1')

const pointLayerSource1 = {
    id: 'point-layer-source1',
    obj: {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: layerData.features
        }
    }
}

const pointLayerLayer1 = {
    id: 'oh-point-layer-layer1',
    type: 'circle',
    source: 'point-layer-source1',
    paint: {
        'circle-radius': 6,
        'circle-color': layerData.color,  // ← レイヤーごとの色を反映
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2
    }
}
export const ohPointLayer =
    {id: 'oh-point-layer',
    type: 'circle',
    source: 'oh-point-source',
    paint: {
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 4,   // ズーム5では半径4
            10, 8,  // ズーム10では半径8
            15, 20  // ズーム15では半径20
        ],
        // 'circle-color': 'navy',
        'circle-color': ['coalesce', ['get', 'color'], 'black'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
    }}
export const ohLabelLayer = {
    id: 'oh-point-label-layer',
    type: 'symbol',
    source: 'oh-point-source',
    layout: {
        'text-field': ['get', 'title'],  // ← GeoJSON の properties.title を使う
        'text-font': ['Noto Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 14,
        'text-offset': [0, 0.5],
        'text-anchor': 'top'
    },
    paint: {
        'text-color': '#333',
        'text-halo-color': '#fff',
        'text-halo-width': 1.2
    }
}
// ---------------------------------------------------------------------------------------------------------------------
export const seaLevelSource = {
    id:"gsi-terrain-rgb",obj: {
        type: "raster-dem",
        tiles: ["https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png",],
        tileSize: 256,
        attribution:
            "<a href='https://maps.gsi.go.jp/development/ichiran.html#dem' target='_blank'>国土地理院 標高タイル</a>",
    }
}

export const seaLevellLayer = {
    id: "oh-sea-level",
    type: "color-relief",
    source: "gsi-terrain-rgb",
    paint: {
        "color-relief-color": [
            "interpolate",
            ["linear"],
            ["elevation"],
            0,
            "rgba(0,0,152,0.5)",
            1,
            "rgba(0,0,0,0)",
        ],
        "color-relief-opacity": 1,
    },
}
// ---------------------------------------------------------------------------------------------------------------------
// ソース
const t23kuSource = {
    id: "t23ku-source", obj:{
        type: "vector",
        url: "pmtiles://https://kenzkenz2.xsrv.jp/pmtiles/23kuNew.pmtiles",
    }
}
const t23kuLayer = {
    id: "t23ku-source-line",
    type: "line",
    source: "t23ku-source",
    "source-layer": "oh3",
    paint: {
        "line-color": "blue",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.1,
            20, 4
        ]
    },
}
// ---------------------------------------------------------------------------------------------------------------------
let layers01 = [
    {
        id: 'oh-homusyo-2025-layer',
        label: "2025登記所地図",
        sources: [homusyo2025Source,homusyo2025DDissolvedSource,homusyo2025NinizahyoSource],
        layers: [homusyo2025Layer,homusyo2025LayerLine,homusyo2025LayerLabel,homusyo2025LayerVertex,homusyo2025DissolvedAllLayer,homusyo2025DissolvedLayer,homusyo2025NinizahyoCircle,homusyo2025NinizahyoSymbol],
        attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
        ext: {name:'extTokijyo2025'}
    },
    {
        id: 'oh-homusyo-2025-kijyunten',
        label: "2025登記所地図-基準点",
        sources: [homusyo2025KijyuntenSource],
        layers: [homusyo2025LayerKijyunten,homusyo2025LayerKijyuntenLabel],
        attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
        ext: {name:'extKijyunten'}
    },
    {
        id: 'oh-homusyo-2025-zukaku',
        label: "2025登記所地図-図郭",
        sources: [homusyo2025ZukakuSource],
        layers: [homusyo2025LayerZukaku,homusyo2025LayerZukakuLine,homusyo2025LayerZukakuLabel],
        attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
    },
    {
        id: 'oh-chibanzu-all2',
        label: '⭐️全国地番図公開マップ️',
        sources: [cityGeojsonSource,...chibanzuSources,...publicSources],
        layers: [cityGeojsonPolygonLayer,cityGeojsonLineLayer,cityGeojsonLabelLayer,cityGeojsonLabelLayer2],
        ext: {name:'ext-chibanzu'}
    },
    {
        id: 'hikkai',
        label: "筆界調査データベース",
        nodes: [
            // {
            //     id: 'oh-homusyo-2025-layer',
            //     label: "2025登記所地図",
            //     sources: [homusyo2025Source,homusyo2025DaihyoSource,homusyo2025DaihyoSource2],
            //     layers: [homusyo2025Layer,homusyo2025LayerLine,homusyo2025LayerLabel,homusyo2025LayerVertex,homusyo2025LayerDaihyou,homusyo2025LayerSearchedPoint],
            //     attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
            //     ext: {name:'extTokijyo2025'}
            // },
            // {
            //     id: 'oh-homusyo-2025-layer',
            //     label: "2025登記所地図",
            //     sources: [homusyo2025Source,homusyo2025DDissolvedSource],
            //     layers: [homusyo2025Layer,homusyo2025LayerLine,homusyo2025LayerLabel,homusyo2025LayerVertex,homusyo2025DissolvedAllLayer,homusyo2025DissolvedLayer],
            //     attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
            //     ext: {name:'extTokijyo2025'}
            // },
            {
                id: 'oh-homusyo-2025-kijyunten',
                label: "2025登記所地図-基準点",
                sources: [homusyo2025KijyuntenSource],
                layers: [homusyo2025LayerKijyunten,homusyo2025LayerKijyuntenLabel],
                attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
                ext: {name:'extKijyunten'}
            },
            {
                id: 'oh-homusyo-2025-zukaku',
                label: "2025登記所地図-図郭",
                sources: [homusyo2025ZukakuSource],
                layers: [homusyo2025LayerZukaku,homusyo2025LayerZukakuLine,homusyo2025LayerZukakuLabel],
                attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
            },
            {
                id: 'oh-syochiiki2',
                label: "2020 町丁・字等別境界",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikLayerLine2,syochiikiLayerLabel2],
                attribution: '出典：<a href="https://www.e-stat.go.jp/stat-search/files?page=1&toukei=00200521&tstat=000001136464&cycle=0&tclass1=000001136472" target="_blank">e-Stat</a>',
                // ext: {name:'extSyochiiki'}
            },
            {
                id: 'oh-fude',
                label: "農地の区画情報(筆ポリゴン)",
                source: fudeSource,
                layers:[fudeLayer,fudeLine],
                attribution: '<a href="https://www.maff.go.jp/j/tokei/porigon/" target="_blank">農地の区画情報（筆ポリゴン）のデータ提供・利用</a>'
            },
            // {
            //     id: 'oh-zeni',
            //     label: "善意の基準局",
            //     sources: [zeniSource,zeniCircleSource],
            //     layers:[zeniCircleLayer,zeniCenterPointLayer,zeniCircleLayerLine],
            //     attribution: '<a href="https://github.com/Bolero-fk/ZeniKijunkyokuChecker" target="_blank">ZeniKijunkyokuChecker</a><br>' +
            //         '<a href="https://rtk.silentsystem.jp/" target="_blank">善意の基準局掲示板</a>',
            //     ext: {name:'extZeni'}
            // },
            {
                id: 'oh-minden',
                label: "民間等電子基準点",
                sources: [mindenSource, mindenCircleSource],
                layers:[mindenCircleLayer, mindenCenterPointLayer, mindenCircleLayerLine],
                attribution: '<a href="https://sakura.3ku.jp/gnss/private_gnss-based_control_station/minden/" target="_blank">桜町測量 日々是精進</a>' ,
                ext: {name:'extMinden'}
            },
            {
                id: 'oh-ntrip',
                label: "その他RTK基準局",
                sources: [ntripSource, ntripCircleSource],
                layers:[ntripCircleLayer, ntripCenterPointLayer, ntripCircleLayerLine],
                attribution: '<a href="http://ntrip1.bizstation.jp:2101/" target="_blank">Link1</a> ' +
                             '<a href="http://geortk.jp:2101/" target="_blank">Link2</a><br>',
                ext: {name:'extNtrip'}
            },
            {
                id: 'oh-nogyochiiki',
                label: "H27農業地域",
                source: nogyochiikiSource,
                layers:[nogyochiikiLayer,nogyochiikiLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A12.html" target="_blank">国土数値情報</a>'
                // ext: {name:'extTokijyo'}
            },
            {
                id: 'oh-kizyunten',
                label: "基本基準点",
                source: kizyuntenSource,
                layers:[kizyuntenPoint,kizyuntenPointLabel],
                attribution: '<a href="" target="_blank"></a>',
                ext: {name:'extKhonkijyunten'}
            },
            {
                id: 'oh-toshikan',
                label: "都市部官民基準点",
                source: toshikanSource,
                layers:[toshikanLayer,toshikanLayerLabel,toshikanLabelLayer],
                attribution: '<a href="https://gaikuchosa.mlit.go.jp/gaiku/system/download_kanmin.phtml" target="_blank">都市部官民基準点</a>',
                ext: {name:'extToshikan'}
            },
            {
                id: 'oh-gaiku',
                label: "街区基準点",
                source: gaikuSource,
                layers:[gaikuLayer,gaikuLayerLabel,gaikuLabelLayer],
                attribution: '<a href="https://gaikuchosa.mlit.go.jp/gaiku/system/download.phtml" target="_blank">街区基準点</a>',
                ext: {name:'extGaiku'}
            },
            {
                id: 'oh-saga-kijyunten',
                label: "佐賀県基準点",
                source: sagakijyuntenSource,
                layers:[sagakijyuntenPointLayer, sagakijyuntenLabelLayer],
                                attribution: '<a href="http://www.sagakoushoku.com/toukikijyunten/" target="_blank">佐賀県公共嘱託登記土地家屋調査士協会</a>',
                ext: {name:'extSaga'}
            },
            {
                id: 'citychibanzu',
                label: "市町村地番図",
                nodes: [
                    // {
                    //     id: 'oh-chibanzu-all',
                    //     label: "全国地番図（オープンデータ）",
                    //     sources: chibanzuSources,
                    //     layers: chibanzuLayers0,
                    //     ext: {name:'ext-chibanzu'}
                    // },
                    // {
                    //     id: 'oh-chibanzu-all2',
                    //     label: '全国地番図公開マップ',
                    //     sources: [cityGeojsonSource,...chibanzuSources,...publicSources],
                    //     layers: [...chibanzuLayers1,...publicLayers0,cityGeojsonPolygonLayer,cityGeojsonLineLayer,cityGeojsonLabelLayer],
                    //     // sources: [cityPmtilesSource,...chibanzuSources,...publicSources],
                    //     // layers: [...chibanzuLayers1,...publicLayers0,cityPmtilesPolygonLayer,cityPmtilesLineLayer,cityPmtilesLabelLayer],
                    //     ext: {name:'ext-chibanzu'}
                    // },
                    ...chibanzuLayers2,
                    ...publicLayers,
                ]
            },
        ]},
    {
        id: 'fudosan',
        label: "不動産情報",
        nodes: [
            {
                id: 'oh-koji',
                label: "公示価格（R06）",
                source: kojiSource,
                layers:[kojiLayerPoint,kojiLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-2024.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-koji-3d',
                label: "公示価格（R06）3D",
                source: kojiSource,
                layers:[kojilayerheight],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-2024.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgb(225, 49, 33);"></span>1000万円以上</li>' +
                    '<li><span style="background:rgb(225, 61, 35);"></span>100万円ー1000万円</li>' +
                    '<li><span style="background:rgb(226, 84, 39);"></span>75万円ー100万円</li>' +
                    '<li><span style="background:rgb(231, 145, 52);"></span>50万円ー75万円</li>' +
                    '<li><span style="background:rgb(235, 178, 61);"></span>25万円ー50万円</li>' +
                    '<li><span style="background:rgb(239, 211, 71);"></span>10万円ー25万円</li>' +
                    '<li><span style="background:rgb(245, 245, 81);"></span>10万円未満</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-chika',
                label: "都道府県地価調査（R06）3D",
                source: chikaSource3d,
                layers:[chikalayerheight],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L02-2024.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgb(225, 49, 33);"></span>1000万円以上</li>' +
                    '<li><span style="background:rgb(225, 61, 35);"></span>100万円ー1000万円</li>' +
                    '<li><span style="background:rgb(226, 84, 39);"></span>75万円ー100万円</li>' +
                    '<li><span style="background:rgb(231, 145, 52);"></span>50万円ー75万円</li>' +
                    '<li><span style="background:rgb(235, 178, 61);"></span>25万円ー50万円</li>' +
                    '<li><span style="background:rgb(239, 211, 71);"></span>10万円ー25万円</li>' +
                    '<li><span style="background:rgb(245, 245, 81);"></span>10万円未満</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'citychibanzu',
                label: "市町村地番図",
                nodes: [
                    ...chibanzuLayers2,
                ]
            },
            {
                id: 'hazard',
                label: "ハザードマップ等",
                nodes: [
                    {
                        id: 'hinanbasyo',
                        label: "指定緊急避難場所",
                        nodes: [
                            {
                                id: 'oh-hinanjyo-kozui',
                                label: "指定緊急避難場所(洪水)",
                                source: hinanjyoKozuiSource,
                                layers: [hinanjyoKozuiLayer,hinanjyoKozuiLayerLabel],
                            },
                            {
                                id: 'oh-tsunami-kozui',
                                label: "指定緊急避難場所(津波)",
                                source: hinanjyoTsunamiSource,
                                layers: [hinanjyoTsunamiLayer,hinanjyoTsunamiLayerLabel],
                            },
                            {
                                id: 'oh-hinanjyo-dosekiryu',
                                label: "指定緊急避難場所(崖崩れ等)",
                                source: hinanjyoDosekiryuSource,
                                layers: [hinanjyoDosekiryuLayer,hinanjyoDosekiryuLayerLabel],
                                attribution: '指定緊急避難場所(崖崩れ、土石流及び地滑り)'
                            },
                        ]
                    },
                    {
                        id: 'oh-kozui-saidai',
                        label: "洪水浸水想定（想定最大規模）",
                        source: kozuiSaidaiSource,
                        layers: [kozuiSaidaiLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a><br><br>' +
                            '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '">'
                    },
                    {
                        id: 'oh-keikaku-saidai',
                        label: "洪水浸水想定（計画規模）",
                        source: kozuikeikskuSource,
                        layers: [kozuiKeikskuLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a><br><br>' +
                            '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '">'
                    },
                    {
                        id: 'oh-tsunami',
                        label: "津波浸水想定",
                        source: tsunamiSource,
                        layers: [tsunamiLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a><br><br>' +
                            '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '">'
                    },
                    {
                        id: 'oh-tameike',
                        label: "ため池決壊による浸水想定",
                        source: tameikeSource,
                        layers: [tameikeLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
                    },
                    {
                        id: 'oh-dosya',
                        label: "土砂災害警戒区域",
                        source: dosyaSource,
                        layers: [dosyaLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
                    },
                    {
                        id: 'oh-dosekiryu',
                        label: "土石流危険渓流",
                        source: dosekiryuSource,
                        layers: [dosekiryuLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
                    },
                    {
                        id: 'oh-kyukeisya',
                        label: "急傾斜地崩壊危険箇所",
                        source: kyukeisyaSource,
                        layers: [kyukeisyaLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
                    },
                    {
                        id: 'oh-jisuberi',
                        label: "地すべり危険箇所",
                        source: jisuberiSource,
                        layers: [jisuberiLayer],
                        attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
                    },
                    {
                        id: 'oh-kansui',
                        label: "道路冠水想定箇所（アンダーパス等",
                        source: kansuiSource,
                        layers: [kansuiLayer,kansuiLayerLabel],
                    },
                    {
                        id: 'oh-tsunami-height',
                        label: "津波浸水想定3D",
                        source: tsunamiSource2,
                        layers: [tsunamiLayerHeight],
                        attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A40-2023.html" target="_blank">国土数値情報</a>'

                    },
                    {
                        id: 'oh-nantora-height',
                        label: "宮崎県南海トラフ津波浸水想定3D",
                        source: nantoraSource,
                        layers: [nantoraLayerHeight],
                    },
                    {
                        id: 'oh-hokkaidotsunami-height',
                        label: "北海道津波浸水想定3D",
                        source: hokkaidotsunamiSource,
                        layers: [hokkaidotsunamiLayerHeight],
                    },
                    {
                        id: 'oh-zosei',
                        label: "R05大規模盛土造成地",
                        source: zoseiSource,
                        layers: [zoseiLayer,zoseiLayerLine,zoseiLayerLabel],
                        attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A54-2023.html" target="_blank">国土数値情報</a>'
                    },
                    {
                        id: 'oh-tokyojishin',
                        label: "地震に関する危険度一覧(東京都)",
                        source: tokyojishinSource,
                        layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel],
                    },
                    {
                        id: 'oh-tokyojishin3d',
                        label: "地震に関する危険度一覧(東京都)3D",
                        source: tokyojishinSource,
                        layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheightSogo],
                    },
                    // {
                    //     id: 'oh-tokyojishin',
                    //     label: "地震に関する危険度一覧(東京都)",
                    //     source: tokyojishinSource,
                    //     layers: [tokyojishinLayer,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheight],
                    // },
                    {
                        id: 'oh-densyohi',
                        label: "災害伝承碑",
                        source: densyohiSource,
                        layers: [densyohiLayer,densyohiLayerLabel],
                    },
                    {
                        id: 'oh-fukuokakenhazard',
                        label: "福岡県土砂災害",
                        source: fukuokakenHazardSource,
                        layers: [fukuokakenHazardLayer,fukuokakenHazardLayerLine],
                        attribution: '<a href="https://ckan.open-governmentdata.org/dataset/401000_dosyasaigaikeikaikuikitoudata" target="_blank">福岡県　土砂災害警戒区域等のshapeデータ</a>'
                    },
                ]
            },
            {
                id: 'oh-fude',
                label: "農地の区画情報(筆ポリゴン)",
                source: fudeSource,
                layers:[fudeLayer,fudeLine],
                attribution: '<a href="https://www.maff.go.jp/j/tokei/porigon/" target="_blank">農地の区画情報（筆ポリゴン）のデータ提供・利用</a>'
            },
            {
                id: 'oh-nogyochiiki',
                label: "H27農業地域",
                source: nogyochiikiSource,
                layers:[nogyochiikiLayer,nogyochiikiLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A12.html" target="_blank">国土数値情報</a>'
                // ext: {name:'extTokijyo'}
            },
            {
                id: 'oh-syochiiki',
                label: "2020国勢調査小地域人口ピラミッド",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikLayerLine,syochiikiLayerLabel],
                attribution: '出典：<a href="https://www.e-stat.go.jp/stat-search/files?page=1&toukei=00200521&tstat=000001136464&cycle=0&tclass1=000001136472" target="_blank">e-Stat</a>',
                ext: {name:'extSyochiiki'}
            },
            {
                id: 'oh-did',
                label: "人口集中地区",
                source: didSource,
                layers: [didLayer,didLayerLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A16-v2_3.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-bus',
                label: "R04バスルートと停留所",
                sources: [busSource,busteiSource],
                layers: [busLayer,busteiLayer,busteiLayerLabel],
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N07-v2_0.html' target='_blank'>国土数値情報</a>",
                ext: {name:'extBus',parameters:[]}
            },
            {
                id: 'oh-tetsudo',
                label: "鉄道（廃線は赤色）",
                source: tetsudoSource,
                layers: [tetsudoLayerRed,tetsudoLayerBlue,tetsudoLayerPointRed,tetsudoLayerPointBlue],
            },
            {
                id: 'oh-ekibetsukyaku',
                label: "駅別乗降客数",
                sources: [ekibetsukyakuSource],
                layers: [ekibetsukyakuLine,ekibetsukyakuLabel],
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2022.html' target='_blank'>国土数値情報</a>",
            },
            {
                id: 'oh-ekibetsukyaku-3d',
                label: "駅別乗降客数３D",
                sources: [ekibetsukyakuSource3d,tetsudo2Source],
                layers: [tetsudoLine,ekibetsukyakuHeight],
                ext: {name:'extKyakusu'},
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2022.html' target='_blank'>国土数値情報</a>" +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:hsl(240, 100%, 50%);"></span>0 - 99人</li>' +
                    '<li><span style="background:hsl(230, 100%, 55%);"></span>100 - 299人</li>' +
                    '<li><span style="background:hsl(220, 100%, 60%);"></span>300 - 499人</li>' +
                    '<li><span style="background:hsl(210, 100%, 65%);"></span>500 - 999人</li>' +
                    '<li><span style="background:hsl(200, 100%, 70%);"></span>1000 - 4999人</li>' +
                    '<li><span style="background:hsl(180, 100%, 50%);"></span>5000 - 19999人</li>' +
                    '<li><span style="background:hsl(150, 100%, 50%);"></span>20000 - 99999人</li>' +
                    '<li><span style="background:hsl(120, 100%, 50%);"></span>100000 - 499999人</li>' +
                    '<li><span style="background:hsl(60, 100%, 50%);"></span>500000 - 1199999人</li>' +
                    '<li><span style="background:hsl(0, 100%, 50%);"></span>1200000人+</li>' +
                    '</ul>' +
                    '</div>',
                // info:true
            },
            {
                id: 'oh-yochien',
                label: "幼稚園・保育園等（R0２）",
                source: yochienSource,
                layers: [yochienLayer,yochienLayerLabel]
            },
            {
                id: 'oh-syogakkoR05',
                label: "小学校（R05）",
                source: syogakkoR05Source,
                layers: [syogakkoR05Layer,syogakkoR05LayerLine,syogakkoR05LayerLabel,syogakkoR05LayerPoint],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A27-2023.html" target="_blank">国土数値情報</a>'

            },
            {
                id: 'oh-cyugakuR05',
                label: "中学校（R05）",
                source: cyugakuR05Source,
                layers: [cyugakuR05Layer,cyugakuR05LayerLine,cyugakuR05LayerLabel,cyugakuR05LayerPoint],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A32-2023.html" target="_blank">国土数値情報</a>'

            },
            {
                id: 'oh-iryokikan',
                label: "医療機関（R02）",
                source: iryokikanSource,
                layers: [iryokikanLayer,iryokikanLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P04-2020.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-city-h12',
                label: "H12市町村",
                source: cityH12Source,
                layers: [cityH12Layer,cityH12LayerLine,cityH12LayerLabel],
                ext: {name:'ext-city-h12'},
            },
            {
                id: 'oh-city-r05',
                label: "R05市町村",
                source: cityR05Source,
                layers: [cityR05Layer,cityR05LayerLine,cityR05LayerLabel],
                ext: {name:'ext-city-r05'},
            },
            {
                id: 'oh-yotochiikiP',
                label: "用途地域",
                source: yotochiikiPSource,
                layers: [yotochiikiPLayer,yotochiikiPLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-tokei',
                label: "都市計画区域",
                source: tokeiSource,
                layers: [tokeiLayer,tokeiLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-kuikikubun',
                label: "市街化調整区域",
                source: kuikikubunSource,
                layers: [kuikikubunLayer,kuikikubunLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-tkbt',
                label: "特別用途地区",
                source: tkbtSource,
                layers: [tkbtLayer,tkbtLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-inei',
                label: "陰影起伏図",
                source: ineiSource,
                layers: [ineiLayer]
            },
            {
                id: 'oh-jinkochikei',
                label: "人工地形",
                source: jinkochikeiSource,
                layers: [jinkochikeiLayer],
                attribution: '<a href="https://github.com/gsi-cyberjapan/experimental_landformclassification" target="_blank">国土地理院ベクトルタイル提供実験（地形分類）</a>'
            },
            {
                id: 'oh-teii',
                label: "低位地帯",
                source: teiiSource,
                layers: [teiiLayer],
                attribution: '<div style="width: 200px;"><a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-G08-2015.html" target="_blank">国土数値情報</a><br>' +
                    '本データは、周辺部よりも標高が低く、排水が困難である地帯（低位地帯）を整備したものである。<br>' +
                    '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '"></div>',
                info: true
            },
            {
                id: 'oh-kosyo',
                label: "湖沼",
                source: kosyoSource,
                layers: [kosyoLayer,kosyoLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W09-2005.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-danso',
                label: "都市圏活断層図",
                source: dansoSource,
                layers: [dansoLayer],
                attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html#afm" target="_blank">地理院タイル</a>'
            },
            {
                id: 'oh-kyusekki',
                label: "全国旧石器遺跡",
                source: kyusekkiSource,
                layers: [kyusekkiLayer,kyusekkiLayerHeatmap],
            },
        ]
    },
    {
        id: 'gsi',
        label: (isGsiNew ? '<span style="color: red;">new </span>' : '') + "⭐️地理院タイル全て（テスト中）",
        nodes: convertTileJson
    },
    {
        id: 1,
        label: "基本地図",
        nodes: [
            {
                id: 'OSM',
                label: "OSM",
                nodes: [
                    {
                        id: 'oh-vector-layer-osm-bright',
                        label: "OSMベクター",
                        sources: osmBrightSources,
                        layers: osmBrightLayers,
                        attribution: '© <a href="https://wiki.openstreetmap.org/wiki/Japan/OSMFJ_Tileserver" target="_blank">OpenStreetMap</a> contributors',
                    },
                    {
                        id: 'oh-vector-layer-osm-3d',
                        label: "OSMベクター3D",
                        sources: osm3dSources,
                        layers: osm3dLayers,
                        attribution: '© <a href="https://wiki.openstreetmap.org/wiki/Japan/OSMFJ_Tileserver" target="_blank">OpenStreetMap</a> contributors',
                    },
                    {
                        id: 'oh-osm',
                        label: "OSMラスター",
                        source: osmSource,
                        layers: [osmLayer],
                        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
                    },
                    {
                        id: 'oh-overpass',
                        label: "OSM overpass",
                        source: overpassSource,
                        layers: [overpassPolygon,overpassPolygonLine,overpassLine,overpassPoint],
                        attribution: '© <a href="https://wiki.openstreetmap.org/wiki/Japan/Community_Overpass_API" target="_blank">OpenStreetMap</a> contributors<br>' +
                        '<a href="https://wiki.openstreetmap.org/wiki/JA:How_to_map_a" target="_blank">How to map a</a>',
                        ext: {name:'extOSM'}
                    },
                    // {
                    //     id: 'oh-vector-layer-osm-toner',
                    //     label: "OSMベクター・トナー",
                    //     sources: osmTonerSources,
                    //     layers: osmTonerLayers,
                    //     attribution: '© <a href="https://wiki.openstreetmap.org/wiki/Japan/OSMFJ_Tileserver" target="_blank">OpenStreetMap</a> contributors',
                    // },
                ]},
            {
                id: 'oh-vector-fx-basic',
                label: "地理院ベクター",
                sources: fxBasicSources,
                layers: fxBasicLayers,
                // ext: {name:'extChiriin'}
            },
            {
                id: 'oh-vector-mono',
                label: "地理院ベクター・モノクロ",
                sources: monoSources,
                layers: monoLayers,
                ext: {name:'extChiriinMono'}
            },
            {
                id: 'oh-vector-fx-dark',
                label: "地理院ベクター・ダーク",
                sources: fxDarkSources,
                layers: fxDarkLayers,
                // ext: {name:'extChiriinDark'}
            },
            {
                id: 'oh-stdLayer',
                label: "地理院標準地図",
                source: stdSource,
                layers: [stdLayer]
            },
            {
                id: 'oh-pale-layer',
                label: "地理院淡色地図",
                source: paleSource,
                layers: [paleLayer]
            },
            {
                id: 'oh-plateauPmtiles',
                label: "PLATEAU建物",
                source: plateauPmtilesSource,
                layers: [plateauPmtilesLayer]
            },
            {
                id: 'oh-plateau-tokyo23ku',
                label: "PLATEAU建物東京都23区",
                source: plateauTokyo23kuSource,
                layers: [plateauTokyo23kuLayer],
                attribution: '<a href="https://github.com/indigo-lab/plateau-lod2-mvt?tab=readme-ov-file">plateau-lod2-mvt</a>'
            },
        ]
    },
    {
        id: 'syashin',
        label: "航空写真",
        nodes: [
            {
                id: 'oh-seamlessphoto',
                label: "最新写真",
                source: seamlessphotoSource,
                layers: [seamlessphotoLayer]
            },
            {
                id: 'virtual-shiazuok',
                label: "VIRTUAL SHIZUOKA 静岡県",
                nodes: [
                    {
                        id: 'oh-virtual-shiazuoka-zenbu',
                        label: "VIRTUAL SHIZUOKA 静岡県 全部",
                        sources: [shizuokaOrthoSource,shizuokaOrthoTobuSource,shizuokaOrthoIzuseibuSource,shizuokaOrthoFujiSource,shizuokaOrthoAlpusSource],
                        layers: [shizuokaOrthoLayer,shizuokaOrthoTobuLayer,shizuokaOrthoIzuseibuLayer,shizuokaOrthoFujiLayer,shizuokaOrthoAlpusLayer],
                    },
                    {
                        id: 'oh-virtual-shiazuoka-tobu',
                        label: "VIRTUAL SHIZUOKA 静岡県 中・西部",
                        source: shizuokaOrthoSource,
                        layers: [shizuokaOrthoLayer],
                        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/virtual-shizuoka-mw" target="_blank">VIRTUAL SHIZUOKA 静岡県 中・西部 点群データ</a>'
                    },
                    {
                        id: 'oh-virtual-shiazuoka-tobu2',
                        label: "VIRTUAL SHIZUOKA 静岡県 東部",
                        source: shizuokaOrthoTobuSource,
                        layers: [shizuokaOrthoTobuLayer],
                        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/virtual-shizuoka-mw" target="_blank">VIRTUAL SHIZUOKA 静岡県 中・西部 点群データ</a>'
                    },
                    {
                        id: 'oh-virtual-shiazuoka-izuseibu',
                        label: "VIRTUAL SHIZUOKA 静岡県 伊豆西部",
                        source: shizuokaOrthoIzuseibuSource,
                        layers: [shizuokaOrthoIzuseibuLayer],
                        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/shizuoka-2020-pointcloud" target="_blank">VIRTUAL SHIZUOKA 静岡県 伊豆西部 点群データ</a>'
                    },
                    {
                        id: 'oh-virtual-shiazuoka-fuji',
                        label: "VIRTUAL SHIZUOKA 静岡県 富士",
                        source: shizuokaOrthoFujiSource,
                        layers: [shizuokaOrthoFujiLayer],
                        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/shizuoka-2021-pointcloud" target="_blank">VIRTUAL SHIZUOKA 静岡県 富士山および静岡東部 点群データ</a>'
                    },
                    {
                        id: 'oh-virtual-shiazuoka-alpus',
                        label: "VIRTUAL SHIZUOKA 静岡県 北部",
                        source: shizuokaOrthoAlpusSource,
                        layers: [shizuokaOrthoAlpusLayer],
                        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/shizuoka-2022-pointcloud" target="_blank">VIRTUAL SHIZUOKA 静岡県 北部（南アルプス） 点群データ</a>'
                    }

                    ]
            },
            {
                id: 'oh-sp87',
                label: "1987~90年航空写真(一部)",
                source: sp87Source,
                layers: [sp87Layer],
                // ext: {name:'ext-sp87'}
            },
            {
                id: 'oh-sp84',
                label: "1984~86年航空写真(一部)",
                source: sp84Source,
                layers: [sp84Layer],
                // ext: {name:'ext-sp84'}
            },
            {
                id: 'oh-sp79',
                label: "1979~83年航空写真(一部)",
                source: sp79Source,
                layers: [sp79Layer],
                // ext: {name:'ext-sp79'}
            },
            {
                id: 'oh-sp74',
                label: "1974~78年航空写真(全国)",
                source: sp74Source,
                layers: [sp74Layer],
                // ext: {name:'ext-sp74'}
            },
            {
                id: 'oh-sp61',
                label: "1961~64年航空写真(一部)",
                source: sp61Source,
                layers: [sp61Layer],
                // ext: {name:'ext-sp61'}
            },
            {
                id: 'oh-sp45',
                label: "1945~50年航空写真(一部)",
                source: sp45Source,
                layers: [sp45Layer],
                // ext: {name:'ext-sp45'}
            },
            {
                id: 'oh-sp36',
                label: "1936~42年航空写真(一部)",
                source: sp36Source,
                layers: [sp36Layer],
                // ext: {name:'ext-sp36'}
            },
            {
                id: 'oh-sp28',
                label: "1928年航空写真(大阪府)",
                source: sp28Source,
                layers: [sp28Layer],
                // ext: {name:'ext-sp28'}
            },
            {
                id: 'oh-kanagawa-syashin',
                label: "神奈川航空写真",
                source: kanagawaSyashinSource,
                layers: [kanagawaSyashinLayer]
            },
            {
                id: 'oh-yokohama-syashin',
                label: "横浜北部、川崎航空写真",
                source: yokohamaSyashinSource,
                layers: [yokohamaSyashinLayer]
            },
            {
                id: 'oh-miyazaki-syashin',
                label: "宮崎県航空写真",
                source: miyazakiSyashinSource,
                layers: [miyazakiSyashinLayer]
            },
            {
                id: 'oh-dronebird',
                label: "DRONEBIRD",
                source: dronebirdSource,
                layers: [dronebirdLayer]
            },
        ]
    },
    {
        id: 'kochizu',
        label: "古地図等",
        nodes: [
            {
                id: 'oh-mw5',
                label: "戦前の旧版地形図（５万分の1）",
                sources: [mw5DummySource,mw5CenterSource],
                layers: [mw5DummyLayer,mw5CenterLabel]
            },
            {
                id: 'ams',
                label: "戦後の米軍地図",
                nodes: [
                    {
                        id: 'oh-ams',
                        label: "戦後の米軍作成地図全て",
                        sources: [...amsSources,...amsGeojsonSources],
                        layers: [...amsLayers,...amsGeojsonLayers,...amsGeojsonLabelLayers],
                    },
                    ...amsLayers2,
                ]
            },
            {
                id: 'kirie',
                label: "江戸切絵図",
                nodes: [
                    {
                        id: 'oh-kirie-all',
                        label: "江戸切絵図全て",
                        sources: kirieSources,
                        layers: kirieLayers,
                        attribution: '<a href="http://codh.rois.ac.jp/edo-maps/owariya/" target="_blank">人文学オープンデータ共同利用センター</a>' +
                            '<br><br><a href="https://mapwarper.h-gis.jp/maps?utf8=%E2%9C%93&field=title&query=%E6%B1%9F%E6%88%B8%E5%88%87%E7%B5%B5%E5%9B%B3&from=1527&to=2025&show_warped=0" target="_blank">日本版Map Warper</a>'
                    },
                    ...kirieLayers2,
                ]
            },
            konjyakuMap,
            {
                id: 'oh-jinsoku',
                label: "迅速測図",
                sources: [jinsokuSource],
                layers: [jinsokuLayer],
                // ext: {name:'ext-jinsoku'}
            },
            {
                id: 'oh-jissoku',
                label: "北海道実測切図",
                sources: [jissokuSource,jissokuMatsumaeSource],
                layers: [jissokuLayer,jissokuMatsumaeLayer]
            },
        ]
    },
    {
        id: 'tokei',
        label: "統計",
        nodes: [
            {
                id: 'oh-syochiiki',
                label: "2020国勢調査小地域人口ピラミッド",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikLayerLine,syochiikiLayerLabel],
                attribution: '出典：<a href="https://www.e-stat.go.jp/stat-search/files?page=1&toukei=00200521&tstat=000001136464&cycle=0&tclass1=000001136472" target="_blank">e-Stat</a>',
                ext: {name:'extSyochiiki'}
            },
            {
                id: 'oh-syochiiki-2',
                label: "2020国勢調査小地域人口密度3D",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikiLayerHeight],
                attribution: '出典：<a href="https://www.e-stat.go.jp/stat-search/files?page=1&toukei=00200521&tstat=000001136464&cycle=0&tclass1=000001136472" target="_blank">e-Stat</a>',
            },
            {
                id: 'oh-m100m',
                label: "100mメッシュ人口(2020)",
                source: m100mSource,
                layers: [m100mLayer,m100mLayerLine,m100mLayerLabel],
                attribution: '出典：<a href="https://gtfs-gis.jp/teikyo/" target="_blank">地域分析に有用なデータの提供</a>',

            },
            {
                id: 'oh-m100m-3d',
                label: "100mメッシュ人口3D(2020)",
                source: m100mSource,
                layers: [m100mLayer,m100mLayerLine,m100mLayerLabel,m100mLayerHeight],
                attribution: '出典：<a href="https://gtfs-gis.jp/teikyo/" target="_blank">地域分析に有用なデータの提供</a>',
            },
            {
                id: 'oh-m250m',
                label: "250mメッシュ人口(2020)",
                source: m250mSource,
                layers: [m250mLayer,m250mLayerLine,m250mLayerLabel],
                attribution: '出典：<a href="https://www.e-stat.go.jp/gis/statmap-search?page=1&type=1&toukeiCode=00200521&toukeiYear=2020&aggregateUnit=Q&serveyId=Q002005112020&statsId=T001142" target="_blank">e-Stat</a>',
            },
            {
                id: 'oh-m250m-3d',
                label: "250mメッシュ人口3D(2020)",
                source: m250mSource,
                layers: [m250mLayer,m250mLayerLine,m250mLayerLabel,m250mLayerHeight],
                attribution: '出典：<a href="https://www.e-stat.go.jp/gis/statmap-search?page=1&type=1&toukeiCode=00200521&toukeiYear=2020&aggregateUnit=Q&serveyId=Q002005112020&statsId=T001142" target="_blank">e-Stat</a>',
            },
            {
                id: 'oh-m500m',
                label: "500mメッシュ人口(2020)",
                source: m500mSource,
                layers: [m500mLayer,m500mLayerLine,m500mLayerLabel],
                attribution: '出典：<a href="https://www.e-stat.go.jp/gis/statmap-search?page=8&type=1&toukeiCode=00200521&toukeiYear=2020&aggregateUnit=H&serveyId=H002005112020&statsId=T001141&datum=2011" target="_blank">e-Stsat</a>',
            },
            {
                id: 'oh-m500m-3d',
                label: "500mメッシュ人口3D(2020)",
                source: m500mSource,
                layers: [m500mLayer,m500mLayerLine,m500mLayerLabel,m500mLayerHeight],
                attribution: '出典：<a href="https://www.e-stat.go.jp/gis/statmap-search?page=8&type=1&toukeiCode=00200521&toukeiYear=2020&aggregateUnit=H&serveyId=H002005112020&statsId=T001141&datum=2011" target="_blank">e-Stsat</a>',
            },
            {
                id: 'oh-m1km',
                label: "1kmメッシュ人口(2020)",
                source: m1kmSource,
                layers: [m1kmLayer,m1kmLayerLine,m1kmLayerLabel],
                attribution:'<a href="https://www.e-stat.go.jp/gis/statmap-search?page=8&type=1&toukeiCode=00200521&toukeiYear=2020&aggregateUnit=S&serveyId=S002005112020&statsId=T001100&prefCode=01%2C02%2C03%2C04%2C05%2C06%2C07%2C08%2C09%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39%2C40%2C41%2C42%2C43%2C44%2C45%2C46%2C47&datum=2000" target="_blank">e-Stat</a>',
            },
            {
                id: 'oh-m1km-3d',
                label: "1kmメッシュ人口3D(2020)",
                source: m1kmSource,
                layers: [m1kmLayer,m1kmLayerLine,m1kmLayerLabel,m1kmLayerHeight],
                attribution:'<a href="https://www.e-stat.go.jp/gis/statmap-search?page=8&type=1&toukeiCode=00200521&toukeiYear=2020&aggregateUnit=S&serveyId=S002005112020&statsId=T001100&prefCode=01%2C02%2C03%2C04%2C05%2C06%2C07%2C08%2C09%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39%2C40%2C41%2C42%2C43%2C44%2C45%2C46%2C47&datum=2000" target="_blank">e-Stat</a>',
            },
            {
                id: 'oh-chiriin250m',
                label: "地理院版250mメッシュ人口(2020)",
                source: chiriin250mSource,
                layers: [chiriin250mLayer,chiriin250mLayerLine],
                attribution: '<a href="" target="_blank"></a>' +
                    '<img width="200px" src="' + require('@/assets/legend/kokusei_population.png') + '">',
                info: true
            },
            {
                id: 'oh-chiriin250m-3D',
                label: "地理院版250mメッシュ人口3D(2020)",
                source: chiriin250mSource,
                layers: [chiriin250mLayerHeight],
                attribution: '<a href="" target="_blank"></a>' +
                    '<img width="200px" src="' + require('@/assets/legend/kokusei_population.png') + '">',
                info: true
            },
            {
                id: 'oh-r02suikei250m',
                label: "R02-250mメッシュ別将来推計人口",
                source: r02suikei250mSource,
                layers: [r02suikei250mLayer,r02suikei250mLayerLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh250r6.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgba(196, 253, 187, 0.8);"></span>無居住化</li>' +
                    '<li><span style="background:rgba(140, 252, 114, 0.8);"></span>50%以上減少</li>' +
                    '<li><span style="background:rgba(97, 197, 250, 0.8);"></span>30%以上50%未満減少</li>' +
                    '<li><span style="background:rgba(89, 119, 246, 0.8);"></span>0%以上30%未満減少</li>' +
                    '<li><span style="background:rgba(184, 38, 25, 0.8);"></span>増加</li>' +
                    '<li><span style="background:rgba(255, 0, 0, 0.8);"></span>さらに増加</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-r02suikei500m',
                label: "R02-500mメッシュ別将来推計人口",
                source: r02suikei500mSource,
                layers: [r02suikei500mLayer,r02suikei500mLayerLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh500r6.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgba(196, 253, 187, 0.8);"></span>無居住化</li>' +
                    '<li><span style="background:rgba(140, 252, 114, 0.8);"></span>50%以上減少</li>' +
                    '<li><span style="background:rgba(97, 197, 250, 0.8);"></span>30%以上50%未満減少</li>' +
                    '<li><span style="background:rgba(89, 119, 246, 0.8);"></span>0%以上30%未満減少</li>' +
                    '<li><span style="background:rgba(184, 38, 25, 0.8);"></span>増加</li>' +
                    '<li><span style="background:rgba(255, 0, 0, 0.8);"></span>さらに増加</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-r02suikei1km',
                label: "R02-1kmメッシュ別将来推計人口",
                source: r02suikei1kmSource,
                layers: [r02suikei1kmLayer,r02suikei1kmLayerLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh1000r6.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgba(196, 253, 187, 0.8);"></span>無居住化</li>' +
                    '<li><span style="background:rgba(140, 252, 114, 0.8);"></span>50%以上減少</li>' +
                    '<li><span style="background:rgba(97, 197, 250, 0.8);"></span>30%以上50%未満減少</li>' +
                    '<li><span style="background:rgba(89, 119, 246, 0.8);"></span>0%以上30%未満減少</li>' +
                    '<li><span style="background:rgba(184, 38, 25, 0.8);"></span>増加</li>' +
                    '<li><span style="background:rgba(255, 0, 0, 0.8);"></span>さらに増加</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-suikei500m',
                label: "500mメッシュ別将来推計人口",
                source: suikei500mSource,
                layers: [suikei500mLayer,suikei500mLayerLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh500h30.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgba(196, 253, 187, 0.8);"></span>無居住化</li>' +
                    '<li><span style="background:rgba(140, 252, 114, 0.8);"></span>50%以上減少</li>' +
                    '<li><span style="background:rgba(97, 197, 250, 0.8);"></span>30%以上50%未満減少</li>' +
                    '<li><span style="background:rgba(89, 119, 246, 0.8);"></span>0%以上30%未満減少</li>' +
                    '<li><span style="background:rgba(184, 38, 25, 0.8);"></span>増加</li>' +
                    '<li><span style="background:rgba(255, 0, 0, 0.8);"></span>さらに増加</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-suikei1km',
                label: "1kmメッシュ別将来推計人口",
                source: suikei1kmSource,
                layers: [suikei1kmLayer,suikei1kmLayerLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh1000h30.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgba(196, 253, 187, 0.8);"></span>無居住化</li>' +
                    '<li><span style="background:rgba(140, 252, 114, 0.8);"></span>50%以上減少</li>' +
                    '<li><span style="background:rgba(97, 197, 250, 0.8);"></span>30%以上50%未満減少</li>' +
                    '<li><span style="background:rgba(89, 119, 246, 0.8);"></span>0%以上30%未満減少</li>' +
                    '<li><span style="background:rgba(184, 38, 25, 0.8);"></span>増加</li>' +
                    '<li><span style="background:rgba(255, 0, 0, 0.8);"></span>さらに増加</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            // {
            //     id: 'oh-suikei1km-full',
            //     label: "1kmメッシュ別将来推計人口（フル）",
            //     source: suikei1kmFullSource,
            //     layers: [suikei1kmFullLayer,suikei1kmFullLayerLine],
            //     attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh1000h30.html" target="_blank">国土数値情報</a>' +
            //         '<div class="legend-scale">' +
            //         '<ul class="legend-labels">' +
            //         '<li><span style="background:rgba(196, 253, 187, 0.8);"></span>無居住化</li>' +
            //         '<li><span style="background:rgba(140, 252, 114, 0.8);"></span>50%以上減少</li>' +
            //         '<li><span style="background:rgba(97, 197, 250, 0.8);"></span>30%以上50%未満減少</li>' +
            //         '<li><span style="background:rgba(89, 119, 246, 0.8);"></span>0%以上30%未満減少</li>' +
            //         '<li><span style="background:rgba(184, 38, 25, 0.8);"></span>増加</li>' +
            //         '<li><span style="background:rgba(255, 0, 0, 0.8);"></span>さらに増加</li>' +
            //         '</ul>' +
            //         '</div>',
            //     info: true
            // },
            {
                id: 'oh-did',
                label: "人口集中地区",
                source: didSource,
                layers: [didLayer,didLayerLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A16-v2_3.html" target="_blank">国土数値情報</a>'
            },
        ]
    },
    {
        id: 'doro',
        label: "鉄道、道路等",
        nodes: [
            {
                id: 'oh-q-kyoryo',
                label: "全国橋梁地図",
                source: qKyouryoSource,
                layers: [qKyoryoLayer,qKyoryoLayerLabel],
            },
            {
                id: 'oh-q-tunnel',
                label: "全国トンネル地図",
                source: qTunnelSource,
                layers: [qTunnelLayer,qTunnelLayerLabel],
            },
            {
                id: 'oh-bus',
                label: "R04バスルートと停留所",
                sources: [busSource,busteiSource],
                layers: [busLayer,busteiLayer,busteiLayerLabel],
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N07-v2_0.html' target='_blank'>国土数値情報</a>",
                ext: {name:'extBus',parameters:[]}
            },
            {
                id: 'oh-tetsudo',
                label: "鉄道（廃線は赤色）",
                source: tetsudoSource,
                layers: [tetsudoLayerRed,tetsudoLayerBlue,tetsudoLayerPointRed,tetsudoLayerPointBlue],
            },
            {
                id: 'oh-tetsudojikeiretsu',
                label: "鉄道時系列",
                source: tetsudojikeiretsuSource,
                layers: [tetsudojikeiretsuLayerBlue,tetsudojikeiretsuLayerPoint],
                ext: {name:'extTetsudojikeiretsu',parameters:[]}
            },
            {
                id: 'oh-ekibetsukyaku',
                label: "駅別乗降客数",
                sources: [ekibetsukyakuSource],
                layers: [ekibetsukyakuLine,ekibetsukyakuLabel],
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2022.html' target='_blank'>国土数値情報</a>",
            },
            {
                id: 'oh-ekibetsukyaku-3d',
                label: "駅別乗降客数３D",
                sources: [ekibetsukyakuSource3d,tetsudo2Source],
                layers: [tetsudoLine,ekibetsukyakuHeight],
                ext: {name:'extKyakusu'},
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2022.html' target='_blank'>国土数値情報</a>" +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:hsl(240, 100%, 50%);"></span>0 - 99人</li>' +
                    '<li><span style="background:hsl(230, 100%, 55%);"></span>100 - 299人</li>' +
                    '<li><span style="background:hsl(220, 100%, 60%);"></span>300 - 499人</li>' +
                    '<li><span style="background:hsl(210, 100%, 65%);"></span>500 - 999人</li>' +
                    '<li><span style="background:hsl(200, 100%, 70%);"></span>1000 - 4999人</li>' +
                    '<li><span style="background:hsl(180, 100%, 50%);"></span>5000 - 19999人</li>' +
                    '<li><span style="background:hsl(150, 100%, 50%);"></span>20000 - 99999人</li>' +
                    '<li><span style="background:hsl(120, 100%, 50%);"></span>100000 - 499999人</li>' +
                    '<li><span style="background:hsl(60, 100%, 50%);"></span>500000 - 1199999人</li>' +
                    '<li><span style="background:hsl(0, 100%, 50%);"></span>1200000人+</li>' +
                    '</ul>' +
                    '</div>',
                // info:true
            },
            {
                id: 'oh-highway',
                label: "高速道路時系列",
                source: highwaySource,
                layers: [highwayLayerGreen,highwayLayerRed],
                ext: {name:'extHighway',parameters:[]}
            },
            {
                id: 'oh-kokuarea',
                label: "空港等の周辺空域",
                source: kokuareaSource,
                layers: [kokuareaLayer,kokuareaLayerLine],
            },
            {
                id: 'oh-michinoeki',
                label: "道の駅",
                source: michinoekiSource,
                layers: [michinoekiLayer,michinoekiLayerLabel],
            },
        ]
    },
    {
        id: 'skosodate',
        label: "子育て",
        nodes: [
            {
                id: 'oh-yochien',
                label: "幼稚園・保育園等（R0２）",
                source: yochienSource,
                layers: [yochienLayer,yochienLayerLabel]
            },
            {
                id: 'oh-syogakkoR05',
                label: "小学校（R05）",
                source: syogakkoR05Source,
                layers: [syogakkoR05Layer,syogakkoR05LayerLine,syogakkoR05LayerLabel,syogakkoR05LayerPoint],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A27-2023.html" target="_blank">国土数値情報</a>'

            },
            {
                id: 'oh-cyugakuR05',
                label: "中学校（R05）",
                source: cyugakuR05Source,
                layers: [cyugakuR05Layer,cyugakuR05LayerLine,cyugakuR05LayerLabel,cyugakuR05LayerPoint],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A32-2023.html" target="_blank">国土数値情報</a>'

            },
            {
                id: 'oh-iryokikan',
                label: "医療機関（R02）",
                source: iryokikanSource,
                layers: [iryokikanLayer,iryokikanLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P04-2020.html" target="_blank">国土数値情報</a>'
            }
        ]
    },
    {
        id: 'city',
        label: "市町村",
        nodes: [
            {
                id: 'oh-city-gun',
                label: "明治中期の郡",
                source: cityGunSource,
                layers: [cityGunLayer,cityGunLayerLine,cityGunLayerLabel],
                attribution:'<a href="https://booth.pm/ja/items/3053727" target="_blank">郡地図研究会</a>',
                ext: {name:'ext-city-gun'},
            },
            {
                id: 'oh-city-t09',
                label: "T09市町村",
                source: cityT09Source,
                layers: [cityT09Layer,cityT09LayerLine,cityT09LayerLabel],
                ext: {name:'ext-city-t09'},
            },
            {
                id: 'oh-city-h12',
                label: "H12市町村",
                source: cityH12Source,
                layers: [cityH12Layer,cityH12LayerLine,cityH12LayerLabel],
                ext: {name:'ext-city-h12'},
            },
            {
                id: 'oh-city-r05',
                label: "R05市町村",
                source: cityR05Source,
                layers: [cityR05Layer,cityR05LayerLine,cityR05LayerLabel],
                ext: {name:'ext-city-r05'},
            },
        ]
    },
    {
        id: 'toshikeikaku',
        label: "都市計画決定情報パッケージ",
        nodes: [
            {
                id: 'oh-yotochiikiP',
                label: "用途地域",
                source: yotochiikiPSource,
                layers: [yotochiikiPLayer,yotochiikiPLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-tokei',
                label: "都市計画区域",
                source: tokeiSource,
                layers: [tokeiLayer,tokeiLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-kuikikubun',
                label: "市街化調整区域",
                source: kuikikubunSource,
                layers: [kuikikubunLayer,kuikikubunLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-tkbt',
                label: "特別用途地区",
                source: tkbtSource,
                layers: [tkbtLayer,tkbtLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2022.html" target="_blank">国土数値情報</a>'
            },
        ]
    },
    {
        id: 'kanko',
        label: "観光",
        nodes: [
            {
                id: 'oh-kanko',
                label: "観光資源",
                sources: [kankoSource],
                layers: [kankoLayer,kankoLayerLine,kankoLine,kankoPoint],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P12-2014.html">国土数値情報</a>'
            },
            {
                id: 'oh-syukuhaku',
                label: "宿泊容量メッシュ1km",
                sources: [syukuhakuSource],
                layers: [syukuhakuLayer,syukuhakuLayerLine],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P09.html">国土数値情報</a>'
            },
            {
                id: 'oh-syukuhaku',
                label: "宿泊容量メッシュ1km3D",
                sources: [syukuhakuSource],
                layers: [syukuhakuLayerHeight],
                attribution:'<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P09.html">国土数値情報</a>'
            },
            ]
    },
    {
        id: 'bakumatsu',
        label: "幕末期近世の村",
        nodes: [
            {
                id: 'oh-bakumatsu',
                label: "幕末期近世の村",
                source: bakumatsuSource,
                layers: [bakumatsuLayer, bakumatsuLayerLine, bakumatsuLayerLabel],
                attribution:'出典：<a href="https://github.com/yaoyue00085856/Kyudaka_agrivillage" target="_blank">幕末期近世村領域データ</a>',
                ext: {name:'extBakumatsu'}
            },
            {
                id: 'oh-bakumatsu-kokudaka-height',
                label: "幕末期近世の村（石高/面積）3D",
                source: bakumatsuSource,
                layers: [bakumatsuLayerHeight],
                attribution:'出典：<a href="https://github.com/yaoyue00085856/Kyudaka_agrivillage" target="_blank">幕末期近世村領域データ</a>',
                ext: {name:'extBakumatsu3d'}
            },
            {
                id: 'oh-bakumatsu-poin',
                label: "幕末期近世の村（ポイント）",
                source: bakumatsuPointSource,
                layers: [bakumatsuPointLayer]
            },
        ]
    },
    {
        id: 'koaza',
        label: "関東小字地図",
        nodes: [
            {
                id: 'oh-koaza',
                label: "関東小字地図",
                sources: [koazaSource,muraSource,muraCenterSource],
                layers: [muraCenterLabel,koazaLayer,koazaLayerLine,koazaLayerLabel,muraLayer,muraLayerLine],
                attribution: '<a href="https://koaza.net/" target="_blank">関東小字地図</a>',
                ext: {name:'extKoaza'}
            }]},
    {
        id: 2,
        label: "自然、立体図等",
        nodes: [
            {
                id: 'oh-sea-level',
                label: "海面上昇シミュレーション",
                sources: [seaLevelSource],
                layers: [seaLevellLayer],
                attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html#dem' target='_blank'>国土地理院 標高タイル</a>",
                ext: {name:'extSeaLevel'}
            },
            {
                id: 'cs2',
                label: "CS立体図",
                nodes: [
                    {
                        id: 'oh-cs-all2',
                        label: "CS立体図全部",
                        sources: csSources,
                        layers: csLayersSelected
                    },
                    ...csLayers2
                ]
            },
            // {
            //     id: 'cd',
            //     label: "CS立体図",
            //     nodes: [
            //         {
            //             id: 'oh-cs-all',
            //             label: "CS立体図全部",
            //             sources: [csNotoSource,csTochigiSource,csNaganoSource,csGifuSource,csOsakaSource,csHyogoSource,csShizuokaSource,
            //                 csHiroshimaSource,csOkayamaSource,csFukushimaSource,csEhimeSource,csKochiSource,csKumamotoSource,csKanagawaSource,
            //                 tokyo23CsSource],
            //
            //             layers: [csNotoLayer,csTochigiLayer,csNaganoLayer,csGifuLayer,csOsakaLayer,csHyogoLayer,csShizuokaLayer,
            //                 csHiroshimaLayer,csOkayamaLayer,csFukushimaLayer,csEhimeLayer,csKochiLayer,csKumamotoLayer,csKanagawaLayer,
            //                 tokyo23CsLayer]
            //         },
            //         {
            //             id: 'oh-csNotoLayer',
            //             label: "能登CS立体図",
            //             source: csNotoSource,
            //             layers: [csNotoLayer]
            //         },
            //         {
            //             id: 'oh-cs-tochigi-layer',
            //             label: "栃木県CS立体図",
            //             source: csTochigiSource,
            //             layers: [csTochigiLayer],
            //             attribution:'<a href="https://www.geospatial.jp/ckan/dataset/csmap_tochigi" target="_blank">G空間情報センター</a>'
            //         },
            //         {
            //             id: 'oh-cs-nagano-layer',
            //             label: "長野県CS立体図",
            //             source: csNaganoSource,
            //             layers: [csNaganoLayer],
            //             attribution:'<a href="https://www.geospatial.jp/ckan/dataset/nagano-csmap" target="_blank">G空間情報センター</a>'
            //         },
            //         {
            //             id: 'oh-csGifuLayer',
            //             label: "岐阜県CS立体図",
            //             source: csGifuSource,
            //             layers: [csGifuLayer]
            //         },
            //         {
            //             id: 'oh-csOsakaLayer',
            //             label: "大阪府CS立体図",
            //             source: csOsakaSource,
            //             layers: [csOsakaLayer]
            //         },
            //         {
            //             id: 'oh-csHyogoLayer',
            //             label: "兵庫県CS立体図",
            //             source: csHyogoSource,
            //             layers: [csHyogoLayer]
            //         },
            //         {
            //             id: 'oh-csShizuokaLayer',
            //             label: "静岡県CS立体図",
            //             source: csShizuokaSource,
            //             layers: [csShizuokaLayer]
            //         },
            //         {
            //             id: 'oh-cs-hiroshima-layer',
            //             label: "広島県CS立体図",
            //             source: csHiroshimaSource,
            //             layers: [csHiroshimaLayer],
            //             attribution:'<a href="https://github.com/shi-works/aist-dem-with-cs-on-maplibre-gl-js" target="_blank">aist-dem-with-cs-on-maplibre-gl-js</a>'
            //         },
            //         {
            //             id: 'oh-cs-okayama-layer',
            //             label: "岡山県CS立体図",
            //             source: csOkayamaSource,
            //             layers: [csOkayamaLayer],
            //             attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
            //         },
            //         {
            //             id: 'oh-cs-fukushima-layer',
            //             label: "福島県CS立体図",
            //             source: csFukushimaSource,
            //             layers: [csFukushimaLayer],
            //             attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
            //         },
            //         {
            //             id: 'oh-cs-ehime-layer',
            //             label: "愛媛県CS立体図",
            //             source: csEhimeSource,
            //             layers: [csEhimeLayer],
            //             attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
            //         },
            //         {
            //             id: 'oh-cs-kochi-layer',
            //             label: "高知県CS立体図",
            //             source: csKochiSource,
            //             layers: [csKochiLayer],
            //             attribution:'<a href="https://www.geospatial.jp/ckan/dataset/csmap_kochi" target="_blank">G空間情報センター</a>'
            //         },
            //         {
            //             id: 'oh-cs-kumamoto-layer',
            //             label: "熊本県・大分県CS立体図",
            //             source: csKumamotoSource,
            //             layers: [csKumamotoLayer],
            //             attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
            //         },
            //         {
            //             id: 'oh-cs-kanagawa-layer',
            //             label: "神奈川県CS立体図",
            //             source: csKanagawaSource,
            //             layers: [csKanagawaLayer]
            //         },
            //         {
            //             id: 'oh-tokyo23-cs-layer',
            //             label: "東京都23区CS立体図",
            //             source: tokyo23CsSource,
            //             layers: [tokyo23CsLayer]
            //         },
            //         {
            //             id: 'oh-cs-yokohama-layer',
            //             label: "横浜北部、川崎CS立体図",
            //             source: csYokohamSource,
            //             layers: [csYokohamaLayer]
            //         },
            //     ]
            // },
            {
                id: 'sekisyoku',
                label: "赤色立体地図",
                nodes: [
                    {
                        id: 'oh-sekisyoku-layer-all',
                        label: "赤色立体地図全部",
                        sources: [toyamaSekisyokuSource,kanagawakenyokohamaSekisyokuSource,
                            kanagawakenseibuSekisyokuSource,sagamiharaSekisyokuSource,kanagawaSekisyokuSource,tamaSekisyokuSource,tokyo23SekisyokuSource,tosyo01SekisyokuSource,tosyo02SekisyokuSource,tosyo03SekisyokuSource,tosyo04SekisyokuSource,tosyo05SekisyokuSource,tosyo06SekisyokuSource,kochiSekisyokuSource],
                        layers: [toyamaSekisyokuLayer,kanagawakenyokohamaSekisyokuLayer,kanagawakenseibuSekisyokuLayer,sagamiharaSekisyokuLayer,kanagawaSekisyokuLayer,tamaSekisyokuLayer,tokyo23SekisyokuLayer,tosyo02SekisyokuLayer,tosyo03SekisyokuLayer,tosyo04SekisyokuLayer,tosyo05SekisyokuLayer,tosyo06SekisyokuLayer,tosyo01SekisyokuLayer,kochiSekisyokuLayer],
                    },
                    {
                        id: 'oh-kanagawa-sekisyoku-layer',
                        label: "神奈川県県央部県赤色立体地図",
                        source: kanagawaSekisyokuSource,
                        layers: [kanagawaSekisyokuLayer],
                        bounds: boundsSort([139.09766500655184,35.624094342992194, 139.46201634577034,35.315414497020726]),
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/kanagawa-2020-1-pointcloud" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-sagamihara-sekisyoku-layer',
                        label: "神奈川県相模原市赤色立体地図",
                        source: sagamiharaSekisyokuSource,
                        layers: [sagamiharaSekisyokuLayer],
                        bounds: boundsSort([139.04848994843064,35.68660597218647, 139.34747849259207,35.468439520826834]),
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/kanagawa-2020-2-pointcloud" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-yokophama-sekisyoku-layer',
                        label: "神奈川県横浜南部赤色立体地図",
                        source: kanagawakenyokohamaSekisyokuSource,
                        layers: [kanagawakenyokohamaSekisyokuLayer],
                        bounds: boundsSort([139.1460674051824,35.47387830775729, 139.77576139218593,35.09494646110994]),
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/kanagawa-2021-pointcloud" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-kanagawakenseibu-sekisyoku-layer',
                        label: "神奈川県西部赤色立体地図",
                        source: kanagawakenseibuSekisyokuSource,
                        layers: [kanagawakenseibuSekisyokuLayer],
                        bounds: boundsSort([138.9251684590787,35.52398114822313, 139.25907181711648,35.10840903088935]),
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/kanagawa-2019-pointcloud" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-tosyo-sekisyoku-layer',
                        label: "東京都赤色立体地図",
                        sources: [tamaSekisyokuSource,tokyo23SekisyokuSource,tosyo01SekisyokuSource,tosyo02SekisyokuSource,tosyo03SekisyokuSource,tosyo04SekisyokuSource,tosyo05SekisyokuSource,tosyo06SekisyokuSource],
                        layers: [tamaSekisyokuLayer,tokyo23SekisyokuLayer,tosyo02SekisyokuLayer,tosyo03SekisyokuLayer,tosyo04SekisyokuLayer,tosyo05SekisyokuLayer,tosyo06SekisyokuLayer,tosyo01SekisyokuLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/tokyopc-23ku-2024" target="_blank">G空間情報センター</a>'
                    },
                    // {
                    //     id: 'oh-aichiSekisyokuLayer',
                    //     label: "愛知県赤色立体地図",
                    //     source: aichiSekisyokuSource,
                    //     layers: [aichiSekisyokuLayer]
                    // },
                    {
                        id: 'oh-kochi-sekisyoku-layer',
                        label: "高知県赤色立体地図",
                        sources: [kochiSekisyokuSource],
                        layers: [kochiSekisyokuLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/sekisyoku" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-toyama-sekisyoku-layer',
                        label: "富山県赤色立体地図",
                        sources: [toyamaSekisyokuSource],
                        layers: [toyamaSekisyokuLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/rrimap" target="_blank">G空間情報センター</a>'
                    },
                ]},
            {
                id: 'oh-shitchi',
                label: "第6-7回植生図",
                source: ecoris67Source,
                layers: [ecoris67Layer],
                attribution: "<a href='https://map.ecoris.info/' target='_blank'>エコリス地図タイル</a>" +
                    '<div class="legend-scale">' +
                        '<ul class="legend-labels">' +
                            '<li><span style="background:#fdf1ce;"></span>高山帯自然植生</li>' +
                            '<li><span style="background:#997f60;"></span>コケモモートウヒクラス域 自然植生</li>' +
                            '<li><span style="background:#a58f74;"></span>〃 代償植生</li>' +
                            '<li><span style="background:#178017;"></span>ブナクラス域 自然植生</li>' +
                            '<li><span style="background:#5b9700;"></span>〃 代償植生</li>' +
                            '<li><span style="background:#003300;"></span>ヤブツバキクラス域 自然植生</li>' +
                            '<li><span style="background:#004a00;"></span>〃 代償植生</li>' +
                            '<li><span style="background:#ffff00;"></span>河川・湿原・沼沢地・砂丘植生</li>' +
                            '<li><span style="background:#697720;"></span>植林地</li>' +
                            '<li><span style="background:#8cd27d;"></span>耕作地</li>' +
                            '<li><span style="background:#868585;"></span>市街地</li>' +
                            '<li><span style="background:#99ffff;"></span>開放水域</li>' +
                            '<li><span style="background:#cccc20;"></span>竹林</li>' +
                            '<li><span style="background:#69ff00;"></span>牧草地・ゴルフ場・芝地</li>' +
                            '<li><span style="background:#999662;"></span>水田以外の耕作地</li>' +
                        '</ul>' +
                    '</div>'
            },
            {
                id: 'oh-shitchi',
                label: "明治期の低湿地",
                source: shitchiSource,
                layers: [shitchiLayer]
            },
            {
                id: 'oh-shikibetsu',
                label: "色別標高図",
                source: shikibetsuSource,
                layers: [shikibetsuLayer]
            },
            {
                id: 'oh-inei',
                label: "陰影起伏図",
                source: ineiSource,
                layers: [ineiLayer]
            },
            {
                id: 'oh-kawadak',
                label: "川だけ地形地図",
                source: kawadakeSource,
                layers: [kawddakeLayer],
                attribution: "<a href='https://www.gridscapes.net/#AllRiversAllLakesTopography' target='_blank'>川だけ地形地図</a>",
            },
            {
                id: 'oh-ryuiki',
                label: "川と流域地図",
                source: ryuikiSource,
                layers: [ryuikiLayer],
                attribution: "<a href='https://tiles.dammaps.jp/ryuiki/' target='_blank'>川と流域地図</a>",
            },
            {
                id: 'oh-bunsuirei',
                label: "⭐️河川と分水嶺",
                sources: [bunsuireiSource,kasenSource],
                layers: [bunsuireiLayer,bunsuireiLayerLine,kasenLayer,kasenLayerLabel],
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W07.html' target='_blank'>国土数値情報</a>",
                ext: {name:'extBunsuirei'}
            },
            {
                id: 'oh-kasen',
                label: "河川",
                source: kasenSource,
                layers: [kasenLayer,kasenLayerLabel]
            },
            {
                id: 'oh-ryuiki',
                label: "流域（分水嶺）",
                source: ryuikiSource2,
                layers: [ryuikiLayer2,ryuikiLayerLine2],
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W07.html' target='_blank'>国土数値情報</a>"
            },
            // {
            //     id: 'oh-chikeibunrui',
            //     label: "地形分類",
            //     source: chikeibunruiSource,
            //     layers: [chikeibunruiLayer]
            // },
            // {
            //     id: 'oh-chikeibunrui2',
            //     label: "地形分類テスト",
            //     source: chikeibunruiSource2,
            //     layers: [chikeibunruiLayer2,chikeibunruiLine2]
            // },
            {
                id: 'oh-shizenchikei',
                label: "自然地形",
                source: shizenchikeiSource,
                layers: [shizenchikeiLayer],
                attribution: '<a href="https://github.com/gsi-cyberjapan/experimental_landformclassification" target="_blank">国土地理院ベクトルタイル提供実験（地形分類）</a>'
            },
            {
                id: 'oh-jinkochikei',
                label: "人工地形",
                source: jinkochikeiSource,
                layers: [jinkochikeiLayer],
                attribution: '<a href="https://github.com/gsi-cyberjapan/experimental_landformclassification" target="_blank">国土地理院ベクトルタイル提供実験（地形分類）</a>'
            },
            {
                id: 'oh-teii',
                label: "低位地帯",
                source: teiiSource,
                layers: [teiiLayer],
                attribution: '<div style="width: 200px;"><a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-G08-2015.html" target="_blank">国土数値情報</a><br>' +
                    '本データは、周辺部よりも標高が低く、排水が困難である地帯（低位地帯）を整備したものである。<br>' +
                    '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '"></div>',
                info: true
            },
            {
                id: 'oh-kosyo',
                label: "湖沼",
                source: kosyoSource,
                layers: [kosyoLayer,kosyoLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W09-2005.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-dam',
                label: "ダム",
                source: damSource,
                layers: [damLayer,damLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W01.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-seamless',
                label: "シームレス地質図",
                source: seamlessSource,
                layers: [seamlessLayer],
                attribution: '<a href="https://gbank.gsj.jp/seamless/" target="_blank">20万分の1日本シームレス地質図</a>'
            },
            {
                id: 'oh-kazan',
                label: "火山土地条件図",
                source: kazanSource,
                layers: [kazanLayer],
                attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html#vlcd" target="_blank">地理院タイル</a>'
            },
            {
                id: 'oh-hifuku',
                label: "植生被覆率",
                source: hifukuSource,
                layers: [hifukuLayer,hifukuLine],
                attribution: '<a href="https://zenodo.org/records/5553516" target="_blank">日本全国の町内各地区の植生被覆率</a>'
            },
            {
                id: 'oh-geopark',
                label: "ジオパーク",
                source: geoparkSource,
                layers: [geoparkLayer,geoparkLine],
                ext: {name:'extGeopark'},
                attribution: '<a href="https://tosashimizu-geo.jp/leaflet/geopark/geoparkarea.html" target="_blank">ジオパークエリア</a><br>' +
                    '土井恵治氏　土佐清水ジオパーク推進協議会事務局'
            },
            {
                id: 'oh-shizenisan',
                label: "世界自然遺産",
                source: shizenisanSource,
                layers: [shizenisanLayer,shizenisanLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A28.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-bunkaisan',
                label: "世界文化遺産",
                source: bunkaisanSource,
                layers: [bunkaisanLayerA34a,bunkaisanLineA34a,bunkaisanLayerA34f,bunkaisanLineA34f,
                    bunkaisanLineA34c,
                    bunkaisanPointA34b,bunkaisanPointA34d,bunkaisanPointA34e,bunkaisanPointA34g
                ],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A34-2022.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-kokuritsukoen',
                label: "国立公園",
                source: kokuritsukoenSource,
                layers: [kokuritsukoenLayer,kokuritsukoenLine],
                attribution: '<a href="http://gis.biodic.go.jp/webgis/sc-026.html?kind=nps" target="_blank">生物多様性センター</a>'
            },
            {
                id: 'oh-shizenkoen',
                label: "自然公園",
                source: shizenkoenSource,
                layers: [shizenkoenLayer,shizenkoenLine],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A10-2015.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-danso',
                label: "都市圏活断層図",
                source: dansoSource,
                layers: [dansoLayer],
                attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html#afm" target="_blank">地理院タイル</a>'
            },
            {
                id: 'oh-fukuokakenshinrin',
                label: "福岡県森林計画区域",
                source: fukuokakenshinrinSource,
                layers: [fukuokakenshinrinLayer,fukuokakenshinrinLayerLine],
                attribution: '<a href="https://www.pref.fukuoka.lg.jp/contents/forest-opendata.html" target="_blank">ふくおか森林オープンデータ</a>'
            },
            {
                id: 'oh-kokuyurin',
                label: "国有林野データ",
                source: kokuyurinSource,
                layers: [kokuyurinLayer,kokuyurinLayerLine,kokuyurinLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A45.html" target="_blank">国土数値情報</a>'
            },
        ]
    },
    {
        id: 'iseki',
        label: "遺跡等",
        nodes: [
            {
                id: 'oh-kyusekki',
                label: "全国旧石器遺跡",
                source: kyusekkiSource,
                layers: [kyusekkiLayer,kyusekkiLayerHeatmap],
            },
            {
                id: 'isekirittaitizu',
                label: "兵庫県遺跡立体地図",
                nodes: [
                    {
                        id: 'oh-hyogo-iseki-all',
                        label: "全て",
                        sources: [...isekiSources,...isekiGeojsonSources],
                        layers: [...isekiLayers,...isekiGeojsonLayers,...isekiGeojsonLabelLayers],
                        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/2021-2022-hyogo-shiseki" target="_blank">兵庫県遺跡立体図</a>'
                    },
                        ...isekiLayersMarge
                ]
            },
            // {
            //     id: 'isekirittaitizu2',
            //     label: "兵庫県意外遺跡立体地図",
            //     nodes: [
            //         ...isekiLayers222
            //     ]
            // }
    ]},
    {
        id: 'hazard',
        label: "ハザードマップ等",
        nodes: [
            {
                id: 'hinanbasyo',
                label: "指定緊急避難場所",
                nodes: [
                    {
                        id: 'oh-hinanjyo-kozui',
                        label: "指定緊急避難場所(洪水)",
                        source: hinanjyoKozuiSource,
                        layers: [hinanjyoKozuiLayer,hinanjyoKozuiLayerLabel],
                    },
                    {
                        id: 'oh-tsunami-kozui',
                        label: "指定緊急避難場所(津波)",
                        source: hinanjyoTsunamiSource,
                        layers: [hinanjyoTsunamiLayer,hinanjyoTsunamiLayerLabel],
                    },
                    {
                        id: 'oh-hinanjyo-dosekiryu',
                        label: "指定緊急避難場所(崖崩れ等)",
                        source: hinanjyoDosekiryuSource,
                        layers: [hinanjyoDosekiryuLayer,hinanjyoDosekiryuLayerLabel],
                        attribution: '指定緊急避難場所(崖崩れ、土石流及び地滑り)'
                    },
                ]
            },
            {
                id: 'oh-kozui-saidai',
                label: "洪水浸水想定（想定最大規模）",
                source: kozuiSaidaiSource,
                layers: [kozuiSaidaiLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a><br><br>' +
                    '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '">'
            },
            {
                id: 'oh-keikaku-saidai',
                label: "洪水浸水想定（計画規模）",
                source: kozuikeikskuSource,
                layers: [kozuiKeikskuLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a><br><br>' +
                    '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '">'
            },
            {
                id: 'oh-tsunami',
                label: "津波浸水想定",
                source: tsunamiSource,
                layers: [tsunamiLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a><br><br>' +
                    '<img src="' + require('@/assets/legend/shinsui_legend3.png') + '">'
            },
            {
                id: 'oh-tameike',
                label: "ため池決壊による浸水想定",
                source: tameikeSource,
                layers: [tameikeLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
            },
            {
                id: 'oh-dosya',
                label: "土砂災害警戒区域",
                source: dosyaSource,
                layers: [dosyaLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
            },
            {
                id: 'oh-dosekiryu',
                label: "土石流危険渓流",
                source: dosekiryuSource,
                layers: [dosekiryuLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
            },
            {
                id: 'oh-kyukeisya',
                label: "急傾斜地崩壊危険箇所",
                source: kyukeisyaSource,
                layers: [kyukeisyaLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
            },
            {
                id: 'oh-jisuberi',
                label: "地すべり危険箇所",
                source: jisuberiSource,
                layers: [jisuberiLayer],
                attribution: '<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html" target="_blank">ハザードマップポータルサイト</a>'
            },
            {
                id: 'oh-kansui',
                label: "道路冠水想定箇所（アンダーパス等",
                source: kansuiSource,
                layers: [kansuiLayer,kansuiLayerLabel],
            },
            {
                id: 'oh-tsunami-height',
                label: "津波浸水想定3D",
                source: tsunamiSource2,
                layers: [tsunamiLayerHeight],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A40-2023.html" target="_blank">国土数値情報</a>'

            },
            {
                id: 'oh-nantora-height',
                label: "宮崎県南海トラフ津波浸水想定3D",
                source: nantoraSource,
                layers: [nantoraLayerHeight],
            },
            {
                id: 'oh-hokkaidotsunami-height',
                label: "北海道津波浸水想定3D",
                source: hokkaidotsunamiSource,
                layers: [hokkaidotsunamiLayerHeight],
            },
            {
                id: 'oh-zosei',
                label: "R05大規模盛土造成地",
                source: zoseiSource,
                layers: [zoseiLayer,zoseiLayerLine,zoseiLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A54-2023.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-tokyojishin',
                label: "地震に関する危険度一覧(東京都)",
                source: tokyojishinSource,
                layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel],
            },
            {
                id: 'oh-tokyojishin3d',
                label: "地震に関する危険度一覧(東京都)3D",
                source: tokyojishinSource,
                layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheightSogo],
            },
            // {
            //     id: 'oh-tokyojishin',
            //     label: "地震に関する危険度一覧(東京都)",
            //     source: tokyojishinSource,
            //     layers: [tokyojishinLayer,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheight],
            // },
            {
                id: 'oh-densyohi',
                label: "災害伝承碑",
                source: densyohiSource,
                layers: [densyohiLayer,densyohiLayerLabel],
            },
            {
                id: 'oh-fukuokakenhazard',
                label: "福岡県土砂災害",
                source: fukuokakenHazardSource,
                layers: [fukuokakenHazardLayer,fukuokakenHazardLayerLine],
                attribution: '<a href="https://ckan.open-governmentdata.org/dataset/401000_dosyasaigaikeikaikuikitoudata" target="_blank">福岡県　土砂災害警戒区域等のshapeデータ</a>'
            },
            {
                id: 'oh-fj-ekijyoka',
                label: "液状化発生傾向（不動産情報ライブラリ）",
                sources: [fjEkijyokaSourse],
                layers: [fjEkijyokatLayer, fjEkijyokatLayerLine],
                attribution: '<a href="https://www.reinfolib.mlit.go.jp/help/apiManual/#titleApi30" target="_blank">不動産情報ライブラリ</a>'
            },
            {
                id: 'oh-fj-ricchitekiseika',
                label: "立地適正化計画（不動産情報ライブラリ）",
                sources: [fjRicchitekiseiksSourse],
                layers: [fjRicchitekiseikaLayer, fjRicchitekiseikaLayerLine],
                attribution: '<a href="https://www.reinfolib.mlit.go.jp/help/apiManual/#titleApi30" target="_blank">不動産情報ライブラリ</a>'
            },
        ]
    },
    {
        id: 'sonohoka',
        label: "その他",
        nodes: [
            {
                id: 'oh-sekibutsu',
                label: "みんなで石仏調査",
                source: sekibutsuSource,
                layers: [sekibutsuLayer],
                attribution: '<a href="https://map.sekibutsu.info/about" target="_blank">みんなで石仏調査</a>',
                ext: {name:'extSekibutsu'}
            },
            {
                id: 'oh-traffic-accident',
                label: "交通事故統計情報(2019年〜2022年)",
                source: trafficAccidentSource,
                layers: [trafficAccidentLayer],
                attribution: '<div style="width: 150px;"><a href="https://github.com/sanskruthiya/ta-jp2022?tab=readme-ov-file" target="_blank">Geographic Record of Traffic Accident in Japan</a>' +
                '<div class="legend-scale">' +
                        '<ul class="legend-labels">' +
                    '<li><span style="background:rgba(173, 216, 230, 1);"></span>昼間に発生</li>' +
                    '<li><span style="background:rgba(47, 79, 79, 0.9);"></span>夜間に発生</li>' +
                    '</ul>' +
                    '</div></div>',
                info: true
            },
            {
                id: 'oh-kaiyochishitsu',
                label: "海洋地質図",
                source: kaiyochishitsuource,
                layers:[kaiyochishitsuLayer],
                attribution: "<a href='https://www.msil.go.jp/msil/htm/main.html?Lang=0' target='_blank'>海洋状況表示システム</a>"
            },
            {
                id: 'oh-tochiriyo100',
                label: "2021土地利用細分メッシュ(100m)",
                source: tochiriyo100Source,
                layers:[tochiriyo100Layer],
                attribution: "<a href='' target='_blank'></a>"
            },
            {
                id: 'oh-tochiriyo',
                label: "東京都土地利用現況調査",
                source: tochiriyoSource,
                layers:[tochiriyoLayer,tochiriyoLayerLine],
                attribution: "<a href='https://catalog.data.metro.tokyo.lg.jp/dataset/t000008d2000000019' target='_blank'>土地利用現況調査GISデータ</a>"
            },
            {
                id: 'oh-senkyoku',
                label: "選挙区（2022）",
                source: senkyokuSource,
                layers:[senkyokuLayer,senkyokuLayerLine,senkyokuLayerLabel]
            },
            {
                id: 'oh-r07koji-3d',
                label: "公示価格（R07）3D",
                source: r07kojiSource,
                layers:[r07kojilayerheight],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-2025.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgb(225, 49, 33);"></span>1000万円以上</li>' +
                    '<li><span style="background:rgb(225, 61, 35);"></span>100万円ー1000万円</li>' +
                    '<li><span style="background:rgb(226, 84, 39);"></span>75万円ー100万円</li>' +
                    '<li><span style="background:rgb(231, 145, 52);"></span>50万円ー75万円</li>' +
                    '<li><span style="background:rgb(235, 178, 61);"></span>25万円ー50万円</li>' +
                    '<li><span style="background:rgb(239, 211, 71);"></span>10万円ー25万円</li>' +
                    '<li><span style="background:rgb(245, 245, 81);"></span>10万円未満</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-koji',
                label: "公示価格（R06）",
                source: kojiSource,
                layers:[kojiLayerPoint,kojiLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-2024.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-koji-3d',
                label: "公示価格（R06）3D",
                source: kojiSource,
                layers:[kojilayerheight],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-2024.html" target="_blank">国土数値情報</a>' +
                '<div class="legend-scale">' +
                        '<ul class="legend-labels">' +
                    '<li><span style="background:rgb(225, 49, 33);"></span>1000万円以上</li>' +
                    '<li><span style="background:rgb(225, 61, 35);"></span>100万円ー1000万円</li>' +
                    '<li><span style="background:rgb(226, 84, 39);"></span>75万円ー100万円</li>' +
                    '<li><span style="background:rgb(231, 145, 52);"></span>50万円ー75万円</li>' +
                    '<li><span style="background:rgb(235, 178, 61);"></span>25万円ー50万円</li>' +
                    '<li><span style="background:rgb(239, 211, 71);"></span>10万円ー25万円</li>' +
                    '<li><span style="background:rgb(245, 245, 81);"></span>10万円未満</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-chika',
                label: "都道府県地価調査（R06）3D",
                source: chikaSource3d,
                layers:[chikalayerheight],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L02-2024.html" target="_blank">国土数値情報</a>' +
                    '<div class="legend-scale">' +
                    '<ul class="legend-labels">' +
                    '<li><span style="background:rgb(225, 49, 33);"></span>1000万円以上</li>' +
                    '<li><span style="background:rgb(225, 61, 35);"></span>100万円ー1000万円</li>' +
                    '<li><span style="background:rgb(226, 84, 39);"></span>75万円ー100万円</li>' +
                    '<li><span style="background:rgb(231, 145, 52);"></span>50万円ー75万円</li>' +
                    '<li><span style="background:rgb(235, 178, 61);"></span>25万円ー50万円</li>' +
                    '<li><span style="background:rgb(239, 211, 71);"></span>10万円ー25万円</li>' +
                    '<li><span style="background:rgb(245, 245, 81);"></span>10万円未満</li>' +
                    '</ul>' +
                    '</div>',
                info: true
            },
            {
                id: 'oh-nihonrekishi',
                label: "日本歴史地名大系",
                source: nihonrekishiSource,
                layers:[nihonrekishiLayer,nihonrekishiLayerLabel]
            },
        ]
    },
    {
        id: 'offline',
        label: "オフラインレイヤー",
        nodes: [
            // {
            //     id: 'oh-offline-stdLayer',
            //     label: "地理院標準地図オフライン",
            //     source: stdSource,
            //     layers: [stdLayer]
            // },
            {
                id: 'oh-offline-pale-layer',
                label: "地理院淡色地図オフライン",
                source: paleSource,
                layers: [paleLayer]
            },
            {
                id: 'oh-homusyo-2025-layer-offline',
                label: "2025登記所地図オフライン",
                sources: [homusyo2025Source,homusyo2025DDissolvedSource,homusyo2025NinizahyoSource],
                layers: [homusyo2025Layer,homusyo2025LayerLine,homusyo2025LayerLabel,homusyo2025LayerVertex,homusyo2025DissolvedAllLayer,homusyo2025DissolvedLayer,homusyo2025NinizahyoCircle,homusyo2025NinizahyoSymbol],
                attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
                ext: {name:'extTokijyo2025'}
            }
        ]
    },
    {
        id: 'test',
        label: "テスト",
        nodes: [
            // {
            //     id: 'oh-amx-a-fude',
            //     label: "2024登記所地図",
            //     sources: [amxSource,amx2024Source],
            //     layers: [amxLayerDaihyou,amx2024Layer,amx2024LayerLine,amx2024LayerVertex,amx2024LayerLabel],
            //     attribution: '<a href="https://front.geospatial.jp/moj-chizu-xml-readme/" target="_blank">法務省登記所備付地図データ</a>',
            //     ext: {name:'extTokijyo'}
            // },
            {
                id: 'oh-t23kuLayer',
                label: "23区テスト",
                sources:[t23kuSource],
                layers: [t23kuLayer],
            },
            {
                id: 'oh-vector-layer-mono',
                label: "地理院ベクター・モノクロ",
                sources: monoSources,
                layers: monoLayers,
            },
            {
                id: 'oh-test2',
                label: "test",
                sources: [fjEkijyokaSourse],
                layers: [fjEkijyokatLayer, fjEkijyokatLayerLine]
            },
            {
                id: 'oh-jinjya',
                label: "延喜式神名帳式内社(神社)",
                source: jinjyaSource,
                layers: [jinjyaLayer,jinjyaLayerLabel]
            },
            {
                id: 'oh-hikari',
                label: "夜のあかり",
                source: hikariSource,
                layers: [hikariLayer]
            },
            {
                id: 'oh-hikari-height',
                label: "夜のあかり3D",
                source: hikariSource,
                layers: [hikariLayerHeight]
            },
        ]
    },
]
if (store.state.isOffline) {
    layers01 = layers01.filter(layer => layer.id === 'offline')
}
let layers02 = JSON.parse(JSON.stringify(layers01))
let layers01Clone = [...layers01]
let layers02Clone = [...layers02]
export const layers = reactive({
    map01: layers01Clone,
    map02: layers02Clone,
});
waitForStateValue(() => store.state.currentGroupName).then((val) => {
    nextTick(() => {
        console.log(layers01)
        const currentGroupName = toRef(store.state, 'currentGroupName');
        document.querySelectorAll('.group-layer').forEach(groupLayer => {
            if (store.state.currentGroupName) {
                groupLayer.innerHTML = `⭐<span style="color: red">️${store.state.currentGroupName}</span>`
            } else {
                groupLayer.innerHTML = ``
            }
        })
        watch(currentGroupName, (newVal) => {
            if (newVal) {
                console.log(layers01)
                layers01Clone = layers01
                layers02Clone = layers02
            } else {
                layers01Clone = layers01.filter(l => l.id !== 'oh-gloup-layer');
                layers02Clone = layers02.filter(l => l.id !== 'oh-gloup-layer');
            }
            // 中身を置き換える方法
            layers.map01.splice(0, layers01Clone.length, ...layers01Clone);
            layers.map02.splice(0, layers02Clone.length, ...layers02Clone);
            nextTick(() => {
                document.querySelectorAll('.group-layer').forEach(groupLayer => {
                    if (newVal) {
                        groupLayer.innerHTML = `⭐<span style="color: red">️${newVal}</span>`
                    } else {
                        groupLayer.innerHTML = ``
                    }
                })
            })
        });
    })
    const selectedLayers = computed(() => store.state.selectedLayers);
    watch(selectedLayers, (newVal) => {
        nextTick(() => {
            document.querySelectorAll('.group-layer').forEach(groupLayer => {
                if (store.state.currentGroupName) {
                    groupLayer.innerHTML = `⭐<span style="color: red">️${store.state.currentGroupName}</span>`
                } else {
                    groupLayer.innerHTML = ``
                }
            })
        })
    }, { deep: true });
})
console.log(layers)