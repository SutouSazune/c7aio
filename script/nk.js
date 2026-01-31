let systemLogs = [];

window.addEventListener('load', () => {
  // Kiểm tra quyền truy cập
  if (!checkPermission('view_logs')) {
    alert('Bạn không có quyền truy cập trang này!');
    window.location.href = '../index.html';
    return;
  }

  // --- FALLBACK ---
  if (!document.getElementById('fallback-animation-style')) {
    const style = document.createElement('style');
    style.id = 'fallback-animation-style';
    style.innerHTML = `
      :root { --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  // Lắng nghe Logs từ Firebase
  onSharedLogsChanged((data) => {
    systemLogs = data;
    renderLogsTable();
  });
});

function renderLogsTable() {
  const container = document.querySelector('.logs-container');
  if (!container) return;

  if (systemLogs.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: #888;">Chưa có nhật ký hoạt động nào.</p>';
    return;
  }

  let html = `
    <table class="modern-table" style="width: 100%;">
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Người thực hiện</th>
          <th>Chức vụ</th>
          <th>Hành động</th>
          <th>Chi tiết</th>
        </tr>
      </thead>
      <tbody>
  `;

  systemLogs.forEach((log, index) => {
    const date = new Date(log.timestamp);
    const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} ${date.getDate()}/${date.getMonth()+1}`;
    
    html += `
      <tr style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.03}s; opacity: 0; transform: translateY(20px);">
        <td style="white-space: nowrap; color: #666;">${timeStr}</td>
        <td style="font-weight: 600;">${log.user}</td>
        <td>${log.role}</td>
        <td style="color: #2980b9; font-weight: 500;">${log.action}</td>
        <td style="color: #555;">${log.detail}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}