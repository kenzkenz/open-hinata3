import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Vue PWA 用のプリキャッシュ
precacheAndRoute(self.__WB_MANIFEST);

// PMTiles キャッシュ
// registerRoute(
//     ({ url }) => url.pathname.includes('https://kenzkenz3.xsrv.jp/pmtiles/amx/MojMap_amx_2024.pmtiles'),
//     new CacheFirst({
//         cacheName: 'pmtiles-cache',
//         plugins: [
//             new ExpirationPlugin({
//                 maxEntries: 1000, // キャッシュの最大エントリ数
//                 maxAgeSeconds: 60 * 60 * 24 * 7, // 1週間
//             })
//         ]
//     })
// );

// 動的リソースのキャッシュ (CSS, JS, API)
registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'document',
    new StaleWhileRevalidate({
        cacheName: 'dynamic-resources',
    })
);

// API キャッシュ (GET リクエスト)
registerRoute(
    ({ request }) => request.destination === 'fetch' && request.method === 'GET',
    new StaleWhileRevalidate({
        cacheName: 'api-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50, // 最大エントリ数
                maxAgeSeconds: 60 * 60 * 24, // 1日
            })
        ]
    })
);

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
