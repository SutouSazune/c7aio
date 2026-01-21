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
