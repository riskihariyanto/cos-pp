let lapBulan = '';

function pengLaporan() {
  return (isPUK() ? S.pengaturanPuk : S.pengaturan) || {};
}

function namaLembaga() {
  return isPUK() ? 'PUK ' + namaPUKSaya() : ((S.pengaturan && S.pengaturan.namaPC) || 'PP FSP RTMM-SPSI');
}

const TGL_VALID = /^\d{4}-\d{2}-\d{2}$/;

function entriLaporan() {
  const kas = daftarKasGabungan()
    .filter(x => TGL_VALID.test(x.tgl || ''))
    .map(x => ({
      tgl: x.tgl,
      ket: x.ket || '-',
      masuk: x.jenis === 'keluar' ? 0 : Number(x.nominal) || 0,
      keluar: x.jenis === 'keluar' ? Number(x.nominal) || 0 : 0,
      urut: Number(x.dibuat) || 0
    }));
  const sebagaiPUK = isPUK();
  const iuran = daftarRiwayat()
    .map(i => ({
      tgl: i.tanggalSetor || tglCetak(i),
      ket: sebagaiPUK
        ? 'Iuran COS periode ' + labelPeriode(i.key) + ' ke PP'
        : 'Iuran COS PUK ' + ((S.puk[i.pid] || {}).namaPerusahaan || '-') + ' periode ' + labelPeriode(i.key),
      masuk: sebagaiPUK ? 0 : Number(i.total) || 0,
      keluar: sebagaiPUK ? Number(i.total) || 0 : 0,
      urut: Number(i.dibuat) || 0
    }))
    .filter(x => TGL_VALID.test(x.tgl));
  return kas.concat(iuran).sort((a, b) => a.tgl.localeCompare(b.tgl) || a.urut - b.urut);
}

function daftarBulanLaporan(entri) {
  const ada = {};
  entri.forEach(x => { ada[x.tgl.slice(0, 7)] = 1; });
  return Object.keys(ada).sort().reverse();
}

function bulanAktifLaporan(daftar) {
  return daftar.indexOf(lapBulan) >= 0 ? lapBulan : (daftar[0] || '');
}

function rekapBulan(entri, key) {
  const awal = entri
    .filter(x => x.tgl.slice(0, 7) < key)
    .reduce((t, x) => t + x.masuk - x.keluar, 0);
  let saldo = awal;
  const baris = entri
    .filter(x => x.tgl.slice(0, 7) === key)
    .map(x => {
      saldo += x.masuk - x.keluar;
      return Object.assign({}, x, { saldo });
    });
  return {
    awal,
    baris,
    masuk: baris.reduce((t, x) => t + x.masuk, 0),
    keluar: baris.reduce((t, x) => t + x.keluar, 0),
    akhir: saldo
  };
}

const kolomLaporan = n => (n ? ribuan(n) : '');

const saldoLaporan = n => (n < 0 ? '-' : '') + (ribuan(Math.abs(n)) || '0');

const tglPendek = iso => iso.split('-').reverse().join('/');

function ubahBulanLaporan() {
  lapBulan = $('lapBulan').value;
  render();
}

function viewLaporan() {
  const entri = entriLaporan();
  const daftar = daftarBulanLaporan(entri);
  if (!daftar.length) return '';
  const key = bulanAktifLaporan(daftar);
  const r = rekapBulan(entri, key);
  const opsi = daftar.map(k => '<option value="' + k + '"' + (k === key ? ' selected' : '') + '>' + esc(labelPeriode(k)) + '</option>').join('');
  return '<section class="card"><h2>Laporan Pemasukan dan Pengeluaran</h2>' +
    '<label for="lapBulan">Bulan laporan</label>' +
    '<select id="lapBulan" onchange="ubahBulanLaporan()">' + opsi + '</select>' +
    '<p class="hint">Saldo awal bulan ini: ' + esc(rp(r.awal)) + '</p>' +
    '<div class="kas-ringkas"><div><span>Pemasukan</span><b class="kas-masuk">' + esc(rp(r.masuk)) + '</b></div>' +
    '<div><span>Pengeluaran</span><b class="kas-keluar">' + esc(rp(r.keluar)) + '</b></div>' +
    '<div><span>Saldo Akhir</span><b>' + esc(rp(r.akhir)) + '</b></div></div>' +
    '<div class="rk-aksi">' +
    '<button type="button" onclick="pratinjauLaporan()">Pratinjau</button>' +
    '<button type="button" onclick="cetakLaporanPDF()">Unduh PDF</button>' +
    '<button type="button" onclick="unduhFotoLaporan(this)">Unduh Foto</button></div>' +
    '<button type="button" class="rk-wa" onclick="kirimLaporanWA(this)">' + IKON_WA + '<span>Kirim PDF ke WA</span></button></section>';
}

function akhirBulan(key) {
  const [t, b] = key.split('-').map(Number);
  return key + '-' + String(new Date(t, b, 0).getDate()).padStart(2, '0');
}

function tandaTanganLaporan(d, y, key, c) {
  const kolom = [
    { x: 45, jabatan: 'Ketua', nama: c.ketua || '' },
    { x: 105, jabatan: 'Sekretaris', nama: c.sekretaris || '' },
    { x: 165, jabatan: 'Bendahara', nama: c.bendahara || '' }
  ];
  const tglTtd = [c.kota, fmtTgl(akhirBulan(key))].filter(Boolean).join(', ');
  const yJabatan = y + 5.5;
  const yNama = yJabatan + 30;

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'normal');
  d.setFontSize(9.5);
  d.text('Mengetahui,', 75, y, { align: 'center' });
  if (tglTtd) d.text(tglTtd, 165, y, { align: 'center' });
  kolom.forEach(k => d.text(k.jabatan, k.x, yJabatan, { align: 'center' }));

  taruhGambar(d, c.stempel, 23, yNama - 24, 26, 22, 'kanan');
  taruhGambar(d, c.ttdKetua, 29, yNama - 24, 32, 22, 'tengah');
  taruhGambar(d, c.ttdSekretaris, 89, yNama - 24, 32, 22, 'tengah');
  taruhGambar(d, c.ttd, 149, yNama - 24, 32, 22, 'tengah');

  d.setFont('helvetica', 'bold');
  d.setFontSize(10);
  d.setDrawColor(26, 26, 26);
  d.setLineWidth(0.25);
  kolom.forEach(k => {
    if (k.nama) d.text(k.nama, k.x, yNama, { align: 'center' });
    const lebar = k.nama ? d.getTextWidth(k.nama) : 36;
    d.line(k.x - lebar / 2, yNama + 1, k.x + lebar / 2, yNama + 1);
  });
}

function kopLaporanPDF(d) {
  if (!isPUK()) {
    d.addImage(KOP_PP.src, KOP_PP.tipe, 15, 10, 180, 180 * KOP_PP.rasio);
    return;
  }
  const c = pengLaporan();
  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(16);
  d.text(namaLembaga().toUpperCase(), 105, 21, { align: 'center', maxWidth: 180 });
  let y = 27;
  if (c.alamat) {
    d.setFont('helvetica', 'normal');
    d.setFontSize(9.5);
    d.setTextColor(60, 60, 60);
    const baris = d.splitTextToSize(c.alamat, 170).slice(0, 2);
    d.text(baris, 105, y, { align: 'center' });
    y += baris.length * 4.4;
  }
  d.setDrawColor(26, 26, 26);
  d.setLineWidth(0.8);
  d.line(15, y + 1.5, 195, y + 1.5);
  d.setLineWidth(0.2);
  d.line(15, y + 3, 195, y + 3);
}

function buatLaporanPDF(d, key) {
  const c = pengLaporan();
  const r = rekapBulan(entriLaporan(), key);
  const W = 210;
  const tengah = W / 2;

  kopLaporanPDF(d);

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.text('LAPORAN KEUANGAN', tengah, 46, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(9.5);
  d.text('Periode ' + labelPeriode(key), tengah, 51.5, { align: 'center' });

  d.setFont('helvetica', 'bold');
  d.setFontSize(10);
  d.text('Saldo Awal Bulan Ini: ' + rp(r.awal), 15, 60);

  const kanan = { halign: 'right' };
  d.autoTable({
    startY: 63,
    margin: { left: 15, right: 15, bottom: 15 },
    theme: 'grid',
    showFoot: 'lastPage',
    head: [['Tanggal', 'Keterangan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']
      .map(t => ({ content: t, styles: { halign: 'center' } }))],
    body: r.baris.map(x => [tglPendek(x.tgl), x.ket, kolomLaporan(x.masuk), kolomLaporan(x.keluar), saldoLaporan(x.saldo)]),
    foot: [
      [{ content: 'Jumlah Bulan Ini', colSpan: 2, styles: kanan }, { content: kolomLaporan(r.masuk) || '0', styles: kanan }, { content: kolomLaporan(r.keluar) || '0', styles: kanan }, ''],
      [{ content: 'Saldo Akhir Bulan Ini', colSpan: 4, styles: kanan }, saldoLaporan(r.akhir)]
    ],
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: [26, 26, 26], lineColor: [190, 196, 204], lineWidth: 0.2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 85, 165], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [238, 243, 249], textColor: [26, 26, 26], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });

  let y = d.lastAutoTable.finalY + 12;
  if (y + 46 > 297 - 15) {
    d.addPage();
    y = 25;
  }
  tandaTanganLaporan(d, y, key, c);
  return d;
}

function kunciLaporanAktif() {
  return bulanAktifLaporan(daftarBulanLaporan(entriLaporan()));
}

function namaBerkasLaporan(key, ext) {
  return 'Laporan-Keuangan-' + key + '.' + ext;
}

function teksBagikanLaporan(key) {
  const r = rekapBulan(entriLaporan(), key);
  return 'Laporan keuangan ' + namaLembaga() + '\nPeriode ' + labelPeriode(key) + '\nSaldo akhir: ' + rp(r.akhir);
}

function buatDokumenLaporan(key) {
  const pustaka = window.jspdf;
  if (!pustaka) throw new Error('Pustaka PDF belum termuat. Periksa koneksi internet.');
  const d = new pustaka.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  if (typeof d.autoTable !== 'function') throw new Error('Pustaka tabel PDF belum termuat. Periksa koneksi internet.');
  return buatLaporanPDF(d, key);
}

function cetakLaporanPDF() {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  try {
    buatDokumenLaporan(key).save(namaBerkasLaporan(key, 'pdf'));
  } catch (e) {
    toast('Gagal membuat PDF: ' + pesan(e));
  }
}

const LEBAR_LAPORAN = 794;

const GAYA_LAPORAN = `
.pv-stage.lap{align-items:flex-start}
.lap-kertas{position:absolute;left:0;top:0;width:794px;box-sizing:border-box;padding:57px;background:#fff;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;transform-origin:0 0}
.lap-kopgbr{display:block;width:100%;height:auto;margin-bottom:18px}
.lap-kopteks{margin-bottom:22px;padding-bottom:10px;text-align:center;border-bottom:3px double #1a1a1a}
.lap-kopteks b{display:block;font-size:22px;letter-spacing:.3px;text-transform:uppercase}
.lap-kopteks span{display:block;margin-top:5px;font-size:12px;color:#3c3c3c}
.lap-judul{font-size:17px;font-weight:700;text-align:center}
.lap-periode{margin-top:4px;font-size:12.5px;color:#555;text-align:center}
.lap-awal{margin:18px 0 8px;font-size:13px;font-weight:700}
.lap-tabel{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px}
.lap-tabel th{padding:7px 6px;color:#fff;background:#0055a5;border:1px solid #bec4cc;font-weight:700;text-align:center}
.lap-tabel td{padding:6px;border:1px solid #bec4cc;vertical-align:top;overflow-wrap:anywhere}
.lap-tabel td.t{white-space:nowrap}
.lap-tabel td.a{text-align:right;white-space:nowrap}
.lap-tabel tfoot td{background:#eef3f9;font-weight:700}
.lap-ttd{display:grid;grid-template-columns:1fr 1fr 1fr;row-gap:4px;margin-top:40px;font-size:13px;text-align:center}
.lap-ttd .span2{grid-column:1/3}
.lap-gbr{position:relative;height:100px}
.lap-gbr img{position:absolute;bottom:4px;height:83px;object-fit:contain}
.lap-gbr .st{left:calc(50% - 83px);width:98px;object-position:right bottom}
.lap-gbr .tt{left:calc(50% - 60px);width:121px;object-position:center bottom}
.lap-nama span{display:inline-block;min-width:136px;min-height:17px;padding:0 6px;border-bottom:1px solid #1a1a1a;font-weight:700}
`;

function pasangGayaLaporan() {
  if ($('gayaLaporan')) return;
  const el = document.createElement('style');
  el.id = 'gayaLaporan';
  el.textContent = GAYA_LAPORAN;
  document.head.appendChild(el);
}

function htmlKopLaporan() {
  if (!isPUK()) return '<img class="lap-kopgbr" alt="" src="' + KOP_PP.src + '">';
  const c = pengLaporan();
  return '<div class="lap-kopteks"><b>' + esc(namaLembaga()) + '</b>' + (c.alamat ? '<span>' + esc(c.alamat) + '</span>' : '') + '</div>';
}

function htmlLaporan(key) {
  const c = pengLaporan();
  const r = rekapBulan(entriLaporan(), key);
  const tglTtd = [c.kota, fmtTgl(akhirBulan(key))].filter(Boolean).join(', ');
  const baris = r.baris.map(x =>
    '<tr><td class="t">' + esc(tglPendek(x.tgl)) + '</td><td>' + esc(x.ket) + '</td>' +
    '<td class="a">' + esc(kolomLaporan(x.masuk)) + '</td><td class="a">' + esc(kolomLaporan(x.keluar)) + '</td>' +
    '<td class="a">' + esc(saldoLaporan(x.saldo)) + '</td></tr>'
  ).join('');
  const gambar = (src, kelas) => (src ? '<img class="' + kelas + '" alt="" src="' + src + '">' : '');
  const nama = v => '<div class="lap-nama"><span>' + esc(v || '') + '</span></div>';
  return '<div class="lap-kertas" id="lapKertas">' +
    htmlKopLaporan() +
    '<div class="lap-judul">LAPORAN KEUANGAN</div><div class="lap-periode">Periode ' + esc(labelPeriode(key)) + '</div>' +
    '<div class="lap-awal">Saldo Awal Bulan Ini: ' + esc(rp(r.awal)) + '</div>' +
    '<table class="lap-tabel"><colgroup><col style="width:83px"><col><col style="width:113px"><col style="width:113px"><col style="width:113px"></colgroup>' +
    '<thead><tr><th>Tanggal</th><th>Keterangan</th><th>Pemasukan (Rp)</th><th>Pengeluaran (Rp)</th><th>Saldo (Rp)</th></tr></thead>' +
    '<tbody>' + baris + '</tbody>' +
    '<tfoot><tr><td colspan="2" class="a">Jumlah Bulan Ini</td><td class="a">' + esc(kolomLaporan(r.masuk) || '0') + '</td><td class="a">' + esc(kolomLaporan(r.keluar) || '0') + '</td><td></td></tr>' +
    '<tr><td colspan="4" class="a">Saldo Akhir Bulan Ini</td><td class="a">' + esc(saldoLaporan(r.akhir)) + '</td></tr></tfoot></table>' +
    '<div class="lap-ttd"><div class="span2">Mengetahui,</div><div>' + esc(tglTtd) + '</div>' +
    '<div>Ketua</div><div>Sekretaris</div><div>Bendahara</div>' +
    '<div class="lap-gbr">' + gambar(c.stempel, 'st') + gambar(c.ttdKetua, 'tt') + '</div><div class="lap-gbr">' + gambar(c.ttdSekretaris, 'tt') + '</div><div class="lap-gbr">' + gambar(c.ttd, 'tt') + '</div>' +
    nama(c.ketua) + nama(c.sekretaris) + nama(c.bendahara) + '</div></div>';
}

let lapRiwayat = false;

function skalaLaporan() {
  const st = $('lapStage');
  const w = $('lapWrap');
  const k = $('lapKertas');
  if (!st || !w || !k) return;
  const s = Math.max(0.2, Math.min((st.clientWidth - 24) / LEBAR_LAPORAN, 1.5));
  w.style.width = (LEBAR_LAPORAN * s).toFixed(1) + 'px';
  w.style.height = (k.offsetHeight * s).toFixed(1) + 'px';
  k.style.transform = 'scale(' + s.toFixed(4) + ')';
}

function tombolEscLaporan(e) {
  if (e.key === 'Escape') tutupPratinjauLaporan();
}

function bersihPratinjauLaporan() {
  const ov = $('lapOv');
  if (ov) ov.remove();
  document.body.classList.remove('pv-buka');
  window.removeEventListener('resize', skalaLaporan);
  document.removeEventListener('keydown', tombolEscLaporan);
  window.removeEventListener('popstate', bersihPratinjauLaporan);
  lapRiwayat = false;
}

function tutupPratinjauLaporan() {
  if (lapRiwayat && history.state && history.state.laporan) {
    history.back();
    setTimeout(() => {
      if ($('lapOv')) bersihPratinjauLaporan();
    }, 500);
    return;
  }
  bersihPratinjauLaporan();
}

function pratinjauLaporan() {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  if ($('lapOv')) bersihPratinjauLaporan();
  pasangGayaPratinjau();
  pasangGayaLaporan();
  const ov = document.createElement('div');
  ov.id = 'lapOv';
  ov.className = 'pv-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Pratinjau laporan keuangan');
  ov.innerHTML =
    '<div class="pv-bar"><b>Pratinjau Laporan</b><button type="button" class="pv-x" onclick="tutupPratinjauLaporan()">Tutup</button></div>' +
    '<div class="pv-stage lap" id="lapStage"><div class="pv-wrap" id="lapWrap">' + htmlLaporan(key) + '</div></div>' +
    '<div class="pv-act">' +
    '<button type="button" class="pv-wa" onclick="kirimLaporanWA(this)">' + IKON_WA + '<span>Kirim PDF ke WA</span></button>' +
    '<button type="button" class="pv-pdf" onclick="cetakLaporanPDF()">Unduh PDF</button>' +
    '<button type="button" class="pv-foto" onclick="unduhFotoLaporan(this)">Unduh Foto</button>' +
    '</div>';
  document.body.appendChild(ov);
  document.body.classList.add('pv-buka');
  skalaLaporan();
  window.addEventListener('resize', skalaLaporan);
  document.addEventListener('keydown', tombolEscLaporan);
  try {
    history.pushState({ laporan: true }, '');
    lapRiwayat = true;
  } catch (e) {
    lapRiwayat = false;
  }
  window.addEventListener('popstate', bersihPratinjauLaporan);
  const x = ov.querySelector('.pv-x');
  if (x) x.focus();
}

function fotoLaporanBlob(key) {
  pasangGayaPratinjau();
  pasangGayaLaporan();
  const wadah = document.createElement('div');
  wadah.innerHTML = htmlLaporan(key);
  return fotoDariKertas(wadah.firstChild);
}

function unduhFotoLaporan(tombol) {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  denganTombol(tombol, async () => {
    unduhBlob(await fotoLaporanBlob(key), namaBerkasLaporan(key, 'png'));
  });
}

function kirimLaporanWA(tombol) {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  const teks = teksBagikanLaporan(key);
  denganTombol(tombol, async () => {
    const blob = buatDokumenLaporan(key).output('blob');
    const berkas = new File([blob], namaBerkasLaporan(key, 'pdf'), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [berkas] })) {
      try {
        await navigator.share({ files: [berkas], title: 'Laporan Keuangan ' + namaLembaga(), text: teks });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    unduhBlob(blob, berkas.name);
    toast('PDF tersimpan. Lampirkan di WhatsApp.');
    setTimeout(() => { window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank'); }, 700);
  });
}

const URL_XLSX = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';

const FORMAT_ANGKA = '#,##0;-#,##0';

let janjiXLSX = null;

function muatXLSX() {
  if (window.XLSX && window.XLSX.style_version) return Promise.resolve(window.XLSX);
  if (janjiXLSX) return janjiXLSX;
  janjiXLSX = new Promise((ok, gagal) => {
    const el = document.createElement('script');
    el.src = URL_XLSX;
    el.onload = () => ok(window.XLSX);
    el.onerror = () => {
      janjiXLSX = null;
      el.remove();
      gagal(new Error('Pustaka XLSX gagal dimuat. Periksa koneksi internet.'));
    };
    document.head.appendChild(el);
  });
  return janjiXLSX;
}

function gayaXLSX() {
  const garis = { style: 'thin', color: { rgb: 'BEC4CC' } };
  const batas = { top: garis, bottom: garis, left: garis, right: garis };
  const huruf = { name: 'Calibri', sz: 10 };
  const tebal = Object.assign({}, huruf, { bold: true });
  const isi = { fill: { fgColor: { rgb: 'EEF3F9' } }, border: batas };
  return {
    judul: { font: Object.assign({}, huruf, { bold: true, sz: 14 }), alignment: { horizontal: 'center' } },
    judulLaporan: { font: Object.assign({}, huruf, { bold: true, sz: 12 }), alignment: { horizontal: 'center' } },
    sub: { font: Object.assign({}, huruf, { sz: 9, color: { rgb: '555555' } }), alignment: { horizontal: 'center' } },
    kepala: { font: Object.assign({}, tebal, { color: { rgb: 'FFFFFF' } }), fill: { fgColor: { rgb: '0055A5' } }, border: batas, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
    teks: { font: huruf, border: batas, alignment: { vertical: 'top', wrapText: true } },
    tengah: { font: huruf, border: batas, alignment: { horizontal: 'center', vertical: 'top' } },
    angka: { font: huruf, border: batas, alignment: { horizontal: 'right', vertical: 'top' } },
    jumlahTeks: Object.assign({ font: tebal, alignment: { horizontal: 'right' } }, isi),
    jumlahAngka: Object.assign({ font: tebal, alignment: { horizontal: 'right' } }, isi),
    ttd: { font: huruf, alignment: { horizontal: 'center' } },
    nama: { font: tebal, border: { bottom: { style: 'thin', color: { rgb: '1A1A1A' } } }, alignment: { horizontal: 'center' } }
  };
}

function sel(ws, br, kol, nilai, gaya) {
  const angkaSel = typeof nilai === 'number';
  const isi = { v: nilai == null ? '' : nilai, t: angkaSel ? 'n' : 's', s: gaya };
  if (angkaSel) isi.z = FORMAT_ANGKA;
  ws[XLSX.utils.encode_cell({ r: br, c: kol })] = isi;
}

function selGabung(ws, br, dari, sampai, nilai, gaya) {
  sel(ws, br, dari, nilai, gaya);
  for (let k = dari + 1; k <= sampai; k++) sel(ws, br, k, '', gaya);
  if (sampai > dari) ws['!merges'].push({ s: { r: br, c: dari }, e: { r: br, c: sampai } });
}

function tutupLembar(ws, barisAkhir, lebar) {
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: barisAkhir, c: lebar.length - 1 } });
  ws['!cols'] = lebar.map(w => ({ wch: w }));
  return ws;
}

let gayaLembar = null;

function kopLembar(ws, c, subjudul) {
  selGabung(ws, 0, 0, 4, namaLembaga().toUpperCase(), gayaLembar.judul);
  selGabung(ws, 1, 0, 4, c.alamat || '', gayaLembar.sub);
  selGabung(ws, 2, 0, 4, 'LAPORAN KEUANGAN', gayaLembar.judulLaporan);
  selGabung(ws, 3, 0, 4, subjudul, gayaLembar.sub);
}

function lembarRingkasan(entri, daftar, c) {
  const g = gayaLembar;
  const ws = { '!merges': [] };
  kopLembar(ws, c, 'Ringkasan seluruh periode');
  ['Bulan', 'Saldo Awal (Rp)', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo Akhir (Rp)'].forEach((t, k) => sel(ws, 5, k, t, g.kepala));
  let br = 6;
  let masuk = 0;
  let keluar = 0;
  let akhir = 0;
  daftar.forEach(key => {
    const r = rekapBulan(entri, key);
    sel(ws, br, 0, labelPeriode(key), g.teks);
    sel(ws, br, 1, r.awal, g.angka);
    sel(ws, br, 2, r.masuk, g.angka);
    sel(ws, br, 3, r.keluar, g.angka);
    sel(ws, br, 4, r.akhir, g.angka);
    masuk += r.masuk;
    keluar += r.keluar;
    akhir = r.akhir;
    br++;
  });
  sel(ws, br, 0, 'Total', g.jumlahTeks);
  sel(ws, br, 1, '', g.jumlahTeks);
  sel(ws, br, 2, masuk, g.jumlahAngka);
  sel(ws, br, 3, keluar, g.jumlahAngka);
  sel(ws, br, 4, akhir, g.jumlahAngka);
  return tutupLembar(ws, br, [22, 20, 20, 20, 20]);
}

function lembarBulan(entri, key, c) {
  const g = gayaLembar;
  const r = rekapBulan(entri, key);
  const ws = { '!merges': [], '!rows': [] };
  kopLembar(ws, c, 'Periode ' + labelPeriode(key));
  selGabung(ws, 5, 0, 3, 'Saldo Awal Bulan Ini', g.jumlahTeks);
  sel(ws, 5, 4, r.awal, g.jumlahAngka);
  ['Tanggal', 'Keterangan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)'].forEach((t, k) => sel(ws, 6, k, t, g.kepala));
  let br = 7;
  r.baris.forEach(x => {
    sel(ws, br, 0, tglPendek(x.tgl), g.tengah);
    sel(ws, br, 1, x.ket, g.teks);
    sel(ws, br, 2, x.masuk || '', g.angka);
    sel(ws, br, 3, x.keluar || '', g.angka);
    sel(ws, br, 4, x.saldo, g.angka);
    br++;
  });
  selGabung(ws, br, 0, 1, 'Jumlah Bulan Ini', g.jumlahTeks);
  sel(ws, br, 2, r.masuk, g.jumlahAngka);
  sel(ws, br, 3, r.keluar, g.jumlahAngka);
  sel(ws, br, 4, '', g.jumlahTeks);
  br++;
  selGabung(ws, br, 0, 3, 'Saldo Akhir Bulan Ini', g.jumlahTeks);
  sel(ws, br, 4, r.akhir, g.jumlahAngka);
  br += 2;
  selGabung(ws, br, 0, 1, 'Mengetahui,', g.ttd);
  selGabung(ws, br, 3, 4, [c.kota, fmtTgl(akhirBulan(key))].filter(Boolean).join(', '), g.ttd);
  br++;
  selGabung(ws, br, 0, 1, 'Ketua', g.ttd);
  selGabung(ws, br, 2, 3, 'Sekretaris', g.ttd);
  sel(ws, br, 4, 'Bendahara', g.ttd);
  br++;
  ws['!rows'][br] = { hpt: 56 };
  br++;
  selGabung(ws, br, 0, 1, c.ketua || '', g.nama);
  selGabung(ws, br, 2, 3, c.sekretaris || '', g.nama);
  sel(ws, br, 4, c.bendahara || '', g.nama);
  return tutupLembar(ws, br, [12, 50, 18, 18, 18]);
}

async function eksporLaporanXLSX() {
  const entri = entriLaporan();
  const daftar = daftarBulanLaporan(entri).reverse();
  if (!daftar.length) return toast('Belum ada transaksi untuk diekspor');
  await jalankan(async () => {
    await muatXLSX();
    const c = pengLaporan();
    gayaLembar = gayaXLSX();
    const buku = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(buku, lembarRingkasan(entri, daftar, c), 'Ringkasan');
    daftar.forEach(key => XLSX.utils.book_append_sheet(buku, lembarBulan(entri, key, c), labelPeriode(key)));
    const data = XLSX.write(buku, { bookType: 'xlsx', type: 'array' });
    unduhBlob(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Laporan-Keuangan-COS.xlsx');
  }, 'Laporan XLSX diunduh');
}

const viewRiwayatLaporanAsli = VIEWS.kuitansi;

VIEWS.kuitansi = () => {
  const html = viewRiwayatLaporanAsli();
  return subRiwayat === 'kas' ? html.replace('</div>', m => m + viewLaporan()) : html;
};
