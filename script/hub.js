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

// Load stats từ Firebase
async function loadStats() {
  // Sử dụng hàm lắng nghe Shared Tasks mới
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged((updatedTasks) => {
      tasks = updatedTasks;
      updateUIStats();
    });
  }

  // Lắng nghe thông báo để cập nhật Badge và Ticker ở trang chủ
  if (typeof onSharedNotificationsChanged === 'function') {
    onSharedNotificationsChanged((notifs) => {
      updateNotificationReminders(notifs);
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
  
  // Chỉ cập nhật nếu các phần tử này tồn tại (đang ở trang Dashboard)
  const totalEl = document.getElementById("totalTask");
  if (totalEl) totalEl.innerText = totalTasks;
  if (document.getElementById("doneTask")) document.getElementById("doneTask").innerText = doneTasks;
  if (document.getElementById("openTask")) document.getElementById("openTask").innerText = openTasks;

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

  if (document.getElementById("nearDeadline")) document.getElementById("nearDeadline").innerText = nearDeadlineTasks.length;

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

function updateNotificationReminders(notifs) {
  const badge = document.getElementById('notifBadge');
  const ticker = document.getElementById('notifTicker');
  const tickerText = document.getElementById('notifTickerText');

  if (!notifs || notifs.length === 0) {
    if (badge) badge.style.display = 'none';
    if (ticker) ticker.style.display = 'none';
    return;
  }

  // 1. Cập nhật Badge
  if (badge) {
    badge.textContent = notifs.length > 9 ? '9+' : notifs.length;
    badge.style.display = 'flex';
  }

  // 2. Cập nhật Ticker (Thông báo mới nhất)
  if (ticker && tickerText) {
    const latest = notifs[0];
    tickerText.textContent = `📢 MỚI: ${latest.message}`;
    ticker.style.display = 'flex';
    ticker.onclick = () => go('thongbao/tb.html');
  }
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
    const welcomeNameEl = document.getElementById('welcomeName');
    if (welcomeNameEl) welcomeNameEl.textContent = firstName;
    
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
    
    const welcomeMsgEl = document.getElementById('welcomeMessage');
    if (welcomeMsgEl) welcomeMsgEl.textContent = greeting;
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
  
  // Kiểm tra quyền để hiển thị nút Admin
  checkAdminButtons();
});

// --- SYSTEM UPGRADE: UI/UX & PWA ---

// 1. Register Service Worker
if ('serviceWorker' in navigator) {
  // FIX: Gỡ bỏ Service Worker cũ bị lỗi (sw.js) nếu có
  navigator.serviceWorker.getRegistrations().then(regs => {
    for (let reg of regs) {
      if (reg.active && reg.active.scriptURL.includes('sw.js')) {
        console.log('🗑️ Đang gỡ bỏ Service Worker lỗi (sw.js)...');
        reg.unregister();
      }
    }
  });

  // Điều chỉnh đường dẫn sw.js tùy theo môi trường (GitHub Pages hoặc Local)
  const swPath = BASE_PATH + 'service-worker.js';
  console.log('🚀 Registering SW at:', swPath);
  
  navigator.serviceWorker.register(swPath)
    .then(reg => {
      console.log('✅ Service Worker Registered', reg.scope);
      
      // Lắng nghe cập nhật phiên bản mới
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 Phiên bản mới có sẵn! Cập nhật tự động...');
            if (typeof showToast === 'function') showToast('🔄 Đang cập nhật phiên bản mới...', 'info');
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        });
      });
    })
    .catch(err => console.log('❌ Service Worker Failed', err));
}

// 2. Inject Global Styles (Toast, Animations, Dark Mode)
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
  :root {
    /* Core Colors */
    --primary-color: #667eea;
    --bg-color: #f4f7f6;
    --text-color: #333;
    --card-bg: #ffffff;
    --toast-bg: #333;
    --toast-text: #fff;
    
    /* Animation Physics */
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);
    --hdr-shadow: 0 10px 30px -10px rgba(102, 126, 234, 0.5);
    --danger-color: #ff4757;
  }

  /* Dark Mode Variables */
  [data-theme="dark"] {
    --bg-color: #1a1a2e;
    --text-color: #e0e0e0;
    --card-bg: #16213e;
    --primary-color: #0f3460;
    --toast-bg: #fff;
    --toast-text: #000;
    --hdr-shadow: 0 10px 30px -10px rgba(15, 52, 96, 0.6);
    --glass-border: 1px solid rgba(255, 255, 255, 0.1);
  }

  body {
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
    -webkit-font-smoothing: antialiased;
  }

  /* --- HDR & Glassmorphism Effects --- */
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  [data-theme="dark"] .glass-panel {
    background: rgba(22, 33, 62, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* --- Global Interactive Elements --- */
  button, .card, .nav-btn, .stat-card, input, select {
    transition: all 0.4s var(--ease-smooth);
  }

  button:active, .nav-btn:active {
    transform: scale(0.96);
  }

  /* HDR Glow on Hover */
  .add-btn:hover, .save-btn:hover, .nav-btn:hover {
    box-shadow: var(--hdr-shadow);
    filter: contrast(1.1);
    transform: translateY(-2px);
  }

  /* --- UNIFIED HDR LIST ITEMS (Task, Notif, Class) --- */
  .task-item, .notification-item, .class-item, .daily-class-item {
    background: rgba(255, 255, 255, 0.8) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.5) !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02) !important;
    border-radius: 12px !important;
    margin-bottom: 12px !important;
    transition: all 0.4s var(--ease-spring) !important;
  }

  [data-theme="dark"] .task-item, 
  [data-theme="dark"] .notification-item,
  [data-theme="dark"] .class-item {
    background: rgba(30, 30, 40, 0.8) !important;
    border: var(--glass-border) !important;
    color: #fff;
  }

  .task-item:hover, .notification-item:hover, .class-item:hover, .daily-class-item:hover {
    transform: translateY(-4px) scale(1.01) !important;
    box-shadow: var(--hdr-shadow) !important;
    background: rgba(255, 255, 255, 0.95) !important;
    z-index: 10;
  }

  /* --- HDR TABLES (Thống kê, Phân quyền) --- */
  .modern-table, .completion-table {
    border-collapse: separate !important; 
    border-spacing: 0 8px !important; /* Tách dòng */
    width: 100%;
  }
  
  .modern-table tr, .completion-table tr {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(5px);
    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    transition: transform 0.3s var(--ease-smooth);
  }

  .modern-table tr:hover, .completion-table tr:hover {
    transform: scale(1.01);
    background: #fff;
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
    z-index: 5;
  }

  /* --- SKELETON LOADING (Hiệu ứng chờ tải) --- */
  .skeleton {
    background: linear-gradient(90deg, rgba(190, 190, 190, 0.2) 25%, rgba(129, 129, 129, 0.24) 37%, rgba(190, 190, 190, 0.2) 63%);
    background-size: 400% 100%;
    animation: skeleton-loading 1.4s ease infinite;
    border-radius: 4px;
  }
  @keyframes skeleton-loading {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }

  /* --- Keyframes --- */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes popIn {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  .class-item, .daily-class-item { opacity: 1 !important; }

  /* Toast Notification */
  #toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .toast {
    background: var(--toast-bg);
    color: var(--toast-text);
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideInRight 0.4s var(--ease-spring);
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    min-width: 250px;
  }

  .toast.success { border-left: 4px solid #2ecc71; }
  .toast.error { border-left: 4px solid #e74c3c; }
  .toast.info { border-left: 4px solid #3498db; }
  .toast.hiding { animation: fadeOutRight 0.3s forwards; }

  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes fadeOutRight {
    to { transform: translateX(100%); opacity: 0; }
  }

  /* --- HIGH-END DIALOG SYSTEM --- */
  .custom-dialog-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
    z-index: 20000; display: flex; justify-content: center; align-items: flex-start;
    padding-top: 50px; animation: fadeIn 0.3s ease;
  }
  .custom-dialog {
    background: white; width: 90%; max-width: 400px; border-radius: 20px;
    padding: 25px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideDownPop 0.4s var(--ease-spring); text-align: center;
  }
  .dialog-icon { font-size: 3rem; margin-bottom: 15px; display: block; }
  .dialog-title { font-size: 1.25rem; font-weight: 700; color: #333; margin-bottom: 10px; }
  .dialog-message { color: #666; margin-bottom: 25px; line-height: 1.5; }
  .dialog-actions { display: flex; gap: 10px; justify-content: center; }
  .dialog-btn {
    padding: 10px 25px; border-radius: 12px; border: none; font-weight: 700;
    cursor: pointer; transition: all 0.2s; flex: 1;
  }
  .btn-confirm { background: var(--primary-color); color: white; }
  .btn-cancel { background: #f1f2f6; color: #57606f; }
  
  @keyframes slideDownPop {
    from { transform: translateY(-50px) scale(0.9); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Badge Style */
  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: var(--danger-color); color: white;
    width: 22px; height: 22px; border-radius: 50%;
    font-size: 0.7rem; font-weight: 800;
    display: none; align-items: center; justify-content: center;
    border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 2;
  }

  /* Ticker Style */
  .notif-ticker {
    background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(5px);
    padding: 10px 20px; border-radius: 50px; margin-bottom: 20px;
    display: none; align-items: center; gap: 10px;
    border: 1px solid rgba(102, 126, 234, 0.3);
    cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    animation: fadeInUp 0.5s var(--ease-spring);
  }
  .notif-ticker:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.15); }
  #notifTickerText { font-size: 0.9rem; font-weight: 600; color: var(--primary-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
document.head.appendChild(globalStyle);

// 3. Global Toast Function
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
};

// 4. Global Dialog Function (Thay thế alert)
window.showDialog = function(title, message, icon = 'ℹ️') {
  const existing = document.querySelector('.custom-dialog-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'custom-dialog-overlay';
  overlay.innerHTML = `
    <div class="custom-dialog">
      <span class="dialog-icon">${icon}</span>
      <div class="dialog-title">${title}</div>
      <div class="dialog-message">${message}</div>
      <div class="dialog-actions">
        <button class="dialog-btn btn-confirm" onclick="this.closest('.custom-dialog-overlay').remove()">Đã hiểu</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

// 5. Global Confirm Function (Thay thế confirm)
window.showConfirm = function(title, message, onConfirm) {
  const existing = document.querySelector('.custom-dialog-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'custom-dialog-overlay';
  overlay.innerHTML = `
    <div class="custom-dialog">
      <span class="dialog-icon">❓</span>
      <div class="dialog-title">${title}</div>
      <div class="dialog-message">${message}</div>
      <div class="dialog-actions">
        <button class="dialog-btn btn-cancel" id="dlgCancel">Hủy</button>
        <button class="dialog-btn btn-confirm" id="dlgConfirm">Xác nhận</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('dlgConfirm').onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  document.getElementById('dlgCancel').onclick = () => overlay.remove();
};

// Ghi đè alert mặc định (Tùy chọn, nhưng giúp code cũ tự chạy theo UI mới)
window.alert = (msg) => window.showDialog('Thông báo', msg);

function checkAdminButtons() {
  const user = getCurrentUser();
  if (!user) return;

  // Kiểm tra quyền để hiển thị Tabs
  const canManageStudents = checkPermission('manage_students');
  const canManageRoles = checkPermission('manage_roles');
  const canViewLogs = checkPermission('view_logs');

  // Hiển thị các nút trong Nav Grid nếu có quyền
  if (canManageStudents) {
    const btn = document.getElementById('btnNavStudents');
    if (btn) btn.style.display = 'flex';
  }
  if (canManageRoles) {
    const btn = document.getElementById('btnNavRoles');
    if (btn) btn.style.display = 'flex';
  }
  if (canViewLogs) {
    const btn = document.getElementById('btnNavLogs');
    if (btn) btn.style.display = 'flex';
  }
}
