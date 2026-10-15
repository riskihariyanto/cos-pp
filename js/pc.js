const PUK_AWAL = [];

const normNama = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const bersihNamaPUK = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/^puk\s+/i, '').trim();

function nomorTerbit(i) {
  return !!(i && i.nomorKuitansi && i.nomorKuitansi !== '-');
}

function periodeKunci(i) {
  return !!(i && i.status === 'Lunas' && nomorTerbit(i));
}

function labelMetode(m) {
  return m === 'Tunai' ? 'Cash' : m === 'Transfer' ? 'Transfer' : '';
}

function pesanAdmin() {
  return 'Kuitansi untuk PUK dan bulan ini sudah diterbitkan';
}

function cariPUK(nama) {
  const n = normNama(bersihNamaPUK(nama));
  if (!n) return '';
  return Object.keys(S.puk).filter(pid => normNama(S.puk[pid].namaPerusahaan) === n)[0] || '';
}

async function klaimPeriode(pid, key, data) {
  const res = await db.ref('iuran/' + pid + '/' + key).transaction(cur => {
    if (periodeKunci(cur)) return;
    return data;
  });
  return res.committed;
}

async function nextNomor(namaPT, bulan, tahun) {
  const res = await db.ref('counter/' + tahun).transaction(v => (v || 0) + 1);
  if (!res.committed) throw new Error('Nomor kuitansi gagal dibuat');
  const seq = String(res.snapshot.val()).padStart(3, '0');
  const slug = String(namaPT || '').replace(/[^A-Za-z0-9]+/g, '');
  return seq + '/COS/PUK-' + slug + '/' + ROMAWI[bulan - 1] + '/' + tahun;
}

function periodeDefault(tgl) {
  const now = tgl || new Date();
  const bulanIni = now.getMonth() + 1;
  if (bulanIni === 1) return { b: 12, t: now.getFullYear() - 1 };
  return { b: bulanIni - 1, t: now.getFullYear() };
}

function tanggalCatat() {
  return /^\d{4}-\d{2}-\d{2}$/.test(S.tmp.catatTgl || '') ? S.tmp.catatTgl : hariIniLokal();
}

function periodeCatat() {
  const [y, m, h] = tanggalCatat().split('-').map(Number);
  const d = periodeDefault(new Date(y, m - 1, h));
  return {
    b: S.tmp.catatBulan || d.b,
    t: S.tmp.catatTahun || d.t
  };
}

function ubahTanggalCatat() {
  S.tmp.catatTgl = $('fTanggal').value;
  S.tmp.catatBulan = undefined;
  S.tmp.catatTahun = undefined;
  render();
}

function ubahPeriodeCatat() {
  S.tmp.catatBulan = +$('fBulan').value || undefined;
  S.tmp.catatTahun = +$('fTahun').value || undefined;
  render();
}

function daftarPilihanPUK() {
  const out = [];
  const terpakai = {};
  PUK_AWAL.forEach(n => {
    const pid = cariPUK(n);
    if (pid) terpakai[pid] = true;
    out.push({ nilai: pid || 'awal:' + n, nama: pid ? S.puk[pid].namaPerusahaan : n });
  });
  sortedPUK().forEach(pid => {
    if (!terpakai[pid]) out.push({ nilai: pid, nama: S.puk[pid].namaPerusahaan });
  });
  return out;
}

function ubahPUKCatat() {
  const pil = $('fPukPilih').value;
  if (pil === '__baru') {
    S.tmp.pukBaru = true;
    S.tmp.pukNama = $('fPuk') ? bersihNamaPUK($('fPuk').value) : '';
  } else {
    S.tmp.pukBaru = false;
    const o = daftarPilihanPUK().filter(x => x.nilai === pil)[0];
    S.tmp.pukNama = o ? o.nama : '';
  }
  render();
}

function panelTerkunci(pid, key, i) {
  const arg = '\'' + pid + '\',\'' + key + '\'';
  return '<div class="row"><div class="info"><b>Kuitansi sudah terbit</b> <span class="badge b-Lunas">Lunas</span><br>' +
    '<span class="hint">' + rp(i.total) + ' · ' + esc(labelMetode(i.metode)) + ' · ' + esc(fmtTgl(i.tanggalSetor)) + '<br>' + esc(i.nomorKuitansi) + '</span></div>' +
    '<div class="act"><button class="btn sm prev" onclick="previewKuitansi(' + arg + ')">Preview Kuitansi</button></div></div>' +
    '<p class="hint">Periode ' + esc(labelPeriode(key)) + ' sudah memiliki kuitansi dan bersifat permanen. Pilih bulan atau PUK lain untuk menerbitkan kuitansi baru.</p>';
}

function lencanaBayar(lunas) {
  return lunas
    ? '<span class="lencana lencana-lunas">LUNAS</span>'
    : '<span class="lencana lencana-belum">BELUM BAYAR</span>';
}

function sudahBayarBulanIni(pid) {
  const d = periodeDefault();
  const key = periodeKey(d.t, d.b);
  return !!(pid && periodeKunci((S.iuran[pid] || {})[key]));
}

function panelStatusBayar() {
  const per = periodeDefault();
  const daftar = daftarPilihanPUK().map(o => {
    const pid = cariPUK(o.nama);
    return { nama: o.nama, lunas: sudahBayarBulanIni(pid) };
  }).sort((a, b) => (a.lunas - b.lunas) || a.nama.localeCompare(b.nama));
  if (!daftar.length) return '';
  const lunas = daftar.filter(x => x.lunas).length;
  const belum = daftar.length - lunas;
  const baris = daftar.map(x =>
    '<div class="puk-baris ' + (x.lunas ? 'lunas' : 'belum') + '"><b class="puk-nama">PUK ' + esc(x.nama) + '</b>' + lencanaBayar(x.lunas) + '</div>'
  ).join('');
  const kpi = (kelas, label, nilai, ket) => '<div class="kpi ' + kelas + '"><span class="kpi-label">' + label + '</span><strong class="kpi-nilai">' + nilai + '</strong><small class="kpi-ket">' + ket + '</small></div>';
  return '<section class="dashboard-welcome"><div><span class="eyebrow">DASHBOARD PIMPINAN PUSAT</span><h2>Ringkasan Pembayaran</h2><p>Pantau status setoran iuran setiap PUK dalam satu tampilan.</p></div><div class="periode-pill">' + esc(BULAN[per.b - 1] + ' ' + per.t) + '</div></section>' +
    '<section class="kpi-panel">' + kpi('total', 'Total PUK', daftar.length, 'Terdaftar') + kpi('paid', 'Sudah Bayar', lunas, 'PUK lunas') + kpi('unpaid', 'Belum Bayar', belum, 'Perlu ditindaklanjuti') + '</section>' +
    '<section class="puk-bagian"><div class="section-heading"><div><h3>Status Bayar</h3><p>Rincian pembayaran iuran per PUK</p></div><span class="count-pill">' + daftar.length + ' PUK</span></div><div class="puk-list">' + baris + '</div></section>';
}

function viewDasbor() {
  return panelStatusBayar() || '<section class="card"><h3>Status Bayar</h3><p class="hint">Belum ada data PUK.</p></section>';
}

function tglCetak(i) {
  return i.tanggalCetak || i.tanggalVerifikasi || i.tanggalSetor || '';
}

function daftarRiwayat() {
  return allIuran()
    .filter(i => i.status === 'Lunas' && nomorTerbit(i))
    .sort((x, y) => tglCetak(y).localeCompare(tglCetak(x)) || (y.dibuat || 0) - (x.dibuat || 0));
}

function viewRiwayatKuitansi() {
  const list = daftarRiwayat();
  const arg = i => '\'' + i.pid + '\',\'' + i.key + '\'';
  const kartu = list.map(i => {
    const p = S.puk[i.pid] || {};
    const a = arg(i);
    return '<article class="rk-item">' +
      '<div class="rk-nama">' + esc(p.namaPerusahaan || '-') + ' ' + lencanaBayar(true) + '</div>' +
      '<div class="rk-nomor">' + esc(i.nomorKuitansi) + '</div>' +
      '<div class="rk-info"><span class="rk-periode">' + esc(labelPeriode(i.key)) + ' · ' + esc(labelMetode(i.metode) || '-') + '</span>' +
      '<span class="rk-nominal">' + rp(i.total) + '</span></div>' +
      '<div class="rk-aksi">' +
      '<button type="button" onclick="previewKuitansi(' + a + ')">Pratinjau</button>' +
      '<button type="button" onclick="unduhKuitansi(' + a + ')">Unduh PDF</button>' +
      '<button type="button" onclick="unduhFotoRiwayat(' + a + ')">Unduh Foto</button></div>' +
      '<button type="button" class="rk-wa" onclick="kirimPDFWA(this,' + a + ')">' + IKON_WA + '<span>Kirim PDF ke WA</span></button>' +
      '</article>';
  }).join('');
  return '<section class="rk"><h3 class="rk-judul">Riwayat Kuitansi (' + list.length + ')</h3>' +
    (kartu || '<p class="hint">Belum ada kuitansi yang diterbitkan.</p>') + '</section>';
}

function viewCatat() {
  const hari = tanggalCatat();
  const nama = S.tmp.pukNama || '';
  const pid = cariPUK(nama);
  const { b, t } = periodeCatat();
  const key = periodeKey(t, b);
  const ada = pid ? (S.iuran[pid] || {})[key] : null;
  const opsi = daftarPilihanPUK();
  const cocok = opsi.filter(o => normNama(o.nama) === normNama(nama))[0];
  const pilih = S.tmp.pukBaru ? '__baru' : (cocok ? cocok.nilai : '');
  const optPuk = '<option value="">Pilih nama PUK</option>' +
    opsi.map(o => '<option value="' + esc(o.nilai) + '"' + (o.nilai === pilih ? ' selected' : '') + '>PUK ' + esc(o.nama) + '</option>').join('') +
    '<option value="__baru"' + (pilih === '__baru' ? ' selected' : '') + '>+ PUK baru (ketik nama sendiri)</option>';
  const optBulan = BULAN.map((n, i) => '<option value="' + (i + 1) + '"' + (i + 1 === b ? ' selected' : '') + '>' + n + '</option>').join('');
  const kepala = '<section class="card"><h3>Buat Kuitansi Iuran</h3>' +
    '<label for="fPukPilih">Nama PUK</label>' +
    '<select id="fPukPilih" onchange="ubahPUKCatat()">' + optPuk + '</select>' +
    (pilih === '__baru' ? '<label for="fPuk">Nama PUK baru</label><input id="fPuk" autocomplete="off" placeholder="Ketik nama PUK, tanpa kata PUK" value="' + esc(nama) + '" onchange="ubahPUKCatat()">' : '') +
    '<label for="fTanggal">Tanggal terima</label><input id="fTanggal" type="date" value="' + hari + '" onchange="ubahTanggalCatat()">' +
    '<label for="fBulan">Periode iuran (bulan)</label><select id="fBulan" onchange="ubahPeriodeCatat()">' + optBulan + '</select>' +
    '<label for="fTahun">Tahun</label><input id="fTahun" type="number" value="' + t + '" onchange="ubahPeriodeCatat()">' +
    '<p class="hint">Iuran yang dibayar pada bulan berjalan dihitung untuk bulan sebelumnya. Diterima ' + esc(fmtTgl(hari)) + ', periode iuran ' + esc(labelPeriode(key)) + '.</p>';

  if (pid && periodeKunci(ada)) {
    return kepala + '<p class="peringatan">' + esc(pesanAdmin()) + '</p>' + panelTerkunci(pid, key, ada) + '</section>';
  }
  return kepala +
    '<label for="fMetode">Metode</label><select id="fMetode"><option value="Tunai">Cash (Tunai)</option><option value="Transfer">Transfer</option></select>' +
    '<label for="fTotal">Total Nominal Setoran (Rp)</label><input id="fTotal" type="number" inputmode="numeric" placeholder="20000000">' +
    '<p class="hint">Kuitansi langsung terbit dan sah setelah disimpan.</p>' +
    '<button class="btn" onclick="catatSetoran()">Terbitkan Kuitansi</button></section>';
}

async function catatSetoran() {
  const pil = $('fPukPilih').value;
  const dipilih = daftarPilihanPUK().filter(x => x.nilai === pil)[0];
  const nama = pil === '__baru' ? bersihNamaPUK($('fPuk') ? $('fPuk').value : '') : (dipilih ? dipilih.nama : '');
  const metode = $('fMetode').value === 'Transfer' ? 'Transfer' : 'Tunai';
  const bulan = +$('fBulan').value;
  const tahun = +$('fTahun').value;
  const tgl = $('fTanggal').value;
  const total = angka($('fTotal').value);
  if (!nama || !bulan || !tahun || !(total > 0) || !tgl) return toast('Isi nama PUK, total nominal, dan tanggal terima');

  const key = periodeKey(tahun, bulan);
  let pid = cariPUK(nama);
  const ada = pid ? (S.iuran[pid] || {})[key] : null;
  if (periodeKunci(ada)) return toast(pesanAdmin());
  const namaTersimpan = pid ? S.puk[pid].namaPerusahaan : nama;

  const ok = await jalankan(async () => {
    if (!pid) {
      pid = db.ref('puk').push().key;
      await db.ref('puk/' + pid).set({ namaPerusahaan: nama });
    }
    const hariIni = hariIniLokal();
    const nomor = await nextNomor(namaTersimpan, bulan, tahun);
    const data = {
      periode: key,
      total: total,
      tanggalSetor: tgl,
      status: 'Lunas',
      metode: metode,
      sumber: 'PP',
      nomorKuitansi: nomor,
      dibuat: firebase.database.ServerValue.TIMESTAMP,
      diverifikasiOleh: S.profile.nama || '',
      tanggalVerifikasi: hariIni,
      tanggalCetak: hariIni
    };
    const berhasil = await klaimPeriode(pid, key, data);
    if (!berhasil) throw new Error('Kuitansi untuk PUK dan bulan ini sudah diterbitkan');
    if (ada) await db.ref('bukti/' + pid + '/' + key).remove().catch(() => {});
    return nomor;
  }, 'Kuitansi diterbitkan');
  if (ok) {
    S.tmp.pukNama = '';
    S.tmp.pukBaru = false;
    S.tmp.catatTgl = '';
    S.tmp.catatBulan = undefined;
    S.tmp.catatTahun = undefined;
    S.lastTab = '';
    render();
    animasiBerhasil({
      judul: 'Kuitansi Terbit',
      labelNominal: 'Total Setoran',
      nominal: total,
      baris: [
        ['PUK', namaTersimpan],
        ['Periode', labelPeriode(key)],
        ['Metode', labelMetode(metode)],
        ['Diterima', fmtTgl(tgl)],
        ['Nomor', ok]
      ]
    });
  }
}

function jumlahKuitansiPUK(pid) {
  const per = S.iuran[pid] || {};
  return Object.keys(per).filter(k => per[k].status === 'Lunas' && nomorTerbit(per[k])).length;
}

function viewPengaturan() {
  if (!isPC()) return '';
  const c = S.pengaturan || {};
  const img = k => S.tmp[k] || c[k] || '';
  const pv = k => '<img class="pv" id="pv_' + k + '" src="' + img(k) + '"' + (img(k) ? '' : ' hidden') + '>';
  return '<section class="card"><h3>Identitas PP & penandatangan kuitansi</h3>' +
    '<label for="sNama">Nama Pimpinan Pusat</label><input id="sNama" value="' + esc(c.namaPC) + '">' +
    '<label for="sAlamat">Alamat</label><input id="sAlamat" value="' + esc(c.alamat) + '">' +
    '<label for="sKota">Kota (untuk tanggal kuitansi)</label><input id="sKota" value="' + esc(c.kota) + '">' +
    '<label for="sBendahara">Nama bendahara (penandatangan kuitansi)</label><input id="sBendahara" value="' + esc(c.bendahara) + '">' +
    '<label for="sKetua">Nama ketua (laporan keuangan)</label><input id="sKetua" value="' + esc(c.ketua) + '">' +
    '<label for="sSekretaris">Nama sekretaris (laporan keuangan)</label><input id="sSekretaris" value="' + esc(c.sekretaris) + '">' +
    '<label for="sJabatan">Jabatan penandatangan</label><input id="sJabatan" value="' + esc(c.jabatan || 'Bendahara') + '">' +
    '<label for="fStempel">Gambar stempel (PNG transparan disarankan)</label><input id="fStempel" type="file" accept="image/*" onchange="muatGambar(this,\'stempel\')">' + pv('stempel') +
    '<label for="fTtdKetua">Gambar tanda tangan ketua</label><input id="fTtdKetua" type="file" accept="image/*" onchange="muatGambar(this,\'ttdKetua\')">' + pv('ttdKetua') +
    '<label for="fTtdSekretaris">Gambar tanda tangan sekretaris</label><input id="fTtdSekretaris" type="file" accept="image/*" onchange="muatGambar(this,\'ttdSekretaris\')">' + pv('ttdSekretaris') +
    '<label for="fTtd">Gambar tanda tangan bendahara</label><input id="fTtd" type="file" accept="image/*" onchange="muatGambar(this,\'ttd\')">' + pv('ttd') +
    '<button class="btn" onclick="simpanPengaturan()">Simpan</button>' +
    '<button class="btn alt" onclick="keluarPengaturan()">Kembali ke Aplikasi</button></section>';
}

function muatGambar(inp, key) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 400 / Math.max(im.width, im.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k);
      cv.height = Math.round(im.height * k);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      S.tmp[key] = cv.toDataURL('image/png');
      const el = $('pv_' + key);
      el.src = S.tmp[key];
      el.hidden = false;
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}

function keluarPengaturan() {
  history.replaceState(null, '', location.pathname + location.search);
  S.tab = '';
  render();
}

function simpanPengaturan() {
  if (!isPC()) return toast('Akses ditolak');
  const c = S.pengaturan || {};
  const data = {
    namaPC: $('sNama').value.trim(),
    alamat: $('sAlamat').value.trim(),
    kota: $('sKota').value.trim(),
    bendahara: $('sBendahara').value.trim(),
    ketua: $('sKetua').value.trim(),
    sekretaris: $('sSekretaris').value.trim(),
    jabatan: $('sJabatan').value.trim() || 'Bendahara',
    stempel: S.tmp.stempel || c.stempel || '',
    ttd: S.tmp.ttd || c.ttd || '',
    ttdKetua: S.tmp.ttdKetua || c.ttdKetua || '',
    ttdSekretaris: S.tmp.ttdSekretaris || c.ttdSekretaris || ''
  };
  if (!data.namaPC) return toast('Nama Pimpinan Pusat wajib diisi');
  jalankan(async () => {
    await db.ref('pengaturan').set(data);
    S.tmp = {};
  }, 'Pengaturan disimpan');
}
