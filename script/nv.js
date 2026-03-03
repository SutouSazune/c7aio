// Load từ cache ngay lập tức
let tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
let currentFilter = 'all';
let currentUser = null;
let quill = null; // Biến global cho editor

// Khởi tạo
window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  
  // Chỉ admin mới thêm được task
  if (checkPermission('manage_tasks')) {
    document.getElementById('adminControls').style.display = 'block';
  }

  // Inject CSS cho bộ chọn học sinh
  const style = document.createElement('style');
  style.innerHTML = `
    .task-modal-layout { display: flex !important; flex-direction: row !important; gap: 25px; min-height: 550px; width: 100%; align-items: stretch; }
    .task-form-inputs { flex: 1.6; display: flex; flex-direction: column; gap: 15px; }
    .task-student-selection { 
      flex: 1; 
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 20px; 
      display: flex; 
      flex-direction: column;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
    #taskModal .modal-content { max-width: 1000px !important; width: 95%; padding: 30px; }
    .search-student-box {
      width: 100%;
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 10px;
      margin-bottom: 15px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.3s;
    }
    .search-student-box:focus { border-color: var(--primary-color); }
    .student-selector-list { 
      flex: 1; 
      overflow-y: auto; 
      max-height: 400px;
      padding-right: 5px;
    }
    .student-selector-list::-webkit-scrollbar { width: 5px; }
    .student-selector-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    
    .student-select-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 4px;
    }
    .student-select-item:hover { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .student-assign-checkbox { width: 18px; height: 18px; cursor: pointer; }
    
    .select-all-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .btn-select-all { background: #fff; border: 1px solid #ddd; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }

    @media (max-width: 768px) {
      .task-modal-layout { flex-direction: column; }
      .task-student-selection { max-height: 300px; }
    }
  `;
  document.head.appendChild(style);

  // --- FALLBACK ---
  if (typeof window.showToast !== 'function') window.showToast = (msg) => alert(msg);
  if (!document.getElementById('fallback-animation-style')) {
    const style = document.createElement('style');
    style.id = 'fallback-animation-style';
    style.innerHTML = `
      :root { --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      
      /* Fallback visibility */
      .task-item { opacity: 1 !important; transform: none !important; animation: none !important; }
      @supports (animation: fadeInUp) {
        .task-item { opacity: 0 !important; animation: fadeInUp 0.5s var(--ease-spring) forwards !important; }
      }
      
      /* Task Specific Styles */
      .task-btn, .view-content-btn, .view-img-btn {
        border-radius: 6px;
        transition: all 0.2s ease;
      }
    `;
    document.head.appendChild(style);
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

  // Custom Handler cho nút Image để hỗ trợ upload file local (Ảnh hoặc File khác)
  quill.getModule('toolbar').addHandler('image', () => {
    selectLocalFile();
  });

  // Render Skeleton hoặc Cache
  if (!tasks || tasks.length === 0) {
    renderSkeletonTasks();
  } else {
    renderTasks();
  }

  // Lắng nghe dữ liệu từ Firebase thay vì loadTasks từ localStorage
  onSharedTasksChanged((updatedTasks) => {
    tasks = updatedTasks;
    renderTasks();
  });
});

function renderSkeletonTasks() {
  const taskList = document.getElementById('taskList');
  let html = '';
  for (let i = 0; i < 3; i++) {
    html += `
      <li class="task-item" style="padding: 20px; display: flex; gap: 15px; align-items: center;">
        <div class="skeleton" style="width: 24px; height: 24px; border-radius: 4px;"></div>
        <div style="flex: 1;">
          <div class="skeleton" style="width: 60%; height: 24px; margin-bottom: 10px;"></div>
          <div class="skeleton" style="width: 40%; height: 16px;"></div>
        </div>
      </li>
    `;
  }
  taskList.innerHTML = html;
}

// Hàm chọn file từ máy tính và chèn vào editor
function selectLocalFile() {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  // Không giới hạn accept để cho phép chọn cả file tài liệu
  input.click();

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const range = quill.getSelection(true);
      if (file.type.startsWith('image/')) {
        quill.insertEmbed(range.index, 'image', e.target.result);
      } else {
        const text = file.name;
        quill.insertText(range.index, text, 'link', e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };
}

// --- MODAL FUNCTIONS ---
function openTaskModal() {
  const modal = document.getElementById('taskModal');
  const modalBody = modal.querySelector('.modal-body');

  // Tái cấu trúc Modal Body thành 2 cột
  if (!modalBody.querySelector('.task-modal-layout')) {
    const originalContent = Array.from(modalBody.children);
    const layout = document.createElement('div');
    layout.className = 'task-modal-layout';
    
    const left = document.createElement('div');
    left.className = 'task-form-inputs';
    originalContent.forEach(child => left.appendChild(child));
    
    const right = document.createElement('div');
    right.className = 'task-student-selection';
    right.id = 'studentSelectorContainer';
    
    layout.appendChild(left);
    layout.appendChild(right);
    modalBody.appendChild(layout);
  }

  renderStudentSelector();

  if (window.innerWidth < 768) {
    modal.style.alignItems = 'flex-start';
    modal.style.overflowY = 'auto';
    modal.style.paddingTop = '10px';
  }
  document.body.style.overflow = 'hidden';
  document.getElementById('taskModal').style.display = 'flex';
  // Set default start time to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('modalStartTime').value = now.toISOString().slice(0, 16);
}

function renderStudentSelector() {
  const container = document.getElementById('studentSelectorContainer');
  if (!container) return;
  
  allSelected = true; // Reset state khi mở modal

  container.innerHTML = `
    <div class="select-all-bar">
      <h3 style="font-size: 1rem; margin: 0;">👥 Giao cho:</h3>
      <button class="btn-select-all" id="btnToggleAll" onclick="toggleSelectAllStudents()">Bỏ chọn tất cả</button>
    </div>
    <input type="text" class="search-student-box" placeholder="Tìm tên học sinh..." oninput="filterStudentSelection(this.value)">
    <div class="student-selector-list" id="studentCheckList">
      ${STUDENTS.map(s => `
        <label class="student-select-item" data-name="${s.name.toLowerCase()}">
          <input type="checkbox" class="student-assign-checkbox" value="${s.id}" checked>
          <span style="font-size: 0.9rem;">${s.name}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function filterStudentSelection(query) {
  const term = query.toLowerCase();
  const items = document.querySelectorAll('.student-select-item');
  items.forEach(item => {
    const name = item.getAttribute('data-name');
    item.style.display = name.includes(term) ? 'flex' : 'none';
  });
}

let allSelected = true;
function toggleSelectAllStudents() {
  const checkboxes = document.querySelectorAll('.student-assign-checkbox');
  const btn = document.getElementById('btnToggleAll');
  
  allSelected = !allSelected;
  checkboxes.forEach(cb => cb.checked = allSelected);
  btn.textContent = allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả';
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
  if (!checkPermission('manage_tasks')) {
    showToast('Bạn không có quyền thêm nhiệm vụ', 'error');
    return;
  }

  const name = document.getElementById('modalTaskName').value.trim();
  const content = quill.root.innerHTML; // Lấy nội dung HTML từ Quill
  const image = document.getElementById('modalTaskImage').value.trim();
  const start = document.getElementById('modalStartTime').value;
  const end = document.getElementById('modalEndTime').value;
  
  // Lấy danh sách ID học sinh được chọn
  const assignedIds = Array.from(document.querySelectorAll('.student-assign-checkbox:checked'))
                           .map(cb => parseInt(cb.value));

  if (!name || !start || !end || assignedIds.length === 0) {
    showToast('Vui lòng nhập đầy đủ thông tin và chọn ít nhất 1 học sinh!', 'error');
    return;
  }

  if (new Date(start) >= new Date(end)) {
    showToast('Thời gian kết thúc phải sau thời gian bắt đầu!', 'error');
    return;
  }

  const newTask = {
    id: Date.now(),
    name: name,
    content: content, // Lưu HTML
    imageUrl: image,
    startTime: start,
    endTime: end,
    assignedStudents: assignedIds,
    deadline: end.split('T')[0], // Giữ field cũ để tương thích ngược nếu cần
    createdAt: new Date().toISOString(),
    completions: {}
  };

  // Lưu lên Firebase
  saveSharedTask(newTask);
  logAction('Thêm nhiệm vụ', `Tên: ${name}`);
  showToast('Đã thêm nhiệm vụ mới!', 'success');
  closeTaskModal();
}

// Image Modal
function viewImage(url) {
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('previewImage');
  img.src = url;
  if (window.innerWidth < 768) {
    modal.style.alignItems = 'flex-start';
    modal.style.overflowY = 'auto';
    modal.style.paddingTop = '10px';
  }
  document.body.style.overflow = 'hidden';
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
  const modal = document.getElementById('contentModal');
  if (window.innerWidth < 768) {
    modal.style.alignItems = 'flex-start';
    modal.style.overflowY = 'auto';
    modal.style.paddingTop = '10px';
  }
  document.body.style.overflow = 'hidden';
  modal.style.display = 'flex';
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
  
  // Chỉ hiển thị những học sinh được giao nhiệm vụ này
  const targetStudents = task.assignedStudents && task.assignedStudents.length > 0 
    ? STUDENTS.filter(s => task.assignedStudents.includes(s.id))
    : STUDENTS;

  // Phân loại học sinh
  const doneList = [];
  const pendingList = [];

  targetStudents.forEach(student => {
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

  if (window.innerWidth < 768) {
    modal.style.alignItems = 'flex-start';
    modal.style.overflowY = 'auto';
    modal.style.paddingTop = '10px';
  }
  document.body.style.overflow = 'hidden';
  modal.style.display = 'flex';
}

function closeProgressModal() {
  document.getElementById('progressModal').style.display = 'none';
  document.body.style.overflow = ''; // Restore scroll
}

async function deleteTask(taskId) {
  if (!checkPermission('manage_tasks')) {
    showToast('Bạn không có quyền xóa nhiệm vụ', 'error');
    return;
  }

  if (confirm('Xóa nhiệm vụ này?')) {
    deleteSharedTask(taskId);
    logAction('Xóa nhiệm vụ', `ID: ${taskId}`);
    showToast('Đã xóa nhiệm vụ', 'success');
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
  // Lọc theo phân quyền: Học sinh chỉ thấy task được giao cho mình
  const visibleTasks = tasks.filter(t => {
    if (isAdmin()) return true;
    if (!t.assignedStudents || t.assignedStudents.length === 0) return true; // Task cũ hoặc giao cho tất cả
    return t.assignedStudents.includes(currentUser.id);
  });

  switch (currentFilter) {
    case 'done':
      return visibleTasks.filter(t => t.completions && t.completions[currentUser.id]);
    case 'pending':
      return visibleTasks.filter(t => !t.completions || !t.completions[currentUser.id]);
    default:
      return visibleTasks;
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
    .map((task, index) => {
      const isCompleted = task.completions && task.completions[currentUser.id];
      const completionCount = Object.values(task.completions || {}).filter(v => v).length;
      // Tính tổng số người được giao
      const totalAssigned = task.assignedStudents ? task.assignedStudents.length : STUDENTS.length;
      
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
        <li class="task-item ${isCompleted ? 'completed' : ''}" style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.05}s; opacity: 0; transform: translateY(20px);">
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
                👥 ${completionCount} / ${totalAssigned} đã xong
              </div>

              ${checkPermission('manage_tasks') ? `
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
          ${checkPermission('manage_tasks') ? `<button class="task-btn" onclick="deleteTask(${task.id})">Xóa</button>` : ''}
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
