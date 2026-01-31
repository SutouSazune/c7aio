let currentUser = null;
let tasks = [];
let events = [];
let notifications = [];

window.addEventListener('load', () => {
  currentUser = getCurrentUser();

  // Nếu không phải Admin, chuyển hướng
  if (!isAdmin()) {
    document.body.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <p style="font-size: 48px;">🔒</p>
        <h2>Chỉ Admin mới xem được thống kê</h2>
        <p><a href="index.html">← Quay lại</a></p>
      </div>
    `;
    return;
  }

  setupRealtimeListeners();
});

function setupRealtimeListeners() {
  // 1. Lắng nghe danh sách học sinh (để render cột bảng đúng)
  onSharedStudentsChanged((data) => {
    if (data) STUDENTS = data;
    renderDashboard();
  });

  // 2. Lắng nghe Nhiệm vụ
  onSharedTasksChanged((data) => {
    tasks = data;
    renderDashboard();
  });

  // 3. Lắng nghe Thông báo
  onSharedNotificationsChanged((data) => {
    notifications = data;
    renderDashboard();
  });
  
  // Events tạm thời chưa có sync shared, giữ nguyên hoặc bỏ qua
}

function renderDashboard() {
  // Update overview cards
  updateStatsOverview();
  
  const container = document.getElementById('statsContainer');
  
  let html = '<div class="dashboard-grid">';

  // Task Statistics
  html += renderTaskStats();
  // Event Statistics
  html += renderEventStats();
  // Notification Statistics
  html += renderNotificationStats();

  html += '</div>';
  container.innerHTML = html;
}

function updateStatsOverview() {
  // Calculate task stats
  const totalTasks = tasks.length;
  let completedTasks = 0;
  let pendingTasks = 0;

  tasks.forEach(task => {
    const completions = task.completions || {};
    const completedCount = Object.values(completions).filter(v => v).length;
    if (completedCount === STUDENTS.length) {
      completedTasks++;
    } else if (completedCount > 0) {
      pendingTasks++;
    }
  });

  const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const urgentTasks = pendingTasks; // Simple calculation

  // Update cards
  document.getElementById('totalTask').textContent = totalTasks;
  document.getElementById('doneTask').textContent = completedTasks;
  document.getElementById('completedPercent').textContent = completedPercent + '%';
  document.getElementById('openTask').textContent = pendingTasks;
  document.getElementById('nearDeadline').textContent = urgentTasks;

  // Update status bars (Chart section)
  document.getElementById('statusDone').textContent = completedTasks;
  document.getElementById('statusPending').textContent = pendingTasks;
  
  const donePercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const pendingPercent = totalTasks > 0 ? (pendingTasks / totalTasks) * 100 : 0;
  
  const doneBar = document.querySelector('.status-fill.done');
  const pendingBar = document.querySelector('.status-fill.pending');
  
  if (doneBar) doneBar.style.width = `${donePercent}%`;
  if (pendingBar) pendingBar.style.width = `${pendingPercent}%`;

  // Update progress ring
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (completedPercent / 100) * circumference;
  const progressRing = document.getElementById('progressRing');
  if (progressRing) {
    progressRing.style.strokeDashoffset = strokeDashoffset;
  }
  
  // Update progress text
  const progressValue = document.getElementById('progressValue');
  if (progressValue) {
    progressValue.textContent = `${completedPercent}%`;
  }
}

function renderTaskStats() {
  let html = '<div class="dashboard-section"><h2>📋 Nhiệm vụ</h2>';
  
  if (tasks.length === 0) {
    html += '<p style="color: #999;">Chưa có nhiệm vụ nào</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="completion-table" style="width:100%; table-layout:fixed;"><thead><tr><th>Tên nhiệm vụ</th>';
  
  STUDENTS.forEach(student => {
    html += `<th>${student.name.split(' ').pop()}</th>`;
  });
  
  html += '<th>Hoàn thành</th></tr></thead><tbody>';

  tasks.forEach((task, index) => {
    const completions = task.completions || {};
    const completedCount = Object.values(completions).filter(v => v).length;
    
    html += `<tr style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.03}s; opacity: 0; transform: translateY(20px);"><td>${task.name}</td>`;
    
    STUDENTS.forEach(student => {
      const isCompleted = completions[student.id];
      html += `<td class="${isCompleted ? 'completed' : ''}">${isCompleted ? '✅' : '❌'}</td>`;
    });
    
    html += `<td>${completedCount}/${STUDENTS.length}</td></tr>`;
  });
  html += '</tbody></table></div>';
  return html;
}

function renderEventStats() {
  let html = '<div class="dashboard-section"><h2>📅 Sự kiện</h2>';
  
  const allEvents = [];
  if (events && typeof events === 'object') {
    Object.keys(events).forEach(dateKey => {
      if (Array.isArray(events[dateKey])) {
        events[dateKey].forEach(event => {
          allEvents.push({ ...event, date: dateKey });
        });
      }
    });
  }

  if (allEvents.length === 0) {
    html += '<p style="color: #999;">Chưa có sự kiện nào</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="completion-table" style="width:100%; table-layout:fixed;"><thead><tr><th>Sự kiện</th>';

  STUDENTS.forEach(student => {
    html += `<th>${student.name.split(' ').pop()}</th>`;
  });

  html += '<th>Hoàn thành</th></tr></thead><tbody>';

  allEvents.forEach((event, index) => {
    const completions = event.completions || {};
    const completedCount = Object.values(completions).filter(v => v).length;
    
    html += `<tr style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.03}s; opacity: 0; transform: translateY(20px);"><td>${event.name} (${event.date})</td>`;
    
    STUDENTS.forEach(student => {
      const isCompleted = completions[student.id];
      html += `<td class="${isCompleted ? 'completed' : ''}">${isCompleted ? '✅' : '❌'}</td>`;
    });
    
    html += `<td>${completedCount}/${STUDENTS.length}</td></tr>`;
  });

  html += '</tbody></table></div>';
  return html;
}

function renderNotificationStats() {
  let html = '<div class="dashboard-section"><h2>🔔 Thông báo</h2>';
  
  if (notifications.length === 0) {
    html += '<p style="color: #999;">Chưa có thông báo nào</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="completion-table" style="width:100%; table-layout:fixed;"><thead><tr><th>Thông báo</th>';
  
  STUDENTS.forEach(student => {
    html += `<th>${student.name.split(' ').pop()}</th>`;
  });
  
  html += '<th>Đã xem</th></tr></thead><tbody>';

  notifications.forEach((notif, index) => {
    const completions = notif.completions || {};
    const completedCount = Object.values(completions).filter(v => v).length;
    
    html += `<tr style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.03}s; opacity: 0; transform: translateY(20px);"><td>${notif.message}</td>`;
    
    STUDENTS.forEach(student => {
      const isCompleted = completions[student.id];
      html += `<td class="${isCompleted ? 'completed' : ''}">${isCompleted ? '✅' : '❌'}</td>`;
    });
    
    html += `<td>${completedCount}/${STUDENTS.length}</td></tr>`;
  });

  html += '</tbody></table></div>';
  return html;
}
