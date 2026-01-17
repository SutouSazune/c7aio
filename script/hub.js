// Dữ liệu mặc định
const defaultTasks = [
  { name: "Khảo sát học kỳ", deadline: "2025-01-05", done: false },
  { name: "Tham gia cuộc thi A", deadline: "2025-01-02", done: true },
  { name: "Nộp báo cáo nhóm", deadline: "2025-01-01", done: false }
];

let tasks = [];

// Load stats từ Firebase
async function loadStats() {
  try {
    // Lấy tasks từ Firebase
    tasks = await getTasks();
    
    if (tasks.length === 0) {
      tasks = defaultTasks;
    }
  } catch (error) {
    console.error('Lỗi tải tasks:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem('c7aio_tasks');
    tasks = stored ? JSON.parse(stored) : defaultTasks;
  }

  updateUIStats();
}

function updateUIStats() {
  // Cập nhật số liệu
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const openTasks = totalTasks - doneTasks;
  
  document.getElementById("totalTask").innerText = totalTasks;
  document.getElementById("doneTask").innerText = doneTasks;
  document.getElementById("openTask").innerText = openTasks;

  const today = new Date();
  const nearDeadlineTasks = tasks.filter(t => {
    const d = new Date(t.deadline);
    const daysUntil = (d - today) / (1000*60*60*24);
    return daysUntil <= 2 && daysUntil >= 0 && !t.done;
  });

  document.getElementById("nearDeadline").innerText = nearDeadlineTasks.length;

  // Cập nhật task gần hạn
  updateRecentTasks(nearDeadlineTasks);
}

function updateRecentTasks(nearDeadlineTasks) {
  const ul = document.getElementById("recentTasks");
  const emptyState = document.getElementById("emptyState");
  
  ul.innerHTML = "";
  
  if (nearDeadlineTasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  nearDeadlineTasks.slice(0, 5).forEach(t => {
    const deadline = new Date(t.deadline);
    const today = new Date();
    const daysLeft = Math.ceil((deadline - today) / (1000*60*60*24));
    
    let urgencyClass = '';
    let urgencyText = '';
    
    if (daysLeft < 0) {
      urgencyClass = 'overdue';
      urgencyText = '⚠️ Quá hạn';
    } else if (daysLeft === 0) {
      urgencyClass = 'urgent';
      urgencyText = '🔴 Hôm nay';
    } else if (daysLeft === 1) {
      urgencyClass = 'urgent';
      urgencyText = '🟠 Ngày mai';
    } else {
      urgencyClass = 'soon';
      urgencyText = `📅 Còn ${daysLeft} ngày`;
    }
    
    const li = document.createElement('li');
    li.className = `recent-item ${urgencyClass}`;
    li.innerHTML = `<span>${t.name}</span><span>${urgencyText}</span>`;
    ul.appendChild(li);
  });
}

function go(page) {
  window.location.href = page;
}

// Update welcome message
function updateWelcomeMessage() {
  const user = getCurrentUser();
  if (user) {
    const firstName = user.name.split(' ').pop();
    document.getElementById('welcomeName').textContent = firstName;
    
    // Thay đổi lời chào dựa trên thời gian
    const hour = new Date().getHours();
    let greeting = 'Chúc bạn một ngày học tập hiệu quả!';
    
    if (hour < 12) {
      greeting = '☀️ Buổi sáng tốt lành! Hãy tập trung vào bài học.';
    } else if (hour < 17) {
      greeting = '🌤️ Buổi chiều tốt lành! Tiếp tục hoàn thành các task.';
    } else if (hour < 21) {
      greeting = '🌆 Buổi tối tốt lành! Ôn tập trước khi kết thúc ngày.';
    } else {
      greeting = '🌙 Đã khá muộn rồi! Hãy tiến hành công việc còn lại.';
    }
    
    document.getElementById('welcomeMessage').textContent = greeting;
  }
}

// Kiểm tra trạng thái kết nối
function updateOnlineStatus() {
  const statusEl = document.getElementById('onlineStatus');
  if (navigator.onLine) {
    statusEl.textContent = '🟢 Online';
    statusEl.style.color = 'rgba(67, 233, 123, 0.9)';
  } else {
    statusEl.textContent = '🔴 Offline';
    statusEl.style.color = 'rgba(250, 112, 154, 0.9)';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function setupRealtimeListener() {
  unsubscribe = onTasksChanged((updatedTasks) => {
    tasks = updatedTasks;
    loadStats(); // Cập nhật UI khi dữ liệu thay đổi
  });
}

// Ngưng lắng nghe khi rời khỏi trang
window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// Load dữ liệu lần đầu và setup real-time listener
window.addEventListener('load', () => {
  loadStats();
  setupRealtimeListener();
  optimizeFonts();
});
