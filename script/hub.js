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
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    this.setTheme(initial, false);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  },

  setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }
    const toggleIcon = document.getElementById('themeToggleIcon');
    if (toggleIcon) {
      toggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next, true);
    if (typeof showToast === 'function') {
      showToast(next === 'dark' ? '🌙 Đã bật chế độ Tối' : '☀️ Đã bật chế độ Sáng', 'info');
    }
  },

  injectThemeToggle() {
    if (document.getElementById('themeToggleBtn')) return;
    const headerRight = document.querySelector('.header-right') || document.querySelector('.header-content');
    if (!headerRight) return;

    const btn = document.createElement('button');
    btn.id = 'themeToggleBtn';
    btn.className = 'theme-toggle-btn';
    btn.title = 'Chuyển đổi giao diện Sáng / Tối';
    btn.type = 'button';
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    btn.innerHTML = `<span id="themeToggleIcon">${currentTheme === 'dark' ? '☀️' : '🌙'}</span>`;
    btn.onclick = () => this.toggle();

    if (headerRight.firstChild) {
      headerRight.insertBefore(btn, headerRight.firstChild);
    } else {
      headerRight.appendChild(btn);
    }
  }
};

ThemeEngine.init();

// ============= DATA LOADERS & REALTIME SYNC =============
async function loadStats() {
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged((updatedTasks) => {
      hubTasks = updatedTasks || [];
      updateUIStats();
      updateDashboardWidgets();
    });
  }

  if (typeof onSharedNotificationsChanged === 'function') {
    onSharedNotificationsChanged((notifs) => {
      hubNotifications = notifs || [];
      updateNotificationReminders(hubNotifications);
      updateDashboardWidgets();
    });
  }

  if (typeof onSharedSchedulesChanged === 'function') {
    onSharedSchedulesChanged((data) => {
      hubSchedules = data || {};
      updateDashboardScheduleWidget();
    });
  }

  if (typeof onSharedWeekMetadataChanged === 'function') {
    onSharedWeekMetadataChanged((data) => {
      hubWeekMetadata = data || {};
      updateDashboardScheduleWidget();
    });
  }
}

function updateUIStats() {
  const user = getCurrentUser();
  if (!user) return;

  const totalTasks = hubTasks.length;
  const doneTasks = hubTasks.filter(t => {
    if (t.completions) return t.completions[user.id];
    return t.done;
  }).length;
  const openTasks = Math.max(0, totalTasks - doneTasks);

  const totalEl = document.getElementById("totalTask");
  if (totalEl) totalEl.innerText = totalTasks;
  if (document.getElementById("doneTask")) document.getElementById("doneTask").innerText = doneTasks;
  if (document.getElementById("openTask")) document.getElementById("openTask").innerText = openTasks;

  const today = new Date();
  const nearDeadlineTasks = hubTasks.filter(t => {
    const isCompleted = t.completions ? t.completions[user.id] : t.done;
    if (isCompleted) return false;
    const deadlineDate = t.endTime ? new Date(t.endTime) : (t.deadline ? new Date(t.deadline) : null);
    if (!deadlineDate || isNaN(deadlineDate.getTime())) return false;
    const diffDays = (deadlineDate - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  });

  if (document.getElementById("nearDeadline")) {
    document.getElementById("nearDeadline").innerText = nearDeadlineTasks.length;
  }

  updateRecentTasks(nearDeadlineTasks);
}

function updateRecentTasks(nearDeadlineTasks) {
  const ul = document.getElementById("recentTasks");
  const emptyState = document.getElementById("emptyState");
  if (!ul || !emptyState) return;

  ul.innerHTML = "";
  if (!nearDeadlineTasks || nearDeadlineTasks.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  nearDeadlineTasks.slice(0, 5).forEach(t => {
    const deadline = t.endTime ? new Date(t.endTime) : new Date(t.deadline);
    const today = new Date();
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    let urgencyClass = 'soon';
    let urgencyBadge = `⏳ Còn ${daysLeft} ngày`;

    if (daysLeft < 0) {
      urgencyClass = 'overdue';
      urgencyBadge = '⚠️ Quá hạn';
    } else if (daysLeft === 0) {
      urgencyClass = 'urgent';
      urgencyBadge = '🔥 Hôm nay';
    } else if (daysLeft === 1) {
      urgencyClass = 'urgent';
      urgencyBadge = '🟠 Ngày mai';
    }

    const li = document.createElement('li');
    li.className = `recent-item ${urgencyClass}`;
    li.onclick = () => go('nhiemvu/nv.html');
    li.innerHTML = `
      <div class="recent-item-info">
        <span class="recent-item-title">${escapeHtml(t.name)}</span>
        <span class="recent-item-tag">${t.category || 'Nhiệm vụ'}</span>
      </div>
      <span class="recent-item-badge ${urgencyClass}">${urgencyBadge}</span>
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

  const user = getCurrentUser();
  const unreadCount = user ? notifs.filter(n => !(n.completions && n.completions[user.id])).length : notifs.length;

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  if (ticker && tickerText) {
    const latest = notifs[0];
    tickerText.textContent = `📢 ${latest.message}`;
    ticker.style.display = 'flex';
    ticker.onclick = () => go('thongbao/tb.html');
  }
}

// Widget thời khóa biểu hôm nay trên Dashboard
function updateDashboardScheduleWidget() {
  const container = document.getElementById('todayScheduleWidget');
  if (!container) return;

  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayDisplay = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const currentDayName = dayNames[today.getDay()];

  // Tìm week key hiện tại
  let currentWeekKey = 'week-1';
  for (const [key, meta] of Object.entries(hubWeekMetadata)) {
    if (meta.startDate) {
      const start = new Date(meta.startDate);
      const end = meta.endDate ? new Date(meta.endDate) : null;
      if (meta.infinite || (end && today >= start && today <= end)) {
        currentWeekKey = key;
        break;
      }
    }
  }

  const weekSchedule = hubSchedules[currentWeekKey] || {};
  const todayClasses = weekSchedule[currentDayName] || [];

  let html = `
    <div class="widget-header">
      <h3>📅 Tiết học ${dayDisplay[today.getDay()]} (${today.getDate()}/${today.getMonth() + 1})</h3>
      <a href="lich/lich.html" class="widget-link">Xem tuần →</a>
    </div>
  `;

  if (todayClasses.length === 0) {
    html += `
      <div class="empty-widget">
        <span>🏖️</span>
        <p>Hôm nay không có tiết học nào. Nghỉ ngơi nhé!</p>
      </div>
    `;
  } else {
    html += `<div class="today-classes-list">`;
    todayClasses.forEach(cls => {
      const color = getSubjectColor(cls.name || cls.subject);
      html += `
        <div class="today-class-card" style="border-left-color: ${color}">
          <div class="today-class-time">⏰ ${cls.time || 'Tiết'}</div>
          <div class="today-class-details">
            <span class="today-class-name">${escapeHtml(cls.name)}</span>
            ${cls.subject ? `<span class="today-class-sub">${escapeHtml(cls.subject)}</span>` : ''}
          </div>
          <div class="today-class-room">📍 ${escapeHtml(cls.room || 'Phòng ?')}</div>
        </div>
      `;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}

function getSubjectColor(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('toán')) return '#3b82f6';
  if (n.includes('văn')) return '#ec4899';
  if (n.includes('anh')) return '#8b5cf6';
  if (n.includes('lý') || n.includes('vật lí')) return '#06b6d4';
  if (n.includes('hóa')) return '#10b981';
  if (n.includes('sinh')) return '#84cc16';
  if (n.includes('sử')) return '#f59e0b';
  if (n.includes('địa')) return '#d97706';
  if (n.includes('tin')) return '#6366f1';
  if (n.includes('thể dục') || n.includes('gdtc')) return '#ef4444';
  if (n.includes('gdcd') || n.includes('kinh tế')) return '#14b8a6';
  if (n.includes('chào cờ') || n.includes('sinh hoạt')) return '#e11d48';
  return '#64748b';
}

function updateDashboardWidgets() {
  updateDashboardScheduleWidget();
  
  // Update User Profile Card
  const profileWidget = document.getElementById('userProfileWidget');
  if (profileWidget) {
    const user = getCurrentUser();
    if (user) {
      const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
      const roleBadges = roles.map(r => `<span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#6366f1'}">${ROLES[r] || r}</span>`).join(' ');
      const total = hubTasks.length;
      const done = hubTasks.filter(t => t.completions && t.completions[user.id]).length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 100;

      profileWidget.innerHTML = `
        <div class="profile-card-inner">
          <div class="profile-avatar" style="background: ${getAvatarGradient(user.name)}">
            ${getInitials(user.name)}
          </div>
          <div class="profile-info">
            <div class="profile-name">${escapeHtml(user.name)}</div>
            <div class="profile-roles">${roleBadges}</div>
            <div class="profile-progress-bar-wrap">
              <div class="profile-progress-label">Tiến độ nhiệm vụ: <strong>${rate}%</strong> (${done}/${total})</div>
              <div class="profile-progress-track">
                <div class="profile-progress-fill" style="width: ${rate}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
}

function updateWelcomeMessage() {
  const user = getCurrentUser();
  if (user) {
    const firstName = user.name.split(' ').pop();
    const welcomeNameEl = document.getElementById('welcomeName');
    if (welcomeNameEl) welcomeNameEl.textContent = firstName;
    
    const hour = new Date().getHours();
    let greeting = 'Chúc bạn một ngày học tập hiệu quả và tràn đầy năng lượng!';
    
    if (hour < 12) {
      greeting = '☀️ Buổi sáng tốt lành! Chúc bạn học tập thật hiệu quả.';
    } else if (hour < 17) {
      greeting = '🌤️ Buổi chiều năng động! Hãy hoàn thành các mục tiêu hôm nay.';
    } else if (hour < 22) {
      greeting = '🌆 Buổi tối an lành! Nhớ kiểm tra lại bài tập trước khi ngủ nhé.';
    } else {
      greeting = '🌙 Đã khuya rồi, hãy nghỉ ngơi sớm để nạp lại năng lượng nhé!';
    }
    
    const welcomeMsgEl = document.getElementById('welcomeMessage');
    if (welcomeMsgEl) welcomeMsgEl.textContent = greeting;
  }
}

function updateOnlineStatus() {
  const statusEl = document.getElementById('onlineStatus');
  if (!statusEl) return;
  if (navigator.onLine) {
    statusEl.innerHTML = '🟢 Trực tuyến';
    statusEl.style.color = '#10b981';
  } else {
    statusEl.innerHTML = '🔴 Ngoại tuyến (Đã lưu cache)';
    statusEl.style.color = '#ef4444';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============= GLOBAL TOAST & DIALOG SYSTEM =============
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-card ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
};

window.showDialog = function(title, message, icon = 'ℹ️') {
  const existing = document.querySelector('.c7-dialog-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'c7-dialog-overlay';
  overlay.innerHTML = `
    <div class="c7-dialog-box">
      <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">${icon}</div>
      <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">${title}</h3>
      <p style="color: var(--text-sub); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.6;">${message}</p>
      <button class="c7-btn c7-btn-primary" style="width: 100%;" id="dialogCloseBtn">Đã hiểu</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('dialogCloseBtn').onclick = () => overlay.remove();
};

window.showConfirm = function(title, message, onConfirm) {
  const existing = document.querySelector('.c7-dialog-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'c7-dialog-overlay';
  overlay.innerHTML = `
    <div class="c7-dialog-box">
      <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">❓</div>
      <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">${title}</h3>
      <p style="color: var(--text-sub); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.6;">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="c7-btn c7-btn-secondary" id="dlgBtnCancel">Hủy bỏ</button>
        <button class="c7-btn c7-btn-danger" id="dlgBtnConfirm">Xác nhận</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('dlgBtnConfirm').onclick = () => {
    overlay.remove();
    if (typeof onConfirm === 'function') onConfirm();
  };
  document.getElementById('dlgBtnCancel').onclick = () => overlay.remove();
};

// Handlers for Header Buttons
function handleLogout() {
  if (typeof showConfirm === 'function') {
    showConfirm('Đăng xuất tài khoản', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?', () => {
      logoutUser();
      if (typeof showToast === 'function') showToast('Đã đăng xuất thành công!', 'info');
      setTimeout(() => {
        window.location.href = buildUrl('login.html');
      }, 500);
    });
  } else {
    logoutUser();
    window.location.href = buildUrl('login.html');
  }
}

function handleProfileClick() {
  const user = getCurrentUser();
  if (user) {
    if (user.isAdmin || checkPermission('manage_students')) {
      go('hoso/hs.html');
    } else {
      const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
      const roleNames = roles.map(r => ROLES[r] || r).join(', ');
      showDialog(user.name, `Chức vụ: ${roleNames}<br>Tổ sinh hoạt: Tổ ${user.group || 1}`, '👤');
    }
  }
}

// Check Admin and Management Buttons
function checkAdminButtons() {
  const user = getCurrentUser();
  if (!user) return;

  const canManageStudents = checkPermission('manage_students');
  const canManageRoles = checkPermission('manage_roles');
  const canViewLogs = checkPermission('view_logs');

  const btnStudents = document.getElementById('btnNavStudents');
  if (btnStudents) btnStudents.style.display = canManageStudents ? 'flex' : 'none';

  const btnRoles = document.getElementById('btnNavRoles');
  if (btnRoles) btnRoles.style.display = canManageRoles ? 'flex' : 'none';

  const btnLogs = document.getElementById('btnNavLogs');
  if (btnLogs) btnLogs.style.display = canViewLogs ? 'flex' : 'none';
}

// Main Page Initializer
function initHubPage() {
  const user = getCurrentUser();
  const path = window.location.pathname;

  if (!user) {
    if (!path.endsWith('login.html') && !path.endsWith('login') && !path.endsWith('404.html')) {
      window.location.href = buildUrl('login.html');
      return;
    }
  }

  if (typeof ThemeEngine !== 'undefined' && ThemeEngine.injectThemeToggle) {
    ThemeEngine.injectThemeToggle();
  }

  if (user) {
    const avatarMini = document.getElementById('userAvatarMini');
    if (avatarMini) {
      avatarMini.textContent = getInitials(user.name);
      avatarMini.style.background = getAvatarGradient(user.name);
    }

    const nameDisplay = document.getElementById('userNameDisplay');
    if (nameDisplay) {
      nameDisplay.textContent = user.name;
    }

    updateWelcomeMessage();
    checkAdminButtons();
    updateOnlineStatus();
    loadStats();
    updateDashboardWidgets();
  }
}

window.addEventListener('DOMContentLoaded', initHubPage);
window.addEventListener('load', initHubPage);

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = buildUrl('service-worker.js');
    navigator.serviceWorker.register(swPath).then(reg => {
      console.log('✅ Service Worker registered:', reg.scope);
    }).catch(err => {
      console.log('ℹ️ SW info:', err.message);
    });
  });
}
