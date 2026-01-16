// Lấy sự kiện từ localStorage
function getEvents() {
  const stored = localStorage.getItem('c7aio_events');
  return stored ? JSON.parse(stored) : {};
}

// Lưu sự kiện vào localStorage
function saveEvents(events) {
  localStorage.setItem('c7aio_events', JSON.stringify(events));
}

let events = getEvents();
let currentDate = new Date();
let selectedDate = new Date();

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Cập nhật tiêu đề tháng
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;

  // Lấy ngày đầu tiên và cuối cùng của tháng
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const daysContainer = document.getElementById('calendarDays');
  daysContainer.innerHTML = '';

  // Thêm các ngày từ tháng trước
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    daysContainer.innerHTML += `
      <div class="day other-month">
        <div class="day-number">${prevDate.getDate()}</div>
      </div>
    `;
  }

  // Thêm các ngày của tháng hiện tại
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().split('T')[0];
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    const hasEvent = events[dateKey] && events[dateKey].length > 0;

    const dayElement = document.createElement('div');
    dayElement.className = `day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`;
    dayElement.innerHTML = `<div class="day-number">${day}</div>`;
    dayElement.onclick = () => selectDate(date);
    daysContainer.appendChild(dayElement);
  }

  // Thêm các ngày từ tháng sau
  const totalCells = daysContainer.children.length;
  const remainingCells = 42 - totalCells;
  for (let day = 1; day <= remainingCells; day++) {
    daysContainer.innerHTML += `
      <div class="day other-month">
        <div class="day-number">${day}</div>
      </div>
    `;
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

function selectDate(date) {
  selectedDate = new Date(date);
  renderEventList();
}

function addEvent() {
  const input = document.getElementById('eventInput');
  const eventName = input.value.trim();

  if (!eventName) {
    alert('Vui lòng nhập tên sự kiện');
    return;
  }

  const dateKey = selectedDate.toISOString().split('T')[0];
  if (!events[dateKey]) {
    events[dateKey] = [];
  }

  events[dateKey].push({
    id: Date.now(),
    name: eventName,
    createdAt: new Date().toISOString()
  });

  saveEvents(events);
  input.value = '';
  renderCalendar();
  renderEventList();
}

function deleteEvent(dateKey, eventId) {
  if (events[dateKey]) {
    events[dateKey] = events[dateKey].filter(e => e.id !== eventId);
    if (events[dateKey].length === 0) {
      delete events[dateKey];
    }
    saveEvents(events);
    renderCalendar();
    renderEventList();
  }
}

function renderEventList() {
  const dateKey = selectedDate.toISOString().split('T')[0];
  const dayEvents = events[dateKey] || [];

  // Cập nhật tiêu đề
  const dateStr = selectedDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric'
  });
  document.querySelector('.events-section h2').textContent = `📌 Sự kiện - ${dateStr}`;

  const eventList = document.getElementById('eventList');

  if (dayEvents.length === 0) {
    eventList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>Không có sự kiện nào</p>
      </div>
    `;
    return;
  }

  eventList.innerHTML = dayEvents
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(event => `
      <li class="event-item">
        <div class="event-content">
          <div class="event-name">${escapeHtml(event.name)}</div>
          <div class="event-time">⏰ ${new Date(event.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <button class="event-delete-btn" onclick="deleteEvent('${dateKey}', ${event.id})">
          Xóa
        </button>
      </li>
    `)
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('eventInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addEvent();
    }
  });

  selectedDate = new Date();
  renderCalendar();
  renderEventList();
});
