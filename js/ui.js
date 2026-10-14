const INPUT_RUPIAH = ['fTotal', 'lTotal'];
const NOMOR_BANTUAN = '6281383179209';

const GAYA_LANSIA = `
:root{--mut:#1a1a1a;--line:#8c99ab;--warn:#7a4b00}
body{font-size:18px;line-height:1.5}
header{position:static;padding:10px 14px}
header b{font-size:18px}
header small{font-size:14px;opacity:1}
header button{min-height:44px;padding:8px 16px;font-size:16px;font-weight:700;background:#fff;color:var(--acc);border:3px solid var(--acc)}
main{padding:12px 12px 160px}
.card{padding:18px;border:1px solid var(--line);border-radius:14px}
.card h2{font-size:23px}
.card h3{font-size:21px}
.btn{width:100%;min-height:60px;padding:14px 18px;margin-top:20px;font-size:20px;border-radius:12px}
.btn.alt{border-width:2px}
.btn.sm{width:auto;flex:1 1 44%;min-height:54px;margin:0;padding:12px 14px;font-size:18px}
.row .act .btn.prev{border-width:3px}
.row{padding:18px 0;gap:12px}
.row .info{min-width:100%}
.row .act{width:100%;gap:10px}
.peringatan{font-size:20px;padding:16px 18px}
.hint{font-size:16px;color:var(--mut)}
.badge{padding:4px 12px;font-size:15px}
.b-Lunas{background:#dcfce7;color:#14532d}
.b-Pending{background:#fdb913;color:#1a1a1a}
.b-Ditolak,.b-Menunggak{background:#fee2e2;color:#7f1d1d}
.b-Belum{background:#e5e7eb;color:#1f2937}
table{font-size:17px}
th,td{padding:14px 10px}
th{font-size:15px;font-weight:700;color:var(--ink);text-transform:none;letter-spacing:0}
.bar>div{min-width:100%}
#busy{font-size:22px;background:rgba(255,255,255,.88)}
#toast{bottom:32px;max-width:92%;padding:16px 20px;font-size:18px;background:#1a1a1a}
@media (min-width:720px){
  .btn{width:auto;padding:14px 28px}
  .row .info{min-width:220px}
  .row .act{width:auto}
  .bar>div{min-width:140px}
}
`;

const VIEWS = {
  dasbor: viewDasbor,
  catat: viewCatat,
  kuitansi: viewRiwayatKuitansi,
  laporan: viewLaporanMasuk,
  akun: viewAkunPUK,
  beranda: viewPukBeranda,
  lapor: viewPukLapor,
  kuitansiku: viewPukKuitansi,
  pengaturan: viewPengaturan
};

const IKON_NAV = {
  dasbor: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  catat: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  kuitansi: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  laporan: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  akun: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  beranda: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>'
};
IKON_NAV.kuitansiku = IKON_NAV.kuitansi;
IKON_NAV.lapor = IKON_NAV.catat;

const TABS_PC = [
  ['dasbor', 'Status Pembayaran', 'Status'],
  ['laporan', 'Laporan Masuk', 'Laporan'],
  ['catat', 'Buat Kuitansi', 'Catat'],
  ['kuitansi', 'Riwayat Kuitansi', 'Riwayat'],
  ['akun', 'Akun PUK', 'Akun']
];

const TABS_PUK = [
  ['beranda', 'Beranda', 'Beranda'],
  ['lapor', 'Lapor Pembayaran', 'Lapor'],
  ['kuitansiku', 'Kuitansi Saya', 'Kuitansi']
];

const TAB_UTAMA = ['catat', 'lapor'];

const GAYA_DESKTOP = `
@media (min-width:700px){
  nav{max-width:660px}
  .pwa-bar{max-width:660px}
}
@media (min-width:820px){
  main{max-width:1180px;padding:28px 28px 150px}
  main#content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:22px;align-items:start}
  main#content>*{grid-column:1/-1;min-width:0}
  main#content:has(.card ~ .card)>.card,main#content:has(.card ~ .card)~*{grid-column:auto}
  main#content>.card:only-of-type,main#content:not(:has(.card ~ .card))>.card{max-width:820px}
  .rk{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;align-items:start}
  .rk>.rk-judul{grid-column:1/-1;max-width:none;margin:4px 2px 0}
  .rk>.rk-item,.rk>.rk-wa{max-width:none;margin:0}
  .sub-tab{max-width:460px}
  .puk-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:1px;background:#e6ebf2}
  .puk-baris{background:#fff;border-top:0}
  .kpi-panel{margin-bottom:26px}
  .kpi{padding:20px 24px}
  .kpi-nilai{font-size:34px}
  .kas-saldo{padding:20px 26px}
  .card .btn{width:auto;min-width:240px}
  .card .btn.alt{min-width:0}
}
@media (min-width:1000px){
  header{position:sticky;top:0;z-index:12;height:76px;padding:0 28px}
  header b{font-size:19px}
  nav{top:76px;left:0;right:auto;bottom:0;width:244px;max-width:none;margin:0;padding:18px 14px;flex-direction:column;justify-content:flex-start;gap:6px;overflow-y:auto;background:#fff;border:0;border-right:1px solid #dce5ef;border-radius:0;box-shadow:none}
  nav button,nav button.utama{flex:0 0 auto;flex-direction:row;justify-content:flex-start;gap:14px;min-height:50px;padding:0 16px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0;text-align:left;color:#475569;transition:background .15s ease,color .15s ease}
  nav button:hover:not(.on){background:#eef4fb;color:#0756a3}
  nav button.on,nav button.utama.on{background:#0756a3;color:#fff}
  nav button .nav-label{display:none}
  nav button::after{content:attr(aria-label);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  nav button.utama{margin:4px 0;font-weight:700;color:#0756a3;background:#eaf3fd;box-shadow:inset 0 0 0 1px #cfe2f7}
  nav button.utama:hover:not(.on){background:#dcebfb;color:#063e78}
  nav button.utama.on{color:#fff;background:#0756a3;box-shadow:none}
  nav button.utama .nav-ikon,nav button.utama.on .nav-ikon{width:26px;height:26px;margin:0;border:0;background:none;box-shadow:none;color:inherit}
  nav button.utama svg{width:26px;height:26px;stroke-width:2.4}
  main{margin:0 0 0 244px;max-width:none;padding:30px max(32px,calc((100vw - 244px - 1240px)/2)) 56px}
  #toast{bottom:28px}
  body:has(#appView:not([hidden])) #toast{bottom:28px}
  body:has(#appView:not([hidden])) .pwa-bar{left:auto;right:20px;bottom:20px;margin:0}
  .rk-aksi button:hover,.sub-tab button:not(.on):hover,.kas-jenis button:hover{background:#eaf1fa}
  .rk-aksi button,.sub-tab button,.kas-jenis button,.btn{transition:background .15s ease}
}
@media (min-width:1500px){
  main{padding-left:max(40px,calc((100vw - 244px - 1380px)/2));padding-right:max(40px,calc((100vw - 244px - 1380px)/2))}
  .rk{grid-template-columns:repeat(auto-fill,minmax(380px,1fr))}
}
`;

function pasangGayaDesktop() {
  const el = document.createElement('style');
  el.id = 'gayaDesktop';
  el.textContent = GAYA_DESKTOP;
  document.head.appendChild(el);
}

function tabsAktif() {
  return isPUK() ? TABS_PUK : TABS_PC;
}

function showTab(t) {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  S.tab = t;
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (!S.profile) return;
  $('loginView').hidden = true;
  $('appView').hidden = false;

  const tabs = tabsAktif();
  if (pengaturanDibuka()) S.tab = 'pengaturan';
  else if (!tabs.some(t => t[0] === S.tab)) S.tab = tabs[0][0];

  $('who').textContent = isPUK() ? 'PUK ' + namaPUKSaya() : (S.pengaturan.namaPC || 'PP FSP RTMM-SPSI');
  $('role').textContent = isPUK() ? 'Akun PUK' : 'Dashboard PP';

  $('nav').innerHTML = tabs.map(t => {
    const aktif = t[0] === S.tab;
    const kelas = (TAB_UTAMA.indexOf(t[0]) >= 0 ? 'utama' : '') + (aktif ? ' on' : '');
    const n = t[0] === 'laporan' ? jumlahLaporanMenunggu() : 0;
    return '<button class="' + kelas.trim() + '" aria-label="' + esc(t[1]) + '"' + (aktif ? ' aria-current="page"' : '') + ' onclick="showTab(\'' + t[0] + '\')">' +
      '<span class="nav-ikon"><svg viewBox="0 0 24 24" aria-hidden="true">' + IKON_NAV[t[0]] + '</svg>' + (n ? '<i class="nav-badge">' + n + '</i>' : '') + '</span>' +
      '<span class="nav-label">' + esc(t[2]) + '</span></button>';
  }).join('');

  const box = $('content');
  const keep = {};
  let focusId = null;
  if (S.lastTab === S.tab) {
    box.querySelectorAll('input,select,textarea').forEach(el => {
      if (el.id && el.type !== 'file') keep[el.id] = el.value;
    });
    const a = document.activeElement;
    if (a && a.id && box.contains(a)) focusId = a.id;
  }

  box.innerHTML = VIEWS[S.tab]();
  siapkanInputRupiah(box);

  Object.keys(keep).forEach(id => {
    const el = $(id);
    if (el) el.value = keep[id];
  });
  if (focusId && $(focusId)) {
    const el = $(focusId);
    el.focus();
    if (el.setSelectionRange && /text|search|tel|url|password/.test(el.type)) {
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (x) {}
    }
  }
  S.lastTab = S.tab;
}

function pasangGayaLansia() {
  const el = document.createElement('style');
  el.textContent = GAYA_LANSIA;
  document.head.appendChild(el);
}

function formatInputRupiah(el) {
  const lama = el.value;
  const aktif = document.activeElement === el;
  const posisi = aktif && el.selectionStart != null ? el.selectionStart : lama.length;
  const sebelum = lama.slice(0, posisi).replace(/\D/g, '').length;
  const baru = ribuan(lama);
  if (baru === lama) return;
  el.value = baru;
  if (!aktif) return;
  let hitung = 0;
  let idx = 0;
  while (idx < baru.length && hitung < sebelum) {
    if (/\d/.test(baru[idx])) hitung++;
    idx++;
  }
  el.setSelectionRange(idx, idx);
}

function siapkanInputRupiah(root) {
  INPUT_RUPIAH.forEach(id => {
    const el = root.querySelector('#' + id);
    if (!el) return;
    el.type = 'text';
    el.inputMode = 'numeric';
    el.autocomplete = 'off';
    el.maxLength = 15;
    el.dataset.rupiah = '1';
    if (/^\d+$/.test(el.placeholder)) el.placeholder = ribuan(el.placeholder);
    el.value = ribuan(el.value);
  });
}

document.addEventListener('input', e => {
  const el = e.target;
  if (el && el.dataset && el.dataset.rupiah) formatInputRupiah(el);
});

pasangGayaLansia();
pasangGayaDesktop();

function pasangKetukRahasia() {
  const el = $('who');
  if (!el) return;
  let jumlah = 0;
  let timer = null;
  el.addEventListener('click', () => {
    jumlah++;
    if (jumlah === 1) timer = setTimeout(() => { jumlah = 0; }, 2000);
    if (jumlah < 3) return;
    clearTimeout(timer);
    jumlah = 0;
    if (isPC()) location.hash = RUTE_PENGATURAN;
  });
}

pasangKetukRahasia();

window.addEventListener('hashchange', render);

function pesanBantuan() {
  const baris = ['Halo, saya mengalami kendala pada aplikasi Kuitansi COS.', ''];
  if (S && S.profile) {
    baris.push('Pengguna: ' + (isPUK() ? 'PUK ' + namaPUKSaya() : ((S.pengaturan && S.pengaturan.namaPC) || 'PP FSP RTMM-SPSI')));
    const tab = tabsAktif().filter(t => t[0] === S.tab)[0];
    if (tab) baris.push('Menu: ' + tab[1]);
  }
  baris.push('Kendala: ');
  return baris.join('\n');
}

function bukaBantuanWA(el) {
  el.href = 'https://wa.me/' + NOMOR_BANTUAN + '?text=' + encodeURIComponent(pesanBantuan());
  return true;
}
