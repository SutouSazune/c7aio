/**
 * C7AIO Role Permissions Matrix Controller & Dynamic Role Creator
 */

let currentStudents = STUDENTS || [];
let customRolesData = {};
let editingRoleKey = null;

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

  if (typeof onSharedCustomRolesChanged === 'function') {
    onSharedCustomRolesChanged((data) => {
      customRolesData = data || {};
      if (typeof applyCustomRoles === 'function') {
        applyCustomRoles(customRolesData);
      }
      renderRolesMatrix();
    });
  }

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

  const permKeys = Object.keys(PERMISSIONS);
  const roleKeys = Object.keys(ROLES)
    .filter(r => r !== 'admin')
    .sort((a, b) => {
      const permsA = (ROLE_PERMISSIONS_CONFIG[a] || []).length;
      const permsB = (ROLE_PERMISSIONS_CONFIG[b] || []).length;
      if (permsB !== permsA) {
        return permsB - permsA; // Nhiều quyền nhất xếp trên đầu
      }
      return (ROLES[a] || a).localeCompare(ROLES[b] || b, 'vi');
    });

  let html = `
    <table class="c7-table">
      <thead>
        <tr>
          <th style="min-width: 260px; text-align: left; padding: 14px 16px;">Chức vụ & Thành viên đảm nhiệm</th>
          ${permKeys.map(p => `<th style="min-width: 140px; font-size: 0.85rem; text-align: center; padding: 14px 10px; line-height: 1.4; white-space: normal;">${PERMISSIONS[p]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  roleKeys.forEach(roleKey => {
    const isCustom = typeof DEFAULT_ROLES !== 'undefined' ? !DEFAULT_ROLES[roleKey] : false;
    const holders = currentStudents.filter(s => {
      const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
      return roles.includes(roleKey);
    });

    const holdersHtml = holders.length > 0
      ? `<div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
           ${holders.map(h => `<span class="role-holder-chip">👤 ${escapeHtml(h.name)}</span>`).join('')}
         </div>`
      : `<div style="margin-top: 4px; font-size: 0.8rem; color: var(--text-muted); font-style: italic;">(Chưa có thành viên)</div>`;

    const roleControls = `
      <span style="display: inline-flex; gap: 6px; align-items: center;">
        <button class="btn-action-pill" onclick="openEditRoleModal('${roleKey}')" title="Sửa tên / emoji / màu sắc">✏️ Sửa</button>
        ${isCustom ? `<button class="btn-action-pill danger" onclick="confirmDeleteRole('${roleKey}')" title="Xóa chức vụ này">🗑️ Xóa</button>` : ''}
      </span>
    `;

    html += `
      <tr>
        <td style="vertical-align: top; padding: 14px 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <div class="role-title-tag" style="color: ${ROLE_COLORS[roleKey] || 'var(--primary)'}; font-weight: 800; font-size: 0.95rem; cursor: pointer;" onclick="openEditRoleModal('${roleKey}')" title="Bấm để chỉnh sửa chức vụ">
              ${ROLES[roleKey]}
            </div>
            ${roleControls}
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

// ============= CUSTOM ROLES MODAL LOGIC =============
function openAddRoleModal() {
  editingRoleKey = null;
  document.getElementById('roleModalTitle').textContent = '➕ Thêm Vai Trò Mới';
  document.getElementById('inputRoleName').value = '';
  document.getElementById('inputRoleKey').value = '';
  document.getElementById('inputRoleKey').disabled = false;
  document.getElementById('inputRoleColor').value = '#8b5cf6';
  document.getElementById('btnDeleteRoleTrigger').style.display = 'none';

  const overlay = document.getElementById('roleModalOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function openEditRoleModal(roleKey) {
  editingRoleKey = roleKey;
  const roleName = ROLES[roleKey] || roleKey;
  const roleColor = ROLE_COLORS[roleKey] || '#8b5cf6';
  const isDefault = typeof DEFAULT_ROLES !== 'undefined' && !!DEFAULT_ROLES[roleKey];

  document.getElementById('roleModalTitle').textContent = '✏️ Chỉnh Sửa Chức Vụ';
  document.getElementById('inputRoleName').value = roleName;
  document.getElementById('inputRoleKey').value = roleKey;
  document.getElementById('inputRoleKey').disabled = true; // Key cannot be edited
  document.getElementById('inputRoleColor').value = roleColor;
  
  const delBtn = document.getElementById('btnDeleteRoleTrigger');
  if (delBtn) {
    delBtn.style.display = 'inline-flex';
    delBtn.textContent = isDefault ? '🔄 Đặt lại mặc định' : '🗑️ Xóa chức vụ';
  }

  const overlay = document.getElementById('roleModalOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeRoleModal() {
  const overlay = document.getElementById('roleModalOverlay');
  if (overlay) overlay.style.display = 'none';
  editingRoleKey = null;
}

function slugifyKey(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 30);
}

async function submitRoleForm() {
  const name = (document.getElementById('inputRoleName').value || '').trim();
  let key = (document.getElementById('inputRoleKey').value || '').trim();
  const color = document.getElementById('inputRoleColor').value || '#8b5cf6';

  if (!name) {
    showToast('Vui lòng nhập tên vai trò / chức vụ!', 'warning');
    return;
  }

  if (editingRoleKey) {
    key = editingRoleKey;
  } else {
    if (!key) {
      key = 'role_' + slugifyKey(name);
    } else {
      key = slugifyKey(key);
    }
  }

  if (!key) {
    showToast('Mã định danh không hợp lệ!', 'error');
    return;
  }

  try {
    if (typeof saveSharedCustomRole === 'function') {
      await saveSharedCustomRole(key, { name, color });
    }

    ROLES[key] = name;
    ROLE_COLORS[key] = color;
    if (!ROLE_PERMISSIONS_CONFIG[key]) {
      ROLE_PERMISSIONS_CONFIG[key] = [];
    }

    closeRoleModal();
    renderRolesMatrix();
    showToast(editingRoleKey ? 'Đã cập nhật chức vụ thành công!' : 'Đã tạo chức vụ mới thành công!', 'success');
  } catch (e) {
    showToast('Lỗi khi lưu vai trò: ' + e.message, 'error');
  }
}

function confirmDeleteRole(roleKey) {
  const isDefault = typeof DEFAULT_ROLES !== 'undefined' && !!DEFAULT_ROLES[roleKey];
  const title = isDefault ? 'Đặt lại chức vụ mặc định' : 'Xóa chức vụ';
  const msg = isDefault 
    ? `Khôi phục chức vụ "${ROLES[roleKey] || roleKey}" về tên và màu mặc định ban đầu?`
    : `Bạn có chắc chắn muốn xóa chức vụ "${ROLES[roleKey] || roleKey}" không?`;

  showConfirm(title, msg, async () => {
    try {
      if (typeof deleteSharedCustomRole === 'function') {
        await deleteSharedCustomRole(roleKey);
      }
      if (isDefault) {
        ROLES[roleKey] = DEFAULT_ROLES[roleKey];
        ROLE_COLORS[roleKey] = DEFAULT_ROLE_COLORS[roleKey];
      } else {
        delete ROLES[roleKey];
        delete ROLE_COLORS[roleKey];
        delete ROLE_PERMISSIONS_CONFIG[roleKey];
      }

      renderRolesMatrix();
      showToast(isDefault ? 'Đã đặt lại chức vụ mặc định!' : 'Đã xóa chức vụ thành công!', 'info');
    } catch (e) {
      showToast('Lỗi khi xóa/đặt lại chức vụ: ' + e.message, 'error');
    }
  });
}

function deleteRoleAction() {
  if (editingRoleKey) {
    confirmDeleteRole(editingRoleKey);
    closeRoleModal();
  }
}

// ============= SAVE ROLE PERMISSIONS MATRIX =============
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

  ROLE_PERMISSIONS_CONFIG = newConfig;

  if (typeof saveSharedPermissions === 'function') {
    await saveSharedPermissions(newConfig);
  }

  renderRolesMatrix();
  showToast('Đã lưu và sắp xếp lại bảng phân quyền thành công!', 'success');
}
