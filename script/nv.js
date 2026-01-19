// Load từ cache ngay lập tức
let tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
let currentFilter = 'all';
let currentUser = null;
let quill = null; // Biến global cho editor

// Khởi tạo
window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  
  // Chỉ admin mới thêm được task
  if (isAdmin()) {
    document.getElementById('adminControls').style.display = 'block';
  }

  // Khởi tạo Quill Editor
  quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Viết nội dung chi tiết, chèn ảnh, định dạng văn bản tại đây...',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image', 'video'], // Cho phép chèn ảnh trực tiếp
        ['clean']
      ]
    }
  });

  // Render ngay dữ liệu từ cache (nếu có)
  renderTasks();

  // Lắng nghe dữ liệu từ Firebase thay vì loadTasks từ localStorage
  onSharedTasksChanged((updatedTasks) => {
    tasks = updatedTasks;
    renderTasks();
  });
});

// --- MODAL FUNCTIONS ---
function openTaskModal() {
  document.body.style.overflow = ''; // Fix scroll lock issue on mobile
  document.getElementById('taskModal').style.display = 'flex';
  // Set default start time to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('modalStartTime').value = now.toISOString().slice(0, 16);
}

function closeTaskModal() {
  document.body.style.overflow = ''; // Restore scroll
  document.getElementById('taskModal').style.display = 'none';
  // Clear inputs
  document.getElementById('modalTaskName').value = '';
  quill.setContents([]); // Xóa nội dung editor
  document.getElementById('modalTaskImage').value = '';
  document.getElementById('modalEndTime').value = '';
}

function saveTask() {
  if (!isAdmin()) {
    alert('Chỉ Admin mới có thể thêm task');
    return;
  }

  const name = document.getElementById('modalTaskName').value.trim();
  const content = quill.root.innerHTML; // Lấy nội dung HTML từ Quill
  const image = document.getElementById('modalTaskImage').value.trim();
  const start = document.getElementById('modalStartTime').value;
  const end = document.getElementById('modalEndTime').value;

  if (!name || !start || !end) {
    alert('Vui lòng nhập tên, thời gian bắt đầu và kết thúc!');
    return;
  }

  if (new Date(start) >= new Date(end)) {
    alert('Thời gian kết thúc phải sau thời gian bắt đầu!');
    return;
  }

  const newTask = {
    id: Date.now(),
    name: name,
    content: content, // Lưu HTML
    imageUrl: image,
    startTime: start,
    endTime: end,
    deadline: end.split('T')[0], // Giữ field cũ để tương thích ngược nếu cần
    createdAt: new Date().toISOString(),
    completions: {}
  };

  // Lưu lên Firebase
  saveSharedTask(newTask);
  closeTaskModal();
}

// Image Modal
function viewImage(url) {
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('previewImage');
  img.src = url;
  document.body.style.overflow = ''; // Fix scroll lock issue on mobile
  modal.style.display = 'flex';
}

function closeImageModal() {
  document.getElementById('imageModal').style.display = 'none';
  document.body.style.overflow = ''; // Restore scroll
}

// Content Modal (Xem chi tiết bài viết)
function viewTaskContent(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('viewTaskTitle').textContent = task.name;
  document.getElementById('viewTaskBody').innerHTML = task.content || '<p>Không có nội dung chi tiết.</p>';
  document.body.style.overflow = ''; // Fix scroll lock issue on mobile
  document.getElementById('contentModal').style.display = 'flex';
}

function closeContentModal() {
  document.getElementById('contentModal').style.display = 'none';
  document.body.style.overflow = ''; // Restore scroll
}

// Progress Modal (Xem danh sách người làm)
function viewTaskProgress(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('progressTaskTitle').textContent = `Tiến độ: ${task.name}`;
  const modal = document.getElementById('progressModal');
  const colDone = document.getElementById('colDone');
  const colPending = document.getElementById('colPending');

  const completions = task.completions || {};
  
  // Phân loại học sinh
  const doneList = [];
  const pendingList = [];

  STUDENTS.forEach(student => {
    if (completions[student.id]) {
      doneList.push(student);
    } else {
      pendingList.push(student);
    }
  });

  // Render cột Đã xong
  colDone.innerHTML = `
    <h3 style="color: #27ae60;">✅ Đã xong (${doneList.length})</h3>
    <ul class="progress-list">
      ${doneList.map(s => `<li class="progress-item done">👤 ${s.name}</li>`).join('')}
    </ul>
  `;

  // Render cột Chưa xong
  colPending.innerHTML = `
    <h3 style="color: #e74c3c;">⏳ Chưa xong (${pendingList.length})</h3>
    <ul class="progress-list">
      ${pendingList.map(s => `<li class="progress-item pending">⭕ ${s.name}</li>`).join('')}
    </ul>
  `;

  document.body.style.overflow = ''; // Fix scroll lock issue on mobile
  modal.style.display = 'flex';
}

function closeProgressModal() {
  document.getElementById('progressModal').style.display = 'none';
  document.body.style.overflow = ''; // Restore scroll
}

async function deleteTask(taskId) {
  if (!isAdmin()) {
    alert('Chỉ Admin mới có thể xóa');
    return;
  }

  if (confirm('Xóa nhiệm vụ này?')) {
    deleteSharedTask(taskId);
  }
}

async function toggleCompletion(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (!task.completions) {
    task.completions = {};
  }

  // Toggle trạng thái của user hiện tại
  task.completions[currentUser.id] = !task.completions[currentUser.id];
  
  // Chỉ cập nhật phần completions lên Firebase để tiết kiệm băng thông
  updateSharedTaskCompletion(taskId, task.completions);
}

function filterTasks(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  renderTasks();
}

function filterTasks(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  renderTasks();
}

function getFilteredTasks() {
  switch (currentFilter) {
    case 'done':
      return tasks.filter(t => t.completions && t.completions[currentUser.id]);
    case 'pending':
      return tasks.filter(t => !t.completions || !t.completions[currentUser.id]);
    default:
      return tasks;
  }
}

function renderTasks() {
  const taskList = document.getElementById('taskList');
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>Không có nhiệm vụ nào</p>
      </div>
    `;
    return;
  }

  taskList.innerHTML = filtered
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(task => {
      const isCompleted = task.completions && task.completions[currentUser.id];
      const completionCount = Object.values(task.completions || {}).filter(v => v).length;
      
      // Xử lý thời gian
      const now = new Date();
      const start = new Date(task.startTime || task.createdAt);
      const end = new Date(task.endTime || task.deadline);
      
      let timeStatus = '';
      let isUrgent = false;

      if (now > end && !isCompleted) {
        isUrgent = true;
        timeStatus = '⚠️ Đã quá hạn';
      } else if (now < start) {
        timeStatus = '⏳ Sắp diễn ra';
      } else {
        timeStatus = '🔥 Đang diễn ra';
      }

      // Format time range string
      const timeRange = `${formatDateTime(start)} - ${formatDateTime(end)}`;

      return `
        <li class="task-item ${isCompleted ? 'completed' : ''}">
          <button class="task-checkbox-btn" onclick="toggleCompletion(${task.id})" title="${isCompleted ? 'Bỏ check-in' : 'Check-in'}">
            ${isCompleted ? '✅' : '☐'}
          </button>
          <div class="task-content">
            <div class="task-name ${isCompleted ? 'completed' : ''}">
              ${escapeHtml(task.name)}
            </div>
            
            <div class="task-meta">
              <div class="task-time ${isUrgent ? 'urgent' : ''}">
                📅 ${timeRange} <span style="margin-left:5px; font-weight:bold">(${timeStatus})</span>
              </div>
              
              <div class="task-completion">
                👥 ${completionCount} đã xong
              </div>

              ${isAdmin() ? `
                <button class="view-progress-btn" onclick="viewTaskProgress(${task.id})">📋 Xem DS</button>
              ` : ''}

              <button class="view-content-btn" onclick="viewTaskContent(${task.id})">
                📄 Xem chi tiết
              </button>

              ${task.imageUrl ? `
                <button class="view-img-btn" onclick="viewImage('${escapeHtml(task.imageUrl)}')">
                  📷 Xem hướng dẫn
                </button>
              ` : ''}
            </div>
          </div>
          ${isAdmin() ? `<button class="task-btn" onclick="deleteTask(${task.id})">Xóa</button>` : ''}
        </li>
      `;
    })
    .join('');
}

function formatDateTime(date) {
  return date.toLocaleDateString('vi-VN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Xử lý phím Enter
document.addEventListener('DOMContentLoaded', () => {
  // Handled in window load
});
