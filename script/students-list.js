// Danh sách học sinh lớp 10A1
// Bạn có thể thêm/xóa tên ở đây

const STUDENTS = [
  { id: 1, name: "Nguyễn Văn A", dob: "2009-01-15", role: "student" },
  { id: 2, name: "Trần Thị B", dob: "2008-12-20", role: "student" },
  { id: 3, name: "Lê Văn C", dob: "2009-03-10", role: "student" },
  { id: 4, name: "Phạm Thị D", dob: "2009-05-05", role: "student" },
  { id: 5, name: "Hoàng Văn E", dob: "2008-11-30", role: "student" },
  { id: 6, name: "Đỗ Thị F", dob: "2009-02-14", role: "student" },
  { id: 7, name: "Vũ Văn G", dob: "2009-06-22", role: "student" },
  { id: 8, name: "Bùi Thị H", dob: "2008-10-08", role: "student" },
  { id: 9, name: "Dương Văn I", dob: "2009-04-18", role: "student" },
  { id: 10, name: "Tô Thị J", dob: "2009-07-25", role: "student" },
  { id: 11, name: "Ngô Văn K", dob: "2008-09-12", role: "student" },
  { id: 12, name: "Mai Thị L", dob: "2009-08-03", role: "student" },
  { id: 13, name: "Cao Văn M", dob: "2009-01-28", role: "student" },
  { id: 14, name: "Sơn Thị N", dob: "2008-12-09", role: "student" },
  { id: 15, name: "Tín Văn O", dob: "2009-05-16", role: "student" }
];

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
