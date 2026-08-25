/**
 * C7AIO Students & Roles Data Management
 * Quản lý danh sách học sinh, phân quyền và xác thực
 */

let STUDENTS = JSON.parse(localStorage.getItem('c7aio_students_cache')) || [
  { id: 1, name: "Nguyễn Văn An", dob: "2008-05-12", gender: "Nam", role: ["monitor"], group: 1, phone: "0912345678", email: "an.nguyen@gmail.com" },
  { id: 2, name: "Trần Thị Bích", dob: "2008-08-20", gender: "Nữ", role: ["vice_study"], group: 1, phone: "0923456789", email: "bich.tran@gmail.com" },
  { id: 3, name: "Lê Hoàng Cường", dob: "2008-03-15", gender: "Nam", role: ["secretary"], group: 2, phone: "0934567890", email: "cuong.le@gmail.com" },
  { id: 4, name: "Phạm Thùy Dung", dob: "2008-11-02", gender: "Nữ", role: ["treasurer"], group: 2, phone: "0945678901", email: "dung.pham@gmail.com" },
  { id: 5, name: "Hoàng Minh Đức", dob: "2008-01-25", gender: "Nam", role: ["vice_labor"], group: 3, phone: "0956789012", email: "duc.hoang@gmail.com" },
  { id: 6, name: "Vũ Phương Linh", dob: "2008-09-18", gender: "Nữ", role: ["vice_art"], group: 3, phone: "0967890123", email: "linh.vu@gmail.com" },
  { id: 7, name: "Đỗ Gia Huy", dob: "2008-07-07", gender: "Nam", role: ["group_leader"], group: 1, phone: "0978901234", email: "huy.do@gmail.com" },
  { id: 8, name: "Ngô Khánh Huyền", dob: "2008-12-30", gender: "Nữ", role: ["group_leader"], group: 2, phone: "0989012345", email: "huyen.ngo@gmail.com" },
  { id: 9, name: "Bùi Tuấn Kiệt", dob: "2008-04-14", gender: "Nam", role: ["group_leader"], group: 3, phone: "0990123456", email: "kiet.bui@gmail.com" },
  { id: 10, name: "Đặng Mai Phương", dob: "2008-06-08", gender: "Nữ", role: ["group_leader"], group: 4, phone: "0901234567", email: "phuong.dang@gmail.com" },
  { id: 11, name: "Phan Quốc Bảo", dob: "2008-10-10", gender: "Nam", role: ["student"], group: 1, phone: "", email: "" },
  { id: 12, name: "Trịnh Thảo Nhi", dob: "2008-02-17", gender: "Nữ", role: ["student"], group: 4, phone: "", email: "" }
];

const ROLES = {
  admin: "Quản trị viên (Admin)",
  monitor: "Lớp trưởng",
  vice_study: "Lớp phó học tập",
  vice_labor: "Lớp phó lao động",
  vice_art: "Lớp phó văn thể mỹ",
  secretary: "Bí thư chi đoàn",
  treasurer: "Thủ quỹ",
  group_leader: "Tổ trưởng",
  student: "Học sinh"
};

const ROLE_COLORS = {
  admin: "#ef4444",
  monitor: "#f59e0b",
  vice_study: "#3b82f6",
  secretary: "#ec4899",
  treasurer: "#10b981",
  vice_labor: "#06b6d4",
  vice_art: "#8b5cf6",
  group_leader: "#14b8a6",
  student: "#64748b"
};

const PERMISSIONS = {
  manage_tasks: "Giao & Quản lý nhiệm vụ",
  manage_schedule: "Quản lý thời khóa biểu",
  manage_notifications: "Đăng & Quản lý thông báo",
  manage_students: "Quản lý hồ sơ học sinh",
  manage_roles: "Cấu hình phân quyền",
  view_logs: "Xem nhật ký hệ thống"
};

let ROLE_PERMISSIONS_CONFIG = JSON.parse(localStorage.getItem('c7aio_permissions_cache')) || {
  monitor: ["manage_tasks", "manage_schedule", "manage_notifications", "manage_students", "view_logs"],
  vice_study: ["manage_tasks", "manage_schedule", "manage_notifications"],
  secretary: ["manage_tasks", "manage_notifications"],
  treasurer: ["manage_tasks", "manage_notifications"],
  vice_labor: ["manage_tasks"],
  vice_art: ["manage_tasks"],
  group_leader: ["manage_tasks"],
  student: []
};

// ==================== AUTHENTICATION ====================
function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem('currentUser');
  } else {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function logoutUser() {
  localStorage.removeItem('currentUser');
  sessionStorage.clear();
}

function checkPermission(permKey) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === 'admin' || (Array.isArray(user.role) && user.role.includes('admin'))) {
    return true;
  }
  const userRoles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
  for (const r of userRoles) {
    const perms = ROLE_PERMISSIONS_CONFIG[r] || [];
    if (perms.includes(permKey)) return true;
  }
  return false;
}

function isAdmin() {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (Array.isArray(user.role) && user.role.includes('admin')) return true;
  return false;
}

function formatDateIsoToVn(isoStr) {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

function loginUser(nameOrAdmin, passwordOrDob) {
  if (nameOrAdmin === 'admin' && (passwordOrDob === '10c7' || passwordOrDob === 'admin' || passwordOrDob === 'admin10c7')) {
    const adminObj = {
      id: 0,
      name: "Quản trị viên 10C7",
      role: ["admin"],
      group: 0,
      isAdmin: true
    };
    setCurrentUser(adminObj);
    return adminObj;
  }

  const cleanName = (nameOrAdmin || '').trim().toLowerCase();
  const student = STUDENTS.find(s => s.name.toLowerCase() === cleanName);
  if (!student) return null;

  const targetDob = (student.dob || '').trim();
  const inputDob = (passwordOrDob || '').trim();

  const isMatch = (targetDob === inputDob) || 
                  (formatDateIsoToVn(targetDob) === inputDob) ||
                  (targetDob.replace(/-/g, '') === inputDob.replace(/-/g, ''));

  if (isMatch) {
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

function getAvatarGradient(name) {
  const gradients = [
    "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
    "linear-gradient(135deg, #14b8a6 0%, #10b981 100%)"
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name) {
  if (!name) return 'HS';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
