/**
 * C7AIO Schedule & Timetable Controller
 * Quản lý thời khóa biểu đa tuần, Lịch học, Điều hướng theo ngày, Phân màu môn học
 */

let schedules = JSON.parse(localStorage.getItem('c7aio_schedules_cache')) || {};
let weekMetadata = JSON.parse(localStorage.getItem('c7aio_weekMetadata_cache')) || {};
let currentDate = new Date();
let selectedDate = new Date();
let currentWeekKey = 'week-1';
let scheduleViewMode = 'week'; // 'week' hoặc 'day'
let selectedClassFilter = '11C7'; // Lọc theo lớp riêng, mặc định 11C7
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

  // TKB số 1 chính thức áp dụng từ ngày 07/09/2026
  if (!weekMetadata['week-1'] || weekMetadata['week-1'].startDate === '2026-08-24') {
    weekMetadata['week-1'] = {
      name: 'Tuần 1',
      className: '11C7',
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      ...(weekMetadata['week-1'] || {})
    };
    weekMetadata['week-1'].startDate = '2026-09-07';
    weekMetadata['week-1'].endDate = '2026-09-13';
  }

  ensureSemesterWeeksMetadata();
}

function ensureSemesterWeeksMetadata() {
  const baseStart = (weekMetadata['week-1'] && weekMetadata['week-1'].startDate && weekMetadata['week-1'].startDate !== '2026-08-24')
    ? weekMetadata['week-1'].startDate
    : '2026-09-07';
  const startD = parseLocalDate(baseStart);

  // Sinh thông tin tuần tự động cho tối thiểu 10 tuần (đặc biệt là Tuần 8)
  for (let i = 1; i <= 10; i++) {
    const wKey = `week-${i}`;
    const s = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() + (i - 1) * 7);
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
    if (!weekMetadata[wKey] || !weekMetadata[wKey].startDate || weekMetadata[wKey].startDate < '2026-09-07') {
      weekMetadata[wKey] = {
        name: `Tuần ${i}`,
        className: '11C7',
        startDate: toDateStringKey(s),
        endDate: toDateStringKey(e),
        ...(weekMetadata[wKey] || {})
      };
      weekMetadata[wKey].startDate = toDateStringKey(s);
      weekMetadata[wKey].endDate = toDateStringKey(e);
    }
  }
}

function getEffectiveSchedule(weekKey) {
  if (schedules[weekKey]) {
    const hasAnyPeriod = DAYS.some(d => Array.isArray(schedules[weekKey][d]) && schedules[weekKey][d].length > 0);
    if (hasAnyPeriod) return schedules[weekKey];
  }
  // Tự động kế thừa thời khóa biểu từ Tuần 1 để các tuần chưa cài riêng (như Tuần 8) luôn có dữ liệu hiển thị
  return schedules['week-1'] || {};
}

// --- DATE UTILITIES (TRÁNH LỖI LỆCH MÚI GIỜ & ĐỒNG BỘ TUẦN / NGÀY) ---
function toDateStringKey(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(str) {
  if (!str) return new Date();
  if (str instanceof Date) return new Date(str.getFullYear(), str.getMonth(), str.getDate());
  const parts = String(str).split('T')[0].split(/[-/]/);
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(str);
}

function formatDateDisplay(str) {
  if (!str) return '';
  const parts = String(str).split('T')[0].split(/[-/]/);
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
}

function goToSemesterStart() {
  const firstWeekStart = (weekMetadata['week-1'] && weekMetadata['week-1'].startDate) || '2026-09-07';
  selectedDate = parseLocalDate(firstWeekStart);
  currentDate = new Date(selectedDate);
  currentWeekKey = 'week-1';
  scheduleViewMode = 'day';
  renderAll();
  showToast('📅 Đã chuyển đến ngày bắt đầu TKB số 1 (07/09/2026)', 'success');
}

function getWeekKeyForDate(date) {
  const dateKey = toDateStringKey(date);
  if (!dateKey) return null;
  for (const [key, meta] of Object.entries(weekMetadata)) {
    if (meta && meta.startDate && meta.endDate) {
      if (dateKey >= meta.startDate && dateKey <= meta.endDate) {
        return key;
      }
    }
  }
  return null;
}

function getDateForDayInWeek(weekKey, dayName) {
  const meta = weekMetadata[weekKey] || {};
  const dayIndex = DAYS.indexOf(dayName);
  if (dayIndex === -1) return new Date(selectedDate);

  if (meta.startDate) {
    const sDate = parseLocalDate(meta.startDate);
    return new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate() + dayIndex);
  }

  // Fallback: tính theo ngày trong tuần chứa selectedDate
  const currDayName = getDayNameFromDate(selectedDate);
  const currDayIdx = DAYS.indexOf(currDayName);
  const diff = dayIndex - (currDayIdx !== -1 ? currDayIdx : 0);
  return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + diff);
}

function resolveInitialWeek() {
  const today = new Date();
  const matchedKey = getWeekKeyForDate(today);
  if (matchedKey) {
    currentWeekKey = matchedKey;
    return;
  }
  const keys = Object.keys(schedules);
  if (keys.length > 0) currentWeekKey = keys[0];
}

function resolveWeekFromDate(date) {
  const matchedKey = getWeekKeyForDate(date);
  if (matchedKey) {
    currentWeekKey = matchedKey;
  }
}

function renderAll() {
  populateClassFilterOptions();
  renderCalendar();
  renderWeekChips();
  renderDayView();
  renderTimetable();
  updateCurrentWeekBanner();

  // Đồng bộ trạng thái hiển thị viewMode
  const weekGrid = document.getElementById('timetableGrid');
  const dayCard = document.getElementById('dayViewContainer');
  const btnWeek = document.getElementById('btnViewWeek');
  const btnDay = document.getElementById('btnViewDay');

  if (btnWeek) btnWeek.classList.toggle('active', scheduleViewMode === 'week');
  if (btnDay) btnDay.classList.toggle('active', scheduleViewMode === 'day');

  if (scheduleViewMode === 'day') {
    if (weekGrid) weekGrid.style.display = 'none';
    if (dayCard) dayCard.style.display = 'flex';
  } else {
    if (weekGrid) weekGrid.style.display = 'grid';
    if (dayCard) dayCard.style.display = 'none';
  }
}

function switchScheduleViewMode(mode) {
  scheduleViewMode = mode;
  // Đảm bảo khi chuyển sang chế độ ngày, selectedDate luôn thuộc tuần đang xem
  if (mode === 'day') {
    const meta = weekMetadata[currentWeekKey] || {};
    if (meta.startDate && meta.endDate) {
      const dateKey = toDateStringKey(selectedDate);
      if (dateKey < meta.startDate || dateKey > meta.endDate) {
        const currDayName = getDayNameFromDate(selectedDate);
        selectedDate = getDateForDayInWeek(currentWeekKey, currDayName);
        currentDate = new Date(selectedDate);
      }
    }
  }
  renderAll();
}

function populateClassFilterOptions() {
  const select = document.getElementById('classFilterSelect');
  if (!select) return;

  const classesSet = new Set(['11C7']);
  
  // Quét từ metadata tuần
  Object.values(weekMetadata).forEach(m => {
    if (m && m.className) classesSet.add(m.className);
  });

  // Quét từ các tiết học trong schedules
  Object.values(schedules).forEach(weekObj => {
    if (weekObj && typeof weekObj === 'object') {
      Object.values(weekObj).forEach(dayList => {
        if (Array.isArray(dayList)) {
          dayList.forEach(c => {
            if (c && c.className) classesSet.add(c.className);
          });
        }
      });
    }
  });

  const sortedClasses = Array.from(classesSet).sort();
  const currentVal = selectedClassFilter;

  select.innerHTML = '<option value="">-- Tất cả lớp --</option>' +
    sortedClasses.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>Lớp ${c}</option>`).join('');
}

function handleClassFilterChange(cls) {
  selectedClassFilter = cls;
  renderAll();
}

function updateCurrentWeekBanner() {
  const meta = weekMetadata[currentWeekKey] || {};
  const banner = document.getElementById('currentWeekBanner');
  if (banner) {
    const firstWeekStart = (weekMetadata['week-1'] && weekMetadata['week-1'].startDate) || '2026-09-07';
    const selectedDateKey = toDateStringKey(selectedDate);
    const isBeforeSemester = scheduleViewMode === 'day' && selectedDateKey < firstWeekStart;

    let title = meta.name || currentWeekKey;
    if (isBeforeSemester) {
      title = 'Chưa áp dụng TKB';
    }
    const classBadge = meta.className ? ` • Lớp ${meta.className}` : '';
    const dateRange = (meta.startDate && meta.endDate) ? ` (${formatDateDisplay(meta.startDate)} → ${formatDateDisplay(meta.endDate)})` : '';
    const modeBadge = scheduleViewMode === 'day' 
      ? ` • Xem: <strong>${DAY_LABELS[getDayNameFromDate(selectedDate)]}</strong>` 
      : ` • Xem: <strong>Cả tuần</strong>`;
    banner.innerHTML = `🗓️ Đang hiển thị: <strong>${escapeHtml(title)}</strong>${classBadge}${isBeforeSemester ? ` (Bắt đầu từ ${formatDateDisplay(firstWeekStart)})` : dateRange}${modeBadge}`;
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
    const prevDate = new Date(year, month - 1, prevMonthLast - i);
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = prevMonthLast - i;
    cell.onclick = () => {
      selectedDate = prevDate;
      currentDate = new Date(selectedDate);
      resolveWeekFromDate(selectedDate);
      switchScheduleViewMode('day');
    };
    matrix.appendChild(cell);
  }

  // Current month days
  const today = new Date();
  const todayStr = toDateStringKey(today);
  const selectedStr = toDateStringKey(selectedDate);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateKey = toDateStringKey(dateObj);
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.textContent = d;

    const isToday = (dateKey === todayStr);
    const isSelected = (dateKey === selectedStr);

    if (isToday) cell.classList.add('today');
    if (isSelected) cell.classList.add('selected');

    // Click ngày nào thì cập nhật selectedDate và chuyển chế độ xem ngày
    cell.onclick = () => {
      selectedDate = dateObj;
      currentDate = new Date(selectedDate);
      resolveWeekFromDate(selectedDate);
      scheduleViewMode = 'day';
      renderAll();
    };

    // Kiểm tra tiết học theo đúng tuần chứa ngày này (chỉ vẽ chấm nếu ngày này thuộc tuần học có TKB)
    const targetWeekKey = getWeekKeyForDate(dateObj);
    let dayClasses = [];
    if (targetWeekKey) {
      const targetSchedule = getEffectiveSchedule(targetWeekKey);
      const dayName = getDayNameFromDate(dateObj);
      dayClasses = targetSchedule[dayName] || [];
      if (selectedClassFilter) {
        dayClasses = dayClasses.filter(c => !c.className || c.className === selectedClassFilter);
      }
    }
    if (dayClasses.length > 0) {
      const dot = document.createElement('span');
      dot.className = 'cal-class-dot';
      cell.appendChild(dot);
    }

    matrix.appendChild(cell);
  }

  // Next month padding (lấp đầy ô cuối tuần cho đẹp mắt)
  const totalRendered = startingDay + daysInMonth;
  const nextPadding = (7 - (totalRendered % 7)) % 7;
  for (let n = 1; n <= nextPadding; n++) {
    const nextDate = new Date(year, month + 1, n);
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = n;
    cell.onclick = () => {
      selectedDate = nextDate;
      currentDate = new Date(selectedDate);
      resolveWeekFromDate(selectedDate);
      scheduleViewMode = 'day';
      renderAll();
    };
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
  const now = new Date();
  currentDate = new Date(now);
  selectedDate = new Date(now);
  resolveWeekFromDate(selectedDate);
  renderAll();
  showToast('📍 Đã chuyển đến ngày hôm nay', 'info');
}

function getDayNameFromDate(date) {
  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return daysMap[date.getDay()];
}

// ============= WEEK CHIPS =============
function renderWeekChips() {
  const container = document.getElementById('weekChipsBar');
  if (!container) return;

  const allKeys = Array.from(new Set([...Object.keys(schedules), ...Object.keys(weekMetadata)]));
  allKeys.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  container.innerHTML = allKeys.map(wKey => {
    const meta = weekMetadata[wKey] || {};
    const name = meta.name || (`Tuần ${wKey.replace(/\D/g, '')}`);
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
  // Đồng bộ selectedDate với tuần mới
  const currDayName = getDayNameFromDate(selectedDate);
  selectedDate = getDateForDayInWeek(wKey, currDayName);
  currentDate = new Date(selectedDate);
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

// ============= DAY SCHEDULE VIEW (Click ngày nào hiện ngày đó) =============
function renderDayView() {
  const container = document.getElementById('dayViewContainer');
  if (!container) return;

  const dayName = getDayNameFromDate(selectedDate);
  const matchedWeekKey = getWeekKeyForDate(selectedDate);
  const today = new Date();
  const isToday = toDateStringKey(selectedDate) === toDateStringKey(today);
  const selectedDateKey = toDateStringKey(selectedDate);
  const dateStr = `${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear()}`;

  // Kiểm tra ngày này có nằm trước khi học kỳ / TKB số 1 bắt đầu không
  const firstWeekStart = (weekMetadata['week-1'] && weekMetadata['week-1'].startDate) || '2026-09-07';
  const isBeforeSemester = selectedDateKey < firstWeekStart;

  let rawClasses = [];
  let weekTitle = '';

  if (matchedWeekKey) {
    const weekSchedule = getEffectiveSchedule(matchedWeekKey);
    rawClasses = weekSchedule[dayName] || [];
    const currentWeekMeta = weekMetadata[matchedWeekKey] || {};
    weekTitle = currentWeekMeta.name || matchedWeekKey;
  } else if (isBeforeSemester) {
    weekTitle = 'Chưa áp dụng TKB';
  } else {
    weekTitle = 'Ngoài tuần học';
  }

  // Gắn originalIndex để sửa/xóa chuẩn xác kể cả khi đang lọc lớp
  const classesWithIndex = rawClasses.map((c, originalIndex) => ({ ...c, originalIndex }));
  let classes = selectedClassFilter
    ? classesWithIndex.filter(c => !c.className || c.className === selectedClassFilter)
    : classesWithIndex;

  let emptyMessageTitle = 'Không có tiết học';
  let emptyMessageDesc = 'Hôm nay không có tiết học hoặc chưa được xếp thời khóa biểu!';

  if (isBeforeSemester) {
    emptyMessageTitle = 'Chưa áp dụng thời khóa biểu';
    emptyMessageDesc = `Thời khóa biểu số 1 chính thức bắt đầu áp dụng từ Thứ Hai, ${formatDateDisplay(firstWeekStart)}. Trước ngày này chưa có tiết học!`;
  }

  const jumpToStartBtn = isBeforeSemester ? `
    <div style="margin-top: 14px;">
      <button class="c7-btn c7-btn-primary" onclick="goToSemesterStart()" style="font-size: 0.85rem;">
        👉 Đi đến ngày bắt đầu TKB (${formatDateDisplay(firstWeekStart)})
      </button>
    </div>
  ` : '';

  const classesHtml = classes.length === 0
    ? `<div class="empty-widget" style="padding: 2.5rem 1rem; text-align: center; color: var(--text-sub); width: 100%;">
        <span style="font-size: 2.8rem;">${isBeforeSemester ? '⏳' : '🏖️'}</span>
        <h4 style="font-size: 1.1rem; margin: 8px 0 4px; color: var(--text-main);">${emptyMessageTitle}</h4>
        <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto;">${emptyMessageDesc}</p>
        ${jumpToStartBtn}
      </div>`
    : `<div class="day-classes-list-grid" style="width: 100%;">` + classes.map(c => {
        const color = getSubjectColor(c.name || c.subject);
        return `
          <div class="day-class-card-detailed" style="border-left-color: ${color}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <span class="class-card-time">⏰ ${escapeHtml(c.time || '')}</span>
              ${c.className ? `<span class="class-card-grade-badge">🏫 Lớp ${escapeHtml(c.className)}</span>` : ''}
            </div>
            <div class="class-card-name" style="font-size: 1.05rem;">${escapeHtml(c.name || '')}</div>
            ${c.subject ? `<div class="class-card-sub">${escapeHtml(c.subject)}</div>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span class="class-card-room">📍 ${escapeHtml(c.room || 'P.204')}</span>
              ${checkPermission('manage_schedule') ? `
                <div style="display: flex; gap: 6px;">
                  <button class="btn-action-pill" onclick="editClass('${dayName}', ${c.originalIndex})">✏️ Sửa</button>
                  <button class="btn-action-pill danger" onclick="deleteClass('${dayName}', ${c.originalIndex})">🗑️ Xóa</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('') + `</div>`;

  container.innerHTML = `
    <div class="day-view-header-bar">
      <div class="day-view-title-block">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0;">📅 ${DAY_LABELS[dayName]} (${dateStr})</h3>
          <span style="background: rgba(99, 102, 241, 0.15); color: var(--primary); border-radius: 99px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700;">${escapeHtml(weekTitle)}</span>
          ${isToday ? '<span style="background: var(--primary); color: white; border-radius: 99px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700;">Hôm nay</span>' : ''}
          ${selectedClassFilter ? `<span class="class-card-grade-badge" style="font-size: 0.75rem;">Lớp ${escapeHtml(selectedClassFilter)}</span>` : ''}
        </div>
        <span style="font-size: 0.85rem; color: var(--text-sub);">Thời khóa biểu chi tiết trong ngày • <strong>${classes.length}</strong> tiết học</span>
      </div>

      <div class="day-view-nav-buttons">
        <button class="c7-btn c7-btn-secondary" onclick="prevDay()" title="Xem ngày trước">
          ← Ngày trước
        </button>
        <button class="c7-btn c7-btn-secondary" onclick="jumpToToday()" title="Về hôm nay">
          Hôm nay
        </button>
        <button class="c7-btn c7-btn-secondary" onclick="nextDay()" title="Xem ngày tiếp theo">
          Ngày sau →
        </button>
        ${checkPermission('manage_schedule') ? `
          <button class="c7-btn c7-btn-primary" onclick="openAddClassForCurrentDay('${dayName}')">
            + Thêm tiết ngày này
          </button>
        ` : ''}
      </div>
    </div>
    ${classesHtml}
  `;
}

function prevDay() {
  selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1);
  currentDate = new Date(selectedDate);
  resolveWeekFromDate(selectedDate);
  renderAll();
}

function nextDay() {
  selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
  currentDate = new Date(selectedDate);
  resolveWeekFromDate(selectedDate);
  renderAll();
}

function openAddClassForCurrentDay(dayName) {
  openAddClassModal(dayName);
}

// ============= TIMETABLE VIEW (Cả tuần) =============
function renderTimetable() {
  const container = document.getElementById('timetableGrid');
  if (!container) return;

  const weekSchedule = getEffectiveSchedule(currentWeekKey);
  const today = new Date();
  const todayKey = toDateStringKey(today);
  const selectedKey = toDateStringKey(selectedDate);
  const selectedDayName = getDayNameFromDate(selectedDate);

  container.innerHTML = DAYS.map(day => {
    // Lấy ngày thực tế của thứ này trong tuần hiện tại
    const dayDate = getDateForDayInWeek(currentWeekKey, day);
    const dayDateKey = toDateStringKey(dayDate);
    const dateFormatted = `${dayDate.getDate().toString().padStart(2, '0')}/${(dayDate.getMonth() + 1).toString().padStart(2, '0')}`;

    // Chỉ đánh dấu hôm nay nếu ngày của cột đúng là ngày hôm nay
    const isToday = (dayDateKey === todayKey);
    // Đánh dấu cột được chọn: nếu ngày trùng với selectedDate HOẶC nếu tuần chưa có ngày thì dựa theo thứ
    const isSelected = (dayDateKey === selectedKey) || (!weekMetadata[currentWeekKey]?.startDate && day === selectedDayName);

    const rawClasses = weekSchedule[day] || [];
    const classesWithIndex = rawClasses.map((c, originalIndex) => ({ ...c, originalIndex }));
    let classes = selectedClassFilter
      ? classesWithIndex.filter(c => !c.className || c.className === selectedClassFilter)
      : classesWithIndex;

    const classesHtml = classes.length === 0
      ? '<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding: 14px 0;">Không có tiết học</div>'
      : classes.map(c => {
          const color = getSubjectColor(c.name || c.subject);
          return `
            <div class="class-card-item" style="border-left-color: ${color}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="class-card-time">⏰ ${escapeHtml(c.time || '')}</span>
                ${c.className ? `<span class="class-card-grade-badge">🏫 ${escapeHtml(c.className)}</span>` : ''}
              </div>
              <div class="class-card-name">${escapeHtml(c.name || '')}</div>
              ${c.subject ? `<div class="class-card-sub">${escapeHtml(c.subject)}</div>` : ''}
              <div class="class-card-room">📍 ${escapeHtml(c.room || 'Chưa rõ')}</div>
              ${checkPermission('manage_schedule') ? `
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                  <button class="btn-action-pill" onclick="editClass('${day}', ${c.originalIndex})">✏️ Sửa</button>
                  <button class="btn-action-pill danger" onclick="deleteClass('${day}', ${c.originalIndex})">🗑️ Xóa</button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

    return `
      <div class="day-timetable-col ${isToday ? 'is-today-col' : ''} ${isSelected ? 'is-selected-col' : ''}">
        <div class="day-col-header" style="cursor: pointer;" onclick="selectDayColumn('${day}')" title="Click để xem chi tiết ${DAY_LABELS[day]}">
          <div class="day-col-title">
            <span>${DAY_LABELS[day]} <small style="font-size: 0.8rem; font-weight: 500; opacity: 0.8;">(${dateFormatted})</small></span>
            ${isToday ? '<span style="background: var(--primary); color: white; border-radius: 99px; padding: 2px 6px; font-size: 0.7rem; font-weight: 700;">Hôm nay</span>' : ''}
          </div>
          <span style="font-size: 0.8rem; color: var(--text-sub); font-weight: 700;">${classes.length} tiết 🔍</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${classesHtml}
        </div>
      </div>
    `;
  }).join('');
}

function selectDayColumn(day) {
  selectedDate = getDateForDayInWeek(currentWeekKey, day);
  currentDate = new Date(selectedDate);
  switchScheduleViewMode('day');
}

// ============= CLASS MODAL & FORM =============
function openAddClassModal(defaultDay = null) {
  editingClassDay = null;
  editingClassIndex = null;
  document.getElementById('classModalTitle').textContent = '➕ Thêm Tiết Học Mới';
  document.getElementById('inputClassName').value = '';
  document.getElementById('inputClassSubject').value = '';
  const gradeInput = document.getElementById('inputClassGrade');
  if (gradeInput) gradeInput.value = selectedClassFilter || '11C7';
  document.getElementById('inputClassTime').value = '';
  document.getElementById('inputClassRoom').value = 'P.204';

  const targetDay = defaultDay || getDayNameFromDate(selectedDate) || 'monday';
  const selectDay = document.getElementById('selectClassDay');
  if (selectDay) selectDay.value = targetDay;

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
  const weekSchedule = getEffectiveSchedule(currentWeekKey);
  const c = weekSchedule[day] ? weekSchedule[day][index] : null;
  if (!c) return;

  editingClassDay = day;
  editingClassIndex = index;
  document.getElementById('classModalTitle').textContent = '✏️ Chỉnh Sửa Tiết Học';
  document.getElementById('inputClassName').value = c.name || '';
  document.getElementById('inputClassSubject').value = c.subject || '';
  const gradeInput = document.getElementById('inputClassGrade');
  if (gradeInput) gradeInput.value = c.className || selectedClassFilter || '11C7';
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
  const className = document.getElementById('inputClassGrade')?.value.trim() || '11C7';
  const time = document.getElementById('inputClassTime').value.trim();
  const room = document.getElementById('inputClassRoom').value.trim();
  const day = document.getElementById('selectClassDay').value;

  if (!name || !time) {
    showToast('Vui lòng nhập tên môn và thời gian học!', 'warning');
    return;
  }

  if (!schedules[currentWeekKey]) {
    const base = getEffectiveSchedule(currentWeekKey);
    schedules[currentWeekKey] = JSON.parse(JSON.stringify(base));
  }
  if (!schedules[currentWeekKey][day]) schedules[currentWeekKey][day] = [];

  const classData = { name, subject, time, room: room || 'P.204', className };

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
    logAction('Cập nhật lịch học', `Môn: ${name} (${DAY_LABELS[day]} - Lớp ${className})`);
  }

  showToast('Đã lưu tiết học thành công!', 'success');
  closeClassModal();
  renderAll();
}

async function deleteClass(day, index) {
  if (!checkPermission('manage_schedule')) return;

  showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa tiết học này không?', async () => {
    if (!schedules[currentWeekKey]) {
      const base = getEffectiveSchedule(currentWeekKey);
      schedules[currentWeekKey] = JSON.parse(JSON.stringify(base));
    }
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
  const classInput = document.getElementById('inputWeekClass');
  if (classInput) classInput.value = meta.className || selectedClassFilter || '11C7';
  document.getElementById('inputWeekStartDate').value = meta.startDate || '';
  document.getElementById('inputWeekEndDate').value = meta.endDate || '';
  document.getElementById('weekModalOverlay').style.display = 'flex';
}

function closeWeekModal() {
  document.getElementById('weekModalOverlay').style.display = 'none';
}

async function submitWeekMetadata() {
  const name = document.getElementById('inputWeekName').value.trim();
  const className = document.getElementById('inputWeekClass')?.value.trim() || '11C7';
  const startDate = document.getElementById('inputWeekStartDate').value;
  const endDate = document.getElementById('inputWeekEndDate').value;

  weekMetadata[currentWeekKey] = {
    name: name || currentWeekKey,
    className,
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
