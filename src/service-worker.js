/*
 * OH3 Service Worker (Range + PMTiles edition, uploads/** 対応)
 * 2025-09
 *
 * 目的:
 *  - ナビゲーション(HTML)は常に新鮮(NetworkFirst)で古い画面を出さない
 *  - JS/CSSはCacheFirst（ハッシュ済みアセット）
 *  - APIはStaleWhileRevalidate
 *  - PMTilesは RangeRequestsPlugin + CacheFirst（※200のみキャッシュ）
 *  - 事前に .pmtiles 全体をプリフェッチして“完全オフライン”も可能
 *  - GSIラスタのPNGもCacheFirst
 *  - /uploads/<token>/pmtiles/<id>.pmtiles を一括対象に
 */

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { RangeRequestsPlugin, createPartialResponse } from 'workbox-range-requests';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// =============
// 0) Settings
// =============
self.__WB_DISABLE_DEV_LOGS = true;

// 既存の固定PMTiles（必要に応じて置換）
const PMTILES_FILE_REGEX = /2025final3\.pmtiles(\?.*)?$/;
// 仮想 .pbf パス（使う場合のみ）
const PMTILES_VIRTUAL_PREFIX = '/pmtiles/homusyo/2025/2025final3.pmtiles/';

// ★ 追加: /uploads/<token>/pmtiles/<id>.pmtiles を一括対象にするパターン
// 例: https://kenzkenz.net/uploads/tb3jBL4qEPdNseETkgGkj9MmsJ42/pmtiles/68b11e296c57d.pmtiles
const PMTILES_UPLOADS_REGEX = /\/uploads\/[^/]+\/pmtiles\/[^/]+\.pmtiles(?:\?.*)?$/;

const CACHES = {
    html: 'html-runtime',
    static: 'static-resources',
    api: 'api-cache',
    pmtiles: 'vector-tile-cache',
    raster: 'raster-tile-cache',
};

// =========================
// 1) Precache (Vue/Vite PWA)
// =========================
precacheAndRoute(self.__WB_MANIFEST || []);

// =========================
// 2) Runtime Caching
// =========================
// A) HTML(ナビゲーション)は NetworkFirst（古い画面の再表示を防止）
registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
        cacheName: CACHES.html,
        networkTimeoutSeconds: 8,
        plugins: [ new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 }) ],
    })
);

// B) JS / CSS は CacheFirst（ビルドでハッシュ付きのため安全）
registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new CacheFirst({
        cacheName: CACHES.static,
        plugins: [ new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }) ],
    })
);

// C) API（GETのみ）: StaleWhileRevalidate
registerRoute(
    ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
    new StaleWhileRevalidate({
        cacheName: CACHES.api,
        plugins: [ new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }) ],
    })
);

// D) .pmtiles 本体: Range対応 + CacheFirst
// 重要: CacheableResponsePlugin({statuses:[200]}) で “200のみ” 保存（206を積まない）
registerRoute(
    ({ url }) => (
        url.origin === self.location.origin &&
        (PMTILES_FILE_REGEX.test(url.pathname) || PMTILES_UPLOADS_REGEX.test(url.pathname))
    ),
    new CacheFirst({
        cacheName: CACHES.pmtiles,
        matchOptions: { ignoreVary: true },
        plugins: [
            new CacheableResponsePlugin({ statuses: [200] }), // 206はキャッシュしない
            new RangeRequestsPlugin(),
            new ExpirationPlugin({ maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
    })
);

// E) PMTilesの仮想 .pbf パス（pmtilesサーバ/リバースプロキシ運用時など）
registerRoute(
    ({ url }) => url.pathname.startsWith(PMTILES_VIRTUAL_PREFIX) && url.pathname.endsWith('.pbf'),
    new CacheFirst({
        cacheName: CACHES.pmtiles,
        plugins: [ new ExpirationPlugin({ maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 }) ],
    })
);

// F) GSI ラスタ（PNG）
registerRoute(
    ({ url }) => /cyberjapandata\.gsi\.go\.jp\/xyz\/std\/\d+\/\d+\/\d+\.png$/.test(url.href),
    new CacheFirst({
        cacheName: CACHES.raster,
        plugins: [ new ExpirationPlugin({ maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 }) ],
    })
);

// =========================
// 3) Lifecycle
// =========================
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// =========================
// 4) Control Messages
// =========================
self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }

    // 完全オフライン用: .pmtiles を “200で” 事前にキャッシュ
    if (data.type === 'OH3_PREFETCH_PMTILES' && typeof data.url === 'string') {
        event.waitUntil((async () => {
            const cache = await caches.open(CACHES.pmtiles);
            const res = await fetch(data.url, { credentials: 'omit' }); // Range無しの完全GET
            const ok = res.ok && res.status === 200;
            if (ok) await cache.put(data.url, res.clone());
            // 応答（MessageChannel経由推奨）
            event.ports && event.ports[0] && event.ports[0].postMessage({ ok, status: res.status });
        })());
        return;
    }

    // キャッシュ削除
    if (data.type === 'OH3_CLEAR_PMTILES_CACHE') {
        event.waitUntil(caches.delete(CACHES.pmtiles));
        return;
    }

    // キャッシュ一覧
    if (data.type === 'OH3_LIST_PMTILES_CACHE') {
        event.waitUntil((async () => {
            const cache = await caches.open(CACHES.pmtiles);
            const keys = await cache.keys();
            const urls = keys.map(r => r.url);
            event.ports && event.ports[0] && event.ports[0].postMessage({ urls });
        })());
    }
});

// =========================
// 5) Safety Fallback for Range
// =========================
// 念のため: もし上の registerRoute にマッチしない Range リクエストが来たら、
// キャッシュ済みの200レスポンスから 206 を合成して返す（pmtiles向け）
self.addEventListener('fetch', (ev) => {
    const req = ev.request;
    if (req.headers.has('range')) {
        const u = new URL(req.url);
        if (
            u.origin === self.location.origin &&
            (PMTILES_FILE_REGEX.test(u.pathname) || PMTILES_UPLOADS_REGEX.test(u.pathname))
        ) {
            ev.respondWith((async () => {
                // 200のキーで検索（Rangeヘッダを無視）
                const cache = await caches.open(CACHES.pmtiles);
                const full = await cache.match(new Request(u.href, { method: 'GET' }), { ignoreVary: true });
                if (full) return createPartialResponse(req, full);
                return fetch(req);
            })());
        }
    }
});





// import { precacheAndRoute } from 'workbox-precaching';
// import { registerRoute } from 'workbox-routing';
// import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
// import { ExpirationPlugin } from 'workbox-expiration';
// import { RangeRequestsPlugin } from 'workbox-range-requests';
//
// // =========================
// // 1) Precache (Vue PWA)
// // =========================
// precacheAndRoute(self.__WB_MANIFEST);
//
// // =========================
// // 2) Runtime Caching
// // =========================
// // [重要] HTML(ナビゲーション)は NetworkFirst に変更（古いHTMLが出るのを防止）
// registerRoute(
//     ({ request }) => request.mode === 'navigate',
//     new NetworkFirst({
//         cacheName: 'html-runtime',
//         networkTimeoutSeconds: 8,
//         plugins: [
//             new ExpirationPlugin({
//                 maxEntries: 10,
//                 maxAgeSeconds: 60 * 60 * 24, // 1日（必要に応じて調整）
//             }),
//         ],
//     })
// );
//
// // JS / CSS は引き続き CacheFirst（ビルドでハッシュ付きのため安全）
// registerRoute(
//     ({ request }) => request.destination === 'script' || request.destination === 'style',
//     new CacheFirst({
//         cacheName: 'static-resources',
//         plugins: [
//             new ExpirationPlugin({
//                 maxEntries: 100,
//                 maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月
//             }),
//         ],
//     })
// );
//
// // API は StaleWhileRevalidate（"destination==='fetch'" は常に空になるため修正）
// registerRoute(
//     ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
//     new StaleWhileRevalidate({
//         cacheName: 'api-cache',
//         plugins: [
//             new ExpirationPlugin({
//                 maxEntries: 50,
//                 maxAgeSeconds: 60 * 60 * 24, // 1日
//             }),
//         ],
//     })
// );
//
// // .pmtiles ファイル: Range リクエスト対応 + CacheFirst
// registerRoute(
//     ({ url }) => /2025final3\.pmtiles$/.test(url.href),
//     new CacheFirst({
//         cacheName: 'vector-tile-cache',
//         plugins: [
//             new RangeRequestsPlugin(),
//             new ExpirationPlugin({
//                 maxEntries: 1000,
//                 maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月
//             }),
//         ],
//     })
// );
//
// // `.pbf` タイル（pmtiles の仮想パス）
// registerRoute(
//     ({ url }) => url.pathname.startsWith('/pmtiles/homusyo/2025/2025final3.pmtiles/') && url.pathname.endsWith('.pbf'),
//     new CacheFirst({
//         cacheName: 'vector-tile-cache',
//         plugins: [
//             new RangeRequestsPlugin(),
//             new ExpirationPlugin({
//                 maxEntries: 1000,
//                 maxAgeSeconds: 60 * 60 * 24 * 30,
//             }),
//         ],
//     })
// );
//
// // GSI ラスタ（PNG）
// registerRoute(
//     ({ url }) => /cyberjapandata\.gsi\.go\.jp\/xyz\/std\/\d+\/\d+\/\d+\.png$/.test(url.href),
//     new CacheFirst({
//         cacheName: 'raster-tile-cache',
//         plugins: [
//             new ExpirationPlugin({
//                 maxEntries: 1000,
//                 maxAgeSeconds: 60 * 60 * 24 * 30,
//             }),
//         ],
//     })
// );
//
// // =========================
// // 3) Lifecycle
// // =========================
// self.addEventListener('install', () => self.skipWaiting());
//
// self.addEventListener('activate', (event) => {
//     event.waitUntil(self.clients.claim());
// });
//
// self.addEventListener('message', (event) => {
//     const data = event.data || {};
//     if (data.type === 'SKIP_WAITING') self.skipWaiting();
// });
//
