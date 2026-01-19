// Detect base path for GitHub Pages vs Live Server
function getBasePath() {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;
  
  // GitHub Pages: hostname chứa 'github.io'
  // Cấu trúc thường là /repo-name/
  if (hostname.includes('github.io')) {
    const parts = pathname.split('/');
    // parts[0] là rỗng, parts[1] là tên repo
    if (parts.length >= 2 && parts[1]) {
      return '/' + parts[1] + '/';
    }
  }
  
  // Local development: Nếu chạy trong thư mục con (vd: /c7aio/)
  if (pathname.startsWith('/c7aio/')) {
    return '/c7aio/';
  }

  return '/';
}

const BASE_PATH = getBasePath();

// Helper function to build correct URL
function buildUrl(relativePath) {
  // Remove leading slash if present
  const path = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return BASE_PATH === '/' ? path : BASE_PATH + path;
}

// Dữ liệu mặc định
const defaultTasks = [
  { name: "Khảo sát học kỳ", deadline: "2025-01-05", done: false },
  { name: "Tham gia cuộc thi A", deadline: "2025-01-02", done: true },
  { name: "Nộp báo cáo nhóm", deadline: "2025-01-01", done: false }
];

let tasks = [];
let unsubscribe = null;

// Load stats từ Firebase
async function loadStats() {
  // Sử dụng hàm lắng nghe Shared Tasks mới
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged((updatedTasks) => {
      tasks = updatedTasks;
      updateUIStats();
    });
  }
}

function updateUIStats() {
  const user = getCurrentUser();
  if (!user) return;

  // Cập nhật số liệu
  const totalTasks = tasks.length;
  
  // Tính số task đã hoàn thành dựa trên user hiện tại
  const doneTasks = tasks.filter(t => {
    if (t.completions) return t.completions[user.id];
    return t.done; // Fallback cho dữ liệu cũ
  }).length;
  
  const openTasks = totalTasks - doneTasks;
  
  document.getElementById("totalTask").innerText = totalTasks;
  document.getElementById("doneTask").innerText = doneTasks;
  document.getElementById("openTask").innerText = openTasks;

  const today = new Date();
  const nearDeadlineTasks = tasks.filter(t => {
    // Kiểm tra đã hoàn thành chưa
    const isCompleted = t.completions ? t.completions[user.id] : t.done;
    if (isCompleted) return false;

    // Kiểm tra hạn chót (ưu tiên endTime nếu có)
    const deadlineDate = t.endTime ? new Date(t.endTime) : new Date(t.deadline);
    const diffTime = deadlineDate - today;
    const daysUntil = diffTime / (1000 * 60 * 60 * 24);
    
    // Hiển thị task quá hạn hoặc sắp đến hạn trong vòng 3 ngày tới
    return daysUntil <= 3; 
  });

  document.getElementById("nearDeadline").innerText = nearDeadlineTasks.length;

  // Cập nhật task gần hạn
  updateRecentTasks(nearDeadlineTasks);
}

function updateRecentTasks(nearDeadlineTasks) {
  const ul = document.getElementById("recentTasks");
  const emptyState = document.getElementById("emptyState");
  
  if (!ul || !emptyState) return;
  
  ul.innerHTML = "";
  
  if (nearDeadlineTasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  nearDeadlineTasks.slice(0, 5).forEach(t => {
    // Ưu tiên endTime, fallback deadline
    const deadline = t.endTime ? new Date(t.endTime) : new Date(t.deadline);
    
    // Bỏ qua nếu ngày không hợp lệ
    if (isNaN(deadline.getTime())) return;

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
    
    // Xử lý click vào item để mở chi tiết (nếu cần sau này)
    li.innerHTML = `
      <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.name}</span>
      <span>${urgencyText}</span>
    `;
    
    ul.appendChild(li);
  });
}

function go(page) {
  // Build correct URL based on environment
  const url = buildUrl(page);
  window.location.href = url;
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

// Ngưng lắng nghe khi rời khỏi trang
window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// --- MOBILE OPTIMIZATIONS ---
// Hàm này tự động sửa các lỗi giao diện trên mobile bằng cách inject CSS và Meta tags
function setupMobileOptimizations() {
  // 1. Đảm bảo Viewport đúng chuẩn
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement('meta');
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    document.head.appendChild(meta);
  }

  // 2. Inject CSS sửa lỗi layout mobile (Do không sửa được file .css trực tiếp)
  const style = document.createElement('style');
  style.innerHTML = `
    @media (max-width: 768px) {
      /* FORCE SCROLL: Ghi đè mọi thiết lập chặn scroll của body/html từ CSS cũ */
      html, body {
        overflow-y: auto !important;
        overflow-x: hidden;
        height: auto !important;
      }

      /* Fix lỗi Modal không scroll được */
      .modal {
        align-items: flex-start !important; /* Cho phép scroll từ đầu trang */
        padding-top: 10px;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
        z-index: 99999; /* Đảm bảo luôn nổi lên trên */
      }
      .modal-content {
        width: 92% !important; /* Thu gọn lại một chút để không sát lề */
        max-width: 95vw !important;
        margin: 10px auto 50px auto !important;
        padding: 15px !important; /* Giảm padding để nội dung khít hơn */
        height: auto !important;
        max-height: none !important;
      }
      
      /* Fix bảng bị tràn màn hình -> Cho phép cuộn ngang */
      .table-responsive {
        display: block;
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Fix Lịch hiển thị trên mobile */
      .calendar-day {
        height: 60px !important; /* Giảm chiều cao ô lịch */
        font-size: 0.8rem;
        padding: 2px !important;
      }
      
      /* Fix các nút bấm quá to hoặc tràn */
      .header-right, .header-content {
        flex-wrap: wrap;
        gap: 5px;
      }
      
      /* Ẩn bớt các thành phần không cần thiết nếu cần */
      .console-toggle { bottom: 10px; right: 10px; top: auto !important; }
    }
  `;
  document.head.appendChild(style);
}

// Load dữ liệu lần đầu và setup real-time listener
window.addEventListener('load', () => {
  loadStats();
  setupMobileOptimizations(); // Kích hoạt tối ưu mobile
});
