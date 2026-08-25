/**
 * C7AIO Schedule & Timetable Controller
 * Quản lý thời khóa biểu đa tuần, Lịch học, Điều hướng theo ngày, Phân màu môn học
 */

let schedules = JSON.parse(localStorage.getItem('c7aio_schedules_cache')) || {};
let weekMetadata = JSON.parse(localStorage.getItem('c7aio_weekMetadata_cache')) || {};
let currentDate = new Date();
let selectedDate = new Date();
let currentWeekKey = 'week-1';
let editingClassDay = null;
let editingClassIndex = null;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = {
  monday: 'Thứ Hai',
  tuesday: 'Thứ Ba',
  wednesday: 'Thứ Tư',
  thursday: 'Thứ Năm',
  friday: 'Thứ Sáu',
  saturday: 'Thứ Bảy',
  sunday: 'Chủ Nhật'
};

const PERIOD_TIMES = {
  1: '07:00 - 07:45',
  2: '07:50 - 08:35',
  3: '08:50 - 09:35',
  4: '09:40 - 10:25',
  5: '10:30 - 11:15',
  6: '13:00 - 13:45',
  7: '13:50 - 14:35',
  8: '14:50 - 15:35',
  9: '15:40 - 16:25',
  10: '16:30 - 17:15'
};

window.addEventListener('load', () => {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = buildUrl('login.html');
    return;
  }

  const nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = user.name;

  if (checkPermission('manage_schedule')) {
    const btnAdd = document.getElementById('btnAddClassTrigger');
    const btnManage = document.getElementById('btnManageWeekTrigger');
    if (btnAdd) btnAdd.style.display = 'inline-flex';
    if (btnManage) btnManage.style.display = 'inline-flex';
  }

  initDefaultScheduleIfEmpty();
  resolveInitialWeek();
  renderAll();

  // Lắng nghe Realtime
  if (typeof onSharedSchedulesChanged === 'function') {
    onSharedSchedulesChanged((data) => {
      if (data && Object.keys(data).length > 0) {
        schedules = data;
        renderAll();
      }
    });
  }

  if (typeof onSharedWeekMetadataChanged === 'function') {
    onSharedWeekMetadataChanged((data) => {
      if (data && Object.keys(data).length > 0) {
        weekMetadata = data;
        renderAll();
      }
    });
  }
});

function initDefaultScheduleIfEmpty() {
  if (!schedules['week-1']) {
    schedules['week-1'] = {
      monday: [
        { name: 'Chào cờ / Sinh hoạt', time: '07:00 - 07:45', room: 'Sân trường', subject: 'Hoạt động trải nghiệm' },
        { name: 'Toán học', time: '07:50 - 08:35', room: 'P.204', subject: 'Đại số 10' },
        { name: 'Toán học', time: '08:50 - 09:35', room: 'P.204', subject: 'Đại số 10' },
        { name: 'Ngữ văn', time: '09:40 - 10:25', room: 'P.204', subject: 'Văn học dân gian' }
      ],
      tuesday: [
        { name: 'Tiếng Anh', time: '07:00 - 07:45', room: 'P.204', subject: 'Unit 1: Family Life' },
        { name: 'Vật lí', time: '07:50 - 08:35', room: 'P.204', subject: 'Động học chất điểm' },
        { name: 'Hóa học', time: '08:50 - 09:35', room: 'P.204', subject: 'Cấu tạo nguyên tử' }
      ],
      wednesday: [
        { name: 'Lịch sử', time: '07:00 - 07:45', room: 'P.204', subject: 'Lịch sử thế giới' },
        { name: 'Địa lí', time: '07:50 - 08:35', room: 'P.204', subject: 'Bản đồ & Trái đất' },
        { name: 'Tin học', time: '08:50 - 09:35', room: 'Phòng Máy 1', subject: 'Python cơ bản' }
      ],
      thursday: [
        { name: 'Ngữ văn', time: '07:00 - 07:45', room: 'P.204', subject: 'Đọc hiểu văn bản' },
        { name: 'Toán học', time: '07:50 - 08:35', room: 'P.204', subject: 'Hình học tọa độ' },
        { name: 'Sinh học', time: '08:50 - 09:35', room: 'P.204', subject: 'Tế bào học' }
      ],
      friday: [
        { name: 'Tiếng Anh', time: '07:00 - 07:45', room: 'P.204', subject: 'Listening & Speaking' },
        { name: 'Giáo dục thể chất', time: '07:50 - 08:35', room: 'Nhà đa năng', subject: 'Bóng rổ' },
        { name: 'GDQP & AN', time: '08:50 - 09:35', room: 'Sân tập', subject: 'Điều lệnh đội ngũ' }
      ],
      saturday: [
        { name: 'Sinh hoạt lớp', time: '07:00 - 07:45', room: 'P.204', subject: 'Tổng kết tuần' }
      ],
      sunday: []
    };
  }

  if (!weekMetadata['week-1']) {
    weekMetadata['week-1'] = {
      name: 'Tuần 1',
      startDate: '2026-08-24',
      endDate: '2026-08-30'
    };
  }
}

function resolveInitialWeek() {
  const today = new Date();
  for (const [key, meta] of Object.entries(weekMetadata)) {
    if (meta.startDate && meta.endDate) {
      const s = new Date(meta.startDate);
      const e = new Date(meta.endDate);
      if (today >= s && today <= e) {
        currentWeekKey = key;
        return;
      }
    }
  }
  const keys = Object.keys(schedules);
  if (keys.length > 0) currentWeekKey = keys[0];
}

function renderAll() {
  renderCalendar();
  renderWeekChips();
  renderTimetable();
  updateCurrentWeekBanner();
}

function updateCurrentWeekBanner() {
  const meta = weekMetadata[currentWeekKey] || {};
  const banner = document.getElementById('currentWeekBanner');
  if (banner) {
    const title = meta.name || currentWeekKey;
    const dateRange = (meta.startDate && meta.endDate) ? ` (${meta.startDate} → ${meta.endDate})` : '';
    banner.innerHTML = `🗓️ Đang hiển thị: <strong>${title}</strong>${dateRange}`;
  }
}

// ============= CALENDAR MATRIX =============
function renderCalendar() {
  const matrix = document.getElementById('calendarMatrix');
  const title = document.getElementById('calendarMonthTitle');
  if (!matrix || !title) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  title.textContent = `${monthNames[month]}, ${year}`;

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay(); // 0 = CN

  matrix.innerHTML = '';

  // Prev month padding
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = prevMonthLast - i;
    matrix.appendChild(cell);
  }

  // Current month days
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.textContent = d;

    const isToday = dateObj.toDateString() === today.toDateString();
    const isSelected = dateObj.toDateString() === selectedDate.toDateString();

    if (isToday) cell.classList.add('today');
    if (isSelected) cell.classList.add('selected');

    cell.onclick = () => {
      selectedDate = dateObj;
      resolveWeekFromDate(selectedDate);
      renderAll();
    };

    // Check if day has classes in current active schedule
    const dayName = getDayNameFromDate(dateObj);
    const weekSchedule = schedules[currentWeekKey] || {};
    if (weekSchedule[dayName] && weekSchedule[dayName].length > 0) {
      const dot = document.createElement('span');
      dot.className = 'cal-class-dot';
      cell.appendChild(dot);
    }

    matrix.appendChild(cell);
  }
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function jumpToToday() {
  currentDate = new Date();
  selectedDate = new Date();
  resolveWeekFromDate(selectedDate);
  renderAll();
  showToast('📍 Đã chuyển đến ngày hôm nay', 'info');
}

function resolveWeekFromDate(date) {
  for (const [key, meta] of Object.entries(weekMetadata)) {
    if (meta.startDate && meta.endDate) {
      const s = new Date(meta.startDate);
      const e = new Date(meta.endDate);
      if (date >= s && date <= e) {
        currentWeekKey = key;
        return;
      }
    }
  }
}

function getDayNameFromDate(date) {
  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return daysMap[date.getDay()];
}

// ============= WEEK CHIPS =============
function renderWeekChips() {
  const container = document.getElementById('weekChipsBar');
  if (!container) return;

  const weeks = Object.keys(schedules);
  container.innerHTML = weeks.map(wKey => {
    const meta = weekMetadata[wKey] || {};
    const name = meta.name || wKey;
    const isActive = wKey === currentWeekKey;
    return `
      <button class="week-chip-btn ${isActive ? 'active' : ''}" onclick="selectWeekKey('${wKey}')">
        ${escapeHtml(name)}
      </button>
    `;
  }).join('') + (checkPermission('manage_schedule') ? `
    <button class="week-chip-btn" style="border: 1px dashed var(--primary); color: var(--primary);" onclick="addNewWeek()">
      + Thêm tuần mới
    </button>
  ` : '');
}

function selectWeekKey(wKey) {
  currentWeekKey = wKey;
  renderAll();
}

function addNewWeek() {
  const existingNums = Object.keys(schedules).map(k => parseInt(k.replace('week-', '')) || 0);
  const nextNum = Math.max(0, ...existingNums) + 1;
  const newKey = `week-${nextNum}`;

  schedules[newKey] = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  };

  weekMetadata[newKey] = {
    name: `Tuần ${nextNum}`,
    startDate: '',
    endDate: ''
  };

  currentWeekKey = newKey;
  if (typeof saveSharedSchedules === 'function') saveSharedSchedules(schedules);
  if (typeof saveSharedWeekMetadata === 'function') saveSharedWeekMetadata(weekMetadata);
  renderAll();
  showToast(`Đã tạo Tuần ${nextNum}!`, 'success');
}

// ============= TIMETABLE VIEW =============
function renderTimetable() {
  const container = document.getElementById('timetableGrid');
  if (!container) return;

  const weekSchedule = schedules[currentWeekKey] || {};
  const todayDayName = getDayNameFromDate(new Date());

  container.innerHTML = DAYS.map(day => {
    const classes = weekSchedule[day] || [];
    const isToday = (day === todayDayName);

    const classesHtml = classes.length === 0
      ? '<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding: 14px 0;">Không có tiết học</div>'
      : classes.map((c, idx) => {
          const color = getSubjectColor(c.name || c.subject);
          return `
            <div class="class-card-item" style="border-left-color: ${color}">
              <div class="class-card-time">⏰ ${escapeHtml(c.time || '')}</div>
              <div class="class-card-name">${escapeHtml(c.name || '')}</div>
              ${c.subject ? `<div class="class-card-sub">${escapeHtml(c.subject)}</div>` : ''}
              <div class="class-card-room">📍 ${escapeHtml(c.room || 'Chưa rõ')}</div>
              ${checkPermission('manage_schedule') ? `
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                  <button class="btn-action-pill" onclick="editClass('${day}', ${idx})">✏️ Sửa</button>
                  <button class="btn-action-pill danger" onclick="deleteClass('${day}', ${idx})">🗑️ Xóa</button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

    return `
      <div class="day-timetable-col ${isToday ? 'is-today-col' : ''}">
        <div class="day-col-header">
          <div class="day-col-title">
            <span>${DAY_LABELS[day]}</span>
            ${isToday ? '<span style="background: var(--primary); color: white; border-radius: 99px; padding: 2px 6px; font-size: 0.7rem; font-weight: 700;">Hôm nay</span>' : ''}
          </div>
          <span style="font-size: 0.8rem; color: var(--text-sub); font-weight: 700;">${classes.length} tiết</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${classesHtml}
        </div>
      </div>
    `;
  }).join('');
}

// ============= CLASS MODAL & FORM =============
function openAddClassModal() {
  editingClassDay = null;
  editingClassIndex = null;
  document.getElementById('classModalTitle').textContent = '➕ Thêm Tiết Học Mới';
  document.getElementById('inputClassName').value = '';
  document.getElementById('inputClassSubject').value = '';
  document.getElementById('inputClassTime').value = '';
  document.getElementById('inputClassRoom').value = 'P.204';
  document.querySelectorAll('.period-picker-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('classModalOverlay').style.display = 'flex';
}

function closeClassModal() {
  document.getElementById('classModalOverlay').style.display = 'none';
}

function pickSubjectTag(subj) {
  document.getElementById('inputClassName').value = subj;
}

function selectPeriodNum(periodNum) {
  document.querySelectorAll('.period-picker-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === periodNum);
  });
  if (PERIOD_TIMES[periodNum]) {
    document.getElementById('inputClassTime').value = PERIOD_TIMES[periodNum];
  }
}

function editClass(day, index) {
  const weekSchedule = schedules[currentWeekKey] || {};
  const c = weekSchedule[day] ? weekSchedule[day][index] : null;
  if (!c) return;

  editingClassDay = day;
  editingClassIndex = index;
  document.getElementById('classModalTitle').textContent = '✏️ Chỉnh Sửa Tiết Học';
  document.getElementById('inputClassName').value = c.name || '';
  document.getElementById('inputClassSubject').value = c.subject || '';
  document.getElementById('inputClassTime').value = c.time || '';
  document.getElementById('inputClassRoom').value = c.room || '';
  document.getElementById('selectClassDay').value = day;

  document.querySelectorAll('.period-picker-btn').forEach(btn => btn.classList.remove('active'));
  for (const [pNum, pTime] of Object.entries(PERIOD_TIMES)) {
    if (c.time === pTime) {
      selectPeriodNum(parseInt(pNum));
      break;
    }
  }

  document.getElementById('classModalOverlay').style.display = 'flex';
}

async function submitClassForm() {
  if (!checkPermission('manage_schedule')) {
    showToast('Bạn không có quyền chỉnh sửa thời khóa biểu!', 'error');
    return;
  }

  const name = document.getElementById('inputClassName').value.trim();
  const subject = document.getElementById('inputClassSubject').value.trim();
  const time = document.getElementById('inputClassTime').value.trim();
  const room = document.getElementById('inputClassRoom').value.trim();
  const day = document.getElementById('selectClassDay').value;

  if (!name || !time) {
    showToast('Vui lòng nhập tên môn và thời gian học!', 'warning');
    return;
  }

  if (!schedules[currentWeekKey]) {
    schedules[currentWeekKey] = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
  }
  if (!schedules[currentWeekKey][day]) schedules[currentWeekKey][day] = [];

  const classData = { name, subject, time, room: room || 'P.204' };

  if (editingClassDay !== null && editingClassIndex !== null) {
    if (editingClassDay !== day) {
      schedules[currentWeekKey][editingClassDay].splice(editingClassIndex, 1);
      schedules[currentWeekKey][day].push(classData);
    } else {
      schedules[currentWeekKey][day][editingClassIndex] = classData;
    }
  } else {
    schedules[currentWeekKey][day].push(classData);
  }

  if (typeof saveSharedSchedules === 'function') {
    await saveSharedSchedules(schedules);
  }

  if (typeof logAction === 'function') {
    logAction('Cập nhật lịch học', `Môn: ${name} (${DAY_LABELS[day]})`);
  }

  showToast('Đã lưu tiết học thành công!', 'success');
  closeClassModal();
  renderAll();
}

async function deleteClass(day, index) {
  if (!checkPermission('manage_schedule')) return;

  showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa tiết học này không?', async () => {
    if (schedules[currentWeekKey] && schedules[currentWeekKey][day]) {
      schedules[currentWeekKey][day].splice(index, 1);
      if (typeof saveSharedSchedules === 'function') {
        await saveSharedSchedules(schedules);
      }
      showToast('Đã xóa tiết học!', 'success');
      renderAll();
    }
  });
}

// ============= WEEK MODAL =============
function openWeekManagementModal() {
  const meta = weekMetadata[currentWeekKey] || {};
  document.getElementById('inputWeekName').value = meta.name || currentWeekKey;
  document.getElementById('inputWeekStartDate').value = meta.startDate || '';
  document.getElementById('inputWeekEndDate').value = meta.endDate || '';
  document.getElementById('weekModalOverlay').style.display = 'flex';
}

function closeWeekModal() {
  document.getElementById('weekModalOverlay').style.display = 'none';
}

async function submitWeekMetadata() {
  const name = document.getElementById('inputWeekName').value.trim();
  const startDate = document.getElementById('inputWeekStartDate').value;
  const endDate = document.getElementById('inputWeekEndDate').value;

  weekMetadata[currentWeekKey] = {
    name: name || currentWeekKey,
    startDate,
    endDate
  };

  if (typeof saveSharedWeekMetadata === 'function') {
    await saveSharedWeekMetadata(weekMetadata);
  }

  showToast('Đã lưu thông tin tuần!', 'success');
  closeWeekModal();
  renderAll();
}

async function deleteCurrentWeekAction() {
  const weeks = Object.keys(schedules);
  if (weeks.length <= 1) {
    showToast('Phải giữ lại ít nhất một tuần trong hệ thống!', 'warning');
    return;
  }

  showConfirm('Xóa tuần', `Bạn có chắc muốn xóa vĩnh viễn ${weekMetadata[currentWeekKey]?.name || currentWeekKey}?`, async () => {
    delete schedules[currentWeekKey];
    delete weekMetadata[currentWeekKey];

    const remaining = Object.keys(schedules);
    currentWeekKey = remaining[0];

    if (typeof saveSharedSchedules === 'function') await saveSharedSchedules(schedules);
    if (typeof saveSharedWeekMetadata === 'function') await saveSharedWeekMetadata(weekMetadata);

    showToast('Đã xóa tuần!', 'success');
    closeWeekModal();
    renderAll();
  });
}
