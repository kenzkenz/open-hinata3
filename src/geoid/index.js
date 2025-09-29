// src/geoid/index.js
// GSIGEO2011 を japan-geoid の同梱Wasmから初期化＆キャッシュ

import init, { loadEmbeddedGSIGEO2011 } from 'japan-geoid';

let geoidInstance = null;
let bootPromise = null;

/** GSIGEO2011 を初期化して Geoid インスタンスを返す（キャッシュ付き） */
export async function ensureGeoid() {
    if (geoidInstance) return geoidInstance;
    if (!bootPromise) {
        bootPromise = (async () => {
            await init();                         // Wasm 初期化
            geoidInstance = await loadEmbeddedGSIGEO2011(); // 同梱 GSIGEO2011 をロード
            return geoidInstance;
        })();
    }
    return bootPromise;
}

/** ジオイド高 N を取得（lon=経度, lat=緯度; WGS84 / degrees） */
export async function getGeoidHeight(lon, lat) {
    const geoid = await ensureGeoid();
    // japan-geoid の API は (lon, lat) の順
    return geoid.getHeight(lon, lat);
}

/** 楕円体高 hae(=HAE) から正高 H = hae - N を返す（計算できなければ null） */
export async function calcOrthometric(lon, lat, hae) {
    const haeNum = Number(hae);
    if (!Number.isFinite(haeNum)) return null;
    const N = await getGeoidHeight(lon, lat);
    if (!Number.isFinite(N)) return null;
    return haeNum - N;
}
