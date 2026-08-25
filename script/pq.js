/**
 * C7AIO Role Permissions Matrix Controller
 */

let currentStudents = STUDENTS || [];

window.addEventListener('load', () => {
  const user = getCurrentUser();
  if (!user || !checkPermission('manage_roles')) {
    showToast('Bạn không có quyền truy cập trang phân quyền!', 'error');
    setTimeout(() => {
      window.location.href = buildUrl('index.html');
    }, 800);
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = user.name;

  renderRolesMatrix();

  if (typeof onSharedPermissionsChanged === 'function') {
    onSharedPermissionsChanged((data) => {
      if (data) {
        ROLE_PERMISSIONS_CONFIG = data;
        renderRolesMatrix();
      }
    });
  }

  if (typeof onSharedStudentsChanged === 'function') {
    onSharedStudentsChanged((data) => {
      if (data && data.length > 0) {
        currentStudents = data;
        renderRolesMatrix();
      }
    });
  }
});

function renderRolesMatrix() {
  const container = document.getElementById('rolesMatrixContainer');
  if (!container) return;

  const roleKeys = Object.keys(ROLES).filter(r => r !== 'admin');
  const permKeys = Object.keys(PERMISSIONS);

  let html = `
    <table class="c7-table">
      <thead>
        <tr>
          <th style="min-width: 240px; text-align: left; padding: 14px 16px;">Chức vụ & Thành viên đảm nhiệm</th>
          ${permKeys.map(p => `<th style="min-width: 140px; font-size: 0.85rem; text-align: center; padding: 14px 10px; line-height: 1.4; white-space: normal;">${PERMISSIONS[p]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  roleKeys.forEach(roleKey => {
    const holders = currentStudents.filter(s => {
      const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
      return roles.includes(roleKey);
    });

    const holdersHtml = holders.length > 0
      ? `<div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
           ${holders.map(h => `<span class="role-holder-chip">👤 ${escapeHtml(h.name)}</span>`).join('')}
         </div>`
      : `<div style="margin-top: 4px; font-size: 0.8rem; color: var(--text-muted); font-style: italic;">(Chưa có thành viên)</div>`;

    html += `
      <tr>
        <td style="vertical-align: top; padding: 14px 16px;">
          <div class="role-title-tag" style="color: ${ROLE_COLORS[roleKey] || 'var(--primary)'};">
            ${ROLES[roleKey]}
          </div>
          ${holdersHtml}
        </td>
    `;

    permKeys.forEach(permKey => {
      const hasPerm = (ROLE_PERMISSIONS_CONFIG[roleKey] || []).includes(permKey);
      html += `
        <td style="text-align: center; vertical-align: middle;">
          <input type="checkbox" class="perm-checkbox-custom perm-box" data-role="${roleKey}" data-perm="${permKey}" ${hasPerm ? 'checked' : ''} title="${ROLES[roleKey]} - ${PERMISSIONS[permKey]}">
        </td>
      `;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

async function saveRolesConfig() {
  if (!checkPermission('manage_roles')) return;

  const newConfig = { ...ROLE_PERMISSIONS_CONFIG };
  const checkboxes = document.querySelectorAll('.perm-box');

  // Reset all
  Object.keys(newConfig).forEach(role => {
    newConfig[role] = [];
  });

  checkboxes.forEach(cb => {
    if (cb.checked) {
      const role = cb.getAttribute('data-role');
      const perm = cb.getAttribute('data-perm');
      if (role && perm) {
        if (!newConfig[role]) newConfig[role] = [];
        if (!newConfig[role].includes(perm)) {
          newConfig[role].push(perm);
        }
      }
    }
  });

  try {
    if (typeof updateSharedPermissions === 'function') {
      await updateSharedPermissions(newConfig);
      showToast('Đã lưu cấu hình phân quyền lên hệ thống!', 'success');
      logActivity('Phân quyền', 'Cập nhật ma trận quyền hạn cho các ban cán sự');
    } else {
      ROLE_PERMISSIONS_CONFIG = newConfig;
      showToast('Đã lưu cục bộ (Chưa kết nối Cloud)!', 'warning');
    }
  } catch (err) {
    showToast('Lỗi khi lưu cấu hình: ' + err.message, 'error');
  }
}
