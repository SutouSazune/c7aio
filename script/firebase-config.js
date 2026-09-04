// Firebase Configuration
// Hướng dẫn setup:
// 1. Vào https://firebase.google.com
// 2. Tạo project mới
// 3. Thêm Web App
// 4. Sao chép config dưới đây từ Firebase Console

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
// --- KIỂM TRA CẤU HÌNH (Tự động báo lỗi nếu chưa thay đổi) ---
const isConfigured = firebaseConfig.apiKey && firebaseConfig.databaseURL;

if (!isConfigured) {
  console.error("❌ CHƯA CẤU HÌNH FIREBASE: Vui lòng cập nhật file script/firebase-config.js");
}

// Khởi tạo Firebase (QUAN TRỌNG: Nếu thiếu dòng này, app sẽ không kết nối được)
var db = null;
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length && isConfigured) {
    firebase.initializeApp(firebaseConfig);
  }
  try {
    db = firebase.database();
    window.db = db;
    
    // Test kết nối
    db.ref(".info/connected").on("value", (snap) => {
      if (snap.val() === true) {
        console.log("🟢 Đã kết nối tới Firebase Realtime Database thành công!");
      } else if (isConfigured) {
        console.log("⚪ Đang thử kết nối tới Firebase...");
      }
    });
  } catch (e) {
    console.error("Firebase Database init error:", e);
  }
}

console.log('📚 Firebase Config loaded');
