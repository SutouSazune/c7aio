/**
 * C7AIO Statistics & Analytics Controller
 * Tính toán tỷ lệ hoàn thành, Vẽ biểu đồ tròn SVG & Bảng tiến độ toàn lớp
 */

let matrixFilterQuery = '';

window.addEventListener('load', () => {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = buildUrl('login.html');
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = user.name;

  renderStatistics();

  // Lắng nghe Realtime
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged(() => renderStatistics());
  }

  if (typeof onSharedStudentsChanged === 'function') {
    onSharedStudentsChanged((data) => {
      if (data && data.length > 0) {
        STUDENTS = data;
        renderStatistics();
      }
    });
  }
});

function renderStatistics() {
  const user = getCurrentUser();
  if (!user) return;

  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const isAdm = isAdmin();

  // Phân định chế độ xem: Toàn lớp nếu là Admin/Ban cán sự, hoặc Cá nhân nếu là Học sinh
  const subtitle = document.getElementById('statsSubtitle');
  const title = document.getElementById('statsSubjectTitle');
  if (isAdm) {
    if (title) title.textContent = 'Tiến Độ Toàn Lớp 10C7';
    if (subtitle) subtitle.textContent = `Tổng hợp số liệu của tất cả ${STUDENTS.length} học sinh`;
  } else {
    if (title) title.textContent = `Tiến Độ Học Tập - ${user.name}`;
    if (subtitle) subtitle.textContent = `Dữ liệu nhiệm vụ được giao cho bạn (Tổ ${user.group || 1})`;
  }

  const relevantTasks = tasks.filter(t => {
    if (isAdm) return true;
    if (!t.assignedStudents || t.assignedStudents.length === 0) return true;
    return t.assignedStudents.includes(user.id);
  });

  const totalCount = relevantTasks.length;
  let doneCount = 0;

  if (isAdm) {
    // Tính trung bình toàn lớp
    let totalAssignments = 0;
    let totalCompletions = 0;
    tasks.forEach(t => {
      const assignedNum = (t.assignedStudents && t.assignedStudents.length > 0) ? t.assignedStudents.length : STUDENTS.length;
      const completedNum = t.completions ? Object.values(t.completions).filter(Boolean).length : 0;
      totalAssignments += assignedNum;
      totalCompletions += completedNum;
    });
    doneCount = totalAssignments > 0 ? Math.round((totalCompletions / totalAssignments) * totalCount) : 0;
  } else {
    doneCount = relevantTasks.filter(t => t.completions && t.completions[user.id]).length;
  }

  const pendingCount = Math.max(0, totalCount - doneCount);
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Cập nhật 4 thẻ thống kê
  document.getElementById('statTotalCount').textContent = totalCount;
  document.getElementById('statDoneCount').textContent = doneCount;
  document.getElementById('statPendingCount').textContent = pendingCount;
  document.getElementById('statPercentValue').textContent = `${percent}%`;

  // Cập nhật Vòng tròn SVG Progress
  const circle = document.getElementById('circleProgress');
  const percentDisplay = document.getElementById('progressValDisplay');
  const assessText = document.getElementById('ringAssessmentText');

  if (circle) {
    const circumference = 2 * Math.PI * 75; // r=75 => ~471.24
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  if (percentDisplay) percentDisplay.textContent = `${percent}%`;

  if (assessText) {
    if (percent === 100) assessText.textContent = '🌟 Xuất sắc! Tất cả nhiệm vụ đã được hoàn thành.';
    else if (percent >= 75) assessText.textContent = '🚀 Rất tốt! Tiến độ đang ở mức cao.';
    else if (percent >= 50) assessText.textContent = '💪 Khá tốt! Cố gắng hoàn thành các nhiệm vụ còn lại.';
    else assessText.textContent = '⚠️ Cần đẩy nhanh tiến độ làm bài tập!';
  }

  // Thống kê theo phân loại
  renderCategoryBars(relevantTasks, user, isAdm);

  // Bảng tiến độ học sinh toàn lớp (Chỉ hiện cho Ban cán sự / Admin)
  const matrixSection = document.getElementById('classMatrixSection');
  if (matrixSection) {
    if (isAdm || checkPermission('manage_tasks')) {
      matrixSection.style.display = 'block';
      renderClassMatrixTable(tasks);
    } else {
      matrixSection.style.display = 'none';
    }
  }
}

function renderCategoryBars(tasks, user, isAdm) {
  const container = document.getElementById('categoryBarsList');
  if (!container) return;

  const categories = ['Bài tập', 'Học tập', 'Lao động', 'Đoàn / Đội', 'Quỹ lớp', 'Khác'];
  const catColors = {
    'Bài tập': '#6366f1',
    'Học tập': '#3b82f6',
    'Lao động': '#10b981',
    'Đoàn / Đội': '#ef4444',
    'Quỹ lớp': '#f59e0b',
    'Khác': '#8b5cf6'
  };

  container.innerHTML = categories.map(cat => {
    const catTasks = tasks.filter(t => (t.category || 'Bài tập') === cat);
    const catTotal = catTasks.length;
    let catDone = 0;

    if (isAdm) {
      catTasks.forEach(t => {
        const comp = t.completions ? Object.values(t.completions).filter(Boolean).length : 0;
        const ass = (t.assignedStudents && t.assignedStudents.length > 0) ? t.assignedStudents.length : STUDENTS.length;
        if (ass > 0 && comp === ass) catDone++;
      });
    } else {
      catDone = catTasks.filter(t => t.completions && t.completions[user.id]).length;
    }

    const catPercent = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
    const color = catColors[cat] || '#6366f1';

    return `
      <div class="cat-bar-row">
        <div class="cat-bar-header">
          <span>${cat} (${catDone}/${catTotal})</span>
          <strong>${catPercent}%</strong>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width: ${catPercent}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderClassMatrixTable(tasks) {
  const table = document.getElementById('classMatrixTable');
  if (!table) return;

  let studentList = STUDENTS;
  if (matrixFilterQuery) {
    studentList = studentList.filter(s => s.name.toLowerCase().includes(matrixFilterQuery));
  }

  const latestTasks = tasks.slice(0, 8); // Lấy tối đa 8 nhiệm vụ gần nhất

  let html = `
    <thead>
      <tr>
        <th style="min-width: 180px;">Học sinh</th>
        <th>Tổ</th>
        <th>Tiến độ</th>
        ${latestTasks.map(t => `<th style="font-size: 0.8rem; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
  `;

  html += studentList.map(s => {
    const sTasks = tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(s.id));
    const sDone = sTasks.filter(t => t.completions && t.completions[s.id]).length;
    const sPercent = sTasks.length > 0 ? Math.round((sDone / sTasks.length) * 100) : 0;

    const taskChecks = latestTasks.map(t => {
      const isAssigned = !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(s.id);
      if (!isAssigned) return '<td style="text-align: center; color: var(--text-muted);">-</td>';
      const isChecked = t.completions && t.completions[s.id];
      return `<td style="text-align: center; font-size: 1.1rem;">${isChecked ? '✅' : '⏳'}</td>`;
    }).join('');

    return `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>Tổ ${s.group || 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="task-badge" style="background: var(--primary-light); color: var(--primary);">${sDone}/${sTasks.length}</span>
            <small style="font-weight: 700;">${sPercent}%</small>
          </div>
        </td>
        ${taskChecks}
      </tr>
    `;
  }).join('');

  html += `</tbody>`;
  table.innerHTML = html;
}

function filterMatrixStudents(val) {
  matrixFilterQuery = (val || '').toLowerCase().trim();
  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  renderClassMatrixTable(tasks);
}

function exportStatsToCsv() {
  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  let csv = '\uFEFF';
  csv += 'Họ và tên,Tổ,Chức vụ,Tổng nhiệm vụ,Đã hoàn thành,Tỷ lệ (%)\n';

  STUDENTS.forEach(s => {
    const sTasks = tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(s.id));
    const sDone = sTasks.filter(t => t.completions && t.completions[s.id]).length;
    const sPercent = sTasks.length > 0 ? Math.round((sDone / sTasks.length) * 100) : 0;
    const roleText = (Array.isArray(s.role) ? s.role : [s.role || 'student']).join(';');
    csv += `"${s.name}","Tổ ${s.group || 1}","${roleText}",${sTasks.length},${sDone},${sPercent}%\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao_Cao_Tien_Do_10C7_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Đã xuất báo cáo tiến độ ra CSV!', 'success');
}
