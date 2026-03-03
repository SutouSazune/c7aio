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

/**
 * Xử lý đăng nhập.
 * - Nếu là Admin, xác thực bằng code.
 * - Nếu là học sinh, xác thực bằng tên và ngày sinh (định dạng YYYY-MM-DD).
 * @param {string} name Tên đăng nhập.
 * @param {string} secret Mật khẩu (code cho admin) hoặc ngày sinh (cho học sinh).
 * @returns {object|null} Trả về đối tượng user nếu thành công, ngược lại trả về null.
 */
function loginUser(name, secret) {
  // 1. Xử lý đăng nhập Admin
  if (name.toLowerCase() === ADMIN.name.toLowerCase() || name.toLowerCase() === 'admin') {
    if (secret === ADMIN.code) {
      console.log('✅ Admin login successful.');
      setCurrentUser(ADMIN);
      return ADMIN;
    } else {
      console.warn('❌ Admin login failed: Incorrect code.');
      return null;
    }
  }

  // 2. Xử lý đăng nhập học sinh
  // Tìm học sinh trong danh sách (không phân biệt hoa thường, bỏ khoảng trắng thừa)
  const student = STUDENTS.find(s => s.name.toLowerCase() === name.trim().toLowerCase());

  // Nếu không tìm thấy học sinh
  if (!student) {
    console.warn(`Login failed: Student "${name}" not found.`);
    return null;
  }

  // Kiểm tra ngày sinh (secret) - phải khớp định dạng YYYY-MM-DD
  if (student.dob === secret) {
    console.log(`✅ Login successful for ${student.name}`);
    setCurrentUser(student);
    return student;
  } else {
    console.warn(`Login failed: Incorrect date of birth for ${student.name}. Provided: ${secret}, Expected: ${student.dob}`);
    return null;
  }
}

// --- CẤU HÌNH CHỨC VỤ & QUYỀN HẠN ---
const ROLES = {
  'admin': '👨‍💼 Quản trị viên (Admin)',
  'monitor': '⭐️ Lớp trưởng',
  'secretary': '🔥 Bí thư chi đoàn',
  'vice_study': '📚 Lớp phó học tập',
  'vice_labor': '🧹 Lớp phó lao động',
  'vice_art': '🎭 Lớp phó văn thể mỹ',
  'vice_subject': '📝 Lớp phó bộ môn',
  'treasurer': '💰 Thủ quỹ',
  'group_leader': '👥 Tổ trưởng',
  'student': '👤 Thành viên'
};

const PERMISSIONS = {
  'manage_students': 'Quản lý Học sinh (Thêm/Sửa/Xóa)',
  'manage_tasks': 'Quản lý Nhiệm vụ (Thêm/Sửa/Xóa)',
  'manage_schedule': 'Quản lý Lịch học (Thêm/Sửa/Xóa)',
  'manage_notifications': 'Quản lý Thông báo',
  'manage_roles': 'Điều hành Quyền hạn (Admin)',
  'view_logs': 'Xem Nhật ký hoạt động'
};

// Lưu trữ cấu hình phân quyền hiện tại (Role -> [Permissions])
// Mặc định Admin có full quyền
let ROLE_PERMISSIONS_CONFIG = {
  'admin': Object.keys(PERMISSIONS),
  'monitor': ['manage_tasks', 'manage_schedule', 'manage_notifications'],
  'secretary': ['manage_tasks', 'manage_notifications'],
  'vice_study': ['manage_tasks', 'manage_schedule'],
  'vice_labor': ['manage_tasks'],
  'vice_art': ['manage_tasks'],
  'vice_subject': ['manage_tasks'],
  'treasurer': ['manage_tasks', 'manage_notifications'],
  'group_leader': [],
  'student': []
};

// Load config từ cache nếu có
const cachedPerms = localStorage.getItem('c7aio_permissions_cache');
if (cachedPerms) {
  ROLE_PERMISSIONS_CONFIG = JSON.parse(cachedPerms);
}

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
  // Admin gốc hoặc user có role là admin
  return user && (user.role === 'admin' || user.id === 0);
}

// Kiểm tra quyền hạn cụ thể
function checkPermission(permissionCode) {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Admin luôn có quyền
  if (user.role === 'admin' || user.id === 0) return true;

  // Chuyển đổi role thành mảng (để hỗ trợ cả dữ liệu cũ là string và mới là array)
  const userRoles = Array.isArray(user.role) ? user.role : [user.role || 'student'];

  // Kiểm tra xem CÓ BẤT KỲ role nào của user sở hữu quyền này không
  return userRoles.some(role => {
    const allowedPerms = ROLE_PERMISSIONS_CONFIG[role] || [];
    return allowedPerms.includes(permissionCode);
  });
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
