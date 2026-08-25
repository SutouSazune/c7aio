// Danh sách 46 Học sinh lớp 10C7 (Năm học 2025 - 2026)
const STUDENTS = [
  { id: 1, name: "Đoàn Trần Đức Anh", dob: "2010-02-14", gender: "Nam", group: 1, role: ["student"], phone: "", email: "" },
  { id: 2, name: "Nguyễn Anh Bi", dob: "2010-05-12", gender: "Nam", group: 1, role: ["student"], phone: "0901234567", email: "" },
  { id: 3, name: "Lê Thành Công", dob: "2010-09-25", gender: "Nam", group: 1, role: ["student"], phone: "0941081242", email: "" },
  { id: 4, name: "Lê Quang Dũng", dob: "2010-04-18", gender: "Nam", group: 1, role: ["vice_study"], phone: "0835492657", email: "" },
  { id: 5, name: "Nguyễn Duy Dũng", dob: "2010-10-18", gender: "Nam", group: 1, role: ["student"], phone: "0918734847", email: "" },
  { id: 6, name: "Thổ Gia Hiếu", dob: "2010-04-03", gender: "Nam", group: 1, role: ["student"], phone: "0931293847", email: "" },
  { id: 7, name: "Nguyễn Viết Hoàng", dob: "2010-07-19", gender: "Nam", group: 1, role: ["student"], phone: "0933758245", email: "" },
  { id: 8, name: "Lê Đại Hùng", dob: "2010-10-15", gender: "Nam", group: 1, role: ["student"], phone: "0898492842", email: "" },
  { id: 9, name: "Hoàng Ngọc Hương", dob: "2010-04-14", gender: "Nữ", group: 1, role: ["vice_culture"], phone: "0987654321", email: "" },
  { id: 10, name: "Phạm Quang Huy", dob: "2010-03-22", gender: "Nam", group: 1, role: ["student"], phone: "0912375819", email: "" },
  { id: 11, name: "Nguyễn Lê Khánh Huyền", dob: "2010-01-27", gender: "Nữ", group: 1, role: ["secretary"], phone: "0918294812", email: "" },
  { id: 12, name: "Phạm Hoàng Khôi", dob: "2010-11-12", gender: "Nam", group: 1, role: ["student"], phone: "0891283748", email: "" },
  { id: 13, name: "Nguyễn Đoàn Thiên Kim", dob: "2010-08-17", gender: "Nữ", group: 1, role: ["student"], phone: "0898492812", email: "" },
  { id: 14, name: "Đào Khánh Linh", dob: "2010-07-18", gender: "Nữ", group: 1, role: ["student"], phone: "0912384751", email: "" },
  { id: 15, name: "Dương Khánh Linh", dob: "2010-10-07", gender: "Nữ", group: 1, role: ["student"], phone: "0891827364", email: "" },
  { id: 16, name: "Trần Ngọc Khánh Linh", dob: "2010-03-09", gender: "Nữ", group: 1, role: ["student"], phone: "0912384729", email: "" },
  { id: 17, name: "Lê Kim Long", dob: "2010-11-18", gender: "Nam", group: 1, role: ["vice_subject", "group_leader"], phone: "0918273645", email: "" },
  { id: 18, name: "Bùi Quốc Minh", dob: "2010-03-22", gender: "Nam", group: 1, role: ["vice_subject"], phone: "0989876543", email: "" },
  { id: 19, name: "Trần Nguyễn Trà My", dob: "2010-02-18", gender: "Nữ", group: 1, role: ["group_leader"], phone: "0988887777", email: "" },
  { id: 20, name: "Phạm Khánh Ngân", dob: "2010-12-14", gender: "Nữ", group: 1, role: ["vice_subject"], phone: "0977776666", email: "" },
  { id: 21, name: "Phạm Kim Ngân", dob: "2010-02-10", gender: "Nữ", group: 1, role: ["student"], phone: "0937482910", email: "" },
  { id: 22, name: "Trần Ngọc Kim Ngân", dob: "2010-09-08", gender: "Nữ", group: 1, role: ["student"], phone: "0918273649", email: "" },
  { id: 23, name: "Lê Bảo Ngọc", dob: "2010-09-28", gender: "Nữ", group: 1, role: ["treasurer"], phone: "0966665555", email: "" },
  { id: 24, name: "Nguyễn Thị Yến Ngọc", dob: "2010-05-15", gender: "Nữ", group: 1, role: ["student"], phone: "0912349876", email: "" },
  { id: 25, name: "Trương Minh Nguyên", dob: "2010-12-02", gender: "Nam", group: 1, role: ["student"], phone: "0981928374", email: "" },
  { id: 26, name: "Vũ Khôi Nguyên", dob: "2010-11-22", gender: "Nam", group: 1, role: ["student"], phone: "0912384756", email: "" },
  { id: 27, name: "Huỳnh Hiếu Nhã", dob: "2010-07-13", gender: "Nữ", group: 1, role: ["group_leader"], phone: "0955554444", email: "" },
  { id: 28, name: "Dương Thanh Nhàn", dob: "2010-10-01", gender: "Nữ", group: 1, role: ["student"], phone: "0987651234", email: "" },
  { id: 29, name: "Nguyễn Lê Trọng Nhân", dob: "2010-09-03", gender: "Nam", group: 1, role: ["student"], phone: "0918273948", email: "" },
  { id: 30, name: "Nguyễn Đình Tuấn Nhật", dob: "2010-12-19", gender: "Nam", group: 1, role: ["student"], phone: "0987654320", email: "" },
  { id: 31, name: "Nguyễn Ngọc Yến Nhi", dob: "2010-05-02", gender: "Nữ", group: 1, role: ["group_leader"], phone: "0944443333", email: "" },
  { id: 32, name: "Đinh Minh Phát", dob: "2010-10-02", gender: "Nam", group: 1, role: ["vice_labor"], phone: "0933332222", email: "" },
  { id: 33, name: "Trịnh Minh Phúc", dob: "2010-03-01", gender: "Nam", group: 1, role: ["student"], phone: "0981273948", email: "" },
  { id: 34, name: "Nguyễn Đắc Minh Quân", dob: "2010-06-14", gender: "Nam", group: 1, role: ["student"], phone: "0918273640", email: "" },
  { id: 35, name: "Nguyễn Mai Quyên", dob: "2010-07-09", gender: "Nữ", group: 1, role: ["student"], phone: "0987123654", email: "" },
  { id: 36, name: "Việt Vũ Thành", dob: "2010-04-18", gender: "Nam", group: 1, role: ["student"], phone: "0912384750", email: "" },
  { id: 37, name: "Lê Ngọc Anh Thư", dob: "2010-04-22", gender: "Nữ", group: 1, role: ["monitor"], phone: "0922221111", email: "" },
  { id: 38, name: "Nguyễn Thủy Trâm", dob: "2010-11-19", gender: "Nữ", group: 1, role: ["student"], phone: "0987654311", email: "" },
  { id: 39, name: "Huỳnh Bảo Trân", dob: "2010-12-22", gender: "Nữ", group: 1, role: ["student"], phone: "0912384711", email: "" },
  { id: 40, name: "Lê Khánh Trang", dob: "2010-07-23", gender: "Nữ", group: 1, role: ["student"], phone: "0987123411", email: "" },
  { id: 41, name: "Phạm Minh Trang", dob: "2010-06-10", gender: "Nữ", group: 1, role: ["student"], phone: "0918273611", email: "" },
  { id: 42, name: "Nguyễn Phú Trọng", dob: "2010-02-25", gender: "Nam", group: 1, role: ["student"], phone: "0987651122", email: "" },
  { id: 43, name: "Nguyễn Minh Trường", dob: "2010-02-15", gender: "Nam", group: 1, role: ["student"], phone: "0918271122", email: "" },
  { id: 44, name: "Đoàn Ngọc Thanh Vy", dob: "2010-10-10", gender: "Nữ", group: 1, role: ["student"], phone: "0981122334", email: "" },
  { id: 45, name: "Nguyễn Thủy Vy", dob: "2010-01-19", gender: "Nữ", group: 1, role: ["student"], phone: "0911223344", email: "" },
  { id: 46, name: "Trịnh Thị Như Ý", dob: "2010-01-27", gender: "Nữ", group: 1, role: ["student"], phone: "0987112233", email: "" }
];

// Danh mục chức vụ chuẩn
const ROLES = {
  admin: '👑 Quản trị viên (Admin)',
  monitor: '⭐ Lớp trưởng',
  secretary: '🔥 Bí thư chi đoàn',
  vice_study: '📚 Lớp phó học tập',
  vice_labor: '🧹 Lớp phó lao động',
  vice_culture: '🎭 Lớp phó văn thể mỹ',
  vice_subject: '📝 Lớp phó bộ môn',
  treasurer: '💰 Thủ quỹ',
  group_leader: '👥 Tổ trưởng',
  student: '👤 Học sinh'
};

// Màu sắc nhận diện chức vụ (Figma Theme)
const ROLE_COLORS = {
  admin: '#ef4444',
  monitor: '#f59e0b',
  secretary: '#ec4899',
  vice_study: '#3b82f6',
  vice_labor: '#10b981',
  vice_culture: '#8b5cf6',
  vice_subject: '#06b6d4',
  treasurer: '#d97706',
  group_leader: '#6366f1',
  student: '#64748b'
};

// Danh mục quyền hạn trong hệ thống
const PERMISSIONS = {
  manage_students: 'Quản lý Hồ sơ học sinh',
  manage_tasks: 'Giao & Quản lý nhiệm vụ',
  manage_schedule: 'Quản lý Thời khóa biểu',
  manage_notifs: 'Đăng & Quản lý thông báo',
  manage_roles: 'Điều hành Phân quyền',
  view_logs: 'Xem Nhật ký hoạt động'
};

// Cấu hình phân quyền mặc định
let ROLE_PERMISSIONS_CONFIG = {
  monitor: ['manage_tasks', 'manage_schedule', 'manage_notifs', 'view_logs'],
  secretary: ['manage_tasks', 'manage_schedule', 'manage_notifs', 'view_logs'],
  vice_study: ['manage_tasks', 'manage_schedule', 'manage_notifs'],
  vice_labor: ['manage_tasks'],
  vice_culture: ['manage_tasks'],
  vice_subject: ['manage_tasks'],
  treasurer: [],
  group_leader: ['manage_tasks'],
  student: []
};

// Hệ thống xác thực đăng nhập
function loginUser(nameOrAdmin, secret) {
  const cleanName = (nameOrAdmin || '').trim().toLowerCase();
  const cleanSecret = (secret || '').trim().toLowerCase();

  // 1. Kiểm tra Admin
  if (cleanName === 'admin' || cleanName === 'quản trị viên' || cleanName === 'quan tri vien') {
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
