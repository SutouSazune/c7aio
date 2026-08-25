// C7AIO Firebase Configuration & Shared State Management
// Firebase 9 Compat Architecture

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDummyKeyForC7AIO-ConfigSafe",
  authDomain: "c7aio-hub.firebaseapp.com",
  databaseURL: "https://c7aio-hub-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "c7aio-hub",
  storageBucket: "c7aio-hub.appspot.com",
  messagingSenderId: "1029384756",
  appId: "1:1029384756:web:abcdef123456"
};

let isFirebaseInitialized = false;
let databaseRef = null;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    databaseRef = firebase.database();
    isFirebaseInitialized = true;
    console.log('🔥 [Firebase] Khởi tạo thành công Firebase Database');
  } else {
    console.warn('⚠️ [Firebase] Thư viện SDK chưa được nạp, hệ thống sẽ chạy ở chế độ Local Storage');
  }
} catch (error) {
  console.warn('⚠️ [Firebase] Khởi tạo thất bại, tự động chuyển sang Offline LocalStorage Fallback', error);
  isFirebaseInitialized = false;
}

function getDatabaseRef() {
  return (isFirebaseInitialized && databaseRef) ? databaseRef : null;
}

function isRealtimeConnected() {
  return isFirebaseInitialized && databaseRef !== null;
}
