# 🤖 C7AIO Automation API & Console Commands (v3.4.0)

Bộ công cụ lập trình & giao diện Console API cho phép AI Agent / Bot / Developer tự động trích xuất thông tin (từ Zalo, Facebook, Tin nhắn lớp) và đẩy trực tiếp dữ liệu (Nhiệm vụ, Thông báo, Thời khóa biểu) vào Firebase Realtime Database của hệ thống **C7AIO**.

Tất cả các API được gắn trực tiếp trên đối tượng toàn cục:
`window.C7_CONSOLE` (hoặc alias `window.C7_BOT`).

---

## 📑 Mục lục
1. [Quản lý Nhiệm vụ (Tasks API)](#1-quản-lý-nhiệm-vụ-tasks-api)
2. [Quản lý Thông báo (Notifications API)](#2-quản-lý-thông-báo-notifications-api)
3. [Quản lý Thời khóa biểu (Schedules API)](#3-quản-lý-thời-khóa-biểu-schedules-api)
4. [Nạp hàng loạt (Batch Ingestion API)](#4-nạp-hàng-loạt-batch-ingestion-api)
5. [Ví dụ thực tế cho AI Agent](#5-ví-dụ-thực-tế-cho-ai-agent)

---

## 1. Quản lý Nhiệm vụ (Tasks API)

### 1.1. Thêm nhiệm vụ: `C7_CONSOLE.addTask(payload)`

#### 🏷️ TypeScript Interface:
```typescript
interface TaskPayload {
  name: string;                    // [Bắt buộc] Tên nhiệm vụ ngắn gọn, rõ ràng
  category?: string;                // Môn học / Thể loại (Toán, Văn, Lý, Hóa, Sinh, Tin, Anh, Hoạt động...). Mặc định: 'Bài tập'
  priority?: 'Bình thường' | 'Khẩn cấp'; // Mức độ ưu tiên. Mặc định: 'Bình thường'
  deadline?: string | Date | null;  // Hạn nộp (ISO 8601, 'YYYY-MM-DD HH:mm' hoặc 'DD/MM/YYYY HH:mm'). Tự động chuẩn hóa
  description?: string;            // Chi tiết hướng dẫn, link bài tập (URL thô tự động chuyển thành hyperlink <a>)
  assignedStudents?: number[];     // Mảng ID học sinh (rỗng [] là giao cho cả lớp)
  tags?: string[];                 // Nhãn phân loại phụ (VD: ['Livestream', 'Facebook', 'BTVN'])
}
```

#### 💻 Ví dụ Console:
```javascript
// Thêm 1 bài tập Toán có hạn nộp và link tài liệu
await C7_CONSOLE.addTask({
  name: "Bài tập Đại số 11: Phương trình lượng giác cơ bản",
  category: "Toán",
  priority: "Khẩn cấp",
  deadline: "2026-08-30 22:00",
  description: "Làm bài tập 1, 2, 3 trang 15 SGK. Tài liệu tham khảo: https://drive.google.com/sample-math-11",
  tags: ["BTVN", "SGK"]
});
```

### 1.2. Cập nhật nhiệm vụ: `C7_CONSOLE.updateTask(taskId, updateData)`
*Bảo lưu toàn bộ tiến độ check-in (`completions`) của học sinh.*
```javascript
await C7_CONSOLE.updateTask("task_xxxx", {
  deadline: "2026-08-31 23:59",
  priority: "Bình thường"
});
```

### 1.3. Xóa nhiệm vụ: `C7_CONSOLE.deleteTask(taskId)`
```javascript
await C7_CONSOLE.deleteTask("task_xxxx");
```

---

## 2. Quản lý Thông báo (Notifications API)

### 2.1. Thêm thông báo: `C7_CONSOLE.addNotification(payload)`

#### 🏷️ TypeScript Interface:
```typescript
interface NotificationPayload {
  message: string;                 // [Bắt buộc] Tiêu đề thông báo ngắn gọn
  content?: string;                // Nội dung chi tiết (hỗ trợ văn bản thuần hoặc HTML <b>, <i>, <a>, <ul>, <li>)
  type?: 'info' | 'warning' | 'success' | 'error'; // Loại thông báo. Mặc định: 'info'
  pinned?: boolean;                // Ghim lên đầu bảng tin. Mặc định: false
}
```

#### 💻 Ví dụ Console:
```javascript
await C7_CONSOLE.addNotification({
  message: "Lịch tiêm phòng sởi và khám sức khỏe đầu năm",
  content: "Thời gian: 08:00 sáng Thứ Sáu ngày 28/08 tại Phòng Y Tế.\nYêu cầu các bạn mặc đồng phục chỉnh tề và mang sổ khám.",
  type: "warning",
  pinned: true
});
```

### 2.2. Bật/Tắt ghim thông báo: `C7_CONSOLE.togglePin(notifId)`
```javascript
await C7_CONSOLE.togglePin("notif_xxxx");
```

---

## 3. Quản lý Thời khóa biểu (Schedules API)

### 3.1. Cập nhật lịch học: `C7_CONSOLE.updateSchedule(scheduleData, weekKey)`
*Hỗ trợ tên thứ tự nhiên: `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `CN` hoặc `monday`, `tuesday`...*

```javascript
await C7_CONSOLE.updateSchedule({
  "T2": [
    { name: "Chào cờ", time: "07:00 - 07:45", room: "Sân trường", subject: "Sinh hoạt" },
    { name: "Toán học", time: "07:50 - 08:35", room: "P.204", subject: "Đại số" },
    { name: "Ngữ văn", time: "08:50 - 09:35", room: "P.204", subject: "Văn học" }
  ],
  "T3": [
    { name: "Tiếng Anh", time: "07:00 - 07:45", room: "P.204", subject: "Unit 1" },
    { name: "Vật lí", time: "07:50 - 08:35", room: "P.204", subject: "Dao động" }
  ]
}, 'week-1');
```

### 3.2. Cập nhật thông tin tuần học: `C7_CONSOLE.setWeekMetadata({ week, name, className, startDate, endDate, semester, academicYear })`
```javascript
await C7_CONSOLE.setWeekMetadata({
  week: 1,
  name: "Tuần 1 - Khởi đầu năm học mới",
  className: "11C7",
  startDate: "2026-09-07",
  endDate: "2026-09-13",
  semester: "HK1",
  academicYear: "2026-2027"
});
```

### 3.3. Cập nhật lịch học theo ngày và tiết học:
```javascript
// Cập nhật toàn bộ tiết học của 1 ngày (hoặc ngày cụ thể '2026-09-08')
await C7_CONSOLE.updateDaySchedule('T2', [
  { name: 'Toán học', time: '07:00 - 07:45', room: 'P.204' },
  { name: 'Vật lí', time: '07:50 - 08:35', room: 'P.204' }
], 'week-1', '11C7');

// Thêm 1 tiết học vào thứ bất kỳ
await C7_CONSOLE.addClassPeriod('T3', { name: 'Sinh học', time: '08:50 - 09:35', room: 'P.204' }, 'week-1', '11C7');

// Xóa tiết học (theo index hoặc tên môn)
await C7_CONSOLE.removeClassPeriod('T3', 0, 'week-1', '11C7');

// Xóa sạch tiết học của ngày (ví dụ nghỉ lễ / nghỉ đột xuất)
await C7_CONSOLE.clearDaySchedule('T2', 'week-1', '11C7');

// Lấy danh sách tiết học của ngày
const t2Schedule = C7_CONSOLE.getDaySchedule('T2', 'week-1', '11C7');
```

### 3.4. Niên khóa & Bộ đếm tuần học (Academic Years & Week Counter)
*Hỗ trợ phân tách dữ liệu 3 niên khóa riêng biệt (Lớp 10: 2025-2026, Lớp 11: 2026-2027, Lớp 12: 2027-2028). Bộ đếm tuần tính từ ngày Khai giảng (05/09) đến ngày kết thúc năm học (31/05).*

```javascript
// 1. Lấy thông tin niên khóa hiện tại & tiến độ năm học
const yearInfo = C7_CONSOLE.getAcademicYearInfo();
// Kết quả: { academicYear: "2026-2027", grade: "11C7", status: "opening_period", currentWeek: 0, percentage: 0, badge: "..." }

// 2. Kiểm tra tiến độ tại một ngày cụ thể
const weekInfo = C7_CONSOLE.getWeekCount('2026-09-08');
// Kết quả: { currentWeek: 1, totalWeeks: 35, percentage: 3, semester: "Học kỳ 1", semesterWeek: 1, ... }

// 3. Chuyển đổi niên khóa hoạt động
C7_CONSOLE.setAcademicYear('2026-2027'); // hoặc '2025-2026', '2027-2028'
```

---

## 4. Nạp hàng loạt (Batch Ingestion API)

### `C7_CONSOLE.ingestBatch(batchPayload)`
*Cho phép AI Agent bóc tách cả 1 đoạn tin nhắn Zalo tổng hợp và nạp cùng lúc Nhiệm vụ, Thông báo và Lịch học chỉ bằng **1 lệnh duy nhất**.*

```javascript
await C7_CONSOLE.ingestBatch({
  weekKey: "week-1",
  tasks: [
    {
      name: "Soạn bài: Chiếc thuyền ngoài xa",
      category: "Văn",
      deadline: "2026-08-28 20:00",
      description: "Trả lời câu hỏi 1, 2, 3 phần Đọc hiểu trong SGK."
    },
    {
      name: "Nộp quỹ lớp tháng 9",
      category: "Phong trào",
      priority: "Khẩn cấp",
      deadline: "2026-08-31 17:00",
      description: "Mỗi bạn đóng 50k cho bạn Thủ quỹ."
    }
  ],
  notifications: [
    {
      message: "Họp ban cán sự lớp chiều Thứ 5",
      content: "Địa điểm: Phòng 204 lúc 16h30 sau giờ tan học.",
      type: "info",
      pinned: true
    }
  ],
  schedules: {
    "T4": [
      { name: "Hóa học", time: "07:00 - 07:45", room: "P.204", subject: "Hóa vô cơ" },
      { name: "Lịch sử", time: "07:50 - 08:35", room: "P.204", subject: "Cách mạng tháng 8" }
    ]
  }
});
```

#### 📦 Kết quả trả về (Return Format):
```json
{
  "status": "success",
  "addedTasks": 2,
  "addedNotifications": 1,
  "updatedSchedule": true,
  "updatedWeekMeta": false,
  "taskIds": ["task_...", "task_..."],
  "notificationIds": ["notif_..."],
  "errors": []
}
```

---

## 5. Ví dụ thực tế cho AI Agent
Khi AI đọc được tin nhắn:
> *"Thông báo lớp 11C7: Cô Nga dặn ngày mai T3 mang theo máy tính Casio để học Hình học không gian. Hạn nộp bài tập Lý là 23h ngày 29/08 trên link https://azota.vn/c7/ly. Nhớ nộp quỹ đoàn 20k nhé."*

AI Agent chỉ cần thực thi lệnh sau trên trình duyệt:
```javascript
await C7_CONSOLE.ingestBatch({
  tasks: [
    {
      name: "Bài tập Vật lí",
      category: "Vật lí",
      deadline: "2026-08-29 23:00",
      description: "Nộp bài tập trên link: https://azota.vn/c7/ly"
    },
    {
      name: "Đóng quỹ đoàn tháng 8",
      category: "Phong trào",
      deadline: "2026-08-30 17:00",
      description: "20k/học sinh nộp cho Bí thư."
    }
  ],
  notifications: [
    {
      message: "Nhắc nhở: Mang máy tính Casio học Hình học (T3)",
      content: "Cô Nga dặn cả lớp mang đầy đủ máy tính cầm tay và compa.",
      type: "warning"
    }
  ]
});
```
