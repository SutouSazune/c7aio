// Lấy thông báo từ localStorage
function getNotifications() {
  const stored = localStorage.getItem('c7aio_notifications');
  return stored ? JSON.parse(stored) : [];
}

// Lưu thông báo vào localStorage
function saveNotifications(notifications) {
  localStorage.setItem('c7aio_notifications', JSON.stringify(notifications));
}

let notifications = getNotifications();
let currentFilter = 'all';

const notificationIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌'
};

function addNotification() {
  const input = document.getElementById('notificationInput');
  const typeSelect = document.getElementById('notificationType');
  const message = input.value.trim();
  const type = typeSelect.value;

  if (!message) {
    alert('Vui lòng nhập nội dung thông báo');
    return;
  }

  const newNotification = {
    id: Date.now(),
    message: message,
    type: type,
    createdAt: new Date().toISOString()
  };

  notifications.unshift(newNotification);
  saveNotifications(notifications);
  input.value = '';
  renderNotifications();
}

function deleteNotification(id) {
  notifications = notifications.filter(n => n.id !== id);
  saveNotifications(notifications);
  renderNotifications();
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
  const notificationList = document.getElementById('notificationList');
  const filtered = getFilteredNotifications();

  if (filtered.length === 0) {
    notificationList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>Không có thông báo nào</p>
      </div>
    `;
    return;
  }

  notificationList.innerHTML = filtered
    .map(notification => `
      <li class="notification-item ${notification.type}">
        <div class="notification-icon">
          ${notificationIcons[notification.type]}
        </div>
        <div class="notification-content">
          <div class="notification-message">
            ${escapeHtml(notification.message)}
          </div>
          <div class="notification-time">
            ${formatTime(notification.createdAt)}
          </div>
        </div>
        <button class="notification-delete-btn" onclick="deleteNotification(${notification.id})">
          Xóa
        </button>
      </li>
    `)
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notificationInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addNotification();
    }
  });

  renderNotifications();
});
