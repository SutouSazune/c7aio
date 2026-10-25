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

// Global Cursor & Dynamic Card Spotlight Tracker (60fps rAF throttled)
if (typeof window !== 'undefined') {
  let _rafPending = false;
  let _lastPointerEvent = null;
  window.addEventListener('pointermove', (e) => {
    _lastPointerEvent = e;
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => {
      _rafPending = false;
      const ev = _lastPointerEvent;
      if (!ev) return;
      document.documentElement.style.setProperty('--cursor-x', `${ev.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${ev.clientY}px`);

      const card = ev.target && ev.target.closest
        ? ev.target.closest('.c7-card, .nav-btn, .stat-card, .welcome-hero, .bento-card, .task-item-card, .hs-student-card, .notif-card-item, .analytics-card, .pq-table-card, .nk-table-card, .sodo-cell-filled')
        : null;
      if (card) {
        const rect = card.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${mx}px`);
        card.style.setProperty('--mouse-y', `${my}px`);
        if (card.classList.contains('bento-feature-card') || card.classList.contains('stat-card')) {
          const rx = ((my / Math.max(1, rect.height)) - 0.5) * -7;
          const ry = ((mx / Math.max(1, rect.width)) - 0.5) * 7;
          card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
          card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
        }
      }
    });
  }, { passive: true });
}

function go(page) {
  const target = buildUrl(page);
  if (!document.startViewTransition) {
    window.location.href = target;
    return;
  }
  document.startViewTransition(() => {
    window.location.href = target;
  });
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
    const initialTheme = savedTheme || 'dark';
    this.setTheme(initialTheme, false);
    
    window.addEventListener('DOMContentLoaded', () => {
      this.injectThemeToggle();
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
    const dockThemeIcon = document.getElementById('c7DockThemeIcon');
    if (dockThemeIcon) {
      dockThemeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    try {
      window.dispatchEvent(new CustomEvent('c7:theme-changed', { detail: { theme } }));
    } catch (e) {}
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
  // Stale-While-Revalidate: Instant offline hydrate from localStorage
  try {
    const cachedTasks = localStorage.getItem('c7aio_cached_tasks');
    if (cachedTasks && (!hubTasks || hubTasks.length === 0)) {
      hubTasks = JSON.parse(cachedTasks);
      updateUIStats();
      updateDashboardWidgets();
    }
    const cachedNotifs = localStorage.getItem('c7aio_cached_notifs');
    if (cachedNotifs && (!hubNotifications || hubNotifications.length === 0)) {
      hubNotifications = JSON.parse(cachedNotifs);
      updateNotificationReminders(hubNotifications);
      updateDashboardWidgets();
    }
  } catch (e) {}

  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged((updatedTasks) => {
      hubTasks = updatedTasks || [];
      try { localStorage.setItem('c7aio_cached_tasks', JSON.stringify(hubTasks)); } catch (e) {}
      updateUIStats();
      updateDashboardWidgets();
    });
  }

  if (typeof onSharedNotificationsChanged === 'function') {
    onSharedNotificationsChanged((notifs) => {
      hubNotifications = notifs || [];
      try { localStorage.setItem('c7aio_cached_notifs', JSON.stringify(hubNotifications)); } catch (e) {}
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

  const isAdm = (user.id === 0 || user.role === 'admin' || (Array.isArray(user.role) && user.role.includes('admin')));

  const assignedTasks = hubTasks.filter(t => {
    if (isAdm) return true;
    if (!t.assignedStudents || t.assignedStudents.length === 0) return true;
    return t.assignedStudents.includes(user.id);
  });

  const totalTasks = assignedTasks.length;
  const doneTasks = assignedTasks.filter(t => {
    if (t.isGlobalCompleted) return true;
    if (t.completions) return t.completions[user.id];
    return t.done;
  }).length;
  const openTasks = Math.max(0, totalTasks - doneTasks);

  function animateCounter(el, target, duration = 600) {
    if (!el) return;
    const targetNum = Number(target) || 0;
    const start = performance.now();
    const update = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(ease * targetNum);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  const totalEl = document.getElementById("totalTask");
  if (totalEl) animateCounter(totalEl, totalTasks);
  if (document.getElementById("doneTask")) animateCounter(document.getElementById("doneTask"), doneTasks);
  if (document.getElementById("openTask")) animateCounter(document.getElementById("openTask"), openTasks);

  const today = new Date();
  const nearDeadlineTasks = assignedTasks.filter(t => {
    const isCompleted = t.isGlobalCompleted || (t.completions ? t.completions[user.id] : t.done);
    if (isCompleted) return false;
    const deadlineDate = t.endTime ? new Date(t.endTime) : (t.deadline ? new Date(t.deadline) : null);
    if (!deadlineDate || isNaN(deadlineDate.getTime())) return false;
    const diffDays = (deadlineDate - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  });

  if (document.getElementById("nearDeadline")) {
    animateCounter(document.getElementById("nearDeadline"), nearDeadlineTasks.length);
  }

  updateRecentTasks(nearDeadlineTasks);
  if (typeof BottomDockEngine !== 'undefined') BottomDockEngine.updateBadges();
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
    tickerText.textContent = latest.title ? `${latest.title}: ${latest.message}` : latest.message;
    ticker.style.display = 'flex';
    ticker.onclick = () => go('thongbao/tb.html');
  }
  if (typeof BottomDockEngine !== 'undefined') BottomDockEngine.updateBadges();
}

// Widget thời khóa biểu hôm nay trên Dashboard
function updateDashboardScheduleWidget() {
  const container = document.getElementById('todayScheduleWidget');
  if (!container) return;

  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayDisplay = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const currentDayName = dayNames[today.getDay()];

  // Format local YYYY-MM-DD để tránh lệch múi giờ UTC
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;

  // Tìm week key hiện tại chuẩn theo chuỗi ngày địa phương
  let currentWeekKey = null;
  for (const [key, meta] of Object.entries(hubWeekMetadata)) {
    if (meta && meta.startDate) {
      if (meta.infinite) {
        currentWeekKey = key;
        break;
      }
      if (meta.endDate && todayKey >= meta.startDate && todayKey <= meta.endDate) {
        currentWeekKey = key;
        break;
      }
    }
  }

  // Kế thừa TKB số 1 nếu tuần hiện tại chưa có dữ liệu riêng
  let todayClasses = [];
  if (currentWeekKey) {
    let weekSchedule = hubSchedules[currentWeekKey] || {};
    todayClasses = weekSchedule[currentDayName] || [];
    if (todayClasses.length === 0 && currentWeekKey !== 'week-1' && hubSchedules['week-1']) {
      todayClasses = hubSchedules['week-1'][currentDayName] || [];
    }
  }

  // Lọc theo lớp học của người dùng nếu có (mặc định 11C7)
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const userClass = (user && (user.class || user.previousClass)) ? (user.class || user.previousClass) : '11C7';
  if (userClass && todayClasses.length > 0) {
    const classFiltered = todayClasses.filter(c => !c.className || c.className === userClass);
    if (classFiltered.length > 0) {
      todayClasses = classFiltered;
    }
  }

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
        <p>${currentWeekKey ? 'Hôm nay không có tiết học nào. Nghỉ ngơi nhé!' : 'Chưa vào năm học hoặc ngày nghỉ. Năm học 2026 - 2027 bắt đầu từ 07/09/2026.'}</p>
      </div>
    `;
  } else {
    html += `<div class="today-classes-list">`;
    const nowMinutes = today.getHours() * 60 + today.getMinutes();

    todayClasses.forEach(cls => {
      const color = getSubjectColor(cls.name || cls.subject);
      let isOngoing = false;
      if (cls.time && cls.time.includes('-')) {
        const [startStr, endStr] = cls.time.split('-').map(s => s.trim());
        if (startStr && endStr) {
          const [sh, sm] = startStr.split(':').map(Number);
          const [eh, em] = endStr.split(':').map(Number);
          const startMinutes = sh * 60 + sm;
          const endMinutes = eh * 60 + em;
          if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
            isOngoing = true;
          }
        }
      }

      html += `
        <div class="today-class-card ${isOngoing ? 'class-active-now' : ''}" style="border-left-color: ${color}">
          <div class="today-class-time">
            <span>⏰ ${cls.time || 'Tiết'}</span>
            ${isOngoing ? '<span class="period-live-indicator"><span class="period-live-dot"></span>ĐANG HỌC</span>' : ''}
          </div>
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
      const isAdm = (user.id === 0 || user.role === 'admin' || (Array.isArray(user.role) && user.role.includes('admin')));
      const assignedTasks = hubTasks.filter(t => {
        if (isAdm) return true;
        if (!t.assignedStudents || t.assignedStudents.length === 0) return true;
        return t.assignedStudents.includes(user.id);
      });

      const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
      const roleBadges = roles.map(r => `<span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#6366f1'}">${ROLES[r] || r}</span>`).join(' ');
      
      const total = assignedTasks.length;
      const done = assignedTasks.filter(t => t.isGlobalCompleted || (t.completions && t.completions[user.id])).length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 100;

      profileWidget.innerHTML = `
        <div class="bento-profile-card">
          <div class="bento-profile-top">
            <div class="bento-avatar-halo" style="background: ${getAvatarGradient(user.name)}" onclick="handleProfileClick()" title="Xem chi tiết hồ sơ">
              <span>${getInitials(user.name)}</span>
              <span class="avatar-online-dot"></span>
            </div>
            <div class="bento-user-details">
              <div class="bento-user-name">${escapeHtml(user.name)}</div>
              <div class="bento-user-roles">${roleBadges}</div>
            </div>
          </div>
          <div class="bento-profile-metric">
            <div class="bento-metric-header">
              <span class="bento-metric-title">Tiến độ nhiệm vụ</span>
              <span class="bento-metric-val">${rate}%</span>
            </div>
            <div class="bento-track">
              <div class="bento-bar" style="width: ${rate}%"></div>
            </div>
            <div class="bento-metric-sub">Đã hoàn thành ${done}/${total} nhiệm vụ</div>
          </div>
        </div>
      `;
    }
  }
}

let _clockInterval = null;

function updateLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');
  if (!clockEl && !dateEl) return;

  const now = new Date();
  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (dateEl) {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}`;
  }
}

function updateWelcomeMessage() {
  const user = getCurrentUser();
  if (user) {
    const firstName = user.name.split(' ').pop();
    const welcomeNameEl = document.getElementById('welcomeName');
    if (welcomeNameEl) welcomeNameEl.textContent = firstName;
    
    const roleTagEl = document.getElementById('welcomeRoleTag');
    if (roleTagEl) {
      const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
      const primaryRole = roles[0] || 'student';
      roleTagEl.textContent = (typeof ROLES !== 'undefined' && ROLES[primaryRole]) ? ROLES[primaryRole] : 'Thành viên 11C7';
    }
    
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

    updateLiveClock();
    if (!_clockInterval) {
      _clockInterval = setInterval(updateLiveClock, 1000);
    }
  }
}

function updateOnlineStatus(syncDetail) {
  const statusEl = document.getElementById('onlineStatus');
  const isOnline = (syncDetail && typeof syncDetail.isOnline === 'boolean') ? syncDetail.isOnline : navigator.onLine;
  const pending = (syncDetail && typeof syncDetail.pendingCount === 'number') ? syncDetail.pendingCount : 
    (typeof OfflineSyncQueue !== 'undefined' ? OfflineSyncQueue.getQueue().length : 0);

  if (statusEl) {
    if (!isOnline) {
      statusEl.innerHTML = '🔴 Ngoại tuyến (Đã lưu cache)';
      statusEl.style.color = '#ef4444';
    } else if (pending > 0) {
      statusEl.innerHTML = `🟡 Đang đồng bộ (${pending} mục chờ...)`;
      statusEl.style.color = '#f59e0b';
    } else {
      statusEl.innerHTML = '🟢 Trực tuyến - Đã đồng bộ';
      statusEl.style.color = '#10b981';
    }
  }

  // Update header pill if present
  const headerPill = document.getElementById('c7HeaderSyncPill');
  if (headerPill) {
    if (!isOnline) {
      headerPill.className = 'c7-sync-pill offline';
      headerPill.innerHTML = '<span class="pill-dot"></span><span>Ngoại tuyến</span>';
      headerPill.title = 'Đang dùng bộ nhớ cục bộ';
    } else if (pending > 0) {
      headerPill.className = 'c7-sync-pill pending';
      headerPill.innerHTML = `<span class="pill-dot"></span><span>Đang đồng bộ (${pending})</span>`;
      headerPill.title = `Có ${pending} tác vụ đang chờ đẩy lên server`;
    } else {
      headerPill.className = 'c7-sync-pill online';
      headerPill.innerHTML = '<span class="pill-dot"></span><span>Đồng bộ</span>';
      headerPill.title = 'Dữ liệu đã đồng bộ thời gian thực';
    }
  }
}

window.addEventListener('online', () => updateOnlineStatus({ isOnline: true }));
window.addEventListener('offline', () => updateOnlineStatus({ isOnline: false }));
window.addEventListener('c7:sync-status', (e) => updateOnlineStatus(e.detail));

// ============= COMMAND PALETTE & QUICK SEARCH (Ctrl + K) =============
const CommandPalette = {
  isOpen: false,
  selectedIndex: 0,
  items: [],

  init() {
    this.injectPaletteUI();
    this.injectHeaderSearchBtn();
    this.injectHeaderSyncPill();
    this.bindEvents();
  },

  getAvailableItems() {
    const isInsideSubdir = window.location.pathname.includes('/hoso/') || 
                           window.location.pathname.includes('/lich/') || 
                           window.location.pathname.includes('/nhiemvu/') || 
                           window.location.pathname.includes('/logs/') || 
                           window.location.pathname.includes('/perm/') || 
                           window.location.pathname.includes('/sodo/') || 
                           window.location.pathname.includes('/thongbao/') || 
                           window.location.pathname.includes('/thongke/');
    const prefix = isInsideSubdir ? '../' : '';

    const list = [
      { id: 'home', title: 'Trang chủ Hub', desc: 'Cổng thông tin & tổng quan lớp học', icon: '🏠', url: prefix + 'index.html', category: 'Điều hướng' },
      { id: 'nv', title: 'Nhiệm vụ', desc: 'Quản lý bài tập & check-in tiến độ', icon: '📌', url: prefix + 'nhiemvu/nv.html', category: 'Chức năng' },
      { id: 'lich', title: 'Thời khóa biểu', desc: 'Lịch học, phòng học & sự kiện theo tuần', icon: '📅', url: prefix + 'lich/lich.html', category: 'Chức năng' },
      { id: 'tb', title: 'Thông báo', desc: 'Bảng tin & thông báo nhắc nhở quan trọng', icon: '🔔', url: prefix + 'thongbao/tb.html', category: 'Chức năng' },
      { id: 'sodo', title: 'Sơ đồ lớp', desc: 'Bản đồ vị trí chỗ ngồi & phân tổ', icon: '🗺️', url: prefix + 'sodo/sd.html', category: 'Chức năng' },
      { id: 'tk', title: 'Thống kê', desc: 'Báo cáo hoàn thành & phân tích tiến độ', icon: '📊', url: prefix + 'thongke/tk.html', category: 'Chức năng' },
      { id: 'hs', title: 'Hồ sơ học sinh', desc: 'Danh sách và thông tin hồ sơ 11C7', icon: '👤', url: prefix + 'hoso/hs.html', category: 'Quản lý' },
      { id: 'pq', title: 'Phân quyền', desc: 'Thiết lập ban cán sự và quyền thao tác', icon: '🛡️', url: prefix + 'perm/pq.html', category: 'Quản lý' },
      { id: 'nk', title: 'Nhật ký hoạt động', desc: 'Lịch sử thao tác và sự kiện hệ thống', icon: '📜', url: prefix + 'logs/nk.html', category: 'Quản lý' }
    ];

    const stds = (typeof STUDENTS !== 'undefined' && Array.isArray(STUDENTS) && STUDENTS.length > 0)
      ? STUDENTS
      : JSON.parse(localStorage.getItem('c7aio_students_cache') || '[]');
    
    stds.forEach(s => {
      if (s && s.name) {
        list.push({
          id: 'std_' + (s.id || s.name),
          title: s.name,
          desc: `Học sinh 11C7 • Tổ ${s.group || 1} ${s.previousClass ? '(' + s.previousClass + ')' : ''}`,
          icon: '🎓',
          url: prefix + 'hoso/hs.html?search=' + encodeURIComponent(s.name),
          category: 'Thành viên'
        });
      }
    });

    try {
      const cachedTasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache') || '[]');
      cachedTasks.slice(0, 20).forEach(t => {
        if (t && t.name) {
          list.push({
            id: 'task_' + t.id,
            title: t.name,
            desc: `Nhiệm vụ ${t.category || 'Bài tập'} ${t.priority === 'Khẩn cấp' ? '• 🔥 Khẩn cấp' : ''}`,
            icon: '📋',
            url: prefix + 'nhiemvu/nv.html',
            category: 'Nhiệm vụ'
          });
        }
      });
    } catch (e) {}

    try {
      const cachedNotifs = JSON.parse(localStorage.getItem('c7aio_notifications_cache') || '[]');
      cachedNotifs.slice(0, 15).forEach(n => {
        if (n && n.message) {
          list.push({
            id: 'notif_' + n.id,
            title: n.message,
            desc: `Thông báo lớp ${n.pinned ? '• 📌 Đã ghim' : ''}`,
            icon: '📢',
            url: prefix + 'thongbao/tb.html',
            category: 'Thông báo'
          });
        }
      });
    } catch (e) {}

    return list;
  },

  injectPaletteUI() {
    if (document.getElementById('c7CommandPalette')) return;
    const modal = document.createElement('div');
    modal.id = 'c7CommandPalette';
    modal.className = 'c7-palette-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="c7-palette-box">
        <div class="c7-palette-header">
          <span class="c7-palette-icon">🔍</span>
          <input type="text" id="c7PaletteInput" class="c7-palette-input" placeholder="Tìm nhanh chức năng, học sinh, nhiệm vụ... (Esc để đóng)" autocomplete="off">
          <span class="c7-palette-badge">ESC</span>
        </div>
        <div class="c7-palette-body" id="c7PaletteResults"></div>
        <div class="c7-palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> Di chuyển</span>
          <span><kbd>Enter</kbd> Mở</span>
          <span><kbd>Esc</kbd> Đóng</span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    const input = document.getElementById('c7PaletteInput');
    input.addEventListener('input', (e) => this.renderResults(e.target.value));
    input.addEventListener('keydown', (e) => this.handleKeydown(e));
  },

  injectHeaderSearchBtn() {
    if (document.getElementById('c7QuickSearchBtn')) return;
    const headerRight = document.querySelector('.header-right') || document.querySelector('.header-content');
    if (!headerRight) return;

    const btn = document.createElement('button');
    btn.id = 'c7QuickSearchBtn';
    btn.className = 'quick-search-trigger-btn';
    btn.type = 'button';
    btn.title = 'Tìm kiếm nhanh (Ctrl + K)';
    btn.innerHTML = `<span>🔍</span><span class="search-btn-label">Tìm nhanh</span><kbd>Ctrl+K</kbd>`;
    btn.onclick = () => this.open();

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn && themeBtn.parentNode) {
      themeBtn.parentNode.insertBefore(btn, themeBtn);
    } else if (headerRight.firstChild) {
      headerRight.insertBefore(btn, headerRight.firstChild);
    } else {
      headerRight.appendChild(btn);
    }
  },

  injectHeaderSyncPill() {
    if (document.getElementById('c7HeaderSyncPill')) return;
    const headerRight = document.querySelector('.header-right') || document.querySelector('.header-content');
    if (!headerRight) return;

    const pill = document.createElement('div');
    pill.id = 'c7HeaderSyncPill';
    pill.className = 'c7-sync-pill online';
    pill.innerHTML = '<span class="pill-dot"></span><span>Đồng bộ</span>';
    pill.title = 'Dữ liệu đã kết nối máy chủ';

    const searchBtn = document.getElementById('c7QuickSearchBtn');
    if (searchBtn && searchBtn.parentNode) {
      searchBtn.parentNode.insertBefore(pill, searchBtn);
    } else if (headerRight.firstChild) {
      headerRight.insertBefore(pill, headerRight.firstChild);
    } else {
      headerRight.appendChild(pill);
    }
    updateOnlineStatus();
  },

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    const modal = document.getElementById('c7CommandPalette');
    if (modal) {
      modal.style.display = 'flex';
      const input = document.getElementById('c7PaletteInput');
      if (input) {
        input.value = '';
        input.focus();
      }
      this.renderResults('');
    }
  },

  close() {
    this.isOpen = false;
    const modal = document.getElementById('c7CommandPalette');
    if (modal) modal.style.display = 'none';
  },

  renderResults(query) {
    const container = document.getElementById('c7PaletteResults');
    if (!container) return;

    const all = this.getAvailableItems();
    const q = (query || '').trim();

    this.items = q ? window.c7FuzzySearch(all, q, ['title', 'desc', 'category']).slice(0, 12) : all.slice(0, 10);

    this.selectedIndex = 0;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="c7-palette-empty">
          <span style="font-size: 1.8rem; margin-bottom: 0.5rem; display: block;">🔎</span>
          <p>Không tìm thấy kết quả phù hợp với "${escapeHtml(query)}"</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.items.map((item, idx) => `
      <div class="c7-palette-item ${idx === 0 ? 'selected' : ''}" data-index="${idx}" onclick="CommandPalette.select(${idx})">
        <span class="c7-palette-item-icon">${item.icon}</span>
        <div class="c7-palette-item-info">
          <div class="c7-palette-item-title">${escapeHtml(item.title)}</div>
          <div class="c7-palette-item-desc">${escapeHtml(item.desc)}</div>
        </div>
        <span class="c7-palette-item-cat">${escapeHtml(item.category)}</span>
      </div>
    `).join('');
  },

  handleKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.items.length);
      this.updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % Math.max(1, this.items.length);
      this.updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.select(this.selectedIndex);
    }
  },

  updateSelection() {
    const list = document.querySelectorAll('.c7-palette-item');
    list.forEach((el, idx) => {
      if (idx === this.selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  },

  select(index) {
    const item = this.items[index];
    if (item && item.url) {
      this.close();
      window.location.href = item.url;
    }
  }
};
window.CommandPalette = CommandPalette;

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

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

// ============= GITHUB ECOSYSTEM LIBRARIES & MOTION/FUZZY ENGINE =============
window.c7NormalizeVi = function(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

window.c7FuzzySearch = function(list, query, keys = ['title', 'name', 'desc']) {
  if (!Array.isArray(list)) return [];
  const qRaw = (query || '').trim();
  if (!qRaw) return list;
  const qNorm = window.c7NormalizeVi(qRaw);

  // Use Fuse.js when loaded from GitHub CDN
  if (typeof window.Fuse === 'function') {
    try {
      const enriched = list.map(item => {
        const normBag = keys.map(k => window.c7NormalizeVi(item && item[k] ? item[k] : '')).join(' ');
        return { _raw: item, _norm: normBag };
      });
      const fuse = new window.Fuse(enriched, {
        keys: ['_norm'],
        threshold: 0.36,
        ignoreLocation: true
      });
      const res = fuse.search(qNorm);
      if (res.length > 0) return res.map(r => r.item._raw);
    } catch (e) {}
  }

  // Built-in Vietnamese Diacritic-Insensitive Fuzzy Scorer fallback
  const tokens = qNorm.split(/\s+/).filter(Boolean);
  return list
    .map(item => {
      const hay = keys.map(k => window.c7NormalizeVi(item && item[k] ? item[k] : '')).join(' ');
      let score = 0;
      if (hay.includes(qNorm)) score += 100;
      tokens.forEach(tok => {
        if (hay.includes(tok)) score += 25;
      });
      return { item, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
};

window.c7Celebrate = function() {
  if (typeof window.confetti === 'function') {
    window.confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.72 },
      colors: ['#0ea5a0', '#14c8c2', '#f59e0b', '#10d48a', '#6366f1']
    });
  }
};

const C7GitHubLibsEngine = {
  loaded: false,
  init() {
    if (this.loaded) return;
    this.loaded = true;
    const libs = [
      { id: 'c7-lib-gsap', src: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js', onLoad: () => this.runEntranceMotion() },
      { id: 'c7-lib-fuse', src: 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js' },
      { id: 'c7-lib-confetti', src: 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js' }
    ];
    libs.forEach(lib => {
      if (document.getElementById(lib.id)) return;
      const s = document.createElement('script');
      s.id = lib.id;
      s.src = lib.src;
      s.async = true;
      if (lib.onLoad) s.onload = lib.onLoad;
      document.head.appendChild(s);
    });
  },
  runEntranceMotion() {
    if (typeof window.gsap === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const targets = document.querySelectorAll('.welcome-hero, .profile-card-widget, .stat-card, .bento-feature-card, .dashboard-panel, .analytics-card, .pq-table-card, .nk-table-card, .task-controls-bar, .notif-top-bar, .hs-top-bar, .hs-view-hub, .sodo-tabs');
      if (targets.length > 0) {
        window.gsap.fromTo(
          targets,
          { opacity: 0, y: 18, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.52, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' }
        );
      }
      this.bindDynamicContainerMotion();
    } catch (e) {}
  },
  bindDynamicContainerMotion() {
    if (this._obsBound || typeof MutationObserver === 'undefined') return;
    this._obsBound = true;
    const containers = document.querySelectorAll('#taskListContainer, #notifListContainer, .sodo-panels, #recentTasks');
    containers.forEach(container => {
      let debounceTimer = null;
      const obs = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (typeof window.gsap === 'undefined') return;
          const items = container.querySelectorAll('.task-item-card, .notif-card-item, .sodo-cell, .recent-item');
          if (items.length > 0 && items.length <= 60) {
            window.gsap.fromTo(
              items,
              { opacity: 0, y: 12, scale: 0.98 },
              { opacity: 1, y: 0, scale: 1, duration: 0.36, stagger: 0.022, ease: 'power2.out', clearProps: 'transform,opacity' }
            );
          }
        }, 30);
      });
      obs.observe(container, { childList: true, subtree: true });
    });
  }
};

// ============= FLOATING SPATIAL GLASS BOTTOM DOCK =============
const BottomDockEngine = {
  init() {
    const path = window.location.pathname;
    if (path.endsWith('login.html') || path.endsWith('/login')) return;
    if (document.getElementById('c7BottomDockWrap')) {
      this.updateBadges();
      return;
    }

    const isInsideSubdir = path.includes('/hoso/') || path.includes('/lich/') ||
                           path.includes('/nhiemvu/') || path.includes('/logs/') ||
                           path.includes('/perm/') || path.includes('/sodo/') ||
                           path.includes('/thongbao/') || path.includes('/thongke/');
    const prefix = isInsideSubdir ? '../' : '';

    const canManageStudents = typeof checkPermission === 'function' && checkPermission('manage_students');

    const navItems = [
      { id: 'dock-home', label: 'Hub', url: prefix + 'index.html', match: (p) => p.endsWith('index.html') || p.endsWith('/') || p.endsWith('/c7aio'), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z"/><path d="M9 21V13h6v8"/></svg>' },
      { id: 'dock-nv', label: 'Nhiệm vụ', url: prefix + 'nhiemvu/nv.html', match: (p) => p.includes('/nhiemvu/'), badgeId: 'c7DockTaskBadge', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M9 12l2 2 4-4"/><path d="M8 2v4M16 2v4"/></svg>' },
      { id: 'dock-lich', label: 'Lịch học', url: prefix + 'lich/lich.html', match: (p) => p.includes('/lich/'), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>' },
      { id: 'dock-tb', label: 'Thông báo', url: prefix + 'thongbao/tb.html', match: (p) => p.includes('/thongbao/'), badgeId: 'c7DockNotifBadge', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
      { id: 'dock-sodo', label: 'Sơ đồ', url: prefix + 'sodo/sd.html', match: (p) => p.includes('/sodo/'), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>' },
      { id: 'dock-tk', label: 'Thống kê', url: prefix + 'thongke/tk.html', match: (p) => p.includes('/thongke/'), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>' }
    ];

    if (canManageStudents) {
      navItems.push({
        id: 'dock-hs', label: 'Hồ sơ', url: prefix + 'hoso/hs.html', match: (p) => p.includes('/hoso/'),
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      });
    }

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const wrap = document.createElement('div');
    wrap.id = 'c7BottomDockWrap';
    wrap.className = 'c7-bottom-dock-wrap';

    wrap.innerHTML = `
      <nav class="c7-bottom-dock" aria-label="Điều hướng nhanh C7AIO">
        ${navItems.map(item => {
          const isActive = item.match(path);
          return `
            <a href="${item.url}" class="c7-dock-item ${isActive ? 'active' : ''}" id="${item.id}" title="${item.label}">
              ${item.icon}
              <span class="c7-dock-label">${item.label}</span>
              ${item.badgeId ? `<span class="c7-dock-badge" id="${item.badgeId}" style="display:none;">0</span>` : ''}
            </a>
          `;
        }).join('')}
        <div class="c7-dock-divider"></div>
        <button type="button" class="c7-dock-item" onclick="CommandPalette.open()" title="Tìm kiếm nhanh (Ctrl + K)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <span class="c7-dock-label">Tìm nhanh</span>
        </button>
        <button type="button" class="c7-dock-item" onclick="ThemeEngine.toggle()" title="Đổi giao diện Sáng / Tối">
          <span id="c7DockThemeIcon" style="font-size:1rem;line-height:1;">${currentTheme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
      </nav>
    `;

    document.body.appendChild(wrap);
    this.updateBadges();
  },

  updateBadges() {
    try {
      const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
      const tasks = (hubTasks && hubTasks.length > 0) ? hubTasks : JSON.parse(localStorage.getItem('c7aio_cached_tasks') || '[]');
      const notifs = (hubNotifications && hubNotifications.length > 0) ? hubNotifications : JSON.parse(localStorage.getItem('c7aio_cached_notifs') || '[]');

      const taskBadge = document.getElementById('c7DockTaskBadge');
      if (taskBadge && user && Array.isArray(tasks)) {
        const openCount = tasks.filter(t => {
          const assigned = !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(user.id);
          if (!assigned) return false;
          const done = t.isGlobalCompleted || (t.completions && t.completions[user.id]) || t.done;
          return !done;
        }).length;
        if (openCount > 0) {
          taskBadge.textContent = openCount > 9 ? '9+' : openCount;
          taskBadge.style.display = 'inline-flex';
        } else {
          taskBadge.style.display = 'none';
        }
      }

      const notifBadge = document.getElementById('c7DockNotifBadge');
      if (notifBadge && user && Array.isArray(notifs)) {
        const unread = notifs.filter(n => !(n.completions && n.completions[user.id])).length;
        if (unread > 0) {
          notifBadge.textContent = unread > 9 ? '9+' : unread;
          notifBadge.style.display = 'inline-flex';
        } else {
          notifBadge.style.display = 'none';
        }
      }
    } catch (e) {}
  }
};
window.BottomDockEngine = BottomDockEngine;

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

  if (typeof CommandPalette !== 'undefined' && CommandPalette.init) {
    CommandPalette.init();
  }

  C7GitHubLibsEngine.init();
  BottomDockEngine.init();

  if (user) {
    let avatarMini = document.getElementById('userAvatarMini');
    const nameDisplay = document.getElementById('userNameDisplay');
    const badgeBtn = nameDisplay ? nameDisplay.closest('.user-badge-btn') : null;
    if (!avatarMini && badgeBtn && nameDisplay) {
      avatarMini = document.createElement('div');
      avatarMini.id = 'userAvatarMini';
      avatarMini.className = 'user-avatar-mini';
      badgeBtn.insertBefore(avatarMini, nameDisplay);
    }
    if (avatarMini) {
      avatarMini.textContent = getInitials(user.name);
      avatarMini.style.background = getAvatarGradient(user.name);
    }

    if (nameDisplay) {
      nameDisplay.textContent = user.name;
    }

    updateWelcomeMessage();
    checkAdminButtons();
    updateOnlineStatus();
    if (typeof startPresence === 'function') startPresence();
    loadStats();
    updateDashboardWidgets();
  }
}

window.addEventListener('DOMContentLoaded', initHubPage);

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
