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
          <th style="min-width: 220px;">Chức vụ & Thành viên đảm nhiệm</th>
          ${permKeys.map(p => `<th style="font-size: 0.85rem; text-align: center; max-width: 140px;">${PERMISSIONS[p]}</th>`).join('')}
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
  Object.keys(ROLES).forEach(r => {
    if (r !== 'admin') newConfig[r] = [];
  });

  document.querySelectorAll('.perm-box:checked').forEach(cb => {
    const role = cb.dataset.role;
    const perm = cb.dataset.perm;
    if (newConfig[role]) {
      newConfig[role].push(perm);
    }
  });

  if (typeof saveSharedPermissions === 'function') {
    await saveSharedPermissions(newConfig);
  }

  showToast('Đã lưu bảng phân quyền thành công!', 'success');
}
