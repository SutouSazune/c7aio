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

  loadAllData();
  renderDashboard();
});

function loadAllData() {
  try {
    tasks = JSON.parse(localStorage.getItem('c7aio_tasks_shared') || '[]');
    events = JSON.parse(localStorage.getItem('c7aio_events_shared') || '{}');
    notifications = JSON.parse(localStorage.getItem('c7aio_notifications_shared') || '[]');
  } catch (error) {
    console.error('Lỗi tải dữ liệu:', error);
  }
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
  document.getElementById('totalTasks').textContent = totalTasks;
  document.getElementById('completedTasks').textContent = completedTasks;
  document.getElementById('completedPercent').textContent = completedPercent + '%';
  document.getElementById('pendingTasks').textContent = pendingTasks;
  document.getElementById('urgentTasks').textContent = urgentTasks;

  // Update progress ring
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (completedPercent / 100) * circumference;
  const progressRing = document.getElementById('progressRing');
  if (progressRing) {
    progressRing.style.strokeDashoffset = strokeDashoffset;
  }
}

function renderTaskStats() {
  let html = '<div class="dashboard-section"><h2>📋 Nhiệm vụ</h2>';
  
  if (tasks.length === 0) {
    html += '<p style="color: #999;">Chưa có nhiệm vụ nào</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="completion-table"><thead><tr><th>Tên nhiệm vụ</th>';
  
  STUDENTS.forEach(student => {
    html += `<th>${student.name.split(' ').pop()}</th>`;
  });
  
  html += '<th>Hoàn thành</th></tr></thead><tbody>';

  tasks.forEach(task => {
    const completions = task.completions || {};
    const completedCount = Object.values(completions).filter(v => v).length;
    
    html += `<tr><td>${task.title}</td>`;
    
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
  Object.keys(events).forEach(dateKey => {
    if (Array.isArray(events[dateKey])) {
      events[dateKey].forEach(event => {
        allEvents.push({ ...event, date: dateKey });
      });
    }
  });

  if (allEvents.length === 0) {
    html += '<p style="color: #999;">Chưa có sự kiện nào</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="completion-table"><thead><tr><th>Sự kiện</th>';
  
  STUDENTS.forEach(student => {
    html += `<th>${student.name.split(' ').pop()}</th>`;
  });
  
  html += '<th>Hoàn thành</th></tr></thead><tbody>';

  allEvents.forEach(event => {
    const completions = event.completions || {};
    const completedCount = Object.values(completions).filter(v => v).length;
    
    html += `<tr><td>${event.name} (${event.date})</td>`;
    
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
  let html = '<div class="dashboard-section"><h2>📢 Thông báo</h2>';
  
  if (notifications.length === 0) {
    html += '<p style="color: #999;">Chưa có thông báo nào</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="completion-table"><thead><tr><th>Thông báo</th>';
  
  STUDENTS.forEach(student => {
    html += `<th>${student.name.split(' ').pop()}</th>`;
  });
  
  html += '<th>Đã xem</th></tr></thead><tbody>';

  notifications.forEach(notif => {
    const completions = notif.completions || {};
    const completedCount = Object.values(completions).filter(v => v).length;
    
    html += `<tr><td>${notif.message}</td>`;
    
    STUDENTS.forEach(student => {
      const isCompleted = completions[student.id];
      html += `<td class="${isCompleted ? 'completed' : ''}">${isCompleted ? '✅' : '❌'}</td>`;
    });
    
    html += `<td>${completedCount}/${STUDENTS.length}</td></tr>`;
  });

  html += '</tbody></table></div>';
  return html;
}
