let systemLogs = [];

window.addEventListener('load', () => {
  // Kiểm tra quyền truy cập
  if (!checkPermission('view_logs')) {
    alert('Bạn không có quyền truy cập trang này!');
    window.location.href = '../index.html';
    return;
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

  systemLogs.forEach(log => {
    const date = new Date(log.timestamp);
    const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} ${date.getDate()}/${date.getMonth()+1}`;
    
    html += `
      <tr>
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