/**
 * C7AIO Activity Logs Controller
 * - Nhật ký hoạt động (mọi người có quyền view_logs)
 * - Bảng điều khiển Admin: online, thống kê, hoạt động từng người dùng
 */

let systemLogs = [];
let logSearchQuery = '';
let presenceData = {};
let userStatsData = {};
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

window.addEventListener('load', () => {
  const user = getCurrentUser();
  if (!user || !checkPermission('view_logs')) {
    showToast('Bạn không có quyền xem nhật ký hoạt động!', 'error');
    setTimeout(() => {
      window.location.href = buildUrl('index.html');
    }, 800);
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = user.name;

  if (isAdmin()) {
    document.getElementById('adminPanel').style.display = 'block';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    document.querySelectorAll('.admin-col').forEach(el => el.style.display = '');
    if (typeof onSharedPresenceChanged === 'function') {
      onSharedPresenceChanged(p => { presenceData = p; renderAdmin(); });
    }
    if (typeof onSharedUserStatsChanged === 'function') {
      onSharedUserStatsChanged(s => { userStatsData = s; renderAdmin(); });
    }
    setInterval(renderAdmin, 30000);
  }

  if (typeof onSharedLogsChanged === 'function') {
    onSharedLogsChanged((logs) => {
      systemLogs = logs || [];
      refreshUserFilter();
      renderLogs();
      renderAdmin();
    }, 500);
  }
});

function switchTab(tab) {
  document.querySelectorAll('.nk-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('tabLogs').style.display = tab === 'logs' ? 'block' : 'none';
  document.getElementById('tabUsers').style.display = tab === 'users' ? 'block' : 'none';
}

function handleLogSearch(query) {
  logSearchQuery = (query || '').toLowerCase().trim();
  renderLogs();
}

function handleLogFilter() {
  renderLogs();
}

// Xem log của 1 người dùng (từ bảng Người dùng)
function viewUserLogs(name) {
  const sel = document.getElementById('logUserFilter');
  sel.value = name;
  switchTab('logs');
  renderLogs();
}

function refreshUserFilter() {
  const sel = document.getElementById('logUserFilter');
  if (!sel) return;
  const current = sel.value;
  const names = [...new Set(systemLogs.map(l => l.user || 'Unknown'))].sort((a, b) => a.localeCompare(b, 'vi'));
  sel.innerHTML = '<option value="">Tất cả người dùng</option>' +
    names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = names.includes(current) ? current : '';
}

function getLogType(l) {
  if (l.type) return l.type;
  const a = (l.action || '').toLowerCase();
  if (a.includes('đăng nhập thất bại')) return 'login_failed';
  if (a.includes('đăng nhập')) return 'login';
  if (a.includes('đăng xuất')) return 'logout';
  if (a.includes('truy cập')) return 'pageview';
  return 'action';
}

function getActionBadgeClass(l) {
  const t = getLogType(l);
  if (t === 'login') return 'create';
  if (t === 'login_failed') return 'delete';
  if (t === 'logout' || t === 'pageview') return 'default';
  const a = (l.action || '').toLowerCase();
  if (a.includes('thêm') || a.includes('tạo') || a.includes('giao') || a.includes('đăng thông báo')) return 'create';
  if (a.includes('sửa') || a.includes('cập nhật')) return 'update';
  if (a.includes('xóa') || a.includes('hủy')) return 'delete';
  return 'default';
}

function formatLogTime(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return '--';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function timeAgo(ts) {
  const t = new Date(ts).getTime();
  if (!t) return 'Chưa có';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'Vừa xong';
  if (s < 3600) return Math.floor(s / 60) + ' phút trước';
  if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
  return Math.floor(s / 86400) + ' ngày trước';
}

function getFilteredLogs() {
  const uf = (document.getElementById('logUserFilter') || {}).value || '';
  const tf = (document.getElementById('logTypeFilter') || {}).value || '';
  return systemLogs.filter(l => {
    if (uf && (l.user || 'Unknown') !== uf) return false;
    if (tf && getLogType(l) !== tf) return false;
    if (!logSearchQuery) return true;
    return (l.user || '').toLowerCase().includes(logSearchQuery) ||
           (l.action || '').toLowerCase().includes(logSearchQuery) ||
           (l.detail || '').toLowerCase().includes(logSearchQuery) ||
           (l.role || '').toLowerCase().includes(logSearchQuery);
  });
}

function renderLogs() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;
  const admin = isAdmin();
  const filtered = getFilteredLogs();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${admin ? 6 : 5}" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Không có nhật ký hoạt động nào.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(log => {
    const badgeClass = getActionBadgeClass(log);
    return `
      <tr>
        <td style="color: var(--text-sub); white-space: nowrap; font-size: 0.85rem;">🕒 ${formatLogTime(log.timestamp)}</td>
        <td><strong>${escapeHtml(log.user || 'Unknown')}</strong></td>
        <td><span class="user-role-pill" style="background: #6366f1; font-size: 0.75rem;">${escapeHtml(log.role || 'Khách')}</span></td>
        <td><span class="log-action-badge ${badgeClass}">${escapeHtml(log.action || '')}</span></td>
        <td style="color: var(--text-sub); font-size: 0.88rem;">${escapeHtml(log.detail || '')}</td>
        ${admin ? `<td style="color: var(--text-muted); font-size: 0.78rem;">${escapeHtml(log.device || '')}</td>` : ''}
      </tr>
    `;
  }).join('');
}

// ============= ADMIN =============
function getOnlineUsers() {
  const now = Date.now();
  const res = {};
  Object.keys(presenceData || {}).forEach(key => {
    const sessions = presenceData[key] || {};
    Object.values(sessions).forEach(s => {
      if (s && s.lastSeen && now - s.lastSeen < ONLINE_WINDOW_MS) {
        if (!res[key] || s.lastSeen > res[key].lastSeen) res[key] = s;
      }
    });
  });
  return res;
}

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}

function renderAdmin() {
  if (!isAdmin()) return;
  const online = getOnlineUsers();
  const today = startOfToday();
  const weekAgo = Date.now() - 7 * 86400000;

  const todayUsers = new Set();
  const weekUsers = new Set();
  let loginsToday = 0, fails = 0;
  const actionCount = {};
  systemLogs.forEach(l => {
    const t = new Date(l.timestamp).getTime();
    const type = getLogType(l);
    const key = l.userKey || l.user;
    if (type === 'login_failed') fails++;
    else if (key && key !== 'guest') {
      if (t >= today) todayUsers.add(key);
      if (t >= weekAgo) weekUsers.add(key);
      if (type === 'action') actionCount[l.user] = (actionCount[l.user] || 0) + 1;
    }
    if (type === 'login' && t >= today) loginsToday++;
  });

  const students = (typeof STUDENTS !== 'undefined' && Array.isArray(STUDENTS)) ? STUDENTS : [];
  const loggedNames = new Set(Object.values(userStatsData).map(s => (s.name || '').toLowerCase()));
  const never = students.filter(s => !loggedNames.has((s.name || '').toLowerCase()));

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stOnline', Object.keys(online).length);
  set('stToday', todayUsers.size);
  set('stLogins', loginsToday);
  set('stWeek', weekUsers.size);
  set('stNever', never.length);
  set('stFail', fails);

  // Bảng người dùng: gộp userStats + học sinh chưa đăng nhập
  const rows = Object.keys(userStatsData).map(key => {
    const s = userStatsData[key];
    return { key, name: s.name, role: s.role, lastLogin: s.lastLogin, loginCount: s.loginCount || 0, device: s.device };
  });
  never.forEach(s => rows.push({ key: 'x' + s.id, name: s.name, role: '', lastLogin: null, loginCount: 0, device: '' }));
  rows.sort((a, b) => {
    const oa = online[a.key] ? 1 : 0, ob = online[b.key] ? 1 : 0;
    if (oa !== ob) return ob - oa;
    return (new Date(b.lastLogin || 0)) - (new Date(a.lastLogin || 0));
  });

  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => {
    const o = online[r.key];
    const status = o ? '<span style="color:#10b981;font-weight:700;">🟢 Online</span>' : '<span style="color:var(--text-muted);">⚪ Offline</span>';
    return `
      <tr>
        <td>${status}</td>
        <td><strong>${escapeHtml(r.name || '')}</strong></td>
        <td style="font-size:0.82rem;">${escapeHtml(r.role || '—')}</td>
        <td style="font-size:0.85rem;color:var(--text-sub);">${r.lastLogin ? formatLogTime(r.lastLogin) + ' (' + timeAgo(r.lastLogin) + ')' : '<em>Chưa đăng nhập</em>'}</td>
        <td>${r.loginCount}</td>
        <td>${actionCount[r.name] || 0}</td>
        <td style="font-size:0.82rem;">${o ? escapeHtml(o.page || '') : '—'}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml((o && o.device) || r.device || '')}</td>
        <td>${r.loginCount || actionCount[r.name] ? `<button class="nk-btn" onclick="viewUserLogs(decodeURIComponent('${encodeURIComponent(r.name || '')}'))">Xem log</button>` : ''}</td>
      </tr>
    `;
  }).join('');
}

function exportLogsCsv() {
  const rows = getFilteredLogs();
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = ['Thời gian,Người dùng,Chức vụ,Hành động,Chi tiết,Trang,Thiết bị']
    .concat(rows.map(l => [formatLogTime(l.timestamp), l.user, l.role, l.action, l.detail, l.page, l.device].map(esc).join(',')))
    .join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nhat-ky-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function purgeOldLogs() {
  const run = async () => {
    const n = await clearOldLogs(30);
    showToast(`Đã xóa ${n} log cũ.`, 'success');
  };
  if (typeof showConfirm === 'function') {
    showConfirm('Xóa log cũ', 'Xóa toàn bộ nhật ký cũ hơn 30 ngày? Không thể hoàn tác.', run);
  } else if (confirm('Xóa log cũ hơn 30 ngày?')) {
    run();
  }
}