const firebaseConfig = {
  apiKey: "AIzaSyATYJUkUUDLHpmgpvGhBQea34xFjVOfwEA",
  authDomain: "cos-pp.firebaseapp.com",
  databaseURL: "https://cos-pp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cos-pp",
  storageBucket: "cos-pp.firebasestorage.app",
  messagingSenderId: "217903083514",
  appId: "1:217903083514:web:38100df87862eee8bf7e43"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
