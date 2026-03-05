let notifications = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
let currentFilter = 'all';
let currentUser = null;
let notifQuill = null;
let editingNotifId = null;

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
    const adminCtrl = document.getElementById('adminControls');
    if (adminCtrl) adminCtrl.style.display = 'block';
  }

  // Khởi tạo Editor an toàn
  initNotificationEditor();

  // --- FALLBACK ---
  if (typeof window.showToast !== 'function') window.showToast = (msg) => alert(msg);
  if (!document.getElementById('fallback-animation-style')) {
    const style = document.createElement('style');
    style.id = 'fallback-animation-style';
    style.innerHTML = `
      :root { --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); --primary-color: #667eea; }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      
      /* Mặc định hiển thị để tránh lỗi tàng hình */
      .notification-item { opacity: 1; transform: none; transition: opacity 0.3s ease; }
      @supports (animation: fadeInUp) {
        .notification-item { opacity: 0; animation: fadeInUp 0.5s var(--ease-spring) forwards; }
      }

      .notif-check-btn {
        background: none; border: none; font-size: 1.2rem; cursor: pointer; 
        padding: 5px; transition: transform 0.2s; display: flex; align-items: center;
      }
      .notif-check-btn:hover { transform: scale(1.2); }
      .notification-item.completed { opacity: 0.6; filter: grayscale(0.5); }
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

function initNotificationEditor() {
  const editorEl = document.getElementById('notif-editor-container');
  if (editorEl && typeof Quill !== 'undefined') {
    try {
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

      // Thêm Handler cho nút Image để hỗ trợ upload file local
      notifQuill.getModule('toolbar').addHandler('image', () => {
        selectLocalFileForNotif();
      });
    } catch (e) { console.error("Quill Init Error:", e); }
  }
}

function selectLocalFileForNotif() {
  if (!notifQuill) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.accept = 'image/*, .pdf, .doc, .docx, .xls, .xlsx';
  document.body.appendChild(input);

  input.onchange = () => {
    const file = input.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Kiểm tra range an toàn
        const range = notifQuill.getSelection(true) || { index: notifQuill.getLength() };
        const index = range.index !== undefined ? range.index : notifQuill.getLength();

        if (file.type.startsWith('image/')) {
          notifQuill.insertEmbed(index, 'image', e.target.result, 'user');
          notifQuill.setSelection(index + 1, 'user');
        } else {
          notifQuill.insertText(index, file.name, 'link', e.target.result, 'user');
          notifQuill.setSelection(index + file.name.length, 'user');
        }
      };
      reader.readAsDataURL(file);
    }
    setTimeout(() => { if (input.parentNode) document.body.removeChild(input); }, 100);
  };
  input.click();
}

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

function openNotificationModal(notifId = null, event = null) {
  if (event) event.stopPropagation();

  const modal = document.getElementById('notificationModal');
  if (!modal) return;

  const titleEl = modal.querySelector('.modal-header h2');
  const saveBtn = modal.querySelector('.save-btn');

  // Chuyển sang so sánh không nghiêm ngặt (==) để xử lý trường hợp ID từ DOM là string
  // và ID trong notifications array là number.
  if (notifId) {
    editingNotifId = notifId;
    const notif = notifications.find(n => n.id == notifId);
    if (notif) {
      document.getElementById('modalNotifTitle').value = notif.message;
      document.getElementById('modalNotifType').value = notif.type;
      if (notifQuill) notifQuill.root.innerHTML = notif.content || '';
      titleEl.innerHTML = '✏️ Chỉnh Sửa Thông Báo';
      saveBtn.textContent = 'Cập Nhật Thông Báo';
    } else {
      // Fallback nếu không tìm thấy thông báo (có thể ID đã cũ hoặc lỗi)
      showToast('Không tìm thấy thông báo để sửa!', 'error');
      closeNotificationModal();
      return;
    }
  } else {
    editingNotifId = null;
    document.getElementById('modalNotifTitle').value = '';
    document.getElementById('modalNotifType').value = 'info';
    if (notifQuill) notifQuill.setContents([]);
    titleEl.innerHTML = '📢 Đăng Thông Báo Mới';
    saveBtn.textContent = 'Đăng Thông Báo';
  }

  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeNotificationModal() {
  const modal = document.getElementById('notificationModal');
  if (modal) modal.classList.remove('show');
  document.body.style.overflow = '';
  editingNotifId = null;
}

function saveNotification() {
  const title = document.getElementById('modalNotifTitle').value.trim();
  const type = document.getElementById('modalNotifType').value;
  const content = notifQuill ? notifQuill.root.innerHTML : '';

  if (!title) {
    showToast('Vui lòng nhập tiêu đề', 'error');
    return;
  }
  
  const isEditing = !!editingNotifId;
  const idToSave = isEditing ? editingNotifId : String(Date.now());

  const newNotif = {
    id: idToSave,
    message: title,
    content: content === '<p><br></p>' ? '' : content,
    type: type,
    createdAt: isEditing ? (notifications.find(n => n.id == editingNotifId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveSharedNotification(newNotif);
  showToast(editingNotifId ? 'Đã cập nhật thông báo!' : 'Đã đăng thông báo!', 'success');
  closeNotificationModal();
}

function viewNotificationContent(notifId) {
  const notif = notifications.find(n => n.id === notifId);
  if (!notif) return;
  document.getElementById('viewNotifTitle').textContent = notif.message;
  document.getElementById('viewNotifBody').innerHTML = notif.content || 'Không có nội dung.';
  const modal = document.getElementById('notifContentModal');
  if (modal) modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeNotifContentModal() {
  const modal = document.getElementById('notifContentModal');
  if (modal) modal.classList.remove('show');
  document.body.style.overflow = '';
}

function deleteNotification(notifId, event) {
  // Ngăn chặn việc bấm nút xóa lại nhảy vào xem chi tiết thông báo
  if (event) event.stopPropagation();

  if (!checkPermission('manage_notifications')) {
    showToast('Bạn không có quyền xóa thông báo', 'error');
    return;
  }

  window.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa thông báo này không? Hành động này không thể hoàn tác.', function() {
    deleteSharedNotification(notifId);
    logAction('Xóa thông báo', `ID: ${notifId}`);
    showToast('Đã xóa thông báo', 'success');
  });
}

async function toggleNotificationCompletion(notifId, event) {
  // Ngăn chặn việc bấm nút check lại nhảy vào xem chi tiết
  if (event) event.stopPropagation();

  const notif = notifications.find(n => n.id == notifId);
  if (!notif) return;

  if (!notif.completions) {
    notif.completions = {};
  }

  notif.completions[currentUser.id] = !notif.completions[currentUser.id];
  updateSharedNotificationCompletion(notifId, notif.completions);
}

function filterNotifications(filter, event) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (event && event.target) event.target.classList.add('active');
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

function isContentEmpty(content) {
  if (!content) return true;
  const stripped = content.replace(/<[^>]*>/g, '').trim();
  return stripped.length === 0 && !content.includes('<img');
}

function renderNotifications() {
  const container = document.getElementById('notificationList');
  const filtered = getFilteredNotifications() || [];

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
      const hasContent = !isContentEmpty(notif.content);
      const isCompleted = notif.completions && notif.completions[currentUser.id];

      return `
        <li class="notification-item ${notif.type} ${isCompleted ? 'completed' : ''}" 
            onclick="${hasContent ? `viewNotificationContent('${notif.id}')` : ''}"
            style="animation-delay: ${index * 0.05}s; cursor: ${hasContent ? 'pointer' : 'default'};">
          <button class="notif-check-btn" onclick="toggleNotificationCompletion('${notif.id}', event)" title="${isCompleted ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}">
            ${isCompleted ? '✅' : '☐'}
          </button>
          <div class="notification-content" style="flex: 1;">
            <div class="notification-icon">${notificationIcons[notif.type]}</div>
            <div class="notification-message">
              ${escapeHtml(notif.message)}
              ${hasContent ? '<span style="font-size: 0.7rem; color: var(--primary-color); margin-left: 5px;">(Xem chi tiết)</span>' : ''}
            </div>
            <div class="notification-meta">
              <span class="notification-time">${formatTime(notif.createdAt)}</span>
            </div>
          </div>
          ${checkPermission('manage_notifications') ? `
            <div class="admin-actions" style="display: flex; gap: 8px;">
              <button class="notification-edit-btn" onclick="openNotificationModal('${notif.id}', event)" style="background: #f1f2f6; border: none; padding: 8px; border-radius: 8px; cursor: pointer;">✏️</button>
              <button class="notification-delete-btn" onclick="deleteNotification('${notif.id}', event)">🗑️</button>
            </div>
          ` : ''}
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
