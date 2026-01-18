// Firebase Configuration
// Hướng dẫn setup:
// 1. Vào https://firebase.google.com
// 2. Tạo project mới
// 3. Thêm Web App
// 4. Sao chép config dưới đây từ Firebase Console

const firebaseConfig = {
  apiKey: "AIzaSyB_YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Khởi tạo Firebase (QUAN TRỌNG: Nếu thiếu dòng này, app sẽ không kết nối được)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Import Firebase từ CDN (tự động loaded trong HTML)
// Bạn chỉ cần thay đổi config ở trên bằng dữ liệu thực từ Firebase Console

console.log('📚 Firebase Config loaded');
