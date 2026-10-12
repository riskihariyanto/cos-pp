const $ = id => document.getElementById(id);

const ribuan = v => {
  const digit = (typeof v === 'number' ? String(Math.round(Math.abs(v))) : String(v == null ? '' : v))
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 13);
  return digit.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const angka = v => Number(String(v == null ? '' : v).replace(/\D/g, '')) || 0;

const rp = n => {
  const x = Math.round(Number(n) || 0);
  return (x < 0 ? '-' : '') + 'Rp ' + (ribuan(Math.abs(x)) || '0');
};

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const periodeKey = (t, b) => t + '-' + String(b).padStart(2, '0');

const labelPeriode = key => {
  const [t, b] = key.split('-');
  return BULAN[+b - 1] + ' ' + t;
};

const fmtTgl = iso => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return +d + ' ' + BULAN[+m - 1] + ' ' + y;
};

const badge = st => '<span class="badge b-' + st.split(' ')[0] + '">' + esc(st) + '</span>';

let toastTimer;

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

function busy(on) {
  $('busy').hidden = !on;
}

function pesan(e) {
  const c = (e && e.code) || '';
  if (/invalid-credential|user-not-found|wrong-password|invalid-email/.test(c)) return 'Email atau sandi salah';
  if (c === 'auth/email-already-in-use') return 'Email sudah terdaftar';
  if (c === 'auth/weak-password') return 'Sandi terlalu lemah';
  if (/PERMISSION_DENIED/.test((e && e.message) || '')) return 'Akses ditolak oleh aturan database';
  return (e && e.message) || String(e);
}

async function jalankan(fn, ok) {
  busy(true);
  try {
    const r = await fn();
    if (ok) toast(ok);
    return r;
  } catch (e) {
    toast('Gagal: ' + pesan(e));
  } finally {
    busy(false);
  }
}

function terbilang(n) {
  const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  n = Math.floor(n);
  if (n < 12) return s[n];
  if (n < 20) return terbilang(n - 10) + ' belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
  if (n < 200) return 'seratus' + (n % 100 ? ' ' + terbilang(n - 100) : '');
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + terbilang(n - 1000) : '');
  const unit = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']];
  for (const [v, nama] of unit) {
    if (n >= v) return terbilang(Math.floor(n / v)) + ' ' + nama + (n % v ? ' ' + terbilang(n % v) : '');
  }
  return '';
}

function terbilangRupiah(n) {
  const t = n === 0 ? 'nol' : terbilang(n);
  return t.charAt(0).toUpperCase() + t.slice(1) + ' rupiah';
}
