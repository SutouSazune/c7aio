/**
 * C7AIO Student Profiles Management Controller
 */

let editingStudentId = null;

window.addEventListener('load', () => {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = buildUrl('login.html');
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = user.name;

  // Render initial table
  renderStudentsTable();

  // Search filter
  const searchInput = document.getElementById('hsSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      renderStudentsTable(q);
    });
  }

  // Realtime Firebase sync
  if (typeof onSharedStudentsChanged === 'function') {
    onSharedStudentsChanged((updatedStudents) => {
      if (updatedStudents && updatedStudents.length > 0) {
        STUDENTS = updatedStudents;
        renderStudentsTable(searchInput ? searchInput.value.toLowerCase().trim() : '');
      }
    });
  }
});

function renderStudentsTable(filterQuery = '') {
  const tbody = document.getElementById('hsStudentsTableBody');
  if (!tbody) return;

  const canEdit = checkPermission('manage_students');
  const btnAdd = document.getElementById('btnOpenAddStudent');
  if (btnAdd) btnAdd.style.display = canEdit ? 'inline-flex' : 'none';

  let list = STUDENTS || [];
  if (filterQuery) {
    list = list.filter(s => 
      s.name.toLowerCase().includes(filterQuery) ||
      (s.phone && s.phone.includes(filterQuery)) ||
      (s.email && s.email.toLowerCase().includes(filterQuery)) ||
      (s.cccd && s.cccd.includes(filterQuery)) ||
      (s.dob && s.dob.includes(filterQuery)) ||
      (s.address && s.address.toLowerCase().includes(filterQuery))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-sub);">
          <span>🔍 Không tìm thấy học sinh nào phù hợp.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((s, idx) => {
    const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
    const roleBadges = roles.map(r => `
      <span class="user-role-pill" style="background: ${ROLE_COLORS[r] || '#64748b'}">
        ${ROLES[r] || r}
      </span>
    `).join(' ');

    const prevClassBadge = s.previousClass 
      ? `<span style="font-size: 0.8rem; font-weight: 700; background: rgba(99, 102, 241, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 4px;">${escapeHtml(s.previousClass)}</span>`
      : '-';

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

  const primaryRole = Array.isArray(s.role) ? (s.role[0] || 'student') : (s.role || 'student');
  document.getElementById('selectStdRole').value = primaryRole;
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
  const role = document.getElementById('selectStdRole').value;
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
    role: [role],
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

// ============= CSV IMPORT / EXPORT =============
function exportStudentsCsv() {
  const headers = ['STT', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Lớp cũ', 'Chức vụ', 'Tổ', 'Số điện thoại', 'Email', 'CCCD', 'Địa chỉ'];
  const rows = (STUDENTS || []).map((s, idx) => [
    idx + 1,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    s.dob || '',
    s.gender || 'Nam',
    s.previousClass || '10C7',
    Array.isArray(s.role) ? s.role.join(';') : (s.role || 'student'),
    s.group || 1,
    s.phone || '',
    s.email || '',
    s.cccd || '',
    `"${(s.address || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Danh_Sach_10C7_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('📥 Đã tải xuống danh sách học sinh (CSV)!', 'success');
}

function triggerImportCsv() {
  if (!checkPermission('manage_students')) {
    showToast('Bạn không có quyền nhập dữ liệu!', 'error');
    return;
  }
  const fileInput = document.getElementById('hsCsvFileInput');
  if (fileInput) fileInput.click();
}

function handleCsvImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        showToast('File CSV không có dữ liệu!', 'warning');
        return;
      }

      const newStudents = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2 && cols[1]) {
          newStudents.push({
            id: i,
            name: cols[1],
            dob: cols[2] || '2010-01-01',
            gender: cols[3] || 'Nam',
            previousClass: cols[4] || '10C7',
            role: cols[5] ? cols[5].split(';') : ['student'],
            group: parseInt(cols[6]) || 1,
            phone: cols[7] || '',
            email: cols[8] || '',
            cccd: cols[9] || '',
            address: cols[10] || ''
          });
        }
      }

      if (newStudents.length > 0) {
        STUDENTS = newStudents;
        if (typeof saveSharedStudents === 'function') {
          await saveSharedStudents(newStudents);
        } else {
          localStorage.setItem('c7aio_students_cache', JSON.stringify(newStudents));
        }
        if (typeof logAction === 'function') {
          logAction('Hồ sơ học sinh', `Nhập ${newStudents.length} học sinh từ file CSV`);
        }
        showToast(`✅ Đã nhập thành công ${newStudents.length} học sinh!`, 'success');
        renderStudentsTable();
      }
    } catch (err) {
      showToast('Lỗi khi đọc file CSV: ' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
}
