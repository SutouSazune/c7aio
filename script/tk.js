/**
 * C7AIO Statistics & Analytics Controller
 * Báo cáo tiến độ, Biểu đồ vòng, Phân loại nhiệm vụ, Ma trận toàn lớp & Xuất CSV
 */

let currentUser = null;
let tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
let matrixSearchFilter = '';

window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = buildUrl('login.html');
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = currentUser.name;

  updateHeaders();
  renderAllStats();

  // Lắng nghe Realtime
  if (typeof onSharedTasksChanged === 'function') {
    onSharedTasksChanged((data) => {
      tasks = data || [];
      renderAllStats();
    });
  }

  if (typeof onSharedStudentsChanged === 'function') {
    onSharedStudentsChanged((data) => {
      if (data && data.length > 0) {
        STUDENTS = data;
        renderAllStats();
      }
    });
  }
});

function updateHeaders() {
  const title = document.getElementById('statsSubjectTitle');
  const sub = document.getElementById('statsSubtitle');
  if (isAdmin()) {
    if (title) title.textContent = 'Tổng Quan Học Tập Toàn Lớp';
    if (sub) sub.textContent = `Thống kê cho ${STUDENTS.length} học sinh • Quyền Quản trị viên`;
  } else {
    if (title) title.textContent = `Tiến Độ Học Tập: ${currentUser.name}`;
    if (sub) sub.textContent = `Cập nhật theo các nhiệm vụ được giao cho bạn`;
    
    // Hide class-wide matrix section for regular students
    const matrixSec = document.getElementById('classMatrixSection');
    if (matrixSec) matrixSec.style.display = 'none';
  }
}

function renderAllStats() {
  renderOverviewCards();
  renderProgressRing();
  renderCategoryBars();
  if (isAdmin()) {
    renderClassMatrix();
  }
}

// ============= OVERVIEW & RING =============
function renderOverviewCards() {
  const isAdm = isAdmin();
  const relevantTasks = isAdm
    ? tasks
    : tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(currentUser.id));

  const total = relevantTasks.length;
  let done = 0;

  if (isAdm) {
    // Với Admin: task hoàn thành nếu toàn bộ học sinh được giao đã check-in
    done = relevantTasks.filter(t => {
      const assigned = t.assignedStudents && t.assignedStudents.length > 0 ? t.assignedStudents : STUDENTS.map(s => s.id);
      const completions = t.completions || {};
      return assigned.every(sId => completions[sId]);
    }).length;
  } else {
    done = relevantTasks.filter(t => t.completions && t.completions[currentUser.id]).length;
  }

  const pending = Math.max(0, total - done);
  const percent = total > 0 ? Math.round((done / total) * 100) : 100;

  document.getElementById('statTotalCount').textContent = total;
  document.getElementById('statDoneCount').textContent = done;
  document.getElementById('statPendingCount').textContent = pending;
  document.getElementById('statPercentValue').textContent = `${percent}%`;
}

function renderProgressRing() {
  const isAdm = isAdmin();
  const relevantTasks = isAdm
    ? tasks
    : tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(currentUser.id));

  const total = relevantTasks.length;
  const done = isAdm
    ? relevantTasks.filter(t => {
        const assigned = t.assignedStudents && t.assignedStudents.length > 0 ? t.assignedStudents : STUDENTS.map(s => s.id);
        const completions = t.completions || {};
        return assigned.every(sId => completions[sId]);
      }).length
    : relevantTasks.filter(t => t.completions && t.completions[currentUser.id]).length;

  const percent = total > 0 ? Math.round((done / total) * 100) : 100;

  document.getElementById('progressValDisplay').textContent = `${percent}%`;

  const circle = document.getElementById('circleProgress');
  if (circle) {
    const radius = 75;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  const assessmentEl = document.getElementById('ringAssessmentText');
  if (assessmentEl) {
    if (percent >= 80) {
      assessmentEl.textContent = '🌟 Xuất sắc! Tiến độ học tập rất tốt.';
      assessmentEl.style.color = '#10b981';
    } else if (percent >= 50) {
      assessmentEl.textContent = '👍 Khá tốt! Cần hoàn thành các bài tập còn lại.';
      assessmentEl.style.color = '#f59e0b';
    } else {
      assessmentEl.textContent = '⚠️ Cần chú ý! Có nhiều nhiệm vụ chưa nộp.';
      assessmentEl.style.color = '#ef4444';
    }
  }
}

// ============= CATEGORY PROGRESS BARS =============
function renderCategoryBars() {
  const container = document.getElementById('categoryBarsList');
  if (!container) return;

  const categories = ['Bài tập', 'Học tập', 'Lao động', 'Đoàn / Đội', 'Quỹ lớp', 'Khác'];
  const catColors = {
    'Bài tập': 'linear-gradient(90deg, #3b82f6, #6366f1)',
    'Học tập': 'linear-gradient(90deg, #8b5cf6, #ec4899)',
    'Lao động': 'linear-gradient(90deg, #10b981, #06b6d4)',
    'Đoàn / Đội': 'linear-gradient(90deg, #f59e0b, #ef4444)',
    'Quỹ lớp': 'linear-gradient(90deg, #14b8a6, #10b981)',
    'Khác': 'linear-gradient(90deg, #64748b, #94a3b8)'
  };

  const isAdm = isAdmin();
  const relevantTasks = isAdm
    ? tasks
    : tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(currentUser.id));

  container.innerHTML = categories.map(cat => {
    const catTasks = relevantTasks.filter(t => (t.category || 'Bài tập') === cat);
    if (catTasks.length === 0) return '';

    const catTotal = catTasks.length;
    const catDone = isAdm
      ? catTasks.filter(t => {
          const assigned = t.assignedStudents && t.assignedStudents.length > 0 ? t.assignedStudents : STUDENTS.map(s => s.id);
          return assigned.every(sId => t.completions && t.completions[sId]);
        }).length
      : catTasks.filter(t => t.completions && t.completions[currentUser.id]).length;

    const rate = Math.round((catDone / catTotal) * 100);

    return `
      <div class="cat-bar-row">
        <div class="cat-bar-header">
          <span>${cat}</span>
          <span><strong>${catDone}/${catTotal}</strong> (${rate}%)</span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width: ${rate}%; background: ${catColors[cat] || '#6366f1'};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ============= CLASS MATRIX (ADMIN) =============
function filterMatrixStudents(query) {
  matrixSearchFilter = (query || '').toLowerCase().trim();
  renderClassMatrix();
}

function renderClassMatrix() {
  const table = document.getElementById('classMatrixTable');
  if (!table) return;

  const displayStudents = STUDENTS.filter(s => s.name.toLowerCase().includes(matrixSearchFilter));

  if (tasks.length === 0) {
    table.innerHTML = '<tr><td style="text-align:center; padding: 20px; color: var(--text-muted);">Chưa có nhiệm vụ nào trong hệ thống.</td></tr>';
    return;
  }

  // Header row
  let headerHtml = '<thead><tr><th>Học sinh</th>';
  tasks.forEach(t => {
    headerHtml += `<th title="${escapeHtml(t.name)}">${escapeHtml(t.name.length > 16 ? t.name.substring(0, 16) + '...' : t.name)}</th>`;
  });
  headerHtml += '<th>Tỷ lệ</th></tr></thead>';

  // Body rows
  let bodyHtml = '<tbody>';
  displayStudents.forEach(s => {
    let completedCount = 0;
    let assignedCount = 0;

    let cells = '';
    tasks.forEach(t => {
      const isAssigned = !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(s.id);
      if (isAssigned) {
        assignedCount++;
        const isDone = t.completions && t.completions[s.id];
        if (isDone) completedCount++;
        cells += `<td>${isDone ? '✅' : '⭕'}</td>`;
      } else {
        cells += `<td style="color: var(--text-muted); font-size: 0.8rem;">-</td>`;
      }
    });

    const rate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 100;
    const rateBadge = rate >= 80
      ? `<span class="task-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">${rate}%</span>`
      : `<span class="task-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">${rate}%</span>`;

    bodyHtml += `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        ${cells}
        <td>${rateBadge}</td>
      </tr>
    `;
  });
  bodyHtml += '</tbody>';

  table.innerHTML = headerHtml + bodyHtml;
}

// ============= EXPORT CSV =============
function exportStatsToCsv() {
  if (tasks.length === 0 || STUDENTS.length === 0) {
    showToast('Không có dữ liệu để xuất!', 'warning');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += 'Học sinh,' + tasks.map(t => `"${t.name.replace(/"/g, '""')}"`).join(',') + ',Tỷ lệ hoàn thành\n';

  STUDENTS.forEach(s => {
    let done = 0;
    let total = 0;
    const row = [s.name];

    tasks.forEach(t => {
      const isAssigned = !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(s.id);
      if (isAssigned) {
        total++;
        const isDone = t.completions && t.completions[s.id];
        if (isDone) done++;
        row.push(isDone ? 'Đã hoàn thành' : 'Chưa hoàn thành');
      } else {
        row.push('Không giao');
      }
    });

    const rate = total > 0 ? Math.round((done / total) * 100) + '%' : '100%';
    row.push(rate);
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao_Cao_Tien_Do_10C7_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Đã xuất báo cáo CSV thành công!', 'success');
}
