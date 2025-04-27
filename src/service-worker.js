import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Vue PWA 用プリキャッシュ
precacheAndRoute(self.__WB_MANIFEST);

// JS, CSS, HTMLをCacheFirstに変更（爆速）
registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'document',
    new CacheFirst({
        cacheName: 'static-resources',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 100, // 多めに保持
                maxAgeSeconds: 60 * 60 * 24 * 30, // 1ヶ月キャッシュ
            }),
        ],
    })
);

// APIだけStaleWhileRevalidate（データは最新に）
registerRoute(
    ({ request }) => request.destination === 'fetch' && request.method === 'GET',
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

// SKIP_WAITING
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});



// import { precacheAndRoute } from 'workbox-precaching';
// import { registerRoute } from 'workbox-routing';
// import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
// import { ExpirationPlugin } from 'workbox-expiration';
//
// // Vue PWA 用のプリキャッシュ
// precacheAndRoute(self.__WB_MANIFEST);
//
// // 動的リソースのキャッシュ (CSS, JS, API)
// registerRoute(
//     ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'document',
//     new StaleWhileRevalidate({
//         cacheName: 'dynamic-resources',
//     })
// );
//
// // API キャッシュ (GET リクエスト)
// registerRoute(
//     ({ request }) => request.destination === 'fetch' && request.method === 'GET',
//     new StaleWhileRevalidate({
//         cacheName: 'api-cache',
//         plugins: [
//             new ExpirationPlugin({
//                 maxEntries: 50, // 最大エントリ数
//                 maxAgeSeconds: 60 * 60 * 24, // 1日
//             })
//         ]
//     })
// );
//
// self.addEventListener("message", (event) => {
//     if (event.data && event.data.type === "SKIP_WAITING") {
//         self.skipWaiting();
//     }
// });
