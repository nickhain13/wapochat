importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Fetch-Handler macht die App als PWA installierbar auf Android
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
