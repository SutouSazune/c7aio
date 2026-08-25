/**
 * C7AIO Announcements Controller
 * Quản lý thông báo lớp, Ghim thông báo, Rich Text Editor & Trạng thái đã xem
 */

let notifications = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
let currentFilter = 'all';
let searchQuery = '';
let currentUser = null;
let notifQuill = null;
let editingNotifId = null;

const NOTIF_ICONS = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌'
};

window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = buildUrl('login.html');
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = currentUser.name;

  if (checkPermission('manage_notifications')) {
    const btnArea = document.getElementById('adminNotifBtnArea');
    if (btnArea) btnArea.style.display = 'block';
  }

  initEditor();
  renderNotifications();

  // Lắng nghe Realtime
  if (typeof onSharedNotificationsChanged === 'function') {
    onSharedNotificationsChanged((data) => {
      notifications = data || [];
      renderNotifications();
    });
  }
});

function initEditor() {
  const container = document.getElementById('notif-editor-container');
  if (container && typeof Quill !== 'undefined' && !notifQuill) {
    notifQuill = new Quill('#notif-editor-container', {
      theme: 'snow',
      placeholder: 'Nhập nội dung chi tiết bài thông báo...',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
  }
}

// ============= FILTER & SEARCH =============
function setNotifFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderNotifications();
}

function handleNotifSearch(val) {
  searchQuery = (val || '').toLowerCase().trim();
  renderNotifications();
}

function getFilteredNotifications() {
  let list = [...notifications];

  if (currentFilter === 'unread') {
    list = list.filter(n => !(n.completions && n.completions[currentUser.id]));
  } else if (currentFilter !== 'all') {
    list = list.filter(n => n.type === currentFilter);
  }

  if (searchQuery) {
    list = list.filter(n => {
      const matchMsg = (n.message || '').toLowerCase().includes(searchQuery);
      const matchBody = (n.content || '').toLowerCase().includes(searchQuery);
      return matchMsg || matchBody;
    });
  }

  return list;
}

// ============= RENDER NOTIFICATIONS =============
function renderNotifications() {
  const container = document.getElementById('notifListContainer');
  if (!container) return;

  const list = getFilteredNotifications();

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-widget" style="background: var(--card-bg); border-radius: var(--radius-md); padding: 3rem 1rem;">
        <span style="font-size: 3rem;">📭</span>
        <h3 style="font-size: 1.1rem; margin-bottom: 4px;">Không có thông báo nào</h3>
        <p style="font-size: 0.85rem; color: var(--text-sub);">Hãy thay đổi bộ lọc hoặc quay lại sau!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(n => {
    const isRead = n.completions && n.completions[currentUser.id];
    const isPinned = !!n.pinned;
    const icon = NOTIF_ICONS[n.type] || '📢';
    const timeStr = formatTimeAgo(n.createdAt);
    const hasContent = n.content && n.content !== '<p><br></p>' && n.content.trim().length > 0;

    return `
      <div class="notif-card-item ${isPinned ? 'pinned' : ''} ${isRead ? 'read' : ''}" onclick="viewNotifDetail('${n.id}')">
        <div class="notif-icon-bubble">
          ${isPinned ? '📌' : icon}
        </div>

        <div class="notif-content-area">
          <div class="notif-title-row">
            <span class="notif-title-text">${escapeHtml(n.message)}</span>
            ${isPinned ? '<span class="task-badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">Đã ghim</span>' : ''}
            ${!isRead ? '<span class="task-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">Mới</span>' : ''}
          </div>

          <div class="notif-time-badge">
            🕒 Đăng lúc: ${timeStr} ${hasContent ? '• <span style="color: var(--primary); font-weight: 700;">Xem chi tiết →</span>' : ''}
          </div>

          <div style="display: flex; gap: 8px; margin-top: 6px;" onclick="event.stopPropagation()">
            <button class="btn-task-action" onclick="toggleNotifRead('${n.id}')">
              ${isRead ? '✉️ Đánh dấu chưa đọc' : '✅ Đã đọc'}
            </button>
            ${checkPermission('manage_notifications') ? `
              <button class="btn-task-action" onclick="editNotif('${n.id}')">✏️ Sửa</button>
              <button class="btn-task-action" onclick="togglePinNotif('${n.id}')">${isPinned ? 'Bỏ ghim' : '📌 Ghim'}</button>
              <button class="btn-task-action delete" onclick="deleteNotifAction('${n.id}')">🗑️ Xóa</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'vừa xong';
  const d = new Date(isoString);
  const diff = (new Date() - d) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// ============= ACTIONS =============
async function toggleNotifRead(notifId) {
  const n = notifications.find(item => String(item.id) === String(notifId));
  if (!n) return;

  if (!n.completions) n.completions = {};
  n.completions[currentUser.id] = !n.completions[currentUser.id];

  renderNotifications();
  if (typeof updateSharedNotificationCompletion === 'function') {
    await updateSharedNotificationCompletion(n.id, n.completions);
  }
}

function viewNotifDetail(notifId) {
  const n = notifications.find(item => String(item.id) === String(notifId));
  if (!n) return;

  // Auto mark as read
  if (!n.completions) n.completions = {};
  if (!n.completions[currentUser.id]) {
    n.completions[currentUser.id] = true;
    if (typeof updateSharedNotificationCompletion === 'function') {
      updateSharedNotificationCompletion(n.id, n.completions);
    }
  }

  document.getElementById('viewNotifModalTitle').textContent = n.message;
  document.getElementById('viewNotifModalMeta').textContent = `🕒 ${new Date(n.createdAt).toLocaleString('vi-VN')}`;
  document.getElementById('viewNotifModalBody').innerHTML = n.content || '<p style="color: var(--text-muted); font-style: italic;">Không có nội dung mở rộng.</p>';
  document.getElementById('notifDetailOverlay').style.display = 'flex';
  renderNotifications();
}

function closeNotifDetailModal() {
  document.getElementById('notifDetailOverlay').style.display = 'none';
}

function openNotifModal(isEdit = false) {
  const overlay = document.getElementById('notifModalOverlay');
  const titleEl = document.getElementById('notifModalTitle');
  if (!overlay) return;

  if (!isEdit) {
    editingNotifId = null;
    titleEl.textContent = '📢 Đăng Thông Báo Mới';
    document.getElementById('inputNotifTitle').value = '';
    document.getElementById('selectNotifType').value = 'info';
    document.getElementById('checkNotifPin').checked = false;
    if (notifQuill) notifQuill.setContents([]);
  }

  overlay.style.display = 'flex';
}

function closeNotifModal() {
  document.getElementById('notifModalOverlay').style.display = 'none';
  editingNotifId = null;
}

function editNotif(notifId) {
  const n = notifications.find(item => String(item.id) === String(notifId));
  if (!n) return;

  editingNotifId = notifId;
  document.getElementById('notifModalTitle').textContent = '✏️ Chỉnh Sửa Thông Báo';
  document.getElementById('inputNotifTitle').value = n.message || '';
  document.getElementById('selectNotifType').value = n.type || 'info';
  document.getElementById('checkNotifPin').checked = !!n.pinned;

  if (notifQuill) {
    notifQuill.root.innerHTML = n.content || '';
  }

  openNotifModal(true);
}

async function togglePinNotif(notifId) {
  const n = notifications.find(item => String(item.id) === String(notifId));
  if (!n) return;

  n.pinned = !n.pinned;
  if (typeof saveSharedNotification === 'function') {
    await saveSharedNotification(n);
  }
  showToast(n.pinned ? '📌 Đã ghim thông báo!' : 'Đã bỏ ghim thông báo!', 'info');
  renderNotifications();
}

async function submitNotifForm() {
  if (!checkPermission('manage_notifications')) {
    showToast('Bạn không có quyền đăng thông báo!', 'error');
    return;
  }

  const title = document.getElementById('inputNotifTitle').value.trim();
  const type = document.getElementById('selectNotifType').value;
  const pinned = document.getElementById('checkNotifPin').checked;
  const content = notifQuill ? notifQuill.root.innerHTML : '';

  if (!title) {
    showToast('Vui lòng nhập tiêu đề thông báo!', 'warning');
    return;
  }

  const isEdit = !!editingNotifId;
  const notifObj = {
    id: isEdit ? editingNotifId : Date.now(),
    message: title,
    type: type,
    pinned: pinned,
    content: (content === '<p><br></p>') ? '' : content,
    createdAt: isEdit ? (notifications.find(n => String(n.id) === String(editingNotifId))?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    completions: isEdit ? (notifications.find(n => String(n.id) === String(editingNotifId))?.completions || {}) : {}
  };

  if (typeof saveSharedNotification === 'function') {
    await saveSharedNotification(notifObj);
  }

  if (typeof logAction === 'function') {
    logAction(isEdit ? 'Sửa thông báo' : 'Đăng thông báo', `Tiêu đề: ${title}`);
  }

  showToast(isEdit ? 'Đã cập nhật thông báo!' : 'Đã đăng thông báo thành công!', 'success');
  closeNotifModal();
  renderNotifications();
}

async function deleteNotifAction(notifId) {
  if (!checkPermission('manage_notifications')) return;

  showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa bài thông báo này không?', async () => {
    if (typeof deleteSharedNotification === 'function') {
      await deleteSharedNotification(notifId);
      if (typeof logAction === 'function') {
        logAction('Xóa thông báo', `ID: ${notifId}`);
      }
      showToast('Đã xóa thông báo!', 'success');
      renderNotifications();
    }
  });
}
