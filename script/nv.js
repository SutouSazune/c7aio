let tasks = [];
let currentFilter = 'all';
let currentUser = null;

// Khởi tạo
window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  
  document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // Chỉ admin mới thêm được task
  if (!isAdmin()) {
    document.querySelector('.task-input-area').style.display = 'none';
  }

  loadTasks();
});

async function loadTasks() {
  try {
    const data = localStorage.getItem('c7aio_tasks_shared');
    tasks = data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Lỗi tải tasks:', error);
    tasks = [];
  }
  renderTasks();
}

async function addTask() {
  if (!isAdmin()) {
    alert('Chỉ Admin mới có thể thêm task');
    return;
  }

  const input = document.getElementById('taskInput');
  const deadlineInput = document.getElementById('deadlineInput');
  const taskName = input.value.trim();
  const deadline = deadlineInput.value;

  if (!taskName) {
    alert('Vui lòng nhập tên nhiệm vụ');
    return;
  }

  const newTask = {
    id: Date.now(),
    name: taskName,
    deadline: deadline || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    completions: {} // { userId: true/false }
  };

  tasks.push(newTask);
  saveTasks();
  input.value = '';
  deadlineInput.value = '';
  renderTasks();
}

async function deleteTask(taskId) {
  if (!isAdmin()) {
    alert('Chỉ Admin mới có thể xóa');
    return;
  }

  if (confirm('Xóa nhiệm vụ này?')) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    renderTasks();
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
  
  saveTasks();
  renderTasks();
}

function saveTasks() {
  localStorage.setItem('c7aio_tasks_shared', JSON.stringify(tasks));
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
      const today = new Date().toISOString().split('T')[0];
      const isUrgent = task.deadline <= today && !isCompleted;

      return `
        <li class="task-item ${isCompleted ? 'completed' : ''}">
          <button class="task-checkbox-btn" onclick="toggleCompletion(${task.id})" title="${isCompleted ? 'Bỏ check-in' : 'Check-in'}">
            ${isCompleted ? '✅' : '☐'}
          </button>
          <div class="task-content">
            <div class="task-name ${isCompleted ? 'completed' : ''}">
              ${escapeHtml(task.name)}
            </div>
            <div class="task-deadline ${isUrgent ? 'urgent' : ''}">
              📅 ${formatDate(task.deadline)} ${isUrgent ? '⚠️ Sắp hết hạn' : ''}
            </div>
            <div class="task-completion">
              ${completionCount} / ${Object.keys(task.completions || {}).length || '?'} đã hoàn thành
            </div>
          </div>
          ${isAdmin() ? `<button class="task-btn" onclick="deleteTask(${task.id})">Xóa</button>` : ''}
        </li>
      `;
    })
    .join('');
}

function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date.toDateString() === today.toDateString()) {
    return 'Hôm nay';
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Ngày mai';
  }

  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric'
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
