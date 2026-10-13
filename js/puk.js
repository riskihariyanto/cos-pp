const STATUS_LAPORAN = {
  Menunggu: ['b-Pending', 'Menunggu verifikasi'],
  Diterima: ['b-Lunas', 'Diterima'],
  Ditolak: ['b-Ditolak', 'Ditolak']
};

function lencanaLaporan(st) {
  const x = STATUS_LAPORAN[st] || ['b-Belum', st || '-'];
  return '<span class="badge ' + x[0] + '">' + esc(x[1]) + '</span>';
}

function pidSaya() {
  return (S.profile && S.profile.pukId) || '';
}

function namaPUKSaya() {
  const p = S.puk[pidSaya()] || {};
  return p.namaPerusahaan || (S.profile && S.profile.nama) || '';
}

function daftarLaporanSaya() {
  const per = S.laporan[pidSaya()] || {};
  return Object.keys(per)
    .map(k => Object.assign({}, per[k], { key: k }))
    .sort((x, y) => (y.dibuat || 0) - (x.dibuat || 0) || y.key.localeCompare(x.key));
}

function daftarKuitansiSaya() {
  const pid = pidSaya();
  const per = S.iuran[pid] || {};
  return Object.keys(per)
    .filter(k => per[k].status === 'Lunas' && nomorTerbit(per[k]))
    .sort()
    .reverse()
    .map(k => Object.assign({}, per[k], { pid, key: k }));
}

function kartuLaporan(l) {
  const pid = pidSaya();
  const arg = '\'' + pid + '\',\'' + l.key + '\'';
  let ekor = '';
  if (l.status === 'Ditolak') {
    ekor = '<p class="peringatan">Alasan penolakan: ' + esc(l.alasan || '-') + '</p>' +
      '<div class="rk-aksi" style="grid-template-columns:1fr"><button type="button" onclick="siapkanLaporanUlang(\'' + l.key + '\')">Kirim Ulang Laporan</button></div>';
  } else if (l.status === 'Diterima' && (S.iuran[pid] || {})[l.key]) {
    ekor = '<div class="rk-aksi" style="grid-template-columns:1fr"><button type="button" onclick="previewKuitansi(' + arg + ')">Lihat Kuitansi</button></div>';
  }
  return '<article class="rk-item">' +
    '<div class="rk-nama">' + esc(labelPeriode(l.key)) + ' ' + lencanaLaporan(l.status) + '</div>' +
    '<div class="rk-nomor">' + esc(l.nomorKuitansi || 'Menunggu pemeriksaan PP') + '</div>' +
    '<div class="rk-info"><span class="rk-periode">' + esc(labelMetode(l.metode) || '-') + ' · ' + esc(fmtTgl(l.tanggalBayar)) + '</span>' +
    '<span class="rk-nominal">' + rp(l.total) + '</span></div>' + ekor + '</article>';
}

function viewPukBeranda() {
  const pid = pidSaya();
  const per = periodeDefault();
  const key = periodeKey(per.t, per.b);
  const lunas = periodeKunci((S.iuran[pid] || {})[key]);
  const lap = (S.laporan[pid] || {})[key];
  const menunggu = !lunas && lap && lap.status === 'Menunggu';
  const status = lunas ? lencanaBayar(true) : menunggu ? lencanaLaporan('Menunggu') : lencanaBayar(false);
  const daftar = daftarLaporanSaya();
  const riwayat = daftar.map(kartuLaporan).join('');
  return '<section class="dashboard-welcome"><div><span class="eyebrow">AKUN PUK</span><h2>PUK ' + esc(namaPUKSaya()) + '</h2>' +
    '<p>Laporkan pembayaran iuran COS ke PP dan unduh kuitansi digital Anda.</p></div>' +
    '<div class="periode-pill">' + esc(BULAN[per.b - 1] + ' ' + per.t) + '</div></section>' +
    '<section class="card"><h3>Status Iuran ' + esc(BULAN[per.b - 1] + ' ' + per.t) + '</h3>' +
    '<div class="puk-baris ' + (lunas ? 'lunas' : 'belum') + '"><b class="puk-nama">PUK ' + esc(namaPUKSaya()) + '</b>' + status + '</div>' +
    (lunas ? '' : '<button class="btn" onclick="showTab(\'lapor\')">Lapor Pembayaran</button>') + '</section>' +
    '<section class="rk"><h3 class="rk-judul">Laporan Saya (' + daftar.length + ')</h3>' +
    (riwayat || '<p class="hint">Belum ada laporan pembayaran.</p>') + '</section>' +
    '<section class="card"><h3>Ganti Kata Sandi</h3>' +
    '<label for="pSandiLama">Kata sandi lama</label><input id="pSandiLama" type="password" autocomplete="current-password">' +
    '<label for="pSandiBaru">Kata sandi baru (minimal 6 karakter)</label><input id="pSandiBaru" type="password" autocomplete="new-password">' +
    '<button class="btn alt" onclick="gantiSandiSaya()">Ganti Kata Sandi</button></section>';
}

function periodeLapor() {
  const d = periodeDefault();
  return {
    b: S.tmp.lBulan || d.b,
    t: S.tmp.lTahun || d.t
  };
}

function ubahPeriodeLapor() {
  S.tmp.lBulan = +$('lBulan').value || undefined;
  S.tmp.lTahun = +$('lTahun').value || undefined;
  render();
}

function siapkanLaporanUlang(key) {
  const [t, b] = String(key).split('-').map(Number);
  S.tmp.lBulan = b;
  S.tmp.lTahun = t;
  showTab('lapor');
}

function viewPukLapor() {
  const pid = pidSaya();
  const { b, t } = periodeLapor();
  const key = periodeKey(t, b);
  const ada = (S.iuran[pid] || {})[key];
  const lap = (S.laporan[pid] || {})[key];
  const arg = '\'' + pid + '\',\'' + key + '\'';
  const optBulan = BULAN.map((n, i) => '<option value="' + (i + 1) + '"' + (i + 1 === b ? ' selected' : '') + '>' + n + '</option>').join('');
  const kepala = '<section class="card"><h3>Lapor Pembayaran Iuran</h3>' +
    '<p class="hint">Setelah membayar iuran COS ke PP, laporkan di sini. PP akan memeriksa lalu menerbitkan kuitansi resmi.</p>' +
    '<label>Nama PUK</label><input value="PUK ' + esc(namaPUKSaya()) + '" readonly>' +
    '<label for="lBulan">Bulan</label><select id="lBulan" onchange="ubahPeriodeLapor()">' + optBulan + '</select>' +
    '<label for="lTahun">Tahun</label><input id="lTahun" type="number" value="' + t + '" onchange="ubahPeriodeLapor()">';

  if (periodeKunci(ada)) {
    return kepala + '<p class="peringatan">Kuitansi untuk periode ' + esc(labelPeriode(key)) + ' sudah diterbitkan.</p>' +
      '<div class="row"><div class="info"><b>' + esc(ada.nomorKuitansi) + '</b> <span class="badge b-Lunas">Lunas</span><br>' +
      '<span class="hint">' + rp(ada.total) + ' · ' + esc(labelMetode(ada.metode)) + ' · ' + esc(fmtTgl(ada.tanggalSetor)) + '</span></div>' +
      '<div class="act"><button class="btn sm prev" onclick="previewKuitansi(' + arg + ')">Lihat Kuitansi</button></div></div></section>';
  }
  if (lap && lap.status === 'Menunggu') {
    return kepala + '<p class="peringatan">Laporan periode ' + esc(labelPeriode(key)) + ' sudah dikirim dan menunggu verifikasi PP.</p>' +
      '<div class="row"><div class="info"><b>' + rp(lap.total) + '</b> ' + lencanaLaporan('Menunggu') + '<br>' +
      '<span class="hint">' + esc(labelMetode(lap.metode)) + ' · ' + esc(fmtTgl(lap.tanggalBayar)) + '</span></div></div></section>';
  }
  const bukti = S.tmp.lBukti || '';
  return kepala +
    (lap && lap.status === 'Ditolak' ? '<p class="peringatan">Laporan sebelumnya ditolak: ' + esc(lap.alasan || '-') + '. Silakan kirim ulang.</p>' : '') +
    '<label for="lMetode">Metode pembayaran</label><select id="lMetode"><option value="Tunai">Cash (Tunai)</option><option value="Transfer">Transfer</option></select>' +
    '<label for="lTotal">Total nominal yang dibayar (Rp)</label><input id="lTotal" type="number" inputmode="numeric" placeholder="20000000">' +
    '<label for="lTanggal">Tanggal pembayaran</label><input id="lTanggal" type="date" value="' + hariIniLokal() + '">' +
    '<label for="lBukti">Foto bukti pembayaran (wajib untuk Transfer)</label><input id="lBukti" type="file" accept="image/*" onchange="muatBuktiLapor(this)">' +
    '<img class="pv" id="pv_lBukti" alt="Bukti pembayaran" src="' + bukti + '"' + (bukti ? '' : ' hidden') + '>' +
    '<label for="lCatatan">Catatan (opsional)</label><input id="lCatatan" maxlength="300" autocomplete="off">' +
    '<button class="btn" onclick="kirimLaporan()">Kirim Laporan ke PP</button></section>';
}

function muatBuktiLapor(inp) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1000 / Math.max(im.width, im.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k);
      cv.height = Math.round(im.height * k);
      const g = cv.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(im, 0, 0, cv.width, cv.height);
      let mutu = 0.72;
      let url = cv.toDataURL('image/jpeg', mutu);
      while (url.length > 450000 && mutu > 0.3) {
        mutu -= 0.1;
        url = cv.toDataURL('image/jpeg', mutu);
      }
      S.tmp.lBukti = url;
      const el = $('pv_lBukti');
      if (el) {
        el.src = url;
        el.hidden = false;
      }
    };
    im.onerror = () => toast('File bukti tidak dapat dibaca. Pilih foto atau gambar.');
    im.src = r.result;
  };
  r.readAsDataURL(f);
}

async function kirimLaporan() {
  const pid = pidSaya();
  if (!pid) return toast('Akun belum terhubung ke PUK');
  const bulan = +$('lBulan').value;
  const tahun = +$('lTahun').value;
  const metode = $('lMetode').value === 'Transfer' ? 'Transfer' : 'Tunai';
  const total = angka($('lTotal').value);
  const tgl = $('lTanggal').value;
  const catatan = $('lCatatan').value.trim().slice(0, 300);
  const bukti = S.tmp.lBukti || '';
  if (!bulan || !(tahun >= 2000 && tahun <= 2100) || !(total > 0) || !tgl) return toast('Isi bulan, tahun, total nominal, dan tanggal pembayaran');
  if (metode === 'Transfer' && !bukti) return toast('Foto bukti transfer wajib dilampirkan');

  const key = periodeKey(tahun, bulan);
  if (periodeKunci((S.iuran[pid] || {})[key])) return toast('Kuitansi untuk periode ini sudah diterbitkan');
  const lap = (S.laporan[pid] || {})[key];
  if (lap && lap.status !== 'Ditolak') return toast('Laporan periode ini sudah dikirim');

  const data = {
    periode: key,
    total: total,
    metode: metode,
    tanggalBayar: tgl,
    status: 'Menunggu',
    dibuat: firebase.database.ServerValue.TIMESTAMP,
    pelapor: ((S.profile && S.profile.nama) || '').slice(0, 100),
    adaBukti: !!bukti
  };
  if (catatan) data.catatan = catatan;
  const ubah = {};
  ubah['laporanBayar/' + pid + '/' + key] = data;
  ubah['bukti/' + pid + '/' + key] = bukti || null;

  const ok = await jalankan(async () => {
    await db.ref().update(ubah);
    return true;
  }, 'Laporan terkirim ke PP');
  if (ok) {
    delete S.tmp.lBukti;
    showTab('beranda');
  }
}

function viewPukKuitansi() {
  const list = daftarKuitansiSaya();
  const kartu = list.map(i => {
    const a = '\'' + i.pid + '\',\'' + i.key + '\'';
    return '<article class="rk-item">' +
      '<div class="rk-nama">' + esc(labelPeriode(i.key)) + ' ' + lencanaBayar(true) + '</div>' +
      '<div class="rk-nomor">' + esc(i.nomorKuitansi) + '</div>' +
      '<div class="rk-info"><span class="rk-periode">' + esc(labelMetode(i.metode) || '-') + ' · ' + esc(fmtTgl(i.tanggalSetor)) + '</span>' +
      '<span class="rk-nominal">' + rp(i.total) + '</span></div>' +
      '<div class="rk-aksi">' +
      '<button type="button" onclick="previewKuitansi(' + a + ')">Pratinjau</button>' +
      '<button type="button" onclick="unduhKuitansi(' + a + ')">Unduh PDF</button>' +
      '<button type="button" onclick="cetakKuitansi(' + a + ')">Cetak</button></div>' +
      '<button type="button" class="rk-wa" onclick="kirimPDFWA(this,' + a + ')">' + IKON_WA + '<span>Kirim PDF ke WA</span></button>' +
      '</article>';
  }).join('');
  return '<section class="rk"><h3 class="rk-judul">Kuitansi Saya (' + list.length + ')</h3>' +
    (kartu || '<p class="hint">Belum ada kuitansi yang diterbitkan.</p>') + '</section>';
}

function cetakKuitansi(pid, key) {
  if (!dataKuitansi(pid, key)) return toast('Data kuitansi tidak ditemukan');
  let url;
  try {
    url = URL.createObjectURL(buatPDF(pid, key).output('blob'));
  } catch (e) {
    return toast('Gagal menyiapkan cetakan: ' + pesan(e));
  }
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
    const w = window.open(url, '_blank');
    if (!w) toast('Pop-up diblokir. Gunakan tombol Unduh PDF lalu cetak dari berkasnya.');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return;
  }
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  fr.onload = () => {
    try {
      fr.contentWindow.focus();
      fr.contentWindow.print();
    } catch (e) {
      window.open(url, '_blank');
    }
  };
  fr.src = url;
  document.body.appendChild(fr);
  setTimeout(() => {
    fr.remove();
    URL.revokeObjectURL(url);
  }, 180000);
}

async function gantiSandiSaya() {
  const lama = $('pSandiLama').value;
  const baru = $('pSandiBaru').value;
  if (!lama || !baru) return toast('Isi kata sandi lama dan baru');
  if (baru.length < 6) return toast('Kata sandi baru minimal 6 karakter');
  const u = auth.currentUser;
  if (!u) return;
  const ok = await jalankan(async () => {
    await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, lama));
    await u.updatePassword(baru);
    return true;
  }, 'Kata sandi diganti');
  if (ok) {
    $('pSandiLama').value = '';
    $('pSandiBaru').value = '';
  }
}
