// Firebase Configuration
// Hướng dẫn setup:
// 1. Vào https://firebase.google.com
// 2. Tạo project mới
// 3. Thêm Web App
// 4. Sao chép config dưới đây từ Firebase Console

const firebaseConfig = {
  apiKey: "AIzaSyBXkiJDkHeTSjztzXd3SlbCr64mVl8Ulv8",
  authDomain: "c7aio-26d04.firebaseapp.com",
  projectId: "c7aio-26d04",
  databaseURL: "https://c7aio-26d04-default-rtdb.asia-southeast1.firebasedatabase.app/",
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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  
  // Test kết nối để chắc chắn mọi thứ hoạt động
  const testDb = firebase.database();
  testDb.ref(".info/connected").on("value", (snap) => {
    if (snap.val() === true) {
      console.log("🟢 Đã kết nối tới Firebase Realtime Database thành công!");
    } else if (isConfigured) {
      console.log("⚪ Đang thử kết nối tới Firebase...");
    }
  });
}

// Import Firebase từ CDN (tự động loaded trong HTML)
// Bạn chỉ cần thay đổi config ở trên bằng dữ liệu thực từ Firebase Console

console.log('📚 Firebase Config loaded');
