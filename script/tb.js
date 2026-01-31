let notifications = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
let currentFilter = 'all';
let currentUser = null;

const notificationIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌'
};

window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  
  document.getElementById('notificationInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addNotification();
    }
  });

  // Chỉ admin mới thêm được thông báo
  if (!checkPermission('manage_notifications')) {
    document.querySelector('.notification-input-area').style.display = 'none';
  }

  // Render ngay từ cache
  renderNotifications();

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

function toggleNotificationCompletion(notifId) {
  const notif = notifications.find(n => n.id === notifId);
  if (!notif) return;

  if (!notif.completions) {
    notif.completions = {};
  }

  notif.completions[currentUser.id] = !notif.completions[currentUser.id];
  updateSharedNotificationCompletion(notifId, notif.completions);
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
  const filtered = getFilteredNotifications();

  if (filtered.length === 0) {
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
      const totalStudents = STUDENTS.length;
      const completions = notif.completions || {};
      const completedCount = Object.values(completions).filter(v => v).length;
      const userCompleted = completions[currentUser.id] || false;

      return `
        <li class="notification-item ${notif.type} ${userCompleted ? 'completed' : ''}" style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.05}s; opacity: 0; transform: translateY(20px);">
          <button class="notification-checkbox-btn ${userCompleted ? 'active' : ''}" 
                  onclick="toggleNotificationCompletion(${notif.id})">
            ${userCompleted ? '✅' : '⭕'}
          </button>
          <div class="notification-content">
            <div class="notification-icon">${notificationIcons[notif.type]}</div>
            <div class="notification-message ${userCompleted ? 'completed' : ''}">
              ${notif.message}
            </div>
            <div class="notification-meta">
              <span class="notification-time">${formatTime(notif.createdAt)}</span>
              <span class="notification-completion">${completedCount} / ${totalStudents} đã xem</span>
            </div>
          </div>
          ${checkPermission('manage_notifications') ? `<button class="notification-delete-btn" onclick="deleteNotification(${notif.id})">🗑️</button>` : ''}
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
