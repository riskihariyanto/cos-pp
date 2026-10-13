auth.onAuthStateChanged(async user => {
  detach();
  resetData();
  if (!user) {
    $('appView').hidden = true;
    $('loginView').hidden = false;
    return;
  }
  try {
    const snap = await db.ref('users/' + user.uid).once('value');
    const p = snap.val();
    if (!p) {
      toast('Akun belum terdaftar di sistem');
      await auth.signOut();
      return;
    }
    const admin = p.role === 'superadmin';
    const puk = p.role === 'puk' && !!p.pukId;
    if (!admin && !puk) {
      toast('Akun ini tidak memiliki akses.');
      await auth.signOut();
      return;
    }
    if (puk && p.aktif === false) {
      toast('Akun PUK ini dinonaktifkan oleh PP.');
      await auth.signOut();
      return;
    }
    S.profile = p;
    S.tab = '';
    attach();
    render();
  } catch (e) {
    toast('Gagal memuat akun: ' + pesan(e));
    await auth.signOut();
  }
});

const DOMAIN_LOGIN = '@gmail.com';

function emailDariId(id) {
  const v = String(id || '').trim().toLowerCase();
  return v.includes('@') ? v : v + DOMAIN_LOGIN;
}

async function doLogin() {
  const id = $('lId').value.trim();
  const p = $('lPass').value;
  if (!id || !p) return toast('Isi nama pengguna dan kata sandi');
  busy(true);
  try {
    await auth.signInWithEmailAndPassword(emailDariId(id), p);
  } catch (e) {
    const salah = /invalid-credential|user-not-found|wrong-password|invalid-email/.test((e && e.code) || '');
    toast(salah ? 'Nama pengguna atau kata sandi salah' : 'Gagal: ' + pesan(e));
  } finally {
    busy(false);
  }
}

function doLogout() {
  auth.signOut();
}
