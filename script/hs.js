/**
 * C7AIO Student Profiles Management Controller
 * Quản lý hồ sơ học sinh, Nhập / Xuất file CSV, Tìm kiếm, Phân quyền & Đồng bộ
 */

let editingStudentId = null;
let searchQuery = '';

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

  renderStudentsTable();

  // Lắng nghe Realtime
  if (typeof onSharedStudentsChanged === 'function') {
    onSharedStudentsChanged((data) => {
      if (data && data.length > 0) {
        STUDENTS = data;
        renderStudentsTable();
      }
    });
  }
});

function handleStudentSearch(val) {
  searchQuery = (val || '').toLowerCase().trim();
  renderStudentsTable();
}

function getFilteredStudents() {
  if (!searchQuery) return STUDENTS;
  return STUDENTS.filter(s => {
    const matchName = (s.name || '').toLowerCase().includes(searchQuery);
    const matchPhone = (s.phone || '').includes(searchQuery);
    const matchEmail = (s.email || '').toLowerCase().includes(searchQuery);
    const matchPrev = (s.previousClass || '').toLowerCase().includes(searchQuery);
    return matchName || matchPhone || matchEmail || matchPrev;
  });
}

function renderStudentsTable() {
  const tbody = document.getElementById('hsStudentsTableBody');
  if (!tbody) return;

  const list = getFilteredStudents();

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Không tìm thấy học sinh nào phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  const canEdit = checkPermission('manage_students');

  tbody.innerHTML = list.map((s, idx) => {
    const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
    const roleBadges = roles.map(r => `
      <span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#6366f1'}; font-size: 0.75rem;">
        ${ROLES[r] || r}
      </span>
    `).join(' ');

    const prevClassBadge = `<span class="user-role-pill" style="background: ${s.previousClass === '10C9' ? '#ec4899' : '#0284c7'}; font-size: 0.75rem;">${escapeHtml(s.previousClass || '10C7')}</span>`;

    const phoneLink = s.phone ? `<a href="tel:${s.phone}" class="hs-quick-btn">📞 ${s.phone}</a>` : '';
    const emailLink = s.email ? `<a href="mailto:${s.email}" class="hs-quick-btn">✉️ Email</a>` : '';

    return `
      <tr class="hs-student-row">
        <td>${idx + 1}</td>
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
        <td>${s.gender || 'Nam'}</td>
        <td>${prevClassBadge}</td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${phoneLink}
            ${emailLink}
          </div>
        </td>
        <td>Tổ ${s.group || 1}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            ${canEdit ? `
              <button class="btn-action-pill" onclick="openEditStudentModal(${s.id})">✏️ Sửa</button>
            ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">Xem</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
  document.getElementById('selectStdRole').value = 'student';
  document.getElementById('selectStdGroup').value = '1';
  document.getElementById('inputStdPhone').value = '';
  document.getElementById('inputStdEmail').value = '';
  document.getElementById('inputStdAddress').value = '';
  document.getElementById('btnDeleteStdTrigger').style.display = 'none';

  document.getElementById('hsStudentModalOverlay').style.display = 'flex';
}

function openEditStudentModal(studentId) {
  const s = STUDENTS.find(std => std.id === studentId);
  if (!s) return;

  editingStudentId = studentId;
  document.getElementById('hsModalTitle').textContent = '✏️ Chỉnh Sửa Hồ Sơ Học Sinh';
  document.getElementById('inputStdName').value = s.name || '';
  document.getElementById('inputStdDob').value = s.dob || '';
  document.getElementById('selectStdGender').value = s.gender || 'Nam';
  const prevInput = document.getElementById('inputStdPreviousClass');
  if (prevInput) prevInput.value = s.previousClass || '10C7';

  const primaryRole = Array.isArray(s.role) ? (s.role[0] || 'student') : (s.role || 'student');
  document.getElementById('selectStdRole').value = primaryRole;
  document.getElementById('selectStdGroup').value = s.group || '1';
  document.getElementById('inputStdPhone').value = s.phone || '';
  document.getElementById('inputStdEmail').value = s.email || '';
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
  const role = document.getElementById('selectStdRole').value;
  const group = parseInt(document.getElementById('selectStdGroup').value) || 1;
  const phone = document.getElementById('inputStdPhone').value.trim();
  const email = document.getElementById('inputStdEmail').value.trim();
  const address = document.getElementById('inputStdAddress').value.trim();

  if (!name || !dob) {
    showToast('Vui lòng nhập họ tên và ngày sinh của học sinh!', 'warning');
    return;
  }

  const isEdit = !!editingStudentId;
  const studentData = {
    id: isEdit ? editingStudentId : Date.now(),
    name,
    dob,
    gender,
    previousClass,
    role: [role],
    group,
    phone,
    email,
    address
  };

  let updatedList = [...STUDENTS];
  if (isEdit) {
    const idx = updatedList.findIndex(s => s.id === editingStudentId);
    if (idx !== -1) updatedList[idx] = studentData;
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
  closeStudentModal();
  renderStudentsTable();
}

async function deleteStudentAction() {
  if (!editingStudentId || !checkPermission('manage_students')) return;

  const s = STUDENTS.find(std => std.id === editingStudentId);
  showConfirm('Xác nhận xóa', `Bạn có chắc muốn xóa hồ sơ học sinh ${s ? s.name : ''}?`, async () => {
    STUDENTS = STUDENTS.filter(std => std.id !== editingStudentId);
    if (typeof saveSharedStudents === 'function') {
      await saveSharedStudents(STUDENTS);
    }
    if (typeof logAction === 'function') {
      logAction('Xóa học sinh', `Đã xóa: ${s ? s.name : editingStudentId}`);
    }
    showToast('Đã xóa hồ sơ học sinh!', 'success');
    closeStudentModal();
    renderStudentsTable();
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