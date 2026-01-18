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
    if (data) {
      STUDENTS = data; // Cập nhật biến toàn cục
      renderStudentsTable(STUDENTS);
    }
  });
});

function renderStudentsTable(data = STUDENTS) {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = data.map((s, index) => `
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

  modal.style.display = 'flex';
}

function closeStudentModal() {
  document.getElementById('studentModal').style.display = 'none';
}

function fillForm(s) {
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
  // renderStudentsTable(); // Không cần gọi thủ công vì onSharedStudentsChanged sẽ tự chạy
  closeStudentModal();
}

function deleteStudent() {
  if (!editingStudentId) return;

  if (confirm('Bạn có chắc chắn muốn xóa hồ sơ học sinh này? Hành động này không thể hoàn tác!')) {
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