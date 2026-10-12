const KUNCI_CACHE_KAS = 'cos_kas_cache';
const KUNCI_ANTRIAN_KAS = 'cos_kas_antrian';
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
  const daftar = bacaJson(KUNCI_ANTRIAN_KAS, []);
  return Array.isArray(daftar) ? daftar : [];
}

function hapusAntrian(id) {
  simpanJson(KUNCI_ANTRIAN_KAS, antrianKas().filter(x => x.id !== id));
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
  const c = bacaJson(KUNCI_CACHE_KAS, {});
  saldoServer = Number(c.saldo) || 0;
  kasList = Array.isArray(c.log) ? c.log : [];
  hitungTotal();
}

function terapkanKas(v) {
  const data = v || {};
  const arr = Object.keys(data).map(k => Object.assign({}, data[k], { id: k }));
  saldoServer = arr.reduce((t, x) => t + selisihKas(x), 0);
  kasIds = {};
  arr.forEach(x => { kasIds[x.id] = 1; });
  kasList = arr.sort(urutKas);
  simpanJson(KUNCI_CACHE_KAS, { saldo: saldoServer, log: kasList.slice(0, BATAS_BARIS_KAS) });
  const sisa = antrianKas().filter(x => !kasIds[x.id]);
  if (sisa.length !== antrianKas().length) simpanJson(KUNCI_ANTRIAN_KAS, sisa);
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
    rantai = rantai.then(() => db.ref('kas/' + x.id).set(muatanKas(x)).then(() => {
      terkirim++;
      hapusAntrian(x.id);
    }).catch(e => {
      if (/PERMISSION_DENIED/.test((e && e.message) || '')) ditolak++;
    }));
  });
  return rantai.then(() => {
    sedangSinkron = false;
    hitungTotal();
    render();
    if (ditolak) toast('Belum bisa disimpan: aturan database belum mengizinkan kas. Data tetap aman di HP.');
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
    id: db.ref('kas').push().key,
    tgl,
    jenis,
    nominal,
    ket,
    oleh: (S.profile && S.profile.nama) || S.pengaturan.namaPC || 'Admin PP',
    dibuat: Date.now()
  };
  simpanJson(KUNCI_ANTRIAN_KAS, antrianKas().concat([item]));
  draftKas = { jenis, tgl: '', nominal: '', ket: '' };
  hitungTotal();
  render();
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

function kartuSaldo() {
  const menunggu = antrianBelumMasuk().length;
  return '<section class="kas-saldo' + (totalSaldo < 0 ? ' minus' : '') + '">' +
    '<span class="kas-saldo-label">Sisa Saldo Kas Digital PP</span>' +
    '<b class="kas-saldo-nilai">' + esc(rp(totalSaldo)) + '</b>' +
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

function kartuKas(x) {
  const masuk = x.jenis !== 'keluar';
  return '<article class="rk-item">' +
    '<div class="rk-nama">' + esc(x.ket) + (x.menunggu ? ' <span class="kas-tunggu">menunggu sinkron</span>' : '') + '</div>' +
    '<div class="rk-info"><span class="rk-periode">' + (masuk ? 'Kas Masuk' : 'Kas Keluar') + ' · ' + esc(fmtTgl(x.tgl)) + '</span>' +
    '<span class="rk-nominal ' + (masuk ? 'kas-masuk' : 'kas-keluar') + '">' + (masuk ? '' : '-') + esc(rp(x.nominal)) + '</span></div>' +
    '</article>';
}

function viewKasRiwayat() {
  const baris = daftarKasGabungan();
  if (!baris.length) {
    return '<section class="card"><h2>Riwayat Kas Digital</h2><p class="kas-kosong">Belum ada transaksi kas.</p></section>';
  }
  const masuk = baris.filter(x => x.jenis !== 'keluar').reduce((t, x) => t + (Number(x.nominal) || 0), 0);
  const keluar = baris.filter(x => x.jenis === 'keluar').reduce((t, x) => t + (Number(x.nominal) || 0), 0);
  return '<section class="card"><h2>Riwayat Kas Digital</h2>' +
    '<div class="kas-ringkas"><div><span>Total Masuk</span><b class="kas-masuk">' + esc(rp(masuk)) + '</b></div>' +
    '<div><span>Total Keluar</span><b class="kas-keluar">' + esc(rp(keluar)) + '</b></div>' +
    '<div><span>Saldo</span><b>' + esc(rp(masuk - keluar)) + '</b></div></div></section>' +
    baris.slice(0, BATAS_KARTU_KAS).map(kartuKas).join('') +
    (baris.length > BATAS_KARTU_KAS ? '<p class="kas-kosong">Menampilkan ' + BATAS_KARTU_KAS + ' transaksi terbaru.</p>' : '');
}

const viewDasborAsli = VIEWS.dasbor;
const viewCatatAsli = VIEWS.catat;
const viewRiwayatAsli = VIEWS.kuitansi;

VIEWS.dasbor = () => kartuSaldo() + viewDasborAsli();

VIEWS.catat = () => sakelarSub(subCatat, 'pilihSubCatat', [['kuitansi', 'Kuitansi Iuran'], ['kas', 'Kas Masuk/Keluar']]) +
  (subCatat === 'kas' ? viewKasForm() : viewCatatAsli());

VIEWS.kuitansi = () => sakelarSub(subRiwayat, 'pilihSubRiwayat', [['kuitansi', 'Kuitansi Iuran'], ['kas', 'Kas Digital']]) +
  (subRiwayat === 'kas' ? viewKasRiwayat() : viewRiwayatAsli());

INPUT_RUPIAH.push('kNominal');

const attachAsli = attach;

attach = function () {
  attachAsli();
  listen('kas', v => { terapkanKas(v); });
  sinkronKas();
};

const resetDataAsli = resetData;

resetData = function () {
  resetDataAsli();
  hentikanSuara();
  kasIds = {};
  muatCacheKas();
};

window.addEventListener('online', sinkronKas);

muatCacheKas();