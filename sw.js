const CACHE_NAME = 'wnl-cache-v81';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/lib/lunar.min.js',
  './js/holidays.js',
  './js/calendar.js',
  './js/storage.js',
  './js/app.js',
  './icons/favicon.svg',
  './icons/favicon.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 安装阶段：逐项可靠预缓存所有静态资源并立即接管
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of ASSETS_TO_CACHE) {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res && res.ok) {
            await cache.put(url, res);
          }
        } catch (e) {}
      }
    })
  );
});

// 激活阶段：清理旧缓存并立即生效
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：0ms 本地秒开 (Instant Cache Hit) + 后台静默异步更新，消除主屏冷启动白屏
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // 1. 主屏启动与 HTML 导航：0ms 直接返回本地缓存 HTML，绝不等待任何网络握手
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true }).then(cachedHtml => {
        if (cachedHtml) {
          // 0 毫秒瞬间返回本地 HTML，不阻塞主流程！
          // 后台异步静默尝试检查更新 (SWR)
          fetch(event.request).then(netRes => {
            if (netRes && netRes.ok) {
              const clone = netRes.clone();
              caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone));
            }
          }).catch(() => {});
          return cachedHtml;
        }

        // 若无缓存，正常发起网络请求
        return fetch(event.request).catch(async () => {
          return (await caches.match('./index.html', { ignoreSearch: true })) || (await caches.match('./', { ignoreSearch: true }));
        });
      })
    );
    return;
  }

  // 2. 静态资源拦截 (CSS / JS / 图标)：0ms 瞬间直出已缓存资源
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      if (cachedResponse) {
        // 0 毫秒直出，后台异步更新
        fetch(event.request).then(netRes => {
          if (netRes && netRes.status === 200) {
            const clone = netRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(async () => {
        return (await caches.match(event.request, { ignoreSearch: true })) || (await caches.match('./index.html', { ignoreSearch: true }));
      });
    })
  );
});

