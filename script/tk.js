// Lấy dữ liệu từ localStorage
function getTasks() {
  const stored = localStorage.getItem('c7aio_tasks_detail');
  return stored ? JSON.parse(stored) : [];
}

let tasks = getTasks();

function calculateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.done).length;
  const pending = tasks.filter(t => !t.done).length;

  const today = new Date();
  const urgent = tasks.filter(t => {
    const d = new Date(t.deadline);
    return (d - today) / (1000*60*60*24) <= 2 && !t.done;
  }).length;

  return {
    total,
    completed,
    pending,
    urgent,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0
  };
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

function updateProgressRing(percent) {
  const circle = document.getElementById('progressRing');
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
}

function updateStats() {
  tasks = getTasks();
  const stats = calculateStats();

  // Cập nhật thống kê
  document.getElementById('totalTasks').textContent = stats.total;
  document.getElementById('completedTasks').textContent = stats.completed;
  document.getElementById('completedPercent').textContent = `${stats.percent}%`;
  document.getElementById('pendingTasks').textContent = stats.pending;
  document.getElementById('urgentTasks').textContent = stats.urgent;

  // Cập nhật tiến trình
  document.getElementById('progressValue').textContent = `${stats.percent}%`;
  updateProgressRing(stats.percent);

  // Cập nhật thanh trạng thái
  if (stats.total > 0) {
    const donePercent = (stats.completed / stats.total) * 100;
    const pendingPercent = (stats.pending / stats.total) * 100;

    document.querySelector('.status-fill.done').style.width = `${donePercent}%`;
    document.querySelector('.status-fill.pending').style.width = `${pendingPercent}%`;

    document.getElementById('statusDone').textContent = `${stats.completed} / ${stats.total}`;
    document.getElementById('statusPending').textContent = `${stats.pending} / ${stats.total}`;
  }

  // Cập nhật hoạt động gần đây
  renderActivity();
}

function renderActivity() {
  const activityList = document.getElementById('activityList');

  if (tasks.length === 0) {
    activityList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>Chưa có hoạt động nào</p>
      </div>
    `;
    return;
  }

  const recentTasks = tasks
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  activityList.innerHTML = recentTasks
    .map(task => {
      const icon = task.done ? '✅' : '📌';
      const action = task.done ? 'Hoàn thành' : 'Tạo mới';

      return `
        <div class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-text">
              <strong>${action}:</strong> ${escapeHtml(task.name)}
            </div>
            <div class="activity-time">
              ${formatTime(task.createdAt)} · Hạn: ${task.deadline}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cập nhật mỗi giây (để thời gian tương đối luôn cập nhật)
document.addEventListener('DOMContentLoaded', () => {
  // Thêm SVG gradient
  const svg = document.querySelector('.progress-ring');
  const svgNS = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(svgNS, 'defs');
  const gradient = document.createElementNS(svgNS, 'linearGradient');
  gradient.id = 'progressGradient';
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');

  const stop1 = document.createElementNS(svgNS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#667eea');

  const stop2 = document.createElementNS(svgNS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#764ba2');

  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.insertBefore(defs, svg.firstChild);

  updateStats();

  // Cập nhật mỗi 30 giây
  setInterval(updateStats, 30000);
});
