/**
 * C7AIO Hub Core Logic & Navigation Controller
 * Quản lý Dark/Light theme, Dialog modal thống nhất, Toast notification & Cache state
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  registerServiceWorker();
});

// ============= THEME MANAGEMENT =============
function initTheme() {
  const savedTheme = localStorage.getItem('c7aio_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  injectThemeToggleButton();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('c7aio_theme', target);
  updateThemeIcon(target);
}

function injectThemeToggleButton() {
  const headerRight = document.querySelector('.header-right');
  if (headerRight && !document.getElementById('themeToggleBtn')) {
    const btn = document.createElement('button');
    btn.id = 'themeToggleBtn';
    btn.className = 'theme-toggle-btn';
    btn.title = 'Chuyển đổi giao diện Sáng / Tối';
    btn.onclick = toggleTheme;
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    btn.innerHTML = currentTheme === 'dark' ? '🌙' : '☀️';
    headerRight.prepend(btn);
  }
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '🌙' : '☀️';
  }
}

// ============= SERVICE WORKER =============
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swPath = getBasePath() + 'service-worker.js';
      navigator.serviceWorker.register(swPath).catch(err => {
        console.log('ServiceWorker registration fallback:', err);
      });
    });
  }
}

function getBasePath() {
  const path = window.location.pathname;
  if (path.includes('/nhiemvu/') || path.includes('/lich/') || path.includes('/thongbao/') ||
      path.includes('/thongke/') || path.includes('/hoso/') || path.includes('/perm/') || path.includes('/logs/')) {
    return '../';
  }
  return './';
}

function buildUrl(relativePath) {
  return getBasePath() + relativePath;
}

function go(page) {
  window.location.href = buildUrl(page);
}

// ============= TOAST SYSTEM =============
function showToast(message, type = 'info', duration = 3500) {
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
    <span>${icons[type] || '🔔'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

// ============= DIALOG MODAL SYSTEM =============
function showDialog(title, message, icon = 'ℹ️') {
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
  document.getElementById('dialogCloseBtn').onclick = () => {
    document.body.removeChild(overlay);
  };
}

function showConfirm(title, message, onConfirm, onCancel = null) {
  const overlay = document.createElement('div');
  overlay.className = 'c7-dialog-overlay';
  overlay.innerHTML = `
    <div class="c7-dialog-box">
      <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">❓</div>
      <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">${title}</h3>
      <p style="color: var(--text-sub); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.6;">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="c7-btn c7-btn-secondary" id="confirmCancelBtn">Hủy</button>
        <button class="c7-btn c7-btn-primary" id="confirmOkBtn">Xác nhận</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('confirmCancelBtn').onclick = () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  };

  document.getElementById('confirmOkBtn').onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };
}

// ============= DASHBOARD WIDGET HELPERS =============
function updateWelcomeMessage() {
  const user = getCurrentUser();
  if (!user) return;

  const welcomeName = document.getElementById('welcomeName');
  const welcomeMsg = document.getElementById('welcomeMessage');
  if (welcomeName) welcomeName.textContent = user.name;

  const hour = new Date().getHours();
  let timeGreeting = "Chúc bạn một ngày học tập nhiều hứng khởi!";
  if (hour < 11) timeGreeting = "Buổi sáng năng lượng và học tốt nhé!";
  else if (hour < 14) timeGreeting = "Buổi trưa vui vẻ và nạp đầy năng lượng!";
  else if (hour < 18) timeGreeting = "Buổi chiều học tập hiệu quả!";
  else timeGreeting = "Buổi tối an lành và hoàn thành tốt bài tập nhé!";

  if (welcomeMsg) welcomeMsg.textContent = timeGreeting;

  // Render User Profile Mini Widget
  const profileWidget = document.getElementById('userProfileWidget');
  if (profileWidget) {
    const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
    const roleBadges = roles.map(r => `
      <span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#6366f1'}">
        ${ROLES[r] || r}
      </span>
    `).join(' ');

    profileWidget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="user-avatar-mini" style="width: 48px; height: 48px; font-size: 1.1rem; background: ${getAvatarGradient(user.name)}">
            ${getInitials(user.name)}
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(user.name)}</h3>
            <div style="display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
              ${roleBadges}
              <span class="user-role-pill" style="background: var(--bg-surface); color: var(--text-sub); border: 1px solid var(--input-border);">
                Tổ ${user.group || 1}
              </span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="c7-btn c7-btn-secondary" onclick="handleProfileClick()">👤 Chi tiết hồ sơ</button>
        </div>
      </div>
    `;
  }
}

function checkAdminButtons() {
  const user = getCurrentUser();
  if (!user) return;

  const btnStudents = document.getElementById('btnNavStudents');
  const btnRoles = document.getElementById('btnNavRoles');
  const btnLogs = document.getElementById('btnNavLogs');

  if (btnStudents && (isAdmin() || checkPermission('manage_students'))) btnStudents.style.display = 'flex';
  if (btnRoles && (isAdmin() || checkPermission('manage_roles'))) btnRoles.style.display = 'flex';
  if (btnLogs && (isAdmin() || checkPermission('view_logs'))) btnLogs.style.display = 'flex';
}

function updateOnlineStatus() {
  const el = document.getElementById('onlineStatus');
  if (!el) return;

  function update() {
    if (navigator.onLine) {
      el.innerHTML = isRealtimeConnected() ? '🟢 Trực tuyến & Realtime Cloud' : '🟡 Trực tuyến (Bộ nhớ đệm)';
      el.style.color = '#10b981';
    } else {
      el.innerHTML = '🔴 Ngoại tuyến (Offline Cache)';
      el.style.color = '#ef4444';
    }
  }

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

function loadStats() {
  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const notifs = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
  const schedules = JSON.parse(localStorage.getItem('c7aio_schedules_cache')) || {};
  const user = getCurrentUser();

  if (!user) return;

  // Filter tasks assigned to user
  const myTasks = tasks.filter(t => {
    if (isAdmin()) return true;
    if (!t.assignedStudents || t.assignedStudents.length === 0) return true;
    return t.assignedStudents.includes(user.id);
  });

  const total = myTasks.length;
  let done = 0;
  let open = 0;
  let nearDeadline = 0;

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

  myTasks.forEach(t => {
    const isDone = t.completions && t.completions[user.id];
    if (isDone) {
      done++;
    } else {
      open++;
      if (t.deadline) {
        const d = new Date(t.deadline);
        if (d <= threeDaysLater) nearDeadline++;
      }
    }
  });

  const totalEl = document.getElementById('totalTask');
  const openEl = document.getElementById('openTask');
  const doneEl = document.getElementById('doneTask');
  const nearEl = document.getElementById('nearDeadline');

  if (totalEl) totalEl.textContent = total;
  if (openEl) openEl.textContent = open;
  if (doneEl) doneEl.textContent = done;
  if (nearEl) nearEl.textContent = nearDeadline;

  // Recent Tasks
  renderDashboardTasks(myTasks, user);

  // Notification Ticker & Badge
  renderDashboardNotifs(notifs, user);

  // Today Schedule
  renderTodaySchedule(schedules);
}

function renderDashboardTasks(myTasks, user) {
  const container = document.getElementById('recentTasks');
  const empty = document.getElementById('emptyState');
  if (!container) return;

  const pending = myTasks.filter(t => !(t.completions && t.completions[user.id])).slice(0, 5);

  if (pending.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';

  container.innerHTML = pending.map(t => `
    <li class="recent-item" onclick="go('nhiemvu/nv.html')">
      <div style="flex: 1;">
        <strong style="display: block; color: var(--text-main); font-size: 0.95rem;">${escapeHtml(t.name)}</strong>
        <small style="color: var(--text-sub);">⏰ Hạn: ${t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : 'Không giới hạn'}</small>
      </div>
      <span class="task-badge" style="background: var(--primary-light); color: var(--primary);">${escapeHtml(t.category || 'Bài tập')}</span>
    </li>
  `).join('');
}

function renderDashboardNotifs(notifs, user) {
  const ticker = document.getElementById('notifTicker');
  const tickerText = document.getElementById('notifTickerText');
  const badge = document.getElementById('notifBadge');

  if (!ticker || !tickerText) return;

  const unread = notifs.filter(n => !(n.completions && n.completions[user.id]));
  if (badge) {
    if (unread.length > 0) {
      badge.textContent = unread.length;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  if (notifs.length > 0) {
    const latest = notifs[0];
    tickerText.textContent = latest.message;
    ticker.style.display = 'flex';
    ticker.onclick = () => go('thongbao/tb.html');
  } else {
    ticker.style.display = 'none';
  }
}

function renderTodaySchedule(schedules) {
  const container = document.getElementById('todayScheduleWidget');
  if (!container) return;

  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = daysMap[new Date().getDay()];

  const week1 = schedules['week-1'] || {};
  const todayClasses = week1[todayKey] || [];

  if (todayClasses.length === 0) {
    container.innerHTML = `
      <div class="widget-header">
        <h3>📅 Tiết học hôm nay</h3>
        <a href="lich/lich.html" class="widget-link">Xem tuần →</a>
      </div>
      <div class="empty-widget">
        <span>🏖️</span>
        <p>Hôm nay không có tiết học nào. Nghỉ ngơi nhé!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="widget-header">
      <h3>📅 Tiết học hôm nay (${todayClasses.length} tiết)</h3>
      <a href="lich/lich.html" class="widget-link">Xem tuần →</a>
    </div>
    <ul class="recent-list">
      ${todayClasses.map(c => `
        <li class="recent-item">
          <div style="flex: 1;">
            <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(c.name)}</strong>
            <small style="display: block; color: var(--text-sub);">⏰ ${escapeHtml(c.time || '')} | 📍 ${escapeHtml(c.room || 'Phòng học')}</small>
          </div>
          <span class="task-badge" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">${escapeHtml(c.subject || 'Tiết')}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSubjectColor(subject) {
  const s = (subject || '').toLowerCase();
  if (s.includes('toán')) return '#6366f1';
  if (s.includes('văn')) return '#ec4899';
  if (s.includes('anh')) return '#3b82f6';
  if (s.includes('lí') || s.includes('vật lý')) return '#8b5cf6';
  if (s.includes('hóa')) return '#10b981';
  if (s.includes('sinh')) return '#84cc16';
  if (s.includes('sử')) return '#f59e0b';
  if (s.includes('địa')) return '#06b6d4';
  if (s.includes('tin')) return '#0ea5e9';
  if (s.includes('thể dục')) return '#f97316';
  if (s.includes('gdqp')) return '#14b8a6';
  return '#64748b';
}
