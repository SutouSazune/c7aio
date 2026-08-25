// Firebase Configuration for C7AIO (Compat mode)
// Shared Realtime Database for all students & managers

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForC7AIOAppDevelopment2026",
  authDomain: "c7aio-26d04.firebaseapp.com",
  databaseURL: "https://c7aio-26d04-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "c7aio-26d04",
  storageBucket: "c7aio-26d04.appspot.com",
  messagingSenderId: "109876543210",
  appId: "1:109876543210:web:abcdef1234567890"
};

// Initialize Firebase once
let app;
let database;
let auth;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps || !firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    database = firebase.database();
    auth = firebase.auth();
    console.log('🔥 Firebase Initialized Successfully');
  }
} catch (e) {
  console.warn('⚠️ Firebase init warning (running in offline/local fallback):', e);
}
