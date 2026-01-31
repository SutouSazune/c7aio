let currentStudents = [];
let isPermissionsDataSynced = false; // Cờ để chặn lưu dữ liệu khi chưa đồng bộ

window.addEventListener('load', () => {
  // Kiểm tra quyền truy cập
  if (!checkPermission('manage_roles')) {
    alert('Bạn không có quyền truy cập trang này!');
    window.location.href = '../index.html';
    return;
  }

  // --- FALLBACK ---
  if (typeof window.showToast !== 'function') window.showToast = (msg) => alert(msg);
  if (!document.getElementById('fallback-animation-style')) {
    const style = document.createElement('style');
    style.id = 'fallback-animation-style';
    style.innerHTML = `
      :root { --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  // Lắng nghe thay đổi quyền hạn từ Firebase
  onSharedPermissionsChanged((data) => {
    if (data) ROLE_PERMISSIONS_CONFIG = data;
    isPermissionsDataSynced = true; // Đánh dấu đã nhận dữ liệu từ server
    renderRolesMatrix();
  });

  // Lắng nghe danh sách học sinh để hiển thị thành viên
  onSharedStudentsChanged((data) => {
    currentStudents = data || [];
    renderRolesMatrix();
  });

  // Render lần đầu
  renderRolesMatrix();
});

function renderRolesMatrix() {
  const container = document.querySelector('.roles-matrix-container');
  if (!container) return;

  let html = `
    <table class="modern-table" style="width: 100%;">
      <thead>
        <tr>
          <th>Chức vụ / Quyền hạn</th>
          ${Object.keys(PERMISSIONS).map(p => `<th style="font-size: 0.8rem;">${PERMISSIONS[p]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  Object.keys(ROLES).forEach((roleKey, index) => {
    if (roleKey === 'admin') return; // Skip Admin (always full perms)
    
    // Lọc danh sách thành viên thuộc role này
    const members = currentStudents.filter(s => {
      const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
      return roles.includes(roleKey);
    });

    const membersHtml = members.length > 0 
      ? `<div style="margin-top: 5px; font-size: 0.8rem; color: #666;">
           ${members.map(m => `<div>👤 ${m.name}</div>`).join('')}
         </div>`
      : `<div style="margin-top: 5px; font-size: 0.8rem; color: #999; font-style: italic;">(Trống)</div>`;

    html += `<tr style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.05}s; opacity: 0; transform: translateY(20px);">
      <td style="vertical-align: top;">
        <div style="font-weight: bold; color: #2c3e50;">${ROLES[roleKey]}</div>
        ${membersHtml}
      </td>`;
    
    Object.keys(PERMISSIONS).forEach(permKey => {
      const hasPerm = (ROLE_PERMISSIONS_CONFIG[roleKey] || []).includes(permKey);
      html += `
        <td style="text-align: center;">
          <input type="checkbox" class="perm-checkbox" 
            data-role="${roleKey}" data-perm="${permKey}" 
            ${hasPerm ? 'checked' : ''}>
        </td>
      `;
    });
    
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function saveRolesConfig() {
  // FIX SYNC: Chặn lưu nếu chưa đồng bộ lần đầu
  if (!isPermissionsDataSynced) {
    showToast('⏳ Đang đồng bộ dữ liệu, vui lòng đợi...', 'info');
    return;
  }
  
  // FIX SYNC: Client-side Guard
  // Kiểm tra nếu config rỗng bất thường (Admin luôn phải có quyền)
  if (!ROLE_PERMISSIONS_CONFIG || !ROLE_PERMISSIONS_CONFIG['admin'] || ROLE_PERMISSIONS_CONFIG['admin'].length === 0) {
    console.warn('⚠️ Client Guard: Chặn lưu cấu hình phân quyền lỗi/rỗng.');
    return;
  }

  if (!confirm('Lưu thay đổi phân quyền?')) return;
  const newConfig = { ...ROLE_PERMISSIONS_CONFIG };
  Object.keys(ROLES).forEach(role => {
    if (role !== 'admin') newConfig[role] = [];
  });
  document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
    const role = cb.dataset.role;
    const perm = cb.dataset.perm;
    if (newConfig[role]) newConfig[role].push(perm);
  });
  saveSharedPermissions(newConfig);
  showToast('Đã cập nhật phân quyền!', 'success');
}