const VERSI = 'cos-pp-v5';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/style.css',
  './js/config.js',
  './js/util.js',
  './js/state.js',
  './js/kop.js',
  './js/kuitansi.js',
  './js/pc.js',
  './js/puk.js',
  './js/akun.js',
  './js/ui.js',
  './js/transactions.js',
  './js/laporan.js',
  './js/auth.js',
  './js/pwa.js'
];

const HOST_CDN = ['www.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function simpan(req, res) {
  if (res && res.ok) {
    const salinan = res.clone();
    caches.open(VERSI).then(c => c.put(req, salinan));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => simpan(req, res))
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  if (HOST_CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => simpan(req, res)))
    );
  }
});
