/**
 * C7AIO Student Profiles Management Controller
 * Quản lý hồ sơ học sinh, Nhập / Xuất file CSV, Tìm kiếm, Phân quyền & Đồng bộ
 */

let editingStudentId = null;
let searchQuery = '';

// ============= VIEW MODE & REQUIRED COLUMN STATE =============
let currentViewMode = localStorage.getItem('c7aio_hs_view_mode') || 'table_full';
let currentFilter = 'all';
let requiredField = localStorage.getItem('c7aio_hs_req_field') || 'none';

const FIELD_LABELS = {
  'none': 'Chỉ hiện tên (Mặc định)',
  'dob': 'Ngày sinh',
  'phone': 'Số điện thoại',
  'email': 'Email',
  'role': 'Chức vụ / Vai trò',
  'previousClass': 'Lớp cũ',
  'group': 'Tổ sinh hoạt',
  'gender': 'Giới tính',
  'cccd': 'Số CCCD',
  'address': 'Địa chỉ thường trú',
  'status': 'Trạng thái Online'
};

let renderTimer = null;
function requestRenderStudents(delay = 100) {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderStudentsTable();
  }, delay);
}

window.addEventListener('load', () => {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = buildUrl('login.html');
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = user.name;

  if (!checkPermission('manage_students')) {
    showToast('Chế độ chỉ xem thông tin danh bạ', 'info');
  }

  initViewModeControls();
  populateRolesSelect();
  renderStudentsTable();

  // Lắng nghe Vai Trò Tùy Chỉnh Realtime
  if (typeof onSharedCustomRolesChanged === 'function') {
    onSharedCustomRolesChanged((data) => {
      if (typeof applyCustomRoles === 'function') {
        applyCustomRoles(data);
      }
      populateRolesSelect();
      requestRenderStudents(100);
    });
  }

  // Lắng nghe Realtime
  if (typeof onSharedStudentsChanged === 'function') {
    onSharedStudentsChanged((data) => {
      if (data && data.length > 0) {
        STUDENTS = data;
        requestRenderStudents(100);
      }
    });
  }

  // Trạng thái online học sinh
  if (typeof onSharedPresenceChanged === 'function') {
    onSharedPresenceChanged((p) => { hsPresence = p; requestRenderStudents(300); });
  }
  if (typeof onSharedUserStatsChanged === 'function') {
    onSharedUserStatsChanged((s) => { hsUserStats = s; requestRenderStudents(300); });
  }
  setInterval(() => requestRenderStudents(0), 30000);
});

let hsPresence = {};
let hsUserStats = {};

function hsTimeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'vừa xong';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' phút trước';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' giờ trước';
  const d = Math.floor(h / 24);
  if (d < 30) return d + ' ngày trước';
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo + ' tháng trước';
  return Math.floor(mo / 12) + ' năm trước';
}

function getStudentStatusHtml(s) {
  const key = 'u' + s.id;
  const now = Date.now();
  const online = Object.values(hsPresence[key] || {}).some(x => x && x.lastSeen && now - x.lastSeen < 3 * 60 * 1000);
  if (online) return '<span style="color:#10b981;font-weight:700;font-size:0.85rem;">🟢 Đang online</span>';
  const st = hsUserStats[key];
  const last = st && (st.lastSeen || (st.lastLogin ? new Date(st.lastLogin).getTime() : 0));
  if (!last) return '<span style="color:var(--text-muted);font-size:0.82rem;">⚪ Chưa từng truy cập</span>';
  return `<span style="color:var(--text-sub);font-size:0.82rem;">⚪ Lần cuối mở ${hsTimeAgo(last)}</span>`;
}

function populateRolesSelect(selectedRoles = ['student']) {
  const container = document.getElementById('rolesCheckboxContainer');
  if (!container) return;

  const currentSelected = Array.isArray(selectedRoles) ? selectedRoles : [selectedRoles || 'student'];

  let html = '';
  Object.keys(ROLES).forEach(roleKey => {
    if (roleKey !== 'admin') {
      const isChecked = currentSelected.includes(roleKey);
      const color = ROLE_COLORS[roleKey] || 'var(--primary)';
      html += `
        <label class="role-pill-checkbox" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-full); border: 1px solid ${isChecked ? color : 'var(--input-border)'}; background: ${isChecked ? (color + '1a') : 'var(--card-bg)'}; cursor: pointer; user-select: none; font-size: 0.82rem; font-weight: 600; color: var(--text-main); transition: all 0.2s ease;">
          <input type="checkbox" class="std-role-checkbox" value="${roleKey}" ${isChecked ? 'checked' : ''} onchange="handleRoleCheckboxChange(this, '${color}')" style="accent-color: ${color}; cursor: pointer;">
          <span>${ROLES[roleKey]}</span>
        </label>
      `;
    }
  });

  container.innerHTML = html;
}

function handleRoleCheckboxChange(checkbox, color) {
  const label = checkbox.closest('label');
  if (!label) return;
  if (checkbox.checked) {
    label.style.borderColor = color;
    label.style.background = color + '1a';
  } else {
    label.style.borderColor = 'var(--input-border)';
    label.style.background = 'var(--card-bg)';
  }
}

// ============= HELPER FUNCTIONS & DISPLAY CONTROLS =============

function isCadre(s) {
  if (!s) return false;
  const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
  return roles.some(r => r && r !== 'student');
}

function handleStudentSearch(val) {
  searchQuery = (val || '').toLowerCase().trim();
  requestRenderStudents(120);
}

function setViewMode(mode) {
  currentViewMode = mode;
  try { localStorage.setItem('c7aio_hs_view_mode', mode); } catch (e) {}
  document.querySelectorAll('.hs-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (mode === 'by_field' && requiredField === 'none') {
    requiredField = 'phone';
    const sel = document.getElementById('selectRequiredField');
    if (sel) sel.value = 'phone';
    try { localStorage.setItem('c7aio_hs_req_field', 'phone'); } catch (e) {}
  }
  renderStudentsTable();
}

function setRequiredField(val) {
  requiredField = val || 'none';
  try { localStorage.setItem('c7aio_hs_req_field', requiredField); } catch (e) {}
  const sel = document.getElementById('selectRequiredField');
  if (sel) sel.value = requiredField;
  renderStudentsTable();
}

function setQuickFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.hs-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderStudentsTable();
}

function initViewModeControls() {
  document.querySelectorAll('.hs-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentViewMode);
  });
  document.querySelectorAll('.hs-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
  });
  const sel = document.getElementById('selectRequiredField');
  if (sel) sel.value = requiredField;
}

function getFilteredStudents() {
  let list = Array.isArray(STUDENTS) ? STUDENTS : [];

  if (searchQuery) {
    list = list.filter(s => {
      const matchName = (s.name || '').toLowerCase().includes(searchQuery);
      const matchPhone = (s.phone || '').includes(searchQuery);
      const matchEmail = (s.email || '').toLowerCase().includes(searchQuery);
      const matchPrev = (s.previousClass || '').toLowerCase().includes(searchQuery);
      const matchCccd = (s.cccd || '').includes(searchQuery);
      const matchAddr = (s.address || '').toLowerCase().includes(searchQuery);
      return matchName || matchPhone || matchEmail || matchPrev || matchCccd || matchAddr;
    });
  }

  if (currentFilter === 'male') {
    list = list.filter(s => (s.gender || 'Nam').toLowerCase() === 'nam');
  } else if (currentFilter === 'female') {
    list = list.filter(s => (s.gender || '').toLowerCase() === 'nữ');
  } else if (currentFilter === 'cadre') {
    list = list.filter(s => isCadre(s));
  } else if (currentFilter === 'g1') {
    list = list.filter(s => Number(s.group) === 1);
  } else if (currentFilter === 'g2') {
    list = list.filter(s => Number(s.group) === 2);
  } else if (currentFilter === 'g3') {
    list = list.filter(s => Number(s.group) === 3);
  } else if (currentFilter === 'g4') {
    list = list.filter(s => Number(s.group) === 4);
  }

  return list;
}

function renderStatsBar(filteredList) {
  const bar = document.getElementById('hsStatsBar');
  if (!bar) return;

  const total = STUDENTS.length;
  const currentCount = filteredList.length;
  const maleCount = filteredList.filter(s => (s.gender || 'Nam').toLowerCase() === 'nam').length;
  const femaleCount = filteredList.filter(s => (s.gender || '').toLowerCase() === 'nữ').length;
  const cadreCount = filteredList.filter(s => isCadre(s)).length;

  bar.innerHTML = `
    <span class="hs-stat-tag">Hiển thị: <strong>${currentCount}</strong>/${total} hs</span>
    <span class="hs-stat-tag" title="Nam">👦 <strong>${maleCount}</strong></span>
    <span class="hs-stat-tag" title="Nữ">👧 <strong>${femaleCount}</strong></span>
    <span class="hs-stat-tag" title="Ban cán sự">🎖️ <strong>${cadreCount}</strong></span>
  `;
}

// Render đúng cột yêu cầu (nếu có)
function renderRequiredFieldCell(s, field) {
  if (!field || field === 'none') return '';
  switch (field) {
    case 'dob':
      return `<span class="hs-meta-tag">🎂 ${formatDateVn(s.dob)}</span>`;
    case 'phone':
      return s.phone ? `<a href="tel:${s.phone}" class="hs-quick-btn">📞 ${s.phone}</a>` : '<span style="color:var(--text-muted); font-size:0.8rem;">-</span>';
    case 'email':
      return s.email ? `<a href="mailto:${s.email}" class="hs-quick-btn">✉️ ${escapeHtml(s.email)}</a>` : '<span style="color:var(--text-muted); font-size:0.8rem;">-</span>';
    case 'role': {
      const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
      return roles.map(r => `<span class="user-role-pill" style="background:${ROLE_COLORS[r] || '#6366f1'}; font-size:0.75rem;">${ROLES[r] || r}</span>`).join(' ');
    }
    case 'previousClass':
      return `<span class="user-role-pill" style="background:${s.previousClass === '10C9' ? '#ec4899' : '#0284c7'}; font-size:0.75rem;">${escapeHtml(s.previousClass || '10C7')}</span>`;
    case 'group':
      return `<span class="hs-meta-tag">🚩 Tổ ${s.group || 1}</span>`;
    case 'gender':
      return `<span class="hs-meta-tag">${(s.gender || '').toLowerCase() === 'nữ' ? '👧 Nữ' : '👦 Nam'}</span>`;
    case 'cccd':
      return `<span class="hs-meta-tag" title="CCCD: ${escapeHtml(s.cccd || '')}">🪪 ${escapeHtml(s.cccd || '-')}</span>`;
    case 'address':
      return `<span class="hs-meta-tag" title="${escapeHtml(s.address || '')}">📍 ${escapeHtml(s.address || '-')}</span>`;
    case 'status':
      return getStudentStatusHtml(s);
    default:
      return '';
  }
}

// Hàng hiển thị gọn: CHỈ HIỆN STT + TÊN + CỘT YÊU CẦU
function renderCompactRow(s, idx, canEdit, extraField = requiredField) {
  const reqHtml = renderRequiredFieldCell(s, extraField);

  return `
    <div class="hs-compact-row">
      <div class="hs-compact-left">
        <span class="hs-compact-stt">${idx + 1}</span>
        <strong class="hs-compact-name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</strong>
      </div>
      ${reqHtml ? `<div class="hs-compact-details">${reqHtml}</div>` : ''}
    </div>
  `;
}

// 1. Chế độ BẢNG ĐẦY ĐỦ (Hiển thị tất cả các cột của hồ sơ học sinh)
function renderTableFull(list, container, canEdit) {
  const theadHtml = `
    <thead>
      <tr>
        <th style="width: 42px; text-align: center;">STT</th>
        <th style="min-width: 150px;">Họ và Tên</th>
        <th style="min-width: 100px;">Chức vụ</th>
        <th style="width: 85px;">Ngày sinh</th>
        <th style="width: 60px; text-align: center;">Giới tính</th>
        <th style="width: 65px; text-align: center;">Lớp cũ</th>
        <th style="min-width: 120px;">Liên hệ</th>
        <th style="min-width: 110px; max-width: 140px;">Trạng thái</th>
        <th style="width: 55px; text-align: center;">Tổ</th>
        <th style="min-width: 95px;">CCCD</th>
        <th style="min-width: 120px; max-width: 170px;">Địa chỉ</th>
        <th style="width: 70px; text-align: center;">Hành động</th>
      </tr>
    </thead>
  `;

  const tbodyHtml = list.map((s, idx) => {
    const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
    const roleBadges = roles.map(r => `
      <span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#6366f1'}; font-size: 0.75rem;">
        ${ROLES[r] || r}
      </span>
    `).join(' ');

    const prevBadge = `<span class="user-role-pill" style="background: ${s.previousClass === '10C9' ? '#ec4899' : '#0284c7'}; font-size: 0.75rem;">${escapeHtml(s.previousClass || '10C7')}</span>`;
    const phoneLink = s.phone ? `<a href="tel:${s.phone}" class="hs-quick-btn">📞 ${s.phone}</a>` : '';
    const emailLink = s.email ? `<a href="mailto:${s.email}" class="hs-quick-btn">✉️ Email</a>` : '';

    return `
      <tr class="hs-student-row">
        <td style="text-align: center;">${idx + 1}</td>
        <td>
          <div class="hs-avatar-cell">
            <div class="hs-avatar-bubble" style="background: ${getAvatarGradient(s.name)}">
              ${getInitials(s.name)}
            </div>
            <strong>${escapeHtml(s.name)}</strong>
          </div>
        </td>
        <td>${roleBadges}</td>
        <td>${formatDateVn(s.dob)}</td>
        <td style="text-align: center;">${s.gender || 'Nam'}</td>
        <td style="text-align: center;">${prevBadge}</td>
        <td><div style="display: flex; gap: 6px; flex-wrap: wrap;">${phoneLink} ${emailLink}</div></td>
        <td><div style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${getStudentStatusHtml(s)}</div></td>
        <td style="text-align: center;">Tổ ${s.group || 1}</td>
        <td>${escapeHtml(s.cccd || '-')}</td>
        <td title="${escapeHtml(s.address || '')}"><div style="max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(s.address || '-')}</div></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            ${canEdit ? `<button type="button" class="btn-action-pill" onclick="openEditStudentModal(${s.id})">✏️ Sửa</button>` : '<span style="color: var(--text-muted); font-size: 0.8rem;">Xem</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="hs-table-card">
      <table class="c7-table">
        ${theadHtml}
        <tbody id="hsStudentsTableBody">
          ${tbodyHtml}
        </tbody>
      </table>
    </div>
  `;
}

// 2. Chế độ: 2 Cột Nam - Nữ (CHỈ HIỆN TÊN VÀ CỘT YÊU CẦU)
function renderSplitGender(list, container, canEdit) {
  const males = list.filter(s => (s.gender || 'Nam').toLowerCase() === 'nam');
  const females = list.filter(s => (s.gender || '').toLowerCase() === 'nữ');
  const reqNote = requiredField !== 'none' ? ` (${FIELD_LABELS[requiredField] || ''})` : '';

  container.innerHTML = `
    <div class="hs-split-columns">
      <!-- Cột Nam -->
      <div class="hs-split-col">
        <div class="hs-col-header">
          <div class="hs-col-title">
            <span>👦</span>
            <span>Học Sinh Nam</span>
          </div>
          <span class="hs-col-count-badge male">${males.length} hs${reqNote}</span>
        </div>
        <div class="hs-compact-list">
          ${males.length > 0 ? males.map((s, idx) => renderCompactRow(s, idx, canEdit, requiredField)).join('') : '<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.85rem;">Không có học sinh nam nào</div>'}
        </div>
      </div>

      <!-- Cột Nữ -->
      <div class="hs-split-col">
        <div class="hs-col-header">
          <div class="hs-col-title">
            <span>👧</span>
            <span>Học Sinh Nữ</span>
          </div>
          <span class="hs-col-count-badge female">${females.length} hs${reqNote}</span>
        </div>
        <div class="hs-compact-list">
          ${females.length > 0 ? females.map((s, idx) => renderCompactRow(s, idx, canEdit, requiredField)).join('') : '<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.85rem;">Không có học sinh nữ nào</div>'}
        </div>
      </div>
    </div>
  `;
}

// 3. Chế độ: 2 Cột Ban Cán Sự - Học Sinh (CHỈ HIỆN TÊN, CHỨC VỤ VÀ CỘT YÊU CẦU)
function renderSplitRoles(list, container, canEdit) {
  const cadres = list.filter(s => isCadre(s));
  const members = list.filter(s => !isCadre(s));
  const reqNote = requiredField !== 'none' ? ` (${FIELD_LABELS[requiredField] || ''})` : '';

  container.innerHTML = `
    <div class="hs-split-columns">
      <!-- Cột Ban Cán Sự -->
      <div class="hs-split-col">
        <div class="hs-col-header">
          <div class="hs-col-title">
            <span>🎖️</span>
            <span>Ban Cán Sự Lớp</span>
          </div>
          <span class="hs-col-count-badge cadre">${cadres.length} hs</span>
        </div>
        <div class="hs-compact-list">
          ${cadres.length > 0 ? cadres.map((s, idx) => {
            const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
            const roleBadges = roles.map(r => `<span class="user-role-pill" style="background:${ROLE_COLORS[r] || '#6366f1'}; font-size:0.75rem;">${ROLES[r] || r}</span>`).join(' ');
            const extraReq = (requiredField !== 'none' && requiredField !== 'role') ? renderRequiredFieldCell(s, requiredField) : '';
            return `
              <div class="hs-compact-row">
                <div class="hs-compact-left">
                  <span class="hs-compact-stt">${idx + 1}</span>
                  <strong class="hs-compact-name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</strong>
                </div>
                <div class="hs-compact-details">
                  ${roleBadges}
                  ${extraReq}
                </div>
              </div>
            `;
          }).join('') : '<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.85rem;">Không có cán sự nào</div>'}
        </div>
      </div>

      <!-- Cột Thành Viên Thường (Chỉ tên + Cột yêu cầu) -->
      <div class="hs-split-col">
        <div class="hs-col-header">
          <div class="hs-col-title">
            <span>🧑‍🎓</span>
            <span>Thành Viên Lớp</span>
          </div>
          <span class="hs-col-count-badge">${members.length} hs${reqNote}</span>
        </div>
        <div class="hs-compact-list">
          ${members.length > 0 ? members.map((s, idx) => renderCompactRow(s, idx, canEdit, requiredField)).join('') : '<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.85rem;">Không có học sinh thành viên</div>'}
        </div>
      </div>
    </div>
  `;
}

// 4. Chế độ: Theo Tổ (1 - 4) (CHỈ HIỆN TÊN VÀ CỘT YÊU CẦU)
function renderByGroups(list, container, canEdit) {
  const reqNote = requiredField !== 'none' ? ` (${FIELD_LABELS[requiredField] || ''})` : '';

  const groupsHtml = [1, 2, 3, 4].map(g => {
    const groupStudents = list.filter(s => Number(s.group || 1) === g);
    return `
      <div class="hs-group-box">
        <div class="hs-col-header">
          <div class="hs-col-title">
            <span>🚩</span>
            <span>Tổ ${g}</span>
          </div>
          <span class="hs-col-count-badge">${groupStudents.length} hs${reqNote}</span>
        </div>
        <div class="hs-compact-list">
          ${groupStudents.length > 0 ? groupStudents.map((s, idx) => renderCompactRow(s, idx, canEdit, requiredField)).join('') : '<div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0; font-size: 0.82rem;">Chưa có học sinh</div>'}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="hs-groups-container">
      ${groupsHtml}
    </div>
  `;
}

// 5. Chế độ: THEO THÔNG TIN (Bảng rút gọn: STT + Họ và tên + Cột yêu cầu)
function renderByField(list, container, canEdit) {
  const currentReq = (requiredField && requiredField !== 'none') ? requiredField : 'phone';
  const colTitle = FIELD_LABELS[currentReq] || 'Thông tin yêu cầu';

  container.innerHTML = `
    <div class="hs-table-card">
      <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
          📑 Danh sách học sinh theo cột: <strong style="color: var(--primary);">${colTitle}</strong>
        </span>
        <span style="font-size: 0.82rem; color: var(--text-muted);">
          (Chỉ hiện STT, Họ và tên và cột được chọn)
        </span>
      </div>
      <table class="c7-table">
        <thead>
          <tr>
            <th style="width: 45px; text-align: center;">STT</th>
            <th style="min-width: 220px;">Họ và Tên</th>
            <th style="min-width: 200px;">${colTitle}</th>
          </tr>
        </thead>
        <tbody id="hsStudentsTableBody">
          ${list.map((s, idx) => `
            <tr class="hs-student-row">
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${escapeHtml(s.name)}</strong></td>
              <td>${renderRequiredFieldCell(s, currentReq) || '<span style="color:var(--text-muted);">-</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Master Dispatcher: Điều phối hiển thị toàn bộ
function renderStudentsTable() {
  const container = document.getElementById('hsActiveViewContainer');
  if (!container) return;

  const list = getFilteredStudents();
  renderStatsBar(list);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="hs-empty-state">
        <span class="hs-empty-icon">🔍</span>
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">Không tìm thấy học sinh nào phù hợp</h4>
        <p style="font-size: 0.88rem;">Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn.</p>
      </div>
    `;
    return;
  }

  const canEdit = checkPermission('manage_students');

  switch (currentViewMode) {
    case 'split_gender':
      renderSplitGender(list, container, canEdit);
      break;
    case 'split_roles':
      renderSplitRoles(list, container, canEdit);
      break;
    case 'by_groups':
      renderByGroups(list, container, canEdit);
      break;
    case 'by_field':
      renderByField(list, container, canEdit);
      break;
    case 'table_full':
    default:
      renderTableFull(list, container, canEdit);
      break;
  }
}

// Tiện ích: Sao chép danh sách theo định dạng (Chỉ tên và cột yêu cầu)
function copyCurrentViewText() {
  const list = getFilteredStudents();
  if (list.length === 0) {
    if (typeof showToast === 'function') showToast('Không có dữ liệu để sao chép', 'warning');
    return;
  }

  const getExtraText = (s, forceField = null) => {
    const f = forceField || requiredField;
    if (!f || f === 'none') return '';
    switch (f) {
      case 'dob': return ` (${formatDateVn(s.dob)})`;
      case 'phone': return s.phone ? ` (${s.phone})` : '';
      case 'email': return s.email ? ` (${s.email})` : '';
      case 'role': {
        const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
        return ` [${roles.map(r => ROLES[r] || r).join(', ')}]`;
      }
      case 'previousClass': return ` (${s.previousClass || '10C7'})`;
      case 'group': return ` (Tổ ${s.group || 1})`;
      case 'gender': return ` (${s.gender || 'Nam'})`;
      case 'cccd': return s.cccd ? ` (CCCD: ${s.cccd})` : '';
      case 'address': return s.address ? ` (${s.address})` : '';
      default: return '';
    }
  };

  let text = '';
  if (currentViewMode === 'split_gender') {
    const males = list.filter(s => (s.gender || 'Nam').toLowerCase() === 'nam');
    const females = list.filter(s => (s.gender || '').toLowerCase() === 'nữ');
    text = `=== 👦 HỌC SINH NAM (${males.length} hs) ===\n`;
    text += males.map((s, i) => `${i + 1}. ${s.name}${getExtraText(s)}`).join('\n');
    text += `\n\n=== 👧 HỌC SINH NỮ (${females.length} hs) ===\n`;
    text += females.map((s, i) => `${i + 1}. ${s.name}${getExtraText(s)}`).join('\n');
  } else if (currentViewMode === 'split_roles') {
    const cadres = list.filter(s => isCadre(s));
    const members = list.filter(s => !isCadre(s));
    text = `=== 🎖️ BAN CÁN SỰ LỚP (${cadres.length} hs) ===\n`;
    text += cadres.map((s, i) => `${i + 1}. ${s.name}${getExtraText(s, 'role')}`).join('\n');
    text += `\n\n=== 🧑‍🎓 THÀNH VIÊN LỚP (${members.length} hs) ===\n`;
    text += members.map((s, i) => `${i + 1}. ${s.name}${getExtraText(s)}`).join('\n');
  } else if (currentViewMode === 'by_groups') {
    text = `=== 🚩 DANH SÁCH THEO TỔ - 11C7 ===\n`;
    [1, 2, 3, 4].forEach(g => {
      const gs = list.filter(s => Number(s.group || 1) === g);
      text += `\n-- TỔ ${g} (${gs.length} hs) --\n`;
      text += gs.map((s, i) => `${i + 1}. ${s.name}${getExtraText(s)}`).join('\n');
    });
  } else if (currentViewMode === 'by_field') {
    const currentReq = (requiredField && requiredField !== 'none') ? requiredField : 'phone';
    text = `=== DANH SÁCH HỌC SINH (Kèm ${FIELD_LABELS[currentReq] || currentReq}) ===\n`;
    text += list.map((s, i) => `${i + 1}. ${s.name}${getExtraText(s, currentReq)}`).join('\n');
  } else {
    text = `=== DANH SÁCH LỚP 11C7 (${list.length} học sinh) ===\n`;
    text += list.map((s, i) => `${i + 1}. ${s.name}${getExtraText(s)}`).join('\n');
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showToast === 'function') showToast('Đã sao chép danh sách vào bộ nhớ tạm!', 'success');
    }).catch(() => {
      if (typeof showToast === 'function') showToast('Không thể sao chép tự động', 'error');
    });
  } else {
    if (typeof showToast === 'function') showToast('Trình duyệt không hỗ trợ sao chép tự động', 'warning');
  }
}

function formatDateVn(dob) {
  if (!dob) return '-';
  if (dob.includes('-')) {
    const [y, m, d] = dob.split('-');
    return `${d}/${m}/${y}`;
  }
  return dob;
}

// ============= MODAL ACTIONS =============
function openAddStudentModal() {
  if (!checkPermission('manage_students')) {
    showToast('Bạn không có quyền thêm học sinh!', 'error');
    return;
  }

  editingStudentId = null;
  document.getElementById('hsModalTitle').textContent = '➕ Thêm Học Sinh Mới';
  document.getElementById('inputStdName').value = '';
  document.getElementById('inputStdDob').value = '';
  document.getElementById('selectStdGender').value = 'Nam';
  const prevInput = document.getElementById('inputStdPreviousClass');
  if (prevInput) prevInput.value = '10C7';
  populateRolesSelect(['student']);
  document.getElementById('selectStdGroup').value = '1';
  document.getElementById('inputStdPhone').value = '';
  document.getElementById('inputStdEmail').value = '';
  const cccdEl = document.getElementById('inputStdCccd');
  if (cccdEl) cccdEl.value = '';
  document.getElementById('inputStdAddress').value = '';
  document.getElementById('btnDeleteStdTrigger').style.display = 'none';

  document.getElementById('hsStudentModalOverlay').style.display = 'flex';
}

function openEditStudentModal(studentId) {
  const s = STUDENTS.find(std => std.id == studentId);
  if (!s) {
    showToast('Không tìm thấy học sinh!', 'error');
    return;
  }

  editingStudentId = s.id;
  document.getElementById('hsModalTitle').textContent = '✏️ Chỉnh Sửa Hồ Sơ Học Sinh';
  document.getElementById('inputStdName').value = s.name || '';
  document.getElementById('inputStdDob').value = s.dob || '';
  document.getElementById('selectStdGender').value = s.gender || 'Nam';
  const prevInput = document.getElementById('inputStdPreviousClass');
  if (prevInput) prevInput.value = s.previousClass || '10C7';

  const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
  populateRolesSelect(roles);
  document.getElementById('selectStdGroup').value = s.group || '1';
  document.getElementById('inputStdPhone').value = s.phone || '';
  document.getElementById('inputStdEmail').value = s.email || '';
  const cccdEl = document.getElementById('inputStdCccd');
  if (cccdEl) cccdEl.value = s.cccd || '';
  document.getElementById('inputStdAddress').value = s.address || '';
  document.getElementById('btnDeleteStdTrigger').style.display = 'inline-block';

  document.getElementById('hsStudentModalOverlay').style.display = 'flex';
}

function closeStudentModal() {
  document.getElementById('hsStudentModalOverlay').style.display = 'none';
  editingStudentId = null;
}

async function submitStudentForm() {
  if (!checkPermission('manage_students')) return;

  const name = document.getElementById('inputStdName').value.trim();
  const dob = document.getElementById('inputStdDob').value.trim();
  const gender = document.getElementById('selectStdGender').value;
  const previousClass = (document.getElementById('inputStdPreviousClass') ? document.getElementById('inputStdPreviousClass').value.trim() : '') || '10C7';
  
  const checkedBoxes = document.querySelectorAll('.std-role-checkbox:checked');
  let selectedRoles = Array.from(checkedBoxes).map(cb => cb.value);
  if (selectedRoles.length === 0) {
    selectedRoles = ['student'];
  }

  const group = parseInt(document.getElementById('selectStdGroup').value) || 1;
  const phone = document.getElementById('inputStdPhone').value.trim();
  const email = document.getElementById('inputStdEmail').value.trim();
  const cccd = document.getElementById('inputStdCccd') ? document.getElementById('inputStdCccd').value.trim() : '';
  const address = document.getElementById('inputStdAddress').value.trim();

  if (!name || !dob) {
    showToast('Vui lòng nhập họ tên và ngày sinh của học sinh!', 'warning');
    return;
  }

  const isEdit = editingStudentId !== null && editingStudentId !== undefined;
  const studentData = {
    id: isEdit ? editingStudentId : Date.now(),
    name,
    dob,
    gender,
    previousClass,
    role: selectedRoles,
    group,
    phone,
    email,
    cccd,
    address
  };

  try {
    let updatedList = [...STUDENTS];
    if (isEdit) {
      const idx = updatedList.findIndex(s => s.id == editingStudentId);
      if (idx !== -1) {
        updatedList[idx] = studentData;
      } else {
        updatedList.push(studentData);
      }
    } else {
      updatedList.push(studentData);
    }

    STUDENTS = updatedList;
    if (typeof saveSharedStudents === 'function') {
      await saveSharedStudents(STUDENTS);
    }

    if (typeof logAction === 'function') {
      logAction(isEdit ? 'Sửa hồ sơ học sinh' : 'Thêm học sinh', `Tên: ${name} (Lớp cũ: ${previousClass}, ${ROLES[role] || role})`);
    }

    showToast(isEdit ? 'Đã cập nhật hồ sơ!' : 'Đã thêm học sinh mới thành công!', 'success');
  } catch (err) {
    console.error('Lỗi khi lưu học sinh:', err);
    showToast('Có lỗi xảy ra khi lưu: ' + err.message, 'error');
  } finally {
    closeStudentModal();
    renderStudentsTable();
  }
}

async function deleteStudentAction() {
  if (editingStudentId === null || editingStudentId === undefined || !checkPermission('manage_students')) return;

  const s = STUDENTS.find(std => std.id == editingStudentId);
  showConfirm('Xác nhận xóa', `Bạn có chắc muốn xóa hồ sơ học sinh ${s ? s.name : ''}?`, async () => {
    try {
      STUDENTS = STUDENTS.filter(std => std.id != editingStudentId);
      if (typeof saveSharedStudents === 'function') {
        await saveSharedStudents(STUDENTS);
      }
      if (typeof logAction === 'function') {
        logAction('Xóa học sinh', `Đã xóa: ${s ? s.name : editingStudentId}`);
      }
      showToast('Đã xóa hồ sơ học sinh!', 'success');
    } catch (err) {
      console.error('Lỗi khi xóa học sinh:', err);
      showToast('Lỗi khi xóa: ' + err.message, 'error');
    } finally {
      closeStudentModal();
      renderStudentsTable();
    }
  });
}

// ============= CSV EXPORT / IMPORT =============
function exportStudentsCsv() {
  if (STUDENTS.length === 0) {
    showToast('Danh sách học sinh trống!', 'warning');
    return;
  }

  let csv = '\uFEFF';
  csv += 'STT,Họ và tên,Ngày sinh,Giới tính,Lớp cũ,Chức vụ,Tổ,Số điện thoại,Email,Địa chỉ\n';

  STUDENTS.forEach((s, idx) => {
    const roleStr = (Array.isArray(s.role) ? s.role : [s.role || 'student']).join(';');
    csv += `"${idx + 1}","${s.name.replace(/"/g, '""')}","${s.dob || ''}","${s.gender || 'Nam'}","${s.previousClass || '10C7'}","${roleStr}","${s.group || 1}","${s.phone || ''}","${s.email || ''}","${(s.address || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Danh_Sach_Hoc_Sinh_11C7_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Đã xuất danh sách học sinh ra CSV!', 'success');
}

function triggerImportCsv() {
  if (!checkPermission('manage_students')) {
    showToast('Bạn không có quyền nhập dữ liệu!', 'error');
    return;
  }
  document.getElementById('csvFileInput').click();
}

function handleCsvFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const content = event.target.result;
    try {
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          STUDENTS = parsed;
          if (typeof saveSharedStudents === 'function') await saveSharedStudents(STUDENTS);
          showToast(`Đã nhập ${parsed.length} học sinh thành công!`, 'success');
          renderStudentsTable();
          return;
        }
      }

      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        showToast('File CSV không có dữ liệu!', 'warning');
        return;
      }

      const newStudents = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 2 && cols[1]) {
          newStudents.push({
            id: Date.now() + i,
            name: cols[1],
            dob: cols[2] || '2010-01-01',
            gender: cols[3] || 'Nam',
            previousClass: cols[4] || '10C7',
            role: cols[5] ? cols[5].split(';') : ['student'],
            group: parseInt(cols[6]) || 1,
            phone: cols[7] || '',
            email: cols[8] || '',
            address: cols[9] || ''
          });
        }
      }

      if (newStudents.length > 0) {
        STUDENTS = newStudents;
        if (typeof saveSharedStudents === 'function') await saveSharedStudents(STUDENTS);
        showToast(`Đã nhập ${newStudents.length} học sinh từ CSV thành công!`, 'success');
        renderStudentsTable();
      }
    } catch (err) {
      console.error('CSV parse error', err);
      showToast('Lỗi khi đọc file CSV/JSON!', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}