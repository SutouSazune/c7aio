let editingStudentId = null;

window.addEventListener('load', () => {
  if (!isAdmin()) {
    alert('Chỉ Admin mới có quyền truy cập trang này!');
    window.location.href = '../index.html';
    return;
  }
  
  // Hiển thị dữ liệu mặc định ngay lập tức (tránh bị trống bảng khi chờ mạng)
  renderStudentsTable(STUDENTS);

  // Kết nối Firebase để lấy dữ liệu realtime
  onSharedStudentsChanged((data) => {
    STUDENTS = data || []; // Cập nhật biến toàn cục
    renderStudentsTable(STUDENTS);
  });
});

function renderStudentsTable(data = STUDENTS) {
  const tbody = document.getElementById('studentsTableBody');
  
  const rows = data.map((s, index) => `
    <tr>
      <td>${index + 1}</td>
      <td style="font-weight: 600;">${s.name}</td>
      <td>${formatDate(s.dob)}</td>
      <td>${s.gender || '-'}</td>
      <td>
        ${s.phone ? `📞 ${s.phone}<br>` : ''}
        ${s.email ? `✉️ ${s.email}` : ''}
      </td>
      <td>
        <button class="edit-btn" onclick="openStudentModal(${s.id})">✏️ Sửa</button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = rows;
}

function searchStudents() {
  const term = document.getElementById('searchInput').value.toLowerCase();
  const filtered = STUDENTS.filter(s => 
    s.name.toLowerCase().includes(term) || 
    (s.phone && s.phone.includes(term)) ||
    (s.email && s.email.toLowerCase().includes(term))
  );
  renderStudentsTable(filtered);
}

function openStudentModal(id = null) {
  const modal = document.getElementById('studentModal');
  const title = document.getElementById('modalTitle');
  const btnDelete = document.getElementById('btnDeleteStudent');
  
  // Inject Role Select if missing
  if (!document.getElementById('stdRole')) {
    injectRoleSelectToModal();
  }
  
  editingStudentId = id;

  if (id) {
    title.textContent = '✏️ Chỉnh Sửa Hồ Sơ';
    btnDelete.style.display = 'block';
    const s = STUDENTS.find(st => st.id === id);
    if (s) fillForm(s);
  } else {
    title.textContent = '➕ Thêm Học Sinh Mới';
    btnDelete.style.display = 'none';
    clearForm();
  }

  // ROOT FIX: Xử lý scroll modal
  if (window.innerWidth < 768) {
    modal.style.alignItems = 'flex-start';
    modal.style.overflowY = 'auto';
    modal.style.paddingTop = '10px';
  }
  document.body.style.overflow = 'hidden';
  modal.style.display = 'flex';
}

function closeStudentModal() {
  document.getElementById('studentModal').style.display = 'none';
  document.body.style.overflow = ''; // Restore scroll
}

function injectRoleSelectToModal() {
  const formBody = document.querySelector('#studentModal .modal-body');
  const roleDiv = document.createElement('div');
  roleDiv.className = 'form-group';
  roleDiv.style.marginBottom = '15px';
  roleDiv.innerHTML = `
    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Chức vụ (*)</label>
    <select id="stdRole" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></select>
  `;
  // Chèn vào đầu form
  formBody.insertBefore(roleDiv, formBody.firstChild);
  updateRoleSelectOptions();
}

function updateRoleSelectOptions() {
  const select = document.getElementById('stdRole');
  if (!select) return;
  select.innerHTML = Object.keys(ROLES).map(key => `<option value="${key}">${ROLES[key]}</option>`).join('');
}

function fillForm(s) {
  if (document.getElementById('stdRole')) document.getElementById('stdRole').value = s.role || 'student';
  document.getElementById('stdName').value = s.name || '';
  document.getElementById('stdDob').value = s.dob || '';
  document.getElementById('stdGender').value = s.gender || 'Nam';
  document.getElementById('stdEthnicity').value = s.ethnicity || 'Kinh';
  document.getElementById('stdCccd').value = s.cccd || '';
  document.getElementById('stdPhone').value = s.phone || '';
  document.getElementById('stdEmail').value = s.email || '';
  document.getElementById('stdAddress').value = s.address || '';
  document.getElementById('stdHometown').value = s.hometown || '';
  document.getElementById('stdFatherName').value = s.fatherName || '';
  document.getElementById('stdFatherPhone').value = s.fatherPhone || '';
  document.getElementById('stdMotherName').value = s.motherName || '';
  document.getElementById('stdMotherPhone').value = s.motherPhone || '';
}

function clearForm() {
  document.querySelectorAll('input').forEach(i => i.value = '');
  document.getElementById('stdGender').value = 'Nam';
  if (document.getElementById('stdRole')) document.getElementById('stdRole').value = 'student';
  document.getElementById('stdEthnicity').value = 'Kinh';
}

function saveStudent() {
  const name = document.getElementById('stdName').value.trim();
  if (!name) {
    alert('Vui lòng nhập họ tên!');
    return;
  }

  const studentData = {
    id: editingStudentId || Date.now(),
    name: name,
    role: document.getElementById('stdRole').value,
    dob: document.getElementById('stdDob').value,
    gender: document.getElementById('stdGender').value,
    ethnicity: document.getElementById('stdEthnicity').value,
    cccd: document.getElementById('stdCccd').value,
    phone: document.getElementById('stdPhone').value,
    email: document.getElementById('stdEmail').value,
    address: document.getElementById('stdAddress').value,
    hometown: document.getElementById('stdHometown').value,
    fatherName: document.getElementById('stdFatherName').value,
    fatherPhone: document.getElementById('stdFatherPhone').value,
    motherName: document.getElementById('stdMotherName').value,
    motherPhone: document.getElementById('stdMotherPhone').value,
    role: 'student'
  };

  if (editingStudentId) {
    const index = STUDENTS.findIndex(s => s.id === editingStudentId);
    if (index !== -1) STUDENTS[index] = studentData;
  } else {
    STUDENTS.push(studentData);
  }

  // Lưu lên Firebase thay vì localStorage
  saveSharedStudents(STUDENTS);
  logAction(editingStudentId ? 'Sửa hồ sơ' : 'Thêm học sinh', `Học sinh: ${name} - Chức vụ: ${ROLES[studentData.role]}`);
  // renderStudentsTable(); // Không cần gọi thủ công vì onSharedStudentsChanged sẽ tự chạy
  closeStudentModal();
}

function deleteStudent() {
  if (!editingStudentId) return;

  if (confirm('Bạn có chắc chắn muốn xóa hồ sơ học sinh này? Hành động này không thể hoàn tác!')) {
    const s = STUDENTS.find(st => st.id === editingStudentId);
    logAction('Xóa học sinh', `Đã xóa hồ sơ của: ${s ? s.name : 'Unknown'}`);
    STUDENTS = STUDENTS.filter(s => s.id !== editingStudentId);
    saveSharedStudents(STUDENTS);
    closeStudentModal();
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
}