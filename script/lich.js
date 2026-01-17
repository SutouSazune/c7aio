// Schedule system - Multiple weeks with daily timetables
let schedules = {}; // { "week-1": { "monday": [...], "tuesday": [...] }, ... }
let weekMetadata = {}; // { "week-1": { name: "Tuần 1", startDate: "2026-01-13", endDate: "2026-01-19", infinite: false }, ... }
let currentDate = new Date(); // For calendar navigation
let selectedDate = null; // Selected date to determine week
let currentWeek = 0; // No week selected initially
let currentUser = null;
let viewMode = 'week'; // 'week', 'day', 'daily'
let modalViewMode = 'week'; // View mode in modal
let filteredClassName = ''; // For filtering classes
let editingWeek = null; // For week management modal

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

window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  
  // Show admin controls in manage modal
  const manageClassAdminSection = document.getElementById('manageClassAdminSection');
  const manageClassFilterSection = document.getElementById('manageClassFilterSection');
  if (isAdmin()) {
    manageClassAdminSection.style.display = 'block';
    manageClassFilterSection.style.display = 'block';
    document.getElementById('classInputManage').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addClassFromManageModal();
    });
  }

  loadSchedules();
  loadWeekMetadata();
  initializeSchedules();
  renderCalendar();
  renderWeekSelector();
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
});

function loadSchedules() {
  try {
    const data = localStorage.getItem('c7aio_schedules');
    schedules = data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Lỗi tải schedules:', error);
    schedules = {};
  }
}

function loadWeekMetadata() {
  try {
    const data = localStorage.getItem('c7aio_weekMetadata');
    weekMetadata = data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Lỗi tải weekMetadata:', error);
    weekMetadata = {};
  }
}

function saveWeekMetadata() {
  localStorage.setItem('c7aio_weekMetadata', JSON.stringify(weekMetadata));
}

function initializeSchedules() {
  // Khởi tạo week 1 nếu chưa có
  if (!schedules['week-1']) {
    schedules['week-1'] = initEmptyWeek();
    saveSchedules();
  }
  
  // Set selectedDate = today
  if (!selectedDate) {
    selectedDate = new Date();
  }
  
  // Keep currentWeek = 0 to not highlight any week on initial load
  
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
    if (isAdmin()) {
      updateWeekDropdown();
    }
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
  localStorage.setItem('c7aio_schedules', JSON.stringify(schedules));
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
    const weekNum = getWeekNumberFromDate(date);
    const weekKey = `week-${weekNum}`;
    const dayName = getDayNameFromDate(date);
    if (schedules[weekKey] && schedules[weekKey][dayName] && schedules[weekKey][dayName].length > 0) {
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
  currentWeek = getWeekNumberFromDate(selectedDate);
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
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openWeekManager(parseInt(weekNum));
    });
    
    container.appendChild(btn);
  });
}

function selectWeekModal(weekNum) {
  currentWeek = weekNum;
  selectedDate = getMondayOfWeek(weekNum);
  
  // Use wrapper system instead of direct display
  const wrapper = document.getElementById('modalsWrapper');
  const modal = document.getElementById('scheduleModal');
  const manageClassModal = document.getElementById('manageClassModal');
  
  const weekKey = `week-${weekNum}`;
  const metadata = weekMetadata[weekKey] || {};
  const weekName = metadata.name || `Tuần ${weekNum}`;
  const dateStr = `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;
  
  document.getElementById('modalTitle').textContent = `${weekName} - ${dateStr}`;
  
  // Update header to show current week
  updateCurrentWeekDisplay(weekNum);
  
  // Update dropdown selection if admin
  if (isAdmin()) {
    document.getElementById('currentWeekSelect').value = weekNum;
  }
  
  buildModalClassFilterOptions();
  
  // Append modals to wrapper
  wrapper.innerHTML = '';
  wrapper.appendChild(modal);
  wrapper.appendChild(manageClassModal);
  buildManageClassFilterOptions();
  
  // Show wrapper
  wrapper.classList.add('active');
  wrapper.style.display = 'flex';
  
  modalViewMode = 'week';
  
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector('[data-mode="week"]').classList.add('active');
  
  updateModalSchedule();
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
          <div class="class-item ${isCompleted ? 'completed' : ''}">
            <div class="class-content">
              <div class="class-time">${cls.time}</div>
              <div class="class-name">${cls.name}</div>
              <div class="class-room">${cls.room || 'Phòng ?'}</div>
            </div>
            <button class="class-checkbox-btn ${isCompleted ? 'active' : ''}" 
                    onclick="toggleClassCompletion('${day}', ${idx})">
              ${isCompleted ? '✅' : '⭕'}
            </button>
            ${isAdmin() ? `<button class="delete-btn" onclick="deleteClass('${day}', ${idx})">🗑️</button>` : ''}
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
        <div class="class-item ${isCompleted ? 'completed' : ''}">
          <div class="class-content">
            <div class="class-time">${cls.time}</div>
            <div class="class-name">${cls.name}</div>
            <div class="class-room">${cls.room || 'Phòng ?'}</div>
          </div>
          <button class="class-checkbox-btn ${isCompleted ? 'active' : ''}" 
                  onclick="toggleClassCompletion('${dayName}', ${idx})">
            ${isCompleted ? '✅' : '⭕'}
          </button>
          ${isAdmin() ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
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
        <div class="daily-class-item ${isCompleted ? 'completed' : ''}">
          <div class="daily-time">${cls.time}</div>
          <div class="daily-details">
            <div class="daily-class-name">${cls.name}</div>
            <div class="daily-class-room">📍 ${cls.room || 'Phòng ?'}</div>
          </div>
          <button class="class-checkbox-btn ${isCompleted ? 'active' : ''}" 
                  onclick="toggleClassCompletion('${dayName}', ${idx})">
            ${isCompleted ? '✅' : '⭕'}
          </button>
          ${isAdmin() ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
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
  if (!isAdmin()) {
    alert('Chỉ Admin mới có thể thêm lớp');
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
    alert('Vui lòng nhập tên lớp và thời gian');
    return;
  }

  const weekKey = `week-${currentWeek}`;
  if (!schedules[weekKey]) {
    schedules[weekKey] = initEmptyWeek();
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

  nameInput.value = '';
  timeInput.value = '';
  roomInput.value = '';
  renderSchedule();
}

function deleteClass(day, idx) {
  if (!isAdmin()) {
    alert('Chỉ Admin mới có thể xóa');
    return;
  }

  if (confirm('Xóa lớp học này?')) {
    const weekKey = `week-${currentWeek}`;
    schedules[weekKey][day].splice(idx, 1);
    saveSchedules();
    updateModalSchedule();
    renderCalendar();
  }
}

// ===== MODAL FUNCTIONS =====

function openScheduleModal(date) {
  selectedDate = new Date(date);
  currentWeek = getWeekNumberFromDate(selectedDate);
  const dayName = getDayNameFromDate(selectedDate);
  
  const modal = document.getElementById('scheduleModal');
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayIndex = selectedDate.getDay();
  const dateStr = `${days[dayIndex]}, ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;
  
  document.getElementById('modalTitle').textContent = `Lịch Tuần ${currentWeek} - ${dateStr}`;
  
  // Update header to show current week
  updateCurrentWeekDisplay(currentWeek);
  
  // Update dropdown selection if admin
  if (isAdmin()) {
    document.getElementById('currentWeekSelect').value = currentWeek;
  }
  
  // Build class filter options
  buildModalClassFilterOptions();
  
  // Show both modals in wrapper
  const wrapper = document.getElementById('modalsWrapper');
  const manageClassModal = document.getElementById('manageClassModal');
  
  // Append modals to wrapper
  wrapper.innerHTML = '';
  wrapper.appendChild(modal);
  wrapper.appendChild(manageClassModal);
  buildManageClassFilterOptions();
  
  // Show wrapper
  wrapper.classList.add('active');
  wrapper.style.display = 'flex';
  
  modalViewMode = 'week';
  
  // Update view mode buttons
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector('[data-mode="week"]').classList.add('active');
  
  updateModalSchedule();
}

function closeScheduleModal() {
  const wrapper = document.getElementById('modalsWrapper');
  const modal = document.getElementById('scheduleModal');
  const manageClassModal = document.getElementById('manageClassModal');
  
  // Move modals back out of wrapper
  document.body.appendChild(modal);
  document.body.appendChild(manageClassModal);
  
  // Hide wrapper
  wrapper.classList.remove('active');
  wrapper.style.display = 'none';
  filteredClassName = '';
}

function closeManageClassModal() {
  // Close both modals along with schedule
  closeScheduleModal();
}

function filterByClassInModal() {
  const select = document.getElementById('manageClassFilter');
  filteredClassName = select.value;
  updateModalSchedule();
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
    let classes = weekSchedule[day] || [];
    
    // Apply filter
    if (filteredClassName) {
      classes = classes.filter(cls => cls.name === filteredClassName);
    }
    
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
        html += `
          <div class="class-item">
            <div class="class-content">
              <div class="class-time">${cls.time}</div>
              <div class="class-name">${cls.name}</div>
              <div class="class-room">${cls.room || 'Phòng ?'}</div>
              ${cls.duration ? `<div class="class-duration">${cls.duration}</div>` : ''}
            </div>
            ${isAdmin() ? `<button class="delete-btn" onclick="deleteClass('${day}', ${idx})">🗑️</button>` : ''}
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
  let classes = weekSchedule[dayName] || [];
  
  if (filteredClassName) {
    classes = classes.filter(cls => cls.name === filteredClassName);
  }
  
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
      html += `
        <div class="class-item">
          <div class="class-content">
            <div class="class-time">${cls.time}</div>
            <div class="class-name">${cls.name}</div>
            <div class="class-room">${cls.room || 'Phòng ?'}</div>
            ${cls.duration ? `<div class="class-duration">${cls.duration}</div>` : ''}
          </div>
          ${isAdmin() ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
        </div>
      `;
    });
  }

  html += '</div>';
  dayContainer.innerHTML = html;
  container.appendChild(dayContainer);
}

function renderDailyViewFiltered(weekSchedule, dayName, container) {
  let classes = weekSchedule[dayName] || [];
  
  if (filteredClassName) {
    classes = classes.filter(cls => cls.name === filteredClassName);
  }
  
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
      html += `
        <div class="daily-class-item">
          <div class="daily-time">${cls.time}</div>
          <div class="daily-details">
            <div class="daily-class-name">${cls.name}</div>
            <div class="daily-class-room">📍 ${cls.room || 'Phòng ?'}</div>
            ${cls.duration ? `<div class="daily-class-duration">${cls.duration}</div>` : ''}
          </div>
          ${isAdmin() ? `<button class="delete-btn" onclick="deleteClass('${dayName}', ${idx})">🗑️</button>` : ''}
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
}

function buildManageClassFilterOptions() {
  const select = document.getElementById('manageClassFilter');
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
  updateModalSchedule();
}

function addClassFromModal() {
  const nameInput = document.getElementById('classInputModal');
  const timeInput = document.getElementById('timeInputModal');
  const endTimeInput = document.getElementById('endTimeInputModal');
  const roomInput = document.getElementById('roomInputModal');
  const daySelect = document.getElementById('daySelectModal');

  const name = nameInput.value.trim();
  const time = timeInput.value.trim();
  const endTime = endTimeInput.value.trim();
  const room = roomInput.value.trim();
  const day = daySelect.value;

  if (!name || !time) {
    alert('Vui lòng nhập tên lớp và thời gian bắt đầu');
    return;
  }

  const weekKey = `week-${currentWeek}`;
  if (!schedules[weekKey]) {
    schedules[weekKey] = initEmptyWeek();
  }

  // Format duration: "8:00 - 10:00" or "8:00 - ?"
  const duration = endTime ? `${time} - ${endTime}` : `${time} - ?`;

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

  nameInput.value = '';
  timeInput.value = '';
  endTimeInput.value = '';
  roomInput.value = '';
  
  updateModalSchedule();
  renderCalendar();
}

function addClassFromManageModal() {
  const nameInput = document.getElementById('classInputManage');
  const timeInput = document.getElementById('timeInputManage');
  const endTimeInput = document.getElementById('endTimeInputManage');
  const roomInput = document.getElementById('roomInputManage');
  const daySelect = document.getElementById('daySelectManage');

  const name = nameInput.value.trim();
  const time = timeInput.value.trim();
  const endTime = endTimeInput.value.trim();
  const room = roomInput.value.trim();
  const day = daySelect.value;

  if (!name || !time) {
    alert('Vui lòng nhập tên lớp và thời gian bắt đầu');
    return;
  }

  const weekKey = `week-${currentWeek}`;
  if (!schedules[weekKey]) {
    schedules[weekKey] = initEmptyWeek();
  }

  // Format duration: "8:00 - 10:00" or "8:00 - ?"
  const duration = endTime ? `${time} - ${endTime}` : `${time} - ?`;

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

  nameInput.value = '';
  timeInput.value = '';
  endTimeInput.value = '';
  roomInput.value = '';
  
  updateModalSchedule();
  renderCalendar();
}

function openAddWeekModal() {
  editingWeek = null;
  document.getElementById('weekNameInput').value = '';
  document.getElementById('weekStartDate').value = '';
  document.getElementById('weekEndDate').value = '';
  document.querySelector('input[name="durationType"][value="date"]').checked = true;
  
  document.getElementById('addWeekModal').style.display = 'flex';
}

function closeAddWeekModal() {
  document.getElementById('addWeekModal').style.display = 'none';
}

function saveWeekInfo() {
  const name = document.getElementById('weekNameInput').value.trim();
  const startDate = document.getElementById('weekStartDate').value;
  const endDate = document.getElementById('weekEndDate').value;
  const durationType = document.querySelector('input[name="durationType"]:checked').value;
  
  if (!name) {
    alert('Vui lòng nhập tên tuần');
    return;
  }
  
  const weekKey = `week-${currentWeek}`;
  weekMetadata[weekKey] = {
    name: name,
    startDate: startDate,
    endDate: durationType === 'date' ? endDate : null,
    infinite: durationType === 'infinite'
  };
  
  saveWeekMetadata();
  renderWeekSelector();
  closeAddWeekModal();
}

function deleteCurrentWeek() {
  if (confirm('Xóa tuần này và tất cả các lớp học trong tuần?')) {
    const weekKey = `week-${editingWeek}`;
    delete schedules[weekKey];
    delete weekMetadata[weekKey];
    saveSchedules();
    saveWeekMetadata();
    renderWeekSelector();
    closeAddWeekModal();
  }
}

// Open week management modal
function openWeekManager(weekNum) {
  editingWeek = weekNum;
  const weekKey = `week-${weekNum}`;
  const metadata = weekMetadata[weekKey] || {};
  
  document.getElementById('weekNameInput').value = metadata.name || `Tuần ${weekNum}`;
  document.getElementById('weekStartDate').value = metadata.startDate || '';
  document.getElementById('weekEndDate').value = metadata.endDate || '';
  
  if (metadata.infinite) {
    document.querySelector('input[name="durationType"][value="infinite"]').checked = true;
  } else {
    document.querySelector('input[name="durationType"][value="date"]').checked = true;
  }
  
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
