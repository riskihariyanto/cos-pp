const KUNCI_DASAR_CACHE = 'cos_kas_cache';
const KUNCI_DASAR_ANTRIAN = 'cos_kas_antrian';
const BATAS_BARIS_KAS = 200;
const BATAS_KARTU_KAS = 100;

let totalSaldo = 0;
let saldoServer = 0;
let kasList = [];
let kasIds = {};
let subCatat = 'kuitansi';
let subRiwayat = 'kuitansi';
let draftKas = { jenis: 'masuk', tgl: '', nominal: '', ket: '' };
let sedangSinkron = false;
let pengenalSuara = null;

const IKON_MIK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/></svg>';

function sufiksKas() {
  return isPUK() ? ':' + pidSaya() : '';
}

function kunciCacheKas() {
  return KUNCI_DASAR_CACHE + sufiksKas();
}

function kunciAntrianKas() {
  return KUNCI_DASAR_ANTRIAN + sufiksKas();
}

function pathKas() {
  return isPUK() ? 'kasPuk/' + pidSaya() : 'kas';
}

function bacaJson(kunci, cadangan) {
  try {
    const mentah = localStorage.getItem(kunci);
    return mentah ? JSON.parse(mentah) : cadangan;
  } catch (e) {
    return cadangan;
  }
}

function simpanJson(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch (e) {}
}

function antrianKas() {
  const daftar = bacaJson(kunciAntrianKas(), []);
  return Array.isArray(daftar) ? daftar : [];
}

function hapusAntrian(id) {
  simpanJson(kunciAntrianKas(), antrianKas().filter(x => x.id !== id));
}

function selisihKas(x) {
  const n = Number(x.nominal) || 0;
  return x.jenis === 'keluar' ? -n : n;
}

function urutKas(a, b) {
  return String(b.tgl || '').localeCompare(String(a.tgl || '')) || (b.dibuat || 0) - (a.dibuat || 0);
}

function antrianBelumMasuk() {
  return antrianKas().filter(x => !kasIds[x.id]);
}

function hitungTotal() {
  totalSaldo = antrianBelumMasuk().reduce((t, x) => t + selisihKas(x), saldoServer);
  return totalSaldo;
}

function muatCacheKas() {
  const c = bacaJson(kunciCacheKas(), {});
  saldoServer = Number(c.saldo) || 0;
  kasList = Array.isArray(c.log) ? c.log : [];
  hitungTotal();
}

function hapusCacheKas() {
  try {
    localStorage.removeItem(kunciCacheKas());
  } catch (e) {}
  saldoServer = 0;
  kasList = [];
  kasIds = {};
  hitungTotal();
}

function terapkanKas(v) {
  const data = v || {};
  const arr = Object.keys(data).map(k => Object.assign({}, data[k], { id: k }));
  saldoServer = arr.reduce((t, x) => t + selisihKas(x), 0);
  kasIds = {};
  arr.forEach(x => { kasIds[x.id] = 1; });
  kasList = arr.sort(urutKas);
  simpanJson(kunciCacheKas(), { saldo: saldoServer, log: kasList.slice(0, BATAS_BARIS_KAS) });
  const sisa = antrianKas().filter(x => !kasIds[x.id]);
  if (sisa.length !== antrianKas().length) simpanJson(kunciAntrianKas(), sisa);
  hitungTotal();
}

function daftarKasGabungan() {
  const menunggu = antrianBelumMasuk().map(x => Object.assign({}, x, { menunggu: true }));
  return menunggu.concat(kasList).sort(urutKas);
}

function hariIniLokal() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function muatanKas(x) {
  return { tgl: x.tgl, jenis: x.jenis, nominal: x.nominal, ket: x.ket, oleh: x.oleh, dibuat: x.dibuat };
}

function sinkronKas() {
  if (sedangSinkron || !navigator.onLine || typeof db === 'undefined' || !S.profile) return Promise.resolve();
  const daftar = antrianKas();
  if (!daftar.length) return Promise.resolve();
  sedangSinkron = true;
  let terkirim = 0;
  let ditolak = 0;
  let rantai = Promise.resolve();
  daftar.forEach(x => {
    rantai = rantai.then(() => db.ref(pathKas() + '/' + x.id).set(muatanKas(x)).then(() => {
      terkirim++;
      hapusAntrian(x.id);
    }).catch(e => {
      if (/PERMISSION_DENIED/.test((e && e.message) || '')) {
        ditolak++;
        hapusAntrian(x.id);
      }
    }));
  });
  return rantai.then(() => {
    sedangSinkron = false;
    hitungTotal();
    render();
    if (ditolak) toast('Transaksi kas ditolak aturan database dan dihapus dari antrean HP.');
    else if (terkirim) toast(terkirim === 1 ? 'Transaksi kas tersimpan' : terkirim + ' transaksi kas tersinkron');
    if (terkirim && antrianKas().length) return sinkronKas();
  });
}

function simpanDraftKas() {
  const n = $('kNominal');
  const k = $('kKet');
  const t = $('kTgl');
  if (t) draftKas.tgl = t.value;
  if (n) draftKas.nominal = n.value;
  if (k) draftKas.ket = k.value;
}

function hentikanSuara() {
  if (pengenalSuara) {
    try { pengenalSuara.abort(); } catch (e) {}
    pengenalSuara = null;
  }
}

function pilihSubCatat(k) {
  simpanDraftKas();
  hentikanSuara();
  subCatat = k;
  render();
}

function pilihJenisKas(j) {
  simpanDraftKas();
  hentikanSuara();
  draftKas.jenis = j === 'keluar' ? 'keluar' : 'masuk';
  render();
}

function pilihSubRiwayat(k) {
  hentikanSuara();
  subRiwayat = k;
  render();
}

const GAYA_BERHASIL = `
#ovBerhasil{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,20,40,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:bhFade .25s ease-out}
#ovBerhasil.bh-keluar{opacity:0;transition:opacity .28s ease}
#ovBerhasil .bh-kartu{position:relative;width:100%;max-width:360px;overflow:hidden;border-radius:24px;background:#fff;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.38);animation:bhKartu .55s cubic-bezier(.18,1.15,.4,1)}
#ovBerhasil .bh-kepala{position:relative;padding:34px 20px 24px;background:linear-gradient(160deg,#0a63b8 0%,#003f7d 100%);border-bottom:4px solid var(--gold,#fdb913);overflow:hidden}
#ovBerhasil .bh-lencana{position:relative;width:96px;height:96px;margin:0 auto 14px}
#ovBerhasil .bh-cincin{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.55);opacity:0;animation:bhCincin 1.4s ease-out .35s 2}
#ovBerhasil .bh-cincin.dua{animation-delay:.75s}
#ovBerhasil .bh-ikon{position:relative;width:96px;height:96px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.3))}
#ovBerhasil .bh-bulat{transform-origin:50% 50%;animation:bhPop .5s cubic-bezier(.2,1.4,.4,1) .1s both}
#ovBerhasil .bh-centang{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:bhGaris .4s ease-out .5s forwards}
#ovBerhasil .bh-judul{margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:.2px;animation:bhNaik .45s ease-out .55s both}
#ovBerhasil .bh-serpih{position:absolute;left:50%;top:78px;width:8px;height:8px;opacity:0;animation:bhSerpih 1.15s cubic-bezier(.1,.7,.3,1) forwards}
#ovBerhasil .bh-badan{padding:20px 20px 22px}
#ovBerhasil .bh-label{display:block;font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#3d3d3d;animation:bhNaik .45s ease-out .7s both}
#ovBerhasil .bh-nominal{display:block;margin:2px 0 14px;font-size:36px;font-weight:800;line-height:1.15;color:var(--pri,#0055a5);font-variant-numeric:tabular-nums;animation:bhNaik .45s ease-out .75s both}
#ovBerhasil .bh-baris{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:10px 0;border-top:1px dashed #c5d0de;text-align:left;font-size:15px;animation:bhNaik .45s ease-out both}
#ovBerhasil .bh-baris span{flex:0 0 auto;color:#3d3d3d}
#ovBerhasil .bh-baris b{flex:1 1 auto;text-align:right;color:#1a1a1a;word-break:break-word}
#ovBerhasil .bh-tutup{width:100%;min-height:52px;margin-top:14px;border:0;border-radius:12px;background:var(--pri,#0055a5);color:#fff;font:inherit;font-size:18px;font-weight:700;cursor:pointer;transition:opacity .2s ease}
#ovBerhasil .bh-tutup:disabled{opacity:.45;cursor:default}
#ovBerhasil .bh-waktu{position:absolute;left:0;right:0;bottom:0;height:4px;background:var(--gold,#fdb913);transform-origin:left center;animation:bhWaktu 3.8s linear forwards}
@keyframes bhFade{from{opacity:0}to{opacity:1}}
@keyframes bhKartu{from{opacity:0;transform:translateY(40px) scale(.9)}to{opacity:1;transform:none}}
@keyframes bhPop{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes bhGaris{to{stroke-dashoffset:0}}
@keyframes bhCincin{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(2.1)}}
@keyframes bhNaik{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes bhSerpih{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r))}}
@keyframes bhWaktu{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@media (prefers-reduced-motion:reduce){
  #ovBerhasil .bh-serpih,#ovBerhasil .bh-cincin{display:none}
  #ovBerhasil,#ovBerhasil *{animation-duration:.01s!important;animation-delay:0s!important}
}
`;

function pasangGayaBerhasil() {
  if ($('gayaBerhasil')) return;
  const el = document.createElement('style');
  el.id = 'gayaBerhasil';
  el.textContent = GAYA_BERHASIL;
  document.head.appendChild(el);
}

function serpihBerhasil() {
  const warna = ['#fdb913', '#ffffff', '#4ade80', '#7fb4ee', '#e31e24'];
  let out = '';
  for (let i = 0; i < 18; i++) {
    const sudut = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
    const jarak = 90 + Math.random() * 70;
    const ukuran = 6 + Math.random() * 5;
    out += '<i class="bh-serpih" style="--dx:' + Math.round(Math.cos(sudut) * jarak) + 'px;--dy:' + Math.round(Math.sin(sudut) * jarak - 20) +
      'px;--r:' + Math.round(Math.random() * 540 - 270) + 'deg;width:' + ukuran.toFixed(1) + 'px;height:' + (ukuran * (Math.random() > 0.5 ? 1 : 0.5)).toFixed(1) +
      'px;border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';background:' + warna[i % warna.length] +
      ';animation-delay:' + (0.4 + Math.random() * 0.15).toFixed(2) + 's"></i>';
  }
  return out;
}

function animasiBerhasil(o) {
  const opsi = o || {};
  pasangGayaBerhasil();
  const lama = $('ovBerhasil');
  if (lama && lama.tutupBerhasil) lama.tutupBerhasil(true);
  const kurang = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const baris = (opsi.baris || []).filter(x => x && x[1] != null && x[1] !== '');
  const punyaNominal = opsi.nominal != null;
  const ov = document.createElement('div');
  ov.id = 'ovBerhasil';
  ov.setAttribute('role', 'alertdialog');
  ov.setAttribute('aria-live', 'assertive');
  ov.setAttribute('aria-label', opsi.judul || 'Berhasil');
  ov.innerHTML = '<div class="bh-kartu">' +
    '<div class="bh-kepala">' + (kurang ? '' : serpihBerhasil()) +
    '<div class="bh-lencana"><span class="bh-cincin"></span><span class="bh-cincin dua"></span>' +
    '<svg class="bh-ikon" viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="bhGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/></linearGradient></defs>' +
    '<circle class="bh-bulat" cx="48" cy="48" r="44" fill="url(#bhGrad)"/>' +
    '<path class="bh-centang" d="M28 50l14 14 27-30" pathLength="1"/></svg></div>' +
    '<h2 class="bh-judul">' + esc(opsi.judul || 'Berhasil') + '</h2></div>' +
    '<div class="bh-badan">' +
    (punyaNominal ? '<span class="bh-label">' + esc(opsi.labelNominal || 'Nominal') + '</span><b class="bh-nominal" id="bhNominal">' + esc(kurang ? rp(opsi.nominal) : rp(0)) + '</b>' : '') +
    baris.map((x, i) => '<div class="bh-baris" style="animation-delay:' + (0.85 + i * 0.08).toFixed(2) + 's"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>').join('') +
    '<button type="button" class="bh-tutup" disabled>Selesai</button></div>' +
    '<div class="bh-waktu"></div></div>';
  document.body.appendChild(ov);

  const tombol = ov.querySelector('.bh-tutup');
  let siap = false;
  let selesai = false;
  let timerAuto = 0;
  let rafId = 0;

  function tutup(langsung) {
    if (selesai) return;
    selesai = true;
    clearTimeout(timerAuto);
    cancelAnimationFrame(rafId);
    if (langsung) {
      ov.remove();
      return;
    }
    ov.classList.add('bh-keluar');
    setTimeout(() => ov.remove(), 300);
  }

  ov.tutupBerhasil = tutup;
  tombol.addEventListener('click', () => { if (siap) tutup(); });
  ov.addEventListener('click', e => { if (siap && e.target === ov) tutup(); });
  setTimeout(() => {
    siap = true;
    tombol.disabled = false;
  }, 900);
  timerAuto = setTimeout(() => tutup(), 3800);

  if (punyaNominal && !kurang) {
    const target = Number(opsi.nominal) || 0;
    const mulai = performance.now() + 450;
    const langkah = t => {
      const el = $('bhNominal');
      if (!el) return;
      const p = Math.min(1, Math.max(0, (t - mulai) / 750));
      el.textContent = rp(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) rafId = requestAnimationFrame(langkah);
    };
    rafId = requestAnimationFrame(langkah);
  }
  try {
    if (navigator.vibrate) navigator.vibrate([35, 40, 35]);
  } catch (e) {}
}

function simpanKas() {
  simpanDraftKas();
  const jenis = draftKas.jenis === 'keluar' ? 'keluar' : 'masuk';
  const nominal = angka(($('kNominal') || {}).value);
  const ket = (($('kKet') || {}).value || '').trim();
  if (!nominal) {
    toast('Nominal belum diisi');
    if ($('kNominal')) $('kNominal').focus();
    return;
  }
  if (!ket) {
    toast('Keterangan belum diisi');
    if ($('kKet')) $('kKet').focus();
    return;
  }
  const hariIni = hariIniLokal();
  const tgl = /^\d{4}-\d{2}-\d{2}$/.test(draftKas.tgl) ? draftKas.tgl : hariIni;
  if (tgl > hariIni) {
    toast('Tanggal tidak boleh melewati hari ini');
    if ($('kTgl')) $('kTgl').focus();
    return;
  }
  hentikanSuara();
  const item = {
    id: db.ref(pathKas()).push().key,
    tgl,
    jenis,
    nominal,
    ket,
    oleh: (S.profile && S.profile.nama) || (isPUK() ? namaPUKSaya() : S.pengaturan.namaPC) || 'Admin PP',
    dibuat: Date.now()
  };
  simpanJson(kunciAntrianKas(), antrianKas().concat([item]));
  draftKas = { jenis, tgl: '', nominal: '', ket: '' };
  hitungTotal();
  S.lastTab = '';
  render();
  animasiBerhasil({
    judul: 'Transaksi Tersimpan',
    labelNominal: jenis === 'keluar' ? 'Kas Keluar' : 'Kas Masuk',
    nominal,
    baris: [
      ['Keterangan', ket],
      ['Tanggal', fmtTgl(tgl)],
      ['Status', navigator.onLine ? 'Tercatat di kas digital' : 'Disimpan di HP, sinkron otomatis']
    ]
  });
  if (!navigator.onLine) {
    toast('Offline · transaksi disimpan di HP dan disinkron otomatis');
    return;
  }
  sinkronKas();
}

function setTombolMik(aktif) {
  const b = $('kMik');
  if (!b) return;
  b.classList.toggle('rekam', aktif);
  b.setAttribute('aria-pressed', aktif ? 'true' : 'false');
}

function pesanSuara(kode) {
  if (kode === 'not-allowed' || kode === 'service-not-allowed') return 'Izin mikrofon ditolak. Aktifkan izin mikrofon untuk Chrome.';
  if (kode === 'no-speech') return 'Suara tidak terdengar, coba lagi.';
  if (kode === 'audio-capture') return 'Mikrofon tidak ditemukan.';
  if (kode === 'network') return 'Pengenalan suara butuh koneksi internet.';
  return 'Pengenalan suara gagal, coba lagi.';
}

function toggleSuara() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Input suara tidak didukung di browser ini. Gunakan Google Chrome.');
    return;
  }
  if (pengenalSuara) {
    pengenalSuara.stop();
    return;
  }
  const kolom = $('kKet');
  if (!kolom) return;
  const dasar = kolom.value.trim();
  const p = new SR();
  p.lang = 'id-ID';
  p.interimResults = true;
  p.continuous = false;
  p.maxAlternatives = 1;
  p.onstart = () => setTombolMik(true);
  p.onresult = e => {
    let teks = '';
    for (let i = 0; i < e.results.length; i++) teks += e.results[i][0].transcript;
    teks = teks.trim();
    if (!dasar) teks = teks.charAt(0).toUpperCase() + teks.slice(1);
    const el = $('kKet');
    if (el) {
      el.value = dasar ? dasar + ' ' + teks : teks;
      draftKas.ket = el.value;
    }
  };
  p.onerror = e => toast(pesanSuara(e && e.error));
  p.onend = () => {
    pengenalSuara = null;
    setTombolMik(false);
  };
  pengenalSuara = p;
  try {
    p.start();
  } catch (e) {
    pengenalSuara = null;
    toast('Mikrofon tidak bisa dimulai.');
  }
}

function sakelarSub(aktif, fungsi, pilihan) {
  return '<div class="sub-tab" role="tablist">' + pilihan.map(p =>
    '<button type="button" role="tab" class="' + (p[0] === aktif ? 'on' : '') + '" aria-selected="' + (p[0] === aktif) + '" onclick="' + fungsi + '(\'' + p[0] + '\')">' + esc(p[1]) + '</button>'
  ).join('') + '</div>';
}

function saldoGabungan() {
  return entriLaporan().reduce((t, x) => t + x.masuk - x.keluar, 0);
}

function kartuSaldo() {
  const menunggu = antrianBelumMasuk().length;
  const saldo = saldoGabungan();
  return '<section class="kas-saldo' + (saldo < 0 ? ' minus' : '') + '">' +
    '<span class="kas-saldo-label">Sisa Saldo Kas Digital ' + (isPUK() ? 'PUK' : 'PP') + '</span>' +
    '<b class="kas-saldo-nilai">' + esc(rp(saldo)) + '</b>' +
    (menunggu ? '<small class="kas-saldo-info">' + menunggu + ' transaksi menunggu sinkron</small>' : '') +
    '</section>';
}

function viewKasForm() {
  return '<section class="card kas-form"><h2>Catat Kas Digital</h2>' +
    '<label>Jenis Transaksi</label>' +
    '<div class="kas-jenis" role="group" aria-label="Jenis Transaksi">' +
    '<button type="button" class="keluar' + (draftKas.jenis === 'keluar' ? ' on' : '') + '" aria-pressed="' + (draftKas.jenis === 'keluar') + '" onclick="pilihJenisKas(\'keluar\')">Kas Keluar</button>' +
    '<button type="button" class="masuk' + (draftKas.jenis !== 'keluar' ? ' on' : '') + '" aria-pressed="' + (draftKas.jenis !== 'keluar') + '" onclick="pilihJenisKas(\'masuk\')">Kas Masuk</button></div>' +
    '<label for="kTgl">Tanggal transaksi</label>' +
    '<input id="kTgl" type="date" max="' + hariIniLokal() + '" value="' + esc(draftKas.tgl || hariIniLokal()) + '">' +
    '<label for="kNominal">Nominal (Rp)</label>' +
    '<input id="kNominal" placeholder="0" value="' + esc(draftKas.nominal) + '">' +
    '<label for="kKet">Keterangan</label>' +
    '<div class="kas-ket"><input id="kKet" type="text" maxlength="120" autocomplete="off" placeholder="Contoh: Konsumsi Rapat" value="' + esc(draftKas.ket) + '">' +
    '<button type="button" id="kMik" class="kas-mik" onclick="toggleSuara()" aria-label="Isi keterangan dengan suara" aria-pressed="false">' + IKON_MIK + '</button></div>' +
    '<button class="btn" onclick="simpanKas()">Simpan Transaksi</button></section>';
}

const GAYA_RIWAYAT_KAS = `
.sub-tab button{padding:8px 4px;font-size:13.5px;white-space:nowrap}
.kas-judul{margin:0 0 2px}
.kas-sub{margin:0 0 6px;font-size:14px}
.riw-daftar{margin:0;padding:0;list-style:none}
.riw-baris{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #e8edf3}
.riw-baris:last-child{border-bottom:0}
.riw-ikon{display:flex;align-items:center;justify-content:center;flex:none;width:48px;height:48px;background:#f3f6fb;border-radius:14px}
.riw-ikon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.riw-isi{flex:1;min-width:0}
.riw-tgl{display:block;font-size:13px;font-weight:500;line-height:1.3;color:#94a3b8}
.riw-ket{display:block;margin-top:2px;font-size:16.5px;font-weight:600;line-height:1.3;color:#142b45;overflow-wrap:anywhere}
.riw-isi .kas-tunggu{margin-top:4px}
.riw-nilai{flex:none;max-width:42%;font-size:16px;font-weight:700;line-height:1.3;text-align:right;font-variant-numeric:tabular-nums}
.kas-catatan{margin:14px 0 0;font-size:13px;color:#64748b;text-align:center}
`;

const IKON_PANAH_MASUK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
const IKON_PANAH_KELUAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';

function pasangGayaRiwayatKas() {
  if ($('gayaRiwayatKas')) return;
  const el = document.createElement('style');
  el.id = 'gayaRiwayatKas';
  el.textContent = GAYA_RIWAYAT_KAS;
  document.head.appendChild(el);
}

function kartuKas(x) {
  const masuk = x.jenis !== 'keluar';
  const warna = masuk ? 'kas-masuk' : 'kas-keluar';
  return '<li class="riw-baris">' +
    '<span class="riw-ikon ' + warna + '" role="img" aria-label="' + (masuk ? 'Kas masuk' : 'Kas keluar') + '">' + (masuk ? IKON_PANAH_MASUK : IKON_PANAH_KELUAR) + '</span>' +
    '<div class="riw-isi"><span class="riw-tgl">' + esc(fmtTgl(x.tgl)) + '</span>' +
    '<span class="riw-ket">' + esc(x.ket) + '</span>' +
    (x.menunggu ? '<span class="kas-tunggu">menunggu sinkron</span>' : '') + '</div>' +
    '<div class="riw-nilai ' + warna + '">' + esc(rp(x.nominal)) + '</div></li>';
}

function viewKasRiwayat() {
  const baris = daftarKasGabungan();
  pasangGayaRiwayatKas();
  if (!baris.length) {
    return '<section class="card"><h2 class="kas-judul">Riwayat Kas Digital</h2><p class="kas-kosong">Belum ada transaksi kas.</p></section>';
  }
  return '<section class="card"><h2 class="kas-judul">Riwayat Kas Digital</h2>' +
    '<p class="hint kas-sub">Kas masuk dan keluar, terbaru di atas.</p>' +
    '<ul class="riw-daftar">' + baris.slice(0, BATAS_KARTU_KAS).map(kartuKas).join('') + '</ul>' +
    (baris.length > BATAS_KARTU_KAS ? '<p class="kas-catatan">Menampilkan ' + BATAS_KARTU_KAS + ' transaksi terbaru.</p>' : '') + '</section>';
}

const viewDasborAsli = VIEWS.dasbor;
const viewCatatAsli = VIEWS.catat;
const viewRiwayatAsli = VIEWS.kuitansi;
const viewBerandaAsli = VIEWS.beranda;
const viewLaporPukAsli = VIEWS.lapor;

VIEWS.dasbor = () => kartuSaldo() + viewDasborAsli();

VIEWS.catat = () => sakelarSub(subCatat, 'pilihSubCatat', [['kuitansi', 'Kuitansi Iuran'], ['kas', 'Kas Masuk/Keluar']]) +
  (subCatat === 'kas' ? viewKasForm() : viewCatatAsli());

function isiSubRiwayat() {
  if (subRiwayat === 'kas') return viewKasRiwayat();
  if (subRiwayat === 'laporan') return '';
  return viewRiwayatAsli();
}

VIEWS.kuitansi = () => sakelarSub(subRiwayat, 'pilihSubRiwayat', [['kuitansi', 'Kuitansi Iuran'], ['kas', 'Riwayat Kas'], ['laporan', 'Laporan']]) +
  isiSubRiwayat();

VIEWS.beranda = () => kartuSaldo() + viewBerandaAsli();

VIEWS.lapor = () => sakelarSub(subCatat, 'pilihSubCatat', [['kuitansi', 'Lapor Iuran'], ['kas', 'Kas Masuk/Keluar']]) +
  (subCatat === 'kas' ? viewKasForm() : viewLaporPukAsli());

VIEWS.kas = () => viewLaporan() + viewKasRiwayat();

function viewPengaturanPUK() {
  if (!isPUK()) return '';
  const c = S.pengaturanPuk || {};
  const img = k => S.tmp[k] || c[k] || '';
  const pv = k => '<img class="pv" id="pv_' + k + '" src="' + img(k) + '"' + (img(k) ? '' : ' hidden') + '>';
  return '<section class="card"><h3>Identitas PUK & penandatangan laporan</h3>' +
    '<p class="hint">Data ini dipakai pada kop dan tanda tangan laporan keuangan PUK.</p>' +
    '<label>Nama PUK</label><input value="PUK ' + esc(namaPUKSaya()) + '" readonly>' +
    '<label for="sAlamat">Alamat</label><input id="sAlamat" value="' + esc(c.alamat) + '">' +
    '<label for="sKota">Kota (untuk tanggal laporan)</label><input id="sKota" value="' + esc(c.kota) + '">' +
    '<label for="sKetua">Nama ketua</label><input id="sKetua" value="' + esc(c.ketua) + '">' +
    '<label for="sSekretaris">Nama sekretaris</label><input id="sSekretaris" value="' + esc(c.sekretaris) + '">' +
    '<label for="sBendahara">Nama bendahara</label><input id="sBendahara" value="' + esc(c.bendahara) + '">' +
    '<label for="fStempel">Gambar stempel (PNG transparan disarankan)</label><input id="fStempel" type="file" accept="image/*" onchange="muatGambar(this,\'stempel\')">' + pv('stempel') +
    '<label for="fTtdKetua">Gambar tanda tangan ketua</label><input id="fTtdKetua" type="file" accept="image/*" onchange="muatGambar(this,\'ttdKetua\')">' + pv('ttdKetua') +
    '<label for="fTtdSekretaris">Gambar tanda tangan sekretaris</label><input id="fTtdSekretaris" type="file" accept="image/*" onchange="muatGambar(this,\'ttdSekretaris\')">' + pv('ttdSekretaris') +
    '<label for="fTtd">Gambar tanda tangan bendahara</label><input id="fTtd" type="file" accept="image/*" onchange="muatGambar(this,\'ttd\')">' + pv('ttd') +
    '<button class="btn" onclick="simpanPengaturanPUK()">Simpan</button></section>' + kartuGantiSandi();
}

function simpanPengaturanPUK() {
  if (!isPUK()) return toast('Akses ditolak');
  const c = S.pengaturanPuk || {};
  const data = {
    alamat: $('sAlamat').value.trim().slice(0, 200),
    kota: $('sKota').value.trim().slice(0, 60),
    ketua: $('sKetua').value.trim().slice(0, 100),
    sekretaris: $('sSekretaris').value.trim().slice(0, 100),
    bendahara: $('sBendahara').value.trim().slice(0, 100),
    jabatan: 'Bendahara',
    stempel: S.tmp.stempel || c.stempel || '',
    ttd: S.tmp.ttd || c.ttd || '',
    ttdKetua: S.tmp.ttdKetua || c.ttdKetua || '',
    ttdSekretaris: S.tmp.ttdSekretaris || c.ttdSekretaris || ''
  };
  jalankan(async () => {
    await db.ref('pengaturanPuk/' + pidSaya()).set(data);
    ['stempel', 'ttd', 'ttdKetua', 'ttdSekretaris'].forEach(k => { delete S.tmp[k]; });
    return true;
  }, 'Pengaturan disimpan');
}

VIEWS.setelan = viewPengaturanPUK;

IKON_NAV.kas = '<rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M16 15h3"/><path d="M5 6l11-3 1.5 3"/>';
IKON_NAV.setelan = '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>';

TABS_PUK.length = 0;
TABS_PUK.push(
  ['beranda', 'Beranda', 'Beranda'],
  ['kuitansiku', 'Kuitansi Saya', 'Kuitansi'],
  ['lapor', 'Lapor & Catat Kas', 'Catat'],
  ['kas', 'Laporan Kas', 'Kas'],
  ['setelan', 'Pengaturan', 'Setelan']
);

INPUT_RUPIAH.push('kNominal');

const attachAsli = attach;

attach = function () {
  attachAsli();
  if (!isPC() && !isPUK()) {
    hapusCacheKas();
    return;
  }
  if (isPUK()) {
    muatCacheKas();
    listen('pengaturanPuk/' + pidSaya(), v => { S.pengaturanPuk = v || {}; });
  }
  const ref = db.ref(pathKas());
  ref.on('value', snap => {
    terapkanKas(snap.val());
    render();
  }, e => {
    hapusCacheKas();
    render();
    toast('Gagal memuat data: ' + pesan(e));
  });
  S.refs.push(ref);
  sinkronKas();
};

const resetDataAsli = resetData;

resetData = function () {
  resetDataAsli();
  S.pengaturanPuk = {};
  hentikanSuara();
  kasIds = {};
  muatCacheKas();
};

window.addEventListener('online', sinkronKas);

S.pengaturanPuk = S.pengaturanPuk || {};

muatCacheKas();

pasangGayaRiwayatKas();