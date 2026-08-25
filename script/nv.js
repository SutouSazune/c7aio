/**
 * C7AIO Tasks (Nhiệm Vụ) Controller
 * Quản lý danh sách nhiệm vụ, check-in tiến độ, phân công nhóm và rich text editor
 */

let tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
let currentFilter = 'all';
let searchQuery = '';
let currentUser = null;
let quillEditor = null;
let editingTaskId = null;

window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = buildUrl('login.html');
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = currentUser.name;

  if (checkPermission('manage_tasks')) {
    const btnArea = document.getElementById('adminTaskBtnArea');
    if (btnArea) btnArea.style.display = 'block';
  }

  initQuill();
  renderTasks();
  renderStudentSelector();

  // Lắng nghe Realtime
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged((data) => {
      tasks = data || [];
      renderTasks();
    });
  }

  if (typeof onSharedStudentsChanged === 'function') {
    onSharedStudentsChanged((data) => {
      if (data && data.length > 0) {
        STUDENTS = data;
        renderStudentSelector();
      }
    });
  }
});

function initQuill() {
  const container = document.getElementById('task-editor-container');
  if (container && typeof Quill !== 'undefined' && !quillEditor) {
    quillEditor = new Quill('#task-editor-container', {
      theme: 'snow',
      placeholder: 'Nhập nội dung chi tiết bài tập, tài liệu hoặc hướng dẫn làm...',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'clean']
        ]
      }
    });
  }
}

// ============= FILTER & SEARCH =============
function setTaskFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderTasks();
}

function handleTaskSearch(val) {
  searchQuery = (val || '').toLowerCase().trim();
  renderTasks();
}

function getFilteredTasks() {
  const isAdm = isAdmin();
  
  let list = tasks.filter(t => {
    if (isAdm) return true;
    if (!t.assignedStudents || t.assignedStudents.length === 0) return true;
    return t.assignedStudents.includes(currentUser.id);
  });

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

  if (currentFilter === 'pending') {
    list = list.filter(t => !(t.completions && t.completions[currentUser.id]));
  } else if (currentFilter === 'completed') {
    list = list.filter(t => t.completions && t.completions[currentUser.id]);
  } else if (currentFilter === 'urgent') {
    list = list.filter(t => {
      if (t.priority === 'Khẩn cấp') return true;
      if (t.deadline && new Date(t.deadline) <= threeDaysLater && !(t.completions && t.completions[currentUser.id])) return true;
      return false;
    });
  }

  if (searchQuery) {
    list = list.filter(t => 
      t.name.toLowerCase().includes(searchQuery) ||
      (t.category && t.category.toLowerCase().includes(searchQuery)) ||
      (t.description && t.description.toLowerCase().includes(searchQuery))
    );
  }

  return list;
}

// ============= RENDER TASKS =============
function renderTasks() {
  const container = document.getElementById('taskListContainer');
  if (!container) return;

  const list = getFilteredTasks();

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-widget" style="background: var(--card-bg); border-radius: var(--radius-md); padding: 3rem 1rem;">
        <span style="font-size: 3rem;">🎉</span>
        <h3 style="font-size: 1.1rem; margin-bottom: 4px;">Không có nhiệm vụ nào</h3>
        <p style="font-size: 0.85rem; color: var(--text-sub);">Hãy thư giãn hoặc kiểm tra lại bộ lọc tìm kiếm!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(t => {
    const isCompleted = t.completions && t.completions[currentUser.id];
    const deadlineFormatted = t.deadline ? new Date(t.deadline).toLocaleString('vi-VN') : 'Không giới hạn';
    const isOverdue = t.deadline && new Date(t.deadline) < new Date() && !isCompleted;
    
    const assignedCount = (t.assignedStudents && t.assignedStudents.length > 0) ? t.assignedStudents.length : STUDENTS.length;
    const completedCount = t.completions ? Object.values(t.completions).filter(Boolean).length : 0;

    const priorityBadge = t.priority === 'Khẩn cấp' 
      ? '<span class="task-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">🔥 Khẩn cấp</span>'
      : '<span class="task-badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">Bình thường</span>';

    return `
      <div class="task-item-card ${isCompleted ? 'completed' : ''}">
        <button class="btn-task-check ${isCompleted ? 'checked' : ''}" onclick="toggleTaskCheck('${t.id}')" title="${isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}">
          ${isCompleted ? '✓' : ''}
        </button>

        <div class="task-details-col">
          <div class="task-title-row">
            <span class="task-name-text">${escapeHtml(t.name)}</span>
            ${priorityBadge}
            <span class="task-badge" style="background: var(--bg-surface); border: 1px solid var(--input-border);">${escapeHtml(t.category || 'Bài tập')}</span>
          </div>

          <div class="task-meta-row">
            <span style="${isOverdue ? 'color: var(--danger); font-weight: 700;' : ''}">
              ⏰ Hạn nộp: ${deadlineFormatted} ${isOverdue ? '(Quá hạn)' : ''}
            </span>
            <span>👥 Hoàn thành: <strong>${completedCount}/${assignedCount}</strong></span>
          </div>

          ${t.description && t.description !== '<p><br></p>' ? `
            <div style="font-size: 0.85rem; color: var(--text-sub); margin-top: 4px;" class="ql-snow">
              <div class="ql-editor" style="padding: 0; max-height: 80px; overflow-y: auto;">
                ${t.description}
              </div>
            </div>
          ` : ''}

          <div class="task-actions-row">
            <button class="btn-action-pill" onclick="toggleTaskCheck('${t.id}')">
              ${isCompleted ? '↩️ Làm lại' : '✅ Đã nộp'}
            </button>
            ${checkPermission('manage_tasks') ? `
              <button class="btn-action-pill" onclick="editTask('${t.id}')">✏️ Sửa</button>
              <button class="btn-action-pill danger" onclick="deleteTaskAction('${t.id}')">🗑️ Xóa</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============= ACTIONS =============
async function toggleTaskCheck(taskId) {
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (!task) return;

  if (!task.completions) task.completions = {};
  const currentStatus = !!task.completions[currentUser.id];
  task.completions[currentUser.id] = !currentStatus;

  renderTasks();
  if (typeof updateSharedTaskCompletion === 'function') {
    await updateSharedTaskCompletion(task.id, task.completions);
  }
  showToast(task.completions[currentUser.id] ? '🎉 Đã hoàn thành nhiệm vụ!' : 'Đã chuyển nhiệm vụ về đang làm', 'info');
}

function openTaskModal(isEdit = false) {
  const modal = document.getElementById('taskModalOverlay');
  const title = document.getElementById('modalTaskTitle');
  if (!modal) return;

  if (!isEdit) {
    editingTaskId = null;
    title.textContent = '➕ Giao Nhiệm Vụ Mới';
    document.getElementById('inputTaskName').value = '';
    document.getElementById('inputTaskCategory').value = 'Bài tập';
    document.getElementById('inputTaskPriority').value = 'Bình thường';
    document.getElementById('inputTaskDeadline').value = '';
    if (quillEditor) quillEditor.setContents([]);
    selectAllStudents();
  }

  modal.classList.add('active');
}

function closeTaskModal() {
  const modal = document.getElementById('taskModalOverlay');
  if (modal) modal.classList.remove('active');
  editingTaskId = null;
}

function editTask(taskId) {
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (!task) return;

  editingTaskId = taskId;
  document.getElementById('modalTaskTitle').textContent = '✏️ Chỉnh Sửa Nhiệm Vụ';
  document.getElementById('inputTaskName').value = task.name || '';
  document.getElementById('inputTaskCategory').value = task.category || 'Bài tập';
  document.getElementById('inputTaskPriority').value = task.priority || 'Bình thường';
  document.getElementById('inputTaskDeadline').value = task.deadline ? toLocalISO(new Date(task.deadline)) : '';

  if (quillEditor) {
    quillEditor.root.innerHTML = task.description || '';
  }

  const assigned = task.assignedStudents || [];
  document.querySelectorAll('.student-assign-check').forEach(cb => {
    cb.checked = assigned.length === 0 || assigned.includes(parseInt(cb.value));
  });
  updateAssignCount();

  openTaskModal(true);
}

function toLocalISO(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
}

// ============= STUDENT SELECTOR IN MODAL =============
function renderStudentSelector() {
  const container = document.getElementById('studentCheckboxList');
  if (!container) return;

  container.innerHTML = STUDENTS.map(s => `
    <label class="student-check-row">
      <input type="checkbox" class="student-assign-check" value="${s.id}" checked onchange="updateAssignCount()">
      <span>${escapeHtml(s.name)} (Tổ ${s.group || 1})</span>
    </label>
  `).join('');

  updateAssignCount();
}

function updateAssignCount() {
  const total = document.querySelectorAll('.student-assign-check').length;
  const checked = document.querySelectorAll('.student-assign-check:checked').length;
  const el = document.getElementById('assignCountLabel');
  if (el) el.textContent = `(${checked}/${total})`;
}

function selectAllStudents() {
  document.querySelectorAll('.student-assign-check').forEach(cb => cb.checked = true);
  updateAssignCount();
}

function deselectAllStudents() {
  document.querySelectorAll('.student-assign-check').forEach(cb => cb.checked = false);
  updateAssignCount();
}

function selectGroup(groupId) {
  document.querySelectorAll('.student-assign-check').forEach(cb => {
    const std = STUDENTS.find(s => String(s.id) === String(cb.value));
    cb.checked = std && std.group === groupId;
  });
  updateAssignCount();
}

function selectCadres() {
  document.querySelectorAll('.student-assign-check').forEach(cb => {
    const std = STUDENTS.find(s => String(s.id) === String(cb.value));
    const roles = Array.isArray(std?.role) ? std.role : [std?.role || 'student'];
    cb.checked = roles.some(r => r !== 'student');
  });
  updateAssignCount();
}

// ============= SAVE / DELETE TASK =============
async function saveTaskForm() {
  if (!checkPermission('manage_tasks')) {
    showToast('Bạn không có quyền giao nhiệm vụ!', 'error');
    return;
  }

  const name = document.getElementById('inputTaskName').value.trim();
  const category = document.getElementById('inputTaskCategory').value;
  const priority = document.getElementById('inputTaskPriority').value;
  const deadlineVal = document.getElementById('inputTaskDeadline').value;
  const description = quillEditor ? quillEditor.root.innerHTML : '';

  if (!name) {
    showToast('Vui lòng nhập tên nhiệm vụ!', 'warning');
    return;
  }

  const checkedStudentIds = Array.from(document.querySelectorAll('.student-assign-check:checked')).map(cb => parseInt(cb.value));
  if (checkedStudentIds.length === 0) {
    showToast('Vui lòng chọn ít nhất một học sinh nhận nhiệm vụ!', 'warning');
    return;
  }

  const isEdit = !!editingTaskId;
  const taskObj = {
    id: isEdit ? editingTaskId : Date.now(),
    name: name,
    category: category,
    priority: priority,
    deadline: deadlineVal ? new Date(deadlineVal).toISOString() : null,
    description: (description === '<p><br></p>') ? '' : description,
    assignedStudents: checkedStudentIds.length === STUDENTS.length ? [] : checkedStudentIds,
    completions: isEdit ? (tasks.find(t => String(t.id) === String(editingTaskId))?.completions || {}) : {},
    createdAt: isEdit ? (tasks.find(t => String(t.id) === String(editingTaskId))?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (typeof saveSharedTask === 'function') {
    await saveSharedTask(taskObj);
  }

  if (typeof logAction === 'function') {
    logAction(isEdit ? 'Sửa nhiệm vụ' : 'Giao nhiệm vụ mới', `Tên: ${name} (Phân loại: ${category})`);
  }

  showToast(isEdit ? 'Đã cập nhật nhiệm vụ!' : 'Đã giao nhiệm vụ thành công!', 'success');
  closeTaskModal();
  renderTasks();
}

async function deleteTaskAction(taskId) {
  if (!checkPermission('manage_tasks')) return;

  showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa nhiệm vụ này không?', async () => {
    if (typeof deleteSharedTask === 'function') {
      await deleteSharedTask(taskId);
      if (typeof logAction === 'function') {
        logAction('Xóa nhiệm vụ', `ID: ${taskId}`);
      }
      showToast('Đã xóa nhiệm vụ!', 'success');
      renderTasks();
    }
  });
}
