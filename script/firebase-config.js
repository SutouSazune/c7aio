// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXkiJDkHeTSjztzXd3SlbCr64mVl8Ulv8",
  authDomain: "c7aio-26d04.firebaseapp.com",
  databaseURL: "https://c7aio-26d04-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "c7aio-26d04",
  storageBucket: "c7aio-26d04.firebasestorage.app",
  messagingSenderId: "195002194470",
  appId: "1:195002194470:web:b2091db3b69e6ce116a4e7",
  measurementId: "G-KWSG5GJMTH"
};

const isConfigured = firebaseConfig.apiKey && firebaseConfig.databaseURL;

if (!isConfigured) {
  console.error("❌ CHƯA CẤU HÌNH FIREBASE: Vui lòng cập nhật file script/firebase-config.js");
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  
  const testDb = firebase.database();
  testDb.ref(".info/connected").on("value", (snap) => {
    if (snap.val() === true) {
      console.log("🟢 Đã kết nối tới Firebase Realtime Database thành công!");
    } else if (isConfigured) {
      console.log("⚪ Đang thử kết nối tới Firebase...");
    }
  });
}

console.log('📚 Firebase Config loaded');
