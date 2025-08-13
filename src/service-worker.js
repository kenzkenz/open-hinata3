import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { RangeRequestsPlugin } from 'workbox-range-requests';

// =========================
// 1) Precache (Vue PWA)
// =========================
precacheAndRoute(self.__WB_MANIFEST);

// =========================
// 2) Runtime Caching
// =========================
// [重要] HTML(ナビゲーション)は NetworkFirst に変更（古いHTMLが出るのを防止）
registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
        cacheName: 'html-runtime',
        networkTimeoutSeconds: 8,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 1日（必要に応じて調整）
            }),
        ],
    })
);

// JS / CSS は引き続き CacheFirst（ビルドでハッシュ付きのため安全）
registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new CacheFirst({
        cacheName: 'static-resources',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月
            }),
        ],
    })
);

// API は StaleWhileRevalidate（"destination==='fetch'" は常に空になるため修正）
registerRoute(
    ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
    new StaleWhileRevalidate({
        cacheName: 'api-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1日
            }),
        ],
    })
);

// .pmtiles ファイル: Range リクエスト対応 + CacheFirst
registerRoute(
    ({ url }) => /2025final3\.pmtiles$/.test(url.href),
    new CacheFirst({
        cacheName: 'vector-tile-cache',
        plugins: [
            new RangeRequestsPlugin(),
            new ExpirationPlugin({
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月
            }),
        ],
    })
);

// `.pbf` タイル（pmtiles の仮想パス）
registerRoute(
    ({ url }) => url.pathname.startsWith('/pmtiles/homusyo/2025/2025final3.pmtiles/') && url.pathname.endsWith('.pbf'),
    new CacheFirst({
        cacheName: 'vector-tile-cache',
        plugins: [
            new RangeRequestsPlugin(),
            new ExpirationPlugin({
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
            }),
        ],
    })
);

// GSI ラスタ（PNG）
registerRoute(
    ({ url }) => /cyberjapandata\.gsi\.go\.jp\/xyz\/std\/\d+\/\d+\/\d+\.png$/.test(url.href),
    new CacheFirst({
        cacheName: 'raster-tile-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
            }),
        ],
    })
);

// =========================
// 3) Lifecycle
// =========================
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'SKIP_WAITING') self.skipWaiting();
});


// import { precacheAndRoute } from 'workbox-precaching';
// import { registerRoute } from 'workbox-routing';
// import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
// import { ExpirationPlugin } from 'workbox-expiration';
// // Range リクエスト対応プラグイン（PMTiles の部分取得にも対応）
// import { RangeRequestsPlugin } from 'workbox-range-requests';
//
// // Vue PWA用プリキャッシュ
// precacheAndRoute(self.__WB_MANIFEST);
//
// // JS, CSS, HTMLをCacheFirstでキャッシュ
// registerRoute(
//     ({ request }) =>
//         request.destination === 'script' ||
//         request.destination === 'style' ||
//         request.destination === 'document',
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
// // APIリクエストをStaleWhileRevalidateでキャッシュ
// registerRoute(
//     ({ request }) => request.destination === 'fetch' && request.method === 'GET',
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
// // .pmtiles ファイルへの Range リクエストをキャッシュ
// // .pmtiles へのリクエストをキャッチ
// registerRoute(
//     ({ url }) => url.href.match(/2025final3\.pmtiles$/),
//     new CacheFirst({
//         cacheName: 'vector-tile-cache',
//         plugins: [
//             // Range ヘッダ付きリクエストを自動処理してくれる
//             new RangeRequestsPlugin(),
//             // 古いキャッシュを自動クリーンアップ
//             new ExpirationPlugin({
//                 maxEntries: 1000,
//                 maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月
//             }),
//         ],
//     })
// );
// // `.pbf` タイルリクエストをキャッチして、RangeRequestsPlugin に委譲する
// registerRoute(
//     ({ url }) =>
//         url.pathname.startsWith('/pmtiles/homusyo/2025/2025final3.pmtiles/') &&
//         url.pathname.endsWith('.pbf'),
//     new CacheFirst({
//         cacheName: 'vector-tile-cache',
//         plugins: [
//             new RangeRequestsPlugin(),
//             new ExpirationPlugin({
//                 maxEntries: 1000,
//                 maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月
//             })
//         ]
//     })
// );
// // .png タイルをキャッシュ
// registerRoute(
//     ({ url }) => url.href.match(/cyberjapandata\.gsi\.go\.jp\/xyz\/std\/\d+\/\d+\/\d+\.png$/),
//     new CacheFirst({
//         cacheName: 'raster-tile-cache',
//         plugins: [
//             new ExpirationPlugin({
//                 maxEntries: 1000, // ズーム 14-15 で 10km 四方、約 80-125 タイル（5-20MB）
//                 maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月
//             }),
//         ],
//     })
// );
//
// // インストール直後にactivateへ
// self.addEventListener('install', event => {
//     self.skipWaiting();
// });
//
// // activate時にすべてのクライアントを制御
// self.addEventListener('activate', event => {
//     event.waitUntil(self.clients.claim());
// });
//
// // メッセージ受信: SKIP_WAITING をハンドル
// self.addEventListener('message', event => {
//     console.log('メッセージを受信:', event.data?.type);
//     const data = event.data || {};
//     if (data.type === 'SKIP_WAITING') {
//         self.skipWaiting();
//     }
// });
