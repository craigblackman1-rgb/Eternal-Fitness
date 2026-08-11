const CACHE_NAME = "hub-shell-v1";

const STATIC_PREFIXES = [
  "/_next/static/",
  "/hub-icon-",
  "/hub.webmanifest",
];

const API_PREFIX = "/api/";

function isStaticAsset(url) {
  const path = new URL(url).pathname;
  return STATIC_PREFIXES.some(function (prefix) {
    return path.startsWith(prefix);
  });
}

function isApiRequest(url) {
  var path = new URL(url).pathname;
  return path.startsWith(API_PREFIX);
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(["/hub.webmanifest"]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  var url = event.request.url;

  if (isApiRequest(url)) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return (
          cached ||
          fetch(event.request).then(function (response) {
            if (response && response.status === 200) {
              var clone = response.clone();
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
        );
      })
    );
  }
});
