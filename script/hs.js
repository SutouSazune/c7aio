let editingStudentId = null;
let isStudentsDataSynced = false; // Cờ để chặn lưu dữ liệu khi chưa đồng bộ

window.addEventListener('load', () => {
  if (!isAdmin()) {
    // Dùng alert ở đây là ok vì chưa load xong UI, nhưng tốt nhất là redirect luôn
    window.location.href = '../index.html';
    return;
  }
  
  // Hiển thị dữ liệu mặc định ngay lập tức (tránh bị trống bảng khi chờ mạng)
  renderStudentsTable(STUDENTS);

  // Kết nối Firebase để lấy dữ liệu realtime
  onSharedStudentsChanged((data) => {
    STUDENTS = data || []; // Cập nhật biến toàn cục
    isStudentsDataSynced = true; // Đánh dấu đã nhận dữ liệu từ server
    renderStudentsTable(STUDENTS);
  });
});

// Helper: Debounce function (Tránh lag khi gõ tìm kiếm)
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Override searchStudents với debounce
const originalSearch = searchStudents;
searchStudents = debounce(originalSearch, 300);

function renderStudentsTable(data = STUDENTS) {
  const tbody = document.getElementById('studentsTableBody');
  
  const rows = data.map((s, index) => {
    // Xử lý hiển thị nhiều role
    const roles = Array.isArray(s.role) ? s.role : [s.role || 'student'];
    const roleBadges = roles.map(r => 
      `<span style="display:inline-block; background: #eee; padding: 2px 8px; border-radius: 10px; font-size: 0.85rem; margin: 2px;">${ROLES[r] || 'Thành viên'}</span>`
    ).join('');

    return `
    <tr style="animation: fadeInUp 0.5s var(--ease-spring) forwards; animation-delay: ${index * 0.04}s; opacity: 0; transform: translateY(20px);">
      <td>${index + 1}</td>
      <td style="font-weight: 600;">${s.name}</td>
      <td>${roleBadges}</td>
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
    `;
  }).join('');

  // Inject keyframes nếu chưa có
  if (!document.getElementById('row-animation-style')) {
    const style = document.createElement('style');
    style.id = 'row-animation-style';
    style.innerHTML = `
      /* Keyframes đã được chuyển sang hub.js để dùng chung */
      /* Giữ lại block này để tránh lỗi logic nếu có check id */
    `;
    document.head.appendChild(style);
  }

  tbody.innerHTML = rows;
}

function searchStudents() { // Hàm gốc, sẽ được debounce ở trên
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
  if (!document.getElementById('roleSelect')) {
    injectSelect2ToModal();
  }
    
  updateSelect2Options();

  // Khởi tạo/Refresh Select2 ngay tại đây để đảm bảo nó nhận diện được các options vừa thêm
  $('#roleSelect').select2({
    placeholder: 'Chọn chức vụ...',
    allowClear: true
  });
  
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

function injectSelect2ToModal() {
  const formBody = document.querySelector('#studentModal .modal-body');
  const roleDiv = document.createElement('div');
  roleDiv.className = 'form-group';
  roleDiv.style.marginBottom = '15px';
  roleDiv.innerHTML = `
    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Chức vụ (*)</label>
    <select id="roleSelect" multiple="multiple" style="width: 100%;">
    </select>
  `;
  // Chèn vào đầu form
  formBody.insertBefore(roleDiv, formBody.firstChild);
}

function updateSelect2Options() {
  const select = document.getElementById('roleSelect');
  if (!select) return;

  // Tạo các option cho select
  select.innerHTML = '';
  Object.keys(ROLES).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.text = ROLES[key];
    select.appendChild(option);
  });
}

function fillForm(s) {
  // Fill Roles
  const select = document.getElementById('roleSelect');
  const userRoles = Array.isArray(s.role) ? s.role : [s.role || 'student']; 
  
  $(select).val(userRoles).trigger('change');

  // Fill other fields
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

  // Reset select2
  $('#roleSelect').val(null).trigger('change');
  document.getElementById('stdEthnicity').value = 'Kinh';
}

function saveStudent() {
  // FIX SYNC: Chặn lưu nếu chưa đồng bộ lần đầu
  if (!isStudentsDataSynced) {
    showToast('⏳ Đang đồng bộ dữ liệu, vui lòng đợi...', 'info');
    return;
  }

  const name = document.getElementById('stdName').value.trim();
  if (!name) {
    showToast('Vui lòng nhập họ tên!', 'error');
    return;
  }

  // FIX SYNC: Client-side Guard
  if (!STUDENTS || STUDENTS.length === 0) {
    console.warn('⚠️ Client Guard: Chặn lưu danh sách học sinh rỗng.');
    return;
  }

  // Get selected roles
  let selectedRoles = $('#roleSelect').val();
  if (!selectedRoles || selectedRoles.length === 0) {
    selectedRoles = ['student'];
  }

  const studentData = {
    id: editingStudentId || Date.now(),
    name: name,
    role: selectedRoles, // Lưu mảng role
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
  };

  if (editingStudentId) {
    const index = STUDENTS.findIndex(s => s.id === editingStudentId);
    if (index !== -1) STUDENTS[index] = studentData;
  } else {
    STUDENTS.push(studentData);
  }

  // Lưu lên Firebase thay vì localStorage
  saveSharedStudents(STUDENTS);
  const roleNames = selectedRoles.map(r => ROLES[r]).join(', ');
  logAction(editingStudentId ? 'Sửa hồ sơ' : 'Thêm học sinh', `Học sinh: ${name} - Chức vụ: ${roleNames}`);
  showToast(editingStudentId ? 'Đã cập nhật hồ sơ!' : 'Đã thêm học sinh mới!', 'success');
  // renderStudentsTable(); // Không cần gọi thủ công vì onSharedStudentsChanged sẽ tự chạy
  closeStudentModal();
}

function deleteStudent() {
  // FIX SYNC: Chặn lưu nếu chưa đồng bộ lần đầu
  if (!isStudentsDataSynced) {
    showToast('⏳ Đang đồng bộ dữ liệu...', 'info');
    return;
  }

  if (!editingStudentId) return;

  if (confirm('Bạn có chắc chắn muốn xóa hồ sơ học sinh này? Hành động này không thể hoàn tác!')) {
    const s = STUDENTS.find(st => st.id === editingStudentId);
    logAction('Xóa học sinh', `Đã xóa hồ sơ của: ${s ? s.name : 'Unknown'}`);
    STUDENTS = STUDENTS.filter(s => s.id !== editingStudentId);
    saveSharedStudents(STUDENTS);
    showToast('Đã xóa học sinh thành công', 'success');
    closeStudentModal();
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
}