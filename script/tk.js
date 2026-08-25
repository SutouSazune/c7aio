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
        const assigned = t.assignedStudents && t.assignedStudents.length > 0 ? t.assignedStudents : STUDENTS.map(s => s.id);\n        const completions = t.completions || {};\n        return assigned.every(sId => completions[sId]);\n      }).length\n    : relevantTasks.filter(t => t.completions && t.completions[currentUser.id]).length;\n\n  const percent = total > 0 ? Math.round((done / total) * 100) : 100;\n\n  document.getElementById('progressValDisplay').textContent = `${percent}%`;\n\n  const circle = document.getElementById('circleProgress');\n  if (circle) {\n    const radius = 75;\n    const circumference = 2 * Math.PI * radius;\n    circle.style.strokeDasharray = `${circumference} ${circumference}`;\n    const offset = circumference - (percent / 100) * circumference;\n    circle.style.strokeDashoffset = offset;\n  }\n\n  const assessmentEl = document.getElementById('ringAssessmentText');\n  if (assessmentEl) {\n    if (percent >= 80) {\n      assessmentEl.textContent = '🌟 Xuất sắc! Tiến độ học tập rất tốt.';\n      assessmentEl.style.color = '#10b981';\n    } else if (percent >= 50) {\n      assessmentEl.textContent = '👍 Khá tốt! Cần hoàn thành các bài tập còn lại.';\n      assessmentEl.style.color = '#f59e0b';\n    } else {\n      assessmentEl.textContent = '⚠️ Cần chú ý! Có nhiều nhiệm vụ chưa nộp.';\n      assessmentEl.style.color = '#ef4444';\n    }\n  }\n}\n\n// ============= CATEGORY PROGRESS BARS =============\nfunction renderCategoryBars() {\n  const container = document.getElementById('categoryBarsList');\n  if (!container) return;\n\n  const categories = ['Bài tập', 'Học tập', 'Lao động', 'Đoàn / Đội', 'Quỹ lớp', 'Khác'];\n  const catColors = {\n    'Bài tập': 'linear-gradient(90deg, #3b82f6, #6366f1)',\n    'Học tập': 'linear-gradient(90deg, #8b5cf6, #ec4899)',\n    'Lao động': 'linear-gradient(90deg, #10b981, #06b6d4)',\n    'Đoàn / Đội': 'linear-gradient(90deg, #f59e0b, #ef4444)',\n    'Quỹ lớp': 'linear-gradient(90deg, #14b8a6, #10b981)',\n    'Khác': 'linear-gradient(90deg, #64748b, #94a3b8)'\n  };\n\n  const isAdm = isAdmin();\n  const relevantTasks = isAdm\n    ? tasks\n    : tasks.filter(t => !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(currentUser.id));\n\n  container.innerHTML = categories.map(cat => {\n    const catTasks = relevantTasks.filter(t => (t.category || 'Bài tập') === cat);\n    if (catTasks.length === 0) return '';\n\n    const catTotal = catTasks.length;\n    const catDone = isAdm\n      ? catTasks.filter(t => {\n          const assigned = t.assignedStudents && t.assignedStudents.length > 0 ? t.assignedStudents : STUDENTS.map(s => s.id);\n          return assigned.every(sId => t.completions && t.completions[sId]);\n        }).length\n      : catTasks.filter(t => t.completions && t.completions[currentUser.id]).length;\n\n    const rate = Math.round((catDone / catTotal) * 100);\n\n    return `\n      <div class=\"cat-bar-row\">\n        <div class=\"cat-bar-header\">\n          <span>${cat}</span>\n          <span><strong>${catDone}/${catTotal}</strong> (${rate}%)</span>\n        </div>\n        <div class=\"cat-bar-track\">\n          <div class=\"cat-bar-fill\" style=\"width: ${rate}%; background: ${catColors[cat] || '#6366f1'};\"></div>\n        </div>\n      </div>\n    `;\n  }).join('');\n}\n\n// ============= CLASS MATRIX (ADMIN) =============\nfunction filterMatrixStudents(query) {\n  matrixSearchFilter = (query || '').toLowerCase().trim();\n  renderClassMatrix();\n}\n\nfunction renderClassMatrix() {\n  const table = document.getElementById('classMatrixTable');\n  if (!table) return;\n\n  const displayStudents = STUDENTS.filter(s => s.name.toLowerCase().includes(matrixSearchFilter));\n\n  if (tasks.length === 0) {\n    table.innerHTML = '<tr><td style=\"text-align:center; padding: 20px; color: var(--text-muted);\">Chưa có nhiệm vụ nào trong hệ thống.</td></tr>';\n    return;\n  }\n\n  // Header row\n  let headerHtml = '<thead><tr><th>Học sinh</th>';\n  tasks.forEach(t => {\n    headerHtml += `<th title=\"${escapeHtml(t.name)}\">${escapeHtml(t.name.length > 16 ? t.name.substring(0, 16) + '...' : t.name)}</th>`;\n  });\n  headerHtml += '<th>Tỷ lệ</th></tr></thead>';\n\n  // Body rows\n  let bodyHtml = '<tbody>';\n  displayStudents.forEach(s => {\n    let completedCount = 0;\n    let assignedCount = 0;\n\n    let cells = '';\n    tasks.forEach(t => {\n      const isAssigned = !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(s.id);\n      if (isAssigned) {\n        assignedCount++;\n        const isDone = t.completions && t.completions[s.id];\n        if (isDone) completedCount++;\n        cells += `<td>${isDone ? '✅' : '⭕'}</td>`;\n      } else {\n        cells += `<td style=\"color: var(--text-muted); font-size: 0.8rem;\">-</td>`;\n      }\n    });\n\n    const rate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 100;\n    const rateBadge = rate >= 80\n      ? `<span class=\"task-badge\" style=\"background: rgba(16, 185, 129, 0.15); color: #10b981;\">${rate}%</span>`\n      : `<span class=\"task-badge\" style=\"background: rgba(239, 68, 68, 0.15); color: #ef4444;\">${rate}%</span>`;\n\n    bodyHtml += `\n      <tr>\n        <td><strong>${escapeHtml(s.name)}</strong></td>\n        ${cells}\n        <td>${rateBadge}</td>\n      </tr>\n    `;\n  });\n  bodyHtml += '</tbody>';\n\n  table.innerHTML = headerHtml + bodyHtml;\n}\n\n// ============= EXPORT CSV =============\nfunction exportStatsToCsv() {\n  if (tasks.length === 0 || STUDENTS.length === 0) {\n    showToast('Không có dữ liệu để xuất!', 'warning');\n    return;\n  }\n\n  let csvContent = '\\uFEFF'; // UTF-8 BOM\n  csvContent += 'Học sinh,' + tasks.map(t => `\"${t.name.replace(/\"/g, '\"\"')}\"`).join(',') + ',Tỷ lệ hoàn thành\\n';\n\n  STUDENTS.forEach(s => {\n    let done = 0;\n    let total = 0;\n    const row = [s.name];\n\n    tasks.forEach(t => {\n      const isAssigned = !t.assignedStudents || t.assignedStudents.length === 0 || t.assignedStudents.includes(s.id);\n      if (isAssigned) {\n        total++;\n        const isDone = t.completions && t.completions[s.id];\n        if (isDone) done++;\n        row.push(isDone ? 'Đã hoàn thành' : 'Chưa hoàn thành');\n      } else {\n        row.push('Không giao');\n      }\n    });\n\n    const rate = total > 0 ? Math.round((done / total) * 100) + '%' : '100%';\n    row.push(rate);\n    csvContent += row.map(cell => `\"${cell}\"`).join(',') + '\\n';\n  });\n\n  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });\n  const url = URL.createObjectURL(blob);\n  const a = document.createElement('a');\n  a.href = url;\n  a.download = `Bao_Cao_Tien_Do_11C7_${new Date().toISOString().split('T')[0]}.csv`;\n  document.body.appendChild(a);\n  a.click();\n  document.body.removeChild(a);\n  showToast('Đã xuất báo cáo CSV thành công!', 'success');\n}\n