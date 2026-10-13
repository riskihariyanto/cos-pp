function semuaLaporan() {
  const out = [];
  Object.keys(S.laporan).forEach(pid => {
    const per = S.laporan[pid] || {};
    Object.keys(per).forEach(k => out.push(Object.assign({}, per[k], { pid, key: k })));
  });
  return out;
}

function jumlahLaporanMenunggu() {
  return semuaLaporan().filter(l => l.status === 'Menunggu').length;
}

function namaPUKDari(pid) {
  return (S.puk[pid] || {}).namaPerusahaan || '-';
}

function kartuLaporanMasuk(l) {
  const a = '\'' + l.pid + '\',\'' + l.key + '\'';
  const menunggu = l.status === 'Menunggu';
  let aksi = '';
  if (menunggu) {
    aksi = '<div class="rk-aksi" style="grid-template-columns:1fr 1fr">' +
      (l.adaBukti ? '<button type="button" onclick="lihatBukti(' + a + ')">Lihat Bukti</button>' : '<button type="button" disabled>Tanpa Bukti</button>') +
      '<button type="button" onclick="tolakLaporan(' + a + ')">Tolak</button></div>' +
      '<button type="button" class="btn" onclick="terimaLaporan(' + a + ')">Terima &amp; Terbitkan Kuitansi</button>';
  } else if (l.adaBukti) {
    aksi = '<div class="rk-aksi" style="grid-template-columns:1fr"><button type="button" onclick="lihatBukti(' + a + ')">Lihat Bukti</button></div>';
  }
  const ket = l.status === 'Ditolak' ? '<p class="hint">Alasan: ' + esc(l.alasan || '-') + '</p>' : '';
  const cat = l.catatan ? '<p class="hint">Catatan PUK: ' + esc(l.catatan) + '</p>' : '';
  return '<article class="rk-item">' +
    '<div class="rk-nama">PUK ' + esc(namaPUKDari(l.pid)) + ' ' + lencanaLaporan(l.status) + '</div>' +
    '<div class="rk-nomor">' + esc(labelPeriode(l.key)) + (l.nomorKuitansi ? ' · ' + esc(l.nomorKuitansi) : '') + '</div>' +
    '<div class="rk-info"><span class="rk-periode">' + esc(labelMetode(l.metode) || '-') + ' · ' + esc(fmtTgl(l.tanggalBayar)) + '</span>' +
    '<span class="rk-nominal">' + rp(l.total) + '</span></div>' + cat + ket + aksi + '</article>';
}

function viewLaporanMasuk() {
  const semua = semuaLaporan();
  const baru = semua.filter(l => l.status === 'Menunggu').sort((x, y) => (x.dibuat || 0) - (y.dibuat || 0));
  const selesai = semua.filter(l => l.status !== 'Menunggu')
    .sort((x, y) => String(y.tanggalProses || '').localeCompare(String(x.tanggalProses || '')) || (y.dibuat || 0) - (x.dibuat || 0))
    .slice(0, 15);
  return '<section class="rk"><h3 class="rk-judul">Laporan Masuk dari PUK (' + baru.length + ')</h3>' +
    (baru.map(kartuLaporanMasuk).join('') || '<p class="hint">Tidak ada laporan yang menunggu verifikasi.</p>') + '</section>' +
    (selesai.length ? '<section class="rk"><h3 class="rk-judul">Sudah Diproses</h3>' + selesai.map(kartuLaporanMasuk).join('') + '</section>' : '');
}

function tutupBukti() {
  const ov = $('bkOv');
  if (ov) ov.remove();
  document.body.classList.remove('pv-buka');
}

async function lihatBukti(pid, key) {
  pasangGayaPratinjau();
  const src = await jalankan(async () => (await db.ref('bukti/' + pid + '/' + key).once('value')).val());
  if (typeof src !== 'string' || src.indexOf('data:image/') !== 0) return toast('Bukti tidak tersedia');
  tutupBukti();
  const ov = document.createElement('div');
  ov.id = 'bkOv';
  ov.className = 'pv-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = '<div class="pv-bar"><b>Bukti Pembayaran</b><button type="button" class="pv-x" onclick="tutupBukti()">Tutup</button></div><div class="pv-stage"></div>';
  const img = document.createElement('img');
  img.alt = 'Bukti pembayaran';
  img.style.cssText = 'max-width:100%;max-height:100%;background:#fff;border-radius:8px;object-fit:contain';
  img.src = src;
  ov.querySelector('.pv-stage').appendChild(img);
  document.body.appendChild(ov);
  document.body.classList.add('pv-buka');
}

async function terimaLaporan(pid, key) {
  if (!isPC()) return toast('Akses ditolak');
  const l = (S.laporan[pid] || {})[key];
  const p = S.puk[pid];
  if (!l || !p || l.status !== 'Menunggu') return toast('Laporan tidak ditemukan atau sudah diproses');
  if (periodeKunci((S.iuran[pid] || {})[key])) return toast(pesanAdmin());
  if (!confirm('Terbitkan kuitansi ' + rp(l.total) + ' untuk PUK ' + p.namaPerusahaan + ' periode ' + labelPeriode(key) + '?')) return;
  const [tahun, bulan] = key.split('-').map(Number);
  await jalankan(async () => {
    const hariIni = hariIniLokal();
    const nomor = await nextNomor(p.namaPerusahaan, bulan, tahun);
    const data = {
      periode: key,
      total: l.total,
      tanggalSetor: l.tanggalBayar,
      status: 'Lunas',
      metode: l.metode,
      sumber: 'PUK',
      nomorKuitansi: nomor,
      dibuat: firebase.database.ServerValue.TIMESTAMP,
      diverifikasiOleh: S.profile.nama || '',
      tanggalVerifikasi: hariIni,
      tanggalCetak: hariIni
    };
    if (!(await klaimPeriode(pid, key, data))) throw new Error(pesanAdmin());
    await db.ref('laporanBayar/' + pid + '/' + key).update({ status: 'Diterima', tanggalProses: hariIni, nomorKuitansi: nomor });
    return true;
  }, 'Kuitansi diterbitkan');
}

async function tolakLaporan(pid, key) {
  if (!isPC()) return toast('Akses ditolak');
  const l = (S.laporan[pid] || {})[key];
  if (!l || l.status !== 'Menunggu') return toast('Laporan tidak ditemukan atau sudah diproses');
  const alasan = (prompt('Alasan penolakan (wajib diisi):') || '').trim().slice(0, 300);
  if (!alasan) return toast('Alasan penolakan wajib diisi');
  await jalankan(
    () => db.ref('laporanBayar/' + pid + '/' + key).update({ status: 'Ditolak', alasan: alasan, tanggalProses: hariIniLokal() }),
    'Laporan ditolak'
  );
}

function daftarAkunPUK() {
  return Object.keys(S.akun)
    .filter(u => S.akun[u] && S.akun[u].role === 'puk')
    .map(u => Object.assign({}, S.akun[u], { uid: u }))
    .sort((x, y) => namaPUKDari(x.pukId).localeCompare(namaPUKDari(y.pukId)) || String(x.id || '').localeCompare(String(y.id || '')));
}

function viewAkunPUK() {
  const opsi = '<option value="">Pilih PUK</option>' +
    sortedPUK().map(pid => '<option value="' + esc(pid) + '">PUK ' + esc(namaPUKDari(pid)) + '</option>').join('');
  const akun = daftarAkunPUK();
  const baris = akun.map(a => {
    const aktif = a.aktif !== false;
    return '<div class="row"><div class="info"><b>PUK ' + esc(namaPUKDari(a.pukId)) + '</b> ' +
      '<span class="badge ' + (aktif ? 'b-Lunas' : 'b-Ditolak') + '">' + (aktif ? 'Aktif' : 'Nonaktif') + '</span><br>' +
      '<span class="hint">ID login: ' + esc(a.id || '-') + (a.nama ? ' · ' + esc(a.nama) : '') + '</span></div>' +
      '<div class="act"><button class="btn sm alt" onclick="ubahStatusAkun(\'' + esc(a.uid) + '\',' + (aktif ? 'false' : 'true') + ')">' + (aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button></div></div>';
  }).join('');
  return '<section class="card"><h3>Buat Akun PUK</h3>' +
    '<p class="hint">Akun PUK dapat melihat, mengunduh, dan mencetak kuitansi miliknya serta melaporkan pembayaran iuran ke PP.</p>' +
    '<label for="aPuk">Nama PUK</label><select id="aPuk">' + opsi + '</select>' +
    '<label for="aId">ID login (huruf kecil, angka, titik, strip)</label><input id="aId" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="puk-namaperusahaan">' +
    '<label for="aNama">Nama pengurus PUK (opsional)</label><input id="aNama" autocomplete="off">' +
    '<label for="aPass">Kata sandi awal (minimal 6 karakter)</label><input id="aPass" type="text" autocomplete="off" autocapitalize="none" spellcheck="false">' +
    '<button class="btn" onclick="buatAkunPUK()">Buat Akun</button></section>' +
    '<section class="card"><h3>Akun PUK Terdaftar (' + akun.length + ')</h3>' +
    (baris || '<p class="hint">Belum ada akun PUK.</p>') + '</section>';
}

async function buatAkunPUK() {
  if (!isPC()) return toast('Akses ditolak');
  const pid = $('aPuk').value;
  const id = $('aId').value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const sandi = $('aPass').value;
  const nama = $('aNama').value.trim().slice(0, 100);
  if (!pid || !S.puk[pid]) return toast('Pilih PUK terlebih dahulu');
  if (id.length < 4) return toast('ID login minimal 4 karakter');
  if (sandi.length < 6) return toast('Kata sandi minimal 6 karakter');
  const ok = await jalankan(async () => {
    let app;
    try {
      app = firebase.app('pembuat');
    } catch (e) {
      app = firebase.initializeApp(firebaseConfig, 'pembuat');
    }
    const a = app.auth();
    const email = emailDariId(id);
    let uid;
    try {
      uid = (await a.createUserWithEmailAndPassword(email, sandi)).user.uid;
    } catch (e) {
      if (!e || e.code !== 'auth/email-already-in-use') throw e;
      try {
        uid = (await a.signInWithEmailAndPassword(email, sandi)).user.uid;
      } catch (x) {
        throw new Error('ID login sudah dipakai. Gunakan ID lain.');
      }
      if ((await db.ref('users/' + uid).once('value')).val()) {
        await a.signOut().catch(() => {});
        throw new Error('ID login sudah dipakai akun lain. Gunakan ID lain.');
      }
    }
    try {
      await db.ref('users/' + uid).set({
        role: 'puk',
        pukId: pid,
        id: id,
        nama: nama || S.puk[pid].namaPerusahaan,
        aktif: true,
        dibuat: firebase.database.ServerValue.TIMESTAMP
      });
    } finally {
      await a.signOut().catch(() => {});
    }
    return true;
  }, 'Akun PUK dibuat');
  if (ok) {
    ['aId', 'aNama', 'aPass'].forEach(k => { $(k).value = ''; });
    $('aPuk').value = '';
  }
}

function ubahStatusAkun(uid, aktif) {
  if (!isPC()) return toast('Akses ditolak');
  if (!aktif && !confirm('Nonaktifkan akun ini? PUK tidak bisa masuk sampai diaktifkan kembali.')) return;
  jalankan(() => db.ref('users/' + uid + '/aktif').set(!!aktif), aktif ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
}
