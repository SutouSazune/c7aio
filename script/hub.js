/**
 * C7AIO Hub Engine & Global Design Framework
 * Hệ thống điều hướng, Theme Engine (Dark/Light), Toasts, Dialogs & UI Physics
 */

// Detect base path for GitHub Pages vs Live Server
function getBasePath() {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;
  
  if (hostname.includes('github.io')) {
    const parts = pathname.split('/');
    if (parts.length >= 2 && parts[1]) {
      return '/' + parts[1] + '/';
    }
  }
  
  if (pathname.startsWith('/c7aio/')) {
    return '/c7aio/';
  }

  return '/';
}

const BASE_PATH = getBasePath();

function buildUrl(relativePath) {
  const path = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return BASE_PATH === '/' ? path : BASE_PATH + path;
}

function go(page) {
  window.location.href = buildUrl(page);
}

// Hub State (Namespaced to avoid duplicate global let collision)
var hubTasks = [];
var hubNotifications = [];
var hubSchedules = {};
var hubWeekMetadata = {};

// Safe Activity Logger fallbacks
window.logAction = window.logAction || function(action, detail) {
  try {
    const logs = JSON.parse(localStorage.getItem('c7aio_activity_logs') || '[]');
    const user = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || { name: 'Người dùng' };
    logs.unshift({
      id: Date.now(),
      action: action || 'Thao tác',
      detail: detail || '',
      user: user.name || 'Người dùng',
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('c7aio_activity_logs', JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.warn('logAction error:', e);
  }
};

window.logActivity = window.logActivity || function(action, detail) {
  if (typeof window.logAction === 'function') {
    window.logAction(action, detail);
  }
};

// ============= THEME ENGINE (DARK / LIGHT MODE) =============
const ThemeEngine = {
  STORAGE_KEY: 'c7aio_theme',
  
  init() {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    this.setTheme(initialTheme, false);

    // Watch system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  },

  setTheme(theme, save = true) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    if (save) {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }
    this.updateToggleIcon(theme);
  },

  toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    this.setTheme(nextTheme, true);
    showToast(`Đã chuyển sang chế độ ${nextTheme === 'dark' ? 'Ban đêm (Dark)' : 'Ban ngày (Light)'}`, 'info');
  },

  updateToggleIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối';
    }
  }
};

// ============= TOAST NOTIFICATION SYSTEM =============
function showToast(message, type = 'info', duration = 3200) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast-card ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

// ============= CUSTOM MODAL DIALOGS =============
function showConfirm(title, message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'c7-dialog-overlay';
  overlay.innerHTML = `
    <div class="c7-dialog-box">
      <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 8px;">${escapeHtml(title)}</h3>
      <p style="color: var(--text-sub); margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5;">${escapeHtml(message)}</p>
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button class="c7-btn c7-btn-secondary" id="dialogCancelBtn">Hủy bỏ</button>
        <button class="c7-btn c7-btn-danger" id="dialogConfirmBtn">Xác nhận</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#dialogCancelBtn').onclick = () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  };

  overlay.querySelector('#dialogConfirmBtn').onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };
}

// ============= AUTH & USER HEADER STATE =============
function initHubUser() {
  const user = getCurrentUser();
  const headerRight = document.querySelector('.header-right');
  const greetingEl = document.getElementById('userNameGreeting');
  const logoutBtn = document.getElementById('headerLogoutBtn');

  // Inject Theme Toggle Button if missing
  if (headerRight && !document.getElementById('themeToggleBtn')) {
    const themeBtn = document.createElement('button');
    themeBtn.id = 'themeToggleBtn';
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.onclick = () => ThemeEngine.toggle();
    headerRight.prepend(themeBtn);
    ThemeEngine.updateToggleIcon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  }

  if (user) {
    if (greetingEl) greetingEl.textContent = user.name;
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';

    // Inject user badge bubble
    if (headerRight && !document.getElementById('headerUserBadge')) {
      const userBadge = document.createElement('div');
      userBadge.id = 'headerUserBadge';
      userBadge.className = 'header-user-bubble';
      userBadge.innerHTML = `
        <div class="header-avatar-circle" style="background: ${getAvatarGradient(user.name)}">${getInitials(user.name)}</div>
        <span class="header-user-name">${escapeHtml(user.name)}</span>
      `;
      headerRight.insertBefore(userBadge, logoutBtn);
    }

    renderProfileCard(user);
  } else {
    // If not logged in and on protected page
    const pathname = window.location.pathname;
    if (!pathname.endsWith('login.html') && !pathname.endsWith('login') && !pathname.endsWith('404.html')) {
      // Allow browsing or redirect if necessary
    }
  }
}

function renderProfileCard(user) {
  const card = document.getElementById('profileCardWidget');
  if (!card) return;

  card.style.display = 'flex';
  const avatar = document.getElementById('profileWidgetAvatar');
  const nameEl = document.getElementById('profileWidgetName');
  const rolesEl = document.getElementById('profileWidgetRoles');

  if (avatar) {
    avatar.textContent = getInitials(user.name);
    avatar.style.background = getAvatarGradient(user.name);
  }

  if (nameEl) nameEl.textContent = user.name;

  if (rolesEl) {
    const userRoles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
    rolesEl.innerHTML = userRoles.map(r => `
      <span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#64748b'};">
        ${ROLES[r] || r}
      </span>
    `).join(' ');
  }

  updateProfileTaskProgress(user);
}

function updateProfileTaskProgress(user) {
  if (!user || !hubTasks) return;

  const userGroup = user.group || 1;
  const userRoles = Array.isArray(user.role) ? user.role : [user.role || 'student'];

  const relevantTasks = hubTasks.filter(t => {
    if (t.assigneeType === 'all') return true;
    if (t.assigneeType === 'group' && parseInt(t.assigneeValue) === userGroup) return true;
    if (t.assigneeType === 'student' && t.assigneeValue === user.name) return true;
    return false;
  });

  const total = relevantTasks.length;
  const done = relevantTasks.filter(t => t.status === 'completed').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 100;

  const percentEl = document.getElementById('profileTaskPercent');
  const fractionEl = document.getElementById('profileTaskFraction');
  const barEl = document.getElementById('profileTaskProgressBar');

  if (percentEl) percentEl.textContent = `${percent}%`;
  if (fractionEl) fractionEl.textContent = `(${done}/${total})`;
  if (barEl) barEl.style.width = `${percent}%`;
}

function logoutUserAction() {
  showConfirm('Đăng xuất tài khoản', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?', () => {
    logoutUser();
    showToast('Đã đăng xuất tài khoản thành công!', 'info');
    setTimeout(() => {
      window.location.href = buildUrl('login.html');
    }, 600);
  });
}

// ============= DASHBOARD WIDGETS RENDERING =============
function renderDashboardStats(tasks) {
  if (!tasks) return;
  hubTasks = tasks;

  const total = tasks.length;
  const pending = tasks.filter(t => t.status !== 'completed').length;
  const done = tasks.filter(t => t.status === 'completed').length;

  const today = new Date().toISOString().split('T')[0];
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('statTotalTasks', total);
  setVal('statPendingTasks', pending);
  setVal('statDoneTasks', done);
  setVal('statUrgentTasks', urgent);

  const currentUser = getCurrentUser();
  if (currentUser) updateProfileTaskProgress(currentUser);

  renderRecentTasks(tasks);
}

function renderRecentTasks(tasks) {
  const container = document.getElementById('recentTasksContainer');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `<div class="empty-state-card">🎉 Tuyệt vời! Hiện chưa có nhiệm vụ nào tồn đọng.</div>`;
    return;
  }

  const sorted = [...tasks].sort((a, b) => new Date(b.createdAt || b.deadline || 0) - new Date(a.createdAt || a.deadline || 0)).slice(0, 4);

  container.innerHTML = sorted.map(t => {
    const isDone = t.status === 'completed';
    const isUrgent = t.priority === 'urgent';
    const badgeClass = isDone ? 'done' : (isUrgent ? 'urgent' : 'pending');
    const badgeText = isDone ? 'Đã xong' : (isUrgent ? 'Khẩn cấp' : 'Đang làm');

    return `
      <div class="recent-item" onclick="go('nhiemvu/nv.html')">
        <div class="recent-item-left">
          <div class="recent-item-icon ${isDone ? 'done' : ''}">${isDone ? '✅' : (isUrgent ? '⚡' : '📌')}</div>
          <div class="recent-item-details">
            <h5 class="recent-item-title ${isDone ? 'completed-text' : ''}">${escapeHtml(t.title)}</h5>
            <span class="recent-item-meta">📅 Hạn: ${formatDateIsoToVn(t.deadline || '')} • 👤 Giao cho: ${getAssigneeLabel(t)}</span>
          </div>
        </div>
        <span class="recent-item-badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
  }).join('');
}

function getAssigneeLabel(task) {
  if (task.assigneeType === 'all') return 'Toàn lớp';
  if (task.assigneeType === 'group') return `Tổ ${task.assigneeValue}`;
  return task.assigneeValue || 'Cá nhân';
}

function renderTodaySchedule(schedules) {
  const container = document.getElementById('todayScheduleContainer');
  const dayTitleEl = document.getElementById('todayDayOfWeek');
  if (!container) return;

  hubSchedules = schedules;

  const now = new Date();
  const dayIndex = now.getDay(); // 0 is Sunday, 1 is Monday...
  const dayMap = {
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
    0: 'Chủ Nhật'
  };

  const dayNumber = dayIndex === 0 ? 8 : (dayIndex + 1); // 2..7, 8 for Sunday
  if (dayTitleEl) dayTitleEl.textContent = dayMap[dayIndex] || 'Hôm nay';

  if (dayIndex === 0) {
    container.innerHTML = `<div class="empty-state-card">🏖️ Hôm nay là Chủ Nhật! Chúc bạn có một ngày nghỉ ngơi thư giãn.</div>`;
    return;
  }

  const todayClasses = (schedules && schedules[dayNumber]) || [];

  if (todayClasses.length === 0) {
    container.innerHTML = `<div class="empty-state-card">✨ Hôm nay không có tiết học nào trên thời khóa biểu.</div>`;
    return;
  }

  const sortedClasses = [...todayClasses].sort((a, b) => (parseInt(a.period) || 0) - (parseInt(b.period) || 0));

  container.innerHTML = sortedClasses.map(c => `
    <div class="today-class-card">
      <div class="today-class-time">Tiết ${c.period}</div>
      <div class="today-class-details">
        <span class="today-class-name">${escapeHtml(c.subject)}</span>
        <span class="today-class-room">🚪 ${escapeHtml(c.room || 'Lớp 10C7')} ${c.teacher ? '• 👩‍🏫 ' + escapeHtml(c.teacher) : ''}</span>
      </div>
    </div>
  `).join('');
}

// Security Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Global Lifecycle Initializer
window.addEventListener('DOMContentLoaded', () => {
  ThemeEngine.init();
  initHubUser();

  // Bind Realtime Firebase data listeners if available
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged(tasks => renderDashboardStats(tasks));
  }

  if (typeof onSharedTimetableChanged === 'function') {
    onSharedTimetableChanged(schedules => renderTodaySchedule(schedules));
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register(buildUrl('service-worker.js'))
      .then(reg => console.log('✅ Service Worker registered:', reg.scope))
      .catch(err => console.warn('SW registration warning:', err));
  }
});
