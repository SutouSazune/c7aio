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

  // Cập nhật UI
  document.getElementById("totalTask").innerText = tasks.length;
  document.getElementById("doneTask").innerText = tasks.filter(t => t.done).length;
  document.getElementById("openTask").innerText = tasks.filter(t => !t.done).length;

  const today = new Date();
  const near = tasks.filter(t => {
    const d = new Date(t.deadline);
    return (d - today) / (1000*60*60*24) <= 2 && !t.done;
  });

  document.getElementById("nearDeadline").innerText = near.length;

  const ul = document.getElementById("recentTasks");
  ul.innerHTML = "";
  tasks.slice(0, 3).forEach(t => {
    ul.innerHTML += `<li>${t.name} – ${t.deadline}</li>`;
  });
}

function loadStats() {
  document.getElementById("totalTask").innerText = tasks.length;
  document.getElementById("doneTask").innerText = tasks.filter(t => t.done).length;
  document.getElementById("openTask").innerText = tasks.filter(t => !t.done).length;

  const today = new Date();
  const near = tasks.filter(t => {
    const d = new Date(t.deadline);
    return (d - today) / (1000*60*60*24) <= 2 && !t.done;
  });

  document.getElementById("nearDeadline").innerText = near.length;

  const ul = document.getElementById("recentTasks");
  ul.innerHTML = "";
  tasks.slice(0, 3).forEach(t => {
    ul.innerHTML += `<li>${t.name} – ${t.deadline}</li>`;
  });
}

function go(page) {
  window.location.href = page;
}

// Tối ưu hiệu suất: Lazy load fonts từ Google
function optimizeFonts() {
  if ('fonts' in document) {
    document.fonts.ready.then(() => {
      document.body.style.fontFamily = "'Inter', sans-serif";
    });
  }
}

// Lắng nghe thay đổi real-time từ Firebase
let unsubscribe = null;

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
