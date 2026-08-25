// C7AIO Students & Permissions Management Module
// Danh sách học sinh, xác thực đăng nhập, phân quyền hệ thống

const DEFAULT_STUDENTS = [
  { id: 1, name: "Nguyễn Văn An", role: ["monitor"], dob: "2008-01-15", gender: "Nam", phone: "0901234567", email: "an.nv@c7.edu.vn", group: 1 },
  { id: 2, name: "Trần Thị Bích", role: ["secretary"], dob: "2008-03-22", gender: "Nữ", phone: "0902345678", email: "bich.tt@c7.edu.vn", group: 1 },
  { id: 3, name: "Lê Hoàng Cường", role: ["vice_study"], dob: "2008-05-10", gender: "Nam", phone: "0903456789", email: "cuong.lh@c7.edu.vn", group: 2 },
  { id: 4, name: "Phạm Ngọc Dung", role: ["treasurer"], dob: "2008-07-18", gender: "Nữ", phone: "0904567890", email: "dung.pn@c7.edu.vn", group: 2 },
  { id: 5, name: "Vũ Minh Đức", role: ["vice_labor"], dob: "2008-09-05", gender: "Nam", phone: "0905678901", email: "duc.vm@c7.edu.vn", group: 3 },
  { id: 6, name: "Đặng Thu Hà", role: ["vice_art"], dob: "2008-11-12", gender: "Nữ", phone: "0906789012", email: "ha.dt@c7.edu.vn", group: 3 },
  { id: 7, name: "Hoàng Gia Huy", role: ["group_leader"], dob: "2008-02-28", gender: "Nam", phone: "0907890123", email: "huy.hg@c7.edu.vn", group: 4 },
  { id: 8, name: "Bùi Khánh Linh", role: ["vice_subject"], dob: "2008-04-14", gender: "Nữ", phone: "0908901234", email: "linh.bk@c7.edu.vn", group: 4 },
  { id: 9, name: "Đỗ Quốc Nam", role: ["student"], dob: "2008-06-30", gender: "Nam", phone: "0909012345", email: "nam.dq@c7.edu.vn", group: 1 },
  { id: 10, name: "Ngô Phương Thảo", role: ["student"], dob: "2008-08-25", gender: "Nữ", phone: "0910123456", email: "thao.np@c7.edu.vn", group: 2 }
];

let STUDENTS = JSON.parse(localStorage.getItem('c7aio_students_cache')) || DEFAULT_STUDENTS;

// Cấu hình danh mục chức vụ
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
  'student': '👤 Học sinh'
};

const ROLE_COLORS = {
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

// Cấu hình các quyền hạn trong hệ thống
const PERMISSIONS = {
  'manage_students': 'Quản lý Hồ sơ học sinh',
  'manage_tasks': 'Giao & Quản lý nhiệm vụ',
  'manage_schedule': 'Quản lý Thời khóa biểu',
  'manage_notifications': 'Đăng & Quản lý thông báo',
  'manage_roles': 'Điều hành Phân quyền',
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
    const validCodes = ['10c7', 'admin', 'admin10c7', 'admin123'];
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
      email: student.email || ''
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
  const parts = name.trim().split(' ');
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