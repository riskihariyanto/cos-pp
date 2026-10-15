const INPUT_RUPIAH = ['fTotal'];
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
  pengaturan: viewPengaturan
};

const IKON_NAV = {
  dasbor: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  catat: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  kuitansi: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
};

const TABS_PC = [
  ['dasbor', 'Status Pembayaran', 'Status'],
  ['catat', 'Buat Kuitansi', 'Catat'],
  ['kuitansi', 'Riwayat Kuitansi', 'Riwayat']
];

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

  const tabs = TABS_PC;
  if (pengaturanDibuka()) S.tab = 'pengaturan';
  else if (!tabs.some(t => t[0] === S.tab)) S.tab = tabs[0][0];

  $('who').textContent = S.pengaturan.namaPC || 'Pengurus Cabang';
  $('role').textContent = 'Dashboard PC';

  $('nav').innerHTML = tabs.map(t => {
    const aktif = t[0] === S.tab;
    const kelas = (t[0] === 'catat' ? 'utama' : '') + (aktif ? ' on' : '');
    return '<button class="' + kelas.trim() + '" aria-label="' + esc(t[1]) + '"' + (aktif ? ' aria-current="page"' : '') + ' onclick="showTab(\'' + t[0] + '\')">' +
      '<span class="nav-ikon"><svg viewBox="0 0 24 24" aria-hidden="true">' + IKON_NAV[t[0]] + '</svg></span>' +
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

const GAYA_SUKSES = `
#sukses{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 38%,rgba(0,85,165,.55),rgba(8,20,38,.88));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:skFade .35s ease both;overflow:hidden}
#sukses.keluar{animation:skFadeOut .32s ease forwards}
#sukses .sk-kartu{position:relative;width:min(92%,380px);padding:34px 24px 36px;text-align:center;background:#fff;border-radius:26px;box-shadow:0 24px 70px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.6) inset;animation:skKartu .7s cubic-bezier(.2,1.25,.35,1) both}
#sukses .sk-kartu::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;border-radius:26px 26px 0 0;background:linear-gradient(90deg,#0055a5,#fdb913,#16a34a);background-size:200% 100%;animation:skGaris 2.4s linear infinite}
#sukses .sk-lingkar{position:relative;width:112px;height:112px;margin:0 auto 18px}
#sukses .sk-cincin{position:absolute;inset:0;border-radius:50%;border:3px solid #16a34a;opacity:0;animation:skCincin 1.8s ease-out .35s infinite}
#sukses .sk-cincin.b{animation-delay:.95s}
#sukses .sk-inti{position:absolute;inset:0;border-radius:50%;background:linear-gradient(145deg,#22c55e,#15803d);box-shadow:0 10px 30px rgba(22,163,74,.55);animation:skInti .6s cubic-bezier(.3,1.5,.5,1) .15s both}
#sukses svg.sk-ikon{position:absolute;inset:0;width:100%;height:100%}
#sukses .sk-centang{fill:none;stroke:#fff;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:skGambar .5s ease .6s forwards}
#sukses .sk-judul{font-size:23px;font-weight:800;color:#0f1f12;letter-spacing:-.2px;animation:skNaik .5s ease .75s both}
#sukses .sk-nominal{margin-top:8px;font-size:34px;font-weight:800;color:#0055a5;font-variant-numeric:tabular-nums;animation:skNaik .5s ease .85s both}
#sukses .sk-nominal.keluar{color:#b91c1c}
#sukses .sk-detail{margin-top:8px;font-size:15px;line-height:1.45;color:#4b5563;overflow-wrap:anywhere;animation:skNaik .5s ease .95s both}
#sukses .sk-aksi{display:flex;gap:10px;margin-top:22px;animation:skNaik .5s ease 1.05s both}
#sukses .sk-aksi button{flex:1;min-height:50px;border-radius:14px;font-size:17px;font-weight:700;cursor:pointer}
#sukses .sk-aksi .utama{background:#0055a5;color:#fff;border:0;box-shadow:0 6px 16px rgba(0,85,165,.4)}
#sukses .sk-aksi .tutup{background:#fff;color:#0055a5;border:2px solid #0055a5}
#sukses .sk-bar{position:absolute;left:24px;right:24px;bottom:10px;height:3px;border-radius:3px;background:#e5e7eb;overflow:hidden}
#sukses .sk-bar i{display:block;height:100%;background:#16a34a;transform-origin:left;animation:skBar var(--dur,3.2s) linear 1.1s both}
#sukses .sk-konfeti{position:absolute;top:-24px;width:var(--w,9px);height:var(--h,14px);background:var(--c);border-radius:2px;opacity:0;pointer-events:none;animation:skJatuh var(--t,2.6s) cubic-bezier(.2,.7,.4,1) var(--d,0s) forwards}
@keyframes skFade{from{opacity:0}to{opacity:1}}
@keyframes skFadeOut{to{opacity:0}}
@keyframes skKartu{0%{opacity:0;transform:translateY(60px) scale(.8)}100%{opacity:1;transform:none}}
@keyframes skGaris{to{background-position:200% 0}}
@keyframes skInti{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes skGambar{to{stroke-dashoffset:0}}
@keyframes skCincin{0%{opacity:.75;transform:scale(1)}100%{opacity:0;transform:scale(1.75)}}
@keyframes skNaik{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes skBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes skJatuh{0%{opacity:1;transform:translate3d(0,0,0) rotate(0)}100%{opacity:0;transform:translate3d(var(--x,0),105vh,0) rotate(var(--r,540deg))}}
@media (prefers-reduced-motion:reduce){#sukses *,#sukses{animation-duration:.01s!important;animation-delay:0s!important}#sukses .sk-konfeti{display:none}}
`;

let timerSukses;

function bunyiSukses() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [[659.25, 0], [880, 0.11], [1318.5, 0.22]].forEach(([f, t]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.4);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.45);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1000);
  } catch (e) {}
}

function tutupSukses() {
  clearTimeout(timerSukses);
  const el = $('sukses');
  if (!el) return;
  el.classList.add('keluar');
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 340);
}

function animasiSukses(o) {
  o = o || {};
  if (!$('gayaSukses')) {
    const st = document.createElement('style');
    st.id = 'gayaSukses';
    st.textContent = GAYA_SUKSES;
    document.head.appendChild(st);
  }
  const lama = $('sukses');
  if (lama) lama.parentNode.removeChild(lama);
  clearTimeout(timerSukses);

  const warna = ['#0055a5', '#fdb913', '#16a34a', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  let konfeti = '';
  for (let i = 0; i < 46; i++) {
    const kiri = Math.round(Math.random() * 100);
    const geser = Math.round((Math.random() - 0.5) * 160);
    konfeti += '<span class="sk-konfeti" style="left:' + kiri + '%;--x:' + geser + 'px;--c:' + warna[i % warna.length] +
      ';--d:' + (0.25 + Math.random() * 0.9).toFixed(2) + 's;--t:' + (2.2 + Math.random() * 1.6).toFixed(2) +
      's;--r:' + Math.round(360 + Math.random() * 720) + 'deg;--w:' + (6 + Math.round(Math.random() * 6)) + 'px;--h:' + (10 + Math.round(Math.random() * 8)) + 'px"></span>';
  }

  const durasi = o.aksi ? 6 : 3.2;
  const el = document.createElement('div');
  el.id = 'sukses';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = konfeti +
    '<div class="sk-kartu">' +
    '<div class="sk-lingkar"><span class="sk-cincin"></span><span class="sk-cincin b"></span><div class="sk-inti"></div>' +
    '<svg class="sk-ikon" viewBox="0 0 112 112" aria-hidden="true"><path class="sk-centang" d="M32 58 L49 75 L81 39"/></svg></div>' +
    '<div class="sk-judul">' + esc(o.judul || 'Berhasil') + '</div>' +
    (o.nominal != null ? '<div class="sk-nominal' + (o.jenis === 'keluar' ? ' keluar' : '') + '" id="skNominal">' + esc(rp(0)) + '</div>' : '') +
    (o.detail ? '<div class="sk-detail">' + esc(o.detail) + '</div>' : '') +
    (o.aksi ? '<div class="sk-aksi"><button type="button" class="tutup" id="skTutup">Tutup</button><button type="button" class="utama" id="skAksi">' + esc(o.aksi.label) + '</button></div>' : '') +
    '<div class="sk-bar" style="--dur:' + durasi + 's"><i></i></div></div>';
  document.body.appendChild(el);

  el.addEventListener('click', e => {
    if (e.target.id === 'skAksi') {
      tutupSukses();
      if (o.aksi && o.aksi.fn) o.aksi.fn();
      return;
    }
    tutupSukses();
  });

  if (o.nominal != null) {
    const tampil = $('skNominal');
    const total = Math.max(0, Number(o.nominal) || 0);
    const mulai = performance.now() + 850;
    const lamaHitung = 900;
    const langkah = t => {
      if (!$('skNominal')) return;
      const p = Math.min(1, Math.max(0, (t - mulai) / lamaHitung));
      const e = 1 - Math.pow(1 - p, 3);
      tampil.textContent = rp(Math.round(total * e));
      if (p < 1) requestAnimationFrame(langkah);
    };
    requestAnimationFrame(langkah);
  }

  if (navigator.vibrate) {
    try { navigator.vibrate([30, 50, 70]); } catch (e) {}
  }
  setTimeout(bunyiSukses, 650);
  timerSukses = setTimeout(tutupSukses, (durasi + 1.1) * 1000);
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

const NAMA_PENERIMA_BANTUAN = 'Bapak Riski';

function salamWaktu() {
  const jam = new Date().getHours();
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function pesanBantuan() {
  const nama = (S && S.profile && S.pengaturan && S.pengaturan.namaPC) || '';
  const baris = [salamWaktu() + ', ' + NAMA_PENERIMA_BANTUAN + '.', ''];
  baris.push(nama ? 'Saya dari ' + nama + ', pengguna aplikasi Kuitansi COS.' : 'Saya pengguna aplikasi Kuitansi COS.');
  baris.push('Mohon bantuan Bapak terkait kendala berikut:', '');
  const tab = S && S.profile ? TABS_PC.filter(t => t[0] === S.tab)[0] : null;
  if (tab) baris.push('Menu: ' + tab[1]);
  baris.push('Kendala: ', '', 'Terima kasih atas bantuannya.');
  return baris.join('\n');
}

function bukaBantuanWA(el) {
  el.href = 'https://wa.me/' + NOMOR_BANTUAN + '?text=' + encodeURIComponent(pesanBantuan());
  return true;
}
