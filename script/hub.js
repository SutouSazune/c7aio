/**
 * C7AIO Hub Master Script
 * Quản lý Navigation, Theme Engine, Toast & Global Dialogs
 */

const APP_CONFIG = {
  version: '3.0.0',
  title: '10C7 All In One'
};

function getBasePath() {
  const path = window.location.pathname;
  if (path.includes('/c7aio/')) {
    return path.substring(0, path.indexOf('/c7aio/') + 7);
  }
  if (path.includes('/nhiemvu/') || path.includes('/lich/') || path.includes('/thongbao/') || 
      path.includes('/thongke/') || path.includes('/hoso/') || path.includes('/perm/') || path.includes('/logs/')) {
    return '../';
  }
  return './';
}

function buildUrl(relativePath) {
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  const isSubFolder = window.location.pathname.includes('/nhiemvu/') || 
                      window.location.pathname.includes('/lich/') || 
                      window.location.pathname.includes('/thongbao/') || 
                      window.location.pathname.includes('/thongke/') || 
                      window.location.pathname.includes('/hoso/') || 
                      window.location.pathname.includes('/perm/') || 
                      window.location.pathname.includes('/logs/');
  
  if (isSubFolder) {
    if (cleanPath.startsWith('index.html') || cleanPath.startsWith('login.html')) {
      return '../' + cleanPath;
    }
    return '../' + cleanPath;
  }
  return './' + cleanPath;
}

function go(target) {
  window.location.href = buildUrl(target);
}

// ==================== THEME ENGINE ====================
const ThemeEngine = {
  init() {
    const saved = localStorage.getItem('c7aio_theme') || 'light';
    this.setTheme(saved);
    this.injectThemeToggle();
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('c7aio_theme', theme);
    const btn = document.getElementById('globalThemeToggleBtn');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  },

  injectThemeToggle() {
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.getElementById('globalThemeToggleBtn')) {
      const btn = document.createElement('button');
      btn.id = 'globalThemeToggleBtn';
      btn.className = 'theme-toggle-btn';
      const current = localStorage.getItem('c7aio_theme') || 'light';
      btn.innerHTML = current === 'dark' ? '☀️' : '🌙';
      btn.onclick = () => this.toggle();
      headerRight.insertBefore(btn, headerRight.firstChild);
    }
  }
};

// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'info', duration = 3200) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-card ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${icons[type] || 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, duration);
}

// ==================== GLOBAL DIALOGS ====================
function showDialog(title, message, icon = 'ℹ️') {
  const existing = document.getElementById('globalDialogOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'globalDialogOverlay';
  overlay.className = 'c7-dialog-overlay';

  overlay.innerHTML = `
    <div class="c7-dialog-box">
      <span class="c7-dialog-icon">${icon}</span>
      <h3 class="c7-dialog-title">${title}</h3>
      <p class="c7-dialog-message">${message}</p>
      <div class="c7-dialog-actions">
        <button class="c7-btn c7-btn-primary" onclick="document.getElementById('globalDialogOverlay').remove()">Đóng</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function showConfirm(title, message, onConfirm, onCancel) {
  const existing = document.getElementById('globalConfirmOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'globalConfirmOverlay';
  overlay.className = 'c7-dialog-overlay';

  overlay.innerHTML = `
    <div class="c7-dialog-box">
      <span class="c7-dialog-icon">❓</span>
      <h3 class="c7-dialog-title">${title}</h3>
      <p class="c7-dialog-message">${message}</p>
      <div class="c7-dialog-actions">
        <button class="c7-btn c7-btn-secondary" id="btnConfirmCancel">Hủy</button>
        <button class="c7-btn c7-btn-primary" id="btnConfirmOk">Xác nhận</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('btnConfirmCancel').onclick = () => {
    overlay.remove();
    if (typeof onCancel === 'function') onCancel();
  };

  document.getElementById('btnConfirmOk').onclick = () => {
    overlay.remove();
    if (typeof onConfirm === 'function') onConfirm();
  };
}

// ==================== DASHBOARD HELPERS ====================
function updateWelcomeMessage() {
  const user = getCurrentUser();
  if (!user) return;

  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = user.name;

  const welcomeMsg = document.getElementById('welcomeMessage');
  if (welcomeMsg) {
    const hour = new Date().getHours();
    let greeting = "Chúc bạn một ngày học tập nhiều hứng khởi!";
    if (hour < 12) greeting = "Chào buổi sáng! Hãy kiểm tra các nhiệm vụ cần nộp hôm nay nhé.";
    else if (hour < 18) greeting = "Chào buổi chiều! Cùng chuẩn bị bài vở thật tốt nào.";
    else greeting = "Chào buổi tối! Đừng quên ôn lại kiến thức trước khi đi ngủ nhé.";
    welcomeMsg.textContent = greeting;
  }

  updateProfileWidget(user);
}

function updateProfileWidget(user) {
  const widget = document.getElementById('userProfileWidget');
  if (!widget || !user) return;

  const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
  const roleBadges = roles.map(r => `
    <span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#6366f1'}">
      ${ROLES[r] || r}
    </span>
  `).join(' ');

  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const myTasks = tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(user.id));
  const completed = myTasks.filter(t => t.completions && t.completions[user.id]).length;
  const rate = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 100;

  widget.innerHTML = `
    <div class="profile-card-inner">
      <div class="profile-avatar" style="background: ${getAvatarGradient(user.name)}">
        ${getInitials(user.name)}
      </div>
      <div class="profile-info">
        <div class="profile-name">${user.name}</div>
        <div class="profile-roles">${roleBadges}</div>
        <div class="profile-progress-bar-wrap">
          <div class="profile-progress-label">
            <span>Tiến độ hoàn thành nhiệm vụ: <strong>${completed}/${myTasks.length}</strong> (${rate}%)</span>
          </div>
          <div class="profile-progress-track">
            <div class="profile-progress-fill" style="width: ${rate}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function checkAdminButtons() {
  const btnStudents = document.getElementById('btnNavStudents');
  const btnRoles = document.getElementById('btnNavRoles');
  const btnLogs = document.getElementById('btnNavLogs');

  if (btnStudents && checkPermission('manage_students')) btnStudents.style.display = 'flex';
  if (btnRoles && checkPermission('manage_roles')) btnRoles.style.display = 'flex';
  if (btnLogs && checkPermission('view_logs')) btnLogs.style.display = 'flex';
}

function loadStats() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const notifications = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];

  updateUIStats(tasks, currentUser);
  updateRecentTasks(tasks, currentUser);
  updateNotificationReminders(notifications, currentUser);
  updateDashboardScheduleWidget();
}

function updateUIStats(tasks, user) {
  const relevantTasks = tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(user.id));
  const total = relevantTasks.length;
  const done = relevantTasks.filter(t => t.completions && t.completions[user.id]).length;
  const open = total - done;

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
  const near = relevantTasks.filter(t => {
    if (t.completions && t.completions[user.id]) return false;
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d <= threeDaysLater;
  }).length;

  const totalEl = document.getElementById('totalTask');
  const openEl = document.getElementById('openTask');
  const doneEl = document.getElementById('doneTask');
  const nearEl = document.getElementById('nearDeadline');

  if (totalEl) totalEl.textContent = total;
  if (openEl) openEl.textContent = open;
  if (doneEl) doneEl.textContent = done;
  if (nearEl) nearEl.textContent = near;
}

function updateRecentTasks(tasks, user) {
  const listEl = document.getElementById('recentTasks');
  const emptyEl = document.getElementById('emptyState');
  if (!listEl) return;

  const relevantTasks = tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(user.id));
  const pending = relevantTasks.filter(t => !(t.completions && t.completions[user.id]));

  pending.sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const top3 = pending.slice(0, 4);

  if (top3.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = top3.map(t => {
    const deadlineStr = t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : 'Không giới hạn';
    const isOverdue = t.deadline && new Date(t.deadline) < new Date();
    const badgeClass = isOverdue ? 'overdue' : (t.priority === 'Khẩn cấp' ? 'urgent' : 'soon');
    const badgeText = isOverdue ? 'Quá hạn' : (t.deadline ? `Hạn: ${deadlineStr}` : 'Đang mở');

    return `
      <li class="recent-item" onclick="go('nhiemvu/nv.html')">
        <div class="recent-item-info">
          <span class="recent-item-title">${escapeHtml(t.name)}</span>
          <span class="recent-item-tag">📁 ${escapeHtml(t.category || 'Học tập')}</span>
        </div>
        <span class="recent-item-badge ${badgeClass}">${badgeText}</span>
      </li>
    `;
  }).join('');
}

function updateNotificationReminders(notifications, user) {
  const unread = notifications.filter(n => !(n.completions && n.completions[user.id]));
  const badge = document.getElementById('notifBadge');
  const ticker = document.getElementById('notifTicker');
  const tickerText = document.getElementById('notifTickerText');

  if (badge) {
    if (unread.length > 0) {
      badge.textContent = unread.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  if (ticker && tickerText) {
    if (notifications.length > 0) {
      const topNotif = notifications[0];
      tickerText.textContent = topNotif.message || 'Có thông báo mới từ ban cán sự';
      ticker.style.display = 'flex';
      ticker.onclick = () => go('thongbao/tb.html');
    } else {
      ticker.style.display = 'none';
    }
  }
}

function updateDashboardScheduleWidget() {
  const container = document.getElementById('todayScheduleWidget');
  if (!container) return;

  const schedules = JSON.parse(localStorage.getItem('c7aio_schedules_cache')) || {};
  const today = new Date();
  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDay = daysMap[today.getDay()];

  const weekKeys = Object.keys(schedules);
  let todayClasses = [];

  if (weekKeys.length > 0) {
    const currentWeekSchedule = schedules[weekKeys[0]] || {};
    todayClasses = currentWeekSchedule[todayDay] || [];
  }

  if (todayClasses.length === 0) {
    container.innerHTML = `
      <div class="widget-header">
        <h3>📅 Tiết học hôm nay</h3>
        <a href="lich/lich.html" class="widget-link">Xem tuần →</a>
      </div>
      <div class="empty-widget">
        <span>☀️</span>
        <p>Hôm nay không có tiết học nào trong thời khóa biểu!</p>
      </div>
    `;
    return;
  }

  const itemsHtml = todayClasses.map(c => {
    const color = getSubjectColor(c.name || c.subject);
    return `
      <div class="today-class-card" style="border-left-color: ${color}">
        <div class="today-class-time">${c.time || ''}</div>
        <div class="today-class-details">
          <div class="today-class-name">${escapeHtml(c.name)}</div>
          ${c.subject ? `<div class="today-class-sub">${escapeHtml(c.subject)}</div>` : ''}
        </div>
        <div class="today-class-room">📍 ${escapeHtml(c.room || 'P.204')}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="widget-header">
      <h3>📅 Tiết học hôm nay (${todayClasses.length} tiết)</h3>
      <a href="lich/lich.html" class="widget-link">Xem tuần →</a>
    </div>
    <div class="today-classes-list">
      ${itemsHtml}
    </div>
  `;
}

function getSubjectColor(subjName) {
  const s = (subjName || '').toLowerCase();
  if (s.includes('toán')) return '#3b82f6';
  if (s.includes('văn')) return '#ec4899';
  if (s.includes('anh')) return '#8b5cf6';
  if (s.includes('lí') || s.includes('vật lý')) return '#06b6d4';
  if (s.includes('hóa')) return '#10b981';
  if (s.includes('sinh')) return '#84cc16';
  if (s.includes('sử') || s.includes('địa')) return '#f59e0b';
  if (s.includes('tin')) return '#6366f1';
  if (s.includes('chào cờ') || s.includes('sinh hoạt')) return '#ef4444';
  return '#64748b';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateOnlineStatus() {
  const el = document.getElementById('onlineStatus');
  if (!el) return;
  if (navigator.onLine) {
    el.textContent = '🟢 Trực tuyến';
    el.style.color = '#10b981';
  } else {
    el.textContent = '🟠 Ngoại tuyến (Đang dùng dữ liệu đã lưu)';
    el.style.color = '#f59e0b';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
window.addEventListener('DOMContentLoaded', () => {
  ThemeEngine.init();
});
