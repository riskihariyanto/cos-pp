let promptPasang = null;

function sudahTerpasang() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

function perangkatIOS() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function pwaDitutup() {
  try {
    return sessionStorage.getItem('pwaTutup') === '1';
  } catch (e) {
    return false;
  }
}

function pwaSimpanTutup() {
  try { sessionStorage.setItem('pwaTutup', '1'); } catch (e) {}
}

function pwaBuangBar() {
  const el = document.getElementById('pwaBar');
  if (el) el.remove();
}

function pwaTutupPanduan() {
  const el = document.getElementById('pwaPanduan');
  if (el) el.remove();
}

function pwaSegarkanTombol() {
  const tombol = document.getElementById('btnPasang');
  if (tombol) tombol.hidden = sudahTerpasang();
}

function pwaTampilBar() {
  if (document.getElementById('pwaBar') || sudahTerpasang() || pwaDitutup()) return;
  const bar = document.createElement('div');
  bar.id = 'pwaBar';
  bar.className = 'pwa-bar';
  bar.innerHTML =
    '<div class="pwa-teks"><b>Pasang aplikasi</b><span>Buka lebih cepat dari layar utama dan tetap bisa dibuka saat sinyal lemah.</span></div>' +
    '<div class="pwa-aksi"><button type="button" class="pwa-btn" id="pwaPasang">Pasang</button>' +
    '<button type="button" class="pwa-nanti" id="pwaNanti">Nanti</button></div>';
  document.body.appendChild(bar);
  document.getElementById('pwaPasang').onclick = pasangAplikasi;
  document.getElementById('pwaNanti').onclick = () => {
    pwaSimpanTutup();
    pwaBuangBar();
  };
}

function pwaPanduan(judul, langkah, penutup) {
  pwaTutupPanduan();
  const el = document.createElement('div');
  el.id = 'pwaPanduan';
  el.className = 'pwa-overlay';
  el.innerHTML =
    '<div class="pwa-kotak" role="dialog" aria-modal="true" aria-label="' + judul + '">' +
    '<h2>' + judul + '</h2><ol>' + langkah.map(l => '<li>' + l + '</li>').join('') + '</ol>' +
    '<p>' + penutup + '</p>' +
    '<button type="button" class="pwa-btn" id="pwaPaham">Mengerti</button></div>';
  el.addEventListener('click', e => {
    if (e.target === el || e.target.id === 'pwaPaham') pwaTutupPanduan();
  });
  document.body.appendChild(el);
}

function pwaPanduanIOS() {
  pwaPanduan('Pasang di iPhone', [
    'Buka aplikasi ini lewat <b>Safari</b>.',
    'Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di bagian bawah layar.',
    'Gulir ke bawah, lalu pilih <b>Tambah ke Layar Utama</b>.',
    'Ketuk <b>Tambah</b> di pojok kanan atas.'
  ], 'Ikon <b>Kuitansi COS</b> akan muncul di layar utama dan terbuka seperti aplikasi biasa.');
}

function pwaPanduanUmum() {
  pwaPanduan('Pasang di HP', [
    'Buka aplikasi ini lewat <b>Chrome</b>.',
    'Ketuk menu <b>titik tiga</b> di pojok kanan atas.',
    'Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.',
    'Ketuk <b>Instal</b>.'
  ], 'Jika pilihan itu tidak ada, aplikasi mungkin sudah terpasang. Cari ikon <b>Kuitansi COS</b> di layar utama.');
}

function pasangAplikasi() {
  if (promptPasang) {
    const p = promptPasang;
    promptPasang = null;
    pwaBuangBar();
    p.prompt();
    p.userChoice.catch(() => {});
    return;
  }
  if (perangkatIOS()) pwaPanduanIOS();
  else pwaPanduanUmum();
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  promptPasang = e;
  pwaSegarkanTombol();
  pwaTampilBar();
});

window.addEventListener('appinstalled', () => {
  promptPasang = null;
  pwaBuangBar();
  pwaSegarkanTombol();
});

window.addEventListener('load', () => {
  pwaSegarkanTombol();
  if (perangkatIOS()) pwaTampilBar();
});
