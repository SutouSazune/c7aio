// Lấy tasks từ localStorage
function getTasks() {
  const stored = localStorage.getItem('c7aio_tasks_detail');
  return stored ? JSON.parse(stored) : [];
}

// Lưu tasks vào localStorage
function saveTasks(tasks) {
  localStorage.setItem('c7aio_tasks_detail', JSON.stringify(tasks));
}

let tasks = getTasks();
let currentFilter = 'all';

function addTask() {
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
    done: false,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  saveTasks(tasks);
  input.value = '';
  deadlineInput.value = '';
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks(tasks);
    renderTasks();
  }
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
      return tasks.filter(t => t.done);
    case 'pending':
      return tasks.filter(t => !t.done);
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
      const today = new Date().toISOString().split('T')[0];
      const isUrgent = task.deadline <= today && !task.done;

      return `
        <li class="task-item">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.done ? 'checked' : ''}
            onchange="toggleTask(${task.id})"
          >
          <div class="task-content">
            <div class="task-name ${task.done ? 'completed' : ''}">
              ${escapeHtml(task.name)}
            </div>
            <div class="task-deadline ${isUrgent ? 'urgent' : ''}">
              📅 ${formatDate(task.deadline)} ${isUrgent ? '⚠️ Sắp hết hạn' : ''}
            </div>
          </div>
          <button class="task-btn" onclick="deleteTask(${task.id})">
            Xóa
          </button>
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
  document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  renderTasks();
});
