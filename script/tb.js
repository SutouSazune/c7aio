let notifications = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
let currentFilter = 'all';
let currentUser = null;
let notifQuill = null;

const notificationIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌'
};

window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  
  // Chỉ admin mới thêm được thông báo
  if (checkPermission('manage_notifications')) {
    document.getElementById('adminControls').style.display = 'block';
  }

  // Khởi tạo Quill Editor cho Thông báo
  notifQuill = new Quill('#notif-editor-container', {
    theme: 'snow',
    placeholder: 'Nhập nội dung chi tiết nếu có...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ]
    }
  });

  // --- FALLBACK ---
  if (typeof window.showToast !== 'function') window.showToast = (msg) => alert(msg);
  if (!document.getElementById('fallback-animation-style')) {
    const style = document.createElement('style');
    style.id = 'fallback-animation-style';
    style.innerHTML = `
      :root { --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      
      /* Fallback visibility */
      .notification-item { opacity: 1; transform: none; }
      @supports (animation: fadeInUp) {
        .notification-item { opacity: 0 !important; animation: fadeInUp 0.5s var(--ease-spring) forwards !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // Render Skeleton hoặc Cache
  if (!notifications || notifications.length === 0) {
    renderSkeletonNotifications();
  } else {
    renderNotifications();
  }

  // Lắng nghe dữ liệu từ Firebase
  onSharedNotificationsChanged((data) => {
    notifications = data;
    renderNotifications();
  });
  
  // Lắng nghe danh sách học sinh để tính toán số lượng người đã xem chính xác
  onSharedStudentsChanged((data) => {
    if (data) {
      STUDENTS = data;
      renderNotifications();
    }
  });
});

function renderSkeletonNotifications() {
  const container = document.getElementById('notificationList');
  let html = '';
  for (let i = 0; i < 3; i++) {
    html += `
      <li class="notification-item" style="padding: 20px; display: flex; gap: 15px;">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 50%;"></div>
        <div style="flex: 1;">
          <div class="skeleton" style="width: 80%; height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="width: 30%; height: 14px;"></div>
        </div>
      </li>
    `;
  }
  container.innerHTML = html;
}

function openNotificationModal() {
  document.getElementById('notificationModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeNotificationModal() {
  document.getElementById('notificationModal').classList.remove('show');
  document.body.style.overflow = '';
}

function saveNotification() {
  const title = document.getElementById('modalNotifTitle').value.trim();
  const type = document.getElementById('modalNotifType').value;
  const content = notifQuill.root.innerHTML;

  if (!title) {
    showToast('Vui lòng nhập tiêu đề', 'error');
    return;
  }

  const newNotif = {
    id: Date.now(),
    message: title,
    content: content === '<p><br></p>' ? '' : content,
    type: type,
    createdAt: new Date().toISOString()
  };

  saveSharedNotification(newNotif);
  showToast('Đã đăng thông báo!', 'success');
  closeNotificationModal();
}

function viewNotificationContent(notifId) {
  const notif = notifications.find(n => n.id === notifId);
  if (!notif) return;
  document.getElementById('viewNotifTitle').textContent = notif.message;
  document.getElementById('viewNotifBody').innerHTML = notif.content || 'Không có nội dung.';
  document.getElementById('notifContentModal').classList.add('show');
}

function closeNotifContentModal() {
  document.getElementById('notifContentModal').classList.remove('show');
}

function addNotification() {
  if (!checkPermission('manage_notifications')) {
    showToast('Bạn không có quyền thêm thông báo', 'error');
    return;
  }

  const input = document.getElementById('notificationInput');
  const typeSelect = document.getElementById('notificationType');
  const message = input.value.trim();
  const type = typeSelect.value;

  if (!message) {
    showToast('Vui lòng nhập nội dung thông báo', 'error');
    return;
  }

  const newNotification = {
    id: Date.now(),
    message: message,
    type: type,
    createdAt: new Date().toISOString(),
    completions: {} // { userId: true/false }
  };

  saveSharedNotification(newNotification);
  logAction('Thêm thông báo', `Nội dung: ${message}`);
  showToast('Đã đăng thông báo!', 'success');
  input.value = '';
}

function deleteNotification(notifId) {
  if (!checkPermission('manage_notifications')) {
    showToast('Bạn không có quyền xóa thông báo', 'error');
    return;
  }

  if (confirm('Xóa thông báo này?')) {
    deleteSharedNotification(notifId);
    logAction('Xóa thông báo', `ID: ${notifId}`);
    showToast('Đã xóa thông báo', 'success');
  }
}

function filterNotifications(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  renderNotifications();
}

function getFilteredNotifications() {
  if (currentFilter === 'all') {
    return notifications;
  }
  return notifications.filter(n => n.type === currentFilter);
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'vừa xong';
  } else if (minutes < 60) {
    return `${minutes} phút trước`;
  } else if (hours < 24) {
    return `${hours} giờ trước`;
  } else if (days < 7) {
    return `${days} ngày trước`;
  } else {
    return date.toLocaleDateString('vi-VN');
  }
}

function renderNotifications() {
  const container = document.getElementById('notificationList');
  const filtered = (getFilteredNotifications() || []).filter(n => n && n.id);

  if (!filtered || filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>Không có thông báo nào</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((notif, index) => {
      return `
        <li class="notification-item ${notif.type}" 
            onclick="${notif.content ? `viewNotificationContent(${notif.id})` : ''}"
            style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.05}s; cursor: ${notif.content ? 'pointer' : 'default'};">
          <div class="notification-content" style="flex: 1;">
            <div class="notification-icon">${notificationIcons[notif.type]}</div>
            <div class="notification-message">
              ${escapeHtml(notif.message)}
              ${notif.content ? '<span style="font-size: 0.7rem; color: var(--primary-color); margin-left: 5px;">(Xem chi tiết)</span>' : ''}
            </div>
            <div class="notification-meta">
              <span class="notification-time">${formatTime(notif.createdAt)}</span>
            </div>
          </div>
          ${checkPermission('manage_notifications') ? `<button class="notification-delete-btn" onclick="deleteNotification(${notif.id}, event)">🗑️</button>` : ''}
        </li>
      `;
    })
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
