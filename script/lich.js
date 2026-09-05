/**
 * C7AIO Schedule & Timetable Controller
 * Quản lý thời khóa biểu đa tuần, Lịch học, Điều hướng theo ngày, Phân màu môn học
 */

let schedules = JSON.parse(localStorage.getItem('c7aio_schedules_cache')) || {};
let weekMetadata = JSON.parse(localStorage.getItem('c7aio_weekMetadata_cache')) || {};
let scheduleEvents = JSON.parse(localStorage.getItem('c7aio_schedule_events') || '{}');
let currentDate = new Date();
let selectedDate = new Date();
let currentWeekKey = 'week-1';
let scheduleViewMode = 'week'; // 'week' | 'day' | 'month' | 'year'
let selectedClassFilter = '11C7';
let editingClassDay = null;
let editingClassIndex = null;
let editingEventWeekKey = null;
let editingEventId = null;

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

// ============= DANH MỤC CHUẨN 36 LỚP HỌC TOÀN TRƯỜNG =============
const STANDARD_CLASSES = [
  ...Array.from({ length: 12 }, (_, i) => `10A${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) => `11C${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) => `12A${i + 1}`)
];

function getSubjectColor(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('toán')) return '#3b82f6';
  if (n.includes('văn')) return '#ec4899';
  if (n.includes('anh')) return '#8b5cf6';
  if (n.includes('lý') || n.includes('vật lí')) return '#06b6d4';
  if (n.includes('hóa')) return '#10b981';
  if (n.includes('sinh')) return '#84cc16';
  if (n.includes('sử')) return '#f59e0b';
  if (n.includes('địa')) return '#d97706';
  if (n.includes('tin')) return '#6366f1';
  if (n.includes('thể dục') || n.includes('gdtc')) return '#ef4444';
  if (n.includes('gdcd') || n.includes('kinh tế')) return '#14b8a6';
  if (n.includes('chào cờ') || n.includes('sinh hoạt')) return '#e11d48';
  return '#64748b';
}

// ============= CẤU HÌNH NIÊN KHÓA & BỘ ĐẾM TUẦN HỌC (LỚP 10 - 11 - 12) =============
const ACADEMIC_YEARS = {
  '2025-2026': {
    id: '2025-2026',
    grade: '10C7',
    label: 'Lớp 10 (2025 - 2026)',
    openingDate: '2025-09-05',
    startDate: '2025-09-08',
    endDate: '2026-05-31',
    totalWeeks: 35,
    semester1Weeks: 18
  },
  '2026-2027': {
    id: '2026-2027',
    grade: '11C7',
    label: 'Lớp 11 (2026 - 2027)',
    openingDate: '2026-09-05',
    startDate: '2026-09-07',
    endDate: '2027-05-29',
    totalWeeks: 35,
    semester1Weeks: 18
  },
  '2027-2028': {
    id: '2027-2028',
    grade: '12C7',
    label: 'Lớp 12 (2027 - 2028)',
    openingDate: '2027-09-05',
    startDate: '2027-09-06',
    endDate: '2028-05-31',
    totalWeeks: 35,
    semester1Weeks: 18
  }
};

let currentAcademicYearKey = localStorage.getItem('c7aio_academic_year') || '2026-2027';

function getActiveAcademicYear() {
  return ACADEMIC_YEARS[currentAcademicYearKey] || ACADEMIC_YEARS['2026-2027'];
}

function switchAcademicYear(yearKey) {
  if (!ACADEMIC_YEARS[yearKey]) return;
  currentAcademicYearKey = yearKey;
  localStorage.setItem('c7aio_academic_year', yearKey);
  const ay = getActiveAcademicYear();
  selectedClassFilter = ay.grade;
  
  ensureSemesterWeeksMetadata();
  resolveInitialWeek();
  renderAll();
  showToast(`🎓 Đã chuyển sang cấu hình niên khóa ${ay.label}`, 'success');
}

function getAcademicProgress(targetDate = null) {
  const ay = getActiveAcademicYear();
  const d = targetDate ? parseLocalDate(targetDate) : new Date(selectedDate);
  const targetKey = toDateStringKey(d);

  const openDate = parseLocalDate(ay.openingDate);
  const startDate = parseLocalDate(ay.startDate);
  const endDate = parseLocalDate(ay.endDate);
  const oneDayMs = 24 * 60 * 60 * 1000;

  // 1. Trước khai giảng
  if (targetKey < ay.openingDate) {
    const daysUntilOpening = Math.max(1, Math.ceil((openDate.getTime() - d.getTime()) / oneDayMs));
    return {
      status: 'before_opening',
      academicYear: ay,
      currentWeek: 0,
      totalWeeks: ay.totalWeeks,
      percentage: 0,
      daysUntilOpening,
      badgeText: `⏳ Còn ${daysUntilOpening} ngày đến Khai giảng (${formatDateDisplay(ay.openingDate)})`,
      desc: `Năm học mới ${ay.label} sẽ chính thức khai giảng vào ngày ${formatDateDisplay(ay.openingDate)}.`
    };
  }

  // 2. Giai đoạn Khai giảng đến trước ngày TKB số 1 (05/09 - 06/09)
  if (targetKey >= ay.openingDate && targetKey < ay.startDate) {
    const isOpeningDay = (targetKey === ay.openingDate);
    return {
      status: 'opening_period',
      academicYear: ay,
      currentWeek: 0,
      totalWeeks: ay.totalWeeks,
      percentage: 0,
      badgeText: isOpeningDay ? '🎉 Hôm nay: Lễ Khai Giảng Năm Học Mới!' : '🚩 Tuần lễ khai giảng',
      desc: `Lễ Khai giảng năm học mới ${ay.label}. Thời khóa biểu chính thức (Tuần 1) bắt đầu từ Thứ Hai, ${formatDateDisplay(ay.startDate)}.`
    };
  }

  // 3. Trong năm học chính thức
  if (targetKey >= ay.startDate && targetKey <= ay.endDate) {
    const diffDays = Math.floor((d.getTime() - startDate.getTime()) / oneDayMs);
    const weekNum = Math.min(ay.totalWeeks, Math.floor(diffDays / 7) + 1);
    const percent = Math.min(100, Math.max(1, Math.round((weekNum / ay.totalWeeks) * 100)));
    const remainingWeeks = Math.max(0, ay.totalWeeks - weekNum);
    const isSem1 = weekNum <= ay.semester1Weeks;
    const semName = isSem1 ? 'Học kỳ 1' : 'Học kỳ 2';
    const semWeek = isSem1 ? weekNum : (weekNum - ay.semester1Weeks);

    return {
      status: 'in_progress',
      academicYear: ay,
      currentWeek: weekNum,
      totalWeeks: ay.totalWeeks,
      percentage: percent,
      semester: semName,
      semesterWeek: semWeek,
      remainingWeeks,
      badgeText: `📌 Tuần học: Tuần ${weekNum}/${ay.totalWeeks} • ${semName}`,
      desc: `Đã hoàn thành ${percent}% năm học • Còn khoảng ${remainingWeeks} tuần học nữa bế giảng.`
    };
  }

  // 4. Đã kết thúc năm học
  return {
    status: 'completed',
    academicYear: ay,
    currentWeek: ay.totalWeeks,
    totalWeeks: ay.totalWeeks,
    percentage: 100,
    badgeText: `🏆 Đã kết thúc năm học ${ay.label}`,
    desc: `Năm học đã bế giảng vào ngày ${formatDateDisplay(ay.endDate)}. Chúc mừng bạn đã hoàn thành chương trình!`
  };
}

function renderAcademicYearProgressWidget() {
  const container = document.getElementById('academicYearWidget');
  if (!container) return;

  const ay = getActiveAcademicYear();
  const prog = getAcademicProgress(selectedDate);
  const isComparingToday = (toDateStringKey(selectedDate) === toDateStringKey(new Date()));

  const optionsHtml = Object.values(ACADEMIC_YEARS).map(y => `
    <option value="${y.id}" ${y.id === ay.id ? 'selected' : ''}>
      ${escapeHtml(y.label)} ${y.id === '2026-2027' ? '★' : ''}
    </option>
  `).join('');

  container.innerHTML = `
    <div class="academic-year-top-row">
      <div class="academic-year-meta">
        <span style="font-size: 0.88rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
          🎓 Niên khóa:
        </span>
        <select id="academicYearSelect" class="academic-year-select" onchange="switchAcademicYear(this.value)" title="Chọn niên khóa để chuyển đổi cấp lớp">
          ${optionsHtml}
        </select>
        <span class="academic-week-badge">
          ${prog.badgeText}
        </span>
      </div>

      <div class="academic-year-dates-info">
        <span>🚩 Khai giảng: <strong>${formatDateDisplay(ay.openingDate)}</strong></span>
        <span>•</span>
        <span>🏁 Bế giảng: <strong>${formatDateDisplay(ay.endDate)}</strong></span>
      </div>
    </div>

    <div class="academic-progress-container">
      <div class="academic-progress-labels">
        <span>
          ${prog.status === 'in_progress'
            ? `Tiến độ niên khóa: <strong>Tuần ${prog.currentWeek}/${prog.totalWeeks}</strong> (${prog.semester})`
            : `<span>${prog.desc}</span>`}
          ${!isComparingToday ? `<small style="opacity: 0.75; margin-left: 6px;">(Đang tính theo ngày chọn)</small>` : ''}
        </span>
        <span style="font-weight: 700; color: var(--primary);">
          ${prog.percentage}% hoàn thành
        </span>
      </div>
      <div class="academic-progress-track">
        <div class="academic-progress-fill" style="width: ${prog.percentage}%"></div>
      </div>
    </div>
  `;
}

// Expose academic year utilities to window
window.C7_ACADEMIC_YEARS = ACADEMIC_YEARS;
window.getActiveAcademicYear = getActiveAcademicYear;
window.switchAcademicYear = switchAcademicYear;
window.getAcademicProgress = getAcademicProgress;

// ============= SCHEDULE EVENTS HELPERS =============
function saveScheduleEvents() {
  localStorage.setItem('c7aio_schedule_events', JSON.stringify(scheduleEvents));
  if (typeof saveSharedScheduleEvents === 'function') {
    saveSharedScheduleEvents(scheduleEvents);
  }
}

function getEventsForWeek(weekKey) {
  return Array.isArray(scheduleEvents[weekKey]) ? scheduleEvents[weekKey] : [];
}

function getEventsForDayInWeek(weekKey, day) {
  return getEventsForWeek(weekKey).filter(e => !e.day || e.day === day);
}

function getEventsForDate(dateKey) {
  // Find which weekKey owns this date
  for (const [wKey, meta] of Object.entries(weekMetadata)) {
    if (meta && meta.startDate && meta.endDate && dateKey >= meta.startDate && dateKey <= meta.endDate) {
      const dayDate = parseLocalDate(dateKey);
      const dayName = getDayNameFromDate(dayDate);
      return getEventsForDayInWeek(wKey, dayName);
    }
  }
  return [];
}

function generateEventId() {
  return 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const EVENT_TYPE_ICONS = {
  schedule_change: '🔄',
  day_off: '🚫',
  extra_class: '➕',
  room_change: '🚪',
  info: '📋'
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

  if (typeof onSharedScheduleEventsChanged === 'function') {
    onSharedScheduleEventsChanged((data) => {
      if (data && typeof data === 'object') {
        scheduleEvents = data;
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

  const ay = getActiveAcademicYear();
  // TKB số 1 chính thức áp dụng từ ngày startDate của niên khóa
  if (!weekMetadata['week-1'] || weekMetadata['week-1'].startDate === '2026-08-24' || (weekMetadata['week-1'].academicYear && weekMetadata['week-1'].academicYear !== ay.id)) {
    weekMetadata['week-1'] = {
      name: 'Tuần 1',
      className: ay.grade,
      academicYear: ay.id,
      startDate: ay.startDate,
      endDate: toDateStringKey(new Date(parseLocalDate(ay.startDate).getFullYear(), parseLocalDate(ay.startDate).getMonth(), parseLocalDate(ay.startDate).getDate() + 6)),
      ...(weekMetadata['week-1'] || {})
    };
    weekMetadata['week-1'].startDate = ay.startDate;
    weekMetadata['week-1'].className = ay.grade;
    weekMetadata['week-1'].academicYear = ay.id;
  }

  ensureSemesterWeeksMetadata();
}

function ensureSemesterWeeksMetadata() {
  const ay = getActiveAcademicYear();
  const baseStart = (weekMetadata['week-1'] && weekMetadata['week-1'].startDate && weekMetadata['week-1'].startDate !== '2026-08-24' && weekMetadata['week-1'].academicYear === ay.id)
    ? weekMetadata['week-1'].startDate
    : ay.startDate;
  const startD = parseLocalDate(baseStart);

  // Sinh thông tin tuần tự động cho toàn bộ 35 tuần của niên khóa (TKB số 1 áp dụng nền tảng)
  const totalWeeks = ay.totalWeeks || 35;
  for (let i = 1; i <= totalWeeks; i++) {
    const wKey = `week-${i}`;
    const s = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() + (i - 1) * 7);
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
    // Always overwrite startDate/endDate/academicYear to fix stale-cache bugs
    weekMetadata[wKey] = {
      name: `Tuần ${i}`,
      ...(weekMetadata[wKey] || {}),
      startDate: toDateStringKey(s),
      endDate: toDateStringKey(e),
      className: ay.grade,
      academicYear: ay.id,
    };
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

// Alias used in HTML buttons
function jumpToFirstWeek() { goToSemesterStart(); }

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
  // Mặc định luôn ưu tiên Tuần 1 nếu ngày hiện tại chưa đến hoặc nằm ngoài các tuần
  if (weekMetadata['week-1'] || schedules['week-1']) {
    currentWeekKey = 'week-1';
    return;
  }
  const keys = Object.keys(schedules);
  if (keys.length > 0) currentWeekKey = keys[0];
}

function resolveWeekFromDate(date) {
  const matchedKey = getWeekKeyForDate(date);
  currentWeekKey = matchedKey;
}

function renderAll() {
  renderAcademicYearProgressWidget();
  populateClassFilterOptions();
  renderCalendar();
  renderWeekChips();
  updateCurrentWeekBanner();
  renderWeekEventsLogCard();

  // Sync 4 view mode buttons
  ['week', 'day', 'month', 'year'].forEach(m => {
    const btn = document.getElementById(`btnView${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (btn) btn.classList.toggle('active', scheduleViewMode === m);
  });

  const weekGrid = document.getElementById('timetableGrid');
  const dayCard = document.getElementById('dayViewContainer');
  const monthCard = document.getElementById('monthViewContainer');
  const yearCard = document.getElementById('yearViewContainer');
  const miniCalCard = document.getElementById('miniCalendarSection');
  const weekChipsSec = document.getElementById('weekChipsSection');

  const isMonthOrYear = (scheduleViewMode === 'month' || scheduleViewMode === 'year');
  if (miniCalCard) miniCalCard.style.display = isMonthOrYear ? 'none' : 'block';
  if (weekChipsSec) weekChipsSec.style.display = isMonthOrYear ? 'none' : 'block';

  if (weekGrid) weekGrid.style.display = scheduleViewMode === 'week' ? 'grid' : 'none';
  if (dayCard) dayCard.style.display = scheduleViewMode === 'day' ? 'flex' : 'none';
  if (monthCard) monthCard.style.display = scheduleViewMode === 'month' ? 'block' : 'none';
  if (yearCard) yearCard.style.display = scheduleViewMode === 'year' ? 'block' : 'none';

  if (scheduleViewMode === 'day') renderDayView();
  else if (scheduleViewMode === 'week') renderTimetable();
  else if (scheduleViewMode === 'month') renderMonthView();
  else if (scheduleViewMode === 'year') renderYearView();
}

function switchScheduleViewMode(mode) {
  scheduleViewMode = mode;
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

  const classesSet = new Set(STANDARD_CLASSES);
  
  // Quét thêm từ metadata tuần
  Object.values(weekMetadata).forEach(m => {
    if (m && m.className) classesSet.add(m.className);
  });

  // Quét thêm từ các tiết học trong schedules
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

  const allClasses = Array.from(classesSet);
  const k10 = allClasses.filter(c => c.startsWith('10')).sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));
  const k11 = allClasses.filter(c => c.startsWith('11')).sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));
  const k12 = allClasses.filter(c => c.startsWith('12')).sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));
  const others = allClasses.filter(c => !c.startsWith('10') && !c.startsWith('11') && !c.startsWith('12')).sort();

  const currentVal = selectedClassFilter;

  let html = '<option value="">-- Xem tất cả lớp (36 lớp) --</option>';
  if (k11.length > 0) {
    html += `<optgroup label="Khối 11 (Mặc định)">` +
      k11.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>Lớp ${c} ${c === '11C7' ? '★' : ''}</option>`).join('') +
      `</optgroup>`;
  }
  if (k10.length > 0) {
    html += `<optgroup label="Khối 10">` +
      k10.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>Lớp ${c}</option>`).join('') +
      `</optgroup>`;
  }
  if (k12.length > 0) {
    html += `<optgroup label="Khối 12">` +
      k12.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>Lớp ${c}</option>`).join('') +
      `</optgroup>`;
  }
  if (others.length > 0) {
    html += `<optgroup label="Lớp khác">` +
      others.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>Lớp ${c}</option>`).join('') +
      `</optgroup>`;
  }

  select.innerHTML = html;
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
    const isBeforeSemester = selectedDateKey < firstWeekStart;

    let title = meta.name ? `${meta.name} (TKB số 1)` : 'Thời khóa biểu số 1';
    if (isBeforeSemester) {
      title = `${meta.name || 'Tuần 1'} • TKB số 1`;
    }
    const classBadge = selectedClassFilter ? ` • Lớp ${selectedClassFilter}` : ' • Toàn trường (36 lớp)';
    const dateRange = (meta.startDate && meta.endDate) ? ` (${formatDateDisplay(meta.startDate)} → ${formatDateDisplay(meta.endDate)})` : '';
    const modeBadge = scheduleViewMode === 'day' 
      ? ` • Xem: <strong>${DAY_LABELS[getDayNameFromDate(selectedDate)]}</strong>` 
      : ` • Xem: <strong>Cả tuần</strong>`;
    banner.innerHTML = `🗓️ Đang hiển thị: <strong>${escapeHtml(title)}</strong>${classBadge}${dateRange}${modeBadge}`;
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

  // Helper to build calendar cell
  const today = new Date();
  const todayStr = toDateStringKey(today);
  const selectedStr = toDateStringKey(selectedDate);

  function createCalCell(dateObj, isOtherMonth) {
    const dateKey = toDateStringKey(dateObj);
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell' + (isOtherMonth ? ' other-month' : '');

    const isToday = (dateKey === todayStr);
    const isSelected = (dateKey === selectedStr);

    if (isToday) cell.classList.add('today');
    if (isSelected) cell.classList.add('selected');

    // Day number
    const numSpan = document.createElement('span');
    numSpan.className = 'cal-day-num';
    numSpan.textContent = dateObj.getDate();
    cell.appendChild(numSpan);

    // Dots row
    const dotRow = document.createElement('div');
    dotRow.className = 'cal-dot-row';

    // Class dot (blue) - CHỈ hiển thị nếu ngày này thuộc về một tuần học đã xếp lịch
    const targetWeekKey = getWeekKeyForDate(dateObj);
    if (targetWeekKey) {
      const targetSchedule = getEffectiveSchedule(targetWeekKey);
      const dayName = getDayNameFromDate(dateObj);
      let dayClasses = targetSchedule[dayName] || [];
      if (selectedClassFilter) {
        dayClasses = dayClasses.filter(c => !c.className || c.className === selectedClassFilter);
      }
      if (dayClasses.length > 0) {
        const dot = document.createElement('span');
        dot.className = 'cal-class-dot';
        const weekName = weekMetadata[targetWeekKey]?.name || targetWeekKey;
        dot.title = `${dayClasses.length} tiết học (${DAY_LABELS[dayName] || ''} - ${weekName})`;
        dotRow.appendChild(dot);
      }
    }

    // Event dot (orange)
    const dayEvents = getEventsForDate(dateKey);
    if (dayEvents.length > 0) {
      const eDot = document.createElement('span');
      eDot.className = 'cal-event-dot';
      eDot.title = dayEvents.map(e => e.title).join('; ');
      dotRow.appendChild(eDot);
    }

    cell.appendChild(dotRow);

    cell.onclick = () => {
      selectedDate = dateObj;
      currentDate = new Date(selectedDate);
      resolveWeekFromDate(selectedDate);
      scheduleViewMode = 'day';
      renderAll();
    };

    return cell;
  }

  // Prev month padding
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLast - i);
    matrix.appendChild(createCalCell(prevDate, true));
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    matrix.appendChild(createCalCell(dateObj, false));
  }

  // Next month padding
  const totalRendered = startingDay + daysInMonth;
  const nextPadding = (7 - (totalRendered % 7)) % 7;
  for (let n = 1; n <= nextPadding; n++) {
    const nextDate = new Date(year, month + 1, n);
    matrix.appendChild(createCalCell(nextDate, true));
  }
}

function prevMonth() {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  if (scheduleViewMode === 'month') {
    renderMonthView();
  } else {
    renderCalendar();
  }
}

function nextMonth() {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  if (scheduleViewMode === 'month') {
    renderMonthView();
  } else {
    renderCalendar();
  }
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
    const events = getEventsForWeek(wKey);
    const hasMod = events.length > 0;
    const badgeHtml = hasMod 
      ? `<span class="week-chip-badge" title="Tuần này có ${events.length} thay đổi lịch">⚡${events.length}</span>` 
      : '';
    return `
      <button class="week-chip-btn ${isActive ? 'active' : ''} ${hasMod ? 'has-changes' : ''}" onclick="selectWeekKey('${wKey}')">
        ${escapeHtml(name)}${badgeHtml}
      </button>
    `;
  }).join('') + (checkPermission('manage_schedule') ? `
    <button class="week-chip-btn" style="border: 1px dashed var(--primary); color: var(--primary);" onclick="addNewWeek()">
      + Thêm tuần mới
    </button>
  ` : '');

  if (currentWeekKey) {
    const activeChip = container.querySelector('.week-chip-btn.active');
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }
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
  } else {
    // Ngày này nằm ngoài tất cả các tuần học đã định nghĩa (ví dụ trước 07/09/2026 hoặc sau 29/05/2027)
    rawClasses = [];
    weekTitle = isBeforeSemester ? 'Chưa vào năm học' : 'Ngoài năm học';
  }

  // Gắn originalIndex để sửa/xóa chuẩn xác kể cả khi đang lọc lớp
  const classesWithIndex = rawClasses.map((c, originalIndex) => ({ ...c, originalIndex }));
  let classes = selectedClassFilter
    ? classesWithIndex.filter(c => !c.className || c.className === selectedClassFilter)
    : classesWithIndex;

  // Events cho ngày này
  const dayEventsAll = matchedWeekKey ? getEventsForDayInWeek(matchedWeekKey, dayName) : getEventsForDate(selectedDateKey);

  let emptyMessageTitle = 'Không có tiết học';
  let emptyMessageDesc = 'Ngày này không có tiết học hoặc chưa được xếp thời khóa biểu.';
  let jumpToStartBtn = '';

  if (!matchedWeekKey) {
    if (isBeforeSemester) {
      emptyMessageTitle = 'Chưa bắt đầu năm học';
      emptyMessageDesc = `Năm học 2026 - 2027 chính thức bắt đầu từ <strong>Thứ Hai, ngày 07/09/2026</strong> với <strong>Thời khóa biểu số 1</strong>. Ngày này chưa có tiết học nào.`;
      jumpToStartBtn = `
        <div style="margin-top: 14px;">
          <button type="button" class="c7-btn c7-btn-primary" onclick="jumpToFirstWeek()" style="font-weight: 700;">
            👉 Chuyển đến TKB số 1 (Bắt đầu từ 07/09/2026)
          </button>
        </div>`;
    } else {
      emptyMessageTitle = 'Ngoài thời gian năm học';
      emptyMessageDesc = 'Thời gian này nằm ngoài khung năm học đã định nghĩa. Không có tiết học nào.';
    }
  } else {
    emptyMessageTitle = 'Không có tiết học';
    emptyMessageDesc = `${DAY_LABELS[dayName]} không có tiết học nào được xếp thời khóa biểu.`;
  }

  // Event banners HTML
  const eventBannersHtml = dayEventsAll.length > 0
    ? `<div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">` +
      dayEventsAll.map(ev => {
        const icon = EVENT_TYPE_ICONS[ev.type] || '📋';
        const sev = ev.severity || 'info';
        const canManage = checkPermission('manage_schedule');
        return `
          <div class="event-banner ${sev}">
            <span class="event-banner-icon">${icon}</span>
            <div class="event-banner-body">
              <div class="event-banner-title">${escapeHtml(ev.title)}</div>
              ${ev.note ? `<div class="event-banner-note">${escapeHtml(ev.note)}</div>` : ''}
            </div>
            ${canManage ? `<button class="btn-action-pill" style="flex-shrink:0;font-size:0.7rem;" onclick="editEvent('${matchedWeekKey}','${ev.id}')">✏️</button>` : ''}
          </div>`;
      }).join('') + `</div>` : '';

  const classesHtml = classes.length === 0
    ? `<div class="empty-widget" style="padding: 2.5rem 1rem; text-align: center; color: var(--text-sub); width: 100%;">
        <span style="font-size: 2.8rem;">${isBeforeSemester ? '⏳' : '🏖️'}</span>
        <h4 style="font-size: 1.1rem; margin: 8px 0 4px; color: var(--text-main);">${emptyMessageTitle}</h4>
        <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto;">${emptyMessageDesc}</p>
        ${jumpToStartBtn}
      </div>`
    : `<div class="day-classes-list-grid" style="width: 100%;">` + classes.map(c => {
        const color = getSubjectColor(c.name || c.subject);
        // Find events specifically for this period
        const periodEvents = matchedWeekKey
          ? getEventsForWeek(matchedWeekKey).filter(e =>
              (!e.day || e.day === dayName) &&
              (e.periodIndex !== null && e.periodIndex !== undefined && parseInt(e.periodIndex) === c.originalIndex)
            )
          : [];
        const isCancelled = periodEvents.some(e => e.type === 'day_off');
        const isChanged = periodEvents.some(e => e.type === 'schedule_change');
        const periodBadges = periodEvents.map(ev =>
          `<span class="event-inline-badge ${ev.severity === 'danger' || ev.type === 'day_off' ? 'danger' : ''}">${EVENT_TYPE_ICONS[ev.type] || '📋'} ${escapeHtml(ev.title)}</span>`
        ).join('');
        return `
          <div class="day-class-card-detailed ${isCancelled ? 'period-cancelled' : ''} ${isChanged ? 'period-changed' : ''}" style="border-left-color: ${color}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <span class="class-card-time">⏰ ${escapeHtml(c.time || '')}</span>
              ${c.className ? `<span class="class-card-grade-badge">🏫 Lớp ${escapeHtml(c.className)}</span>` : ''}
            </div>
            <div class="class-card-name" style="font-size: 1.05rem;">
              ${isCancelled ? `<s>${escapeHtml(c.name || '')}</s> <span style="font-size:0.75rem;color:#ef4444;font-weight:700;">(Đã báo nghỉ)</span>` : escapeHtml(c.name || '')}
            </div>
            ${c.subject ? `<div class="class-card-sub">${escapeHtml(c.subject)}</div>` : ''}
            ${periodBadges ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;">${periodBadges}</div>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span class="class-card-room">📍 ${escapeHtml(c.room || 'P.204')}</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn-action-pill" onclick="openEventModal('${matchedWeekKey || currentWeekKey}', '${dayName}', ${c.originalIndex}, 'schedule_change', 'Đổi lịch môn ${escapeHtml(c.name || '')}')" title="Đổi lịch/phòng cho tiết này trong tuần (tính vào log thay đổi)">🔄 Đổi lịch</button>
                <button type="button" class="btn-action-pill danger" onclick="openEventModal('${matchedWeekKey || currentWeekKey}', '${dayName}', ${c.originalIndex}, 'day_off', 'Nghỉ tiết ${escapeHtml(c.name || '')}')" title="Báo nghỉ/bỏ tiết này trong tuần (tính vào log thay đổi)">🚫 Bỏ tiết</button>
                ${checkPermission('manage_schedule') ? `
                  <button type="button" class="btn-action-pill" onclick="editClass('${dayName}', ${c.originalIndex})" title="Sửa TKB gốc">✏️ Gốc</button>
                  <button type="button" class="btn-action-pill danger" onclick="deleteClass('${dayName}', ${c.originalIndex})" title="Xóa TKB gốc">🗑️</button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('') + (dayEventsAll.filter(e => e.type === 'extra_class' && (e.periodIndex === null || e.periodIndex === undefined)).map(ev => `
        <div class="day-class-card-detailed extra-class-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <span class="class-card-time" style="color: #059669; font-weight: 700;">⏰ Tiết học thêm / bù tuần này</span>
            <span class="event-inline-badge" style="background: rgba(16,185,129,0.2); color: #047857; border-color: rgba(16,185,129,0.4);">➕ Tăng cường</span>
          </div>
          <div class="class-card-name" style="font-size: 1.05rem; color: #065f46; font-weight: 800;">${escapeHtml(ev.title)}</div>
          ${ev.note ? `<div class="class-card-sub" style="color: #047857;"><em>📝 ${escapeHtml(ev.note)}</em></div>` : ''}
          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
            <button type="button" class="btn-action-pill" onclick="editEvent('${matchedWeekKey || currentWeekKey}','${ev.id}')" title="Sửa tiết này">✏️ Sửa</button>
            <button type="button" class="btn-action-pill danger" onclick="deleteEventById('${matchedWeekKey || currentWeekKey}','${ev.id}')" title="Hủy tiết này">🗑️ Hủy</button>
          </div>
        </div>
      `).join('')) + `</div>`;

  container.innerHTML = `
    <div class="day-view-header-bar">
      <div class="day-view-title-block">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0;">📅 ${DAY_LABELS[dayName]} (${dateStr})</h3>
          <span style="background: rgba(99, 102, 241, 0.15); color: var(--primary); border-radius: 99px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700;">${escapeHtml(weekTitle)}</span>
          ${isToday ? '<span style="background: var(--primary); color: white; border-radius: 99px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700;">Hôm nay</span>' : ''}
          ${selectedClassFilter ? `<span class="class-card-grade-badge" style="font-size: 0.75rem;">Lớp ${escapeHtml(selectedClassFilter)}</span>` : ''}
        </div>
        <span style="font-size: 0.85rem; color: var(--text-sub);">Thời khóa biểu chi tiết trong ngày • <strong>${classes.length}</strong> tiết học${dayEventsAll.length > 0 ? ` • <span style="color:#f97316;font-weight:700;">${dayEventsAll.length} thông báo thay đổi</span>` : ''}</span>
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
        <button class="c7-btn c7-btn-primary" style="background: linear-gradient(135deg, #f97316, #ea580c); border: none; color: white;" onclick="openEventModal('${matchedWeekKey || currentWeekKey}', '${dayName}', null, 'extra_class', 'Thêm tiết học ${DAY_LABELS[dayName]}')">
          ➕ Thêm tiết tuần này
        </button>
        <button class="c7-btn c7-btn-secondary" style="border-color:#f97316;color:#f97316;" onclick="openEventModal('${matchedWeekKey || currentWeekKey}', '${dayName}', null, 'schedule_change')">
          📢 Đổi lịch ngày này
        </button>
        ${checkPermission('manage_schedule') ? `
          <button class="c7-btn c7-btn-secondary" onclick="openAddClassForCurrentDay('${dayName}')" title="Thêm vào TKB gốc">
            + Thêm tiết TKB gốc
          </button>
        ` : ''}
      </div>
    </div>
    ${eventBannersHtml}
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

    const dayEventsInWeek = getEventsForDayInWeek(currentWeekKey, day);

    const classesHtml = classes.length === 0
      ? '<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding: 14px 0;">Không có tiết học</div>'
      : classes.map(c => {
          const color = getSubjectColor(c.name || c.subject);
          const periodEvts = dayEventsInWeek.filter(e =>
            (e.periodIndex !== null && e.periodIndex !== undefined && parseInt(e.periodIndex) === c.originalIndex)
          );
          const isCancelled = periodEvts.some(e => e.type === 'day_off');
          const isChanged = periodEvts.some(e => e.type === 'schedule_change');
          const pBadges = periodEvts.map(ev =>
            `<span class="event-inline-badge ${ev.severity === 'danger' || ev.type === 'day_off' ? 'danger' : ''}">${EVENT_TYPE_ICONS[ev.type] || '📋'} ${escapeHtml(ev.title)}</span>`
          ).join('');

          return `
            <div class="class-card-item ${isCancelled ? 'period-cancelled' : ''} ${isChanged ? 'period-changed' : ''}" style="border-left-color: ${color}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="class-card-time">⏰ ${escapeHtml(c.time || '')}</span>
                ${c.className ? `<span class="class-card-grade-badge">🏫 ${escapeHtml(c.className)}</span>` : ''}
              </div>
              <div class="class-card-name">
                ${isCancelled ? `<s>${escapeHtml(c.name || '')}</s> <span style="font-size:0.75rem;color:#ef4444;font-weight:700;">(Đã báo nghỉ)</span>` : escapeHtml(c.name || '')}
              </div>
              ${c.subject ? `<div class="class-card-sub">${escapeHtml(c.subject)}</div>` : ''}
              ${pBadges ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;">${pBadges}</div>` : ''}
              <div class="class-card-room">📍 ${escapeHtml(c.room || 'Chưa rõ')}</div>
              <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                <button type="button" class="btn-action-pill" onclick="openEventModal('${currentWeekKey}', '${day}', ${c.originalIndex}, 'schedule_change', 'Đổi lịch môn ${escapeHtml(c.name || '')}')" title="Đổi lịch/phòng cho tiết này trong tuần (tính vào log thay đổi)">🔄 Đổi</button>
                <button type="button" class="btn-action-pill danger" onclick="openEventModal('${currentWeekKey}', '${day}', ${c.originalIndex}, 'day_off', 'Nghỉ tiết ${escapeHtml(c.name || '')}')" title="Báo nghỉ/bỏ tiết này trong tuần (tính vào log thay đổi)">🚫 Bỏ tiết</button>
                ${checkPermission('manage_schedule') ? `
                  <button type="button" class="btn-action-pill" onclick="editClass('${day}', ${c.originalIndex})" title="Sửa TKB gốc">✏️ Gốc</button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');

    const extraClassesColHtml = dayEventsInWeek
      .filter(e => e.type === 'extra_class' && (e.periodIndex === null || e.periodIndex === undefined))
      .map(ev => `
        <div class="class-card-item extra-class-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="class-card-time" style="color: #059669; font-weight: 700;">⏰ Tiết học thêm tuần này</span>
            <span class="event-inline-badge" style="background: rgba(16,185,129,0.2); color: #047857; font-size:0.65rem;">➕ Bù</span>
          </div>
          <div class="class-card-name" style="color: #065f46; font-weight: 700;">${escapeHtml(ev.title)}</div>
          ${ev.note ? `<div class="class-card-sub" style="color: #047857;"><em>${escapeHtml(ev.note)}</em></div>` : ''}
          <div style="display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end;">
            <button type="button" class="btn-action-pill" onclick="editEvent('${currentWeekKey}','${ev.id}')">✏️ Sửa</button>
            <button type="button" class="btn-action-pill danger" onclick="deleteEventById('${currentWeekKey}','${ev.id}')">🗑️ Hủy</button>
          </div>
        </div>
      `).join('');

    return `
      <div class="day-timetable-col ${isToday ? 'is-today-col' : ''} ${isSelected ? 'is-selected-col' : ''} ${dayEventsInWeek.length > 0 ? 'has-events' : ''}">
        <div class="day-col-header" style="cursor: pointer;" onclick="selectDayColumn('${day}')" title="Click để xem chi tiết ${DAY_LABELS[day]}">
          <div class="day-col-title">
            <span>${DAY_LABELS[day]} <small style="font-size: 0.8rem; font-weight: 500; opacity: 0.8;">(${dateFormatted})</small></span>
            ${isToday ? '<span style="background: var(--primary); color: white; border-radius: 99px; padding: 2px 6px; font-size: 0.7rem; font-weight: 700;">Hôm nay</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${dayEventsInWeek.length > 0 ? `<span class="day-mod-badge" title="Có ${dayEventsInWeek.length} thay đổi lịch trong ngày này">📢 ${dayEventsInWeek.length}</span>` : ''}
            <span style="font-size: 0.8rem; color: var(--text-sub); font-weight: 700;">${classes.length} tiết 🔍</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${classesHtml}
          ${extraClassesColHtml}
          <button type="button" class="btn-add-period-col" onclick="openEventModal('${currentWeekKey}', '${day}', null, 'extra_class', 'Thêm tiết học ${DAY_LABELS[day]}')" title="Thêm tiết học bù / tăng cường cho thứ này trong tuần (tính vào log thay đổi)">
            + Thêm tiết tuần này
          </button>
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

// ============= MONTH VIEW =============
function renderMonthView() {
  const container = document.getElementById('monthViewContainer');
  if (!container) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const weekDayLabels = ['CN','T2','T3','T4','T5','T6','T7'];
  const today = new Date();
  const todayStr = toDateStringKey(today);
  const selectedStr = toDateStringKey(selectedDate);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=CN

  // Subject color palette for mini chips
  const CHIP_COLORS = ['#6366f1','#22c55e','#f97316','#ec4899','#06b6d4','#a855f7','#eab308'];

  let cells = '';

  // Prev month padding
  for (let i = startDow - 1; i >= 0; i--) {
    cells += `<div class="month-cell other-month"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateKey = toDateStringKey(dateObj);
    const dayName = getDayNameFromDate(dateObj);
    const isToday = dateKey === todayStr;
    const isSelected = dateKey === selectedStr;
    const wKey = getWeekKeyForDate(dateObj);

    let classChips = '';
    if (wKey) {
      const sched = getEffectiveSchedule(wKey);
      let dayList = (sched[dayName] || []);
      if (selectedClassFilter) dayList = dayList.filter(c => !c.className || c.className === selectedClassFilter);
      dayList.forEach((c, i) => {
        const col = getSubjectColor(c.name || c.subject) || CHIP_COLORS[i % CHIP_COLORS.length];
        const timeShort = c.time ? `[${c.time.split(' ')[0]}] ` : '';
        classChips += `<div class="month-class-chip" style="background:${col};" title="${escapeHtml(c.name || '')} (${c.time || ''} - ${c.room || ''})">${timeShort}${escapeHtml(c.name || '')}</div>`;
      });
    }

    const dayEvents = getEventsForDate(dateKey);
    let eventChips = '';
    dayEvents.forEach(ev => {
      eventChips += `<div class="month-event-chip" title="${escapeHtml(ev.title)}: ${escapeHtml(ev.note || '')}">${EVENT_TYPE_ICONS[ev.type] || '📋'} ${escapeHtml(ev.title)}</div>`;
    });

    cells += `
      <div class="month-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
           onclick="selectedDate=new Date(${year},${month},${d});currentDate=new Date(selectedDate);resolveWeekFromDate(selectedDate);scheduleViewMode='day';renderAll();">
        <div class="month-cell-num">${d}</div>
        <div class="month-cell-class-chips">${classChips}${eventChips}</div>
      </div>`;
  }

  // Next padding
  const total = startDow + daysInMonth;
  for (let n = 1; n <= (7 - (total % 7)) % 7; n++) {
    cells += `<div class="month-cell other-month"></div>`;
  }

  container.innerHTML = `
    <div class="month-view-container">
      <div class="month-view-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="month-nav-btn" onclick="prevMonth();scheduleViewMode='month';renderAll();">←</button>
          <h2 style="font-size:1.2rem;font-weight:800;">${monthNames[month]}, ${year}</h2>
          <button class="month-nav-btn" onclick="nextMonth();scheduleViewMode='month';renderAll();">→</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:0.78rem;color:var(--text-sub);">
            <span style="display:inline-block;width:10px;height:10px;background:#6366f1;border-radius:2px;margin-right:4px;"></span>Tiết học
            <span style="display:inline-block;width:10px;height:10px;background:rgba(249,115,22,0.2);border-radius:2px;margin-left:8px;margin-right:4px;border:1px solid #f97316;"></span>Đổi lịch
          </span>
        </div>
      </div>
      <div class="month-view-weekdays">${weekDayLabels.map(l => `<div>${l}</div>`).join('')}</div>
      <div class="month-view-grid">${cells}</div>
    </div>
  `;
}

// ============= YEAR VIEW =============
function renderYearView() {
  const container = document.getElementById('yearViewContainer');
  if (!container) return;

  const ay = getActiveAcademicYear();
  const today = new Date();
  const todayStr = toDateStringKey(today);
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

  let monthCards = '';

  // Thứ tự tháng theo niên khóa Việt Nam: Tháng 9 (m=8) -> Tháng 8 năm sau (m=7)
  const schoolYearMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];

  for (const m of schoolYearMonths) {
    const realYear = (m >= 8) ? parseInt(ay.id.split('-')[0]) : parseInt(ay.id.split('-')[1]);
    const firstDay = new Date(realYear, m, 1);
    const daysInMonth = new Date(realYear, m + 1, 0).getDate();
    const startDow = firstDay.getDay();
    const isCurrentMonth = (today.getMonth() === m && today.getFullYear() === realYear);

    let miniCells = '';
    // weekday header
    for (let h = 0; h < 7; h++) miniCells += `<div class="year-mini-day" style="font-size:0.45rem;color:var(--text-muted);font-weight:700;">${['S','M','T','W','T','F','S'][h]}</div>`;
    // empty padding
    for (let pad = 0; pad < startDow; pad++) miniCells += `<div class="year-mini-day"></div>`;

    let classDays = 0, eventDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(realYear, m, d);
      const dateKey = toDateStringKey(dateObj);
      const dayName = getDayNameFromDate(dateObj);
      const wKey = getWeekKeyForDate(dateObj);
      const isToday = dateKey === todayStr;
      let classes = 'year-mini-day';
      let hasC = false, hasE = false;
      if (wKey) {
        const sched = getEffectiveSchedule(wKey);
        let dayList = sched[dayName] || [];
        if (selectedClassFilter) dayList = dayList.filter(c => !c.className || c.className === selectedClassFilter);
        hasC = dayList.length > 0;
      }
      hasE = getEventsForDate(dateKey).length > 0;
      if (isToday) classes += ' is-today';
      else if (hasE) { classes += ' has-event'; eventDays++; }
      else if (hasC) { classes += ' has-class'; classDays++; }
      miniCells += `<div class="${classes}" title="${dateKey}">${d}</div>`;
    }

    monthCards += `
      <div class="year-month-card ${isCurrentMonth ? 'active-month' : ''}"
           onclick="currentDate=new Date(${realYear},${m},1);scheduleViewMode='month';renderAll();">
        <div class="year-month-name">${monthNames[m]} ${realYear}</div>
        <div class="year-month-mini-cal">${miniCells}</div>
        <div class="year-month-stats">
          <span>📅 ${classDays} ngày học</span>
          ${eventDays > 0 ? `<span style="color:#f97316;">📢 ${eventDays} đổi lịch</span>` : '<span style="opacity:0.5;">Chưa có đổi lịch</span>'}
        </div>
      </div>`;
  }

  container.innerHTML = `
    <div class="year-view-container">
      <div class="year-view-title">📆 Niên khóa ${ay.label} — Tổng quan 12 tháng</div>
      <div class="year-view-grid">${monthCards}</div>
    </div>
  `;
}

// ============= WEEK EVENTS LOG CARD (NHẬT KÝ THAY ĐỔI LỊCH) =============
function renderWeekEventsLogCard() {
  const container = document.getElementById('weekEventsLogCard');
  if (!container) return;

  const events = getEventsForWeek(currentWeekKey);
  if (events.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  const meta = weekMetadata[currentWeekKey] || {};
  const weekName = meta.name || currentWeekKey;

  const itemsHtml = events.map(ev => {
    const icon = EVENT_TYPE_ICONS[ev.type] || '📋';
    const dayLabel = ev.day ? (DAY_LABELS[ev.day] || ev.day) : 'Cả tuần';
    const periodLabel = (ev.periodIndex !== null && ev.periodIndex !== undefined && ev.periodIndex !== '') 
      ? `Tiết ${parseInt(ev.periodIndex) + 1}` 
      : 'Tất cả tiết';
    const isDanger = ev.severity === 'danger' || ev.type === 'day_off';

    return `
      <div class="week-event-item ${isDanger ? 'danger' : ''}">
        <div class="week-event-info">
          <span class="week-event-title-text">${icon} ${escapeHtml(ev.title)}</span>
          <span class="week-event-sub-text">📅 ${dayLabel} • ⏰ ${periodLabel} ${ev.note ? `• <em>${escapeHtml(ev.note)}</em>` : ''}</span>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button type="button" class="btn-action-pill" onclick="editEvent('${currentWeekKey}','${ev.id}')" title="Chỉnh sửa">✏️ Sửa</button>
          <button type="button" class="btn-action-pill danger" onclick="deleteEventById('${currentWeekKey}','${ev.id}')" title="Hủy thay đổi này">🗑️ Hủy</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="week-events-header">
      <div class="week-events-title">
        <span>📢 Nhật ký thay đổi lịch — ${escapeHtml(weekName)} (${events.length} thay đổi ghi nhận)</span>
      </div>
      <button type="button" class="c7-btn c7-btn-secondary" style="font-size:0.8rem;padding:4px 10px;" onclick="openEventModal('${currentWeekKey}')">
        + Thêm thay đổi khác
      </button>
    </div>
    <div class="week-events-list">
      ${itemsHtml}
    </div>
  `;
}

function deleteEventById(weekKey, eventId) {
  showConfirm('Hủy thay đổi lịch', 'Bạn có chắc muốn hủy thay đổi này trong tuần không?', () => {
    if (scheduleEvents[weekKey]) {
      scheduleEvents[weekKey] = scheduleEvents[weekKey].filter(e => e.id !== eventId);
      saveScheduleEvents();
      showToast('Đã hủy thay đổi lịch trong tuần!', 'success');
      renderAll();
    }
  });
}

// ============= EVENT MODAL FUNCTIONS =============
function openEventModal(weekKey = null, day = null, periodIndex = null, defaultType = 'schedule_change', defaultTitle = '') {
  editingEventWeekKey = weekKey || currentWeekKey;
  editingEventId = null;

  document.getElementById('eventModalTitle').textContent = defaultType === 'day_off' 
    ? '🚫 Báo Nghỉ Tiết / Bỏ Tiết (Tuần này)' 
    : (defaultType === 'extra_class' ? '➕ Thêm Tiết Học Tuần Này' : '📢 Thay Đổi Lịch Tuần Này');
  document.getElementById('inputEventType').value = defaultType || 'schedule_change';
  document.getElementById('inputEventSeverity').value = defaultType === 'day_off' ? 'warning' : 'info';
  document.getElementById('inputEventTitle').value = defaultTitle || '';
  document.getElementById('inputEventNote').value = '';
  document.getElementById('inputEventDay').value = day || '';
  document.getElementById('inputEventPeriod').value = (periodIndex !== null && periodIndex !== undefined) ? String(periodIndex) : '';

  const deleteBtn = document.getElementById('btnDeleteEvent');
  if (deleteBtn) deleteBtn.style.display = 'none';

  document.getElementById('eventModalOverlay').style.display = 'flex';
}

function editEvent(weekKey, eventId) {
  const events = getEventsForWeek(weekKey);
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;

  editingEventWeekKey = weekKey;
  editingEventId = eventId;

  document.getElementById('eventModalTitle').textContent = '✏️ Chỉnh Sửa Thông Báo Đổi Lịch';
  document.getElementById('inputEventType').value = ev.type || 'schedule_change';
  document.getElementById('inputEventSeverity').value = ev.severity || 'info';
  document.getElementById('inputEventTitle').value = ev.title || '';
  document.getElementById('inputEventNote').value = ev.note || '';
  document.getElementById('inputEventDay').value = ev.day || '';
  document.getElementById('inputEventPeriod').value = (ev.periodIndex !== null && ev.periodIndex !== undefined) ? String(ev.periodIndex) : '';

  const deleteBtn = document.getElementById('btnDeleteEvent');
  if (deleteBtn) deleteBtn.style.display = 'block';

  document.getElementById('eventModalOverlay').style.display = 'flex';
}

function closeEventModal() {
  document.getElementById('eventModalOverlay').style.display = 'none';
  editingEventWeekKey = null;
  editingEventId = null;
}

async function submitEventForm() {
  const title = document.getElementById('inputEventTitle').value.trim();
  if (!title) {
    showToast('Vui lòng nhập nội dung thay đổi!', 'warning');
    return;
  }

  const weekKey = editingEventWeekKey || currentWeekKey;
  const type = document.getElementById('inputEventType').value;
  const severity = document.getElementById('inputEventSeverity').value;
  const note = document.getElementById('inputEventNote').value.trim();
  const day = document.getElementById('inputEventDay').value;
  const periodVal = document.getElementById('inputEventPeriod').value;
  const periodIndex = periodVal !== '' ? parseInt(periodVal) : null;

  if (!scheduleEvents[weekKey]) scheduleEvents[weekKey] = [];

  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;

  if (editingEventId) {
    // Edit existing
    const idx = scheduleEvents[weekKey].findIndex(e => e.id === editingEventId);
    if (idx !== -1) {
      scheduleEvents[weekKey][idx] = {
        ...scheduleEvents[weekKey][idx],
        type, severity, title, note, day, periodIndex,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    // New event
    scheduleEvents[weekKey].push({
      id: generateEventId(),
      type, severity, title, note, day, periodIndex,
      weekKey,
      createdAt: new Date().toISOString(),
      createdBy: user ? user.name : 'Admin'
    });
  }

  saveScheduleEvents();
  if (typeof logAction === 'function') {
    logAction('Thêm thông báo đổi lịch', `${weekKey}: ${title}`);
  }

  showToast('Đã lưu thông báo thay đổi lịch!', 'success');
  closeEventModal();
  renderAll();
}

function deleteCurrentEvent() {
  if (!editingEventWeekKey || !editingEventId) return;
  showConfirm('Xóa thông báo', 'Bạn có chắc muốn xóa thông báo đổi lịch này không?', () => {
    if (scheduleEvents[editingEventWeekKey]) {
      scheduleEvents[editingEventWeekKey] = scheduleEvents[editingEventWeekKey].filter(e => e.id !== editingEventId);
    }
    saveScheduleEvents();
    showToast('Đã xóa thông báo!', 'success');
    closeEventModal();
    renderAll();
  });
}

