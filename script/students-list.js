// Biến toàn cục chứa danh sách học sinh hiện tại
// Khởi tạo từ Cache (localStorage) để hỗ trợ Offline ngay lập tức
// Nếu chưa có cache (lần đầu truy cập), sẽ là mảng rỗng và chờ Firebase tải về
let STUDENTS = JSON.parse(localStorage.getItem('c7aio_students_cache')) || [];

// Admin object - có mã bảo mật
const ADMIN = {
  id: 0,
  name: "👨‍💼 Admin",
  role: "admin",
  code: "admin123" // Mã admin mặc định, có thể thay đổi
};

// Lấy current user từ localStorage
function getCurrentUser() {
  const user = localStorage.getItem('c7aio_currentUser');
  return user ? JSON.parse(user) : null;
}

// Lưu current user
function setCurrentUser(user) {
  localStorage.setItem('c7aio_currentUser', JSON.stringify(user));
  localStorage.setItem('c7aio_loginTime', new Date().toISOString());
}

// Đăng xuất
function logoutUser() {
  localStorage.removeItem('c7aio_currentUser');
  localStorage.removeItem('c7aio_loginTime');
}

// Kiểm tra user là admin
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// Kiểm tra user đã login
function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Lấy thời gian đăng nhập
function getLoginTime() {
  const time = localStorage.getItem('c7aio_loginTime');
  return time ? new Date(time) : null;
}
