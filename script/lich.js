// Schedule system - Multiple weeks with daily timetables
let schedules = {}; // { "week-1": { "monday": [...], "tuesday": [...] }, ... }
let currentDate = new Date(); // For calendar navigation
let selectedDate = null; // Selected date to determine week
let currentWeek = 1;
let currentUser = null;
let viewMode = 'week'; // 'week', 'day', 'daily'

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
  
  document.getElementById('classInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addClass();
    }
  });

  // Chỉ admin mới thêm được class
  if (!isAdmin()) {
    document.querySelector('.class-input-area').style.display = 'none';
  }

  loadSchedules();
  initializeSchedules();
  setupViewModeButtons();
  renderCalendar();
  renderWeekSelector();
  renderSchedule();
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

function initializeSchedules() {
  // Khởi tạo week 1 nếu chưa có
  if (!schedules['week-1']) {
    schedules['week-1'] = initEmptyWeek();
    saveSchedules();
  }
  
  // Set selectedDate = today
  if (!selectedDate) {
    selectedDate = new Date();
    currentWeek = getWeekNumberFromDate(selectedDate);
  }
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
    
    dayDiv.textContent = day;
    dayDiv.onclick = () => selectDateFromCalendar(date);
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
    const btn = document.createElement('button');
    btn.className = `week-btn ${week === `week-${currentWeek}` ? 'active' : ''}`;
    btn.textContent = `Tuần ${weekNum}`;
    btn.onclick = () => selectWeek(parseInt(weekNum));
    container.appendChild(btn);
  });

  // Nút thêm tuần (chỉ Admin)
  if (isAdmin()) {
    const addBtn = document.createElement('button');
    addBtn.className = 'week-btn add-week-btn';
    addBtn.textContent = '+ Thêm tuần';
    addBtn.onclick = addWeek;
    container.appendChild(addBtn);
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
  saveSchedules();
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
    renderSchedule();
  }
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
