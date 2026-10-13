const S = {
  profile: null,
  puk: {},
  iuran: {},
  laporan: {},
  akun: {},
  pengaturan: {},
  tab: '',
  lastTab: '',
  periode: null,
  tahunLap: new Date().getFullYear(),
  tmp: {},
  refs: []
};

const RUTE_PENGATURAN = '#/super-admin-secret-settings';

const isSuperAdmin = () => !!(S.profile && S.profile.role === 'superadmin');

const isPC = () => !!(S.profile && (S.profile.role === 'pc' || S.profile.role === 'superadmin'));

const isPUK = () => !!(S.profile && S.profile.role === 'puk' && S.profile.pukId);

const pengaturanDibuka = () => isPC() && location.hash === RUTE_PENGATURAN;

function resetData() {
  S.profile = null;
  S.puk = {};
  S.iuran = {};
  S.laporan = {};
  S.akun = {};
  S.pengaturan = {};
}

function allIuran() {
  const out = [];
  Object.keys(S.iuran).forEach(pid => {
    const per = S.iuran[pid] || {};
    Object.keys(per).forEach(k => out.push(Object.assign({}, per[k], { pid, key: k })));
  });
  return out;
}

function sortedPUK() {
  return Object.keys(S.puk).sort((a, b) => (S.puk[a].namaPerusahaan || '').localeCompare(S.puk[b].namaPerusahaan || ''));
}

function detach() {
  S.refs.forEach(r => r.off());
  S.refs = [];
}

function listen(path, apply) {
  const r = db.ref(path);
  r.on('value', s => { apply(s.val()); render(); }, e => toast('Gagal memuat data: ' + pesan(e)));
  S.refs.push(r);
}

function attach() {
  listen('pengaturan', v => { S.pengaturan = v || {}; });
  if (isPUK()) {
    const pid = S.profile.pukId;
    listen('puk/' + pid, v => { S.puk = v ? { [pid]: v } : {}; });
    listen('iuran/' + pid, v => { S.iuran = { [pid]: v || {} }; });
    listen('laporanBayar/' + pid, v => { S.laporan = { [pid]: v || {} }; });
    return;
  }
  listen('puk', v => { S.puk = v || {}; });
  listen('iuran', v => { S.iuran = v || {}; });
  listen('laporanBayar', v => { S.laporan = v || {}; });
  listen('users', v => { S.akun = v || {}; });
}
