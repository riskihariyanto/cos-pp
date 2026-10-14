const PX = 4;
const PT = 1.411;
const LEBAR_KERTAS = 840;
const TINGGI_KERTAS = 592;

let pvAktif = null;
let pvFoto = null;
let pvRiwayat = false;

function buatQR(teks) {
  const q = qrcode(0, 'M');
  q.addData(teks);
  q.make();
  return q;
}

function gambarQR(d, teks, x, y, size) {
  const q = buatQR(teks);
  const n = q.getModuleCount();
  const m = size / n;
  d.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) d.rect(x + c * m, y + r * m, m + 0.02, m + 0.02, 'F');
    }
  }
}

function svgQR(teks) {
  const q = buatQR(teks);
  const n = q.getModuleCount();
  let p = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) p += 'M' + c + ' ' + r + 'h1v1h-1z';
    }
  }
  const ukuran = n * 8;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + ukuran + '" height="' + ukuran + '" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges">' +
    '<rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + p + '" fill="#000"/></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function urlQR(teks) {
  try {
    const q = buatQR(teks);
    const n = q.getModuleCount();
    const sel = Math.max(4, Math.ceil(600 / n));
    const cv = document.createElement('canvas');
    cv.width = n * sel;
    cv.height = n * sel;
    const g = cv.getContext('2d');
    if (!g) return svgQR(teks);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#000000';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (q.isDark(r, c)) g.fillRect(c * sel, r * sel, sel, sel);
      }
    }
    return cv.toDataURL('image/png');
  } catch (e) {
    return svgQR(teks);
  }
}

function hitungGambar(d, src, x, y, maxW, maxH, rata) {
  if (!src) return null;
  try {
    const pr = d.getImageProperties(src);
    const k = Math.min(maxW / pr.width, maxH / pr.height);
    const w = pr.width * k;
    const h = pr.height * k;
    const px = rata === 'kanan' ? x + maxW - w : x + (maxW - w) / 2;
    return { src, tipe: pr.fileType || 'PNG', x: px, y: y + (maxH - h), w, h };
  } catch (e) {
    return null;
  }
}

function taruhGambar(d, src, x, y, maxW, maxH, rata) {
  const g = hitungGambar(d, src, x, y, maxW, maxH, rata);
  if (!g) return;
  try {
    d.addImage(g.src, g.tipe, g.x, g.y, g.w, g.h);
  } catch (e) {}
}

function susunKuitansi(d, pid, key) {
  const p = S.puk[pid] || {};
  const i = (S.iuran[pid] || {})[key] || {};
  const c = S.pengaturan || {};
  const W = 210;
  const namaPUK = p.namaPerusahaan || '';
  const periode = labelPeriode(key);
  const nomor = i.nomorKuitansi || '';

  const isi = [
    ['Telah terima dari', 'PUK ' + namaPUK],
    ['Uang sejumlah', terbilangRupiah(i.total || 0)],
    ['Untuk pembayaran', 'Iuran COS periode ' + periode],
    ['Tanggal setor', fmtTgl(i.tanggalSetor)],
    ['Status', 'Lunas']
  ];
  const susunBaris = (fs, tinggi, jeda) => {
    d.setFont('helvetica', 'bold');
    d.setFontSize(fs);
    let y = 0;
    const hasil = isi.map(([label, nilai]) => {
      const lines = d.splitTextToSize(nilai, W - 16 - 59);
      const r = { label, lines, y };
      y += Math.max(1, lines.length) * tinggi + jeda;
      return r;
    });
    const rentang = y - jeda - tinggi;
    const geser = Math.min(Math.max(70 - rentang / 2 + 1.2, 55), 89 - rentang);
    hasil.forEach(r => { r.y += geser; });
    return { hasil, rentang };
  };
  const RENTANG_MAKS = 33;
  let fs = 10;
  let susunan = susunBaris(fs, 4.2, 1.7);
  if (susunan.rentang > RENTANG_MAKS) {
    fs = 9;
    susunan = susunBaris(fs, 3.8, 1.4);
  }
  if (susunan.rentang > RENTANG_MAKS) {
    fs = 8;
    susunan = susunBaris(fs, 3.4, 1.1);
  }
  const baris = susunan.hasil;

  const jumlahTeks = rp(i.total || 0);
  d.setFont('helvetica', 'bold');
  d.setFontSize(14);
  const lebarJumlah = d.getTextWidth(jumlahTeks);
  const jumlahPt = lebarJumlah > 60 ? Math.max(8, 14 * 60 / lebarJumlah) : 14;

  const bendahara = c.bendahara || '';
  d.setFont('helvetica', 'bold');
  d.setFontSize(10);
  const lebarNama = bendahara ? d.getTextWidth(bendahara) : 0;

  return {
    namaPC: (c.namaPC || 'PP FSP RTMM-SPSI').toUpperCase(),
    alamat: c.alamat || '',
    nomor,
    baris,
    fs,
    qrTeks: 'KUITANSI COS|' + nomor + '|' + namaPUK + '|' + periode + '|' + (i.total || 0) + '|' + (i.status || ''),
    jumlahTeks,
    jumlahPt,
    ttdTgl: [c.kota, fmtTgl(tglCetak(i))].filter(Boolean).join(', '),
    jabatan: c.jabatan || 'Bendahara',
    bendahara,
    lebarNama,
    stempel: hitungGambar(d, c.stempel, 140, 100, 26, 22, 'kanan'),
    ttd: hitungGambar(d, c.ttd, 146, 100, 32, 22, 'tengah')
  };
}

const ARGUMEN_SKALA = {
  text: [1, 2],
  rect: [0, 1, 2, 3],
  roundedRect: [0, 1, 2, 3, 4, 5],
  line: [0, 1, 2, 3],
  addImage: [2, 3, 4, 5],
  setLineWidth: [0],
  setFontSize: [0],
  splitTextToSize: [1]
};

function skalaPDF(doc, z) {
  return new Proxy(doc, {
    get(target, nama) {
      const fn = target[nama];
      if (typeof fn !== 'function') return fn;
      const idx = ARGUMEN_SKALA[nama];
      return (...a) => {
        if (idx) idx.forEach(k => { if (typeof a[k] === 'number') a[k] *= z; });
        const hasil = fn.apply(target, a);
        if (nama === 'getTextWidth') return hasil / z;
        return hasil === target ? target : hasil;
      };
    }
  });
}

function buatPDF(pid, key) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const d = skalaPDF(doc, 297 / 210);
  const m = susunKuitansi(d, pid, key);
  const W = 210, H = 148;
  const tengah = W / 2;
  const xLabel = 16, xTitik = 55, xNilai = 59;

  d.setDrawColor(40, 40, 40);
  d.setLineWidth(0.5);
  d.rect(8, 8, W - 16, H - 16);
  d.setLineWidth(0.15);
  d.rect(9.5, 9.5, W - 19, H - 19);

  d.addImage(KOP_PP.src, KOP_PP.tipe, 25, 10.5, 160, 160 * KOP_PP.rasio);

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.text('KUITANSI IURAN COS PP', tengah, 43, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  d.setTextColor(85, 85, 85);
  d.text('No: ' + m.nomor, tengah, 48.5, { align: 'center' });

  m.baris.forEach(b => {
    d.setFontSize(m.fs);
    d.setFont('helvetica', 'normal');
    d.setTextColor(85, 85, 85);
    d.text(b.label, xLabel, b.y);
    d.text(':', xTitik, b.y);
    d.setFont('helvetica', 'bold');
    if (b.label === 'Status') d.setTextColor(21, 128, 61);
    else d.setTextColor(26, 26, 26);
    d.text(b.lines, xNilai, b.y);
  });

  gambarQR(d, m.qrTeks, 16, 92, 28);
  d.setFont('helvetica', 'normal');
  d.setFontSize(6.5);
  d.setTextColor(85, 85, 85);
  d.text('Pindai untuk memeriksa data', 30, 123, { align: 'center' });

  d.setFillColor(248, 249, 250);
  d.setDrawColor(190, 196, 204);
  d.setLineWidth(0.25);
  d.roundedRect(52, 96, 66, 16, 1.8, 1.8, 'FD');
  d.setFontSize(7);
  d.setTextColor(85, 85, 85);
  d.text('JUMLAH DITERIMA', 85, 100.6, { align: 'center' });
  d.setFont('helvetica', 'bold');
  d.setFontSize(m.jumlahPt);
  d.setTextColor(26, 26, 26);
  d.text(m.jumlahTeks, 85, 108.5, { align: 'center' });

  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  d.setTextColor(26, 26, 26);
  if (m.ttdTgl) d.text(m.ttdTgl, 162, 94, { align: 'center' });
  d.text(m.jabatan, 162, 99, { align: 'center' });
  if (m.stempel) d.addImage(m.stempel.src, m.stempel.tipe, m.stempel.x, m.stempel.y, m.stempel.w, m.stempel.h);
  if (m.ttd) d.addImage(m.ttd.src, m.ttd.tipe, m.ttd.x, m.ttd.y, m.ttd.w, m.ttd.h);
  if (m.bendahara) {
    d.setFont('helvetica', 'bold');
    d.setFontSize(10);
    d.text(m.bendahara, 162, 125, { align: 'center' });
    d.setDrawColor(26, 26, 26);
    d.setLineWidth(0.25);
    d.line(162 - m.lebarNama / 2, 126, 162 + m.lebarNama / 2, 126);
  }
  return doc;
}

function dataKuitansi(pid, key) {
  return (S.iuran[pid] || {})[key];
}

function teksBagikanKuitansi(pid, key) {
  const i = (S.iuran[pid] || {})[key] || {};
  const nama = (S.puk[pid] || {}).namaPerusahaan || '';
  return 'Kuitansi iuran COS PUK ' + nama + ' periode ' + labelPeriode(key) + '\nNo: ' + (i.nomorKuitansi || '-');
}

function namaBerkasKuitansi(pid, key, ext) {
  const nama = ((S.puk[pid] || {}).namaPerusahaan || 'PUK').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return 'Kuitansi-COS-' + nama + '-' + key + '.' + ext;
}

function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function unduhKuitansi(pid, key) {
  try {
    buatPDF(pid, key).save(namaBerkasKuitansi(pid, key, 'pdf'));
  } catch (e) {
    toast('Gagal membuat PDF: ' + pesan(e));
  }
}

const mm = v => (v * PX).toFixed(2) + 'px';

function elTeks(teks, x, y, pt, o) {
  o = o || {};
  const fs = pt * PT;
  const gaya = [
    'left:' + mm(x),
    'top:' + (y * PX - fs * 0.92).toFixed(2) + 'px',
    'font-size:' + fs.toFixed(2) + 'px',
    'color:' + (o.warna || '#1a1a1a')
  ];
  if (o.tebal) gaya.push('font-weight:700');
  if (o.tengah) gaya.push('transform:translateX(-50%)', 'text-align:center');
  const isi = Array.isArray(teks) ? teks.map(esc).join('<br>') : esc(teks);
  return '<div class="kt" style="' + gaya.join(';') + '">' + isi + '</div>';
}

function elKotak(x, y, w, h, gaya) {
  return '<div class="kb" style="left:' + mm(x) + ';top:' + mm(y) + ';width:' + mm(w) + ';height:' + mm(h) + ';' + gaya + '"></div>';
}

function elGambar(g) {
  if (!g) return '';
  return '<img class="kb" alt="" src="' + g.src + '" style="left:' + mm(g.x) + ';top:' + mm(g.y) + ';width:' + mm(g.w) + ';height:' + mm(g.h) + '">';
}

function htmlKertas(m) {
  const abu = '#555555';
  const h = [];
  h.push(elKotak(8, 8, 194, 132, 'border:2px solid #282828'));
  h.push(elKotak(9.5, 9.5, 191, 129, 'border:1px solid #282828'));
  h.push(elGambar({ src: KOP_PP.src, x: 25, y: 10.5, w: 160, h: 160 * KOP_PP.rasio }));
  h.push(elTeks('KUITANSI IURAN COS PP', 105, 43, 13, { tebal: true, tengah: true }));
  h.push(elTeks('No: ' + m.nomor, 105, 48.5, 9, { warna: abu, tengah: true }));
  m.baris.forEach(b => {
    h.push(elTeks(b.label, 16, b.y, m.fs, { warna: abu }));
    h.push(elTeks(':', 55, b.y, m.fs, { warna: abu }));
    h.push(elTeks(b.lines, 59, b.y, m.fs, { tebal: true, warna: b.label === 'Status' ? '#15803d' : '#1a1a1a' }));
  });
  h.push('<img class="kb" alt="" src="' + urlQR(m.qrTeks) + '" style="left:' + mm(16) + ';top:' + mm(92) + ';width:' + mm(28) + ';height:' + mm(28) + '">');
  h.push(elTeks('Pindai untuk memeriksa data', 30, 123, 6.5, { warna: abu, tengah: true }));
  h.push(elKotak(52, 96, 66, 16, 'background:#f8f9fa;border:1px solid #bec4cc;border-radius:7px'));
  h.push(elTeks('JUMLAH DITERIMA', 85, 100.6, 7, { warna: abu, tengah: true }));
  h.push(elTeks(m.jumlahTeks, 85, 108.5, m.jumlahPt, { tebal: true, tengah: true }));
  if (m.ttdTgl) h.push(elTeks(m.ttdTgl, 162, 94, 9, { tengah: true }));
  h.push(elTeks(m.jabatan, 162, 99, 9, { tengah: true }));
  h.push(elGambar(m.stempel));
  h.push(elGambar(m.ttd));
  if (m.bendahara) {
    h.push(elTeks(m.bendahara, 162, 125, 10, { tebal: true, tengah: true }));
    h.push(elKotak(162 - m.lebarNama / 2, 125.9, m.lebarNama, 0.25, 'background:#1a1a1a'));
  }
  return '<div class="kertas" id="pvKertas">' + h.join('') + '</div>';
}

const GAYA_PRATINJAU = `
.pv-buka{overflow:hidden}
.pv-ov{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:#10243b}
.pv-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;padding-top:calc(10px + env(safe-area-inset-top,0px));background:var(--pri);color:#fff;border-bottom:4px solid var(--gold)}
.pv-bar b{font-size:19px}
.pv-x{min-height:48px;padding:8px 20px;font:inherit;font-size:17px;font-weight:700;background:#fff;color:var(--acc);border:3px solid var(--acc);border-radius:10px;cursor:pointer}
.pv-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto}
.pv-wrap{position:relative;flex:none;box-shadow:0 10px 36px rgba(0,0,0,.5)}
.kertas{position:absolute;left:0;top:0;width:840px;height:592px;background:#fff;overflow:hidden;transform-origin:0 0;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a}
.kertas .kt{position:absolute;white-space:nowrap;line-height:1.15;margin:0}
.kertas .kb{position:absolute;display:block;box-sizing:border-box}
.pv-act{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px max(14px,calc((100% - 560px)/2)) calc(14px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid var(--line)}
.pv-act button{display:flex;align-items:center;justify-content:center;gap:10px;min-height:54px;margin:0;padding:12px 10px;font:inherit;font-size:17px;font-weight:700;border-radius:14px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pv-act .pv-wa{grid-column:1/-1;min-height:60px;font-size:19px;background:#25d366;border:0;color:#052e16;box-shadow:0 4px 14px rgba(37,211,102,.38)}
.pv-act .pv-wa:active{background:#1fb858}
.pv-act .pv-wa svg{width:26px;height:26px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pv-act .pv-pdf,.pv-act .pv-foto{background:#fff;border:2px solid var(--pri);color:var(--pri)}
.pv-act .pv-pdf:active,.pv-act .pv-foto:active{background:#e8f0fa}
.pv-act button:disabled{opacity:.6;cursor:wait}
.pv-gudang{position:absolute;left:0;top:0;width:840px;height:592px;z-index:-1;pointer-events:none}
.pv-gudang .kertas{position:relative}
`;

const IKON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 8.5c0 3.3 2.7 6 6 6l1.3-1.6-2-1-.9.8a4 4 0 0 1-1.7-1.7l.8-.9-1-2z"/></svg>';

function pasangGayaPratinjau() {
  if ($('gayaPratinjau')) return;
  const el = document.createElement('style');
  el.id = 'gayaPratinjau';
  el.textContent = GAYA_PRATINJAU;
  document.head.appendChild(el);
}

function skalaKertas() {
  const st = $('pvStage');
  const w = $('pvWrap');
  const k = $('pvKertas');
  if (!st || !w || !k) return;
  const s = Math.max(0.2, Math.min((st.clientWidth - 24) / LEBAR_KERTAS, (st.clientHeight - 24) / TINGGI_KERTAS, 1.5));
  w.style.width = (LEBAR_KERTAS * s).toFixed(1) + 'px';
  w.style.height = (TINGGI_KERTAS * s).toFixed(1) + 'px';
  k.style.transform = 'scale(' + s.toFixed(4) + ')';
}

function tombolEsc(e) {
  if (e.key === 'Escape') tutupPreview();
}

function previewKuitansi(pid, key) {
  if (!dataKuitansi(pid, key)) return toast('Data kuitansi tidak ditemukan');
  if ($('pvOv')) bersihPratinjau();
  pasangGayaPratinjau();
  let m;
  try {
    m = susunKuitansi(new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' }), pid, key);
  } catch (e) {
    return toast('Gagal membuat pratinjau: ' + pesan(e));
  }
  pvAktif = { pid, key };
  const ov = document.createElement('div');
  ov.id = 'pvOv';
  ov.className = 'pv-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Pratinjau kuitansi');
  ov.innerHTML =
    '<div class="pv-bar"><b>Pratinjau Kuitansi</b><button type="button" class="pv-x" onclick="tutupPreview()">Tutup</button></div>' +
    '<div class="pv-stage" id="pvStage"><div class="pv-wrap" id="pvWrap">' + htmlKertas(m) + '</div></div>' +
    '<div class="pv-act">' +
    '<button type="button" class="pv-wa" onclick="bagikanWAPratinjau(this)">' + IKON_WA + '<span>WhatsApp (Foto)</span></button>' +
    '<button type="button" class="pv-pdf" onclick="unduhPDFPratinjau()">Unduh PDF</button>' +
    '<button type="button" class="pv-foto" onclick="unduhFotoPratinjau(this)">Unduh Foto</button>' +
    '</div>';
  document.body.appendChild(ov);
  document.body.classList.add('pv-buka');
  skalaKertas();
  window.addEventListener('resize', skalaKertas);
  document.addEventListener('keydown', tombolEsc);
  try {
    history.pushState({ pratinjau: true }, '');
    pvRiwayat = true;
  } catch (e) {
    pvRiwayat = false;
  }
  window.addEventListener('popstate', tanganiKembali);
  const x = ov.querySelector('.pv-x');
  if (x) x.focus();
  setTimeout(() => {
    if (!pvAktif || pvFoto) return;
    pvFoto = buatFotoBlob();
    pvFoto.catch(() => { pvFoto = null; });
  }, 200);
}

function bersihPratinjau() {
  const ov = $('pvOv');
  if (ov) ov.remove();
  document.body.classList.remove('pv-buka');
  window.removeEventListener('resize', skalaKertas);
  document.removeEventListener('keydown', tombolEsc);
  window.removeEventListener('popstate', tanganiKembali);
  pvAktif = null;
  pvFoto = null;
  pvRiwayat = false;
}

function tanganiKembali() {
  if ($('pvOv')) bersihPratinjau();
}

function tutupPreview() {
  if (pvRiwayat && history.state && history.state.pratinjau) {
    history.back();
    setTimeout(() => {
      if ($('pvOv')) bersihPratinjau();
    }, 500);
    return;
  }
  bersihPratinjau();
}

function fotoDariKertas(sumber) {
  if (!window.html2canvas) return Promise.reject(new Error('Pustaka foto belum dimuat'));
  const gudang = document.createElement('div');
  gudang.className = 'pv-gudang';
  const salin = sumber.cloneNode(true);
  salin.removeAttribute('id');
  salin.style.transform = 'none';
  gudang.appendChild(salin);
  document.body.appendChild(gudang);
  return window.html2canvas(salin, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
    .then(cv => new Promise((ok, gagal) => {
      cv.toBlob(b => (b ? ok(b) : gagal(new Error('Foto gagal dibuat'))), 'image/png');
    }))
    .finally(() => gudang.remove());
}

function buatFotoBlob() {
  const sumber = $('pvKertas');
  if (!sumber) return Promise.reject(new Error('Pratinjau tidak aktif'));
  return fotoDariKertas(sumber);
}

function unduhFotoRiwayat(pid, key) {
  if (!dataKuitansi(pid, key)) return toast('Data kuitansi tidak ditemukan');
  return jalankan(async () => {
    pasangGayaPratinjau();
    const m = susunKuitansi(new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' }), pid, key);
    const wadah = document.createElement('div');
    wadah.innerHTML = htmlKertas(m);
    const blob = await fotoDariKertas(wadah.firstChild);
    unduhBlob(blob, namaBerkasKuitansi(pid, key, 'png'));
  }, 'Foto kuitansi tersimpan');
}

function ambilFoto() {
  if (!pvFoto) {
    pvFoto = buatFotoBlob();
    pvFoto.catch(() => { pvFoto = null; });
  }
  return pvFoto;
}

async function denganTombol(tombol, fn) {
  const label = tombol.innerHTML;
  tombol.disabled = true;
  tombol.textContent = 'Menyiapkan...';
  try {
    await fn();
  } catch (e) {
    toast('Gagal: ' + pesan(e));
  } finally {
    tombol.disabled = false;
    tombol.innerHTML = label;
  }
}

function unduhPDFPratinjau() {
  if (pvAktif) unduhKuitansi(pvAktif.pid, pvAktif.key);
}

function unduhFotoPratinjau(tombol) {
  if (!pvAktif) return;
  const { pid, key } = pvAktif;
  denganTombol(tombol, async () => {
    const blob = await ambilFoto();
    unduhBlob(blob, namaBerkasKuitansi(pid, key, 'png'));
  });
}

function bagikanWAPratinjau(tombol) {
  if (!pvAktif) return;
  const { pid, key } = pvAktif;
  const teks = teksBagikanKuitansi(pid, key);
  denganTombol(tombol, async () => {
    const blob = await ambilFoto();
    const berkas = new File([blob], namaBerkasKuitansi(pid, key, 'png'), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [berkas] })) {
      try {
        await navigator.share({ files: [berkas], title: 'Kuitansi Iuran COS', text: teks });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    unduhBlob(blob, berkas.name);
    toast('Foto tersimpan. Lampirkan di WhatsApp.');
    setTimeout(() => { window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank'); }, 700);
  });
}

function kirimPDFWA(tombol, pid, key) {
  if (!dataKuitansi(pid, key)) return toast('Data kuitansi tidak ditemukan');
  const teks = teksBagikanKuitansi(pid, key);
  denganTombol(tombol, async () => {
    const blob = buatPDF(pid, key).output('blob');
    const berkas = new File([blob], namaBerkasKuitansi(pid, key, 'pdf'), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [berkas] })) {
      try {
        await navigator.share({ files: [berkas], title: 'Kuitansi Iuran COS', text: teks });
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
