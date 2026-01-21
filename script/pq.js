window.addEventListener('load', () => {
  // Kiểm tra quyền truy cập
  if (!checkPermission('manage_roles')) {
    alert('Bạn không có quyền truy cập trang này!');
    window.location.href = '../index.html';
    return;
  }

  // Lắng nghe thay đổi quyền hạn từ Firebase
  onSharedPermissionsChanged((data) => {
    if (data) ROLE_PERMISSIONS_CONFIG = data;
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

  Object.keys(ROLES).forEach(roleKey => {
    if (roleKey === 'admin') return; // Skip Admin (always full perms)
    
    html += `<tr>
      <td style="font-weight: bold;">${ROLES[roleKey]}</td>`;
    
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
}