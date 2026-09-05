// C7AIO Students & Permissions Management Module
// Danh sách học sinh, xác thực đăng nhập, phân quyền hệ thống

const CURRENT_CLASS_VERSION = '11C7_2026_2027';

const DEFAULT_STUDENTS = [
  { id: 1, name: "Đoàn Trần Đức Anh", role: ["student"], dob: "2010-07-24", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 2, name: "Nguyễn Ngọc Thiên Ân", role: ["student"], dob: "2010-01-16", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C9", note: "" },
  { id: 3, name: "Nguyễn Anh Bi", role: ["student"], dob: "2010-11-14", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 4, name: "Lê Thành Công", role: ["student"], dob: "2010-08-25", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 5, name: "Lê Quang Dũng", role: ["student"], dob: "2010-04-09", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 6, name: "Nguyễn Duy Dũng", role: ["student"], dob: "2010-07-19", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 7, name: "Thổ Gia Hiếu", role: ["student"], dob: "2010-09-27", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 8, name: "Nguyễn Viết Hoàng", role: ["student"], dob: "2010-01-12", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 9, name: "Lê Đại Hùng", role: ["student"], dob: "2010-10-19", gender: "Nam", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 10, name: "Hoàng Ngọc Hương", role: ["student"], dob: "2010-04-24", gender: "Nữ", phone: "", email: "", group: 1, previousClass: "10C7", note: "" },
  { id: 11, name: "Phạm Quang Huy", role: ["student"], dob: "2010-03-20", gender: "Nam", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 12, name: "Phạm Hoàng Khôi", role: ["student"], dob: "2010-10-27", gender: "Nam", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 13, name: "Nguyễn Đoàn Thiên Kim", role: ["student"], dob: "2010-12-13", gender: "Nữ", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 14, name: "Đào Khánh Linh", role: ["student"], dob: "2010-01-16", gender: "Nữ", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 15, name: "Dương Khánh Linh", role: ["student"], dob: "2010-11-02", gender: "Nữ", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 16, name: "Lê Kim Long", role: ["student"], dob: "2010-08-26", gender: "Nam", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 17, name: "Bùi Quốc Minh", role: ["student"], dob: "2010-05-22", gender: "Nam", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 18, name: "Trần Nguyễn Trà My", role: ["student"], dob: "2010-02-18", gender: "Nữ", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 19, name: "Trần Ngọc Kim Ngân", role: ["student"], dob: "2010-09-08", gender: "Nữ", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 20, name: "Lê Bảo Ngọc", role: ["student"], dob: "2010-05-26", gender: "Nữ", phone: "", email: "", group: 2, previousClass: "10C7", note: "" },
  { id: 21, name: "Trương Minh Nguyên", role: ["student"], dob: "2010-01-20", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 22, name: "Vũ Khôi Nguyên", role: ["student"], dob: "2010-07-25", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 23, name: "Huỳnh Hiếu Nhã", role: ["student"], dob: "2010-08-22", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 24, name: "Dương Thanh Nhàn", role: ["student"], dob: "2010-10-31", gender: "Nữ", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 25, name: "Nguyễn Lê Trọng Nhân", role: ["student"], dob: "2010-03-26", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 26, name: "Nguyễn Đình Tuấn Nhật", role: ["student"], dob: "2010-09-17", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 27, name: "Nguyễn Ngọc Yến Nhi", role: ["student"], dob: "2010-03-30", gender: "Nữ", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 28, name: "Đinh Minh Phát", role: ["student"], dob: "2010-09-01", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 29, name: "Trịnh Minh Phúc", role: ["student"], dob: "2010-01-04", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 30, name: "Nguyễn Đắc Minh Quân", role: ["student"], dob: "2010-11-24", gender: "Nam", phone: "", email: "", group: 3, previousClass: "10C7", note: "" },
  { id: 31, name: "Nguyễn Mai Quyên", role: ["student"], dob: "2010-04-08", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 32, name: "Việt Vũ Thành", role: ["student"], dob: "2010-10-09", gender: "Nam", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 33, name: "Lê Ngọc Anh Thư", role: ["student"], dob: "2010-04-26", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 34, name: "Nguyễn Thùy Trâm", role: ["student"], dob: "2010-03-16", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 35, name: "Huỳnh Bảo Trân", role: ["student"], dob: "2010-11-22", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 36, name: "Lê Khánh Trang", role: ["student"], dob: "2010-06-23", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 37, name: "Nguyễn Phú Trọng", role: ["student"], dob: "2010-06-25", gender: "Nam", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 38, name: "Nguyễn Minh Trường", role: ["student"], dob: "2010-02-15", gender: "Nam", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 39, name: "Đoàn Ngọc Thanh Vy", role: ["student"], dob: "2010-10-02", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C7", note: "" },
  { id: 40, name: "Trần Thảo Vy", role: ["student"], dob: "2010-09-29", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C9", note: "" },
  { id: 41, name: "Trịnh Thị Như Ý", role: ["student"], dob: "2010-01-27", gender: "Nữ", phone: "", email: "", group: 4, previousClass: "10C7", note: "" }
];

let storedVersion = (typeof localStorage !== 'undefined') ? localStorage.getItem('c7aio_class_version') : null;
let STUDENTS = DEFAULT_STUDENTS;
if (typeof localStorage !== 'undefined') {
  if (storedVersion === CURRENT_CLASS_VERSION) {
    const cached = localStorage.getItem('c7aio_students_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) STUDENTS = parsed;
      } catch (e) {
        STUDENTS = DEFAULT_STUDENTS;
      }
    }
  } else {
    localStorage.setItem('c7aio_class_version', CURRENT_CLASS_VERSION);
    localStorage.setItem('c7aio_students_cache', JSON.stringify(DEFAULT_STUDENTS));
  }
}

// Cấu hình danh mục chức vụ (Mặc định + Tùy chỉnh)
const DEFAULT_ROLES = {
  'admin': '👨‍💼 Quản trị viên (Admin)',
  'monitor': '⭐️ Lớp trưởng',
  'secretary': '🔥 Bí thư chi đoàn',
  'vice_study': '📚 Lớp phó học tập',
  'vice_labor': '🧹 Lớp phó lao động',
  'vice_art': '🎭 Lớp phó văn thể mỹ',
  'vice_subject': '📝 Lớp phó bộ môn',
  'treasurer': '💰 Thủ quỹ',
  'group_leader': '👥 Tổ trưởng',
  'student': '👤 Học sinh'
};

const DEFAULT_ROLE_COLORS = {
  'admin': '#ef4444',
  'monitor': '#f59e0b',
  'secretary': '#ec4899',
  'vice_study': '#3b82f6',
  'vice_labor': '#10b981',
  'vice_art': '#8b5cf6',
  'vice_subject': '#06b6d4',
  'treasurer': '#14b8a6',
  'group_leader': '#6366f1',
  'student': '#64748b'
};

let ROLES = { ...DEFAULT_ROLES };
let ROLE_COLORS = { ...DEFAULT_ROLE_COLORS };

function applyCustomRoles(customRolesObj) {
  ROLES = { ...DEFAULT_ROLES };
  ROLE_COLORS = { ...DEFAULT_ROLE_COLORS };
  if (customRolesObj && typeof customRolesObj === 'object') {
    for (const [key, item] of Object.entries(customRolesObj)) {
      if (item) {
        if (item.deleted) {
          delete ROLES[key];
          delete ROLE_COLORS[key];
        } else if (item.name) {
          ROLES[key] = item.name;
          ROLE_COLORS[key] = item.color || '#8b5cf6';
        }
      }
    }
  }
}

try {
  const cachedCustomRoles = JSON.parse(localStorage.getItem('c7aio_custom_roles_cache') || '{}');
  applyCustomRoles(cachedCustomRoles);
} catch (e) {}

// Cấu hình các quyền hạn trong hệ thống
const PERMISSIONS = {
  'manage_students': 'Quản lý Hồ sơ học sinh',
  'manage_tasks': 'Giao & Quản lý nhiệm vụ',
  'manage_schedule': 'Quản lý Thời khóa biểu',
  'manage_notifications': 'Đăng & Quản lý thông báo',
  'manage_roles': 'Điều hành Phân quyền',
  'manage_seating': 'Chỉnh sửa Sơ Đồ Lớp',
  'view_logs': 'Xem Nhật ký hoạt động'
};

// Cấu hình phân quyền mặc định
let ROLE_PERMISSIONS_CONFIG = {
  'admin': Object.keys(PERMISSIONS),
  'monitor': ['manage_tasks', 'manage_schedule', 'manage_notifications', 'manage_students', 'view_logs'],
  'secretary': ['manage_tasks', 'manage_notifications'],
  'vice_study': ['manage_tasks', 'manage_schedule', 'manage_notifications'],
  'vice_labor': ['manage_tasks'],
  'vice_art': ['manage_tasks'],
  'vice_subject': ['manage_tasks'],
  'treasurer': ['manage_tasks', 'manage_notifications'],
  'group_leader': ['manage_tasks'],
  'student': []
};

// Load quyền hạn từ cache nếu có
const cachedPerms = localStorage.getItem('c7aio_permissions_cache');
if (cachedPerms) {
  try {
    ROLE_PERMISSIONS_CONFIG = JSON.parse(cachedPerms);
  } catch (e) {
    console.error('Lỗi parse permissions cache', e);
  }
}

/**
 * Xử lý đăng nhập
 */
function loginUser(name, secret) {
  if (!name || !secret) return null;
  const cleanName = name.trim().toLowerCase();
  const cleanSecret = secret.trim().toLowerCase();

  // 1. Kiểm tra Admin
  if (cleanName === 'admin' || cleanName === 'quản trị viên' || cleanName.includes('admin')) {
    const validCodes = ['11c7', '10c7', 'admin', 'admin11c7', 'admin10c7', 'admin123'];
    if (validCodes.includes(cleanSecret)) {
      const adminObj = {
        id: 0,
        name: "Quản trị viên (Admin)",
        role: ["admin"],
        group: 0,
        isAdmin: true
      };
      setCurrentUser(adminObj);
      return adminObj;
    }
    return null;
  }

  // 2. Kiểm tra Học sinh
  const student = STUDENTS.find(s => s.name.toLowerCase() === cleanName);
  if (!student) return null;

  // Chuẩn hóa ngày sinh so sánh (YYYY-MM-DD, DD/MM/YYYY, hoặc chuỗi số liền)
  const studentDob = (student.dob || '').trim();
  const matchesDob = (studentDob === secret.trim()) ||
                     (studentDob.replace(/-/g, '') === secret.trim().replace(/[\/-]/g, '')) ||
                     (formatDateIsoToVn(studentDob) === secret.trim());

  if (matchesDob) {
    const userObj = {
      id: student.id,
      name: student.name,
      dob: student.dob,
      role: Array.isArray(student.role) ? student.role : [student.role || 'student'],
      group: student.group || 1,
      gender: student.gender || 'Nam',
      phone: student.phone || '',
      email: student.email || '',
      previousClass: student.previousClass || '10C7',
      note: student.note || ''
    };
    setCurrentUser(userObj);
    return userObj;
  }
  return null;
}

function formatDateIsoToVn(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

// User state helpers
function getCurrentUser() {
  const user = localStorage.getItem('c7aio_currentUser');
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('c7aio_currentUser', JSON.stringify(user));
  localStorage.setItem('c7aio_loginTime', new Date().toISOString());
}

function logoutUser() {
  localStorage.removeItem('c7aio_currentUser');
  localStorage.removeItem('c7aio_loginTime');
}

function isAdmin() {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.id === 0 || user.role === 'admin' || (Array.isArray(user.role) && user.role.includes('admin'))) return true;
  return false;
}

function checkPermission(permissionCode) {
  const user = getCurrentUser();
  if (!user) return false;
  if (isAdmin()) return true;

  const userRoles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
  return userRoles.some(role => {
    const allowedPerms = ROLE_PERMISSIONS_CONFIG[role] || [];
    return allowedPerms.includes(permissionCode);
  });
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

function getLoginTime() {
  const time = localStorage.getItem('c7aio_loginTime');
  return time ? new Date(time) : null;
}

// UI Helper: Lấy chữ cái đầu & màu Avatar
function getInitials(name) {
  if (!name) return 'HS';
  // Loại bỏ emoji, dấu ngoặc và ký tự đặc biệt tránh lỗi surrogate unicode
  const clean = name.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\(\)\[\]{}.,:;!?@#$%^&*_=+\-\/\\]/gu, ' ').trim().replace(/\s+/g, ' ');
  if (!clean) return 'AD';
  const parts = clean.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarGradient(name) {
  const colors = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
    'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
    'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
