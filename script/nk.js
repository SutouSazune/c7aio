/**
 * C7AIO Activity Logs Controller
 */

let systemLogs = [];
let logSearchQuery = '';

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

  if (typeof onSharedLogsChanged === 'function') {
    onSharedLogsChanged((logs) => {
      systemLogs = logs || [];
      renderLogs();
    });
  }
});

function handleLogSearch(query) {
  logSearchQuery = (query || '').toLowerCase().trim();
  renderLogs();
}

function getActionBadgeClass(action) {
  const a = (action || '').toLowerCase();
  if (a.includes('thêm') || a.includes('tạo') || a.includes('giao')) return 'create';
  if (a.includes('sửa') || a.includes('cập nhật')) return 'update';
  if (a.includes('xóa') || a.includes('hủy')) return 'delete';
  return 'default';
}

function renderLogs() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  const filtered = systemLogs.filter(l => {
    if (!logSearchQuery) return true;
    return (l.user || '').toLowerCase().includes(logSearchQuery) ||
           (l.action || '').toLowerCase().includes(logSearchQuery) ||
           (l.detail || '').toLowerCase().includes(logSearchQuery) ||
           (l.role || '').toLowerCase().includes(logSearchQuery);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Không có nhật ký hoạt động nào.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(log => {
    const d = new Date(log.timestamp);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const badgeClass = getActionBadgeClass(log.action);

    return `
      <tr>
        <td style="color: var(--text-sub); white-space: nowrap; font-size: 0.85rem;">🕒 ${timeStr}</td>
        <td><strong>${escapeHtml(log.user || 'Unknown')}</strong></td>
        <td><span class="user-role-pill" style="background: #6366f1; font-size: 0.75rem;">${escapeHtml(log.role || 'Khách')}</span></td>
        <td><span class="log-action-badge ${badgeClass}">${escapeHtml(log.action || '')}</span></td>
        <td style="color: var(--text-sub); font-size: 0.88rem;">${escapeHtml(log.detail || '')}</td>
      </tr>
    `;
  }).join('');
}
