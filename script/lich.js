// Schedule system - Multiple weeks with daily timetables
let schedules = {}; // { "week-1": { "monday": [...], "tuesday": [...] }, ... }
let weekMetadata = {}; // { "week-1": { name: "Tuần 1", startDate: "2026-01-13", endDate: "2026-01-19", infinite: false }, ... }
let currentDate = new Date(); // For calendar navigation
let selectedDate = null; // Selected date to determine week
let currentWeek = 0; // No week selected initially
let currentUser = null;
let isScheduleDataSynced = false; // Cờ để chặn lưu dữ liệu khi chưa đồng bộ xong
let viewMode = 'week'; // 'week', 'day', 'daily'
let modalViewMode = 'week'; // View mode in modal
let filteredClassName = ''; // For filtering classes
let editingWeek = null; // For week management modal
let editingClassIndex = null; // { day: string, index: number } - Để theo dõi tiết học đang sửa

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = {
  monday: 'Thứ Hai',
  tuesday: 'Thứ Ba',
  wednesday: 'Thứ Tư',
  thursday: 'Thứ Năm',
  friday: 'Thứ Sáu',
  saturday: 'Thứ Bảy',
  sunday: 'Chủ Nhật'
};

const DAY_EMOJIS = {
  monday: '🗓️',
  tuesday: '📚',
  wednesday: '✏️',
  thursday: '💻',
  friday: '🎓',
  saturday: '🏃',
  sunday: '⛪'
};

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

// Định nghĩa giờ học chuẩn cho các tiết (Có thể điều chỉnh)
const PERIODS = {
  1: { start: '07:00', end: '07:45' },
  2: { start: '07:45', end: '08:30' },
  3: { start: '08:50', end: '09:35' },
  4: { start: '09:35', end: '10:20' },
  5: { start: '10:30', end: '11:15' },
  6: { start: '13:00', end: '13:45' },
  7: { start: '13:45', end: '14:30' },
  8: { start: '14:45', end: '15:30' },
  9: { start: '15:35', end: '16:20' },
  10: { start: '16:20', end: '17:00' }
};

window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  
  // ROOT FIX: Đảm bảo trang luôn có thể cuộn khi tải, tránh lỗi kẹt overflow:hidden
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';
  
  // --- FALLBACK ---
  //if (typeof window.showToast !== 'function') window.showToast = (msg) => alert(msg);
  if (!document.getElementById('fallback-animation-style')) {
    const style = document.createElement('style');
    style.id = 'fallback-animation-style';
    style.innerHTML = `
      :root { --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes popIn { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
      
      /* Safe Animation Styles */
      .class-item { opacity: 1; animation: popIn 0.4s var(--ease-spring); }
      .daily-class-item { opacity: 1; animation: fadeInUp 0.4s var(--ease-spring); }
      
      /* Injected Styles for Calendar */
      .calendar-day {
        transition: all 0.3s var(--ease-spring) !important;
        border-radius: 12px !important;
      }
      .calendar-day:hover {
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        z-index: 10;
      }
    `;
    document.head.appendChild(style);
  }

  // Show admin controls in manage modal
  const manageClassAdminSection = document.getElementById('manageClassAdminSection');
  const manageClassFilterSection = document.getElementById('manageClassFilterSection');
  if (checkPermission('manage_schedule')) {
    manageClassAdminSection.style.display = 'block';
    manageClassFilterSection.style.display = 'block';
    document.getElementById('classInputManage').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addClassFromManageModal();
    });
  }

  // Khởi tạo các ô nhập liệu có lịch sử (Droplist)
  initInputHistory();

  // Khởi tạo options cho select tiết
  initPeriodSelectors();

  // Load dữ liệu từ cache trước để hiển thị ngay
  schedules = JSON.parse(localStorage.getItem('c7aio_schedules_cache')) || {};
  weekMetadata = JSON.parse(localStorage.getItem('c7aio_weekMetadata_cache')) || {};
  
  // Khởi tạo giao diện ban đầu
  initInterface();

  // Lắng nghe Firebase (Realtime Sync)
  setupRealtimeSync();

  buildClassFilterOptions();
  
  // Close modals on outside click
  document.getElementById('scheduleModal').addEventListener('click', (e) => {
    if (e.target.id === 'scheduleModal') closeScheduleModal();
  });
  document.getElementById('addWeekModal').addEventListener('click', (e) => {
    if (e.target.id === 'addWeekModal') closeAddWeekModal();
  });
  document.getElementById('manageClassModal').addEventListener('click', (e) => {
    if (e.target.id === 'manageClassModal') closeManageClassModal();
  });
  injectResponsiveStyles(); // Kích hoạt giao diện phản hồi (Mobile/Desktop)
  injectEditModal(); // Khởi tạo modal sửa riêng biệt
});

function setupRealtimeSync() {
  onSharedSchedulesChanged((data) => {
    isScheduleDataSynced = true; // Đánh dấu đã nhận dữ liệu từ server
    schedules = data || {};
    
    // FIX LOGIC SYNC: Không bao giờ tự động saveSchedules() ở đây.
    // Chỉ cập nhật UI theo dữ liệu nhận được (dù rỗng hay có dữ liệu).
    buildHeaderClassFilterOptions();
    buildModalClassFilterOptions();
    buildManageClassFilterOptions();
    initInterface();
  });

  onSharedWeekMetadataChanged((data) => {
    weekMetadata = data || {};
    buildHeaderClassFilterOptions();
    buildModalClassFilterOptions();
    buildManageClassFilterOptions();
    initInterface(); // Re-render
  });
}

function initInterface() {
  initializeSchedules();
  renderCalendar();
  renderWeekSelector();
  if (currentWeek > 0 && document.getElementById('scheduleModal').style.display !== 'none') {
    updateModalSchedule();
  }
  buildHeaderClassFilterOptions();
}

function saveWeekMetadata() {
  // FIX SYNC: Chặn lưu nếu chưa đồng bộ lần đầu
  if (!isScheduleDataSynced) {
    showToast('⏳ Đang đồng bộ dữ liệu, vui lòng đợi...', 'info');
    return;
  }
  // Lưu lên Firebase thay vì localStorage
  saveSharedWeekMetadata(weekMetadata);
}

function initializeSchedules() {
  
  // Set selectedDate = today
  if (!selectedDate) {
    selectedDate = new Date();
  }
  
  // FIX: Luôn tính toán currentWeek dựa trên ngày hiện tại nếu chưa có
  // Để đảm bảo UI luôn hiển thị đúng tuần (dù là tuần trống)
  if (currentWeek === 0) {
    const foundKey = findWeekKeyByDate(selectedDate);
    if (foundKey) {
      currentWeek = parseInt(foundKey.split('-')[1]);
    } else {
      currentWeek = getWeekNumberFromDate(selectedDate);
    }
  }
  
  // Display first week in header
  const availableWeeks = Object.keys(schedules).sort((a, b) => {
    const aNum = parseInt(a.split('-')[1]);
    const bNum = parseInt(b.split('-')[1]);
    return aNum - bNum;
  });
  
  if (availableWeeks.length > 0) {
    const firstWeekNum = parseInt(availableWeeks[0].split('-')[1]);
    updateCurrentWeekDisplay(firstWeekNum);
    
    // Setup week dropdown for admin
    if (checkPermission('manage_schedule')) {
      updateWeekDropdown();
    }
  } else {
    // Trường hợp chưa có dữ liệu, vẫn hiển thị tên tuần hiện tại
    updateCurrentWeekDisplay(currentWeek);
  }
}

function updateCurrentWeekDisplay(weekNum) {
  const weekKey = `week-${weekNum}`;
  const metadata = weekMetadata[weekKey] || {};
  const weekName = metadata.name || `Tuần ${weekNum}`;
  
  const displayText = document.getElementById('currentWeekDisplayText');
  if (displayText) {
    displayText.textContent = weekName;
  }
}

function updateWeekDropdown() {
  const select = document.getElementById('currentWeekSelect');
  
  const availableWeeks = Object.keys(schedules).sort((a, b) => {
    const aNum = parseInt(a.split('-')[1]);
    const bNum = parseInt(b.split('-')[1]);
    return aNum - bNum;
  });
  
  select.innerHTML = '';
  
  availableWeeks.forEach(weekKey => {
    const weekNum = parseInt(weekKey.split('-')[1]);
    const metadata = weekMetadata[weekKey] || {};
    const weekName = metadata.name || `Tuần ${weekNum}`;
    
    const option = document.createElement('option');
    option.value = weekNum;
    option.textContent = weekName;
    select.appendChild(option);
  });
  
  // Show dropdown for admin, hide text
  select.style.display = 'inline-block';
  document.getElementById('currentWeekDisplayText').style.display = 'none';
}

function changeWeekFromDropdown() {
  const select = document.getElementById('currentWeekSelect');
  const weekNum = parseInt(select.value);
  updateCurrentWeekDisplay(weekNum);
  selectWeekModal(weekNum);
}

function initEmptyWeek() {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
}

function saveSchedules() {
  // FIX SYNC: Chặn lưu nếu chưa đồng bộ lần đầu
  if (!isScheduleDataSynced) {
    showToast('⏳ Đang đồng bộ dữ liệu, vui lòng đợi...', 'info');
    return;
  }

  // FIX SYNC: Client-side Guard
  // Nếu dữ liệu local đang rỗng, tuyệt đối không gửi lệnh lưu (tránh trường hợp cache lỗi làm mất data server)
  if (!schedules || Object.keys(schedules).length === 0) {
    console.warn('⚠️ Client Guard: Chặn lưu lịch học rỗng.');
    return;
  }

  // Lưu lên Firebase thay vì localStorage
  if (typeof saveSharedSchedules === 'function') {
    saveSharedSchedules(schedules);
  }
}

// Get week number (Monday-Sunday) from date
function getWeekNumberFromDate(date) {
  // Tìm thứ 2 đầu tiên trước hoặc bằng date
  const d = new Date(date);
  const day = d.getDay(); // 0=Sunday, 1=Monday
  const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Monday
  const monday = new Date(d.setDate(diff));
  
  // Tính week number: từ ngày 1/1 năm
  const yearStart = new Date(monday.getFullYear(), 0, 1);
  const weekNum = Math.ceil((monday - yearStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return weekNum;
}

// Tìm Week Key dựa trên ngày (Ưu tiên Metadata đã lưu)
function findWeekKeyByDate(date) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  // 1. Ưu tiên tìm các tuần có thời hạn cụ thể (Finite) trước
  for (const [key, meta] of Object.entries(weekMetadata)) {
    if (meta.startDate && !meta.infinite && meta.endDate) {
      const start = new Date(meta.startDate);
      const end = new Date(meta.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      if (checkDate >= start && checkDate <= end) {
        return key;
      }
    }
  }

  // 2. Nếu không có, tìm tuần vô hạn (Infinite)
  // Logic: Tìm tuần vô hạn có ngày bắt đầu gần nhất với ngày đang chọn (nhưng phải <= ngày chọn)
  let bestInfiniteKey = null;
  let maxStartDate = -1;

  for (const [key, meta] of Object.entries(weekMetadata)) {
    if (meta.startDate && meta.infinite) {
      const start = new Date(meta.startDate);
      start.setHours(0, 0, 0, 0);
      
      if (checkDate >= start) {
        // Nếu có nhiều tuần vô hạn, lấy tuần bắt đầu muộn nhất (gần ngày chọn nhất)
        if (start.getTime() > maxStartDate) {
          maxStartDate = start.getTime();
          bestInfiniteKey = key;
        }
      }
    }
  }

  return bestInfiniteKey;
}

// Get Monday of week from week number
function getMondayOfWeek(weekNum) {
  const d = new Date(new Date().getFullYear(), 0, 1);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const yearMonday = new Date(d.setDate(diff));
  const monday = new Date(yearMonday);
  monday.setDate(monday.getDate() + (weekNum - 1) * 7);
  return monday;
}

// Render calendar to select date/week
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Update header
  document.getElementById('monthYear').textContent = `${MONTH_NAMES[month]} ${year}`;
  
  // Get first day of month and days in month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0=Sunday
  
  const daysContainer = document.getElementById('calendarDays');
  daysContainer.innerHTML = '';
  
  // Add prev month days
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day other-month';
    dayDiv.textContent = prevLastDay - i;
    daysContainer.appendChild(dayDiv);
  }
  
  // Add current month days
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
    
    const isSelected = selectedDate &&
                       date.getDate() === selectedDate.getDate() &&
                       date.getMonth() === selectedDate.getMonth() &&
                       date.getFullYear() === selectedDate.getFullYear();
    
    if (isToday) dayDiv.classList.add('today');
    if (isSelected) dayDiv.classList.add('selected');
    
    // Set day number first
    dayDiv.textContent = day;
    
    // Check if this day has classes
    // Ưu tiên tìm theo metadata, nếu không có thì mới tính theo công thức
    const weekKey = findWeekKeyByDate(date) || `week-${getWeekNumberFromDate(date)}`;
    const dayName = getDayNameFromDate(date);
    
    let hasClasses = false;
    if (schedules[weekKey] && schedules[weekKey][dayName]) {
      const classes = schedules[weekKey][dayName];
      // Kiểm tra xem có lớp nào phù hợp với bộ lọc không
      hasClasses = filteredClassName ? classes.some(c => c.name === filteredClassName) : classes.length > 0;
    }

    if (hasClasses) {
      dayDiv.classList.add('has-classes');
      // Add indicator icon
      const indicator = document.createElement('span');
      indicator.className = 'class-indicator';
      indicator.textContent = '📚';
      dayDiv.appendChild(indicator);
    }
    
    dayDiv.onclick = () => openScheduleModal(new Date(year, month, day));
    daysContainer.appendChild(dayDiv);
  }
  
  // Add next month days
  const totalCells = daysContainer.children.length;
  const remainingCells = 42 - totalCells;
  for (let day = 1; day <= remainingCells; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day other-month';
    dayDiv.textContent = day;
    daysContainer.appendChild(dayDiv);
  }
}

function selectDateFromCalendar(date) {
  selectedDate = new Date(date);
  
  const foundKey = findWeekKeyByDate(selectedDate);
  if (foundKey) {
    currentWeek = parseInt(foundKey.split('-')[1]);
  } else {
    // Fallback về tính toán nếu chưa định nghĩa tuần
    currentWeek = getWeekNumberFromDate(selectedDate);
  }

  renderCalendar();
  renderWeekSelector();
  renderSchedule();
}

function setupViewModeButtons() {
  const viewModeBtns = document.querySelectorAll('.view-mode-btn');
  viewModeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      viewModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewMode = btn.dataset.mode;
      renderSchedule();
    });
  });
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function renderWeekSelector() {
  const container = document.getElementById('weekSelector');
  container.innerHTML = '';

  // Lấy tất cả week từ schedules
  const weeks = Object.keys(schedules).sort((a, b) => {
    const aNum = parseInt(a.split('-')[1]);
    const bNum = parseInt(b.split('-')[1]);
    return aNum - bNum;
  });

  // Hiển thị các tuần hiện tại
  weeks.forEach(week => {
    const weekNum = week.split('-')[1];
    const metadata = weekMetadata[week] || {};
    const weekName = metadata.name || `Tuần ${weekNum}`;
    
    const btn = document.createElement('button');
    btn.className = `week-btn ${week === `week-${currentWeek}` ? 'active' : ''}`;
    btn.textContent = weekName;
    btn.onclick = () => selectWeekModal(parseInt(weekNum));
    btn.title = 'Click để xem, shift+click để quản lý';
    
    // Shift+click to manage
    if (checkPermission('manage_schedule')) btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openWeekManager(parseInt(weekNum));
    });
    
    container.appendChild(btn);
  });
}

function selectWeekModal(weekNum) {
  currentWeek = weekNum;
  const weekKey = `week-${weekNum}`;
  const metadata = weekMetadata[weekKey] || {};
  
  // Ưu tiên ngày bắt đầu từ metadata, nếu không thì tính theo tuần chuẩn
  if (metadata.startDate) {
    selectedDate = new Date(metadata.startDate);
  } else {
    selectedDate = getMondayOfWeek(weekNum);
  }
  
  // Use wrapper system instead of direct display
  const wrapper = document.getElementById('modalsWrapper');
  
  const weekName = metadata.name || `Tuần ${weekNum}`;
  let dateStr = `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;
  
  // Hiển thị thêm thông tin nếu là tuần vô hạn
  if (metadata.infinite) {
    dateStr += ' (Vô hạn)';
  } else if (metadata.endDate) {
    const end = new Date(metadata.endDate);
    dateStr += ` - ${end.getDate()}/${end.getMonth() + 1}`;
  }
  
  // Thêm nút Edit ngay cạnh tiêu đề
  const modalTitle = document.getElementById('modalTitle');
  modalTitle.innerHTML = `
    ${weekName} - ${dateStr} 
    <button onclick="openWeekManager(${weekNum})" style="background:none; border:none; cursor:pointer; font-size:1rem;" title="Chỉnh sửa tuần này">
      ⚙️
    </button>
  `;
  
  // Update header to show current week
  updateCurrentWeekDisplay(weekNum);
  
  // Update dropdown selection if admin
  if (checkPermission('manage_schedule')) {
    document.getElementById('currentWeekSelect').value = weekNum;
  }
  
  buildModalClassFilterOptions();
  
  // Show wrapper
  wrapper.classList.add('active');
  wrapper.style.display = 'flex';
  
  document.body.style.overflow = 'hidden'; // Khóa scroll nền
  document.documentElement.style.overflow = 'hidden'; // Khóa scroll cho cả trang

  updateModalSchedule();
  
  // Cập nhật lại trạng thái nút active visual
  if (modalViewMode === 'day') {
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
    const dayBtn = document.querySelector('[data-mode="day"]');
    if (dayBtn) dayBtn.classList.add('active');
  }
}

function selectWeek(weekNum) {
  currentWeek = weekNum;
  renderWeekSelector();
  renderSchedule();
}

function addWeek() {
  const maxWeek = Math.max(...Object.keys(schedules).map(w => parseInt(w.split('-')[1])), 0);
  const newWeek = `week-${maxWeek + 1}`;
  
  schedules[newWeek] = initEmptyWeek();
  weekMetadata[newWeek] = {
    name: `Tuần ${maxWeek + 1}`,
    startDate: '',
    endDate: null,
    infinite: false
  };
  
  saveSchedules();
  saveWeekMetadata();
  selectWeek(maxWeek + 1);
}

function renderSchedule() {
  const weekKey = `week-${currentWeek}`;
  const weekSchedule = schedules[weekKey] || {};

  const container = document.getElementById('scheduleContainer');
  container.innerHTML = '';

  // Xác định ngày được chọn
  const selectedDayName = selectedDate ? getDayNameFromDate(selectedDate) : 'monday';

  if (viewMode === 'day') {
    renderDayView(weekSchedule, selectedDayName, container);
  } else if (viewMode === 'daily') {
    renderDailyView(weekSchedule, selectedDayName, container);
  } else {
    renderWeekView(weekSchedule, container, selectedDayName);
  }
}

function getDayNameFromDate(date) {
  const day = date.getDay(); // 0=Sunday, 1=Monday
  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return daysMap[day];
}

function renderWeekView(weekSchedule, container, selectedDayName) {
  DAYS.forEach(day => {
    const classes = weekSchedule[day] || [];
    
    const dayContainer = document.createElement('div');
    dayContainer.className = 'day-column';
    
    let html = `
      <div class="day-header">
        <span class="day-emoji">${DAY_EMOJIS[day]}</span>
        <span class="day-name">${DAY_NAMES[day]}</span>
      </div>
      <div class="classes-list">
    `;

    if (classes.length === 0) {
      html += '<div class="empty-day">Không có lớp</div>';
    } else {
      classes.forEach((cls, idx) => {
        const isCompleted = cls.completions && cls.completions[currentUser.id];
        html += `
          <div class="class-item ${isCompleted ? 'completed' : ''}" style="animation: popIn 0.4s var(--ease-spring); animation-delay: ${idx * 0.05}s;" ${checkPermission('manage_schedule') ? `oncontextmenu="event.preventDefault(); editClass('${day}', ${idx})"` : ''}>
            <div class="class-content">
              <div class="class-time">${cls.time}</div>
              <div class="class-name">${cls.name}</div>
              ${cls.subject ? `<div class="class-subject" style="font-weight:500; color:#444;">📘 ${cls.subject}</div>` : ''}
              <div class="class-room">${cls.room || 'Phòng ?'}</div>
            </div>
            <button class="class-checkbox-btn ${isCompleted ? 'active' : ''}" 
                    onclick="toggleClassCompletion('${day}', ${idx})">
              ${isCompleted ? '✅' : '⭕'}
            </button>
            ${checkPermission('manage_schedule') ? `<button class="delete-btn" onclick="deleteClass('${day}', ${idx})">🗑️</button>` : ''}
          </div>
        `;
      });
    }

    html += '</div>';
    dayContainer.innerHTML = html;
    container.appendChild(dayContainer);
  });
}

function renderDayView(weekSchedule, dayName, container) {
  const classes = weekSchedule[dayName] || [];
  
  const dayContainer = document.createElement('div');
  dayContainer.className = 'day-column full-width';
  
  let html = `
    <div class="day-header">
      <span class="day-emoji">${DAY_EMOJIS[dayName]}</span>
      <span class="day-name">${DAY_NAMES[dayName]}</span>
    </div>
    <div class="classes-list">
  `;

  if (classes.length === 0) {
    html += '<div class="empty-day">Không có lớp</div>';
  } else {
    classes.forEach((cls, idx) => {
      const isCompleted = cls.completions && cls.completions[currentUser.id];
      html += `
        <div class="class-item ${isCompleted ? 'completed' : ''}" style="animation: popIn 0.4s var(--ease-spring); animation-delay: ${idx * 0.05}s;" ${checkPermission('manage_schedule') ? `oncontextmenu="event.preventDefault(); editClass('${dayName}', ${idx})"` : ''}>
          <div class="class-content">
            <div class="class-time">${cls.time}</div>
            <div class="class-name">${cls.name}</div>
            ${cls.subject ? `<div class="class-subject" style="font-weight:500; color:#444;">📘 ${cls.subject}</div>` : ''}
            <div class="class-room">${cls.room || 'Phòng ?'}</div>
          </div>
          <button class="class-checkbox-btn ${isCompleted ? 'active' : ''}" 
                  onclick="toggleClassCompletion('${dayName}', ${idx})">
            ${isCompleted ? '✅' : '⭕'}
          </button>
          ${checkPermission('manage_schedule') ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
        </div>
      `;
    });
  }

  html += '</div>';
  dayContainer.innerHTML = html;
  container.appendChild(dayContainer);
}

function renderDailyView(weekSchedule, dayName, container) {
  const classes = weekSchedule[dayName] || [];
  
  const dayContainer = document.createElement('div');
  dayContainer.className = 'daily-view';
  
  let html = `
    <div class="daily-header">
      <h3>${DAY_NAMES[dayName]} - Lịch Chi Tiết</h3>
      <p class="daily-date">${getDayStringFromDate(selectedDate)}</p>
    </div>
  `;

  if (classes.length === 0) {
    html += '<div class="empty-day">Không có lớp</div>';
  } else {
    html += '<div class="daily-classes">';
    classes.forEach((cls, idx) => {
      const isCompleted = cls.completions && cls.completions[currentUser.id];
      html += `
        <div class="daily-class-item ${isCompleted ? 'completed' : ''}" style="animation: fadeInUp 0.4s var(--ease-spring); animation-delay: ${idx * 0.05}s;" ${checkPermission('manage_schedule') ? `oncontextmenu="event.preventDefault(); editClass('${dayName}', ${idx})"` : ''}>
          <div class="daily-time">${cls.time}</div>
          <div class="daily-details">
            <div class="daily-class-name">${cls.name}</div>
            ${cls.subject ? `<div class="daily-class-subject">📘 ${cls.subject}</div>` : ''}
            <div class="daily-class-room">📍 ${cls.room || 'Phòng ?'}</div>
          </div>
          <button class="class-checkbox-btn ${isCompleted ? 'active' : ''}" 
                  onclick="toggleClassCompletion('${dayName}', ${idx})">
            ${isCompleted ? '✅' : '⭕'}
          </button>
          ${checkPermission('manage_schedule') ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
        </div>
      `;
    });
    html += '</div>';
  }

  dayContainer.innerHTML = html;
  container.appendChild(dayContainer);
}

function getDayStringFromDate(date) {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function addClass() {
  if (!checkPermission('manage_schedule')) {
    showToast('Bạn không có quyền thêm lớp', 'error');
    return;
  }

  const nameInput = document.getElementById('classInput');
  const timeInput = document.getElementById('timeInput');
  const roomInput = document.getElementById('roomInput');
  const daySelect = document.getElementById('daySelect');

  const name = nameInput.value.trim();
  const time = timeInput.value.trim();
  const room = roomInput.value.trim();
  const day = daySelect.value;

  if (!name || !time) {
    showToast('Vui lòng nhập tên lớp và thời gian', 'error');
    return;
  }

  const weekKey = `week-${currentWeek}`;
  if (!schedules[weekKey]) {
    schedules[weekKey] = initEmptyWeek();
  }

  // Đảm bảo mảng của ngày tồn tại (Firebase không lưu mảng rỗng)
  if (!schedules[weekKey][day]) {
    schedules[weekKey][day] = [];
  }

  const newClass = {
    id: Date.now(),
    name: name,
    time: time,
    room: room || 'Phòng chưa xác định',
    completions: {}
  };

  schedules[weekKey][day].push(newClass);
  saveSchedules();
  logAction('Thêm lớp học', `Lớp: ${name} - Thứ: ${day}`);
  showToast('Đã thêm lớp học!', 'success');

  nameInput.value = '';
  timeInput.value = '';
  roomInput.value = '';
  renderSchedule();
}

function deleteClass(day, idx) {
  if (!checkPermission('manage_schedule')) {
    showToast('Bạn không có quyền xóa lớp', 'error');
    return;
  }

  if (confirm('Xóa lớp học này?')) {
    const weekKey = `week-${currentWeek}`;
    const cls = schedules[weekKey][day][idx];
    schedules[weekKey][day].splice(idx, 1);
    saveSchedules();
    logAction('Xóa lớp học', `Lớp: ${cls.name} - Thứ: ${day}`);
    showToast('Đã xóa lớp học', 'success');
    buildHeaderClassFilterOptions();
    buildModalClassFilterOptions();
    buildManageClassFilterOptions();
    updateModalSchedule();
    renderCalendar();
  }
}

// ===== MODAL FUNCTIONS =====

function openScheduleModal(date) {
  selectedDate = new Date(date);
  
  const foundKey = findWeekKeyByDate(selectedDate);
  if (foundKey) {
    currentWeek = parseInt(foundKey.split('-')[1]);
  } else {
    currentWeek = getWeekNumberFromDate(selectedDate);
  }

  const dayName = getDayNameFromDate(selectedDate);
  
  const modal = document.getElementById('scheduleModal');
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayIndex = selectedDate.getDay();
  const dateStr = `${days[dayIndex]}, ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;
  
  const modalTitle = document.getElementById('modalTitle');
  modalTitle.innerHTML = `
    ${weekMetadata[`week-${currentWeek}`]?.name || `Tuần ${currentWeek}`} - ${dateStr}
    <button onclick="openWeekManager(${currentWeek})" style="background:none; border:none; cursor:pointer; font-size:1rem;" title="Chỉnh sửa tuần này">
      ⚙️
    </button>
  `;
  
  // Update header to show current week
  updateCurrentWeekDisplay(currentWeek);
  
  // Update dropdown selection if admin
  if (checkPermission('manage_schedule')) {
    document.getElementById('currentWeekSelect').value = currentWeek;
  }
  
  // Build class filter options
  buildModalClassFilterOptions();
  
  // Show both modals in wrapper
  const wrapper = document.getElementById('modalsWrapper');
  
  // Show wrapper
  wrapper.classList.add('active');
  wrapper.style.display = 'flex';
  
  document.body.style.overflow = 'hidden'; // Khóa scroll nền
  document.documentElement.style.overflow = 'hidden'; // Khóa scroll cho cả trang

  // Update view mode buttons
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector('[data-mode="week"]').classList.add('active');
  
  if (modalViewMode === 'day') {
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
    const dayBtn = document.querySelector('[data-mode="day"]');
    if (dayBtn) dayBtn.classList.add('active');
  }

  updateModalSchedule();
}

function closeScheduleModal() {
  const wrapper = document.getElementById('modalsWrapper');
  wrapper.classList.remove('active');
  wrapper.style.display = 'none';

  document.body.style.overflow = 'auto'; // Mở khóa scroll nền
  document.documentElement.style.overflow = 'auto';

  // Reset trạng thái sửa
  editingClassIndex = null;
  const addBtn = document.querySelector('#manageClassAdminSection .add-btn');
  if (addBtn) addBtn.textContent = '+ Thêm lớp';
  // Clear form inputs
  // document.getElementById('classInputManage').value = ''; // Không xóa để giữ trạng thái nhập liệu
}

function closeManageClassModal() {
  // Close both modals along with schedule
  closeScheduleModal();
}

function filterByClassInModal() {
  const select = document.getElementById('manageClassFilter');
  filteredClassName = select.value;
  
  // Sync to header
  const headerSelect = document.getElementById('headerClassFilter');
  if (headerSelect) headerSelect.value = filteredClassName;
  
  // Sync to modal view filter
  const modalSelect = document.getElementById('modalClassFilter');
  if (modalSelect) modalSelect.value = filteredClassName;

  updateModalSchedule();
  renderCalendar();
}

function switchModalViewMode(mode) {
  modalViewMode = mode;
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  updateModalSchedule();
}

function updateModalSchedule() {
  const weekKey = `week-${currentWeek}`;
  const weekSchedule = schedules[weekKey] || {};
  const container = document.getElementById('modalScheduleContainer');
  container.innerHTML = '';
  
  const selectedDayName = getDayNameFromDate(selectedDate);
  
  if (modalViewMode === 'day') {
    renderDayViewFiltered(weekSchedule, selectedDayName, container);
  } else if (modalViewMode === 'daily') {
    renderDailyViewFiltered(weekSchedule, selectedDayName, container);
  } else {
    renderWeekViewFiltered(weekSchedule, container, selectedDayName);
  }
}

function renderWeekViewFiltered(weekSchedule, container, selectedDayName) {
  DAYS.forEach(day => {
    const originalClasses = weekSchedule[day] || [];
    
    const dayContainer = document.createElement('div');
    dayContainer.className = 'day-column';
    
    let html = `
      <div class="day-header">
        <span class="day-emoji">${DAY_EMOJIS[day]}</span>
        <span class="day-name">${DAY_NAMES[day]}</span>
      </div>
      <div class="classes-list">
    `;

    // Kiểm tra xem có lớp nào phù hợp không để hiển thị empty state
    const hasMatch = filteredClassName ? originalClasses.some(c => c.name === filteredClassName) : originalClasses.length > 0;

    if (!hasMatch) {
      html += '<div class="empty-day">Không có lớp</div>';
    } else {
      originalClasses.forEach((cls, idx) => {
        if (filteredClassName && cls.name !== filteredClassName) return;

        html += `
          <div class="class-item" ${checkPermission('manage_schedule') ? `oncontextmenu="event.preventDefault(); editClass('${day}', ${idx})"` : ''}>
            <div class="class-content">
              <div class="class-time">${cls.time}</div>
              <div class="class-name">${cls.name}</div>
              ${cls.subject ? `<div class="class-subject" style="font-weight:500; color:#444;">📘 ${cls.subject}</div>` : ''}
              <div class="class-room">${cls.room || 'Phòng ?'}</div>
              ${cls.duration ? `<div class="class-duration">${cls.duration}</div>` : ''}
            </div>
            ${checkPermission('manage_schedule') ? `<button class="delete-btn" onclick="deleteClass('${day}', ${idx})">🗑️</button>` : ''}
          </div>
        `;
      });
    }

    html += '</div>';
    dayContainer.innerHTML = html;
    container.appendChild(dayContainer);
  });
}

function renderDayViewFiltered(weekSchedule, dayName, container) {
  const originalClasses = weekSchedule[dayName] || [];
  
  const dayContainer = document.createElement('div');
  dayContainer.className = 'day-column full-width';
  
  let html = `
    <div class="day-header">
      <span class="day-emoji">${DAY_EMOJIS[dayName]}</span>
      <span class="day-name">${DAY_NAMES[dayName]}</span>
    </div>
    <div class="classes-list">
  `;

  const hasMatch = filteredClassName ? originalClasses.some(c => c.name === filteredClassName) : originalClasses.length > 0;

  if (!hasMatch) {
    html += '<div class="empty-day">Không có lớp</div>';
  } else {
    originalClasses.forEach((cls, idx) => {
      if (filteredClassName && cls.name !== filteredClassName) return;

      html += `
        <div class="class-item" ${checkPermission('manage_schedule') ? `oncontextmenu="event.preventDefault(); editClass('${dayName}', ${idx})"` : ''}>
          <div class="class-content">
            <div class="class-time">${cls.time}</div>
            <div class="class-name">${cls.name}</div>
            ${cls.subject ? `<div class="class-subject" style="font-weight:500; color:#444;">📘 ${cls.subject}</div>` : ''}
            <div class="class-room">${cls.room || 'Phòng ?'}</div>
            ${cls.duration ? `<div class="class-duration">${cls.duration}</div>` : ''}
          </div>
          ${checkPermission('manage_schedule') ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
        </div>
      `;
    });
  }

  html += '</div>';
  dayContainer.innerHTML = html;
  container.appendChild(dayContainer);
}

function renderDailyViewFiltered(weekSchedule, dayName, container) {
  const originalClasses = weekSchedule[dayName] || [];
  
  const dayContainer = document.createElement('div');
  dayContainer.className = 'daily-view';
  
  let html = `
    <div class="daily-header">
      <h3>${DAY_NAMES[dayName]} - Lịch Chi Tiết</h3>
      <p class="daily-date">${getDayStringFromDate(selectedDate)}</p>
    </div>
  `;

  const hasMatch = filteredClassName ? originalClasses.some(c => c.name === filteredClassName) : originalClasses.length > 0;

  if (!hasMatch) {
    html += '<div class="empty-day">Không có lớp</div>';
  } else {
    html += '<div class="daily-classes">';
    originalClasses.forEach((cls, idx) => {
      if (filteredClassName && cls.name !== filteredClassName) return;

      html += `
        <div class="daily-class-item" ${checkPermission('manage_schedule') ? `oncontextmenu="event.preventDefault(); editClass('${dayName}', ${idx})"` : ''}>
          <div class="daily-time">${cls.time}</div>
          <div class="daily-details">
            <div class="daily-class-name">${cls.name}</div>
            ${cls.subject ? `<div class="daily-class-subject">📘 ${cls.subject}</div>` : ''}
            <div class="daily-class-room">📍 ${cls.room || 'Phòng ?'}</div>
            ${cls.duration ? `<div class="daily-class-duration">${cls.duration}</div>` : ''}
          </div>
          ${checkPermission('manage_schedule') ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
        </div>
      `;
    });
    html += '</div>';
  }

  dayContainer.innerHTML = html;
  container.appendChild(dayContainer);
}

function buildClassFilterOptions() {
  const select = document.getElementById('classFilter');
  if (!select) return; // Element may not exist
  
  const allClasses = new Set();
  
  Object.values(schedules).forEach(week => {
    Object.values(week).forEach(dayClasses => {
      dayClasses.forEach(cls => {
        allClasses.add(cls.name);
      });
    });
  });
  
  const options = Array.from(allClasses).sort();
  options.forEach(className => {
    const opt = document.createElement('option');
    opt.value = className;
    opt.textContent = className;
    select.appendChild(opt);
  });
}

function buildModalClassFilterOptions() {
  const select = document.getElementById('modalClassFilter');
  if (!select) return; // Element may not exist
  
  select.innerHTML = '<option value="">-- Tất cả lớp --</option>';
  
  const allClasses = new Set();
  
  Object.values(schedules).forEach(week => {
    Object.values(week).forEach(dayClasses => {
      dayClasses.forEach(cls => {
        allClasses.add(cls.name);
      });
    });
  });
  
  const options = Array.from(allClasses).sort();
  options.forEach(className => {
    const opt = document.createElement('option');
    opt.value = className;
    opt.textContent = className;
    select.appendChild(opt);
  });

  // Restore selection from global state
  select.value = filteredClassName;
}

function buildManageClassFilterOptions() {
  const select = document.getElementById('manageClassFilter');
  if (!select) return;

  select.innerHTML = '<option value="">-- Tất cả lớp --</option>';
  
  const allClasses = new Set();
  
  Object.values(schedules).forEach(week => {
    Object.values(week).forEach(dayClasses => {
      dayClasses.forEach(cls => {
        allClasses.add(cls.name);
      });
    });
  });
  
  const options = Array.from(allClasses).sort();
  options.forEach(className => {
    const opt = document.createElement('option');
    opt.value = className;
    opt.textContent = className;
    select.appendChild(opt);
  });

  // Restore selection
  select.value = filteredClassName;
}

function filterScheduleByClass() {
  const select = document.getElementById('classFilter');
  if (!select) return;
  filteredClassName = select.value;
  // Update main schedule view if needed
}

function filterModalScheduleByClass() {
  const select = document.getElementById('modalClassFilter');
  filteredClassName = select.value;
  
  // Sync to header filter
  const headerSelect = document.getElementById('headerClassFilter');
  if (headerSelect) headerSelect.value = filteredClassName;

  // Sync to manage filter
  const manageSelect = document.getElementById('manageClassFilter');
  if (manageSelect) manageSelect.value = filteredClassName;

  updateModalSchedule();
  renderCalendar(); // Update calendar dots
}

function togglePeriodMode() {
  const isPeriodMode = document.getElementById('usePeriodMode').checked;
  const timeGroup = document.getElementById('timeInputGroup');
  const periodGroup = document.getElementById('periodInputGroup');

  if (isPeriodMode) {
    timeGroup.style.display = 'none';
    periodGroup.style.display = 'flex';
    periodGroup.style.gap = '10px';
  } else {
    timeGroup.style.display = 'flex';
    periodGroup.style.display = 'none';
  }
}

function addClassFromModal() {
  const nameInput = document.getElementById('classInputModal');
  const roomInput = document.getElementById('roomInputModal');
  const daySelect = document.getElementById('daySelectModal');
  const isPeriodMode = document.getElementById('usePeriodMode').checked;

  const name = nameInput.value.trim();
  const room = roomInput.value.trim();
  const day = daySelect.value;

  let time = '';
  let endTime = '';
  let duration = '';

  if (isPeriodMode) {
    const p = parseInt(document.getElementById('startPeriodSelect').value);

    // Lấy giờ từ map PERIODS
    const startTimeStr = PERIODS[p] ? PERIODS[p].start : '';
    const endTimeStr = PERIODS[p] ? PERIODS[p].end : '';
    
    time = startTimeStr;
    endTime = endTimeStr;
    duration = `Tiết ${p} (${startTimeStr} - ${endTimeStr})`;

  } else {
    // Chế độ nhập giờ thủ công
    time = document.getElementById('timeInputManage').value.trim();
    endTime = document.getElementById('endTimeInputManage').value.trim();
    
    if (!time) {
      showToast('Vui lòng nhập thời gian bắt đầu', 'error');
      return;
    }
    duration = endTime ? `${time} - ${endTime}` : `${time} - ?`;
  }

  if (!name) {
    showToast('Vui lòng nhập tên lớp', 'error');
    return;
  }

  const weekKey = `week-${currentWeek}`;
  if (!schedules[weekKey]) {
    schedules[weekKey] = initEmptyWeek();
  }

  // Đảm bảo mảng của ngày tồn tại (Firebase không lưu mảng rỗng)
  if (!schedules[weekKey][day]) {
    schedules[weekKey][day] = [];
  }

  const newClass = {
    id: Date.now(),
    name: name,
    time: time,
    endTime: endTime || null,
    room: room || 'Phòng chưa xác định',
    duration: duration,
    completions: {}
  };

  schedules[weekKey][day].push(newClass);
  saveSchedules();
  logAction('Thêm lớp học', `Lớp: ${name} - Thứ: ${day}`);
  showToast('Đã thêm lớp học!', 'success');
  buildHeaderClassFilterOptions(); // Cập nhật droplist

  // Reset form
  nameInput.value = '';
  document.getElementById('timeInputManage').value = '';
  document.getElementById('endTimeInputManage').value = '';
  roomInput.value = '';
  
  updateModalSchedule();
  renderCalendar();
}

function editClass(day, idx) {
  if (!checkPermission('manage_schedule')) return;
  
  const weekKey = `week-${currentWeek}`;
  const cls = schedules[weekKey][day][idx];
  if (!cls) return;

  editingClassIndex = { day, idx };
  
  // Populate Edit Modal (Modal riêng)
  document.getElementById('classInputEdit').value = cls.name || '';
  document.getElementById('subjectInputEdit').value = cls.subject || '';
  document.getElementById('roomInputEdit').value = cls.room || '';
  document.getElementById('daySelectEdit').value = day;
  
  let isPeriod = false;
  if (cls.duration && cls.duration.startsWith('Tiết')) {
    const match = cls.duration.match(/^Tiết (\d+)/);
    if (match) {
      isPeriod = true;
      document.getElementById('usePeriodModeEdit').checked = true;
      document.getElementById('startPeriodSelectEdit').value = match[1];
    }
  }
  
  if (!isPeriod) {
    document.getElementById('usePeriodModeEdit').checked = false;
    document.getElementById('timeInputEdit').value = cls.time || '';
    document.getElementById('endTimeInputEdit').value = cls.endTime || '';
  }
  
  togglePeriodModeEdit();
  document.getElementById('editClassModal').style.display = 'flex';
}

function addClassFromManageModal() {
  const nameInput = document.getElementById('classInputManage');
  const subjectInput = document.getElementById('subjectInputManage');
  const timeInput = document.getElementById('timeInputManage');
  const endTimeInput = document.getElementById('endTimeInputManage');
  const roomInput = document.getElementById('roomInputManage');
  const daySelect = document.getElementById('daySelectManage');

  const isPeriodMode = document.getElementById('usePeriodMode').checked;

  const name = nameInput.value.trim();
  const subject = subjectInput ? subjectInput.value.trim() : '';
  const room = roomInput.value.trim();
  const day = daySelect.value;

  let time = '';
  let endTime = '';
  let duration = '';

  if (isPeriodMode) {
    const p = parseInt(document.getElementById('startPeriodSelect').value);

    // Lấy giờ từ map PERIODS
    const startTimeStr = PERIODS[p] ? PERIODS[p].start : '';
    const endTimeStr = PERIODS[p] ? PERIODS[p].end : '';
    
    time = startTimeStr;
    endTime = endTimeStr;
    duration = `Tiết ${p} (${startTimeStr} - ${endTimeStr})`;
  } else {
    time = timeInput.value.trim();
    endTime = endTimeInput.value.trim();
    duration = endTime ? `${time} - ${endTime}` : `${time} - ?`;
  }

  if (!name || !time) {
    showToast('Vui lòng nhập tên lớp và thời gian bắt đầu', 'error');
    return;
  }

  const weekKey = `week-${currentWeek}`;
  if (!schedules[weekKey]) {
    schedules[weekKey] = initEmptyWeek();
  }

  // Đảm bảo mảng của ngày tồn tại (Firebase không lưu mảng rỗng)
  if (!schedules[weekKey][day]) {
    schedules[weekKey][day] = [];
  }

  const newClass = {
    id: Date.now(),
    name: name,
    subject: subject,
    time: time,
    endTime: endTime || null,
    room: room || 'Phòng chưa xác định',
    duration: duration,
    completions: {}
  };

  // CHỈ THÊM MỚI (Logic sửa đã chuyển sang saveEditClass)
  if (!schedules[weekKey][day]) {
    schedules[weekKey][day] = [];
  }
  schedules[weekKey][day].push(newClass);

  saveSchedules();
  logAction('Thêm lớp học', `Lớp: ${name} - Thứ: ${day}`);
  showToast('Đã thêm lớp học!', 'success');
  buildHeaderClassFilterOptions(); // Cập nhật droplist
  buildModalClassFilterOptions();
  buildManageClassFilterOptions();

  // Giữ lại tên lớp, môn và phòng để nhập tiếp nhanh hơn
  // nameInput.value = ''; 
  // if (subjectInput) subjectInput.value = '';
  // roomInput.value = '';
  
  if (timeInput) timeInput.value = '';
  if (endTimeInput) endTimeInput.value = '';
  
  // Tự động tăng tiết nếu đang ở chế độ chọn tiết
  if (isPeriodMode) {
    const currentPeriod = parseInt(document.getElementById('startPeriodSelect').value);
    if (currentPeriod < 10) {
      document.getElementById('startPeriodSelect').value = currentPeriod + 1;
    }
  }

  updateModalSchedule();
  renderCalendar();
}

function openAddWeekModal() {
  // Tính toán số tuần tiếp theo dựa trên các tuần đã có
  const weekKeys = Object.keys(schedules);
  let maxWeek = 0;
  if (weekKeys.length > 0) {
    maxWeek = Math.max(...weekKeys.map(w => {
      const num = parseInt(w.split('-')[1]);
      return isNaN(num) ? 0 : num;
    }));
  }
  editingWeek = maxWeek + 1; // Set ID cho tuần mới
  
  const modalTitle = document.querySelector('#addWeekModal h2');
  if (modalTitle) modalTitle.textContent = '➕ Thêm Tuần Mới';

  document.getElementById('weekClassNameInput').value = '10C7';
  document.getElementById('weekNameInput').value = `Tuần ${editingWeek}`;
  document.getElementById('weekStartDate').value = '';
  document.getElementById('weekEndDate').value = '';
  // Mặc định chọn ngày cụ thể để người dùng nhập
  document.querySelector('input[name="durationType"][value="date"]').checked = true;
  
  document.body.style.overflow = 'hidden'; // Lock body
  document.documentElement.style.overflow = 'hidden';
  document.getElementById('addWeekModal').style.display = 'flex';
}

function closeAddWeekModal() {
  document.getElementById('addWeekModal').style.display = 'none';
  document.body.style.overflow = 'auto'; // Restore scroll
  document.documentElement.style.overflow = 'auto';
}

function saveWeekInfo() {
  const className = document.getElementById('weekClassNameInput').value.trim();
  const name = document.getElementById('weekNameInput').value.trim();
  const startDate = document.getElementById('weekStartDate').value;
  const endDate = document.getElementById('weekEndDate').value;
  const durationType = document.querySelector('input[name="durationType"]:checked').value;
  
  if (!name) {
    showToast('Vui lòng nhập tên tuần', 'error');
    return;
  }
  
  // Sử dụng editingWeek (được set khi thêm mới hoặc sửa) thay vì currentWeek
  const targetWeek = editingWeek || currentWeek;
  const weekKey = `week-${targetWeek}`;

  // Nếu tuần chưa tồn tại (thêm mới), khởi tạo dữ liệu rỗng
  if (!schedules[weekKey]) {
    schedules[weekKey] = initEmptyWeek();
    saveSchedules();
  }

  weekMetadata[weekKey] = {
    className: className,
    name: name,
    startDate: startDate,
    endDate: durationType === 'date' ? endDate : null,
    infinite: durationType === 'infinite'
  };
  
  saveWeekMetadata();
  logAction('Cập nhật tuần', `Tuần: ${name}`);
  showToast('Đã lưu thông tin tuần!', 'success');
  renderWeekSelector();
  renderCalendar(); // Cập nhật lịch để hiển thị đúng khoảng thời gian

  // Luôn refresh lại modal để cập nhật thông tin mới nhất (tên, ngày, lớp...)
  selectWeekModal(targetWeek);

  closeAddWeekModal();
}

function deleteCurrentWeek() {
  if (confirm('Xóa tuần này và tất cả các lớp học trong tuần?')) {
    const weekKey = `week-${editingWeek}`;
    delete schedules[weekKey];
    delete weekMetadata[weekKey];
    saveSchedules();
    logAction('Xóa tuần', `Tuần: ${editingWeek}`);
    showToast('Đã xóa tuần thành công', 'success');
    saveWeekMetadata();
    renderWeekSelector();
    renderCalendar();
    closeAddWeekModal();
    
    // Nếu xoá tuần đang xem, reset về màn hình chính hoặc tuần đầu tiên
    if (editingWeek === currentWeek) {
      closeScheduleModal();
      initializeSchedules();
    }
  }
}

// Open week management modal
function openWeekManager(weekNum) {
  editingWeek = weekNum;
  const weekKey = `week-${weekNum}`;
  const metadata = weekMetadata[weekKey] || {};
  
  const modalTitle = document.querySelector('#addWeekModal h2');
  if (modalTitle) modalTitle.textContent = `⚙️ Chỉnh Sửa Tuần ${weekNum}`;
  
  // Load dữ liệu cũ vào form
  document.getElementById('weekClassNameInput').value = metadata.className || '';
  document.getElementById('weekNameInput').value = metadata.name || `Tuần ${weekNum}`;
  document.getElementById('weekStartDate').value = metadata.startDate || '';
  document.getElementById('weekEndDate').value = metadata.endDate || '';
  
  if (metadata.infinite) {
    document.querySelector('input[name="durationType"][value="infinite"]').checked = true;
  } else {
    document.querySelector('input[name="durationType"][value="date"]').checked = true;
  }
  
  document.body.style.overflow = 'hidden'; // Lock body
  document.documentElement.style.overflow = 'hidden';
  document.getElementById('addWeekModal').style.display = 'flex';
}

function toggleClassCompletion(day, idx) {
  const weekKey = `week-${currentWeek}`;
  const cls = schedules[weekKey][day][idx];

  if (!cls.completions) {
    cls.completions = {};
  }

  cls.completions[currentUser.id] = !cls.completions[currentUser.id];
  saveSchedules();
  renderSchedule();
}

// --- Header Filter Functions ---

function buildHeaderClassFilterOptions() {
  const select = document.getElementById('headerClassFilter');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Tất cả --</option>';
  
  const allClasses = new Set();
  
  // Quét tất cả các tuần để lấy danh sách tên lớp/môn học
  Object.values(schedules).forEach(week => {
    Object.values(week).forEach(dayClasses => {
      dayClasses.forEach(cls => {
        if (cls.name) allClasses.add(cls.name);
      });
    });
  });
  
  const options = Array.from(allClasses).sort();
  options.forEach(className => {
    const opt = document.createElement('option');
    opt.value = className;
    opt.textContent = className;
    select.appendChild(opt);
  });
  
  // Restore selection from global state
  select.value = filteredClassName;
}

function filterScheduleByHeader() {
  const select = document.getElementById('headerClassFilter');
  filteredClassName = select.value;
  
  // Sync to modal filter
  const modalSelect = document.getElementById('modalClassFilter');
  if (modalSelect) modalSelect.value = filteredClassName;

  // Sync to manage filter
  const manageSelect = document.getElementById('manageClassFilter');
  if (manageSelect) manageSelect.value = filteredClassName;

  renderCalendar(); // Cập nhật chấm trên lịch
  
  // Nếu modal đang mở thì cập nhật luôn
  if (document.getElementById('scheduleModal').style.display !== 'none') {
    updateModalSchedule();
  }
}

// --- Helper Functions cho Class Name & Periods ---

function initInputHistory() {
  // Lắng nghe dữ liệu từ Firebase để cập nhật danh sách gợi ý
  if (typeof onSharedInputHistoryChanged === 'function') {
    onSharedInputHistoryChanged((data) => {
      // Cập nhật UI khi có dữ liệu mới từ server
      updateDatalist('weekClassNamesList', data.weekClasses || ['10C7']);
      updateDatalist('manageClassNamesList', data.classNames || ['10C7']);
      updateDatalist('manageSubjectsList', data.subjects || ['Đại số', 'Hình học', 'Tiếng Anh']);
      updateDatalist('manageRoomsList', data.rooms || ['P.101', 'P.102', 'P.Lab']);
    });
  }

  // Thiết lập logic lưu trữ cho các input (kết nối với Firebase key tương ứng)
  // 1. Week Class Name (in Modal)
  setupInputHistory('weekClassNameInput', 'weekClassNamesList', 'weekClasses', ['10C7']);
  
  // 2. Modal Inputs (Tên lớp, Môn học, Phòng)
  setupInputHistory('classInputManage', 'manageClassNamesList', 'classNames', ['10C7']);
  setupInputHistory('subjectInputManage', 'manageSubjectsList', 'subjects', ['Toán', 'Văn', 'Tiếng Anh']);
  setupInputHistory('roomInputManage', 'manageRoomsList', 'rooms', ['P.101']);
}

// Hàm thiết lập lịch sử cho một input bất kỳ
function setupInputHistory(inputId, datalistId, firebaseType, defaultValues = []) {
  const input = document.getElementById(inputId);
  const datalist = document.getElementById(datalistId);
  if (!input || !datalist) return;

  // Load ban đầu từ cache (nếu có) để hiển thị ngay lập tức
  const cachedData = JSON.parse(localStorage.getItem('c7aio_inputHistory_cache')) || {};
  const currentList = cachedData[firebaseType] || defaultValues;
  updateDatalist(datalistId, currentList);

  // Hàm lưu lịch sử
  const saveHistory = () => {
    const val = input.value.trim();
    if (val) {
      // Lấy dữ liệu mới nhất từ cache
      const currentCache = JSON.parse(localStorage.getItem('c7aio_inputHistory_cache')) || {};
      let list = currentCache[firebaseType] || defaultValues;
      
      if (!list.includes(val)) {
        list.push(val);
        
        // Update cache local giả lập để UI phản hồi nhanh
        currentCache[firebaseType] = list;
        localStorage.setItem('c7aio_inputHistory_cache', JSON.stringify(currentCache));
        updateDatalist(datalistId, list);
        
        // Lưu lên Firebase
        if (typeof saveSharedInputHistory === 'function') {
          saveSharedInputHistory(firebaseType, list);
        }
      }
    }
  };

  // Lưu khi rời khỏi ô nhập hoặc nhấn Enter (change covers both usually)
  input.addEventListener('change', saveHistory);
  input.addEventListener('blur', saveHistory);
}

function updateDatalist(datalistId, items) {
  const datalist = document.getElementById(datalistId);
  if (!datalist) return;
  
  datalist.innerHTML = '';
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item;
    datalist.appendChild(option);
  });
}

function initPeriodSelectors() {
  const startSelect = document.getElementById('startPeriodSelect');
  
  if (!startSelect) return;

  startSelect.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const option = `<option value="${i}">Tiết ${i}</option>`;
    startSelect.innerHTML += option;
  }
  
  // Mặc định tiết 1
  startSelect.value = 1;
}

// --- RESPONSIVE STYLES INJECTION ---
function injectResponsiveStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    /* --- COMMON STYLES --- */
    html, body {
      width: 100%;
      overflow-x: hidden; /* Ngăn cuộn ngang gây lỗi zoom trên mobile */
      position: relative;
      min-height: 100vh;
    }

    #modalsWrapper {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      box-sizing: border-box;
    }
    #modalsWrapper.active { display: flex; }

    /* --- DESKTOP STYLES (PC > 768px) --- */
    @media (min-width: 769px) {
      /* Layout 2 modal song song, căn chỉnh thoáng hơn */
      #modalsWrapper {
        flex-direction: row;
        align-items: flex-start; /* Căn trên cùng để tránh bị giãn dọc */
        justify-content: center;
        padding: 30px;
        gap: 20px;
        overflow-y: auto;
      }

      /* 1. Modal Lịch (Bên trái) */
      #scheduleModal {
        flex: 1;
        min-width: 600px; /* Đảm bảo không bị bóp nhỏ */
        height: auto;
        min-height: 500px;
        height: 90vh !important;
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        position: relative !important; /* Reset position cũ */
        top: auto !important; left: auto !important;
        transform: none !important;
      }

      #scheduleModal .modal-content {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 0;
      }
      
      #scheduleModal .modal-header { padding: 15px 20px; border-bottom: 1px solid #eee; }
      #scheduleModal .view-mode-buttons-modal { padding: 10px 20px; border-bottom: 1px solid #eee; }

      #modalScheduleContainer {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: row; /* 7 cột ngang */
        gap: 15px; /* Khoảng cách giữa các cột */
      }

      .day-column {
        flex: 1;
        min-width: 0;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        background: #fff;
      }
      
      .day-header {
        padding: 10px;
        background: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
        text-align: center;
        font-weight: bold;
        border-radius: 6px 6px 0 0;
      }
      
      .classes-list { padding: 10px; }
      
      .class-item {
        margin-bottom: 10px;
        padding: 8px;
        border-bottom: 1px solid #f0f0f0;
      }
      .class-item:last-child { border-bottom: none; }

      /* 2. Modal Quản lý (Bên phải) - Cố định kích thước chuẩn */
      #manageClassModal {
        width: 350px !important;
        flex: 0 0 350px;
        height: auto;
        max-height: 90vh !important;
        overflow-y: auto;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        position: relative !important;
        top: auto !important; left: auto !important;
        transform: none !important;
      }
      
      .manage-class-modal {
        width: 100% !important;
        padding: 0;
      }
      .manage-class-modal .modal-header { padding: 15px 20px; border-bottom: 1px solid #eee; }
      .manage-class-modal .modal-body { padding: 20px; }
    }

    /* --- MOBILE STYLES (Điện thoại < 768px) --- */
    @media (max-width: 768px) {
      #modalsWrapper {
        flex-direction: column;
        align-items: center;
        justify-content: flex-start; /* Bắt đầu từ trên cùng */
        overflow-y: auto; /* Cho phép cuộn cả wrapper */
        padding: 10px;
      }

      #scheduleModal, #manageClassModal {
        width: 100% !important;
        max-width: 100% !important;
        margin-bottom: 20px;
        height: auto !important;
        max-height: none !important;
        position: relative !important;
        top: auto !important; left: auto !important;
        transform: none !important;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      #modalScheduleContainer {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 15px;
      }

      .day-column {
        display: block;
        width: 100%;
        flex: none !important;
        height: auto !important;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
      }

      .day-header {
        padding: 12px;
        background: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
        font-weight: 600;
      }

      .classes-list { padding: 10px; }
      
      .class-item {
        padding: 10px;
        margin-bottom: 8px;
        background: #fafafa;
        border: 1px solid #eee;
        border-radius: 6px;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===== NEW EDIT MODAL LOGIC =====

function injectEditModal() {
  if (document.getElementById('editClassModal')) return;
  
  const modalHtml = `
  <div id="editClassModal" class="modal" style="display: none; z-index: 10000; align-items: center; justify-content: center;">
    <div class="modal-content" style="max-width: 450px; width: 95%; background: white; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); overflow: hidden;">
      <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 20px; color: white; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 1.1rem; font-weight: 600;">✏️ Chỉnh Sửa Chi Tiết</h2>
        <button onclick="closeEditClassModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: white; opacity: 0.8;">✕</button>
      </div>
      <div class="modal-body" style="padding: 25px; max-height: 80vh; overflow-y: auto;">
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444;">Tên lớp / Môn học (*)</label>
          <input type="text" id="classInputEdit" list="manageClassNamesList" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444;">Môn học chi tiết (VD: Đại số)</label>
          <input type="text" id="subjectInputEdit" list="manageSubjectsList" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
        </div>

        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444;">Thứ (*)</label>
          <select id="daySelectEdit" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; background: white; box-sizing: border-box;">
            <option value="monday">Thứ Hai</option>
            <option value="tuesday">Thứ Ba</option>
            <option value="wednesday">Thứ Tư</option>
            <option value="thursday">Thứ Năm</option>
            <option value="friday">Thứ Sáu</option>
            <option value="saturday">Thứ Bảy</option>
            <option value="sunday">Chủ Nhật</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 15px; background: #f8f9fa; padding: 10px; border-radius: 6px;">
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight: 500; color: #555;">
            <input type="checkbox" id="usePeriodModeEdit" onchange="togglePeriodModeEdit()" style="width: 18px; height: 18px;">
            Sử dụng khung giờ chuẩn (Tiết học)
          </label>
        </div>

        <div id="periodInputGroupEdit" class="form-group" style="display:none; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444;">Chọn tiết</label>
          <select id="startPeriodSelectEdit" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
            <!-- Options generated by JS -->
          </select>
        </div>

        <div id="timeInputGroupEdit" class="form-row" style="display: flex; gap: 10px; margin-bottom: 15px;">
          <div class="form-group" style="flex: 1;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444;">Bắt đầu (*)</label>
            <input type="time" id="timeInputEdit" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
          </div>
          <div class="form-group" style="flex: 1;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444;">Kết thúc</label>
            <input type="time" id="endTimeInputEdit" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444;">Phòng học</label>
          <input type="text" id="roomInputEdit" list="manageRoomsList" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
        </div>

        <div class="modal-actions" style="display: flex; gap: 10px; justify-content: space-between; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <button onclick="deleteClassFromEditModal()" style="padding: 10px 15px; background: #fff0f0; color: #e74c3c; border: 1px solid #ffcccc; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 5px;">
            🗑️ Xóa lớp
          </button>
          <div style="display: flex; gap: 10px;">
            <button onclick="closeEditClassModal()" style="padding: 10px 20px; background: #f1f2f6; color: #57606f; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Hủy</button>
            <button onclick="saveEditClass()" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">💾 Lưu Thay Đổi</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const select = document.getElementById('startPeriodSelectEdit');
  if (select) {
    for (let i = 1; i <= 10; i++) {
      select.innerHTML += `<option value="${i}">Tiết ${i}</option>`;
    }
  }
}

function togglePeriodModeEdit() {
  const isPeriod = document.getElementById('usePeriodModeEdit').checked;
  document.getElementById('periodInputGroupEdit').style.display = isPeriod ? 'block' : 'none';
  document.getElementById('timeInputGroupEdit').style.display = isPeriod ? 'none' : 'flex';
}

function closeEditClassModal() {
  document.getElementById('editClassModal').style.display = 'none';
  editingClassIndex = null;
}

function deleteClassFromEditModal() {
  if (!editingClassIndex) return;
  // Gọi hàm deleteClass gốc (nó đã có confirm và logic xóa)
  // Lưu ý: deleteClass cần tham số (day, idx)
  deleteClass(editingClassIndex.day, editingClassIndex.idx);
  // Sau khi xóa xong thì đóng modal edit
  closeEditClassModal();
}

function saveEditClass() {
  if (!editingClassIndex) return;
  
  const name = document.getElementById('classInputEdit').value.trim();
  const subject = document.getElementById('subjectInputEdit').value.trim();
  const room = document.getElementById('roomInputEdit').value.trim();
  const day = document.getElementById('daySelectEdit').value;
  const isPeriod = document.getElementById('usePeriodModeEdit').checked;
  
  let time = '', endTime = '', duration = '';
  
  if (isPeriod) {
    const p = parseInt(document.getElementById('startPeriodSelectEdit').value);
    time = PERIODS[p] ? PERIODS[p].start : '';
    endTime = PERIODS[p] ? PERIODS[p].end : '';
    duration = `Tiết ${p} (${time} - ${endTime})`;
  } else {
    time = document.getElementById('timeInputEdit').value;
    endTime = document.getElementById('endTimeInputEdit').value;
    duration = endTime ? `${time} - ${endTime}` : `${time} - ?`;
  }
  
  if (!name || !time) {
    showToast('Thiếu tên hoặc thời gian!', 'error');
    return;
  }
  
  const weekKey = `week-${currentWeek}`;
  const oldDay = editingClassIndex.day;
  // FIX BUG: Sử dụng .idx thay vì .index (do editClass lưu là {day, idx})
  const oldIdx = editingClassIndex.idx;
  
  if (!schedules[weekKey][oldDay] || !schedules[weekKey][oldDay][oldIdx]) {
    showToast('Lỗi: Không tìm thấy lớp học gốc để sửa.', 'error');
    closeEditClassModal();
    return;
  }
  
  const oldClass = schedules[weekKey][oldDay][oldIdx];
  const updatedClass = { ...oldClass, name, subject, time, endTime, room, duration };
  
  if (oldDay !== day) {
    schedules[weekKey][oldDay].splice(oldIdx, 1);
    if (!schedules[weekKey][day]) schedules[weekKey][day] = [];
    schedules[weekKey][day].push(updatedClass);
  } else {
    schedules[weekKey][day][oldIdx] = updatedClass;
  }
  
  saveSchedules();
  logAction('Sửa lớp học', `Lớp: ${name} - Thứ: ${day}`);
  showToast('Đã cập nhật lớp học!', 'success');
  buildHeaderClassFilterOptions();
  updateModalSchedule();
  renderCalendar();
  closeEditClassModal();
}
