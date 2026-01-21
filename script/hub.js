// Detect base path for GitHub Pages vs Live Server
function getBasePath() {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;
  
  // GitHub Pages: hostname chứa 'github.io'
  // Cấu trúc thường là /repo-name/
  if (hostname.includes('github.io')) {
    const parts = pathname.split('/');
    // parts[0] là rỗng, parts[1] là tên repo
    if (parts.length >= 2 && parts[1]) {
      return '/' + parts[1] + '/';
    }
  }
  
  // Local development: Nếu chạy trong thư mục con (vd: /c7aio/)
  if (pathname.startsWith('/c7aio/')) {
    return '/c7aio/';
  }

  return '/';
}

const BASE_PATH = getBasePath();

// Helper function to build correct URL
function buildUrl(relativePath) {
  // Remove leading slash if present
  const path = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return BASE_PATH === '/' ? path : BASE_PATH + path;
}

// Dữ liệu mặc định
const defaultTasks = [
  { name: "Khảo sát học kỳ", deadline: "2025-01-05", done: false },
  { name: "Tham gia cuộc thi A", deadline: "2025-01-02", done: true },
  { name: "Nộp báo cáo nhóm", deadline: "2025-01-01", done: false }
];

let tasks = [];
let unsubscribe = null;

// --- HUB TABS VARIABLES ---
let currentHubTab = 'dashboard';
let systemLogs = [];
let editingHubStudentId = null;

// Load stats từ Firebase
async function loadStats() {
  // Sử dụng hàm lắng nghe Shared Tasks mới
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged((updatedTasks) => {
      tasks = updatedTasks;
      updateUIStats();
    });
  }
}

function updateUIStats() {
  const user = getCurrentUser();
  if (!user) return;

  // Cập nhật số liệu
  const totalTasks = tasks.length;
  
  // Tính số task đã hoàn thành dựa trên user hiện tại
  const doneTasks = tasks.filter(t => {
    if (t.completions) return t.completions[user.id];
    return t.done; // Fallback cho dữ liệu cũ
  }).length;
  
  const openTasks = totalTasks - doneTasks;
  
  document.getElementById("totalTask").innerText = totalTasks;
  document.getElementById("doneTask").innerText = doneTasks;
  document.getElementById("openTask").innerText = openTasks;

  const today = new Date();
  const nearDeadlineTasks = tasks.filter(t => {
    // Kiểm tra đã hoàn thành chưa
    const isCompleted = t.completions ? t.completions[user.id] : t.done;
    if (isCompleted) return false;

    // Kiểm tra hạn chót (ưu tiên endTime nếu có)
    const deadlineDate = t.endTime ? new Date(t.endTime) : new Date(t.deadline);
    const diffTime = deadlineDate - today;
    const daysUntil = diffTime / (1000 * 60 * 60 * 24);
    
    // Hiển thị task quá hạn hoặc sắp đến hạn trong vòng 3 ngày tới
    return daysUntil <= 3; 
  });

  document.getElementById("nearDeadline").innerText = nearDeadlineTasks.length;

  // Cập nhật task gần hạn
  updateRecentTasks(nearDeadlineTasks);
}

function updateRecentTasks(nearDeadlineTasks) {
  const ul = document.getElementById("recentTasks");
  const emptyState = document.getElementById("emptyState");
  
  if (!ul || !emptyState) return;
  
  ul.innerHTML = "";
  
  if (nearDeadlineTasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  nearDeadlineTasks.slice(0, 5).forEach(t => {
    // Ưu tiên endTime, fallback deadline
    const deadline = t.endTime ? new Date(t.endTime) : new Date(t.deadline);
    
    // Bỏ qua nếu ngày không hợp lệ
    if (isNaN(deadline.getTime())) return;

    const today = new Date();
    const daysLeft = Math.ceil((deadline - today) / (1000*60*60*24));
    
    let urgencyClass = '';
    let urgencyText = '';
    
    if (daysLeft < 0) {
      urgencyClass = 'overdue';
      urgencyText = '⚠️ Quá hạn';
    } else if (daysLeft === 0) {
      urgencyClass = 'urgent';
      urgencyText = '🔴 Hôm nay';
    } else if (daysLeft === 1) {
      urgencyClass = 'urgent';
      urgencyText = '🟠 Ngày mai';
    } else {
      urgencyClass = 'soon';
      urgencyText = `📅 Còn ${daysLeft} ngày`;
    }
    
    const li = document.createElement('li');
    li.className = `recent-item ${urgencyClass}`;
    
    // Xử lý click vào item để mở chi tiết (nếu cần sau này)
    li.innerHTML = `
      <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.name}</span>
      <span>${urgencyText}</span>
    `;
    
    ul.appendChild(li);
  });
}

function go(page) {
  // Build correct URL based on environment
  const url = buildUrl(page);
  window.location.href = url;
}

// Update welcome message
function updateWelcomeMessage() {
  const user = getCurrentUser();
  if (user) {
    const firstName = user.name.split(' ').pop();
    document.getElementById('welcomeName').textContent = firstName;
    
    // Thay đổi lời chào dựa trên thời gian
    const hour = new Date().getHours();
    let greeting = 'Chúc bạn một ngày học tập hiệu quả!';
    
    if (hour < 12) {
      greeting = '☀️ Buổi sáng tốt lành! Hãy tập trung vào bài học.';
    } else if (hour < 17) {
      greeting = '🌤️ Buổi chiều tốt lành! Tiếp tục hoàn thành các task.';
    } else if (hour < 21) {
      greeting = '🌆 Buổi tối tốt lành! Ôn tập trước khi kết thúc ngày.';
    } else {
      greeting = '🌙 Đã khá muộn rồi! Hãy tiến hành công việc còn lại.';
    }
    
    document.getElementById('welcomeMessage').textContent = greeting;
  }
}

// Kiểm tra trạng thái kết nối
function updateOnlineStatus() {
  const statusEl = document.getElementById('onlineStatus');
  if (navigator.onLine) {
    statusEl.textContent = '🟢 Online';
    statusEl.style.color = 'rgba(67, 233, 123, 0.9)';
  } else {
    statusEl.textContent = '🔴 Offline';
    statusEl.style.color = 'rgba(250, 112, 154, 0.9)';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Ngưng lắng nghe khi rời khỏi trang
window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// Load dữ liệu lần đầu và setup real-time listener
window.addEventListener('load', () => {
  loadStats();
  
  // Reset scroll lock từ CSS (nếu có) để đảm bảo trang chính cuộn được
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';

  // Khởi tạo Tabs Admin
  initHubTabs();
});

// ==========================================
// === HUB ADMIN TABS LOGIC ===
// ==========================================

function initHubTabs() {
  const user = getCurrentUser();
  if (!user) return;

  // Kiểm tra quyền để hiển thị Tabs
  const canManageStudents = checkPermission('manage_students');
  const canManageRoles = checkPermission('manage_roles');
  const canViewLogs = checkPermission('view_logs');

  if (canManageStudents || canManageRoles || canViewLogs) {
    document.getElementById('adminToolsSection').style.display = 'block';
    
    if (canManageStudents) document.getElementById('btnNavStudents').style.display = 'flex';
    if (canManageRoles) document.getElementById('btnNavRoles').style.display = 'flex';
    if (canViewLogs) document.getElementById('btnNavLogs').style.display = 'flex';
  }

  // Inject CSS cho Tabs
  const style = document.createElement('style');
  style.innerHTML = `
    .hub-tab-content { display: none; padding-bottom: 40px; animation: fadeIn 0.3s; }
    .hub-tab-content.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    
    /* --- MODERN ADMIN UI STYLES --- */
    .admin-view-header {
      display: flex; align-items: center; gap: 15px; 
      padding: 20px; background: white; margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .back-btn {
      padding: 8px 16px; border: 1px solid #ddd; background: #f8f9fa;
      border-radius: 20px; cursor: pointer; font-weight: 600; color: #555;
      transition: all 0.2s;
    }
    .back-btn:hover { background: #eee; transform: translateX(-3px); }
    
    .table-card {
      background: white; border-radius: 12px; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      margin: 0 20px; overflow: hidden;
    }
    .table-actions {
      padding: 20px; border-bottom: 1px solid #eee;
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 10px;
    }
    .modern-input {
      padding: 10px 15px; border: 1px solid #e0e0e0; border-radius: 8px;
      width: 300px; font-size: 0.95rem; transition: all 0.2s;
    }
    .modern-input:focus { border-color: #667eea; outline: none; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    
    .modern-btn {
      padding: 10px 20px; border: none; border-radius: 8px;
      font-weight: 600; cursor: pointer; transition: all 0.2s;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .modern-btn.primary { background: #667eea; color: white; }
    .modern-btn.primary:hover { background: #5a6fd6; transform: translateY(-2px); }
    .modern-btn.success { background: #27ae60; color: white; }
    .modern-btn.success:hover { background: #219150; transform: translateY(-2px); }
    .modern-btn.small { padding: 6px 12px; font-size: 0.85rem; }
    
    .table-responsive { overflow-x: auto; }
    .modern-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
    .modern-table th {
      background: #f8f9fa; color: #444; font-weight: 700;
      padding: 15px 20px; text-align: left; border-bottom: 2px solid #eee;
    }
    .modern-table td {
      padding: 15px 20px; border-bottom: 1px solid #f0f0f0;
      color: #333; vertical-align: middle;
    }
    .modern-table tr:hover td { background: #fafafa; }
    .modern-table tr:last-child td { border-bottom: none; }
    
    /* Checkbox Matrix */
    .perm-checkbox {
      appearance: none; width: 20px; height: 20px;
      border: 2px solid #ddd; border-radius: 4px; cursor: pointer;
      position: relative; transition: all 0.2s;
    }
    .perm-checkbox:checked { background: #667eea; border-color: #667eea; }
    .perm-checkbox:checked::after {
      content: '✓'; position: absolute; color: white;
      font-size: 14px; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    
    .role-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: 500; background: #eee; color: #555; }
    .role-badge.admin { background: #e74c3c; color: white; }
    .role-badge.monitor { background: #f1c40f; color: #333; }
  `;
  document.head.appendChild(style);

  // Listeners cho dữ liệu Admin
  if (canManageRoles) {
    onSharedPermissionsChanged((data) => {
      if (data) ROLE_PERMISSIONS_CONFIG = data;
      if (currentHubTab === 'roles') renderRolesMatrix();
    });
  }

  if (canViewLogs) {
    onSharedLogsChanged((data) => {
      systemLogs = data;
      if (currentHubTab === 'logs') renderLogsTable();
    });
  }

  // Listener cho Students (đã có trong students-list.js nhưng cần render lại bảng Hub)
  onSharedStudentsChanged((data) => {
    STUDENTS = data || [];
    if (currentHubTab === 'students') renderHubStudentsTable();
  });

  // Populate Role Select trong Modal
  const roleSelect = document.getElementById('hubStdRole');
  if (roleSelect) {
    roleSelect.innerHTML = Object.keys(ROLES).map(key => `<option value="${key}">${ROLES[key]}</option>`).join('');
  }
}

function switchHubTab(tabName) {
  currentHubTab = tabName;
  
  // Update Content
  document.querySelectorAll('.hub-tab-content').forEach(div => {
    div.classList.remove('active');
    div.style.display = 'none';
  });
  
  const activeContent = document.getElementById(`tabContent_${tabName}`);
  if (activeContent) {
    activeContent.style.display = 'block';
    activeContent.classList.add('active');
  }

  // Render Data
  if (tabName === 'students') renderHubStudentsTable();
  if (tabName === 'roles') renderRolesMatrix();
  if (tabName === 'logs') renderLogsTable();
}

// --- STUDENTS TAB LOGIC ---
function renderHubStudentsTable(data = STUDENTS) {
  const tbody = document.getElementById('hubStudentsTableBody');
  if (!tbody) return;

  const rows = data.map((s, index) => `
    <tr>
      <td>${index + 1}</td>
      <td style="font-weight: 600;">${s.name}</td>
      <td><span class="role-badge ${s.role || 'student'}">${ROLES[s.role] || 'Thành viên'}</span></td>
      <td>${s.dob ? s.dob.split('-').reverse().join('/') : ''}</td>
      <td>
        ${s.phone ? `📞 ${s.phone}<br>` : ''}
        ${s.email ? `✉️ ${s.email}` : ''}
      </td>
      <td>
        <button onclick="openHubStudentModal(${s.id})" class="modern-btn small" style="border: 1px solid #ddd; background: white; color: #333;">✏️ Sửa</button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = rows;
}

function searchHubStudents() {
  const term = document.getElementById('hubSearchInput').value.toLowerCase();
  const filtered = STUDENTS.filter(s => 
    s.name.toLowerCase().includes(term) || 
    (s.phone && s.phone.includes(term)) ||
    (s.email && s.email.toLowerCase().includes(term))
  );
  renderHubStudentsTable(filtered);
}

function openHubStudentModal(id = null) {
  const modal = document.getElementById('hubStudentModal');
  const title = document.getElementById('hubModalTitle');
  const btnDelete = document.getElementById('btnDeleteHubStudent');
  
  editingHubStudentId = id;

  if (id) {
    title.textContent = '✏️ Chỉnh Sửa Hồ Sơ';
    btnDelete.style.display = 'block';
    const s = STUDENTS.find(st => st.id === id);
    if (s) {
      document.getElementById('hubStdName').value = s.name || '';
      document.getElementById('hubStdRole').value = s.role || 'student';
      document.getElementById('hubStdDob').value = s.dob || '';
      document.getElementById('hubStdGender').value = s.gender || 'Nam';
      document.getElementById('hubStdPhone').value = s.phone || '';
      document.getElementById('hubStdEmail').value = s.email || '';
    }
  } else {
    title.textContent = '➕ Thêm Học Sinh Mới';
    btnDelete.style.display = 'none';
    document.getElementById('hubStdName').value = '';
    document.getElementById('hubStdRole').value = 'student';
    document.getElementById('hubStdDob').value = '';
    document.getElementById('hubStdPhone').value = '';
    document.getElementById('hubStdEmail').value = '';
  }

  document.body.style.overflow = 'hidden';
  modal.style.display = 'flex';
}

function closeHubStudentModal() {
  document.getElementById('hubStudentModal').style.display = 'none';
  document.body.style.overflow = '';
}

function saveHubStudent() {
  const name = document.getElementById('hubStdName').value.trim();
  if (!name) {
    alert('Vui lòng nhập họ tên!');
    return;
  }

  const studentData = {
    id: editingHubStudentId || Date.now(),
    name: name,
    role: document.getElementById('hubStdRole').value,
    dob: document.getElementById('hubStdDob').value,
    gender: document.getElementById('hubStdGender').value,
    phone: document.getElementById('hubStdPhone').value,
    email: document.getElementById('hubStdEmail').value,
    // Giữ lại các trường cũ nếu đang sửa
    ...(editingHubStudentId ? STUDENTS.find(s => s.id === editingHubStudentId) : {})
  };
  
  // Ghi đè lại các trường đã edit
  studentData.name = name;
  studentData.role = document.getElementById('hubStdRole').value;
  studentData.dob = document.getElementById('hubStdDob').value;
  studentData.gender = document.getElementById('hubStdGender').value;
  studentData.phone = document.getElementById('hubStdPhone').value;
  studentData.email = document.getElementById('hubStdEmail').value;

  if (editingHubStudentId) {
    const index = STUDENTS.findIndex(s => s.id === editingHubStudentId);
    if (index !== -1) STUDENTS[index] = studentData;
  } else {
    STUDENTS.push(studentData);
  }

  saveSharedStudents(STUDENTS);
  logAction(editingHubStudentId ? 'Sửa hồ sơ' : 'Thêm học sinh', `Học sinh: ${name} - Chức vụ: ${ROLES[studentData.role]}`);
  closeHubStudentModal();
}

function deleteHubStudent() {
  if (!editingHubStudentId) return;
  if (confirm('Xóa học sinh này?')) {
    const s = STUDENTS.find(st => st.id === editingHubStudentId);
    logAction('Xóa học sinh', `Đã xóa: ${s ? s.name : 'Unknown'}`);
    STUDENTS = STUDENTS.filter(s => s.id !== editingHubStudentId);
    saveSharedStudents(STUDENTS);
    closeHubStudentModal();
  }
}

// --- ROLES TAB LOGIC ---
function renderRolesMatrix() {
  const container = document.querySelector('.roles-matrix-container');
  if (!container) return;

  let html = `
    <table class="modern-table" style="width: 100%;">
      <thead>
        <tr>
          <th>Chức vụ / Quyền hạn</th>
          ${Object.keys(PERMISSIONS).map(p => `<th style="font-size: 0.8rem;">${PERMISSIONS[p]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  Object.keys(ROLES).forEach(roleKey => {
    if (roleKey === 'admin') return; 
    
    html += `<tr>
      <td style="font-weight: bold;">${ROLES[roleKey]}</td>`;
    
    Object.keys(PERMISSIONS).forEach(permKey => {
      const hasPerm = (ROLE_PERMISSIONS_CONFIG[roleKey] || []).includes(permKey);
      html += `
        <td style="text-align: center;">
          <input type="checkbox" class="perm-checkbox" 
            data-role="${roleKey}" data-perm="${permKey}" 
            ${hasPerm ? 'checked' : ''} 
            >
        </td>
      `;
    });
    
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function saveRolesConfig() {
  if (!confirm('Lưu thay đổi phân quyền?')) return;
  const newConfig = { ...ROLE_PERMISSIONS_CONFIG };
  Object.keys(ROLES).forEach(role => {
    if (role !== 'admin') newConfig[role] = [];
  });
  document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
    const role = cb.dataset.role;
    const perm = cb.dataset.perm;
    if (newConfig[role]) newConfig[role].push(perm);
  });
  saveSharedPermissions(newConfig);
}

// --- LOGS TAB LOGIC ---
function renderLogsTable() {
  const container = document.querySelector('.logs-container');
  if (!container) return;

  if (systemLogs.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: #888;">Chưa có nhật ký hoạt động nào.</p>';
    return;
  }

  let html = `
    <table class="modern-table" style="width: 100%;">
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Người thực hiện</th>
          <th>Chức vụ</th>
          <th>Hành động</th>
          <th>Chi tiết</th>
        </tr>
      </thead>
      <tbody>
  `;

  systemLogs.forEach(log => {
    const date = new Date(log.timestamp);
    const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} ${date.getDate()}/${date.getMonth()+1}`;
    
    html += `
      <tr>
        <td style="white-space: nowrap; color: #666;">${timeStr}</td>
        <td style="font-weight: 600;">${log.user}</td>
        <td>${log.role}</td>
        <td style="color: #2980b9; font-weight: 500;">${log.action}</td>
        <td style="color: #555;">${log.detail}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}
